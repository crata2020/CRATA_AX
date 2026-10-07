// node --test --experimental-strip-types src/lib/*.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { APPLICANTS, PEOPLE, POSITIONS, TEAMS, TODAY } from "../data/seed.ts";
import { parse } from "./parse.ts";
import { adviseMove, fit, suggestPeople, suggestTeams, teamDistribution, type World } from "./fit.ts";
import { recommend, screen } from "./hiring.ts";
import { josa } from "./text.ts";

const id = (name: string) => PEOPLE.find((p) => p.name === name)!.id;
const w: World = { people: PEOPLE, teams: TEAMS, today: TODAY };

test("조사", () => {
  assert.equal(josa("품질보증팀", "으로"), "품질보증팀으로");
  assert.equal(josa("개발", "으로"), "개발로");
  assert.equal(josa("영업팀", "과와"), "영업팀과");
  assert.equal(josa("파랑", "이에요"), "파랑이에요");
  assert.equal(josa("보라", "이에요"), "보라예요");
});

test("이동: 이름 + 팀(으)로", () => {
  assert.deepEqual(parse("이하은 품질보증팀으로", PEOPLE, TEAMS), { kind: "move", personIds: [id("이하은")], teamId: "t-qa", lead: false });
  assert.deepEqual(parse("이하은을 품질팀으로 보내줘", PEOPLE, TEAMS), { kind: "move", personIds: [id("이하은")], teamId: "t-qa", lead: false });
  assert.deepEqual(parse("하은 씨 품질로", PEOPLE, TEAMS), { kind: "move", personIds: [id("이하은")], teamId: "t-qa", lead: false });
  assert.deepEqual(parse("생산1팀 이하은을 개발팀으로", PEOPLE, TEAMS), { kind: "move", personIds: [id("이하은")], teamId: "t-dev", lead: false });
});

test("이동: 팀장으로, 여러 명", () => {
  const r = parse("박준기 생산1팀 팀장으로", PEOPLE, TEAMS);
  assert.equal(r.kind, "move");
  assert.equal(r.kind === "move" && r.lead, true);
  const m = parse("장미래, 오세린 영업팀으로", PEOPLE, TEAMS);
  assert.deepEqual(m, { kind: "move", personIds: [id("장미래"), id("오세린")], teamId: "t-sales", lead: false });
});

test("바꾸기·취소·확정", () => {
  assert.deepEqual(parse("권해솔이랑 정재윤 자리 바꿔", PEOPLE, TEAMS), { kind: "swap", a: id("권해솔"), b: id("정재윤") });
  assert.deepEqual(parse("이하은 취소", PEOPLE, TEAMS), { kind: "undo", personIds: [id("이하은")] });
  assert.deepEqual(parse("방금 거 되돌려", PEOPLE, TEAMS), { kind: "undo", personIds: [] });
  assert.deepEqual(parse("모두 확정", PEOPLE, TEAMS), { kind: "confirm", personIds: [] });
  assert.deepEqual(parse("이하은 확정해줘", PEOPLE, TEAMS), { kind: "confirm", personIds: [id("이하은")] });
});

test("추천 질문", () => {
  assert.deepEqual(parse("박준기 어디가 맞을까?", PEOPLE, TEAMS), { kind: "whereFor", personId: id("박준기") });
  assert.deepEqual(parse("개발팀에 누가 좋아?", PEOPLE, TEAMS), { kind: "whoFor", teamId: "t-dev" });
  assert.deepEqual(parse("품질팀에 보낼 사람 추천해줘", PEOPLE, TEAMS), { kind: "whoFor", teamId: "t-qa" });
  assert.deepEqual(parse("이하은", PEOPLE, TEAMS), { kind: "about", personId: id("이하은") });
});

test("못 알아들은 입력", () => {
  assert.equal(parse("홍길동 품질팀으로", PEOPLE, TEAMS).kind, "unknown");
  const same = parse("유선미 품질팀으로", PEOPLE, TEAMS);
  assert.equal(same.kind === "unknown" && same.reason, "sameTeam");
  assert.equal(parse("", PEOPLE, TEAMS).kind, "unknown");
});

test("적합도: 이하은은 품질보증팀이 지금 팀보다 맞아요", () => {
  const p = PEOPLE.find((x) => x.name === "이하은")!;
  const qa = fit(TEAMS.find((t) => t.id === "t-qa")!.env, p.crata!).score;
  const p1 = fit(TEAMS.find((t) => t.id === "t-p1")!.env, p.crata!).score;
  assert.ok(qa >= 75, `qa ${qa}`);
  assert.ok(qa > p1 + 15, `qa ${qa} p1 ${p1}`);
  const a = adviseMove(w, p.id, "t-qa");
  assert.equal(a.verdict, "good");
  assert.ok(a.cons.some((c) => c.text.includes("측정기 사용 교육")), "교육 필요");
  assert.ok(a.tips.length > 0);
});

test("조언: 박준기를 빼면 생산2팀 금형 교체 가능자가 줄어요", () => {
  const a = adviseMove(w, id("박준기"), "t-qa");
  assert.ok(a.cons.some((c) => c.text.includes("프레스 금형 교체")), JSON.stringify(a.cons));
});

test("조언: 설비보전팀(최소 3명)에서 빼면 심각", () => {
  const a = adviseMove(w, id("연태웅"), "t-p1");
  assert.ok(a.cons.some((c) => c.severe && c.text.includes("최소")));
  assert.notEqual(a.verdict, "good");
});

test("조언: 동의하지 않은 사람은 CRATA 없이", () => {
  const a = adviseMove(w, id("최도윤"), "t-adm");
  assert.equal(a.usedCrata, false);
  assert.equal(a.score, undefined);
});

test("조언: 팀장·최근 입사·최근 이동", () => {
  assert.ok(adviseMove(w, id("유선미"), "t-dev").cons.some((c) => c.text.includes("팀장 자리")));
  assert.ok(adviseMove(w, id("정유나"), "t-qa").cons.some((c) => c.text.includes("입사")));
  assert.ok(adviseMove(w, id("하예진"), "t-qa").cons.some((c) => c.text.includes("전에 팀을 옮겼어요")));
});

test("추천: 개발팀에는 권해솔이 위에", () => {
  const top = suggestPeople(w, "t-dev", 3).map((x) => x.person.name);
  assert.ok(top.includes("권해솔"), top.join(","));
  const teams = suggestTeams(w, id("이하은"));
  assert.equal(teams[0]!.team.id, "t-qa");
});

test("팀 분포는 검사한 사람이 5명 이상일 때만", () => {
  assert.equal(teamDistribution(w, "t-mnt").shown, false);
  assert.equal(teamDistribution(w, "t-p1").shown, true);
});

test("채용: 서류 조건과 추천", () => {
  const qa = POSITIONS.find((p) => p.id === "pos-qa")!;
  const team = TEAMS.find((t) => t.id === "t-qa")!;
  const members = PEOPLE.filter((p) => p.teamId === "t-qa");
  const recs = APPLICANTS.filter((a) => a.positionId === "pos-qa").map((a) => ({ a, r: recommend(qa, team, members, a) }));
  const dohaRin = recs.find((x) => x.a.name === "도하린")!;
  assert.equal(dohaRin.r.tier, "recommend");
  assert.ok((dohaRin.r.score ?? 0) >= 85);
  assert.ok(recs.filter((x) => x.r.tier === "pending").length >= 8, "검사 전 지원자");
  for (const { r } of recs) if (r.tier !== "pending") assert.ok(r.reasons.length + r.concerns.length > 0);
  const p2 = POSITIONS.find((p) => p.id === "pos-p2")!;
  const shiftNo = APPLICANTS.find((a) => a.name === "어서진")!;
  assert.equal(screen(p2, shiftNo).ok, false);
});
