// ARA 코칭 입력에 위기 신호 단어가 있는지 봅니다(A-02). 있으면 답변 위에 위기 안내 블록을 먼저 보여 줍니다.
// 진단·치료 판단을 하지 않습니다. 안내만 합니다.

export const CRISIS_WORDS = [
  "죽고 싶", "죽고싶", "죽을래", "죽어버리", "자살", "자해", "극단적 선택", "극단적선택",
  "목숨을 끊", "살기 싫", "살기싫", "사라지고 싶", "사라지고싶", "끝내고 싶", "유서",
] as const;

/** 위기 안내 문장(A-01·A-02 공통) */
export const CRISIS_NOTICE = "마음이 많이 힘들 때는 109(자살예방 상담전화, 24시간)에서 이야기를 들어줘요. 위급하면 119에 연락해 주세요.";

export function hasCrisisWord(text: string): boolean {
  const t = text.normalize("NFC").replace(/\s+/g, " ");
  return CRISIS_WORDS.some((w) => t.includes(w));
}
