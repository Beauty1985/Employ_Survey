import { Supervisor, SurveyResponse } from '../types';

export interface LabelPctItem {
  label: string;
  pct: number;
  count?: number;
}

export interface DimensionComparisonItem {
  id: number;
  line1: string;
  line2?: string;
  full: string;
  prevScore: number | null;
  currScore: number | null;
}

export interface IssuePillItem {
  label: string;
  count: number;
}

export interface SurveyReportData {
  academicYearLabel: string;
  prevYearLabel: string;
  scopeLabel: string;
  totalResponses: number;
  totalSentCount: number;
  responseRate: number | null;
  prevResponseRate: number | null;
  responseRateDiff: number | null;
  overallScore: number | null; // Strictly Item #13
  prevOverallScore: number | null; // Strictly Item #13 (prior year)
  overallSd: number | null; // Strictly Item #13
  highSatPct: number | null; // Strictly Item #13 (% >= 4 / มาก-มากที่สุด)
  overallLevelLabel: string;
  highestDimension: { label: string; score: number } | null;
  lowestDimension: { label: string; score: number } | null;
  dimensions: DimensionComparisonItem[];
  positions: LabelPctItem[];
  experiences: LabelPctItem[];
  orgTypes: LabelPctItem[];
  durations: LabelPctItem[];
  industries: LabelPctItem[];
  strengths: LabelPctItem[];
  skillsToImprove: LabelPctItem[];
  issuePills: IssuePillItem[];
  quotes: string[];
  neededMajors: LabelPctItem[];
  coreSkills: LabelPctItem[];
  selectionCriteria: LabelPctItem[];
  internshipRequiredPct: number | null;
  internshipMinMonths: number | null;
  highlights: [string, string, string];
  observations: [string, string, string];
  generatedDateThai: string;
  fontFaceCss?: string;
  logoDataUri?: string;
  heroDataUri?: string;
}

export interface TemplateAssets {
  fontFaceCss: string;
  logoDataUri: string;
  heroDataUri: string;
}

const TEMPLATE_HTML_PATH = '/assets/aistudio/Template_Infographic_______________________2568_cfa7246c.html';
let cachedAssetsPromise: Promise<TemplateAssets> | null = null;

async function svgToPngDataUri(svgMarkup: string, widthPx: number, heightPx: number): Promise<string> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') return '';
  try {
    const sizedSvg = svgMarkup.replace(
      /<svg\b([^>]*)>/i,
      (_match, attrs: string) => {
        const cleaned = attrs
          .replace(/\swidth="[^"]*"/gi, '')
          .replace(/\sheight="[^"]*"/gi, '');
        return `<svg${cleaned} width="${widthPx}" height="${heightPx}">`;
      }
    );
    const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sizedSvg)}`;
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Failed to load hero SVG'));
      el.src = svgUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = widthPx;
    canvas.height = heightPx;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.clearRect(0, 0, widthPx, heightPx);
    ctx.drawImage(img, 0, 0, widthPx, heightPx);
    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
}

/**
 * Dynamically extracts the exact embedded SarabunX @font-face CSS and Bangkok University
 * PNG logo data URI from the static template asset served in /public/assets/aistudio/.
 * Pre-renders the hero graduation cap illustration to PNG data URI so html2canvas never drops it.
 */
export async function extractTemplateAssets(): Promise<TemplateAssets> {
  if (cachedAssetsPromise) return cachedAssetsPromise;

  cachedAssetsPromise = (async () => {
    let fontFaceCss = '';
    let logoDataUri = '';
    try {
      const res = await fetch(TEMPLATE_HTML_PATH, { cache: 'force-cache' });
      if (res.ok) {
        const html = await res.text();
        const fontMatches = html.match(/@font-face\{[^}]+\}/g);
        fontFaceCss = fontMatches ? fontMatches.join('\n') : '';
        const logoMatch = html.match(/<img\s+class="logo"\s+src="(data:image\/[^"]+)"/i);
        logoDataUri = logoMatch?.[1] || '';
      }
    } catch {
      // Continue with fallback fonts/crest
    }

    const heroDataUri = await svgToPngDataUri(HERO_SVG, 372, 372);
    return { fontFaceCss, logoDataUri, heroDataUri };
  })();

  return cachedAssetsPromise;
}

const FALLBACK_BU_SVG_LOGO = `<svg class="bu-logo" viewBox="0 0 210 58" width="150" height="42" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Bangkok University">
  <polygon points="24,6 42,20 35,44 13,44 6,20" fill="#1b3a6b"/>
  <polygon points="24,13 35,22 30,38 18,38 13,22" fill="none" stroke="#f08a1c" stroke-width="2.2"/>
  <text x="52" y="29" font-size="17" font-weight="700" fill="#1b3a6b" font-family="'SarabunX','Sarabun',sans-serif">BANGKOK</text>
  <text x="52" y="45" font-size="11.5" font-weight="600" fill="#e8791a" letter-spacing="1.4" font-family="'SarabunX','Sarabun',sans-serif">UNIVERSITY</text>
</svg>`;

const DIMENSIONS_12: { id: number; line1: string; line2?: string; full: string }[] = [
  { id: 1, line1: 'คุณธรรม', line2: 'จริยธรรม', full: 'คุณธรรมจริยธรรม' },
  { id: 2, line1: 'ความรู้', full: 'ความรู้' },
  { id: 3, line1: 'ทักษะทาง', line2: 'ปัญญา', full: 'ทักษะทางปัญญา' },
  { id: 4, line1: 'สัมพันธ์', line2: 'ระหว่างบุคคล', full: 'สัมพันธ์ระหว่างบุคคล' },
  { id: 5, line1: 'วิเคราะห์', line2: 'ตัวเลข/IT', full: 'วิเคราะห์ตัวเลข/IT' },
  { id: 6, line1: 'ความคิด', line2: 'สร้างสรรค์', full: 'ความคิดสร้างสรรค์' },
  { id: 7, line1: 'ผู้ประกอบ', line2: 'การ', full: 'ความเป็นผู้ประกอบการ' },
  { id: 8, line1: 'ความเป็น', line2: 'สากล', full: 'ความเป็นสากล' },
  { id: 9, line1: 'ตั้งคำถาม', full: 'การตั้งคำถาม' },
  { id: 10, line1: 'ไหวพริบ', line2: 'ทันโลก', full: 'ไหวพริบทันโลก' },
  { id: 11, line1: 'ทำงานร่วม', line2: 'กับผู้อื่น', full: 'ทำงานร่วมกับผู้อื่น' },
  { id: 12, line1: 'มุ่งมั่น ตั้งใจ', line2: 'เรียนรู้', full: 'มุ่งมั่นตั้งใจเรียนรู้' },
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
  { label: '> 1 – 3 ปี', match: (v: string) => (v.includes('มากกว่า 1') || v.includes('> 1')) && v.includes('3 ปี') },
  { label: '> 3 ปีขึ้นไป', match: (v: string) => v.includes('3 ปี') && v.includes('ขึ้นไป') },
];

export function escapeHtml(str: unknown): string {
  const s = str === null || str === undefined ? '' : String(str);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function clamp(num: number, min: number, max: number): number {
  if (!Number.isFinite(num)) return min;
  return Math.min(max, Math.max(min, num));
}

function safeFixed(val: number | null | undefined, digits = 2, fallback = '0.00'): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return fallback;
  return val.toFixed(digits);
}

function safePct(val: number | null | undefined, fallback = 0): number {
  if (val === null || val === undefined || !Number.isFinite(val)) return fallback;
  return Math.round(clamp(val, 0, 100));
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

function getQualityLevelLabel(score: number | null): string {
  if (score === null || !Number.isFinite(score)) return '-';
  if (score >= 4.5) return 'มากที่สุด (ดีเยี่ยม)';
  if (score >= 3.5) return 'มาก';
  if (score >= 2.5) return 'ปานกลาง';
  if (score >= 1.5) return 'น้อย';
  return 'น้อยที่สุด';
}

function getShortQualityLevel(score: number | null): string {
  if (score === null || !Number.isFinite(score)) return '-';
  if (score >= 4.5) return 'มากที่สุด';
  if (score >= 3.5) return 'มาก';
  if (score >= 2.5) return 'ปานกลาง';
  if (score >= 1.5) return 'น้อย';
  return 'น้อยที่สุด';
}

export interface BuildReportParams {
  filteredResponses: SurveyResponse[];
  allResponses: SurveyResponse[];
  allSupervisors: Supervisor[];
  filterYear: string;
  filterMonth: string;
  filterFaculty: string;
  filterDepartment: string;
  totalSentCount: number;
  getThaiMonthName: (monthStr: string) => string;
  assets?: TemplateAssets;
}

export function buildSurveyReportData(params: BuildReportParams): SurveyReportData {
  const {
    filteredResponses,
    allResponses,
    allSupervisors,
    filterYear,
    filterMonth,
    filterFaculty,
    filterDepartment,
    totalSentCount,
    getThaiMonthName,
    assets,
  } = params;

  const n = filteredResponses.length;
  const isSpecificYear = filterYear !== 'all' && /^\d{4}$/.test(filterYear);
  const academicYearLabel = isSpecificYear ? filterYear : 'ทุกปีการศึกษา';
  const prevYear = isSpecificYear ? String(Number(filterYear) - 1) : null;
  const prevYearLabel = prevYear ? `ปีการศึกษา ${prevYear}` : 'ปีก่อนหน้า';

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

  const responseRate = totalSentCount > 0 ? (n / totalSentCount) * 100 : null;
  const prevResponseRate =
    prevResponses.length > 0 && prevSentCount > 0
      ? (prevResponses.length / prevSentCount) * 100
      : null;
  const responseRateDiff =
    responseRate !== null && prevResponseRate !== null ? responseRate - prevResponseRate : null;

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
        if (val13 >= 7) item13HighCount += 1;
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

  const dimensions: DimensionComparisonItem[] = DIMENSIONS_12.map((d, idx) => ({
    ...d,
    prevScore: prevRatings.attrMeans12[idx],
    currScore: currRatings.attrMeans12[idx],
  }));

  const valid12 = dimensions.filter((item) => item.currScore !== null);
  const maxDim =
    valid12.length > 0
      ? valid12.reduce((best, cur) => ((cur.currScore ?? 0) > (best.currScore ?? 0) ? cur : best))
      : null;
  const minDim =
    valid12.length > 0
      ? valid12.reduce((low, cur) => ((cur.currScore ?? 0) < (low.currScore ?? 0) ? cur : low))
      : null;

  const calcBuckets = (
    buckets: { label: string; match: (v: string) => boolean }[],
    extractor: (r: SurveyResponse) => string | undefined
  ): LabelPctItem[] => {
    const counts = buckets.map((b) => ({ label: b.label, count: 0, pct: 0 }));
    if (n === 0) return counts;
    filteredResponses.forEach((r) => {
      const raw = (extractor(r) || '').trim();
      if (!raw) return;
      const idx = buckets.findIndex((b) => b.match(raw));
      if (idx >= 0) counts[idx].count += 1;
    });
    return counts.map((c) => ({
      ...c,
      pct: Math.round((c.count / n) * 100),
    }));
  };

  const positions = calcBuckets(POSITION_BUCKETS, (r) => r.part1?.position);
  const experiences = calcBuckets(EXPERIENCE_BUCKETS, (r) => r.part1?.experience);
  const orgTypes = calcBuckets(ORG_TYPE_BUCKETS, (r) => r.part1?.orgType);
  const durations = calcBuckets(DURATION_BUCKETS, (r) => r.part1?.graduateDuration);

  // Industries Top 5
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
  const industries: LabelPctItem[] = Object.entries(indMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({ label, count, pct: n > 0 ? Math.round((count / n) * 100) : 0 }));

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
        pct: n > 0 ? Math.round((count / n) * 100) : 0,
      }));
  };

  const strengths = aggregatePool(
    (r) => r.part2?.strongPoints,
    'อื่นๆ (โปรดระบุ)',
    (r) => r.part2?.strongPointsOther,
    shortenLabel
  ).slice(0, 5);

  const allSkillsToImprove = aggregatePool(
    (r) => r.part2?.skillsToImprove,
    'อื่นๆ (โปรดระบุ)',
    (r) => r.part2?.skillsToImproveOther,
    shortenSkillShort
  );
  const skillsToImprove = allSkillsToImprove.slice(0, 5);
  const issuePills: IssuePillItem[] = allSkillsToImprove
    .slice(0, 3)
    .map((s) => ({ label: s.label, count: s.count }));

  const quotes = filteredResponses
    .map((r) => sanitizeQuoteText(r.part2?.suggestions || ''))
    .filter((txt) => txt.length > 0)
    .slice(0, 2);

  const neededMajors = aggregatePool(
    (r) => r.part3?.neededMajors,
    'สาขาวิชาอื่นๆ (ระบุ)',
    (r) => r.part3?.neededMajorsOther,
    shortenLabel
  ).slice(0, 5);

  const coreSkills = aggregatePool(
    (r) => r.part3?.coreSkills,
    'ทักษะสำคัญอื่นๆ (ระบุ)',
    (r) => r.part3?.coreSkillsOther,
    shortenSkillShort
  ).slice(0, 5);

  let knowCount = 0;
  let attCount = 0;
  let capCount = 0;
  let expYesCount = 0;
  let expMonthsSum = 0;
  let expMonthsCount = 0;

  filteredResponses.forEach((r) => {
    const criteria = r.part3?.selectionCriteria || [];
    if (criteria.some((c) => c.includes('ความรู้'))) knowCount += 1;
    if (criteria.some((c) => c.includes('ทัศนคติ'))) attCount += 1;
    if (criteria.some((c) => c.includes('ขีดความสามารถ'))) capCount += 1;
    if (r.part3?.requiresExperience === 'yes') {
      expYesCount += 1;
      if (r.part3.experienceMonths && Number(r.part3.experienceMonths) > 0) {
        expMonthsSum += Number(r.part3.experienceMonths);
        expMonthsCount += 1;
      }
    }
  });

  const selectionCriteria: LabelPctItem[] = [
    { label: 'ความรู้ในวิชาชีพ', pct: n > 0 ? Math.round((knowCount / n) * 100) : 0, count: knowCount },
    { label: 'ทัศนคติ', pct: n > 0 ? Math.round((attCount / n) * 100) : 0, count: attCount },
    { label: 'ขีดความสามารถ', pct: n > 0 ? Math.round((capCount / n) * 100) : 0, count: capCount },
  ];

  const internshipRequiredPct = n > 0 ? Math.round((expYesCount / n) * 100) : null;
  const internshipMinMonths =
    expMonthsCount > 0 ? parseFloat((expMonthsSum / expMonthsCount).toFixed(1)) : null;

  const overallDiff =
    currRatings.attr13Mean !== null && prevRatings.attr13Mean !== null
      ? currRatings.attr13Mean - prevRatings.attr13Mean
      : null;

  const mainBullet1 =
    n === 0
      ? 'ไม่พบข้อมูลการตอบกลับสำหรับเงื่อนไขตัวกรองที่เลือก (แสดงผลค่าสถิติ 0.00 / 0%)'
      : currRatings.attr13Mean !== null
        ? `ความพึงพอใจภาพรวม (ข้อ 13) เฉลี่ย ${currRatings.attr13Mean.toFixed(2)}/5.00 (${getQualityLevelLabel(currRatings.attr13Mean)}) จากผู้ตอบ ${n} ราย${responseRate !== null ? ` (ตอบกลับ ${responseRate.toFixed(1)}%)` : ''}`
        : `ผู้ตอบแบบสำรวจทั้งหมด ${n} ราย (ไม่มีคะแนนประเมินในภาพรวม)`;

  const mainBullet2 = maxDim
    ? `ด้านที่ได้คะแนนสูงสุด คือ ${maxDim.full} (${(maxDim.currScore ?? 0).toFixed(2)})${currRatings.item13HighSatPct !== null ? ` · ระดับมาก–มากที่สุด ${Math.round(currRatings.item13HighSatPct)}%` : ''}`
    : 'ด้านที่ได้คะแนนสูงสุด: ยังไม่มีข้อมูลคะแนนเฉลี่ยรายด้าน (-)';

  const mainBullet3 =
    overallDiff !== null && prevYear && prevRatings.attr13Mean !== null
      ? `เทียบกับปีการศึกษา ${prevYear} (${prevRatings.attr13Mean.toFixed(2)}): ${overallDiff >= 0 ? 'เพิ่มขึ้น' : 'ลดลง'} ${Math.abs(overallDiff).toFixed(2)} คะแนน`
      : prevYear
        ? `เปรียบเทียบปีการศึกษา ${prevYear}: ยังไม่มีข้อมูลปีก่อนหน้าตามตัวกรองนี้`
        : 'เปรียบเทียบปีก่อนหน้า: เลือกเฉพาะปีการศึกษาเพื่อดูผลเปรียบเทียบ';

  const obsBullet1 = minDim
    ? `ประเด็นที่ควรพัฒนาเพิ่ม คือ ด้าน${minDim.full} (${(minDim.currScore ?? 0).toFixed(2)})${skillsToImprove[0] ? ` และ${skillsToImprove[0].label} (${skillsToImprove[0].pct}%)` : ''}`
    : 'ประเด็นที่ควรพัฒนาเพิ่มเติม: ยังไม่มีข้อมูลตามตัวกรองนี้';

  const obsBullet2 =
    neededMajors[0] || coreSkills[0]
      ? `ความต้องการตลาดแรงงานสูงสุด คือ ${neededMajors[0] ? `${neededMajors[0].label} (${neededMajors[0].pct}%)` : '-'}${coreSkills[0] ? ` · ${coreSkills[0].label} (${coreSkills[0].pct}%)` : ''}`
      : 'ความต้องการของตลาดแรงงาน: ยังไม่มีข้อมูลตามตัวกรองนี้';

  const topCrit = [...selectionCriteria].sort((a, b) => b.pct - a.pct)[0];
  const obsBullet3 =
    n > 0 && internshipRequiredPct !== null
      ? `องค์กรต้องการผู้มีประสบการณ์/ฝึกงาน ${internshipRequiredPct}%${internshipMinMonths !== null ? ` (เฉลี่ย ${internshipMinMonths.toFixed(1)} เดือน)` : ''} · เกณฑ์หลัก: ${topCrit && topCrit.pct > 0 ? `${topCrit.label} (${topCrit.pct}%)` : '-'}`
      : 'การคัดเลือกบุคลากร & ประสบการณ์ฝึกงาน: ยังไม่มีข้อมูลตามตัวกรองนี้';

  const activeScopeParts: string[] = [];
  if (filterFaculty !== 'all') activeScopeParts.push(`คณะ${filterFaculty}`);
  if (filterDepartment !== 'all') activeScopeParts.push(`สาขา${filterDepartment}`);
  if (filterMonth !== 'all') activeScopeParts.push(`เดือน${getThaiMonthName(filterMonth)}`);
  const scopeLabel = activeScopeParts.length > 0 ? activeScopeParts.join(' · ') : 'ทุกคณะ / ทุกสาขาวิชา';

  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyyBe = String(now.getFullYear() + 543);

  return {
    academicYearLabel,
    prevYearLabel,
    scopeLabel,
    totalResponses: n,
    totalSentCount,
    responseRate,
    prevResponseRate,
    responseRateDiff,
    overallScore: currRatings.attr13Mean,
    prevOverallScore: prevRatings.attr13Mean,
    overallSd: currRatings.item13Sd,
    highSatPct: currRatings.item13HighSatPct,
    overallLevelLabel: getShortQualityLevel(currRatings.attr13Mean),
    highestDimension: maxDim ? { label: maxDim.full, score: maxDim.currScore ?? 0 } : null,
    lowestDimension: minDim ? { label: minDim.full, score: minDim.currScore ?? 0 } : null,
    dimensions,
    positions,
    experiences,
    orgTypes,
    durations,
    industries,
    strengths,
    skillsToImprove,
    issuePills,
    quotes,
    neededMajors,
    coreSkills,
    selectionCriteria,
    internshipRequiredPct,
    internshipMinMonths,
    highlights: [mainBullet1, mainBullet2, mainBullet3],
    observations: [obsBullet1, obsBullet2, obsBullet3],
    generatedDateThai: `${dd}/${mm}/${yyyyBe}`,
    fontFaceCss: assets?.fontFaceCss || '',
    logoDataUri: assets?.logoDataUri || '',
    heroDataUri: assets?.heroDataUri || '',
  };
}

function truncateLabel(text: string, maxChars: number): string {
  const trimmed = (text || '').trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, Math.max(1, maxChars - 1))}…`;
}

function renderProgressRows(
  items: LabelPctItem[],
  barVariant: '' | 'g' | 'o',
  maxRows: number,
  emptyLabel: string,
  maxLabelChars: number = 17
): string {
  if (items.length === 0) {
    return Array.from({ length: maxRows }, (_, idx) =>
      idx === 0
        ? `<div class="bu-r"><div class="bu-rt"><span>${escapeHtml(truncateLabel(emptyLabel, maxLabelChars))}</span><b>0%</b></div><div class="bu-tr"><div class="bu-fl ${barVariant}" style="width:0%"></div></div></div>`
        : `<div class="bu-r"><div class="bu-rt"><span>-</span><b>0%</b></div><div class="bu-tr"><div class="bu-fl ${barVariant}" style="width:0%"></div></div></div>`
    ).join('');
  }
  return items
    .slice(0, maxRows)
    .map((item) => {
      const pct = safePct(item.pct, 0);
      const safeLabel = truncateLabel(item.label, maxLabelChars);
      return `<div class="bu-r"><div class="bu-rt"><span title="${escapeHtml(item.label)}">${escapeHtml(safeLabel)}</span><b>${pct}%</b></div><div class="bu-tr"><div class="bu-fl ${barVariant}" style="width:${pct}%"></div></div></div>`;
    })
    .join('');
}

function renderSvg3DBar(score: number, variant: 'old' | 'new'): string {
  const maxBarPx = 110;
  const hPx = score > 0 ? Math.max(4, Math.round((clamp(score, 0, 5) / 5) * maxBarPx)) : 0;
  if (hPx === 0) {
    return `<svg width="16" height="2" viewBox="0 0 16 2" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="12" height="2" fill="#e2e8f0"/></svg>`;
  }

  const totalH = hPx + 4;
  const frontTop = variant === 'old' ? '#c6e8c4' : '#3d8fd6';
  const frontBot = variant === 'old' ? '#a9dba4' : '#1e6fb8';
  const topFacet = variant === 'old' ? '#e0f3de' : '#7fb8e8';
  const sideFacet = variant === 'old' ? '#86c47f' : '#155690';
  const gradId = `g_${variant}`;

  return `<svg width="16" height="${totalH}" viewBox="0 0 16 ${totalH}" xmlns="http://www.w3.org/2000/svg" style="display:block;overflow:visible">
    <defs><linearGradient id="${gradId}" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="${frontTop}"/><stop offset="100%" stop-color="${frontBot}"/></linearGradient></defs>
    <rect x="0" y="4" width="12" height="${hPx}" fill="url(#${gradId})"/>
    <polygon points="0,4 4,0 16,0 12,4" fill="${topFacet}"/>
    <polygon points="12,4 16,0 16,${hPx} 12,${totalH}" fill="${sideFacet}"/>
  </svg>`;
}

function renderDonutSvg(pct: number, displayVal: string, sizePx: number, activeColor: string, trackColor: string, fontSizePx: number): string {
  const cx = sizePx / 2;
  const cy = sizePx / 2;
  const strokeW = sizePx >= 64 ? 10.5 : 8.5;
  const r = cx - strokeW / 2 - 1;
  const circ = 2 * Math.PI * r;
  const clampedPct = clamp(pct, 0, 100);
  const dash = (clampedPct / 100) * circ;

  return `<svg width="${sizePx}" height="${sizePx}" viewBox="0 0 ${sizePx} ${sizePx}" xmlns="http://www.w3.org/2000/svg" style="display:block;flex:none">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffffff" stroke="${trackColor}" stroke-width="${strokeW}"/>
    ${clampedPct > 0 ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${activeColor}" stroke-width="${strokeW}" stroke-dasharray="${dash.toFixed(2)} ${circ.toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"/>` : ''}
    <text x="${cx}" y="${cy + fontSizePx * 0.36}" text-anchor="middle" font-size="${fontSizePx}" font-weight="700" fill="#1b3a6b" font-family="'SarabunX','Sarabun',sans-serif">${escapeHtml(displayVal)}</text>
  </svg>`;
}

const SKY_SVG = `<svg class="bu-sky" width="794" height="144" viewBox="0 0 740 150" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="101" width="24" height="49" fill="#bcd2e2"/><rect x="4" y="107" width="3" height="4" fill="#fff" opacity=".7"/><rect x="11" y="107" width="3" height="4" fill="#fff" opacity=".7"/><rect x="18" y="107" width="3" height="4" fill="#fff" opacity=".7"/><rect x="4" y="116" width="3" height="4" fill="#fff" opacity=".7"/><rect x="11" y="116" width="3" height="4" fill="#fff" opacity=".7"/><rect x="18" y="116" width="3" height="4" fill="#fff" opacity=".7"/><rect x="4" y="125" width="3" height="4" fill="#fff" opacity=".7"/><rect x="11" y="125" width="3" height="4" fill="#fff" opacity=".7"/><rect x="18" y="125" width="3" height="4" fill="#fff" opacity=".7"/><rect x="4" y="134" width="3" height="4" fill="#fff" opacity=".7"/><rect x="11" y="134" width="3" height="4" fill="#fff" opacity=".7"/><rect x="18" y="134" width="3" height="4" fill="#fff" opacity=".7"/><rect x="4" y="143" width="3" height="4" fill="#fff" opacity=".7"/><rect x="11" y="143" width="3" height="4" fill="#fff" opacity=".7"/><rect x="18" y="143" width="3" height="4" fill="#fff" opacity=".7"/><rect x="24" y="52" width="16" height="98" fill="#d9e6ef"/><rect x="28" y="58" width="3" height="4" fill="#fff" opacity=".7"/><rect x="35" y="58" width="3" height="4" fill="#fff" opacity=".7"/><rect x="28" y="67" width="3" height="4" fill="#fff" opacity=".7"/><rect x="35" y="67" width="3" height="4" fill="#fff" opacity=".7"/><rect x="28" y="76" width="3" height="4" fill="#fff" opacity=".7"/><rect x="35" y="76" width="3" height="4" fill="#fff" opacity=".7"/><rect x="28" y="85" width="3" height="4" fill="#fff" opacity=".7"/><rect x="35" y="85" width="3" height="4" fill="#fff" opacity=".7"/><rect x="28" y="94" width="3" height="4" fill="#fff" opacity=".7"/><rect x="35" y="94" width="3" height="4" fill="#fff" opacity=".7"/><rect x="28" y="103" width="3" height="4" fill="#fff" opacity=".7"/><rect x="35" y="103" width="3" height="4" fill="#fff" opacity=".7"/><rect x="28" y="112" width="3" height="4" fill="#fff" opacity=".7"/><rect x="35" y="112" width="3" height="4" fill="#fff" opacity=".7"/><rect x="28" y="121" width="3" height="4" fill="#fff" opacity=".7"/><rect x="35" y="121" width="3" height="4" fill="#fff" opacity=".7"/><rect x="28" y="130" width="3" height="4" fill="#fff" opacity=".7"/><rect x="35" y="130" width="3" height="4" fill="#fff" opacity=".7"/><rect x="28" y="139" width="3" height="4" fill="#fff" opacity=".7"/><rect x="35" y="139" width="3" height="4" fill="#fff" opacity=".7"/><rect x="42" y="113" width="32" height="37" fill="#c9dbe8"/><rect x="46" y="119" width="3" height="4" fill="#fff" opacity=".7"/><rect x="53" y="119" width="3" height="4" fill="#fff" opacity=".7"/><rect x="60" y="119" width="3" height="4" fill="#fff" opacity=".7"/><rect x="67" y="119" width="3" height="4" fill="#fff" opacity=".7"/><rect x="46" y="128" width="3" height="4" fill="#fff" opacity=".7"/><rect x="53" y="128" width="3" height="4" fill="#fff" opacity=".7"/><rect x="60" y="128" width="3" height="4" fill="#fff" opacity=".7"/><rect x="67" y="128" width="3" height="4" fill="#fff" opacity=".7"/><rect x="46" y="137" width="3" height="4" fill="#fff" opacity=".7"/><rect x="53" y="137" width="3" height="4" fill="#fff" opacity=".7"/><rect x="60" y="137" width="3" height="4" fill="#fff" opacity=".7"/><rect x="67" y="137" width="3" height="4" fill="#fff" opacity=".7"/><rect x="74" y="65" width="16" height="85" fill="#bcd2e2"/><rect x="78" y="71" width="3" height="4" fill="#fff" opacity=".7"/><rect x="85" y="71" width="3" height="4" fill="#fff" opacity=".7"/><rect x="78" y="80" width="3" height="4" fill="#fff" opacity=".7"/><rect x="85" y="80" width="3" height="4" fill="#fff" opacity=".7"/><rect x="78" y="89" width="3" height="4" fill="#fff" opacity=".7"/><rect x="85" y="89" width="3" height="4" fill="#fff" opacity=".7"/><rect x="78" y="98" width="3" height="4" fill="#fff" opacity=".7"/><rect x="85" y="98" width="3" height="4" fill="#fff" opacity=".7"/><rect x="78" y="107" width="3" height="4" fill="#fff" opacity=".7"/><rect x="85" y="107" width="3" height="4" fill="#fff" opacity=".7"/><rect x="78" y="116" width="3" height="4" fill="#fff" opacity=".7"/><rect x="85" y="116" width="3" height="4" fill="#fff" opacity=".7"/><rect x="78" y="125" width="3" height="4" fill="#fff" opacity=".7"/><rect x="85" y="125" width="3" height="4" fill="#fff" opacity=".7"/><rect x="78" y="134" width="3" height="4" fill="#fff" opacity=".7"/><rect x="85" y="134" width="3" height="4" fill="#fff" opacity=".7"/><rect x="78" y="143" width="3" height="4" fill="#fff" opacity=".7"/><rect x="85" y="143" width="3" height="4" fill="#fff" opacity=".7"/><rect x="90" y="109" width="21" height="41" fill="#bcd2e2"/><rect x="94" y="115" width="3" height="4" fill="#fff" opacity=".7"/><rect x="101" y="115" width="3" height="4" fill="#fff" opacity=".7"/><rect x="94" y="124" width="3" height="4" fill="#fff" opacity=".7"/><rect x="101" y="124" width="3" height="4" fill="#fff" opacity=".7"/><rect x="94" y="133" width="3" height="4" fill="#fff" opacity=".7"/><rect x="101" y="133" width="3" height="4" fill="#fff" opacity=".7"/><rect x="94" y="142" width="3" height="4" fill="#fff" opacity=".7"/><rect x="101" y="142" width="3" height="4" fill="#fff" opacity=".7"/><rect x="111" y="105" width="32" height="45" fill="#c9dbe8"/><rect x="115" y="111" width="3" height="4" fill="#fff" opacity=".7"/><rect x="122" y="111" width="3" height="4" fill="#fff" opacity=".7"/><rect x="129" y="111" width="3" height="4" fill="#fff" opacity=".7"/><rect x="136" y="111" width="3" height="4" fill="#fff" opacity=".7"/><rect x="115" y="120" width="3" height="4" fill="#fff" opacity=".7"/><rect x="122" y="120" width="3" height="4" fill="#fff" opacity=".7"/><rect x="129" y="120" width="3" height="4" fill="#fff" opacity=".7"/><rect x="136" y="120" width="3" height="4" fill="#fff" opacity=".7"/><rect x="115" y="129" width="3" height="4" fill="#fff" opacity=".7"/><rect x="122" y="129" width="3" height="4" fill="#fff" opacity=".7"/><rect x="129" y="129" width="3" height="4" fill="#fff" opacity=".7"/><rect x="136" y="129" width="3" height="4" fill="#fff" opacity=".7"/><rect x="115" y="138" width="3" height="4" fill="#fff" opacity=".7"/><rect x="122" y="138" width="3" height="4" fill="#fff" opacity=".7"/><rect x="129" y="138" width="3" height="4" fill="#fff" opacity=".7"/><rect x="136" y="138" width="3" height="4" fill="#fff" opacity=".7"/><rect x="147" y="47" width="15" height="103" fill="#bcd2e2"/><rect x="151" y="53" width="3" height="4" fill="#fff" opacity=".7"/><rect x="151" y="62" width="3" height="4" fill="#fff" opacity=".7"/><rect x="151" y="71" width="3" height="4" fill="#fff" opacity=".7"/><rect x="151" y="80" width="3" height="4" fill="#fff" opacity=".7"/><rect x="151" y="89" width="3" height="4" fill="#fff" opacity=".7"/><rect x="151" y="98" width="3" height="4" fill="#fff" opacity=".7"/><rect x="151" y="107" width="3" height="4" fill="#fff" opacity=".7"/><rect x="151" y="116" width="3" height="4" fill="#fff" opacity=".7"/><rect x="151" y="125" width="3" height="4" fill="#fff" opacity=".7"/><rect x="151" y="134" width="3" height="4" fill="#fff" opacity=".7"/><rect x="151" y="143" width="3" height="4" fill="#fff" opacity=".7"/><rect x="162" y="115" width="21" height="35" fill="#c9dbe8"/><rect x="166" y="121" width="3" height="4" fill="#fff" opacity=".7"/><rect x="173" y="121" width="3" height="4" fill="#fff" opacity=".7"/><rect x="166" y="130" width="3" height="4" fill="#fff" opacity=".7"/><rect x="173" y="130" width="3" height="4" fill="#fff" opacity=".7"/><rect x="166" y="139" width="3" height="4" fill="#fff" opacity=".7"/><rect x="173" y="139" width="3" height="4" fill="#fff" opacity=".7"/><rect x="185" y="102" width="27" height="48" fill="#d9e6ef"/><rect x="189" y="108" width="3" height="4" fill="#fff" opacity=".7"/><rect x="196" y="108" width="3" height="4" fill="#fff" opacity=".7"/><rect x="203" y="108" width="3" height="4" fill="#fff" opacity=".7"/><rect x="189" y="117" width="3" height="4" fill="#fff" opacity=".7"/><rect x="196" y="117" width="3" height="4" fill="#fff" opacity=".7"/><rect x="203" y="117" width="3" height="4" fill="#fff" opacity=".7"/><rect x="189" y="126" width="3" height="4" fill="#fff" opacity=".7"/><rect x="196" y="126" width="3" height="4" fill="#fff" opacity=".7"/><rect x="203" y="126" width="3" height="4" fill="#fff" opacity=".7"/><rect x="189" y="135" width="3" height="4" fill="#fff" opacity=".7"/><rect x="196" y="135" width="3" height="4" fill="#fff" opacity=".7"/><rect x="203" y="135" width="3" height="4" fill="#fff" opacity=".7"/><rect x="189" y="144" width="3" height="4" fill="#fff" opacity=".7"/><rect x="196" y="144" width="3" height="4" fill="#fff" opacity=".7"/><rect x="203" y="144" width="3" height="4" fill="#fff" opacity=".7"/><rect x="216" y="49" width="23" height="101" fill="#c9dbe8"/><rect x="220" y="55" width="3" height="4" fill="#fff" opacity=".7"/><rect x="227" y="55" width="3" height="4" fill="#fff" opacity=".7"/><rect x="234" y="55" width="3" height="4" fill="#fff" opacity=".7"/><rect x="220" y="64" width="3" height="4" fill="#fff" opacity=".7"/><rect x="227" y="64" width="3" height="4" fill="#fff" opacity=".7"/><rect x="234" y="64" width="3" height="4" fill="#fff" opacity=".7"/><rect x="220" y="73" width="3" height="4" fill="#fff" opacity=".7"/><rect x="227" y="73" width="3" height="4" fill="#fff" opacity=".7"/><rect x="234" y="73" width="3" height="4" fill="#fff" opacity=".7"/><rect x="220" y="82" width="3" height="4" fill="#fff" opacity=".7"/><rect x="227" y="82" width="3" height="4" fill="#fff" opacity=".7"/><rect x="234" y="82" width="3" height="4" fill="#fff" opacity=".7"/><rect x="220" y="91" width="3" height="4" fill="#fff" opacity=".7"/><rect x="227" y="91" width="3" height="4" fill="#fff" opacity=".7"/><rect x="234" y="91" width="3" height="4" fill="#fff" opacity=".7"/><rect x="220" y="100" width="3" height="4" fill="#fff" opacity=".7"/><rect x="227" y="100" width="3" height="4" fill="#fff" opacity=".7"/><rect x="234" y="100" width="3" height="4" fill="#fff" opacity=".7"/><rect x="220" y="109" width="3" height="4" fill="#fff" opacity=".7"/><rect x="227" y="109" width="3" height="4" fill="#fff" opacity=".7"/><rect x="234" y="109" width="3" height="4" fill="#fff" opacity=".7"/><rect x="220" y="118" width="3" height="4" fill="#fff" opacity=".7"/><rect x="227" y="118" width="3" height="4" fill="#fff" opacity=".7"/><rect x="234" y="118" width="3" height="4" fill="#fff" opacity=".7"/><rect x="220" y="127" width="3" height="4" fill="#fff" opacity=".7"/><rect x="227" y="127" width="3" height="4" fill="#fff" opacity=".7"/><rect x="234" y="127" width="3" height="4" fill="#fff" opacity=".7"/><rect x="220" y="136" width="3" height="4" fill="#fff" opacity=".7"/><rect x="227" y="136" width="3" height="4" fill="#fff" opacity=".7"/><rect x="234" y="136" width="3" height="4" fill="#fff" opacity=".7"/><rect x="220" y="145" width="3" height="4" fill="#fff" opacity=".7"/><rect x="227" y="145" width="3" height="4" fill="#fff" opacity=".7"/><rect x="234" y="145" width="3" height="4" fill="#fff" opacity=".7"/><rect x="239" y="47" width="32" height="103" fill="#c9dbe8"/><rect x="243" y="53" width="3" height="4" fill="#fff" opacity=".7"/><rect x="250" y="53" width="3" height="4" fill="#fff" opacity=".7"/><rect x="257" y="53" width="3" height="4" fill="#fff" opacity=".7"/><rect x="264" y="53" width="3" height="4" fill="#fff" opacity=".7"/><rect x="243" y="62" width="3" height="4" fill="#fff" opacity=".7"/><rect x="250" y="62" width="3" height="4" fill="#fff" opacity=".7"/><rect x="257" y="62" width="3" height="4" fill="#fff" opacity=".7"/><rect x="264" y="62" width="3" height="4" fill="#fff" opacity=".7"/><rect x="243" y="71" width="3" height="4" fill="#fff" opacity=".7"/><rect x="250" y="71" width="3" height="4" fill="#fff" opacity=".7"/><rect x="257" y="71" width="3" height="4" fill="#fff" opacity=".7"/><rect x="264" y="71" width="3" height="4" fill="#fff" opacity=".7"/><rect x="243" y="80" width="3" height="4" fill="#fff" opacity=".7"/><rect x="250" y="80" width="3" height="4" fill="#fff" opacity=".7"/><rect x="257" y="80" width="3" height="4" fill="#fff" opacity=".7"/><rect x="264" y="80" width="3" height="4" fill="#fff" opacity=".7"/><rect x="243" y="89" width="3" height="4" fill="#fff" opacity=".7"/><rect x="250" y="89" width="3" height="4" fill="#fff" opacity=".7"/><rect x="257" y="89" width="3" height="4" fill="#fff" opacity=".7"/><rect x="264" y="89" width="3" height="4" fill="#fff" opacity=".7"/><rect x="243" y="98" width="3" height="4" fill="#fff" opacity=".7"/><rect x="250" y="98" width="3" height="4" fill="#fff" opacity=".7"/><rect x="257" y="98" width="3" height="4" fill="#fff" opacity=".7"/><rect x="264" y="98" width="3" height="4" fill="#fff" opacity=".7"/><rect x="243" y="107" width="3" height="4" fill="#fff" opacity=".7"/><rect x="250" y="107" width="3" height="4" fill="#fff" opacity=".7"/><rect x="257" y="107" width="3" height="4" fill="#fff" opacity=".7"/><rect x="264" y="107" width="3" height="4" fill="#fff" opacity=".7"/><rect x="243" y="116" width="3" height="4" fill="#fff" opacity=".7"/><rect x="250" y="116" width="3" height="4" fill="#fff" opacity=".7"/><rect x="257" y="116" width="3" height="4" fill="#fff" opacity=".7"/><rect x="264" y="116" width="3" height="4" fill="#fff" opacity=".7"/><rect x="243" y="125" width="3" height="4" fill="#fff" opacity=".7"/><rect x="250" y="125" width="3" height="4" fill="#fff" opacity=".7"/><rect x="257" y="125" width="3" height="4" fill="#fff" opacity=".7"/><rect x="264" y="125" width="3" height="4" fill="#fff" opacity=".7"/><rect x="243" y="134" width="3" height="4" fill="#fff" opacity=".7"/><rect x="250" y="134" width="3" height="4" fill="#fff" opacity=".7"/><rect x="257" y="134" width="3" height="4" fill="#fff" opacity=".7"/><rect x="264" y="134" width="3" height="4" fill="#fff" opacity=".7"/><rect x="243" y="143" width="3" height="4" fill="#fff" opacity=".7"/><rect x="250" y="143" width="3" height="4" fill="#fff" opacity=".7"/><rect x="257" y="143" width="3" height="4" fill="#fff" opacity=".7"/><rect x="264" y="143" width="3" height="4" fill="#fff" opacity=".7"/><rect x="273" y="50" width="17" height="100" fill="#d9e6ef"/><rect x="277" y="56" width="3" height="4" fill="#fff" opacity=".7"/><rect x="284" y="56" width="3" height="4" fill="#fff" opacity=".7"/><rect x="277" y="65" width="3" height="4" fill="#fff" opacity=".7"/><rect x="284" y="65" width="3" height="4" fill="#fff" opacity=".7"/><rect x="277" y="74" width="3" height="4" fill="#fff" opacity=".7"/><rect x="284" y="74" width="3" height="4" fill="#fff" opacity=".7"/><rect x="277" y="83" width="3" height="4" fill="#fff" opacity=".7"/><rect x="284" y="83" width="3" height="4" fill="#fff" opacity=".7"/><rect x="277" y="92" width="3" height="4" fill="#fff" opacity=".7"/><rect x="284" y="92" width="3" height="4" fill="#fff" opacity=".7"/><rect x="277" y="101" width="3" height="4" fill="#fff" opacity=".7"/><rect x="284" y="101" width="3" height="4" fill="#fff" opacity=".7"/><rect x="277" y="110" width="3" height="4" fill="#fff" opacity=".7"/><rect x="284" y="110" width="3" height="4" fill="#fff" opacity=".7"/><rect x="277" y="119" width="3" height="4" fill="#fff" opacity=".7"/><rect x="284" y="119" width="3" height="4" fill="#fff" opacity=".7"/><rect x="277" y="128" width="3" height="4" fill="#fff" opacity=".7"/><rect x="284" y="128" width="3" height="4" fill="#fff" opacity=".7"/><rect x="277" y="137" width="3" height="4" fill="#fff" opacity=".7"/><rect x="284" y="137" width="3" height="4" fill="#fff" opacity=".7"/><rect x="294" y="41" width="15" height="109" fill="#c9dbe8"/><rect x="298" y="47" width="3" height="4" fill="#fff" opacity=".7"/><rect x="298" y="56" width="3" height="4" fill="#fff" opacity=".7"/><rect x="298" y="65" width="3" height="4" fill="#fff" opacity=".7"/><rect x="298" y="74" width="3" height="4" fill="#fff" opacity=".7"/><rect x="298" y="83" width="3" height="4" fill="#fff" opacity=".7"/><rect x="298" y="92" width="3" height="4" fill="#fff" opacity=".7"/><rect x="298" y="101" width="3" height="4" fill="#fff" opacity=".7"/><rect x="298" y="110" width="3" height="4" fill="#fff" opacity=".7"/><rect x="298" y="119" width="3" height="4" fill="#fff" opacity=".7"/><rect x="298" y="128" width="3" height="4" fill="#fff" opacity=".7"/><rect x="298" y="137" width="3" height="4" fill="#fff" opacity=".7"/><rect x="312" y="66" width="31" height="84" fill="#e3edf3"/><rect x="316" y="72" width="3" height="4" fill="#fff" opacity=".7"/><rect x="323" y="72" width="3" height="4" fill="#fff" opacity=".7"/><rect x="330" y="72" width="3" height="4" fill="#fff" opacity=".7"/><rect x="337" y="72" width="3" height="4" fill="#fff" opacity=".7"/><rect x="316" y="81" width="3" height="4" fill="#fff" opacity=".7"/><rect x="323" y="81" width="3" height="4" fill="#fff" opacity=".7"/><rect x="330" y="81" width="3" height="4" fill="#fff" opacity=".7"/><rect x="337" y="81" width="3" height="4" fill="#fff" opacity=".7"/><rect x="316" y="90" width="3" height="4" fill="#fff" opacity=".7"/><rect x="323" y="90" width="3" height="4" fill="#fff" opacity=".7"/><rect x="330" y="90" width="3" height="4" fill="#fff" opacity=".7"/><rect x="337" y="90" width="3" height="4" fill="#fff" opacity=".7"/><rect x="316" y="99" width="3" height="4" fill="#fff" opacity=".7"/><rect x="323" y="99" width="3" height="4" fill="#fff" opacity=".7"/><rect x="330" y="99" width="3" height="4" fill="#fff" opacity=".7"/><rect x="337" y="99" width="3" height="4" fill="#fff" opacity=".7"/><rect x="316" y="108" width="3" height="4" fill="#fff" opacity=".7"/><rect x="323" y="108" width="3" height="4" fill="#fff" opacity=".7"/><rect x="330" y="108" width="3" height="4" fill="#fff" opacity=".7"/><rect x="337" y="108" width="3" height="4" fill="#fff" opacity=".7"/><rect x="316" y="117" width="3" height="4" fill="#fff" opacity=".7"/><rect x="323" y="117" width="3" height="4" fill="#fff" opacity=".7"/><rect x="330" y="117" width="3" height="4" fill="#fff" opacity=".7"/><rect x="337" y="117" width="3" height="4" fill="#fff" opacity=".7"/><rect x="316" y="126" width="3" height="4" fill="#fff" opacity=".7"/><rect x="323" y="126" width="3" height="4" fill="#fff" opacity=".7"/><rect x="330" y="126" width="3" height="4" fill="#fff" opacity=".7"/><rect x="337" y="126" width="3" height="4" fill="#fff" opacity=".7"/><rect x="316" y="135" width="3" height="4" fill="#fff" opacity=".7"/><rect x="323" y="135" width="3" height="4" fill="#fff" opacity=".7"/><rect x="330" y="135" width="3" height="4" fill="#fff" opacity=".7"/><rect x="337" y="135" width="3" height="4" fill="#fff" opacity=".7"/><rect x="316" y="144" width="3" height="4" fill="#fff" opacity=".7"/><rect x="323" y="144" width="3" height="4" fill="#fff" opacity=".7"/><rect x="330" y="144" width="3" height="4" fill="#fff" opacity=".7"/><rect x="337" y="144" width="3" height="4" fill="#fff" opacity=".7"/><rect x="346" y="62" width="32" height="88" fill="#e3edf3"/><rect x="350" y="68" width="3" height="4" fill="#fff" opacity=".7"/><rect x="357" y="68" width="3" height="4" fill="#fff" opacity=".7"/><rect x="364" y="68" width="3" height="4" fill="#fff" opacity=".7"/><rect x="371" y="68" width="3" height="4" fill="#fff" opacity=".7"/><rect x="350" y="77" width="3" height="4" fill="#fff" opacity=".7"/><rect x="357" y="77" width="3" height="4" fill="#fff" opacity=".7"/><rect x="364" y="77" width="3" height="4" fill="#fff" opacity=".7"/><rect x="371" y="77" width="3" height="4" fill="#fff" opacity=".7"/><rect x="350" y="86" width="3" height="4" fill="#fff" opacity=".7"/><rect x="357" y="86" width="3" height="4" fill="#fff" opacity=".7"/><rect x="364" y="86" width="3" height="4" fill="#fff" opacity=".7"/><rect x="371" y="86" width="3" height="4" fill="#fff" opacity=".7"/><rect x="350" y="95" width="3" height="4" fill="#fff" opacity=".7"/><rect x="357" y="95" width="3" height="4" fill="#fff" opacity=".7"/><rect x="364" y="95" width="3" height="4" fill="#fff" opacity=".7"/><rect x="371" y="95" width="3" height="4" fill="#fff" opacity=".7"/><rect x="350" y="104" width="3" height="4" fill="#fff" opacity=".7"/><rect x="357" y="104" width="3" height="4" fill="#fff" opacity=".7"/><rect x="364" y="104" width="3" height="4" fill="#fff" opacity=".7"/><rect x="371" y="104" width="3" height="4" fill="#fff" opacity=".7"/><rect x="350" y="113" width="3" height="4" fill="#fff" opacity=".7"/><rect x="357" y="113" width="3" height="4" fill="#fff" opacity=".7"/><rect x="364" y="113" width="3" height="4" fill="#fff" opacity=".7"/><rect x="371" y="113" width="3" height="4" fill="#fff" opacity=".7"/><rect x="350" y="122" width="3" height="4" fill="#fff" opacity=".7"/><rect x="357" y="122" width="3" height="4" fill="#fff" opacity=".7"/><rect x="364" y="122" width="3" height="4" fill="#fff" opacity=".7"/><rect x="371" y="122" width="3" height="4" fill="#fff" opacity=".7"/><rect x="350" y="131" width="3" height="4" fill="#fff" opacity=".7"/><rect x="357" y="131" width="3" height="4" fill="#fff" opacity=".7"/><rect x="364" y="131" width="3" height="4" fill="#fff" opacity=".7"/><rect x="371" y="131" width="3" height="4" fill="#fff" opacity=".7"/><rect x="350" y="140" width="3" height="4" fill="#fff" opacity=".7"/><rect x="357" y="140" width="3" height="4" fill="#fff" opacity=".7"/><rect x="364" y="140" width="3" height="4" fill="#fff" opacity=".7"/><rect x="371" y="140" width="3" height="4" fill="#fff" opacity=".7"/><rect x="380" y="97" width="21" height="53" fill="#c9dbe8"/><rect x="384" y="103" width="3" height="4" fill="#fff" opacity=".7"/><rect x="391" y="103" width="3" height="4" fill="#fff" opacity=".7"/><rect x="384" y="112" width="3" height="4" fill="#fff" opacity=".7"/><rect x="391" y="112" width="3" height="4" fill="#fff" opacity=".7"/><rect x="384" y="121" width="3" height="4" fill="#fff" opacity=".7"/><rect x="391" y="121" width="3" height="4" fill="#fff" opacity=".7"/><rect x="384" y="130" width="3" height="4" fill="#fff" opacity=".7"/><rect x="391" y="130" width="3" height="4" fill="#fff" opacity=".7"/><rect x="384" y="139" width="3" height="4" fill="#fff" opacity=".7"/><rect x="391" y="139" width="3" height="4" fill="#fff" opacity=".7"/><rect x="401" y="82" width="32" height="68" fill="#bcd2e2"/><rect x="405" y="88" width="3" height="4" fill="#fff" opacity=".7"/><rect x="412" y="88" width="3" height="4" fill="#fff" opacity=".7"/><rect x="419" y="88" width="3" height="4" fill="#fff" opacity=".7"/><rect x="426" y="88" width="3" height="4" fill="#fff" opacity=".7"/><rect x="405" y="97" width="3" height="4" fill="#fff" opacity=".7"/><rect x="412" y="97" width="3" height="4" fill="#fff" opacity=".7"/><rect x="419" y="97" width="3" height="4" fill="#fff" opacity=".7"/><rect x="426" y="97" width="3" height="4" fill="#fff" opacity=".7"/><rect x="405" y="106" width="3" height="4" fill="#fff" opacity=".7"/><rect x="412" y="106" width="3" height="4" fill="#fff" opacity=".7"/><rect x="419" y="106" width="3" height="4" fill="#fff" opacity=".7"/><rect x="426" y="106" width="3" height="4" fill="#fff" opacity=".7"/><rect x="405" y="115" width="3" height="4" fill="#fff" opacity=".7"/><rect x="412" y="115" width="3" height="4" fill="#fff" opacity=".7"/><rect x="419" y="115" width="3" height="4" fill="#fff" opacity=".7"/><rect x="426" y="115" width="3" height="4" fill="#fff" opacity=".7"/><rect x="405" y="124" width="3" height="4" fill="#fff" opacity=".7"/><rect x="412" y="124" width="3" height="4" fill="#fff" opacity=".7"/><rect x="419" y="124" width="3" height="4" fill="#fff" opacity=".7"/><rect x="426" y="124" width="3" height="4" fill="#fff" opacity=".7"/><rect x="405" y="133" width="3" height="4" fill="#fff" opacity=".7"/><rect x="412" y="133" width="3" height="4" fill="#fff" opacity=".7"/><rect x="419" y="133" width="3" height="4" fill="#fff" opacity=".7"/><rect x="426" y="133" width="3" height="4" fill="#fff" opacity=".7"/><rect x="405" y="142" width="3" height="4" fill="#fff" opacity=".7"/><rect x="412" y="142" width="3" height="4" fill="#fff" opacity=".7"/><rect x="419" y="142" width="3" height="4" fill="#fff" opacity=".7"/><rect x="426" y="142" width="3" height="4" fill="#fff" opacity=".7"/><rect x="435" y="84" width="28" height="66" fill="#d9e6ef"/><rect x="439" y="90" width="3" height="4" fill="#fff" opacity=".7"/><rect x="446" y="90" width="3" height="4" fill="#fff" opacity=".7"/><rect x="453" y="90" width="3" height="4" fill="#fff" opacity=".7"/><rect x="439" y="99" width="3" height="4" fill="#fff" opacity=".7"/><rect x="446" y="99" width="3" height="4" fill="#fff" opacity=".7"/><rect x="453" y="99" width="3" height="4" fill="#fff" opacity=".7"/><rect x="439" y="108" width="3" height="4" fill="#fff" opacity=".7"/><rect x="446" y="108" width="3" height="4" fill="#fff" opacity=".7"/><rect x="453" y="108" width="3" height="4" fill="#fff" opacity=".7"/><rect x="439" y="117" width="3" height="4" fill="#fff" opacity=".7"/><rect x="446" y="117" width="3" height="4" fill="#fff" opacity=".7"/><rect x="453" y="117" width="3" height="4" fill="#fff" opacity=".7"/><rect x="439" y="126" width="3" height="4" fill="#fff" opacity=".7"/><rect x="446" y="126" width="3" height="4" fill="#fff" opacity=".7"/><rect x="453" y="126" width="3" height="4" fill="#fff" opacity=".7"/><rect x="439" y="135" width="3" height="4" fill="#fff" opacity=".7"/><rect x="446" y="135" width="3" height="4" fill="#fff" opacity=".7"/><rect x="453" y="135" width="3" height="4" fill="#fff" opacity=".7"/><rect x="439" y="144" width="3" height="4" fill="#fff" opacity=".7"/><rect x="446" y="144" width="3" height="4" fill="#fff" opacity=".7"/><rect x="453" y="144" width="3" height="4" fill="#fff" opacity=".7"/><rect x="463" y="67" width="30" height="83" fill="#c9dbe8"/><rect x="467" y="73" width="3" height="4" fill="#fff" opacity=".7"/><rect x="474" y="73" width="3" height="4" fill="#fff" opacity=".7"/><rect x="481" y="73" width="3" height="4" fill="#fff" opacity=".7"/><rect x="488" y="73" width="3" height="4" fill="#fff" opacity=".7"/><rect x="467" y="82" width="3" height="4" fill="#fff" opacity=".7"/><rect x="474" y="82" width="3" height="4" fill="#fff" opacity=".7"/><rect x="481" y="82" width="3" height="4" fill="#fff" opacity=".7"/><rect x="488" y="82" width="3" height="4" fill="#fff" opacity=".7"/><rect x="467" y="91" width="3" height="4" fill="#fff" opacity=".7"/><rect x="474" y="91" width="3" height="4" fill="#fff" opacity=".7"/><rect x="481" y="91" width="3" height="4" fill="#fff" opacity=".7"/><rect x="488" y="91" width="3" height="4" fill="#fff" opacity=".7"/><rect x="467" y="100" width="3" height="4" fill="#fff" opacity=".7"/><rect x="474" y="100" width="3" height="4" fill="#fff" opacity=".7"/><rect x="481" y="100" width="3" height="4" fill="#fff" opacity=".7"/><rect x="488" y="100" width="3" height="4" fill="#fff" opacity=".7"/><rect x="467" y="109" width="3" height="4" fill="#fff" opacity=".7"/><rect x="474" y="109" width="3" height="4" fill="#fff" opacity=".7"/><rect x="481" y="109" width="3" height="4" fill="#fff" opacity=".7"/><rect x="488" y="109" width="3" height="4" fill="#fff" opacity=".7"/><rect x="467" y="118" width="3" height="4" fill="#fff" opacity=".7"/><rect x="474" y="118" width="3" height="4" fill="#fff" opacity=".7"/><rect x="481" y="118" width="3" height="4" fill="#fff" opacity=".7"/><rect x="488" y="118" width="3" height="4" fill="#fff" opacity=".7"/><rect x="467" y="127" width="3" height="4" fill="#fff" opacity=".7"/><rect x="474" y="127" width="3" height="4" fill="#fff" opacity=".7"/><rect x="481" y="127" width="3" height="4" fill="#fff" opacity=".7"/><rect x="488" y="127" width="3" height="4" fill="#fff" opacity=".7"/><rect x="467" y="136" width="3" height="4" fill="#fff" opacity=".7"/><rect x="474" y="136" width="3" height="4" fill="#fff" opacity=".7"/><rect x="481" y="136" width="3" height="4" fill="#fff" opacity=".7"/><rect x="488" y="136" width="3" height="4" fill="#fff" opacity=".7"/><rect x="467" y="145" width="3" height="4" fill="#fff" opacity=".7"/><rect x="474" y="145" width="3" height="4" fill="#fff" opacity=".7"/><rect x="481" y="145" width="3" height="4" fill="#fff" opacity=".7"/><rect x="488" y="145" width="3" height="4" fill="#fff" opacity=".7"/><rect x="495" y="58" width="18" height="92" fill="#bcd2e2"/><rect x="499" y="64" width="3" height="4" fill="#fff" opacity=".7"/><rect x="506" y="64" width="3" height="4" fill="#fff" opacity=".7"/><rect x="499" y="73" width="3" height="4" fill="#fff" opacity=".7"/><rect x="506" y="73" width="3" height="4" fill="#fff" opacity=".7"/><rect x="499" y="82" width="3" height="4" fill="#fff" opacity=".7"/><rect x="506" y="82" width="3" height="4" fill="#fff" opacity=".7"/><rect x="499" y="91" width="3" height="4" fill="#fff" opacity=".7"/><rect x="506" y="91" width="3" height="4" fill="#fff" opacity=".7"/><rect x="499" y="100" width="3" height="4" fill="#fff" opacity=".7"/><rect x="506" y="100" width="3" height="4" fill="#fff" opacity=".7"/><rect x="499" y="109" width="3" height="4" fill="#fff" opacity=".7"/><rect x="506" y="109" width="3" height="4" fill="#fff" opacity=".7"/><rect x="499" y="118" width="3" height="4" fill="#fff" opacity=".7"/><rect x="506" y="118" width="3" height="4" fill="#fff" opacity=".7"/><rect x="499" y="127" width="3" height="4" fill="#fff" opacity=".7"/><rect x="506" y="127" width="3" height="4" fill="#fff" opacity=".7"/><rect x="499" y="136" width="3" height="4" fill="#fff" opacity=".7"/><rect x="506" y="136" width="3" height="4" fill="#fff" opacity=".7"/><rect x="499" y="145" width="3" height="4" fill="#fff" opacity=".7"/><rect x="506" y="145" width="3" height="4" fill="#fff" opacity=".7"/><rect x="513" y="49" width="16" height="101" fill="#e3edf3"/><rect x="517" y="55" width="3" height="4" fill="#fff" opacity=".7"/><rect x="524" y="55" width="3" height="4" fill="#fff" opacity=".7"/><rect x="517" y="64" width="3" height="4" fill="#fff" opacity=".7"/><rect x="524" y="64" width="3" height="4" fill="#fff" opacity=".7"/><rect x="517" y="73" width="3" height="4" fill="#fff" opacity=".7"/><rect x="524" y="73" width="3" height="4" fill="#fff" opacity=".7"/><rect x="517" y="82" width="3" height="4" fill="#fff" opacity=".7"/><rect x="524" y="82" width="3" height="4" fill="#fff" opacity=".7"/><rect x="517" y="91" width="3" height="4" fill="#fff" opacity=".7"/><rect x="524" y="91" width="3" height="4" fill="#fff" opacity=".7"/><rect x="517" y="100" width="3" height="4" fill="#fff" opacity=".7"/><rect x="524" y="100" width="3" height="4" fill="#fff" opacity=".7"/><rect x="517" y="109" width="3" height="4" fill="#fff" opacity=".7"/><rect x="524" y="109" width="3" height="4" fill="#fff" opacity=".7"/><rect x="517" y="118" width="3" height="4" fill="#fff" opacity=".7"/><rect x="524" y="118" width="3" height="4" fill="#fff" opacity=".7"/><rect x="517" y="127" width="3" height="4" fill="#fff" opacity=".7"/><rect x="524" y="127" width="3" height="4" fill="#fff" opacity=".7"/><rect x="517" y="136" width="3" height="4" fill="#fff" opacity=".7"/><rect x="524" y="136" width="3" height="4" fill="#fff" opacity=".7"/><rect x="517" y="145" width="3" height="4" fill="#fff" opacity=".7"/><rect x="524" y="145" width="3" height="4" fill="#fff" opacity=".7"/><rect x="531" y="44" width="25" height="106" fill="#bcd2e2"/><rect x="535" y="50" width="3" height="4" fill="#fff" opacity=".7"/><rect x="542" y="50" width="3" height="4" fill="#fff" opacity=".7"/><rect x="549" y="50" width="3" height="4" fill="#fff" opacity=".7"/><rect x="535" y="59" width="3" height="4" fill="#fff" opacity=".7"/><rect x="542" y="59" width="3" height="4" fill="#fff" opacity=".7"/><rect x="549" y="59" width="3" height="4" fill="#fff" opacity=".7"/><rect x="535" y="68" width="3" height="4" fill="#fff" opacity=".7"/><rect x="542" y="68" width="3" height="4" fill="#fff" opacity=".7"/><rect x="549" y="68" width="3" height="4" fill="#fff" opacity=".7"/><rect x="535" y="77" width="3" height="4" fill="#fff" opacity=".7"/><rect x="542" y="77" width="3" height="4" fill="#fff" opacity=".7"/><rect x="549" y="77" width="3" height="4" fill="#fff" opacity=".7"/><rect x="535" y="86" width="3" height="4" fill="#fff" opacity=".7"/><rect x="542" y="86" width="3" height="4" fill="#fff" opacity=".7"/><rect x="549" y="86" width="3" height="4" fill="#fff" opacity=".7"/><rect x="535" y="95" width="3" height="4" fill="#fff" opacity=".7"/><rect x="542" y="95" width="3" height="4" fill="#fff" opacity=".7"/><rect x="549" y="95" width="3" height="4" fill="#fff" opacity=".7"/><rect x="535" y="104" width="3" height="4" fill="#fff" opacity=".7"/><rect x="542" y="104" width="3" height="4" fill="#fff" opacity=".7"/><rect x="549" y="104" width="3" height="4" fill="#fff" opacity=".7"/><rect x="535" y="113" width="3" height="4" fill="#fff" opacity=".7"/><rect x="542" y="113" width="3" height="4" fill="#fff" opacity=".7"/><rect x="549" y="113" width="3" height="4" fill="#fff" opacity=".7"/><rect x="535" y="122" width="3" height="4" fill="#fff" opacity=".7"/><rect x="542" y="122" width="3" height="4" fill="#fff" opacity=".7"/><rect x="549" y="122" width="3" height="4" fill="#fff" opacity=".7"/><rect x="535" y="131" width="3" height="4" fill="#fff" opacity=".7"/><rect x="542" y="131" width="3" height="4" fill="#fff" opacity=".7"/><rect x="549" y="131" width="3" height="4" fill="#fff" opacity=".7"/><rect x="535" y="140" width="3" height="4" fill="#fff" opacity=".7"/><rect x="542" y="140" width="3" height="4" fill="#fff" opacity=".7"/><rect x="549" y="140" width="3" height="4" fill="#fff" opacity=".7"/><rect x="560" y="112" width="28" height="38" fill="#d9e6ef"/><rect x="564" y="118" width="3" height="4" fill="#fff" opacity=".7"/><rect x="571" y="118" width="3" height="4" fill="#fff" opacity=".7"/><rect x="578" y="118" width="3" height="4" fill="#fff" opacity=".7"/><rect x="564" y="127" width="3" height="4" fill="#fff" opacity=".7"/><rect x="571" y="127" width="3" height="4" fill="#fff" opacity=".7"/><rect x="578" y="127" width="3" height="4" fill="#fff" opacity=".7"/><rect x="564" y="136" width="3" height="4" fill="#fff" opacity=".7"/><rect x="571" y="136" width="3" height="4" fill="#fff" opacity=".7"/><rect x="578" y="136" width="3" height="4" fill="#fff" opacity=".7"/><rect x="564" y="145" width="3" height="4" fill="#fff" opacity=".7"/><rect x="571" y="145" width="3" height="4" fill="#fff" opacity=".7"/><rect x="578" y="145" width="3" height="4" fill="#fff" opacity=".7"/><rect x="590" y="31" width="29" height="119" fill="#d9e6ef"/><rect x="594" y="37" width="3" height="4" fill="#fff" opacity=".7"/><rect x="601" y="37" width="3" height="4" fill="#fff" opacity=".7"/><rect x="608" y="37" width="3" height="4" fill="#fff" opacity=".7"/><rect x="594" y="46" width="3" height="4" fill="#fff" opacity=".7"/><rect x="601" y="46" width="3" height="4" fill="#fff" opacity=".7"/><rect x="608" y="46" width="3" height="4" fill="#fff" opacity=".7"/><rect x="594" y="55" width="3" height="4" fill="#fff" opacity=".7"/><rect x="601" y="55" width="3" height="4" fill="#fff" opacity=".7"/><rect x="608" y="55" width="3" height="4" fill="#fff" opacity=".7"/><rect x="594" y="64" width="3" height="4" fill="#fff" opacity=".7"/><rect x="601" y="64" width="3" height="4" fill="#fff" opacity=".7"/><rect x="608" y="64" width="3" height="4" fill="#fff" opacity=".7"/><rect x="594" y="73" width="3" height="4" fill="#fff" opacity=".7"/><rect x="601" y="73" width="3" height="4" fill="#fff" opacity=".7"/><rect x="608" y="73" width="3" height="4" fill="#fff" opacity=".7"/><rect x="594" y="82" width="3" height="4" fill="#fff" opacity=".7"/><rect x="601" y="82" width="3" height="4" fill="#fff" opacity=".7"/><rect x="608" y="82" width="3" height="4" fill="#fff" opacity=".7"/><rect x="594" y="91" width="3" height="4" fill="#fff" opacity=".7"/><rect x="601" y="91" width="3" height="4" fill="#fff" opacity=".7"/><rect x="608" y="91" width="3" height="4" fill="#fff" opacity=".7"/><rect x="594" y="100" width="3" height="4" fill="#fff" opacity=".7"/><rect x="601" y="100" width="3" height="4" fill="#fff" opacity=".7"/><rect x="608" y="100" width="3" height="4" fill="#fff" opacity=".7"/><rect x="594" y="109" width="3" height="4" fill="#fff" opacity=".7"/><rect x="601" y="109" width="3" height="4" fill="#fff" opacity=".7"/><rect x="608" y="109" width="3" height="4" fill="#fff" opacity=".7"/><rect x="594" y="118" width="3" height="4" fill="#fff" opacity=".7"/><rect x="601" y="118" width="3" height="4" fill="#fff" opacity=".7"/><rect x="608" y="118" width="3" height="4" fill="#fff" opacity=".7"/><rect x="594" y="127" width="3" height="4" fill="#fff" opacity=".7"/><rect x="601" y="127" width="3" height="4" fill="#fff" opacity=".7"/><rect x="608" y="127" width="3" height="4" fill="#fff" opacity=".7"/><rect x="594" y="136" width="3" height="4" fill="#fff" opacity=".7"/><rect x="601" y="136" width="3" height="4" fill="#fff" opacity=".7"/><rect x="608" y="136" width="3" height="4" fill="#fff" opacity=".7"/><rect x="594" y="145" width="3" height="4" fill="#fff" opacity=".7"/><rect x="601" y="145" width="3" height="4" fill="#fff" opacity=".7"/><rect x="608" y="145" width="3" height="4" fill="#fff" opacity=".7"/><rect x="619" y="38" width="23" height="112" fill="#bcd2e2"/><rect x="623" y="44" width="3" height="4" fill="#fff" opacity=".7"/><rect x="630" y="44" width="3" height="4" fill="#fff" opacity=".7"/><rect x="637" y="44" width="3" height="4" fill="#fff" opacity=".7"/><rect x="623" y="53" width="3" height="4" fill="#fff" opacity=".7"/><rect x="630" y="53" width="3" height="4" fill="#fff" opacity=".7"/><rect x="637" y="53" width="3" height="4" fill="#fff" opacity=".7"/><rect x="623" y="62" width="3" height="4" fill="#fff" opacity=".7"/><rect x="630" y="62" width="3" height="4" fill="#fff" opacity=".7"/><rect x="637" y="62" width="3" height="4" fill="#fff" opacity=".7"/><rect x="623" y="71" width="3" height="4" fill="#fff" opacity=".7"/><rect x="630" y="71" width="3" height="4" fill="#fff" opacity=".7"/><rect x="637" y="71" width="3" height="4" fill="#fff" opacity=".7"/><rect x="623" y="80" width="3" height="4" fill="#fff" opacity=".7"/><rect x="630" y="80" width="3" height="4" fill="#fff" opacity=".7"/><rect x="637" y="80" width="3" height="4" fill="#fff" opacity=".7"/><rect x="623" y="89" width="3" height="4" fill="#fff" opacity=".7"/><rect x="630" y="89" width="3" height="4" fill="#fff" opacity=".7"/><rect x="637" y="89" width="3" height="4" fill="#fff" opacity=".7"/><rect x="623" y="98" width="3" height="4" fill="#fff" opacity=".7"/><rect x="630" y="98" width="3" height="4" fill="#fff" opacity=".7"/><rect x="637" y="98" width="3" height="4" fill="#fff" opacity=".7"/><rect x="623" y="107" width="3" height="4" fill="#fff" opacity=".7"/><rect x="630" y="107" width="3" height="4" fill="#fff" opacity=".7"/><rect x="637" y="107" width="3" height="4" fill="#fff" opacity=".7"/><rect x="623" y="116" width="3" height="4" fill="#fff" opacity=".7"/><rect x="630" y="116" width="3" height="4" fill="#fff" opacity=".7"/><rect x="637" y="116" width="3" height="4" fill="#fff" opacity=".7"/><rect x="623" y="125" width="3" height="4" fill="#fff" opacity=".7"/><rect x="630" y="125" width="3" height="4" fill="#fff" opacity=".7"/><rect x="637" y="125" width="3" height="4" fill="#fff" opacity=".7"/><rect x="623" y="134" width="3" height="4" fill="#fff" opacity=".7"/><rect x="630" y="134" width="3" height="4" fill="#fff" opacity=".7"/><rect x="637" y="134" width="3" height="4" fill="#fff" opacity=".7"/><rect x="623" y="143" width="3" height="4" fill="#fff" opacity=".7"/><rect x="630" y="143" width="3" height="4" fill="#fff" opacity=".7"/><rect x="637" y="143" width="3" height="4" fill="#fff" opacity=".7"/><rect x="644" y="35" width="26" height="115" fill="#e3edf3"/><rect x="648" y="41" width="3" height="4" fill="#fff" opacity=".7"/><rect x="655" y="41" width="3" height="4" fill="#fff" opacity=".7"/><rect x="662" y="41" width="3" height="4" fill="#fff" opacity=".7"/><rect x="648" y="50" width="3" height="4" fill="#fff" opacity=".7"/><rect x="655" y="50" width="3" height="4" fill="#fff" opacity=".7"/><rect x="662" y="50" width="3" height="4" fill="#fff" opacity=".7"/><rect x="648" y="59" width="3" height="4" fill="#fff" opacity=".7"/><rect x="655" y="59" width="3" height="4" fill="#fff" opacity=".7"/><rect x="662" y="59" width="3" height="4" fill="#fff" opacity=".7"/><rect x="648" y="68" width="3" height="4" fill="#fff" opacity=".7"/><rect x="655" y="68" width="3" height="4" fill="#fff" opacity=".7"/><rect x="662" y="68" width="3" height="4" fill="#fff" opacity=".7"/><rect x="648" y="77" width="3" height="4" fill="#fff" opacity=".7"/><rect x="655" y="77" width="3" height="4" fill="#fff" opacity=".7"/><rect x="662" y="77" width="3" height="4" fill="#fff" opacity=".7"/><rect x="648" y="86" width="3" height="4" fill="#fff" opacity=".7"/><rect x="655" y="86" width="3" height="4" fill="#fff" opacity=".7"/><rect x="662" y="86" width="3" height="4" fill="#fff" opacity=".7"/><rect x="648" y="95" width="3" height="4" fill="#fff" opacity=".7"/><rect x="655" y="95" width="3" height="4" fill="#fff" opacity=".7"/><rect x="662" y="95" width="3" height="4" fill="#fff" opacity=".7"/><rect x="648" y="104" width="3" height="4" fill="#fff" opacity=".7"/><rect x="655" y="104" width="3" height="4" fill="#fff" opacity=".7"/><rect x="662" y="104" width="3" height="4" fill="#fff" opacity=".7"/><rect x="648" y="113" width="3" height="4" fill="#fff" opacity=".7"/><rect x="655" y="113" width="3" height="4" fill="#fff" opacity=".7"/><rect x="662" y="113" width="3" height="4" fill="#fff" opacity=".7"/><rect x="648" y="122" width="3" height="4" fill="#fff" opacity=".7"/><rect x="655" y="122" width="3" height="4" fill="#fff" opacity=".7"/><rect x="662" y="122" width="3" height="4" fill="#fff" opacity=".7"/><rect x="648" y="131" width="3" height="4" fill="#fff" opacity=".7"/><rect x="655" y="131" width="3" height="4" fill="#fff" opacity=".7"/><rect x="662" y="131" width="3" height="4" fill="#fff" opacity=".7"/><rect x="648" y="140" width="3" height="4" fill="#fff" opacity=".7"/><rect x="655" y="140" width="3" height="4" fill="#fff" opacity=".7"/><rect x="662" y="140" width="3" height="4" fill="#fff" opacity=".7"/><rect x="670" y="75" width="28" height="75" fill="#c9dbe8"/><rect x="674" y="81" width="3" height="4" fill="#fff" opacity=".7"/><rect x="681" y="81" width="3" height="4" fill="#fff" opacity=".7"/><rect x="688" y="81" width="3" height="4" fill="#fff" opacity=".7"/><rect x="674" y="90" width="3" height="4" fill="#fff" opacity=".7"/><rect x="681" y="90" width="3" height="4" fill="#fff" opacity=".7"/><rect x="688" y="90" width="3" height="4" fill="#fff" opacity=".7"/><rect x="674" y="99" width="3" height="4" fill="#fff" opacity=".7"/><rect x="681" y="99" width="3" height="4" fill="#fff" opacity=".7"/><rect x="688" y="99" width="3" height="4" fill="#fff" opacity=".7"/><rect x="674" y="108" width="3" height="4" fill="#fff" opacity=".7"/><rect x="681" y="108" width="3" height="4" fill="#fff" opacity=".7"/><rect x="688" y="108" width="3" height="4" fill="#fff" opacity=".7"/><rect x="674" y="117" width="3" height="4" fill="#fff" opacity=".7"/><rect x="681" y="117" width="3" height="4" fill="#fff" opacity=".7"/><rect x="688" y="117" width="3" height="4" fill="#fff" opacity=".7"/><rect x="674" y="126" width="3" height="4" fill="#fff" opacity=".7"/><rect x="681" y="126" width="3" height="4" fill="#fff" opacity=".7"/><rect x="688" y="126" width="3" height="4" fill="#fff" opacity=".7"/><rect x="674" y="135" width="3" height="4" fill="#fff" opacity=".7"/><rect x="681" y="135" width="3" height="4" fill="#fff" opacity=".7"/><rect x="688" y="135" width="3" height="4" fill="#fff" opacity=".7"/><rect x="674" y="144" width="3" height="4" fill="#fff" opacity=".7"/><rect x="681" y="144" width="3" height="4" fill="#fff" opacity=".7"/><rect x="688" y="144" width="3" height="4" fill="#fff" opacity=".7"/><rect x="702" y="57" width="17" height="93" fill="#d9e6ef"/><rect x="706" y="63" width="3" height="4" fill="#fff" opacity=".7"/><rect x="713" y="63" width="3" height="4" fill="#fff" opacity=".7"/><rect x="706" y="72" width="3" height="4" fill="#fff" opacity=".7"/><rect x="713" y="72" width="3" height="4" fill="#fff" opacity=".7"/><rect x="706" y="81" width="3" height="4" fill="#fff" opacity=".7"/><rect x="713" y="81" width="3" height="4" fill="#fff" opacity=".7"/><rect x="706" y="90" width="3" height="4" fill="#fff" opacity=".7"/><rect x="713" y="90" width="3" height="4" fill="#fff" opacity=".7"/><rect x="706" y="99" width="3" height="4" fill="#fff" opacity=".7"/><rect x="713" y="99" width="3" height="4" fill="#fff" opacity=".7"/><rect x="706" y="108" width="3" height="4" fill="#fff" opacity=".7"/><rect x="713" y="108" width="3" height="4" fill="#fff" opacity=".7"/><rect x="706" y="117" width="3" height="4" fill="#fff" opacity=".7"/><rect x="713" y="117" width="3" height="4" fill="#fff" opacity=".7"/><rect x="706" y="126" width="3" height="4" fill="#fff" opacity=".7"/><rect x="713" y="126" width="3" height="4" fill="#fff" opacity=".7"/><rect x="706" y="135" width="3" height="4" fill="#fff" opacity=".7"/><rect x="713" y="135" width="3" height="4" fill="#fff" opacity=".7"/><rect x="706" y="144" width="3" height="4" fill="#fff" opacity=".7"/><rect x="713" y="144" width="3" height="4" fill="#fff" opacity=".7"/><rect x="720" y="104" width="23" height="46" fill="#c9dbe8"/><rect x="724" y="110" width="3" height="4" fill="#fff" opacity=".7"/><rect x="731" y="110" width="3" height="4" fill="#fff" opacity=".7"/><rect x="738" y="110" width="3" height="4" fill="#fff" opacity=".7"/><rect x="724" y="119" width="3" height="4" fill="#fff" opacity=".7"/><rect x="731" y="119" width="3" height="4" fill="#fff" opacity=".7"/><rect x="738" y="119" width="3" height="4" fill="#fff" opacity=".7"/><rect x="724" y="128" width="3" height="4" fill="#fff" opacity=".7"/><rect x="731" y="128" width="3" height="4" fill="#fff" opacity=".7"/><rect x="738" y="128" width="3" height="4" fill="#fff" opacity=".7"/><rect x="724" y="137" width="3" height="4" fill="#fff" opacity=".7"/><rect x="731" y="137" width="3" height="4" fill="#fff" opacity=".7"/><rect x="738" y="137" width="3" height="4" fill="#fff" opacity=".7"/><circle cx="10" cy="140" r="9" fill="#2f9e4f" opacity=".85"/><rect x="9" y="142" width="2" height="8" fill="#1f6e36"/><circle cx="56" cy="140" r="9" fill="#2f9e4f" opacity=".85"/><rect x="55" y="142" width="2" height="8" fill="#1f6e36"/><circle cx="102" cy="140" r="6" fill="#2f9e4f" opacity=".85"/><rect x="101" y="142" width="2" height="8" fill="#1f6e36"/><circle cx="148" cy="140" r="7" fill="#2f9e4f" opacity=".85"/><rect x="147" y="142" width="2" height="8" fill="#1f6e36"/><circle cx="194" cy="140" r="9" fill="#2f9e4f" opacity=".85"/><rect x="193" y="142" width="2" height="8" fill="#1f6e36"/><circle cx="240" cy="140" r="9" fill="#2f9e4f" opacity=".85"/><rect x="239" y="142" width="2" height="8" fill="#1f6e36"/><circle cx="286" cy="140" r="10" fill="#2f9e4f" opacity=".85"/><rect x="285" y="142" width="2" height="8" fill="#1f6e36"/><circle cx="332" cy="140" r="8" fill="#2f9e4f" opacity=".85"/><rect x="331" y="142" width="2" height="8" fill="#1f6e36"/><circle cx="378" cy="140" r="7" fill="#2f9e4f" opacity=".85"/><rect x="377" y="142" width="2" height="8" fill="#1f6e36"/><circle cx="424" cy="140" r="9" fill="#2f9e4f" opacity=".85"/><rect x="423" y="142" width="2" height="8" fill="#1f6e36"/><circle cx="470" cy="140" r="10" fill="#2f9e4f" opacity=".85"/><rect x="469" y="142" width="2" height="8" fill="#1f6e36"/><circle cx="516" cy="140" r="8" fill="#2f9e4f" opacity=".85"/><rect x="515" y="142" width="2" height="8" fill="#1f6e36"/><circle cx="562" cy="140" r="9" fill="#2f9e4f" opacity=".85"/><rect x="561" y="142" width="2" height="8" fill="#1f6e36"/><circle cx="608" cy="140" r="8" fill="#2f9e4f" opacity=".85"/><rect x="607" y="142" width="2" height="8" fill="#1f6e36"/><circle cx="654" cy="140" r="9" fill="#2f9e4f" opacity=".85"/><rect x="653" y="142" width="2" height="8" fill="#1f6e36"/><circle cx="700" cy="140" r="7" fill="#2f9e4f" opacity=".85"/><rect x="699" y="142" width="2" height="8" fill="#1f6e36"/></svg>`;

const HERO_SVG = `<svg class="bu-hero" width="186" height="186" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
<defs><radialGradient id="buGlobeGrad" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#9fd8f5"/><stop offset=".6" stop-color="#3b8fd0"/><stop offset="1" stop-color="#1b4f8f"/></radialGradient></defs>
<circle cx="100" cy="112" r="78" fill="url(#buGlobeGrad)"/>
<g fill="none" stroke="#ffffff" stroke-opacity=".45" stroke-width="1.2"><ellipse cx="100" cy="112" rx="78" ry="30"/><ellipse cx="100" cy="112" rx="36" ry="78"/><line x1="22" y1="112" x2="178" y2="112"/><line x1="100" y1="34" x2="100" y2="190"/></g>
<path d="M52 92c12-14 30-8 34 4s-10 22-6 34-22 6-30-8-10-18 2-30z" fill="#4cba5a" opacity=".85"/>
<path d="M118 70c14-6 34 4 30 20s-20 14-22 28-18 8-20-6 0-34 12-42z" fill="#4cba5a" opacity=".85"/>
<polygon points="100,18 160,44 100,70 40,44" fill="#1b2f4f"/><path d="M64 56v22c0 8 16 14 36 14s36-6 36-14V56l-36 16z" fill="#2a4770"/>
<line x1="152" y1="47" x2="152" y2="82" stroke="#e3a008" stroke-width="3"/><circle cx="152" cy="86" r="5" fill="#e3a008"/>
<circle cx="168" cy="150" r="14" fill="#ffffff" stroke="#e3a008" stroke-width="3"/><path d="M161 150l5 5 9-10" stroke="#16a34a" stroke-width="3.4" fill="none" stroke-linecap="round"/>
</svg>`;

const SCOPED_REPORT_CSS = `
#bu-pdf-capture-root {
  font-family: 'SarabunX', 'Sarabun', 'Noto Sans Thai', sans-serif;
  color: #25303c;
  font-size: 10.2px;
  line-height: 1.45;
  width: 794px;
  background: #ffffff;
}
#bu-pdf-capture-root * {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  border-color: transparent;
  font-family: 'SarabunX', 'Sarabun', 'Noto Sans Thai', sans-serif;
}
#bu-pdf-capture-root .bu-page {
  width: 794px;
  height: 1123px;
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, #e9f4fb 0%, #f4fafc 42%, #d3efd9 78%, #4fb768 100%);
}
#bu-pdf-capture-root .bu-sky {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 28px;
  width: 794px;
  height: 144px;
  opacity: 0.9;
}
#bu-pdf-capture-root .bu-in {
  position: absolute;
  inset: 0;
  padding: 14px 32px 32px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
#bu-pdf-capture-root .bu-logo {
  display: block;
  height: 38px;
  width: auto;
}
#bu-pdf-capture-root .bu-top {
  position: relative;
  height: 126px;
  overflow: visible;
}
#bu-pdf-capture-root .bu-tt {
  position: absolute;
  left: 0;
  top: 40px;
  width: 515px;
}
#bu-pdf-capture-root .bu-top h1 {
  font-size: 22px;
  line-height: 1.38;
  font-weight: 700;
  color: #1b3a6b;
}
#bu-pdf-capture-root .bu-top h1 em {
  font-style: italic;
  color: #1e6fb8;
}
#bu-pdf-capture-root .bu-hero {
  position: absolute;
  right: 0;
  top: -10px;
  width: 158px;
  height: 158px;
  display: block;
}
#bu-pdf-capture-root .bu-banner {
  display: inline-block;
  align-self: flex-start;
  background: linear-gradient(90deg, #0d6fb8, #2bb7c9);
  color: #ffffff;
  font-weight: 700;
  font-size: 12.6px;
  line-height: 1.48;
  padding: 5px 26px 6px 15px;
  border-radius: 4px 22px 22px 4px;
  box-shadow: 0 3px 6px rgba(13, 111, 184, 0.25);
  max-width: 726px;
  overflow: visible;
}
#bu-pdf-capture-root .bu-ov {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
#bu-pdf-capture-root .bu-tagrow {
  display: grid;
  grid-template-columns: 76px 1fr;
  gap: 9px;
  align-items: start;
}
#bu-pdf-capture-root .bu-tag {
  display: inline-block;
  width: 100%;
  color: #ffffff;
  font-weight: 700;
  font-size: 10.5px;
  line-height: 1.48;
  padding: 3px 8px 4px;
  border-radius: 4px 14px 14px 4px;
  text-align: center;
  overflow: visible;
}
#bu-pdf-capture-root .bu-tag.g {
  background: linear-gradient(90deg, #2f9e4f, #7cc86a);
}
#bu-pdf-capture-root .bu-tag.o {
  background: linear-gradient(90deg, #e8791a, #f5b13c);
}
#bu-pdf-capture-root .bu-txt {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  font-size: 9.5px;
  line-height: 1.44;
  color: #34414f;
  overflow: visible;
}
#bu-pdf-capture-root .bu-txt p {
  display: flex;
  gap: 6px;
  align-items: flex-start;
  overflow: visible;
}
#bu-pdf-capture-root .bu-dot {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #f08a1c;
  margin-top: 5px;
}
#bu-pdf-capture-root .bu-txt.g .bu-dot {
  background: #1e6fb8;
}
#bu-pdf-capture-root .bu-panel {
  background: rgba(255, 255, 255, 0.96);
  border-radius: 13px;
  padding: 7px 12px 8px;
  box-shadow: 0 2px 8px rgba(27, 58, 107, 0.14);
  overflow: visible;
}
#bu-pdf-capture-root .bu-ph {
  display: flex;
  align-items: center;
  gap: 7px;
  font-weight: 700;
  color: #1b3a6b;
  font-size: 11.6px;
  line-height: 1.48;
  margin-bottom: 4px;
  overflow: visible;
}
#bu-pdf-capture-root .bu-diamond {
  width: 10px;
  height: 10px;
  background: #1e6fb8;
  transform: rotate(45deg);
  border-radius: 2px;
  margin-right: 3px;
  flex: none;
}
#bu-pdf-capture-root .bu-ph small {
  font-weight: 400;
  color: #6b7785;
  font-size: 9.2px;
  line-height: 1.45;
  margin-left: auto;
  overflow: visible;
}
#bu-pdf-capture-root .bu-a {
  display: grid;
  grid-template-columns: 126px 1fr;
  gap: 10px;
}
#bu-pdf-capture-root .bu-kp {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
#bu-pdf-capture-root .bu-k {
  border-radius: 8px;
  padding: 6px 9px 7px;
  color: #ffffff;
  background: linear-gradient(135deg, #1e6fb8, #2bb7c9);
  overflow: visible;
}
#bu-pdf-capture-root .bu-k:nth-child(2) {
  background: linear-gradient(135deg, #2f9e4f, #7cc86a);
}
#bu-pdf-capture-root .bu-k:nth-child(3) {
  background: linear-gradient(135deg, #e8791a, #f5b13c);
}
#bu-pdf-capture-root .bu-k .bu-l {
  font-size: 8.8px;
  line-height: 1.45;
  opacity: 0.96;
  overflow: visible;
}
#bu-pdf-capture-root .bu-k .bu-v {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.32;
  overflow: visible;
}
#bu-pdf-capture-root .bu-k .bu-v small {
  font-size: 9.2px;
  font-weight: 400;
  margin-left: 3px;
}
#bu-pdf-capture-root .bu-five {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 7px;
}
#bu-pdf-capture-root .bu-cd {
  border: 1px solid #e1e8ef;
  border-radius: 8px;
  padding: 5px 8px 6px;
  background: #ffffff;
  min-width: 0;
  overflow: visible;
}
#bu-pdf-capture-root .bu-ch {
  font-weight: 700;
  font-size: 9.6px;
  line-height: 1.44;
  color: #1b3a6b;
  margin-bottom: 3.5px;
  overflow: visible;
}
#bu-pdf-capture-root .bu-r {
  display: block;
  margin-bottom: 3.5px;
  overflow: visible;
}
#bu-pdf-capture-root .bu-rt {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 8.2px;
  line-height: 1.44;
  margin-bottom: 2.5px;
  gap: 4px;
  overflow: visible;
}
#bu-pdf-capture-root .bu-rt span {
  display: block;
  line-height: 1.45;
  overflow: visible;
  white-space: nowrap;
}
#bu-pdf-capture-root .bu-rt b {
  color: #1b3a6b;
  flex: none;
  line-height: 1.45;
  overflow: visible;
}
#bu-pdf-capture-root .bu-tr {
  display: block;
  width: 100%;
  height: 5.5px;
  background: #e8eef4;
  border-radius: 999px;
  position: relative;
  overflow: visible;
}
#bu-pdf-capture-root .bu-fl {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #1e6fb8, #2bb7c9);
  border-radius: 999px;
}
#bu-pdf-capture-root .bu-fl.g {
  background: linear-gradient(90deg, #2f9e4f, #7cc86a);
}
#bu-pdf-capture-root .bu-fl.o {
  background: linear-gradient(90deg, #e8791a, #f5b13c);
}
#bu-pdf-capture-root .bu-b2 {
  display: grid;
  grid-template-columns: 1fr 208px;
  gap: 12px;
}
#bu-pdf-capture-root .bu-plot {
  position: relative;
  padding-top: 2px;
  overflow: visible;
}
#bu-pdf-capture-root .bu-legend {
  position: absolute;
  right: 0;
  top: -24px;
  display: flex;
  gap: 11px;
  font-size: 9px;
  line-height: 1.42;
  color: #6b7785;
  overflow: visible;
}
#bu-pdf-capture-root .bu-legend i {
  display: inline-block;
  width: 11px;
  height: 8px;
  border-radius: 2px;
  margin-right: 4px;
  vertical-align: -1px;
}
#bu-pdf-capture-root .bu-chart {
  display: flex;
  align-items: flex-end;
  height: 192px;
  gap: 2px;
  padding-top: 8px;
}
#bu-pdf-capture-root .bu-grp {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  height: 100%;
  min-width: 0;
}
#bu-pdf-capture-root .bu-bars {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 2px;
  flex: 1;
  min-height: 0;
  border-bottom: 1.5px solid #b9c7d6;
}
#bu-pdf-capture-root .bu-bw {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  width: 16px;
  height: 100%;
}
#bu-pdf-capture-root .bu-bw .bu-val {
  font-size: 7.3px;
  line-height: 1.38;
  font-weight: 600;
  color: #6b7785;
  margin-bottom: 3px;
  white-space: nowrap;
  overflow: visible;
}
#bu-pdf-capture-root .bu-bw .bu-val.hi {
  color: #1b3a6b;
  font-weight: 700;
}
#bu-pdf-capture-root .bu-bl {
  font-size: 7.4px;
  line-height: 1.34;
  text-align: center;
  color: #34414f;
  padding: 4px 1px 2px;
  min-height: 44px;
  height: auto;
  overflow: visible;
}
#bu-pdf-capture-root .bu-bl i {
  display: block;
  font-style: normal;
  font-weight: 700;
  color: #ffffff;
  background: #1b3a6b;
  border-radius: 50%;
  width: 12px;
  height: 12px;
  line-height: 12px;
  font-size: 7px;
  margin: 0 auto 2px;
}
#bu-pdf-capture-root .bu-side {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
#bu-pdf-capture-root .bu-gauge {
  display: flex;
  gap: 10px;
  align-items: center;
  border: 1px solid #e1e8ef;
  border-radius: 8px;
  padding: 7px 10px;
  background: linear-gradient(135deg, #ffffff, #f0f8ff);
  overflow: visible;
}
#bu-pdf-capture-root .bu-gauge .bu-t {
  font-size: 9.8px;
  line-height: 1.44;
  font-weight: 700;
  color: #1b3a6b;
  overflow: visible;
}
#bu-pdf-capture-root .bu-gauge .bu-s {
  font-size: 8.6px;
  line-height: 1.44;
  color: #6b7785;
  overflow: visible;
}
#bu-pdf-capture-root .bu-chips {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
#bu-pdf-capture-root .bu-chip {
  display: flex;
  gap: 6px;
  align-items: center;
  border: 1px solid #e1e8ef;
  border-radius: 8px;
  padding: 6px 7px;
  background: #ffffff;
  min-width: 0;
  overflow: visible;
}
#bu-pdf-capture-root .bu-ci {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}
#bu-pdf-capture-root .bu-ci svg {
  width: 13px;
  height: 13px;
}
#bu-pdf-capture-root .bu-cl {
  font-size: 7.6px;
  color: #6b7785;
  line-height: 1.42;
  white-space: nowrap;
  overflow: visible;
}
#bu-pdf-capture-root .bu-cv {
  font-size: 10.6px;
  font-weight: 700;
  color: #1b3a6b;
  line-height: 1.38;
  overflow: visible;
}
#bu-pdf-capture-root .bu-c3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
#bu-pdf-capture-root .bu-cd.q .bu-qb {
  border: 1px dashed #b3c0cf;
  border-radius: 6px;
  padding: 4px 6px;
  font-size: 8.3px;
  color: #6b7785;
  margin-top: 4px;
  line-height: 1.42;
  overflow: visible;
}
#bu-pdf-capture-root .bu-tg {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  overflow: visible;
}
#bu-pdf-capture-root .bu-tg span {
  display: inline-block;
  background: #d8e6f6;
  color: #1b3a6b;
  border-radius: 7px;
  padding: 2px 7px;
  font-size: 8.2px;
  line-height: 1.44;
  white-space: nowrap;
  overflow: visible;
}
#bu-pdf-capture-root .bu-tg b {
  color: #1e6fb8;
  margin-left: 3px;
}
#bu-pdf-capture-root .bu-mini {
  display: flex;
  gap: 9px;
  align-items: center;
  margin-top: 3px;
  overflow: visible;
}
#bu-pdf-capture-root .bu-mini .bu-tx {
  font-size: 8.5px;
  line-height: 1.44;
  overflow: visible;
}
#bu-pdf-capture-root .bu-mini b {
  color: #1b3a6b;
  font-size: 11px;
  line-height: 1.38;
}
#bu-pdf-capture-root .bu-foot {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 28px;
  background: linear-gradient(90deg, #1b3a6b, #1e6fb8);
  color: #ffffff;
  font-size: 8.4px;
  line-height: 1.45;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  overflow: visible;
}
`;

export function renderSurveyReportFragment(data: SurveyReportData): { styleCss: string; bodyHtml: string } {
  const yearDisplay = escapeHtml(data.academicYearLabel || 'ทั้งหมด');
  const prevYearDisplay = escapeHtml(data.prevYearLabel || 'ปีก่อนหน้า');
  const totalCount = Number.isFinite(data.totalResponses) ? Math.max(0, Math.round(data.totalResponses)) : 0;

  const responseRateDisplay =
    data.responseRate !== null && Number.isFinite(data.responseRate)
      ? data.responseRate.toFixed(1)
      : '0.0';

  const prevRateValue =
    data.prevResponseRate !== null && Number.isFinite(data.prevResponseRate)
      ? data.prevResponseRate.toFixed(1)
      : '0.0';
  const rateTrendSymbol =
    data.responseRateDiff !== null && Number.isFinite(data.responseRateDiff)
      ? data.responseRateDiff >= 0
        ? '▲'
        : '▼'
      : '-';

  const overallScoreValue =
    data.overallScore !== null && Number.isFinite(data.overallScore)
      ? clamp(data.overallScore, 0, 5)
      : 0;
  const overallScoreStr = safeFixed(overallScoreValue, 2, '0.00');
  const overallRingPct = Math.round(clamp((overallScoreValue / 5) * 100, 0, 100));
  const prevOverallStr =
    data.prevOverallScore !== null && Number.isFinite(data.prevOverallScore)
      ? data.prevOverallScore.toFixed(2)
      : '0.00';

  const sdStr = safeFixed(data.overallSd, 2, '0.00');
  const highSatPct = safePct(data.highSatPct, 0);

  const highDimLabel = data.highestDimension?.label
    ? truncateLabel(`สูงสุด (${data.highestDimension.label})`, 16)
    : 'สูงสุด (ด้าน …)';
  const highDimFullTitle = data.highestDimension?.label
    ? `สูงสุด (${data.highestDimension.label})`
    : 'สูงสุด';
  const highDimScore = safeFixed(data.highestDimension?.score, 2, '0.00');
  const lowDimLabel = data.lowestDimension?.label
    ? truncateLabel(`ต่ำสุด (${data.lowestDimension.label})`, 16)
    : 'ต่ำสุด (ด้าน …)';
  const lowDimFullTitle = data.lowestDimension?.label
    ? `ต่ำสุด (${data.lowestDimension.label})`
    : 'ต่ำสุด';
  const lowDimScore = safeFixed(data.lowestDimension?.score, 2, '0.00');

  const internshipPct =
    data.internshipRequiredPct !== null && Number.isFinite(data.internshipRequiredPct)
      ? safePct(data.internshipRequiredPct, 0)
      : 0;
  const internshipMonthsStr =
    data.internshipMinMonths !== null && Number.isFinite(data.internshipMinMonths)
      ? data.internshipMinMonths.toFixed(1)
      : '0.0';

  const logoHtml = data.logoDataUri
    ? `<img class="bu-logo" src="${escapeHtml(data.logoDataUri)}" alt="Bangkok University">`
    : FALLBACK_BU_SVG_LOGO;

  const heroHtml = data.heroDataUri
    ? `<img class="bu-hero" width="158" height="158" src="${escapeHtml(data.heroDataUri)}" alt="Graduation Cap">`
    : HERO_SVG;

  const chartGroupsHtml = data.dimensions
    .map((dim) => {
      const oldScore = dim.prevScore !== null && Number.isFinite(dim.prevScore) ? clamp(dim.prevScore, 0, 5) : 0;
      const newScore = dim.currScore !== null && Number.isFinite(dim.currScore) ? clamp(dim.currScore, 0, 5) : 0;
      const labelHtml = dim.line2
        ? `${escapeHtml(dim.line1)}<br>${escapeHtml(dim.line2)}`
        : escapeHtml(dim.line1);

      return `<div class="bu-grp"><div class="bu-bars"><div class="bu-bw"><div class="bu-val">${oldScore.toFixed(2)}</div>${renderSvg3DBar(oldScore, 'old')}</div><div class="bu-bw"><div class="bu-val hi">${newScore.toFixed(2)}</div>${renderSvg3DBar(newScore, 'new')}</div></div><div class="bu-bl"><i>${dim.id}</i>${labelHtml}</div></div>`;
    })
    .join('');

  const issuePillsHtml =
    data.issuePills.length > 0
      ? data.issuePills
          .slice(0, 3)
          .map(
            (p) =>
              `<span>${escapeHtml(truncateLabel(p.label, 20))}<b>${Number.isFinite(p.count) ? Math.max(0, Math.round(p.count)) : 0}</b></span>`
          )
          .join('')
      : '<span>ไม่มีประเด็นเสนอแนะเพิ่มเติม<b>0</b></span>';

  const quotesHtml =
    data.quotes.length > 0
      ? data.quotes
          .slice(0, 2)
          .map((q) => `<div class="bu-qb">“${escapeHtml(q.length > 90 ? `${q.slice(0, 87)}...` : q)}”</div>`)
          .join('')
      : `<div class="bu-qb">“ไม่มีข้อเสนอแนะเพิ่มเติมสำหรับตัวกรองที่เลือก”</div><div class="bu-qb">“-”</div>`;

  const bannerScopeSuffix =
    data.scopeLabel && data.scopeLabel !== 'ทุกคณะ / ทุกสาขาวิชา'
      ? ` · ${escapeHtml(data.scopeLabel)}`
      : '';

  const styleCss = `${data.fontFaceCss || ''}\n${SCOPED_REPORT_CSS}`;

  const bodyHtml = `<div id="bu-pdf-capture-root">
  <div class="bu-page">
    ${SKY_SVG}
    <div class="bu-in">
      <div class="bu-top">
        ${logoHtml}
        <div class="bu-tt"><h1>ผลสำรวจความคิดเห็นของ<em>ผู้บังคับบัญชา</em><br>ต่อคุณภาพบัณฑิต มหาวิทยาลัยกรุงเทพ</h1></div>
        ${heroHtml}
      </div>
      <div class="bu-banner">สรุปผลสำรวจ ปีการศึกษา ${yearDisplay} · ผู้ตอบแบบสำรวจ ${totalCount} ราย${bannerScopeSuffix}</div>
      <div class="bu-ov">
        <div class="bu-tagrow">
          <div class="bu-tag g">ผลลัพธ์หลัก</div>
          <div class="bu-txt g">
            <p><span class="bu-dot"></span><span>${escapeHtml(data.highlights[0])}</span></p>
            <p><span class="bu-dot"></span><span>${escapeHtml(data.highlights[1])}</span></p>
            <p><span class="bu-dot"></span><span>${escapeHtml(data.highlights[2])}</span></p>
          </div>
        </div>
        <div class="bu-tagrow">
          <div class="bu-tag o">ข้อสังเกต</div>
          <div class="bu-txt">
            <p><span class="bu-dot"></span><span>${escapeHtml(data.observations[0])}</span></p>
            <p><span class="bu-dot"></span><span>${escapeHtml(data.observations[1])}</span></p>
            <p><span class="bu-dot"></span><span>${escapeHtml(data.observations[2])}</span></p>
          </div>
        </div>
      </div>

      <div class="bu-panel">
        <div class="bu-ph"><span class="bu-diamond"></span><span>ข้อมูลผู้ตอบแบบสำรวจ</span><small>ร้อยละของผู้ตอบ</small></div>
        <div class="bu-a">
          <div class="bu-kp">
            <div class="bu-k"><div class="bu-l">จำนวนผู้ตอบ</div><div class="bu-v">${totalCount}<small>ราย</small></div></div>
            <div class="bu-k"><div class="bu-l">อัตราการตอบกลับ</div><div class="bu-v">${responseRateDisplay}<small>%</small></div></div>
            <div class="bu-k"><div class="bu-l">ปีก่อน / เปลี่ยนแปลง</div><div class="bu-v">${prevRateValue}<small>% ${rateTrendSymbol}</small></div></div>
          </div>
          <div class="bu-five">
            <div class="bu-cd"><div class="bu-ch">ตำแหน่งผู้ตอบ</div>${renderProgressRows(data.positions, '', 5, 'ไม่มีข้อมูล', 14)}</div>
            <div class="bu-cd"><div class="bu-ch">ประสบการณ์</div>${renderProgressRows(data.experiences, 'g', 4, 'ไม่มีข้อมูล', 15)}</div>
            <div class="bu-cd"><div class="bu-ch">ประเภทหน่วยงาน</div>${renderProgressRows(data.orgTypes, '', 6, 'ไม่มีข้อมูล', 14)}</div>
            <div class="bu-cd"><div class="bu-ch">ระยะเวลา</div>${renderProgressRows(data.durations, 'g', 5, 'ไม่มีข้อมูล', 15)}</div>
            <div class="bu-cd"><div class="bu-ch">อุตสาหกรรม (Top 5)</div>${renderProgressRows(data.industries, 'o', 5, 'ไม่มีข้อมูล', 14)}</div>
          </div>
        </div>
      </div>

      <div class="bu-panel">
        <div class="bu-ph"><span class="bu-diamond"></span><span>คุณภาพบัณฑิตตามความเห็นผู้บังคับบัญชา</span><small>คะแนนเฉลี่ย เต็ม 5.00</small></div>
        <div class="bu-b2">
          <div class="bu-plot">
            <div class="bu-legend">
              <span><i style="background:#a9dba4"></i>${prevYearDisplay}</span>
              <span><i style="background:#1e6fb8"></i>ปีการศึกษา ${yearDisplay}</span>
            </div>
            <div class="bu-chart">
              ${chartGroupsHtml}
            </div>
          </div>
          <div class="bu-side">
            <div class="bu-gauge">
              ${renderDonutSvg(overallRingPct, overallScoreStr, 72, '#f08a1c', '#e5ebf1', 13)}
              <div>
                <div class="bu-t">ความพึงพอใจภาพรวม</div>
                <div class="bu-s">ระดับ ${escapeHtml(data.overallLevelLabel)} · ปีก่อน ${prevOverallStr}</div>
              </div>
            </div>
            <div class="bu-chips">
              <div class="bu-chip"><div class="bu-ci" style="background:#1e6fb8"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="12" width="4" height="9"/><rect x="10" y="6" width="4" height="15"/><rect x="17" y="3" width="4" height="18"/></svg></div><div style="min-width:0"><div class="bu-cl">ค่าเฉลี่ยรวม</div><div class="bu-cv">${overallScoreStr}</div></div></div>
              <div class="bu-chip"><div class="bu-ci" style="background:#0f9bb0"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="4" width="18" height="12" rx="1"/><rect x="8" y="18" width="8" height="2"/></svg></div><div style="min-width:0"><div class="bu-cl">S.D. รวม</div><div class="bu-cv">${sdStr}</div></div></div>
              <div class="bu-chip"><div class="bu-ci" style="background:#e8791a"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7 7 .6-5.3 4.7 1.7 7.2L12 17.8 5.6 21.5l1.7-7.2L2 9.6 9 9z"/></svg></div><div style="min-width:0"><div class="bu-cl">มาก–มากที่สุด</div><div class="bu-cv">${highSatPct}%</div></div></div>
              <div class="bu-chip"><div class="bu-ci" style="background:#7a5cc0"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-5 4-8 8-8s8 3 8 8z"/></svg></div><div style="min-width:0"><div class="bu-cl">ผู้ตอบ</div><div class="bu-cv">${totalCount} ราย</div></div></div>
              <div class="bu-chip"><div class="bu-ci" style="background:#2f9e4f"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l8 9h-5v9H9v-9H4z"/></svg></div><div style="min-width:0"><div class="bu-cl" title="${escapeHtml(highDimFullTitle)}">${escapeHtml(highDimLabel)}</div><div class="bu-cv">${highDimScore}</div></div></div>
              <div class="bu-chip"><div class="bu-ci" style="background:#d9534f"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21l-8-9h5V3h6v9h5z"/></svg></div><div style="min-width:0"><div class="bu-cl" title="${escapeHtml(lowDimFullTitle)}">${escapeHtml(lowDimLabel)}</div><div class="bu-cv">${lowDimScore}</div></div></div>
            </div>
          </div>
        </div>
      </div>

      <div class="bu-panel">
        <div class="bu-ph"><span class="bu-diamond"></span><span>จุดเด่น ทักษะที่ควรเพิ่ม และความต้องการบุคลากร</span><small>Top 5 · เลือกตอบได้หลายข้อ</small></div>
        <div class="bu-c3">
          <div class="bu-cd"><div class="bu-ch">สิ่งที่ประทับใจ / จุดเด่นของบัณฑิต</div>${renderProgressRows(data.strengths, 'o', 5, 'ไม่มีข้อมูล', 28)}</div>
          <div class="bu-cd"><div class="bu-ch">ทักษะที่ควรปลูกฝังเพิ่ม</div>${renderProgressRows(data.skillsToImprove, '', 5, 'ไม่มีข้อมูล', 28)}</div>
          <div class="bu-cd q"><div class="bu-ch">ข้อเสนอแนะ</div><div class="bu-tg">${issuePillsHtml}</div>${quotesHtml}</div>
          <div class="bu-cd"><div class="bu-ch">สาขาวิชาที่ต้องการ</div>${renderProgressRows(data.neededMajors, 'g', 5, 'ไม่มีข้อมูล', 28)}</div>
          <div class="bu-cd"><div class="bu-ch">ทักษะสำคัญที่ต้องการ</div>${renderProgressRows(data.coreSkills, 'g', 5, 'ไม่มีข้อมูล', 28)}</div>
          <div class="bu-cd"><div class="bu-ch">เกณฑ์คัดเลือก &amp; ประสบการณ์ฝึกงาน</div>${renderProgressRows(data.selectionCriteria, 'g', 3, 'ไม่มีข้อมูล', 28)}<div class="bu-mini">${renderDonutSvg(internshipPct, `${internshipPct}%`, 54, '#2f9e4f', '#dfe8ef', 10.5)}<div class="bu-tx">ต้องการผู้มีประสบการณ์/ฝึกงาน<br><b>${internshipMonthsStr}</b> เดือน (ขั้นต่ำเฉลี่ย)</div></div></div>
        </div>
      </div>
    </div>
    <div class="bu-foot">
      <span>แหล่งข้อมูล: แบบสำรวจความคิดเห็นของผู้บังคับบัญชาต่อคุณภาพบัณฑิต ปีการศึกษา ${yearDisplay} · ข้อมูล ณ ${escapeHtml(data.generatedDateThai)}</span>
      <span>สำนักมาตรฐานคุณภาพการศึกษา มหาวิทยาลัยกรุงเทพ</span>
    </div>
  </div>
</div>`;

  return { styleCss, bodyHtml };
}

export function generateSurveyReportHtml(data: SurveyReportData): string {
  const { styleCss, bodyHtml } = renderSurveyReportFragment(data);
  const yearDisplay = escapeHtml(data.academicYearLabel || 'ทั้งหมด');
  const googleFontsLink =
    '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">';

  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<title>Infographic ผลสำรวจผู้บังคับบัญชา ${yearDisplay}</title>
${googleFontsLink}
<style data-bu-pdf-style="true">
@page{size:A4;margin:0}
html,body{margin:0;padding:0;background:#ffffff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
${styleCss}
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}
