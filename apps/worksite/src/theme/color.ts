// 색 계산 순수 함수(외부 색 라이브러리 없음). OKLCH와 sRGB 변환, WCAG 대비비.
// deriveTenantTheme(빌드 스펙 4.1.3절)와 브랜드·테마 화면(A-08)의 대비 검사가 씁니다.

export interface Oklch { l: number; c: number; h: number }

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((ch) => ch + ch).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`색 값이 올바르지 않아요: ${hex}`);
  return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
}

export function rgbToHex([r, g, b]: [number, number, number]): string {
  const to = (v: number) => Math.round(clamp01(v) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toGamma = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

/** 상대 휘도(WCAG 2.x) */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(toLinear) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 대비비(1~21). 소수 둘째 자리 */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

export function hexToOklch(hex: string): Oklch {
  const [r, g, b] = hexToRgb(hex).map(toLinear) as [number, number, number];
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const c = Math.sqrt(A * A + B * B);
  let h = (Math.atan2(B, A) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: L, c, h };
}

function oklchToLinear({ l, c, h }: Oklch): [number, number, number] {
  const hr = (h * Math.PI) / 180;
  const A = c * Math.cos(hr);
  const B = c * Math.sin(hr);
  const l_ = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m_ = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s_ = (l - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
}

/** OKLCH → hex. sRGB 범위를 넘으면 C를 0.002씩 줄입니다(빌드 스펙 4.1.3절). */
export function oklchToHex(input: Oklch): string {
  let c = input.c;
  for (let i = 0; i < 500; i += 1) {
    const lin = oklchToLinear({ ...input, c });
    if (lin.every((v) => v >= -1e-4 && v <= 1 + 1e-4) || c <= 0) {
      return rgbToHex(lin.map((v) => toGamma(clamp01(v))) as [number, number, number]);
    }
    c = Math.max(0, c - 0.002);
  }
  return rgbToHex(oklchToLinear({ ...input, c: 0 }).map((v) => toGamma(clamp01(v))) as [number, number, number]);
}

/** 두 색상(hue)의 각도 차이(0~180) */
export function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** "#RRGGBB" → "r,g,b"(0~255). rgba() 그림자 등에 씁니다 */
export function rgbTriplet(hex: string): string {
  return hexToRgb(hex).map((v) => Math.round(v * 255)).join(",");
}
