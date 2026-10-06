// 반기 점검 `/company/safety/review` · I-20 · 깊이 A · 모듈 safety-health · TR 전용 · 소유: industry 그룹
// 중대재해처벌법 시행령 제4조·제5조의 반기 점검 항목(SH 코드)을 증빙과 함께 확인하고, 대표가 마지막으로 확인합니다.
// [확인하기]는 admin·reviewer(+owner), [대표 확인하기](rpc:confirm_semiannual_review)는 owner만. 조치 필요 항목은 업무로 만들 수 있어요.
import { useEffect, useState } from "react";
import { Button, Checkbox, Form, Input, Radio, Tooltip } from "antd";
import { CheckOutlined, PaperClipOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { DdayBadge, DetailDrawer, Divider, EmptyState, Meter, PageHeader, PersonChip, SectionCard, StatusTag, DisabledAction } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { usePageReady } from "@/app/pageReady";
import { useRpc, useUpdate } from "@/lib/refine";
import { useSelectedParam, useUrlParam } from "@/lib/url";
import { kstIso, addDays } from "@/lib/clock";
import { formatDate } from "@/lib/format";
import { labelOf, statusOf } from "@/lib/status";
import type { LegalCalendarItem, SemiannualReview } from "@/types/entities";
import { asRow, useRows } from "../ops-home/kit/data";
import { Kv, SAFETY_TABS } from "../ops-home/kit/ui";
import "../ops-home/kit/industry.css";

interface CheckValues { result: "ok" | "action_needed" | "not_applicable"; findings?: string; actions?: string; evidence?: string }

export default function Page() {
  const { today, persona, can, tenant } = useWorksite();
  const year = today.slice(0, 4);
  const defaultHalf = `${year}-${Number(today.slice(5, 7)) >= 7 ? "H2" : "H1"}`;
  const [half] = useUrlParam("half", defaultHalf);
  const [selected, setSelected] = useSelectedParam();
  const rows = useRows<SemiannualReview>("semiannual_reviews", { filters: [{ field: "half", operator: "eq", value: half }], sorters: [{ field: "id", order: "asc" }] });
  const lcs = useRows<LegalCalendarItem>("legal_calendar_items", { filters: [{ field: "kind", operator: "eq", value: "semiannual_review" }] });
  usePageReady(!rows.isLoading && !lcs.isLoading);
  const lc = lcs.rows.find((l) => l.id === `lc-tr-${half.toLowerCase().replace("-", "")}`);
  const checked = rows.rows.filter((r) => r.result !== "pending").length;
  const confirmed = lc?.status === "done";
  const owner = persona.role === "owner";
  const canCheck = (r: SemiannualReview) => persona.role !== "member" && can("semiannual_reviews", "edit", asRow(r)).can && !confirmed;
  const cur = selected ? rows.rows.find((r) => r.id === selected) ?? null : null;
  const { mutateAsync: update, mutation } = useUpdate<SemiannualReview>();
  const confirm = useRpc<{ ok: boolean }>("confirm_semiannual_review", { successMessage: "대표 확인을 남겼어요. 반기 점검 일정을 완료로 바꿨어요." });
  const makeTask = useRpc<{ ok: boolean }>("create_linked_task", { successMessage: "조치 업무를 만들었어요" });
  const [form] = Form.useForm<CheckValues>();
  const [withTask, setWithTask] = useState(false);
  const result = Form.useWatch("result", form);

  useEffect(() => {
    if (!cur) return;
    form.resetFields();
    setWithTask(false);
    form.setFieldsValue({ result: cur.result === "pending" ? "ok" : cur.result, findings: cur.findings ?? undefined, actions: cur.actions ?? undefined, evidence: cur.evidence_ref ?? undefined });
  }, [cur?.id, form]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!cur) return;
    const v = await form.validateFields();
    await update({
      resource: "semiannual_reviews", id: cur.id,
      values: { result: v.result, findings: v.findings?.trim() || null, actions: v.result === "action_needed" ? v.actions?.trim() || null : null, evidence_ref: v.evidence?.trim() || null, checked_on: today, checked_by: persona.memberId },
      successNotification: () => ({ type: "success", message: `${cur.item}을(를) '${labelOf("semiannual_reviews.result", v.result)}'(으)로 확인했어요` }),
    });
    if (v.result === "action_needed" && withTask) {
      const project = tenant.businessStructure.flatMap((b) => b.projects).find((p) => p.code.startsWith("SAFE-") && p.status === "active");
      await makeTask.run({
        title: `${cur.item} 조치: ${(v.actions ?? cur.title ?? "").slice(0, 40)}`, projectId: project?.id, assigneeId: tenant.people.find((p) => p.roleCode === "R_ADMIN_PUR_ACC")?.id ?? persona.memberId,
        reviewerId: tenant.people.find((p) => p.roleCode === "R_CEO")?.id, dueAt: lc ? kstIso(addDays(lc.due_on, -2), "18:00") : null, source: "manual", sourceRef: cur.id, description: `반기 점검 ${half} ${cur.item} ${cur.title ?? ""}`,
      });
    }
    setSelected(null);
  };

  const halves = [`${year}-H1`, `${year}-H2`];
  return (
    <>
      <PageHeader
        title="반기 점검"
        description="시행령 반기 점검 항목을 증빙과 함께 확인하고, 대표가 마지막으로 확인해요."
        tabs={SAFETY_TABS}
        period={{ ariaLabel: "반기", urlParam: "half", value: defaultHalf, onChange: () => undefined, options: halves.map((h) => ({ value: h, label: `${h.slice(0, 4)} ${h.endsWith("H1") ? "상반기" : "하반기"}` })) }}
      />
      {!rows.isLoading && !rows.rows.length ? (
        <EmptyState kind="empty" title="이 반기의 점검 기록이 없어요" description="다른 반기를 골라 보세요." />
      ) : (
        <>
          <SectionCard title="SH 항목" demo caption="기록과 일정을 돕는 도구예요. 법률 해석은 전문가 확인이 필요해요.">
            <div className="in-row in-row--between in-mb">
              <div style={{ flex: "1 1 280px", maxWidth: 420 }}>
                <Meter label="확인한 항목" value={checked} max={rows.rows.length || 1} valueText={`${rows.rows.length}개 항목 중 ${checked}개 확인`} tone={checked === rows.rows.length ? "good" : undefined} />
              </div>
              {lc && (
                <span className="in-row">
                  <span className="in-note">기한 {formatDate(lc.due_on)}</span>
                  {confirmed ? <StatusTag tone="good" label="대표 확인 완료" /> : <DdayBadge date={lc.due_on} />}
                </span>
              )}
            </div>
            <ul className="in-rows" aria-label="반기 점검 항목">
              {rows.rows.map((r) => (
                <li key={r.id} className="in-sh">
                  <span className="in-sh__code">{r.item}</span>
                  <div className="in-line__main">
                    <span className="in-line__title">{r.title ?? r.item}</span>
                    <span className="in-line__meta">{r.basis}{r.findings ? ` · ${r.findings}` : ""}</span>
                  </div>
                  {/* 증빙: 한 줄 말줄임(아이콘은 글자 앞에 붙여서), 전체 이름은 툴팁 */}
                  <span className="in-line__meta in-sh__wide in-sh__file">
                    {r.evidence_ref ? (
                      <Tooltip title={r.evidence_ref}>
                        <span className="in-sh__fileName" tabIndex={0}><PaperClipOutlined aria-hidden /> {r.evidence_ref}</span>
                      </Tooltip>
                    ) : <span>증빙 없음</span>}
                  </span>
                  <span className="in-line__meta in-sh__wide in-sh__who">
                    {r.checked_on ? <><span className="in-num">{formatDate(r.checked_on, false)}</span>{r.checked_by ? <PersonChip memberId={r.checked_by} size="sm" /> : null}</> : "확인 전"}
                  </span>
                  <span className="in-row in-sh__wide" style={{ justifyContent: "flex-end" }}>
                    <StatusTag {...statusOf("semiannual_reviews.result", r.result)} />
                    {canCheck(r) && <Button className="ws-rowact" icon={<CheckOutlined />} onClick={() => setSelected(r.id)}>확인하기</Button>}
                  </span>
                </li>
              ))}
            </ul>
          </SectionCard>
          {owner ? (
            <div className="in-bar" role="region" aria-label="대표 확인">
              <span className="in-note">{confirmed ? "이 반기는 대표 확인을 마쳤어요." : checked === rows.rows.length ? "모든 항목을 확인했어요." : `확인 전 항목이 ${rows.rows.length - checked}개 남았어요.`}</span>
              {!confirmed && (checked === rows.rows.length
                ? <Button type="primary" icon={<SafetyCertificateOutlined />} loading={confirm.isPending} onClick={() => void confirm.run({ half })}>대표 확인하기</Button>
                : <DisabledAction label="대표 확인하기" reason={"모든 항목을 확인하면 켜져요"}><Button type="primary" icon={<SafetyCertificateOutlined />} disabled>대표 확인하기</Button></DisabledAction>)}
            </div>
          ) : (
            <p className="in-caption in-mt">{confirmed ? "대표 확인을 마친 반기예요." : "모든 항목을 확인하면 대표가 최종 확인해요."}{persona.role === "member" ? " 구성원은 읽기만 할 수 있어요." : ""}</p>
          )}
        </>
      )}

      <DetailDrawer open={!!cur} onClose={() => setSelected(null)} title={cur ? `${cur.item} 확인` : "항목 확인"} closeLabel="취소" footer={<Button type="primary" loading={mutation.isPending || makeTask.isPending} onClick={() => void save()}>확인하기</Button>}>
        {cur && (
          <div className="in-stack">
            <Kv rows={[["근거", cur.basis], ["확인할 것", cur.title], ["지난 확인", cur.checked_on ? formatDate(cur.checked_on) : "없음"]]} />
            <Divider />
            <Form form={form} layout="vertical" requiredMark="optional">
              <Form.Item name="result" label="결과" rules={[{ required: true }]}>
                <Radio.Group optionType="button" options={[{ value: "ok", label: "이상 없음" }, { value: "action_needed", label: "조치 필요" }, { value: "not_applicable", label: "해당 없음" }]} />
              </Form.Item>
              <Form.Item name="findings" label="확인 내용"><Input.TextArea rows={2} maxLength={200} /></Form.Item>
              {result === "action_needed" && (
                <>
                  <Form.Item name="actions" label="조치" rules={[{ required: true, whitespace: true, message: "조치를 적어 주세요" }]}><Input.TextArea rows={2} maxLength={200} /></Form.Item>
                  <Checkbox checked={withTask} onChange={(e) => setWithTask(e.target.checked)}>업무로 만들기(총무·구매·경리 담당, 검토 대표)</Checkbox>
                </>
              )}
              <Form.Item name="evidence" label="증빙" className="in-mt"><Input maxLength={120} placeholder="예: 증빙_SH-08_훈련기록.pdf" /></Form.Item>
            </Form>
          </div>
        )}
      </DetailDrawer>
    </>
  );
}
