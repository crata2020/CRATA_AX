// 날짜·숫자 표시(데모 기준일: 각 회사 today)
const WD = ["일", "월", "화", "수", "목", "금", "토"];
export const toDate = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00`);
export const md = (s: string) => { const d = toDate(s); return `${d.getMonth() + 1}월 ${d.getDate()}일`; };
export const mdw = (s: string) => { const d = toDate(s); return `${d.getMonth() + 1}월 ${d.getDate()}일(${WD[d.getDay()]})`; };
export const slash = (s: string) => { const d = toDate(s); return `${d.getMonth() + 1}/${d.getDate()}`; };
export const hm = (iso: string) => (iso.length > 10 ? iso.slice(11, 16) : "");
export const longDate = (s: string) => { const d = toDate(s); return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${WD[d.getDay()]}요일`; };
/** today 기준 남은 날(음수 = 지남) */
export const daysLeft = (due: string, today: string) => Math.round((toDate(due).getTime() - toDate(today).getTime()) / 86400000);
export const dday = (due: string, today: string) => { const n = daysLeft(due, today); return n === 0 ? "오늘" : n > 0 ? `D-${n}` : `${-n}일 지남`; };
/** “오늘 07:55”, “어제 16:30”, “10월 2일” */
export const when = (iso: string, today: string) => {
  const n = daysLeft(iso, today);
  const t = hm(iso);
  if (n === 0) return t ? `오늘 ${t}` : "오늘";
  if (n === -1) return t ? `어제 ${t}` : "어제";
  return md(iso);
};
export const num = (v: number) => v.toLocaleString("ko-KR");
export const mins = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60 ? `${m % 60}분` : ""}`.trim() : `${m}분`);
export const mmss = (m: number) => `${String(Math.floor(m)).padStart(2, "0")}:00`;
