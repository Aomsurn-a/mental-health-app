---
target: frontend/src/pages/Dashboard.tsx
total_score: 20
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
target_identity: "file:D:\\Work\\Final_project\\mental-health-app\\frontend\\src\\pages\\Dashboard.tsx"
target_fingerprint: "sha256:7c9cdd10766204fc7fee66927e5d29a245bd2d77dc6b31a18ef4746a9a8bba4e"
target_path: "D:\\Work\\Final_project\\mental-health-app\\frontend\\src\\pages\\Dashboard.tsx"
timestamp: 2026-09-23T08-12-04Z
slug: frontend-src-pages-dashboard-tsx
---
Method: dual-agent (A: 01a0cd4d-fe87-7a81-844c-f8f87b5ada98 · B: 01a0cd4d-ff50-7df0-8d98-c22b79d2ae4e)

# Mental-health-app dashboard critique

Scope: frontend/src/pages/Dashboard.tsx and its three role dashboards, MainLayout.tsx, themes.ts, index.css. Source-based assessment. Live browser inspection was limited to /login at desktop and 375px; authenticated dashboard interactions were not tested. Scores are provisional expert judgments, not user-testing results.

## Design specificity and overall impression

Mental-health tasks are well represented: mood, assessments, appointments, clinician schedules, and organizational requests. Composition remains a conventional card dashboard; roles are more differentiated by data than visual treatment. Highest priority for defense is truthful data/status and a complete workflow per role before cosmetic refinement.

CLI detector returned zero findings, exit 0. This does not validate rendered accessibility or design compliance. Supplemental source inspection found 41 raw hex occurrences across the five dashboard/layout TSX files; CSS contains 12 additional hex definitions, which are not inherently violations. Mandatory Noto Sans Thai and Ant Design icons should not be treated as false positives. Greeting/mood emoji are distinct from structural logo icons.

## Design Health Score

0 = severe shortcomings, 4 = excellent.

| Heuristic | Score | Evidence |
|---|---:|---|
| Visibility of system status | 2 | Loading present, failure can look empty |
| Match with real world | 3 | Thai task labels and role-relevant information |
| User control and freedom | 2 | Navigation/editing present, weak acknowledgment recovery |
| Consistency and standards | 2 | Shared components but hardcoded colors and route inconsistency |
| Error prevention | 2 | Summary labels invite mistaken conclusions |
| Recognition rather than recall | 3 | Labeled menus and recent records; weak record handoffs |
| Flexibility and efficiency | 2 | Shortcuts exist, limited contextual destinations |
| Aesthetic and minimalist design | 2 | Logical sections, repeated information and competing emphasis |
| Error recovery | 1 | Console-only failures or no retry |
| Help and documentation | 1 | Limited contextual guidance |
| Total | 20/40 | Acceptable foundation; significant improvements needed |

## Strengths

- Daily mood check-in switches to an editable recorded state (UserDashboard.tsx:139).
- Clinician dashboard includes sorted appointments, capacity and recent patients (PsyDashboard.tsx:110).
- Admin surfaces pending work; status labels accompany colors (AdminDashboard.tsx:99).
- Live login inspection confirmed Noto Sans Thai and no horizontal overflow at 375px.

## Priority issues

### [P1] Failed requests look like no records

UserDashboard.tsx:64 and PsyDashboard.tsx:53 use Promise.all and console-only error handling. One failure can leave initial empty arrays displayed as no appointments/results/alerts. AdminDashboard.tsx:86 reports failure without retry.
Fix: explicit per-section loading, successful-empty and error states; retain successful sections and provide retry.
Suggested command: $impeccable harden.

### [P1] Clinician navigation does not complete the intended task

PsyDashboard.tsx:201 links reports to /report, which renders AdminReports (App.tsx:125). Appointment shortcuts use /psy-appointment while sidebar selection expects /appointment (MainLayout.tsx:39,110). Risk alerts offer acknowledgment rather than a direct patient/contact handoff (PsyDashboard.tsx:137).
Fix: clinician-appropriate destinations, consistent appointment paths, contextual patient/chat links.
Backend permission behavior is not verified.
Suggested command: $impeccable harden.

### [P1] Summary labels do not match calculations

UserDashboard.tsx:103 takes 14 entries, while the chart says 14 days (:216). Appointments are sliced to three (:80) before that array length is presented as a total (:208).
Fix: calculate a calendar window or label entries accurately; count the full set before selecting preview rows.
Suggested command: $impeccable clarify, with calculation corrections.

### [P1] Sensitive information needs context and a next action

The prominent risk badge lacks instrument/date beside it (UserDashboard.tsx:193); detail is lower down (:251). Reminder/streak language may feel pressuring (:158). Clinician alerts expose names/full detail in an unbounded stack (PsyDashboard.tsx:130).
Fix: pair severity with instrument/date and supportive next steps, soften check-in copy, summarize alerts with expandable details. Emotional impact is an inference, not observed behavior.
Suggested command: $impeccable clarify.

### [P2] Shell and custom components do not fully follow role themes

MainLayout.tsx:85 keeps navy navigation despite light role themes. index.css:53 constrains the root to 1126px with centered text. Sidebar begins expanded at 220px without breakpoint handling. Collapse button lacks an explicit accessible name (:128); clickable Admin cards lack explicit keyboard semantics (AdminDashboard.tsx:118).
Fix: consume theme tokens in custom styles, adapt sidebar for narrow viewports, use semantic links/buttons and accessible names. Dashboard overflow/contrast/focus remain unverified.
Suggested commands: $impeccable adapt, $impeccable polish.

## Cognitive load and emotional journey

Menus expose 9 User, 6 Psychologist and 5 Admin options. Counts suggest grouping opportunities, not proof of overload. Repeated summaries, unbounded detailed alerts and generic links are stronger concerns. Source-inferred checklist weaknesses: chunking, minimal choices and progressive disclosure; hierarchy requires authenticated visual inspection.

User: friendly greeting and clear check-in lead into streak pressure and risk uncertainty.
Psychologist: useful awareness is weakened at the transition from alert to patient action.
Admin: pending-work summary helps, but generic management destinations require locating the case again.

## Persona red flags

- Jordan, first-time user: risk badge without nearby instrument/date; limited help deciding the next step.
- Alex, busy clinician: reports destination and generic appointment links interrupt efficient task completion.
- Sam, keyboard-dependent user: clickable cards/account trigger and unlabeled collapse control need semantic verification.

## Minor observations

Structural brain emoji in MainLayout.tsx:103 conflicts with DESIGN.md. CSS base font is 18px/145%, heading weight 500, versus documented 16px/1.5 and 600–700; actual component styles can override these. Mixed Mood/Thai terminology should be standardized. No authenticated mobile or keyboard test was performed.

## Questions to consider

1. Prioritize before defense: truthful states/calculations, role theme/layout, or clinician workflows?
2. Scope of follow-up: top three issues, all five, or review-only for now?
