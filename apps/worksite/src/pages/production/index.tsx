// 생산 `/ops/production` · I-09 · 깊이 B · 모듈 mfg-production · TR 전용 · 소유: industry 그룹
// 탭: 계획(이번 주 품목 × 요일) | 작업지시 | 실적. 실적은 공정·설비 단위로만 집계하고, 작업자 열·개인 실적 순위는 두지 않습니다.
import { useEffect, useMemo } from "react";
import { Button, Form, Input, InputNumber, Select } from "antd";
import { CheckOutlined, PlusOutlined } from "@ant-design/icons";
import { DataTable, DetailDrawer, EmptyState, FilterBar, PageHeader, SectionCard, StatusTag, useFilterBarState, type FilterBarProps } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { usePageReady } from "@/app/pageReady";
import { useCreate, type CrudFilter } from "@/lib/refine";
import { useSelectedParam, useUrlParam } from "@/lib/url";
import { formatDate, formatNumber } from "@/lib/format";
import { labelOf, optionsOf, statusOf } from "@/lib/status";
import type { Inspection, ProductionResult, WorkOrder } from "@/types/entities";
import { periodStart, shiftAt, useMfgLookups, useRows, weekDays } from "../ops-home/kit/data";
import { SHIFT_LABEL } from "../ops-home/kit/labels";
import "../ops-home/kit/industry.css";

const DOW = ["월", "화", "수", "목", "금", "토"];
const DEFECTS = ["치수", "찍힘", "코 빠짐", "주름", "감김", "중량", "기타"];
/** 계획 표의 0은 칸과 같은 '—'(합계 줄에서만 0이 보이던 문제) */
const dash = (v: number) => (v ? formatNumber(v) : "—");

export default function Page() {
  const { can } = useWorksite();
  const [tab] = useUrlParam("tab", "plan");
  const [, setSelected] = useSelectedParam();
  const canInput = can("production_results", "create").can;
  return (
    <>
      <PageHeader
        title="생산"
        description="이번 주 계획과 작업지시, 공정·설비별 실적을 봐요."
        tabs={[{ key: "plan", label: "계획", to: "?tab=plan" }, { key: "orders", label: "작업지시", to: "?tab=orders" }, { key: "results", label: "실적", to: "?tab=results" }]}
        actions={tab === "results" && canInput ? <Button type="primary" icon={<PlusOutlined />} onClick={() => setSelected("new")}>실적 입력</Button> : undefined}
      />
      {tab === "orders" ? <Orders /> : tab === "results" ? <Results /> : <Plan />}
    </>
  );
}

function Plan() {
  const { today } = useWorksite();
  const days = weekDays(today);
  const lk = useMfgLookups();
  const wos = useRows<WorkOrder>("work_orders", { filters: [{ field: "planned_date", operator: "gte", value: days[0]! }, { field: "planned_date", operator: "lte", value: days[5]! }] });
  usePageReady(!wos.isLoading && !lk.isLoading);
  const groups = useMemo(() => {
    const knit = lk.step.size ? [...lk.step.values()].find((s) => s.name === "편조")?.id : undefined;
    const build = (list: WorkOrder[]) => {
      const byItem = new Map<string, number[]>();
      for (const w of list) {
        const row = byItem.get(w.item_id) ?? days.map(() => 0);
        const i = days.indexOf(w.planned_date);
        if (i >= 0) row[i] = (row[i] ?? 0) + w.planned_qty;
        byItem.set(w.item_id, row);
      }
      return [...byItem.entries()].map(([item, vals]) => ({ item, vals, total: vals.reduce((t, v) => t + v, 0) })).sort((a, b) => (lk.item.get(a.item)?.item_no ?? "").localeCompare(lk.item.get(b.item)?.item_no ?? ""));
    };
    return { knit: build(wos.rows.filter((w) => w.process_step_id === knit)), form: build(wos.rows.filter((w) => w.process_step_id !== knit)) };
  }, [wos.rows, lk.step, lk.item, days]);

  const table = (rows: typeof groups.knit, unit: string, label: string) => {
    const totals = days.map((_, i) => rows.reduce((t, r) => t + (r.vals[i] ?? 0), 0));
    return (
      // 좁은 화면에서 옆으로 밀어 볼 수 있게 키보드 초점을 받는 영역(axe scrollable-region-focusable)
      <div className="in-scroll" tabIndex={0} role="region" aria-label={`${label} 이번 주 계획(${unit}), 옆으로 밀어 보기`}>
        <table className="in-plan" aria-label={`${label} 이번 주 계획(${unit})`}>
          {/* 두 표(편조·가공)의 요일 칸이 위아래로 맞게 같은 칸 너비 */}
          <colgroup><col className="in-plan__item" />{days.map((d) => <col key={d} className="in-plan__day" />)}<col className="in-plan__sum" /></colgroup>
          <thead>
            <tr><th scope="col">품목</th>{days.map((d, i) => <th key={d} scope="col">{DOW[i]} {formatDate(d, false).replace("월 ", "/").replace("일", "")}</th>)}<th scope="col">합계</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.item}>
                <td title={`${lk.item.get(r.item)?.item_no ?? ""} ${lk.item.get(r.item)?.name ?? ""}`}><span className="ws-cell-name">{lk.item.get(r.item)?.item_no ?? "—"}</span> <span className="in-caption">{lk.item.get(r.item)?.name}</span></td>
                {r.vals.map((v, i) => <td key={i}>{dash(v)}</td>)}
                <td className="in-strong">{dash(r.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td>합계({unit})</td>{totals.map((t, i) => <td key={i}>{dash(t)}</td>)}<td>{dash(totals.reduce((a, b) => a + b, 0))}</td></tr>
          </tfoot>
        </table>
      </div>
    );
  };

  if (!wos.isLoading && !wos.rows.length) return <EmptyState kind="empty" title="이번 주 계획이 없어요" description="작업지시를 만들면 품목 × 요일 계획이 채워져요." />;
  return (
    <div className="in-stack">
      <SectionCard title="편조(m)" demo caption="단위가 달라 편조와 가공을 나눠 합쳤어요.">{table(groups.knit, "m", "편조")}</SectionCard>
      <SectionCard title="가공(개)" demo>{table(groups.form, "개", "가공")}</SectionCard>
    </div>
  );
}

function Orders() {
  const { today } = useWorksite();
  const lk = useMfgLookups();
  const fbProps: FilterBarProps = {
    chips: [
      { param: "range", options: [{ value: "today", label: "오늘" }, { value: "all", label: "전체" }], allLabel: "이번 주", ariaLabel: "기간" },
      { param: "status", field: "status", options: optionsOf("work_orders.status"), multiple: true, ariaLabel: "상태" },
    ],
    selects: [{ param: "step", label: "공정", field: "process_step_id", options: lk.steps.filter((s) => s.equipment_kind).map((s) => ({ value: s.id, label: s.name })) }],
  };
  const fb = useFilterBarState(fbProps);
  const range = fb.values.range ?? "week";
  const start = range === "today" ? today : periodStart(today, "week");
  const filters = useMemo<CrudFilter[]>(() => {
    if (range === "all") return fb.filters;
    const f: CrudFilter[] = [...fb.filters, { field: "planned_date", operator: "gte", value: start }];
    if (range === "today") f.push({ field: "planned_date", operator: "lte", value: today });
    return f;
  }, [fb.filters, range, start, today]);
  const ins = useRows<Inspection>("inspections", { filters: range === "all" ? [{ field: "work_order_id", operator: "nnull", value: true }] : [{ field: "inspected_on", operator: "gte", value: start }] });
  const insByWo = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const i of ins.rows) if (i.work_order_id) { const s = m.get(i.work_order_id) ?? new Set<string>(); s.add(i.kind); m.set(i.work_order_id, s); }
    return m;
  }, [ins.rows]);
  const fml = (w: WorkOrder) => {
    if (w.status === "planned" || w.status === "released") return <span className="in-caption">작업 전</span>;
    const knit = lk.step.get(w.process_step_id)?.name === "편조";
    const kinds: ["first" | "mid" | "last", string][] = knit ? [["first", "초"], ["last", "종"]] : [["first", "초"], ["mid", "중"], ["last", "종"]];
    const got = insByWo.get(w.id) ?? new Set();
    return (
      <span className="in-row" style={{ gap: 4 }}>
        {kinds.map(([k, l]) => got.has(k)
          ? <span key={k} className="ws-tag"><CheckOutlined aria-hidden />{l}</span>
          : <span key={k} className="ws-tag" style={{ color: "var(--ws-muted)" }}>{l} 빠짐</span>)}
      </span>
    );
  };
  return (
    <>
      <FilterBar {...fbProps} />
      <DataTable<WorkOrder>
        resource="work_orders"
        ariaLabel="작업지시"
        filters={filters}
        isFiltered={fb.active && !(Object.keys(fb.values).length === 1 && fb.values.range)}
        onClearFilters={fb.clear}
        syncWithLocation={false}
        sorters={[{ field: "planned_date", order: "desc" }, { field: "lot_no", order: "asc" }]}
        columns={[
          { key: "lot_no", title: "번호(LOT)", kind: "name" },
          { key: "item_id", title: "품목", render: (w) => lk.item.get(w.item_id)?.name ?? "—" },
          { key: "process_step_id", title: "공정", render: (w) => lk.step.get(w.process_step_id)?.name ?? "—" },
          { key: "equipment_id", title: "설비", render: (w) => (w.equipment_id ? lk.eq.get(w.equipment_id)?.equipment_no ?? "—" : "—") },
          { key: "planned_qty", title: "계획 수량", render: (w) => <span className="in-num">{formatNumber(w.planned_qty)} {lk.item.get(w.item_id)?.unit ?? ""}</span> },
          { key: "planned_date", title: "계획일", render: (w) => `${formatDate(w.planned_date, false)} ${SHIFT_LABEL[w.shift] ?? ""}` },
          { key: "material_lot_ids", title: "원자재 LOT", render: (w) => w.material_lot_ids.join(", ") || "—" },
          { key: "fml", title: "초·중·종", render: fml },
          { key: "status", title: "상태", kind: "status", statusDomain: "work_orders.status" },
        ]}
        mobileRow={(w) => ({
          title: `${lk.item.get(w.item_id)?.name ?? "품목"} · ${formatNumber(w.planned_qty)}${lk.item.get(w.item_id)?.unit ?? ""}`,
          subtitle: `${formatDate(w.planned_date, false)} ${SHIFT_LABEL[w.shift]} · ${lk.step.get(w.process_step_id)?.name ?? ""} · ${w.equipment_id ? lk.eq.get(w.equipment_id)?.equipment_no ?? "" : ""}`,
          trailing: <StatusTag {...statusOf("work_orders.status", w.status)} />,
        })}
        empty={{ kind: "empty", title: "작업지시가 없어요", description: "기간을 바꾸거나 계획을 확인해 보세요." }}
      />
    </>
  );
}

interface ResultValues { woId: string; good: number; defect?: number; defectType?: string; lot?: string; downtime?: number }

function Results() {
  const { today, clock } = useWorksite();
  const lk = useMfgLookups();
  const [selected, setSelected] = useSelectedParam();
  const fbProps: FilterBarProps = {
    chips: [{ param: "range", options: [{ value: "today", label: "오늘" }, { value: "month", label: "이번 달" }], allLabel: "이번 주", ariaLabel: "기간" }],
    selects: [
      { param: "step", label: "공정", field: "process_step_id", options: lk.steps.filter((s) => s.equipment_kind).map((s) => ({ value: s.id, label: s.name })) },
      { param: "eq", label: "설비", field: "equipment_id", options: lk.equipment.map((e) => ({ value: e.id, label: e.equipment_no })) },
    ],
  };
  const fb = useFilterBarState(fbProps);
  const range = fb.values.range ?? "week";
  const filters = useMemo<CrudFilter[]>(() => [...fb.filters, { field: "date", operator: "gte", value: periodStart(today, range) }], [fb.filters, range, today]);
  const wos = useRows<WorkOrder>("work_orders", { filters: [{ field: "planned_date", operator: "gte", value: periodStart(today, "today") }, { field: "planned_date", operator: "lte", value: today }], enabled: selected === "new" });
  const { mutateAsync: create, mutation } = useCreate<ProductionResult>();
  const [form] = Form.useForm<ResultValues>();
  const woId = Form.useWatch("woId", form);
  const chosen = wos.rows.find((w) => w.id === woId);
  useEffect(() => { if (selected === "new") { form.resetFields(); form.setFieldsValue({ defect: 0, downtime: 0 }); } }, [selected, form]);
  useEffect(() => { if (chosen) form.setFieldValue("lot", chosen.lot_no ?? undefined); }, [chosen, form]);

  const save = async () => {
    const v = await form.validateFields();
    const w = wos.rows.find((x) => x.id === v.woId)!;
    const now = clock.now();
    await create({
      resource: "production_results",
      values: {
        work_order_id: w.id, date: today, shift: shiftAt(now).shift, process_step_id: w.process_step_id, equipment_id: w.equipment_id, item_id: w.item_id,
        good_qty: v.good, defect_qty: v.defect ?? 0, lot_no: v.lot?.trim() || w.lot_no, worker_ids: [], note: null, start_at: null, end_at: now,
        downtime_min: v.downtime ?? 0, defect_breakdown: v.defect && v.defectType ? { [v.defectType]: v.defect } : null,
      },
      successNotification: () => ({ type: "success", message: "실적을 남겼어요" }),
    });
    setSelected(null);
  };

  return (
    <>
      <p className="in-caption in-mb">작업자 기록은 공정·설비 단위로만 집계해요. 개인별 실적은 보여 주지 않아요.</p>
      <FilterBar {...fbProps} />
      <DataTable<ProductionResult>
        resource="production_results"
        ariaLabel="생산 실적"
        filters={filters}
        isFiltered={fb.active && !(Object.keys(fb.values).length === 1 && fb.values.range)}
        onClearFilters={fb.clear}
        syncWithLocation={false}
        sorters={[{ field: "date", order: "desc" }, { field: "end_at", order: "desc" }]}
        columns={[
          { key: "date", title: "일자", kind: "date" },
          { key: "shift", title: "근무조", render: (r) => SHIFT_LABEL[r.shift] ?? "—" },
          { key: "process_step_id", title: "공정", render: (r) => lk.step.get(r.process_step_id)?.name ?? "—" },
          { key: "equipment_id", title: "설비", render: (r) => (r.equipment_id ? lk.eq.get(r.equipment_id)?.equipment_no ?? "—" : "—") },
          { key: "item_id", title: "품목", flex: true, render: (r) => <span className="ws-ellipsis">{lk.item.get(r.item_id)?.name ?? "—"}</span> },
          { key: "good_qty", title: "양품", kind: "number" },
          { key: "defect_qty", title: "불량", kind: "number" },
          { key: "lot_no", title: "LOT" },
          { key: "downtime_min", title: "정지(분)", kind: "number" },
        ]}
        mobileRow={(r) => ({
          title: `${lk.item.get(r.item_id)?.name ?? "품목"} · 양품 ${formatNumber(r.good_qty)}`,
          subtitle: `${formatDate(r.date, false)} ${SHIFT_LABEL[r.shift]} · ${lk.step.get(r.process_step_id)?.name ?? ""} · ${r.equipment_id ? lk.eq.get(r.equipment_id)?.equipment_no ?? "" : ""}`,
          trailing: r.defect_qty ? <span className="ws-tag">불량 {formatNumber(r.defect_qty)}</span> : undefined,
        })}
        empty={{ kind: "empty", title: "실적이 없어요", description: "작업을 마치면 [실적 입력]으로 남겨 주세요." }}
      />
      <DetailDrawer open={selected === "new"} onClose={() => setSelected(null)} title="실적 입력" closeLabel="취소" footer={<Button type="primary" size="large" loading={mutation.isPending} onClick={() => void save()}>저장하기</Button>}>
        <Form form={form} layout="vertical" requiredMark="optional" size="large">
          <Form.Item name="woId" label="작업지시" rules={[{ required: true, message: "작업지시를 골라 주세요" }]}>
            <Select showSearch optionFilterProp="label" placeholder={wos.rows.length ? "오늘 작업지시" : "오늘 작업지시가 없어요"}
              options={wos.rows.filter((w) => w.status !== "done").map((w) => ({ value: w.id, label: `${w.lot_no ?? ""} · ${lk.item.get(w.item_id)?.name ?? ""} · ${labelOf("work_orders.status", w.status)}` }))} />
          </Form.Item>
          <Form.Item name="good" label={`양품${chosen ? `(${lk.item.get(chosen.item_id)?.unit ?? ""})` : ""}`} rules={[{ required: true, message: "양품 수를 적어 주세요" }]}>
            <InputNumber<number> min={0} style={{ width: "100%" }} inputMode="numeric" />
          </Form.Item>
          <Form.Item name="defect" label="불량"><InputNumber<number> min={0} style={{ width: "100%" }} inputMode="numeric" /></Form.Item>
          <Form.Item name="defectType" label="불량 유형"><Select allowClear options={DEFECTS.map((d) => ({ value: d, label: d }))} /></Form.Item>
          <Form.Item name="lot" label="LOT"><Input maxLength={40} /></Form.Item>
          <Form.Item name="downtime" label="정지 시간(분)"><InputNumber<number> min={0} max={720} style={{ width: "100%" }} inputMode="numeric" /></Form.Item>
          <p className="in-caption">입력한 사람 이름은 실적에 남기지 않아요.</p>
        </Form>
      </DetailDrawer>
    </>
  );
}
