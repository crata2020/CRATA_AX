// 지원자 CRATA 검사(Shell 밖, 흐름 예시): refs/orbix-ai-chat-home.jpg — 은은한 복숭아·분홍 파스텔 배경 + 가운데 큰 질문 + 아래 카드 3장(아이콘·제목 / 'View Agents →' 바닥 줄)
// → 가운데 인사 + 검사 4종 카드(아이콘·이름 / '문항 예시 · 약 n분' 바닥 줄), 입력 상자의 짙은 보내기 버튼 → '예시 문항 풀어 보기' 하나만 짙게.
// 문항 화면은 refs/winx-add-product-form.jpg의 둥근 알약 선택 + 진행 막대. 검사 구조는 crata.co.kr/tests 공개 설명(색채·행동동기·문제해결방식·관계성장방식)을 따르고,
// 문항·항목 이름은 예시예요. 실제 검사는 CRATA 검사 화면에서 진행돼요. 결과는 회사에 '이 채용 판단용'으로만 가고 지원자도 자기 결과를 받아요.
import { useState } from "react";
import { useParams } from "react-router";
import {
  ArrowLeft, ArrowRight, Building2, Check, CircleCheck, Clock, FileText, Flame, MessageCircleQuestion, Palette, Puzzle, RotateCcw, Sparkles, Sprout, UserRoundSearch, type LucideIcon,
} from "lucide-react";
import { useApp } from "@/data/store";
import { COMPANY } from "@/data/seed";
import { COLOR, MOTIVE, type Applicant, type ColorKey, type Motive } from "@/lib/model";
import { Bar, Button, Chip, Empty, PageHead, cx, type Hue, type Tone } from "@/ui";
import { ApplicantFrame, longDate } from "./Apply.parts";
import "./Test.css";

type Kind = "color" | "motive" | "problem" | "relation";
const TESTS: { key: Kind; title: string; short: string; Icon: LucideIcon; hue: Hue; what: string; parts: string; mins: number }[] = [
  { key: "color", title: "색채검사", short: "색채", Icon: Palette, hue: "coral", what: "겉으로 드러나는 태도와 속마음, 지금 나에게 필요한 환경을 봐요", parts: "외면 · 내면 · 컴포트 존 · 챌린지 존", mins: 5 },
  { key: "motive", title: "행동동기검사", short: "행동동기", Icon: Flame, hue: "amber", what: "무엇이 있어야 움직이기 시작하고, 무엇이 있어야 오래 가는지 봐요", parts: "시작 · 지속 (타고난 것 · 지금)", mins: 7 },
  { key: "problem", title: "문제해결방식검사", short: "문제해결", Icon: Puzzle, hue: "blue", what: "일이 막힐 때 중심을 잡아 주는 환경과 문제를 푸는 방식을 봐요", parts: "중심 · 핵심 · 성장 · 잠재 역량", mins: 8 },
  { key: "relation", title: "관계성장방식검사", short: "관계성장", Icon: Sprout, hue: "green", what: "생각을 정리하는 방식과 자신감이 자라는 방식을 봐요", parts: "생각 정리(혼자·함께) · 자신감(비슷한·다른 수준)", mins: 5 },
];
const TOTAL_MIN = TESTS.reduce((s, t) => s + t.mins, 0);

interface Item { test: Kind; q: string; options: { v: string; label: string; hex?: string }[] }
const motives = (ks: Motive[]) => ks.map((k) => ({ v: k, label: MOTIVE[k] }));
const ITEMS: Item[] = [
  { test: "color", q: "지금 가장 마음이 가는 색을 하나 골라요", options: (Object.keys(COLOR) as ColorKey[]).map((k) => ({ v: k, label: COLOR[k].label, hex: COLOR[k].hex })) },
  { test: "motive", q: "새 일을 맡았을 때, 무엇이 있으면 움직이기 쉬운가요?", options: motives(["goal", "autonomy", "people", "novelty"]) },
  { test: "motive", q: "같은 일을 오래 할 때 힘이 되는 건 무엇인가요?", options: motives(["rhythm", "growth", "recognition", "reward"]) },
  { test: "problem", q: "일이 꼬였을 때 나는 먼저…", options: [
    { v: "check", label: "하나씩 다시 확인해요" }, { v: "execute", label: "일단 해 보면서 고쳐요" }, { v: "structure", label: "순서를 새로 짜요" }, { v: "mediate", label: "관련된 사람과 먼저 맞춰요" },
  ] },
  { test: "relation", q: "생각이 복잡할 때 더 잘 정리되는 쪽은?", options: [{ v: "solo", label: "혼자 적어 보면서" }, { v: "together", label: "누군가와 이야기하면서" }] },
  { test: "relation", q: "어떤 자리에서 더 해 보고 싶어지나요?", options: [{ v: "peer", label: "비슷한 수준의 사람들과 함께할 때" }, { v: "mixed", label: "나와 수준이 다른 사람과 어울릴 때" }] },
];

const TONE: Record<Hue, Tone> = { coral: "bad", amber: "warn", blue: "info", green: "good", cyan: "info", violet: "brand", orange: "warn", brand: "brand" };

export default function Test() {
  const { id = "" } = useParams();
  const { applicants } = useApp();
  const a = applicants.find((x) => x.id === id);
  if (!a) {
    return (
      <ApplicantFrame back="#/hiring" step="CRATA 검사">
        <PageHead eyebrow={COMPANY.name} title="지원 정보를 찾지 못했어요" desc="예시 화면에서 새로 낸 지원서는 새로고침하면 사라져요." />
        <section className="card"><Empty icon={<UserRoundSearch />} title="검사 링크가 맞는지 확인해 주세요"><a className="btn" href="#/hiring">채용 공고 보기</a></Empty></section>
      </ApplicantFrame>
    );
  }
  return <TestView key={a.id} a={a} />;
}

function TestView({ a }: { a: Applicant }) {
  const { positions, team, today, toast } = useApp();
  const pos = positions.find((p) => p.id === a.positionId);
  const t = team(pos?.teamId);
  const back = pos ? `#/hiring/${pos.id}` : "#/hiring";
  const [at, setAt] = useState<"intro" | number | "done">("intro");
  const [ans, setAns] = useState<Record<number, string>>({});

  const go = (n: typeof at) => { setAt(n); window.scrollTo(0, 0); };
  const restart = () => { setAns({}); go("intro"); };
  const askWhy = () => toast("예시예요. 요청하면 담당자가 추천 근거를 설명해 드려요");

  const status: { tone: Tone; text: string } = a.crata
    ? { tone: "good", text: `검사를 마쳤어요 · ${longDate(a.testedAt ?? a.crata.takenAt)}` }
    : a.stage === "testing" ? { tone: "info", text: `검사 링크를 받았어요 · ${longDate(a.testSentAt ?? today)}` }
    : a.stage === "hold" ? { tone: "neutral", text: "지원서를 확인하는 중이에요" }
    : { tone: "warn", text: "서류 확인 전이에요 · 미리 보기" };

  // ───────── 소개
  if (at === "intro") {
    return (
      <ApplicantFrame back={back} step="2/3 · CRATA 검사">
        <section className="ts-hero" aria-label="검사 소개">
          <div className="ts-hero__in">
            <span className="ts-orb" aria-hidden />
            <PageHead
              eyebrow={<>{longDate(today)} · {pos?.title ?? "지원"}{t ? ` · ${t.name}` : ""}</>}
              title={<>{a.name} 님, CRATA 검사를 시작해요</>}
              desc="네 가지 검사로 내가 일하는 방식을 봐요. 맞고 틀린 답이 없어요."
            />
            <div className="ts-meta">
              <Chip tone={status.tone} dot>{status.text}</Chip>
              <Chip tone="outline" icon={<Clock aria-hidden />}><span>모두 약 <span className="num">{TOTAL_MIN}</span>분(예시)</span></Chip>
            </div>

            <ul className="ts-tests" aria-label="CRATA 검사 4종">
              {TESTS.map(({ key, title, Icon, hue, what, parts, mins }) => {
                const n = ITEMS.filter((i) => i.test === key).length;
                return (
                  <li key={key} className="ts-test">
                    <div className="ts-test__top">
                      <span className={`ts-test__ic tone-${hue}`}><Icon aria-hidden /></span>
                      <div style={{ minWidth: 0 }}>
                        <h2 className="ts-test__t">{title}</h2>
                        <p className="ts-test__d">{what}</p>
                        <p className="ts-test__p">{parts}</p>
                      </div>
                    </div>
                    <div className="ts-test__foot"><span>예시 문항 <span className="num">{n}</span>개</span><span className="num">약 {mins}분</span></div>
                  </li>
                );
              })}
            </ul>

            <ul className="ts-use" aria-label="결과는 이렇게 쓰여요">
              <li><span className="ts-use__ic tone-brand"><Building2 aria-hidden /></span><span><b>{COMPANY.name}에는 '이 채용 판단용'으로만 가요.</b> 다른 공고나 입사 뒤 인사에 그대로 쓰지 않아요.</span></li>
              <li><span className="ts-use__ic tone-green"><FileText aria-hidden /></span><span><b>내 결과지도 받아요.</b> 검사를 마치면 내 결과를 따로 보내 드려요.</span></li>
              <li><span className="ts-use__ic tone-violet"><Sparkles aria-hidden /></span><span><b>AI는 면접 추천과 근거만 내요.</b> 결정은 담당자가 하고, 추천 근거가 궁금하면 설명을 요청할 수 있어요.</span></li>
            </ul>

            <div className="ts-start">
              <Button variant="dark" size="lg" onClick={() => go(0)}>예시 문항 풀어 보기<ArrowRight aria-hidden /></Button>
              <p className="ts-flow"><b>흐름 예시예요.</b> 실제 검사는 CRATA 검사 화면에서 진행돼요.</p>
            </div>
          </div>
        </section>
        <p className="ts-note">검사·항목 이름은 예시예요. 실제 CRATA 결과지로 바뀌어요.</p>
      </ApplicantFrame>
    );
  }

  // ───────── 마침
  if (at === "done") {
    return (
      <ApplicantFrame back={back} step="2/3 · CRATA 검사">
        <section className="ts-hero ts-hero--done" aria-label="검사 마침">
          <div className="ts-hero__in">
            <span className="ts-done__ic" aria-hidden><CircleCheck /></span>
            <PageHead eyebrow={<>{a.name} 님 · {pos?.title}</>} title="예시 검사를 마쳤어요" desc="실제 검사를 마치면 이렇게 이어져요." />
            <ol className="ts-next">
              <li><span className="ts-next__n num">1</span><div><b>결과가 회사로 가요</b><span>{COMPANY.name}에 이 채용 판단용으로만 전달돼요</span></div></li>
              <li><span className="ts-next__n num">2</span><div><b>내 결과지를 받아요</b><span>지원자 본인도 자기 결과를 따로 받아요</span></div></li>
              <li><span className="ts-next__n num">3</span><div><b>담당자가 검토해요</b><span>AI 추천은 참고예요. 면접 대상은 담당자가 정해요</span></div></li>
              <li><span className="ts-next__n num">4</span><div><b>면접 연락</b><span>면접 대상이 되면 담당자가 직접 연락해요</span></div></li>
            </ol>
            <div className="ts-done__acts">
              <a className="btn btn--dark btn--lg" href={back}>회사 화면으로 돌아가기</a>
              <Button size="lg" icon={<MessageCircleQuestion />} onClick={askWhy}>추천 근거 설명 요청</Button>
              <Button size="lg" variant="ghost" icon={<RotateCcw />} onClick={restart}>처음부터 다시 보기</Button>
            </div>
            <p className="ts-flow">예시라 고른 답은 저장하지 않고, 지원 상태도 바뀌지 않아요.</p>
          </div>
        </section>
      </ApplicantFrame>
    );
  }

  // ───────── 문항
  const i = at;
  const item = ITEMS[i]!;
  const test = TESTS.find((x) => x.key === item.test)!;
  const testIdx = TESTS.indexOf(test);
  const picked = ans[i];
  const last = i === ITEMS.length - 1;
  const answered = Object.keys(ans).length;
  const next = () => { if (picked) go(last ? "done" : i + 1); };

  return (
    <ApplicantFrame back={back} step="2/3 · CRATA 검사">
      <PageHead eyebrow={<>{a.name} 님 · {pos?.title}</>} title="CRATA 검사 예시" desc="평소 나에 가까운 쪽을 골라요. 맞고 틀린 답이 없어요." />

      <section className="card ts-q" aria-labelledby="ts-q-t">
        <ol className="ts-steps" aria-label="검사 4종 진행">
          {TESTS.map((x, k) => {
            const st = k < testIdx ? "done" : k === testIdx ? "now" : "next";
            return (
              <li key={x.key} className={cx("ts-steps__i", `is-${st}`)} aria-current={st === "now" ? "step" : undefined}>
                <span className="ts-steps__dot" aria-hidden>{st === "done" ? <Check /> : <span className="num">{k + 1}</span>}</span>
                <span className="ts-steps__t">{x.short}<span className="sr-only">{st === "done" ? " 끝남" : st === "now" ? " 지금" : ""}</span></span>
              </li>
            );
          })}
        </ol>

        <div className="ts-q__bar">
          <div className="between">
            <span className="ts-q__test"><Chip tone={TONE[test.hue]} icon={<test.Icon aria-hidden />}>{test.title}</Chip><Chip tone="outline" sm>예시 문항</Chip></span>
            <span className="ts-q__n num" aria-label={`${ITEMS.length}문항 중 ${i + 1}번째`}>{i + 1}<span> / {ITEMS.length}</span></span>
          </div>
          <Bar lg value={((i + (picked ? 1 : 0)) / ITEMS.length) * 100} label={`진행 ${answered}/${ITEMS.length}`} />
        </div>

        <fieldset className="ts-fs">
          <legend id="ts-q-t" className="ts-q__q">{item.q}</legend>
          <ul className={cx("ts-opts", item.test === "color" && "ts-opts--color", item.options.length === 2 && "ts-opts--two")}>
            {item.options.map((o) => {
              const oid = `ts-${i}-${o.v}`;
              return (
                <li key={o.v} className="ts-opt">
                  <input type="radio" id={oid} name={`ts-${i}`} value={o.v} checked={picked === o.v} onChange={() => setAns((x) => ({ ...x, [i]: o.v }))}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); next(); } }} />
                  <label htmlFor={oid}>
                    {o.hex ? <span className="ts-sw" style={{ background: o.hex }} aria-hidden /> : <span className="ts-radio" aria-hidden />}
                    <span className="ts-opt__t">{o.label}</span>
                    {picked === o.v && <Check className="ts-opt__ok" aria-hidden />}
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>

        <div className="ts-q__foot">
          <Button icon={<ArrowLeft />} onClick={() => go(i === 0 ? "intro" : i - 1)}>{i === 0 ? "소개로" : "이전"}</Button>
          <span className="ts-q__left faint small">{picked ? (last ? "마지막 문항이에요" : "다음으로 넘어가요") : "하나를 골라 주세요"}</span>
          <Button variant="dark" onClick={next} disabled={!picked}>{last ? "마치기" : "다음"}<ArrowRight aria-hidden /></Button>
        </div>
      </section>

      <p className="ts-note"><b>흐름 예시예요.</b> 실제 검사는 CRATA 검사 화면에서 진행돼요. 문항·항목 이름은 예시이고, 실제 CRATA 결과지로 바뀌어요. 고른 답은 저장하지 않아요.</p>
    </ApplicantFrame>
  );
}
