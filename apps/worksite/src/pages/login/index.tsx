// 데모 시작 `/login` · H-06 · 깊이 B · 모듈 home-dashboard · 소유: home 그룹
// 시연할 회사(테넌트)와 인물(페르소나)을 고르고 들어갑니다. 2단계에서는 실제 로그인 화면이 되는 자리입니다.
// AppShell 없이 패널 틴트 바탕 가운데 960px. 회사 카드는 라디오 그룹(화살표 키로 이동), 인물은 라디오 목록.
import "../home/lib/home.css";
import { useRef, useState, type KeyboardEvent } from "react";
import { Link } from "react-router";
import { Button } from "antd";
import { CheckOutlined } from "@ant-design/icons";
import { DemoDataBadge, PageHeader, SectionCard } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { TENANTS, TENANT_ORDER, type TenantConfig, type TenantSlug } from "@/tenants";
import { labelOf } from "@/lib/status";
import { reloadWithBootParams } from "@/lib/url";

const PACK_LABEL: Record<string, string> = { manufacturing: "자동차 부품 제조 · 생산·품질", education_consulting: "교육·컨설팅 · 영업·교육" };

function describe(t: TenantConfig) {
  const packs = t.packs.map((p) => PACK_LABEL[p] ?? p).join(" · ");
  return `${packs} · 사업 ${t.businessStructure.length}개 · 사람 ${t.people.length}명`;
}

export default function LoginPage() {
  const { tenant: current, persona } = useWorksite();
  const [slug, setSlug] = useState<TenantSlug>(current.slug);
  const tenant = TENANTS[slug];
  const personas = tenant.people.filter((p) => p.persona);
  const [roleCode, setRoleCode] = useState<string>(slug === current.slug ? persona.roleCode : tenant.defaultPersona);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const pickTenant = (s: TenantSlug) => {
    setSlug(s);
    setRoleCode(s === current.slug ? persona.roleCode : TENANTS[s].defaultPersona);
  };
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = TENANT_ORDER.length;
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % n;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + n) % n;
    if (next < 0) return;
    e.preventDefault();
    const s = TENANT_ORDER[next]!;
    pickTenant(s);
    refs.current[s]?.focus();
  };
  const start = () => reloadWithBootParams({ tenant: slug, as: roleCode }, "#/");

  return (
    <div className="ws-bare">
      <main className="ws-bare__inner wh-login" id="main">
        <PageHeader
          title="CRATA 워크사이트 데모"
          description="모든 숫자와 사람은 예시예요. 실제 회사 값이 아니에요."
          meta={<DemoDataBadge variant="inline" />}
        />

        <section aria-labelledby="login-tenant">
          <h2 className="ws-t-title-card" id="login-tenant" style={{ marginBottom: 12 }}>어느 회사로 볼까요?</h2>
          <div className="wh-login__tenants" role="radiogroup" aria-labelledby="login-tenant">
            {TENANT_ORDER.map((s, i) => {
              const t = TENANTS[s];
              const on = s === slug;
              return (
                <button
                  key={s}
                  ref={(el) => { refs.current[s] = el; }}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  tabIndex={on ? 0 : -1}
                  className="wh-tenant"
                  onClick={() => pickTenant(s)}
                  onKeyDown={(e) => onKey(e, i)}
                >
                  <span className="wh-tenant__top">
                    <span className="wh-tenant__mono" style={{ background: t.theme.tokens.brand }} aria-hidden>{t.monogram}</span>
                    <span className="wh-tenant__name">{t.displayName}(예시)</span>
                    {on && <span className="wh-tenant__sel"><CheckOutlined aria-hidden />선택됨</span>}
                  </span>
                  <span className="wh-tenant__desc">{describe(t)}</span>
                  <span className="ws-t-caption">{t.profile.sourceNote}</span>
                </button>
              );
            })}
          </div>
        </section>

        <SectionCard title="누구로 볼까요?" demo={false} caption="역할마다 홈 화면과 할 수 있는 일이 달라져요. 나중에 상단 바에서 바꿀 수 있어요.">
          {/* 라디오 묶음은 div(목록 ul에 radiogroup 역할을 주면 li가 목록 항목 규칙을 어겨요) */}
          <div className="wh-personas" role="radiogroup" aria-label={`${tenant.displayName}에서 볼 인물`}>
            {personas.map((p) => {
              const role = tenant.roles.find((r) => r.code === p.roleCode);
              const checked = p.roleCode === roleCode;
              return (
                <label key={p.id} className={`wh-persona${checked ? " is-on" : ""}`}>
                    <input type="radio" name="persona" value={p.roleCode} checked={checked} onChange={() => setRoleCode(p.roleCode)} />
                    <span className="wh-persona__text">
                      <span className="wh-persona__name">{p.displayName}{p.roleCode === tenant.defaultPersona ? " · 추천" : ""}</span>
                      <span className="wh-persona__role">{role?.title ?? p.jobTitle} · {labelOf("platform_role", role?.platformRole ?? "member")}</span>
                    </span>
                </label>
              );
            })}
          </div>
        </SectionCard>

        <div className="wh-login__go">
          <span className="ws-t-caption">실제 로그인은 2단계에서 열려요.</span>
          {slug === current.slug && <Link className="wh-linkbtn" to="/">지금 보던 화면으로</Link>}
          <Button type="primary" size="large" onClick={start}>데모로 둘러보기</Button>
        </div>
      </main>
    </div>
  );
}
