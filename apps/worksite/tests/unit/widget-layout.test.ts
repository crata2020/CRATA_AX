// 홈 배치 어림값(lib/widgetLayout.ts)의 크기가 위젯 파일의 def.size와 같은지 + 전체 폭 규칙(리뷰 3차)
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { WIDGET_LAYOUT, estOf, isFull } from "@/pages/home/lib/widgetLayout";
import { arrangeMasonry } from "@/components/MasonryGrid";

const dir = resolve(__dirname, "../../src/pages/home/widgets");

describe("홈 위젯 배치", () => {
  it("크기 표가 위젯 파일과 같음", () => {
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".tsx"))) {
      const id = f.replace(/\.tsx$/, "") as keyof typeof WIDGET_LAYOUT;
      const m = /\bsize:\s*"([SML])"/.exec(readFileSync(resolve(dir, f), "utf8"));
      expect(WIDGET_LAYOUT[id], id).toBeTruthy();
      expect(WIDGET_LAYOUT[id].size, id).toBe(m?.[1]);
    }
  });
  it("L은 전체 폭, 나머지는 두 줄기 · '오늘' 카드는 어림 높이를 받음", () => {
    expect(isFull("ax-effect")).toBe(true);
    expect(isFull("my-tasks")).toBe(false);
    expect(isFull("today")).toBe(false);
    expect(estOf("today", 420)).toBe(420);
  });
  it("두 줄기: L 앞 구멍은 뒤 카드를 당겨 채우고, 혼자 남은 카드만 전체 폭", () => {
    // CRATA 대표 홈(1440): 사업 현황 짧음 · 검토 대기 · 최근 결정 길음 → AX(L) 앞 오른쪽 줄기에 큰 구멍, 공지가 뒤에 혼자
    const items = [{ key: "a" }, { key: "b" }, { key: "c" }, { key: "L", full: true }, { key: "n" }];
    const h: Record<string, number> = { a: 60, b: 90, c: 110, L: 100, n: 80 };
    const r = arrangeMasonry(items, (k) => h[k]!);
    expect(r.order).toEqual(["a", "b", "c", "n", "L"]);
    expect([...r.wide]).toEqual(["L"]);
    expect([...r.pulled]).toEqual(["n"]);
    // a(100)+c(100)=200 vs b(100) → 구멍 100, n(100)으로 딱 메움 → 당김
    const even = arrangeMasonry(items, (k) => ({ ...h, a: 100, b: 100, c: 100, n: 100 })[k]!);
    expect(even.order).toEqual(["a", "b", "c", "n", "L"]);
    // 뒤 카드가 구멍보다 훨씬 길면(메워도 반대쪽 구멍이 더 커짐) 당기지 않아요
    expect(arrangeMasonry(items, (k) => ({ ...h, n: 160 })[k]!).order).toEqual(["a", "b", "c", "L", "n"]);
    // 구멍이 작으면(줄기 끝이 비슷) 그대로 두고, 뒤 카드는 혼자라 전체 폭
    const balanced = arrangeMasonry([{ key: "a" }, { key: "b" }, { key: "L", full: true }, { key: "n" }], (k) => ({ a: 100, b: 104, L: 50, n: 90 })[k]!);
    expect(balanced.order).toEqual(["a", "b", "L", "n"]);
    expect(balanced.wide.has("n")).toBe(true);
    // 당겨 온 카드가 반 폭에서 조금 길어져도(전체 폭 → 반 폭) 바로 되돌리지 않아요
    const kept = arrangeMasonry(items, (k) => ({ ...h, n: 75 })[k]!, new Set(["n"]));
    expect(kept.order).toEqual(["a", "b", "c", "n", "L"]);
    // L이 맨 앞이거나 L 다음 L이면 당기지 않아요(앞 묶음 없음)
    expect(arrangeMasonry([{ key: "L", full: true }, { key: "x" }, { key: "y" }], () => 50).order).toEqual(["L", "x", "y"]);
  });
});
