// 404: 위치 표시와 같은 틀 안에서 상황 한 줄 + 다음 행동 버튼(인사 앱 NotFound를 줄인 것)
import { useLocation, useNavigate } from "react-router";
import { ArrowLeft, House, SearchX } from "lucide-react";
import { Button, Card, Empty, PageHead } from "@/ui";

export default function NotFound() {
  const nav = useNavigate();
  const loc = useLocation();
  return (
    <>
      <PageHead title="화면을 찾을 수 없어요" desc="주소가 바뀌었거나 없는 화면이에요." />
      <Card>
        <Empty icon={<SearchX />} title="이 주소에는 화면이 없어요">
          <p className="muted small" style={{ overflowWrap: "anywhere" }}><span className="num">#{loc.pathname}</span> 대신 홈에서 시작해요.</p>
          <div className="row" style={{ gap: 10, marginTop: 16, justifyContent: "center" }}>
            <Button icon={<ArrowLeft />} onClick={() => nav(-1)}>이전으로</Button>
            <Button variant="dark" icon={<House />} onClick={() => nav("/")}>홈으로</Button>
          </div>
        </Empty>
      </Card>
    </>
  );
}
