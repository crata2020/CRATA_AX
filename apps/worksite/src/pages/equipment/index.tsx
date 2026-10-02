// 설비 `/ops/equipment` · I-14 · 깊이 B · 모듈 mfg-equipment · TR 전용 · 소유: industry 그룹
// 탭: 대장 | 오늘 점검 | 고장 | 법정 검사 | 보전 일정. 설비 종류·대수는 공개 자료, 위치·일정·이력은 예시예요.
// 동작: [이상 없음] → equipment_checks 생성 · [이상 있음] → 현장 등록(kind=equipment) · [수리 완료](검토자) → rpc:repair_breakdown(등록자에게 알림)
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button, Form, Input } from "antd";
import { CheckOutlined, ToolOutlined, WarningOutlined } from "@ant-design/icons";
import {
  DataTable, DdayBadge, DetailDrawer, Divider, EmptyState, FilterBar, PageHeader, PersonChip, SectionCard, StatusTag, Timeline, useFilterBarState, type FilterBarProps, type TimelineItem, DisabledAction,
} from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { usePageReady } from "@/app/pageReady";
import { useCreate, useRpc } from "@/lib/refine";
import { useSelectedParam, useUrlParam } from "@/lib/url";
import { kstIso } from "@/lib/clock";
import { formatDate, formatDateTime, formatMinutes } from "@/lib/format";
import { labelOf, statusOf } from "@/lib/status";
import type { BreakdownRecord, Equipment, EquipmentCheck, LegalInspection, PmPlan } from "@/types/entities";
import { asRow, useIndex, useModuleRows, useRows } from "../ops-home/kit/data";
import { checkResult } from "../ops-home/kit/labels";
import { Kv } from "../ops-home/kit/ui";
import "../ops-home/kit/industry.css";

const TABS = [
  { key: "ledger", label: "대장", to: "?tab=ledger" },
  { key: "today", label: "오늘 점검", to: "?tab=today" },
  { key: "breakdowns", label: "고장", to: "?tab=breakdowns" },
  { key: "legal", label: "법정 검사", to: "?tab=legal" },
  { key: "pm", label: "보전 일정", to: "?tab=pm" },
];
const KINDS = ["편조기", "프레스", "전용기", "롤링기", "절단기", "스포트기"];

export default function Page() {
  const [tab] = useUrlParam("tab", "ledger");
  const equipment = useRows<Equipment>("equipment", { sorters: [{ field: "equipment_no", order: "asc" }] });
  const pm = useRows<PmPlan>("pm_plans", { sorters: [{ field: "next_due_on", order: "asc" }] });
  usePageReady(!equipment.isLoading);
  const eqById = useIndex(equipment.rows);
  const nextPm = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of pm.rows) if (!m.has(p.equipment_id)) m.set(p.equipment_id, p.next_due_on);
    return m;
  }, [pm.rows]);
  const eqNo = (id: string) => eqById.get(id)?.equipment_no ?? "—";
  return (
    <>
      <PageHeader title="설비" description="설비 대장과 점검·고장·법정 검사·보전 일정을 한곳에서 봐요." tabs={TABS} />
      {tab === "ledger" && <Ledger nextPm={nextPm} />}
      {tab === "today" && <TodayChecks equipment={equipment.rows} />}
      {tab === "breakdowns" && <Breakdowns eqNo={eqNo} />}
      {tab === "legal" && (
        <>
          <p className="in-caption in-mb">프레스 등 안전검사는 설치 후 3년 안 최초, 이후 2년마다예요(산업안전보건법 시행규칙 제126조). 기록과 일정을 돕는 도구이고 법 준수를 보장하지는 않아요.</p>
          <DataTable<LegalInspection>
            resource="legal_inspections"
            ariaLabel="법정 검사"
            syncWithLocation={false}
            sorters={[{ field: "due_on", order: "asc" }]}
            columns={[
              { key: "equipment_id", title: "설비", render: (l) => <span className="ws-cell-name">{eqNo(l.equipment_id)}</span> },
              { key: "kind", title: "검사 종류", flex: true },
              { key: "due_on", title: "기한", render: (l) => <span className="in-row"><span className="in-num ws-date">{formatDate(l.due_on, false)}</span>{!l.done_on && <DdayBadge date={l.due_on} />}</span> },
              { key: "done_on", title: "실시일", kind: "date" },
              { key: "result", title: "결과", kind: "status", statusDomain: "legal_inspections.result" },
              { key: "cert_ref", title: "증명서", render: (l) => l.cert_ref ?? "—" },
            ]}
            mobileRow={(l) => ({ title: `${eqNo(l.equipment_id)} · ${l.kind}`, subtitle: `기한 ${formatDate(l.due_on, false)}${l.done_on ? ` · ${formatDate(l.done_on, false)} 실시` : ""}`, trailing: l.done_on ? <StatusTag {...statusOf("legal_inspections.result", l.result)} /> : <DdayBadge date={l.due_on} /> })}
            empty={{ kind: "empty", title: "법정 검사 일정이 없어요", description: "안전검사 대상 설비를 등록하면 기한을 알려 드려요." }}
          />
        </>
      )}
      {tab === "pm" && (
        <DataTable<PmPlan>
          resource="pm_plans"
          ariaLabel="보전 일정"
          syncWithLocation={false}
          sorters={[{ field: "next_due_on", order: "asc" }]}
          columns={[
            { key: "equipment_id", title: "설비", render: (p) => <span className="ws-cell-name">{eqNo(p.equipment_id)}</span> },
            { key: "task", title: "할 일", flex: true },
            { key: "cycle", title: "주기" },
            { key: "last_done_on", title: "마지막", kind: "date" },
            { key: "next_due_on", title: "다음", render: (p) => <span className="in-row"><span className="in-num ws-date">{formatDate(p.next_due_on, false)}</span><DdayBadge date={p.next_due_on} noun="보전" /></span> },
            { key: "owner_id", title: "담당", kind: "person" },
          ]}
          mobileRow={(p) => ({ title: `${eqNo(p.equipment_id)} · ${p.task}`, subtitle: `${p.cycle} · 다음 ${formatDate(p.next_due_on, false)}`, trailing: <DdayBadge date={p.next_due_on} noun="보전" /> })}
          empty={{ kind: "empty", title: "보전 일정이 없어요", description: "설비별 예방보전 할 일을 등록하면 여기에 모여요." }}
        />
      )}
    </>
  );
}

function Ledger({ nextPm }: { nextPm: Map<string, string> }) {
  const [selected, setSelected] = useSelectedParam();
  const fbProps: FilterBarProps = {
    search: { placeholder: "설비 번호·이름 검색", fields: ["equipment_no", "name"] },
    chips: [{ param: "kind", field: "kind", options: KINDS.map((k) => ({ value: k, label: k })), ariaLabel: "설비 종류" }],
  };
  const fb = useFilterBarState(fbProps);
  const equipment = useRows<Equipment>("equipment", { enabled: !!selected });
  const cur = selected ? equipment.rows.find((e) => e.id === selected) ?? null : null;
  const checks = useModuleRows<EquipmentCheck>("mfg-equipment", "equipment_checks", { filters: [{ field: "equipment_id", operator: "eq", value: selected ?? "" }], sorters: [{ field: "checked_on", order: "desc" }], enabled: !!selected });
  const bds = useModuleRows<BreakdownRecord>("mfg-equipment", "breakdown_records", { filters: [{ field: "equipment_id", operator: "eq", value: selected ?? "" }], enabled: !!selected });
  const lis = useModuleRows<LegalInspection>("mfg-equipment", "legal_inspections", { filters: [{ field: "equipment_id", operator: "eq", value: selected ?? "" }], enabled: !!selected });
  const pms = useModuleRows<PmPlan>("mfg-equipment", "pm_plans", { filters: [{ field: "equipment_id", operator: "eq", value: selected ?? "" }], enabled: !!selected });
  const history = useMemo<TimelineItem[]>(() => [
    ...checks.rows.slice(0, 5).map((c) => ({ id: c.id, at: kstIso(c.checked_on, "08:30"), title: `일상 점검 · ${checkResult(c.result).label}`, description: c.findings ?? undefined, tone: c.result === "ok" ? ("good" as const) : ("serious" as const) })),
    ...bds.rows.map((b) => ({ id: b.id, at: b.occurred_at, title: `고장 · ${b.symptom}`, description: b.repair ? `수리: ${b.repair}` : labelOf("breakdown_records.status", b.status), tone: b.status === "repaired" ? ("good" as const) : ("critical" as const) })),
    ...lis.rows.map((l) => ({ id: l.id, at: kstIso(l.done_on ?? l.due_on, "10:00"), title: `${l.kind} · ${labelOf("legal_inspections.result", l.result)}`, tone: l.result === "pass" ? ("good" as const) : ("neutral" as const) })),
    ...pms.rows.map((p) => ({ id: p.id, at: kstIso(p.next_due_on, "09:00"), title: `보전 예정 · ${p.task}`, description: p.cycle, tone: "info" as const })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 12), [checks.rows, bds.rows, lis.rows, pms.rows]);

  return (
    <>
      <FilterBar {...fbProps} />
      <p className="in-caption in-mb">설비 종류와 대수는 공개 자료(편조기 36대 등) 기준이고, 위치·일정은 예시예요.</p>
      <DataTable<Equipment>
        resource="equipment"
        ariaLabel="설비 대장"
        filters={fb.filters}
        isFiltered={fb.active}
        onClearFilters={fb.clear}
        syncWithLocation={false}
        sorters={[{ field: "equipment_no", order: "asc" }]}
        pageSize={20}
        onRowClick={(e) => setSelected(e.id)}
        columns={[
          { key: "equipment_no", title: "설비 번호", kind: "name" },
          { key: "kind", title: "종류" },
          { key: "name", title: "이름" },
          { key: "location", title: "위치" },
          { key: "status", title: "상태", kind: "status", statusDomain: "equipment.status" },
          { key: "next_pm", title: "다음 점검", render: (e) => (nextPm.get(e.id) ? <DdayBadge date={nextPm.get(e.id)!} noun="점검" /> : "—") },
          { key: "next_legal_inspection_on", title: "다음 법정 검사", render: (e) => (e.legal_inspection_required ? formatDate(e.next_legal_inspection_on) : <span className="in-caption">대상 아님</span>) },
        ]}
        mobileRow={(e) => ({ title: `${e.equipment_no} · ${e.name}`, subtitle: `${e.kind} · ${e.location ?? "—"}`, trailing: <StatusTag {...statusOf("equipment.status", e.status)} /> })}
        empty={{ kind: "empty", title: "등록된 설비가 없어요", description: "설비를 등록하면 점검·고장·보전 기록이 이어져요." }}
      />
      <DetailDrawer open={!!selected} onClose={() => setSelected(null)} title={cur ? `${cur.equipment_no} ${cur.name}` : "설비"} extra={cur ? <StatusTag {...statusOf("equipment.status", cur.status)} /> : undefined}
        footer={cur ? <Link to={`/ops/report?kind=equipment&equipment=${cur.id}`}><Button icon={<WarningOutlined />}>이상 등록하기</Button></Link> : undefined}>
        {cur ? (
          <div className="in-stack">
            <Kv rows={[
              ["종류", cur.kind], ["위치", cur.location], ["용량", cur.capacity], ["법정 검사", cur.legal_inspection_required ? `대상 · 다음 ${formatDate(cur.next_legal_inspection_on)}` : "대상 아님"],
              ["메모", cur.note],
            ]} />
            <Divider />
            <h3 className="in-sub--sm">이력</h3>
            {history.length ? <Timeline items={history} dense ariaLabel="설비 이력" /> : <p className="in-note">이력이 없어요.</p>}
          </div>
        ) : equipment.isLoading ? null : <EmptyState kind="not_found" compact />}
      </DetailDrawer>
    </>
  );
}

function TodayChecks({ equipment }: { equipment: Equipment[] }) {
  const { today, persona, can } = useWorksite();
  const nav = useNavigate();
  const checks = useRows<EquipmentCheck>("equipment_checks", { filters: [{ field: "checked_on", operator: "eq", value: today }] });
  const { mutateAsync: create } = useCreate<EquipmentCheck>();
  const [busy, setBusy] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const checked = useMemo(() => new Map(checks.rows.map((c) => [c.equipment_id, c])), [checks.rows]);
  const active = equipment.filter((e) => e.status === "active");
  const todo = active.filter((e) => !checked.has(e.id));
  const done = active.filter((e) => checked.has(e.id));
  const canCheck = can("equipment_checks", "create");
  const formOf = (e: Equipment) => (e.kind === "프레스" ? "일상 점검표(프레스: 양수 버튼·방호장치·윤활)" : e.kind === "편조기" ? "일상 점검표(편조기: 바늘·윤활·덮개)" : `일상 점검표(${e.kind})`);

  const ok = async (e: Equipment) => {
    setBusy(e.id);
    try {
      await create({
        resource: "equipment_checks",
        values: { equipment_id: e.id, kind: "daily", checked_on: today, checked_by: persona.memberId, result: "ok", findings: null, items_result: e.kind === "프레스" ? { 외관: true, 윤활: true, "양수 버튼": true, 방호장치: true } : { 외관: true, 윤활: true, 비상정지: true } },
        successNotification: () => ({ type: "success", message: `${e.equipment_no} 점검을 '이상 없음'으로 남겼어요` }),
      });
    } finally { setBusy(null); }
  };

  if (!checks.isLoading && !active.length) return <EmptyState kind="empty" title="점검할 설비가 없어요" description="사용 중인 설비가 있으면 오늘 점검 목록이 생겨요." />;
  return (
    <div className="in-stack">
      <SectionCard title={`점검 전 ${todo.length}대`} demo caption={!canCheck.can ? `${canCheck.reason ?? "권한이 없어요"} 보기만 할 수 있어요.` : "이상이 있으면 현장 등록으로 남겨 주세요. 공장장에게 알림이 가요."}>
        {todo.length ? (
          <ul className="in-rows" aria-label="점검 전 설비">
            {todo.map((e) => (
              <li key={e.id} className="in-line">
                <div className="in-line__main">
                  <span className="in-line__title">{e.equipment_no} · {e.name}</span>
                  <span className="in-line__meta">{formOf(e)}</span>
                </div>
                <div className="in-line__actions">
                  {canCheck.can ? (
                    <>
                      <Button icon={<CheckOutlined />} loading={busy === e.id} onClick={() => void ok(e)}>이상 없음</Button>
                      <Button icon={<WarningOutlined />} onClick={() => nav(`/ops/report?kind=equipment&equipment=${e.id}`)}>이상 있음</Button>
                    </>
                  ) : (
                    <DisabledAction label="이상 없음" reason={canCheck.reason ?? "지금은 기록할 수 없어요"}><Button disabled>이상 없음</Button></DisabledAction>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : <EmptyState kind="empty" compact title="오늘 점검을 모두 마쳤어요" />}
      </SectionCard>
      <SectionCard title={`점검 완료 ${done.length}대`} actions={<Button size="small" type="text" aria-expanded={showDone} onClick={() => setShowDone((v) => !v)}>{showDone ? "접기" : "펼치기"}</Button>}>
        {showDone ? (
          <ul className="in-rows" aria-label="점검 완료 설비">
            {done.map((e) => {
              const c = checked.get(e.id)!;
              return (
                <li key={e.id} className="in-line">
                  <div className="in-line__main">
                    <span className="in-line__title">{e.equipment_no} · {e.name}</span>
                    <span className="in-line__meta">{c.findings ?? formOf(e)}</span>
                  </div>
                  <div className="in-line__actions"><StatusTag {...checkResult(c.result)} /><PersonChip memberId={c.checked_by} size="sm" /></div>
                </li>
              );
            })}
          </ul>
        ) : <p className="in-note">오늘 {done.length}대를 점검했어요.</p>}
      </SectionCard>
    </div>
  );
}

function Breakdowns({ eqNo }: { eqNo: (id: string) => string }) {
  const { can } = useWorksite();
  const [selected, setSelected] = useSelectedParam();
  const fbProps: FilterBarProps = { chips: [{ param: "status", field: "status", options: [{ value: "open", label: "고장" }, { value: "repairing", label: "수리 중" }, { value: "repaired", label: "수리 완료" }], multiple: true, ariaLabel: "상태" }] };
  const fb = useFilterBarState(fbProps);
  const rows = useRows<BreakdownRecord>("breakdown_records", { enabled: !!selected });
  const cur = selected ? rows.rows.find((b) => b.id === selected) ?? null : null;
  const canRepair = cur ? can("breakdown_records", "approve", asRow(cur)) : { can: false };
  const repair = useRpc<{ ok: boolean; downtime: number }>("repair_breakdown", { successMessage: "수리 완료로 바꿨어요. 등록한 사람에게 알렸어요." });
  const [form] = Form.useForm<{ cause?: string; repair?: string }>();

  const save = async () => {
    if (!cur) return;
    const v = form.getFieldsValue();
    await repair.run({ breakdownId: cur.id, cause: v.cause ?? null, repair: v.repair ?? null });
    setSelected(null);
  };

  return (
    <>
      <FilterBar {...fbProps} />
      <DataTable<BreakdownRecord>
        resource="breakdown_records"
        ariaLabel="고장 기록"
        filters={fb.filters}
        isFiltered={fb.active}
        onClearFilters={fb.clear}
        syncWithLocation={false}
        sorters={[{ field: "occurred_at", order: "desc" }]}
        onRowClick={(b) => setSelected(b.id)}
        columns={[
          { key: "occurred_at", title: "발생", kind: "datetime" },
          { key: "equipment_id", title: "설비", render: (b) => <span className="ws-cell-name">{eqNo(b.equipment_id)}</span> },
          { key: "symptom", title: "증상", flex: true },
          { key: "downtime_min", title: "정지", render: (b) => (b.downtime_min != null ? formatMinutes(b.downtime_min) : "진행 중") },
          { key: "cause", title: "원인" },
          { key: "status", title: "상태", kind: "status", statusDomain: "breakdown_records.status" },
          { key: "act", title: "", render: (b) => (b.status !== "repaired" && can("breakdown_records", "approve").can ? <Button size="small" icon={<ToolOutlined />} onClick={(e) => { e.stopPropagation(); setSelected(b.id); }}>수리 완료</Button> : null) },
        ]}
        mobileRow={(b) => ({ title: `${eqNo(b.equipment_id)} · ${b.symptom}`, subtitle: `${formatDateTime(b.occurred_at)}${b.downtime_min != null ? ` · 정지 ${formatMinutes(b.downtime_min)}` : ""}`, trailing: <StatusTag {...statusOf("breakdown_records.status", b.status)} /> })}
        empty={{ kind: "empty", title: "고장 기록이 없어요", description: "현장 등록에서 설비 이상을 남기면 고장 기록이 생겨요." }}
      />
      <DetailDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={cur ? `${eqNo(cur.equipment_id)} 고장` : "고장"}
        extra={cur ? <StatusTag {...statusOf("breakdown_records.status", cur.status)} /> : undefined}
        closeLabel="취소"
        footer={cur && cur.status !== "repaired" && canRepair.can ? <Button type="primary" icon={<ToolOutlined />} loading={repair.isPending} onClick={() => void save()}>수리 완료</Button> : undefined}
      >
        {cur ? (
          <div className="in-stack">
            <Kv rows={[
              ["발생", formatDateTime(cur.occurred_at)], ["증상", cur.symptom], ["정지", cur.downtime_min != null ? formatMinutes(cur.downtime_min) : "아직 수리 전"],
              ["원인", cur.cause], ["수리", cur.repair], ["수리한 사람", cur.repaired_by ? <PersonChip memberId={cur.repaired_by} size="sm" /> : null],
              ["연결 업무", cur.linked_task_id ? <Link className="in-link" to={`/work/tasks/${cur.linked_task_id}`}>업무 보기</Link> : null],
            ]} />
            {cur.status !== "repaired" && (canRepair.can ? (
              <>
                <Divider />
                <Form form={form} layout="vertical" initialValues={{ cause: cur.cause ?? "", repair: cur.repair ?? "" }}>
                  <Form.Item name="cause" label="원인"><Input maxLength={120} /></Form.Item>
                  <Form.Item name="repair" label="수리 내용"><Input maxLength={120} /></Form.Item>
                </Form>
                <p className="in-caption">수리 완료로 바꾸면 정지 시간을 계산하고, 현장 등록한 사람에게 알려요.</p>
              </>
            ) : <p className="in-note">수리 완료는 검토자 이상이 표시해요.</p>)}
          </div>
        ) : rows.isLoading ? null : <EmptyState kind="not_found" compact />}
      </DetailDrawer>
    </>
  );
}
