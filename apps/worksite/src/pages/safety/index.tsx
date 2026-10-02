// 안전보건 `/company/safety` · I-18 · 깊이 A · 모듈 safety-health · TR 전용 · 소유: industry 그룹
// 법정 일정과 미조치 위험요인을 놓치지 않게 합니다. 무재해 일수는 크게 띄우지 않고, 아차사고 신고 수를 좋은 신호로 보여 줍니다.
// [아차사고·의견 남기기] → rpc:create_safety_report(이름 없이 보내기를 지키려고 rpc로) + 공장장 알림.
// 기록과 일정을 돕는 도구이고 법 준수를 보장하지 않습니다.
import { useEffect, useMemo } from "react";
import { Link } from "react-router";
import { Button, Form, Input, Select, Switch } from "antd";
import { FormOutlined, RightOutlined } from "@ant-design/icons";
import {
  Banner, BigNumber, CardGrid, DdayBadge, DetailDrawer, EmptyState, HeroCard, ListRows, PageHeader, SectionCard, SimpleBarChart, StatTile, StatusTag,
} from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { usePageReady } from "@/app/pageReady";
import { useRpc } from "@/lib/refine";
import { useSelectedParam } from "@/lib/url";
import { daysBetween, toKstDate } from "@/lib/clock";
import { latestRisks } from "@/lib/safety";
import { formatDate, formatDateTime, formatMonth } from "@/lib/format";
import { labelOf, statusOf } from "@/lib/status";
import type { LegalCalendarItem, NearMissReport, RiskAssessment, SemiannualReview, WorkerOpinion } from "@/types/entities";
import { useRows } from "../ops-home/kit/data";
import { opinionStatus } from "../ops-home/kit/labels";
import { SAFETY_TABS, SimpleTable } from "../ops-home/kit/ui";
import "../ops-home/kit/industry.css";

interface NewValues { kind: "near_miss" | "suggestion" | "opinion"; location?: string; content: string; anonymous?: boolean }
type Feed = { id: string; at: string; kind: string; location: string | null; content: string; anonymous: boolean; status: { tone: Parameters<typeof StatusTag>[0]["tone"]; label: string } };

const linkOf = (l: LegalCalendarItem) =>
  l.kind === "semiannual_review" ? `/company/safety/review?half=${l.id.replace(/^lc-tr-(\d{4})h(\d)$/, "$1-H$2")}` : l.kind === "safety_inspection" ? "/ops/equipment?tab=legal" : l.kind === "risk_regular" ? "/company/safety/risk" : null;

export default function Page() {
  const { today, persona } = useWorksite();
  const [selected, setSelected] = useSelectedParam();
  const legal = useRows<LegalCalendarItem>("legal_calendar_items", { sorters: [{ field: "due_on", order: "asc" }] });
  // 위험성평가 탭의 '최신 평가'와 같은 규칙: 같은 위험요인은 가장 최근 평가만, 그중 이행 확인 전인 것
  const allRisks = useRows<RiskAssessment>("risk_assessments", { sorters: [{ field: "due_on", order: "asc" }] });
  const riskRows = useMemo(() => latestRisks(allRisks.rows).filter((r) => r.status !== "done"), [allRisks.rows]);
  const risks = { ...allRisks, rows: riskRows };
  const nms = useRows<NearMissReport>("near_miss_reports", { sorters: [{ field: "occurred_at", order: "desc" }] });
  const ops = useRows<WorkerOpinion>("worker_opinions", { sorters: [{ field: "submitted_at", order: "desc" }] });
  const reviews = useRows<SemiannualReview>("semiannual_reviews");
  usePageReady(!legal.isLoading && !risks.isLoading);
  const report = useRpc<{ ok: boolean }>("create_safety_report", { successMessage: "남겨 주셔서 고마워요. 공장장에게 알렸어요." });
  const [form] = Form.useForm<NewValues>();
  const kind = Form.useWatch("kind", form);

  useEffect(() => { if (selected === "new") { form.resetFields(); form.setFieldsValue({ kind: "near_miss", anonymous: false }); } }, [selected, form]);

  const upcoming = legal.rows.filter((l) => l.status !== "done");
  const next = upcoming[0];
  const nextHalf = next?.kind === "semiannual_review" ? next.id.replace(/^lc-tr-(\d{4})h(\d)$/, "$1-H$2") : null;
  const halfRows = reviews.rows.filter((r) => r.half === nextHalf);
  const overdue = risks.rows.filter((r) => r.due_on && r.due_on < today);
  const topRisks = [...overdue, ...risks.rows.filter((r) => !overdue.includes(r))].slice(0, 3);
  const months = [-2, -1, 0].map((n) => { const [y, m] = today.split("-").map(Number) as [number, number]; return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7); });
  const byMonth = months.map((m) => ({ key: m, label: formatMonth(m), value: nms.rows.filter((n) => toKstDate(n.occurred_at).startsWith(m)).length }));
  const thisMonth = byMonth[2]!.value;
  const opinionsThisMonth = ops.rows.filter((o) => toKstDate(o.submitted_at).startsWith(months[2]!)).length;
  const member = persona.role === "member";

  const feed = useMemo<Feed[]>(() => [
    ...nms.rows.map((n) => ({ id: n.id, at: n.occurred_at, kind: "아차사고", location: n.location, content: n.description, anonymous: n.anonymous, status: statusOf("near_miss_reports.status", n.status) })),
    ...ops.rows.map((o) => ({ id: o.id, at: o.submitted_at, kind: o.content.startsWith("개선 제안") ? "개선 제안" : "의견", location: null, content: o.content.replace(/^개선 제안: /, ""), anonymous: o.anonymous, status: opinionStatus(o.status) })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 10), [nms.rows, ops.rows]);

  const save = async () => {
    const v = await form.validateFields();
    await report.run({ kind: v.kind, location: v.location ?? null, content: v.content, anonymous: !!v.anonymous });
    setSelected(null);
  };

  const days = next ? daysBetween(today, next.due_on) : 0;
  const nextLink = next ? linkOf(next) : null;

  return (
    <>
      <PageHeader
        title="안전보건"
        tabs={SAFETY_TABS}
        actions={<Button type="primary" icon={<FormOutlined />} onClick={() => setSelected("new")}>아차사고·의견 남기기</Button>}
      />
      <div className="in-mb"><Banner tone="info">기록과 일정을 놓치지 않게 돕는 도구예요. 법 준수를 보장하지는 않아요.</Banner></div>
      <CardGrid>
        <HeroCard title="가장 가까운 법정 일정" pill span={5} demo>
          {next ? (
            <>
              <BigNumber label={next.title} value={days > 0 ? `D-${days}` : days === 0 ? "오늘" : `${-days}일 지남`} />
              <p className="in-hero-text">{formatDate(next.due_on)}까지 · {labelOf("legal_calendar_items.kind", next.kind)}</p>
              {halfRows.length > 0 && <p className="in-hero-text">SH 항목 {halfRows.length}개 중 {halfRows.filter((r) => r.result !== "pending").length}개 확인</p>}
              {nextLink && <div className="in-hero-cta"><Link to={nextLink}>{next.kind === "semiannual_review" ? "반기 점검 열기" : "자세히 보기"} <RightOutlined aria-hidden /></Link></div>}
            </>
          ) : <p className="in-hero-text">다가오는 법정 일정이 없어요.</p>}
        </HeroCard>
        <SectionCard title="미조치 위험요인" pill span={7} demo more={{ label: "위험성평가", to: "/company/safety/risk" }}>
          {risks.rows.length ? (
            <>
              <StatTile label="개선대책 기한 지남" value={overdue.length} unit="건" caption={`이행 확인 전 ${risks.rows.length}건 중`} />
              <ListRows ariaLabel="미조치 위험요인" rows={topRisks.map((r) => ({ key: r.id, title: r.hazard, subtitle: `${r.process} · ${r.work_area}`, to: `/company/safety/risk?selected=${r.id}`, trailing: <DdayBadge date={r.due_on} /> }))} />
            </>
          ) : <EmptyState kind="empty" compact title="미조치 위험요인이 없어요" description="위험성평가에서 개선대책을 모두 이행했어요." />}
        </SectionCard>
        <SectionCard title="아차사고·의견" span={5} demo caption={member ? "내가 남긴 아차사고만 보여요." : undefined}>
          <StatTile label={`${formatMonth(months[2]!)} 아차사고 신고`} value={thisMonth} unit="건" caption={`많을수록 좋은 신호예요 · 의견·개선 제안 ${opinionsThisMonth}건`} />
          <SimpleBarChart data={byMonth} unit="건" highlightKey={months[2]} ariaLabel={`월별 아차사고 신고, ${byMonth.map((b) => `${b.label} ${b.value}건`).join(", ")}`} tableCaption="월별 아차사고 신고(예시)" height={150} />
        </SectionCard>
        <SectionCard title="법정 일정" span={7} demo>
          {upcoming.length ? (
            <ListRows ariaLabel="법정 일정" rows={upcoming.map((l) => ({ key: l.id, title: l.title, subtitle: `${labelOf("legal_calendar_items.kind", l.kind)} · ${l.basis}`, to: linkOf(l) ?? undefined, trailing: <DdayBadge date={l.due_on} /> }))} />
          ) : <EmptyState kind="empty" compact title="다가오는 법정 일정이 없어요" />}
        </SectionCard>
        <SectionCard title="최근 아차사고·의견" span={12}>
          {feed.length ? (
            <SimpleTable<Feed>
              ariaLabel="최근 아차사고·의견"
              rows={feed}
              rowKey={(f) => f.id}
              columns={[
                { key: "at", title: "일시", render: (f) => <span className="in-num">{formatDateTime(f.at)}</span> },
                { key: "kind", title: "종류", render: (f) => <span className="ws-tag">{f.kind}</span> },
                { key: "location", title: "장소", render: (f) => f.location ?? "—" },
                { key: "content", title: "내용", render: (f) => f.content },
                { key: "anon", title: "익명", render: (f) => (f.anonymous ? "예" : "아니요") },
                { key: "status", title: "상태", render: (f) => <StatusTag {...f.status} /> },
              ]}
              mobileRow={(f) => ({ title: f.content, subtitle: `${f.kind} · ${formatDateTime(f.at)}${f.anonymous ? " · 익명" : ""}`, trailing: <StatusTag {...f.status} /> })}
            />
          ) : <EmptyState kind="empty" compact title="아직 등록된 아차사고·의견이 없어요" description="작은 것도 남겨 주세요." action={{ label: "남기기", onClick: () => setSelected("new") }} />}
        </SectionCard>
      </CardGrid>

      <DetailDrawer open={selected === "new"} onClose={() => setSelected(null)} title="아차사고·의견 남기기" closeLabel="취소" footer={<Button type="primary" loading={report.isPending} onClick={() => void save()}>남기기</Button>}>
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item name="kind" label="종류" rules={[{ required: true }]}>
            <Select options={[{ value: "near_miss", label: "아차사고" }, { value: "suggestion", label: "개선 제안" }, { value: "opinion", label: "의견" }]} />
          </Form.Item>
          {kind === "near_miss" && <Form.Item name="location" label="장소"><Input maxLength={40} placeholder="예: 가공동 프레스 구역" /></Form.Item>}
          <Form.Item name="content" label="내용" rules={[{ required: true, whitespace: true, message: "내용을 적어 주세요" }]}><Input.TextArea rows={4} maxLength={200} showCount /></Form.Item>
          <Form.Item name="anonymous" label="이름 없이 보내기" valuePropName="checked"><Switch /></Form.Item>
          <p className="in-caption">이름 없이 보내면 누가 남겼는지 어디에도 기록하지 않아요. 산업재해 기록은 이 화면에서 받지 않아요.</p>
        </Form>
      </DetailDrawer>
    </>
  );
}
