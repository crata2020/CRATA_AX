// 업무 보드 `/work/board` · W-04 · 깊이 A · 모듈 tasks · 소유: work 그룹
// 할 일 → 진행 중 → 검토 대기 → 완료(최근 14일) 칸반. 끌어놓기 없이 카드의 [이동] 메뉴로 옮깁니다.
// '검토 대기'로는 제출 서랍(rpc:submit_task)으로만, '완료'로는 검토자의 승인(rpc:approve_submission)으로만 갑니다. AI 연결은 제출까지만 합니다.
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Button, Skeleton } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import {
  AiTag, DdayBadge, EmptyState, FilterBar, KanbanBoard, PageHeader, PersonChip, StatusTag, useFilterBarState, type FilterBarProps, type KanbanColumn,
} from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { usePageReady } from "@/app/pageReady";
import { useList, useUpdate } from "@/lib/refine";
import { useSelectedParam, useUrlParam } from "@/lib/url";
import { daysBetween, toKstDate } from "@/lib/clock";
import { statusOf, TASK_STATUS_COLOR } from "@/lib/status";
import type { Submission, Task } from "@/types/entities";
import { SCOPE_LABEL, useScope, useStructure, useWorkPermissions } from "../task-detail/lib";
import { TaskFormDrawer } from "../task-detail/TaskFormDrawer";
import { SubmitDrawer } from "../task-detail/SubmitDrawer";
import { ReviewDrawer } from "../task-detail/ReviewDrawer";
import { ViewSwitch } from "../task-detail/ViewSwitch";
import "../task-detail/work.css";

type ColKey = "todo" | "in_progress" | "submitted" | "done";
const COLUMNS: KanbanColumn[] = [
  { key: "todo", label: "할 일", color: TASK_STATUS_COLOR.todo },
  { key: "in_progress", label: "진행 중", color: TASK_STATUS_COLOR.in_progress },
  { key: "submitted", label: "검토 대기", color: TASK_STATUS_COLOR.submitted },
  { key: "done", label: "완료(최근 14일)", color: TASK_STATUS_COLOR.done },
];
const colOf = (t: Task): ColKey => (t.status === "changes_requested" ? "in_progress" : (t.status as ColKey));

export default function Page() {
  const { tenant, today, persona } = useWorksite();
  const perms = useWorkPermissions();
  const scope = useScope();
  const st = useStructure();
  const [group] = useUrlParam("group", "status");
  const [selected, setSelected] = useSelectedParam();
  const [submitTask, setSubmitTask] = useState<Task | null>(null);
  const { mutateAsync: update } = useUpdate();

  const fbProps: FilterBarProps = {
    search: { placeholder: "업무 검색", fields: ["title"] },
    selects: [
      { param: "project", label: "프로젝트", field: "project_id", options: st.projects.map((p) => ({ value: p.id, label: p.name })) },
      { param: "assignee", label: "담당자", field: "assignee_id", options: tenant.people.map((p) => ({ value: p.id, label: p.displayName })) },
      ...(perms.reviewerPlus ? [{ param: "group", label: "묶음", options: [{ value: "status", label: "상태별" }, { value: "assignee", label: "담당자별" }] }] : []),
    ],
    view: scope.canChoose
      ? { ariaLabel: "범위", urlParam: "scope", value: scope.scope, onChange: () => undefined, options: scope.options.map((s) => ({ value: s, label: SCOPE_LABEL[s] })) }
      : undefined,
  };
  const fb = useFilterBarState(fbProps);

  const tasksQ = useList<Task>({
    resource: "tasks",
    filters: [...scope.filters, ...fb.filters, { field: "status", operator: "ne", value: "canceled" }],
    sorters: [{ field: "due_at", order: "asc" }],
    pagination: { mode: "off" },
  });
  const subsQ = useList<Submission>({ resource: "submissions", filters: [{ field: "status", operator: "eq", value: "submitted" }], pagination: { mode: "off" } });
  usePageReady(!tasksQ.query.isLoading);

  const pendingByTask = useMemo(() => new Map((subsQ.result?.data ?? []).map((s) => [s.task_id, s])), [subsQ.result]);
  const items = useMemo(
    () => (tasksQ.result?.data ?? []).filter((t) => t.status !== "done" || daysBetween(toKstDate(t.updated_at), today) <= 14),
    [tasksQ.result, today],
  );
  const byAssignee = group === "assignee" && perms.reviewerPlus;

  const canMove = (t: Task, to: string): { ok: true } | { ok: false; reason: string } => {
    const from = colOf(t);
    const isAssignee = t.assignee_id === persona.memberId;
    if (from === "done") return { ok: false, reason: "완료된 업무는 옮길 수 없어요" };
    if (from === "submitted" && to !== "done") return { ok: false, reason: "검토 중인 업무는 검토자가 처리해요" };
    if (to === "done") {
      if (!perms.reviewerPlus) return { ok: false, reason: "완료는 검토자가 승인하면 바뀌어요" };
      if (t.status !== "submitted") return { ok: false, reason: "검토 대기에서 승인해야 완료돼요" };
      if (!perms.canReviewTask(t)) return { ok: false, reason: perms.reviewBlockReason(t) };
      if (!pendingByTask.has(t.id)) return { ok: false, reason: "검토할 제출을 찾지 못했어요" };
      return { ok: true };
    }
    if (to === "submitted") return isAssignee ? { ok: true } : { ok: false, reason: "담당자만 제출할 수 있어요" };
    // 할 일과 진행 중 사이
    if (isAssignee || perms.canReviewTask(t)) return { ok: true };
    return { ok: false, reason: "담당자나 검토자가 옮길 수 있어요" };
  };

  const onMove = async (t: Task, to: string) => {
    if (to === "submitted") { setSubmitTask(t); return; }
    if (to === "done") { const s = pendingByTask.get(t.id); if (s) setSelected(s.id); return; }
    await update({
      resource: "tasks", id: t.id, values: { status: to },
      successNotification: () => ({ type: "success", message: `업무를 ${to === "todo" ? "할 일로" : "진행 중으로"} 옮겼어요` }),
    });
  };

  const projectName = (id: string) => st.projectById.get(id)?.name ?? "—";
  const card = (t: Task) => {
    const sub = pendingByTask.get(t.id);
    return (
      <>
        <Link className="wk-kcard-title" to={`/work/tasks/${t.id}`}>{t.title}</Link>
        <div className="wk-kcard-meta">
          <span>{projectName(t.project_id)}</span>
          <DdayBadge date={t.due_at} done={t.status === "done"} />
        </div>
        <div className="wk-kcard-meta">
          <PersonChip memberId={t.assignee_id} size="sm" />
          {t.status === "changes_requested" && <StatusTag {...statusOf("tasks.status", t.status)} />}
          {t.status === "done" && <StatusTag {...statusOf("tasks.status", t.status)} />}
          {sub?.via === "ai_connection" && <AiTag kind="submitted" />}
        </div>
      </>
    );
  };

  // 담당자별 묶음: 진행 중 업무만(수정 요청 포함)
  const assigneeColumns: KanbanColumn[] = useMemo(() => {
    if (!byAssignee) return [];
    const ids = [...new Set(items.filter((t) => colOf(t) === "in_progress").map((t) => t.assignee_id))];
    return ids.map((id) => ({ key: id, label: tenant.people.find((p) => p.id === id)?.displayName ?? "알 수 없는 사람" }));
  }, [byAssignee, items, tenant.people]);

  return (
    <>
      <PageHeader
        title="업무 보드"
        description="완료는 검토자가 제출을 승인할 때만 바뀌어요. AI 연결은 검토 대기까지만 옮겨요."
        actions={
          <div className="ws-row">
            <ViewSwitch current="board" />
            {perms.canCreateTask && <Button type="primary" icon={<PlusOutlined />} onClick={() => setSelected("new")}>업무 만들기</Button>}
          </div>
        }
      />
      <FilterBar {...fbProps} />
      <div style={{ marginTop: 16 }}>
        {tasksQ.query.isLoading ? <Skeleton active paragraph={{ rows: 6 }} />
          : tasksQ.query.isError ? <EmptyState kind="error" action={{ label: "다시 시도", onClick: () => void tasksQ.query.refetch() }} />
          : !items.length ? (fb.active ? <EmptyState kind="filtered" action={{ label: "필터 지우기", onClick: fb.clear }} />
            : <EmptyState kind="empty" title="맡은 업무가 없어요" description="프로젝트에서 할 일을 찾아볼까요?" action={{ label: "프로젝트 보기", to: "/projects" }} />)
          : byAssignee ? (
            <>
              <p className="wk-board-caption">진행 중인 업무를 담당자별로 모았어요. 평가용이 아니에요.</p>
              {assigneeColumns.length ? (
                <KanbanBoard<Task> ariaLabel="담당자별 진행 중 업무" columns={assigneeColumns} items={items.filter((t) => colOf(t) === "in_progress")}
                  getColumn={(t) => t.assignee_id} getId={(t) => t.id} getTitle={(t) => t.title} renderCard={card} />
              ) : <EmptyState kind="empty" compact title="진행 중인 업무가 없어요" />}
            </>
          ) : (
            <KanbanBoard<Task>
              ariaLabel="업무 보드"
              columns={COLUMNS}
              items={items}
              getColumn={colOf}
              getId={(t) => t.id}
              getTitle={(t) => t.title}
              renderCard={card}
              canMove={canMove}
              onMove={onMove}
              emptyColumnText={(c) => `${c.label} 업무가 없어요`}
            />
          )}
      </div>

      <TaskFormDrawer open={selected === "new" && perms.canCreateTask} onClose={() => setSelected(null)} />
      <SubmitDrawer task={submitTask} open={!!submitTask} onClose={() => setSubmitTask(null)} />
      <ReviewDrawer submissionId={selected && selected !== "new" ? selected : null} open={!!selected && selected !== "new"} onClose={() => setSelected(null)} onProcessed={() => setSelected(null)} />
    </>
  );
}
