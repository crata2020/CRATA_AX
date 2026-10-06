// BrandTokens → CSS 변수(--ws-*). TenantBoundary가 document.documentElement에 적용합니다.
import type { BrandTokens, Density } from "@/tenants/types";
import { STATUS_COLORS, GOOD_FILL, SPACE, RADIUS, FONT_STACK, LAYOUT } from "./tokens";
import { rgbTriplet } from "./color";

export function themeCssVars(t: BrandTokens): Record<string, string> {
  const vars: Record<string, string> = {
    "--ws-brand": t.brand,
    "--ws-brand-text": t.brandText,
    "--ws-brand-weak": t.brandWeak,
    "--ws-on-brand": t.onBrand,
    "--ws-on-brand-2": t.onBrand2,
    "--ws-hero-line": t.heroLine,
    "--ws-panel": t.panel,
    "--ws-sunken": t.sunken,
    "--ws-surface": t.surface,
    "--ws-line": t.line,
    "--ws-control-line": t.controlLine,
    "--ws-ink": t.ink,
    "--ws-ink-2": t.ink2,
    "--ws-muted": t.muted,
    "--ws-chart-accent": t.chartAccent,
    "--ws-chart-muted": t.chartMuted,
    "--ws-chart-progress": t.chartProgress,
    "--ws-shadow-pop": t.shadowPop,
    "--ws-shadow-modal": t.shadowModal,
    // 세그먼트 선택 칸처럼 트랙 위로 살짝 뜬 흰 면(theme 파일 안에서만 씀)
    "--ws-shadow-raise": `0 0 0 1px rgba(${rgbTriplet(t.ink)},0.06), 0 1px 2px rgba(${rgbTriplet(t.ink)},0.06)`,
    "--ws-font": FONT_STACK,
    // 상태색(고정) + info·neutral(테넌트 색). info는 브랜드가 초록 계열이면 고정 파랑(tenants.ts · derive.ts infoOf)
    "--ws-info-mark": t.info.mark,
    "--ws-info-bg": t.info.bg,
    "--ws-info-fg": t.info.fg,
    "--ws-neutral-mark": t.muted,
    "--ws-neutral-bg": t.panel,
    "--ws-neutral-fg": t.ink2,
    // 흰 면 위 hover는 무채(panel). 선택·켜짐만 --ws-brand-weak
    "--ws-hover": t.panel,
    "--ws-good-fill": GOOD_FILL,
    "--ws-white": "#FFFFFF",
    "--ws-white-rgb": "255,255,255",
  };
  for (const [tone, c] of Object.entries(STATUS_COLORS)) {
    vars[`--ws-${tone}-mark`] = c.mark;
    vars[`--ws-${tone}-bg`] = c.bg;
    vars[`--ws-${tone}-fg`] = c.fg;
  }
  t.chartPalette.forEach((hex, i) => { vars[`--ws-chart-${i + 1}`] = hex; });
  for (const [k, v] of Object.entries(SPACE)) vars[`--ws-space-${k}`] = `${v}px`;
  for (const [k, v] of Object.entries(RADIUS)) vars[`--ws-radius-${k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}`] = `${v}px`;
  for (const [k, v] of Object.entries(LAYOUT)) vars[`--ws-w-${k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}`] = `${v}px`;
  return vars;
}

export function applyThemeToDocument(t: BrandTokens, slug: string, density: Density) {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(themeCssVars(t))) root.style.setProperty(k, v);
  root.setAttribute("data-tenant", slug);
  root.setAttribute("data-density", density);
}
