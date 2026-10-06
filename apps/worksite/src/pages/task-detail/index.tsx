// 업무 상세 `/work/tasks/:taskId` · W-06 · 깊이 A · 모듈 tasks · 소유: work 그룹
// 설명·완료 기준, 추가만 되는 진행 기록, 제출·검토 이력(AI 연결 제출 표시). 담당자는 시작·기록·제출, 검토자는 검토·취소.
import { useState } from "react";
import { Link, useParams } from "react-router";
import { Button, Input, Skeleton, Tooltip } from "antd";
import { CheckOutlined } from "@ant-design/icons";
import {
  AiTag, Banner, CardGrid, DdayBadge, Divider, EmptyState, PageHeader, PersonChip, SectionCard, SensitivityTag, StatusTag, Timeline, useConfirm,
} from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { usePageReady } from "@/app/pageReady";
import { useCreate, useList, useOne, useUpdate } from "@/lib/refine";
import { useSelectedParam } from "@/lib/url";
import { formatDate, formatDateTime } from "@/lib/format";
import { labelOf, statusOf } from "@/lib/status";
import type { ActionProposal, Artifact, Meeting, Part, ProgressLog, Project, Submission, Task } from "@/types/entities";
import { splitDescription, taskTypeLabel, useWorkPermissions } from "./lib";
import { SubmitDrawer } from "./SubmitDrawer";
import { ReviewDrawer } from "./ReviewDrawer";
import "./work.css";

type TaskRel = Task & { _rel?: { project?: Project | null; part?: Part | null } };

/** 출처 링크: 회의 액션 제안이면 회의로, 클레임·현장 등록이면 해당 화면으로 */
function SourceLink({ task }: { task: Task }) {
  const isMeeting = task.source === "meeting" && !!task.source_ref;
  const ap = useOne<ActionProposal>({ resource: "action_proposals", id: task.source_ref ?? "", queryOptions: { enabled: isMeeting, retry: false } });
  const mtg = useOne<Meeting>({ resource: "meetings", id: ap.result?.meeting_id ?? "", queryOptions: { enabled: isMeeting && !!ap.result?.meeting_id, retry: false } });
  const label = labelOf("tasks.source", task.source);
  if (isMeeting && mtg.result) return <span>{label} · <Link to={`/meetings/${mtg.result.id}?tab=actions`}>{mtg.result.title}</Link></span>;
  if (task.source === "claim" && task.source_ref) return <span>{label} · <Link to={`/ops/quality/claims/${task.source_ref}`}>클레임 보기</Link></span>;
  if (task.source === "field_report" && task.source_ref) return <span>{label} · <Link to="/ops/report?tab=feed">현장 등록 보기</Link></span>;
  return <span>{label}</span>;
}

export default function Page() {
  const { taskId = "" } = useParams();
  const { persona } = useWorksite();
  const perms = useWorkPermissions();
  const confirm = useConfirm();
  const [drawer, setDrawer] = useSelectedParam();
  const [note, setNote] = useState("");

  const q = useOne<TaskRel>({ resource: "tasks", id: taskId, meta: { expand: ["project", "part"] }, queryOptions: { retry: false } });
  const task = q.result;
  const logs = useList<ProgressLog>({ resource: "progress_logs", filters: [{ field: "task_id", operator: "eq", value: taskId }], sorters: [{ field: "created_at", order: "desc" }], pagination: { mode: "off" }, queryOptions: { enabled: !!task } });
  const subs = useList<Submission>({ resource: "submissions", filters: [{ field: "task_id", operator: "eq", value: taskId }], sorters: [{ field: "version", order: "desc" }], pagination: { mode: "off" }, queryOptions: { enabled: !!task } });
  const arts = useList<Artifact>({ resource: "artifacts", filters: [{ field: "task_id", operator: "eq", value: taskId }], pagination: { mode: "off" }, queryOptions: { enabled: !!task } });
  const { mutateAsync: update, mutation: updateM } = useUpdate();
  const updating = updateM.isPending;
  const { mutateAsync: create, mutation: createM } = useCreate();
  const creating = createM.isPending;
  usePageReady(!q.query.isLoading);

  if (q.query.isLoading) {
    return (
      <>
        <PageHeader title="업무 상세" back={{ label: "내 업무", to: "/work" }} />
        <Skeleton active paragraph={{ rows: 6 }} />
      </>
    );
  }
  if (q.query.isError || !task) {
    const notFound = (q.query.error as { statusCode?: number } | null)?.statusCode === 404 || !task;
    return (
      <>
        <PageHeader title="업무 상세" back={{ label: "내 업무", to: "/work" }} />
        {notFound ? <EmptyState kind="not_found" action={{ label: "내 업무로", to: "/work" }} />
          : <EmptyState kind="error" action={{ label: "다시 시도", onClick: () => void q.query.refetch() }} />}
      </>
    );
  }

  const isAssignee = task.assignee_id === persona.memberId;
  const latest = (subs.result?.data ?? [])[0];
  const pendingSub = latest?.status === "submitted" ? latest : undefined;
  const canStart = isAssignee && task.status === "todo";
  const canSubmit = isAssignee && ["todo", "in_progress", "changes_requested"].includes(task.status);
  const canReview = !!pendingSub && perms.canReviewTask(task);
  const canCancel = perms.reviewerPlus && !["done", "canceled"].includes(task.status) && (perms.adminish || task.reviewer_id === persona.memberId);
  const canLog = (isAssignee || task.reviewer_id === persona.memberId || perms.adminish) && task.status !== "canceled";
  const { body, criteria } = splitDescription(task.description);
  const project = task._rel?.project;
  const part = task._rel?.part;
  const closed = task.status === "done" || task.status === "canceled";

  const start = async () => {
    await update({ resource: "tasks", id: task.id, values: { status: "in_progress" }, successNotification: () => ({ type: "success", message: "업무를 시작했어요" }) });
  };
  const cancel = async () => {
    const ok = await confirm({ title: "이 업무를 취소할까요?", content: "취소한 업무는 목록과 보드에서 빠져요. 진행 기록은 그대로 남아요.", okText: "취소하기", cancelText: "닫기", danger: true });
    if (!ok) return;
    await update({ resource: "tasks", id: task.id, values: { status: "canceled" }, successNotification: () => ({ type: "success", message: "업무를 취소했어요" }) });
  };
  const addLog = async () => {
    const text = note.trim();
    if (!text) return;
    await create({ resource: "progress_logs", values: { task_id: task.id, author_id: persona.memberId, body: text, via: "web", via_client: null }, successNotification: () => ({ type: "success", message: "기록을 남겼어요" }) });
    setNote("");
  };

  // 주 버튼 1 + 보조 1
  const primary = canReview ? <Button type="primary" onClick={() => setDrawer(`review:${pendingSub!.id}`)}>검토하기</Button>
    : canStart ? <Button type="primary" loading={updating} onClick={() => void start().catch(() => undefined)}>시작하기</Button>
    : canSubmit ? <Button type="primary" onClick={() => setDrawer("submit")}>제출하기</Button>
    : task.status === "submitted" && isAssignee ? <Tooltip title="검토자가 확인하고 있어요"><span><Button disabled>검토 대기 중</Button></span></Tooltip>
    : null;
  const secondary = canStart && canSubmit ? <Button onClick={() => setDrawer("submit")}>제출하기</Button>
    : canCancel ? <Button onClick={() => void cancel().catch(() => undefined)}>업무 취소</Button> : null;

  const logItems = (logs.result?.data ?? []).map((l) => ({
    id: l.id, at: l.created_at, title: l.body,
    actor: l.via === "ai_connection" ? { kind: "ai" as const, clientName: l.via_client } : { memberId: l.author_id },
    tone: l.via === "ai_connection" ? ("info" as const) : ("neutral" as const),
  }));
  const subItems = (subs.result?.data ?? []).map((s) => {
    const st = statusOf("submissions.status", s.status);
    const desc = [s.summary, s.review_comment ? `검토 코멘트: ${s.review_comment}` : null].filter(Boolean).join("\n");
    return {
      id: s.id, at: s.submitted_at,
      title: s.via === "ai_connection" ? `v${s.version} · ${st.label}` : `v${s.version} · 웹으로 제출 · ${st.label}`,
      description: desc,
      tone: st.tone,
      icon: s.via === "ai_connection" ? <span style={{ marginLeft: 8 }}><AiTag kind="submitted" /></span> : undefined,
      actor: s.via === "ai_connection" ? { kind: "ai" as const, clientName: s.via_client } : { memberId: s.submitted_by },
    };
  });

  return (
    <>
      <PageHeader
        title={task.title}
        back={{ label: "내 업무", to: "/work" }}
        meta={
          <div className="wk-meta">
            <StatusTag {...statusOf("tasks.status", task.status)} />
            <SensitivityTag level={task.sensitivity} />
            {task.priority === "high" && <span className="ws-tag">우선순위 높음</span>}
            <span className="wk-meta-text">
              {project ? <Link to={`/projects/${project.id}`}>{project.name}</Link> : "프로젝트 없음"}
              {part ? ` › ${part.name}` : ""} · 마감 {formatDate(task.due_at)}
            </span>
            <DdayBadge date={task.due_at} done={closed} />
          </div>
        }
        actions={(primary || secondary) && <div className="ws-row">{secondary}{primary}</div>}
      />

      {task.status === "changes_requested" && latest?.review_comment && (
        <Banner tone="warning" title="수정 요청">{latest.review_comment}</Banner>
      )}

      <CardGrid>
        <SectionCard span={8} title="업무 내용">
          {body ? <p className="wk-body">{body}</p> : <p className="wk-caption">설명이 없어요.</p>}
          {criteria.length > 0 && (
            <>
              <h3 className="wk-section-title" style={{ marginTop: 16, marginBottom: 0 }}>완료 기준</h3>
              <ul className="wk-crit">
                {criteria.map((c) => <li key={c}><CheckOutlined aria-hidden />{c}</li>)}
              </ul>
              <p className="wk-caption" style={{ marginTop: 8 }}>완료는 검토자가 제출을 승인하면 바뀌어요.</p>
            </>
          )}
          <Divider />
          <h3 className="wk-section-title">진행 기록</h3>
          {canLog && (
            <form className="wk-inline-form" style={{ marginBottom: 16 }} onSubmit={(e) => { e.preventDefault(); void addLog().catch(() => undefined); }}>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="한 줄 기록 남기기" maxLength={200} aria-label="한 줄 기록" />
              <Button htmlType="submit" loading={creating} disabled={!note.trim()}>남기기</Button>
            </form>
          )}
          {logs.query.isLoading ? <Skeleton active paragraph={{ rows: 3 }} title={false} />
            : logItems.length ? <Timeline items={logItems} ariaLabel="진행 기록" />
            : <EmptyState kind="empty" compact headingLevel={3} title="아직 진행 기록이 없어요" description="한 줄로 남겨 보세요." />}
          <p className="wk-caption" style={{ marginTop: 8 }}>진행 기록은 추가만 할 수 있어요. 고치거나 지울 수 없어요.</p>
          <Divider />
          <h3 className="wk-section-title">제출·검토 이력</h3>
          {subs.query.isLoading ? <Skeleton active paragraph={{ rows: 2 }} title={false} />
            : subItems.length ? <Timeline items={subItems} ariaLabel="제출·검토 이력" />
            : <EmptyState kind="empty" compact headingLevel={3} title="아직 제출하지 않았어요" description={isAssignee ? "결과물이 준비되면 제출해 주세요." : undefined} />}
        </SectionCard>

        <SectionCard span={4} title="정보">
          <dl className="wk-kv">
            <dt>담당</dt><dd><PersonChip memberId={task.assignee_id} size="sm" /></dd>
            <dt>검토자</dt><dd><PersonChip memberId={task.reviewer_id} size="sm" /></dd>
            <dt>출처</dt><dd><SourceLink task={task} /></dd>
            <dt>업무 유형</dt><dd>{taskTypeLabel(task.task_type)}</dd>
            <dt>우선순위</dt><dd>{labelOf("tasks.priority", task.priority)}</dd>
            <dt>예상 시간</dt><dd className="ws-tabular">{task.estimate_hours != null ? `${task.estimate_hours}시간` : "—"}</dd>
            <dt>민감도</dt><dd><SensitivityTag level={task.sensitivity} /></dd>
            <dt>마감</dt><dd className="ws-tabular">{task.due_at ? formatDateTime(task.due_at) : "—"}</dd>
            {!closed && task.due_at && <><dt>남은 날</dt><dd><DdayBadge date={task.due_at} /></dd></>}
          </dl>
          <Divider />
          <h3 className="wk-section-title">산출물</h3>
          {(arts.result?.data ?? []).length ? (
            <ul className="wk-rows">
              {(arts.result?.data ?? []).map((a) => (
                <li key={a.id} style={{ padding: "8px 0" }}>
                  <Link to={`/docs/artifacts/${a.id}`}>{a.title}</Link>
                  <div className="wk-meta" style={{ marginTop: 4 }}>
                    <span className="wk-caption">{labelOf("artifacts.doc_type", a.doc_type)} · v{a.current_version}</span>
                    {a.ai_generated && <AiTag kind="draft" />}
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="wk-caption">연결된 산출물이 없어요.</p>}
        </SectionCard>
      </CardGrid>

      <SubmitDrawer task={task} open={drawer === "submit"} onClose={() => setDrawer(null)} />
      <ReviewDrawer
        submissionId={drawer.startsWith("review:") ? drawer.slice(7) : null}
        open={drawer.startsWith("review:")}
        onClose={() => setDrawer(null)}
        onProcessed={() => setDrawer(null)}
      />
    </>
  );
}
