// src/lib/status.ts에 아직 없는 도메인의 화면 글자(소유: industry 그룹).
// 공통 승격 후보: notes/industry.md "[요청] status.ts에 도메인 추가" — 올라가면 이 파일 대신 statusOf/labelOf를 씁니다.
import type { StatusInfo } from "@/lib/status";

export const SHIFT_LABEL: Record<string, string> = { day: "주간조", night: "야간조" };
export const ITEM_KIND_LABEL: Record<string, string> = { raw: "원자재", knit: "편조망·편조 롤", part: "완제품(편조 부품)" };
/** 표 칸용 짧은 이름(전체 이름은 칸 title·서랍에) */
export const ITEM_KIND_SHORT: Record<string, string> = { raw: "원자재", knit: "편조 롤", part: "완제품" };
export const FORM_LABEL: Record<string, string> = { crimping: "크림핑", pressing: "프레스 성형", spiralling: "스파이럴링", none: "가공 없음" };
export const MESH_LABEL: Record<string, string> = { F: "파인", M: "미디엄", S: "스탠다드" };
export const NC_SOURCE_LABEL: Record<string, string> = { field_report: "현장 등록", inspection: "검사", claim: "클레임" };
export const CA_METHOD_LABEL: Record<string, string> = { "8D": "8D", simple: "간이" };
export const OPINION_CHANNEL_LABEL: Record<string, string> = { web: "웹", paper: "의견함", meeting: "회의" };

const S = (tone: StatusInfo["tone"], label: string): StatusInfo => ({ tone, label });
export const GAUGE_STATUS: Record<string, StatusInfo> = { active: S("good", "사용"), calibrating: S("info", "교정 중"), retired: S("neutral", "폐기") };
export const OPINION_STATUS: Record<string, StatusInfo> = { new: S("warning", "접수"), answered: S("info", "답변함"), closed: S("good", "완료") };
export const CHECK_RESULT: Record<string, StatusInfo> = { ok: S("good", "이상 없음"), issue: S("serious", "이상 있음") };
export const ITEM_STATUS: Record<string, StatusInfo> = { active: S("good", "사용"), inactive: S("neutral", "사용 안 함") };
export const CA_STATUS: Record<string, StatusInfo> = { open: S("info", "진행 중"), closed: S("good", "종결") };

export const gaugeStatus = (v: string | null | undefined) => GAUGE_STATUS[v ?? ""] ?? S("neutral", v ?? "—");
export const opinionStatus = (v: string | null | undefined) => OPINION_STATUS[v ?? ""] ?? S("neutral", v ?? "—");
export const checkResult = (v: string | null | undefined) => CHECK_RESULT[v ?? ""] ?? S("neutral", "기록 전");
export const itemStatus = (v: string | null | undefined) => ITEM_STATUS[v ?? ""] ?? S("neutral", v ?? "—");
