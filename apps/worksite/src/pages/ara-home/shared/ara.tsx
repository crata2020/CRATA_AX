// ARA(P 영역) 공용 도우미(소유: ara_settings 그룹). /ara · /ara/coach · /ara/privacy가 함께 씁니다.
// ARA 개인 데이터는 ara 공급자(dataProviderName "ara")에서만 읽고 씁니다. 회사 쪽은 복지 동의(본인 것만)와 공유 사본뿐이에요.
import { useState } from "react";
import { Link } from "react-router";
import { App, Button, Checkbox } from "antd";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { useWorksite } from "@/app/TenantBoundary";
import { useCreate, useInvalidate, useList, useUpdate } from "@/lib/refine";
import type { AraProfile, WellbeingConsent } from "@/types/entities";
import "../../admin-company/shared/as.css";

/** 내 ARA 상태: ara 공급자의 프로필 + 회사 쪽 복지 동의(본인 것만) */
export function useAraState() {
  const { persona } = useWorksite();
  const profile = useList<AraProfile>({ resource: "ara_profile", dataProviderName: "ara", pagination: { mode: "off" } });
  const consent = useList<WellbeingConsent>({
    resource: "wellbeing_consents", pagination: { mode: "off" },
    filters: [{ field: "member_id", operator: "eq", value: persona.memberId }],
  });
  const p = profile.result?.data?.[0];
  const c = consent.result?.data?.[0];
  return {
    profile: p,
    consent: c,
    /** 동의 상태: ARA 프로필 동의 + 회사 동의 기록이 살아 있음 */
    consented: !!p?.consented_at && !!c && !c.withdrawn_at,
    loading: profile.query.isLoading || consent.query.isLoading,
    error: profile.query.isError || consent.query.isError,
    refetch: () => { void profile.query.refetch(); void consent.query.refetch(); },
  };
}

/** 위기 안내(A-01·A-02 공통 문장, 전화 연결 링크) */
export function CrisisLine() {
  return (
    <p className="as-crisis-line" role="note">
      마음이 많이 힘들 때는 <a href="tel:109">109</a>(자살예방 상담전화, 24시간)에서 이야기를 들어줘요. 위급하면 <a href="tel:119">119</a>에 연락해 주세요.
    </p>
  );
}

/** 회사가 볼 수 있는 것 · 볼 수 없는 것(A-03, 동의 4단계) */
export const COMPANY_CAN: { text: string; sub?: string }[] = [
  { text: "내가 나누기로 고른 카드 문장 사본", sub: "팀이나 회사로 나누기로 고른 문장만 올라가요. '나만'으로 바꾸면 바로 내려가요." },
  { text: "10명 이상일 때 월 단위 집계", sub: "이용 인원, 진단 완료율, 카드 공유율만 봐요. 10명 미만이면 집계도 보이지 않아요." },
];
export const COMPANY_CANNOT: { text: string; sub?: string }[] = [
  { text: "진단 원점수와 결과" },
  { text: "ARA와 나눈 대화와 요약" },
  { text: "언제 ARA를 썼는지(개별 이용 시각)" },
  { text: "'나만'으로 둔 카드 문장" },
  { text: "누가 동의했는지·철회했는지", sub: "동의 기록은 본인만 볼 수 있어요." },
];

export function YesNoList({ items, kind, srPrefix }: { items: { text: string; sub?: string }[]; kind: "yes" | "no"; srPrefix?: string | null }) {
  const prefix = srPrefix === undefined ? (kind === "yes" ? "볼 수 있음: " : "볼 수 없음: ") : srPrefix;
  return (
    <ul className={`as-bullets as-bullets--${kind}`}>
      {items.map((it) => (
        <li key={it.text}>
          {kind === "yes" ? <CheckOutlined aria-hidden /> : <CloseOutlined aria-hidden />}
          <span>
            {prefix && <span className="ws-sr-only">{prefix}</span>}
            {it.text}
            {it.sub && <span className="as-bullets__sub">{it.sub}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

const STEPS: { title: string; body: string[]; check?: string }[] = [
  {
    title: "AI 안내",
    body: [
      "ARA는 AI가 답하는 대화 도우미예요. 사람 상담사가 아니고, 의료 서비스도 아니에요.",
      "이번 데모에서는 정해 둔 예시 답변만 돌려줘요.",
    ],
  },
  {
    title: "개인정보",
    body: [
      "내가 쓴 대화와 카드 문장은 ARA 전용 공간에 따로 보관해요. 회사 업무 데이터와 섞이지 않아요.",
      "언제든 대화를 지우거나 동의를 철회할 수 있어요. 철회하면 내 ARA 기록을 모두 지워요.",
    ],
    check: "개인정보 수집·이용에 동의해요",
  },
  {
    title: "민감정보",
    body: [
      "대화에 마음 상태 같은 민감한 내용이 들어갈 수 있어서 따로 동의를 받아요.",
      "원하지 않는 이야기는 적지 않아도 괜찮아요.",
    ],
    check: "민감정보 처리에 동의해요",
  },
  {
    title: "회사가 보는 것·못 보는 것",
    body: [
      "회사는 내가 나누기로 고른 카드 문장 사본과, 10명 이상일 때의 월 집계만 볼 수 있어요.",
      "진단 원점수, 대화, 이용 시각은 관리자도 볼 수 없어요. 인사평가·배치에 쓰지 않아요.",
    ],
  },
];

/** 동의 흐름(A-01): 한 화면 안에서 순서대로 [다음] → 마지막 [동의하고 시작하기] */
export function ConsentFlow({ profile, consent, onDone }: { profile?: AraProfile; consent?: WellbeingConsent; onDone: () => void }) {
  const { persona, clock } = useWorksite();
  const { message } = App.useApp();
  const [step, setStep] = useState(() => Math.min(3, Math.max(0, profile?.consented_at ? 0 : profile?.steps_done ?? 0)));
  const [checks, setChecks] = useState<Record<number, boolean>>({});
  const [busy, setBusy] = useState(false);
  const { mutateAsync: create } = useCreate();
  const { mutateAsync: update } = useUpdate();
  const invalidate = useInvalidate();

  const saveSteps = async (n: number, consentedAt: string | null) => {
    const values = { steps_done: n, consented_at: consentedAt };
    if (profile) await update({ resource: "ara_profile", id: "profile", values, dataProviderName: "ara", successNotification: false });
    else await create({ resource: "ara_profile", values: { id: "profile", ...values }, dataProviderName: "ara", successNotification: false });
  };

  const next = async () => {
    const s = STEPS[step]!;
    if (s.check && !checks[step]) { message.warning("확인란에 체크해 주세요"); return; }
    setStep(step + 1);
    void saveSteps(step + 1, null).catch(() => undefined);
  };

  const finish = async () => {
    setBusy(true);
    try {
      const now = clock.now();
      const values = { ai_notice_at: now, privacy_consent_at: now, sensitive_consent_at: now, withdrawn_at: null };
      if (consent) await update({ resource: "wellbeing_consents", id: consent.id, values, successNotification: false });
      else await create({ resource: "wellbeing_consents", values: { member_id: persona.memberId, ...values }, successNotification: false });
      await saveSteps(STEPS.length, now);
      await invalidate({ resource: "ara_profile", dataProviderName: "ara", invalidates: ["list"] });
      message.success("동의했어요. 이제 ARA를 쓸 수 있어요");
      onDone();
    } catch {
      message.error("동의를 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ol className="as-steps" aria-label="동의 단계">
      {STEPS.map((s, i) => {
        const state = i < step ? "done" : i === step ? "current" : "todo";
        return (
          <li key={s.title} className="as-step" data-state={state} aria-current={state === "current" ? "step" : undefined}>
            <span className="as-step__no" aria-hidden>{state === "done" ? <CheckOutlined /> : i + 1}</span>
            <div className="as-step__title">
              {s.title}
              {state === "done" && <span className="as-caption">확인함</span>}
            </div>
            {state === "current" && (
              <>
                <div className="as-step__body">
                  {s.body.map((t) => <p key={t}>{t}</p>)}
                  {i === 3 && <p><Link to="/ara/privacy">회사가 보는 것·못 보는 것 자세히 보기</Link></p>}
                </div>
                {s.check && (
                  <div className="as-step__actions">
                    <Checkbox checked={!!checks[i]} onChange={(e) => setChecks((c) => ({ ...c, [i]: e.target.checked }))}>{s.check}</Checkbox>
                  </div>
                )}
                <div className="as-step__actions">
                  {i > 0 && <Button onClick={() => setStep(i - 1)}>이전</Button>}
                  {i < STEPS.length - 1
                    ? <Button type="primary" onClick={() => void next()}>다음</Button>
                    : <Button type="primary" loading={busy} onClick={() => void finish()}>동의하고 시작하기</Button>}
                </div>
              </>
            )}
          </li>
        );
      })}
    </ol>
  );
}
