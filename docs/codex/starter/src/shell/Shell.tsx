// 앱 틀(업무사이트·인사 앱과 같은 문법): 흰 사이드바(회사 카드 + 메뉴), 흰 상단 바, 모바일 하단 탭.
// 이 앱에 맞게 바꿀 곳은 COMPANY, ME, NAV, PAGE_TITLE 네 개예요. 나머지 마크업·클래스는 그대로 둬요.
import { useEffect, useState, type ReactNode } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { ChevronDown, Home, Menu as MenuIcon } from "lucide-react";
import { Avatar, IconButton } from "@/ui";

/** 사이드바 위 회사 카드(예시 회사). 실제 고객 이름은 넣지 않아요 */
const COMPANY = { monogram: "YJ", name: "예시정밀산업", desc: "자동차 부품 제조 · 47명" };
/** 상단 바 오른쪽 사람(예시) */
const ME = { name: "담당자(예시)", role: "인사팀" };

/** 메뉴: 묶음 제목 + 링크. tab이 있으면 모바일 하단 탭에도 나와요(4~5개까지) */
const NAV: { title: string; items: { to: string; label: string; icon: ReactNode; tab?: string }[] }[] = [
  { title: "메인", items: [{ to: "/", label: "홈", icon: <Home />, tab: "홈" }] },
];

/** 상단 바 위치 표시: [화면 이름, 묶음 이름] */
export const PAGE_TITLE: Record<string, [string, string?]> = {
  "/": ["홈"],
};

export function Shell() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [loc.pathname]);

  const key = "/" + (loc.pathname.split("/")[1] ?? "");
  const [title, group] = PAGE_TITLE[key] ?? ["찾는 화면이 없어요"];
  const tabs = NAV.flatMap((s) => s.items).filter((i) => i.tab);

  return (
    <div className="app">
      {open && <div className="scrim" style={{ zIndex: 25 }} onClick={() => setOpen(false)} />}
      <aside className={`side${open ? " open" : ""}`} aria-label="메뉴"><div className="side__in">
        <div className="ws" role="group" aria-label="회사">
          <span className="ws__logo">{COMPANY.monogram}</span>
          <span style={{ minWidth: 0 }}><span className="ws__t ellipsis" style={{ display: "block" }}>{COMPANY.name}</span><span className="ws__s">{COMPANY.desc}</span></span>
        </div>
        <nav>
          {NAV.map((s) => (
            <div key={s.title} className="navsec">
              <div className="navsec__t">{s.title}</div>
              {s.items.map((i) => (
                <NavLink key={i.to} to={i.to} end={i.to === "/"} className={({ isActive }) => `navlink${isActive ? " active" : ""}`}>{i.icon}{i.label}</NavLink>
              ))}
            </div>
          ))}
        </nav>
      </div></aside>

      <div className="main">
        <header className="top">
          <IconButton label="메뉴 열기" className="burger" onClick={() => setOpen(true)}><MenuIcon /></IconButton>
          <div className="top__crumb">{group && <span>{group} /</span>}{title}</div>
          <div className="top__right">
            <span className="demo">예시 데이터</span>
            <div className="me" aria-label="로그인한 사람">
              <Avatar name={ME.name} /><span className="me__txt"><span className="me__n" style={{ display: "block" }}>{ME.name}</span><span className="me__r">{ME.role}</span></span><ChevronDown />
            </div>
          </div>
        </header>
        <main className="content" id="main"><Outlet /></main>
      </div>

      <nav className="tabbar" aria-label="아래 탭" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
        {tabs.map((i) => <NavLink key={i.to} to={i.to} end={i.to === "/"} className={({ isActive }) => (isActive ? "active" : "")}>{i.icon}{i.tab}</NavLink>)}
      </nav>
    </div>
  );
}
