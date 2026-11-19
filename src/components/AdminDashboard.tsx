import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  buildSurveyReportData,
  extractTemplateAssets,
  renderSurveyReportFragment,
} from '../utils/pdfReportTemplate';
import { 
  collection, 
  getDocs, 
  getDoc,
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where,
  orderBy,
  limit,
  serverTimestamp,
  deleteField,
  onSnapshot,
  writeBatch 
} from 'firebase/firestore';
import { 
  GoogleAuthProvider,
  signInWithPopup,
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { db, auth, OperationType, handleFirestoreError } from '../firebase';
import { getCurrentAcademicYear } from '../App';
import { Admin, Supervisor, SurveyResponse, AuditLog } from '../types';
import * as XLSX from 'xlsx';
import { 
  BarChart, 
  TrendingUp, 
  Users, 
  Download, 
  Upload, 
  Trash2, 
  Search,
  UserPlus, 
  Settings, 
  LogOut, 
  Filter, 
  PieChart, 
  AlertTriangle,
  FolderOpen,
  ClipboardList,
  Award,
  HelpCircle,
  Briefcase,
  Layers,
  Globe,
  Building2,
  Clock,
  Sparkles,
  BookOpen,
  Target,
  FileText,
  FileSpreadsheet,
  ShieldCheck,
  Loader2,
  Printer,
  RotateCcw,
  CheckCircle2,
  X
} from 'lucide-react';

const THAI_MONTHS: Record<string, string> = {
  '01': 'มกราคม',
  '02': 'กุมภาพันธ์',
  '03': 'มีนาคม',
  '04': 'เมษายน',
  '05': 'พฤษภาคม',
  '06': 'มิถุนายน',
  '07': 'กรกฎาคม',
  '08': 'สิงหาคม',
  '09': 'กันยายน',
  '10': 'ตุลาคม',
  '11': 'พฤศจิกายน',
  '12': 'ธันวาคม',
};

function getThaiMonthName(monthStr: string): string {
  return THAI_MONTHS[monthStr] || `เดือนที่ ${monthStr}`;
}

export default function AdminDashboard() {
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;

  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [isProviderDisabled, setIsProviderDisabled] = useState(false);

  // Loaded DB data
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Modal / Inputs state for Admin List
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPos, setAdminPos] = useState('');
  const [adminRole, setAdminRole] = useState<'super_admin' | 'admin'>('admin');
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);

  // Active tab
  const [activeTab, setActiveTab] = useState<'overview' | 'import' | 'admins' | 'reset-codes' | 'purge-responses' | 'purge'>('overview');
  const [dashSubTab, setDashSubTab] = useState<'part1' | 'part2' | 'part3'>('part1');

  // Filters state
  const [filterYear, setFilterYear] = useState<string>(() => getCurrentAcademicYear());
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterFaculty, setFilterFaculty] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [hasDefaultedYear, setHasDefaultedYear] = useState(false);

  // PDF Preview Modal & Export state
  const [isPreparingPdfPreview, setIsPreparingPdfPreview] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [pdfPreviewContent, setPdfPreviewContent] = useState<{
    styleCss: string;
    bodyHtml: string;
    fileName: string;
  } | null>(null);
  const [pdfPreviewError, setPdfPreviewError] = useState<string | null>(null);
  const [pdfDownloadSuccess, setPdfDownloadSuccess] = useState(false);
  const pdfSuccessTimerRef = useRef<number | null>(null);
  const pdfPreviewContainerRef = useRef<HTMLDivElement | null>(null);

  const previewStyleMarkup = React.useMemo(
    () => (pdfPreviewContent ? { __html: pdfPreviewContent.styleCss } : undefined),
    [pdfPreviewContent]
  );

  const previewBodyMarkup = React.useMemo(
    () => (pdfPreviewContent ? { __html: pdfPreviewContent.bodyHtml } : undefined),
    [pdfPreviewContent]
  );

  useEffect(() => {
    return () => {
      if (pdfSuccessTimerRef.current !== null) {
        window.clearTimeout(pdfSuccessTimerRef.current);
        pdfSuccessTimerRef.current = null;
      }
    };
  }, []);

  const handleClosePdfPreview = () => {
    if (pdfSuccessTimerRef.current !== null) {
      window.clearTimeout(pdfSuccessTimerRef.current);
      pdfSuccessTimerRef.current = null;
    }
    setIsPdfPreviewOpen(false);
    setPdfPreviewContent(null);
    setPdfPreviewError(null);
    setPdfDownloadSuccess(false);
    setIsGeneratingPdf(false);
  };

  useEffect(() => {
    if (!isPdfPreviewOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClosePdfPreview();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPdfPreviewOpen]);

  // Reset department filter when faculty changes
  useEffect(() => {
    setFilterDepartment('all');
  }, [filterFaculty]);

  // Importer states
  const [importStatus, setImportStatus] = useState<'idle' | 'parsing' | 'saving' | 'success' | 'error'>('idle');
  const [importStats, setImportStats] = useState({ total: 0, imported: 0, added: 0, skippedDuplicate: 0, skippedInvalid: 0 });
  const [importError, setImportError] = useState('');
  const [supervisorSearch, setSupervisorSearch] = useState('');
  const [supervisorPage, setSupervisorPage] = useState(1);

  // Action loading states
  const [isSavingAdmin, setIsSavingAdmin] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  // Purge states (full danger zone)
  const [purgeYear, setPurgeYear] = useState('');
  const [purgeMode, setPurgeMode] = useState<'all' | 'supervisors' | 'responses'>('responses');
  const [purgeConfirmText, setPurgeConfirmText] = useState('');
  const [purgeMessage, setPurgeMessage] = useState({ text: '', type: '' });

  // Delete Survey Responses by Academic Year states
  const [deleteRespYear, setDeleteRespYear] = useState('');
  const [showDeleteRespModal, setShowDeleteRespModal] = useState(false);
  const [deleteRespConfirmInput, setDeleteRespConfirmInput] = useState('');
  const [isDeletingResponses, setIsDeletingResponses] = useState(false);

  // Reset Survey Codes states
  const [resetOption, setResetOption] = useState<'keep' | 'clear'>('keep');
  const [hasBackedUpBeforeReset, setHasBackedUpBeforeReset] = useState(false);
  const [showResetCodesModal, setShowResetCodesModal] = useState(false);
  const [resetCodesConfirmInput, setResetCodesConfirmInput] = useState('');
  const [isResettingCodes, setIsResettingCodes] = useState(false);
  const [resetCodesStatusMsg, setResetCodesStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // In-app notice & confirmation modal (replacing native window.alert/confirm)
  const [uiNotice, setUiNotice] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => Promise<void> | void;
  } | null>(null);
  const [isConfirmProcessing, setIsConfirmProcessing] = useState(false);
  const noticeTimerRef = useRef<number | null>(null);

  const showNotice = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setUiNotice({ text, type });
    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = window.setTimeout(() => {
      setUiNotice(null);
      noticeTimerRef.current = null;
    }, 5000);
  };

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) {
        window.clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  // Ensure admin document exists under admins/{uid} before attaching Firestore listeners
  const ensureAdminDocument = async (loggedInUser: User) => {
    const email = (loggedInUser.email || '').toLowerCase();
    const adminDocRef = doc(db, 'admins', loggedInUser.uid);
    const adminDocSnap = await getDoc(adminDocRef);

    if (!adminDocSnap.exists()) {
      await setDoc(adminDocRef, {
        uid: loggedInUser.uid,
        email: email,
        name: loggedInUser.displayName || email.split('@')[0],
        position: email === 'walailuk.p@bu.ac.th' ? 'ผู้ดูแลระบบหลัก' : 'ผู้ดูแลระบบทั่วไป',
        role: email === 'walailuk.p@bu.ac.th' ? 'super_admin' : 'admin'
      });

      // Now that admins/{uid} exists (satisfying isAdmin()), check for any pre-created placeholder doc by email
      try {
        const q = query(collection(db, 'admins'), where('email', '==', email));
        const querySnap = await getDocs(q);
        for (const existingDoc of querySnap.docs) {
          if (existingDoc.id !== loggedInUser.uid) {
            const data = existingDoc.data();
            await updateDoc(adminDocRef, {
              name: data.name || loggedInUser.displayName || email.split('@')[0],
              position: data.position || (email === 'walailuk.p@bu.ac.th' ? 'ผู้ดูแลระบบหลัก' : 'ผู้ดูแลระบบทั่วไป'),
              role: email === 'walailuk.p@bu.ac.th' ? 'super_admin' : (data.role || 'admin')
            });
            await deleteDoc(doc(db, 'admins', existingDoc.id));
          }
        }
      } catch {
        // Non-fatal if placeholder lookup is skipped
      }
    }
  };

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const email = (currentUser.email || '').toLowerCase();
        if (email && email.endsWith('@bu.ac.th')) {
          try {
            await ensureAdminDocument(currentUser);
            setAuthError('');
            setUser(currentUser);
          } catch (err) {
            console.error('Admin verification error:', err);
            setUser(null);
            setAuthError('ไม่สามารถยืนยันสิทธิ์ผู้ดูแลระบบได้ กรุณาลองเข้าสู่ระบบใหม่อีกครั้ง');
          }
        } else {
          try {
            await signOut(auth);
          } catch (e) {
            console.error('Logout error:', e);
          }
          setUser(null);
          setAuthError('จำกัดสิทธิ์ใช้งานเฉพาะบัญชี Google ของมหาวิทยาลัยกรุงเทพ (@bu.ac.th) เท่านั้น');
        }
      } else {
        setUser(null);
        setAdmins([]);
        setSupervisors([]);
        setResponses([]);
        setAuditLogs([]);
        setHasDefaultedYear(false);
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const reportListenerError = (err: unknown, path: string) => {
    setDataLoading(false);
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Quota exceeded')) {
      showNotice('โควต้าการอ่านข้อมูล Firebase รายวันเต็มชั่วคราว กรุณาลองใหม่ในวันถัดไป', 'error');
    } else {
      showNotice('ไม่สามารถโหลดข้อมูลจากฐานข้อมูลได้ กรุณาตรวจสอบสิทธิ์หรือลองรีเฟรชหน้าเว็บ', 'error');
    }
    try {
      handleFirestoreError(err, OperationType.LIST, path);
    } catch {
      // Logged cleanly via handleFirestoreError without crashing listener callback
    }
  };

  // Sync data from Firestore in real-time
  useEffect(() => {
    if (!user) return;
    setDataLoading(true);

    const unsubAdmins = onSnapshot(collection(db, 'admins'), (snap) => {
      const list: Admin[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as Admin);
      });
      setAdmins(list);
    }, (err) => reportListenerError(err, 'admins'));

    const unsubSupervisors = onSnapshot(collection(db, 'supervisors'), (snap) => {
      const list: Supervisor[] = [];
      const missingYearIds: string[] = [];
      snap.forEach(d => {
        const raw = d.data() as Supervisor;
        if (!raw.academicYear) missingYearIds.push(d.id);
        list.push({ id: d.id, ...raw, academicYear: raw.academicYear || '2569' });
      });
      setSupervisors(list);
      if (missingYearIds.length > 0) {
        Promise.all(
          missingYearIds.map((docId) => updateDoc(doc(db, 'supervisors', docId), { academicYear: '2569' }).catch(() => {}))
        );
      }
    }, (err) => reportListenerError(err, 'supervisors'));

    const unsubResponses = onSnapshot(collection(db, 'responses'), (snap) => {
      const list: SurveyResponse[] = [];
      const missingYearIds: string[] = [];
      snap.forEach(d => {
        const raw = d.data() as SurveyResponse;
        if (!raw.academicYear) missingYearIds.push(d.id);
        list.push({ id: d.id, ...raw, academicYear: raw.academicYear || '2569' });
      });
      setResponses(list);
      setDataLoading(false);
      if (missingYearIds.length > 0) {
        Promise.all(
          missingYearIds.map((docId) => updateDoc(doc(db, 'responses', docId), { academicYear: '2569' }).catch(() => {}))
        );
      }
    }, (err) => reportListenerError(err, 'responses'));

    const unsubAuditLogs = onSnapshot(
      query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(20)),
      (snap) => {
        const list: AuditLog[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as AuditLog);
        });
        setAuditLogs(list);
      },
      (err) => {
        console.warn('Audit logs listener warning:', err);
      }
    );

    return () => {
      unsubAdmins();
      unsubSupervisors();
      unsubResponses();
      unsubAuditLogs();
    };
  }, [user]);

  // Automatically select the latest academic year from the database once data is loaded
  useEffect(() => {
    if (!hasDefaultedYear && (supervisors.length > 0 || responses.length > 0)) {
      const years = getAcademicYearsOptions();
      if (years.length > 0) {
        const latestYear = years[years.length - 1]; // sorted ascending, last is latest
        if (latestYear) {
          setFilterYear(latestYear);
          setHasDefaultedYear(true);
        }
      }
    }
  }, [supervisors, responses, hasDefaultedYear]);

  // Google Sign-In for BU Admins
  const handleGoogleLogin = async () => {
    setAuthError('');
    setIsProviderDisabled(false);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account',
        hd: 'bu.ac.th'
      });
      
      const result = await signInWithPopup(auth, provider);
      const loggedInUser = result.user;
      const email = (loggedInUser.email || '').toLowerCase();
      
      if (!email || !email.endsWith('@bu.ac.th')) {
        await signOut(auth);
        setAuthError('จำกัดสิทธิ์ใช้งานเฉพาะบัญชี Google ของมหาวิทยาลัยกรุงเทพ (@bu.ac.th) เท่านั้น');
        return;
      }

      await ensureAdminDocument(loggedInUser);
    } catch (err: any) {
      console.error(err);
      const errStr = String(err);
      if (err.code === 'auth/operation-not-allowed') {
        setIsProviderDisabled(true);
        setAuthError('ไม่สามารถล็อกอินได้ เนื่องจากปุ่มเปิดใช้งาน Google Provider ใน Firebase Auth Console ยังไม่ได้ถูกเปิดใช้งาน');
      } else if (err.code === 'auth/popup-blocked') {
        setAuthError('ป๊อปอัปสำหรับล็อกอินถูกบล็อกโดยเบราว์เซอร์ของคุณ กรุณาอนุญาตสิทธิ์ป๊อปอัป หรือเปิดแอปในหน้าต่างใหม่ผ่านปุ่ม "เปิดในแท็บใหม่ (Open in New Tab)"');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setAuthError('กระบวนการเข้าสู่ระบบถูกยกเลิก (cancelled-popup-request) หรือมีการเรียกซ้ำใน iFrame แนะนำให้คลิกปุ่ม "เปิดในแท็บใหม่ (Open in New Tab)" เพื่อทำรายการอย่างเสถียร');
      } else if (errStr.includes('Pending promise was never set') || (err.message && err.message.includes('Pending promise was never set'))) {
        setAuthError('ระบบตรวจพบข้อขัดข้องเนื่องจากการทำงานใน iFrame (Pending promise was never set) กรุณาคลิกปุ่ม "เปิดในแท็บใหม่ (Open in New Tab)" เพื่อเข้าสู่ระบบอย่างสมบูรณ์');
      } else {
        setAuthError('เกิดข้อผิดพลาดในการเข้าใช้งาน: ' + (err.message || 'กรุณาลองใหม่อีกครั้ง') + ' แนะนำให้คลิกเปิดแอปด้วยหน้าต่างใหม่ด้านบน');
      }
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  // Manage Admins (CRUD)
  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingAdmin) return;
    const cleanName = adminName.trim().slice(0, 200);
    const cleanEmail = adminEmail.trim().toLowerCase().slice(0, 128);
    const cleanPos = adminPos.trim().slice(0, 200);
    if (!cleanName || !cleanEmail || !cleanPos) return;

    if (!cleanEmail.endsWith('@bu.ac.th')) {
      showNotice('กรุณาระบุอีเมลของมหาวิทยาลัยกรุงเทพ (@bu.ac.th) เท่านั้น', 'error');
      return;
    }

    setIsSavingAdmin(true);
    try {
      if (editingAdminId) {
        const existingTarget = admins.find((a) => a.id === editingAdminId);
        const isBootstrapped = (existingTarget?.email || '').toLowerCase() === 'walailuk.p@bu.ac.th';
        const docRef = doc(db, 'admins', editingAdminId);
        await updateDoc(docRef, {
          name: cleanName,
          email: isBootstrapped ? 'walailuk.p@bu.ac.th' : cleanEmail,
          position: cleanPos,
          role: isBootstrapped ? 'super_admin' : adminRole
        });
        setEditingAdminId(null);
        showNotice(`อัปเดตข้อมูลผู้ดูแลระบบ ${cleanName} เรียบร้อยแล้ว`, 'success');
      } else {
        const duplicate = admins.some((a) => (a.email || '').toLowerCase() === cleanEmail);
        if (duplicate) {
          showNotice(`อีเมล ${cleanEmail} มีสิทธิ์ผู้ดูแลระบบอยู่ในรายการแล้ว`, 'error');
          return;
        }
        await addDoc(collection(db, 'admins'), {
          uid: '', // Placeholder, merged into admins/{uid} on their first sign-in
          name: cleanName,
          email: cleanEmail,
          position: cleanPos,
          role: adminRole
        });
        showNotice(`เพิ่มสิทธิ์ผู้ดูแลระบบ ${cleanName} เรียบร้อยแล้ว`, 'success');
      }
      setAdminName('');
      setAdminEmail('');
      setAdminPos('');
      setAdminRole('admin');
    } catch (err) {
      showNotice('ไม่สามารถบันทึกข้อมูลผู้ดูแลระบบได้ กรุณาตรวจสอบสิทธิ์หรือลองใหม่อีกครั้ง', 'error');
      try {
        handleFirestoreError(err, editingAdminId ? OperationType.UPDATE : OperationType.CREATE, 'admins');
      } catch {
        // Logged via handleFirestoreError without unhandled promise rejection
      }
    } finally {
      setIsSavingAdmin(false);
    }
  };

  const handleDeleteAdmin = (id: string, email: string) => {
    if ((email || '').toLowerCase() === 'walailuk.p@bu.ac.th') {
      showNotice('ไม่สามารถลบผู้ดูแลระบบหลัก (Bootstrapped Admin) ได้', 'error');
      return;
    }
    setConfirmDialog({
      title: 'ยืนยันการลบสิทธิ์ผู้ดูแลระบบ',
      message: `คุณต้องการลบสิทธิ์การเข้าถึงของผู้ดูแลระบบ (${email}) ออกจากรายการใช่หรือไม่?`,
      confirmLabel: 'ลบสิทธิ์',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'admins', id));
          showNotice('ลบสิทธิ์ผู้ดูแลระบบเรียบร้อยแล้ว', 'success');
        } catch (err) {
          showNotice('เกิดข้อผิดพลาดในการลบสิทธิ์ผู้ดูแลระบบ', 'error');
          try {
            handleFirestoreError(err, OperationType.DELETE, `admins/${id}`);
          } catch {
            // Logged via handleFirestoreError without unhandled promise rejection
          }
        }
      }
    });
  };

  const handleEditAdmin = (adm: Admin) => {
    setEditingAdminId(adm.id || null);
    setAdminName(adm.name);
    setAdminEmail(adm.email);
    setAdminPos(adm.position);
    setAdminRole(adm.role || 'admin');
  };

  // Helper to convert Thai numerals (๐-๙) to Arabic digits
  const normalizeDigits = (val: string) =>
    val.replace(/[๐-๙]/g, (ch) => String(ch.charCodeAt(0) - 0x0e50));

  // Parse Excel/CSV Client-side for Importer
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so re-selecting the same filename triggers onChange
    e.target.value = '';

    setImportStatus('parsing');
    setImportError('');

    const reader = new FileReader();
    reader.onerror = () => {
      setImportError('ไม่สามารถอ่านไฟล์ได้ กรุณาตรวจสอบไฟล์และลองใหม่อีกครั้ง');
      setImportStatus('error');
    };
    reader.onload = async (evt) => {
      try {
        const buffer = evt.target?.result;
        if (!(buffer instanceof ArrayBuffer)) {
          throw new Error('ไม่สามารถอ่านเนื้อหาไฟล์ได้');
        }
        const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
        const wsname = wb.SheetNames[0];
        if (!wsname) {
          throw new Error('ไม่พบแผ่นงาน (Sheet) ในไฟล์ที่เลือก');
        }
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        if (!data || data.length <= 1) {
          throw new Error('ไม่พบข้อมูลผู้ประเมินในไฟล์ของคุณ กรุณาตรวจสอบแถวข้อมูล');
        }

        const headers = (data[0] || []).map(h => String(h ?? '').trim().toLowerCase());
        
        let codeIdx = 0;
        let yearIdx = 1;
        let nameIdx = 2;
        let facIdx = 3;
        let currIdx = 4;
        let depIdx = 5;

        headers.forEach((h, idx) => {
          if (h.includes('รหัส') || h.includes('code') || h.includes('id')) codeIdx = idx;
          if (h.includes('ปี') || h.includes('year') || h.includes('academic')) yearIdx = idx;
          if (h.includes('ชื่อ') || h.includes('name') || h.includes('ผู้บังคับบัญชา')) nameIdx = idx;
          if (h.includes('คณะ') || h.includes('faculty')) facIdx = idx;
          if (h.includes('หลักสูตร') || h.includes('curriculum')) currIdx = idx;
          if (h.includes('สาขา') || h.includes('department') || h.includes('major')) depIdx = idx;
        });

        const defaultAcademicYear = getCurrentAcademicYear();
        const importRecords: Omit<Supervisor, 'id'>[] = [];
        let skippedInvalid = 0;

        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row || row.every(cell => cell === undefined || cell === null || String(cell).trim() === '')) {
            continue;
          }

          const rawCode = normalizeDigits(String(row[codeIdx] ?? '').trim()).replace(/\s+/g, '');
          const rawYear = normalizeDigits(String(row[yearIdx] ?? '').trim()).slice(0, 16);
          const rawName = String(row[nameIdx] ?? '').trim().slice(0, 200);
          const rawFac = String(row[facIdx] ?? '').trim().slice(0, 200);
          const rawCurr = String(row[currIdx] ?? '').trim().slice(0, 200);
          const rawDep = String(row[depIdx] ?? '').trim().slice(0, 200);

          if (!rawCode || !rawName || !/^\d{1,4}$/.test(rawCode)) {
            skippedInvalid++;
            continue;
          }

          const academicYearVal = rawYear.length >= 4 ? rawYear : defaultAcademicYear;

          importRecords.push({
            code: rawCode.padStart(4, '0'),
            academicYear: academicYearVal,
            name: rawName,
            faculty: rawFac || 'คณะเทคโนโลยีสารสนเทศและนวัตกรรม',
            curriculum: rawCurr || 'วิทยาศาสตรบัณฑิต',
            department: rawDep || 'เทคโนโลยีสารสนเทศ',
            isCompleted: false
          });
        }

        if (importRecords.length === 0) {
          throw new Error('ไม่พบข้อมูลแถวที่ถูกต้อง (ต้องมีรหัสตัวเลขไม่เกิน 4 หลัก และชื่อผู้บังคับบัญชา)');
        }

        // Deduplicate against currently loaded supervisors (Spark Plan friendly: avoids N extra queries)
        const existingKeys = new Set(
          supervisors.map((s) => `${s.academicYear}::${s.code}`)
        );
        const newRecords: Omit<Supervisor, 'id'>[] = [];
        for (const record of importRecords) {
          const key = `${record.academicYear}::${record.code}`;
          if (!existingKeys.has(key)) {
            existingKeys.add(key);
            newRecords.push(record);
          }
        }

        const skippedDuplicate = importRecords.length - newRecords.length;
        setImportStats({
          total: importRecords.length,
          imported: 0,
          added: newRecords.length,
          skippedDuplicate,
          skippedInvalid
        });
        setImportStatus('saving');

        // Commit new supervisors in batches (max 400 ops per Firestore batch)
        const BATCH_LIMIT = 400;
        let processedCount = 0;
        for (let offset = 0; offset < newRecords.length; offset += BATCH_LIMIT) {
          const chunk = newRecords.slice(offset, offset + BATCH_LIMIT);
          const batch = writeBatch(db);
          chunk.forEach((record) => {
            const newDocRef = doc(collection(db, 'supervisors'));
            batch.set(newDocRef, record);
          });
          await batch.commit();
          processedCount += chunk.length;
          setImportStats({
            total: importRecords.length,
            imported: processedCount,
            added: newRecords.length,
            skippedDuplicate,
            skippedInvalid
          });
        }

        setImportStatus('success');
        const extraInvalid = skippedInvalid > 0 ? `, ข้ามรูปแบบไม่ถูกต้อง ${skippedInvalid} รายการ` : '';
        showNotice(`นำเข้าข้อมูลผู้ประเมินเสร็จสิ้น (เพิ่มใหม่ ${newRecords.length} รายการ, ข้ามรายการซ้ำ ${skippedDuplicate} รายการ${extraInvalid})`, 'success');
      } catch (err: any) {
        console.error(err);
        const msg = err?.message || '';
        setImportError(
          msg.includes('Quota exceeded')
            ? 'โควต้าการใช้งานฐานข้อมูลรายวันเต็มชั่วคราว กรุณาลองใหม่ในวันถัดไป'
            : (msg || 'โครงสร้างไฟล์ไม่ถูกต้อง กรุณาใช้ไฟล์ตามคำแนะนำอย่างละเอียด')
        );
        setImportStatus('error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Client-side Excel template download for Supervisor Importer
  const handleDownloadSupervisorTemplate = () => {
    if (isDownloadingTemplate) return;
    setIsDownloadingTemplate(true);
    try {
      const headers = ['รหัส', 'ปีการศึกษา', 'ชื่อผู้บังคับบัญชา', 'คณะ', 'หลักสูตร', 'สาขาวิชา'];
      const sampleRows = [
        ['1001', '2569', 'นายสมชาย ใจดี', 'คณะวิศวกรรมศาสตร์', 'วิศวกรรมศาสตรบัณฑิต', 'สาขาวิชาวิศวกรรมคอมพิวเตอร์'],
        ['1002', '2569', 'นางสาวสมหญิง รักเรียน', 'คณะบริหารธุรกิจ', 'บริหารธุรกิจบัณฑิต', 'สาขาวิชาการตลาด']
      ];

      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);

      // Ensure code and academicYear columns are stored explicitly as text so leading zeros are preserved in Excel
      const totalRows = 1 + sampleRows.length;
      for (let r = 0; r < totalRows; r++) {
        for (const colLetter of ['A', 'B']) {
          const cellRef = `${colLetter}${r + 1}`;
          if (worksheet[cellRef]) {
            worksheet[cellRef].t = 's';
            worksheet[cellRef].z = '@';
          }
        }
      }

      worksheet['!cols'] = [
        { wch: 12 }, // รหัส
        { wch: 14 }, // ปีการศึกษา
        { wch: 26 }, // ชื่อผู้บังคับบัญชา
        { wch: 26 }, // คณะ
        { wch: 24 }, // หลักสูตร
        { wch: 30 }  // สาขาวิชา
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Supervisor_Template');
      XLSX.writeFile(workbook, 'supervisor_import_template.xlsx');
      showNotice('ดาวน์โหลดไฟล์ต้นแบบเรียบร้อยแล้ว', 'success');
    } catch (err) {
      console.error('Download template error:', err);
      showNotice('ไม่สามารถสร้างไฟล์ต้นแบบได้ กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  // Safe filename sanitizer for Excel/PDF exports
  const sanitizeFileName = (name: string) => name.replace(/[\\/:*?"<>|]/g, '_');

  // Shared Excel builder for filtered or backup exports
  const exportResponsesExcelList = (targetList: SurveyResponse[], fileLabel: string) => {
    if (targetList.length === 0) {
      showNotice('ไม่มีข้อมูลในรายการที่เลือกเพื่อทำการส่งออก', 'info');
      return;
    }

    const rows = targetList.map(resp => {
      const p1 = resp.part1 || ({} as any);
      const p2 = resp.part2 || ({} as any);
      const p3 = resp.part3 || ({} as any);

      const ratingsCol: Record<string, number> = {};
      for (let i = 1; i <= 13; i++) {
        ratingsCol[`ข้อ ${i}: ${getShortAttributeLabel(i)}`] = Number(p2.ratings?.[i]) || 0;
      }

      const industriesList = Array.isArray(p1.industries)
        ? p1.industries
        : (p1.industries ? [String(p1.industries)] : []);
      const strongPointsList = Array.isArray(p2.strongPoints) ? p2.strongPoints : [];
      const skillsToImproveList = Array.isArray(p2.skillsToImprove) ? p2.skillsToImprove : [];
      const neededMajorsList = Array.isArray(p3.neededMajors) ? p3.neededMajors : [];
      const coreSkillsList = Array.isArray(p3.coreSkills) ? p3.coreSkills : [];
      const selectionCriteriaList = Array.isArray(p3.selectionCriteria) ? p3.selectionCriteria : [];

      const submittedDate = resp.submittedAt ? new Date(resp.submittedAt) : null;
      const formattedDate = submittedDate && !Number.isNaN(submittedDate.getTime())
        ? submittedDate.toLocaleDateString('th-TH')
        : '-';

      return {
        'ปีการศึกษา': resp.academicYear || '-',
        'เดือนที่ตอบ': getThaiMonthName(resp.month || ''),
        'วันที่ส่ง': formattedDate,
        'รหัสแบบประเมิน': resp.supervisorCode || '-',
        'ชื่อคณะวิชา': resp.faculty || '-',
        'หลักสูตร': resp.curriculum || '-',
        'สาขาวิชา': resp.department || '-',
        'ตำแหน่งผู้ตอบ': (p1.position || '-') + (p1.positionOther ? ` (${p1.positionOther})` : ''),
        'ประสบการณ์ทำงานผู้ตอบ': p1.experience || '-',
        'ประเภทหน่วยงาน': (p1.orgType || '-') + (p1.orgTypeOther ? ` (${p1.orgTypeOther})` : ''),
        'กลุ่มอุตสาหกรรม': industriesList.join(', ') + (p1.industriesOther ? ` (${p1.industriesOther})` : ''),
        'ระยะทำงานของบัณฑิต': p1.graduateDuration || '-',
        ...ratingsCol,
        'สิ่งที่ประทับใจลำดับต้นๆ': strongPointsList.join(' | ') + (p2.strongPointsOther ? ` (${p2.strongPointsOther})` : ''),
        'ทักษะที่ควรพัฒนาเพิ่ม': skillsToImproveList.join(' | ') + (p2.skillsToImproveOther ? ` (${p2.skillsToImproveOther})` : ''),
        'ข้อเสนอแนะเพิ่มเติม': p2.suggestions || '',
        'สาขาที่ทำงานต้องการรับเพิ่ม': neededMajorsList.join(', ') + (p3.neededMajorsOther ? ` (${p3.neededMajorsOther})` : ''),
        'ทักษะหลักที่ทำงานต้องการ': coreSkillsList.join(', ') + (p3.coreSkillsOther ? ` (${p3.coreSkillsOther})` : ''),
        'ต้องการบุคลากรมีประสบการณ์': p3.requiresExperience === 'yes' ? `ต้องการ (${p3.experienceMonths || 0} เดือน)` : 'ไม่ต้องการ',
        'เกณฑ์คัดเลือกบุคลากรหลัก': selectionCriteriaList.join(', ') + (p3.selectionCriteriaOther ? ` (${p3.selectionCriteriaOther})` : '')
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'รายงานแบบสำรวจดิบ');

    // Generate average statistics sheet as well!
    const summaryRows: Record<string, string | number>[] = [];
    const computeMeanForGroup = (indices: number[]) => {
      const vals = indices.map((idx) => {
        const sum = targetList.reduce((acc, cr) => acc + (Number(cr.part2?.ratings?.[idx]) || 0), 0);
        return targetList.length > 0 ? (sum / targetList.length) / 2 : 0;
      });
      return parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2));
    };

    for (let i = 1; i <= 13; i++) {
      const sum = targetList.reduce((acc, cr) => acc + (Number(cr.part2?.ratings?.[i]) || 0), 0);
      const avg = targetList.length > 0 ? (sum / targetList.length) / 2 : 0;
      summaryRows.push({
        'ข้อที่': i,
        'คุณลักษณะประเมิน': getAttributeFullLabel(i),
        'คะแนนรวม': sum,
        'คะแนนเฉลี่ย (Mean - เต็ม 5)': parseFloat(avg.toFixed(2))
      });
    }

    // Add Domain-Specific Mean aggregates
    summaryRows.push({}); // Empty separator row
    summaryRows.push({
      'ข้อที่': 'รายด้าน',
      'คุณลักษณะประเมิน': '1. ด้านคุณภาพบัณฑิตตามกรอบ TQF (ข้อ 1 - ข้อ 5)',
      'คะแนนรวม': '-',
      'คะแนนเฉลี่ย (Mean - เต็ม 5)': computeMeanForGroup([1, 2, 3, 4, 5])
    });
    summaryRows.push({
      'ข้อที่': 'รายด้าน',
      'คุณลักษณะประเมิน': '2. ด้านการพัฒนาบัณฑิตตามอัตลักษณ์ (ข้อ 6 - ข้อ 8, ข้อ 5)',
      'คะแนนรวม': '-',
      'คะแนนเฉลี่ย (Mean - เต็ม 5)': computeMeanForGroup([6, 7, 8, 5])
    });
    summaryRows.push({
      'ข้อที่': 'รายด้าน',
      'คุณลักษณะประเมิน': '3. ด้านการพัฒนาตาม BU 5 (ข้อ 9 - ข้อ 12, ข้อ 6)',
      'คะแนนรวม': '-',
      'คะแนนเฉลี่ย (Mean - เต็ม 5)': computeMeanForGroup([9, 10, 11, 12, 6])
    });

    const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'รายงานวิเคราะห์เชิงลึก');

    XLSX.writeFile(workbook, sanitizeFileName(fileLabel));
    showNotice('ส่งออกไฟล์รายงาน Excel (.xlsx) เรียบร้อยแล้ว', 'success');
  };

  // Export Filtered Table to Excel using xlsx client-side
  const handleExportFilteredResponses = () => {
    if (filteredResponses.length === 0) {
      showNotice('ไม่มีข้อมูลในตัวกรองปัจจุบันเพื่อทำการส่งออก', 'info');
      return;
    }
    let prefix = 'รายงานแบบสำรวจคุณภาพบัณฑิต_BU';
    if (filterFaculty !== 'all') prefix += `_คณะ_${filterFaculty}`;
    if (filterDepartment !== 'all') prefix += `_สาขา_${filterDepartment}`;
    const fname = `${prefix}_ปี_${filterYear}_เดือน_${filterMonth === 'all' ? 'ทั้งหมด' : getThaiMonthName(filterMonth)}.xlsx`;
    exportResponsesExcelList(filteredResponses, fname);
  };

  // Helper labels mapping
  const getShortAttributeLabel = (idx: number) => {
    const list = [
      'คุณธรรม', 'ความรู้', 'ทักษะทางปัญญา', 'ความสัมพันธ์',
      'ไอที/สื่อสาร', 'ความคิดสร้างสรรค์', 'ผู้ประกอบการ', 'สากล',
      'ฉลาดถาม', 'ไหวพริบ', 'ทำงานร่วมกัน', 'สู้สิ่งที่รัก', 'ภาพรวม'
    ];
    return list[idx - 1] || 'ข้อ';
  };

  const getAttributeFullLabel = (idx: number) => {
    const list = [
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
      'ความพึงพอใจในภาพรวม'
    ];
    return list[idx - 1] || '';
  };

  // Filter computations
  const getAcademicYearsOptions = () => {
    const years = new Set<string>();
    responses.forEach(r => { if (r.academicYear) years.add(r.academicYear); });
    supervisors.forEach(s => { if (s.academicYear) years.add(s.academicYear); });
    return Array.from(years).sort();
  };

  const getFacultyOptions = () => {
    const faculties = new Set<string>();
    responses.forEach(r => { if (r.faculty) faculties.add(r.faculty); });
    supervisors.forEach(s => { if (s.faculty) faculties.add(s.faculty); });
    return Array.from(faculties).sort();
  };

  const getDepartmentOptions = () => {
    const departments = new Set<string>();
    responses.forEach(r => {
      if (r.department && (filterFaculty === 'all' || r.faculty === filterFaculty)) {
        departments.add(r.department);
      }
    });
    supervisors.forEach(s => {
      if (s.department && (filterFaculty === 'all' || s.faculty === filterFaculty)) {
        departments.add(s.department);
      }
    });
    return Array.from(departments).sort();
  };

  const filteredResponses = responses.filter(resp => {
    const matchYr = filterYear === 'all' || resp.academicYear === filterYear;
    const matchMo = filterMonth === 'all' || resp.month === filterMonth;
    const matchFac = filterFaculty === 'all' || resp.faculty === filterFaculty;
    const matchDept = filterDepartment === 'all' || resp.department === filterDepartment;
    return matchYr && matchMo && matchFac && matchDept;
  });

  const filteredSupervisors = supervisors.filter(sup => {
    const matchYr = filterYear === 'all' || sup.academicYear === filterYear;
    const matchFac = filterFaculty === 'all' || sup.faculty === filterFaculty;
    const matchDept = filterDepartment === 'all' || sup.department === filterDepartment;
    return matchYr && matchFac && matchDept;
  });

  const searchedSupervisors = filteredSupervisors.filter(sup => {
    const term = supervisorSearch.trim().toLowerCase();
    if (!term) return true;
    return (
      (sup.code || '').toLowerCase().includes(term) ||
      (sup.name || '').toLowerCase().includes(term) ||
      (sup.faculty || '').toLowerCase().includes(term) ||
      (sup.curriculum || '').toLowerCase().includes(term) ||
      (sup.department || '').toLowerCase().includes(term)
    );
  }).sort((a, b) => {
    return (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' });
  });

  const supervisorItemsPerPage = 15;
  const totalSupervisorPages = Math.max(1, Math.ceil(searchedSupervisors.length / supervisorItemsPerPage));
  const currentSupervisorPage = Math.min(supervisorPage, totalSupervisorPages);
  const paginatedSupervisors = searchedSupervisors.slice(
    (currentSupervisorPage - 1) * supervisorItemsPerPage,
    currentSupervisorPage * supervisorItemsPerPage
  );

  const handleDeleteSupervisor = (id: string, code: string) => {
    setConfirmDialog({
      title: 'ยืนยันการลบข้อมูลผู้ประเมิน',
      message: `คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลสิทธิ์ผู้ประเมินรหัส ${code}?`,
      confirmLabel: 'ลบข้อมูล',
      onConfirm: async () => {
        try {
          if (id) {
            await deleteDoc(doc(db, 'supervisors', id));
            showNotice(`ลบข้อมูลผู้ประเมินรหัส ${code} เรียบร้อยแล้ว`, 'success');
          }
        } catch (err) {
          showNotice('เกิดข้อผิดพลาดในการลบข้อมูลผู้ประเมิน', 'error');
          try {
            handleFirestoreError(err, OperationType.DELETE, `supervisors/${id}`);
          } catch {
            // Logged cleanly via handleFirestoreError
          }
        }
      }
    });
  };

  // Calculate stats dynamically according to the user's rules:
  // 1. หากเลือกแค่ปีการศึกษา -> คิดสัดส่วนจากฐานข้อมูลผู้ประเมินทั้งหมดในระบบของปีการศึกษานั้น
  // 2. หากเลือกปีการศึกษาและรายคณะ -> คิดสัดส่วนจากฐานข้อมูลผู้ประเมินของปีการศึกษา/คณะที่เลือก
  // 3. หากเลือกปีการศึกษา รายคณะ และรายสาขาวิชา -> คิดสัดส่วนจากฐานข้อมูลผู้ประเมินของปีการศึกษา/คณะ/สาขาวิชาที่เลือก
  const totalSentCount = supervisors.filter(sup =>
    (filterYear === 'all' || sup.academicYear === filterYear) &&
    (filterFaculty === 'all' || sup.faculty === filterFaculty) &&
    (filterDepartment === 'all' || sup.department === filterDepartment)
  ).length;

  const totalCompletedCount = filteredResponses.length;
  const responseRate = totalSentCount > 0 ? (totalCompletedCount / totalSentCount) * 100 : 0;

  // Average Score per attribute (ignoring null/unanswered ratings so row 13 matches overallItem13Mean)
  const attributeSums = Array(13).fill(0);
  const attributeCounts = Array(13).fill(0);
  filteredResponses.forEach(resp => {
    for (let i = 1; i <= 13; i++) {
      const rawVal = Number(resp.part2?.ratings?.[i]);
      if (Number.isFinite(rawVal) && rawVal >= 1 && rawVal <= 10) {
        attributeSums[i - 1] += rawVal;
        attributeCounts[i - 1] += 1;
      }
    }
  });
  const attributeMeans = attributeSums.map((sum, idx) =>
    attributeCounts[idx] > 0 ? parseFloat(((sum / attributeCounts[idx]) / 2).toFixed(2)) : 0
  );
  const compositeMean = attributeMeans.length > 0 ? parseFloat((attributeMeans.reduce((a, b) => a + b, 0) / attributeMeans.length).toFixed(2)) : 0;

  // Item #13 standalone overall satisfaction mean (scale 1-10 converted to 5.00, ignoring null/unanswered)
  let item13Sum = 0;
  let item13Count = 0;
  filteredResponses.forEach(resp => {
    const rawVal = Number(resp.part2?.ratings?.[13]);
    if (Number.isFinite(rawVal) && rawVal >= 1 && rawVal <= 10) {
      item13Sum += rawVal / 2;
      item13Count += 1;
    }
  });
  const overallItem13Mean: number | null = item13Count > 0 ? parseFloat((item13Sum / item13Count).toFixed(2)) : null;

  // Domain-specific mean calculations
  // 1. ด้านคุณภาพบัณฑิตตามกรอบ TQF (ข้อ 1 - ข้อ 5) -> Indices 0, 1, 2, 3, 4
  const tqfMean = attributeMeans.length >= 5
    ? parseFloat(((attributeMeans[0] + attributeMeans[1] + attributeMeans[2] + attributeMeans[3] + attributeMeans[4]) / 5).toFixed(2))
    : 0;

  // 2. ด้านการพัฒนาบัณฑิตตามอัตลักษณ์ (ข้อ 6 - ข้อ 8, ข้อ 5) -> Indices 5, 6, 7 and 4
  const identityMean = attributeMeans.length >= 8
    ? parseFloat(((attributeMeans[5] + attributeMeans[6] + attributeMeans[7] + attributeMeans[4]) / 4).toFixed(2))
    : 0;

  // 3. ด้านการพัฒนาตาม BU 5 (ข้อ 9 - ข้อ 12, ข้อ 6) -> Indices 8, 9, 10, 11 and 5
  const dnaMean = attributeMeans.length >= 12
    ? parseFloat(((attributeMeans[8] + attributeMeans[9] + attributeMeans[10] + attributeMeans[11] + attributeMeans[5]) / 5).toFixed(2))
    : 0;

  // Response count grouped by Faculty for SVG chart preview
  const facultyCounts: Record<string, number> = {};
  filteredResponses.forEach(r => {
    facultyCounts[r.faculty] = (facultyCounts[r.faculty] || 0) + 1;
  });

  // --- IN-DEPTH SURVEY AGGREGATIONS (INFOGRAPHIC DATA) ---
  const positionsStats: Record<string, number> = {};
  const experiencesStats: Record<string, number> = {};
  const orgTypesStats: Record<string, number> = {};
  const industriesStats: Record<string, number> = {};
  const graduateDurationsStats: Record<string, number> = {};

  const ratingsDistribution: Record<number, Record<number, number>> = {};
  for (let i = 1; i <= 13; i++) {
    ratingsDistribution[i] = { 10: 0, 9: 0, 8: 0, 7: 0, 6: 0, 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  }
  const strongPointsStats: Record<string, number> = {};
  const skillsToImproveStats: Record<string, number> = {};
  const responseSuggestions: { id: string; text: string; faculty: string; date: string }[] = [];

  const neededMajorsStats: Record<string, number> = {};
  const coreSkillsStats: Record<string, number> = {};
  let reqExperienceYes = 0;
  let reqExperienceNo = 0;
  let totalExperienceMonthsSum = 0;
  let totalExperienceMonthsCount = 0;
  const selectionCriteriaStats: Record<string, number> = {};

  filteredResponses.forEach(resp => {
    // 1. Part 1
    if (resp.part1) {
      if (resp.part1.position) {
        const posKey = resp.part1.position === 'อื่นๆ (โปรดระบุ)' && resp.part1.positionOther ? resp.part1.positionOther : resp.part1.position;
        positionsStats[posKey] = (positionsStats[posKey] || 0) + 1;
      }
      if (resp.part1.experience) {
        experiencesStats[resp.part1.experience] = (experiencesStats[resp.part1.experience] || 0) + 1;
      }
      if (resp.part1.orgType) {
        const orgKey = resp.part1.orgType === 'อื่นๆ (โปรดระบุ)' && resp.part1.orgTypeOther ? resp.part1.orgTypeOther : resp.part1.orgType;
        orgTypesStats[orgKey] = (orgTypesStats[orgKey] || 0) + 1;
      }
      if (resp.part1.industries) {
        const indList = Array.isArray(resp.part1.industries) ? resp.part1.industries : [resp.part1.industries];
        indList.forEach(ind => {
          const indKey = ind === 'อื่นๆ (โปรดระบุ)' && resp.part1.industriesOther ? resp.part1.industriesOther : ind;
          if (indKey) industriesStats[indKey] = (industriesStats[indKey] || 0) + 1;
        });
      }
      if (resp.part1.graduateDuration) {
        graduateDurationsStats[resp.part1.graduateDuration] = (graduateDurationsStats[resp.part1.graduateDuration] || 0) + 1;
      }
    }

    // 2. Part 2
    if (resp.part2) {
      if (resp.part2.ratings) {
        for (let i = 1; i <= 13; i++) {
          const ratingVal = Number(resp.part2.ratings[i]);
          if (ratingVal >= 1 && ratingVal <= 10) {
            ratingsDistribution[i][ratingVal] = (ratingsDistribution[i][ratingVal] || 0) + 1;
          }
        }
      }
      if (Array.isArray(resp.part2.strongPoints)) {
        resp.part2.strongPoints.forEach(sp => {
          const spKey = sp === 'อื่นๆ (โปรดระบุ)' && resp.part2.strongPointsOther ? resp.part2.strongPointsOther : sp;
          strongPointsStats[spKey] = (strongPointsStats[spKey] || 0) + 1;
        });
      }
      if (Array.isArray(resp.part2.skillsToImprove)) {
        resp.part2.skillsToImprove.forEach(sk => {
          const skKey = sk === 'อื่นๆ (โปรดระบุ)' && resp.part2.skillsToImproveOther ? resp.part2.skillsToImproveOther : sk;
          skillsToImproveStats[skKey] = (skillsToImproveStats[skKey] || 0) + 1;
        });
      }
      if (resp.part2.suggestions && resp.part2.suggestions.trim()) {
        responseSuggestions.push({
          id: resp.id || String(Math.random()),
          text: resp.part2.suggestions.trim(),
          faculty: resp.faculty,
          date: new Date(resp.submittedAt).toLocaleDateString('th-TH')
        });
      }
    }

    // 3. Part 3
    if (resp.part3) {
      if (Array.isArray(resp.part3.neededMajors)) {
        resp.part3.neededMajors.forEach(mj => {
          const mjKey = mj === 'สาขาวิชาอื่นๆ (ระบุ)' && resp.part3.neededMajorsOther ? resp.part3.neededMajorsOther : mj;
          neededMajorsStats[mjKey] = (neededMajorsStats[mjKey] || 0) + 1;
        });
      }
      if (Array.isArray(resp.part3.coreSkills)) {
        resp.part3.coreSkills.forEach(cs => {
          const csKey = cs === 'ทักษะสำคัญอื่นๆ (ระบุ)' && resp.part3.coreSkillsOther ? resp.part3.coreSkillsOther : cs;
          coreSkillsStats[csKey] = (coreSkillsStats[csKey] || 0) + 1;
        });
      }
      if (resp.part3.requiresExperience === 'yes') {
        reqExperienceYes++;
        if (resp.part3.experienceMonths) {
          totalExperienceMonthsSum += Number(resp.part3.experienceMonths);
          totalExperienceMonthsCount++;
        }
      } else {
        reqExperienceNo++;
      }
      if (Array.isArray(resp.part3.selectionCriteria)) {
        resp.part3.selectionCriteria.forEach(sc => {
          const scKey = sc === 'อื่นๆ (ระบุ)' && resp.part3.selectionCriteriaOther ? resp.part3.selectionCriteriaOther : sc;
          selectionCriteriaStats[scKey] = (selectionCriteriaStats[scKey] || 0) + 1;
        });
      }
    }
  });

  const getScoreInterpretation = (score: number) => {
    if (score >= 4.5) return { label: 'มากที่สุด', bg: 'bg-emerald-100 text-emerald-800 border border-emerald-200' };
    if (score >= 3.5) return { label: 'มาก', bg: 'bg-indigo-100 text-indigo-800 border border-indigo-200' };
    if (score >= 2.5) return { label: 'ปานกลาง', bg: 'bg-amber-100 text-amber-800 border border-amber-200' };
    if (score >= 1.5) return { label: 'น้อย', bg: 'bg-orange-100 text-orange-800 border border-orange-200' };
    return { label: 'น้อยที่สุด', bg: 'bg-rose-100 text-rose-800 border border-rose-200' };
  };

  const handleOpenPdfPreview = async () => {
    if (isPreparingPdfPreview) return;
    if (pdfSuccessTimerRef.current !== null) {
      window.clearTimeout(pdfSuccessTimerRef.current);
      pdfSuccessTimerRef.current = null;
    }
    setIsPreparingPdfPreview(true);
    setPdfPreviewError(null);
    setPdfDownloadSuccess(false);

    try {
      const assets = await extractTemplateAssets();
      const reportData = buildSurveyReportData({
        filteredResponses,
        allResponses: responses,
        allSupervisors: supervisors,
        filterYear,
        filterMonth,
        filterFaculty,
        filterDepartment,
        totalSentCount,
        getThaiMonthName,
        assets,
      });

      const { styleCss, bodyHtml } = renderSurveyReportFragment(reportData);
      const yearSuffix =
        filterYear && filterYear !== 'all'
          ? filterYear.replace(/[^a-zA-Z0-9_-]/g, '')
          : 'All';
      const fileName = `Employer_Survey_Report_${yearSuffix || 'All'}.pdf`;

      setPdfPreviewContent({ styleCss, bodyHtml, fileName });
      setIsPdfPreviewOpen(true);
    } catch (err) {
      console.error('Failed to build PDF preview:', err);
      showNotice('เกิดข้อผิดพลาดในการเตรียมตัวอย่างรายงาน PDF กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setIsPreparingPdfPreview(false);
    }
  };

  const handleDownloadPdfFromPreview = async () => {
    if (isGeneratingPdf || !pdfPreviewContent) return;
    if (pdfSuccessTimerRef.current !== null) {
      window.clearTimeout(pdfSuccessTimerRef.current);
      pdfSuccessTimerRef.current = null;
    }
    setIsGeneratingPdf(true);
    setPdfPreviewError(null);
    setPdfDownloadSuccess(false);

    try {
      const initialContainerEl = pdfPreviewContainerRef.current;
      if (!initialContainerEl) {
        throw new Error('ไม่พบองค์ประกอบรายงานสำหรับสร้างไฟล์ PDF');
      }

      if (document.fonts && document.fonts.ready) {
        await Promise.race([
          document.fonts.ready,
          new Promise<void>((resolve) => window.setTimeout(resolve, 2500)),
        ]);
      }

      const imgs: HTMLImageElement[] = Array.from(
        initialContainerEl.querySelectorAll('img')
      ) as HTMLImageElement[];
      if (imgs.length > 0) {
        await Promise.all(
          imgs.map(async (img: HTMLImageElement) => {
            if (!img.complete) {
              await new Promise<void>((resolve) => {
                img.addEventListener('load', () => resolve(), { once: true });
                img.addEventListener('error', () => resolve(), { once: true });
                window.setTimeout(resolve, 1500);
              });
            }
            if (typeof img.decode === 'function') {
              try {
                await Promise.race([
                  img.decode(),
                  new Promise<void>((resolve) => window.setTimeout(resolve, 800)),
                ]);
              } catch {
                // Continue even if decode fails
              }
            }
          })
        );
      }

      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            window.setTimeout(resolve, 180);
          });
        });
      });

      // Resolve live connected target AFTER all React updates and font/image waits settle
      const latestContainerEl = pdfPreviewContainerRef.current;
      const rootNode =
        (latestContainerEl?.querySelector('#bu-pdf-capture-root') as HTMLElement | null) ??
        latestContainerEl;
      if (!rootNode || !rootNode.isConnected) {
        throw new Error('ไม่พบองค์ประกอบรายงานที่แสดงผลอยู่ในหน้าจอ');
      }

      const captureWidth = 794;
      const captureHeight = Math.max(1123, Math.ceil(rootNode.scrollHeight || 1123));

      const canvas = await html2canvas(rootNode, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        x: 0,
        y: 0,
        width: captureWidth,
        height: captureHeight,
        windowWidth: captureWidth,
        windowHeight: captureHeight,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc, clonedElement) => {
          const pdfStyleEl = clonedDoc.querySelector('style[data-bu-pdf-style="true"]');
          if (pdfStyleEl) {
            clonedDoc.head.appendChild(pdfStyleEl);
          }

          Array.from(clonedDoc.querySelectorAll('style')).forEach((styleEl) => {
            if (styleEl.getAttribute('data-bu-pdf-style') !== 'true') {
              styleEl.remove();
            }
          });
          Array.from(clonedDoc.querySelectorAll('link[rel="stylesheet"]')).forEach((linkEl) => {
            const href = linkEl.getAttribute('href') || '';
            if (!href.includes('fonts.googleapis.com')) {
              linkEl.remove();
            }
          });

          clonedDoc.documentElement.className = '';
          clonedDoc.documentElement.style.cssText = 'margin:0;padding:0;background:#ffffff;';
          clonedDoc.body.className = '';
          clonedDoc.body.style.cssText = 'margin:0;padding:0;background:#ffffff;color:#25303c;';

          if (clonedElement) {
            clonedDoc.body.replaceChildren(clonedElement);
          }
        },
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgData = canvas.toDataURL('image/png', 1.0);
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight <= pageHeight + 2) {
        const fittedHeight = Math.min(imgHeight, pageHeight);
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, fittedHeight, undefined, 'FAST');
      } else {
        let heightLeft = imgHeight;
        let yOffset = 0;
        pdf.addImage(imgData, 'PNG', 0, yOffset, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
        while (heightLeft > 1) {
          yOffset -= pageHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, yOffset, imgWidth, imgHeight, undefined, 'FAST');
          heightLeft -= pageHeight;
        }
      }

      const fileName = pdfPreviewContent.fileName;
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      try {
        const tempLink = document.createElement('a');
        tempLink.href = blobUrl;
        tempLink.download = fileName;
        tempLink.style.display = 'none';
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);
      } catch {
        pdf.save(fileName);
      } finally {
        window.setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 1000);
      }

      setPdfDownloadSuccess(true);
      pdfSuccessTimerRef.current = window.setTimeout(() => {
        setPdfDownloadSuccess(false);
        pdfSuccessTimerRef.current = null;
      }, 2000);
    } catch (err) {
      console.error('PDF export failed:', err);
      const errMessage = err instanceof Error ? err.message : '';
      setPdfPreviewError(
        errMessage
          ? `เกิดข้อผิดพลาดในการสร้างไฟล์ PDF: ${errMessage}`
          : 'เกิดข้อผิดพลาดในการสร้างไฟล์ PDF กรุณาลองใหม่อีกครั้ง'
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrintPdfPreview = () => {
    if (!pdfPreviewContent) return;
    setPdfPreviewError(null);
    let iframe: HTMLIFrameElement | null = null;
    let cleanupTimer: number | null = null;

    const cleanup = () => {
      if (cleanupTimer !== null) {
        window.clearTimeout(cleanupTimer);
        cleanupTimer = null;
      }
      if (iframe && iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
        iframe = null;
      }
    };

    try {
      iframe = document.createElement('iframe');
      iframe.setAttribute('aria-hidden', 'true');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      const iframeWin = iframe.contentWindow;
      if (!iframeDoc || !iframeWin) {
        throw new Error('ไม่สามารถเปิดหน้าต่างพิมพ์ในเบราว์เซอร์นี้ได้');
      }

      iframeDoc.open();
      iframeDoc.write(`<!doctype html><html lang="th"><head><meta charset="utf-8"><title>${pdfPreviewContent.fileName}</title><link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet"><style>@page{size:A4;margin:0}html,body{margin:0;padding:0;background:#ffffff;-webkit-print-color-adjust:exact;print-color-adjust:exact}${pdfPreviewContent.styleCss}</style></head><body>${pdfPreviewContent.bodyHtml}</body></html>`);
      iframeDoc.close();

      iframeWin.addEventListener('afterprint', cleanup, { once: true });
      cleanupTimer = window.setTimeout(cleanup, 60000);
      window.setTimeout(() => {
        try {
          iframeWin.focus();
          iframeWin.print();
        } catch (printErr) {
          console.error('Print trigger failed:', printErr);
          cleanup();
          setPdfPreviewError('เบราว์เซอร์ไม่อนุญาตให้เปิดหน้าพิมพ์อัตโนมัติ กรุณากดปุ่ม "ดาวน์โหลด PDF (.pdf)" แทน');
        }
      }, 250);
    } catch (err) {
      console.error('Print failed:', err);
      cleanup();
      setPdfPreviewError('ไม่สามารถเปิดหน้าพิมพ์ได้ กรุณากดปุ่ม "ดาวน์โหลด PDF (.pdf)" แทน');
    }
  };

  const avgExperienceMonths = totalExperienceMonthsCount > 0 ? parseFloat((totalExperienceMonthsSum / totalExperienceMonthsCount).toFixed(1)) : 0;

  // Academic years with actual response counts (for Delete Responses by Academic Year view)
  const responseYearCounts = React.useMemo(() => {
    const map = new Map<string, number>();
    responses.forEach((r) => {
      if (r.academicYear) {
        map.set(r.academicYear, (map.get(r.academicYear) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([year, count]) => ({ year, count }));
  }, [responses]);

  const selectedDeleteRespCount = React.useMemo(() => {
    if (!deleteRespYear) return 0;
    return responseYearCounts.find((item) => item.year === deleteRespYear)?.count || 0;
  }, [deleteRespYear, responseYearCounts]);

  // Delete Survey Responses by Academic Year (with Audit Log)
  const handleConfirmDeleteResponsesByYear = async () => {
    if (!user || !deleteRespYear || isDeletingResponses) return;
    if (deleteRespConfirmInput.trim() !== deleteRespYear) return;

    const userEmail = (user.email || '').toLowerCase();
    if (!userEmail.endsWith('@bu.ac.th')) {
      showNotice('ไม่มีสิทธิ์ดำเนินการ ลบข้อมูลได้เฉพาะบัญชี @bu.ac.th ที่ได้รับอนุญาตเท่านั้น', 'error');
      return;
    }

    setIsDeletingResponses(true);
    const targetYear = deleteRespYear;
    let deletedCount = 0;

    try {
      const qCopy = query(collection(db, 'responses'), where('academicYear', '==', targetYear));
      const snap = await getDocs(qCopy);
      const BATCH_LIMIT = 400;

      for (let offset = 0; offset < snap.docs.length; offset += BATCH_LIMIT) {
        const chunk = snap.docs.slice(offset, offset + BATCH_LIMIT);
        const batch = writeBatch(db);
        chunk.forEach((docSnap) => batch.delete(doc(db, 'responses', docSnap.id)));
        await batch.commit();
        deletedCount += chunk.length;
      }

      const qLocks = query(collection(db, 'survey_completions'), where('academicYear', '==', targetYear));
      const lockSnap = await getDocs(qLocks);
      for (let offset = 0; offset < lockSnap.docs.length; offset += BATCH_LIMIT) {
        const chunk = lockSnap.docs.slice(offset, offset + BATCH_LIMIT);
        const batch = writeBatch(db);
        chunk.forEach((docSnap) => batch.delete(doc(db, 'survey_completions', docSnap.id)));
        await batch.commit();
      }

      // Record Audit Log in Firestore
      try {
        await addDoc(collection(db, 'audit_logs'), {
          action: 'DELETE_RESPONSES_BY_YEAR',
          adminUid: user.uid,
          adminEmail: userEmail,
          academicYear: targetYear,
          count: deletedCount,
          timestamp: serverTimestamp()
        });
      } catch (auditErr) {
        try {
          handleFirestoreError(auditErr, OperationType.CREATE, 'audit_logs');
        } catch {
          // Logged cleanly via handleFirestoreError
        }
      }

      setShowDeleteRespModal(false);
      setDeleteRespConfirmInput('');
      setDeleteRespYear('');
      showNotice(`ลบข้อมูลปีการศึกษา ${targetYear} จำนวน ${deletedCount} รายการ เรียบร้อยแล้ว`, 'success');
    } catch (err) {
      console.error('Delete responses by year error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      showNotice(
        msg.includes('Quota exceeded')
          ? 'โควต้าการใช้งานฐานข้อมูลรายวันเต็มชั่วคราว กรุณาลองใหม่ในวันถัดไป'
          : 'เกิดข้อผิดพลาดในการลบข้อมูลการตอบกลับ กรุณาตรวจสอบสิทธิ์หรือลองใหม่อีกครั้ง',
        'error'
      );
      try {
        handleFirestoreError(err, OperationType.DELETE, 'responses');
      } catch {
        // Logged cleanly via handleFirestoreError
      }
    } finally {
      setIsDeletingResponses(false);
    }
  };

  // Export Backup Excel before Resetting Survey Codes (Supervisors + Responses)
  const handleExportBackupBeforeReset = () => {
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Supervisors snapshot
    const supRows = supervisors.map((s) => ({
      'รหัส 4 หลัก': s.code,
      'ปีการศึกษา': s.academicYear,
      'ชื่อผู้บังคับบัญชา': s.name,
      'คณะ': s.faculty,
      'หลักสูตร': s.curriculum,
      'สาขาวิชา': s.department,
      'สถานะการประเมิน': s.isCompleted ? 'ประเมินแล้ว' : 'ยังไม่ใช้งาน',
      'วันที่ตอบสำเร็จ': s.completedAt || '-'
    }));
    const supSheet = XLSX.utils.json_to_sheet(
      supRows.length > 0 ? supRows : [{ 'หมายเหตุ': 'ไม่มีข้อมูลรายชื่อผู้ประเมินในระบบ' }]
    );
    XLSX.utils.book_append_sheet(workbook, supSheet, 'รายชื่อรหัสผู้ประเมิน');

    // Sheet 2: Responses backup
    const respRows = responses.map((resp) => {
      const p1 = resp.part1 || ({} as any);
      const p2 = resp.part2 || ({} as any);
      const p3 = resp.part3 || ({} as any);
      const ratingsCol: Record<string, number> = {};
      for (let i = 1; i <= 13; i++) {
        ratingsCol[`ข้อ ${i}: ${getShortAttributeLabel(i)}`] = Number(p2.ratings?.[i]) || 0;
      }
      return {
        'ปีการศึกษา': resp.academicYear || '-',
        'เดือน': resp.month || '-',
        'วันที่ส่ง': resp.submittedAt || '-',
        'รหัสแบบประเมิน': resp.supervisorCode || '-',
        'คณะ': resp.faculty || '-',
        'หลักสูตร': resp.curriculum || '-',
        'สาขาวิชา': resp.department || '-',
        'ตำแหน่งผู้ตอบ': p1.position || '-',
        'ประเภทหน่วยงาน': p1.orgType || '-',
        ...ratingsCol,
        'ข้อเสนอแนะ': p2.suggestions || '',
        'ต้องการมีประสบการณ์': p3.requiresExperience || '-'
      };
    });
    const respSheet = XLSX.utils.json_to_sheet(
      respRows.length > 0 ? respRows : [{ 'หมายเหตุ': 'ยังไม่มีข้อมูลการตอบกลับในระบบ' }]
    );
    XLSX.utils.book_append_sheet(workbook, respSheet, 'ข้อมูลการตอบกลับเดิม');

    const dateTag = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, sanitizeFileName(`สำรองข้อมูลก่อนรีเซ็ตรหัสแบบสำรวจ_BU_${dateTag}.xlsx`));
    setHasBackedUpBeforeReset(true);
    showNotice('สำรองข้อมูล Excel เรียบร้อยแล้ว สามารถดำเนินการรีเซ็ตสถานะรหัสได้', 'success');
  };

  // Reset all supervisor survey codes to unused (isCompleted: false, remove completedAt)
  const handleConfirmResetSurveyCodes = async () => {
    if (!user || !hasBackedUpBeforeReset || isResettingCodes) return;
    if (resetCodesConfirmInput.trim().toUpperCase() !== 'RESET') return;

    const userEmail = (user.email || '').toLowerCase();
    if (!userEmail.endsWith('@bu.ac.th')) {
      showNotice('ไม่มีสิทธิ์ดำเนินการ จำกัดเฉพาะบัญชี @bu.ac.th ที่ได้รับอนุญาตเท่านั้น', 'error');
      return;
    }

    setIsResettingCodes(true);
    setResetCodesStatusMsg(null);
    let resetCount = 0;
    let clearedRespCount = 0;

    try {
      const supSnap = await getDocs(collection(db, 'supervisors'));
      const BATCH_LIMIT = 400;

      for (let offset = 0; offset < supSnap.docs.length; offset += BATCH_LIMIT) {
        const chunk = supSnap.docs.slice(offset, offset + BATCH_LIMIT);
        const batch = writeBatch(db);
        chunk.forEach((docSnap) => {
          batch.update(doc(db, 'supervisors', docSnap.id), {
            isCompleted: false,
            completedAt: deleteField()
          });
        });
        await batch.commit();
        resetCount += chunk.length;
      }

      // Clear survey_completions locks so reset codes can be reused
      const locksSnap = await getDocs(collection(db, 'survey_completions'));
      for (let offset = 0; offset < locksSnap.docs.length; offset += BATCH_LIMIT) {
        const chunk = locksSnap.docs.slice(offset, offset + BATCH_LIMIT);
        const batch = writeBatch(db);
        chunk.forEach((docSnap) => {
          batch.delete(doc(db, 'survey_completions', docSnap.id));
        });
        await batch.commit();
      }

      if (resetOption === 'clear') {
        const respSnap = await getDocs(collection(db, 'responses'));
        for (let offset = 0; offset < respSnap.docs.length; offset += BATCH_LIMIT) {
          const chunk = respSnap.docs.slice(offset, offset + BATCH_LIMIT);
          const batch = writeBatch(db);
          chunk.forEach((docSnap) => {
            batch.delete(doc(db, 'responses', docSnap.id));
          });
          await batch.commit();
          clearedRespCount += chunk.length;
        }
      }

      // Record Audit Log
      try {
        await addDoc(collection(db, 'audit_logs'), {
          action: 'RESET_SURVEY_CODES',
          adminUid: user.uid,
          adminEmail: userEmail,
          academicYear: 'ทั้งหมด',
          count: resetCount,
          timestamp: serverTimestamp()
        });
      } catch (auditErr) {
        try {
          handleFirestoreError(auditErr, OperationType.CREATE, 'audit_logs');
        } catch {
          // Logged via handleFirestoreError
        }
      }

      setShowResetCodesModal(false);
      setResetCodesConfirmInput('');
      setHasBackedUpBeforeReset(false);

      const extraClear = resetOption === 'clear' ? ` และล้างผลตอบกลับเดิม ${clearedRespCount} รายการ` : ' (คงข้อมูลการตอบกลับเดิมไว้)';
      const successText = `รีเซ็ตสถานะรหัสแบบสำรวจทั้งหมดสำเร็จเรียบร้อยแล้ว รหัส 0001 พร้อมใช้งานใหม่ (รีเซ็ต ${resetCount} รหัส${extraClear})`;
      setResetCodesStatusMsg({ text: successText, type: 'success' });
      showNotice('รีเซ็ตสถานะรหัสแบบสำรวจทั้งหมดสำเร็จเรียบร้อยแล้ว รหัส 0001 พร้อมใช้งานใหม่', 'success');
    } catch (err) {
      console.error('Reset survey codes error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      const errText = msg.includes('Quota exceeded')
        ? 'โควต้าการใช้งานฐานข้อมูลรายวันเต็มชั่วคราว กรุณาลองใหม่ในวันถัดไป'
        : 'เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่ายหรือสิทธิ์ไม่เพียงพอ กรุณาลองใหม่อีกครั้ง';
      setResetCodesStatusMsg({ text: errText, type: 'error' });
      showNotice(errText, 'error');
      try {
        handleFirestoreError(err, OperationType.UPDATE, 'supervisors');
      } catch {
        // Logged via handleFirestoreError
      }
    } finally {
      setIsResettingCodes(false);
    }
  };

  // Admin Data Purge action
  const handlePurgeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPurging) return;
    setPurgeMessage({ text: '', type: '' });

    if (!purgeYear) {
      setPurgeMessage({ text: 'กรุณาเลือกปีการศึกษาที่ต้องการดำเนินการลบ', type: 'error' });
      return;
    }
    if (purgeConfirmText.trim().toUpperCase() !== 'PURGE') {
      setPurgeMessage({ text: 'กรุณากรอกคำว่า "PURGE" ในกล่องข้อความเพื่อยืนยันสิทธิ์', type: 'error' });
      return;
    }

    setIsPurging(true);
    try {
      let deletedSupervisorsCount = 0;
      let deletedResponsesCount = 0;
      const BATCH_LIMIT = 400;

      if (purgeMode === 'all' || purgeMode === 'supervisors') {
        const qCopy = query(collection(db, 'supervisors'), where('academicYear', '==', purgeYear));
        const snap = await getDocs(qCopy);
        for (let offset = 0; offset < snap.docs.length; offset += BATCH_LIMIT) {
          const chunk = snap.docs.slice(offset, offset + BATCH_LIMIT);
          const batch = writeBatch(db);
          chunk.forEach((docSnap) => batch.delete(doc(db, 'supervisors', docSnap.id)));
          await batch.commit();
          deletedSupervisorsCount += chunk.length;
        }
      }

      if (purgeMode === 'all' || purgeMode === 'responses') {
        const qCopy = query(collection(db, 'responses'), where('academicYear', '==', purgeYear));
        const snap = await getDocs(qCopy);
        for (let offset = 0; offset < snap.docs.length; offset += BATCH_LIMIT) {
          const chunk = snap.docs.slice(offset, offset + BATCH_LIMIT);
          const batch = writeBatch(db);
          chunk.forEach((docSnap) => batch.delete(doc(db, 'responses', docSnap.id)));
          await batch.commit();
          deletedResponsesCount += chunk.length;
        }

        const qLocks = query(collection(db, 'survey_completions'), where('academicYear', '==', purgeYear));
        const lockSnap = await getDocs(qLocks);
        for (let offset = 0; offset < lockSnap.docs.length; offset += BATCH_LIMIT) {
          const chunk = lockSnap.docs.slice(offset, offset + BATCH_LIMIT);
          const batch = writeBatch(db);
          chunk.forEach((docSnap) => batch.delete(doc(db, 'survey_completions', docSnap.id)));
          await batch.commit();
        }
      }

      setPurgeMessage({
        text: `ดำเนินการเสร็จสิ้นเรียบร้อย: ลบข้อมูลผู้ประเมินไปแล้ว ${deletedSupervisorsCount} รายการ และข้อมูลตอบกลับ ${deletedResponsesCount} รายการ ในปีการศึกษา ${purgeYear}`,
        type: 'success'
      });
      setPurgeConfirmText('');
      showNotice(`ล้างข้อมูลปีการศึกษา ${purgeYear} เรียบร้อยแล้ว`, 'success');
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      setPurgeMessage({
        text: msg.includes('Quota exceeded')
          ? 'โควต้าการใช้งานฐานข้อมูลรายวันเต็มชั่วคราว กรุณาลองใหม่ในวันถัดไป'
          : 'เกิดข้อผิดพลาดในการดำเนินการเคลียร์ข้อมูล: ' + msg,
        type: 'error'
      });
      try {
        handleFirestoreError(err, OperationType.DELETE, purgeMode);
      } catch {
        // Logged via handleFirestoreError
      }
    } finally {
      setIsPurging(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <svg className="animate-spin h-8 w-8 text-bu-orange" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-base text-slate-600 font-normal leading-[1.6]">กำลังเชื่อมต่อข้อมูลผู้ล๊อคอิน...</span>
      </div>
    );
  }

  // If not logged in, show Auth login form
  if (!user) {
    return (
      <div className="w-full max-w-lg mx-auto my-6 sm:my-12 px-4">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden text-center animate-fade-in">
          <div className="bg-slate-900 py-8 px-6 text-white space-y-1.5">
            <Settings className="w-10 h-10 text-bu-orange mx-auto mb-2 stroke-1" />
            <h2 className="font-sans text-2xl sm:text-3xl font-bold leading-[1.6]">ระบบบริหารจัดการ (Admin Portal)</h2>
            <p className="text-slate-200 text-sm sm:text-base font-normal leading-[1.6]">
              สำนักมาตรฐานคุณภาพการศึกษา มหาวิทยาลัยกรุงเทพ
            </p>
          </div>

          <div className="p-6 md:p-8 space-y-5 text-left">
            {isIframe && (
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-2.5 text-base text-indigo-900 shadow-sm font-sans leading-[1.6]">
                <div className="flex items-center gap-1.5 font-bold text-indigo-950 text-base font-sans leading-[1.6]">
                  <span className="animate-bounce">💡</span>
                  <span>คำแนะนำความปลอดภัย: รันแอปแยกแท็บ</span>
                </div>
                <p className="leading-[1.6] font-normal text-indigo-900 text-base">
                  เนื่องจากเบราว์เซอร์ส่วนใหญ่บล็อกหน้าต่างป๊อปอัปของระบบเข้าสู่ระบบ (Google Auth) เมื่อรันอยู่ใน iFrame พรีวิวของ AI Studio เพื่อป้องกันไม่ให้เกิดความล่าช้าหรือการล็อกอินล้มเหลว กรุณาคลิกปุ่มด้านล่างเพื่อเปิดแบบเต็มหน้าต่างแยกออกไป
                </p>
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-base font-bold rounded-xl transition-all shadow-sm active:scale-[0.98] cursor-pointer text-center font-sans mt-1"
                >
                  เปิดใช้งานในแท็บใหม่ (Open in New Tab) 🚀
                </a>
              </div>
            )}

            {authError && (
              <div className="p-3.5 bg-rose-50 text-rose-700 text-base rounded-xl text-center font-semibold leading-[1.6] border border-rose-100">
                {authError}
              </div>
            )}

            {isProviderDisabled && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl space-y-2 text-base text-orange-900 leading-[1.6]">
                <span className="font-sans font-bold block text-base text-orange-950 leading-[1.6]">🛠️ วิธีเปิดใช้งาน Google Sign-In ใน Firebase Auth:</span>
                <ol className="list-decimal list-inside space-y-1.5 font-normal leading-[1.6]">
                  <li>เปิดลิงก์ <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="font-semibold underline text-[#F26522] hover:opacity-80">Firebase Console</a></li>
                  <li>ไปที่ระบบ <strong className="font-bold">Authentication</strong> &gt; แท็บ <strong className="font-bold">Sign-in method</strong></li>
                  <li>คลิก <strong className="font-bold">Add new provider</strong> จากนั้นเลือกชนิด <strong className="font-bold">Google</strong></li>
                  <li>เปิดปุ่มสวิตช์ <strong className="font-bold">Enable</strong> กำหนดอีเมลซัพพอร์ตโครงการ แล้วกดจัดเก็บ <strong className="font-bold">Save</strong> ให้ระบบบันทึกผล</li>
                  <li>กลับมาที่หน้าเว็บนี้ ทำการรีเฟรช (Refresh) 1 ครั้ง แล้วเข้าสู่ระบบด้วย Google อีกครั้ง</li>
                </ol>
              </div>
            )}

            <div className="text-center space-y-3 py-2">
              <p className="text-base text-slate-600 font-normal leading-[1.6]">
                กรุณาเข้าสู่ระบบด้วยบัญชี Google ของทางมหาวิทยาลัย (@bu.ac.th) เพื่อเข้าใช้งานแผงควบคุมระบบบริหารจัดการผู้ดูแลระบบ (Admin Portal)
              </p>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 bg-[#F26522] hover:bg-[#d95416] text-white text-base font-bold py-3.5 px-4 rounded-xl transition-all shadow-sm hover:shadow active:scale-[0.98] cursor-pointer"
            >
              <span>ลงชื่อเข้าใช้งานสำหรับ Admin</span>
            </button>

            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
              <div className="flex items-start gap-2.5">
                <div className="text-orange-600 font-bold text-base mt-0.5">⚠️</div>
                <p className="text-base text-orange-900 leading-[1.6] font-normal">
                  <strong className="font-semibold">เงื่อนไขความปลอดภัย:</strong> ระบบจำกัดสิทธิ์เฉพาะการใช้อีเมลมหาวิทยาลัยกรุงเทพ (อีเมลลงท้ายด้วย <code>@bu.ac.th</code>) เท่านั้น บัญชีอีเมลภายนอก เช่น Gmail ส่วนบุคคล จะถูกปฏิเสธการเชื่อมต่อโดยอัตโนมัติ
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 print:hidden">
      {/* 2-column High Density structure */}
      <div className="w-full flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Left Side: Sidebar Column */}
        <aside className="w-full lg:w-72 flex flex-col gap-4 shrink-0 font-sans">
          {/* Active Admin Profile Card */}
          <div className="bg-slate-900 rounded-2xl p-4 text-white shadow-sm border border-slate-800">
            <span className="font-sans text-xs text-[#F26522] uppercase tracking-wider font-bold block">Admin Portal</span>
            <span className="text-sm text-slate-200 font-normal block mt-1.5 truncate leading-[1.6]" title={user.email}>
              ผู้ใช้งาน: <strong className="text-white font-semibold font-mono">{user.email}</strong>
            </span>
            <button
              onClick={handleLogout}
              className="mt-3.5 w-full bg-[#F26522] hover:bg-opacity-90 text-white text-sm py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center space-x-1.5 cursor-pointer active:scale-[0.98]"
            >
              <LogOut className="w-4 h-4" />
              <span>ออกจากระบบ</span>
            </button>
          </div>

          {/* Quick Statistics Mini Panel */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <h2 className="font-sans text-xs sm:text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3.5 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#F26522]" />
              <span>สถิติภาพรวม (Real-time)</span>
            </h2>
            <div className="space-y-4">
              <div className="flex flex-col">
                <span className="font-sans text-3xl font-bold text-slate-900 tracking-tight leading-none tabular-nums">{totalCompletedCount}</span>
                <span className="text-sm font-normal text-slate-600 mt-2.5">ผู้ตอบแบบสำรวจที่เสร็จแล้ว</span>
                <div className="w-full bg-slate-100 h-1.5 mt-2 rounded-full overflow-hidden">
                  <div className="bg-[#F26522] h-full transition-all duration-500" style={{ width: `${Math.min(100, responseRate)}%` }}></div>
                </div>
                <div className="flex justify-between text-xs mt-1.5 text-slate-600 font-mono tabular-nums">
                  <span>เป้าหมาย {totalSentCount} คน</span>
                  <span>{responseRate.toFixed(1)}%</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                  <span className="block text-lg font-bold text-slate-800 font-mono tabular-nums leading-none">
                    {overallItem13Mean !== null ? overallItem13Mean.toFixed(2) : '-'}
                  </span>
                  <span className="text-xs text-slate-600 font-normal mt-1 block">คะแนนเฉลี่ย (เต็ม 5)</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                  <span className="block text-lg font-bold text-emerald-600 font-mono tabular-nums leading-none">{Math.round(responseRate)}%</span>
                  <span className="text-xs text-slate-600 font-normal mt-1 block">อัตราการสัดส่วน</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Menu items */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <h2 className="font-sans text-xs sm:text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-[#F26522]" />
              <span>เครื่องมือจัดการข้อมูล</span>
            </h2>
            <nav className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-1.5">
              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all font-semibold flex items-center gap-2 border-l-4 cursor-pointer leading-[1.6] ${
                  activeTab === 'overview'
                    ? 'bg-orange-50 text-[#F26522] border-[#F26522]'
                    : 'text-slate-700 border-transparent hover:bg-slate-50'
                }`}
              >
                <ClipboardList className="w-4 h-4 shrink-0" />
                <span>สรุปรายงานผล (Dashboard)</span>
              </button>
              <button
                onClick={() => setActiveTab('import')}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all font-semibold flex items-center gap-2 border-l-4 cursor-pointer leading-[1.6] ${
                  activeTab === 'import'
                    ? 'bg-orange-50 text-[#F26522] border-[#F26522]'
                    : 'text-slate-700 border-transparent hover:bg-slate-50'
                }`}
              >
                <Upload className="w-4 h-4 shrink-0" />
                <span>นำเข้าฐานข้อมูลผู้ประเมิน</span>
              </button>
              <button
                onClick={() => setActiveTab('admins')}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all font-semibold flex items-center gap-2 border-l-4 cursor-pointer leading-[1.6] ${
                  activeTab === 'admins'
                    ? 'bg-orange-50 text-[#F26522] border-[#F26522]'
                    : 'text-slate-700 border-transparent hover:bg-slate-50'
                }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span>จัดการสิทธิ์ผู้ดูแลระบบ</span>
              </button>
              <button
                onClick={() => setActiveTab('reset-codes')}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all font-semibold flex items-center gap-2 border-l-4 cursor-pointer leading-[1.6] ${
                  activeTab === 'reset-codes'
                    ? 'bg-orange-50 text-[#F26522] border-[#F26522]'
                    : 'text-slate-700 border-transparent hover:bg-slate-50'
                }`}
              >
                <RotateCcw className="w-4 h-4 shrink-0" />
                <span>จัดการสถานะรหัสแบบสำรวจ</span>
              </button>
              <button
                onClick={() => setActiveTab('purge-responses')}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all font-semibold flex items-center gap-2 border-l-4 cursor-pointer leading-[1.6] ${
                  activeTab === 'purge-responses'
                    ? 'bg-orange-50 text-[#F26522] border-[#F26522]'
                    : 'text-slate-700 border-transparent hover:bg-slate-50'
                }`}
              >
                <Trash2 className="w-4 h-4 shrink-0" />
                <span>ลบข้อมูลการตอบกลับ</span>
              </button>
              <button
                onClick={() => setActiveTab('purge')}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all font-semibold flex items-center gap-2 border-l-4 cursor-pointer leading-[1.6] ${
                  activeTab === 'purge'
                    ? 'bg-rose-50 text-rose-600 border-rose-500'
                    : 'text-slate-700 border-transparent hover:bg-slate-50'
                }`}
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>ล้างฐานข้อมูล (Data Purge)</span>
              </button>
            </nav>
          </div>
        </aside>

        {/* Right Side: Active Content Panel Column */}
        <section className="flex-1 w-full min-w-0 flex flex-col gap-4 sm:gap-6">
          {uiNotice && (
            <div
              role="status"
              className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm sm:text-base font-medium shadow-sm ${
                uiNotice.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : uiNotice.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : 'bg-orange-50 border-orange-200 text-orange-900'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {uiNotice.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span className="truncate sm:whitespace-normal">{uiNotice.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setUiNotice(null)}
                className="p-1 rounded-lg hover:bg-black/5 shrink-0 cursor-pointer"
                aria-label="ปิดการแจ้งเตือน"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

      {/* Global Data Source Filters inside overview tab */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 w-full">
          <div className="flex items-center space-x-2 text-slate-900 shrink-0">
            <Filter className="w-4 h-4 text-bu-orange" />
            <span className="font-sans text-base font-bold leading-[1.6]">เครื่องตัวกรองขั้นสูง:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full lg:w-auto">
            {/* Year Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-sm sm:text-base font-normal text-slate-700 shrink-0">ปีการศึกษา:</span>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="p-2 border border-slate-200 rounded-lg text-sm sm:text-base text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-bu-orange"
              >
                <option value="all">ทั้งหมดทุกปีการศึกษา</option>
                {getAcademicYearsOptions().map(yr => (
                  <option key={yr} value={yr}>ปีการศึกษา {yr}</option>
                ))}
              </select>
            </div>

            {/* Month Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-sm sm:text-base font-normal text-slate-700 shrink-0">กรองรายเดือน:</span>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="p-2 border border-slate-200 rounded-lg text-sm sm:text-base text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-bu-orange"
              >
                <option value="all">ทั้งหมดทุกเดือน</option>
                {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => (
                  <option key={m} value={m}>{getThaiMonthName(m)}</option>
                ))}
              </select>
            </div>

            {/* Faculty Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-sm sm:text-base font-normal text-slate-700 shrink-0">รายคณะ:</span>
              <select
                value={filterFaculty}
                onChange={(e) => setFilterFaculty(e.target.value)}
                className="p-2 border border-slate-200 rounded-lg text-sm sm:text-base text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-bu-orange max-w-[180px] sm:max-w-[200px]"
              >
                <option value="all">ทั้งหมดทุกคณะ</option>
                {getFacultyOptions().map(fac => (
                  <option key={fac} value={fac}>{fac}</option>
                ))}
              </select>
            </div>

            {/* Department Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-sm sm:text-base font-normal text-slate-700 shrink-0">รายสาขาวิชา:</span>
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="p-2 border border-slate-200 rounded-lg text-sm sm:text-base text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-bu-orange max-w-[180px] sm:max-w-[200px]"
              >
                <option value="all">ทั้งหมดทุกสาขาวิชา</option>
                {getDepartmentOptions().map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Reset Filters */}
            {(filterMonth !== 'all' || filterFaculty !== 'all' || filterDepartment !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  const years = getAcademicYearsOptions();
                  if (years.length > 0) setFilterYear(years[years.length - 1]);
                  setFilterMonth('all');
                  setFilterFaculty('all');
                  setFilterDepartment('all');
                }}
                className="text-sm font-semibold text-slate-600 hover:text-bu-orange px-3 py-2 rounded-lg border border-slate-200 hover:border-orange-200 hover:bg-orange-50/50 transition-all cursor-pointer"
              >
                รีเซ็ตตัวกรอง
              </button>
            )}

            {/* Export excel & PDF buttons */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
              <button
                onClick={handleExportFilteredResponses}
                className="flex-1 sm:flex-none bg-bu-orange hover:bg-bu-orange-hover text-white text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center justify-center space-x-1.5 transition-all active:scale-[0.98] cursor-pointer shadow-sm text-center"
              >
                <Download className="w-4 h-4" />
                <span>ส่งออก Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={handleOpenPdfPreview}
                disabled={isPreparingPdfPreview || dataLoading}
                className="flex-1 sm:flex-none bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center justify-center space-x-1.5 transition-all active:scale-[0.98] cursor-pointer shadow-sm text-center"
                title="เปิดดูตัวอย่างรายงาน Infographic A4 และดาวน์โหลดเป็นไฟล์ PDF"
              >
                {isPreparingPdfPreview ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังเปิดตัวอย่าง...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>ส่งออกรายงาน PDF (.pdf)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Render subcontent based on tab state */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {dataLoading ? (
            <div className="space-y-6 animate-pulse">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3">
                    <div className="h-3 w-32 bg-slate-200 rounded" />
                    <div className="h-8 w-24 bg-slate-200 rounded" />
                    <div className="h-2 w-full bg-slate-100 rounded" />
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl p-10 border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-3 text-slate-600">
                <Loader2 className="w-7 h-7 animate-spin text-bu-orange" />
                <span className="text-base font-medium leading-[1.6]">กำลังโหลดข้อมูลสถิติจากฐานข้อมูล...</span>
              </div>
            </div>
          ) : (
            <>
              {/* Dashboard aggregate cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-1 flex flex-col justify-between">
                  <span className="text-base font-semibold text-slate-700 block leading-[1.6]">จำนวนผู้ประเมินเสร็จแล้ว</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="font-sans text-2xl sm:text-3xl font-bold text-emerald-600 tabular-nums">{totalCompletedCount}</span>
                    <ClipboardList className="w-5 h-5 text-emerald-500" />
                  </div>
                  <p className="text-sm sm:text-base text-slate-600 font-normal leading-[1.6] mt-2 pt-2 border-t border-slate-100">รายการตอบประเมินที่ส่งกลับมา</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-1 flex flex-col justify-between">
                  <span className="text-base font-semibold text-slate-700 block leading-[1.6]">สัดส่วนตอบกลับ (Response Rate)</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="font-sans text-2xl sm:text-3xl font-bold text-bu-orange tabular-nums">{responseRate.toFixed(1)}%</span>
                    <TrendingUp className="w-5 h-5 text-orange-400" />
                  </div>
                  {/* Progress visual */}
                  <div className="mt-3 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-bu-orange h-full rounded-full" style={{ width: `${Math.min(100, responseRate)}%` }} />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-1 flex flex-col justify-between">
                  <span className="text-base font-semibold text-slate-700 block leading-[1.6]">คะแนนสมรรถนะเฉลี่ยสะสม</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="font-sans text-2xl sm:text-3xl font-bold text-indigo-600 tabular-nums">
                      {overallItem13Mean !== null ? overallItem13Mean.toFixed(2) : '-'} / 5.00
                    </span>
                    <BarChart className="w-5 h-5 text-indigo-500" />
                  </div>
                  <p className="text-sm sm:text-base text-slate-600 font-normal leading-[1.6] mt-2 pt-2 border-t border-slate-100">คะแนนเฉลี่ยความพึงพอใจในภาพรวม (ข้อที่ 13) เต็ม 5</p>
                </div>
              </div>

              {/* Domain-specific Mean cards */}
              <div className="bg-[#fcf8f5] border border-orange-100/80 rounded-3xl p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-orange-200/40 pb-3 gap-2">
                  <div className="space-y-1">
                    <h3 className="font-sans text-lg font-bold text-slate-900 flex items-center gap-2 leading-[1.6]">
                      <Award className="w-4 h-4 text-bu-orange" />
                      <span>คะแนนเฉลี่ยจำแนกตามรายด้าน (Domain-Specific Means)</span>
                    </h3>
                    <p className="text-base text-slate-600 font-normal leading-[1.6]">การประมวลผลแยกตามกลุ่มทักษะและอัตลักษณ์ของมหาวิทยาลัยกรุงเทพ (คะแนนเต็ม 5.00)</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {[
                    {
                      key: 'tqf',
                      badge: 'TQF CRITERIA',
                      badgeBg: '#EDE9FE',
                      badgeText: '#6D28D9',
                      title: '1. ด้านคุณภาพบัณฑิตตามกรอบ TQF',
                      primaryColor: '#6D28D9',
                      barColor: '#C4B5FD',
                      barHighlightColor: '#A78BFA',
                      categoryMean: tqfMean,
                      items: [
                        { label: 'คุณธรรม จริยธรรม', score: attributeMeans[0] ?? 0 },
                        { label: 'ความรู้', score: attributeMeans[1] ?? 0 },
                        { label: 'ทักษะทางปัญญา', score: attributeMeans[2] ?? 0 },
                        { label: 'สัมพันธ์ระหว่างบุคคล', score: attributeMeans[3] ?? 0 },
                        { label: 'ทักษะไอที/สื่อสาร', score: attributeMeans[4] ?? 0 },
                      ],
                    },
                    {
                      key: 'identity',
                      badge: 'IDENTITY',
                      badgeBg: '#D1FAE5',
                      badgeText: '#059669',
                      title: '2. ด้านการพัฒนาบัณฑิตตามอัตลักษณ์',
                      primaryColor: '#059669',
                      barColor: '#86EFAC',
                      barHighlightColor: '#6EE7B7',
                      categoryMean: identityMean,
                      items: [
                        { label: 'ความคิดสร้างสรรค์', score: attributeMeans[5] ?? 0 },
                        { label: 'จิตวิญญาณผู้ประกอบการ', score: attributeMeans[6] ?? 0 },
                        { label: 'ความเป็นสากล', score: attributeMeans[7] ?? 0 },
                        { label: 'ทักษะไอที/สื่อสาร', score: attributeMeans[4] ?? 0 },
                      ],
                    },
                    {
                      key: 'bu5',
                      badge: 'BU 5 DNAs',
                      badgeBg: '#FFEDD5',
                      badgeText: '#EA580C',
                      title: '3. ด้านการพัฒนาตาม BU 5 DNAs',
                      primaryColor: '#EA580C',
                      barColor: '#FDBA74',
                      barHighlightColor: '#FDBA74',
                      categoryMean: dnaMean,
                      items: [
                        { label: 'ฉลาดตั้งคำถาม', score: attributeMeans[8] ?? 0 },
                        { label: 'ไหวพริบทันโลก', score: attributeMeans[9] ?? 0 },
                        { label: 'ทำงานร่วมกัน', score: attributeMeans[10] ?? 0 },
                        { label: 'สู้ในสิ่งที่รัก', score: attributeMeans[11] ?? 0 },
                        { label: 'ความคิดสร้างสรรค์', score: attributeMeans[5] ?? 0 },
                      ],
                    },
                  ].map((card) => {
                    const hasData = totalCompletedCount > 0;
                    const safeCategoryMean =
                      hasData && Number.isFinite(card.categoryMean) ? card.categoryMean : 0;
                    const scores = card.items.map((it) =>
                      Number.isFinite(it.score) ? it.score : 0
                    );
                    const minScore = hasData ? Math.min(...scores) : 0;
                    const maxScore = hasData ? Math.max(...scores) : 0;

                    const svgW = 280;
                    const svgH = 158;
                    const plotLeft = 24;
                    const plotRight = 272;
                    const plotW = plotRight - plotLeft;
                    const chartTop = 22;
                    const chartBottom = 136;
                    const chartH = chartBottom - chartTop;
                    const slotW = plotW / card.items.length;
                    const barW = Math.min(28, slotW * 0.56);
                    const avgY =
                      chartBottom -
                      (Math.min(5, Math.max(0, safeCategoryMean)) / 5) * chartH;

                    return (
                      <div
                        key={card.key}
                        className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between gap-3 transition-all"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span
                              className="text-xs font-semibold px-2.5 py-0.5 rounded-full tracking-wider"
                              style={{ backgroundColor: card.badgeBg, color: card.badgeText }}
                            >
                              {card.badge}
                            </span>
                          </div>
                          <h4 className="font-sans text-base font-bold text-slate-900 leading-[1.5]">
                            {card.title}
                          </h4>

                          {/* Vertical Bar Chart (0–5 scale) */}
                          <div className="w-full pt-1">
                            <svg
                              viewBox={`0 0 ${svgW} ${svgH}`}
                              className="w-full h-auto overflow-visible"
                              role="img"
                              aria-label={card.title}
                            >
                              {/* Y-axis ticks & gridlines (0 to 5) */}
                              {[0, 1, 2, 3, 4, 5].map((tick) => {
                                const y = chartBottom - (tick / 5) * chartH;
                                return (
                                  <g key={tick}>
                                    <line
                                      x1={plotLeft}
                                      y1={y}
                                      x2={plotRight}
                                      y2={y}
                                      stroke={tick === 0 ? '#CBD5E1' : '#E5E7EB'}
                                      strokeWidth="1"
                                    />
                                    <text
                                      x={plotLeft - 6}
                                      y={y + 3.5}
                                      textAnchor="end"
                                      fontSize="10"
                                      fill="#94A3B8"
                                      fontWeight="500"
                                    >
                                      {tick}
                                    </text>
                                  </g>
                                );
                              })}

                              {/* Bars & Value Labels */}
                              {card.items.map((item, idx) => {
                                const safeItemScore = Number.isFinite(item.score) ? item.score : 0;
                                const val = hasData ? Math.min(5, Math.max(0, safeItemScore)) : 0;
                                const barH = (val / 5) * chartH;
                                const barX = plotLeft + idx * slotW + (slotW - barW) / 2;
                                const barY = chartBottom - barH;
                                const cx = barX + barW / 2;

                                const isExtreme =
                                  hasData && (safeItemScore === maxScore || safeItemScore === minScore);
                                const fill = hasData
                                  ? isExtreme
                                    ? card.barHighlightColor
                                    : card.barColor
                                  : '#E2E8F0';

                                const r = Math.min(4, barW / 2, barH);
                                const barPath =
                                  barH > 0.5
                                    ? `M ${barX},${chartBottom} L ${barX},${barY + r} Q ${barX},${barY} ${barX + r},${barY} L ${barX + barW - r},${barY} Q ${barX + barW},${barY} ${barX + barW},${barY + r} L ${barX + barW},${chartBottom} Z`
                                    : '';

                                return (
                                  <g key={idx}>
                                    {barPath && <path d={barPath} fill={fill} />}
                                    <text
                                      x={cx}
                                      y={hasData ? Math.max(11, barY - 5) : chartBottom - 6}
                                      textAnchor="middle"
                                      fontSize="10.5"
                                      fontWeight="600"
                                      fill={hasData ? '#1E293B' : '#94A3B8'}
                                    >
                                      {hasData ? safeItemScore.toFixed(2) : '-'}
                                    </text>
                                    <text
                                      x={cx}
                                      y={chartBottom + 14}
                                      textAnchor="middle"
                                      fontSize="10.5"
                                      fontWeight="600"
                                      fill="#64748B"
                                    >
                                      {idx + 1}
                                    </text>
                                  </g>
                                );
                              })}

                              {/* Dashed Category Mean Reference Line */}
                              {hasData && (
                                <line
                                  x1={plotLeft}
                                  y1={avgY}
                                  x2={plotRight}
                                  y2={avgY}
                                  stroke="#64748B"
                                  strokeWidth="1.25"
                                  strokeDasharray="4 3"
                                />
                              )}
                            </svg>
                          </div>

                          {/* Numbered Sub-dimension Legend */}
                          <ol className="space-y-1 pt-1">
                            {card.items.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-xs text-slate-600 leading-snug">
                                <span className="font-mono font-semibold text-slate-500 w-3.5 shrink-0">
                                  {idx + 1}
                                </span>
                                <span>{item.label}</span>
                              </li>
                            ))}
                          </ol>
                        </div>

                        {/* Bottom Category Score Footer */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 mt-auto">
                          <span
                            className="font-sans text-lg sm:text-xl font-bold tabular-nums whitespace-nowrap shrink-0"
                            style={{ color: card.primaryColor }}
                          >
                            ค่าเฉลี่ย {safeCategoryMean.toFixed(2)}
                          </span>
                          <div className="w-16 shrink-0 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${hasData ? Math.min(100, Math.max(0, (safeCategoryMean / 5) * 100)) : 0}%`,
                                backgroundColor: card.barHighlightColor,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dashboard Sub-tab selector bar */}
              <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-2 font-sans w-full">
                <button
                  onClick={() => setDashSubTab('part1')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 sm:px-4 rounded-xl text-sm font-bold transition-all text-center cursor-pointer ${
                    dashSubTab === 'part1'
                      ? 'bg-slate-900 text-white shadow'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Briefcase className="w-4 h-4 text-[#F26522] shrink-0" />
                  <span>ตอนที่ 1: ข้อมูลผู้ส่งประเมิน & องค์กร</span>
                </button>
                <button
                  onClick={() => setDashSubTab('part2')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 sm:px-4 rounded-xl text-sm font-bold transition-all text-center cursor-pointer ${
                    dashSubTab === 'part2'
                      ? 'bg-slate-900 text-white shadow'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Award className="w-4 h-4 text-[#F26522] shrink-0" />
                  <span>ตอนที่ 2: ความพึงพอใจคุณลักษณะบัณฑิต (รายข้อ)</span>
                </button>
                <button
                  onClick={() => setDashSubTab('part3')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 sm:px-4 rounded-xl text-sm font-bold transition-all text-center cursor-pointer ${
                    dashSubTab === 'part3'
                      ? 'bg-slate-900 text-white shadow'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-[#F26522] shrink-0" />
                  <span>ตอนที่ 3: เกณฑ์คัดเลือก & ทักษะอนาคต</span>
                </button>
              </div>

              {/* Sub-tab view contents conditional render */}
              {totalCompletedCount === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
                  <FolderOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="font-sans text-lg font-bold text-slate-900 leading-[1.6]">ยังไม่มีข้อมูลรายงานสถิติของช่วงเวลาเรียนปัจจุบันที่เลือก</p>
                  <p className="text-base text-slate-600 mt-1.5 font-normal leading-[1.6]">กรุณาเลือกปีการศึกษาอื่นๆ หรือรอให้ผู้บังคับบัญชาส่งผลประเมินครบบริบูรณ์</p>
                </div>
              ) : (
            <div className="space-y-6 font-sans">
              
              {/* TAB 1: PART 1 INFOGRAPHIC */}
              {dashSubTab === 'part1' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Card 1: Position */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
                    <h3 className="font-sans text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2.5 leading-[1.6]">
                      <Briefcase className="w-4 h-4 text-[#F26522]" />
                      <span>1. ตำแหน่งงานประเมินของผู้ตอบ</span>
                    </h3>
                    <div className="space-y-3.5">
                      {Object.entries(positionsStats).map(([key, value]) => {
                        const pct = (value / totalCompletedCount) * 100;
                        return (
                          <div key={key} className="space-y-1">
                            <div className="flex justify-between text-sm sm:text-base font-normal leading-[1.6]">
                              <span className="text-slate-700 truncate max-w-[70%]">{key}</span>
                              <span className="text-slate-900 font-semibold">{value} ราย ({pct.toFixed(1)}%)</span>
                            </div>
                            <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden">
                              <div className="bg-[#F26522] h-full rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Card 2: Org Type */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
                    <h3 className="font-sans text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2.5 leading-[1.6]">
                      <Building2 className="w-4 h-4 text-[#F26522]" />
                      <span>2. ประเภทหน่วยงาน/องค์กร</span>
                    </h3>
                    <div className="space-y-3.5">
                      {Object.entries(orgTypesStats).map(([key, value]) => {
                        const pct = (value / totalCompletedCount) * 100;
                        return (
                          <div key={key} className="space-y-1">
                            <div className="flex justify-between text-sm sm:text-base font-normal leading-[1.6]">
                              <span className="text-slate-700 truncate max-w-[70%]">{key}</span>
                              <span className="text-slate-900 font-semibold">{value} ราย ({pct.toFixed(1)}%)</span>
                            </div>
                            <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden">
                              <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Card 3: Graduate Durations */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
                    <h3 className="font-sans text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2.5 leading-[1.6]">
                      <Clock className="w-4 h-4 text-[#F26522]" />
                      <span>3. ระยะเวลาที่เริ่มปฏิบัติงาน</span>
                    </h3>
                    <div className="space-y-3.5">
                      {Object.entries(graduateDurationsStats).map(([key, value]) => {
                        const pct = (value / totalCompletedCount) * 100;
                        return (
                          <div key={key} className="space-y-1">
                            <div className="flex justify-between text-sm sm:text-base font-normal leading-[1.6]">
                              <span className="text-slate-700 truncate max-w-[70%]">{key}</span>
                              <span className="text-slate-900 font-semibold">{value} ราย ({pct.toFixed(1)}%)</span>
                            </div>
                            <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden">
                              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Card 4: Work Experience */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
                    <h3 className="font-sans text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2.5 leading-[1.6]">
                      <Layers className="w-4 h-4 text-[#F26522]" />
                      <span>4. ประสบการณ์ของผู้ให้ประเมิน</span>
                    </h3>
                    <div className="space-y-3.5">
                      {Object.entries(experiencesStats).map(([key, value]) => {
                        const pct = (value / totalCompletedCount) * 100;
                        return (
                          <div key={key} className="space-y-1">
                            <div className="flex justify-between text-sm sm:text-base font-normal leading-[1.6]">
                              <span className="text-slate-700 truncate max-w-[70%]">{key}</span>
                              <span className="text-slate-900 font-semibold">{value} ราย ({pct.toFixed(1)}%)</span>
                            </div>
                            <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden">
                              <div className="bg-amber-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Card 5: Industry */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
                    <h3 className="font-sans text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2.5 leading-[1.6]">
                      <Globe className="w-4 h-4 text-[#F26522]" />
                      <span>5. กลุ่มอุตสาหกรรมเป้าหมาย</span>
                    </h3>
                    <div className="space-y-3.5">
                      {Object.keys(industriesStats).length === 0 ? (
                        <p className="text-base text-slate-600 text-center py-4 font-normal leading-[1.6]">ไม่ได้ระบุกลุ่มอุตสาหกรรม</p>
                      ) : (
                        Object.entries(industriesStats).map(([key, value]) => {
                          const pct = (value / totalCompletedCount) * 100;
                          return (
                            <div key={key} className="space-y-1">
                              <div className="flex justify-between text-sm sm:text-base font-normal leading-[1.6]">
                                <span className="text-slate-700 truncate max-w-[75%]" title={key}>{key}</span>
                                <span className="text-slate-900 font-semibold shrink-0">{value} ข้อ ({pct.toFixed(0)}%)</span>
                              </div>
                              <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden">
                                <div className="bg-teal-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Card 6: Associated BU Faculty */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
                    <h3 className="font-sans text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2.5 leading-[1.6]">
                      <PieChart className="w-4 h-4 text-[#F26522]" />
                      <span>6. สัดส่วนแยกตามคณะวิชา</span>
                    </h3>
                    <div className="space-y-3.5">
                      {Object.entries(facultyCounts).map(([fac, count]) => {
                        const percentage = (count / totalCompletedCount) * 100;
                        return (
                          <div key={fac} className="space-y-1">
                            <div className="flex justify-between text-sm sm:text-base font-normal leading-[1.6]">
                              <span className="text-slate-700 truncate max-w-[70%]" title={fac}>{fac}</span>
                              <span className="text-[#F26522] font-semibold">{count} ราย ({percentage.toFixed(0)}%)</span>
                            </div>
                            <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden">
                              <div className="bg-[#F26522] h-full rounded-full" style={{ width: `${percentage}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PART 2 INFOGRAPHIC (13 GIVEN RATINGS DETAIL BREAKDOWN) */}
              {dashSubTab === 'part2' && (
                <div className="space-y-6">
                  {/* Responsive Summary Table for 13 Attributes */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="font-sans text-lg font-bold text-slate-900 flex items-center gap-2 leading-[1.6]">
                          <BarChart className="w-4 h-4 text-[#F26522]" />
                          <span>ตารางสรุปคะแนนเฉลี่ยรายด้านทั้ง 13 คุณลักษณะ</span>
                        </h3>
                        <p className="text-base text-slate-600 font-normal leading-[1.6] mt-1">เปรียบเทียบคะแนนเฉลี่ย (Mean เต็ม 5.00) และระดับความพึงพอใจจากการประเมินทั้งหมด {totalCompletedCount} รายการ</p>
                      </div>
                      <span className="text-sm font-bold text-bu-orange bg-orange-50 border border-orange-100 px-3 py-1 rounded-lg tabular-nums self-start sm:self-auto shrink-0">
                        เฉลี่ยรวม {overallItem13Mean !== null ? overallItem13Mean.toFixed(2) : '-'} / 5.00
                      </span>
                    </div>
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                          <tr className="bg-slate-50/70 border-b border-slate-100 text-sm font-semibold text-slate-700">
                            <th className="py-3 pl-5 pr-4">คุณลักษณะบัณฑิต</th>
                            <th className="py-3 px-4 w-32 text-right">ค่าเฉลี่ย (Mean)</th>
                            <th className="py-3 px-4 w-44">สัดส่วนคะแนน</th>
                            <th className="py-3 px-4 w-28 text-center">ระดับผลประเมิน</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm sm:text-base">
                          {Array.from({ length: 13 }).map((_, i) => {
                            const qIndex = i + 1;
                            const isOverallRow = qIndex === 13;
                            const mean = attributeMeans[i] || 0;
                            const interp = getScoreInterpretation(mean);
                            return (
                              <tr
                                key={qIndex}
                                className={
                                  isOverallRow
                                    ? 'bg-orange-50/70 border-t-2 border-orange-200 font-bold text-slate-900'
                                    : 'hover:bg-slate-50/60 transition-colors'
                                }
                              >
                                <td
                                  className={`pl-5 pr-4 leading-[1.6] ${
                                    isOverallRow ? 'py-3 font-bold text-slate-900' : 'py-2.5 font-normal text-slate-800'
                                  }`}
                                >
                                  {getAttributeFullLabel(qIndex)}
                                </td>
                                <td
                                  className={`px-4 text-right font-mono font-bold tabular-nums ${
                                    isOverallRow ? 'py-3 text-[#F26522]' : 'py-2.5 text-slate-900'
                                  }`}
                                >
                                  {mean.toFixed(2)}{' '}
                                  <span className={`text-xs font-normal ${isOverallRow ? 'text-slate-700' : 'text-slate-600'}`}>/ 5.00</span>
                                </td>
                                <td className={isOverallRow ? 'py-3 px-4' : 'py-2.5 px-4'}>
                                  <div className={`w-full h-2 rounded-full overflow-hidden ${isOverallRow ? 'bg-orange-100' : 'bg-slate-100'}`}>
                                    <div
                                      className="bg-[#F26522] h-full rounded-full transition-all"
                                      style={{ width: `${Math.min(100, (mean / 5) * 100)}%` }}
                                    />
                                  </div>
                                </td>
                                <td className={isOverallRow ? 'py-3 px-4 text-center' : 'py-2.5 px-4 text-center'}>
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${interp.bg}`}>
                                    {interp.label}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Grid of the 13 rating metrics as Infographics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array.from({ length: 13 }).map((_, i) => {
                      const qIndex = i + 1;
                      const fullTitle = getAttributeFullLabel(qIndex);
                      const mean = attributeMeans[i] || 0;
                      
                      // Calculate individual rating scale sizes
                      const totalWithRating = Object.values(ratingsDistribution[qIndex]).reduce((a, b) => a + b, 0) || 1;
                      const p10 = ((ratingsDistribution[qIndex][10] || 0) / totalWithRating) * 100;
                      const p9 = ((ratingsDistribution[qIndex][9] || 0) / totalWithRating) * 100;
                      const p8 = ((ratingsDistribution[qIndex][8] || 0) / totalWithRating) * 100;
                      const p7 = ((ratingsDistribution[qIndex][7] || 0) / totalWithRating) * 100;
                      const p6 = ((ratingsDistribution[qIndex][6] || 0) / totalWithRating) * 100;
                      const p5 = ((ratingsDistribution[qIndex][5] || 0) / totalWithRating) * 100;
                      const p4 = ((ratingsDistribution[qIndex][4] || 0) / totalWithRating) * 100;
                      const p3 = ((ratingsDistribution[qIndex][3] || 0) / totalWithRating) * 100;
                      const p2 = ((ratingsDistribution[qIndex][2] || 0) / totalWithRating) * 100;
                      const p1 = ((ratingsDistribution[qIndex][1] || 0) / totalWithRating) * 100;

                      // Grouped displays
                      const gExcellent = p10 + p9;
                      const gGood = p8 + p7;
                      const gMedium = p6 + p5;
                      const gLow = p4 + p3;
                      const gLowest = p2 + p1;

                      return (
                        <div key={qIndex} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between space-y-4">
                          <div>
                            {/* Card Header Statement */}
                            <div className="flex justify-between items-start gap-4">
                              <div className="space-y-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 font-mono">ข้อที่ {qIndex}</span>
                                <h4 className="font-sans text-base font-semibold text-slate-900 line-clamp-2 leading-[1.6]" title={fullTitle}>{fullTitle}</h4>
                              </div>
                              {/* Big Circular average Badge */}
                              <div className="flex flex-col items-center shrink-0 bg-orange-50 border border-orange-100 rounded-xl px-3 py-1 text-center">
                                <span className="text-[10px] font-bold uppercase leading-none text-[#F26522]">MEAN</span>
                                <span className="text-base font-bold text-[#F26522] font-mono mt-0.5">{mean.toFixed(2)}</span>
                              </div>
                            </div>

                            {/* Section breakdown stack inline infographic */}
                            <div className="mt-4 space-y-1.5">
                              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider block pb-0.5">การแจกแจงระดับพึงพอใจ:</span>
                              
                              {/* Integrated multi-colored distribution progress bar */}
                              <div className="w-full bg-slate-50 h-3 rounded-md overflow-hidden flex shadow-inner">
                                {p10 > 0 && <div className="h-full bg-emerald-600 transition-all" style={{ width: `${p10}%` }} title={`10 คะแนน: ${p10.toFixed(1)}%`} />}
                                {p9 > 0 && <div className="h-full bg-emerald-400 transition-all" style={{ width: `${p9}%` }} title={`9 คะแนน: ${p9.toFixed(1)}%`} />}
                                {p8 > 0 && <div className="h-full bg-indigo-600 transition-all" style={{ width: `${p8}%` }} title={`8 คะแนน: ${p8.toFixed(1)}%`} />}
                                {p7 > 0 && <div className="h-full bg-indigo-400 transition-all" style={{ width: `${p7}%` }} title={`7 คะแนน: ${p7.toFixed(1)}%`} />}
                                {p6 > 0 && <div className="h-full bg-amber-500 transition-all" style={{ width: `${p6}%` }} title={`6 คะแนน: ${p6.toFixed(1)}%`} />}
                                {p5 > 0 && <div className="h-full bg-amber-300 transition-all" style={{ width: `${p5}%` }} title={`5 คะแนน: ${p5.toFixed(1)}%`} />}
                                {p4 > 0 && <div className="h-full bg-orange-500 transition-all" style={{ width: `${p4}%` }} title={`4 คะแนน: ${p4.toFixed(1)}%`} />}
                                {p3 > 0 && <div className="h-full bg-orange-300 transition-all" style={{ width: `${p3}%` }} title={`3 คะแนน: ${p3.toFixed(1)}%`} />}
                                {p2 > 0 && <div className="h-full bg-rose-500 transition-all" style={{ width: `${p2}%` }} title={`2 คะแนน: ${p2.toFixed(1)}%`} />}
                                {p1 > 0 && <div className="h-full bg-rose-300 transition-all" style={{ width: `${p1}%` }} title={`1 คะแนน: ${p1.toFixed(1)}%`} />}
                              </div>

                              {/* Numeric labels guide panel */}
                              <div className="grid grid-cols-2 xs:flex xs:flex-wrap items-center gap-x-2 gap-y-1 pt-1.5 justify-between">
                                <div className="flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  <span className="text-xs text-slate-600">ดีเยี่ยม (9-10): <strong className="font-semibold text-slate-800">{gExcellent.toFixed(0)}%</strong></span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                  <span className="text-xs text-slate-600">ดี (7-8): <strong className="font-semibold text-slate-800">{gGood.toFixed(0)}%</strong></span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                  <span className="text-xs text-slate-600">ปานกลาง (5-6): <strong className="font-semibold text-slate-800">{gMedium.toFixed(0)}%</strong></span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                                  <span className="text-xs text-slate-600">พอใช้ (3-4): <strong className="font-semibold text-slate-800">{gLow.toFixed(0)}%</strong></span>
                                </div>
                                <div className="flex items-center gap-1 col-span-2 xs:col-span-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0"></span>
                                  <span className="text-xs text-slate-600">ปรับปรุง (1-2): <strong className="font-semibold text-slate-800">{gLowest.toFixed(0)}%</strong></span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Quantitative aggregates (Strong points & Areas of development) */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                    {/* Top Core Strengths */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
                      <h3 className="font-sans text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2.5 leading-[1.6]">
                        <Award className="w-4 h-4 text-[#F26522]" />
                        <span>ลักษณะที่ประทับใจ/โดดเด่นสูงสุดของบัณฑิต (จัดอันดับ)</span>
                      </h3>
                      {Object.keys(strongPointsStats).length === 0 ? (
                        <p className="text-base text-slate-600 text-center py-8 font-normal leading-[1.6]">ยังไม่มีรายจุดเด่นที่ระบุ</p>
                      ) : (
                        <div className="space-y-3.5 pt-1">
                          {Object.entries(strongPointsStats)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 5)
                            .map(([key, value], idx) => {
                              const rankColors = ['bg-amber-100 text-amber-800', 'bg-slate-200 text-slate-800', 'bg-orange-100 text-orange-800'];
                              const isTop3 = idx < 3;
                              return (
                                <div key={key} className="flex items-center justify-between gap-4 font-sans border-b border-slate-50 pb-2 last:border-b-0">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                                      isTop3 ? rankColors[idx] : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {idx + 1}
                                    </span>
                                    <span className="text-sm sm:text-base text-slate-700 truncate font-normal">{key}</span>
                                  </div>
                                  <span className="text-sm sm:text-base font-semibold text-slate-900 shrink-0">{value} โหวต</span>
                                </div>
                              );
                            })
                          }
                        </div>
                      )}
                    </div>

                    {/* Top Areas of development */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
                      <h3 className="font-sans text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2.5 leading-[1.6]">
                        <HelpCircle className="w-4 h-4 text-[#F26522]" />
                        <span>ทักษะที่ควรปรับปรุง/ดูแลเพิ่มพูนพนักงาน (จัดอันดับ)</span>
                      </h3>
                      {Object.keys(skillsToImproveStats).length === 0 ? (
                        <p className="text-base text-slate-600 text-center py-8 font-normal leading-[1.6]">ยังไม่มีระบุทักษะที่ต้องพัฒนา</p>
                      ) : (
                        <div className="space-y-3.5 pt-1">
                          {Object.entries(skillsToImproveStats)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 5)
                            .map(([key, value], idx) => {
                              return (
                                <div key={key} className="flex items-center justify-between gap-4 font-sans border-b border-slate-50 pb-2 last:border-b-0">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold font-mono">
                                      #{idx + 1}
                                    </span>
                                    <span className="text-sm sm:text-base text-slate-700 truncate font-normal">{key}</span>
                                  </div>
                                  <span className="text-sm sm:text-base font-semibold text-[#F26522] shrink-0">{value} โหวต</span>
                                </div>
                              );
                            })
                          }
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Comments Wall Section */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
                    <h3 className="font-sans text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2.5 leading-[1.6]">
                      <ClipboardList className="w-4 h-4 text-[#F26522]" />
                      <span>ข้อเสนอแนะเพิ่มเติมเชิงคุณภาพจากผู้ใช้ระบบจริง</span>
                    </h3>
                    {responseSuggestions.length === 0 ? (
                      <p className="text-base text-slate-600 text-center py-6 font-normal leading-[1.6]">ไม่มีข้อเสนอแนะข้อความแบบเสรีในปัจจุบัน</p>
                    ) : (
                      <div className="max-h-60 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                        {responseSuggestions.map((sug, sIdx) => (
                          <div key={sug.id || sIdx} className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100">
                            <p className="text-base text-slate-700 italic font-normal leading-[1.6]">"{sug.text}"</p>
                            <div className="flex justify-between items-center text-sm text-slate-600 font-sans pt-1.5 border-t border-slate-200/70">
                              <span className="font-normal font-sans">ผู้ประเมิน: {sug.faculty}</span>
                              <span className="font-mono">{sug.date}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: PART 3 INFOGRAPHIC (CURRICULUM NEEDS, WORK CRITERIAS) */}
              {dashSubTab === 'part3' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Needed Majors */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
                      <h3 className="font-sans text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2.5 leading-[1.6]">
                        <BookOpen className="w-4 h-4 text-[#F26522]" />
                        <span>1. สาขาวิชาที่หน่วยงานมีความต้องการสูงสุด</span>
                      </h3>
                      {Object.keys(neededMajorsStats).length === 0 ? (
                        <p className="text-base text-slate-600 text-center py-8 font-normal leading-[1.6]">ยังไม่ได้รับข้อมูลความต้องการสาขาวิชา</p>
                      ) : (
                        <div className="space-y-3 pt-1">
                          {Object.entries(neededMajorsStats)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 10)
                            .map(([key, value]) => {
                              const pct = (value / totalCompletedCount) * 100;
                              return (
                                <div key={key} className="space-y-1">
                                  <div className="flex justify-between text-sm sm:text-base font-normal leading-[1.6]">
                                    <span className="text-slate-700 truncate max-w-[70%]" title={key}>{key}</span>
                                    <span className="text-slate-900 font-semibold shrink-0">{value} มติ ({pct.toFixed(0)}%)</span>
                                  </div>
                                  <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden">
                                    <div className="bg-[#F26522] h-full rounded-full" style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              );
                            })
                          }
                        </div>
                      )}
                    </div>

                    {/* Right: Needed Core Skills */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
                      <h3 className="font-sans text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2.5 leading-[1.6]">
                        <Sparkles className="w-4 h-4 text-[#F26522]" />
                        <span>2. ทักษะขับเคลื่อนการทำงานในอนาคตที่ต้องการ</span>
                      </h3>
                      {Object.keys(coreSkillsStats).length === 0 ? (
                        <p className="text-base text-slate-600 text-center py-8 font-normal leading-[1.6]">ยังไม่ได้ตอบรับทักษะขับเคลื่อน</p>
                      ) : (
                        <div className="space-y-3 pt-1">
                          {Object.entries(coreSkillsStats)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 10)
                            .map(([key, value]) => {
                              const pct = (value / totalCompletedCount) * 100;
                              return (
                                <div key={key} className="space-y-1">
                                  <div className="flex justify-between text-sm sm:text-base font-normal leading-[1.6]">
                                    <span className="text-slate-700 truncate max-w-[70%]" title={key}>{key}</span>
                                    <span className="text-slate-900 font-semibold shrink-0">{value} มติ ({pct.toFixed(0)}%)</span>
                                  </div>
                                  <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden">
                                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              );
                            })
                          }
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Job Experience requirement ratio */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
                      <h3 className="font-sans text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2.5 leading-[1.6]">
                        <Layers className="w-4 h-4 text-[#F26522]" />
                        <span>3. ความต้องการผู้มีประสบการณ์เริ่มวิชาชีพ</span>
                      </h3>
                      <div className="space-y-4 py-2">
                        {/* Split infographic block progress */}
                        <div className="flex items-center font-sans gap-2">
                          <div className="flex-1 text-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <span className="text-sm text-slate-600 font-semibold block">ต้องการประสบการณ์</span>
                            <span className="text-lg font-bold text-[#F26522]">{reqExperienceYes} ราย</span>
                          </div>
                          <div className="flex-1 text-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <span className="text-sm text-slate-600 font-semibold block">ไม่กำหนด / เด็กจบใหม่</span>
                            <span className="text-lg font-bold text-slate-800">{reqExperienceNo} ราย</span>
                          </div>
                        </div>

                        {/* Stack proportion visual */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs sm:text-sm text-slate-600 font-semibold">
                            <span>ต้องการประสบการณ์</span>
                            <span>ยินดีต้อนรับเด็กจบใหม่</span>
                          </div>
                          <div className="w-full bg-slate-100 h-3.5 rounded-md overflow-hidden flex shadow-inner">
                            {reqExperienceYes > 0 && (
                              <div 
                                className="bg-[#F26522] h-full text-[10px] text-white flex items-center justify-center font-bold" 
                                style={{ width: `${(reqExperienceYes / (reqExperienceYes + reqExperienceNo)) * 100}%` }}
                              >
                                {((reqExperienceYes / (reqExperienceYes + reqExperienceNo)) * 100).toFixed(0)}%
                              </div>
                            )}
                            {reqExperienceNo > 0 && (
                              <div 
                                className="bg-slate-500 h-full text-[10px] text-white flex items-center justify-center font-bold" 
                                style={{ width: `${(reqExperienceNo / (reqExperienceYes + reqExperienceNo)) * 100}%` }}
                              >
                                {((reqExperienceNo / (reqExperienceYes + reqExperienceNo)) * 100).toFixed(0)}%
                              </div>
                            )}
                          </div>
                        </div>

                        {/* spotlight duration stat */}
                        {reqExperienceYes > 0 && (
                          <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 flex items-center justify-between">
                            <span className="text-sm sm:text-base text-orange-950 font-semibold">อายุทำงานเฉลี่ยขั้นต่ำที่ต้องการ:</span>
                            <span className="text-sm sm:text-base font-bold text-[#F26522] font-mono tabular-nums">{avgExperienceMonths} เดือน (~{(avgExperienceMonths / 12).toFixed(1)} ปี)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Selection criteria */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
                      <h3 className="font-sans text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2.5 leading-[1.6]">
                        <Target className="w-4 h-4 text-[#F26522]" />
                        <span>4. เกณฑ์สำคัญที่สุดในพิจารณาคัดเลือกพนักงาน</span>
                      </h3>
                      {Object.keys(selectionCriteriaStats).length === 0 ? (
                        <p className="text-base text-slate-600 text-center py-8 font-normal leading-[1.6]">ยังไม่พบคะแนนเกณฑ์คัดเลือก</p>
                      ) : (
                        <div className="space-y-3 pt-1">
                          {Object.entries(selectionCriteriaStats)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 5)
                            .map(([key, value], idx) => {
                              const pct = (value / totalCompletedCount) * 100;
                              return (
                                <div key={key} className="space-y-1">
                                  <div className="flex justify-between text-sm sm:text-base font-normal leading-[1.6]">
                                    <span className="text-slate-700 truncate max-w-[70%]">{idx + 1}. {key}</span>
                                    <span className="text-slate-900 font-semibold shrink-0">{value} มติ ({pct.toFixed(0)}%)</span>
                                  </div>
                                  <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden">
                                    <div className="bg-[#F26522] h-full rounded-full" style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              );
                            })
                          }
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'import' && (
        <div className="space-y-6">
          {/* Main Importer Card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 shadow-sm space-y-6">
            <div className="space-y-1.5">
              <h3 className="font-sans text-xl font-bold text-slate-900 flex items-center gap-2 leading-[1.6]">
                <Upload className="w-5 h-5 text-bu-orange" />
                <span>นำเข้าฐานข้อมูลผู้บังคับบัญชาเป้าหมาย (Admin Supervisor Importer)</span>
              </h3>
              <p className="text-base text-slate-600 font-normal leading-[1.6]">
                อัปโหลดไฟล์ Excel (.xlsx, .xls) หรือ CSV จากระบบทะเบียน เพื่อสร้างรหัสผู้ตอบ 4 หลัก และรายละเอียดวิชาหลักสูตรของบัณฑิตลงในฐานระบบออนไลน์
              </p>
            </div>

            {/* Guidelines info */}
            <div className="bg-slate-50 border border-slate-100 p-5 rounded-xl space-y-3 text-base leading-[1.6] font-sans text-slate-700 font-normal">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <span className="font-sans font-semibold text-slate-800 block leading-[1.6]">ℹ️ ข้อมูลการจัดเรียงคอลัมน์ในตารางไฟล์ที่จะนำเข้า:</span>
                <button
                  type="button"
                  onClick={handleDownloadSupervisorTemplate}
                  disabled={isDownloadingTemplate}
                  className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:border-bu-orange hover:bg-orange-50/60 text-slate-800 text-sm font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50 shrink-0 self-start sm:self-auto"
                >
                  <Download className="w-4 h-4 text-bu-orange shrink-0" />
                  <span>{isDownloadingTemplate ? 'กำลังสร้างไฟล์...' : 'ดาวน์โหลดไฟล์ต้นแบบ (Template)'}</span>
                </button>
              </div>
              <ul className="list-decimal list-inside space-y-1.5 pl-2 font-normal leading-[1.6]">
                <li><strong className="font-semibold">คอลัมน์ที่ 1 (รหัส):</strong> รหัสที่ต้องการใช้เข้าล็อกอิน เช่น รหัสผ่าน 4 หลัก (ต้องเป็นตัวเลขที่ไม่ซ้ำกันเพื่อให้ผู้ตอบแต่ละรายเข้าถึง)</li>
                <li><strong className="font-semibold">คอลัมน์ที่ 2 (ปีการศึกษา):</strong> ใส่ปีการศึกษา เช่น <span className="font-semibold text-bu-orange">2569</span></li>
                <li><strong className="font-semibold">คอลัมน์ที่ 3 (ชื่อผู้บังคับบัญชา):</strong> ชื่อนามสกุลของผู้ตอบแบบสอบถาม</li>
                <li><strong className="font-semibold">คอลัมน์ที่ 4 (คณะ):</strong> สังกัดคณะของนักศึกษาที่จบไป (เช่น คณะวิศวกรรมศาสตร์)</li>
                <li><strong className="font-semibold">คอลัมน์ที่ 5 (หลักสูตร):</strong> ชื่อหลักสูตร</li>
                <li><strong className="font-semibold">คอลัมน์ที่ 6 (สาขาวิชา):</strong> ชื่อวิชาเอก (เช่น สาขาวิชาวิศวกรรมคอมพิวเตอร์)</li>
              </ul>
            </div>

            {/* Import Dropzone input */}
            <div className="flex justify-center">
              <div className="w-full max-w-lg border-2 border-dashed border-slate-300 hover:border-bu-orange rounded-2xl p-8 text-center transition-all bg-slate-50 relative cursor-pointer">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleImportFile}
                  disabled={importStatus === 'parsing' || importStatus === 'saving'}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="space-y-3 pointer-events-none">
                  <div className="flex justify-center">
                    <Upload className="w-12 h-12 text-slate-500 stroke-1" />
                  </div>
                  <div>
                    <span className="text-base font-semibold text-slate-800 block leading-[1.6]">เลือกไฟล์ตารางเพื่อนำเข้า</span>
                    <span className="text-sm sm:text-base text-slate-600 font-normal block mt-1 leading-[1.6]">ไฟล์สเปรดชีต Excel (.xlsx, .xls) หรือ CSV</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Importer progress bar & status indicators */}
            {(importStatus === 'parsing' || importStatus === 'saving') && (
              <div className="max-w-md mx-auto p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3 animate-pulse text-center">
                <span className="text-base font-semibold text-bu-orange block leading-[1.6]">
                  {importStatus === 'parsing' ? 'กำลังแยกวิเคราะห์ข้อมูลแถว...' : 'กำลังจัดเก็บรหัสลงสู่ฐาน Firestore...'}
                </span>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-bu-orange h-full transition-all duration-300"
                    style={{ width: `${(importStats.imported / Math.max(1, importStats.added || importStats.total)) * 100}%` }}
                  />
                </div>
                <p className="text-sm text-slate-600 font-mono">
                  นำเข้าข้อมูลใหม่: {importStats.imported} / {importStats.added || importStats.total} รายการ
                </p>
              </div>
            )}

            {importStatus === 'success' && (
              <div className="max-w-lg mx-auto p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 text-base rounded-xl text-center space-y-1.5">
                <strong className="font-sans font-bold block text-emerald-900 leading-[1.6]">✅ นำเข้าข้อมูลผู้ประเมินสำเร็จเสร็จสมบูรณ์!</strong>
                <p className="text-base font-normal leading-[1.6]">
                  เพิ่มผู้บังคับบัญชาใหม่ {importStats.added} รายการ
                  {importStats.skippedDuplicate > 0 ? ` • ข้ามรายการซ้ำ ${importStats.skippedDuplicate} รายการ` : ''}
                  {importStats.skippedInvalid > 0 ? ` • ข้ามข้อมูลไม่สมบูรณ์ ${importStats.skippedInvalid} รายการ` : ''}
                </p>
              </div>
            )}

            {importStatus === 'error' && (
              <div className="max-w-md mx-auto p-4 bg-rose-50 border border-rose-100 text-rose-700 text-base rounded-xl text-center font-medium leading-[1.6]">
                ❌ เกิดข้อผิดพลาดในการนำเข้าข้อมูล: {importError}
              </div>
            )}
          </div>

          {/* Supervisors Table list rendering card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden font-sans">
            <div className="p-6 md:p-8 border-b border-slate-100 space-y-4 md:space-y-0 md:flex md:items-center md:justify-between">
              <div className="space-y-1">
                <h3 className="font-sans text-xl font-bold text-slate-900 flex items-center gap-2 leading-[1.6]">
                  <Users className="w-5 h-5 text-bu-orange" />
                  <span>ข้อมูลผู้บังคับบัญชาเป้าหมายในระบบ</span>
                </h3>
                <p className="text-base text-slate-600 font-normal leading-[1.6]">
                  รายชื่อผู้ประเมิน คณะสาขา และรหัสเข้าใช้งานแบบสอบถามที่บันทึกสำเร็จ (รวมทั้งหมด {filteredSupervisors.length} รายการ จากตัวกรองวิชาการ)
                </p>
              </div>

              {/* Search Bar filter component */}
              <div className="relative w-full md:w-80 font-sans">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="h-4 w-4 text-slate-500" />
                </span>
                <input
                  type="text"
                  placeholder="ค้นหาตามรหัส, ชื่อผู้ประเมิน, คณะ, สาขา..."
                  value={supervisorSearch}
                  onChange={(e) => {
                    setSupervisorSearch(e.target.value);
                    setSupervisorPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2.5 text-base bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-bu-orange"
                />
                {supervisorSearch && (
                  <button
                    onClick={() => {
                      setSupervisorSearch('');
                      setSupervisorPage(1);
                    }}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-slate-600 hover:text-slate-800 hover:font-medium cursor-pointer"
                  >
                    ล้างค่า
                  </button>
                )}
              </div>
            </div>

            {/* Response table */}
            <div className="overflow-x-auto w-full">
              {dataLoading && supervisors.length === 0 ? (
                <div className="p-12 text-center text-slate-600 flex flex-col items-center gap-3">
                  <Loader2 className="w-7 h-7 animate-spin text-bu-orange" />
                  <span className="text-base font-medium leading-[1.6]">กำลังโหลดรายชื่อผู้บังคับบัญชาเป้าหมาย...</span>
                </div>
              ) : paginatedSupervisors.length > 0 ? (
                <table className="w-full text-sm sm:text-base text-left border-collapse min-w-[640px]">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-800 font-semibold text-sm uppercase">
                      <th className="py-3.5 px-6">รหัส (Code)</th>
                      <th className="py-3.5 px-4 text-center">ปีการศึกษา</th>
                      <th className="py-3.5 px-6">ชื่อ-นามสกุล ผู้ตอบ</th>
                      <th className="py-3.5 px-6">คณะ / หลักสูตร / สาขาวิชา</th>
                      <th className="py-3.5 px-6 text-center">สถานะการประเมิน</th>
                      <th className="py-3.5 px-6 text-center">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {paginatedSupervisors.map((item, index) => (
                      <tr key={item.id || index} className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-3 px-6 font-mono font-semibold text-bu-orange tabular-nums">
                          <span className="bg-orange-50 border border-orange-100 px-2.5 py-0.5 rounded-md text-xs sm:text-sm">
                            {item.code}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-slate-600 font-mono text-sm sm:text-base tabular-nums">
                          {item.academicYear}
                        </td>
                        <td className="py-3 px-6 font-normal text-slate-900 leading-[1.6]">
                          {item.name || '-'}
                        </td>
                        <td className="py-3 px-6">
                          <div className="text-sm sm:text-base space-y-0.5 leading-[1.6]">
                            <div className="font-semibold text-slate-800">{item.faculty}</div>
                            <div className="text-sm text-slate-600 font-normal">
                              {item.curriculum || '-'}{item.department && ` • ${item.department}`}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-6 text-center">
                          {item.isCompleted ? (
                            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-full text-xs font-semibold">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                              ประเมินเรียบร้อยแล้ว
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-full text-xs font-medium">
                              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full" />
                              รอดำเนินการประเมิน
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-6 text-center">
                          <button
                            onClick={() => handleDeleteSupervisor(item.id || '', item.code)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="ลบข้อมูลผู้บังคับบัญชาเป้าหมายรายนี้"
                          >
                            <Trash2 className="w-4 h-4 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center text-slate-600 space-y-1.5">
                  <div className="font-sans text-lg font-bold text-slate-900 leading-[1.6]">ไม่พบข้อมูลรายชื่อใดในระบบ</div>
                  <p className="text-base text-slate-600 font-normal leading-[1.6] max-w-md mx-auto">
                    ไม่มีรายชื่อผู้ประเมินที่ตรงตามเงื่อนไข ตัวกรองปีการศึกษา หรือคำค้นหาในปัจจุบัน
                  </p>
                </div>
              )}
            </div>

            {/* Table pagination */}
            {totalSupervisorPages > 1 && (
              <div className="py-4 px-4 sm:px-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm bg-slate-50/20">
                <span className="text-slate-600 text-center sm:text-left tabular-nums">
                  แสดงแถว {(currentSupervisorPage - 1) * supervisorItemsPerPage + 1} - {Math.min(currentSupervisorPage * supervisorItemsPerPage, searchedSupervisors.length)} จาก {searchedSupervisors.length} รายการ
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentSupervisorPage === 1}
                    onClick={() => setSupervisorPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    ก่อนหน้า
                  </button>
                  <span className="text-slate-700 font-semibold px-2 font-mono tabular-nums">
                    หน้า {currentSupervisorPage} / {totalSupervisorPages}
                  </span>
                  <button
                    disabled={currentSupervisorPage === totalSupervisorPages}
                    onClick={() => setSupervisorPage(p => Math.min(totalSupervisorPages, p + 1))}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    ถัดไป
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Reset Survey Codes Card inside Supervisor Management */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="font-sans text-lg font-bold text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-[#F26522]" />
                <span>จัดการสถานะรหัสแบบสำรวจ (Reset Survey Codes)</span>
              </h4>
              <p className="text-sm text-slate-600 leading-[1.6]">
                สถานะปัจจุบัน: รหัสใช้งานแล้ว <strong className="text-slate-900">{supervisors.filter(s => s.isCompleted).length}</strong> /{' '}
                <strong className="text-slate-900">{supervisors.length}</strong> รหัส • สามารถสำรองข้อมูล Excel และรีเซ็ตทุกรหัสกลับเป็น &quot;ยังไม่ได้ใช้งาน&quot; ได้
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('reset-codes')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#F26522] hover:bg-[#d95416] text-white text-sm font-bold transition-all shadow-sm shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>รีเซ็ตสถานะรหัสแบบสำรวจทั้งหมดเป็น ยังไม่ได้ใช้งาน</span>
            </button>
          </div>
        </div>
      )}

      {activeTab === 'reset-codes' && (
        <div className="w-full max-w-3xl mx-auto space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {/* Header */}
            <div className="bg-slate-900 p-6 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b-4 border-[#F26522]">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#F26522]/15 border border-[#F26522]/40 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5 text-[#F26522]" />
                </div>
                <div>
                  <h3 className="font-sans text-lg sm:text-xl font-bold leading-[1.6]">
                    จัดการสถานะรหัสแบบสำรวจ (Reset Survey Codes)
                  </h3>
                  <p className="text-sm text-slate-300 font-normal leading-[1.6]">
                    รีเซ็ตสถานะรหัสผู้บังคับบัญชาทั้งหมดกลับเป็น &quot;ยังไม่ได้ใช้งาน&quot; (isCompleted: false) โดยคงรายชื่อ คณะ และหลักสูตรเดิมไว้ครบถ้วน
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {/* Real-time Status Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center">
                  <span className="text-xs font-semibold text-slate-600 block">รหัสทั้งหมด</span>
                  <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1 block">{supervisors.length}</span>
                </div>
                <div className="bg-orange-50/70 border border-orange-200 rounded-xl p-3.5 text-center">
                  <span className="text-xs font-semibold text-orange-800 block">ใช้งานแล้ว</span>
                  <span className="text-2xl font-bold text-[#F26522] font-mono tabular-nums mt-1 block">
                    {supervisors.filter((s) => s.isCompleted).length}
                  </span>
                </div>
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 text-center">
                  <span className="text-xs font-semibold text-emerald-800 block">พร้อมใช้งาน</span>
                  <span className="text-2xl font-bold text-emerald-600 font-mono tabular-nums mt-1 block">
                    {supervisors.filter((s) => !s.isCompleted).length}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center">
                  <span className="text-xs font-semibold text-slate-600 block">ผลตอบกลับเดิม</span>
                  <span className="text-2xl font-bold text-slate-800 font-mono tabular-nums mt-1 block">{responses.length}</span>
                </div>
              </div>

              {/* Loading / Success / Error States */}
              {isResettingCodes && (
                <div className="flex items-center justify-center gap-3 p-4 rounded-xl bg-orange-50 border border-orange-200 text-orange-900 font-semibold text-base">
                  <Loader2 className="w-5 h-5 animate-spin text-[#F26522] shrink-0" />
                  <span>กำลังสำรองข้อมูลและรีเซ็ตสถานะ...</span>
                </div>
              )}

              {resetCodesStatusMsg && !isResettingCodes && (
                <div
                  role="status"
                  className={`flex items-start gap-2.5 p-4 rounded-xl border text-sm sm:text-base font-semibold leading-[1.6] ${
                    resetCodesStatusMsg.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-700'
                  }`}
                >
                  {resetCodesStatusMsg.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{resetCodesStatusMsg.text}</span>
                </div>
              )}

              {/* Step 1: Mandatory Excel Backup */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-sans text-base font-bold text-slate-900">
                      ขั้นตอนที่ 1: สำรองข้อมูลเดิมก่อนรีเซ็ต (บังคับ)
                    </h4>
                    <p className="text-sm text-slate-600 leading-[1.6]">
                      กรุณากดส่งออกไฟล์ Excel สำรองข้อมูลรายชื่อผู้ประเมินและผลตอบกลับเดิม เพื่อปลดล็อกปุ่มรีเซ็ตสถานะ
                    </p>
                  </div>
                  {hasBackedUpBeforeReset && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold shrink-0 self-start sm:self-center">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>สำรองข้อมูลแล้ว</span>
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  disabled={isResettingCodes}
                  onClick={handleExportBackupBeforeReset}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm sm:text-base font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>ส่งออกไฟล์สำรองข้อมูล (Export Backup Excel)</span>
                </button>
              </div>

              {/* Step 2: Handling existing /responses */}
              <div className="space-y-3">
                <h4 className="font-sans text-base font-bold text-slate-900">
                  ขั้นตอนที่ 2: เลือกแนวทางจัดการข้อมูลการตอบกลับเดิม (/responses)
                </h4>
                <div className="grid grid-cols-1 gap-3">
                  <label
                    className={`p-4 border rounded-xl cursor-pointer transition-all flex items-start gap-3 ${
                      resetOption === 'keep'
                        ? 'border-[#F26522] bg-orange-50/60 text-slate-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="resetOption"
                      checked={resetOption === 'keep'}
                      onChange={() => setResetOption('keep')}
                      className="mt-1 accent-[#F26522]"
                    />
                    <div className="space-y-0.5">
                      <span className="font-semibold text-sm sm:text-base block">
                        (ก) คงข้อมูลการตอบกลับเดิมไว้ (แนะนำสำหรับการทดสอบหรือเปิดใช้รหัสซ้ำ)
                      </span>
                      <span className="text-xs sm:text-sm text-slate-600 block">
                        รหัสผู้ประเมินทั้งหมดกลับมาใช้งานซ้ำได้ โดยข้อมูลคำตอบเก่าใน /responses ยังคงอยู่ครบถ้วน
                      </span>
                    </div>
                  </label>

                  <label
                    className={`p-4 border rounded-xl cursor-pointer transition-all flex items-start gap-3 ${
                      resetOption === 'clear'
                        ? 'border-rose-500 bg-rose-50/60 text-slate-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="resetOption"
                      checked={resetOption === 'clear'}
                      onChange={() => setResetOption('clear')}
                      className="mt-1 accent-rose-600"
                    />
                    <div className="space-y-0.5">
                      <span className="font-semibold text-sm sm:text-base block text-rose-900">
                        (ข) ล้างข้อมูลการตอบกลับเดิมใน /responses พร้อมกับการรีเซ็ตสถานะ
                      </span>
                      <span className="text-xs sm:text-sm text-rose-700 block">
                        ลบข้อมูลผลตอบแบบสำรวจทั้งหมดใน /responses ({responses.length} รายการ) เพื่อเริ่มต้นเก็บผลรอบใหม่ทั้งหมด (รายชื่อผู้ประเมินยังคงเดิม)
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Step 3: Trigger Reset Modal */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  disabled={!hasBackedUpBeforeReset || supervisors.length === 0 || isResettingCodes}
                  onClick={() => {
                    setResetCodesConfirmInput('');
                    setShowResetCodesModal(true);
                  }}
                  className="w-full bg-[#F26522] hover:bg-[#d95416] disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold text-base py-3.5 px-5 rounded-xl transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2"
                >
                  {isResettingCodes ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>กำลังสำรองข้อมูลและรีเซ็ตสถานะ...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      <span>รีเซ็ตสถานะรหัสแบบสำรวจทั้งหมดเป็น ยังไม่ได้ใช้งาน</span>
                    </>
                  )}
                </button>
                {!hasBackedUpBeforeReset && (
                  <p className="text-xs text-slate-500 text-center">
                    * กรุณากดปุ่ม &quot;ส่งออกไฟล์สำรองข้อมูล (Export Backup Excel)&quot; ในขั้นตอนที่ 1 ก่อนเพื่อปลดล็อกปุ่มรีเซ็ต
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'admins' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Create / Edit admin form side panels */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
            <h3 className="font-sans text-lg font-bold text-slate-900 leading-[1.6]">
              {editingAdminId ? 'แก้ไขข้อมูลผู้ดูแลระบบ' : 'เพิ่มสิทธิ์ผู้ดูแลระบบคนใหม่'}
            </h3>

            <form onSubmit={handleSaveAdmin} className="space-y-4">
              <div className="space-y-1.5 text-left text-base">
                <label className="font-semibold text-slate-800 block leading-[1.6]">ชื่อ-นามสกุล</label>
                <input
                  type="text"
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="ป้อนชื่อผู้ดูแลระบบ..."
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-base text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-bu-orange"
                />
              </div>

              <div className="space-y-1.5 text-left text-base">
                <label className="font-semibold text-slate-800 block leading-[1.6]">อีเมลสำหรับล็อกอิน</label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="example@bu.ac.th"
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-base text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-bu-orange"
                />
              </div>

              <div className="space-y-1.5 text-left text-base">
                <label className="font-semibold text-slate-800 block leading-[1.6]">ตำแหน่งงาน / สังกัด</label>
                <input
                  type="text"
                  required
                  value={adminPos}
                  onChange={(e) => setAdminPos(e.target.value)}
                  placeholder="เช่น นักแนะแนวการศึกษา สำนัก..."
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-base text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-bu-orange"
                />
              </div>

              <div className="space-y-1.5 text-left text-base">
                <label className="font-semibold text-slate-800 block leading-[1.6]">ประเภทสิทธิ์การใช้งาน</label>
                <select
                  required
                  value={adminRole}
                  onChange={(e) => setAdminRole(e.target.value as 'super_admin' | 'admin')}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-base text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-bu-orange focus:border-bu-orange"
                >
                  <option value="admin">ผู้ดูแลระบบทั่วไป (General Admin)</option>
                  <option value="super_admin">ผู้ดูแลระบบหลัก (Main Admin)</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSavingAdmin}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-base py-2.5 px-4 rounded-xl transition-all shadow-sm active:scale-[0.98] cursor-pointer"
                >
                  {isSavingAdmin ? 'กำลังบันทึก...' : (editingAdminId ? 'บันทึกการแก้ไข' : 'บันทึกรายชื่อสิทธิ์')}
                </button>
                {editingAdminId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAdminId(null);
                      setAdminName('');
                      setAdminEmail('');
                      setAdminPos('');
                      setAdminRole('admin');
                    }}
                    className="border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium text-base px-3.5 py-2.5 rounded-xl transition-all cursor-pointer animate-fade-in"
                  >
                    ยกเลิก
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Admins lists display */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm md:col-span-2 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <span className="font-sans text-base font-bold text-slate-900 leading-[1.6]">รายชื่อผู้ดูแลระบบที่มีสิทธิ์ปัจจุบัน ({admins.length} คน)</span>
            </div>

            <div className="divide-y divide-slate-100">
              {admins.map((adm) => (
                <div key={adm.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-semibold text-slate-900 leading-[1.6]">{adm.name}</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                        adm.role === 'super_admin' 
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' 
                          : 'bg-slate-50 text-slate-700 border border-slate-200'
                      }`}>
                        {adm.role === 'super_admin' ? 'ผู้ดูแลระบบหลัก' : 'ผู้ดูแลระบบทั่วไป'}
                      </span>
                    </div>
                    <span className="text-sm sm:text-base text-slate-600 font-normal block leading-[1.6]">อีเมล: {adm.email} | ตำแหน่ง: {adm.position}</span>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => handleEditAdmin(adm)}
                      className="text-sm text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 transition-all font-medium cursor-pointer"
                    >
                      แก้ไข
                    </button>
                    {adm.email !== 'walailuk.p@bu.ac.th' && (
                      <button
                        onClick={() => handleDeleteAdmin(adm.id || '', adm.email)}
                        className="text-sm text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100 transition-all font-medium cursor-pointer"
                      >
                        ลบออก
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'purge-responses' && (
        <div className="space-y-6 w-full max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {/* Header */}
            <div className="bg-slate-900 p-6 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b-4 border-[#F26522]">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#F26522]/15 border border-[#F26522]/40 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-[#F26522]" />
                </div>
                <div>
                  <h3 className="font-sans text-lg sm:text-xl font-bold leading-[1.6]">
                    ลบข้อมูลการตอบกลับตามปีการศึกษา
                  </h3>
                  <p className="text-sm text-slate-300 font-normal leading-[1.6]">
                    จัดการล้างข้อมูลผลการประเมินย้อนหลังเฉพาะคอลเลกชัน responses โดยไม่กระทบรายชื่อผู้ประเมิน (Supervisors) หรือปีการศึกษาอื่น
                  </p>
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-xs font-semibold text-orange-200 shrink-0 self-start sm:self-center">
                <ShieldCheck className="w-4 h-4 text-[#F26522]" />
                <span>Admin Audit Trail Active</span>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {/* Backup Recommendation Banner */}
              <div className="bg-orange-50/80 border border-orange-200 rounded-xl p-4 sm:p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-[#F26522] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-sans text-sm sm:text-base font-bold text-slate-900 leading-[1.6]">
                      คำแนะนำสำคัญ: กรุณาส่งออกข้อมูลสำรอง (Excel / PDF) ก่อนทำการลบทุกครั้ง
                    </h4>
                    <p className="text-sm text-slate-700 leading-[1.6]">
                      การลบข้อมูลการตอบกลับเป็นการดำเนินการแบบถาวร ไม่สามารถกู้คืนได้ ระบบจะลบเฉพาะข้อมูลการตอบกลับ (Responses) ในปีการศึกษาที่ท่านเลือกเท่านั้น และจะบันทึกประวัติการดำเนินการ (Audit Log) ไว้อัตโนมัติ
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2.5 pl-8">
                  <button
                    type="button"
                    disabled={!deleteRespYear || selectedDeleteRespCount === 0}
                    onClick={() => {
                      const list = responses.filter((r) => r.academicYear === deleteRespYear);
                      exportResponsesExcelList(list, `สำรองข้อมูลตอบกลับ_ปี_${deleteRespYear}.xlsx`);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-orange-300 text-sm font-semibold text-slate-800 hover:bg-orange-100/70 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>{deleteRespYear ? `สำรองไฟล์ Excel ปี ${deleteRespYear}` : 'เลือกปีเพื่อสำรอง Excel'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('overview')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-[#F26522]" />
                    <span>ไปหน้า Dashboard เพื่อส่งออก Excel / PDF</span>
                  </button>
                </div>
              </div>

              {/* Empty State vs Selection Controls */}
              {responses.length === 0 ? (
                <div className="border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-2 bg-slate-50/70">
                  <FolderOpen className="w-10 h-10 text-slate-400 mx-auto stroke-1" />
                  <p className="text-base font-semibold text-slate-700 leading-[1.6]">
                    ไม่พบข้อมูลการตอบกลับในระบบ
                  </p>
                  <p className="text-sm text-slate-500 leading-[1.6]">
                    ยังไม่มีรายการตอบแบบสำรวจในคอลเลกชัน responses สำหรับดำเนินการลบ
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label htmlFor="delete-resp-year" className="block text-base font-semibold text-slate-900 leading-[1.6]">
                      เลือกปีการศึกษาที่ต้องการลบข้อมูลการตอบกลับ
                    </label>
                    <select
                      id="delete-resp-year"
                      value={deleteRespYear}
                      onChange={(e) => {
                        setDeleteRespYear(e.target.value);
                        setDeleteRespConfirmInput('');
                      }}
                      disabled={isDeletingResponses}
                      className="w-full p-3 border border-slate-300 rounded-xl text-base text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#F26522]/25 focus:border-[#F26522] disabled:bg-slate-50"
                    >
                      <option value="">-- กรุณาเลือกปีการศึกษา --</option>
                      {responseYearCounts.map(({ year, count }) => (
                        <option key={year} value={year}>
                          ปีการศึกษา {year} ({count} รายการ)
                        </option>
                      ))}
                    </select>
                  </div>

                  {deleteRespYear && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-700">สรุปรายการที่จะถูกลบ</span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-700 text-xs font-bold font-mono tabular-nums">
                          {selectedDeleteRespCount} รายการ
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 leading-[1.6]">
                        ระบบจะลบข้อมูลการตอบกลับทั้งหมดของ <strong className="text-slate-900">ปีการศึกษา {deleteRespYear}</strong> จำนวน{' '}
                        <strong className="text-rose-600">{selectedDeleteRespCount} รายการ</strong> (ข้อมูลรายชื่อผู้ประเมิน Supervisors และปีการศึกษาอื่นๆ จะยังคงอยู่ครบถ้วน)
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={!deleteRespYear || selectedDeleteRespCount === 0 || isDeletingResponses}
                    onClick={() => {
                      setDeleteRespConfirmInput('');
                      setShowDeleteRespModal(true);
                    }}
                    className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold text-base py-3.5 px-5 rounded-xl transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isDeletingResponses ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>กำลังลบข้อมูล...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>ลบข้อมูลปีการศึกษาที่เลือก</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Audit Log History Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#F26522]" />
                <h4 className="font-sans text-base font-bold text-slate-900">ประวัติการลบข้อมูล (Audit Log)</h4>
              </div>
              <span className="text-xs font-medium text-slate-600">แสดงล่าสุด {auditLogs.length} รายการ</span>
            </div>
            {auditLogs.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                ยังไม่มีประวัติการลบข้อมูลการตอบกลับในระบบ
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {auditLogs.map((log) => {
                  const tsDate = log.timestamp && typeof log.timestamp.toDate === 'function'
                    ? log.timestamp.toDate()
                    : (log.timestamp ? new Date(log.timestamp) : null);
                  const dateLabel = tsDate && !Number.isNaN(tsDate.getTime())
                    ? tsDate.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
                    : 'กำลังบันทึกเวลา...';
                  return (
                    <div key={log.id} className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-slate-800">
                          {log.action === 'RESET_SURVEY_CODES'
                            ? `รีเซ็ตสถานะรหัสแบบสำรวจทั้งหมด (${log.count} รหัส)`
                            : `ลบข้อมูลการตอบกลับ ปีการศึกษา ${log.academicYear} `}
                          {log.action !== 'RESET_SURVEY_CODES' && (
                            <span className="text-rose-600 font-mono">({log.count} รายการ)</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-600">
                          ดำเนินการโดย: <span className="font-medium text-slate-800">{log.adminEmail}</span>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 font-mono shrink-0">{dateLabel}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'purge' && (
        <div className="w-full max-w-2xl mx-auto bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="bg-rose-900 p-6 text-white text-center space-y-1.5">
            <AlertTriangle className="w-12 h-12 text-bu-orange mx-auto stroke-1" />
            <h3 className="font-sans text-xl font-bold leading-[1.6]">โซนอันตราย (Data Purge Control / Danger Zone)</h3>
            <p className="text-base text-rose-100 font-normal leading-[1.6]">
              การดำเนินการในหน้านี้เป็นแบบไม่ย้อนกลับ โปรดตรวจสอบและยืนยันด้วยความระมัดระวังสูงสุด
            </p>
          </div>

          <form onSubmit={handlePurgeSubmit} className="p-6 sm:p-8 space-y-6">
            {purgeMessage.text && (
              <div className={`p-4 rounded-xl text-base text-center font-semibold leading-[1.6] ${
                purgeMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
              }`}>
                {purgeMessage.text}
              </div>
            )}

            {/* Choose academic year */}
            <div className="space-y-1.5 text-left text-base">
              <label className="font-semibold text-slate-800 block leading-[1.6]">1. เลือกปีการศึกษาที่จัดเก็บฐานข้อมูลที่ต้องการลบ</label>
              <select
                required
                value={purgeYear}
                onChange={(e) => setPurgeYear(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-base text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-rose-500"
              >
                <option value="">-- เลือกปีการศึกษาที่ลบ --</option>
                {getAcademicYearsOptions().map(yr => (
                  <option key={yr} value={yr}>ปีการศึกษา {yr}</option>
                ))}
              </select>
            </div>

            {/* Choose clear modes */}
            <div className="space-y-2.5">
              <label className="text-base font-semibold text-slate-800 block leading-[1.6]">2. เลือกรูปแบบการลบข้อมูล (3 รูปแบบหลัก)</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className={`p-3.5 border rounded-xl flex flex-col justify-between cursor-pointer transition-all ${
                  purgeMode === 'all'
                    ? 'border-rose-500 bg-rose-50 text-rose-900 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}>
                  <input
                    type="radio"
                    name="purgeMode"
                    checked={purgeMode === 'all'}
                    onChange={() => setPurgeMode('all')}
                    className="sr-only"
                  />
                  <div className="space-y-1">
                    <span className="text-base font-semibold block leading-[1.6]">ลบทั้งหมด</span>
                    <span className="text-sm leading-[1.6] font-normal block">ทั้งฐานผู้ประเมินและผลตอบแบบประเมินในระบบ</span>
                  </div>
                </label>

                <label className={`p-3.5 border rounded-xl flex flex-col justify-between cursor-pointer transition-all ${
                  purgeMode === 'supervisors'
                    ? 'border-rose-500 bg-rose-50 text-rose-900 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}>
                  <input
                    type="radio"
                    name="purgeMode"
                    checked={purgeMode === 'supervisors'}
                    onChange={() => setPurgeMode('supervisors')}
                    className="sr-only"
                  />
                  <div className="space-y-1">
                    <span className="text-base font-semibold block leading-[1.6]">ผู้ประเมินเท่านั้น</span>
                    <span className="text-sm leading-[1.6] font-normal block">ลบเฉพาะข้อมูลนำเข้าเป้าหมายรหัส 4 หลัก</span>
                  </div>
                </label>

                <label className={`p-3.5 border rounded-xl flex flex-col justify-between cursor-pointer transition-all ${
                  purgeMode === 'responses'
                    ? 'border-rose-500 bg-rose-50 text-rose-900 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}>
                  <input
                    type="radio"
                    name="purgeMode"
                    checked={purgeMode === 'responses'}
                    onChange={() => setPurgeMode('responses')}
                    className="sr-only"
                  />
                  <div className="space-y-1">
                    <span className="text-base font-semibold block leading-[1.6]">ผลตอบแบบสอบถาม</span>
                    <span className="text-sm leading-[1.6] font-normal block">ลบเฉพาะข้อมูลที่ผู้ตอบคำถามกรอกเข้ามาในระบบ</span>
                  </div>
                </label>
              </div>
            </div>

            {/* PURGE security code text */}
            <div className="space-y-2 pt-2 text-base">
              <label className="font-semibold text-rose-800 block leading-[1.6]">3. ยืนยันสิทธิ์ความปลอดภัยขั้นสุดท้าย</label>
              <p className="text-slate-600 font-normal text-base leading-[1.6]">โปรดพิมพ์คำว่า <strong className="text-rose-600">PURGE</strong> ลงในช่องด้านล่างเพื่ออนุญาตให้สิทธิ์คำสั่ง API ดำเนินการล้างฐาน</p>
              <input
                type="text"
                required
                value={purgeConfirmText}
                onChange={(e) => setPurgeConfirmText(e.target.value)}
                placeholder="กรอกคำว่า PURGE..."
                className="w-full p-2.5 border border-slate-200 rounded-lg text-base uppercase text-center font-bold tracking-widest focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <button
              type="submit"
              disabled={isPurging}
              className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-base py-3.5 px-4 rounded-xl transition-all shadow-md active:scale-[0.98] cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isPurging ? 'กำลังล้างข้อมูล...' : 'รันคำสั่งทำลายข้อมูลแบบย้อนคืนไม่ได้'}</span>
            </button>
          </form>
        </div>
      )}
      </section>
      </div>

      {/* Legacy offscreen screenshot container replaced by isolated <PdfInfographicReport /> below */}

      {/* Delete Responses by Academic Year Confirmation Modal */}
      {showDeleteRespModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-[1px] p-4"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">
            <div className="bg-rose-600 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h4 className="font-sans text-lg font-bold leading-[1.6]">
                  ยืนยันการลบข้อมูลการตอบกลับ
                </h4>
              </div>
              <button
                type="button"
                disabled={isDeletingResponses}
                onClick={() => setShowDeleteRespModal(false)}
                className="p-1 rounded-lg hover:bg-white/15 transition-colors cursor-pointer disabled:opacity-50"
                aria-label="ปิดหน้าต่าง"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm sm:text-base text-rose-900 leading-[1.6]">
                ท่านต้องการลบข้อมูลการตอบกลับทั้งหมดของ <strong>ปีการศึกษา {deleteRespYear}</strong> จำนวน{' '}
                <strong>{selectedDeleteRespCount} รายการ</strong> ใช่หรือไม่ การลบนี้ไม่สามารถกู้คืนได้
              </div>

              <div className="space-y-2">
                <label htmlFor="confirm-delete-year-input" className="block text-sm font-semibold text-slate-800 leading-[1.6]">
                  กรุณาพิมพ์ปีการศึกษา <span className="font-mono text-rose-600 font-bold">{deleteRespYear}</span> เพื่อยืนยันการลบ
                </label>
                <input
                  id="confirm-delete-year-input"
                  type="text"
                  autoFocus
                  disabled={isDeletingResponses}
                  value={deleteRespConfirmInput}
                  onChange={(e) => setDeleteRespConfirmInput(e.target.value)}
                  placeholder={`พิมพ์ ${deleteRespYear}`}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-base text-center font-mono font-bold tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/25 focus:border-rose-500 disabled:bg-slate-50"
                />
                {deleteRespConfirmInput.length > 0 && deleteRespConfirmInput.trim() !== deleteRespYear && (
                  <p className="text-xs text-rose-600 font-medium text-center">
                    ปีการศึกษาที่พิมพ์ยังไม่ตรงกับ {deleteRespYear}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isDeletingResponses}
                  onClick={() => {
                    setShowDeleteRespModal(false);
                    setDeleteRespConfirmInput('');
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm sm:text-base font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={deleteRespConfirmInput.trim() !== deleteRespYear || isDeletingResponses}
                  onClick={handleConfirmDeleteResponsesByYear}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-sm sm:text-base font-bold transition-colors cursor-pointer flex items-center gap-2"
                >
                  {isDeletingResponses ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>กำลังลบข้อมูล...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>ยืนยันการลบ</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Survey Codes Confirmation Modal */}
      {showResetCodesModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-[1px] p-4"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between border-b-2 border-[#F26522]">
              <div className="flex items-center gap-2.5">
                <RotateCcw className="w-5 h-5 text-[#F26522] shrink-0" />
                <h4 className="font-sans text-lg font-bold leading-[1.6]">
                  ยืนยันการรีเซ็ตสถานะรหัสแบบสำรวจ
                </h4>
              </div>
              <button
                type="button"
                disabled={isResettingCodes}
                onClick={() => setShowResetCodesModal(false)}
                className="p-1 rounded-lg hover:bg-white/15 transition-colors cursor-pointer disabled:opacity-50"
                aria-label="ปิดหน้าต่าง"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm sm:text-base text-slate-800 leading-[1.6] space-y-1">
                <p>
                  ระบบจะอัปเดตสถานะรหัสผู้บังคับบัญชาทั้งหมด <strong>{supervisors.length} รายการ</strong> (ใช้งานแล้ว{' '}
                  <strong>{supervisors.filter((s) => s.isCompleted).length} รายการ</strong>) ให้กลับเป็น{' '}
                  <strong className="text-[#F26522]">ยังไม่ได้ใช้งาน</strong>
                </p>
                <p className="text-xs sm:text-sm font-semibold text-slate-700">
                  การจัดการข้อมูลตอบกลับเดิม:{' '}
                  {resetOption === 'clear'
                    ? `ล้างข้อมูลใน /responses ทั้งหมด (${responses.length} รายการ)`
                    : 'คงข้อมูลการตอบกลับเดิมใน /responses ไว้ตามปกติ'}
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirm-reset-codes-input" className="block text-sm font-semibold text-slate-800 leading-[1.6]">
                  กรุณาพิมพ์คำว่า <span className="font-mono text-[#F26522] font-bold">RESET</span> เพื่อยืนยันสิทธิ์ความปลอดภัย
                </label>
                <input
                  id="confirm-reset-codes-input"
                  type="text"
                  autoFocus
                  disabled={isResettingCodes}
                  value={resetCodesConfirmInput}
                  onChange={(e) => setResetCodesConfirmInput(e.target.value)}
                  placeholder="พิมพ์ RESET"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-base text-center font-mono font-bold uppercase tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#F26522]/25 focus:border-[#F26522] disabled:bg-slate-50"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isResettingCodes}
                  onClick={() => {
                    setShowResetCodesModal(false);
                    setResetCodesConfirmInput('');
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm sm:text-base font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={resetCodesConfirmInput.trim().toUpperCase() !== 'RESET' || isResettingCodes}
                  onClick={handleConfirmResetSurveyCodes}
                  className="px-5 py-2.5 rounded-xl bg-[#F26522] hover:bg-[#d95416] disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-sm sm:text-base font-bold transition-colors cursor-pointer flex items-center gap-2"
                >
                  {isResettingCodes ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>กำลังสำรองข้อมูลและรีเซ็ตสถานะ...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      <span>ยืนยันการรีเซ็ต</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmDialog && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[1px] p-4"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-sans text-lg font-bold text-slate-900 leading-[1.6]">{confirmDialog.title}</h4>
                <p className="text-base text-slate-700 leading-[1.6] font-normal">{confirmDialog.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isConfirmProcessing}
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-base font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isConfirmProcessing}
                onClick={async () => {
                  setIsConfirmProcessing(true);
                  try {
                    await confirmDialog.onConfirm();
                  } finally {
                    setIsConfirmProcessing(false);
                    setConfirmDialog(null);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-base font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {isConfirmProcessing ? 'กำลังดำเนินการ...' : (confirmDialog.confirmLabel || 'ยืนยัน')}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* PDF Report Preview Modal */}
      {isPdfPreviewOpen && pdfPreviewContent && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pdf-preview-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleClosePdfPreview();
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2 sm:p-4 lg:p-6"
        >
          <div className="bg-slate-100 rounded-2xl border border-slate-200 shadow-2xl w-full max-w-[920px] max-h-[94vh] flex flex-col overflow-hidden">
            {/* Sticky Modal Header */}
            <div className="bg-white px-4 sm:px-6 py-3.5 border-b border-slate-200 shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <h4
                    id="pdf-preview-modal-title"
                    className="font-sans text-base sm:text-lg font-bold text-slate-900 leading-snug"
                  >
                    ตัวอย่างรายงานสรุปผลสำรวจ (PDF Preview)
                  </h4>
                  <span className="text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-md truncate max-w-[260px]">
                    {pdfPreviewContent.fileName}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadPdfFromPreview}
                    disabled={isGeneratingPdf}
                    className={`${
                      pdfDownloadSuccess
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300'
                    } text-white text-sm font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer shadow-sm`}
                  >
                    {isGeneratingPdf ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>กำลังสร้างไฟล์ PDF...</span>
                      </>
                    ) : pdfDownloadSuccess ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>ดาวน์โหลดสำเร็จ</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>ดาวน์โหลด PDF (.pdf)</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintPdfPreview}
                    disabled={isGeneratingPdf}
                    className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Printer className="w-4 h-4" />
                    <span>พิมพ์ (Print)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClosePdfPreview}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold px-3 py-2 rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                    aria-label="ปิดตัวอย่างรายงาน PDF"
                  >
                    <X className="w-4 h-4" />
                    <span>ปิด</span>
                  </button>
                </div>
              </div>

              {pdfPreviewError && (
                <div className="mt-2.5 flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{pdfPreviewError}</span>
                </div>
              )}
            </div>

            {/* Scrollable A4 Preview Canvas */}
            <div className="flex-1 overflow-auto p-3 sm:p-6 bg-slate-200/80">
              <div className="w-full overflow-x-auto flex">
                <div
                  className="mx-auto bg-white shadow-2xl ring-1 ring-slate-900/10 shrink-0"
                  style={{ width: '794px', minHeight: '1123px' }}
                >
                  {previewStyleMarkup && (
                    <style
                      data-bu-pdf-style="true"
                      dangerouslySetInnerHTML={previewStyleMarkup}
                    />
                  )}
                  {previewBodyMarkup && (
                    <div
                      ref={pdfPreviewContainerRef}
                      dangerouslySetInnerHTML={previewBodyMarkup}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
