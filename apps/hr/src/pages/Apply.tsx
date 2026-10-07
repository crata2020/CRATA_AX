// 지원자 접수(Shell 밖, 모바일 우선): refs/winx-add-product-form.jpg — 섹션 제목(Product·Media·Pricing) + 둥근 알약 입력 + 두 칸 입력(Pricing/Sale Price)
// + 점선 파일 상자('Choose a file or drag & drop it here' + 'Browse File') + 오른쪽 'Hide this product' 체크와 작은 도움말 → 동의 체크·안내 글,
// 제목 줄의 짙은 'Add' → 맨 아래 '지원서 내기' 하나만 짙게. 데스크톱은 가운데 680px 한 줄(Orbix AI 홈처럼 차분하게).
// 법·신뢰: 사진·나이·가족·출신 지역·혼인·재산 칸 없음(채용절차법·연령차별 금지), [필수] 채용 목적 개인정보, [필수] CRATA 결과는 이 채용에만 + AI 추천 고지 + 설명 요청,
// [선택] 인재풀, 보관·파기(14~180일 중 회사가 정함, 예시 180일).
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { useParams } from "react-router";
import {
  Archive, ArrowRight, Ban, BriefcaseBusiness, Building2, Check, ChevronDown, CircleAlert, CircleCheck, CloudUpload, FileText, Minus, Plus,
  Send, ShieldCheck, Sparkles, X,
} from "lucide-react";
import { useApp } from "@/data/store";
import { COMPANY } from "@/data/seed";
import type { Applicant, Position } from "@/lib/model";
import { Button, Chip, Empty, IconButton, PageHead, cx } from "@/ui";
import { ApplicantFrame, NOT_ASKED, RETENTION_DAYS, Steps, daysLeft, ddayLabel, longDate } from "./Apply.parts";
import "./Apply.css";

export default function Apply() {
  const { id = "" } = useParams();
  const { positions } = useApp();
  const pos = positions.find((p) => p.id === id);
  if (!pos) {
    return (
      <ApplicantFrame back="#/hiring" step="지원서">
        <PageHead eyebrow={COMPANY.name} title="공고를 찾지 못했어요" desc="주소가 바뀌었거나 내려간 공고예요." />
        <section className="card"><Empty icon={<BriefcaseBusiness />} title="열린 공고가 아니에요"><a className="btn" href="#/hiring">채용 공고 보기</a></Empty></section>
      </ApplicantFrame>
    );
  }
  return <ApplyView key={pos.id} pos={pos} />;
}

// ───────── 입력 도우미
const fmtPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return d.length === 11 ? `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}` : `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
};
const maskPhone = (v: string) => { const d = v.replace(/\D/g, ""); return d.length >= 9 ? `${d.slice(0, 3)}-****-${d.slice(-4)}` : v; };
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const INTRO_MAX = 300;
const YEARS_MAX = 40;

type Agree = { privacy: boolean; crata: boolean; pool: boolean };

function ApplyView({ pos }: { pos: Position }) {
  const { team, today, addApplicant } = useApp();
  const t = team(pos.teamId);
  const left = daysLeft(pos.deadline, today);
  const closed = pos.status === "closed" || left < 0;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [years, setYears] = useState(0);
  const [lics, setLics] = useState<string[]>([]);
  const [lic, setLic] = useState("");
  const [shift, setShift] = useState<"" | "yes" | "no">("");
  const [intro, setIntro] = useState("");
  const [file, setFile] = useState<string | null>(null);
  const [agree, setAgree] = useState<Agree>({ privacy: false, crata: false, pool: false });
  const [tried, setTried] = useState(false);
  const [done, setDone] = useState<Applicant | null>(null);

  const digits = phone.replace(/\D/g, "");
  const err = {
    name: !name.trim() ? "이름을 적어 주세요" : "",
    phone: !digits ? "연락처를 적어 주세요" : digits.length < 9 ? "숫자 9~11자리로 적어 주세요" : "",
    email: email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? "메일 주소 형식을 확인해 주세요" : "",
    shift: pos.shift && !shift ? "교대 근무가 되는지 골라 주세요" : "",
    privacy: !agree.privacy ? "필수 동의예요" : "",
    crata: !agree.crata ? "필수 동의예요" : "",
  };
  const ORDER: { key: keyof typeof err; label: string; focus: string }[] = [
    { key: "name", label: "이름", focus: "ap-name" }, { key: "phone", label: "연락처", focus: "ap-phone" }, { key: "email", label: "이메일 형식", focus: "ap-email" },
    { key: "shift", label: "교대 근무", focus: "ap-shift-yes" }, { key: "privacy", label: "개인정보 동의", focus: "ap-ag-privacy" }, { key: "crata", label: "CRATA·AI 안내 동의", focus: "ap-ag-crata" },
  ];
  const missing = ORDER.filter((o) => err[o.key]);
  const show = (k: keyof typeof err) => (tried ? err[k] : "");

  const suggestions = [...new Set([...pos.mustLicenses, ...(t?.requires ?? [])])].filter((x) => !lics.includes(x));
  const addLic = (v = lic) => {
    const s = v.trim().slice(0, 30);
    if (!s || lics.includes(s) || lics.length >= 8) { setLic(""); return; }
    setLics((xs) => [...xs, s]);
    setLic("");
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (missing.length) {
      setTried(true);
      document.getElementById(missing[0]!.focus)?.focus();
      return;
    }
    const a: Applicant = {
      id: `a-new-${Date.now()}`, positionId: pos.id, name: name.trim(), appliedAt: today, source: "직접 지원",
      years, licenses: lics, shiftOk: pos.shift ? shift === "yes" : shift !== "no",
      summary: intro.trim() ? clip(intro.trim().replace(/\s+/g, " "), 80) : `${years ? `경력 ${years}년` : "경력 없음"} · 지원서로 직접 지원`,
      stage: "applied",
      ...(agree.pool ? { note: "인재풀 보관 동의(선택)" } : {}),
    };
    addApplicant(a);
    setDone(a);
    window.scrollTo(0, 0);
  };

  const s1 = !err.name && !err.phone && !err.email;
  const s2 = !err.shift && (shift !== "" || years > 0 || lics.length > 0);
  const s3 = intro.trim().length > 0 || !!file;
  const s4 = agree.privacy && agree.crata;

  const pageHead = (
      <PageHead
        eyebrow={<span className="ap-eyebrow"><Building2 aria-hidden />{COMPANY.name} · {t?.name}</span>}
        title={pos.title}
        desc={done ? "지원서를 받았어요. 다음 단계를 안내해 드릴게요." : "3분이면 써요. 사진·나이·가족 사항은 묻지 않아요."}
      />
  );
  const jobCard = (
      <section className="card ap-job" aria-label="공고 요약">
        <div className="ap-job__brief">
          <span className="ap-job__l">이런 분을 찾아요</span>
          <p>{pos.brief}</p>
        </div>
        <dl className="ap-facts">
          <div><dt>모집</dt><dd><span className="num">{pos.count}</span>명</dd></div>
          <div><dt>마감<Chip sm tone={closed ? "neutral" : left <= 5 ? "warn" : "outline"}><span className="num">{ddayLabel(left)}</span></Chip></dt><dd>{longDate(pos.deadline)}</dd></div>
          <div><dt>근무</dt><dd>{pos.shift ? "2교대" : "주간 · 교대 없음"}</dd></div>
          <div><dt>경력</dt><dd>{pos.minYears ? <><span className="num">{pos.minYears}</span>년 이상</> : "경력 없어도 돼요"}</dd></div>
        </dl>
        <Steps at={done ? 2 : 1} sub={done ? { 1: "받았어요", 2: "서류 확인 뒤 링크가 가요" } : undefined} />
      </section>
  );
  const head = <>{pageHead}{jobCard}</>;

  // ───────── 마감
  if (closed) {
    return (
      <ApplicantFrame back={`#/hiring/${pos.id}`} step="지원서">
        {head}
        <section className="card"><Empty icon={<BriefcaseBusiness />} title="마감된 공고예요">
          <span className="muted small">이 공고는 {longDate(pos.deadline)}에 마감했어요. 다른 공고가 열리면 다시 안내해요.</span>
        </Empty></section>
      </ApplicantFrame>
    );
  }

  // ───────── 접수 완료
  if (done) {
    return (
      <ApplicantFrame back={`#/hiring/${pos.id}`} step="2/3 · CRATA 검사 대기">
        {pageHead}
        <section className="card ap-done" aria-labelledby="ap-done-t" role="status">
          <span className="ap-done__ic" aria-hidden><CircleCheck /></span>
          <h2 id="ap-done-t" className="ap-done__t">{done.name} 님, 지원서를 받았어요</h2>
          <p className="ap-done__s">서류를 확인하면 CRATA 검사 링크를 보내 드려요. 문자로 가고, 이메일을 적었다면 메일로도 가요.</p>

          <dl className="ap-receipt">
            <div><dt>접수 번호</dt><dd className="num">N-{done.id.slice(-6)}</dd></div>
            <div><dt>지원 공고</dt><dd>{pos.title}</dd></div>
            <div><dt>접수일</dt><dd>{longDate(done.appliedAt)}</dd></div>
            <div><dt>연락처</dt><dd className="num">{maskPhone(phone)}</dd></div>
            <div><dt>인재풀 보관</dt><dd>{agree.pool ? <Chip sm tone="brand" dot>동의함</Chip> : <Chip sm dot>동의 안 함</Chip>}</dd></div>
          </dl>

          <ul className="ap-after">
            <li><ShieldCheck aria-hidden /><span>CRATA 검사 결과는 <b>이 채용 판단에만</b> 써요. 내 결과지도 따로 받아요.</span></li>
            <li><Sparkles aria-hidden /><span>AI는 면접 추천과 근거만 내요. <b>면접·합격은 담당자가 정해요.</b> 추천 근거가 궁금하면 설명을 요청할 수 있어요.</span></li>
            <li><Archive aria-hidden /><span>결과를 알려 드린 뒤 <b className="num">{RETENTION_DAYS}</b>일(예시) 동안 서류 반환을 청구할 수 있고, 그 뒤에는 파기해요.</span></li>
          </ul>

          <div className="ap-done__acts">
            <a className="btn btn--dark btn--lg" href={`#/test/${done.id}`}>CRATA 검사 미리 보기<ArrowRight aria-hidden /></a>
            <a className="btn btn--lg" href={`#/hiring/${pos.id}`}>회사 화면에서 확인</a>
          </div>
          <p className="ap-done__note">예시 화면이라 이 지원서는 지금 열린 화면 안에만 저장돼요. 새로고침하면 사라져요.</p>
        </section>
        {jobCard}
      </ApplicantFrame>
    );
  }

  // ───────── 지원서
  return (
    <ApplicantFrame back={`#/hiring/${pos.id}`} step="1/3 · 지원서">
      {head}

      <form className="card ap-form" onSubmit={submit} noValidate aria-label="지원서">
        {/* 1. 기본 정보 */}
        <section className="ap-sec" aria-labelledby="ap-s1">
          <h2 id="ap-s1" className="ap-sec__h"><StepNo n={1} done={s1} />기본 정보</h2>
          <Field id="ap-name" label="이름" req error={show("name")}>
            <input id="ap-name" className="ap-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} autoComplete="name" placeholder="홍길동"
              aria-invalid={!!show("name")} aria-describedby={show("name") ? "ap-name-err" : undefined} />
          </Field>
          <div className="ap-two">
            <Field id="ap-phone" label="연락처" req error={show("phone")} hint="검사 링크와 면접 안내를 문자로 보내요">
              <input id="ap-phone" className="ap-input num" type="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(fmtPhone(e.target.value))} autoComplete="tel"
                placeholder="010-0000-0000" aria-invalid={!!show("phone")} aria-describedby={show("phone") ? "ap-phone-err" : "ap-phone-hint"} />
            </Field>
            <Field id="ap-email" label="이메일" opt error={show("email")} hint="적으면 메일로도 받아요">
              <input id="ap-email" className="ap-input" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email"
                placeholder="name@example.com" aria-invalid={!!show("email")} aria-describedby={show("email") ? "ap-email-err" : "ap-email-hint"} />
            </Field>
          </div>
          <div className="ap-noask" role="note" aria-labelledby="ap-noask-t">
            <span className="ap-noask__ic tone-green" aria-hidden><ShieldCheck /></span>
            <div style={{ minWidth: 0 }}>
              <div id="ap-noask-t" className="ap-noask__t">이런 건 묻지 않아요</div>
              <ul className="ap-noask__list">{NOT_ASKED.map((x) => <li key={x}><Ban aria-hidden />{x}</li>)}</ul>
              <p className="ap-noask__s">채용절차법과 연령차별 금지 기준에 따라 받지 않아요. 이력서에 있다면 지우고 올려 주세요.</p>
            </div>
          </div>
        </section>

        {/* 2. 경력·자격 */}
        <section className="ap-sec" aria-labelledby="ap-s2">
          <h2 id="ap-s2" className="ap-sec__h"><StepNo n={2} done={s2} />경력과 자격</h2>
          <Field id="ap-years" label="관련 경력" hint={pos.minYears ? `이 공고는 ${pos.minYears}년 이상이에요. 모자라도 지원할 수 있어요` : "경력이 없으면 0으로 두세요"}>
            <div className="ap-stepper">
              <IconButton label="경력 1년 줄이기" onClick={() => setYears((y) => Math.max(0, y - 1))} disabled={years <= 0}><Minus /></IconButton>
              <div className="ap-stepper__v">
                <input id="ap-years" className="ap-input ap-input--num num" type="number" inputMode="numeric" min={0} max={YEARS_MAX} value={years}
                  onChange={(e) => setYears(Math.max(0, Math.min(YEARS_MAX, Math.floor(Number(e.target.value) || 0))))} aria-describedby="ap-years-hint" />
                <span className="ap-stepper__u" aria-hidden>년</span>
              </div>
              <IconButton label="경력 1년 늘리기" onClick={() => setYears((y) => Math.min(YEARS_MAX, y + 1))} disabled={years >= YEARS_MAX}><Plus /></IconButton>
            </div>
          </Field>

          <Field id="ap-lic" label="자격·교육" opt hint="자격증이나 이수한 교육을 하나씩 추가해요">
            <div className="ap-addrow">
              <input id="ap-lic" className="ap-input" value={lic} onChange={(e) => setLic(e.target.value)} maxLength={30} placeholder="예: 측정기 사용 교육" aria-describedby="ap-lic-hint"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); addLic(); } }} />
              <Button icon={<Plus />} onClick={() => addLic()} disabled={!lic.trim() || lics.length >= 8}>추가</Button>
            </div>
          </Field>
          {(lics.length > 0 || suggestions.length > 0) && (
            <div className="ap-lics">
              {lics.length > 0 && (
                <ul className="ap-lics__mine" aria-label="추가한 자격·교육">
                  {lics.map((l) => (
                    <li key={l} className="ap-tag"><Check aria-hidden />{l}
                      <button type="button" className="ap-tag__x" aria-label={`${l} 빼기`} onClick={() => setLics((xs) => xs.filter((x) => x !== l))}><X /></button>
                    </li>
                  ))}
                </ul>
              )}
              {suggestions.length > 0 && (
                <div className="ap-lics__sugg">
                  <span className="faint xs">이 팀에서 자주 보는 것</span>
                  {suggestions.map((s) => <button key={s} type="button" className="ap-sugg" onClick={() => addLic(s)}><Plus aria-hidden />{s}</button>)}
                </div>
              )}
            </div>
          )}

          <fieldset className="ap-field ap-fs" aria-describedby="ap-shift-hint">
            <legend className="ap-label">교대 근무{pos.shift ? <span className="ap-req">필수</span> : <span className="ap-opt">참고</span>}</legend>
            <div className="ap-choice">
              {([["yes", "가능해요"], ["no", "어려워요"]] as const).map(([v, l]) => (
                <span key={v} className="ap-choice__i">
                  <input type="radio" id={`ap-shift-${v}`} name="ap-shift" value={v} checked={shift === v} onChange={() => setShift(v)} />
                  <label htmlFor={`ap-shift-${v}`}>{shift === v && <Check aria-hidden />}{l}</label>
                </span>
              ))}
            </div>
            <span id="ap-shift-hint" className="ap-hint">{pos.shift ? "이 자리는 2교대예요. 어렵다고 해도 지원은 돼요" : "이 자리는 교대가 없어요. 다른 자리 안내에만 참고해요"}</span>
            {show("shift") && <span className="ap-err" role="alert"><CircleAlert aria-hidden />{show("shift")}</span>}
          </fieldset>
        </section>

        {/* 3. 자기소개·이력서 */}
        <section className="ap-sec" aria-labelledby="ap-s3">
          <h2 id="ap-s3" className="ap-sec__h"><StepNo n={3} done={s3} />자기소개<span className="ap-opt">선택</span></h2>
          <Field id="ap-intro" label="짧은 자기소개" hint="해 온 일과 이 자리에서 하고 싶은 일을 3~5줄이면 충분해요"
            right={<span className={cx("ap-count num", intro.length >= INTRO_MAX && "is-full")}>{intro.length}/{INTRO_MAX}</span>}>
            <textarea id="ap-intro" className="ap-input ap-textarea" rows={4} value={intro} maxLength={INTRO_MAX} onChange={(e) => setIntro(e.target.value)}
              placeholder="예: 부품 수입검사를 3년 했어요. 측정 기록을 꼼꼼히 남기는 편이에요." aria-describedby="ap-intro-hint" />
          </Field>
          <div className="ap-field">
            <span className="ap-label">이력서 파일<span className="ap-opt">선택</span></span>
            {file ? (
              <div className="ap-file is-on">
                <span className="ap-file__ic" aria-hidden><FileText /></span>
                <span className="ap-file__txt"><span className="ap-file__t ellipsis">{file}</span><span className="ap-file__s">붙였어요 · 사진·생년월일이 없는지 한 번 더 봐 주세요</span></span>
                <IconButton label="파일 빼기" size="sm" onClick={() => setFile(null)}><X /></IconButton>
              </div>
            ) : (
              <label className="ap-file" htmlFor="ap-file">
                <input id="ap-file" type="file" className="sr-only" accept=".pdf,.hwp,.hwpx,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0]?.name ?? null)} />
                <CloudUpload className="ap-file__up" aria-hidden />
                <span className="ap-file__t">파일을 골라 올려요</span>
                <span className="ap-file__s">PDF·HWP·DOCX, 10MB까지 · 없으면 건너뛰어도 돼요</span>
                <span className="btn btn--sm ap-file__btn" aria-hidden>파일 고르기</span>
              </label>
            )}
          </div>
        </section>

        {/* 4. 동의 */}
        <section className="ap-sec" aria-labelledby="ap-s4">
          <h2 id="ap-s4" className="ap-sec__h"><StepNo n={4} done={s4} />동의</h2>
          <Consents agree={agree} onChange={setAgree} errPrivacy={show("privacy")} errCrata={show("crata")} />
          <div className="ap-keep" role="note">
            <Archive aria-hidden />
            <p>
              <b>보관·파기</b> 채용이 끝나면 결과를 알려 드려요. 그 뒤 <b className="num">{RETENTION_DAYS}</b>일(예시) 동안 서류 반환을 청구할 수 있고, 기간이 지나면 지원서·이력서·검사 결과를 파기해요.
              기간은 회사가 <span className="num">14~180</span>일 안에서 정해요.
            </p>
          </div>
        </section>

        <div className="ap-submit">
          <p className={cx("ap-left", tried && missing.length > 0 && "is-bad")} aria-live="polite">
            {missing.length
              ? <span>남은 필수 항목 <b className="num">{missing.length}</b>개<span className="ap-left__list"> · {missing.map((m) => m.label).join(", ")}</span></span>
              : <><CircleCheck aria-hidden /><span>모두 채웠어요. 내면 바로 접수돼요</span></>}
          </p>
          <Button type="submit" variant="dark" size="lg" block icon={<Send />}>지원서 내기</Button>
        </div>
      </form>

      <p className="ap-foot">지원서는 {COMPANY.name} 인사 담당만 봐요. 동의는 언제든 철회할 수 있고, 철회해도 다른 불이익은 없어요.</p>
    </ApplicantFrame>
  );
}

// ───────── 부품
function StepNo({ n, done }: { n: number; done: boolean }) {
  return <span className={cx("ap-sec__n num", done && "is-done")} aria-hidden>{done ? <Check /> : n}</span>;
}

function Field({ id, label, req, opt, hint, error, right, children }: {
  id: string; label: string; req?: boolean; opt?: boolean; hint?: string; error?: string; right?: ReactNode; children: ReactNode;
}) {
  return (
    <div className="ap-field">
      <div className="ap-field__top">
        <label htmlFor={id} className="ap-label">{label}{req && <span className="ap-req">필수</span>}{opt && <span className="ap-opt">선택</span>}</label>
        {right}
      </div>
      {children}
      {error ? <span id={`${id}-err`} className="ap-err" role="alert"><CircleAlert aria-hidden />{error}</span>
        : hint ? <span id={`${id}-hint`} className="ap-hint">{hint}</span> : null}
    </div>
  );
}

const CONSENTS: { key: keyof Agree; req: boolean; title: string; rows: [string, ReactNode][] }[] = [
  {
    key: "privacy", req: true, title: "채용 목적 개인정보 수집·이용",
    rows: [
      ["받는 것", "이름, 연락처, 이메일(선택), 경력, 자격·교육, 교대 가능 여부, 자기소개, 이력서 파일"],
      ["쓰는 곳", "이 공고의 서류 확인, 검사 안내, 면접 연락"],
      ["보관", <>결과 안내 뒤 <span className="num">{RETENTION_DAYS}</span>일(예시)까지 보관하고 파기해요</>],
      ["거부하면", "필수 항목이라 지원서를 낼 수 없어요"],
    ],
  },
  {
    key: "crata", req: true, title: "CRATA 검사 결과 활용과 AI 추천 안내 확인",
    rows: [
      ["쓰는 곳", "검사 결과는 이 채용 판단에만 써요. 다른 공고나 입사 뒤 인사에 그대로 쓰지 않아요"],
      ["AI 추천", "AI가 결과를 팀 환경과 비교해 면접 추천과 근거를 내요. 채용 AI는 고영향 AI에 해당할 수 있어 미리 알려 드려요"],
      ["결정", "자동 탈락은 없어요. 면접 대상과 합격은 담당자가 정해요"],
      ["설명 요청", "추천 근거가 궁금하면 언제든 설명을 요청할 수 있어요. 내 결과지도 따로 받아요"],
    ],
  },
  {
    key: "pool", req: false, title: "불합격 뒤 인재풀 보관",
    rows: [
      ["보관", "지원서를 1년(예시) 보관하고, 맞는 자리가 열리면 먼저 연락해요"],
      ["거부하면", "이번 지원에는 아무 영향이 없어요. 결과 안내 뒤 정해진 기간에 파기해요"],
    ],
  },
];

function Consents({ agree, onChange, errPrivacy, errCrata }: { agree: Agree; onChange: (a: Agree) => void; errPrivacy: string; errCrata: string }) {
  const [open, setOpen] = useState<Partial<Record<keyof Agree, boolean>>>({});
  const uid = useId();
  const all = agree.privacy && agree.crata && agree.pool;
  const errs: Partial<Record<keyof Agree, string>> = { privacy: errPrivacy, crata: errCrata };
  return (
    <div className="ap-agree">
      <div className="ap-agree__all">
        <span className="ap-cb">
          <input type="checkbox" id="ap-ag-all" checked={all} onChange={(e) => onChange({ privacy: e.target.checked, crata: e.target.checked, pool: e.target.checked })} />
          <Check aria-hidden />
        </span>
        <label htmlFor="ap-ag-all">필수·선택 모두 동의해요</label>
      </div>
      <ul className="ap-agree__list">
        {CONSENTS.map((c) => {
          const panel = `${uid}-${c.key}`;
          const isOpen = !!open[c.key];
          return (
            <li key={c.key} className={cx("ap-agree__i", errs[c.key] && "is-bad")}>
              <div className="ap-agree__row">
                <span className="ap-cb">
                  <input type="checkbox" id={`ap-ag-${c.key}`} checked={agree[c.key]} onChange={(e) => onChange({ ...agree, [c.key]: e.target.checked })}
                    aria-invalid={!!errs[c.key]} aria-describedby={errs[c.key] ? `ap-ag-${c.key}-err` : undefined} />
                  <Check aria-hidden />
                </span>
                <label htmlFor={`ap-ag-${c.key}`} className="ap-agree__t">
                  <span className={cx("ap-agree__tag", c.req && "is-req")}>{c.req ? "필수" : "선택"}</span>{c.title}
                </label>
                <button type="button" className="ap-agree__more" aria-expanded={isOpen} aria-controls={panel} onClick={() => setOpen((o) => ({ ...o, [c.key]: !isOpen }))}>
                  자세히<ChevronDown aria-hidden />
                </button>
              </div>
              {errs[c.key] && <span id={`ap-ag-${c.key}-err`} className="ap-err ap-agree__err" role="alert"><CircleAlert aria-hidden />{errs[c.key]}</span>}
              <dl id={panel} className="ap-agree__dl" hidden={!isOpen}>
                {c.rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
              </dl>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
