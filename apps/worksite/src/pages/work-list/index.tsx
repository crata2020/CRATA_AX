// 내 업무 `/work` · W-03 · 깊이 A · 모듈 tasks · 소유: work 그룹
// 내 업무와 마감을 목록으로 보고, 검토자는 '내가 검토'·회사 전체로 범위를 바꿉니다(?scope=). 검토자 이상은 업무를 만듭니다(?selected=new).
import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { DataTable, DdayBadge, FilterBar, PageHeader, StatusTag, useFilterBarState, type ColumnDef, type FilterBarProps } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { useList } from "@/lib/refine";
import { useSelectedParam, useUrlParam } from "@/lib/url";
import { isDesktopUp, useBreakpoint } from "@/lib/useBreakpoint";
import { formatDate } from "@/lib/format";
import { labelOf, optionsOf, statusOf } from "@/lib/status";
import type { Project, Task } from "@/types/entities";
import { DUE_OPTIONS, SCOPE_LABEL, STACK_STYLE, dueFilters, isDueToday, useMinWidth, useScope, useStructure, useWorkPermissions } from "../task-detail/lib";
import { lazyDrawer } from "@/lib/lazyDrawer";
import { useNavBadges } from "@/layout/useNavBadges";

const TaskFormDrawer = lazyDrawer(() => import("../task-detail/TaskFormDrawer").then((m) => m.TaskFormDrawer));
import { ViewSwitch } from "../task-detail/ViewSwitch";
import "../task-detail/work.css";

type TaskRow = Task & { _rel?: { project?: Project | null } };

export default function Page() {
  const { today, person } = useWorksite();
  const bp = useBreakpoint();
  const roomy = useMinWidth(1024);
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
  // 메뉴·탭 배지(급한 내 업무 + 내가 검토할 제출)와 같은 수: 내 업무 범위에서도 검토 대기를 넷째 조각으로 보여 주고,
  // 누르면 '내가 검토' 범위 + 검토 대기 상태로 바꿔요(배지 5 = 급한 1 + 검토 4를 이 화면에서 따라갈 수 있게)
  const badges = useNavBadges();
  const reviewWaiting = scope.scope === "mine" && scope.options.includes("review") ? badges.reviewWaiting ?? 0 : 0;

  // 내 업무 범위에서는 담당이 늘 나라서 담당 칸을 두지 않아요(그 폭을 업무명·프로젝트에)
  const mine = scope.scope === "mine";
  const projectOf = (t: TaskRow) => t._rel?.project?.name ?? "프로젝트 없음";
  // 마감 칸: 날짜 + D-day 배지. 좁은 칸(태블릿 184)에서는 배지가 날짜 아래로 내려가요(잘리지 않게, 행은 이미 두 줄)
  const dueCell = (t: TaskRow, wrap = false) => (
    <span className="ws-row" style={wrap ? { rowGap: 4 } : { flexWrap: "nowrap" }}>
      <span className="ws-date">{formatDate(t.due_at, false)}</span>
      <DdayBadge date={t.due_at} done={t.status === "done" || t.status === "canceled"} />
    </span>
  );
  // 태블릿(768~1279): 프로젝트 칸을 빼고 업무명 아래 둘째 줄(13/20 muted)로. 담당 칸은 1024 이상에서만,
  // 그보다 좁으면 둘째 줄 끝에 이름으로 붙여요 → 768에서도 가로 스크롤 없이 마감·상태가 보여요.
  // 표가 내용 폭(auto)으로 그려질 때만 업무명을 남는 폭까지로 묶어요(work.css .wk-room: 100vw - --wk-room).
  // 520 = 레일 80 + 바깥 여백 50 + 표 카드 안쪽 16 + 마감 ≈ 200 + 상태 ≈ 122 + 업무명 칸 안쪽 32 + 여유 20. 담당 칸 ≈ 232
  const tabletAssignee = !mine && roomy;
  const columns: ColumnDef<TaskRow>[] = isDesktopUp(bp) ? [
    { key: "title", title: "업무명", kind: "name" },
    // 1280 표 상자(≈ 942) 기준: 프로젝트 208 + 담당 200 + 마감 224 + 상태 112 = 744 + 업무명 최소 160 ≤ 926
    { key: "project", title: "프로젝트", width: 208, render: (t) => { const n = t._rel?.project?.name ?? "—"; return <span className="ws-ellipsis" title={n}>{n}</span>; } },
    ...(mine ? [] : [{ key: "assignee_id", title: "담당", kind: "person" as const, width: 172 }]),
    { key: "reviewer_id", title: "검토자", kind: "person", width: 172, low: true },
    // 날짜는 줄바꿈 없이(ws-date). 224 = 패딩 32 + '12월 31일' + 'D-1 내일 마감' 배지
    { key: "due_at", title: "마감", sortable: true, width: 224, render: (t) => dueCell(t) },
    { key: "status", title: "상태", kind: "status", statusDomain: "tasks.status", width: 112 },
    { key: "source", title: "출처", low: true, width: 104, render: (t) => <span className="ws-tag">{labelOf("tasks.source", t.source)}</span> },
  ] : [
    {
      key: "title", title: "업무명", flex: true,
      render: (t) => {
        const sub = mine || tabletAssignee ? projectOf(t) : `${projectOf(t)} · ${person(t.assignee_id)?.displayName ?? "담당 없음"}`;
        return (
          <span className="wk-cell2 wk-room" style={{ ["--wk-room" as string]: `${tabletAssignee ? 752 : 520}px` }} title={`${t.title} · ${sub}`}>
            <span className="ws-cell-name">{t.title}</span>
            <span className="wk-cell-sub">{sub}</span>
          </span>
        );
      },
    },
    ...(tabletAssignee ? [{ key: "assignee_id", title: "담당", kind: "person" as const, width: 172 }] : []),
    { key: "due_at", title: "마감", sortable: true, width: 184, render: (t) => dueCell(t, true) },
    { key: "status", title: "상태", kind: "status", statusDomain: "tasks.status", width: 112 },
  ];

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
        {reviewWaiting > 0 && <li><button type="button" className="wk-linkbtn" onClick={() => setFilter({ scope: "review", status: "submitted", due: null })}>검토 대기 <strong>{reviewWaiting}</strong></button></li>}
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
        columns={columns}
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
