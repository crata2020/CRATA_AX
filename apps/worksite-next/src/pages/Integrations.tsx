// 도구 연결: Orbix CRM Integrations(refs/orbixcrm-integrations-grid.jpg) — 검색 줄 + 2열 카드 격자(로고 네모·이름·설명, 오른쪽 연결 단추·ⓘ),
// 연결된 카드는 브랜드 테두리. 왼쪽 'Categories' 목록은 브리프대로 밑줄 탭(아이콘 + 글자 + 건수)으로 바꿨어요.
// 위 '만들지 않고 연결해요' 띠는 리서치 00 '만들지 말 것'(메일 클라이언트·문서 에디터·STT)을 화면에 그대로 옮긴 것.
import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight, CheckCircle2, Clock3, FileText, Info, LayoutGrid, Mail, MessageSquare, Mic, Plus, QrCode, Search, Stamp, X,
} from "lucide-react";
import { useApp } from "@/data/store";
import type { DataClass, Integration } from "@/data/types";
import { Button, Card, Chip, Drawer, Empty, IconButton, MoreButton, PageHead, PillSelect, Tabs, Toggle, cx, type Hue, type Tone } from "@/ui";
import { GradeTag } from "./Ai.parts";
import "./Integrations.css";

type Cat = Integration["category"];
const CATS: { value: Cat; icon: ReactNode; hue: Hue; grade: DataClass; does: string; not: string }[] = [
  { value: "회의 녹음", icon: <Mic />, hue: "violet", grade: "L1", does: "녹음이 끝나면 전사본을 받아 구간을 나누고 사업·프로젝트로 분류해요.", not: "녹음·전사(STT)는 만들지 않아요. 녹음기와 전사는 원래 도구가 해요." },
  { value: "메일", icon: <Mail />, hue: "coral", grade: "L1", does: "본인 계정으로 읽기 권한만 받아 메일을 프로젝트에 붙이고 후속 업무를 제안해요.", not: "메일 앱은 만들지 않아요. 보내기·답장은 원래 메일에서 해요." },
  { value: "문서·지식", icon: <FileText />, hue: "blue", grade: "L1", does: "산출물 폴더의 새 판을 등록하고 결정 이력·회의 요약을 지식 페이지로 보내요.", not: "문서 에디터·위키는 만들지 않아요. 원본은 Drive·Notion에 그대로 있어요." },
  { value: "메신저·협업", icon: <MessageSquare />, hue: "amber", grade: "L1", does: "승인 요청과 알림만 보내요. 버튼을 누르면 바로 처리돼요.", not: "대화 내용은 가져오지 않아요." },
  { value: "결재·ERP", icon: <Stamp />, hue: "cyan", grade: "L2", does: "결재 상태와 수주·품목을 업무 옆에 보여 줘요.", not: "결재선·ERP를 새로 만들지 않아요. 원본은 그룹웨어·ERP에 있어요." },
  { value: "현장", icon: <QrCode />, hue: "orange", grade: "L1", does: "설비·공정 QR을 찍으면 위치가 채워져 현장 등록이 탭 두 번으로 끝나요.", not: "설비 관리 시스템을 따로 만들지 않아요." },
];
/** 분류 기본 등급과 다른 도구(학교 공문은 일정만 가져와 학생 정보가 없어요) */
const GRADE_OVERRIDE: Record<string, DataClass> = { neis: "L1" };
const gradeOf = (it: Integration): DataClass => GRADE_OVERRIDE[it.id] ?? CAT[it.category]?.grade ?? "L1";
const CAT = Object.fromEntries(CATS.map((c) => [c.value, c])) as Record<Cat, (typeof CATS)[number]>;
const STATUS: Record<Integration["status"], { label: string; tone: Tone }> = {
  connected: { label: "연결됨", tone: "good" }, available: { label: "연결 가능", tone: "outline" }, planned: { label: "예정", tone: "neutral" },
};
/** 리서치 00 '만들지 말 것' → 대신 연결하는 분류 */
const NOT_BUILD: { cat: Cat; title: string; sub: string }[] = [
  { cat: "메일", title: "메일 앱", sub: "본인 계정으로 읽기만 연결" },
  { cat: "문서·지식", title: "문서 에디터·위키", sub: "산출물 폴더·지식 페이지에 연결" },
  { cat: "회의 녹음", title: "녹음·전사(STT)", sub: "전사본을 받아 분류만" },
];

/** 밝은 로고 색이면 글자를 짙게 */
const inkOn = (hex: string) => {
  const m = hex.replace("#", "");
  if (m.length !== 6) return "#fff";
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m.slice(i, i + 2), 16) / 255);
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b! > 0.62 ? "#17171c" : "#fff";
};
function Logo({ it, size = 44 }: { it: Integration; size?: number }) {
  return <span className="ig-logo" aria-hidden style={{ width: size, height: size, background: it.color, color: inkOn(it.color), fontSize: it.mono.length > 1 ? size * 0.3 : size * 0.4 }}>{it.mono}</span>;
}

export default function Integrations() {
  const { d, act, toast } = useApp();
  const [tab, setTab] = useState<Cat | "all">("all");
  const [q, setQ] = useState("");
  const [st, setSt] = useState<Integration["status"] | "any">("any");
  const [infoId, setInfoId] = useState<string | null>(null);
  const [ask, setAsk] = useState(false);
  const [askName, setAskName] = useState("");
  const [askCat, setAskCat] = useState<Cat>("메일");

  const all = d.integrations;
  const cats = CATS.filter((c) => all.some((i) => i.category === c.value));
  const count = (s: Integration["status"]) => all.filter((i) => i.status === s).length;
  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    return all.filter((i) => (tab === "all" || i.category === tab) && (st === "any" || i.status === st) && (!k || `${i.name} ${i.desc} ${i.category}`.toLowerCase().includes(k)));
  }, [all, tab, st, q]);
  const info = all.find((i) => i.id === infoId) ?? null;

  const toggle = (it: Integration) => {
    act.toggleIntegration(it.id);
    toast(it.status === "connected" ? `${it.name} 연결을 끊었어요. 원본은 ${it.name}에 그대로 있어요` : `${it.name}에 연결했어요`);
  };
  const sendAsk = () => {
    setAsk(false);
    toast(`${askName.trim() || "새 도구"} 연결을 요청했어요. 데이터 등급을 먼저 정한 뒤 연결해요`);
    setAskName("");
  };

  return (
    <>
      <PageHead
        title="도구 연결"
        desc="이미 쓰는 도구에 연결해요. 메일 앱·문서 에디터·녹음 전사는 새로 만들지 않아요."
        actions={<><Button variant="dark" icon={<Plus />} onClick={() => setAsk(true)}>도구 요청하기</Button><MoreButton /></>}
      />

      <div className="grid g-12">
        <Card className="s-12" title="만들지 않고, 연결해요" sub="원본은 원래 도구에 그대로 두고 업무사이트는 분류·연결만 해요"
          actions={<div className="ig-sum">
            <span><b className="num">{count("connected")}</b>연결됨</span>
            <span><b className="num">{count("available")}</b>연결 가능</span>
            <span><b className="num">{count("planned")}</b>예정</span>
          </div>}>
          <div className="ig-nb">
            {NOT_BUILD.map((n) => {
              const its = all.filter((i) => i.category === n.cat);
              return (
                <button key={n.cat} type="button" className="ig-nb__item" onClick={() => setTab(n.cat)} aria-label={`${n.cat} 도구 보기`}>
                  <span className={`ig-nb__ic tone-${CAT[n.cat].hue}`}>{CAT[n.cat].icon}</span>
                  <span className="ig-nb__main">
                    <span className="ig-nb__no"><X />{n.title}<em>안 만들어요</em></span>
                    <span className="ig-nb__s">{n.sub}</span>
                  </span>
                  <ArrowRight className="ig-nb__arrow" />
                  <span className="ig-nb__logos">
                    {its.map((i) => (
                      <span key={i.id} className={cx("ig-nb__logo", i.status === "connected" && "is-on")} title={`${i.name} · ${STATUS[i.status].label}`}>
                        <Logo it={i} size={24} />{i.name}{i.status === "connected" && <CheckCircle2 className="ig-nb__ok" aria-label="연결됨" />}
                      </span>
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="ig-tools">
        <Tabs label="분류" value={tab} onChange={setTab} options={[
          { value: "all" as const, label: "전체", icon: <LayoutGrid />, n: all.length },
          ...cats.map((c) => ({ value: c.value, label: c.value, icon: c.icon, n: all.filter((i) => i.category === c.value).length })),
        ]} />
        <div className="toolbar ig-bar">
          <label className="search ig-search">
            <Search />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="도구 이름이나 하는 일로 찾기" aria-label="도구 찾기" />
            {q && <IconButton label="지우기" size="sm" plain onClick={() => setQ("")}><X /></IconButton>}
          </label>
          <PillSelect label="상태" value={st} onChange={setSt} options={[
            { value: "any", label: "모든 상태" }, { value: "connected", label: "연결됨" }, { value: "available", label: "연결 가능" }, { value: "planned", label: "예정" },
          ]} />
        </div>
      </div>

      {list.length ? (
        <div className="ig-grid">
          {list.map((it) => {
            const on = it.status === "connected";
            const planned = it.status === "planned";
            const s = STATUS[it.status];
            return (
              <article key={it.id} className={cx("ig-card", on && "ig-card--on", planned && "ig-card--planned")}>
                <div className="ig-card__head">
                  <Logo it={it} />
                  <div className="ig-card__name">
                    <h3 className="ig-card__t ellipsis">{it.name}</h3>
                    <div className="ig-card__meta">
                      <span className="ig-card__cat">{CAT[it.category]?.icon}{it.category}</span>
                      <Chip tone={s.tone} dot={!planned} icon={planned ? <Clock3 /> : undefined} sm>{s.label}{it.note ? ` · ${it.note}` : ""}</Chip>
                    </div>
                  </div>
                  <div className="ig-card__act">
                    {planned
                      ? <button type="button" role="switch" aria-checked={false} aria-disabled="true" disabled aria-label={`${it.name} 연결(예정이라 아직 못 켜요)`} className="toggle ig-toggle--off" />
                      : <Toggle on={on} onChange={() => toggle(it)} label={`${it.name} 연결`} />}
                    <IconButton label={`${it.name} 자세히`} size="sm" round onClick={() => setInfoId(it.id)}><Info /></IconButton>
                  </div>
                </div>
                <p className="ig-card__d">{it.desc}</p>
                <div className="ig-card__foot">
                  <span className="ig-card__scope">{on ? <>범위 <b>{it.scope ?? "기본"}</b></> : planned ? "아직 연결할 수 없어요" : "켜면 범위를 골라요"}</span>
                  <span className="ig-card__grade"><GradeTag code={gradeOf(it)} sm />{gradeOf(it) === "L2" ? "국내 경로" : "기본 등급"}</span>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <Card><Empty icon={<Search />} title="맞는 도구가 없어요">찾는 도구가 없으면 ‘도구 요청하기’로 알려 주세요</Empty></Card>
      )}

      <p className="faint xs ig-rule"><Info size={14} />새 도구는 데이터 등급표에 먼저 올리고 허용 등급을 정한 뒤 연결해요. 메일은 본인 계정으로만, 읽기 권한부터 시작해요.</p>

      <Drawer open={!!info} title={info ? info.name : "도구"} onClose={() => setInfoId(null)}
        foot={info && (info.status === "planned"
          ? <Button onClick={() => setInfoId(null)}>닫기</Button>
          : <><Button onClick={() => setInfoId(null)}>닫기</Button><Button variant={info.status === "connected" ? "default" : "brand"} onClick={() => { toggle(info); setInfoId(null); }}>{info.status === "connected" ? "연결 끊기" : "연결하기"}</Button></>)}>
        {info && (
          <>
            <div className="row" style={{ gap: 14 }}>
              <Logo it={info} size={52} />
              <div style={{ minWidth: 0 }}>
                <div className="ig-dr__t">{info.name}</div>
                <div className="row" style={{ gap: 8, marginTop: 4 }}><span className="muted small">{info.category}</span><Chip tone={STATUS[info.status].tone} dot sm>{STATUS[info.status].label}{info.note ? ` · ${info.note}` : ""}</Chip></div>
              </div>
            </div>
            <p className="ig-dr__desc">{info.desc}</p>
            <dl className="ig-dr">
              <div><dt>하는 일</dt><dd>{CAT[info.category]?.does}</dd></div>
              <div><dt>만들지 않는 것</dt><dd>{CAT[info.category]?.not}</dd></div>
              <div><dt>범위</dt><dd>{info.scope ?? (info.status === "planned" ? "연결이 열리면 정해요" : "연결할 때 골라요")}</dd></div>
              <div><dt>데이터 등급</dt><dd className="row" style={{ gap: 8 }}><GradeTag code={gradeOf(info)} sm />{gradeOf(info) === "L2" ? "고객 비밀·금액이 섞여요. 국내 경로로만 처리해요" : "일반 업무 기준. 고객 비밀이 섞이면 L2로 올려요"}</dd></div>
              <div><dt>원본</dt><dd>{info.name}에 그대로 있어요. 연결을 끊어도 지워지지 않아요.</dd></div>
            </dl>
          </>
        )}
      </Drawer>

      <Drawer open={ask} title="도구 요청하기" onClose={() => setAsk(false)}
        foot={<><Button onClick={() => setAsk(false)}>취소</Button><Button variant="brand" onClick={sendAsk}>요청 보내기</Button></>}>
        <p className="muted small">이미 쓰는 도구를 알려 주세요. CRATA가 데이터 등급을 정하고 연결을 열어요.</p>
        <label className="field"><span className="field__label">도구 이름</span><input className="input" value={askName} onChange={(e) => setAskName(e.target.value)} placeholder="예: 하이웍스 메일, 더존 ERP" /></label>
        <label className="field"><span className="field__label">분류</span>
          <select className="select" value={askCat} onChange={(e) => setAskCat(e.target.value as Cat)}>
            {CATS.map((c) => <option key={c.value} value={c.value}>{c.value}</option>)}
          </select>
        </label>
        <div className="ig-askgrade"><GradeTag code={CAT[askCat].grade} sm /><span>{CAT[askCat].value} 기본 등급이에요. {CAT[askCat].not}</span></div>
        <label className="field"><span className="field__label">어디에 쓰나요</span><textarea className="textarea" placeholder="예: 고객 발주 메일을 프로젝트에 붙이고 싶어요" /></label>
      </Drawer>
    </>
  );
}
