// 홈 위젯 project-health · 사업·프로젝트 현황 · 템플릿 list · 크기 M (빌드 스펙 3.1.1절). 소유: home 그룹.
// 데이터: sel:widget.project-health — 진행 중 프로젝트 수, 신호(정상·주의·위험)별 수, 사업별 수, 14일 안 끝나는 프로젝트 3건.
import { StatusTag, type WidgetDef } from "@/components";
import { ListHead, useWidgetData, WidgetState, WRows } from "../lib/widgetKit";
import type { ProjectHealth } from "../lib/types";

const widget: WidgetDef = {
  id: "project-health",
  title: "사업·프로젝트 현황",
  size: "M",
  link: { label: "더보기", to: "/projects" },
  requires: { modules: ["business-structure"] },
  emptyText: "진행 중인 프로젝트가 없어요",
  Body: ({ ctx }) => {
    const state = useWidgetData<ProjectHealth>("project-health", ctx);
    return (
      <WidgetState
        state={state}
        isEmpty={(d) => d.active === 0}
        render={(d) => (
          <>
            <ListHead count={d.active} unit="개" label="진행 중 프로젝트" note={d.lines.map((l) => `${l.name} ${l.count}`).join(" · ")} />
            <div className="wh-tags" aria-label="신호별 프로젝트 수">
              {/* 0개인 신호는 색 없이(neutral): 빨간 '위험 0개'가 경보처럼 읽히지 않게. 색은 수가 있을 때만 */}
              {d.health.map((h) => <StatusTag key={h.label} tone={h.count === 0 ? "neutral" : h.tone} label={`${h.label} ${h.count}개`} />)}
            </div>
            {d.dueSoon.length > 0 ? (
              <>
                <h3 className="wh-sub">14일 안에 끝나는 프로젝트</h3>
                <WRows rows={d.dueSoon} ariaLabel="14일 안에 끝나는 프로젝트" />
              </>
            ) : (
              <p className="ws-t-caption">14일 안에 끝나는 프로젝트는 없어요.</p>
            )}
          </>
        )}
      />
    );
  },
};

export default widget;
