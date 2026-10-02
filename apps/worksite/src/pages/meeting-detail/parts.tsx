// 회의 확인 줄(구간 · 결정 · 액션 제안)과 서랍. W-08 회의 상세와 W-09 분류 확인이 함께 씁니다(소유: work 그룹).
// 동작: [맞아요] rpc:confirm_segment · [고치기] 사업·프로젝트·업무 유형 고르기 → corrected · 결정 [확정하기] rpc:confirm_decision ·
//       [업무로 만들기] rpc:accept_action_proposal(업무 생성, source=meeting) · [안 만들기] action_proposals.status=dismissed
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { AutoComplete, Button, DatePicker, Form, Input, Select, Tooltip } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { DetailDrawer, PersonChip, StatusTag } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { useRpc, useUpdate } from "@/lib/refine";
import { kstIso } from "@/lib/clock";
import { formatDate } from "@/lib/format";
import { statusOf } from "@/lib/status";
import type { ActionProposal, Decision, MeetingSegment } from "@/types/entities";
import { FREE_TASK_TYPES, TASK_TYPES, confidenceInfo, formatConf, formatSegRange, taskTypeLabel, useStructure, useWorkPermissions } from "../task-detail/lib";
import "../task-detail/work.css";

type Structure = ReturnType<typeof useStructure>;

/** 분류 경로: "강의·워크샵 › 예시기업 특강 › 사전진단·요구분석" */
export function ClassPath({ seg, st }: { seg: Pick<MeetingSegment, "business_line_code" | "project_code" | "task_type">; st: Structure }) {
  if (!seg.business_line_code) return <span className="wk-path wk-path--empty">분류 없음</span>;
  const parts = [
    st.lineByCode.get(seg.business_line_code)?.name ?? seg.business_line_code,
    seg.project_code ? st.projectByCode.get(seg.project_code)?.name ?? seg.project_code : null,
    seg.task_type ? taskTypeLabel(seg.task_type) : null,
  ].filter(Boolean);
  return <span className="wk-path">{parts.join(" › ")}</span>;
}

/** 신뢰도 표시: 확인을 마친 구간은 확인됨·고침, 아니면 자동 분류·확인 필요·미분류 + 숫자 */
export function ConfidenceTag({ seg }: { seg: Pick<MeetingSegment, "confidence" | "review_status"> }) {
  const reviewed = seg.review_status === "confirmed" || seg.review_status === "corrected";
  const info = reviewed ? statusOf("meeting_segments.review_status", seg.review_status) : confidenceInfo(seg.confidence, seg.review_status);
  return (
    <span className="ws-row" style={{ gap: 6 }}>
      <StatusTag {...info} />
      <Tooltip title="AI 분류의 신뢰도예요. 낮을수록 사람이 확인해요.">
        <span className="wk-time">신뢰도 {formatConf(seg.confidence)}</span>
      </Tooltip>
    </span>
  );
}

// ───────── 고치기 서랍
export function CorrectDrawer({ seg, open, onClose, onDone }: { seg: MeetingSegment | null; open: boolean; onClose: () => void; onDone?: (id: string) => void }) {
  const { tenant } = useWorksite();
  const st = useStructure();
  const [form] = Form.useForm<{ bl: string; prj?: string | null; type?: string | null }>();
  const { run, isPending } = useRpc("confirm_segment", { successMessage: "분류를 고쳤어요" });
  const bl = Form.useWatch("bl", form) as string | undefined;
  const isMfg = tenant.packs.includes("manufacturing");
  useEffect(() => {
    if (open && seg) form.setFieldsValue({ bl: seg.business_line_code ?? undefined, prj: seg.project_code, type: seg.task_type });
  }, [open, seg, form]);
  const line = bl ? st.lineByCode.get(bl) : undefined;
  const projectOptions = st.projects.filter((p) => !line || p.business_line_id === line.id).map((p) => ({ value: p.code, label: `${p.name} · ${p.code}` }));
  const typeOptions = isMfg ? FREE_TASK_TYPES.map((t) => ({ value: t, label: t })) : (bl ? TASK_TYPES[bl] ?? [] : []).map((t) => ({ value: t.code, label: t.name }));
  const save = async () => {
    if (!seg) return;
    const v = await form.validateFields();
    onDone?.(seg.id);
    await run({ segmentId: seg.id, correction: { businessLineCode: v.bl, projectCode: v.prj ?? null, taskType: v.type || null } });
    onClose();
  };
  return (
    <DetailDrawer open={open && !!seg} onClose={onClose} title="분류 고치기" footer={<Button type="primary" loading={isPending} onClick={() => void save().catch(() => undefined)}>고치기</Button>}>
      {seg && (
        <Form form={form} layout="vertical" className="wk-form" requiredMark={false} disabled={isPending}>
          <div className="wk-drawer-block" style={{ marginBottom: 20 }}>
            <p className="wk-drawer-label">근거 발화 · {formatSegRange(seg.start_ts, seg.end_ts)}</p>
            <blockquote className="wk-quote">{seg.evidence_quote}</blockquote>
            <div className="wk-meta" style={{ marginTop: 8 }}><span className="wk-caption">지금 분류</span><ClassPath seg={seg} st={st} /></div>
          </div>
          <Form.Item name="bl" label="사업" rules={[{ required: true, message: "사업을 골라 주세요" }]}>
            <Select options={st.lines.map((l) => ({ value: l.code, label: `${l.name} · ${l.code}` }))} placeholder="사업 고르기"
              onChange={() => form.setFieldsValue({ prj: null, type: null })} />
          </Form.Item>
          <Form.Item name="prj" label="프로젝트">
            <Select allowClear showSearch optionFilterProp="label" options={projectOptions} placeholder="프로젝트 고르기(없어도 돼요)" />
          </Form.Item>
          <Form.Item name="type" label="업무 유형">
            {isMfg ? <AutoComplete options={typeOptions} placeholder="예: 검사 기준" /> : <Select allowClear options={typeOptions} placeholder="업무 유형 고르기" disabled={!bl} />}
          </Form.Item>
          <p className="wk-caption">고친 분류는 다음 회의 분류에 참고해요.</p>
        </Form>
      )}
    </DetailDrawer>
  );
}

// ───────── 업무로 만들기 서랍
export function AcceptDrawer({ ap, open, onClose, onDone }: { ap: ActionProposal | null; open: boolean; onClose: () => void; onDone?: (id: string) => void }) {
  const { tenant } = useWorksite();
  const [form] = Form.useForm<{ title: string; assignee: string; due?: Dayjs | null }>();
  const { run, isPending } = useRpc<{ ok: boolean; taskId: string }>("accept_action_proposal", { successMessage: "업무로 만들었어요. 담당자에게 알렸어요." });
  useEffect(() => {
    if (open && ap) form.setFieldsValue({ title: ap.title, assignee: ap.suggested_assignee_id ?? undefined, due: ap.suggested_due_at ? dayjs(ap.suggested_due_at) : null });
  }, [open, ap, form]);
  const save = async () => {
    if (!ap) return;
    const v = await form.validateFields();
    onDone?.(ap.id);
    await run({ proposalId: ap.id, title: v.title, assigneeId: v.assignee, dueAt: v.due ? kstIso(v.due.format("YYYY-MM-DD"), "18:00") : null });
    onClose();
  };
  return (
    <DetailDrawer open={open && !!ap} onClose={onClose} title="업무로 만들기" footer={<Button type="primary" loading={isPending} onClick={() => void save().catch(() => undefined)}>업무로 만들기</Button>}>
      {ap && (
        <Form form={form} layout="vertical" className="wk-form" requiredMark={false} disabled={isPending}>
          <Form.Item name="title" label="업무 제목" rules={[{ required: true, message: "업무 제목을 적어 주세요" }]}><Input maxLength={80} /></Form.Item>
          <Form.Item name="assignee" label="담당" extra="회의에서 제안된 담당이 기본이에요" rules={[{ required: true, message: "담당을 골라 주세요" }]}>
            <Select showSearch optionFilterProp="label" options={tenant.people.map((p) => ({ value: p.id, label: `${p.displayName} · ${p.jobTitle}` }))} />
          </Form.Item>
          <Form.Item name="due" label="마감"><DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" placeholder="마감 날짜" /></Form.Item>
          <p className="wk-caption">검토자는 회의 프로젝트의 검토자로 정해져요. 출처는 이 회의로 남아요.</p>
        </Form>
      )}
    </DetailDrawer>
  );
}

// ───────── 줄
export interface RowCommon {
  canAct: boolean;
  /** 처리를 시작할 때(분류 확인 화면은 이 줄을 흐리게 1초 남겼다가 뺌) */
  onDone?: (id: string) => void;
  fading?: boolean;
  /** 분류 확인 화면: 회의 이름 링크 */
  meetingLabel?: ReactNode;
}

export function SegmentRow({ seg, st, canAct, onDone, fading, meetingLabel, onCorrect }: RowCommon & { seg: MeetingSegment; st: Structure; onCorrect: (s: MeetingSegment) => void }) {
  const { run, isPending } = useRpc("confirm_segment", { successMessage: "분류를 확인했어요" });
  const reviewed = seg.review_status === "confirmed" || seg.review_status === "corrected";
  const open = !reviewed && seg.review_status !== "auto";
  return (
    <li className={`wk-row${fading ? " is-fading" : ""}`} aria-busy={fading || undefined}>
      <div className="wk-row__main">
        <div className="wk-meta">
          {meetingLabel}
          <span className="wk-time">{formatSegRange(seg.start_ts, seg.end_ts)}</span>
        </div>
        <ClassPath seg={seg} st={st} />
        <blockquote className="wk-quote">{seg.evidence_quote}</blockquote>
      </div>
      <div className="wk-row__actions">
        <ConfidenceTag seg={seg} />
        {canAct && !fading && (open || seg.review_status === "auto") && (
          <>
            <Button size="small" onClick={() => onCorrect(seg)}>고치기</Button>
            {seg.business_line_code && (
              <Button size="small" type={open ? "primary" : "default"} loading={isPending}
                onClick={() => { onDone?.(seg.id); void run({ segmentId: seg.id }).catch(() => undefined); }}>맞아요</Button>
            )}
          </>
        )}
      </div>
    </li>
  );
}

export function DecisionRow({ dec, canAct, onDone, fading, meetingLabel, supersededBy }: RowCommon & { dec: Decision; supersededBy?: Decision }) {
  const { run, isPending } = useRpc("confirm_decision", { successMessage: "결정을 확정했어요" });
  const confirm = useWorkPermissions().decisionConfirm(dec);
  const supersedeTo = supersededBy ? `/meetings/decisions${supersededBy.project_id ? `?project=${supersededBy.project_id}` : ""}` : "";
  return (
    <li className={`wk-row${fading ? " is-fading" : ""}`}>
      <div className="wk-row__main">
        {meetingLabel && <div className="wk-meta">{meetingLabel}</div>}
        <span className="wk-row__title">{dec.statement}</span>
        <div className="wk-meta">
          {dec.decided_by_role && <span className="wk-caption">결정 역할 · {dec.decided_by_role}</span>}
          <span className="wk-caption">{formatDate(dec.decided_at)}</span>
          {/* 새 결정이 확정된 뒤에만 '바뀌었어요'. 아직 제안이면 '바꾸자는 제안이 있어요' */}
          {supersededBy && (supersededBy.status === "confirmed"
            ? <Link className="wk-caption" to={supersedeTo}>이 결정으로 바뀌었어요: {supersededBy.statement}</Link>
            : <Link className="wk-caption" to={supersedeTo}>바꾸자는 제안이 있어요: {supersededBy.statement}</Link>)}
        </div>
      </div>
      <div className="wk-row__actions">
        <StatusTag {...statusOf("decisions.status", dec.status)} />
        {canAct && !fading && dec.status === "proposed" && (confirm.can ? (
          <Button size="small" type="primary" loading={isPending} onClick={() => { onDone?.(dec.id); void run({ decisionId: dec.id }).catch(() => undefined); }}>확정하기</Button>
        ) : confirm.reason ? <span className="wk-caption">{confirm.reason}</span> : null)}
      </div>
    </li>
  );
}

export function ProposalRow({ ap, canAct, onDone, fading, meetingLabel, onAccept }: RowCommon & { ap: ActionProposal; onAccept: (a: ActionProposal) => void }) {
  const { mutateAsync, mutation } = useUpdate();
  const dismiss = async () => {
    onDone?.(ap.id);
    await mutateAsync({ resource: "action_proposals", id: ap.id, values: { status: "dismissed" }, successNotification: () => ({ type: "success", message: "업무로 만들지 않았어요" }) });
  };
  return (
    <li className={`wk-row${fading ? " is-fading" : ""}`}>
      <div className="wk-row__main">
        {meetingLabel && <div className="wk-meta">{meetingLabel}</div>}
        <span className="wk-row__title">{ap.title}</span>
        <div className="wk-meta">
          <span className="wk-caption">제안 담당</span>
          {ap.suggested_assignee_id ? <PersonChip memberId={ap.suggested_assignee_id} size="sm" /> : <span className="wk-caption">없음</span>}
          {ap.suggested_due_at && <span className="wk-caption">· 제안 마감 {formatDate(ap.suggested_due_at)}</span>}
          {ap.task_id && <Link className="wk-caption" to={`/work/tasks/${ap.task_id}`}>만든 업무 보기</Link>}
        </div>
        {!canAct && ap.status === "proposed" && <span className="wk-caption">검토자가 확인하면 업무가 돼요.</span>}
      </div>
      <div className="wk-row__actions">
        <StatusTag {...statusOf("action_proposals.status", ap.status)} />
        {canAct && !fading && ap.status === "proposed" && (
          <>
            <Button size="small" loading={mutation.isPending} onClick={() => void dismiss().catch(() => undefined)}>안 만들기</Button>
            <Button size="small" type="primary" onClick={() => onAccept(ap)}>업무로 만들기</Button>
          </>
        )}
      </div>
    </li>
  );
}

/** 처리한 줄을 0.6 투명도로 1초 남겼다가 빼기(움직임 줄이기 설정이면 바로 뺌) */
export function useFadeOut<T extends { id: string }>(current: T[]) {
  const [fading, setFading] = useState<Record<string, T>>({});
  const reduce = useMemo(() => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches, []);
  const mark = (item: T | undefined) => {
    if (!item || reduce) return;
    setFading((f) => ({ ...f, [item.id]: item }));
    window.setTimeout(() => setFading((f) => { const n = { ...f }; delete n[item.id]; return n; }), 1000);
  };
  const ids = new Set(current.map((x) => x.id));
  const merged = [...current, ...Object.values(fading).filter((x) => !ids.has(x.id))];
  return { items: merged, isFading: (id: string) => id in fading, mark };
}
