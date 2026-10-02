// 제출 서랍(W-06에서 열고 W-04 보드의 '검토 대기로' 이동도 이 서랍을 씀). 요약 필수, 산출물 고르기 또는 외부 링크.
// 저장은 rpc:submit_task(새 버전 + 업무 '검토 대기' + 검토자 알림). 웹 제출만 여기서 하고, AI 연결 제출은 MCP로 들어옵니다.
import { useEffect } from "react";
import { Button, Form, Input, Select } from "antd";
import { DetailDrawer, PersonChip } from "@/components";
import { useList, useRpc } from "@/lib/refine";
import { labelOf } from "@/lib/status";
import type { Artifact, Task } from "@/types/entities";
import "./work.css";

export interface SubmitDrawerProps {
  task: Pick<Task, "id" | "title" | "project_id" | "reviewer_id" | "status"> | null;
  open: boolean;
  onClose: () => void;
  onSubmitted?: (submissionId: string) => void;
}

export function SubmitDrawer({ task, open, onClose, onSubmitted }: SubmitDrawerProps) {
  const [form] = Form.useForm<{ summary: string; artifactId?: string; link?: string }>();
  const { run, isPending } = useRpc<{ ok: boolean; submissionId: string; version: number }>("submit_task", { successMessage: "제출했어요. 검토자에게 알렸어요." });
  const artifacts = useList<Artifact>({
    resource: "artifacts",
    pagination: { mode: "off" },
    filters: [{ operator: "or", value: [{ field: "task_id", operator: "eq", value: task?.id ?? "" }, { field: "project_id", operator: "eq", value: task?.project_id ?? "" }] }],
    sorters: [{ field: "updated_at", order: "desc" }],
    queryOptions: { enabled: open && !!task },
  });
  useEffect(() => { if (open) form.resetFields(); }, [open, form]);

  const submit = async () => {
    if (!task) return;
    const v = await form.validateFields();
    const res = await run({ taskId: task.id, summary: v.summary, artifactId: v.artifactId ?? null, link: v.link ?? null });
    onClose();
    if (res?.submissionId) onSubmitted?.(res.submissionId);
  };

  const list = artifacts.result?.data ?? [];
  return (
    <DetailDrawer
      open={open && !!task}
      onClose={onClose}
      title="제출하기"
      footer={<Button type="primary" loading={isPending} onClick={() => void submit().catch(() => undefined)}>제출하기</Button>}
    >
      {task && (
        <Form form={form} layout="vertical" className="wk-form" requiredMark={false} disabled={isPending}>
          <div className="wk-drawer-block" style={{ marginBottom: 20 }}>
            <p className="wk-drawer-label">업무</p>
            <p className="wk-body">{task.title}</p>
            <div className="wk-meta" style={{ marginTop: 8 }}>
              <span className="wk-caption">검토자</span>
              <PersonChip memberId={task.reviewer_id} size="sm" />
            </div>
          </div>
          <Form.Item name="summary" label="제출 요약" rules={[{ required: true, message: "무엇을 했는지 적어 주세요" }, { min: 5, message: "5자 이상 적어 주세요" }]}
            extra="검토자가 먼저 읽는 글이에요. 바뀐 점과 확인할 점을 적어요">
            <Input.TextArea rows={4} maxLength={600} showCount placeholder="예: 첫 장에 교육 목표 3줄 요약을 넣었어요" />
          </Form.Item>
          <Form.Item name="artifactId" label="산출물" extra={list.length ? "회사 저장소의 산출물을 고르세요" : "이 업무에 연결된 산출물이 아직 없어요"}>
            <Select allowClear disabled={!list.length} placeholder="산출물 고르기" loading={artifacts.query.isLoading}
              options={list.map((a) => ({ value: a.id, label: `${a.title} · ${labelOf("artifacts.doc_type", a.doc_type)} v${a.current_version}` }))} />
          </Form.Item>
          <Form.Item name="link" label="외부 링크" extra="산출물이 다른 곳에 있으면 주소를 붙여요"
            rules={[{ pattern: /^https?:\/\/\S+$/, message: "http로 시작하는 주소를 적어 주세요" }]}>
            <Input placeholder="https://" inputMode="url" />
          </Form.Item>
          {task.status === "changes_requested" && <p className="wk-caption">수정 요청을 반영한 새 버전으로 제출돼요.</p>}
        </Form>
      )}
    </DetailDrawer>
  );
}
