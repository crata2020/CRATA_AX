// 찾을 수 없음 `*` · H-07 · 깊이 C · 모듈 home-dashboard · 소유: home 그룹
// 목적: 없는 경로에 대한 빈 상태와 홈으로 돌아가기
// 할 일: 빌드 스펙(docs/worksite/00_build-spec.md) 3장 H-07 블록대로 채웁니다. 이 폴더(src/pages/not-found/) 안만 고칩니다.
// 쓰는 것: 공통 컴포넌트 "@/components", 데이터는 Refine 훅 "@/lib/refine"(useList·useOne·useRpc·useSelector), 표·폼 훅은 "@/lib/refineAntd"(useTable·useForm·useDrawerForm·useSelect), 문맥 "@/app/TenantBoundary"(useWorksite).
// 라우트가 이미 PageGuard(모듈·권한)로 감싸 줍니다. 데이터를 불러오면 usePageReady(!isLoading)를 불러 주세요(@/app/pageReady).
import { EmptyState } from "@/components";

export default function NotFoundPage() {
  return (
    <EmptyState
      kind="not_found"
      headingLevel={1}
      title="페이지를 찾을 수 없어요"
      description="주소를 확인하거나 홈으로 돌아가 주세요."
      action={{ label: "홈으로", to: "/" }}
    />
  );
}
