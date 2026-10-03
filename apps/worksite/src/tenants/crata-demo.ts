// CRATA 자신(내부 적용 가안) 데모 테넌트.
// 사업 구조 코드는 config/meeting_taxonomy.yaml(EDU·SSI·ARA·CORE). 사람은 옛이야기 인물 이름(누가 봐도 가상)만 씁니다.
// 회사 소개(주소·연혁·인증)는 CRATA Company DNA를 만든 뒤 채웁니다. 지어내지 않습니다.
// 학생 데이터 없음: 학맞통은 기관·연수·정책·서식 업무만 다룹니다.
import type { TenantConfig } from "./types";
import { CRATA_TOKENS } from "@/theme/tenants";

export const crataDemo: TenantConfig = {
  slug: "crata-demo",
  tenantId: "crata-demo",
  displayName: "CRATA",
  monogram: "CR",
  shortName: "CRATA",
  tagline: "교육·컨설팅 · 사업 4개",
  isDemo: true,
  demoToday: "2026-09-30",
  seedVersion: 2,
  profile: { version: "v0", verifiedOn: "2026-09-28", sourceNote: "CRATA Company DNA 작성 전 가안이에요" },
  theme: { tokens: CRATA_TOKENS, density: "comfortable" },
  packs: ["education_consulting"],
  modules: { enable: ["approvals", "mail-connector"], disable: ["edu-programs", "attendance-leave", "safety-health"] },
  nav: { labels: { industry: "영업·교육" }, mobileTabs: "default" },
  glossary: {
    platform: {},
    terms: [
      { id: "g-cr-01", term: "강의·워크샵", uiLabel: "강의·워크샵", aliases: ["워크숍", "세미나", "교육과정"], definition: "기업·학교·교사 대상 AI 강의·워크샵·연수의 수주, 기획, 운영, 사후관리(사업 코드 EDU)" },
      { id: "g-cr-02", term: "학맞통", uiLabel: "학맞통", aliases: ["학맞", "학생맞춤", "학생맞춤통합지원"], definition: "학생맞춤통합지원법 관련 기관 대상 컨설팅·연수·서식 개발(사업 코드 SSI, 학생 비식별 전제)" },
      { id: "g-cr-03", term: "아라", uiLabel: "아라", aliases: ["ARA", "아라 에이전트"], definition: "CRATA 자체 AI 에이전트 '아라'의 기획·개발·운영(사업 코드 ARA)" },
      { id: "g-cr-04", term: "공통·경영", uiLabel: "공통", aliases: [], definition: "특정 사업부에 속하지 않는 회사 운영 전반(사업 코드 CORE)" },
      { id: "g-cr-05", term: "크라타", uiLabel: "CRATA", aliases: ["CRATA"], definition: "회사 표기" },
      { id: "g-cr-06", term: "플라우드", uiLabel: "Plaud", aliases: ["Plaud"], definition: "회의 녹음 기기·서비스(회의 기록은 기존 도구에 둠)" },
    ],
  },
  orgUnits: [
    { id: "U_CEO", name: "대표", parentId: null, headMemberId: "m-cr-ceo", sortOrder: 1 },
    { id: "U_EDU", name: "강의·워크샵", parentId: "U_CEO", headMemberId: "m-cr-edu-lead", sortOrder: 2 },
    { id: "U_SSI", name: "학맞통", parentId: "U_CEO", headMemberId: "m-cr-ssi-lead", sortOrder: 3 },
    { id: "U_ARA", name: "아라 개발", parentId: "U_CEO", headMemberId: "m-cr-ara-lead", sortOrder: 4 },
    { id: "U_OPS", name: "경영지원(가안)", parentId: "U_CEO", headMemberId: "m-cr-ops", sortOrder: 5 },
  ],
  roles: [
    { code: "R_CEO", title: "대표", unitId: "U_CEO", platformRole: "owner", homePreset: "ceo", bundles: ["view_prices"], hypothesis: true },
    { code: "R_OPS_ADMIN", title: "경영지원 담당", unitId: "U_OPS", platformRole: "admin", homePreset: "staff_admin", hypothesis: true },
    { code: "R_EDU_LEAD", title: "강의·워크샵 리드", unitId: "U_EDU", platformRole: "reviewer", homePreset: "lead", bundles: ["view_prices"], hypothesis: true },
    { code: "R_EDU_STAFF", title: "강의 운영 담당", unitId: "U_EDU", platformRole: "member", homePreset: "staff", hypothesis: true },
    { code: "R_SSI_LEAD", title: "학맞통 리드", unitId: "U_SSI", platformRole: "reviewer", homePreset: "lead", hypothesis: true },
    { code: "R_ARA_LEAD", title: "아라 개발 리드", unitId: "U_ARA", platformRole: "reviewer", homePreset: "lead", hypothesis: true },
    { code: "R_ARA_DEV", title: "아라 개발 담당", unitId: "U_ARA", platformRole: "member", homePreset: "staff", hypothesis: true },
  ],
  people: [
    { id: "m-cr-ceo", displayName: "홍길동", roleCode: "R_CEO", unitId: "U_CEO", jobTitle: "대표", duties: "경영 총괄·영업", email: "cr.ceo@example.com", phoneWork: "000-0000-0201", persona: true },
    { id: "m-cr-ops", displayName: "심청", roleCode: "R_OPS_ADMIN", unitId: "U_OPS", jobTitle: "경영지원 담당", duties: "총무·계약·사내 AX", email: "cr.ops@example.com", phoneWork: "000-0000-0202", persona: true },
    { id: "m-cr-edu-lead", displayName: "성춘향", roleCode: "R_EDU_LEAD", unitId: "U_EDU", jobTitle: "강의·워크샵 리드", duties: "과정 기획·제안·검토", email: "cr.edu.lead@example.com", phoneWork: "000-0000-0203", persona: true },
    { id: "m-cr-edu-1", displayName: "이몽룡", roleCode: "R_EDU_STAFF", unitId: "U_EDU", jobTitle: "강의 운영 담당", duties: "교안·운영·정산", email: "cr.edu1@example.com", phoneWork: "000-0000-0204", persona: true },
    { id: "m-cr-ssi-lead", displayName: "박흥부", roleCode: "R_SSI_LEAD", unitId: "U_SSI", jobTitle: "학맞통 리드", duties: "기관 협의·연수·서식", email: "cr.ssi.lead@example.com", phoneWork: "000-0000-0205", persona: true },
    { id: "m-cr-ara-lead", displayName: "전우치", roleCode: "R_ARA_LEAD", unitId: "U_ARA", jobTitle: "아라 개발 리드", duties: "제품 기획·회의 파이프라인", email: "cr.ara.lead@example.com", phoneWork: "000-0000-0206", persona: true },
    { id: "m-cr-ara-1", displayName: "김선달", roleCode: "R_ARA_DEV", unitId: "U_ARA", jobTitle: "아라 개발 담당", duties: "대화 설계·백엔드", email: "cr.ara1@example.com", phoneWork: "000-0000-0207", persona: true },
  ],
  defaultPersona: "R_EDU_LEAD",
  permissionBundles: { view_prices: ["R_CEO", "R_EDU_LEAD"] },
  home: { hidden: ["ara-aggregate"] },
  // 단계별 도입(CRATA는 이미 다 쓰고 있어서 '전체'로 시작). 1단계로 바꾸면 업무·회의·문서 6개 화면만 남아요
  rollout: {
    defaultStage: "full",
    phase1: {
      navKeys: ["work-list", "work-review", "meetings", "meeting-inbox", "docs", "correction-rules"],
      home: {
        byPreset: {
          ceo: ["greeting", "approval-inbox", "project-health", "recent-decisions"],
          lead: ["greeting", "approval-inbox", "my-tasks", "upcoming-meetings"],
          staff_admin: ["greeting", "approval-inbox", "my-tasks"],
          staff: ["greeting", "my-tasks", "returned-submissions", "upcoming-meetings"],
        },
      },
    },
  },
  businessStructure: [
    {
      id: "bl-cr-edu", code: "EDU", name: "강의·워크샵", description: "기업·학교·교사 대상 AI 강의·워크샵·연수의 수주, 기획, 운영, 사후관리", ownerMemberId: "m-cr-edu-lead",
      projects: [
        { id: "prj-cr-edu-a", code: "EDU-2026-A", name: "예시기업 임원 생성형 AI 특강", partnerId: "p-cr-corp", ownerMemberId: "m-cr-edu-1", reviewerMemberId: "m-cr-edu-lead", memberIds: ["m-cr-edu-1", "m-cr-edu-lead", "m-cr-ceo"], startOn: "2026-09-01", dueOn: "2026-10-31", status: "active", health: "good", sensitivity: "L1", description: "임원 대상 생성형 AI 특강 기획·운영(예시)",
          parts: [
            { id: "part-cr-edu-a-1", name: "교안", leadMemberId: "m-cr-edu-1", memberIds: ["m-cr-edu-1", "m-cr-edu-lead"] },
            { id: "part-cr-edu-a-2", name: "운영", leadMemberId: "m-cr-edu-1", memberIds: ["m-cr-edu-1"] },
            { id: "part-cr-edu-a-3", name: "정산", leadMemberId: "m-cr-edu-lead", memberIds: ["m-cr-edu-lead", "m-cr-edu-1"] },
          ] },
        { id: "prj-cr-edu-b", code: "EDU-2026-B", name: "예시고 교사 AI 활용 연수", partnerId: "p-cr-school", ownerMemberId: "m-cr-edu-1", reviewerMemberId: "m-cr-edu-lead", memberIds: ["m-cr-edu-1", "m-cr-edu-lead"], startOn: "2026-08-15", dueOn: "2026-11-30", status: "active", health: "warning", sensitivity: "L1", description: "교사 대상 AI 활용 연수 운영(예시)",
          parts: [
            { id: "part-cr-edu-b-1", name: "교안", leadMemberId: "m-cr-edu-1", memberIds: ["m-cr-edu-1", "m-cr-edu-lead"] },
            { id: "part-cr-edu-b-2", name: "운영", leadMemberId: "m-cr-edu-1", memberIds: ["m-cr-edu-1"] },
          ] },
        { id: "prj-cr-edu-content", code: "EDU-CONTENT", name: "공통 강의 콘텐츠·교안", ownerMemberId: "m-cr-edu-lead", reviewerMemberId: "m-cr-ceo", memberIds: ["m-cr-edu-lead", "m-cr-ceo", "m-cr-edu-1"], startOn: "2026-07-01", dueOn: "2026-12-31", status: "active", health: "good", sensitivity: "L1", description: "특정 고객과 무관한 표준 교안·실습 자료 개발",
          parts: [
            { id: "part-cr-edu-c-1", name: "표준 교안", leadMemberId: "m-cr-edu-lead", memberIds: ["m-cr-edu-lead", "m-cr-edu-1"] },
            { id: "part-cr-edu-c-2", name: "실습 예제", leadMemberId: "m-cr-edu-1", memberIds: ["m-cr-edu-1"] },
          ] },
      ],
    },
    {
      id: "bl-cr-ssi", code: "SSI", name: "학맞통", description: "학생맞춤통합지원법 관련 기관 대상 컨설팅·연수·서식·도구 개발(학생 비식별 전제)", ownerMemberId: "m-cr-ssi-lead",
      projects: [
        { id: "prj-cr-ssi-a", code: "SSI-2026-A", name: "예시교육지원청 관리자 연수 커리큘럼", partnerId: "p-cr-edu-office", ownerMemberId: "m-cr-ssi-lead", reviewerMemberId: "m-cr-ceo", memberIds: ["m-cr-ssi-lead", "m-cr-ceo"], startOn: "2026-09-01", dueOn: "2026-12-15", status: "active", health: "good", sensitivity: "L2", description: "기관 관리자 연수 커리큘럼 설계(기관 협의 자료라 고객 비밀)",
          parts: [
            { id: "part-cr-ssi-a-1", name: "커리큘럼", leadMemberId: "m-cr-ssi-lead", memberIds: ["m-cr-ssi-lead"] },
            { id: "part-cr-ssi-a-2", name: "서식", leadMemberId: "m-cr-ssi-lead", memberIds: ["m-cr-ssi-lead"] },
          ] },
        { id: "prj-cr-ssi-research", code: "SSI-RESEARCH", name: "학맞통 법령·정책 리서치", ownerMemberId: "m-cr-ssi-lead", reviewerMemberId: "m-cr-ceo", memberIds: ["m-cr-ssi-lead", "m-cr-ceo"], startOn: "2026-07-01", dueOn: "2026-12-31", status: "active", health: "good", sensitivity: "L1", description: "특정 기관과 무관한 법령·지침 정리",
          parts: [
            { id: "part-cr-ssi-r-1", name: "법령", leadMemberId: "m-cr-ssi-lead", memberIds: ["m-cr-ssi-lead"] },
            { id: "part-cr-ssi-r-2", name: "기관 운영 사례", leadMemberId: "m-cr-ssi-lead", memberIds: ["m-cr-ssi-lead"] },
          ] },
      ],
    },
    {
      id: "bl-cr-ara", code: "ARA", name: "아라 개발", description: "CRATA 자체 AI 에이전트 '아라'의 기획·개발·운영", ownerMemberId: "m-cr-ara-lead",
      projects: [
        { id: "prj-cr-ara-core", code: "ARA-CORE", name: "아라 제품 본체", ownerMemberId: "m-cr-ara-1", reviewerMemberId: "m-cr-ara-lead", memberIds: ["m-cr-ara-1", "m-cr-ara-lead"], startOn: "2026-07-01", dueOn: "2026-12-31", status: "active", health: "warning", sensitivity: "L1", description: "제품 기능 개발·운영 전반",
          parts: [
            { id: "part-cr-ara-1", name: "대화 설계", leadMemberId: "m-cr-ara-lead", memberIds: ["m-cr-ara-lead", "m-cr-ara-1"] },
            { id: "part-cr-ara-2", name: "백엔드", leadMemberId: "m-cr-ara-1", memberIds: ["m-cr-ara-1"] },
            { id: "part-cr-ara-3", name: "평가", leadMemberId: "m-cr-ara-lead", memberIds: ["m-cr-ara-lead"] },
          ] },
        { id: "prj-cr-ara-pipeline", code: "ARA-MEETING-PIPELINE", name: "회의 자동 분류 파이프라인", ownerMemberId: "m-cr-ara-lead", reviewerMemberId: "m-cr-ceo", memberIds: ["m-cr-ara-lead", "m-cr-ceo", "m-cr-ara-1"], startOn: "2026-08-01", dueOn: "2026-11-30", status: "active", health: "good", sensitivity: "L1", description: "회의 녹음 분류 체계와 연동",
          parts: [
            { id: "part-cr-pipe-1", name: "분류 체계", leadMemberId: "m-cr-ara-lead", memberIds: ["m-cr-ara-lead"] },
            { id: "part-cr-pipe-2", name: "연동", leadMemberId: "m-cr-ara-1", memberIds: ["m-cr-ara-1"] },
          ] },
      ],
    },
    {
      id: "bl-cr-core", code: "CORE", name: "공통", description: "특정 사업부에 속하지 않는 회사 운영 전반", ownerMemberId: "m-cr-ceo",
      projects: [
        { id: "prj-cr-core-general", code: "CORE-GENERAL", name: "회사 운영 일반", ownerMemberId: "m-cr-ops", reviewerMemberId: "m-cr-ceo", memberIds: ["m-cr-ops", "m-cr-ceo", "m-cr-edu-lead", "m-cr-edu-1", "m-cr-ssi-lead", "m-cr-ara-lead", "m-cr-ara-1"], startOn: "2026-07-01", dueOn: "2026-12-31", status: "active", health: "good", sensitivity: "L1", description: "프로젝트 단위로 나누지 않는 운영 업무", parts: [] },
        { id: "prj-cr-core-ax", code: "CORE-INTERNAL-AX", name: "사내 AX: 워크사이트 내부 적용", ownerMemberId: "m-cr-ops", reviewerMemberId: "m-cr-ceo", memberIds: ["m-cr-ops", "m-cr-ceo", "m-cr-ara-lead"], startOn: "2026-09-15", dueOn: "2026-12-31", status: "active", health: "good", sensitivity: "L1", description: "업무사이트를 CRATA 안에 먼저 적용",
          parts: [
            { id: "part-cr-ax-1", name: "설정", leadMemberId: "m-cr-ops", memberIds: ["m-cr-ops"] },
            { id: "part-cr-ax-2", name: "교육", leadMemberId: "m-cr-ops", memberIds: ["m-cr-ops", "m-cr-ceo"] },
          ] },
      ],
    },
  ],
  partners: [
    { id: "p-cr-corp", kind: "customer", name: "예시기업(주)", status: "active", ownerMemberId: "m-cr-edu-lead", tags: ["기업 교육"] },
    { id: "p-cr-school", kind: "customer", name: "예시고등학교", status: "active", ownerMemberId: "m-cr-edu-lead", tags: ["교사 연수"] },
    { id: "p-cr-edu-office", kind: "agency", name: "예시교육지원청", status: "active", ownerMemberId: "m-cr-ssi-lead", tags: ["학맞통", "기관"] },
    { id: "p-cr-found", kind: "customer", name: "예시재단", status: "prospect", ownerMemberId: "m-cr-ceo", tags: ["워크숍"] },
    { id: "p-cr-design", kind: "vendor", name: "예시디자인", status: "active", ownerMemberId: "m-cr-ops", tags: ["교안 디자인"] },
  ],
  facts: {
    overview: [
      { label: "표시명", value: "CRATA" },
      { label: "사업", value: "강의·워크샵 · 학맞통 · 아라 개발 · 공통(사업 코드 EDU·SSI·ARA·CORE)" },
      { label: "업종 팩", value: "교육·컨설팅(가안)" },
    ],
    dataClasses: [
      { level: "L0", meaning: "공개·내부 일반 정보", examples: ["공개 자료", "데모 데이터(가상)"], storage: "Notion/Drive", aiRoute: "해외 AI 허용(학습 미사용 계약)" },
      { level: "L1", meaning: "일반 영업·고객 미팅, 성명·연락처 수준 개인정보(강의·워크샵 기본값)", examples: ["고객 미팅 기록", "교안", "담당자 연락처"], storage: "Notion/Drive(처리방침에 국외이전 공개)", aiRoute: "고지·동의 후 학습 미사용 계약 해외 AI 허용, 외부인 연락처는 가림" },
      { level: "L2", meaning: "고객 비밀·견적·계약 조건·기관 협의", examples: ["견적·계약 조건", "학맞통 기관 협의(학생 비식별 전제)", "고객 진단 자료"], storage: "국내 저장소가 정본", aiRoute: "국내(서울 리전) 경로만" },
      { level: "L3", meaning: "학생 식별 정보·상담 내용", examples: [], storage: "저장하지 않음", aiRoute: "처리하지 않음" },
    ],
    hypotheses: [
      { label: "조직·역할 7개(내부 적용 가안)", confidence: 0.5 },
      { label: "사업 구조 4개(회의 분류 체계 v0.2 기준)", confidence: 0.8 },
      { label: "브랜드 색: 딥 틸(CI 확정 전 가안)", confidence: 0.3 },
    ],
    cadences: [],
    todo: [
      "회사 소개(주소·연혁·인증·연락처)는 CRATA Company DNA를 만든 뒤 채워요.",
      "브랜드 색은 CI가 정해지면 바꿔요. 지금은 딥 틸 가안이에요.",
      "회의·보고 주기는 내부 적용을 시작하면서 정해요.",
    ],
  },
  policies: { aggregateMinN: 10, teamMinN: 5, mcpEnabled: true, mailPreview: true, approvalsPreview: true },
};
