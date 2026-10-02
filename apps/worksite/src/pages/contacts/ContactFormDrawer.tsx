// 거래처 담당자 추가·수정 서랍(I-02 · I-03이 함께 씀). 이름·연락처는 모두 가상(메일 @example.com, 전화 000-0000-0xxx).
import { useEffect } from "react";
import { Button, Form, Input, Select, Switch } from "antd";
import { DetailDrawer } from "@/components";
import { useCreate, useUpdate } from "@/lib/refine";
import type { Partner, PartnerContact } from "@/types/entities";

interface Values { partner_id: string; name: string; dept?: string; title?: string; email: string; phone?: string; is_primary?: boolean }

export function ContactFormDrawer({ open, onClose, contact, partners, partnerId }: {
  open: boolean; onClose: () => void; contact?: PartnerContact | null; partners: Partner[]; partnerId?: string;
}) {
  const [form] = Form.useForm<Values>();
  const { mutateAsync: create, mutation: createM } = useCreate<PartnerContact>();
  const { mutateAsync: update, mutation: updateM } = useUpdate<PartnerContact>();
  const busy = createM.isPending || updateM.isPending;

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (contact) form.setFieldsValue({ partner_id: contact.partner_id, name: contact.name, dept: contact.dept ?? undefined, title: contact.title ?? undefined, email: contact.email, phone: contact.phone ?? undefined, is_primary: contact.is_primary });
    else form.setFieldsValue({ partner_id: partnerId, is_primary: false });
  }, [open, contact, partnerId, form]);

  const save = async () => {
    const v = await form.validateFields();
    const values = { partner_id: v.partner_id, name: v.name.trim(), dept: v.dept?.trim() || null, title: v.title?.trim() || null, email: v.email.trim(), phone: v.phone?.trim() || null, is_primary: !!v.is_primary };
    if (contact) await update({ resource: "partner_contacts", id: contact.id, values, successNotification: () => ({ type: "success", message: "담당자 정보를 고쳤어요" }) });
    else await create({ resource: "partner_contacts", values, successNotification: () => ({ type: "success", message: "담당자를 추가했어요" }) });
    onClose();
  };

  return (
    <DetailDrawer open={open} onClose={onClose} title={contact ? "담당자 수정" : "담당자 추가"} closeLabel="취소" footer={<Button type="primary" loading={busy} onClick={save}>{contact ? "저장하기" : "추가하기"}</Button>}>
      <Form form={form} layout="vertical" requiredMark="optional">
        <Form.Item name="partner_id" label="거래처" rules={[{ required: true, message: "거래처를 골라 주세요" }]}>
          <Select showSearch optionFilterProp="label" options={partners.map((p) => ({ value: p.id, label: p.name }))} disabled={!!partnerId && !contact} />
        </Form.Item>
        <Form.Item name="name" label="이름" rules={[{ required: true, whitespace: true, message: "이름을 적어 주세요" }]} extra="데모에서는 '담당자 A(예시)'처럼 가상 이름을 써 주세요.">
          <Input maxLength={40} />
        </Form.Item>
        <Form.Item name="dept" label="부서"><Input maxLength={40} /></Form.Item>
        <Form.Item name="title" label="직함"><Input maxLength={40} /></Form.Item>
        <Form.Item name="email" label="메일" rules={[{ required: true, type: "email", message: "메일 주소를 확인해 주세요" }, { pattern: /@example\.com$/, message: "데모에서는 @example.com 주소만 써요" }]}>
          <Input maxLength={80} placeholder="name@example.com" inputMode="email" />
        </Form.Item>
        <Form.Item name="phone" label="전화" rules={[{ pattern: /^000-0000-0\d{3}$/, message: "데모에서는 000-0000-0xxx 형식만 써요" }]}>
          <Input maxLength={13} placeholder="000-0000-0123" inputMode="tel" />
        </Form.Item>
        <Form.Item name="is_primary" label="주 담당" valuePropName="checked"><Switch /></Form.Item>
      </Form>
    </DetailDrawer>
  );
}
