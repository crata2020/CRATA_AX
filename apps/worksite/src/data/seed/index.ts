// 시드 파이프라인(빌드 스펙 5.5.3절). 순서: reference(Foundation) → work → collab → industry → ara_settings → home.
// 같은 리소스 행은 이어 붙이고(kpis·kpi_values만 여러 그룹), id가 겹치면 시작할 때 오류를 냅니다.
// 지연 함수(() => Row[])는 그 리소스를 처음 읽을 때 한 번만 만듭니다.
import type { TenantConfig } from "@/tenants/types";
import type { ResourceName, Row } from "@/types/entities";
import { createRng } from "@/lib/rng";
import { addDays, daysBetween, isOffDay, kstIso, shiftToWorkday, toKstDate } from "@/lib/clock";
import { RESOURCES } from "@/providers/resources";
import { ANCHORS } from "./anchors";
import { referenceSeed } from "./reference";
import { GROUP_RESOURCES, type GroupModule, type SeedContext, type SeedOutput, type RpcHandler, type SelectorHandler, type AraSeed, type GroupId } from "./types";
import work from "./work";
import collab from "./collab";
import industry from "./industry";
import araSettings from "./ara_settings";
import home from "./home";

export const GROUP_MODULES: GroupModule[] = [work, collab, industry, araSettings, home];

type Source = { group: GroupId | "reference"; rows: unknown[] | (() => unknown[]) };

/** 달력 지킴이: 사람이 정하는 일정(회의·공지·마감·납기·보전 …)이 일요일·공휴일(추석·개천절·대체공휴일·한글날 …)에 놓이지 않게,
 *  지난 날짜는 앞쪽의 가까운 일하는 날로, 다가올 날짜는 뒤쪽으로 옮깁니다(같은 행의 짝 필드는 같은 날수만큼).
 *  office=true는 토요일도 쉬는 날로 봅니다(사무 일정). 생산 실적·가동 기록은 industry 시드의 workdays()가 이미 공휴일을 뺍니다. */
const CALENDAR_GUARD: Partial<Record<ResourceName, { field: string; with?: string[]; office?: boolean; dir?: -1 | 1; skip?: (row: Record<string, unknown>) => boolean }[]>> = {
  meetings: [{ field: "started_at", with: ["ended_at"], office: true }],
  notices: [{ field: "published_at", with: ["expires_at"], office: true }],
  calendar_events: [{ field: "start_at", with: ["end_at"], office: true, skip: (r) => r.kind === "company" }],
  tasks: [{ field: "due_at", office: true }],
  action_proposals: [{ field: "suggested_due_at", office: true }],
  purchase_orders: [{ field: "due_on" }, { field: "ordered_on" }],
  sales_order_lines: [{ field: "due_date" }, { field: "promised_date" }],
  pm_plans: [{ field: "next_due_on" }],
  risk_assessments: [{ field: "due_on" }],
  legal_calendar_items: [{ field: "due_on" }],
  field_reports: [{ field: "reported_at" }],
  near_miss_reports: [{ field: "occurred_at" }],
  worker_opinions: [{ field: "submitted_at" }],
  decisions: [{ field: "decided_at", office: true }],
  // 제출 → 검토 순서가 뒤집히지 않게: 제출일을 옮기면 검토일도 같은 날수만큼, 검토일만 쉬는 날이면 뒤로
  submissions: [{ field: "submitted_at", with: ["reviewed_at"], office: true }, { field: "reviewed_at", office: true, dir: 1 }],
  approval_links: [{ field: "submitted_at", with: ["completed_at"], office: true }, { field: "completed_at", office: true, dir: 1 }],
  quotes: [{ field: "issued_on", with: ["valid_until"], office: true }],
  projects: [{ field: "start_on", office: true }],
};
function guardCalendar(resource: ResourceName, row: Record<string, unknown>, today: string) {
  for (const g of CALENDAR_GUARD[resource] ?? []) {
    const v = row[g.field];
    if (typeof v !== "string" || (g.skip && g.skip(row))) continue;
    const opts = { saturday: !!g.office };
    if (!isOffDay(v, opts)) continue;
    const day = toKstDate(v);
    const moved = shiftToWorkday(day, g.dir ?? (day < today ? -1 : 1), opts);
    const delta = daysBetween(day, moved);
    for (const f of [g.field, ...(g.with ?? [])]) {
      const x = row[f];
      if (typeof x !== "string") continue;
      row[f] = /^\d{4}-\d{2}-\d{2}$/.test(x) ? addDays(x, delta) : new Date(Date.parse(x) + delta * 86_400_000).toISOString();
    }
  }
}

export interface SeedRegistry {
  /** 리소스 행(정규화, 처음 부를 때 만듦) */
  materialize: (resource: ResourceName) => Row[];
  rpc: Record<string, { group: string; handler: RpcHandler }>;
  sel: Record<string, { group: string; handler: SelectorHandler }>;
  ara?: AraSeed;
  /** 시드를 만든 그룹 목록(진단용) */
  groupsWithData: Record<string, ResourceName[]>;
}

export interface BuildSeedOptions {
  tenant: TenantConfig;
  today: string;
  /** ?empty=1: 기준 리소스 몇 개 말고는 0행 */
  emptyMode?: boolean;
}

const fail = (msg: string) => {
  if (import.meta.env.DEV) throw new Error(msg);
  console.error(msg);
};

export function buildSeeds({ tenant, today, emptyMode = false }: BuildSeedOptions): SeedRegistry {
  const sources = new Map<ResourceName, Source[]>();
  const cache = new Map<ResourceName, Row[]>();
  const defaultTime = kstIso(today, "08:00");

  const normalize = (resource: ResourceName, raw: unknown): Row => {
    const row = { ...(raw as Record<string, unknown>) };
    if (typeof row.id !== "string" || !row.id) fail(`[seed] ${resource} 행에 id가 없어요`);
    guardCalendar(resource, row, today);
    row.tenant_id = tenant.tenantId;
    row.is_demo = true;
    row.created_at ??= defaultTime;
    row.updated_at ??= row.created_at;
    return row as Row;
  };

  const materialize = (resource: ResourceName): Row[] => {
    const hit = cache.get(resource);
    if (hit) return hit;
    const list: Row[] = [];
    const seen = new Set<string>();
    if (!(emptyMode && !RESOURCES[resource].keepInEmptyMode)) {
      for (const src of sources.get(resource) ?? []) {
        const rows = typeof src.rows === "function" ? src.rows() : src.rows;
        for (const raw of rows) {
          const row = normalize(resource, raw);
          if (seen.has(row.id)) fail(`[seed] id 중복: ${resource} ${row.id} (${src.group})`);
          seen.add(row.id);
          list.push(row);
        }
      }
    }
    cache.set(resource, list);
    return list;
  };

  const ctx: SeedContext = {
    tenant,
    today,
    rng: (stream) => createRng(`${tenant.slug}:${stream}`),
    get: ((resource: ResourceName) => materialize(resource).map((r) => ({ ...r }))) as SeedContext["get"],
    anchors: ANCHORS,
    people: tenant.people,
    memberOf: (roleCode) => tenant.people.find((p) => p.roleCode === roleCode)?.id ?? tenant.people[0]!.id,
    d: (n) => addDays(today, n),
    at: (n, time = "09:00") => kstIso(addDays(today, n), time),
  };

  const addOutput = (group: Source["group"], out: SeedOutput) => {
    for (const [resource, rows] of Object.entries(out) as [ResourceName, Source["rows"]][]) {
      if (!rows) continue;
      if (!(resource in RESOURCES)) { fail(`[seed] ${group}: 모르는 리소스 ${resource}`); continue; }
      if (group !== "reference" && !(GROUP_RESOURCES[group] as readonly string[]).includes(resource)) {
        fail(`[seed] ${group} 그룹은 ${resource}를 만들 수 없어요(빌드 스펙 5.6절 소유 표)`);
        continue;
      }
      if (cache.has(resource)) fail(`[seed] ${resource}는 이미 읽힌 뒤에 ${group}가 행을 더했어요. 시드 순서를 확인해 주세요`);
      const list = sources.get(resource) ?? [];
      list.push({ group, rows });
      sources.set(resource, list);
    }
  };

  addOutput("reference", referenceSeed(ctx));
  const rpc: SeedRegistry["rpc"] = {};
  const sel: SeedRegistry["sel"] = {};
  let ara: AraSeed | undefined;
  for (const m of GROUP_MODULES) {
    addOutput(m.group, m.seed(ctx));
    for (const [name, handler] of Object.entries(m.rpc ?? {})) {
      if (rpc[name]) fail(`[seed] rpc 이름 중복: ${name} (${rpc[name]!.group}, ${m.group})`);
      rpc[name] = { group: m.group, handler };
    }
    for (const [name, handler] of Object.entries(m.sel ?? {})) {
      if (sel[name]) fail(`[seed] sel 이름 중복: ${name} (${sel[name]!.group}, ${m.group})`);
      sel[name] = { group: m.group, handler };
    }
    if (m.ara) ara = m.ara;
  }

  const groupsWithData: Record<string, ResourceName[]> = {};
  for (const [resource, list] of sources) for (const s of list) (groupsWithData[s.group] ??= []).push(resource);

  return { materialize, rpc, sel, ara, groupsWithData };
}
