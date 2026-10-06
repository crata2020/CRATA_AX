// 홈 위젯 approval-inbox · 승인 대기 · 템플릿 action-list · 크기 M (빌드 스펙 3.1.1절 추가 위젯). 소유: home 그룹.
// 데이터: sel:widget.approval-inbox(src/data/seed/home.ts) — 검토·회의 액션·분류·결정·현장 배정·규칙 후보 중 '내 차례'이고 한 번 누르면 끝나는 것
// 도입 1단계 홈의 중심: AI(회사 규칙)가 담당·분류를 미리 채워 두고, 사람은 맞으면 한 번만 눌러요. 틀리면 '고치기'(상세 화면), 바쁘면 '나중에'(내일 다시).
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { App, Button } from "antd";
import { DownOutlined, RobotOutlined } from "@ant-design/icons";
import type { WidgetContext, WidgetDef } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { useRpc } from "@/lib/refine";
import { ListHead, WidgetState, useWidgetData } from "../lib/widgetKit";
import type { ApprovalAction, ApprovalInbox, ApprovalItem } from "../lib/types";
import "../lib/home.css";

/** 한 번에 보이는 줄 수(처리하면 다음 건이 올라와요). 히어로 옆 칸에서 히어로보다 너무 길어지지 않게 4 */
const VISIBLE = 4;
/** 머리 설명(데스크톱·태블릿은 머리에, 모바일은 첫 줄의 '승인'이 첫 화면에 보이게 목록 아래에 — home.css .wa-guide).
 *  보이는 줄에 있는 버튼 이름만 말해요: '고치기'가 없는데 '고치기'를 찾게 하지 않게(검토 줄의 보조 동작은 '수정 요청', 현장 배정은 '다른 담당') */
function guideFor(rows: ApprovalItem[]): string {
  if (rows.some((r) => r.editLabel === "고치기")) return "AI가 담당·분류를 미리 채웠어요. 맞으면 누르고, 다르면 '고치기'로 열어요.";
  if (rows.some((r) => r.kind === "field")) return "AI가 담당을 미리 골랐어요. 맞으면 누르고, 다르면 '다른 담당'을 눌러요.";
  return "맞으면 '승인', 고칠 게 있으면 '수정 요청'을 눌러요.";
}

/** 이 길이 이하의 ' · ' 조각은 한 덩어리(span.wa-row__seg — 한 줄 고정, 넘치면 말줄임)로 줄을 옮겨요: '어제 16:30 / 제출', '대표이사 / 확정' 같은 외톨이 없음.
 *  사람 이름·'추천 담당 …'은 길이와 상관없이 한 덩어리('총무·구매·경리 담당 A(예시)'가 제 가운뎃점에서 꺾이지 않게).
 *  그 밖의 긴 조각(회의 제목, 'AI 분류 사업 › 프로젝트')은 보통 글자처럼 흘려요 — 덩어리로 묶으면 조각마다 새 줄이 되어 세 줄 제한에 잘려요 */
const SEG_MAX = 16;
/** 사람을 가리키는 조각(seed home.ts personName의 대체어 포함) */
const PERSON_WORDS = ["나", "익명", "구성원"];

/** 부제를 ' · ' 조각으로. 구분점은 앞 조각 끝에 붙는 빈칸(U+00A0)으로 이어 줄 첫머리에 '·'만 남지 않게(ListRow와 같은 규칙),
 *  조각 사이 보통 빈칸에서만 줄이 꺾여요. 읽는 글자는 그대로 */
function SubSegments({ text, names }: { text: string; names: ReadonlySet<string> }) {
  const parts = text.split(" · ");
  if (parts.length < 2) return <>{text}</>;
  return (
    <>
      {parts.map((p, i) => {
        const piece = i < parts.length - 1 ? `${p}\u00a0·` : p;
        const keep = p.length <= SEG_MAX || p.startsWith("추천 담당 ") || names.has(p);
        return (
          <Fragment key={i}>
            {i > 0 && " "}
            {keep ? <span className="wa-row__seg">{piece}</span> : piece}
          </Fragment>
        );
      })}
    </>
  );
}

/** 종류 칩: 한 줄에 들어가는 칩만 두고 나머지는 마지막 '외 N종 M ▾' 칩으로 접어요(누르면 접힌 종류 목록 — 마우스·손가락·휴대폰 모두).
 *  칩 숫자의 합 = 머리의 건수(1440 7fr 칸에서 '작성 규칙 2'가 가림 밑에 숨어 12/14로 보이던 문제, 휴대폰 가로 스크롤도 같은 문제).
 *  접힌 목록은 <details> + 링크 목록(종류별 화면으로 가는 길이라 메뉴가 아닌 펼침 목록. 모양은 theme .ws-popmenu, antd Dropdown 묶음을 위젯에 더 끌어오지 않아요).
 *  바깥을 누르거나 초점이 나가거나 Esc면 닫혀요 */
function KindCounts({ counts }: { counts: ApprovalInbox["counts"] }) {
  const rowRef = useRef<HTMLElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDetailsElement>(null);
  const [fit, setFit] = useState(counts.length);
  const total = counts.reduce((s, x) => s + x.count, 0);

  useEffect(() => {
    const close = (e: Event) => {
      const d = moreRef.current;
      const esc = e.type === "keydown";
      if (!d?.open || (esc ? (e as KeyboardEvent).key !== "Escape" : d.contains(e.target as Node))) return;
      d.open = false;
      if (esc) d.querySelector("summary")?.focus();
    };
    const types = ["pointerdown", "focusin", "keydown"];
    for (const t of types) document.addEventListener(t, close);
    return () => { for (const t of types) document.removeEventListener(t, close); };
  }, []);

  // 칩 폭은 숨은 측정 줄(모든 칩 + 가장 넓은 '외 N종' 칩)에서 재요. 칸 폭·글꼴이 바뀌면 다시
  useLayoutEffect(() => {
    const row = rowRef.current;
    const meas = measureRef.current;
    if (!row || !meas) return;
    const update = () => {
      const els = Array.from(meas.children) as HTMLElement[];
      const more = els.pop();
      if (!more) return;
      const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
      const widths = els.map((el) => el.getBoundingClientRect().width);
      const avail = row.clientWidth;
      const all = widths.reduce((s, w) => s + w, 0) + gap * Math.max(0, widths.length - 1);
      if (all <= avail + 0.5) { setFit(widths.length); return; }
      let used = more.getBoundingClientRect().width;
      let n = 0;
      for (const w of widths) {
        if (used + gap + w > avail + 0.5) break;
        used += gap + w;
        n++;
      }
      setFit(n);
    };
    update();
    // 측정 줄은 폭 0 상자라(카드 밖으로 넘치지 않게) 칩 하나하나의 크기 변화(글꼴 교체)를 지켜봐요
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    ro?.observe(row);
    for (const el of Array.from(meas.children)) ro?.observe(el);
    return () => ro?.disconnect();
  }, [counts]);

  const shown = counts.slice(0, fit);
  const rest = counts.slice(fit);
  const restSum = rest.reduce((s, x) => s + x.count, 0);
  return (
    <div className="wa-counts-wrap">
      <nav className="wa-counts" aria-label="종류별로 보기" ref={rowRef}>
        {shown.map((x) => (
          <Link key={x.kind} className="wa-count" to={x.to}>{x.label}<b>{x.count}</b></Link>
        ))}
        {rest.length > 0 && (
          <details className="wa-more" ref={moreRef}>
            <summary className="wa-count wa-count--more" aria-label={`외 ${rest.length}종 ${restSum}건 더 보기`} title={rest.map((x) => `${x.label} ${x.count}`).join(" · ")}>
              외 {rest.length}종<b>{restSum}</b><DownOutlined aria-hidden />
            </summary>
            <ul className="ws-popmenu wa-more__menu">
              {rest.map((x) => <li key={x.kind}><Link className="ws-popmenu__item" to={x.to}>{x.label}<b>{x.count}건</b></Link></li>)}
            </ul>
          </details>
        )}
      </nav>
      <div className="wa-counts__measure" ref={measureRef} aria-hidden>
        {counts.map((x) => <span key={x.kind} className="wa-count">{x.label}<b>{x.count}</b></span>)}
        <span className="wa-count wa-count--more">외 {counts.length}종<b>{total}</b><DownOutlined /></span>
      </div>
    </div>
  );
}

/** '나중에': 이 브라우저에서 오늘 하루 숨김(기준 날짜가 바뀌면 다시 보여요). 저장이 막혀 있으면 이번 화면에서만 */
function useSnooze(storageKey: string, today: string) {
  const read = (): Record<string, string> => {
    try { return JSON.parse(localStorage.getItem(storageKey) ?? "{}") as Record<string, string>; } catch { return {}; }
  };
  const [map, setMap] = useState<Record<string, string>>(read);
  const write = (next: Record<string, string>) => {
    setMap(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* 저장 불가: 화면 상태만 */ }
  };
  const snoozed = useMemo(() => new Set(Object.entries(map).filter(([, d]) => d === today).map(([k]) => k)), [map, today]);
  return {
    snoozed,
    snooze: (key: string) => write({ ...Object.fromEntries(Object.entries(map).filter(([, d]) => d === today)), [key]: today }),
    clear: () => write({}),
  };
}

function Body({ ctx }: { ctx: WidgetContext }) {
  const state = useWidgetData<ApprovalInbox>("approval-inbox", ctx);
  const { tenant, persona, today } = useWorksite();
  const names = useMemo(() => new Set([...PERSON_WORDS, ...tenant.people.map((p) => p.displayName)]), [tenant.people]);
  const { message } = App.useApp();
  const { snoozed, snooze, clear } = useSnooze(`ws:v1:${tenant.tenantId}:snooze:${persona.memberId}`, today);
  const [busy, setBusy] = useState<string | null>(null);
  const runners: Record<ApprovalAction["rpc"], ReturnType<typeof useRpc>> = {
    approve_submission: useRpc("approve_submission"),
    accept_action_proposal: useRpc("accept_action_proposal"),
    confirm_segment: useRpc("confirm_segment"),
    confirm_decision: useRpc("confirm_decision"),
    assign_field_report: useRpc("assign_field_report"),
    approve_rule: useRpc("approve_rule"),
    reject_rule: useRpc("reject_rule"),
  };

  const act = async (item: ApprovalItem, a: ApprovalAction) => {
    setBusy(`${item.key}|${a.rpc}`);
    try {
      await runners[a.rpc].run(a.payload);
      message.success(a.done);
    } catch { /* 오류 토스트는 useRpc */ } finally {
      setBusy(null);
    }
  };

  return (
    <WidgetState
      state={state}
      isEmpty={(d) => d.items.length === 0 && d.manual.length === 0}
      render={(d) => {
        const open = d.items.filter((i) => !snoozed.has(i.key));
        const later = d.items.length - open.length;
        const shown = open.slice(0, VISIBLE);
        const guide = guideFor(shown);
        return (
          <>
            <ListHead
              count={open.length}
              unit="건"
              label="한 번 눌러 끝나요"
              note={open.length ? guide : "지금 승인할 건 모두 처리했어요."}
              noteClassName={open.length ? "wa-guide" : undefined}
            />
            {d.counts.length > 0 && <KindCounts counts={d.counts} />}
            {shown.length > 0 && (
              <ul className="ws-list wa-list" aria-label="승인 대기">
                {shown.map((it) => {
                  const pending = busy?.startsWith(`${it.key}|`) ?? false;
                  return (
                    <li key={it.key} className="wa-row">
                      <div className="wa-row__main">
                        <span className="wa-row__line">
                          <span className="ws-tag">{it.ai && <RobotOutlined aria-label="AI가 채움" />}{it.kindLabel}</span>
                          <Link className="wa-row__title" to={it.to}>{it.title}</Link>
                        </span>
                        <span className="wa-row__sub" title={it.subtitle}><SubSegments text={it.subtitle} names={names} /></span>
                      </div>
                      {/* 동작: 위 줄 = 주 동작(흰 알약) + 보조 RPC(글자 버튼), 아래 줄 = 고치기 링크 + 나중에. DOM·Tab 순서는 주 → 보조 → 고치기 → 나중에.
                          데스크톱·태블릿에서 흰 알약은 화면상 맨 오른쪽(CSS order, 분류 확인·작성 규칙 화면과 같은 자리) */}
                      <div className="wa-row__acts">
                        <div className="wa-row__primary">
                          <Button
                            className="ws-rowact"
                            loading={busy === `${it.key}|${it.primary.rpc}`}
                            disabled={pending && busy !== `${it.key}|${it.primary.rpc}`}
                            onClick={() => void act(it, it.primary)}
                            aria-label={`${it.primary.label}: ${it.title}`}
                          >
                            {it.primary.label}
                          </Button>
                          {it.secondary && (
                            <Button
                              type="text"
                              className="ws-rowact-text"
                              loading={busy === `${it.key}|${it.secondary.rpc}`}
                              disabled={pending && busy !== `${it.key}|${it.secondary.rpc}`}
                              onClick={() => void act(it, it.secondary!)}
                              aria-label={`${it.secondary.label}: ${it.title}`}
                            >
                              {it.secondary.label}
                            </Button>
                          )}
                        </div>
                        <div className="wa-row__minor">
                          <Link className="wa-link ws-rowact-text" to={it.to} aria-label={`${it.editLabel}: ${it.title}`}>{it.editLabel}</Link>
                          <Button type="text" className="wa-later ws-rowact-text" disabled={pending} onClick={() => snooze(it.key)} aria-label={`나중에(내일 다시): ${it.title}`}>나중에</Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {shown.length > 0 && <p className="wa-guide-m">{guide}</p>}
            {(open.length > VISIBLE || later > 0) && (
              <p className="wa-foot">
                {open.length > VISIBLE && <span>처리하면 다음 {open.length - VISIBLE}건이 올라와요.</span>}
                {later > 0 && (
                  <span>
                    나중에로 미룬 {later}건{" "}
                    <Button type="link" size="small" className="wa-inline" onClick={clear}>다시 보기</Button>
                  </span>
                )}
              </p>
            )}
            {d.manual.length > 0 && (
              <div className="wh-extra">
                <h3 className="wh-sub">직접 골라야 해요</h3>
                <ul className="ws-list" aria-label="직접 골라야 하는 것">
                  {d.manual.map((m) => (
                    <li key={m.label}>
                      <Link className="ws-listrow" to={m.to}>
                        <span className="ws-listrow__main"><span className="ws-listrow__title">{m.label}</span></span>
                        <span className="ws-listrow__trailing">{m.count}건</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        );
      }}
    />
  );
}

const widget: WidgetDef = {
  id: "approval-inbox",
  title: "승인 대기",
  size: "M",
  requires: { modules: ["tasks"] },
  emptyText: "지금 승인할 게 없어요. 새로 들어오면 여기에 모여요",
  Body,
};

export default widget;
