// 생산·품질 홈 `/ops` · I-06 · 깊이 A · 모듈 mfg-production · TR 전용 · 소유: industry 그룹
// 공장장·품질·영업이 아침에 "오늘 라인이 정상인가, 급한 품질 일이 있나"를 3초 안에 봅니다(CRATA의 /ops는 라우트가 /ops/sales로 보냄).
// 히어로(오늘 라인)는 sel:ops.today, 나머지 카드는 홈 위젯(home 그룹 구현)을 WidgetSlot으로 씁니다.
// 생산 작업자(R_OPERATOR)는 숫자 대시보드 대신 '오늘 작업지시 · 점검 미완료'와 현장 등록만 봅니다. 개인별 작업량은 어디에도 없습니다.
import { Link } from "react-router";
import { RightOutlined } from "@ant-design/icons";
import { BigNumber, CardGrid, HeroCard, PageHeader, WidgetSlot } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { usePageReady } from "@/app/pageReady";
import { useSelector } from "@/lib/refine";
import { useUrlParam } from "@/lib/url";
import { formatDate } from "@/lib/format";
import { shiftAt } from "./kit/data";
import { SHIFT_LABEL } from "./kit/labels";
import "./kit/industry.css";

export interface OpsToday {
  date: string;
  shift: "day" | "night";
  hasLogs: boolean;
  knitRunning: number;
  knitTotal: number;
  knitStatus: Record<"running" | "stopped" | "breakdown" | "setup" | "none", number>;
  pressRunning: number;
  pressTotal: number;
  openBreakdowns: number;
  unassignedReports: number;
  workOrdersToday: number;
  checksMissing: number;
}

export default function Page() {
  const { today, clock, persona, tenant, can } = useWorksite();
  const operator = !!tenant.roles.find((r) => r.code === persona.roleCode)?.mobileFirst;
  const [period] = useUrlParam("period", "today");
  const { data, isLoading, isError, refetch } = useSelector<OpsToday>("ops.today");
  usePageReady(!isLoading);
  const shift = data?.shift ?? shiftAt(clock.now()).shift;
  const widgetPeriod = period === "month" ? "month" : "week";
  const reviewer = can("field_reports", "approve").can;

  const hero = (
    <HeroCard title="오늘 라인" pill span={5} demo>
      {isLoading ? (
        <p className="in-hero-text" aria-busy="true">불러오는 중이에요.</p>
      ) : isError || !data ? (
        <p className="in-hero-text">오늘 라인 현황을 불러오지 못했어요. <button type="button" className="in-hero-link" onClick={() => void refetch()}>다시 시도</button></p>
      ) : operator ? (
        <>
          <BigNumber label="오늘 작업지시(라인 전체)" value={data.workOrdersToday} unit="건" />
          <ul className="in-hero-links" aria-label="오늘 할 일">
            <li><Link className="in-hero-link" to="/ops/equipment?tab=today">점검 미완료 설비 {data.checksMissing}대</Link></li>
            <li><Link className="in-hero-link" to="/ops/production/board">설비 현황판</Link></li>
          </ul>
          <div className="in-hero-cta"><Link to="/ops/report">현장 등록하기 <RightOutlined aria-hidden /></Link></div>
        </>
      ) : !data.hasLogs ? (
        <>
          <p className="in-hero-text">오늘 설비 기록이 아직 없어요. 근무조 시작 때 현황판에서 상태를 눌러 주세요.</p>
          <div className="in-hero-cta"><Link to="/ops/production/board">설비 현황판 열기 <RightOutlined aria-hidden /></Link></div>
        </>
      ) : (
        <>
          <BigNumber label="편조기 가동" value={data.knitRunning} unit={`/ ${data.knitTotal}대`} />
          <ul className="in-hero-links" aria-label="오늘 라인 요약">
            <li><Link className="in-hero-link" to="/ops/production/board">프레스 가동 {data.pressRunning}/{data.pressTotal}</Link></li>
            <li><Link className="in-hero-link" to="/ops/equipment?tab=breakdowns">고장 {data.openBreakdowns}건</Link></li>
            <li>
              <Link className="in-hero-link" to={reviewer ? "/ops/report?tab=feed&status=new" : "/ops/report"}>미배정 현장 등록 {data.unassignedReports}건</Link>
            </li>
          </ul>
          <div className="in-hero-cta"><Link to="/ops/production/board">설비 현황판 보기 <RightOutlined aria-hidden /></Link></div>
        </>
      )}
    </HeroCard>
  );

  return (
    <>
      <PageHeader
        title="생산·품질"
        description={`${formatDate(today)} ${SHIFT_LABEL[shift]}`}
        period={operator ? undefined : {
          ariaLabel: "기간", urlParam: "period", value: "today", onChange: () => undefined,
          options: [{ value: "today", label: "오늘" }, { value: "week", label: "이번 주" }, { value: "month", label: "이번 달" }],
        }}
      />
      {operator ? (
        <CardGrid>
          {hero}
          <WidgetSlot id="mfg-field-report" span={7} />
          <WidgetSlot id="mfg-field-feed" size="M" />
        </CardGrid>
      ) : (
        <CardGrid>
          {hero}
          <WidgetSlot id="mfg-quality-ppm" pill span={7} period={widgetPeriod} />
          {/* 알약은 첫 줄(히어로·품질 지표)만. 둘째 줄은 모두 보통 제목이라 숫자 높이가 맞아요 */}
          <WidgetSlot id="mfg-claims-8d" size="M" period={widgetPeriod} />
          <WidgetSlot id="mfg-delivery-due" size="M" period={widgetPeriod} />
          <WidgetSlot id="mfg-field-feed" size="M" period={widgetPeriod} />
          <WidgetSlot id="mfg-legal-calendar" size="M" period={widgetPeriod} />
        </CardGrid>
      )}
    </>
  );
}
