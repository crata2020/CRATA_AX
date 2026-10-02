// 거래처 상세 `/projects/partners/:partnerId` · I-02 · 깊이 A · 모듈 partners · 소유: industry 그룹
// 개요(정보 · 최근 활동) | 담당자 | 프로젝트 | 거래(TR: 수주·클레임 / CRATA: 영업 기회·견적). 금액은 view_prices 권한자만.
import { useMemo } from "react";
import { useParams } from "react-router";
import { Button, Skeleton } from "antd";
import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import {
  CardGrid, CopyField, DataTable, DdayBadge, EmptyState, ListRows, PageHeader, PersonChip, PriceGate, SectionCard, SensitivityTag, StatusTag, Timeline, type TimelineItem,
} from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { usePageReady } from "@/app/pageReady";
import { useOne } from "@/lib/refine";
import { useUrlParam } from "@/lib/url";
import { kstIso } from "@/lib/clock";
import { formatDate, formatNumber, formatWon, formatWonKorean } from "@/lib/format";
import { labelOf, statusOf } from "@/lib/status";
import { useBreakpoint } from "@/lib/useBreakpoint";
import type {
  CustomerClaim, Item, MailLink, Meeting, Opportunity, Partner, PartnerContact, Project, Quote, SalesOrder, SalesOrderLine,
} from "@/types/entities";
import { asRow, useIndex, useModuleRows, useRows } from "../ops-home/kit/data";
import { Kv } from "../ops-home/kit/ui";
import { PartnerFormDrawer } from "../partners/PartnerFormDrawer";
import { ContactFormDrawer } from "../contacts/ContactFormDrawer";
import "../ops-home/kit/industry.css";

const iso = (date: string) => (date.length === 10 ? kstIso(date, "09:00") : date);

export default function Page() {
  const { partnerId = "" } = useParams();
  const { can, isModuleOn, person, hasBundle } = useWorksite();
  const bp = useBreakpoint();
  const [tab] = useUrlParam("tab", "overview");
  const [modal, setModal] = useUrlParam("edit");
  const { result, query } = useOne<Partner>({ resource: "partners", id: partnerId, queryOptions: { retry: false } });
  usePageReady(!query.isLoading);
  const partner = result as Partner | undefined;

  const contacts = useRows<PartnerContact>("partner_contacts", { filters: [{ field: "partner_id", operator: "eq", value: partnerId }], sorters: [{ field: "is_primary", order: "desc" }, { field: "name", order: "asc" }] });
  const projects = useRows<Project>("projects", { filters: [{ field: "partner_id", operator: "eq", value: partnerId }] });
  const tr = isModuleOn("mfg-orders") || isModuleOn("mfg-quality");
  const crm = isModuleOn("edu-sales");
  const orders = useModuleRows<SalesOrder>("mfg-orders", "sales_orders", { filters: [{ field: "partner_id", operator: "eq", value: partnerId }] });
  const lines = useModuleRows<SalesOrderLine>("mfg-orders", "sales_order_lines");
  const claims = useModuleRows<CustomerClaim>("mfg-quality", "customer_claims", { filters: [{ field: "partner_id", operator: "eq", value: partnerId }] });
  const items = useModuleRows<Item>("mfg-master-data", "items");
  const opps = useModuleRows<Opportunity>("edu-sales", "opportunities", { filters: [{ field: "partner_id", operator: "eq", value: partnerId }] });
  const quotes = useModuleRows<Quote>("edu-sales", "quotes", { filters: [{ field: "partner_id", operator: "eq", value: partnerId }] });
  const meetings = useModuleRows<Meeting>("meetings", "meetings");
  const mails = useModuleRows<MailLink>("mail-connector", "mail_links", { filters: [{ field: "partner_id", operator: "eq", value: partnerId }] });
  const allPartners = useRows<Partner>("partners");
  const itemById = useIndex(items.rows);
  const openAmount = useMemo(() => opps.rows.filter((o) => o.stage !== "won" && o.stage !== "lost").reduce((t, o) => t + (o.amount_krw ?? 0), 0), [opps.rows]);

  const orderTotals = useMemo(() => {
    const m = new Map<string, { lines: number; amount: number | null; next: string | null }>();
    for (const l of lines.rows) {
      const cur = m.get(l.order_id) ?? { lines: 0, amount: 0, next: null };
      cur.lines += 1;
      cur.amount = l.unit_price == null || cur.amount == null ? null : cur.amount + l.unit_price * l.qty;
      if (!["shipped", "closed", "canceled"].includes(l.status) && (!cur.next || l.due_date < cur.next)) cur.next = l.due_date;
      m.set(l.order_id, cur);
    }
    return m;
  }, [lines.rows]);

  const activity = useMemo<TimelineItem[]>(() => {
    const projectIds = new Set(projects.rows.map((p) => p.id));
    const list: TimelineItem[] = [];
    for (const m of meetings.rows) if (m.project_ids.some((p) => projectIds.has(p))) list.push({ id: m.id, at: m.started_at, title: `회의: ${m.title}`, description: m.summary ?? undefined, tone: "info" });
    for (const ml of mails.rows) list.push({ id: ml.id, at: ml.received_at, title: `메일: ${ml.subject}`, description: "제목만 보여요(본문 없음)", tone: "neutral" });
    for (const c of claims.rows) list.push({ id: c.id, at: iso(c.received_on), title: `클레임 ${c.claim_no} 접수`, description: c.description, tone: c.status === "closed" ? "good" : "serious", icon: <SensitivityTag level="L2" /> });
    for (const o of orders.rows.slice().sort((a, b) => b.order_date.localeCompare(a.order_date)).slice(0, 4)) list.push({ id: o.id, at: iso(o.order_date), title: `수주 ${o.customer_po_no}`, description: labelOf("sales_orders.status", o.status), tone: "info" });
    for (const o of opps.rows) list.push({ id: o.id, at: o.updated_at, title: `영업 기회: ${o.title}`, description: labelOf("opportunities.stage", o.stage), tone: o.stage === "won" ? "good" : "info" });
    for (const q of quotes.rows) if (q.issued_on) list.push({ id: q.id, at: iso(q.issued_on), title: `견적 ${q.quote_no} 발행`, description: labelOf("quotes.status", q.status), tone: "neutral" });
    return list.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
  }, [projects.rows, meetings.rows, mails.rows, claims.rows, orders.rows, opps.rows, quotes.rows]);

  if (query.isLoading) return (<><PageHeader title="거래처 상세" back={{ label: "거래처", to: "/projects/partners" }} /><Skeleton active paragraph={{ rows: 6 }} /></>);
  if (query.isError || !partner) {
    const nf = (query.error as { statusCode?: number } | null)?.statusCode === 404 || !partner;
    return (
      <>
        <PageHeader title="거래처 상세" back={{ label: "거래처", to: "/projects/partners" }} />
        {nf ? <EmptyState kind="not_found" action={{ label: "거래처 목록 보기", to: "/projects/partners" }} /> : <EmptyState kind="error" action={{ label: "다시 시도", onClick: () => void query.refetch() }} />}
      </>
    );
  }

  const canEdit = can("partners", "edit", asRow(partner)).can;
  const canAddContact = can("partner_contacts", "create").can;
  const tabs = [
    { key: "overview", label: "개요", to: "?tab=overview" },
    { key: "contacts", label: "담당자", to: "?tab=contacts", badge: contacts.rows.length || undefined },
    { key: "projects", label: "프로젝트", to: "?tab=projects" },
    { key: "deals", label: "거래", to: "?tab=deals" },
  ];

  return (
    <>
      <PageHeader
        title={partner.name}
        back={{ label: "거래처", to: "/projects/partners" }}
        meta={
          <>
            <span className="ws-tag">{labelOf("partners.kind", partner.kind)}</span>
            <StatusTag {...statusOf("partners.status", partner.status)} />
            <span className="in-caption">담당</span>
            <PersonChip memberId={partner.owner_member_id} size="sm" />
          </>
        }
        actions={canEdit ? <Button icon={<EditOutlined />} onClick={() => setModal("partner")}>수정</Button> : undefined}
        tabs={tabs}
      />

      {tab === "overview" && (
        <CardGrid>
          <SectionCard title="정보" span={6}>
            <Kv rows={[
              ["종류", labelOf("partners.kind", partner.kind)],
              ["상태", <StatusTag {...statusOf("partners.status", partner.status)} />],
              ["담당", <PersonChip memberId={partner.owner_member_id} size="sm" showUnit />],
              ["태그", partner.tags.length ? <span className="in-row">{partner.tags.map((t) => <span key={t} className="ws-tag">{t}</span>)}</span> : null],
              ["사업자번호", partner.biz_reg_no ?? "데모에서는 비워 둬요"],
              ["메모", partner.note],
              ["등록일", formatDate(partner.created_at)],
              ["담당자", `${contacts.rows.length}명`],
              ["진행 프로젝트", `${projects.rows.filter((p) => p.status !== "done").length}개`],
            ]} />
            <p className="in-caption in-mt">가상 거래처예요. 단가·계약 조건은 이 화면에 두지 않아요.</p>
          </SectionCard>
          <SectionCard title="최근 활동" span={6}>
            {activity.length ? <Timeline items={activity} dense ariaLabel="최근 활동" /> : <EmptyState kind="empty" compact title="최근 활동이 없어요" description="회의·메일·거래가 생기면 여기에 모여요." />}
          </SectionCard>
        </CardGrid>
      )}

      {tab === "contacts" && (
        <SectionCard title={`담당자 ${contacts.rows.length}명`} actions={canAddContact ? <Button icon={<PlusOutlined />} onClick={() => setModal("contact")}>담당자 추가</Button> : undefined}>
          {contacts.rows.length ? (
            <ListRows
              ariaLabel="담당자"
              rows={contacts.rows.map((c) => ({
                key: c.id,
                title: c.name,
                subtitle: [c.dept, c.title, c.phone].filter(Boolean).join(" · "),
                trailing: (
                  <>
                    {c.is_primary && <span className="ws-tag ws-tag--brand">주 담당</span>}
                    <CopyField value={c.email} label="메일 주소" buttonOnly={bp === "mobile"} />
                  </>
                ),
              }))}
            />
          ) : (
            <EmptyState kind="empty" compact title="담당자가 없어요" description={canAddContact ? "담당자를 추가하면 연락처를 바로 복사할 수 있어요." : undefined} />
          )}
        </SectionCard>
      )}

      {tab === "projects" && (
        <DataTable<Project>
          resource="projects"
          ariaLabel="이 거래처의 프로젝트"
          syncWithLocation={false}
          filters={[{ field: "partner_id", operator: "eq", value: partner.id }]}
          sorters={[{ field: "due_on", order: "asc" }]}
          rowHref={(p) => `/projects/${p.id}`}
          columns={[
            { key: "name", title: "프로젝트", kind: "name" },
            { key: "code", title: "코드" },
            { key: "status", title: "상태", kind: "status", statusDomain: "projects.status" },
            { key: "health", title: "신호", kind: "status", statusDomain: "projects.health" },
            { key: "owner_member_id", title: "담당", kind: "person" },
            { key: "due_on", title: "기한", kind: "date" },
          ]}
          mobileRow={(p) => ({ title: p.name, subtitle: `${p.code} · ${formatDate(p.due_on)}까지`, trailing: <StatusTag {...statusOf("projects.health", p.health)} /> })}
          empty={{ kind: "empty", title: "연결된 프로젝트가 없어요", description: "프로젝트를 만들 때 거래처를 고르면 여기에 보여요." }}
        />
      )}

      {tab === "deals" && (
        <div className="in-stack">
          {!tr && !crm && <EmptyState kind="module_off" title="이 회사에서는 거래 기록 기능을 쓰지 않아요" action={{ label: "개요 보기", to: "?tab=overview" }} />}
          {isModuleOn("mfg-orders") && (
            <SectionCard title="수주" demo caption="금액은 권한이 있는 사람만 볼 수 있어요.">
              <DataTable<SalesOrder>
                resource="sales_orders"
                ariaLabel="이 거래처의 수주"
                syncWithLocation={false}
                pageSize={10}
                filters={[{ field: "partner_id", operator: "eq", value: partner.id }]}
                sorters={[{ field: "order_date", order: "desc" }]}
                rowHref={(o) => `/ops/orders?customer=${partner.id}`}
                columns={[
                  { key: "customer_po_no", title: "고객 발주번호", kind: "name" },
                  { key: "order_date", title: "수주일", kind: "date" },
                  { key: "status", title: "상태", kind: "status", statusDomain: "sales_orders.status" },
                  { key: "lines", title: "품목 줄", render: (o) => `${orderTotals.get(o.id)?.lines ?? 0}줄` },
                  { key: "next", title: "가까운 납기", render: (o) => (orderTotals.get(o.id)?.next ? <DdayBadge date={orderTotals.get(o.id)!.next} noun="납기" /> : "—") },
                  { key: "amount", title: "금액", render: (o) => <PriceGate>{formatWon(orderTotals.get(o.id)?.amount ?? null)}</PriceGate> },
                ]}
                mobileRow={(o) => ({ title: o.customer_po_no, subtitle: `${formatDate(o.order_date)} · ${orderTotals.get(o.id)?.lines ?? 0}줄`, trailing: <StatusTag {...statusOf("sales_orders.status", o.status)} /> })}
                empty={{ kind: "empty", compact: true, title: "수주가 없어요" }}
              />
            </SectionCard>
          )}
          {isModuleOn("mfg-quality") && (
            <SectionCard title="클레임" actions={<SensitivityTag level="L2" />}>
              <DataTable<CustomerClaim>
                resource="customer_claims"
                ariaLabel="이 거래처의 클레임"
                syncWithLocation={false}
                filters={[{ field: "partner_id", operator: "eq", value: partner.id }]}
                sorters={[{ field: "received_on", order: "desc" }]}
                rowHref={(c) => `/ops/quality/claims/${c.id}`}
                columns={[
                  { key: "claim_no", title: "클레임 번호", kind: "name" },
                  { key: "item_id", title: "품목", render: (c) => itemById.get(c.item_id)?.name ?? "—" },
                  { key: "received_on", title: "접수일", kind: "date" },
                  { key: "qty_affected", title: "수량", kind: "number", unit: "개" },
                  { key: "status", title: "상태", kind: "status", statusDomain: "customer_claims.status" },
                  { key: "report_8d_due", title: "8D 기한", render: (c) => (c.status === "closed" ? formatDate(c.report_8d_due) : <DdayBadge date={c.report_8d_due} />) },
                ]}
                mobileRow={(c) => ({ title: c.claim_no, subtitle: `${itemById.get(c.item_id)?.name ?? "—"} · ${formatNumber(c.qty_affected)}개`, trailing: <StatusTag {...statusOf("customer_claims.status", c.status)} /> })}
                empty={{ kind: "empty", compact: true, title: "클레임이 없어요" }}
              />
            </SectionCard>
          )}
          {crm && (
            <>
              <SectionCard title="영업 기회" demo caption={hasBundle("view_prices") && openAmount > 0 ? `진행 중 예상 금액 합계 ${formatWonKorean(openAmount)}` : undefined}>
                <DataTable<Opportunity>
                  resource="opportunities"
                  ariaLabel="이 거래처의 영업 기회"
                  syncWithLocation={false}
                  filters={[{ field: "partner_id", operator: "eq", value: partner.id }]}
                  sorters={[{ field: "expected_on", order: "asc" }]}
                  rowHref={(o) => `/ops/sales?selected=${o.id}`}
                  columns={[
                    { key: "title", title: "영업 기회", kind: "name" },
                    { key: "stage", title: "단계", kind: "status", statusDomain: "opportunities.stage" },
                    { key: "owner_id", title: "담당", kind: "person" },
                    { key: "expected_on", title: "예상 시기", kind: "date" },
                    { key: "amount_krw", title: "금액", kind: "price" },
                  ]}
                  mobileRow={(o) => ({ title: o.title, subtitle: `${person(o.owner_id)?.displayName ?? "—"} · ${formatDate(o.expected_on)}`, trailing: <StatusTag {...statusOf("opportunities.stage", o.stage)} /> })}
                  empty={{ kind: "empty", compact: true, title: "영업 기회가 없어요" }}
                />
              </SectionCard>
              <SectionCard title="견적" demo>
                <DataTable<Quote>
                  resource="quotes"
                  ariaLabel="이 거래처의 견적"
                  syncWithLocation={false}
                  filters={[{ field: "partner_id", operator: "eq", value: partner.id }]}
                  sorters={[{ field: "quote_no", order: "desc" }]}
                  rowHref={(q) => `/ops/sales/quotes?selected=${q.id}`}
                  columns={[
                    { key: "quote_no", title: "견적 번호", kind: "name" },
                    { key: "status", title: "상태", kind: "status", statusDomain: "quotes.status" },
                    { key: "amount_krw", title: "금액", kind: "price" },
                    { key: "issued_on", title: "발행일", kind: "date" },
                    { key: "valid_until", title: "유효 기한", kind: "date" },
                  ]}
                  mobileRow={(q) => ({ title: q.quote_no, subtitle: q.issued_on ? `${formatDate(q.issued_on)} 발행` : "발행 전", trailing: <StatusTag {...statusOf("quotes.status", q.status)} /> })}
                  empty={{ kind: "empty", compact: true, title: "견적이 없어요" }}
                />
              </SectionCard>
            </>
          )}
        </div>
      )}

      <PartnerFormDrawer open={modal === "partner"} onClose={() => setModal(null)} partner={partner} />
      <ContactFormDrawer open={modal === "contact"} onClose={() => setModal(null)} partners={allPartners.rows.length ? allPartners.rows : [partner]} partnerId={partner.id} />
    </>
  );
}
