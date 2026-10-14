import React, { useState } from 'react';
import SurveyForm from './components/SurveyForm';
import AdminDashboard from './components/AdminDashboard';
import { LayoutDashboard, Award, ClipboardCheck, GraduationCap } from 'lucide-react';

export default function App() {
  const [viewMode, setViewMode] = useState<'survey' | 'admin'>('survey');

  return (
    <div id="app-root" className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans">
      {/* Top BU Luxury Header Bar */}
      <header className="bg-[#F26522] text-white px-4 sm:px-6 py-3 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* BU Brand representation */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center font-bold text-[#F26522] text-xl shadow-inner">
              BU
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold leading-tight">
                ระบบแบบสำรวจคุณภาพบัณฑิต (Graduate Quality Survey)
              </h1>
              <p className="text-[11px] opacity-90 font-light">
                มหาวิทยาลัยกรุงเทพ • ปีการศึกษา 2568
              </p>
            </div>
          </div>

          {/* Mode Switcher Buttons */}
          <div className="flex items-center space-x-1.5 bg-white/10 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('survey')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                viewMode === 'survey'
                  ? 'bg-white text-[#F26522] shadow-sm font-bold'
                  : 'text-white hover:text-white/80 hover:bg-white/10'
              }`}
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>ทำแบบสำรวจ</span>
            </button>
            <button
              onClick={() => setViewMode('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                viewMode === 'admin'
                  ? 'bg-slate-900 text-white shadow-sm font-bold'
                  : 'text-white hover:text-white/80 hover:bg-white/10'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>ผู้ดูแลระบบ (Admin)</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Workspace */}
      <main className="flex-1">
        {viewMode === 'survey' ? (
          <div className="py-8">
            <div className="max-w-5xl lg:max-w-6xl mx-auto px-4 text-center space-y-2 mb-6">
              <span className="text-xs uppercase tracking-wider font-semibold text-bu-orange">BANGKOK UNIVERSITY QUALITY SURVEY</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight font-sans">
                แบบสำรวจความคิดเห็นของผู้บังคับบัญชาต่อคุณภาพของบัณฑิต
              </h2>
              <p className="text-sm text-slate-400 max-w-xl mx-auto font-light leading-relaxed">
                ปีการศึกษา 2568 มหาวิทยาลัยกรุงเทพ เพื่อนำข้อมูลดิบและรายงานสถิติไปใช้วางแนวทิศทางในการพัฒนาหลักสูตรการศึกษาและปรับปรุงกำลังคนของประเทศสอดคล้องความต้องการตลาด
              </p>
            </div>
            <SurveyForm />
          </div>
        ) : (
          <AdminDashboard />
        )}
      </main>

      {/* Branded Footer */}
      <footer className="bg-white border-t border-slate-100 py-6 mt-12 text-center text-xs text-slate-400 font-sans">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <Award className="w-4 h-4 text-bu-orange/60" />
            <span className="font-medium text-slate-500">สำนักมาตรฐานคุณภาพการศึกษา มหาวิทยาลัยกรุงเทพ</span>
          </div>
          <p className="font-light">© {new Date().getFullYear()} Bangkok University. All Rights Reserved. Designed for Academic Premium Excellence.</p>
        </div>
      </footer>
    </div>
  );
}
