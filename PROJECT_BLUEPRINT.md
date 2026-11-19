# PROJECT_BLUEPRINT.md
**Project**: Graduate Quality Survey BU (ระบบแบบสำรวจความคิดเห็นของผู้บังคับบัญชาต่อคุณภาพบัณฑิต มหาวิทยาลัยกรุงเทพ)  
**Version**: 1.1.0  
**Status**: Architecture Frozen & Operational  
**Last Updated**: 2026-11-10  

---

## 1. Executive Summary & Business Goals
The **Graduate Quality Survey BU** is an academic quality assurance and institutional research web application developed for Bangkok University. It collects structured feedback from employers and supervisors regarding the competency, ethical conduct, practical skills, and market readiness of Bangkok University graduates. 

### Core Objectives:
1. **Seamless Public Survey Collection**: Enable employers/supervisors to complete a 3-part comprehensive evaluation with minimal friction using pre-issued 4-digit access codes.
2. **Real-time Executive Analytics**: Provide academic administrators with instant KPI metrics, composite score means, and specialized domain averages (TQF Framework, BU Identity, BU 5 DNA).
3. **Institutional Reporting**: Generate standardized formal A4 PDF reports (formatted with 2cm academic margins and multi-page layout) and spreadsheet exports (.xlsx).
4. **Target Database Management**: Allow batch importing of pre-assigned codes from registrar spreadsheets (Excel/CSV) and automated reconciliation of response rates.

---

## 2. Roles & Permission Matrix

| Role | Access Method | Permissions & Capabilities |
| :--- | :--- | :--- |
| **Supervisor / Employer** (Respondent) | 4-Digit Code verification (Public, no Google account needed) | • Validate 4-digit survey code.<br>• Fill Part 1 (Demographics), Part 2 (13 competency attributes on 1–10 scale, strengths ranking, skill improvements), and Part 3 (Degree demands, workplace criteria).<br>• Submit one-time response.<br>• Mark supervisor record as `isCompleted: true`.<br>• Cannot read other responses or admin data. |
| **Admin** (Staff / Academic Officer) | Google Sign-in (`@bu.ac.th` verified in `admins` collection) | • View real-time dashboard, KPIs, and domain-specific means.<br>• Filter analytics by Academic Year, Month, Faculty, and Department.<br>• Export complete data to Excel (.xlsx) and formal reports to PDF (.pdf).<br>• Import supervisor batches via Excel/CSV.<br>• Search and manage supervisor records. |
| **Super Admin** (Institutional Lead) | Google Sign-in (`walailuk.p@bu.ac.th` or `role: super_admin`) | • All Admin privileges.<br>• Grant, edit, or revoke administrator access.<br>• Execute data purge procedures with safety confirmation ("PURGE"). |

---

## 3. System Architecture & Tech Stack

```
[ Client: React 19 + TypeScript + Vite + Tailwind CSS v4 ]
                          |
      +-------------------+-------------------+
      |                                       |
[ Public Survey Portal ]             [ Admin Portal ]
  - 4-Digit Code Lookup                - Google Auth (@bu.ac.th)
  - 3-Part Modular Form                - Real-time Analytics & Infographics
  - Mobile Touch UI                    - Importer (Excel/CSV)
                                       - Export (jsPDF + html2canvas + SheetJS)
                          |
       [ Firebase Firestore + Security Rules ]
        - /admins
        - /supervisors
        - /responses
```

* **Frontend Framework**: React 19 (SPA), TypeScript
* **Build Tooling**: Vite with Tailwind CSS v4 (`@import "tailwindcss";`, custom Prompt & Inter font stack, BU Orange `#F26522`)
* **Icons**: Lucide React
* **Backend / Database**: Google Firebase Firestore (Spark Plan)
* **Authentication**: Firebase Authentication (Google Sign-In with `@bu.ac.th` domain restriction)
* **Export Engines**: 
  * `jspdf` + `html2canvas` for multi-page A4 PDF documents with Canvas 2D color sanitization.
  * `xlsx` (SheetJS) for detailed Excel spreadsheets.

---

## 4. Firestore Data Model & Schema

### Collection: `admins`
* Document ID: Firebase Auth UID (`request.auth.uid`)
* Fields:
  * `email` (string): User Google email (must end with `@bu.ac.th`)
  * `name` (string): Full name of the administrator
  * `position` (string): Official university title / department
  * `role` (string): `'super_admin'` | `'admin'`
  * `createdAt` (string, ISO timestamp)

### Collection: `supervisors`
* Document ID: Auto-generated string
* Fields:
  * `code` (string): Unique 4-digit numeric code (e.g. `'1001'`)
  * `academicYear` (string): Academic Year (e.g. `'2568'`)
  * `name` (string): Name of supervisor / company contact
  * `faculty` (string): Graduate's Faculty
  * `curriculum` (string): Graduate's Curriculum / Program
  * `department` (string): Graduate's Major / Department
  * `isCompleted` (boolean): `false` initially, set to `true` upon survey submission
  * `completedAt` (string, ISO timestamp, optional)

### Collection: `responses`
* Document ID: Auto-generated string
* Fields:
  * `academicYear` (string): Academic Year (e.g. `'2568'`)
  * `month` (string): 2-digit month of submission (e.g. `'11'`)
  * `submittedAt` (string, ISO timestamp)
  * `supervisorCode` (string): 4-digit code used
  * `faculty` (string): Graduate's Faculty
  * `curriculum` (string): Graduate's Curriculum
  * `department` (string): Graduate's Major
  * `part1` (map):
    * `position` (string), `positionOther` (string)
    * `experience` (string)
    * `orgType` (string), `orgTypeOther` (string)
    * `industries` (array of string), `industriesOther` (string)
    * `graduateDuration` (string)
  * `part2` (map):
    * `ratings` (map of number, keys `'1'` to `'13'`, values `1` to `10`)
    * `strongPoints` (array of string, ordered ranking)
    * `strongPointsOther` (string)
    * `skillsToImprove` (array of string)
    * `skillsToImproveOther` (string)
    * `suggestions` (string)
  * `part3` (map):
    * `neededMajors` (array of string), `neededMajorsOther` (string)
    * `coreSkills` (array of string), `coreSkillsOther` (string)
    * `requiresExperience` (string: `'yes'` | `'no'`)
    * `experienceMonths` (number, optional)
    * `selectionCriteria` (array of string), `selectionCriteriaOther` (string)

---

## 5. Security Rules & Data Integrity

1. **Default Deny**: All unmapped paths default to `allow read, write: if false;`.
2. **Domain Isolation**: Administrative write operations require an active Firebase Auth session matching `@bu.ac.th`.
3. **Surveyor Privacy**: Public users can only read the `supervisors` collection to check their 4-digit code. They can only update `isCompleted` and `completedAt`.
4. **Response Privacy**: Anyone can create a response in `responses`, but only authenticated administrators can read, list, or delete responses.
5. **Payload Sanitization**: Client-side `cleanUndefined()` helper strips `undefined` fields before sending data to Firestore to avoid API rejections.

---

## 6. UX / UI Design Principles

1. **Full-Screen Responsive Presence**:
   * Root layout spans edge-to-edge on 1080p/1440p laptops, tablets, and phones (`w-full min-h-screen m-0 p-0 overflow-x-hidden`).
   * No cramped containers on wide screens; fluid responsive wrappers (`max-w-4xl lg:max-w-6xl` for forms, `w-full px-4 sm:px-8` for header/dashboard).
2. **Minimalist Academic Luxury**:
   * Primary brand color: Bangkok University Orange (`#F26522`).
   * Background: Neutral slate (`#F8F9FA` / `#0F172A`).
   * Typography: Prompt and Inter for high legibility in both Thai and English.
   * Zero pill slop: Clean unboxed metadata, structured tabular numerals, and clear hierarchy.
3. **Touch-Friendly Controls**:
   * Minimum touch target heights (≥44px) for all buttons, checkboxes, and radio options.
   * Rating matrix with horizontal scroll container on mobile (`min-w-[680px]`) prevents number overlap.

---

## 7. Operational Guidelines & Freeze Policy

* **Architecture Frozen**: No modifications to collection names, schema fields, authentication methods, or core routes without explicit justification and architectural review.
* **Preserve Working Features**: Incremental fixes must not rewrite unrelated components or degrade existing PDF/Excel exports.
