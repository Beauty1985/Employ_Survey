import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Award,
  AlertCircle,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit3,
  FileWarning,
  GraduationCap,
  Layers,
  MessageSquare,
  Printer,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { SurveyResponse } from '../types';

export interface InfographicReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  responses: SurveyResponse[];
  allResponses: SurveyResponse[];
  totalSentCount: number;
  filterSummary: {
    year: string;
    month: string;
    faculty: string;
    department: string;
  };
}

const DIM_LABELS_SHORT = [
  '1.คุณธรรมฯ',
  '2.ความรู้',
  '3.ทักษะปัญญา',
  '4.สัมพันธ์ฯ',
  '5.วิเคราะห์/IT',
  '6.สร้างสรรค์',
  '7.ผู้ประกอบการ',
  '8.สากล',
  '9.ตั้งคำถาม',
  '10.ไหวพริบ',
  '11.ร่วมมือผู้อื่น',
  '12.มุ่งมั่นเรียนรู้',
];

const DIM_LABELS_FULL = [
  'ด้านคุณธรรม จริยธรรม',
  'ด้านความรู้',
  'ด้านทักษะทางปัญญา',
  'ด้านความสัมพันธ์ระหว่างบุคคลและความรับผิดชอบ',
  'ด้านทักษะการวิเคราะห์เชิงตัวเลข การสื่อสาร และไอที',
  'ด้านความคิดสร้างสรรค์',
  'ด้านจิตวิญญาณความเป็นผู้ประกอบการ',
  'ด้านความเป็นสากล',
  'ด้านความฉลาดในการตั้งคำถาม',
  'ด้านความฉลาดมีไหวพริบทันโลก',
  'ด้านทักษะการทำงานร่วมกับผู้อื่น',
  'ด้านความมุ่งมั่น ตั้งใจเรียนรู้ และสู้ในสิ่งที่รัก',
];

function shortenLabel(label: string, maxLen = 30): string {
  const cleaned = label
    .replace(/^สาขาวิชาด้าน/, '')
    .replace(/^อุตสาหกรรม/, '')
    .replace(/^ทักษะ/, '')
    .replace(/\s*เช่น\s*.*$/, '')
    .trim();
  if (cleaned.length <= maxLen) return cleaned;
  return `${cleaned.slice(0, maxLen - 1)}…`;
}

function normalizeText(s: string): string {
  return String(s || '')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function getQualityLevelLabel(score: number): string {
  if (score >= 4.5) return 'มากที่สุด';
  if (score >= 3.5) return 'มาก';
  if (score >= 2.5) return 'ปานกลาง';
  if (score >= 1.5) return 'น้อย';
  return 'น้อยที่สุด';
}

function BangkokUniversityLogo({ customLogoUrl }: { customLogoUrl: string | null }) {
  if (customLogoUrl) {
    return (
      <img
        src={customLogoUrl}
        alt="Bangkok University Logo"
        className="h-11 w-auto object-contain max-w-[190px]"
      />
    );
  }

  return (
    <div className="flex items-center gap-2.5 select-none">
      {/* Geometric BU Diamond Emblem */}
      <svg
        width="38"
        height="40"
        viewBox="0 0 64 68"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-label="Bangkok University Emblem"
      >
        <polygon points="32,2 58,19 32,34" fill="#F26522" />
        <polygon points="32,2 6,19 32,34" fill="#F7941D" />
        <polygon points="6,19 6,49 32,34" fill="#0F3554" />
        <polygon points="58,19 58,49 32,34" fill="#009CA6" />
        <polygon points="6,49 32,66 32,34" fill="#144D7A" />
        <polygon points="58,49 32,66 32,34" fill="#E94E24" />
        <polygon points="32,14 46,24 32,34 18,24" fill="#FFFFFF" fillOpacity="0.92" />
        <text
          x="32"
          y="27"
          textAnchor="middle"
          fill="#0F3554"
          fontSize="11"
          fontWeight="800"
          fontFamily="Prompt, Sarabun, sans-serif"
        >
          BU
        </text>
      </svg>
      <div className="leading-none">
        <div
          className="text-[12.5px] font-extrabold tracking-wide text-[#0F3554]"
          style={{ fontFamily: "'Prompt', 'Sarabun', sans-serif" }}
        >
          BANGKOK
        </div>
        <div
          className="text-[12.5px] font-extrabold tracking-wide text-[#0F3554] mt-0.5"
          style={{ fontFamily: "'Prompt', 'Sarabun', sans-serif" }}
        >
          UNIVERSITY
        </div>
        <div className="text-[7.5px] font-bold tracking-[0.14em] text-[#F26522] mt-0.5">
          THE CREATIVE UNIVERSITY
        </div>
      </div>
    </div>
  );
}

export default function InfographicReportModal({
  isOpen,
  onClose,
  responses,
  allResponses,
  totalSentCount,
  filterSummary,
}: InfographicReportModalProps) {
  const [showEditor, setShowEditor] = useState(false);
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem('bu_infographic_custom_logo');
    } catch {
      return null;
    }
  });

  // Compute deterministic analytics from filtered responses
  const stats = useMemo(() => {
    const n = responses.length;
    const responseRate = totalSentCount > 0 ? (n / totalSentCount) * 100 : 0;

    // 12 Dimensions (ratings 1..10 -> /2 to 5.00 scale)
    const dimScores: number[][] = Array.from({ length: 12 }, () => []);
    const all12Scores5: number[] = [];
    let highSatCount = 0;

    // Part 1 counters
    const orgCounts = {
      gov: 0,
      stateEnt: 0,
      private: 0,
      intl: 0,
      personal: 0,
      other: 0,
    };
    const posCounts: Record<string, number> = {};
    const expCounts = {
      lt5: 0,
      y5_10: 0,
      y11_15: 0,
      gt15: 0,
    };
    const durCounts = {
      lt4m: 0,
      m4_8: 0,
      m9_1y: 0,
      y1_3: 0,
      gt3y: 0,
    };
    const industryCounts: Record<string, number> = {};

    // Part 2 counters
    const strongCounts: Record<string, number> = {};
    const improveCounts: Record<string, number> = {};
    const suggestionList: string[] = [];

    // Part 3 counters
    const majorCounts: Record<string, number> = {};
    const criteriaCounts: Record<string, number> = {};
    let expReqYes = 0;
    let expMonthsSum = 0;
    let expMonthsCount = 0;

    responses.forEach((resp) => {
      // Part 1
      const p1 = resp.part1;
      if (p1) {
        const org = normalizeText(p1.orgType);
        if (org.includes('รัฐวิสาหกิจ')) orgCounts.stateEnt++;
        else if (org.includes('หน่วยงานของรัฐ')) orgCounts.gov++;
        else if (org.includes('เอกชน')) orgCounts.private++;
        else if (org.includes('ต่างประเทศ') || org.includes('ระหว่างประเทศ')) orgCounts.intl++;
        else if (org.includes('ธุรกิจส่วนตัว') || org.includes('ครอบครัว')) orgCounts.personal++;
        else if (org) orgCounts.other++;

        const posRaw = p1.position === 'อื่นๆ (โปรดระบุ)' && p1.positionOther ? p1.positionOther : p1.position;
        if (posRaw) {
          const shortPos = posRaw.includes('หัวหน้างาน')
            ? 'หัวหน้างาน/แผนก/ฝ่าย'
            : posRaw.includes('ผู้จัดการ')
            ? 'ผู้จัดการ/ผู้อำนวยการ'
            : posRaw;
          posCounts[shortPos] = (posCounts[shortPos] || 0) + 1;
        }

        const exp = normalizeText(p1.experience);
        if (exp.includes('น้อยกว่า 5')) expCounts.lt5++;
        else if (exp.includes('5 - 10') || exp.includes('5-10')) expCounts.y5_10++;
        else if (exp.includes('11 - 15') || exp.includes('11-15')) expCounts.y11_15++;
        else if (exp.includes('15')) expCounts.gt15++;

        const dur = normalizeText(p1.graduateDuration);
        if (dur.includes('น้อยกว่า 4')) durCounts.lt4m++;
        else if (dur.includes('4 - 8') || dur.includes('4-8')) durCounts.m4_8++;
        else if (dur.includes('9 เดือน')) durCounts.m9_1y++;
        else if (dur.includes('1 - 3') || dur.includes('1-3')) durCounts.y1_3++;
        else if (dur.includes('มากกว่า 3 ปี')) durCounts.gt3y++;

        if (p1.industries) {
          const arr = Array.isArray(p1.industries) ? p1.industries : [p1.industries];
          arr.forEach((ind) => {
            const key = ind === 'อื่นๆ (โปรดระบุ)' && p1.industriesOther ? p1.industriesOther : ind;
            if (key) industryCounts[key] = (industryCounts[key] || 0) + 1;
          });
        }
      }

      // Part 2
      const p2 = resp.part2;
      if (p2) {
        for (let d = 1; d <= 12; d++) {
          const raw = Number(p2.ratings?.[d]);
          if (raw >= 1 && raw <= 10) {
            const s5 = raw / 2;
            dimScores[d - 1].push(s5);
            all12Scores5.push(s5);
            if (s5 >= 3.5) highSatCount++;
          }
        }
        if (Array.isArray(p2.strongPoints)) {
          p2.strongPoints.forEach((sp) => {
            const key = sp === 'อื่นๆ (โปรดระบุ)' && p2.strongPointsOther ? p2.strongPointsOther : sp;
            if (key) strongCounts[key] = (strongCounts[key] || 0) + 1;
          });
        }
        if (Array.isArray(p2.skillsToImprove)) {
          p2.skillsToImprove.forEach((sk) => {
            const key = sk === 'อื่นๆ (โปรดระบุ)' && p2.skillsToImproveOther ? p2.skillsToImproveOther : sk;
            if (key) improveCounts[key] = (improveCounts[key] || 0) + 1;
          });
        }
        if (p2.suggestions?.trim()) {
          suggestionList.push(p2.suggestions.trim());
        }
      }

      // Part 3
      const p3 = resp.part3;
      if (p3) {
        if (Array.isArray(p3.neededMajors)) {
          p3.neededMajors.forEach((mj) => {
            const key = mj === 'สาขาวิชาอื่นๆ (ระบุ)' && p3.neededMajorsOther ? p3.neededMajorsOther : mj;
            if (key) majorCounts[key] = (majorCounts[key] || 0) + 1;
          });
        }
        if (Array.isArray(p3.selectionCriteria)) {
          p3.selectionCriteria.forEach((sc) => {
            const key = sc === 'อื่นๆ (ระบุ)' && p3.selectionCriteriaOther ? p3.selectionCriteriaOther : sc;
            if (key) criteriaCounts[key] = (criteriaCounts[key] || 0) + 1;
          });
        }
        if (p3.requiresExperience === 'yes') {
          expReqYes++;
          if (p3.experienceMonths && Number(p3.experienceMonths) > 0) {
            expMonthsSum += Number(p3.experienceMonths);
            expMonthsCount++;
          }
        }
      }
    });

    const dimMeans = dimScores.map((arr) =>
      arr.length > 0 ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)) : 0
    );

    const overallMean =
      all12Scores5.length > 0
        ? Number((all12Scores5.reduce((a, b) => a + b, 0) / all12Scores5.length).toFixed(2))
        : 0;

    const variance =
      all12Scores5.length > 0
        ? all12Scores5.reduce((sum, val) => sum + Math.pow(val - overallMean, 2), 0) / all12Scores5.length
        : 0;
    const overallSd = Number(Math.sqrt(variance).toFixed(2));
    const highSatPct = all12Scores5.length > 0 ? Number(((highSatCount / all12Scores5.length) * 100).toFixed(1)) : 0;

    // Highest & Lowest dimensions
    const rankedDims = dimMeans
      .map((mean, idx) => ({ idx, label: DIM_LABELS_FULL[idx], short: DIM_LABELS_SHORT[idx], mean }))
      .filter((d) => d.mean > 0)
      .sort((a, b) => b.mean - a.mean);
    const highestDim = rankedDims[0] || null;
    const lowestDim = rankedDims[rankedDims.length - 1] || null;

    // Auto-calculate prior year data if filterYear is a specific year
    let autoPriorOverall = 0;
    const autoPriorDims = Array(12).fill(0) as number[];
    const numericYear = Number(filterSummary.year);
    if (!Number.isNaN(numericYear) && numericYear > 2500) {
      const prevYearStr = String(numericYear - 1);
      const prevResponses = allResponses.filter((r) => {
        const matchYr = r.academicYear === prevYearStr;
        const matchFac = filterSummary.faculty === 'ทั้งหมด' || r.faculty === filterSummary.faculty;
        const matchDept = filterSummary.department === 'ทั้งหมด' || r.department === filterSummary.department;
        return matchYr && matchFac && matchDept;
      });
      if (prevResponses.length > 0) {
        const prevDimScores: number[][] = Array.from({ length: 12 }, () => []);
        const prevAll: number[] = [];
        prevResponses.forEach((pr) => {
          for (let d = 1; d <= 12; d++) {
            const raw = Number(pr.part2?.ratings?.[d]);
            if (raw >= 1 && raw <= 10) {
              const s5 = raw / 2;
              prevDimScores[d - 1].push(s5);
              prevAll.push(s5);
            }
          }
        });
        prevDimScores.forEach((arr, idx) => {
          autoPriorDims[idx] = arr.length > 0 ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)) : 0;
        });
        autoPriorOverall =
          prevAll.length > 0 ? Number((prevAll.reduce((a, b) => a + b, 0) / prevAll.length).toFixed(2)) : 0;
      }
    }

    const toPct = (count: number) => (n > 0 ? Number(((count / n) * 100).toFixed(1)) : 0);

    const orgBars = [
      { label: 'เอกชน', count: orgCounts.private, pct: toPct(orgCounts.private), color: '#0F4C81' },
      { label: 'ธุรกิจส่วนตัว', count: orgCounts.personal, pct: toPct(orgCounts.personal), color: '#0D7A6F' },
      { label: 'รัฐ', count: orgCounts.gov, pct: toPct(orgCounts.gov), color: '#2B7A9E' },
      { label: 'รัฐวิสาหกิจ', count: orgCounts.stateEnt, pct: toPct(orgCounts.stateEnt), color: '#4E9BB9' },
      { label: 'ต่างประเทศ', count: orgCounts.intl, pct: toPct(orgCounts.intl), color: '#F26522' },
      { label: 'อื่นๆ', count: orgCounts.other, pct: toPct(orgCounts.other), color: '#8CA3B8' },
    ];

    const topPositions = Object.entries(posCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([label, count]) => ({ label, count, pct: toPct(count) }));

    const topIndustries = Object.entries(industryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({ label: shortenLabel(label, 28), fullLabel: label, count, pct: toPct(count) }));

    const topStrengths = Object.entries(strongCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({ label: shortenLabel(label, 32), count, pct: toPct(count) }));

    const topImprove = Object.entries(improveCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([label, count]) => ({ label: shortenLabel(label, 34), count, pct: toPct(count) }));

    const topMajors = Object.entries(majorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([label, count]) => ({ label: shortenLabel(label, 34), count, pct: toPct(count) }));

    const profCriteriaCount = criteriaCounts['ความรู้ความสามารถในวิชาชีพ'] || 0;
    const attitudeCriteriaCount = criteriaCounts['ทัศนคติ'] || 0;
    const capabilityCriteriaCount = criteriaCounts['ขีดความสามารถ'] || 0;

    return {
      n,
      responseRate,
      dimMeans,
      overallMean,
      overallSd,
      highSatPct,
      qualityLevel: getQualityLevelLabel(overallMean),
      highestDim,
      lowestDim,
      autoPriorOverall,
      autoPriorDims,
      orgBars,
      topPositions,
      expDist: [
        { label: '< 5 ปี', pct: toPct(expCounts.lt5), count: expCounts.lt5 },
        { label: '5-10 ปี', pct: toPct(expCounts.y5_10), count: expCounts.y5_10 },
        { label: '11-15 ปี', pct: toPct(expCounts.y11_15), count: expCounts.y11_15 },
        { label: '> 15 ปี', pct: toPct(expCounts.gt15), count: expCounts.gt15 },
      ],
      durDist: [
        { label: '< 4 ด.', pct: toPct(durCounts.lt4m), count: durCounts.lt4m },
        { label: '4-8 ด.', pct: toPct(durCounts.m4_8), count: durCounts.m4_8 },
        { label: '9 ด.-1 ปี', pct: toPct(durCounts.m9_1y), count: durCounts.m9_1y },
        { label: '> 1-3 ปี', pct: toPct(durCounts.y1_3), count: durCounts.y1_3 },
        { label: '> 3 ปี', pct: toPct(durCounts.gt3y), count: durCounts.gt3y },
      ],
      topIndustries,
      criteriaMetrics: {
        knowledgePct: toPct(profCriteriaCount),
        attitudePct: toPct(attitudeCriteriaCount),
        capabilityPct: toPct(capabilityCriteriaCount),
        expReqPct: toPct(expReqYes),
        avgMonths: expMonthsCount > 0 ? Number((expMonthsSum / expMonthsCount).toFixed(1)) : 0,
      },
      topStrengths,
      topImprove,
      topMajors,
      suggestionCount: suggestionList.length,
      sampleSuggestion: suggestionList[0] || '',
    };
  }, [responses, allResponses, totalSentCount, filterSummary]);

  // Build default narrative texts derived from actual filtered stats
  const defaultDraft = useMemo(() => {
    const scopeText =
      filterSummary.faculty !== 'ทั้งหมด'
        ? filterSummary.department !== 'ทั้งหมด'
          ? `${filterSummary.faculty} (${filterSummary.department})`
          : filterSummary.faculty
        : 'ทุกคณะวิชา';

    const topStrengthName = stats.topStrengths[0]?.label || 'ความมุ่งมั่นและทักษะร่วมสมัย';
    const topImproveName = stats.topImprove[0]?.label || 'ทักษะการวิเคราะห์และการสื่อสาร';
    const topMajorName = stats.topMajors[0]?.label || 'บริหารธุรกิจและเทคโนโลยีดิจิทัล';

    const diffVal = stats.autoPriorOverall > 0 ? stats.overallMean - stats.autoPriorOverall : 0;
    const yoyClause =
      stats.autoPriorOverall > 0
        ? `เทียบกับปีก่อน (${stats.autoPriorOverall.toFixed(2)}) เปลี่ยนแปลง ${diffVal >= 0 ? '+' : ''}${diffVal.toFixed(2)} คะแนน`
        : 'สอดคล้องกับเกณฑ์มาตรฐานคุณภาพบัณฑิตของมหาวิทยาลัย';

    const summaryOverview = `ผู้บังคับบัญชาจำนวน ${stats.n} ราย (${scopeText}) ประเมินคุณภาพบัณฑิตโดยรวมอยู่ในระดับ "${stats.qualityLevel}" คะแนนเฉลี่ย ${stats.overallMean.toFixed(2)} / 5.00 (มาก–มากที่สุด ${stats.highSatPct.toFixed(1)}%)`;
    const summaryHighlight = stats.highestDim
      ? `ด้านที่ได้คะแนนสูงสุดคือ ${stats.highestDim.label} (${stats.highestDim.mean.toFixed(2)}) และโดดเด่นด้าน "${topStrengthName}" ทั้งนี้${yoyClause}`
      : `ผลประเมินภาพรวมสะท้อนจุดเด่นด้าน "${topStrengthName}" และ${yoyClause}`;

    const insightImprove = stats.lowestDim
      ? `ประเด็นที่ควรส่งเสริมเพิ่มเติม ได้แก่ ${stats.lowestDim.label} (${stats.lowestDim.mean.toFixed(2)}) และทักษะ "${topImproveName}"`
      : `ควรส่งเสริมทักษะ "${topImproveName}" ให้สอดรับกับการปฏิบัติงานจริง`;

    const insightFeedback =
      stats.suggestionCount > 0 && stats.sampleSuggestion
        ? `จากข้อเสนอแนะ ${stats.suggestionCount} รายการ ผู้ประกอบการเน้นความพร้อมในการปรับตัวและทักษะเฉพาะทาง เช่น "${shortenLabel(stats.sampleSuggestion, 58)}"`
        : `ผู้ประเมินให้ความสำคัญกับทัศนคติในการทำงาน (${stats.criteriaMetrics.attitudePct}%) และความรู้ในวิชาชีพ (${stats.criteriaMetrics.knowledgePct}%)`;

    const insightDemand = `องค์กรส่วนใหญ่ต้องการบุคลากรกลุ่ม "${topMajorName}" โดย ${stats.criteriaMetrics.expReqPct}% ต้องการประสบการณ์ฝึกงาน${
      stats.criteriaMetrics.avgMonths > 0 ? ` (เฉลี่ย ${stats.criteriaMetrics.avgMonths} เดือน)` : ''
    }`;

    const headlineQuote = `“คุณภาพบัณฑิตโดยรวมอยู่ในระดับ${stats.qualityLevel} ด้วยคะแนนเฉลี่ย ${stats.overallMean.toFixed(2)} จาก 5.00”`;

    return {
      yearTag: `ปีการศึกษา ${filterSummary.year} | สำนักมาตรฐานคุณภาพการศึกษา`,
      headlineQuote,
      summaryOverview,
      summaryHighlight,
      insightImprove,
      insightFeedback,
      insightDemand,
      priorOverall: stats.autoPriorOverall > 0 ? stats.autoPriorOverall.toFixed(2) : '',
      priorDims: stats.autoPriorDims.map((v) => (v > 0 ? v.toFixed(2) : '')),
    };
  }, [stats, filterSummary]);

  const [yearTag, setYearTag] = useState(defaultDraft.yearTag);
  const [headlineQuote, setHeadlineQuote] = useState(defaultDraft.headlineQuote);
  const [summaryOverview, setSummaryOverview] = useState(defaultDraft.summaryOverview);
  const [summaryHighlight, setSummaryHighlight] = useState(defaultDraft.summaryHighlight);
  const [insightImprove, setInsightImprove] = useState(defaultDraft.insightImprove);
  const [insightFeedback, setInsightFeedback] = useState(defaultDraft.insightFeedback);
  const [insightDemand, setInsightDemand] = useState(defaultDraft.insightDemand);
  const [priorOverallInput, setPriorOverallInput] = useState(defaultDraft.priorOverall);
  const [priorDimsInput, setPriorDimsInput] = useState<string[]>(defaultDraft.priorDims);

  // Sync draft automatically whenever filters/data change or modal opens
  useEffect(() => {
    if (isOpen) {
      setYearTag(defaultDraft.yearTag);
      setHeadlineQuote(defaultDraft.headlineQuote);
      setSummaryOverview(defaultDraft.summaryOverview);
      setSummaryHighlight(defaultDraft.summaryHighlight);
      setInsightImprove(defaultDraft.insightImprove);
      setInsightFeedback(defaultDraft.insightFeedback);
      setInsightDemand(defaultDraft.insightDemand);
      setPriorOverallInput(defaultDraft.priorOverall);
      setPriorDimsInput(defaultDraft.priorDims);
    }
  }, [isOpen, defaultDraft]);

  if (!isOpen) return null;

  const handleResetDraft = () => {
    setYearTag(defaultDraft.yearTag);
    setHeadlineQuote(defaultDraft.headlineQuote);
    setSummaryOverview(defaultDraft.summaryOverview);
    setSummaryHighlight(defaultDraft.summaryHighlight);
    setInsightImprove(defaultDraft.insightImprove);
    setInsightFeedback(defaultDraft.insightFeedback);
    setInsightDemand(defaultDraft.insightDemand);
    setPriorOverallInput(defaultDraft.priorOverall);
    setPriorDimsInput(defaultDraft.priorDims);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCustomLogoUrl(reader.result);
        try {
          window.localStorage.setItem('bu_infographic_custom_logo', reader.result);
        } catch {
          // Ignore storage quota errors
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearLogo = () => {
    setCustomLogoUrl(null);
    try {
      window.localStorage.removeItem('bu_infographic_custom_logo');
    } catch {
      // Ignore
    }
  };

  const parsedPriorOverall = parseFloat(priorOverallInput);
  const hasPriorOverall = !Number.isNaN(parsedPriorOverall) && parsedPriorOverall > 0;
  const yoyDiff = hasPriorOverall ? stats.overallMean - parsedPriorOverall : null;

  const priorDimsNumeric = priorDimsInput.map((val) => {
    const num = parseFloat(val);
    return !Number.isNaN(num) && num > 0 ? Math.min(5, num) : 0;
  });
  const hasAnyPriorDims = priorDimsNumeric.some((v) => v > 0);

  const todayFormatted = new Date().toLocaleDateString('th-TH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  // SVG Grouped Bar Chart layout constants
  const svgW = 465;
  const svgH = 148;
  const chartLeft = 22;
  const chartRight = 6;
  const chartTop = 18;
  const chartBottom = 34;
  const plotW = svgW - chartLeft - chartRight;
  const plotH = svgH - chartTop - chartBottom;
  const groupW = plotW / 12;

  const modalContent = (
    <div
      id="infographic-print-portal"
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-[2px] flex flex-col overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="รายงานสรุปผู้บริหาร Infographic A4"
    >
      {/* Print CSS for 1-page A4 Portrait */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 6mm;
        }
        @media print {
          html, body {
            width: 210mm !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body > *:not(#infographic-print-portal) {
            display: none !important;
          }
          #infographic-print-portal {
            position: static !important;
            inset: auto !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: visible !important;
            display: block !important;
          }
          .no-print {
            display: none !important;
          }
          .a4-preview-wrapper {
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
          }
          .a4-sheet {
            width: 198mm !important;
            height: 284mm !important;
            max-height: 284mm !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            overflow: hidden !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
        }
      `}</style>

      {/* Top Sticky Control Bar (Hidden on Print) */}
      <div className="no-print sticky top-0 z-20 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-[#0F3554] text-white flex items-center justify-center shrink-0">
            <Printer className="w-4 h-4" />
          </span>
          <div>
            <h3 className="font-sans text-base font-bold text-slate-900 leading-tight">
              ออกรายงานผู้บริหาร PDF (A4 Infographic 1 หน้า)
            </h3>
            <p className="text-xs text-slate-600">
              ขอบเขตข้อมูล: ปี {filterSummary.year} · เดือน {filterSummary.month} · {filterSummary.faculty}
              {filterSummary.department !== 'ทั้งหมด' ? ` · ${filterSummary.department}` : ''} ({stats.n} รายการ)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {stats.n > 0 && (
            <button
              type="button"
              onClick={() => setShowEditor((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
            >
              <Edit3 className="w-4 h-4 text-[#0F4C81]" />
              <span>แก้ไขข้อความ &amp; เทียบปีก่อน</span>
              {showEditor ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}

          <button
            type="button"
            disabled={stats.n === 0}
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F3554] hover:bg-[#14466e] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-semibold transition-colors shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>บันทึกเป็น PDF / พิมพ์รายงาน (A4)</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>ปิด</span>
          </button>
        </div>
      </div>

      {/* Collapsible Pre-Print Editor Panel (Hidden on Print) */}
      {showEditor && stats.n > 0 && (
        <div className="no-print bg-[#F4F8FB] border-b border-slate-200 px-4 sm:px-6 py-4">
          <div className="max-w-5xl mx-auto bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm sm:text-base font-bold text-slate-900">
                  ปรับแต่งข้อความสรุป ตัวเลขเทียบปีก่อน และโลโก้มหาวิทยาลัยก่อนพิมพ์
                </h4>
                <p className="text-xs text-slate-600">
                  การแก้ไขจะแสดงผลทันทีในตัวอย่าง A4 ด้านล่าง และซ่อนแผงนี้โดยอัตโนมัติเมื่อพิมพ์เป็น PDF
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetDraft}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>รีเซ็ตเป็นข้อความอัตโนมัติ</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ป้ายระบุปีการศึกษา / หน่วยงาน (มุมขวาบน)</label>
                <input
                  type="text"
                  value={yearTag}
                  onChange={(e) => setYearTag(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">พาดหัวรองสรุปภาพรวม (Sub-headline)</label>
                <input
                  type="text"
                  value={headlineQuote}
                  onChange={(e) => setHeadlineQuote(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-emerald-800 mb-1">
                  ผลลัพธ์หลักและจุดเด่น (คอลัมน์ 1)
                </label>
                <textarea
                  rows={2}
                  value={summaryOverview}
                  onChange={(e) => setSummaryOverview(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-emerald-800 mb-1">
                  ผลลัพธ์หลักและจุดเด่น (คอลัมน์ 2)
                </label>
                <textarea
                  rows={2}
                  value={summaryHighlight}
                  onChange={(e) => setSummaryHighlight(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-amber-800 mb-1">
                  ข้อสังเกต 1: ประเด็นพัฒนา
                </label>
                <textarea
                  rows={2}
                  value={insightImprove}
                  onChange={(e) => setInsightImprove(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-amber-800 mb-1">
                  ข้อสังเกต 2: เสียงสะท้อน/เกณฑ์คัดเลือก
                </label>
                <textarea
                  rows={2}
                  value={insightFeedback}
                  onChange={(e) => setInsightFeedback(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-amber-800 mb-1">
                  ข้อสังเกต 3: ความต้องการตลาดแรงงาน
                </label>
                <textarea
                  rows={2}
                  value={insightDemand}
                  onChange={(e) => setInsightDemand(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>

            {/* Prior Year Comparison + Logo */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  คะแนนเฉลี่ยรวมปีก่อน (ถ้ามี, เต็ม 5.00)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="5"
                  placeholder="เช่น 4.35"
                  value={priorOverallInput}
                  onChange={(e) => setPriorOverallInput(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                />
                <div className="pt-1 flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-[#F26522]" />
                    <span>อัปโหลดโลโก้ BU (.png/.svg)</span>
                    <input type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={handleLogoUpload} className="sr-only" />
                  </label>
                  {customLogoUrl && (
                    <button
                      type="button"
                      onClick={handleClearLogo}
                      className="text-xs text-rose-600 hover:underline cursor-pointer"
                    >
                      ใช้โลโก้มาตรฐาน
                    </button>
                  )}
                </div>
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  คะแนนปีก่อนรายด้าน 12 ด้าน (ใช้แสดงแท่งเปรียบเทียบในกราฟ)
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {DIM_LABELS_SHORT.map((lbl, idx) => (
                    <div key={lbl}>
                      <span className="block text-[10px] text-slate-500 truncate">{lbl}</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="5"
                        placeholder="-"
                        value={priorDimsInput[idx] || ''}
                        onChange={(e) => {
                          const next = [...priorDimsInput];
                          next[idx] = e.target.value;
                          setPriorDimsInput(next);
                        }}
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md tabular-nums"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area: Empty State or A4 Preview */}
      <div className="a4-preview-wrapper flex-1 p-4 sm:p-6 flex justify-center items-start">
        {stats.n === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-8 text-center space-y-3 my-8">
            <FileWarning className="w-12 h-12 text-amber-500 mx-auto" />
            <h4 className="font-sans text-lg font-bold text-slate-900">
              ไม่พบข้อมูลแบบสอบถามสำหรับออกรายงาน กรุณาตรวจสอบตัวกรอง
            </h4>
            <p className="text-sm text-slate-600">
              กรุณาเลือกปีการศึกษา เดือน คณะ หรือสาขาวิชาที่มีผู้ตอบแบบประเมินอย่างน้อย 1 รายการก่อนเปิดรายงาน A4
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 px-5 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 cursor-pointer"
            >
              กลับไปที่แดชบอร์ด
            </button>
          </div>
        ) : (
          /* Exact 210mm x 297mm A4 Portrait Infographic Canvas */
          <div
            className="a4-sheet bg-white shadow-2xl border border-slate-200 flex flex-col justify-between overflow-hidden text-slate-800"
            style={{
              width: '210mm',
              minHeight: '297mm',
              fontFamily: "'Prompt', 'Sarabun', sans-serif",
            }}
          >
            {/* Inner Body Container */}
            <div className="px-[6mm] pt-[5mm] pb-[3.5mm] flex-1 flex flex-col justify-between gap-[2.8mm]">
              {/* HEADER ROW */}
              <header className="space-y-[1.8mm] border-b-2 border-[#0F3554]/15 pb-[2.2mm]">
                <div className="flex items-center justify-between gap-3">
                  <BangkokUniversityLogo customLogoUrl={customLogoUrl} />

                  <div className="text-right space-y-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E6F2F8] border border-[#BFD9EB] text-[#0F3554] text-[9.5px] font-semibold">
                      <CheckCircle2 className="w-3 h-3 text-[#0D7A6F]" />
                      <span>{yearTag}</span>
                    </span>
                    {(filterSummary.faculty !== 'ทั้งหมด' ||
                      filterSummary.department !== 'ทั้งหมด' ||
                      filterSummary.month !== 'ทั้งหมด') && (
                      <div className="text-[8.5px] text-slate-600 font-medium">
                        ขอบเขต: {filterSummary.faculty}
                        {filterSummary.department !== 'ทั้งหมด' ? ` / ${filterSummary.department}` : ''}
                        {filterSummary.month !== 'ทั้งหมด' ? ` · เดือน${filterSummary.month}` : ''}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-center pt-[0.5mm]">
                  <h1 className="text-[14.5px] font-bold text-[#0F3554] tracking-tight leading-snug">
                    ผลสำรวจความคิดเห็นของผู้บังคับบัญชาต่อคุณภาพบัณฑิต มหาวิทยาลัยกรุงเทพ
                  </h1>
                  <p className="text-[10.5px] font-semibold italic text-[#0D7A6F] leading-snug mt-0.5">
                    {headlineQuote}
                  </p>
                </div>
              </header>

              {/* SECTION 1: EXECUTIVE SUMMARY NARRATIVE */}
              <section className="space-y-[2mm]">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#0F3554] text-white text-[9.5px] font-semibold tracking-wide">
                    <Sparkles className="w-3 h-3 text-[#F7941D]" />
                    <span>สรุปผลการประเมินและข้อค้นพบสำคัญ</span>
                  </span>
                  <div className="flex-1 h-px bg-[#D7E6F2]" />
                </div>

                <div className="grid grid-cols-12 gap-[2.5mm]">
                  {/* Card A: Strengths & Key Results (2 columns) */}
                  <div className="col-span-5 rounded-xl bg-[#EAF7F3] border border-[#CBE9DF] p-[2.6mm] space-y-[1.8mm]">
                    <div>
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#0D7A6F] text-white text-[8.5px] font-semibold">
                        ผลลัพธ์หลักและจุดเด่น
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-[2mm]">
                      <div className="flex items-start gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-white border border-[#B5E0D2] text-[#0D7A6F] flex items-center justify-center shrink-0 mt-0.5">
                          <Award className="w-3 h-3" />
                        </span>
                        <p className="text-[8.2px] leading-[1.42] text-slate-800">{summaryOverview}</p>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-white border border-[#B5E0D2] text-[#0D7A6F] flex items-center justify-center shrink-0 mt-0.5">
                          <TrendingUp className="w-3 h-3" />
                        </span>
                        <p className="text-[8.2px] leading-[1.42] text-slate-800">{summaryHighlight}</p>
                      </div>
                    </div>
                  </div>

                  {/* Card B: Observations & Labor Market Demand (3 columns) */}
                  <div className="col-span-7 rounded-xl bg-[#F4F8FC] border border-[#D4E4F2] p-[2.6mm] space-y-[1.8mm]">
                    <div>
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#C98A1C] text-white text-[8.5px] font-semibold">
                        ข้อสังเกตและความต้องการตลาดแรงงาน
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-[2mm]">
                      <div className="flex items-start gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-white border border-[#E9D7B0] text-[#B87B14] flex items-center justify-center shrink-0 mt-0.5">
                          <AlertCircle className="w-3 h-3" />
                        </span>
                        <p className="text-[8.2px] leading-[1.42] text-slate-800">{insightImprove}</p>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-white border border-[#C9DDF0] text-[#0F4C81] flex items-center justify-center shrink-0 mt-0.5">
                          <MessageSquare className="w-3 h-3" />
                        </span>
                        <p className="text-[8.2px] leading-[1.42] text-slate-800">{insightFeedback}</p>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-white border border-[#C9DDF0] text-[#0F4C81] flex items-center justify-center shrink-0 mt-0.5">
                          <Briefcase className="w-3 h-3" />
                        </span>
                        <p className="text-[8.2px] leading-[1.42] text-slate-800">{insightDemand}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* SECTION 2: RESPONDENT PROFILE & RECRUITMENT CRITERIA */}
              <section className="space-y-[2mm]">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#0F3554] text-white text-[9.5px] font-semibold tracking-wide">
                    <Users className="w-3 h-3 text-[#7CC6FE]" />
                    <span>ข้อมูลผู้ตอบแบบสำรวจและเกณฑ์การคัดเลือกบุคลากร</span>
                  </span>
                  <div className="flex-1 h-px bg-[#D7E6F2]" />
                </div>

                <div className="grid grid-cols-12 gap-[2.5mm]">
                  {/* Left Column: KPI Callouts + Org Type + Position */}
                  <div className="col-span-5 rounded-xl bg-[#F0F6FA] border border-[#D4E4F2] p-[2.6mm] flex flex-col justify-between gap-[2mm]">
                    {/* 3 Top KPI Callouts */}
                    <div className="grid grid-cols-3 gap-[1.6mm]">
                      <div className="bg-white rounded-lg border border-[#D7E6F2] px-2 py-1.5 text-center">
                        <div className="text-[7.5px] text-slate-600 font-medium">ผู้ตอบทั้งหมด</div>
                        <div className="text-[13px] font-extrabold text-[#0F3554] tabular-nums leading-tight">
                          {stats.n.toLocaleString()} <span className="text-[8px] font-semibold">ราย</span>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg border border-[#D7E6F2] px-2 py-1.5 text-center">
                        <div className="text-[7.5px] text-slate-600 font-medium">อัตราตอบกลับ</div>
                        <div className="text-[13px] font-extrabold text-[#0D7A6F] tabular-nums leading-tight">
                          {stats.responseRate.toFixed(1)}%
                        </div>
                      </div>
                      <div className="bg-white rounded-lg border border-[#D7E6F2] px-2 py-1.5 text-center">
                        <div className="text-[7.5px] text-slate-600 font-medium">เทียบปีก่อน</div>
                        <div
                          className={`text-[13px] font-extrabold tabular-nums leading-tight ${
                            yoyDiff === null
                              ? 'text-slate-400'
                              : yoyDiff >= 0
                              ? 'text-emerald-700'
                              : 'text-rose-600'
                          }`}
                        >
                          {yoyDiff === null ? '-' : `${yoyDiff >= 0 ? '+' : ''}${yoyDiff.toFixed(2)}`}
                        </div>
                      </div>
                    </div>

                    {/* Organization Types Distribution */}
                    <div className="bg-white/90 rounded-lg border border-[#DAE8F4] p-[2mm] space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-[#E6F2F8] text-[#0F4C81] flex items-center justify-center">
                          <Building2 className="w-2.5 h-2.5" />
                        </span>
                        <span className="text-[8.5px] font-bold text-[#0F3554]">ประเภทหน่วยงาน (%)</span>
                      </div>
                      <div className="space-y-[2.5px]">
                        {stats.orgBars.map((bar) => (
                          <div key={bar.label} className="grid grid-cols-12 items-center gap-1 text-[7.8px]">
                            <span className="col-span-4 text-slate-700 truncate font-medium">{bar.label}</span>
                            <div className="col-span-6 bg-slate-100 h-[6px] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${Math.max(bar.pct, bar.count > 0 ? 4 : 0)}%`, backgroundColor: bar.color }}
                              />
                            </div>
                            <span className="col-span-2 text-right font-bold text-slate-800 tabular-nums">
                              {bar.pct.toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Respondent Positions */}
                    <div className="bg-white/90 rounded-lg border border-[#DAE8F4] p-[2mm] space-y-1">
                      <div className="text-[8.5px] font-bold text-[#0F3554]">ตำแหน่งผู้ประเมินหลัก</div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                        {stats.topPositions.map((pos) => (
                          <div key={pos.label} className="flex items-center justify-between text-[7.6px] gap-1">
                            <span className="text-slate-700 truncate">• {pos.label}</span>
                            <span className="font-bold text-[#0F4C81] tabular-nums shrink-0">{pos.pct.toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: 4 Mini Stat Cards */}
                  <div className="col-span-7 grid grid-cols-2 gap-[2.2mm]">
                    {/* Card 1: Respondent Experience */}
                    <div className="rounded-xl bg-[#F8FBFD] border border-[#D4E4F2] p-[2.3mm] space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-[#E6F2F8] text-[#0F4C81] flex items-center justify-center shrink-0">
                          <Briefcase className="w-2.5 h-2.5" />
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[#0F4C81] text-white text-[8px] font-semibold">
                          ประสบการณ์ทำงานของผู้ตอบ
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1 pt-0.5">
                        {stats.expDist.map((item) => (
                          <div key={item.label} className="bg-white rounded-lg border border-slate-200/80 py-1 px-1 text-center">
                            <div className="text-[10.5px] font-extrabold text-[#0F3554] tabular-nums leading-tight">
                              {item.pct.toFixed(0)}%
                            </div>
                            <div className="text-[7px] text-slate-600 font-medium leading-tight mt-0.5">{item.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Card 2: Supervision Duration */}
                    <div className="rounded-xl bg-[#F8FBFD] border border-[#D4E4F2] p-[2.3mm] space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-[#EAF7F3] text-[#0D7A6F] flex items-center justify-center shrink-0">
                          <Clock className="w-2.5 h-2.5" />
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[#0D7A6F] text-white text-[8px] font-semibold">
                          ระยะเวลาที่ดูแลบัณฑิต
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-1 pt-0.5">
                        {stats.durDist.map((item) => (
                          <div key={item.label} className="bg-white rounded-lg border border-slate-200/80 py-1 px-0.5 text-center">
                            <div className="text-[10px] font-extrabold text-[#0D7A6F] tabular-nums leading-tight">
                              {item.pct.toFixed(0)}%
                            </div>
                            <div className="text-[6.6px] text-slate-600 font-medium leading-tight mt-0.5">{item.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Card 3: Top 5 Industries */}
                    <div className="rounded-xl bg-[#F8FBFD] border border-[#D4E4F2] p-[2.3mm] space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-[#FFF2EB] text-[#F26522] flex items-center justify-center shrink-0">
                          <Layers className="w-2.5 h-2.5" />
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[#1C5D8C] text-white text-[8px] font-semibold">
                          อุตสาหกรรมหลัก (Top 5 %)
                        </span>
                      </div>
                      <div className="space-y-[2px] pt-0.5">
                        {stats.topIndustries.length === 0 ? (
                          <div className="text-[7.8px] text-slate-400 py-2 text-center">ไม่มีข้อมูล</div>
                        ) : (
                          stats.topIndustries.map((ind, idx) => (
                            <div key={ind.fullLabel} className="flex items-center justify-between text-[7.5px] gap-1.5">
                              <span className="text-slate-700 truncate">
                                <strong className="text-[#0F4C81]">{idx + 1}.</strong> {ind.label}
                              </span>
                              <span className="font-bold text-[#0F3554] tabular-nums shrink-0">
                                {ind.pct.toFixed(1)}%
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Card 4: Selection Criteria & Internship Experience */}
                    <div className="rounded-xl bg-[#FBF8F0] border border-[#ECE0C4] p-[2.3mm] space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-[#FFF3D6] text-[#B87B14] flex items-center justify-center shrink-0">
                          <Target className="w-2.5 h-2.5" />
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[#B87B14] text-white text-[8px] font-semibold">
                          เกณฑ์คัดเลือก &amp; ฝึกงาน
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                        <div className="bg-white rounded-lg border border-[#EDE3CB] px-2 py-1 flex items-center justify-between">
                          <span className="text-[7.4px] text-slate-700">ความรู้วิชาชีพ</span>
                          <span className="text-[9.5px] font-extrabold text-[#0F3554] tabular-nums">
                            {stats.criteriaMetrics.knowledgePct.toFixed(0)}%
                          </span>
                        </div>
                        <div className="bg-white rounded-lg border border-[#EDE3CB] px-2 py-1 flex items-center justify-between">
                          <span className="text-[7.4px] text-slate-700">ทัศนคติ</span>
                          <span className="text-[9.5px] font-extrabold text-[#0F3554] tabular-nums">
                            {stats.criteriaMetrics.attitudePct.toFixed(0)}%
                          </span>
                        </div>
                        <div className="bg-white rounded-lg border border-[#EDE3CB] px-2 py-1 flex items-center justify-between">
                          <span className="text-[7.4px] text-slate-700">ขีดความสามารถ</span>
                          <span className="text-[9.5px] font-extrabold text-[#0F3554] tabular-nums">
                            {stats.criteriaMetrics.capabilityPct.toFixed(0)}%
                          </span>
                        </div>
                        <div className="bg-white rounded-lg border border-[#F5CBAF] px-2 py-1 flex items-center justify-between">
                          <span className="text-[7.2px] text-slate-700">
                            รับฝึกงาน{stats.criteriaMetrics.avgMonths > 0 ? ` (${stats.criteriaMetrics.avgMonths}ด.)` : ''}
                          </span>
                          <span className="text-[9.5px] font-extrabold text-[#F26522] tabular-nums">
                            {stats.criteriaMetrics.expReqPct.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* SECTION 3: 12 DIMENSIONS BAR CHART + TOP SKILLS */}
              <section className="space-y-[2mm] flex-1 flex flex-col justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#0F3554] text-white text-[9.5px] font-semibold tracking-wide">
                    <GraduationCap className="w-3 h-3 text-[#7CE0C3]" />
                    <span>คุณภาพบัณฑิต 12 ด้าน และทักษะที่ตลาดแรงงานต้องการ</span>
                  </span>
                  <div className="flex-1 h-px bg-[#D7E6F2]" />
                </div>

                <div className="grid grid-cols-12 gap-[2.5mm] flex-1">
                  {/* Left Side: 12-Dim Vertical Comparison Chart + 3 KPI Cards */}
                  <div className="col-span-7 rounded-xl bg-[#F6FAFD] border border-[#D4E4F2] p-[2.5mm] flex flex-col justify-between gap-[1.8mm]">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-[#0F3554]">
                        ค่าเฉลี่ยคุณภาพบัณฑิต 12 ด้าน (คะแนนเต็ม 5.00)
                      </span>
                      <div className="flex items-center gap-3 text-[7.8px] font-semibold">
                        {hasAnyPriorDims && (
                          <span className="inline-flex items-center gap-1 text-slate-600">
                            <span className="w-2.5 h-2.5 rounded-sm bg-[#9DBAD0]" />
                            <span>ปีก่อน</span>
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-[#0F3554]">
                          <span className="w-2.5 h-2.5 rounded-sm bg-[#0F4C81]" />
                          <span>ปีปัจจุบัน</span>
                        </span>
                      </div>
                    </div>

                    {/* SVG Vertical Grouped Bar Chart */}
                    <div className="bg-white rounded-lg border border-[#E1ECF5] px-1.5 py-1">
                      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto block" role="img" aria-label="กราฟเปรียบเทียบคุณภาพบัณฑิต 12 ด้าน">
                        {/* Grid lines 1..5 */}
                        {[1, 2, 3, 4, 5].map((tick) => {
                          const y = chartTop + plotH - (tick / 5) * plotH;
                          return (
                            <g key={tick}>
                              <line x1={chartLeft} y1={y} x2={svgW - chartRight} y2={y} stroke="#E6EEF5" strokeWidth="0.8" />
                              <text
                                x={chartLeft - 4}
                                y={y + 2.5}
                                textAnchor="end"
                                fontSize="7"
                                fill="#64748B"
                                fontFamily="Prompt, Sarabun, sans-serif"
                              >
                                {tick}
                              </text>
                            </g>
                          );
                        })}

                        {/* Baseline */}
                        <line
                          x1={chartLeft}
                          y1={chartTop + plotH}
                          x2={svgW - chartRight}
                          y2={chartTop + plotH}
                          stroke="#CBD5E1"
                          strokeWidth="1"
                        />

                        {stats.dimMeans.map((curVal, idx) => {
                          const prevVal = priorDimsNumeric[idx] || 0;
                          const cx = chartLeft + idx * groupW + groupW / 2;
                          const barW = hasAnyPriorDims ? 11 : 17;
                          const curH = Math.max(0, (curVal / 5) * plotH);
                          const curY = chartTop + plotH - curH;
                          const prevH = Math.max(0, (prevVal / 5) * plotH);
                          const prevY = chartTop + plotH - prevH;

                          return (
                            <g key={idx}>
                              {hasAnyPriorDims && (
                                <>
                                  <rect
                                    x={cx - barW - 1}
                                    y={prevY}
                                    width={barW}
                                    height={prevH}
                                    rx="2"
                                    fill="#9DBAD0"
                                  />
                                  {prevVal > 0 && (
                                    <text
                                      x={cx - barW / 2 - 1}
                                      y={prevY - 2.5}
                                      textAnchor="middle"
                                      fontSize="5.8"
                                      fontWeight="600"
                                      fill="#475569"
                                    >
                                      {prevVal.toFixed(2)}
                                    </text>
                                  )}
                                </>
                              )}

                              <rect
                                x={hasAnyPriorDims ? cx + 1 : cx - barW / 2}
                                y={curY}
                                width={barW}
                                height={curH}
                                rx="2"
                                fill={idx % 2 === 0 ? '#0F4C81' : '#0D7A6F'}
                              />
                              <text
                                x={hasAnyPriorDims ? cx + 1 + barW / 2 : cx}
                                y={curY - 3}
                                textAnchor="middle"
                                fontSize="6.6"
                                fontWeight="700"
                                fill="#0F3554"
                              >
                                {curVal.toFixed(2)}
                              </text>

                              {/* X-axis label */}
                              <text
                                x={cx}
                                y={chartTop + plotH + 9}
                                textAnchor="middle"
                                fontSize="5.9"
                                fontWeight="600"
                                fill="#334155"
                                transform={`rotate(-18 ${cx} ${chartTop + plotH + 9})`}
                              >
                                {DIM_LABELS_SHORT[idx]}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>

                    {/* 3 Bottom KPI Cards */}
                    <div className="grid grid-cols-3 gap-[2mm]">
                      <div className="bg-white rounded-lg border border-[#D4E4F2] px-2.5 py-1.5 text-center">
                        <div className="text-[7.5px] text-slate-600 font-semibold">ค่าเฉลี่ยรวม 12 ด้าน</div>
                        <div className="text-[12.5px] font-extrabold text-[#0F4C81] tabular-nums leading-tight mt-0.5">
                          {stats.overallMean.toFixed(2)} <span className="text-[8px] font-normal text-slate-500">/ 5.00</span>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg border border-[#D4E4F2] px-2.5 py-1.5 text-center">
                        <div className="text-[7.5px] text-slate-600 font-semibold">ส่วนเบี่ยงเบนมาตรฐาน (S.D.)</div>
                        <div className="text-[12.5px] font-extrabold text-slate-800 tabular-nums leading-tight mt-0.5">
                          {stats.overallSd.toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-[#EAF7F3] rounded-lg border border-[#BFE5D8] px-2.5 py-1.5 text-center">
                        <div className="text-[7.5px] text-[#0D7A6F] font-semibold">ความพึงพอใจระดับมาก–มากที่สุด</div>
                        <div className="text-[12.5px] font-extrabold text-[#0D7A6F] tabular-nums leading-tight mt-0.5">
                          {stats.highSatPct.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Row 1 Strengths Top 5% + Row 2 Skills to Improve & Needed Majors */}
                  <div className="col-span-5 flex flex-col justify-between gap-[2mm]">
                    {/* Row 1: Strengths Top 5 */}
                    <div className="rounded-xl bg-[#EAF7F3] border border-[#CBE9DF] p-[2.3mm] space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-white border border-[#B5E0D2] text-[#0D7A6F] flex items-center justify-center shrink-0">
                          <Award className="w-3 h-3" />
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[#0D7A6F] text-white text-[8px] font-semibold">
                          สิ่งที่ประทับใจ / จุดเด่นของบัณฑิต (Top 5 %)
                        </span>
                      </div>
                      <div className="space-y-1">
                        {stats.topStrengths.length === 0 ? (
                          <div className="text-[7.8px] text-slate-500 text-center py-2">ไม่มีข้อมูล</div>
                        ) : (
                          stats.topStrengths.map((item, idx) => (
                            <div
                              key={item.label}
                              className="bg-white/95 rounded-lg border border-[#D4ECE4] px-2 py-1 flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="w-4 h-4 rounded-full bg-[#0D7A6F] text-white text-[7.5px] font-bold flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <span className="text-[7.8px] text-slate-800 font-medium truncate">{item.label}</span>
                              </div>
                              <span className="text-[8.5px] font-extrabold text-[#0D7A6F] tabular-nums shrink-0">
                                {item.pct.toFixed(1)}%
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Row 2: Skills to Improve & Needed Majors */}
                    <div className="rounded-xl bg-[#F4F8FC] border border-[#D4E4F2] p-[2.3mm] space-y-1.5 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-white border border-[#C9DDF0] text-[#0F4C81] flex items-center justify-center shrink-0">
                          <Sparkles className="w-3 h-3 text-[#F26522]" />
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[#0F4C81] text-white text-[8px] font-semibold">
                          ทักษะที่ควรปลูกฝังเพิ่ม &amp; สาขาที่ต้องการ
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="text-[7.5px] font-bold text-[#B87B14]">• ทักษะที่เสนอให้พัฒนาเพิ่ม (Top %)</div>
                        {stats.topImprove.map((item) => (
                          <div key={item.label} className="flex items-center justify-between text-[7.5px] gap-1.5 pl-1">
                            <span className="text-slate-700 truncate">- {item.label}</span>
                            <span className="font-bold text-[#B87B14] tabular-nums shrink-0">{item.pct.toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-[#DAE8F4] pt-1 space-y-1">
                        <div className="text-[7.5px] font-bold text-[#0F4C81]">• สาขาวิชาที่ตลาดต้องการ (Top %)</div>
                        {stats.topMajors.map((item) => (
                          <div key={item.label} className="flex items-center justify-between text-[7.5px] gap-1.5 pl-1">
                            <span className="text-slate-700 truncate">- {item.label}</span>
                            <span className="font-bold text-[#0F4C81] tabular-nums shrink-0">{item.pct.toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* FOOTER BAR */}
            <footer className="bg-[#0F3554] text-white px-[6mm] py-[2.5mm] flex items-center justify-between gap-2 text-[8px] font-medium">
              <div>
                แหล่งข้อมูล: แบบสำรวจความคิดเห็นของผู้บังคับบัญชาต่อคุณภาพบัณฑิต ปีการศึกษา {filterSummary.year} (ข้อมูล ณ {todayFormatted})
              </div>
              <div className="font-semibold text-[#FDE1CF] shrink-0">
                สำนักมาตรฐานคุณภาพการศึกษา มหาวิทยาลัยกรุงเทพ
              </div>
            </footer>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
