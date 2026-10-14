import React from 'react';
import { Part3Data } from '../types';

interface FormPart3Props {
  data: Part3Data;
  onChange: (data: Part3Data) => void;
  onSubmit: () => void;
  onPrev: () => void;
  isSubmitting: boolean;
}

const MAJORS_POOL = [
  'สาขาวิชาด้านศึกษาศาสตร์ เช่น การศึกษา การฝึกหัดครูกับวิชาเฉพาะทาง',
  'สาขาวิชาด้านศิลปะและมนุษยศาสตร์ เช่น การผลิตสื่อ แฟชั่น การออกแบบภายใน ศิลปะการแสดง ประวัติศาสตร์ ภาษาศาสตร์',
  'สาขาวิชาด้านสังคมศาสตร์ วารสารศาสตร์และสารสนเทศ เช่น สังคมศาสตร์ เศรษฐศาสตร์ รัฐศาสตร์ วารสารศาสตร์',
  'สาขาวิชาด้านการบริหารธุรกิจและกฎหมาย เช่น บริหารธุรกิจ การบัญชี การเงิน การตลาด นิติศาสตร์',
  'สาขาวิชาด้านวิทยาศาสตร์ธรรมชาติ คณิตศาสตร์และสถิติ เช่น วิทยาศาสตร์ชีวภาพ คณิตศาสตร์ สถิติ',
  'สาขาวิชาด้านเทคโนโลยีสารสนเทศและการสื่อสาร เช่น เทคโนโลยีสารสนเทศ การประชาสัมพันธ์ การพัฒนาซอฟต์แวร์ การเขียนโปรแกรม',
  'สาขาวิชาด้านวิศวกรรม อุตสาหกรรมและการก่อสร้าง เช่น วิศวกรรมศาสตร์ วิทยาศาสตร์และเทคโนโลยีอาหาร สถาปัตยกรรมและผังเมือง',
  'สาขาวิชาด้านเกษตรศาสตร์ วนศาสตร์ การประมงและสัตวแพทย์ เช่น เกษตรศาสตร์ วนศาสตร์ สัตวแพทย์',
  'สาขาวิชาด้านสุขภาพและสวัสดิการ เช่น ทันตแพทย์ แพทยศาสตร์ เภสัชศาสตร์ การพยาบาล',
  'สาขาวิชาด้านงานบริการ เช่น การบริการบุคคล สุขศาสตร์และการบริการด้านสุขภาพ การบริการความปลอดภัย',
  'สาขาวิชาอื่นๆ (ระบุ)'
];

const SKILLS_POOL = [
  'ทักษะการคิดวิเคราะห์และทักษะด้านนวัตกรรม',
  'ทักษะการคิดเชิงวิพากษ์',
  'ทักษะความคิดสร้างสรรค์และการริเริ่มสิ่งใหม่',
  'ทักษะการเรียนรู้ด้วยตนเอง',
  'ทักษะการรับมือกับปัญหา อดทนต่อความกดดัน และทักษะการปรับตัว',
  'ทักษะการแก้ปัญหาที่ซับซ้อน',
  'ทักษะการใช้ ดูแล และจัดการเทคโนโลยี',
  'ทักษะการออกแบบและการเขียนโปรแกรม',
  'ทักษะการใช้เหตุผล ทักษะการตัดสินใจ และทักษะการระดมความคิด',
  'ทักษะการเป็นผู้นำและอิทธิพลทางสังคม',
  'ทักษะสำคัญอื่นๆ (ระบุ)'
];

const CRITERIA_POOL = [
  'บุคลิกภาพ',
  'ทัศนคติ',
  'ขีดความสามารถ',
  'ความสามารถในการปรับตัวเข้ากับสิ่งใหม่',
  'ประสบการณ์ทำงานจริง เช่น การฝึกงาน',
  'คะแนนการสอบข้อเขียน/สัมภาษณ์',
  'ความรู้ความสามารถในวิชาชีพ',
  'ผลการเรียน (เกรดเฉลี่ยสะสม)',
  'อื่นๆ (ระบุ)'
];

export default function FormPart3({ data, onChange, onSubmit, onPrev, isSubmitting }: FormPart3Props) {
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (data.neededMajors.length === 0) {
      newErrors.neededMajors = 'กรุณาเลือกสาขาวิชาที่ท่านต้องการอย่างน้อย 1 กลุ่มวิชา';
    }
    if (data.neededMajors.includes('สาขาวิชาอื่นๆ (ระบุ)') && !data.neededMajorsOther?.trim()) {
      newErrors.neededMajorsOther = 'กรุณาระบุกลุ่มสาขาวิชาเพิ่มเติม';
    }

    if (data.coreSkills.length === 0) {
      newErrors.coreSkills = 'กรุณาเลือกทักษะขับเคลื่อนการทำงานอย่างน้อย 1 รายการ';
    }
    if (data.coreSkills.includes('ทักษะสำคัญอื่นๆ (ระบุ)') && !data.coreSkillsOther?.trim()) {
      newErrors.coreSkillsOther = 'กรุณาระบุรายละเอียดทักษะสำคัญ';
    }

    if (!data.requiresExperience) {
      newErrors.requiresExperience = 'กรุณาระบุความต้องการบุคลากรที่มีประสบการณ์ทำงานหรือมีการฝึกงาน';
    }

    if (data.requiresExperience === 'yes' && (!data.experienceMonths || data.experienceMonths <= 0)) {
      newErrors.experienceMonths = 'กรุณาระบุจำนวนเดือนที่ต้องการขั้นต่ำ';
    }

    if (data.selectionCriteria.length === 0) {
      newErrors.selectionCriteria = 'กรุณาเลือกเกณฑ์พิจารณาเลือกพนักงานอย่างน้อย 1 รายการ';
    }
    if (data.selectionCriteria.includes('อื่นๆ (ระบุ)') && !data.selectionCriteriaOther?.trim()) {
      newErrors.selectionCriteriaOther = 'กรุณาระบุระบุรายเกณฑ์เลือกพนักงานเพิ่มเติม';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit();
    }
  };

  const handleMajorToggle = (major: string) => {
    let updated: string[];
    if (data.neededMajors.includes(major)) {
      updated = data.neededMajors.filter(x => x !== major);
    } else {
      updated = [...data.neededMajors, major];
    }
    onChange({
      ...data,
      neededMajors: updated,
      neededMajorsOther: updated.includes('สาขาวิชาอื่นๆ (ระบุ)') ? data.neededMajorsOther : ''
    });
  };

  const handleSkillToggle = (skill: string) => {
    let updated: string[];
    if (data.coreSkills.includes(skill)) {
      updated = data.coreSkills.filter(x => x !== skill);
    } else {
      updated = [...data.coreSkills, skill];
    }
    onChange({
      ...data,
      coreSkills: updated,
      coreSkillsOther: updated.includes('ทักษะสำคัญอื่นๆ (ระบุ)') ? data.coreSkillsOther : ''
    });
  };

  const handleCriteriaToggle = (crit: string) => {
    let updated: string[];
    if (data.selectionCriteria.includes(crit)) {
      updated = data.selectionCriteria.filter(x => x !== crit);
    } else {
      updated = [...data.selectionCriteria, crit];
    }
    onChange({
      ...data,
      selectionCriteria: updated,
      selectionCriteriaOther: updated.includes('อื่นๆ (ระบุ)') ? data.selectionCriteriaOther : ''
    });
  };

  return (
    <form id="form-part-3" onSubmit={handleSubmit} className="space-y-8 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 space-y-6">
        <h3 className="text-xl font-semibold text-slate-800 border-b border-slate-100 pb-3">
          ตอนที่ 3: ความต้องการบุคลากรในการปฏิบัติงาน (คุณลักษณะของบัณฑิตที่พึงประสงค์)
        </h3>

        {/* 1. Needed Majors */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-700">
            1. สาขาวิชาที่หน่วยงานของท่านต้องการบุคลากรในการปฏิบัติงาน (เลือกได้มากกว่า 1 ข้อ) <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 gap-2.5">
            {MAJORS_POOL.map(major => {
              const checked = data.neededMajors.includes(major);
              return (
                <label
                  key={major}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                    checked
                      ? 'border-bu-orange bg-bu-orange-light text-bu-orange font-medium'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleMajorToggle(major)}
                    className="sr-only"
                  />
                  <span className="text-sm">{major}</span>
                </label>
              );
            })}
          </div>
          {data.neededMajors.includes('สาขาวิชาอื่นๆ (ระบุ)') && (
            <input
              type="text"
              placeholder="โปรดระบุสาขาวิชาที่อยากรับสมัครเพิ่ม..."
              value={data.neededMajorsOther || ''}
              onChange={(e) => onChange({ ...data, neededMajorsOther: e.target.value })}
              className="mt-2 w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bu-orange/20 focus:border-bu-orange"
            />
          )}
          {errors.neededMajors && <p className="text-xs text-rose-500 mt-1">{errors.neededMajors}</p>}
          {errors.neededMajorsOther && <p className="text-xs text-rose-500 mt-1">{errors.neededMajorsOther}</p>}
        </div>

        {/* 2. Core Skills */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <label className="block text-sm font-semibold text-slate-700">
            2. ทักษะสำคัญที่หน่วยงานของท่านต้องการในการปฏิบัติงาน (เลือกตอบได้มากกว่า 1 ข้อ) <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SKILLS_POOL.map(skill => {
              const checked = data.coreSkills.includes(skill);
              return (
                <label
                  key={skill}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                    checked
                      ? 'border-bu-orange bg-bu-orange-light text-bu-orange font-medium'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleSkillToggle(skill)}
                    className="sr-only"
                  />
                  <span className="text-sm">{skill}</span>
                </label>
              );
            })}
          </div>
          {data.coreSkills.includes('ทักษะสำคัญอื่นๆ (ระบุ)') && (
            <input
              type="text"
              placeholder="โปรดระบุทักษะความต้องการร่วมด้านอื่น..."
              value={data.coreSkillsOther || ''}
              onChange={(e) => onChange({ ...data, coreSkillsOther: e.target.value })}
              className="mt-2 w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bu-orange/20 focus:border-bu-orange"
            />
          )}
          {errors.coreSkills && <p className="text-xs text-rose-500 mt-1">{errors.coreSkills}</p>}
          {errors.coreSkillsOther && <p className="text-xs text-rose-500 mt-1">{errors.coreSkillsOther}</p>}
        </div>

        {/* 3. Job Experience requirement */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <label className="block text-sm font-semibold text-slate-700">
            3. หน่วยงานของท่านต้องการบุคลากรที่มีประสบการณ์ทำงานหรือมีการฝึกงานมาก่อน หรือไม่ <span className="text-rose-500">*</span>
          </label>
          <div className="flex flex-col sm:flex-row gap-4">
            <label className={`flex-1 flex items-center p-3.5 rounded-lg border cursor-pointer transition-all ${
              data.requiresExperience === 'no'
                ? 'border-bu-orange bg-bu-orange-light text-bu-orange font-medium'
                : 'border-slate-200 hover:bg-slate-50 text-slate-600'
            }`}>
              <input
                type="radio"
                name="requiresExperience"
                checked={data.requiresExperience === 'no'}
                onChange={() => onChange({ ...data, requiresExperience: 'no', experienceMonths: undefined })}
                className="sr-only"
              />
              <span className="text-sm">ไม่ต้องการ</span>
            </label>
            <label className={`flex-1 flex items-center p-3.5 rounded-lg border cursor-pointer transition-all ${
              data.requiresExperience === 'yes'
                ? 'border-bu-orange bg-bu-orange-light text-bu-orange font-medium'
                : 'border-slate-200 hover:bg-slate-50 text-slate-600'
            }`}>
              <input
                type="radio"
                name="requiresExperience"
                checked={data.requiresExperience === 'yes'}
                onChange={() => onChange({ ...data, requiresExperience: 'yes', experienceMonths: 6 })}
                className="sr-only"
              />
              <span className="text-sm">ต้องการประสบการณ์ร่วมด้วย</span>
            </label>
          </div>
          {data.requiresExperience === 'yes' && (
            <div className="mt-3 flex items-center space-x-3 max-w-sm animate-fade-in">
              <span className="text-sm text-slate-600">ต้องการอย่างน้อย</span>
              <input
                type="number"
                min="1"
                placeholder="จำนวนเดือน"
                value={data.experienceMonths || ''}
                onChange={(e) => onChange({ ...data, experienceMonths: parseInt(e.target.value) || 0 })}
                className="w-24 p-2 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-bu-orange/20"
              />
              <span className="text-sm text-slate-600">เดือน</span>
            </div>
          )}
          {errors.requiresExperience && <p className="text-xs text-rose-500 mt-1">{errors.requiresExperience}</p>}
          {errors.experienceMonths && <p className="text-xs text-rose-500 mt-1">{errors.experienceMonths}</p>}
        </div>

        {/* 4. Selection Criteria */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <label className="block text-sm font-semibold text-slate-700">
            4. หน่วยงานของท่านมีเกณฑ์ในการพิจารณาคัดเลือกบุคลากรเข้าทำงานจากสิ่งใด (เลือกตอบได้มากกว่า 1 ข้อ) <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {CRITERIA_POOL.map(crit => {
              const checked = data.selectionCriteria.includes(crit);
              return (
                <label
                  key={crit}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                    checked
                      ? 'border-bu-orange bg-bu-orange-light text-bu-orange font-medium'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleCriteriaToggle(crit)}
                    className="sr-only"
                  />
                  <span className="text-sm">{crit}</span>
                </label>
              );
            })}
          </div>
          {data.selectionCriteria.includes('อื่นๆ (ระบุ)') && (
            <input
              type="text"
              placeholder="โปรดระบุระบุเกณฑ์คัดเลือกอื่นเพิ่มเติม..."
              value={data.selectionCriteriaOther || ''}
              onChange={(e) => onChange({ ...data, selectionCriteriaOther: e.target.value })}
              className="mt-2 w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bu-orange/20 focus:border-bu-orange"
            />
          )}
          {errors.selectionCriteria && <p className="text-xs text-rose-500 mt-1">{errors.selectionCriteria}</p>}
          {errors.selectionCriteriaOther && <p className="text-xs text-rose-500 mt-1">{errors.selectionCriteriaOther}</p>}
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={isSubmitting}
          className="border border-slate-200 hover:bg-slate-100 text-slate-600 font-medium px-6 py-3 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
        >
          ย้อนกลับ
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-bu-orange hover:bg-bu-orange-hover text-white font-medium px-6 py-3 rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-50 flex items-center justify-center cursor-pointer min-w-[150px]"
        >
          {isSubmitting ? (
            <div className="flex items-center space-x-2">
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>กำลังบันทึก...</span>
            </div>
          ) : (
            'ส่งแบบประเมิน'
          )}
        </button>
      </div>
    </form>
  );
}
