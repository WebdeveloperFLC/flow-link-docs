import { Button } from "@/components/ui/button";

const SUGGESTIONS: { group: string; items: string[] }[] = [
  {
    group: "Getting started",
    items: [
      "What can this CRM do?",
      "Where do I find my assigned leads?",
      "How do I create a new client?",
    ],
  },
  {
    group: "Leads & telecaller",
    items: [
      "How do I import cold leads from CSV?",
      "How do I make a call from the telecaller queue?",
      "How do I convert a lead to a client?",
    ],
  },
  {
    group: "Clients & documents",
    items: [
      "How do I upload a client's passport?",
      "How do I invite a client to the portal?",
      "How do I share a client with another counselor?",
    ],
  },
  {
    group: "Programs & institutions",
    items: [
      "How do I use the Course Finder?",
      "Where do I see commission rules for an institution?",
    ],
  },
  {
    group: "Other modules",
    items: [
      "How does Settle Abroad work?",
      "How do I add an offer/discount to a client?",
      "Where do I add a new branch?",
      "How does the Digital Success Hub Google Reviews tab work?",
    ],
  },
];

export function SuggestedQuestions({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="space-y-4">
      {SUGGESTIONS.map((g) => (
        <div key={g.group}>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{g.group}</div>
          <div className="flex flex-wrap gap-2">
            {g.items.map((q) => (
              <Button key={q} variant="outline" size="sm" className="h-auto py-1.5 px-3 text-xs font-normal whitespace-normal text-left" onClick={() => onPick(q)}>
                {q}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}