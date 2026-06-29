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
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AcademyViewModel } from "@/lib/service-library/buildAcademyViewModel";
import { copyToClipboard } from "@/lib/serviceLibrary";
import { toast } from "sonner";
import { ServiceLibraryQuiz } from "@/components/service-library/design/ServiceLibraryQuiz";
import { SampleDocSpecimenDialog } from "@/components/service-library/design/SampleDocSpecimenDialog";
import { ServiceBinderTab } from "@/components/service-library/ServiceBinderTab";
import { ServiceDocumentStructureTab } from "@/components/service-library/ServiceDocumentStructureTab";
import { ServiceEligibilityPanel } from "@/components/service-library/ServiceEligibilityPanel";
import { ServiceFeeBreakdownPanel } from "@/components/service-library/design/ServiceFeeBreakdownPanel";
import { ServiceCountryInsightsPanel } from "@/components/service-library/design/ServiceCountryInsightsPanel";
import { ServiceMbbsInstitutionPanel } from "@/components/service-library/design/ServiceMbbsInstitutionPanel";
import { ServiceMbbsProgramsPanel } from "@/components/service-library/design/ServiceMbbsProgramsPanel";
import { ServiceMbbsPracticePanel } from "@/components/service-library/design/ServiceMbbsPracticePanel";
import { ServiceMbbsFamilyPanel } from "@/components/service-library/design/ServiceMbbsFamilyPanel";
import { ServiceMbbsEligibilityPanel } from "@/components/service-library/design/ServiceMbbsEligibilityPanel";
import { ServiceFullCostBreakdownCard } from "@/components/service-library/design/ServiceFullCostBreakdownCard";
import { ServiceKcGuidePanel } from "@/components/service-library/design/ServiceKcGuidePanel";
import {
  resolveAcademyTabs,
  tabLabel,
  type AcademyTabId,
} from "@/lib/service-library/academyTabs";

type Props = {
  view: AcademyViewModel;
  libraryId?: string;
  country?: string | null;
  canManage?: boolean;
  activeTab?: AcademyTabId;
  onTabChange?: (tab: AcademyTabId) => void;
  onToggleChecklistItem?: (id: string) => void;
  onPushChecklist?: () => void;
  onDownloadFile?: (fileId: string, fileName: string) => void;
  onOpenVisaForm?: (formId: string, title: string) => void;
  onOpenSampleDoc?: (filePath: string, fileName: string) => void;
  onStartEligibility?: () => void;
};

export function ServiceLibraryTabs({
  view,
  libraryId,
  country,
  canManage,
  activeTab: controlledTab,
  onTabChange,
  onToggleChecklistItem,
  onPushChecklist,
  onDownloadFile,
  onOpenVisaForm,
  onOpenSampleDoc,
  onStartEligibility,
}: Props) {
  const [internalTab, setInternalTab] = useState<AcademyTabId>("overview");
  const [specimenDoc, setSpecimenDoc] = useState<(typeof view.sampleDocs)[number] | null>(null);
  const tabIds = resolveAcademyTabs(view);
  const requestedTab = controlledTab ?? internalTab;
  const activeTab = tabIds.includes(requestedTab) ? requestedTab : (tabIds[0] ?? "overview");
  const setTab = (t: AcademyTabId) => {
    const next = tabIds.includes(t) ? t : activeTab;
    setInternalTab(next);
    onTabChange?.(next);
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
    <Tabs value={activeTab} onValueChange={(v) => setTab(v as AcademyTabId)} className="w-full">
      <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-muted/40 p-1 mb-4">
        {tabIds.map((id) => (
          <TabsTrigger key={id} value={id} className="text-xs sm:text-sm data-[state=active]:bg-card">
            {tabLabel(id, view)}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="overview" className="space-y-4 mt-0">
        {view.isMbbs && (
          <Card
            className="p-4 shadow-elev-sm border-primary/20 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors"
            onClick={() => setTab("eligibility")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setTab("eligibility")}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ClipboardCheck className="size-4 text-primary shrink-0" />
                Eligibility check — review criteria before quoting fees
              </div>
              <span className="text-xs text-primary shrink-0">Open →</span>
            </div>
          </Card>
        )}
        <Card className="p-5 shadow-elev-sm">
          <h3 className="font-semibold mb-4">About this service</h3>
          {view.about.length ? (
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
              {view.about.map((row) => (
                <div key={row.label} className={row.label === "Description" ? "md:col-span-2" : ""}>
                  <dt className="text-muted-foreground font-medium mb-0.5">{row.label}</dt>
                  <dd className="flex items-start gap-1.5">
                    {row.warning && <AlertTriangle className="size-4 text-warning shrink-0" />}
                    <span className="flex-1">
                      {row.value}
                      {row.link && (
                        <a
                          href={row.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs text-primary hover:underline mt-1"
                        >
                          Official source →
                        </a>
                      )}
                    </span>
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
            <h3 className="font-semibold mb-4">
              {view.isCoaching ? "Program outcomes" : "Approval performance"}
            </h3>
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

      <TabsContent value="guide" className="mt-0">
        {libraryId ? (
          <ServiceKcGuidePanel libraryId={libraryId} />
        ) : (
          <Card className="p-5 shadow-elev-sm">
            <p className="text-sm text-muted-foreground">Select a service to view its Knowledge Centre guide.</p>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="fees" className="mt-0 space-y-4">
        {view.feeBreakdown?.govt || view.feeBreakdown?.consultancy ? (
          <ServiceFeeBreakdownPanel breakdown={view.feeBreakdown} isMbbs={view.isMbbs} />
        ) : view.isMbbs ? null : (
          <Card className="p-5 shadow-elev-sm">
            <p className="text-sm text-muted-foreground">
              Fee breakdown not yet available for this service. Check Government fee KPI or official authority website.
            </p>
          </Card>
        )}
        {view.fullCostBreakdown?.sections?.length ? (
          <ServiceFullCostBreakdownCard
            breakdown={view.fullCostBreakdown}
            emphasizeTuition={view.isMbbs}
          />
        ) : view.isMbbs ? (
          <Card className="p-5 shadow-elev-sm">
            <p className="text-sm text-muted-foreground">
              Program cost breakdown not available for this institution yet.
            </p>
          </Card>
        ) : null}
      </TabsContent>

      <TabsContent value="institution" className="mt-0">
        {view.mbbsMeta ? (
          <ServiceMbbsInstitutionPanel meta={view.mbbsMeta} />
        ) : (
          <Card className="p-5 shadow-elev-sm">
            <p className="text-sm text-muted-foreground">Institution profile not configured yet.</p>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="programs" className="mt-0">
        {view.mbbsMeta?.relatedPrograms?.length ? (
          <ServiceMbbsProgramsPanel
            programs={view.mbbsMeta.relatedPrograms}
            institutionName={view.mbbsMeta.institutionName}
          />
        ) : (
          <Card className="p-5 shadow-elev-sm">
            <p className="text-sm text-muted-foreground">No related programs listed yet.</p>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="countryinsights" className="mt-0">
        <div className="space-y-4">
          {view.countryInsights ? (
            <ServiceCountryInsightsPanel insights={view.countryInsights} />
          ) : (
            <Card className="p-5 shadow-elev-sm">
              <p className="text-sm text-muted-foreground">
                Country facts, living costs, and work rights are not configured for this service yet.
              </p>
            </Card>
          )}
          {view.mbbsMeta?.familyOptions && (
            <ServiceMbbsFamilyPanel family={view.mbbsMeta.familyOptions} />
          )}
        </div>
      </TabsContent>

      <TabsContent value="practice" className="mt-0">
        {view.mbbsMeta?.practicePathways ? (
          <ServiceMbbsPracticePanel
            pathways={view.mbbsMeta.practicePathways}
            institutionName={view.mbbsMeta.institutionName}
          />
        ) : (
          <Card className="p-5 shadow-elev-sm">
            <p className="text-sm text-muted-foreground">Practice pathways not configured yet.</p>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="eligibility" className="mt-0">
        {view.isMbbs ? (
          <ServiceMbbsEligibilityPanel view={view} onOpenFees={() => setTab("fees")} />
        ) : !view.isCoaching && libraryId && onStartEligibility ? (
          <ServiceEligibilityPanel
            view={view}
            libraryId={libraryId}
            country={view.country}
            onStartAssessment={onStartEligibility}
          />
        ) : (
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
              <p className="text-sm text-muted-foreground">
                {view.isCoaching ? "No criteria listed yet." : "No eligibility criteria yet."}
              </p>
            )}
          </Card>
        )}
      </TabsContent>

      <TabsContent value="acceptance" className="mt-0 space-y-4">
        <Card className="p-4 shadow-elev-sm bg-muted/20 border-dashed">
          <p className="text-sm text-muted-foreground">
            Countries and visa pathways that accept IELTS — verify minimum scores on official immigration and
            university sites before quoting clients.
          </p>
        </Card>
        {view.compare?.rows?.length ? (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="text-left p-3 font-medium">
                    {(view.compare.columns ?? [])[0] ?? "Pathway"}
                  </th>
                  {((view.compare.columns ?? []).length > 1
                    ? (view.compare.columns ?? []).slice(1)
                    : ["Module", "Minimum", "Notes"]
                  ).map((col) => (
                    <th key={col} className="text-left p-3 font-medium">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {view.compare.rows.map((row) => (
                  <tr key={row.label} className="border-b last:border-0">
                    <td className="p-3 font-medium align-top">{row.label}</td>
                    {(row.values ?? []).map((v, i) => (
                      <td key={i} className="p-3 text-muted-foreground align-top">
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Card className="p-5 text-sm text-muted-foreground">
            No acceptance matrix yet. Add a <span className="font-mono">compare</span> block in Service content JSON.
          </Card>
        )}
      </TabsContent>

      <TabsContent value="testday" className="mt-0 space-y-4">
        {view.testDayGuide ? (
          <>
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-5 shadow-elev-sm">
                <h3 className="font-semibold mb-3 text-success">Do&apos;s on test day</h3>
                <ul className="space-y-2 text-sm">
                  {view.testDayGuide.dos.map((line, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-success shrink-0">✓</span>
                      {line}
                    </li>
                  ))}
                </ul>
              </Card>
              <Card className="p-5 shadow-elev-sm">
                <h3 className="font-semibold mb-3 text-warning">Don&apos;ts on test day</h3>
                <ul className="space-y-2 text-sm">
                  {view.testDayGuide.donts.map((line, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-warning shrink-0">✗</span>
                      {line}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
            {view.testDayGuide.checklist.length > 0 && (
              <Card className="p-5 shadow-elev-sm">
                <h3 className="font-semibold mb-3">Test day checklist</h3>
                <ul className="space-y-2 text-sm">
                  {view.testDayGuide.checklist.map((line, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-muted-foreground">□</span>
                      {line}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </>
        ) : (
          <Card className="p-5 text-sm text-muted-foreground">
            Add <span className="font-mono">testDayGuide</span> in Service content JSON for exam-day briefing.
          </Card>
        )}
      </TabsContent>

      <TabsContent value="checklist" className="space-y-4 mt-0">
        {view.isMbbs && view.mbbsMeta?.documentChecklistSections?.length ? (
          <Card className="p-5 shadow-elev-sm border-rose-500/10">
            <h3 className="font-semibold mb-4">Document checklist (admission & visa)</h3>
            <div className="space-y-5">
              {view.mbbsMeta.documentChecklistSections.map((section) => (
                <div key={section.id}>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {section.label}
                  </h4>
                  <ul className="space-y-1.5 text-sm">
                    {section.items.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="text-rose-500 shrink-0">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>
        ) : null}
        {(view.isCoaching || view.isMbbs) && view.downloads.length > 0 && (
          <Card className="p-5 shadow-elev-sm">
            <h3 className="font-semibold mb-3">Downloadable checklists</h3>
            <div className="space-y-2">
              {view.downloads.map((d) => (
                <div
                  key={d.fileId}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{d.name}</div>
                    <div className="text-xs text-muted-foreground">{d.size}</div>
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
                </div>
              ))}
            </div>
          </Card>
        )}
        <Card className="p-5 shadow-elev-sm">
          <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
            <div>
              <h3 className="font-semibold">
                {view.isCoaching ? "Enrollment & delivery tracker" : "Submission checklist"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {total > 0 ? `${doneCount} of ${total} complete` : view.isCoaching ? "Use downloadable checklists above" : "No checklist items yet"}
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

      {libraryId && (
        <TabsContent value="binder" className="mt-0 space-y-4">
          <ServiceBinderTab libraryId={libraryId} country={view.country} />
        </TabsContent>
      )}

      <TabsContent value="visaforms" className="mt-0 space-y-4">
        <Card className="p-4 shadow-elev-sm bg-muted/20 border-dashed">
          <p className="text-sm text-muted-foreground">
            {view.isMbbs
              ? "Official university application portals and immigration forms for admission, Saba basic-science years, and US clinical rotations. Always verify the current version before client use."
              : "Official government application forms and online portals for this service. Always verify the current form version on the issuing authority website before client use."}
          </p>
        </Card>
        {view.visaForms.length > 0 ? (
          <div className="space-y-2">
            {view.visaForms.map((form) => (
              <Card key={form.id} className="p-4 flex items-center justify-between shadow-elev-sm gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    {form.code && (
                      <Badge variant="secondary" className="text-[10px] font-mono font-normal">
                        {form.code}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {form.isOnline ? "Online" : "PDF"}
                    </Badge>
                  </div>
                  <div className="font-medium text-sm">{form.title}</div>
                  {form.notes && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{form.notes}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => onOpenVisaForm?.(form.id, form.title)}
                  disabled={!onOpenVisaForm}
                >
                  {form.isOnline ? (
                    <>
                      <ExternalLink className="size-4 mr-1" />
                      Open
                    </>
                  ) : (
                    <>
                      <Download className="size-4 mr-1" />
                      Open PDF
                    </>
                  )}
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-5 text-sm text-muted-foreground">
            {view.isMbbs
              ? "No application forms linked yet. Add them in Service Library Admin → Application forms tab."
              : "No official forms linked yet. Add them in Service Library Admin → Visa forms tab."}
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

      <TabsContent value="dos" className="mt-0 space-y-4">
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
        {view.isCoaching && view.compliance.length > 0 && (
          <Card className="p-5 shadow-elev-sm">
            <h3 className="font-semibold mb-3">Compliance</h3>
            <ul className="space-y-2 text-sm">
              {view.compliance.map((c, i) => (
                <li key={i} className="flex gap-2 border-b pb-2 last:border-0">
                  <span className="text-muted-foreground">•</span>
                  {c}
                </li>
              ))}
            </ul>
          </Card>
        )}
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
              {view.isCoaching ? "Official & reference links" : "Official resources"}
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
        {view.downloads.length > 0 && !view.isCoaching && (
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
            {view.isCoaching
              ? "Module specimens and practice materials for counselors and classroom use. Open links in a new tab or view built-in specimens."
              : "Specimen documents for client conversations. Click View specimen for mock previews, or upload real redacted PDF/JPG files in Admin."}
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

      <TabsContent value="documentstructure" className="mt-0">
        <ServiceDocumentStructureTab
          structure={view.documentStructure}
          libraryId={libraryId}
          country={country ?? view.country}
          canManage={canManage}
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
