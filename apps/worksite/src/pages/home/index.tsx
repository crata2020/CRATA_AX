// 홈 `/` · H-01 · 깊이 A · 모듈 home-dashboard · 소유: home 그룹
// 인사말(h1) + '오늘 할 일' 히어로 1장 + 역할·소속별 위젯(homeLayout, 빌드 스펙 5.3절).
// 배치: 첫 줄 = 히어로 5열 + 2번째 위젯 7열(알약). 그 아래는 두 줄기(왼쪽·오른쪽 세로 묶음)로 나눠 짧은 카드끼리 위로 쌓아요(lib/widgetLayout.ts).
//   L 위젯은 두 줄기 사이에 전체 폭. 1024 미만은 한 줄기(원래 순서). 1440 이상에서는 '오늘' 내용이 오른쪽 레일로 갑니다.
import "./lib/home.css";
import { useMemo, type CSSProperties } from "react";
import {
  CardGrid, Divider, HeroCard, ListRows, PageHeader, RightRail, SectionCard, WidgetSlot, useRailVisible, type ListRowProps,
} from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { usePageReady } from "@/app/pageReady";
import { useSel } from "./lib/useSel";
import { useUrlParam } from "@/lib/url";
import { formatDate } from "@/lib/format";
import { homeLayout } from "@/modules";
import type { WidgetId } from "@/modules/registry.generated";
import { Skeleton } from "antd";
import type { HomeRail, HomeToday, RailItem } from "./lib/types";
import { TodayHeroBody, greetingSummary } from "./lib/TodayHero";
import { WidgetError } from "./lib/widgetKit";
import { packHome, type HomeItem } from "./lib/widgetLayout";

/** 머리의 기간 세그먼트를 받는 위젯(이 위젯이 하나라도 있을 때만 세그먼트를 보여 줌) */
const PERIOD_AWARE = new Set<WidgetId>(["upcoming-meetings", "recent-decisions", "mfg-delivery-due", "safety-status"]);

const toRows = (items: RailItem[]): (ListRowProps & { key: string })[] => items.map((i) => ({ key: i.id, title: i.title, subtitle: i.subtitle, to: i.to }));

function TodayCard({ rail }: { rail: HomeRail }) {
  const blocks = [
    { key: "must", title: "필독 공지", items: rail.mustRead },
    { key: "today", title: "오늘 일정", items: rail.today },
    { key: "next", title: "다가오는 회의", items: rail.upcoming },
  ].filter((b) => b.items.length > 0);
  if (!blocks.length) return null;
  return (
    <SectionCard title="오늘" size="M">
      {blocks.map((b, i) => (
        <div key={b.key}>
          {i > 0 && <Divider />}
          <h3 className="wh-sub">{b.title}</h3>
          <ListRows rows={toRows(b.items)} ariaLabel={b.title} />
        </div>
      ))}
    </SectionCard>
  );
}

export default function HomePage() {
  const { persona, role, tenant, today, enabledModules } = useWorksite();
  const [periodRaw] = useUrlParam("period", "week");
  const period: "week" | "month" = periodRaw === "month" ? "month" : "week";
  const railVisible = useRailVisible();

  const todayQ = useSel<HomeToday>("home.today");
  const railQ = useSel<HomeRail>("home.rail");
  usePageReady(!todayQ.isLoading && !railQ.isLoading);

  const population = todayQ.data?.population ?? 0;
  const widgets = useMemo(
    () => homeLayout(tenant, { roleCode: persona.roleCode, unitId: persona.unitId, homePreset: role.homePreset, bundles: persona.bundles }, enabledModules, { population })
      .filter((id) => id !== "greeting"),
    [tenant, persona, role.homePreset, enabledModules, population],
  );
  const [second, ...below] = widgets;
  const showPeriod = widgets.some((w) => PERIOD_AWARE.has(w));
  const rail = railQ.data;
  const todayBlocks = rail ? [rail.mustRead, rail.today, rail.upcoming].filter((b) => b.length > 0) : [];
  const showToday = !railVisible && todayBlocks.length > 0;
  // '오늘' 카드는 3번째 위젯 앞(1440 미만에서만)
  const items = useMemo<HomeItem[]>(() => [...(showToday ? ["today" as const] : []), ...below], [showToday, below]);
  const todayEst = 80 + todayBlocks.reduce((h, b) => h + 30 + b.length * 59, 0);
  const segments = useMemo(() => packHome(items, { todayEst }), [items, todayEst]);
  const pos = new Map(items.map((id, i) => [id, i]));
  const orderStyle = (id: HomeItem) => ({ ["--o" as string]: pos.get(id) ?? 0 }) as CSSProperties;
  const renderItem = (id: HomeItem) => (id === "today" ? (rail ? <TodayCard rail={rail} /> : null) : <WidgetSlot id={id} period={period} />);

  return (
    <>
      <PageHeader
        title="홈"
        greeting={{ name: persona.displayName, dateText: formatDate(today), summary: greetingSummary(todayQ.data ?? undefined) }}
        period={showPeriod ? {
          ariaLabel: "기간",
          urlParam: "period",
          value: period,
          onChange: () => undefined, // URL(?period=)은 SegmentedPills가 바꿈
          options: [{ value: "week", label: "이번 주" }, { value: "month", label: "이번 달" }],
        } : undefined}
      />
      <CardGrid className="wh-home">
        <HeroCard title="오늘 할 일" pill demo span={second ? 5 : 12}>
          {todayQ.data ? <TodayHeroBody data={todayQ.data} /> : todayQ.isError ? <WidgetError onRetry={() => void todayQ.refetch()} /> : <Skeleton active title={false} paragraph={{ rows: 4 }} />}
        </HeroCard>
        {second && <WidgetSlot id={second} pill span={7} period={period} />}
      </CardGrid>
      {segments.length > 0 && (
        <div className="wh-flow wh-home">
          {segments.map((seg) => {
            // 한 줄기에 카드가 하나뿐이면(옆이 비면) 전체 폭으로
            const lone = seg.kind === "cols" && seg.cols[0].length + seg.cols[1].length === 1 ? (seg.cols[0][0] ?? seg.cols[1][0])! : null;
            if (seg.kind === "full" || lone) {
              const id = seg.kind === "full" ? seg.id : lone!;
              return <div key={id} className="wh-full" style={orderStyle(id)}>{renderItem(id)}</div>;
            }
            return (
              <div key={seg.cols.flat().join("|")} className="wh-cols">
                {seg.cols.map((col, ci) => (
                  <div key={ci} className="wh-col">
                    {col.map((id) => <div key={id} className="wh-item" style={orderStyle(id)}>{renderItem(id)}</div>)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
      {rail && (
        <RightRail
          blocks={[
            { title: "필독 공지", items: toRows(rail.mustRead) },
            { title: "오늘 일정", items: toRows(rail.today) },
            { title: "다가오는 회의", items: toRows(rail.upcoming) },
          ]}
        />
      )}
    </>
  );
}
