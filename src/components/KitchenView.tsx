import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  Maximize2,
  MessageSquarePlus,
  Printer,
  Search,
  ShieldAlert,
  Tag,
  UserPlus,
  X,
} from 'lucide-react';
import type {
  BedPatient,
  MealKey,
  OrderStatus,
  WardMovementRecord,
  ZoneKey,
} from '../types/hospital';
import {
  createDefaultOrder,
  getKitchenDietTitle,
  getMealName,
  getRiceLabel,
  ISOLATION_TYPES,
  STATUS_LABELS,
} from '../data/mockWardData';

interface KitchenViewProps {
  beds: BedPatient[];
  movements: WardMovementRecord[];
  meal: MealKey;
  onAdvanceStatus: (bedId: string) => void;
  onOpenLabels: (bedIds: string[]) => void;
  onOpenNotify: (bedId: string) => void;
}

type KitchenFilter = 'all' | 'ordered' | 'prep' | 'done';

const ZONE_SECTIONS: { key: ZoneKey; title: string; subtitle: string }[] = [
  { key: 'gen', title: 'หอผู้ป่วยสามัญ', subtitle: 'จัดเรียงตามลำดับเตียง' },
  { key: 'sp', title: 'ห้องพิเศษและห้องเดี่ยว', subtitle: 'จัดส่งถึงห้องผู้ป่วยโดยตรง' },
  {
    key: 'iso',
    title: 'ห้องแยกโรค (Isolation)',
    subtitle: 'ส่งเป็นลำดับสุดท้าย · ใช้ภาชนะใช้ครั้งเดียวทิ้ง',
  },
];

export const KitchenView: React.FC<KitchenViewProps> = ({
  beds,
  movements,
  meal,
  onAdvanceStatus,
  onOpenLabels,
  onOpenNotify,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<KitchenFilter>('all');
  const [stickerPreview, setStickerPreview] = useState<{
    src: string;
    title: string;
  } | null>(null);

  const occupiedBeds = useMemo(() => beds.filter((b) => b.occ && b.diet && b.orders), [beds]);

  const orderedTrays = useMemo(() => {
    const zoneOrder: Record<ZoneKey, number> = { gen: 0, sp: 1, iso: 2 };
    return occupiedBeds
      .filter((b) => b.diet!.tex !== 'npo' && (b.orders![meal]?.st ?? 'none') !== 'none')
      .sort((a, b) => zoneOrder[a.zone] - zoneOrder[b.zone]);
  }, [occupiedBeds, meal]);

  const npoBeds = useMemo(
    () => occupiedBeds.filter((b) => b.diet!.tex === 'npo'),
    [occupiedBeds]
  );

  const pendingNurseBeds = useMemo(
    () =>
      occupiedBeds.filter(
        (b) => b.diet!.tex !== 'npo' && (b.orders![meal]?.st ?? 'none') === 'none'
      ),
    [occupiedBeds, meal]
  );

  const changedBeds = useMemo(
    () => orderedTrays.filter((b) => b.orders![meal]?.changed),
    [orderedTrays, meal]
  );

  const allergyBeds = useMemo(
    () => orderedTrays.filter((b) => Boolean(b.allergy)),
    [orderedTrays]
  );

  const kpis = useMemo(() => {
    const done = orderedTrays.filter((b) =>
      ['sent', 'left'].includes(b.orders![meal].st)
    ).length;
    const relatives = orderedTrays.reduce(
      (sum, b) => sum + (b.orders![meal].rel || 0),
      0
    );
    const isoCount = orderedTrays.filter((b) => b.zone === 'iso').length;
    return { total: orderedTrays.length, done, relatives, isoCount };
  }, [orderedTrays, meal]);

  const summaryRows = useMemo(() => {
    const groups: Record<string, { gen: number; sp: number; iso: number }> = {};
    for (const bed of orderedTrays) {
      const title = getKitchenDietTitle(bed.diet!);
      if (!groups[title]) {
        groups[title] = { gen: 0, sp: 0, iso: 0 };
      }
      groups[title][bed.zone]++;
    }
    return Object.entries(groups).sort(([a], [b]) => {
      const aBd = a.includes('(BD)') ? 1 : 0;
      const bBd = b.includes('(BD)') ? 1 : 0;
      if (aBd !== bBd) return bBd - aBd;
      return a.localeCompare(b, 'th');
    });
  }, [orderedTrays]);

  const zoneTotals = useMemo(() => {
    const tot = { gen: 0, sp: 0, iso: 0 };
    for (const bed of orderedTrays) {
      tot[bed.zone]++;
    }
    return tot;
  }, [orderedTrays]);

  const filteredTrays = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orderedTrays.filter((bed) => {
      const st = bed.orders![meal].st;
      if (statusFilter === 'ordered' && st !== 'ordered') return false;
      if (statusFilter === 'prep' && st !== 'prep') return false;
      if (statusFilter === 'done' && !['sent', 'left'].includes(st)) return false;

      if (!q) return true;
      return (
        bed.label.toLowerCase().includes(q) ||
        (bed.name ?? '').toLowerCase().includes(q) ||
        (bed.hn ?? '').includes(q)
      );
    });
  }, [orderedTrays, meal, statusFilter, searchQuery]);

  const mealName = getMealName(meal);

  return (
    <div className="space-y-6">
      {/* Top Action Strip + KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            ถาดที่ต้องจัดเตรียม
          </div>
          <div className="font-mono-num mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {kpis.total}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            จัดส่งเรียบร้อย
          </div>
          <div className="font-mono-num mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            {kpis.done}/{kpis.total}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            อาหารญาติ (ห้องพิเศษ)
          </div>
          <div className="font-mono-num mt-1 text-2xl font-bold text-amber-700 dark:text-amber-400">
            {kpis.relatives}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            ภาชนะใช้ครั้งเดียว (แยกโรค)
          </div>
          <div className="font-mono-num mt-1 text-2xl font-bold text-violet-700 dark:text-violet-400">
            {kpis.isoCount}
          </div>
        </div>
      </div>

      {/* Clinical Safety Alerts */}
      <div className="space-y-2.5">
        {changedBeds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/35 dark:text-rose-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />
              <span>
                <strong className="font-bold">คำสั่งอาหารเปลี่ยนแปลง {changedBeds.length} เตียง:</strong>{' '}
                {changedBeds.map((b) => (b.zone === 'gen' ? `เตียง ${b.label}` : b.label)).join(', ')} — กรุณาตรวจสอบใบติดถาดใหม่ก่อนจัดส่ง
              </span>
            </div>
          </div>
        )}

        {pendingNurseBeds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
              <span>
                <strong className="font-bold">รอพยาบาลยืนยันออเดอร์ {pendingNurseBeds.length} เตียง</strong>{' '}
                สำหรับ{mealName} ({pendingNurseBeds.map((b) => b.label).join(', ')})
              </span>
            </div>
          </div>
        )}

        {allergyBeds.length > 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm text-slate-800 dark:border-rose-900/50 dark:bg-slate-900 dark:text-slate-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />
            <div>
              <strong className="font-bold text-rose-700 dark:text-rose-400">
                ผู้ป่วยแพ้อาหารที่ต้องระมัดระวังเป็นพิเศษ:
              </strong>{' '}
              {allergyBeds.map((b) => `${b.zone === 'gen' ? `เตียง ${b.label}` : b.label} (${b.allergy})`).join(' · ')}
            </div>
          </div>
        )}

        {npoBeds.length > 0 && (
          <div className="text-xs text-slate-500 dark:text-slate-400">
            เตียงงดอาหาร (NPO) — ไม่ต้องจัดถาด: {npoBeds.map((b) => b.label).join(', ')}
          </div>
        )}

        {movements.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
            <span className="inline-flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
              <UserPlus className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400" aria-hidden="true" />
              ความเคลื่อนไหวผู้ป่วยวันนี้:
            </span>
            <span>
              รับเข้าใหม่{' '}
              <strong className="font-mono-num text-teal-700 dark:text-teal-400">
                {movements.filter((m) => m.type === 'admitted').length}
              </strong>{' '}
              ราย (
              {movements
                .filter((m) => m.type === 'admitted')
                .map((m) => (m.zone === 'gen' ? `เตียง ${m.bedLabel}` : m.bedLabel))
                .join(', ') || '–'}
              )
            </span>
            <span aria-hidden="true">·</span>
            <span>
              กลับบ้านแล้ว{' '}
              <strong className="font-mono-num">
                {movements.filter((m) => m.type === 'discharged').length}
              </strong>{' '}
              ราย (งดจัดถาด:{' '}
              {movements
                .filter((m) => m.type === 'discharged')
                .map((m) => (m.zone === 'gen' ? `เตียง ${m.bedLabel}` : m.bedLabel))
                .join(', ') || '–'}
              )
            </span>
          </div>
        )}
      </div>

      {/* Production Summary Table */}
      <section aria-labelledby="prod-summary-heading">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <h2 id="prod-summary-heading" className="text-base font-bold text-slate-900 dark:text-slate-100">
            สรุปยอดผลิตแยกตามชนิดอาหาร ({mealName})
          </h2>
          <button
            type="button"
            disabled={orderedTrays.length === 0}
            onClick={() => onOpenLabels(orderedTrays.map((b) => b.id))}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-teal-700 px-4 text-xs font-bold text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-teal-600 dark:hover:bg-teal-500"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            <span>พิมพ์ใบติดถาดทั้งหมด ({orderedTrays.length})</span>
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                <th className="px-4 py-3 text-left">ชนิดอาหารและข้อจำกัด</th>
                <th className="px-4 py-3 text-right">สามัญ</th>
                <th className="px-4 py-3 text-right">ห้องพิเศษ</th>
                <th className="px-4 py-3 text-right">ห้องแยกโรค</th>
                <th className="px-4 py-3 text-right">รวม (ถาด)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {summaryRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                    ยังไม่มีรายการสั่งอาหารสำหรับ{mealName}
                  </td>
                </tr>
              ) : (
                summaryRows.map(([title, counts]) => {
                  const isBd = title.includes('(BD)');
                  const rowTotal = counts.gen + counts.sp + counts.iso;
                  return (
                    <tr
                      key={title}
                      className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                    >
                      <td
                        className={`px-4 py-2.5 font-semibold ${
                          isBd
                            ? 'text-cyan-800 dark:text-cyan-400'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {title}
                      </td>
                      <td className="font-mono-num px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">
                        {counts.gen || '–'}
                      </td>
                      <td className="font-mono-num px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">
                        {counts.sp || '–'}
                      </td>
                      <td className="font-mono-num px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">
                        {counts.iso || '–'}
                      </td>
                      <td className="font-mono-num px-4 py-2.5 text-right font-bold text-slate-900 dark:text-slate-100">
                        {rowTotal}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50 font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-100">
                <td className="px-4 py-3">ยอดรวมทั้งหมด</td>
                <td className="font-mono-num px-4 py-3 text-right">{zoneTotals.gen}</td>
                <td className="font-mono-num px-4 py-3 text-right">{zoneTotals.sp}</td>
                <td className="font-mono-num px-4 py-3 text-right">{zoneTotals.iso}</td>
                <td className="font-mono-num px-4 py-3 text-right">{orderedTrays.length}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Tray Preparation Queue */}
      <section aria-labelledby="tray-queue-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="tray-queue-heading" className="text-base font-bold text-slate-900 dark:text-slate-100">
            รายการจัดเตรียมถาดอาหารรายเตียง
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาเตียง, ชื่อ, HN..."
                className="min-h-[38px] w-48 rounded-lg border border-slate-200 bg-white pr-3 pl-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none sm:w-56 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            {/* Filter */}
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              {(
                [
                  ['all', 'ทั้งหมด'],
                  ['ordered', 'รอจัดเตรียม'],
                  ['prep', 'กำลังจัด'],
                  ['done', 'ส่งแล้ว'],
                ] as const
              ).map(([fKey, fLabel]) => (
                <button
                  key={fKey}
                  type="button"
                  onClick={() => setStatusFilter(fKey)}
                  className={`min-h-[30px] rounded-md px-2.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                    statusFilter === fKey
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {fLabel}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredTrays.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            ไม่พบรายการถาดอาหารที่ตรงกับเงื่อนไขการค้นหา
          </div>
        ) : (
          ZONE_SECTIONS.map((zone) => {
            const rows = filteredTrays.filter((b) => b.zone === zone.key);
            if (rows.length === 0) return null;

            return (
              <div key={zone.key} className="space-y-2.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 pb-2 dark:border-slate-800">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {zone.title}
                    </h3>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {zone.subtitle}
                    </span>
                  </div>
                  <span className="font-mono-num text-xs font-semibold text-slate-600 dark:text-slate-400">
                    {rows.length} ถาด
                  </span>
                </div>

                <div className="space-y-2">
                  {rows.map((bed) => {
                    const order = bed.orders![meal] ?? createDefaultOrder();
                    const diet = bed.diet!;
                    const tube = diet.tube;
                    const isBd = diet.tex === 'bd';
                    const isIso = bed.zone === 'iso';

                    const nextStatus: Record<OrderStatus, OrderStatus | null> = {
                      none: null,
                      ordered: 'prep',
                      prep: 'sent',
                      sent: isIso ? 'left' : null,
                      left: null,
                    };
                    const nextLabel: Partial<Record<OrderStatus, string>> = {
                      ordered: 'เริ่มจัดเตรียม',
                      prep: 'จัดส่งแล้ว',
                      sent: 'วางหน้าห้องแล้ว',
                    };
                    const next = nextStatus[order.st];
                    const isDone = order.st === 'sent' || order.st === 'left';

                    return (
                      <div
                        key={bed.id}
                        className={`flex flex-col justify-between gap-3 rounded-xl border p-3.5 transition-colors sm:flex-row sm:items-center ${
                          isDone
                            ? 'border-slate-200 bg-slate-50/70 opacity-80 dark:border-slate-800 dark:bg-slate-900/50'
                            : isBd
                              ? 'border-cyan-200 bg-cyan-50/40 dark:border-cyan-900/60 dark:bg-cyan-950/20'
                              : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                        }`}
                      >
                        <div className="flex min-w-0 items-start gap-3.5">
                          {/* Bed Number */}
                          <div
                            className={`font-mono-num shrink-0 pt-0.5 font-bold whitespace-nowrap text-slate-900 dark:text-slate-100 ${
                              bed.zone === 'sp' ? 'min-w-[84px] text-base' : 'w-14 text-xl'
                            }`}
                          >
                            {bed.label}
                          </div>

                          {/* Diet & Patient Details (No Diagnosis shown for Kitchen Privacy) */}
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                {getKitchenDietTitle(diet)}
                              </span>
                              {order.changed && (
                                <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                                  · คำสั่งเปลี่ยนใหม่
                                </span>
                              )}
                              {order.urgent && (
                                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                                  · แก้ไขด่วน
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-slate-600 dark:text-slate-400">
                              {bed.name} · <span className="font-mono-num">HN {bed.hn}</span>
                              {isBd ? (
                                <>
                                  {' · '}
                                  {tube.sub === 'natural'
                                    ? `${tube.kcal} kcal/มล.`
                                    : tube.formula}
                                  {' · '}สาย {tube.line} (
                                  {tube.method === 'bolus' ? 'Bolus' : 'หยดต่อเนื่อง'}) ·{' '}
                                  <span className="font-mono-num">
                                    {tube.vol} มล. × {tube.times} มื้อ · ล้างสาย {tube.flush} มล.
                                  </span>
                                </>
                              ) : (
                                <>
                                  {order.rice ? ` · ${getRiceLabel(order.rice)}` : ''}
                                  {order.portion === 'small' ? ' · ปริมาณน้อย' : ''}
                                </>
                              )}
                            </div>

                            {bed.allergy && (
                              <div className="flex items-center gap-1 text-xs font-bold text-rose-700 dark:text-rose-400">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                <span>แพ้อาหาร: {bed.allergy}</span>
                              </div>
                            )}

                            {isIso && bed.iso && (
                              <div className="flex items-center gap-1 text-xs font-semibold text-violet-700 dark:text-violet-400">
                                <ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                <span>
                                  {ISOLATION_TYPES[bed.iso.type].label} · ภาชนะใช้ครั้งเดียว วางหน้าห้อง
                                </span>
                              </div>
                            )}

                            {bed.zone === 'sp' && order.rel > 0 && (
                              <div className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                                + อาหารญาติ {order.rel} ชุด (ห้องพิเศษ)
                              </div>
                            )}

                            {order.note && (
                              <div className="text-xs text-slate-600 dark:text-slate-300">
                                หมายเหตุ: {order.note}
                              </div>
                            )}

                            {bed.stickerImage && (
                              <button
                                type="button"
                                onClick={() =>
                                  setStickerPreview({
                                    src: bed.stickerImage!,
                                    title: `${bed.zone === 'gen' ? `เตียง ${bed.label}` : bed.label} · ภาพสติกเกอร์ผู้ป่วย`,
                                  })
                                }
                                className="mt-1.5 inline-flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-1.5 pr-3 text-left transition-colors hover:border-teal-600/50 hover:bg-teal-50/40 dark:border-slate-700 dark:bg-slate-800/70 dark:hover:border-teal-500/50"
                              >
                                <img
                                  src={bed.stickerImage}
                                  alt={`ภาพสติกเกอร์ ${bed.label}`}
                                  className="h-10 w-14 rounded object-cover"
                                />
                                <div className="text-[11px]">
                                  <div className="inline-flex items-center gap-1 font-bold text-teal-800 dark:text-teal-300">
                                    <Camera className="h-3 w-3" aria-hidden="true" />
                                    <span>ภาพสติกเกอร์ผู้ป่วย</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                    <Maximize2 className="h-2.5 w-2.5" aria-hidden="true" />
                                    <span>แตะเพื่อขยายดู</span>
                                  </div>
                                </div>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                          {bed.stickerImage && (
                            <button
                              type="button"
                              onClick={() =>
                                setStickerPreview({
                                  src: bed.stickerImage!,
                                  title: `${bed.zone === 'gen' ? `เตียง ${bed.label}` : bed.label} · ภาพสติกเกอร์ผู้ป่วย`,
                                })
                              }
                              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50/70 px-3 text-xs font-semibold text-teal-800 transition-colors hover:bg-teal-100 dark:border-teal-900/60 dark:bg-teal-950/40 dark:text-teal-300 dark:hover:bg-teal-950/70"
                            >
                              <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>ดูสติกเกอร์</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenLabels([bed.id])}
                            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                          >
                            <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>ใบติดถาด</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenNotify(bed.id)}
                            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                          >
                            <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>แจ้งพยาบาล</span>
                          </button>

                          {next ? (
                            <button
                              type="button"
                              onClick={() => onAdvanceStatus(bed.id)}
                              className={`min-h-[38px] min-w-[120px] rounded-lg px-3.5 text-xs font-bold transition-colors ${
                                order.st === 'ordered'
                                  ? 'border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-950/70'
                                  : order.st === 'prep'
                                    ? 'border border-blue-300 bg-blue-50 text-blue-900 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/70'
                                    : 'border border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                              }`}
                            >
                              {nextLabel[order.st]}
                            </button>
                          ) : (
                            <span className="inline-flex min-h-[38px] min-w-[120px] items-center justify-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>{STATUS_LABELS[order.st]}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </section>

      <footer className="border-t border-slate-200 pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        หมายเหตุความปลอดภัยข้อมูล: หน้าจอฝ่ายโภชนาการแสดงเฉพาะข้อมูลแผนอาหาร ข้อจำกัด การแพ้อาหาร และภาพสติกเกอร์ที่พยาบาลส่งต่อมา · หากพบข้อสงสัยกรุณากด “แจ้งพยาบาล”
      </footer>

      {/* Sticker Lightbox for Nutrition Staff */}
      {stickerPreview && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/85 p-4"
          onClick={() => setStickerPreview(null)}
          role="dialog"
          aria-modal="true"
          aria-label={stickerPreview.title}
        >
          <div className="relative max-h-[90vh] max-w-3xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 p-3">
            <div className="mb-2 flex items-center justify-between gap-4 px-1 text-xs font-semibold text-white">
              <span>{stickerPreview.title}</span>
              <button
                type="button"
                onClick={() => setStickerPreview(null)}
                aria-label="ปิดภาพขยาย"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-white hover:bg-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <img
              src={stickerPreview.src}
              alt={stickerPreview.title}
              className="max-h-[80vh] w-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};
