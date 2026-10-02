// 전체 페이지 목록(빌드 스펙 2.7절, 63개). 라우트는 routes.tsx가 이 표와 import.meta.glob("../pages/*/index.tsx")로 자동 연결합니다.
// 그룹은 이 파일을 고치지 않습니다(Foundation 소유).
import type { ModuleId } from "@/modules/registry.generated";
import type { TenantSlug } from "@/tenants/types";
import { SAMPLE_PARAMS } from "@/data/seed/anchors";

export type PageGroup = "home" | "work" | "collab" | "industry" | "ara_settings";

export interface RouteEntry {
  id: string;
  path: string;
  nameKo: string;
  /** src/pages/<dir>/index.tsx */
  dir: string;
  group: PageGroup;
  moduleId: ModuleId;
  /** "both"가 아니면 다른 테넌트에서 module_off로 열림 */
  tenants: "both" | TenantSlug;
  depth: "A" | "B" | "C";
  /** AppShell 없이(데모 시작) */
  bare?: boolean;
}

const e = (id: string, path: string, nameKo: string, dir: string, group: PageGroup, moduleId: ModuleId, tenants: RouteEntry["tenants"], depth: RouteEntry["depth"], extra: Partial<RouteEntry> = {}): RouteEntry =>
  ({ id, path, nameKo, dir, group, moduleId, tenants, depth, ...extra });

export const MANIFEST: RouteEntry[] = [
  e("H-01", "/", "홈", "home", "home", "home-dashboard", "both", "A"),
  e("H-02", "/notifications", "알림", "notifications", "home", "notifications", "both", "A"),
  e("H-03", "/me/notifications", "알림 설정", "notification-settings", "home", "notifications", "both", "B"),
  e("H-04", "/search", "검색", "search", "home", "search", "both", "A"),
  e("H-05", "/more", "전체 메뉴", "more", "home", "home-dashboard", "both", "B"),
  e("H-06", "/login", "데모 시작", "login", "home", "home-dashboard", "both", "B", { bare: true }),
  e("H-07", "*", "찾을 수 없음", "not-found", "home", "home-dashboard", "both", "C"),
  e("W-01", "/projects", "사업·프로젝트", "projects", "work", "business-structure", "both", "A"),
  e("W-02", "/projects/:projectId", "프로젝트 상세", "project-detail", "work", "business-structure", "both", "A"),
  e("W-03", "/work", "내 업무", "work-list", "work", "tasks", "both", "A"),
  e("W-04", "/work/board", "업무 보드", "work-board", "work", "tasks", "both", "A"),
  e("W-05", "/work/review", "검토함", "work-review", "work", "tasks", "both", "A"),
  e("W-06", "/work/tasks/:taskId", "업무 상세", "task-detail", "work", "tasks", "both", "A"),
  e("W-07", "/meetings", "회의", "meetings", "work", "meetings", "both", "A"),
  e("W-08", "/meetings/:meetingId", "회의 상세", "meeting-detail", "work", "meetings", "both", "A"),
  e("W-09", "/meetings/inbox", "분류 확인", "meeting-inbox", "work", "meetings", "both", "A"),
  e("W-10", "/meetings/decisions", "결정 모음", "decisions", "work", "meetings", "both", "B"),
  e("C-01", "/docs", "산출물", "docs", "collab", "documents", "both", "A"),
  e("C-02", "/docs/artifacts/:artifactId", "산출물 상세", "artifact-detail", "collab", "documents", "both", "A"),
  e("C-03", "/docs/templates", "양식", "templates", "collab", "documents", "both", "B"),
  e("C-04", "/docs/rules", "작성 규칙", "correction-rules", "collab", "correction-rules", "both", "A"),
  e("C-05", "/docs/knowledge", "지식", "knowledge", "collab", "knowledge", "both", "B"),
  e("C-06", "/docs/glossary", "용어집", "glossary", "collab", "knowledge", "both", "B"),
  e("C-07", "/work/mail", "메일 제안", "mail-inbox", "collab", "mail-connector", "both", "B"),
  e("C-08", "/company/notices", "공지", "notices", "collab", "notices", "both", "A"),
  e("C-09", "/company/notices/:noticeId", "공지 상세", "notice-detail", "collab", "notices", "both", "A"),
  e("C-10", "/company/calendar", "일정", "calendar", "collab", "calendar", "both", "B"),
  e("C-11", "/company/approvals", "결재", "approvals", "collab", "approvals", "both", "B"),
  e("C-12", "/company/people", "구성원", "people", "collab", "org-members", "both", "A"),
  e("C-13", "/company/org", "조직도", "org-chart", "collab", "org-members", "both", "B"),
  e("C-14", "/company/about", "회사 소개", "company-about", "collab", "company-info", "both", "C"),
  e("I-01", "/projects/partners", "거래처", "partners", "industry", "partners", "both", "A"),
  e("I-02", "/projects/partners/:partnerId", "거래처 상세", "partner-detail", "industry", "partners", "both", "A"),
  e("I-03", "/projects/contacts", "담당자", "contacts", "industry", "partners", "both", "B"),
  e("I-04", "/ops/sales", "영업 파이프라인", "sales-pipeline", "industry", "edu-sales", "crata-demo", "A"),
  e("I-05", "/ops/sales/quotes", "견적", "quotes", "industry", "edu-sales", "crata-demo", "B"),
  e("I-06", "/ops", "생산·품질 홈", "ops-home", "industry", "mfg-production", "tr-technology", "A"),
  e("I-07", "/ops/report", "현장 등록", "field-report", "industry", "mfg-quality", "tr-technology", "A"),
  e("I-08", "/ops/orders", "수주·납품", "orders", "industry", "mfg-orders", "tr-technology", "B"),
  e("I-09", "/ops/production", "생산", "production", "industry", "mfg-production", "tr-technology", "B"),
  e("I-10", "/ops/production/board", "설비 현황판", "equipment-board", "industry", "mfg-production", "tr-technology", "A"),
  e("I-11", "/ops/quality", "품질 현황", "quality", "industry", "mfg-quality", "tr-technology", "A"),
  e("I-12", "/ops/quality/claims", "클레임·8D", "claims", "industry", "mfg-quality", "tr-technology", "A"),
  e("I-13", "/ops/quality/claims/:claimId", "클레임 상세", "claim-detail", "industry", "mfg-quality", "tr-technology", "A"),
  e("I-14", "/ops/equipment", "설비", "equipment", "industry", "mfg-equipment", "tr-technology", "B"),
  e("I-15", "/ops/materials", "자재·재고", "materials", "industry", "mfg-materials", "tr-technology", "B"),
  e("I-16", "/ops/trace", "LOT 추적", "lot-trace", "industry", "mfg-materials", "tr-technology", "B"),
  e("I-17", "/ops/master", "기준정보", "master-data", "industry", "mfg-master-data", "tr-technology", "B"),
  e("I-18", "/company/safety", "안전보건", "safety", "industry", "safety-health", "tr-technology", "A"),
  e("I-19", "/company/safety/risk", "위험성평가", "safety-risk", "industry", "safety-health", "tr-technology", "B"),
  e("I-20", "/company/safety/review", "반기 점검", "safety-review", "industry", "safety-health", "tr-technology", "A"),
  e("A-01", "/ara", "ARA", "ara-home", "ara_settings", "ara-wellbeing", "both", "A"),
  e("A-02", "/ara/coach", "ARA와 이야기", "ara-coach", "ara_settings", "ara-wellbeing", "both", "B"),
  e("A-03", "/ara/privacy", "회사가 보는 것·못 보는 것", "ara-privacy", "ara_settings", "ara-wellbeing", "both", "C"),
  e("A-04", "/me", "내 정보", "my-profile", "ara_settings", "org-members", "both", "B"),
  e("A-05", "/me/ai", "내 AI 연결", "my-ai", "ara_settings", "ai-connect", "both", "A"),
  e("A-06", "/admin/settings", "회사 설정(Company DNA)", "admin-company", "ara_settings", "admin-settings", "both", "B"),
  e("A-07", "/admin/modules", "모듈", "admin-modules", "ara_settings", "admin-settings", "both", "A"),
  e("A-08", "/admin/theme", "브랜드·테마", "admin-theme", "ara_settings", "admin-settings", "both", "A"),
  e("A-09", "/admin/ai-policy", "AI 연결 정책", "admin-ai", "ara_settings", "ai-connect", "both", "B"),
  e("A-10", "/admin/data", "데이터 등급·권한", "admin-data", "ara_settings", "admin-settings", "both", "C"),
  e("A-11", "/admin/members", "구성원·역할", "admin-members", "ara_settings", "admin-members", "both", "A"),
  e("A-12", "/admin/audit", "감사 로그", "admin-audit", "ara_settings", "audit-log", "both", "B"),
];

/** 관리 화면은 owner·admin만(관리 모듈 권한과 별개로 PageGuard가 확인) */
export const OWNER_ADMIN_ONLY = new Set(["A-06", "A-07", "A-08", "A-09", "A-10", "A-11", "A-12"]);
/** 검토자 이상(PageGuard action="approve") */
export const APPROVE_PAGES = new Set(["W-05", "W-09"]);

/** 매개변수를 채운 예시 경로(스모크 테스트용) */
export function samplePath(entry: RouteEntry, tenant: TenantSlug): string {
  if (entry.path === "*") return "/does-not-exist";
  const params = SAMPLE_PARAMS[tenant] as Record<string, string>;
  return entry.path.replace(/:(\w+)/g, (_, k: string) => params[k] ?? k);
}
