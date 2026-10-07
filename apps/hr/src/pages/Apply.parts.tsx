// 지원자 화면 공통 틀(Apply·Test가 같이 써요): refs/orbix-ai-chat-home.jpg의 흰 상단 바(왼쪽 로고 카드 + 오른쪽 알약)와 가운데 한 줄 본문,
// refs/winx-add-product-form.jpg의 번호 붙은 단계 → 진행 순서(1 지원서 → 2 CRATA 검사 → 3 면접).
// 회사 메뉴(Shell) 없이 떠요. 맨 위 옅은 띠는 데모를 보는 사람용 '회사 화면으로 돌아가기'예요.
import type { ReactNode } from "react";
import { ArrowLeft, Check, Eye, Lock } from "lucide-react";
import { COMPANY } from "@/data/seed";
import { cx } from "@/ui";
import "./Apply.css";

/** 채용 서류 반환 청구 기간(채용절차법: 회사가 14~180일 중 정함). 예시 값이에요. */
export const RETENTION_DAYS = 180;
/** 지원서에서 묻지 않는 것(채용절차법 · 연령차별 금지) */
export const NOT_ASKED = ["사진", "나이·생년월일", "키·체중", "출신 지역", "혼인 여부", "재산", "가족의 학력·직업"];

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
const day = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00`);
/** "2026-10-12" → "10월 12일(월)" */
export const longDate = (s: string) => { const d = day(s); return `${d.getMonth() + 1}월 ${d.getDate()}일(${WEEK[d.getDay()]})`; };
/** 마감까지 남은 날 */
export const daysLeft = (s: string, today: string) => Math.round((day(s).getTime() - day(today).getTime()) / 86400000);
export const ddayLabel = (n: number) => (n > 0 ? `D-${n}` : n === 0 ? "D-day" : "마감");

export function ApplicantFrame({ back, step, children }: { back: string; step: string; children: ReactNode }) {
  return (
    <div className="apx">
      <div className="apx-demo" role="note">
        <div className="apx-in">
          <Eye aria-hidden />
          <span className="apx-demo__t"><b>예시 화면</b><span className="apx-demo__long"> · 지원자가 휴대폰에서 보는 화면이에요</span></span>
          <a className="apx-back" href={back}><ArrowLeft aria-hidden />회사 화면으로 돌아가기</a>
        </div>
      </div>
      <header className="apx-top">
        <div className="apx-in">
          <span className="apx-logo" aria-hidden>{COMPANY.monogram}</span>
          <span className="apx-brand">
            <span className="apx-brand__t">{COMPANY.name}</span>
            <span className="apx-brand__s">채용 · 지원자 화면</span>
          </span>
          <span className="apx-step">{step}</span>
        </div>
      </header>
      <main className="apx-main" id="main">
        <div className="apx-col">{children}</div>
      </main>
      <footer className="apx-foot">
        <div className="apx-in"><Lock aria-hidden />{COMPANY.name} 채용 · CRATA로 접수해요. 개인정보 문의와 설명 요청은 인사 담당(예시)에게 해요.</div>
      </footer>
    </div>
  );
}

type N = 1 | 2 | 3;
const STEPS: { n: N; t: string; s: string }[] = [
  { n: 1, t: "지원서", s: "이름·연락처·경력만 받아요" },
  { n: 2, t: "CRATA 검사", s: "서류를 확인하면 링크를 보내요" },
  { n: 3, t: "면접", s: "담당자가 직접 연락해요" },
];
/** 진행 순서: at 단계가 지금, 그 앞은 끝남 */
export function Steps({ at, sub }: { at: N; sub?: Partial<Record<N, string>> }) {
  return (
    <ol className="apx-steps" aria-label="진행 순서">
      {STEPS.map((s) => {
        const st = s.n < at ? "done" : s.n === at ? "now" : "next";
        return (
          <li key={s.n} className={cx("apx-steps__i", `is-${st}`)} aria-current={st === "now" ? "step" : undefined}>
            <span className="apx-steps__n num" aria-hidden>{st === "done" ? <Check /> : s.n}</span>
            <span className="apx-steps__t">{s.t}<span className="sr-only">{st === "done" ? " · 끝남" : st === "now" ? " · 지금 단계" : " · 다음 단계"}</span></span>
            <span className="apx-steps__s">{sub?.[s.n] ?? s.s}</span>
          </li>
        );
      })}
    </ol>
  );
}
