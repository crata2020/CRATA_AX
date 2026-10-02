// 모듈 런타임(빌드 스펙 5.1절): resolveModules · buildNav · homeLayout · 용어 t()
import type { TenantConfig, PlatformRole, PlatformTermKey, PermissionBundle } from "@/tenants/types";
import type { TenantOverrides } from "@/types/entities";
import { MANIFEST } from "@/routes/manifest";
import {
  MODULES, NAV_GROUPS, MOBILE_TABS, HOME_WIDGETS, HOME_PRESETS, MANUFACTURING_OVERRIDES,
  type ModuleId, type NavGroupId, type WidgetId, type RegistryIconName, type PermissionLevel, type RegistryModule,
} from "./registry.generated";

export * from "./registry.generated";

export const MODULE_BY_ID = Object.fromEntries(MODULES.map((m) => [m.id, m])) as Record<ModuleId, RegistryModule>;

/** 항상 켜 두는 모듈(A-07 잠금) */
export const LOCKED_MODULES: ModuleId[] = ["home-dashboard", "admin-members", "admin-settings", "audit-log", "org-members"];

export interface ResolvedModules {
  enabled: Set<ModuleId>;
  /** 켜진 모듈이 필요로 하는데 꺼진 모듈 */
  missingDeps: { module: ModuleId; needs: ModuleId }[];
}

/** 레지스트리 기본값 + 업종 팩 + TenantConfig.modules + 데모 덮어쓰기(tenant_settings.overrides.modules) */
export function resolveModules(tenant: TenantConfig, overrides?: TenantOverrides | null): ResolvedModules {
  const enabled = new Set<ModuleId>();
  for (const m of MODULES) {
    let on = m.industry === "core"
      ? m.defaultEnabled || m.enabledByPacks.some((p) => tenant.packs.includes(p as never))
      : tenant.packs.includes(m.industry as never) && m.defaultEnabled;
    if (tenant.modules.enable.includes(m.id)) on = true;
    if (tenant.modules.disable.includes(m.id)) on = false;
    const o = overrides?.modules?.[m.id];
    if (o != null) on = o;
    if (LOCKED_MODULES.includes(m.id)) on = true;
    if (on) enabled.add(m.id);
  }
  const missingDeps: ResolvedModules["missingDeps"] = [];
  for (const id of enabled) for (const d of MODULE_BY_ID[id].dependsOn) if (!enabled.has(d)) missingDeps.push({ module: id, needs: d });
  return { enabled, missingDeps };
}

/** 모듈 × 역할 → 권한 등급 */
export function permissionLevel(moduleId: ModuleId, role: PlatformRole): PermissionLevel {
  return MODULE_BY_ID[moduleId]?.permissions[role] ?? "none";
}

/** 등급 → 허용 동작(빌드 스펙 5.4절) */
export const LEVEL_ACTIONS: Record<PermissionLevel, string[]> = {
  manage: ["list", "show", "create", "edit", "delete", "approve", "export"],
  approve: ["list", "show", "create", "edit", "approve"],
  edit: ["list", "show", "create", "edit"],
  own: ["list", "show", "create", "edit"],
  view: ["list", "show"],
  aggregate: ["list"],
  none: [],
};

// ───────── 용어
/** 플랫폼 기본 용어(회사 용어집 platform_key로 바꿀 수 있음) */
export const DEFAULT_TERMS: Record<string, string> = {
  "term.businessLine": "사업", "term.project": "프로젝트", "term.part": "파트", "term.task": "업무", "term.meeting": "회의",
  "term.artifact": "산출물", "term.partner": "거래처", "term.review": "검토",
};

export function makeT(tenant: TenantConfig, overrides?: TenantOverrides | null) {
  return (key: PlatformTermKey | string, fallback?: string): string => {
    const o = overrides?.glossary?.[key as PlatformTermKey];
    if (o) return o;
    const p = tenant.glossary.platform[key as PlatformTermKey];
    if (p) return p;
    if (key.startsWith("nav.")) {
      const id = key.slice(4) as NavGroupId;
      const label = tenant.nav.labels[id];
      if (label) return label;
      const g = NAV_GROUPS.find((x) => x.id === id);
      if (g) {
        const byPack = tenant.packs.map((pk) => g.nameByPack?.[pk]).find(Boolean);
        return byPack ?? g.nameKo;
      }
    }
    return DEFAULT_TERMS[key] ?? fallback ?? key;
  };
}

// ───────── 메뉴(빌드 스펙 2.2절)
export type NavBadgeKey = "reviewWaiting" | "inboxWaiting" | "unreadNotifications" | "fieldReportsNew";
/** 배지가 세는 것(툴팁·스크린리더 글자) */
export const NAV_BADGE_LABEL: Record<NavBadgeKey, string> = {
  reviewWaiting: "검토 대기", inboxWaiting: "분류 확인 대기", unreadNotifications: "안 읽은 알림", fieldReportsNew: "담당 미배정 현장 등록",
};
export interface NavChild {
  key: string; label: string; to: string; moduleId: ModuleId;
  /** 이 항목 앞에 붙는 소제목(예: "현장") */
  section?: string;
  badgeKey?: NavBadgeKey;
  /** 다른 그룹 화면으로 가는 바로가기(예: 생산·품질 › 물류·기준의 '거래처'). 활성 메뉴 판단에서는 빼요(원래 그룹이 켜짐) */
  alias?: boolean;
}
export interface NavItem {
  key: NavGroupId; label: string; icon: RegistryIconName; to: string; children: NavChild[];
  /** ARA: 자물쇠 + "나만 보여요" */
  private?: boolean;
  /** 메뉴 이름 아래 작은 설명(예: ARA "일하는 방식 코치") */
  caption?: string;
  /** 이 항목 앞에 구분선 */
  dividerBefore?: boolean;
  /** 이 그룹에 속하는 경로 접두어(활성 판단) */
  prefixes: string[];
}

type ChildDef = Omit<NavChild, "label"> & { label: string; action?: "list" | "approve"; roles?: PlatformRole[] };

const CHILDREN: Record<NavGroupId, (packs: string[]) => ChildDef[]> = {
  home: () => [],
  work: () => [
    { key: "work-list", label: "내 업무", to: "/work", moduleId: "tasks" },
    { key: "work-board", label: "업무 보드", to: "/work/board", moduleId: "tasks" },
    { key: "work-review", label: "검토함", to: "/work/review", moduleId: "tasks", action: "approve", badgeKey: "reviewWaiting" },
    { key: "mail-inbox", label: "메일 제안", to: "/work/mail", moduleId: "mail-connector" },
  ],
  projects: () => [
    { key: "projects", label: "사업·프로젝트", to: "/projects", moduleId: "business-structure" },
    { key: "partners", label: "거래처", to: "/projects/partners", moduleId: "partners" },
    { key: "contacts", label: "담당자", to: "/projects/contacts", moduleId: "partners" },
  ],
  meetings: () => [
    { key: "meetings", label: "회의 목록", to: "/meetings", moduleId: "meetings" },
    { key: "meeting-inbox", label: "분류 확인", to: "/meetings/inbox", moduleId: "meetings", action: "approve", badgeKey: "inboxWaiting" },
    { key: "decisions", label: "결정 모음", to: "/meetings/decisions", moduleId: "meetings" },
  ],
  docs: () => [
    { key: "docs", label: "산출물", to: "/docs", moduleId: "documents" },
    { key: "templates", label: "양식", to: "/docs/templates", moduleId: "documents" },
    { key: "correction-rules", label: "작성 규칙", to: "/docs/rules", moduleId: "correction-rules" },
    { key: "knowledge", label: "지식", to: "/docs/knowledge", moduleId: "knowledge" },
    { key: "glossary", label: "용어집", to: "/docs/glossary", moduleId: "knowledge" },
  ],
  industry: (packs) => packs.includes("manufacturing")
    ? [
      { key: "ops-home", label: "생산·품질 홈", to: "/ops", moduleId: "mfg-production", section: "현장" },
      { key: "field-report", label: "현장 등록", to: "/ops/report", moduleId: "mfg-quality", badgeKey: "fieldReportsNew" },
      { key: "quality", label: "품질 현황", to: "/ops/quality", moduleId: "mfg-quality", section: "품질" },
      { key: "claims", label: "클레임·8D", to: "/ops/quality/claims", moduleId: "mfg-quality" },
      { key: "lot-trace", label: "LOT 추적", to: "/ops/trace", moduleId: "mfg-materials" },
      { key: "production", label: "생산", to: "/ops/production", moduleId: "mfg-production", section: "생산·설비" },
      { key: "equipment-board", label: "설비 현황판", to: "/ops/production/board", moduleId: "mfg-production" },
      { key: "equipment", label: "설비", to: "/ops/equipment", moduleId: "mfg-equipment" },
      { key: "orders", label: "수주·납품", to: "/ops/orders", moduleId: "mfg-orders", section: "물류·기준" },
      { key: "materials", label: "자재·재고", to: "/ops/materials", moduleId: "mfg-materials" },
      { key: "master-data", label: "기준정보", to: "/ops/master", moduleId: "mfg-master-data" },
      // 수주·납품과 고객·공급사를 한 메뉴에서(작은 제조사는 거래처를 '사업' 메뉴에서 찾지 않아요). 화면은 사업·거래처 › 거래처
      { key: "partners-alias", label: "거래처", to: "/projects/partners", moduleId: "partners", alias: true },
    ]
    : packs.includes("education_consulting")
      ? [
        { key: "sales-pipeline", label: "영업 파이프라인", to: "/ops/sales", moduleId: "edu-sales" },
        { key: "quotes", label: "견적", to: "/ops/sales/quotes", moduleId: "edu-sales" },
      ]
      : [],
  company: () => [
    { key: "notices", label: "공지", to: "/company/notices", moduleId: "notices", section: "소통" },
    { key: "calendar", label: "일정", to: "/company/calendar", moduleId: "calendar" },
    { key: "people", label: "구성원", to: "/company/people", moduleId: "org-members", section: "사람" },
    { key: "org-chart", label: "조직도", to: "/company/org", moduleId: "org-members" },
    { key: "company-about", label: "회사 소개", to: "/company/about", moduleId: "company-info" },
    { key: "approvals", label: "결재", to: "/company/approvals", moduleId: "approvals", section: "운영" },
    { key: "safety", label: "안전보건", to: "/company/safety", moduleId: "safety-health" },
  ],
  ara: () => [],
  admin: () => [
    { key: "admin-company", label: "회사 설정", to: "/admin/settings", moduleId: "admin-settings" },
    { key: "admin-modules", label: "모듈", to: "/admin/modules", moduleId: "admin-settings" },
    { key: "admin-theme", label: "브랜드·테마", to: "/admin/theme", moduleId: "admin-settings" },
    { key: "admin-ai", label: "AI 연결 정책", to: "/admin/ai-policy", moduleId: "ai-connect", roles: ["owner", "admin"] },
    { key: "admin-data", label: "데이터 등급·권한", to: "/admin/data", moduleId: "admin-settings" },
    { key: "admin-members", label: "구성원·역할", to: "/admin/members", moduleId: "admin-members" },
    { key: "admin-audit", label: "감사 로그", to: "/admin/audit", moduleId: "audit-log" },
  ],
};

const GROUP_PREFIXES: Record<NavGroupId, string[]> = {
  home: [], work: ["/work"], projects: ["/projects"], meetings: ["/meetings"], docs: ["/docs"], industry: ["/ops"],
  company: ["/company"], ara: ["/ara"], admin: ["/admin"],
};
const GROUP_MODULE: Partial<Record<NavGroupId, ModuleId>> = { home: "home-dashboard", ara: "ara-wellbeing" };

/** 역할·켜진 모듈로 거른 메뉴 트리. 하위 항목이 하나도 없으면 그룹을 뺍니다(홈·ARA 제외) */
export function buildNav(tenant: TenantConfig, role: PlatformRole, enabled: Set<ModuleId>, t: (k: string) => string): NavItem[] {
  const items: NavItem[] = [];
  const allowed = (moduleId: ModuleId, action: "list" | "approve" = "list") =>
    enabled.has(moduleId) && LEVEL_ACTIONS[permissionLevel(moduleId, role)].includes(action);
  for (const g of [...NAV_GROUPS].sort((a, b) => a.order - b.order)) {
    if (!g.visibleTo.includes(role)) continue;
    if (g.id === "industry" && tenant.packs.length === 0) continue;
    const children = CHILDREN[g.id](tenant.packs)
      .filter((c) => (!c.roles || c.roles.includes(role)) && allowed(c.moduleId, c.action ?? "list"))
      .map(({ action: _a, roles: _r, ...c }) => c);
    // 소제목은 처음 보이는 항목에 다시 붙임(앞 항목이 빠져도 소제목이 남게)
    const sections = CHILDREN[g.id](tenant.packs);
    let current: string | undefined;
    const sectionOf = new Map<string, string | undefined>();
    for (const c of sections) { if (c.section) current = c.section; sectionOf.set(c.key, current); }
    let lastSection: string | undefined;
    for (const c of children) {
      const s = sectionOf.get(c.key);
      c.section = s !== lastSection ? s : undefined;
      lastSection = s;
    }
    const groupModule = GROUP_MODULE[g.id];
    if (groupModule && !enabled.has(groupModule)) continue;
    if (!groupModule && children.length === 0) continue;
    items.push({
      key: g.id,
      label: t(`nav.${g.id}`),
      icon: g.icon,
      to: children[0]?.to ?? g.route,
      children: g.id === "home" || g.id === "ara" ? [] : children,
      private: g.id === "ara",
      caption: g.id === "ara" ? "일하는 방식 코치" : undefined,
      dividerBefore: g.id === "ara",
      prefixes: GROUP_PREFIXES[g.id],
    });
  }
  return items;
}

/** 경로 → 활성 메뉴(그룹 key, 하위 항목 key). 하위 항목은 가장 긴 접두어가 이깁니다 */
/** 경로 → 이 경로를 가진 페이지의 모듈(정적 경로가 :param 경로보다 먼저) */
const ROUTE_PATTERNS = MANIFEST
  .filter((e) => e.path !== "*")
  .map((e) => ({ moduleId: e.moduleId, dynamic: e.path.includes(":"), re: new RegExp(`^${e.path.replace(/:[^/]+/g, "[^/]+")}$`) }))
  .sort((a, b) => Number(a.dynamic) - Number(b.dynamic));
const routeModuleOf = (pathname: string): ModuleId | undefined => ROUTE_PATTERNS.find((r) => r.re.test(pathname))?.moduleId;

/** 활성 메뉴: 정확히 같은 경로의 항목, 아니면 그 페이지를 가진 모듈과 같은 모듈의 상위 경로 항목(가장 긴 것).
 *  접두어만 같고 모듈이 다른 페이지(예: TR에서 꺼진 /ops/sales)는 아무 항목도 켜지 않아요. */
export function activeNav(items: NavItem[], pathname: string): { group?: NavGroupId; child?: string } {
  if (pathname === "/" || pathname === "") return { group: "home" };
  const routeModule = routeModuleOf(pathname);
  let best: { group: NavGroupId; child?: string; len: number } | undefined;
  for (const g of items) {
    for (const c of g.children) {
      if (c.alias) continue;
      const exact = pathname === c.to;
      const owns = pathname.startsWith(c.to + "/") && (!routeModule || routeModule === c.moduleId);
      if ((exact || owns) && (!best || exact || c.to.length > best.len)) best = { group: g.key, child: c.key, len: exact ? Number.MAX_SAFE_INTEGER : c.to.length };
    }
  }
  if (best) return { group: best.group, child: best.child };
  // 하위 항목이 없는 그룹(ARA·홈) 또는 같은 모듈 항목이 있는 그룹만 접두어로 켭니다
  for (const g of items) {
    const sameModule = !routeModule || g.children.length === 0 || g.children.some((c) => c.moduleId === routeModule);
    if (sameModule && g.prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"))) return { group: g.key };
  }
  return {};
}

// ───────── 모바일 하단 탭(빌드 스펙 2.3절)
export interface MobileTab { key: string; label: string; icon: RegistryIconName; to: string; badgeKey?: NavBadgeKey }
export function mobileTabs(tenant: TenantConfig): MobileTab[] {
  return MOBILE_TABS[tenant.nav.mobileTabs].map((tab) => ({
    key: tab.id, label: tab.nameKo, icon: tab.icon, to: tab.route,
    badgeKey: tab.id === "work" ? "reviewWaiting" : tab.id === "notifications" ? "unreadNotifications" : undefined,
  }));
}

// ───────── 홈 위젯 결정 규칙(빌드 스펙 5.3절)
export const WIDGET_BY_ID = Object.fromEntries(HOME_WIDGETS.map((w) => [w.id, w])) as Record<WidgetId, (typeof HOME_WIDGETS)[number]>;
/** 위젯 추가 조건(레지스트리 밖 규칙) */
export const WIDGET_REQUIRES: Partial<Record<WidgetId, { bundle?: PermissionBundle; minPopulation?: number }>> = {
  "mfg-material-price": { bundle: "view_prices" },
  "ara-aggregate": { minPopulation: 10 },
};

export function homeLayout(
  tenant: TenantConfig,
  persona: { roleCode: string; unitId: string; homePreset: keyof typeof HOME_PRESETS; bundles: PermissionBundle[] },
  enabled: Set<ModuleId>,
  opts: { population?: number } = {},
): WidgetId[] {
  let list: WidgetId[] | undefined = tenant.home.byRoleCode?.[persona.roleCode] ?? tenant.home.byUnit?.[persona.unitId];
  if (!list) {
    const own = tenant.home.byPreset?.[persona.homePreset];
    if (own) list = own;
    else {
      list = [...HOME_PRESETS[persona.homePreset]];
      const mo = tenant.packs.includes("manufacturing") ? MANUFACTURING_OVERRIDES[persona.homePreset] : undefined;
      if (mo) {
        const at = list.indexOf(mo.insertAfter);
        list.splice(at + 1, 0, ...mo.widgets.filter((w) => !list!.includes(w)));
      }
    }
  }
  const out: WidgetId[] = [];
  for (const id of list) {
    const w = WIDGET_BY_ID[id];
    if (!w) { console.warn(`[homeLayout] 모르는 위젯 id를 건너뛰어요: ${id}`); continue; }
    if (tenant.home.hidden.includes(id)) continue;
    if (!enabled.has(w.module)) continue;
    const req = WIDGET_REQUIRES[id];
    if (req?.bundle && !persona.bundles.includes(req.bundle)) continue;
    if (req?.minPopulation && (opts.population ?? 0) < req.minPopulation) continue;
    if (!out.includes(id)) out.push(id);
  }
  if (!out.includes("greeting")) out.unshift("greeting");
  else if (out[0] !== "greeting") { out.splice(out.indexOf("greeting"), 1); out.unshift("greeting"); }
  return out.slice(0, 8);
}
