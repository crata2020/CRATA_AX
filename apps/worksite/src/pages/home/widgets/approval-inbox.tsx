// 홈 위젯 approval-inbox · 승인 대기 · 템플릿 action-list · 크기 M (빌드 스펙 3.1.1절 추가 위젯). 소유: home 그룹.
// 데이터: sel:widget.approval-inbox(src/data/seed/home.ts) — 검토·회의 액션·분류·결정·현장 배정·규칙 후보 중 '내 차례'이고 한 번 누르면 끝나는 것
// 도입 1단계 홈의 중심: AI(회사 규칙)가 담당·분류를 미리 채워 두고, 사람은 맞으면 한 번만 눌러요. 틀리면 '고치기'(상세 화면), 바쁘면 '나중에'(내일 다시).
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { App, Button } from "antd";
import { RobotOutlined } from "@ant-design/icons";
import type { WidgetContext, WidgetDef } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { useRpc } from "@/lib/refine";
import { ListHead, WidgetState, useWidgetData } from "../lib/widgetKit";
import type { ApprovalAction, ApprovalInbox, ApprovalItem } from "../lib/types";
import "../lib/home.css";

/** 한 번에 보이는 줄 수(처리하면 다음 건이 올라와요). 히어로 옆 칸에서 히어로보다 너무 길어지지 않게 4 */
const VISIBLE = 4;

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
        return (
          <>
            <ListHead
              count={open.length}
              unit="건"
              label="한 번 눌러 끝나요"
              note={open.length ? "AI가 담당·분류를 미리 채웠어요. 맞으면 누르고, 다르면 '고치기'로 열어요." : "지금 승인할 건 모두 처리했어요."}
            />
            {d.counts.length > 0 && (
              <nav className="wa-counts" aria-label="종류별로 보기">
                {d.counts.map((x) => (
                  <Link key={x.kind} className="wa-count" to={x.to}>{x.label}<b>{x.count}</b></Link>
                ))}
              </nav>
            )}
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
                        <span className="wa-row__sub">{it.subtitle}</span>
                      </div>
                      {/* 동작: 위 줄 = 주 동작(흰 알약) + 보조 RPC(글자 버튼), 아래 줄 = 고치기 링크 + 나중에. DOM·Tab 순서는 주 → 보조 → 고치기 → 나중에 */}
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
