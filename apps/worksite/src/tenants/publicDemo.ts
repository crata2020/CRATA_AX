// 외부 공유용 미리보기 빌드(vite --mode public, .env.public) 여부.
// 실존 회사 식별 정보는 빌드 때 tr-technology.identity.public.ts로 통째로 바뀌어 번들에 들어가지 않아요(vite.config.ts).
export const PUBLIC_DEMO = import.meta.env.VITE_PUBLIC_DEMO === "1";
