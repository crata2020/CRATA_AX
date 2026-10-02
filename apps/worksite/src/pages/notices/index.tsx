// 공지 `/company/notices` · C-08 · 깊이 A · 모듈 notices · 소유: collab 그룹
// 회사 공지·규정 변경·안전 공지를 알리고, 필독은 확인을 남깁니다. 고정 공지는 위에 따로 보여 줘요.
// 목록은 나에게 온 공지(대상) + 내가 쓴 공지(관리자는 전체). 작성자·관리자는 확인 현황(확인 7/12)을 봅니다.
// [+ 공지 쓰기](검토자 이상, ?selected=new) → rpc:create_notice(대상에게 알림)
import { useMemo } from "react";
import { PushpinOutlined, PlusOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { DataTable, FilterBar, ListRows, PageHeader, PersonChip, SectionCard, StatusTag, useFilterBarState, type FilterBarProps } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { usePageReady } from "@/app/pageReady";
import { useList } from "@/lib/refine";
import { useSelectedParam } from "@/lib/url";
import { formatDate } from "@/lib/format";
import { labelOf, optionsOf } from "@/lib/status";
import type { Notice, ReadReceipt } from "@/types/entities";
import { isAdminish, noticeAudienceIds, noticeForMe, useProjects } from "../docs/shared/lib";
import { NoticeComposeDrawer } from "./ComposeDrawer";

export default function Page() {
  const { persona, can, clock, tenant } = useWorksite();
  const [selected, setSelected] = useSelectedParam();
  const { byId: projects, isLoading: projectsLoading } = useProjects();
  const canWrite = can("notices", "create").can;
  const admin = isAdminish(persona);
  const me = persona.memberId;

  const fbProps: FilterBarProps = {
    search: { placeholder: "공지 검색", fields: ["title", "body"] },
    chips: [
      { param: "cat", field: "category", options: optionsOf("notices.category"), multiple: true, ariaLabel: "분류" },
      { param: "must", field: "must_read", options: [{ value: "true", label: "필독만" }], multiple: true, ariaLabel: "필독" },
    ],
  };
  const fb = useFilterBarState(fbProps);

  const allQ = useList<Notice>({ resource: "notices", pagination: { mode: "off" }, sorters: [{ field: "published_at", order: "desc" }] });
  const receiptsQ = useList<ReadReceipt>({ resource: "read_receipts", pagination: { mode: "off" } });
  usePageReady(!allQ.query.isLoading && !projectsLoading);
  const now = clock.now();

  const visible = useMemo(() => (allQ.result?.data ?? []).filter((n) => {
    const mine = n.author_id === me;
    if (n.published_at > now && !mine && !admin) return false;
    if (n.expires_at && n.expires_at < now && !mine && !admin) return false;
    return admin || mine || noticeForMe(n, persona, projects);
  }), [allQ.result, me, admin, now, persona, projects]);
  const ids = visible.map((n) => n.id);
  const receipts = receiptsQ.result?.data ?? [];
  const myRead = new Set(receipts.filter((r) => r.member_id === me).map((r) => r.notice_id));
  const showStatus = admin || visible.some((n) => n.author_id === me);
  const readCount = (n: Notice) => {
    const audience = new Set(noticeAudienceIds(n, tenant.people, projects));
    return { read: receipts.filter((r) => r.notice_id === n.id && audience.has(r.member_id)).length, total: audience.size };
  };
  const pinned = visible.filter((n) => n.pinned);

  const myCell = (n: Notice) => {
    if (!n.must_read) return <span className="ws-muted">—</span>;
    if (n.author_id === me) return <span className="cb-meta-text">작성자</span>;
    return myRead.has(n.id) ? <StatusTag tone="good" label="확인함" /> : <StatusTag tone="warning" label="확인 전" />;
  };
  const statusCell = (n: Notice) => {
    if (!(admin || n.author_id === me) || !n.must_read) return <span className="ws-muted">—</span>;
    const c = readCount(n);
    return <span className="cb-tabular cb-nowrap">확인 {c.read}/{c.total}</span>;
  };
  const titleCell = (n: Notice) => (
    <span className="cb-title-cell">
      <span className="ws-cell-name">{n.title}</span>
      {n.must_read && <span className="ws-tag ws-tag--brand">필독</span>}
      {n.published_at > now && <StatusTag tone="info" label={`${formatDate(n.published_at, false)} 게시 예정`} />}
    </span>
  );

  return (
    <>
      <PageHeader
        title="공지"
        description="회사 공지·규정 변경·안전 공지를 알려요. 필독 공지는 읽고 '확인했어요'를 눌러 주세요."
        actions={canWrite ? <Button type="primary" icon={<PlusOutlined aria-hidden />} onClick={() => setSelected("new")}>공지 쓰기</Button> : undefined}
      />
      <FilterBar {...fbProps} />
      {pinned.length > 0 && !fb.active && (
        <SectionCard title="고정 공지" as="section" className="cb-pinned" ariaLabel="고정 공지">
          <ListRows
            rows={pinned.map((n) => ({
              key: n.id,
              leading: <PushpinOutlined />,
              title: n.title,
              subtitle: `${labelOf("notices.category", n.category)} · ${formatDate(n.published_at, false)}`,
              trailing: <span className="ws-row" style={{ flexWrap: "nowrap" }}><span className="ws-tag">고정</span>{n.must_read && !myRead.has(n.id) && n.author_id !== me && <StatusTag tone="warning" label="확인 전" />}</span>,
              to: `/company/notices/${n.id}`,
            }))}
          />
        </SectionCard>
      )}
      <div style={pinned.length > 0 && !fb.active ? { marginTop: 24 } : undefined}>
        {!allQ.query.isLoading && (
          <DataTable<Notice>
        resource="notices"
            ariaLabel="공지 목록"
            filters={[{ field: "id", operator: "in", value: ids.length ? ids : ["__none__"] }, ...fb.filters]}
            isFiltered={fb.active}
            onClearFilters={fb.clear}
            sorters={[{ field: "published_at", order: "desc" }]}
            rowHref={(n) => `/company/notices/${n.id}`}
            columns={[
              { key: "title", title: "제목", flex: true, render: titleCell },
              { key: "category", title: "분류", render: (n) => <span className="ws-tag">{labelOf("notices.category", n.category)}</span> },
              { key: "author_id", title: "작성자", width: 184, render: (n) => <PersonChip memberId={n.author_id} size="sm" /> },
              { key: "published_at", title: "게시일", sortable: true, render: (n) => <span className="cb-tabular cb-nowrap">{formatDate(n.published_at, false)}</span> },
              { key: "mine", title: "내 확인", render: myCell },
              ...(showStatus ? [{ key: "status", title: "확인 현황", render: statusCell }] : []),
            ]}
            mobileRow={(n) => ({
              title: n.title,
              subtitle: [labelOf("notices.category", n.category), n.must_read ? "필독" : null, formatDate(n.published_at, false)].filter(Boolean).join(" · "),
              trailing: n.must_read && n.author_id !== me ? myCell(n) : undefined,
            })}
            empty={{ kind: "empty", title: "아직 공지가 없어요", description: canWrite ? "회사에 알릴 일이 있으면 공지를 써 주세요." : "새 공지가 올라오면 알려 드려요.", action: canWrite ? { label: "공지 쓰기", onClick: () => setSelected("new") } : undefined }}
          />
        )}
      </div>
      {selected === "new" && canWrite && <NoticeComposeDrawer open onClose={() => setSelected(null)} />}
    </>
  );
}
