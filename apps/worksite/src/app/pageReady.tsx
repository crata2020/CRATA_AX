// 페이지 준비 신호(빌드 스펙 3.0절 1번): 첫 데이터 요청이 끝나면(성공·빈·오류 모두) 페이지 루트에 data-page-ready를 붙입니다.
// 쓰는 법(페이지·컴포넌트 아무 곳): usePageReady(!query.isLoading). DataTable·WidgetSlot은 알아서 부릅니다.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type Hold = () => () => void;
const Ctx = createContext<Hold | null>(null);

/** 라우트마다 하나. 붙잡은(hold) 것이 모두 풀리면 data-page-ready */
export function PageReadyRoot({ children }: { children: ReactNode }) {
  const [holds, setHolds] = useState(0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const hold = useCallback<Hold>(() => {
    setHolds((n) => n + 1);
    let released = false;
    return () => { if (!released) { released = true; setHolds((n) => n - 1); } };
  }, []);
  const ready = mounted && holds === 0;
  return (
    <Ctx.Provider value={hold}>
      <div data-page-root {...(ready ? { "data-page-ready": "" } : {})}>{children}</div>
    </Ctx.Provider>
  );
}

/** ready가 false인 동안 페이지 준비를 붙잡습니다 */
export function usePageReady(ready: boolean) {
  const hold = useContext(Ctx);
  useEffect(() => {
    if (ready || !hold) return;
    return hold();
  }, [ready, hold]);
}
