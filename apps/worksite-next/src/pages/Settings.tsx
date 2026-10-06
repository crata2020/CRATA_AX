// 설정(관리자): Winx 'Add Products'(refs/winx-add-product-form.jpg) — 제목 줄 오른쪽 'Discard'(흰 테두리) + 'Add'(짙은) → 되돌리기·저장하기,
// 왼쪽 넓은 폼(섹션 제목 + 둥근 알약 입력 + 두 칸 입력)과 오른쪽 좁은 상태 열('Product Status' 선택·체크 + 도움말) → 회사 정보 / 도입 진행·알림 기본값.
// Fintech 'Accounts'(refs/fintech-accounts.jpg) — 'Total Balance' 큰 숫자 + 날짜 알약 → 도입 단계, 'Recent Transactions'(Today/Yesterday 묶음 + 원 아이콘 줄)
// → 단계 체크리스트(남은 일/끝난 일), 'Checking' 그라데이션 카드 + 연필 네모 → 브랜드 색, 'Recent Contacts' → 설정 권한.
// 내용: 리서치 00(처음엔 꼭 필요한 화면만 → 전체), 04(데이터 등급 L0~L3 보관 위치·AI 경로), 09(회사 ID로 데이터 분리).
import { useState } from "react";
import { useNavigate } from "react-router";
import { CalendarDays, Check, CheckCircle2, Copy, Factory, Fingerprint, GraduationCap, Home, Layers, LayoutGrid, Lock, RotateCcw, Target } from "lucide-react";
import { useApp } from "@/data/store";
import { md } from "@/data/format";
import type { TenantData } from "@/data/types";
import { Avatar, AvatarStack, Bar, Button, Card, Chip, Empty, IconButton, PageHead, Track, cx } from "@/ui";
import { Gauge } from "@/ui/charts";
import {
  BrandCard, GradeCard, NOTIFS, NotifCard, PHASE1, ROLE, SCREENS, isAdminRole, type Channel, type NotifKey,
} from "./Settings.parts";
import "./Settings.css";

export default function Settings() {
  const { me, tenant } = useApp();
  if (!isAdminRole(me.platform)) return <NoAccess />;
  return <SettingsView key={tenant} />;
}

// ───────── 관리자가 아닐 때
function NoAccess() {
  const { d, me } = useApp();
  const nav = useNavigate();
  const admins = d.people.filter((p) => isAdminRole(p.platform));
  return (
    <>
      <PageHead title="설정" desc="도입 단계와 회사 기본값은 소유자·관리자가 정해요." />
      <section className="card st-deny">
        <Empty icon={<Lock />} title="관리자만 볼 수 있는 화면이에요">
          <span className="muted small">{me.name}님은 {ROLE[me.platform]} 권한이에요. 바꿀 게 있으면 아래 분께 말해 주세요.</span>
          <ul className="st-deny__who">
            {admins.map((p) => (
              <li key={p.id}><Avatar name={p.name} size="sm" /><span>{p.name}</span><Chip tone={p.platform === "owner" ? "dark" : "outline"} sm>{ROLE[p.platform]}</Chip></li>
            ))}
          </ul>
          <Button variant="dark" icon={<Home />} style={{ marginTop: 6 }} onClick={() => nav("/")}>홈으로</Button>
        </Empty>
      </section>
    </>
  );
}

// ───────── 저장 전 초안(회사 정보 + 알림 기본값)
interface Draft { name: string; shortName: string; monogram: string; tagline: string; industry: string; channel: Channel; notif: Record<NotifKey, boolean> }
const draftOf = (d: TenantData): Draft => ({
  name: d.name, shortName: d.shortName, monogram: d.monogram, tagline: d.tagline, industry: d.industry, channel: "app",
  notif: Object.fromEntries(NOTIFS.map((n) => [n.key, n.on])) as Record<NotifKey, boolean>,
});
const TEXT_KEYS = ["name", "shortName", "monogram", "tagline", "industry", "channel"] as const;
const diff = (a: Draft, b: Draft) =>
  TEXT_KEYS.filter((k) => a[k].trim() !== b[k].trim()).length + NOTIFS.filter((n) => a.notif[n.key] !== b.notif[n.key]).length;

const PACKS: { value: TenantData["pack"]; icon: JSX.Element; t: string; s: string }[] = [
  { value: "manufacturing", icon: <Factory />, t: "제조 팩", s: "현장·품질 · 현장 등록 · 8D·4M" },
  { value: "education", icon: <GraduationCap />, t: "교육·컨설팅 팩", s: "강의·연수 서식 · 학맞통 · 제안서" },
];

function SettingsView() {
  const { d, me, act, toast, tenant } = useApp();
  const nav = useNavigate();
  const admins = d.people.filter((p) => isAdminRole(p.platform));
  const mfg = d.pack === "manufacturing";
  const [saved, setSaved] = useState<Draft>(() => draftOf(d));
  const [draft, setDraft] = useState<Draft>(saved);
  const changes = diff(saved, draft);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((x) => ({ ...x, [k]: v }));

  // 도입 단계
  const { stage, steps, goal } = d.rollout;
  const done = steps.filter((s) => s.done).length;
  const current = steps.find((s) => !s.done);
  const screens = SCREENS.filter((s) => !s.mfg || mfg);
  const open = stage === "phase1" ? PHASE1[d.pack] : screens.map((s) => s.to);
  const openN = screens.filter((s) => open.includes(s.to)).length;
  const left = steps.filter((s) => !s.done), finished = steps.filter((s) => s.done);
  const by = (o: "CRATA" | "회사") => ({ done: steps.filter((s) => s.owner === o && s.done).length, all: steps.filter((s) => s.owner === o).length });
  const owners = [{ o: "CRATA" as const, color: "var(--c-violet)", ...by("CRATA") }, { o: "회사" as const, color: "var(--brand)", ...by("회사") }];

  const save = () => {
    if (!changes) { toast("바뀐 설정이 없어요"); return; }
    setSaved(draft);
    toast(`설정 ${changes}개를 저장했어요`);
  };
  const discard = () => { setDraft(saved); toast("저장 전으로 되돌렸어요"); };
  const copyId = () => {
    try { void navigator.clipboard?.writeText(tenant); } catch { /* 복사 불가 */ }
    toast("회사 ID를 복사했어요");
  };

  const stepRow = (s: (typeof steps)[number]) => {
    const i = steps.indexOf(s);
    const now = s.id === current?.id;
    return (
      <li key={s.id} className={cx("st-step", s.done && "is-done", now && "is-now")}>
        <span className="st-step__ic" aria-hidden>{s.done ? <Check /> : <span className="num">{i + 1}</span>}</span>
        <span className="sr-only">{s.done ? "끝남" : now ? "지금 할 일" : "남음"}</span>
        <div className="st-step__main">
          <div className="st-step__t">{s.title}{now && <Chip tone="warn" sm>지금</Chip>}</div>
          <div className="st-step__s">{s.detail}</div>
        </div>
        <Chip tone={s.owner === "CRATA" ? "outline" : "brand"} sm>{s.owner}</Chip>
      </li>
    );
  };

  return (
    <>
      <PageHead
        title="설정"
        desc="도입 단계와 회사 기본값을 정해요. 소유자·관리자만 바꿀 수 있어요."
        actions={
          <div className="st-acts">
            <button type="button" className="st-who" onClick={() => nav("/members")}
              aria-label={`설정 권한: ${admins.map((a) => `${a.name}(${ROLE[a.platform]})`).join(", ")}. 구성원 화면에서 바꿔요`}>
              <AvatarStack names={admins.map((a) => a.name)} />
              <span>{admins.some((a) => a.id === me.id) ? "나 포함 " : ""}관리자 <b className="num">{admins.length}</b>명</span>
            </button>
            <Button icon={<RotateCcw />} disabled={!changes} onClick={discard}>되돌리기</Button>
            <Button variant="dark" icon={<Check />} count={changes || undefined} onClick={save}>저장하기</Button>
          </div>
        }
      />

      <div className="st-layout">
        <div className="st-main">
          {/* 도입 단계(Fintech 'Total Balance' + 'Recent Transactions') */}
          <Card className="st-o1 st-stage" title="도입 단계"
            sub={stage === "phase1" ? "꼭 필요한 화면만 열었어요. 익숙해지면 전체로 바꿔요" : "모든 화면을 열었어요. 처음 쓰는 회사는 1단계부터 권해요"}
            actions={<Track label="도입 단계" value={stage} onChange={(v) => act.setStage(v)} options={[
              { value: "phase1", label: "1단계", icon: <Layers /> }, { value: "full", label: "전체", icon: <LayoutGrid /> },
            ]} />}>
            <div className="st-hero">
              <div>
                <div className="muted small">구성원에게 열린 화면</div>
                <div className="st-hero__big num">{openN}<span>/{screens.length}개</span></div>
              </div>
              <Chip tone={stage === "phase1" ? "warn" : "good"} dot>{stage === "phase1" ? "1단계 운영 중" : "전체 운영 중"}</Chip>
            </div>
            <ul className="st-screens" aria-label="화면별 열림 상태">
              {screens.map((s) => {
                const on = open.includes(s.to);
                return (
                  <li key={s.to} className={cx("st-screen", !on && "is-off")}>
                    {s.icon}<span>{s.label}</span>{!on && <em>나중에</em>}
                  </li>
                );
              })}
            </ul>

            <div className="st-steps">
              <div className="st-steps__head">
                <span className="st-steps__title">단계 체크리스트</span>
                <span className="faint xs num">{done}/{steps.length} 끝남</span>
              </div>
              {left.length > 0 && <><div className="st-steps__grp">남은 일 <span className="num">{left.length}</span></div><ul>{left.map(stepRow)}</ul></>}
              {finished.length > 0 && <><div className="st-steps__grp">끝난 일 <span className="num">{finished.length}</span></div><ul>{finished.map(stepRow)}</ul></>}
            </div>
          </Card>

          {/* 회사 정보(Winx 폼) */}
          <Card className="st-o4" title="회사 정보" sub="화면 이름과 업종 팩이에요"
            actions={changes ? <Chip tone="warn" dot sm>저장 안 한 변경 <span className="num">{changes}</span></Chip> : <Chip tone="good" dot sm>저장됨</Chip>}>
            <section className="st-sec">
              <h3 className="st-sec__t">기본 정보</h3>
              <label className="st-field">
                <span className="st-field__l">회사 이름</span>
                <input className="st-input" value={draft.name} onChange={(e) => set("name", e.target.value)} maxLength={40} placeholder="회사 이름" />
              </label>
              <div className="st-two">
                <label className="st-field">
                  <span className="st-field__l">짧은 이름</span>
                  <input className="st-input" value={draft.shortName} onChange={(e) => set("shortName", e.target.value)} maxLength={12} placeholder="메뉴·알림에 써요" />
                </label>
                <label className="st-field">
                  <span className="st-field__l">모노그램 <em className="num">{draft.monogram.length}/3</em></span>
                  <input className="st-input num" value={draft.monogram} onChange={(e) => set("monogram", e.target.value.toUpperCase())} maxLength={3} placeholder="TR" />
                </label>
              </div>
              <div className="st-two">
                <label className="st-field">
                  <span className="st-field__l">한 줄 소개</span>
                  <input className="st-input" value={draft.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={30} />
                </label>
                <label className="st-field">
                  <span className="st-field__l">업종</span>
                  <input className="st-input" value={draft.industry} onChange={(e) => set("industry", e.target.value)} maxLength={40} />
                </label>
              </div>
            </section>

            <section className="st-sec">
              <h3 className="st-sec__t">업종 팩</h3>
              <ul className="st-packs" aria-label="업종 팩">
                {PACKS.map((p) => {
                  const on = p.value === d.pack;
                  return (
                    <li key={p.value} className={cx("st-pack", on && "is-on")}>
                      <span className={`st-pack__ic tone-${p.value === "manufacturing" ? "orange" : "cyan"}`}>{p.icon}</span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="st-pack__t">{p.t}</div>
                        <div className="st-pack__s">{p.s}</div>
                      </div>
                      {on ? <CheckCircle2 className="st-pack__ok" aria-hidden /> : <Lock className="st-pack__lock" aria-hidden />}
                      <span className="sr-only">{on ? "지금 쓰는 팩" : "CRATA에 요청해야 바꿀 수 있어요"}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="st-help">팩을 바꾸면 메뉴와 서식이 함께 바뀌어요. 팩 바꾸기는 CRATA에 요청해요.</p>
            </section>

            <section className="st-sec">
              <h3 className="st-sec__t">회사 ID</h3>
              <div className="st-id">
                <Fingerprint aria-hidden />
                <code className="num">{tenant}</code>
                <span className="st-id__lock"><Lock />바꿀 수 없어요</span>
                <IconButton label="회사 ID 복사" size="sm" onClick={copyId}><Copy /></IconButton>
              </div>
              <p className="st-help">AI 연결 로그인 토큰에 이 ID가 담겨요. 다른 회사 업무 번호를 넣으면 ‘없음’으로 답해요.</p>
            </section>
          </Card>

        </div>

        <div className="st-side">
          {/* 도입 진행(반원 게이지) */}
          <Card className="st-o2" title="도입 진행" actions={<span className="st-datepill"><CalendarDays />{md(d.today)} 기준</span>}>
            <div className="st-gauge">
              <Gauge value={done} max={steps.length} size={220} label={`${Math.round((done / steps.length) * 100)}%`} sub={<span className="num">{done}/{steps.length}단계 끝남</span>} />
            </div>
            <ul className="st-owners">
              {owners.map((o) => (
                <li key={o.o}>
                  <span className="st-owners__t"><i style={{ background: o.color }} />{o.o === "CRATA" ? "CRATA가 할 일" : "회사가 할 일"}</span>
                  <Bar value={o.all ? (o.done / o.all) * 100 : 0} color={o.color} label={`${o.o} 진행`} />
                  <b className="num">{o.done}/{o.all}</b>
                </li>
              ))}
            </ul>
            <div className="st-goal">
              <span className="st-goal__ic tone-orange"><Target /></span>
              <div style={{ minWidth: 0 }}>
                <div className="st-goal__l">이번 단계 목표</div>
                <div className="st-goal__t">{goal}</div>
              </div>
            </div>
          </Card>

          <BrandCard className="st-o3" name={draft.name} monogram={draft.monogram}
            onEdit={() => toast("색 바꾸기는 CRATA에 요청해요. 글자 대비를 확인하고 바꿔요")} />

          <NotifCard className="st-o6" mfg={mfg} notif={draft.notif} channel={draft.channel}
            onNotif={(k, v) => set("notif", { ...draft.notif, [k]: v })} onChannel={(c) => set("channel", c)} />
        </div>
      </div>

      <GradeCard className="st-gwide" />

      <p className="faint xs st-foot"><Lock size={14} />저장은 데모라 이 화면에서만 바뀌어요. 도입 단계는 바로 적용돼요.</p>
    </>
  );
}
