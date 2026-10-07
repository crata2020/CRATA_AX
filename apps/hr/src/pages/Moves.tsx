// 인사이동: 왼쪽은 ARA와 대화(“누구를 어디로”), 오른쪽은 실시간 조직도.
// 레퍼런스: refs/orbix-ai-chat-home.jpg(입력 상자 + 제안 칩), refs/botrix-ai-command-center.jpg(대화 + 결과 카드),
// refs/orbixcrm-team-members-grid.jpg(사람 칩), post_1.jpg(옅은 회색 레인 위 흰 카드). 확정 전 이동은 조직도에서 깜빡여요.
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { CalendarClock, Check, GitBranchPlus, GraduationCap, MessageSquareText, MoveRight, Network, SendHorizontal, ShieldCheck, Sparkles, Undo2, Users } from "lucide-react";
import { useApp } from "@/data/store";
import { VERDICT } from "@/lib/fit";
import { Avatar, Button, Chip, IconButton, PageHead, Segmented, cx } from "@/ui";
import { AdviceView, AraCardView, AraMark, OrgChart } from "./Moves.parts";
import "./Moves.css";

export default function Moves() {
  const { chat, send, pending, log, confirm, undo, person, team } = useApp();
  const [text, setText] = useState("");
  const [pane, setPane] = useState<"chat" | "org">("chat");
  const [view, setView] = useState<"fit" | "plain">("fit");
  const [open, setOpen] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight; }, [chat.length]);

  // 구성원 화면의 '인사이동에서 보기'(?person=id): 그 사람을 ARA에게 먼저 물어봐요
  const [params, setParams] = useSearchParams();
  const asked = useRef<string | null>(null);
  useEffect(() => {
    const id = params.get("person");
    const p = id ? person(id) : undefined;
    if (!p || asked.current === id) return;
    asked.current = id;
    send(p.name);
    setText(`${p.name} `);
    const n = new URLSearchParams(params); n.delete("person"); setParams(n, { replace: true });
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [params, person, send, setParams]);

  const submit = (t = text) => { if (!t.trim()) return; send(t); setText(""); inputRef.current?.focus(); };
  const severe = pending.reduce((s, m) => s + m.advice.cons.filter((c) => c.severe).length, 0);

  return (
    <>
      <PageHead
        title="인사이동"
        desc="누구를 어디로 보낼지 적으면 조직도에 바로 그려 보고, ARA가 잘 맞는지와 걱정되는 점을 알려 줘요. 확정 전까지는 깜빡여요."
        actions={
          <>
            <Button icon={<Undo2 />} disabled={!pending.length} onClick={() => undo(pending.map((m) => m.personId))}>모두 되돌리기</Button>
            <Button variant="dark" icon={<Check />} count={pending.length || undefined} disabled={!pending.length} onClick={() => confirm()}>모두 확정</Button>
          </>
        }
      />

      <div className="mv-switch">
        <Segmented label="보기" value={pane} onChange={setPane} options={[{ value: "chat", label: <><MessageSquareText />대화</> }, { value: "org", label: <><Network />조직도</>, n: pending.length || undefined }]} />
      </div>

      <div className={cx("mv", `mv--${pane}`)}>
        {/* ───────── 대화 */}
        <section className="mv-chat card" aria-label="ARA와 대화">
          <header className="mv-chat__head">
            <AraMark size={36} />
            <div>
              <h2>ARA</h2>
              <p>배치 참고에 동의한 사람의 CRATA 결과와 조직 정보로 답해요</p>
            </div>
          </header>
          <div className="mv-chat__list" ref={listRef} aria-live="polite">
            {chat.map((m) => (
              <div key={m.id} className={cx("mv-msg", m.who === "me" ? "mv-msg--me" : "mv-msg--ara")}>
                {m.who === "ara" && <AraMark size={26} />}
                <div className="mv-msg__body">
                  <p className="mv-msg__text">{m.text}</p>
                  {m.card && <AraCardView card={m.card} />}
                  {m.chips && m.chips.length > 0 && (
                    <div className="mv-chips">{m.chips.map((c) => <button key={c} type="button" className="mv-chipbtn" onClick={() => submit(c)}>{c}</button>)}</div>
                  )}
                </div>
              </div>
            ))}
            {chat.length === 1 && (
              <div className="mv-guide" aria-label="ARA가 보는 것">
                <h3>옮길 때 ARA가 보는 것</h3>
                <ul>
                  <li><Sparkles aria-hidden /><div><b>CRATA 적합도</b><span>4종 검사 결과와 팀 환경이 맞는지. 배치 참고에 동의한 사람만</span></div></li>
                  <li><Users aria-hidden /><div><b>남는 팀의 빈자리</b><span>최소 인원, 그 팀에 꼭 필요한 기술을 가진 사람 수, 팀장 공석</span></div></li>
                  <li><GraduationCap aria-hidden /><div><b>교육·자격</b><span>가는 팀에 필요한 교육·자격이 있는지</span></div></li>
                  <li><CalendarClock aria-hidden /><div><b>적응</b><span>입사·최근 이동 시기, 교대 근무 가능 여부</span></div></li>
                </ul>
              </div>
            )}
          </div>
          <form className="mv-input" onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <label htmlFor="mv-text" className="sr-only">누구를 어디로 보낼지 적기</label>
            <textarea id="mv-text" ref={inputRef} rows={2} value={text} placeholder="예: 이하은 품질보증팀으로 · 개발팀에 누가 좋아?"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }} />
            <IconButton label="보내기" className="mv-send" type="submit" disabled={!text.trim()}><SendHorizontal /></IconButton>
          </form>
          <p className="mv-chat__foot"><ShieldCheck aria-hidden />ARA 마음 기록·대화는 인사에 쓰지 않아요. 추천은 참고이고 결정은 사람이 해요.</p>
        </section>

        {/* ───────── 확정 전 이동 + 조직도 */}
        <div className="mv-right">
          <section className="card mv-pend" aria-label="확정 전 이동">
            <header className="mv-pend__head">
              <h2><GitBranchPlus aria-hidden />확정 전 이동 <span className="num">{pending.length}</span></h2>
              {severe > 0 && <Chip tone="bad" dot sm>큰 우려 {severe}</Chip>}
              {log.length > 0 && <span className="faint xs">오늘 확정 <span className="num">{log.length}</span>건</span>}
            </header>
            {pending.length === 0 ? (
              <p className="mv-pend__empty">아직 없어요. 왼쪽에 <button type="button" onClick={() => submit("이하은 품질보증팀으로")}>“이하은 품질보증팀으로”</button>처럼 적거나, 조직도에서 사람을 다른 팀으로 끌어다 놓아 보세요.</p>
            ) : (
              <ul className="mv-pend__list">
                {pending.map((m) => {
                  const p = person(m.personId)!;
                  const v = VERDICT[m.advice.verdict];
                  const isOpen = open === m.id;
                  return (
                    <li key={m.id} className={cx(isOpen && "is-open")}>
                      <div className="mv-pend__row">
                        <span className="mv-pulse" aria-hidden />
                        <Avatar name={p.name} size="sm" />
                        <button type="button" className="mv-pend__who" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : m.id)}>
                          <b>{p.name}</b><span>{team(m.fromTeamId)?.name}<MoveRight aria-hidden />{team(m.toTeamId)?.name}{m.lead ? " 팀장" : ""}</span>
                        </button>
                        <Chip tone={v.tone} dot sm>{v.label}{m.advice.score != null ? ` ${m.advice.score}` : ""}</Chip>
                        <span className="mv-pend__acts">
                          <Button size="sm" variant="soft" onClick={() => confirm([m.personId])}>확정</Button>
                          <IconButton label={`${p.name} 이동 취소`} size="sm" plain onClick={() => undo([m.personId])}><Undo2 /></IconButton>
                        </span>
                      </div>
                      {isOpen && <div className="mv-pend__detail"><AdviceView m={m} live /></div>}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="card mv-org" aria-label="조직도">
            <header className="mv-org__head">
              <h2>조직도</h2>
              <span className="faint small">실시간 · 확정 전 이동 포함</span>
              <span className="mv-org__tools">
                <Segmented size="sm" label="칩에 표시" value={view} onChange={setView} options={[{ value: "fit", label: "적합도" }, { value: "plain", label: "이름만" }]} />
              </span>
            </header>
            <div className="mv-legend" aria-label="범례">
              <span><i className="lg-in" />확정 전(깜빡임)</span>
              <span><i className="lg-out" />나가는 사람</span>
              <span><i className="lg-short" />최소 인원 미달</span>
              <span className="faint">사람을 눌러 보내거나, 다른 팀으로 끌어다 놓아요</span>
            </div>
            <OrgChart view={view} />
            <p className="mv-org__note faint xs">적합도는 배치 참고에 동의한 사람만 보여요(–는 본인만·미응시). 팀 환경 항목 이름은 예시예요.</p>
          </section>
        </div>
      </div>
    </>
  );
}
