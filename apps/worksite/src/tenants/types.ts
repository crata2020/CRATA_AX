// TenantConfig 타입(빌드 스펙 5.1절). 회사별 차이는 코드가 아니라 이 데이터로만 줍니다.
// 번들에는 공개 정보(L0)와 가상 데이터만 넣습니다.
import type { ModuleId, NavGroupId, WidgetId, PresetId } from "@/modules/registry.generated";

export type TenantSlug = "crata-demo" | "tr-technology";
export type PlatformRole = "owner" | "admin" | "reviewer" | "member";
export type HomePreset = PresetId;
export type IndustryPack = "manufacturing" | "education_consulting";
export type Density = "comfortable" | "compact" | "public";
export type PermissionBundle = "view_prices";
export type Sensitivity = "L0" | "L1" | "L2";
/** 화면 용어 키. glossary.platform으로 회사 말로 바꿀 수 있음 */
export type PlatformTermKey =
  | "term.businessLine" | "term.project" | "term.part" | "term.task" | "term.meeting"
  | "term.artifact" | "term.partner" | "term.review" | `nav.${NavGroupId}`;

export interface BrandTokens {
  brand: string; brandWeak: string; onBrand: string; onBrand2: string; heroLine: string;
  /** 글자만 쓰는 강조(링크·켜진 메뉴·탭 글자·정렬 화살표). 브랜드가 ink와 너무 가까우면(TR 남색 1.55:1) 더 밝은 단계. 흰 바탕 4.5:1 이상 */
  brandText: string;
  /** info 상태색(진행·검토 대기). 브랜드가 good 초록과 색상이 가까우면(±60°) 고정 파랑 묶음 — 초록 '정상' 알약과 나란히 구별되게 */
  info: { mark: string; bg: string; fg: string };
  panel: string; surface: string; line: string; controlLine: string;
  ink: string; ink2: string; muted: string;
  chartAccent: string; chartMuted: string;
  /** 업무 상태 막대의 '진행 중'(브랜드 밝은 단계). '검토 대기'(브랜드)와 나란히 구별되게 validate_palette로 확인한 값 */
  chartProgress: string;
  /** 4.1.4절, 슬롯 1 = chartAccent */
  chartPalette: [string, string, string, string, string, string, string, string];
  shadowPop: string; shadowModal: string;
}

export interface RoleDef {
  code: string;                 // "R_PLANT_MGR"
  title: string;                // "공장장"
  unitId: string;               // OrgUnit id
  platformRole: PlatformRole;
  homePreset: HomePreset;
  bundles?: PermissionBundle[];
  /** 현장 작업자: 모바일 배치를 기본으로 보여 줌 */
  mobileFirst?: boolean;
  /** 진단 전 가설이면 true(Company DNA 화면에 '가설' 태그) */
  hypothesis?: boolean;
}

export interface PersonSeed {
  id: string;                   // "m-tr-plant"
  displayName: string;          // "공장장(예시)" 또는 "성춘향"
  roleCode: string; unitId: string; jobTitle: string; duties?: string;
  email: string;                // 반드시 @example.com
  phoneWork: string;            // 반드시 "000-0000-0xxx" 형식의 가짜 번호
  persona: boolean;             // "누구로 보기" 목록에 나오는지(역할코드마다 1명)
}

export interface ProjectSeed {
  id: string; code: string; name: string; aliases?: string[];
  partnerId?: string; ownerMemberId: string; reviewerMemberId: string; memberIds: string[];
  startOn: string; dueOn: string;                 // YYYY-MM-DD
  status: "planned" | "active" | "on_hold" | "done";
  health: "good" | "warning" | "critical";
  sensitivity: Sensitivity; description: string;
  parts: { id: string; name: string; leadMemberId: string; memberIds: string[] }[];
}
export interface BusinessLineSeed {
  id: string; code: string; name: string; description: string; ownerMemberId: string;
  /** 가설이면 true(TR 사업 구조) */
  hypothesis?: boolean;
  projects: ProjectSeed[];
}
export interface PartnerSeed {
  id: string; kind: "customer" | "supplier" | "vendor" | "agency";
  name: string;                 // 반드시 "예시"로 시작(이 앞말이 가상 표시라 "(가상)" 꼬리는 붙이지 않음, 리뷰 2차)
  status: "active" | "prospect" | "inactive"; ownerMemberId: string; tags: string[]; note?: string;
}

/** 회사 소개·Company DNA에 보이는 사실. 공개 자료(L0)만. 각 값에 근거 id */
export interface TenantFacts {
  overview: { label: string; value: string; evidence?: string[] }[];
  vision?: { mission: string; pillars: { key: string; text: string }[]; evidence: string[] };
  history?: { date: string; event: string; evidence: string[] }[];
  certifications?: { name: string; stated: string; currentStatus: "확인 필요" }[];
  processes?: string[]; productCategories?: string[]; materialGrades?: string[];
  equipmentPublic?: { kind: string; countPublic: number | null; note?: string }[];
  dataClasses: { level: "L0" | "L1" | "L2" | "L3"; meaning: string; examples: string[]; storage: string; aiRoute: string }[];
  hypotheses: { label: string; confidence: number }[];
  cadences: { name: string; rule: string; basis?: string }[];
  /** "회사 소개는 Company DNA 작성 후" 같은 빈칸 안내 */
  todo: string[];
  /** 근거 id → 출처 설명(공개 자료) */
  sources?: Record<string, { title: string; url?: string }>;
}

export interface GlossaryTermSeed {
  id: string; term: string; uiLabel: string; aliases: string[]; definition: string;
  forbidden?: boolean; platformKey?: PlatformTermKey; toConfirm?: boolean; evidence?: string[];
}

export interface TenantConfig {
  slug: TenantSlug;
  /** 데이터 칸막이: "crata-demo" | "tr-technology-demo" */
  tenantId: string;
  displayName: string; legalName?: string;
  /** 모노그램 2자, 로고 이미지 없음 */
  monogram: string;
  /** 모바일 상단 바처럼 좁은 자리에 쓰는 짧은 이름(예: "티알"). 없으면 displayName */
  shortName?: string;
  /** 업종 한 줄(데모 시작 화면 카드) */
  tagline: string;
  isDemo: true;
  /** "2026-09-30" — 화면의 '오늘', ?today=로 바꿀 수 있음 */
  demoToday: string;
  /** 시드 규칙이 바뀌면 +1 → 저장된 변경분 버림(5.5절) */
  seedVersion: number;
  profile: { version: string; verifiedOn: string; sourceNote: string };
  theme: { tokens: BrandTokens; density: Density };
  packs: IndustryPack[];
  /** 레지스트리 default_enabled 위에 덮어씀 */
  modules: { enable: ModuleId[]; disable: ModuleId[] };
  nav: { labels: Partial<Record<NavGroupId, string>>; mobileTabs: "default" | "manufacturing" };
  glossary: {
    /** 메뉴·필드 이름 치환 */
    platform: Partial<Record<PlatformTermKey, string>>;
    terms: GlossaryTermSeed[];
  };
  orgUnits: { id: string; name: string; parentId: string | null; headMemberId?: string; sortOrder: number }[];
  roles: RoleDef[];
  people: PersonSeed[];
  /** roleCode */
  defaultPersona: string;
  /** 묶음 → 역할코드 목록 */
  permissionBundles: Record<PermissionBundle, string[]>;
  home: {
    byRoleCode?: Record<string, WidgetId[]>;                  // 1순위
    byUnit?: Record<string, WidgetId[]>;                      // 2순위
    byPreset?: Partial<Record<HomePreset, WidgetId[]>>;       // 3순위
    hidden: WidgetId[];
  };
  businessStructure: BusinessLineSeed[];
  partners: PartnerSeed[];
  facts: TenantFacts;
  policies: { aggregateMinN: 10; teamMinN: 5; mcpEnabled: boolean; mailPreview: boolean; approvalsPreview: boolean };
}
