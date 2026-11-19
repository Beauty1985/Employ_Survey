import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { Supervisor, SurveyResponse } from '../types';
import {
  BU_LOGO_DATA_URI,
  HERO_GLOBE_SVG,
  SARABUNX_FONT_CSS,
  SKYLINE_SVG,
  TEMPLATE_BASE_CSS,
} from './pdfTemplateAssets';

export interface PdfInfographicReportHandle {
  printReport: () => Promise<void>;
}

interface PdfInfographicReportProps {
  filteredResponses: SurveyResponse[];
  allResponses: SurveyResponse[];
  allSupervisors: Supervisor[];
  filterYear: string;
  filterMonth: string;
  filterFaculty: string;
  filterDepartment: string;
  totalSentCount: number;
  getThaiMonthName: (monthStr: string) => string;
  onLoadingChange?: (loading: boolean) => void;
  onNotify?: (text: string, type?: 'success' | 'error' | 'info') => void;
}

const DIMENSIONS_12: { id: number; htmlLabel: string; full: string }[] = [
  { id: 1, htmlLabel: '<i>1</i>คุณธรรม จริยธรรม', full: 'คุณธรรมจริยธรรม' },
  { id: 2, htmlLabel: '<i>2</i>ความรู้', full: 'ความรู้' },
  { id: 3, htmlLabel: '<i>3</i>ทักษะทางปัญญา', full: 'ทักษะทางปัญญา' },
  { id: 4, htmlLabel: '<i>4</i>สัมพันธ์ระหว่างบุคคล', full: 'สัมพันธ์ระหว่างบุคคล' },
  { id: 5, htmlLabel: '<i>5</i>วิเคราะห์ตัวเลข/IT', full: 'วิเคราะห์ตัวเลข/IT' },
  { id: 6, htmlLabel: '<i>6</i>ความคิดสร้างสรรค์', full: 'ความคิดสร้างสรรค์' },
  { id: 7, htmlLabel: '<i>7</i>ผู้ประกอบการ', full: 'ความเป็นผู้ประกอบการ' },
  { id: 8, htmlLabel: '<i>8</i>ความเป็นสากล', full: 'ความเป็นสากล' },
  { id: 9, htmlLabel: '<i>9</i>ตั้งคำถาม', full: 'การตั้งคำถาม' },
  { id: 10, htmlLabel: '<i>10</i>ไหวพริบ ทันโลก', full: 'ไหวพริบทันโลก' },
  { id: 11, htmlLabel: '<i>11</i>ทำงานร่วมกับผู้อื่น', full: 'ทำงานร่วมกับผู้อื่น' },
  { id: 12, htmlLabel: '<i>12</i>มุ่งมั่น ตั้งใจเรียนรู้', full: 'มุ่งมั่นตั้งใจเรียนรู้' },
];

const POSITION_BUCKETS = [
  { label: 'เจ้าของกิจการ', match: (v: string) => v === 'เจ้าของกิจการ' },
  { label: 'กรรมการผู้จัดการ', match: (v: string) => v === 'กรรมการผู้จัดการ' },
  { label: 'ผู้จัดการ/ผู้อำนวยการ', match: (v: string) => v === 'ผู้จัดการ/ผู้อำนวยการ' },
  { label: 'หัวหน้างาน/แผนก/ฝ่าย', match: (v: string) => v.includes('หัวหน้า') },
  {
    label: 'อื่นๆ',
    match: (v: string) =>
      v !== 'เจ้าของกิจการ' &&
      v !== 'กรรมการผู้จัดการ' &&
      v !== 'ผู้จัดการ/ผู้อำนวยการ' &&
      !v.includes('หัวหน้า'),
  },
];

const EXPERIENCE_BUCKETS = [
  { label: 'น้อยกว่า 5 ปี', match: (v: string) => v === 'น้อยกว่า 5 ปี' },
  { label: '5 - 10 ปี', match: (v: string) => v === '5 - 10 ปี' },
  { label: '11 - 15 ปี', match: (v: string) => v === '11 - 15 ปี' },
  { label: '15 ปีขึ้นไป', match: (v: string) => v.includes('15 ปี') && v.includes('ขึ้นไป') },
];

const ORG_TYPE_BUCKETS = [
  { label: 'หน่วยงานของรัฐ', match: (v: string) => v === 'หน่วยงานของรัฐ' },
  { label: 'รัฐวิสาหกิจ', match: (v: string) => v === 'รัฐวิสาหกิจ' },
  { label: 'องค์กรเอกชน', match: (v: string) => v === 'องค์กรเอกชน' },
  { label: 'องค์กรต่างประเทศ', match: (v: string) => v.includes('องค์กรต่างประเทศ') },
  { label: 'ธุรกิจส่วนตัว/ครอบครัว', match: (v: string) => v.includes('ธุรกิจส่วนตัว') },
  {
    label: 'อื่นๆ',
    match: (v: string) =>
      v !== 'หน่วยงานของรัฐ' &&
      v !== 'รัฐวิสาหกิจ' &&
      v !== 'องค์กรเอกชน' &&
      !v.includes('องค์กรต่างประเทศ') &&
      !v.includes('ธุรกิจส่วนตัว'),
  },
];

const DURATION_BUCKETS = [
  { label: '< 4 เดือน', match: (v: string) => v.includes('น้อยกว่า 4') || v.includes('< 4') },
  { label: '4 – 8 เดือน', match: (v: string) => v.includes('4') && v.includes('8') },
  { label: '9 เดือน – 1 ปี', match: (v: string) => v.includes('9 เดือน') },
  {
    label: '> 1 – 3 ปี',
    match: (v: string) =>
      (v.includes('มากกว่า 1') || v.includes('> 1')) && v.includes('3 ปี') && !v.includes('ขึ้นไป'),
  },
  { label: '> 3 ปีขึ้นไป', match: (v: string) => v.includes('3 ปี') && v.includes('ขึ้นไป') },
];

const SUGGESTION_TOPICS: { label: string; regex: RegExp }[] = [
  { label: 'ภาษา/สื่อสาร', regex: /ภาษา|อังกฤษ|สื่อสาร|นำเสนอ|english|communicat/i },
  { label: 'เทคโนโลยี/ดิจิทัล', regex: /เทคโนโลยี|ดิจิทัล|คอมพิวเตอร์|โปรแกรม|ซอฟต์แวร์|\bai\b|\bit\b|data|โค้ด/i },
  { label: 'ฝึกงาน/ปฏิบัติจริง', regex: /ปฏิบัติ|ฝึกงาน|สหกิจ|ประสบการณ์|หน้างาน|ลงมือ|workshop/i },
  { label: 'คิดวิเคราะห์/แก้ปัญหา', regex: /วิเคราะห์|สร้างสรรค์|วิพากษ์|แก้ปัญหา|นวัตกรรม|ไอเดีย|ไหวพริบ/i },
  { label: 'วินัย/ทัศนคติ/ทีม', regex: /ทัศนคติ|รับผิดชอบ|ตรงต่อเวลา|วินัย|อดทน|ทีม|ร่วมงาน|มนุษยสัมพันธ์|ปรับตัว/i },
  { label: 'ความรู้วิชาชีพ', regex: /วิชาชีพ|ทฤษฎี|เฉพาะทาง|ความรู้|พื้นฐาน/i },
];

function escapeHtml(raw: string): string {
  return String(raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeQuoteText(raw: string): string {
  return String(raw || '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[อีเมล]')
    .replace(/(?:\+66|0)\d[\d\s-]{7,11}\d/g, '[เบอร์โทร]')
    .replace(/\s+/g, ' ')
    .trim();
}

function shortenLabel(text: string): string {
  return text
    .replace(/^สาขาวิชาด้าน/, '')
    .replace(/^ทักษะการ/, 'การ')
    .replace(/^ทักษะ/, '')
    .replace(/\s*เช่น\s.*$/, '')
    .replace(/\s*\(โปรดระบุ\)$/, '')
    .replace(/\s*\(ระบุ\)$/, '')
    .trim();
}

function shortenSkillShort(text: string): string {
  const cleaned = shortenLabel(text);
  if (cleaned.includes('วิเคราะห์') && cleaned.includes('นวัตกรรม')) return 'วิเคราะห์ & นวัตกรรม';
  if (cleaned.includes('แก้ปัญหาที่ซับซ้อน')) return 'แก้ปัญหาซับซ้อน';
  if (cleaned.includes('เชิงวิพากษ์')) return 'คิดเชิงวิพากษ์';
  if (cleaned.includes('ริเริ่มสร้างสรรค์')) return 'คิดริเริ่มสร้างสรรค์';
  if (cleaned.includes('รับมือกับปัญหา')) return 'รับมือปัญหา/ปรับตัว';
  if (cleaned.includes('เรียนรู้ด้วยตนเอง')) return 'เรียนรู้ด้วยตนเอง';
  if (cleaned.includes('เทคโนโลยี') && cleaned.includes('เขียนโปรแกรม')) return 'ออกแบบเทคโนฯ/โค้ด';
  if (cleaned.includes('ดูแล') && cleaned.includes('เทคโนโลยี')) return 'ใช้/ดูแลเทคโนโลยี';
  if (cleaned.includes('สื่อสาร')) return 'ทักษะการสื่อสาร';
  if (cleaned.includes('ผู้นำ')) return 'ภาวะผู้นำ';
  return cleaned;
}

function getQualityLevelText(score: number | null): string {
  if (score === null) return '-';
  if (score >= 4.5) return 'มากที่สุด (ดีเยี่ยม)';
  if (score >= 3.5) return 'มาก';
  if (score >= 2.5) return 'ปานกลาง';
  if (score >= 1.5) return 'น้อย';
  return 'น้อยที่สุด';
}

function getQualityShortLevel(score: number | null): string {
  if (score === null) return '-';
  if (score >= 4.5) return 'มากที่สุด';
  if (score >= 3.5) return 'มาก';
  if (score >= 2.5) return 'ปานกลาง';
  if (score >= 1.5) return 'น้อย';
  return 'น้อยที่สุด';
}

function padList<T extends { label: string; pct: number | null }>(items: T[], count: number): { label: string; pct: number | null }[] {
  const result: { label: string; pct: number | null }[] = items.slice(0, count);
  while (result.length < count) {
    result.push({ label: '-', pct: null });
  }
  return result;
}

function renderProgressRows(
  items: { label: string; pct: number | null }[],
  fillClass: '' | 'g' | 'o'
): string {
  return items
    .map((item) => {
      const widthPct = item.pct !== null ? Math.min(100, Math.max(0, item.pct)) : 0;
      const pctText = item.pct !== null ? `${item.pct}%` : '-';
      return `<div class="r"><div class="rt"><span>${escapeHtml(item.label)}</span><b>${escapeHtml(pctText)}</b></div><div class="tr"><div class="fl ${fillClass}" style="width:${widthPct}%"></div></div></div>`;
    })
    .join('');
}

const PdfInfographicReport = forwardRef<PdfInfographicReportHandle, PdfInfographicReportProps>(
  function PdfInfographicReport(
    {
      filteredResponses,
      allResponses,
      allSupervisors,
      filterYear,
      filterMonth,
      filterFaculty,
      filterDepartment,
      totalSentCount,
      getThaiMonthName,
      onLoadingChange,
      onNotify,
    },
    ref
  ) {
    const activeIframeRef = useRef<HTMLIFrameElement | null>(null);

    useEffect(() => {
      return () => {
        if (activeIframeRef.current?.parentNode) {
          activeIframeRef.current.parentNode.removeChild(activeIframeRef.current);
          activeIframeRef.current = null;
        }
      };
    }, []);

    const analytics = useMemo(() => {
      const n = filteredResponses.length;
      const isSpecificYear = filterYear !== 'all' && /^\d{4}$/.test(filterYear);
      const displayYear = isSpecificYear ? filterYear : 'ทั้งหมด';
      const prevYear = isSpecificYear ? String(Number(filterYear) - 1) : null;

      // Prior year filtered set using same Faculty / Department / Month scopes
      const prevResponses = prevYear
        ? allResponses.filter(
            (r) =>
              r.academicYear === prevYear &&
              (filterMonth === 'all' || r.month === filterMonth) &&
              (filterFaculty === 'all' || r.faculty === filterFaculty) &&
              (filterDepartment === 'all' || r.department === filterDepartment)
          )
        : [];
      const prevSentCount = prevYear
        ? allSupervisors.filter(
            (s) =>
              s.academicYear === prevYear &&
              (filterFaculty === 'all' || s.faculty === filterFaculty) &&
              (filterDepartment === 'all' || s.department === filterDepartment)
          ).length
        : 0;

      const hasPrevData = prevResponses.length > 0;
      const responseRate = totalSentCount > 0 ? (n / totalSentCount) * 100 : null;
      const prevResponseRate =
        hasPrevData && prevSentCount > 0 ? (prevResponses.length / prevSentCount) * 100 : null;
      const responseRateDiff =
        responseRate !== null && prevResponseRate !== null ? responseRate - prevResponseRate : null;

      // Compute 1..12 attribute means and standalone Item #13 overall satisfaction stats
      const computeRatingStats = (list: SurveyResponse[]) => {
        if (list.length === 0) {
          return {
            attrMeans12: Array<number | null>(12).fill(null),
            attr13Mean: null as number | null,
            item13Sd: null as number | null,
            item13HighSatPct: null as number | null,
          };
        }

        const sums12 = Array(12).fill(0);
        const counts12 = Array(12).fill(0);
        const item13Scores: number[] = [];
        let item13HighCount = 0;

        list.forEach((resp) => {
          for (let i = 1; i <= 12; i++) {
            const val = Number(resp.part2?.ratings?.[i]);
            if (Number.isFinite(val) && val >= 1 && val <= 10) {
              sums12[i - 1] += val / 2;
              counts12[i - 1] += 1;
            }
          }

          const val13 = Number(resp.part2?.ratings?.[13]);
          if (Number.isFinite(val13) && val13 >= 1 && val13 <= 10) {
            const scaled13 = val13 / 2;
            item13Scores.push(scaled13);
            if (val13 >= 7) item13HighCount += 1; // "มาก - มากที่สุด" (>= 3.50 / 5.00)
          }
        });

        const attrMeans12 = sums12.map((s, idx) =>
          counts12[idx] > 0 ? parseFloat((s / counts12[idx]).toFixed(2)) : null
        );

        const raw13Mean =
          item13Scores.length > 0
            ? item13Scores.reduce((a, b) => a + b, 0) / item13Scores.length
            : null;
        const attr13Mean = raw13Mean !== null ? parseFloat(raw13Mean.toFixed(2)) : null;

        let item13Sd: number | null = null;
        if (item13Scores.length >= 2 && raw13Mean !== null) {
          const variance =
            item13Scores.reduce((acc, val) => acc + (val - raw13Mean) ** 2, 0) /
            (item13Scores.length - 1);
          item13Sd = parseFloat(Math.sqrt(variance).toFixed(2));
        } else if (item13Scores.length === 1) {
          item13Sd = 0;
        }

        return {
          attrMeans12,
          attr13Mean,
          item13Sd,
          item13HighSatPct:
            item13Scores.length > 0 ? (item13HighCount / item13Scores.length) * 100 : null,
        };
      };

      const currRatings = computeRatingStats(filteredResponses);
      const prevRatings = computeRatingStats(prevResponses);

      const overallDiff =
        currRatings.attr13Mean !== null && prevRatings.attr13Mean !== null
          ? currRatings.attr13Mean - prevRatings.attr13Mean
          : null;

      // Max & min among the 12 dimensions
      const valid12 = DIMENSIONS_12.map((d, idx) => ({
        ...d,
        score: currRatings.attrMeans12[idx],
      })).filter((item): item is (typeof DIMENSIONS_12)[number] & { score: number } => item.score !== null);

      const maxDim =
        valid12.length > 0
          ? valid12.reduce((best, cur) => (cur.score > best.score ? cur : best), valid12[0])
          : null;
      const minDim =
        valid12.length > 0
          ? valid12.reduce((low, cur) => (cur.score < low.score ? cur : low), valid12[0])
          : null;

      // Part 1 demographic percentages
      const calcBuckets = (
        buckets: { label: string; match: (v: string) => boolean }[],
        extractor: (r: SurveyResponse) => string | undefined
      ) => {
        const counts = buckets.map((b) => ({ label: b.label, count: 0, pct: null as number | null }));
        if (n === 0) return counts;
        filteredResponses.forEach((r) => {
          const raw = (extractor(r) || '').trim();
          if (!raw) return;
          const idx = buckets.findIndex((b) => b.match(raw));
          if (idx >= 0) counts[idx].count += 1;
        });
        return counts.map((c) => ({
          label: c.label,
          pct: Math.round((c.count / n) * 100),
        }));
      };

      const positions = calcBuckets(POSITION_BUCKETS, (r) => r.part1?.position);
      const experiences = calcBuckets(EXPERIENCE_BUCKETS, (r) => r.part1?.experience);
      const orgTypes = calcBuckets(ORG_TYPE_BUCKETS, (r) => r.part1?.orgType);
      const durations = calcBuckets(DURATION_BUCKETS, (r) => r.part1?.graduateDuration);

      // Industries Top 5 sorted desc
      const indMap: Record<string, number> = {};
      filteredResponses.forEach((r) => {
        const rawList = Array.isArray(r.part1?.industries)
          ? r.part1.industries
          : r.part1?.industries
            ? [r.part1.industries]
            : [];
        rawList.forEach((ind) => {
          const resolved =
            ind === 'อื่นๆ (โปรดระบุ)' && r.part1?.industriesOther?.trim()
              ? r.part1.industriesOther.trim()
              : ind;
          const clean = resolved.replace(/^อุตสาหกรรม(การ)?/, '').trim() || resolved;
          if (clean) indMap[clean] = (indMap[clean] || 0) + 1;
        });
      });
      const topIndustries = padList(
        Object.entries(indMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([label, count]) => ({ label, pct: n > 0 ? Math.round((count / n) * 100) : null })),
        5
      );

      // Array pool aggregator (Top N sorted desc)
      const aggregatePool = (
        extractor: (r: SurveyResponse) => string[] | undefined,
        otherMarker: string,
        otherTextExtractor: (r: SurveyResponse) => string | undefined,
        formatter: (label: string) => string = (s) => s
      ) => {
        const map: Record<string, number> = {};
        filteredResponses.forEach((r) => {
          const arr = extractor(r);
          if (!Array.isArray(arr)) return;
          arr.forEach((item) => {
            const raw =
              item === otherMarker && otherTextExtractor(r)?.trim()
                ? otherTextExtractor(r)!.trim()
                : item;
            const formatted = formatter(raw);
            if (formatted) map[formatted] = (map[formatted] || 0) + 1;
          });
        });
        return Object.entries(map)
          .sort((a, b) => b[1] - a[1])
          .map(([label, count]) => ({
            label,
            count,
            pct: n > 0 ? Math.round((count / n) * 100) : null,
          }));
      };

      const topStrengths = padList(
        aggregatePool(
          (r) => r.part2?.strongPoints,
          'อื่นๆ (โปรดระบุ)',
          (r) => r.part2?.strongPointsOther,
          shortenLabel
        ),
        5
      );

      const allSkillsToImprove = aggregatePool(
        (r) => r.part2?.skillsToImprove,
        'อื่นๆ (โปรดระบุ)',
        (r) => r.part2?.skillsToImproveOther,
        shortenSkillShort
      );
      const topSkillsToImprove = padList(allSkillsToImprove, 5);

      // Q16 Open-ended suggestions: topic summary tags (3 tags with counts) + 2 sample quotes
      const allSuggestions = filteredResponses
        .map((r) => sanitizeQuoteText(r.part2?.suggestions || ''))
        .filter((txt) => txt.length > 0);

      const suggestionTopicCounts: Record<string, number> = {};
      allSuggestions.forEach((txt) => {
        let matchedAny = false;
        SUGGESTION_TOPICS.forEach((topic) => {
          if (topic.regex.test(txt)) {
            suggestionTopicCounts[topic.label] = (suggestionTopicCounts[topic.label] || 0) + 1;
            matchedAny = true;
          }
        });
        if (!matchedAny) {
          suggestionTopicCounts['ข้อเสนอแนะทั่วไป'] = (suggestionTopicCounts['ข้อเสนอแนะทั่วไป'] || 0) + 1;
        }
      });

      const sortedSuggestionTags: { label: string; count: number | null }[] = Object.entries(
        suggestionTopicCounts
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([label, count]) => ({ label, count }));
      while (sortedSuggestionTags.length < 3) {
        sortedSuggestionTags.push({ label: '-', count: null });
      }

      const uniqueQuotes = Array.from(new Set(allSuggestions));
      const quoteBoxes = [
        uniqueQuotes[0] ? `“${uniqueQuotes[0]}”` : '-',
        uniqueQuotes[1] ? `“${uniqueQuotes[1]}”` : '-',
      ];

      const topNeededMajors = padList(
        aggregatePool(
          (r) => r.part3?.neededMajors,
          'สาขาวิชาอื่นๆ (ระบุ)',
          (r) => r.part3?.neededMajorsOther,
          shortenLabel
        ),
        5
      );

      const topCoreSkills = padList(
        aggregatePool(
          (r) => r.part3?.coreSkills,
          'ทักษะสำคัญอื่นๆ (ระบุ)',
          (r) => r.part3?.coreSkillsOther,
          shortenSkillShort
        ),
        5
      );

      // Selection criteria: Top 3 sorted desc across all actual responses
      const topSelectionCriteria = padList(
        aggregatePool(
          (r) => r.part3?.selectionCriteria,
          'อื่นๆ (ระบุ)',
          (r) => r.part3?.selectionCriteriaOther,
          shortenLabel
        ),
        3
      );

      // Experience / internship requirement
      let expAnsweredCount = 0;
      let expYesCount = 0;
      let expMonthsSum = 0;
      let expMonthsCount = 0;

      filteredResponses.forEach((r) => {
        if (r.part3?.requiresExperience === 'yes' || r.part3?.requiresExperience === 'no') {
          expAnsweredCount += 1;
        }
        if (r.part3?.requiresExperience === 'yes') {
          expYesCount += 1;
          const months = Number(r.part3.experienceMonths);
          if (Number.isFinite(months) && months > 0) {
            expMonthsSum += months;
            expMonthsCount += 1;
          }
        }
      });

      const expYesPct = expAnsweredCount > 0 ? Math.round((expYesCount / expAnsweredCount) * 100) : null;
      const avgExpMonths =
        expMonthsCount > 0 ? parseFloat((expMonthsSum / expMonthsCount).toFixed(1)) : null;

      // Executive overview bullets (3 main + 3 observations) derived strictly from live values
      const mainBullet1 =
        currRatings.attr13Mean !== null
          ? `ความพึงพอใจภาพรวมเฉลี่ย ${currRatings.attr13Mean.toFixed(2)}/5.00 (${getQualityLevelText(currRatings.attr13Mean)}) จากผู้ตอบ ${n} ราย${responseRate !== null ? ` (อัตราตอบกลับ ${responseRate.toFixed(1)}%)` : ''}`
          : '-';

      const mainBullet2 = maxDim
        ? `ด้านที่ได้คะแนนสูงสุด คือ ด้าน${maxDim.full} (${maxDim.score.toFixed(2)}/5.00)${currRatings.item13HighSatPct !== null ? ` · ระดับมาก–มากที่สุด ${Math.round(currRatings.item13HighSatPct)}%` : ''}`
        : '-';

      const mainBullet3 =
        overallDiff !== null && prevYear && prevRatings.attr13Mean !== null
          ? `เทียบปีการศึกษา ${prevYear} (${prevRatings.attr13Mean.toFixed(2)}): ${overallDiff >= 0 ? 'เพิ่มขึ้น' : 'ลดลง'} ${Math.abs(overallDiff).toFixed(2)} คะแนน`
          : '-';

      const topImproveReal = allSkillsToImprove[0];
      const obsBullet1 = minDim
        ? `ประเด็นควรพัฒนา คือ ด้าน${minDim.full} (${minDim.score.toFixed(2)})${topImproveReal && topImproveReal.pct !== null ? ` · ทักษะ${topImproveReal.label} (${topImproveReal.pct}%)` : ''}${allSuggestions.length > 0 ? ` · ข้อเสนอแนะ ${allSuggestions.length} รายการ` : ''}`
        : '-';

      const firstMajor = topNeededMajors[0]?.pct !== null ? topNeededMajors[0] : null;
      const firstSkill = topCoreSkills[0]?.pct !== null ? topCoreSkills[0] : null;
      const obsBullet2 =
        firstMajor || firstSkill
          ? `ความต้องการตลาดแรงงาน: ${firstMajor ? `สาขา${firstMajor.label} (${firstMajor.pct}%)` : '-'}${firstSkill ? ` · ทักษะ${firstSkill.label} (${firstSkill.pct}%)` : ''}`
          : '-';

      const firstCrit = topSelectionCriteria[0]?.pct !== null ? topSelectionCriteria[0] : null;
      const obsBullet3 =
        firstCrit || expYesPct !== null
          ? `เกณฑ์คัดเลือกหลัก: ${firstCrit ? `${firstCrit.label} (${firstCrit.pct}%)` : '-'}${expYesPct !== null ? ` · ต้องการประสบการณ์/ฝึกงาน ${expYesPct}%` : ''}${avgExpMonths !== null ? ` (${avgExpMonths.toFixed(1)} เดือน)` : ''}`
          : '-';

      // Current Thai Buddhist Era date (วว/ดด/ปปปป)
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyyBe = String(now.getFullYear() + 543);

      const facultyDisplay = filterFaculty === 'all' ? 'ทุกคณะ' : filterFaculty;
      const deptDisplay = filterDepartment === 'all' ? 'ทุกสาขา' : filterDepartment;
      const monthPart = filterMonth !== 'all' ? ` · ${getThaiMonthName(filterMonth)}` : '';
      const bannerText = `สรุปผลสำรวจ ปีการศึกษา ${displayYear} · ผู้ตอบแบบสำรวจ ${n} ราย · ${facultyDisplay} · ${deptDisplay}${monthPart}`;

      const safeTitlePart = (txt: string) => txt.replace(/[\\/:*?"<>|]/g, '-').trim();
      const docTitle = `รายงานผลสำรวจผู้บังคับบัญชา_${safeTitlePart(displayYear)}_${safeTitlePart(facultyDisplay)}_${safeTitlePart(deptDisplay)}`;

      return {
        n,
        displayYear,
        prevYear,
        isSpecificYear,
        bannerText,
        docTitle,
        responseRate,
        prevResponseRate,
        responseRateDiff,
        currRatings,
        prevRatings,
        maxDim,
        minDim,
        positions,
        experiences,
        orgTypes,
        durations,
        topIndustries,
        topStrengths,
        topSkillsToImprove,
        sortedSuggestionTags,
        quoteBoxes,
        topNeededMajors,
        topCoreSkills,
        topSelectionCriteria,
        expYesPct,
        avgExpMonths,
        mainBullets: [mainBullet1, mainBullet2, mainBullet3],
        obsBullets: [obsBullet1, obsBullet2, obsBullet3],
        thaiDateSlash: `${dd}/${mm}/${yyyyBe}`,
      };
    }, [
      filteredResponses,
      allResponses,
      allSupervisors,
      filterYear,
      filterMonth,
      filterFaculty,
      filterDepartment,
      totalSentCount,
      getThaiMonthName,
    ]);

    const buildStandaloneTemplateHtml = (): string => {
      const a = analytics;

      // 3 KPI cards left of Part 1
      const respRateStr = a.responseRate !== null ? a.responseRate.toFixed(1) : '-';
      const prevChangeHtml =
        a.prevResponseRate !== null && a.responseRateDiff !== null
          ? `${a.prevResponseRate.toFixed(1)}<small>% ${a.responseRateDiff > 0 ? '▲' : a.responseRateDiff < 0 ? '▼' : '—'}</small>`
          : '-';

      // Legend years
      const oldYearLabel = a.prevYear ? `ปีการศึกษา ${a.prevYear}` : 'ปีก่อนหน้า';
      const newYearLabel = a.isSpecificYear ? `ปีการศึกษา ${a.displayYear}` : 'ปีการศึกษาทั้งหมด';

      // 12-dimension 3D bars
      const chartBarsHtml = DIMENSIONS_12.map((dim, idx) => {
        const oldScore = a.prevRatings.attrMeans12[idx];
        const newScore = a.currRatings.attrMeans12[idx];
        const oldHeightMm = oldScore !== null ? Math.max(1.2, (oldScore / 5) * 44).toFixed(1) : '0';
        const newHeightMm = newScore !== null ? Math.max(1.2, (newScore / 5) * 44).toFixed(1) : '0';
        const oldLabel = oldScore !== null ? oldScore.toFixed(2) : '-';
        const newLabel = newScore !== null ? newScore.toFixed(2) : '-';

        return `<div class="grp"><div class="bars"><div class="bw"><div class="v">${oldLabel}</div><div class="b3 old${oldScore === null ? ' empty' : ''}" style="height:${oldHeightMm}mm"></div></div><div class="bw"><div class="v hi">${newLabel}</div><div class="b3 new${newScore === null ? ' empty' : ''}" style="height:${newHeightMm}mm"></div></div></div><div class="bl">${dim.htmlLabel}</div></div>`;
      }).join('');

      // Overall satisfaction gauge (strictly from Item #13)
      const overall13 = a.currRatings.attr13Mean;
      const prevOverall13 = a.prevRatings.attr13Mean;
      const overallPct = overall13 !== null ? Math.min(100, Math.max(0, (overall13 / 5) * 100)).toFixed(1) : '0';
      const overallText = overall13 !== null ? overall13.toFixed(2) : '-';
      const prevOverallText = prevOverall13 !== null ? prevOverall13.toFixed(2) : '-';
      const sdText = a.currRatings.item13Sd !== null ? a.currRatings.item13Sd.toFixed(2) : '-';
      const highSatText =
        a.currRatings.item13HighSatPct !== null ? `${Math.round(a.currRatings.item13HighSatPct)}%` : '-';
      const maxDimLabel = a.maxDim ? `สูงสุด (ด้าน ${a.maxDim.full})` : 'สูงสุด (ด้าน -)';
      const maxDimVal = a.maxDim ? a.maxDim.score.toFixed(2) : '-';
      const minDimLabel = a.minDim ? `ต่ำสุด (ด้าน ${a.minDim.full})` : 'ต่ำสุด (ด้าน -)';
      const minDimVal = a.minDim ? a.minDim.score.toFixed(2) : '-';

      // Q16 tags + 2 quotes
      const tagsHtml = a.sortedSuggestionTags
        .map((t) => `<span>${escapeHtml(t.label)}<b>${t.count !== null ? t.count : '-'}</b></span>`)
        .join('');
      const quotesHtml = a.quoteBoxes
        .map((q) => `<div class="qb">${escapeHtml(q)}</div>`)
        .join('');

      // Internship mini donut
      const expPctNum = a.expYesPct !== null ? Math.min(100, Math.max(0, a.expYesPct)) : 0;
      const expPctText = a.expYesPct !== null ? `${a.expYesPct}%` : '-';
      const expMonthsText = a.avgExpMonths !== null ? a.avgExpMonths.toFixed(1) : '-';

      // Exact template base CSS + dynamic/overflow safeguards that preserve 100% of colors, fonts, sizes, and card layout
      const extraSafeCss = `
*{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}
html,body{width:210mm;height:297mm;margin:0;padding:0;overflow:hidden;background:#fff}
.banner{max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.txt p span{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.b3.empty{height:0 !important}
.b3.empty:before,.b3.empty:after{display:none !important}
.don:after,.d2:after{content:none !important}
.don-in{position:absolute;inset:3.2mm;background:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--navy);font-size:9.5pt}
.d2-in{position:absolute;inset:3mm;background:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--navy);font-size:7.4pt}
.chip>div:last-child{min-width:0;overflow:hidden}
.cl,.cv{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tg span{max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cd.q .qb{overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.foot span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
`;

      return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<title>${escapeHtml(a.docTitle)}</title>
<style>${SARABUNX_FONT_CSS}
${TEMPLATE_BASE_CSS}
${extraSafeCss}</style>
</head>
<body>
<div class="page">
${SKYLINE_SVG}
<div class="in">
<div class="top"><img class="logo" src="${BU_LOGO_DATA_URI}" alt="Bangkok University"><div class="tt"><h1>ผลสำรวจความคิดเห็นของ<em>ผู้บังคับบัญชา</em><br>ต่อคุณภาพบัณฑิต มหาวิทยาลัยกรุงเทพ</h1></div>${HERO_GLOBE_SVG}</div>
<div class="banner">${escapeHtml(a.bannerText)}</div>
<div class="ov">
<div class="tagrow"><div class="tag g">ผลลัพธ์หลัก</div><div class="txt g"><p><span>${escapeHtml(a.mainBullets[0])}</span></p><p><span>${escapeHtml(a.mainBullets[1])}</span></p><p><span>${escapeHtml(a.mainBullets[2])}</span></p></div></div>
<div class="tagrow"><div class="tag o">ข้อสังเกต</div><div class="txt"><p><span>${escapeHtml(a.obsBullets[0])}</span></p><p><span>${escapeHtml(a.obsBullets[1])}</span></p><p><span>${escapeHtml(a.obsBullets[2])}</span></p></div></div>
</div>

<div class="panel"><div class="ph">ข้อมูลผู้ตอบแบบสำรวจ<small>ร้อยละของผู้ตอบ</small></div>
<div class="a"><div class="kp"><div class="k"><div class="l">จำนวนผู้ตอบ</div><div class="v">${a.n}<small>ราย</small></div></div><div class="k"><div class="l">อัตราการตอบกลับ</div><div class="v">${escapeHtml(respRateStr)}<small>%</small></div></div><div class="k"><div class="l">ปีก่อน / เปลี่ยนแปลง</div><div class="v">${prevChangeHtml}</div></div></div>
<div class="five">
<div class="cd"><div class="ch">ตำแหน่งผู้ตอบ</div>${renderProgressRows(a.positions, '')}</div>
<div class="cd"><div class="ch">ประสบการณ์</div>${renderProgressRows(a.experiences, 'g')}</div>
<div class="cd"><div class="ch">ประเภทหน่วยงาน</div>${renderProgressRows(a.orgTypes, '')}</div>
<div class="cd"><div class="ch">ระยะเวลา</div>${renderProgressRows(a.durations, 'g')}</div>
<div class="cd"><div class="ch">อุตสาหกรรม (Top 5)</div>${renderProgressRows(a.topIndustries, 'o')}</div>
</div></div></div>

<div class="panel"><div class="ph">คุณภาพบัณฑิตตามความเห็นผู้บังคับบัญชา<small>คะแนนเฉลี่ย เต็ม 5.00</small></div>
<div class="b2"><div class="plot"><div class="legend"><span><i style="background:#a9dba4"></i>${escapeHtml(oldYearLabel)}</span><span><i style="background:#1e6fb8"></i>${escapeHtml(newYearLabel)}</span></div><div class="chart">${chartBarsHtml}</div></div>
<div class="side"><div class="gauge"><div class="don" style="background:conic-gradient(var(--acc) 0 ${overallPct}%,#e5ebf1 ${overallPct}% 100%)"><span class="don-in">${escapeHtml(overallText)}</span></div><div><div class="t">ความพึงพอใจภาพรวม</div><div class="s">ระดับ ${escapeHtml(getQualityShortLevel(overall13))} · ปีก่อน ${escapeHtml(prevOverallText)}</div></div></div>
<div class="chips">
<div class="chip"><div class="ci" style="background:#1e6fb8"><svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="12" width="4" height="9"/><rect x="10" y="6" width="4" height="15"/><rect x="17" y="3" width="4" height="18"/></svg></div><div><div class="cl">ค่าเฉลี่ยรวม</div><div class="cv">${escapeHtml(overallText)}</div></div></div>
<div class="chip"><div class="ci" style="background:#0f9bb0"><svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="4" width="18" height="12" rx="1"/><rect x="8" y="18" width="8" height="2"/></svg></div><div><div class="cl">S.D. รวม</div><div class="cv">${escapeHtml(sdText)}</div></div></div>
<div class="chip"><div class="ci" style="background:#e8791a"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7 7 .6-5.3 4.7 1.7 7.2L12 17.8 5.6 21.5l1.7-7.2L2 9.6 9 9z"/></svg></div><div><div class="cl">มาก–มากที่สุด</div><div class="cv">${escapeHtml(highSatText)}</div></div></div>
<div class="chip"><div class="ci" style="background:#7a5cc0"><svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-5 4-8 8-8s8 3 8 8z"/></svg></div><div><div class="cl">ผู้ตอบ</div><div class="cv">${a.n} ราย</div></div></div>
<div class="chip"><div class="ci" style="background:#2f9e4f"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l8 9h-5v9H9v-9H4z"/></svg></div><div><div class="cl" title="${escapeHtml(maxDimLabel)}">${escapeHtml(maxDimLabel)}</div><div class="cv">${escapeHtml(maxDimVal)}</div></div></div>
<div class="chip"><div class="ci" style="background:#d9534f"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21l-8-9h5V3h6v9h5z"/></svg></div><div><div class="cl" title="${escapeHtml(minDimLabel)}">${escapeHtml(minDimLabel)}</div><div class="cv">${escapeHtml(minDimVal)}</div></div></div>
</div></div></div></div>

<div class="panel"><div class="ph">จุดเด่น ทักษะที่ควรเพิ่ม และความต้องการบุคลากร<small>Top 5 · เลือกตอบได้หลายข้อ</small></div>
<div class="c3">
<div class="cd"><div class="ch">สิ่งที่ประทับใจ / จุดเด่นของบัณฑิต</div>${renderProgressRows(a.topStrengths, 'o')}</div>
<div class="cd"><div class="ch">ทักษะที่ควรปลูกฝังเพิ่ม</div>${renderProgressRows(a.topSkillsToImprove, '')}</div>
<div class="cd q"><div class="ch">ข้อเสนอแนะ</div><div class="tg">${tagsHtml}</div>${quotesHtml}</div>
<div class="cd"><div class="ch">สาขาวิชาที่ต้องการ</div>${renderProgressRows(a.topNeededMajors, 'g')}</div>
<div class="cd"><div class="ch">ทักษะสำคัญที่ต้องการ</div>${renderProgressRows(a.topCoreSkills, 'g')}</div>
<div class="cd"><div class="ch">เกณฑ์คัดเลือก &amp; ประสบการณ์ฝึกงาน</div>${renderProgressRows(a.topSelectionCriteria, 'g')}<div class="mini"><div class="d2" style="background:conic-gradient(var(--green) 0 ${expPctNum}%,#dfe8ef ${expPctNum}% 100%)"><span class="d2-in">${escapeHtml(expPctText)}</span></div><div class="tx">ต้องการผู้มีประสบการณ์/ฝึกงาน<br><b>${escapeHtml(expMonthsText)}</b> เดือน (ขั้นต่ำเฉลี่ย)</div></div></div>
</div></div>
</div>
<div class="foot"><span>แหล่งข้อมูล: แบบสำรวจความคิดเห็นของผู้บังคับบัญชาต่อคุณภาพบัณฑิต ปีการศึกษา ${escapeHtml(a.displayYear)} · ข้อมูล ณ ${escapeHtml(a.thaiDateSlash)}</span><span>สำนักมาตรฐานคุณภาพการศึกษา มหาวิทยาลัยกรุงเทพ</span></div>
</div>
</body>
</html>`;
    };

    useImperativeHandle(ref, () => ({
      printReport: async () => {
        if (filteredResponses.length === 0) {
          onNotify?.(
            'ไม่พบข้อมูลแบบสอบถามตามตัวกรองปัจจุบัน กรุณาเลือกเงื่อนไขอื่นก่อนส่งออกรายงาน PDF',
            'info'
          );
          return;
        }

        if (typeof document === 'undefined') return;
        onLoadingChange?.(true);

        const originalParentTitle = document.title;
        let finished = false;
        const finishLoading = () => {
          if (finished) return;
          finished = true;
          document.title = originalParentTitle;
          onLoadingChange?.(false);
        };

        try {
          // Remove any previous hidden print iframe cleanly
          if (activeIframeRef.current?.parentNode) {
            activeIframeRef.current.parentNode.removeChild(activeIframeRef.current);
            activeIframeRef.current = null;
          }

          const iframe = document.createElement('iframe');
          iframe.setAttribute('aria-hidden', 'true');
          iframe.title = analytics.docTitle;
          iframe.style.position = 'fixed';
          iframe.style.left = '-10000px';
          iframe.style.top = '0';
          iframe.style.width = '210mm';
          iframe.style.height = '297mm';
          iframe.style.border = '0';
          iframe.style.pointerEvents = 'none';
          iframe.style.zIndex = '-1';
          document.body.appendChild(iframe);
          activeIframeRef.current = iframe;

          const iframeWin = iframe.contentWindow;
          const iframeDoc = iframe.contentDocument || iframeWin?.document;
          if (!iframeWin || !iframeDoc) {
            throw new Error('Hidden print iframe document unavailable');
          }

          const htmlContent = buildStandaloneTemplateHtml();
          iframeDoc.open();
          iframeDoc.write(htmlContent);
          iframeDoc.close();
          iframeDoc.title = analytics.docTitle;

          // Wait strictly for embedded SarabunX fonts to be ready inside the iframe before printing
          const iframeFonts = (iframeDoc as unknown as { fonts?: { ready: Promise<unknown> } }).fonts;
          if (iframeFonts?.ready) {
            await Promise.race([
              iframeFonts.ready,
              new Promise<void>((resolve) => window.setTimeout(resolve, 2500)),
            ]);
          }

          // Allow two animation frames inside the iframe for exact layout & SVG/3D bar paint
          await new Promise<void>((resolve) => {
            const raf = iframeWin.requestAnimationFrame?.bind(iframeWin) || window.requestAnimationFrame;
            raf(() => raf(() => window.setTimeout(resolve, 120)));
          });

          // Ensure both iframe title & parent title suggest exact filtered PDF filename in Chromium/Safari
          iframeDoc.title = analytics.docTitle;
          document.title = analytics.docTitle;

          iframeWin.addEventListener('afterprint', finishLoading, { once: true });
          const safetyTimer = window.setTimeout(finishLoading, 3000);

          iframeWin.focus();
          iframeWin.print();

          // Fallback release if browser print() returned synchronously without firing afterprint
          window.setTimeout(() => {
            window.clearTimeout(safetyTimer);
            finishLoading();
          }, 800);
        } catch (err) {
          console.error('Hidden iframe PDF print error:', err);
          finishLoading();
          onNotify?.('ไม่สามารถสร้างรายงาน PDF ได้ กรุณาลองใหม่อีกครั้ง', 'error');
        }
      },
    }));

    return null;
  }
);

export default PdfInfographicReport;
