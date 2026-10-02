// 자재·재고 `/ops/materials` · I-15 · 깊이 B · 모듈 mfg-materials · TR 전용 · 소유: industry 그룹
// 탭: 재고(재질 라벨 + 재고일수) | 입고(성적서 → 'AI 초안' 읽은 값 → 사람이 확인 후 저장) | 발주 | 원재료 가격(view_prices 권한자만, 없으면 탭을 숨김)
// 재질은 늘 코드 글자와 색 견본을 같이 씁니다(색만으로 구별하지 않음). 재고일수 = 가용 재고 ÷ 최근 28일 사용량 일평균(홈 위젯과 같은 식).
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Button, DatePicker, Form, Input, InputNumber, Select, Switch } from "antd";
import { FileSearchOutlined, PlusOutlined, SendOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import {
  AiTag, Banner, ChartFrame, DataTable, DdayBadge, DetailDrawer, Divider, EmptyState, FilterBar, LineSpark, ListRows, PageHeader, PriceGate, SectionCard, StatusTag,
  useFilterBarState, type FilterBarProps,
} from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { usePageReady } from "@/app/pageReady";
import { useCreate, useUpdate } from "@/lib/refine";
import { useSelectedParam, useUrlParam } from "@/lib/url";
import { addDays, kstIso } from "@/lib/clock";
import { formatDate, formatMonth, formatNumber, formatQty, formatWon } from "@/lib/format";
import { optionsOf, statusOf } from "@/lib/status";
import type { Inspection, MaterialReceipt, PriceIndex, PurchaseOrder, SafetyStock, StockLot, StockMovement } from "@/types/entities";
import { asRow, useIndex, useMfgLookups, useModuleRows, useRows } from "../ops-home/kit/data";
import { Kv, Material } from "../ops-home/kit/ui";
import "../ops-home/kit/industry.css";

export default function Page() {
  const { hasBundle } = useWorksite();
  const [tab] = useUrlParam("tab", "stock");
  const prices = hasBundle("view_prices");
  const tabs = [
    { key: "stock", label: "재고", to: "?tab=stock" },
    { key: "receipts", label: "입고", to: "?tab=receipts" },
    { key: "po", label: "발주", to: "?tab=po" },
    ...(prices ? [{ key: "prices", label: "원재료 가격", to: "?tab=prices" }] : []),
  ];
  return (
    <>
      <PageHeader title="자재·재고" description="재질 라벨이 붙은 재고 LOT와 입고·발주를 봐요. 수량·가격은 모두 예시예요." tabs={tabs} />
      {tab === "receipts" ? <Receipts /> : tab === "po" ? <Orders /> : tab === "prices" && prices ? <Prices /> : <Stock />}
    </>
  );
}

/** 품목별 재고일수(가용 재고 ÷ 최근 28일 사용 일평균) */
function useStockDays() {
  const { today } = useWorksite();
  const lots = useRows<StockLot>("stock_lots");
  const moves = useRows<StockMovement>("stock_movements", { filters: [{ field: "moved_at", operator: "gte", value: kstIso(addDays(today, -28), "00:00") }] });
  const safety = useRows<SafetyStock>("safety_stocks");
  const days = useMemo(() => {
    const lotItem = new Map(lots.rows.map((l) => [l.id, l.item_id]));
    const used = new Map<string, number>();
    for (const m of moves.rows) if (m.kind === "consume" || m.kind === "out") { const it = lotItem.get(m.lot_id); if (it) used.set(it, (used.get(it) ?? 0) + Math.abs(m.qty)); }
    const onHand = new Map<string, number>();
    for (const l of lots.rows) if (l.status === "available") onHand.set(l.item_id, (onHand.get(l.item_id) ?? 0) + l.qty_on_hand);
    const out = new Map<string, { days: number; min: number | null; onHand: number }>();
    for (const [item, u] of used) {
      const daily = u / 28;
      if (daily <= 0) continue;
      const s = safety.rows.find((x) => x.item_id === item);
      out.set(item, { days: Math.floor((onHand.get(item) ?? 0) / daily), min: s?.min_days ?? null, onHand: onHand.get(item) ?? 0 });
    }
    return out;
  }, [lots.rows, moves.rows, safety.rows]);
  return { days, lots: lots.rows, isLoading: lots.isLoading || moves.isLoading };
}

function Stock() {
  const lk = useMfgLookups();
  const sd = useStockDays();
  const pos = useRows<PurchaseOrder>("purchase_orders", { filters: [{ field: "status", operator: "ne", value: "received" }] });
  usePageReady(!sd.isLoading);
  const fbProps: FilterBarProps = {
    search: { placeholder: "LOT 번호 검색", fields: ["lot_no"] },
    chips: [{ param: "status", field: "status", options: optionsOf("stock_lots.status"), multiple: true, ariaLabel: "상태" }],
    selects: [{ param: "item", label: "품목", field: "item_id", options: lk.items.filter((i) => i.kind !== "part").map((i) => ({ value: i.id, label: `${i.item_no} · ${i.name}` })) }],
  };
  const fb = useFilterBarState(fbProps);
  const short = [...sd.days.entries()].filter(([, v]) => v.min != null && v.days < v.min);
  const unit = (id: string) => lk.item.get(id)?.unit ?? "";
  const daysCell = (l: StockLot) => {
    const d = sd.days.get(l.item_id);
    if (!d || l.status !== "available") return "—";
    const low = d.min != null && d.days < d.min;
    return <span className="in-row"><span className="in-num">{d.days}일</span>{low && <StatusTag tone="warning" label={`안전재고(${d.min}일) 미달`} />}</span>;
  };
  return (
    <>
      {short.map(([item, v]) => {
        const it = lk.item.get(item);
        const po = pos.rows.find((p) => p.lines.some((x) => x.item_id === item));
        return (
          <div key={item} className="in-mb">
            <Banner tone="warning" title={`${it?.name ?? "자재"} 재고가 ${v.days}일치예요`}>
              안전재고 {v.min}일보다 적어요. {po ? <>{po.status === "draft" ? "발주 초안" : "발주"}(<Link className="in-link" to={`?tab=po&selected=${po.id}`}>{po.po_no ?? "보기"}</Link>)을 확인해 주세요.</> : "발주를 만들어 주세요."}
            </Banner>
          </div>
        );
      })}
      <FilterBar {...fbProps} />
      <DataTable<StockLot>
        resource="stock_lots"
        ariaLabel="재고 LOT"
        filters={fb.active ? fb.filters : [{ field: "status", operator: "ne", value: "consumed" }]}
        isFiltered={fb.active}
        onClearFilters={fb.clear}
        syncWithLocation={false}
        sorters={[{ field: "lot_no", order: "asc" }]}
        columns={[
          { key: "grade", title: "재질", width: 96, render: (l) => <Material code={lk.item.get(l.item_id)?.material_grade} /> },
          { key: "item_id", title: "품목", flex: true, render: (l) => <span className="ws-cell-name">{lk.item.get(l.item_id)?.name ?? "—"}</span> },
          { key: "lot_no", title: "LOT", width: 190, render: (l) => <Link className="in-link ws-nowrap" to={`/ops/trace?lot=${encodeURIComponent(l.lot_no)}`}>{l.lot_no}</Link> },
          { key: "qty_on_hand", title: "수량", align: "right", width: 112, render: (l) => <span className="in-num ws-nowrap">{formatQty(l.qty_on_hand, unit(l.item_id))}</span> },
          { key: "location", title: "위치", width: 136 },
          { key: "days", title: "재고일수", width: 136, render: daysCell },
          { key: "status", title: "상태", kind: "status", statusDomain: "stock_lots.status" },
        ]}
        mobileRow={(l) => ({ title: `${lk.item.get(l.item_id)?.name ?? "자재"} · ${formatQty(l.qty_on_hand, unit(l.item_id))}`, subtitle: `${l.lot_no} · ${l.location ?? ""}`, trailing: <StatusTag {...statusOf("stock_lots.status", l.status)} /> })}
        empty={{ kind: "empty", title: "재고 LOT가 없어요", description: "입고를 등록하면 원자재 LOT가 생겨요." }}
      />
    </>
  );
}

interface RcvValues { partner_id: string; item_id: string; supplier_lot_no: string; heat_no?: string; qty: number; received_on?: Dayjs | null; grade_ok?: boolean; wire?: number | null }

function Receipts() {
  const { today, can } = useWorksite();
  const lk = useMfgLookups();
  const [selected, setSelected] = useSelectedParam();
  const ins = useModuleRows<Inspection>("mfg-quality", "inspections", { filters: [{ field: "kind", operator: "eq", value: "incoming" }] });
  const insById = useIndex(ins.rows);
  const canCreate = can("material_receipts", "create").can;
  const { mutateAsync: create, mutation } = useCreate();
  const [form] = Form.useForm<RcvValues>();
  const [cert, setCert] = useState<string | null>(null);
  const suppliers = lk.partners.filter((p) => p.kind === "supplier");
  const raws = lk.items.filter((i) => i.kind === "raw");

  useEffect(() => { if (selected === "new") { form.resetFields(); setCert(null); form.setFieldsValue({ received_on: dayjs(today), grade_ok: false }); } }, [selected, form, today]);

  // 성적서 파일을 고르면 '읽은 값(예시)'을 미리 채움(실제 AI 호출 없음)
  const onCert = (name: string) => {
    setCert(name);
    const rm = raws.find((r) => name.includes(r.material_grade)) ?? raws[0];
    form.setFieldsValue({
      partner_id: rm?.partner_id ?? suppliers[0]?.id, item_id: rm?.id, supplier_lot_no: `WS-${today.slice(2).replace(/-/g, "")}-07`,
      heat_no: `H${today.slice(2).replace(/-/g, "")}31`, qty: 300, wire: rm?.wire_dia_mm ?? null,
    });
  };

  const save = async () => {
    const v = await form.validateFields();
    const it = lk.item.get(v.item_id);
    const date = v.received_on ? v.received_on.format("YYYY-MM-DD") : today;
    const code = { Cu: "CU", TCu: "TCU", Brass: "BS", Al: "AL" }[it?.material_grade ?? ""] ?? it?.material_grade ?? "RM";
    const lot = `R-${code}-${date.slice(2).replace(/-/g, "")}-${String(Math.floor(Math.random() * 90) + 10)}`;
    await create({ resource: "material_receipts", values: { partner_id: v.partner_id, item_id: v.item_id, supplier_lot_no: v.supplier_lot_no, qty: v.qty, received_on: date, cert_ref: cert, inspection_id: null, heat_no: v.heat_no ?? null, cert_type: cert ? "검사증명서 3.1(예시)" : null, material_grade_verified: !!v.grade_ok, wire_dia_measured: v.wire ?? null }, successNotification: false });
    await create({ resource: "stock_lots", values: { item_id: v.item_id, lot_no: lot, qty_on_hand: v.qty, location: "자재 창고 입고 대기", status: "hold" }, successNotification: () => ({ type: "success", message: `입고를 저장했어요. 원자재 LOT ${lot}가 수입검사 대기로 생겼어요.` }) });
    setSelected(null);
  };

  return (
    <>
      <FilterBar
        selects={[{ param: "partner", label: "공급사", field: "partner_id", options: suppliers.map((p) => ({ value: p.id, label: p.name })) }]}
        right={canCreate ? <Button type="primary" icon={<PlusOutlined />} onClick={() => setSelected("new")}>입고 등록</Button> : undefined}
      />
      <ReceiptTable insById={insById} />
      <DetailDrawer open={selected === "new"} onClose={() => setSelected(null)} title="입고 등록" closeLabel="취소" footer={<Button type="primary" loading={mutation.isPending} onClick={() => void save()}>확인하고 저장하기</Button>}>
        <div className="in-stack">
          <div className="in-field">
            <span className="in-field__label">성적서 사진</span>
            <label className="in-filebtn">
              <FileSearchOutlined aria-hidden /> {cert ? "다른 성적서 고르기" : "성적서 사진 고르기"}
              <input className="in-file" type="file" accept="image/*,application/pdf" aria-label="성적서 사진 고르기" onChange={(e) => { const f = e.target.files?.[0]; if (f) onCert(f.name); }} />
            </label>
            {cert && <span className="in-caption">{cert} · 파일 이름만 남겨요.</span>}
          </div>
          {cert && <Banner tone="info" title="읽은 값(예시)">아래 칸은 AI 초안이에요. 성적서와 하나씩 대조하고 저장해 주세요. <AiTag kind="draft" /></Banner>}
          <Form form={form} layout="vertical" requiredMark="optional">
            <Form.Item name="partner_id" label="공급사" rules={[{ required: true, message: "공급사를 골라 주세요" }]}><Select options={suppliers.map((p) => ({ value: p.id, label: p.name }))} /></Form.Item>
            <Form.Item name="item_id" label="품목(재질·선경)" rules={[{ required: true, message: "품목을 골라 주세요" }]}><Select showSearch optionFilterProp="label" options={raws.map((i) => ({ value: i.id, label: `${i.item_no} · ${i.name}` }))} /></Form.Item>
            <Form.Item name="supplier_lot_no" label="공급사 LOT" rules={[{ required: true, whitespace: true, message: "공급사 LOT를 적어 주세요" }]}><Input maxLength={40} /></Form.Item>
            <Form.Item name="heat_no" label="히트번호"><Input maxLength={40} /></Form.Item>
            <Form.Item name="qty" label="수량(kg)" rules={[{ required: true, message: "수량을 적어 주세요" }]}><InputNumber<number> min={1} style={{ width: "100%" }} inputMode="numeric" /></Form.Item>
            <Form.Item name="wire" label="선경 실측(mm)"><InputNumber<number> min={0} step={0.001} style={{ width: "100%" }} inputMode="decimal" /></Form.Item>
            <Form.Item name="received_on" label="입고일"><DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" /></Form.Item>
            <Form.Item name="grade_ok" label="재질 확인(성적서와 라벨 일치)" valuePropName="checked"><Switch /></Form.Item>
          </Form>
        </div>
      </DetailDrawer>
    </>
  );
}

function ReceiptTable({ insById }: { insById: Map<string, Inspection> }) {
  const lk = useMfgLookups();
  const fb = useFilterBarState({ selects: [{ param: "partner", label: "공급사", field: "partner_id", options: [] }] });
  return (
    <DataTable<MaterialReceipt>
      resource="material_receipts"
      ariaLabel="자재 입고"
      filters={fb.filters}
      isFiltered={fb.active}
      onClearFilters={fb.clear}
      syncWithLocation={false}
      sorters={[{ field: "received_on", order: "desc" }]}
      columns={[
        { key: "received_on", title: "입고일", kind: "date" },
        { key: "partner_id", title: "공급사", flex: true, render: (r) => <span className="ws-ellipsis">{lk.partner.get(r.partner_id)?.name ?? "—"}</span> },
        { key: "item_id", title: "품목", width: 200, render: (r) => <span className="in-row" style={{ flexWrap: "nowrap" }}><Material code={lk.item.get(r.item_id)?.material_grade} /><span className="ws-cell-name ws-nowrap">{lk.item.get(r.item_id)?.item_no ?? "—"}</span></span> },
        { key: "supplier_lot_no", title: "공급사 LOT", width: 150 },
        { key: "heat_no", title: "히트번호", width: 120 },
        { key: "cert_ref", title: "성적서", low: true, render: (r) => r.cert_ref ?? "—" },
        { key: "inspection_id", title: "수입검사", width: 120, render: (r) => { const i = r.inspection_id ? insById.get(r.inspection_id) : undefined; return i ? <StatusTag {...statusOf("inspections.result", i.result)} /> : <StatusTag tone="warning" label="검사 전" />; } },
        { key: "qty", title: "수량", align: "right", width: 104, render: (r) => <span className="in-num">{formatQty(r.qty, "kg")}</span> },
      ]}
      mobileRow={(r) => ({ title: `${lk.item.get(r.item_id)?.name ?? "자재"} · ${formatNumber(r.qty)}kg`, subtitle: `${formatDate(r.received_on, false)} · ${lk.partner.get(r.partner_id)?.name ?? ""}`, trailing: r.inspection_id ? <StatusTag tone="good" label="검사 완료" /> : <StatusTag tone="warning" label="검사 전" /> })}
      empty={{ kind: "empty", title: "입고 기록이 없어요", description: "원자재가 들어오면 성적서와 함께 등록해 주세요." }}
    />
  );
}

function Orders() {
  const { can, today, hasBundle } = useWorksite();
  const canSeePrice = hasBundle("view_prices");
  const lk = useMfgLookups();
  const [selected, setSelected] = useSelectedParam();
  const pos = useRows<PurchaseOrder>("purchase_orders", { enabled: !!selected });
  const cur = selected ? pos.rows.find((p) => p.id === selected) ?? null : null;
  const canEdit = cur ? can("purchase_orders", "edit", asRow(cur)).can : false;
  const { mutateAsync: update, mutation } = useUpdate<PurchaseOrder>();
  const fbProps: FilterBarProps = { chips: [{ param: "status", field: "status", options: optionsOf("purchase_orders.status"), multiple: true, ariaLabel: "상태" }] };
  const fb = useFilterBarState(fbProps);
  const linesText = (p: PurchaseOrder) => {
    const first = p.lines[0];
    if (!first) return "—";
    const it = lk.item.get(first.item_id);
    return `${it?.item_no ?? "품목"} ${formatQty(first.qty, it?.unit ?? "")}${p.lines.length > 1 ? ` 외 ${p.lines.length - 1}줄` : ""}`;
  };
  return (
    <>
      <FilterBar {...fbProps} />
      <DataTable<PurchaseOrder>
        resource="purchase_orders"
        ariaLabel="발주"
        filters={fb.filters}
        isFiltered={fb.active}
        onClearFilters={fb.clear}
        syncWithLocation={false}
        sorters={[{ field: "ordered_on", order: "desc" }]}
        onRowClick={(p) => setSelected(p.id)}
        columns={[
          { key: "po_no", title: "발주 번호", kind: "name" },
          { key: "partner_id", title: "공급사", width: 200, render: (p) => <span className="ws-ellipsis">{lk.partner.get(p.partner_id)?.name ?? "—"}</span> },
          { key: "lines", title: "품목 줄", width: 220, render: linesText },
          { key: "due_on", title: "납기", width: 150, render: (p) => (p.status === "received" ? <span className="ws-date">{formatDate(p.due_on)}</span> : <DdayBadge date={p.due_on} noun="입고" />) },
          { key: "status", title: "상태", kind: "status", statusDomain: "purchase_orders.status" },
          // 단가는 볼 권한이 있을 때만 칸을 둬요
          ...(canSeePrice ? [{ key: "price", title: "단가", align: "right" as const, width: 112, render: (p: PurchaseOrder) => <PriceGate>{formatWon(p.lines[0]?.unit_price ?? null)}</PriceGate> }] : []),
        ]}
        mobileRow={(p) => ({ title: `${p.po_no ?? "발주"} · ${lk.partner.get(p.partner_id)?.name ?? ""}`, subtitle: linesText(p), trailing: <StatusTag {...statusOf("purchase_orders.status", p.status)} /> })}
        empty={{ kind: "empty", title: "발주가 없어요", description: "안전재고보다 모자라면 발주 초안을 만들어요." }}
      />
      <DetailDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={cur ? `발주 ${cur.po_no ?? ""}` : "발주"}
        extra={cur ? <StatusTag {...statusOf("purchase_orders.status", cur.status)} /> : undefined}
        footer={cur?.status === "draft" && canEdit ? <Button type="primary" icon={<SendOutlined />} loading={mutation.isPending} onClick={async () => { await update({ resource: "purchase_orders", id: cur.id, values: { status: "ordered", ordered_on: today }, successNotification: () => ({ type: "success", message: "발주했어요. 입고 예정일을 알려 드릴게요." }) }); setSelected(null); }}>발주하기</Button> : undefined}
      >
        {cur ? (
          <div className="in-stack">
            <Kv rows={[["공급사", lk.partner.get(cur.partner_id)?.name], ["발주일", formatDate(cur.ordered_on)], ["납기", formatDate(cur.due_on)]]} />
            <Divider />
            <h3 className="in-sub--sm">품목 줄</h3>
            <ListRows ariaLabel="발주 품목 줄" rows={cur.lines.map((l, i) => {
              const it = lk.item.get(l.item_id);
              return { key: `${l.item_id}-${i}`, title: it ? `${it.item_no} · ${it.name}` : "품목", subtitle: `${formatNumber(l.qty)}${it?.unit ?? ""}`, trailing: <PriceGate><span className="in-num">{formatWon(l.unit_price)}</span></PriceGate> };
            })} />
            {cur.status === "draft" && !canEdit && <p className="in-note">발주는 구매 담당이 확정해요.</p>}
          </div>
        ) : pos.isLoading ? null : <EmptyState kind="not_found" compact />}
      </DetailDrawer>
    </>
  );
}

function Prices() {
  const rows = useRows<PriceIndex>("price_indexes", { sorters: [{ field: "period", order: "asc" }] });
  usePageReady(!rows.isLoading);
  const byMat = useMemo(() => {
    const m = new Map<string, PriceIndex[]>();
    for (const r of rows.rows) m.set(r.material, [...(m.get(r.material) ?? []), r]);
    return [...m.entries()];
  }, [rows.rows]);
  if (!rows.isLoading && !rows.rows.length) return <EmptyState kind="empty" title="원재료 가격 기록이 없어요" />;
  const pct = (a?: number, b?: number) => (a != null && b ? Math.round(((a - b) / b) * 1000) / 10 : null);
  return (
    <SectionCard title="재질별 구매 단가 추이" demo caption="지난 6개월 예시 값이에요. 금액 권한이 있는 사람만 이 탭을 봐요.">
      <ChartFrame table={{ columns: ["월", "재질", "값(원/kg)", "변동률(%)"], rows: byMat.flatMap(([mat, list]) => list.map((r, i) => [formatMonth(r.period, true), mat, r.value, pct(r.value, list[i - 1]?.value) ?? "—"])), caption: "원재료 구매 단가 지수(예시)", numericFrom: 2 }}>
        <ul className="in-rows" aria-label="재질별 추이">
          {byMat.map(([mat, list]) => {
            const last = list[list.length - 1]!;
            const change = pct(last.value, list[list.length - 2]?.value);
            return (
              <li key={mat} className="in-line">
                <div className="in-line__main">
                  <span className="in-line__title">{mat}</span>
                  <span className="in-line__meta">{formatMonth(last.period)} {formatNumber(last.value)}{last.unit}{change != null ? ` · 지난달보다 ${change > 0 ? "+" : ""}${change}%` : ""}</span>
                </div>
                <LineSpark values={list.map((r) => r.value)} ariaLabel={`${mat} 단가 추이, 최근 ${formatNumber(last.value)}원`} />
              </li>
            );
          })}
        </ul>
      </ChartFrame>
    </SectionCard>
  );
}
