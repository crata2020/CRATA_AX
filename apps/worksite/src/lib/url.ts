// URL 상태 도우미. 목록 상태(필터·탭·보기·서랍·기간)는 URL에 남깁니다(빌드 스펙 2.6절).
// 해시 라우팅이라 쿼리는 "#/work?tab=review" 안에 있습니다(react-router useSearchParams가 읽음).
import { useCallback } from "react";
import { useSearchParams } from "react-router";

/** 쿼리 하나: const [tab, setTab] = useUrlParam("tab", "overview") */
export function useUrlParam(name: string, fallback = ""): [string, (v: string | null) => void] {
  const [params, setParams] = useSearchParams();
  const value = params.get(name) ?? fallback;
  const set = useCallback(
    (v: string | null) => {
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        if (v == null || v === "") next.delete(name); else next.set(name, v);
        return next;
      }, { replace: true });
    },
    [name, setParams],
  );
  return [value, set];
}

/** 여러 값(쉼표 구분): ?status=todo,in_progress */
export function useUrlList(name: string): [string[], (v: string[]) => void] {
  const [raw, set] = useUrlParam(name);
  const list = raw ? raw.split(",").filter(Boolean) : [];
  return [list, (v) => set(v.length ? v.join(",") : null)];
}

/** 열린 서랍: ?selected=<id> / 만들기는 ?selected=new */
export function useSelectedParam() {
  return useUrlParam("selected");
}

/** 데모 매개변수(해시 앞 쿼리): ?tenant=&as=&today=&latency=&persist=&empty= */
export function readBootParams() {
  const q = new URLSearchParams(window.location.search);
  return {
    tenant: q.get("tenant"),
    as: q.get("as"),
    today: q.get("today"),
    latency: q.get("latency"),
    persist: q.get("persist"),
    empty: q.get("empty"),
  };
}

/** 해시 앞 쿼리를 바꾸고 새로고침(테넌트·인물 전환: 공급자·캐시를 새로 만듦) */
export function reloadWithBootParams(patch: Record<string, string | null>, hash?: string) {
  const url = new URL(window.location.href);
  for (const [k, v] of Object.entries(patch)) {
    if (v == null) url.searchParams.delete(k); else url.searchParams.set(k, v);
  }
  if (hash != null) url.hash = hash;
  if (url.search !== window.location.search) {
    // 쿼리가 바뀌면 이동 자체가 새로 불러오기입니다
    window.location.assign(url.toString());
  } else {
    if (hash != null) window.location.hash = hash;
    window.location.reload();
  }
}
