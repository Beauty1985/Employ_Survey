import React from 'react';
import { Part1Data } from '../types';

interface FormPart1Props {
  data: Part1Data;
  onChange: (data: Part1Data) => void;
  onNext: () => void;
}

const POSITIONS = [
  'เจ้าของกิจการ',
  'กรรมการผู้จัดการ',
  'ผู้จัดการ/ผู้อำนวยการ',
  'หัวหน้างาน/หัวหน้าแผนก/หัวหน้าฝ่าย',
  'อื่นๆ (โปรดระบุ)'
];

const EXPERIENCES = [
  'น้อยกว่า 5 ปี',
  '5 - 10 ปี',
  '11 - 15 ปี',
  '15 ปี ขึ้นไป'
];

const ORG_TYPES = [
  'หน่วยงานของรัฐ',
  'รัฐวิสาหกิจ',
  'องค์กรเอกชน',
  'องค์กรต่างประเทศ/ระหว่างประเทศ',
  'ธุรกิจส่วนตัว/ธุรกิจครอบครัว',
  'อื่นๆ (โปรดระบุ)'
];

const INDUSTRIES = [
  'อุตสาหกรรมยานยนต์สมัยใหม่',
  'อุตสาหกรรมอิเล็กทรอนิกส์อัจฉริยะ',
  'อุตสาหกรรมอาหารแห่งอนาคต',
  'อุตสาหกรรมการบินและโลจิสติกส์',
  'อุตสาหกรรมดิจิทัล',
  'อุตสาหกรรมหุ่นยนต์เพื่อการอุตสาหกรรม',
  'อุตสาหกรรมการแพทย์ครบวงจร',
  'อุตสาหกรรมเชื้อเพลิงชีวภาพและเคมีชีวภาพ',
  'อุตสาหกรรมการเกษตรและเทคโนโลยีชีวภาพ',
  'อุตสาหกรรมการท่องเที่ยวกลุ่มรายได้ดีและการท่องเที่ยวเชิงสุขภาพ',
  'อื่นๆ (โปรดระบุ)'
];

const DURATIONS = [
  'น้อยกว่า 4 เดือน',
  '4 – 8 เดือน',
  '9 เดือน – 1 ปี',
  'มากกว่า 1 – 3 ปี',
  'มากกว่า 3 ปี ขึ้นไป'
];

export default function FormPart1({ data, onChange, onNext }: FormPart1Props) {
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const clearErrors = (...keys: string[]) => {
    setErrors(prev => {
      const hasAny = keys.some(k => prev[k]);
      if (!hasAny) return prev;
      const next = { ...prev };
      keys.forEach(k => delete next[k]);
      return next;
    });
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!data.position) newErrors.position = 'กรุณาเลือกตำแหน่งของท่าน';
    if (data.position === 'อื่นๆ (โปรดระบุ)' && !data.positionOther?.trim()) {
      newErrors.positionOther = 'กรุณาระบุตำแหน่งของท่าน';
    }
    if (!data.experience) newErrors.experience = 'กรุณาเลือกประสบการณ์การทำงาน';
    if (!data.orgType) newErrors.orgType = 'กรุณาเลือกประเภทหน่วยงาน';
    if (data.orgType === 'อื่นๆ (โปรดระบุ)' && !data.orgTypeOther?.trim()) {
      newErrors.orgTypeOther = 'กรุณาระบุประเภทหน่วยงาน';
    }
    if (data.industries.length === 0) newErrors.industries = 'กรุณาเลือกกลุ่มอุตสาหกรรม';
    if (data.industries.includes('อื่นๆ (โปรดระบุ)') && !data.industriesOther?.trim()) {
      newErrors.industriesOther = 'กรุณาระบุกลุ่มอุตสาหกรรม';
    }
    if (!data.graduateDuration) newErrors.graduateDuration = 'กรุณาเลือกระยะเวลาปฏิบัติงานของบัณฑิต';

    setErrors(newErrors);

    const firstKey = Object.keys(newErrors)[0];
    if (firstKey) {
      const elMap: Record<string, string> = {
        position: 'part1-q1',
        positionOther: 'part1-q1',
        experience: 'part1-q2',
        orgType: 'part1-q3',
        orgTypeOther: 'part1-q3',
        industries: 'part1-q4',
        industriesOther: 'part1-q4',
        graduateDuration: 'part1-q5',
      };
      const targetId = elMap[firstKey];
      if (targetId) {
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onNext();
    }
  };

  const handlePositionChange = (val: string) => {
    clearErrors('position', 'positionOther');
    onChange({
      ...data,
      position: val,
      positionOther: val === 'อื่นๆ (โปรดระบุ)' ? data.positionOther : ''
    });
  };

  const handleOrgTypeChange = (val: string) => {
    clearErrors('orgType', 'orgTypeOther');
    onChange({
      ...data,
      orgType: val,
      orgTypeOther: val === 'อื่นๆ (โปรดระบุ)' ? data.orgTypeOther : ''
    });
  };

  const handleIndustrySelect = (val: string) => {
    clearErrors('industries', 'industriesOther');
    onChange({
      ...data,
      industries: [val],
      industriesOther: val === 'อื่นๆ (โปรดระบุ)' ? data.industriesOther : ''
    });
  };

  return (
    <form id="form-part-1" onSubmit={handleSubmit} className="w-full space-y-6 sm:space-y-8 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 md:p-8 space-y-6 w-full">
        <h3 className="font-sans text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-3 leading-[1.6]">
          ตอนที่ 1: ข้อมูลทั่วไปของผู้ตอบแบบสำรวจ
        </h3>

        {/* 1. Position */}
        <div id="part1-q1" className="space-y-3">
          <label className="block text-base font-semibold text-slate-800 leading-[1.6]">
            1. ตำแหน่งของผู้ตอบแบบสอบถาม <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {POSITIONS.map((pos) => (
              <label
                key={pos}
                className={`flex items-center py-3.5 px-4 rounded-xl border cursor-pointer transition-all ${
                  data.position === pos
                    ? 'border-bu-orange bg-bu-orange-light text-bu-orange font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-normal'
                }`}
              >
                <input
                  type="radio"
                  name="position"
                  checked={data.position === pos}
                  onChange={() => handlePositionChange(pos)}
                  className="sr-only"
                />
                <span className="text-base leading-[1.6]">{pos}</span>
              </label>
            ))}
          </div>
          {data.position === 'อื่นๆ (โปรดระบุ)' && (
            <input
              type="text"
              maxLength={500}
              placeholder="โปรดระบุตำแหน่งงานของคุณ..."
              value={data.positionOther || ''}
              onChange={(e) => {
                clearErrors('positionOther');
                onChange({ ...data, positionOther: e.target.value });
              }}
              className="mt-2 w-full p-3 border border-slate-200 rounded-xl text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-bu-orange/20 focus:border-bu-orange"
            />
          )}
          {errors.position && <p className="text-sm text-rose-600 mt-1">{errors.position}</p>}
          {errors.positionOther && <p className="text-sm text-rose-600 mt-1">{errors.positionOther}</p>}
        </div>

        {/* 2. Experience */}
        <div id="part1-q2" className="space-y-3">
          <label className="block text-base font-semibold text-slate-800 leading-[1.6]">
            2. ประสบการณ์การทำงานของท่าน <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {EXPERIENCES.map((exp) => (
              <label
                key={exp}
                className={`flex items-center justify-center py-3.5 px-4 rounded-xl border cursor-pointer text-center transition-all ${
                  data.experience === exp
                    ? 'border-bu-orange bg-bu-orange-light text-bu-orange font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-normal'
                }`}
              >
                <input
                  type="radio"
                  name="experience"
                  checked={data.experience === exp}
                  onChange={() => {
                    clearErrors('experience');
                    onChange({ ...data, experience: exp });
                  }}
                  className="sr-only"
                />
                <span className="text-base leading-[1.6]">{exp}</span>
              </label>
            ))}
          </div>
          {errors.experience && <p className="text-sm text-rose-600 mt-1">{errors.experience}</p>}
        </div>

        {/* 3. Organization Type */}
        <div id="part1-q3" className="space-y-3">
          <label className="block text-base font-semibold text-slate-800 leading-[1.6]">
            3. ประเภทของหน่วยงานของท่าน <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ORG_TYPES.map((org) => (
              <label
                key={org}
                className={`flex items-center py-3.5 px-4 rounded-xl border cursor-pointer transition-all ${
                  data.orgType === org
                    ? 'border-bu-orange bg-bu-orange-light text-bu-orange font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-normal'
                }`}
              >
                <input
                  type="radio"
                  name="orgType"
                  checked={data.orgType === org}
                  onChange={() => handleOrgTypeChange(org)}
                  className="sr-only"
                />
                <span className="text-base leading-[1.6]">{org}</span>
              </label>
            ))}
          </div>
          {data.orgType === 'อื่นๆ (โปรดระบุ)' && (
            <input
              type="text"
              maxLength={500}
              placeholder="โปรดระบุประเภทหน่วยงานของคุณ..."
              value={data.orgTypeOther || ''}
              onChange={(e) => {
                clearErrors('orgTypeOther');
                onChange({ ...data, orgTypeOther: e.target.value });
              }}
              className="mt-2 w-full p-3 border border-slate-200 rounded-xl text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-bu-orange/20 focus:border-bu-orange"
            />
          )}
          {errors.orgType && <p className="text-sm text-rose-600 mt-1">{errors.orgType}</p>}
          {errors.orgTypeOther && <p className="text-sm text-rose-600 mt-1">{errors.orgTypeOther}</p>}
        </div>

        {/* 4. Industry Group (Single-select) */}
        <div id="part1-q4" className="space-y-3">
          <label className="block text-base font-semibold text-slate-800 leading-[1.6]">
            4. องค์กรหรือธุรกิจของท่านอยู่ในกลุ่มอุตสาหกรรมใด <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {INDUSTRIES.map((ind) => {
              const isChecked = data.industries.includes(ind);
              return (
                <label
                  key={ind}
                  className={`flex items-center py-3.5 px-4 rounded-xl border cursor-pointer transition-all ${
                    isChecked
                      ? 'border-bu-orange bg-bu-orange-light text-bu-orange font-semibold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-normal'
                  }`}
                >
                  <input
                    type="radio"
                    name="industries"
                    checked={isChecked}
                    onChange={() => handleIndustrySelect(ind)}
                    className="sr-only"
                  />
                  <span className="text-base leading-[1.6]">{ind}</span>
                </label>
              );
            })}
          </div>
          {data.industries.includes('อื่นๆ (โปรดระบุ)') && (
            <input
              type="text"
              maxLength={500}
              placeholder="โปรดระบุกลุ่มอุตสาหกรรมเพิ่มเติม..."
              value={data.industriesOther || ''}
              onChange={(e) => {
                clearErrors('industriesOther');
                onChange({ ...data, industriesOther: e.target.value });
              }}
              className="mt-2 w-full p-3 border border-slate-200 rounded-xl text-base text-slate-800 font-normal leading-[1.6] focus:outline-none focus:ring-2 focus:ring-bu-orange/20 focus:border-bu-orange"
            />
          )}
          {errors.industries && <p className="text-sm text-rose-600 mt-1">{errors.industries}</p>}
          {errors.industriesOther && <p className="text-sm text-rose-600 mt-1">{errors.industriesOther}</p>}
        </div>

        {/* 5. Working Duration */}
        <div id="part1-q5" className="space-y-3">
          <label className="block text-base font-semibold text-slate-800 leading-[1.6]">
            5. ระยะเวลาในการปฏิบัติงานของบัณฑิตร่วมกับหน่วยงานท่าน <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {DURATIONS.map((dur) => (
              <label
                key={dur}
                className={`flex items-center py-3.5 px-4 rounded-xl border cursor-pointer transition-all ${
                  data.graduateDuration === dur
                    ? 'border-bu-orange bg-bu-orange-light text-bu-orange font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-normal'
                }`}
              >
                <input
                  type="radio"
                  name="graduateDuration"
                  checked={data.graduateDuration === dur}
                  onChange={() => {
                    clearErrors('graduateDuration');
                    onChange({ ...data, graduateDuration: dur });
                  }}
                  className="sr-only"
                />
                <span className="text-base leading-[1.6]">{dur}</span>
              </label>
            ))}
          </div>
          {errors.graduateDuration && <p className="text-sm text-rose-600 mt-1">{errors.graduateDuration}</p>}
        </div>
      </div>

      {Object.keys(errors).length > 0 && (
        <div role="alert" className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-base font-medium leading-[1.6]">
          กรุณาตรวจสอบและกรอกข้อมูลในข้อที่ยังไม่สมบูรณ์ให้ครบถ้วนก่อนดำเนินการต่อ
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          className="w-full sm:w-auto bg-bu-orange hover:bg-bu-orange-hover text-white text-base font-semibold px-8 py-3.5 rounded-xl transition-all shadow-md active:scale-[0.98] focus:outline-none cursor-pointer text-center"
        >
          ถัดไป (ตอนที่ 2)
        </button>
      </div>
    </form>
  );
}
