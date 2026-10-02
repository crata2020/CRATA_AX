// 서랍·폼을 처음 열 때 불러오기(리뷰 3차 — 목록 화면 첫 묶음에 날짜 선택·폼 부품이 들어가 깊은 링크 첫 화면이 무거웠어요).
// 한 번 열면 계속 붙여 둬서 닫힘 애니메이션은 그대로예요.
import { lazy, Suspense, useEffect, useState, type ComponentType } from "react";

export function lazyDrawer<P extends { open: boolean }>(load: () => Promise<ComponentType<P>>): ComponentType<P> {
  const Inner = lazy(async () => ({ default: await load() })) as unknown as ComponentType<P>;
  function LazyDrawer(props: P) {
    const [mounted, setMounted] = useState(props.open);
    useEffect(() => { if (props.open) setMounted(true); }, [props.open]);
    if (!mounted && !props.open) return null;
    return <Suspense fallback={null}><Inner {...props} /></Suspense>;
  }
  return LazyDrawer;
}

/** 탭처럼 보일 때만 그리는 부품(서랍이 아닌 것) */
export function lazyPart<P extends object>(load: () => Promise<ComponentType<P>>): ComponentType<P> {
  const Inner = lazy(async () => ({ default: await load() })) as unknown as ComponentType<P>;
  function LazyPart(props: P) {
    return <Suspense fallback={null}><Inner {...props} /></Suspense>;
  }
  return LazyPart;
}
