export type IntakeStep = "welcome" | "country" | "level" | "name" | "confirm" | "done";

export interface IntakeData {
  step?: IntakeStep;
  country?: string;
  level?: string;
  full_name?: string;
}

const LEVELS = ["undergraduate", "postgraduate", "work visa", "other"];

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
    next.country = text;
    next.step = "level";
    replies.push(
      "Thanks! What level are you looking for?\n• Undergraduate\n• Postgraduate\n• Work visa\n• Other",
    );
    return { intake: next, replies, confirmed };
  }

  if (step === "level") {
    const matched = LEVELS.find((l) => lower.includes(l.split(" ")[0]));
    next.level = matched ?? text;
    next.step = "name";
    replies.push("Got it. Please share your full name.");
    return { intake: next, replies, confirmed };
  }

  if (step === "name") {
    if (text.length < 2) {
      replies.push("Please send your full name so we can connect you with a counselor.");
      return { intake: next, replies, confirmed };
    }
    next.full_name = text;
    next.step = "confirm";
    replies.push(
      `Please confirm:\n• Country: ${next.country}\n• Level: ${next.level}\n• Name: ${next.full_name}\n\nReply YES to confirm.`,
    );
    return { intake: next, replies, confirmed };
  }

  if (step === "confirm") {
    if (/^(yes|y|confirm|ok|okay)$/i.test(lower)) {
      next.step = "done";
      confirmed = true;
      replies.push(
        "Thank you! Your details are recorded. A counselor will contact you shortly on this number.",
      );
      return { intake: next, replies, confirmed };
    }
    replies.push('Please reply YES to confirm, or send your corrected details starting with the country.');
    next.step = "country";
    return { intake: next, replies, confirmed };
  }

  replies.push("How can we help you today?");
  return { intake: next, replies, confirmed };
}

export function splitName(fullName: string): { first_name: string; last_name: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: "WhatsApp", last_name: "Lead" };
  if (parts.length === 1) return { first_name: parts[0], last_name: "Lead" };
  return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
}
