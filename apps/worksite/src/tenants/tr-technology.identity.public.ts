// 공유용 빌드(--mode public) 전용 가상 식별 정보. tr-technology.identity.ts와 같은 모양이고, 실존 회사 이름·연락처·연혁·출처 주소를 담지 않아요.
import type { TenantConfig } from "./types";

type Facts = TenantConfig["facts"];

export const trIdentity = {
  tenantId: "sample-mfg-demo",
  displayName: "예시편조산업",
  legalName: "주식회사 예시편조산업(가상)",
  monogram: "YP",
  shortName: "예시편조",
  overview: [
    { label: "회사명", value: "주식회사 예시편조산업(가상)", evidence: [] },
    { label: "업종", value: "자동차 부품(편조 메시·성형 부품) · 금속가공업", evidence: [] },
    { label: "주요 제품", value: "편조 롤, 편조 성형 부품(예시)", evidence: [] },
    { label: "주소", value: "경상남도(가상 주소)", evidence: [] },
    { label: "대표 전화", value: "000-000-0000", evidence: [] },
    { label: "대표 메일", value: "contact@example.com", evidence: [] },
  ] as Facts["overview"],
  vision: {
    mission: "편조 메시 기술로 고객 가치를 만든다(가상 문구)",
    pillars: [
      { key: "VISION", text: "고객이 믿고 맡기는 자동차 부품 전문 기업(예시)" },
      { key: "QUALITY", text: "전사 품질 활동으로 Single PPM 달성(예시)" },
      { key: "PRODUCT", text: "경쟁력 있는 편조 부품으로 고객 만족(예시)" },
      { key: "R&D", text: "고객·전문기관과 함께하는 개발(예시)" },
    ],
    evidence: [],
  } as Facts["vision"],
  history: [
    { date: "2011", event: "회사 설립(예시)", evidence: [] },
    { date: "2015", event: "ISO 9001 품질시스템 구축(예시)", evidence: [] },
    { date: "2015", event: "신축 공장 이전(예시)", evidence: [] },
  ] as Facts["history"],
  sources: {
    "WEB-TR-01": { title: "공개 자료(가상 예시)" },
    "WEB-TR-02": { title: "공개 자료(가상 예시)" },
    "WEB-TR-03": { title: "공개 자료(가상 예시)" },
    "WEB-TR-04": { title: "공개 자료(가상 예시)" },
    "WEB-TR-05": { title: "공개 자료(가상 예시)" },
    "WEB-TR-06": { title: "공개 자료(가상 예시)" },
    "PUB-TR-INTRO-KO": { title: "공개 자료(가상 예시)" },
    "REG-ALLCOMPANY": { title: "공개 자료(가상 예시)" },
  } as Facts["sources"],
};
