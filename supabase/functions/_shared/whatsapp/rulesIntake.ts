export type IntakeStep = "welcome" | "country" | "level" | "branch" | "name" | "confirm" | "done";

export interface IntakeData {
  step?: IntakeStep;
  country?: string;
  level?: string;
  branch_preference?: string;
  branch_id?: string;
  full_name?: string;
}

const LEVELS = ["undergraduate", "postgraduate", "work visa", "other"] as const;

const COUNTRY_HINTS = [
  "canada", "uk", "united kingdom", "australia", "usa", "us", "united states",
  "new zealand", "germany", "ireland", "france", "india", "dubai", "uae",
];

function looksLikeGreetingOrIntent(text: string): boolean {
  const lower = text.toLowerCase();
  return /^(hi|hello|hey|good\s)/i.test(lower)
    || /(want to|study in|interested in|looking for|can you|please)/i.test(lower);
}

function extractCountry(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const studyMatch = trimmed.match(
    /(?:want\s+to\s+)?(?:study|go|move)\s+(?:in|to)\s+([a-z][a-z\s]{1,30})/i,
  ) || trimmed.match(/interested\s+in\s+([a-z][a-z\s]{1,30})/i);
  if (studyMatch) {
    const raw = studyMatch[1].trim().replace(/[.,!?]+$/, "");
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  const lower = trimmed.toLowerCase();
  for (const c of COUNTRY_HINTS) {
    if (lower.includes(c)) {
      return c.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    }
  }

  // Short direct answer: "Canada", "UK"
  const words = trimmed.split(/\s+/);
  if (words.length <= 3 && !looksLikeGreetingOrIntent(trimmed)) {
    return trimmed;
  }

  return null;
}

function parseLevel(text: string): string | null {
  const lower = text.toLowerCase().trim();
  if (looksLikeGreetingOrIntent(text)) return null;

  const matched = LEVELS.find((l) => {
    const key = l.split(" ")[0];
    return lower.includes(key) || lower.includes(l);
  });
  if (matched) return matched;

  if (/^(ug|under\s*grad)/i.test(lower)) return "undergraduate";
  if (/^(pg|post\s*grad)/i.test(lower)) return "postgraduate";
  if (/^work/i.test(lower)) return "work visa";

  if (lower.length <= 20 && !looksLikeGreetingOrIntent(text)) return text;
  return null;
}

function parseName(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.length < 2 || looksLikeGreetingOrIntent(trimmed)) return null;
  if (/study in|want to/i.test(trimmed)) return null;
  // Names: letters/spaces/dots/hyphens, at least one space or 3+ chars
  if (!/^[\p{L}\s.'-]+$/u.test(trimmed)) return null;
  if (!trimmed.includes(" ") && trimmed.length < 3) return null;
  return trimmed;
}

export function nextRulesReply(
  intake: IntakeData,
  inboundText: string,
): { intake: IntakeData; replies: string[]; confirmed: boolean } {
  const text = (inboundText || "").trim();
  const lower = text.toLowerCase();
  const replies: string[] = [];
  let confirmed = false;
  const next: IntakeData = { ...intake };

  const step = intake.step ?? "welcome";

  if (step === "welcome" || step === "country") {
    if (!text) {
      replies.push(
        "Welcome to our helpline! Which country are you interested in? (e.g. Canada, UK, Australia)",
      );
      next.step = "country";
      return { intake: next, replies, confirmed };
    }

    const country = extractCountry(text);
    if (!country) {
      replies.push(
        "Please tell us the country only (e.g. *Canada* or *UK*), or say \"study in Canada\".",
      );
      next.step = "country";
      return { intake: next, replies, confirmed };
    }

    next.country = country;
    next.step = "level";
    replies.push(
      `Thanks! What level for ${country}?\n• Undergraduate\n• Postgraduate\n• Work visa\n• Other`,
    );
    return { intake: next, replies, confirmed };
  }

  if (step === "level") {
    const level = parseLevel(text);
    if (!level) {
      replies.push(
        "Please pick a level: Undergraduate, Postgraduate, Work visa, or Other (one short reply).",
      );
      return { intake: next, replies, confirmed };
    }
    next.level = level;
    next.step = "branch";
    replies.push(
      "Which branch or city is most convenient for you? (e.g. your city name, branch name, or reply *Any*)",
    );
    return { intake: next, replies, confirmed };
  }

  if (step === "branch") {
    if (!text || text.length < 2) {
      replies.push("Please share your preferred branch or city (or reply *Any*).");
      return { intake: next, replies, confirmed };
    }
    next.branch_preference = text.trim();
    next.step = "name";
    replies.push("Got it. Please share your full name (first and last).");
    return { intake: next, replies, confirmed };
  }

  if (step === "name") {
    const name = parseName(text);
    if (!name) {
      replies.push("Please send your full name only (e.g. Santosh Ramrakhiani).");
      return { intake: next, replies, confirmed };
    }
    next.full_name = name;
    next.step = "confirm";
    const branchLine = next.branch_preference ? `\n• Branch/city: ${next.branch_preference}` : "";
    replies.push(
      `Please confirm:\n• Country: ${next.country}\n• Level: ${next.level}${branchLine}\n• Name: ${next.full_name}\n\nReply YES to confirm.`,
    );
    return { intake: next, replies, confirmed };
  }

  if (step === "confirm") {
    if (/^(yes|y|confirm|ok|okay)$/i.test(lower)) {
      next.step = "done";
      confirmed = true;
      replies.push(
        "Thank you! Your details are recorded. We are connecting you with a counselor who will contact you shortly on this number.",
      );
      return { intake: next, replies, confirmed };
    }
    replies.push(
      'Please reply YES to confirm. To start over, send RESTART.',
    );
    return { intake: next, replies, confirmed };
  }

  if (/^restart$/i.test(lower)) {
    return {
      intake: { step: "country" },
      replies: ["Starting over. Which country are you interested in? (e.g. Canada, UK)"],
      confirmed: false,
    };
  }

  replies.push('Send RESTART to begin again, or wait for your counselor.');
  return { intake: next, replies, confirmed };
}

export function splitName(fullName: string): { first_name: string; last_name: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: "WhatsApp", last_name: "Lead" };
  if (parts.length === 1) return { first_name: parts[0], last_name: "Lead" };
  return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
}

export function isIntakeYesConfirm(text: string): boolean {
  return /^(yes|y|confirm|ok|okay)[.!?\s]*$/i.test((text || "").trim());
}

export function normalizeIntakeFields(intake: IntakeData): IntakeData {
  const raw = intake as IntakeData & { name?: string; branch?: string };
  return {
    ...intake,
    full_name: intake.full_name || raw.name,
    branch_preference: intake.branch_preference || raw.branch,
  };
}

export function intakeReadyToConfirm(intake: IntakeData): boolean {
  const normalized = normalizeIntakeFields(intake);
  if (normalized.step === "confirm" || normalized.step === "done") return true;
  return !!(normalized.country && normalized.level && normalized.full_name);
}

export function shouldForceIntakeConfirm(intake: IntakeData, text: string): boolean {
  if (!isIntakeYesConfirm(text)) return false;
  const normalized = normalizeIntakeFields(intake);
  return normalized.step === "confirm" || normalized.step === "done" || intakeReadyToConfirm(normalized);
}
