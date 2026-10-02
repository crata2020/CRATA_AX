// 홈 히어로 '오늘 할 일' 내용(소유: home 그룹). H-01과 greeting 위젯이 함께 씁니다.
// 숫자 = 그 아래 줄의 합(heroModel.ts). 합에 넣지 않는 참고(진행 중인 내 업무, 작업자의 점검 전 설비)는 구분선 아래 작은 링크로.
import { Link } from "react-router";
import { RightOutlined } from "@ant-design/icons";
import { BigNumber } from "@/components";
import { formatNumber } from "@/lib/format";
import type { HomeToday } from "./types";
import { heroModel } from "./heroModel";

export function TodayHeroBody({ data }: { data: HomeToday }) {
  const m = heroModel(data);
  return (
    <div className="wh-hero">
      {m.total > 0 ? (
        <BigNumber value={m.total} unit="건" label={m.label} />
      ) : (
        <p className="wh-hero__empty">{data.mode === "operator" ? "오늘 작업지시가 아직 없어요." : "오늘 처리할 일이 없어요. 이번 주 업무를 미리 볼까요?"}</p>
      )}
      {m.total > 0 && (
        <ul className="wh-hero__rows" aria-label={`${m.label} 내역`}>
          {m.rows.map((r) => (
            <li key={r.key}>
              <Link className="wh-hero__row" to={r.to} aria-label={`${r.label} ${r.value}${r.unit} 보기`}>
                <span className="wh-hero__rowlabel">{r.label}</span>
                <span className="wh-hero__val">{formatNumber(r.value)}<small>{r.unit}</small></span>
                <RightOutlined aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {m.aside.length > 0 && (
        <ul className="wh-hero__aside" aria-label="참고">
          {m.aside.map((r) => (
            <li key={r.key}>
              <Link className="wh-hero__asidelink" to={r.to}>
                {r.label} <strong>{formatNumber(r.value)}{r.unit}</strong>
                <RightOutlined aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {m.total > 0 ? (
        <Link className="wh-hero-btn" to={m.button.to}>{m.button.label}</Link>
      ) : (
        <Link className="wh-hero-btn" to={data.mode === "operator" ? "/ops/report" : "/work?due=week"}>{data.mode === "operator" ? "현장 등록하기" : "이번 주 업무 보기"}</Link>
      )}
    </div>
  );
}

/** 인사말 아래 요약 한 줄 */
export function greetingSummary(d: HomeToday | undefined): string | undefined {
  if (!d) return undefined;
  if (d.mode === "operator" && d.workOrdersToday != null) {
    return d.workOrdersToday > 0 ? `오늘 작업지시 ${formatNumber(d.workOrdersToday)}건이 있어요.` : "오늘 작업지시가 아직 없어요.";
  }
  const parts: string[] = [];
  if (d.meetingsToday) parts.push(`오늘 회의 ${d.meetingsToday}건`);
  // 히어로 숫자와 같은 말('오늘 마감')을 써요. 오늘 마감이 없을 때만 이틀 안 마감을 알려요
  if (d.dueToday) parts.push(`오늘 마감 업무 ${d.dueToday}건`);
  else if (d.dueSoon) parts.push(`이틀 안 마감 업무 ${d.dueSoon}건`);
  if (d.mode === "reviewer" && d.reviewWaiting) parts.push(`검토 대기 ${d.reviewWaiting}건`);
  if (d.mode === "member" && d.returnedToMe) parts.push(`수정 요청 ${d.returnedToMe}건`);
  return parts.length ? `${parts.join(", ")}이 있어요.` : "오늘은 급한 일이 없어요.";
}
