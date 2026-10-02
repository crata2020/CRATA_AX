// 프로젝트 만들기·고치기 서랍(W-01 · W-02가 함께 씀). 코드는 {사업코드}-{연도}-{순번}으로 자동 제안합니다.
import { useEffect } from "react";
import { Button, DatePicker, Form, Input, Select } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useNavigate } from "react-router";
import { DetailDrawer } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { useCreate, useList, useUpdate } from "@/lib/refine";
import type { Partner, Project } from "@/types/entities";
import { useStructure } from "../task-detail/lib";
import "../task-detail/work.css";

interface Values {
  business_line_id: string; name: string; code: string; aliases?: string; partner_id?: string | null; owner_member_id: string; reviewer_member_id: string;
  period?: [Dayjs, Dayjs] | null; sensitivity: "L0" | "L1" | "L2"; description?: string;
}

export interface ProjectFormDrawerProps {
  open: boolean;
  onClose: () => void;
  /** 고칠 프로젝트(없으면 만들기) */
  project?: Project | null;
  /** 만들 때 기본 사업 */
  lineId?: string;
}

export function ProjectFormDrawer({ open, onClose, project, lineId }: ProjectFormDrawerProps) {
  const { tenant, today } = useWorksite();
  const nav = useNavigate();
  const [form] = Form.useForm<Values>();
  const st = useStructure();
  const partners = useList<Partner>({ resource: "partners", pagination: { mode: "off" }, queryOptions: { enabled: open } });
  const { mutateAsync: create, mutation: createM } = useCreate<Project>();
  const { mutateAsync: update, mutation: updateM } = useUpdate<Project>();
  const busy = createM.isPending || updateM.isPending;
  const line = Form.useWatch("business_line_id", form) as string | undefined;

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (project) {
      form.setFieldsValue({
        business_line_id: project.business_line_id, name: project.name, code: project.code, aliases: project.aliases.join(", "), partner_id: project.partner_id,
        owner_member_id: project.owner_member_id, reviewer_member_id: project.reviewer_member_id, period: [dayjs(project.start_on), dayjs(project.due_on)],
        sensitivity: project.sensitivity, description: project.description,
      });
    } else {
      form.setFieldsValue({ business_line_id: lineId, sensitivity: "L1", period: [dayjs(today), dayjs(today).add(3, "month")] });
    }
  }, [open, project, lineId, form, today]);

  // 코드 자동 제안(만들 때만)
  useEffect(() => {
    if (!open || project || !line) return;
    const bl = st.lineById.get(line);
    if (!bl) return;
    const year = today.slice(0, 4);
    const n = st.projects.filter((p) => p.business_line_id === line).length + 1;
    form.setFieldValue("code", `${bl.code}-${year}-${String(n).padStart(2, "0")}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, project?.id, line, st.projects.length]);

  const people = tenant.people.map((p) => ({ value: p.id, label: `${p.displayName} · ${p.jobTitle}` }));
  const reviewerCodes = new Set(tenant.roles.filter((r) => r.platformRole !== "member").map((r) => r.code));
  const reviewers = tenant.people.filter((p) => reviewerCodes.has(p.roleCode)).map((p) => ({ value: p.id, label: `${p.displayName} · ${p.jobTitle}` }));

  const save = async () => {
    const v = await form.validateFields();
    const values = {
      business_line_id: v.business_line_id, name: v.name.trim(), code: v.code.trim(),
      aliases: (v.aliases ?? "").split(",").map((s) => s.trim()).filter(Boolean), partner_id: v.partner_id ?? null,
      owner_member_id: v.owner_member_id, reviewer_member_id: v.reviewer_member_id,
      start_on: v.period?.[0]?.format("YYYY-MM-DD") ?? today, due_on: v.period?.[1]?.format("YYYY-MM-DD") ?? today,
      sensitivity: v.sensitivity, description: v.description?.trim() ?? "",
    };
    if (project) {
      await update({ resource: "projects", id: project.id, values, successNotification: () => ({ type: "success", message: "프로젝트를 고쳤어요" }) });
      onClose();
    } else {
      const res = await create({
        resource: "projects",
        values: { ...values, status: "planned", health: "good", member_ids: [...new Set([v.owner_member_id, v.reviewer_member_id])] },
        successNotification: () => ({ type: "success", message: "프로젝트를 만들었어요" }),
      });
      onClose();
      if (res?.data?.id) nav(`/projects/${res.data.id}`);
    }
  };

  return (
    <DetailDrawer open={open} onClose={onClose} title={project ? "프로젝트 고치기" : "프로젝트 만들기"}
      footer={<Button type="primary" loading={busy} onClick={() => void save().catch(() => undefined)}>{project ? "저장하기" : "만들기"}</Button>}>
      <Form form={form} layout="vertical" className="wk-form" requiredMark={false} disabled={busy}>
        <Form.Item name="business_line_id" label="사업" rules={[{ required: true, message: "사업을 골라 주세요" }]}>
          <Select options={st.lines.map((l) => ({ value: l.id, label: `${l.name} · ${l.code}` }))} placeholder="사업 고르기" />
        </Form.Item>
        <Form.Item name="name" label="이름" rules={[{ required: true, message: "프로젝트 이름을 적어 주세요" }]}>
          <Input maxLength={60} placeholder="예: 예시기관 연수 운영" />
        </Form.Item>
        <Form.Item name="code" label="코드" extra="회의 분류에 쓰는 코드예요. 사업 코드-연도-순번으로 제안해요" rules={[{ required: true, message: "코드를 적어 주세요" }, { pattern: /^[A-Z0-9-]+$/, message: "영문 대문자·숫자·하이픈만 써요" }]}>
          <Input maxLength={32} className="ws-tabular" />
        </Form.Item>
        <Form.Item name="aliases" label="별칭" extra="쉼표로 나눠 적어요. 회의·메일에서 이 이름이 나오면 이 프로젝트로 분류해요">
          <Input placeholder="예: 임원 특강, 9월 특강" />
        </Form.Item>
        <Form.Item name="partner_id" label="거래처">
          <Select allowClear showSearch optionFilterProp="label" placeholder="거래처 고르기" options={(partners.result?.data ?? []).map((p) => ({ value: p.id, label: p.name }))} />
        </Form.Item>
        <Form.Item name="owner_member_id" label="담당" rules={[{ required: true, message: "담당을 골라 주세요" }]}>
          <Select showSearch optionFilterProp="label" options={people} placeholder="담당 고르기" />
        </Form.Item>
        <Form.Item name="reviewer_member_id" label="검토자" rules={[{ required: true, message: "검토자를 골라 주세요" }]}>
          <Select showSearch optionFilterProp="label" options={reviewers} placeholder="검토자 고르기" />
        </Form.Item>
        <Form.Item name="period" label="시작·마감" rules={[{ required: true, message: "기간을 골라 주세요" }]}>
          <DatePicker.RangePicker style={{ width: "100%" }} format="YYYY-MM-DD" placeholder={["시작", "마감"]} />
        </Form.Item>
        <Form.Item name="sensitivity" label="민감도" extra="L2는 참여자만 볼 수 있어요(고객 비밀·기관 협의)">
          <Select options={[{ value: "L0", label: "L0 공개" }, { value: "L1", label: "L1 내부" }, { value: "L2", label: "L2 고객 비밀(국내에서만 처리)" }]} />
        </Form.Item>
        <Form.Item name="description" label="설명">
          <Input.TextArea rows={3} maxLength={300} />
        </Form.Item>
      </Form>
    </DetailDrawer>
  );
}
