// 영업 파이프라인 `/ops/sales` · I-04 · 깊이 A · 모듈 edu-sales · CRATA 전용 · 소유: industry 그룹
// 문의 → 요구 확인 → 제안·견적 → 협상 → 수주 칸반(실패·보류는 접어 둠). 금액은 view_prices 권한자만 보여요.
// 끌어놓기 없이 카드의 [이동] 메뉴로 옮깁니다. 수주로 옮기기는 검토자·대표만(구성원은 작성까지).
import { useEffect, useMemo } from "react";
import { Link } from "react-router";
import { Button, DatePicker, Form, Input, InputNumber, Select } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import {
  DemoDataBadge, DetailDrawer, Divider, EmptyState, KanbanBoard, ListRows, PageHeader, PersonChip, PriceGate, StatusTag, type KanbanColumn,
} from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { usePageReady } from "@/app/pageReady";
import { useCreate, useUpdate } from "@/lib/refine";
import { useSelectedParam, useUrlParam } from "@/lib/url";
import { formatDate, formatWonKorean } from "@/lib/format";
import { labelOf, statusOf, type StatusValue } from "@/lib/status";
import type { Opportunity, Partner, Quote } from "@/types/entities";
import { asRow, periodStart, useIndex, useRows } from "../ops-home/kit/data";
import { Kv } from "../ops-home/kit/ui";
import "../ops-home/kit/industry.css";

type Stage = StatusValue<"opportunities.stage">;
const COLUMNS: KanbanColumn[] = [
  { key: "inquiry", label: "문의", tone: "neutral" },
  { key: "needs", label: "요구 확인", tone: "neutral" },
  { key: "proposal", label: "제안·견적", tone: "info" },
  { key: "negotiation", label: "협상", tone: "info" },
  { key: "won", label: "수주", tone: "good" },
  { key: "lost", label: "실패·보류", tone: "neutral", collapsed: true },
];
const OPEN: Stage[] = ["inquiry", "needs", "proposal", "negotiation"];

interface NewValues { title: string; partner_id: string; owner_id: string; expected_on?: Dayjs | null; amount_krw?: number | null }

export default function Page() {
  const { can, hasBundle, persona, tenant, today, person } = useWorksite();
  const [period] = useUrlParam("period", "month");
  const [selected, setSelected] = useSelectedParam();
  const opps = useRows<Opportunity>("opportunities", { sorters: [{ field: "expected_on", order: "asc" }] });
  const partners = useRows<Partner>("partners", { sorters: [{ field: "name", order: "asc" }] });
  const quotes = useRows<Quote>("quotes");
  usePageReady(!opps.isLoading);
  const partnerById = useIndex(partners.rows);
  const { mutateAsync: update } = useUpdate<Opportunity>();
  const { mutateAsync: create, mutation: createM } = useCreate<Opportunity>();
  const [form] = Form.useForm<NewValues>();
  const showPrices = hasBundle("view_prices");
  const canCreate = can("opportunities", "create").can;

  const start = periodStart(today, period === "quarter" ? "quarter" : "month");
  const periodLabel = period === "quarter" ? "이번 분기" : "이번 달";
  const items = useMemo(() => opps.rows.filter((o) => OPEN.includes(o.stage) || (o.expected_on ?? "") >= start), [opps.rows, start]);
  const open = opps.rows.filter((o) => OPEN.includes(o.stage));
  const wonInPeriod = opps.rows.filter((o) => o.stage === "won" && (o.expected_on ?? "") >= start);
  const openAmount = open.reduce((t, o) => t + (o.amount_krw ?? 0), 0);
  const quoteCount = useMemo(() => {
    const m = new Map<string, Quote[]>();
    for (const q of quotes.rows) m.set(q.opportunity_id, [...(m.get(q.opportunity_id) ?? []), q]);
    return m;
  }, [quotes.rows]);

  const current = selected && selected !== "new" ? opps.rows.find((o) => o.id === selected) ?? null : null;

  useEffect(() => {
    if (selected !== "new") return;
    form.resetFields();
    form.setFieldsValue({ owner_id: persona.memberId, expected_on: dayjs(today).add(30, "day") });
  }, [selected, form, persona.memberId, today]);

  const canMove = (o: Opportunity, to: string): { ok: true } | { ok: false; reason: string } => {
    const c = can("opportunities", "edit", asRow(o));
    if (!c.can) return { ok: false, reason: "영업 기회는 보기만 할 수 있어요" };
    if (to === "won" && persona.role === "member") return { ok: false, reason: "수주 확정은 검토자가 해요" };
    if (o.stage === "won" && persona.role === "member") return { ok: false, reason: "수주된 기회는 검토자가 옮길 수 있어요" };
    return { ok: true };
  };
  const onMove = async (o: Opportunity, to: string) => {
    await update({
      resource: "opportunities", id: o.id, values: { stage: to },
      successNotification: () => ({ type: "success", message: `'${o.title}'을(를) ${labelOf("opportunities.stage", to)} 단계로 옮겼어요` }),
    });
  };

  const save = async () => {
    const v = await form.validateFields();
    const res = await create({
      resource: "opportunities",
      values: { title: v.title.trim(), partner_id: v.partner_id, owner_id: v.owner_id, stage: "inquiry", expected_on: v.expected_on ? v.expected_on.format("YYYY-MM-DD") : null, amount_krw: showPrices ? v.amount_krw ?? null : null },
      successNotification: () => ({ type: "success", message: "영업 기회를 문의 단계에 올렸어요" }),
    });
    setSelected(res?.data?.id ? String(res.data.id) : null);
  };

  const card = (o: Opportunity) => {
    const qs = quoteCount.get(o.id) ?? [];
    return (
      <>
        <button type="button" className="in-kcard-title" onClick={() => setSelected(o.id)}>{o.title}</button>
        <div className="in-kcard-meta">
          <span>{partnerById.get(o.partner_id)?.name ?? "—"}</span>
        </div>
        <div className="in-kcard-meta">
          <PersonChip memberId={o.owner_id} size="sm" />
          {/* 끝난 기회(수주·실패)는 '예상'이 아니라 결과로 */}
          <span>{o.stage === "won" ? (o.expected_on ? `${formatDate(o.expected_on, false)} 수주` : "수주") : o.stage === "lost" ? "실패·보류" : o.expected_on ? `${formatDate(o.expected_on, false)} 예상` : "시기 미정"}</span>
        </div>
        <div className="in-kcard-meta">
          <PriceGate><span className="in-strong">{formatWonKorean(o.amount_krw)}</span></PriceGate>
          {qs.length > 0 && <span className="ws-tag">견적 {qs.length}</span>}
        </div>
      </>
    );
  };

  return (
    <>
      <PageHeader
        title="영업 파이프라인"
        description="문의가 오면 올리고, 단계마다 카드의 [이동]으로 옮겨요."
        period={{ ariaLabel: "기간", urlParam: "period", value: period === "quarter" ? "quarter" : "month", onChange: () => undefined, options: [{ value: "month", label: "이번 달" }, { value: "quarter", label: "이번 분기" }] }}
        actions={canCreate ? <Button type="primary" icon={<PlusOutlined />} onClick={() => setSelected("new")}>영업 기회</Button> : undefined}
      />
      {!opps.isLoading && opps.rows.length === 0 ? (
        <EmptyState kind="empty" title="아직 영업 기회가 없어요" description="문의가 오면 여기에 올려요." action={canCreate ? { label: "영업 기회 올리기", onClick: () => setSelected("new") } : undefined} />
      ) : (
        <>
          <ul className="in-summary" aria-label="요약">
            <li>진행 중 <strong>{open.length}</strong>건</li>
            <li>{periodLabel} 수주 <strong>{wonInPeriod.length}</strong>건</li>
            {showPrices && <li>예상 금액 합계 <strong>{formatWonKorean(openAmount)}</strong></li>}
            <li><DemoDataBadge variant="inline" /></li>
          </ul>
          <KanbanBoard<Opportunity>
            ariaLabel="영업 파이프라인"
            columns={COLUMNS}
            items={items}
            getColumn={(o) => o.stage}
            getId={(o) => o.id}
            getTitle={(o) => o.title}
            renderCard={card}
            canMove={canMove}
            onMove={onMove}
          />
          <p className="in-caption in-mt">수주·실패 열은 {periodLabel} 예상 시기인 것만 보여요. 금액은 권한이 있는 사람만 볼 수 있어요.</p>
        </>
      )}

      <DetailDrawer
        open={!!current}
        onClose={() => setSelected(null)}
        title={current?.title ?? "영업 기회"}
        extra={current ? <StatusTag {...statusOf("opportunities.stage", current.stage)} /> : undefined}
        footer={<Link to="/ops/sales/quotes"><Button>견적 목록 보기</Button></Link>}
      >
        {current && (
          <div className="in-stack">
            <Kv rows={[
              ["거래처", <Link className="in-link" to={`/projects/partners/${current.partner_id}`}>{partnerById.get(current.partner_id)?.name ?? "—"}</Link>],
              ["단계", <StatusTag {...statusOf("opportunities.stage", current.stage)} />],
              ["담당", <PersonChip memberId={current.owner_id} size="sm" />],
              [current.stage === "won" ? "수주 시기" : "예상 시기", current.expected_on ? formatDate(current.expected_on) : "미정"],
              ["금액", <PriceGate>{formatWonKorean(current.amount_krw)}</PriceGate>],
              ["올린 날", formatDate(current.created_at)],
            ]} />
            <Divider />
            <h3 className="in-sub--sm">견적 {quoteCount.get(current.id)?.length ?? 0}건</h3>
            <ListRows
              ariaLabel="이 기회의 견적"
              empty={<p className="in-note">아직 견적이 없어요. 제안·견적 단계에서 견적서를 만들어요.</p>}
              rows={(quoteCount.get(current.id) ?? []).map((q) => ({
                key: q.id, title: q.quote_no, subtitle: q.issued_on ? `${formatDate(q.issued_on)} 발행` : "발행 전", to: `/ops/sales/quotes?selected=${q.id}`,
                trailing: <StatusTag {...statusOf("quotes.status", q.status)} />,
              }))}
            />
            <p className="in-caption">담당 {person(current.owner_id)?.jobTitle ?? ""} · {tenant.displayName} 내부 기록이에요.</p>
          </div>
        )}
      </DetailDrawer>

      <DetailDrawer
        open={selected === "new"}
        onClose={() => setSelected(null)}
        title="영업 기회 올리기"
        closeLabel="취소"
        footer={<Button type="primary" loading={createM.isPending} onClick={save}>올리기</Button>}
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item name="title" label="이름" rules={[{ required: true, whitespace: true, message: "이름을 적어 주세요" }]}>
            <Input maxLength={60} placeholder="예: 예시기업 AI 워크숍 문의" />
          </Form.Item>
          <Form.Item name="partner_id" label="거래처" rules={[{ required: true, message: "거래처를 골라 주세요" }]}>
            <Select showSearch optionFilterProp="label" options={partners.rows.filter((p) => p.kind !== "vendor" && p.kind !== "supplier").map((p) => ({ value: p.id, label: p.name }))} />
          </Form.Item>
          <Form.Item name="owner_id" label="담당" rules={[{ required: true, message: "담당을 골라 주세요" }]}>
            <Select options={tenant.people.map((p) => ({ value: p.id, label: `${p.displayName} · ${p.jobTitle}` }))} />
          </Form.Item>
          <Form.Item name="expected_on" label="예상 시기">
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>
          {showPrices ? (
            <Form.Item name="amount_krw" label="예상 금액(원)">
              <InputNumber<number> style={{ width: "100%" }} min={0} step={100000} inputMode="numeric" formatter={(v) => `${v ?? ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} parser={(v) => Number((v ?? "").replace(/,/g, ""))} />
            </Form.Item>
          ) : (
            <p className="in-caption">금액은 권한이 있는 사람이 넣어요.</p>
          )}
        </Form>
      </DetailDrawer>
    </>
  );
}
