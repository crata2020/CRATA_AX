// 구성원 · CRATA 화면 부품: refs/hope-hr-analytics.jpg('Analytic View' 점 목록 + 막대), refs/mediflex-doctors.jpg(프로필 칸 · 라벨/값 묶음)에서 가져왔어요.
// 개인 CRATA 값은 '배치 참고(placement)' 동의자만 그려요. 동의 안 함은 이름 옆 표시만, 미응시는 미응시로만.
import type { ReactNode } from "react";
import { Check, CircleAlert, Lock, Minus } from "lucide-react";
import type { ColorKey, Consent, Core, CrataProfile, Pair, Team, TeamEnv } from "@/lib/model";
import { CENTER, COLOR, CONF_SHORT, CORE, GROWTH, MOTIVE, THINK_SHORT } from "@/lib/model";
import { teamDistribution, type Fit, type World } from "@/lib/fit";
import { monthsBetween } from "@/lib/text";
import { Bar, Chip, StackBar, cx } from "@/ui";

// ───────── 작은 도우미
export const ymd = (d: string) => d.slice(0, 10).replace(/-/g, ".");
export const tenure = (joined: string, today: string) => {
  const m = Math.max(0, monthsBetween(joined, today));
  const y = Math.floor(m / 12), r = m % 12;
  return y ? (r ? `${y}년 ${r}개월` : `${y}년`) : `${r}개월`;
};
export const CORE_COLOR: Record<Core, string> = {
  check: "var(--c-blue)", execute: "var(--c-orange)", structure: "var(--c-violet)", mediate: "var(--c-amber)", explore: "var(--c-cyan)", own: "var(--c-green)",
};
export const fitColor = (score: number) => (score >= 75 ? "var(--c-green)" : score >= 55 ? "var(--c-amber)" : "var(--c-coral)");

export const CONSENT: Record<Consent, { label: string; long: string }> = {
  placement: { label: "배치 참고 동의", long: "배치 참고에 동의했어요. 인사이동·추천에 개인 결과를 참고해요." },
  self: { label: "동의 안 함", long: "결과는 본인만 봐요. 회사는 5명 이상 팀 분포에서 이름 없이 합계로만 봐요." },
  none: { label: "미응시", long: "검사에 응하지 않았어요. 불이익은 없어요." },
};
export function ConsentChip({ c }: { c: Consent }) {
  if (c === "placement") return <Chip tone="good" dot sm>{CONSENT.placement.label}</Chip>;
  if (c === "self") return <Chip tone="neutral" icon={<Lock />} sm>{CONSENT.self.label}</Chip>;
  return <Chip tone="outline" sm>{CONSENT.none.label}</Chip>;
}

export const Swatch = ({ k, label = true }: { k: ColorKey; label?: boolean }) => (
  <span className="pp-sw"><i style={{ background: COLOR[k].hex }} aria-hidden />{label && COLOR[k].label}</span>
);

/** 동의 안 함·미응시일 때 결과 자리에 놓는 문구(값은 절대 그리지 않아요) */
export function Locked({ c, compact }: { c: Consent; compact?: boolean }) {
  return (
    <span className={cx("pp-locked", compact && "pp-locked--compact")}>
      <Lock aria-hidden />{c === "self" ? "본인만 볼 수 있어요" : "CRATA 미응시"}
    </span>
  );
}

/** 카드·표에 들어가는 한 줄 요약(동의자만): 핵심역량 · 생각 정리 · 컴포트 색 */
export function CrataMini({ p, stacked }: { p: CrataProfile; stacked?: boolean }) {
  if (stacked) {
    return (
      <dl className="pp-mini">
        <div><dt>핵심역량</dt><dd className="ellipsis">{CORE[p.problem.core]}</dd></div>
        <div><dt>생각 정리</dt><dd className="ellipsis">{THINK_SHORT[p.relation.think.own]}</dd></div>
        <div><dt>컴포트</dt><dd><Swatch k={p.color.comfort} /></dd></div>
      </dl>
    );
  }
  return (
    <span className="pp-inline">
      <Chip tone="outline" sm><i className="pp-dot" style={{ background: CORE_COLOR[p.problem.core] }} aria-hidden />{CORE[p.problem.core]}</Chip>
      <span className="muted small">{THINK_SHORT[p.relation.think.own]}</span>
      <Swatch k={p.color.comfort} />
    </span>
  );
}

// ───────── 서랍: 적합도 7줄
const MARK = {
  good: { icon: <Check />, label: "맞아요", cls: "good" },
  mid: { icon: <Minus />, label: "보통", cls: "mid" },
  bad: { icon: <CircleAlert />, label: "달라요", cls: "bad" },
};
export function FitParts({ f }: { f: Fit }) {
  return (
    <ul className="pp-parts">
      {f.parts.map((x) => {
        const m = x.good === true ? MARK.good : x.good === null ? MARK.mid : MARK.bad;
        return (
          <li key={x.key}>
            <div className="between">
              <span className="pp-parts__l"><span className={`pp-mark pp-mark--${m.cls}`} aria-label={m.label} title={m.label}>{m.icon}</span>{x.label}</span>
              <span className="num small"><b>{x.got}</b><span className="faint"> / {x.max}</span></span>
            </div>
            <Bar value={(x.got / x.max) * 100} color={x.good === true ? "var(--c-green)" : x.good === null ? "var(--c-amber)" : "var(--c-coral)"} label={`${x.label} ${x.got}/${x.max}`} />
            <p className="pp-parts__t">{x.text}</p>
          </li>
        );
      })}
    </ul>
  );
}

// ───────── 서랍: CRATA 4종 결과(동의자만 호출)
const Cell = ({ k, sub, children }: { k: string; sub?: string; children: ReactNode }) => (
  <div className="pp-cell"><div className="pp-cell__k">{k}{sub && <span> · {sub}</span>}</div><div className="pp-cell__v">{children}</div></div>
);
function OwnNow<T extends string>({ pair, dict }: { pair: Pair<T>; dict: Record<T, string> }) {
  const same = pair.own === pair.now;
  return (
    <span className="pp-ownnow">
      <span>{dict[pair.own]}</span>
      {!same && <><span className="faint" aria-label="지금은">→</span><span>{dict[pair.now]}</span><Chip tone="warn" sm>지금 달라요</Chip></>}
    </span>
  );
}
export function CrataResult({ p }: { p: CrataProfile }) {
  return (
    <div className="pp-tests">
      <section className="pp-test">
        <header><span className="pp-test__n num">1</span><div><h4>색채검사</h4><p>겉으로 보이는 태도와 속마음, 지금 필요한 환경</p></div></header>
        <div className="pp-cells pp-cells--4">
          <Cell k="외면" sub="행동적 태도"><Swatch k={p.color.outer} /></Cell>
          <Cell k="내면" sub="심리적 태도"><Swatch k={p.color.inner} /></Cell>
          <Cell k="컴포트존" sub="지금 필요한 환경"><Swatch k={p.color.comfort} /></Cell>
          <Cell k="챌린지존" sub="지금 필요하지 않은 환경"><Swatch k={p.color.challenge} /></Cell>
        </div>
      </section>
      <section className="pp-test">
        <header><span className="pp-test__n num">2</span><div><h4>행동동기검사</h4><p>무엇이 있어야 시작하고, 오래 가는지 (고유 → 현재)</p></div></header>
        <div className="pp-cells">
          <Cell k="시작"><OwnNow pair={p.motive.start} dict={MOTIVE} /></Cell>
          <Cell k="지속"><OwnNow pair={p.motive.keep} dict={MOTIVE} /></Cell>
        </div>
      </section>
      <section className="pp-test">
        <header><span className="pp-test__n num">3</span><div><h4>문제해결방식검사</h4><p>중심을 잡아 주는 조건과 문제를 푸는 패턴</p></div></header>
        <div className="pp-cells pp-cells--4">
          <Cell k="중심역량"><span>{CENTER[p.problem.center]}</span></Cell>
          <Cell k="핵심역량"><span className="pp-core"><i className="pp-dot" style={{ background: CORE_COLOR[p.problem.core] }} aria-hidden />{CORE[p.problem.core]}</span></Cell>
          <Cell k="성장역량"><span>{GROWTH[p.problem.growth]}</span></Cell>
          <Cell k="잠재역량"><span>{p.problem.latent}</span></Cell>
        </div>
      </section>
      <section className="pp-test">
        <header><span className="pp-test__n num">4</span><div><h4>관계성장방식검사</h4><p>생각을 정리하는 방식과 자신감이 자라는 방식 (고유 → 현재)</p></div></header>
        <div className="pp-cells">
          <Cell k="생각 정리"><OwnNow pair={p.relation.think} dict={THINK_SHORT} /></Cell>
          <Cell k="자신감"><OwnNow pair={p.relation.conf} dict={CONF_SHORT} /></Cell>
        </div>
      </section>
    </div>
  );
}

// ───────── 팀 분포(5명 이상일 때만)
export function Distribution({ world, team }: { world: World; team: Team }) {
  const d = teamDistribution(world, team.id);
  if (!d.shown) {
    return (
      <div className="pp-hidden">
        <span className="pp-hidden__icon"><Lock /></span>
        <div className="pp-hidden__t">5명 미만이라 분포를 숨겼어요</div>
        <p>{team.name}에서 검사한 사람은 <b className="num">{d.n}</b>명이에요. 누가 어떤 결과인지 짐작할 수 없도록, 검사한 사람이 5명 이상인 팀만 분포를 보여 줘요.</p>
      </div>
    );
  }
  const cores = (Object.keys(CORE) as Core[]).map((k) => ({ k, n: d.core[k] ?? 0 })).sort((a, b) => b.n - a.n);
  const max = Math.max(1, ...cores.map((c) => c.n));
  const think = [{ label: THINK_SHORT.solo, value: d.think.solo ?? 0, color: "var(--c-blue)" }, { label: THINK_SHORT.together, value: d.think.together ?? 0, color: "var(--c-orange)" }];
  const conf = [{ label: CONF_SHORT.peer, value: d.conf.peer ?? 0, color: "var(--c-violet)" }, { label: CONF_SHORT.mixed, value: d.conf.mixed ?? 0, color: "var(--c-cyan)" }];
  const comfort = (Object.keys(COLOR) as ColorKey[]).map((k) => ({ k, n: d.comfort[k] ?? 0 })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
  return (
    <div className="pp-dist">
      <section>
        <h4 className="pp-h4">핵심역량<span className="faint"> · 문제를 푸는 패턴</span></h4>
        <ul className="pp-bars">
          {cores.map((c) => (
            <li key={c.k}>
              <span className="pp-bars__l ellipsis">{CORE[c.k]}</span>
              <span className="pp-bars__t"><i style={{ width: `${(c.n / max) * 100}%`, background: c.n ? CORE_COLOR[c.k] : "transparent" }} /></span>
              <span className="pp-bars__n num">{c.n}</span>
              <span className="pp-bars__need">{team.env.needs.includes(c.k) ? <Chip tone="brand" sm>팀에 필요</Chip> : null}</span>
            </li>
          ))}
        </ul>
      </section>
      <div className="pp-dist__two">
        <section>
          <h4 className="pp-h4">생각 정리</h4>
          <StackBar parts={think} label="생각 정리 방식 분포" />
          <ul className="pp-leg">{think.map((t) => <li key={t.label}><span className="tagsq"><i style={{ background: t.color }} />{t.label}</span><b className="num">{t.value}</b></li>)}</ul>
        </section>
        <section>
          <h4 className="pp-h4">자신감</h4>
          <StackBar parts={conf} label="자신감이 자라는 방식 분포" />
          <ul className="pp-leg">{conf.map((t) => <li key={t.label}><span className="tagsq"><i style={{ background: t.color }} />{t.label}</span><b className="num">{t.value}</b></li>)}</ul>
        </section>
      </div>
      <section>
        <h4 className="pp-h4">컴포트존<span className="faint"> · 지금 필요한 환경</span></h4>
        <div className="pp-comfort">
          {comfort.map((c) => <span key={c.k} className="pp-comfort__i"><Swatch k={c.k} /><b className="num">{c.n}</b></span>)}
        </div>
      </section>
    </div>
  );
}

// ───────── 팀 환경(model 어휘)
export function TeamEnvList({ env }: { env: TeamEnv }) {
  const chips = (xs: string[]) => <span className="pp-chips">{xs.map((x) => <Chip key={x} tone="outline" sm>{x}</Chip>)}</span>;
  return (
    <dl className="pp-env">
      <div><dt>환경 색</dt><dd><Swatch k={env.color} /><span className="muted small"> · {COLOR[env.color].env}</span></dd></div>
      <div><dt>시작 동기</dt><dd>{chips(env.starts.map((m) => MOTIVE[m]))}</dd></div>
      <div><dt>지속 동기</dt><dd>{chips(env.keeps.map((m) => MOTIVE[m]))}</dd></div>
      <div><dt>핵심역량</dt><dd>{chips(env.needs.map((c) => CORE[c]))}</dd></div>
      <div><dt>중심 조건</dt><dd>{chips(env.centers.map((c) => CENTER[c]))}</dd></div>
      <div><dt>생각 정리</dt><dd>{THINK_SHORT[env.think]}</dd></div>
      <div><dt>자신감</dt><dd>{CONF_SHORT[env.conf]}</dd></div>
    </dl>
  );
}
