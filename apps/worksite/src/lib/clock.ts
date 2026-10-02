// 데모 시계. 화면의 '오늘'은 TenantConfig.demoToday(또는 ?today=)이고, 지금 시각은 그날 09:30(KST)에서 흘러갑니다.
// 저장 규칙: 날짜는 "YYYY-MM-DD"(KST 기준 날짜), 시각은 UTC ISO("2026-09-30T00:12:00.000Z")(빌드 스펙 5.5.1절).

export interface Clock {
  /** "YYYY-MM-DD" (KST) */
  today: string;
  /** 지금 시각 UTC ISO */
  now(): string;
  nowMs(): number;
}

const DAY = 86_400_000;
const KST_OFFSET = 9 * 3_600_000;

export function createClock(today: string, startTime = "09:30"): Clock {
  const base = Date.parse(`${today}T${startTime}:00+09:00`);
  const started = Date.now();
  const nowMs = () => base + (Date.now() - started);
  return { today, nowMs, now: () => new Date(nowMs()).toISOString() };
}

/** "YYYY-MM-DD" + n일 */
export function addDays(date: string, n: number): string {
  const t = Date.parse(`${date}T00:00:00Z`) + n * DAY;
  return new Date(t).toISOString().slice(0, 10);
}

/** b − a (일). 같은 날이면 0 */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b.slice(0, 10)}T00:00:00Z`) - Date.parse(`${a.slice(0, 10)}T00:00:00Z`)) / DAY);
}

/** KST 날짜 + "HH:mm" → UTC ISO */
export function kstIso(date: string, time = "09:00"): string {
  return new Date(Date.parse(`${date}T${time}:00+09:00`)).toISOString();
}

/** UTC ISO → KST 날짜 "YYYY-MM-DD" (날짜 문자열이면 그대로) */
export function toKstDate(isoOrDate: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrDate)) return isoOrDate;
  return new Date(Date.parse(isoOrDate) + KST_OFFSET).toISOString().slice(0, 10);
}

/** 그 주 월요일 "YYYY-MM-DD" */
export function weekStart(date: string): string {
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0=일
  return addDays(date, dow === 0 ? -6 : 1 - dow);
}

/** "YYYY-MM" */
export const monthOf = (date: string) => date.slice(0, 7);

/** 분 더하기(ISO) */
export function addMinutes(iso: string, minutes: number): string {
  return new Date(Date.parse(iso) + minutes * 60_000).toISOString();
}

/** 한국 공휴일(관공서의 공휴일에 관한 규정, 대체공휴일·임시공휴일 포함). 데모 기준일(2026-09-30) 앞뒤 일정에 씁니다.
 *  2026: 추석 9/24~26, 개천절 10/3(토) → 대체공휴일 10/5(월), 한글날 10/9, 광복절 8/15(토) → 대체 8/17, 지방선거 6/3. */
export const KR_HOLIDAYS: ReadonlySet<string> = new Set([
  "2025-10-03", "2025-10-05", "2025-10-06", "2025-10-07", "2025-10-08", "2025-10-09", "2025-12-25",
  "2026-01-01", "2026-02-16", "2026-02-17", "2026-02-18", "2026-03-01", "2026-03-02", "2026-05-05", "2026-05-24", "2026-05-25",
  "2026-06-03", "2026-06-06", "2026-08-15", "2026-08-17", "2026-09-24", "2026-09-25", "2026-09-26", "2026-10-03", "2026-10-05",
  "2026-10-09", "2026-12-25",
]);
export const isKrHoliday = (date: string) => KR_HOLIDAYS.has(toKstDate(date));
/** 쉬는 날: 일요일·공휴일(saturday=true면 토요일도) */
export function isOffDay(date: string, opts: { saturday?: boolean } = {}): boolean {
  const d = toKstDate(date);
  const dow = new Date(`${d}T00:00:00Z`).getUTCDay();
  return dow === 0 || (!!opts.saturday && dow === 6) || KR_HOLIDAYS.has(d);
}
/** 쉬는 날이면 가까운 일하는 날로(dir -1 앞으로, +1 뒤로) */
export function shiftToWorkday(date: string, dir: -1 | 1, opts: { saturday?: boolean } = {}): string {
  let d = toKstDate(date);
  for (let i = 0; i < 14 && isOffDay(d, opts); i++) d = addDays(d, dir);
  return d;
}
