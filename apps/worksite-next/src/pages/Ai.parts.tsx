// AI 연결·설정 화면이 함께 쓰는 조각: 데이터 등급 경로(리서치 04 · 2.1/2.3절)와 AI 클라이언트 표시.
import type { AiClient, DataClass, TenantData } from "@/data/types";
import type { Hue, Tone } from "@/ui";

export interface GradeRow {
  code: DataClass; hue: Hue; name: string; example: string;
  store: string; route: string; short: string; record: string;
  /** 지금 AI 경로 상태(칩) */
  state: string; tone: Tone;
}

/** L0~L3: 무엇이 들어가고, 어디에 두고, 어느 AI 경로로 가는지(회사 업종에 맞춘 예시) */
export function gradeRows(d: TenantData): GradeRow[] {
  const mfg = d.pack === "manufacturing";
  return [
    { code: "L0", hue: "green", name: "공개·내부 일반", example: mfg ? "홈페이지·카탈로그·공개 자료" : "홈페이지·표준 교안·보도자료",
      store: "Drive·Notion", route: "해외 AI 허용", short: "해외 AI 허용", record: "가능", state: "허용", tone: "good" },
    { code: "L1", hue: "blue", name: "일반 업무", example: mfg ? "생산일보·작업 지시·일반 메일" : "강의 운영·아라 스프린트·영업 점검",
      store: "Drive·Notion(국외 이전 고지)", route: "해외 AI 허용 · 학습 미사용 계약", short: "해외 AI 허용(학습 미사용)", record: "고지·동의 후", state: "허용", tone: "good" },
    { code: "L2", hue: "amber", name: "고객 비밀·계약 조건", example: mfg ? "클레임·도면·단가·고객 품번" : "견적·계약·학맞통 기관 협의",
      store: "국내 저장소(서울)", route: "국내 경로만 · 서울 리전", short: "국내(서울) 경로만", record: "서면 동의 후", state: "국내 경로 준비 중", tone: "warn" },
    { code: "L3", hue: "coral", name: mfg ? "민감 개인정보" : "학생 식별·상담", example: mfg ? "건강·징계 같은 개인 기록" : "학생 이름·상담·사례 내용",
      store: "저장 안 함(삭제 기록만)", route: "처리 안 함", short: "어떤 AI에도 보내지 않아요", record: "안 함", state: "차단", tone: "bad" },
  ];
}

const GRADE_HUE: Record<DataClass, Hue> = { L0: "green", L1: "blue", L2: "amber", L3: "coral" };
/** 등급 코드 네모(색 + 글자) */
export function GradeTag({ code, sm }: { code: DataClass; sm?: boolean }) {
  return (
    <span className={`tone-${GRADE_HUE[code]} num`} aria-label={`데이터 등급 ${code}`}
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none", width: sm ? 30 : 36, height: sm ? 22 : 28, borderRadius: sm ? 7 : 9, fontSize: sm ? 11.5 : 12.5, fontWeight: 600 }}>
      {code}
    </span>
  );
}

/** AI 클라이언트: 차트·표에서 같은 색을 씁니다 */
export const CLIENTS: AiClient[] = ["Claude", "ChatGPT", "Codex", "Gemini"];
export const CLIENT: Record<AiClient, { color: string; soft: string; mono: string; howto: string }> = {
  Claude: { color: "var(--c-orange)", soft: "var(--c-orange-soft)", mono: "Cl", howto: "설정 › 커넥터 › 사용자 지정 커넥터 추가에 주소를 붙여 넣어요" },
  ChatGPT: { color: "var(--c-green)", soft: "var(--c-green-soft)", mono: "Ch", howto: "개발자 모드를 켜고 플러그인 ＋에 주소를 붙여 넣어요" },
  Codex: { color: "var(--c-blue)", soft: "var(--c-blue-soft)", mono: "Cx", howto: "config.toml의 mcp_servers에 주소를 넣고 codex mcp login을 해요" },
  Gemini: { color: "var(--c-violet)", soft: "var(--c-violet-soft)", mono: "Ge", howto: "Gemini CLI settings.json의 mcpServers에 주소를 넣어요" },
};
export function ClientTile({ client, size = 24 }: { client: AiClient; size?: number }) {
  const c = CLIENT[client];
  return (
    <span aria-hidden title={client}
      style={{ width: size, height: size, borderRadius: size > 26 ? 9 : 7, flex: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", background: c.soft, color: "var(--ink)", fontSize: size > 26 ? 12 : 10.5, fontWeight: 600, letterSpacing: "-0.01em", boxShadow: `inset 0 0 0 1.5px ${c.color}` }}>
      {c.mono}
    </span>
  );
}
