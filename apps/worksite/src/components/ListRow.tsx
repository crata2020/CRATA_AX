// ListRow: 목록 한 줄(최소 높이 --ws-row-h 52, compact 40). to를 주면 링크, onClick이면 버튼. 여러 줄은 <ListRows>로 감싸 1px --ws-sunken 구분선.
// 행 안 버튼은 채우지 않아요: 주 동작 Button className="ws-rowact"(흰 알약, 브랜드 글자), 보조 type="text" className="ws-rowact-text".
import type { ReactNode } from "react";
import { Link } from "react-router";

export interface ListRowProps {
  /** 왼쪽 아이콘은 범주 구분일 때만 */
  leading?: ReactNode;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  to?: string;
  onClick?: () => void;
  /** 안 읽음: 점 + "안 읽음" 글자 */
  unread?: boolean;
  /** 접근성 이름(기본은 title) */
  ariaLabel?: string;
  /** 줄 오른쪽 밖의 따로 누르는 동작(전화·메일 링크 등). 줄 링크·버튼 안에 넣지 않아요(누를 것 안에 누를 것 금지) */
  action?: ReactNode;
}

export function ListRow({ action, ...rest }: ListRowProps) {
  if (!action) return <ListRowBody {...rest} />;
  return <div className="ws-listrow-wrap"><ListRowBody {...rest} /><span className="ws-listrow__action">{action}</span></div>;
}

function ListRowBody({ leading, title, subtitle, trailing, to, onClick, unread, ariaLabel }: Omit<ListRowProps, "action">) {
  const inner = (
    <>
      {leading && <span className="ws-listrow__leading" aria-hidden>{leading}</span>}
      <span className="ws-listrow__main">
        <span className="ws-listrow__title">{title}</span>
        {subtitle && <span className="ws-listrow__sub">{subtitle}</span>}
      </span>
      {(trailing || unread) && (
        <span className="ws-listrow__trailing">
          {trailing}
          {unread && <span className="ws-unread">안 읽음</span>}
        </span>
      )}
    </>
  );
  if (to) return <Link className="ws-listrow" to={to} onClick={onClick} aria-label={ariaLabel}>{inner}</Link>;
  if (onClick) return <button type="button" className="ws-listrow" onClick={onClick} aria-label={ariaLabel}>{inner}</button>;
  return <div className="ws-listrow">{inner}</div>;
}

/** ListRow 묶음(ul, 행 사이 1px 선). 비면 empty를 그림 */
export function ListRows({ rows, empty, ariaLabel }: { rows: (ListRowProps & { key?: string })[]; empty?: ReactNode; ariaLabel?: string }) {
  if (!rows.length) return <>{empty ?? null}</>;
  return (
    <ul className="ws-list" aria-label={ariaLabel}>
      {rows.map(({ key, ...r }, i) => <li key={key ?? `${r.title}-${i}`}><ListRow {...r} /></li>)}
    </ul>
  );
}
