import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, RefreshCw, Upload, X } from 'lucide-react';
import type { BedPatient } from '../types/hospital';
import {
  fileToResizedDataUrl,
  resizeCanvasToDataUrl,
} from '../utils/stickerCapture';

interface StickerCaptureModalProps {
  bed: BedPatient;
  onClose: () => void;
  onConfirm: (payload: { bedId: string; stickerImage: string }) => void;
}

export const StickerCaptureModal: React.FC<StickerCaptureModalProps> = ({
  bed,
  onClose,
  onConfirm,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        'เบราว์เซอร์นี้ไม่รองรับการเปิดกล้องสด กรุณาใช้ปุ่ม “ถ่ายภาพ / เลือกรูปสติกเกอร์” ด้านล่าง'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch {
      setCameraError(
        'ไม่สามารถเข้าถึงกล้องได้โดยตรง (ยังสามารถใช้ปุ่มถ่ายภาพจากกล้องอุปกรณ์หรืออัปโหลดรูปด้านล่างได้)'
      );
      setCameraActive(false);
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const handleSnapVideo = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    try {
      const dataUrl = resizeCanvasToDataUrl(
        video,
        video.videoWidth,
        video.videoHeight
      );
      stopCamera();
      setCapturedImage(dataUrl);
    } catch (err) {
      setCameraError(
        err instanceof Error ? err.message : 'ไม่สามารถบันทึกภาพจากกล้องได้'
      );
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      stopCamera();
      setCapturedImage(dataUrl);
    } catch (err) {
      setCameraError(
        err instanceof Error ? err.message : 'ไม่สามารถอ่านไฟล์ภาพที่เลือกได้'
      );
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const bedTitle = bed.zone === 'gen' ? `เตียง ${bed.label}` : bed.label;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopCamera();
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`ถ่ายภาพสติกเกอร์ผู้ป่วย ${bedTitle}`}
    >
      <div className="flex max-h-[94vh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {bed.occ
                ? `ถ่ายภาพสติกเกอร์ผู้ป่วย · ${bedTitle}`
                : `รับผู้ป่วยเข้า${bedTitle} ด้วยภาพสติกเกอร์`}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              บันทึกภาพสติกเกอร์อย่างเดียวไม่ต้องพิมพ์ข้อมูล และส่งต่อภาพไปยังงานโภชนาการอัตโนมัติ
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            aria-label="ปิดหน้าต่าง"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {!capturedImage ? (
            <>
              {cameraActive ? (
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 dark:border-slate-800">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className="aspect-[4/3] w-full object-cover"
                  />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
                    <div className="flex h-3/4 w-full max-w-sm flex-col items-center justify-between rounded-xl border-2 border-dashed border-white/80 bg-black/10 p-3">
                      <span className="rounded-md bg-slate-950/75 px-2.5 py-1 text-xs font-semibold text-white">
                        วางสติกเกอร์ผู้ป่วยให้อยู่ในกรอบนี้
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center dark:border-slate-700 dark:bg-slate-800/40">
                  <Camera className="h-10 w-10 text-teal-700 dark:text-teal-400" aria-hidden="true" />
                  <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                    พร้อมถ่ายภาพสติกเกอร์ผู้ป่วย
                  </p>
                  {cameraError && (
                    <p className="mt-1.5 max-w-sm text-xs text-slate-500 dark:text-slate-400">
                      {cameraError}
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2.5 sm:flex-row">
                {cameraActive && (
                  <button
                    type="button"
                    onClick={handleSnapVideo}
                    className="inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-bold text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
                  >
                    <Camera className="h-4 w-4" aria-hidden="true" />
                    <span>ถ่ายภาพสติกเกอร์</span>
                  </button>
                )}

                <label
                  className={`inline-flex min-h-[46px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors ${
                    cameraActive
                      ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                      : 'bg-teal-700 text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500'
                  }`}
                >
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {cameraActive
                      ? 'เลือกรูป / กล้องอุปกรณ์'
                      : 'ถ่ายภาพด้วยกล้อง / เลือกรูปสติกเกอร์'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </>
          ) : (
            <>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950">
                <img
                  src={capturedImage}
                  alt="ภาพสติกเกอร์ผู้ป่วยที่ถ่าย"
                  className="max-h-72 w-full object-contain"
                />
              </div>

              <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-xs font-semibold text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>
                  ภาพสติกเกอร์พร้อมบันทึกเข้า{bedTitle} และส่งต่อให้ฝ่ายโภชนาการดูข้อมูลผู้ป่วยได้ทันที
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {capturedImage && (
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-200 bg-slate-50 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900/90">
            <button
              type="button"
              onClick={handleRetake}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>ถ่ายภาพใหม่</span>
            </button>

            <button
              type="button"
              onClick={() =>
                onConfirm({
                  bedId: bed.id,
                  stickerImage: capturedImage,
                })
              }
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 text-sm font-bold text-white transition-colors hover:bg-teal-800 sm:flex-initial dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <span>
                {bed.occ
                  ? 'บันทึกภาพและส่งต่อโภชนาการ'
                  : 'บันทึกภาพและเปิดสั่งอาหาร'}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
