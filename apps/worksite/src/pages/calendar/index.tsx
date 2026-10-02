// 일정 `/company/calendar` · C-10 · 깊이 B · 모듈 calendar · 소유: collab 그룹
// 회의·마감·납기·검사·교육·안전·회사 일정을 한 화면에서 봅니다(캘린더 앱은 만들지 않음). 데이터는 sel:calendar.range.
// URL: ?view=week|month · ?date=YYYY-MM-DD(기준일) · ?kind=meeting,due · ?mine=1 · ?selected=<일정 id>|new
import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { Button, DatePicker, Form, Input, Select, Switch, TimePicker } from "antd";
import { LeftOutlined, PlusOutlined, RightOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { DetailDrawer, EmptyState, FilterBar, ListRows, PageHeader, PersonChip, SectionCard, type FilterBarProps, type ListRowProps } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { usePageReady } from "@/app/pageReady";
import { useCreate, useOne, useSelector } from "@/lib/refine";
import { useSelectedParam, useUrlParam } from "@/lib/url";
import { addDays, kstIso, toKstDate, weekStart } from "@/lib/clock";
import { formatDate, formatMonth, formatRange, formatTime } from "@/lib/format";
import { labelOf, optionsOf, type StatusValue } from "@/lib/status";
import { useBreakpoint } from "@/lib/useBreakpoint";
import type { CalendarEvent } from "@/types/entities";
import type { CalendarItem } from "@/data/seed/collab";
import { Caption, KeyValue, isReviewerUp, useProjects } from "../docs/shared/lib";

type Kind = StatusValue<"calendar_events.kind">;
type Vis = StatusValue<"calendar_events.visibility">;
interface NewValues { title: string; kind: Kind; date: Dayjs; allDay: boolean; start?: Dayjs | null; end?: Dayjs | null; project_id?: string | null; attendee_ids?: string[]; visibility: Vis }

const isDate = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
const lastOfMonth = (d: string) => { const [y, m] = d.split("-").map(Number) as [number, number]; return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); };

export default function Page() {
  const { today, tenant } = useWorksite();
  const bp = useBreakpoint();
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useSelectedParam();
  const [view] = useUrlParam("view", "week");
  const dateParam = params.get("date");
  const anchor = isDate(dateParam) ? dateParam : today;
  const manufacturing = tenant.packs.includes("manufacturing");
  const kinds = (params.get("kind") ?? "").split(",").filter(Boolean);
  const mine = params.get("mine") === "1";
  const { byId: projects } = useProjects();

  const range = useMemo(() => {
    if (view === "month") {
      const first = `${anchor.slice(0, 7)}-01`;
      return { from: weekStart(first), to: addDays(weekStart(lastOfMonth(anchor)), 6) };
    }
    const from = weekStart(anchor);
    return { from, to: addDays(from, 6) };
  }, [view, anchor]);

  const sel = useSelector<{ items: CalendarItem[] }>("calendar.range", { from: range.from, to: range.to, kinds: kinds.join(","), mine: mine ? "1" : "" });
  usePageReady(!sel.isLoading);
  const items = sel.data?.items ?? [];
  const byDay = useMemo(() => {
    const m = new Map<string, CalendarItem[]>();
    for (const it of items) { const d = toKstDate(it.start_at); m.set(d, [...(m.get(d) ?? []), it]); }
    return m;
  }, [items]);

  const setQuery = (patch: Record<string, string | null>) => setParams((prev) => {
    const p = new URLSearchParams(prev);
    for (const [k, v] of Object.entries(patch)) { if (v == null || v === "") p.delete(k); else p.set(k, v); }
    return p;
  }, { replace: true });
  const move = (dir: -1 | 1) => {
    if (view === "month") {
      const d = dayjs(`${anchor.slice(0, 7)}-01`).add(dir, "month").format("YYYY-MM-DD");
      setQuery({ date: d });
    } else setQuery({ date: addDays(anchor, dir * 7) });
  };
  const rangeLabel = view === "month" ? formatMonth(anchor, true) : formatRange(range.from, range.to);

  const kindOptions = optionsOf("calendar_events.kind").filter((o) => manufacturing || (o.value !== "delivery" && o.value !== "safety"));
  const fbProps: FilterBarProps = {
    chips: [
      { param: "kind", options: kindOptions, multiple: true, ariaLabel: "종류" },
      { param: "mine", options: [{ value: "1", label: "내 일정만" }], multiple: true, ariaLabel: "내 일정" },
    ],
  };

  const timeText = (it: CalendarItem) => (it.all_day ? "종일" : it.end_at && it.source === "event" ? `${formatTime(it.start_at)}–${formatTime(it.end_at)}` : formatTime(it.start_at));
  const toRow = (it: CalendarItem): ListRowProps & { key: string } => ({
    key: it.id,
    title: it.title,
    subtitle: [timeText(it), it.sub ?? labelOf("calendar_events.kind", it.kind), it.project_id ? projects.get(it.project_id)?.name : null].filter(Boolean).join(" · "),
    trailing: (
      <span className="ws-row" style={{ flexWrap: "nowrap" }}>
        {it.visibility && it.visibility !== "company" && <span className="ws-tag">{labelOf("calendar_events.visibility", it.visibility)}</span>}
        <span className="ws-tag">{labelOf("calendar_events.kind", it.kind)}</span>
      </span>
    ),
    ...(it.to ? { to: it.to } : it.source === "event" ? { onClick: () => setSelected(it.id) } : {}),
  });

  // ───── 일정 상세(직접 만든 일정만)
  const evQ = useOne<CalendarEvent>({ resource: "calendar_events", id: selected ?? "", queryOptions: { enabled: !!selected && selected.startsWith("ev-"), retry: false } });
  const ev = selected && selected.startsWith("ev-") ? evQ.result : undefined;

  const days = Array.from({ length: 7 }, (_, i) => addDays(range.from, i));
  const mobileMonthDays = [...byDay.keys()].filter((d) => d.slice(0, 7) === anchor.slice(0, 7)).sort();

  return (
    <>
      <PageHeader
        title="일정"
        description="회의·마감·납기·검사·교육·안전 일정을 한 화면에 모았어요."
        period={{ ariaLabel: "보기", urlParam: "view", value: "week", onChange: () => undefined, options: [{ value: "week", label: "주" }, { value: "month", label: "월" }] }}
        actions={<Button type="primary" icon={<PlusOutlined aria-hidden />} onClick={() => setSelected("new")}>일정 추가</Button>}
      />
      <div className="ws-row" style={{ marginBottom: 16, justifyContent: "space-between" }}>
        <div className="ws-row" role="group" aria-label="기간 이동">
          <Button onClick={() => setQuery({ date: null })} aria-label={!dateParam || anchor === today ? "오늘(지금 보고 있어요)" : "오늘로 가기"}>오늘</Button>
          <Button icon={<LeftOutlined aria-hidden />} aria-label={view === "month" ? "이전 달" : "이전 주"} onClick={() => move(-1)} />
          <span className="ws-t-title-card cb-tabular" aria-live="polite" style={{ minWidth: 0 }}>{rangeLabel}</span>
          <Button icon={<RightOutlined aria-hidden />} aria-label={view === "month" ? "다음 달" : "다음 주"} onClick={() => move(1)} />
        </div>
      </div>
      <FilterBar {...fbProps} />

      {sel.isError ? (
        <EmptyState kind="error" action={{ label: "다시 시도", onClick: () => void sel.refetch() }} />
      ) : sel.isLoading ? (
        <div style={{ minHeight: 240 }} aria-busy="true" />
      ) : view === "month" && bp !== "mobile" ? (
        <SectionCard ariaLabel={`${rangeLabel} 월 보기`}>
          <MonthGrid from={range.from} to={range.to} month={anchor.slice(0, 7)} today={today} byDay={byDay} onPick={(d) => setQuery({ date: d, view: "week" })} />
          <Caption style={{ marginTop: 12 }}>날짜를 누르면 그 주의 일정을 자세히 봐요.</Caption>
        </SectionCard>
      ) : items.length === 0 ? (
        <SectionCard ariaLabel="일정"><EmptyState kind={kinds.length || mine ? "filtered" : "empty"} title="이 기간에 일정이 없어요" description="다른 주를 보거나 일정을 추가해 주세요." /></SectionCard>
      ) : view === "month" ? (
        <SectionCard title={rangeLabel}>
          <div className="cb-week">
            {mobileMonthDays.map((d) => (
              <section key={d} className="cb-day" aria-label={formatDate(d)}>
                <h3 className={`cb-day__head${d === today ? " is-today" : ""}`}>{formatDate(d)}{d === today && <span className="ws-tag ws-tag--brand">오늘</span>}</h3>
                <ListRows rows={(byDay.get(d) ?? []).map(toRow)} />
              </section>
            ))}
          </div>
        </SectionCard>
      ) : (
        <SectionCard ariaLabel={`${rangeLabel} 주 보기`}>
          <div className="cb-week">
            {days.map((d) => {
              const list = byDay.get(d) ?? [];
              return (
                <section key={d} className="cb-day" aria-label={formatDate(d)}>
                  {/* 주 보기 카드는 제목이 없어 h1 바로 아래 → 날짜 머리는 h2(제목 단계 건너뛰지 않게) */}
                  <h2 className={`cb-day__head${d === today ? " is-today" : ""}`}>{formatDate(d)}{d === today && <span className="ws-tag ws-tag--brand">오늘</span>}</h2>
                  {list.length ? <ListRows rows={list.map(toRow)} /> : <p className="cb-day__empty">일정 없음</p>}
                </section>
              );
            })}
          </div>
        </SectionCard>
      )}
      <Caption style={{ marginTop: 12 }}>업무 마감·회의{manufacturing ? "·납기·법정 일정" : ""}은 각 화면에서 모아 와요. 회사 캘린더(구글·마이크로소프트 365·네이버웍스) 연결은 2단계예요.</Caption>

      <DetailDrawer open={!!ev} title={ev?.title ?? "일정"} onClose={() => setSelected(null)}>
        {ev && (
          <KeyValue
            items={[
              ["종류", labelOf("calendar_events.kind", ev.kind)],
              ["일시", ev.all_day ? `${formatDate(ev.start_at)} 종일` : `${formatDate(ev.start_at)} ${formatTime(ev.start_at)}–${formatTime(ev.end_at)}`],
              ["프로젝트", ev.project_id ? projects.get(ev.project_id)?.name ?? "—" : "—"],
              ["참석자", ev.attendee_ids.length ? <ul className="cb-people">{ev.attendee_ids.map((id) => <li key={id}><PersonChip memberId={id} size="sm" /></li>)}</ul> : "—"],
              ["공개 범위", labelOf("calendar_events.visibility", ev.visibility)],
              ["만든 사람", <PersonChip memberId={ev.created_by ?? null} size="sm" />],
            ]}
          />
        )}
      </DetailDrawer>

      {selected === "new" && <AddEventDrawer anchor={anchor} kindOptions={kindOptions} onClose={() => setSelected(null)} onSaved={(date) => { setSelected(null); setQuery({ date }); }} />}
    </>
  );
}

/** 일정 추가 서랍(?selected=new). 열릴 때만 그려서 폼 인스턴스가 늘 연결돼 있어요 */
function AddEventDrawer({ anchor, kindOptions, onClose, onSaved }: { anchor: string; kindOptions: { value: Kind; label: string }[]; onClose: () => void; onSaved: (date: string) => void }) {
  const { persona, tenant } = useWorksite();
  const { projects: projectList } = useProjects();
  const [form] = Form.useForm<NewValues>();
  const allDay = Form.useWatch("allDay", form) as boolean | undefined;
  const { mutateAsync: create, mutation: createM } = useCreate();
  const member = !isReviewerUp(persona);
  const initial: Partial<NewValues> = { kind: "meeting", date: dayjs(anchor), allDay: false, start: dayjs("10:00", "HH:mm"), end: dayjs("11:00", "HH:mm"), attendee_ids: [persona.memberId], visibility: member ? "private" : "team" };
  const submit = async () => {
    const v = await form.validateFields();
    const date = v.date.format("YYYY-MM-DD");
    const start = v.allDay ? kstIso(date, "00:00") : kstIso(date, (v.start ?? dayjs("09:00", "HH:mm")).format("HH:mm"));
    const end = v.allDay ? kstIso(date, "23:59") : kstIso(date, (v.end ?? v.start ?? dayjs("10:00", "HH:mm")).format("HH:mm"));
    if (end < start) { form.setFields([{ name: "end", errors: ["끝 시각을 시작 뒤로 골라 주세요"] }]); return; }
    await create({
      resource: "calendar_events",
      values: { source: "manual", external_id: null, title: v.title.trim(), kind: v.kind, start_at: start, end_at: end, all_day: !!v.allDay, project_id: v.project_id ?? null, attendee_ids: v.attendee_ids ?? [], visibility: member ? "private" : v.visibility },
      successNotification: () => ({ type: "success", message: "일정을 추가했어요" }),
    });
    onSaved(date);
  };
  return (
      <DetailDrawer
        open
        title="일정 추가"
        onClose={onClose}
        footer={<Button type="primary" loading={createM.isPending} onClick={() => void submit().catch(() => undefined)}>추가하기</Button>}
      >
        <Form form={form} layout="vertical" className="cb-form" requiredMark={false} disabled={createM.isPending} initialValues={initial}>
          <Form.Item name="title" label="제목" rules={[{ required: true, message: "제목을 적어 주세요" }]}>
            <Input maxLength={60} placeholder="예: 고객사 방문" />
          </Form.Item>
          <Form.Item name="kind" label="종류">
            <Select options={kindOptions} />
          </Form.Item>
          <Form.Item name="date" label="날짜" rules={[{ required: true, message: "날짜를 골라 주세요" }]}>
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" allowClear={false} />
          </Form.Item>
          <Form.Item name="allDay" label="종일" valuePropName="checked">
            <Switch />
          </Form.Item>
          {!allDay && (
            <div className="ws-row" style={{ alignItems: "flex-start" }}>
              <Form.Item name="start" label="시작" style={{ flex: 1 }}><TimePicker format="HH:mm" minuteStep={10} style={{ width: "100%" }} allowClear={false} /></Form.Item>
              <Form.Item name="end" label="끝" style={{ flex: 1 }}><TimePicker format="HH:mm" minuteStep={10} style={{ width: "100%" }} allowClear={false} /></Form.Item>
            </div>
          )}
          <Form.Item name="project_id" label="프로젝트">
            <Select allowClear showSearch optionFilterProp="label" options={projectList.map((p) => ({ value: p.id, label: p.name }))} placeholder="프로젝트 고르기" />
          </Form.Item>
          <Form.Item name="attendee_ids" label="참석자">
            <Select mode="multiple" optionFilterProp="label" options={tenant.people.map((p) => ({ value: p.id, label: `${p.displayName} · ${p.jobTitle}` }))} />
          </Form.Item>
          {member ? (
            <Form.Item label="공개 범위" extra="구성원은 '나만' 일정만 만들 수 있어요. 참석자에게는 보여요.">
              <Select disabled value="private" options={optionsOf("calendar_events.visibility")} aria-label="공개 범위" />
            </Form.Item>
          ) : (
            <Form.Item name="visibility" label="공개 범위" extra="팀은 같은 조직 사람에게 보여요.">
              <Select options={optionsOf("calendar_events.visibility")} />
            </Form.Item>
          )}
        </Form>
      </DetailDrawer>
  );
}

const WEEKDAY_HEAD = ["월", "화", "수", "목", "금", "토", "일"];
/** 월 보기(월요일 시작). 칸마다 최대 3건(종류 글자 포함) + "+N". 날짜 숫자를 누르면 그 주 보기로 */
function MonthGrid({ from, to, month, today, byDay, onPick }: { from: string; to: string; month: string; today: string; byDay: Map<string, CalendarItem[]>; onPick: (d: string) => void }) {
  const weeks: string[][] = [];
  for (let d = from; d <= to; d = addDays(d, 7)) weeks.push(Array.from({ length: 7 }, (_, i) => addDays(d, i)));
  return (
    <table className="cb-monthgrid">
      <thead><tr>{WEEKDAY_HEAD.map((w) => <th key={w} scope="col">{w}</th>)}</tr></thead>
      <tbody>
        {weeks.map((week) => (
          <tr key={week[0]}>
            {week.map((d) => {
              const list = byDay.get(d) ?? [];
              const out = d.slice(0, 7) !== month;
              return (
                <td key={d} className={`${out ? "is-out" : ""}${d === today ? " is-today" : ""}`}>
                  <button type="button" className="cb-mday" onClick={() => onPick(d)} aria-label={`${formatDate(d)}${d === today ? " 오늘" : ""}, 일정 ${list.length}건, 주 보기로 가기`}>
                    {Number(d.slice(8))}
                  </button>
                  {list.length > 0 && (
                    <ul className="cb-cell">
                      {list.slice(0, 3).map((it) => <li key={it.id} title={it.title}><span className="cb-cell__kind">{labelOf("calendar_events.kind", it.kind)}</span>{it.title}</li>)}
                      {list.length > 3 && <li className="cb-cell__more">+{list.length - 3}</li>}
                    </ul>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
