// npm test가 도는 자리(src/lib/*.test.ts). 계산 함수를 만들면 여기처럼 테스트를 같이 둬요.
import { test } from "node:test";
import assert from "node:assert/strict";
import { josa } from "./text.ts";

test("조사는 받침에 맞춰 붙어요", () => {
  assert.equal(josa("대리", "이에요"), "대리예요");
  assert.equal(josa("품질보증팀", "으로"), "품질보증팀으로");
  assert.equal(josa("개발", "으로"), "개발로");
});
