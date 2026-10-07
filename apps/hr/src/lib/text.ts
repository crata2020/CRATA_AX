// 한국어 조사 고르기: 마지막 글자에 받침이 있는지로 정해요.
const HANGUL_START = 0xac00, HANGUL_END = 0xd7a3;

/** 받침 있으면 1(ㄹ이면 2), 없으면 0, 한글이 아니면 -1 */
function batchim(word: string): number {
  const ch = word.trim().slice(-1);
  const code = ch.charCodeAt(0);
  if (code < HANGUL_START || code > HANGUL_END) return /[0-9]$/.test(ch) ? ("013678".includes(ch) ? 1 : 0) : -1;
  const jong = (code - HANGUL_START) % 28;
  return jong === 0 ? 0 : jong === 8 ? 2 : 1;
}

type Pair = "은는" | "이가" | "을를" | "과와" | "으로" | "이에요";
/** josa("품질보증팀", "은는") → "품질보증팀은" */
export function josa(word: string, kind: Pair): string {
  const b = batchim(word);
  const has = b > 0;
  switch (kind) {
    case "은는": return word + (has ? "은" : "는");
    case "이가": return word + (has ? "이" : "가");
    case "을를": return word + (has ? "을" : "를");
    case "과와": return word + (has ? "과" : "와");
    case "으로": return word + (b === 1 ? "으로" : "로");
    case "이에요": return word + (has ? "이에요" : "예요");
  }
}

export const monthsBetween = (a: string, b: string) => {
  const da = new Date(`${a.slice(0, 10)}T00:00:00`), db = new Date(`${b.slice(0, 10)}T00:00:00`);
  return (db.getFullYear() - da.getFullYear()) * 12 + (db.getMonth() - da.getMonth()) - (db.getDate() < da.getDate() ? 1 : 0);
};

/** 조사만: q("꼼꼼한 확인", "이가") → "이" */
export const q = (word: string, kind: Pair) => josa(word, kind).slice(word.length);
