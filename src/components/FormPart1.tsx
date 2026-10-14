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
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onNext();
    }
  };

  const handlePositionChange = (val: string) => {
    onChange({
      ...data,
      position: val,
      positionOther: val === 'อื่นๆ (โปรดระบุ)' ? data.positionOther : ''
    });
  };

  const handleOrgTypeChange = (val: string) => {
    onChange({
      ...data,
      orgType: val,
      orgTypeOther: val === 'อื่นๆ (โปรดระบุ)' ? data.orgTypeOther : ''
    });
  };

  const handleIndustrySelect = (val: string) => {
    onChange({
      ...data,
      industries: [val],
      industriesOther: val === 'อื่นๆ (โปรดระบุ)' ? data.industriesOther : ''
    });
  };

  return (
    <form id="form-part-1" onSubmit={handleSubmit} className="space-y-8 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 space-y-6">
        <h3 className="text-xl font-semibold text-slate-800 border-b border-slate-100 pb-3">
          ตอนที่ 1: ข้อมูลทั่วไปของผู้ตอบแบบสำรวจ
        </h3>

        {/* 1. Position */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            1. ตำแหน่งของผู้ตอบแบบสอบถาม <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {POSITIONS.map((pos) => (
              <label
                key={pos}
                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                  data.position === pos
                    ? 'border-bu-orange bg-bu-orange-light text-bu-orange font-medium'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="position"
                  checked={data.position === pos}
                  onChange={() => handlePositionChange(pos)}
                  className="sr-only"
                />
                <span className="text-sm">{pos}</span>
              </label>
            ))}
          </div>
          {data.position === 'อื่นๆ (โปรดระบุ)' && (
            <input
              type="text"
              placeholder="โปรดระบุตำแหน่งงานของคุณ..."
              value={data.positionOther || ''}
              onChange={(e) => onChange({ ...data, positionOther: e.target.value })}
              className="mt-2 w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bu-orange/20 focus:border-bu-orange"
            />
          )}
          {errors.position && <p className="text-xs text-rose-500 mt-1">{errors.position}</p>}
          {errors.positionOther && <p className="text-xs text-rose-500 mt-1">{errors.positionOther}</p>}
        </div>

        {/* 2. Experience */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            2. ประสบการณ์การทำงานของท่าน <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {EXPERIENCES.map((exp) => (
              <label
                key={exp}
                className={`flex items-center justify-center p-3 rounded-lg border cursor-pointer text-center transition-all ${
                  data.experience === exp
                    ? 'border-bu-orange bg-bu-orange-light text-bu-orange font-medium'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="experience"
                  checked={data.experience === exp}
                  onChange={() => onChange({ ...data, experience: exp })}
                  className="sr-only"
                />
                <span className="text-sm">{exp}</span>
              </label>
            ))}
          </div>
          {errors.experience && <p className="text-xs text-rose-500 mt-1">{errors.experience}</p>}
        </div>

        {/* 3. Organization Type */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            3. ประเภทของหน่วยงานของท่าน <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ORG_TYPES.map((org) => (
              <label
                key={org}
                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                  data.orgType === org
                    ? 'border-bu-orange bg-bu-orange-light text-bu-orange font-medium'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="orgType"
                  checked={data.orgType === org}
                  onChange={() => handleOrgTypeChange(org)}
                  className="sr-only"
                />
                <span className="text-sm">{org}</span>
              </label>
            ))}
          </div>
          {data.orgType === 'อื่นๆ (โปรดระบุ)' && (
            <input
              type="text"
              placeholder="โปรดระบุประเภทหน่วยงานของคุณ..."
              value={data.orgTypeOther || ''}
              onChange={(e) => onChange({ ...data, orgTypeOther: e.target.value })}
              className="mt-2 w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bu-orange/20 focus:border-bu-orange"
            />
          )}
          {errors.orgType && <p className="text-xs text-rose-500 mt-1">{errors.orgType}</p>}
          {errors.orgTypeOther && <p className="text-xs text-rose-500 mt-1">{errors.orgTypeOther}</p>}
        </div>

        {/* 4. Industry Group (Single-select) */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            4. องค์กรหรือธุรกิจของท่านอยู่ในกลุ่มอุตสาหกรรมใด <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {INDUSTRIES.map((ind) => {
              const isChecked = data.industries.includes(ind);
              return (
                <label
                  key={ind}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                    isChecked
                      ? 'border-bu-orange bg-bu-orange-light text-bu-orange font-medium'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="industries"
                    checked={isChecked}
                    onChange={() => handleIndustrySelect(ind)}
                    className="sr-only"
                  />
                  <span className="text-sm">{ind}</span>
                </label>
              );
            })}
          </div>
          {data.industries.includes('อื่นๆ (โปรดระบุ)') && (
            <input
              type="text"
              placeholder="โปรดระบุกลุ่มอุตสาหกรรมเพิ่มเติม..."
              value={data.industriesOther || ''}
              onChange={(e) => onChange({ ...data, industriesOther: e.target.value })}
              className="mt-2 w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bu-orange/20 focus:border-bu-orange"
            />
          )}
          {errors.industries && <p className="text-xs text-rose-500 mt-1">{errors.industries}</p>}
          {errors.industriesOther && <p className="text-xs text-rose-500 mt-1">{errors.industriesOther}</p>}
        </div>

        {/* 5. Working Duration */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            5. ระยะเวลาในการปฏิบัติงานของบัณฑิตร่วมกับหน่วยงานท่าน <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {DURATIONS.map((dur) => (
              <label
                key={dur}
                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                  data.graduateDuration === dur
                    ? 'border-bu-orange bg-bu-orange-light text-bu-orange font-medium'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="graduateDuration"
                  checked={data.graduateDuration === dur}
                  onChange={() => onChange({ ...data, graduateDuration: dur })}
                  className="sr-only"
                />
                <span className="text-sm">{dur}</span>
              </label>
            ))}
          </div>
          {errors.graduateDuration && <p className="text-xs text-rose-500 mt-1">{errors.graduateDuration}</p>}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          className="bg-bu-orange hover:bg-bu-orange-hover text-white font-medium px-6 py-3 rounded-xl transition-all shadow-md active:scale-[0.98] focus:outline-none cursor-pointer"
        >
          ถัดไป (ตอนที่ 2)
        </button>
      </div>
    </form>
  );
}
