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

function sanitizeSuggestionText(text: string): string {
  return String(text || '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[อีเมลถูกซ่อน]')
    .replace(/(?:\+66|0)\d[\d\s-]{7,11}\d/g, '[เบอร์โทรถูกซ่อน]')
    .trim();
}

function parseGeminiSummaryJson(rawText: string): Partial<ExecutiveSummaryResult> {
  const trimmed = (rawText || '').trim();
  if (!trimmed) {
    throw new Error('EMPTY_AI_RESPONSE');
  }
  const stripped = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(stripped) as Partial<ExecutiveSummaryResult>;
}

function formatErrorMessage(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();

  if (lower.includes('empty_ai_response') || err instanceof SyntaxError) {
    return {
      status: 502,
      message: 'AI ส่งคืนรูปแบบข้อมูลที่ไม่สมบูรณ์ กรุณากด "ลองใหม่อีกครั้ง"',
    };
  }
  if (
    lower.includes('free tier is not available') ||
    lower.includes('set up billing') ||
    lower.includes('project-unavailable')
  ) {
    return {
      status: 403,
      message:
        'โปรเจกต์ที่ผูกกับ Gemini API Key ปัจจุบันไม่รองรับการใช้งานฟรี (Free Tier) กรุณาเปิดใช้งาน Billing ที่ https://aistudio.google.com/billing หรือเลือก API Key ที่มี Billing ในแผง Settings > Secrets',
    };
  }
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

  app.use(express.json({ limit: '5mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    const configured = Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY');
    res.type('application/json').json({ ok: true, hasGeminiKey: configured });
  });

  app.post('/api/ai/summary', async (req: Request, res: Response) => {
    res.type('application/json');
    try {
      const apiKey = (process.env.GEMINI_API_KEY || '').trim();
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
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
      const cleanedSuggestions = suggestions
        .map((s) => ({
          faculty: String(s.faculty || 'ไม่ระบุคณะ').trim(),
          text: sanitizeSuggestionText(s.text),
        }))
        .filter((s) => s.text.length > 0);

      const cappedSuggestions =
        cleanedSuggestions.length > 0
          ? cleanedSuggestions
              .slice(0, 120)
              .map((s, idx) => `${idx + 1}. [${s.faculty || 'ไม่ระบุคณะ'}] ${s.text}`)
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
        `### ข้อเสนอแนะเชิงคุณภาพจากผู้ใช้บัณฑิต (${cleanedSuggestions.length} รายการ)`,
        cappedSuggestions,
      ].join('\n');

      const requestPayload = {
        model: 'gemini-2.5-flash',
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

      const parsed = parseGeminiSummaryJson(response.text ?? '') as Partial<ExecutiveSummaryResult> & {
        executiveSummary?: string;
        strategicRecommendations?: unknown[];
      };

      const rawOverview = typeof parsed.overview === 'string' ? parsed.overview : parsed.executiveSummary;
      const rawPolicy = Array.isArray(parsed.policyRecommendations)
        ? parsed.policyRecommendations
        : parsed.strategicRecommendations;

      const summary: ExecutiveSummaryResult = {
        overview: typeof rawOverview === 'string' ? rawOverview.trim() : '',
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map((v) => String(v).trim()).filter(Boolean) : [],
        urgentImprovements: Array.isArray(parsed.urgentImprovements)
          ? parsed.urgentImprovements.map((v) => String(v).trim()).filter(Boolean)
          : [],
        policyRecommendations: Array.isArray(rawPolicy)
          ? rawPolicy.map((v) => String(v).trim()).filter(Boolean)
          : [],
      };

      res.json({
        summary,
        generatedAt: new Date().toISOString(),
        analyzedSuggestionsCount: cleanedSuggestions.length,
      });
    } catch (err) {
      const mapped = formatErrorMessage(err);
      if (mapped.status >= 500) {
        console.error('Gemini AI summary error:', err);
      } else {
        console.warn(`Gemini AI summary ${mapped.status}: ${mapped.message}`);
      }
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  // Ensure unmatched /api/* endpoints NEVER fall through to SPA HTML fallback
  app.use('/api', (req: Request, res: Response) => {
    res.status(404).type('application/json').json({
      error: `ไม่พบ API endpoint: ${req.method} ${req.originalUrl}`,
    });
  });

  // Ensure Express body-parser / middleware errors on /api/* always return JSON instead of Express HTML error pages
  app.use((err: unknown, req: Request, res: Response, next: express.NextFunction) => {
    if (!req.originalUrl.startsWith('/api')) {
      next(err);
      return;
    }
    const errObj = err as { status?: number; statusCode?: number; type?: string; message?: string };
    const status = errObj?.status || errObj?.statusCode || 500;
    if (errObj?.type === 'entity.too.large' || status === 413) {
      res.status(413).type('application/json').json({
        error: 'ข้อมูลที่ส่งไปวิเคราะห์มีขนาดใหญ่เกินกำหนด กรุณาเลือกตัวกรองเฉพาะปีการศึกษาหรือคณะแล้วลองใหม่อีกครั้ง',
      });
      return;
    }
    if (err instanceof SyntaxError && status === 400) {
      res.status(400).type('application/json').json({
        error: 'รูปแบบข้อมูล JSON ที่ส่งมายังเซิร์ฟเวอร์ไม่ถูกต้อง',
      });
      return;
    }
    console.error('Unhandled API error:', err);
    res.status(status >= 400 && status < 600 ? status : 500).type('application/json').json({
      error: 'เกิดข้อผิดพลาดภายในระบบ API กรุณาลองใหม่อีกครั้ง',
    });
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
    app.get('*', (req: Request, res: Response) => {
      if (req.path.startsWith('/api')) {
        res.status(404).type('application/json').json({ error: 'API endpoint not found' });
        return;
      }
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
  });
}

startServer();
