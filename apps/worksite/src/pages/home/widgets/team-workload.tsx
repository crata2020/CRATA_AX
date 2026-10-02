// 홈 위젯 team-workload · 팀 업무 현황 · 템플릿 chart · 크기 M (빌드 스펙 3.1.1절). 소유: home 그룹.
// 데이터: sel:widget.team-workload — 내가 검토자인 업무의 상태별 수(StackedShareBar, 상태마다 고정 색 taskStatusSegments) + 담당자별 진행 중 수(숫자만, 막대·순위 없음).
import { PersonChip, StackedShareBar, type WidgetDef } from "@/components";
import { formatNumber } from "@/lib/format";
import { taskStatusSegments } from "@/lib/status";
import { ListHead, useWidgetData, WidgetState } from "../lib/widgetKit";
import type { TeamWorkload } from "../lib/types";

const widget: WidgetDef = {
  id: "team-workload",
  title: "팀 업무 현황",
  size: "M",
  link: { label: "더보기", to: "/work/board?scope=review" },
  requires: { modules: ["tasks"] },
  caption: "평가용이 아니에요. 일이 몰린 곳을 함께 보기 위한 숫자예요.",
  emptyText: "팀 업무가 없어요",
  Body: ({ ctx }) => {
    const state = useWidgetData<TeamWorkload>("team-workload", ctx);
    return (
      <WidgetState
        state={state}
        isEmpty={(d) => d.total === 0}
        render={(d) => (
          <>
            <ListHead count={d.total} unit="건" label="내가 검토하는 업무" />
            <StackedShareBar segments={taskStatusSegments((s) => d.segments.find((x) => x.key === s)?.value ?? 0)} unit="건" ariaLabel="상태별 업무 비중" />
            {d.people.length > 0 && (
              <ul className="wh-people" aria-label="담당자별 진행 중 업무">
                {d.people.map((p) => (
                  <li key={p.memberId}>
                    <PersonChip memberId={p.memberId} size="sm" />
                    <span>진행 중 {formatNumber(p.inProgress)}건</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      />
    );
  },
};

export default widget;
