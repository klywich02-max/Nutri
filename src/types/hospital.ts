export type Role = 'nurse' | 'kitchen';
export type MealKey = 'm' | 'l' | 'd';
export type ZoneKey = 'gen' | 'sp' | 'iso';

export type TextureKey =
  | 'normal'
  | 'soft'
  | 'minced'
  | 'thick'
  | 'clear'
  | 'bd'
  | 'npo';

export type RestrictionKey = 'dm' | 'low' | 'kid' | 'lf' | 'hp';

export type OrderStatus = 'none' | 'ordered' | 'prep' | 'sent' | 'left';
export type RiceOption = 'rice' | 'porridge' | 'congee' | null;
export type PortionOption = 'small' | 'normal';
export type IsolationType = 'contact' | 'droplet' | 'airborne';
export type TubeSubType = 'natural' | 'formula';
export type TubeLineType = 'NG' | 'PEG';
export type TubeMethodType = 'bolus' | 'continuous';

export interface TubeFeedingSpec {
  sub: TubeSubType;
  formula: string;
  kcal: number | '';
  line: TubeLineType;
  method: TubeMethodType;
  vol: number | '';
  times: number | '';
  flush: number | '';
}

export interface DietOrder {
  tex: TextureKey;
  restr: RestrictionKey[];
  doctor: string;
  date: string;
  tube: TubeFeedingSpec;
}

export interface MealOrder {
  st: OrderStatus;
  rice: RiceOption;
  portion: PortionOption;
  note: string;
  rel: number;
  changed: boolean;
  urgent: boolean;
}

export interface AuditLogEntry {
  t: string;
  u: string;
  x: string;
}

export interface IsolationInfo {
  type: IsolationType;
  start: string;
}

export interface BedPatient {
  id: string;
  zone: ZoneKey;
  label: string;
  occ: boolean;
  name?: string;
  age?: number;
  dx?: string;
  hn?: string;
  allergy?: string;
  room?: string;
  iso?: IsolationInfo;
  diet?: DietOrder;
  orders?: Record<MealKey, MealOrder>;
  log?: AuditLogEntry[];
  stickerImage?: string;
  stickerCapturedAt?: string;
  isNewAdmit?: boolean;
}

export interface WardMovementRecord {
  id: string;
  type: 'admitted' | 'discharged';
  bedId: string;
  bedLabel: string;
  zone: ZoneKey;
  name: string;
  hn: string;
  age?: number;
  dx?: string;
  dietSummary?: string;
  time: string;
  by: string;
  stickerImage?: string;
  note?: string;
}

export interface KitchenMessage {
  id: string;
  bed: string;
  text: string;
  time: string;
  read: boolean;
}
