// MasonryGrid: 높이가 서로 다른 카드를 두 줄기(왼쪽·오른쪽)로 쌓는 그리드(리뷰 3차 — 줄마다 키가 다른 카드 옆에 패널 구멍이 생기던 문제).
// CSS 그리드의 작은 줄(4px)에 카드마다 '실제 높이 + 간격'만큼 줄을 차지하게 해서, 브라우저 자동 배치가 더 짧은 줄기 아래에 다음 카드를 놓아요.
// DOM 순서 = 보이는 순서(탭 순서·스크린리더 순서가 화면과 같음). 카드를 옮겨도 다시 마운트되지 않아요(key로 옮김).
// full 항목(L 위젯)은 두 줄기 사이에 전체 폭. 1024 미만은 한 줄기(원래 순서대로).
// balance(홈): ① 전체 폭 카드 바로 앞에서 두 줄기 끝이 크게 어긋나면(패널 구멍) 바로 뒤 카드를 앞으로 당겨 짧은 줄기를 채워요.
//              ② 전체 폭 카드 사이에 혼자 남은 카드는 옆 줄기가 비므로 전체 폭으로 늘려요. ①은 잰 높이로 정하고, 한번 당긴 카드는
//              크게 나빠지지 않는 한 그 자리에 둬요(전체 폭과 반 폭 사이에서 높이가 바뀌며 왔다 갔다 하지 않게).
import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";

export interface MasonryItem {
  key: string;
  node: ReactNode;
  /** 두 줄기를 다 차지(L 위젯) */
  full?: boolean;
  /** 재기 전 어림 높이(px). 첫 그림에서 크게 움직이지 않게 */
  est?: number;
}

const UNIT = 4;
/** 당기려면 구멍이 이만큼(줄 수, 4px 단위) 이상 줄어야 해요 = 60px */
const MIN_GAIN = 15;
/** 이미 당긴 카드는 구멍이 이만큼 커지기 전까지 그대로 = 40px */
const KEEP = 10;

export interface MasonryArrangement {
  order: string[];
  /** 전체 폭으로 그릴 key(L + 혼자 남은 카드) */
  wide: Set<string>;
  /** 전체 폭 카드 앞으로 당겨 온 key */
  pulled: Set<string>;
}

/**
 * 두 줄기 배치 순서를 정해요(순수 함수, tests/unit/widget-layout.test.ts).
 * span(key) = 카드가 차지하는 4px 줄 수. 브라우저 자동 배치와 같게 더 짧은 줄기(같으면 왼쪽)에 놓는다고 보고 계산해요.
 */
export function arrangeMasonry(
  items: { key: string; full?: boolean }[],
  span: (key: string) => number,
  keepPulled: ReadonlySet<string> = new Set(),
): MasonryArrangement {
  const order: string[] = [];
  const pulled = new Set<string>();
  let l = 0;
  let r = 0;
  const place = (key: string) => {
    if (l <= r) l += span(key);
    else r += span(key);
    order.push(key);
  };
  const rest = [...items];
  while (rest.length) {
    const it = rest.shift()!;
    if (!it.full) { place(it.key); continue; }
    // 전체 폭 카드 앞: 앞 묶음의 두 줄기 차이(구멍)를 바로 뒤 카드로 메울 수 있으면 당겨 와요
    while (l !== r && rest[0] && !rest[0].full) {
      const hole = Math.abs(l - r);
      const gain = hole - Math.abs(span(rest[0].key) - hole);
      if (gain < (keepPulled.has(rest[0].key) ? -KEEP : MIN_GAIN)) break;
      const p = rest.shift()!;
      pulled.add(p.key);
      place(p.key);
    }
    order.push(it.key);
    l = r = Math.max(l, r) + span(it.key);
  }
  const isFull = new Map(items.map((i) => [i.key, !!i.full]));
  const wide = new Set(order.filter((k, i) => isFull.get(k)
    || ((i === 0 || isFull.get(order[i - 1]!)) && (i === order.length - 1 || isFull.get(order[i + 1]!)))));
  return { order, wide, pulled };
}

interface Measured { spans: Record<string, number>; cols: 1 | 2 }

export function MasonryGrid({ items, className, balance = false }: { items: MasonryItem[]; className?: string; balance?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<Measured>({ spans: {}, cols: 2 });
  const keepRef = useRef<ReadonlySet<string>>(new Set());
  const keys = items.map((i) => i.key).join("|");

  const byKey = new Map(items.map((i) => [i.key, i]));
  const spanOf = (k: string) => measured.spans[k] ?? Math.ceil(((byKey.get(k)?.est ?? 300) + 24) / UNIT);
  const arr = useMemo<MasonryArrangement>(() => {
    if (!balance || measured.cols === 1) {
      return { order: items.map((i) => i.key), wide: new Set(items.filter((i) => i.full).map((i) => i.key)), pulled: new Set() };
    }
    return arrangeMasonry(items, spanOf, keepRef.current);
    // items는 매번 새 배열이라 key 목록과 잰 값으로만 다시 계산해요
  }, [keys, measured, balance]);
  keepRef.current = arr.pulled;

  useLayoutEffect(() => {
    const grid = ref.current;
    if (!grid) return;
    let frame = 0;
    const measure = () => {
      const cs = getComputedStyle(grid);
      if (cs.display !== "grid") { // 한 줄기(flex)일 때는 줄 수를 쓰지 않고 원래 순서로
        setMeasured((prev) => (prev.cols === 1 ? prev : { spans: prev.spans, cols: 1 }));
        return;
      }
      const gap = parseFloat(cs.columnGap) || 0;
      const next: Record<string, number> = {};
      for (const el of Array.from(grid.children) as HTMLElement[]) {
        const k = el.dataset.key;
        if (!k) continue;
        const h = el.getBoundingClientRect().height;
        next[k] = Math.max(1, Math.ceil((h + gap) / UNIT));
      }
      setMeasured((prev) => {
        const same = prev.cols === 2 && Object.keys(next).length === Object.keys(prev.spans).length
          && Object.entries(next).every(([k, v]) => prev.spans[k] === v);
        return same ? prev : { spans: next, cols: 2 };
      });
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    measure();
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    if (ro) {
      ro.observe(grid);
      for (const el of Array.from(grid.children)) ro.observe(el);
    }
    return () => { cancelAnimationFrame(frame); ro?.disconnect(); };
  }, [keys]);

  return (
    <div ref={ref} className={`ws-masonry${className ? ` ${className}` : ""}`}>
      {arr.order.map((k) => {
        const it = byKey.get(k)!;
        const style: CSSProperties = { gridRowEnd: `span ${spanOf(k)}` };
        return (
          <div key={k} data-key={k} className={`ws-masonry__item${arr.wide.has(k) ? " is-full" : ""}`} style={style}>
            {it.node}
          </div>
        );
      })}
    </div>
  );
}
