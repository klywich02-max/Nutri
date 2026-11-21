import React, { useState } from 'react';
import {
  ArrowRight,
  Camera,
  LogOut,
  Maximize2,
  UserPlus,
  X,
} from 'lucide-react';
import type { BedPatient, WardMovementRecord } from '../types/hospital';

interface WardMovementPanelProps {
  movements: WardMovementRecord[];
  beds: BedPatient[];
  onOpenBedOrder: (bedId: string) => void;
  onStartNewAdmit: (bedId?: string) => void;
}

export const WardMovementPanel: React.FC<WardMovementPanelProps> = ({
  movements,
  beds,
  onOpenBedOrder,
  onStartNewAdmit,
}) => {
  const [previewSticker, setPreviewSticker] = useState<{
    src: string;
    title: string;
  } | null>(null);

  const admittedList = movements.filter((m) => m.type === 'admitted');
  const dischargedList = movements.filter((m) => m.type === 'discharged');

  const bedMap = new Map(beds.map((b) => [b.id, b]));

  const formatLoc = (m: WardMovementRecord) =>
    m.zone === 'gen' ? `เตียง ${m.bedLabel}` : m.bedLabel;

  return (
    <section aria-labelledby="ward-movement-heading" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="ward-movement-heading"
          className="text-base font-bold text-slate-900 dark:text-slate-100"
        >
          ความเคลื่อนไหวผู้ป่วยประจำวัน
        </h2>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          ติดตามผู้ป่วยรับเข้าใหม่และผู้ป่วยจำหน่ายกลับบ้านเพื่อปรับแผนอาหารให้ตรงกับเตียงจริง
        </span>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
        {/* ช่องข้อมูลผู้ป่วยรับเข้าใหม่ */}
        <div className="flex flex-col rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-teal-700 dark:text-teal-400" aria-hidden="true" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                ผู้ป่วยรับเข้าใหม่
              </h3>
              <span className="font-mono-num text-xs font-semibold text-teal-700 dark:text-teal-400">
                {admittedList.length} ราย
              </span>
            </div>

            <button
              type="button"
              onClick={() => onStartNewAdmit()}
              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg bg-teal-700 px-3 text-xs font-bold text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              <Camera className="h-3.5 w-3.5" aria-hidden="true" />
              <span>รับเข้าใหม่ (ถ่ายสติกเกอร์)</span>
            </button>
          </div>

          <div className="flex-1 divide-y divide-slate-100 p-2 dark:divide-slate-800">
            {admittedList.length === 0 ? (
              <div className="px-3 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                ยังไม่มีผู้ป่วยรับเข้าใหม่ในวันนี้ — กด “รับเข้าใหม่ (ถ่ายสติกเกอร์)” เพื่อบันทึกเข้าเตียงว่าง
              </div>
            ) : (
              admittedList.map((item) => {
                const currentBed = bedMap.get(item.bedId);
                const stillOccupied = Boolean(currentBed?.occ);
                return (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 rounded-lg p-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      {item.stickerImage && (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewSticker({
                              src: item.stickerImage!,
                              title: `${formatLoc(item)} · ${item.name}`,
                            })
                          }
                          aria-label={`ดูภาพสติกเกอร์ ${item.name}`}
                          className="group relative h-12 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-950"
                        >
                          <img
                            src={item.stickerImage}
                            alt={`สติกเกอร์ ${item.name}`}
                            className="h-full w-full object-cover"
                          />
                          <span className="absolute right-0.5 bottom-0.5 rounded bg-slate-950/70 p-0.5 text-white">
                            <Maximize2 className="h-2.5 w-2.5" />
                          </span>
                        </button>
                      )}

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2 text-xs">
                          <span className="font-mono-num font-bold text-teal-800 dark:text-teal-400">
                            {formatLoc(item)}
                          </span>
                          <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                            ·
                          </span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {item.name}
                          </span>
                          <span className="font-mono-num text-slate-500 dark:text-slate-400">
                            HN {item.hn}
                          </span>
                        </div>

                        <div className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                          {item.dx ? `${item.dx} · ` : ''}
                          {item.dietSummary ? `แผนอาหาร: ${item.dietSummary} · ` : ''}
                          <span className="font-mono-num">รับเข้า {item.time}</span>
                        </div>
                      </div>
                    </div>

                    {stillOccupied && (
                      <button
                        type="button"
                        onClick={() => onOpenBedOrder(item.bedId)}
                        className="inline-flex min-h-[34px] shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:border-teal-600/40 hover:text-teal-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:text-teal-300"
                      >
                        <span>สั่งอาหาร</span>
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ช่องข้อมูลผู้ป่วยกลับบ้านแล้ว */}
        <div className="flex flex-col rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <LogOut className="h-4 w-4 text-slate-600 dark:text-slate-400" aria-hidden="true" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                ผู้ป่วยกลับบ้านแล้ว (จำหน่าย)
              </h3>
              <span className="font-mono-num text-xs font-semibold text-slate-600 dark:text-slate-400">
                {dischargedList.length} ราย
              </span>
            </div>

            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              ยกเลิกมื้อคงค้างอัตโนมัติ
            </span>
          </div>

          <div className="flex-1 divide-y divide-slate-100 p-2 dark:divide-slate-800">
            {dischargedList.length === 0 ? (
              <div className="px-3 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                ยังไม่มีรายการผู้ป่วยกลับบ้านในวันนี้
              </div>
            ) : (
              dischargedList.map((item) => {
                const currentBed = bedMap.get(item.bedId);
                const isBedCurrentlyVacant = currentBed && !currentBed.occ;
                return (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 rounded-lg p-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      {item.stickerImage && (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewSticker({
                              src: item.stickerImage!,
                              title: `${formatLoc(item)} · ${item.name} (กลับบ้านแล้ว)`,
                            })
                          }
                          aria-label={`ดูภาพสติกเกอร์ ${item.name}`}
                          className="group relative h-12 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-950"
                        >
                          <img
                            src={item.stickerImage}
                            alt={`สติกเกอร์ ${item.name}`}
                            className="h-full w-full object-cover"
                          />
                          <span className="absolute right-0.5 bottom-0.5 rounded bg-slate-950/70 p-0.5 text-white">
                            <Maximize2 className="h-2.5 w-2.5" />
                          </span>
                        </button>
                      )}

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2 text-xs">
                          <span className="font-mono-num font-bold text-slate-700 dark:text-slate-300">
                            {formatLoc(item)}
                          </span>
                          <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                            ·
                          </span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {item.name}
                          </span>
                          <span className="font-mono-num text-slate-500 dark:text-slate-400">
                            HN {item.hn}
                          </span>
                        </div>

                        <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="font-mono-num">กลับบ้าน {item.time}</span>
                          {item.note ? ` · ${item.note}` : ''}
                        </div>
                      </div>
                    </div>

                    {isBedCurrentlyVacant && (
                      <button
                        type="button"
                        onClick={() => onStartNewAdmit(item.bedId)}
                        className="inline-flex min-h-[34px] shrink-0 items-center gap-1 rounded-lg border border-dashed border-teal-600/50 bg-teal-50/50 px-2.5 text-xs font-semibold text-teal-800 transition-colors hover:bg-teal-50 dark:border-teal-500/40 dark:bg-teal-950/30 dark:text-teal-300"
                      >
                        <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>รับเข้าเตียงนี้</span>
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Sticker Zoom Lightbox */}
      {previewSticker && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/85 p-4"
          onClick={() => setPreviewSticker(null)}
          role="dialog"
          aria-modal="true"
          aria-label={previewSticker.title}
        >
          <div className="relative max-h-[90vh] max-w-2xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 p-3">
            <div className="mb-2 flex items-center justify-between gap-4 px-1 text-xs font-semibold text-white">
              <span>{previewSticker.title}</span>
              <button
                type="button"
                onClick={() => setPreviewSticker(null)}
                aria-label="ปิดภาพขยาย"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-white hover:bg-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <img
              src={previewSticker.src}
              alt={previewSticker.title}
              className="max-h-[80vh] w-full object-contain"
            />
          </div>
        </div>
      )}
    </section>
  );
};
