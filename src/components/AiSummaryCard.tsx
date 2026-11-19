import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  Sparkles,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  Printer,
  RefreshCw,
  MessageSquareText,
  TrendingUp,
  Award,
  AlertTriangle,
  Compass,
} from 'lucide-react';

export interface AiExecutiveSummary {
  overview: string;
  strengths: string[];
  urgentImprovements: string[];
  policyRecommendations: string[];
}

export interface AiSummaryCardHandle {
  triggerAnalysis: () => void;
}

interface AiSummaryCardProps {
  filterSummary: {
    year: string;
    month: string;
    faculty: string;
    department: string;
  };
  totalCompletedCount: number;
  totalSentCount: number;
  responseRate: number;
  compositeMean: number;
  tqfMean: number;
  identityMean: number;
  dnaMean: number;
  attributeSummary: { id: number; label: string; mean: number }[];
  topStrengths: [string, number][];
  topSkillsToImprove: [string, number][];
  topNeededMajors: [string, number][];
  topCoreSkills: [string, number][];
  topOrgTypes: [string, number][];
  topSelectionCriteria: [string, number][];
  experienceDemand: {
    yesCount: number;
    noCount: number;
    avgMonths: number;
  };
  suggestions: { id: string; text: string; faculty: string; date: string }[];
  onLoadingChange?: (loading: boolean) => void;
  onNotify?: (text: string, type?: 'success' | 'error' | 'info') => void;
}

const AiSummaryCard = forwardRef<AiSummaryCardHandle, AiSummaryCardProps>(function AiSummaryCard(
  {
    filterSummary,
    totalCompletedCount,
    totalSentCount,
    responseRate,
    compositeMean,
    tqfMean,
    identityMean,
    dnaMean,
    attributeSummary,
    topStrengths,
    topSkillsToImprove,
    topNeededMajors,
    topCoreSkills,
    topOrgTypes,
    topSelectionCriteria,
    experienceDemand,
    suggestions,
    onLoadingChange,
    onNotify,
  },
  ref
) {
  const [summary, setSummary] = useState<AiExecutiveSummary | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Reset AI summary whenever active filters or underlying filtered counts change
  useEffect(() => {
    setSummary(null);
    setGeneratedAt(null);
    setErrorMsg('');
    setCopied(false);
  }, [
    filterSummary.year,
    filterSummary.month,
    filterSummary.faculty,
    filterSummary.department,
    totalCompletedCount,
    suggestions.length,
  ]);

  useEffect(() => {
    onLoadingChange?.(isLoading);
  }, [isLoading, onLoadingChange]);

  const hasResponses = totalCompletedCount > 0;

  const handleGenerateSummary = async () => {
    if (!hasResponses) {
      onNotify?.('กรุณาเลือกตัวกรองที่มีข้อมูลแบบสำรวจอย่างน้อย 1 รายการเพื่อทำการวิเคราะห์ด้วย AI', 'info');
      return;
    }
    if (isLoading) return;

    setIsLoading(true);
    setErrorMsg('');
    setCopied(false);

    try {
      const res = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filterSummary,
          totalCompletedCount,
          totalSentCount,
          responseRate,
          compositeMean,
          tqfMean,
          identityMean,
          dnaMean,
          attributeSummary,
          topStrengths,
          topSkillsToImprove,
          topNeededMajors,
          topCoreSkills,
          topOrgTypes,
          topSelectionCriteria,
          experienceDemand,
          suggestions: suggestions.map((s) => ({ text: s.text, faculty: s.faculty })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'ไม่สามารถสร้างบทสรุปจาก Gemini AI ได้ในขณะนี้');
      }

      if (!data?.summary) {
        throw new Error('รูปแบบข้อมูลตอบกลับจาก AI ไม่สมบูรณ์ กรุณาลองใหม่อีกครั้ง');
      }

      setSummary(data.summary);
      setGeneratedAt(data.generatedAt || new Date().toISOString());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อบริการ Gemini AI';
      setErrorMsg(msg);
      onNotify?.(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    triggerAnalysis: () => {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      void handleGenerateSummary();
    },
  }));

  const buildPlainTextReport = () => {
    if (!summary) return '';
    const scopeLine = `ปีการศึกษา: ${filterSummary.year} | เดือน: ${filterSummary.month} | คณะ: ${filterSummary.faculty} | สาขาวิชา: ${filterSummary.department}`;
    const formatBullets = (items: string[]) => items.map((item, i) => `  ${i + 1}. ${item}`).join('\n');

    return [
      'รายงานสรุปผู้บริหาร (AI Executive Summary) - มหาวิทยาลัยกรุงเทพ',
      scopeLine,
      `จำนวนผู้ประเมิน: ${totalCompletedCount} ราย | ค่าเฉลี่ยรวม: ${compositeMean.toFixed(2)}/5.00 | ข้อเสนอแนะที่วิเคราะห์: ${suggestions.length} รายการ`,
      '',
      '1. ภาพรวมและจุดเด่นของบัณฑิต (Executive Insights)',
      summary.overview,
      formatBullets(summary.strengths),
      '',
      '2. จุดที่ควรพัฒนาเร่งด่วนตามเสียงสะท้อนของผู้ประกอบการ',
      formatBullets(summary.urgentImprovements),
      '',
      '3. ข้อเสนอแนะเชิงยุทธศาสตร์ (Strategic Recommendations)',
      formatBullets(summary.policyRecommendations),
    ].join('\n');
  };

  const handleCopyReport = async () => {
    const text = buildPlainTextReport();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onNotify?.('คัดลอกรายงาน AI ไปยังคลิปบอร์ดเรียบร้อยแล้ว', 'success');
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      onNotify?.('ไม่สามารถคัดลอกข้อความอัตโนมัติได้ กรุณาเลือกข้อความเพื่อคัดลอก', 'error');
    }
  };

  const handlePrintReport = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div
      id="ai-executive-summary"
      ref={cardRef}
      className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden font-sans print:shadow-none print:border-slate-300"
    >
      {/* Header Bar */}
      <div className="px-5 py-4 sm:px-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-[#fff8f4] to-white">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#F26522]/10 text-[#F26522]">
              <Sparkles className="w-4 h-4" />
            </span>
            <h3 className="font-sans text-lg font-bold text-slate-900 leading-[1.6]">
              AI Executive Summary
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-orange-50 text-[#F26522] border border-orange-100">
              Gemini AI
            </span>
          </div>
          <p className="text-sm sm:text-base text-slate-600 font-normal leading-[1.6]">
            สังเคราะห์บทสรุปผู้บริหาร จุดเด่น จุดพัฒนาเร่งด่วน และข้อเสนอแนะเชิงยุทธศาสตร์จากข้อมูลตามตัวกรองปัจจุบัน
          </p>
        </div>

        {/* Action Trigger Button */}
        {hasResponses && (
          <div className="flex flex-wrap items-center gap-2 shrink-0 print:hidden">
            <button
              type="button"
              onClick={handleGenerateSummary}
              disabled={isLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#F26522] hover:bg-[#e05313] disabled:opacity-60 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-[0.98] cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI กำลังสังเคราะห์และวิเคราะห์ข้อมูลเชิงลึก...</span>
                </>
              ) : summary ? (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>วิเคราะห์ใหม่อีกครั้ง</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>✨ สรุปและวิเคราะห์ผลด้วย Gemini AI</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Body Content States */}
      <div className="p-5 sm:p-6">
        {/* Empty State */}
        {!hasResponses && (
          <div className="py-8 px-4 text-center bg-slate-50/70 rounded-xl border border-dashed border-slate-200 space-y-2">
            <MessageSquareText className="w-9 h-9 text-slate-400 mx-auto" />
            <p className="text-base font-semibold text-slate-800 leading-[1.6]">
              กรุณาเลือกตัวกรองที่มีข้อมูลแบบสำรวจอย่างน้อย 1 รายการเพื่อทำการวิเคราะห์ด้วย AI
            </p>
            <p className="text-base text-slate-600 font-normal max-w-md mx-auto leading-[1.6]">
              ลองปรับเลือกปีการศึกษา เดือน คณะ หรือสาขาวิชาที่มีผลตอบกลับ เพื่อสร้างบทสรุปผู้บริหารด้วย Gemini AI
            </p>
          </div>
        )}

        {/* Ready Idle State */}
        {hasResponses && !isLoading && !errorMsg && !summary && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/70 rounded-xl p-4 border border-slate-100">
            <div className="space-y-1 text-base text-slate-700 leading-[1.6]">
              <p className="font-semibold text-slate-800 leading-[1.6]">
                พร้อมวิเคราะห์ข้อมูลจากการประเมิน{' '}
                <strong className="text-[#F26522] font-bold tabular-nums">{totalCompletedCount}</strong> รายการ
                {suggestions.length > 0 && (
                  <>
                    {' '}และข้อเสนอแนะเพิ่มเติม{' '}
                    <strong className="text-[#F26522] font-bold tabular-nums">{suggestions.length}</strong> ความคิดเห็น
                  </>
                )}
              </p>
              <p className="text-slate-600 font-normal leading-[1.6]">
                คลิกปุ่ม &quot;✨ สรุปและวิเคราะห์ผลด้วย Gemini AI&quot; เพื่อสร้างบทสรุปผู้บริหารและแนวทางพัฒนาหลักสูตรแบบ Real-time
              </p>
            </div>
          </div>
        )}

        {/* Loading Skeleton State */}
        {isLoading && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2.5 text-sm sm:text-base font-semibold text-[#F26522]">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>AI กำลังสังเคราะห์และวิเคราะห์ข้อมูลเชิงลึก...</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 space-y-2.5">
                  <div className="h-4 w-44 bg-slate-200 rounded" />
                  <div className="h-3 w-full bg-slate-200/80 rounded" />
                  <div className="h-3 w-5/6 bg-slate-200/80 rounded" />
                  <div className="h-3 w-4/6 bg-slate-200/80 rounded" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {!isLoading && errorMsg && (
          <div
            role="alert"
            className="bg-rose-50 border border-rose-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-base font-bold text-rose-800 leading-[1.6]">ไม่สามารถสร้างบทสรุป AI ได้</p>
                <p className="text-base text-rose-700 font-normal leading-[1.6]">{errorMsg}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleGenerateSummary}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-semibold transition-colors shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>ลองใหม่อีกครั้ง</span>
            </button>
          </div>
        )}

        {/* Success Executive Summary View */}
        {!isLoading && !errorMsg && summary && (
          <div className="space-y-5">
            {/* Scope & Action Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="text-sm text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>
                  สังเคราะห์จากแบบประเมิน <strong className="text-slate-800 tabular-nums">{totalCompletedCount}</strong> รายการ
                  {suggestions.length > 0 && (
                    <> (ข้อเสนอแนะ <strong className="text-slate-800 tabular-nums">{suggestions.length}</strong> รายการ)</>
                  )}
                </span>
                {generatedAt && (
                  <span className="tabular-nums">
                    • อัปเดตเมื่อ {new Date(generatedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 print:hidden">
                <button
                  type="button"
                  onClick={handleCopyReport}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700">คัดลอกแล้ว</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-600" />
                      <span>คัดลอกรายงาน AI</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handlePrintReport}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                  <span>พิมพ์รายงาน</span>
                </button>
              </div>
            </div>

            {/* 1. ภาพรวมและจุดเด่นของบัณฑิต (Executive Insights) */}
            <div className="rounded-xl bg-[#fcf8f5] border border-orange-100 p-4 sm:p-5 space-y-4">
              <h4 className="font-sans text-base font-bold text-slate-900 flex items-center gap-2 leading-[1.6]">
                <TrendingUp className="w-4 h-4 text-[#F26522] shrink-0" />
                <span>1. ภาพรวมและจุดเด่นของบัณฑิต (Executive Insights)</span>
              </h4>
              <p className="text-base text-slate-700 leading-[1.6] font-normal">
                {summary.overview}
              </p>
              {summary.strengths.length > 0 && (
                <div className="rounded-lg bg-white/80 border border-emerald-100 p-3.5 sm:p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-sm sm:text-base font-bold text-emerald-900">
                    <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>จุดเด่นสำคัญที่องค์กรชื่นชม</span>
                  </div>
                  <ul className="space-y-1.5 text-base text-slate-700 font-normal leading-[1.6]">
                    {summary.strengths.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* 2 & 3. Urgent Improvements + Strategic Recommendations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* 2. Urgent Improvements */}
              <div className="rounded-xl border border-amber-200/70 bg-amber-50/40 p-4 sm:p-5 space-y-3">
                <h4 className="font-sans text-base font-bold text-amber-900 flex items-center gap-2 leading-[1.6]">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>2. จุดที่ควรพัฒนาเร่งด่วนตามเสียงสะท้อนของผู้ประกอบการ</span>
                </h4>
                <ul className="space-y-2 text-base text-slate-700 font-normal leading-[1.6]">
                  {summary.urgentImprovements.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 3. Strategic Recommendations */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 sm:p-5 space-y-3">
                <h4 className="font-sans text-base font-bold text-indigo-900 flex items-center gap-2 leading-[1.6]">
                  <Compass className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>3. ข้อเสนอแนะเชิงยุทธศาสตร์ (Strategic Recommendations)</span>
                </h4>
                <ul className="space-y-2 text-base text-slate-700 font-normal leading-[1.6]">
                  {summary.policyRecommendations.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default AiSummaryCard;
