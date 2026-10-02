// 결정 모음 `/meetings/decisions` · W-10 · 깊이 B · 모듈 meetings · 소유: work 그룹
// 회의에서 정한 것을 프로젝트별 타임라인으로 모아 "지금 기준"을 찾습니다. 바뀐 결정은 새 결정으로 이어 줍니다.
import { useMemo } from "react";
import { Link } from "react-router";
import { Button, Skeleton } from "antd";
import { EmptyState, FilterBar, PageHeader, SectionCard, StatusTag, useFilterBarState, type FilterBarProps } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { usePageReady } from "@/app/pageReady";
import { useList, useRpc } from "@/lib/refine";
import { useUrlParam } from "@/lib/url";
import { addDays, kstIso } from "@/lib/clock";
import { formatDate } from "@/lib/format";
import { optionsOf, statusOf } from "@/lib/status";
import type { Decision, Meeting } from "@/types/entities";
import { meetingTitle, useStructure, useWorkPermissions } from "../task-detail/lib";
import "../task-detail/work.css";

const PERIODS = [{ value: "30", label: "최근 30일" }, { value: "90", label: "최근 90일" }];

function ConfirmButton({ id }: { id: string }) {
  const { run, isPending } = useRpc("confirm_decision", { successMessage: "결정을 확정했어요" });
  return <Button size="small" type="primary" loading={isPending} onClick={() => void run({ decisionId: id }).catch(() => undefined)}>확정하기</Button>;
}

export default function Page() {
  const { today } = useWorksite();
  const perms = useWorkPermissions();
  const st = useStructure();
  const [project] = useUrlParam("project");
  const [period] = useUrlParam("period");

  const fbProps: FilterBarProps = {
    chips: [{ param: "status", field: "status", options: optionsOf("decisions.status"), multiple: true, ariaLabel: "상태" }],
    selects: [
      { param: "project", label: "프로젝트", field: "project_id", options: st.projects.map((p) => ({ value: p.id, label: p.name })) },
      { param: "period", label: "기간", options: PERIODS },
    ],
  };
  const fb = useFilterBarState(fbProps);
  const filters = useMemo(() => [
    ...fb.filters,
    ...(period ? [{ field: "decided_at", operator: "gte" as const, value: kstIso(addDays(today, -Number(period)), "00:00") }] : []),
  ], [fb.filters, period, today]);

  const decs = useList<Decision>({ resource: "decisions", filters, sorters: [{ field: "decided_at", order: "desc" }], pagination: { mode: "off" } });
  const allDecs = useList<Decision>({ resource: "decisions", pagination: { mode: "off" } });
  const meetings = useList<Meeting>({ resource: "meetings", pagination: { mode: "off" } });
  usePageReady(!decs.query.isLoading && !st.isLoading);

  const meetingById = useMemo(() => new Map((meetings.result?.data ?? []).map((m) => [m.id, m])), [meetings.result]);
  const byId = useMemo(() => new Map((allDecs.result?.data ?? []).map((d) => [d.id, d])), [allDecs.result]);
  const replacedBy = useMemo(() => {
    const m = new Map<string, Decision>();
    for (const d of allDecs.result?.data ?? []) if (d.supersedes_id) m.set(d.supersedes_id, d);
    return m;
  }, [allDecs.result]);

  const list = decs.result?.data ?? [];
  // 프로젝트별 묶음(프로젝트를 고르면 한 묶음). 묶음 순서는 최근 결정이 있는 프로젝트부터
  const groups = useMemo(() => {
    const g = new Map<string, Decision[]>();
    // 볼 수 없는 프로젝트(L2·참여 안 함)의 결정은 한 묶음으로(같은 이름의 묶음이 여럿 생기지 않게)
    for (const d of list) {
      const k = d.project_id ? (st.projectById.has(d.project_id) ? d.project_id : "hidden") : "none";
      g.set(k, [...(g.get(k) ?? []), d]);
    }
    return [...g.entries()];
  }, [list, st.projectById]);
  const groupName = (pid: string) => st.projectById.get(pid)?.name ?? (pid === "hidden" ? "볼 수 없는 프로젝트" : "프로젝트 없음");

  return (
    <>
      <PageHeader title="결정 모음" description="회의에서 정한 것을 프로젝트별로 모았어요. 바뀐 결정은 새 결정으로 이어져요." />
      <FilterBar {...fbProps} />
      <div style={{ marginTop: 16 }}>
        {decs.query.isLoading ? <Skeleton active paragraph={{ rows: 6 }} />
          : decs.query.isError ? <EmptyState kind="error" action={{ label: "다시 시도", onClick: () => void decs.query.refetch() }} />
          : !list.length ? (fb.active ? <EmptyState kind="filtered" action={{ label: "필터 지우기", onClick: fb.clear }} />
            : <EmptyState kind="empty" title="아직 확정된 결정이 없어요" description="회의에서 결정이 확정되면 여기에 모여요." action={{ label: "회의 보기", to: "/meetings" }} />)
          : (
            <SectionCard title={project ? st.projectById.get(project)?.name ?? "결정" : "프로젝트별 결정"}>
              {groups.map(([pid, items]) => {
                const p = st.projectById.get(pid);
                return (
                  <section key={pid} className="wk-dec-group" aria-label={groupName(pid)}>
                    {!project && (
                      <h3 className="wk-section-title">
                        {p ? <Link to={`/projects/${p.id}?tab=decisions`}>{p.name}</Link> : groupName(pid)}
                        <span className="wk-caption" style={{ marginLeft: 8 }}>{items.length}건</span>
                      </h3>
                    )}
                    <ol className="ws-timeline" aria-label={`${groupName(pid)} 결정`}>
                      {items.map((d) => {
                        const s = statusOf("decisions.status", d.status);
                        const m = meetingById.get(d.meeting_id);
                        const newer = replacedBy.get(d.id);
                        const older = d.supersedes_id ? byId.get(d.supersedes_id) : undefined;
                        return (
                          <li key={d.id} id={d.id} tabIndex={-1} className="ws-tl wk-anchor-target">
                            <span className="ws-tl__dot" style={{ background: `var(--ws-${s.tone}-mark)` }} aria-hidden />
                            <div className="ws-tl__time">{formatDate(d.decided_at)}</div>
                            <div className="ws-tl__title">
                              <span style={{ marginRight: 8 }}>{d.statement}</span>
                              <StatusTag {...s} />
                            </div>
                            <div className="wk-dec-links" style={{ marginTop: 4 }}>
                              {d.decided_by_role && <span className="wk-caption">결정 역할 · {d.decided_by_role}</span>}
                              {m ? <Link to={`/meetings/${m.id}?tab=decisions`}>{m.title_prefix ? `${m.title_prefix} ` : ""}{meetingTitle(m)}</Link> : <span className="wk-caption">볼 수 없는 회의예요</span>}
                              {newer && <button type="button" className="wk-textlink" onClick={() => { const el = document.getElementById(newer.id); el?.scrollIntoView({ block: "center" }); el?.focus(); }}>{newer.status === "confirmed" ? "이 결정으로 바뀌었어요" : "바꾸자는 제안이 있어요"}: {newer.statement}</button>}
                              {older && <span className="wk-caption">이전 결정: {older.statement}</span>}
                            </div>
                            {perms.canReviewMeetings && d.status === "proposed" && (() => {
                              const c = perms.decisionConfirm(d);
                              return <div style={{ marginTop: 8 }}>{c.can ? <ConfirmButton id={d.id} /> : c.reason ? <span className="wk-caption">{c.reason}</span> : null}</div>;
                            })()}
                          </li>
                        );
                      })}
                    </ol>
                  </section>
                );
              })}
            </SectionCard>
          )}
      </div>
      <p className="wk-caption" style={{ marginTop: 12 }}>회의를 볼 수 있는 사람만 그 회의의 결정을 볼 수 있어요.</p>
    </>
  );
}
