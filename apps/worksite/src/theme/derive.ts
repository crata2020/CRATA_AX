// deriveTenantTheme: 브랜드 씨앗 색 2개 → BrandTokens(빌드 스펙 4.1.3절 OKLCH 규칙)
// 두 데모 테넌트는 ./tenants.ts의 확정 값을 그대로 쓰고, 이 함수는 A-08 미리보기와 새 테넌트에 씁니다.
import type { BrandTokens } from "@/tenants/types";
import { CATEGORICAL_TAIL, STATUS_COLORS } from "./tokens";
import { contrast, hexToOklch, hueDistance, oklchToHex, rgbTriplet } from "./color";

const STEPS = {
  brandWeak: { l: 0.945, c: 0.02 },
  panel: { l: 0.97, c: 0.008 },
  line: { l: 0.925, c: 0.012 },
  controlLine: { l: 0.625, c: 0.03 },
  ink: { l: 0.235, c: 0.014 },
  ink2: { l: 0.4, c: 0.02 },
  muted: { l: 0.514, c: 0.025 },
  chartMuted: { l: 0.84, c: 0.016 },
  chartProgress: { l: 0.66, c: 0.11 },
} as const;

export interface ThemeSeed { brand: string; chartAccent: string }

export function deriveTenantTheme(seed: ThemeSeed): BrandTokens {
  const h = hexToOklch(seed.brand).h;
  const at = (k: keyof typeof STEPS) => oklchToHex({ l: STEPS[k].l, c: STEPS[k].c, h });
  const ink = at("ink");
  const brandWeak = at("brandWeak");
  const accent = seed.chartAccent.toUpperCase();
  return {
    brand: seed.brand.toUpperCase(),
    brandWeak,
    onBrand: "#FFFFFF",
    onBrand2: brandWeak,
    heroLine: "rgba(255,255,255,0.24)",
    panel: at("panel"),
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
    shadowPop: `0 8px 24px rgba(${rgbTriplet(ink)},0.12)`,
    shadowModal: `0 16px 48px rgba(${rgbTriplet(ink)},0.18)`,
  };
}

export interface ThemeCheck { key: string; label: string; ratio?: number; ok: boolean; level: "pass" | "warn" | "fail"; note: string }

/** A-08 검사: 흰 글자/브랜드 4.5(실패면 저장 막음), 브랜드 글자/흰 바탕 4.5(경고), 상태색 hue ±20°(경고) */
export function checkBrand(t: BrandTokens): ThemeCheck[] {
  const onBrand = contrast(t.onBrand, t.brand);
  const onWhite = contrast(t.brand, t.surface);
  const brandHue = hexToOklch(t.brand).h;
  const nearStatus = Object.entries(STATUS_COLORS).find(([, v]) => hueDistance(hexToOklch(v.mark).h, brandHue) <= 20);
  return [
    { key: "on-brand", label: "흰 글자 대비", ratio: onBrand, ok: onBrand >= 4.5, level: onBrand >= 4.5 ? "pass" : "fail", note: onBrand >= 4.5 ? "통과" : "4.5:1보다 낮아 저장할 수 없어요" },
    { key: "brand-text", label: "흰 바탕 글자 대비", ratio: onWhite, ok: onWhite >= 4.5, level: onWhite >= 4.5 ? "pass" : "warn", note: onWhite >= 4.5 ? "통과" : "글자에는 더 진한 단계를 써요" },
    { key: "status-distance", label: "상태색과 거리", ok: !nearStatus, level: nearStatus ? "warn" : "pass", note: nearStatus ? "상태색과 색상이 가까워요" : "통과" },
  ];
}
