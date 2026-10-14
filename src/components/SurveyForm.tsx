import React, { useState } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { Supervisor, Part1Data, Part2Data, Part3Data, SurveyResponse } from '../types';
import FormPart1 from './FormPart1';
import FormPart2 from './FormPart2';
import FormPart3 from './FormPart3';
import { CheckCircle2, Lock, ArrowRight, ClipboardList, GraduationCap, Building } from 'lucide-react';

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
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Loaded supervisor info
  const [supervisor, setSupervisor] = useState<Supervisor | null>(null);

  // Form states
  const [part1, setPart1] = useState<Part1Data>(initialPart1);
  const [part2, setPart2] = useState<Part2Data>(initialPart2);
  const [part3, setPart3] = useState<Part3Data>(initialPart3);

  const [submittedYear, setSubmittedYear] = useState('');

  // Handle survey 4-digit check
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setErrorMsg('กรุณากรอกรหัสแบบสำรวจ 4 หลัก');
      return;
    }
    if (trimmedCode.length !== 4 || isNaN(Number(trimmedCode))) {
      setErrorMsg('รหัสแบบสำรวจต้องเป็นตัวเลข 4 หลัก');
      return;
    }

    setIsLoading(true);
    try {
      const q = query(collection(db, 'supervisors'), where('code', '==', trimmedCode));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setErrorMsg('ไม่พบรหัสแบบสำรวจนี้ในระบบ กรุณาตรวจสอบหรือติดต่อผู้ดูแลระบบ');
        setIsLoading(false);
        return;
      }

      let foundSupervisor: Supervisor | null = null;
      let docId = '';
      querySnapshot.forEach((docSnap) => {
        foundSupervisor = { id: docSnap.id, ...docSnap.data() } as Supervisor;
        docId = docSnap.id;
      });

      if (foundSupervisor) {
        // If already completed in past, we friendly inform them
        if ((foundSupervisor as Supervisor).isCompleted) {
          setErrorMsg('รหัสแบบสำรวจนี้ได้ถูกใช้งานเพื่อตอบแบบประเมินเรียบร้อยแล้ว');
          setIsLoading(false);
          return;
        }

        setSupervisor(foundSupervisor);
        setStep('part1');
      }
    } catch (err) {
      setErrorMsg('เกิดข้อผิดพลาดในการตรวจสอบรหัส กรุณาลองใหม่อีกครั้ง');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Submit survey
  const handleSurveySubmit = async () => {
    if (!supervisor) return;
    setIsSubmitting(true);
    
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1; // 1-12
      const monthStr = String(currentMonth).padStart(2, '0');
      const gregorianYear = now.getFullYear();

      // Academic calculations: อัตโนมัติ: ถ้าเดือน >= 8 ให้เป็นปีปัจจุบัน + 543, ถ้าคือน้อยกว่าเดือน 8 ให้เป็นปีปัจจุบัน + 542
      const calculatedYearNum = currentMonth >= 8 ? gregorianYear + 543 : gregorianYear + 542;
      const academicYearStr = String(calculatedYearNum);
      const isoSubmittedAt = now.toISOString();

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

      // 1. Save survey response (sanitize to remove any undefined properties)
      await addDoc(collection(db, 'responses'), cleanUndefined(responsePayload));

      // 2. Mark supervisor list as completed inside supervisors collection
      if (supervisor.id) {
        const supervisorRef = doc(db, 'supervisors', supervisor.id);
        await updateDoc(supervisorRef, {
          isCompleted: true,
          completedAt: isoSubmittedAt
        });
      }

      setSubmittedYear(academicYearStr);
      setStep('completed');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'responses');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Progress render helper
  const renderProgress = () => {
    if (step === 'login' || step === 'completed') return null;

    const steps = [
      { id: 'part1', title: 'ข้อมูลทั่วไป' },
      { id: 'part2', title: 'การประเมินผู้บังคับบัญชา' },
      { id: 'part3', title: 'ความต้องการบุคลากร' }
    ];

    const currentIdx = steps.findIndex(x => x.id === step);

    return (
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs uppercase tracking-wider font-semibold text-bu-orange">ข้อมูลผู้เข้าสำรวจ</span>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 font-medium font-sans">
              <span className="flex items-center gap-1">
                <Building className="w-4 h-4 text-slate-400" />
                {supervisor?.name}
              </span>
              <span className="text-slate-300">|</span>
              <span className="flex items-center gap-1">
                <GraduationCap className="w-4 h-4 text-slate-400" />
                {supervisor?.faculty} ({supervisor?.department})
              </span>
            </div>
          </div>
          <div className="text-xs text-bu-orange font-bold font-mono">
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
        <div className="mt-3 flex justify-between text-xs font-medium text-slate-400">
          {steps.map((s, idx) => (
            <span
              key={s.id}
              className={`${idx <= currentIdx ? 'text-bu-orange font-semibold' : 'text-slate-400'}`}
            >
              ตอน {idx + 1}: {s.title}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl lg:max-w-6xl mx-auto py-4 px-4 sm:px-6">
      {renderProgress()}

      {step === 'login' && (
        <div className="max-w-md mx-auto my-12 bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden text-center animate-fade-in">
          {/* Header Banner */}
          <div className="bg-bu-orange py-7 px-6 text-white space-y-1.5 flex flex-col items-center">
            <ClipboardList className="w-12 h-12 stroke-1 text-white mb-2" />
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">แบบสำรวจความคิดเห็น</h2>
            <p className="text-sm text-orange-100 font-light">
              ของผู้บังคับบัญชาต่อคุณภาพบัณฑิต มหาวิทยาลัยกรุงเทพ
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleVerifyCode} className="p-6 md:p-8 space-y-6">
            <p className="text-sm text-slate-500 font-light leading-relaxed">
              แบบสำรวจชุดนี้มีความสำคัญสถิติต่อการนำผลตอบรับไปพัฒนาปรับปรุงคุณภาพการผลิตบัณฑิต ให้ตรงความต้องการของผู้ประกอบการ 
              กรุณากรอกรหัสแบบสำรวจ 4 หลัก ที่ท่านได้รับทางไปรษณีย์/อีเมล เพื่อเข้าทำแบบสอบถาม
            </p>

            <div className="space-y-2 text-left">
              <label htmlFor="survey-code" className="block text-sm font-medium text-slate-700">
                รหัสผ่านแบบสำรวจ (4 หลัก)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="survey-code"
                  type="text"
                  maxLength={4}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="ป้อนรหัส 4 หลักของคุณ..."
                  className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl font-mono text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-bu-orange/20 focus:border-bu-orange placeholder:text-sm placeholder:font-sans placeholder:tracking-normal"
                />
              </div>
              {errorMsg && (
                <p className="text-xs text-rose-500 font-medium text-center bg-rose-50 p-2 rounded-lg mt-2">
                  {errorMsg}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-bu-orange hover:bg-bu-orange-hover text-white font-medium py-3.5 px-4 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center space-x-1 cursor-pointer"
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
          <div className="bg-slate-50 py-3 text-[11px] text-slate-400 border-t border-slate-100">
            สำนักมาตรฐานคุณภาพการศึกษา มหาวิทยาลัยกรุงเทพ
          </div>
        </div>
      )}

      {step === 'part1' && (
        <FormPart1 data={part1} onChange={setPart1} onNext={() => setStep('part2')} />
      )}

      {step === 'part2' && (
        <FormPart2
          data={part2}
          onChange={setPart2}
          onNext={() => setStep('part3')}
          onPrev={() => setStep('part1')}
        />
      )}

      {step === 'part3' && (
        <FormPart3
          data={part3}
          onChange={setPart3}
          onPrev={() => setStep('part2')}
          onSubmit={handleSurveySubmit}
          isSubmitting={isSubmitting}
        />
      )}

      {step === 'completed' && (
        <div className="max-w-lg mx-auto my-12 bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden text-center animate-fade-in px-6 py-10 sm:p-12 space-y-6">
          <div className="flex justify-center">
            <CheckCircle2 className="w-20 h-20 text-emerald-500 stroke-1" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
              ส่งแบบสำรวจสำเร็จเรียบร้อย
            </h2>
            <p className="text-bu-orange font-semibold text-sm">
              ปีการศึกษา {submittedYear}
            </p>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed max-w-sm mx-auto font-light">
            มหาวิทยาลัยกรุงเทพขอขอบพระคุณในความร่วมมือร่วมตอบแบบสำรวจของท่าน ข้อมูลอันมีค่านี้จะถูกนำไปใช้วางแผนพัฒนารูปแบบการสอนและปรับปรุงกระบวนการศึกษาของทางมหาวิทยาลัยให้ตอบความต้องการของตลาดยิ่งขึ้น
          </p>
          <div className="pt-6 border-t border-slate-100 space-y-4">
            <p className="text-xs text-slate-400">
              สำนักมาตรฐานคุณภาพการศึกษา มหาวิทยาลัยกรุงเทพ
            </p>
            <button
              onClick={() => {
                setStep('login');
                setCode('');
                setSupervisor(null);
                setPart1(initialPart1);
                setPart2(initialPart2);
                setPart3(initialPart3);
              }}
              className="inline-flex items-center justify-center border border-bu-orange hover:bg-bu-orange-light text-bu-orange text-sm font-medium py-2.5 px-6 rounded-xl transition-all cursor-pointer"
            >
              เสร็จสิ้นและกลับสู่หน้าหลัก
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
