// CommandMenu(빌드 스펙 H-04): Ctrl/Cmd+K로 여는 모달. 소유: home 그룹. TopBar가 불러 씁니다.
// 입력 + 그룹별 상위 3건(sel:search) + 빠른 동작(업무 만들기(검토자 이상) · 현장 등록(TR) · 내 AI 연결 · 알림).
// ↑↓ 이동, Enter 실행, Esc 닫기. 초점은 모달 안에 가두고(antd Modal), 닫히면 연 자리로 돌려줍니다.
// 계약(바꾸지 마세요): export default function CommandMenu({ open, onClose }: { open: boolean; onClose: () => void })
import "../home/lib/home.css";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { Input, Modal, type InputRef } from "antd";
import {
  ApiOutlined, BellOutlined, FileTextOutlined, PlusOutlined, SearchOutlined, ToolOutlined, UserOutlined,
} from "@ant-design/icons";
import { useWorksite } from "@/app/TenantBoundary";
import { useSel } from "../home/lib/useSel";
import type { SearchResult } from "../home/lib/types";
import { Highlight, rememberSearch } from "./Highlight";

interface Opt { id: string; group: string; title: string; sub?: string; icon: ReactNode; run: () => void }

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

export default function CommandMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate();
  const { persona, tenant, isModuleOn, can } = useWorksite();
  const [text, setText] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<InputRef>(null);
  const q = useDebounced(text.trim(), 150);
  const res = useSel<SearchResult>("search", { q, limit: 3 }, { enabled: open && q.length > 0 });

  // 닫히면(언마운트) 연 자리로 초점 복귀
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    return () => { if (opener && document.contains(opener)) opener.focus(); };
  }, []);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 0); }, [open]);

  const go = (to: string) => { onClose(); nav(to); };

  const options = useMemo<Opt[]>(() => {
    const out: Opt[] = [];
    if (q) {
      for (const g of res.data?.groups ?? []) {
        for (const it of g.items.slice(0, 3)) {
          out.push({ id: `${g.key}-${it.id}`, group: g.label, title: it.title, sub: it.subtitle, icon: g.key === "people" ? <UserOutlined aria-hidden /> : <FileTextOutlined aria-hidden />, run: () => { rememberSearch(q); go(it.to); } });
        }
      }
      out.push({ id: "all", group: "검색", title: `‘${q}’ 검색 결과 모두 보기`, icon: <SearchOutlined aria-hidden />, run: () => { rememberSearch(q); go(`/search?q=${encodeURIComponent(q)}`); } });
    }
    const quick: Opt[] = [];
    if (persona.role !== "member" && isModuleOn("tasks") && can("tasks", "create").can) quick.push({ id: "qa-task", group: "빠른 동작", title: "업무 만들기", icon: <PlusOutlined aria-hidden />, run: () => go("/work?selected=new") });
    if (tenant.packs.includes("manufacturing") && isModuleOn("mfg-quality")) quick.push({ id: "qa-field", group: "빠른 동작", title: "현장 등록", sub: "불량·설비 이상·아차사고", icon: <ToolOutlined aria-hidden />, run: () => go("/ops/report") });
    if (isModuleOn("ai-connect")) quick.push({ id: "qa-ai", group: "빠른 동작", title: "내 AI 연결", icon: <ApiOutlined aria-hidden />, run: () => go("/me/ai") });
    quick.push({ id: "qa-ntf", group: "빠른 동작", title: "알림", icon: <BellOutlined aria-hidden />, run: () => go("/notifications") });
    const n = q.normalize("NFC").toLowerCase();
    out.push(...(q ? quick.filter((o) => o.title.includes(n) || (o.sub ?? "").includes(n)) : quick));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, res.data, persona.role, tenant.packs]);

  useEffect(() => { setActive(0); }, [q, options.length]);
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return; // 한글 조합 중 Enter·화살표는 조합 입력으로
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => (options.length ? (i + 1) % options.length : 0)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => (options.length ? (i - 1 + options.length) % options.length : 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const o = options[active];
      if (o) o.run();
      else if (text.trim()) { rememberSearch(text.trim()); go(`/search?q=${encodeURIComponent(text.trim())}`); }
    }
  };

  let lastGroup = "";
  const searching = !!q && res.isFetching && !res.data;
  return (
    <Modal open={open} onCancel={onClose} footer={null} title="검색과 바로가기" destroyOnHidden width={600} className="wh-cmd">
      <Input
        ref={inputRef}
        size="large"
        prefix={<SearchOutlined aria-hidden />}
        placeholder="사람, 프로젝트, 업무, 회의, 문서를 찾아요"
        aria-label="검색어"
        role="combobox"
        aria-expanded={options.length > 0}
        aria-controls="wh-cmd-list"
        aria-activedescendant={options[active] ? `wh-cmd-${options[active]!.id}` : undefined}
        aria-autocomplete="list"
        value={text}
        maxLength={60}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
      />
      {searching && <p className="wh-cmd__state" role="status">찾는 중이에요</p>}
      {q && !searching && res.data && res.data.groups.length === 0 && (
        <p className="wh-cmd__state" role="status">‘{q}’에 맞는 결과가 없어요. 더 짧게 적어 보세요.</p>
      )}
      <ul className="wh-cmd__list" id="wh-cmd-list" role="listbox" aria-label="검색 결과와 바로가기" ref={listRef}>
        {options.map((o, i) => {
          const head = o.group !== lastGroup ? o.group : null;
          lastGroup = o.group;
          return (
            <li key={o.id} role="presentation">
              {head && <div className="wh-cmd__group" role="presentation">{head}</div>}
              <div
                id={`wh-cmd-${o.id}`}
                role="option"
                aria-selected={i === active}
                data-idx={i}
                className="wh-cmd__opt"
                onMouseMove={() => setActive(i)}
                onClick={() => o.run()}
              >
                {o.icon}
                <span className="wh-cmd__text">
                  <span className="wh-cmd__title"><Highlight text={o.title} q={q} /></span>
                  {o.sub && <span className="wh-cmd__sub">{o.sub}</span>}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="wh-cmd__hint" aria-hidden>
        <span>↑↓ 이동</span><span>Enter 열기</span><span>Esc 닫기</span>
      </div>
    </Modal>
  );
}
