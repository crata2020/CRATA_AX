// 구성원 · CRATA: refs/orbixcrm-team-members-grid.jpg(검색 + 필터 + 카드/목록 전환, 파스텔 배경 큰 얼굴 카드 + 이름 + 점 칩 + ⋮, 아래 쪽 번호),
// refs/hope-hr-analytics.jpg(위 KPI 띠, 'Analytic View' 왼쪽 점 목록 + 오른쪽 막대), refs/mediflex-doctors.jpg(사람 → 프로필 칸·라벨/값 묶음)에서 가져왔어요.
// 개인 CRATA 값은 배치 참고 동의자만. 동의 안 함은 "본인만 볼 수 있어요", 미응시는 미응시. 팀 분포는 검사한 사람 5명 이상일 때만.
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowRight, ChevronLeft, ChevronRight, Crown, GitBranchPlus, LayoutGrid, List, Lock, MoreVertical, ScanSearch, Search, ShieldCheck, UserCheck, UserX, Users, UsersRound,
} from "lucide-react";
import { useApp } from "@/data/store";
import type { Consent, Person, Team } from "@/lib/model";
import { fit, teamDistribution, VERDICT, verdictOf, type World } from "@/lib/fit";
import { josa } from "@/lib/text";
import { Avatar, Bar, Button, Card, Chip, Drawer, Empty, IconButton, KpiCard, Menu, PageHead, PillSelect, Segmented, Track, cx, type Hue } from "@/ui";
import { CONSENT, ConsentChip, CrataMini, CrataResult, Distribution, FitParts, Locked, TeamEnvList, fitColor, tenure, ymd } from "./People.parts";
import "./People.css";

const HUES: Hue[] = ["blue", "orange", "green", "violet", "amber", "cyan", "coral"];
const hueOf = (id: string) => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return HUES[h % HUES.length]!; };
const PAGE = 12;
type View = "grid" | "list";
type CFilter = "all" | Consent;

export default function People() {
  const { people, teams, pending, today, team: teamOfId } = useApp();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [teamF, setTeamF] = useState("all");
  const [cf, setCf] = useState<CFilter>("all");
  const [view, setView] = useState<View>(() => (typeof window !== "undefined" && window.innerWidth < 768 ? "grid" : "list"));
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);

  // 확정된 조직 기준(확정 전 이동은 '이동 예정'으로만 표시)
  const base: World = useMemo(() => ({ people, teams, today }), [people, teams, today]);
  const work = teams.filter((t) => !t.office);
  const firstShown = work.find((t) => teamDistribution(base, t.id).shown)?.id ?? work[0]!.id;
  const [distTeam, setDistTeam] = useState(firstShown);
  const dTeam = teams.find((t) => t.id === distTeam)!;

  const count = (c: Consent) => people.filter((p) => p.consent === c).length;
  const nPlace = count("placement"), nSelf = count("self"), nNone = count("none");
  const tookN = people.filter((p) => p.crata && p.consent !== "none").length;
  const pct = (n: number) => Math.round((n / Math.max(1, people.length)) * 100);
  const distShown = work.filter((t) => teamDistribution(base, t.id).shown).length;

  const order = useMemo(() => new Map(teams.map((t, i) => [t.id, i])), [teams]);
  const fitOf = (p: Person) => {
    const t = teamOfId(p.teamId);
    if (p.consent !== "placement" || !p.crata || !t || t.office) return null;
    return fit(t.env, p.crata, t.name);
  };
  const moveOf = (p: Person) => pending.find((m) => m.personId === p.id);

  const list = people
    .filter((p) => (teamF === "all" || p.teamId === teamF) && (cf === "all" || p.consent === cf))
    .filter((p) => { const s = q.trim(); return !s || `${p.name} ${p.title} ${teamOfId(p.teamId)?.name ?? ""}`.includes(s); })
    .sort((a, b) => (order.get(a.teamId)! - order.get(b.teamId)!) || Number(!!b.leader) - Number(!!a.leader) || a.joined.localeCompare(b.joined));
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const shown = list.slice(cur * PAGE, cur * PAGE + PAGE);
  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(0); };

  const open = people.find((p) => p.id === openId);
  const openTeam = open ? teamOfId(open.teamId) : undefined;
  const openFit = open ? fitOf(open) : null;
  const openMove = open ? moveOf(open) : undefined;
  const toMoves = (p?: Person) => nav(p ? `/moves?person=${p.id}` : "/moves");

  const personMenu = (p: Person) => (
    <Menu align="right" width={200} trigger={({ toggle }) => <IconButton label={`${p.name} 더보기`} size="sm" plain onClick={(e) => { e.stopPropagation(); toggle(); }}><MoreVertical /></IconButton>}>
      {(close) => (
        <>
          <button type="button" className="menu__item" onClick={() => { close(); setOpenId(p.id); }}><UsersRound />상세 보기</button>
          <button type="button" className="menu__item" onClick={() => { close(); toMoves(p); }}><GitBranchPlus />인사이동에서 보기</button>
        </>
      )}
    </Menu>
  );

  const FitCell = ({ p }: { p: Person }) => {
    const f = fitOf(p);
    if (!f) return <span className="faint small">{p.consent === "placement" ? "대상 아님" : "—"}</span>;
    const v = VERDICT[verdictOf(f.score)];
    return (
      <div className="pp-fitcell">
        <div className="between"><b className="num">{f.score}</b><span className="xs muted">{v.label}</span></div>
        <Bar value={f.score} color={fitColor(f.score)} label={`지금 팀 적합도 ${f.score}`} />
      </div>
    );
  };

  return (
    <>
      <PageHead
        title="구성원 · CRATA"
        desc="CRATA 결과는 본인만 보는 게 기본이에요. 배치 참고에 따로 동의한 사람만 개인 결과를 인사이동에 참고해요."
        actions={
          <>
            <Button icon={<ShieldCheck />} onClick={() => nav("/policy")}>동의 기준</Button>
            <Button variant="dark" icon={<GitBranchPlus />} count={pending.length || undefined} onClick={() => toMoves()}>인사이동에서 보기</Button>
          </>
        }
      />

      <div className="kpirow" style={{ marginBottom: "var(--gap)" }}>
        <KpiCard icon={<Users />} hue="brand" label="구성원" value={people.length} unit="명" foot={`팀 ${work.length}개 · 대표이사·공장장 포함`} />
        <KpiCard icon={<ScanSearch />} hue="violet" label="검사 참여" value={tookN} unit="명" delta={<Chip tone="info" sm><span className="num">{pct(tookN)}%</span></Chip>} foot="결과는 모두 본인에게 먼저 가요" />
        <KpiCard icon={<UserCheck />} hue="green" label="배치 참고 동의" value={nPlace} unit="명" delta={<Chip tone="good" sm><span className="num">{pct(nPlace)}%</span></Chip>} foot="이 사람들만 개인 결과를 참고해요" />
        <KpiCard icon={<UserX />} hue="amber" label="동의 안 함 · 미응시" value={nSelf + nNone} unit="명" foot={<>동의 안 함 <span className="num">{nSelf}</span> · 미응시 <span className="num">{nNone}</span> · 불이익 없어요</>} />
      </div>

      <div className="grid g-12" style={{ marginBottom: "var(--gap)" }}>
        <Card className="s-8" title="팀별 CRATA 분포" sub={`검사한 사람 5명 이상인 팀만 · ${distShown}/${work.length}팀`} line actions={
          <PillSelect label="팀 고르기" value={distTeam} onChange={setDistTeam} options={work.map((t) => ({ value: t.id, label: t.name }))} />
        }>
          <div className="pp-analytic">
            <ul className="pp-teams" aria-label="팀 목록">
              {work.map((t) => {
                const d = teamDistribution(base, t.id);
                const n = people.filter((p) => p.teamId === t.id).length;
                return (
                  <li key={t.id}>
                    <button type="button" aria-pressed={t.id === distTeam} onClick={() => setDistTeam(t.id)}>
                      <i className={cx("pp-teams__dot", !d.shown && "off")} aria-hidden />
                      <span className="pp-teams__n ellipsis">{t.name}</span>
                      <span className="pp-teams__c num">{d.n}/{n}</span>
                      {d.shown ? <span className="pp-teams__s">분포</span> : <span className="pp-teams__s off"><Lock aria-hidden />숨김</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="pp-analytic__main">
              <div className="pp-analytic__head">
                <div>
                  <div className="pp-analytic__t">{dTeam.name}</div>
                  <div className="muted small">{dTeam.desc || "조직도 위 칸"}</div>
                </div>
                <Chip tone="outline" sm icon={<Lock />}>이름 없이 합계만</Chip>
              </div>
              <Distribution world={base} team={dTeam} />
            </div>
          </div>
        </Card>

        <Card className="s-4" title="팀 환경" sub={`${dTeam.name} · 적합도는 이 환경과 비교해요`} line>
          <div className="pp-envhead">
            <div><span className="num pp-envhead__v">{people.filter((p) => p.teamId === dTeam.id).length}</span><span className="muted small">명 · 최소 <span className="num">{dTeam.min}</span>명</span></div>
            <div className="row" style={{ gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {dTeam.shift && <Chip tone="info" sm>교대</Chip>}
              {dTeam.requires.map((r) => <Chip key={r} tone="neutral" sm>{r}</Chip>)}
            </div>
          </div>
          <TeamEnvList env={dTeam.env} />
          <p className="pp-note">팀 환경은 진단(인터뷰·셰도잉)에서 정하고 팀장이 확인해요. 항목 이름은 예시예요. 실제 CRATA 결과지 항목으로 바뀌어요.</p>
        </Card>
      </div>

      <div className="toolbar pp-toolbar">
        <label className="search pp-search">
          <Search aria-hidden />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="이름·직책·팀 검색" aria-label="구성원 검색" />
        </label>
        <PillSelect label="팀" value={teamF} onChange={reset(setTeamF)} options={[{ value: "all", label: "모든 팀" }, ...teams.map((t) => ({ value: t.id, label: t.name }))]} />
        <Segmented label="동의 상태" size="sm" value={cf} onChange={reset(setCf)} options={[
          { value: "all", label: "전체", n: people.length }, { value: "placement", label: "배치 참고", n: nPlace }, { value: "self", label: "동의 안 함", n: nSelf }, { value: "none", label: "미응시", n: nNone },
        ]} />
        <span className="toolbar__spacer" />
        <Track label="보기" value={view} onChange={setView} options={[{ value: "list", label: "표", icon: <List /> }, { value: "grid", label: "카드", icon: <LayoutGrid /> }]} />
      </div>
      <p className="pp-privacy"><Lock aria-hidden />동의 안 한 사람의 결과는 어디에도 나오지 않아요. ARA 마음 기록·대화는 인사에 쓰지 않아요.</p>

      {list.length === 0 ? (
        <div className="card"><Empty icon={<Search />} title="찾는 사람이 없어요">검색어나 필터를 바꿔 보세요</Empty></div>
      ) : view === "grid" ? (
        <div className="pp-grid">
          {shown.map((p) => {
            const t = teamOfId(p.teamId);
            const f = fitOf(p);
            const mv = moveOf(p);
            return (
              <article key={p.id} className="pp-card" onClick={() => setOpenId(p.id)}>
                <div className={`pp-card__hero tone-${hueOf(p.id)}`}>
                  <Avatar name={p.name} size="xl" />
                  {p.leader && <span className="pp-card__tag"><Crown />{t?.office ? p.title : "팀장"}</span>}
                  {mv && <span className="pp-card__move"><i />이동 예정</span>}
                </div>
                <div className="pp-card__body">
                  <div className="pp-card__head">
                    <div style={{ minWidth: 0 }}>
                      <h3 className="pp-card__name ellipsis"><button type="button" onClick={(e) => { e.stopPropagation(); setOpenId(p.id); }}>{p.name}</button></h3>
                      <div className="pp-card__sub ellipsis">{p.title} · {t?.name}</div>
                    </div>
                    <span onClick={(e) => e.stopPropagation()}>{personMenu(p)}</span>
                  </div>
                  <div><ConsentChip c={p.consent} /></div>
                  {p.consent === "placement" && p.crata ? <CrataMini p={p.crata} stacked /> : <Locked c={p.consent} />}
                  <div className="pp-card__stats">
                    <div>{f ? <span className="num" style={{ color: "var(--ink)" }}>{f.score}</span> : <span className="faint">—</span>}<small>팀 적합도</small></div>
                    <div><span className="num">{tenure(p.joined, today)}</span><small>근속</small></div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="card">
          <div className="tablewrap">
            <table className="table pp-table">
              <thead><tr><th>이름</th><th>팀</th><th>입사</th><th>동의</th><th>CRATA 요약</th><th>지금 팀 적합도</th><th className="r" aria-label="동작" /></tr></thead>
              <tbody>
                {shown.map((p) => {
                  const t = teamOfId(p.teamId);
                  const mv = moveOf(p);
                  return (
                    <tr key={p.id} onClick={() => setOpenId(p.id)} style={{ cursor: "pointer" }}>
                      <td>
                        <div className="cellmain">
                          <Avatar name={p.name} />
                          <div style={{ minWidth: 0 }}>
                            <div className="cellmain__t" style={{ whiteSpace: "nowrap" }}>{p.name}{p.leader && <Crown className="pp-crown" aria-label="팀장" />}</div>
                            <div className="cellmain__s" style={{ whiteSpace: "nowrap" }}>{p.title}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {t?.name}
                        {mv && <div><Chip tone="warn" dot sm>{josa(teamOfId(mv.toTeamId)?.name ?? "", "으로")} 이동 예정</Chip></div>}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}><span className="num">{ymd(p.joined)}</span><div className="xs faint">{tenure(p.joined, today)}</div></td>
                      <td><ConsentChip c={p.consent} /></td>
                      <td>{p.consent === "placement" && p.crata ? <CrataMini p={p.crata} /> : <Locked c={p.consent} compact />}</td>
                      <td><FitCell p={p} /></td>
                      <td className="r"><Button size="sm" onClick={(e) => { e.stopPropagation(); setOpenId(p.id); }}>보기</Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pages > 1 && (
        <nav className="pp-pager" aria-label="쪽 이동">
          <Button icon={<ChevronLeft />} disabled={cur === 0} onClick={() => setPage(cur - 1)}>이전</Button>
          <span className="pp-pager__nums">
            {Array.from({ length: pages }, (_, i) => (
              <button key={i} type="button" className="num" aria-current={i === cur ? "page" : undefined} aria-label={`${i + 1}쪽`} onClick={() => setPage(i)}>{i + 1}</button>
            ))}
          </span>
          <span className="pp-pager__txt muted small"><span className="num">{cur * PAGE + 1}–{Math.min(list.length, cur * PAGE + PAGE)}</span> / <span className="num">{list.length}</span>명</span>
          <Button disabled={cur === pages - 1} onClick={() => setPage(cur + 1)}>다음<ChevronRight /></Button>
        </nav>
      )}

      <Drawer open={!!open} title={open ? `${open.name} · ${openTeam?.name ?? ""}` : ""} onClose={() => setOpenId(null)} foot={
        <>
          <Button onClick={() => setOpenId(null)}>닫기</Button>
          <Button variant="brand" icon={<GitBranchPlus />} onClick={() => toMoves(open)}>인사이동에서 보기</Button>
        </>
      }>
        {open && openTeam && (
          <PersonDetail p={open} team={openTeam} today={today} fitScore={openFit} moveTo={openMove ? teamOfId(openMove.toTeamId) : undefined} />
        )}
      </Drawer>
    </>
  );
}


function PersonDetail({ p, team, today, fitScore, moveTo }: { p: Person; team: Team; today: string; fitScore: ReturnType<typeof fit> | null; moveTo?: Team }) {
  const v = fitScore ? VERDICT[verdictOf(fitScore.score)] : null;
  const toFit = moveTo && p.consent === "placement" && p.crata ? fit(moveTo.env, p.crata, moveTo.name) : null;
  return (
    <>
      <div className="pp-prof">
        <Avatar name={p.name} size="xl" />
        <div style={{ minWidth: 0 }}>
          <div className="pp-prof__n">{p.name}</div>
          <div className="muted small">{p.title} · {team.name}</div>
          <div className="row" style={{ gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            <ConsentChip c={p.consent} />
            {p.leader && <Chip tone="dark" sm icon={<Crown />}>{team.office ? p.title : "팀장"}</Chip>}
            {moveTo && <Chip tone="warn" dot sm>{josa(moveTo.name, "으로")} 이동 예정</Chip>}
          </div>
        </div>
      </div>

      <dl className="pp-facts">
        <div><dt>입사</dt><dd><span className="num">{ymd(p.joined)}</span><span className="faint small"> · {tenure(p.joined, today)}</span></dd></div>
        <div><dt>마지막 이동</dt><dd>{p.lastMoved ? <span className="num">{ymd(p.lastMoved)}</span> : <span className="faint">없음</span>}</dd></div>
        <div><dt>교대 근무</dt><dd>{p.shiftOk ? "가능" : "어려움"}</dd></div>
        <div><dt>기술</dt><dd className="pp-chips">{p.skills.length ? p.skills.map((s) => <Chip key={s} tone="outline" sm>{s}</Chip>) : <span className="faint">—</span>}</dd></div>
        <div><dt>교육·자격</dt><dd className="pp-chips">{p.licenses.length ? p.licenses.map((s) => <Chip key={s} tone="outline" sm>{s}</Chip>) : <span className="faint">—</span>}</dd></div>
      </dl>

      {p.consent === "placement" && p.crata ? (
        <>
          {fitScore && v && (
            <section>
              <div className="between pp-sec">
                <h3>지금 팀 적합도</h3>
                <span className="row" style={{ gap: 8 }}><Chip tone={v.tone} dot sm>{v.label}</Chip><b className="num pp-score">{fitScore.score}</b></span>
              </div>
              {moveTo && toFit && (
                <div className="pp-compare" aria-label="확정 전 이동과 비교">
                  <div><div className="pp-compare__k">지금 · {team.name}</div><div className="pp-compare__v"><b className="num">{fitScore.score}</b>{VERDICT[verdictOf(fitScore.score)].label}</div></div>
                  <ArrowRight aria-hidden />
                  <div><div className="pp-compare__k">확정 전 · {moveTo.name}</div><div className="pp-compare__v"><b className="num">{toFit.score}</b>{VERDICT[verdictOf(toFit.score)].label}</div></div>
                </div>
              )}
              <FitParts f={fitScore} />
            </section>
          )}
          <section>
            <div className="between pp-sec"><h3>CRATA 4종 결과</h3><span className="xs faint num">검사 {ymd(p.crata.takenAt)}</span></div>
            <CrataResult p={p.crata} />
            <p className="pp-note" style={{ marginTop: 10 }}>항목 이름은 예시예요. 실제 CRATA 결과지 항목으로 바뀌어요.</p>
          </section>
        </>
      ) : (
        <div className="pp-lockbox">
          <span className="pp-hidden__icon"><Lock /></span>
          <div className="pp-hidden__t">{p.consent === "self" ? "본인만 볼 수 있어요" : "CRATA 검사에 응하지 않았어요"}</div>
          <p>{CONSENT[p.consent].long}</p>
          <p>인사이동은 인원·기술·자격 같은 조직 정보로만 봐요. 동의하지 않아도 불이익은 없어요.</p>
        </div>
      )}
      <p className="pp-privacy pp-privacy--box"><Lock aria-hidden />ARA 마음 기록·대화는 인사에 쓰지 않아요. 동의는 본인이 언제든 바꿀 수 있어요.</p>
    </>
  );
}
