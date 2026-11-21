import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  Lock,
  LockOpen,
  MessageSquareWarning,
  Moon,
  Search,
  Sun,
  UtensilsCrossed,
  RotateCcw,
} from 'lucide-react';
import type {
  BedPatient,
  DietOrder,
  IsolationInfo,
  KitchenMessage,
  MealKey,
  MealOrder,
  Role,
  WardMovementRecord,
  ZoneKey,
} from './types/hospital';
import {
  buildInitialMovements,
  buildInitialWardData,
  createDefaultOrder,
  formatTimeNow,
  formatTodayThai,
  getDietShortSummary,
  getMealName,
  isRiceAllowed,
  MEALS,
  ZONE_INFO,
} from './data/mockWardData';
import { BedCard } from './components/BedCard';
import { PatientOrderSheet } from './components/PatientOrderSheet';
import { KitchenView } from './components/KitchenView';
import { TrayLabelsModal } from './components/TrayLabelsModal';
import { NotifyNurseModal } from './components/NotifyNurseModal';
import { StickerCaptureModal } from './components/StickerCaptureModal';
import { WardMovementPanel } from './components/WardMovementPanel';

type ZoneFilter = 'all' | ZoneKey;
type QuickStatusFilter = 'all' | 'pending' | 'allergy' | 'bd' | 'npo';

interface UndoSnapshot {
  meal: MealKey;
  entries: { bedId: string; prevOrder: MealOrder }[];
}

const STORAGE_KEY = 'ward_meal_beds_v2';
const MOVEMENTS_STORAGE_KEY = 'ward_meal_movements_v1';

function loadInitialBeds(): BedPatient[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as BedPatient[];
      }
    }
  } catch {
    // Fallback to initial seed data
  }
  return buildInitialWardData();
}

function loadInitialMovements(): WardMovementRecord[] {
  try {
    const raw = localStorage.getItem(MOVEMENTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed as WardMovementRecord[];
      }
    }
  } catch {
    // Fallback to initial seed movements
  }
  return buildInitialMovements();
}

export default function App() {
  const [beds, setBeds] = useState<BedPatient[]>(() => loadInitialBeds());
  const [movements, setMovements] = useState<WardMovementRecord[]>(() =>
    loadInitialMovements()
  );
  const [role, setRole] = useState<Role>('nurse');
  const [meal, setMeal] = useState<MealKey>('l');
  const [zoneFilter, setZoneFilter] = useState<ZoneFilter>('all');
  const [quickFilter, setQuickFilter] = useState<QuickStatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Active modals
  const [activeBedId, setActiveBedId] = useState<string | null>(null);
  const [stickerBedId, setStickerBedId] = useState<string | null>(null);
  const [labelBedIds, setLabelBedIds] = useState<string[] | null>(null);
  const [notifyBedId, setNotifyBedId] = useState<string | null>(null);

  // Kitchen -> Nurse messages
  const [messages, setMessages] = useState<KitchenMessage[]>([]);
  const [showMessages, setShowMessages] = useState(false);

  // Toast & Undo
  const [toast, setToast] = useState<{ text: string; undo?: UndoSnapshot } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(beds));
    } catch {
      // Ignore storage quota warnings
    }
  }, [beds]);

  useEffect(() => {
    try {
      localStorage.setItem(MOVEMENTS_STORAGE_KEY, JSON.stringify(movements));
    } catch {
      // Ignore storage quota warnings
    }
  }, [movements]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(
      () => setToast(null),
      toast.undo ? 6500 : 3200
    );
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveBedId(null);
        setStickerBedId(null);
        setLabelBedIds(null);
        setNotifyBedId(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const todayDisplay = useMemo(
    () =>
      new Date().toLocaleDateString('th-TH', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    []
  );

  const countByZone = (zone?: ZoneKey) => {
    const scope = beds.filter((b) => !zone || b.zone === zone);
    const occupied = scope.filter((b) => b.occ && b.diet && b.orders);
    const needOrder = occupied.filter((b) => b.diet!.tex !== 'npo');
    const done = needOrder.filter(
      (b) => (b.orders![meal]?.st ?? 'none') !== 'none'
    ).length;
    const npo = occupied.filter((b) => b.diet!.tex === 'npo').length;
    return {
      totalBeds: scope.length,
      occupied: occupied.length,
      need: needOrder.length,
      done,
      pending: needOrder.length - done,
      npo,
    };
  };

  const overallCounts = countByZone();
  const genCounts = countByZone('gen');
  const spCounts = countByZone('sp');
  const isoCounts = countByZone('iso');

  const currentMealMeta = MEALS.find((m) => m.k === meal)!;
  const unreadCount = messages.filter((m) => !m.read).length;

  const filteredBeds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return beds.filter((bed) => {
      if (zoneFilter !== 'all' && bed.zone !== zoneFilter) return false;

      if (quickFilter !== 'all') {
        if (!bed.occ || !bed.diet || !bed.orders) return false;
        const ord = bed.orders[meal] ?? createDefaultOrder();
        if (quickFilter === 'pending') {
          if (bed.diet.tex === 'npo' || ord.st !== 'none') return false;
        } else if (quickFilter === 'allergy') {
          if (!bed.allergy) return false;
        } else if (quickFilter === 'bd') {
          if (bed.diet.tex !== 'bd') return false;
        } else if (quickFilter === 'npo') {
          if (bed.diet.tex !== 'npo') return false;
        }
      }

      if (q) {
        if (!bed.occ) {
          return bed.label.toLowerCase().includes(q);
        }
        return (
          bed.label.toLowerCase().includes(q) ||
          (bed.name ?? '').toLowerCase().includes(q) ||
          (bed.hn ?? '').includes(q)
        );
      }

      return true;
    });
  }, [beds, zoneFilter, quickFilter, searchQuery, meal]);

  const handleOrderAll = () => {
    if (isLocked) return;
    const snapshotEntries: { bedId: string; prevOrder: MealOrder }[] = [];
    let orderedCount = 0;
    let skippedCount = 0;
    const nowTime = formatTimeNow();
    const mealName = getMealName(meal);

    setBeds((prev) =>
      prev.map((bed) => {
        if (!bed.occ || !bed.diet || !bed.orders) return bed;
        if (bed.diet.tex === 'npo') return bed;
        const currOrder = bed.orders[meal] ?? createDefaultOrder();
        if (currOrder.st !== 'none') return bed;

        if (bed.diet.tex === 'bd') {
          const tb = bed.diet.tube;
          if (!(Number(tb.vol) > 0 && Number(tb.times) > 0)) {
            skippedCount++;
            return bed;
          }
        }

        snapshotEntries.push({
          bedId: bed.id,
          prevOrder: JSON.parse(JSON.stringify(currOrder)),
        });

        const nextOrder: MealOrder = {
          ...createDefaultOrder(),
          st: 'ordered',
          rice: isRiceAllowed(bed.diet)
            ? bed.diet.tex === 'normal'
              ? 'rice'
              : 'porridge'
            : null,
        };
        orderedCount++;

        return {
          ...bed,
          orders: { ...bed.orders, [meal]: nextOrder },
          log: [
            ...(bed.log ?? []),
            { t: nowTime, u: 'พย.สมใจ', x: `สั่งอาหารตามแผนแพทย์ (${mealName})` },
          ],
        };
      })
    );

    if (orderedCount === 0) {
      setToast({
        text:
          skippedCount > 0
            ? `ไม่สามารถสั่งอัตโนมัติได้ ${skippedCount} เตียงเนื่องจากข้อมูล BD ไม่ครบถ้วน`
            : 'เตียงที่มีคำสั่งอาหารครบทั้งหมดแล้ว ไม่มีเตียงที่ต้องสั่งเพิ่ม',
      });
      return;
    }

    setToast({
      text: `ยืนยันสั่งอาหารแล้ว ${orderedCount} เตียง${
        skippedCount > 0 ? ` · ข้าม ${skippedCount} เตียงที่ข้อมูลไม่ครบ` : ''
      }`,
      undo: { meal, entries: snapshotEntries },
    });
  };

  const handleUndoOrderAll = (snapshot: UndoSnapshot) => {
    const map = new Map(snapshot.entries.map((e) => [e.bedId, e.prevOrder]));
    setBeds((prev) =>
      prev.map((bed) => {
        const oldOrder = map.get(bed.id);
        if (!oldOrder || !bed.orders) return bed;
        return {
          ...bed,
          orders: { ...bed.orders, [snapshot.meal]: oldOrder },
        };
      })
    );
    setToast({ text: 'ย้อนกลับรายการสั่งทั้งหมดเรียบร้อยแล้ว' });
  };

  const handleSaveSheet = (payload: {
    bedId: string;
    diet: DietOrder;
    allergy: string;
    iso?: IsolationInfo;
    order: MealOrder;
    urgentReason: string;
    dietChanged: boolean;
  }) => {
    const nowTime = formatTimeNow();
    const mealName = getMealName(meal);
    let toastMessage = '';

    setBeds((prev) =>
      prev.map((bed) => {
        if (bed.id !== payload.bedId || !bed.diet || !bed.orders) return bed;

        const prevOrder = bed.orders[meal] ?? createDefaultOrder();
        const hadExisting = prevOrder.st !== 'none';
        const nextLogs = [...(bed.log ?? [])];

        if (payload.dietChanged) {
          nextLogs.push({
            t: nowTime,
            u: 'พย.สมใจ',
            x: `เปลี่ยนแผนอาหาร ${getDietShortSummary(bed.diet)} → ${getDietShortSummary(
              payload.diet
            )} (${payload.diet.doctor})`,
          });
        }

        const sanitizedOrder = { ...payload.order };
        if (!isRiceAllowed(payload.diet)) {
          sanitizedOrder.rice = null;
        } else if (
          !sanitizedOrder.rice ||
          (payload.diet.tex === 'normal' && sanitizedOrder.rice === 'congee') ||
          (payload.diet.tex === 'soft' && sanitizedOrder.rice === 'rice')
        ) {
          sanitizedOrder.rice = payload.diet.tex === 'normal' ? 'rice' : 'porridge';
        }

        if (payload.diet.tex === 'npo') {
          nextLogs.push({
            t: nowTime,
            u: 'พย.สมใจ',
            x: `บันทึกงดอาหารและน้ำ (NPO) ${mealName}`,
          });
          toastMessage = `บันทึกงดอาหาร (NPO) ${
            bed.zone === 'gen' ? `เตียง ${bed.label}` : bed.label
          } เรียบร้อยแล้ว`;
          return {
            ...bed,
            diet: payload.diet,
            allergy: payload.allergy,
            iso: payload.iso ?? bed.iso,
            orders: {
              ...bed.orders,
              [meal]: { ...createDefaultOrder(), st: 'none', changed: hadExisting },
            },
            log: nextLogs,
          };
        }

        const keepDelivered = ['sent', 'left'].includes(prevOrder.st);
        const orderContentChanged =
          sanitizedOrder.rice !== prevOrder.rice ||
          sanitizedOrder.portion !== prevOrder.portion ||
          sanitizedOrder.note !== prevOrder.note ||
          sanitizedOrder.rel !== prevOrder.rel;

        const isChangedFlag = hadExisting && (payload.dietChanged || orderContentChanged);

        const nextOrder: MealOrder = {
          ...sanitizedOrder,
          st: hadExisting ? (keepDelivered ? prevOrder.st : 'ordered') : 'ordered',
          changed: isChangedFlag,
          urgent: isLocked,
        };

        nextLogs.push({
          t: nowTime,
          u: 'พย.สมใจ',
          x: `${hadExisting ? 'แก้ไขออเดอร์' : 'สั่งอาหาร'}${mealName}${
            isLocked ? ` (แก้ไขด่วน: ${payload.urgentReason})` : ''
          }`,
        });

        toastMessage = `${hadExisting ? 'บันทึกการแก้ไข' : 'สั่งอาหาร'}${
          bed.zone === 'gen' ? `เตียง ${bed.label}` : bed.label
        } เรียบร้อยแล้ว${isChangedFlag ? ' · แจ้งเตือนห้องครัวแล้ว' : ''}`;

        return {
          ...bed,
          diet: payload.diet,
          allergy: payload.allergy,
          iso: payload.iso ?? bed.iso,
          orders: { ...bed.orders, [meal]: nextOrder },
          log: nextLogs,
        };
      })
    );

    setActiveBedId(null);
    if (toastMessage) setToast({ text: toastMessage });
  };

  const handleCancelOrder = (bedId: string) => {
    const nowTime = formatTimeNow();
    const mealName = getMealName(meal);
    let bedLabel = '';

    setBeds((prev) =>
      prev.map((bed) => {
        if (bed.id !== bedId || !bed.orders) return bed;
        bedLabel = bed.zone === 'gen' ? `เตียง ${bed.label}` : bed.label;
        return {
          ...bed,
          orders: { ...bed.orders, [meal]: createDefaultOrder() },
          log: [
            ...(bed.log ?? []),
            { t: nowTime, u: 'พย.สมใจ', x: `ยกเลิกออเดอร์${mealName}` },
          ],
        };
      })
    );

    setActiveBedId(null);
    setToast({ text: `ยกเลิกออเดอร์${bedLabel} (${mealName}) แล้ว` });
  };

  const handleAdvanceKitchenStatus = (bedId: string) => {
    setBeds((prev) =>
      prev.map((bed) => {
        if (bed.id !== bedId || !bed.orders) return bed;
        const curr = bed.orders[meal] ?? createDefaultOrder();
        const nextSt =
          curr.st === 'ordered'
            ? 'prep'
            : curr.st === 'prep'
              ? 'sent'
              : curr.st === 'sent' && bed.zone === 'iso'
                ? 'left'
                : null;
        if (!nextSt) return bed;
        return {
          ...bed,
          orders: {
            ...bed.orders,
            [meal]: { ...curr, st: nextSt, changed: false },
          },
        };
      })
    );
  };

  const handleSendKitchenMessage = (bedLabel: string, text: string) => {
    setMessages((prev) => [
      {
        id: `${Date.now()}`,
        bed: bedLabel,
        text,
        time: formatTimeNow(),
        read: false,
      },
      ...prev,
    ]);
    setNotifyBedId(null);
    setToast({ text: `ส่งข้อความแจ้งพยาบาล (${bedLabel}) เรียบร้อยแล้ว` });
  };

  const handleOpenBed = (bedId: string) => {
    const target = beds.find((b) => b.id === bedId);
    if (!target) return;
    if (!target.occ) {
      setStickerBedId(bedId);
      return;
    }
    setActiveBedId(bedId);
  };

  const handleOpenStickerOnNextVacant = (preferredBedId?: string) => {
    if (preferredBedId) {
      const target = beds.find((b) => b.id === preferredBedId && !b.occ);
      if (target) {
        setStickerBedId(target.id);
        return;
      }
    }
    const firstVacant = beds.find(
      (b) => !b.occ && (zoneFilter === 'all' || b.zone === zoneFilter)
    );
    if (!firstVacant) {
      setToast({ text: 'ไม่มีเตียงว่างในโซนที่เลือก แตะที่เตียงเดิมเพื่อถ่ายภาพสติกเกอร์ได้ทันที' });
      return;
    }
    setStickerBedId(firstVacant.id);
  };

  const handleDischargePatient = (bedId: string) => {
    const target = beds.find((b) => b.id === bedId);
    if (!target || !target.occ) return;

    const nowTime = `${formatTimeNow()} น.`;
    const displayLabel = target.zone === 'gen' ? `เตียง ${target.label}` : target.label;

    const record: WardMovementRecord = {
      id: `mv-dc-${Date.now()}`,
      type: 'discharged',
      bedId: target.id,
      bedLabel: target.label,
      zone: target.zone,
      name: target.name ?? 'ไม่ระบุชื่อ',
      hn: target.hn ?? '–',
      age: target.age,
      dx: target.dx,
      dietSummary: target.diet ? getDietShortSummary(target.diet) : undefined,
      time: nowTime,
      by: 'พย.สมใจ',
      stickerImage: target.stickerImage,
      note: 'จำหน่ายกลับบ้านแล้ว · ยกเลิกมื้อคงค้างและคืนเตียงว่าง',
    };

    setMovements((prev) => [record, ...prev]);
    setBeds((prev) =>
      prev.map((bed) => {
        if (bed.id !== bedId) return bed;
        return {
          id: bed.id,
          zone: bed.zone,
          label: bed.label,
          occ: false,
          room: bed.room,
        };
      })
    );

    setActiveBedId(null);
    setToast({
      text: `จำหน่ายผู้ป่วย ${target.name} (${displayLabel}) กลับบ้านแล้ว`,
    });
  };

  const handleConfirmSticker = (payload: {
    bedId: string;
    stickerImage: string;
  }) => {
    const nowTime = formatTimeNow();
    const today = formatTodayThai();
    const targetBed = beds.find((b) => b.id === payload.bedId);
    const wasVacant = Boolean(targetBed && !targetBed.occ);
    const displayLabel = targetBed
      ? targetBed.zone === 'gen'
        ? `เตียง ${targetBed.label}`
        : targetBed.label
      : '';

    if (wasVacant && targetBed) {
      const admitRecord: WardMovementRecord = {
        id: `mv-adm-${Date.now()}`,
        type: 'admitted',
        bedId: targetBed.id,
        bedLabel: targetBed.label,
        zone: targetBed.zone,
        name: `ผู้ป่วย (ภาพสติกเกอร์ ${displayLabel})`,
        hn: 'ดูจากภาพสติกเกอร์',
        dx: 'ดูจากภาพสติกเกอร์',
        dietSummary: 'ปกติ',
        time: `${nowTime} น.`,
        by: 'พย.สมใจ',
        stickerImage: payload.stickerImage,
        note: 'บันทึกภาพสติกเกอร์และส่งต่องานโภชนาการแล้ว',
      };
      setMovements((prev) => [admitRecord, ...prev]);
    }

    setBeds((prev) =>
      prev.map((bed) => {
        if (bed.id !== payload.bedId) return bed;

        if (!bed.occ) {
          const defaultDiet: DietOrder = {
            tex: 'normal',
            restr: [],
            doctor: 'แพทย์เวรประจำหอผู้ป่วย',
            date: today,
            tube: {
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

          return {
            ...bed,
            occ: true,
            isNewAdmit: true,
            name: `ผู้ป่วย (ภาพสติกเกอร์ ${displayLabel})`,
            hn: 'ดูจากภาพสติกเกอร์',
            dx: 'ดูจากภาพสติกเกอร์',
            allergy: '',
            iso:
              bed.zone === 'iso'
                ? bed.iso ?? { type: 'contact', start: today }
                : bed.iso,
            diet: defaultDiet,
            orders: {
              m: createDefaultOrder(),
              l: createDefaultOrder(),
              d: createDefaultOrder(),
            },
            stickerImage: payload.stickerImage,
            stickerCapturedAt: `${today} ${nowTime} น.`,
            log: [
              {
                t: nowTime,
                u: 'พย.สมใจ',
                x: 'รับผู้ป่วยเข้าเตียงด้วยภาพสติกเกอร์ และส่งต่องานโภชนาการ',
              },
            ],
          };
        }

        return {
          ...bed,
          stickerImage: payload.stickerImage,
          stickerCapturedAt: `${today} ${nowTime} น.`,
          log: [
            ...(bed.log ?? []),
            {
              t: nowTime,
              u: 'พย.สมใจ',
              x: 'บันทึกภาพสติกเกอร์ผู้ป่วยและส่งต่องานโภชนาการ',
            },
          ],
        };
      })
    );

    setStickerBedId(null);
    if (wasVacant) {
      setActiveBedId(payload.bedId);
      setToast({
        text: `บันทึกภาพสติกเกอร์เข้า${displayLabel}และส่งต่องานโภชนาการแล้ว — เลือกแผนอาหารต่อได้ทันที`,
      });
    } else {
      setToast({
        text: `บันทึกภาพสติกเกอร์${displayLabel}และส่งต่อฝ่ายโภชนาการเรียบร้อยแล้ว`,
      });
    }
  };

  const activeBed = useMemo(
    () => beds.find((b) => b.id === activeBedId) ?? null,
    [beds, activeBedId]
  );

  const stickerBed = useMemo(
    () => beds.find((b) => b.id === stickerBedId) ?? null,
    [beds, stickerBedId]
  );

  const labelBeds = useMemo(() => {
    if (!labelBedIds) return [];
    const set = new Set(labelBedIds);
    return beds.filter((b) => set.has(b.id));
  }, [beds, labelBedIds]);

  const notifyBed = useMemo(
    () => beds.find((b) => b.id === notifyBedId) ?? null,
    [beds, notifyBedId]
  );

  const zonesToRender: ZoneKey[] =
    zoneFilter === 'all' ? ['gen', 'sp', 'iso'] : [zoneFilter];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-[#0b1117] dark:text-slate-100">
      {/* Top Bar Contract: Brand wordmark — Role Switch — Theme Toggle */}
      <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm dark:border-slate-800 dark:bg-[#0f1722]/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          {/* Zone 1: Single clean wordmark */}
          <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-white dark:bg-teal-600">
              <UtensilsCrossed className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-base font-bold tracking-tight text-slate-900 sm:text-lg dark:text-slate-100">
              โภชนาการผู้ป่วยใน
            </span>
          </div>

          {/* Zone 2: Role Segmented Control */}
          <div
            className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
            role="tablist"
            aria-label="สลับบทบาทการทำงาน"
          >
            <button
              type="button"
              role="tab"
              aria-selected={role === 'nurse'}
              onClick={() => {
                setRole('nurse');
                setLabelBedIds(null);
                setNotifyBedId(null);
              }}
              className={`min-h-[36px] rounded-lg px-3.5 text-xs font-bold whitespace-nowrap transition-colors sm:px-4 sm:text-sm ${
                role === 'nurse'
                  ? 'bg-white text-teal-800 shadow-xs dark:bg-slate-900 dark:text-teal-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              งานพยาบาล
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={role === 'kitchen'}
              onClick={() => {
                setRole('kitchen');
                setActiveBedId(null);
              }}
              className={`min-h-[36px] rounded-lg px-3.5 text-xs font-bold whitespace-nowrap transition-colors sm:px-4 sm:text-sm ${
                role === 'kitchen'
                  ? 'bg-white text-teal-800 shadow-xs dark:bg-slate-900 dark:text-teal-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              ฝ่ายโภชนาการ
            </button>
          </div>

          {/* Zone 3: Theme Toggle */}
          <button
            type="button"
            onClick={() => setIsDark((d) => !d)}
            aria-label={isDark ? 'สลับเป็นโหมดสว่าง' : 'สลับเป็นโหมดกลางคืน'}
            className="inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 whitespace-nowrap transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {isDark ? (
              <>
                <Sun className="h-4 w-4 text-amber-400" aria-hidden="true" />
                <span className="hidden sm:inline">โหมดกลางวัน</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-slate-600" aria-hidden="true" />
                <span className="hidden sm:inline">โหมดกลางคืน</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="no-print mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Workspace Context & Meal Selector */}
        <div className="mb-6 flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end dark:border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>หอผู้ป่วยอายุรกรรม 4</span>
              <span aria-hidden="true">·</span>
              <span>{todayDisplay}</span>
              <span aria-hidden="true">·</span>
              <span>
                {role === 'nurse'
                  ? 'มุมมองพยาบาล (สั่งและปรับแผนอาหาร)'
                  : 'มุมมองห้องครัว (สรุปยอดและจัดเตรียมถาด)'}
              </span>
            </div>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-100">
              {role === 'nurse'
                ? 'แผนผังเตียงและการสั่งอาหารผู้ป่วย'
                : 'ระบบจัดเตรียมถาดและสรุปยอดผลิตอาหาร'}
            </h1>
          </div>

          {/* Meal Tabs */}
          <div
            className="flex flex-wrap items-center gap-2"
            role="tablist"
            aria-label="เลือกมื้ออาหาร"
          >
            {MEALS.map((m) => {
              const active = meal === m.k;
              return (
                <button
                  key={m.k}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setMeal(m.k)}
                  className={`flex min-h-[46px] flex-col items-start justify-center rounded-xl border px-4 py-1.5 text-left transition-colors ${
                    active
                      ? 'border-teal-700 bg-teal-700 text-white dark:border-teal-600 dark:bg-teal-600'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="text-sm font-bold leading-tight">{m.n}</span>
                  <span
                    className={`font-mono-num text-[11px] leading-tight ${
                      active
                        ? 'text-teal-100'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    ปิดรับ {m.cut}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {role === 'nurse' ? (
          <div className="space-y-6">
            {/* Unread Kitchen Messages Banner */}
            {(unreadCount > 0 || showMessages) && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 dark:border-rose-900/60 dark:bg-rose-950/30">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-rose-900 dark:text-rose-200">
                    <MessageSquareWarning className="h-4 w-4 text-rose-600 dark:text-rose-400" aria-hidden="true" />
                    <span>ข้อความจากฝ่ายโภชนาการ ({unreadCount} รายการใหม่)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowMessages((s) => !s)}
                      className="min-h-[34px] rounded-lg border border-rose-300 bg-white px-3 text-xs font-semibold text-rose-800 hover:bg-rose-50 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-300"
                    >
                      {showMessages ? 'ซ่อนข้อความ' : 'เปิดอ่านข้อความ'}
                    </button>
                  </div>
                </div>

                {showMessages && (
                  <div className="mt-3 space-y-2 border-t border-rose-200 pt-3 dark:border-rose-900/60">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className="flex flex-wrap items-baseline gap-2 text-xs text-rose-950 dark:text-rose-200"
                      >
                        <span className="font-mono-num font-bold">
                          {msg.bed.startsWith('ห้อง') ? msg.bed : `เตียง ${msg.bed}`}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-num text-rose-700 dark:text-rose-400">
                          {msg.time} น.
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{msg.text}</span>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setMessages((prev) => prev.map((m) => ({ ...m, read: true })));
                        setShowMessages(false);
                      }}
                      className="mt-2 min-h-[34px] rounded-lg bg-rose-700 px-3.5 text-xs font-semibold text-white hover:bg-rose-800"
                    >
                      รับทราบข้อความทั้งหมด
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Ward Summary Strip */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    ความคืบหน้าการสั่งอาหาร ({currentMealMeta.n})
                  </span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                </div>
                <div className="font-mono-num mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {overallCounts.done}/{overallCounts.need}{' '}
                  <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                    เตียง
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  สามัญ {genCounts.done}/{genCounts.need} · พิเศษ {spCounts.done}/
                  {spCounts.need} · แยกโรค {isoCounts.done}/{isoCounts.need}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    เตียงที่รอสั่งอาหาร
                  </span>
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                </div>
                <div className="font-mono-num mt-1 text-2xl font-bold text-amber-700 dark:text-amber-400">
                  {overallCounts.pending}{' '}
                  <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                    เตียง
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  ปิดรับคำสั่งรอบปกติเวลา {currentMealMeta.cut}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    ผู้ป่วยงดอาหาร (NPO) และเตียงว่าง
                  </span>
                  <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" aria-hidden="true" />
                </div>
                <div className="font-mono-num mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {overallCounts.npo}{' '}
                  <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                    NPO · ครองเตียง {overallCounts.occupied}/{overallCounts.totalBeds}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  เตียง NPO ระบบจะแจ้งห้องครัวอัตโนมัติว่าไม่ต้องจัดถาด
                </div>
              </div>
            </div>

            {/* ช่องข้อมูลผู้ป่วยรับเข้าใหม่ และ ผู้ป่วยกลับบ้านแล้ว */}
            <WardMovementPanel
              movements={movements}
              beds={beds}
              onOpenBedOrder={(bedId) => setActiveBedId(bedId)}
              onStartNewAdmit={(bedId) => handleOpenStickerOnNextVacant(bedId)}
            />

            {/* Post-Cutoff Notice Banner */}
            {isLocked && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-200">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
                  <span>
                    <strong className="font-bold">เลยเวลาตัดรอบรับออเดอร์ ({currentMealMeta.cut}) แล้ว:</strong>{' '}
                    ปิดปุ่มสั่งแบบกลุ่ม สามารถกดรายเตียงเพื่อส่งคำสั่ง “แก้ไขด่วน” พร้อมระบุเหตุผลถึงห้องครัวได้
                  </span>
                </div>
              </div>
            )}

            {/* Filter & Action Toolbar */}
            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-center gap-2">
                {/* Zone Segmented Filter */}
                <div
                  className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
                  role="group"
                  aria-label="กรองตามโซนหอผู้ป่วย"
                >
                  {(
                    [
                      ['all', 'ทุกโซน'],
                      ['gen', 'สามัญ'],
                      ['sp', 'ห้องพิเศษ'],
                      ['iso', 'แยกโรค'],
                    ] as const
                  ).map(([zKey, zLabel]) => (
                    <button
                      key={zKey}
                      type="button"
                      onClick={() => setZoneFilter(zKey)}
                      className={`min-h-[34px] rounded-md px-3 text-xs font-semibold whitespace-nowrap transition-colors ${
                        zoneFilter === zKey
                          ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                      }`}
                    >
                      {zLabel}
                    </button>
                  ))}
                </div>

                {/* Clinical Quick Filter */}
                <div
                  className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
                  role="group"
                  aria-label="กรองตามสถานะทางคลินิก"
                >
                  {(
                    [
                      ['all', 'ทุกสถานะ'],
                      ['pending', 'รอสั่ง'],
                      ['allergy', 'แพ้อาหาร'],
                      ['bd', 'สายยาง BD'],
                      ['npo', 'งดอาหาร'],
                    ] as const
                  ).map(([qKey, qLabel]) => (
                    <button
                      key={qKey}
                      type="button"
                      onClick={() => setQuickFilter(qKey)}
                      className={`min-h-[34px] rounded-md px-2.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                        quickFilter === qKey
                          ? 'bg-white text-teal-800 shadow-xs dark:bg-slate-900 dark:text-teal-400'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                      }`}
                    >
                      {qLabel}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative flex-1 sm:flex-initial">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาเตียง, ชื่อผู้ป่วย, HN..."
                    className="min-h-[40px] w-full rounded-xl border border-slate-200 bg-slate-50 pr-3 pl-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none sm:w-48 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>

                {/* Quick Sticker Capture CTA */}
                <button
                  type="button"
                  onClick={() => handleOpenStickerOnNextVacant()}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-teal-700/30 bg-teal-50 px-3.5 text-xs font-bold text-teal-800 whitespace-nowrap transition-colors hover:bg-teal-100 dark:border-teal-500/40 dark:bg-teal-950/50 dark:text-teal-300 dark:hover:bg-teal-900/60"
                >
                  <Camera className="h-4 w-4" aria-hidden="true" />
                  <span>ถ่ายสติกเกอร์รับผู้ป่วย</span>
                </button>

                {/* Primary Batch CTA */}
                <button
                  type="button"
                  disabled={isLocked || overallCounts.pending === 0}
                  onClick={handleOrderAll}
                  className="min-h-[40px] rounded-xl bg-teal-700 px-4 text-xs font-bold text-white whitespace-nowrap transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-teal-600 dark:hover:bg-teal-500"
                >
                  สั่งทั้งหมดตามแผนแพทย์
                </button>
              </div>
            </div>

            {/* Ward Bed Grids */}
            {filteredBeds.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-12 text-center dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  ไม่พบข้อมูลเตียงหรือผู้ป่วยที่ตรงกับตัวกรองปัจจุบัน
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setZoneFilter('all');
                    setQuickFilter('all');
                    setSearchQuery('');
                  }}
                  className="mt-3 min-h-[38px] rounded-lg border border-slate-200 px-4 text-xs font-semibold text-teal-700 hover:bg-slate-50 dark:border-slate-700 dark:text-teal-400 dark:hover:bg-slate-800"
                >
                  ล้างตัวกรองทั้งหมด
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {zonesToRender.map((zKey) => {
                  const zoneBeds = filteredBeds.filter((b) => b.zone === zKey);
                  if (zoneBeds.length === 0) return null;
                  const meta = ZONE_INFO[zKey];
                  const counts =
                    zKey === 'gen'
                      ? genCounts
                      : zKey === 'sp'
                        ? spCounts
                        : isoCounts;

                  return (
                    <section key={zKey} aria-labelledby={`zone-${zKey}`}>
                      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 pb-2 dark:border-slate-800">
                        <div className="flex flex-wrap items-baseline gap-2.5">
                          <h2
                            id={`zone-${zKey}`}
                            className={`text-base font-bold ${
                              zKey === 'sp'
                                ? 'text-amber-800 dark:text-amber-400'
                                : zKey === 'iso'
                                  ? 'text-violet-800 dark:text-violet-400'
                                  : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {meta.title}
                          </h2>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {meta.subtitle}
                          </span>
                        </div>
                        <div className="font-mono-num text-xs font-medium text-slate-600 dark:text-slate-400">
                          สั่งแล้ว {counts.done}/{counts.need} · ครองเตียง{' '}
                          {counts.occupied}/{counts.totalBeds}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                        {zoneBeds.map((bed) => (
                          <BedCard
                            key={bed.id}
                            bed={bed}
                            meal={meal}
                            onOpen={handleOpenBed}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}

            {/* Legend & Simulation Controls */}
            <footer className="space-y-3 border-t border-slate-200 pt-5 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded border border-emerald-400 bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950" />
                  สั่งอาหารแล้ว / ส่งแล้ว
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded border border-amber-400 bg-amber-100 dark:border-amber-700 dark:bg-amber-950" />
                  รอสั่งอาหาร
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded border border-blue-400 bg-blue-100 dark:border-blue-700 dark:bg-blue-950" />
                  ห้องครัวกำลังจัดเตรียม
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded border border-rose-400 bg-rose-100 dark:border-rose-700 dark:bg-rose-950" />
                  งดอาหาร (NPO)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded border border-dashed border-slate-400 bg-slate-100 dark:border-slate-600 dark:bg-slate-800" />
                  เตียงว่าง
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 bg-white/60 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-900/50">
                <span>
                  บันทึกภาพสติกเกอร์และสถานะไว้ในอุปกรณ์อัตโนมัติ (ข้อมูลตั้งต้นเป็นตัวอย่างสำหรับทดสอบระบบ)
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const freshBeds = buildInitialWardData();
                      const freshMovements = buildInitialMovements();
                      setBeds(freshBeds);
                      setMovements(freshMovements);
                      try {
                        localStorage.removeItem(STORAGE_KEY);
                        localStorage.removeItem(MOVEMENTS_STORAGE_KEY);
                      } catch {
                        // ignore
                      }
                      setToast({ text: 'รีเซ็ตข้อมูลหอผู้ป่วยกลับสู่ค่าเริ่มต้นแล้ว' });
                    }}
                    className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>รีเซ็ตข้อมูลตัวอย่าง</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLocked((l) => !l)}
                    className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    {isLocked ? (
                      <>
                        <LockOpen className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                        <span>สลับเป็นก่อนเวลาตัดรอบ</span>
                      </>
                    ) : (
                      <>
                        <Lock className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                        <span>จำลองเลยเวลาตัดรอบ ({currentMealMeta.cut})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </footer>
          </div>
        ) : (
          <KitchenView
            beds={beds}
            movements={movements}
            meal={meal}
            onAdvanceStatus={handleAdvanceKitchenStatus}
            onOpenLabels={(ids) => setLabelBedIds(ids)}
            onOpenNotify={(id) => setNotifyBedId(id)}
          />
        )}
      </main>

      {/* Modals */}
      {activeBed && (
        <PatientOrderSheet
          bed={activeBed}
          meal={meal}
          isLocked={isLocked}
          onClose={() => setActiveBedId(null)}
          onSave={handleSaveSheet}
          onCancelOrder={handleCancelOrder}
          onOpenStickerCapture={(bedId) => {
            setActiveBedId(null);
            setStickerBedId(bedId);
          }}
          onDischargePatient={handleDischargePatient}
        />
      )}

      {stickerBed && (
        <StickerCaptureModal
          bed={stickerBed}
          onClose={() => setStickerBedId(null)}
          onConfirm={handleConfirmSticker}
        />
      )}

      {labelBedIds && labelBeds.length > 0 && (
        <TrayLabelsModal
          beds={labelBeds}
          meal={meal}
          onClose={() => setLabelBedIds(null)}
        />
      )}

      {notifyBed && (
        <NotifyNurseModal
          bed={notifyBed}
          onClose={() => setNotifyBedId(null)}
          onSend={handleSendKitchenMessage}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          className="no-print fixed bottom-5 left-1/2 z-50 flex max-w-[92vw] -translate-x-1/2 items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl dark:bg-slate-100 dark:text-slate-900"
        >
          <span>{toast.text}</span>
          {toast.undo && (
            <button
              type="button"
              onClick={() => handleUndoOrderAll(toast.undo!)}
              className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-white/25 px-2.5 text-xs font-bold hover:bg-white/10 dark:border-slate-900/25 dark:hover:bg-slate-900/10"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>ย้อนกลับ</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
