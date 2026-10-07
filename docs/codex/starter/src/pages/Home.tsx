// 시작용 홈: 틀이 맞는지 보는 자리예요. 기준 화면 브리프(docs/codex/briefs/<page>.md)대로 이 파일을 통째로 바꿔요.
// 문법 출처: apps/worksite-next/src/pages/Home.tsx(KPI 띠 + 8:4 격자 + 카드 머리)
import { CalendarClock, CheckCircle2, ClipboardList, LayoutDashboard, Users } from "lucide-react";
import { Card, Delta, Empty, KpiCard, PageHead } from "@/ui";

export default function Home() {
  return (
    <>
      <PageHead title="홈" desc="오늘 눌러야 할 것을 맨 위에 둬요. 지금은 틀만 있는 시작 화면이에요." />
      <div className="kpirow">
        <KpiCard icon={<ClipboardList />} hue="blue" label="오늘 할 일(예시)" value={6} unit="건" delta={<Delta value="2" dir="up" />} foot="어제보다 2건 늘었어요" />
        <KpiCard icon={<CheckCircle2 />} hue="green" label="이번 주 처리(예시)" value={18} unit="건" foot="승인 12 · 직접 6" />
        <KpiCard icon={<CalendarClock />} hue="amber" label="기한 임박(예시)" value={2} unit="건" foot="3일 안에 끝나요" />
        <KpiCard icon={<Users />} hue="violet" label="구성원(예시)" value={47} unit="명" foot="팀 9개" />
      </div>
      <div className="grid g-12" style={{ marginTop: "var(--gap)" }}>
        <Card className="s-8" title="기준 화면 자리" sub="브리프를 채운 뒤 이 카드를 바꿔요">
          <Empty icon={<LayoutDashboard />} title="아직 화면이 없어요">
            <p className="muted small">docs/codex/PROMPTS.md (2)로 기준 화면을 만들어요.</p>
          </Empty>
        </Card>
        <Card className="s-4" title="확인할 것" line>
          <ul className="muted small" style={{ display: "grid", gap: 8 }}>
            <li>사이드바 268 · 상단 바 68 · 캔버스 #f6f6f8</li>
            <li>카드 테두리 1px · 라운드 16</li>
            <li>숫자 굵기 500 · 짙은 버튼 1개 이하</li>
          </ul>
        </Card>
      </div>
      <p className="muted small" style={{ marginTop: 20 }}>숫자·사람·회사는 모두 예시 데이터예요.</p>
    </>
  );
}
