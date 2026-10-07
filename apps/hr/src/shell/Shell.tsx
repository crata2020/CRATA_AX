// 앱 골격(업무사이트와 같은 Orbix 문법): 흰 사이드바(회사 카드 + 메뉴 + 확정 대기 카드), 흰 상단 바, 모바일 하단 탭.
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { Bell, BriefcaseBusiness, ChevronDown, FileUser, GitBranchPlus, Home, Menu as MenuIcon, ShieldCheck, Sparkles, Users } from "lucide-react";
import { useApp } from "@/data/store";
import { COMPANY } from "@/data/seed";
import { Avatar, Bar, IconButton } from "@/ui";

export const PAGE_TITLE: Record<string, [string, string?]> = {
  "/": ["인사 홈"], "/moves": ["인사이동", "인사"], "/people": ["구성원 · CRATA", "인사"],
  "/hiring": ["채용 공고", "채용"], "/policy": ["동의 · 보관", "기준"],
};

export function Shell() {
  const { pending, positions, applicants } = useApp();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [loc.pathname]);

  const openPos = positions.filter((p) => p.status === "open");
  const waiting = applicants.filter((a) => openPos.some((p) => p.id === a.positionId) && (a.stage === "applied" || a.stage === "tested")).length;
  const key = "/" + (loc.pathname.split("/")[1] ?? "");
  const posId = loc.pathname.startsWith("/hiring/") ? loc.pathname.split("/")[2] : undefined;
  const [title, group] = posId ? [positions.find((p) => p.id === posId)?.title ?? "공고", "채용 공고"] : PAGE_TITLE[key] ?? ["찾는 화면이 없어요"];
  const tested = applicants.filter((a) => openPos.some((p) => p.id === a.positionId) && a.crata).length;
  const total = applicants.filter((a) => openPos.some((p) => p.id === a.positionId)).length;

  const link = (to: string, label: string, icon: JSX.Element, n?: number, live?: boolean) => (
    <NavLink to={to} end={to === "/"} className={({ isActive }) => `navlink${isActive ? " active" : ""}`}>
      {icon}{label}{n ? <span className={`navlink__n num${live ? " navlink__n--live" : ""}`}>{n}</span> : null}
    </NavLink>
  );

  return (
    <div className="app">
      {open && <div className="scrim" style={{ zIndex: 25 }} onClick={() => setOpen(false)} />}
      <aside className={`side${open ? " open" : ""}`} aria-label="메뉴"><div className="side__in">
        <div className="ws" role="group" aria-label="회사">
          <span className="ws__logo">{COMPANY.monogram}</span>
          <span style={{ minWidth: 0 }}><span className="ws__t ellipsis" style={{ display: "block" }}>{COMPANY.name}</span><span className="ws__s">{COMPANY.desc}</span></span>
        </div>
        <nav>
          <div className="navsec">
            <div className="navsec__t">인사</div>
            {link("/", "인사 홈", <Home />)}
            {link("/moves", "인사이동", <GitBranchPlus />, pending.length, true)}
            {link("/people", "구성원 · CRATA", <Users />)}
          </div>
          <div className="navsec">
            <div className="navsec__t">채용</div>
            {link("/hiring", "채용 공고", <BriefcaseBusiness />, waiting)}
            <a className="navlink" href={`#/apply/${openPos[0]?.id ?? "pos-qa"}`}><FileUser />지원자 화면<span className="navlink__lock">미리보기</span></a>
          </div>
          <div className="navsec">
            <div className="navsec__t">기준</div>
            {link("/policy", "동의 · 보관", <ShieldCheck />)}
          </div>
        </nav>
        <div className="side__foot">
          <div className="promo">
            <div className="between"><span className="promo__t">CRATA 검사 진행</span><span className="num small" style={{ fontWeight: 600 }}>{tested}/{total}</span></div>
            <p className="promo__s">열린 공고 {openPos.length}개 · 지원자 중 검사를 마친 사람</p>
            <Bar value={total ? (tested / total) * 100 : 0} label="검사 진행률" />
          </div>
        </div>
      </div></aside>

      <div className="main">
        <header className="top">
          <IconButton label="메뉴 열기" className="burger" onClick={() => setOpen(true)}><MenuIcon /></IconButton>
          <div className="top__crumb">{group && <span>{group} /</span>}{title}</div>
          <button type="button" className="ask" onClick={() => nav("/moves")} aria-label="ARA에게 인사이동 물어보기">
            <Sparkles /><span>ARA에게 물어보기 · "이하은 품질팀으로"</span><span className="ask__k">⌘K</span>
          </button>
          <div className="top__right">
            <span className="demo">예시 데이터</span>
            <IconButton label={`확정 전 이동 ${pending.length}건`} round badge={pending.length} onClick={() => nav("/moves")}><Bell /></IconButton>
            <div className="me" aria-label="로그인한 사람">
              <Avatar name="인사 담당" /><span className="me__txt"><span className="me__n" style={{ display: "block" }}>인사 담당(예시)</span><span className="me__r">구매·총무팀</span></span><ChevronDown />
            </div>
          </div>
        </header>
        <main className="content" id="main"><Outlet /></main>
      </div>

      <nav className="tabbar" aria-label="아래 탭" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}><Home />홈</NavLink>
        <NavLink to="/moves" className={({ isActive }) => (isActive ? "active" : "")}><GitBranchPlus />인사이동{pending.length ? <span className="tabbar__n num">{pending.length}</span> : null}</NavLink>
        <NavLink to="/people" className={({ isActive }) => (isActive ? "active" : "")}><Users />구성원</NavLink>
        <NavLink to="/hiring" className={({ isActive }) => (isActive ? "active" : "")}><BriefcaseBusiness />채용{waiting ? <span className="tabbar__n num">{waiting}</span> : null}</NavLink>
      </nav>
    </div>
  );
}
