// 행 범위 규칙(RLS 흉내, 빌드 스펙 5.4절). 2단계에서 같은 표를 SQL RLS로 옮깁니다. 정책 정본은 이 파일 하나입니다.
// 화면 권한은 보안이 아닙니다. 메모리 공급자·셀렉터·접근 제어가 모두 이 클래스를 거칩니다.
import type { ModuleId, PermissionLevel } from "@/modules/registry.generated";
import { LEVEL_ACTIONS, MODULE_BY_ID, permissionLevel } from "@/modules";
import type { ResourceName, Row } from "@/types/entities";
import type { TenantConfig, PermissionBundle } from "@/tenants/types";
import type { Persona } from "@/data/seed/types";
import { RESOURCES, isResourceName } from "./resources";
import type { MemoryStore } from "./store";

export interface CanResult { can: boolean; reason?: string }
export interface AccessState { tenant: TenantConfig; persona: Persona; enabled: () => Set<ModuleId> }

export const REASONS = {
  moduleOff: "이 회사에서 쓰지 않는 기능이에요",
  forbidden: "권한이 없어요. 관리자에게 문의해 주세요",
  immutable: "고칠 수 없는 기록이에요",
  appendOnly: "추가만 할 수 있는 기록이에요",
  notOwner: "본인 것만 고칠 수 있어요",
  reviewerOnly: "검토자가 승인할 수 있어요",
  selfApprove: "내 제출은 지정된 검토자가 승인해요",
} as const;

const ORDER: PermissionLevel[] = ["none", "aggregate", "own", "view", "edit", "approve", "manage"];
const atLeast = (a: PermissionLevel, b: PermissionLevel) => (ORDER.indexOf(a) >= ORDER.indexOf(b) ? a : b);
const has = (arr: unknown, v: string) => Array.isArray(arr) && arr.includes(v);

export class Policy {
  constructor(private s: AccessState, private store: MemoryStore) {}

  get me() { return this.s.persona.memberId; }
  get role() { return this.s.persona.role; }
  get adminish() { return this.role === "owner" || this.role === "admin"; }
  hasBundle(b: PermissionBundle) { return this.s.persona.bundles.includes(b); }
  isModuleOn(id: ModuleId) { return this.s.enabled().has(id); }

  /** 모듈 단위 권한(메뉴·PageGuard) */
  canModule(moduleId: ModuleId, action = "list"): CanResult {
    if (!MODULE_BY_ID[moduleId]) return { can: false, reason: REASONS.moduleOff };
    if (!this.isModuleOn(moduleId)) return { can: false, reason: REASONS.moduleOff };
    // ARA는 P 영역: 누구나 본인 공간에 들어감(데이터는 ara 공급자가 본인 것만)
    if (moduleId === "ara-wellbeing" && ["list", "show", "create", "edit"].includes(action)) return { can: true };
    const level = permissionLevel(moduleId, this.role);
    return LEVEL_ACTIONS[level].includes(action) ? { can: true } : { can: false, reason: REASONS.forbidden };
  }

  /** 리소스 권한 등급(리소스 성질 반영) */
  level(resource: ResourceName): PermissionLevel {
    const spec = RESOURCES[resource];
    let level = permissionLevel(spec.module, this.role);
    if (spec.readAll) level = this.adminish ? "manage" : atLeast(level, "view");
    // 본인 카드 사본·본인 활동(감사 기록 actor_id = 나)은 역할과 상관없이 볼 수 있어요(A-04·5.4절). 감사 기록은 immutable이라 쓰기는 그대로 막혀요.
    if (resource === "work_style_cards" || resource === "audit_events") level = atLeast(level, "own");
    return level;
  }

  private participant(projectId: string | null | undefined): boolean {
    if (!projectId) return false;
    const p = this.store.find("projects", projectId);
    if (!p) return false;
    return p.owner_member_id === this.me || p.reviewer_member_id === this.me || has(p.member_ids, this.me);
  }

  private unitOf(memberId: unknown): string | undefined {
    return typeof memberId === "string" ? (this.store.find("members", memberId)?.org_unit_id as string | undefined) : undefined;
  }

  private parentVisible(resource: ResourceName, id: unknown): boolean {
    if (typeof id !== "string") return false;
    const row = this.store.find(resource, id);
    return !!row && this.visible(resource, row);
  }

  /** 이 행을 볼 수 있는지(목록에서 빠지고 getOne은 404) */
  visible(resource: ResourceName, row: Row): boolean {
    const spec = RESOURCES[resource];
    if (!this.isModuleOn(spec.module)) return false;
    if (spec.priceResource && !this.hasBundle("view_prices")) return false;
    const me = this.me;
    if (spec.alwaysOwn) {
      const v = row[spec.ownerField!];
      return v === me || (!!spec.ownerNullShared && v == null);
    }
    if (resource === "work_style_cards") {
      if (row.member_id === me) return true;
      if (row.revoked_at) return false;
      return row.share_scope === "company" || has(row.shared_with_ids, me) || (row.share_scope === "team" && this.unitOf(row.member_id) === this.s.persona.unitId);
    }
    if (resource === "wellbeing_aggregates") return this.adminish && Number(row.population_n ?? 0) >= this.s.tenant.policies.aggregateMinN;

    const level = this.level(resource);
    if (level === "none" || level === "aggregate") return false;

    switch (resource) {
      case "projects": {
        const part = row.owner_member_id === me || row.reviewer_member_id === me || has(row.member_ids, me);
        if (row.sensitivity === "L2" && !this.adminish && !part) return false;
        return this.role === "member" ? part : true;
      }
      case "parts":
        return this.parentVisible("projects", row.project_id);
      case "tasks": {
        const mine = row.assignee_id === me || row.reviewer_id === me;
        if (row.sensitivity === "L2" && !this.adminish && !mine && !this.participant(row.project_id as string)) return false;
        return level === "own" ? row.assignee_id === me : true;
      }
      case "progress_logs":
      case "submissions":
        return this.parentVisible("tasks", row.task_id);
      case "meetings": {
        const part = has(row.attendee_ids, me) || (Array.isArray(row.project_ids) && row.project_ids.some((p) => this.participant(p as string)));
        if (row.sensitivity === "L2" && !this.adminish && !part) return false;
        return this.role === "member" ? part : true;
      }
      case "meeting_segments":
      case "decisions":
      case "action_proposals":
        return this.parentVisible("meetings", row.meeting_id);
      case "artifacts": {
        const part = row.owner_id === me || this.participant(row.project_id as string);
        if (row.sensitivity === "L2" && !this.adminish && !part) return false;
        return this.role === "member" ? part || !row.project_id : true;
      }
      case "knowledge_items": {
        // 고객 비밀(L2) 지식(작업표준서 등)은 소유자·관리자와 담당·프로젝트 참여자만
        if (row.sensitivity !== "L2" || this.adminish) return true;
        return row.owner_id === me || this.participant(row.project_id as string);
      }
      case "artifact_versions":
      case "corrections":
        return this.parentVisible("artifacts", row.artifact_id);
      case "read_receipts": {
        if (this.adminish || row.member_id === me) return true;
        const n = typeof row.notice_id === "string" ? this.store.find("notices", row.notice_id) : undefined;
        return n?.author_id === me;
      }
      case "calendar_events": {
        if (row.visibility === "company") return true;
        if (row.created_by === me || has(row.attendee_ids, me)) return true;
        return row.visibility === "team" && this.unitOf(row.created_by) === this.s.persona.unitId;
      }
      case "approval_links":
        return level === "own" ? row.requester_id === me || row.current_approver_id === me : true;
      default:
        break;
    }
    if (level === "own") return spec.ownerField ? row[spec.ownerField] === me : true;
    return true;
  }

  /** 금액·L2 필드 지우기(DOM에 남지 않게 공급자가 null로 돌려줌) */
  mask(resource: ResourceName, row: Row): Row {
    const spec = RESOURCES[resource];
    let out = row;
    if (spec.priceFields && !this.hasBundle("view_prices")) {
      out = { ...row };
      for (const f of spec.priceFields) {
        const m = /^(\w+)\[\]\.(\w+)$/.exec(f);
        if (m) {
          const [, arr, key] = m as unknown as [string, string, string];
          if (Array.isArray(out[arr])) out[arr] = (out[arr] as Record<string, unknown>[]).map((x) => ({ ...x, [key]: null }));
        } else out[f] = null;
      }
    }
    if (resource === "items" && this.role === "member" && out.customer_part_no != null) out = { ...out, customer_part_no: null };
    return out;
  }

  /** 고치기 patch에서 '가린 칸'을 뺍니다. 화면이 받은 행(가린 칸은 null)을 그대로 돌려보내도 실제 금액·고객 품번이 null로 덮이지 않게.
   *  배열 안 금액(lines[].unit_price)은 지금 값으로 되돌려 채웁니다(같은 id·item_id 줄, 없으면 같은 순서 줄). */
  unmaskPatch(resource: ResourceName, patch: Record<string, unknown>, current: Row): Record<string, unknown> {
    const spec = RESOURCES[resource];
    const out = { ...patch };
    if (spec.priceFields && !this.hasBundle("view_prices")) {
      for (const f of spec.priceFields) {
        const m = /^(\w+)\[\]\.(\w+)$/.exec(f);
        if (!m) { delete out[f]; continue; }
        const [, arr, key] = m as unknown as [string, string, string];
        if (!Array.isArray(out[arr])) continue;
        const cur = (Array.isArray(current[arr]) ? current[arr] : []) as Record<string, unknown>[];
        out[arr] = (out[arr] as Record<string, unknown>[]).map((x, i) => {
          const same = cur.find((c) => (x.id != null && c.id === x.id) || (x.item_id != null && c.item_id === x.item_id)) ?? cur[i];
          return { ...x, [key]: same ? same[key] ?? null : null };
        });
      }
    }
    if (resource === "items" && this.role === "member") delete out.customer_part_no;
    return out;
  }

  /** 목록 범위: 볼 수 있는 행만 + 지우기 */
  scope(resource: ResourceName, rows: Row[]): Row[] {
    const out: Row[] = [];
    for (const r of rows) if (this.visible(resource, r)) out.push(this.mask(resource, r));
    return out;
  }

  /** 리소스(또는 모듈) × 동작. row를 주면 행 단위 규칙까지 봅니다 */
  can(resourceOrModule: string, action: string, row?: Row | Record<string, unknown>): CanResult {
    if (!isResourceName(resourceOrModule)) return this.canModule(resourceOrModule as ModuleId, action);
    const resource = resourceOrModule;
    const spec = RESOURCES[resource];
    if (!this.isModuleOn(spec.module)) return { can: false, reason: REASONS.moduleOff };
    const me = this.me;
    const write = action === "create" || action === "edit" || action === "delete";
    if (spec.immutable && write) return { can: false, reason: REASONS.immutable };
    if (spec.appendOnly && (action === "edit" || action === "delete")) return { can: false, reason: REASONS.appendOnly };
    if (row && (action === "show" || action === "edit" || action === "delete" || action === "approve") && !this.visible(resource, row as Row)) {
      return { can: false, reason: REASONS.forbidden };
    }
    if (spec.alwaysOwn) {
      if (!row || action === "create" || action === "list") return { can: true };
      const v = (row as Row)[spec.ownerField!];
      if (v === me) return { can: true };
      if (spec.ownerNullShared && v == null) return write ? (this.adminish ? { can: true } : { can: false, reason: REASONS.forbidden }) : { can: true };
      return { can: false, reason: REASONS.notOwner };
    }
    if (resource === "equipment_run_logs" && write) {
      const ok = this.adminish || ["R_PLANT_MGR", "R_OPERATOR"].includes(this.s.persona.roleCode);
      return ok ? { can: true } : { can: false, reason: "공장장·생산 작업자만 상태를 바꿀 수 있어요" };
    }
    const level = this.level(resource);
    if (!LEVEL_ACTIONS[level].includes(action)) {
      return { can: false, reason: action === "approve" ? REASONS.reviewerOnly : REASONS.forbidden };
    }
    if (level === "own") {
      if (action === "create" && !spec.ownerField && !spec.ownCreate) return { can: false, reason: REASONS.forbidden };
      if (row && (action === "edit" || action === "delete")) {
        const owner = spec.ownerField ? (row as Row)[spec.ownerField] : (row as Row).created_by;
        if (owner !== me && (row as Row).created_by !== me) return { can: false, reason: REASONS.notOwner };
      }
    }
    if (resource === "submissions" && action === "approve" && row) {
      // 내 제출은 소유자·관리자여도 승인할 수 없어요('완료는 검토자가 승인해요'). 남의 제출은 소유자·관리자가 대신 승인할 수 있고 감사 기록에 '대신 승인'으로 남아요
      const t = typeof row.task_id === "string" ? this.store.find("tasks", row.task_id) : undefined;
      if (t?.assignee_id === me || row.submitted_by === me) return { can: false, reason: REASONS.selfApprove };
      if (!this.adminish && t?.reviewer_id !== me) return { can: false, reason: REASONS.reviewerOnly };
    }
    return { can: true };
  }
}
