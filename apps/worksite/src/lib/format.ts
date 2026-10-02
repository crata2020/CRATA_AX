// 숫자·날짜 표기는 이 파일 한 곳에서만 만듭니다(빌드 스펙 4.2절 숫자 표기).
// 날짜 "9월 30일(수)", 기간 "9월 28일 – 10월 4일", 최근 시각 "3분 전" → 1시간 넘으면 "오늘 08:12" → 하루 넘으면 날짜.
// 화면 표시는 Asia/Seoul(UTC+9, 서머타임 없음) 기준입니다.
import { toKstDate, daysBetween } from "./clock";
import type { Tone } from "@/theme/tokens";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;
const nf = new Intl.NumberFormat("ko-KR");

function kstParts(iso: string) {
  const d = new Date(Date.parse(iso) + 9 * 3_600_000);
  return {
    date: d.toISOString().slice(0, 10),
    hh: String(d.getUTCHours()).padStart(2, "0"),
    mm: String(d.getUTCMinutes()).padStart(2, "0"),
  };
}

/** 1234 → "1,234". digits를 주면 소수 자리 고정 */
export function formatNumber(n: number | null | undefined, digits?: number): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (digits == null) return nf.format(n);
  return new Intl.NumberFormat("ko-KR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
}

/** 큰 수 줄임: 12,900 → "1.3만", 1억 이상 → "1.2억" */
export function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 100_000_000) return `${formatNumber(Math.round((n / 100_000_000) * 10) / 10)}억`;
  if (abs >= 10_000) return `${formatNumber(Math.round((n / 10_000) * 10) / 10)}만`;
  return formatNumber(n);
}

/** 수량 + 단위 한 곳 규칙: 한글 단위(개·건·대·명·일 …)와 %는 붙여 쓰고, 영문 단위(m·kg·PPM …)는 한 칸 띄웁니다.
 *  formatQty(3100, "개") → "3,100개" · formatQty(180, "m") → "180 m" · formatQty(18, "PPM") → "18 PPM" */
export function formatQty(n: number | null | undefined, unit?: string | null, digits?: number): string {
  if (n == null || Number.isNaN(n)) return "—";
  const num = formatNumber(n, digits);
  if (!unit) return num;
  // 영문 단위 앞 칸은 줄바꿈 없는 공백(U+00A0): "510 m"가 "510 / m"처럼 꺾이지 않게
  return /^[A-Za-z]/.test(unit) ? `${num}\u00A0${unit}` : `${num}${unit}`;
}

export const formatPercent = (n: number | null | undefined, digits = 0) => (n == null ? "—" : `${formatNumber(n, digits === 0 ? undefined : digits)}%`);

/** 1234000 → "1,234,000원" */
export const formatWon = (n: number | null | undefined) => (n == null ? "—" : `${formatNumber(n)}원`);

/** 42000000 → "4,200만 원", 120000000 → "1억 2,000만 원" */
export function formatWonKorean(n: number | null | undefined): string {
  if (n == null) return "—";
  const eok = Math.floor(n / 100_000_000);
  const man = Math.round((n % 100_000_000) / 10_000);
  // 금액 안의 띄어쓰기는 줄바꿈 없는 공백(U+00A0): "4,200만 / 원"처럼 꺾이지 않게
  if (eok > 0) return man > 0 ? `${formatNumber(eok)}억\u00A0${formatNumber(man)}만\u00A0원` : `${formatNumber(eok)}억\u00A0원`;
  if (man > 0) return `${formatNumber(man)}만\u00A0원`;
  return `${formatNumber(n)}원`;
}

/** 52 → "52분", 80 → "1시간 20분" */
export function formatMinutes(min: number | null | undefined): string {
  if (min == null) return "—";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m}분`;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}

/** "2026-09-30" 또는 ISO → "9월 30일(수)". weekday=false면 "9월 30일" */
export function formatDate(value: string | null | undefined, weekday = true): string {
  if (!value) return "—";
  const date = toKstDate(value);
  const [, m, d] = date.split("-").map(Number) as [number, number, number];
  const dow = WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];
  return weekday ? `${m}월 ${d}일(${dow})` : `${m}월 ${d}일`;
}

/** "2026-09-30" → "2026년 9월 30일" */
export function formatDateLong(value: string | null | undefined): string {
  if (!value) return "—";
  const [y, m, d] = toKstDate(value).split("-").map(Number) as [number, number, number];
  return `${y}년 ${m}월 ${d}일`;
}

/** "2026-09" 또는 날짜 → "9월" (withYear면 "2026년 9월") */
export function formatMonth(value: string, withYear = false): string {
  const [y, m] = value.split("-").map(Number) as [number, number];
  return withYear ? `${y}년 ${m}월` : `${m}월`;
}

/** ISO → "08:12" (KST) */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const p = kstParts(iso);
  return `${p.hh}:${p.mm}`;
}

/** ISO → "9월 30일(수) 08:12" */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return `${formatDate(iso)} ${formatTime(iso)}`;
}

/** 기간 "9월 28일 – 10월 4일" */
export function formatRange(from: string, to: string, weekday = false): string {
  return `${formatDate(from, weekday)} – ${formatDate(to, weekday)}`;
}

/** 최근 시각: "방금" · "3분 전" · "오늘 08:12" · "어제 08:12" · "9월 28일(월)" */
export function formatRelative(iso: string | null | undefined, nowIso: string): string {
  if (!iso) return "—";
  const diffMin = Math.floor((Date.parse(nowIso) - Date.parse(iso)) / 60_000);
  if (diffMin >= 0 && diffMin < 1) return "방금";
  if (diffMin >= 1 && diffMin < 60) return `${diffMin}분 전`;
  const day = daysBetween(toKstDate(iso), toKstDate(nowIso));
  if (day === 0) return `오늘 ${formatTime(iso)}`;
  if (day === 1) return `어제 ${formatTime(iso)}`;
  if (day === -1) return `내일 ${formatTime(iso)}`;
  return formatDate(iso);
}

/** D-day 정보(DdayBadge가 씀): "D-3"(neutral) · "D-1 내일 마감"(warning) · "오늘 마감"(warning) · "2일 지남"(critical)
 *  noun이 '…기한'(예: "8D 기한")이면 무엇의 D-day인지 앞에 붙여요: "8D 기한 D-6" · "8D 기한 2일 지남"
 *  (접수일 옆의 맨 "D-6"이 '접수 뒤 며칠'로 읽히지 않게) */
export function ddayInfo(due: string, today: string, noun = "마감"): { days: number; label: string; tone: Tone } {
  const days = daysBetween(today, toKstDate(due));
  const lead = noun.endsWith("기한") ? `${noun} ` : "";
  if (days < 0) return { days, label: `${lead}${-days}일 지남`, tone: "critical" };
  if (days === 0) return { days, label: `오늘 ${noun}`, tone: "warning" };
  if (days === 1) return { days, label: `D-1 내일 ${noun}`, tone: "warning" };
  return { days, label: `${lead}D-${days}`, tone: "neutral" };
}

/** 사람 이름 첫 글자(이니셜 원). "(예시)" 같은 꼬리는 뺍니다 */
export function initialsOf(name: string): string {
  const clean = name.replace(/\(.*?\)/g, "").trim();
  return clean.slice(0, 1) || "?";
}
