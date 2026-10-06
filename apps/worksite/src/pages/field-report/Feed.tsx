// 오늘 현장 기록(I-07 피드 탭, 검토자 이상): 표 + [담당 정하기] 서랍(담당 지정 + 선택: 업무 만들기 source=field_report).
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Button, Checkbox, DatePicker, Form, Input, Select } from "antd";
import { UserAddOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { DataTable, DetailDrawer, Divider, EmptyState, FilterBar, PersonChip, StatusTag, useFilterBarState, type FilterBarProps } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { useRpc, type CrudFilter } from "@/lib/refine";
import { useSelectedParam } from "@/lib/url";
import { kstIso } from "@/lib/clock";
import { formatDateTime, formatTime } from "@/lib/format";
import { labelOf, optionsOf, statusOf } from "@/lib/status";
import type { FieldReport, Project } from "@/types/entities";
import type { FieldReportKind } from "@/tenants/types";
import { periodStart, useMfgLookups, useRows } from "../ops-home/kit/data";
import { Kv } from "../ops-home/kit/ui";

interface AssignValues { assignee: string; makeTask?: boolean; title?: string; projectId?: string; due?: Dayjs | null }

const LINK_OF: Record<string, (id: string) => { to: string; label: string }> = {
  nonconformances: (id) => ({ to: `/ops/quality?tab=nc&selected=${id}`, label: "부적합 기록" }),
  breakdown_records: (id) => ({ to: `/ops/equipment?tab=breakdowns&selected=${id}`, label: "고장 기록" }),
  near_miss_reports: () => ({ to: "/company/safety", label: "아차사고 기록" }),
};

export function Feed() {
  const { tenant, today } = useWorksite();
  const lk = useMfgLookups();
  const projects = useRows<Project>("projects", { filters: [{ field: "status", operator: "ne", value: "done" }] });
  const [selected, setSelected] = useSelectedParam();
  const [form] = Form.useForm<AssignValues>();
  const [makeTask, setMakeTask] = useState(false);
  const { run, isPending } = useRpc<{ ok: boolean; taskId: string | null }>("assign_field_report", { successMessage: "담당을 정했어요. 담당에게 알렸어요." });

  const fbProps: FilterBarProps = {
    chips: [
      { param: "range", options: [{ value: "week", label: "이번 주" }, { value: "all", label: "전체" }], allLabel: "오늘", ariaLabel: "기간" },
      { param: "status", field: "status", options: optionsOf("field_reports.status"), multiple: true, ariaLabel: "상태" },
      { param: "kind", field: "kind", options: optionsOf("field_reports.kind"), multiple: true, ariaLabel: "종류" },
    ],
  };
  const fb = useFilterBarState(fbProps);
  const range = fb.values.range ?? "today";
  const filters = useMemo<CrudFilter[]>(() => {
    if (range === "all") return fb.filters;
    return [...fb.filters, { field: "reported_at", operator: "gte", value: kstIso(periodStart(today, range === "week" ? "week" : "today"), "00:00") }];
  }, [fb.filters, range, today]);

  const reports = useRows<FieldReport>("field_reports", { enabled: !!selected });
  const current = selected ? reports.rows.find((r) => r.id === selected) ?? null : null;
  // 추천 담당: 회사 규칙(TenantConfig.routing — 홈 '승인 대기'와 같은 규칙)
  const defaultAssignee = (r: FieldReport) => {
    const code = tenant.routing?.fieldReportByKind?.[r.kind as FieldReportKind];
    return code ? (tenant.people.find((p) => p.roleCode === code && p.persona) ?? tenant.people.find((p) => p.roleCode === code))?.id : undefined;
  };
  const defaultProject = (r: FieldReport) => {
    const want = r.kind === "equipment" ? "prj-tr-safe-press" : r.kind === "defect" ? "prj-tr-qual-ppm" : "prj-tr-safe-h2";
    return projects.rows.find((p) => p.id === want)?.id ?? projects.rows[0]?.id;
  };

  useEffect(() => {
    if (!current) return;
    form.resetFields();
    setMakeTask(false);
    form.setFieldsValue({ assignee: current.assignee_id ?? defaultAssignee(current), title: `${labelOf("field_reports.kind", current.kind)}: ${current.note}`.slice(0, 60), projectId: defaultProject(current), due: dayjs(today).add(3, "day") });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, projects.rows.length]);

  const save = async () => {
    if (!current) return;
    const v = await form.validateFields();
    await run({
      reportId: current.id, assigneeId: v.assignee,
      task: makeTask ? { title: v.title, projectId: v.projectId, dueAt: v.due ? kstIso(v.due.format("YYYY-MM-DD"), "18:00") : null } : null,
    });
    setSelected(null);
  };

  const where = (r: FieldReport) => [r.process_step_id ? lk.step.get(r.process_step_id)?.name : null, r.equipment_id ? lk.eq.get(r.equipment_id)?.equipment_no : null].filter(Boolean).join(" · ") || "—";
  const reporter = (r: FieldReport) => (r.anonymous || !r.reported_by ? <PersonChip fallbackName="이름 없음" size="sm" /> : <PersonChip memberId={r.reported_by} size="sm" />);
  const linked = current?.linked_type && current.linked_id ? LINK_OF[current.linked_type]?.(current.linked_id) : undefined;

  return (
    <>
      <FilterBar {...fbProps} />
      <DataTable<FieldReport>
        resource="field_reports"
        ariaLabel="현장 기록"
        filters={filters}
        isFiltered={fb.active && !(Object.keys(fb.values).length === 1 && fb.values.range)}
        onClearFilters={fb.clear}
        syncWithLocation={false}
        sorters={[{ field: "reported_at", order: "desc" }]}
        onRowClick={(r) => setSelected(r.id)}
        columns={[
          { key: "reported_at", title: "시각", render: (r) => <span className="in-num">{range === "today" ? formatTime(r.reported_at) : formatDateTime(r.reported_at)}</span> },
          { key: "kind", title: "종류", render: (r) => <span className="ws-tag">{labelOf("field_reports.kind", r.kind)}</span> },
          { key: "note", title: "한 줄", kind: "name" },
          { key: "where", title: "공정·설비", render: where },
          { key: "reported_by", title: "등록자", render: reporter },
          { key: "status", title: "상태", kind: "status", statusDomain: "field_reports.status" },
          {
            key: "assign", title: "담당", render: (r) => r.status === "new"
              ? <Button className="ws-rowact" icon={<UserAddOutlined />} onClick={(e) => { e.stopPropagation(); setSelected(r.id); }}>담당 정하기</Button>
              : <PersonChip memberId={r.assignee_id} size="sm" />,
          },
        ]}
        mobileRow={(r) => ({
          title: r.note,
          subtitle: `${formatTime(r.reported_at)} · ${labelOf("field_reports.kind", r.kind)} · ${where(r)}`,
          trailing: <StatusTag {...statusOf("field_reports.status", r.status)} />,
        })}
        empty={{ kind: "empty", title: range === "today" ? "오늘 들어온 현장 기록이 없어요" : "현장 기록이 없어요", description: "작업자가 현장 등록을 하면 여기에 바로 보여요." }}
      />

      <DetailDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={current ? `${labelOf("field_reports.kind", current.kind)} 기록` : "현장 기록"}
        extra={current ? <StatusTag {...statusOf("field_reports.status", current.status)} /> : undefined}
        closeLabel="취소"
        footer={current ? <Button type="primary" loading={isPending} onClick={() => void save()}>{current.status === "new" ? "담당 정하기" : "담당 바꾸기"}</Button> : undefined}
      >
        {reports.isLoading ? null : current ? (
          <div className="in-stack">
            <Kv rows={[
              ["한 줄", current.note],
              ["시각", formatDateTime(current.reported_at)],
              ["공정·설비", where(current)],
              ["등록자", reporter(current)],
              ["사진", current.photo_name ?? "없음"],
              ["연결 기록", linked ? <Link className="in-link" to={linked.to}>{linked.label}</Link> : null],
              ["현재 담당", current.assignee_id ? <PersonChip memberId={current.assignee_id} size="sm" /> : "미배정"],
            ]} />
            <Divider />
            <Form form={form} layout="vertical" requiredMark="optional">
              <Form.Item name="assignee" label="담당" rules={[{ required: true, message: "담당을 골라 주세요" }]}>
                <Select showSearch optionFilterProp="label" options={tenant.people.map((p) => ({ value: p.id, label: `${p.displayName} · ${p.jobTitle}` }))} />
              </Form.Item>
              <Checkbox checked={makeTask} onChange={(e) => setMakeTask(e.target.checked)}>업무도 만들기</Checkbox>
              {makeTask && (
                <div className="in-mt">
                  <Form.Item name="title" label="업무 제목" rules={[{ required: true, whitespace: true, message: "업무 제목을 적어 주세요" }]}><Input maxLength={60} /></Form.Item>
                  <Form.Item name="projectId" label="프로젝트" rules={[{ required: true, message: "프로젝트를 골라 주세요" }]}>
                    <Select options={projects.rows.map((p) => ({ value: p.id, label: p.name }))} />
                  </Form.Item>
                  <Form.Item name="due" label="마감"><DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" /></Form.Item>
                </div>
              )}
            </Form>
          </div>
        ) : (
          <EmptyState kind="not_found" compact />
        )}
      </DetailDrawer>
    </>
  );
}
