// 회의 화면 부품: 구간 타임라인(전체 띠 + 사업별 레인), 구간 줄(맞아요·고치기), 처리 단계 노드(Auralis), 회의 올리기 서랍.
import { useState, type CSSProperties, type ReactNode } from "react";
import {
  AlertCircle, Check, ChevronDown, CloudUpload, FileAudio, ListChecks, LoaderCircle, Lock, Mic, PenLine, Quote, Scissors, ShieldCheck, Sparkles, Tags, UserCheck,
} from "lucide-react";
import { useApp } from "@/data/store";
import type { BusinessLine, Meeting, Project, Segment, TenantData } from "@/data/types";
import { mmss } from "@/data/format";
import { Button, Chip, Drawer, Menu, cx, type Tone } from "@/ui";
import { useWidth } from "@/ui/charts";

type Vars = CSSProperties & Record<`--${string}`, string>;

export const lineOf = (d: TenantData, code: string | null | undefined) => (code ? d.lines.find((l) => l.code === code) : undefined);
export const softOf = (l?: BusinessLine) => (!l ? "var(--sunken)" : l.hue === "brand" ? "var(--brand-soft)" : `var(--c-${l.hue}-soft)`);
/** 구간의 프로젝트(사업을 고쳐서 맞지 않게 된 프로젝트는 빼요) */
export const segProject = (d: TenantData, s: Segment): Project | undefined => {
  const l = lineOf(d, s.lineCode);
  const p = s.projectId ? d.projects.find((x) => x.id === s.projectId) : undefined;
  return p && l && p.lineId === l.id ? p : undefined;
};
export const needsCheck = (s: Segment) => s.status === "pending" || s.status === "unclassified";

/** 상태 칩(글자 + 색) */
export function segState(s: Segment): { label: string; tone: Tone } {
  if (s.status === "confirmed" && !s.lineCode) return { label: "제외", tone: "neutral" };
  return { auto: { label: "자동 분류", tone: "info" as Tone }, confirmed: { label: "확정", tone: "good" as Tone }, pending: { label: "확인 필요", tone: "warn" as Tone }, unclassified: { label: "미분류", tone: "bad" as Tone } }[s.status];
}
/** 확신도 기준(리서치 02 · 5.3): 0.85↑ 직접 언급 / 0.60~0.84 맥락으로 추정 / 0.60↓ 근거 부족 */
export function confBand(c: number) {
  if (c >= 0.85) return { label: "직접 언급", color: "var(--c-green)" };
  if (c >= 0.6) return { label: "맥락으로 추정", color: "var(--c-amber)" };
  return { label: "근거 부족", color: "var(--c-coral)" };
}
const kindOf = (s: Segment) => (!s.lineCode ? "none" : needsCheck(s) ? "need" : "ok");

// ───────── 구간 타임라인: 위 띠 하나(회의 전체) + 사업별 레인(어디서 그 사업 이야기를 했는지) + 시간 축
export function Timeline({ d, m, focus, onPick }: { d: TenantData; m: Meeting; focus: string | null; onPick: (id: string) => void }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<string | null>(null);
  const total = Math.max(1, m.duration);
  const segs = [...m.segments].sort((a, b) => a.from - b.from);
  const pct = (v: number) => (v / total) * 100;
  // 눈금 간격: 트랙 폭에서 글자가 겹치지 않게(최소 54px)
  const px = (v: number) => (v / total) * (w || 600);
  const step = [5, 10, 15, 20, 30, 60].find((st) => px(st) >= 54) ?? 60;
  const ticks: number[] = [];
  for (let t = 0; t < total && px(total - t) >= 46; t += step) ticks.push(t);
  ticks.push(total);

  const lanes = [
    ...d.lines.filter((l) => segs.some((s) => s.lineCode === l.code)).map((l) => ({ key: l.code, line: l as BusinessLine | undefined, name: l.name })),
    ...(segs.some((s) => !lineOf(d, s.lineCode)) ? [{ key: "_none", line: undefined, name: "미분류" }] : []),
  ];
  const laneOf = (s: Segment) => (lineOf(d, s.lineCode) ? s.lineCode! : "_none");
  const hv = segs.find((s) => s.id === hover);
  const hvLine = hv ? lineOf(d, hv.lineCode) : undefined;
  const hvProj = hv ? segProject(d, hv) : undefined;

  return (
    <div className="mt-tl">
      <div className="mt-tl__row mt-tl__row--band">
        <div className="mt-tl__lab"><b>전체 회의</b><span className="faint xs num">{mmss(0)}–{mmss(total)}</span></div>
        <div className="mt-tl__track" ref={ref}>
          <div className="mt-band" role="group" aria-label="구간 띠. 누르면 그 구간으로 가요">
            {segs.map((s) => {
              const l = lineOf(d, s.lineCode);
              const st = segState(s);
              const k = kindOf(s);
              return (
                <button
                  key={s.id} type="button" className={cx("mt-blk", `is-${k}`, (focus === s.id || hover === s.id) && "is-on")}
                  style={{ left: `${pct(s.from)}%`, width: `${pct(s.to - s.from)}%`, "--c": l?.color ?? "#b9bac4", "--s": softOf(l) } as Vars}
                  aria-label={`${mmss(s.from)}부터 ${s.to - s.from}분 · ${l?.name ?? "미분류"} · ${s.topic} · ${st.label}`}
                  onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover(null)} onClick={() => onPick(s.id)}
                >
                  <span className="mt-blk__in">
                    <span className="mt-blk__t">{l?.name ?? "미분류"}</span>
                    <span className="mt-blk__m num">{s.to - s.from}분</span>
                    {k !== "ok" ? <span className="mt-blk__b mt-blk__b--need" aria-hidden><AlertCircle /></span> : s.status === "confirmed" ? <span className="mt-blk__b" aria-hidden><Check /></span> : null}
                  </span>
                </button>
              );
            })}
          </div>
          {hv && w > 0 && (
            <div className="tip mt-tip" style={{ left: Math.min(Math.max(((hv.from + hv.to) / 2 / total) * w, 120), w - 120), top: 0 }}>
              <div className="mt-tip__t">{hv.topic}</div>
              <div className="mt-tip__s num">{mmss(hv.from)}–{mmss(hv.to)} · {hv.to - hv.from}분</div>
              <div className="mt-tip__s">{hvLine ? `${hvLine.name}${hvProj ? ` › ${hvProj.name}` : ""}` : "어느 사업인지 몰라요"}</div>
              <div className="mt-tip__s num">확신 {Math.round(hv.confidence * 100)}% · {segState(hv).label}</div>
            </div>
          )}
        </div>
        <div className="mt-tl__val"><b className="num">{segs.length}</b>구간</div>
      </div>

      <div className="mt-tl__row mt-tl__row--axis">
        <div className="mt-tl__lab" />
        <div className="mt-tl__track"><div className="mt-axis" aria-hidden>{ticks.map((t, i) => <span key={t} className="num" style={{ left: `${pct(t)}%` }} data-edge={i === 0 ? "start" : i === ticks.length - 1 ? "end" : undefined}>{mmss(t)}</span>)}</div></div>
        <div className="mt-tl__val" />
      </div>

      <div className="mt-tl__lanes">
        {lanes.map((ln) => {
          const mine = segs.filter((s) => laneOf(s) === ln.key);
          const minutes = mine.reduce((a, s) => a + (s.to - s.from), 0);
          return (
            <div key={ln.key} className="mt-tl__row mt-tl__row--lane">
              <div className="mt-tl__lab"><span className="tagsq ellipsis"><i className={cx(!ln.line && "mt-hatch")} style={{ background: ln.line?.color }} />{ln.name}</span></div>
              <div className="mt-tl__track">
                <div className="mt-lane" role="img" aria-label={`${ln.name}: ${mine.map((s) => `${mmss(s.from)}~${mmss(s.to)}`).join(", ")}`}>
                  {mine.map((s) => (
                    <i key={s.id} className={cx(!ln.line && "is-none", (focus === s.id || hover === s.id) && "is-on")}
                      style={{ left: `calc(${pct(s.from)}% + 1px)`, width: `calc(${pct(s.to - s.from)}% - 2px)`, "--c": ln.line?.color ?? "#b9bac4" } as Vars}
                      onClick={() => onPick(s.id)} />
                  ))}
                </div>
              </div>
              <div className="mt-tl__val num"><b>{minutes}분</b> · {Math.round((minutes / total) * 100)}%</div>
            </div>
          );
        })}
      </div>

      <div className="mt-tl__key">
        <span><i className="mt-key mt-key--ok" />확정·자동</span>
        <span><i className="mt-key mt-key--need" />확인 필요</span>
        <span><i className="mt-key mt-key--none" />미분류</span>
        <span className="mt-tl__hint">띠를 누르면 그 구간으로 가요</span>
      </div>
    </div>
  );
}

// ───────── 구간 한 줄
export function SegmentRow({ d, s, on, onFocus, onOk, onFix }: {
  d: TenantData; s: Segment; on: boolean; onFocus: () => void; onOk: () => void; onFix: (code: string | null) => void;
}) {
  const l = lineOf(d, s.lineCode);
  const p = segProject(d, s);
  const st = segState(s);
  const cb = confBand(s.confidence);
  const need = needsCheck(s);
  const pc = Math.round(s.confidence * 100);
  const why = s.status === "unclassified" ? "근거가 부족해요. 어느 사업 이야기인지 골라 주세요"
    : s.status === "pending" ? (s.confidence >= 0.85 ? "확신은 높지만 담당 규칙과 달라서 한 번 확인해요" : "프로젝트 이름이 직접 나오지 않아 맥락으로 추정했어요") : null;
  return (
    <li id={`seg-${s.id}`} className={cx("mt-seg", need && "is-need", on && "is-on")} style={{ "--c": l?.color ?? "#b9bac4" } as Vars} onClick={onFocus}>
      <div className="mt-seg__time num"><b>{mmss(s.from)}</b><span>{mmss(s.to)}</span><em>{s.to - s.from}분</em></div>
      <div className={cx("mt-seg__rail", !l && "mt-hatch")} aria-hidden />
      <div className="mt-seg__main">
        <h3 className="mt-seg__topic">{s.topic}</h3>
        <div className="mt-seg__tags">
          {l ? (
            <span className="mt-line"><i style={{ background: l.color }} /><b>{l.name}</b>{p && <><span className="faint">›</span><span className="mt-line__p ellipsis">{p.name}</span></>}</span>
          ) : <span className="mt-line mt-line--none"><i className="mt-hatch" /><b>{s.status === "confirmed" ? "업무 밖 이야기" : "사업 고르기 전"}</b></span>}
        </div>
        <p className="mt-quote"><Quote aria-hidden />{s.quote}</p>
        {why && need && <p className="mt-why"><Sparkles aria-hidden />{why}</p>}
      </div>
      <div className="mt-seg__side" onClick={(e) => e.stopPropagation()}>
        <Chip tone={st.tone} dot sm>{st.label}</Chip>
        <div className="mt-conf" title={`확신 ${pc}% · ${cb.label}`}>
          <span className="mt-conf__top"><span className="mt-conf__k">확신</span><span className="num mt-conf__v">{pc}%</span></span>
          <span className="mt-conf__bar" aria-hidden><i style={{ width: `${pc}%`, background: cb.color }} /><b /></span>
          <span className="mt-conf__l">{cb.label}</span>
        </div>
        <div className="mt-seg__acts">
          {s.status === "pending" && <Button size="sm" variant="soft" icon={<Check />} onClick={onOk}>맞아요</Button>}
          <Menu align="right" width={248} trigger={({ toggle, open }) => (
            <Button size="sm" variant={need ? "default" : "ghost"} icon={s.status === "unclassified" ? <Tags /> : <PenLine />} onClick={toggle} aria-expanded={open} aria-haspopup="menu">
              {s.status === "unclassified" ? "사업 고르기" : "고치기"}<ChevronDown className="mt-caret" />
            </Button>
          )}>
            {(close) => (
              <>
                <div className="menu__label">어느 사업 이야기인가요?</div>
                {d.lines.map((x) => (
                  <button key={x.code} type="button" className="menu__item" aria-current={x.code === s.lineCode} onClick={() => { onFix(x.code); close(); }}>
                    <span className="tagsq" style={{ flex: 1 }}><i style={{ background: x.color }} />{x.name}</span>
                    {x.code === s.lineCode && <Check aria-label="지금 분류" />}
                  </button>
                ))}
                {!s.lineCode && (
                  <button type="button" className="menu__item" onClick={() => { onFix(null); close(); }}>
                    <span className="tagsq" style={{ flex: 1 }}><i className="mt-hatch" />업무와 무관 · 제외</span>
                  </button>
                )}
                <div className="mt-menu__foot">고친 분류는 다음 회의를 나눌 때 예시로 써요</div>
              </>
            )}
          </Menu>
        </div>
      </div>
    </li>
  );
}

// ───────── 처리 단계(Auralis 노드 흐름을 밝게): 녹음 → 전사·민감 정보 검사 → 구간 → 분류 → 추출 → 사람 확인
export function Pipeline({ m, need }: { m: Meeting; need: number }) {
  const lines = new Set(m.segments.map((s) => s.lineCode).filter(Boolean)).size;
  const steps: { t: string; s: string; icon: ReactNode }[] = [
    { t: "녹음 받기", s: m.source === "직접 업로드" ? "직접 올림" : `${m.source} 자동`, icon: <Mic /> },
    { t: "전사 · 민감 정보 검사", s: "L3는 먼저 걸러요", icon: <ShieldCheck /> },
    { t: "구간 나누기", s: m.segments.length ? `${m.segments.length}구간` : "나누는 중", icon: <Scissors /> },
    { t: "사업·프로젝트 분류", s: m.segments.length ? `사업 ${lines}개` : "대기", icon: <Tags /> },
    { t: "결정·액션 추출", s: m.segments.length ? `결정 ${m.decisions.length} · 액션 ${m.actions.length}` : "대기", icon: <ListChecks /> },
    { t: "사람 확인", s: m.status === "processing" ? "대기" : need ? `${need}건 남음` : "모두 확인", icon: <UserCheck /> },
  ];
  const cur = m.status === "processing" ? 2 : need > 0 ? 5 : 6;
  const state = (i: number) => (i < cur ? "is-done" : i === cur ? "is-cur" : "is-next");
  return (
    <>
      <ol className="mt-pipe" aria-label="처리 단계">
        {steps.map((x, i) => (
          <li key={x.t} className={cx("mt-pipe__s", state(i))} aria-current={i === cur ? "step" : undefined}>
            <span className="mt-pipe__dot">{i < cur ? <Check /> : i === cur && m.status === "processing" ? <LoaderCircle className="mt-spin" /> : x.icon}</span>
            <span className="mt-pipe__t">{x.t}</span>
            <span className="mt-pipe__sub">{i < cur ? x.s : i === cur ? (m.status === "processing" ? "지금 하는 중" : x.s) : x.s}</span>
          </li>
        ))}
      </ol>
      <div className="mt-pipe-m">
        <div className="between small"><span className="muted">처리 단계 <b className="num" style={{ color: "var(--ink)" }}>{Math.min(cur + 1, 6)}/6</b></span><span style={{ fontWeight: 500 }}>{cur < 6 ? steps[cur]!.t : "모두 끝났어요"}{cur < 6 && m.status !== "processing" ? ` · ${steps[cur]!.s}` : ""}</span></div>
        <div className="mt-pipe-m__bar" aria-hidden>{steps.map((x, i) => <i key={x.t} className={state(i)} />)}</div>
      </div>
    </>
  );
}

// ───────── 회의 올리기 서랍
export function UploadDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { d, toast } = useApp();
  const [file, setFile] = useState<string | null>(null);
  const recs = d.integrations.filter((i) => i.category === "회의 녹음");
  const close = () => { setFile(null); onClose(); };
  return (
    <Drawer open={open} title="회의 올리기" onClose={close} foot={
      <>
        <Button onClick={close}>닫기</Button>
        <Button variant="brand" icon={<CloudUpload />} disabled={!file} onClick={() => { toast("올렸어요. 구간을 나누면 알려 드릴게요"); close(); }}>올리기</Button>
      </>
    }>
      <section>
        <h3 className="mt-up__h">자동으로 올라와요</h3>
        <p className="muted small">연결된 녹음기는 녹음이 끝나면 따로 올리지 않아도 돼요.</p>
        <ul className="mt-up__src">
          {recs.map((i) => (
            <li key={i.id}>
              <span className="mt-up__mono" style={{ background: i.color }}>{i.mono}</span>
              <div style={{ flex: 1, minWidth: 0 }}><div className="list__t">{i.name}</div><div className="list__s">{i.desc}</div></div>
              {i.status === "connected" ? <Chip tone="good" dot sm>연결됨</Chip> : i.status === "available" ? <Chip tone="outline" sm>연결 전</Chip> : <Chip sm>예정</Chip>}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="mt-up__h">파일로 올리기</h3>
        <label className={cx("mt-drop", file && "is-on")}>
          <input type="file" accept="audio/*,.txt,.docx,.srt,.vtt" className="sr-only" onChange={(e) => setFile(e.target.files?.[0]?.name ?? null)} />
          <span className="mt-drop__ic"><FileAudio /></span>
          <span className="mt-drop__t">{file ?? "녹음 파일이나 전사본을 골라 주세요"}</span>
          <span className="faint xs">m4a · mp3 · wav · txt · docx · srt</span>
        </label>
        <p className="mt-up__tip"><Sparkles />제목 앞에 [강의] [품질] 같은 머리말을 붙이면 더 정확하게 나눠요.</p>
      </section>
      <section>
        <h3 className="mt-up__h">올리기 전에 확인해요</h3>
        <ul className="mt-guard">
          <li><span className="tone-coral"><Lock /></span><div><b>L3 민감 정보는 녹음하지 않아요</b><span>학생 식별 정보·상담 내용·건강 정보가 나오면 처리를 멈추고 지워요.</span></div></li>
          <li><span className="tone-amber"><ShieldCheck /></span><div><b>L2 고객 비밀은 국내 경로로만</b><span>고객 도면·클레임 자료는 해외 AI로 보내지 않아요.</span></div></li>
          <li><span className="tone-green"><Check /></span><div><b>L0·L1은 바로 나눠요</b><span>사내 회의는 구간 분할·분류·추출까지 자동이에요.</span></div></li>
        </ul>
      </section>
    </Drawer>
  );
}
