import React from 'react';
import { Printer, X, AlertTriangle } from 'lucide-react';
import type { BedPatient, MealKey } from '../types/hospital';
import {
  createDefaultOrder,
  getKitchenDietTitle,
  getMealName,
  getRiceLabel,
  ISOLATION_TYPES,
} from '../data/mockWardData';

interface TrayLabelsModalProps {
  beds: BedPatient[];
  meal: MealKey;
  onClose: () => void;
}

export const TrayLabelsModal: React.FC<TrayLabelsModalProps> = ({
  beds,
  meal,
  onClose,
}) => {
  const mealName = getMealName(meal);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-4 print-only-sheet"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`ใบติดถาดอาหาร ${mealName}`}
    >
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl dark:border-slate-800 dark:bg-slate-900 print-only-sheet">
        {/* Header (hidden when printing) */}
        <div className="no-print flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              ใบติดถาดอาหาร · {mealName}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ทั้งหมด {beds.length} รายการ · ออกแบบสำหรับพิมพ์ติดหน้าถาดอาหารผู้ป่วย
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              <span>สั่งพิมพ์ใบติดถาด</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="ปิดหน้าต่าง"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable Label Grid */}
        <div className="overflow-y-auto p-5 print:overflow-visible print:p-0">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2 print:gap-3">
            {beds.map((bed) => {
              if (!bed.diet || !bed.orders) return null;
              const order = bed.orders[meal] ?? createDefaultOrder();
              const isBd = bed.diet.tex === 'bd';
              const isIso = bed.zone === 'iso';
              const isSp = bed.zone === 'sp';
              const tube = bed.diet.tube;

              let topBanner: { text: string; className: string } | null = null;
              if (isBd) {
                topBanner = {
                  text: 'BD · อาหารทางสายยาง',
                  className: 'bg-cyan-800 text-white',
                };
              } else if (isIso && bed.iso) {
                topBanner = {
                  text: `ห้องแยกโรค · ${ISOLATION_TYPES[bed.iso.type].short}`,
                  className: 'bg-violet-800 text-white',
                };
              } else if (isSp) {
                topBanner = {
                  text: `ห้องพิเศษ (${bed.room ?? 'VIP'})`,
                  className: 'bg-amber-800 text-white',
                };
              }

              return (
                <div
                  key={bed.id}
                  className={`break-inside-avoid overflow-hidden rounded-xl border-2 bg-white text-slate-950 ${
                    isBd
                      ? 'border-cyan-800 bg-cyan-50/40'
                      : isIso
                        ? 'border-dashed border-violet-800'
                        : 'border-slate-900'
                  }`}
                >
                  {topBanner && (
                    <div className={`px-3 py-1 text-xs font-bold ${topBanner.className}`}>
                      {topBanner.text}
                    </div>
                  )}

                  <div className="p-3">
                    <div className="flex items-baseline justify-between border-b border-slate-200 pb-1.5">
                      <span
                        className={`font-mono-num font-bold tracking-tight ${
                          bed.zone === 'sp' ? 'text-lg' : 'text-2xl'
                        }`}
                      >
                        {bed.label}
                      </span>
                      <span className="text-xs font-semibold text-slate-600">
                        {mealName}
                      </span>
                    </div>

                    <div className="mt-2 text-sm font-semibold">
                      {bed.name}{' '}
                      <span className="font-mono-num text-xs font-normal text-slate-600">
                        · HN {bed.hn}
                      </span>
                    </div>

                    <div className="mt-1.5 text-base font-bold leading-snug text-slate-950">
                      {getKitchenDietTitle(bed.diet)}
                    </div>

                    {isBd ? (
                      <div className="mt-1.5 space-y-0.5 text-xs text-slate-800">
                        <div>
                          {tube.sub === 'natural'
                            ? `ปั่นผสมธรรมชาติ ${tube.kcal} kcal/มล.`
                            : tube.formula}
                          {' · '}สาย {tube.line} ({tube.method === 'bolus' ? 'Bolus' : 'หยดต่อเนื่อง'})
                        </div>
                        <div className="font-mono-num font-semibold">
                          ปริมาณ {tube.vol} มล./มื้อ × {tube.times} มื้อ · น้ำล้างสาย {tube.flush} มล.
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1.5 text-xs font-medium text-slate-800">
                        {order.rice ? getRiceLabel(order.rice) : 'ไม่ระบุข้าว'}
                        {order.portion === 'small' ? ' · ปริมาณน้อย' : ' · ปริมาณปกติ'}
                        {isSp && order.rel > 0 ? ` · อาหารญาติ +${order.rel} ชุด` : ''}
                      </div>
                    )}

                    {bed.allergy && (
                      <div className="mt-2 flex items-center gap-1 rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-bold text-rose-800">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>แพ้อาหาร: {bed.allergy}</span>
                      </div>
                    )}

                    {isIso && (
                      <div className="mt-2 text-xs font-bold text-violet-900">
                        ใช้ภาชนะแบบใช้ครั้งเดียวทิ้ง · วางหน้าห้อง ไม่ต้องเก็บคืน
                      </div>
                    )}

                    {order.note && (
                      <div className="mt-1.5 border-t border-slate-200 pt-1 text-xs text-slate-700">
                        หมายเหตุ: {order.note}
                      </div>
                    )}

                    {bed.stickerImage && (
                      <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-1">
                        <img
                          src={bed.stickerImage}
                          alt={`ภาพสติกเกอร์ ${bed.label}`}
                          className="max-h-24 w-full object-contain"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
