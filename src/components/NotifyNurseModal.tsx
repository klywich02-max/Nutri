import React, { useState } from 'react';
import { X, Send } from 'lucide-react';
import type { BedPatient } from '../types/hospital';

interface NotifyNurseModalProps {
  bed: BedPatient;
  onClose: () => void;
  onSend: (bedLabel: string, message: string) => void;
}

const QUICK_REASONS = [
  'ข้อมูลคำสั่งอาหารไม่ชัดเจน กรุณาตรวจสอบ',
  'ปริมาณหรือสูตร BD ไม่สอดคล้องกับมื้อก่อนหน้า',
  'ขอตรวจสอบประวัติการแพ้อาหารเพิ่มเติม',
  'นำถาดไปส่งแล้ว ไม่พบผู้ป่วยที่เตียง',
];

export const NotifyNurseModal: React.FC<NotifyNurseModalProps> = ({
  bed,
  onClose,
  onSend,
}) => {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      setError('กรุณาเลือกหัวข้อหรือระบุข้อความก่อนส่งถึงพยาบาล');
      return;
    }
    onSend(bed.label, trimmed);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`แจ้งพยาบาล ${bed.zone === 'gen' ? `เตียง ${bed.label}` : bed.label}`}
    >
      <div className="w-full max-w-lg rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:rounded-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              ส่งข้อความแจ้งพยาบาลประจำหอผู้ป่วย
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              อ้างอิง {bed.zone === 'gen' ? `เตียง ${bed.label}` : bed.label} · {bed.name} · HN {bed.hn}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่าง"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            เลือกข้อความด่วน
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {QUICK_REASONS.map((reason) => (
              <button
                key={reason}
                type="button"
                onClick={() => {
                  setMessage(reason);
                  setError('');
                }}
                className={`rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors ${
                  message === reason
                    ? 'border-teal-600 bg-teal-50 text-teal-800 dark:border-teal-500 dark:bg-teal-950/50 dark:text-teal-300'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {reason}
              </button>
            ))}
          </div>

          <label
            htmlFor="kitchen-msg-input"
            className="mt-4 block text-sm font-semibold text-slate-800 dark:text-slate-200"
          >
            รายละเอียดข้อความถึงพยาบาล
          </label>
          <textarea
            id="kitchen-msg-input"
            rows={3}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              if (error) setError('');
            }}
            placeholder="พิมพ์ข้อความเพิ่มเติมเพื่อให้พยาบาลตรวจสอบ..."
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
          />

          {error && (
            <p className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-400" role="alert">
              {error}
            </p>
          )}

          <div className="mt-5 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-teal-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              <span>ส่งข้อความถึงพยาบาล</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
