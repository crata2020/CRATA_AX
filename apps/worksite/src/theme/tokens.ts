// 플랫폼 고정 디자인 토큰(빌드 스펙 4장). 테넌트 색은 ./tenants.ts.
// 색 hex는 src/theme/ 안에서만 씁니다. 컴포넌트는 CSS 변수(--ws-*)만 씁니다.

export type Tone = "good" | "warning" | "serious" | "critical" | "info" | "neutral";

/** 상태색(4.1.2절). 테마와 무관하게 고정. info·neutral은 테넌트 색에서 옵니다(cssVars.ts). */
export const STATUS_COLORS = {
  good: { mark: "#0CA30C", bg: "#E7F5E7", fg: "#0B6B0B" },
  warning: { mark: "#FAB219", bg: "#FEF3D6", fg: "#7A5300" },
  serious: { mark: "#EC835A", bg: "#FDEEE7", fg: "#9A3F16" },
  critical: { mark: "#D03B3B", bg: "#FBE8E8", fg: "#A82727" },
} as const;

/** 브랜드가 good 초록과 가까운 테넌트(±60°)의 info 상태색. mark 흰 바탕 4.14:1(표시용) · fg 흰 바탕 7.34:1 · fg/bg 6.41:1 */
export const INFO_BLUE = { mark: "#4F7BD0", bg: "#E9F0FB", fg: "#2A549E" } as const;

/** 넓은 면(누적 막대의 가동·완료 같은 '평상시' 다수)에 쓰는 차분한 초록. 진한 good.mark(#0CA30C)는 아이콘·점·작은 표시에만.
 *  validate_palette.js(라이트): 설비 상태 순서 [이 색, warning, critical, neutral, chart-muted] 인접 CVD ΔE 8.7(글자 범례 필수) · 일반 20.8 */
export const GOOD_FILL = "#5DAA6E";

/** 차트 범주 팔레트 슬롯 2~8(4.1.4절, validate_palette.js 통과 순서). 슬롯 1은 테넌트 chartAccent */
export const CATEGORICAL_TAIL = ["#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"] as const;

/** 브랜드·테마 화면의 차트 강조 '검사 통과 목록'(A-08) */
export const CHART_ACCENT_CHOICES = ["#3A5BA8", "#00897B", "#2A78D6"] as const;

export const FONT_STACK = '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif';

/** 간격 4px 단위(4.3절) */
export const SPACE = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 } as const;

/** 라운드 위계(4.4절) */
export const RADIUS = { panel: 28, card: 20, bubble: 16, control: 12, input: 10, chip: 8, pill: 999, barEnd: 4 } as const;

/** 브레이크포인트(4.5절). useBreakpoint()가 이 값을 씁니다 */
export const BREAKPOINTS = { mobileMax: 767, tabletMax: 1279, desktopMax: 1439 } as const;

export const LAYOUT = {
  sideNav: 240, sideNavCollapsed: 72, navRail: 80, topBar: 64, topBarMobile: 56,
  tabBar: 64, rightRail: 320, contentMax: 1200, drawer: 480,
} as const;

/** 재질 견본 색(I-15·I-17 MaterialGradeTag). 늘 코드 글자와 함께 씁니다(색만으로 구별하지 않음) */
export const MATERIAL_SWATCHES: Record<string, string> = {
  "304": "#8E98A6",
  "316": "#5F7FA0",
  "321": "#6E8C88",
  "310S": "#4F5661",
  Cu: "#B5703A",
  AL: "#C3C9D1",
  Brass: "#B19A3C",
  TCu: "#C9A27E",
  주문: "#FFFFFF",
};
