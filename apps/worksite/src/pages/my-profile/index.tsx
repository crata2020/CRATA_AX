// 내 정보 `/me` · A-04 · 깊이 B · 모듈 org-members · 소유: ara_settings 그룹
// 내 프로필(담당 업무·업무 전화만 본인이 고침: rpc:update_my_profile), 역할·권한 묶음(읽기 전용), 나와 내 AI 연결이 한 일(감사 기록 actor=나).
import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { App, Button, Input, Skeleton } from "antd";
import { ApiOutlined, BellOutlined, EditOutlined } from "@ant-design/icons";
import { CardGrid, CopyField, EmptyState, PageHeader, SectionCard, Timeline, type TimelineItem } from "@/components";
import { usePageReady } from "@/app/pageReady";
import { useWorksite } from "@/app/TenantBoundary";
import { useList, useOne, useRpc } from "@/lib/refine";
import { initialsOf } from "@/lib/format";
import type { AuditEvent, Member } from "@/types/entities";
import { KeyValue, actionLabel, changeSummary, resourceLabel, roleLabel } from "../admin-company/shared/lib";

const ROLE_CAN: Record<string, string> = {
  owner: "회사 설정·구성원 관리·모든 화면을 볼 수 있어요.",
  admin: "회사 설정·구성원 관리를 할 수 있어요.",
  reviewer: "맡은 업무의 제출을 검토하고 승인할 수 있어요.",
  member: "내 업무를 기록하고 제출할 수 있어요. 완료는 검토자가 승인해요.",
};

function EditableField({ label, value, placeholder, hint, onSave, maxLength, inputMode }: {
  label: string; value: string | null; placeholder: string; hint?: string; maxLength: number; inputMode?: "tel" | "text";
  onSave: (v: string) => Promise<boolean>;
}) {
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [busy, setBusy] = useState(false);
  if (!edit) {
    return (
      <span className="as-row">
        <span>{value || "—"}</span>
        <Button size="small" type="text" icon={<EditOutlined aria-hidden />} aria-label={`${label} 고치기`} onClick={() => { setDraft(value ?? ""); setEdit(true); }}>고치기</Button>
      </span>
    );
  }
  const save = async () => {
    setBusy(true);
    const ok = await onSave(draft);
    setBusy(false);
    if (ok) setEdit(false);
  };
  return (
    <form className="as-stack" style={{ gap: 6 }} onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <Input aria-label={label} value={draft} placeholder={placeholder} maxLength={maxLength} inputMode={inputMode} autoFocus onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Escape") setEdit(false); }} />
      {hint && <span className="as-caption">{hint}</span>}
      <span className="as-row">
        <Button size="small" onClick={() => setEdit(false)}>취소</Button>
        <Button size="small" type="primary" htmlType="submit" loading={busy}>저장하기</Button>
      </span>
    </form>
  );
}

function Activity() {
  const { persona } = useWorksite();
  // 감사 로그는 누구나 본인 행('own' 바닥 권한, providers/policy.ts)을 목록으로 읽어요
  const q = useList<AuditEvent>({
    resource: "audit_events",
    filters: [{ field: "actor_id", operator: "eq", value: persona.memberId }],
    sorters: [{ field: "at", order: "desc" }],
    pagination: { currentPage: 1, pageSize: 10 },
  });
  const loading = q.query.isLoading;
  const isError = q.query.isError;
  usePageReady(!loading);
  let content: ReactNode;
  if (loading) {
    content = <Skeleton active paragraph={{ rows: 4 }} title={false} />;
  } else if (isError) {
    content = <EmptyState compact kind="error" action={{ label: "다시 시도", onClick: () => void q.query.refetch() }} />;
  } else {
    const rows = q.result?.data ?? [];
    const items: TimelineItem[] = rows.map((e) => ({
      id: e.id,
      at: e.at,
      title: `${resourceLabel(e.resource)} ${actionLabel(e.action)}`,
      description: changeSummary(e),
      tone: e.actor_type === "ai_connection" ? "info" : "neutral",
      actor: e.actor_type === "ai_connection" ? { kind: "ai", clientName: e.actor_client ?? null } : undefined,
    }));
    content = items.length ? <Timeline items={items} dense ariaLabel="내 활동" /> : <EmptyState compact kind="empty" title="아직 남은 활동이 없어요" description="업무를 기록하거나 제출하면 여기에 쌓여요." />;
  }
  return (
    <SectionCard span={12} title="내 활동" demo caption="내 계정과 내 AI 연결이 한 일만 보여요. 최근 10건이에요. 고치거나 지울 수 없어요.">
      {content}
    </SectionCard>
  );
}

export default function Page() {
  const nav = useNavigate();
  const { message } = App.useApp();
  const { persona, role, tenant, hasBundle } = useWorksite();
  const adminish = persona.role === "owner" || persona.role === "admin";
  const q = useOne<Member>({ resource: "members", id: persona.memberId, queryOptions: { retry: false } });
  const { run } = useRpc<{ ok: boolean; changed: boolean }>("update_my_profile");
  usePageReady(!q.query.isLoading);
  const m = q.result;
  const unit = tenant.orgUnits.find((u) => u.id === (m?.org_unit_id ?? persona.unitId))?.name ?? "—";

  const save = (key: "duties" | "phoneWork") => async (v: string) => {
    try {
      const r = await run({ [key]: v });
      message.success(r.changed ? "저장했어요" : "바뀐 내용이 없어요");
      return true;
    } catch {
      return false;
    }
  };

  return (
    <>
      <PageHeader
        title="내 정보"
        description="담당 업무와 업무 전화는 내가 고칠 수 있어요. 이름·조직·역할은 관리자가 정해요."
        actions={(
          <>
            <Button icon={<ApiOutlined aria-hidden />} onClick={() => nav("/me/ai")}>내 AI 연결</Button>
            <Button icon={<BellOutlined aria-hidden />} onClick={() => nav("/me/notifications")}>알림 설정</Button>
          </>
        )}
      />
      {q.query.isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} title={false} />
      ) : q.query.isError || !m ? (
        <EmptyState kind="error" action={{ label: "다시 시도", onClick: () => void q.query.refetch() }} />
      ) : (
        <CardGrid>
          <SectionCard span={6} title="프로필">
            <div className="as-row" style={{ gap: 12, marginBottom: 16 }}>
              <span className="ws-avatar ws-avatar--lg" aria-hidden>{initialsOf(m.display_name)}</span>
              <div>
                <div className="ws-t-title-card">{m.display_name}</div>
                <div className="as-text-2">{unit} · {m.job_title}</div>
              </div>
            </div>
            <KeyValue
              ariaLabel="내 프로필"
              items={[
                ["조직", unit],
                ["직함", m.job_title],
                ["메일", <CopyField value={m.email} label="메일 주소" />],
                ["담당 업무", <EditableField label="담당 업무" value={m.duties} placeholder="예: 교안·운영·정산" maxLength={60} onSave={save("duties")} />],
                ["업무 전화", <EditableField label="업무 전화" value={m.phone_work} placeholder="000-0000-0000" inputMode="tel" maxLength={13} hint="데모에서는 000-0000-0000 모양의 예시 번호만 써요." onSave={save("phoneWork")} />],
              ]}
            />
          </SectionCard>
          <SectionCard span={6} title="역할" caption="역할은 관리자가 정해요. 바꿔야 하면 관리자에게 말해 주세요.">
            <KeyValue
              ariaLabel="내 역할"
              items={[
                ["플랫폼 역할", <span><b>{roleLabel(m.role)}</b> <span className="as-caption">· {ROLE_CAN[m.role]}</span></span>],
                // 역할 코드와 '진단 전 초안' 표시는 관리 화면용이라 소유자·관리자에게만 보여요
                ["회사 안 자리", <span className="as-row">{role.title}{adminish && <code className="as-code" translate="no">{role.code}</code>}{adminish && role.hypothesis && <span className="ws-tag">진단 전 초안</span>}</span>],
                ["권한 묶음", hasBundle("view_prices") ? "금액 보기(단가·수주 금액)" : "없음"],
                ["상태", m.status === "active" ? "활성" : "비활성"],
              ]}
            />
          </SectionCard>
          <Activity />
        </CardGrid>
      )}
    </>
  );
}
