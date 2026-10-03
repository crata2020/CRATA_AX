// config/worksite_modules.yaml → src/modules/registry.generated.ts
// 실행: npm run gen (Node 22 타입 제거로 바로 실행. enum·namespace 같은 지워지지 않는 문법은 쓰지 않습니다)
// 검사: id 중복, 없는 모듈 참조, depends_on, 메뉴 9개·탭 5개 초과, 아이콘 이름(@ant-design/icons 5.6.1 Outlined)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { parse } from "yaml";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, "..");
const yamlPath = resolve(appRoot, "../../config/worksite_modules.yaml");
const outPath = resolve(appRoot, "src/modules/registry.generated.ts");
const iconDir = resolve(appRoot, "node_modules/@ant-design/icons/lib/icons");

/** 03 문서 추가 제안 위젯 12개 + 승인 대기(레지스트리 반영 전). 빌드 스펙 3.1.1절 */
const EXTRA_WIDGETS: { id: string; name_ko: string; module: string; industry?: string; suitable_for: string[] }[] = [
  { id: "mfg-claims-8d", name_ko: "클레임·8D", module: "mfg-quality", industry: "manufacturing", suitable_for: ["ceo", "lead"] },
  { id: "mfg-inspection-queue", name_ko: "검사 대기", module: "mfg-quality", industry: "manufacturing", suitable_for: ["lead", "staff"] },
  { id: "mfg-4m-changes", name_ko: "4M 변경", module: "mfg-quality", industry: "manufacturing", suitable_for: ["lead", "staff"] },
  { id: "mfg-calibration-due", name_ko: "계측기 검교정", module: "mfg-quality", industry: "manufacturing", suitable_for: ["lead", "staff"] },
  { id: "mfg-first-mid-last", name_ko: "초중종물 미실시", module: "mfg-production", industry: "manufacturing", suitable_for: ["lead", "staff"] },
  { id: "mfg-pm-due", name_ko: "보전 일정", module: "mfg-equipment", industry: "manufacturing", suitable_for: ["lead", "staff"] },
  { id: "mfg-legal-calendar", name_ko: "법정 일정", module: "safety-health", industry: "manufacturing", suitable_for: ["ceo", "lead", "staff_admin"] },
  { id: "mfg-monthly-summary", name_ko: "이달 요약", module: "mfg-production", industry: "manufacturing", suitable_for: ["ceo"] },
  { id: "mfg-order-backlog", name_ko: "수주 잔량", module: "mfg-orders", industry: "manufacturing", suitable_for: ["lead"] },
  { id: "mfg-field-feed", name_ko: "오늘 현장 등록", module: "mfg-quality", industry: "manufacturing", suitable_for: ["lead"] },
  { id: "mfg-dev-projects", name_ko: "개발 진행", module: "business-structure", industry: "manufacturing", suitable_for: ["lead", "staff"] },
  { id: "mfg-material-price", name_ko: "원재료 가격", module: "mfg-materials", industry: "manufacturing", suitable_for: ["ceo", "staff_admin"] },
  // 승인 대기: 검토·분류 확인·결정·현장 배정·규칙 후보를 한곳에 모아 한 번 눌러 처리(도입 1단계 홈의 중심)
  { id: "approval-inbox", name_ko: "승인 대기", module: "tasks", suitable_for: ["ceo", "lead", "staff_admin"] },
];

type Any = Record<string, any>;
const doc = parse(readFileSync(yamlPath, "utf8")) as Any;
const errors: string[] = [];
const warn: string[] = [];

const modules: Any[] = doc.modules ?? [];
const moduleIds = new Set<string>();
for (const m of modules) {
  if (moduleIds.has(m.id)) errors.push(`모듈 id 중복: ${m.id}`);
  moduleIds.add(m.id);
}
for (const m of modules) {
  for (const d of m.depends_on ?? []) if (!moduleIds.has(d)) errors.push(`${m.id}.depends_on에 없는 모듈: ${d}`);
}
const navGroups: Any[] = (doc.nav_groups ?? []).filter((g: Any) => g.order != null);
if (navGroups.length > 9) errors.push(`메뉴 최상위가 9개를 넘어요: ${navGroups.length}`);
const tabs: Any = doc.mobile_tabs ?? {};
for (const [k, list] of Object.entries(tabs)) if ((list as Any[]).length > 5) errors.push(`모바일 탭 ${k}가 5개를 넘어요`);

const icons = new Set<string>();
const checkIcon = (name: string | undefined, where: string) => {
  if (!name) return;
  icons.add(name);
  if (!name.endsWith("Outlined")) errors.push(`${where}: Outlined 아이콘만 써요 (${name})`);
  if (existsSync(iconDir) && !existsSync(resolve(iconDir, `${name}.js`))) errors.push(`${where}: 없는 아이콘 ${name}`);
};
for (const g of navGroups) checkIcon(g.icon, `nav_groups.${g.id}`);
for (const [k, list] of Object.entries(tabs)) for (const t of list as Any[]) checkIcon(t.icon, `mobile_tabs.${k}.${t.id}`);
for (const m of modules) checkIcon(m.icon, `modules.${m.id}`);

const widgets: Any[] = [...(doc.home_widgets ?? [])];
const widgetIds = new Set<string>();
for (const w of widgets) {
  if (widgetIds.has(w.id)) errors.push(`위젯 id 중복: ${w.id}`);
  widgetIds.add(w.id);
  if (!moduleIds.has(w.module)) errors.push(`위젯 ${w.id}의 모듈이 없어요: ${w.module}`);
}
for (const w of EXTRA_WIDGETS) {
  if (widgetIds.has(w.id)) continue;
  widgetIds.add(w.id);
  widgets.push({ ...w, tier: "P1", extra: true });
  if (!moduleIds.has(w.module)) errors.push(`추가 위젯 ${w.id}의 모듈이 없어요: ${w.module}`);
}
const presets: Any = doc.home_presets ?? {};
const presetNames = ["ceo", "lead", "staff", "staff_admin"];
for (const p of presetNames) for (const id of presets[p] ?? []) if (!widgetIds.has(id)) warn.push(`프리셋 ${p}의 위젯이 카탈로그에 없어요: ${id}`);

if (errors.length) {
  console.error("레지스트리 검사 실패:\n- " + errors.join("\n- "));
  process.exit(1);
}
for (const w of warn) console.warn("경고:", w);

const q = (v: unknown) => JSON.stringify(v);
const lit = (arr: Iterable<string>) => [...arr].map((x) => q(x)).join(" | ") || "never";

const moduleRows = modules.map((m) => {
  const entities = (m.entities ?? []).map((e: Any) => ({ name: e.name, labelKo: e.label_ko, fields: e.fields ?? [] }));
  return {
    id: m.id,
    nameKo: m.name_ko,
    tier: m.tier,
    group: m.group,
    icon: m.icon ?? null,
    route: m.route ?? null,
    industry: m.industry ?? "core",
    defaultEnabled: m.default_enabled === true,
    enabledByPacks: m.enabled_by_packs ?? [],
    buildMode: m.build_mode ?? "build",
    description: m.description ?? "",
    entities,
    permissions: m.permissions ?? {},
    dependsOn: m.depends_on ?? [],
  };
});

const out = `// 자동 생성 파일입니다. 고치지 마세요.
// 원본: config/worksite_modules.yaml (v${doc.meta?.version}, ${doc.meta?.updated}) + 빌드 스펙 3.1.1절 추가 위젯 12개
// 다시 만들기: npm run gen
/* eslint-disable */

export type ModuleId = ${lit(moduleIds)};
export type NavGroupId = ${lit(navGroups.map((g) => g.id))};
export type WidgetId = ${lit(widgetIds)};
export type PlatformRoleId = "owner" | "admin" | "reviewer" | "member";
export type PermissionLevel = "manage" | "approve" | "edit" | "own" | "view" | "aggregate" | "none";
export type ModuleTier = "P0" | "P1" | "P2";
export type BuildMode = "build" | "integrate" | "hybrid";
export type IndustryId = "core" | "manufacturing" | "education_consulting";
export type PresetId = "ceo" | "lead" | "staff" | "staff_admin";
export type RegistryIconName = ${lit(icons)};

export interface RegistryModule {
  id: ModuleId;
  nameKo: string;
  tier: ModuleTier;
  group: string;
  icon: RegistryIconName | null;
  route: string | null;
  industry: IndustryId;
  defaultEnabled: boolean;
  enabledByPacks: string[];
  buildMode: BuildMode;
  description: string;
  entities: { name: string; labelKo: string; fields: string[] }[];
  permissions: Partial<Record<PlatformRoleId, PermissionLevel>>;
  dependsOn: ModuleId[];
}
export interface RegistryNavGroup {
  id: NavGroupId; order: number; nameKo: string; nameByPack?: Record<string, string>;
  icon: RegistryIconName; route: string; visibleTo: PlatformRoleId[];
}
export interface RegistryMobileTab { id: string; nameKo: string; icon: RegistryIconName; route: string }
export interface RegistryWidget {
  id: WidgetId; nameKo: string; tier: ModuleTier; module: ModuleId; industry?: IndustryId;
  suitableFor: PresetId[]; extra?: boolean;
}

export const REGISTRY_VERSION = ${q(doc.meta?.version ?? "")};

export const MODULES: RegistryModule[] = ${JSON.stringify(moduleRows, null, 2)} as RegistryModule[];

export const NAV_GROUPS: RegistryNavGroup[] = ${JSON.stringify(
  navGroups.map((g) => ({
    id: g.id, order: g.order, nameKo: g.name_ko, ...(g.name_by_pack ? { nameByPack: g.name_by_pack } : {}),
    icon: g.icon, route: g.route, visibleTo: g.visible_to ?? [],
  })),
  null,
  2,
)} as RegistryNavGroup[];

export const MOBILE_TABS: Record<"default" | "manufacturing", RegistryMobileTab[]> = ${JSON.stringify(
  Object.fromEntries(
    Object.entries(tabs).map(([k, list]) => [k, (list as Any[]).map((t) => ({ id: t.id, nameKo: t.name_ko, icon: t.icon, route: t.route }))]),
  ),
  null,
  2,
)};

export const HOME_WIDGETS: RegistryWidget[] = ${JSON.stringify(
  widgets.map((w) => ({
    id: w.id, nameKo: w.name_ko, tier: w.tier, module: w.module, ...(w.industry ? { industry: w.industry } : {}),
    suitableFor: w.suitable_for ?? [], ...(w.extra ? { extra: true } : {}),
  })),
  null,
  2,
)} as RegistryWidget[];

export const HOME_PRESETS: Record<PresetId, WidgetId[]> = ${JSON.stringify(
  Object.fromEntries(presetNames.map((p) => [p, presets[p] ?? []])),
  null,
  2,
)} as Record<PresetId, WidgetId[]>;

export const MANUFACTURING_OVERRIDES: Partial<Record<PresetId, { insertAfter: WidgetId; widgets: WidgetId[] }>> = ${JSON.stringify(
  Object.fromEntries(
    Object.entries(presets.manufacturing_overrides ?? {}).map(([k, v]) => [k, { insertAfter: (v as Any).insert_after, widgets: (v as Any).widgets }]),
  ),
  null,
  2,
)} as Partial<Record<PresetId, { insertAfter: WidgetId; widgets: WidgetId[] }>>;

export const EXCLUDED_MODULES: { id: string; nameKo: string; instead: string }[] = ${JSON.stringify(
  (doc.excluded ?? []).map((e: Any) => ({ id: e.id, nameKo: e.name_ko, instead: e.instead })),
  null,
  2,
)};
`;

const prev = existsSync(outPath) ? readFileSync(outPath, "utf8") : "";
if (prev !== out) {
  writeFileSync(outPath, out);
  console.log(`생성했어요: ${outPath.replace(appRoot + "/", "")} (모듈 ${moduleIds.size} · 위젯 ${widgetIds.size} · 메뉴 ${navGroups.length})`);
} else {
  console.log("레지스트리가 이미 최신이에요.");
}
