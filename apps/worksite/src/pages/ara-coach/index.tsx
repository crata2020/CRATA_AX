// ARA와 이야기 `/ara/coach` · A-02 · 깊이 B · 모듈 ara-wellbeing · 소유: ara_settings 그룹
// 코칭 대화 입구. 이번 빌드는 정해 둔 예시 답변 4개를 차례로 돌려줍니다(질문 형태의 짧은 해요체, 진단·치료 표현 없음).
// 데이터: ara 공급자 ara_messages(본인 것만). 회사 공급자·감사 로그를 거치지 않습니다.
// 입력에 위기 단어(@/lib/crisisWords)가 있으면 답변 위에 위기 안내 블록을 먼저 보여 줍니다.
import { useEffect, useRef, useState } from "react";
import { App, Button, Input, Skeleton } from "antd";
import { DeleteOutlined, SendOutlined, WarningOutlined } from "@ant-design/icons";
import { EmptyState, PageHeader, PrivateZone, SectionCard, useConfirm } from "@/components";
import { usePageReady } from "@/app/pageReady";
import { useCreate, useList, useRpc } from "@/lib/refine";
import { useWorksite } from "@/app/TenantBoundary";
import { formatRelative } from "@/lib/format";
import { hasCrisisWord } from "@/lib/crisisWords";
import type { AraMessage } from "@/types/entities";
import { CrisisLine, useAraState } from "../ara-home/shared/ara";

const REPLIES = [
  "그 순간을 조금 더 들려줄 수 있을까요? 그때 무엇이 가장 신경 쓰였나요?",
  "그럴 때 어떤 방식으로 일하면 조금 더 편했나요?",
  "동료가 알아 두면 도움이 될 만한 점이 있을까요? 카드 문장으로 남겨 둘 수 있어요.",
  "오늘 이야기 중 하나만 고른다면, 이번 주에 해 보고 싶은 작은 변화는 무엇인가요?",
] as const;
const MAX = 500;

function CrisisBlock() {
  return (
    <div className="as-crisis" role="alert">
      <WarningOutlined aria-hidden />
      <div>
        지금 많이 힘드신 것 같아요. 혼자 견디지 않아도 괜찮아요.
        <br />
        <a href="tel:109">109</a>(자살예방 상담전화, 24시간)에서 바로 이야기를 들어줘요. 위급하면 <a href="tel:119">119</a>에 연락해 주세요.
      </div>
    </div>
  );
}

const useMessages = (enabled: boolean) =>
  useList<AraMessage>({ resource: "ara_messages", dataProviderName: "ara", pagination: { mode: "off" }, sorters: [{ field: "created_at", order: "asc" }], queryOptions: { enabled } });

function Chat() {
  const { clock } = useWorksite();
  const { message } = App.useApp();
  const [text, setText] = useState("");
  const [waiting, setWaiting] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const q = useMessages(true);
  const { mutateAsync: create } = useCreate();
  usePageReady(!q.query.isLoading);
  const rows = q.result?.data ?? [];
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  useEffect(() => { endRef.current?.scrollIntoView?.({ block: "nearest" }); }, [rows.length, waiting]);

  const send = async () => {
    const body = text.trim();
    if (!body || waiting) return;
    if (body.length > MAX) { message.warning(`${MAX}자 이내로 적어 주세요`); return; }
    setWaiting(true);
    try {
      await create({ resource: "ara_messages", dataProviderName: "ara", values: { role: "me", text: body }, successNotification: false });
      setText("");
      const mine = rows.filter((r) => r.role === "me").length;
      const reply = REPLIES[mine % REPLIES.length]!;
      await new Promise<void>((resolve) => { timer.current = window.setTimeout(resolve, 400); });
      await create({ resource: "ara_messages", dataProviderName: "ara", values: { role: "ara", text: reply }, successNotification: false });
    } catch {
      message.error("보내지 못했어요. 잠시 뒤 다시 시도해 주세요");
    } finally {
      setWaiting(false);
    }
  };

  if (q.query.isLoading) return <SectionCard span={12} title="대화"><Skeleton active paragraph={{ rows: 4 }} title={false} /></SectionCard>;
  if (q.query.isError) return <EmptyState kind="error" action={{ label: "다시 시도", onClick: () => void q.query.refetch() }} />;

  return (
    <SectionCard title="대화" caption="대화는 나만 볼 수 있어요. 회사·관리자는 내용도, 이용 시각도 볼 수 없어요.">
      <div className="as-chat" role="log" aria-live="polite" aria-label="ARA와 나눈 대화">
        {!rows.length && !waiting && <p className="as-bubble as-bubble--ara" data-bubble><span className="as-bubble__who">ARA</span>요즘 일하면서 어떤 순간이 편했나요? 편하게 적어 주세요.</p>}
        {rows.map((m, i) => {
          const prev = rows[i - 1];
          const crisis = m.role === "ara" && prev?.role === "me" && hasCrisisWord(prev.text);
          return (
            <div key={m.id} style={{ display: "contents" }}>
              {crisis && <CrisisBlock />}
              <p className={`as-bubble as-bubble--${m.role}`} data-bubble>
                <span className="as-bubble__who">{m.role === "me" ? "나" : "ARA"}</span>
                {m.text}
                <span className="as-bubble__time">{formatRelative(m.created_at, clock.now())}</span>
              </p>
            </div>
          );
        })}
        {waiting && rows[rows.length - 1]?.role === "me" && hasCrisisWord(rows[rows.length - 1]!.text) && <CrisisBlock />}
        {waiting && <p className="as-bubble as-bubble--ara" aria-busy="true" data-bubble><span className="as-bubble__who">ARA</span>답을 고르고 있어요</p>}
        <div ref={endRef} />
      </div>
      <form className="as-compose" onSubmit={(e) => { e.preventDefault(); void send(); }}>
        <Input.TextArea
          aria-label="ARA에게 보낼 말"
          placeholder="편하게 적어 주세요"
          autoSize={{ minRows: 1, maxRows: 5 }}
          maxLength={MAX}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); }
          }}
        />
        <Button type="primary" htmlType="submit" icon={<SendOutlined aria-hidden />} loading={waiting} disabled={!text.trim()}>보내기</Button>
      </form>
      <p className="as-caption" style={{ marginTop: 8 }}>엔터 키로 보내고, 시프트와 엔터를 함께 누르면 줄을 바꿔요.</p>
    </SectionCard>
  );
}

export default function Page() {
  const ara = useAraState();
  const { message } = App.useApp();
  const confirm = useConfirm();
  const msgs = useMessages(ara.consented);
  const { run: clear, isPending: clearing } = useRpc("clear_messages", { dataProviderName: "ara" });
  usePageReady(!ara.loading);
  const count = msgs.result?.data?.length ?? 0;

  const onClear = async () => {
    const ok = await confirm({ title: "대화를 지울까요?", content: "ARA와 나눈 대화를 모두 지워요. 지운 대화는 되돌릴 수 없어요. 카드 문장은 그대로 남아요.", okText: "지우기", danger: true });
    if (!ok) return;
    try {
      await clear();
      message.success("대화를 지웠어요");
    } catch { /* 토스트는 useRpc가 띄움 */ }
  };

  return (
    <PrivateZone>
      <PageHeader
        title="ARA와 이야기"
        description="예시 대화예요. 실제 ARA 연결은 2단계에서 열려요."
        actions={ara.consented ? <Button icon={<DeleteOutlined aria-hidden />} disabled={!count} loading={clearing} onClick={() => void onClear()}>대화 지우기</Button> : undefined}
      />
      {ara.loading ? (
        <Skeleton active paragraph={{ rows: 3 }} title={false} />
      ) : ara.error ? (
        <EmptyState kind="error" action={{ label: "다시 시도", onClick: ara.refetch }} />
      ) : !ara.consented ? (
        <EmptyState kind="empty" title="먼저 ARA 동의가 필요해요" description="ARA 화면에서 안내를 읽고 동의하면 이야기를 시작할 수 있어요." action={{ label: "ARA로 가기", to: "/ara" }} />
      ) : (
        <Chat />
      )}
      <CrisisLine />
    </PrivateZone>
  );
}
