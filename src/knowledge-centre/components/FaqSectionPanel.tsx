import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { KcFaqItem } from "../types/kc";

export function FaqSectionPanel({ items }: { items: KcFaqItem[] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">No FAQs yet.</p>;
  return (
    <Accordion type="single" collapsible className="w-full">
      {items.map((f) => (
        <AccordionItem key={f.id} value={f.id}>
          <AccordionTrigger className="text-left">{f.question}</AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground whitespace-pre-wrap">{f.answer}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
