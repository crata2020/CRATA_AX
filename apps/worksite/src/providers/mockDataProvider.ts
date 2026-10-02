// 메모리 데이터 공급자(빌드 스펙 5.5절). 백엔드 없이 테넌트별 예시 데이터로 Refine DataProvider를 구현합니다.
//   getList(필터 eq/contains/in…·정렬·페이지) · getOne · getMany · create · update · deleteOne · custom(rpc:/sel:)
// 행 범위·금액 지우기는 policy.ts, 저장은 store.ts(변경분 기록), 시드는 src/data/seed/*.
import type { BaseRecord, CrudFilter, CrudSort, DataProvider } from "@refinedev/core";
import type { TenantConfig } from "@/tenants/types";
import type { ResourceName, Row } from "@/types/entities";
import type { Clock } from "@/lib/clock";
import { keysWithPrefix, removeKey } from "@/lib/storage";
import { resolveRelation } from "@/types/relations";
import type { SeedRegistry } from "@/data/seed";
import type { ActionContext, ListOptions, Persona, SelectorContext, RpcHandler, SelectorHandler } from "@/data/seed/types";
import { RESOURCES, isResourceName } from "./resources";
import { applyFilters, applySorters, ProviderError } from "./filters";
import type { MemoryStore } from "./store";
import type { Policy } from "./policy";

export interface MemoryProviderOptions {
  tenant: TenantConfig;
  persona: Persona;
  clock: Clock;
  seeds: SeedRegistry;
  store: MemoryStore;
  policy: Policy;
  /** 가짜 지연 [최소, 최대] ms. ?latency=0이면 [0, 0] */
  latencyMs: [number, number];
}

export const NOT_FOUND_MESSAGE = "찾는 항목이 없어요";
const MASKED = "••• 가림";
const MASK_ALWAYS = ["email", "phone", "phone_work", "unit_price", "amount_krw", "discount_rate"];

let seq = 0;
const clone = <T>(v: T): T => (typeof structuredClone === "function" ? structuredClone(v) : JSON.parse(JSON.stringify(v)));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function createMemoryDataProvider(o: MemoryProviderOptions): DataProvider & { context: () => ActionContext } {
  const { tenant, persona, clock, seeds, store, policy } = o;
  const me = persona.memberId;

  const delay = async () => {
    const [lo, hi] = o.latencyMs;
    if (hi > 0) await sleep(lo + Math.random() * (hi - lo));
  };

  const assertResource = (resource: string): ResourceName => {
    if (!isResourceName(resource)) throw new ProviderError(400, `모르는 리소스예요: ${resource}`);
    return resource;
  };

  // 데모 시계는 새로고침마다 09:30에서 다시 시작하고 seq도 0부터라, 세션이 다르면 같은 id가 나올 수 있어요 → 실제 엔트로피를 덧붙임
  const newId = (resource: ResourceName) => {
    seq += 1;
    return `${RESOURCES[resource].idPrefix}-${clock.nowMs().toString(36)}${seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  };

  const maskValue = (resource: ResourceName, field: string, v: unknown) => {
    const spec = RESOURCES[resource];
    if (v == null) return v;
    if (MASK_ALWAYS.includes(field) || spec.maskFields?.includes(field) || spec.priceFields?.some((p) => p === field || p.startsWith(`${field}[]`))) return MASKED;
    return v;
  };

  const writeAudit: ActionContext["audit"] = ({ action, resource, resourceId = null, changes = null, actorType = "member", actorClient = null }) => {
    const masked = changes ? Object.fromEntries(Object.entries(changes).map(([k, [a, b]]) => [k, [maskValue(resource, k, a), maskValue(resource, k, b)]])) : null;
    const now = clock.now();
    store.insert("audit_events", {
      id: newId("audit_events"), tenant_id: tenant.tenantId, is_demo: true, created_at: now, updated_at: now, created_by: me,
      at: now, actor_id: actorType === "system" ? null : me, actor_type: actorType, actor_client: actorClient, action, resource,
      resource_id: resourceId, changes: masked, ip: null, user_agent: null, request_id: `req-${now.slice(11, 19).replace(/:/g, "")}-${seq}`,
    } as Row);
  };

  const audit = (resource: ResourceName, action: string, id: string | null, changes: Record<string, [unknown, unknown]> | null) => {
    if (RESOURCES[resource].noAudit) return;
    writeAudit({ action, resource, resourceId: id, changes });
  };

  const expand = (resource: ResourceName, rows: Row[], names?: string[]): Row[] => {
    if (!names?.length) return rows;
    return rows.map((row) => {
      const rel: Record<string, unknown> = {};
      for (const name of names) {
        const def = resolveRelation(resource, name);
        if (!def) { rel[name] = null; continue; }
        const look = (id: unknown) => {
          if (typeof id !== "string") return null;
          const target = store.find(def.resource, id);
          return target && policy.visible(def.resource, target) ? policy.mask(def.resource, target) : null;
        };
        const v = row[def.field];
        rel[name] = def.many ? (Array.isArray(v) ? v.map(look).filter(Boolean) : []) : look(v);
      }
      return { ...row, _rel: rel };
    });
  };

  const scopedList = (resource: ResourceName, opts?: ListOptions): Row[] =>
    applySorters(applyFilters(policy.scope(resource, store.rows(resource)), opts?.filters), opts?.sorters);

  const scopedGet = (resource: ResourceName, id: string): Row | null => {
    const row = store.find(resource, id);
    return row && policy.visible(resource, row) ? policy.mask(resource, row) : null;
  };

  const fillNew = (resource: ResourceName, input: Record<string, unknown>): Row => {
    const now = clock.now();
    return {
      ...input,
      id: typeof input.id === "string" && input.id ? input.id : newId(resource),
      tenant_id: tenant.tenantId,
      is_demo: true,
      created_at: (input.created_at as string) ?? now,
      updated_at: now,
      created_by: (input.created_by as string) ?? me,
    } as Row;
  };

  const selectorContext = (): SelectorContext => ({
    tenant, persona, clock, today: clock.today,
    list: ((resource: ResourceName, opts?: ListOptions) => clone(scopedList(resource, opts))) as SelectorContext["list"],
    get: ((resource: ResourceName, id: string) => { const r = scopedGet(resource, id); return r ? clone(r) : null; }) as SelectorContext["get"],
    can: (r, action, row) => policy.can(r, action, row).can,
    isModuleOn: (id) => policy.isModuleOn(id),
  });

  const actionContext = (): ActionContext => ({
    ...selectorContext(),
    raw: {
      list: ((resource: ResourceName, opts?: ListOptions) => clone(applySorters(applyFilters(store.rows(resource), opts?.filters), opts?.sorters))) as ActionContext["raw"]["list"],
      get: ((resource: ResourceName, id: string) => { const r = store.find(resource, id); return r ? clone(r) : null; }) as ActionContext["raw"]["get"],
    },
    insert: ((resource: ResourceName, row: Record<string, unknown>) => clone(store.insert(resource, fillNew(resource, row)))) as ActionContext["insert"],
    update: ((resource: ResourceName, id: string, patch: Record<string, unknown>) => {
      const updated = store.patch(resource, id, { ...patch, updated_at: clock.now() });
      if (!updated) throw new ProviderError(404, NOT_FOUND_MESSAGE);
      return clone(updated);
    }) as ActionContext["update"],
    remove: (resource, id) => { store.remove(resource, id); },
    audit: writeAudit,
    notify: (n) => {
      store.insert("notifications", fillNew("notifications", {
        recipient_id: n.recipientId, kind: n.kind, title: n.title, body: n.body ?? null, link: n.link ?? null,
        source_module: n.sourceModule ?? null, source_id: n.sourceId ?? null, channel: "site", batched_at: null, read_at: null,
      }));
    },
    newId,
    fail: (statusCode, message) => { throw new ProviderError(statusCode, message); },
  });

  // ───────── Foundation 내장 동작·셀렉터
  const builtinRpc: Record<string, RpcHandler> = {
    /** 데모 초기화: 이 테넌트의 변경분 + 이 테넌트 ARA 기록 삭제(화면은 새로고침) */
    reset_demo: () => {
      store.clearSaved();
      for (const k of keysWithPrefix(`ws:v1:${tenant.tenantId}:ara:`)) removeKey(k);
      return { ok: true, reload: true };
    },
  };
  const builtinSel: Record<string, SelectorHandler> = {
    /** 메뉴·탭 배지: 검토 대기 · 분류 확인 대기 · 안 읽은 알림 */
    "nav.badges": (ctx) => {
      const reviewWaiting = policy.isModuleOn("tasks") && policy.canModule("tasks", "approve").can
        ? ctx.list("submissions", { filters: [{ field: "status", operator: "eq", value: "submitted" }] }).filter((s) => policy.can("submissions", "approve", s as unknown as Row).can).length
        : 0;
      // 분류 확인 배지는 사람이 확인해야 하는 구간만 셉니다(결정·액션 제안까지 더하면 다른 급한 신호보다 커 보여요)
      const inboxWaiting = policy.isModuleOn("meetings") && policy.canModule("meetings", "approve").can
        ? ctx.list("meeting_segments", { filters: [{ field: "review_status", operator: "in", value: ["pending", "unclassified"] }] }).length
        : 0;
      const unreadNotifications = policy.isModuleOn("notifications")
        ? ctx.list("notifications", { filters: [{ field: "read_at", operator: "null", value: true }] }).length
        : 0;
      // 현장 등록 중 담당이 아직 없는 것(배정할 수 있는 검토자 이상만)
      const fieldReportsNew = policy.isModuleOn("mfg-quality") && policy.canModule("mfg-quality", "approve").can
        ? ctx.list("field_reports", { filters: [{ field: "status", operator: "eq", value: "new" }] }).length
        : 0;
      return { reviewWaiting, inboxWaiting, unreadNotifications, fieldReportsNew };
    },
    /** 상단 바 AI 연결 상태: 회사 정책 켜짐 여부 + 내 연결 수 */
    "me.ai": (ctx) => {
      const pol = ctx.list("mcp_policies")[0];
      const enabled = pol ? pol.enabled : tenant.policies.mcpEnabled;
      const mine = ctx.list("mcp_connections", { filters: [{ field: "member_id", operator: "eq", value: me }, { field: "revoked_at", operator: "null", value: true }] });
      return { enabled, count: mine.length, clients: mine.map((c) => c.client_name) };
    },
  };

  const provider: DataProvider & { context: () => ActionContext } = {
    getApiUrl: () => "memory://",
    context: actionContext,

    getList: async <TData extends BaseRecord = BaseRecord>({ resource, pagination, filters, sorters, meta }: { resource: string; pagination?: { currentPage?: number; pageSize?: number; mode?: "client" | "server" | "off" }; filters?: CrudFilter[]; sorters?: CrudSort[]; meta?: Record<string, unknown> }) => {
      await delay();
      const name = assertResource(resource);
      const rows = scopedList(name, { filters, sorters });
      const mode = pagination?.mode ?? "server";
      let page = rows;
      if (mode === "server") {
        const size = pagination?.pageSize ?? 20;
        const current = pagination?.currentPage ?? 1;
        page = rows.slice((current - 1) * size, current * size);
      }
      return { data: clone(expand(name, page, meta?.expand as string[] | undefined)) as unknown as TData[], total: rows.length };
    },

    getOne: async <TData extends BaseRecord = BaseRecord>({ resource, id, meta }: { resource: string; id: string | number; meta?: Record<string, unknown> }) => {
      await delay();
      const name = assertResource(resource);
      const row = scopedGet(name, String(id));
      if (!row) throw new ProviderError(404, NOT_FOUND_MESSAGE);
      return { data: clone(expand(name, [row], meta?.expand as string[] | undefined)[0]) as unknown as TData };
    },

    getMany: async <TData extends BaseRecord = BaseRecord>({ resource, ids, meta }: { resource: string; ids: (string | number)[]; meta?: Record<string, unknown> }) => {
      await delay();
      const name = assertResource(resource);
      const rows = ids.map((id) => scopedGet(name, String(id))).filter((r): r is Row => !!r);
      return { data: clone(expand(name, rows, meta?.expand as string[] | undefined)) as unknown as TData[] };
    },

    create: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({ resource, variables }: { resource: string; variables: TVariables }) => {
      await delay();
      const name = assertResource(resource);
      const input = { ...(variables as Record<string, unknown>) };
      const spec = RESOURCES[name];
      if (policy.level(name) === "own" && spec.ownerField && spec.ownerField !== "created_by") {
        if (input[spec.ownerField] == null) input[spec.ownerField] = me;
        else if (input[spec.ownerField] !== me) throw new ProviderError(403, "권한이 없어요");
      }
      if (spec.alwaysOwn && spec.ownerField) input[spec.ownerField] ??= me;
      const check = policy.can(name, "create", input);
      if (!check.can) throw new ProviderError(403, check.reason ?? "권한이 없어요");
      const row = fillNew(name, input);
      store.transaction(() => {
        store.insert(name, row);
        audit(name, "create", row.id, Object.fromEntries(Object.entries(input).map(([k, v]) => [k, [null, v]])));
      });
      return { data: clone(policy.mask(name, row)) as unknown as TData };
    },

    update: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({ resource, id, variables }: { resource: string; id: string | number; variables: TVariables }) => {
      await delay();
      const name = assertResource(resource);
      const current = store.find(name, String(id));
      if (!current || !policy.visible(name, current)) throw new ProviderError(404, NOT_FOUND_MESSAGE);
      const check = policy.can(name, "edit", current);
      if (!check.can) throw new ProviderError(403, check.reason ?? "권한이 없어요");
      // 가린 칸(금액·고객 품번)은 이 사람이 고칠 수 없어요 → patch에서 빼서 실제 값이 null로 덮이지 않게(README 7절 '공급자가 지킴')
      const patch = policy.unmaskPatch(name, { ...(variables as Record<string, unknown>) }, current);
      delete patch.id; delete patch.tenant_id; delete patch._rel;
      const changes: Record<string, [unknown, unknown]> = {};
      for (const [k, v] of Object.entries(patch)) if (JSON.stringify(current[k]) !== JSON.stringify(v)) changes[k] = [current[k], v];
      let updated: Row | undefined;
      store.transaction(() => {
        updated = store.patch(name, String(id), { ...patch, updated_at: clock.now() });
        if (Object.keys(changes).length) audit(name, "update", String(id), changes);
      });
      return { data: clone(policy.mask(name, updated!)) as unknown as TData };
    },

    deleteOne: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({ resource, id }: { resource: string; id: string | number; variables?: TVariables }) => {
      await delay();
      const name = assertResource(resource);
      const current = store.find(name, String(id));
      if (!current || !policy.visible(name, current)) throw new ProviderError(404, NOT_FOUND_MESSAGE);
      const check = policy.can(name, "delete", current);
      if (!check.can) throw new ProviderError(403, check.reason ?? "권한이 없어요");
      store.transaction(() => {
        store.remove(name, String(id));
        audit(name, "delete", String(id), null);
      });
      // 지운 행을 돌려줄 때도 금액·고객 품번 가리기(view_prices 없는 사람에게 단가가 새지 않게)
      return { data: clone(policy.mask(name, current)) as unknown as TData };
    },

    custom: async <TData extends BaseRecord = BaseRecord, TQuery = unknown, TPayload = unknown>({ url, payload, query }: { url: string; payload?: TPayload; query?: TQuery }) => {
      await delay();
      if (url.startsWith("rpc:")) {
        const nameRpc = url.slice(4);
        const handler = builtinRpc[nameRpc] ?? seeds.rpc[nameRpc]?.handler;
        if (!handler) throw new ProviderError(400, `아직 없는 동작이에요: ${nameRpc}`);
        const ctx = actionContext();
        const result = await store.transaction(() => handler(ctx, payload ?? {}));
        return { data: (result ?? { ok: true }) as TData };
      }
      if (url.startsWith("sel:")) {
        const nameSel = url.slice(4);
        const handler = builtinSel[nameSel] ?? seeds.sel[nameSel]?.handler;
        if (!handler) throw new ProviderError(400, `아직 없는 셀렉터예요: ${nameSel}`);
        const result = await handler(selectorContext(), query ?? {});
        return { data: (result ?? null) as TData };
      }
      throw new ProviderError(400, `지원하지 않는 요청이에요: ${url}`);
    },
  } as DataProvider & { context: () => ActionContext };

  return provider;
}
