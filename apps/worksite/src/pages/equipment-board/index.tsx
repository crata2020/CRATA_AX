// 설비 현황판 `/ops/production/board` · I-10 · 깊이 A · 모듈 mfg-production · TR 전용 · 소유: industry 그룹
// 편조기 36대(홈페이지 공개 대수 기준 예시)와 가공 설비를 칸으로 깔고, 근무조마다 한 번 눌러 가동·정지·고장·준비를 남깁니다.
// 칸 상태 = 오늘 그 근무조의 최신 기록(없으면 "기록 전"). 상태는 늘 아이콘 + 글자(색만으로 구별하지 않음).
// 바꾸기: 공장장·생산 작업자·owner·admin(rpc:set_equipment_status). 나머지는 보기만(칸이 버튼이 아니라 글자).
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button, Input, Popover } from "antd";
import { RightOutlined } from "@ant-design/icons";
import { DemoDataBadge, Divider, EmptyState, PageHeader, SectionCard, StatusTag, TONE_ICON, useConfirm } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { usePageReady } from "@/app/pageReady";
import { useRpc } from "@/lib/refine";
import { useUrlParam } from "@/lib/url";
import { formatDate, formatTime } from "@/lib/format";
import { statusOf, type StatusValue } from "@/lib/status";
import type { Equipment, EquipmentRunLog } from "@/types/entities";
import { shiftAt, useModuleRows } from "../ops-home/kit/data";
import { SHIFT_LABEL } from "../ops-home/kit/labels";
import "../ops-home/kit/industry.css";

type RunStatus = StatusValue<"equipment_run_logs.status">;
const SETTABLE: Exclude<RunStatus, "none">[] = ["running", "stopped", "breakdown", "setup"];
const OTHER_KINDS = ["프레스", "전용기", "롤링기", "절단기", "스포트기"];

export default function Page() {
  const { today, clock, can } = useWorksite();
  const nav = useNavigate();
  const confirm = useConfirm();
  const now = shiftAt(clock.now());
  const [shift] = useUrlParam("shift", now.date === today ? now.shift : "day");
  const equipment = useModuleRows<Equipment>("mfg-equipment", "equipment", { sorters: [{ field: "equipment_no", order: "asc" }] });
  const logs = useModuleRows<EquipmentRunLog>("mfg-production", "equipment_run_logs", {
    filters: [{ field: "date", operator: "eq", value: today }, { field: "shift", operator: "eq", value: shift }],
  });
  usePageReady(!equipment.isLoading && !logs.isLoading);
  const canSet = can("equipment_run_logs", "create");
  const { run } = useRpc<{ ok: boolean }>("set_equipment_status");

  const latest = useMemo(() => {
    const m = new Map<string, EquipmentRunLog>();
    for (const l of logs.rows) { const cur = m.get(l.equipment_id); if (!cur || l.recorded_at > cur.recorded_at) m.set(l.equipment_id, l); }
    return m;
  }, [logs.rows]);
  const active = equipment.rows.filter((e) => e.status !== "retired");
  const knit = active.filter((e) => e.kind === "편조기");
  const others = OTHER_KINDS.map((k) => ({ kind: k, list: active.filter((e) => e.kind === k) })).filter((g) => g.list.length);
  const tally = (list: Equipment[]) => {
    const t: Record<RunStatus, number> = { running: 0, stopped: 0, breakdown: 0, setup: 0, none: 0 };
    for (const e of list) t[latest.get(e.id)?.status ?? "none"] += 1;
    return t;
  };
  // 위 요약은 아래 칸 전체(편조기 + 가공·기타)와 같은 모수로 셉니다(홈 '설비 상태' 위젯과 같은 수)
  const allTally = tally(active);

  const setStatus = async (e: Equipment, status: Exclude<RunStatus, "none">, reason: string) => {
    await run({ equipmentId: e.id, date: today, shift, status, reason: reason.trim() || null });
    if (status === "breakdown") {
      const ok = await confirm({ title: "고장 기록도 남길까요?", content: `${e.equipment_no}의 고장 내용을 현장 등록으로 남기면 고장 기록과 담당 배정으로 이어져요.`, okText: "현장 등록 열기", cancelText: "나중에" });
      if (ok) nav(`/ops/report?kind=equipment&equipment=${e.id}`);
    }
  };

  const header = (
    <PageHeader
      title="설비 현황판"
      description={`${formatDate(today)} · 지금 ${SHIFT_LABEL[now.shift]}${shift !== now.shift ? ` · ${SHIFT_LABEL[shift]} 기록을 보고 있어요` : ""}`}
      period={{ ariaLabel: "근무조", urlParam: "shift", value: shift as "day" | "night", onChange: () => undefined, options: [{ value: "day", label: "주간" }, { value: "night", label: "야간" }] }}
      actions={<Link to="/ops/equipment?tab=today"><Button>오늘 점검 <RightOutlined aria-hidden /></Button></Link>}
    />
  );

  if (!equipment.isLoading && !active.length) {
    return <>{header}<EmptyState kind="empty" title="등록된 설비가 없어요" description="기준정보에서 설비를 등록하면 칸이 생겨요." /></>;
  }

  return (
    <>
      {header}
      <div className="in-tally in-mb" aria-label={`전체 설비 ${active.length}대 ${SHIFT_LABEL[shift]} 상태 요약`}>
        <span className="in-tally__label">전체 설비 {active.length}대</span>
        {(["running", "stopped", "breakdown", "setup", "none"] as RunStatus[]).filter((s) => s !== "none" || allTally.none > 0).map((s) => (
          <StatusTag key={s} size="md" {...statusOf("equipment_run_logs.status", s)} label={`${statusOf("equipment_run_logs.status", s).label} ${allTally[s]}`} />
        ))}
        <DemoDataBadge variant="inline" />
      </div>
      {!canSet.can && <p className="in-caption in-mb">{canSet.reason ?? "상태는 공장장·생산 작업자가 바꿔요."} 보기만 할 수 있어요.</p>}
      <div className="in-stack">
        <SectionCard title={`편조기 ${knit.length}대 · 가동 ${tally(knit).running}`} caption="대수는 홈페이지 공개 값(36대) 기준 예시예요.">
          <Cells list={knit} latest={latest} canSet={canSet.can} onSet={setStatus} />
        </SectionCard>
        <SectionCard title="가공·기타 설비" demo>
          {others.map((g, i) => {
            const t = tally(g.list);
            return (
              <section key={g.kind} aria-label={`${g.kind} ${g.list.length}대`}>
                {i > 0 && <Divider />}
                <h3 className="in-sub--sm">{g.kind} {g.list.length}대 <span className="in-caption">· 가동 {t.running}</span></h3>
                <Cells list={g.list} latest={latest} canSet={canSet.can} onSet={setStatus} wide />
              </section>
            );
          })}
        </SectionCard>
      </div>
    </>
  );
}

function Cells({ list, latest, canSet, onSet, wide }: {
  list: Equipment[]; latest: Map<string, EquipmentRunLog>; canSet: boolean; onSet: (e: Equipment, s: Exclude<RunStatus, "none">, reason: string) => Promise<void>; wide?: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <div className={`in-cells${wide ? " in-cells--wide" : ""}`} role="list">
      {list.map((e) => {
        const log = latest.get(e.id);
        const st = statusOf("equipment_run_logs.status", log?.status ?? "none");
        const since = log ? formatTime(log.recorded_at) : null;
        const label = `${e.equipment_no}, ${st.label}${since ? `, ${since}부터` : ""}${log?.reason ? `, ${log.reason}` : ""}`;
        const inner = (
          <>
            <span className="in-cell__no">{e.equipment_no}</span>
            <span className="in-cell__st">{TONE_ICON[st.tone]}{st.label}</span>
          </>
        );
        if (!canSet) {
          return <div key={e.id} role="listitem" className="in-cell" data-tone={st.tone} aria-label={label} title={log?.reason ?? undefined}>{inner}</div>;
        }
        return (
          <div key={e.id} role="listitem">
            <Popover
              trigger="click"
              open={openId === e.id}
              onOpenChange={(v) => setOpenId(v ? e.id : null)}
              title={`${e.equipment_no} 상태`}
              content={<Picker current={log?.status} reason={log?.reason ?? ""} onSave={async (s, r) => { await onSet(e, s, r); setOpenId(null); }} />}
              destroyOnHidden
            >
              <button type="button" className="in-cell" data-tone={st.tone} aria-label={label} aria-haspopup="dialog" aria-expanded={openId === e.id}>{inner}</button>
            </Popover>
          </div>
        );
      })}
    </div>
  );
}

function Picker({ current, reason: initialReason, onSave }: { current?: RunStatus; reason: string; onSave: (s: Exclude<RunStatus, "none">, reason: string) => Promise<void> }) {
  const [status, setStatus] = useState<Exclude<RunStatus, "none">>(current && current !== "none" ? current : "running");
  const [reason, setReason] = useState(initialReason);
  const [busy, setBusy] = useState(false);
  return (
    <div className="in-stack in-stack--tight" style={{ width: 248 }}>
      <div className="ws-chips in-wrap-chips" role="group" aria-label="상태 고르기">
        {SETTABLE.map((s) => {
          const info = statusOf("equipment_run_logs.status", s);
          return (
            <button key={s} type="button" className="ws-chip" aria-pressed={status === s} onClick={() => setStatus(s)}>
              {TONE_ICON[info.tone]}{info.label}
            </button>
          );
        })}
      </div>
      {status !== "running" && (
        <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={40} placeholder="이유 한 줄(예: 선재 교체 대기)" aria-label="이유 한 줄" />
      )}
      <Button type="primary" block loading={busy} onClick={async () => { setBusy(true); try { await onSave(status, status === "running" ? "" : reason); } finally { setBusy(false); } }}>저장하기</Button>
    </div>
  );
}
