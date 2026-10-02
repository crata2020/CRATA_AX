// 개발 모드 전용 #/__kit: 공통 컴포넌트를 예시 props로 모두 보여 줍니다(빌드 스펙 7.1절). 매니페스트 밖 화면이라 배포 빌드에는 없습니다.
// 그룹 개발자는 여기서 쓰는 법과 모양을 확인합니다. 모든 값은 예시입니다.
import { useEffect, useState } from "react";
import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import {
  PageHeader, SectionCard, HeroCard, CardGrid, StatTile, StatRow, BigNumber, DeltaText, SimpleBarChart, StackedShareBar,
  LineSpark, Meter, StatusTag, PersonChip, EmptyState, DemoDataBadge, KanbanBoard, Timeline, FilterBar, ListRows, DdayBadge, SensitivityTag,
  AiTag, PriceGate, MaterialGradeTag, CopyField, Banner, DetailDrawer, Divider, PillLabel,
} from "@/components";
import { statusOf } from "@/lib/status";
import { useWorksite } from "./TenantBoundary";
import { usePageReady } from "./pageReady";
import { addDays, kstIso } from "@/lib/clock";

type Card = { id: string; title: string; col: string; who: string };

export default function Kit() {
  usePageReady(true);
  const { tenant, today, persona } = useWorksite();
  useEffect(() => { document.title = `컴포넌트 키트 · ${tenant.displayName}`; }, [tenant.displayName]);
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [open, setOpen] = useState(false);
  const [cards, setCards] = useState<Card[]>([
    { id: "k1", title: "예시 업무 A", col: "todo", who: persona.memberId },
    { id: "k2", title: "예시 업무 B", col: "in_progress", who: persona.memberId },
    { id: "k3", title: "예시 업무 C", col: "submitted", who: persona.memberId },
  ]);
  const people = tenant.people.slice(0, 3);
  return (
    <>
      <PageHeader
        title="컴포넌트 키트"
        description="공통 컴포넌트를 예시 값으로 보여 줘요. 개발 모드에서만 열려요."
        period={{ ariaLabel: "기간", value: period, onChange: setPeriod, urlParam: "period", options: [{ value: "week", label: "이번 주" }, { value: "month", label: "이번 달" }] }}
        tabs={[{ key: "a", label: "개요", to: "?tab=a" }, { key: "b", label: "표", to: "?tab=b", badge: 3 }]}
        actions={<Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>서랍 열기</Button>}
        meta={<><StatusTag tone="info" label="진행" /><SensitivityTag level="L2" /><AiTag kind="draft" /></>}
      />

      <CardGrid>
        <HeroCard title="오늘 할 일" pill size="M" span={5}>
          <BigNumber label="오늘 처리할 일" value={7} unit="건" />
          <Divider />
          <DeltaText value={-3} unit="건" period="어제보다" goodWhen="down" />
        </HeroCard>
        <SectionCard title="품질 지표" pill demo span={7} more={{ label: "더보기", to: "/ops/quality" }}>
          <StatRow>
            <StatTile label="고객 PPM" value={18} unit="PPM" delta={{ value: -3, unit: "", period: "지난달보다", goodWhen: "down" }} trend={[24, 21, 18]} />
            <StatTile label="공정 불량률" value="0.62" unit="%" caption="예시 값" tone="warning" toneLabel="주의" />
          </StatRow>
        </SectionCard>
        <SectionCard title="월별 고객 PPM" pill demo size="M">
          <SimpleBarChart
            data={[{ key: "7", label: "7월", value: 24 }, { key: "8", label: "8월", value: 21 }, { key: "9", label: "9월", value: 18 }]}
            unit="PPM" highlightKey="9" target={{ value: 10, label: "Single PPM 목표 10" }} ariaLabel="월별 고객 PPM, 9월 18" tableCaption="월별 고객 PPM(예시)"
          />
        </SectionCard>
        <SectionCard title="오늘 생산(비교형)" demo size="M">
          <SimpleBarChart
            data={[{ key: "c", label: "크림핑", value: 4200, previous: 4500 }, { key: "p", label: "프레스 성형", value: 3900, previous: 4000 }, { key: "s", label: "스파이럴링", value: 1800, previous: 2000 }]}
            unit="개" compare={{ currentLabel: "실적", previousLabel: "계획" }} ariaLabel="공정별 계획 대비 실적" tableCaption="공정별 계획·실적(예시)"
          />
        </SectionCard>
        <SectionCard title="업무 상태" demo size="M" caption="평가용이 아니에요">
          <StackedShareBar ariaLabel="업무 상태 비중" unit="건" segments={[
            { key: "todo", label: "할 일", value: 10, tone: "neutral" }, { key: "ip", label: "진행 중", value: 14, tone: "info" },
            { key: "sub", label: "검토 대기", value: 6, tone: "warning" }, { key: "done", label: "완료", value: 13, tone: "good" },
          ]} />
        </SectionCard>
        <SectionCard title="숫자·진행" demo size="M">
          <div className="ws-stack" style={{ gap: 16 }}>
            <Meter label="반기 점검 항목" value={6} max={10} valueText="10개 중 6개 확인" />
            <Meter label="초중종물 실시율" value={88} max={100} tone="warning" valueText="88%" />
            <div className="ws-row"><span className="ws-t-caption">추이</span><LineSpark values={[46, 41, 38, 33, 29, 27, 22, 19]} ariaLabel="8주 추이, 최저 19, 최고 46, 이번 주 19" /></div>
          </div>
        </SectionCard>
        <SectionCard title="상태·태그" size="M">
          <div className="ws-row">
            {(["todo", "in_progress", "submitted", "changes_requested", "done"] as const).map((s) => <StatusTag key={s} {...statusOf("tasks.status", s)} />)}
            <StatusTag tone="critical" label="고장" />
            <DdayBadge date={today} /><DdayBadge date={addDays(today, 1)} /><DdayBadge date={addDays(today, 5)} /><DdayBadge date={addDays(today, -2)} />
            <MaterialGradeTag code="321" /><MaterialGradeTag code="Cu" />
            <PriceGate>1,200,000원</PriceGate>
            <DemoDataBadge variant="inline" />
          </div>
        </SectionCard>
        <SectionCard title="사람·목록" size="M">
          <ListRows rows={[
            { key: "1", title: "예시기업 특강 제안서 초안", subtitle: "강의·워크샵 · 마감 10월 2일", trailing: <StatusTag tone="info" label="검토 대기" />, to: "/__kit" },
            { key: "2", title: "검토 요청 알림", subtitle: "3분 전", unread: true, onClick: () => {} },
          ]} />
          <Divider />
          <div className="ws-row">{people.map((p) => <PersonChip key={p.id} memberId={p.id} />)}<PersonChip kind="ai" clientName="Claude" /><PersonChip kind="system" /></div>
          <Divider />
          <CopyField label="MCP 주소" value={`https://mcp.example.invalid/${tenant.tenantId}/mcp`} boxed />
        </SectionCard>
        <SectionCard title="타임라인" size="M">
          <Timeline items={[
            { id: "1", at: kstIso(today, "08:40"), title: "AI 연결로 제출", description: "v2 · 검토 대기", actor: { kind: "ai", clientName: "Claude" }, tone: "info" },
            { id: "2", at: kstIso(addDays(today, -4), "16:10"), title: "수정 요청", description: "첫 장에 교육 목표를 3줄로 요약해 주세요", actor: { memberId: people[0]?.id }, tone: "serious" },
          ]} />
        </SectionCard>
      </CardGrid>

      <div style={{ marginTop: 40 }}>
        <h2 className="ws-t-title-card" style={{ marginBottom: 12 }}>필터 줄 · 칸반 <PillLabel>알약</PillLabel></h2>
        <Banner title="연동 미리보기">실제 메일은 연결하지 않았어요.</Banner>
        <FilterBar
          search={{ placeholder: "제목 검색" }}
          chips={[{ param: "kstatus", options: [{ value: "todo", label: "할 일" }, { value: "in_progress", label: "진행 중" }], ariaLabel: "상태" }]}
          selects={[{ param: "kproject", label: "프로젝트", options: [{ value: "a", label: "예시 프로젝트" }] }]}
        />
        <KanbanBoard<Card>
          ariaLabel="예시 칸반"
          columns={[{ key: "todo", label: "할 일", tone: "neutral" }, { key: "in_progress", label: "진행 중", tone: "info" }, { key: "submitted", label: "검토 대기", tone: "warning" }, { key: "done", label: "완료", tone: "good", collapsed: true }]}
          items={cards}
          getColumn={(c) => c.col}
          getId={(c) => c.id}
          getTitle={(c) => c.title}
          renderCard={(c) => <><strong className="ws-t-body-strong">{c.title}</strong><PersonChip memberId={c.who} size="sm" /></>}
          canMove={(_, to) => (to === "done" ? { ok: false, reason: "완료는 검토자가 승인하면 바뀌어요" } : { ok: true })}
          onMove={(c, to) => setCards((list) => list.map((x) => (x.id === c.id ? { ...x, col: to } : x)))}
        />
      </div>

      <div style={{ marginTop: 40 }}>
        <SectionCard title="빈 상태">
          <EmptyState kind="filtered" compact action={{ label: "필터 지우기", onClick: () => {} }} />
        </SectionCard>
      </div>

      <DetailDrawer open={open} title="예시 서랍" onClose={() => setOpen(false)} footer={<Button type="primary" onClick={() => setOpen(false)}>저장하기</Button>}>
        <p className="ws-t-body">서랍 안 내용이에요. Esc로 닫혀요.</p>
      </DetailDrawer>
    </>
  );
}
