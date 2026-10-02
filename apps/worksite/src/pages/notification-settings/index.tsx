// 알림 설정 `/me/notifications` · H-03 · 깊이 B · 모듈 notifications · 소유: home 그룹
// 종류별 받을 곳(사이트만 켜고 끔, 메신저·메일은 2단계) · 묶음 주기 · 조용한 시간. owner·admin은 회사 기본값 카드까지.
// 데이터: notification_preferences(본인 행 + member_id=null 회사 기본값 행). 저장: rpc:save_notification_preferences(한 번에 upsert).
import "../home/lib/home.css";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Button, Select, Skeleton, Switch, Tooltip } from "antd";
import { Divider, EmptyState, PageHeader, SectionCard, SegmentedPills } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { usePageReady } from "@/app/pageReady";
import { useList, useRpc } from "@/lib/refine";
import { labelOf, type StatusValue } from "@/lib/status";
import type { NotificationPreference } from "@/types/entities";
import type { SaveNotificationPrefsInput } from "../home/lib/types";

type Kind = StatusValue<"notifications.kind">;
type Digest = SaveNotificationPrefsInput["digest"];

const KIND_HINT: Record<Kind, string> = {
  task_assigned: "나에게 업무가 배정되면",
  review_requested: "내가 검토할 제출이 들어오면",
  submission_returned: "내 제출에 수정 요청이 오면",
  submission_approved: "내 제출이 승인되면",
  due_soon: "오늘·내일 마감인 업무",
  overdue: "마감이 지난 업무",
  notice_must_read: "필독 공지는 늘 사이트로 받아요",
  meeting_review: "회의 분류 확인이 필요하면",
  rule_candidate: "작성 규칙 후보가 생기면",
  field_report: "현장 기록이 등록되면",
  safety_due: "법정 안전 일정이 다가오면",
  claim: "고객 클레임 진행 상황",
  system: "데모·정책 안내",
};
const ALL_KINDS = Object.keys(KIND_HINT) as Kind[];
const DIGESTS: { value: Digest; label: string }[] = [
  { value: "instant", label: "바로" },
  { value: "twice_daily", label: "하루 2번" },
  { value: "daily", label: "하루 1번" },
];
const DIGEST_HINT: Record<Digest, string> = {
  instant: "생기는 즉시 알려 드려요.",
  twice_daily: "오전 9시와 오후 2시에 모아서 알려 드려요. 검토 요청·필독 공지는 바로 보내요.",
  daily: "오전 9시에 하루치를 모아서 알려 드려요. 검토 요청·필독 공지는 바로 보내요.",
};
const HOURS = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`).map((v) => ({ value: v, label: v }));

interface PrefState { site: Record<string, boolean>; digest: Digest; quietOn: boolean; from: string; to: string }

function resolve(rows: NotificationPreference[], owner: string | null, fallback?: PrefState): { state: PrefState; own: boolean } {
  const mine = rows.filter((r) => r.member_id === owner);
  const star = mine.find((r) => r.kind === "*");
  const base: PrefState = fallback ?? { site: {}, digest: "twice_daily", quietOn: true, from: "19:00", to: "08:00" };
  const site: Record<string, boolean> = {};
  for (const k of ALL_KINDS) {
    const row = mine.find((r) => r.kind === k);
    site[k] = k === "notice_must_read" ? true : row ? row.channels.site : base.site[k] ?? true;
  }
  return {
    own: mine.length > 0,
    state: {
      site,
      digest: star?.digest ?? base.digest,
      quietOn: star ? !!star.quiet_hours : base.quietOn,
      from: star?.quiet_hours?.from ?? base.from,
      to: star?.quiet_hours?.to ?? base.to,
    },
  };
}

function PrefsCard({ scope, title, caption, initial, kinds }: { scope: "me" | "company"; title: string; caption?: string; initial: PrefState; kinds: Kind[] }) {
  const [s, setS] = useState<PrefState>(initial);
  useEffect(() => { setS(initial); }, [initial]);
  const dirty = JSON.stringify(s) !== JSON.stringify(initial);
  const { run, isPending } = useRpc("save_notification_preferences", { successMessage: scope === "company" ? "회사 기본값을 저장했어요" : "알림 설정을 저장했어요" });
  const save = () => run({ scope, digest: s.digest, quietHours: s.quietOn ? { from: s.from, to: s.to } : null, site: s.site } satisfies SaveNotificationPrefsInput).catch(() => undefined);
  const id = `pref-${scope}`;

  return (
    <SectionCard title={title} caption={caption} demo={false}>
      <h3 className="wh-sub" id={`${id}-kinds`}>종류별 받기</h3>
      <p className="wh-prefs__mnote">사이트 알림만 켜고 끌 수 있어요. 메신저·메일은 2단계에서 열려요.</p>
      <div className="wh-prefs" role="table" aria-labelledby={`${id}-kinds`}>
        <div role="row" style={{ display: "contents" }}>
          <span className="wh-prefs__head" role="columnheader">종류</span>
          <span className="wh-prefs__head" role="columnheader">사이트</span>
          {/* 연동 전 채널은 머리에 '연동 전' 태그 하나만 두고 칸은 비워요(끈 스위치 26개가 화면을 무겁게 했어요) */}
          <span className="wh-prefs__head wh-prefs__head--ext" role="columnheader">메신저 <span className="ws-tag wh-prefs__soon">연동 전</span></span>
          <span className="wh-prefs__head wh-prefs__head--ext" role="columnheader">메일 <span className="ws-tag wh-prefs__soon">연동 전</span></span>
        </div>
        {kinds.map((k) => {
          const label = labelOf("notifications.kind", k);
          const locked = k === "notice_must_read";
          return (
            <Fragment key={k}>
              <div role="row" style={{ display: "contents" }}>
                <div className="wh-prefs__kind" role="rowheader"><strong>{label}</strong><span>{KIND_HINT[k]}</span></div>
                <div className="wh-prefs__cell" role="cell">
                  <Tooltip title={locked ? "필독 공지는 끌 수 없어요" : undefined}>
                    <Switch
                      checked={s.site[k] !== false}
                      disabled={locked}
                      aria-label={`${label} 사이트 알림`}
                      onChange={(v) => setS((p) => ({ ...p, site: { ...p.site, [k]: v } }))}
                    />
                  </Tooltip>
                </div>
                <div className="wh-prefs__cell wh-prefs__cell--ext" role="cell">
                  <span className="ws-muted" aria-hidden>—</span><span className="ws-sr-only">{label} 메신저 알림: 연동 전</span>
                </div>
                <div className="wh-prefs__cell wh-prefs__cell--ext" role="cell">
                  <span className="ws-muted" aria-hidden>—</span><span className="ws-sr-only">{label} 메일 알림: 연동 전</span>
                </div>
              </div>
            </Fragment>
          );
        })}
      </div>
      <Divider />
      <div className="wh-field">
        <span className="wh-field__label" id={`${id}-digest`}>묶음 주기</span>
        <SegmentedPills<Digest> ariaLabel="묶음 주기" options={DIGESTS} value={s.digest} onChange={(v) => setS((p) => ({ ...p, digest: v }))} />
        <span className="wh-field__hint">{DIGEST_HINT[s.digest]}</span>
      </div>
      <Divider />
      <div className="wh-field">
        <div className="wh-setrow">
          <span className="wh-field__label">조용한 시간</span>
          <Switch checked={s.quietOn} aria-label="조용한 시간 쓰기" onChange={(v) => setS((p) => ({ ...p, quietOn: v }))} />
        </div>
        {s.quietOn && (
          <div className="wh-quiet">
            <Select aria-label="조용한 시간 시작" value={s.from} options={HOURS} style={{ width: 112 }} onChange={(v) => setS((p) => ({ ...p, from: v }))} />
            <span className="ws-ink-2">부터</span>
            <Select aria-label="조용한 시간 끝" value={s.to} options={HOURS} style={{ width: 112 }} onChange={(v) => setS((p) => ({ ...p, to: v }))} />
            <span className="ws-ink-2">까지</span>
          </div>
        )}
        <span className="wh-field__hint">{s.quietOn ? "이 시간에 온 알림은 모아 두었다가 끝나는 시각에 보내요." : "언제든 바로 받아요."}</span>
      </div>
      <div className="wh-cardfoot">
        <Button onClick={() => setS(initial)} disabled={!dirty || isPending}>되돌리기</Button>
        <Button type="primary" onClick={() => void save()} loading={isPending} disabled={!dirty}>{scope === "company" ? "회사 기본값 저장하기" : "저장하기"}</Button>
      </div>
    </SectionCard>
  );
}

export default function NotificationSettingsPage() {
  const { persona, tenant, isModuleOn } = useWorksite();
  const { result, query } = useList<NotificationPreference>({ resource: "notification_preferences", pagination: { mode: "off" } });
  usePageReady(!query.isLoading);
  const rows = result?.data ?? [];
  const adminish = persona.role === "owner" || persona.role === "admin";
  const kinds = useMemo(() => ALL_KINDS.filter((k) => {
    if (k === "field_report" || k === "claim") return tenant.packs.includes("manufacturing");
    if (k === "safety_due") return isModuleOn("safety-health");
    if (k === "rule_candidate") return isModuleOn("correction-rules");
    if (k === "meeting_review") return isModuleOn("meetings");
    return true;
  }), [tenant.packs, isModuleOn]);

  const company = useMemo(() => resolve(rows, null), [rows]);
  const mine = useMemo(() => resolve(rows, persona.memberId, company.state), [rows, persona.memberId, company.state]);

  return (
    <>
      <PageHeader title="알림 설정" description="업무 시간 밖에는 조용히 모아서 보내요." />
      {query.isLoading ? (
        <SectionCard ariaLabel="알림 설정 불러오는 중"><Skeleton active paragraph={{ rows: 8 }} /></SectionCard>
      ) : query.isError ? (
        <EmptyState kind="error" action={{ label: "다시 시도", onClick: () => void query.refetch() }} />
      ) : (
        <div className="ws-stack">
          <PrefsCard
            scope="me"
            title="내 알림"
            caption={mine.own ? "내가 정한 설정을 쓰고 있어요." : "아직 회사 기본값을 따르고 있어요. 바꿔서 저장하면 내 설정이 돼요."}
            initial={mine.state}
            kinds={kinds}
          />
          {adminish && (
            <PrefsCard
              scope="company"
              title="회사 기본값"
              caption="설정을 따로 저장하지 않은 구성원에게 적용돼요."
              initial={company.state}
              kinds={kinds}
            />
          )}
        </div>
      )}
    </>
  );
}
