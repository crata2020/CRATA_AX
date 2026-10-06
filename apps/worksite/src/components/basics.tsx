// 작은 공통 요소: PillLabel · DemoDataBadge · DdayBadge · SensitivityTag · AiTag · PriceGate · MaterialGradeTag · Banner · PrivateZone · CountBadge
import { LockOutlined, RobotOutlined, InfoCircleOutlined, WarningOutlined, ExportOutlined } from "@ant-design/icons";
import type { ReactNode } from "react";
import { Button, Popover, Tooltip } from "antd";
import { Link } from "react-router";
import { useWorksite } from "@/app/TenantBoundary";
import { ddayInfo } from "@/lib/format";
import { MATERIAL_SWATCHES } from "@/theme/tokens";
import { StatusTag } from "./StatusTag";

/** 알약 표시(화면당 3개 이하, [data-pill]로 셈). 카드 제목 안에서는 글자만(보통 카드 제목), 제목 밖에서는 조용한 회색 태그 */
export function PillLabel({ children }: { children: string }) {
  return <span className="ws-pill" data-pill>{children}</span>;
}

const DEMO_HINT = "실제 회사 값이 아닌 예시예요";
/** "예시 데이터" 표시. 상단 바(topbar, 옅은 알약)와 수치 카드 제목 줄(inline, 테두리 없는 작은 회색 글자)에 늘 붙입니다.
 *  둘 다 초점을 받아(Tab) 툴팁이 키보드·터치로도 열려요. 아주 좁은 카드 머리(240 이하)는 글자를 짧은 "예시"로 바꿔요(components.css).
 *  compact = 모바일 상단 바용 짧은 "예시" */
export function DemoDataBadge({ variant, compact }: { variant: "topbar" | "inline"; compact?: boolean }) {
  if (variant === "inline") {
    return (
      <Tooltip title={DEMO_HINT}>
        <span className="ws-demo-badge" data-demo-badge={variant} tabIndex={0} role="note" aria-label={`예시 데이터 · ${DEMO_HINT}`}>
          <InfoCircleOutlined aria-hidden /><span className="ws-demo-badge__text">예시 데이터</span><span className="ws-demo-badge__short" aria-hidden>예시</span>
        </span>
      </Tooltip>
    );
  }
  return (
    <Tooltip title={DEMO_HINT}>
      <span className={`ws-demo-badge ws-demo-badge--topbar${compact ? " ws-demo-badge--compact" : ""}`} data-demo-badge={variant} tabIndex={0} role="note" aria-label={`예시 데이터 · ${DEMO_HINT}`}>
        <InfoCircleOutlined aria-hidden />{compact ? "예시" : "예시 데이터"}
      </span>
    </Tooltip>
  );
}

/** 마감 D-day: "D-3"(neutral) · "D-1 내일 마감"·"오늘 마감"(warning) · "2일 지남"(critical). done이면 표시 안 함 */
export function DdayBadge({ date, noun = "마감", done }: { date: string | null | undefined; noun?: string; done?: boolean }) {
  const { today } = useWorksite();
  if (!date || done) return null;
  const d = ddayInfo(date, today, noun);
  return <StatusTag tone={d.tone} label={d.label} />;
}

const SENS_LABEL = { L0: "공개", L1: "내부", L2: "고객 비밀" } as const;
/** 데이터 등급 표시. L2(고객 비밀)만 자물쇠 + 툴팁 "AI 꺼짐(국내 경로 개통 전)" — 국내 처리 경로가 아직 없어서 AI 기능을 쓰지 않아요 */
export function SensitivityTag({ level }: { level: "L0" | "L1" | "L2" }) {
  const tag = (
    <span className="ws-tag">
      {level === "L2" && <LockOutlined aria-hidden />}
      {SENS_LABEL[level]}
      {level === "L2" && <span className="ws-sr-only"> · AI 꺼짐(국내 경로 개통 전)</span>}
    </span>
  );
  return level === "L2" ? <Tooltip title="고객 비밀 · AI 꺼짐(국내 경로 개통 전). 해외 AI로 보내지 않아요">{tag}</Tooltip> : tag;
}

const AI_LABEL = { draft: "AI 초안", summary: "AI 요약", submitted: "AI 연결로 제출" } as const;
/** AI가 만든 것 표시(인공지능기본법 생성물 표시) */
export function AiTag({ kind }: { kind: "draft" | "summary" | "submitted" }) {
  return <span className="ws-tag ws-tag--brand"><RobotOutlined aria-hidden />{AI_LABEL[kind]}</span>;
}

/** 단가·금액: view_prices 묶음이 없으면 "—" + 툴팁(공급자가 값도 지워서 보냄) */
export function PriceGate({ children }: { children: ReactNode }) {
  const { hasBundle } = useWorksite();
  if (hasBundle("view_prices")) return <>{children}</>;
  return (
    <Tooltip title="금액은 권한이 있는 사람만 볼 수 있어요">
      <span><span aria-hidden>—</span><span className="ws-sr-only">금액 가림(권한이 있는 사람만 볼 수 있어요)</span></span>
    </Tooltip>
  );
}

// 알루미늄은 "Al"이 Pretendard에서 "AI"처럼 보여서 "AL"로 씁니다(AI 제품 안이라 헷갈리지 않게)
const MATERIAL_ALIASES: Record<string, string> = { Copper: "Cu", Aluminium: "AL", Al: "AL", "Tinned Copper": "TCu", "Order Grade": "주문", "SUS304": "304", "SUS316": "316", "SUS321": "321", "SUS310S": "310S" };
/** 재질: 색 견본 8px + 코드 글자(색만으로 구별하지 않음) */
export function MaterialGradeTag({ code }: { code: string }) {
  const key = MATERIAL_ALIASES[code] ?? code;
  const color = MATERIAL_SWATCHES[key] ?? MATERIAL_SWATCHES["주문"];
  return <span className="ws-tag"><span className="ws-swatch" style={{ background: color }} aria-hidden />{key}</span>;
}

/** 데모에서 열 수 없는 바깥 원본(결재 원문·녹음 원문·저장소 파일) 링크. 끈 버튼 대신 눌리는 글자 링크 + 짧은 안내 팝오버.
 *  (회색 끈 버튼이 줄줄이 보이면 고장 난 화면처럼 읽혀요) */
export function DemoOnlyLink({ label, hint, size }: { label: string; hint: string; size?: "small" | "middle" }) {
  return (
    <Popover trigger="click" placement="bottomRight" content={<p className="ws-demo-pop">{hint}</p>} title="연동 후 열려요">
      <Button type="link" size={size} icon={<ExportOutlined aria-hidden />} onClick={(e) => e.stopPropagation()} aria-label={`${label}(연동 후 열려요)`} className="ws-demo-link">
        {label}
      </Button>
    </Popover>
  );
}

/** 안내 띠: 연동 미리보기·정책 꺼짐 등(tone info|warning). 카드가 아님 */
export function Banner({ tone = "info", title, children }: { tone?: "info" | "warning"; title?: string; children?: ReactNode }) {
  return (
    <div className="ws-banner" data-tone={tone} role="note">
      <span className="ws-banner__icon">{tone === "warning" ? <WarningOutlined aria-hidden /> : <InfoCircleOutlined aria-hidden />}</span>
      <div>
        {title && <span className="ws-banner__title">{title}</span>}
        {title && children ? " · " : null}
        {children}
      </div>
    </div>
  );
}

/** ARA 개인 영역 띠 + 경계. /ara/* 화면 맨 위에 둡니다(카드 아님) */
export function PrivateZone({ children }: { children: ReactNode }) {
  return (
    <div data-private-zone>
      <div className="ws-private" role="note">
        <LockOutlined aria-hidden />
        <span>나만 보여요. 회사·관리자는 이 화면을 볼 수 없어요.</span>
        <Link to="/ara/privacy">자세히 보기</Link>
      </div>
      {children}
    </div>
  );
}

/** 숫자 배지(ink 바탕 흰 글자). 0이면 숨김, 99 넘으면 "99+" */
export function CountBadge({ count, label }: { count: number | undefined; label?: string }) {
  if (!count) return null;
  return (
    <span className="ws-count">
      <span aria-hidden>{count > 99 ? "99+" : count}</span>
      <span className="ws-sr-only">{label ? `${label} ${count}건` : `${count}건`}</span>
    </span>
  );
}

/** 비활성 동작 + 이유(툴팁). 비활성 버튼은 초점을 못 받으니 감싼 span이 Tab 정지점이 되고,
 *  스크린리더는 "{label}: {reason}"(비활성)으로 읽어요 — 이유 없이 이름 없는 정지점만 생기던 문제(리뷰 3차) */
export function DisabledAction({ label, reason, children }: { label: string; reason: string; children: ReactNode }) {
  return (
    <Tooltip title={reason}>
      <span tabIndex={0} role="button" aria-disabled="true" aria-label={`${label}: ${reason}`} className="ws-disabled-action">{children}</span>
    </Tooltip>
  );
}
