// 메뉴·탭 배지 수(검토 대기 · 분류 확인 대기 · 안 읽은 알림). 데이터가 바뀌면 자동으로 다시 셉니다.
import { useSelector } from "@/lib/refine";
import type { NavBadgeKey } from "@/modules";

export function useNavBadges(): Partial<Record<NavBadgeKey, number>> {
  const { data } = useSelector<Record<NavBadgeKey, number>>("nav.badges");
  return data ?? {};
}
