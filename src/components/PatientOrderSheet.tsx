import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  Camera,
  Check,
  Clock,
  Copy,
  Droplets,
  LogOut,
  Maximize2,
  Minus,
  Plus,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import type {
  BedPatient,
  DietOrder,
  IsolationInfo,
  IsolationType,
  MealKey,
  MealOrder,
  RestrictionKey,
  RiceOption,
  TextureKey,
} from '../types/hospital';
import {
  createDefaultOrder,
  FORMULAS,
  formatTodayThai,
  getDietShortSummary,
  getMealName,
  getRiceLabel,
  ISOLATION_TYPES,
  isRiceAllowed,
  MEALS,
  RESTRICTIONS,
  TEXTURES,
} from '../data/mockWardData';

interface PatientOrderSheetProps {
  bed: BedPatient;
  meal: MealKey;
  isLocked: boolean;
  onClose: () => void;
  onSave: (payload: {
    bedId: string;
    diet: DietOrder;
    allergy: string;
    iso?: IsolationInfo;
    order: MealOrder;
    urgentReason: string;
    dietChanged: boolean;
  }) => void;
  onCancelOrder: (bedId: string) => void;
  onOpenStickerCapture: (bedId: string) => void;
  onDischargePatient: (bedId: string) => void;
}

const clone = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj));

export const PatientOrderSheet: React.FC<PatientOrderSheetProps> = ({
  bed,
  meal,
  isLocked,
  onClose,
  onSave,
  onCancelOrder,
  onOpenStickerCapture,
  onDischargePatient,
}) => {
  const initialDiet = bed.diet!;
  const initialOrder = bed.orders![meal] ?? createDefaultOrder();

  const [diet, setDiet] = useState<DietOrder>(() => clone(initialDiet));
  const [allergy, setAllergy] = useState<string>(bed.allergy ?? '');
  const [iso, setIso] = useState<IsolationInfo | undefined>(() =>
    bed.iso ? clone(bed.iso) : undefined
  );
  const [order, setOrder] = useState<MealOrder>(() => clone(initialOrder));
  const [urgentReason, setUrgentReason] = useState<string>('');
  const [docClearedOnce, setDocClearedOnce] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [zoomSticker, setZoomSticker] = useState(false);
  const [confirmDischarge, setConfirmDischarge] = useState(false);

  const dietChanged = useMemo(() => {
    const a = { ...diet, doctor: '', date: '' };
    const b = { ...initialDiet, doctor: '', date: '' };
    return JSON.stringify(a) !== JSON.stringify(b);
  }, [diet, initialDiet]);

  const touchDiet = (nextDiet: DietOrder) => {
    const a = { ...nextDiet, doctor: '', date: '' };
    const b = { ...initialDiet, doctor: '', date: '' };
    const changed = JSON.stringify(a) !== JSON.stringify(b);
    if (changed && !docClearedOnce) {
      setDocClearedOnce(true);
      nextDiet.doctor = '';
    }
    setDiet(nextDiet);
    setErrors([]);
  };

  const handleSelectTexture = (tex: TextureKey) => {
    const nextDiet: DietOrder = {
      ...diet,
      tex,
      restr: tex === 'npo' ? [] : diet.restr,
    };
    if (!isRiceAllowed(nextDiet)) {
      setOrder((prev) => ({ ...prev, rice: null }));
    } else {
      setOrder((prev) => ({
        ...prev,
        rice: tex === 'normal' ? 'rice' : 'porridge',
      }));
    }
    touchDiet(nextDiet);
  };

  const handleToggleRestriction = (resKey: RestrictionKey) => {
    const exists = diet.restr.includes(resKey);
    const nextRestr = exists
      ? diet.restr.filter((r) => r !== resKey)
      : [...diet.restr, resKey];
    touchDiet({ ...diet, restr: nextRestr });
  };

  const mealIndex = MEALS.findIndex((m) => m.k === meal);
  const prevMeal = mealIndex > 0 ? MEALS[mealIndex - 1] : null;
  const existingOrder = initialOrder.st !== 'none';
  const mealName = getMealName(meal);

  const handleCopyPreviousMeal = () => {
    if (!prevMeal || !bed.orders) return;
    const prevOrd = bed.orders[prevMeal.k] ?? createDefaultOrder();
    setOrder((prev) => ({
      ...prev,
      rice: isRiceAllowed(diet) ? prevOrd.rice || prev.rice : null,
      portion: prevOrd.portion,
      note: prevOrd.note,
      rel: prevOrd.rel,
    }));
  };

  const handleSubmit = () => {
    const errs: string[] = [];
    if (!diet.doctor.trim()) {
      errs.push('กรุณาระบุชื่อแพทย์ผู้สั่งแผนอาหาร');
    }
    if (diet.tex === 'bd') {
      const tb = diet.tube;
      if (tb.sub === 'formula' && !tb.formula) {
        errs.push('กรุณาเลือกสูตรอาหารทางสายยางสำเร็จรูป');
      }
      if (tb.sub === 'natural' && !(Number(tb.kcal) > 0)) {
        errs.push('กรุณาระบุความเข้มข้นพลังงาน (kcal/มล.)');
      }
      if (!(Number(tb.vol) > 0)) {
        errs.push('กรุณาระบุปริมาณต่อมื้อ (มล.)');
      }
      if (!(Number(tb.times) > 0)) {
        errs.push('กรุณาระบุจำนวนมื้อต่อวัน');
      }
      if (tb.flush === '' || Number(tb.flush) < 0) {
        errs.push('กรุณาระบุปริมาณน้ำล้างสาย (มล.)');
      }
    }
    if (isLocked && !urgentReason.trim()) {
      errs.push('เลยเวลาตัดรอบแล้ว กรุณาระบุเหตุผลการแก้ไขด่วน');
    }

    if (errs.length > 0) {
      setErrors(errs);
      return;
    }

    onSave({
      bedId: bed.id,
      diet: {
        ...diet,
        date: dietChanged ? formatTodayThai() : diet.date,
      },
      allergy: allergy.trim(),
      iso,
      order,
      urgentReason: urgentReason.trim(),
      dietChanged,
    });
  };

  const dailyTubeVolume =
    diet.tex === 'bd' && Number(diet.tube.vol) > 0 && Number(diet.tube.times) > 0
      ? Number(diet.tube.vol) * Number(diet.tube.times)
      : 0;

  const allowedRiceValues: Exclude<RiceOption, null>[] =
    diet.tex === 'normal' ? ['rice', 'porridge'] : ['porridge', 'congee'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`จัดการคำสั่งอาหาร ${bed.label}`}
    >
      <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Sticky Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span className="font-mono-num text-base font-bold text-slate-900 dark:text-slate-100">
                {bed.zone === 'gen'
                  ? `เตียง ${bed.label}`
                  : bed.zone === 'sp'
                    ? bed.label
                    : `ห้อง ${bed.label}`}
              </span>
              {bed.zone === 'sp' && bed.room && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-700 dark:text-amber-400">{bed.room}</span>
                </>
              )}
              {bed.zone === 'iso' && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-violet-700 dark:text-violet-400">ห้องแยกโรค</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span>{mealName}</span>
            </div>

            <div className="mt-1 flex flex-wrap items-baseline gap-x-2 text-base font-bold text-slate-900 dark:text-slate-100">
              <span>{bed.name}</span>
              <span className="font-mono-num text-xs font-medium text-slate-500 dark:text-slate-400">
                {bed.age ? `อายุ ${bed.age} ปี · ` : ''}HN {bed.hn}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
              การวินิจฉัยโรค / ข้อมูลเพิ่มเติม: {bed.dx || 'ตามภาพสติกเกอร์'}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่าง"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {/* Patient Sticker Photo Card (Zero-Typing Patient Storage) */}
          <section className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  ภาพสติกเกอร์ผู้ป่วย (เก็บข้อมูลแทนการพิมพ์)
                </h3>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  {bed.stickerImage
                    ? `บันทึกภาพเมื่อ ${bed.stickerCapturedAt ?? 'ล่าสุด'} · แตะที่ภาพเพื่อขยายดูรายละเอียด`
                    : 'ยังไม่มีภาพสติกเกอร์ — กดถ่ายภาพเพื่อเก็บข้อมูลจากสติกเกอร์ผู้ป่วยโดยไม่ต้องพิมพ์'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenStickerCapture(bed.id)}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 text-xs font-bold text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
              >
                <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{bed.stickerImage ? 'ถ่ายภาพสติกเกอร์ใหม่' : 'ถ่ายภาพสติกเกอร์'}</span>
              </button>
            </div>

            {bed.stickerImage && (
              <button
                type="button"
                onClick={() => setZoomSticker(true)}
                className="group relative mt-3 block w-full overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950"
              >
                <img
                  src={bed.stickerImage}
                  alt={`ภาพสติกเกอร์ผู้ป่วย ${bed.name ?? bed.label}`}
                  className="max-h-40 w-full object-contain"
                />
                <span className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-lg bg-slate-950/75 px-2.5 py-1 text-[11px] font-semibold text-white">
                  <Maximize2 className="h-3 w-3" aria-hidden="true" />
                  <span>ขยายดูภาพ</span>
                </span>
              </button>
            )}
          </section>

          {/* Allergy Warning Callout */}
          {allergy.trim() && (
            <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/35 dark:text-rose-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />
              <div className="text-sm">
                <span className="font-bold">ข้อมูลแพ้อาหาร: </span>
                <span>{allergy}</span>
              </div>
            </div>
          )}

          {/* Section 1: Diet Order */}
          <section>
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                1. แผนอาหารตามคำสั่งแพทย์
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                แผนปัจจุบัน: {getDietShortSummary(diet)}
              </span>
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="ลักษณะอาหาร">
              {TEXTURES.map((tex) => {
                const active = diet.tex === tex.k;
                const isNpoOpt = tex.k === 'npo';
                const isBdOpt = tex.k === 'bd';
                return (
                  <button
                    key={tex.k}
                    type="button"
                    onClick={() => handleSelectTexture(tex.k)}
                    className={`flex flex-col items-start rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      active
                        ? isNpoOpt
                          ? 'border-rose-600 bg-rose-600 text-white dark:border-rose-500 dark:bg-rose-600'
                          : isBdOpt
                            ? 'border-cyan-700 bg-cyan-700 text-white dark:border-cyan-600 dark:bg-cyan-700'
                            : 'border-teal-700 bg-teal-700 text-white dark:border-teal-600 dark:bg-teal-600'
                        : 'border-slate-200 bg-slate-50/70 text-slate-800 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-sm font-bold leading-tight">{tex.short}</span>
                    <span
                      className={`mt-0.5 text-[11px] leading-snug ${
                        active ? 'text-white/85' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {tex.desc}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Restrictions */}
            <div className="mt-4">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  ข้อจำกัดเฉพาะโรค (เลือกได้มากกว่า 1 ข้อ)
                </span>
                {diet.tex === 'npo' && (
                  <span className="text-xs text-rose-600 dark:text-rose-400">
                    ไม่ใช้ร่วมกับคำสั่งงดอาหาร (NPO)
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="ข้อจำกัดเฉพาะโรค">
                {RESTRICTIONS.map((res) => {
                  const active = diet.restr.includes(res.k);
                  return (
                    <button
                      key={res.k}
                      type="button"
                      disabled={diet.tex === 'npo'}
                      onClick={() => handleToggleRestriction(res.k)}
                      className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                        active
                          ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      {active && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                      <span>{res.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Physician & Allergy */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="sheet-doctor"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  แพทย์ผู้สั่งแผนอาหาร <span className="text-rose-600">*</span>
                  {dietChanged && (
                    <span className="ml-1.5 font-medium text-amber-700 dark:text-amber-400">
                      (มีการเปลี่ยนแผน · กรุณายืนยันชื่อแพทย์)
                    </span>
                  )}
                </label>
                <input
                  id="sheet-doctor"
                  type="text"
                  value={diet.doctor}
                  onChange={(e) => setDiet({ ...diet, doctor: e.target.value })}
                  placeholder="ระบุชื่อแพทย์ เช่น นพ.วิชัย ..."
                  className={`mt-1.5 min-h-[42px] w-full rounded-xl border bg-white px-3 text-sm text-slate-900 focus:outline-none dark:bg-slate-950 dark:text-slate-100 ${
                    dietChanged && !diet.doctor.trim()
                      ? 'border-rose-500 ring-1 ring-rose-500/40'
                      : 'border-slate-300 focus:border-teal-600 dark:border-slate-700'
                  }`}
                />
                <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  บันทึกล่าสุดเมื่อ {initialDiet.date}
                </div>
              </div>

              <div>
                <label
                  htmlFor="sheet-allergy"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  ประวัติแพ้อาหาร / สิ่งที่ห้ามรับประทาน
                </label>
                <input
                  id="sheet-allergy"
                  type="text"
                  value={allergy}
                  onChange={(e) => setAllergy(e.target.value)}
                  placeholder="ไม่มี หรือระบุชนิดอาหารที่แพ้"
                  className="mt-1.5 min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>
          </section>

          {/* Section 2: Tube Feeding (BD) */}
          {diet.tex === 'bd' && (
            <section className="rounded-xl border border-cyan-200 bg-cyan-50/50 p-4 dark:border-cyan-900/60 dark:bg-cyan-950/25">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-cyan-700 dark:text-cyan-400" aria-hidden="true" />
                  <h3 className="text-sm font-bold text-cyan-950 dark:text-cyan-100">
                    รายละเอียดอาหารทางสายยาง (BD)
                  </h3>
                </div>
                {dailyTubeVolume > 0 && (
                  <span className="font-mono-num text-xs font-semibold text-cyan-800 dark:text-cyan-300">
                    รวม {dailyTubeVolume.toLocaleString()} มล./วัน
                  </span>
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    touchDiet({
                      ...diet,
                      tube: { ...diet.tube, sub: 'natural' },
                    })
                  }
                  className={`min-h-[40px] rounded-lg border px-3 text-xs font-semibold transition-colors ${
                    diet.tube.sub === 'natural'
                      ? 'border-cyan-700 bg-cyan-700 text-white'
                      : 'border-cyan-200 bg-white text-slate-700 hover:bg-cyan-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                  }`}
                >
                  ปั่นผสมธรรมชาติ (Natural BD)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    touchDiet({
                      ...diet,
                      tube: { ...diet.tube, sub: 'formula' },
                    })
                  }
                  className={`min-h-[40px] rounded-lg border px-3 text-xs font-semibold transition-colors ${
                    diet.tube.sub === 'formula'
                      ? 'border-cyan-700 bg-cyan-700 text-white'
                      : 'border-cyan-200 bg-white text-slate-700 hover:bg-cyan-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                  }`}
                >
                  สูตรสำเร็จรูปทางการแพทย์
                </button>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {diet.tube.sub === 'natural' ? (
                  <div>
                    <label
                      htmlFor="tube-kcal"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      ความเข้มข้น (kcal/มล.) <span className="text-rose-600">*</span>
                    </label>
                    <input
                      id="tube-kcal"
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="2"
                      value={diet.tube.kcal}
                      onChange={(e) =>
                        touchDiet({
                          ...diet,
                          tube: {
                            ...diet.tube,
                            kcal: e.target.value === '' ? '' : parseFloat(e.target.value),
                          },
                        })
                      }
                      className="font-mono-num mt-1 min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                    />
                  </div>
                ) : (
                  <div>
                    <label
                      htmlFor="tube-formula"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      เลือกสูตรสำเร็จรูป <span className="text-rose-600">*</span>
                    </label>
                    <select
                      id="tube-formula"
                      value={diet.tube.formula}
                      onChange={(e) =>
                        touchDiet({
                          ...diet,
                          tube: { ...diet.tube, formula: e.target.value },
                        })
                      }
                      className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                    >
                      <option value="">-- เลือกสูตรอาหาร --</option>
                      {FORMULAS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    ชนิดสายให้อาหาร
                  </span>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    {(['NG', 'PEG'] as const).map((line) => (
                      <button
                        key={line}
                        type="button"
                        onClick={() =>
                          touchDiet({ ...diet, tube: { ...diet.tube, line } })
                        }
                        className={`min-h-[40px] rounded-lg border text-xs font-semibold ${
                          diet.tube.line === line
                            ? 'border-cyan-700 bg-cyan-700 text-white'
                            : 'border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                        }`}
                      >
                        {line === 'NG' ? 'NG (ทางจมูก)' : 'PEG (หน้าท้อง)'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  วิธีการให้
                </span>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {(
                    [
                      ['bolus', 'Bolus (ให้เป็นมื้อ)'],
                      ['continuous', 'Continuous (หยดต่อเนื่อง)'],
                    ] as const
                  ).map(([mKey, mLabel]) => (
                    <button
                      key={mKey}
                      type="button"
                      onClick={() =>
                        touchDiet({ ...diet, tube: { ...diet.tube, method: mKey } })
                      }
                      className={`min-h-[40px] rounded-lg border text-xs font-semibold ${
                        diet.tube.method === mKey
                          ? 'border-cyan-700 bg-cyan-700 text-white'
                          : 'border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                      }`}
                    >
                      {mLabel}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2.5">
                <div>
                  <label
                    htmlFor="tube-vol"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    ปริมาณ/มื้อ (มล.) *
                  </label>
                  <input
                    id="tube-vol"
                    type="number"
                    min="0"
                    value={diet.tube.vol}
                    onChange={(e) =>
                      touchDiet({
                        ...diet,
                        tube: {
                          ...diet.tube,
                          vol: e.target.value === '' ? '' : parseFloat(e.target.value),
                        },
                      })
                    }
                    className="font-mono-num mt-1 min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label
                    htmlFor="tube-times"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    จำนวนมื้อ/วัน *
                  </label>
                  <input
                    id="tube-times"
                    type="number"
                    min="1"
                    value={diet.tube.times}
                    onChange={(e) =>
                      touchDiet({
                        ...diet,
                        tube: {
                          ...diet.tube,
                          times: e.target.value === '' ? '' : parseFloat(e.target.value),
                        },
                      })
                    }
                    className="font-mono-num mt-1 min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label
                    htmlFor="tube-flush"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    น้ำล้างสาย (มล.) *
                  </label>
                  <input
                    id="tube-flush"
                    type="number"
                    min="0"
                    value={diet.tube.flush}
                    onChange={(e) =>
                      touchDiet({
                        ...diet,
                        tube: {
                          ...diet.tube,
                          flush: e.target.value === '' ? '' : parseFloat(e.target.value),
                        },
                      })
                    }
                    className="font-mono-num mt-1 min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>
              </div>
            </section>
          )}

          {/* Section 3: Isolation Room Protocol */}
          {bed.zone === 'iso' && iso && (
            <section className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-900/60 dark:bg-violet-950/25">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-violet-700 dark:text-violet-400" aria-hidden="true" />
                <h3 className="text-sm font-bold text-violet-950 dark:text-violet-100">
                  มาตรการห้องแยกโรค (Isolation Protocol)
                </h3>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {(Object.keys(ISOLATION_TYPES) as IsolationType[]).map((typeKey) => (
                  <button
                    key={typeKey}
                    type="button"
                    onClick={() => setIso({ ...iso, type: typeKey })}
                    className={`min-h-[38px] rounded-lg border px-3 text-xs font-semibold transition-colors ${
                      iso.type === typeKey
                        ? 'border-violet-700 bg-violet-700 text-white'
                        : 'border-violet-200 bg-white text-slate-700 hover:bg-violet-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                    }`}
                  >
                    {ISOLATION_TYPES[typeKey].label}
                  </button>
                ))}
              </div>
              <p className="mt-2.5 text-xs leading-relaxed text-violet-900/80 dark:text-violet-300">
                ใช้ภาชนะแบบใช้ครั้งเดียวทิ้งทั้งหมด (ถาด ช้อน แก้ว) · เจ้าหน้าที่ครัววางอาหารไว้หน้าห้องเท่านั้น ห้ามเข้าห้องผู้ป่วย · เริ่มแยกโรค {iso.start}
              </p>
            </section>
          )}

          {/* Section 4: Meal Specific Options */}
          {diet.tex !== 'npo' ? (
            <section className="border-t border-slate-200 pt-5 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                2. รายละเอียดเฉพาะ{mealName}
              </h3>

              {isRiceAllowed(diet) ? (
                <div className="mt-3">
                  <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    ประเภทข้าว
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {allowedRiceValues.map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setOrder({ ...order, rice: val })}
                        className={`min-h-[40px] rounded-lg border px-4 text-sm font-semibold transition-colors ${
                          order.rice === val
                            ? 'border-teal-700 bg-teal-700 text-white dark:border-teal-600 dark:bg-teal-600'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200'
                        }`}
                      >
                        {getRiceLabel(val)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  แผนอาหารชนิดนี้ไม่ระบุประเภทข้าวเพิ่มเติม เพื่อป้องกันความคลาดเคลื่อนทางการแพทย์
                </p>
              )}

              <div className="mt-3.5">
                <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  ปริมาณต่อมื้อ
                </span>
                <div className="mt-1.5 flex gap-2">
                  {(
                    [
                      ['normal', 'ปริมาณปกติ'],
                      ['small', 'ปริมาณน้อย'],
                    ] as const
                  ).map(([pKey, pLabel]) => (
                    <button
                      key={pKey}
                      type="button"
                      onClick={() => setOrder({ ...order, portion: pKey })}
                      className={`min-h-[40px] rounded-lg border px-4 text-sm font-semibold transition-colors ${
                        order.portion === pKey
                          ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200'
                      }`}
                    >
                      {pLabel}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3.5">
                <label
                  htmlFor="sheet-note"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  หมายเหตุเพิ่มเติมถึงฝ่ายโภชนาการ
                </label>
                <input
                  id="sheet-note"
                  type="text"
                  value={order.note}
                  onChange={(e) => setOrder({ ...order, note: e.target.value })}
                  placeholder="เช่น ไม่ใส่ผักชี, แยกน้ำซุป, อุ่นร้อนพิเศษ"
                  className="mt-1.5 min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              {bed.zone === 'sp' && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 dark:border-amber-900/60 dark:bg-amber-950/25">
                  <div>
                    <div className="text-sm font-bold text-amber-950 dark:text-amber-200">
                      อาหารญาติ / ผู้ดูแล (ห้องพิเศษ)
                    </div>
                    <div className="text-xs text-amber-800/80 dark:text-amber-300/80">
                      ส่งถึงห้องผู้ป่วยพร้อมถาดหลัก · คิดค่าบริการเพิ่มเติม
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setOrder({ ...order, rel: Math.max(0, order.rel - 1) })
                      }
                      aria-label="ลดจำนวนชุดอาหารญาติ"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-amber-300 bg-white text-slate-800 hover:bg-amber-50 dark:border-amber-800 dark:bg-slate-900 dark:text-slate-100"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="font-mono-num w-8 text-center text-lg font-bold text-slate-900 dark:text-slate-100">
                      {order.rel}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setOrder({ ...order, rel: Math.min(5, order.rel + 1) })
                      }
                      aria-label="เพิ่มจำนวนชุดอาหารญาติ"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-amber-300 bg-white text-slate-800 hover:bg-amber-50 dark:border-amber-800 dark:bg-slate-900 dark:text-slate-100"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      ชุด
                    </span>
                  </div>
                </div>
              )}
            </section>
          ) : (
            <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/80 p-4 dark:border-rose-900/60 dark:bg-rose-950/30">
              <Ban className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />
              <div>
                <div className="text-sm font-bold text-rose-900 dark:text-rose-200">
                  งดอาหารและน้ำทางปาก (NPO)
                </div>
                <p className="mt-0.5 text-xs text-rose-800/80 dark:text-rose-300/80">
                  ไม่ต้องสั่งอาหารมื้อนี้ ระบบจะแจ้งฝ่ายโภชนาการให้ทราบว่าเตียงนี้งดอาหาร
                </p>
              </div>
            </div>
          )}

          {/* Post-Cutoff Urgent Reason */}
          {isLocked && (
            <section className="rounded-xl border border-amber-300 bg-amber-50/70 p-4 dark:border-amber-800 dark:bg-amber-950/30">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-950 dark:text-amber-200">
                <Clock className="h-4 w-4 text-amber-700 dark:text-amber-400" aria-hidden="true" />
                <span>บันทึกแก้ไขด่วน (เลยเวลาตัดรอบรับออเดอร์)</span>
              </div>
              <label
                htmlFor="sheet-urgent"
                className="mt-2 block text-xs font-semibold text-amber-900 dark:text-amber-300"
              >
                ระบุเหตุผลการแก้ไขด่วนเพื่อแจ้งห้องครัว <span className="text-rose-600">*</span>
              </label>
              <input
                id="sheet-urgent"
                type="text"
                value={urgentReason}
                onChange={(e) => {
                  setUrgentReason(e.target.value);
                  setErrors([]);
                }}
                placeholder="เช่น แพทย์ปรับคำสั่งอาหารหลังตรวจเยี่ยมหอผู้ป่วย"
                className="mt-1.5 min-h-[42px] w-full rounded-xl border border-amber-300 bg-white px-3 text-sm text-slate-900 focus:border-amber-600 focus:outline-none dark:border-amber-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </section>
          )}

          {/* Validation Errors */}
          {errors.length > 0 && (
            <div
              className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300"
              role="alert"
            >
              <ul className="list-disc space-y-1 pl-4">
                {errors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Audit Log */}
          {bed.log && bed.log.length > 0 && (
            <section className="border-t border-slate-200 pt-4 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400">
                ประวัติการบันทึกคำสั่งล่าสุด
              </h3>
              <ul className="mt-2 space-y-1.5">
                {bed.log
                  .slice(-4)
                  .reverse()
                  .map((entry, i) => (
                    <li
                      key={`${entry.t}-${i}`}
                      className="flex items-baseline gap-2 text-xs text-slate-600 dark:text-slate-400"
                    >
                      <span className="font-mono-num shrink-0 font-medium text-slate-500">
                        {entry.t}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="shrink-0 font-semibold text-slate-700 dark:text-slate-300">
                        {entry.u}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{entry.x}</span>
                    </li>
                  ))}
              </ul>
            </section>
          )}

          {/* Discharge Section */}
          <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            {!confirmDischarge ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    จำหน่ายผู้ป่วยออกจากเตียง (กลับบ้านแล้ว)
                  </h3>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    ย้ายข้อมูลเข้าช่องผู้ป่วยกลับบ้านแล้ว ยกเลิกมื้อคงค้าง และคืนเตียงว่างเพื่อรับผู้ป่วยใหม่
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmDischarge(true)}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-rose-800 dark:hover:text-rose-400"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>จำหน่ายผู้ป่วย (กลับบ้านแล้ว)</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs font-semibold text-rose-800 dark:text-rose-300">
                  ยืนยันว่าผู้ป่วย {bed.name} กลับบ้านแล้ว และคืนเตียงว่าง?
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDischarge(false)}
                    className="min-h-[36px] rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={() => onDischargePatient(bed.id)}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 text-xs font-bold text-white hover:bg-rose-700"
                  >
                    <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>ยืนยันกลับบ้านแล้ว</span>
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Sticky Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex flex-wrap items-center gap-2">
            {prevMeal && diet.tex !== 'npo' && (
              <button
                type="button"
                onClick={handleCopyPreviousMeal}
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                <span>คัดลอกจาก{prevMeal.n}</span>
              </button>
            )}
            {existingOrder && !isLocked && initialOrder.st === 'ordered' && (
              <button
                type="button"
                onClick={() => onCancelOrder(bed.id)}
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-50 dark:border-rose-900 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-rose-950/40"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>ยกเลิกออเดอร์มื้อนี้</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            className={`min-h-[44px] flex-1 rounded-xl px-6 text-sm font-bold text-white transition-colors sm:flex-initial ${
              diet.tex === 'npo'
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500'
            }`}
          >
            {diet.tex === 'npo'
              ? 'บันทึกงดอาหาร (NPO)'
              : isLocked
                ? 'ส่งคำสั่งแก้ไขด่วน'
                : existingOrder
                  ? 'บันทึกการแก้ไข'
                  : 'ยืนยันสั่งอาหาร'}
          </button>
        </div>
      </div>

      {/* Fullscreen Sticker Lightbox */}
      {zoomSticker && bed.stickerImage && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/85 p-4"
          onClick={() => setZoomSticker(false)}
          role="dialog"
          aria-modal="true"
          aria-label="ภาพสติกเกอร์ผู้ป่วยขนาดเต็ม"
        >
          <div className="relative max-h-[90vh] max-w-3xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 p-2">
            <button
              type="button"
              onClick={() => setZoomSticker(false)}
              aria-label="ปิดภาพขยาย"
              className="absolute top-3 right-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900/90 text-white hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={bed.stickerImage}
              alt={`ภาพสติกเกอร์ผู้ป่วย ${bed.name ?? bed.label}`}
              className="max-h-[85vh] w-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};
