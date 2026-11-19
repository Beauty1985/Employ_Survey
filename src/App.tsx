import React, { useState } from 'react';
import SurveyForm from './components/SurveyForm';
import AdminDashboard from './components/AdminDashboard';
import { LayoutDashboard, Award, ClipboardCheck, GraduationCap } from 'lucide-react';

export function getAcademicYearInfo(date?: Date): { ayYear: string; thaiYear: string } {
  let effectiveDate = date;
  if (!effectiveDate && typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const ayParam = params.get('ay');
    if (ayParam && /^\d{4}$/.test(ayParam)) {
      const yearNum = Number(ayParam);
      const ceYear = yearNum >= 2400 ? yearNum - 543 : yearNum;
      return {
        ayYear: String(ceYear),
        thaiYear: String(ceYear + 543),
      };
    }
    const dateParam = params.get('date');
    if (dateParam) {
      const parsed = new Date(dateParam);
      if (!Number.isNaN(parsed.getTime())) {
        effectiveDate = parsed;
      }
    }
  }
  const targetDate = effectiveDate || new Date();
  const gregorianYear = targetDate.getFullYear();
  const month = targetDate.getMonth(); // 0 = Jan, 6 = Jul, 7 = Aug, 11 = Dec
  // Academic year cycle: Aug (month >= 7) through Jul (month <= 6)
  const ceAcademicYear = month >= 7 ? gregorianYear : gregorianYear - 1;
  return {
    ayYear: String(ceAcademicYear),
    thaiYear: String(ceAcademicYear + 543),
  };
}

export function getCurrentAcademicYear(date?: Date): string {
  return getAcademicYearInfo(date).thaiYear;
}

export default function App() {
  const [viewMode, setViewMode] = useState<'survey' | 'admin'>('survey');
  const { ayYear, thaiYear } = getAcademicYearInfo();

  return (
    <div id="app-root" className="w-full min-h-screen m-0 p-0 overflow-x-hidden flex flex-col bg-[#F8F9FA] font-sans">
      {/* Top BU Luxury Header Bar */}
      <header className="w-full bg-[#F26522] text-white px-4 sm:px-8 py-3 shadow-md sticky top-0 z-50 print:hidden">
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          
          {/* BU Brand representation */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center font-bold text-[#F26522] text-xl shadow-inner shrink-0">
              BU
            </div>
            <div>
              <h1 className="font-sans text-base sm:text-lg font-bold leading-[1.6]">
                แบบสำรวจคุณภาพบัณฑิต (Graduate Quality Survey)
              </h1>
              <p className="text-sm text-white/95 font-normal leading-[1.6]">
                มหาวิทยาลัยกรุงเทพ • ปีการศึกษา {thaiYear}
              </p>
            </div>
          </div>

          {/* Mode Switcher Buttons */}
          <div className="flex items-center space-x-1.5 bg-white/10 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setViewMode('survey')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                viewMode === 'survey'
                  ? 'bg-white text-[#F26522] shadow-sm font-bold'
                  : 'text-white hover:text-white/80 hover:bg-white/10'
              }`}
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>ทำแบบสำรวจ</span>
            </button>
            <button
              onClick={() => setViewMode('admin')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                viewMode === 'admin'
                  ? 'bg-slate-900 text-white shadow-sm font-bold'
                  : 'text-white hover:text-white/80 hover:bg-white/10'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>ผู้ดูแลระบบ (Admin)</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Workspace */}
      <main className="flex-1 w-full min-w-0">
        {viewMode === 'survey' ? (
          <div className="py-6 sm:py-8 w-full">
            <div className="w-full max-w-4xl lg:max-w-6xl mx-auto px-4 sm:px-6 text-center space-y-2.5 mb-6">
              <p className="font-sans text-sm sm:text-base tracking-wide font-semibold text-bu-orange leading-[1.6]">
                <span className="block">Employer Satisfaction Survey on Graduate Quality</span>
                <span className="block">Bangkok University, AY{ayYear}</span>
              </p>
              <h2 className="font-sans text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-[1.6]">
                แบบสำรวจความคิดเห็นของผู้บังคับบัญชาต่อคุณภาพของบัณฑิต
              </h2>
              <p className="text-sm text-slate-700 max-w-5xl mx-auto font-normal leading-[1.6]">
                <span className="font-sans block text-lg sm:text-xl font-semibold text-slate-800 mb-2 leading-[1.6]">มหาวิทยาลัยกรุงเทพ ปีการศึกษา {thaiYear}</span>
                <span className="block text-sm text-slate-700 font-normal leading-[1.6]">
                  แบบสำรวจนี้มีความสำคัญต่อการพัฒนาหลักสูตรให้ผลิตบัณฑิตที่มีคุณภาพ ตรงตามความต้องการของผู้ใช้บัณฑิตและสอดคล้องกับทิศทาง<br className="hidden md:inline" />การพัฒนากำลังคนของประเทศ มหาวิทยาลัยจึงขอความอนุเคราะห์ท่านให้ข้อมูลตามความเป็นจริงและครบถ้วนทุกข้อ
                </span>
              </p>
            </div>
            <SurveyForm />
          </div>
        ) : (
          <AdminDashboard />
        )}
      </main>

      {/* Branded Footer */}
      <footer className="w-full bg-white border-t border-slate-100 py-6 mt-12 text-center text-base text-slate-600 font-sans leading-[1.6] print:hidden">
        <div className="w-full px-4 sm:px-8 space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <Award className="w-4 h-4 text-bu-orange" />
            <span className="font-semibold text-slate-700">สำนักมาตรฐานคุณภาพการศึกษา มหาวิทยาลัยกรุงเทพ</span>
          </div>
          <p className="text-sm sm:text-base font-normal text-slate-600 leading-[1.6]">© {new Date().getFullYear()} Bangkok University. All Rights Reserved. Designed for Academic Premium Excellence.</p>
        </div>
      </footer>
    </div>
  );
}
