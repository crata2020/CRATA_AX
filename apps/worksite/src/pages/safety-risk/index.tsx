// 위험성평가 `/company/safety/risk` · I-19 · 깊이 B · 모듈 safety-health · TR 전용 · 소유: industry 그룹
// 공정별 유해·위험요인 → 위험 수준(상·중·하) → 개선대책 → 이행 확인. 2026년 6월 1일 시행 개정에 맞춰 근로자 참여·공유 기록 칸을 둡니다.
// 추가·이행 확인은 검토자 이상, 구성원은 공개된 결과를 봅니다.
import { useEffect, useMemo } from "react";
import { Button, DatePicker, Form, Input, InputNumber, Select } from "antd";
import { CheckOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { DataTable, DdayBadge, DetailDrawer, Divider, EmptyState, FilterBar, PageHeader, PersonChip, StatusTag, useFilterBarState, type FilterBarProps } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { useCreate, useUpdate } from "@/lib/refine";
import { useSelectedParam, useUrlParam } from "@/lib/url";
import { formatDate } from "@/lib/format";
import { labelOf, optionsOf, statusOf } from "@/lib/status";
import type { RiskAssessment } from "@/types/entities";
import { latestRisks } from "@/lib/safety";
import { asRow, useRows } from "../ops-home/kit/data";
import { Kv, SAFETY_TABS } from "../ops-home/kit/ui";
import "../ops-home/kit/industry.css";

/** 어느 평가의 줄인지: "2026 정기" · "2025 최초" · "수시 9월" */
function assessmentLabel(r: Pick<RiskAssessment, "kind" | "assessed_on">): string {
  const [y, m] = r.assessed_on.split("-").map(Number) as [number, number];
  return r.kind === "ad_hoc" ? `수시 ${m}월` : `${y} ${labelOf("risk_assessments.kind", r.kind)}`;
}

interface NewValues { work_area: string; process: string; hazard: string; risk_level_before: RiskAssessment["risk_level_before"]; control_measures: string; owner_id?: string; due_on?: Dayjs | null; kind: RiskAssessment["kind"]; participants?: number; participation_method?: string; share_channel?: string }

export default function Page() {
  const { can, persona, tenant, today } = useWorksite();
  const [selected, setSelected] = useSelectedParam();
  const all = useRows<RiskAssessment>("risk_assessments");
  const processes = useMemo(() => [...new Set(all.rows.map((r) => r.process))].sort(), [all.rows]);
  const cur = selected && selected !== "new" ? all.rows.find((r) => r.id === selected) ?? null : null;
  const canCreate = can("risk_assessments", "create").can && persona.role !== "member";
  const canConfirm = cur ? can("risk_assessments", "edit", asRow(cur)).can && persona.role !== "member" : false;
  const { mutateAsync: create, mutation: crM } = useCreate<RiskAssessment>();
  const { mutateAsync: update, mutation: upM } = useUpdate<RiskAssessment>();
  const [form] = Form.useForm<NewValues>();
  const [doneForm] = Form.useForm<{ after: RiskAssessment["risk_level_before"]; evidence?: string }>();

  // 기본은 '최신 평가': 같은 위험요인은 가장 최근 평가 한 줄만(정기·최초·수시가 같은 요인을 다시 평가해서 줄이 겹쳐 보였어요)
  const [view] = useUrlParam("view", "latest");
  const latestIds = useMemo(() => latestRisks(all.rows).map((r) => r.id), [all.rows]);

  const fbProps: FilterBarProps = {
    search: { placeholder: "유해·위험요인 검색", fields: ["hazard", "control_measures", "work_area"] },
    chips: [
      { param: "view", options: [{ value: "all", label: "모든 평가 기록" }], allLabel: "최신 평가", ariaLabel: "보기" },
      { param: "status", field: "status", options: optionsOf("risk_assessments.status"), multiple: true, ariaLabel: "상태" },
      { param: "level", field: "risk_level_before", options: optionsOf("risk_assessments.risk_level"), multiple: true, ariaLabel: "위험 수준" },
    ],
    selects: [
      { param: "kind", label: "평가 종류", field: "kind", options: optionsOf("risk_assessments.kind") },
      { param: "process", label: "공정", field: "process", options: processes.map((p) => ({ value: p, label: p })) },
    ],
  };
  const fb = useFilterBarState(fbProps);

  useEffect(() => {
    if (selected === "new") { form.resetFields(); form.setFieldsValue({ kind: "ad_hoc", risk_level_before: "medium", due_on: dayjs(today).add(14, "day"), participants: 3, participation_method: "순회 점검", share_channel: "게시" }); }
    if (cur) { doneForm.resetFields(); doneForm.setFieldsValue({ after: cur.risk_level_before === "high" ? "medium" : "low" }); }
  }, [selected, cur?.id, form, doneForm, today]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = async () => {
    const v = await form.validateFields();
    await create({
      resource: "risk_assessments",
      values: {
        work_area: v.work_area.trim(), process: v.process.trim(), hazard: v.hazard.trim(), risk_level_before: v.risk_level_before, control_measures: v.control_measures.trim(), owner_id: v.owner_id ?? null,
        due_on: v.due_on ? v.due_on.format("YYYY-MM-DD") : null, status: "open", risk_level_after: null, worker_participation_note: null, evidence_refs: [], assessed_on: today, kind: v.kind,
        participants: v.participants ?? null, participation_method: v.participation_method ?? null, shared_before_on: today, shared_after_on: null, share_channel: v.share_channel ?? null,
      },
      successNotification: () => ({ type: "success", message: "위험요인을 추가했어요" }),
    });
    setSelected(null);
  };
  const confirmDone = async () => {
    if (!cur) return;
    const v = await doneForm.validateFields();
    await update({ resource: "risk_assessments", id: cur.id, values: { status: "done", risk_level_after: v.after, shared_after_on: today, evidence_refs: v.evidence ? [...cur.evidence_refs, v.evidence] : cur.evidence_refs }, successNotification: () => ({ type: "success", message: "이행을 확인했어요. 결과 공유일을 오늘로 남겼어요." }) });
    setSelected(null);
  };

  return (
    <>
      <PageHeader
        title="위험성평가"
        description="2026년 6월 1일 시행 개정에 맞춰 근로자 참여·공유 기록 칸을 두었어요. 기록은 3년 보존해요."
        tabs={SAFETY_TABS}
        actions={canCreate ? <Button type="primary" icon={<PlusOutlined />} onClick={() => setSelected("new")}>위험요인 추가</Button> : undefined}
      />
      <FilterBar {...fbProps} />
      <DataTable<RiskAssessment>
        resource="risk_assessments"
        ariaLabel="위험성평가"
        filters={view === "all" ? fb.filters : [...fb.filters, { field: "id", operator: "in", value: latestIds }]}
        isFiltered={fb.active}
        onClearFilters={fb.clear}
        // 미조치(개선 필요·조치 중)가 위, 그 안에서는 기한 순
        sorters={[{ field: "status", order: "desc" }, { field: "due_on", order: "asc" }]}
        onRowClick={(r) => setSelected(r.id)}
        columns={[
          { key: "assessed_on", title: "평가", width: 96, render: (r) => <span className="ws-tag">{assessmentLabel(r)}</span> },
          { key: "hazard", title: "유해·위험요인", kind: "name" },
          { key: "work_area", title: "작업 구역", width: 136 },
          { key: "process", title: "공정", low: true, width: 112 },
          { key: "risk_level_before", title: "위험(전)", kind: "status", statusDomain: "risk_assessments.risk_level", width: 92 },
          { key: "control_measures", title: "개선대책", width: 220 },
          { key: "owner_id", title: "담당", kind: "person", low: true, width: 168 },
          { key: "due_on", title: "기한", width: 124, render: (r) => (r.status === "done" ? formatDate(r.due_on) : <DdayBadge date={r.due_on} />) },
          { key: "status", title: "상태", kind: "status", statusDomain: "risk_assessments.status", width: 116 },
          { key: "risk_level_after", title: "위험(후)", low: true, width: 92, render: (r) => (r.risk_level_after ? <StatusTag {...statusOf("risk_assessments.risk_level", r.risk_level_after)} /> : "—") },
        ]}
        mobileRow={(r) => ({ title: r.hazard, subtitle: `${assessmentLabel(r)} · ${r.process} · ${r.work_area}`, trailing: r.status === "done" ? <StatusTag {...statusOf("risk_assessments.status", r.status)} /> : <DdayBadge date={r.due_on} /> })}
        empty={{ kind: "empty", title: "등록된 위험요인이 없어요", description: canCreate ? "공정별로 유해·위험요인을 추가해 주세요." : undefined }}
      />

      <DetailDrawer
        open={!!cur}
        onClose={() => setSelected(null)}
        title={cur?.hazard ?? "위험요인"}
        extra={cur ? <StatusTag {...statusOf("risk_assessments.status", cur.status)} /> : undefined}
        footer={cur && cur.status !== "done" && canConfirm ? <Button type="primary" icon={<CheckOutlined />} loading={upM.isPending} onClick={() => void confirmDone()}>이행 확인</Button> : undefined}
      >
        {cur ? (
          <div className="in-stack">
            <Kv rows={[
              ["평가 종류", labelOf("risk_assessments.kind", cur.kind)], ["평가일", formatDate(cur.assessed_on)], ["작업 구역", cur.work_area], ["공정", cur.process],
              ["위험 수준(전)", <StatusTag {...statusOf("risk_assessments.risk_level", cur.risk_level_before)} />], ["개선대책", cur.control_measures],
              ["담당", cur.owner_id ? <PersonChip memberId={cur.owner_id} size="sm" /> : null], ["기한", cur.due_on ? formatDate(cur.due_on) : null],
              ["위험 수준(후)", cur.risk_level_after ? <StatusTag {...statusOf("risk_assessments.risk_level", cur.risk_level_after)} /> : null],
            ]} />
            <Divider />
            <h3 className="in-sub--sm">참여·공유 기록</h3>
            <Kv rows={[
              ["참여 인원", cur.participants != null ? `${cur.participants}명(이름은 남기지 않음)` : null],
              ["참여 방법", cur.participation_method], ["실시 전 공유일", cur.shared_before_on ? formatDate(cur.shared_before_on) : null],
              ["결과 공유일", cur.shared_after_on ? formatDate(cur.shared_after_on) : null], ["공유 방법", cur.share_channel],
              ["증빙", cur.evidence_refs.length ? cur.evidence_refs.join(", ") : null],
            ]} />
            {cur.status !== "done" && (canConfirm ? (
              <>
                <Divider />
                <Form form={doneForm} layout="vertical">
                  <Form.Item name="after" label="이행 뒤 위험 수준" rules={[{ required: true }]}><Select options={optionsOf("risk_assessments.risk_level")} /></Form.Item>
                  <Form.Item name="evidence" label="증빙(사진 이름·문서)"><Input maxLength={80} placeholder="예: 개선사진_가드설치.jpg" /></Form.Item>
                </Form>
              </>
            ) : <p className="in-note">이행 확인은 검토자 이상이 해요.</p>)}
          </div>
        ) : all.isLoading ? null : selected && selected !== "new" ? <EmptyState kind="not_found" compact /> : null}
      </DetailDrawer>

      <DetailDrawer open={selected === "new"} onClose={() => setSelected(null)} title="위험요인 추가" closeLabel="취소" footer={<Button type="primary" loading={crM.isPending} onClick={() => void add()}>추가하기</Button>}>
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item name="kind" label="평가 종류" rules={[{ required: true }]}><Select options={optionsOf("risk_assessments.kind")} /></Form.Item>
          <Form.Item name="work_area" label="작업 구역" rules={[{ required: true, whitespace: true, message: "작업 구역을 적어 주세요" }]}><Input maxLength={40} /></Form.Item>
          <Form.Item name="process" label="공정" rules={[{ required: true, whitespace: true, message: "공정을 적어 주세요" }]}>
            <Select showSearch options={processes.map((p) => ({ value: p, label: p }))} />
          </Form.Item>
          <Form.Item name="hazard" label="유해·위험요인" rules={[{ required: true, whitespace: true, message: "유해·위험요인을 적어 주세요" }]}><Input maxLength={80} /></Form.Item>
          <Form.Item name="risk_level_before" label="위험 수준" rules={[{ required: true }]}><Select options={optionsOf("risk_assessments.risk_level")} /></Form.Item>
          <Form.Item name="control_measures" label="개선대책" rules={[{ required: true, whitespace: true, message: "개선대책을 적어 주세요" }]}><Input.TextArea rows={2} maxLength={200} /></Form.Item>
          <Form.Item name="owner_id" label="담당"><Select allowClear options={tenant.people.map((p) => ({ value: p.id, label: `${p.displayName} · ${p.jobTitle}` }))} /></Form.Item>
          <Form.Item name="due_on" label="기한"><DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" /></Form.Item>
          <Form.Item name="participants" label="참여 근로자 수"><InputNumber<number> min={0} style={{ width: "100%" }} inputMode="numeric" /></Form.Item>
          <Form.Item name="participation_method" label="참여 방법"><Select options={["순회 점검", "설문", "면담"].map((v) => ({ value: v, label: v }))} /></Form.Item>
          <Form.Item name="share_channel" label="공유 방법"><Select options={["교육", "게시", "설명회", "전자"].map((v) => ({ value: v, label: v }))} /></Form.Item>
        </Form>
      </DetailDrawer>
    </>
  );
}
