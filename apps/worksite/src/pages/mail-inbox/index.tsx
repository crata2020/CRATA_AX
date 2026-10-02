// 메일 제안 `/work/mail` · C-07 · 깊이 B · 모듈 mail-connector · 소유: collab 그룹
// 연동 미리보기: 본인 메일을 거래처·프로젝트로 분류하고 후속 업무를 제안합니다. 메일 본문은 저장하지 않고 제목·보낸 곳·분류만 보여요.
// 탭 ?tab=: classified(분류됨) · suggestions(후속 업무 제안) · unclassified(미분류). 모든 역할이 본인 메일만 봅니다(공급자가 거름).
import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Button, Select, Switch } from "antd";
import { ApiOutlined, LockOutlined } from "@ant-design/icons";
import { Banner, CardGrid, DataTable, EmptyState, PageHeader, SectionCard, StatusTag, DisabledAction } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { usePageReady } from "@/app/pageReady";
import { useList, useRpc, useUpdate } from "@/lib/refine";
import { formatDateTime, formatRelative } from "@/lib/format";
import type { MailConnection, MailLink, Partner } from "@/types/entities";
import { Caption, KeyValue, isAdminish, useProjects } from "../docs/shared/lib";

type Tab = "classified" | "suggestions" | "unclassified";
const BY_LABEL: Record<string, string> = { rule: "규칙", ai: "AI", manual: "직접" };

export default function Page() {
  const { persona, clock, personas, switchPersona } = useWorksite();
  // 예시 메일이 있는 인물(TR 영업·생산 담당, CRATA 강의·워크샵 리드)
  const demoMailPersona = personas.find((p) => p.id !== persona.memberId && (p.id === "m-tr-sales" || p.id === "m-cr-edu-lead"));
  const nav = useNavigate();
  const [params] = useSearchParams();
  const tab = (["classified", "suggestions", "unclassified"].includes(params.get("tab") ?? "") ? params.get("tab") : "classified") as Tab;
  const { projects, byId } = useProjects();
  const partnersQ = useList<Partner>({ resource: "partners", pagination: { mode: "off" } });
  const partnerName = useMemo(() => new Map((partnersQ.result?.data ?? []).map((p) => [p.id, p.name])), [partnersQ.result]);
  const connQ = useList<MailConnection>({ resource: "mail_connections", pagination: { mode: "off" } });
  const linksQ = useList<MailLink>({ resource: "mail_links", pagination: { mode: "off" }, sorters: [{ field: "received_at", order: "desc" }] });
  usePageReady(!connQ.query.isLoading && !linksQ.query.isLoading);
  const { mutateAsync: update } = useUpdate();
  const createTask = useRpc<{ ok: boolean; taskId: string }>("create_task_from_mail", { successMessage: "업무로 만들었어요" });
  const [busy, setBusy] = useState<string | null>(null);

  const conn = (connQ.result?.data ?? []).find((c) => !c.revoked_at);
  const links = linksQ.result?.data ?? [];
  const proposed = links.filter((l) => l.suggestion && l.suggestion_status === "proposed");
  const handled = links.filter((l) => l.suggestion && l.suggestion_status !== "proposed");
  const unclassified = links.filter((l) => !l.project_id);

  const setShared = (l: MailLink, on: boolean) => void update({
    resource: "mail_links", id: l.id, values: { shared_to_project: on },
    successNotification: () => ({ type: "success", message: on ? "프로젝트에 공유했어요. 프로젝트 구성원이 제목과 보낸 곳을 볼 수 있어요" : "공유를 껐어요" }),
  }).catch(() => undefined);
  const setProject = (l: MailLink, projectId: string) => void update({
    resource: "mail_links", id: l.id, values: { project_id: projectId, classified_by: "manual", confidence: null },
    successNotification: () => ({ type: "success", message: `${byId.get(projectId)?.name ?? "프로젝트"}로 분류했어요` }),
  }).catch(() => undefined);
  const dismiss = async (l: MailLink) => {
    setBusy(l.id);
    await update({ resource: "mail_links", id: l.id, values: { suggestion_status: "dismissed" }, successNotification: () => ({ type: "success", message: "제안을 건너뛰었어요" }) }).catch(() => undefined);
    setBusy(null);
  };
  const accept = async (l: MailLink) => {
    setBusy(l.id);
    const res = await createTask.run({ mailLinkId: l.id }).catch(() => null);
    setBusy(null);
    if (res?.taskId) nav(`/work/tasks/${res.taskId}`);
  };

  const banner = <Banner title="연동 미리보기">실제 메일은 연결하지 않았어요. 연결하면 본문은 저장하지 않고 제목·보낸 곳·분류만 보여요.</Banner>;
  const policyCard = isAdminish(persona) && (
    <SectionCard title="회사 정책" span={12} caption="관리자도 다른 사람의 메일 목록은 볼 수 없어요.">
      <KeyValue
        items={[
          ["허용 제공자", "IMAP · 구글 메일 · 마이크로소프트 365 · 네이버웍스(2단계)"],
          ["권한", "읽기만(보내기·지우기 없음)"],
          ["본문", "저장하지 않아요. 제목·보낸 곳·받은 시각·분류만 남겨요"],
          ["공유", "본인이 고른 메일만 프로젝트에 보여요"],
        ]}
      />
    </SectionCard>
  );

  if (connQ.query.isLoading || linksQ.query.isLoading) {
    return (<><PageHeader title="메일 제안" />{banner}<div style={{ minHeight: 200 }} aria-busy="true" /></>);
  }

  if (!conn && links.length === 0) {
    return (
      <>
        <PageHeader title="메일 제안" />
        {banner}
        <CardGrid>
          <SectionCard title="내 메일 연결" span={12}>
            <EmptyState
              kind="empty" compact title="아직 메일을 연결하지 않았어요" description="메일 연결은 2단계에서 열려요. 연결해도 본문은 저장하지 않아요."
              // 데모: 메일 예시가 있는 인물로 바로 바꿔 볼 수 있게(메일 → 후속 업무 흐름을 기본 데모 경로에서도 보여 주려고)
              secondaryAction={demoMailPersona ? { label: `예시 메일 보기: ${demoMailPersona.displayName}로 바꾸기`, onClick: () => switchPersona(demoMailPersona.roleCode) } : undefined}
            />
            <div style={{ display: "flex", justifyContent: "center" }}>
              <DisabledAction label="}>메일 연결하기" reason={"메일 연결은 2단계에서 열려요"}><Button disabled icon={<ApiOutlined aria-hidden />}>메일 연결하기</Button></DisabledAction>
            </div>
          </SectionCard>
          {policyCard}
        </CardGrid>
      </>
    );
  }

  const fromCell = (l: MailLink) => (
    <span className="cb-title-cell">
      {l.partner_id ? <span className="ws-tag">{partnerName.get(l.partner_id) ?? "거래처"}</span> : null}
      <span className="cb-meta-text">{l.from_address}</span>
    </span>
  );

  return (
    <>
      <PageHeader
        title="메일 제안"
        description="내 메일을 거래처·프로젝트로 나누고, 할 일이 보이면 업무를 제안해요."
        tabs={[
          { key: "classified", label: "분류됨", to: "?tab=classified" },
          { key: "suggestions", label: "후속 업무 제안", to: "?tab=suggestions", badge: proposed.length },
          { key: "unclassified", label: "미분류", to: "?tab=unclassified", badge: unclassified.length },
        ]}
      />
      {banner}
      <CardGrid>
        <SectionCard title="내 메일 연결" span={12}>
          <div className="cb-row" style={{ padding: 0 }}>
            <div className="cb-row__main">
              <span className="cb-row__title">{conn?.account_label ?? "예시 메일 계정"}</span>
              <span className="cb-meta">
                <StatusTag tone="info" label="미리보기" />
                <span className="cb-meta-text"><LockOutlined aria-hidden /> 읽기만 · 마지막 확인 {formatDateTime(conn?.last_checked_at ?? null)}</span>
              </span>
            </div>
            <div className="cb-row__actions">
              <DisabledAction label="연결 끊기" reason={"데모에서는 연결을 끊지 않아요"}><Button disabled>연결 끊기</Button></DisabledAction>
            </div>
          </div>
        </SectionCard>

        {tab === "suggestions" ? (
          <SectionCard title={`후속 업무 제안(${proposed.length})`} span={12} caption="업무로 만들면 담당은 나, 검토자는 프로젝트 검토자로 정해요. 메일 본문은 업무에 넣지 않아요.">
            {proposed.length === 0 ? (
              <EmptyState kind="empty" compact title="처리할 제안이 없어요" description="할 일이 보이는 메일이 오면 여기에 제안해요." />
            ) : (
              <ul className="cb-rows" aria-label="후속 업무 제안">
                {proposed.map((l) => (
                  <li key={l.id}>
                    <div className={`cb-row${busy === l.id ? " is-busy" : ""}`}>
                      <div className="cb-row__main">
                        <span className="cb-row__title">{l.suggestion} → 업무로 만들까요?</span>
                        <span className="cb-meta-text">메일: {l.subject}</span>
                        <span className="cb-meta">
                          {l.partner_id && <span className="ws-tag">{partnerName.get(l.partner_id)}</span>}
                          {l.project_id && <span className="ws-tag ws-tag--brand">{byId.get(l.project_id)?.name ?? "프로젝트"}</span>}
                          <span className="cb-caption">{formatRelative(l.received_at, clock.now())}</span>
                        </span>
                      </div>
                      <div className="cb-row__actions">
                        <Button disabled={!!busy} onClick={() => void dismiss(l)}>건너뛰기</Button>
                        {l.project_id
                          ? <Button type="primary" disabled={!!busy} loading={busy === l.id && createTask.isPending} onClick={() => void accept(l)}>업무로 만들기</Button>
                          : <DisabledAction label="업무로 만들기" reason={"먼저 미분류 탭에서 프로젝트를 골라 주세요"}><Button type="primary" disabled>업무로 만들기</Button></DisabledAction>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {handled.length > 0 && (
              <>
                <h3 className="cb-section-title cb-mt">처리한 제안</h3>
                <ul className="cb-rows" aria-label="처리한 제안">
                  {handled.map((l) => (
                    <li key={l.id}>
                      <div className="cb-row" style={{ paddingBlock: 10 }}>
                        <div className="cb-row__main">
                          <span className="cb-meta-text">{l.suggestion}</span>
                          <span className="cb-caption">메일: {l.subject}</span>
                        </div>
                        <div className="cb-row__actions">
                          {l.suggestion_status === "accepted"
                            ? <>{<StatusTag tone="good" label="업무로 만듦" />}{l.suggested_task_id && <Link to={`/work/tasks/${l.suggested_task_id}`} className="ws-card__more">업무 보기</Link>}</>
                            : <StatusTag tone="neutral" label="건너뜀" />}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </SectionCard>
        ) : tab === "unclassified" ? (
          <SectionCard title={`미분류(${unclassified.length})`} span={12} caption="프로젝트를 고르면 '직접' 분류로 남고, 비슷한 메일은 다음부터 규칙으로 나눠요.">
            <DataTable<MailLink>
              resource="mail_links"
              syncWithLocation={false}
              ariaLabel="미분류 메일"
              filters={[{ field: "project_id", operator: "null", value: true }]}
              sorters={[{ field: "received_at", order: "desc" }]}
              columns={[
                { key: "subject", title: "제목", kind: "name" },
                { key: "from_address", title: "보낸 곳", width: 232, render: fromCell },
                { key: "received_at", title: "받은 시각", width: 120, render: (l) => <span className="cb-tabular cb-nowrap">{formatRelative(l.received_at, clock.now())}</span> },
                {
                  key: "pick", title: "프로젝트", width: 232,
                  render: (l) => (
                    <Select aria-label={`${l.subject} 프로젝트 고르기`} placeholder="프로젝트 고르기" style={{ minWidth: 200 }} showSearch optionFilterProp="label"
                      options={projects.map((p) => ({ value: p.id, label: p.name }))} onChange={(v: string) => setProject(l, v)} />
                  ),
                },
              ]}
              mobileRow={(l) => ({
                title: l.subject,
                subtitle: `${l.partner_id ? `${partnerName.get(l.partner_id)} · ` : ""}${l.from_address} · ${formatRelative(l.received_at, clock.now())}`,
                trailing: (
                  <Select aria-label="프로젝트 고르기" placeholder="프로젝트" style={{ width: 120 }} options={projects.map((p) => ({ value: p.id, label: p.name }))} onChange={(v: string) => setProject(l, v)}
                    onClick={(e) => e.stopPropagation()} />
                ),
              })}
              empty={{ kind: "empty", compact: true, title: "미분류 메일이 없어요", description: "모든 메일이 프로젝트로 나뉘었어요." }}
            />
          </SectionCard>
        ) : (
          <SectionCard title={`분류됨(${links.length - unclassified.length})`} span={12} caption="공유한 메일만 프로젝트 상세의 '메일'에 보여요. 고객 비밀(L2) 프로젝트는 공유를 신중히 켜 주세요.">
            <DataTable<MailLink>
              resource="mail_links"
              syncWithLocation={false}
              ariaLabel="분류된 메일"
              filters={[{ field: "project_id", operator: "nnull", value: true }]}
              sorters={[{ field: "received_at", order: "desc" }]}
              columns={[
                { key: "subject", title: "제목", kind: "name" },
                { key: "from_address", title: "보낸 곳", width: 232, render: fromCell },
                { key: "project_id", title: "프로젝트", width: 220, render: (l) => { const n = byId.get(l.project_id ?? "")?.name ?? "—"; return <span className="ws-tag ws-tag--brand ws-tag--fit" title={n}><span className="ws-ellipsis">{n}</span></span>; } },
                {
                  key: "classified_by", title: "분류", width: 140,
                  render: (l) => <span className="cb-tabular cb-nowrap">{BY_LABEL[l.classified_by ?? ""] ?? "—"}{l.confidence != null ? ` · 신뢰도 ${Math.round(l.confidence * 100)}%` : ""}</span>,
                },
                { key: "received_at", title: "받은 시각", width: 120, render: (l) => <span className="cb-tabular cb-nowrap">{formatRelative(l.received_at, clock.now())}</span> },
                {
                  key: "shared_to_project", title: "프로젝트에 공유", width: 120,
                  render: (l) => <Switch size="small" checked={l.shared_to_project} aria-label={`${l.subject} 프로젝트에 공유`} onChange={(on) => setShared(l, on)} />,
                },
              ]}
              mobileRow={(l) => ({
                title: l.subject,
                subtitle: `${byId.get(l.project_id ?? "")?.name ?? "—"} · ${BY_LABEL[l.classified_by ?? ""] ?? ""} · ${formatRelative(l.received_at, clock.now())}`,
                trailing: <Switch size="small" checked={l.shared_to_project} aria-label="프로젝트에 공유" onChange={(on, e) => { e.stopPropagation(); setShared(l, on); }} />,
              })}
              empty={{ kind: "empty", compact: true, title: "분류된 메일이 없어요", description: "규칙이나 AI가 프로젝트를 찾으면 여기에 보여요." }}
            />
          </SectionCard>
        )}
        {policyCard}
      </CardGrid>
      <Caption style={{ marginTop: 12 }}>모든 숫자와 메일 제목은 예시예요. 실제 메일 연동은 하지 않았어요.</Caption>
    </>
  );
}
