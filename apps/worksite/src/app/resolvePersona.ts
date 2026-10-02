// 누구로 보기(페르소나) 고르기: 회사 설정의 인물 + 구성원 관리에서 바꾼 역할·상태(members 행).
// 비활성 구성원은 고를 수 없고(기본 인물 → 첫 활성 인물로), 플랫폼 역할은 저장된 값을 따라요(리뷰 3차).
import type { TenantConfig, PermissionBundle, PlatformRole } from "@/tenants/types";
import type { Persona } from "@/data/seed/types";

export interface MemberState { role?: PlatformRole; status?: string }

export function resolvePersona(tenant: TenantConfig, memberOf: (id: string) => MemberState | undefined, wanted: { as?: string | null; saved?: string | null }): Persona {
  const people = tenant.people.filter((p) => p.persona);
  const active = people.filter((p) => memberOf(p.id)?.status !== "inactive").map((p) => p.roleCode);
  const fallback = active.includes(tenant.defaultPersona) ? tenant.defaultPersona : active[0] ?? tenant.defaultPersona;
  const roleCode = wanted.as && active.includes(wanted.as) ? wanted.as : wanted.saved && active.includes(wanted.saved) ? wanted.saved : fallback;
  const person = people.find((p) => p.roleCode === roleCode) ?? tenant.people.find((p) => p.roleCode === roleCode)!;
  const role = tenant.roles.find((r) => r.code === roleCode)!;
  const bundles = (Object.entries(tenant.permissionBundles) as [PermissionBundle, string[]][]).filter(([, codes]) => codes.includes(roleCode)).map(([b]) => b);
  return { memberId: person.id, roleCode, role: memberOf(person.id)?.role ?? role.platformRole, unitId: person.unitId, displayName: person.displayName, bundles };
}
