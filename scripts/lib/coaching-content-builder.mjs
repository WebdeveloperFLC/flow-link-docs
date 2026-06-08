/** Build academy_metadata + checklist JSON for coaching services from registry entries. */

const IELTS_REF_ID = "b2000001-0001-4000-8000-000000000071";

const DEFAULT_SUBMISSION_ITEMS = [
  ["diagnostic_completed", "Diagnostic / level assessment completed", true, 1],
  ["enrollment_agreement_signed", "Enrollment agreement signed", true, 2],
  ["course_fee_collected", "Course fee collected; receipt issued", true, 3],
  ["batch_assigned", "Batch assigned and schedule shared", true, 4],
  ["materials_issued", "Books / materials issued and logged", true, 5],
  ["attendance_tracking_active", "Attendance tracking active on file", true, 6],
  ["mock_tests_scheduled", "Mock tests scheduled and tracked", true, 7],
  ["exam_registration_guidance", "Exam registration guidance provided (if applicable)", false, 8],
  ["counselor_review_completed", "Counselor progress review completed", true, 9],
  ["completion_or_handoff", "Course completion / handoff documented", true, 10],
];

export function defaultSubmissionItems() {
  return DEFAULT_SUBMISSION_ITEMS.map(([item_key, item_label, is_mandatory, sort_order]) => ({
    item_key,
    item_label,
    is_mandatory,
    sort_order,
  }));
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function quizFor(entry) {
  const name = entry.displayName;
  return [
    {
      question: `Counselors must never for ${name}:`,
      options: ["Track attendance", "Guarantee exam scores", "Issue materials", "Run diagnostic"],
      correctIndex: 1,
      explanation: "Score guarantees are prohibited for all coaching programs.",
      level: 1,
    },
    {
      question: `${name} coaching fee and official exam fee should be:`,
      options: ["Combined on one line", "Shown separately", "Hidden from student", "Included in visa fee"],
      correctIndex: 1,
      explanation: "Coaching and exam fees must be quoted separately.",
      level: 1,
    },
    {
      question: `Before enrollment in ${name}, FLC recommends:`,
      options: ["Skip diagnostic", "Diagnostic and realistic target set", "Guarantee top score", "No agreement needed"],
      correctIndex: 1,
      explanation: "Diagnostic and target alignment are required before batch start.",
      level: 1,
    },
    {
      question: `Minimum attendance standard for ${name} is typically:`,
      options: ["50%", "80%", "100%", "Not tracked"],
      correctIndex: 1,
      explanation: "Review attendance when it drops below 80%.",
      level: 1,
    },
    {
      question: `Enrollment agreement for ${name} should be signed:`,
      options: ["After course ends", "Before batch start", "Never", "Only on request"],
      correctIndex: 1,
      explanation: "Signed agreement before classes begin.",
      level: 2,
    },
  ];
}

export function buildAcademyMetadata(entry) {
  const related = (entry.relatedIds ?? [])
    .filter((id) => id && id !== entry.id)
    .map((id, i) => ({
      label: entry.relatedLabels?.[i] ?? "Related program",
      libraryId: id,
    }));

  if (entry.family === "IELTS" && entry.id !== IELTS_REF_ID) {
    related.unshift({
      label: "IELTS — Test reference",
      libraryId: IELTS_REF_ID,
    });
  }

  return {
    displayName: entry.displayName,
    shortDescription: entry.shortDescription,
    version: "v1.0",
    versionStatus: "Live",
    reviewStatus: "active",
    updatedLabel: "Updated June 2026",
    learningLevel: entry.learningLevel ?? "Intermediate",
    learningMinutes: entry.learningMinutes ?? 10,
    navBucket: "coaching",
    testFamily: entry.testFamily ?? entry.family,
    policyAlert: {
      active: true,
      date: "June 2026",
      summary: entry.policySummary,
    },
    alert: entry.alert ?? {
      title: "Confirm student goal before enrollment",
      body: entry.alertBody ?? `Verify pathway, target score/level, and timeline before enrolling in ${entry.displayName}.`,
    },
    tags: entry.tags ?? [
      { label: "Active program", variant: "success" },
      { label: entry.family, variant: "neutral" },
    ],
    chips: entry.chips ?? [
      { label: entry.duration ?? "See batch schedule", variant: "neutral" },
      { label: "Exam fee separate", variant: "warning" },
    ],
    kpis: entry.kpis ?? [
      { label: "Course duration", value: entry.duration ?? "Varies", sub: entry.batchType ?? "Regular batch", tone: "primary" },
      { label: "Target achievement", value: "—", sub: "Track on client file", tone: "success" },
      { label: "Enrollment docs", value: "6+", sub: "Agreement + diagnostic", tone: "violet" },
    ],
    about: [
      {
        label: "Description",
        value: entry.description ?? `Structured ${entry.displayName} preparation with trainer-led classes, homework, and progress tracking.`,
      },
      {
        label: "Ideal for",
        value: entry.idealFor ?? `Students targeting ${entry.family} goals with realistic timeline and attendance commitment.`,
      },
      {
        label: "Delivery",
        value: entry.delivery ?? "Classroom or hybrid per branch schedule. Materials per program policy.",
      },
      {
        label: "After course",
        value: entry.afterCourse ?? "Exam guidance, score tracking, retake recommendation, and handoff to admissions/visa team when target met.",
      },
    ],
    eligibility: [
      { criterion: "Diagnostic or prior score on file", met: true },
      { criterion: "Realistic target vs current level", met: true },
      { criterion: "Batch timing suits student schedule", met: true },
      { criterion: "Enrollment agreement signed", met: true },
      { criterion: "Course fee collected", met: true },
    ],
    redFlagsBanner: entry.redFlagsBanner ?? "If attendance drops or mocks stay far below target, pause exam booking and reset the study plan.",
    redFlags: entry.redFlags ?? [
      {
        title: "Unrealistic target",
        description: "Large gap expected in very short timeline.",
        fix: "Reset timeline or recommend appropriate program",
        severity: "Very common",
      },
      {
        title: "Chronic absenteeism",
        description: "Below 80% attendance.",
        fix: "Counselor call, batch change, or pause",
        severity: "Common",
      },
      {
        title: "Guaranteed score promised",
        description: "Sales or counselor over-commitment.",
        fix: "Compliance issue — never guarantee scores",
        severity: "High",
      },
    ],
    faqs: entry.faqs ?? [
      {
        q: "Who pays the official exam fee?",
        a: "The student pays the test authority directly where applicable. FLC coaching fee is separate.",
      },
      {
        q: "Can Future Link guarantee the target score?",
        a: "No. We set targets from diagnostics and track progress — outcomes depend on student effort and attendance.",
      },
      {
        q: "Are books included?",
        a: entry.booksIncluded
          ? "Yes — issue materials at enrollment and log on file."
          : "Verify program variant — some batches include books, others are materials-light.",
      },
      {
        q: "How many mock tests?",
        a: entry.mockCount ?? "Minimum per program policy — track mocks before advising exam booking.",
      },
    ],
    compliance: [
      "Never guarantee exam scores or bands",
      "Separate coaching fee from exam registration fee",
      "Signed enrollment agreement before batch start",
      "Record diagnostic and mock scores on client file",
    ],
    proTips: entry.proTips ?? [
      "Set target in writing at enrollment",
      "Review mock trends weekly",
      "Confirm correct test/module for student pathway",
      "Book official exam only when mocks support readiness",
    ],
    postApproval: [
      "Collect official score report when released",
      "Update client record for admissions / visa team",
      "Plan retake or booster if below target",
    ],
    performance: { ourRate: 80, industryRate: 65, stats: [{ label: "Program enrollments", value: "—" }] },
    approvalFactors: [
      { label: "Attendance 80%+", ours: 86, benchmark: 72 },
      { label: "Mock completion", ours: 88, benchmark: 74 },
    ],
    timeline: entry.timeline ?? [
      { weeks: "1", title: "Diagnostic, enrollment, batch allocation" },
      { weeks: "2–8", title: "Classes, homework, skill drills" },
      { weeks: "6–8", title: "Mocks and readiness review" },
      { weeks: "8+", title: "Exam booking, test day prep, score follow-up" },
    ],
    relatedServices: related,
    changelog: [
      {
        version: "v1.0",
        date: "June 2026",
        author: "Service Library",
        summary: `Initial ${entry.displayName} coaching specimen.`,
      },
    ],
    staffNotes: [
      {
        author: "Coaching team",
        date: "June 2026",
        text: entry.staffNote ?? `Use this specimen for counselor training on ${entry.displayName}.`,
      },
    ],
    resources: entry.resources ?? [],
    donts: {
      dos: ["Run diagnostic before quoting timeline", "Track attendance and mocks", "Keep exam fee separate on quotes"],
      donts: ["Guarantee scores", "Book exam before readiness", "Skip enrollment agreement"],
      mistakes: ["Unrealistic target timeline", "No mock before exam date", "Visa team not updated when target met"],
    },
    sampleDocs: entry.sampleDocs ?? [],
    quiz: quizFor(entry),
  };
}

export function buildChecklistSpec(entry) {
  const slug = entry.checklistSlug ?? slugify(entry.displayName);
  return {
    slug,
    displayName: entry.displayName,
    title: "Counselor Enrollment & Delivery Checklist",
    subtitle: `Coaching · ${entry.family} · ${entry.variantLabel ?? entry.sub_service}`,
    streamLabel: entry.duration ?? "Regular batch · Classroom / hybrid",
    updatedLabel: "Updated June 2026",
    verifyUrl: entry.verifyUrl ?? "futurelinkconsultants.com",
    website: "futurelinkconsultants.com",
    footerTagline:
      "Future Link Consultants | 25+ Years in Study Abroad & Test Prep | IELTS · PTE · GRE · GMAT · German · French · Spoken English",
    policyBanner: entry.policySummary,
    metaFields: [
      { key: "client_name", label: "Student name", placeholder: "Full name" },
      { key: "file_id", label: "File ID", placeholder: "FLC-2026-XXXX" },
      { key: "batch_name", label: "Batch", placeholder: `e.g. ${entry.family}-Jun-2026` },
      { key: "current_level", label: "Current level (diagnostic)", placeholder: "e.g. B1" },
      { key: "target_level", label: "Target level / score", placeholder: "e.g. 6.5 / B2" },
      { key: "enrollment_date", label: "Enrollment date", placeholder: "yyyy-mm-dd" },
    ],
    sections: [
      {
        id: "A",
        title: "Intake, diagnostic & goal setting",
        items: [
          {
            title: "Diagnostic / level assessment completed",
            note: "Record baseline scores or level. Set realistic target and timeline.",
            badge: "REQUIRED",
          },
          {
            title: "Student goal and pathway confirmed",
            badge: "REQUIRED",
          },
          {
            title: "Enrollment agreement signed",
            badge: "REQUIRED",
          },
          {
            title: "Course fee collected; receipt issued (separate from exam fee)",
            badge: "REQUIRED",
          },
        ],
      },
      {
        id: "B",
        title: "Batch allocation & materials",
        items: [
          { title: "Batch assigned — schedule shared", badge: "REQUIRED" },
          {
            title: entry.booksIncluded
              ? "Course books / materials issued and logged"
              : "Course materials shared (books per program policy)",
            badge: entry.booksIncluded ? "REQUIRED" : "RECOMMENDED",
          },
          { title: "Trainer and counselor contact shared with student", badge: "REQUIRED" },
        ],
      },
      {
        id: "C",
        title: "Delivery & progress tracking",
        items: [
          { title: "Attendance tracked weekly", badge: "REQUIRED" },
          { title: "Homework and mock tests scheduled", badge: "REQUIRED" },
          { title: "Progress review at mid-course", badge: "RECOMMENDED" },
          { title: "Exam registration guidance provided (if applicable)", badge: "IF APPLICABLE" },
        ],
      },
      {
        id: "D",
        title: "Completion & handoff",
        items: [
          { title: "Final mock / readiness review completed", badge: "REQUIRED" },
          { title: "Official score report collected (if tested)", badge: "IF APPLICABLE" },
          { title: "Admissions / visa team notified when target met", badge: "RECOMMENDED" },
        ],
      },
    ],
  };
}
