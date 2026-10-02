// 회의 `/meetings` · W-07 · 깊이 A · 모듈 meetings · 소유: work 그룹
// 회의를 사업·프로젝트·유형·상태로 찾고 확인이 필요한 회의를 골라냅니다. 녹음·전사는 쓰던 도구에 두고 여기서는 분류와 결정만 다뤄요.
import { useEffect, useMemo } from "react";
import { Button, DatePicker, Form, Input, InputNumber, Select } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useNavigate } from "react-router";
import { DataTable, DetailDrawer, FilterBar, PageHeader, StatusTag, useFilterBarState, type FilterBarProps } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { useCreate, useList } from "@/lib/refine";
import { useSelectedParam, useUrlParam } from "@/lib/url";
import { addDays, kstIso } from "@/lib/clock";
import { formatDateTime, formatMinutes } from "@/lib/format";
import { optionsOf, statusOf } from "@/lib/status";
import type { ActionProposal, Decision, Meeting } from "@/types/entities";
import { MEETING_PREFIXES, MFG_MEETING_PREFIXES, meetingTitle, useStructure } from "../task-detail/lib";
import "../task-detail/work.css";

const PERIODS = [{ value: "week", label: "최근 7일" }, { value: "month", label: "최근 30일" }, { value: "upcoming", label: "예정" }];

interface NewMeeting { prefix?: string | null; title: string; at: Dayjs; min: number; type: Meeting["meeting_type"]; projects: string[]; attendees: string[]; summary?: string }

function NewMeetingDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { tenant, persona, today } = useWorksite();
  const nav = useNavigate();
  const st = useStructure();
  const [form] = Form.useForm<NewMeeting>();
  const { mutateAsync, mutation } = useCreate<Meeting>();
  const isMfg = tenant.packs.includes("manufacturing");
  useEffect(() => {
    if (open) { form.resetFields(); form.setFieldsValue({ at: dayjs(`${today}T10:00`), min: 30, type: isMfg ? "production" : "internal_regular", attendees: [persona.memberId], projects: [] }); }
  }, [open, form, today, isMfg, persona.memberId]);
  const save = async () => {
    const v = await form.validateFields();
    const projects = v.projects ?? [];
    const sens = projects.some((id) => st.projectById.get(id)?.sensitivity === "L2") ? "L2" : "L1";
    const prefix = v.prefix || null;
    const res = await mutateAsync({
      resource: "meetings",
      values: {
        title: prefix ? `${prefix} ${v.title.trim()}` : v.title.trim(), title_prefix: prefix, meeting_type: v.type, project_ids: projects,
        started_at: kstIso(v.at.format("YYYY-MM-DD"), v.at.format("HH:mm")), duration_min: v.min, attendee_ids: v.attendees, source: "manual",
        transcript_ref: null, summary: v.summary?.trim() || null, sensitivity: sens, status: "needs_review",
      },
      successNotification: () => ({ type: "success", message: "회의 기록을 추가했어요" }),
    });
    onClose();
    if (res?.data?.id) nav(`/meetings/${res.data.id}`);
  };
  const prefixes = isMfg ? MFG_MEETING_PREFIXES : MEETING_PREFIXES;
  const typeOptions = optionsOf("meetings.meeting_type").filter((o) => isMfg ? ["production", "quality", "planning", "review", "other"].includes(o.value) : !["production", "quality"].includes(o.value));
  return (
    <DetailDrawer open={open} onClose={onClose} title="회의 기록 추가" footer={<Button type="primary" loading={mutation.isPending} onClick={() => void save().catch(() => undefined)}>추가하기</Button>}>
      <Form form={form} layout="vertical" className="wk-form" requiredMark={false} disabled={mutation.isPending}>
        <Form.Item name="prefix" label="접두어" extra={isMfg ? "회사 정례 회의는 접두어 없이 둬도 돼요" : "회의 분류 체계 6종 중 하나를 골라요"}
          rules={isMfg ? [] : [{ required: true, message: "접두어를 골라 주세요" }]}>
          <Select allowClear={isMfg} options={prefixes.map((p) => ({ value: p, label: p }))} placeholder={isMfg ? "접두어 없음" : "접두어 고르기"} />
        </Form.Item>
        <Form.Item name="title" label="제목" rules={[{ required: true, message: "회의 제목을 적어 주세요" }]}><Input maxLength={60} placeholder="예: 주간 생산회의" /></Form.Item>
        <Form.Item name="at" label="일시" rules={[{ required: true, message: "일시를 골라 주세요" }]}>
          <DatePicker showTime={{ format: "HH:mm", minuteStep: 5 }} format="YYYY-MM-DD HH:mm" style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="min" label="길이(분)" rules={[{ required: true, message: "길이를 적어 주세요" }]}><InputNumber min={5} max={480} step={5} style={{ width: "100%" }} /></Form.Item>
        <Form.Item name="type" label="회의 유형"><Select options={typeOptions} /></Form.Item>
        <Form.Item name="projects" label="프로젝트" extra="L2 프로젝트를 고르면 회의도 L2가 돼요">
          <Select mode="multiple" showSearch optionFilterProp="label" options={st.projects.map((p) => ({ value: p.id, label: p.name }))} placeholder="프로젝트 고르기" />
        </Form.Item>
        <Form.Item name="attendees" label="참석자" rules={[{ required: true, message: "참석자를 골라 주세요" }]}>
          <Select mode="multiple" showSearch optionFilterProp="label" options={tenant.people.map((p) => ({ value: p.id, label: p.displayName }))} />
        </Form.Item>
        <Form.Item name="summary" label="요약"><Input.TextArea rows={3} maxLength={500} placeholder="결정과 할 일을 중심으로 적어요" /></Form.Item>
        <p className="wk-caption">녹음·전사 연결(Plaud·클로바노트)은 2단계에서 열려요. 지금은 직접 적은 기록만 남아요.</p>
      </Form>
    </DetailDrawer>
  );
}

export default function Page() {
  const { today, can, persona } = useWorksite();
  const st = useStructure();
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

  const projectChips = (ids: string[]) => (
    <span className="ws-row">
      {ids.slice(0, 2).map((id) => <span key={id} className="ws-tag">{st.projectById.get(id)?.name ?? "볼 수 없는 프로젝트"}</span>)}
      {ids.length > 2 && <span className="wk-caption">외 {ids.length - 2}</span>}
    </span>
  );

  return (
    <>
      <PageHeader
        title="회의"
        description="녹음은 쓰던 도구에 두고, 여기서는 분류와 결정만 다뤄요."
        actions={canCreate && <Button type="primary" icon={<PlusOutlined />} onClick={() => setSelected("new")}>회의 기록 추가</Button>}
      />
      <FilterBar {...fbProps} />
      <div style={{ marginTop: 16 }}>
        <DataTable<Meeting>
          resource="meetings"
          ariaLabel="회의 목록"
          filters={filters}
          isFiltered={fb.active}
          onClearFilters={fb.clear}
          sorters={[{ field: "started_at", order: "desc" }]}
          rowHref={(m) => `/meetings/${m.id}`}
          columns={[
            {
              key: "title", title: "회의명", kind: "name",
              // 프로젝트·길이는 이름 아래 둘째 줄로(칸을 줄여 상태 글자가 잘리지 않게)
              render: (m) => (
                <span className="wk-cell2">
                  <span className="ws-row" style={{ flexWrap: "nowrap", minWidth: 0 }}>
                    {m.title_prefix && <span className="ws-tag">{m.title_prefix}</span>}
                    <span className="ws-cell-name">{meetingTitle(m)}</span>
                  </span>
                  <span className="wk-cell2__sub">{projectChips(m.project_ids)}<span className="wk-caption ws-tabular">{formatMinutes(m.duration_min)}</span></span>
                </span>
              ),
            },
            { key: "started_at", title: "일시", kind: "datetime", sortable: true, width: 172 },
            { key: "attendee_ids", title: "참석", width: 72, align: "right", render: (m) => <span className="ws-tabular">{m.attendee_ids.length}명</span> },
            { key: "decisions", title: "결정", width: 64, align: "right", render: (m) => <span className="ws-tabular">{decCount.get(m.id) ?? 0}</span> },
            {
              key: "actions", title: "액션 제안", width: 128,
              render: (m) => <span className="ws-tabular">{apCount.get(m.id) ?? 0}{apOpen.get(m.id) ? ` (확인 ${apOpen.get(m.id)})` : ""}</span>,
            },
            { key: "status", title: "상태", kind: "status", statusDomain: "meetings.status" },
          ]}
          mobileRow={(m) => ({
            title: `${m.title_prefix ? `${m.title_prefix} ` : ""}${meetingTitle(m)}`,
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
