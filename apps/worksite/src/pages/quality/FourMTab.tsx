// 품질 현황 > 4M 변경 탭(I-11): 목록 + 4M 변경 신청(작성 중) + 고객 승인 결과 입력(검토자 이상).
import { useEffect } from "react";
import { Button, DatePicker, Form, Input, Select, Switch } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { DataTable, DetailDrawer, Divider, EmptyState, FilterBar, PersonChip, SensitivityTag, StatusTag, useFilterBarState, type FilterBarProps } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { useCreate, useUpdate } from "@/lib/refine";
import { useSelectedParam } from "@/lib/url";
import { formatDate } from "@/lib/format";
import { labelOf, optionsOf, statusOf } from "@/lib/status";
import type { ChangeRequest4M, Item } from "@/types/entities";
import { asRow, useIndex, useModuleRows, useRows } from "../ops-home/kit/data";
import { Kv } from "../ops-home/kit/ui";

interface NewValues { category: ChangeRequest4M["category"]; description: string; affected_item_ids?: string[]; reason: string; customer_notice_required?: boolean; ppap_required?: boolean; effective_on?: Dayjs | null }

export function FourMTab() {
  const { can, today, persona } = useWorksite();
  const [selected, setSelected] = useSelectedParam();
  const items = useModuleRows<Item>("mfg-master-data", "items");
  const itemById = useIndex(items.rows);
  const list = useRows<ChangeRequest4M>("change_requests_4m");
  const current = selected && selected !== "new" ? list.rows.find((c) => c.id === selected) ?? null : null;
  const canCreate = can("change_requests_4m", "create").can;
  const canApprove = current ? can("change_requests_4m", "approve", asRow(current)).can : false;
  const { mutateAsync: update, mutation: upM } = useUpdate<ChangeRequest4M>();
  const { mutateAsync: create, mutation: crM } = useCreate<ChangeRequest4M>();
  const [form] = Form.useForm<NewValues>();

  const fbProps: FilterBarProps = {
    chips: [
      { param: "status", field: "status", options: optionsOf("change_requests_4m.status"), multiple: true, ariaLabel: "상태" },
      { param: "category", field: "category", options: optionsOf("change_requests_4m.category"), ariaLabel: "분류" },
    ],
  };
  const fb = useFilterBarState(fbProps);

  useEffect(() => {
    if (selected !== "new") return;
    form.resetFields();
    form.setFieldsValue({ category: "method", customer_notice_required: true, ppap_required: false, effective_on: dayjs(today).add(14, "day") });
  }, [selected, form, today]);

  const itemNos = (ids: string[]) => ids.map((id) => itemById.get(id)?.item_no ?? "—").join(", ") || "—";
  const approvalCell = (c: ChangeRequest4M) => (c.status === "drafting" ? <span className="in-caption">신청 전</span> : <StatusTag {...statusOf("change_requests_4m.customer_approval_status", c.customer_approval_status)} />);

  const add = async () => {
    const v = await form.validateFields();
    const year = today.slice(0, 4);
    const n = list.rows.filter((c) => c.change_no.startsWith(`CR4M-${year}-`)).length + 1;
    await create({
      resource: "change_requests_4m",
      values: {
        change_no: `CR4M-${year}-${String(n).padStart(2, "0")}`, category: v.category, description: v.description.trim(), affected_item_ids: v.affected_item_ids ?? [], reason: v.reason.trim(),
        risk_note: null, customer_notice_required: !!v.customer_notice_required, customer_approval_status: v.customer_notice_required ? "requested" : "not_required", ppap_required: !!v.ppap_required,
        initial_lot_no: null, effective_on: v.effective_on ? v.effective_on.format("YYYY-MM-DD") : null, status: "drafting", requested_by: persona.memberId, requested_on: today,
      },
      successNotification: () => ({ type: "success", message: "4M 변경 신청서를 작성 중으로 만들었어요" }),
    });
    setSelected(null);
  };
  const patch = async (values: Partial<ChangeRequest4M>, message: string) => {
    if (!current) return;
    await update({ resource: "change_requests_4m", id: current.id, values, successNotification: () => ({ type: "success", message }) });
    setSelected(null);
  };

  const footer = (() => {
    if (!current || !canApprove) return undefined;
    if (current.status === "drafting") return <Button type="primary" loading={upM.isPending} onClick={() => void patch(current.customer_notice_required ? { status: "waiting_customer", customer_approval_status: "requested" } : { status: "in_review" }, current.customer_notice_required ? "고객 승인을 요청했어요" : "검토로 넘겼어요")}>{current.customer_notice_required ? "고객 승인 요청하기" : "검토로 넘기기"}</Button>;
    if (current.status === "waiting_customer") return (
      <>
        <Button loading={upM.isPending} onClick={() => void patch({ customer_approval_status: "rejected", status: "in_review" }, "고객 반려로 기록했어요")}>반려됨</Button>
        <Button type="primary" loading={upM.isPending} onClick={() => void patch({ customer_approval_status: "approved", status: "effective" }, "고객 승인으로 기록했어요. 적용 상태가 됐어요.")}>승인 받음</Button>
      </>
    );
    if (current.status === "in_review") return <Button type="primary" loading={upM.isPending} onClick={() => void patch({ status: "effective" }, "적용으로 바꿨어요")}>적용하기</Button>;
    if (current.status === "effective") return <Button loading={upM.isPending} onClick={() => void patch({ status: "closed" }, "완료로 바꿨어요")}>완료하기</Button>;
    return undefined;
  })();

  return (
    <>
      <FilterBar {...fbProps} right={canCreate ? <Button icon={<PlusOutlined />} onClick={() => setSelected("new")}>4M 변경 신청</Button> : undefined} />
      <DataTable<ChangeRequest4M>
        resource="change_requests_4m"
        ariaLabel="4M 변경 목록"
        filters={fb.filters}
        isFiltered={fb.active}
        onClearFilters={fb.clear}
        syncWithLocation={false}
        sorters={[{ field: "requested_on", order: "desc" }]}
        onRowClick={(c) => setSelected(c.id)}
        columns={[
          { key: "change_no", title: "번호", kind: "name" },
          { key: "category", title: "분류", render: (c) => <span className="ws-tag">{labelOf("change_requests_4m.category", c.category)}</span> },
          { key: "description", title: "내용" },
          { key: "affected_item_ids", title: "영향 품목", render: (c) => itemNos(c.affected_item_ids) },
          { key: "customer_approval_status", title: "고객 승인", render: approvalCell },
          { key: "effective_on", title: "적용일", kind: "date" },
          { key: "status", title: "상태", kind: "status", statusDomain: "change_requests_4m.status" },
        ]}
        mobileRow={(c) => ({ title: `${c.change_no} · ${c.description}`, subtitle: `${labelOf("change_requests_4m.category", c.category)} · ${itemNos(c.affected_item_ids)}`, trailing: <StatusTag {...statusOf("change_requests_4m.status", c.status)} /> })}
        empty={{ kind: "empty", title: "4M 변경이 없어요", description: "사람·설비·재료·방법을 바꿀 때 신청서를 만들어요." }}
      />

      <DetailDrawer open={!!current} onClose={() => setSelected(null)} title={current ? `${current.change_no} 4M 변경` : "4M 변경"} extra={current ? <StatusTag {...statusOf("change_requests_4m.status", current.status)} /> : undefined} footer={footer}>
        {current ? (
          <div className="in-stack">
            <Kv rows={[
              ["분류", labelOf("change_requests_4m.category", current.category)],
              ["내용", current.description],
              ["영향 품목", itemNos(current.affected_item_ids)],
              ["사유", current.reason],
              ["위험 메모", current.risk_note],
              ["고객 통보", current.customer_notice_required ? "필요" : "필요 없음"],
              ["고객 승인", approvalCell(current)],
              ["초품 승인", current.ppap_required ? "필요" : "필요 없음"],
              ["적용(예정)일", current.effective_on ? formatDate(current.effective_on) : null],
              ["신청", <span className="in-row"><PersonChip memberId={current.requested_by} size="sm" />{formatDate(current.requested_on)}</span>],
            ]} />
            <Divider />
            <p className="in-caption"><SensitivityTag level="L2" /> 4M 서류는 고객 비밀 정보예요.{!canApprove ? " 승인 결과는 검토자 이상이 입력해요." : ""}</p>
          </div>
        ) : list.isLoading ? null : selected && selected !== "new" ? <EmptyState kind="not_found" compact /> : null}
      </DetailDrawer>

      <DetailDrawer open={selected === "new"} onClose={() => setSelected(null)} title="4M 변경 신청" closeLabel="취소" footer={<Button type="primary" loading={crM.isPending} onClick={() => void add()}>작성하기</Button>}>
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item name="category" label="분류" rules={[{ required: true }]}><Select options={optionsOf("change_requests_4m.category")} /></Form.Item>
          <Form.Item name="description" label="내용" rules={[{ required: true, whitespace: true, message: "무엇을 바꾸는지 적어 주세요" }]}><Input maxLength={80} placeholder="예: KN-07 편조 조건표 개정" /></Form.Item>
          <Form.Item name="affected_item_ids" label="영향 품목">
            <Select mode="multiple" showSearch optionFilterProp="label" options={items.rows.map((i) => ({ value: i.id, label: `${i.item_no} · ${i.name}` }))} />
          </Form.Item>
          <Form.Item name="reason" label="사유" rules={[{ required: true, whitespace: true, message: "사유를 적어 주세요" }]}><Input.TextArea rows={2} maxLength={200} /></Form.Item>
          <Form.Item name="customer_notice_required" label="고객 통보 필요" valuePropName="checked"><Switch /></Form.Item>
          <Form.Item name="ppap_required" label="초품 승인 필요" valuePropName="checked"><Switch /></Form.Item>
          <Form.Item name="effective_on" label="적용 예정일"><DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" /></Form.Item>
        </Form>
      </DetailDrawer>
    </>
  );
}
