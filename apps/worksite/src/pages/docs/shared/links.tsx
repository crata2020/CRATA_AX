// 지식 연결(knowledge_links)의 대상 이름·주소 풀기. 볼 수 없는 대상은 공급자가 빼므로 "볼 수 없는 항목"으로 보여요.
import { useList } from "@/lib/refine";
import type { Artifact, Decision, GlossaryTerm, KnowledgeItem, Meeting, Notice, Rule, Task } from "@/types/entities";

export const LINK_TYPE_LABEL: Record<string, string> = {
  decision: "결정", meeting: "회의", artifact: "산출물", glossary: "용어", rule: "작성 규칙", notice: "공지", knowledge: "지식", task: "업무",
};

export interface LinkTarget { label: string; to: string }

export function useLinkTargets(enabled: boolean) {
  const opt = { pagination: { mode: "off" as const }, queryOptions: { enabled } };
  const decisions = useList<Decision>({ resource: "decisions", ...opt });
  const meetings = useList<Meeting>({ resource: "meetings", ...opt });
  const artifacts = useList<Artifact>({ resource: "artifacts", ...opt });
  const terms = useList<GlossaryTerm>({ resource: "glossary_terms", ...opt });
  const rules = useList<Rule>({ resource: "rules", ...opt });
  const notices = useList<Notice>({ resource: "notices", ...opt });
  const items = useList<KnowledgeItem>({ resource: "knowledge_items", ...opt });
  const tasks = useList<Task>({ resource: "tasks", ...opt });
  const find = <T extends { id: string }>(list: T[] | undefined, id: string) => (list ?? []).find((x) => x.id === id);

  const resolve = (type: string, id: string): LinkTarget | null => {
    switch (type) {
      case "decision": { const d = find(decisions.result?.data, id); return d ? { label: d.statement, to: `/meetings/${d.meeting_id}?tab=decisions` } : null; }
      case "meeting": { const m = find(meetings.result?.data, id); return m ? { label: m.title, to: `/meetings/${m.id}` } : null; }
      case "artifact": { const a = find(artifacts.result?.data, id); return a ? { label: a.title, to: `/docs/artifacts/${a.id}` } : null; }
      case "glossary": { const g = find(terms.result?.data, id); return g ? { label: `${g.term} → ${g.ui_label}`, to: `/docs/glossary?q=${encodeURIComponent(g.term)}` } : null; }
      case "rule": { const r = find(rules.result?.data, id); return r ? { label: r.statement, to: `/docs/rules?tab=${r.status === "candidate" ? "pending" : "rules"}&selected=${r.id}` } : null; }
      case "notice": { const n = find(notices.result?.data, id); return n ? { label: n.title, to: `/company/notices/${n.id}` } : null; }
      case "knowledge": { const k = find(items.result?.data, id); return k ? { label: k.title, to: `/docs/knowledge?selected=${k.id}` } : null; }
      case "task": { const t = find(tasks.result?.data, id); return t ? { label: t.title, to: `/work/tasks/${t.id}` } : null; }
      default: return null;
    }
  };
  const loading = [decisions, meetings, artifacts, terms, rules, notices, items, tasks].some((q) => q.query.isLoading && enabled);
  return { resolve, loading };
}
