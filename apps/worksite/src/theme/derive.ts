// deriveTenantTheme: 브랜드 씨앗 색 2개 → BrandTokens(빌드 스펙 4.1.3절 OKLCH 규칙)
// 두 데모 테넌트는 ./tenants.ts의 확정 값을 그대로 쓰고, 이 함수는 A-08 미리보기와 새 테넌트에 씁니다.
import type { BrandTokens } from "@/tenants/types";
import { CATEGORICAL_TAIL, INFO_BLUE, STATUS_COLORS } from "./tokens";
import { contrast, hexToOklch, hueDistance, oklchToHex, rgbTriplet } from "./color";

const STEPS = {
  brandWeak: { l: 0.945, c: 0.02 },
  // 07 Orbix 명세 4.1절: 캔버스(panel)는 거의 무채, 카드 테두리·트레이(sunken)는 한 단계 아래, line은 흰 면 위 선
  panel: { l: 0.974, c: 0.004 },
  sunken: { l: 0.953, c: 0.006 },
  line: { l: 0.928, c: 0.008 },
  controlLine: { l: 0.625, c: 0.03 },
  ink: { l: 0.235, c: 0.014 },
  ink2: { l: 0.4, c: 0.02 },
  muted: { l: 0.514, c: 0.025 },
  chartMuted: { l: 0.84, c: 0.016 },
  chartProgress: { l: 0.66, c: 0.11 },
} as const;

export interface ThemeSeed { brand: string; chartAccent: string }

/** 글자 강조색: 브랜드가 ink와 2:1 미만이면(남색·검정에 가까운 브랜드) 같은 색상의 밝은 단계로. 흰 바탕 4.5:1은 지켜요 */
export function brandTextOf(brand: string, ink: string, surface = "#FFFFFF"): string {
  if (contrast(brand, ink) >= 2 || contrast(brand, surface) < 4.5) return brand.toUpperCase();
  const { h } = hexToOklch(brand);
  for (let l = 0.52; l >= 0.4; l -= 0.02) {
    const hex = oklchToHex({ l, c: 0.13, h });
    if (contrast(hex, surface) >= 4.5 && contrast(hex, ink) >= 2) return hex;
  }
  return brand.toUpperCase();
}

/** info 상태색: 브랜드가 good 초록과 ±60° 안이면 고정 파랑, 아니면 브랜드 */
export function infoOf(brand: string, brandWeak: string): BrandTokens["info"] {
  const near = hueDistance(hexToOklch(brand).h, hexToOklch(STATUS_COLORS.good.mark).h) < 60;
  return near ? { ...INFO_BLUE } : { mark: brand.toUpperCase(), bg: brandWeak, fg: brand.toUpperCase() };
}

export function deriveTenantTheme(seed: ThemeSeed): BrandTokens {
  const h = hexToOklch(seed.brand).h;
  const at = (k: keyof typeof STEPS) => oklchToHex({ l: STEPS[k].l, c: STEPS[k].c, h });
  const ink = at("ink");
  const brandWeak = at("brandWeak");
  const accent = seed.chartAccent.toUpperCase();
  return {
    brand: seed.brand.toUpperCase(),
    brandText: brandTextOf(seed.brand, ink),
    info: infoOf(seed.brand, brandWeak),
    brandWeak,
    onBrand: "#FFFFFF",
    onBrand2: brandWeak,
    heroLine: "rgba(255,255,255,0.24)",
    panel: at("panel"),
    sunken: at("sunken"),
    surface: "#FFFFFF",
    line: at("line"),
    controlLine: at("controlLine"),
    ink,
    ink2: at("ink2"),
    muted: at("muted"),
    chartAccent: accent,
    chartMuted: at("chartMuted"),
    // 진행 중 막대는 '완료'(초록)와 붙어 있어서, 브랜드가 초록·청록 쪽이면 파랑 쪽(h 255)으로 옮겨요
    chartProgress: hueDistance(h, hexToOklch(STATUS_COLORS.good.mark).h) < 60
      ? oklchToHex({ l: STEPS.chartProgress.l, c: STEPS.chartProgress.c, h: 255 })
      : at("chartProgress"),
    chartPalette: [accent, ...CATEGORICAL_TAIL] as BrandTokens["chartPalette"],
    // 떠 있는 층: 옅은 1px 고리 + 부드러운 그림자(07 명세 4.2절)
    shadowPop: `0 0 0 1px rgba(${rgbTriplet(ink)},0.06), 0 8px 24px rgba(${rgbTriplet(ink)},0.08)`,
    shadowModal: `0 0 0 1px rgba(${rgbTriplet(ink)},0.06), 0 24px 48px rgba(${rgbTriplet(ink)},0.16)`,
  };
}

export interface ThemeCheck { key: string; label: string; ratio?: number; ok: boolean; level: "pass" | "warn" | "fail"; note: string }

/** A-08 검사: 흰 글자/브랜드 4.5(실패면 저장 막음), 브랜드 글자/흰 바탕 4.5(경고), 상태색 hue ±20°(경고) */
export function checkBrand(t: BrandTokens): ThemeCheck[] {
  const onBrand = contrast(t.onBrand, t.brand);
  const onWhite = contrast(t.brand, t.surface);
  const textOnWhite = contrast(t.brandText, t.surface);
  const textVsInk = contrast(t.brandText, t.ink);
  const brandHue = hexToOklch(t.brand).h;
  const nearStatus = Object.entries(STATUS_COLORS).find(([, v]) => hueDistance(hexToOklch(v.mark).h, brandHue) <= 20);
  return [
    { key: "on-brand", label: "흰 글자 대비", ratio: onBrand, ok: onBrand >= 4.5, level: onBrand >= 4.5 ? "pass" : "fail", note: onBrand >= 4.5 ? "통과" : "4.5:1보다 낮아 저장할 수 없어요" },
    { key: "brand-text", label: "흰 바탕 글자 대비", ratio: onWhite, ok: onWhite >= 4.5, level: onWhite >= 4.5 ? "pass" : "warn", note: onWhite >= 4.5 ? "통과" : "글자에는 더 진한 단계를 써요" },
    { key: "brand-text-ink", label: "강조 글자 / 본문 글자", ratio: textVsInk, ok: textVsInk >= 2 && textOnWhite >= 4.5, level: textVsInk >= 2 && textOnWhite >= 4.5 ? "pass" : "warn", note: textVsInk >= 2 ? `통과(링크·켜진 메뉴 글자 ${t.brandText}, 흰 바탕 ${textOnWhite.toFixed(1)}:1)` : "링크가 본문 글자와 비슷해 보여요" },
    { key: "status-distance", label: "상태색과 거리", ok: !nearStatus, level: nearStatus ? "warn" : "pass", note: nearStatus ? "상태색과 색상이 가까워요" : "통과" },
  ];
}
