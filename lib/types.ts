/**
 * Domain types shared by the data context, screens, and storage layer.
 *
 * Dates: we use two formats:
 *  - `YYYY-MM-DD` for "calendar day" buckets (logs, photos, journal entries)
 *  - ISO 8601 (`new Date().toISOString()`) for full timestamps
 */

export type DayKey = string; // 'YYYY-MM-DD'
export type IsoDate = string; // ISO 8601

export type Gender = 'male' | 'female' | 'other';
export type Goal = 'head' | 'beard' | 'brows';
export type PhotoZone =
  | 'crown' // макушка
  | 'hairline' // линия роста
  | 'temples' // виски
  | 'side' // боковой профиль
  | 'beard' // борода
  | 'brows' // брови
  | 'other';

export type ProcedureKind =
  | 'lotion' // лосьоны (в т.ч. брендовые: Vikinord, Minoxidil-based)
  | 'spray' // миноксидил, любые спреи
  | 'pill' // Vikinord 15%, витамины
  | 'massage' // массаж кожи головы
  | 'derma-roller' // дермароллер (часто в комбо с лосьоном/спреем)
  | 'shampoo' // лечебный шампунь
  | 'oil' // масла
  | 'other';

export type Procedure = {
  id: string;
  name: string; // "Миноксидил"
  /**
   * One or more kinds. Multi-select because common real-world routines
   * combine them — e.g. "lotion + dermaroller" is a single procedure
   * from the user's perspective. UI shows the first kind's icon; extras
   * are rendered as a small badge.
   */
  kinds: ProcedureKind[];
  amount: number; // 10
  unit: string; // "распыления", "мг", "капель", "минут"
  frequencyPerDay: number; // 1, 2, 3
  reminderTimes: string[]; // ['09:00', '21:00']
  notes?: string;
  createdAt: IsoDate;
  archivedAt?: IsoDate;
};

export type ProcedureLog = {
  id: string;
  procedureId: string;
  date: DayKey;
  count: number; // how many times completed today
  updatedAt: IsoDate;
};

export type Photo = {
  id: string;
  uri: string; // file:// path inside app document dir
  thumbUri?: string; // not used yet, future optimisation
  date: DayKey;
  zone: PhotoZone;
  note?: string;
  width?: number;
  height?: number;
  createdAt: IsoDate;
};

export type Mood = 'good' | 'neutral' | 'bad';

export type JournalEntry = {
  id: string;
  date: DayKey;
  text: string;
  mood?: Mood;
  symptoms?: string[]; // ['itch', 'shedding', 'irritation', ...]
  createdAt: IsoDate;
  updatedAt: IsoDate;
};

export type UserProfile = {
  gender?: Gender;
  goals: Goal[];
  startDate?: DayKey; // when user started treatment
  onboardingCompleted: boolean;
  notificationsEnabled: boolean;
  dailySummary: boolean;
};

export const DEFAULT_PROFILE: UserProfile = {
  gender: undefined,
  goals: [],
  startDate: undefined,
  onboardingCompleted: false,
  notificationsEnabled: true,
  dailySummary: false,
};

export const PROCEDURE_KIND_META: Record<
  ProcedureKind,
  { label: string; icon: string; defaultUnit: string }
> = {
  lotion: { label: 'Лосьон', icon: 'water-opacity', defaultUnit: 'капель' },
  spray: { label: 'Спрей', icon: 'spray-bottle', defaultUnit: 'распыления' },
  pill: { label: 'Таблетки', icon: 'pill', defaultUnit: 'мг' },
  massage: { label: 'Массаж', icon: 'hand-back-right', defaultUnit: 'минут' },
  'derma-roller': { label: 'Дермароллер', icon: 'star-four-points', defaultUnit: 'минут' },
  shampoo: { label: 'Шампунь', icon: 'bottle-tonic', defaultUnit: 'применений' },
  oil: { label: 'Масло', icon: 'oil', defaultUnit: 'капель' },
  other: { label: 'Другое', icon: 'medical-bag', defaultUnit: 'раз' },
};

export const PHOTO_ZONE_META: Record<PhotoZone, { label: string; icon: string }> = {
  crown: { label: 'Макушка', icon: 'circle-slice-8' },
  hairline: { label: 'Линия роста', icon: 'arrow-collapse-down' },
  temples: { label: 'Виски', icon: 'arrow-expand-horizontal' },
  side: { label: 'Сбоку', icon: 'account-arrow-right' },
  beard: { label: 'Борода', icon: 'face-man' },
  brows: { label: 'Брови', icon: 'eye-outline' },
  other: { label: 'Другое', icon: 'image' },
};

export const GOAL_META: Record<Goal, { label: string; icon: string }> = {
  head: { label: 'Волосы на голове', icon: 'head' },
  beard: { label: 'Борода', icon: 'face-man' },
  brows: { label: 'Брови', icon: 'eye-outline' },
};

export const SYMPTOMS_RU: { id: string; label: string }[] = [
  { id: 'shedding', label: 'Выпадение' },
  { id: 'itch', label: 'Зуд' },
  { id: 'irritation', label: 'Раздражение' },
  { id: 'dryness', label: 'Сухость' },
  { id: 'dandruff', label: 'Перхоть' },
  { id: 'oily', label: 'Жирность' },
];
