// 리소스 행 타입(빌드 스펙 5.6절). 필드 이름 = config/worksite_modules.yaml entities.fields + 스펙이 더한 필드.
// 리소스 이름 = 2단계 DB 테이블 이름(snake_case 복수형). enum 값은 src/lib/status.ts가 정본입니다.
// 이 파일은 Foundation 소유입니다. 필드가 더 필요하면 notes/<group>.md에 적어 주세요.
import type { StatusValue as S } from "@/lib/status";
import type { PlatformRole, Sensitivity, PlatformTermKey } from "@/tenants/types";
import type { ModuleId } from "@/modules/registry.generated";

/** "YYYY-MM-DD"(KST 날짜) */
export type DateStr = string;
/** UTC ISO 시각 "2026-09-30T00:12:00.000Z" */
export type IsoTime = string;

/** 모든 행의 공통 필드(공급자가 채움) */
export interface RowBase {
  id: string;
  tenant_id: string;
  is_demo: boolean;
  created_at: IsoTime;
  updated_at: IsoTime;
  created_by?: string | null;
}
/** 시드·생성 입력: 공통 필드는 공급자가 채우므로 빼도 됩니다 */
export type SeedRow<T extends RowBase> = Omit<T, "tenant_id" | "is_demo" | "created_at" | "updated_at"> & Partial<Pick<T, "created_at" | "updated_at">>;
/** 공급자가 meta.expand로 붙이는 관계 행 */
export type WithRel<T, R extends Record<string, unknown>> = T & { _rel?: Partial<R> };

// ───────── 기준 데이터(Foundation)
export interface OrgUnit extends RowBase { name: string; parent_id: string | null; head_member_id: string | null; sort_order: number; valid_from?: DateStr | null; valid_to?: DateStr | null }
export interface Member extends RowBase {
  display_name: string; email: string; phone_work: string; org_unit_id: string; position: string | null; job_title: string; duties: string | null;
  role: PlatformRole; status: S<"members.status">; joined_at: DateStr | null; avatar_ref: null; external_ids: Record<string, string> | null;
  role_code: string; is_persona: boolean;
  /** 조직도 순서(조직 sortOrder × 100 + 조직장 먼저, 나머지는 사람 순서). 구성원 목록 정렬용 */
  org_order?: number;
}
export interface BusinessLine extends RowBase { code: string; name: string; description: string; owner_member_id: string; status: "active" | "inactive"; sort_order: number; hypothesis?: boolean }
export interface Project extends RowBase {
  business_line_id: string; code: string; name: string; aliases: string[]; partner_id: string | null; owner_member_id: string; reviewer_member_id: string;
  start_on: DateStr; due_on: DateStr; status: S<"projects.status">; health: S<"projects.health">; sensitivity: Sensitivity; description: string; member_ids: string[];
}
export interface Part extends RowBase { project_id: string; name: string; lead_member_id: string; member_ids: string[]; sort_order: number }
export interface Partner extends RowBase { kind: S<"partners.kind">; name: string; biz_reg_no: string | null; status: S<"partners.status">; owner_member_id: string; tags: string[]; external_ids: Record<string, string> | null; note?: string | null }
export interface CompanyInfo extends RowBase {
  legal_name: string | null; display_name: string; address: string | null; phone: string | null; website: string | null; founded_on: string | null;
  vision: unknown; values: unknown; policies: unknown; history: unknown; certifications: unknown; logo_ref: null;
}
export interface TenantOverrides {
  /** 모듈 켜기·끄기 덮어쓰기(A-07) */
  modules?: Partial<Record<ModuleId, boolean>>;
  /** 브랜드·테마 덮어쓰기(A-08) */
  theme?: { brand?: string; chartAccent?: string; monogram?: string; density?: "comfortable" | "compact" | "public" };
  /** 화면 용어 덮어쓰기(C-06) */
  glossary?: Partial<Record<PlatformTermKey, string>>;
}
export interface TenantSettings extends RowBase {
  display_name: string; brand_tokens: unknown; logo_ref: null; locale: "ko"; timezone: "Asia/Seoul"; enabled_modules: ModuleId[]; enabled_packs: string[];
  nav_overrides: unknown; data_class_defaults: unknown; profile_version: string; overrides: TenantOverrides;
}
export interface GlossaryTerm extends RowBase { term: string; ui_label: string; aliases: string[]; forbidden: boolean; definition: string; platform_key: PlatformTermKey | null; to_confirm: boolean; evidence?: string[] }
export interface AssignmentRule extends RowBase { name: string; condition: string; assignee_rule: string; reviewer_rule: string; source_ref: string | null; active: boolean }

// ───────── work
export interface Task extends RowBase {
  project_id: string; part_id: string | null; title: string; description: string | null; task_type: string | null;
  assignee_id: string; reviewer_id: string; due_at: IsoTime | null; priority: S<"tasks.priority">; status: S<"tasks.status">;
  source: S<"tasks.source">; source_ref: string | null; estimate_hours: number | null; sensitivity: Sensitivity;
}
export interface ProgressLog extends RowBase { task_id: string; author_id: string; body: string; via: S<"via">; via_client: string | null }
export interface Submission extends RowBase {
  task_id: string; version: number; artifact_id: string | null; summary: string; submitted_by: string; via: S<"via">; via_client: string | null;
  idempotency_key: string | null; status: S<"submissions.status">; review_comment: string | null; reviewed_by: string | null; reviewed_at: IsoTime | null; submitted_at: IsoTime;
}
export interface Meeting extends RowBase {
  title: string; title_prefix: string | null; meeting_type: S<"meetings.meeting_type">; project_ids: string[]; started_at: IsoTime; duration_min: number;
  attendee_ids: string[]; source: "plaud" | "clova" | "manual" | "other"; transcript_ref: string | null; summary: string | null; sensitivity: Sensitivity; status: S<"meetings.status">;
}
export interface MeetingSegment extends RowBase {
  meeting_id: string; start_ts: number; end_ts: number; business_line_code: string | null; project_code: string | null; task_type: string | null;
  confidence: number; evidence_quote: string; review_status: S<"meeting_segments.review_status">;
}
export interface Decision extends RowBase { meeting_id: string; project_id: string | null; statement: string; decided_by_role: string | null; decided_at: IsoTime; supersedes_id: string | null; status: S<"decisions.status"> }
export interface ActionProposal extends RowBase { meeting_id: string; segment_id: string | null; title: string; suggested_assignee_id: string | null; suggested_due_at: IsoTime | null; status: S<"action_proposals.status">; task_id: string | null }
/** kpis·kpi_values는 work(CR_*)·collab(AX_*)·industry(K*)가 나눠 채움 */
export interface Kpi extends RowBase { name: string; unit: string; baseline: number | null; target: number | null; target_label?: string | null; measure_source: string | null; owner_id: string | null; review_cycle: string | null }
export interface KpiValue extends RowBase { kpi_id: string; period: string; value: number; note: string | null; recorded_at: IsoTime }

// ───────── collab
export interface Artifact extends RowBase {
  project_id: string | null; task_id: string | null; doc_type: S<"artifacts.doc_type">; template_id: string | null; title: string; current_version: number;
  file_ref: string | null; ai_generated: boolean; sensitivity: Sensitivity; owner_id: string; status: S<"artifacts.status">;
}
export interface ArtifactVersion extends RowBase { artifact_id: string; ver: number; kind: S<"artifact_versions.kind">; file_ref: string | null; author_id: string | null; author_kind?: "member" | "ai"; applied_rule_ids: string[] }
export interface Template extends RowBase { doc_type: S<"artifacts.doc_type">; name: string; format: "PPTX" | "DOCX" | "XLSX" | "HWP" | "PDF"; version: string; file_ref: string | null; owner_id: string; status: S<"templates.status">; to_collect?: boolean }
export interface Correction extends RowBase {
  artifact_id: string; ai_ver: number; final_ver: number; diff_kind: "insert" | "delete" | "replace" | "move"; before: string | null; after: string | null; reason: string | null;
  scope_suggested: S<"corrections.scope">; scope_confidence: number; status: S<"corrections.status">; linked_rule_id: string | null;
}
export interface Rule extends RowBase {
  scope_level: S<"corrections.scope">; doc_types: S<"artifacts.doc_type">[]; statement: string; evidence_ids: string[]; examples: string[]; compiled_to: string | null;
  approver_id: string | null; status: S<"rules.status">; valid_from: DateStr | null; review_by: DateStr | null; supersedes_id: string | null; stats: { applied: number; overridden: number };
}
export interface KnowledgeItem extends RowBase { kind: S<"knowledge_items.kind">; title: string; summary: string; body_ref: string | null; project_id: string | null; owner_id: string; source_ref: string | null; verified_at: DateStr | null; review_by: DateStr | null; status: S<"knowledge_items.status"> }
export interface KnowledgeLink extends RowBase { from_type: string; from_id: string; to_type: string; to_id: string; relation: string }
export interface Notice extends RowBase {
  category: S<"notices.category">; title: string; body: string; author_id: string; audience: { type: "all" | "unit" | "role" | "project"; ids?: string[] };
  pinned: boolean; must_read: boolean; published_at: IsoTime; expires_at: IsoTime | null; attachments: { name: string; url: string }[];
}
export interface ReadReceipt extends RowBase { notice_id: string; member_id: string; read_at: IsoTime }
export interface CalendarEvent extends RowBase {
  source: "manual" | "google" | "m365" | "naverworks"; external_id: string | null; title: string; kind: S<"calendar_events.kind">; start_at: IsoTime; end_at: IsoTime;
  all_day: boolean; project_id: string | null; attendee_ids: string[]; visibility: S<"calendar_events.visibility">;
}
export interface ApprovalLink extends RowBase {
  system: string; doc_no: string; title: string; form_name: string; requester_id: string; current_approver_id: string | null; status: S<"approval_links.status">;
  submitted_at: IsoTime; completed_at: IsoTime | null; url: string; related_type: "task" | "project" | null; related_id: string | null;
}
export interface MailConnection extends RowBase { member_id: string; provider: "imap" | "gmail" | "m365" | "naverworks"; scopes: string[]; status: "connected" | "revoked" | "preview"; connected_at: IsoTime; revoked_at: IsoTime | null; account_label?: string; last_checked_at?: IsoTime | null }
export interface MailLink extends RowBase {
  member_id: string; provider_message_id: string; thread_id: string | null; subject: string; from_address: string; partner_id: string | null; project_id: string | null;
  classified_by: "rule" | "ai" | "manual" | null; confidence: number | null; received_at: IsoTime; suggested_task_id: string | null; shared_to_project: boolean;
  suggestion?: string | null; suggestion_status?: "proposed" | "accepted" | "dismissed" | null;
}
export interface MailRule extends RowBase { condition: string; project_id: string | null; action: string; active: boolean }

// ───────── industry (CRM 라이트)
export interface PartnerContact extends RowBase { partner_id: string; name: string; dept: string | null; title: string | null; email: string; phone: string | null; is_primary: boolean }
export interface Opportunity extends RowBase { partner_id: string; title: string; stage: S<"opportunities.stage">; owner_id: string; expected_on: DateStr | null; amount_krw: number | null }
export interface Quote extends RowBase { opportunity_id: string; partner_id: string; quote_no: string; status: S<"quotes.status">; amount_krw: number | null; discount_rate: number | null; issued_on: DateStr | null; valid_until: DateStr | null; artifact_id: string | null }

// ───────── industry (제조 팩)
export interface Item extends RowBase {
  item_no: string; name: string; kind: "raw" | "knit" | "part"; material_grade: string; spec: string | null; unit: "kg" | "m" | "개"; customer_part_no: string | null;
  partner_id: string | null; status: "active" | "inactive"; mesh_grade: string | null; wire_dia_mm: number | null; form_process: "crimping" | "pressing" | "spiralling" | "none" | null;
  application_category: string | null; special_char: boolean; knit_width_mm: number | null; dims: Record<string, number> | null;
}
export interface ProcessStep extends RowBase { code: string; name: string; sequence: number; equipment_kind: string | null; std_cycle_note: string | null; inspection_points: string[]; hypothesis?: boolean }
export interface Bom extends RowBase { parent_item_id: string; child_item_id: string; qty_per: number; unit: string }
export interface MaterialGrade extends RowBase { code: string; label: string; color_tag: string; text_tag: string; heat_resistant_note: string | null }
export interface SalesOrder extends RowBase { partner_id: string; customer_po_no: string; order_date: DateStr; status: S<"sales_orders.status">; owner_id: string; source: "mail" | "fax" | "portal" | "phone"; attachment_refs: string[] }
export interface SalesOrderLine extends RowBase { order_id: string; item_id: string; qty: number; due_date: DateStr; status: S<"sales_orders.status">; promised_date: DateStr | null; unit_price: number | null; shipped_qty: number; late_reason: string | null }
export interface Shipment extends RowBase { order_id: string; order_line_id?: string | null; ship_date: DateStr; qty: number; lot_ids: string[]; delivery_note_no: string | null; status: S<"shipments.status">; outgoing_inspection_id: string | null; packing_photo_names: string[] }
export interface WorkOrder extends RowBase {
  order_line_id: string | null; item_id: string; process_step_id: string; planned_qty: number; planned_date: DateStr; equipment_id: string | null; status: S<"work_orders.status">;
  material_lot_ids: string[]; std_ref: string | null; shift: "day" | "night"; lot_no: string | null;
}
export interface ProductionResult extends RowBase {
  work_order_id: string; date: DateStr; process_step_id: string; equipment_id: string | null; item_id: string; good_qty: number; defect_qty: number; lot_no: string | null;
  /** 시드에는 넣지만 어떤 화면·집계에도 쓰지 않음(개인 실적 금지) */
  worker_ids: string[]; note: string | null; shift: "day" | "night"; start_at: IsoTime | null; end_at: IsoTime | null; downtime_min: number; defect_breakdown: Record<string, number> | null;
}
export interface EquipmentRunLog extends RowBase { equipment_id: string; date: DateStr; shift: "day" | "night"; status: Exclude<S<"equipment_run_logs.status">, "none">; reason: string | null; recorded_by: string; recorded_at: IsoTime }
export interface Inspection extends RowBase { kind: S<"inspections.kind">; item_id: string; lot_no: string | null; inspected_on: DateStr; inspector_id: string | null; result: S<"inspections.result">; measurements_ref: string | null; sample_size: number | null; photo_names: string[]; work_order_id: string | null }
export interface Nonconformance extends RowBase { source: "field_report" | "inspection" | "claim"; item_id: string | null; lot_no: string | null; qty: number; defect_type: string; found_on: DateStr; disposition: S<"nonconformances.disposition"> | null; status: S<"nonconformances.status">; linked_task_id: string | null; qty_disposed: number | null }
export interface CustomerClaim extends RowBase {
  partner_id: string; item_id: string; received_on: DateStr; description: string; status: S<"customer_claims.status">; due_on: DateStr | null;
  claim_no: string; customer_ref_no: string | null; qty_affected: number; lot_nos: string[]; containment_due: DateStr | null; report_8d_due: DateStr | null; severity: S<"customer_claims.severity">;
}
export interface DStep { step: "D0" | "D1" | "D2" | "D3" | "D4" | "D5" | "D6" | "D7" | "D8"; status: S<"corrective_actions.step_status">; done_on: DateStr | null; note?: string | null; owner_id?: string | null }
export interface CorrectiveAction extends RowBase {
  related_type: "claim" | "nonconformance"; related_id: string; method: "8D" | "simple"; root_cause: string | null; actions: string | null; owner_id: string; due_on: DateStr | null;
  status: "open" | "closed"; artifact_id: string | null; d_steps: DStep[]; containment: string | null; verification: string | null; horizontal_deployment: string | null;
}
export interface ChangeRequest4M extends RowBase {
  change_no: string; category: S<"change_requests_4m.category">; description: string; affected_item_ids: string[]; reason: string; risk_note: string | null;
  customer_notice_required: boolean; customer_approval_status: S<"change_requests_4m.customer_approval_status">; ppap_required: boolean; initial_lot_no: string | null;
  effective_on: DateStr | null; status: S<"change_requests_4m.status">; requested_by: string; requested_on: DateStr;
}
export interface Gauge extends RowBase { gauge_no: string; kind: string; range: string | null; location: string | null; cycle_months: number; last_calibrated_on: DateStr | null; next_due_on: DateStr; cert_ref: string | null; status: "active" | "calibrating" | "retired" }
export interface FieldReport extends RowBase {
  kind: S<"field_reports.kind">; note: string; photo_name: string | null; process_step_id: string | null; equipment_id: string | null; reported_by: string | null;
  anonymous: boolean; reported_at: IsoTime; status: S<"field_reports.status">; assignee_id: string | null; linked_type: string | null; linked_id: string | null;
}
export interface Equipment extends RowBase { equipment_no: string; kind: string; name: string; location: string | null; status: S<"equipment.status">; installed_on: DateStr | null; note: string | null; capacity: string | null; legal_inspection_required: boolean; next_legal_inspection_on: DateStr | null }
export interface EquipmentCheck extends RowBase { equipment_id: string; kind: "daily" | "periodic"; checked_on: DateStr; checked_by: string; result: "ok" | "issue"; findings: string | null; items_result: Record<string, boolean> | null }
export interface BreakdownRecord extends RowBase { equipment_id: string; occurred_at: IsoTime; symptom: string; downtime_min: number | null; cause: string | null; repair: string | null; repaired_by: string | null; linked_task_id: string | null; status: S<"breakdown_records.status"> }
export interface LegalInspection extends RowBase { equipment_id: string; kind: string; due_on: DateStr; done_on: DateStr | null; result: S<"legal_inspections.result">; cert_ref: string | null }
export interface PmPlan extends RowBase { equipment_id: string; task: string; cycle: string; last_done_on: DateStr | null; next_due_on: DateStr; owner_id: string | null }
export interface MaterialReceipt extends RowBase {
  partner_id: string; item_id: string; supplier_lot_no: string; qty: number; received_on: DateStr; cert_ref: string | null; inspection_id: string | null;
  heat_no: string | null; cert_type: string | null; material_grade_verified: boolean | null; wire_dia_measured: number | null;
}
export interface StockLot extends RowBase { item_id: string; lot_no: string; qty_on_hand: number; location: string | null; status: S<"stock_lots.status"> }
export interface StockMovement extends RowBase { lot_id: string; kind: "in" | "out" | "adjust" | "consume"; qty: number; moved_at: IsoTime; ref_type: string | null; ref_id: string | null }
export interface PurchaseOrder extends RowBase { partner_id: string; ordered_on: DateStr; lines: { item_id: string; qty: number; unit_price: number | null }[]; due_on: DateStr | null; status: S<"purchase_orders.status">; po_no?: string }
export interface SafetyStock extends RowBase { item_id: string; min_days: number; reorder_qty: number }
export interface PriceIndex extends RowBase { index_name: string; material: string; period: string; value: number; unit: string; source: "예시" }
export interface LotLink extends RowBase { parent_lot: string; child_lot: string; qty: number; process_step_id: string | null; linked_at: IsoTime }
export interface RiskAssessment extends RowBase {
  work_area: string; process: string; hazard: string; risk_level_before: S<"risk_assessments.risk_level">; control_measures: string; owner_id: string | null; due_on: DateStr | null;
  status: S<"risk_assessments.status">; risk_level_after: S<"risk_assessments.risk_level"> | null; worker_participation_note: string | null; evidence_refs: string[]; assessed_on: DateStr;
  kind: S<"risk_assessments.kind">; participants: number | null; participation_method: string | null; shared_before_on: DateStr | null; shared_after_on: DateStr | null; share_channel: string | null;
}
export interface NearMissReport extends RowBase { reported_by: string | null; anonymous: boolean; occurred_at: IsoTime; location: string | null; description: string; photo_refs: string[]; status: S<"near_miss_reports.status">; linked_task_id: string | null }
export interface WorkerOpinion extends RowBase { channel: "web" | "paper" | "meeting"; submitted_at: IsoTime; anonymous: boolean; content: string; response: string | null; status: "new" | "answered" | "closed" }
export interface SemiannualReview extends RowBase { half: string; item: string; checked_on: DateStr | null; checked_by: string | null; findings: string | null; actions: string | null; result: S<"semiannual_reviews.result">; evidence_ref: string | null; basis?: string; title?: string }
export interface LegalCalendarItem extends RowBase { kind: S<"legal_calendar_items.kind">; title: string; basis: string; due_on: DateStr; owner_id: string | null; status: S<"legal_calendar_items.status"> }

// ───────── ara_settings
export interface McpConnection extends RowBase { member_id: string; client_name: S<"mcp_connections.client_name">; client_id: string; scopes: string[]; last_used_at: IsoTime | null; revoked_at: IsoTime | null }
export interface McpPolicy extends RowBase { enabled: boolean; read_only: boolean; allowed_clients: S<"mcp_connections.client_name">[]; allowed_scopes: string[]; overseas_notice_version: string; updated_by: string | null }
export interface Invitation extends RowBase { email: string; role: PlatformRole; org_unit_id: string | null; invited_by: string; expires_at: IsoTime; status: S<"invitations.status"> }
export interface RoleAssignment extends RowBase { member_id: string; role: PlatformRole; scope_type: "company" | "business_line" | "project"; scope_id: string | null; granted_by: string | null; granted_at: IsoTime }
export interface PositionRoleMap extends RowBase { position_or_title: string; default_role: PlatformRole }
export interface WorkStyleCard extends RowBase { member_id: string; sentence: string; share_scope: S<"work_style_cards.share_scope">; shared_with_ids: string[]; shared_at: IsoTime | null; revoked_at: IsoTime | null }
export interface WellbeingConsent extends RowBase { member_id: string; ai_notice_at: IsoTime | null; privacy_consent_at: IsoTime | null; sensitive_consent_at: IsoTime | null; withdrawn_at: IsoTime | null }
export interface WellbeingAggregate extends RowBase { period_month: string; population_n: number; active_seats: number; assessment_completion_rate: number | null; card_share_rate: number | null; topic_distribution: Record<string, number> | null }
export interface AuditEvent extends RowBase {
  at: IsoTime; actor_id: string | null; actor_type: S<"audit_events.actor_type">; actor_client?: string | null; action: string; resource: string; resource_id: string | null;
  changes: Record<string, [unknown, unknown]> | null; ip: null; user_agent: null; request_id: string | null;
}

// ───────── home
export interface Notification extends RowBase {
  recipient_id: string; kind: S<"notifications.kind">; title: string; body: string | null; link: string | null; source_module: ModuleId | null; source_id: string | null;
  channel: "site"; batched_at: IsoTime | null; read_at: IsoTime | null;
}
export interface NotificationPreference extends RowBase {
  /** null이면 회사 기본값 행 */
  member_id: string | null; kind: S<"notifications.kind"> | "*"; channels: { site: boolean; messenger: boolean; mail: boolean };
  digest: "instant" | "twice_daily" | "daily"; quiet_hours: { from: string; to: string } | null;
}

/** 리소스 이름 → 행 타입 */
export interface ResourceRowMap {
  org_units: OrgUnit; members: Member; business_lines: BusinessLine; projects: Project; parts: Part; partners: Partner; company_info: CompanyInfo;
  tenant_settings: TenantSettings; glossary_terms: GlossaryTerm; assignment_rules: AssignmentRule;
  tasks: Task; progress_logs: ProgressLog; submissions: Submission; meetings: Meeting; meeting_segments: MeetingSegment; decisions: Decision;
  action_proposals: ActionProposal; kpis: Kpi; kpi_values: KpiValue;
  artifacts: Artifact; artifact_versions: ArtifactVersion; templates: Template; corrections: Correction; rules: Rule; knowledge_items: KnowledgeItem;
  knowledge_links: KnowledgeLink; notices: Notice; read_receipts: ReadReceipt; calendar_events: CalendarEvent; approval_links: ApprovalLink;
  mail_connections: MailConnection; mail_links: MailLink; mail_rules: MailRule;
  partner_contacts: PartnerContact; opportunities: Opportunity; quotes: Quote;
  items: Item; process_steps: ProcessStep; boms: Bom; material_grades: MaterialGrade; sales_orders: SalesOrder; sales_order_lines: SalesOrderLine;
  shipments: Shipment; work_orders: WorkOrder; production_results: ProductionResult; equipment_run_logs: EquipmentRunLog; inspections: Inspection;
  nonconformances: Nonconformance; customer_claims: CustomerClaim; corrective_actions: CorrectiveAction; change_requests_4m: ChangeRequest4M; gauges: Gauge;
  field_reports: FieldReport; equipment: Equipment; equipment_checks: EquipmentCheck; breakdown_records: BreakdownRecord; legal_inspections: LegalInspection;
  pm_plans: PmPlan; material_receipts: MaterialReceipt; stock_lots: StockLot; stock_movements: StockMovement; purchase_orders: PurchaseOrder;
  safety_stocks: SafetyStock; price_indexes: PriceIndex; lot_links: LotLink; risk_assessments: RiskAssessment; near_miss_reports: NearMissReport;
  worker_opinions: WorkerOpinion; semiannual_reviews: SemiannualReview; legal_calendar_items: LegalCalendarItem;
  mcp_connections: McpConnection; mcp_policies: McpPolicy; invitations: Invitation; role_assignments: RoleAssignment; position_role_maps: PositionRoleMap;
  work_style_cards: WorkStyleCard; wellbeing_consents: WellbeingConsent; wellbeing_aggregates: WellbeingAggregate; audit_events: AuditEvent;
  notifications: Notification; notification_preferences: NotificationPreference;
}
export type ResourceName = keyof ResourceRowMap;
export type RowOf<R extends ResourceName> = ResourceRowMap[R];
/** 아무 행(시드 파이프라인 내부용) */
export type Row = RowBase & Record<string, unknown>;

// ───────── ARA 공급자(P 영역, 회사 공급자와 분리)
export interface AraProfile { id: "profile"; member_id: string; consented_at: IsoTime | null; steps_done: number; created_at: IsoTime; updated_at: IsoTime }
export interface AraCardSentence { id: string; member_id: string; text: string; order: number; share_scope: S<"work_style_cards.share_scope">; created_at: IsoTime; updated_at: IsoTime }
export interface AraMessage { id: string; member_id: string; role: "me" | "ara"; text: string; created_at: IsoTime; updated_at: IsoTime }
export interface AraRowMap { ara_profile: AraProfile; ara_card_sentences: AraCardSentence; ara_messages: AraMessage }
export type AraResourceName = keyof AraRowMap;
