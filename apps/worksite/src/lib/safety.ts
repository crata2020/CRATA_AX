// 위험성평가 '최신 평가' 규칙(한 곳): 같은 위험요인(작업 구역·공정·유해위험요인)은 가장 최근 평가 한 줄만 셉니다.
// 정기 평가 뒤 수시 평가로 다시 평가한 요인이 옛 정기 줄로 한 번 더 세지지 않게(현황·위험성평가·홈 위젯·알림이 같은 수를 보여요).
export interface RiskKeyRow { work_area: string; process: string; hazard: string; assessed_on: string }

export const riskKey = (r: RiskKeyRow) => `${r.work_area}|${r.process}|${r.hazard}`;

export function latestRisks<T extends RiskKeyRow>(rows: readonly T[]): T[] {
  const best = new Map<string, T>();
  for (const r of rows) {
    const k = riskKey(r);
    const cur = best.get(k);
    if (!cur || r.assessed_on > cur.assessed_on) best.set(k, r);
  }
  return [...best.values()];
}
