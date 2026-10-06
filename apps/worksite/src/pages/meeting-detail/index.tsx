// 회의 상세 `/meetings/:meetingId` · W-08 · 깊이 A · 모듈 meetings · 소유: work 그룹
// 요약 · 구간(분류 경로 · 신뢰도 · 근거 발화) · 결정 · 액션 제안을 탭(?tab=)으로 보고, 검토자가 1클릭으로 확정하거나 업무로 만듭니다.
// 녹음·전사 원문은 쓰던 도구(Plaud·클로바노트)에 있고 여기서는 링크 자리만 둡니다. 구성원은 읽기만 해요.
import { useState } from "react";
import { Link, useParams } from "react-router";
import { Button, Popover, Skeleton } from "antd";
import { ExportOutlined } from "@ant-design/icons";
import { AiTag, EmptyState, PageHeader, PersonChip, SectionCard, SensitivityTag, StatusTag } from "@/components";
import { usePageReady } from "@/app/pageReady";
import { useList, useOne } from "@/lib/refine";
import { useUrlParam } from "@/lib/url";
import { formatDateTime, formatMinutes } from "@/lib/format";
import { labelOf, statusOf } from "@/lib/status";
import type { ActionProposal, Decision, Meeting, MeetingSegment } from "@/types/entities";
import { meetingTitle, useStructure, useWorkPermissions } from "../task-detail/lib";
import { AcceptDrawer, CorrectDrawer, DecisionRow, ProposalRow, SegmentRow } from "./parts";
import "../task-detail/work.css";

const TABS = ["summary", "segments", "decisions", "actions"] as const;
const SOURCE_LABEL: Record<string, string> = { plaud: "Plaud", clova: "클로바노트", manual: "직접 입력", other: "기타" };

export default function Page() {
  const { meetingId = "" } = useParams();
  const perms = useWorkPermissions();
  const st = useStructure();
  const [tabRaw] = useUrlParam("tab", "summary");
  const tab = (TABS as readonly string[]).includes(tabRaw) ? tabRaw : "summary";
  const [correcting, setCorrecting] = useState<MeetingSegment | null>(null);
  const [accepting, setAccepting] = useState<ActionProposal | null>(null);

  const q = useOne<Meeting>({ resource: "meetings", id: meetingId, queryOptions: { retry: false } });
  const m = q.result;
  const enabled = !!m;
  const segs = useList<MeetingSegment>({ resource: "meeting_segments", filters: [{ field: "meeting_id", operator: "eq", value: meetingId }], sorters: [{ field: "start_ts", order: "asc" }], pagination: { mode: "off" }, queryOptions: { enabled } });
  const decs = useList<Decision>({ resource: "decisions", filters: [{ field: "meeting_id", operator: "eq", value: meetingId }], sorters: [{ field: "decided_at", order: "asc" }], pagination: { mode: "off" }, queryOptions: { enabled } });
  const aps = useList<ActionProposal>({ resource: "action_proposals", filters: [{ field: "meeting_id", operator: "eq", value: meetingId }], pagination: { mode: "off" }, queryOptions: { enabled } });
  usePageReady(!q.query.isLoading);

  const back = { label: "회의", to: "/meetings" };
  if (q.query.isLoading) return <><PageHeader title="회의 상세" back={back} /><Skeleton active paragraph={{ rows: 6 }} /></>;
  if (q.query.isError || !m) {
    const notFound = (q.query.error as { statusCode?: number } | null)?.statusCode === 404 || !m;
    return (
      <>
        <PageHeader title="회의 상세" back={back} />
        {notFound ? <EmptyState kind="not_found" action={{ label: "회의 목록으로", to: "/meetings" }} />
          : <EmptyState kind="error" action={{ label: "다시 시도", onClick: () => void q.query.refetch() }} />}
      </>
    );
  }

  const segList = segs.result?.data ?? [];
  const decList = decs.result?.data ?? [];
  const apList = aps.result?.data ?? [];
  const pendingSegs = segList.filter((s) => s.review_status === "pending" || s.review_status === "unclassified").length;
  const canAct = perms.canReviewMeetings;
  const supersededBy = (d: Decision) => decList.find((x) => x.supersedes_id === d.id);
  /** 고객 비밀(L2) 회의: 국내 처리 경로가 열리기 전까지 AI 요약·분류 꺼짐 */
  const l2 = m.sensitivity === "L2";

  const tabs = [
    { key: "summary", label: "요약", to: "?tab=summary" },
    { key: "segments", label: "구간", to: "?tab=segments", badge: pendingSegs },
    { key: "decisions", label: "결정", to: "?tab=decisions", badge: decList.filter((d) => d.status === "proposed").length },
    { key: "actions", label: "액션 제안", to: "?tab=actions", badge: apList.filter((a) => a.status === "proposed").length },
  ];

  return (
    <>
      <PageHeader
        title={meetingTitle(m)}
        back={back}
        meta={
          <div className="wk-meta">
            {m.title_prefix && <span className="ws-tag">{m.title_prefix}</span>}
            <StatusTag {...statusOf("meetings.status", m.status)} />
            <SensitivityTag level={m.sensitivity} />
            <span className="wk-meta-text ws-tabular">{formatDateTime(m.started_at)} · {formatMinutes(m.duration_min)} · 참석 {m.attendee_ids.length}명 · {labelOf("meetings.meeting_type", m.meeting_type)}</span>
          </div>
        }
        actions={
          // 머리 보조 버튼: 다른 화면의 머리 보조 버튼('업무 취소' 등)과 같은 흰 알약(기본 버튼). 데모에선 안내 팝오버만
          <Popover trigger="click" placement="bottomRight" title="연동 후 열려요" content={<p className="ws-demo-pop">녹음 원문은 쓰시던 녹음 도구에 있어요. 녹음 도구를 연결하면 여기서 바로 열려요.</p>}>
            <Button icon={<ExportOutlined aria-hidden />} aria-label="원문 열기(연동 후 열려요)">원문 열기</Button>
          </Popover>
        }
        tabs={tabs}
      />

      {tab === "summary" && (
        <SectionCard title="요약" actions={m.summary ? (l2 ? <span className="ws-tag">사람이 쓴 요약</span> : <AiTag kind="summary" />) : undefined}>
          {m.status === "scheduled" ? <p className="wk-body-2">아직 열리지 않은 회의예요. 회의가 끝나면 요약과 구간 분류가 여기에 모여요.</p>
            : m.summary ? <p className="wk-body">{m.summary}</p> : <p className="wk-caption">요약이 없어요.</p>}
          <dl className="wk-kv" style={{ marginTop: 20 }}>
            <dt>프로젝트</dt>
            <dd>
              <span className="ws-row">
                {m.project_ids.length ? m.project_ids.map((id) => {
                  const p = st.projectById.get(id);
                  return p ? <Link key={id} className="ws-tag" to={`/projects/${id}`}>{p.name}</Link> : <span key={id} className="ws-tag">볼 수 없는 프로젝트</span>;
                }) : "—"}
              </span>
            </dd>
            <dt>참석</dt>
            <dd><span className="ws-row">{m.attendee_ids.map((id) => <PersonChip key={id} memberId={id} size="sm" />)}</span></dd>
            <dt>기록 출처</dt>
            <dd>{SOURCE_LABEL[m.source] ?? m.source}{m.transcript_ref ? " · 원문 링크 있음(데모에서는 닫혀 있어요)" : ""}</dd>
            <dt>확인 대기</dt>
            <dd className="ws-tabular">구간 {pendingSegs} · 결정 {decList.filter((d) => d.status === "proposed").length} · 액션 {apList.filter((a) => a.status === "proposed").length}</dd>
          </dl>
          {l2 && <p className="wk-caption" style={{ marginTop: 12 }}>고객 비밀(L2) 회의예요. 참석자와 프로젝트 참여자만 볼 수 있어요. 국내 처리 경로가 열리기 전까지 AI 요약·분류는 꺼져 있어서 사람이 정리했어요.</p>}
        </SectionCard>
      )}

      {tab === "segments" && (
        <SectionCard title="구간 분류" caption={l2 ? "고객 비밀(L2) 회의라 AI 분류가 꺼져 있어요(국내 경로 개통 전). 사람이 분류했어요." : canAct ? "신뢰도 85% 이상은 자동 분류, 60~84%는 확인 필요, 그 아래는 미분류예요." : "검토자가 분류를 확인해요. 구성원은 읽기만 해요."}>
          {segs.query.isLoading ? <Skeleton active paragraph={{ rows: 4 }} title={false} />
            : segList.length ? (
              <ul className="wk-rows" aria-label="구간">
                {segList.map((s) => <SegmentRow key={s.id} seg={s} st={st} canAct={canAct} onCorrect={setCorrecting} aiOff={l2} />)}
              </ul>
            ) : <EmptyState kind="empty" compact headingLevel={3} title="구간 분류가 아직 없어요" description={m.status === "scheduled" ? "회의가 끝나면 분류돼요." : undefined} />}
        </SectionCard>
      )}

      {tab === "decisions" && (
        <SectionCard title="결정" more={{ label: "결정 모음", to: "/meetings/decisions" }}>
          {decs.query.isLoading ? <Skeleton active paragraph={{ rows: 3 }} title={false} />
            : decList.length ? (
              <ul className="wk-rows" aria-label="결정">
                {decList.map((d) => <DecisionRow key={d.id} dec={d} canAct={canAct} supersededBy={supersededBy(d)} />)}
              </ul>
            ) : <EmptyState kind="empty" compact headingLevel={3} title="확정된 결정이 없어요" />}
        </SectionCard>
      )}

      {tab === "actions" && (
        <SectionCard title="액션 제안" caption={canAct ? undefined : "검토자가 확인하면 업무가 돼요."}>
          {aps.query.isLoading ? <Skeleton active paragraph={{ rows: 3 }} title={false} />
            : apList.length ? (
              <ul className="wk-rows" aria-label="액션 제안">
                {apList.map((a) => <ProposalRow key={a.id} ap={a} canAct={canAct} onAccept={setAccepting} />)}
              </ul>
            ) : <EmptyState kind="empty" compact headingLevel={3} title="액션 제안이 없어요" />}
        </SectionCard>
      )}

      <CorrectDrawer seg={correcting} open={!!correcting} onClose={() => setCorrecting(null)} />
      <AcceptDrawer ap={accepting} open={!!accepting} onClose={() => setAccepting(null)} />
    </>
  );
}
