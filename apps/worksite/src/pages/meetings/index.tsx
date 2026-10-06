// 회의 `/meetings` · W-07 · 깊이 A · 모듈 meetings · 소유: work 그룹
// 회의를 사업·프로젝트·유형·상태로 찾고 확인이 필요한 회의를 골라냅니다. 녹음·전사는 쓰던 도구에 두고 여기서는 분류와 결정만 다뤄요.
import { useMemo } from "react";
import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { DataTable, FilterBar, PageHeader, StatusTag, useFilterBarState, type ColumnDef, type FilterBarProps } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { useList } from "@/lib/refine";
import { useSelectedParam, useUrlParam } from "@/lib/url";
import { addDays, kstIso } from "@/lib/clock";
import { isDesktopUp, useBreakpoint } from "@/lib/useBreakpoint";
import { formatDate, formatDateTime, formatMinutes, formatTime } from "@/lib/format";
import { optionsOf, statusOf } from "@/lib/status";
import type { ActionProposal, Decision, Meeting } from "@/types/entities";
import { meetingFullTitle, useStructure } from "../task-detail/lib";
import "../task-detail/work.css";
import { lazyDrawer } from "@/lib/lazyDrawer";

const PERIODS = [{ value: "week", label: "최근 7일" }, { value: "month", label: "최근 30일" }, { value: "upcoming", label: "예정" }];

// 회의 기록 추가 서랍은 처음 열 때 불러와요(날짜 선택·폼 부품이 회의 목록 첫 묶음에 들어가지 않게)
const NewMeetingDrawer = lazyDrawer(() => import("./NewMeetingDrawer").then((m) => m.NewMeetingDrawer));

export default function Page() {
  const { today, can, persona } = useWorksite();
  const st = useStructure();
  const bp = useBreakpoint();
  const [selected, setSelected] = useSelectedParam();
  const [line] = useUrlParam("line");
  const [period] = useUrlParam("period");
  const canCreate = persona.role !== "member" && can("meetings", "create").can;

  const fbProps: FilterBarProps = {
    search: { placeholder: "회의 검색", fields: ["title"] },
    chips: [
      { param: "line", options: st.lines.map((l) => ({ value: l.id, label: l.name })), ariaLabel: "사업", allLabel: "모든 사업" },
      { param: "status", field: "status", options: optionsOf("meetings.status"), ariaLabel: "상태", allLabel: "모든 상태" },
    ],
    selects: [
      { param: "project", label: "프로젝트", field: "project_ids", options: st.projects.map((p) => ({ value: p.id, label: p.name })) },
      { param: "type", label: "회의 유형", field: "meeting_type", options: optionsOf("meetings.meeting_type") },
      { param: "period", label: "기간", options: PERIODS },
    ],
  };
  const fb = useFilterBarState(fbProps);

  const lineProjects = useMemo(() => (line ? st.projects.filter((p) => p.business_line_id === line).map((p) => p.id) : null), [line, st.projects]);
  const filters = useMemo(() => [
    ...fb.filters,
    ...(lineProjects ? [{ field: "project_ids", operator: "in" as const, value: lineProjects }] : []),
    ...(period === "week" ? [{ field: "started_at", operator: "gte" as const, value: kstIso(addDays(today, -7), "00:00") }, { field: "started_at", operator: "lt" as const, value: kstIso(addDays(today, 1), "00:00") }] : []),
    ...(period === "month" ? [{ field: "started_at", operator: "gte" as const, value: kstIso(addDays(today, -30), "00:00") }, { field: "started_at", operator: "lt" as const, value: kstIso(addDays(today, 1), "00:00") }] : []),
    ...(period === "upcoming" ? [{ field: "status", operator: "eq" as const, value: "scheduled" }] : []),
  ], [fb.filters, lineProjects, period, today]);

  // 결정·액션 제안 수(회의별)
  const decs = useList<Decision>({ resource: "decisions", pagination: { mode: "off" } });
  const aps = useList<ActionProposal>({ resource: "action_proposals", pagination: { mode: "off" } });
  const countBy = <T extends { meeting_id: string }>(rows: T[], pred: (r: T) => boolean = () => true) => {
    const m = new Map<string, number>();
    for (const r of rows) if (pred(r)) m.set(r.meeting_id, (m.get(r.meeting_id) ?? 0) + 1);
    return m;
  };
  const decCount = useMemo(() => countBy(decs.result?.data ?? []), [decs.result]);
  const apCount = useMemo(() => countBy(aps.result?.data ?? []), [aps.result]);
  const apOpen = useMemo(() => countBy(aps.result?.data ?? [], (a) => a.status === "proposed"), [aps.result]);

  const projectName = (id: string) => st.projectById.get(id)?.name ?? "볼 수 없는 프로젝트";
  const projectChips = (ids: string[]) => (
    <span className="ws-row">
      {ids.slice(0, 2).map((id) => <span key={id} className="ws-tag">{projectName(id)}</span>)}
      {ids.length > 2 && <span className="wk-caption">외 {ids.length - 2}</span>}
    </span>
  );
  const actionsCell = (m: Meeting) => <span className="ws-tabular">{apCount.get(m.id) ?? 0}{apOpen.get(m.id) ? ` (확인 ${apOpen.get(m.id)})` : ""}</span>;

  const columns: ColumnDef<Meeting>[] = isDesktopUp(bp) ? [
    {
      key: "title", title: "회의명", kind: "name",
      // 프로젝트·길이는 이름 아래 둘째 줄로(칸을 줄여 상태 글자가 잘리지 않게)
      render: (m) => (
        <span className="wk-cell2">
          {/* 시리즈 머리말은 글자 그대로('[AX] …'): 홈 위젯·결정 목록·모바일 줄과 같은 모양(태그 안 '[AX]'처럼 묶음이 겹치지 않게) */}
          <span className="ws-cell-name" title={meetingFullTitle(m)}>{meetingFullTitle(m)}</span>
          <span className="wk-cell2__sub">{projectChips(m.project_ids)}<span className="wk-caption ws-tabular">{formatMinutes(m.duration_min)}</span></span>
        </span>
      ),
    },
    { key: "started_at", title: "일시", kind: "datetime", sortable: true, width: 172 },
    // 수 칸 셋(참석·결정·액션 제안)은 모두 오른쪽 정렬(다른 표의 수량 칸과 같음). 상태 칸 앞은 칸 안쪽 16 + 16
    { key: "attendee_ids", title: "참석", width: 72, align: "right", render: (m) => <span className="ws-tabular">{m.attendee_ids.length}명</span> },
    { key: "decisions", title: "결정", width: 72, align: "right", render: (m) => <span className="ws-tabular">{decCount.get(m.id) ?? 0}</span> },
    { key: "actions", title: "액션 제안", width: 128, align: "right", render: actionsCell },
    { key: "status", title: "상태", kind: "status", statusDomain: "meetings.status" },
  ] : [
    // 태블릿(768~1279): 참석·결정 칸은 빼요(회의 상세에 있어요). 이름 아래 한 줄 = 첫 프로젝트 태그(말줄임) · 외 N · 길이,
    // 일시는 날짜 / 시각 두 줄 → 모든 행이 두 줄 높이. 768 표 상자 ≈ 622: 일시 136 + 액션 제안 112 + 상태 152 = 400 + 회의명 ≈ 222
    {
      key: "title", title: "회의명", flex: true,
      render: (m) => {
        const [first, ...rest] = m.project_ids;
        return (
          <span className="wk-cell2">
            <span className="ws-cell-name" title={meetingFullTitle(m)}>{meetingFullTitle(m)}</span>
            <span className="wk-cell2__sub wk-cell2__sub--line">
              {first && <span className="ws-tag wk-tag-fit" title={m.project_ids.map(projectName).join(", ")}><span className="ws-ellipsis">{projectName(first)}</span></span>}
              {rest.length > 0 && <span className="wk-caption ws-nowrap">외 {rest.length}</span>}
              <span className="wk-caption ws-nowrap">{formatMinutes(m.duration_min)}</span>
            </span>
          </span>
        );
      },
    },
    {
      key: "started_at", title: "일시", sortable: true, width: 136,
      render: (m) => (
        <span className="wk-cell2">
          <span className="ws-date">{formatDate(m.started_at)}</span>
          <span className="wk-cell-sub ws-tabular">{formatTime(m.started_at)}</span>
        </span>
      ),
    },
    { key: "actions", title: "액션 제안", width: 112, align: "right", render: actionsCell },
    { key: "status", title: "상태", kind: "status", statusDomain: "meetings.status", width: 152 },
  ];

  return (
    <>
      <PageHeader
        title="회의"
        description="녹음은 쓰던 도구에 두고, 여기서는 분류와 결정만 다뤄요."
        actions={canCreate && <Button type="primary" icon={<PlusOutlined />} onClick={() => setSelected("new")}>회의 기록 추가</Button>}
      />
      <FilterBar {...fbProps} />
      <div>
        <DataTable<Meeting>
          resource="meetings"
          ariaLabel="회의 목록"
          filters={filters}
          isFiltered={fb.active}
          onClearFilters={fb.clear}
          sorters={[{ field: "started_at", order: "desc" }]}
          rowHref={(m) => `/meetings/${m.id}`}
          columns={columns}
          mobileRow={(m) => ({
            title: meetingFullTitle(m),
            subtitle: `${formatDateTime(m.started_at)} · ${formatMinutes(m.duration_min)} · 결정 ${decCount.get(m.id) ?? 0}`,
            trailing: <StatusTag {...statusOf("meetings.status", m.status)} />,
          })}
          empty={{ kind: "empty", title: "아직 회의 기록이 없어요", description: "Plaud·클로바노트 연결은 2단계에서 열려요." }}
        />
      </div>
      <NewMeetingDrawer open={selected === "new" && canCreate} onClose={() => setSelected(null)} />
    </>
  );
}
