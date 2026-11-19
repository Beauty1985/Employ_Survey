import React, { useState } from 'react';
import { collection, query, where, getDocs, getDoc, doc, writeBatch } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { Supervisor, Part1Data, Part2Data, Part3Data, SurveyResponse } from '../types';
import { getCurrentAcademicYear } from '../App';
import FormPart1 from './FormPart1';
import FormPart2 from './FormPart2';
import FormPart3 from './FormPart3';
import { CheckCircle2, Lock, ArrowRight, ClipboardList, GraduationCap, Building, AlertCircle } from 'lucide-react';

const initialPart1: Part1Data = {
  position: '',
  experience: '',
  orgType: '',
  industries: [],
  graduateDuration: ''
};

const initialPart2: Part2Data = {
  ratings: {},
  strongPoints: [],
  skillsToImprove: []
};

const initialPart3: Part3Data = {
  neededMajors: [],
  coreSkills: [],
  requiresExperience: '',
  selectionCriteria: []
};

// Helper to recursively remove undefined fields before saving to Firestore
function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const key of Object.keys(obj as Record<string, any>)) {
      const val = (obj as Record<string, any>)[key];
      if (val !== undefined) {
        cleaned[key] = cleanUndefined(val);
      }
    }
    return cleaned as T;
  }
  return obj;
}

export default function SurveyForm() {
  const [step, setStep] = useState<'login' | 'part1' | 'part2' | 'part3' | 'completed'>('login');
  const [code, setCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Loaded supervisor info
  const [supervisor, setSupervisor] = useState<Supervisor | null>(null);
  const [matchedCurrentYearSupId, setMatchedCurrentYearSupId] = useState<string | null>(null);

  // Form states
  const [part1, setPart1] = useState<Part1Data>(initialPart1);
  const [part2, setPart2] = useState<Part2Data>(initialPart2);
  const [part3, setPart3] = useState<Part3Data>(initialPart3);

  const [submittedYear, setSubmittedYear] = useState('');

  const goToStep = (nextStep: 'login' | 'part1' | 'part2' | 'part3' | 'completed') => {
    setSubmitError('');
    setStep(nextStep);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Handle survey 4-digit check
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setErrorMsg('กรุณากรอกรหัสแบบสำรวจ 4 หลัก');
      return;
    }
    if (!/^\d{4}$/.test(trimmedCode)) {
      setErrorMsg('รหัสแบบสำรวจต้องเป็นตัวเลข 4 หลักเท่านั้น');
      return;
    }

    setIsLoading(true);
    try {
      const currentAy = getCurrentAcademicYear();
      const q = query(collection(db, 'supervisors'), where('code', '==', trimmedCode));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setErrorMsg('ไม่พบรหัสแบบสำรวจนี้ในระบบ กรุณาตรวจสอบหรือติดต่อผู้ดูแลระบบ');
        return;
      }

      const matchedSupervisors: Supervisor[] = [];
      querySnapshot.forEach((docSnap) => {
        const raw = docSnap.data() as Supervisor;
        matchedSupervisors.push({
          ...raw,
          id: docSnap.id,
          academicYear: raw.academicYear || '2569'
        });
      });

      // 1. Check composite uniqueness lock for (code + currentAcademicYear)
      const completionLockRef = doc(db, 'survey_completions', `${trimmedCode}_${currentAy}`);
      const completionLockSnap = await getDoc(completionLockRef);
      if (completionLockSnap.exists()) {
        setErrorMsg('รหัสแบบสำรวจนี้ได้ถูกใช้งานเพื่อตอบแบบประเมินเรียบร้อยแล้ว');
        return;
      }

      // 2. Check supervisor record registered for the current academic year
      const currentYearSupervisor = matchedSupervisors.find((s) => s.academicYear === currentAy);
      if (currentYearSupervisor) {
        if (currentYearSupervisor.isCompleted) {
          setErrorMsg('รหัสแบบสำรวจนี้ได้ถูกใช้งานเพื่อตอบแบบประเมินเรียบร้อยแล้ว');
          return;
        }
        setSupervisor(currentYearSupervisor);
        setMatchedCurrentYearSupId(currentYearSupervisor.id || null);
        goToStep('part1');
        return;
      }

      // 3. Code exists from a previous academic year and has not been used in currentAy -> allow entry
      const sortedTemplates = [...matchedSupervisors].sort((a, b) =>
        (b.academicYear || '2569').localeCompare(a.academicYear || '2569')
      );
      const templateSupervisor = sortedTemplates[0];
      if (templateSupervisor) {
        setSupervisor({
          ...templateSupervisor,
          academicYear: currentAy,
          isCompleted: false
        });
        setMatchedCurrentYearSupId(null);
        goToStep('part1');
      }
    } catch (err) {
      setErrorMsg('เกิดข้อผิดพลาดในการตรวจสอบรหัส กรุณาลองใหม่อีกครั้ง');
      try {
        handleFirestoreError(err, OperationType.LIST, 'supervisors');
      } catch {
        // Logged via handleFirestoreError, UI displays friendly errorMsg
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Submit survey atomically using Firestore writeBatch
  const handleSurveySubmit = async () => {
    if (!supervisor || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError('');
    
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1; // 1-12
      const monthStr = String(currentMonth).padStart(2, '0');
      // Academic year (Aug-Jul cycle) honoring simulated test context if provided
      const academicYearStr = getCurrentAcademicYear();
      const isoSubmittedAt = now.toISOString();
      const lockId = `${supervisor.code}_${academicYearStr}`;

      const responsePayload: SurveyResponse = {
        academicYear: academicYearStr,
        month: monthStr,
        submittedAt: isoSubmittedAt,
        supervisorCode: supervisor.code,
        faculty: supervisor.faculty,
        curriculum: supervisor.curriculum,
        department: supervisor.department,
        part1,
        part2,
        part3
      };

      const batch = writeBatch(db);
      const completionRef = doc(db, 'survey_completions', lockId);
      batch.set(completionRef, {
        code: supervisor.code,
        academicYear: academicYearStr,
        completedAt: isoSubmittedAt
      });

      const newResponseRef = doc(collection(db, 'responses'));
      batch.set(newResponseRef, cleanUndefined(responsePayload));

      if (matchedCurrentYearSupId) {
        const supervisorRef = doc(db, 'supervisors', matchedCurrentYearSupId);
        batch.update(supervisorRef, {
          isCompleted: true,
          completedAt: isoSubmittedAt
        });
      }

      await batch.commit();

      setSubmittedYear(academicYearStr);
      goToStep('completed');
    } catch (err: any) {
      console.error('Submit survey error:', err);
      const errCode = err?.code || '';
      const errMsgText = err instanceof Error ? err.message : String(err);
      if (errCode === 'permission-denied' || errMsgText.includes('Missing or insufficient permissions')) {
        setSubmitError('รหัสแบบสำรวจนี้ได้ถูกส่งข้อมูลเสร็จสิ้นแล้ว หรือข้อมูลไม่สมบูรณ์ ไม่สามารถส่งซ้ำได้');
      } else {
        setSubmitError('ไม่สามารถส่งข้อมูลแบบประเมินได้ในขณะนี้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่อีกครั้ง');
      }
      try {
        handleFirestoreError(err, OperationType.WRITE, 'responses');
      } catch {
        // Logged via handleFirestoreError, UI displays friendly submitError banner
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Progress render helper
  const renderProgress = () => {
    if (step === 'login' || step === 'completed') return null;

    const steps = [
      { id: 'part1', title: 'ข้อมูลทั่วไป' },
      { id: 'part2', title: 'ความพึงพอใจ 13 ด้าน' },
      { id: 'part3', title: 'ความต้องการบุคลากร' }
    ];

    const currentIdx = steps.findIndex(x => x.id === step);

    return (
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm mb-6 w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs sm:text-sm uppercase tracking-wider font-semibold text-bu-orange">ข้อมูลของบัณฑิตมหาวิทยาลัยกรุงเทพ</span>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-base text-slate-700 font-normal font-sans leading-[1.6]">
              <span className="flex items-center gap-1.5">
                <Building className="w-4 h-4 text-slate-500 shrink-0" />
                <span>{supervisor?.name}</span>
              </span>
              <span className="text-slate-300 hidden sm:inline">|</span>
              <span className="flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-slate-500 shrink-0" />
                <span>
                  {supervisor?.faculty}
                  {supervisor?.curriculum ? ` • ${supervisor.curriculum}` : ''}
                  {supervisor?.department ? ` (${supervisor.department})` : ''}
                </span>
              </span>
            </div>
          </div>
          <div className="text-sm text-bu-orange font-bold font-mono tabular-nums shrink-0">
            {Math.round(((currentIdx + 1) / steps.length) * 100)}% สรุปขั้นตอน
          </div>
        </div>

        {/* Progress bar visual */}
        <div className="mt-4 w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-bu-orange h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((currentIdx + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Progress text indicators */}
        <div className="mt-3 flex justify-between text-xs sm:text-sm font-normal text-slate-600 leading-[1.6]">
          {steps.map((s, idx) => (
            <span
              key={s.id}
              className={`${idx <= currentIdx ? 'text-bu-orange font-semibold' : 'text-slate-600 font-normal'}`}
            >
              ตอน {idx + 1}: {s.title}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl lg:max-w-6xl mx-auto py-4 px-3 sm:px-6">
      {renderProgress()}

      {step === 'login' && (
        <div className="w-full max-w-xl mx-auto my-6 sm:my-10 bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden text-center animate-fade-in">
          {/* Header Banner */}
          <div className="bg-bu-orange py-7 px-6 text-white space-y-1.5 flex flex-col items-center">
            <ClipboardList className="w-12 h-12 stroke-1 text-white mb-2" />
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight leading-[1.6]">เข้าสู่แบบสำรวจ</h2>
          </div>

          {/* Form */}
          <form onSubmit={handleVerifyCode} className="p-5 sm:p-8 space-y-6">
            <p className="text-base text-slate-600 font-normal leading-[1.6]">
              กรุณากรอกรหัสแบบสำรวจ 4 หลัก ที่ท่านได้รับทางไปรษณีย์/อีเมล
            </p>

            <div className="space-y-2 text-left">
              <label htmlFor="survey-code" className="block text-base font-semibold text-slate-800 leading-[1.6]">
                รหัสผ่านแบบสำรวจ (4 หลัก)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  id="survey-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  maxLength={4}
                  disabled={isLoading}
                  value={code}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setCode(digitsOnly);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="ป้อนรหัส 4 หลักของคุณ..."
                  className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl font-mono text-center text-lg tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-bu-orange/20 focus:border-bu-orange placeholder:text-base placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-500 disabled:bg-slate-50"
                />
              </div>
              {errorMsg && (
                <div role="alert" className="flex items-center justify-center gap-1.5 text-sm text-rose-600 font-semibold text-center bg-rose-50 border border-rose-100 p-2.5 rounded-lg mt-2 leading-[1.6]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-bu-orange hover:bg-bu-orange-hover text-white text-base font-semibold py-3.5 px-4 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center space-x-1 cursor-pointer"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>กำลังตรวจสอบ...</span>
                </div>
              ) : (
                <>
                  <span>เข้าสู่ระบบเพื่อเริ่มทำแบบสำรวจ</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
          <div className="bg-slate-50 py-3 px-4 text-sm text-slate-600 font-normal border-t border-slate-100 leading-[1.6]">
            สำนักมาตรฐานคุณภาพการศึกษา มหาวิทยาลัยกรุงเทพ
          </div>
        </div>
      )}

      {step === 'part1' && (
        <FormPart1 data={part1} onChange={setPart1} onNext={() => goToStep('part2')} />
      )}

      {step === 'part2' && (
        <FormPart2
          data={part2}
          onChange={setPart2}
          onNext={() => goToStep('part3')}
          onPrev={() => goToStep('part1')}
        />
      )}

      {step === 'part3' && (
        <>
          {submitError && (
            <div role="alert" className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-base font-medium leading-[1.6] flex items-center justify-between gap-3">
              <span>{submitError}</span>
              <button
                type="button"
                onClick={() => setSubmitError('')}
                className="text-sm underline shrink-0 cursor-pointer font-semibold"
              >
                ปิด
              </button>
            </div>
          )}
          <FormPart3
            data={part3}
            onChange={setPart3}
            onPrev={() => goToStep('part2')}
            onSubmit={handleSurveySubmit}
            isSubmitting={isSubmitting}
          />
        </>
      )}

      {step === 'completed' && (
        <div className="w-full max-w-3xl mx-auto my-6 sm:my-10 bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden text-center animate-fade-in px-4 py-8 sm:px-6 sm:py-10 space-y-6">
          <div className="flex justify-center">
            <CheckCircle2 className="w-20 h-20 text-emerald-500 stroke-1" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-[1.6]">
              ส่งแบบสำรวจสำเร็จเรียบร้อย
            </h2>
            <p className="text-bu-orange font-semibold text-base leading-[1.6]">
              ปีการศึกษา {submittedYear}
            </p>
          </div>
          <p className="text-[13px] text-slate-700 leading-[1.6] mx-auto font-normal text-center md:whitespace-nowrap">
            มหาวิทยาลัยกรุงเทพขอขอบพระคุณท่านเป็นอย่างสูงที่ให้ความร่วมมือในการตอบแบบสำรวจครั้งนี้
            <br />
            โดยข้อมูลและข้อเสนอแนะของท่านจะเป็นประโยชน์ต่อการพัฒนาและปรับปรุงหลักสูตรให้มีคุณภาพ
            <br />
            และสอดคล้องกับความต้องการของตลาดแรงงานมากยิ่งขึ้น
          </p>
          <div className="pt-6 border-t border-slate-100 space-y-4">
            <p className="text-sm text-slate-600 font-normal leading-[1.6]">
              สำนักมาตรฐานคุณภาพการศึกษา มหาวิทยาลัยกรุงเทพ
            </p>
            <button
              onClick={() => {
                goToStep('login');
                setCode('');
                setSupervisor(null);
                setMatchedCurrentYearSupId(null);
                setPart1(initialPart1);
                setPart2(initialPart2);
                setPart3(initialPart3);
              }}
              className="inline-flex items-center justify-center border border-bu-orange hover:bg-bu-orange-light text-bu-orange text-base font-semibold py-2.5 px-6 rounded-xl transition-all cursor-pointer"
            >
              เสร็จสิ้นและกลับสู่หน้าหลัก
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
