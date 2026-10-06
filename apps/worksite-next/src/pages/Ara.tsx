// ARA(나만 보여요): refs/orbix-ai-chat-home.jpg(가운데 큰 질문 + 입력 상자[+ · 모델 칩 · 음성 · 검정 보내기] + 카드 3장, 은은한 파스텔 배경)에서 가져왔어요.
// 아래 카드 줄은 홈과 같은 Orbix 카드 문법(제목 + 알약 + 스파크라인).
// 리서치 10: 개인 영역은 회사가 볼 수 없음 · 집계는 10명 이상일 때만 · 인사평가 사용 금지 · 의료 표현 쓰지 않음 · 위기 시 109 안내 · 문장마다 공유 선택.
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight, ArrowUp, AudioLines, CalendarCheck, Check, CircleHelp, Eye, EyeOff, HeartHandshake, HeartPulse, IdCard, Lightbulb, LifeBuoy, Lock, Phone,
  Plus, ShieldCheck, Sparkles, Users,
} from "lucide-react";
import { useApp } from "@/data/store";
import { dday, longDate } from "@/data/format";
import { Button, Card, Chip, Delta, Drawer, IconButton, PageHead, PillSelect, Segmented, Toggle } from "@/ui";
import { useWidth, Sparkline } from "@/ui/charts";
import "./Ara.css";

type Msg = { id: number; from: "me" | "ara"; text: string; kind?: "crisis" | "plan"; lines?: string[] };
type Checkin = { date: string; energy: number; focus: number };
// 위기 신호(아주 단순한 예시 규칙). 실제 서비스는 임상 자문을 받은 프로토콜을 따라요.
const CRISIS = ["죽고 싶", "죽고싶", "자해", "극단적", "사라지고 싶", "살기 싫", "끝내고 싶"];
const SCALE = ["1", "2", "3", "4", "5"] as const;

function SparkRow({ label, values, color, dates }: { label: string; values: number[]; color: string; dates: string[] }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const now = values[values.length - 1] ?? 0, prev = values[values.length - 2] ?? now;
  const diff = now - prev;
  return (
    <div className="ara-spark">
      <div className="ara-spark__top">
        <span className="ara-spark__l"><i style={{ background: color }} />{label}</span>
        <span className="row" style={{ gap: 8 }}>
          <b className="num">{now}<span className="faint">/5</span></b>
          <Delta value={diff === 0 ? "그대로" : `${Math.abs(diff)}`} dir={diff > 0 ? "up" : diff < 0 ? "down" : "flat"} good={diff > 0} />
        </span>
      </div>
      <div ref={ref} className="ara-spark__chart">{w > 0 && <Sparkline values={values} color={color} width={w} height={48} />}</div>
      <div className="ara-spark__dates">{dates.map((d, i) => <span key={d + i} className="num">{d}</span>)}</div>
    </div>
  );
}

export default function Ara() {
  const { d, me, act, toast } = useApp();
  const [text, setText] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [privacy, setPrivacy] = useState(false);
  const [checkOpen, setCheckOpen] = useState(false);
  const [extra, setExtra] = useState<Record<string, Checkin[]>>({});
  const [ci, setCi] = useState<{ energy: string; focus: string; note: string }>({ energy: "3", focus: "3", note: "" });
  const [range, setRange] = useState<"5" | "all">("5");
  const [sugg, setSugg] = useState<Record<string, "ok" | "later">>({});
  const taRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (msgs.length) endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [msgs.length]);

  const checkins = [...d.ara.checkins, ...(extra[d.id] ?? [])];
  const shown = range === "5" ? checkins.slice(-5) : checkins;
  const lines = d.ara.card.lines;
  const shared = lines.filter((l) => l.shared);

  const today = d.calendar.filter((c) => c.date === d.today);
  const soon = d.calendar.filter((c) => c.date > d.today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 2);
  const myDue = d.tasks.filter((t) => t.assignee === me.id && t.status !== "done" && t.due <= d.today);
  const myReview = d.tasks.filter((t) => t.reviewer === me.id && t.status === "review").length;

  const reply = (q: string): Msg => {
    const id = Date.now() + 1;
    if (CRISIS.some((k) => q.replace(/\s/g, "").includes(k.replace(/\s/g, "")))) {
      return { id, from: "ara", kind: "crisis", text: "많이 힘든 마음을 말해 줘서 고마워요. 혼자 견디지 않아도 돼요. 지금 바로 사람과 이야기할 수 있어요." };
    }
    if (/일정|정리|오늘/.test(q)) {
      const out = [
        ...today.map((c) => `${c.time ?? "오늘"} ${c.title}`),
        ...myDue.map((t) => `오늘 마감 · ${t.title}`),
        ...(myReview ? [`검토할 제출 ${myReview}건`] : []),
        ...soon.map((c) => `${dday(c.date, d.today)} ${c.title}`),
      ];
      return { id, from: "ara", kind: "plan", text: out.length ? "오늘 흐름을 정리했어요." : "오늘은 잡힌 일정이 없어요. 큰 일을 하나 잡아 보세요.", lines: out.slice(0, 5) };
    }
    return { id, from: "ara", text: "예시 화면이라 아직 실제로 답하지는 않아요. 연결되면 일하는 방식 카드와 오늘 일정을 바탕으로 같이 정리해 드려요." };
  };
  const send = (q = text) => {
    const v = q.trim();
    if (!v) { taRef.current?.focus(); return; }
    setMsgs((m) => [...m.slice(-4), { id: Date.now(), from: "me", text: v }, reply(v)]);
    setText("");
  };

  const saveCheckin = () => {
    const [, mm, dd] = d.today.split("-");
    setExtra((x) => ({ ...x, [d.id]: [...(x[d.id] ?? []), { date: `${Number(mm)}/${Number(dd)}`, energy: Number(ci.energy), focus: Number(ci.focus) }] }));
    setCheckOpen(false);
    setCi({ energy: "3", focus: "3", note: "" });
    toast("체크인했어요. 나만 볼 수 있어요");
  };

  const cards = [
    { key: "card", icon: <IdCard />, hue: "violet", title: "일하는 방식 카드", desc: "문장마다 공유를 골라요", cta: "카드 보기", on: () => document.getElementById("ara-card")?.scrollIntoView({ behavior: "smooth", block: "center" }) },
    { key: "check", icon: <HeartPulse />, hue: "coral", title: "마음 체크인", desc: "에너지·집중을 30초에 남겨요", cta: "체크인하기", on: () => setCheckOpen(true) },
    { key: "plan", icon: <CalendarCheck />, hue: "amber", title: "오늘 일정 정리", desc: "회의·마감·검토를 한 번에 봐요", cta: "정리해 줘", on: () => send("오늘 일정 정리해 줘") },
  ] as const;

  return (
    <>
      <PageHead
        title="ARA"
        desc="나만 보는 개인 공간이에요. 일하는 방식, 마음 체크인, 하루 정리를 도와요."
        actions={<><Button icon={<EyeOff />} onClick={() => setPrivacy(true)}>회사가 보는 것</Button><Button icon={<HeartPulse />} onClick={() => setCheckOpen(true)}>체크인</Button></>}
      />

      <div className="ara-lock" role="note">
        <span className="ara-lock__ic"><Lock /></span>
        <p><b>나만 보여요.</b> 대화·체크인·카드는 회사와 관리자가 볼 수 없어요. 회사에는 10명 이상 모였을 때 집계만 가고, 인사평가에는 쓰지 않아요.</p>
        <button type="button" className="ara-lock__more" onClick={() => setPrivacy(true)}>자세히<ArrowRight /></button>
      </div>

      <section className="ara-hero" aria-labelledby="ara-q">
        <div className="ara-hero__in">
          <div className="ara-hero__date">{longDate(d.today)}</div>
          <h2 id="ara-q" className="ara-hero__q">오늘 무엇을 도와드릴까요?</h2>
          <p className="ara-hero__sub">{me.name}님의 이야기는 이 화면 밖으로 나가지 않아요</p>

          {msgs.length > 0 && (
            <div className="ara-chat" aria-live="polite">
              {msgs.map((m) => (
                <div key={m.id} className={`ara-msg ara-msg--${m.from}${m.kind ? ` ara-msg--${m.kind}` : ""}`}>
                  {m.from === "ara" && <span className="ara-orb ara-orb--sm" aria-hidden />}
                  <div className="ara-msg__b">
                    <p>{m.text}</p>
                    {m.lines && m.lines.length > 0 && <ul className="ara-msg__list">{m.lines.map((l) => <li key={l}><Check />{l}</li>)}</ul>}
                    {m.kind === "crisis" && (
                      <div className="ara-msg__help">
                        <a className="btn btn--sm btn--brand" href="tel:109"><Phone />109 전화하기</a>
                        <span className="xs muted">자살예방 상담전화 · 24시간 · 위급하면 119</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
          )}

          <form className="ara-prompt" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <div className="ara-prompt__top">
              <span className="ara-orb" aria-hidden />
              <textarea
                ref={taRef} rows={2} value={text} onChange={(e) => setText(e.target.value)} aria-label="ARA에게 물어보기"
                placeholder="무엇이든 물어보세요… 예: 이번 주 일을 정리해 줘"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
              />
            </div>
            <div className="ara-prompt__bar">
              <IconButton label="파일 붙이기" onClick={() => toast("붙인 파일도 나만 볼 수 있어요(예시)")}><Plus /></IconButton>
              <span className="ara-model"><Sparkles />ARA<span className="ara-model__s">개인</span></span>
              <span style={{ flex: 1 }} />
              <IconButton label="말로 하기" onClick={() => toast("음성 입력은 연결 뒤에 써요(예시)")}><AudioLines /></IconButton>
              <Button type="submit" variant="dark" className="ara-send" aria-label="보내기" icon={<ArrowUp />} />
            </div>
          </form>
          <p className="ara-ai-note">ARA는 생성형 AI예요. 답이 틀릴 수 있고, 의료 판단을 대신하지 않아요.</p>

          <div className="ara-cards">
            {cards.map((c) => (
              <button key={c.key} type="button" className="ara-card" onClick={c.on}>
                <span className="ara-card__top">
                  <span className={`ara-card__ic tone-${c.hue}`}>{c.icon}</span>
                  <span style={{ minWidth: 0 }}><span className="ara-card__t">{c.title}</span><span className="ara-card__d">{c.desc}</span></span>
                </span>
                <span className="ara-card__foot">{c.cta}<ArrowRight /></span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="grid g-12 ara-below">
        <Card className="s-4" title="최근 체크인" actions={<PillSelect label="기간" value={range} onChange={setRange} options={[{ value: "5", label: "최근 5번" }, { value: "all", label: "전체" }]} />}>
          <div className="col" style={{ gap: 18 }}>
            <SparkRow label="에너지" values={shown.map((c) => c.energy)} dates={shown.map((c) => c.date)} color="var(--c-orange)" />
            <SparkRow label="집중" values={shown.map((c) => c.focus)} dates={shown.map((c) => c.date)} color="var(--c-violet)" />
          </div>
          <Button block icon={<HeartPulse />} style={{ marginTop: 16 }} onClick={() => setCheckOpen(true)}>오늘 체크인하기</Button>
          <p className="xs faint" style={{ marginTop: 10 }}>점수는 나만 봐요. 감정을 추정하거나 점수를 매기지 않아요.</p>
        </Card>

        <Card className="s-8" title={d.ara.card.title} icon={<IdCard />} sub="문장마다 팀에 공유할지 골라요. 처음엔 모두 나만 봐요" actions={<Chip tone="outline" sm icon={<Users />}>팀에 {shared.length}/{lines.length}문장</Chip>}>
          <div id="ara-card" />
          <ul className="ara-lines">
            {lines.map((l, i) => (
              <li key={l.text} className={l.shared ? "is-shared" : ""}>
                <span className="ara-lines__n num">{i + 1}</span>
                <p className="ara-lines__t">{l.text}</p>
                <span className={`ara-lines__s${l.shared ? " on" : ""}`}>{l.shared ? <><Eye />팀에 보여요</> : <><Lock />나만 봐요</>}</span>
                <Toggle on={l.shared} onChange={() => act.toggleShare(i)} label={`팀에 공유: ${l.text}`} />
              </li>
            ))}
          </ul>
          <div className="ara-preview">
            <div className="ara-preview__h"><Users />동료가 보는 카드 미리보기</div>
            {shared.length ? (
              <ul>{shared.map((l) => <li key={l.text}>{l.text}</li>)}</ul>
            ) : <p className="muted small">아직 공유한 문장이 없어요. 동료에게는 카드가 보이지 않아요.</p>}
          </div>
          <p className="xs faint" style={{ marginTop: 10 }}>공유하지 않은 문장은 관리자도 볼 수 없어요. 공유는 언제든 끌 수 있어요.</p>
        </Card>

        <Card className="s-6" title="오늘 제안" sub="내 일정과 카드를 보고 ARA가 골랐어요" actions={<Chip tone="brand" sm icon={<Sparkles />}>AI 제안</Chip>}>
          <ul className="ara-sugg">
            {d.ara.suggestions.slice(0, 2).map((s, i) => {
              const st = sugg[`${d.id}:${i}`];
              return (
                <li key={s}>
                  <span className={`ara-sugg__ic tone-${i ? "green" : "amber"}`}>{i ? <CalendarCheck /> : <Lightbulb />}</span>
                  <div className="list__main">
                    <div className="ara-sugg__t">{s}</div>
                    {st ? (
                      <div className="row" style={{ gap: 8, marginTop: 8 }}>
                        <Chip tone={st === "ok" ? "good" : "neutral"} sm dot>{st === "ok" ? "해 볼게요" : "다음에 볼게요"}</Chip>
                        <button type="button" className="ara-undo" onClick={() => setSugg((x) => { const n = { ...x }; delete n[`${d.id}:${i}`]; return n; })}>되돌리기</button>
                      </div>
                    ) : (
                      <div className="row" style={{ gap: 6, marginTop: 8 }}>
                        <Button size="sm" variant="soft" icon={<Check />} onClick={() => setSugg((x) => ({ ...x, [`${d.id}:${i}`]: "ok" }))}>해 볼게요</Button>
                        <Button size="sm" variant="ghost" onClick={() => setSugg((x) => ({ ...x, [`${d.id}:${i}`]: "later" }))}>다음에</Button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {today.length > 0 && (
            <div className="ara-today">
              <span className="xs faint">오늘 일정</span>
              {today.map((c) => <span key={c.id} className="ara-today__i"><span className="num">{c.time ?? ""}</span>{c.title}</span>)}
            </div>
          )}
        </Card>

        <Card className="s-6" title="도움 연결" sub="혼자 정리하기 어려우면 사람과 이야기해요" actions={<Chip tone="outline" sm icon={<Lock />}>회사에 알리지 않아요</Chip>}>
          <ul className="ara-help">
            <li>
              <span className="ara-help__ic tone-violet"><HeartHandshake /></span>
              <div className="list__main"><div className="list__t">전문 상담 연결</div><div className="list__s">고민을 상담사와 나눠요. 요청 사실도 회사에 가지 않아요</div></div>
              <Button size="sm" onClick={() => toast("상담 연결을 요청했어요. 회사에는 알리지 않아요")}>연결 요청</Button>
            </li>
            <li>
              <span className="ara-help__ic tone-blue"><LifeBuoy /></span>
              <div className="list__main"><div className="list__t">공공 상담(근로복지공단 EAP)</div><div className="list__s">300인 미만 회사 직원은 연 7회 무료로 상담받을 수 있어요</div></div>
              <Button size="sm" variant="ghost" icon={<CircleHelp />} onClick={() => toast("신청 방법을 안내해 드릴게요(예시)")}>안내</Button>
            </li>
            <li className="ara-help__crisis">
              <span className="ara-help__ic tone-coral"><Phone /></span>
              <div className="list__main"><div className="list__t">자살예방 상담전화 109</div><div className="list__s">24시간 언제든. 위급하면 119에 바로 전화하세요</div></div>
              <a className="btn btn--sm btn--brand" href="tel:109"><Phone />109</a>
            </li>
          </ul>
        </Card>
      </div>

      {/* 회사가 보는 것 / 못 보는 것 */}
      <Drawer open={privacy} title="회사가 보는 것" onClose={() => setPrivacy(false)} foot={<Button onClick={() => setPrivacy(false)}>확인했어요</Button>}>
        <section className="ara-pv">
          <h3><Eye />회사가 볼 수 있는 것</h3>
          <ul>
            <li>10명 이상 모였을 때만, 월 단위 집계: 쓰는 사람 수, 체크인 참여율, 카드 공유율, 주제 대분류</li>
            <li>내가 ‘팀에 공유’로 고른 카드 문장(동료와 같은 범위)</li>
          </ul>
        </section>
        <section className="ara-pv ara-pv--no">
          <h3><EyeOff />회사가 볼 수 없는 것</h3>
          <ul>
            <li>ARA와 나눈 대화와 요약</li>
            <li>체크인 점수와 메모</li>
            <li>공유하지 않은 카드 문장</li>
            <li>내가 ARA를 쓰는지 안 쓰는지</li>
            <li>감정·위험 추정(만들지 않아요)</li>
          </ul>
        </section>
        <section className="ara-pv ara-pv--promise">
          <h3><ShieldCheck />약속</h3>
          <ul>
            <li>인사평가·채용·배치에 쓰지 않아요</li>
            <li>회사 업무 데이터, 회의 분류, 지식 검색과 섞지 않아요</li>
            <li>AI 모델 학습에 쓰지 않아요</li>
            <li>위기 신호가 보이면 109·119를 먼저 안내해요. 본인 동의 없이 회사에 알리지 않아요</li>
          </ul>
        </section>
      </Drawer>

      {/* 마음 체크인 */}
      <Drawer open={checkOpen} title="마음 체크인" onClose={() => setCheckOpen(false)} foot={<><Button onClick={() => setCheckOpen(false)}>취소</Button><Button variant="brand" icon={<Check />} onClick={saveCheckin}>남기기</Button></>}>
        <p className="muted small">지금 상태를 1~5로 골라요. 나만 볼 수 있어요.</p>
        <div className="field">
          <span className="field__label">에너지 <span className="faint">(1 낮음 · 5 높음)</span></span>
          <Segmented label="에너지" value={ci.energy} onChange={(v) => setCi({ ...ci, energy: v })} options={SCALE.map((s) => ({ value: s, label: s }))} />
        </div>
        <div className="field">
          <span className="field__label">집중 <span className="faint">(1 낮음 · 5 높음)</span></span>
          <Segmented label="집중" value={ci.focus} onChange={(v) => setCi({ ...ci, focus: v })} options={SCALE.map((s) => ({ value: s, label: s }))} />
        </div>
        <label className="field"><span className="field__label">한 줄 메모(선택)</span><input className="input" value={ci.note} onChange={(e) => setCi({ ...ci, note: e.target.value })} placeholder="오늘 마음에 남는 것" /></label>
        {(ci.energy === "1" || ci.focus === "1") && (
          <p className="ara-soft"><HeartHandshake />많이 지친 날이네요. 오늘 일정 정리나 전문 상담 연결을 같이 볼까요?</p>
        )}
        <p className="xs faint">지난 기록 {checkins.length}번 · 마지막 {checkins[checkins.length - 1]?.date ?? "-"}</p>
      </Drawer>
    </>
  );
}
