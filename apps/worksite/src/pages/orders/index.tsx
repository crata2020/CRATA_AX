// 수주·납품 `/ops/orders` · I-08 · 깊이 B · 모듈 mfg-orders · TR 전용 · 소유: industry 그룹
// 수주 탭: 수주 줄의 납기 D-day(단가는 view_prices 권한자만) · 출하 탭: 출하 예정·출하검사·출하 + [출하 등록].
// 거래처·품번·수량·단가는 모두 예시예요.
import { useEffect, useMemo } from "react";
import { Link } from "react-router";
import { Button, DatePicker, Form, InputNumber, Select } from "antd";
import { PaperClipOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { DataTable, DdayBadge, DetailDrawer, Divider, EmptyState, FilterBar, ListRows, PageHeader, PersonChip, PriceGate, StatusTag, useFilterBarState, type FilterBarProps } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { usePageReady } from "@/app/pageReady";
import { useCreate, type CrudFilter } from "@/lib/refine";
import { useSelectedParam, useUrlParam } from "@/lib/url";
import { addDays } from "@/lib/clock";
import { formatDate, formatNumber, formatQty, formatWon } from "@/lib/format";
import { optionsOf, orderLineStatus, statusOf } from "@/lib/status";
import type { Inspection, KpiValue, SalesOrder, SalesOrderLine, Shipment, StockLot } from "@/types/entities";
import { useIndex, useMfgLookups, useModuleRows, useRows, weekDays } from "../ops-home/kit/data";
import { Kv } from "../ops-home/kit/ui";
import "../ops-home/kit/industry.css";

export default function Page() {
  const [tab] = useUrlParam("tab", "orders");
  const k05 = useModuleRows<KpiValue>("reports", "kpi_values", { filters: [{ field: "kpi_id", operator: "eq", value: "K05" }], sorters: [{ field: "period", order: "desc" }] });
  const last = k05.rows[0];
  return (
    <>
      <PageHeader
        title="수주·납품"
        description="수주 줄마다 납기를 보고, 출하를 등록해요."
        meta={last ? <span className="in-num">납기준수율 {formatNumber(last.value, 1)}%({Number(last.period.slice(5, 7))}월, 예시)</span> : undefined}
        tabs={[{ key: "orders", label: "수주", to: "?tab=orders" }, { key: "shipments", label: "출하·납품", to: "?tab=shipments" }]}
      />
      {tab === "shipments" ? <Shipments /> : <Orders />}
    </>
  );
}

function Orders() {
  const { today, hasBundle } = useWorksite();
  const canSeePrice = hasBundle("view_prices");
  const lk = useMfgLookups();
  const orders = useRows<SalesOrder>("sales_orders");
  const orderById = useIndex(orders.rows);
  usePageReady(!orders.isLoading);
  const [selected, setSelected] = useSelectedParam();
  const customers = lk.partners.filter((p) => p.kind === "customer");
  const fbProps: FilterBarProps = {
    chips: [
      { param: "due", options: [{ value: "this", label: "이번 주" }, { value: "next", label: "다음 주" }], allLabel: "전체 납기", ariaLabel: "납기" },
      { param: "status", field: "status", options: optionsOf("sales_orders.status"), multiple: true, ariaLabel: "상태" },
    ],
    selects: [{ param: "customer", label: "고객", options: customers.map((p) => ({ value: p.id, label: p.name })) }],
  };
  const fb = useFilterBarState(fbProps);
  const filters = useMemo<CrudFilter[]>(() => {
    const f = [...fb.filters];
    const customer = fb.values.customer;
    if (customer) { const ids = orders.rows.filter((o) => o.partner_id === customer).map((o) => o.id); f.push({ field: "order_id", operator: "in", value: ids.length ? ids : ["__none__"] }); }
    const due = fb.values.due;
    // 상태를 고르지 않으면 진행 중인 줄만(출하 완료·마감·취소는 상태 칩에서 고르면 보여요)
    if (!fb.values.status && due !== "this") f.push({ field: "status", operator: "nin", value: ["shipped", "closed", "canceled"] });
    if (due) {
      const w = weekDays(today);
      const from = due === "this" ? w[0]! : addDays(w[0]!, 7);
      const to = due === "this" ? addDays(w[0]!, 6) : addDays(w[0]!, 13);
      f.push({ field: "due_date", operator: "gte", value: due === "this" ? "0000-01-01" : from }, { field: "due_date", operator: "lte", value: to });
      if (due === "this") f.push({ field: "status", operator: "nin", value: ["shipped", "closed", "canceled"] });
    }
    return f;
  }, [fb.filters, fb.values.customer, fb.values.due, orders.rows, today]);

  const lines = useRows<SalesOrderLine>("sales_order_lines", { enabled: !!selected });
  const cur = selected ? lines.rows.find((l) => l.id === selected) ?? null : null;
  const order = cur ? orderById.get(cur.order_id) : undefined;
  const ships = useRows<Shipment>("shipments", { filters: [{ field: "order_id", operator: "eq", value: cur?.order_id ?? "__none__" }], sorters: [{ field: "ship_date", order: "asc" }], enabled: !!cur });
  const orderLines = lines.rows.filter((l) => order && l.order_id === order.id);
  const itemLabel = (id: string) => { const i = lk.item.get(id); return i ? `${i.item_no} · ${i.name}` : "—"; };
  const unit = (id: string) => lk.item.get(id)?.unit ?? "개";
  const open = (l: SalesOrderLine) => !["shipped", "closed", "canceled"].includes(l.status);

  return (
    <>
      <FilterBar {...fbProps} />
      <DataTable<SalesOrderLine>
        resource="sales_order_lines"
        ariaLabel="수주 줄"
        filters={filters}
        isFiltered={fb.active}
        onClearFilters={fb.clear}
        syncWithLocation={false}
        // 지연(약속일이 있는 줄)을 맨 위에, 그다음 납기가 가까운 순
        sorters={[{ field: "promised_date", order: "asc" }, { field: "due_date", order: "asc" }]}
        onRowClick={(l) => setSelected(l.id)}
        // 1440(표 상자 약 1100px)에서 고정 레이아웃에 들어가게: 고정 폭 합 124+144+96+96+216+160 = 836 + 품목 최소 160 ≤ 1088.
        // 납기 216 = 가장 긴 '12월 31일 + D-1 내일 납기'(약 182) + 칸 안쪽 32. 상태 160 = '지연 예상(+12일)'(약 130) + 32.
        // 단가는 낮은 우선순위(1600 이상에서만, 서랍에는 늘 있음)이고 상태 앞에 둬요 → 상태가 마지막 칸이라 가로 스크롤(태블릿)일 때 오른쪽에 붙어요
        columns={[
          { key: "po", title: "고객 발주번호", width: 124, render: (l) => <span className="ws-cell-name in-num">{orderById.get(l.order_id)?.customer_po_no ?? "—"}</span> },
          { key: "customer", title: "고객", width: 144, render: (l) => <span className="ws-ellipsis">{lk.partner.get(orderById.get(l.order_id)?.partner_id ?? "")?.name ?? "—"}</span> },
          { key: "item_id", title: "품목", flex: true, render: (l) => <span className="ws-ellipsis" title={itemLabel(l.item_id)}>{itemLabel(l.item_id)}</span> },
          { key: "qty", title: "수량", width: 96, align: "right", render: (l) => <span className="in-num">{formatQty(l.qty, unit(l.item_id))}</span> },
          { key: "shipped_qty", title: "출하 수량", width: 96, align: "right", render: (l) => <span className="in-num">{formatQty(l.shipped_qty, unit(l.item_id))}</span> },
          { key: "due_date", title: "납기", width: 216, render: (l) => <span className="in-row" style={{ flexWrap: "nowrap" }}><span className="ws-date">{formatDate(l.due_date, false)}</span>{open(l) && <DdayBadge date={l.due_date} noun="납기" />}</span> },
          // 단가는 볼 권한이 있을 때만 칸을 둬요(대시 한 줄 대신)
          ...(canSeePrice ? [{ key: "unit_price", title: "단가", kind: "price" as const, width: 112, low: true }] : []),
          { key: "status", title: "상태", kind: "status", width: 160, render: (l) => <StatusTag {...orderLineStatus(l, today)} /> },
        ]}
        mobileRow={(l) => ({
          title: `${lk.item.get(l.item_id)?.name ?? "품목"} · ${formatQty(l.qty, unit(l.item_id))}`,
          subtitle: l.status === "late" && l.late_reason ? `${lk.partner.get(orderById.get(l.order_id)?.partner_id ?? "")?.name ?? ""} · ${l.late_reason}` : `${lk.partner.get(orderById.get(l.order_id)?.partner_id ?? "")?.name ?? ""} · 납기 ${formatDate(l.due_date, false)}`,
          // 지연·주의 줄은 상태(예: 지연 예상(+4일))를 먼저 보여 줘요. 순조로운 줄만 D-day
          trailing: (() => {
            const st = orderLineStatus(l, today);
            if (st.tone === "critical" || st.tone === "serious" || st.tone === "warning") return <StatusTag {...st} />;
            return open(l) ? <DdayBadge date={l.due_date} noun="납기" /> : <StatusTag {...statusOf("sales_orders.status", l.status)} />;
          })(),
        })}
        empty={{ kind: "empty", title: "진행 중인 수주가 없어요", description: "고객 발주가 들어오면 수주 줄로 보여요." }}
      />
      <DetailDrawer open={!!selected} onClose={() => setSelected(null)} title={order ? `수주 ${order.customer_po_no}` : "수주"} extra={order ? <StatusTag {...statusOf("sales_orders.status", order.status)} /> : undefined}>
        {cur && order ? (
          <div className="in-stack">
            <Kv rows={[
              ["고객", <Link className="in-link" to={`/projects/partners/${order.partner_id}`}>{lk.partner.get(order.partner_id)?.name ?? "—"}</Link>],
              ["수주일", formatDate(order.order_date)],
              ["받은 경로", { mail: "메일", fax: "팩스", portal: "고객 포털", phone: "전화" }[order.source]],
              ["담당", <PersonChip memberId={order.owner_id} size="sm" />],
              ["첨부", order.attachment_refs.length ? <span className="in-row"><PaperClipOutlined aria-hidden />{order.attachment_refs.join(", ")}</span> : null],
            ]} />
            <Divider />
            <h3 className="in-sub--sm">품목 줄</h3>
            <ListRows ariaLabel="품목 줄" rows={orderLines.map((l) => ({
              key: l.id, title: itemLabel(l.item_id), subtitle: `${formatQty(l.qty, unit(l.item_id))} · 출하 ${formatQty(l.shipped_qty, unit(l.item_id))} · 납기 ${formatDate(l.due_date, false)}${l.late_reason ? ` · ${l.late_reason}` : ""}`,
              trailing: <span className="in-row"><PriceGate><span className="in-num">{formatWon(l.unit_price)}</span></PriceGate><StatusTag {...statusOf("sales_orders.status", l.status)} /></span>,
            }))} />
            <Divider />
            <h3 className="in-sub--sm">출하 이력</h3>
            <ListRows ariaLabel="출하 이력" empty={<p className="in-note">아직 출하가 없어요.</p>} rows={ships.rows.map((s) => ({
              key: s.id, title: `${s.lot_ids.join(", ")} · ${formatNumber(s.qty)}`, subtitle: `${formatDate(s.ship_date)}${s.delivery_note_no ? ` · 거래명세서 ${s.delivery_note_no}` : ""}`,
              trailing: <StatusTag {...statusOf("shipments.status", s.status)} />,
            }))} />
            <p className="in-caption">단가·금액은 권한이 있는 사람만 볼 수 있어요.</p>
          </div>
        ) : lines.isLoading ? null : <EmptyState kind="not_found" compact />}
      </DetailDrawer>
    </>
  );
}

interface ShipValues { lineId: string; qty: number; lot?: string; date?: Dayjs | null; photo?: string }

function Shipments() {
  const { today, can } = useWorksite();
  const [range] = useUrlParam("ship", "today");
  const [selected, setSelected] = useSelectedParam();
  const lk = useMfgLookups();
  const lines = useRows<SalesOrderLine>("sales_order_lines");
  const orders = useRows<SalesOrder>("sales_orders");
  const lots = useModuleRows<StockLot>("mfg-materials", "stock_lots", { filters: [{ field: "status", operator: "eq", value: "available" }] });
  const lineById = useIndex(lines.rows);
  const orderById = useIndex(orders.rows);
  usePageReady(!lines.isLoading);
  const ins = useModuleRows<Inspection>("mfg-quality", "inspections", { filters: [{ field: "kind", operator: "eq", value: "outgoing" }, { field: "inspected_on", operator: "gte", value: addDays(today, -14) }] });
  const insById = useIndex(ins.rows);
  const canCreate = can("shipments", "create").can;
  const { mutateAsync: create, mutation } = useCreate<Shipment>();
  const [form] = Form.useForm<ShipValues>();
  const lineId = Form.useWatch("lineId", form);

  const w = weekDays(today);
  const filters: CrudFilter[] = range === "tomorrow" ? [{ field: "ship_date", operator: "eq", value: addDays(today, 1) }]
    : range === "week" ? [{ field: "ship_date", operator: "gte", value: w[0]! }, { field: "ship_date", operator: "lte", value: addDays(w[0]!, 6) }]
      : [{ field: "ship_date", operator: "eq", value: today }];

  useEffect(() => {
    if (selected !== "new") return;
    form.resetFields();
    form.setFieldsValue({ date: dayjs(today) });
  }, [selected, form, today]);
  const openLines = lines.rows.filter((l) => !["shipped", "closed", "canceled"].includes(l.status)).sort((a, b) => a.due_date.localeCompare(b.due_date));
  const chosen = lineId ? lineById.get(lineId) : undefined;
  const lotOptions = lots.rows.filter((s) => !chosen || s.item_id === chosen.item_id || !s.lot_no.startsWith("R-")).map((s) => ({ value: s.lot_no, label: `${s.lot_no} · ${lk.item.get(s.item_id)?.name ?? ""}` }));

  const save = async () => {
    const v = await form.validateFields();
    const l = lineById.get(v.lineId)!;
    await create({
      resource: "shipments",
      values: { order_id: l.order_id, order_line_id: l.id, ship_date: v.date ? v.date.format("YYYY-MM-DD") : today, qty: v.qty, lot_ids: v.lot ? [v.lot] : [], delivery_note_no: null, status: "planned", outgoing_inspection_id: null, packing_photo_names: v.photo ? [v.photo] : [] },
      successNotification: () => ({ type: "success", message: "출하 예정으로 등록했어요. 출하검사를 마치면 출하로 바뀌어요." }),
    });
    setSelected(null);
  };
  const itemOf = (s: Shipment) => lk.item.get(lineById.get(s.order_line_id ?? "")?.item_id ?? "");

  return (
    <>
      <FilterBar
        view={{ ariaLabel: "출하일", urlParam: "ship", value: "today", onChange: () => undefined, options: [{ value: "today", label: "오늘" }, { value: "tomorrow", label: "내일" }, { value: "week", label: "이번 주" }] }}
        right={canCreate ? <Button type="primary" icon={<PlusOutlined />} onClick={() => setSelected("new")}>출하 등록</Button> : undefined}
      />
      <DataTable<Shipment>
        resource="shipments"
        ariaLabel="출하"
        filters={filters}
        syncWithLocation={false}
        sorters={[{ field: "ship_date", order: "asc" }, { field: "id", order: "asc" }]}
        columns={[
          { key: "no", title: "출하 번호", width: 168, render: (s) => <span className="ws-cell-name in-num">{s.delivery_note_no ?? s.lot_ids[0] ?? "—"}</span> },
          { key: "order", title: "수주", width: 124, render: (s) => <span className="ws-nowrap">{orderById.get(s.order_id)?.customer_po_no ?? "—"}</span> },
          { key: "item", title: "품목", flex: true, render: (s) => <span className="ws-ellipsis">{itemOf(s)?.name ?? "—"}</span> },
          { key: "qty", title: "수량", align: "right", width: 112, render: (s) => <span className="in-num ws-nowrap">{formatQty(s.qty, itemOf(s)?.unit ?? "")}</span> },
          { key: "lot_ids", title: "LOT", width: 190, render: (s) => <span className="ws-row">{s.lot_ids.map((l) => <Link key={l} className="in-link ws-nowrap" to={`/ops/trace?lot=${encodeURIComponent(l)}`}>{l}</Link>)}</span> },
          { key: "ins", title: "출하검사", width: 120, render: (s) => { const i = s.outgoing_inspection_id ? insById.get(s.outgoing_inspection_id) : undefined; return i ? <StatusTag {...statusOf("inspections.result", i.result)} /> : <span className="in-caption">검사 전</span>; } },
          { key: "status", title: "상태", kind: "status", statusDomain: "shipments.status" },
        ]}
        mobileRow={(s) => ({ title: `${itemOf(s)?.name ?? "출하"} · ${formatNumber(s.qty)}${itemOf(s)?.unit ?? ""}`, subtitle: `${formatDate(s.ship_date, false)} · ${s.lot_ids[0] ?? "LOT 전"}`, trailing: <StatusTag {...statusOf("shipments.status", s.status)} /> })}
        empty={{ kind: "empty", title: "출하 예정이 없어요", description: range === "today" ? "내일이나 이번 주를 골라 보세요." : "수주 줄에서 출하를 등록하면 여기에 보여요." }}
      />
      <DetailDrawer open={selected === "new"} onClose={() => setSelected(null)} title="출하 등록" closeLabel="취소" footer={<Button type="primary" loading={mutation.isPending} onClick={() => void save()}>등록하기</Button>}>
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item name="lineId" label="수주 줄" rules={[{ required: true, message: "수주 줄을 골라 주세요" }]}>
            <Select showSearch optionFilterProp="label" options={openLines.map((l) => ({ value: l.id, label: `${orderById.get(l.order_id)?.customer_po_no ?? ""} · ${lk.item.get(l.item_id)?.name ?? ""} · 남은 ${formatNumber(l.qty - l.shipped_qty)} · 납기 ${formatDate(l.due_date, false)}` }))} />
          </Form.Item>
          <Form.Item name="qty" label={`수량${chosen ? `(남은 ${formatNumber(chosen.qty - chosen.shipped_qty)}${lk.item.get(chosen.item_id)?.unit ?? ""})` : ""}`} rules={[{ required: true, message: "수량을 적어 주세요" }]}>
            <InputNumber<number> min={1} max={chosen ? chosen.qty - chosen.shipped_qty : undefined} style={{ width: "100%" }} inputMode="numeric" />
          </Form.Item>
          <Form.Item name="lot" label="LOT"><Select allowClear showSearch optionFilterProp="label" options={lotOptions} placeholder="재고 LOT 고르기" /></Form.Item>
          <Form.Item name="date" label="출하일"><DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" /></Form.Item>
          <Form.Item label="포장 사진" extra="파일 이름만 남겨요.">
            <input type="file" accept="image/*" aria-label="포장 사진 고르기" onChange={(e) => form.setFieldValue("photo", e.target.files?.[0]?.name)} />
          </Form.Item>
          <Form.Item name="photo" hidden><input /></Form.Item>
        </Form>
      </DetailDrawer>
    </>
  );
}
