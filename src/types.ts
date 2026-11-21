export interface Admin {
  id?: string;
  uid: string;
  email: string;
  name: string;
  position: string;
  role: 'super_admin' | 'admin';
  createdAt?: string;
}

export interface Supervisor {
  id?: string;
  code: string; // 4-digit unique code
  academicYear: string; // e.g. "2568"
  name: string; // Stores graduate full name (ชื่อบัณฑิต) in Firestore
  graduateName?: string; // Optional alias for backward/forward compatibility
  supervisorName?: string; // Legacy fallback alias if present in historical records
  educationLevel?: string; // e.g. "ปริญญาตรี", "ปริญญาโท", "ปริญญาเอก"
  faculty: string;
  subFaculty?: string; // คณะรอง (ถ้ามี)
  curriculum: string;
  program?: string; // Optional legacy alias for curriculum
  department: string;
  major?: string; // Optional legacy alias for department
  isCompleted: boolean;
  completedAt?: string;
}

export interface GraduateAcademicInfo {
  educationLevel?: string;
  faculty: string;
  subFaculty?: string;
  program: string;
  major: string;
}

export interface Part1Data {
  position: string;
  positionOther?: string;
  experience: string;
  orgType: string;
  orgTypeOther?: string;
  industries: string[]; // checkboxes or singular, from standard let's support singular/array
  industriesOther?: string;
  graduateDuration: string;
}

export interface Part2Data {
  ratings: Record<number, number>; // 1 to 13 rating scale (1-5)
  strongPoints: string[]; // selected ordered list / items
  strongPointsOther?: string;
  skillsToImprove: string[]; // checkboxes
  skillsToImproveOther?: string;
  suggestions?: string;
}

export interface Part3Data {
  neededMajors: string[]; // checkboxes of 10 categories
  neededMajorsOther?: string;
  coreSkills: string[]; // checkboxes
  coreSkillsOther?: string;
  requiresExperience?: 'no' | 'yes' | '';
  experienceMonths?: number;
  selectionCriteria: string[]; // checkboxes
  selectionCriteriaOther?: string;
}

export interface SurveyResponse {
  id?: string;
  academicYear: string; // Calculated: If submission month >= 8 -> current Year + 543, else + 542
  month: string; // e.g., "06"
  submittedAt: string; // ISO format
  supervisorCode: string;
  educationLevel?: string;
  faculty: string;
  subFaculty?: string;
  curriculum: string;
  department: string;
  part1: Part1Data;
  part2: Part2Data;
  part3: Part3Data;
}

export interface AuditLog {
  id?: string;
  action: 'DELETE_RESPONSES_BY_YEAR' | 'RESET_SURVEY_CODES';
  adminUid: string;
  adminEmail: string;
  academicYear: string;
  count: number;
  timestamp: any;
}

