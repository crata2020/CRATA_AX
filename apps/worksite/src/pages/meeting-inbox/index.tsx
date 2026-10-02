// 분류 확인 `/meetings/inbox` · W-09 · 깊이 A · 모듈 meetings · 소유: work 그룹 · 라우트가 approve 권한으로 감쌈(member는 forbidden)
// 확인이 필요한 구간·결정·액션 제안을 회의를 넘나들며 한 줄씩 처리합니다(근거 + 제안 + 1클릭 확인).
// 처리한 줄은 0.6 투명도로 1초 남았다가 빠집니다(움직임 없이 사라짐, 움직임 줄이기 설정이면 바로).
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Skeleton } from "antd";
import { EmptyState, FilterBar, PageHeader, SectionCard, useFilterBarState, type FilterBarProps } from "@/components";
import { usePageReady } from "@/app/pageReady";
import { useList } from "@/lib/refine";
import { useUrlParam } from "@/lib/url";
import { formatDate } from "@/lib/format";
import type { ActionProposal, Decision, Meeting, MeetingSegment } from "@/types/entities";
import { meetingTitle, useStructure, useWorkPermissions } from "../task-detail/lib";
import { AcceptDrawer, CorrectDrawer, DecisionRow, ProposalRow, SegmentRow, useFadeOut } from "../meeting-detail/parts";
import "../task-detail/work.css";

type Item =
  | { id: string; kind: "segment"; meetingId: string; sort: string; seg: MeetingSegment }
  | { id: string; kind: "decision"; meetingId: string; sort: string; dec: Decision }
  | { id: string; kind: "action"; meetingId: string; sort: string; ap: ActionProposal };

const KIND_OPTIONS = [{ value: "segment", label: "구간" }, { value: "decision", label: "결정 제안" }, { value: "action", label: "액션 제안" }];
const CONF_OPTIONS = [{ value: "pending", label: "확인 필요" }, { value: "unclassified", label: "미분류" }];

export default function Page() {
  const perms = useWorkPermissions();
  const st = useStructure();
  const [kind] = useUrlParam("kind");
  const [meetingFilter] = useUrlParam("meeting");
  const [conf] = useUrlParam("conf");
  const [correcting, setCorrecting] = useState<MeetingSegment | null>(null);
  const [accepting, setAccepting] = useState<ActionProposal | null>(null);

  const meetings = useList<Meeting>({ resource: "meetings", pagination: { mode: "off" }, sorters: [{ field: "started_at", order: "desc" }] });
  const segs = useList<MeetingSegment>({ resource: "meeting_segments", filters: [{ field: "review_status", operator: "in", value: ["pending", "unclassified"] }], pagination: { mode: "off" } });
  const decs = useList<Decision>({ resource: "decisions", filters: [{ field: "status", operator: "eq", value: "proposed" }], pagination: { mode: "off" } });
  const aps = useList<ActionProposal>({ resource: "action_proposals", filters: [{ field: "status", operator: "eq", value: "proposed" }], pagination: { mode: "off" } });
  const loading = meetings.query.isLoading || segs.query.isLoading || decs.query.isLoading || aps.query.isLoading;
  const isError = meetings.query.isError || segs.query.isError || decs.query.isError || aps.query.isError;
  usePageReady(!loading);

  const meetingById = useMemo(() => new Map((meetings.result?.data ?? []).map((m) => [m.id, m])), [meetings.result]);
  const sortKey = (meetingId: string, n: number) => `${meetingById.get(meetingId)?.started_at ?? ""}|${String(9e6 - n).padStart(8, "0")}`;

  const all: Item[] = useMemo(() => [
    ...(segs.result?.data ?? []).map((s) => ({ id: s.id, kind: "segment" as const, meetingId: s.meeting_id, sort: sortKey(s.meeting_id, s.start_ts), seg: s })),
    ...(decs.result?.data ?? []).map((d) => ({ id: d.id, kind: "decision" as const, meetingId: d.meeting_id, sort: sortKey(d.meeting_id, 100_000 + Date.parse(d.decided_at) % 100_000), dec: d })),
    ...(aps.result?.data ?? []).map((a) => ({ id: a.id, kind: "action" as const, meetingId: a.meeting_id, sort: sortKey(a.meeting_id, 200_000 + Number(a.id.replace(/\D/g, "")) % 100_000), ap: a })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [segs.result, decs.result, aps.result, meetingById]);

  const fade = useFadeOut(all);
  // 메뉴 배지는 '구간'만 세요 → 머리 숫자도 구간과 결정·액션을 나눠 보여 줘서 배지 숫자가 화면에 그대로 보이게
  const segRemaining = all.filter((it) => it.kind === "segment").length;
  const otherRemaining = all.length - segRemaining;
  const visible = fade.items
    .filter((it) => !kind || it.kind === kind)
    .filter((it) => !meetingFilter || it.meetingId === meetingFilter)
    .filter((it) => !conf || (it.kind === "segment" && it.seg.review_status === conf))
    .sort((a, b) => b.sort.localeCompare(a.sort));

  const meetingOptions = [...new Set(all.map((it) => it.meetingId))].map((id) => {
    const m = meetingById.get(id);
    return { value: id, label: m ? `${meetingTitle(m)} · ${formatDate(m.started_at, false)}` : id };
  });
  const fbProps: FilterBarProps = {
    chips: [
      { param: "kind", options: KIND_OPTIONS, ariaLabel: "종류", allLabel: "모든 종류" },
      { param: "conf", options: CONF_OPTIONS, ariaLabel: "확인 상태", allLabel: "전체" },
    ],
    selects: [{ param: "meeting", label: "회의", options: meetingOptions }],
  };
  const fb = useFilterBarState(fbProps);

  const meetingLabel = (id: string) => {
    const m = meetingById.get(id);
    if (!m) return null;
    return (
      <span className="wk-meta">
        {m.title_prefix && <span className="ws-tag">{m.title_prefix}</span>}
        <Link to={`/meetings/${m.id}`} className="wk-meta-text">{meetingTitle(m)}</Link>
        <span className="wk-caption">{formatDate(m.started_at, false)}</span>
      </span>
    );
  };
  const done = (it: Item | undefined) => fade.mark(it);
  const byId = (id: string) => all.find((x) => x.id === id);

  return (
    <>
      <PageHeader
        title="분류 확인"
        description="처음 2주는 모든 분류를 사람이 확인해요."
        meta={<span className="wk-meta-text">남은 확인: 구간 <strong className="ws-tabular">{segRemaining}</strong>건 · 결정·액션 <strong className="ws-tabular">{otherRemaining}</strong>건</span>}
      />
      <FilterBar {...fbProps} />
      <div style={{ marginTop: 16 }}>
        {loading ? <Skeleton active paragraph={{ rows: 6 }} />
          : isError ? <EmptyState kind="error" action={{ label: "다시 시도", onClick: () => { void segs.query.refetch(); void decs.query.refetch(); void aps.query.refetch(); } }} />
          : !visible.length ? (
            fb.active && all.length ? <EmptyState kind="filtered" action={{ label: "필터 지우기", onClick: fb.clear }} />
              : <EmptyState kind="empty" title="확인할 것이 없어요" description="새 회의가 분류되면 여기에 모여요." action={{ label: "회의 목록 보기", to: "/meetings" }} />
          ) : (
            <SectionCard title="확인할 것" caption="맞으면 [맞아요], 아니면 [고치기]로 사업·프로젝트를 골라요. 고친 분류는 다음 분류에 참고해요.">
              <ul className="wk-rows" aria-label="확인할 것">
                {visible.map((it) => {
                  const common = { canAct: perms.canReviewMeetings, fading: fade.isFading(it.id), meetingLabel: meetingLabel(it.meetingId), onDone: (id: string) => done(byId(id)) };
                  if (it.kind === "segment") return <SegmentRow key={it.id} seg={it.seg} st={st} onCorrect={setCorrecting} {...common} />;
                  if (it.kind === "decision") return <DecisionRow key={it.id} dec={it.dec} {...common} />;
                  return <ProposalRow key={it.id} ap={it.ap} onAccept={setAccepting} {...common} />;
                })}
              </ul>
            </SectionCard>
          )}
      </div>
      <CorrectDrawer seg={correcting} open={!!correcting} onClose={() => setCorrecting(null)} onDone={(id) => done(byId(id))} />
      <AcceptDrawer ap={accepting} open={!!accepting} onClose={() => setAccepting(null)} onDone={(id) => done(byId(id))} />
    </>
  );
}
