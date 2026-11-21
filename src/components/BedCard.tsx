import React from 'react';
import { AlertTriangle, Camera, CheckCircle2, Clock, CookingPot, Ban, ShieldAlert, Droplets } from 'lucide-react';
import type { BedPatient, MealKey } from '../types/hospital';
import { createDefaultOrder, getDietShortSummary, STATUS_LABELS } from '../data/mockWardData';

interface BedCardProps {
  bed: BedPatient;
  meal: MealKey;
  onOpen: (id: string) => void;
}

export const BedCard: React.FC<BedCardProps> = ({ bed, meal, onOpen }) => {
  if (!bed.occ || !bed.diet || !bed.orders) {
    return (
      <button
        type="button"
        onClick={() => onOpen(bed.id)}
        aria-label={`${bed.zone === 'gen' ? `เตียง ${bed.label}` : bed.label} ว่าง — แตะเพื่อถ่ายภาพสติกเกอร์รับผู้ป่วย`}
        className="group flex min-h-[126px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-3 text-center transition-colors hover:border-teal-600/60 hover:bg-teal-50/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:border-slate-700/80 dark:bg-slate-900/30 dark:hover:border-teal-500/60 dark:hover:bg-teal-950/25"
      >
        <span
          className={`font-mono-num font-semibold text-slate-500 group-hover:text-teal-700 dark:text-slate-400 dark:group-hover:text-teal-400 ${
            bed.zone === 'sp' ? 'text-sm' : 'text-lg'
          }`}
        >
          {bed.label}
        </span>
        <span className="mt-1 text-xs font-medium text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300">
          {bed.zone === 'gen' ? 'เตียงว่าง' : 'ห้องว่าง'}
        </span>
        <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 opacity-80 group-hover:opacity-100 dark:text-teal-400">
          <Camera className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span>ถ่ายสติกเกอร์</span>
        </span>
      </button>
    );
  }

  const order = bed.orders[meal] ?? createDefaultOrder();
  const isNpo = bed.diet.tex === 'npo';
  const isBd = bed.diet.tex === 'bd';
  const isIso = bed.zone === 'iso';

  // Semantic surface & border pairing (no thick left bars, single clean hairline border)
  let cardTone =
    'border-slate-200 bg-white hover:border-teal-600/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-500/50';
  let statusTextClass = 'text-slate-600 dark:text-slate-400';
  let statusText = STATUS_LABELS[order.st];
  let StatusIcon = Clock;

  if (isNpo) {
    cardTone =
      'border-rose-200 bg-rose-50/70 hover:border-rose-400 dark:border-rose-900/60 dark:bg-rose-950/30 dark:hover:border-rose-700';
    statusTextClass = 'text-rose-700 dark:text-rose-400';
    statusText = 'งดอาหาร (NPO)';
    StatusIcon = Ban;
  } else if (order.st === 'none') {
    cardTone =
      'border-amber-300/90 bg-amber-50/60 hover:border-amber-500 dark:border-amber-800/70 dark:bg-amber-950/25 dark:hover:border-amber-600';
    statusTextClass = 'text-amber-800 dark:text-amber-400';
    statusText = 'รอสั่งอาหาร';
    StatusIcon = Clock;
  } else if (order.st === 'prep') {
    cardTone =
      'border-blue-200 bg-blue-50/60 hover:border-blue-400 dark:border-blue-900/60 dark:bg-blue-950/30 dark:hover:border-blue-700';
    statusTextClass = 'text-blue-700 dark:text-blue-400';
    statusText = 'ครัวกำลังจัด';
    StatusIcon = CookingPot;
  } else {
    cardTone =
      'border-emerald-200 bg-emerald-50/60 hover:border-emerald-400 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:hover:border-emerald-700';
    statusTextClass = 'text-emerald-700 dark:text-emerald-400';
    statusText =
      order.st === 'ordered' ? 'สั่งอาหารแล้ว' : STATUS_LABELS[order.st];
    StatusIcon = CheckCircle2;
  }

  const dietSummary = getDietShortSummary(bed.diet);

  return (
    <button
      type="button"
      onClick={() => onOpen(bed.id)}
      aria-label={`เตียง ${bed.label} ${bed.name} ${dietSummary} ${statusText}`}
      className={`group flex min-h-[126px] w-full flex-col justify-between rounded-xl border p-3 text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${cardTone}`}
    >
      {/* Top Row: Bed Number + Clean Safety Alert */}
      <div className="w-full">
        <div className="flex items-start justify-between gap-1.5">
          <span
            className={`font-mono-num font-bold leading-snug tracking-tight text-slate-900 dark:text-slate-100 ${
              bed.zone === 'sp' ? 'text-sm' : 'text-lg leading-none'
            }`}
          >
            {bed.label}
          </span>
          <div className="flex flex-col items-end gap-0.5 text-[11px] font-semibold leading-tight">
            {bed.allergy && (
              <span className="inline-flex items-center gap-0.5 text-rose-700 dark:text-rose-400">
                <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span>แพ้อาหาร</span>
              </span>
            )}
            {order.changed && (
              <span className="text-amber-700 dark:text-amber-400">
                ปรับคำสั่งใหม่
              </span>
            )}
            {bed.isNewAdmit && !bed.allergy && !order.changed && (
              <span className="text-teal-700 dark:text-teal-400">
                รับเข้าใหม่
              </span>
            )}
            {isIso && !bed.allergy && !order.changed && !bed.isNewAdmit && (
              <span className="inline-flex items-center gap-0.5 text-violet-700 dark:text-violet-400">
                <ShieldAlert className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span>แยกโรค</span>
              </span>
            )}
          </div>
        </div>

        {/* Patient Name */}
        <div className="mt-1.5 truncate text-[13px] font-medium text-slate-600 dark:text-slate-300">
          {bed.name}
        </div>

        {/* Diet Summary */}
        <div
          className={`mt-1 line-clamp-2 text-[13px] font-semibold leading-snug ${
            isNpo
              ? 'text-rose-800 dark:text-rose-300'
              : isBd
                ? 'text-cyan-800 dark:text-cyan-300'
                : 'text-slate-900 dark:text-slate-100'
          }`}
        >
          {isBd && (
            <Droplets
              className="mr-1 inline h-3.5 w-3.5 -translate-y-px text-cyan-700 dark:text-cyan-400"
              aria-hidden="true"
            />
          )}
          {dietSummary}
        </div>
      </div>

      {/* Bottom Status */}
      <div className="mt-2.5 flex w-full items-center justify-between gap-1">
        <div className={`flex min-w-0 items-center gap-1 text-xs font-semibold ${statusTextClass}`}>
          <StatusIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{statusText}</span>
        </div>
        {bed.stickerImage && (
          <Camera
            className="h-3.5 w-3.5 shrink-0 text-teal-700 dark:text-teal-400"
            aria-label="มีภาพสติกเกอร์ผู้ป่วย"
          />
        )}
      </div>
    </button>
  );
};
