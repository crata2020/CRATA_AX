// MasonryGrid: 높이가 서로 다른 카드를 두 줄기(왼쪽·오른쪽)로 쌓는 그리드(리뷰 3차 — 줄마다 키가 다른 카드 옆에 패널 구멍이 생기던 문제).
// CSS 그리드의 작은 줄(4px)에 카드마다 '실제 높이 + 간격'만큼 줄을 차지하게 해서, 브라우저 자동 배치가 더 짧은 줄기 아래에 다음 카드를 놓아요.
// DOM 순서 = 보이는 순서(탭 순서·스크린리더 순서가 화면과 같음). 카드를 옮겨도 다시 마운트되지 않아요(key로 옮김).
// full 항목(L 위젯)은 두 줄기 사이에 전체 폭. 1024 미만은 한 줄기(원래 순서대로).
// balance(홈): ① 전체 폭 카드 바로 앞에서 두 줄기 끝이 크게 어긋나면(패널 구멍) 바로 뒤 카드를 앞으로 당겨 짧은 줄기를 채워요.
//              ② 전체 폭 카드 사이에 혼자 남은 카드는 옆 줄기가 비므로 전체 폭으로 늘려요. ①은 잰 높이로 정하고, 한번 당긴 카드는
//              크게 나빠지지 않는 한 그 자리에 둬요(전체 폭과 반 폭 사이에서 높이가 바뀌며 왔다 갔다 하지 않게).
//              자리(순서·당김)는 폭이 바뀌거나 어느 카드가 16px 넘게 달라질 때만 다시 정해요(글꼴 교체 뒤 카드가 옆 줄기로 뛰지 않게, 리뷰 5차).
// 줄기 끝 맞추기(모든 MasonryGrid, 두 줄기일 때): 전체 폭 카드 바로 앞에서 두 줄기의 마지막 카드를 같은 아래 선까지 늘려요
//              (Orbix처럼 한 줄의 카드가 아래 끝을 함께 씀 — 전체 폭 카드 위에 회색 구멍이 남지 않게). 짧은 줄기의 마지막 카드는
//              모자란 줄 수만큼 더 차지해요(grow). 히어로는 늘리지 않아요(3.3).
//              · 늘린 카드의 내용은 늘 위에 붙어 있어요(목록을 아래로 떼어 놓지 않음 — '덜 불러온 위젯'처럼 보였음, 리뷰 5차).
//                48px 이상 늘린 카드(.is-roomy)는 머리의 더보기 알약을 아래 끝 꼬리 줄(SectionCard .ws-card__foot)로 옮겨 빈 높이가 의도로 읽히게 해요
//                (한 카드에 링크 하나, 리뷰 6차). 늘린 높이는 칸에 --ws-grow(px)로 넘겨요 — 목록 위젯이 남는 자리에 줄을 더 보여 줄 때 씀
//                (주의: 더 보여 준 줄도 다음 잼에 들어가 --ws-grow가 그만큼 줄어요. 줄 수는 쌓아 가며 정해야 왔다 갔다 하지 않아요).
//              · 다 늘리거나 아예 안 늘려요(반쯤 늘려 흰 판과 회색 구멍이 함께 생기지 않게). 그리드 끝은 96px(END_GROW_CAP)까지만 —
//                더 모자라면 페이지 끝이 들쭉날쭉한 채로 둬요. 전체 폭 카드 앞은 240px(MID_GROW_CAP)까지.
//              잴 때는 늘림을 잠시 끄고(.is-measuring) 내용 높이만 재요(늘린 높이가 다음 계산에 다시 들어가지 않게).
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
/** 그리드 끝에서 짧은 줄기 카드를 늘리는 한도(줄 수) = 96px. 이만큼은 카드 아래 여백처럼 읽혀요. 더 모자라면 늘리지 않아요 */
export const END_GROW_CAP = 24;
/** 전체 폭 카드 앞에서 늘리는 한도(줄 수) = 240px. 더 모자라면 늘리지 않고 캔버스 간격으로 둬요 */
export const MID_GROW_CAP = 60;
/** 이만큼(줄 수) 이상 늘린 카드는 아래 끝에 '전체 보기' 줄을 보여요(.is-roomy) = 48px */
export const ROOMY_MIN = 12;
/** 자리(순서·당김)를 다시 정하는 높이 변화(줄 수) = 16px. 이보다 작은 변화는 줄 수만 고치고 자리는 그대로 */
const REARRANGE = 4;

export interface MasonryArrangement {
  order: string[];
  /** 전체 폭으로 그릴 key(L + 혼자 남은 카드) */
  wide: Set<string>;
  /** 전체 폭 카드 앞으로 당겨 온 key */
  pulled: Set<string>;
  /** 줄기 끝 맞추기: 묶음(전체 폭 카드 앞·그리드 끝)마다 두 줄기의 마지막 카드 → 더 차지할 줄 수(긴 줄기 쪽·한도를 넘으면 0) */
  grow: Map<string, number>;
}

/**
 * 줄기 끝 맞추기(순수 함수). 정해진 순서·전체 폭 집합으로 브라우저 자동 배치(더 짧은 줄기, 같으면 왼쪽)를 따라가며,
 * 전체 폭 카드 바로 앞과 끝에서 두 줄기에 모두 카드가 있으면 각 줄기의 마지막 카드가 더 차지할 줄 수를 돌려줘요.
 * 모자란 만큼 다 늘리거나(그리드 끝 END_GROW_CAP·전체 폭 카드 앞 MID_GROW_CAP 줄 이하) 아예 늘리지 않아요(0).
 * 늘려도 다음 카드 자리는 그대로예요(전체 폭 카드는 어차피 긴 줄기 아래에 놓여요).
 */
export function growMasonry(order: string[], wide: ReadonlySet<string>, span: (key: string) => number): Map<string, number> {
  const grow = new Map<string, number>();
  let l = 0;
  let r = 0;
  let lastL: string | null = null;
  let lastR: string | null = null;
  const close = (atEnd: boolean) => {
    if (lastL && lastR) {
      const end = Math.max(l, r);
      const cap = atEnd ? END_GROW_CAP : MID_GROW_CAP;
      // 반쯤 늘리면 카드 안 빈 흰 면과 줄기 끝 어긋남이 함께 생겨요 → 한도를 넘으면 늘리지 않아요
      const fill = (deficit: number) => (deficit <= cap ? deficit : 0);
      grow.set(lastL, fill(end - l));
      grow.set(lastR, fill(end - r));
    }
    lastL = lastR = null;
  };
  for (const k of order) {
    if (wide.has(k)) {
      close(false);
      l = r = Math.max(l, r) + span(k);
    } else if (l <= r) {
      l += span(k);
      lastL = k;
    } else {
      r += span(k);
      lastR = k;
    }
  }
  close(true);
  return grow;
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
  return { order, wide, pulled, grow: growMasonry(order, wide, span) };
}

interface Measured { spans: Record<string, number>; cols: 1 | 2; width: number }

/** 자리를 다시 정할 만큼 달라졌는지: 폭이 바뀌었거나, 카드가 생기거나 빠졌거나, 어느 카드가 REARRANGE 줄 넘게 달라짐 */
function movedEnough(prev: Measured, next: Measured): boolean {
  if (prev.cols !== next.cols || prev.width !== next.width) return true;
  const keys = Object.keys(next.spans);
  if (keys.length !== Object.keys(prev.spans).length) return true;
  return keys.some((k) => prev.spans[k] === undefined || Math.abs(prev.spans[k]! - next.spans[k]!) > REARRANGE);
}

export function MasonryGrid({ items, className, balance = false }: { items: MasonryItem[]; className?: string; balance?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<Measured>({ spans: {}, cols: 2, width: 0 });
  const keepRef = useRef<ReadonlySet<string>>(new Set());
  /** 자리 정하기에 쓴 잰 값(작은 변화에는 그대로) */
  const settledRef = useRef<Measured>(measured);
  const keys = items.map((i) => i.key).join("|");

  const byKey = new Map(items.map((i) => [i.key, i]));
  const estSpan = (k: string) => Math.ceil(((byKey.get(k)?.est ?? 300) + 24) / UNIT);
  const spanOf = (k: string) => measured.spans[k] ?? estSpan(k);
  const arr = useMemo<MasonryArrangement>(() => {
    if (measured.cols === 1) {
      return { order: items.map((i) => i.key), wide: new Set(items.filter((i) => i.full).map((i) => i.key)), pulled: new Set(), grow: new Map() };
    }
    if (!balance) {
      const order = items.map((i) => i.key);
      const wide = new Set(items.filter((i) => i.full).map((i) => i.key));
      return { order, wide, pulled: new Set(), grow: growMasonry(order, wide, spanOf) };
    }
    // 자리(순서·당김·전체 폭)는 자리 정하기용 값으로, 줄기 끝 맞추기(grow)는 지금 잰 값으로(아래 끝이 정확히 맞게)
    if (movedEnough(settledRef.current, measured)) settledRef.current = measured;
    const settled = settledRef.current.spans;
    const placed = arrangeMasonry(items, (k) => settled[k] ?? spanOf(k), keepRef.current);
    return { ...placed, grow: growMasonry(placed.order, placed.wide, spanOf) };
    // items는 매번 새 배열이라 key 목록과 잰 값으로만 다시 계산해요
  }, [keys, measured, balance]);
  keepRef.current = arr.pulled;

  useLayoutEffect(() => {
    const grid = ref.current;
    if (!grid) return;
    let frame = 0;
    let alive = true;
    const measure = () => {
      const cs = getComputedStyle(grid);
      if (cs.display !== "grid") { // 한 줄기(flex)일 때는 줄 수를 쓰지 않고 원래 순서로
        setMeasured((prev) => (prev.cols === 1 ? prev : { spans: prev.spans, cols: 1, width: grid.clientWidth }));
        return;
      }
      const gap = parseFloat(cs.columnGap) || 0;
      const width = grid.clientWidth;
      const next: Record<string, number> = {};
      // 늘린 카드(.is-grown)는 잠시 내용 높이로 돌려 놓고 재요. 같은 틀 안에서 되돌려 화면·ResizeObserver에는 보이지 않아요
      grid.classList.add("is-measuring");
      try {
        for (const el of Array.from(grid.children) as HTMLElement[]) {
          const k = el.dataset.key;
          if (!k) continue;
          const h = el.getBoundingClientRect().height;
          next[k] = Math.max(1, Math.ceil((h + gap) / UNIT));
        }
      } finally {
        grid.classList.remove("is-measuring");
      }
      setMeasured((prev) => {
        const same = prev.cols === 2 && prev.width === width && Object.keys(next).length === Object.keys(prev.spans).length
          && Object.entries(next).every(([k, v]) => prev.spans[k] === v);
        return same ? prev : { spans: next, cols: 2, width };
      });
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!alive) return;
        // 새로 생긴 칸도 크기 변화를 지켜봐요
        if (ro) for (const el of Array.from(grid.children)) ro.observe(el);
        measure();
      });
    };
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    measure();
    if (ro) {
      ro.observe(grid);
      for (const el of Array.from(grid.children)) ro.observe(el);
    }
    // 늘린 칸은 높이가 그리드 줄로 정해져 안쪽 내용이 바뀌어도 크기 알림이 오지 않아요 → 내용이 바뀌면(위젯 불러옴·데이터) 다시 재요
    const mo = typeof MutationObserver === "undefined" ? null : new MutationObserver(schedule);
    mo?.observe(grid, { childList: true, subtree: true, characterData: true });
    // 웹 글꼴이 바뀐 뒤 한 번 더(첫 잼은 대체 글꼴 높이일 수 있어요)
    const fonts = typeof document !== "undefined" ? document.fonts : undefined;
    void fonts?.ready.then(schedule);
    fonts?.addEventListener?.("loadingdone", schedule);
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      ro?.disconnect();
      mo?.disconnect();
      fonts?.removeEventListener?.("loadingdone", schedule);
    };
  }, [keys]);

  return (
    <div ref={ref} className={`ws-masonry${className ? ` ${className}` : ""}`}>
      {arr.order.map((k) => {
        const it = byKey.get(k)!;
        const grow = arr.grow.get(k);
        const style: CSSProperties = { gridRowEnd: `span ${spanOf(k) + (grow ?? 0)}` };
        if (grow) (style as Record<string, string | number>)["--ws-grow"] = `${grow * UNIT}px`;
        return (
          <div key={k} data-key={k} className={`ws-masonry__item${arr.wide.has(k) ? " is-full" : ""}${grow !== undefined ? " is-grown" : ""}${(grow ?? 0) >= ROOMY_MIN ? " is-roomy" : ""}`} style={style}>
            {it.node}
          </div>
        );
      })}
    </div>
  );
}
