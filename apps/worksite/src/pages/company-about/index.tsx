// 회사 소개 `/company/about` · C-14 · 깊이 C · 모듈 company-info · 소유: collab 그룹
// 비전·연혁·인증·연락처를 공개 정보만으로 보여 줍니다. TR은 공개 자료(홈페이지·회사소개서, 2016년 기준)를 옮겼고,
// CRATA는 Company DNA 작성 전이라 비워 두고 '작성 전'으로 표시합니다(지어내지 않음). owner·admin에게 [Company DNA에서 고치기].
import { useNavigate } from "react-router";
import { Button } from "antd";
import { CardGrid, Divider, EmptyState, PageHeader, PersonChip, SectionCard, StatusTag, Timeline } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { usePageReady } from "@/app/pageReady";
import { useList, useOne } from "@/lib/refine";
import type { BusinessLine, CompanyInfo } from "@/types/entities";
import { Caption, ExternalLink, KeyValue, isAdminish } from "../docs/shared/lib";


export default function Page() {
  const { tenant, persona } = useWorksite();
  const nav = useNavigate();
  const infoQ = useOne<CompanyInfo>({ resource: "company_info", id: "company", queryOptions: { retry: false } });
  const linesQ = useList<BusinessLine>({ resource: "business_lines", pagination: { mode: "off" }, sorters: [{ field: "sort_order", order: "asc" }] });
  usePageReady(!infoQ.query.isLoading);
  const info = infoQ.result;
  const facts = tenant.facts;
  const isTr = tenant.slug === "tr-technology";
  const editBtn = isAdminish(persona) ? <Button onClick={() => nav("/admin/settings")}>회사 설정에서 고치기</Button> : undefined;

  if (infoQ.query.isLoading) {
    return (<><PageHeader title="회사 소개" /><div style={{ minHeight: 200 }} aria-busy="true" /></>);
  }

  if (!isTr) {
    const lines = linesQ.result?.data ?? [];
    const todo = (label: string) => [label, <StatusTag tone="neutral" label="작성 전" />] as [string, React.ReactNode];
    return (
      <>
        <PageHeader title="회사 소개" description="회사 소개는 CRATA Company DNA를 만든 뒤 채워요. 지금은 사업 구조만 보여 줘요." actions={editBtn} />
        <CardGrid>
          <SectionCard title="사업" span={12} caption="사업 구조는 회의 분류 체계(v0.2)를 따른 내부 적용 가안이에요.">
            {lines.length ? (
              <ul className="cb-rows" aria-label="사업 목록">
                {lines.map((l) => (
                  <li key={l.id}>
                    <div className="cb-row">
                      <div className="cb-row__main">
                        <span className="cb-row__title">{l.name} <span className="ws-tag">{l.code}</span></span>
                        <span className="cb-meta-text">{l.description}</span>
                      </div>
                      <div className="cb-row__actions"><PersonChip memberId={l.owner_member_id} size="sm" /></div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <EmptyState kind="empty" compact title="사업 구조가 아직 없어요" />}
          </SectionCard>
          <SectionCard title="개요" span={6}>
            <KeyValue items={[...facts.overview.map((o) => [o.label, o.value] as [string, React.ReactNode]), todo("주소"), todo("대표 연락처"), todo("연혁"), todo("인증")]} />
          </SectionCard>
          <SectionCard title="채울 것" span={6} caption="지어낸 값을 넣지 않아요. 확인한 공개 정보만 채워요.">
            <ul className="cb-rows">
              {facts.todo.map((t) => <li key={t}><div className="cb-row" style={{ paddingBlock: 10 }}><div className="cb-row__main"><span className="cb-meta-text">{t}</span></div></div></li>)}
            </ul>
          </SectionCard>
        </CardGrid>
      </>
    );
  }

  const sources = Object.values(facts.sources ?? {}).map((s) => s.title);
  return (
    <>
      <PageHeader
        title="회사 소개"
        description="공개 자료(홈페이지·회사소개서, 2016년 기준)를 옮겼어요. 현재 값은 진단에서 확인해요."
        actions={editBtn}
      />
      <CardGrid>
        <SectionCard title="개요" span={6}>
          <KeyValue
            items={[
              ...facts.overview.map((o) => [o.label, o.value] as [string, React.ReactNode]),
              ["홈페이지", info?.website ? <ExternalLink href={info.website}>{info.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</ExternalLink> : "—"],
            ]}
          />
        </SectionCard>
        <SectionCard title="비전" span={6}>
          {facts.vision ? (
            <>
              <p className="cb-mission">{facts.vision.mission}</p>
              <ul className="cb-pillars">
                {facts.vision.pillars.map((p) => <li key={p.key}><b>{p.key}</b><span>{p.text}</span></li>)}
              </ul>
            </>
          ) : <EmptyState kind="empty" compact title="비전이 아직 없어요" />}
        </SectionCard>
        <SectionCard title="연혁" span={6}>
          {facts.history?.length ? (
            <Timeline order="asc" relative={false} dense ariaLabel="연혁" items={facts.history.map((h, i) => ({ id: `h-${i}`, at: h.date.replace("-", "."), title: h.event, tone: "neutral" as const }))} />
          ) : <EmptyState kind="empty" compact title="연혁이 아직 없어요" />}
        </SectionCard>
        <SectionCard title="인증" span={6} caption="공개 자료에 언급된 인증이에요. 지금도 유효한지는 진단에서 확인해요.">
          <ul className="cb-rows" aria-label="인증">
            {(facts.certifications ?? []).map((c) => (
              <li key={c.name}>
                <div className="cb-row">
                  <div className="cb-row__main">
                    <span className="cb-row__title">{c.name}</span>
                    <span className="cb-caption">{c.stated}</span>
                  </div>
                  <div className="cb-row__actions"><StatusTag tone="neutral" label="현재 상태 확인 필요" /></div>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard title="공정·제품·재질" span={12}>
          <div className="cb-cols">
            <section aria-label="공정">
              <h3 className="cb-section-title">공정 {facts.processes?.length ?? 0}단계</h3>
              <ol className="cb-attach" style={{ marginTop: 0, paddingLeft: 18 }}>
                {(facts.processes ?? []).map((p) => <li key={p} className="cb-meta-text" style={{ color: "var(--ws-ink)" }}>{p}</li>)}
              </ol>
            </section>
            <section aria-label="제품 카테고리">
              <h3 className="cb-section-title">제품 카테고리 {facts.productCategories?.length ?? 0}개</h3>
              <ul className="cb-taglist">{(facts.productCategories ?? []).map((p) => <li key={p}><span className="ws-tag">{p}</span></li>)}</ul>
            </section>
            <section aria-label="재질">
              <h3 className="cb-section-title">재질 {facts.materialGrades?.length ?? 0}종</h3>
              <ul className="cb-taglist">{(facts.materialGrades ?? []).map((m) => <li key={m}><span className="ws-tag">{m}</span></li>)}</ul>
            </section>
          </div>
          {facts.equipmentPublic?.length ? (
            <>
              <Divider />
              <h3 className="cb-section-title">공개된 설비</h3>
              <ul className="cb-taglist" aria-label="공개된 설비">
                {facts.equipmentPublic.map((e) => <li key={e.kind}><span className="ws-tag" title={e.note}>{e.kind} {e.countPublic ?? "—"}대</span></li>)}
              </ul>
              <Caption style={{ marginTop: 8 }}>편조 장치 대수는 홈페이지 기준이에요(회사소개서 2016년 값과 달라 진단에서 확인해요).</Caption>
            </>
          ) : null}
        </SectionCard>
      </CardGrid>
      {sources.length > 0 && <Caption style={{ marginTop: 16 }}>출처: {sources.join(" · ")}</Caption>}
    </>
  );
}
