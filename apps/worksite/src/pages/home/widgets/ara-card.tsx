// 홈 위젯 ara-card · 나의 ARA · 템플릿 private · 크기 S (빌드 스펙 3.1.1절). 소유: home 그룹.
// ara 공급자(본인 데이터만)에서 내 카드 첫 문장을 읽고 [ARA와 이야기하기]를 보여 줍니다. 다른 사람 데이터는 읽지 않습니다.
// 동의 전이면 시작 안내를 보여 줍니다. 회사 공급자·감사 로그를 거치지 않습니다.
import { Link } from "react-router";
import { LockOutlined } from "@ant-design/icons";
import type { WidgetDef } from "@/components";
import { useList } from "@/lib/refine";
import { usePageReady } from "@/app/pageReady";
import type { AraCardSentence, AraProfile } from "@/types/entities";
import { WidgetError } from "../lib/widgetKit";
import "../lib/home.css";

function AraCardBody() {
  const profile = useList<AraProfile>({ resource: "ara_profile", dataProviderName: "ara", pagination: { mode: "off" } });
  const cards = useList<AraCardSentence>({ resource: "ara_card_sentences", dataProviderName: "ara", sorters: [{ field: "order", order: "asc" }], pagination: { mode: "off" } });
  const loading = profile.query.isLoading || cards.query.isLoading;
  usePageReady(!loading);
  if (loading) return <div style={{ minHeight: 72 }} aria-busy="true" />;
  if (profile.query.isError || cards.query.isError) return <WidgetError onRetry={() => { void profile.query.refetch(); void cards.query.refetch(); }} />;
  const consented = !!profile.result?.data?.[0]?.consented_at;
  const first = cards.result?.data?.[0]?.text;
  return (
    <div>
      <p className="wh-ara__lock"><LockOutlined aria-hidden />나만 보여요</p>
      {consented && first ? (
        <>
          <p className="wh-ara__quote">“{first}”</p>
          <Link className="wh-linkbtn wh-linkbtn--primary" to="/ara/coach">ARA와 이야기하기</Link>
        </>
      ) : (
        <>
          <p className="wh-ara__quote">ARA를 시작하면 내 일하는 방식 카드가 여기에 보여요.</p>
          <Link className="wh-linkbtn wh-linkbtn--primary" to="/ara">ARA 시작하기</Link>
        </>
      )}
    </div>
  );
}

const widget: WidgetDef = {
  id: "ara-card",
  title: "나의 ARA",
  size: "S",
  link: { label: "더보기", to: "/ara" },
  requires: { modules: ["ara-wellbeing"] },
  demo: false,
  emptyText: "ARA를 시작하면 내 카드가 여기에 보여요",
  Body: () => <AraCardBody />,
};

export default widget;
