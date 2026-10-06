// 도입 1단계에서 구성원에게 여는 화면(업종 팩별). 전체 운영이면 모든 화면을 열어요.
import type { TenantData } from "./types";

export const PHASE1: Record<TenantData["pack"], string[]> = {
  manufacturing: ["/", "/tasks", "/meetings", "/quality", "/report", "/ai", "/settings"],
  education: ["/", "/tasks", "/projects", "/meetings", "/docs", "/ai", "/settings"],
};

/** 지금 단계에서 열린 화면인지 */
export const isOpen = (d: TenantData, path: string) => d.rollout.stage !== "phase1" || PHASE1[d.pack].includes(path);
