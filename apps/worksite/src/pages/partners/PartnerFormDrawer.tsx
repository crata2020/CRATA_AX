// 거래처 등록·수정 서랍(I-01 · I-02가 함께 씀). 단가·계약 조건 칸은 두지 않습니다(L2).
import { useEffect } from "react";
import { Button, Form, Input, Select } from "antd";
import { useNavigate } from "react-router";
import { DetailDrawer } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { useCreate, useUpdate } from "@/lib/refine";
import { optionsOf } from "@/lib/status";
import type { Partner } from "@/types/entities";

interface Values { kind: Partner["kind"]; name: string; biz_reg_no?: string; owner_member_id: string; status: Partner["status"]; tags?: string[]; note?: string }

export function PartnerFormDrawer({ open, onClose, partner }: { open: boolean; onClose: () => void; partner?: Partner | null }) {
  const { tenant, persona } = useWorksite();
  const nav = useNavigate();
  const [form] = Form.useForm<Values>();
  const { mutateAsync: create, mutation: createM } = useCreate<Partner>();
  const { mutateAsync: update, mutation: updateM } = useUpdate<Partner>();
  const busy = createM.isPending || updateM.isPending;

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (partner) form.setFieldsValue({ kind: partner.kind, name: partner.name, biz_reg_no: partner.biz_reg_no ?? undefined, owner_member_id: partner.owner_member_id, status: partner.status, tags: partner.tags, note: partner.note ?? undefined });
    else form.setFieldsValue({ kind: "customer", status: "prospect", owner_member_id: persona.memberId, tags: [] });
  }, [open, partner, form, persona.memberId]);

  const save = async () => {
    const v = await form.validateFields();
    const values = { kind: v.kind, name: v.name.trim(), biz_reg_no: v.biz_reg_no?.trim() || null, owner_member_id: v.owner_member_id, status: v.status, tags: v.tags ?? [], note: v.note?.trim() || null };
    if (partner) {
      await update({ resource: "partners", id: partner.id, values, successNotification: () => ({ type: "success", message: "거래처 정보를 고쳤어요" }) });
      onClose();
    } else {
      const res = await create({ resource: "partners", values: { ...values, external_ids: null }, successNotification: () => ({ type: "success", message: "거래처를 등록했어요" }) });
      onClose();
      if (res?.data?.id) nav(`/projects/partners/${res.data.id}`);
    }
  };

  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      title={partner ? "거래처 수정" : "거래처 등록"}
      closeLabel="취소"
      footer={<Button type="primary" loading={busy} onClick={save}>{partner ? "저장하기" : "등록하기"}</Button>}
    >
      <Form form={form} layout="vertical" requiredMark="optional" onFinish={save}>
        <Form.Item name="kind" label="종류" rules={[{ required: true, message: "종류를 골라 주세요" }]}>
          <Select options={optionsOf("partners.kind")} />
        </Form.Item>
        <Form.Item name="name" label="거래처 이름" rules={[{ required: true, whitespace: true, message: "이름을 적어 주세요" }]} extra="데모에서는 '예시…' 형식으로 적어 주세요.">
          <Input maxLength={60} placeholder="예시정밀(주)" />
        </Form.Item>
        <Form.Item name="biz_reg_no" label="사업자번호" extra="데모에서는 비워 두세요.">
          <Input maxLength={20} />
        </Form.Item>
        <Form.Item name="owner_member_id" label="담당" rules={[{ required: true, message: "담당을 골라 주세요" }]}>
          <Select showSearch optionFilterProp="label" options={tenant.people.map((p) => ({ value: p.id, label: `${p.displayName} · ${p.jobTitle}` }))} />
        </Form.Item>
        <Form.Item name="status" label="상태">
          <Select options={optionsOf("partners.status")} />
        </Form.Item>
        <Form.Item name="tags" label="태그">
          <Select mode="tags" placeholder="예: 양산, 배기계" tokenSeparators={[","]} />
        </Form.Item>
        <Form.Item name="note" label="메모">
          <Input.TextArea rows={3} maxLength={200} showCount />
        </Form.Item>
      </Form>
    </DetailDrawer>
  );
}
