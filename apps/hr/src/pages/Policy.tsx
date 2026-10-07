// 동의 · 보관: refs/winx-add-product-form.jpg — 제목 줄 'Discard'(흰 테두리) + 'Add'(짙은) → 되돌리기·저장하기, 넓은 왼쪽 + 좁은 오른쪽 상태 열('Product Status' 체크·도움말),
// 섹션 제목 + 알약 입력 → 반환 청구 기간. refs/fintech-accounts.jpg — 'Recent Transactions' 원 아이콘 줄 → 원칙 체크리스트, 큰 숫자 → 동의 현황.
// worksite-next 설정 화면의 '데이터 등급' 표(데스크톱 표 + 모바일 줄 목록) 문법으로 "누가 무엇을 보나요"와 보관·파기 표.
// 기준: 직원 CRATA는 본인만이 기본 · 배치 참고는 따로 동의 · 5명 이상 팀 분포만 · 불이익 없음 · ARA 마음 기록 미사용 · 철회.
// 채용: AI 추천 고지 · 사람이 결정 · 설명 요청 · 받지 않는 정보(채용절차법·연령차별 금지) · 서류 보관·파기(14~180일 중 회사가 정함, 예시 180일) · 검사 결과는 그 채용에만.
import { useMemo, useState, type ReactNode } from "react";
import {
  Archive, Ban, Bot, Check, CircleAlert, FileUser, Gavel, HeartOff, Lock, MessageCircleQuestion, RotateCcw, Scale, ShieldCheck, Undo2, UserCheck, Users, UsersRound,
} from "lucide-react";
import { useApp } from "@/data/store";
import { teamDistribution } from "@/lib/fit";
import type { Consent } from "@/lib/model";
import { Button, Card, Chip, PageHead, StackBar, Track, cx, type Hue, type Tone } from "@/ui";
import { Donut, Legend } from "@/ui/charts";
import { NOT_ASKED, RETENTION_DAYS, daysLeft, ddayLabel, longDate } from "./Apply.parts";
import "./Policy.css";

const MIN_DAYS = 14, MAX_DAYS = 180;
const PRESETS = ["14", "30", "90", "180"] as const;
type Pool = "6" | "12";
interface Draft { days: number; pool: Pool }
const SAVED0: Draft = { days: RETENTION_DAYS, pool: "12" };

const CONSENT: Record<Consent, { label: string; color: string; tone: Tone }> = {
  placement: { label: "배치 참고", color: "var(--brand)", tone: "brand" },
  self: { label: "본인만", color: "var(--c-cyan)", tone: "info" },
  none: { label: "미응시", color: "#d6d7de", tone: "neutral" },
};

interface Rule { icon: ReactNode; hue: Hue; t: string; s: ReactNode; where: string }

/** 올해가 아니면 연도까지: "2027년 1월 27일(수)" */
const fullDate = (s: string, today: string) => (s.slice(0, 4) === today.slice(0, 4) ? longDate(s) : `${s.slice(0, 4)}년 ${longDate(s)}`);
const addDays = (s: string, n: number) => {
  const d = new Date(`${s.slice(0, 10)}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function Policy() {
  const { people, teams, applicants, positions, today, toast } = useApp();
  const [saved, setSaved] = useState<Draft>(SAVED0);
  const [draft, setDraft] = useState<Draft>(SAVED0);
  const daysOk = Number.isInteger(draft.days) && draft.days >= MIN_DAYS && draft.days <= MAX_DAYS;
  const changes = (draft.days !== saved.days ? 1 : 0) + (draft.pool !== saved.pool ? 1 : 0);
  const days = daysOk ? draft.days : saved.days;

  // ───────── 지금 동의 현황(확정된 조직 기준)
  const counts = useMemo(() => {
    const c: Record<Consent, number> = { placement: 0, self: 0, none: 0 };
    for (const p of people) c[p.consent]++;
    return c;
  }, [people]);
  const total = people.length;
  const taken = counts.placement + counts.self;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const slices = (Object.keys(CONSENT) as Consent[]).map((k) => ({ label: CONSENT[k].label, value: counts[k], color: CONSENT[k].color }));

  const dist = useMemo(() => {
    const w = { people, teams, today };
    return teams.filter((t) => !t.office).map((t) => {
      const d = teamDistribution(w, t.id);
      return { team: t, n: d.n, shown: d.shown, size: people.filter((p) => p.teamId === t.id).length };
    });
  }, [people, teams, today]);
  const shownTeams = dist.filter((d) => d.shown).length;

  // ───────── 파기 일정(마감 공고) · 인재풀
  const closed = positions.filter((p) => p.status === "closed").map((p) => {
    const as = applicants.filter((a) => a.positionId === p.id);
    const hired = as.filter((a) => a.stage === "offer").length;
    const at = addDays(p.deadline, days);
    return { pos: p, n: as.length, hired, destroy: as.length - hired, at, left: daysLeft(at, today) };
  });
  const openN = positions.filter((p) => p.status === "open").length;
  const pool = applicants.filter((a) => a.note?.includes("인재풀")).length;

  const save = () => {
    if (!daysOk) { toast(`반환 청구 기간은 ${MIN_DAYS}~${MAX_DAYS}일 사이로 정해요`); return; }
    if (!changes) { toast("바뀐 기준이 없어요"); return; }
    setSaved(draft);
    toast(`보관 기준을 저장했어요 · 반환 청구 ${draft.days}일`);
  };
  const discard = () => { setDraft(saved); toast("저장 전으로 되돌렸어요"); };

  const SEE: { scope: string; sub: string; who: string; use: string; now: ReactNode; chip: [Tone, string] }[] = [
    { scope: "개인 결과 4종", sub: "색채·행동동기·문제해결·관계성장", who: "본인", use: "내 결과지, ARA 개인 공간", now: <><b className="num">{taken}</b>명 검사</>, chip: ["good", "기본"] },
    { scope: "팀 분포", sub: "검사한 사람 5명 이상 팀", who: "인사 담당 · 팀장", use: "팀 환경 진단, 조직 설계", now: <><b className="num">{shownTeams}</b>/{dist.length}팀 공개</>, chip: ["info", "5명 이상만"] },
    { scope: "개인 결과(배치 참고)", sub: "따로 동의한 사람만", who: "인사 담당", use: "인사이동 조언, 채용 때 팀 방식 비교", now: <><b className="num">{counts.placement}</b>명 동의</>, chip: ["warn", "동의한 사람만"] },
    { scope: "ARA 마음 기록·대화", sub: "체크인·대화·일하는 방식 카드", who: "본인", use: "인사에 쓰지 않아요", now: <span className="faint">들이지 않아요</span>, chip: ["bad", "인사 사용 안 함"] },
  ];

  const STAFF: Rule[] = [
    { icon: <Lock />, hue: "brand", t: "본인만 보는 게 기본이에요", s: "검사만 하고 따로 동의하지 않으면 결과는 본인만 봐요.", where: "기본값" },
    { icon: <UserCheck />, hue: "blue", t: "배치 참고는 따로 동의해요", s: "동의한 사람만 개인 결과를 인사이동 조언과 채용 비교에 써요. 동의 안 한 사람은 이름 옆에 '동의 안 함'만 보여요.", where: "인사이동" },
    { icon: <UsersRound />, hue: "cyan", t: "팀 분포는 5명 이상일 때만 보여요", s: "검사한 사람이 5명 미만인 팀은 분포를 숨겨서 누구인지 짐작할 수 없게 해요.", where: "구성원" },
    { icon: <Scale />, hue: "green", t: "응하지 않아도 불이익이 없어요", s: "검사를 하는지, 동의하는지를 평가·승진·배치에 반영하지 않아요.", where: "평가 미반영" },
    { icon: <HeartOff />, hue: "coral", t: "ARA 마음 기록·대화는 인사에 쓰지 않아요", s: "회사와 관리자가 볼 수 없고, 인사 화면 어디에도 들어오지 않아요.", where: "ARA" },
    { icon: <Undo2 />, hue: "violet", t: "언제든 철회할 수 있어요", s: "CRATA 앱 › 내 결과 › 활용 동의에서 끄거나 인사 담당에게 말하면 돼요. 철회하면 다음 인사이동·추천부터 바로 빠져요.", where: "철회" },
  ];
  const HIRE: Rule[] = [
    { icon: <Bot />, hue: "violet", t: "AI 추천을 미리 알려요", s: "지원서에서 [필수] 동의로 알려요. 채용에 쓰는 AI는 인공지능기본법상 고영향 AI에 해당할 수 있어요.", where: "지원서" },
    { icon: <Gavel />, hue: "brand", t: "결정은 사람이 해요", s: "AI는 추천과 근거만 내요. 자동 탈락이 없고, 추천에서 빠진 사람도 담당자가 면접에 넣을 수 있어요.", where: "공고 상세" },
    { icon: <MessageCircleQuestion />, hue: "amber", t: "설명을 요청할 수 있어요", s: "지원자가 요청하면 추천 근거를 설명해요. 개인정보보호법의 자동화된 결정에 대한 권리예요.", where: "지원자" },
    { icon: <ShieldCheck />, hue: "green", t: "검사 결과는 그 채용에만 써요", s: "다른 공고나 입사 뒤 인사에 그대로 쓰지 않아요. 합격하면 직원 기준(본인만 기본)으로 다시 동의받아요.", where: "검사" },
  ];

  const KEEP: { doc: string; keep: ReactNode; then: string }[] = [
    { doc: "지원서·이력서", keep: <>결과 안내 뒤 <b className="num">{days}</b>일</>, then: "반환 청구가 없으면 파기해요" },
    { doc: "지원자 CRATA 결과", keep: <>결과 안내 뒤 <b className="num">{days}</b>일</>, then: "지원서와 함께 파기 · 본인 결과지는 본인이 가져요" },
    { doc: "인재풀(선택 동의)", keep: <><b className="num">{draft.pool}</b>개월</>, then: "기간이 끝나거나 철회하면 파기해요" },
    { doc: "합격자 서류", keep: "근로계약 뒤 인사 기록으로", then: "CRATA 결과는 직원 기준으로 다시 동의받아요" },
  ];

  return (
    <>
      <PageHead
        title="동의 · 보관"
        desc="직원 CRATA 결과와 채용 서류를 누가, 어디에, 언제까지 쓰는지 정한 기준이에요."
        actions={
          <div className="pl-acts">
            <a className="btn pl-hide-m" href="#/apply/pos-qa"><FileUser aria-hidden />지원서 화면 보기</a>
            <Button icon={<RotateCcw />} disabled={!changes} onClick={discard}>되돌리기</Button>
            <Button variant="dark" icon={<Check />} count={changes || undefined} disabled={!daysOk} onClick={save}>저장하기</Button>
          </div>
        }
      />

      <div className="pl-layout">
        <div className="pl-main">
          {/* 직원 CRATA */}
          <Card className="pl-card pl-o3" title="직원 CRATA 결과" icon={<Users />} sub="결과는 본인 것이에요. 회사는 정해진 범위만 봐요" flush line
            actions={<Chip tone="good" dot>본인만이 기본</Chip>}>
            <h3 className="pl-cap">누가 무엇을 보나요</h3>
            <div className="tablewrap pl-hide-m">
              <table className="table pl-table">
                <thead><tr><th>범위</th><th>보는 사람</th><th>쓰는 곳</th><th>지금</th><th className="r">상태</th></tr></thead>
                <tbody>
                  {SEE.map((r) => (
                    <tr key={r.scope}>
                      <td><div className="cellmain__t">{r.scope}</div><div className="cellmain__s">{r.sub}</div></td>
                      <td className="pl-nowrap">{r.who}</td>
                      <td>{r.use}</td>
                      <td className="pl-nowrap pl-now">{r.now}</td>
                      <td className="r"><Chip tone={r.chip[0]} dot sm>{r.chip[1]}</Chip></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="pl-mlist pl-show-m">
              {SEE.map((r) => (
                <li key={r.scope}>
                  <div className="between"><div style={{ minWidth: 0 }}><div className="cellmain__t">{r.scope}</div><div className="cellmain__s">{r.sub}</div></div><Chip tone={r.chip[0]} dot sm>{r.chip[1]}</Chip></div>
                  <dl className="pl-dl"><div><dt>보는 사람</dt><dd>{r.who}</dd></div><div><dt>쓰는 곳</dt><dd>{r.use}</dd></div><div><dt>지금</dt><dd className="pl-now">{r.now}</dd></div></dl>
                </li>
              ))}
            </ul>
            <Rules title="지키는 것" rules={STAFF} />
          </Card>

          {/* 채용 */}
          <Card className="pl-card pl-o4" title="채용" icon={<FileUser />} sub="지원자에게 미리 알리고, 결정은 사람이 해요" flush line
            actions={<Chip tone="brand" dot>지원서에서 필수 동의</Chip>}>
            <Rules title="지키는 것" rules={HIRE} first />

            <section className="pl-sec" aria-labelledby="pl-noask">
              <h3 id="pl-noask" className="pl-sec__t">지원서에서 받지 않는 정보</h3>
              <ul className="pl-noask">{NOT_ASKED.map((x) => <li key={x}><Ban aria-hidden />{x}</li>)}</ul>
              <p className="pl-help">채용절차법(신체 조건·출신 지역·혼인 여부·재산·가족의 학력·직업)과 연령차별 금지 기준이에요. 지원서에 이 칸이 없어요.</p>
            </section>

            <section className="pl-sec" aria-labelledby="pl-keep">
              <h3 id="pl-keep" className="pl-sec__t">서류 보관·파기</h3>
              <div className="pl-keep">
                <div className="pl-keep__txt">
                  <label htmlFor="pl-days" className="pl-keep__l">채용서류 반환 청구 기간</label>
                  <p className="pl-help">채용 여부를 알린 뒤 지원자가 서류를 돌려 달라고 할 수 있는 기간이에요. 지나면 파기해요. 법이 정한 <span className="num">{MIN_DAYS}~{MAX_DAYS}</span>일 안에서 회사가 정해요.</p>
                </div>
                <div className="pl-keep__ctl">
                  <div className={cx("pl-days", !daysOk && "is-bad")}>
                    <input id="pl-days" className="num" type="number" inputMode="numeric" min={MIN_DAYS} max={MAX_DAYS} value={Number.isNaN(draft.days) ? "" : draft.days}
                      onChange={(e) => setDraft((d) => ({ ...d, days: e.target.value === "" ? NaN : Math.floor(Number(e.target.value)) }))}
                      aria-invalid={!daysOk} aria-describedby={!daysOk ? "pl-days-err" : undefined} />
                    <span aria-hidden>일</span>
                  </div>
                  <Track label="자주 쓰는 기간" value={String(draft.days)} onChange={(v) => setDraft((d) => ({ ...d, days: Number(v) }))}
                    options={PRESETS.map((p) => ({ value: p, label: `${p}일` }))} />
                </div>
              </div>
              {!daysOk && <p id="pl-days-err" className="pl-err" role="alert"><CircleAlert aria-hidden /><span><span className="num">{MIN_DAYS}~{MAX_DAYS}</span>일 사이로 정해요</span></p>}
              <div className="pl-keep pl-keep--sub">
                <div className="pl-keep__txt">
                  <span className="pl-keep__l" id="pl-pool-l">인재풀 보관 기간</span>
                  <p className="pl-help">불합격 뒤 인재풀에 [선택] 동의한 사람만 보관해요.</p>
                </div>
                <div className="pl-keep__ctl">
                  <Track label="인재풀 보관 기간" value={draft.pool} onChange={(v) => setDraft((d) => ({ ...d, pool: v }))}
                    options={[{ value: "6", label: "6개월" }, { value: "12", label: "12개월" }]} />
                </div>
              </div>

              <div className="tablewrap pl-hide-m pl-keeptable">
                <table className="table pl-table">
                  <thead><tr><th>서류</th><th>보관</th><th>그다음</th></tr></thead>
                  <tbody>
                    {KEEP.map((r) => (
                      <tr key={r.doc}><td className="strong pl-nowrap">{r.doc}</td><td className="pl-nowrap">{r.keep}</td><td>{r.then}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="pl-mlist pl-show-m pl-keeplist">
                {KEEP.map((r) => (
                  <li key={r.doc}><div className="cellmain__t">{r.doc}</div><dl className="pl-dl"><div><dt>보관</dt><dd>{r.keep}</dd></div><div><dt>그다음</dt><dd>{r.then}</dd></div></dl></li>
                ))}
              </ul>
            </section>
          </Card>
        </div>

        <div className="pl-side">
          {/* 지금 동의 현황 */}
          <Card className="pl-o1" title="지금 동의 현황" sub={<>구성원 <span className="num">{total}</span>명 · 확정된 조직 기준</>}
            foot={<span className="pl-foot"><Lock aria-hidden />동의 안 한 사람의 개인 결과는 어느 화면에도 보이지 않아요.</span>}>
            <div className="pl-donut">
              <Donut data={slices} size={150} thickness={20} center={<>{pct(counts.placement)}%</>} sub="배치 참고 동의" />
              <div className="pl-donut__lg"><Legend data={slices} total={total} /></div>
            </div>
            <div className="pl-stat">
              <div><span className="pl-stat__l">검사 참여</span><span className="pl-stat__v num">{taken}<small>/{total}명</small></span></div>
              <div><span className="pl-stat__l">본인만 · 미응시</span><span className="pl-stat__v num">{counts.self + counts.none}<small>명</small></span></div>
            </div>
          </Card>

          {/* 팀 분포 공개 */}
          <Card className="pl-o2" title="팀 분포 공개" sub="검사한 사람 5명 이상 팀만 보여요" actions={<Chip tone="outline" sm><span className="num">{shownTeams}/{dist.length}팀</span></Chip>}>
            <ul className="pl-teams">
              {dist.map((d) => (
                <li key={d.team.id}>
                  <div className="pl-teams__main">
                    <div className="between"><span className="pl-teams__t">{d.team.name}</span><span className="faint xs num">검사 {d.n}/{d.size}명</span></div>
                    <StackBar label={`${d.team.name} 검사 참여`} parts={[
                      { label: "검사", value: d.n, color: d.shown ? "var(--c-cyan)" : "var(--line-2)" },
                      { label: "미응시", value: Math.max(0, d.size - d.n), color: "var(--sunken)" },
                    ]} />
                  </div>
                  {d.shown ? <Chip tone="good" dot sm>보여요</Chip> : <Chip dot sm>숨김</Chip>}
                </li>
              ))}
            </ul>
          </Card>

          {/* 파기 일정 */}
          <Card className="pl-o5" title="파기 일정" sub={<>반환 청구 <span className="num">{days}</span>일 기준{changes ? " · 저장 전 미리보기" : ""}</>} icon={<Archive />}>
            <ul className="pl-destroy">
              {closed.map((c) => (
                <li key={c.pos.id}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="pl-destroy__t">{c.pos.title}</div>
                    <div className="pl-destroy__s">마감 {longDate(c.pos.deadline)} · 지원 <span className="num">{c.n}</span>명 중 <span className="num">{c.destroy}</span>명 파기{c.hired ? <>, 합격 <span className="num">{c.hired}</span>명은 인사 기록으로</> : null}</div>
                  </div>
                  <div className="pl-destroy__r">
                    <span className="pl-destroy__d">{fullDate(c.at, today)}</span>
                    {c.left < 0 ? <Chip sm dot>파기했어요</Chip> : <Chip sm tone={c.left <= 14 ? "warn" : "outline"}><span className="num">{c.left === 0 ? "오늘 파기" : ddayLabel(c.left)}</span></Chip>}
                  </div>
                </li>
              ))}
              <li>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="pl-destroy__t">열린 공고 <span className="num">{openN}</span>개</div>
                  <div className="pl-destroy__s">결과를 알린 날부터 <span className="num">{days}</span>일 뒤 파기해요</div>
                </div>
                <Chip sm tone="info" dot>진행 중</Chip>
              </li>
              <li>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="pl-destroy__t">인재풀</div>
                  <div className="pl-destroy__s">선택 동의한 지원자만 <span className="num">{draft.pool}</span>개월 보관해요</div>
                </div>
                <span className="pl-destroy__n num">{pool}<small>명</small></span>
              </li>
            </ul>
            <p className="pl-help pl-note">예시에서는 마감일부터 셌어요. 실제로는 채용 여부를 알린 날부터 세요.</p>
          </Card>
        </div>
      </div>

      <p className="faint xs pl-bottom"><Lock aria-hidden />저장은 예시라 이 화면에서만 바뀌어요. 법 해석은 노무·법률 자문으로 한 번 더 확인해 주세요.</p>
    </>
  );
}

function Rules({ title, rules, first }: { title: string; rules: Rule[]; first?: boolean }) {
  return (
    <section className={cx("pl-sec", first && "pl-sec--first")} aria-label={title}>
      <div className="pl-sec__head">
        <h3 className="pl-sec__t">{title}</h3>
        <span className="pl-sec__n faint xs"><Check aria-hidden /><span className="num">{rules.length}/{rules.length}</span> 지켜요</span>
      </div>
      <ul className="pl-rules">
        {rules.map((r) => (
          <li key={r.t}>
            <span className={`pl-rules__ic tone-${r.hue}`} aria-hidden>{r.icon}</span>
            <div className="pl-rules__main">
              <div className="pl-rules__t"><Check className="pl-rules__ok" aria-hidden />{r.t}</div>
              <p className="pl-rules__s">{r.s}</p>
            </div>
            <Chip tone="outline" sm>{r.where}</Chip>
          </li>
        ))}
      </ul>
    </section>
  );
}
