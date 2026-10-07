// 앱 골격: 사이드바(회사 전환 카드 + 메뉴 + 도입 진행 카드), 상단 바(위치 · ARA에게 묻기 · 알림 · 누구로 보기), 모바일 하단 탭.
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import {
  Bell, Bot, Building2, ChevronDown, ChevronsUpDown, ClipboardCheck, Factory, FileText, FolderKanban, Home, LayoutGrid, Lock, Menu as MenuIcon,
  Mic, PlugZap, PlusCircle, Settings, Sparkles, Users, HeartHandshake,
} from "lucide-react";
import { useApp } from "@/data/store";
import { isOpen } from "@/data/phase";
import { Avatar, Bar, IconButton, Menu } from "@/ui";
import type { TenantData, TenantId } from "@/data/types";

interface NavDef { to: string; label: string; icon: JSX.Element; badge?: number; pack?: TenantData["pack"]; adminOnly?: boolean; lock?: boolean }

export const PAGE_TITLE: Record<string, [string, string?]> = {
  "/": ["홈"], "/tasks": ["내 업무", "업무"], "/projects": ["프로젝트", "업무"], "/meetings": ["회의", "업무"], "/docs": ["문서·학습", "업무"],
  "/quality": ["현장·품질", "현장"], "/report": ["현장 등록", "현장"], "/ai": ["AI 연결", "연결"], "/integrations": ["도구 연결", "연결"],
  "/company": ["회사 DNA", "회사"], "/members": ["구성원", "회사"], "/settings": ["설정", "회사"], "/ara": ["ARA", "나만 보여요"],
};

export function Shell() {
  const { d, me, approvals, setTenant, setPersona, tenant } = useApp();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [loc.pathname]);

  const myOpen = d.tasks.filter((t) => t.assignee === me.id && t.status !== "done").length;
  const pendingSeg = d.meetings.reduce((s, m) => s + m.segments.filter((x) => x.status === "pending" || x.status === "unclassified").length, 0);
  const ruleCand = d.rules.filter((r) => r.status === "candidate").length;
  const fieldNew = d.fieldReports.filter((f) => f.status === "new").length;
  const isAdmin = me.platform === "owner" || me.platform === "admin";

  const sections: { title: string; items: NavDef[] }[] = [
    { title: "메인", items: [
      { to: "/", label: "홈", icon: <Home /> },
      { to: "/tasks", label: "내 업무", icon: <ClipboardCheck />, badge: myOpen },
      { to: "/projects", label: "프로젝트", icon: <FolderKanban /> },
      { to: "/meetings", label: "회의", icon: <Mic />, badge: pendingSeg },
      { to: "/docs", label: "문서·학습", icon: <FileText />, badge: ruleCand },
    ] },
    { title: "현장", items: [
      { to: "/quality", label: "현장·품질", icon: <Factory />, badge: fieldNew, pack: "manufacturing" },
      { to: "/report", label: "현장 등록", icon: <PlusCircle />, pack: "manufacturing" },
    ] },
    { title: "연결", items: [
      { to: "/ai", label: "AI 연결", icon: <Bot /> },
      { to: "/integrations", label: "도구 연결", icon: <PlugZap /> },
    ] },
    { title: "회사", items: [
      { to: "/company", label: "회사 DNA", icon: <Building2 /> },
      { to: "/members", label: "구성원", icon: <Users /> },
      { to: "/settings", label: "설정", icon: <Settings />, adminOnly: true },
    ] },
  ];
  const visible = sections.map((s) => ({ ...s, items: s.items.filter((i) => (!i.pack || i.pack === d.pack) && (!i.adminOnly || isAdmin) && isOpen(d, i.to)) })).filter((s) => s.items.length);
  const done = d.rollout.steps.filter((s) => s.done).length;
  const [title, group] = PAGE_TITLE[loc.pathname] ?? ["", ""];

  const switchTenant = (t: TenantId) => { setTenant(t); nav("/"); };
  const allTabs = d.pack === "manufacturing"
    ? [{ to: "/", label: "홈", icon: <Home /> }, { to: "/tasks", label: "내 업무", icon: <ClipboardCheck />, n: myOpen }, { to: "/report", label: "현장 등록", icon: <PlusCircle />, main: true }, { to: "/meetings", label: "회의", icon: <Mic /> }, { to: "/ara", label: "ARA", icon: <HeartHandshake /> }]
    : [{ to: "/", label: "홈", icon: <Home /> }, { to: "/tasks", label: "내 업무", icon: <ClipboardCheck />, n: myOpen }, { to: "/meetings", label: "회의", icon: <Mic /> }, { to: "/docs", label: "문서", icon: <FileText /> }, { to: "/ara", label: "ARA", icon: <HeartHandshake /> }];
  const tabs = allTabs.filter((t) => isOpen(d, t.to));

  return (
    <div className="app">
      {open && <div className="scrim" style={{ zIndex: 25 }} onClick={() => setOpen(false)} />}
      <aside className={`side${open ? " open" : ""}`} aria-label="메뉴"><div className="side__in">
        <Menu width={238} trigger={({ toggle }) => (
          <button type="button" className="ws" onClick={toggle} aria-label="회사 바꾸기">
            <span className="ws__logo">{d.monogram}</span>
            <span style={{ minWidth: 0 }}><span className="ws__t ellipsis" style={{ display: "block" }}>{d.name}</span><span className="ws__s">{d.tagline}</span></span>
            <ChevronsUpDown />
          </button>
        )}>
          {(close) => (
            <>
              <div className="menu__label">회사 바꾸기(데모)</div>
              {(["tr", "crata"] as TenantId[]).map((t) => (
                <button key={t} type="button" className="menu__item" aria-current={tenant === t} onClick={() => { switchTenant(t); close(); }}>
                  <LayoutGrid />{t === "tr" ? `제조 · 첫 고객` : "교육·컨설팅 · CRATA"}
                </button>
              ))}
            </>
          )}
        </Menu>
        <nav>
          {visible.map((s) => (
            <div key={s.title} className="navsec">
              <div className="navsec__t">{s.title}</div>
              {s.items.map((i) => (
                <NavLink key={i.to} to={i.to} end={i.to === "/"} className={({ isActive }) => `navlink${isActive ? " active" : ""}`}>
                  {i.icon}{i.label}{i.badge ? <span className="navlink__n num">{i.badge}</span> : null}
                </NavLink>
              ))}
            </div>
          ))}
          {isOpen(d, "/ara") && <div className="navsec">
            <div className="navsec__t">복지</div>
            <NavLink to="/ara" className={({ isActive }) => `navlink${isActive ? " active" : ""}`}>
              <HeartHandshake />ARA<span className="navlink__lock"><Lock />나만 보여요</span>
            </NavLink>
          </div>}
        </nav>
        <div className="side__foot">
          <div className="promo">
            <div className="between"><span className="promo__t">도입 {d.rollout.stage === "phase1" ? "1단계" : "진행"}</span><span className="num small" style={{ fontWeight: 600 }}>{done}/{d.rollout.steps.length}</span></div>
            <p className="promo__s">목표: {d.rollout.goal}</p>
            <Bar value={(done / d.rollout.steps.length) * 100} label="도입 진행률" />
          </div>
        </div>
      </div></aside>

      <div className="main">
        <header className="top">
          <IconButton label="메뉴 열기" className="burger" onClick={() => setOpen(true)}><MenuIcon /></IconButton>
          <div className="top__crumb">{group && <span>{group} /</span>}{title}</div>
          <button type="button" className="ask" onClick={() => nav("/ara")} aria-label="검색하거나 ARA에게 물어보기">
            <Sparkles /><span>검색하거나 ARA에게 물어보기…</span><span className="ask__k">⌘K</span>
          </button>
          <div className="top__right">
            <span className="demo">예시 데이터</span>
            <IconButton label={`승인할 일 ${approvals.length}건`} round badge={approvals.length} onClick={() => nav("/")}><Bell /></IconButton>
            <Menu align="right" width={260} trigger={({ toggle }) => (
              <button type="button" className="me" onClick={toggle} aria-label="누구로 보기">
                <Avatar name={me.name} /><span className="me__txt"><span className="me__n" style={{ display: "block" }}>{me.name}</span><span className="me__r">{me.title}</span></span><ChevronDown />
              </button>
            )}>
              {(close) => (
                <>
                  <div className="menu__label">누구로 보기(데모)</div>
                  {d.people.filter((p) => p.persona).map((p) => (
                    <button key={p.id} type="button" className="menu__item" aria-current={p.id === me.id} onClick={() => { setPersona(p.id); close(); nav(p.field ? "/report" : "/"); }}>
                      <Avatar name={p.name} size="sm" /><span><span style={{ display: "block", color: "var(--ink)" }}>{p.name}</span><span className="xs muted">{p.title}</span></span>
                    </button>
                  ))}
                </>
              )}
            </Menu>
          </div>
        </header>
        <main className="content" id="main"><Outlet /></main>
      </div>

      <nav className="tabbar" aria-label="아래 탭" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.to === "/"} className={({ isActive }) => `${isActive ? "active" : ""}${"main" in t && t.main ? " tabbar__main" : ""}`}>
            {t.icon}{t.label}{"n" in t && t.n ? <span className="tabbar__n num">{t.n}</span> : null}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
