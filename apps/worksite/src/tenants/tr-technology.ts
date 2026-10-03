// 첫 고객 (주)티알테크놀러지 데모 테넌트.
// 사실(facts)은 clients/tr-technology/company_profile.yaml의 공개 자료(L0) 값만 옮겼습니다. 지어낸 사실은 없습니다.
// 사람은 역할 표시명(예시)만, 거래처는 '예시…'만, 숫자(수량·불량·납기·가격)는 모두 예시입니다.
import type { TenantConfig } from "./types";
import { TR_TOKENS } from "@/theme/tenants";
// 이름·연락처·연혁처럼 회사를 알아볼 수 있는 값은 따로 둡니다. 공유용 빌드(--mode public)는 이 모듈을 가상 값 파일로 바꿔 끼워요(vite.config.ts)
import { trIdentity as ID } from "./tr-technology.identity";

const OPS = ["m-tr-op-a", "m-tr-op-b", "m-tr-op-c", "m-tr-op-d", "m-tr-op-e", "m-tr-op-f"];

export const trTechnology: TenantConfig = {
  slug: "tr-technology",
  tenantId: ID.tenantId,
  displayName: ID.displayName,
  legalName: ID.legalName,
  monogram: ID.monogram,
  shortName: ID.shortName,
  tagline: "자동차 부품 제조 · 생산·품질",
  isDemo: true,
  demoToday: "2026-09-30",
  seedVersion: 2,
  profile: { version: "v1.1", verifiedOn: "2026-09-28", sourceNote: "공개 자료(2016) 기준, 진단 전" },
  theme: { tokens: TR_TOKENS, density: "comfortable" },
  packs: ["manufacturing"],
  modules: { enable: ["safety-health", "approvals", "mail-connector"], disable: ["attendance-leave"] },
  // '프로젝트'는 지식노동 말이라, 거래처·사업을 함께 다루는 메뉴임이 드러나게 '사업·거래처'
  nav: { labels: { industry: "생산·품질", projects: "사업·거래처" }, mobileTabs: "manufacturing" },
  glossary: {
    platform: {},
    terms: [
      { id: "g-tr-01", term: "편조", uiLabel: "편조", aliases: ["Knit wire", "Knitting", "니팅"], definition: "금속 선재를 짜서 망(편조망)을 만드는 공정", evidence: ["WEB-TR-05"] },
      { id: "g-tr-02", term: "편조망", uiLabel: "편조망", aliases: ["Knitted Mesh", "메시", "Fine Mesh", "Medium Mesh", "Standard Mesh"], definition: "편조로 만든 망. 촘촘함에 따라 Fine/Medium/Standard 등", evidence: ["WEB-TR-05"] },
      { id: "g-tr-03", term: "편조 롤", uiLabel: "편조 롤", aliases: ["Knitted Mesh Roll"], definition: "필터 Media처럼 특정 부품을 만들기 위한 원재료 상태의 제품", evidence: ["WEB-TR-06"] },
      { id: "g-tr-04", term: "편조 부품", uiLabel: "편조 부품", aliases: ["Knitted Mesh Forming Parts", "성형품"], definition: "편조망을 압축 성형한 소음저감·충격완충·Sealing·Filter·Breather용 제품", evidence: ["WEB-TR-06"] },
      { id: "g-tr-05", term: "편조 장치", uiLabel: "편조기", aliases: ["Knitting Machine", "편조기"], definition: "편조망을 짜는 설비(화면 표기 '편조기'는 제안, 사내 호칭 확인 전)", evidence: ["WEB-TR-05"] },
      { id: "g-tr-06", term: "편조 금형", uiLabel: "편조 금형", aliases: [], definition: "편조 장치에 쓰는 금형(회사소개서 공정 그림)", evidence: ["PUB-TR-INTRO-KO#p10"] },
      { id: "g-tr-07", term: "Crimping 가공", uiLabel: "크림핑", aliases: ["크림핑"], definition: "편조망에 주름을 넣는 가공(공개 공정명)", evidence: ["WEB-TR-05"] },
      { id: "g-tr-08", term: "Pressing 가공", uiLabel: "프레스 성형", aliases: ["프레싱", "압축 성형"], definition: "편조망을 프레스로 압축 성형하는 가공", evidence: ["WEB-TR-05"] },
      { id: "g-tr-09", term: "Spiralling 가공", uiLabel: "스파이럴링", aliases: ["스파이럴링"], definition: "편조망을 나선형으로 감는 가공(공개 공정명)", evidence: ["WEB-TR-05"] },
      { id: "g-tr-10", term: "전용기", uiLabel: "전용기", aliases: [], definition: "용도는 진단에서 확인해요", evidence: ["WEB-TR-05"] },
      { id: "g-tr-11", term: "Single PPM", uiLabel: "Single PPM 목표", aliases: ["싱글 PPM"], definition: "품질 비전의 목표. 백만 개당 불량 한 자릿수로 쓰는 것이 일반적(회사 정의는 진단에서 확인)", evidence: ["WEB-TR-02"] },
      { id: "g-tr-12", term: "KD부품", uiLabel: "KD 부품", aliases: ["KD"], definition: "녹다운(현지 조립용) 부품. 2012년 중국 공급 연혁에 나옴", evidence: ["WEB-TR-03"] },
      { id: "g-tr-13", term: "Order Grade", uiLabel: "주문 재질", aliases: ["주문 사양 재질"], definition: "고객 주문에 따른 재질", evidence: ["WEB-TR-06"] },
      { id: "g-tr-14", term: "초중종물", uiLabel: "초중종물", aliases: [], definition: "작업 시작·중간·종료 시점 제품 검사", toConfirm: true },
      { id: "g-tr-15", term: "4M 변경", uiLabel: "4M 변경", aliases: [], definition: "사람·설비·재료·방법 변경과 고객 통보·승인", toConfirm: true },
      { id: "g-tr-16", term: "8D", uiLabel: "8D", aliases: [], definition: "고객 클레임 대응 8단계 보고서", toConfirm: true },
      { id: "g-tr-17", term: "LOT", uiLabel: "LOT", aliases: [], definition: "같은 조건에서 만든 생산 묶음 번호", toConfirm: true },
      { id: "g-tr-18", term: "성적서", uiLabel: "성적서", aliases: [], definition: "검사 결과서(출하 검사성적서, 원자재 제조사 검사증명서)", toConfirm: true },
      { id: "g-tr-19", term: "내시", uiLabel: "내시", aliases: [], definition: "고객의 예상 발주 물량", toConfirm: true },
      { id: "g-tr-20", term: "특채", uiLabel: "특채", aliases: [], definition: "규격을 벗어난 제품을 고객 승인으로 특별 채용", toConfirm: true },
    ],
  },
  orgUnits: [
    { id: "U_CEO", name: "대표이사", parentId: null, headMemberId: "m-tr-ceo", sortOrder: 1 },
    { id: "U_PLANT", name: "공장장", parentId: "U_CEO", headMemberId: "m-tr-plant", sortOrder: 2 },
    { id: "U_ADMIN_PUR", name: "총무/구매/경리팀", parentId: "U_PLANT", headMemberId: "m-tr-admin", sortOrder: 3 },
    { id: "U_DEV", name: "개발팀", parentId: "U_PLANT", headMemberId: "m-tr-dev", sortOrder: 4 },
    { id: "U_SALES_PROD", name: "영업/생산팀", parentId: "U_PLANT", headMemberId: "m-tr-sales", sortOrder: 5 },
    { id: "U_QA", name: "품질보증팀", parentId: "U_PLANT", headMemberId: "m-tr-qa", sortOrder: 6 },
  ],
  roles: [
    { code: "R_CEO", title: "대표이사", unitId: "U_CEO", platformRole: "owner", homePreset: "ceo", bundles: ["view_prices"], hypothesis: true },
    { code: "R_PLANT_MGR", title: "공장장", unitId: "U_PLANT", platformRole: "reviewer", homePreset: "lead", hypothesis: true },
    { code: "R_QA", title: "품질보증 담당", unitId: "U_QA", platformRole: "reviewer", homePreset: "lead", hypothesis: true },
    { code: "R_SALES_PROD", title: "영업·생산 담당", unitId: "U_SALES_PROD", platformRole: "reviewer", homePreset: "lead", bundles: ["view_prices"], hypothesis: true },
    { code: "R_ADMIN_PUR_ACC", title: "총무·구매·경리 담당", unitId: "U_ADMIN_PUR", platformRole: "admin", homePreset: "staff_admin", bundles: ["view_prices"], hypothesis: true },
    { code: "R_DEV", title: "개발 담당", unitId: "U_DEV", platformRole: "member", homePreset: "staff", hypothesis: true },
    { code: "R_OPERATOR", title: "생산 작업자", unitId: "U_SALES_PROD", platformRole: "member", homePreset: "staff", mobileFirst: true, hypothesis: true },
  ],
  people: [
    { id: "m-tr-ceo", displayName: "대표(예시)", roleCode: "R_CEO", unitId: "U_CEO", jobTitle: "대표이사", duties: "경영 총괄", email: "tr.ceo@example.com", phoneWork: "000-0000-0101", persona: true },
    { id: "m-tr-plant", displayName: "공장장(예시)", roleCode: "R_PLANT_MGR", unitId: "U_PLANT", jobTitle: "공장장", duties: "생산·품질·설비 총괄", email: "tr.plant@example.com", phoneWork: "000-0000-0102", persona: true },
    { id: "m-tr-qa", displayName: "품질보증 담당 A(예시)", roleCode: "R_QA", unitId: "U_QA", jobTitle: "품질보증 담당", duties: "검사·클레임·8D·계측기", email: "tr.qa@example.com", phoneWork: "000-0000-0103", persona: true },
    { id: "m-tr-sales", displayName: "영업·생산 담당 A(예시)", roleCode: "R_SALES_PROD", unitId: "U_SALES_PROD", jobTitle: "영업·생산 담당", duties: "수주·납기·생산 계획", email: "tr.sales@example.com", phoneWork: "000-0000-0104", persona: true },
    { id: "m-tr-admin", displayName: "총무·구매·경리 담당 A(예시)", roleCode: "R_ADMIN_PUR_ACC", unitId: "U_ADMIN_PUR", jobTitle: "총무·구매·경리 담당", duties: "구매·자재·안전보건 서류", email: "tr.admin@example.com", phoneWork: "000-0000-0105", persona: true },
    { id: "m-tr-dev", displayName: "개발 담당 A(예시)", roleCode: "R_DEV", unitId: "U_DEV", jobTitle: "개발 담당", duties: "신규 품목 개발·4M 변경", email: "tr.dev@example.com", phoneWork: "000-0000-0106", persona: true },
    ...OPS.map((id, i) => ({
      id,
      displayName: `생산 작업자 ${"ABCDEF"[i]}(예시)`,
      roleCode: "R_OPERATOR",
      unitId: "U_SALES_PROD",
      jobTitle: "생산 작업자",
      duties: "편조·가공 작업",
      email: `tr.op${"abcdef"[i]}@example.com`,
      phoneWork: `000-0000-01${11 + i}`,
      persona: i === 0,
    })),
  ],
  defaultPersona: "R_PLANT_MGR",
  permissionBundles: { view_prices: ["R_CEO", "R_SALES_PROD", "R_ADMIN_PUR_ACC"] },
  home: {
    byRoleCode: { R_OPERATOR: ["greeting", "mfg-field-report", "my-tasks", "notices", "ara-card"] },
    byUnit: {
      U_CEO: ["greeting", "mfg-delivery-due", "mfg-quality-ppm", "mfg-claims-8d", "safety-status", "mfg-monthly-summary", "review-queue", "mfg-material-price"],
      // 첫 파일럿이 품질 먼저(Single PPM·클레임·8D)라 공장장 홈에도 클레임·8D를 둬요(검토자로 승인하는 사람)
      U_PLANT: ["greeting", "mfg-production-today", "mfg-equipment-status", "mfg-claims-8d", "mfg-field-feed", "review-queue", "mfg-delivery-due", "mfg-legal-calendar"],
      U_QA: ["greeting", "mfg-claims-8d", "mfg-inspection-queue", "mfg-first-mid-last", "mfg-quality-ppm", "mfg-4m-changes", "mfg-calibration-due", "my-tasks"],
      U_SALES_PROD: ["greeting", "mfg-delivery-due", "mfg-order-backlog", "mfg-production-today", "mfg-material-alert", "mail-followups", "my-tasks"],
      U_ADMIN_PUR: ["greeting", "mfg-material-alert", "mfg-legal-calendar", "safety-status", "approvals-pending", "attendance-today", "admin-health", "mfg-material-price"],
      U_DEV: ["greeting", "mfg-dev-projects", "mfg-4m-changes", "my-tasks", "upcoming-meetings", "mfg-pm-due", "recent-decisions"],
    },
    hidden: ["ara-aggregate"],
  },
  // 단계별 도입: 첫 파일럿은 품질·현장 등록부터(1차 파일럿 범위). 화면 7개만 열고, 홈은 '승인만 하면 되는 화면'으로 시작해요.
  // 다른 모듈·데이터는 켜 둔 채 메뉴만 숨겨요 — 회사 설정 › 모듈 › 도입 단계에서 '전체'로 한 번에 넓힐 수 있어요
  rollout: {
    defaultStage: "phase1",
    phase1: {
      navKeys: ["work-list", "work-review", "meetings", "meeting-inbox", "field-report", "quality", "claims"],
      home: {
        byRoleCode: { R_OPERATOR: ["greeting", "mfg-field-report", "my-tasks"] },
        byUnit: {
          U_CEO: ["greeting", "approval-inbox", "mfg-quality-ppm", "mfg-claims-8d"],
          U_PLANT: ["greeting", "approval-inbox", "mfg-field-feed", "mfg-claims-8d"],
          // 승인할 일이 적은 역할은 자기 일을 앞에, 승인 대기는 그 아래(빈 카드가 첫 줄을 차지하지 않게)
          U_QA: ["greeting", "mfg-claims-8d", "approval-inbox", "mfg-quality-ppm"],
          U_SALES_PROD: ["greeting", "my-tasks", "approval-inbox"],
          U_ADMIN_PUR: ["greeting", "my-tasks", "approval-inbox"],
          U_DEV: ["greeting", "my-tasks", "returned-submissions"],
        },
      },
    },
  },
  // 현장 등록 추천 담당(가설 — 진단 때 회사 규칙으로 바꿔요): 공장장 홈에 모이고, 한 번 눌러 추천 담당에게 배정
  routing: {
    fieldReportByKind: { defect: "R_QA", equipment: "R_PLANT_MGR", near_miss: "R_ADMIN_PUR_ACC", other: "R_ADMIN_PUR_ACC" },
    fieldReportDispatcher: "R_PLANT_MGR",
  },
  businessStructure: [
    {
      id: "bl-tr-mass", code: "MASS", name: "양산·납품", description: "양산 품목의 수주·생산·출하(가설)", ownerMemberId: "m-tr-plant", hypothesis: true,
      projects: [
        { id: "prj-tr-mass-exh", code: "MASS-EXH", name: "예시배기시스템 양산 대응", partnerId: "p-tr-exh", ownerMemberId: "m-tr-sales", reviewerMemberId: "m-tr-plant", memberIds: ["m-tr-sales", "m-tr-plant", "m-tr-qa", ...OPS], startOn: "2026-07-01", dueOn: "2026-12-31", status: "active", health: "warning", sensitivity: "L1", description: "배기계 편조 부품 양산 수주·납기 대응(예시)", parts: [] },
        { id: "prj-tr-mass-saf", code: "MASS-SAF", name: "예시세이프티 에어백 필터 양산 대응", partnerId: "p-tr-saf", ownerMemberId: "m-tr-sales", reviewerMemberId: "m-tr-plant", memberIds: ["m-tr-sales", "m-tr-plant", "m-tr-qa", ...OPS], startOn: "2026-07-01", dueOn: "2026-12-31", status: "active", health: "good", sensitivity: "L1", description: "에어백 필터 양산 대응(예시)", parts: [] },
        { id: "prj-tr-mass-flt", code: "MASS-FLT", name: "예시필터 편조 롤 공급", partnerId: "p-tr-flt", ownerMemberId: "m-tr-sales", reviewerMemberId: "m-tr-plant", memberIds: ["m-tr-sales", "m-tr-plant", "m-tr-qa", ...OPS], startOn: "2026-07-01", dueOn: "2026-12-31", status: "active", health: "good", sensitivity: "L1", description: "필터 Media용 편조 롤 공급(예시)", parts: [] },
      ],
    },
    {
      id: "bl-tr-dev", code: "DEV", name: "신규 품목 개발", description: "신규 품목 개발과 초품 승인(가설)", ownerMemberId: "m-tr-dev", hypothesis: true,
      projects: [
        { id: "prj-tr-dev-dr", code: "DEV-2026-01", name: "디커플링 링 신규 품목 개발", partnerId: "p-tr-exh", ownerMemberId: "m-tr-dev", reviewerMemberId: "m-tr-plant", memberIds: ["m-tr-dev", "m-tr-plant", "m-tr-qa"], startOn: "2026-08-01", dueOn: "2026-12-15", status: "active", health: "warning", sensitivity: "L2", description: "배기 디커플링 링 신규 품목 개발", parts: [] },
      ],
    },
    {
      id: "bl-tr-qual", code: "QUAL", name: "품질 개선", description: "Single PPM 활동과 클레임 대응(가설)", ownerMemberId: "m-tr-qa", hypothesis: true,
      projects: [
        { id: "prj-tr-qual-ppm", code: "QUAL-PPM-26H2", name: "Single PPM 활동 2026 하반기", ownerMemberId: "m-tr-qa", reviewerMemberId: "m-tr-plant", memberIds: ["m-tr-qa", "m-tr-plant", "m-tr-sales"], startOn: "2026-07-01", dueOn: "2026-12-31", status: "active", health: "warning", sensitivity: "L1", description: "고객 PPM을 목표(Single PPM)로 낮추는 활동(예시)", parts: [] },
        { id: "prj-tr-qual-clm", code: "QUAL-CLM-2026-03", name: "클레임 CL-2026-03 대응", partnerId: "p-tr-exh", ownerMemberId: "m-tr-qa", reviewerMemberId: "m-tr-plant", memberIds: ["m-tr-qa", "m-tr-plant", "m-tr-sales"], startOn: "2026-09-18", dueOn: "2026-10-31", status: "active", health: "critical", sensitivity: "L2", description: "고객 클레임 CL-2026-03의 8D 대응", parts: [] },
      ],
    },
    {
      id: "bl-tr-safe", code: "SAFE", name: "안전보건", description: "법정 안전보건 일정과 점검(가설)", ownerMemberId: "m-tr-admin", hypothesis: true,
      projects: [
        { id: "prj-tr-safe-h2", code: "SAFE-2026-H2", name: "2026 하반기 반기 점검", ownerMemberId: "m-tr-admin", reviewerMemberId: "m-tr-ceo", memberIds: ["m-tr-admin", "m-tr-ceo", "m-tr-plant", ...OPS], startOn: "2026-07-01", dueOn: "2026-10-14", status: "active", health: "warning", sensitivity: "L1", description: "중대재해처벌법 시행령 반기 점검 증빙 정리(예시)", parts: [] },
        { id: "prj-tr-safe-press", code: "SAFE-PRESS", name: "프레스 안전검사 대응", ownerMemberId: "m-tr-plant", reviewerMemberId: "m-tr-ceo", memberIds: ["m-tr-plant", "m-tr-admin", "m-tr-ceo"], startOn: "2026-09-01", dueOn: "2026-11-30", status: "active", health: "good", sensitivity: "L1", description: "프레스 안전검사 일정·서류 대응(예시)", parts: [] },
      ],
    },
    {
      id: "bl-tr-ax", code: "AX", name: "AX 업무사이트", description: "업무사이트 파일럿(가설)", ownerMemberId: "m-tr-ceo", hypothesis: true,
      projects: [
        { id: "prj-tr-ax-pilot", code: "AX-PILOT-1", name: "업무사이트 1차 파일럿", ownerMemberId: "m-tr-admin", reviewerMemberId: "m-tr-ceo", memberIds: ["m-tr-admin", "m-tr-ceo", "m-tr-plant", "m-tr-qa"], startOn: "2026-10-01", dueOn: "2026-12-15", status: "planned", health: "good", sensitivity: "L1", description: "품질·현장 등록·설비·안전보건 1차 파일럿(예시)", parts: [] },
      ],
    },
  ],
  partners: [
    { id: "p-tr-exh", kind: "customer", name: "예시배기시스템(주)", status: "active", ownerMemberId: "m-tr-sales", tags: ["배기계", "양산"] },
    { id: "p-tr-saf", kind: "customer", name: "예시세이프티(주)", status: "active", ownerMemberId: "m-tr-sales", tags: ["에어백 필터", "양산"] },
    { id: "p-tr-pwt", kind: "customer", name: "예시파워트레인(주)", status: "active", ownerMemberId: "m-tr-sales", tags: ["엔진 브리더"] },
    { id: "p-tr-thm", kind: "customer", name: "예시써멀(주)", status: "active", ownerMemberId: "m-tr-sales", tags: ["차열 부품"] },
    { id: "p-tr-flt", kind: "customer", name: "예시필터(주)", status: "active", ownerMemberId: "m-tr-sales", tags: ["편조 롤"] },
    { id: "p-tr-ele", kind: "customer", name: "예시전자(주)", status: "prospect", ownerMemberId: "m-tr-sales", tags: ["EMI 가스켓"] },
    { id: "p-tr-wire", kind: "supplier", name: "예시선재(주)", status: "active", ownerMemberId: "m-tr-admin", tags: ["스테인리스 선재"] },
    { id: "p-tr-nfe", kind: "supplier", name: "예시비철(주)", status: "active", ownerMemberId: "m-tr-admin", tags: ["비철 선재"] },
    { id: "p-tr-pack", kind: "supplier", name: "예시포장(주)", status: "active", ownerMemberId: "m-tr-admin", tags: ["포장재"] },
    { id: "p-tr-prec", kind: "vendor", name: "예시정밀(주)", status: "active", ownerMemberId: "m-tr-plant", tags: ["외주 가공"] },
    { id: "p-tr-cal", kind: "agency", name: "예시교정센터", status: "active", ownerMemberId: "m-tr-qa", tags: ["계측기 검교정"] },
  ],
  facts: {
    overview: ID.overview,
    vision: ID.vision,
    history: ID.history,
    certifications: [
      { name: "ISO 9001", stated: "2015년 5월 품질시스템 구축(연혁)", currentStatus: "확인 필요" },
      { name: "ISO 14001", stated: "품질방침에 'ISO9001/14001 품질환경시스템' 언급", currentStatus: "확인 필요" },
      { name: "IATF 16949", stated: "품질방침에 'ISO TS16949 인증 등 품질보증 시스템 구축(예정)'(2016년 기준)", currentStatus: "확인 필요" },
    ],
    processes: ["편조(Knit wire): Fine · Medium · Standard mesh", "가공: 크림핑(Crimping) · 프레스 성형(Pressing) · 스파이럴링(Spiralling)"],
    productCategories: [
      "에어백 필터", "스페이서 링·에어 갭 실", "사일런서·머플러 패킹", "분리 링(Separation ring)", "촉매 컨버터 메시 랩",
      "촉매 컨버터 실", "배기 디커플링 링·메시 벨로우즈 슬리브", "방진·흡음·차열 부품", "엔진 브리더·오일 분리·오일 필터 캡 필터",
      "편조 롤(Knitted Mesh Roll)", "EMI 차폐 가스켓",
    ],
    materialGrades: ["스테인리스 304", "스테인리스 316", "스테인리스 321", "스테인리스 310S", "구리(Copper)", "알루미늄(Aluminium)", "황동(Brass)", "주석 도금 구리(Tinned Copper)", "주문 재질(Order Grade)"],
    equipmentPublic: [
      { kind: "편조 장치(Knitting Machine)", countPublic: 36, note: "홈페이지 36대, 회사소개서(2016) 57대. 현재 값은 진단에서 확인" },
      { kind: "프레스 50ton", countPublic: 1 },
      { kind: "프레스 20ton", countPublic: 1 },
      { kind: "프레스 10ton", countPublic: 3 },
      { kind: "전용기", countPublic: 4 },
      { kind: "롤링기", countPublic: 3 },
      { kind: "절단기", countPublic: 2 },
      { kind: "스포트기", countPublic: 2, note: "회사소개서(2016)에만 있음" },
    ],
    dataClasses: [
      { level: "L0", meaning: "공개 정보", examples: ["홈페이지·회사소개서 공개 내용", "공개 제품 카테고리·재질", "브랜드 색", "데모 데이터(가상)"], storage: "CRATA 저장소", aiRoute: "해외 AI 허용(학습 미사용 계약)" },
      { level: "L1", meaning: "내부 업무 기록", examples: ["생산 실적·설비 점검·검사 기록", "현장 등록(사진 포함)", "직원·거래처 담당자 성명·연락처"], storage: "CRATA 저장소(처리방침에 국외이전 공개)", aiRoute: "고지·동의 후 학습 미사용 계약 해외 AI 허용" },
      { level: "L2", meaning: "고객 비밀·핵심 노하우", examples: ["고객 도면·사양·검사기준", "고객 품번", "단가·수주 금액", "클레임 원문·8D·4M 서류", "작업표준·편조 조건표"], storage: "국내 저장소가 정본", aiRoute: "국내(서울 리전) 경로만. 개통 전에는 L2 AI 기능을 꺼요" },
      { level: "L3", meaning: "해당 없음", examples: [], storage: "보관하지 않음", aiRoute: "처리하지 않음" },
    ],
    hypotheses: [
      { label: "한 줄 소개: 편조 롤·편조 성형 부품을 만드는 자동차 부품 회사", confidence: 0.9 },
      { label: "브랜드 색: 홈페이지 로고 남색 근사값", confidence: 0.6 },
      { label: "반기 안전 점검 대상(상시 5명 이상일 때)", confidence: 0.6 },
      { label: "공정 흐름: 편조 → 가공(입고·검사·출하 단계는 가설)", confidence: 0.5 },
      { label: "현장 등록 → 담당 배정 → 조치 흐름", confidence: 0.5 },
      { label: "주요 고객층: 1차 협력사·필터 제조사 등", confidence: 0.4 },
      { label: "클레임 → 8D 흐름", confidence: 0.3 },
      { label: "4M 변경 → 고객 통보·승인 흐름", confidence: 0.3 },
      { label: "발주 수신 → 출하 흐름", confidence: 0.3 },
    ],
    cadences: [
      { name: "반기 안전 점검", rule: "6개월마다", basis: "중대재해처벌법 시행령 제4조·제5조(상시 5명 이상)" },
      { name: "위험성평가 정기평가", rule: "매년", basis: "산업안전보건법 시행규칙 제37조(2026-06-01 시행)" },
      { name: "프레스 등 안전검사", rule: "설치 후 3년 안 최초, 이후 2년마다", basis: "산업안전보건법 시행규칙 제126조" },
    ],
    todo: [
      "현재 상시근로자 수와 조직 인원은 진단에서 확인해요(공개 값은 2016년 13명).",
      "인증의 현재 상태는 진단에서 확인해요.",
      "ERP·그룹웨어·메일 사용 현황은 진단에서 확인해요.",
    ],
    sources: ID.sources,
  },
  policies: { aggregateMinN: 10, teamMinN: 5, mcpEnabled: true, mailPreview: true, approvalsPreview: true },
};
