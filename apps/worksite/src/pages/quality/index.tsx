// 품질 현황 `/ops/quality` · I-11 · 깊이 A · 모듈 mfg-quality · TR 전용 · 소유: industry 그룹
// 회사가 내건 "Single PPM" 목표 대비 고객 PPM 추이(K06)와 공정 불량률(K03)·초중종물 실시율(K04)·미결 시정조치,
// 그리고 검사 · 부적합 · 4M 변경 · 계측기 탭. 지표 값은 모두 예시예요.
import { useMemo } from "react";
import { CardGrid, DataTable, DdayBadge, EmptyState, FilterBar, Gauge, KpiCard, KpiStrip, LinkTabs, PageHeader, SectionCard, SimpleBarChart, StatTile, StatusTag, useFilterBarState, type FilterBarProps } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { usePageReady } from "@/app/pageReady";
import { useUrlParam } from "@/lib/url";
import { isDesktopUp, useBreakpoint } from "@/lib/useBreakpoint";
import { formatDate, formatMonth, formatNumber } from "@/lib/format";
import { labelOf, optionsOf, statusOf } from "@/lib/status";
import type { CorrectiveAction, Gauge as GaugeEntity, Inspection, Item, Kpi, KpiValue } from "@/types/entities";
import { useIndex, useModuleRows } from "../ops-home/kit/data";
import { gaugeStatus } from "../ops-home/kit/labels";
import { lazyPart } from "@/lib/lazyDrawer";

// 탭을 열 때만 불러와요(폼·날짜 선택 부품이 품질 첫 화면 묶음에 들어가지 않게)
const NcTab = lazyPart(() => import("./NcTab").then((m) => m.NcTab));
const FourMTab = lazyPart(() => import("./FourMTab").then((m) => m.FourMTab));
import "../ops-home/kit/industry.css";

const KPI_IDS = ["K06", "K03", "K04"];

export default function Page() {
  const { person, isModuleOn } = useWorksite();
  const bp = useBreakpoint();
  const [period] = useUrlParam("period", "month");
  const [tab] = useUrlParam("tab", "inspections");
  const kpis = useModuleRows<Kpi>("reports", "kpis", { filters: [{ field: "id", operator: "in", value: KPI_IDS }] });
  const values = useModuleRows<KpiValue>("reports", "kpi_values", { filters: [{ field: "kpi_id", operator: "in", value: KPI_IDS }], sorters: [{ field: "period", order: "asc" }] });
  const cas = useModuleRows<CorrectiveAction>("mfg-quality", "corrective_actions", { filters: [{ field: "status", operator: "eq", value: "open" }] });
  const items = useModuleRows<Item>("mfg-master-data", "items");
  usePageReady(!values.isLoading && !cas.isLoading);
  const itemById = useIndex(items.rows);
  const kpiById = useIndex(kpis.rows);
  const seriesOf = (id: string) => values.rows.filter((v) => v.kpi_id === id && v.period.length === 7);
  const ppm = seriesOf("K06");
  const k03 = seriesOf("K03");
  const k04 = seriesOf("K04");
  const target = kpiById.get("K06")?.target ?? 10;
  const last = <T,>(a: T[], n = 1) => a[a.length - n];
  const three = period === "3m";
  const ppmCur = last(ppm);
  const ppmPrev = last(ppm, 2);
  const ppmAvg = ppm.length ? Math.round((ppm.slice(-3).reduce((t, v) => t + v.value, 0) / Math.min(3, ppm.length)) * 10) / 10 : null;
  const hasKpi = isModuleOn("reports") && values.rows.length > 0;

  const tabs = [
    { key: "inspections", label: "검사", to: "?tab=inspections" },
    { key: "nc", label: "부적합", to: "?tab=nc" },
    { key: "4m", label: "4M 변경", to: "?tab=4m" },
    { key: "gauges", label: "계측기", to: "?tab=gauges" },
  ];

  const insProps: FilterBarProps = {
    chips: [
      { param: "kind", field: "kind", options: optionsOf("inspections.kind"), multiple: true, ariaLabel: "검사 종류" },
      { param: "result", field: "result", options: optionsOf("inspections.result"), multiple: true, ariaLabel: "판정" },
    ],
  };
  const insFb = useFilterBarState(insProps);
  const roleOf = (id: string | null) => (id ? person(id)?.jobTitle ?? "—" : "—");
  const chartData = useMemo(() => ppm.slice(-3).map((v) => ({ key: v.period, label: formatMonth(v.period), value: v.value })), [ppm]);

  return (
    <>
      <PageHeader
        title="품질 현황"
        description="Single PPM 목표 대비 고객 PPM과 검사·부적합·4M 변경·계측기를 한곳에서 봐요."
        period={{ ariaLabel: "기간", urlParam: "period", value: "month", onChange: () => undefined, options: [{ value: "month", label: "이번 달" }, { value: "3m", label: "3개월" }] }}
      />
      {hasKpi ? (
        <CardGrid>
          {/* 고객 PPM 수치(왼쪽 5)와 월별 막대(오른쪽 7)를 한 카드에(홈 '품질 지표'와 같은 두 갈래). 두 카드로 나누면 짧은 수치 카드 아래가 비어요.
              수치는 카드 머리 바로 아래에서 시작(.in-split__lead), 목표 문구는 홈 위젯과 같은 수치 캡션 → 숫자·증감·목표 태그·목표가 한 덩어리, 카드 높이는 막대가 정해요 */}
          <SectionCard title="고객 PPM" pill span={12} demo>
            <div className="in-split">
              <div className="in-split__lead">
                {ppmCur ? (
                  <StatTile
                    hero
                    label={three ? `고객 PPM(최근 3개월 평균)` : `고객 PPM(${formatMonth(ppmCur.period)})`}
                    value={three ? ppmAvg ?? "—" : ppmCur.value}
                    unit="PPM"
                    delta={!three && ppmPrev ? { value: Math.round((ppmCur.value - ppmPrev.value) * 10) / 10, period: "지난달보다", goodWhen: "down" } : undefined}
                    caption={`Single PPM 목표 ${formatNumber(target)} 미만`}
                    tone={ppmCur.value < target ? "good" : "warning"}
                    toneLabel={ppmCur.value < target ? "목표 달성" : "목표 미달성"}
                  />
                ) : <EmptyState kind="empty" compact title="이번 달 PPM 기록이 없어요" />}
              </div>
              <div>
                <h3 className="in-split__sub">월별 고객 PPM</h3>
                <SimpleBarChart
                  data={chartData}
                  unit="PPM"
                  highlightKey={ppmCur?.period}
                  target={{ value: target, label: `Single PPM 목표 ${formatNumber(target)}` }}
                  ariaLabel={`월별 고객 PPM, ${chartData.map((d) => `${d.label} ${d.value}`).join(", ")}, 목표 ${target}`}
                  tableCaption="월별 고객 PPM(예시)"
                  height={190}
                />
              </div>
            </div>
          </SectionCard>
          <KpiStrip title="공정 지표" demo>
            <KpiCard>
              <StatTile
                label="공정 불량률"
                value={last(k03)?.value != null ? formatNumber(last(k03)!.value, 2) : "—"}
                unit="%"
                delta={last(k03, 2) ? { value: Math.round((last(k03)!.value - last(k03, 2)!.value) * 100) / 100, unit: "%p", period: "지난달보다", goodWhen: "down" } : undefined}
              />
            </KpiCard>
            <KpiCard>
              <Gauge
                label="초중종물 실시율"
                value={last(k04)?.value ?? 0}
                max={100}
                valueText={`${formatNumber(last(k04)?.value ?? 0)}%`}
                caption={`목표 100% · 지난달 ${formatNumber(last(k04, 2)?.value ?? 0)}%`}
              />
            </KpiCard>
            <KpiCard>
              <StatTile label="미결 시정조치" value={cas.rows.length} unit="건" caption="8D와 간이 시정조치를 합쳤어요" />
            </KpiCard>
          </KpiStrip>
        </CardGrid>
      ) : (
        <SectionCard title="품질 지표">
          <EmptyState kind="empty" compact title="지표는 검토자 이상에게 보여요" description="아래 탭에서 검사·부적합·4M 변경·계측기 기록을 볼 수 있어요." />
        </SectionCard>
      )}

      <div style={{ marginTop: 24 }}>
        <LinkTabs tabs={tabs} ariaLabel="품질 기록" />
        <div style={{ marginTop: 16 }}>
          {tab === "inspections" && (
            <>
              <FilterBar {...insProps} />
              <DataTable<Inspection>
                resource="inspections"
                ariaLabel="검사 기록"
                filters={insFb.filters}
                isFiltered={insFb.active}
                onClearFilters={insFb.clear}
                syncWithLocation={false}
                sorters={[{ field: "inspected_on", order: "desc" }, { field: "id", order: "desc" }]}
                // 데스크톱(고정 레이아웃): 검사일 128 + 종류 120 + LOT 176 + 검사자 140 + 판정 136 = 700 + 품목 최소 160 ≤ 1280의 표 상자(약 970).
                // 태블릿(고정 레이아웃): 종류는 품목 칸 앞 태그로 합치고 검사자는 빼요. 검사일 128 + LOT 168 + 판정 136 = 432 + 품목 최소 160 = 592 ≤ 768의 표 상자(약 622).
                // LOT 168 = 'F-PR12-260929-005'(tabular 14px 약 130) + 칸 안쪽 32. LOT은 추적 열쇠라 폭을 늘 정해 두고, 더 긴 값은 글자 중간이 아니라 '…'로 끝나요(전체는 title)
                columns={isDesktopUp(bp) ? [
                  { key: "inspected_on", title: "검사일", kind: "date" },
                  { key: "kind", title: "종류", width: 120, render: (i) => <span className="ws-tag">{labelOf("inspections.kind", i.kind)}</span> },
                  { key: "item_id", title: "품목", flex: true, render: (i) => { const name = itemById.get(i.item_id)?.name ?? "—"; return <span className="ws-cell-name" title={name}>{name}</span>; } },
                  { key: "lot_no", title: "LOT", width: 176, render: (i) => <span className="ws-ellipsis in-num" title={i.lot_no ?? undefined}>{i.lot_no ?? "—"}</span> },
                  { key: "inspector_id", title: "검사자(역할)", width: 140, render: (i) => <span className="ws-ellipsis">{roleOf(i.inspector_id)}</span> },
                  { key: "result", title: "판정", kind: "status", statusDomain: "inspections.result" },
                ] : [
                  { key: "inspected_on", title: "검사일", kind: "date" },
                  { key: "item_id", title: "품목", flex: true, render: (i) => { const name = itemById.get(i.item_id)?.name ?? "—"; return <span className="in-namecell"><span className="ws-tag">{labelOf("inspections.kind", i.kind)}</span><span className="ws-cell-name" title={name}>{name}</span></span>; } },
                  { key: "lot_no", title: "LOT", width: 168, render: (i) => <span className="ws-ellipsis in-num" title={i.lot_no ?? undefined}>{i.lot_no ?? "—"}</span> },
                  { key: "result", title: "판정", kind: "status", statusDomain: "inspections.result" },
                ]}
                mobileRow={(i) => ({ title: `${labelOf("inspections.kind", i.kind)} · ${itemById.get(i.item_id)?.name ?? "—"}`, subtitle: `${formatDate(i.inspected_on)} · ${i.lot_no ?? "LOT 없음"}`, trailing: <StatusTag {...statusOf("inspections.result", i.result)} /> })}
                empty={{ kind: "empty", title: "검사 기록이 없어요", description: "수입·초중종물·출하 검사를 하면 여기에 쌓여요." }}
              />
            </>
          )}
          {tab === "nc" && <NcTab />}
          {tab === "4m" && <FourMTab />}
          {tab === "gauges" && (
            <DataTable<GaugeEntity>
              resource="gauges"
              ariaLabel="계측기"
              syncWithLocation={false}
              sorters={[{ field: "next_due_on", order: "asc" }]}
              columns={[
                { key: "gauge_no", title: "번호", kind: "name" },
                { key: "kind", title: "종류" },
                { key: "range", title: "범위" },
                { key: "location", title: "위치" },
                { key: "next_due_on", title: "다음 검교정", render: (g) => <span className="in-row"><span className="in-num ws-date">{formatDate(g.next_due_on, false)}</span><DdayBadge date={g.next_due_on} noun="교정" /></span> },
                { key: "status", title: "상태", render: (g) => <StatusTag {...gaugeStatus(g.status)} /> },
              ]}
              mobileRow={(g) => ({ title: `${g.gauge_no} · ${g.kind}`, subtitle: `${g.location ?? "—"} · 다음 검교정 ${formatDate(g.next_due_on, false)}`, trailing: <DdayBadge date={g.next_due_on} noun="교정" /> })}
              empty={{ kind: "empty", title: "등록된 계측기가 없어요", description: "계측기를 등록하면 검교정 기한을 알려 드려요." }}
            />
          )}
        </div>
      </div>
    </>
  );
}
