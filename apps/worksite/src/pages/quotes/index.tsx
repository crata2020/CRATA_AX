// 견적 `/ops/sales/quotes` · I-05 · 깊이 B · 모듈 edu-sales · CRATA 전용 · 소유: industry 그룹
// CRM 라이트의 Quotes: 견적 목록과 발송 처리(검토자 이상: 작성 중 → 발송). 견적서는 산출물이라 고친 내용이 작성 규칙 후보로 쌓여요.
import { useMemo } from "react";
import { Link } from "react-router";
import { Button } from "antd";
import { FileTextOutlined, SendOutlined } from "@ant-design/icons";
import {
  AiTag, DataTable, DdayBadge, DetailDrawer, Divider, EmptyState, FilterBar, PageHeader, PriceGate, StatusTag, useFilterBarState, type FilterBarProps, DisabledAction,
} from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { useUpdate, type CrudFilter } from "@/lib/refine";
import { useSelectedParam } from "@/lib/url";
import { addDays } from "@/lib/clock";
import { formatDate, formatWonKorean } from "@/lib/format";
import { optionsOf, statusOf } from "@/lib/status";
import type { Artifact, Opportunity, Partner, Quote } from "@/types/entities";
import { asRow, periodStart, useIndex, useModuleRows, useRows } from "../ops-home/kit/data";
import { Kv } from "../ops-home/kit/ui";
import "../ops-home/kit/industry.css";

export default function Page() {
  const { can, today } = useWorksite();
  const [selected, setSelected] = useSelectedParam();
  const partners = useRows<Partner>("partners", { sorters: [{ field: "name", order: "asc" }] });
  const opps = useRows<Opportunity>("opportunities");
  const quotes = useRows<Quote>("quotes");
  const artifactIds = useMemo(() => quotes.rows.map((q) => q.artifact_id).filter((x): x is string => !!x), [quotes.rows]);
  const artifacts = useModuleRows<Artifact>("documents", "artifacts", { filters: [{ field: "id", operator: "in", value: artifactIds.length ? artifactIds : ["__none__"] }], enabled: artifactIds.length > 0 });
  const partnerById = useIndex(partners.rows);
  const oppById = useIndex(opps.rows);
  const artById = useIndex(artifacts.rows);
  const { mutateAsync: update, mutation } = useUpdate<Quote>();

  const fbProps: FilterBarProps = {
    chips: [
      { param: "status", field: "status", options: optionsOf("quotes.status"), multiple: true, ariaLabel: "상태" },
      { param: "period", options: [{ value: "month", label: "이번 달 발행" }, { value: "quarter", label: "이번 분기 발행" }], ariaLabel: "기간", allLabel: "전체 기간" },
    ],
    selects: [{ param: "partner", label: "거래처", field: "partner_id", options: partners.rows.map((p) => ({ value: p.id, label: p.name })) }],
  };
  const fb = useFilterBarState(fbProps);
  const filters = useMemo<CrudFilter[]>(() => {
    const p = fb.values.period;
    return p ? [...fb.filters, { field: "issued_on", operator: "gte", value: periodStart(today, p) }] : fb.filters;
  }, [fb.filters, fb.values.period, today]);

  const current = selected ? quotes.rows.find((q) => q.id === selected) ?? null : null;
  const approve = current ? can("quotes", "approve", asRow(current)) : { can: false };
  const art = current?.artifact_id ? artById.get(current.artifact_id) : undefined;

  const send = async (q: Quote) => {
    await update({
      resource: "quotes", id: q.id, values: { status: "sent", issued_on: q.issued_on ?? today, valid_until: q.valid_until ?? addDays(today, 30) },
      successNotification: () => ({ type: "success", message: `${q.quote_no}을(를) 발송 처리했어요` }),
    });
  };

  const artifactCell = (q: Quote) => {
    const a = q.artifact_id ? artById.get(q.artifact_id) : undefined;
    if (!a) return <span className="in-caption">연결 전</span>;
    return <Link className="in-link" to={`/docs/artifacts/${a.id}`} onClick={(e) => e.stopPropagation()}><FileTextOutlined aria-hidden /> 견적서</Link>;
  };

  return (
    <>
      <PageHeader title="견적" description="견적서도 산출물이에요. 고친 내용은 작성 규칙 후보로 쌓여요." />
      <FilterBar {...fbProps} />
      <DataTable<Quote>
        resource="quotes"
        ariaLabel="견적 목록"
        filters={filters}
        isFiltered={fb.active}
        onClearFilters={fb.clear}
        sorters={[{ field: "quote_no", order: "desc" }]}
        onRowClick={(q) => setSelected(q.id)}
        columns={[
          { key: "quote_no", title: "견적 번호", kind: "name" },
          { key: "opportunity_id", title: "영업 기회", render: (q) => oppById.get(q.opportunity_id)?.title ?? "—" },
          { key: "partner_id", title: "거래처", render: (q) => partnerById.get(q.partner_id)?.name ?? "—" },
          { key: "status", title: "상태", kind: "status", statusDomain: "quotes.status" },
          { key: "amount_krw", title: "금액", kind: "price" },
          { key: "discount_rate", title: "할인율", render: (q) => <PriceGate>{q.discount_rate == null ? "—" : `${q.discount_rate}%`}</PriceGate> },
          { key: "issued_on", title: "발행일", kind: "date" },
          { key: "valid_until", title: "유효 기한", render: (q) => (q.status === "sent" ? <DdayBadge date={q.valid_until} noun="만료" /> : formatDate(q.valid_until)) },
          { key: "artifact_id", title: "견적서", render: artifactCell },
        ]}
        mobileRow={(q) => ({
          title: `${q.quote_no} · ${partnerById.get(q.partner_id)?.name ?? ""}`,
          subtitle: `${oppById.get(q.opportunity_id)?.title ?? "—"} · ${q.issued_on ? `${formatDate(q.issued_on, false)} 발행` : "발행 전"}`,
          trailing: <StatusTag {...statusOf("quotes.status", q.status)} />,
        })}
        empty={{ kind: "empty", title: "아직 견적이 없어요", description: "영업 기회가 제안·견적 단계로 가면 견적을 만들어요.", action: { label: "영업 파이프라인 보기", to: "/ops/sales" } }}
      />

      <DetailDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={current ? `견적 ${current.quote_no}` : "견적"}
        extra={current ? <StatusTag {...statusOf("quotes.status", current.status)} /> : undefined}
        footer={current?.status === "draft" ? (
          approve.can
            ? <Button type="primary" icon={<SendOutlined />} loading={mutation.isPending} onClick={() => void send(current)}>발송 처리하기</Button>
            : <DisabledAction label="발송 처리하기" reason={"발송 처리는 검토자 이상이 해요"}><Button type="primary" icon={<SendOutlined />} disabled>발송 처리하기</Button></DisabledAction>
        ) : undefined}
      >
        {quotes.isLoading ? null : current ? (
          <div className="in-stack">
            <Kv rows={[
              ["영업 기회", <Link className="in-link" to={`/ops/sales?selected=${current.opportunity_id}`}>{oppById.get(current.opportunity_id)?.title ?? "—"}</Link>],
              ["거래처", <Link className="in-link" to={`/projects/partners/${current.partner_id}`}>{partnerById.get(current.partner_id)?.name ?? "—"}</Link>],
              ["금액", <PriceGate>{formatWonKorean(current.amount_krw)}</PriceGate>],
              ["할인율", <PriceGate>{current.discount_rate == null ? "—" : `${current.discount_rate}%`}</PriceGate>],
              ["발행일", current.issued_on ? formatDate(current.issued_on) : "발행 전"],
              ["유효 기한", current.valid_until ? formatDate(current.valid_until) : "—"],
            ]} />
            <Divider />
            <h3 className="in-sub--sm">견적서</h3>
            {art ? (
              <div className="in-row">
                <Link className="in-link" to={`/docs/artifacts/${art.id}`}><FileTextOutlined aria-hidden /> {art.title}</Link>
                {art.ai_generated && <AiTag kind="draft" />}
              </div>
            ) : (
              <p className="in-note">아직 연결된 견적서가 없어요. 견적서를 산출물로 만들면 여기에 이어져요.</p>
            )}
            <p className="in-caption">견적서를 고치면 고친 내용이 작성 규칙 후보로 쌓여요.</p>
          </div>
        ) : (
          <EmptyState kind="not_found" compact />
        )}
      </DetailDrawer>
    </>
  );
}
