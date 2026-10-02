// 홈 배치 어림값(lib/widgetLayout.ts)의 크기가 위젯 파일의 def.size와 같은지 + 두 줄기 나누기 규칙(리뷰 3차)
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { WIDGET_LAYOUT, packHome } from "@/pages/home/lib/widgetLayout";

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
  it("L은 전체 폭, 나머지는 어림 높이가 낮은 줄기로", () => {
    const segs = packHome(["my-tasks", "notices", "mfg-claims-8d", "ax-effect", "review-queue"]);
    expect(segs[0]).toEqual({ kind: "cols", cols: [["my-tasks"], ["notices", "mfg-claims-8d"]] });
    expect(segs[1]).toEqual({ kind: "full", id: "ax-effect" });
    expect(segs[2]).toEqual({ kind: "cols", cols: [["review-queue"], []] });
  });
});
