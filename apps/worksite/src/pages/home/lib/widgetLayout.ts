// 홈 위젯 배치(소유: home 그룹). 히어로 줄 아래 위젯을 '두 줄기'(왼쪽·오른쪽 세로 묶음, components/MasonryGrid)로 쌓아요.
// 카드 높이가 서로 달라도 짧은 카드는 위로 쌓이고(줄 사이 패널 구멍 없음), L 위젯은 두 줄기 사이에 전체 폭으로 끼워요(리뷰 3차).
// 위젯 파일은 늦게 불러오므로(lazy) 크기·첫 그림용 높이 어림값을 여기에 둡니다. 크기는 위젯 파일의 def.size와 같아야 해요(tests/unit/widget-layout.test.ts).
import type { WidgetId } from "@/modules/registry.generated";
import type { CardSize } from "@/components";

/** 높이 어림값(px, 1440 기준): list = 140 + 줄 수 × 59, figure ≈ 260, 차트 ≈ 340 */
const LIST = (rows: number) => 140 + rows * 59;
export const WIDGET_LAYOUT: Record<WidgetId, { size: CardSize; est: number }> = {
  "admin-health": { size: "S", est: 260 },
  "ai-connect-status": { size: "S", est: LIST(3) },
  "approvals-pending": { size: "S", est: LIST(3) },
  "ara-aggregate": { size: "M", est: 300 },
  "ara-card": { size: "S", est: 260 },
  "attendance-today": { size: "S", est: 260 },
  "ax-effect": { size: "L", est: 360 },
  "calendar-week": { size: "M", est: LIST(4) },
  "company-kpi": { size: "L", est: 260 },
  greeting: { size: "L", est: 0 },
  "mail-followups": { size: "S", est: LIST(3) },
  "mfg-4m-changes": { size: "S", est: LIST(3) },
  "mfg-calibration-due": { size: "S", est: LIST(3) },
  "mfg-claims-8d": { size: "M", est: LIST(2) },
  "mfg-delivery-due": { size: "M", est: LIST(4) },
  "mfg-dev-projects": { size: "M", est: LIST(3) },
  "mfg-equipment-status": { size: "M", est: 340 },
  "mfg-field-feed": { size: "M", est: LIST(4) },
  "mfg-field-report": { size: "M", est: 300 },
  "mfg-first-mid-last": { size: "S", est: 260 },
  "mfg-inspection-queue": { size: "S", est: LIST(3) },
  "mfg-legal-calendar": { size: "M", est: LIST(4) },
  "mfg-material-alert": { size: "M", est: LIST(3) },
  "mfg-material-price": { size: "S", est: LIST(3) },
  "mfg-monthly-summary": { size: "L", est: 360 },
  "mfg-order-backlog": { size: "M", est: 360 },
  "mfg-pm-due": { size: "M", est: LIST(3) },
  "mfg-production-today": { size: "M", est: 320 },
  "mfg-quality-ppm": { size: "L", est: 360 },
  "my-tasks": { size: "M", est: LIST(5) },
  notices: { size: "S", est: LIST(3) },
  "project-health": { size: "M", est: 300 },
  "recent-decisions": { size: "M", est: LIST(4) },
  "returned-submissions": { size: "M", est: LIST(2) },
  "review-queue": { size: "M", est: LIST(5) },
  "safety-status": { size: "M", est: 260 },
  "team-workload": { size: "M", est: 340 },
  "upcoming-meetings": { size: "M", est: LIST(4) },
};

/** 배치 한 칸: 위젯 id 또는 '오늘' 카드(레일이 없을 때) */
export type HomeItem = WidgetId | "today";

export const sizeOf = (id: HomeItem): CardSize => (id === "today" ? "M" : WIDGET_LAYOUT[id]?.size ?? "M");
/** 재기 전 어림 높이(MasonryGrid 첫 그림용. 그린 뒤에는 실제 높이로 쌓아요) */
export const estOf = (id: HomeItem, todayEst = 300): number => (id === "today" ? todayEst : WIDGET_LAYOUT[id]?.est ?? 300);
/** L 위젯은 두 줄기 사이 전체 폭 */
export const isFull = (id: HomeItem): boolean => sizeOf(id) === "L";
