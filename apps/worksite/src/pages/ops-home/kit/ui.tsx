// industry 그룹 화면이 함께 쓰는 작은 UI(소유: industry 그룹). 카드 안에 카드를 넣지 않습니다.
import type { ReactNode } from "react";
import { Button, Table, Tooltip, type TableColumnType } from "antd";
import { ExportOutlined } from "@ant-design/icons";
import { useWorksite } from "@/app/TenantBoundary";
import { ListRows, MaterialGradeTag, useInsideCard, type ListRowProps, type LinkTab } from "@/components";
import { useBreakpoint } from "@/lib/useBreakpoint";

/** 정보 표(라벨 · 값). 값이 비면 "—" */
export function Kv({ rows }: { rows: [label: string, value: ReactNode][] }) {
  return (
    <dl className="in-kv">
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: "contents" }}>
          <dt>{k}</dt>
          <dd>{v == null || v === "" ? "—" : v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** 재질: 색 견본 + 코드 글자(+ 한국어 이름) */
export function Material({ code, label }: { code: string | null | undefined; label?: string | null }) {
  if (!code) return <>—</>;
  // 태그와 글자를 한 줄에(표 칸에서 태그가 따로 윗줄로 올라가지 않게). 좁으면 글자만 말줄임
  return <span className="in-row" style={{ gap: 6, flexWrap: "nowrap", minWidth: 0 }}><MaterialGradeTag code={code} />{label && <span className="in-note ws-ellipsis" title={label}>{label}</span>}</span>;
}

export interface SimpleColumn<T> {
  key: string;
  title: string;
  render: (row: T) => ReactNode;
  align?: "left" | "right";
  width?: number | string;
}

/** 리소스가 아닌 묶음(합친 목록·계산 결과)을 보여 주는 작은 표. 모바일은 ListRow 목록 */
export function SimpleTable<T>({ rows, columns, rowKey, mobileRow, ariaLabel, onRowClick }: {
  rows: T[]; columns: SimpleColumn<T>[]; rowKey: (row: T) => string; mobileRow: (row: T) => ListRowProps; ariaLabel: string; onRowClick?: (row: T) => void;
}) {
  const bp = useBreakpoint();
  const inCard = useInsideCard();
  if (bp === "mobile") {
    return (
      <div className={inCard ? undefined : "ws-mobile-list"}>
        <ListRows ariaLabel={ariaLabel} rows={rows.map((r) => ({ key: rowKey(r), ...mobileRow(r), ...(onRowClick ? { onClick: () => onRowClick(r) } : {}) }))} />
      </div>
    );
  }
  const cols: TableColumnType<T>[] = columns.map((c) => ({ key: c.key, title: c.title, align: c.align, width: c.width, render: (_: unknown, r: T) => c.render(r) }));
  return (
    <div className={`${inCard ? "" : "ws-table-card "}ws-table`}>
      <Table<T>
        aria-label={ariaLabel}
        rowKey={rowKey}
        columns={cols}
        dataSource={rows}
        pagination={rows.length > 20 ? { pageSize: 20, showSizeChanger: false, position: ["bottomCenter"] } : false}
        scroll={{ x: "max-content" }}
        onRow={(r) => onRowClick ? { className: "is-clickable", tabIndex: 0, onClick: () => onRowClick(r), onKeyDown: (e) => { if (e.key === "Enter") onRowClick(r); } } : {}}
      />
    </div>
  );
}

/** 안전보건 하위 화면 링크 탭(I-18·19·20) */
export const SAFETY_TABS: LinkTab[] = [
  { key: "home", label: "현황", to: "/company/safety" },
  { key: "risk", label: "위험성평가", to: "/company/safety/risk" },
  { key: "review", label: "반기 점검", to: "/company/safety/review" },
];

/** 단계 번호 머리("1 무엇인가요?") */
export function StepHead({ no, children }: { no: number; children: ReactNode }) {
  return <h2 className="in-step"><span className="in-step__no" aria-hidden>{no}</span>{children}</h2>;
}

/** [내보내기]: owner·admin에게만, 데모에서는 꺼 둠("준비 중") */
export function ExportButton({ label = "내보내기" }: { label?: string }) {
  const { persona } = useWorksite();
  if (persona.role !== "owner" && persona.role !== "admin") return null;
  return (
    <Tooltip title="내보내기는 준비 중이에요">
      <span tabIndex={0} aria-label={`${label} 준비 중`}><Button icon={<ExportOutlined />} disabled>{label}</Button></span>
    </Tooltip>
  );
}

