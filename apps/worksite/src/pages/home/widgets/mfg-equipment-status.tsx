// 홈 위젯 mfg-equipment-status · 설비 상태 · 템플릿 chart · 크기 M (빌드 스펙 3.1.1절). 소유: home 그룹.
// 데이터: sel:widget.mfg-equipment-status — 오늘 현재 근무조 설비 가동 기록의 상태별 대수(StackedShareBar, 상태 tone) + 오늘 점검 미실시 대수.
// 큰 숫자·막대·범례는 모두 '전체 설비'(같은 모수), 편조기 가동은 보조 줄.
import { StackedShareBar, type WidgetDef } from "@/components";
import { formatNumber } from "@/lib/format";
import { ListHead, useWidgetData, WidgetState } from "../lib/widgetKit";
import type { EquipmentStatus } from "../lib/types";

const widget: WidgetDef = {
  id: "mfg-equipment-status",
  title: "설비 상태",
  size: "M",
  link: { label: "더보기", to: "/ops/production/board" },
  requires: { modules: ["mfg-production", "mfg-equipment"] },
  emptyText: "설비 가동 기록이 없어요",
  Body: ({ ctx }) => {
    const state = useWidgetData<EquipmentStatus>("mfg-equipment-status", ctx);
    return (
      <WidgetState
        state={state}
        isEmpty={(d) => d.total === 0}
        render={(d) => (
          <>
            {/* 큰 숫자와 막대는 같은 모수(전체 설비). 편조기는 보조 줄로 */}
            <ListHead
              count={d.segments.find((s) => s.key === "running")?.value ?? 0}
              unit={`/ ${formatNumber(d.total)}대`}
              label={`전체 설비 가동(오늘 ${d.shiftLabel})`}
              note={d.knit ? `편조기 ${formatNumber(d.knit.running)} / ${formatNumber(d.knit.total)}대 가동` : null}
            />
            <StackedShareBar segments={d.segments} unit="대" ariaLabel={`오늘 ${d.shiftLabel} 설비 ${formatNumber(d.total)}대 상태`} />
            <p className="wh-sentence">오늘 일상점검 안 한 설비 <strong>{formatNumber(d.checksMissing)}대</strong></p>
          </>
        )}
      />
    );
  },
};

export default widget;
