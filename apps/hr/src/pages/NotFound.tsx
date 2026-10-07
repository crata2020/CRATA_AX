// 404: refs/fintech-invoicing-empty-state.jpg(뒤에 옅은 빈 표 뼈대 + 가운데 떠 있는 흰 카드: 제목 · 아이콘 줄 목록 · 흰 버튼 + 짙은 버튼)에서 가져왔어요.
import { useLocation, useNavigate } from "react-router";
import { ArrowLeft, BriefcaseBusiness, GitBranchPlus, House, ShieldCheck, Users } from "lucide-react";
import { Button, PageHead } from "@/ui";

const GO = [
  { to: "/moves", icon: <GitBranchPlus size={17} strokeWidth={1.8} />, t: "인사이동", s: "누구를 어디로 보낼지 적고, 조직도에서 확인해요" },
  { to: "/people", icon: <Users size={17} strokeWidth={1.8} />, t: "구성원 · CRATA", s: "동의 상태와 팀별 분포를 봐요" },
  { to: "/hiring", icon: <BriefcaseBusiness size={17} strokeWidth={1.8} />, t: "채용 공고", s: "지원자 검사와 면접 추천을 봐요" },
  { to: "/policy", icon: <ShieldCheck size={17} strokeWidth={1.8} />, t: "동의 · 보관", s: "결과를 쓰는 기준과 보관 기간이에요" },
];

export default function NotFound() {
  const nav = useNavigate();
  const loc = useLocation();
  return (
    <>
      <PageHead title="화면을 찾을 수 없어요" desc="주소가 바뀌었거나 없는 화면이에요." />
      <section className="card" style={{ position: "relative", overflow: "hidden", padding: "clamp(16px, 4vw, 40px)" }}>
        <div aria-hidden style={{ position: "absolute", inset: 0, padding: 24, display: "flex", flexDirection: "column", gap: 18, opacity: 0.7, pointerEvents: "none" }}>
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 16 }}>
              {Array.from({ length: 5 }, (_, j) => <span key={j} style={{ height: 10, borderRadius: 999, background: "var(--sunken)", opacity: i === 0 ? 1 : 0.7 - i * 0.07 }} />)}
            </div>
          ))}
        </div>
        <div style={{ position: "relative", maxWidth: 520, margin: "24px auto", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 20, boxShadow: "var(--shadow-pop)", padding: "clamp(20px, 4vw, 32px)" }}>
          <div className="num" style={{ fontSize: 44, lineHeight: "48px", fontWeight: 500, letterSpacing: "-0.03em", color: "var(--faint)" }}>404</div>
          <h2 style={{ fontSize: 20, lineHeight: "28px", fontWeight: 500, marginTop: 8 }}>이 주소에는 화면이 없어요</h2>
          <p className="muted small" style={{ marginTop: 4, overflowWrap: "anywhere" }}>
            <span className="num" style={{ color: "var(--ink-2)" }}>#{loc.pathname}</span> 대신 아래에서 골라 주세요.
          </p>
          <ul style={{ marginTop: 18 }}>
            {GO.map((g) => (
              <li key={g.to} style={{ borderTop: "1px solid var(--line)" }}>
                <button type="button" onClick={() => nav(g.to)} className="row" style={{ width: "100%", gap: 12, padding: "12px 4px", border: 0, background: "none", textAlign: "left", cursor: "pointer" }}>
                  <span style={{ width: 34, height: 34, borderRadius: 10, background: "var(--sunken)", color: "var(--ink-2)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{g.icon}</span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 14.5, fontWeight: 500, color: "var(--ink)" }}>{g.t}</span>
                    <span style={{ display: "block", fontSize: 12.5, color: "var(--muted)" }}>{g.s}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 18 }}>
            <Button block icon={<ArrowLeft />} onClick={() => nav(-1)}>이전으로</Button>
            <Button block variant="dark" icon={<House />} onClick={() => nav("/")}>인사 홈으로</Button>
          </div>
        </div>
      </section>
    </>
  );
}
