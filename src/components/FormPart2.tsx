import React from 'react';
import { Part2Data } from '../types';

interface FormPart2Props {
  data: Part2Data;
  onChange: (data: Part2Data) => void;
  onNext: () => void;
  onPrev: () => void;
}

const ATTRIBUTES = [
  {
    id: 1,
    title: '1. ด้านคุณธรรม จริยธรรม',
    desc: 'เช่น จรรยาบรรณวิชาชีพ ความรับผิดชอบต่อสังคม ซื่อสัตย์สุจริต และยึดมั่นในความถูกต้องดีงาม ฯลฯ'
  },
  {
    id: 2,
    title: '2. ด้านความรู้',
    desc: 'เช่น ความรู้ความเข้าใจเกี่ยวกับหลักการทฤษฎีที่เกี่ยวข้องในสาขาวิชาที่ศึกษา การประยุกต์ใช้ความรู้ทางวิชาชีพในทางปฏิบัติ ฯลฯ'
  },
  {
    id: 3,
    title: '3. ด้านทักษะทางปัญญา',
    desc: 'เช่น การแก้ไขปัญหาอย่างเป็นระบบ การคิดวิเคราะห์ การคิดรอบด้าน และการสังเคราะห์ผลงานที่เหมาะสม ฯลฯ'
  },
  {
    id: 4,
    title: '4. ด้านความสัมพันธ์ระหว่างบุคคลและความรับผิดชอบ',
    desc: 'เช่น ความรับผิดชอบในการดำเนินงานของตนเองและกลุ่ม การร่วมมือกับผู้อื่นอย่างสร้างสรรค์ และการแสดงบทบาทความเป็นผู้นำหรือผู้คล้อยตาม ฯลฯ'
  },
  {
    id: 5,
    title: '5. ด้านทักษะการวิเคราะห์เชิงตัวเลข การสื่อสารและการใช้เทคโนโลยีสารสนเทศ',
    desc: 'เช่น การใช้เทคนิคทางคณิตศาสตร์สถิติประกอบการทำงาน การสื่อสารที่มีประสิทธิภาพผ่านการเขียน/พูด และการเข้าถึงการใช้สื่อเทคโนโลยีได้ดี'
  },
  {
    id: 6,
    title: '6. ด้านความคิดสร้างสรรค์',
    desc: 'เช่น มีความสามารถในการคิดริเริ่ม ค้นหาสิ่งแปลกใหม่ เชื่อมโยงเพื่อสร้างสรรค์นวัตกรรม และการใช้นวัตกรรมเพื่อเพิ่มประสิทธิภาพการทำงาน'
  },
  {
    id: 7,
    title: '7. ด้านจิตวิญญาณความเป็นผู้ประกอบการ',
    desc: 'เช่น การคิดริเริ่มทำงานอย่างเจ้าของกิจการ (Ownership) มีความมุ่งมั่นทุ่มเทสร้างการเจริญเติบโต และการควบคุมค่าใช้จ่ายทรัพยากรคุ้มค่าที่สุด'
  },
  {
    id: 8,
    title: '8. ด้านความเป็นสากล',
    desc: 'เช่น ทักษะการใช้ภารกิจภาษาต่างประเทศ การสื่อสารและเข้าใจความหลากหลายทางวัฒนธรรม และการทำงานสอดคล้องกับมาตรฐานระดับสากล'
  },
  {
    id: 9,
    title: '9. ด้านความฉลาดในการตั้งคำถาม',
    desc: 'เช่น มีความฉลาดในการถาม กระตือรือร้นสืบค้น ช่างสังเกต และเรียนรู้การค้นหาความจริงด้วยตนเองเพื่อแก้ไขปัญหาหรือสร้างสิ่งใหม่'
  },
  {
    id: 10,
    title: '10. ด้านความฉลาดมีไหวพริบทันโลก',
    desc: 'เช่น การประยุกต์ใช้ความรู้แก้ไขวิกฤตเฉพาะหน้าได้อย่างคล่องตัว รวดเร็ว ถอดบทเรียนเพื่อปรับชีวิตและงานอยู่ในสังคมยุคปัจจุบันได้ดี'
  },
  {
    id: 11,
    title: '11. ด้านทักษะการทำงานร่วมกับผู้อื่น',
    desc: 'เช่น ความสามารถในการร่วมมือกับทุกกลุ่มคน มีมนุษยสัมพันธ์ดี ตระหนักถึงความผูกพันต่อส่วนรวม และแสดงความรับผิดชอบในงานกลุ่มอย่างสูง'
  },
  {
    id: 12,
    title: '12. ด้านความมุ่งมั่น ตั้งใจเรียนรู้ และสู้ในสิ่งที่รัก',
    desc: 'เช่น การสืบค้นเรียนรู้อยู่เสมอ มีทักษะทนทานต่ออุปสรรคและการทำงานด้วย Passion (ไฟในการทำงาน) มีเป้าหมายชีวิตและตั้งใจบรรลุมัน'
  },
  {
    id: 13,
    title: '13. ความพึงพอใจในภาพรวมของบัณฑิต',
    desc: 'คะแนนประเมินสรุปทัศนะโดยรวมต่อคุณภาพบัณฑิต มหาวิทยาลัยกรุงเทพ ที่ปฏิบัติงานกับหน่วยงานของท่าน'
  }
];

const RATING_LABELS = [
  { value: 10, label: 'มากที่สุด' },
  { value: 9, label: '' },
  { value: 8, label: '' },
  { value: 7, label: '' },
  { value: 6, label: '' },
  { value: 5, label: 'ปานกลาง' },
  { value: 4, label: '' },
  { value: 3, label: '' },
  { value: 2, label: '' },
  { value: 1, label: 'น้อยที่สุด' }
];

const STRENGTHS_POOL = [
  'ฉลาดตั้งคำถาม',
  'ฉลาดหาความร่วมมือ',
  'มุ่งมั่น ตั้งใจเรียนรู้ และสู้ในสิ่งที่รัก',
  'ฉลาดมีไหวพริบ ทันโลก',
  'ทักษะภาษาอังกฤษดี',
  'ฉลาดด้านความคิดสร้างสรรค์ มีมุมมองใหม่ๆ',
  'อื่นๆ (โปรดระบุ)'
];

const SKILLS_TO_IMPROVE_POOL = [
  'การคิดเชิงวิเคราะห์ และการสร้างนวัตกรรม',
  'ความสามารถในการแก้ปัญหาที่ซับซ้อน',
  'การคิดและวิเคราะห์เชิงวิพากษ์ มีวิจารณญาณ',
  'ความคิดริเริ่มสร้างสรรค์ เป็นต้นฉบับที่ ไม่ซ้ำใคร',
  'การมีเหตุผล การแก้ปัญหา และการระดมแนวคิด',
  'การเรียนรู้อย่างมีส่วนร่วม และมีกลยุทธ์ในการเรียนรู้',
  'ความสามารถในการออกแบบเทคโนโลยี และเขียนโปรแกรม',
  'ความสามารถในการใช้ ควบคุมและดูแลเทคโนโลยี',
  'กรอบความคิดแบบเติบโต (Growth Mindset)',
  'ความเป็นผู้นำ และการมีอิทธิพลต่อสังคม',
  'ความสามารถในการปรับตัวในวัฒนธรรมที่แตกต่าง',
  'ทักษะการสื่อสาร',
  'การจัดการความเครียด ยืดหยุ่น รับมือกับสถานการณ์ต่างๆ การเปลี่ยนแปลง และความฉลาดทางอารมณ์',
  'อื่นๆ (โปรดระบุ)'
];

export default function FormPart2({ data, onChange, onNext, onPrev }: FormPart2Props) {
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    // Check all ratings are selected
    ATTRIBUTES.forEach(attr => {
      if (!data.ratings[attr.id]) {
        newErrors[`rating_${attr.id}`] = 'กรุณาประเมินข้อนี้';
      }
    });

    if (data.strongPoints.length === 0) {
      newErrors.strongPoints = 'กรุณาเลือกลักษณะที่ประทับใจ/โดดเด่นเพื่อเรียงลำดับอย่างน้อย 1 รายการ';
    }

    if (data.strongPoints.includes('อื่นๆ (โปรดระบุ)') && !data.strongPointsOther?.trim()) {
      newErrors.strongPointsOther = 'กรุณาระบุสิ่งที่ท่านประทับใจร่วมด้วย';
    }

    if (data.skillsToImprove.length === 0) {
      newErrors.skillsToImprove = 'กรุณาเลือกทักษะที่ควรเพิ่มพูนอย่างน้อย 1 ทักษะ';
    }

    if (data.skillsToImprove.includes('อื่นๆ (โปรดระบุ)') && !data.skillsToImproveOther?.trim()) {
      newErrors.skillsToImproveOther = 'กรุณาระบุทักษะเพิ่มเติมอื่นๆ';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onNext();
    }
  };

  const handleRatingChange = (attrId: number, value: number) => {
    onChange({
      ...data,
      ratings: {
        ...data.ratings,
        [attrId]: value
      }
    });
    // clear error for this rating
    if (errors[`rating_${attrId}`]) {
      const copy = { ...errors };
      delete copy[`rating_${attrId}`];
      setErrors(copy);
    }
  };

  const handleStrengthToggle = (item: string) => {
    let updated: string[];
    if (data.strongPoints.includes(item)) {
      updated = data.strongPoints.filter(x => x !== item);
    } else {
      updated = [...data.strongPoints, item];
    }
    onChange({
      ...data,
      strongPoints: updated,
      strongPointsOther: updated.includes('อื่นๆ (โปรดระบุ)') ? data.strongPointsOther : ''
    });
  };

  const handleSkillToggle = (item: string) => {
    let updated: string[];
    if (data.skillsToImprove.includes(item)) {
      updated = data.skillsToImprove.filter(x => x !== item);
    } else {
      updated = [...data.skillsToImprove, item];
    }
    onChange({
      ...data,
      skillsToImprove: updated,
      skillsToImproveOther: updated.includes('อื่นๆ (โปรดระบุ)') ? data.skillsToImproveOther : ''
    });
  };

  // Helper helper to format rankings visually
  const getRankNumber = (item: string) => {
    const minDiff = data.strongPoints.indexOf(item);
    return minDiff !== -1 ? minDiff + 1 : null;
  };

  return (
    <form id="form-part-2" onSubmit={handleSubmit} className="space-y-8 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 space-y-6">
        <h3 className="text-xl font-semibold text-slate-800 border-b border-slate-100 pb-3">
          ตอนที่ 2: ความคิดเห็นของผู้บังคับบัญชาต่อคุณภาพบัณฑิต มหาวิทยาลัยกรุงเทพ
        </h3>

        {/* 13 Attributes Evaluator Panel */}
        <div className="space-y-4">
          <p className="text-xs sm:text-sm font-medium text-slate-500 leading-relaxed">
            คำแนะนำ: เลือกให้คะแนนระดับประเมินคุณภาพบัณฑิตในระดับ 1 - 10 ในแถวแต่ละด้านให้ครบถ้วนทุกข้อ<br />
            <span className="text-[11px] text-slate-400 font-normal">(เกณฑ์คะแนน: 10 = ดีเยี่ยม/มากที่สุด, 5 = ปานกลาง, 1 = ควรปรับปรุงเร่งด่วน/น้อยที่สุด)</span>
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                  <th className="p-3 font-medium text-xs sm:text-sm w-[35%] min-w-[140px] sm:min-w-[240px]">คุณลักษณะของบัณฑิต</th>
                  {RATING_LABELS.map(lbl => (
                    <th key={lbl.value} className="p-1 sm:p-2 font-medium text-center w-[6.5%] min-w-[32px] sm:min-w-[48px]">
                      <div className="text-[9px] sm:text-[10px] text-slate-500 font-bold leading-tight min-h-[1.5rem] flex items-center justify-center">
                        {lbl.label}
                      </div>
                      <div className="text-xs sm:text-sm text-slate-800 font-extrabold mt-1">
                        {lbl.value}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ATTRIBUTES.map(attr => {
                  const error = errors[`rating_${attr.id}`];
                  return (
                    <tr
                      id={`rating_${attr.id}`}
                      key={attr.id}
                      className={`survey-row group ${error ? 'bg-rose-50/30' : ''}`}
                    >
                      <td className="p-3 sm:p-4 space-y-1">
                        <div className="text-xs sm:text-sm font-medium text-slate-800">{attr.title}</div>
                        <div className="text-[11px] sm:text-xs text-slate-400 font-light group-hover:text-slate-600">
                          {attr.desc}
                        </div>
                        {error && <p className="text-xs text-rose-500 mt-1 font-normal">{error}</p>}
                      </td>
                      {RATING_LABELS.map(lbl => {
                        const isSelected = data.ratings[attr.id] === lbl.value;
                        return (
                          <td key={lbl.value} className="p-1 sm:p-2 text-center">
                            <label className="inline-flex items-center justify-center cursor-pointer w-7 h-7 sm:w-8 sm:h-8 rounded-full transition-all hover:bg-slate-100">
                              <input
                                type="radio"
                                name={`rating_${attr.id}`}
                                checked={isSelected}
                                onChange={() => handleRatingChange(attr.id, lbl.value)}
                                className="sr-only"
                              />
                              <span
                                className={`w-6.5 h-6.5 sm:w-7.5 sm:h-7.5 rounded-full flex items-center justify-center text-[11px] sm:text-xs transition-all border ${
                                  isSelected
                                    ? 'bg-bu-orange text-white border-bu-orange font-bold shadow-sm'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                                }`}
                              >
                                {lbl.value}
                              </span>
                            </label>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 14. Strong features ranking */}
        <div id="strongPoints" className="space-y-4 pt-4 border-t border-slate-100">
          <label className="block text-sm font-semibold text-slate-700">
            14. สิ่งที่ท่านประทับใจหรือคุณลักษณะที่โดดเด่นในตัวบัณฑิต (เรียงลำดับจากการคลิกเลือก ลำดับ 1, 2, 3...) <span className="text-rose-500">*</span>
          </label>
          <p className="text-xs text-slate-400">
            คลิกที่บัตรเพื่อจัดอันดับความประทับใจ (อันดับ 1 คือประทับใจที่สุด) สามารถคลิกเพื่อยกเลิกการเลือกหรือจัดอันดับใหม่ได้
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {STRENGTHS_POOL.map(strength => {
              const rank = getRankNumber(strength);
              return (
                <div
                  key={strength}
                  onClick={() => handleStrengthToggle(strength)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                    rank
                      ? 'border-bu-orange bg-bu-orange-light text-bu-orange shadow-sm'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <span className="text-sm font-medium">{strength}</span>
                  <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border transition-all ${
                    rank
                      ? 'bg-bu-orange text-white border-bu-orange'
                      : 'bg-white text-slate-400 border-slate-200'
                  }`}>
                    {rank ? rank : ''}
                  </div>
                </div>
              );
            })}
          </div>

          {data.strongPoints.includes('อื่นๆ (โปรดระบุ)') && (
            <input
              type="text"
              placeholder="โปรดระบุสิ่งที่คุณประทับใจเด่นชัดเพิ่มเติม..."
              value={data.strongPointsOther || ''}
              onChange={(e) => onChange({ ...data, strongPointsOther: e.target.value })}
              className="mt-2 w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bu-orange/20 focus:border-bu-orange"
            />
          )}

          {/* Render selected items summary */}
          {data.strongPoints.length > 0 && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="text-xs font-semibold text-slate-500 block mb-2">สรุปอันดับความประทับใจ:</span>
              <div className="flex flex-wrap gap-2">
                {data.strongPoints.map((item, idx) => (
                  <div key={item} className="bg-white px-3 py-1.5 rounded-md border border-slate-200 flex items-center space-x-2 text-xs">
                    <span className="font-bold text-bu-orange bg-bu-orange-light rounded px-1.5 py-0.5">อันดับ {idx + 1}</span>
                    <span className="text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {errors.strongPoints && <p className="text-xs text-rose-500">{errors.strongPoints}</p>}
          {errors.strongPointsOther && <p className="text-xs text-rose-500">{errors.strongPointsOther}</p>}
        </div>

        {/* 15. Skills to improve checklist */}
        <div id="skillsToImprove" className="space-y-4 pt-4 border-t border-slate-100">
          <label className="block text-sm font-semibold text-slate-700">
            15. ท่านคิดว่ามหาวิทยาลัยกรุงเทพควรปลูกฝังหรือเพิ่มพูนทักษะให้กับบัณฑิตในด้านใด (เลือกตอบได้มากกว่า 1 ข้อ) <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SKILLS_TO_IMPROVE_POOL.map(skill => {
              const isChecked = data.skillsToImprove.includes(skill);
              return (
                <label
                  key={skill}
                  className={`flex items-center p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isChecked
                      ? 'border-bu-orange bg-bu-orange-light text-bu-orange font-medium'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleSkillToggle(skill)}
                    className="sr-only"
                  />
                  <span className="text-sm">{skill}</span>
                </label>
              );
            })}
          </div>

          {data.skillsToImprove.includes('อื่นๆ (โปรดระบุ)') && (
            <input
              type="text"
              placeholder="โปรดระบุทักษะอื่นที่มหาวิทยาลัยควรส่งเสริมเพิ่ม..."
              value={data.skillsToImproveOther || ''}
              onChange={(e) => onChange({ ...data, skillsToImproveOther: e.target.value })}
              className="mt-2 w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bu-orange/20 focus:border-bu-orange"
            />
          )}

          {errors.skillsToImprove && <p className="text-xs text-rose-500">{errors.skillsToImprove}</p>}
          {errors.skillsToImproveOther && <p className="text-xs text-rose-500">{errors.skillsToImproveOther}</p>}
        </div>

        {/* 16. Comments and suggestions */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <label className="block text-sm font-semibold text-slate-700">
            16. ข้อเสนอแนะอื่นๆ เพื่อให้มหาวิทยาลัยนำไปพัฒนาการจัดกิจกรรมและหลักสูตรให้สอดคล้องความต้องการของผู้ประกอบการยิ่งขึ้น (ถ้ามี)
          </label>
          <textarea
            rows={4}
            placeholder="เขียนคำแนะนำเพิ่มเติมเกี่ยวกับคุณภาพ บัณฑิต หรือการปรับการเรียนการสอน..."
            value={data.suggestions || ''}
            onChange={(e) => onChange({ ...data, suggestions: e.target.value })}
            className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-bu-orange/20 focus:border-bu-orange"
          />
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onPrev}
          className="border border-slate-200 hover:bg-slate-100 text-slate-600 font-medium px-6 py-3 rounded-xl transition-all cursor-pointer"
        >
          ย้อนกลับ
        </button>
        <button
          type="submit"
          className="bg-bu-orange hover:bg-bu-orange-hover text-white font-medium px-6 py-3 rounded-xl transition-all shadow-md active:scale-[0.98] cursor-pointer"
        >
          ถัดไป (ตอนที่ 3)
        </button>
      </div>
    </form>
  );
}
