// RightRail(빌드 스펙 2.5절): 홈에서만, 1440px 이상에서만. 블록은 카드가 아니라 흰 바탕 위 소제목 + ListRow + 1px 구분선.
// 항목이 없는 블록은 숨기고, 모두 비면 레일 전체를 숨깁니다. 1440 미만이면 null(홈은 같은 내용을 '오늘' 카드로 그림: useRailVisible()).
// 쓰는 법(홈 페이지 안): <RightRail blocks={[{ title: "필독 공지", items: [...] }, …]} />
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useBreakpoint } from "@/lib/useBreakpoint";
import { ListRows, type ListRowProps } from "@/components/ListRow";

export interface RailCtxValue { node: HTMLElement | null; setActive: (on: boolean) => void }
export const RailCtx = createContext<RailCtxValue>({ node: null, setActive: () => {} });

/** 레일이 보이는 화면 폭인지(1440 이상). 아니면 홈 본문에 '오늘' 카드를 그리세요 */
export const useRailVisible = () => useBreakpoint() === "wide";

export interface RightRailProps { blocks: { title: string; items: ListRowProps[] }[]; children?: ReactNode }

export function RightRail({ blocks }: RightRailProps) {
  const { node, setActive } = useContext(RailCtx);
  const visible = useRailVisible();
  const shown = blocks.filter((b) => b.items.length > 0);
  const active = visible && shown.length > 0;
  useEffect(() => {
    setActive(active);
    return () => setActive(false);
  }, [active, setActive]);
  if (!active || !node) return null;
  return createPortal(
    <div className="ws-stack" style={{ gap: 28 }}>
      {shown.map((b) => (
        <section key={b.title} aria-label={b.title}>
          <h2 className="ws-t-title-card" style={{ marginBottom: 8 }}>{b.title}</h2>
          <ListRows rows={b.items} />
        </section>
      ))}
    </div>,
    node,
  );
}
