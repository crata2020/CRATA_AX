// 공지 쓰기 서랍(C-08 ?selected=new). 저장은 rpc:create_notice(공지 + 대상에게 알림, 필독이면 notice_must_read).
// 검토자는 대상이 본인 조직·참여 프로젝트로 제한되고, 전체 공지·고정은 관리자만 해요.
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { Button, DatePicker, Form, Input, Select, Switch } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { DetailDrawer, SegmentedPills } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { useRpc } from "@/lib/refine";
import { optionsOf, type StatusValue } from "@/lib/status";
import { Caption, isAdminish, useProjects } from "../docs/shared/lib";

type AudienceType = "all" | "unit" | "role" | "project";
interface Values {
  category: StatusValue<"notices.category">; title: string; body: string; audienceType: AudienceType; audienceIds?: string[];
  must_read: boolean; pinned: boolean; published?: Dayjs | null; expires?: Dayjs | null;
}

export function NoticeComposeDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { persona, tenant, today } = useWorksite();
  const nav = useNavigate();
  const [form] = Form.useForm<Values>();
  const admin = isAdminish(persona);
  const { projects } = useProjects(open);
  const audienceType = (Form.useWatch("audienceType", form) as AudienceType | undefined) ?? (admin ? "all" : "unit");
  const { run, isPending } = useRpc<{ ok: boolean; noticeId: string; notified: number }>("create_notice", { successMessage: "공지를 올렸어요. 대상에게 알렸어요" });

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue({
      category: "general", audienceType: admin ? "all" : "unit", audienceIds: admin ? [] : [persona.unitId], must_read: false, pinned: false, published: dayjs(today),
    });
  }, [open, form, admin, persona.unitId, today]);

  const myProjects = projects.filter((p) => admin || p.owner_member_id === persona.memberId || p.reviewer_member_id === persona.memberId || p.member_ids.includes(persona.memberId));
  const idOptions = audienceType === "unit"
    ? tenant.orgUnits.filter((u) => admin || u.id === persona.unitId).map((u) => ({ value: u.id, label: u.name }))
    : audienceType === "role" ? tenant.roles.map((r) => ({ value: r.code, label: r.title }))
      : audienceType === "project" ? myProjects.map((p) => ({ value: p.id, label: p.name })) : [];

  const typeOptions: { value: AudienceType; label: string }[] = admin
    ? [{ value: "all", label: "전체" }, { value: "unit", label: "조직" }, { value: "role", label: "역할" }, { value: "project", label: "프로젝트" }]
    : [{ value: "unit", label: "내 조직" }, { value: "project", label: "참여 프로젝트" }];

  const submit = async () => {
    const v = await form.validateFields();
    const res = await run({
      category: v.category, title: v.title, body: v.body, must_read: v.must_read, pinned: admin ? v.pinned : false,
      audience: v.audienceType === "all" ? { type: "all" } : { type: v.audienceType, ids: v.audienceIds ?? [] },
      published_on: v.published ? v.published.format("YYYY-MM-DD") : null, expires_on: v.expires ? v.expires.format("YYYY-MM-DD") : null,
    });
    onClose();
    if (res?.noticeId) nav(`/company/notices/${res.noticeId}`);
  };

  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      title="공지 쓰기"
      footer={<Button type="primary" loading={isPending} onClick={() => void submit().catch(() => undefined)}>올리기</Button>}
    >
      <Form form={form} layout="vertical" className="cb-form" requiredMark={false} disabled={isPending}>
        <Form.Item name="category" label="분류" rules={[{ required: true }]}>
          <Select options={optionsOf("notices.category")} />
        </Form.Item>
        <Form.Item name="title" label="제목" rules={[{ required: true, message: "제목을 적어 주세요" }, { min: 2, message: "두 글자 이상 적어 주세요" }]}>
          <Input maxLength={60} placeholder="예: 10월 정기 안전교육 일정" />
        </Form.Item>
        <Form.Item name="body" label="본문" rules={[{ required: true, message: "본문을 적어 주세요" }]} extra="일반 글자만 써요. 파일은 회사 저장소 링크로 남겨요.">
          <Input.TextArea rows={6} maxLength={1000} showCount />
        </Form.Item>
        <Form.Item name="audienceType" hidden><Input /></Form.Item>
        <Form.Item label="대상" extra={admin ? undefined : "검토자는 내 조직이나 참여 프로젝트에만 공지할 수 있어요."}>
          <SegmentedPills<AudienceType>
            ariaLabel="공지 대상"
            options={typeOptions}
            value={audienceType}
            onChange={(v) => form.setFieldsValue({ audienceType: v, audienceIds: v === "unit" && !admin ? [persona.unitId] : [] })}
          />
        </Form.Item>
        {audienceType !== "all" && (
          <Form.Item name="audienceIds" label="대상 고르기" rules={[{ required: true, type: "array", min: 1, message: "대상을 하나 이상 골라 주세요" }]}>
            <Select mode="multiple" options={idOptions} placeholder="대상 고르기" optionFilterProp="label" />
          </Form.Item>
        )}
        <Form.Item name="must_read" label="필독" valuePropName="checked" extra="필독이면 대상자가 '확인했어요'를 눌러요. 확인 여부는 평가에 쓰지 않아요.">
          <Switch />
        </Form.Item>
        {admin && (
          <Form.Item name="pinned" label="맨 위에 고정" valuePropName="checked">
            <Switch />
          </Form.Item>
        )}
        <Form.Item name="published" label="게시일">
          <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" allowClear={false} disabledDate={(d) => d.isBefore(dayjs(today), "day")} />
        </Form.Item>
        <Form.Item name="expires" label="만료일" extra="만료일이 지나면 목록에서 내려가요(작성자·관리자는 계속 봐요).">
          <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" disabledDate={(d) => d.isBefore(dayjs(today), "day")} />
        </Form.Item>
        <Caption>올리면 대상에게 알림이 가요.</Caption>
      </Form>
    </DetailDrawer>
  );
}
