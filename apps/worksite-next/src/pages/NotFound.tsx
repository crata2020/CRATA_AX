// 404: refs/fintech-invoicing-empty-state.jpg의 빈 상태(가운데 아이콘 원 + 한 줄 설명 + 동작 하나)를 흰 카드 안에 그렸어요.
import { useNavigate } from "react-router";
import { ArrowLeft, Home, SearchX } from "lucide-react";
import { Button, Empty, PageHead } from "@/ui";

export default function NotFound() {
  const nav = useNavigate();
  return (
    <>
      <PageHead
        title="화면을 찾을 수 없어요"
        desc="주소가 바뀌었거나 없는 화면이에요."
        actions={<Button icon={<ArrowLeft />} onClick={() => nav(-1)}>이전으로</Button>}
      />
      <section className="card" style={{ padding: "48px 20px" }}>
        <Empty icon={<SearchX />} title="이 주소에는 화면이 없어요">
          <span className="muted small">왼쪽 메뉴에서 고르거나 홈으로 돌아가세요.</span>
          <Button variant="dark" icon={<Home />} style={{ marginTop: 8 }} onClick={() => nav("/")}>홈으로</Button>
        </Empty>
      </section>
    </>
  );
}
