// 예시 회사 데이터. 회사·사람·지원자는 모두 가상이에요.
// CRATA 결과는 '배치 참고 동의(placement)' / '본인만(self)' / '미응시(none)'로 나눠요.
import type { Applicant, Center, ColorKey, Conf, Consent, Core, CrataProfile, Growth, Motive, Person, Position, Team, Think } from "../lib/model.ts";

export const TODAY = "2026-10-07";
export const COMPANY = { name: "예시정밀산업", short: "예시정밀", monogram: "YJ", desc: "자동차 부품 제조 · 47명" };

const env = (color: ColorKey, starts: Motive[], keeps: Motive[], needs: Core[], centers: Center[], think: Think, conf: Conf) => ({ color, starts, keeps, needs, centers, think, conf });

export const TEAMS: Team[] = [
  { id: "t-ceo", name: "대표이사", aliases: ["대표실"], parentId: null, min: 1, office: true, keySkills: [], requires: [], shift: false, desc: "", env: env("red", ["goal"], ["meaning"], ["own"], ["open"], "together", "mixed") },
  { id: "t-plant", name: "공장장", aliases: ["공장장실"], parentId: "t-ceo", min: 1, office: true, keySkills: [], requires: [], shift: false, desc: "", env: env("orange", ["goal"], ["rhythm"], ["own"], ["field"], "together", "mixed") },
  { id: "t-p1", name: "생산1팀", aliases: ["생산1", "편조"], parentId: "t-plant", min: 10, keySkills: ["편조기 셋업"], requires: [], shift: true,
    desc: "편조 메시 생산 · 2교대", env: env("orange", ["goal", "people"], ["rhythm", "recognition"], ["execute", "own"], ["field", "predictable"], "together", "mixed") },
  { id: "t-p2", name: "생산2팀", aliases: ["생산2", "크림핑", "프레스"], parentId: "t-plant", min: 9, keySkills: ["프레스 금형 교체", "크림핑 셋업"], requires: ["프레스 안전교육"], shift: true,
    desc: "크림핑·프레스 가공 · 2교대", env: env("red", ["goal", "recognition"], ["rhythm", "reward"], ["execute", "check"], ["field", "predictable"], "together", "mixed") },
  { id: "t-qa", name: "품질보증팀", aliases: ["품질", "품보", "QA"], parentId: "t-plant", min: 5, keySkills: ["3차원 측정"], requires: ["측정기 사용 교육"], shift: false,
    desc: "수입·공정·출하 검사, 고객 클레임", env: env("blue", ["goal", "stability"], ["growth", "rhythm"], ["check", "structure"], ["focus", "predictable"], "solo", "peer") },
  { id: "t-dev", name: "개발팀", aliases: ["개발", "공정개발"], parentId: "t-plant", min: 4, keySkills: ["도면 작성(CAD)"], requires: [], shift: false,
    desc: "신규 품목·공정 개발, 4M 변경", env: env("purple", ["novelty", "autonomy"], ["meaning", "growth"], ["explore", "structure"], ["open", "focus"], "together", "mixed") },
  { id: "t-mnt", name: "설비보전팀", aliases: ["설비", "보전", "설비보전"], parentId: "t-plant", min: 3, keySkills: ["PLC 수리"], requires: ["전기기능사"], shift: false,
    desc: "설비 52대 예방보전·고장 수리", env: env("orange", ["goal", "autonomy"], ["recognition", "growth"], ["own", "check"], ["field", "focus"], "solo", "mixed") },
  { id: "t-sales", name: "영업팀", aliases: ["영업"], parentId: "t-ceo", min: 3, keySkills: ["수출 서류"], requires: [], shift: false,
    desc: "고객사 수주·납기·견적", env: env("yellow", ["recognition", "people"], ["reward", "people"], ["mediate", "execute"], ["contact", "open"], "together", "peer") },
  { id: "t-adm", name: "구매·총무팀", aliases: ["구매", "총무", "경리", "구매총무"], parentId: "t-ceo", min: 3, keySkills: ["급여·4대보험"], requires: [], shift: false,
    desc: "구매·자재, 급여, 총무", env: env("green", ["stability", "goal"], ["rhythm", "people"], ["own", "check"], ["predictable", "focus"], "solo", "peer") },
];

// ───────── CRATA 프로필 만들기(결정적 난수)
function rng(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const COLORS: ColorKey[] = ["red", "orange", "yellow", "green", "blue", "purple"];
const MOTIVES: Motive[] = ["goal", "recognition", "autonomy", "people", "novelty", "stability", "growth", "meaning", "rhythm", "reward"];
const CORES: Core[] = ["check", "execute", "structure", "mediate", "explore", "own"];
const CENTERS: Center[] = ["predictable", "focus", "contact", "field", "open"];
const GROWTHS: Growth[] = ["delegate", "speak", "slow", "start", "connect"];
const LATENT = ["후배 가르치기", "숫자로 정리하기", "새 설비 익히기", "고객 말 듣기", "작업 순서 바꾸기", "문서로 남기기", "갈등 풀기", "아이디어 내기"];

function gen(seed: number, team: Team, fitBias = 0.42): CrataProfile {
  const r = rng(seed);
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)]!;
  const lean = <T,>(teamXs: readonly T[], all: readonly T[]) => (r() < fitBias ? pick(teamXs) : pick(all));
  const e = team.env;
  const comfort = lean([e.color], COLORS);
  let challenge = pick(COLORS);
  if (challenge === comfort) challenge = COLORS[(COLORS.indexOf(comfort) + 3) % 6]!;
  const startOwn = lean(e.starts, MOTIVES), keepOwn = lean(e.keeps, MOTIVES), thinkOwn: Think = lean([e.think], ["solo", "together"] as Think[]);
  return {
    takenAt: `2026-09-${String(8 + Math.floor(r() * 14)).padStart(2, "0")}`,
    color: { outer: lean([e.color], COLORS), inner: pick(COLORS), comfort, challenge },
    motive: { start: { own: startOwn, now: r() < 0.75 ? startOwn : pick(e.starts) }, keep: { own: keepOwn, now: r() < 0.8 ? keepOwn : pick(e.keeps) } },
    problem: { center: lean(e.centers, CENTERS), core: lean(e.needs, CORES), growth: pick(GROWTHS), latent: pick(LATENT) },
    relation: { think: { own: thinkOwn, now: r() < 0.8 ? thinkOwn : e.think }, conf: { own: lean([e.conf], ["peer", "mixed"] as Conf[]), now: e.conf } },
  };
}
/** 직접 정한 프로필: [외면, 내면, 컴포트, 챌린지] [시작 고유, 현재] [지속 고유, 현재] [중심, 핵심, 성장, 잠재] [생각 고유, 현재] [자신감 고유, 현재] */
const cr = (c: [ColorKey, ColorKey, ColorKey, ColorKey], s: [Motive, Motive], k: [Motive, Motive], pr: [Center, Core, Growth, string], t: [Think, Think], f: [Conf, Conf], takenAt = "2026-09-15"): CrataProfile => ({
  takenAt, color: { outer: c[0], inner: c[1], comfort: c[2], challenge: c[3] },
  motive: { start: { own: s[0], now: s[1] }, keep: { own: k[0], now: k[1] } },
  problem: { center: pr[0], core: pr[1], growth: pr[2], latent: pr[3] },
  relation: { think: { own: t[0], now: t[1] }, conf: { own: f[0], now: f[1] } },
});

type Row = [id: string, name: string, title: string, team: string, joined: string, consent: Consent, opts?: Partial<Person> & { crata?: CrataProfile | null }];
const ROWS: Row[] = [
  ["p-ceo", "문경호", "대표이사", "t-ceo", "2011-12-08", "self", { leader: true, shiftOk: false }],
  ["p-plant", "서병철", "공장장", "t-plant", "2013-03-04", "placement", { leader: true }],
  // 생산1팀(12)
  ["p1-01", "강태섭", "팀장", "t-p1", "2014-05-12", "placement", { leader: true, skills: ["편조기 셋업"] }],
  ["p1-02", "이하은", "사원", "t-p1", "2024-03-04", "placement", { skills: ["편조기 운전"], crata: cr(["blue", "green", "blue", "red"], ["goal", "goal"], ["stability", "rhythm"], ["focus", "check", "speak", "숫자로 정리하기"], ["solo", "together"], ["mixed", "mixed"], "2026-09-10") }],
  ["p1-03", "박상근", "반장", "t-p1", "2016-08-01", "placement", { skills: ["편조기 셋업", "편조기 운전"] }],
  ["p1-04", "김다온", "사원", "t-p1", "2025-11-03", "none", { skills: ["편조기 운전"] }],
  ["p1-05", "정재윤", "주임", "t-p1", "2021-02-15", "placement", { skills: ["편조기 운전"] }],
  ["p1-06", "최은비", "사원", "t-p1", "2023-07-10", "self", { skills: ["편조기 운전"] }],
  ["p1-07", "윤석진", "주임", "t-p1", "2019-04-22", "placement", { skills: ["편조기 셋업", "편조기 운전"] }],
  ["p1-08", "장미래", "사원", "t-p1", "2024-09-02", "placement", { skills: ["편조기 운전"] }],
  ["p1-09", "임동건", "사원", "t-p1", "2022-01-10", "placement", { skills: ["편조기 운전", "지게차"] }],
  ["p1-10", "오세린", "사원", "t-p1", "2025-03-17", "placement", { skills: ["편조기 운전"] }],
  ["p1-11", "한도겸", "사원", "t-p1", "2023-10-16", "self", { skills: ["편조기 운전"] }],
  ["p1-12", "조하늘", "사원", "t-p1", "2025-06-02", "placement", { skills: ["편조기 운전"] }],
  // 생산2팀(11)
  ["p2-01", "배영길", "팀장", "t-p2", "2013-09-02", "placement", { leader: true, skills: ["프레스 금형 교체"], licenses: ["프레스 안전교육"] }],
  ["p2-02", "박준기", "반장", "t-p2", "2019-03-11", "placement", { skills: ["프레스 금형 교체", "크림핑 셋업"], licenses: ["프레스 안전교육"],
    crata: cr(["red", "orange", "orange", "purple"], ["recognition", "recognition"], ["reward", "reward"], ["field", "execute", "delegate", "후배 가르치기"], ["together", "together"], ["mixed", "mixed"], "2026-09-12") }],
  ["p2-03", "신현우", "주임", "t-p2", "2020-06-01", "placement", { skills: ["크림핑 셋업"], licenses: ["프레스 안전교육"] }],
  ["p2-04", "권해솔", "사원", "t-p2", "2023-04-03", "placement", { skills: ["크림핑 운전"], licenses: ["프레스 안전교육"],
    crata: cr(["purple", "yellow", "yellow", "green"], ["novelty", "goal"], ["meaning", "rhythm"], ["focus", "explore", "start", "작업 순서 바꾸기"], ["together", "together"], ["peer", "mixed"], "2026-09-12") }],
  ["p2-05", "황보윤", "사원", "t-p2", "2024-01-08", "placement", { skills: ["프레스 운전"], licenses: ["프레스 안전교육"] }],
  ["p2-06", "안재희", "사원", "t-p2", "2022-11-14", "self", { skills: ["프레스 운전"], licenses: ["프레스 안전교육"] }],
  ["p2-07", "송민혁", "주임", "t-p2", "2018-07-23", "placement", { skills: ["크림핑 셋업", "프레스 운전"], licenses: ["프레스 안전교육"] }],
  ["p2-08", "전다솜", "사원", "t-p2", "2025-02-03", "none", { skills: ["크림핑 운전"], licenses: ["프레스 안전교육"] }],
  ["p2-09", "홍기찬", "사원", "t-p2", "2021-09-06", "placement", { skills: ["프레스 운전", "지게차"], licenses: ["프레스 안전교육"] }],
  ["p2-10", "고은채", "사원", "t-p2", "2024-05-20", "placement", { skills: ["크림핑 운전"], licenses: ["프레스 안전교육"] }],
  ["p2-11", "문태양", "사원", "t-p2", "2025-08-04", "none", { skills: ["프레스 운전"], licenses: ["프레스 안전교육"] }],
  // 품질보증팀(6)
  ["qa-01", "유선미", "팀장", "t-qa", "2015-01-05", "placement", { leader: true, skills: ["3차원 측정", "8D 보고서"], licenses: ["측정기 사용 교육"], shiftOk: false }],
  ["qa-02", "허재민", "대리", "t-qa", "2018-10-01", "placement", { skills: ["3차원 측정"], licenses: ["측정기 사용 교육"] }],
  ["qa-03", "양서윤", "주임", "t-qa", "2021-05-03", "placement", { skills: ["수입검사"], licenses: ["측정기 사용 교육"] }],
  ["qa-04", "노지환", "사원", "t-qa", "2023-02-06", "self", { skills: ["공정검사"], licenses: ["측정기 사용 교육"] }],
  ["qa-05", "차유림", "사원", "t-qa", "2024-08-12", "placement", { skills: ["출하검사"], licenses: ["측정기 사용 교육"] }],
  ["qa-06", "구본석", "사원", "t-qa", "2022-04-18", "placement", { skills: ["공정검사"], licenses: ["측정기 사용 교육"] }],
  // 개발팀(5)
  ["dv-01", "백인규", "팀장", "t-dev", "2016-03-02", "placement", { leader: true, skills: ["도면 작성(CAD)", "4M 변경"], shiftOk: false }],
  ["dv-02", "정유나", "사원", "t-dev", "2026-06-01", "placement", { skills: ["시험 평가"], shiftOk: false }],
  ["dv-03", "탁민재", "대리", "t-dev", "2019-08-19", "placement", { skills: ["도면 작성(CAD)"],
    crata: cr(["purple", "red", "purple", "blue"], ["autonomy", "autonomy"], ["meaning", "meaning"], ["open", "explore", "slow", "아이디어 내기"], ["together", "together"], ["mixed", "mixed"], "2026-09-16") }],
  ["dv-04", "하예진", "주임", "t-dev", "2021-01-11", "placement", { skills: ["시험 평가", "8D 보고서"], licenses: ["측정기 사용 교육"], lastMoved: "2026-07-01" }],
  ["dv-05", "변성우", "사원", "t-dev", "2024-02-19", "self", { skills: ["도면 작성(CAD)"] }],
  // 설비보전팀(3)
  ["mt-01", "지만호", "팀장", "t-mnt", "2014-11-03", "placement", { leader: true, skills: ["PLC 수리", "용접"], licenses: ["전기기능사"] }],
  ["mt-02", "연태웅", "주임", "t-mnt", "2020-03-16", "placement", { skills: ["PLC 수리"], licenses: ["전기기능사"] }],
  ["mt-03", "소유찬", "사원", "t-mnt", "2024-10-07", "none", { skills: ["용접"], licenses: ["전기기능사"] }],
  // 영업팀(4)
  ["sl-01", "길태민", "팀장", "t-sales", "2015-06-01", "placement", { leader: true, skills: ["수출 서류", "견적"], shiftOk: false }],
  ["sl-02", "최도윤", "대리", "t-sales", "2020-09-14", "self", { skills: ["견적"], shiftOk: false }],
  ["sl-03", "방수진", "주임", "t-sales", "2022-03-02", "placement", { skills: ["납기 관리"], shiftOk: false }],
  ["sl-04", "엄기태", "사원", "t-sales", "2025-01-06", "placement", { skills: ["납기 관리"], shiftOk: false }],
  // 구매·총무팀(4)
  ["ad-01", "석미경", "팀장", "t-adm", "2012-02-01", "placement", { leader: true, skills: ["급여·4대보험", "구매"], shiftOk: false }],
  ["ad-02", "우현정", "대리", "t-adm", "2018-05-14", "placement", { skills: ["급여·4대보험"], shiftOk: false }],
  ["ad-03", "피승준", "주임", "t-adm", "2021-07-05", "self", { skills: ["구매", "자재"] }],
  ["ad-04", "국다현", "사원", "t-adm", "2024-04-01", "none", { skills: ["총무"], shiftOk: false }],
];

export const PEOPLE: Person[] = ROWS.map(([id, name, title, teamId, joined, consent, opts = {}], i) => {
  const team = TEAMS.find((t) => t.id === teamId)!;
  const { crata, ...rest } = opts;
  const profile = consent === "none" ? undefined : crata ?? gen(1000 + i * 37, team);
  return { id, name, title, teamId, joined, consent, skills: [], licenses: [], shiftOk: true, ...rest, crata: profile };
});
for (const t of TEAMS) t.leaderId = PEOPLE.find((p) => p.teamId === t.id && p.leader)?.id;

// ───────── 채용
export const POSITIONS: Position[] = [
  { id: "pos-qa", title: "품질검사원(신입·경력)", teamId: "t-qa", count: 1, status: "open", opened: "2026-09-21", deadline: "2026-10-12",
    brief: "꼼꼼하게 기록하고 혼자서도 판정을 책임질 사람이면 좋겠어요. 교대 근무는 없어요. 측정기는 들어와서 배워도 돼요.",
    mustLicenses: [], minYears: 0, shift: false, mode: "fit", want: { needs: ["check", "own"], think: "solo" } },
  { id: "pos-p2", title: "프레스 작업자(2교대)", teamId: "t-p2", count: 2, status: "open", opened: "2026-09-28", deadline: "2026-10-19",
    brief: "교대 근무가 가능하고 안전수칙을 잘 지키는 사람. 손이 빠르고 경력 1년 이상이면 좋아요.",
    mustLicenses: [], minYears: 1, shift: true, mode: "fit", want: { needs: ["execute", "check"] } },
  { id: "pos-dev", title: "공정개발 엔지니어", teamId: "t-dev", count: 1, status: "open", opened: "2026-10-01", deadline: "2026-10-31",
    brief: "새 공정을 끝까지 문서로 정리하고 검증까지 책임질 사람. 팀에 꼼꼼히 확인하는 사람이 부족해요.",
    mustLicenses: [], minYears: 2, shift: false, mode: "complement", want: { needs: ["check", "structure"] } },
  { id: "pos-sales", title: "해외영업 담당", teamId: "t-sales", count: 1, status: "closed", opened: "2026-07-01", deadline: "2026-07-31",
    brief: "영문 메일과 수출 서류를 다룰 수 있는 사람.", mustLicenses: [], minYears: 3, shift: false, mode: "fit", want: {} },
];

type ARow = [id: string, pos: string, name: string, applied: string, source: Applicant["source"], years: number, stage: Applicant["stage"], summary: string, opts?: Partial<Applicant> & { seed?: number; bias?: number; crata?: CrataProfile }];
const AROWS: ARow[] = [
  // 품질검사원 14명
  ["a-q01", "pos-qa", "나윤재", "2026-09-22", "사람인", 3, "tested", "자동차 부품 수입검사 3년. 측정기 교육 이수.", { licenses: ["측정기 사용 교육"], seed: 11, bias: 0.5 }],
  ["a-q02", "pos-qa", "도하린", "2026-09-22", "고용24", 0, "tested", "품질경영 전공 졸업 예정. 실습 때 검사 기록 담당.", { seed: 12, bias: 0.8,
    crata: cr(["blue", "blue", "green", "yellow"], ["goal", "goal"], ["recognition", "growth"], ["focus", "check", "speak", "문서로 남기기"], ["solo", "solo"], ["peer", "peer"], "2026-10-02") }],
  ["a-q03", "pos-qa", "명지수", "2026-09-23", "잡코리아", 5, "tested", "전자부품 출하검사 5년, 클레임 대응 경험.", { licenses: ["측정기 사용 교육"], seed: 13, bias: 0.45 }],
  ["a-q04", "pos-qa", "봉준혁", "2026-09-23", "사람인", 1, "tested", "사출 공정검사 1년. 야간 근무 선호.", { seed: 14, bias: 0.2 }],
  ["a-q05", "pos-qa", "설아름", "2026-09-24", "직접 지원", 2, "tested", "식품 품질관리 2년. 문서 정리 강점.", { seed: 15, bias: 0.35 }],
  ["a-q06", "pos-qa", "옥태준", "2026-09-25", "고용24", 4, "testing", "금속 가공 검사 4년.", { licenses: ["측정기 사용 교육"], testSentAt: "2026-10-02" }],
  ["a-q07", "pos-qa", "용채원", "2026-09-25", "사람인", 0, "testing", "기계공학 졸업. 품질 직무 희망.", { testSentAt: "2026-10-02" }],
  ["a-q08", "pos-qa", "제민우", "2026-09-26", "잡코리아", 6, "testing", "자동차 1차 협력사 품질 6년, 8D 작성.", { licenses: ["측정기 사용 교육"], testSentAt: "2026-10-03" }],
  ["a-q09", "pos-qa", "천소율", "2026-09-29", "추천", 2, "screened", "직원 추천. 반도체 장비 검사 2년." ],
  ["a-q10", "pos-qa", "탁현서", "2026-09-30", "사람인", 1, "screened", "전기 부품 검사 1년." ],
  ["a-q11", "pos-qa", "편가온", "2026-10-02", "고용24", 0, "applied", "품질 관련 자격 준비 중." ],
  ["a-q12", "pos-qa", "함서진", "2026-10-03", "사람인", 3, "applied", "의료기기 품질 3년." ],
  ["a-q13", "pos-qa", "인도훈", "2026-10-05", "직접 지원", 0, "applied", "생산직 경험 2년, 품질 전환 희망." ],
  ["a-q14", "pos-qa", "육나경", "2026-09-24", "잡코리아", 2, "hold", "지원 후 연락이 닿지 않아요.", { note: "연락 2회 무응답" }],
  // 프레스 작업자 10명
  ["a-p01", "pos-p2", "강산하", "2026-09-29", "고용24", 3, "tested", "프레스 3년, 2교대 경험.", { licenses: ["프레스 안전교육"], seed: 31, bias: 0.5 }],
  ["a-p02", "pos-p2", "남궁율", "2026-09-29", "사람인", 1, "tested", "자동차 부품 프레스 1년.", { seed: 32, bias: 0.3 }],
  ["a-p03", "pos-p2", "단예준", "2026-09-30", "잡코리아", 0, "tested", "생산직 신입, 교대 가능.", { seed: 33, bias: 0.35 }],
  ["a-p04", "pos-p2", "마루한", "2026-09-30", "고용24", 5, "tested", "금형 교체 가능, 프레스 5년.", { licenses: ["프레스 안전교육"], seed: 34, bias: 0.45 }],
  ["a-p05", "pos-p2", "반서해", "2026-10-01", "직접 지원", 2, "testing", "크림핑 2년.", { testSentAt: "2026-10-04" }],
  ["a-p06", "pos-p2", "사공진", "2026-10-02", "사람인", 1, "testing", "교대 가능, 지게차 면허.", { testSentAt: "2026-10-04" }],
  ["a-p07", "pos-p2", "어서진", "2026-10-02", "고용24", 4, "screened", "주간만 가능하다고 적었어요.", { shiftOk: false }],
  ["a-p08", "pos-p2", "여하람", "2026-10-03", "잡코리아", 0, "applied", "생산직 희망." ],
  ["a-p09", "pos-p2", "연슬기", "2026-10-04", "사람인", 2, "applied", "용접·프레스 2년." ],
  ["a-p10", "pos-p2", "온새벽", "2026-10-06", "고용24", 1, "applied", "프레스 보조 1년." ],
  // 공정개발 6명
  ["a-d01", "pos-dev", "위재경", "2026-10-02", "사람인", 4, "screened", "자동차 부품 공정개발 4년, CAD 가능." ],
  ["a-d02", "pos-dev", "은시온", "2026-10-03", "잡코리아", 2, "applied", "기계설계 2년." ],
  ["a-d03", "pos-dev", "인하율", "2026-10-04", "직접 지원", 6, "applied", "생산기술 6년, 4M 변경 담당." ],
  ["a-d04", "pos-dev", "장솔", "2026-10-05", "사람인", 1, "applied", "신입에 가까운 1년 경력." ],
  ["a-d05", "pos-dev", "제이안", "2026-10-06", "고용24", 3, "applied", "시험 평가 3년." ],
  ["a-d06", "pos-dev", "추하윤", "2026-10-06", "추천", 5, "applied", "직원 추천. 공정 표준서 작성 경험." ],
  // 해외영업(마감)
  ["a-s01", "pos-sales", "표가람", "2026-07-03", "사람인", 4, "offer", "해외영업 4년, 수출 서류.", { seed: 51, bias: 0.6 }],
  ["a-s02", "pos-sales", "하도윤", "2026-07-05", "잡코리아", 3, "closed", "무역 3년.", { seed: 52, bias: 0.35 }],
];

export const APPLICANTS: Applicant[] = AROWS.map(([id, positionId, name, appliedAt, source, years, stage, summary, opts = {}]) => {
  const { seed, bias, crata, ...rest } = opts;
  const pos = POSITIONS.find((p) => p.id === positionId)!;
  const team = TEAMS.find((t) => t.id === pos.teamId)!;
  const tested = stage === "tested" || stage === "shortlist" || stage === "interview" || stage === "offer" || stage === "closed";
  const profile = tested ? crata ?? gen(seed ?? 99, team, bias ?? 0.5) : undefined;
  return { id, positionId, name, appliedAt, source, years, stage, summary, licenses: [], shiftOk: true, ...rest, crata: profile,
    testedAt: profile ? profile.takenAt > appliedAt ? profile.takenAt : "2026-10-04" : undefined, testSentAt: rest.testSentAt ?? (profile ? "2026-10-01" : undefined) };
});
