// 홈 위젯 mfg-field-report · 현장 등록 · 템플릿 action · 크기 M (빌드 스펙 3.1.1절). 소유: home 그룹.
// 큰 버튼 4개(불량·설비 이상·아차사고·기타) → /ops/report?kind=. 수치가 없어 '예시 데이터' 배지는 달지 않습니다.
import { Link } from "react-router";
import { ExceptionOutlined, FormOutlined, SafetyOutlined, ToolOutlined } from "@ant-design/icons";
import type { WidgetDef } from "@/components";
import "../lib/home.css";

const ACTIONS = [
  { kind: "defect", label: "불량", hint: "불량품·이상 품질", icon: <ExceptionOutlined aria-hidden /> },
  { kind: "equipment", label: "설비 이상", hint: "소음·정지·고장", icon: <ToolOutlined aria-hidden /> },
  { kind: "near_miss", label: "아차사고", hint: "다칠 뻔한 일", icon: <SafetyOutlined aria-hidden /> },
  { kind: "other", label: "기타", hint: "개선 제안·그 밖의 일", icon: <FormOutlined aria-hidden /> },
] as const;

const widget: WidgetDef = {
  id: "mfg-field-report",
  title: "현장 등록",
  size: "M",
  link: { label: "더보기", to: "/ops/report" },
  requires: { modules: ["mfg-quality"] },
  demo: false,
  emptyText: "현장 등록을 쓸 수 없어요",
  Body: () => (
    <div className="wh-actions" role="group" aria-label="현장 등록 종류">
      {ACTIONS.map((a) => (
        <Link key={a.kind} className="wh-action" to={`/ops/report?kind=${a.kind}`} aria-label={`${a.label} 등록하기`}>
          {a.icon}
          <span>{a.label}</span>
          <span>{a.hint}</span>
        </Link>
      ))}
    </div>
  ),
};

export default widget;
