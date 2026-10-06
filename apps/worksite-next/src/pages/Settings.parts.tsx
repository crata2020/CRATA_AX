// 설정 화면 조각: 화면 목록(도입 단계별), 브랜드 색 카드(Fintech 'Checking' 그라데이션 카드), 데이터 등급 표(리서치 04),
// 알림 기본값(Winx 'Hide this product' 체크 + 도움말 줄).
import { useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router";
import {
  AlarmClock, ArrowRight, Ban, Bot, Building2, ClipboardCheck, Factory, FileText, FolderKanban, Globe2, HeartHandshake, Home, Lock, Mail,
  MapPin, Mic, Moon, PenLine, PlugZap, PlusCircle, Settings as SettingsIcon, Users,
} from "lucide-react";
import { useApp } from "@/data/store";
import type { DataClass, PlatformRole, TenantId } from "@/data/types";
import { Bar, Button, Card, Chip, IconButton, PillSelect, StackBar, Toggle, cx, type Hue, type Tone } from "@/ui";
import { GradeTag, gradeRows } from "./Ai.parts";

// ───────── 화면 목록과 1단계에서 여는 화면(리서치 00: 처음엔 꼭 필요한 것만, TR 파일럿 회의 "화면은 7개만 먼저")
export interface Screen { to: string; label: string; icon: ReactNode; mfg?: boolean }
export const SCREENS: Screen[] = [
  { to: "/", label: "홈", icon: <Home /> },
  { to: "/tasks", label: "내 업무", icon: <ClipboardCheck /> },
  { to: "/projects", label: "프로젝트", icon: <FolderKanban /> },
  { to: "/meetings", label: "회의", icon: <Mic /> },
  { to: "/docs", label: "문서·학습", icon: <FileText /> },
  { to: "/quality", label: "현장·품질", icon: <Factory />, mfg: true },
  { to: "/report", label: "현장 등록", icon: <PlusCircle />, mfg: true },
  { to: "/ai", label: "AI 연결", icon: <Bot /> },
  { to: "/integrations", label: "도구 연결", icon: <PlugZap /> },
  { to: "/company", label: "회사 DNA", icon: <Building2 /> },
  { to: "/members", label: "구성원", icon: <Users /> },
  { to: "/settings", label: "설정", icon: <SettingsIcon /> },
  { to: "/ara", label: "ARA", icon: <HeartHandshake /> },
];
/** 1단계: 제조는 품질·현장 등록부터, 교육은 회의·문서 학습부터 */
export { PHASE1 } from "@/data/phase";

export const ROLE: Record<PlatformRole, string> = { owner: "소유자", admin: "관리자", reviewer: "검토자", member: "구성원" };
export const isAdminRole = (r: PlatformRole) => r === "owner" || r === "admin";

// ───────── 브랜드 색
const BRAND_FALLBACK: Record<TenantId, string[]> = {
  tr: ["#3b4fd8", "#2f40b8", "#eef0fd", "#d9ddfa"],
  crata: ["#0a7d70", "#08665b", "#e6f6f4", "#c4ebe6"],
};
const lum = (hex: string) => {
  const m = hex.replace("#", "");
  if (m.length !== 6) return 0;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
/** 흰 글자와의 대비(WCAG) */
const onWhite = (hex: string) => 1.05 / (lum(hex) + 0.05);

export function BrandCard({ className, name, monogram, onEdit }: { className?: string; name: string; monogram: string; onEdit: () => void }) {
  const { tenant, d } = useApp();
  // 회사별 브랜드 토큰(styles/tokens.css)을 그대로 읽어요
  const hex = useMemo(() => {
    const cs = getComputedStyle(document.documentElement);
    return ["--brand", "--brand-ink", "--brand-soft", "--brand-line"].map((v, i) => {
      const x = cs.getPropertyValue(v).trim();
      return /^#[0-9a-f]{6}$/i.test(x) ? x : BRAND_FALLBACK[tenant][i]!;
    });
  }, [tenant]);
  const sw = [
    { label: "주 색", v: hex[0]!, use: "버튼·선택" },
    { label: "진한 색", v: hex[1]!, use: "글자·눌림" },
    { label: "옅은 배경", v: hex[2]!, use: "칩·메뉴" },
    { label: "옅은 선", v: hex[3]!, use: "테두리" },
  ];
  const checks = [{ label: "흰 글자 · 주 색", v: hex[0]! }, { label: "흰 글자 · 진한 색", v: hex[1]! }].map((c) => {
    const r = onWhite(c.v);
    return { ...c, r, tone: (r >= 4.5 ? "good" : r >= 3 ? "warn" : "bad") as Tone, verdict: r >= 4.5 ? "통과" : r >= 3 ? "큰 글자만" : "부족" };
  });

  return (
    <Card className={className} title="브랜드 색" sub={`${d.shortName} 화면 전체의 강조색이에요`}
      actions={<IconButton label="브랜드 색 바꾸기" size="sm" onClick={onEdit}><PenLine /></IconButton>}>
      <div className="st-bcard" role="img" aria-label={`브랜드 카드 미리보기: ${name}, 주 색 ${hex[0]}`}>
        <svg className="st-bcard__arcs" viewBox="0 0 320 180" preserveAspectRatio="none" aria-hidden>
          <path d="M150 -10 C 170 60, 230 90, 330 70" /><path d="M200 -10 C 200 50, 250 120, 330 130" /><path d="M-10 150 C 80 110, 160 170, 240 190" />
        </svg>
        <div className="st-bcard__top">
          <span className="st-bcard__mono">{monogram || d.monogram}</span>
          <span className="st-bcard__name ellipsis">{name || d.name}</span>
        </div>
        <div className="st-bcard__bottom">
          <div>
            <div className="st-bcard__hex num">{hex[0]!.toUpperCase()}</div>
            <div className="st-bcard__lb">주 색 · 브랜드</div>
          </div>
          <span className="st-bcard__dots" aria-hidden><i /><i /></span>
        </div>
      </div>

      <ul className="st-sw">
        {sw.map((s) => (
          <li key={s.label}>
            <span className="st-sw__chip" style={{ background: s.v }} aria-hidden />
            <span className="st-sw__t">{s.label}</span>
            <span className="st-sw__v num">{s.v.toUpperCase()}</span>
          </li>
        ))}
      </ul>

      <ul className="st-contrast" aria-label="글자 대비 확인">
        {checks.map((c) => (
          <li key={c.label}>
            <span className="st-contrast__aa" style={{ background: c.v }} aria-hidden>가</span>
            <span className="st-contrast__t">{c.label}</span>
            <b className="num">{c.r.toFixed(1)}:1</b>
            <Chip tone={c.tone} sm>{c.verdict}</Chip>
          </li>
        ))}
      </ul>

      <div className="st-prev" aria-hidden>
        <span className="btn btn--brand btn--sm">버튼</span>
        <span className="chip chip--brand chip--sm"><i className="chip__dot" />선택됨</span>
        <span className="toggle" aria-checked="true" />
        <div style={{ flex: 1, minWidth: 60 }}><Bar value={64} /></div>
      </div>
    </Card>
  );
}

// ───────── 데이터 등급(리서치 04 · 2.1절)
const GRADE_COLOR: Record<DataClass, string> = { L0: "var(--c-green)", L1: "var(--c-blue)", L2: "var(--c-amber)", L3: "var(--c-coral)" };

export function GradeCard({ className }: { className?: string }) {
  const { d } = useApp();
  const nav = useNavigate();
  const rows = gradeRows(d);
  const projs = (g: DataClass) => d.projects.filter((p) => p.dataClass === g);
  const count = (g: DataClass) => projs(g).length;
  const meet = (g: DataClass) => d.meetings.filter((m) => m.dataClass === g).length;
  const parts = rows.map((r) => ({ label: r.code, value: count(r.code), color: GRADE_COLOR[r.code] })).filter((p) => p.value > 0);
  const routeIcon = (g: DataClass) => (g === "L3" ? <Ban /> : g === "L2" ? <MapPin /> : <Globe2 />);

  return (
    <Card className={cx("st-grades", className)} title="데이터 등급" sub="AI에 보내기 전에 등급부터 봐요. 등급마다 보관 위치와 AI 경로가 달라요" flush
      actions={<Chip tone="outline" sm><span className="num">프로젝트 {d.projects.length}개</span></Chip>}
      foot={<><span className="st-grades__rule"><Lock />L2만 국내 경로로 처리하고, L3는 어떤 AI에도 보내지 않아요.</span>
        <Button size="sm" variant="ghost" className="st-grades__go" onClick={() => nav("/ai")}>AI 연결 보기<ArrowRight /></Button></>}>
      <div className="st-grades__sum">
        <div className="st-grades__lg">
          {rows.map((r) => (
            <span key={r.code} className="tagsq"><i style={{ background: GRADE_COLOR[r.code] }} />{r.code}<b className="num">{count(r.code)}</b></span>
          ))}
          <span className="faint xs st-grades__note">한 회의에 등급이 섞이면 가장 높은 등급을 따라요{meet("L2") ? ` · L2 회의 ${meet("L2")}건` : ""}</span>
        </div>
        <StackBar label="프로젝트 등급" parts={parts} />
      </div>

      <div className="tablewrap st-hide-m">
        <table className="table st-gtable">
          <thead><tr><th>등급</th><th>보관 · 녹음</th><th>AI 경로</th><th>이 회사 프로젝트</th><th className="r">상태</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.code}>
                <td>
                  <div className="cellmain"><GradeTag code={r.code} />
                    <div style={{ minWidth: 0 }}><div className="cellmain__t">{r.name}</div><div className="cellmain__s">{r.example}</div></div>
                  </div>
                </td>
                <td><div className="st-gstore">{r.store}</div><div className="cellmain__s">녹음 · {r.record}</div></td>
                <td><span className={`st-route st-route--${r.code}`}>{routeIcon(r.code)}{r.route}</span></td>
                <td>
                  {count(r.code)
                    ? <div className="st-gproj"><b className="num">{count(r.code)}</b>개<span className="ellipsis" title={projs(r.code).map((p) => p.name).join(", ")}>{projs(r.code).map((p) => p.code).join(" · ")}</span></div>
                    : <span className="faint">{r.code === "L3" ? "들이지 않아요" : "없음"}</span>}
                </td>
                <td className="r"><Chip tone={r.tone} dot sm>{r.state}</Chip></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 모바일: 표 대신 줄 목록 */}
      <ul className="st-glist st-show-m">
        {rows.map((r) => (
          <li key={r.code}>
            <div className="row" style={{ gap: 10 }}>
              <GradeTag code={r.code} />
              <div style={{ minWidth: 0, flex: 1 }}><div className="cellmain__t">{r.name}</div><div className="cellmain__s">{r.example}</div></div>
            </div>
            <dl className="st-glist__dl">
              <div><dt>보관</dt><dd>{r.store}</dd></div>
              <div><dt>AI 경로</dt><dd><span className={`st-route st-route--${r.code}`}>{routeIcon(r.code)}{r.route}</span></dd></div>
              <div><dt>녹음</dt><dd>{r.record}</dd></div>
              <div><dt>프로젝트</dt><dd>{count(r.code) ? <><span className="num">{count(r.code)}</span>개 · {projs(r.code).map((p) => p.code).join(" · ")}</> : r.code === "L3" ? "들이지 않아요" : "없음"}</dd></div>
            </dl>
            <Chip tone={r.tone} dot sm>{r.state}</Chip>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ───────── 알림 기본값
export type NotifKey = "approve" | "due" | "field" | "meeting" | "ai" | "weekly" | "quiet";
export type Channel = "app" | "app-mail" | "app-chat";
export const NOTIFS: { key: NotifKey; icon: ReactNode; hue: Hue; t: string; s: string; on: boolean; mfg?: boolean }[] = [
  { key: "approve", icon: <ClipboardCheck />, hue: "brand", t: "승인 요청", s: "검토·배정·회의 확인이 오면 바로 알려요", on: true },
  { key: "due", icon: <AlarmClock />, hue: "coral", t: "마감 하루 전", s: "내 업무 마감 전날 09:00에 알려요", on: true },
  { key: "field", icon: <Factory />, hue: "orange", t: "현장 등록", s: "불량은 품질, 설비는 공장장, 아차사고·기타는 총무에게 바로 가요", on: true, mfg: true },
  { key: "meeting", icon: <Mic />, hue: "violet", t: "회의 분류 확인", s: "AI 확신이 낮은 구간만 참석자에게 물어봐요", on: true },
  { key: "ai", icon: <Bot />, hue: "cyan", t: "AI로 제출", s: "각자의 AI가 결과를 내면 검토자에게 알려요", on: true },
  { key: "weekly", icon: <Mail />, hue: "blue", t: "주간 요약 메일", s: "월요일 08:00에 지난주 흐름을 보내요", on: false },
  { key: "quiet", icon: <Moon />, hue: "amber", t: "조용한 시간", s: "22:00~07:00 알림은 모아서 아침에 보내요", on: true },
];
export const CHANNELS: { value: Channel; label: string }[] = [
  { value: "app", label: "앱 알림만" }, { value: "app-mail", label: "앱 + 메일" }, { value: "app-chat", label: "앱 + 메신저" },
];

export function NotifCard({ className, mfg, notif, channel, onNotif, onChannel }: {
  className?: string; mfg: boolean; notif: Record<NotifKey, boolean>; channel: Channel;
  onNotif: (k: NotifKey, v: boolean) => void; onChannel: (c: Channel) => void;
}) {
  const list = NOTIFS.filter((n) => !n.mfg || mfg);
  const on = list.filter((n) => notif[n.key]).length;
  return (
    <Card className={className} title="알림 기본값" sub={<>구성원이 각자 바꿀 수 있어요 · 켜짐 <span className="num">{on}/{list.length}</span></>}
      actions={<PillSelect label="받는 곳" value={channel} onChange={onChannel} options={CHANNELS} />}>
      <ul className="st-notif">
        {list.map((n) => (
          <li key={n.key}>
            <span className={`st-notif__ic tone-${n.hue}`}>{n.icon}</span>
            <div className="st-notif__main">
              <div className="st-notif__t">{n.t}<span className={cx("st-notif__state", notif[n.key] && "is-on")}>{notif[n.key] ? "켜짐" : "꺼짐"}</span></div>
              <div className="st-notif__s">{n.s}</div>
            </div>
            <Toggle on={notif[n.key]} onChange={(v) => onNotif(n.key, v)} label={`${n.t} 알림`} />
          </li>
        ))}
      </ul>
    </Card>
  );
}
