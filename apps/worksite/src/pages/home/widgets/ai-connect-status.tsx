// 홈 위젯 ai-connect-status · 내 AI 연결 · 템플릿 list · 크기 S (빌드 스펙 3.1.1절). 소유: home 그룹.
// 데이터: sel:widget.ai-connect-status — 내 연결(끊지 않은 것)의 클라이언트 이름·마지막 사용. 없으면 [연결하기].
import { Link } from "react-router";
import type { WidgetDef } from "@/components";
import { ListHead, useWidgetData, WidgetState, WRows } from "../lib/widgetKit";
import type { AiConnect } from "../lib/types";

const widget: WidgetDef = {
  id: "ai-connect-status",
  title: "내 AI 연결",
  size: "S",
  link: { label: "더보기", to: "/me/ai" },
  requires: { modules: ["ai-connect"] },
  emptyText: "아직 연결한 AI가 없어요",
  Body: ({ ctx }) => {
    const state = useWidgetData<AiConnect>("ai-connect-status", ctx);
    return (
      <WidgetState
        state={state}
        render={(d) => {
          if (!d.enabled) return <p className="ws-t-body ws-ink-2">회사에서 AI 연결을 꺼 두었어요.</p>;
          if (!d.rows.length) {
            return (
              <>
                <p className="ws-t-body ws-ink-2" style={{ marginBottom: 12 }}>아직 연결한 AI가 없어요. 쓰던 AI를 연결하면 업무를 바로 이어서 할 수 있어요.</p>
                <Link className="wh-linkbtn wh-linkbtn--primary" to="/me/ai">연결하기</Link>
              </>
            );
          }
          return (
            <>
              <ListHead count={d.rows.length} unit="개" label="연결된 AI" />
              <WRows rows={d.rows} ariaLabel="연결된 AI" />
            </>
          );
        }}
      />
    );
  },
};

export default widget;
