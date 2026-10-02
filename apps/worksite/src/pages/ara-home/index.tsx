// ARA `/ara` · A-01 · 깊이 A · 모듈 ara-wellbeing · 소유: ara_settings 그룹
// 나만 보는 공간(P 영역): 동의 흐름 → 내 일하는 방식 카드와 문장별 나눌 범위 → 코칭 진입 → 위기 안내.
// 데이터: ara 공급자(ara_profile · ara_card_sentences · ara_messages, 본인 것만) + 회사 공급자(wellbeing_consents 본인, work_style_cards 공유 사본).
// 나눌 범위를 팀·회사로 바꾸면 그 문장의 사본만 회사 쪽(work_style_cards)에 만들고, '나만'이면 내립니다(rpc:set_card_share, 감사 기록 없음).
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { App, Button, Skeleton } from "antd";
import { MessageOutlined } from "@ant-design/icons";
import { CardGrid, EmptyState, PageHeader, PrivateZone, SectionCard, SegmentedPills } from "@/components";
import { usePageReady } from "@/app/pageReady";
import { useList, useRpc, useUpdate } from "@/lib/refine";
import { formatDate, formatRelative } from "@/lib/format";
import { useWorksite } from "@/app/TenantBoundary";
import type { AraCardSentence, AraMessage } from "@/types/entities";
import { ConsentFlow, CrisisLine, useAraState } from "./shared/ara";

type Scope = AraCardSentence["share_scope"];
const SCOPE_OPTIONS: { value: Scope; label: string }[] = [
  { value: "private", label: "나만" },
  { value: "team", label: "팀" },
  { value: "company", label: "회사" },
];
const SCOPE_HINT: Record<Scope, string> = {
  private: "나만 봐요",
  team: "우리 팀이 볼 수 있어요",
  company: "회사 사람 모두 볼 수 있어요",
};

function SentenceList({ sentences }: { sentences: AraCardSentence[] }) {
  const { message } = App.useApp();
  const [pending, setPending] = useState<string | null>(null);
  const { mutateAsync: update } = useUpdate();
  const { run } = useRpc<{ ok: boolean; shared: boolean }>("set_card_share");

  const change = async (s: AraCardSentence, scope: Scope) => {
    if (scope === s.share_scope) return;
    setPending(s.id);
    try {
      await run({ acsId: s.id, sentence: s.text, scope });
      await update({ resource: "ara_card_sentences", id: s.id, values: { share_scope: scope }, dataProviderName: "ara", successNotification: false });
      message.success(scope === "private" ? "이제 나만 봐요. 회사 쪽 사본을 내렸어요" : `${scope === "team" ? "팀과" : "회사와"} 나눴어요. 이 문장 사본만 올라가요`);
    } catch {
      /* 오류 토스트는 useRpc가 띄움 */
    } finally {
      setPending(null);
    }
  };

  return (
    <ul className="as-sentences" aria-label="내 일하는 방식 문장">
      {sentences.map((s) => (
        <li key={s.id} className="as-sentence">
          <p className="as-sentence__text">“{s.text}”</p>
          <div className="as-sentence__scope" aria-busy={pending === s.id}>
            <SegmentedPills<Scope>
              ariaLabel={`"${s.text}" 나눌 범위`}
              options={SCOPE_OPTIONS}
              value={s.share_scope}
              onChange={(v) => void change(s, v)}
            />
            <span className="as-caption">{SCOPE_HINT[s.share_scope]}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function Page() {
  const nav = useNavigate();
  const { isModuleOn } = useWorksite();
  const ara = useAraState();
  const sentences = useList<AraCardSentence>({ resource: "ara_card_sentences", dataProviderName: "ara", pagination: { mode: "off" }, sorters: [{ field: "order", order: "asc" }], queryOptions: { enabled: ara.consented } });
  const messages = useList<AraMessage>({ resource: "ara_messages", dataProviderName: "ara", pagination: { mode: "off" }, sorters: [{ field: "created_at", order: "desc" }], queryOptions: { enabled: ara.consented } });
  const loading = ara.loading || (ara.consented && (sentences.query.isLoading || messages.query.isLoading));
  usePageReady(!loading);
  const { clock } = useWorksite();

  const list = sentences.result?.data ?? [];
  const last = (messages.result?.data ?? [])[0];
  const sharedCount = list.filter((s) => s.share_scope !== "private").length;

  let body;
  if (loading) {
    body = <Skeleton active paragraph={{ rows: 4 }} title={false} />;
  } else if (ara.error) {
    body = <EmptyState kind="error" action={{ label: "다시 시도", onClick: ara.refetch }} />;
  } else if (!ara.consented) {
    body = (
      <CardGrid>
        <SectionCard span={12} title="시작하기 전에 확인해요" caption="동의는 언제든 철회할 수 있어요. 철회하면 내 ARA 기록을 모두 지워요.">
          <ConsentFlow profile={ara.profile} consent={ara.consent} onDone={ara.refetch} />
        </SectionCard>
      </CardGrid>
    );
  } else {
    body = (
      <CardGrid>
        <SectionCard
          span={7}
          pill
          title="내 일하는 방식 카드"
          caption={list.length ? `문장마다 나눌 범위를 골라요. 지금 ${sharedCount}개를 나누고 있어요. 나눈 문장도 평가에 쓰지 않아요.` : undefined}
        >
          {sentences.query.isError ? (
            <EmptyState compact kind="error" action={{ label: "다시 시도", onClick: () => void sentences.query.refetch() }} />
          ) : list.length ? (
            <SentenceList sentences={list} />
          ) : (
            <EmptyState compact kind="empty" title="아직 카드 문장이 없어요" description="ARA와 이야기하면 내 카드 문장이 생겨요." action={{ label: "이야기 시작하기", to: "/ara/coach" }} />
          )}
        </SectionCard>
        <SectionCard span={5} title="ARA와 이야기하기">
          <div className="as-stack">
            {last ? (
              <>
                <p className="as-text">“{last.text.length > 60 ? `${last.text.slice(0, 59)}…` : last.text}”</p>
                <p className="as-caption">{last.role === "me" ? "내가 한 말" : "ARA가 한 말"} · {formatRelative(last.created_at, clock.now())}</p>
              </>
            ) : (
              <p className="as-text-2">아직 나눈 이야기가 없어요. 요즘 일하면서 편했던 순간부터 이야기해 볼까요?</p>
            )}
            <div>
              <Button type="primary" icon={<MessageOutlined aria-hidden />} onClick={() => nav("/ara/coach")}>{last ? "이어서 이야기하기" : "이야기 시작하기"}</Button>
            </div>
            <p className="as-caption">대화는 나만 볼 수 있어요. 회사·관리자는 내용도, 이용 시각도 볼 수 없어요.</p>
            {ara.consent?.privacy_consent_at && (
              <p className="as-caption">
                {formatDate(ara.consent.privacy_consent_at)}에 동의했어요 · <Link to="/ara/privacy">동의 철회하기</Link>
              </p>
            )}
          </div>
        </SectionCard>
      </CardGrid>
    );
  }

  return (
    <PrivateZone>
      <PageHeader title="ARA" description="일하는 방식을 알아보고, 동료와 나눌 문장을 골라요." />
      {isModuleOn("ara-wellbeing") && body}
      <CrisisLine />
    </PrivateZone>
  );
}
