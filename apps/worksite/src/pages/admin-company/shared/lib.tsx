// ara_settings 그룹 공용 도우미(소유: ara_settings 그룹). 같은 그룹 페이지(ara-*, my-*, admin-*)만 가져다 씁니다.
// 공통 승격 후보: KeyValue · ResponsiveTable(antd 표, 모바일은 줄 목록) — notes/ara_settings.md
import type { CSSProperties, ReactNode } from "react";
import { Table, type TableColumnType } from "antd";
import { SafetyCertificateOutlined } from "@ant-design/icons";
import { PersonChip } from "@/components";
import { useBreakpoint } from "@/lib/useBreakpoint";
import { labelOf } from "@/lib/status";
import { formatDateLong, formatDateTime } from "@/lib/format";
import { useWorksite } from "@/app/TenantBoundary";
import { RESOURCES, isResourceName } from "@/providers/resources";
import type { PlatformRole } from "@/tenants/types";
import type { Persona } from "@/data/seed/types";
import type { AuditEvent } from "@/types/entities";
import "./as.css";

export const isAdminish = (p: Persona) => p.role === "owner" || p.role === "admin";

/** 정보 표(dl) */
export function KeyValue({ items, ariaLabel }: { items: [string, ReactNode][]; ariaLabel?: string }) {
  return (
    <dl className="as-kv" aria-label={ariaLabel}>
      {items.map(([k, v]) => (
        <div key={k} style={{ display: "contents" }}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export const Caption = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => <p className="as-caption" style={style}>{children}</p>;

export interface RCol<T> { key: string; title: string; render: (row: T) => ReactNode; align?: "left" | "right"; width?: number | string }
/** 리소스가 아닌 목록(레지스트리·설정)을 표로: 데스크톱은 antd 표, 모바일(≤767)은 줄 블록 */
export function ResponsiveTable<T>({ rows, columns, rowKey, mobile, ariaLabel, empty }: {
  rows: T[];
  columns: RCol<T>[];
  rowKey: (row: T) => string;
  /** 모바일 한 줄: 제목 + 보조 줄 + 동작 */
  mobile: (row: T) => { title: ReactNode; lines?: [string, ReactNode][]; actions?: ReactNode };
  ariaLabel: string;
  empty?: ReactNode;
}) {
  const bp = useBreakpoint();
  if (!rows.length) return <>{empty ?? null}</>;
  if (bp === "mobile") {
    return (
      <ul className="as-blocks" aria-label={ariaLabel}>
        {rows.map((r) => {
          const m = mobile(r);
          return (
            <li key={rowKey(r)}>
              <div className="as-block__title">{m.title}</div>
              {m.lines?.map(([k, v]) => <div key={k} className="as-block__line"><b>{k}</b>{v}</div>)}
              {m.actions && <div className="as-block__actions">{m.actions}</div>}
            </li>
          );
        })}
      </ul>
    );
  }
  const cols: TableColumnType<T>[] = columns.map((c) => ({ key: c.key, title: c.title, align: c.align, width: c.width, render: (_: unknown, row: T) => c.render(row) }));
  return (
    <div className="as-rtable ws-table">
      {/* 데스크톱은 칸 안에서 줄바꿈(가로 스크롤 없음), 태블릿만 가로 스크롤 */}
      <Table<T> aria-label={ariaLabel} rowKey={rowKey} columns={cols} dataSource={rows} pagination={false} size="middle" scroll={bp === "tablet" ? { x: "max-content" } : undefined} />
    </div>
  );
}

// ───────── 역할
export const roleLabel = (r: PlatformRole | string) => labelOf("platform_role", r);
export const ROLES: PlatformRole[] = ["owner", "admin", "reviewer", "member"];
/** 역할 선택 옵션: 소유자 지정은 소유자만 */
export function roleOptions(me: PlatformRole) {
  return ROLES.map((r) => ({ value: r, label: roleLabel(r), disabled: r === "owner" && me !== "owner" }));
}

// ───────── AI 연결
export const SCOPE_LABEL: Record<string, string> = { "tasks.read": "업무 보기", "tasks.progress": "진행 기록", "tasks.submit": "결과 제출" };
export const scopeText = (scopes: string[]) => scopes.map((s) => SCOPE_LABEL[s] ?? s).join(" · ");
export const CLIENTS = ["ChatGPT", "Claude", "Codex"] as const;
export type ClientName = (typeof CLIENTS)[number];
/** ARA MCP 도구 6개(research/00 방향 2장) */
export const MCP_TOOLS: { name: string; does: string; scope: keyof typeof SCOPE_LABEL }[] = [
  { name: "list_my_tasks", does: "내 업무 목록 보기(고객 비밀 L2 업무는 빼요)", scope: "tasks.read" },
  { name: "get_task", does: "업무 상세와 기준 보기", scope: "tasks.read" },
  { name: "start_task", does: "업무 시작하기", scope: "tasks.progress" },
  { name: "log_progress", does: "진행 기록 남기기", scope: "tasks.progress" },
  { name: "submit_result", does: "결과 제출하기(완료는 검토자가 웹에서)", scope: "tasks.submit" },
  { name: "get_submission_status", does: "검토 상태 보기", scope: "tasks.read" },
];
export const mcpUrl = (tenantId: string) => `https://mcp.example.invalid/${tenantId}/mcp`;
/** "v1-2026-10-01" → "v1 · 2026년 10월 1일" */
export function noticeVersionText(v: string | null | undefined): string {
  if (!v) return "—";
  const m = /^(v\d+)-(\d{4}-\d{2}-\d{2})$/.exec(v);
  return m ? `${m[1]} · ${formatDateLong(m[2])}` : v;
}
export const OVERSEAS_NOTICE = "연결하면 내 업무 내용(업무 제목·설명·진행 기록·제출물)이 해외 AI 사업자에게 전달돼요. 학습에 쓰지 않는 조건으로 계약한 경로만 써요. 연결 전에 동의를 받아요.";

// ───────── 감사 기록 표기
const RPC_LABEL: Record<string, string> = {
  submit_task: "결과 제출", approve_submission: "제출 승인", request_changes: "수정 요청", accept_action_proposal: "업무로 만들기", confirm_segment: "회의 분류 확인",
  start_task: "업무 시작", mark_notice_read: "공지 읽음", approve_rule: "규칙 승인", reject_rule: "규칙 반려", create_field_report: "현장 등록",
  set_equipment_status: "설비 상태 기록", confirm_semiannual_review: "반기 점검 확인", revoke_mcp_connection: "AI 연결 끊기", revoke_all_mcp: "AI 연결 모두 끊기",
  register_artifact: "산출물 등록", finalize_artifact: "최종본 확정", create_notice: "공지 쓰기", publish_template: "양식 게시", verify_knowledge: "지식 검증",
  create_task_from_mail: "메일로 업무 만들기", set_glossary_label: "화면 용어 바꾸기", set_correction_reason: "수정 사유 남기기",
  profile_applied: "프로파일 적용", profile_change_requested: "프로파일 변경 요청", set_module_enabled: "모듈 켜기·끄기", save_theme: "브랜드·테마 저장",
  change_member_role: "역할 바꾸기", set_member_status: "구성원 상태 바꾸기", update_my_profile: "내 정보 고치기", create_task: "업무 만들기",
  assign_field_report: "현장 등록 담당 배정", create_claim: "클레임 등록", complete_d_step: "8D 단계 완료", move_claim_column: "클레임 단계 이동",
  repair_breakdown: "수리 기록", create_linked_task: "연결 업무 만들기", confirm_decision: "결정 확정", create_safety_report: "안전 신고",
  save_notification_preferences: "알림 설정 저장", mark_all_notifications_read: "알림 모두 읽음",
};
export function actionLabel(action: string): string {
  if (action === "create") return "등록";
  if (action === "update") return "수정";
  if (action === "delete") return "삭제";
  if (action.startsWith("rpc:")) return RPC_LABEL[action.slice(4)] ?? "업무 동작";
  return RPC_LABEL[action] ?? "기록";
}
export const resourceLabel = (resource: string) => (isResourceName(resource) ? RESOURCES[resource].labelKo : "기타");

/** 대상 리소스 → 열 수 있는 경로(없으면 null) */
export function targetPath(resource: string, id: string | null | undefined): string | null {
  if (!id) return null;
  switch (resource) {
    case "tasks": return `/work/tasks/${id}`;
    case "artifacts": return `/docs/artifacts/${id}`;
    case "notices": return `/company/notices/${id}`;
    case "meetings": return `/meetings/${id}`;
    case "projects": return `/projects/${id}`;
    case "partners": return `/projects/partners/${id}`;
    case "customer_claims": return `/ops/quality/claims/${id}`;
    case "members": return `/admin/members?selected=${id}`;
    case "invitations": return "/admin/members?tab=invites";
    case "role_assignments": return "/admin/members";
    case "mcp_connections": return "/admin/ai-policy";
    case "mcp_policies": return "/admin/ai-policy";
    case "tenant_settings": return "/admin/settings";
    case "field_reports": return "/ops/report?tab=feed";
    case "rules": return "/docs/rules";
    default: return null;
  }
}

/** 행위자 표시: 사람 · AI 연결 · 시스템 · CRATA 운영자 */
export function AuditActor({ row, size = "sm" }: { row: Pick<AuditEvent, "actor_type" | "actor_id" | "actor_client">; size?: "sm" | "md" }) {
  if (row.actor_type === "ai_connection") {
    return (
      <span className="as-row" style={{ gap: 6 }}>
        <PersonChip kind="ai" clientName={row.actor_client ?? null} size={size} />
        {row.actor_id && <span className="as-caption">· <PersonName id={row.actor_id} /></span>}
      </span>
    );
  }
  if (row.actor_type === "system") return <PersonChip kind="system" size={size} />;
  if (row.actor_type === "crata_operator") {
    return (
      <span className="ws-person">
        <span className={`ws-avatar ws-avatar--ai${size === "sm" ? " ws-avatar--sm" : ""}`} aria-hidden><SafetyCertificateOutlined /></span>
        <span className="ws-person__name">CRATA 운영자</span>
      </span>
    );
  }
  return <PersonChip memberId={row.actor_id} size={size} />;
}

function PersonName({ id }: { id: string }) {
  const { person } = useWorksite();
  return <>{person(id)?.displayName ?? "알 수 없는 사람"}</>;
}

/** 바뀐 내용 한 줄 요약: "상태: 진행 중 → 검토 대기" */
export function changeSummary(e: Pick<AuditEvent, "changes" | "resource">): string {
  if (!e.changes) return "—";
  const parts = Object.entries(e.changes).slice(0, 2).map(([k, [a, b]]) =>
    a == null ? `${fieldLabel(k)}: ${valueText(k, b, e.resource)}` : `${fieldLabel(k)}: ${valueText(k, a, e.resource)} → ${valueText(k, b, e.resource)}`);
  const more = Object.keys(e.changes).length - parts.length;
  return parts.join(" · ") + (more > 0 ? ` 외 ${more}개` : "");
}

const FIELD_LABEL: Record<string, string> = {
  status: "상태", title: "제목", body: "내용", role: "역할", client_name: "AI", revoked_at: "끊은 시각", email: "메일", review_status: "분류 상태",
  value: "값", profile_version: "프로파일 버전", overseas_notice_version: "국외이전 안내", kind: "종류", duties: "담당 업무", phone_work: "업무 전화",
  area: "바꿀 곳", reason: "이유", revoked: "끊은 연결 수", scopes: "범위", enabled: "켜짐", read_only: "읽기만", allowed_clients: "허용 AI", allowed_scopes: "허용 범위",
  expires_at: "만료", share_scope: "나눌 범위", position_or_title: "직책", default_role: "기본 역할", org_unit_id: "조직",
};
export function fieldLabel(k: string): string {
  if (k.startsWith("modules.")) return "모듈";
  if (k.startsWith("theme.")) return ({ "theme.brand": "브랜드 색", "theme.chartAccent": "차트 강조", "theme.monogram": "모노그램", "theme.density": "밀도" } as Record<string, string>)[k] ?? "테마";
  return FIELD_LABEL[k] ?? "기타 항목";
}

const STATUS_DOMAIN: Record<string, Parameters<typeof labelOf>[0]> = {
  tasks: "tasks.status", submissions: "submissions.status", members: "members.status", invitations: "invitations.status", field_reports: "field_reports.status",
};
export function valueText(field: string, v: unknown, resource?: string): string {
  if (v == null || v === "") return "없음";
  if (typeof v === "boolean") return v ? "켜짐" : "꺼짐";
  if (field === "role" || field === "default_role") return roleLabel(String(v));
  if (field === "status" && resource && STATUS_DOMAIN[resource]) return labelOf(STATUS_DOMAIN[resource]!, String(v));
  if (field === "review_status") return labelOf("meeting_segments.review_status", String(v));
  if (field === "kind" && resource === "field_reports") return labelOf("field_reports.kind", String(v));
  if (field === "share_scope") return labelOf("work_style_cards.share_scope", String(v));
  if (field === "overseas_notice_version") return noticeVersionText(String(v));
  if (field === "theme.density") return DENSITY_LABEL[String(v)] ?? String(v);
  if (Array.isArray(v)) return v.map((x) => SCOPE_LABEL[String(x)] ?? String(x)).join(", ") || "없음";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return formatDateTime(v);
  if (typeof v === "object") return "바뀜";
  return String(v);
}
export const DENSITY_LABEL: Record<string, string> = { comfortable: "보통", compact: "촘촘", public: "공공" };
