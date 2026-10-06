// 현장·품질: Orbix FinSight(post_3.jpg)를 밝게 — 위 KPI 4장(2×2) + 오른쪽 '30-day Cost Forecast' 자리에 고객 PPM(캡슐 막대 + 목표선 + 예측 줄),
// 가운데 'Compliance pulse'(초중종물 반원 게이지 + 공정별 줄 목록)·설비 도넛·불량 유형 눈금 막대(refs/fleettrack-analytics.jpg),
// 'Live Runs Stream' 표 자리에 현장 등록 표(배정 한 번 누르기), 'Getting started' 체크 목록은 8D 할 일로. KPI 카드 문법은 refs/ecommerce-ops-kpi.jpg.
import { useState } from "react";
import { useNavigate } from "react-router";
import {
  ChevronDown, CircleCheck, CircleDashed, ClipboardList, Cog, FileText, Lock, MapPin, PlusCircle, ScanSearch, Sparkles, Target, Timer, UserCheck,
} from "lucide-react";
import { useApp } from "@/data/store";
import { dday, daysLeft, md, num, when } from "@/data/format";
import type { FieldReport } from "@/data/types";
import { Avatar, Button, Card, Chip, Delta, IconButton, KpiCard, Menu, MoreButton, PageHead, PillSelect, Segmented, type Tone } from "@/ui";
import { CapsuleBars, Donut, Gauge } from "@/ui/charts";
import { D_STEPS, DSteps, FIELD_KINDS, FIELD_STATUS, KindChip, NotManufacturing, TickBar, WeekStack, josa, type FieldKind } from "./Quality.parts";
import "./Quality.css";

// 공정별 초중종물 실시율(화면 예시: 데이터에는 전체 실시율만 있어요)
const FML_BY_LINE: { name: string; rate: number; tone: Tone; note: string }[] = [
  { name: "편조 · KN 라인", rate: 94, tone: "good", note: "모두 기록" },
  { name: "크림핑 · CR-03", rate: 79, tone: "warn", note: "중물 3건 빠짐" },
  { name: "프레스 · PR-010", rate: 90, tone: "good", note: "모두 기록" },
  { name: "가공 · 전용기", rate: 83, tone: "info", note: "종물 확인 중" },
];
const PPM_MAX = 60;
const PPM_H = 220;

export default function Quality() {
  const { d } = useApp();
  if (d.pack !== "manufacturing" || !d.quality) return <NotManufacturing title="현장·품질" desc="고객 PPM·현장 등록·8D를 한 화면에서 봐요" />;
  return <QualityView />;
}

function QualityView() {
  const { d, me, person, act } = useApp();
  const nav = useNavigate();
  const q = d.quality!;
  const [filter, setFilter] = useState<"all" | FieldReport["status"]>("all");
  const canAssign = me.platform !== "member";

  // 고객 PPM
  const ppmNow = q.ppm[q.ppm.length - 1]!, ppmPrev = q.ppm[q.ppm.length - 2]!, ppmFirst = q.ppm[0]!;
  const ppm3 = q.ppm[q.ppm.length - 3]!;
  const pace = Math.max(0.1, (ppm3.value - ppmNow.value) / 2); // 최근 두 달 평균 감소
  const monthsToGoal = Math.max(1, Math.ceil((ppmNow.value - (q.target - 1)) / pace));
  const goalMonth = ((parseInt(ppmNow.month, 10) - 1 + monthsToGoal) % 12) + 1;
  const sixDrop = Math.round(((ppmFirst.value - ppmNow.value) / ppmFirst.value) * 100);

  // 현장 등록
  const todayReports = d.fieldReports.filter((f) => f.at.startsWith(d.today));
  const fieldNew = d.fieldReports.filter((f) => f.status === "new");
  const weekTotal = (w: (typeof q.fieldWeek)[number]) => w.defect + w.equipment + w.nearmiss + w.other;
  // 오늘 칸은 지금 등록 목록으로 다시 셈(등록하면 바로 오름)
  const week = q.fieldWeek.map((w, i) => {
    if (i !== q.fieldWeek.length - 1) return { day: w.day, values: { defect: w.defect, equipment: w.equipment, nearmiss: w.nearmiss, other: w.other } as Record<FieldKind, number> };
    const c = { defect: 0, equipment: 0, nearmiss: 0, other: 0 } as Record<FieldKind, number>;
    for (const f of todayReports) c[f.kind] += 1;
    return { day: w.day, values: c };
  });
  const yesterday = weekTotal(q.fieldWeek[q.fieldWeek.length - 2]!);
  const diff = todayReports.length - yesterday;
  const weekSum = week.reduce((s, w) => s + Object.values(w.values).reduce((a, b) => a + b, 0), 0);
  const nearWeek = week.reduce((s, w) => s + w.values.nearmiss, 0);
  const rows = d.fieldReports.filter((f) => filter === "all" || f.status === filter).slice().sort((a, b) => b.at.localeCompare(a.at));

  // 불량·설비
  const defectSum = q.defects.reduce((s, x) => s + x.value, 0);
  const topDefect = q.defects[0]!;
  const top2Share = Math.round((((q.defects[0]?.value ?? 0) + (q.defects[1]?.value ?? 0)) / Math.max(1, defectSum)) * 100);
  const stdTask = d.tasks.find((t) => t.status !== "done" && /검사 기준/.test(t.title));
  const eqOn = q.equipment.find((e) => e.label === "가동")?.value ?? 0;
  const eqDown = q.equipment.filter((e) => e.label !== "가동");

  // 클레임·8D
  const claim = d.claims.find((c) => c.status === "open");
  const openClaims = d.claims.filter((c) => c.status === "open").length;
  const claimProject = d.projects.find((p) => p.code === "QUAL-CL03") ?? d.projects.find((p) => p.name.includes(claim?.no ?? "—"));
  const claimTasks = d.tasks.filter((t) => t.projectId === claimProject?.id).sort((a, b) => (a.status === "done" ? -1 : 0) - (b.status === "done" ? -1 : 0));
  const report8d = d.artifacts.find((a) => claim && a.title.includes(claim.no));
  const assignees = d.people.filter((p) => !p.field && p.platform !== "owner");

  return (
    <>
      <PageHead
        title="현장·품질"
        desc={<>고객 PPM·현장 등록·8D를 한 화면에서 봐요. 목표는 Single PPM(<span className="num">{q.target}</span> 미만)이에요.</>}
        actions={
          <>
            {canAssign && <Button icon={<UserCheck />} count={fieldNew.length} onClick={() => { setFilter("new"); document.getElementById("field-list")?.scrollIntoView({ behavior: "smooth" }); }}>배정할 등록</Button>}
            <Button icon={<FileText />} onClick={() => nav("/docs")}>8D 보고서</Button>
            <Button variant="dark" icon={<PlusCircle />} onClick={() => nav("/report")}>현장 등록</Button>
          </>
        }
      />

      <div className="grid g-12">
        {/* KPI 4장(FinSight 왼쪽 위 2×2) */}
        <div className="s-6 ql-kpis">
          <KpiCard icon={<ScanSearch />} hue="coral" label="고객 PPM" value={ppmNow.value} unit="PPM"
            delta={<Delta value={`${ppmPrev.value - ppmNow.value}`} dir="down" good />}
            foot={<>목표 <span className="num">{q.target}</span> · {ppmPrev.month} <span className="num">{ppmPrev.value}</span>에서 줄었어요</>} />
          <KpiCard icon={<ClipboardList />} hue="orange" label="오늘 현장 등록" value={todayReports.length} unit="건"
            delta={<Delta value={diff === 0 ? "어제와 같음" : `${Math.abs(diff)}건`} dir={diff > 0 ? "up" : diff < 0 ? "down" : "flat"} good={diff > 0} />}
            foot={<>미배정 <span className="num">{fieldNew.length}</span>건 · 등록이 많을수록 좋아요</>} />
          <KpiCard icon={<Target />} hue="violet" label="진행 중 8D" value={openClaims} unit="건"
            delta={claim ? <Chip tone={daysLeft(claim.due, d.today) <= 7 ? "warn" : "neutral"} sm>{dday(claim.due, d.today)}</Chip> : undefined}
            foot={claim ? <>{claim.no} · D{claim.step} {D_STEPS[claim.step]}</> : "진행 중인 8D가 없어요"} />
          <KpiCard icon={<Cog />} hue="green" label="설비 가동" value={<>{eqOn}<span className="ql-of">/{q.equipmentTotal}</span></>} unit="대"
            delta={<Delta value={`${Math.round((eqOn / q.equipmentTotal) * 100)}%`} dir="flat" />}
            foot={eqDown.map((e) => `${e.label} ${e.value}`).join(" · ")} />
        </div>

        {/* 고객 PPM(FinSight 'Cost Forecast' 자리) */}
        <Card className="s-6" title="고객 PPM" sub="고객이 불량으로 판정한 수 ÷ 납품 수 × 100만"
          actions={<><PillSelect label="기간" value="6m" onChange={() => undefined} options={[{ value: "6m", label: "최근 6개월" }]} /><MoreButton /></>}>
          <div className="ql-ppm">
            <div className="ql-ppm__top">
              <div className="ql-big num">{ppmNow.value}<span>PPM</span></div>
              <Delta value={`${sixDrop}%`} dir="down" good />
              <span className="muted small">{ppmFirst.month} 대비</span>
              <span className="ql-ppm__legend">
                <span className="tagsq"><i style={{ background: "var(--brand)" }} />고객 PPM</span>
                <span className="tagsq ql-dash"><i />목표 {q.target}</span>
              </span>
            </div>
            <div className="ql-ppm__chart">
              <CapsuleBars data={q.ppm.map((p) => ({ label: p.month, value: p.value }))} max={PPM_MAX} height={PPM_H} highlight={q.ppm.length - 1}
                single={{ color: "var(--brand)", soft: "var(--brand-soft)" }} format={(v) => String(Math.round(v))}
                tipLabel={(x) => <><div style={{ opacity: 0.7 }}>{x.label}</div><b className="num">{x.value} PPM</b></>} />
              <div className="ql-target" aria-hidden style={{ top: 12 + (PPM_H - 40) * (1 - q.target / PPM_MAX) }} />
            </div>
            <div className="ql-forecast">
              <Sparkles aria-hidden />
              <span>지금 속도(한 달 <span className="num">−{Math.round(pace)}</span>)면 <b>{goalMonth}월</b>에 한 자릿수가 돼요</span>
              <span className="ql-forecast__r faint xs">추정 · 고객 정의 확인 전</span>
            </div>
          </div>
        </Card>

        {/* 불량 유형(눈금 막대) */}
        <Card className="s-4 ql-defectcard" title="불량 유형" sub="이번 달 공정 불량" actions={<PillSelect label="기간" value="m" onChange={() => undefined} options={[{ value: "m", label: "이번 달" }]} />}>
          <div className="ql-sum"><span className="ql-mid num">{defectSum}<span>건</span></span><span className="muted small">{topDefect.label}{josa(topDefect.label, "이", "가")} <b className="num">{Math.round((topDefect.value / defectSum) * 100)}%</b>로 가장 많아요</span></div>
          <ul className="ql-defects">
            {q.defects.map((x, i) => (
              <li key={x.label}>
                <span className="ql-defects__l">{x.label}</span>
                <TickBar value={x.value} max={topDefect.value * 1.1} color={i === 0 ? "var(--c-coral)" : "#f6a3a5"} label={`${x.label} ${x.value}건`} />
                <span className="ql-defects__v num">{x.value}</span>
              </li>
            ))}
          </ul>
          {stdTask && (
            <button type="button" className="ql-hint ql-hint--btn" onClick={() => nav("/tasks")}>
              <Sparkles aria-hidden />
              <span>{q.defects[0]!.label}·{q.defects[1]!.label}{josa(q.defects[1]!.label, "이", "가")} <b className="num">{top2Share}%</b>예요. ‘{stdTask.title}’에 기준을 넣는 중이에요.</span>
            </button>
          )}
        </Card>

        {/* 초중종물 실시율(Compliance pulse) */}
        <Card className="s-4" title="초중종물 실시율" sub="초·중·종 기록이 모두 있는 작업지시" actions={<MoreButton />}>
          <div className="ql-gauge">
            <Gauge value={q.inspectionRate} max={100} size={210} label={`${q.inspectionRate}%`} sub="이번 주"
              segments={[{ to: 0.5, color: "var(--c-orange)" }, { to: 0.75, color: "var(--c-amber)" }, { to: 0.9, color: "var(--c-green)" }, { to: 1, color: "var(--c-blue)" }]} />
          </div>
          <ul className="ql-pulse" aria-label="공정별 실시율(예시)">
            {FML_BY_LINE.map((l) => (
              <li key={l.name}>
                <span className="ellipsis">{l.name}</span>
                <span className="num faint small">{l.rate}%</span>
                <Chip tone={l.tone} sm>{l.note}</Chip>
              </li>
            ))}
          </ul>
        </Card>

        {/* 설비 상태 도넛 */}
        <Card className="s-4" title="설비 상태" sub={`전체 ${q.equipmentTotal}대 · 오늘 아침 기준`} actions={<MoreButton />}>
          <div className="ql-eq">
            <Donut data={q.equipment} size={176} thickness={22} center={<>{eqOn}<span className="ql-of">/{q.equipmentTotal}</span></>} sub="가동 중" />
            <ul className="ql-eq__legend">
              {q.equipment.map((e) => (
                <li key={e.label}><span className="tagsq"><i style={{ background: e.color }} />{e.label}</span><b className="num">{e.value}</b></li>
              ))}
            </ul>
          </div>
          <div className="ql-eq__down">
            {d.tasks.filter((t) => t.source === "field" && t.status !== "done" && /설비|편조기|프레스/.test(t.title + t.desc)).slice(0, 2).map((t) => (
              <button key={t.id} type="button" className="ql-eq__row" onClick={() => nav("/tasks")}>
                <Chip tone={t.status === "stuck" ? "bad" : "warn"} dot sm>{t.status === "stuck" ? "멈춤" : "점검 중"}</Chip>
                <span className="ellipsis">{t.title}</span>
                {t.blocker && <span className="faint xs ql-eq__why">{t.blocker}</span>}
              </button>
            ))}
          </div>
        </Card>

        {/* 현장 등록 표(Live Runs Stream) */}
        <Card className="s-12 ql-field" title={<span id="field-list">현장 등록</span>} sub={canAssign ? "추천 담당이 맞으면 '배정'만 누르세요" : "누가 받았는지 볼 수 있어요"} flush
          actions={<Segmented label="상태" size="sm" value={filter} onChange={setFilter} options={[
            { value: "all", label: "전체", n: d.fieldReports.length },
            { value: "new", label: "미배정", n: fieldNew.length },
            { value: "assigned", label: "배정됨" },
            { value: "done", label: "처리됨" },
          ]} />}>
          <div className="tablewrap">
            <table className="table ql-table">
              <thead><tr><th>종류</th><th>내용 · 위치</th><th>등록</th><th>상태</th><th>담당</th></tr></thead>
              <tbody>
                {rows.map((f) => {
                  const by = person(f.by), sug = person(f.suggested), asg = person(f.assignee);
                  const st = FIELD_STATUS[f.status];
                  return (
                    <tr key={f.id}>
                      <td><KindChip kind={f.kind} /></td>
                      <td>
                        <div className="cellmain__t ql-note" title={f.note}>{f.note}</div>
                        <div className="cellmain__s ql-place"><MapPin aria-hidden />{f.place}</div>
                      </td>
                      <td>
                        <div className="row" style={{ gap: 8 }}>
                          <Avatar name={by?.name ?? "?"} size="sm" />
                          <div style={{ minWidth: 0 }}><div className="ql-who ellipsis">{by?.name ?? "이름 없음"}</div><div className="faint xs num">{when(f.at, d.today)}</div></div>
                        </div>
                      </td>
                      <td><Chip tone={st.tone} dot sm>{st.label}</Chip></td>
                      <td>
                        {f.status === "new" ? (
                          canAssign ? (
                            <div className="ql-assign">
                              <span className="ql-assign__s"><span className="faint xs">추천</span><span className="ellipsis">{sug?.name ?? "—"}</span></span>
                              <Button size="sm" variant="soft" onClick={() => act.assignField(f.id)}>배정</Button>
                              <Menu align="right" width={220} trigger={({ toggle }) => <IconButton label="다른 사람에게 배정" size="sm" onClick={toggle}><ChevronDown /></IconButton>}>
                                {(close) => (
                                  <>
                                    <div className="menu__label">다른 사람에게 배정</div>
                                    {assignees.map((p) => (
                                      <button key={p.id} type="button" className="menu__item" onClick={() => { act.assignField(f.id, p.id); close(); }}>
                                        <Avatar name={p.name} size="sm" /><span><span style={{ display: "block", color: "var(--ink)" }}>{p.name}</span><span className="xs muted">{p.title}</span></span>
                                      </button>
                                    ))}
                                  </>
                                )}
                              </Menu>
                            </div>
                          ) : <span className="small muted">추천 {sug?.name}</span>
                        ) : (
                          <div className="row" style={{ gap: 8 }}><Avatar name={asg?.name ?? "?"} size="sm" /><span className="ellipsis small" style={{ maxWidth: 130 }}>{asg?.name}</span></div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!rows.length && <tr><td colSpan={5} className="muted small" style={{ textAlign: "center", padding: 28 }}>이 상태의 등록이 없어요</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>

        {/* 클레임·8D */}
        <Card className="s-8 ql-claimcard" title="클레임·8D" sub="고객 클레임은 D0~D8 단계로 따라가요" actions={<><Chip tone="outline" icon={<Lock />}>고객 비밀 L2</Chip><MoreButton /></>}>
          {claim ? (
            <div className="ql-claim">
              <div className="ql-claim__main">
                <div className="ql-claim__head">
                  <span className="ql-claim__no num">{claim.no}</span>
                  <Chip tone={claim.severity === "high" ? "bad" : claim.severity === "mid" ? "warn" : "neutral"} dot sm>심각도 {claim.severity === "high" ? "높음" : claim.severity === "mid" ? "보통" : "낮음"}</Chip>
                  <Chip tone="warn" icon={<Timer />} sm>8D 기한 {dday(claim.due, d.today)}</Chip>
                </div>
                <p className="ql-claim__meta">{claim.customer} · {claim.item} · <span className="num">{num(claim.qty)}</span>개 · 접수 {md(claim.received)} · 기한 {md(claim.due)}</p>
                <DSteps step={claim.step} />
                <p className="ql-claim__now"><b>지금 D{claim.step} {D_STEPS[claim.step]}</b> · 다음은 D{claim.step + 1} {D_STEPS[claim.step + 1]}이에요</p>
                <div className="ql-l2">
                  <Lock aria-hidden />
                  <span>고객 비밀(L2)이라 <b>AI 초안은 국내 경로가 열린 뒤에만</b> 써요. 그전까지는 사람이 쓰고, AI는 쓰지 않아요.</span>
                  <Chip tone="warn" sm>국내 경로 준비 중</Chip>
                </div>
              </div>
              <div className="ql-claim__side">
                <div className="ql-side__t">8D 할 일</div>
                <ul className="ql-todo">
                  {claimTasks.map((t) => (
                    <li key={t.id} className={t.status === "done" ? "is-done" : undefined}>
                      {t.status === "done" ? <CircleCheck className="ql-todo__ok" aria-label="완료" /> : <CircleDashed aria-label="진행 중" />}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="ql-todo__t ellipsis">{t.title}</div>
                        <div className="ql-todo__s">{t.status === "done" ? "완료" : t.status === "review" ? `검토 대기${t.submittedVia === "ai" ? ` · ${t.aiClient}로 제출` : ""}` : "진행 중"} · {person(t.assignee)?.name}</div>
                      </div>
                    </li>
                  ))}
                  {report8d && (
                    <li>
                      <CircleDashed aria-label="진행 중" />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="ql-todo__t ellipsis">{report8d.title} v{report8d.version}</div>
                        <div className="ql-todo__s">{report8d.status === "review" ? "검토 중" : report8d.status === "draft" ? "초안" : "확정"} · 수정 {report8d.corrections}번</div>
                      </div>
                    </li>
                  )}
                  <li className="is-next">
                    <span className="ql-todo__dot" aria-hidden />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="ql-todo__t ellipsis">D{claim.step + 1} {D_STEPS[claim.step + 1]} 정하기</div>
                      <div className="ql-todo__s">다음 단계 · 기한 {md(claim.due)}</div>
                    </div>
                  </li>
                </ul>
                <div className="row" style={{ gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                  <Button size="sm" icon={<FileText />} onClick={() => nav("/docs")}>8D 보고서 열기</Button>
                  <Button size="sm" variant="ghost" onClick={() => nav("/tasks")}>관련 업무</Button>
                </div>
              </div>
            </div>
          ) : <p className="muted small">진행 중인 클레임이 없어요.</p>}
          <div className="ql-past">
            {d.claims.filter((c) => c.status === "closed").map((c) => (
              <span key={c.id} className="ql-past__i"><Chip tone="good" dot sm>종결</Chip><span className="num">{c.no}</span><span className="faint ellipsis">{c.item}</span></span>
            ))}
          </div>
        </Card>
        {/* 이번 주 현장 등록(쌓은 캡슐 막대) */}
        <Card className="s-4 ql-weekcard" title="이번 주 현장 등록" sub="최근 7일 · 종류별" actions={<MoreButton />}>
          <div className="ql-sum"><span className="ql-mid num">{weekSum}<span>건</span></span><span className="muted small">하루 평균 <b className="num">{(weekSum / 7).toFixed(1)}</b>건</span></div>
          <WeekStack days={week} kinds={FIELD_KINDS} focus={week.length - 1} height={280} />
          <ul className="ql-wk__legend">
            {FIELD_KINDS.map((k) => <li key={k.id}><span className="tagsq"><i style={{ background: k.color }} />{k.label}</span><b className="num">{week.reduce((s, w) => s + w.values[k.id], 0)}</b></li>)}
          </ul>
          <p className="ql-hint"><Sparkles aria-hidden /><span>아차사고 <b className="num">{nearWeek}</b>건. 아차사고 신고는 많을수록 좋은 신호예요.</span></p>
        </Card>

      </div>
      <p className="faint xs" style={{ marginTop: 16, display: "flex", gap: 6, alignItems: "center" }}><Timer size={14} />숫자·사람·회사는 모두 예시 데이터예요. 공정별 초중종물 실시율은 화면 예시예요.</p>
    </>
  );
}

