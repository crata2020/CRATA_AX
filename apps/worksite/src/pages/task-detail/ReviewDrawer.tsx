// 검토 서랍(W-05 검토함 · W-06 업무 상세 · W-04 보드의 '완료로' 이동이 함께 씀).
// 제출 요약 · 산출물(AI 초안 표시) · 진행 기록 최근 3 · 이전 검토 코멘트 → [수정 요청하기](코멘트 5자 이상) / [승인하기].
// AI 연결은 제출까지만 하고, 완료는 사람이 여기서 승인할 때만 바뀝니다(첫 판매 기준 2번).
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Button, Input, Skeleton, Tooltip } from "antd";
import { AiTag, DdayBadge, DetailDrawer, EmptyState, PersonChip, StatusTag, Timeline } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { usePageReady } from "@/app/pageReady";
import { useList, useOne, useRpc } from "@/lib/refine";
import { formatDate, formatDateTime, formatRelative } from "@/lib/format";
import { labelOf, statusOf } from "@/lib/status";
import type { Artifact, ProgressLog, Project, Submission, Task } from "@/types/entities";
import { useWorkPermissions } from "./lib";
import "./work.css";

export interface ReviewDrawerProps {
  submissionId: string | null;
  open: boolean;
  onClose: () => void;
  /** 승인·수정 요청을 마친 뒤(검토함은 다음 행으로 넘어감) */
  onProcessed?: (submissionId: string, result: "approved" | "rejected") => void;
}

type SubWithTask = Submission & { _rel?: { task?: Task | null } };

export function ReviewDrawer({ submissionId, open, onClose, onProcessed }: ReviewDrawerProps) {
  const { clock } = useWorksite();
  const perms = useWorkPermissions();
  const [comment, setComment] = useState("");
  const [touched, setTouched] = useState(false);
  const approve = useRpc("approve_submission", { successMessage: "승인했어요. 담당자에게 알렸어요." });
  const reject = useRpc("request_changes", { successMessage: "수정 요청을 보냈어요. 담당자에게 알렸어요." });

  const subQ = useOne<SubWithTask>({ resource: "submissions", id: submissionId ?? "", meta: { expand: ["task"] }, queryOptions: { enabled: open && !!submissionId, retry: false } });
  const sub = subQ.result;
  const task = sub?._rel?.task ?? null;
  const projectQ = useOne<Project>({ resource: "projects", id: task?.project_id ?? "", queryOptions: { enabled: open && !!task?.project_id, retry: false } });
  const logs = useList<ProgressLog>({
    resource: "progress_logs", filters: [{ field: "task_id", operator: "eq", value: sub?.task_id ?? "" }],
    sorters: [{ field: "created_at", order: "desc" }], pagination: { currentPage: 1, pageSize: 3 }, queryOptions: { enabled: open && !!sub },
  });
  const history = useList<Submission>({
    resource: "submissions", filters: [{ field: "task_id", operator: "eq", value: sub?.task_id ?? "" }],
    sorters: [{ field: "version", order: "desc" }], pagination: { mode: "off" }, queryOptions: { enabled: open && !!sub },
  });
  const artifact = useList<Artifact>({
    resource: "artifacts", filters: [{ field: "id", operator: "eq", value: sub?.artifact_id ?? "" }], pagination: { mode: "off" },
    queryOptions: { enabled: open && !!sub?.artifact_id },
  });
  usePageReady(!(open && subQ.query.isLoading));

  useEffect(() => { setComment(""); setTouched(false); }, [submissionId, open]);

  const pending = sub?.status === "submitted";
  const canAct = !!sub && pending && perms.canReviewTask(task);
  const reason = !sub ? "" : !pending ? "이미 처리한 제출이에요" : !perms.reviewerPlus ? "완료는 검토자가 승인하면 바뀌어요" : "이 업무의 검토자가 승인할 수 있어요";
  const busy = approve.isPending || reject.isPending;
  const commentOk = comment.trim().length >= 5;

  const doApprove = async () => {
    if (!sub) return;
    await approve.run({ submissionId: sub.id, comment: comment.trim() || null });
    onProcessed?.(sub.id, "approved");
  };
  const doReject = async () => {
    setTouched(true);
    if (!sub || !commentOk) return;
    await reject.run({ submissionId: sub.id, comment: comment.trim() });
    onProcessed?.(sub.id, "rejected");
  };

  const prevComments = (history.result?.data ?? []).filter((s) => sub && s.version < sub.version && s.review_comment);
  const art = artifact.result?.data?.[0];

  const footer = sub && pending ? (
    <>
      <Tooltip title={canAct ? undefined : reason}>
        <span><Button disabled={!canAct || busy} loading={reject.isPending} onClick={() => void doReject().catch(() => undefined)}>수정 요청하기</Button></span>
      </Tooltip>
      <Tooltip title={canAct ? undefined : reason}>
        <span><Button type="primary" disabled={!canAct || busy} loading={approve.isPending} onClick={() => void doApprove().catch(() => undefined)}>승인하기</Button></span>
      </Tooltip>
    </>
  ) : undefined;

  return (
    <DetailDrawer open={open && !!submissionId} onClose={onClose} title="검토하기" footer={footer}
      extra={sub ? <StatusTag {...statusOf("submissions.status", sub.status)} /> : undefined}>
      {subQ.query.isLoading ? <Skeleton active paragraph={{ rows: 6 }} title={false} />
        : subQ.query.isError || !sub ? <EmptyState kind="not_found" compact headingLevel={3} />
        : (
          <div>
            <section className="wk-drawer-block" aria-label="업무">
              <p className="wk-drawer-label">업무</p>
              {task ? <Link className="wk-row__title" to={`/work/tasks/${task.id}`}>{task.title}</Link> : <p className="wk-body">—</p>}
              <div className="wk-meta" style={{ marginTop: 6 }}>
                <span className="wk-meta-text">{projectQ.result?.name ?? "—"}</span>
                {task?.due_at && <span className="wk-meta-text">· 마감 {formatDate(task.due_at)}</span>}
                {task && <DdayBadge date={task.due_at} done={task.status === "done" || task.status === "canceled"} />}
              </div>
              {task && <div className="wk-meta" style={{ marginTop: 8 }}><span className="wk-caption">담당</span><PersonChip memberId={task.assignee_id} size="sm" /></div>}
            </section>

            <section className="wk-drawer-block" aria-label="제출">
              <p className="wk-drawer-label">제출 v{sub.version}</p>
              <div className="wk-meta">
                {sub.via === "ai_connection" ? <PersonChip kind="ai" clientName={sub.via_client} size="sm" /> : <PersonChip memberId={sub.submitted_by} size="sm" />}
                {sub.via === "ai_connection" && <AiTag kind="submitted" />}
                <span className="wk-time" title={formatDateTime(sub.submitted_at)}>{formatRelative(sub.submitted_at, clock.now())}</span>
              </div>
              {sub.via === "ai_connection" && <p className="wk-caption" style={{ marginTop: 6 }}>담당자의 AI 연결이 제출했어요. 사람이 확인해야 완료돼요.</p>}
              <p className="wk-body" style={{ marginTop: 10 }}>{sub.summary}</p>
              {sub.artifact_id && (
                <div className="wk-meta" style={{ marginTop: 10 }}>
                  <span className="wk-caption">산출물</span>
                  <Link to={`/docs/artifacts/${sub.artifact_id}`}>{art?.title ?? "연결된 산출물 열기"}{art ? ` v${art.current_version}` : ""}</Link>
                  {art?.ai_generated && <AiTag kind="draft" />}
                </div>
              )}
              {!pending && sub.review_comment && (
                <p className="wk-body-2" style={{ marginTop: 10 }}>검토 코멘트: {sub.review_comment}</p>
              )}
            </section>

            <section className="wk-drawer-block" aria-label="진행 기록 최근 3건">
              <p className="wk-drawer-label">진행 기록 최근 3건</p>
              {(logs.result?.data ?? []).length ? (
                <Timeline dense items={(logs.result?.data ?? []).map((l) => ({
                  id: l.id, at: l.created_at, title: l.body,
                  actor: l.via === "ai_connection" ? { kind: "ai" as const, clientName: l.via_client } : { memberId: l.author_id },
                }))} />
              ) : <p className="wk-caption">아직 진행 기록이 없어요.</p>}
            </section>

            {prevComments.length > 0 && (
              <section className="wk-drawer-block" aria-label="이전 검토 코멘트">
                <p className="wk-drawer-label">이전 검토 코멘트</p>
                <ul className="wk-rows">
                  {prevComments.map((s) => (
                    <li key={s.id} style={{ padding: "8px 0" }}>
                      <div className="wk-meta"><span className="wk-caption">v{s.version} · {labelOf("submissions.status", s.status)}</span>{s.reviewed_by && <PersonChip memberId={s.reviewed_by} size="sm" />}</div>
                      <p className="wk-body-2" style={{ marginTop: 4 }}>{s.review_comment}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {pending && (
              <section className="wk-drawer-block" aria-label="코멘트">
                <label className="wk-drawer-label" htmlFor="review-comment">코멘트</label>
                <Input.TextArea id="review-comment" rows={3} maxLength={500} value={comment} disabled={!canAct || busy}
                  onChange={(e) => setComment(e.target.value)} placeholder="승인할 때는 비워도 돼요. 수정 요청은 고칠 점을 적어 주세요"
                  status={touched && !commentOk ? "error" : undefined} aria-describedby="review-comment-hint" />
                <p id="review-comment-hint" className="wk-caption" style={{ marginTop: 6 }}>
                  {touched && !commentOk ? "수정 요청은 코멘트를 5자 이상 적어 주세요." : canAct ? "수정 요청은 코멘트를 5자 이상 적어야 보낼 수 있어요." : reason}
                </p>
              </section>
            )}
          </div>
        )}
    </DetailDrawer>
  );
}
