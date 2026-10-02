// 현재 라우트 항목(매니페스트 행). PageGuard·문서 제목이 씁니다.
import { createContext, useContext } from "react";
import type { RouteEntry } from "@/routes/manifest";

export const RouteCtx = createContext<RouteEntry | null>(null);
export const useRouteEntry = () => useContext(RouteCtx);
