// 산출물 등록 서랍(C-01 ?selected=new). 저장은 rpc:register_artifact(산출물 + 첫 버전). 파일은 회사 저장소 링크만 받아요.
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { Button, Form, Input, Select, Switch } from "antd";
import { DetailDrawer } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { useList, useRpc } from "@/lib/refine";
import type { Task, Template } from "@/types/entities";
import { useDocTypeOptions, useProjects, type DocType } from "./lib";

interface Values { title: string; doc_type: DocType; project_id?: string | null; task_id?: string | null; template_id?: string | null; file_ref: string; ai_generated: boolean }

export function RegisterArtifactDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { tenant } = useWorksite();
  const nav = useNavigate();
  const [form] = Form.useForm<Values>();
  const docTypes = useDocTypeOptions();
  const { projects } = useProjects(open);
  const projectId = Form.useWatch("project_id", form) as string | undefined;
  const docType = Form.useWatch("doc_type", form) as DocType | undefined;
  const tasks = useList<Task>({ resource: "tasks", pagination: { mode: "off" }, filters: [{ field: "project_id", operator: "eq", value: projectId ?? "" }], queryOptions: { enabled: open && !!projectId } });
  const templates = useList<Template>({ resource: "templates", pagination: { mode: "off" }, queryOptions: { enabled: open } });
  const { run, isPending } = useRpc<{ ok: boolean; artifactId: string }>("register_artifact", { successMessage: "산출물을 등록했어요" });
  const key = tenant.slug === "tr-technology" ? "tr" : "crata";

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue({ ai_generated: true, file_ref: `https://files.example.invalid/${key}/` });
  }, [open, form, key]);

  const submit = async () => {
    const v = await form.validateFields();
    const res = await run({ ...v, project_id: v.project_id ?? null, task_id: v.task_id ?? null, template_id: v.template_id ?? null });
    onClose();
    if (res?.artifactId) nav(`/docs/artifacts/${res.artifactId}`);
  };

  const tplOptions = (templates.result?.data ?? []).filter((t) => !docType || t.doc_type === docType).map((t) => ({ value: t.id, label: `${t.name} · ${t.version}` }));

  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      title="산출물 등록"
      footer={<Button type="primary" loading={isPending} onClick={() => void submit().catch(() => undefined)}>등록하기</Button>}
    >
      <Form form={form} layout="vertical" className="cb-form" requiredMark={false} disabled={isPending}>
        <Form.Item name="title" label="제목" rules={[{ required: true, message: "제목을 적어 주세요" }, { min: 2, message: "두 글자 이상 적어 주세요" }]}>
          <Input maxLength={80} placeholder={key === "tr" ? "예: 출하 검사성적서 · 10월 1주" : "예: 예시기업 특강 제안서"} />
        </Form.Item>
        <Form.Item name="doc_type" label="문서 유형" rules={[{ required: true, message: "문서 유형을 골라 주세요" }]}>
          <Select options={docTypes} placeholder="문서 유형 고르기" onChange={() => form.setFieldValue("template_id", null)} />
        </Form.Item>
        <Form.Item name="project_id" label="프로젝트">
          <Select allowClear showSearch optionFilterProp="label" placeholder="프로젝트 고르기" options={projects.map((p) => ({ value: p.id, label: `${p.name} · ${p.code}` }))}
            onChange={() => form.setFieldValue("task_id", null)} />
        </Form.Item>
        <Form.Item name="task_id" label="업무" extra={projectId ? undefined : "프로젝트를 고르면 업무를 고를 수 있어요"}>
          <Select allowClear showSearch optionFilterProp="label" disabled={!projectId} placeholder="업무 고르기"
            options={(tasks.result?.data ?? []).map((t) => ({ value: t.id, label: t.title }))} />
        </Form.Item>
        <Form.Item name="template_id" label="양식">
          <Select allowClear placeholder={tplOptions.length ? "양식 고르기" : "이 문서 유형의 양식이 없어요"} disabled={!tplOptions.length} options={tplOptions} />
        </Form.Item>
        <Form.Item
          name="file_ref"
          label="파일 링크(회사 저장소)"
          extra="파일은 올리지 않고 회사 저장소 주소만 남겨요. 데모에서는 열리지 않는 예시 주소를 써요."
          rules={[{ required: true, message: "파일 링크를 적어 주세요" }, { pattern: /^https:\/\/\S+$/, message: "https로 시작하는 주소로 적어 주세요" }]}
        >
          <Input inputMode="url" />
        </Form.Item>
        <Form.Item name="ai_generated" label="AI 초안 포함" valuePropName="checked" extra="AI가 만든 초안이면 켜 주세요. 화면에 'AI 초안'으로 표시해요.">
          <Switch />
        </Form.Item>
      </Form>
    </DetailDrawer>
  );
}
