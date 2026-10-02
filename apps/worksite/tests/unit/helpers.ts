// 테스트 도우미: 테넌트·페르소나로 메모리 공급자를 만듭니다(브라우저 없이, node 환경)
import { TENANTS, type TenantSlug } from "@/tenants";
import type { PermissionBundle } from "@/tenants/types";
import { buildSeeds } from "@/data/seed";
import type { Persona } from "@/data/seed/types";
import { createClock } from "@/lib/clock";
import { MemoryStore } from "@/providers/store";
import { Policy } from "@/providers/policy";
import { createMemoryDataProvider } from "@/providers/mockDataProvider";
import { resolveModules } from "@/modules";

export function makeProvider(slug: TenantSlug, roleCode?: string, opts: { emptyMode?: boolean } = {}) {
  const tenant = TENANTS[slug];
  const code = roleCode ?? tenant.defaultPersona;
  const person = tenant.people.find((p) => p.roleCode === code && p.persona)!;
  const role = tenant.roles.find((r) => r.code === code)!;
  const bundles = (Object.entries(tenant.permissionBundles) as [PermissionBundle, string[]][]).filter(([, c]) => c.includes(code)).map(([b]) => b);
  const persona: Persona = { memberId: person.id, roleCode: code, role: role.platformRole, unitId: person.unitId, displayName: person.displayName, bundles };
  const clock = createClock(tenant.demoToday);
  const seeds = buildSeeds({ tenant, today: tenant.demoToday, emptyMode: opts.emptyMode });
  const store = new MemoryStore(seeds, { key: `test:${slug}:${Math.random()}`, seedVersion: tenant.seedVersion, persist: false });
  const enabled = resolveModules(tenant).enabled;
  const policy = new Policy({ tenant, persona, enabled: () => enabled }, store);
  const dp = createMemoryDataProvider({ tenant, persona, clock, seeds, store, policy, latencyMs: [0, 0] });
  return { tenant, persona, store, policy, dp };
}
