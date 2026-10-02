// 현장 등록 폼(I-07 등록 탭). 모바일 우선, 데스크톱은 가운데 560px.
// 사진은 파일 이름만 남기고 이미지 데이터는 저장하지 않습니다(미리보기는 이 화면에서만).
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { Button, Input, Select, Switch } from "antd";
import { AlertOutlined, WarningOutlined, CameraOutlined, CheckCircleOutlined, EllipsisOutlined, ToolOutlined } from "@ant-design/icons";
import { EmptyState, ListRows, SectionCard, StatusTag } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { usePageReady } from "@/app/pageReady";
import { useRpc } from "@/lib/refine";
import { readJson, writeJson } from "@/lib/storage";
import { formatRelative } from "@/lib/format";
import { labelOf, statusOf, type StatusValue } from "@/lib/status";
import type { Equipment, FieldReport, ProcessStep } from "@/types/entities";
import { useModuleRows, useRows } from "../ops-home/kit/data";
import { StepHead } from "../ops-home/kit/ui";

type Kind = StatusValue<"field_reports.kind">;
const KINDS: { value: Kind; label: string; icon: React.ReactNode }[] = [
  // 불량은 제품 경고 표시(소프트웨어 '버그' 그림은 공장에서 어색해요)
  { value: "defect", label: "불량", icon: <WarningOutlined aria-hidden /> },
  { value: "equipment", label: "설비 이상", icon: <ToolOutlined aria-hidden /> },
  { value: "near_miss", label: "아차사고", icon: <AlertOutlined aria-hidden /> },
  { value: "other", label: "기타", icon: <EllipsisOutlined aria-hidden /> },
];
/** 공정 칩: 편조 · 크림핑 · 프레스 성형 · 스파이럴링 · 출하 */
const STEP_CHIPS: { code: string; label: string }[] = [
  { code: "P20", label: "편조" }, { code: "P31", label: "크림핑" }, { code: "P32", label: "프레스 성형" }, { code: "P33", label: "스파이럴링" }, { code: "P40", label: "출하" },
];
const RECENT_KEY = "ws:v1:industry:recent-equipment";

export function Register() {
  const { persona, clock } = useWorksite();
  const [params] = useSearchParams();
  const initialKind = (KINDS.some((k) => k.value === params.get("kind")) ? params.get("kind") : null) as Kind | null;
  const steps = useModuleRows<ProcessStep>("mfg-master-data", "process_steps", { sorters: [{ field: "sequence", order: "asc" }] });
  const equipment = useModuleRows<Equipment>("mfg-equipment", "equipment", { sorters: [{ field: "equipment_no", order: "asc" }] });
  const mine = useRows<FieldReport>("field_reports", { filters: [{ field: "reported_by", operator: "eq", value: persona.memberId }], sorters: [{ field: "reported_at", order: "desc" }] });
  usePageReady(!steps.isLoading && !equipment.isLoading);

  const [kind, setKind] = useState<Kind | null>(initialKind);
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<{ name: string; url: string } | null>(null);
  const [stepId, setStepId] = useState<string | null>(null);
  const [eqKind, setEqKind] = useState<string | null>(null);
  const [eqId, setEqId] = useState<string | null>(params.get("equipment"));
  const [anonymous, setAnonymous] = useState(false);
  const [done, setDone] = useState<{ id: string; notified: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mineRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;
  const { run, isPending } = useRpc<{ ok: boolean; id: string; notified: number }>("create_field_report");

  // ?equipment=로 들어오면 종류도 맞춰 둠
  useEffect(() => {
    if (!eqId || eqKind) return;
    const e = equipment.rows.find((x) => x.id === eqId);
    if (e) setEqKind(e.kind);
  }, [eqId, eqKind, equipment.rows]);
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url); }, [photo]);

  const recent = readJson<string[]>(RECENT_KEY, []);
  const kinds = useMemo(() => [...new Set(equipment.rows.map((e) => e.kind))], [equipment.rows]);
  const eqOptions = useMemo((): { value?: string; label: string; options?: { value: string; label: string }[] }[] => {
    const list = equipment.rows.filter((e) => !eqKind || e.kind === eqKind);
    const rec = recent.map((id) => list.find((e) => e.id === id)).filter((e): e is Equipment => !!e);
    const rest = list.filter((e) => !recent.includes(e.id));
    const opt = (e: Equipment) => ({ value: e.id, label: `${e.equipment_no} · ${e.name}` });
    return rec.length ? [{ label: "최근 고른 설비", options: rec.map(opt) }, { label: "전체", options: rest.map(opt) }] : list.map(opt);
  }, [equipment.rows, eqKind, recent]);
  const stepByCode = new Map(steps.rows.map((s) => [s.code, s]));

  const reset = () => {
    setKind(null); setNote(""); setPhoto(null); setStepId(null); setEqKind(null); setEqId(null); setAnonymous(false); setDone(null); setError(null);
  };

  const submit = async () => {
    setError(null);
    if (!kind) { setError("무엇인지 먼저 골라 주세요"); return; }
    if (note.trim().length < 2) { setError("한 줄 설명을 적어 주세요"); return; }
    try {
      const res = await run({ kind, note: note.trim(), photoName: photo?.name ?? null, processStepId: stepId, equipmentId: eqId, anonymous: kind === "near_miss" && anonymous });
      if (eqId) writeJson(RECENT_KEY, [eqId, ...recent.filter((x) => x !== eqId)].slice(0, 3));
      setDone({ id: res.id, notified: res.notified });
    } catch {
      /* 오류 토스트는 useRpc가 띄움 */
    }
  };

  if (done) {
    return (
      <div className="in-narrow in-stack">
        <SectionCard ariaLabel="등록 결과">
          <div className="in-stack in-stack--tight" role="status">
            <p className="in-sub" style={{ margin: 0 }}><CheckCircleOutlined aria-hidden style={{ color: "var(--ws-good-mark)", marginRight: 8 }} />등록했어요.{done.notified > 0 ? " 공장장에게 알렸어요." : ""}</p>
            <p className="in-note">담당이 정해지면 알림으로 알려 드려요.</p>
            <div className="in-row">
              <Button type="primary" size="large" onClick={reset}>하나 더 등록</Button>
              <Button size="large" onClick={() => mineRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>내 등록 보기</Button>
            </div>
          </div>
        </SectionCard>
        <MineList rows={mine.rows} innerRef={mineRef} now={clock.now()} />
      </div>
    );
  }

  return (
    <div className="in-narrow in-stack in-has-cta">
      <SectionCard ariaLabel="현장 등록">
        <StepHead no={1}>무엇인가요?</StepHead>
        <div className="in-kinds" role="group" aria-label="종류">
          {KINDS.map((k) => (
            <button key={k.value} type="button" className="in-kind" aria-pressed={kind === k.value} onClick={() => setKind(k.value)}>
              {k.icon}
              <span>{k.label}</span>
            </button>
          ))}
        </div>

        {kind && (
          <div className="in-stack in-mt">
            <StepHead no={2}>{labelOf("field_reports.kind", kind)} 내용</StepHead>
            <div className="in-field">
              <span className="in-field__label">사진</span>
              <div className="in-photo">
                <label className="in-filebtn">
                  <CameraOutlined aria-hidden />
                  {photo ? "사진 바꾸기" : "사진 찍기·고르기"}
                  <input
                    className="in-file" type="file" accept="image/*" capture="environment" aria-label="사진 찍기·고르기"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (photo) URL.revokeObjectURL(photo.url);
                      setPhoto({ name: f.name, url: URL.createObjectURL(f) });
                    }}
                  />
                </label>
                {photo && <img src={photo.url} alt="고른 사진 미리보기" />}
                {photo && <span className="in-caption">{photo.name}</span>}
              </div>
              <span className="in-caption">파일 이름만 남겨요. 사진은 회사 저장소에 따로 올려 주세요.</span>
            </div>
            <div className="in-field">
              <label className="in-field__label" htmlFor="fr-note">한 줄 설명</label>
              <Input id="fr-note" size="large" value={note} maxLength={60} onChange={(e) => setNote(e.target.value)} placeholder="예: 프레스 작업 중 이상 소음" />
              <span className="in-count" aria-live="polite">{note.length}/60</span>
            </div>
            <div className="in-field">
              <span className="in-field__label" id="fr-step">공정</span>
              <div className="ws-chips" role="group" aria-labelledby="fr-step">
                {STEP_CHIPS.map((c) => {
                  const s = stepByCode.get(c.code);
                  if (!s) return null;
                  return <button key={c.code} type="button" className="ws-chip" aria-pressed={stepId === s.id} onClick={() => setStepId(stepId === s.id ? null : s.id)}>{c.label}</button>;
                })}
              </div>
            </div>
            <div className="in-field">
              <span className="in-field__label">설비{kind === "equipment" ? "" : "(선택)"}</span>
              <div className="in-row" style={{ alignItems: "stretch" }}>
                <Select aria-label="설비 종류" placeholder="종류" allowClear size="large" style={{ minWidth: 140, flex: "1 1 140px" }} value={eqKind ?? undefined}
                  options={kinds.map((k) => ({ value: k, label: k }))} onChange={(v: string | undefined) => { setEqKind(v ?? null); setEqId(null); }} />
                <Select aria-label="설비 번호" placeholder="번호" allowClear showSearch optionFilterProp="label" size="large" style={{ minWidth: 180, flex: "2 1 180px" }}
                  value={eqId ?? undefined} options={eqOptions} onChange={(v: string | undefined) => setEqId(v ?? null)} />
              </div>
            </div>
            {kind === "near_miss" && (
              <label className="in-row">
                <Switch checked={anonymous} onChange={setAnonymous} aria-label="이름 없이 보내기" />
                <span className="in-note">이름 없이 보내기</span>
              </label>
            )}
            {kind === "near_miss" && anonymous && <p className="in-caption">이름 없이 보낸 기록은 내 목록에도 남지 않아요.</p>}
            {error && <p className="in-note" role="alert" style={{ color: "var(--ws-critical-fg)" }}>{error}</p>}
          </div>
        )}
        <div className="in-cta">
          <Button type="primary" block size="large" loading={isPending} disabled={!kind} onClick={() => void submit()}>등록하기</Button>
        </div>
      </SectionCard>
      <MineList rows={mine.rows} innerRef={mineRef} now={clock.now()} />
    </div>
  );
}

function MineList({ rows, innerRef, now }: { rows: FieldReport[]; innerRef: React.RefObject<HTMLDivElement>; now: string }) {
  return (
    <div ref={innerRef}>
      <SectionCard title="내가 등록한 것" caption="최근 10건까지 보여요.">
        {rows.length ? (
          <ListRows
            ariaLabel="내가 등록한 현장 기록"
            rows={rows.slice(0, 10).map((r) => ({
              key: r.id, title: r.note, subtitle: `${labelOf("field_reports.kind", r.kind)} · ${formatRelative(r.reported_at, now)}`,
              trailing: <StatusTag {...statusOf("field_reports.status", r.status)} />,
            }))}
          />
        ) : (
          <EmptyState kind="empty" compact title="아직 등록한 기록이 없어요" description="작은 이상도 남겨 주시면 공장장이 확인해요." />
        )}
      </SectionCard>
    </div>
  );
}
