import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
  onSnapshot 
} from 'firebase/firestore';
import { 
  GoogleAuthProvider,
  signInWithPopup,
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { db, auth, OperationType, handleFirestoreError } from '../firebase';
import { Admin, Supervisor, SurveyResponse } from '../types';
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
  Loader2,
  Printer
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
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [emailText, setEmailText] = useState('');
  const [passwordText, setPasswordText] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isProviderDisabled, setIsProviderDisabled] = useState(false);

  // Loaded DB data
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Modal / Inputs state for Admin List
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPos, setAdminPos] = useState('');
  const [adminRole, setAdminRole] = useState<'super_admin' | 'admin'>('admin');
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);

  // Active tab
  const [activeTab, setActiveTab] = useState<'overview' | 'import' | 'admins' | 'purge'>('overview');
  const [dashSubTab, setDashSubTab] = useState<'part1' | 'part2' | 'part3'>('part1');

  // Filters state
  const [filterYear, setFilterYear] = useState<string>('2568');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterFaculty, setFilterFaculty] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [hasDefaultedYear, setHasDefaultedYear] = useState(false);

  // PDF Export state & ref
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  // Reset department filter when faculty changes
  useEffect(() => {
    setFilterDepartment('all');
  }, [filterFaculty]);

  // Importer states
  const [importStatus, setImportStatus] = useState<'idle' | 'parsing' | 'saving' | 'success' | 'error'>('idle');
  const [importStats, setImportStats] = useState({ total: 0, imported: 0 });
  const [importError, setImportError] = useState('');
  const [supervisorSearch, setSupervisorSearch] = useState('');
  const [supervisorPage, setSupervisorPage] = useState(1);

  // Purge states
  const [purgeYear, setPurgeYear] = useState('');
  const [purgeMode, setPurgeMode] = useState<'all' | 'supervisors' | 'responses'>('responses');
  const [purgeConfirmText, setPurgeConfirmText] = useState('');
  const [purgeMessage, setPurgeMessage] = useState({ text: '', type: '' });

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const email = currentUser.email;
        if (email && email.endsWith('@bu.ac.th')) {
          setUser(currentUser);
          setIsAdminUser(true);
        } else {
          try {
            await signOut(auth);
          } catch (e) {
            console.error('Logout error:', e);
          }
          setUser(null);
          setIsAdminUser(false);
          setAuthError('จำกัดสิทธิ์ใช้งานเฉพาะบัญชี Google ของมหาวิทยาลัยกรุงเทพ (@bu.ac.th) เท่านั้น');
        }
      } else {
        setUser(null);
        setIsAdminUser(false);
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

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
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'admins'));

    const unsubSupervisors = onSnapshot(collection(db, 'supervisors'), (snap) => {
      const list: Supervisor[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as Supervisor);
      });
      setSupervisors(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'supervisors'));

    const unsubResponses = onSnapshot(collection(db, 'responses'), (snap) => {
      const list: SurveyResponse[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as SurveyResponse);
      });
      setResponses(list);
      setDataLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'responses'));

    return () => {
      unsubAdmins();
      unsubSupervisors();
      unsubResponses();
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
      const email = loggedInUser.email;
      
      if (!email || !email.endsWith('@bu.ac.th')) {
        await signOut(auth);
        setAuthError('จำกัดสิทธิ์ใช้งานเฉพาะบัญชี Google ของมหาวิทยาลัยกรุงเทพ (@bu.ac.th) เท่านั้น');
        return;
      }

      // Check if admin doc exists
      const adminDocRef = doc(db, 'admins', loggedInUser.uid);
      const adminDocSnap = await getDoc(adminDocRef);

      if (!adminDocSnap.exists()) {
        const adminsRef = collection(db, 'admins');
        const q = query(adminsRef, where('email', '==', email));
        const querySnap = await getDocs(q);

        if (!querySnap.empty) {
          const existingDoc = querySnap.docs[0];
          await updateDoc(doc(db, 'admins', existingDoc.id), {
            uid: loggedInUser.uid
          });
        } else {
          await setDoc(adminDocRef, {
            uid: loggedInUser.uid,
            email: email,
            name: loggedInUser.displayName || email.split('@')[0],
            position: email === 'walailuk.p@bu.ac.th' ? 'ผู้ดูแลระบบหลัก' : 'ผู้ดูแลระบบทั่วไป',
            role: email === 'walailuk.p@bu.ac.th' ? 'super_admin' : 'admin'
          });
        }
      }
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
    if (!adminName || !adminEmail || !adminPos) return;

    try {
      if (editingAdminId) {
        const docRef = doc(db, 'admins', editingAdminId);
        await updateDoc(docRef, {
          name: adminName,
          email: adminEmail,
          position: adminPos,
          role: adminRole
        });
        setEditingAdminId(null);
      } else {
        await addDoc(collection(db, 'admins'), {
          uid: '', // Placeholder, will match if they sign up later
          name: adminName,
          email: adminEmail,
          position: adminPos,
          role: adminRole
        });
      }
      setAdminName('');
      setAdminEmail('');
      setAdminPos('');
      setAdminRole('admin');
    } catch (err) {
      handleFirestoreError(err, editingAdminId ? OperationType.UPDATE : OperationType.CREATE, 'admins');
    }
  };

  const handleDeleteAdmin = async (id: string, email: string) => {
    if (email === 'walailuk.p@bu.ac.th') {
      alert('ไม่สามารถลบผู้ดูแลระบบหลัก (Bootstrapped Admin) ได้');
      return;
    }
    if (!confirm('ยืนยันที่จะลบผู้ดูแลระบบท่านนี้จากรายชื่อสิทธิ์การเข้าถึง?')) return;

    try {
      await deleteDoc(doc(db, 'admins', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `admins/${id}`);
    }
  };

  const handleEditAdmin = (adm: Admin) => {
    setEditingAdminId(adm.id || null);
    setAdminName(adm.name);
    setAdminEmail(adm.email);
    setAdminPos(adm.position);
    setAdminRole(adm.role || 'admin');
  };

  // Parse Excel/CSV Client-side for Importer
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('parsing');
    setImportError('');

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        if (data.length <= 1) {
          throw new Error('ไม่พบข้อมูลผู้ประเมินในไฟล์ของคุณ กรุณาตรวจสอบแถวข้อมูล');
        }

        // Header Row check or positions mapping
        // We assume:
        // Index 0: code, Index 1: year, Index 2: name, Index 3: faculty, Index 4: curriculum, Index 5: department
        // Let's do dynamic mapping if headers exist
        const headers = data[0].map(h => String(h).trim().toLowerCase());
        
        let codeIdx = 0;
        let yearIdx = 1;
        let nameIdx = 2;
        let facIdx = 3;
        let currIdx = 4;
        let depIdx = 5;

        // Try mapping by name
        headers.forEach((h, idx) => {
          if (h.includes('รหัส') || h.includes('code') || h.includes('id')) codeIdx = idx;
          if (h.includes('ปี') || h.includes('year') || h.includes('academic')) yearIdx = idx;
          if (h.includes('ชื่อ') || h.includes('name') || h.includes('ผู้บังคับบัญชา')) nameIdx = idx;
          if (h.includes('คณะ') || h.includes('faculty')) facIdx = idx;
          if (h.includes('หลักสูตร') || h.includes('curriculum')) currIdx = idx;
          if (h.includes('สาขา') || h.includes('department') || h.includes('major')) depIdx = idx;
        });

        const importRecords: Omit<Supervisor, 'id'>[] = [];

        // Parse individual rows (ignoring header row at index 0)
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length === 0) continue;

          const rawCode = String(row[codeIdx] || '').trim();
          const rawYear = String(row[yearIdx] || '').trim();
          const rawName = String(row[nameIdx] || '').trim();
          const rawFac = String(row[facIdx] || '').trim();
          const rawCurr = String(row[currIdx] || '').trim();
          const rawDep = String(row[depIdx] || '').trim();

          if (!rawCode || !rawName) continue; // Skip lines without vital info

          importRecords.push({
            code: rawCode.padStart(4, '0'), // assure 4 digit representation
            academicYear: rawYear || '2568',
            name: rawName,
            faculty: rawFac || 'คณะเทคโนโลยีสารสนเทศและนวัตกรรม',
            curriculum: rawCurr || 'วิทยาศาสตรบัณฑิต',
            department: rawDep || 'เทคโนโลยีสารสนเทศ',
            isCompleted: false
          });
        }

        if (importRecords.length === 0) {
          throw new Error('ไม่พบข้อมูลแถวที่ครบถ้วน (รหัส 4 หลัก และชื่อผู้บังคับบัญชาจำเป็นต้องมี)');
        }

        setImportStats({ total: importRecords.length, imported: 0 });
        setImportStatus('saving');

        // Insert into Firestore sequentially
        let savedCount = 0;
        for (const record of importRecords) {
          // Check if code already exists under same year
          // We query before save to keep database safe
          const existingQ = query(
            collection(db, 'supervisors'), 
            where('code', '==', record.code),
            where('academicYear', '==', record.academicYear)
          );
          const existingSnapshot = await getDocs(existingQ);

          if (existingSnapshot.empty) {
            await addDoc(collection(db, 'supervisors'), record);
          }
          savedCount++;
          setImportStats(prev => ({ ...prev, imported: savedCount }));
        }

        setImportStatus('success');
      } catch (err: any) {
        console.error(err);
        setImportError(err.message || 'โครงสร้างไฟล์ไม่ถูกต้อง กรุณาใช้ไฟล์ตามคำแนะนำอย่างละเอียด');
        setImportStatus('error');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Export Filtered Table to Excel using xlsx client-side
  const handleExportFilteredResponses = () => {
    if (filteredResponses.length === 0) {
      alert('ไม่มีข้อมูลในตัวกรองปัจจุบันเพื่อทำการส่งออก');
      return;
    }

    const rows = filteredResponses.map(resp => {
      // Build dynamic flat row
      const ratingsCol: Record<string, number> = {};
      for (let i = 1; i <= 13; i++) {
        ratingsCol[`ข้อ ${i}: ${getShortAttributeLabel(i)}`] = resp.part2.ratings[i] || 0;
      }

      return {
        'ปีการศึกษา': resp.academicYear,
        'เดือนที่ตอบ': getThaiMonthName(resp.month),
        'วันที่ส่ง': new Date(resp.submittedAt).toLocaleDateString('th-TH'),
        'รหัสแบบประเมิน': resp.supervisorCode,
        'ชื่อคณะวิชา': resp.faculty,
        'หลักสูตร': resp.curriculum,
        'สาขาวิชา': resp.department,
        'ตำแหน่งผู้ตอบ': resp.part1.position + (resp.part1.positionOther ? ` (${resp.part1.positionOther})` : ''),
        'ประสบการณ์ทำงานผู้ตอบ': resp.part1.experience,
        'ประเภทหน่วยงาน': resp.part1.orgType + (resp.part1.orgTypeOther ? ` (${resp.part1.orgTypeOther})` : ''),
        'กลุ่มอุตสาหกรรม': resp.part1.industries.join(', ') + (resp.part1.industriesOther ? ` (${resp.part1.industriesOther})` : ''),
        'ระยะทำงานของบัณฑิต': resp.part1.graduateDuration,
        ...ratingsCol,
        'สิ่งที่ประทับใจลำดับต้นๆ': resp.part2.strongPoints.join(' | ') + (resp.part2.strongPointsOther ? ` (${resp.part2.strongPointsOther})` : ''),
        'ทักษะที่ควรพัฒนาเพิ่ม': resp.part2.skillsToImprove.join(' | ') + (resp.part2.skillsToImproveOther ? ` (${resp.part2.skillsToImproveOther})` : ''),
        'ข้อเสนอแนะเพิ่มเติม': resp.part2.suggestions || '',
        'สาขาที่ทำงานต้องการรับเพิ่ม': resp.part3.neededMajors.join(', ') + (resp.part3.neededMajorsOther ? ` (${resp.part3.neededMajorsOther})` : ''),
        'ทักษะหลักที่ทำงานต้องการ': resp.part3.coreSkills.join(', ') + (resp.part3.coreSkillsOther ? ` (${resp.part3.coreSkillsOther})` : ''),
        'ต้องการบุคลากรมีประสบการณ์': resp.part3.requiresExperience === 'yes' ? `ต้องการ (${resp.part3.experienceMonths} เดือน)` : 'ไม่ต้องการ',
        'เกณฑ์คัดเลือกบุคลากรหลัก': resp.part3.selectionCriteria.join(', ') + (resp.part3.selectionCriteriaOther ? ` (${resp.part3.selectionCriteriaOther})` : '')
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'รายงานแบบสำรวจดิบ');

    // Generate average statistics sheet as well!
    const summaryRows = [];
    for (let i = 1; i <= 13; i++) {
      const sum = filteredResponses.reduce((acc, cr) => acc + (cr.part2.ratings[i] || 0), 0);
      const avg = filteredResponses.length > 0 ? (sum / filteredResponses.length) / 2 : 0;
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
      'คะแนนเฉลี่ย (Mean - เต็ม 5)': tqfMean
    });
    summaryRows.push({
      'ข้อที่': 'รายด้าน',
      'คุณลักษณะประเมิน': '2. ด้านการพัฒนาบัณฑิตตามอัตลักษณ์ (ข้อ 6 - ข้อ 8, ข้อ 5)',
      'คะแนนรวม': '-',
      'คะแนนเฉลี่ย (Mean - เต็ม 5)': identityMean
    });
    summaryRows.push({
      'ข้อที่': 'รายด้าน',
      'คุณลักษณะประเมิน': '3. ด้านการพัฒนาตาม BU 5 (ข้อ 9 - ข้อ 12, ข้อ 6)',
      'คะแนนรวม': '-',
      'คะแนนเฉลี่ย (Mean - เต็ม 5)': dnaMean
    });

    const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'รายงานวิเคราะห์เชิงลึก');

    // Save
    let prefix = 'รายงานแบบสำรวจคุณภาพบัณฑิต_BU';
    if (filterFaculty !== 'all') prefix += `_คณะ_${filterFaculty}`;
    if (filterDepartment !== 'all') prefix += `_สาขา_${filterDepartment}`;
    const fname = `${prefix}_ปี_${filterYear}_เดือน_${filterMonth === 'all' ? 'ทั้งหมด' : getThaiMonthName(filterMonth)}.xlsx`;
    XLSX.writeFile(workbook, fname);
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

  const handleDeleteSupervisor = async (id: string, code: string) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลสิทธิ์ผู้ประเมินรหัส ${code}?`)) {
      return;
    }
    try {
      if (id) {
        await deleteDoc(doc(db, 'supervisors', id));
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `supervisors/${id}`);
    }
  };

  // Calculate stats dynamically according to the user's rules:
  // 1. หากเลือกแค่ปีการศึกษา -> คิดสัดส่วนจากฐานข้อมูลผู้ประเมินทั้งหมดในระบบของปีการศึกษานั้น
  // 2. หากเลือกปีการศึกษาและรายคณะ -> คิดสัดส่วนจากฐานข้อมูลผู้ประเมินของปีการศึกษา/คณะที่เลือก
  // 3. หากเลือกปีการศึกษา รายคณะ และรายสาขาวิชา -> คิดสัดส่วนจากฐานข้อมูลผู้ประเมินของปีการศึกษา/คณะ/สาขาวิชาที่เลือก
  const totalSentCount = (() => {
    if (filterFaculty === 'all' && filterDepartment === 'all') {
      // Rule 1: หากเลือกแค่ปีการศึกษา (หรือทั้งหมดทุกคณะและสาขาวิชา)
      return supervisors.filter(sup => filterYear === 'all' || sup.academicYear === filterYear).length;
    } else if (filterFaculty !== 'all' && filterDepartment === 'all') {
      // Rule 2: หากเลือกปีการศึกษาและรายคณะ
      return supervisors.filter(sup => 
        (filterYear === 'all' || sup.academicYear === filterYear) && 
        sup.faculty === filterFaculty
      ).length;
    } else {
      // Rule 3: หากเลือกปีการศึกษา รายคณะ และรายสาขาวิชา
      return supervisors.filter(sup => 
        (filterYear === 'all' || sup.academicYear === filterYear) && 
        sup.faculty === filterFaculty && 
        sup.department === filterDepartment
      ).length;
    }
  })();

  const totalCompletedCount = filteredResponses.length;
  const responseRate = totalSentCount > 0 ? (totalCompletedCount / totalSentCount) * 100 : 0;

  // Average Score of ALL 13 qualities
  const attributeSums = Array(13).fill(0);
  filteredResponses.forEach(resp => {
    for (let i = 1; i <= 13; i++) {
      attributeSums[i - 1] += (resp.part2.ratings[i] || 0);
    }
  });
  const attributeMeans = attributeSums.map(sum => totalCompletedCount > 0 ? parseFloat(((sum / totalCompletedCount) / 2).toFixed(2)) : 0);
  const compositeMean = attributeMeans.length > 0 ? parseFloat((attributeMeans.reduce((a, b) => a + b, 0) / attributeMeans.length).toFixed(2)) : 0;

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

  const handleExportPdf = async () => {
    if (!pdfContainerRef.current) return;
    setIsGeneratingPdf(true);

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const marginX = 20; // 2 cm left/right margins
      const marginY = 20; // 2 cm top/bottom margins
      const printableWidth = pageWidth - (marginX * 2); // 170 mm
      const printableHeight = pageHeight - (marginY * 2); // 257 mm

      const blocks = pdfContainerRef.current.querySelectorAll<HTMLElement>('.pdf-block');
      
      let currentY = marginY;
      let pageNumber = 1;

      const addHeaderFooter = (doc: jsPDF, pageNum: number) => {
        // Running header inside top 2cm margin
        doc.setFontSize(8);
        doc.setTextColor(130, 130, 130);
        doc.text('รายงานสรุปผลการประเมินคุณภาพบัณฑิต - มหาวิทยาลัยกรุงเทพ (Bangkok University)', marginX, 12);
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.line(marginX, 15, pageWidth - marginX, 15);

        // Running footer inside bottom 2cm margin
        doc.line(marginX, pageHeight - 15, pageWidth - marginX, pageHeight - 15);
        doc.text('ระบบประมวลผลสถิติและรายงานผลประเมิน มหาวิทยาลัยกรุงเทพ', marginX, pageHeight - 10);
        doc.text(`หน้า ${pageNum}`, pageWidth - marginX, pageHeight - 10, { align: 'right' });
      };

      addHeaderFooter(pdf, pageNumber);

      const parseColorToRgb = (colorStr: string): string => {
        if (!colorStr) return colorStr;
        if (typeof document === 'undefined') return 'rgb(100, 116, 139)';
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return 'rgb(100, 116, 139)';

          ctx.fillStyle = 'rgb(1, 2, 3)';
          ctx.fillStyle = colorStr.trim();
          const resolved = ctx.fillStyle;

          if (resolved === 'rgb(1, 2, 3)' && !colorStr.includes('rgb(1, 2, 3)')) {
            return 'rgb(100, 116, 139)';
          }

          if (resolved.startsWith('#')) {
            const hex = resolved.slice(1);
            if (hex.length === 6) {
              const r = parseInt(hex.slice(0, 2), 16);
              const g = parseInt(hex.slice(2, 4), 16);
              const b = parseInt(hex.slice(4, 6), 16);
              return `rgb(${r}, ${g}, ${b})`;
            } else if (hex.length === 8) {
              const r = parseInt(hex.slice(0, 2), 16);
              const g = parseInt(hex.slice(2, 4), 16);
              const b = parseInt(hex.slice(4, 6), 16);
              const a = parseFloat((parseInt(hex.slice(6, 8), 16) / 255).toFixed(2));
              return `rgba(${r}, ${g}, ${b}, ${a})`;
            }
          }
          if (resolved && !/(oklch|oklab|lab|lch|light-dark)/i.test(resolved)) {
            return resolved;
          }
        } catch {
          // fallback
        }
        return 'rgb(100, 116, 139)';
      };

      const replaceModernColorsInText = (cssText: string): string => {
        if (!cssText) return cssText;
        if (!/(oklch|oklab|lab|lch|light-dark)/i.test(cssText)) return cssText;

        // 1st pass: convert function calls using canvas 2d context
        let cleaned = cssText.replace(/(oklch|oklab|lab|lch|light-dark)\s*\(([^;{}]+?)\)/gi, (match) => {
          return parseColorToRgb(match);
        });

        // 2nd pass: fallback sweep for any remaining unparsed function strings
        cleaned = cleaned.replace(/(oklch|oklab|lab|lch|light-dark)\s*\([\s\S]*?\)/gi, 'rgb(100, 116, 139)');

        return cleaned;
      };

      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        const canvas = await html2canvas(block, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          onclone: (clonedDoc) => {
            const styleEls = clonedDoc.querySelectorAll('style');
            styleEls.forEach((style) => {
              if (style.textContent) {
                style.textContent = replaceModernColorsInText(style.textContent);
              }
            });

            const allEls = clonedDoc.querySelectorAll('*');
            allEls.forEach((el) => {
              const htmlEl = el as HTMLElement;
              const styleAttr = htmlEl.getAttribute('style');
              if (styleAttr && /(oklch|oklab|lab|lch|light-dark)/i.test(styleAttr)) {
                htmlEl.setAttribute('style', replaceModernColorsInText(styleAttr));
              }

              try {
                const computed = clonedDoc.defaultView?.getComputedStyle(htmlEl) || window.getComputedStyle(htmlEl);
                if (computed) {
                  const props = ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'fill', 'stroke'];
                  for (const prop of props) {
                    const val = computed.getPropertyValue(prop) || (computed as any)[prop];
                    if (val && /(oklch|oklab|lab|lch|light-dark)/i.test(val)) {
                      (htmlEl.style as any)[prop] = parseColorToRgb(val);
                    }
                  }
                }
              } catch {
                // ignore
              }
            });
          }
        });

        const imgData = canvas.toDataURL('image/png');
        const imgHeightMm = (canvas.height * printableWidth) / canvas.width;

        // Check page overflow
        if (currentY + imgHeightMm > marginY + printableHeight && currentY > marginY + 5) {
          pdf.addPage('a4', 'portrait');
          pageNumber++;
          addHeaderFooter(pdf, pageNumber);
          currentY = marginY;
        }

        pdf.addImage(imgData, 'PNG', marginX, currentY, printableWidth, imgHeightMm);
        currentY += imgHeightMm + 4; // 4 mm gap
      }

      let prefix = 'รายงานสรุปผลการประเมินคุณภาพบัณฑิต_BU';
      if (filterFaculty !== 'all') prefix += `_คณะ_${filterFaculty}`;
      if (filterDepartment !== 'all') prefix += `_สาขา_${filterDepartment}`;
      const filename = `${prefix}_ปี_${filterYear}_เดือน_${filterMonth === 'all' ? 'ทั้งหมด' : getThaiMonthName(filterMonth)}.pdf`;

      pdf.save(filename);
    } catch (err) {
      console.error('Error generating PDF report:', err);
      alert('เกิดข้อผิดพลาดในการสร้างไฟล์ PDF กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const avgExperienceMonths = totalExperienceMonthsCount > 0 ? parseFloat((totalExperienceMonthsSum / totalExperienceMonthsCount).toFixed(1)) : 0;

  // Admin Data Purge action
  const handlePurgeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPurgeMessage({ text: '', type: '' });

    if (!purgeYear) {
      setPurgeMessage({ text: 'กรุณาเลือกปีการศึกษาที่ต้องการดำเนินการลบ', type: 'error' });
      return;
    }
    if (purgeConfirmText !== 'PURGE') {
      setPurgeMessage({ text: 'กรุณากรอกคำว่า "PURGE" ในกล่องข้อความเพื่อยืนยันสิทธิ์', type: 'error' });
      return;
    }

    try {
      let deletedSupervisorsCount = 0;
      let deletedResponsesCount = 0;

      if (purgeMode === 'all' || purgeMode === 'supervisors') {
        const qCopy = query(collection(db, 'supervisors'), where('academicYear', '==', purgeYear));
        const snap = await getDocs(qCopy);
        for (const docSnap of snap.docs) {
          await deleteDoc(doc(db, 'supervisors', docSnap.id));
          deletedSupervisorsCount++;
        }
      }

      if (purgeMode === 'all' || purgeMode === 'responses') {
        const qCopy = query(collection(db, 'responses'), where('academicYear', '==', purgeYear));
        const snap = await getDocs(qCopy);
        for (const docSnap of snap.docs) {
          await deleteDoc(doc(db, 'responses', docSnap.id));
          deletedResponsesCount++;
        }
      }

      setPurgeMessage({
        text: `ทำสำเสร็จเป็นที่เรียบร้อย: ลบข้อมูลผู้ประเมินไปแล้ว ${deletedSupervisorsCount} รายการ และข้อมูลตอบกลับ ${deletedResponsesCount} รายการ ในเครือปีการศึกษา ${purgeYear}`,
        type: 'success'
      });
      setPurgeConfirmText('');
    } catch (err) {
      console.error(err);
      setPurgeMessage({ text: 'เกิดข้อผิดพลาดในการดำเนินการเคลียร์ข้อมูล: ' + String(err), type: 'error' });
    }
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <svg className="animate-spin h-8 w-8 text-bu-orange" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm text-slate-500 font-light">กำลังเชื่อมต่อข้อมูลผู้ล๊อคอิน...</span>
      </div>
    );
  }

  // If not logged in, show Auth login form
  if (!user) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden text-center animate-fade-in">
        <div className="bg-slate-900 py-8 px-6 text-white space-y-1">
          <Settings className="w-10 h-10 text-bu-orange mx-auto mb-2 stroke-1" />
          <h2 className="text-xl sm:text-2xl font-bold">ระบบบริหารจัดการ (Admin Portal)</h2>
          <p className="text-slate-400 text-xs font-light">
            สำนักมาตรฐานคุณภาพการศึกษา มหาวิทยาลัยกรุงเทพ
          </p>
        </div>

        <div className="p-6 md:p-8 space-y-5 text-left">
          {isIframe && (
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-2.5 text-xs text-indigo-900 shadow-sm font-sans">
              <div className="flex items-center gap-1.5 font-bold text-indigo-950 text-[13px]">
                <span className="animate-bounce">💡</span>
                <span>คำแนะนำความปลอดภัย: รันแอปแยกแท็บ</span>
              </div>
              <p className="leading-relaxed font-light text-indigo-800">
                เนื่องจากเบราว์เซอร์ส่วนใหญ่บล็อกหน้าต่างป๊อปอัปของระบบเข้าสู่ระบบ (Google Auth) เมื่อรันอยู่ใน iFrame พรีวิวของ AI Studio เพื่อป้องกันไม่ให้เกิดความล่าช้าหรือการล็อกอินล้มเหลว กรุณาคลิกปุ่มด้านล่างเพื่อเปิดแบบเต็มหน้าต่างแยกออกไป
              </p>
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-sm active:scale-[0.98] cursor-pointer text-center font-sans mt-1"
              >
                เปิดใช้งานในแท็บใหม่ (Open in New Tab) 🚀
              </a>
            </div>
          )}

          {authError && (
            <div className="p-3.5 bg-rose-50 text-rose-600 text-xs rounded-xl text-center font-semibold leading-relaxed border border-rose-100">
              {authError}
            </div>
          )}

          {isProviderDisabled && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl space-y-2 text-xs text-orange-800">
              <span className="font-bold block text-[13px] text-orange-900">🛠️ วิธีเปิดใช้งาน Google Sign-In ใน Firebase Auth:</span>
              <ol className="list-decimal list-inside space-y-1.5 font-light leading-relaxed">
                <li>เปิดลิงก์ <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="font-semibold underline text-[#F26522] hover:opacity-80">Firebase Console</a></li>
                <li>ไปที่ระบบ <strong className="font-bold">Authentication</strong> &gt; แท็บ <strong className="font-bold">Sign-in method</strong></li>
                <li>คลิก <strong className="font-bold">Add new provider</strong> จากนั้นเลือกชนิด <strong className="font-bold">Google</strong></li>
                <li>เปิดปุ่มสวิตช์ <strong className="font-bold">Enable</strong> กำหนดอีเมลซัพพอร์ตโครงการ แล้วกดจัดเก็บ <strong className="font-bold">Save</strong> ให้ระบบบันทึกผล</li>
                <li>กลับมาที่หน้าเว็บนี้ ทำการรีเฟรช (Refresh) 1 ครั้ง แล้วเข้าสู่ระบบด้วย Google อีกครั้ง</li>
              </ol>
            </div>
          )}

          <div className="text-center space-y-3 py-2">
            <p className="text-sm text-slate-500 font-light leading-relaxed">
              กรุณาเข้าสู่ระบบด้วยบัญชี Google ของทางมหาวิทยาลัย (@bu.ac.th) เพื่อเข้าใช้งานแผงควบคุมระบบบริหารจัดการผู้ดูแลระบบ (Admin Portal)
            </p>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-[#F26522] hover:bg-[#d95416] text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-sm hover:shadow active:scale-[0.98] cursor-pointer"
          >
            <span>ลงชื่อเข้าใช้งานสำหรับ Admin</span>
          </button>

          <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
            <div className="flex items-start gap-2.5">
              <div className="text-orange-500 font-bold text-sm mt-0.5">⚠️</div>
              <p className="text-[11px] text-orange-700 leading-relaxed font-light">
                <strong>เงื่อนไขความปลอดภัย:</strong> ระบบจำกัดสิทธิ์เฉพาะการใช้อีเมลมหาวิทยาลัยกรุงเทพ (อีเมลลงท้ายด้วย <code>@bu.ac.th</code>) เท่านั้น บัญชีอีเมลภายนอก เช่น Gmail ส่วนบุคคล จะถูกปฏิเสธการเชื่อมต่อโดยอัตโนมัติ
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* 2-column High Density structure */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Left Side: Sidebar Column */}
        <aside className="w-full lg:w-72 flex flex-col gap-4 shrink-0 font-sans">
          {/* Active Admin Profile Card */}
          <div className="bg-slate-900 rounded-2xl p-4 text-white shadow-sm border border-slate-800">
            <span className="text-[10px] text-[#F26522] uppercase tracking-wider font-extrabold block">Admin Portal</span>
            <span className="text-xs text-slate-300 font-light block mt-1 truncate" title={user.email}>
              ผู้ใช้งาน: <strong className="text-white font-medium font-mono">{user.email}</strong>
            </span>
            <button
              onClick={handleLogout}
              className="mt-3.5 w-full bg-[#F26522] hover:bg-opacity-90 text-white text-xs py-2 rounded-lg font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer active:scale-[0.98]"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>ออกจากระบบ</span>
            </button>
          </div>

          {/* Quick Statistics Mini Panel */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3.5 flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3 text-[#F26522]" />
              <span>สถิติภาพรวม (Real-time)</span>
            </h2>
            <div className="space-y-4">
              <div className="flex flex-col">
                <span className="text-3xl font-black text-slate-800 tracking-tight leading-none">{totalCompletedCount}</span>
                <span className="text-[9px] font-bold text-slate-500 uppercase mt-2.5">ผู้ตอบแบบสำรวจที่เสร็จแล้ว</span>
                <div className="w-full bg-slate-100 h-1.5 mt-2 rounded-full overflow-hidden">
                  <div className="bg-[#F26522] h-full transition-all duration-500" style={{ width: `${Math.min(100, responseRate)}%` }}></div>
                </div>
                <div className="flex justify-between text-[9px] mt-1.5 text-slate-400 font-mono">
                  <span>เป้าหมาย {totalSentCount} คน</span>
                  <span>{responseRate.toFixed(1)}%</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="block text-lg font-bold text-slate-700 font-mono leading-none">{compositeMean.toFixed(2)}</span>
                  <span className="text-[8px] text-slate-400 uppercase font-medium mt-1 block">คะแนนเฉลี่ย (เต็ม 5)</span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="block text-lg font-bold text-emerald-600 font-mono leading-none">{Math.round(responseRate)}%</span>
                  <span className="text-[8px] text-slate-400 uppercase font-medium mt-1 block">อัตราการสัดส่วน</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Menu items */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Settings className="w-3 h-3 text-[#F26522]" />
              <span>เครื่องมือจัดการข้อมูล</span>
            </h2>
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all font-semibold flex items-center gap-2 border-l-4 ${
                  activeTab === 'overview'
                    ? 'bg-orange-50 text-[#F26522] border-[#F26522]'
                    : 'text-slate-600 border-transparent hover:bg-slate-50'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>สรุปรายงานผล (Dashboard)</span>
              </button>
              <button
                onClick={() => setActiveTab('import')}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all font-semibold flex items-center gap-2 border-l-4 ${
                  activeTab === 'import'
                    ? 'bg-orange-50 text-[#F26522] border-[#F26522]'
                    : 'text-slate-600 border-transparent hover:bg-slate-50'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>นำเข้าฐานข้อมูลผู้ประเมิน</span>
              </button>
              <button
                onClick={() => setActiveTab('admins')}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all font-semibold flex items-center gap-2 border-l-4 ${
                  activeTab === 'admins'
                    ? 'bg-orange-50 text-[#F26522] border-[#F26522]'
                    : 'text-slate-600 border-transparent hover:bg-slate-50'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>จัดการสิทธิ์ผู้ดูแลระบบ</span>
              </button>
              <button
                onClick={() => setActiveTab('purge')}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all font-semibold flex items-center gap-2 border-l-4 ${
                  activeTab === 'purge'
                    ? 'bg-rose-50 text-rose-600 border-rose-500'
                    : 'text-slate-600 border-transparent hover:bg-slate-50'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>ล้างฐานข้อมูล (Data Purge)</span>
              </button>
            </nav>
          </div>

          {/* System status details box */}
          <div className="bg-[#1e293b] p-3.5 rounded-xl shadow-sm text-white flex flex-col justify-between border border-slate-700">
            <div className="flex justify-between items-start">
              <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">สถานะระบบ (Firebase)</h3>
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            </div>
            <div className="space-y-1.5 mt-2.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">Firebase Auth</span>
                <span className="text-green-300 font-mono font-semibold">ACTIVE</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">Cloud Firestore</span>
                <span className="text-green-300 font-mono font-semibold">SPARK_PLAN</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">Sync Status</span>
                <span className="text-green-300 font-mono font-semibold">SYNCED</span>
              </div>
            </div>
            <div className="pt-2 mt-2 border-t border-slate-700 flex justify-between text-[9px] text-slate-400">
              <span>Latency: 42ms</span>
              <span className="font-mono">v1.0.4</span>
            </div>
          </div>
        </aside>

        {/* Right Side: Active Content Panel Column */}
        <section className="flex-1 w-full flex flex-col gap-4">

      {/* Global Data Source Filters inside overview tab */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-slate-700">
            <Filter className="w-4 h-4 text-bu-orange" />
            <span className="text-sm font-semibold">เครื่องตัวกรองขั้นสูง:</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Year Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500">ปีการศึกษา:</span>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="p-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-bu-orange"
              >
                <option value="all">ทั้งหมดทุกปีการศึกษา</option>
                {getAcademicYearsOptions().map(yr => (
                  <option key={yr} value={yr}>ปีการศึกษา {yr}</option>
                ))}
              </select>
            </div>

            {/* Month Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500">กรองรายเดือน:</span>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="p-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-bu-orange"
              >
                <option value="all">ทั้งหมดทุกเดือน</option>
                {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => (
                  <option key={m} value={m}>{getThaiMonthName(m)}</option>
                ))}
              </select>
            </div>

            {/* Faculty Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500">รายคณะ:</span>
              <select
                value={filterFaculty}
                onChange={(e) => setFilterFaculty(e.target.value)}
                className="p-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-bu-orange max-w-[200px]"
              >
                <option value="all">ทั้งหมดทุกคณะ</option>
                {getFacultyOptions().map(fac => (
                  <option key={fac} value={fac}>{fac}</option>
                ))}
              </select>
            </div>

            {/* Department Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500">รายสาขาวิชา:</span>
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="p-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-bu-orange max-w-[200px]"
              >
                <option value="all">ทั้งหมดทุกสาขาวิชา</option>
                {getDepartmentOptions().map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Export excel & PDF buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleExportFilteredResponses}
                className="bg-bu-orange hover:bg-bu-orange-hover text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center space-x-1 transition-all active:scale-[0.98] cursor-pointer shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ส่งออก Excel (.xlsx)</span>
              </button>

              <button
                onClick={handleExportPdf}
                disabled={isGeneratingPdf}
                className="bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center space-x-1.5 transition-all active:scale-[0.98] cursor-pointer shadow-sm"
                title="ส่งออกรายงานสรุปผลรูปเเบบ A4 PDF พร้อมจัดกั้นหน้า-กั้นหลัง 2 ซม."
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังสร้าง PDF...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5" />
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
          {/* Dashboard aggregate cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-1 flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">จำนวนผู้ประเมินเสร็จแล้ว</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600">{totalCompletedCount}</span>
                <ClipboardList className="w-5 h-5 text-emerald-300" />
              </div>
              <p className="text-[10px] text-slate-400 font-light mt-2 pt-2 border-t border-slate-50">รายการตอบประเมินที่ส่งกลับมา</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-1 flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">สัดส่วนตอบกลับ (Response Rate)</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-bu-orange">{responseRate.toFixed(1)}%</span>
                <TrendingUp className="w-5 h-5 text-orange-200" />
              </div>
              {/* Progress visual */}
              <div className="mt-3 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-bu-orange h-full rounded-full" style={{ width: `${responseRate}%` }} />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-1 flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">คะแนนสมรรถนะเฉลี่ยสะสม</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-indigo-600">{compositeMean.toFixed(2)} / 5.00</span>
                <BarChart className="w-5 h-5 text-indigo-300" />
              </div>
              <p className="text-[10px] text-slate-400 font-light mt-2 pt-2 border-t border-slate-50">ค่าเฉลี่ย Mean จากคุณลักษณะ 13 ข้อ (เต็ม 5)</p>
            </div>
          </div>

          {/* Domain-specific Mean cards */}
          <div className="bg-[#fcf8f5] border border-orange-100/80 rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-orange-200/40 pb-3 gap-2">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Award className="w-4 h-4 text-bu-orange animate-pulse" />
                  <span>คะแนนเฉลี่ยจำแนกตามรายด้าน (Domain-Specific Means)</span>
                </h3>
                <p className="text-[10px] sm:text-[11px] text-slate-500 font-light">การประมวลผลแยกตามกลุ่มทักษะและอัตลักษณ์ของมหาวิทยาลัยกรุงเทพ (คะแนนเต็ม 5.00)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* TQF Card */}
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3 flex flex-col justify-between hover:border-indigo-100 transition-all">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-wider">TQF Criteria</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 leading-snug">1. ด้านคุณภาพบัณฑิตตามกรอบ TQF</h4>
                  <p className="text-[10px] text-slate-400 font-light leading-relaxed">คุณธรรม จริยธรรม, ความรู้, ทักษะทางปัญญา, ความสัมพันธ์, และทักษะไอที/สื่อสาร</p>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between mt-auto">
                  <span className="text-xl font-extrabold text-indigo-600 font-mono">{tqfMean.toFixed(2)} <span className="text-[11px] text-slate-400 font-normal">/ 5.00</span></span>
                  <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${(tqfMean / 5) * 100}%` }} />
                  </div>
                </div>
              </div>

              {/* Identity Card */}
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3 flex flex-col justify-between hover:border-emerald-100 transition-all">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Identity</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 leading-snug">2. ด้านการพัฒนาบัณฑิตตามอัตลักษณ์</h4>
                  <p className="text-[10px] text-slate-400 font-light leading-relaxed">ความคิดสร้างสรรค์, จิตวิญญาณผู้ประกอบการ, ความเป็นสากล, และทักษะไอที/สื่อสาร</p>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between mt-auto">
                  <span className="text-xl font-extrabold text-emerald-600 font-mono">{identityMean.toFixed(2)} <span className="text-[11px] text-slate-400 font-normal">/ 5.00</span></span>
                  <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(identityMean / 5) * 100}%` }} />
                  </div>
                </div>
              </div>

              {/* BU 5 DNAs Card */}
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3 flex flex-col justify-between hover:border-orange-100 transition-all">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full uppercase tracking-wider">BU 5</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 leading-snug">3. ด้านการพัฒนาตาม BU 5</h4>
                  <p className="text-[10px] text-slate-400 font-light leading-relaxed">ความฉลาดตั้งคำถาม, ไหวพริบทันโลก, ทำงานร่วมกัน, สู้ในสิ่งที่รัก, และความคิดสร้างสรรค์</p>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between mt-auto">
                  <span className="text-xl font-extrabold text-bu-orange font-mono">{dnaMean.toFixed(2)} <span className="text-[11px] text-slate-400 font-normal">/ 5.00</span></span>
                  <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-bu-orange h-full rounded-full" style={{ width: `${(dnaMean / 5) * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dashboard Sub-tab selector bar */}
          <div className="bg-white rounded-2xl p-2 border border-slate-150 shadow-sm flex flex-wrap gap-2 font-sans">
            <button
              onClick={() => setDashSubTab('part1')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                dashSubTab === 'part1'
                  ? 'bg-slate-900 text-white shadow'
                  : 'hover:bg-slate-50 text-slate-600'
              }`}
            >
              <Briefcase className="w-4 h-4 text-[#F26522]" />
              <span>ตอนที่ 1: ข้อมูลผู้ส่งประเมิน & องค์กร</span>
            </button>
            <button
              onClick={() => setDashSubTab('part2')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                dashSubTab === 'part2'
                  ? 'bg-slate-900 text-white shadow'
                  : 'hover:bg-slate-50 text-slate-600'
              }`}
            >
              <Award className="w-4 h-4 text-[#F26522]" />
              <span>ตอนที่ 2: ความพึงพอใจคุณลักษณะบัณฑิต (รายข้อ)</span>
            </button>
            <button
              onClick={() => setDashSubTab('part3')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                dashSubTab === 'part3'
                  ? 'bg-slate-900 text-white shadow'
                  : 'hover:bg-slate-50 text-slate-600'
              }`}
            >
              <Sparkles className="w-4 h-4 text-[#F26522]" />
              <span>ตอนที่ 3: เกณฑ์คัดเลือก & ทักษะอนาคต</span>
            </button>
          </div>

          {/* Sub-tab view contents conditional render */}
          {totalCompletedCount === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
              <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-600">ยังไม่มีข้อมูลรายงานสถิติของช่วงเวลาเรียนปัจจุบันที่เลือก</p>
              <p className="text-xs text-slate-400 mt-1 font-light">กรุณาเลือกปีการศึกษาอื่นๆ หรือรอให้ผู้บังคับบัญชาส่งผลประเมินครบบริบูรณ์</p>
            </div>
          ) : (
            <div className="space-y-6 font-sans">
              
              {/* TAB 1: PART 1 INFOGRAPHIC */}
              {dashSubTab === 'part1' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Card 1: Position */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-2">
                      <Briefcase className="w-4 h-4 text-[#F26522]" />
                      <span>1. ตำแหน่งงานประเมินของผู้ตอบ</span>
                    </h3>
                    <div className="space-y-3.5">
                      {Object.entries(positionsStats).map(([key, value]) => {
                        const pct = (value / totalCompletedCount) * 100;
                        return (
                          <div key={key} className="space-y-1">
                            <div className="flex justify-between text-xs font-medium">
                              <span className="text-slate-600 truncate max-w-[70%]">{key}</span>
                              <span className="text-slate-800 font-bold">{value} ราย ({pct.toFixed(1)}%)</span>
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
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-2">
                      <Building2 className="w-4 h-4 text-[#F26522]" />
                      <span>2. ประเภทหน่วยงาน/องค์กร</span>
                    </h3>
                    <div className="space-y-3.5">
                      {Object.entries(orgTypesStats).map(([key, value]) => {
                        const pct = (value / totalCompletedCount) * 100;
                        return (
                          <div key={key} className="space-y-1">
                            <div className="flex justify-between text-xs font-medium">
                              <span className="text-slate-600 truncate max-w-[70%]">{key}</span>
                              <span className="text-slate-800 font-bold">{value} ราย ({pct.toFixed(1)}%)</span>
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
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-2">
                      <Clock className="w-4 h-4 text-[#F26522]" />
                      <span>3. ระยะเวลาที่เริ่มปฏิบัติงาน</span>
                    </h3>
                    <div className="space-y-3.5">
                      {Object.entries(graduateDurationsStats).map(([key, value]) => {
                        const pct = (value / totalCompletedCount) * 100;
                        return (
                          <div key={key} className="space-y-1">
                            <div className="flex justify-between text-xs font-medium">
                              <span className="text-slate-600 truncate max-w-[70%]">{key}</span>
                              <span className="text-slate-800 font-bold">{value} ราย ({pct.toFixed(1)}%)</span>
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
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-2">
                      <Layers className="w-4 h-4 text-[#F26522]" />
                      <span>4. ประสบการณ์ของผู้ให้ประเมิน</span>
                    </h3>
                    <div className="space-y-3.5">
                      {Object.entries(experiencesStats).map(([key, value]) => {
                        const pct = (value / totalCompletedCount) * 100;
                        return (
                          <div key={key} className="space-y-1">
                            <div className="flex justify-between text-xs font-medium">
                              <span className="text-slate-600 truncate max-w-[70%]">{key}</span>
                              <span className="text-slate-800 font-bold">{value} ราย ({pct.toFixed(1)}%)</span>
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
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-2">
                      <Globe className="w-4 h-4 text-[#F26522]" />
                      <span>5. กลุ่มอุตสาหกรรมเป้าหมาย</span>
                    </h3>
                    <div className="space-y-3.5">
                      {Object.keys(industriesStats).length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-4 font-light">ไม่ได้ระบุกลุ่มอุตสาหกรรม</p>
                      ) : (
                        Object.entries(industriesStats).map(([key, value]) => {
                          const pct = (value / totalCompletedCount) * 100;
                          return (
                            <div key={key} className="space-y-1">
                              <div className="flex justify-between text-xs font-medium">
                                <span className="text-slate-600 truncate max-w-[75%]" title={key}>{key}</span>
                                <span className="text-slate-800 font-bold shrink-0">{value} ข้อ ({pct.toFixed(0)}%)</span>
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
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-2">
                      <PieChart className="w-4 h-4 text-[#F26522]" />
                      <span>6. สัดส่วนแยกตามคณะวิชา</span>
                    </h3>
                    <div className="space-y-3.5">
                      {Object.entries(facultyCounts).map(([fac, count]) => {
                        const percentage = (count / totalCompletedCount) * 100;
                        return (
                          <div key={fac} className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-slate-600 truncate max-w-[70%]" title={fac}>{fac}</span>
                              <span className="text-[#F26522]">{count} ราย ({percentage.toFixed(0)}%)</span>
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
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 font-mono">ข้อที่ {qIndex}</span>
                                <h4 className="text-xs sm:text-xs font-bold text-slate-800 line-clamp-2" title={fullTitle}>{fullTitle}</h4>
                              </div>
                              {/* Big Circular average Badge */}
                              <div className="flex flex-col items-center shrink-0 bg-orange-50 border border-orange-100 rounded-xl px-3 py-1 text-center">
                                <span className="text-[9px] text-slate-400 font-bold uppercase leading-none text-[#F26522]">MEAN</span>
                                <span className="text-base font-extrabold text-[#F26522] font-mono mt-0.5">{mean.toFixed(2)}</span>
                              </div>
                            </div>

                            {/* Section breakdown stack inline infographic */}
                            <div className="mt-4 space-y-1.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block pb-0.5">การแจกแจงระดับพึงพอใจ:</span>
                              
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
                                  <span className="text-[9px] text-slate-500">ดีเยี่ยม (9-10): <strong className="font-bold text-slate-700">{gExcellent.toFixed(0)}%</strong></span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                  <span className="text-[9px] text-slate-500">ดี (7-8): <strong className="font-bold text-slate-700">{gGood.toFixed(0)}%</strong></span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                  <span className="text-[9px] text-slate-500">ปานกลาง (5-6): <strong className="font-bold text-slate-700">{gMedium.toFixed(0)}%</strong></span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                                  <span className="text-[9px] text-slate-500">พอใช้ (3-4): <strong className="font-bold text-slate-700">{gLow.toFixed(0)}%</strong></span>
                                </div>
                                <div className="flex items-center gap-1 col-span-2 xs:col-span-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0"></span>
                                  <span className="text-[9px] text-slate-500">ปรับปรุง (1-2): <strong className="font-bold text-slate-700">{gLowest.toFixed(0)}%</strong></span>
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
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-2.5">
                        <Award className="w-4 h-4 text-[#F26522]" />
                        <span>ลักษณะที่ประทับใจ/โดดเด่นสูงสุดของบัณฑิต (จัดอันดับ)</span>
                      </h3>
                      {Object.keys(strongPointsStats).length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-8 font-light">ยังไม่มีรายจุดเด่นที่ระบุ</p>
                      ) : (
                        <div className="space-y-3.5 pt-1">
                          {Object.entries(strongPointsStats)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 5)
                            .map(([key, value], idx) => {
                              const rankColors = ['bg-amber-100 text-amber-700', 'bg-slate-200 text-slate-700', 'bg-orange-100 text-orange-700'];
                              const isTop3 = idx < 3;
                              return (
                                <div key={key} className="flex items-center justify-between gap-4 font-sans border-b border-slate-50 pb-1.5 last:border-b-0">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                                      isTop3 ? rankColors[idx] : 'bg-slate-50 text-slate-500'
                                    }`}>
                                      {idx + 1}
                                    </span>
                                    <span className="text-xs text-slate-600 truncate">{key}</span>
                                  </div>
                                  <span className="text-xs font-bold text-slate-800 shrink-0">{value} โหวต</span>
                                </div>
                              );
                            })
                          }
                        </div>
                      )}
                    </div>

                    {/* Top Areas of development */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-2.5">
                        <HelpCircle className="w-4 h-4 text-[#F26522]" />
                        <span>ทักษะที่ควรปรับปรุง/ดูแลเพิ่มพูนพนักงาน (จัดอันดับ)</span>
                      </h3>
                      {Object.keys(skillsToImproveStats).length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-8 font-light">ยังไม่มีระบุทักษะที่ต้องพัฒนา</p>
                      ) : (
                        <div className="space-y-3.5 pt-1">
                          {Object.entries(skillsToImproveStats)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 5)
                            .map(([key, value], idx) => {
                              return (
                                <div key={key} className="flex items-center justify-between gap-4 font-sans border-b border-slate-50 pb-1.5 last:border-b-0">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="w-5 h-5 rounded-md bg-slate-50 text-slate-500 flex items-center justify-center text-[10px] font-bold font-mono">
                                      #{idx + 1}
                                    </span>
                                    <span className="text-xs text-slate-600 truncate">{key}</span>
                                  </div>
                                  <span className="text-xs font-bold text-[#F26522] shrink-0">{value} โหวต</span>
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
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-2.5">
                      <ClipboardList className="w-4 h-4 text-[#F26522]" />
                      <span>ข้อเสนอแนะเพิ่มเติมเชิงคุณภาพจากผู้ใช้ระบบจริง</span>
                    </h3>
                    {responseSuggestions.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6 font-light">ไม่มีข้อเสนอแนะข้อความแบบเสรีในปัจจุบัน</p>
                    ) : (
                      <div className="max-h-60 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                        {responseSuggestions.map((sug, sIdx) => (
                          <div key={sug.id || sIdx} className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100">
                            <p className="text-xs text-slate-700 italic leading-relaxed">"{sug.text}"</p>
                            <div className="flex justify-between items-center text-[9px] text-slate-400 font-sans pt-1 border-t border-slate-100">
                              <span className="font-medium font-sans">ผู้ประเมิน: {sug.faculty}</span>
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
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-2">
                        <BookOpen className="w-4 h-4 text-[#F26522]" />
                        <span>1. สาขาวิชาที่หน่วยงานมีความต้องการสูงสุด</span>
                      </h3>
                      {Object.keys(neededMajorsStats).length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-8 font-light">ยังไม่ได้รับข้อมูลความต้องการสาขาวิชา</p>
                      ) : (
                        <div className="space-y-3 pt-1">
                          {Object.entries(neededMajorsStats)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 10)
                            .map(([key, value]) => {
                              const pct = (value / totalCompletedCount) * 100;
                              return (
                                <div key={key} className="space-y-1">
                                  <div className="flex justify-between text-xs font-semibold">
                                    <span className="text-slate-600 truncate max-w-[70%]" title={key}>{key}</span>
                                    <span className="text-slate-800 font-bold shrink-0">{value} มติ ({pct.toFixed(0)}%)</span>
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
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-2">
                        <Sparkles className="w-4 h-4 text-[#F26522]" />
                        <span>2. ทักษะขับเคลื่อนการทำงานในอนาคตที่ต้องการ</span>
                      </h3>
                      {Object.keys(coreSkillsStats).length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-8 font-light">ยังไม่ได้ตอบรับทักษะขับเคลื่อน</p>
                      ) : (
                        <div className="space-y-3 pt-1">
                          {Object.entries(coreSkillsStats)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 10)
                            .map(([key, value]) => {
                              const pct = (value / totalCompletedCount) * 100;
                              return (
                                <div key={key} className="space-y-1">
                                  <div className="flex justify-between text-xs font-semibold">
                                    <span className="text-slate-600 truncate max-w-[70%]" title={key}>{key}</span>
                                    <span className="text-slate-800 font-bold shrink-0">{value} มติ ({pct.toFixed(0)}%)</span>
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
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-2">
                        <Layers className="w-4 h-4 text-[#F26522]" />
                        <span>3. ความต้องการผู้มีประสบการณ์เริ่มวิชาชีพ</span>
                      </h3>
                      <div className="space-y-4 py-2">
                        {/* Split infographic block progress */}
                        <div className="flex items-center font-sans gap-2">
                          <div className="flex-1 text-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-400 font-bold block">ต้องการประสบการณ์</span>
                            <span className="text-base font-extrabold text-[#F26522]">{reqExperienceYes} ราย</span>
                          </div>
                          <div className="flex-1 text-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-400 font-bold block">ไม่กำหนด / เด็กจบใหม่</span>
                            <span className="text-base font-extrabold text-slate-700">{reqExperienceNo} ราย</span>
                          </div>
                        </div>

                        {/* Stack proportion visual */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                            <span>ต้องการประสบการณ์</span>
                            <span>ยินดีต้อนรับเด็กจบใหม่</span>
                          </div>
                          <div className="w-full bg-slate-100 h-3.5 rounded-md overflow-hidden flex shadow-inner">
                            {reqExperienceYes > 0 && (
                              <div 
                                className="bg-[#F26522] h-full text-[9px] text-white flex items-center justify-center font-bold" 
                                style={{ width: `${(reqExperienceYes / (reqExperienceYes + reqExperienceNo)) * 100}%` }}
                              >
                                {((reqExperienceYes / (reqExperienceYes + reqExperienceNo)) * 100).toFixed(0)}%
                              </div>
                            )}
                            {reqExperienceNo > 0 && (
                              <div 
                                className="bg-slate-400 h-full text-[9px] text-white flex items-center justify-center font-bold" 
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
                            <span className="text-xs text-orange-850 font-bold">อายุทำงานเฉลี่ยขั้นต่ำที่ต้องการ:</span>
                            <span className="text-sm font-black text-[#F26522] font-mono">{avgExperienceMonths} เดือน (~{(avgExperienceMonths / 12).toFixed(1)} ปี)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Selection criteria */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-2">
                        <Target className="w-4 h-4 text-[#F26522]" />
                        <span>4. เกณฑ์สำคัญที่สุดในพิจารณาคัดเลือกพนักงาน</span>
                      </h3>
                      {Object.keys(selectionCriteriaStats).length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-8 font-light">ยังไม่พบคะแนนเกณฑ์คัดเลือก</p>
                      ) : (
                        <div className="space-y-3 pt-1">
                          {Object.entries(selectionCriteriaStats)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 5)
                            .map(([key, value], idx) => {
                              const pct = (value / totalCompletedCount) * 100;
                              return (
                                <div key={key} className="space-y-1">
                                  <div className="flex justify-between text-xs font-semibold">
                                    <span className="text-slate-600 truncate max-w-[70%]">{idx + 1}. {key}</span>
                                    <span className="text-slate-800 font-bold shrink-0">{value} มติ ({pct.toFixed(0)}%)</span>
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
        </div>
      )}

      {activeTab === 'import' && (
        <div className="space-y-6">
          {/* Main Importer Card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 shadow-sm space-y-6">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Upload className="w-5 h-5 text-bu-orange" />
                <span>นำเข้าฐานข้อมูลผู้บังคับบัญชาเป้าหมาย (Admin Supervisor Importer)</span>
              </h3>
              <p className="text-sm text-slate-500 font-light">
                อัปโหลดไฟล์ Excel (.xlsx, .xls) หรือ CSV จากระบบทะเบียน เพื่อสร้างรหัสผู้ตอบ 4 หลัก และรายละเอียดวิชาหลักสูตรของบัณฑิตลงในฐานระบบออนไลน์
              </p>
            </div>

            {/* Guidelines info */}
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-3 text-xs leading-relaxed font-sans text-slate-600">
              <span className="font-bold text-slate-700 block">ℹ️ ข้อมูลการจัดเรียงคอลัมน์ในตารางไฟล์ที่จะนำเข้า:</span>
              <ul className="list-decimal list-inside space-y-1.5 pl-2 font-light">
                <li><strong>คอลัมน์ที่ 1 (รหัส):</strong> รหัสที่ต้องการใช้เข้าล็อกอิน เช่น รหัสผ่าน 4 หลัก (ต้องเป็นตัวเลขที่ไม่ซ้ำกันเพื่อให้ผู้ตอบแต่ละรายเข้าถึง)</li>
                <li><strong>คอลัมน์ที่ 2 (ปีการศึกษา):</strong> ใส่ปีการศึกษา เช่น <span className="font-medium text-bu-orange">2568</span></li>
                <li><strong>คอลัมน์ที่ 3 (ชื่อผู้บังคับบัญชา):</strong> ชื่อนามสกุลของผู้ตอบแบบสอบถาม</li>
                <li><strong>คอลัมน์ที่ 4 (คณะ):</strong> สังกัดคณะของนักศึกษาที่จบไป (เช่น คณะวิศวกรรมศาสตร์)</li>
                <li><strong>คอลัมน์ที่ 5 (หลักสูตร):</strong> ชื่อหลักสูตร</li>
                <li><strong>คอลัมน์ที่ 6 (สาขาวิชา):</strong> ชื่อวิชาเอก (เช่น สาขาวิชาวิศวกรรมคอมพิวเตอร์)</li>
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
                    <Upload className="w-12 h-12 text-slate-400 stroke-1" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-slate-700 block">เลือกไฟล์ตารางเพื่อนำเข้า</span>
                    <span className="text-xs text-slate-400 block mt-1">ไฟล์สเปรดชีต Excel (.xlsx, .xls) หรือ CSV</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Importer progress bar & status indicators */}
            {(importStatus === 'parsing' || importStatus === 'saving') && (
              <div className="max-w-md mx-auto p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3 animate-pulse text-center">
                <span className="text-xs font-semibold text-bu-orange block">
                  {importStatus === 'parsing' ? 'กำลังแยกวิเคราะห์ข้อมูลแถว...' : 'กำลังจัดเก็บรหัสลงสู่ฐาน Firestore...'}
                </span>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-bu-orange h-full transition-all duration-300"
                    style={{ width: `${(importStats.imported / Math.max(1, importStats.total)) * 100}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 font-mono">
                  นำเข้าเสร็จแล้ว: {importStats.imported} / {importStats.total} รายการ
                </p>
              </div>
            )}

            {importStatus === 'success' && (
              <div className="max-w-md mx-auto p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm rounded-xl text-center space-y-1">
                <strong className="block text-emerald-800">✅ นำเข้าข้อมูลผู้ประเมินสำเร็จเสร็จสมบูรณ์!</strong>
                <p className="text-xs font-light">บันทึกสถิติข้อมูลแอดมินทั้งหมด {importStats.imported} รายการลงในฐานระบบเรียบร้อยแล้ว รหัสสามารถใช้งานประเมินได้ทันที</p>
              </div>
            )}

            {importStatus === 'error' && (
              <div className="max-w-md mx-auto p-4 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl text-center font-medium">
                ❌ เกิดข้อผิดพลาดในการนำเข้าข้อมูล: {importError}
              </div>
            )}
          </div>

          {/* Supervisors Table list rendering card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden font-sans">
            <div className="p-6 md:p-8 border-b border-slate-100 space-y-4 md:space-y-0 md:flex md:items-center md:justify-between">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-bu-orange" />
                  <span>ข้อมูลผู้บังคับบัญชาเป้าหมายในระบบ</span>
                </h3>
                <p className="text-xs text-slate-500 font-light">
                  รายชื่อผู้ประเมิน คณะสาขา และรหัสเข้าใช้งานแบบสอบถามที่บันทึกสำเร็จ (รวมทั้งหมด {filteredSupervisors.length} รายการ จากตัวกรองวิชาการ)
                </p>
              </div>

              {/* Search Bar filter component */}
              <div className="relative w-full md:w-80 font-sans">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </span>
                <input
                  type="text"
                  placeholder="ค้นหาตามรหัส, ชื่อผู้ประเมิน, คณะ, สาขา..."
                  value={supervisorSearch}
                  onChange={(e) => {
                    setSupervisorSearch(e.target.value);
                    setSupervisorPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-bu-orange"
                />
                {supervisorSearch && (
                  <button
                    onClick={() => {
                      setSupervisorSearch('');
                      setSupervisorPage(1);
                    }}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-slate-400 hover:text-slate-600 hover:font-medium"
                  >
                    ล้างค่า
                  </button>
                )}
              </div>
            </div>

            {/* Response table */}
            <div className="overflow-x-auto">
              {paginatedSupervisors.length > 0 ? (
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-600 font-semibold text-xs uppercase">
                      <th className="py-3.5 px-6">รหัส (Code)</th>
                      <th className="py-3.5 px-4 text-center">ปีการศึกษา</th>
                      <th className="py-3.5 px-6">ชื่อ-นามสกุล ผู้ตอบ</th>
                      <th className="py-3.5 px-6">คณะ / สาขาวิชาการท่องเที่ยวศึกษา</th>
                      <th className="py-3.5 px-6 text-center">สถานะการประเมิน</th>
                      <th className="py-3.5 px-6 text-center">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {paginatedSupervisors.map((item, index) => (
                      <tr key={item.id || index} className="hover:bg-slate-50/30 transition-colors">
                        <td className="py-3 px-6 font-mono font-semibold text-bu-orange">
                          <span className="bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-md text-xs">
                            {item.code}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-slate-500 font-mono text-xs">
                          {item.academicYear}
                        </td>
                        <td className="py-3 px-6 font-medium text-slate-850">
                          {item.name || '-'}
                        </td>
                        <td className="py-3 px-6">
                          <div className="text-xs space-y-0.5">
                            <div className="font-semibold text-slate-700">{item.faculty}</div>
                            <div className="text-slate-505 font-light">
                              {item.curriculum || '-'}{item.department && ` • ${item.department}`}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-6 text-center">
                          {item.isCompleted ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-full text-xs font-semibold">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                              ประเมินเรียบร้อยแล้ว
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-full text-xs font-medium">
                              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                              รอดำเนินการประเมิน
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-6 text-center">
                          <button
                            onClick={() => handleDeleteSupervisor(item.id || '', item.code)}
                            className="p-1 px-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
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
                <div className="p-12 text-center text-slate-400 space-y-1.5">
                  <div className="text-base font-semibold">ไม่พบข้อมูลรายชื่อใดในระบบ</div>
                  <p className="text-xs text-slate-500 font-light max-w-sm mx-auto">
                    ไม่มีรายชื่อผู้ประเมินที่ตรงตามเงื่อนไข ตัวกรองปีการศึกษา หรือคำค้นหาในปัจจุบัน
                  </p>
                </div>
              )}
            </div>

            {/* Table pagination */}
            {totalSupervisorPages > 1 && (
              <div className="py-4 px-6 border-t border-slate-100 flex items-center justify-between text-xs bg-slate-50/20">
                <span className="text-slate-500">
                  แสดงแถว {(currentSupervisorPage - 1) * supervisorItemsPerPage + 1} - {Math.min(currentSupervisorPage * supervisorItemsPerPage, searchedSupervisors.length)} จาก {searchedSupervisors.length} รายการ
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentSupervisorPage === 1}
                    onClick={() => setSupervisorPage(p => Math.max(1, p - 1))}
                    className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    ก่อนหน้า
                  </button>
                  <span className="text-slate-600 font-semibold px-2 font-mono">
                    หน้า {currentSupervisorPage} / {totalSupervisorPages}
                  </span>
                  <button
                    disabled={currentSupervisorPage === totalSupervisorPages}
                    onClick={() => setSupervisorPage(p => Math.min(totalSupervisorPages, p + 1))}
                    className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    ถัดไป
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'admins' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Create / Edit admin form side panels */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-800">
              {editingAdminId ? 'แก้ไขข้อมูลผู้ดูแลระบบ' : 'เพิ่มสิทธิ์ผู้ดูแลระบบคนใหม่'}
            </h3>

            <form onSubmit={handleSaveAdmin} className="space-y-4">
              <div className="space-y-1 text-left text-xs">
                <label className="font-semibold text-slate-600 block">ชื่อ-นามสกุล</label>
                <input
                  type="text"
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="ป้อนชื่อผู้ดูแลระบบ..."
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-bu-orange"
                />
              </div>

              <div className="space-y-1 text-left text-xs">
                <label className="font-semibold text-slate-600 block">อีเมลสำหรับล็อกอิน</label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="example@bu.ac.th"
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-bu-orange"
                />
              </div>

              <div className="space-y-1 text-left text-xs">
                <label className="font-semibold text-slate-600 block">ตำแหน่งงาน / สังกัด</label>
                <input
                  type="text"
                  required
                  value={adminPos}
                  onChange={(e) => setAdminPos(e.target.value)}
                  placeholder="เช่น นักแนะแนวการศึกษา สำนัก..."
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-bu-orange"
                />
              </div>

              <div className="space-y-1 text-left text-xs">
                <label className="font-semibold text-slate-600 block">ประเภทสิทธิ์การใช้งาน</label>
                <select
                  required
                  value={adminRole}
                  onChange={(e) => setAdminRole(e.target.value as 'super_admin' | 'admin')}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-bu-orange focus:border-bu-orange"
                >
                  <option value="admin">ผู้ดูแลระบบทั่วไป (General Admin)</option>
                  <option value="super_admin">ผู้ดูแลระบบหลัก (Main Admin)</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs py-2.5 px-4 rounded-xl transition-all shadow-sm active:scale-[0.98] cursor-pointer"
                >
                  {editingAdminId ? 'บันทึกการแก้ไข' : 'บันทึกรายชื่อสิทธิ์'}
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
                    className="border border-slate-200 hover:bg-slate-100 text-slate-500 font-medium text-xs px-3 py-2 rounded-xl transition-all cursor-pointer animate-fade-in"
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
              <span className="text-xs font-bold text-slate-700">รายชื่อผู้ดูแลระบบที่มีสิทธิ์ปัจจุบัน ({admins.length} คน)</span>
            </div>

            <div className="divide-y divide-slate-100">
              {admins.map((adm) => (
                <div key={adm.id} className="p-4 flex items-center justify-between font-sans">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">{adm.name}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                        adm.role === 'super_admin' 
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' 
                          : 'bg-slate-50 text-slate-600 border border-slate-200'
                      }`}>
                        {adm.role === 'super_admin' ? 'ผู้ดูแลระบบหลัก' : 'ผู้ดูแลระบบทั่วไป'}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-light block">อีเมล: {adm.email} | ตำแหน่ง: {adm.position}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditAdmin(adm)}
                      className="text-xs text-indigo-600 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-100 transition-all font-medium cursor-pointer"
                    >
                      แก้ไข
                    </button>
                    {adm.email !== 'walailuk.p@bu.ac.th' && (
                      <button
                        onClick={() => handleDeleteAdmin(adm.id || '', adm.email)}
                        className="text-xs text-rose-500 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-100 transition-all font-medium cursor-pointer"
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

      {activeTab === 'purge' && (
        <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="bg-rose-900 p-6 text-white text-center space-y-1">
            <AlertTriangle className="w-12 h-12 text-bu-orange mx-auto stroke-1" />
            <h3 className="text-lg font-bold">โซนอันตราย (Data Purge Control / Danger Zone)</h3>
            <p className="text-xs text-rose-200 font-light">
              การดำเนินการในหน้านี้เป็นแบบไม่ย้อนกลับ โปรดตรวจสอบและยืนยันด้วยความระมัดระวังสูงสุด
            </p>
          </div>

          <form onSubmit={handlePurgeSubmit} className="p-6 sm:p-8 space-y-6">
            {purgeMessage.text && (
              <div className={`p-4 rounded-xl text-xs text-center font-semibold ${
                purgeMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
              }`}>
                {purgeMessage.text}
              </div>
            )}

            {/* Choose academic year */}
            <div className="space-y-1 text-left text-xs">
              <label className="font-semibold text-slate-700 block">1. เลือกปีการศึกษาที่จัดเก็บฐานข้อมูลที่ต้องการลบ</label>
              <select
                required
                value={purgeYear}
                onChange={(e) => setPurgeYear(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-rose-500"
              >
                <option value="">-- เลือกปีการศึกษาที่ลบ --</option>
                {getAcademicYearsOptions().map(yr => (
                  <option key={yr} value={yr}>ปีการศึกษา {yr}</option>
                ))}
              </select>
            </div>

            {/* Choose clear modes */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">2. เลือกรูปแบบการลบข้อมูล (3 รูปแบบหลัก)</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className={`p-3 border rounded-xl flex flex-col justify-between cursor-pointer transition-all ${
                  purgeMode === 'all'
                    ? 'border-rose-500 bg-rose-50 text-rose-800 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-500'
                }`}>
                  <input
                    type="radio"
                    name="purgeMode"
                    checked={purgeMode === 'all'}
                    onChange={() => setPurgeMode('all')}
                    className="sr-only"
                  />
                  <div className="space-y-1">
                    <span className="text-sm block">ลบทั้งหมด</span>
                    <span className="text-[10px] leading-tight font-light block">ทั้งฐานผู้ประเมินและผลตอบแบบประเมินในระบบ</span>
                  </div>
                </label>

                <label className={`p-3 border rounded-xl flex flex-col justify-between cursor-pointer transition-all ${
                  purgeMode === 'supervisors'
                    ? 'border-rose-500 bg-rose-50 text-rose-800 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-500'
                }`}>
                  <input
                    type="radio"
                    name="purgeMode"
                    checked={purgeMode === 'supervisors'}
                    onChange={() => setPurgeMode('supervisors')}
                    className="sr-only"
                  />
                  <div className="space-y-1">
                    <span className="text-sm block">ผู้ประเมินเท่านั้น</span>
                    <span className="text-[10px] leading-tight font-light block">ลบเฉพาะข้อมูลนำเข้าเป้าหมายรหัส 4 หลัก</span>
                  </div>
                </label>

                <label className={`p-3 border rounded-xl flex flex-col justify-between cursor-pointer transition-all ${
                  purgeMode === 'responses'
                    ? 'border-rose-500 bg-rose-50 text-rose-800 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-500'
                }`}>
                  <input
                    type="radio"
                    name="purgeMode"
                    checked={purgeMode === 'responses'}
                    onChange={() => setPurgeMode('responses')}
                    className="sr-only"
                  />
                  <div className="space-y-1">
                    <span className="text-sm block">ผลตอบแบบสอบถาม</span>
                    <span className="text-[10px] leading-tight font-light block">ลบเฉพาะข้อมูลที่ผู้ตอบคำถามกรอกเข้ามาในระบบ</span>
                  </div>
                </label>
              </div>
            </div>

            {/* PURGE security code text */}
            <div className="space-y-2 pt-2 text-xs">
              <label className="font-semibold text-rose-800 block">3. ยืนยันสิทธิ์ความปลอดภัยขั้นสุดท้าย</label>
              <p className="text-slate-400 font-light text-[10px]">โปรดพิมพ์คำว่า <strong className="text-rose-600">PURGE</strong> ลงในช่องด้านล่างเพื่ออนุญาตให้สิทธิ์คำสั่ง API ดำเนินการล้างฐาน</p>
              <input
                type="text"
                required
                value={purgeConfirmText}
                onChange={(e) => setPurgeConfirmText(e.target.value)}
                placeholder="กรอกคำว่า PURGE..."
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm uppercase text-center font-bold tracking-widest focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-3.5 px-4 rounded-xl transition-all shadow-md active:scale-[0.98] cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>รันคำสั่งทำลายข้อมูลแบบย้อนคืนไม่ได้</span>
            </button>
          </form>
        </div>
      )}
      </section>
      </div>

      {/* Offscreen printable DOM container for A4 PDF export */}
      <div
        ref={pdfContainerRef}
        className="fixed left-[-9999px] top-0 pointer-events-none w-[750px] bg-white text-slate-800 p-0 font-sans"
      >
        {/* Block 1: Main Header & Filter Criteria */}
        <div className="pdf-block bg-white p-6 mb-4 border-b-2 border-orange-500 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <div className="text-[11px] font-extrabold text-orange-600 tracking-wider uppercase mb-0.5">
                BANGKOK UNIVERSITY
              </div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                รายงานสรุปผลการประเมินคุณภาพบัณฑิตโดยผู้บังคับบัญชา
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                ระบบประมวลผลสถิติและแบบสำรวจความพึงพอใจ มหาวิทยาลัยกรุงเทพ
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block bg-orange-100 text-orange-800 text-xs font-bold px-3 py-1 rounded-full">
                {filterYear === 'all' ? 'ทุกปีการศึกษา' : `ปีการศึกษา ${filterYear}`}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <span className="text-slate-500 font-medium">ปีการศึกษา: </span>
              <span className="font-bold text-slate-800">
                {filterYear === 'all' ? 'ทั้งหมดทุกปีการศึกษา' : `ปีการศึกษา ${filterYear}`}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-medium">กรองรายเดือน: </span>
              <span className="font-bold text-slate-800">
                {filterMonth === 'all' ? 'ทั้งหมดทุกเดือน' : getThaiMonthName(filterMonth)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-medium">คณะวิชา: </span>
              <span className="font-bold text-slate-800">
                {filterFaculty === 'all' ? 'ทั้งหมดทุกคณะ' : filterFaculty}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-medium">สาขาวิชา: </span>
              <span className="font-bold text-slate-800">
                {filterDepartment === 'all' ? 'ทั้งหมดทุกสาขาวิชา' : filterDepartment}
              </span>
            </div>
            <div className="col-span-2 pt-2 border-t border-slate-200 text-[11px] text-slate-500 flex justify-between">
              <span>
                วันที่ออกรายงาน: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} น.
              </span>
              <span>
                ผู้ตอบประเมินสำเร็จ: {totalCompletedCount} ราย (จากสิทธิ์ {totalSentCount} ราย)
              </span>
            </div>
          </div>
        </div>

        {/* Block 2: Executive KPI Summary Cards & Domain Means */}
        <div className="pdf-block bg-white p-6 mb-4 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
            <span>1. สรุปภาพรวมการตอบกลับและคะแนนสมรรถนะสะสม</span>
          </h2>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-center space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">จำนวนผู้ตอบเสร็จแล้ว</span>
              <span className="text-2xl font-black text-emerald-600 font-mono block">{totalCompletedCount}</span>
              <span className="text-[10px] text-slate-400 block">จากสิทธิ์ {totalSentCount} ราย</span>
            </div>
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-center space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">สัดส่วนตอบกลับ (Response Rate)</span>
              <span className="text-2xl font-black text-orange-600 font-mono block">{responseRate.toFixed(1)}%</span>
              <span className="text-[10px] text-slate-400 block">คิดตามฐานผู้ประเมินที่เลือก</span>
            </div>
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-center space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">คะแนนเฉลี่ยสะสม (Mean)</span>
              <span className="text-2xl font-black text-indigo-600 font-mono block">{compositeMean.toFixed(2)}</span>
              <span className="text-[10px] text-slate-400 block">คะแนนเต็ม 5.00</span>
            </div>
          </div>

          <div className="bg-orange-50/50 rounded-xl p-4 border border-orange-200/60 space-y-2">
            <h3 className="text-xs font-bold text-slate-800">คะแนนเฉลี่ยจำแนกตามรายด้าน (Domain-Specific Means)</h3>
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="bg-white rounded-lg p-3 border border-orange-100">
                <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full block w-fit mb-1">TQF Criteria</span>
                <div className="text-xs font-bold text-slate-800">1. คุณภาพบัณฑิตตามกรอบ TQF</div>
                <div className="text-base font-black text-indigo-600 font-mono mt-1">{tqfMean.toFixed(2)} <span className="text-xs text-slate-400 font-normal">/ 5.00</span></div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-orange-100">
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full block w-fit mb-1">Identity</span>
                <div className="text-xs font-bold text-slate-800">2. การพัฒนาตามอัตลักษณ์ BU</div>
                <div className="text-base font-black text-emerald-600 font-mono mt-1">{identityMean.toFixed(2)} <span className="text-xs text-slate-400 font-normal">/ 5.00</span></div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-orange-100">
                <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full block w-fit mb-1">BU 5</span>
                <div className="text-xs font-bold text-slate-800">3. การพัฒนาตามเกณฑ์ BU 5</div>
                <div className="text-base font-black text-orange-600 font-mono mt-1">{dnaMean.toFixed(2)} <span className="text-xs text-slate-400 font-normal">/ 5.00</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Block 3: Attribute Table Items 1 to 7 */}
        <div className="pdf-block bg-white p-6 mb-4 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
            <span>2. รายละเอียดคะแนนเฉลี่ยความพึงพอใจ 13 คุณลักษณะ (ข้อ 1 - 7)</span>
          </h2>
          
          <table className="w-full text-xs text-left border-collapse border border-slate-200">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                <th className="p-2 border border-slate-200 text-center w-12">ข้อที่</th>
                <th className="p-2 border border-slate-200">คุณลักษณะประเมิน</th>
                <th className="p-2 border border-slate-200 text-center w-28">คะแนนเฉลี่ย (Mean)</th>
                <th className="p-2 border border-slate-200 text-center w-28">ระดับความพึงพอใจ</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5, 6, 7].map(idx => {
                const mean = attributeMeans[idx - 1] || 0;
                const interp = getScoreInterpretation(mean);
                return (
                  <tr key={idx} className="border-b border-slate-200 odd:bg-white even:bg-slate-50/50">
                    <td className="p-2 border border-slate-200 text-center font-bold font-mono text-slate-600">{idx}</td>
                    <td className="p-2 border border-slate-200 font-semibold text-slate-800">{getAttributeFullLabel(idx)}</td>
                    <td className="p-2 border border-slate-200 text-center font-bold text-orange-600 font-mono text-sm">{mean.toFixed(2)} / 5.00</td>
                    <td className="p-2 border border-slate-200 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${interp.bg}`}>
                        {interp.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Block 4: Attribute Table Items 8 to 13 */}
        <div className="pdf-block bg-white p-6 mb-4 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
            <span>2. รายละเอียดคะแนนเฉลี่ยความพึงพอใจ 13 คุณลักษณะ (ข้อ 8 - 13) (ต่อ)</span>
          </h2>
          
          <table className="w-full text-xs text-left border-collapse border border-slate-200">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                <th className="p-2 border border-slate-200 text-center w-12">ข้อที่</th>
                <th className="p-2 border border-slate-200">คุณลักษณะประเมิน</th>
                <th className="p-2 border border-slate-200 text-center w-28">คะแนนเฉลี่ย (Mean)</th>
                <th className="p-2 border border-slate-200 text-center w-28">ระดับความพึงพอใจ</th>
              </tr>
            </thead>
            <tbody>
              {[8, 9, 10, 11, 12, 13].map(idx => {
                const mean = attributeMeans[idx - 1] || 0;
                const interp = getScoreInterpretation(mean);
                return (
                  <tr key={idx} className="border-b border-slate-200 odd:bg-white even:bg-slate-50/50">
                    <td className="p-2 border border-slate-200 text-center font-bold font-mono text-slate-600">{idx}</td>
                    <td className="p-2 border border-slate-200 font-semibold text-slate-800">{getAttributeFullLabel(idx)}</td>
                    <td className="p-2 border border-slate-200 text-center font-bold text-orange-600 font-mono text-sm">{mean.toFixed(2)} / 5.00</td>
                    <td className="p-2 border border-slate-200 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${interp.bg}`}>
                        {interp.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Block 5: Summary Part 1 */}
        <div className="pdf-block bg-white p-6 mb-4 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
            <span>3. สรุปข้อมูลผู้ตอบประเมินและลักษณะองค์กร (ตอนที่ 1)</span>
          </h2>
          
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2">
              <div className="font-bold text-slate-800 border-b border-slate-200 pb-1">3.1 ตำแหน่งงานของผู้ตอบประเมิน</div>
              <div className="space-y-1.5">
                {Object.entries(positionsStats).length === 0 ? (
                  <div className="text-[11px] text-slate-400">ไม่มีข้อมูล</div>
                ) : (
                  Object.entries(positionsStats).slice(0, 5).map(([pos, count]) => {
                    const pct = totalCompletedCount > 0 ? (count / totalCompletedCount) * 100 : 0;
                    return (
                      <div key={pos} className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-600 truncate max-w-[180px]">{pos}</span>
                        <span className="font-bold text-slate-800">{count} ราย ({pct.toFixed(0)}%)</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2">
              <div className="font-bold text-slate-800 border-b border-slate-200 pb-1">3.2 ประเภทหน่วยงาน/องค์กร</div>
              <div className="space-y-1.5">
                {Object.entries(orgTypesStats).length === 0 ? (
                  <div className="text-[11px] text-slate-400">ไม่มีข้อมูล</div>
                ) : (
                  Object.entries(orgTypesStats).slice(0, 5).map(([org, count]) => {
                    const pct = totalCompletedCount > 0 ? (count / totalCompletedCount) * 100 : 0;
                    return (
                      <div key={org} className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-600 truncate max-w-[180px]">{org}</span>
                        <span className="font-bold text-slate-800">{count} ราย ({pct.toFixed(0)}%)</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Block 6: Summary Part 2 & Part 3 */}
        <div className="pdf-block bg-white p-6 mb-4 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
            <span>4. จุดเด่น ทักษะที่ควรพัฒนา และความต้องการในอนาคต (ตอนที่ 2 & 3)</span>
          </h2>
          
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2">
              <div className="font-bold text-emerald-800 border-b border-slate-200 pb-1">4.1 คุณลักษณะเด่นของบัณฑิต</div>
              <div className="space-y-1.5">
                {Object.entries(strongPointsStats).length === 0 ? (
                  <div className="text-[11px] text-slate-400">ไม่มีข้อมูล</div>
                ) : (
                  Object.entries(strongPointsStats).sort((a,b) => b[1] - a[1]).slice(0, 5).map(([sp, count]) => (
                    <div key={sp} className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-600 truncate max-w-[190px]">• {sp}</span>
                      <span className="font-bold text-emerald-700">{count} เสียง</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2">
              <div className="font-bold text-orange-800 border-b border-slate-200 pb-1">4.2 ทักษะที่ควรได้รับการพัฒนาเพิ่ม</div>
              <div className="space-y-1.5">
                {Object.entries(skillsToImproveStats).length === 0 ? (
                  <div className="text-[11px] text-slate-400">ไม่มีข้อมูล</div>
                ) : (
                  Object.entries(skillsToImproveStats).sort((a,b) => b[1] - a[1]).slice(0, 5).map(([sk, count]) => (
                    <div key={sk} className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-600 truncate max-w-[190px]">• {sk}</span>
                      <span className="font-bold text-orange-700">{count} เสียง</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2">
              <div className="font-bold text-indigo-800 border-b border-slate-200 pb-1">4.3 สาขาวิชาที่ต้องการเพิ่มเติม</div>
              <div className="space-y-1.5">
                {Object.entries(neededMajorsStats).length === 0 ? (
                  <div className="text-[11px] text-slate-400">ไม่มีข้อมูล</div>
                ) : (
                  Object.entries(neededMajorsStats).sort((a,b) => b[1] - a[1]).slice(0, 5).map(([mj, count]) => (
                    <div key={mj} className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-600 truncate max-w-[190px]">• {mj}</span>
                      <span className="font-bold text-indigo-700">{count} เสียง</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2">
              <div className="font-bold text-purple-800 border-b border-slate-200 pb-1">4.4 ทักษะสำคัญที่ต้องการเพิ่มเติม</div>
              <div className="space-y-1.5">
                {Object.entries(coreSkillsStats).length === 0 ? (
                  <div className="text-[11px] text-slate-400">ไม่มีข้อมูล</div>
                ) : (
                  Object.entries(coreSkillsStats).sort((a,b) => b[1] - a[1]).slice(0, 5).map(([cs, count]) => (
                    <div key={cs} className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-600 truncate max-w-[190px]">• {cs}</span>
                      <span className="font-bold text-purple-700">{count} เสียง</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
