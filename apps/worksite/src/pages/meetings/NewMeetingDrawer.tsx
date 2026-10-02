// 회의 기록 추가 서랍(W-07) — 목록 화면이 처음 열 때 불러와요(lazyDrawer)
import { useEffect } from "react";
import { Button, DatePicker, Form, Input, InputNumber, Select } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useNavigate } from "react-router";
import { DetailDrawer } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { useCreate } from "@/lib/refine";
import { kstIso } from "@/lib/clock";
import { optionsOf } from "@/lib/status";
import type { Meeting } from "@/types/entities";
import { MEETING_PREFIXES, MFG_MEETING_PREFIXES, useStructure } from "../task-detail/lib";

interface NewMeeting { prefix?: string | null; title: string; at: Dayjs; min: number; type: Meeting["meeting_type"]; projects: string[]; attendees: string[]; summary?: string }

export function NewMeetingDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { tenant, persona, today } = useWorksite();
  const nav = useNavigate();
  const st = useStructure();
  const [form] = Form.useForm<NewMeeting>();
  const { mutateAsync, mutation } = useCreate<Meeting>();
  const isMfg = tenant.packs.includes("manufacturing");
  useEffect(() => {
    if (open) { form.resetFields(); form.setFieldsValue({ at: dayjs(`${today}T10:00`), min: 30, type: isMfg ? "production" : "internal_regular", attendees: [persona.memberId], projects: [] }); }
  }, [open, form, today, isMfg, persona.memberId]);
  const save = async () => {
    const v = await form.validateFields();
    const projects = v.projects ?? [];
    const sens = projects.some((id) => st.projectById.get(id)?.sensitivity === "L2") ? "L2" : "L1";
    const prefix = v.prefix || null;
    const res = await mutateAsync({
      resource: "meetings",
      values: {
        title: prefix ? `${prefix} ${v.title.trim()}` : v.title.trim(), title_prefix: prefix, meeting_type: v.type, project_ids: projects,
        started_at: kstIso(v.at.format("YYYY-MM-DD"), v.at.format("HH:mm")), duration_min: v.min, attendee_ids: v.attendees, source: "manual",
        transcript_ref: null, summary: v.summary?.trim() || null, sensitivity: sens, status: "needs_review",
      },
      successNotification: () => ({ type: "success", message: "회의 기록을 추가했어요" }),
    });
    onClose();
    if (res?.data?.id) nav(`/meetings/${res.data.id}`);
  };
  const prefixes = isMfg ? MFG_MEETING_PREFIXES : MEETING_PREFIXES;
  const typeOptions = optionsOf("meetings.meeting_type").filter((o) => isMfg ? ["production", "quality", "planning", "review", "other"].includes(o.value) : !["production", "quality"].includes(o.value));
  return (
    <DetailDrawer open={open} onClose={onClose} title="회의 기록 추가" footer={<Button type="primary" loading={mutation.isPending} onClick={() => void save().catch(() => undefined)}>추가하기</Button>}>
      <Form form={form} layout="vertical" className="wk-form" requiredMark={false} disabled={mutation.isPending}>
        <Form.Item name="prefix" label="접두어" extra={isMfg ? "회사 정례 회의는 접두어 없이 둬도 돼요" : "회의 분류 체계 6종 중 하나를 골라요"}
          rules={isMfg ? [] : [{ required: true, message: "접두어를 골라 주세요" }]}>
          <Select allowClear={isMfg} options={prefixes.map((p) => ({ value: p, label: p }))} placeholder={isMfg ? "접두어 없음" : "접두어 고르기"} />
        </Form.Item>
        <Form.Item name="title" label="제목" rules={[{ required: true, message: "회의 제목을 적어 주세요" }]}><Input maxLength={60} placeholder="예: 주간 생산회의" /></Form.Item>
        <Form.Item name="at" label="일시" rules={[{ required: true, message: "일시를 골라 주세요" }]}>
          <DatePicker showTime={{ format: "HH:mm", minuteStep: 5 }} format="YYYY-MM-DD HH:mm" style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="min" label="길이(분)" rules={[{ required: true, message: "길이를 적어 주세요" }]}><InputNumber min={5} max={480} step={5} style={{ width: "100%" }} /></Form.Item>
        <Form.Item name="type" label="회의 유형"><Select options={typeOptions} /></Form.Item>
        <Form.Item name="projects" label="프로젝트" extra="L2 프로젝트를 고르면 회의도 L2가 돼요">
          <Select mode="multiple" showSearch optionFilterProp="label" options={st.projects.map((p) => ({ value: p.id, label: p.name }))} placeholder="프로젝트 고르기" />
        </Form.Item>
        <Form.Item name="attendees" label="참석자" rules={[{ required: true, message: "참석자를 골라 주세요" }]}>
          <Select mode="multiple" showSearch optionFilterProp="label" options={tenant.people.map((p) => ({ value: p.id, label: p.displayName }))} />
        </Form.Item>
        <Form.Item name="summary" label="요약"><Input.TextArea rows={3} maxLength={500} placeholder="결정과 할 일을 중심으로 적어요" /></Form.Item>
        <p className="wk-caption">녹음·전사 연결(Plaud·클로바노트)은 2단계에서 열려요. 지금은 직접 적은 기록만 남아요.</p>
      </Form>
    </DetailDrawer>
  );
}

