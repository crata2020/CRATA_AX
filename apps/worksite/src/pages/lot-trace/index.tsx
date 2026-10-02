// LOT 추적 `/ops/trace` · I-16 · 깊이 B · 모듈 mfg-materials · TR 전용 · 소유: industry 그룹
// 클레임이 오면 LOT 번호로 원자재 → 편조 → 가공 → 출하 → 고객·클레임을 앞뒤로 따라갑니다(목표: 30분 안에 범위 확인).
// LOT 번호 규칙(예시): 원자재 R-재질-입고일-순번 · 편조 K-설비-생산일-조 · 가공 F-공정설비-생산일-순번 · 출하 S-출하일-순번
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Button, Input } from "antd";
import { ArrowRightOutlined, SearchOutlined } from "@ant-design/icons";
import { ChartFrame, EmptyState, PageHeader, SectionCard, SegmentedPills, SensitivityTag, StatusTag } from "@/components";
import { usePageReady } from "@/app/pageReady";
import { useUrlParam } from "@/lib/url";
import { formatDate, formatQty } from "@/lib/format";
import { labelOf, statusOf } from "@/lib/status";
import type { CustomerClaim, Inspection, LotLink, MaterialReceipt, SalesOrder, Shipment, StockLot, WorkOrder } from "@/types/entities";
import { useIndex, useMfgLookups, useModuleRows, useRows, usePatchParams } from "../ops-home/kit/data";
import { SHIFT_LABEL } from "../ops-home/kit/labels";
import "../ops-home/kit/industry.css";

const STAGES = [
  { key: "R", label: "원자재" },
  { key: "K", label: "편조" },
  { key: "F", label: "가공" },
  { key: "S", label: "출하" },
] as const;
const stageOf = (lot: string) => (/^[RKFS]-/.test(lot) ? lot[0]! : "F");
const EXAMPLES = ["S-260916-012", "K-KN07-260914-A", "R-321-260911-01"];

export default function Page() {
  // 데모: 처음 열면 클레임 LOT(S-260916-012)를 거꾸로 따라간 결과를 바로 보여 줘요(빈 화면 대신)
  const [lotParam] = useUrlParam("lot", EXAMPLES[0]);
  const [dir] = useUrlParam("dir", "back");
  const patch = usePatchParams();
  const [text, setText] = useState(lotParam);
  const lot = lotParam.trim().toUpperCase();
  const links = useRows<LotLink>("lot_links");
  usePageReady(!links.isLoading);
  const lk = useMfgLookups();

  const chain = useMemo(() => {
    if (!lot) return [] as string[];
    const parents = new Map<string, string[]>();
    const children = new Map<string, string[]>();
    for (const l of links.rows) {
      parents.set(l.child_lot, [...(parents.get(l.child_lot) ?? []), l.parent_lot]);
      children.set(l.parent_lot, [...(children.get(l.parent_lot) ?? []), l.child_lot]);
    }
    const next = dir === "fwd" ? children : parents;
    const seen = new Set<string>([lot]);
    const queue = [lot];
    while (queue.length) {
      const cur = queue.shift()!;
      for (const n of next.get(cur) ?? []) if (!seen.has(n)) { seen.add(n); queue.push(n); }
    }
    return [...seen];
  }, [lot, dir, links.rows]);
  const enabled = chain.length > 0;
  const wos = useModuleRows<WorkOrder>("mfg-production", "work_orders", { filters: [{ field: "lot_no", operator: "in", value: chain.length ? chain : ["__none__"] }], enabled });
  const stock = useRows<StockLot>("stock_lots", { filters: [{ field: "lot_no", operator: "in", value: chain.length ? chain : ["__none__"] }], enabled });
  const ships = useModuleRows<Shipment>("mfg-orders", "shipments", { filters: [{ field: "lot_ids", operator: "in", value: chain.length ? chain : ["__none__"] }], enabled });
  const orders = useModuleRows<SalesOrder>("mfg-orders", "sales_orders", { enabled });
  const ins = useModuleRows<Inspection>("mfg-quality", "inspections", { filters: [{ field: "lot_no", operator: "in", value: chain.length ? chain : ["__none__"] }], enabled });
  const claims = useModuleRows<CustomerClaim>("mfg-quality", "customer_claims", { filters: [{ field: "lot_nos", operator: "in", value: chain.length ? chain : ["__none__"] }], enabled });
  const receipts = useRows<MaterialReceipt>("material_receipts", { enabled });
  const orderById = useIndex(orders.rows);
  const loading = enabled && (wos.isLoading || stock.isLoading || ships.isLoading);

  type Node = { lot: string; stage: string; item: string; qty: string; date: string; equipment: string; extra: string; checks: string };
  const nodes = useMemo<Node[]>(() => chain.map((l) => {
    const wo = wos.rows.find((w) => w.lot_no === l);
    const sl = stock.rows.find((s) => s.lot_no === l);
    const sh = ships.rows.find((s) => s.lot_ids.includes(l));
    const its = ins.rows.filter((i) => i.lot_no === l);
    // 출하 LOT은 작업지시가 없어서, 체인 안 가공 LOT의 품목을 빌려 단위(개)와 이름을 보여 줘요
    const formWo = sh && !wo && !sl ? chain.map((c) => wos.rows.find((w) => w.lot_no === c)).find((w) => !!w && stageOf(w.lot_no ?? "") === "F") : undefined;
    const itemId = wo?.item_id ?? sl?.item_id ?? formWo?.item_id ?? undefined;
    const item = itemId ? lk.item.get(itemId) : undefined;
    const stage = stageOf(l);
    let qty = "—", date = "—", equipment = "—", extra = "";
    if (wo) {
      qty = formatQty(wo.planned_qty, item?.unit ?? null);
      date = `${formatDate(wo.planned_date, false)} ${SHIFT_LABEL[wo.shift] ?? ""}`;
      equipment = wo.equipment_id ? lk.eq.get(wo.equipment_id)?.equipment_no ?? "—" : "—";
    }
    if (stage === "R" && sl) {
      const rc = receipts.rows.find((r) => r.item_id === sl.item_id && l.includes(r.received_on.slice(2).replace(/-/g, "")));
      qty = formatQty(rc?.qty ?? sl.qty_on_hand, "kg");
      date = rc ? `${formatDate(rc.received_on, false)} 입고` : "—";
      extra = rc ? `공급사 LOT ${rc.supplier_lot_no}${rc.heat_no ? ` · 히트번호 ${rc.heat_no}` : ""}` : "";
    }
    if (sh) {
      const o = orderById.get(sh.order_id);
      qty = formatQty(sh.qty, item?.unit ?? null);
      date = `${formatDate(sh.ship_date, false)} 출하`;
      extra = o ? lk.partner.get(o.partner_id)?.name ?? "" : "";
    }
    const checks = its.length ? its.map((i) => `${labelOf("inspections.kind", i.kind)} ${labelOf("inspections.result", i.result)}`).join(" · ") : "—";
    return { lot: l, stage, item: item ? `${item.item_no} · ${item.name}` : sh ? "출하품" : "—", qty, date, equipment, extra, checks };
  }), [chain, wos.rows, stock.rows, ships.rows, ins.rows, receipts.rows, orderById, lk.item, lk.eq, lk.partner]);

  const known = nodes.some((n) => n.item !== "—" || n.date !== "—") || chain.length > 1;
  const search = (v: string) => patch({ lot: v.trim().toUpperCase() || null });

  return (
    <>
      <PageHeader title="LOT 추적" description="클레임이 오면 LOT로 앞뒤를 따라가요." />
      <SectionCard ariaLabel="LOT 찾기">
        <div className="in-row" style={{ alignItems: "flex-end" }}>
          <div className="in-field" style={{ flex: "1 1 260px" }}>
            <label className="in-field__label" htmlFor="lot-input">LOT 번호</label>
            <Input id="lot-input" size="large" value={text} onChange={(e) => setText(e.target.value)} onPressEnter={() => search(text)} placeholder="예: K-KN07-260914-A" allowClear />
          </div>
          <SegmentedPills ariaLabel="방향" urlParam="dir" value={dir === "fwd" ? "fwd" : "back"} onChange={() => undefined} options={[{ value: "back", label: "거꾸로: 출하→원자재" }, { value: "fwd", label: "앞으로: 원자재→출하" }]} />
          <Button type="primary" size="large" icon={<SearchOutlined />} onClick={() => search(text)}>찾기</Button>
        </div>
        <div className="in-row in-mt" role="group" aria-label="예시 LOT">
          <span className="in-caption">예시 LOT</span>
          {EXAMPLES.map((e) => (
            <button key={e} type="button" className="ws-chip ws-chip--sm ws-tabular" aria-pressed={lot === e} onClick={() => { setText(e); search(e); }}>{e}</button>
          ))}
        </div>
      </SectionCard>

      <div style={{ marginTop: 24 }}>
        {!lot ? (
          <EmptyState kind="empty" title="LOT 번호를 넣으면 앞뒤 기록을 찾아 드려요" description="클레임 LOT나 출하 LOT부터 거꾸로 따라가 보세요." />
        ) : loading ? null : !known ? (
          <EmptyState kind="not_found" title="그 LOT 번호는 기록에 없어요" description="번호를 다시 확인하거나 다른 방향으로 찾아보세요." />
        ) : (
          <SectionCard title={`${dir === "fwd" ? "앞으로" : "거꾸로"} 따라간 결과 · LOT ${chain.length}개`} demo caption="LOT 연결은 예시 데이터예요. 실제 운영에서는 작업지시에 원자재 LOT를 걸 때 자동으로 이어져요.">
            <ChartFrame table={{ columns: ["단계", "LOT", "품목", "수량", "일자", "설비", "관련 검사"], rows: [...nodes].sort((a, b) => "RKFS".indexOf(a.stage) - "RKFS".indexOf(b.stage)).map((n) => [STAGES.find((s) => s.key === n.stage)?.label ?? "", n.lot, n.item, n.qty, n.date, n.equipment, n.checks]), caption: `LOT ${lot} 추적 결과`, numericFrom: 99 }}>
              <div className="in-chain" role="group" aria-label="LOT 체인">
                {STAGES.map((s, i) => {
                  const list = nodes.filter((n) => n.stage === s.key);
                  return (
                    <div key={s.key} style={{ display: "contents" }}>
                      {i > 0 && <span className="in-chain__arrow" aria-hidden><ArrowRightOutlined /></span>}
                      <div className="in-chain__stage" role="group" aria-label={`${s.label} ${list.length}개`}>
                        <span className="in-chain__label">{s.label}</span>
                        {list.length ? list.map((n) => (
                          <div key={n.lot} className={`in-node${n.lot === lot ? " is-focus" : ""}`}>
                            <Link className="in-node__lot in-link" to={`?lot=${encodeURIComponent(n.lot)}&dir=${dir}`} onClick={() => setText(n.lot)}>{n.lot}</Link>
                            <span className="in-node__meta">{n.item}</span>
                            <span className="in-node__meta">{[n.date, n.equipment !== "—" ? n.equipment : null, n.qty !== "—" ? n.qty : null].filter(Boolean).join(" · ")}</span>
                            {n.extra && <span className="in-node__meta">{n.extra}</span>}
                            {n.checks !== "—" && <span className="in-node__meta">검사: {n.checks}</span>}
                          </div>
                        )) : <span className="in-caption">{dir === "fwd" ? "다음 단계 기록 없음" : "이전 단계 기록 없음"}</span>}
                      </div>
                    </div>
                  );
                })}
                <span className="in-chain__arrow" aria-hidden><ArrowRightOutlined /></span>
                <div className="in-chain__stage" role="group" aria-label={`클레임 ${claims.rows.length}건`}>
                  <span className="in-chain__label">고객·클레임</span>
                  {claims.rows.length ? claims.rows.map((c) => (
                    <div key={c.id} className="in-node">
                      <Link className="in-node__lot in-link" to={`/ops/quality/claims/${c.id}`}>{c.claim_no}</Link>
                      <span className="in-node__meta">{lk.partner.get(c.partner_id)?.name ?? ""}</span>
                      <span className="in-row"><StatusTag {...statusOf("customer_claims.status", c.status)} /><SensitivityTag level="L2" /></span>
                    </div>
                  )) : <span className="in-caption">연결된 클레임 없음</span>}
                </div>
              </div>
            </ChartFrame>
          </SectionCard>
        )}
      </div>
    </>
  );
}
