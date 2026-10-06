// 내 업무 `/work` · W-03 · 깊이 A · 모듈 tasks · 소유: work 그룹
// 내 업무와 마감을 목록으로 보고, 검토자는 '내가 검토'·회사 전체로 범위를 바꿉니다(?scope=). 검토자 이상은 업무를 만듭니다(?selected=new).
import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { DataTable, DdayBadge, FilterBar, PageHeader, StatusTag, useFilterBarState, type FilterBarProps } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { useList } from "@/lib/refine";
import { useSelectedParam, useUrlParam } from "@/lib/url";
import { formatDate } from "@/lib/format";
import { labelOf, optionsOf, statusOf } from "@/lib/status";
import type { Project, Task } from "@/types/entities";
import { DUE_OPTIONS, SCOPE_LABEL, STACK_STYLE, dueFilters, isDueToday, useScope, useStructure, useWorkPermissions } from "../task-detail/lib";
import { lazyDrawer } from "@/lib/lazyDrawer";

const TaskFormDrawer = lazyDrawer(() => import("../task-detail/TaskFormDrawer").then((m) => m.TaskFormDrawer));
import { ViewSwitch } from "../task-detail/ViewSwitch";
import "../task-detail/work.css";

type TaskRow = Task & { _rel?: { project?: Project | null } };

export default function Page() {
  const { today } = useWorksite();
  const perms = useWorkPermissions();
  const scope = useScope();
  const st = useStructure();
  const [params, setParams] = useSearchParams();
  const [due] = useUrlParam("due");
  const [selected, setSelected] = useSelectedParam();

  const fbProps: FilterBarProps = {
    search: { placeholder: "업무 검색", fields: ["title"] },
    chips: [
      { param: "status", field: "status", options: optionsOf("tasks.status"), multiple: true, ariaLabel: "상태" },
      { param: "due", options: DUE_OPTIONS, ariaLabel: "마감", allLabel: "마감 전체" },
    ],
    selects: [{ param: "project", label: "프로젝트", field: "project_id", options: st.projects.map((p) => ({ value: p.id, label: p.name })) }],
    view: scope.canChoose
      ? { ariaLabel: "범위", urlParam: "scope", value: scope.scope, onChange: () => undefined, options: scope.options.map((s) => ({ value: s, label: SCOPE_LABEL[s] })) }
      : undefined,
  };
  const fb = useFilterBarState(fbProps);
  const statusChosen = !!params.get("status");

  // 상태를 고르지 않으면 진행 중인 것만(완료·취소는 상태 칩에서 고르면 보여요)
  const filters = useMemo(() => [
    ...scope.filters,
    ...fb.filters,
    ...(statusChosen || due === "overdue" ? [] : [{ field: "status", operator: "nin" as const, value: ["done", "canceled"] }]),
    ...dueFilters(due, today),
  ], [scope.filters, fb.filters, statusChosen, due, today]);

  // 요약 글자 링크(현재 범위 기준)
  const summary = useList<Task>({ resource: "tasks", filters: scope.filters, pagination: { mode: "off" } });
  const all = summary.result?.data ?? [];
  const counts = {
    inProgress: all.filter((t) => t.status === "in_progress").length,
    dueToday: all.filter((t) => isDueToday(t, today)).length,
    changes: all.filter((t) => t.status === "changes_requested").length,
  };
  const setFilter = (patch: Record<string, string | null>) => setParams((prev) => {
    const p = new URLSearchParams(prev);
    for (const [k, v] of Object.entries(patch)) { if (v == null) p.delete(k); else p.set(k, v); }
    p.delete("currentPage");
    return p;
  }, { replace: true });
  const status = params.get("status");

  return (
    <>
      <PageHeader
        title="내 업무"
        description={scope.scope === "review" ? "내가 검토자인 업무예요. 제출은 검토함에서 처리해요." : scope.scope === "all" ? "회사 전체 업무예요." : "내가 맡은 업무와 마감이에요."}
        actions={
          <div className="ws-row">
            <ViewSwitch current="list" />
            {perms.canCreateTask && <Button type="primary" icon={<PlusOutlined />} onClick={() => setSelected("new")}>업무 만들기</Button>}
          </div>
        }
      />
      <FilterBar {...fbProps} />
      <ul className="wk-summary-links" aria-label="빠른 필터">
        <li><button type="button" className="wk-linkbtn" aria-pressed={status === "in_progress" && !due} onClick={() => setFilter({ status: "in_progress", due: null })}>진행 중 <strong>{counts.inProgress}</strong></button></li>
        <li><button type="button" className="wk-linkbtn" aria-pressed={due === "today" && !status} onClick={() => setFilter({ due: "today", status: null })}>오늘 마감 <strong>{counts.dueToday}</strong></button></li>
        <li><button type="button" className="wk-linkbtn" aria-pressed={status === "changes_requested" && !due} onClick={() => setFilter({ status: "changes_requested", due: null })}>수정 요청 <strong>{counts.changes}</strong></button></li>
      </ul>
      <DataTable<TaskRow>
        resource="tasks"
        ariaLabel="업무 목록"
        filters={filters}
        isFiltered={fb.active}
        onClearFilters={fb.clear}
        sorters={[{ field: "due_at", order: "asc" }]}
        meta={{ expand: ["project"] }}
        rowHref={(t) => `/work/tasks/${t.id}`}
        columns={[
          { key: "title", title: "업무명", kind: "name" },
          { key: "project", title: "프로젝트", width: 168, render: (t) => { const n = t._rel?.project?.name ?? "—"; return <span className="ws-ellipsis" title={n}>{n}</span>; } },
          { key: "assignee_id", title: "담당", kind: "person", width: 172 },
          { key: "reviewer_id", title: "검토자", kind: "person", width: 172, low: true },
          {
            key: "due_at", title: "마감", sortable: true, width: 200,
            render: (t) => (
              <span className="ws-row" style={{ flexWrap: "nowrap" }}>
                <span className="ws-tabular">{formatDate(t.due_at, false)}</span>
                <DdayBadge date={t.due_at} done={t.status === "done" || t.status === "canceled"} />
              </span>
            ),
          },
          { key: "status", title: "상태", kind: "status", statusDomain: "tasks.status", width: 112 },
          { key: "source", title: "출처", low: true, width: 104, render: (t) => <span className="ws-tag">{labelOf("tasks.source", t.source)}</span> },
        ]}
        mobileRow={(t) => ({
          title: t.title,
          subtitle: `${t._rel?.project?.name ?? "—"} · ${formatDate(t.due_at, false)}`,
          trailing: (
            <span style={STACK_STYLE}>
              <StatusTag {...statusOf("tasks.status", t.status)} />
              <DdayBadge date={t.due_at} done={t.status === "done" || t.status === "canceled"} />
            </span>
          ),
        })}
        empty={
          scope.scope === "review"
            ? { kind: "empty", title: "내가 검토할 업무가 없어요", description: "검토자로 지정되면 여기에 모여요." }
            : { kind: "empty", title: "맡은 업무가 없어요", description: "프로젝트에서 할 일을 찾아볼까요?", action: { label: "프로젝트 보기", to: "/projects" } }
        }
      />
      {!statusChosen && due !== "overdue" && <p className="wk-caption" style={{ marginTop: 12 }}>완료·취소한 업무는 상태에서 고르면 보여요.</p>}
      <TaskFormDrawer open={selected === "new" && perms.canCreateTask} onClose={() => setSelected(null)} />
    </>
  );
}
