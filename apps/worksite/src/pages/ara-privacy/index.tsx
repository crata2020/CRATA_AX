// 회사가 보는 것·못 보는 것 `/ara/privacy` · A-03 · 깊이 C · 모듈 ara-wellbeing · 소유: ara_settings 그룹
// 회사가 볼 수 있는 것·없는 것, 약속, 동의 철회, (owner·admin) 10명 미만 집계 숨김 안내.
// 동의 철회: 확인 → wellbeing_consents.withdrawn_at + 공유 사본 내리기(rpc:withdraw_wellbeing_consent) + ara 공급자의 내 데이터 삭제(rpc:wipe).
// 집계(wellbeing_aggregates)는 공급자가 모수 10명 미만이면 돌려주지 않습니다. 화면은 숫자 대신 숨김 안내만 보여 줍니다.
import { useState } from "react";
import { App, Button, Skeleton } from "antd";
import { CardGrid, PageHeader, PrivateZone, SectionCard, StatTile, StatRow, useConfirm } from "@/components";
import { usePageReady } from "@/app/pageReady";
import { useWorksite } from "@/app/TenantBoundary";
import { useList, useRpc } from "@/lib/refine";
import { formatDate, formatMonth } from "@/lib/format";
import type { WellbeingAggregate } from "@/types/entities";
import { COMPANY_CAN, COMPANY_CANNOT, YesNoList, useAraState } from "../ara-home/shared/ara";
import { KeyValue } from "../admin-company/shared/lib";

/** 누가 운영하고 어디에 두는지(업무 AI의 국외이전 안내처럼, 더 민감한 ARA도 적어 둠). 정해지지 않은 값은 '예시' 표시 */
const EX = <span className="ws-tag" style={{ marginLeft: 6 }}>예시</span>;
const WHERE: [string, React.ReactNode][] = [
  ["운영 주체", <span>CRATA가 운영해요. 회사(고용주)는 ARA를 운영하지도, 기록을 받지도 않아요.</span>],
  ["저장 위치", <span>ARA 전용 저장소(P 영역)에 사람마다 따로 잠가 둬요. 회사 업무사이트 데이터와 섞지 않아요.</span>],
  ["AI 처리 경로", <span>국내 처리 경로를 먼저 써요. 해외 AI를 쓰게 되면 따로 알리고 다시 동의를 받아요. 대화로 AI를 학습시키지 않아요.{EX}</span>],
  ["보관 기간", <span>동의를 철회하면 바로 지워요. 12개월 동안 쓰지 않으면 지워요.{EX}</span>],
  ["문의처", <span>CRATA 개인정보 담당(연락처는 도입 계약 때 알려 드려요).{EX}</span>],
];

const PROMISES = [
  { text: "인사평가·배치·보상에 쓰지 않아요." },
  { text: "관리자도 내 ARA 화면과 기록을 볼 수 없어요.", sub: "데모의 '누구로 보기'로 바꿔도 그 사람 본인 것만 보여요." },
  { text: "작은 팀은 합쳐서 세요.", sub: "5명 미만 팀은 다른 팀과 합치고, 10명 미만이면 집계를 보여 주지 않아요." },
  { text: "언제든 동의를 철회할 수 있어요.", sub: "철회하면 내 ARA 기록을 모두 지워요." },
];

function AggregateCard() {
  const { tenant } = useWorksite();
  const q = useList<WellbeingAggregate>({ resource: "wellbeing_aggregates", pagination: { mode: "off" }, sorters: [{ field: "period_month", order: "desc" }] });
  usePageReady(!q.query.isLoading);
  const latest = q.result?.data?.[0];
  const min = tenant.policies.aggregateMinN;
  return (
    <SectionCard span={12} title="이번 달 집계" demo caption={`관리자에게만 보이는 칸이에요. 사람마다의 기록은 없고, ${min}명 이상일 때 월 단위 숫자만 보여요.`}>
      {q.query.isLoading ? (
        <Skeleton active paragraph={{ rows: 1 }} title={false} />
      ) : latest ? (
        <StatRow>
          <StatTile label={`${formatMonth(latest.period_month)} 이용 인원`} value={latest.active_seats} unit="명" />
          {latest.assessment_completion_rate != null && <StatTile label="진단 완료율" value={Math.round(latest.assessment_completion_rate)} unit="%" />}
          {latest.card_share_rate != null && <StatTile label="카드 공유율" value={Math.round(latest.card_share_rate)} unit="%" />}
        </StatRow>
      ) : (
        <p className="as-text">이번 달 이용 인원이 {min}명 미만이라 집계를 보여 주지 않아요({min}명 이상일 때만). 인원이 적으면 누가 썼는지 짐작할 수 있어서예요.</p>
      )}
    </SectionCard>
  );
}

export default function Page() {
  const { persona } = useWorksite();
  const { message } = App.useApp();
  const confirm = useConfirm();
  const ara = useAraState();
  const [busy, setBusy] = useState(false);
  const { run: withdraw } = useRpc<{ ok: boolean; revoked: number }>("withdraw_wellbeing_consent");
  const { run: wipe } = useRpc("wipe", { dataProviderName: "ara" });
  usePageReady(!ara.loading);
  const adminish = persona.role === "owner" || persona.role === "admin";

  const onWithdraw = async () => {
    const ok = await confirm({
      title: "ARA 동의를 철회할까요?",
      content: "내 ARA 대화·카드 문장·진단 기록을 모두 지우고, 회사에 나눈 문장 사본도 내려요. 지운 기록은 되돌릴 수 없어요.",
      okText: "철회하기",
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const r = await withdraw();
      await wipe();
      message.success(r.revoked ? `동의를 철회했어요. 나눈 문장 ${r.revoked}개도 내렸어요` : "동의를 철회했어요. 내 ARA 기록을 지웠어요");
      ara.refetch();
    } catch {
      /* 토스트는 useRpc가 띄움 */
    } finally {
      setBusy(false);
    }
  };

  return (
    <PrivateZone>
      <PageHeader title="회사가 보는 것·못 보는 것" description="ARA는 나를 위한 공간이에요. 회사로 가는 것과 가지 않는 것을 정리했어요." />
      <CardGrid>
        <SectionCard span={6} title="회사가 볼 수 있는 것">
          <YesNoList kind="yes" items={COMPANY_CAN} />
        </SectionCard>
        <SectionCard span={6} title="회사가 볼 수 없는 것">
          <YesNoList kind="no" items={COMPANY_CANNOT} />
        </SectionCard>
        <SectionCard span={12} title="약속">
          <YesNoList kind="yes" items={PROMISES} srPrefix={null} />
          <div className="as-row as-mt-lg">
            {ara.loading ? (
              <Skeleton.Button active />
            ) : ara.consented ? (
              <>
                <Button danger loading={busy} onClick={() => void onWithdraw()}>동의 철회하기</Button>
                {ara.consent?.privacy_consent_at && <span className="as-caption">{formatDate(ara.consent.privacy_consent_at)}에 동의했어요</span>}
              </>
            ) : (
              <span className="as-text-2">
                {ara.consent?.withdrawn_at ? `${formatDate(ara.consent.withdrawn_at)}에 동의를 철회했어요. ` : "아직 ARA에 동의하지 않았어요. "}
                다시 쓰려면 ARA 화면에서 동의해 주세요.
              </span>
            )}
          </div>
        </SectionCard>
        <SectionCard span={12} title="어디에 두나요" caption="'예시' 표시는 아직 정하지 않은 값이에요. 도입 계약 때 확정해서 다시 알려 드려요.">
          <KeyValue ariaLabel="운영과 보관" items={WHERE} />
        </SectionCard>
        {adminish && <AggregateCard />}
      </CardGrid>
    </PrivateZone>
  );
}
