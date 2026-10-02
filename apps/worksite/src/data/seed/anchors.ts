// 시나리오 앵커(빌드 스펙 6.3절). 그룹끼리 서로 링크하는 행은 이 id로 '정확히' 만듭니다.
// 다른 그룹 행을 가리킬 때 하드코딩해도 되는 id는 이 파일과 TenantConfig(사람·조직·사업 구조·거래처)의 id뿐입니다.

export const ANCHORS = {
  crata: {
    /** tasks(work): "예시기업 특강 제안서 초안", 담당 이몽룡, 검토자 성춘향, submitted, 마감 2026-10-02 */
    task: "t-cr-001",
    /** submissions(work): v1 웹 제출, rejected, "첫 장에 교육 목표를 3줄로 요약해 주세요", 9/26 */
    submissionV1: "sub-cr-001",
    /** submissions(work): v2 AI 연결(Claude) 제출, submitted, 9/30 08:40 KST, artifact art-cr-001 */
    submissionV2: "sub-cr-002",
    /** artifacts(collab): "예시기업 특강 제안서", proposal, AI 초안 포함, 버전 3개, 수정 기록 4개 */
    artifact: "art-cr-001",
    /** rules(collab): candidate "제안서 첫 장에 교육 목표를 3줄로 요약해요", 근거 cor-cr-001~004 */
    rule: "rule-cr-01",
    corrections: ["cor-cr-001", "cor-cr-002", "cor-cr-003", "cor-cr-004"],
    /** meetings(work): "[강의] 예시기업 특강 요구사항 미팅", 9/24 14:00 KST, 52분, needs_review */
    meeting: "mtg-cr-01",
    decision: "dec-cr-01",
    actionProposal: "ap-cr-01",
    /** notices(collab): "10월 전사 회의 일정 안내", 필독, 9/28 */
    notice: "ntc-cr-01",
    /** opportunities(industry): "예시재단 AI 리터러시 워크숍", proposal, 견적 q-cr-01 */
    opportunity: "opp-cr-01",
    quote: "q-cr-01",
    project: "prj-cr-edu-a",
    partner: "p-cr-corp",
  },
  tr: {
    /** tasks(work): "CL-2026-03 8D D4 근거 정리", 담당 품질보증 A, 검토자 공장장, submitted, 마감 2026-10-02, source claim */
    task: "t-tr-001",
    /** submissions(work): v1 웹 제출(품질보증 A), submitted, 9/30 07:55 KST, artifact art-tr-8d-03. L2라 AI 연결로 제출하지 않음(국내 경로 개통 전) */
    submission: "sub-tr-001",
    /** artifacts(collab): "CL-2026-03 8D 보고서", report_8d, 사람 초안(L2라 AI 초안 없음), 버전 3개, 수정 기록 5개(사람이 고친 것 → 규칙 후보) */
    artifact8d: "art-tr-8d-03",
    rules: ["rule-tr-01", "rule-tr-02"],
    /** customer_claims(industry): CL-2026-03, p-tr-exh, FP-DR-321-001, 9/18 접수, 1,200개, 8D 기한 2026-10-06(10/5는 개천절 대체공휴일) · 임시 조치: 재고 2,400개 선별, 의심 LOT 1,700개 격리 */
    claim: "clm-tr-2026-03",
    claimNo: "CL-2026-03",
    correctiveAction: "ca-tr-2026-03",
    /** change_requests_4m(industry): CR4M-2026-04, "KN-07 편조 조건표 개정", waiting_customer */
    change4m: "cr4m-tr-2026-04",
    /** LOT 체인(industry) */
    lotChain: ["R-321-260911-01", "K-KN07-260914-A", "F-PR02-260915-003", "S-260916-012"],
    /** field_reports(industry): 설비 이상 "프레스 PR-010-02 작업 중 이상 소음", assigned → bd-tr-011 */
    fieldReport: "fr-tr-0085",
    breakdownKn21: "bd-tr-010",
    breakdownPress: "bd-tr-011",
    /** legal_calendar_items(industry): "2026 하반기 반기 점검", 마감 2026-10-14 */
    legalH2: "lc-tr-2026h2",
    /** stock_lots(industry): SUS321 선재, 재고일수 4일 + 발주 초안 po-tr-049 */
    stockLot321: "sl-tr-321-020",
    purchaseOrder: "po-tr-049",
    /** meetings(work): "주간 품질회의(예시)", 9/29 09:00 KST */
    meeting: "mtg-tr-01",
    decision: "dec-tr-01",
    actionProposal: "ap-tr-01",
    /** notices(collab): "하반기 반기 안전 점검 안내", 필독, safety, 9/25 */
    notice: "ntc-tr-01",
    project: "prj-tr-qual-clm",
    partner: "p-tr-exh",
    item: "FP-DR-321-001",
  },
} as const;

/** 매니페스트 상세 경로 스모크용 예시 id(테넌트별) */
export const SAMPLE_PARAMS = {
  "crata-demo": {
    projectId: "prj-cr-edu-a", taskId: ANCHORS.crata.task, meetingId: ANCHORS.crata.meeting, artifactId: ANCHORS.crata.artifact,
    noticeId: ANCHORS.crata.notice, partnerId: "p-cr-corp", claimId: ANCHORS.tr.claim,
  },
  "tr-technology": {
    projectId: "prj-tr-qual-clm", taskId: ANCHORS.tr.task, meetingId: ANCHORS.tr.meeting, artifactId: ANCHORS.tr.artifact8d,
    noticeId: ANCHORS.tr.notice, partnerId: "p-tr-exh", claimId: ANCHORS.tr.claim,
  },
} as const;
