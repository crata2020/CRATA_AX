// 홈 위젯 mfg-production-today · 오늘 생산 · 템플릿 chart · 크기 M (빌드 스펙 3.1.1절). 소유: home 그룹.
// 데이터: sel:widget.mfg-production-today — 공정마다 한 줄(Meter): 양품 / 오늘 계획 · %, 세로 눈금 = 지금 시각까지 계획상 해야 할 양.
// 근무 중간에 '달성률 9.7%'처럼 실패로 읽히지 않게, 진행 정도를 예상 진도와 나란히 보여 줍니다. 주간 비교 막대는 생산 화면(I-09)에 둡니다.
import { Meter, type WidgetDef } from "@/components";
import { formatNumber, formatQty } from "@/lib/format";
import { useWidgetData, WidgetState } from "../lib/widgetKit";
import type { ProductionToday } from "../lib/types";

const pct = (good: number, planned: number) => (planned > 0 ? Math.round((good / planned) * 100) : 0);

const widget: WidgetDef = {
  id: "mfg-production-today",
  title: "오늘 생산",
  size: "M",
  link: { label: "더보기", to: "/ops/production?tab=results" },
  requires: { modules: ["mfg-production"] },
  emptyText: "오늘 작업지시가 없어요",
  Body: ({ ctx }) => {
    const state = useWidgetData<ProductionToday>("mfg-production-today", ctx);
    return (
      <WidgetState
        state={state}
        isEmpty={(d) => d.rows.length === 0}
        render={(d) => (
          <>
            <p className="wh-asof">{d.now} 기준 · 지금까지 등록한 실적</p>
            <div className="wh-meters">
              {d.rows.map((r) => (
                <Meter
                  key={r.key}
                  label={r.label}
                  value={r.good}
                  max={r.planned}
                  valueText={r.good > 0 ? `${formatNumber(r.good)} / ${formatQty(r.planned, r.unit)} · ${pct(r.good, r.planned)}%` : `실적 전 · 계획 ${formatQty(r.planned, r.unit)}`}
                  marker={r.planned > 0 ? { value: r.expected, label: `지금까지 계획 ${formatQty(r.expected, r.unit)}` } : undefined}
                />
              ))}
            </div>
            <p className="wh-sentence">
              가공 불량 <strong>{formatQty(d.defects, "개")}</strong>
              {d.asOf && <> · 마지막 실적 등록 {d.asOf}</>}
            </p>
            <p className="ws-card__caption" style={{ marginTop: 4 }}>막대 위 세로선은 지금 시각까지 계획상 해야 할 양이에요.</p>
          </>
        )}
      />
    );
  },
};

export default widget;
