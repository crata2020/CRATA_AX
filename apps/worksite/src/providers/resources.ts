// 리소스 카탈로그(빌드 스펙 5.6절): 리소스 → 모듈·id 접두어·본인 필드·성질·시드 담당 그룹.
// 메모리 공급자, 정책(policy.ts), 접근 제어, Refine resources 등록이 모두 이 표를 씁니다.
import type { ModuleId } from "@/modules/registry.generated";
import type { ResourceName } from "@/types/entities";

export type SeedGroup = "reference" | "home" | "work" | "collab" | "industry" | "ara_settings";

export interface ResourceSpec {
  module: ModuleId;
  labelKo: string;
  /** 새 id 접두어: `${prefix}-${base36 시각}${순번}` */
  idPrefix: string;
  /** 권한 등급 own일 때 '본인 행'을 가리는 필드 */
  ownerField?: string;
  /** 역할과 관계없이 본인 것만(owner·admin 포함) */
  alwaysOwn?: boolean;
  /** alwaysOwn일 때 ownerField가 null인 행(회사 기본값)은 모두 읽을 수 있음 */
  ownerNullShared?: boolean;
  /** 감사 로그처럼 list·show만(수정·삭제 403) */
  immutable?: boolean;
  /** 진행 기록처럼 추가만(수정·삭제 403) */
  appendOnly?: boolean;
  /** view_prices 묶음이 없으면 null로 지우는 필드 */
  priceFields?: string[];
  /** view_prices 묶음이 없으면 목록 자체가 0행 */
  priceResource?: boolean;
  /** 모듈 권한이 none·own이어도 모두 읽기(쓰기는 owner·admin) */
  readAll?: boolean;
  /** 등급 own에서 ownerField가 없어도 만들기 허용 */
  ownCreate?: boolean;
  /** 감사 기록을 남기지 않음 */
  noAudit?: boolean;
  /** 감사 기록에서 가리는 필드 */
  maskFields?: string[];
  /** 시드를 만드는 그룹(빌드 스펙 7.3절) */
  seedGroup: SeedGroup;
  /** ?empty=1에서도 행을 남김(5.5.4절) */
  keepInEmptyMode?: boolean;
}

const r = (module: ModuleId, labelKo: string, idPrefix: string, seedGroup: SeedGroup, extra: Partial<ResourceSpec> = {}): ResourceSpec => ({ module, labelKo, idPrefix, seedGroup, ...extra });

export const RESOURCES: Record<ResourceName, ResourceSpec> = {
  // 기준 데이터(Foundation)
  org_units: r("org-members", "조직", "U", "reference", { keepInEmptyMode: true }),
  members: r("org-members", "구성원", "m", "reference", { keepInEmptyMode: true, maskFields: ["email", "phone_work"] }),
  business_lines: r("business-structure", "사업", "bl", "reference"),
  projects: r("business-structure", "프로젝트", "prj", "reference"),
  parts: r("business-structure", "파트", "part", "reference"),
  partners: r("partners", "거래처", "p", "reference"),
  company_info: r("company-info", "회사 정보", "company", "reference", { keepInEmptyMode: true }),
  tenant_settings: r("admin-settings", "회사 설정", "settings", "reference", { keepInEmptyMode: true }),
  glossary_terms: r("admin-settings", "용어", "g", "reference", { keepInEmptyMode: true, readAll: true }),
  assignment_rules: r("tasks", "배분 규칙", "ar", "reference"),
  // work
  tasks: r("tasks", "업무", "t", "work", { ownerField: "assignee_id" }),
  progress_logs: r("tasks", "진행 기록", "pl", "work", { ownerField: "author_id", appendOnly: true }),
  submissions: r("tasks", "제출", "sub", "work", { ownerField: "submitted_by" }),
  meetings: r("meetings", "회의", "mtg", "work"),
  meeting_segments: r("meetings", "회의 구간", "seg", "work"),
  decisions: r("meetings", "결정", "dec", "work"),
  action_proposals: r("meetings", "액션 제안", "ap", "work"),
  kpis: r("reports", "KPI", "kpi", "work"),
  kpi_values: r("reports", "KPI 값", "kv", "work"),
  // collab
  artifacts: r("documents", "산출물", "art", "collab", { ownerField: "owner_id" }),
  artifact_versions: r("documents", "산출물 버전", "av", "collab"),
  templates: r("documents", "양식", "tpl", "collab"),
  corrections: r("correction-rules", "수정 기록", "cor", "collab"),
  rules: r("correction-rules", "작성 규칙", "rule", "collab"),
  knowledge_items: r("knowledge", "지식", "ki", "collab", { ownerField: "owner_id" }),
  knowledge_links: r("knowledge", "지식 연결", "kl", "collab"),
  notices: r("notices", "공지", "ntc", "collab"),
  read_receipts: r("notices", "읽음 확인", "rr", "collab", { ownerField: "member_id", noAudit: true }),
  calendar_events: r("calendar", "일정", "ev", "collab", { ownerField: "created_by" }),
  approval_links: r("approvals", "결재 연결", "apv", "collab", { ownerField: "requester_id" }),
  mail_connections: r("mail-connector", "메일 연결", "mc", "collab", { ownerField: "member_id", alwaysOwn: true }),
  mail_links: r("mail-connector", "메일 분류", "ml", "collab", { ownerField: "member_id", alwaysOwn: true }),
  mail_rules: r("mail-connector", "메일 규칙", "mr", "collab"),
  // industry
  partner_contacts: r("partners", "거래처 담당자", "pc", "industry", { maskFields: ["email", "phone"] }),
  opportunities: r("edu-sales", "영업 기회", "opp", "industry", { ownerField: "owner_id", priceFields: ["amount_krw"] }),
  quotes: r("edu-sales", "견적", "q", "industry", { priceFields: ["amount_krw", "discount_rate"] }),
  items: r("mfg-master-data", "품목", "it", "industry"),
  process_steps: r("mfg-master-data", "공정", "ps", "industry"),
  boms: r("mfg-master-data", "BOM", "bom", "industry"),
  material_grades: r("mfg-master-data", "재질", "mg", "industry"),
  sales_orders: r("mfg-orders", "수주", "so", "industry"),
  sales_order_lines: r("mfg-orders", "수주 줄", "sol", "industry", { priceFields: ["unit_price"] }),
  shipments: r("mfg-orders", "출하", "shp", "industry"),
  work_orders: r("mfg-production", "작업지시", "wo", "industry"),
  production_results: r("mfg-production", "생산 실적", "prr", "industry"),
  equipment_run_logs: r("mfg-production", "설비 가동 기록", "erl", "industry", { ownerField: "recorded_by" }),
  inspections: r("mfg-quality", "검사", "ins", "industry"),
  nonconformances: r("mfg-quality", "부적합", "nc", "industry"),
  customer_claims: r("mfg-quality", "고객 클레임", "clm", "industry"),
  corrective_actions: r("mfg-quality", "시정조치", "ca", "industry"),
  change_requests_4m: r("mfg-quality", "4M 변경", "cr4m", "industry"),
  gauges: r("mfg-quality", "계측기", "ga", "industry"),
  field_reports: r("mfg-quality", "현장 등록", "fr", "industry", { ownerField: "reported_by" }),
  equipment: r("mfg-equipment", "설비", "eq", "industry"),
  equipment_checks: r("mfg-equipment", "설비 점검", "ec", "industry", { ownerField: "checked_by" }),
  breakdown_records: r("mfg-equipment", "고장·수리", "bd", "industry"),
  legal_inspections: r("mfg-equipment", "법정 검사", "li", "industry"),
  pm_plans: r("mfg-equipment", "보전 일정", "pm", "industry"),
  material_receipts: r("mfg-materials", "자재 입고", "rcv", "industry"),
  stock_lots: r("mfg-materials", "재고 LOT", "sl", "industry"),
  stock_movements: r("mfg-materials", "입출고", "mv", "industry"),
  purchase_orders: r("mfg-materials", "발주", "po", "industry", { priceFields: ["lines[].unit_price"] }),
  safety_stocks: r("mfg-materials", "안전재고", "ss", "industry"),
  price_indexes: r("mfg-materials", "원재료 가격", "pi", "industry", { priceResource: true }),
  lot_links: r("mfg-materials", "LOT 연결", "ll", "industry"),
  risk_assessments: r("safety-health", "위험성평가", "risk", "industry"),
  near_miss_reports: r("safety-health", "아차사고", "nm", "industry", { ownerField: "reported_by" }),
  worker_opinions: r("safety-health", "근로자 의견", "wop", "industry", { ownCreate: true }),
  semiannual_reviews: r("safety-health", "반기 점검", "sr", "industry"),
  legal_calendar_items: r("safety-health", "법정 일정", "lc", "industry"),
  // ara_settings
  mcp_connections: r("ai-connect", "AI 연결", "mcp", "ara_settings", { ownerField: "member_id" }),
  mcp_policies: r("ai-connect", "AI 연결 정책", "mcppol", "ara_settings", { readAll: true }),
  invitations: r("admin-members", "초대", "inv", "ara_settings", { maskFields: ["email"] }),
  role_assignments: r("admin-members", "역할 부여", "rasg", "ara_settings"),
  position_role_maps: r("admin-members", "직책-역할 매핑", "prm", "ara_settings"),
  work_style_cards: r("ara-wellbeing", "일하는 방식 카드(공유 사본)", "wsc", "ara_settings", { ownerField: "member_id" }),
  wellbeing_consents: r("ara-wellbeing", "복지 동의", "wcon", "ara_settings", { ownerField: "member_id", alwaysOwn: true, noAudit: true }),
  wellbeing_aggregates: r("ara-wellbeing", "복지 집계", "wagg", "ara_settings"),
  audit_events: r("audit-log", "감사 기록", "ae", "ara_settings", { ownerField: "actor_id", immutable: true, noAudit: true }),
  // home
  notifications: r("notifications", "알림", "ntf", "home", { ownerField: "recipient_id", alwaysOwn: true, noAudit: true }),
  notification_preferences: r("notifications", "알림 설정", "npref", "home", { ownerField: "member_id", alwaysOwn: true, ownerNullShared: true, noAudit: true }),
};

export const RESOURCE_NAMES = Object.keys(RESOURCES) as ResourceName[];
export const isResourceName = (v: string): v is ResourceName => v in RESOURCES;

/** 리소스 → 모듈 */
export const moduleOfResource = (resource: string): ModuleId | undefined => (isResourceName(resource) ? RESOURCES[resource].module : undefined);
