// 홈 `/` · H-01 · 깊이 A · 모듈 home-dashboard · 소유: home 그룹
// 인사말(h1) + '오늘 할 일' 히어로 1장 + 역할·소속별 위젯(homeLayout, 빌드 스펙 5.3절).
// 도입 1단계면 1단계 홈 목록(승인 대기 중심)을 쓰고, 소유자·관리자에게 넓히는 곳을 한 줄로 알려요.
// 배치: 히어로·2번째 위젯·나머지를 한 MasonryGrid(1024 이상 5:7 두 줄기)에 넣어요. 히어로는 왼쪽 첫 칸, 2번째 위젯(알약)은 오른쪽 첫 칸이고,
//   그다음부터 실제 높이를 재서 짧은 줄기 아래에 쌓아요(히어로는 내용 높이로 끝나고 바로 아래에 다음 위젯). L 위젯은 두 줄기 사이에 전체 폭
//   (그 앞 줄기 끝이 크게 어긋나면 뒤 카드를 당겨 채움). 1024 미만은 한 줄기(원래 순서). 1440 이상에서는 '오늘' 내용이 오른쪽 레일로 갑니다.
import "./lib/home.css";
import { useMemo } from "react";
import {
  Divider, HeroCard, ListRows, MasonryGrid, PageHeader, RightRail, SectionCard, WidgetSlot, useRailVisible, type ListRowProps, type MasonryItem,
} from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { usePageReady } from "@/app/pageReady";
import { useSel } from "./lib/useSel";
import { useUrlParam } from "@/lib/url";
import { formatDate } from "@/lib/format";
import { homeLayout } from "@/modules";
import type { WidgetId } from "@/modules/registry.generated";
import { Skeleton } from "antd";
import { Link } from "react-router";
import type { HomeRail, HomeToday, RailItem } from "./lib/types";
import { TodayHeroBody, greetingSummary } from "./lib/TodayHero";
import { WidgetError } from "./lib/widgetKit";
import { estOf, isFull, type HomeItem } from "./lib/widgetLayout";

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
  const { persona, role, tenant, today, enabledModules, stage } = useWorksite();
  const [periodRaw] = useUrlParam("period", "week");
  const period: "week" | "month" = periodRaw === "month" ? "month" : "week";
  const railVisible = useRailVisible();

  const todayQ = useSel<HomeToday>("home.today");
  const railQ = useSel<HomeRail>("home.rail");
  usePageReady(!todayQ.isLoading && !railQ.isLoading);

  const population = todayQ.data?.population ?? 0;
  const widgets = useMemo(
    () => homeLayout(tenant, { roleCode: persona.roleCode, unitId: persona.unitId, homePreset: role.homePreset, bundles: persona.bundles }, enabledModules, { population, stage })
      .filter((id) => id !== "greeting"),
    [tenant, persona, role.homePreset, enabledModules, population, stage],
  );
  const [second, ...below] = widgets;
  const showPeriod = widgets.some((w) => PERIOD_AWARE.has(w));
  const rail = railQ.data;
  const todayBlocks = rail ? [rail.mustRead, rail.today, rail.upcoming].filter((b) => b.length > 0) : [];
  const showToday = !railVisible && todayBlocks.length > 0;
  // '오늘' 카드는 3번째 위젯 앞(1440 미만에서만)
  const items = useMemo<HomeItem[]>(() => [...(showToday ? ["today" as const] : []), ...below], [showToday, below]);
  const todayEst = 80 + todayBlocks.reduce((h, b) => h + 30 + b.length * 59, 0);
  const renderItem = (id: HomeItem) => (id === "today" ? (rail ? <TodayCard rail={rail} /> : null) : <WidgetSlot id={id} period={period} />);
  const hero = (
    <HeroCard title="오늘 할 일" pill demo>
      {todayQ.data ? <TodayHeroBody data={todayQ.data} /> : todayQ.isError ? <WidgetError onRetry={() => void todayQ.refetch()} /> : <Skeleton active title={false} paragraph={{ rows: 4 }} />}
    </HeroCard>
  );
  // DOM 순서 = 히어로 → 2번째 위젯 → 나머지. 히어로와 2번째는 L이어도 반 폭(full 아님).
  // L 위젯 사이에 혼자 남은 카드는 전체 폭, L 앞 줄기 끝이 크게 어긋나면 뒤 카드를 당겨 채워요(MasonryGrid balance)
  const flow: MasonryItem[] = [
    { key: "hero", node: hero, est: 340, full: false },
    ...(second ? [{ key: second, node: <WidgetSlot id={second} pill period={period} />, est: estOf(second), full: false }] : []),
    ...items.map((id) => ({ key: id, node: renderItem(id), full: isFull(id), est: estOf(id, todayEst) })),
  ];

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
      <MasonryGrid className="wh-home wh-flow" items={flow} balance />
      {stage === "phase1" && (persona.role === "owner" || persona.role === "admin") && (
        <p className="wh-stage">
          지금은 도입 1단계예요 — 꼭 필요한 화면만 열어 뒀어요. 익숙해지면 <Link to="/admin/modules">회사 설정 › 모듈</Link>에서 한 번에 넓힐 수 있어요.
        </p>
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
