// 등록된 테넌트 목록. 새 고객은 여기에 TenantConfig 하나를 더합니다.
import type { TenantConfig, TenantSlug } from "./types";
import { crataDemo } from "./crata-demo";
import { trTechnology } from "./tr-technology";

export const TENANTS: Record<TenantSlug, TenantConfig> = {
  "crata-demo": crataDemo,
  "tr-technology": trTechnology,
};

/** 데모 시작·전환기에 보이는 순서 */
export const TENANT_ORDER: TenantSlug[] = ["tr-technology", "crata-demo"];

/** 첫 고객 데모를 기본으로 엽니다. VITE_DEFAULT_TENANT로 바꿀 수 있습니다 */
export const DEFAULT_TENANT: TenantSlug =
  (import.meta.env.VITE_DEFAULT_TENANT as TenantSlug | undefined) && (import.meta.env.VITE_DEFAULT_TENANT as string) in TENANTS
    ? (import.meta.env.VITE_DEFAULT_TENANT as TenantSlug)
    : "tr-technology";

export function isTenantSlug(v: unknown): v is TenantSlug {
  return typeof v === "string" && v in TENANTS;
}

export type { TenantConfig, TenantSlug } from "./types";
