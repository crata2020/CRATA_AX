// 공지 상세 `/company/notices/:noticeId` · C-09 · 깊이 A · 모듈 notices · 소유: collab 그룹
// 본문과 첨부 링크. 필독이고 아직 안 읽었으면 하단 고정 바 [확인했어요](rpc:mark_notice_read).
// 작성자·owner·admin은 확인 현황(Meter + 아직 확인하지 않은 사람)을 봅니다. 확인 여부는 평가에 쓰지 않아요.
import { useParams } from "react-router";
import { Button, Skeleton } from "antd";
import { CheckCircleOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { CardGrid, EmptyState, Meter, PageHeader, PersonChip, SectionCard } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { usePageReady } from "@/app/pageReady";
import { useList, useOne, useRpc } from "@/lib/refine";
import { formatDate } from "@/lib/format";
import { labelOf } from "@/lib/status";
import type { Notice, ReadReceipt } from "@/types/entities";
import { Caption, ExternalLink, isAdminish, isNotFound, noticeAudienceIds, noticeForMe, useProjects } from "../docs/shared/lib";

export default function Page() {
  const { noticeId = "" } = useParams();
  const { persona, tenant } = useWorksite();
  const me = persona.memberId;
  const q = useOne<Notice>({ resource: "notices", id: noticeId, queryOptions: { retry: false } });
  const notice = q.result;
  const { byId: projects } = useProjects(!!notice);
  const isAuthor = notice?.author_id === me;
  const canSeeStatus = !!notice && (isAuthor || isAdminish(persona));
  const mineQ = useList<ReadReceipt>({
    resource: "read_receipts", pagination: { mode: "off" },
    filters: [{ field: "notice_id", operator: "eq", value: noticeId }, { field: "member_id", operator: "eq", value: me }], queryOptions: { enabled: !!notice },
  });
  const allQ = useList<ReadReceipt>({ resource: "read_receipts", pagination: { mode: "off" }, filters: [{ field: "notice_id", operator: "eq", value: noticeId }], queryOptions: { enabled: canSeeStatus } });
  const mark = useRpc<{ ok: boolean; readAt: string }>("mark_notice_read", { successMessage: "확인했어요" });
  usePageReady(!q.query.isLoading && (!notice || !mineQ.query.isLoading));

  if (q.query.isLoading) {
    return (<><PageHeader title="공지" back={{ label: "공지", to: "/company/notices" }} /><Skeleton active paragraph={{ rows: 6 }} /></>);
  }
  if (q.query.isError || !notice) {
    return (
      <>
        <PageHeader title="공지" back={{ label: "공지", to: "/company/notices" }} />
        {isNotFound(q.query.error) || !notice
          ? <EmptyState kind="not_found" action={{ label: "공지 목록으로", to: "/company/notices" }} />
          : <EmptyState kind="error" action={{ label: "다시 시도", onClick: () => void q.query.refetch() }} />}
      </>
    );
  }

  const myReceipt = (mineQ.result?.data ?? [])[0];
  const forMe = noticeForMe(notice, persona, projects);
  const showBar = notice.must_read && !isAuthor && (forMe || !!myReceipt);
  const audience = noticeAudienceIds(notice, tenant.people, projects);
  const readers = new Set((allQ.result?.data ?? []).map((r) => r.member_id));
  const readCount = audience.filter((id) => readers.has(id)).length;
  const notYet = audience.filter((id) => !readers.has(id));

  return (
    <>
      <PageHeader
        title={notice.title}
        back={{ label: "공지", to: "/company/notices" }}
        meta={
          <>
            {notice.must_read && <span className="ws-tag ws-tag--brand">필독</span>}
            <span className="ws-tag">{labelOf("notices.category", notice.category)}</span>
            {notice.pinned && <span className="ws-tag">고정</span>}
            <PersonChip memberId={notice.author_id} size="sm" />
            <span className="cb-meta-text">{formatDate(notice.published_at)}</span>
          </>
        }
      />
      <CardGrid>
        <SectionCard title="본문" span={canSeeStatus && notice.must_read ? 8 : 12} caption={notice.expires_at ? `${formatDate(notice.expires_at)}까지 게시해요.` : undefined}>
          <p className="cb-body">{notice.body}</p>
          {notice.attachments.length > 0 && (
            <ul className="cb-attach" aria-label="첨부 링크">
              {notice.attachments.map((a) => <li key={a.url}><ExternalLink href={a.url}>{a.name}</ExternalLink></li>)}
            </ul>
          )}
        </SectionCard>
        {canSeeStatus && notice.must_read && (
          <SectionCard title="확인 현황" span={4} demo caption="확인 여부는 평가에 쓰지 않아요. 안내가 잘 닿았는지만 봐요.">
            <Meter label="확인한 사람" value={readCount} max={audience.length} valueText={`${readCount} / ${audience.length}명`} />
            <h3 className="cb-section-title cb-mt">아직 확인하지 않은 사람 {notYet.length}명</h3>
            {notYet.length ? (
              <ul className="cb-people">
                {notYet.map((id) => <li key={id}><PersonChip memberId={id} size="sm" /></li>)}
              </ul>
            ) : <p className="cb-caption">모두 확인했어요.</p>}
          </SectionCard>
        )}
      </CardGrid>
      {!notice.must_read && <Caption style={{ marginTop: 12 }}>필독이 아닌 공지라 확인을 남기지 않아요.</Caption>}
      {showBar && (
        <div className="cb-stickybar" role="region" aria-label="필독 확인">
          {myReceipt ? (
            <span><CheckCircleOutlined aria-hidden />{formatDate(myReceipt.read_at, false)}에 확인했어요.</span>
          ) : (
            <>
              <span><InfoCircleOutlined aria-hidden />이 공지는 필독이에요. 읽고 확인을 눌러 주세요.</span>
              <Button type="primary" loading={mark.isPending} onClick={() => void mark.run({ noticeId: notice.id }).catch(() => undefined)}>확인했어요</Button>
            </>
          )}
        </div>
      )}
    </>
  );
}
