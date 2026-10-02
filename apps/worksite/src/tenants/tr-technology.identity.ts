// (주)티알테크놀러지 식별 정보: 홈페이지 공개 자료(출처는 sources). 공유용 빌드에서는 tr-technology.identity.public.ts로 바뀌어요.
import type { TenantConfig } from "./types";

type Facts = TenantConfig["facts"];

export const trIdentity = {
  tenantId: "tr-technology-demo",
  displayName: "티알테크놀러지",
  legalName: "주식회사 티알테크놀러지",
  monogram: "TR",
  shortName: "티알",
  overview: [
      { label: "회사명", value: "주식회사 티알테크놀러지", evidence: ["WEB-TR-01"] },
      { label: "영문명", value: "TR TECHNOLOGY CO.,LTD", evidence: ["WEB-TR-01"] },
      { label: "설립일", value: "2011년 12월 8일", evidence: ["WEB-TR-01"] },
      { label: "업종", value: "자동차 부품(Knitted Mesh & Parts) · 그 외 기타 금속가공업", evidence: ["WEB-TR-01", "REG-ALLCOMPANY"] },
      { label: "주요 제품", value: "일반기계, 자동차부품", evidence: ["REG-ALLCOMPANY"] },
      { label: "주소", value: "경상남도 양산시 산막공단북13길 38 (산막동)", evidence: ["WEB-TR-01"] },
      { label: "대표 전화", value: "055-785-3699", evidence: ["WEB-TR-01"] },
      { label: "팩스", value: "055-785-0125", evidence: ["WEB-TR-01"] },
      { label: "대표 메일", value: "trtechnology@daum.net", evidence: ["WEB-TR-01"] },
      { label: "부지·건물", value: "대지 4,032㎡ · 건물 1,902㎡(2016년 기준)", evidence: ["WEB-TR-01", "PUB-TR-INTRO-KO#p3"] },
    ] as Facts["overview"],
  vision: {
      mission: "혁신적이고 경쟁력 있는 KNITTED MESH SOLUTION을 제공함으로써 자동차 부품 제조 분야의 발전을 선도한다.",
      pillars: [
        { key: "VISION", text: "고객이 감동하는 자동차 부품 제조 전문 강소기업" },
        { key: "QUALITY", text: "전사적인 품질 활동을 통한 Single PPM 실현" },
        { key: "PRODUCT", text: "혁신적이고 경쟁력 있는 가치 창출을 통한 고객 만족 실현" },
        { key: "R&D", text: "고객, 전문기관과 상호신뢰를 바탕으로 유기적인 협력 관계 구축" },
      ],
      evidence: ["WEB-TR-02"],
    } as Facts["vision"],
  history: [
      { date: "2011-12", event: "주식회사 태성엔테크 설립", evidence: ["WEB-TR-03"] },
      { date: "2012-06", event: "H/KMC MESH(류) 공급", evidence: ["WEB-TR-03", "PUB-TR-INTRO-KO#p4"] },
      { date: "2012-07", event: "중국(북경/염성) KD부품 공급", evidence: ["WEB-TR-03"] },
      { date: "2015-05", event: "ISO9001 품질시스템 구축", evidence: ["WEB-TR-03"] },
      { date: "2015-11", event: "기술보증기금 벤처기업 등록(현재 유효 여부 확인 필요)", evidence: ["PUB-TR-INTRO-KO#p4"] },
      { date: "2015-12", event: "양산 산막공단 신축공장 확장 이전", evidence: ["WEB-TR-03"] },
      { date: "2016-02", event: "(주)태성엔테크에서 (주)티알테크놀러지로 상호 변경", evidence: ["WEB-TR-03"] },
    ] as Facts["history"],
  sources: {
      "WEB-TR-01": { title: "홈페이지 회사소개 > 개요", url: "http://trtechnology.co.kr/ko/sub01_1.php" },
      "WEB-TR-02": { title: "홈페이지 회사소개 > 비전", url: "http://trtechnology.co.kr/ko/sub01_2.php" },
      "WEB-TR-03": { title: "홈페이지 회사소개 > 연혁", url: "http://trtechnology.co.kr/ko/sub01_3.php" },
      "WEB-TR-04": { title: "홈페이지 회사소개 > 조직도", url: "http://trtechnology.co.kr/ko/sub01_4.php" },
      "WEB-TR-05": { title: "홈페이지 사업영역 > 공정설비", url: "http://trtechnology.co.kr/ko/sub02_1.php" },
      "WEB-TR-06": { title: "홈페이지 제품소개", url: "http://trtechnology.co.kr/ko/sub03_1.php" },
      "PUB-TR-INTRO-KO": { title: "회사소개서(국문, 2016-06)" },
      "REG-ALLCOMPANY": { title: "올컴퍼니 기업정보", url: "https://allcompany.co.kr/company/4ff61436-1cd1-4e1e-89c8-b4e687bea428" },
    } as Facts["sources"],
};
