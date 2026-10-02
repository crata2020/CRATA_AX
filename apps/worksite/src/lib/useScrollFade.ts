// 가로로 넘치는 영역의 오른쪽 끝을 옅게 가리는 신호(.ws-scroll-fade + is-overflowing / is-at-end).
// 쓰는 법: const ref = useScrollFade<HTMLDivElement>(); <div ref={wrapRef} className="ws-scroll-fade"> 안의 스크롤 요소에 ref.
// wrap(감싸는 요소)에 클래스를 붙이고, scroller(스크롤되는 요소)의 크기·스크롤 위치를 봅니다.
// 렌더마다 요소가 바뀌었는지만 비교하고, 바뀐 때만 다시 구독해요(antd 표가 스크롤 요소를 갈아 끼우는 경우 포함).
import { useEffect, useLayoutEffect, useRef } from "react";

interface Sub { el: HTMLElement; wrap: HTMLElement; inner: Element | null; stop: () => void }

/** selector를 주면 wrap 안에서 그 요소를 스크롤 요소로 씁니다(예: antd 표 ".ant-table-content") */
export function useScrollFade<W extends HTMLElement = HTMLDivElement, S extends HTMLElement = HTMLDivElement>(selector?: string) {
  const scrollerRef = useRef<S>(null);
  const wrapRef = useRef<W>(null);
  const sub = useRef<Sub | null>(null);
  useLayoutEffect(() => {
    const el = selector ? (wrapRef.current?.querySelector<HTMLElement>(selector) ?? null) : scrollerRef.current;
    const wrap = wrapRef.current ?? el?.parentElement ?? null;
    const inner = el?.firstElementChild ?? null;
    const cur = sub.current;
    if (cur && cur.el === el && cur.wrap === wrap && cur.inner === inner) return;
    cur?.stop();
    sub.current = null;
    if (!el || !wrap) return;
    const update = () => {
      const over = el.scrollWidth - el.clientWidth > 1;
      wrap.classList.toggle("is-overflowing", over);
      wrap.classList.toggle("is-at-end", over && el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    ro?.observe(el);
    if (inner) ro?.observe(inner);
    sub.current = { el, wrap, inner, stop: () => { el.removeEventListener("scroll", update); ro?.disconnect(); } };
  });
  useEffect(() => () => { sub.current?.stop(); sub.current = null; }, []);
  return { scrollerRef, wrapRef };
}
