// 클레임·8D 화면(I-12 · I-13)이 함께 쓰는 값(소유: industry 그룹).
import type { CorrectiveAction, DStep } from "@/types/entities";

export const STEPS = ["D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"] as const;
export const STEP_NAME: Record<string, string> = {
  D0: "준비", D1: "팀 구성", D2: "문제 정의", D3: "임시 조치", D4: "근본 원인", D5: "영구 대책 선정", D6: "대책 실행·검증", D7: "재발 방지", D8: "종결·팀 인정",
};
/** 8D 보드 5열 */
export const BOARD_COLUMNS = [
  { key: "d01", label: "접수 D0–D1", steps: ["D0", "D1"] },
  { key: "d23", label: "문제 정의·임시 조치 D2–D3", steps: ["D2", "D3"] },
  { key: "d45", label: "원인·대책 D4–D5", steps: ["D4", "D5"] },
  { key: "d6", label: "실행·검증 D6", steps: ["D6"] },
  { key: "d78", label: "재발 방지·종결 D7–D8", steps: ["D7", "D8"] },
] as const;

/** 현재 단계(완료 아닌 첫 단계). 모두 완료면 null */
export function currentStep(ca: CorrectiveAction | undefined): DStep | null {
  if (!ca) return null;
  for (const s of STEPS) {
    const d = ca.d_steps.find((x) => x.step === s);
    if (!d || d.status !== "done") return d ?? { step: s, status: "todo", done_on: null };
  }
  return null;
}

export function columnOf(step: string | null | undefined): string {
  if (!step) return "d78";
  return BOARD_COLUMNS.find((c) => (c.steps as readonly string[]).includes(step))?.key ?? "d01";
}

/** "디커플링 링 치수 불량(외경 …). …" → "디커플링 링 치수 불량" */
export const shortTitle = (description: string) => description.split(/[.(]/)[0]!.trim();
