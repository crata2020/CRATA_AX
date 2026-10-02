// 현장 등록 `/ops/report` · I-07 · 깊이 A · 모듈 mfg-quality · TR 전용 · 소유: industry 그룹
// 불량·설비 이상·아차사고·기타를 사진 이름과 한 줄로 30초 안에 남깁니다(모바일 하단 탭 가운데).
// 등록 → rpc:create_field_report(종류별 연결 행 + 공장장 알림). 검토자 이상은 '오늘 현장 기록' 탭에서 담당을 정합니다.
import { PageHeader } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { useUrlParam } from "@/lib/url";
import { Register } from "./Register";
import { Feed } from "./Feed";
import "../ops-home/kit/industry.css";

export default function Page() {
  const { can } = useWorksite();
  const reviewer = can("field_reports", "approve").can;
  const [tab] = useUrlParam("tab", "new");
  const showFeed = reviewer && tab === "feed";
  return (
    <>
      <PageHeader
        title="현장 등록"
        description={showFeed ? "들어온 기록에 담당을 정하면 담당에게 알림이 가요." : "사진 한 장과 한 줄이면 돼요."}
        tabs={reviewer ? [{ key: "new", label: "등록", to: "?tab=new" }, { key: "feed", label: "오늘 현장 기록", to: "?tab=feed" }] : undefined}
      />
      {showFeed ? <Feed /> : <Register />}
    </>
  );
}
