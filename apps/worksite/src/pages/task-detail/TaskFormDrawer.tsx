// 업무 만들기 서랍(W-03 · W-04 · W-02 업무 탭이 함께 씀). 검토자는 배분 규칙으로 자동 제안하고 "자동 제안"을 표시합니다.
// 저장은 rpc:create_task(행 생성 + 담당자 알림 task_assigned).
import { useEffect, useMemo, useState } from "react";
import { AutoComplete, Button, DatePicker, Form, Input, Select } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useNavigate } from "react-router";
import { DetailDrawer } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { useList, useRpc } from "@/lib/refine";
import { kstIso } from "@/lib/clock";
import { optionsOf } from "@/lib/status";
import type { AssignmentRule, Part, Project } from "@/types/entities";
import { FREE_TASK_TYPES, TASK_TYPES, joinDescription, useStructure } from "./lib";
import "./work.css";

interface FormValues {
  title: string; body?: string; criteria?: string; project_id: string; part_id?: string | null; task_type?: string | null;
  assignee_id: string; reviewer_id: string; due?: Dayjs | null; priority: "high" | "normal" | "low"; sensitivity: "L0" | "L1" | "L2";
}

export interface TaskFormDrawerProps {
  open: boolean;
  onClose: () => void;
  /** 프로젝트 고정(W-02 업무 탭) */
  projectId?: string;
  /** 만든 뒤 업무 상세로 이동(기본 true) */
  goToDetail?: boolean;
}

/** 배분 규칙(사람이 읽는 문장)으로 검토자 제안: 조건 문장에 사업 이름이 있으면 그 규칙의 검토자 직함과 같은 사람 */
function suggestReviewer(rules: AssignmentRule[], lineName: string | undefined, project: Project | undefined, people: { id: string; jobTitle: string }[]) {
  const rule = lineName ? rules.find((r) => r.active && r.condition.includes(lineName)) : undefined;
  if (rule) {
    const who = people.find((p) => p.jobTitle === rule.reviewer_rule) ?? people.find((p) => rule.reviewer_rule.includes(p.jobTitle));
    if (who) return { id: who.id, why: `배분 규칙 "${rule.name}"` };
  }
  if (project) return { id: project.reviewer_member_id, why: "프로젝트 검토자" };
  return null;
}

export function TaskFormDrawer({ open, onClose, projectId, goToDetail = true }: TaskFormDrawerProps) {
  const { tenant, persona, today } = useWorksite();
  const nav = useNavigate();
  const [form] = Form.useForm<FormValues>();
  const { run, isPending } = useRpc<{ ok: boolean; taskId: string }>("create_task", { successMessage: "업무를 만들었어요. 담당자에게 알렸어요." });
  const st = useStructure();
  const rules = useList<AssignmentRule>({ resource: "assignment_rules", pagination: { mode: "off" }, queryOptions: { enabled: open } });
  const selectedProject = Form.useWatch("project_id", form) as string | undefined;
  const reviewerValue = Form.useWatch("reviewer_id", form) as string | undefined;
  const parts = useList<Part>({ resource: "parts", pagination: { mode: "off" }, filters: [{ field: "project_id", operator: "eq", value: selectedProject ?? "" }], queryOptions: { enabled: open && !!selectedProject } });
  const [suggestion, setSuggestion] = useState<{ id: string; why: string } | null>(null);

  const isMfg = tenant.packs.includes("manufacturing");
  const people = tenant.people;
  const reviewerIds = new Set(tenant.roles.filter((r) => r.platformRole !== "member").map((r) => r.code));
  const reviewerOptions = people.filter((p) => reviewerIds.has(p.roleCode)).map((p) => ({ value: p.id, label: `${p.displayName} · ${p.jobTitle}` }));
  const peopleOptions = people.map((p) => ({ value: p.id, label: `${p.displayName} · ${p.jobTitle}` }));

  const project = selectedProject ? st.projectById.get(selectedProject) : undefined;
  const line = project ? st.lineById.get(project.business_line_id) : undefined;
  const typeOptions = useMemo(() => {
    if (isMfg) return FREE_TASK_TYPES.map((t) => ({ value: t, label: t }));
    const list = line ? TASK_TYPES[line.code] ?? [] : Object.values(TASK_TYPES).flat();
    return list.map((t) => ({ value: t.code, label: t.name }));
  }, [isMfg, line]);

  // 열 때 초기값
  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue({ project_id: projectId, priority: "normal", sensitivity: "L1", assignee_id: undefined, due: dayjs(today).add(7, "day") });
    setSuggestion(null);
  }, [open, projectId, form, today]);

  // 프로젝트를 고르면 민감도·검토자 제안
  useEffect(() => {
    if (!open || !project) return;
    const s = suggestReviewer(rules.result?.data ?? [], line?.name, project, people);
    setSuggestion(s);
    form.setFieldsValue({ sensitivity: project.sensitivity, part_id: null, task_type: null, ...(s ? { reviewer_id: s.id } : {}) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, project?.id, rules.result]);

  const submit = async () => {
    const v = await form.validateFields();
    const res = await run({
      title: v.title, description: joinDescription(v.body ?? "", v.criteria ?? ""), project_id: v.project_id, part_id: v.part_id ?? null,
      task_type: v.task_type || null, assignee_id: v.assignee_id, reviewer_id: v.reviewer_id,
      due_at: v.due ? kstIso(v.due.format("YYYY-MM-DD"), "18:00") : null, priority: v.priority, sensitivity: v.sensitivity,
    });
    onClose();
    if (goToDetail && res?.taskId) nav(`/work/tasks/${res.taskId}`);
  };

  const projectOptions = st.projects.filter((p) => p.status !== "done").map((p) => ({ value: p.id, label: `${p.name} · ${p.code}` }));

  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      title="업무 만들기"
      footer={<Button type="primary" loading={isPending} onClick={() => void submit().catch(() => undefined)}>만들기</Button>}
    >
      <Form form={form} layout="vertical" className="wk-form" requiredMark={false} disabled={isPending}>
        <Form.Item name="title" label="제목" rules={[{ required: true, message: "업무 제목을 적어 주세요" }, { min: 2, message: "두 글자 이상 적어 주세요" }]}>
          <Input placeholder="예: 특강 교안 1차 슬라이드" maxLength={80} />
        </Form.Item>
        <Form.Item name="body" label="설명">
          <Input.TextArea rows={3} placeholder="무엇을 왜 하는지 한두 문장으로 적어요" maxLength={500} />
        </Form.Item>
        <Form.Item name="criteria" label="완료 기준" extra="여러 개면 가운뎃점(·)으로 나눠 적어요">
          <Input placeholder="예: 모듈별 슬라이드 · 실습 안내 쪽" maxLength={200} />
        </Form.Item>
        <Form.Item name="project_id" label="프로젝트" rules={[{ required: true, message: "프로젝트를 골라 주세요" }]}>
          <Select showSearch optionFilterProp="label" options={projectOptions} disabled={!!projectId} placeholder="프로젝트 고르기" loading={st.isLoading} />
        </Form.Item>
        <Form.Item name="part_id" label="파트">
          <Select allowClear placeholder={(parts.result?.data ?? []).length ? "파트 고르기" : "이 프로젝트에는 파트가 없어요"} disabled={!selectedProject || !(parts.result?.data ?? []).length}
            options={(parts.result?.data ?? []).map((p) => ({ value: p.id, label: p.name }))} />
        </Form.Item>
        <Form.Item name="task_type" label="업무 유형" extra={isMfg ? "자유롭게 적거나 목록에서 골라요" : "회의 분류 체계의 업무 유형이에요"}>
          {isMfg
            ? <AutoComplete options={typeOptions} placeholder="예: 검사 기준" filterOption={(input, o) => String(o?.value ?? "").includes(input)} />
            : <Select allowClear showSearch optionFilterProp="label" options={typeOptions} placeholder="업무 유형 고르기" />}
        </Form.Item>
        <Form.Item name="assignee_id" label="담당" rules={[{ required: true, message: "담당을 골라 주세요" }]}>
          <Select showSearch optionFilterProp="label" options={peopleOptions} placeholder="담당 고르기" />
        </Form.Item>
        <Form.Item
          name="reviewer_id"
          label={<span className="wk-meta">검토자{suggestion && reviewerValue === suggestion.id && <span className="ws-tag ws-tag--brand" title={suggestion.why}>자동 제안</span>}</span>}
          extra={suggestion && reviewerValue === suggestion.id ? `${suggestion.why}로 제안했어요` : "완료는 검토자가 승인해야 바뀌어요"}
          rules={[{ required: true, message: "검토자를 골라 주세요" }]}
        >
          <Select showSearch optionFilterProp="label" options={reviewerOptions} placeholder="검토자 고르기" />
        </Form.Item>
        <Form.Item name="due" label="마감">
          <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" placeholder="마감 날짜" allowClear />
        </Form.Item>
        <Form.Item name="priority" label="우선순위">
          <Select options={optionsOf("tasks.priority")} />
        </Form.Item>
        <Form.Item name="sensitivity" label="민감도" extra="L2는 참여자만 볼 수 있어요">
          <Select options={[{ value: "L0", label: "L0 공개" }, { value: "L1", label: "L1 내부" }, { value: "L2", label: "L2 고객 비밀(국내에서만 처리)" }]} />
        </Form.Item>
        {persona.role === "member" && <p className="wk-caption">업무는 검토자 이상이 만들 수 있어요.</p>}
      </Form>
    </DetailDrawer>
  );
}
