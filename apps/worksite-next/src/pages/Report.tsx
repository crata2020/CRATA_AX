// 현장 등록: refs/winx-add-product-form.jpg(번호 붙은 섹션 + 둥근 입력 + 점선 사진 상자 + 짙은 '등록') + refs/smart-home-security.jpg(파스텔 큰 타일, 켜진 타일 강조).
// 모바일 우선(06 입력 부담 점검): 종류 타일 한 번 → 한 줄(60자) → '등록하기' 한 번. 위치는 최근 공정·설비를 미리 골라 둠. 데스크톱은 가운데 720px.
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowRight, BellRing, Camera, Check, CheckCircle2, EyeOff, Factory, Inbox, MapPin, Plus, Send, X } from "lucide-react";
import { useApp } from "@/data/store";
import { when } from "@/data/format";
import type { FieldReport } from "@/data/types";
import { Avatar, Button, Card, Chip, Empty, IconButton, PageHead, Toggle, cx, type Tone } from "@/ui";
import { FIELD_KINDS, FIELD_ROUTE, KIND, NotManufacturing, josa, type FieldKind } from "./Quality.parts";
import "./Report.css";

const MAX = 60;
const PLACEHOLDER: Record<FieldKind, string> = {
  defect: "예: 크림핑 주름 간격 고르지 않음, 20개 분리",
  equipment: "예: 프레스 작업 중 이상 소음",
  nearmiss: "예: 지게차 후진 중 보행자와 가까이 지나감",
  other: "예: 가공동 출입문 옆 조명 꺼짐",
};

export default function Report() {
  const { d } = useApp();
  if (d.pack !== "manufacturing") return <NotManufacturing title="현장 등록" desc="불량·설비 이상·아차사고를 한 줄로 알려요" />;
  return <ReportView />;
}

function ReportView() {
  const { d, me, person, act } = useApp();
  const nav = useNavigate();
  const noteRef = useRef<HTMLInputElement>(null);

  // 최근 공정·설비: 내가 쓴 곳 먼저, 그다음 다른 사람 등록
  const places = useMemo(() => {
    const sorted = d.fieldReports.slice().sort((a, b) => (a.by === me.id ? 0 : 1) - (b.by === me.id ? 0 : 1) || b.at.localeCompare(a.at));
    return [...new Set(sorted.map((f) => f.place))].slice(0, 5);
  }, [d.fieldReports, me.id]);

  const [kind, setKind] = useState<FieldKind | null>(null);
  const [note, setNote] = useState("");
  const [place, setPlace] = useState(places[0] ?? "");
  const [custom, setCustom] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [anon, setAnon] = useState(false);
  const [sent, setSent] = useState<{ kind: FieldKind; to: string; note: string; anon: boolean } | null>(null);

  const ok = !!kind && note.trim().length > 0;
  const toPerson = kind ? person(FIELD_ROUTE[kind]) : undefined;
  const mine = d.fieldReports.filter((f) => f.by === me.id && f.at.startsWith(d.today)).sort((a, b) => b.at.localeCompare(a.at));

  const pick = (k: FieldKind) => {
    setKind(k); setSent(null);
    if (k !== "nearmiss") setAnon(false);
    requestAnimationFrame(() => noteRef.current?.focus());
  };
  const submit = () => {
    if (!kind || !note.trim()) return;
    act.addFieldReport(kind, note.trim(), place.trim() || "위치 없음");
    setSent({ kind, to: toPerson?.name ?? KIND[kind].to, note: note.trim(), anon: kind === "nearmiss" && anon });
    setKind(null); setNote(""); setPhoto(null); setAnon(false); setCustom(false);
  };

  return (
    <div className="rp">
      <PageHead
        title="현장 등록"
        desc="종류를 누르고 한 줄만 적으면 끝나요"
        actions={!me.field ? <Button icon={<Factory />} onClick={() => nav("/quality")}>현장·품질 보기</Button> : undefined}
      />

      <section className="card rp-form" aria-label="현장 등록">
        <div className="rp-step"><StepNo n={1} done={!!kind} />무엇을 알릴까요?</div>
        <div className="rp-tiles" role="group" aria-label="종류">
          {FIELD_KINDS.map((k) => {
            const on = kind === k.id;
            return (
              <button key={k.id} type="button" aria-pressed={on} className={cx("rp-tile", on && "is-on")} style={{ ["--k" as string]: k.color, ["--ks" as string]: k.soft }} onClick={() => pick(k.id)}>
                <span className={`rp-tile__icon tone-${k.hue}`}><k.Icon aria-hidden /></span>
                <span className="rp-tile__t">{k.label}</span>
                <span className="rp-tile__s">{k.sub}</span>
                {on && <span className="rp-tile__check"><Check aria-hidden /><span className="sr-only">선택됨</span></span>}
              </button>
            );
          })}
        </div>

        <div className="rp-step"><StepNo n={2} done={note.trim().length > 0} /><label htmlFor="rp-note">한 줄로 적어 주세요</label></div>
        <div className="rp-line">
          <input
            id="rp-note" ref={noteRef} className="rp-input" value={note} maxLength={MAX} autoComplete="off" enterKeyHint="send"
            placeholder={kind ? PLACEHOLDER[kind] : "무슨 일인지 한 줄로"} onChange={(e) => { setNote(e.target.value); if (sent) setSent(null); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }}
            aria-describedby="rp-count"
          />
          <span id="rp-count" className={cx("rp-count num", note.length >= MAX && "is-full")}>{note.length}/{MAX}</span>
        </div>

        <div className="rp-step rp-step--opt"><StepNo n={3} done={false} muted />위치 · 사진<span className="rp-opt">선택</span></div>
        <div className="rp-places" role="group" aria-label="위치(최근 공정·설비)">
          {places.map((p) => (
            <button key={p} type="button" className="rp-place" aria-pressed={!custom && place === p} onClick={() => { setCustom(false); setPlace(p); }}>
              <MapPin aria-hidden />{p}
            </button>
          ))}
          <button type="button" className="rp-place" aria-pressed={custom} onClick={() => { setCustom(true); setPlace(""); }}><Plus aria-hidden />직접 입력</button>
        </div>
        {custom && <input className="input rp-custom" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="예: 편조 · KN-21" aria-label="위치 직접 입력" maxLength={30} autoFocus />}

        <div className="rp-extras">
          <label className={cx("rp-photo", photo && "has-photo")}>
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => setPhoto(e.target.files?.[0]?.name ?? null)} />
            <span className="rp-photo__icon"><Camera aria-hidden /></span>
            <span className="rp-photo__txt">
              <span className="rp-photo__t">{photo ? "사진 1장 붙였어요" : "사진 찍기"}</span>
              <span className="rp-photo__s ellipsis">{photo ?? "있으면 받는 사람이 더 빨리 알아봐요"}</span>
            </span>
          </label>
          {photo && <IconButton label="사진 빼기" size="sm" onClick={() => setPhoto(null)}><X /></IconButton>}
        </div>

        {kind === "nearmiss" && (
          <div className="rp-anon">
            <span className="rp-anon__icon tone-violet"><EyeOff aria-hidden /></span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="rp-anon__t">이름 없이 올리기</div>
              <div className="rp-anon__s">아차사고는 누가 알렸는지보다 무슨 일이었는지가 중요해요</div>
            </div>
            <Toggle on={anon} onChange={setAnon} label="이름 없이 올리기" />
          </div>
        )}

        <div className="rp-submit">
          {sent ? (
            <div className="rp-sent" role="status">
              <CheckCircle2 aria-hidden />
              <div style={{ minWidth: 0 }}>
                <div className="rp-sent__t">등록했어요{sent.anon ? " · 이름 없이" : ""}</div>
                <div className="rp-sent__s">{sent.to}에게 바로 알렸어요. 아래 목록에서 진행을 볼 수 있어요.</div>
              </div>
            </div>
          ) : kind ? (
            <div className="rp-to">
              <Avatar name={toPerson?.name ?? KIND[kind].to} size="sm" />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="rp-to__t"><b>{toPerson?.name ?? KIND[kind].to}</b>에게 바로 가요</div>
                <div className="rp-to__s">{KIND[kind].label}{josa(KIND[kind].label, "은", "는")} {KIND[kind].to}{josa(KIND[kind].to, "이", "가")} 받아요</div>
              </div>
              <BellRing className="rp-to__bell" aria-hidden />
            </div>
          ) : (
            <ul className="rp-routes" aria-label="누가 받나요">
              <li><b>불량</b><ArrowRight aria-hidden />품질</li>
              <li><b>설비 이상</b><ArrowRight aria-hidden />공장장</li>
              <li><b>아차사고·기타</b><ArrowRight aria-hidden />총무</li>
            </ul>
          )}
          <Button variant="dark" size="lg" block icon={<Send />} disabled={!ok} onClick={submit}>등록하기</Button>
          {!ok && <p className="rp-help">{!kind ? "종류를 누르고 한 줄만 적어 주세요" : "한 줄만 적으면 등록할 수 있어요"}</p>}
        </div>
      </section>

      <Card className="rp-mine" title="오늘 내가 등록한 것" sub={mine.length ? `${mine.length}건 · 받은 사람이 확인하면 상태가 바뀌어요` : undefined}
        actions={mine.length ? <Chip tone="outline" sm><span className="num">{mine.length}</span>건</Chip> : undefined}>
        {mine.length ? (
          <ul className="rp-list">
            {mine.map((f) => {
              const k = KIND[f.kind];
              const st = statusOf(f, person(f.assignee ?? f.suggested)?.name);
              const fresh = !!sent && f.note === sent.note && f === mine[0];
              return (
                <li key={f.id} className={cx(fresh && "is-fresh")}>
                  <span className={`rp-list__icon tone-${k.hue}`}><k.Icon aria-hidden /></span>
                  <div className="rp-list__main">
                    <div className="rp-list__t">{f.note}</div>
                    <div className="rp-list__s"><span className="rp-list__k">{k.label}</span><span><MapPin aria-hidden />{f.place}</span><span className="num">{when(f.at, d.today)}</span></div>
                  </div>
                  <div className="rp-list__st">
                    <Chip tone={st.tone} dot sm>{st.label}</Chip>
                    <span className="faint xs ellipsis">{st.sub}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : <Empty icon={<Inbox />} title="오늘 등록한 것이 없어요">위에서 종류를 누르면 바로 시작해요</Empty>}
      </Card>
    </div>
  );
}

function StepNo({ n, done, muted }: { n: number; done: boolean; muted?: boolean }) {
  return <span className={cx("rp-step__n num", done && "is-done", muted && "is-muted")} aria-hidden>{done ? <Check /> : n}</span>;
}

function statusOf(f: FieldReport, who?: string): { label: string; tone: Tone; sub: string } {
  if (f.status === "done") return { label: "처리됨", tone: "good", sub: who ? `${who} 처리` : "" };
  if (f.status === "assigned") return { label: "확인 중", tone: "info", sub: who ? `${who} 담당` : "" };
  return { label: "접수됨", tone: "warn", sub: "담당 정하는 중" };
}
