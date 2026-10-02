// 화면 구간: mobile(≤767) · tablet(768~1279) · desktop(1280~1439) · wide(≥1440). antd Grid 브레이크포인트는 쓰지 않습니다.
import { useSyncExternalStore } from "react";
import { BREAKPOINTS } from "@/theme/tokens";

export type Breakpoint = "mobile" | "tablet" | "desktop" | "wide";

function compute(): Breakpoint {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w <= BREAKPOINTS.mobileMax) return "mobile";
  if (w <= BREAKPOINTS.tabletMax) return "tablet";
  if (w <= BREAKPOINTS.desktopMax) return "desktop";
  return "wide";
}

function subscribe(cb: () => void) {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
}

export function useBreakpoint(): Breakpoint {
  return useSyncExternalStore(subscribe, compute, () => "desktop");
}

export const isMobile = (bp: Breakpoint) => bp === "mobile";
export const isDesktopUp = (bp: Breakpoint) => bp === "desktop" || bp === "wide";
