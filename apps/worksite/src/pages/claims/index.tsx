// 클레임·8D `/ops/quality/claims` · I-12 · 깊이 A · 모듈 mfg-quality · TR 전용 · 소유: industry 그룹
// 고객 클레임 목록과 D0~D8 다섯 열 8D 보드. 모든 행은 고객 비밀(L2)이에요.
// 접수(rpc:create_claim)와 보드 이동(rpc:move_claim_column)은 검토자 이상, 구성원은 보기만.
import { useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { Button, DatePicker, Form, Input, InputNumber, Select } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { DataTable, DdayBadge, DetailDrawer, EmptyState, KanbanBoard, PageHeader, SensitivityTag, StatusTag, type KanbanColumn } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { usePageReady } from "@/app/pageReady";
import { useRpc } from "@/lib/refine";
import { useSelectedParam, useUrlParam } from "@/lib/url";
import { ddayInfo, formatDate, formatNumber } from "@/lib/format";
import { labelOf, optionsOf, statusOf } from "@/lib/status";
import type { CorrectiveAction, CustomerClaim } from "@/types/entities";
import { useMfgLookups, useRows } from "../ops-home/kit/data";
import { BOARD_COLUMNS, STEP_NAME, columnOf, currentStep, shortTitle } from "./shared";
import "../ops-home/kit/industry.css";

interface NewValues { partnerId: string; itemId: string; customerRefNo?: string; qty: number; lots?: string; description: string; severity: string; containmentDue?: Dayjs | null; reportDue?: Dayjs | null }

export default function Page() {
  const { can, today } = useWorksite();
  const nav = useNavigate();
  const [view] = useUrlParam("view", "list");
  const [selected, setSelected] = useSelectedParam();
  const lk = useMfgLookups();
  const claims = useRows<CustomerClaim>("customer_claims", { sorters: [{ field: "received_on", order: "desc" }] });
  const cas = useRows<CorrectiveAction>("corrective_actions", { filters: [{ field: "related_type", operator: "eq", value: "claim" }] });
  usePageReady(!claims.isLoading);
  const canApprove = can("customer_claims", "approve").can;
  const caByClaim = useMemo(() => new Map(cas.rows.map((c) => [c.related_id, c])), [cas.rows]);
  const stepOf = (c: CustomerClaim) => currentStep(caByClaim.get(c.id));
  const create = useRpc<{ ok: boolean; id: string; claimNo: string }>("create_claim", { successMessage: "클레임을 접수했어요. 품질보증 담당에게 알렸어요." });
  const move = useRpc("move_claim_column");
  const [form] = Form.useForm<NewValues>();
  const partnerId = Form.useWatch("partnerId", form);

  useEffect(() => {
    if (selected !== "new") return;
    form.resetFields();
    form.setFieldsValue({ severity: "medium", containmentDue: dayjs(today).add(1, "day"), reportDue: dayjs(today).add(14, "day") });
  }, [selected, form, today]);

  const columns: KanbanColumn[] = BOARD_COLUMNS.map((c, i) => ({ key: c.key, label: c.label, tone: i === 4 ? "good" : i >= 2 ? "info" : "neutral" }));
  const colIndex = (key: string) => BOARD_COLUMNS.findIndex((c) => c.key === key);
  const canMove = (c: CustomerClaim, to: string): { ok: true } | { ok: false; reason: string } => {
    if (!canApprove) return { ok: false, reason: "8D 단계는 검토자 이상이 옮겨요" };
    if (c.status === "closed") return { ok: false, reason: "종결된 클레임이에요" };
    if (colIndex(to) < colIndex(columnOf(stepOf(c)?.step))) return { ok: false, reason: "지난 단계로는 옮길 수 없어요" };
    return { ok: true };
  };

  const save = async () => {
    const v = await form.validateFields();
    const res = await create.run({
      partnerId: v.partnerId, itemId: v.itemId, customerRefNo: v.customerRefNo, qty: v.qty, lots: (v.lots ?? "").split(/[,\s]+/).filter(Boolean),
      description: v.description, severity: v.severity, containmentDue: v.containmentDue?.format("YYYY-MM-DD") ?? null, reportDue: v.reportDue?.format("YYYY-MM-DD") ?? null,
    });
    setSelected(null);
    if (res?.id) nav(`/ops/quality/claims/${res.id}`);
  };

  const itemName = (id: string) => lk.item.get(id)?.name ?? "—";
  const partnerName = (id: string) => lk.partner.get(id)?.name ?? "—";
  const stepTag = (c: CustomerClaim) => {
    const s = stepOf(c);
    if (!s) return <StatusTag tone="good" label="8D 완료" />;
    return <StatusTag tone={s.status === "doing" ? "info" : "neutral"} label={`${s.step} ${STEP_NAME[s.step]}`} />;
  };

  return (
    <>
      <PageHeader
        title="클레임·8D"
        description="클레임마다 8D 단계를 끝까지 따라가요."
        meta={<><SensitivityTag level="L2" /><span>AI 초안은 국내 처리 경로가 열린 뒤에만 써요.</span></>}
        period={{ ariaLabel: "보기", urlParam: "view", value: "list", onChange: () => undefined, options: [{ value: "list", label: "목록" }, { value: "board", label: "8D 보드" }] }}
        actions={canApprove ? <Button type="primary" icon={<PlusOutlined />} onClick={() => setSelected("new")}>클레임 접수</Button> : undefined}
      />
      {view === "board" ? (
        claims.isLoading ? null : claims.rows.length ? (
          <KanbanBoard<CustomerClaim>
            ariaLabel="8D 보드"
            columns={columns}
            items={claims.rows}
            getColumn={(c) => (c.status === "closed" ? "d78" : columnOf(stepOf(c)?.step))}
            getId={(c) => c.id}
            getTitle={(c) => c.claim_no}
            canMove={canMove}
            onMove={async (c, to) => { await move.run({ claimId: c.id, column: to }); }}
            renderCard={(c) => (
              <>
                <Link className="in-kcard-title" to={`/ops/quality/claims/${c.id}`}>{c.claim_no} · {shortTitle(c.description)}</Link>
                <div className="in-kcard-meta"><span>{partnerName(c.partner_id)}</span><span>{itemName(c.item_id)}</span></div>
                <div className="in-kcard-meta">
                  {stepTag(c)}
                  {c.status !== "closed" ? <DdayBadge date={c.report_8d_due} noun="8D 기한" /> : <StatusTag {...statusOf("customer_claims.status", c.status)} />}
                </div>
              </>
            )}
          />
        ) : <EmptyState kind="empty" title="진행 중인 클레임이 없어요" description="고객 클레임이 오면 접수해서 8D로 따라가요." />
      ) : (
        <DataTable<CustomerClaim>
          resource="customer_claims"
          ariaLabel="고객 클레임 목록"
          sorters={[{ field: "received_on", order: "desc" }]}
          rowHref={(c) => `/ops/quality/claims/${c.id}`}
          columns={[
            { key: "claim_no", title: "클레임 번호", kind: "name", width: 116 },
            { key: "partner_id", title: "고객", width: 140, render: (c) => <span className="ws-ellipsis">{partnerName(c.partner_id)}</span> },
            { key: "item_id", title: "품목", flex: true, render: (c) => <span className="ws-ellipsis" title={itemName(c.item_id)}>{itemName(c.item_id)}</span> },
            { key: "received_on", title: "접수일", kind: "date", width: 120 },
            { key: "qty_affected", title: "수량", kind: "number", unit: "개", width: 88 },
            { key: "severity", title: "심각도", width: 80, render: (c) => <span className="ws-tag">{labelOf("customer_claims.severity", c.severity)}</span> },
            { key: "step", title: "현재 단계", width: 140, render: stepTag },
            { key: "containment_due", title: "임시 조치 기한", low: true, width: 132, render: (c) => (c.status === "received" ? <DdayBadge date={c.containment_due} /> : formatDate(c.containment_due)) },
            { key: "report_8d_due", title: "8D 기한", width: 124, render: (c) => (c.status === "closed" ? formatDate(c.report_8d_due) : <DdayBadge date={c.report_8d_due} />) },
            { key: "status", title: "상태", kind: "status", statusDomain: "customer_claims.status", width: 112 },
            { key: "l2", title: "등급", low: true, width: 120, render: () => <SensitivityTag level="L2" /> },
          ]}
          // 현장에서 보는 두 가지(지금 8D 단계 · 8D 기한)를 먼저. 고객·수량은 그 뒤
          mobileRow={(c) => {
            const s = stepOf(c);
            const step = s ? `${s.step} ${STEP_NAME[s.step]}` : "8D 완료";
            const due = c.status !== "closed" && c.report_8d_due ? ddayInfo(c.report_8d_due, today, "8D 기한").label : null;
            return {
              title: `${c.claim_no} · ${shortTitle(c.description)}`,
              subtitle: [step, due, partnerName(c.partner_id), `${formatNumber(c.qty_affected)}개`].filter(Boolean).join(" · "),
              trailing: <StatusTag {...statusOf("customer_claims.status", c.status)} />,
            };
          }}
          empty={{ kind: "empty", title: "진행 중인 클레임이 없어요", description: "고객 클레임이 오면 접수해서 8D로 따라가요.", action: canApprove ? { label: "클레임 접수하기", onClick: () => setSelected("new") } : undefined }}
        />
      )}

      <DetailDrawer open={selected === "new"} onClose={() => setSelected(null)} title="클레임 접수" closeLabel="취소" footer={<Button type="primary" loading={create.isPending} onClick={() => void save()}>접수하기</Button>}>
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item name="partnerId" label="고객" rules={[{ required: true, message: "고객을 골라 주세요" }]}>
            <Select options={lk.partners.filter((p) => p.kind === "customer").map((p) => ({ value: p.id, label: p.name }))} onChange={() => form.setFieldValue("itemId", undefined)} />
          </Form.Item>
          <Form.Item name="itemId" label="품목" rules={[{ required: true, message: "품목을 골라 주세요" }]}>
            <Select showSearch optionFilterProp="label" options={lk.items.filter((i) => i.kind !== "raw" && (!partnerId || i.partner_id === partnerId)).map((i) => ({ value: i.id, label: `${i.item_no} · ${i.name}` }))} />
          </Form.Item>
          <Form.Item name="customerRefNo" label="고객 참조번호"><Input maxLength={40} /></Form.Item>
          <Form.Item name="qty" label="수량(개)" rules={[{ required: true, message: "수량을 적어 주세요" }]}><InputNumber<number> min={1} style={{ width: "100%" }} inputMode="numeric" /></Form.Item>
          <Form.Item name="lots" label="LOT(쉼표로 나눠 적기)"><Input placeholder="예: S-260916-012" /></Form.Item>
          <Form.Item name="description" label="내용" rules={[{ required: true, whitespace: true, message: "내용을 적어 주세요" }]}><Input.TextArea rows={3} maxLength={300} showCount /></Form.Item>
          <Form.Item name="severity" label="심각도"><Select options={optionsOf("customer_claims.severity")} /></Form.Item>
          <Form.Item name="containmentDue" label="임시 조치 기한"><DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" /></Form.Item>
          <Form.Item name="reportDue" label="8D 기한"><DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" /></Form.Item>
          <p className="in-caption"><SensitivityTag level="L2" /> 클레임 원문은 고객 비밀이에요. 국내 저장소에만 둬요.</p>
        </Form>
      </DetailDrawer>
    </>
  );
}
