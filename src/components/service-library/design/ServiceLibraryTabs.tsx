import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Send,
  Download,
  FileText,
  ExternalLink,
  Brain,
  StickyNote,
  History,
  Eye,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AcademyViewModel } from "@/lib/service-library/buildAcademyViewModel";
import { copyToClipboard } from "@/lib/serviceLibrary";
import { toast } from "sonner";
import { ServiceLibraryQuiz } from "@/components/service-library/design/ServiceLibraryQuiz";
import { SampleDocSpecimenDialog } from "@/components/service-library/design/SampleDocSpecimenDialog";

const TAB_IDS = [
  "overview",
  "eligibility",
  "checklist",
  "process",
  "dos",
  "redflags",
  "faqs",
  "compliance",
  "downloads",
  "sampledocs",
  "quiz",
  "notes",
  "changelog",
] as const;

type TabId = (typeof TAB_IDS)[number];

type Props = {
  view: AcademyViewModel;
  activeTab?: TabId;
  onTabChange?: (tab: TabId) => void;
  onToggleChecklistItem?: (id: string) => void;
  onPushChecklist?: () => void;
  onDownloadFile?: (fileId: string, fileName: string) => void;
  onOpenSampleDoc?: (filePath: string, fileName: string) => void;
};

export function ServiceLibraryTabs({
  view,
  activeTab: controlledTab,
  onTabChange,
  onToggleChecklistItem,
  onPushChecklist,
  onDownloadFile,
  onOpenSampleDoc,
}: Props) {
  const [internalTab, setInternalTab] = useState<TabId>("redflags");
  const [specimenDoc, setSpecimenDoc] = useState<(typeof view.sampleDocs)[number] | null>(null);
  const activeTab = controlledTab ?? internalTab;
  const setTab = (t: TabId) => {
    setInternalTab(t);
    onTabChange?.(t);
  };

  const checklist = view.checklist;
  const items = checklist.submission;
  const doneCount = checklist.completed;
  const total = checklist.total || items.length;

  const copyChecklist = async () => {
    const text = items.map((i) => `${i.done ? "✓" : "○"} ${i.label}`).join("\n");
    const ok = await copyToClipboard(text);
    toast[ok ? "success" : "error"](ok ? "Checklist copied" : "Copy failed");
  };

  return (
    <Tabs value={activeTab} onValueChange={(v) => setTab(v as TabId)} className="w-full">
      <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-muted/40 p-1 mb-4">
        {TAB_IDS.map((id) => (
          <TabsTrigger key={id} value={id} className="text-xs sm:text-sm capitalize data-[state=active]:bg-card">
            {id === "dos" ? "Do's & don'ts" : id === "redflags" ? "Red flags" : id === "sampledocs" ? "Sample docs" : id === "changelog" ? "Change log" : id}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="overview" className="space-y-4 mt-0">
        <Card className="p-5 shadow-elev-sm">
          <h3 className="font-semibold mb-4">About this service</h3>
          {view.about.length ? (
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
              {view.about.map((row) => (
                <div key={row.label} className={row.label === "Description" ? "md:col-span-2" : ""}>
                  <dt className="text-muted-foreground font-medium mb-0.5">{row.label}</dt>
                  <dd className="flex items-start gap-1.5">
                    {row.warning && <AlertTriangle className="size-4 text-warning shrink-0" />}
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">Add overview fields in Service Library Admin → Service content.</p>
          )}
        </Card>
        {view.proTips.length > 0 && (
          <Card className="p-5 shadow-elev-sm">
            <h3 className="font-semibold mb-3">Pro tips</h3>
            <ul className="space-y-2 text-sm">
              {view.proTips.map((t, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-primary">•</span>
                  {t}
                </li>
              ))}
            </ul>
          </Card>
        )}
        {view.postApproval.length > 0 && (
          <Card className="p-5 shadow-elev-sm">
            <h3 className="font-semibold mb-3">After approval</h3>
            <ul className="space-y-2 text-sm">
              {view.postApproval.map((t, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-success">•</span>
                  {t}
                </li>
              ))}
            </ul>
          </Card>
        )}
        {view.performance && (view.performance.ourRate > 0 || view.performance.stats.length > 0) && (
          <Card className="p-5 shadow-elev-sm">
            <h3 className="font-semibold mb-4">Approval performance</h3>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span>Our approval rate</span>
                <span className="font-semibold text-success">{view.performance.ourRate}%</span>
              </div>
              <Progress value={view.performance.ourRate} className="h-2.5" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Industry average</span>
                <span>{view.performance.industryRate}%</span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {view.performance.stats.map((s) => (
                <div key={s.label} className="rounded-lg border p-3 text-center bg-muted/20">
                  <div className="text-lg font-bold">{s.value}</div>
                  <div className="text-[10px] text-muted-foreground uppercase mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="eligibility" className="mt-0">
        <Card className="p-5 shadow-elev-sm">
          {view.eligibility.length ? (
            <ul className="space-y-3">
              {view.eligibility.map((e) => (
                <li key={e.criterion} className="flex items-start gap-3 text-sm">
                  {e.met ? (
                    <CheckCircle2 className="size-5 text-success shrink-0" />
                  ) : (
                    <XCircle className="size-5 text-muted-foreground shrink-0" />
                  )}
                  <div>
                    <div className="font-medium">{e.criterion}</div>
                    {e.note && <p className="text-xs text-muted-foreground mt-0.5">{e.note}</p>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No eligibility criteria yet.</p>
          )}
        </Card>
      </TabsContent>

      <TabsContent value="checklist" className="space-y-4 mt-0">
        <Card className="p-5 shadow-elev-sm">
          <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
            <div>
              <h3 className="font-semibold">Submission checklist</h3>
              <p className="text-sm text-muted-foreground">
                {doneCount} of {total} complete
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyChecklist}>
                <Copy className="size-4 mr-1" />
                Copy
              </Button>
              <Button variant="outline" size="sm" onClick={onPushChecklist} disabled={!onPushChecklist}>
                <Send className="size-4 mr-1" />
                Push to client
              </Button>
            </div>
          </div>
          {total > 0 && <Progress value={(doneCount / total) * 100} className="h-2 mb-4" />}
          <div className="space-y-2">
            {items.map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/30"
              >
                <Checkbox
                  checked={item.done}
                  onCheckedChange={() => onToggleChecklistItem?.(item.id)}
                  disabled={!onToggleChecklistItem}
                />
                <span className="text-sm flex-1">{item.label}</span>
                {item.mandatory && (
                  <Badge variant="outline" className="text-[10px]">
                    Required
                  </Badge>
                )}
              </label>
            ))}
            {!items.length && (
              <p className="text-sm text-muted-foreground">Configure submission checklist in admin.</p>
            )}
          </div>
        </Card>
        {checklist.documentNotes && (
          <Card className="p-5 shadow-elev-sm">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{checklist.documentNotes}</p>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="process" className="space-y-4 mt-0">
        <Card className="p-5 shadow-elev-sm">
          {view.process.length ? (
            <ol className="relative border-l border-border ml-3 space-y-6">
              {view.process.map((step) => (
                <li key={step.step} className="pl-6">
                  <span className="absolute -left-2 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {step.step}
                  </span>
                  <div className="font-semibold">{step.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {step.duration} · {step.owner}
                  </div>
                  {step.notes && <p className="text-xs mt-1 text-muted-foreground">{step.notes}</p>}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">Add process steps in admin → Process Flow tab.</p>
          )}
        </Card>
        {view.timeline.length > 0 && (
          <Card className="p-5 shadow-elev-sm">
            <h3 className="font-semibold mb-3">Timeline overview</h3>
            <ul className="space-y-2 text-sm">
              {view.timeline.map((t) => (
                <li key={t.weeks + t.title} className="flex gap-3 border-b pb-2 last:border-0">
                  <span className="font-mono text-xs text-muted-foreground shrink-0 w-14">{t.weeks}</span>
                  <span>{t.title}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="dos" className="mt-0">
        <div className="grid md:grid-cols-3 gap-4">
          {(
            [
              ["dos", "Do's", view.dosDonts.dos],
              ["donts", "Don'ts", view.dosDonts.donts],
              ["mistakes", "Common mistakes", view.dosDonts.mistakes],
            ] as const
          ).map(([key, title, lines]) => (
            <Card key={key} className="p-5 shadow-elev-sm">
              <h3 className="font-semibold mb-3">{title}</h3>
              <ul className="space-y-2 text-sm">
                {lines.map((line, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-muted-foreground">•</span>
                    {line}
                  </li>
                ))}
                {!lines.length && (
                  <li className="text-muted-foreground">None listed.</li>
                )}
              </ul>
            </Card>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="redflags" className="mt-0 space-y-3">
        {view.redFlags.length ? (
          view.redFlags.map((rf) => (
            <Card
              key={rf.title}
              className={cn(
                "p-4 shadow-elev-sm border-l-4",
                /high|very common/i.test(rf.severity) && "border-l-destructive",
                /medium|common/i.test(rf.severity) && !/very/i.test(rf.severity) && "border-l-warning",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold">{rf.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{rf.description}</p>
                </div>
                <Badge variant="outline" className="capitalize shrink-0">
                  {rf.severity}
                </Badge>
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-5 shadow-elev-sm">
            <p className="text-sm text-muted-foreground">No red flags documented. Add them in Service Library Admin → Service content.</p>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="faqs" className="mt-0 space-y-3">
        {view.faqs.length ? (
          view.faqs.map((faq) => (
            <Card key={faq.q} className="p-4 shadow-elev-sm">
              <h4 className="font-medium text-sm">{faq.q}</h4>
              <p className="text-sm text-muted-foreground mt-2">{faq.a}</p>
            </Card>
          ))
        ) : (
          <Card className="p-5 text-sm text-muted-foreground">No FAQs yet.</Card>
        )}
      </TabsContent>

      <TabsContent value="compliance" className="mt-0">
        <Card className="p-5 shadow-elev-sm">
          {view.compliance.length ? (
            <ul className="space-y-3 text-sm">
              {view.compliance.map((c, i) => (
                <li key={i} className="flex gap-2 border-b pb-2 last:border-0">
                  <span className="text-muted-foreground">•</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No compliance notes.</p>
          )}
        </Card>
      </TabsContent>

      <TabsContent value="downloads" className="mt-0 space-y-4">
        {view.resources.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Official resources
            </h3>
            {view.resources.map((r) => (
              <Card key={r.url} className="p-4 flex items-center justify-between shadow-elev-sm gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-sm">{r.title}</div>
                  {r.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.description}</p>
                  )}
                </div>
                <Button variant="outline" size="sm" className="shrink-0" asChild>
                  <a href={r.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-4 mr-1" />
                    Open
                  </a>
                </Button>
              </Card>
            ))}
          </div>
        )}
        {view.downloads.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Downloadable files
            </h3>
            {view.downloads.map((d) => (
              <Card key={d.fileId} className="p-4 flex items-center justify-between shadow-elev-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="size-5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{d.name}</div>
                    <div className="text-xs text-muted-foreground">{d.size}</div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!onDownloadFile}
                  onClick={() => onDownloadFile?.(d.fileId, d.name)}
                >
                  <Download className="size-4 mr-1" />
                  Download
                </Button>
              </Card>
            ))}
          </div>
        )}
        {!view.resources.length && !view.downloads.length && (
          <Card className="p-5 text-sm text-muted-foreground space-y-2">
            <p>No resources yet for this service.</p>
            <p className="text-xs">
              Add official links in Admin → Service content (JSON <span className="font-mono">resources</span>
              ), or upload PDFs under Checklist files.
            </p>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="sampledocs" className="mt-0 space-y-4">
        <Card className="p-4 shadow-elev-sm bg-muted/20 border-dashed">
          <p className="text-sm text-muted-foreground">
            Specimen documents for client conversations. Click <strong>View specimen</strong> for mock previews, or
            upload real redacted PDF/JPG files in Admin to replace with client-ready examples.
          </p>
        </Card>
        {view.sampleDocs.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-3">
            {view.sampleDocs.map((doc) => (
              <Card key={doc.title + (doc.filePath ?? doc.url ?? "")} className="p-4 shadow-elev-sm flex flex-col">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {doc.isImage ? (
                    <ImageIcon className="size-5 text-primary shrink-0 mt-0.5" />
                  ) : (
                    <FileText className="size-5 text-primary shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      {doc.docKind && (
                        <Badge variant="secondary" className="text-[10px] capitalize font-normal">
                          {doc.docKind.replace(/_/g, " ")}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] font-normal">
                        Specimen
                      </Badge>
                    </div>
                    <div className="font-medium text-sm leading-snug">{doc.title}</div>
                    {doc.description && (
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{doc.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t">
                  {doc.url ? (
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="size-4 mr-1" />
                        Open
                      </a>
                    </Button>
                  ) : doc.filePath && onOpenSampleDoc ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => onOpenSampleDoc(doc.filePath!, doc.title)}
                    >
                      <Download className="size-4 mr-1" />
                      View file
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setSpecimenDoc(doc)}
                    >
                      <Eye className="size-4 mr-1" />
                      View specimen
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-5 text-sm text-muted-foreground">
            No sample documents yet for this service. Add mock bank statements, LOA samples, or TRF examples here.
          </Card>
        )}
        <SampleDocSpecimenDialog
          doc={specimenDoc}
          open={!!specimenDoc}
          onOpenChange={(o) => !o && setSpecimenDoc(null)}
        />
      </TabsContent>

      <TabsContent value="quiz" className="mt-0">
        <ServiceLibraryQuiz questions={view.quiz} learningMinutes={view.learningMinutes || undefined} />
      </TabsContent>

      <TabsContent value="notes" className="mt-0">
        <Card className="p-5 shadow-elev-sm">
          <StickyNote className="size-5 text-muted-foreground mb-2" />
          <p className="text-sm whitespace-pre-wrap">
            {view.internalNotes.length
              ? view.internalNotes.map((n) => `${n.date} — ${n.author}\n${n.text}`).join("\n\n")
              : "No internal notes for this service."}
          </p>
        </Card>
      </TabsContent>

      <TabsContent value="changelog" className="mt-0">
        <Card className="p-5 shadow-elev-sm">
          {view.changelog.length ? (
            <ul className="space-y-4">
              {view.changelog.map((entry) => (
                <li key={entry.date + entry.version} className="border-b pb-3 last:border-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <History className="size-3.5" />
                    {entry.version} · {entry.date}
                    {entry.author && <span>· {entry.author}</span>}
                  </div>
                  <p className="text-sm mt-1">{entry.summary}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No change log entries.</p>
          )}
        </Card>
      </TabsContent>
    </Tabs>
  );
}
