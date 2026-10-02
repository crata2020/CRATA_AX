// industry 그룹 시드(소유: industry 그룹). CRM 라이트(담당자·영업 기회·견적)와 제조 팩·안전보건 데이터를 만듭니다.
// 만들 리소스: GROUP_RESOURCES.industry (partner_contacts, opportunities, quotes, items … legal_calendar_items, kpis·kpi_values의 K*)
// 앵커: ANCHORS.crata.opportunity·quote, ANCHORS.tr.claim·correctiveAction·change4m·lotChain·fieldReport·breakdownKn21·breakdownPress·legalH2·stockLot321·purchaseOrder
// 양·내용: 빌드 스펙 6.4절 industry 표 · 지표 값 6.5절(K*) · 03 문서 10장
// rpc: create_field_report · set_equipment_status · confirm_semiannual_review (5.8절)
//    + assign_field_report · create_linked_task · create_claim · move_claim_column · complete_d_step · repair_breakdown · create_safety_report (industry 추가)
// sel: ops.today
//
// 데이터 원칙(6.1절): TR은 공개 자료의 제품 카테고리·재질·공정 이름·설비 종류와 대수·조직 단위만 사실로 씁니다.
// 수량·불량·납기·가격·위치·품번·LOT·사람·거래처는 모두 지어낸 예시입니다. 사람은 역할 표시명, 거래처는 '예시…'만 씁니다.
// 날짜는 데모 '오늘'(기본 2026-09-30)에서 거꾸로 계산합니다. LOT 번호 앵커는 anchors.ts의 고정 문자열을 그대로 씁니다.
import type { ResourceName, RowOf, SeedRow, DStep } from "@/types/entities";
import { addDays, daysBetween, isOffDay, kstIso, shiftToWorkday, toKstDate } from "@/lib/clock";
import { labelOf } from "@/lib/status";
import { defineGroup, type ActionContext, type SeedContext, type SeedOutput, type RpcHandler, type SelectorContext, type SelectorHandler } from "./types";

type R<K extends ResourceName> = SeedRow<RowOf<K>>;

// ───────────────────────────────────────────── 날짜 도우미
const dow = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();
/** 공장 근무일: 월~토, 일요일·공휴일(추석·개천절·대체공휴일·한글날 …) 제외 */
function workdays(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) if (!isOffDay(d)) out.push(d);
  return out;
}
/** 일요일·공휴일이면 앞쪽의 가까운 근무일로 */
const onWorkday = (date: string) => shiftToWorkday(date, -1);
const ymd6 = (date: string) => date.slice(2).replace(/-/g, "");
const mmdd = (date: string) => date.slice(5).replace("-", "");
const pad = (n: number, w = 3) => String(n).padStart(w, "0");
const round = (n: number, step = 1) => {
  const v = Math.round(n / step) * step;
  const digits = step < 1 ? (String(step).split(".")[1]?.length ?? 0) : 0;
  return digits ? Number(v.toFixed(digits)) : v;
};
/** "HH:mm"에서 n분 빼기(같은 날 안에서) */
const minusMin = (time: string, n: number) => {
  const [h, m] = time.split(":").map(Number) as [number, number];
  const t = Math.max(0, h * 60 + m - n);
  return `${pad(Math.floor(t / 60), 2)}:${pad(t % 60, 2)}`;
};
const monthOffset = (date: string, n: number) => {
  const [y, m] = date.split("-").map(Number) as [number, number];
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  return t.toISOString().slice(0, 7);
};

// ───────────────────────────────────────────── TR 사람(역할 표시명, TenantConfig와 같은 id)
const TP = { ceo: "m-tr-ceo", plant: "m-tr-plant", qa: "m-tr-qa", sales: "m-tr-sales", admin: "m-tr-admin", dev: "m-tr-dev" } as const;
const OPS = ["m-tr-op-a", "m-tr-op-b", "m-tr-op-c", "m-tr-op-d", "m-tr-op-e", "m-tr-op-f"] as const;

// ───────────────────────────────────────────── 기준정보(공개: 재질·공정 이름·제품 카테고리 / 예시: 품번·치수·선경)
const GRADES: [id: string, code: string, label: string, note: string | null][] = [
  ["mg-304", "304", "스테인리스 304", null],
  ["mg-316", "316", "스테인리스 316", null],
  ["mg-321", "321", "스테인리스 321", "고온 부품에 쓰는 강종(일반 자료)"],
  ["mg-310s", "310S", "스테인리스 310S", "내열 강종(일반 자료)"],
  ["mg-cu", "Cu", "구리", null],
  ["mg-al", "Al", "알루미늄", null],
  ["mg-brass", "Brass", "황동", null],
  ["mg-tcu", "TCu", "주석 도금 구리", null],
  ["mg-order", "주문", "주문 재질", "고객 주문 사양에 따른 재질"],
];
const GRADE_NAME: Record<string, string> = { "304": "SUS304", "316": "SUS316", "321": "SUS321", "310S": "SUS310S", Cu: "구리", TCu: "주석 도금 구리", Brass: "황동", Al: "알루미늄" };
const LOT_CODE: Record<string, string> = { "304": "304", "316": "316", "321": "321", "310S": "310S", Cu: "CU", TCu: "TCU", Brass: "BS", Al: "AL" };
/** 원재료 kg 단가(예시) */
const PRICE_KG: Record<string, number> = { "304": 7800, "316": 12600, "321": 10900, "310S": 17400, Cu: 15800, TCu: 17200, Brass: 11900, Al: 6400 };

interface RmDef { key: string; grade: string; dia: number; supplier: string; use: number; days: number; minDays: number; receipts: number }
/** 원자재 10종: 하루 사용량(kg, 예시) · 목표 재고일수 · 안전재고 일수 · 13주 입고 횟수(합 48) */
const RMS: RmDef[] = [
  { key: "304-015", grade: "304", dia: 0.15, supplier: "p-tr-wire", use: 24, days: 18, minDays: 7, receipts: 7 },
  { key: "304-020", grade: "304", dia: 0.2, supplier: "p-tr-wire", use: 20, days: 15, minDays: 7, receipts: 6 },
  { key: "316-015", grade: "316", dia: 0.15, supplier: "p-tr-wire", use: 12, days: 12, minDays: 7, receipts: 5 },
  { key: "321-020", grade: "321", dia: 0.2, supplier: "p-tr-wire", use: 25, days: 4, minDays: 7, receipts: 6 },
  { key: "321-025", grade: "321", dia: 0.25, supplier: "p-tr-wire", use: 9, days: 9, minDays: 7, receipts: 4 },
  { key: "310S-025", grade: "310S", dia: 0.25, supplier: "p-tr-wire", use: 11, days: 11, minDays: 7, receipts: 5 },
  { key: "CU-015", grade: "Cu", dia: 0.15, supplier: "p-tr-nfe", use: 5, days: 20, minDays: 10, receipts: 4 },
  { key: "TCU-011", grade: "TCu", dia: 0.11, supplier: "p-tr-nfe", use: 4, days: 9, minDays: 7, receipts: 4 },
  { key: "BS-020", grade: "Brass", dia: 0.2, supplier: "p-tr-nfe", use: 2, days: 25, minDays: 10, receipts: 3 },
  { key: "AL-020", grade: "Al", dia: 0.2, supplier: "p-tr-nfe", use: 3, days: 30, minDays: 10, receipts: 4 },
];
const rmId = (key: string) => `it-rm-${key.toLowerCase()}`;
const rmNo = (r: RmDef) => `RM-${r.key.split("-")[0]}-${r.dia.toFixed(2)}`;

interface KmDef { no: string; grade: string; mesh: "F" | "M" | "S"; width: number; rm: string; partner: string | null; cust: string | null; price: number }
const MESH: Record<string, string> = { F: "파인", M: "미디엄", S: "스탠다드" };
const KMS: KmDef[] = [
  { no: "KM-304-F-080", grade: "304", mesh: "F", width: 80, rm: "304-015", partner: "p-tr-flt", cust: "DEMO-FLT-3001", price: 5200 },
  { no: "KM-304-M-100", grade: "304", mesh: "M", width: 100, rm: "304-020", partner: null, cust: null, price: 0 },
  { no: "KM-304-S-150", grade: "304", mesh: "S", width: 150, rm: "304-020", partner: "p-tr-flt", cust: "DEMO-FLT-3002", price: 6900 },
  { no: "KM-316-F-080", grade: "316", mesh: "F", width: 80, rm: "316-015", partner: "p-tr-flt", cust: "DEMO-FLT-3003", price: 8400 },
  { no: "KM-316-M-120", grade: "316", mesh: "M", width: 120, rm: "316-015", partner: null, cust: null, price: 0 },
  { no: "KM-321-M-100", grade: "321", mesh: "M", width: 100, rm: "321-020", partner: null, cust: null, price: 0 },
  { no: "KM-321-S-120", grade: "321", mesh: "S", width: 120, rm: "321-025", partner: "p-tr-flt", cust: "DEMO-FLT-3004", price: 9600 },
  { no: "KM-310S-M-100", grade: "310S", mesh: "M", width: 100, rm: "310S-025", partner: null, cust: null, price: 0 },
  { no: "KM-310S-S-150", grade: "310S", mesh: "S", width: 150, rm: "310S-025", partner: null, cust: null, price: 0 },
  { no: "KM-TCU-F-050", grade: "TCu", mesh: "F", width: 50, rm: "TCU-011", partner: null, cust: null, price: 0 },
  { no: "KM-CU-M-080", grade: "Cu", mesh: "M", width: 80, rm: "CU-015", partner: null, cust: null, price: 0 },
  { no: "KM-AL-S-100", grade: "Al", mesh: "S", width: 100, rm: "AL-020", partner: null, cust: null, price: 0 },
];
const kmId = (no: string) => `it-${no.toLowerCase()}`;
/** 완제품 재질 → 쓰는 편조망 */
const KM_FOR_GRADE: Record<string, string> = { "304": "KM-304-M-100", "316": "KM-316-M-120", "321": "KM-321-M-100", "310S": "KM-310S-M-100", TCu: "KM-TCU-F-050", Cu: "KM-CU-M-080", Al: "KM-AL-S-100" };

/** 공개 제품 카테고리(03 문서 3.3절) */
const CAT: Record<string, string> = {
  DR: "배기 디커플링 링·메시 벨로우즈 슬리브", AF: "에어백 필터", CW: "촉매 컨버터 메시 랩", CS: "촉매 컨버터 실", MP: "사일런서·머플러 패킹",
  SR: "스페이서 링·에어 갭 실", SP: "분리 링", BR: "엔진 브리더·오일 분리·오일 필터 캡 필터", HS: "방진·흡음·차열 부품", EMI: "EMI 차폐 가스켓",
};
type Form = "crimping" | "pressing" | "spiralling";
interface FpDef { no: string; name: string; partner: string; form: Form; cust: string; dims: Record<string, number>; price: number }
const FPS: FpDef[] = [
  { no: "FP-DR-321-001", name: "디커플링 링 D52", partner: "p-tr-exh", form: "pressing", cust: "DEMO-EXH-1001", dims: { 외경: 52, 내경: 44, 높이: 12 }, price: 1850 },
  { no: "FP-DR-321-002", name: "디커플링 링 D48", partner: "p-tr-exh", form: "pressing", cust: "DEMO-EXH-1002", dims: { 외경: 48, 내경: 40, 높이: 11 }, price: 1780 },
  { no: "FP-DR-310S-003", name: "메시 벨로우즈 슬리브 S60", partner: "p-tr-exh", form: "crimping", cust: "DEMO-EXH-1003", dims: { 외경: 60, 길이: 140 }, price: 2650 },
  { no: "FP-DR-304-004", name: "디커플링 링 D40", partner: "p-tr-exh", form: "pressing", cust: "DEMO-EXH-1004", dims: { 외경: 40, 내경: 33, 높이: 10 }, price: 1420 },
  { no: "FP-CW-310S-001", name: "촉매 컨버터 메시 랩 W120", partner: "p-tr-exh", form: "crimping", cust: "DEMO-EXH-2001", dims: { 폭: 120, 길이: 560 }, price: 2400 },
  { no: "FP-CW-321-002", name: "촉매 컨버터 메시 랩 W100", partner: "p-tr-exh", form: "crimping", cust: "DEMO-EXH-2002", dims: { 폭: 100, 길이: 520 }, price: 2150 },
  { no: "FP-CW-304-003", name: "촉매 컨버터 메시 랩 W80", partner: "p-tr-exh", form: "crimping", cust: "DEMO-EXH-2003", dims: { 폭: 80, 길이: 480 }, price: 1780 },
  { no: "FP-CS-310S-001", name: "촉매 컨버터 실 R95", partner: "p-tr-exh", form: "pressing", cust: "DEMO-EXH-3001", dims: { 외경: 95, 내경: 85, 높이: 14 }, price: 1600 },
  { no: "FP-CS-321-002", name: "촉매 컨버터 실 R88", partner: "p-tr-exh", form: "pressing", cust: "DEMO-EXH-3002", dims: { 외경: 88, 내경: 79, 높이: 13 }, price: 1540 },
  { no: "FP-MP-304-001", name: "머플러 패킹 P150", partner: "p-tr-exh", form: "spiralling", cust: "DEMO-EXH-4001", dims: { 외경: 150, 길이: 210 }, price: 1250 },
  { no: "FP-MP-304-002", name: "머플러 패킹 P120", partner: "p-tr-exh", form: "spiralling", cust: "DEMO-EXH-4002", dims: { 외경: 120, 길이: 180 }, price: 1180 },
  { no: "FP-MP-321-003", name: "사일런서 패킹 P90", partner: "p-tr-exh", form: "spiralling", cust: "DEMO-EXH-4003", dims: { 외경: 90, 길이: 160 }, price: 1320 },
  { no: "FP-AF-304-001", name: "에어백 필터 F30", partner: "p-tr-saf", form: "pressing", cust: "DEMO-SAF-2001", dims: { 외경: 30, 높이: 22 }, price: 950 },
  { no: "FP-AF-304-002", name: "에어백 필터 F36", partner: "p-tr-saf", form: "pressing", cust: "DEMO-SAF-2002", dims: { 외경: 36, 높이: 25 }, price: 1020 },
  { no: "FP-AF-316-003", name: "에어백 필터 F42", partner: "p-tr-saf", form: "pressing", cust: "DEMO-SAF-2003", dims: { 외경: 42, 높이: 28 }, price: 1180 },
  { no: "FP-AF-316-004", name: "에어백 필터 F28", partner: "p-tr-saf", form: "pressing", cust: "DEMO-SAF-2004", dims: { 외경: 28, 높이: 20 }, price: 910 },
  { no: "FP-BR-304-001", name: "엔진 브리더 필터 B20", partner: "p-tr-pwt", form: "pressing", cust: "DEMO-PWT-5001", dims: { 외경: 20, 높이: 15 }, price: 680 },
  { no: "FP-BR-316-002", name: "오일 분리 메시 B26", partner: "p-tr-pwt", form: "pressing", cust: "DEMO-PWT-5002", dims: { 외경: 26, 높이: 18 }, price: 760 },
  { no: "FP-BR-AL-003", name: "오일 필터 캡 필터 B18", partner: "p-tr-pwt", form: "pressing", cust: "DEMO-PWT-5003", dims: { 외경: 18, 높이: 9 }, price: 540 },
  { no: "FP-HS-321-001", name: "차열 디커플링 와셔 H30", partner: "p-tr-thm", form: "pressing", cust: "DEMO-THM-6001", dims: { 외경: 30, 내경: 12, 높이: 8 }, price: 720 },
  { no: "FP-HS-304-002", name: "방진 메시 패드 H45", partner: "p-tr-thm", form: "pressing", cust: "DEMO-THM-6002", dims: { 폭: 45, 길이: 45, 높이: 10 }, price: 690 },
  { no: "FP-HS-310S-003", name: "흡음 메시 블록 H60", partner: "p-tr-thm", form: "pressing", cust: "DEMO-THM-6003", dims: { 폭: 60, 길이: 80, 높이: 20 }, price: 980 },
  { no: "FP-SR-316-001", name: "스페이서 링 R40", partner: "p-tr-thm", form: "pressing", cust: "DEMO-THM-7001", dims: { 외경: 40, 내경: 32, 높이: 6 }, price: 540 },
  { no: "FP-SR-304-002", name: "에어 갭 실 R55", partner: "p-tr-thm", form: "pressing", cust: "DEMO-THM-7002", dims: { 외경: 55, 내경: 47, 높이: 7 }, price: 590 },
  { no: "FP-SP-304-001", name: "분리 링 R70", partner: "p-tr-thm", form: "crimping", cust: "DEMO-THM-8001", dims: { 외경: 70, 내경: 62, 높이: 9 }, price: 610 },
  { no: "FP-SP-321-002", name: "분리 링 R64", partner: "p-tr-thm", form: "crimping", cust: "DEMO-THM-8002", dims: { 외경: 64, 내경: 56, 높이: 9 }, price: 640 },
  { no: "FP-EMI-TCU-001", name: "전자파 차폐 가스켓 G10", partner: "p-tr-ele", form: "crimping", cust: "DEMO-ELE-9001", dims: { 폭: 10, 길이: 300 }, price: 380 },
  { no: "FP-EMI-CU-002", name: "전자파 차폐 가스켓 G12", partner: "p-tr-ele", form: "crimping", cust: "DEMO-ELE-9002", dims: { 폭: 12, 길이: 300 }, price: 420 },
];
const fpId = (no: string) => `it-${no.toLowerCase()}`;
const fpGrade = (no: string) => {
  const g = no.split("-")[2]!;
  return g === "TCU" ? "TCu" : g === "CU" ? "Cu" : g === "AL" ? "Al" : g;
};

const STEP = { iqc: "ps-tr-iqc", knit: "ps-tr-knit", crimp: "ps-tr-crimp", press: "ps-tr-press", spiral: "ps-tr-spiral", oqc: "ps-tr-oqc" } as const;
const FORM_STEP: Record<Form, string> = { crimping: STEP.crimp, pressing: STEP.press, spiralling: STEP.spiral };

// ───────────────────────────────────────────── 설비(공개 종류·대수: 편조기 36 · 프레스 50t 1·20t 1·10t 3 · 전용기 4 · 롤링기 3 · 절단기 2 · 스포트기 2)
interface EqDef { id: string; no: string; kind: string; name: string; location: string; capacity: string | null; legal: boolean; note: string | null; lot: string }
function equipmentDefs(): EqDef[] {
  const out: EqDef[] = [];
  for (let i = 1; i <= 36; i += 1) {
    const line = i <= 12 ? "A" : i <= 24 ? "B" : "C";
    out.push({ id: `eq-kn-${pad(i, 2)}`, no: `KN-${pad(i, 2)}`, kind: "편조기", name: `편조기 ${pad(i, 2)}`, location: `편조 라인 ${line}(예시)`, capacity: null, legal: false, note: "대수는 홈페이지 공개 값(36대) 기준 예시예요", lot: `KN${pad(i, 2)}` });
  }
  out.push({ id: "eq-pr-050-01", no: "PR-050-01", kind: "프레스", name: "프레스 50톤", location: "가공동 프레스 구역(예시)", capacity: "50톤", legal: true, note: null, lot: "PR05" });
  out.push({ id: "eq-pr-020-01", no: "PR-020-01", kind: "프레스", name: "프레스 20톤", location: "가공동 프레스 구역(예시)", capacity: "20톤", legal: true, note: null, lot: "PR02" });
  for (let i = 1; i <= 3; i += 1) out.push({ id: `eq-pr-010-0${i}`, no: `PR-010-0${i}`, kind: "프레스", name: `프레스 10톤 ${i}호`, location: "가공동 프레스 구역(예시)", capacity: "10톤", legal: true, note: null, lot: `PR1${i}` });
  for (let i = 1; i <= 4; i += 1) out.push({ id: `eq-sp-0${i}`, no: `SP-0${i}`, kind: "전용기", name: `전용기 ${i}호`, location: "가공동(예시)", capacity: null, legal: false, note: "용도는 진단에서 확인해요", lot: `SP0${i}` });
  for (let i = 1; i <= 3; i += 1) out.push({ id: `eq-rl-0${i}`, no: `RL-0${i}`, kind: "롤링기", name: `롤링기 ${i}호`, location: "가공동(예시)", capacity: null, legal: false, note: "산업안전보건법상 롤러기 해당 여부는 진단에서 확인해요", lot: `RL0${i}` });
  for (let i = 1; i <= 2; i += 1) out.push({ id: `eq-ct-0${i}`, no: `CT-0${i}`, kind: "절단기", name: `절단기 ${i}호`, location: "가공동(예시)", capacity: null, legal: false, note: "전단기 해당 여부는 진단에서 확인해요", lot: `CT0${i}` });
  for (let i = 1; i <= 2; i += 1) out.push({ id: `eq-sw-0${i}`, no: `SW-0${i}`, kind: "스포트기", name: `스포트기 ${i}호`, location: "가공동(예시)", capacity: null, legal: false, note: "회사소개서(2016)에만 있는 설비예요", lot: `SW0${i}` });
  return out;
}
const PRESSES = ["eq-pr-050-01", "eq-pr-020-01", "eq-pr-010-01", "eq-pr-010-02", "eq-pr-010-03"];
const FORM_EQ: Record<Form, string[]> = { pressing: PRESSES, crimping: ["eq-rl-01", "eq-rl-02", "eq-rl-03"], spiralling: ["eq-sp-01", "eq-sp-02", "eq-sp-03", "eq-sp-04"] };

/** 오늘 주간조 앵커(6.3절): 편조기 정지 3 · 고장 1 · 준비 1, 프레스 PR-010-02 고장 */
const TODAY_KNIT: Record<string, { status: "stopped" | "breakdown" | "setup"; reason: string; time: string }> = {
  "eq-kn-03": { status: "stopped", reason: "선재 교체 대기", time: "08:12" },
  "eq-kn-15": { status: "stopped", reason: "작업지시 없음", time: "08:14" },
  "eq-kn-28": { status: "stopped", reason: "작업자 배치 조정", time: "08:20" },
  "eq-kn-21": { status: "breakdown", reason: "편조 실린더 마모(부품 대기)", time: "08:05" },
  "eq-kn-09": { status: "setup", reason: "편조 금형 교체 준비", time: "08:30" },
};
/** 오늘 아직 점검하지 않은 설비(오늘 점검 탭·홈 '점검 미완료') */
const TODAY_UNCHECKED = new Set(["eq-kn-03", "eq-kn-09", "eq-kn-15", "eq-kn-21", "eq-kn-28", "eq-pr-010-02", "eq-sp-03", "eq-sw-01", "eq-sw-02", "eq-ct-02"]);

// ───────────────────────────────────────────── TR 시드
function seedTr(ctx: SeedContext): SeedOutput {
  const { anchors } = ctx;
  const A = anchors.tr;
  const today = ctx.today;
  const start = ctx.d(-91);
  const pastDays = workdays(start, ctx.d(-1));
  const at = (date: string, time: string) => kstIso(date, time);

  // ── 재질·품목·공정·BOM
  const material_grades: R<"material_grades">[] = GRADES.map(([id, code, label, note]) => ({ id, code, label, color_tag: code, text_tag: code, heat_resistant_note: note }));
  const items: R<"items">[] = [];
  for (const r of RMS) {
    items.push({
      id: rmId(r.key), item_no: rmNo(r), name: `${GRADE_NAME[r.grade]} 선재 ${r.dia.toFixed(2)}mm`, kind: "raw", material_grade: r.grade, spec: `선경 ${r.dia.toFixed(2)}mm(예시)`,
      unit: "kg", customer_part_no: null, partner_id: r.supplier, status: "active", mesh_grade: null, wire_dia_mm: r.dia, form_process: null,
      application_category: null, special_char: false, knit_width_mm: null, dims: null,
    });
  }
  const rmByKey = new Map(RMS.map((r) => [r.key, r]));
  for (const k of KMS) {
    const rm = rmByKey.get(k.rm)!;
    const sold = !!k.partner;
    items.push({
      id: kmId(k.no), item_no: k.no, name: `${GRADE_NAME[k.grade]} ${sold ? "편조 롤" : "편조망"} ${MESH[k.mesh]} ${k.width}mm`, kind: "knit", material_grade: k.grade,
      spec: `폭 ${k.width}mm · 선경 ${rm.dia.toFixed(2)}mm(예시)`, unit: "m", customer_part_no: k.cust, partner_id: k.partner, status: "active", mesh_grade: k.mesh,
      wire_dia_mm: rm.dia, form_process: "none", application_category: sold ? "편조 롤" : null, special_char: false, knit_width_mm: k.width, dims: null,
    });
  }
  for (const f of FPS) {
    const grade = fpGrade(f.no);
    const cat = f.no.split("-")[1]!;
    const km = KMS.find((k) => k.no === KM_FOR_GRADE[grade])!;
    items.push({
      id: fpId(f.no), item_no: f.no, name: f.name, kind: "part", material_grade: grade,
      spec: `${Object.entries(f.dims).map(([k, v]) => `${k} ${v}`).join(" · ")}mm(예시)`, unit: "개", customer_part_no: f.cust, partner_id: f.partner,
      status: "active", mesh_grade: km.mesh, wire_dia_mm: rmByKey.get(km.rm)!.dia, form_process: f.form, application_category: CAT[cat] ?? null,
      special_char: cat === "AF", knit_width_mm: null, dims: f.dims,
    });
  }
  const itemById = new Map(items.map((i) => [i.id, i]));
  const process_steps: R<"process_steps">[] = [
    { id: STEP.iqc, code: "P10", name: "수입검사", sequence: 1, equipment_kind: null, std_cycle_note: "입고·검사 단계는 업계 일반 흐름에 맞춘 가설이에요", inspection_points: ["재질 확인", "선경 측정", "성적서 대조"], hypothesis: true },
    { id: STEP.knit, code: "P20", name: "편조", sequence: 2, equipment_kind: "편조기", std_cycle_note: null, inspection_points: ["초중종물", "메시 밀도", "편조 폭"] },
    { id: STEP.crimp, code: "P31", name: "크림핑", sequence: 3, equipment_kind: "롤링기", std_cycle_note: "설비 연결은 가설이에요", inspection_points: ["초중종물", "주름 간격"] },
    { id: STEP.press, code: "P32", name: "프레스 성형", sequence: 4, equipment_kind: "프레스", std_cycle_note: null, inspection_points: ["초중종물", "치수", "중량"] },
    { id: STEP.spiral, code: "P33", name: "스파이럴링", sequence: 5, equipment_kind: "전용기", std_cycle_note: "설비 연결은 가설이에요", inspection_points: ["초중종물", "감김 수"] },
    { id: STEP.oqc, code: "P40", name: "출하검사·포장", sequence: 6, equipment_kind: null, std_cycle_note: "출하 단계는 업계 일반 흐름에 맞춘 가설이에요", inspection_points: ["외관", "수량", "라벨"], hypothesis: true },
  ];
  const boms: R<"boms">[] = [
    ...FPS.map((f, i) => ({ id: `bom-tr-${pad(i + 1, 2)}`, parent_item_id: fpId(f.no), child_item_id: kmId(KM_FOR_GRADE[fpGrade(f.no)]!), qty_per: round(0.25 + (i % 5) * 0.08, 0.01), unit: "m" })),
    ...KMS.map((k, i) => ({ id: `bom-tr-${pad(FPS.length + i + 1, 2)}`, parent_item_id: kmId(k.no), child_item_id: rmId(k.rm), qty_per: round(0.03 + k.width / 4000, 0.001), unit: "kg" })),
  ];

  // ── 설비·법정 검사·보전 일정·계측기
  const eqDefs = equipmentDefs();
  const eqById = new Map(eqDefs.map((e) => [e.id, e]));
  const LEGAL: Record<string, { due: string; done: string | null; next: string }> = {
    "eq-pr-050-01": { due: ctx.d(51), done: null, next: ctx.d(51) },
    "eq-pr-020-01": { due: ctx.d(28), done: null, next: ctx.d(28) },
    "eq-pr-010-01": { due: ctx.d(66), done: null, next: ctx.d(66) },
    "eq-pr-010-02": { due: ctx.d(-30), done: ctx.d(-42), next: addDays(ctx.d(-42), 730) },
    "eq-pr-010-03": { due: ctx.d(-61), done: ctx.d(-70), next: addDays(ctx.d(-70), 730) },
  };
  const equipment: R<"equipment">[] = eqDefs.map((e) => ({
    id: e.id, equipment_no: e.no, kind: e.kind, name: e.name, location: e.location,
    status: e.id === "eq-kn-21" || e.id === "eq-pr-010-02" ? "repair" : "active",
    installed_on: null, note: e.note, capacity: e.capacity, legal_inspection_required: e.legal, next_legal_inspection_on: LEGAL[e.id]?.next ?? null,
  }));
  const legal_inspections: R<"legal_inspections">[] = PRESSES.map((id, i) => {
    const l = LEGAL[id]!;
    return { id: `li-tr-0${i + 1}`, equipment_id: id, kind: "안전검사(프레스)", due_on: l.due, done_on: l.done, result: l.done ? "pass" : "scheduled", cert_ref: l.done ? `안전검사합격증_${eqById.get(id)!.no}(예시).pdf` : null };
  });
  const PM: [eq: string, task: string, cycle: string, next: number, owner: string][] = [
    ["eq-kn-01", "편조 라인 A 바늘·싱커 점검", "매월", 2, OPS[0]], ["eq-kn-07", "편조 실린더 마모 측정", "매월", -1, OPS[1]], ["eq-kn-13", "편조 라인 B 바늘·싱커 점검", "매월", 5, OPS[2]],
    ["eq-kn-21", "편조 실린더 교체(부품 입고 후)", "수시", 3, TP.plant], ["eq-kn-25", "편조 라인 C 바늘·싱커 점검", "매월", 9, OPS[3]], ["eq-kn-33", "선재 공급 장치 청소", "2주", 1, OPS[4]],
    ["eq-pr-050-01", "클러치·브레이크 점검", "매주", 0, TP.plant], ["eq-pr-050-01", "유압유 교환", "6개월", 34, TP.plant], ["eq-pr-020-01", "클러치·브레이크 점검", "매주", 1, TP.plant],
    ["eq-pr-010-01", "클러치·브레이크 점검", "매주", 2, TP.plant], ["eq-pr-010-02", "이상 소음 원인 점검 후 재가동 확인", "수시", 0, TP.plant], ["eq-pr-010-03", "클러치·브레이크 점검", "매주", 3, TP.plant],
    ["eq-rl-01", "롤 표면 점검", "매월", 6, OPS[5]], ["eq-rl-02", "롤 간격 조정", "2주", -2, OPS[0]], ["eq-rl-03", "롤 표면 점검", "매월", 14, OPS[1]],
    ["eq-ct-01", "칼날 교체", "2개월", 21, OPS[2]], ["eq-ct-02", "칼날 덮개 연동 장치 점검", "매월", 4, OPS[3]], ["eq-sp-01", "구동부 윤활", "2주", 3, OPS[4]],
    ["eq-sp-03", "센서 청소·점검", "매월", 11, OPS[5]], ["eq-sw-01", "전극 팁 교체", "3개월", 27, TP.plant],
    // 금형·지그(개발 담당이 관리, 개발 홈 '보전 일정'에 보임)
    ["eq-pr-010-01", "프레스 금형 스토퍼 마모 점검", "매월", 2, TP.dev], ["eq-pr-020-01", "성형 금형 세척·치수 확인", "2주", 1, TP.dev],
    ["eq-sp-01", "스파이럴링 감김 지그 마모 측정", "매월", 6, TP.dev],
  ];
  const cycleDays = (c: string) => (c === "매주" ? 7 : c === "2주" ? 14 : c === "매월" ? 30 : c === "2개월" ? 60 : c === "3개월" ? 90 : c === "6개월" ? 182 : 30);
  const pm_plans: R<"pm_plans">[] = PM.map(([eq, task, cycle, next, owner], i) => ({
    id: `pm-tr-${pad(i + 1, 2)}`, equipment_id: eq, task, cycle, next_due_on: ctx.d(next), last_done_on: cycle === "수시" ? null : addDays(ctx.d(next), -cycleDays(cycle)), owner_id: owner,
  }));
  const GA: [kind: string, range: string, loc: string, months: number, next: number, status?: "active" | "calibrating"][] = [
    ["버니어 캘리퍼스", "0~150mm", "품질보증실", 12, 8], ["버니어 캘리퍼스", "0~150mm", "가공동 프레스 구역", 12, 47], ["버니어 캘리퍼스", "0~200mm", "가공동", 12, 15],
    ["버니어 캘리퍼스", "0~150mm", "출하장", 12, 120], ["마이크로미터", "0~25mm", "품질보증실", 12, 22], ["마이크로미터", "0~25mm", "편조 라인 A", 12, 156],
    ["마이크로미터", "25~50mm", "품질보증실", 12, 8], ["전자저울", "최대 3kg", "가공동", 12, 200], ["전자저울", "최대 30kg", "자재 창고", 12, 64],
    ["전자저울", "최대 600g", "품질보증실", 12, 98], ["하이트 게이지", "0~300mm", "품질보증실", 24, 22], ["핀 게이지 세트", "1~10mm", "품질보증실", 24, 310],
    ["선경 측정기", "0~1mm", "자재 창고", 12, 77], ["밀도 측정 지그", "-", "품질보증실", 12, -5, "calibrating"], ["다이얼 게이지", "0~10mm", "가공동 프레스 구역", 12, 130],
  ];
  const gauges: R<"gauges">[] = GA.map(([kind, range, loc, months, next, status], i) => ({
    id: `ga-tr-${pad(i + 1, 2)}`, gauge_no: `GA-${pad(i + 1, 2)}`, kind, range: range === "-" ? null : range, location: `${loc}(예시)`, cycle_months: months,
    last_calibrated_on: addDays(ctx.d(next), -months * 30), next_due_on: ctx.d(next), cert_ref: `교정성적서_GA-${pad(i + 1, 2)}(예시).pdf`, status: status ?? "active",
  }));

  // ── 원자재 입고·재고 LOT·입출고·발주(재고일수 = 가용 재고 ÷ 최근 28일 사용량 일평균, 홈 위젯과 같은 식)
  const rngS = ctx.rng("stock");
  const material_receipts: R<"material_receipts">[] = [];
  const stock_lots: R<"stock_lots">[] = [];
  const stock_movements: R<"stock_movements">[] = [];
  const purchase_orders: R<"purchase_orders">[] = [];
  const safety_stocks: R<"safety_stocks">[] = [];
  /** 원자재 LOT 번호 → (품목, 입고일) */
  const rLots: { lot: string; item: string; date: string; key: string }[] = [];
  const windowFrom = kstIso(addDays(today, -28), "00:00");
  const lotSeqByDay = new Map<string, number>();
  let rcvN = 0;
  let mvN = 0;
  const pendingReceipts: { r: RmDef; date: string; qty: number; lot: string; stockId: string; inspected: boolean }[] = [];
  RMS.forEach((r, ri) => {
    // 사용: 이틀에 한 번(사용량 적은 황동·알루미늄은 사흘에 한 번)
    const every = r.use <= 3 ? 3 : 2;
    const events: { date: string; qty: number }[] = [];
    pastDays.forEach((d, i) => {
      if (i % every !== ri % every) return;
      events.push({ date: d, qty: round(r.use * every * (0.9 + rngS.next() * 0.2), 0.5) });
    });
    const windowUse = events.filter((e) => at(e.date, "17:00") >= windowFrom).reduce((s, e) => s + e.qty, 0);
    const onHand = round((windowUse / 28) * (r.days + 0.5), 0.5);
    const total = events.reduce((s, e) => s + e.qty, 0) + onHand;
    // 입고일: 고르게, SUS321 0.20은 마지막 입고가 앵커 LOT(오늘 −19일, 9/11 금), 주석 도금 구리는 어제(수입검사 전)
    const n = r.receipts;
    const holdLast = r.key === "TCU-011";
    const nFifo = holdLast ? n - 1 : n;
    const lastDate = r.key === "321-020" ? ctx.d(-19) : r.key === "TCU-011" ? ctx.d(-1) : pastDays[Math.min(pastDays.length - 1, Math.floor(((n - 1) / n) * pastDays.length) + (ri % 4))]!;
    const dates: string[] = [];
    for (let i = 0; i < n - 1; i += 1) dates.push(pastDays[Math.floor((i / n) * pastDays.length)]!);
    dates.push(lastDate);
    const size = round(total / nFifo, 10);
    const sizes = dates.map((_, i) => (i === 0 ? size + round(r.use * 3, 10) : i < nFifo - 1 ? size : 0));
    sizes[nFifo - 1] = round(total - sizes.slice(0, nFifo - 1).reduce((s, x) => s + x, 0), 0.5);
    if (holdLast) sizes[n - 1] = round(r.use * 15, 10);
    // FIFO 사용
    const lots = dates.map((date, i) => {
      const k = `${LOT_CODE[r.grade]}-${ymd6(date)}`;
      const seq = (lotSeqByDay.get(k) ?? 0) + 1;
      lotSeqByDay.set(k, seq);
      const lot = r.key === "321-020" && i === n - 1 ? A.lotChain[0] : `R-${k}-${pad(seq, 2)}`;
      const stockId = r.key === "321-020" && i === n - 1 ? A.stockLot321 : `sl-tr-r-${pad(ri + 1, 2)}${pad(i + 1, 2)}`;
      return { date, qty: sizes[i]!, left: sizes[i]!, lot, stockId };
    });
    for (const l of lots) {
      rLots.push({ lot: l.lot, item: rmId(r.key), date: l.date, key: r.key });
      pendingReceipts.push({ r, date: l.date, qty: l.qty, lot: l.lot, stockId: l.stockId, inspected: !(holdLast && l === lots[n - 1]) });
    }
    const fifo = lots.slice(0, nFifo);
    for (const e of events) {
      let need = e.qty;
      for (const l of fifo) {
        if (need <= 0) break;
        if (l.left <= 0 || l.date > e.date) continue;
        const take = Math.min(l.left, need);
        l.left = round(l.left - take, 0.5);
        need = round(need - take, 0.5);
        mvN += 1;
        stock_movements.push({ id: `mv-tr-${pad(mvN, 4)}`, lot_id: l.stockId, kind: "consume", qty: -take, moved_at: at(e.date, "17:00"), ref_type: "work_orders", ref_id: null });
      }
      if (need > 0) {
        // 다음 입고분에서 미리 당겨 쓴 것으로(예시 데이터 균형)
        const next = fifo.find((l) => l.left > 0);
        if (next) { next.left = round(next.left - need, 0.5); mvN += 1; stock_movements.push({ id: `mv-tr-${pad(mvN, 4)}`, lot_id: next.stockId, kind: "consume", qty: -need, moved_at: at(e.date, "17:00"), ref_type: "work_orders", ref_id: null }); }
      }
    }
    lots.forEach((l, i) => {
      const inspected = !(holdLast && i === n - 1);
      stock_lots.push({
        id: l.stockId, item_id: rmId(r.key), lot_no: l.lot, qty_on_hand: Math.max(0, l.left),
        location: `자재 창고 ${r.supplier === "p-tr-wire" ? "A" : "B"}-${pad((ri % 6) + 1, 2)}(예시)`,
        status: !inspected ? "hold" : l.left > 0 ? "available" : "consumed",
      });
    });
    safety_stocks.push({ id: `ss-tr-${pad(ri + 1, 2)}`, item_id: rmId(r.key), min_days: r.minDays, reorder_qty: round(r.use * 20, 50) });
  });
  pendingReceipts.sort((a, b) => a.date.localeCompare(b.date) || a.lot.localeCompare(b.lot));
  const receiptByLot = new Map<string, string>();
  for (const p of pendingReceipts) {
    rcvN += 1;
    const id = `rcv-tr-${pad(rcvN)}`;
    receiptByLot.set(p.lot, id);
    const wire = p.r.supplier === "p-tr-wire";
    material_receipts.push({
      id, partner_id: p.r.supplier, item_id: rmId(p.r.key), supplier_lot_no: `${wire ? "WS" : "NF"}-${ymd6(p.date)}-${pad(rngS.int(10, 98), 2)}`, qty: p.qty, received_on: p.date,
      cert_ref: `성적서_${p.lot}.pdf`, inspection_id: p.inspected ? `ins-tr-in-${pad(rcvN)}` : null, heat_no: `H${ymd6(addDays(p.date, -rngS.int(12, 30)))}${rngS.int(10, 99)}`,
      cert_type: "검사증명서 3.1(예시)", material_grade_verified: p.inspected ? true : null, wire_dia_measured: p.inspected ? round(p.r.dia + (rngS.next() - 0.5) * 0.004, 0.001) : null,
    });
    mvN += 1;
    stock_movements.push({ id: `mv-tr-${pad(mvN, 4)}`, lot_id: p.stockId, kind: "in", qty: p.qty, moved_at: at(p.date, "10:30"), ref_type: "material_receipts", ref_id: id });
    purchase_orders.push({
      id: `po-tr-${pad(rcvN)}`, po_no: `PO-${ymd6(p.date).slice(0, 4)}-${pad(rcvN)}`, partner_id: p.r.supplier, ordered_on: onWorkday(addDays(p.date, -8)),
      lines: [{ item_id: rmId(p.r.key), qty: round(p.qty, 10), unit_price: PRICE_KG[p.r.grade]! }], due_on: p.date, status: "received",
    });
  }
  // 앵커 발주 초안(SUS321 0.20) + 발주 1건(SUS304 0.15, 입고 예정)
  purchase_orders.push({ id: A.purchaseOrder, po_no: `PO-${ymd6(today).slice(0, 4)}-049`, partner_id: "p-tr-wire", ordered_on: today, lines: [{ item_id: rmId("321-020"), qty: 600, unit_price: PRICE_KG["321"]! }, { item_id: rmId("321-025"), qty: 150, unit_price: PRICE_KG["321"]! + 300 }], due_on: ctx.d(6), status: "draft" });
  purchase_orders.push({ id: "po-tr-050", po_no: `PO-${ymd6(today).slice(0, 4)}-050`, partner_id: "p-tr-wire", ordered_on: ctx.d(-3), lines: [{ item_id: rmId("304-015"), qty: 400, unit_price: PRICE_KG["304"]! }], due_on: ctx.d(6), status: "ordered" });

  const price_indexes: R<"price_indexes">[] = [];
  const PI: [mat: string, key: string, base: number, drift: number][] = [["SUS304", "304", 7400, 70], ["SUS316", "316", 12100, 90], ["SUS321", "321", 10300, 110], ["구리", "cu", 15100, 120]];
  const rngP = ctx.rng("price");
  for (const [mat, key, base, drift] of PI) {
    for (let m = -5; m <= 0; m += 1) {
      const period = monthOffset(today, m);
      price_indexes.push({ id: `pi-tr-${key}-${period}`, index_name: "선재 구매 단가 지수(예시)", material: mat, period, value: round(base + (m + 5) * drift + (rngP.next() - 0.5) * drift * 2, 10), unit: "원/kg", source: "예시" });
    }
  }

  // ── 수주·수주 줄·출하
  const rngO = ctx.rng("orders");
  const CUSTOMERS: [partner: string, weight: number][] = [["p-tr-exh", 40], ["p-tr-saf", 20], ["p-tr-thm", 15], ["p-tr-pwt", 12], ["p-tr-flt", 11], ["p-tr-ele", 2]];
  const itemsOf = (partner: string) => items.filter((i) => i.partner_id === partner && i.kind !== "raw");
  const priceOf = (itemId: string) => {
    const it = itemById.get(itemId)!;
    if (it.kind === "knit") return KMS.find((k) => kmId(k.no) === itemId)!.price;
    return FPS.find((f) => fpId(f.no) === itemId)!.price;
  };
  type LineDraft = { id: string; order: string; item: string; qty: number; due: string; price: number; late: string | null; status?: string };
  const sales_orders: R<"sales_orders">[] = [];
  const lineDrafts: LineDraft[] = [];
  const orderDays = workdays(start, ctx.d(-2));
  let soN = 0;
  let solN = 0;
  const anchorOrderDay = ctx.d(-30);
  for (let j = 0; j < 44; j += 1) {
    const date = orderDays[Math.floor((j * orderDays.length) / 44)]!;
    const partner = soN === 30 ? "p-tr-ele" : rngO.weighted(CUSTOMERS.filter(([p]) => p !== "p-tr-ele"));
    soN += 1;
    const orderId = `so-tr-${pad(soN)}`;
    const pool = itemsOf(partner);
    const nLines = Math.min(pool.length, rngO.weighted([[2, 40], [3, 50], [4, 10]] as const));
    const chosen = rngO.sample(pool, nLines);
    const due = onWorkday(addDays(date, rngO.int(14, 28)));
    for (const it of chosen) {
      solN += 1;
      const qty = it.kind === "knit" ? round(rngO.int(600, 2400), 100) : round(rngO.int(1200, 7200), 100);
      lineDrafts.push({ id: `sol-tr-${pad(solN)}`, order: orderId, item: it.id!, qty, due, price: round(priceOf(it.id!) * (0.96 + rngO.next() * 0.08), 10), late: null });
    }
    sales_orders.push({
      id: orderId, partner_id: partner, customer_po_no: `${ymd6(date).slice(0, 2)}-${mmdd(date)}-${pad(soN, 2)}`, order_date: date, status: "open", owner_id: TP.sales,
      source: rngO.weighted([["mail", 50], ["portal", 25], ["fax", 15], ["phone", 10]] as const), attachment_refs: [`발주서_${mmdd(date)}_${pad(soN, 2)}(예시).pdf`],
    });
  }
  // 앵커 수주: FP-DR-321-001 3,600개(9/11·9/16·9/24 세 번 출하, 가운데가 S-260916-012)
  // 출하(9/16) → 고객 수입검사 → 클레임 접수(9/18): 출하 당일 클레임이 되지 않게 이틀 간격(리뷰 2차)
  soN += 1;
  const anchorOrder = `so-tr-${pad(soN)}`;
  sales_orders.push({ id: anchorOrder, partner_id: "p-tr-exh", customer_po_no: `${ymd6(anchorOrderDay).slice(0, 2)}-${mmdd(anchorOrderDay)}-${pad(soN, 2)}`, order_date: anchorOrderDay, status: "closed", owner_id: TP.sales, source: "mail", attachment_refs: [`발주서_${mmdd(anchorOrderDay)}_${pad(soN, 2)}(예시).pdf`] });
  solN += 1;
  const anchorLine = `sol-tr-${pad(solN)}`;
  lineDrafts.push({ id: anchorLine, order: anchorOrder, item: fpId(A.item), qty: 3600, due: ctx.d(-7), price: 1850, late: null });

  // 진행 중 줄: 납기 7일 안은 3줄만(그중 1줄 생산 지연), 나머지는 8일 뒤 이후로
  const open = lineDrafts.filter((l) => l.due >= today).sort((a, b) => a.due.localeCompare(b.due));
  // 10/5(월)은 개천절 대체공휴일이라 10/6(화)
  const nearDue = [ctx.d(1), ctx.d(2), ctx.d(6)].map(onWorkday);
  open.forEach((l, i) => {
    if (i < 3) l.due = nearDue[i]!;
    else if (l.due <= ctx.d(7)) l.due = onWorkday(ctx.d(8 + (i % 12)));
    l.due = shiftToWorkday(l.due, 1);
  });
  // 같은 수주의 줄은 같은 납기가 아니어도 됨(줄 단위 납기)
  const lateLine = open[1];
  if (lateLine) { lateLine.late = "KN-21 고장으로 편조가 늦어져요(예상)"; lateLine.status = "late"; }

  const shipments: R<"shipments">[] = [];
  const shipDraft: { id: string; order: string; line: string; date: string; qty: number; item: string; partner: string; status: R<"shipments">["status"] }[] = [];
  const statusOfShip = (date: string): R<"shipments">["status"] => (date > today ? "planned" : date === today ? "inspected" : daysBetween(date, today) > 2 ? "delivered" : "shipped");
  const sales_order_lines: R<"sales_order_lines">[] = [];
  const orderOf = new Map(sales_orders.map((o) => [o.id, o]));
  let shpN = 0;
  for (const l of lineDrafts) {
    const order = orderOf.get(l.order)!;
    const parts = [0.34, 0.33, 0.33];
    let dates: string[];
    if (l.id === anchorLine) dates = [ctx.d(-19), ctx.d(-14), ctx.d(-6)];
    else if (l.due < today) {
      const lateShip = rngO.chance(0.04);
      if (lateShip) l.late = rngO.pick(["원자재 입고가 늦어졌어요", "설비 고장으로 생산이 늦어졌어요", "고객 요청으로 출하일을 옮겼어요"]);
      const last = lateShip ? addDays(l.due, 2) : addDays(l.due, -rngO.int(0, 2));
      const span = Math.max(4, daysBetween(order.order_date, last) - 2);
      dates = [addDays(last, -Math.round(span * 0.66)), addDays(last, -Math.round(span * 0.33)), last];
    } else {
      // 진행 중: 이미 일부 출하 + 남은 것 예정
      const room = daysBetween(today, l.due);
      const placed = daysBetween(order.order_date, today);
      if (placed > 10) dates = [addDays(today, -rngO.int(2, 6)), room >= 1 ? addDays(today, Math.max(0, room - 3)) : today, l.due === today ? today : addDays(l.due, -1)];
      else dates = [room > 4 ? addDays(today, Math.max(1, room - 6)) : today, addDays(l.due, -1)];
      if (l.status === "late") dates = [addDays(today, -4), addDays(l.due, 3)];
    }
    dates = dates.map((d) => onWorkday(d < order.order_date ? addDays(order.order_date, 2) : d));
    const qtys = dates.map((_, i) => (dates.length === 3 ? round(l.qty * parts[i]!, 100) : round(l.qty / dates.length, 100)));
    qtys[qtys.length - 1] = l.qty - qtys.slice(0, -1).reduce((s, x) => s + x, 0);
    dates.forEach((date, i) => {
      shpN += 1;
      shipDraft.push({ id: `shp-tr-${pad(shpN, 4)}`, order: l.order, line: l.id, date, qty: qtys[i]!, item: l.item, partner: order.partner_id, status: statusOfShip(date) });
    });
  }
  // 출하 LOT 번호: 날짜별 순번(앵커는 9/16의 012)
  shipDraft.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const anchorShipLot = A.lotChain[3];
  const anchorShip = shipDraft.find((s) => s.line === anchorLine && s.date === ctx.d(-14))!;
  const seqByDate = new Map<string, number>();
  const shipLot = new Map<string, string>();
  for (const s of shipDraft) {
    if (s === anchorShip) { shipLot.set(s.id, anchorShipLot); continue; }
    let n = (seqByDate.get(s.date) ?? 0) + 1;
    if (s.date === anchorShip.date && n === 12) n += 1;
    seqByDate.set(s.date, n);
    shipLot.set(s.id, `S-${ymd6(s.date)}-${pad(n)}`);
  }
  let outN = 0;
  const outgoingIns: { id: string; lot: string; item: string; date: string }[] = [];
  for (const s of shipDraft) {
    const lot = shipLot.get(s.id)!;
    const inspected = s.status !== "planned";
    let insId: string | null = null;
    if (inspected) { outN += 1; insId = `ins-tr-out-${pad(outN, 4)}`; outgoingIns.push({ id: insId, lot, item: s.item, date: s.date }); }
    shipments.push({
      id: s.id, order_id: s.order, order_line_id: s.line, ship_date: s.date, qty: s.qty, lot_ids: [lot], delivery_note_no: inspected ? `DN-${lot.slice(2)}` : null,
      status: s.status, outgoing_inspection_id: insId, packing_photo_names: inspected ? [`포장사진_${mmdd(s.date)}_${lot.slice(-3)}.jpg`] : [],
    });
  }
  const shippedOf = (lineId: string) => shipments.filter((s) => s.order_line_id === lineId && (s.status === "shipped" || s.status === "delivered")).reduce((t, s) => t + s.qty, 0);
  for (const l of lineDrafts) {
    const shipped = shippedOf(l.id);
    const status: R<"sales_order_lines">["status"] = l.status === "late" ? "late" : shipped >= l.qty ? "shipped" : shipped > 0 ? "partially_shipped" : "open";
    sales_order_lines.push({ id: l.id, order_id: l.order, item_id: l.item, qty: l.qty, due_date: l.due, status, promised_date: l.status === "late" ? addDays(l.due, 3) : null, unit_price: l.price, shipped_qty: shipped, late_reason: l.late });
  }
  for (const o of sales_orders) {
    const ls = sales_order_lines.filter((l) => l.order_id === o.id);
    const allShipped = ls.every((l) => l.status === "shipped");
    o.status = allShipped ? (daysBetween(o.order_date, today) > 35 ? "closed" : "shipped") : ls.some((l) => l.shipped_qty > 0) ? "partially_shipped" : "open";
  }

  // ── 고객 클레임·시정조치(8D)·4M 변경
  const findShip = (itemNo: string, partner: string, near: string) => {
    const list = shipments.filter((s) => {
      const d = shipDraft.find((x) => x.id === s.id)!;
      return d.item === fpId(itemNo) && d.partner === partner && s.status !== "planned";
    }).sort((a, b) => Math.abs(daysBetween(a.ship_date, near)) - Math.abs(daysBetween(b.ship_date, near)));
    return list[0]?.lot_ids[0] ?? `S-${ymd6(near)}-001`;
  };
  const steps = (doneDates: (string | null)[], doingIdx: number | null, notes: Record<string, string>, owner: string): DStep[] =>
    (["D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"] as const).map((step, i) => ({
      step, status: doneDates[i] ? "done" : doingIdx === i ? "doing" : "todo", done_on: doneDates[i] ?? null, note: notes[step] ?? null, owner_id: doingIdx === i || doneDates[i] ? owner : null,
    }));
  const c1 = ctx.d(-78), c2 = ctx.d(-50), c3 = ctx.d(-12);
  const customer_claims: R<"customer_claims">[] = [
    { id: "clm-tr-2026-01", claim_no: "CL-2026-01", partner_id: "p-tr-thm", item_id: fpId("FP-HS-321-001"), received_on: c1, description: "방진 와셔 높이 편차(상한 초과). 고객 조립 라인에서 발견됐어요.", status: "closed", due_on: addDays(c1, 17), customer_ref_no: `QR-${mmdd(c1)}-03`, qty_affected: 300, lot_nos: [findShip("FP-HS-321-001", "p-tr-thm", addDays(c1, -6))], containment_due: addDays(c1, 1), report_8d_due: addDays(c1, 17), severity: "low" },
    { id: "clm-tr-2026-02", claim_no: "CL-2026-02", partner_id: "p-tr-exh", item_id: fpId("FP-MP-304-002"), received_on: c2, description: "머플러 패킹 중량 미달. 고객 수입검사에서 표본 일부가 걸렸어요.", status: "closed", due_on: addDays(c2, 17), customer_ref_no: `QR-${mmdd(c2)}-05`, qty_affected: 450, lot_nos: [findShip("FP-MP-304-002", "p-tr-exh", addDays(c2, -5))], containment_due: addDays(c2, 1), report_8d_due: addDays(c2, 17), severity: "medium" },
    { id: A.claim, claim_no: A.claimNo, partner_id: A.partner, item_id: fpId(A.item), received_on: c3, description: "디커플링 링 치수 불량(외경 상한 초과). 고객 수입검사에서 발견됐어요.", status: "investigating", due_on: ctx.d(6), customer_ref_no: `QR-${mmdd(c3)}-07`, qty_affected: 1200, lot_nos: [anchorShipLot], containment_due: ctx.d(-11), report_8d_due: ctx.d(6), severity: "high" },
  ];
  const doneAll = (d0: string) => [d0, d0, addDays(d0, 1), addDays(d0, 1), addDays(d0, 5), addDays(d0, 8), addDays(d0, 12), addDays(d0, 15), addDays(d0, 16)];
  const corrective_actions: R<"corrective_actions">[] = [
    { id: "ca-tr-2026-01", related_type: "claim", related_id: "clm-tr-2026-01", method: "8D", root_cause: "프레스 금형 스토퍼 마모로 높이가 커졌어요(예시)", actions: "스토퍼 교체, 초중종물 높이 측정 추가", owner_id: TP.qa, due_on: addDays(c1, 17), status: "closed", artifact_id: null, d_steps: steps(doneAll(c1), null, { D3: "재고 300개 전수 선별", D4: "금형 스토퍼 마모", D7: "금형 점검표에 스토퍼 항목 추가" }, TP.qa), containment: "재고 300개 전수 선별(예시)", verification: "2주간 높이 불량 0건(예시)", horizontal_deployment: "같은 금형 구조 품목 3종 점검(예시)" },
    { id: "ca-tr-2026-02", related_type: "claim", related_id: "clm-tr-2026-02", method: "8D", root_cause: "스파이럴 감김 수 설정이 품목 전환 때 바뀌지 않았어요(예시)", actions: "품목 전환 체크리스트에 감김 수 확인 추가", owner_id: TP.qa, due_on: addDays(c2, 17), status: "closed", artifact_id: null, d_steps: steps(doneAll(c2), null, { D3: "출하 대기 재고 중량 전수 측정", D4: "감김 수 설정 누락", D7: "전환 체크리스트 개정" }, TP.qa), containment: "출하 대기 재고 중량 전수 측정(예시)", verification: "3 LOT 연속 중량 합격(예시)", horizontal_deployment: "전용기 4대 설정표 점검(예시)" },
    {
      id: A.correctiveAction, related_type: "claim", related_id: A.claim, method: "8D", root_cause: null, actions: null, owner_id: TP.qa, due_on: ctx.d(6), status: "open", artifact_id: A.artifact8d,
      d_steps: steps([c3, c3, ctx.d(-11), ctx.d(-11), null, null, null, null, null], 4, {
        D0: "클레임 접수, 대응 준비", D1: "팀: 품질보증·공장장·영업·생산", D2: "외경 상한 초과, 대상 LOT S-260916-012",
        D3: "출하 대기 재고 2,400개 전수 선별, 의심 LOT 1,700개는 격리 구역 B-2 보관", D4: "원인 후보: KN-07 편조 조건표(개정안 고객 승인 대기) · 프레스 금형 마모",
      }, TP.qa),
      containment: "출하 대기 재고 2,400개 전수 선별(예시) · 의심 LOT 1,700개 격리 구역 B-2 보관", verification: null, horizontal_deployment: null,
    },
  ];
  const change_requests_4m: R<"change_requests_4m">[] = [
    { id: "cr4m-tr-2026-01", change_no: "CR4M-2026-01", category: "material", description: "SUS304 선재 2차 공급처 추가(예시)", affected_item_ids: [rmId("304-015"), rmId("304-020")], reason: "공급 안정화", risk_note: "성적서 항목 동일 여부 확인", customer_notice_required: true, customer_approval_status: "approved", ppap_required: false, initial_lot_no: null, effective_on: ctx.d(-70), status: "effective", requested_by: TP.admin, requested_on: ctx.d(-85) },
    { id: "cr4m-tr-2026-02", change_no: "CR4M-2026-02", category: "machine", description: "프레스 PR-010-01 금형 교체(예시)", affected_item_ids: [fpId("FP-SR-316-001"), fpId("FP-SR-304-002")], reason: "금형 수명 도달", risk_note: "초품 치수 전수 측정", customer_notice_required: true, customer_approval_status: "approved", ppap_required: true, initial_lot_no: `F-PR11-${ymd6(ctx.d(-40))}-001`, effective_on: ctx.d(-40), status: "closed", requested_by: TP.dev, requested_on: ctx.d(-56) },
    { id: "cr4m-tr-2026-03", change_no: "CR4M-2026-03", category: "man", description: "야간조 편조 작업자 교대 배치 변경(예시)", affected_item_ids: [], reason: "야간조 인원 조정", risk_note: "초중종물 기록 누락 주의", customer_notice_required: false, customer_approval_status: "not_required", ppap_required: false, initial_lot_no: null, effective_on: ctx.d(12), status: "drafting", requested_by: TP.plant, requested_on: ctx.d(-2) },
    { id: A.change4m, change_no: "CR4M-2026-04", category: "method", description: "KN-07 편조 조건표 개정", affected_item_ids: [fpId(A.item)], reason: "클레임 CL-2026-03 원인 후보(편조 밀도 편차)", risk_note: "개정 전후 3 LOT 치수 비교", customer_notice_required: true, customer_approval_status: "requested", ppap_required: true, initial_lot_no: null, effective_on: ctx.d(7), status: "waiting_customer", requested_by: TP.dev, requested_on: ctx.d(-9) },
  ];

  // ── 고장·현장 등록·아차사고
  const rngF = ctx.rng("field");
  const BD: [day: number, eq: string, time: string, symptom: string, min: number | null, cause: string | null, repair: string | null][] = [
    [-84, "eq-kn-05", "10:20", "바늘 파손", 95, "바늘 피로 파손", "바늘 4개 교체"],
    [-74, "eq-pr-010-01", "14:10", "클러치 이상음", 180, "클러치 라이닝 마모", "라이닝 교체"],
    [-62, "eq-rl-02", "09:40", "롤 회전 불량", 120, "베어링 손상", "베어링 교체"],
    [-55, "eq-kn-14", "15:30", "구동 벨트 마모", 70, "벨트 수명", "벨트 교체"],
    [-47, "eq-ct-01", "11:00", "칼날 이가 빠짐", 45, "이물 절단", "칼날 교체"],
    [-39, "eq-kn-30", "21:15", "선재 공급 장치 걸림", 40, "가이드 마모", "가이드 교체"],
    [-32, "eq-sp-02", "13:20", "센서 반응 늦음", 60, "센서 오염", "센서 청소·교정"],
    [-25, "eq-kn-11", "16:45", "바늘 파손", 85, "바늘 피로 파손", "바늘 6개 교체"],
    [-18, "eq-pr-050-01", "10:05", "유압 누유", 210, "호스 연결부 패킹 손상", "패킹 교체"],
    [-9, "eq-kn-21", "14:20", "편조 실린더 마모(부품 대기)", null, "실린더 마모 추정(1차 기록)", null],
  ];
  const breakdown_records: R<"breakdown_records">[] = BD.map(([day, eq, time, symptom, min, cause, repair], i) => ({
    id: `bd-tr-${pad(i + 1)}`, equipment_id: eq, occurred_at: at(onWorkday(ctx.d(day)), time), symptom, downtime_min: min, cause, repair,
    repaired_by: min != null ? (i % 2 ? TP.plant : OPS[(i + 2) % 6]!) : null, linked_task_id: i === 9 ? "t-tr-036" : null, status: min != null ? "repaired" : "open",
  }));
  breakdown_records.push({ id: A.breakdownPress, equipment_id: "eq-pr-010-02", occurred_at: at(today, "08:45"), symptom: "작업 중 이상 소음", downtime_min: null, cause: null, repair: null, repaired_by: null, linked_task_id: "t-tr-028", status: "open" });

  const DEFECT_NOTES: [step: string, text: string][] = [
    [STEP.knit, "편조망 코 빠짐 발견, 1롤 따로 둠"], [STEP.knit, "편조 폭이 좁게 나옴, 확인 부탁"], [STEP.press, "성형품 모서리 찍힘 발견"], [STEP.press, "외경이 상한에 가까움, 3개 분리"],
    [STEP.press, "중량 미달 의심 5개 분리"], [STEP.crimp, "크림핑 주름 간격 고르지 않음"], [STEP.crimp, "크림핑 후 폭 줄어듦"], [STEP.spiral, "스파이럴 감김 풀림 2개"],
    [STEP.spiral, "감김 수가 하나 모자람"], [STEP.knit, "선재 표면 녹 의심"], [STEP.press, "성형품 표면 거스러미"], [STEP.oqc, "라벨 품번 오기 1박스"],
  ];
  const EQUIP_NOTES = ["바늘 소리가 평소와 달라요", "유압 게이지가 흔들려요", "롤 표면에 긁힘이 보여요", "절단면이 거칠어요", "센서 반응이 늦어요", "선재 공급이 자꾸 걸려요", "비상정지 버튼 덮개가 헐거워요"];
  const NEAR_MISS: [text: string, place: string][] = [
    ["지게차 후진 중 보행자와 가까이 지나감", "공용 통로"], ["선재 코일 받침이 기울어 넘어질 뻔함", "자재 창고"], ["프레스 양수 버튼 한쪽이 눌린 채 고정된 것을 발견", "가공동 프레스 구역"],
    ["편조기 덮개가 열린 채 가동 중이었음", "편조 라인 B"], ["바닥 윤활유에 미끄러질 뻔함", "가공동"], ["통로에 팔레트가 튀어나와 걸려 넘어질 뻔함", "출하장"],
    ["절단기 칼날 교체 중 손이 칼날 가까이 감", "가공동"], ["적재 선반 상단 박스가 떨어질 뻔함", "자재 창고"], ["분전반 문이 열려 있었음", "가공동"],
    ["롤링기 비상정지 끈이 느슨했음", "가공동"], ["편조 라인 통로에 선재 끝이 튀어나와 있었음", "편조 라인 A"], ["출하 박스 적재가 기울어 있었음", "출하장"],
    ["야간 조명이 어두워 계단에서 헛디딜 뻔함", "가공동 계단"], ["금형 운반 중 대차 바퀴가 걸림", "가공동 프레스 구역"],
  ];
  const OTHER_NOTES = ["휴게실 정수기 고장", "포장재(박스) 재고 부족", "라벨 프린터 용지 부족", "작업 공구 1개 분실", "탈의실 사물함 잠금 고장"];
  type FrDraft = Omit<R<"field_reports">, "id"> & { id?: string; place?: string };
  const frs: FrDraft[] = [];
  const knitIds = eqDefs.filter((e) => e.kind === "편조기").map((e) => e.id);
  const stepEq = (step: string) => step === STEP.knit ? rngF.pick(knitIds) : step === STEP.press ? rngF.pick(PRESSES.filter((p) => p !== "eq-pr-010-02")) : step === STEP.crimp ? rngF.pick(FORM_EQ.crimping) : step === STEP.spiral ? rngF.pick(FORM_EQ.spiralling) : null;
  const reporter = () => rngF.weighted([[OPS[0], 22], [OPS[1], 18], [OPS[2], 16], [OPS[3], 14], [OPS[4], 12], [OPS[5], 10], [TP.plant, 5], [TP.qa, 3]] as const) as string;
  const statusByAge = (age: number): R<"field_reports">["status"] => (age >= 10 ? "done" : age >= 4 ? (rngF.chance(0.7) ? "done" : "in_action") : rngF.chance(0.5) ? "in_action" : "assigned");
  const assigneeOf = (kind: string) => (kind === "defect" ? TP.qa : kind === "equipment" ? TP.plant : TP.admin);
  const randomPast = () => pastDays[rngF.int(0, pastDays.length - 1)]!;
  const timeOf = () => `${pad(rngF.pick([7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 19, 21, 22]), 2)}:${pad(rngF.int(0, 59), 2)}`;
  // 아차사고 14(7월 3 · 8월 5 · 9월 6)
  const NM_DAYS = [-88, -81, -67, -57, -49, -42, -37, -32, -27, -21, -14, -9, -5, -1];
  NM_DAYS.forEach((n, i) => {
    const date = onWorkday(ctx.d(n));
    const anon = [1, 4, 7, 10, 12].includes(i);
    const [text, place] = NEAR_MISS[i]!;
    frs.push({ kind: "near_miss", note: text, photo_name: rngF.chance(0.6) ? `현장사진_${mmdd(date)}_${pad(i + 1, 2)}.jpg` : null, process_step_id: null, equipment_id: null, reported_by: anon ? null : reporter(), anonymous: anon, reported_at: at(date, timeOf()), status: "new", assignee_id: null, linked_type: "near_miss_reports", linked_id: `nm-tr-${pad(i + 1)}`, place });
  });
  // 설비 이상 24(고장 기록 10건과 연결)
  BD.forEach(([day, eq, time, symptom], i) => {
    const date = onWorkday(ctx.d(day));
    const e = eqById.get(eq)!;
    const rt = minusMin(time, 12);
    frs.push({ kind: "equipment", note: `${e.no} ${symptom}`.slice(0, 60), photo_name: `현장사진_${mmdd(date)}_${pad(i + 1, 2)}.jpg`, process_step_id: e.kind === "편조기" ? STEP.knit : e.kind === "프레스" ? STEP.press : e.kind === "롤링기" ? STEP.crimp : e.kind === "전용기" ? STEP.spiral : null, equipment_id: eq, reported_by: reporter(), anonymous: false, reported_at: at(date, rt), status: "new", assignee_id: null, linked_type: "breakdown_records", linked_id: `bd-tr-${pad(i + 1)}` });
  });
  for (let i = 0; i < 14; i += 1) {
    const date = randomPast();
    const eq = rngF.pick(eqDefs.filter((e) => e.id !== "eq-kn-21"));
    frs.push({ kind: "equipment", note: `${eq.no} ${rngF.pick(EQUIP_NOTES)}`.slice(0, 60), photo_name: rngF.chance(0.7) ? `현장사진_${mmdd(date)}_${pad(20 + i, 2)}.jpg` : null, process_step_id: eq.kind === "편조기" ? STEP.knit : eq.kind === "프레스" ? STEP.press : null, equipment_id: eq.id, reported_by: reporter(), anonymous: false, reported_at: at(date, timeOf()), status: "new", assignee_id: null, linked_type: null, linked_id: null });
  }
  // 불량 38(그중 18건은 부적합으로 연결)
  for (let i = 0; i < 38; i += 1) {
    const date = i < 3 ? onWorkday(ctx.d(-1 - i)) : randomPast();
    const [step, text] = DEFECT_NOTES[i % DEFECT_NOTES.length]!;
    frs.push({ kind: "defect", note: text, photo_name: rngF.chance(0.85) ? `현장사진_${mmdd(date)}_${pad(40 + i, 2)}.jpg` : null, process_step_id: step, equipment_id: stepEq(step), reported_by: reporter(), anonymous: false, reported_at: at(date, timeOf()), status: "new", assignee_id: null, linked_type: null, linked_id: null });
  }
  for (let i = 0; i < 5; i += 1) {
    const date = randomPast();
    frs.push({ kind: "other", note: OTHER_NOTES[i]!, photo_name: null, process_step_id: null, equipment_id: null, reported_by: reporter(), anonymous: false, reported_at: at(date, timeOf()), status: "new", assignee_id: null, linked_type: null, linked_id: null });
  }
  frs.sort((a, b) => a.reported_at.localeCompare(b.reported_at));
  // 불량 중 18건 → 부적합(nc-tr-001~018), 등록 순
  let ncLinked = 0;
  const frNc: { frIndex: number; ncId: string }[] = [];
  frs.forEach((f, i) => {
    f.id = `fr-tr-${pad(i + 1, 4)}`;
    const age = daysBetween(toKstDate(f.reported_at), today);
    f.status = statusByAge(age);
    f.assignee_id = assigneeOf(f.kind);
    if (f.kind === "defect" && (i % 2 === 0 || age <= 3) && ncLinked < 18) {
      ncLinked += 1;
      const ncId = `nc-tr-${pad(ncLinked)}`;
      f.linked_type = "nonconformances";
      f.linked_id = ncId;
      frNc.push({ frIndex: i, ncId });
    }
    if (f.kind === "equipment" && f.linked_id === "bd-tr-010") f.status = "in_action";
  });
  // 오늘 4건(미배정 2): 야간 불량 · 주간 불량(작업자 A) · 기타 · 설비 이상 앵커
  const base = frs.length;
  const todayFr: FrDraft[] = [
    { id: `fr-tr-${pad(base + 1, 4)}`, kind: "defect", note: "야간 편조분 코 빠짐 2롤 따로 둠", photo_name: `현장사진_${mmdd(today)}_01.jpg`, process_step_id: STEP.knit, equipment_id: "eq-kn-12", reported_by: OPS[2], anonymous: false, reported_at: at(today, "05:40"), status: "assigned", assignee_id: TP.qa, linked_type: "nonconformances", linked_id: "nc-tr-019" },
    { id: `fr-tr-${pad(base + 2, 4)}`, kind: "defect", note: "크림핑 주름 간격 고르지 않음, 20개 분리", photo_name: `현장사진_${mmdd(today)}_02.jpg`, process_step_id: STEP.crimp, equipment_id: "eq-rl-02", reported_by: OPS[0], anonymous: false, reported_at: at(today, "08:05"), status: "new", assignee_id: null, linked_type: "nonconformances", linked_id: "nc-tr-020" },
    { id: `fr-tr-${pad(base + 3, 4)}`, kind: "other", note: "가공동 출입문 옆 조명 1개 꺼짐", photo_name: null, process_step_id: null, equipment_id: null, reported_by: OPS[3], anonymous: false, reported_at: at(today, "08:20"), status: "new", assignee_id: null, linked_type: null, linked_id: null },
    { id: A.fieldReport, kind: "equipment", note: "프레스 PR-010-02 작업 중 이상 소음", photo_name: `현장사진_${mmdd(today)}_03.jpg`, process_step_id: STEP.press, equipment_id: "eq-pr-010-02", reported_by: OPS[1], anonymous: false, reported_at: at(today, "08:40"), status: "assigned", assignee_id: TP.plant, linked_type: "breakdown_records", linked_id: A.breakdownPress },
  ];
  const field_reports: R<"field_reports">[] = [...frs, ...todayFr].map(({ place: _p, ...f }) => ({ ...(f as R<"field_reports">), created_by: f.anonymous ? null : f.reported_by }));
  const near_miss_reports: R<"near_miss_reports">[] = frs.filter((f) => f.kind === "near_miss").map((f, i) => {
    const age = daysBetween(toKstDate(f.reported_at), today);
    return {
      id: `nm-tr-${pad(i + 1)}`, reported_by: f.reported_by, anonymous: f.anonymous, occurred_at: new Date(Date.parse(f.reported_at) - 20 * 60_000).toISOString(), location: f.place ?? null,
      description: f.note, photo_refs: f.photo_name ? [f.photo_name] : [], status: age >= 14 ? "closed" : age >= 6 ? "action" : age >= 2 ? "reviewing" : "new", linked_task_id: null,
      created_by: f.anonymous ? null : f.reported_by,
    };
  });

  // ── 부적합: 현장 등록 18 + 오늘 2 + 클레임 3(검사 출처 15는 생산 모델에서)
  const ncDefect = (note: string) => (/코 빠짐/.test(note) ? "코 빠짐" : /주름/.test(note) ? "주름 불균일" : /감김/.test(note) ? "감김 풀림" : /중량/.test(note) ? "중량 미달" : /찍힘|거스러미/.test(note) ? "찍힘" : /녹/.test(note) ? "녹" : /라벨/.test(note) ? "라벨 오류" : "치수 불량");
  const ncEager: R<"nonconformances">[] = [];
  for (const { frIndex, ncId } of frNc) {
    const f = frs[frIndex]!;
    const age = daysBetween(toKstDate(f.reported_at), today);
    const status: R<"nonconformances">["status"] = age >= 7 ? "closed" : age >= 2 ? "dispositioned" : "open";
    const disp = status === "open" ? null : rngF.pick(["rework", "scrap", "sort", "rework"] as const);
    const qty = rngF.int(2, 40);
    ncEager.push({ id: ncId, source: "field_report", item_id: null, lot_no: null, qty, defect_type: ncDefect(f.note), found_on: toKstDate(f.reported_at), disposition: disp, status, linked_task_id: null, qty_disposed: status === "closed" ? qty : null });
  }
  ncEager.push(
    { id: "nc-tr-019", source: "field_report", item_id: kmId("KM-304-M-100"), lot_no: `K-KN12-${ymd6(ctx.d(-1))}-B`, qty: 2, defect_type: "코 빠짐", found_on: today, disposition: null, status: "open", linked_task_id: null, qty_disposed: null },
    { id: "nc-tr-020", source: "field_report", item_id: null, lot_no: null, qty: 20, defect_type: "주름 불균일", found_on: today, disposition: null, status: "open", linked_task_id: null, qty_disposed: null },
    { id: "nc-tr-021", source: "claim", item_id: fpId("FP-HS-321-001"), lot_no: customer_claims[0]!.lot_nos[0]!, qty: 300, defect_type: "치수 불량", found_on: c1, disposition: "sort", status: "closed", linked_task_id: null, qty_disposed: 300 },
    { id: "nc-tr-022", source: "claim", item_id: fpId("FP-MP-304-002"), lot_no: customer_claims[1]!.lot_nos[0]!, qty: 450, defect_type: "중량 미달", found_on: c2, disposition: "rework", status: "closed", linked_task_id: null, qty_disposed: 450 },
    { id: "nc-tr-023", source: "claim", item_id: fpId(A.item), lot_no: anchorShipLot, qty: 1200, defect_type: "치수 불량", found_on: c3, disposition: "sort", status: "dispositioned", linked_task_id: null, qty_disposed: null },
  );
  // 부적합 시정조치(간이) 1건: 최근 처분 결정된 현장 등록 부적합
  const ncForCa = ncEager.find((n) => n.status === "dispositioned" && n.source === "field_report") ?? ncEager[0]!;
  corrective_actions.push({ id: "ca-tr-nc-01", related_type: "nonconformance", related_id: ncForCa.id, method: "simple", root_cause: null, actions: "작업 표준서에 확인 항목 추가 예정", owner_id: TP.qa, due_on: ctx.d(8), status: "open", artifact_id: null, d_steps: [], containment: "해당 LOT 선별", verification: null, horizontal_deployment: null });

  // ── 생산 모델(작업지시·실적·검사·가동 기록·점검·LOT 연결)은 처음 읽을 때 만듦
  let prod: ReturnType<typeof buildProduction> | null = null;
  const P = () => (prod ??= buildProduction(ctx, { eqDefs, rLots, shipments, shipDraft, outgoingIns, material_receipts, receiptByLot }));

  // ── 재고 LOT(편조 롤·완제품) 12개는 생산 모델의 LOT 번호를 씁니다 → 지연 함수
  const stockAll = () => [...stock_lots, ...P().extraLots];
  const movesAll = () => [...stock_movements, ...P().extraMoves];

  // ── 안전보건
  const RISK: [area: string, process: string, hazard: string, before: "high" | "medium" | "low", measures: string, owner: string][] = [
    ["편조 라인 A", "편조", "회전 실린더에 장갑이 말려 들어감", "high", "회전부 덮개 연동 장치 설치, 회전부 장갑 착용 금지 표지", TP.plant],
    ["편조 라인 B", "편조", "선재 끝에 손 베임", "medium", "선재 끝 처리 공구 비치, 베임 방지 장갑 지급", TP.plant],
    ["편조 라인 C", "편조", "편조기 소음 장시간 노출", "medium", "귀마개 지급·착용 확인, 소음 측정 의뢰", TP.admin],
    ["가공동 프레스 구역", "프레스 성형", "금형 사이 손 끼임", "high", "양수 조작 버튼 점검, 광전자식 방호장치 작동 확인", TP.plant],
    ["가공동 프레스 구역", "프레스 성형", "금형 교체 중 금형 낙하", "high", "금형 운반 대차 사용, 2인 작업 원칙", TP.plant],
    ["가공동", "크림핑", "롤 사이 손가락 끼임", "high", "롤 입구 가드 높이 조정, 비상정지 끈 설치", TP.plant],
    ["가공동", "스파이럴링", "회전축에 옷 말림", "medium", "회전축 덮개 설치, 작업복 소매 규정", TP.plant],
    ["자재 창고", "자재 입고·운반", "선재 코일 운반 중 허리 부담", "medium", "코일 운반 대차 추가, 중량물 2인 운반", TP.admin],
    ["자재 창고", "자재 입고·운반", "적재 선반 상단 낙하", "medium", "상단 적재 높이 제한 표시", TP.admin],
    ["공용 통로", "운반", "지게차와 보행자 충돌", "high", "보행 통로 바닥 표시, 지게차 후방 경보", TP.admin],
    ["출하장", "출하·포장", "박스 적재 중 넘어짐", "low", "적재 높이 1.5m 제한", TP.sales],
    ["가공동", "공통", "바닥 윤활유로 미끄러짐", "medium", "흡착포 비치, 청소 주기 표 게시", TP.plant],
    ["가공동", "공통", "분전반 감전", "medium", "분전반 잠금, 정기 점검", TP.admin],
    ["가공동", "절단", "절단기 칼날 접촉", "high", "칼날 덮개 연동, 교체 절차서 마련", TP.plant],
    ["공용", "공통", "여름철 고온 작업", "low", "환기팬 추가, 휴식 시간 운영", TP.admin],
    ["편조 라인 A", "편조", "편조 금형 교체 중 손 끼임", "medium", "교체 전 전원 차단·잠금 표지", TP.plant],
  ];
  const risk_assessments: R<"risk_assessments">[] = [];
  let riskN = 0;
  const pushRisk = (r: (typeof RISK)[number], kind: "initial" | "regular" | "ad_hoc", assessed: string, due: string, status: "open" | "in_progress" | "done", n: number) => {
    riskN += 1;
    const [area, process, hazard, before, measures, owner] = r;
    risk_assessments.push({
      id: `risk-tr-${pad(riskN)}`, work_area: area, process, hazard, risk_level_before: before, control_measures: measures, owner_id: owner, due_on: due, status,
      risk_level_after: status === "done" ? (before === "high" ? "medium" : "low") : null, worker_participation_note: null,
      evidence_refs: status === "done" ? [`개선사진_risk-tr-${pad(riskN)}.jpg`] : [], assessed_on: assessed, kind,
      participants: 3 + (n % 5), participation_method: ["순회 점검", "설문", "면담"][n % 3]!, shared_before_on: addDays(assessed, -7),
      shared_after_on: status === "done" ? addDays(assessed, 12) : null, share_channel: ["교육", "게시", "설명회"][n % 3]!,
    });
  };
  // 정기(16): 기한 지남 3(7·8·13번째 요인). 수시 평가로 다시 평가한 요인(0·3·4·5·9·13번)은 정기 평가 때 이행을 마친 것으로 둬요
  // (최신 평가만 세는 규칙이라, 옛 정기 줄이 '기한 지남'으로 남으면 현황과 위험성평가 탭 숫자가 어긋나요)
  const overdue: Record<number, [number, "open" | "in_progress"]> = { 6: [-15, "in_progress"], 7: [-8, "open"], 12: [-4, "open"] };
  RISK.forEach((r, i) => {
    const od = overdue[i];
    pushRisk(r, "regular", ctx.d(-107), od ? ctx.d(od[0]) : ctx.d(-60 + i * 2), od ? od[1] : "done", i);
  });
  // 최초(10, 모두 이행 확인)
  RISK.slice(0, 10).forEach((r, i) => pushRisk(r, "initial", ctx.d(-300), ctx.d(-260 + i * 5), "done", i + 1));
  // 수시(6): 4M 변경·새 금형 뒤 다시 평가한 것. 대책은 바뀐 조건에 맞춘 새 대책(정기 평가 대책을 그대로 베끼지 않음), 진행 중
  const AD_HOC_MEASURES: Record<number, string> = {
    3: "새 금형(CR4M-2026-02) 높이에 맞춰 광전자식 방호장치 위치 다시 맞춤",
    4: "새 금형 무게에 맞는 운반 대차로 바꾸고 교체 순서표 게시",
    0: "실린더 교체 뒤 덮개 연동 장치 작동 다시 확인",
    5: "롤 간격 조정 뒤 입구 가드 높이 다시 맞춤",
    13: "칼날 교체 절차서에 2인 확인 칸 추가",
    9: "출하 동선 변경 뒤 보행 통로 바닥 표시 다시 칠함",
  };
  [3, 4, 0, 5, 13, 9].forEach((ri, i) => {
    const base = RISK[ri]!;
    pushRisk([base[0], base[1], base[2], base[3], AD_HOC_MEASURES[ri] ?? base[4], base[5]], "ad_hoc", ctx.d(-25 + i * 3), ctx.d(10 + i * 4), i < 4 ? "open" : "in_progress", i + 2);
  });

  const worker_opinions: R<"worker_opinions">[] = [
    { id: "wop-tr-01", channel: "web", submitted_at: at(onWorkday(ctx.d(-52)), "12:30"), anonymous: true, content: "개선 제안: 프레스 구역 귀마개 비치함을 입구 쪽으로 옮겨 주세요", response: "입구 옆으로 옮겼어요", status: "closed" },
    { id: "wop-tr-02", channel: "paper", submitted_at: at(onWorkday(ctx.d(-33)), "17:10"), anonymous: true, content: "야간조 휴게 공간 조명을 밝게 해 주세요", response: "다음 주에 조명을 바꿀 예정이에요", status: "answered" },
    { id: "wop-tr-03", channel: "meeting", submitted_at: at(onWorkday(ctx.d(-22)), "09:20"), anonymous: false, content: "편조 라인 B 통로 폭이 좁아요", response: "선재 대차 위치를 옮겨 통로를 넓혔어요", status: "answered" },
    { id: "wop-tr-04", channel: "web", submitted_at: at(onWorkday(ctx.d(-12)), "13:05"), anonymous: true, content: "개선 제안: 선재 코일 운반용 대차를 하나 더 두면 좋겠어요", response: "구매 검토 중이에요", status: "answered" },
    { id: "wop-tr-05", channel: "web", submitted_at: at(onWorkday(ctx.d(-4)), "18:40"), anonymous: true, content: "안전화 교체 주기를 알려 주세요", response: null, status: "new" },
    { id: "wop-tr-06", channel: "paper", submitted_at: at(onWorkday(ctx.d(-2)), "12:10"), anonymous: false, content: "개선 제안: 가공동 여름철 환기를 더 해 주세요", response: null, status: "new" },
  ];

  const SH: [code: string, basis: string, title: string][] = [
    ["SH-01", "제4조 1호", "안전·보건 목표와 경영방침 설정·게시"],
    ["SH-03", "제4조 3호", "유해·위험요인 확인·개선 절차 이행"],
    ["SH-04", "제4조 4호", "안전보건 예산 편성·집행"],
    ["SH-05", "제4조 5호", "안전보건관리책임자등의 업무 수행 평가"],
    ["SH-06", "제4조 6호", "안전보건관리담당자 등 법정 인력 배치(해당 시)"],
    ["SH-07", "제4조 7호", "종사자 의견 청취·개선 이행"],
    ["SH-08", "제4조 8호", "비상 대응 매뉴얼대로 조치하는지"],
    ["SH-09", "제4조 9호", "도급·용역·위탁 기준·절차 이행"],
    ["SH-L1", "제5조 ②항 1호", "안전·보건 관계 법령 의무 이행"],
    ["SH-L3", "제5조 ②항 3호", "유해·위험 작업 안전보건교육 실시"],
  ];
  const year = today.slice(0, 4);
  const h1Day = (n: number) => onWorkday(`${year}-04-${pad(2 + n, 2)}`);
  const semiannual_reviews: R<"semiannual_reviews">[] = [];
  SH.forEach(([code, basis, title], i) => {
    semiannual_reviews.push({
      id: `sr-tr-${year}h1-${pad(i + 1, 2)}`, half: `${year}-H1`, item: code, basis, title, checked_on: h1Day(i), checked_by: i % 2 ? TP.plant : TP.admin,
      findings: code === "SH-06" ? "상시근로자 수 기준 해당 여부 확인, 이번 반기 해당 없음(예시)" : "증빙 확인(예시)", actions: null,
      result: code === "SH-06" ? "not_applicable" : "ok", evidence_ref: `증빙_${code}_${year}H1(예시).pdf`,
    });
  });
  const H2_CHECKED: Record<string, { day: number; result: "ok" | "action_needed" | "not_applicable"; findings: string; actions?: string }> = {
    "SH-01": { day: -20, result: "ok", findings: "방침 게시 확인(예시)" },
    "SH-03": { day: -13, result: "action_needed", findings: "개선대책 3건이 기한을 넘겼어요(예시)", actions: "기한 지난 개선대책 3건 업무로 만들어 이행" },
    "SH-04": { day: -11, result: "ok", findings: "예산 집행 내역 확인(예시)" },
    "SH-05": { day: -8, result: "ok", findings: "평가표 확인(예시)" },
    "SH-06": { day: -8, result: "not_applicable", findings: "해당 여부 확인, 이번 반기 해당 없음(예시)" },
    "SH-07": { day: -6, result: "ok", findings: "의견 6건 접수·답변 확인(예시)" },
  };
  SH.forEach(([code, basis, title], i) => {
    const c = H2_CHECKED[code];
    semiannual_reviews.push({
      id: `sr-tr-${year}h2-${pad(i + 1, 2)}`, half: `${year}-H2`, item: code, basis, title, checked_on: c ? onWorkday(ctx.d(c.day)) : null, checked_by: c ? (i % 2 ? TP.plant : TP.admin) : null,
      findings: c?.findings ?? null, actions: c?.actions ?? null, result: c?.result ?? "pending", evidence_ref: c ? `증빙_${code}_${year}H2(예시).pdf` : null,
    });
  });
  const legal_calendar_items: R<"legal_calendar_items">[] = [
    { id: A.legalH2, kind: "semiannual_review", title: `${year} 하반기 반기 점검`, basis: "중대재해처벌법 시행령 제4조·제5조", due_on: ctx.d(14), owner_id: TP.admin, status: "upcoming" },
    { id: `lc-tr-${year}h1`, kind: "semiannual_review", title: `${year} 상반기 반기 점검`, basis: "중대재해처벌법 시행령 제4조·제5조", due_on: `${year}-04-14`, owner_id: TP.admin, status: "done" },
    { id: "lc-tr-press-docs", kind: "safety_inspection", title: "프레스 안전검사 신청 서류 준비(3대)", basis: "산업안전보건법 제93조 · 시행규칙 제126조", due_on: ctx.d(21), owner_id: TP.plant, status: "upcoming" },
    { id: "lc-tr-edu-sup", kind: "legal_training", title: "관리감독자 정기 안전보건교육", basis: "산업안전보건법 제29조", due_on: ctx.d(40), owner_id: TP.admin, status: "upcoming" },
    { id: "lc-tr-risk-regular", kind: "risk_regular", title: `${year} 위험성평가 정기평가 결과 공유`, basis: "산업안전보건법 제36조 · 시행규칙 제37조", due_on: ctx.d(45), owner_id: TP.plant, status: "upcoming" },
    { id: "lc-tr-edu-q3", kind: "legal_training", title: "3분기 근로자 정기 안전보건교육", basis: "산업안전보건법 제29조", due_on: ctx.d(-7), owner_id: TP.admin, status: "done" },
    { id: "lc-tr-workenv", kind: "work_env", title: "하반기 작업환경측정(해당 여부 확인 필요)", basis: "산업안전보건법 제125조", due_on: ctx.d(46), owner_id: TP.admin, status: "upcoming" },
    { id: "lc-tr-health", kind: "health_exam", title: "특수건강진단(소음, 해당 여부 확인 필요)", basis: "산업안전보건법 제130조", due_on: ctx.d(71), owner_id: TP.admin, status: "upcoming" },
  ];

  // ── 지표(K*)
  const m = [monthOffset(today, -2), monthOffset(today, -1), monthOffset(today, 0)];
  const cur = m[2]!;
  const KPI: [id: string, name: string, unit: string, target: number | null, targetLabel: string | null, source: string, owner: string, values: [string, number, string | null][]][] = [
    ["K01", "생산계획 달성률", "%", 95, "95% 이상", "작업지시·생산 실적", TP.plant, [[m[0]!, 91.8, null], [m[1]!, 93.0, null], [cur, 94.2, null]]],
    ["K02", "편조기 가동(오늘 주간조)", "대", 36, "36대 중", "설비 가동 기록", TP.plant, [[today, 31, "36대 중 31대"]]],
    ["K03", "공정 불량률", "%", 0.5, "0.5% 이하", "생산 실적", TP.qa, [[m[0]!, 0.71, null], [m[1]!, 0.66, null], [cur, 0.62, null]]],
    ["K04", "초중종물 실시율", "%", 100, "100%", "검사 기록", TP.qa, [[m[0]!, 82, null], [m[1]!, 85, null], [cur, 88, null]]],
    ["K05", "납기준수율", "%", 98, "98% 이상", "수주·출하", TP.sales, [[m[0]!, 95.1, null], [m[1]!, 96.0, null], [cur, 96.7, null]]],
    ["K06", "고객 PPM", "PPM", 10, "Single PPM 목표 10 미만", "클레임·고객 불량 수량", TP.qa, [[m[0]!, 24, null], [m[1]!, 21, null], [cur, 18, null]]],
    ["K07", "클레임 건수", "건", 0, null, "고객 클레임", TP.qa, [[m[0]!, 1, null], [m[1]!, 1, null], [cur, 1, null]]],
    ["K08", "8D 기한 준수", "건", null, null, "시정조치", TP.qa, [[cur, 2, "기한 안 제출 2건 / 대상 2건"]]],
    ["K10", "4M 고객 승인 대기", "건", 0, null, "4M 변경", TP.dev, [[cur, 1, "가장 오래된 건 9일째"]]],
    ["K11", "SUS321 재고일수", "일", 7, "안전재고 7일", "재고·입출고", TP.admin, [[cur, 4, null]]],
    ["K16", "개선대책 기한 지남", "건", 0, null, "위험성평가", TP.admin, [[cur, 3, null]]],
    ["K17", "아차사고·개선 제안 신고", "건", null, "많을수록 좋은 신호", "아차사고·의견", TP.admin, [[m[0]!, 3, null], [m[1]!, 5, null], [cur, 6, null]]],
    ["K_PROD_QTY", "가공 완제품 생산 수량", "개", null, null, "생산 실적", TP.plant, [[m[0]!, 182400, null], [m[1]!, 176900, null], [cur, 191300, null]]],
  ];
  const kpis: R<"kpis">[] = KPI.map(([id, name, unit, target, target_label, measure_source, owner_id]) => ({ id, name, unit, baseline: null, target, target_label, measure_source, owner_id, review_cycle: id === "K02" ? "근무조" : "월" }));
  const kpi_values: R<"kpi_values">[] = KPI.flatMap(([id, , , , , , , values]) => values.map(([period, value, note]) => ({
    id: `kv-${id}-${period}`, kpi_id: id, period, value, note, recorded_at: period.length === 7 ? at(period === cur ? ctx.d(-1) : `${period}-28`, "18:00") : at(today, "08:40"),
  })));

  // ── 거래처 담당자(15)
  const CONTACTS: [partner: string, dept: string, title: string][] = [
    ["p-tr-exh", "구매팀", "과장"], ["p-tr-exh", "품질팀", "대리"], ["p-tr-exh", "개발팀", "책임"], ["p-tr-saf", "구매팀", "대리"], ["p-tr-saf", "품질팀", "과장"],
    ["p-tr-pwt", "구매팀", "과장"], ["p-tr-thm", "구매팀", "대리"], ["p-tr-thm", "품질팀", "주임"], ["p-tr-flt", "자재팀", "과장"], ["p-tr-ele", "개발팀", "선임"],
    ["p-tr-wire", "영업팀", "차장"], ["p-tr-wire", "품질팀", "대리"], ["p-tr-nfe", "영업팀", "과장"], ["p-tr-pack", "영업팀", "대리"], ["p-tr-prec", "생산팀", "반장"],
  ];
  const partner_contacts = contactsOf("tr", CONTACTS, 301);

  const out: SeedOutput = {
    material_grades, items, process_steps, boms, equipment, legal_inspections, pm_plans, gauges,
    material_receipts, stock_lots: stockAll, stock_movements: movesAll, purchase_orders, safety_stocks, price_indexes,
    sales_orders, sales_order_lines, shipments,
    customer_claims, corrective_actions, change_requests_4m,
    breakdown_records, field_reports, near_miss_reports, nonconformances: () => [...ncEager, ...P().ncInspection],
    work_orders: () => P().workOrders, production_results: () => P().results, inspections: () => P().inspections,
    equipment_run_logs: () => P().runLogs, equipment_checks: () => P().checks, lot_links: () => P().lotLinks,
    risk_assessments, worker_opinions, semiannual_reviews, legal_calendar_items,
    kpis, kpi_values, partner_contacts,
  };
  return out;
}

// ───────────────────────────────────────────── 생산 모델(지연 생성)
interface ProdInput {
  eqDefs: EqDef[];
  rLots: { lot: string; item: string; date: string; key: string }[];
  shipments: R<"shipments">[];
  shipDraft: { id: string; order: string; line: string; date: string; qty: number; item: string; partner: string; status: R<"shipments">["status"] }[];
  outgoingIns: { id: string; lot: string; item: string; date: string }[];
  material_receipts: R<"material_receipts">[];
  receiptByLot: Map<string, string>;
}

function buildProduction(ctx: SeedContext, input: ProdInput) {
  const A = ctx.anchors.tr;
  const rng = ctx.rng("production");
  const today = ctx.today;
  const at = (date: string, time: string) => kstIso(date, time);
  const days = workdays(ctx.d(-91), ctx.d(3));
  const eqById = new Map(input.eqDefs.map((e) => [e.id, e]));
  const knitEq = input.eqDefs.filter((e) => e.kind === "편조기").map((e) => e.id);
  const workOrders: R<"work_orders">[] = [];
  const results: R<"production_results">[] = [];
  const inspections: R<"inspections">[] = [];
  const kLots: { lot: string; item: string; date: string; woId: string; qty: number }[] = [];
  const fLots: { lot: string; item: string; date: string; woId: string; qty: number; mats: string[]; eq: string; step: string }[] = [];
  let woN = 0, prN = 0, insN = 0;
  const knitWeights: [string, number][] = KMS.map((k) => [k.no, k.no === "KM-321-M-100" || k.no === "KM-304-M-100" ? 5 : k.partner ? 2 : 1.5]);
  const fpOrder = rng.shuffle(FPS.map((f) => f.no));
  let fpCursor = 0;
  const defectRate = (date: string) => (date.slice(0, 7) <= monthOffset(today, -2) ? 0.0071 : date.slice(0, 7) === monthOffset(today, -1) ? 0.0066 : 0.0062);
  const skipRate = (date: string) => (date.slice(0, 7) === today.slice(0, 7) ? 0.12 : date.slice(0, 7) === monthOffset(today, -1) ? 0.15 : 0.18);
  const rLotFor = (rmKey: string, date: string) => {
    const list = input.rLots.filter((r) => r.key === rmKey && r.date <= date).sort((a, b) => b.date.localeCompare(a.date));
    return list[0]?.lot ?? null;
  };
  const statusFor = (date: string, shift: "day" | "night", idx: number): R<"work_orders">["status"] => {
    if (date < today) return "done";
    if (date === today) return shift === "day" ? (idx < 2 ? "in_progress" : "released") : "released";
    return date === ctx.d(1) ? "released" : "planned";
  };
  const addInspection = (kind: R<"inspections">["kind"], item: string, lot: string | null, date: string, woId: string | null, inspector: string, failChance = 0.004) => {
    insN += 1;
    const r = rng.next();
    inspections.push({
      id: `ins-tr-${pad(insN, 5)}`, kind, item_id: item, lot_no: lot, inspected_on: date, inspector_id: inspector, result: r < failChance ? "fail" : r < failChance * 2 ? "hold" : "pass",
      measurements_ref: null, sample_size: kind === "periodic" ? 10 : 5, photo_names: [], work_order_id: woId,
    });
  };
  const anchorKnitDay = ctx.d(-16);
  const anchorFormDay = ctx.d(-15);
  const busyToday = new Set(["eq-kn-03", "eq-kn-09", "eq-kn-15", "eq-kn-21", "eq-kn-28", "eq-pr-010-02"]);

  for (const date of days) {
    const isPast = date < today;
    // 편조 3건(주간 2 · 야간 1)
    const usedKnit = new Set<string>();
    for (let k = 0; k < 3; k += 1) {
      const shift: "day" | "night" = k === 2 ? "night" : "day";
      let kmNo = rng.weighted(knitWeights);
      let eq = rng.pick(knitEq.filter((e) => !usedKnit.has(e) && !(date >= ctx.d(-9) && e === "eq-kn-21") && !(date >= today && busyToday.has(e))));
      if (date === anchorKnitDay && k !== 1) { kmNo = "KM-321-M-100"; eq = "eq-kn-07"; }
      usedKnit.add(eq);
      const km = KMS.find((x) => x.no === kmNo)!;
      const e = eqById.get(eq)!;
      const finalLot = date === anchorKnitDay && k === 0 ? A.lotChain[1] : `K-${e.lot}-${ymd6(date)}-${shift === "day" ? "A" : "B"}`;
      woN += 1;
      const woId = `wo-tr-${pad(woN, 4)}`;
      const planned = round(rng.int(300, 600), 10);
      const rLot = date === anchorKnitDay ? A.lotChain[0] : rLotFor(km.rm, date);
      const status = statusFor(date, shift, k);
      workOrders.push({ id: woId, order_line_id: null, item_id: kmId(km.no), process_step_id: STEP.knit, planned_qty: planned, planned_date: date, equipment_id: eq, status, material_lot_ids: rLot ? [rLot] : [], std_ref: `편조 조건표 ${e.no} v3(예시)`, shift, lot_no: finalLot });
      kLots.push({ lot: finalLot, item: kmId(km.no), date, woId, qty: planned });
      if (isPast) {
        const batches = 3;
        const good = round(planned * (0.97 + rng.next() * 0.05), 1);
        for (let b = 0; b < batches; b += 1) {
          prN += 1;
          const g = b < batches - 1 ? round(good / batches, 1) : good - round(good / batches, 1) * (batches - 1);
          const startH = shift === "day" ? 8 + b * 4 : 20 + b * 4;
          const sDate = startH >= 24 ? addDays(date, 1) : date;
          results.push({
            id: `prr-tr-${pad(prN, 5)}`, work_order_id: woId, date, process_step_id: STEP.knit, equipment_id: eq, item_id: kmId(km.no), good_qty: g, defect_qty: rng.chance(0.2) ? rng.int(1, 4) : 0, lot_no: finalLot,
            worker_ids: [OPS[rng.int(0, 5)]!], note: null, shift, start_at: at(sDate, `${pad(startH % 24, 2)}:00`), end_at: at(startH + 4 >= 24 && startH < 24 ? addDays(date, 1) : sDate, `${pad((startH + 4) % 24, 2)}:00`),
            downtime_min: rng.chance(0.25) ? rng.int(5, 40) : 0, defect_breakdown: null,
          });
        }
        if (!rng.chance(skipRate(date))) addInspection("first", kmId(km.no), finalLot, date, woId, OPS[rng.int(0, 5)]!);
        if (!rng.chance(skipRate(date))) addInspection("last", kmId(km.no), finalLot, date, woId, OPS[rng.int(0, 5)]!);
      } else if (date === today && status === "in_progress") {
        prN += 1;
        results.push({ id: `prr-tr-${pad(prN, 5)}`, work_order_id: woId, date, process_step_id: STEP.knit, equipment_id: eq, item_id: kmId(km.no), good_qty: round(planned * 0.18, 1), defect_qty: 0, lot_no: finalLot, worker_ids: [OPS[0]], note: "주간조 1차", shift, start_at: at(date, "08:00"), end_at: at(date, "09:20"), downtime_min: 0, defect_breakdown: null });
        addInspection("first", kmId(km.no), finalLot, date, woId, OPS[0]);
      }
    }
    // 가공 5건
    for (let k = 0; k < 5; k += 1) {
      let fpNo = fpOrder[fpCursor % fpOrder.length]!;
      fpCursor += 1;
      const forced = date === anchorFormDay && (k === 2 || k === 3);
      if (forced) { fpNo = A.item; fpCursor -= 1; }
      else if (fpNo === A.item && (date === anchorFormDay || date === anchorKnitDay || date === ctx.d(-14))) { fpNo = fpOrder[fpCursor % fpOrder.length]!; fpCursor += 1; }
      const fp = FPS.find((f) => f.no === fpNo)!;
      const step = FORM_STEP[fp.form];
      const shift: "day" | "night" = k >= 4 ? "night" : "day";
      let eqId = rng.pick(FORM_EQ[fp.form].filter((e) => !(date >= today && busyToday.has(e))));
      if (forced) eqId = "eq-pr-020-01";
      const e = eqById.get(eqId)!;
      const lot = date === anchorFormDay && k === 2 ? A.lotChain[2] : `F-${e.lot}-${ymd6(date)}-${pad(k + 1)}`;
      const kmNo = KM_FOR_GRADE[fpGrade(fp.no)]!;
      const mats = date === anchorFormDay && k === 2
        ? [A.lotChain[1], `K-KN07-${ymd6(anchorKnitDay)}-B`]
        : kLots.filter((x) => x.item === kmId(kmNo) && x.date < date).slice(-1).map((x) => x.lot);
      woN += 1;
      const woId = `wo-tr-${pad(woN, 4)}`;
      const planned = round(rng.int(800, 2400), 100);
      const status = statusFor(date, shift, k);
      workOrders.push({ id: woId, order_line_id: null, item_id: fpId(fp.no), process_step_id: step, planned_qty: planned, planned_date: date, equipment_id: eqId, status, material_lot_ids: mats, std_ref: `작업표준 ${fp.no.split("-").slice(0, 2).join("-")}(예시)`, shift, lot_no: lot });
      fLots.push({ lot, item: fpId(fp.no), date, woId, qty: planned, mats, eq: eqId, step });
      if (isPast) {
        const good = round(planned * (0.98 + rng.next() * 0.04), 1);
        const defect = Math.max(0, Math.round(planned * defectRate(date) * (0.4 + rng.next() * 1.2)));
        for (let b = 0; b < 3; b += 1) {
          prN += 1;
          const g = b < 2 ? round(good / 3, 1) : good - round(good / 3, 1) * 2;
          const dq = b < 2 ? Math.floor(defect / 3) : defect - Math.floor(defect / 3) * 2;
          const startH = shift === "day" ? 8 + b * 4 : 20 + b * 4;
          const sDate = startH >= 24 ? addDays(date, 1) : date;
          const dim = Math.round(dq * 0.6);
          results.push({
            id: `prr-tr-${pad(prN, 5)}`, work_order_id: woId, date, process_step_id: step, equipment_id: eqId, item_id: fpId(fp.no), good_qty: g, defect_qty: dq, lot_no: lot,
            worker_ids: [OPS[rng.int(0, 5)]!], note: null, shift, start_at: at(sDate, `${pad(startH % 24, 2)}:00`), end_at: at(startH + 4 >= 24 && startH < 24 ? addDays(date, 1) : sDate, `${pad((startH + 4) % 24, 2)}:00`),
            downtime_min: rng.chance(0.3) ? rng.int(5, 30) : 0, defect_breakdown: dq ? { 치수: dim, 찍힘: dq - dim } : null,
          });
        }
        const skip = skipRate(date);
        if (!rng.chance(skip)) addInspection("first", fpId(fp.no), lot, date, woId, TP.qa);
        if (!rng.chance(skip)) addInspection("mid", fpId(fp.no), lot, date, woId, OPS[rng.int(0, 5)]!);
        if (!rng.chance(skip)) addInspection("last", fpId(fp.no), lot, date, woId, OPS[rng.int(0, 5)]!);
      } else if (date === today && status === "in_progress") {
        prN += 1;
        results.push({ id: `prr-tr-${pad(prN, 5)}`, work_order_id: woId, date, process_step_id: step, equipment_id: eqId, item_id: fpId(fp.no), good_qty: round(planned * 0.2, 1), defect_qty: k === 0 ? 2 : 0, lot_no: lot, worker_ids: [OPS[1]], note: "주간조 1차", shift, start_at: at(date, "08:00"), end_at: at(date, "09:20"), downtime_min: 0, defect_breakdown: k === 0 ? { 치수: 2 } : null });
        if (k === 0) addInspection("first", fpId(fp.no), lot, date, woId, TP.qa);
      }
    }
    // 정기 제품 검사 2건
    if (isPast) {
      for (const f of fLots.slice(-2)) addInspection("periodic", f.item, f.lot, date, null, TP.qa, 0.01);
    }
  }
  // 수입검사(입고마다) · 출하검사(출하마다)
  input.material_receipts.forEach((r) => {
    if (!r.inspection_id) return;
    inspections.push({ id: r.inspection_id, kind: "incoming", item_id: r.item_id, lot_no: [...input.receiptByLot.entries()].find(([, id]) => id === r.id)?.[0] ?? null, inspected_on: r.received_on, inspector_id: TP.qa, result: "pass", measurements_ref: r.cert_ref, sample_size: 3, photo_names: [], work_order_id: null });
  });
  for (const o of input.outgoingIns) inspections.push({ id: o.id, kind: "outgoing", item_id: o.item, lot_no: o.lot, inspected_on: o.date, inspector_id: TP.qa, result: "pass", measurements_ref: null, sample_size: 13, photo_names: [], work_order_id: null });

  // 검사 출처 부적합 15(불합격·보류 검사에서)
  const bad = inspections.filter((i) => i.result !== "pass" && i.inspected_on < today).sort((a, b) => b.inspected_on.localeCompare(a.inspected_on));
  const ncInspection: R<"nonconformances">[] = [];
  const DT = ["치수 불량", "찍힘", "중량 미달", "주름 불균일", "코 빠짐"];
  for (let i = 0; i < 15; i += 1) {
    const src = bad[i];
    const found = src?.inspected_on ?? onWorkday(ctx.d(-3 - i * 5));
    const age = daysBetween(found, today);
    const status: R<"nonconformances">["status"] = age <= 2 ? "open" : age <= 6 ? "dispositioned" : "closed";
    const disp = status === "open" ? null : (["rework", "scrap", "sort", "concession"] as const)[i % 4]!;
    const qty = rng.int(5, 120);
    ncInspection.push({ id: `nc-tr-${pad(24 + i)}`, source: "inspection", item_id: src?.item_id ?? fpId(FPS[i]!.no), lot_no: src?.lot_no ?? null, qty, defect_type: DT[i % DT.length]!, found_on: found, disposition: disp, status, linked_task_id: null, qty_disposed: status === "closed" ? qty : null });
  }

  // 설비 가동 기록: 52대 × 2조 × 근무일(오늘은 주간조만)
  const runLogs: R<"equipment_run_logs">[] = [];
  const REASON = { stopped: ["자재 대기", "작업지시 없음", "금형 교체", "작업자 배치 조정", "품질 확인 대기"], setup: ["선재 교체", "편조 금형 교체 준비", "조건표 확인"], breakdown: ["바늘 파손", "구동 벨트 이상", "이상 소음"] };
  const bdStart = new Map([["eq-kn-21", ctx.d(-9)]]);
  for (const date of workdays(ctx.d(-91), today)) {
    for (const shift of ["day", "night"] as const) {
      if (date === today && shift === "night") continue;
      input.eqDefs.forEach((e, i) => {
        const id = `erl-tr-${ymd6(date)}${shift[0]}-${e.no.toLowerCase()}`;
        const recBy = OPS[(i + (shift === "day" ? 0 : 3)) % 6]!;
        const time = shift === "day" ? `08:${pad(5 + (i % 40), 2)}` : `20:${pad(5 + (i % 40), 2)}`;
        let status: R<"equipment_run_logs">["status"];
        let reason: string | null = null;
        if (date === today) {
          const t = TODAY_KNIT[e.id];
          if (t) { status = t.status; reason = t.reason; }
          else status = "running";
          if (e.id === "eq-pr-010-02") {
            runLogs.push({ id: `${id}-1`, equipment_id: e.id, date, shift, status: "running", reason: null, recorded_by: OPS[1], recorded_at: at(date, "08:10") });
            runLogs.push({ id, equipment_id: e.id, date, shift, status: "breakdown", reason: "작업 중 이상 소음(현장 등록)", recorded_by: OPS[1], recorded_at: at(date, "08:45") });
            return;
          }
          runLogs.push({ id, equipment_id: e.id, date, shift, status, reason, recorded_by: recBy, recorded_at: at(date, t?.time ?? time) });
          return;
        }
        const bd = bdStart.get(e.id);
        if (bd && date >= bd && !(date === bd && shift === "day")) { status = "breakdown"; reason = "편조 실린더 마모(부품 대기)"; }
        else {
          status = rng.weighted([["running", 88], ["stopped", 7], ["setup", 4], ["breakdown", 1]] as const);
          if (status !== "running") reason = rng.pick(REASON[status]);
        }
        runLogs.push({ id, equipment_id: e.id, date, shift, status, reason, recorded_by: recBy, recorded_at: at(date, time) });
      });
    }
  }

  // 일상 점검: 지난주까지는 편조기 밖 16대, 이번 주는 52대(오늘 미점검 10대 제외)
  const checks: R<"equipment_checks">[] = [];
  let ecN = 0;
  const weekStartDate = (() => { const d = dow(today); return addDays(today, d === 0 ? -6 : 1 - d); })();
  for (const date of workdays(ctx.d(-91), today)) {
    input.eqDefs.forEach((e, i) => {
      if (e.kind === "편조기" && date < weekStartDate) return;
      if (date === today && TODAY_UNCHECKED.has(e.id)) return;
      if (date < today && e.id === "eq-kn-21" && date >= ctx.d(-9)) return;
      ecN += 1;
      const issue = rng.chance(0.02);
      const isPress = e.kind === "프레스";
      checks.push({
        id: `ec-tr-${pad(ecN, 5)}`, equipment_id: e.id, kind: "daily", checked_on: date, checked_by: isPress ? TP.plant : OPS[i % 6]!, result: issue ? "issue" : "ok",
        findings: issue ? rng.pick(["윤활 부족, 보충했어요", "덮개 볼트 풀림, 조였어요", "비상정지 버튼 동작 늦음"]) : null,
        items_result: isPress ? { 외관: true, 윤활: !issue, "양수 버튼": true, 방호장치: true } : { 외관: true, 윤활: !issue, 비상정지: true },
      });
    });
  }

  // LOT 연결: 최근 6주 출하 → 가공 LOT → 편조 LOT → 원자재 LOT
  const lotLinks: R<"lot_links">[] = [];
  const seen = new Set<string>();
  let llN = 0;
  const link = (parent: string, child: string, qty: number, step: string | null, date: string) => {
    const key = `${parent}>${child}`;
    if (seen.has(key)) return;
    seen.add(key);
    llN += 1;
    lotLinks.push({ id: `ll-tr-${pad(llN, 4)}`, parent_lot: parent, child_lot: child, qty, process_step_id: step, linked_at: at(date, "17:30") });
  };
  const usedF = new Map<string, (typeof fLots)[number]>();
  const usedK = new Map<string, (typeof kLots)[number]>();
  const from = ctx.d(-40);
  for (const s of input.shipments) {
    if (s.status === "planned" || s.ship_date < from) continue;
    const d = input.shipDraft.find((x) => x.id === s.id)!;
    const sLot = s.lot_ids[0]!;
    if (sLot === A.lotChain[3]) {
      const f = fLots.find((x) => x.lot === A.lotChain[2])!;
      link(f.lot, sLot, s.qty, STEP.oqc, s.ship_date);
      usedF.set(f.lot, f);
      continue;
    }
    const it = d.item;
    if (it.startsWith("it-km-")) {
      const k = kLots.filter((x) => x.item === it && x.date < s.ship_date).slice(-1)[0];
      if (k) { link(k.lot, sLot, s.qty, STEP.oqc, s.ship_date); usedK.set(k.lot, k); }
      continue;
    }
    const f = fLots.filter((x) => x.item === it && x.date < s.ship_date && !(x.date === anchorFormDay && x.lot.endsWith("-004") && x.item === fpId(A.item))).slice(-1)[0];
    if (f) { link(f.lot, sLot, s.qty, STEP.oqc, s.ship_date); usedF.set(f.lot, f); }
  }
  for (const f of usedF.values()) {
    for (const m of f.mats) {
      const k = kLots.find((x) => x.lot === m);
      link(m, f.lot, round(f.qty * 0.35, 1), f.step, f.date);
      if (k) usedK.set(k.lot, k);
    }
  }
  for (const k of usedK.values()) {
    const wo = workOrders.find((w) => w.id === k.woId);
    for (const r of wo?.material_lot_ids ?? []) link(r, k.lot, round(k.qty * 0.05, 0.5), STEP.knit, k.date);
  }
  // 앵커 체인 보장
  link(A.lotChain[0], A.lotChain[1], 21.5, STEP.knit, anchorKnitDay);
  link(A.lotChain[1], A.lotChain[2], 160, STEP.press, anchorFormDay);

  // 재고 LOT(편조 롤 8 · 완제품 4) + 입고 움직임
  const extraLots: R<"stock_lots">[] = [];
  const extraMoves: R<"stock_movements">[] = [];
  const recentK = kLots.filter((k) => k.date < today && k.date >= ctx.d(-6)).slice(-8);
  recentK.forEach((k, i) => {
    extraLots.push({ id: `sl-tr-k-${pad(i + 1, 2)}`, item_id: k.item, lot_no: k.lot, qty_on_hand: round(k.qty * (0.3 + (i % 4) * 0.15), 1), location: "편조 롤 보관대(예시)", status: "available" });
    extraMoves.push({ id: `mv-tr-k-${pad(i + 1, 2)}`, lot_id: `sl-tr-k-${pad(i + 1, 2)}`, kind: "in", qty: k.qty, moved_at: at(k.date, "19:30"), ref_type: "work_orders", ref_id: k.woId });
  });
  const hold = fLots.find((f) => f.date === anchorFormDay && f.lot.endsWith("-004") && f.item === fpId(A.item));
  const recentF = fLots.filter((f) => f.date < today && f.date >= ctx.d(-3) && f !== hold).slice(-3);
  [...recentF, ...(hold ? [hold] : [])].forEach((f, i) => {
    const isHold = f === hold;
    // 격리 LOT 수량은 8D D3(의심 LOT 1,700개 격리)와 같은 수
    extraLots.push({ id: `sl-tr-f-${pad(i + 1, 2)}`, item_id: f.item, lot_no: f.lot, qty_on_hand: isHold ? 1700 : round(f.qty * 0.6, 10), location: isHold ? "격리 구역 B-2(예시)" : "완제품 창고(예시)", status: isHold ? "hold" : "available" });
    extraMoves.push({ id: `mv-tr-f-${pad(i + 1, 2)}`, lot_id: `sl-tr-f-${pad(i + 1, 2)}`, kind: "in", qty: f.qty, moved_at: at(f.date, "19:40"), ref_type: "work_orders", ref_id: f.woId });
  });

  return { workOrders, results, inspections, runLogs, checks, lotLinks, ncInspection, extraLots, extraMoves };
}

// ───────────────────────────────────────────── 거래처 담당자(두 테넌트 공통 모양)
function contactsOf(key: "tr" | "cr", list: [partner: string, dept: string, title: string][], phoneBase: number): R<"partner_contacts">[] {
  const seenPartner = new Set<string>();
  return list.map(([partner, dept, title], i) => {
    const primary = !seenPartner.has(partner);
    seenPartner.add(partner);
    const letter = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[i]!;
    return {
      id: `pc-${key}-${pad(i + 1)}`, partner_id: partner, name: `담당자 ${letter}(예시)`, dept, title,
      email: `${partner.replace(/^p-(tr|cr)-/, "")}.${letter.toLowerCase()}@example.com`, phone: `000-0000-0${phoneBase + i}`, is_primary: primary,
    };
  });
}

// ───────────────────────────────────────────── CRATA 시드(CRM 라이트: 담당자·영업 기회·견적)
function seedCr(ctx: SeedContext): SeedOutput {
  const A = ctx.anchors.crata;
  const CEO = "m-cr-ceo", EL = "m-cr-edu-lead", E1 = "m-cr-edu-1", SL = "m-cr-ssi-lead";
  const partner_contacts = contactsOf("cr", [
    ["p-cr-corp", "인사팀", "교육 담당"], ["p-cr-corp", "경영지원팀", "팀장"], ["p-cr-school", "교무부", "부장"], ["p-cr-edu-office", "교육지원과", "주무관"],
    ["p-cr-edu-office", "교육지원과", "담당"], ["p-cr-found", "사업팀", "매니저"], ["p-cr-found", "사업팀", "팀장"], ["p-cr-design", "디자인팀", "실장"],
  ], 401);
  const OPP: [id: string, title: string, partner: string, stage: R<"opportunities">["stage"], owner: string, expected: number, amount: number][] = [
    [A.opportunity, "예시재단 AI 리터러시 워크숍", "p-cr-found", "proposal", EL, 20, 6_000_000],
    ["opp-cr-02", "예시기업 팀장 대상 AI 업무 활용 과정", "p-cr-corp", "negotiation", CEO, 14, 12_000_000],
    ["opp-cr-03", "예시고 2학기 교사 연수 추가 차수", "p-cr-school", "proposal", E1, 30, 3_500_000],
    ["opp-cr-04", "예시교육지원청 관리자 연수 2차", "p-cr-edu-office", "needs", SL, 45, 8_000_000],
    ["opp-cr-05", "예시기업 신입사원 AI 기초 특강", "p-cr-corp", "needs", E1, 40, 2_500_000],
    ["opp-cr-06", "예시재단 청년 대상 AI 진로 특강", "p-cr-found", "inquiry", EL, 60, 4_000_000],
    ["opp-cr-07", "예시기업 계열사 AI 워크숍 문의", "p-cr-corp", "inquiry", CEO, 75, 3_000_000],
    ["opp-cr-08", "예시교육지원청 업무 담당자 연수 문의", "p-cr-edu-office", "inquiry", SL, 90, 3_000_000],
    ["opp-cr-09", "예시기업 임원 생성형 AI 특강", "p-cr-corp", "won", EL, -25, 5_500_000],
    ["opp-cr-10", "예시고 교사 AI 활용 연수", "p-cr-school", "won", E1, -18, 4_800_000],
    ["opp-cr-11", "예시재단 하반기 강사 파견", "p-cr-found", "lost", EL, -20, 2_000_000],
  ];
  const opportunities: R<"opportunities">[] = OPP.map(([id, title, partner_id, stage, owner_id, expected, amount_krw], i) => ({
    id, title, partner_id, stage, owner_id, expected_on: ctx.d(expected), amount_krw, created_by: owner_id,
    created_at: ctx.at(Math.min(-3, expected - 40 - i), "10:00"), updated_at: ctx.at(stage === "won" || stage === "lost" ? expected : -1 - (i % 6), "16:00"),
  }));
  const Q: [id: string, opp: string, partner: string, no: string, status: R<"quotes">["status"], amount: number, discount: number, issued: number | null, valid: number | null, artifact: string | null][] = [
    [A.quote, A.opportunity, "p-cr-found", "Q-2026-031", "sent", 6_000_000, 0, -6, 24, "art-cr-quote-01"],
    ["q-cr-02", "opp-cr-02", "p-cr-corp", "Q-2026-028", "sent", 12_600_000, 5, -15, 15, "art-cr-quote-02"],
    ["q-cr-03", "opp-cr-02", "p-cr-corp", "Q-2026-033", "draft", 12_000_000, 10, null, null, null],
    ["q-cr-04", "opp-cr-03", "p-cr-school", "Q-2026-034", "draft", 3_500_000, 0, null, null, null],
    ["q-cr-05", "opp-cr-09", "p-cr-corp", "Q-2026-021", "accepted", 5_500_000, 0, -40, -10, "art-cr-quote-03"],
    ["q-cr-06", "opp-cr-10", "p-cr-school", "Q-2026-024", "accepted", 4_800_000, 4, -35, -5, null],
    ["q-cr-07", "opp-cr-11", "p-cr-found", "Q-2026-019", "rejected", 2_000_000, 0, -48, -18, null],
  ];
  const quotes: R<"quotes">[] = Q.map(([id, opportunity_id, partner_id, quote_no, status, amount_krw, discount_rate, issued, valid, artifact_id]) => ({
    id, opportunity_id, partner_id, quote_no, status, amount_krw, discount_rate, issued_on: issued == null ? null : ctx.d(issued), valid_until: valid == null ? null : ctx.d(valid), artifact_id,
    created_by: EL, created_at: ctx.at(issued ?? -2, "11:00"),
  }));
  return { partner_contacts, opportunities, quotes };
}

function seed(ctx: SeedContext): SeedOutput {
  if (ctx.tenant.packs.includes("manufacturing")) return seedTr(ctx);
  return seedCr(ctx);
}

// ───────────────────────────────────────────── 이름 있는 동작(rpc)
const personOf = (ctx: SelectorContext, roleCode: string) => ctx.tenant.people.find((p) => p.roleCode === roleCode)?.id ?? null;
const text = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);
/** 현재 근무조(08~20시 주간, 나머지 야간. 자정~08시는 전날 야간조) */
export function shiftAt(nowIso: string): { date: string; shift: "day" | "night" } {
  const kst = new Date(Date.parse(nowIso) + 9 * 3_600_000);
  const h = kst.getUTCHours();
  const date = kst.toISOString().slice(0, 10);
  if (h >= 8 && h < 20) return { date, shift: "day" };
  return { date: h < 8 ? addDays(date, -1) : date, shift: "night" };
}
const STEP_ORDER = ["D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"] as const;
const COLUMN_FIRST: Record<string, (typeof STEP_ORDER)[number]> = { d01: "D0", d23: "D2", d45: "D4", d6: "D6", d78: "D7" };
const claimStatusFor = (step: string | null): R<"customer_claims">["status"] =>
  step == null ? "closed" : step <= "D1" ? "received" : step <= "D3" ? "containment" : step <= "D5" ? "investigating" : "countermeasure";

function hideCreator(ctx: ActionContext, resource: ResourceName, id: string) {
  // 이름 없이 보낸 행은 만든 사람도 남기지 않음
  ctx.update(resource, id, { created_by: null } as never);
}

const rpc: Record<string, RpcHandler> = {
  /** 현장 등록(I-07): field_reports + 종류별 연결 행 + 공장장(불량이면 품질보증 담당도) 알림 */
  create_field_report: (ctx, p: { kind?: string; note?: string; photoName?: string | null; processStepId?: string | null; equipmentId?: string | null; anonymous?: boolean }) => {
    if (!ctx.isModuleOn("mfg-quality")) ctx.fail(403, "이 회사에서 쓰지 않는 기능이에요");
    const kind = p.kind as R<"field_reports">["kind"];
    if (!["defect", "equipment", "near_miss", "other"].includes(kind)) ctx.fail(400, "무엇인지 먼저 골라 주세요");
    const note = text(p.note, 60);
    if (note.length < 2) ctx.fail(400, "한 줄 설명을 적어 주세요");
    const anonymous = kind === "near_miss" && !!p.anonymous;
    const me = ctx.persona.memberId;
    const now = ctx.clock.now();
    const eq = p.equipmentId ? ctx.raw.get("equipment", p.equipmentId) : null;
    const step = p.processStepId ? ctx.raw.get("process_steps", p.processStepId) : null;
    const report = ctx.insert("field_reports", {
      kind, note, photo_name: p.photoName ? text(p.photoName, 120) : null, process_step_id: step?.id ?? null, equipment_id: eq?.id ?? null,
      reported_by: anonymous ? null : me, anonymous, reported_at: now, status: "new", assignee_id: null, linked_type: null, linked_id: null,
    });
    if (anonymous) hideCreator(ctx, "field_reports", report.id);
    let linked: { type: string; id: string } | null = null;
    if (kind === "defect") {
      const { date } = shiftAt(now);
      const wo = ctx.raw.list("work_orders", { filters: [{ field: "planned_date", operator: "eq", value: date }] })
        .find((w) => (eq && w.equipment_id === eq.id) || (!eq && step && w.process_step_id === step.id));
      const nc = ctx.insert("nonconformances", { source: "field_report", item_id: (wo?.item_id ?? null) as unknown as string, lot_no: wo?.lot_no ?? null, qty: 0, defect_type: "현장 확인 필요", found_on: ctx.today, disposition: null, status: "open", linked_task_id: null, qty_disposed: null });
      linked = { type: "nonconformances", id: nc.id };
    } else if (kind === "equipment" && eq) {
      const bd = ctx.insert("breakdown_records", { equipment_id: eq.id, occurred_at: now, symptom: note, downtime_min: null, cause: null, repair: null, repaired_by: null, linked_task_id: null, status: "open" });
      linked = { type: "breakdown_records", id: bd.id };
    } else if (kind === "near_miss") {
      const nm = ctx.insert("near_miss_reports", {
        reported_by: anonymous ? null : me, anonymous, occurred_at: now, location: eq ? `${eq.equipment_no} 주변` : step?.name ?? null, description: note,
        photo_refs: p.photoName ? [text(p.photoName, 120)] : [], status: "new", linked_task_id: null,
      });
      if (anonymous) hideCreator(ctx, "near_miss_reports", nm.id);
      linked = { type: "near_miss_reports", id: nm.id };
    }
    if (linked) ctx.update("field_reports", report.id, { linked_type: linked.type, linked_id: linked.id });
    const kindLabel = labelOf("field_reports.kind", kind);
    const who = anonymous ? "이름 없음" : ctx.persona.displayName;
    const where = [eq?.equipment_no, step?.name].filter(Boolean).join(" · ");
    const recipients = new Set<string>();
    const plant = personOf(ctx, "R_PLANT_MGR");
    if (plant) recipients.add(plant);
    if (kind === "defect") { const qa = personOf(ctx, "R_QA"); if (qa) recipients.add(qa); }
    recipients.delete(me);
    for (const r of recipients) {
      ctx.notify({ recipientId: r, kind: "field_report", title: `${kindLabel} 등록: ${note}`, body: [who, where].filter(Boolean).join(" · "), link: `/ops/report?tab=feed&selected=${report.id}`, sourceModule: "mfg-quality", sourceId: report.id });
    }
    ctx.audit({ action: "rpc:create_field_report", resource: "field_reports", resourceId: report.id, changes: { kind: [null, kind], note: [null, note] }, actorType: anonymous ? "system" : "member" });
    return { ok: true, id: report.id, linkedType: linked?.type ?? null, linkedId: linked?.id ?? null, notified: recipients.size };
  },

  /** 설비 현황판(I-10): 가동 기록 추가(같은 날·조는 최신이 이김). 고장이면 공장장에게 알림 */
  set_equipment_status: (ctx, p: { equipmentId?: string; date?: string; shift?: string; status?: string; reason?: string | null }) => {
    if (!ctx.can("equipment_run_logs", "create")) ctx.fail(403, "공장장·생산 작업자만 상태를 바꿀 수 있어요");
    const eq = (p.equipmentId ? ctx.get("equipment", p.equipmentId) : null) ?? ctx.fail(404, "찾는 설비가 없어요");
    const status = p.status as R<"equipment_run_logs">["status"];
    if (!["running", "stopped", "breakdown", "setup"].includes(status)) ctx.fail(400, "상태를 골라 주세요");
    const shift = p.shift === "night" ? "night" : "day";
    const date = p.date && /^\d{4}-\d{2}-\d{2}$/.test(p.date) ? p.date : ctx.today;
    const prev = ctx.raw.list("equipment_run_logs", { filters: [{ field: "equipment_id", operator: "eq", value: eq.id }, { field: "date", operator: "eq", value: date }, { field: "shift", operator: "eq", value: shift }] })
      .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))[0];
    const log = ctx.insert("equipment_run_logs", { equipment_id: eq.id, date, shift, status, reason: text(p.reason, 60) || null, recorded_by: ctx.persona.memberId, recorded_at: ctx.clock.now() });
    if (status === "breakdown") {
      const plant = personOf(ctx, "R_PLANT_MGR");
      if (plant && plant !== ctx.persona.memberId) {
        ctx.notify({ recipientId: plant, kind: "field_report", title: `${eq.equipment_no} 고장 표시`, body: log.reason ?? "설비 현황판에서 고장으로 바꿨어요", link: "/ops/production/board", sourceModule: "mfg-production", sourceId: log.id });
      }
    }
    ctx.audit({ action: "rpc:set_equipment_status", resource: "equipment_run_logs", resourceId: log.id, changes: { status: [prev?.status ?? null, status] } });
    return { ok: true, id: log.id };
  },

  /** 반기 점검(I-20): 대표 최종 확인 → 그 반기 법정 일정 완료 */
  confirm_semiannual_review: (ctx, p: { half?: string }) => {
    if (ctx.persona.role !== "owner") ctx.fail(403, "대표만 최종 확인할 수 있어요");
    const half = text(p.half, 10);
    const rows = ctx.raw.list("semiannual_reviews", { filters: [{ field: "half", operator: "eq", value: half }] });
    if (!rows.length) ctx.fail(404, "이 반기의 점검 기록이 없어요");
    if (rows.some((r) => r.result === "pending")) ctx.fail(400, "아직 확인하지 않은 항목이 있어요");
    const lcId = `lc-tr-${half.toLowerCase().replace("-", "")}`;
    const lc = ctx.raw.get("legal_calendar_items", lcId);
    if (lc && lc.status !== "done") ctx.update("legal_calendar_items", lc.id, { status: "done" });
    ctx.audit({ action: "rpc:confirm_semiannual_review", resource: "semiannual_reviews", resourceId: half, changes: { confirmed: [false, true] } });
    return { ok: true, legalCalendarItemId: lc?.id ?? null };
  },

  /** 현장 기록 담당 정하기(I-07 피드): 담당 + 상태 assigned + (선택) 업무 만들기(source=field_report) */
  assign_field_report: (ctx, p: { reportId?: string; assigneeId?: string; task?: { title?: string; projectId?: string; dueAt?: string | null } | null }) => {
    if (!ctx.can("field_reports", "approve")) ctx.fail(403, "담당 지정은 검토자 이상이 할 수 있어요");
    const fr = (p.reportId ? ctx.get("field_reports", p.reportId) : null) ?? ctx.fail(404, "찾는 현장 기록이 없어요");
    const assignee = p.assigneeId && ctx.tenant.people.some((x) => x.id === p.assigneeId) ? p.assigneeId : ctx.fail(400, "담당을 골라 주세요");
    // 검사는 쓰기 전에 모두(하나라도 실패하면 아무것도 바꾸지 않게. 저장소 트랜잭션도 실패하면 되돌려요)
    if (p.task?.title && (!p.task.projectId || !ctx.raw.get("projects", p.task.projectId))) ctx.fail(400, "업무를 넣을 프로젝트를 골라 주세요");
    ctx.update("field_reports", fr.id, { assignee_id: assignee, status: fr.status === "new" ? "assigned" : fr.status });
    let taskId: string | null = null;
    if (p.task?.title) {
      const task = ctx.insert("tasks", {
        project_id: p.task.projectId!, part_id: null, title: text(p.task.title, 80), description: `현장 등록: ${fr.note}`, task_type: labelOf("field_reports.kind", fr.kind),
        assignee_id: assignee, reviewer_id: ctx.persona.memberId, due_at: p.task.dueAt ?? null, priority: fr.kind === "equipment" ? "high" : "normal", status: "todo",
        source: "field_report", source_ref: fr.id, estimate_hours: null, sensitivity: "L1",
      });
      taskId = task.id;
      if (fr.linked_type === "nonconformances" && fr.linked_id) ctx.update("nonconformances", fr.linked_id, { linked_task_id: task.id });
      if (fr.linked_type === "breakdown_records" && fr.linked_id) ctx.update("breakdown_records", fr.linked_id, { linked_task_id: task.id });
    }
    if (assignee !== ctx.persona.memberId) {
      ctx.notify({ recipientId: assignee, kind: taskId ? "task_assigned" : "field_report", title: taskId ? `새 업무 "${text(p.task?.title, 40)}"` : `현장 기록 담당: ${fr.note}`, link: taskId ? `/work/tasks/${taskId}` : `/ops/report?tab=feed&selected=${fr.id}`, sourceModule: taskId ? "tasks" : "mfg-quality", sourceId: taskId ?? fr.id });
    }
    ctx.audit({ action: "rpc:assign_field_report", resource: "field_reports", resourceId: fr.id, changes: { assignee_id: [fr.assignee_id, assignee], status: [fr.status, "assigned"] } });
    return { ok: true, taskId };
  },

  /** 출처가 있는 업무 만들기(클레임 상세 · 반기 점검): tasks(source, source_ref) + 담당 알림 */
  create_linked_task: (ctx, p: { title?: string; projectId?: string; assigneeId?: string; reviewerId?: string | null; dueAt?: string | null; source?: string; sourceRef?: string | null; description?: string | null }) => {
    if (!ctx.can("tasks", "create") || ctx.persona.role === "member") ctx.fail(403, "업무는 검토자 이상이 만들 수 있어요");
    const title = text(p.title, 80);
    if (title.length < 2) ctx.fail(400, "업무 제목을 적어 주세요");
    const project = (p.projectId ? ctx.raw.get("projects", p.projectId) : null) ?? ctx.fail(400, "프로젝트를 골라 주세요");
    const assignee = p.assigneeId && ctx.tenant.people.some((x) => x.id === p.assigneeId) ? p.assigneeId : ctx.fail(400, "담당을 골라 주세요");
    const source = (["claim", "field_report", "manual"].includes(String(p.source)) ? p.source : "manual") as R<"tasks">["source"];
    const task = ctx.insert("tasks", {
      project_id: project.id, part_id: null, title, description: p.description ? text(p.description, 400) : null, task_type: source === "claim" ? "클레임 대응" : null,
      assignee_id: assignee, reviewer_id: p.reviewerId ?? ctx.persona.memberId, due_at: p.dueAt ?? null, priority: source === "claim" ? "high" : "normal", status: "todo",
      source, source_ref: p.sourceRef ?? null, estimate_hours: null, sensitivity: project.sensitivity,
    });
    if (assignee !== ctx.persona.memberId) ctx.notify({ recipientId: assignee, kind: "task_assigned", title: `새 업무 "${title}"`, link: `/work/tasks/${task.id}`, sourceModule: "tasks", sourceId: task.id });
    ctx.audit({ action: "rpc:create_linked_task", resource: "tasks", resourceId: task.id, changes: { title: [null, title], source_ref: [null, p.sourceRef ?? null] } });
    return { ok: true, taskId: task.id };
  },

  /** 클레임 접수(I-12): customer_claims + corrective_actions(8D, 모두 할 일) + 품질보증 담당 알림 */
  create_claim: (ctx, p: { partnerId?: string; itemId?: string; customerRefNo?: string; qty?: number; lots?: string[]; description?: string; containmentDue?: string; reportDue?: string; severity?: string }) => {
    if (!ctx.can("customer_claims", "approve")) ctx.fail(403, "클레임 접수는 검토자 이상이 할 수 있어요");
    const partner = (p.partnerId ? ctx.raw.get("partners", p.partnerId) : null) ?? ctx.fail(400, "고객을 골라 주세요");
    const item = (p.itemId ? ctx.raw.get("items", p.itemId) : null) ?? ctx.fail(400, "품목을 골라 주세요");
    const description = text(p.description, 300);
    if (description.length < 2) ctx.fail(400, "내용을 적어 주세요");
    const year = ctx.today.slice(0, 4);
    const n = ctx.raw.list("customer_claims").filter((c) => c.claim_no.startsWith(`CL-${year}-`)).length + 1;
    const claimNo = `CL-${year}-${pad(n, 2)}`;
    const qa = personOf(ctx, "R_QA") ?? ctx.persona.memberId;
    const claim = ctx.insert("customer_claims", {
      claim_no: claimNo, partner_id: partner.id, item_id: item.id, received_on: ctx.today, description, status: "received", due_on: p.reportDue ?? null,
      customer_ref_no: text(p.customerRefNo, 40) || null, qty_affected: Math.max(0, Math.round(Number(p.qty) || 0)), lot_nos: (p.lots ?? []).map((x) => text(x, 40)).filter(Boolean),
      containment_due: p.containmentDue ?? null, report_8d_due: p.reportDue ?? null, severity: (["high", "medium", "low"].includes(String(p.severity)) ? p.severity : "medium") as R<"customer_claims">["severity"],
    });
    const ca = ctx.insert("corrective_actions", {
      related_type: "claim", related_id: claim.id, method: "8D", root_cause: null, actions: null, owner_id: qa, due_on: p.reportDue ?? null, status: "open", artifact_id: null,
      d_steps: STEP_ORDER.map((step) => ({ step, status: "todo", done_on: null, note: null, owner_id: null })), containment: null, verification: null, horizontal_deployment: null,
    });
    if (qa !== ctx.persona.memberId) ctx.notify({ recipientId: qa, kind: "claim", title: `${claimNo} 클레임 접수`, body: `${partner.name} · ${item.name}`, link: `/ops/quality/claims/${claim.id}`, sourceModule: "mfg-quality", sourceId: claim.id });
    ctx.audit({ action: "rpc:create_claim", resource: "customer_claims", resourceId: claim.id, changes: { claim_no: [null, claimNo] } });
    return { ok: true, id: claim.id, correctiveActionId: ca.id, claimNo };
  },

  /** 8D 보드 이동(I-12): 그 열 앞 단계는 완료, 첫 단계는 진행 중 */
  move_claim_column: (ctx, p: { claimId?: string; column?: string }) => {
    if (!ctx.can("customer_claims", "approve")) ctx.fail(403, "8D 단계는 검토자 이상이 옮길 수 있어요");
    const claim = (p.claimId ? ctx.get("customer_claims", p.claimId) : null) ?? ctx.fail(404, "찾는 클레임이 없어요");
    const first = COLUMN_FIRST[String(p.column)] ?? ctx.fail(400, "옮길 열을 골라 주세요");
    const ca = ctx.raw.list("corrective_actions", { filters: [{ field: "related_id", operator: "eq", value: claim.id }] })[0] ?? ctx.fail(404, "시정조치 기록이 없어요");
    const idx = STEP_ORDER.indexOf(first);
    const next: DStep[] = STEP_ORDER.map((step, i) => {
      const cur = ca.d_steps.find((s) => s.step === step);
      if (i < idx) return { ...(cur ?? { step, note: null, owner_id: null }), step, status: "done", done_on: cur?.status === "done" ? cur.done_on : ctx.today };
      if (i === idx) return { ...(cur ?? { step, note: null }), step, status: "doing", done_on: null, owner_id: cur?.owner_id ?? ca.owner_id };
      return { ...(cur ?? { step, note: null, owner_id: null }), step, status: "todo", done_on: null };
    });
    ctx.update("corrective_actions", ca.id, { d_steps: next, status: "open" });
    const status = claimStatusFor(first);
    ctx.update("customer_claims", claim.id, { status });
    ctx.audit({ action: "rpc:move_claim_column", resource: "customer_claims", resourceId: claim.id, changes: { step: [null, first], status: [claim.status, status] } });
    return { ok: true, step: first };
  },

  /** 클레임 상세(I-13): 진행 중 단계를 완료로 표시(완료일=오늘), 다음 단계 진행 중 */
  complete_d_step: (ctx, p: { claimId?: string; note?: string | null }) => {
    if (!ctx.can("customer_claims", "approve")) ctx.fail(403, "단계 완료는 검토자 이상이 표시할 수 있어요");
    const claim = (p.claimId ? ctx.get("customer_claims", p.claimId) : null) ?? ctx.fail(404, "찾는 클레임이 없어요");
    const ca = ctx.raw.list("corrective_actions", { filters: [{ field: "related_id", operator: "eq", value: claim.id }] })[0] ?? ctx.fail(404, "시정조치 기록이 없어요");
    const steps = STEP_ORDER.map((step) => ca.d_steps.find((s) => s.step === step) ?? { step, status: "todo" as const, done_on: null, note: null, owner_id: null });
    const curIdx = steps.findIndex((s) => s.status !== "done");
    if (curIdx < 0) ctx.fail(400, "모든 단계를 이미 마쳤어요");
    const done = steps[curIdx]!.step;
    const next = steps.map((s, i) => i === curIdx ? { ...s, status: "done" as const, done_on: ctx.today, note: text(p.note, 120) || s.note || null, owner_id: s.owner_id ?? ca.owner_id } : i === curIdx + 1 ? { ...s, status: "doing" as const, owner_id: s.owner_id ?? ca.owner_id } : s);
    const nextStep = next.find((s) => s.status !== "done")?.step ?? null;
    ctx.update("corrective_actions", ca.id, { d_steps: next, status: nextStep ? "open" : "closed" });
    const status = claimStatusFor(nextStep);
    ctx.update("customer_claims", claim.id, { status });
    ctx.audit({ action: "rpc:complete_d_step", resource: "customer_claims", resourceId: claim.id, changes: { [done]: ["doing", "done"], status: [claim.status, status] } });
    return { ok: true, done, next: nextStep };
  },

  /** 수리 완료(I-14 고장 탭): 정지 시간 계산 + 설비 사용으로 + 등록자에게 알림 */
  repair_breakdown: (ctx, p: { breakdownId?: string; cause?: string | null; repair?: string | null }) => {
    if (!ctx.can("breakdown_records", "approve")) ctx.fail(403, "수리 완료는 검토자 이상이 표시할 수 있어요");
    const bd = (p.breakdownId ? ctx.get("breakdown_records", p.breakdownId) : null) ?? ctx.fail(404, "찾는 고장 기록이 없어요");
    if (bd.status === "repaired") ctx.fail(400, "이미 수리 완료로 표시했어요");
    const now = ctx.clock.now();
    const downtime = Math.max(0, Math.round((Date.parse(now) - Date.parse(bd.occurred_at)) / 60_000));
    ctx.update("breakdown_records", bd.id, { status: "repaired", downtime_min: downtime, cause: text(p.cause, 120) || bd.cause, repair: text(p.repair, 120) || bd.repair, repaired_by: ctx.persona.memberId });
    const eq = ctx.raw.get("equipment", bd.equipment_id);
    if (eq && eq.status === "repair") ctx.update("equipment", eq.id, { status: "active" });
    const reports = ctx.raw.list("field_reports", { filters: [{ field: "linked_id", operator: "eq", value: bd.id }] });
    for (const fr of reports) {
      ctx.update("field_reports", fr.id, { status: "done" });
      if (fr.reported_by && fr.reported_by !== ctx.persona.memberId) {
        ctx.notify({ recipientId: fr.reported_by, kind: "field_report", title: `등록하신 ${eq?.equipment_no ?? "설비"} ${bd.symptom} 건: 수리 완료`, link: `/ops/equipment?tab=breakdowns&selected=${bd.id}`, sourceModule: "mfg-equipment", sourceId: bd.id });
      }
    }
    ctx.audit({ action: "rpc:repair_breakdown", resource: "breakdown_records", resourceId: bd.id, changes: { status: [bd.status, "repaired"], downtime_min: [bd.downtime_min, downtime] } });
    return { ok: true, downtime };
  },

  /** 아차사고·의견 남기기(I-18): 이름 없이 보내기를 지키려고 rpc로 만듭니다 */
  create_safety_report: (ctx, p: { kind?: string; location?: string | null; content?: string; anonymous?: boolean }) => {
    if (!ctx.isModuleOn("safety-health")) ctx.fail(403, "이 회사에서 쓰지 않는 기능이에요");
    const content = text(p.content, 200);
    if (content.length < 2) ctx.fail(400, "내용을 적어 주세요");
    const anonymous = !!p.anonymous;
    const me = ctx.persona.memberId;
    const now = ctx.clock.now();
    let id: string;
    let resource: ResourceName;
    if (p.kind === "near_miss") {
      const nm = ctx.insert("near_miss_reports", { reported_by: anonymous ? null : me, anonymous, occurred_at: now, location: text(p.location, 60) || null, description: content, photo_refs: [], status: "new", linked_task_id: null });
      id = nm.id; resource = "near_miss_reports";
    } else {
      const prefix = p.kind === "suggestion" ? "개선 제안: " : "";
      const op = ctx.insert("worker_opinions", { channel: "web", submitted_at: now, anonymous, content: `${prefix}${content}`, response: null, status: "new" });
      id = op.id; resource = "worker_opinions";
    }
    if (anonymous) hideCreator(ctx, resource, id);
    const plant = personOf(ctx, "R_PLANT_MGR");
    if (plant && plant !== me) {
      ctx.notify({ recipientId: plant, kind: "field_report", title: p.kind === "near_miss" ? `아차사고 신고: ${text(content, 40)}` : `근로자 의견: ${text(content, 40)}`, body: anonymous ? "이름 없음" : ctx.persona.displayName, link: "/company/safety", sourceModule: "safety-health", sourceId: id });
    }
    ctx.audit({ action: "rpc:create_safety_report", resource, resourceId: id, changes: null, actorType: anonymous ? "system" : "member" });
    return { ok: true, id, resource };
  },
};

// ───────────────────────────────────────────── 셀렉터
const sel: Record<string, SelectorHandler> = {
  /** 생산·품질 홈 히어로(I-06): 현재 근무조 편조기·프레스 가동 · 미수리 고장 · 미배정 현장 등록 (+작업자용 작업지시·점검 미완료) */
  "ops.today": (ctx) => {
    const { date, shift } = shiftAt(ctx.clock.now());
    const equipment = ctx.isModuleOn("mfg-equipment") ? ctx.list("equipment").filter((e) => e.status !== "retired") : [];
    const logs = ctx.isModuleOn("mfg-production") ? ctx.list("equipment_run_logs", { filters: [{ field: "date", operator: "eq", value: date }, { field: "shift", operator: "eq", value: shift }] }) : [];
    const latest = new Map<string, RowOf<"equipment_run_logs">>();
    for (const l of logs) { const cur = latest.get(l.equipment_id); if (!cur || l.recorded_at > cur.recorded_at) latest.set(l.equipment_id, l); }
    const knit = equipment.filter((e) => e.kind === "편조기");
    const press = equipment.filter((e) => e.kind === "프레스");
    const running = (list: RowOf<"equipment">[]) => list.filter((e) => latest.get(e.id)?.status === "running").length;
    const knitStatus = { running: 0, stopped: 0, breakdown: 0, setup: 0, none: 0 };
    for (const e of knit) knitStatus[latest.get(e.id)?.status ?? "none"] += 1;
    const openBreakdowns = ctx.isModuleOn("mfg-equipment") ? ctx.list("breakdown_records").filter((b) => b.status !== "repaired").length : 0;
    const unassignedReports = ctx.isModuleOn("mfg-quality") ? ctx.list("field_reports", { filters: [{ field: "status", operator: "eq", value: "new" }] }).length : 0;
    const workOrdersToday = ctx.isModuleOn("mfg-production") ? ctx.list("work_orders", { filters: [{ field: "planned_date", operator: "eq", value: ctx.today }] }).filter((w) => w.status !== "done").length : 0;
    const checked = new Set(ctx.isModuleOn("mfg-equipment") ? ctx.list("equipment_checks", { filters: [{ field: "checked_on", operator: "eq", value: ctx.today }] }).map((c) => c.equipment_id) : []);
    const checksMissing = equipment.filter((e) => e.status === "active" && !checked.has(e.id)).length;
    return {
      date, shift, hasLogs: logs.length > 0,
      knitRunning: running(knit), knitTotal: knit.length, knitStatus,
      pressRunning: running(press), pressTotal: press.length,
      openBreakdowns, unassignedReports, workOrdersToday, checksMissing,
    };
  },
};

export default defineGroup({ group: "industry", seed, rpc, sel });
