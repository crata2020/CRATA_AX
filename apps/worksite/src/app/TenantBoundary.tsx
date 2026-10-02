// TenantBoundary: 테넌트·페르소나·기준 날짜를 정하고(?tenant=&as=&today= → 저장된 마지막 선택 → 기본값),
// 공급자(메모리·ARA·정책)를 만들고, 테마 CSS 변수를 적용합니다(빌드 스펙 2.2·4.5·5.5절).
// 회사 설정 덮어쓰기(모듈·테마·용어)가 바뀌면 메뉴·테마를 바로 다시 계산합니다.
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import type { DataProvider } from "@refinedev/core";
import { TENANTS, DEFAULT_TENANT, isTenantSlug, type TenantConfig, type TenantSlug } from "@/tenants";
import type { BrandTokens, Density, PermissionBundle, PersonSeed, RoleDef } from "@/tenants/types";
import type { ModuleId } from "@/modules/registry.generated";
import { buildNav, makeT, mobileTabs, resolveModules, type MobileTab, type NavItem } from "@/modules";
import type { TenantOverrides, ResourceName } from "@/types/entities";
import type { SeedRegistry, BuildSeedOptions } from "@/data/seed";
import type { Persona } from "@/data/seed/types";
import { createClock, type Clock } from "@/lib/clock";
import { getPrefs, setPrefs, opsKey } from "@/lib/storage";
import { readBootParams, reloadWithBootParams } from "@/lib/url";
import { MemoryStore } from "@/providers/store";
import { Policy, type CanResult } from "@/providers/policy";
import { createMemoryDataProvider } from "@/providers/mockDataProvider";
import { createAraProvider, type AraDataProvider } from "@/providers/araProvider";
import { deriveTenantTheme } from "@/theme/derive";
import { CATEGORICAL_TAIL } from "@/theme/tokens";
import { applyThemeToDocument } from "@/theme/cssVars";

interface Boot {
  tenant: TenantConfig;
  persona: Persona;
  role: RoleDef;
  clock: Clock;
  seeds: SeedRegistry;
  store: MemoryStore;
  policy: Policy;
  dataProvider: DataProvider;
  araProvider: AraDataProvider;
  enabledRef: { current: Set<ModuleId> };
  flags: { latencyOff: boolean; emptyMode: boolean; todayOverridden: boolean };
}

const isDate = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

function readOverrides(store: MemoryStore): TenantOverrides {
  return (store.find("tenant_settings", "settings")?.overrides as TenantOverrides | undefined) ?? {};
}

/** 부팅: URL 매개변수와 편의 값으로 테넌트·인물을 정하고 공급자를 만듭니다(새로고침마다 한 번).
 *  시드(두 테넌트 예시 데이터, 큰 덩어리)는 첫 화면 JS에 넣지 않고 따로 불러와요(import("@/data/seed")) */
function boot(buildSeeds: (o: BuildSeedOptions) => SeedRegistry): Boot {
  const params = readBootParams();
  const prefs = getPrefs();
  const slug: TenantSlug = isTenantSlug(params.tenant) ? params.tenant : isTenantSlug(prefs.lastTenant) ? prefs.lastTenant : DEFAULT_TENANT;
  const tenant = TENANTS[slug];
  const personaCodes = tenant.people.filter((p) => p.persona).map((p) => p.roleCode);
  const savedCode = prefs.personaByTenant?.[slug];
  const roleCode = params.as && personaCodes.includes(params.as) ? params.as : savedCode && personaCodes.includes(savedCode) ? savedCode : tenant.defaultPersona;
  setPrefs({ lastTenant: slug, personaByTenant: { ...(prefs.personaByTenant ?? {}), [slug]: roleCode } });

  const person = tenant.people.find((p) => p.roleCode === roleCode && p.persona) ?? tenant.people.find((p) => p.roleCode === roleCode)!;
  const role = tenant.roles.find((r) => r.code === roleCode)!;
  const bundles = (Object.entries(tenant.permissionBundles) as [PermissionBundle, string[]][]).filter(([, codes]) => codes.includes(roleCode)).map(([b]) => b);
  const persona: Persona = { memberId: person.id, roleCode, role: role.platformRole, unitId: person.unitId, displayName: person.displayName, bundles };

  const today = isDate(params.today) ? params.today : tenant.demoToday;
  const clock = createClock(today);
  const emptyMode = params.empty === "1";
  const latencyOff = params.latency === "0";
  const persist = !emptyMode && params.persist !== "0" && prefs.persist !== false;
  const latencyMs: [number, number] = latencyOff ? [0, 0] : [150, 300];

  const seeds = buildSeeds({ tenant, today, emptyMode });
  const store = new MemoryStore(seeds, { key: opsKey(tenant.tenantId), seedVersion: tenant.seedVersion, persist });
  const enabledRef = { current: resolveModules(tenant, readOverrides(store)).enabled };
  const policy = new Policy({ tenant, persona, enabled: () => enabledRef.current }, store);
  const dataProvider = createMemoryDataProvider({ tenant, persona, clock, seeds, store, policy, latencyMs });
  const araProvider = createAraProvider({ tenant, persona, clock, seed: seeds.ara, persist, latencyMs });
  if (import.meta.env.DEV) {
    // 개발 모드 디버그 창구: 콘솔에서 __ws.data.getList({ resource: "tasks" }) · __ws.store.rows("tasks") · __ws.seeds.groupsWithData
    (window as unknown as { __ws: unknown }).__ws = { tenant, persona, store, policy, seeds, data: dataProvider, ara: araProvider };
  }
  return { tenant, persona, role, clock, seeds, store, policy, dataProvider, araProvider, enabledRef, flags: { latencyOff, emptyMode, todayOverridden: isDate(params.today) } };
}

function themeFor(tenant: TenantConfig, o: TenantOverrides): { tokens: BrandTokens; density: Density } {
  let tokens = tenant.theme.tokens;
  const brand = o.theme?.brand;
  const accent = o.theme?.chartAccent;
  if (brand && brand.toUpperCase() !== tokens.brand.toUpperCase()) {
    tokens = deriveTenantTheme({ brand, chartAccent: accent ?? tokens.chartAccent });
  } else if (accent && accent.toUpperCase() !== tokens.chartAccent.toUpperCase()) {
    tokens = { ...tokens, chartAccent: accent.toUpperCase(), chartPalette: [accent.toUpperCase(), ...CATEGORICAL_TAIL] };
  }
  return { tokens, density: o.theme?.density ?? tenant.theme.density };
}

export interface WorksiteContextValue {
  /** 현재 테넌트(모노그램 덮어쓰기 반영) */
  tenant: TenantConfig;
  persona: Persona;
  role: RoleDef;
  clock: Clock;
  today: string;
  tokens: BrandTokens;
  density: Density;
  overrides: TenantOverrides;
  enabledModules: Set<ModuleId>;
  isModuleOn: (id: ModuleId) => boolean;
  /** 리소스 또는 모듈 × 동작(행 규칙 포함). 버튼 숨기기·끄기에 씁니다 */
  can: (resourceOrModule: ResourceName | ModuleId | string, action: string, row?: Record<string, unknown>) => CanResult;
  hasBundle: (b: PermissionBundle) => boolean;
  /** 화면 용어: t("term.project") · t("nav.industry") */
  t: (key: string, fallback?: string) => string;
  nav: NavItem[];
  tabs: MobileTab[];
  /** 사람 찾기(TenantConfig.people) */
  person: (memberId: string | null | undefined) => PersonSeed | undefined;
  personas: PersonSeed[];
  persist: boolean;
  setPersist: (on: boolean) => void;
  flags: Boot["flags"];
  /** 시작할 때 알릴 말(데모 데이터 버전 변경 등) */
  bootNotices: string[];
  switchTenant: (slug: TenantSlug) => void;
  switchPersona: (roleCode: string, tenant?: TenantSlug) => void;
  /** rpc:reset_demo 후 새로고침(확인 대화상자는 부르는 쪽이 띄움) */
  resetDemo: () => Promise<void>;
  /** 내부: Refine 공급자 */
  providers: { data: DataProvider; ara: DataProvider; policy: Policy; store: MemoryStore };
}

const Ctx = createContext<WorksiteContextValue | null>(null);

/** 시드 모듈은 앱이 뜨자마자 받기 시작해요(화면 뼈대와 나란히) */
const seedModule = import("@/data/seed");

/** 시드를 받는 동안 보이는 아주 작은 뼈대(테마 전이라 중립 색) */
function BootSkeleton() {
  return (
    <div className="ws-boot" role="status" aria-live="polite">
      <span className="ws-boot__dot" aria-hidden />
      <span>업무사이트를 여는 중이에요</span>
    </div>
  );
}

export function TenantBoundary({ children }: { children: ReactNode }) {
  const [b, setB] = useState<Boot | null>(null);
  useEffect(() => {
    let alive = true;
    void seedModule.then((m) => { if (alive) setB(boot(m.buildSeeds)); });
    return () => { alive = false; };
  }, []);
  if (!b) return <BootSkeleton />;
  return <Booted b={b}>{children}</Booted>;
}

function Booted({ b, children }: { b: Boot; children: ReactNode }) {
  const [overrides, setOverrides] = useState<TenantOverrides>(() => readOverrides(b.store));
  const [persist, setPersistState] = useState(b.store.persistEnabled);

  useEffect(() => b.store.subscribe((res) => { if (res.has("tenant_settings")) setOverrides(readOverrides(b.store)); }), [b]);

  const derived = useMemo(() => {
    const modules = resolveModules(b.tenant, overrides);
    b.enabledRef.current = modules.enabled;
    const t = makeT(b.tenant, overrides);
    const theme = themeFor(b.tenant, overrides);
    const tenant: TenantConfig = overrides.theme?.monogram ? { ...b.tenant, monogram: overrides.theme.monogram } : b.tenant;
    return { modules, t, theme, tenant, nav: buildNav(b.tenant, b.persona.role, modules.enabled, t), tabs: mobileTabs(b.tenant) };
  }, [b, overrides]);

  useLayoutEffect(() => {
    applyThemeToDocument(derived.theme.tokens, b.tenant.slug, derived.theme.density);
  }, [b, derived.theme]);

  const setPersist = useCallback((on: boolean) => {
    b.store.setPersist(on);
    b.araProvider.setPersist(on);
    setPrefs({ persist: on });
    setPersistState(on);
  }, [b]);

  const value = useMemo<WorksiteContextValue>(() => ({
    tenant: derived.tenant,
    persona: b.persona,
    role: b.role,
    clock: b.clock,
    today: b.clock.today,
    tokens: derived.theme.tokens,
    density: derived.theme.density,
    overrides,
    enabledModules: derived.modules.enabled,
    isModuleOn: (id) => derived.modules.enabled.has(id),
    can: (r, action, row) => b.policy.can(r, action, row),
    hasBundle: (x) => b.persona.bundles.includes(x),
    t: derived.t,
    nav: derived.nav,
    tabs: derived.tabs,
    person: (id) => (id ? b.tenant.people.find((p) => p.id === id) : undefined),
    personas: b.tenant.people.filter((p) => p.persona),
    persist,
    setPersist,
    flags: b.flags,
    bootNotices: b.store.notices,
    switchTenant: (slug) => reloadWithBootParams({ tenant: slug, as: null }, "#/"),
    switchPersona: (roleCode, slug) => {
      const target = slug ?? b.tenant.slug;
      const prefs = getPrefs();
      setPrefs({ personaByTenant: { ...(prefs.personaByTenant ?? {}), [target]: roleCode } });
      reloadWithBootParams({ tenant: target, as: roleCode });
    },
    resetDemo: async () => {
      await b.dataProvider.custom!({ url: "rpc:reset_demo", method: "post" });
      reloadWithBootParams({});
    },
    providers: { data: b.dataProvider, ara: b.araProvider, policy: b.policy, store: b.store },
  }), [b, derived, overrides, persist, setPersist]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** 워크사이트 문맥 전체 */
export function useWorksite(): WorksiteContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWorksite는 TenantBoundary 안에서만 써요");
  return v;
}
export const useTenant = () => useWorksite().tenant;
export const usePersona = () => useWorksite().persona;
export const useClock = () => useWorksite().clock;
export const useT = () => useWorksite().t;
/** 동기 권한 확인: const { can, reason } = useCanDo("submissions", "approve", row) */
export function useCanDo(resourceOrModule: string, action: string, row?: Record<string, unknown>): CanResult {
  const { can } = useWorksite();
  return can(resourceOrModule, action, row);
}
