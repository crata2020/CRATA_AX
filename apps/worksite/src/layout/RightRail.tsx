// RightRail(빌드 스펙 2.5절, 07 명세 5.1): 홈에서만, 1440px 이상에서만. 블록은 카드가 아니라([data-card] 없음) 캔버스 위 흰 블록
// (.ws-rail__block: 흰 면 + 1px sunken 선 + 라운드 12) 안에 소제목 h2.ws-rail__title + ListRows.
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
    <div className="ws-rail__stack">
      {shown.map((b) => (
        <section key={b.title} className="ws-rail__block" aria-label={b.title}>
          <h2 className="ws-rail__title">{b.title}</h2>
          <ListRows rows={b.items} />
        </section>
      ))}
    </div>,
    node,
  );
}
