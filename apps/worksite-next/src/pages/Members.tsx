// 구성원: refs/orbixcrm-team-members-grid.jpg(검색 + 필터 + 격자/목록 아이콘, 파스텔 배경 큰 사진 카드 + 이름 + 역할 점 칩 + ⋮),
// refs/mediflex-doctors.jpg(사람 카드 → 오른쪽 프로필·오늘 일정 상세)에서 가져왔어요.
// 리서치 10: ARA 개인 영역(체크인·대화·카드)은 이 화면에 절대 나오지 않아요.
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Bot, ClipboardCheck, Crown, LayoutGrid, List, ListTodo, Lock, Mail, MoreVertical, Search, Send, ShieldCheck, Smartphone, UserCog, UserPlus, Users,
} from "lucide-react";
import { useApp } from "@/data/store";
import { dday, md, when } from "@/data/format";
import type { AiConnection, Person, PlatformRole, Task } from "@/data/types";
import { Avatar, Button, Chip, Drawer, Empty, IconButton, KpiCard, Menu, PageHead, Segmented, Toggle, Track, type Hue, type Tone } from "@/ui";
import "./Members.css";

const ROLE: Record<PlatformRole, { label: string; tone: Tone; desc: string }> = {
  owner: { label: "소유자", tone: "dark", desc: "회사 계정·결제·데이터 등급을 정해요. 최종 결정권자예요." },
  admin: { label: "관리자", tone: "info", desc: "구성원 초대, 역할, 도구 연결, 도입 단계를 관리해요." },
  reviewer: { label: "검토자", tone: "brand", desc: "제출된 업무를 승인하거나 수정 요청해요. ‘완료’는 검토자가 웹에서 해요." },
  member: { label: "구성원", tone: "neutral", desc: "내 업무를 하고 제출해요. 각자의 AI로 제출까지 할 수 있어요." },
};
const STATUS: Record<Task["status"], { label: string; tone: Tone }> = {
  stuck: { label: "막힘", tone: "bad" }, todo: { label: "할 일", tone: "neutral" }, doing: { label: "진행 중", tone: "warn" }, review: { label: "검토 중", tone: "info" }, done: { label: "완료", tone: "good" },
};
const HUES: Hue[] = ["blue", "orange", "green", "violet", "amber", "cyan", "coral"];
const hueOf = (id: string) => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return HUES[h % HUES.length]!; };

function AiChip({ c }: { c?: AiConnection }) {
  if (!c || c.status === "off") return <Chip tone="outline" sm>AI 연결 안 함</Chip>;
  if (c.status === "invited") return <Chip tone="warn" sm dot>{c.client} 초대됨</Chip>;
  return <Chip tone="good" sm icon={<Bot />}>{c.client} 연결됨</Chip>;
}

export default function Members() {
  const { d, me, toast } = useApp();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [unit, setUnit] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [openId, setOpenId] = useState<string | null>(null);
  const [roles, setRoles] = useState(false);
  const [invite, setInvite] = useState(false);
  const [inv, setInv] = useState({ email: "", unit: d.people[0]?.unit ?? "", role: "member" as PlatformRole, ai: true });
  const isAdmin = me.platform === "owner" || me.platform === "admin";

  const units = useMemo(() => Array.from(new Set(d.people.map((p) => p.unit))), [d.people]);
  const stat = (p: Person) => ({
    now: d.tasks.filter((t) => t.assignee === p.id && t.status !== "done"),
    rev: d.tasks.filter((t) => t.reviewer === p.id && t.status === "review"),
    ai: d.aiConnections.find((c) => c.personId === p.id),
  });
  const list = d.people.filter((p) => (unit === "all" || p.unit === unit) && (!q.trim() || `${p.name} ${p.title} ${p.unit}`.toLowerCase().includes(q.trim().toLowerCase())));

  const connected = d.aiConnections.filter((c) => c.status === "connected").length;
  const invited = d.aiConnections.filter((c) => c.status === "invited").length;
  const reviewers = d.people.filter((p) => d.tasks.some((t) => t.reviewer === p.id && t.status !== "done"));
  const reviewLoad = d.people.map((p) => ({ p, n: d.tasks.filter((t) => t.reviewer === p.id && t.status === "review").length })).sort((a, b) => b.n - a.n)[0];
  const fieldN = d.people.filter((p) => p.field).length;
  const open = d.people.find((p) => p.id === openId);
  const os = open ? stat(open) : null;
  const proj = (id: string) => d.projects.find((p) => p.id === id)?.name ?? "";

  const sendInvite = () => {
    if (!/.+@.+\..+/.test(inv.email)) { toast("이메일 주소를 확인해 주세요"); return; }
    setInvite(false);
    toast(isAdmin ? `${inv.email}에 초대를 보냈어요` : "관리자에게 초대 요청을 보냈어요");
    setInv((v) => ({ ...v, email: "" }));
  };

  const personMenu = (p: Person) => (
    <Menu align="right" width={210} trigger={({ toggle }) => <IconButton label={`${p.name} 더보기`} size="sm" plain onClick={toggle}><MoreVertical /></IconButton>}>
      {(close) => (
        <>
          <button type="button" className="menu__item" onClick={() => { setOpenId(p.id); close(); }}><ListTodo />업무 보기</button>
          <button type="button" className="menu__item" onClick={() => { close(); toast(`${p.name}님에게 AI 연결 안내를 보냈어요`); }}><Bot />AI 연결 안내 보내기</button>
          <button type="button" className="menu__item" disabled={!isAdmin} style={isAdmin ? undefined : { opacity: .45, cursor: "not-allowed" }} onClick={() => { close(); setRoles(true); }}><UserCog />역할 바꾸기{!isAdmin && " (관리자)"}</button>
        </>
      )}
    </Menu>
  );

  return (
    <>
      <PageHead
        title="구성원"
        desc="함께 일하는 사람의 역할, 맡은 업무, AI 연결 상태예요."
        actions={<><Button icon={<ShieldCheck />} onClick={() => setRoles(true)}>역할·권한 안내</Button><Button icon={<Mail />} onClick={() => toast("AI 연결 안내를 아직 연결하지 않은 사람에게 보냈어요")}>AI 연결 안내</Button></>}
      />

      <div className="kpirow" style={{ marginBottom: "var(--gap)" }}>
        <KpiCard icon={<Users />} hue="brand" label="구성원" value={d.people.length} unit="명" foot={fieldN ? `현장 작업자 ${fieldN}명 포함` : `소속 ${units.length}곳`} />
        <KpiCard icon={<ClipboardCheck />} hue="blue" label="검토하는 사람" value={reviewers.length} unit="명" foot="지금 업무의 검토자로 지정됨" />
        <KpiCard icon={<Bot />} hue="cyan" label="AI 연결" value={connected} unit="명" foot={invited ? `초대 대기 ${invited}명` : "모두 응답했어요"} />
        <KpiCard icon={<Crown />} hue="orange" label="검토 대기 가장 많음" value={reviewLoad?.n ?? 0} unit="건" foot={reviewLoad && reviewLoad.n ? reviewLoad.p.name : "몰린 사람이 없어요"} />
      </div>

      <div className="toolbar mb-toolbar">
        <label className="search mb-search">
          <Search aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름·직책 검색" aria-label="구성원 검색" />
        </label>
        <Segmented label="소속" size="sm" value={unit} onChange={setUnit} options={[{ value: "all", label: "전체", n: d.people.length }, ...units.map((u) => ({ value: u, label: u, n: d.people.filter((p) => p.unit === u).length }))]} />
        <span className="toolbar__spacer" />
        <Track label="보기" value={view} onChange={setView} options={[{ value: "grid", label: "카드", icon: <LayoutGrid /> }, { value: "list", label: "목록", icon: <List /> }]} />
        <Button variant="dark" icon={<UserPlus />} onClick={() => setInvite(true)}>초대하기</Button>
      </div>

      <p className="mb-privacy"><Lock aria-hidden />ARA 기록(대화·체크인·일하는 방식 카드)은 여기에 나오지 않아요. 관리자도 볼 수 없어요.</p>

      {list.length === 0 ? (
        <div className="card"><Empty icon={<Search />} title="찾는 사람이 없어요">검색어나 소속을 바꿔 보세요</Empty></div>
      ) : view === "grid" ? (
        <div className="mb-grid">
          {list.map((p) => {
            const s = stat(p);
            return (
              <article key={p.id} className="mb-card">
                <div className={`mb-card__hero tone-${hueOf(p.id)}`}>
                  <Avatar name={p.name} size="xl" />
                  {p.id === me.id && <span className="mb-card__me">나</span>}
                  {p.field && <span className="mb-card__field"><Smartphone />현장</span>}
                </div>
                <div className="mb-card__body">
                  <div className="mb-card__head">
                    <div style={{ minWidth: 0 }}>
                      <h3 className="mb-card__name ellipsis">{p.name}</h3>
                      <div className="mb-card__sub ellipsis">{p.title} · {p.unit}</div>
                    </div>
                    {personMenu(p)}
                  </div>
                  <div className="mb-card__chips">
                    <Chip tone={ROLE[p.platform].tone} sm dot>{ROLE[p.platform].label}</Chip>
                    <AiChip c={s.ai} />
                  </div>
                  <div className="mb-card__stats">
                    <div><span className="num">{s.now.length}</span><small>지금 업무</small></div>
                    <div><span className="num">{s.rev.length}</span><small>검토 대기</small></div>
                  </div>
                  <Button size="sm" block icon={<ListTodo />} onClick={() => setOpenId(p.id)}>업무 보기</Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="card">
          <div className="tablewrap">
            <table className="table">
              <thead><tr><th>이름</th><th>소속</th><th>역할</th><th>AI 연결</th><th className="r">지금 업무</th><th className="r">검토 대기</th><th className="r" aria-label="동작" /></tr></thead>
              <tbody>
                {list.map((p) => {
                  const s = stat(p);
                  return (
                    <tr key={p.id}>
                      <td><div className="cellmain"><Avatar name={p.name} /><div style={{ minWidth: 0 }}><div className="cellmain__t" style={{ whiteSpace: "nowrap" }}>{p.name}{p.id === me.id && <span className="mb-me-inline">나</span>}</div><div className="cellmain__s" style={{ whiteSpace: "nowrap" }}>{p.title}</div></div></div></td>
                      <td style={{ whiteSpace: "nowrap" }}>{p.unit}{p.field && <span className="faint xs"> · 현장</span>}</td>
                      <td><Chip tone={ROLE[p.platform].tone} sm dot>{ROLE[p.platform].label}</Chip></td>
                      <td><AiChip c={s.ai} /></td>
                      <td className="r num">{s.now.length}</td>
                      <td className="r num">{s.rev.length}</td>
                      <td className="r"><Button size="sm" onClick={() => setOpenId(p.id)}>업무 보기</Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 사람 상세(업무만, ARA 정보 없음) */}
      <Drawer open={!!open} title={open?.name ?? ""} onClose={() => setOpenId(null)} foot={
        <>
          <Button onClick={() => setOpenId(null)}>닫기</Button>
          <Button variant="brand" icon={<ListTodo />} onClick={() => nav("/tasks")}>{open?.id === me.id ? "내 업무 화면으로" : "업무 화면 열기"}</Button>
        </>
      }>
        {open && os && (
          <>
            <div className="mb-prof">
              <Avatar name={open.name} size="xl" />
              <div style={{ minWidth: 0 }}>
                <div className="mb-prof__n">{open.name}</div>
                <div className="muted small">{open.title} · {open.unit}</div>
                <div className="row" style={{ gap: 6, marginTop: 8, flexWrap: "wrap" }}><Chip tone={ROLE[open.platform].tone} sm dot>{ROLE[open.platform].label}</Chip><AiChip c={os.ai} /></div>
              </div>
            </div>
            <section>
              <h3 className="mb-sec">지금 맡은 업무 <span className="num faint">{os.now.length}</span></h3>
              {os.now.length ? (
                <ul className="list">
                  {os.now.map((t) => (
                    <li key={t.id}>
                      <div className="list__main"><div className="list__t ellipsis">{t.title}</div><div className="list__s ellipsis">{proj(t.projectId)} · {md(t.due)} 마감</div></div>
                      <Chip tone={t.due <= d.today ? "warn" : "outline"} sm>{dday(t.due, d.today)}</Chip>
                      <Chip tone={STATUS[t.status].tone} sm dot>{STATUS[t.status].label}</Chip>
                    </li>
                  ))}
                </ul>
              ) : <p className="muted small">지금 맡은 업무가 없어요.</p>}
            </section>
            <section>
              <h3 className="mb-sec">검토할 제출 <span className="num faint">{os.rev.length}</span></h3>
              {os.rev.length ? (
                <ul className="list">
                  {os.rev.map((t) => (
                    <li key={t.id}>
                      <div className="list__main"><div className="list__t ellipsis">{t.title}</div><div className="list__s ellipsis">{d.people.find((x) => x.id === t.assignee)?.name} · {t.submittedAt ? when(t.submittedAt, d.today) : ""}{t.submittedVia === "ai" ? ` · ${t.aiClient}로 제출` : ""}</div></div>
                      {t.submittedVia === "ai" && <Chip tone="info" sm icon={<Bot />}>AI 제출</Chip>}
                    </li>
                  ))}
                </ul>
              ) : <p className="muted small">검토할 제출이 없어요.</p>}
            </section>
            <section>
              <h3 className="mb-sec">AI 연결</h3>
              {os.ai && os.ai.status === "connected" ? (
                <div className="mb-ai">
                  <div className="between"><span className="strong">{os.ai.client}</span><span className="xs muted">마지막 사용 {os.ai.lastUsed ? when(os.ai.lastUsed, d.today) : "-"} · 이번 주 <span className="num">{os.ai.weekCalls}</span>번</span></div>
                  <div className="row" style={{ gap: 6, flexWrap: "wrap", marginTop: 8 }}>{os.ai.scopes.map((s) => <Chip key={s} tone="outline" sm>{s}</Chip>)}</div>
                  <p className="xs muted" style={{ marginTop: 8 }}>AI는 제출까지만 해요. 완료는 검토자가 웹에서 해요.</p>
                </div>
              ) : <p className="muted small">{os.ai?.status === "invited" ? "초대를 보냈고 아직 연결 전이에요." : "아직 연결하지 않았어요."}</p>}
            </section>
            <p className="mb-privacy mb-privacy--box"><Lock aria-hidden />이 사람의 ARA 기록은 본인만 볼 수 있어요. 회사에는 10명 이상 모였을 때 집계만 가고, 인사평가에는 쓰지 않아요.</p>
          </>
        )}
      </Drawer>

      {/* 역할·권한 안내 */}
      <Drawer open={roles} title="역할·권한" onClose={() => setRoles(false)} foot={<Button onClick={() => setRoles(false)}>닫기</Button>}>
        <ul className="mb-roles">
          {(Object.keys(ROLE) as PlatformRole[]).map((r) => (
            <li key={r}>
              <Chip tone={ROLE[r].tone} sm dot>{ROLE[r].label}</Chip>
              <p>{ROLE[r].desc}</p>
              <span className="xs faint num">{d.people.filter((p) => p.platform === r).length}명</span>
            </li>
          ))}
        </ul>
        {!isAdmin && <p className="muted small">역할은 관리자만 바꿀 수 있어요.</p>}
        <p className="mb-privacy mb-privacy--box"><Lock aria-hidden />어떤 역할도 다른 사람의 ARA 기록을 볼 수 없어요.</p>
      </Drawer>

      {/* 초대 */}
      <Drawer open={invite} title={isAdmin ? "구성원 초대" : "초대 요청"} onClose={() => setInvite(false)} foot={
        <>
          <Button onClick={() => setInvite(false)}>취소</Button>
          <Button variant="brand" icon={<Send />} onClick={sendInvite}>{isAdmin ? "초대 보내기" : "요청 보내기"}</Button>
        </>
      }>
        {!isAdmin && <p className="muted small">관리자가 확인한 뒤 초대해요.</p>}
        <label className="field"><span className="field__label">이메일</span><input className="input" type="email" value={inv.email} onChange={(e) => setInv({ ...inv, email: e.target.value })} placeholder="name@company.co.kr" /></label>
        <label className="field"><span className="field__label">소속</span>
          <select className="select" value={inv.unit} onChange={(e) => setInv({ ...inv, unit: e.target.value })}>{units.map((u) => <option key={u} value={u}>{u}</option>)}</select>
        </label>
        <div className="field">
          <span className="field__label">역할</span>
          <Segmented label="역할" size="sm" value={inv.role} onChange={(v) => setInv({ ...inv, role: v })} options={(["member", "reviewer", "admin"] as PlatformRole[]).map((r) => ({ value: r, label: ROLE[r].label }))} />
          <span className="xs muted">{ROLE[inv.role].desc}</span>
        </div>
        <div className="between mb-opt">
          <div><div className="strong small">AI 연결 안내도 같이 보내기</div><div className="xs muted">Claude·ChatGPT 등 각자의 AI로 업무를 볼 수 있어요</div></div>
          <Toggle on={inv.ai} onChange={(v) => setInv({ ...inv, ai: v })} label="AI 연결 안내 같이 보내기" />
        </div>
        <p className="mb-privacy mb-privacy--box"><Lock aria-hidden />초대받은 사람의 ARA는 본인만 봐요. 회사는 볼 수 없어요.</p>
      </Drawer>
    </>
  );
}
