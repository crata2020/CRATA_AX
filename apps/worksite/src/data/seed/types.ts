// 시드 파일 계약(빌드 스펙 5.5.3절). 각 그룹은 src/data/seed/<group>.ts 하나에서 GroupModule을 내보냅니다.
//   - seed:  리소스 행 만들기(배열 또는 지연 함수)
//   - rpc:   custom({ url: "rpc:<이름>" }) 처리기(여러 행을 함께 바꾸는 업무 동작, 5.8절)
//   - sel:   custom({ url: "sel:<이름>" }) 읽기 전용 셀렉터(집계·검색, 권한 경로를 거친 행만 씀)
//   - ara:   ARA 개인 영역 시드(ara_settings 그룹만, 현재 페르소나 본인 것만)
import type { TenantConfig, PersonSeed, PlatformRole, PermissionBundle } from "@/tenants/types";
import type { Rng } from "@/lib/rng";
import type { ResourceName, RowOf, SeedRow, AraRowMap, AraResourceName } from "@/types/entities";
import type { CrudFilter, CrudSort } from "@refinedev/core";
import type { ANCHORS } from "./anchors";
import type { Clock } from "@/lib/clock";
import type { StatusValue } from "@/lib/status";
import type { ModuleId } from "@/modules/registry.generated";

export type GroupId = "home" | "work" | "collab" | "industry" | "ara_settings";

/** 시드 함수가 받는 것 */
export interface SeedContext {
  tenant: TenantConfig;
  /** 데모 '오늘' "YYYY-MM-DD" */
  today: string;
  /** 테넌트 slug + stream 이름으로 고정된 난수 */
  rng: (stream: string) => Rng;
  /** 앞 단계(reference → work → collab → industry → ara_settings → home)가 만든 행(읽기 전용) */
  get: <R extends ResourceName>(resource: R) => RowOf<R>[];
  anchors: typeof ANCHORS;
  /** 사람(TenantConfig.people) */
  people: PersonSeed[];
  /** 역할코드 → 그 역할의 첫 사람 id */
  memberOf: (roleCode: string) => string;
  /** 날짜 도우미: d(-3) = 오늘−3일 "YYYY-MM-DD", at(-3, "14:00") = 그날 KST 14:00의 UTC ISO */
  d: (offsetDays: number) => string;
  at: (offsetDays: number, time?: string) => string;
}

/** 리소스별 행 배열 또는 지연 함수(수천 행짜리는 함수로, 처음 읽을 때 만듦) */
export type SeedOutput = { [R in ResourceName]?: SeedRow<RowOf<R>>[] | (() => SeedRow<RowOf<R>>[]) };
export type GroupSeed = (ctx: SeedContext) => SeedOutput;

/** 현재 보고 있는 사람 */
export interface Persona {
  memberId: string;
  roleCode: string;
  role: PlatformRole;
  unitId: string;
  displayName: string;
  bundles: PermissionBundle[];
}

export interface ListOptions { filters?: CrudFilter[]; sorters?: CrudSort[] }

/** 셀렉터가 받는 것(읽기 전용, 권한 경로를 거친 행만) */
export interface SelectorContext {
  tenant: TenantConfig;
  persona: Persona;
  clock: Clock;
  today: string;
  /** 현재 페르소나가 볼 수 있는 행(getList와 같은 정책·금액 지우기) */
  list: <R extends ResourceName>(resource: R, opts?: ListOptions) => RowOf<R>[];
  get: <R extends ResourceName>(resource: R, id: string) => RowOf<R> | null;
  can: (resourceOrModule: ResourceName | ModuleId, action: string, row?: Record<string, unknown>) => boolean;
  isModuleOn: (id: ModuleId) => boolean;
}

export interface NotifyInput {
  recipientId: string;
  kind: StatusValue<"notifications.kind">;
  title: string;
  body?: string | null;
  link?: string | null;
  sourceModule?: ModuleId | null;
  sourceId?: string | null;
}

/** rpc 처리기가 받는 것. 쓰기는 정책을 거치지 않으니(업무 동작) 필요한 권한은 can()으로 직접 확인합니다 */
export interface ActionContext extends SelectorContext {
  /** 정책을 거치지 않은 읽기(업무 규칙 확인용. 화면에 그대로 돌려주지 않음) */
  raw: {
    list: <R extends ResourceName>(resource: R, opts?: ListOptions) => RowOf<R>[];
    get: <R extends ResourceName>(resource: R, id: string) => RowOf<R> | null;
  };
  insert: <R extends ResourceName>(resource: R, row: Partial<RowOf<R>>) => RowOf<R>;
  update: <R extends ResourceName>(resource: R, id: string, patch: Partial<RowOf<R>>) => RowOf<R>;
  remove: (resource: ResourceName, id: string) => void;
  /** 감사 기록 1건(rpc는 성공하면 1건 이상 남김, ARA 제외) */
  audit: (input: { action: string; resource: ResourceName; resourceId?: string | null; changes?: Record<string, [unknown, unknown]> | null; actorType?: "member" | "ai_connection" | "system"; actorClient?: string | null }) => void;
  notify: (input: NotifyInput) => void;
  newId: (resource: ResourceName) => string;
  /** 오류로 끝내기(403 "권한이 없어요" 등). 메시지는 해요체 한국어 */
  fail: (statusCode: number, message: string) => never;
}

export type RpcHandler = (ctx: ActionContext, payload: any) => unknown;
export type SelectorHandler = (ctx: SelectorContext, query: any) => unknown;

/** ARA 개인 영역 시드(현재 페르소나 1명분만) */
export type AraSeedRow<R extends AraResourceName> = Omit<AraRowMap[R], "member_id" | "created_at" | "updated_at"> & Partial<Pick<AraRowMap[R], "created_at" | "updated_at">>;
export type AraSeed = (ctx: { tenant: TenantConfig; persona: Persona; today: string; rng: (stream: string) => Rng; at: SeedContext["at"] }) => {
  [R in AraResourceName]?: AraSeedRow<R>[];
};

/** 그룹 시드 파일이 내보내는 것 */
export interface GroupModule {
  group: GroupId;
  seed: GroupSeed;
  rpc?: Record<string, RpcHandler>;
  sel?: Record<string, SelectorHandler>;
  ara?: AraSeed;
}

export type { SeedRow } from "@/types/entities";

/** 그룹 모듈 정의 도우미(타입 검사용) */
export const defineGroup = (m: GroupModule): GroupModule => m;

/** 그룹이 시드로 만드는 리소스(빌드 스펙 5.6절). seed/index.ts가 다른 그룹 리소스를 만들면 시작할 때 오류를 냅니다.
 *  kpis·kpi_values만 work(CR_*)·collab(AX_*)·industry(K*)가 함께 채웁니다(id 접두어로 나눔). */
export const GROUP_RESOURCES = {
  work: ["tasks", "progress_logs", "submissions", "meetings", "meeting_segments", "decisions", "action_proposals", "kpis", "kpi_values"],
  collab: ["artifacts", "artifact_versions", "templates", "corrections", "rules", "knowledge_items", "knowledge_links", "notices", "read_receipts", "calendar_events", "approval_links", "mail_connections", "mail_links", "mail_rules", "kpis", "kpi_values"],
  industry: ["partner_contacts", "opportunities", "quotes", "items", "process_steps", "boms", "material_grades", "sales_orders", "sales_order_lines", "shipments", "work_orders", "production_results", "equipment_run_logs", "inspections", "nonconformances", "customer_claims", "corrective_actions", "change_requests_4m", "gauges", "field_reports", "equipment", "equipment_checks", "breakdown_records", "legal_inspections", "pm_plans", "material_receipts", "stock_lots", "stock_movements", "purchase_orders", "safety_stocks", "price_indexes", "lot_links", "risk_assessments", "near_miss_reports", "worker_opinions", "semiannual_reviews", "legal_calendar_items", "kpis", "kpi_values"],
  ara_settings: ["mcp_connections", "mcp_policies", "invitations", "role_assignments", "position_role_maps", "work_style_cards", "wellbeing_consents", "wellbeing_aggregates", "audit_events"],
  home: ["notifications", "notification_preferences"],
} as const satisfies Record<GroupId, readonly ResourceName[]>;

/** 그룹이 구현할 이름 있는 동작·셀렉터(빌드 스펙 5.8절). reset_demo와 nav.badges는 Foundation이 이미 구현했습니다. */
export const GROUP_ACTIONS = {
  // 5.8절 기본 + 그룹이 화면 때문에 더한 동작(notes/<그룹>.md, 통합 때 반영)
  work: { rpc: ["submit_task", "approve_submission", "request_changes", "accept_action_proposal", "confirm_segment", "create_task", "confirm_decision"], sel: [] },
  collab: {
    rpc: ["mark_notice_read", "approve_rule", "reject_rule", "register_artifact", "finalize_artifact", "set_correction_reason", "publish_template", "verify_knowledge", "create_notice", "create_task_from_mail", "set_glossary_label"],
    sel: ["calendar.range"],
  },
  industry: {
    rpc: ["create_field_report", "set_equipment_status", "confirm_semiannual_review", "assign_field_report", "create_linked_task", "create_claim", "move_claim_column", "complete_d_step", "repair_breakdown", "create_safety_report"],
    sel: ["ops.today"],
  },
  ara_settings: {
    rpc: ["revoke_mcp_connection", "revoke_all_mcp", "set_card_share", "withdraw_wellbeing_consent", "update_my_profile", "request_profile_change", "set_module_enabled", "set_rollout_stage", "save_theme", "change_member_role", "set_member_status"],
    sel: [],
  },
  home: { rpc: ["mark_all_notifications_read", "save_notification_preferences"], sel: ["home.today", "home.rail", "search", "widget.<id>"] },
} as const;
