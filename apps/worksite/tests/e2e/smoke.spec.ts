/// <reference types="node" />
// 라우트 스모크(빌드 스펙 8.2절): 두 테넌트 × 기본 페르소나 × 매니페스트 63개 경로 × 데스크톱·모바일.
// 각 화면: console.error·pageerror 0, h1 정확히 1개, [data-demo-badge] 보임, 가로 넘침 없음, 3초 안에 [data-page-ready], 카드 중첩 없음.
// 다른 페르소나: AS=R_OPERATOR npm run smoke
import { test, expect } from "@playwright/test";
import { MANIFEST, samplePath } from "../../src/routes/manifest";

const tenants = ["tr-technology", "crata-demo"] as const;
const viewports = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } } as const;
const as = process.env.AS ? `&as=${process.env.AS}` : "";

for (const tenant of tenants) {
  for (const [vpName, viewport] of Object.entries(viewports)) {
    test.describe(`${tenant} ${vpName}`, () => {
      test.use({ viewport });
      for (const entry of MANIFEST) {
        const path = samplePath(entry, tenant);
        test(`${entry.id} ${path}`, async ({ page }) => {
          const errors: string[] = [];
          page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
          page.on("pageerror", (e) => errors.push(e.message));
          await page.goto(`./?tenant=${tenant}${as}&latency=0&persist=0#${path}`);
          await page.waitForSelector("[data-page-ready]", { timeout: 3000 });
          const info = await page.evaluate(() => ({
            h1: document.querySelectorAll("h1").length,
            badge: !!document.querySelector("[data-demo-badge]"),
            overflow: document.documentElement.scrollWidth > window.innerWidth,
            nested: document.querySelectorAll("[data-card] [data-card]").length,
            // 카드 안 '카드처럼 보이는' 상자: 라운드 12 이상 + 카드와 다른 바탕 + 160×64 이상(칩·버튼·태그·말풍선 제외)
            nestedLook: (() => {
              const out: string[] = [];
              for (const card of document.querySelectorAll("[data-card]")) {
                const bg = getComputedStyle(card).backgroundColor;
                for (const el of card.querySelectorAll<HTMLElement>("*")) {
                  if (el.closest(".ant-select, .ant-btn, .ant-input-affix-wrapper, .ant-input, .ant-picker, button, input, textarea, .ant-popover, .ant-dropdown, .ant-tooltip, .ant-segmented, [data-bubble]")) continue;
                  const cs = getComputedStyle(el);
                  if (!(parseFloat(cs.borderTopLeftRadius) >= 12)) continue;
                  const b = cs.backgroundColor;
                  if (!b || b === "rgba(0, 0, 0, 0)" || b === "transparent" || b === bg) continue;
                  const r = el.getBoundingClientRect();
                  if (r.width >= 160 && r.height >= 64) out.push(el.className);
                }
              }
              return out;
            })(),
            heroes: document.querySelectorAll("[data-hero]").length,
            pills: document.querySelectorAll("[data-pill]").length,
          }));
          expect(errors, errors.join("\n")).toEqual([]);
          expect(info.h1).toBe(1);
          expect(info.badge).toBe(true);
          expect(info.overflow).toBe(false);
          expect(info.nested).toBe(0);
          expect(info.nestedLook, "카드 안 카드처럼 보이는 상자").toEqual([]);
          expect(info.heroes).toBeLessThanOrEqual(1);
          expect(info.pills).toBeLessThanOrEqual(3);
        });
      }
    });
  }
}

// 키보드 초점(리뷰 2차): antd·Refine 리셋의 `a:focus { outline: 0 }`이 앱의 초점 선을 덮지 않는지 — 메뉴 링크·목록 줄·더보기
test.describe("키보드 초점 선", () => {
  test.use({ viewport: viewports.desktop });
  test("메뉴 링크와 카드 링크에 초점 선이 보임", async ({ page }) => {
    await page.goto(`./?tenant=tr-technology&latency=0&persist=0#/`);
    await page.waitForSelector("[data-page-ready]", { timeout: 3000 });
    const styleOf = async (sel: string) => {
      await page.locator(sel).first().focus();
      // :focus-visible이 켜지게 키보드로 한 번 움직였다 돌아옴
      await page.keyboard.press("Tab");
      await page.keyboard.press("Shift+Tab");
      return page.evaluate(() => { const a = document.activeElement as HTMLElement; const s = getComputedStyle(a); return { cls: a.className, style: s.outlineStyle, width: s.outlineWidth }; });
    };
    for (const sel of ["a.ws-nav__link", "a.ws-card__more"]) {
      const s = await styleOf(sel);
      expect(s.style, `${sel} 초점 선`).not.toBe("none");
    }
  });
});
