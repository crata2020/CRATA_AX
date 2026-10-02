// meta.expand 관계 정의(빌드 스펙 5.5.1절). useList({ meta: { expand: ["project", "assignee"] } })
// → 각 행의 _rel.project, _rel.assignee에 관계 행을 붙입니다(볼 수 없는 행이면 null).
// 표에 없는 이름은 관례로 풉니다: "<이름>" → 필드 "<이름>_id" → 아래 CONVENTION의 리소스.
import type { ResourceName } from "./entities";

export interface RelationDef { field: string; resource: ResourceName; many?: boolean }

const CONVENTION: Record<string, ResourceName> = {
  project: "projects", part: "parts", partner: "partners", task: "tasks", meeting: "meetings", artifact: "artifacts", template: "templates",
  item: "items", equipment: "equipment", order: "sales_orders", order_line: "sales_order_lines", work_order: "work_orders", process_step: "process_steps",
  business_line: "business_lines", org_unit: "org_units", notice: "notices", opportunity: "opportunities", segment: "meeting_segments",
  rule: "rules", linked_rule: "rules", knowledge: "knowledge_items", inspection: "inspections", claim: "customer_claims", lot: "stock_lots",
  owner: "members", reviewer: "members", assignee: "members", author: "members", member: "members", requester: "members",
};

/** 리소스별 명시 관계(관례와 다른 것) */
export const RELATIONS: Partial<Record<ResourceName, Record<string, RelationDef>>> = {
  tasks: { assignee: { field: "assignee_id", resource: "members" }, reviewer: { field: "reviewer_id", resource: "members" } },
  submissions: { submitter: { field: "submitted_by", resource: "members" }, reviewer: { field: "reviewed_by", resource: "members" } },
  projects: { owner: { field: "owner_member_id", resource: "members" }, reviewer: { field: "reviewer_member_id", resource: "members" }, members: { field: "member_ids", resource: "members", many: true } },
  business_lines: { owner: { field: "owner_member_id", resource: "members" } },
  partners: { owner: { field: "owner_member_id", resource: "members" } },
  meetings: { projects: { field: "project_ids", resource: "projects", many: true }, attendees: { field: "attendee_ids", resource: "members", many: true } },
  action_proposals: { suggested_assignee: { field: "suggested_assignee_id", resource: "members" } },
  members: { org_unit: { field: "org_unit_id", resource: "org_units" } },
  customer_claims: { partner: { field: "partner_id", resource: "partners" }, item: { field: "item_id", resource: "items" } },
  field_reports: { reporter: { field: "reported_by", resource: "members" }, assignee: { field: "assignee_id", resource: "members" } },
  approval_links: { requester: { field: "requester_id", resource: "members" }, current_approver: { field: "current_approver_id", resource: "members" } },
  mail_links: { suggested_task: { field: "suggested_task_id", resource: "tasks" } },
  corrections: { linked_rule: { field: "linked_rule_id", resource: "rules" } },
  shipments: { lots: { field: "lot_ids", resource: "stock_lots", many: true } },
};

export function resolveRelation(resource: ResourceName, name: string): RelationDef | undefined {
  const explicit = RELATIONS[resource]?.[name];
  if (explicit) return explicit;
  const target = CONVENTION[name];
  return target ? { field: `${name}_id`, resource: target } : undefined;
}
