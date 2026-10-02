// 홈 위젯 company-kpi · 회사 KPI · 템플릿 figure · 크기 L (빌드 스펙 3.1.1절). 소유: home 그룹.
// 데이터: sel:widget.company-kpi — kpi_values CR_*(6.5절): 현재값·목표·6개월 추이(LineSpark). '더보기' 화면이 없어 링크를 두지 않습니다.
import { figureWidget } from "../lib/widgetKit";

export default figureWidget({
  id: "company-kpi",
  title: "회사 KPI",
  size: "L",
  requires: { modules: ["reports"] },
  emptyText: "KPI 값이 아직 없어요",
});
