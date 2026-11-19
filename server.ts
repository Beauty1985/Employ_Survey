import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface AttributeSummaryItem {
  id: number;
  label: string;
  mean: number;
}

interface SuggestionItem {
  text: string;
  faculty?: string;
}

interface AiSummaryRequestBody {
  filterSummary?: {
    year?: string;
    month?: string;
    faculty?: string;
    department?: string;
  };
  totalCompletedCount?: number;
  totalSentCount?: number;
  responseRate?: number;
  compositeMean?: number;
  tqfMean?: number;
  identityMean?: number;
  dnaMean?: number;
  attributeSummary?: AttributeSummaryItem[];
  topStrengths?: [string, number][];
  topSkillsToImprove?: [string, number][];
  topNeededMajors?: [string, number][];
  topCoreSkills?: [string, number][];
  topOrgTypes?: [string, number][];
  topSelectionCriteria?: [string, number][];
  experienceDemand?: {
    yesCount?: number;
    noCount?: number;
    avgMonths?: number;
  };
  suggestions?: SuggestionItem[];
}

interface ExecutiveSummaryResult {
  overview: string;
  strengths: string[];
  urgentImprovements: string[];
  policyRecommendations: string[];
}

function formatErrorMessage(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();

  if (lower.includes('api_key_invalid') || lower.includes('permission_denied') || lower.includes('403') || lower.includes('401')) {
    return {
      status: 403,
      message: 'การยืนยันสิทธิ์ Gemini API ไม่สำเร็จ (API Key ไม่ถูกต้องหรือหมดอายุ) กรุณาตรวจสอบค่าใน Settings > Secrets',
    };
  }
  if (lower.includes('resource_exhausted') || lower.includes('429') || lower.includes('quota')) {
    return {
      status: 429,
      message: 'โควตาการใช้งาน Gemini API เต็มชั่วคราว กรุณารอสักครู่แล้วลองใหม่อีกครั้ง',
    };
  }
  if (lower.includes('not_found') || lower.includes('404')) {
    return {
      status: 404,
      message: 'ไม่พบโมเดล AI ที่กำหนด กรุณาลองใหม่อีกครั้งหรือติดต่อผู้ดูแลระบบ',
    };
  }
  return {
    status: 500,
    message: 'ไม่สามารถเชื่อมต่อบริการวิเคราะห์ผล AI ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง',
  };
}

function isRetryableError(err: unknown): boolean {
  const raw = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return raw.includes('429') || raw.includes('503') || raw.includes('unavailable') || raw.includes('timeout') || raw.includes('econnreset');
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '1mb' }));

  app.post('/api/ai/summary', async (req: Request, res: Response) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(500).json({
          error: 'ยังไม่ได้ตั้งค่า GEMINI_API_KEY บนเซิร์ฟเวอร์ กรุณาตรวจสอบในแผง Settings > Secrets',
        });
        return;
      }

      const body = (req.body || {}) as AiSummaryRequestBody;
      const totalCompletedCount = Number(body.totalCompletedCount || 0);
      const suggestions = Array.isArray(body.suggestions) ? body.suggestions : [];

      if (totalCompletedCount <= 0) {
        res.status(400).json({
          error: 'กรุณาเลือกตัวกรองที่มีข้อมูลแบบสำรวจอย่างน้อย 1 รายการเพื่อทำการวิเคราะห์ด้วย AI',
        });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const filter = body.filterSummary || {};
      const cappedSuggestions =
        suggestions.length > 0
          ? suggestions
              .slice(0, 120)
              .map((s, idx) => `${idx + 1}. [${s.faculty || 'ไม่ระบุคณะ'}] ${String(s.text || '').trim()}`)
              .join('\n')
              .slice(0, 14000)
          : 'ไม่มีข้อเสนอแนะปลายเปิดเพิ่มเติมในตัวกรองนี้ (ให้วิเคราะห์จากคะแนน 13 ด้าน, จุดเด่น, ทักษะที่ควรพัฒนา และความต้องการบุคลากร)';

      const attrLines = Array.isArray(body.attributeSummary)
        ? body.attributeSummary.map((a) => `- ข้อ ${a.id} ${a.label}: ${Number(a.mean || 0).toFixed(2)} / 5.00`).join('\n')
        : '';

      const formatTopList = (items?: [string, number][], unit = 'ครั้ง') =>
        Array.isArray(items) && items.length > 0
          ? items.map(([name, count], idx) => `${idx + 1}. ${name} (${count} ${unit})`).join('\n')
          : 'ไม่มีข้อมูล';

      const expDemand = body.experienceDemand || {};
      const expSummaryLine =
        typeof expDemand.yesCount === 'number' || typeof expDemand.noCount === 'number'
          ? `ต้องการประสบการณ์ ${expDemand.yesCount || 0} ราย (เฉลี่ยขั้นต่ำ ${Number(expDemand.avgMonths || 0).toFixed(1)} เดือน) / ไม่กำหนดประสบการณ์ ${expDemand.noCount || 0} ราย`
          : 'ไม่มีข้อมูล';

      const promptText = [
        'กรุณาวิเคราะห์และสรุปผลการประเมินคุณภาพบัณฑิต มหาวิทยาลัยกรุงเทพ สำหรับผู้บริหารและคณะกรรมการหลักสูตร จากข้อมูลที่กรองไว้ดังนี้:',
        '',
        '### ขอบเขตตัวกรองปัจจุบัน',
        `- ปีการศึกษา: ${filter.year || 'ทั้งหมด'}`,
        `- เดือนที่ตอบ: ${filter.month || 'ทั้งหมด'}`,
        `- คณะวิชา: ${filter.faculty || 'ทั้งหมด'}`,
        `- สาขาวิชา: ${filter.department || 'ทั้งหมด'}`,
        `- จำนวนผู้ตอบแบบประเมิน: ${totalCompletedCount} ราย (จากเป้าหมาย ${Number(body.totalSentCount || 0)} ราย, อัตราตอบกลับ ${Number(body.responseRate || 0).toFixed(1)}%)`,
        '',
        '### ประเภทองค์กรผู้ประเมินหลัก (Top 5)',
        formatTopList(body.topOrgTypes, 'ราย'),
        '',
        '### ค่าเฉลี่ยเชิงปริมาณ (คะแนนเต็ม 5.00)',
        `- ค่าเฉลี่ยรวม 13 คุณลักษณะ (Composite Mean): ${Number(body.compositeMean || 0).toFixed(2)}`,
        `- ด้านคุณภาพบัณฑิตตามกรอบ TQF: ${Number(body.tqfMean || 0).toFixed(2)}`,
        `- ด้านการพัฒนาบัณฑิตตามอัตลักษณ์ (Identity): ${Number(body.identityMean || 0).toFixed(2)}`,
        `- ด้านการพัฒนาตาม BU 5: ${Number(body.dnaMean || 0).toFixed(2)}`,
        '',
        '### ค่าเฉลี่ยรายข้อ (13 คุณลักษณะ)',
        attrLines,
        '',
        '### จุดเด่นที่ผู้ใช้บัณฑิตประทับใจสูงสุด (Top 5)',
        formatTopList(body.topStrengths, 'โหวต'),
        '',
        '### ทักษะที่ผู้ใช้บัณฑิตเสนอให้พัฒนาเพิ่มเติม (Top 5)',
        formatTopList(body.topSkillsToImprove, 'โหวต'),
        '',
        '### สาขาวิชาที่องค์กรต้องการรับเพิ่ม (Top 5)',
        formatTopList(body.topNeededMajors, 'มติ'),
        '',
        '### ทักษะสำคัญในการปฏิบัติงานในอนาคตที่ตลาดต้องการ (Top 5)',
        formatTopList(body.topCoreSkills, 'มติ'),
        '',
        '### เกณฑ์คัดเลือกพนักงานและความต้องการประสบการณ์',
        `- ประสบการณ์ทำงาน/ฝึกงาน: ${expSummaryLine}`,
        formatTopList(body.topSelectionCriteria, 'มติ'),
        '',
        `### ข้อเสนอแนะเชิงคุณภาพจากผู้ใช้บัณฑิต (${suggestions.length} รายการ)`,
        cappedSuggestions,
      ].join('\n');

      const requestPayload = {
        model: 'gemini-4-hydrogen',
        contents: promptText,
        config: {
          systemInstruction:
            'คุณคือผู้เชี่ยวชาญด้านการประกันคุณภาพการศึกษาและการวิเคราะห์ข้อมูลระดับบริหารของมหาวิทยาลัยกรุงเทพ หน้าที่ของคุณคือสังเคราะห์ข้อมูลคะแนนประเมินทั้ง 13 ด้าน ค่าเฉลี่ยรายด้าน สถิติความต้องการของตลาดแรงงาน และข้อเสนอแนะเชิงคุณภาพจากผู้บังคับบัญชา ออกมาเป็นรายงานสรุปผู้บริหาร (Executive Summary) ภาษาไทยที่สุภาพ เป็นทางการ กระชับ ตรงประเด็น และอ้างอิงเฉพาะข้อเท็จจริงและตัวเลขจากข้อมูลที่ให้เท่านั้น ห้ามแต่งตัวเลขหรือข้อมูลที่ไม่มีในอินพุต',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overview: {
                type: Type.STRING,
                description:
                  'ภาพรวมความพึงพอใจของนายจ้าง/ผู้ใช้บัณฑิต (Executive Insights) สรุป 1 ย่อหน้าอย่างเป็นทางการโดยอ้างอิงค่าเฉลี่ยรวมและรายด้าน (TQF, อัตลักษณ์, BU 5)',
              },
              strengths: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'จุดเด่นสำคัญของบัณฑิตที่องค์กรชื่นชม 3-5 ประเด็นจากคะแนนสูงและเสียงสะท้อนผู้ประกอบการ',
              },
              urgentImprovements: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'จุดที่ควรพัฒนาเร่งด่วนตามเสียงสะท้อนของผู้ประกอบการ 3-5 ประเด็นจากคุณลักษณะที่ได้คะแนนต่ำกว่าด้านอื่น ทักษะที่ควรพัฒนา และข้อเสนอแนะ',
              },
              policyRecommendations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'ข้อเสนอแนะเชิงยุทธศาสตร์ (Strategic Recommendations) สำหรับปรับปรุงหลักสูตรและพัฒนานักศึกษา 3-5 ข้อเชิงปฏิบัติสำหรับผู้บริหารและคณะกรรมการหลักสูตร',
              },
            },
            required: ['overview', 'strengths', 'urgentImprovements', 'policyRecommendations'],
          },
        },
      };

      let response;
      let attempt = 0;
      const maxAttempts = 3;
      while (true) {
        try {
          response = await ai.models.generateContent(requestPayload);
          break;
        } catch (err) {
          attempt++;
          if (attempt >= maxAttempts || !isRetryableError(err)) {
            throw err;
          }
          await sleep(800 * attempt);
        }
      }

      const rawJson = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawJson) as Partial<ExecutiveSummaryResult>;

      const summary: ExecutiveSummaryResult = {
        overview: typeof parsed.overview === 'string' ? parsed.overview : '',
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : [],
        urgentImprovements: Array.isArray(parsed.urgentImprovements) ? parsed.urgentImprovements.map(String) : [],
        policyRecommendations: Array.isArray(parsed.policyRecommendations) ? parsed.policyRecommendations.map(String) : [],
      };

      res.json({
        summary,
        generatedAt: new Date().toISOString(),
        analyzedSuggestionsCount: suggestions.length,
      });
    } catch (err) {
      console.error('Gemini AI summary error:', err);
      const mapped = formatErrorMessage(err);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
  });
}

startServer();
