/** Quiz banks — minimum 12 questions per program (levels 1–3). */

function q(question, options, correctIndex, explanation, level) {
  return { question, options, correctIndex, explanation, level };
}

const COMPLIANCE_L1 = (name) => [
  q(
    `Counselors must never for ${name}:`,
    ["Track attendance", "Guarantee exam scores", "Issue materials", "Run diagnostic"],
    1,
    "Score guarantees are prohibited for all coaching programs.",
    1,
  ),
  q(
    `${name} coaching fee and official exam fee should be:`,
    ["Combined on one line", "Shown separately", "Hidden from student", "Included in visa fee"],
    1,
    "Coaching and exam fees must be quoted separately.",
    1,
  ),
  q(
    `Before enrollment in ${name}, FLC recommends:`,
    ["Skip diagnostic", "Diagnostic and realistic target set", "Guarantee top score", "No agreement needed"],
    1,
    "Diagnostic and target alignment are required before batch start.",
    1,
  ),
  q(
    `Minimum attendance standard for ${name} is typically:`,
    ["50%", "80%", "100%", "Not tracked"],
    1,
    "Review attendance when it drops below 80%.",
    1,
  ),
];

const COMPLIANCE_L2 = (name) => [
  q(
    `Enrollment agreement for ${name} should be signed:`,
    ["After course ends", "Before batch start", "Never", "Only on request"],
    1,
    "Signed agreement before classes begin.",
    2,
  ),
  q(
    `Before advising official exam booking for ${name}:`,
    ["No mocks needed", "Mocks support agreed target", "Guarantee pass first", "Book earliest date"],
    1,
    "Readiness should be based on mock performance.",
    2,
  ),
  q(
    `When attendance drops below 80% in ${name}:`,
    ["Ignore it", "Counselor review and intervention", "Guarantee refund", "Cancel visa file"],
    1,
    "Attendance issues require counselor follow-up.",
    2,
  ),
  q(
    `Official score report for ${name} should be:`,
    ["Discarded", "Logged on client file and shared with visa/admissions team", "Kept secret", "Only verbal update"],
    1,
    "Score reports must be documented and handed off when relevant.",
    2,
  ),
];

const COMPLIANCE_L3 = (name) => [
  q(
    `A student with unrealistic target timeline for ${name} should:`,
    ["Enroll in crash anyway", "Reset timeline or program variant", "Guarantee score", "Skip diagnostic"],
    1,
    "Unrealistic timelines must be corrected before enrollment.",
    3,
  ),
  q(
    `Sales promising a guaranteed band/score for ${name} is:`,
    ["Encouraged", "A compliance violation", "Required for conversion", "Only for managers"],
    1,
    "Never guarantee exam outcomes.",
    3,
  ),
  q(
    `Retake planning for ${name} should be based on:`,
    ["Guesswork", "Skill-gap analysis from official results", "Social media tips", "Random date"],
    1,
    "Retakes need structured gap analysis.",
    3,
  ),
  q(
    `Visa/admissions team handoff for ${name} happens when:`,
    ["Never", "Target met and official report available", "Before enrollment", "Only if student asks"],
    1,
    "Hand off when target is met and documentation is on file.",
    3,
  ),
];

const FAMILY_EXTRA = {
  CELPIP: [
    q("CELPIP-General is primarily used for:", ["Canada immigration & citizenship", "UK Student Route only", "USA F-1 only", "Driving licence"], 0, "CELPIP-General is accepted by IRCC for Canadian immigration.", 1),
    q("CELPIP level 7 equals approximately:", ["CLB 5", "CLB 7", "CLB 9", "No CLB mapping"], 1, "CELPIP scores map 1:1 to CLB levels.", 2),
    q("For Canada Express Entry FSW, CLB 7 typically requires:", ["CELPIP 5 each skill", "CELPIP 7 each skill", "CELPIP 12 each skill", "No English test"], 1, "CLB 7 = CELPIP 7 in each skill.", 2),
    q("CELPIP Academic is suitable for most IRCC PR applications:", ["Yes, always", "No — IRCC accepts CELPIP-General for most PR", "Only Quebec", "Only with LMIA"], 1, "IRCC immigration generally requires CELPIP-General, not Academic.", 3),
    q("TOEFL iBT is accepted by IRCC for Canadian PR:", ["Yes", "No", "Only Ontario", "Only with job offer"], 1, "IRCC does not accept TOEFL for immigration.", 2),
    q("CELPIP is administered by:", ["IDP India", "Paragon Testing / celpip.ca", "British Council only", "Pearson only"], 1, "Paragon Testing Enterprises administers CELPIP in Canada.", 3),
    q("CELPIP score validity for immigration is generally:", ["6 months", "1 year", "2 years", "Lifetime"], 2, "Two years from test date for most IRCC uses.", 2),
    q("A student needing USA F-1 admission should typically consider:", ["CELPIP only", "TOEFL or IELTS Academic per university", "CELPIP Academic for all US unis", "No English test"], 1, "US admissions rarely use CELPIP — confirm university list.", 3),
  ],
  PTE: [
    q("PTE Academic is:", ["Paper-based only", "Computer-based at a test center", "Interview only", "Home handwritten"], 1, "PTE Academic is computer-delivered.", 1),
    q("PTE scores are typically valid for:", ["6 months", "2 years", "5 years", "Forever"], 1, "Two years from test date for most uses.", 1),
    q("PTE Academic is accepted by IRCC for Canadian PR:", ["Yes", "No", "Only Quebec", "Only with PNP"], 1, "Verify current IRCC accepted tests — PTE acceptance has specific rules.", 2),
    q("PTE coaching should separate:", ["Nothing", "Coaching fee from Pearson exam fee", "Visa fee from tuition", "Passport from TRF"], 1, "Always quote coaching and exam fees separately.", 2),
    q("Before PTE exam booking, FLC tracks:", ["Only attendance", "Mocks and readiness against target score", "Social media", "Visa expiry only"], 1, "Mock performance drives exam readiness.", 3),
    q("PTE Speaking uses:", ["Face-to-face examiner", "Computer microphone recording", "Phone call", "Written essay only"], 1, "PTE is fully computer-based including speaking.", 2),
    q("Unrealistic PTE target (e.g. 90 from diagnostic 40 in 2 weeks) requires:", ["Guarantee", "Timeline reset", "Skip mocks", "Hide diagnostic"], 1, "Reset expectations before enrollment.", 3),
    q("PTE results are usually available within:", ["6 months", "48 hours to 5 days", "Same day always", "1 year"], 1, "PTE typically returns scores quickly.", 2),
  ],
  TOEFL: [
    q("TOEFL iBT is most commonly required for:", ["Canada PR", "USA university admission", "UK settlement only", "Schengen tourist visa"], 1, "TOEFL is widely used for US admissions.", 1),
    q("TOEFL iBT is accepted by IRCC for Canadian PR:", ["Yes", "No", "Only Alberta", "Only with job offer"], 1, "IRCC does not accept TOEFL for immigration.", 1),
    q("TOEFL iBT is delivered:", ["Paper only in India", "Internet-based at ETS centers", "By post", "Oral interview only"], 1, "iBT is the standard internet-based format.", 2),
    q("TOEFL score validity is generally:", ["6 months", "2 years", "10 years", "Lifetime"], 1, "Two years from test date.", 2),
    q("TOEFL coaching fee and ETS exam fee should be:", ["Combined", "Quoted separately", "Hidden", "Paid to FLC only"], 1, "Separate fees on all quotes.", 2),
    q("MyBest scores (TOEFL) allow:", ["Combining best section scores from valid tests within 2 years", "Lifetime best score", "Replacing passport", "Skipping Speaking"], 0, "MyBest combines best section scores per ETS rules.", 3),
    q("A Canada PR lead should be directed to:", ["TOEFL iBT Regular", "IELTS GT or CELPIP-General", "SAT", "Spoken English only"], 1, "IRCC does not accept TOEFL for PR.", 3),
    q("Before TOEFL booking, readiness is assessed via:", ["No assessment", "Mocks vs university minimum", "Guaranteed score", "Random date"], 1, "University minimums vary — confirm before booking.", 3),
  ],
  IELTS: [
    q("IELTS Academic is typically required for:", ["University study visas", "Canada citizenship only", "Driving licence", "Tourist visas only"], 0, "Universities and most study pathways require Academic.", 1),
    q("IELTS exam fee in India is paid to:", ["Future Link only", "IDP IELTS India by student", "University", "Embassy"], 1, "Book and pay on ieltsidpindia.com.", 1),
    q("General Training is commonly used for:", ["Canada PR and citizenship", "PhD research only", "Medical licensing only", "Internal diagnostic"], 0, "GT is standard for many migration pathways.", 2),
    q("Counselors must never:", ["Track mock scores", "Guarantee band 7", "Confirm module type", "Link TRF to visa file"], 1, "Band guarantees are prohibited.", 1),
  ],
  "French Language": [
    q("French coaching targets are usually framed as:", ["CEFR levels (A1–C2)", "CLB only", "SAT scores", "GMAT bands"], 0, "European language programs use CEFR.", 1),
    q("DELF/DALF exams are separate from:", ["FLC coaching fee", "Enrollment agreement", "Attendance tracking", "Batch schedule"], 0, "Exam fees are paid to test authorities separately.", 2),
    q("Canada immigration French may require:", ["TEF/TCF or approved tests — confirm program", "No French ever", "Only DELF A1", "Spoken English"], 0, "Confirm accepted French tests for the pathway.", 3),
    q("French A1 crash is appropriate when:", ["Gap to target is realistic and deadline exists", "Complete beginner to C2 in 2 weeks", "No diagnostic done", "Guaranteed DALF pass promised"], 0, "Crash requires realistic gap and deadline.", 3),
  ],
  "German Language": [
    q("German coaching commonly prepares for:", ["Goethe/telc/ÖSD exams", "IELTS GT only", "CELPIP", "SAT"], 0, "German programs align to Goethe/telc/ÖSD.", 1),
    q("Germany Opportunity Card may require:", ["German A1 minimum — verify current rules", "No language", "French C2", "CELPIP 9"], 0, "Check current Chancenkarte language requirements.", 2),
    q("German B1 is often needed for:", ["Some study and work pathways", "UK Student Route only", "Tourist Schengen only", "No practical use"], 0, "B1 is a common threshold for study/work.", 2),
    q("Goethe/telc pass guarantees from FLC are:", ["Required", "Prohibited — never guarantee exam pass", "Only for managers", "Automatic with fee"], 1, "Never guarantee official exam outcomes.", 3),
  ],
  GRE: [
    q("GRE is used primarily for:", ["Graduate school admission", "Canada PR", "Driving test", "Schengen visa"], 0, "GRE is for graduate admissions.", 1),
    q("GRE General includes:", ["Verbal, Quantitative, Analytical Writing", "Listening and Speaking only", "IELTS modules", "CELPIP tasks"], 0, "GRE General has V, Q, and AW sections.", 2),
    q("GRE scores are typically valid for:", ["5 years", "2 years", "6 months", "Lifetime"], 0, "GRE scores are valid about 5 years.", 2),
    q("GRE coaching should document:", ["Diagnostic, target score, mock trends", "Guaranteed 340", "No attendance", "Visa refusal reason"], 0, "Track diagnostic and mocks on file.", 3),
  ],
  GMAT: [
    q("GMAT Focus Edition is used for:", ["MBA and graduate business programs", "Canada citizenship", "French DELF", "German A1"], 0, "GMAT is for business graduate programs.", 1),
    q("GMAT sections include:", ["Quant, Verbal, Data Insights", "Listening, Reading, Writing, Speaking", "CELPIP tasks", "TEF oral only"], 0, "Focus Edition has three section scores.", 2),
    q("GMAT score validity is typically:", ["5 years", "2 years", "1 month", "Forever"], 0, "GMAT scores valid about 5 years.", 2),
    q("Guaranteeing GMAT 705+ is:", ["Standard practice", "Compliance violation", "Required for MBA leads", "IDP policy"], 1, "Never guarantee test scores.", 3),
  ],
  SAT: [
    q("SAT is primarily for:", ["Undergraduate (USA) admission", "Canada PR", "German B2", "Spouse visa"], 0, "SAT is for US undergraduate admissions.", 1),
    q("Digital SAT is:", ["Computer-adaptive", "Paper-only in all countries", "Oral interview", "Same as GRE"], 0, "SAT is digital and adaptive.", 2),
    q("SAT coaching targets should match:", ["University middle 50% score ranges", "Random guess", "Guaranteed 1600", "Visa officer preference"], 0, "Align targets to university ranges.", 3),
    q("SAT and ACT:", ["Both may be accepted — confirm each university", "Are identical tests", "Replace IELTS for PR", "Are not used in USA"], 0, "Universities may accept SAT or ACT.", 3),
  ],
  "Duolingo English Test": [
    q("Duolingo English Test (DET) is:", ["Online proctored from home", "Paper at IDP center", "In-person CELPIP", "French DELF"], 0, "DET is online proctored.", 1),
    q("Before enrolling in DET prep, confirm:", ["University accepts DET and minimum score", "IRCC accepts DET for all PR", "No score needed", "DET replaces passport"], 0, "Institution acceptance varies.", 2),
    q("DET is accepted by IRCC for Express Entry:", ["Always", "No — verify IRCC list", "Only Quebec", "Only with LMIA"], 1, "IRCC does not accept Duolingo for immigration.", 3),
    q("DET results typically arrive within:", ["48 hours", "6 months", "1 year", "After visa grant"], 0, "DET results are fast.", 2),
  ],
  "Spoken English": [
    q("Spoken English coaching is:", ["Fluency and confidence building", "IRCC-approved PR test", "Replacement for IELTS on all visas", "German B2 exam"], 0, "Spoken English is not a visa test substitute.", 1),
    q("A student needing Canada PR should:", ["Use Spoken English only", "Take IELTS GT or CELPIP-General", "Skip all tests", "Book PTE for IRCC always"], 1, "PR requires accepted language tests.", 2),
    q("Spoken English may pair with:", ["Formal test prep once foundation is ready", "Guaranteed band 8", "No enrollment agreement", "Visa filing without test"], 0, "Foundation then formal prep is a common path.", 3),
    q("Interview prep in Spoken English focuses on:", ["Structure, fluency, and feedback", "Memorized visa answers only", "Guaranteed job offer", "Skipping attendance"], 0, "Interview modules emphasize structured practice.", 2),
  ],
};

/** @param {{ displayName: string, family: string, testFamily?: string }} entry */
export function buildQuizFor(entry) {
  const name = entry.displayName;
  const familyKey = entry.testFamily ?? entry.family;
  const extra = FAMILY_EXTRA[familyKey] ?? FAMILY_EXTRA[entry.family] ?? [];

  const quiz = [
    ...COMPLIANCE_L1(name),
    ...extra.filter((item) => item.level === 1),
    ...COMPLIANCE_L2(name),
    ...extra.filter((item) => item.level === 2),
    ...COMPLIANCE_L3(name),
    ...extra.filter((item) => item.level === 3),
  ];

  // Dedupe by question text; ensure minimum 12.
  const seen = new Set();
  const deduped = quiz.filter((item) => {
    if (seen.has(item.question)) return false;
    seen.add(item.question);
    return true;
  });

  return deduped.length >= 12 ? deduped : quiz.slice(0, Math.max(12, quiz.length));
}
