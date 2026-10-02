// 테넌트 브랜드 토큰(빌드 스펙 4.1.1절 확정 값, 대비는 스펙에 기록된 직접 계산 값)
// CRATA 브랜드는 딥 틸 가안(보라 아님). CI가 정해지면 씨앗만 바꿉니다.
import type { BrandTokens } from "@/tenants/types";
import { CATEGORICAL_TAIL } from "./tokens";

export const TR_TOKENS: BrandTokens = {
  brand: "#2D3C67",
  brandWeak: "#E7EDFB",
  onBrand: "#FFFFFF",
  onBrand2: "#E7EDFB",
  heroLine: "rgba(255,255,255,0.24)",
  panel: "#F3F5FB",
  surface: "#FFFFFF",
  line: "#E2E6EF",
  controlLine: "#80889B",
  ink: "#1B1E25",
  ink2: "#434853",
  muted: "#616776",
  chartAccent: "#3A5BA8",
  chartMuted: "#C6CAD5",
  chartProgress: "#6F8FD8",
  chartPalette: ["#3A5BA8", ...CATEGORICAL_TAIL],
  shadowPop: "0 8px 24px rgba(27,30,37,0.12)",
  shadowModal: "0 16px 48px rgba(27,30,37,0.18)",
};

export const CRATA_TOKENS: BrandTokens = {
  brand: "#0B6E69",
  brandWeak: "#DFF1EF",
  onBrand: "#FFFFFF",
  onBrand2: "#DFF1EF",
  heroLine: "rgba(255,255,255,0.24)",
  panel: "#EFF7F6",
  surface: "#FFFFFF",
  line: "#DEE9E8",
  controlLine: "#738C8A",
  ink: "#16201F",
  ink2: "#3C4B4A",
  muted: "#586C6A",
  chartAccent: "#00897B",
  chartMuted: "#C0CECC",
  // 진행 중은 청록 브랜드·초록 완료와 붙어 앉아서 청록이 아닌 파랑 단계(validate_palette: CVD 16.3 · 일반 20.1)
  chartProgress: "#5E8FD6",
  chartPalette: ["#00897B", ...CATEGORICAL_TAIL],
  shadowPop: "0 8px 24px rgba(22,32,31,0.12)",
  shadowModal: "0 16px 48px rgba(22,32,31,0.18)",
};
