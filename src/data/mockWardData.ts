import type {
  BedPatient,
  DietOrder,
  IsolationType,
  MealKey,
  MealOrder,
  OrderStatus,
  RestrictionKey,
  RiceOption,
  TextureKey,
  TubeFeedingSpec,
  ZoneKey,
} from '../types/hospital';

export interface MealDefinition {
  k: MealKey;
  n: string;
  cut: string;
}

export const MEALS: MealDefinition[] = [
  { k: 'm', n: 'มื้อเช้า', cut: '06:30 น.' },
  { k: 'l', n: 'มื้อกลางวัน', cut: '10:00 น.' },
  { k: 'd', n: 'มื้อเย็น', cut: '15:00 น.' },
];

export interface TextureDefinition {
  k: TextureKey;
  short: string;
  label: string;
  desc: string;
}

export const TEXTURES: TextureDefinition[] = [
  { k: 'normal', short: 'ปกติ', label: 'อาหารปกติ', desc: 'รับประทานอาหารทั่วไปได้' },
  { k: 'soft', short: 'อ่อน', label: 'อาหารอ่อน', desc: 'เนื้อนุ่ม ย่อยง่าย เคี้ยวง่าย' },
  { k: 'minced', short: 'บด', label: 'อาหารบดละเอียด', desc: 'ปั่นละเอียดสำหรับผู้มีปัญหากลืน' },
  { k: 'thick', short: 'เหลวข้น', label: 'อาหารเหลวข้น', desc: 'ควบคุมความหนืด ลดเสี่ยงสำลัก' },
  { k: 'clear', short: 'เหลวใส', label: 'อาหารเหลวใส', desc: 'น้ำซุปใส น้ำผลไม้กรอง' },
  { k: 'bd', short: 'สายยาง (BD)', label: 'อาหารทางสายยาง (BD)', desc: 'ปั่นผสมหรือสูตรสำเร็จรูป' },
  { k: 'npo', short: 'งดอาหาร (NPO)', label: 'งดอาหารและน้ำ (NPO)', desc: 'งดรับประทานทางปากทุกชนิด' },
];

export interface RestrictionDefinition {
  k: RestrictionKey;
  short: string;
  label: string;
}

export const RESTRICTIONS: RestrictionDefinition[] = [
  { k: 'dm', short: 'เบาหวาน', label: 'ควบคุมน้ำตาล (เบาหวาน)' },
  { k: 'low', short: 'โซเดียมต่ำ', label: 'ลดเค็ม / โซเดียมต่ำ' },
  { k: 'kid', short: 'โรคไต', label: 'เฉพาะโรคไต' },
  { k: 'lf', short: 'ไขมันต่ำ', label: 'ควบคุมไขมัน (ไขมันต่ำ)' },
  { k: 'hp', short: 'โปรตีนสูง', label: 'เสริมโปรตีนสูง' },
];

export const FORMULAS = [
  'สูตรมาตรฐาน (Standard Formula)',
  'สูตรควบคุมน้ำตาล (DM Formula)',
  'สูตรเฉพาะโรคไต (Renal Formula)',
];

export const ISOLATION_TYPES: Record<IsolationType, { label: string; short: string }> = {
  contact: { label: 'แยกโรคทางสัมผัส (Contact)', short: 'สัมผัส' },
  droplet: { label: 'แยกโรคทางละอองฝอย (Droplet)', short: 'ละอองฝอย' },
  airborne: { label: 'แยกโรคทางอากาศ (Airborne)', short: 'ทางอากาศ' },
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  none: 'รอสั่งอาหาร',
  ordered: 'รอครัวจัดเตรียม',
  prep: 'กำลังจัดเตรียม',
  sent: 'จัดส่งเรียบร้อย',
  left: 'วางหน้าห้องแล้ว',
};

export const ZONE_INFO: Record<ZoneKey, { title: string; subtitle: string }> = {
  gen: { title: 'หอผู้ป่วยสามัญ', subtitle: 'เตียง 01–30' },
  sp: { title: 'ห้องพิเศษและห้องเดี่ยว', subtitle: 'ห้องพิเศษ 1–8 · ส่งถึงห้องโดยตรง' },
  iso: { title: 'ห้องแยกโรค (Isolation)', subtitle: 'ISO1–ISO4 · ภาชนะใช้ครั้งเดียวทิ้ง' },
};

export const getTexture = (k: TextureKey) => TEXTURES.find((t) => t.k === k)!;
export const getRestriction = (k: RestrictionKey) => RESTRICTIONS.find((r) => r.k === k)!;
export const getMealName = (k: MealKey) => MEALS.find((m) => m.k === k)?.n ?? '';

export const isRiceAllowed = (diet: DietOrder) => ['normal', 'soft'].includes(diet.tex);

export const getRiceLabel = (val: RiceOption): string => {
  if (val === 'porridge') return 'โจ๊ก';
  if (val === 'congee') return 'ข้าวต้ม';
  return 'ข้าวสวย';
};

export const getDietShortSummary = (diet: DietOrder): string => {
  if (diet.tex === 'npo') return 'งดอาหาร (NPO)';
  const base = getTexture(diet.tex).short;
  if (diet.restr.length === 0) return base;
  return `${base} · ${diet.restr.map((r) => getRestriction(r).short).join(' · ')}`;
};

export const getKitchenDietTitle = (diet: DietOrder): string => {
  if (diet.tex === 'bd') {
    return diet.tube.sub === 'natural'
      ? 'อาหารทางสายยาง (BD) · ปั่นผสมธรรมชาติ'
      : 'อาหารทางสายยาง (BD) · สูตรสำเร็จรูป';
  }
  const base = getTexture(diet.tex).label;
  if (diet.restr.length === 0) return base;
  return `${base} (${diet.restr.map((r) => getRestriction(r).short).join(', ')})`;
};

export const createDefaultOrder = (): MealOrder => ({
  st: 'none',
  rice: 'rice',
  portion: 'normal',
  note: '',
  rel: 0,
  changed: false,
  urgent: false,
});

export const formatTodayThai = () =>
  new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });

export const formatTimeNow = () =>
  new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

type SeedTuple = [
  name: string,
  age: number,
  dx: string,
  tex: TextureKey,
  restr: string,
  allergy?: string,
  tube?: TubeFeedingSpec,
  isoType?: IsolationType
];

const GENERAL_SEED: (SeedTuple | undefined)[] = [
  ['สมชาย ใจดี', 68, 'ปอดอักเสบ', 'soft', 'low,dm'],
  ['สมหญิง รักษ์ดี', 72, 'เบาหวานชนิดที่ 2', 'normal', 'dm'],
  ['ประยุทธ์ มั่นคง', 59, 'ความดันโลหิตสูง', 'normal', 'low'],
  ['วิไล สุขใจ', 81, 'ไตวายเรื้อรัง', 'soft', 'kid,low'],
  [
    'บุญมี แก้วใส',
    75,
    'โรคหลอดเลือดสมอง',
    'bd',
    '',
    undefined,
    { sub: 'natural', formula: '', kcal: 1, line: 'NG', method: 'bolus', vol: 250, times: 5, flush: 30 },
  ],
  ['ศรีสุดา วงศ์ดี', 64, 'ภาวะหัวใจล้มเหลว', 'normal', 'low', 'ถั่วลิสง'],
  ['มานะ พากเพียร', 55, 'ตับอักเสบ', 'normal', 'lf'],
  ['ทองดี ศรีสวัสดิ์', 83, 'กระดูกสะโพกหัก', 'soft', ''],
  ['ลำดวน หอมหวล', 70, 'เบาหวานและความดันสูง', 'normal', 'dm,low'],
  ['อนงค์ เพชรดี', 47, 'เตรียมผ่าตัดไส้ติ่ง', 'npo', ''],
  [
    'สุรชัย กล้าหาญ',
    66,
    'โรคหลอดเลือดสมอง',
    'bd',
    'dm',
    undefined,
    {
      sub: 'formula',
      formula: 'สูตรควบคุมน้ำตาล (DM Formula)',
      kcal: 1,
      line: 'PEG',
      method: 'continuous',
      vol: 100,
      times: 6,
      flush: 50,
    },
  ],
  ['พิมพ์ใจ ใจงาม', 39, 'กระเพาะอาหารอักเสบ', 'soft', ''],
  ['ชัยวัฒน์ มีสุข', 61, 'โรคไตเรื้อรัง', 'normal', 'kid'],
  ['จันทร์เพ็ญ แสงทอง', 77, 'ปอดอักเสบ', 'minced', ''],
  ['ประสิทธิ์ ดีเลิศ', 58, 'เบาหวาน', 'normal', 'dm', 'กุ้งและอาหารทะเล'],
  ['นวลจันทร์ ใจเย็น', 69, 'โรคหัวใจขาดเลือด', 'soft', 'low'],
  ['เกียรติศักดิ์ ยิ่งยง', 52, 'ตับแข็งระยะชดเชย', 'normal', 'hp,low'],
  ['สายสมร ทองคำ', 85, 'ปอดอักเสบ (ภาวะกลืนลำบาก)', 'thick', ''],
  ['วีระ ชูชื่น', 63, 'เบาหวานและโรคไต', 'soft', 'dm,kid'],
  ['รัตนา บุญมา', 44, 'นิ่วในไต', 'normal', ''],
  [
    'อภิชาติ สุขสม',
    73,
    'โรคหลอดเลือดสมอง',
    'bd',
    '',
    undefined,
    {
      sub: 'formula',
      formula: 'สูตรมาตรฐาน (Standard Formula)',
      kcal: 1,
      line: 'NG',
      method: 'bolus',
      vol: 300,
      times: 5,
      flush: 30,
    },
  ],
  ['กัญญา ศรีสุข', 56, 'ไขมันในเลือดสูง', 'normal', 'lf'],
  ['ธวัช นามดี', 67, 'เบาหวาน', 'soft', 'dm'],
  ['ปราณี มีชัย', 79, 'กระดูกต้นขาหัก', 'normal', ''],
  ['สุเทพ ใจบุญ', 60, 'ลำไส้อักเสบเฉียบพลัน', 'clear', ''],
  ['สมศักดิ์ พึ่งบุญ', 71, 'โรคหลอดเลือดหัวใจ', 'normal', 'low'],
];

const SPECIAL_SEED: (SeedTuple | undefined)[] = [
  ['อรุณี ธนารักษ์', 58, 'เบาหวาน', 'normal', 'dm'],
  ['วิชัย เจริญสุข', 74, 'โรคหัวใจ', 'soft', 'low'],
  ['ปิยะนุช มั่งมี', 66, 'โรคไตเรื้อรัง', 'normal', 'kid,low'],
  [
    'ชาญณรงค์ รุ่งเรือง',
    80,
    'โรคหลอดเลือดสมอง',
    'bd',
    '',
    undefined,
    { sub: 'natural', formula: '', kcal: 1.2, line: 'NG', method: 'bolus', vol: 250, times: 5, flush: 30 },
  ],
  ['มาลี ศรีทอง', 62, 'หลังผ่าตัดเปลี่ยนข้อเข่า', 'normal', ''],
  ['ธนากร วัฒนา', 49, 'ตับอักเสบ', 'normal', 'lf'],
];

const ISOLATION_SEED: (SeedTuple | undefined)[] = [
  ['สุพจน์ แสนสุข', 65, 'วัณโรคปอด', 'normal', 'low', undefined, undefined, 'airborne'],
  ['นภา ใสสะอาด', 34, 'ไข้หวัดใหญ่สายพันธุ์ A', 'soft', '', undefined, undefined, 'droplet'],
  ['ณัฐวุฒิ ทรงศรี', 52, 'ติดเชื้อดื้อยา (MRSA)', 'normal', 'dm', undefined, undefined, 'contact'],
];

export function buildInitialWardData(): BedPatient[] {
  const today = formatTodayThai();
  const beds: BedPatient[] = [];

  const createBed = (
    id: string,
    zone: ZoneKey,
    label: string,
    seed?: SeedTuple,
    extra: Partial<BedPatient> = {}
  ): BedPatient => {
    if (!seed) {
      return { id, zone, label, occ: false, ...extra };
    }
    const [name, age, dx, tex, restrStr, allergy, tube] = seed;
    const restr = restrStr ? (restrStr.split(',') as RestrictionKey[]) : [];
    const hnNum = 670000 + beds.length * 143 + 19;
    const diet: DietOrder = {
      tex,
      restr,
      doctor: 'นพ.วิชัย สุขสันต์',
      date: today,
      tube: tube ?? {
        sub: 'natural',
        formula: '',
        kcal: 1,
        line: 'NG',
        method: 'bolus',
        vol: 250,
        times: 5,
        flush: 30,
      },
    };
    const orders: Record<MealKey, MealOrder> = {
      m: createDefaultOrder(),
      l: createDefaultOrder(),
      d: createDefaultOrder(),
    };
    return {
      id,
      zone,
      label,
      occ: true,
      name,
      age,
      dx,
      hn: String(hnNum),
      allergy: allergy ?? '',
      diet,
      orders,
      log: [{ t: '07:10', u: 'พย.สมใจ', x: 'รับคำสั่งแผนอาหารจากแพทย์ผู้ดูแล' }],
      ...extra,
    };
  };

  for (let i = 1; i <= 30; i++) {
    const label = String(i).padStart(2, '0');
    beds.push(createBed(`B${i}`, 'gen', label, GENERAL_SEED[i - 1]));
  }
  for (let i = 1; i <= 8; i++) {
    beds.push(
      createBed(`SP${i}`, 'sp', `ห้องพิเศษ ${i}`, SPECIAL_SEED[i - 1], {
        room: i <= 6 ? 'ห้องเดี่ยวพิเศษ' : 'ห้อง VIP',
      })
    );
  }
  for (let i = 1; i <= 4; i++) {
    const seed = ISOLATION_SEED[i - 1];
    beds.push(
      createBed(
        `ISO${i}`,
        'iso',
        `ISO${i}`,
        seed,
        seed && seed[7] ? { iso: { type: seed[7], start: today } } : {}
      )
    );
  }

  // Seed realistic mid-day meal statuses
  let occIdx = 0;
  for (const bed of beds) {
    if (!bed.occ || !bed.diet || !bed.orders) continue;
    occIdx++;
    if (bed.diet.tex === 'npo') continue;
    const riceOk = isRiceAllowed(bed.diet);
    bed.orders.m.st = bed.zone === 'iso' ? 'left' : 'sent';
    bed.orders.l.st = occIdx % 4 === 0 ? 'none' : occIdx % 5 === 0 ? 'prep' : 'ordered';
    if (!riceOk) {
      bed.orders.m.rice = null;
      bed.orders.l.rice = null;
      bed.orders.d.rice = null;
    } else if (bed.diet.tex === 'soft') {
      bed.orders.m.rice = 'porridge';
      bed.orders.l.rice = 'porridge';
      bed.orders.d.rice = 'porridge';
    }
    if (bed.zone === 'sp') {
      bed.orders.l.rel = bed.id === 'SP1' || bed.id === 'SP2' ? 1 : 0;
    }
    if (bed.id === 'B26' || bed.id === 'SP6') {
      bed.isNewAdmit = true;
    }
  }

  return beds;
}

export function buildInitialMovements() {
  return [
    {
      id: 'mv-adm-1',
      type: 'admitted' as const,
      bedId: 'B26',
      bedLabel: '26',
      zone: 'gen' as const,
      name: 'สมศักดิ์ พึ่งบุญ',
      hn: '673612',
      age: 71,
      dx: 'โรคหลอดเลือดหัวใจ',
      dietSummary: 'ปกติ · โซเดียมต่ำ',
      time: '09:40 น.',
      by: 'พย.สมใจ',
      note: 'รับย้ายเข้าเตียงใหม่วันนี้',
    },
    {
      id: 'mv-adm-2',
      type: 'admitted' as const,
      bedId: 'SP6',
      bedLabel: 'ห้องพิเศษ 6',
      zone: 'sp' as const,
      name: 'ธนากร วัฒนา',
      hn: '675189',
      age: 49,
      dx: 'ตับอักเสบ',
      dietSummary: 'ปกติ · ไขมันต่ำ',
      time: '10:15 น.',
      by: 'พย.สมใจ',
      note: 'รับเข้าใหม่จาก OPD',
    },
    {
      id: 'mv-dc-1',
      type: 'discharged' as const,
      bedId: 'B27',
      bedLabel: '27',
      zone: 'gen' as const,
      name: 'อำนาจ เจริญกิจ',
      hn: '672044',
      age: 62,
      dx: 'ปอดอักเสบ (อาการดีขึ้น)',
      dietSummary: 'ปกติ',
      time: '08:50 น.',
      by: 'พย.สมใจ',
      note: 'แพทย์อนุญาตให้กลับบ้าน · ยกเลิกมื้อถัดไปแล้ว',
    },
    {
      id: 'mv-dc-2',
      type: 'discharged' as const,
      bedId: 'SP7',
      bedLabel: 'ห้องพิเศษ 7',
      zone: 'sp' as const,
      name: 'สิริพร วัฒนากูล',
      hn: '674891',
      age: 54,
      dx: 'หลังผ่าตัดนิ่วในถุงน้ำดี',
      dietSummary: 'อ่อน · ไขมันต่ำ',
      time: '09:30 น.',
      by: 'พย.สมใจ',
      note: 'จำหน่ายกลับบ้านเรียบร้อย · ห้องว่างพร้อมรับผู้ป่วยใหม่',
    },
  ];
}

