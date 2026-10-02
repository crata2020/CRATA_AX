// 검토함 `/work/review` · W-05 · 깊이 A · 모듈 tasks · 소유: work 그룹 · 라우트가 approve 권한으로 감쌈(member는 forbidden)
// 사람과 AI 연결이 낸 제출을 검토자가 승인하거나 코멘트와 함께 수정 요청합니다. 처리하면 다음 검토 대기 행 서랍으로 넘어갑니다.
import { useMemo } from "react";
import { DataTable, FilterBar, PageHeader, PersonChip, StatusTag, useFilterBarState, type FilterBarProps } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { usePageReady } from "@/app/pageReady";
import { useList } from "@/lib/refine";
import { useSelectedParam, useUrlParam } from "@/lib/url";
import { formatDateTime, formatRelative } from "@/lib/format";
import { statusOf } from "@/lib/status";
import type { Submission, Task } from "@/types/entities";
import { useStructure, useWorkPermissions } from "../task-detail/lib";
import { ReviewDrawer } from "../task-detail/ReviewDrawer";
import "../task-detail/work.css";

/** 기다린 시간: "35분" · "3시간" · "2일" */
function waited(fromIso: string, nowIso: string): string {
  const min = Math.max(0, Math.floor((Date.parse(nowIso) - Date.parse(fromIso)) / 60_000));
  if (min < 60) return `${min}분`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}시간`;
  return `${Math.floor(h / 24)}일`;
}

export default function Page() {
  const { clock, persona, person } = useWorksite();
  const perms = useWorkPermissions();
  const st = useStructure();
  const [state] = useUrlParam("state", "submitted");
  const [project] = useUrlParam("project");
  const [selected, setSelected] = useSelectedParam();
  const pendingView = state !== "done";

  const fbProps: FilterBarProps = {
    chips: [{ param: "via", field: "via", options: [{ value: "web", label: "웹" }, { value: "ai_connection", label: "AI 연결" }], ariaLabel: "제출 경로", allLabel: "모든 경로" }],
    selects: [{ param: "project", label: "프로젝트", options: st.projects.map((p) => ({ value: p.id, label: p.name })) }],
    view: { ariaLabel: "상태", urlParam: "state", value: "submitted", onChange: () => undefined, options: [{ value: "submitted", label: "검토 대기" }, { value: "done", label: "처리함" }] },
  };
  const fb = useFilterBarState(fbProps);

  // 내가 검토할 업무(owner·admin은 전체)
  const tasksQ = useList<Task>({
    resource: "tasks",
    filters: [...(perms.adminish ? [] : [{ field: "reviewer_id", operator: "eq" as const, value: persona.memberId }]), ...(project ? [{ field: "project_id", operator: "eq" as const, value: project }] : [])],
    pagination: { mode: "off" },
  });
  usePageReady(!tasksQ.query.isLoading);
  const taskById = useMemo(() => new Map((tasksQ.result?.data ?? []).map((t) => [t.id, t])), [tasksQ.result]);
  const taskIds = useMemo(() => [...taskById.keys()], [taskById]);

  const pendingQ = useList<Submission>({
    resource: "submissions",
    filters: [{ field: "status", operator: "eq", value: "submitted" }, { field: "task_id", operator: "in", value: taskIds }],
    sorters: [{ field: "submitted_at", order: "asc" }],
    pagination: { mode: "off" },
    queryOptions: { enabled: !tasksQ.query.isLoading },
  });
  const pendingIds = (pendingQ.result?.data ?? []).map((s) => s.id);

  const filters = useMemo(() => [
    { field: "task_id", operator: "in" as const, value: taskIds },
    pendingView ? { field: "status", operator: "eq" as const, value: "submitted" } : { field: "status", operator: "in" as const, value: ["approved", "rejected"] },
    ...fb.filters,
  ], [taskIds, pendingView, fb.filters]);

  const next = (doneId: string) => {
    const rest = pendingIds.filter((id) => id !== doneId);
    const idx = pendingIds.indexOf(doneId);
    const nextId = rest[idx] ?? rest[0];
    setSelected(pendingView && nextId ? nextId : null);
  };

  return (
    <>
      <PageHeader
        title="검토함"
        description="AI가 제출한 결과도 여기서 사람이 확인해요. 승인해야 업무가 완료돼요."
        meta={<span className="wk-meta-text">검토 대기 <strong className="ws-tabular">{pendingIds.length}</strong>건{perms.adminish ? " · 회사 전체" : " · 내가 검토자인 업무"}</span>}
      />
      <FilterBar {...fbProps} />
      <div style={{ marginTop: 16 }}>
        {tasksQ.query.isLoading ? <div style={{ minHeight: 160 }} aria-busy="true" /> : (
          <DataTable<Submission>
            key={pendingView ? "pending" : "done"}
            resource="submissions"
            ariaLabel={pendingView ? "검토 대기 제출" : "처리한 제출"}
            filters={filters}
            isFiltered={!!(fb.values.via || fb.values.project)}
            onClearFilters={fb.clear}
            sorters={[{ field: pendingView ? "submitted_at" : "reviewed_at", order: pendingView ? "asc" : "desc" }]}
            onRowClick={(s) => setSelected(s.id)}
            columns={[
              { key: "task", title: "업무", kind: "name", render: (s) => <span className="ws-cell-name">{taskById.get(s.task_id)?.title ?? "—"}</span> },
              { key: "version", title: "제출", width: 72, render: (s) => <span className="ws-tabular">v{s.version}</span> },
              {
                // 검토자는 사람 대신 승인해요 → AI가 제출해도 '누구의' 제출인지 이름이 먼저(이니셜로 줄지 않게 넉넉한 폭)
                key: "submitted_by", title: "제출자", width: 280,
                render: (s) => s.via === "ai_connection"
                  ? <span className="ws-row" style={{ flexWrap: "nowrap", minWidth: 0 }}><PersonChip memberId={s.submitted_by} size="sm" /><span className="ws-muted ws-nowrap" style={{ fontSize: 13 }}>· AI 연결{s.via_client ? `(${s.via_client})` : ""}</span></span>
                  : <PersonChip memberId={s.submitted_by} size="sm" />,
              },
              { key: "submitted_at", title: "제출 시각", kind: "datetime", width: 168 },
              pendingView
                ? { key: "waited", title: "기다린 시간", width: 112, render: (s) => <span className="ws-tabular">{waited(s.submitted_at, clock.now())}</span> }
                : { key: "reviewed_at", title: "처리 시각", kind: "datetime", width: 168 },
              { key: "status", title: "상태", kind: "status", statusDomain: "submissions.status", width: 120 },
            ]}
            mobileRow={(s) => ({
              title: taskById.get(s.task_id)?.title ?? "—",
              subtitle: `${person(s.submitted_by)?.displayName ?? "—"} · ${s.via === "ai_connection" ? `AI 연결${s.via_client ? `(${s.via_client})` : ""}` : "웹"} · v${s.version} · ${pendingView ? `${waited(s.submitted_at, clock.now())} 기다림` : formatRelative(s.reviewed_at, clock.now())}`,
              trailing: <StatusTag {...statusOf("submissions.status", s.status)} />,
            })}
            empty={pendingView
              ? { kind: "empty", title: "검토할 제출이 없어요", description: "새 제출이 오면 알림으로 알려 드려요." }
              : { kind: "empty", title: "아직 처리한 제출이 없어요", description: "승인하거나 수정 요청한 제출이 여기에 모여요." }}
          />
        )}
      </div>
      <p className="wk-caption" style={{ marginTop: 12 }}>
        {pendingView ? `가장 오래 기다린 제출부터 보여요. 기준 시각 ${formatDateTime(clock.now())}.` : "최근에 처리한 제출부터 보여요."}
      </p>
      <ReviewDrawer
        submissionId={selected || null}
        open={!!selected}
        onClose={() => setSelected(null)}
        onProcessed={(id) => next(id)}
      />
    </>
  );
}
