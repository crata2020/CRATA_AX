// 구성원 `/company/people` · C-12 · 깊이 A · 모듈 org-members · 소유: collab 그룹
// 사람을 찾고 바로 연락합니다(업무 연락처 복사). 근로자명부 항목(주민번호·주소·급여)은 필드 자체가 없어요.
// URL: ?unit=<조직 id>(조직도에서 옴) · ?selected=<구성원 id> 서랍(참여 프로젝트 · 본인이 공유한 일하는 방식 문장)
import { useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "antd";
import { MailOutlined, PhoneOutlined, TeamOutlined } from "@ant-design/icons";
import { CopyField, DataTable, DetailDrawer, FilterBar, PageHeader, PersonChip, useFilterBarState, type FilterBarProps } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { useList, useOne } from "@/lib/refine";
import { useSelectedParam } from "@/lib/url";
import { initialsOf } from "@/lib/format";
import { labelOf } from "@/lib/status";
import type { Member, WorkStyleCard } from "@/types/entities";
import { Caption, KeyValue, isAdminish, useProjects } from "../docs/shared/lib";

function PersonDrawer({ memberId, onClose }: { memberId: string | null; onClose: () => void }) {
  const { tenant, persona, isModuleOn } = useWorksite();
  const nav = useNavigate();
  const q = useOne<Member>({ resource: "members", id: memberId ?? "", queryOptions: { enabled: !!memberId, retry: false } });
  const m = memberId ? q.result : undefined;
  const { projects } = useProjects(!!m);
  const cards = useList<WorkStyleCard>({
    resource: "work_style_cards", pagination: { mode: "off" }, filters: [{ field: "member_id", operator: "eq", value: memberId ?? "" }],
    queryOptions: { enabled: !!m && isModuleOn("ara-wellbeing") },
  });
  const sentences = (cards.result?.data ?? []).filter((c) => !c.revoked_at);
  const joined = m ? projects.filter((p) => p.owner_member_id === m.id || p.reviewer_member_id === m.id || p.member_ids.includes(m.id)) : [];
  const unit = m ? tenant.orgUnits.find((u) => u.id === m.org_unit_id)?.name : undefined;
  const self = m?.id === persona.memberId;
  return (
    <DetailDrawer
      open={!!m}
      title={m?.display_name ?? "구성원"}
      onClose={onClose}
      footer={self ? <Button type="primary" onClick={() => nav("/me")}>내 정보 고치기</Button> : undefined}
    >
      {m && (
        <>
          <div className="cb-profile">
            <span className="ws-avatar ws-avatar--lg" aria-hidden>{initialsOf(m.display_name)}</span>
            <div>
              <div className="cb-profile__name">{m.display_name}</div>
              <div className="cb-meta-text">{unit} · {m.job_title}</div>
            </div>
          </div>
          <section className="cb-drawer-section">
            <KeyValue
              items={[
                ["조직", unit ?? "—"],
                ["직함", m.job_title],
                ["담당 업무", m.duties ?? "—"],
                ["업무 전화", <CopyField value={m.phone_work} label="업무 전화" />],
                ["메일", <CopyField value={m.email} label="메일 주소" />],
              ]}
            />
          </section>
          <section className="cb-drawer-section">
            <h3>참여 프로젝트 {joined.length}개</h3>
            {joined.length ? (
              <ul className="cb-rows">
                {joined.map((p) => (
                  <li key={p.id}>
                    <div className="cb-row" style={{ paddingBlock: 10 }}>
                      <div className="cb-row__main">
                        <Link to={`/projects/${p.id}`}>{p.name}</Link>
                        <span className="cb-caption">{p.code} · {p.owner_member_id === m.id ? "담당" : p.reviewer_member_id === m.id ? "검토자" : "구성원"}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="cb-caption">내가 볼 수 있는 참여 프로젝트가 없어요.</p>}
          </section>
          {isModuleOn("ara-wellbeing") && (
            <section className="cb-drawer-section">
              <h3>일하는 방식</h3>
              {sentences.length ? (
                <>
                  <ul className="cb-attach" style={{ marginTop: 0 }}>
                    {sentences.map((c) => <li key={c.id} className="cb-quote">{c.sentence}</li>)}
                  </ul>
                  <Caption style={{ marginTop: 8 }}>본인이 골라 {labelOf("work_style_cards.share_scope", sentences[0]!.share_scope)}에 공유한 문장이에요. 평가에 쓰지 않아요.</Caption>
                </>
              ) : <p className="cb-caption">{self ? "ARA에서 일하는 방식 문장을 골라 공유할 수 있어요." : "공유한 일하는 방식 문장이 없어요."}</p>}
            </section>
          )}
        </>
      )}
    </DetailDrawer>
  );
}

export default function Page() {
  const { tenant, persona } = useWorksite();
  const nav = useNavigate();
  const [selected, setSelected] = useSelectedParam();
  const unitName = useMemo(() => new Map(tenant.orgUnits.map((u) => [u.id, u.name])), [tenant]);
  const titles = [...new Set(tenant.people.map((p) => p.jobTitle))];
  const fbProps: FilterBarProps = {
    search: { placeholder: "이름·담당 업무 검색", fields: ["display_name", "duties", "job_title"] },
    chips: [{ param: "unit", field: "org_unit_id", options: [...tenant.orgUnits].sort((a, b) => a.sortOrder - b.sortOrder).map((u) => ({ value: u.id, label: u.name })), ariaLabel: "조직" }],
    selects: [{ param: "title", label: "직함", field: "job_title", options: titles.map((t) => ({ value: t, label: t })) }],
  };
  const fb = useFilterBarState(fbProps);
  const count = useList<Member>({ resource: "members", pagination: { mode: "off" }, filters: [{ field: "status", operator: "eq", value: "active" }] }).result?.data.length;
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <>
      <PageHeader
        title="구성원"
        description="사람을 찾고 바로 연락해요."
        meta={count != null ? <span className="cb-meta-text"><TeamOutlined aria-hidden /> {count}명</span> : undefined}
        actions={isAdminish(persona) ? <Button onClick={() => nav("/admin/members")}>구성원 관리</Button> : undefined}
      />
      <FilterBar {...fbProps} />
      <DataTable<Member>
        resource="members"
        ariaLabel="구성원 목록"
        filters={[{ field: "status", operator: "eq", value: "active" }, ...fb.filters]}
        isFiltered={fb.active}
        onClearFilters={fb.clear}
        sorters={[{ field: "org_order", order: "asc" }]}
        pageSize={30}
        onRowClick={(m) => setSelected(m.id)}
        columns={[
          // 연락처(전화·메일)가 잘리지 않게 고정 폭을 주고, 남는 폭은 담당 업무가 가져요. 직함은 조직과 거의 같아 칸을 빼고 서랍·필터에만 둬요
          { key: "display_name", title: "이름", width: 220, render: (m) => <PersonChip memberId={m.id} size="sm" /> },
          { key: "org_unit_id", title: "조직", width: 160, render: (m) => <span className="ws-ellipsis">{unitName.get(m.org_unit_id) ?? "—"}</span> },
          { key: "duties", title: "담당 업무", flex: true },
          { key: "phone_work", title: "업무 전화", width: 168, render: (m) => <span onClick={stop} onKeyDown={stop}><CopyField value={m.phone_work} label="업무 전화" iconOnly /></span> },
          { key: "email", title: "메일", width: 236, render: (m) => <span onClick={stop} onKeyDown={stop}><CopyField value={m.email} label="메일 주소" iconOnly /></span> },
        ]}
        mobileRow={(m) => ({
          leading: <span className="ws-avatar" aria-hidden>{initialsOf(m.display_name)}</span>,
          title: m.display_name,
          subtitle: `${unitName.get(m.org_unit_id) ?? ""} · ${m.phone_work}`,
          action: (
            <>
              <a href={`tel:${m.phone_work.replace(/[^0-9+]/g, "")}`} aria-label={`${m.display_name} 업무 전화 걸기`}><PhoneOutlined aria-hidden /><span>전화</span></a>
              <a href={`mailto:${m.email}`} aria-label={`${m.display_name}에게 메일 쓰기`}><MailOutlined aria-hidden /></a>
            </>
          ),
        })}
        empty={{ kind: "filtered", title: "조건에 맞는 사람이 없어요" }}
      />
      <Caption style={{ marginTop: 12 }}>연락처는 업무용만 보여요. 모든 이름과 연락처는 예시예요.</Caption>
      <PersonDrawer memberId={selected || null} onClose={() => setSelected(null)} />
    </>
  );
}
