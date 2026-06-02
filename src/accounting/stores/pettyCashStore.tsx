import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAllEntities } from "./accountingEntitiesStore";
import {
  applyPettyCashDataResetIfNeeded,
  buildPettyBranchesFromEntities,
  loadPettyPeople,
  loadPettyPeopleRemovedKeys,
  patchToBranchConfig,
  personRoleKey,
  resolveBranchIdFromDbRow,
  savePettyBranchConfigs,
  savePettyPeople,
  savePettyPeopleRemovedKeys,
  type PettyBranchConfig,
} from "../lib/pettyCashEntityBranches";
import { approvalLevelFor, isToday, isThisMonth } from "../data/mockPettyCash";
import {
  PettyBranch, PettyCashVoucher, PettyCashReplenishment, PettyCashVerification,
  PettyCategory, ApprovalLevel, PaymentType, ReimbursementMethod, PettyCashStatus, ReplenishmentStatus,
  PettyCategoryOption, PettyPerson, PettyPersonRole,
  PETTY_CATEGORIES,
} from "../types/pettyCash";

export interface NewVoucherInput {
  branchId: string;
  category: PettyCategory;
  amount: number;
  paidTo: string;
  paymentType: PaymentType;
  employeeName?: string;
  reimbursementMethod?: ReimbursementMethod;
  date: string;
  notes?: string;
  receiptFileName?: string;
  emergency?: boolean;
  recurring?: boolean;
  linkedClient?: string;
  linkedCounselor?: string;
}

interface BranchSummary {
  branch: PettyBranch;
  spentToday: number;
  spentMonth: number;
  remaining: number;
  pendingCount: number;
  flaggedCount: number;
  lastUpdated?: string;
}

interface Ctx {
  branches: PettyBranch[];
  vouchers: PettyCashVoucher[];
  replenishments: PettyCashReplenishment[];
  verifications: PettyCashVerification[];
  categories: PettyCategoryOption[];
  people: PettyPerson[];
  addVoucher: (input: NewVoucherInput) => PettyCashVoucher;
  approveVoucher: (id: string, level: ApprovalLevel, by?: string) => void;
  rejectVoucher: (id: string, by?: string, note?: string) => void;
  markReimbursed: (id: string, by?: string) => void;
  submitVerification: (branchId: string, actualCash: number, by: string, note?: string) => PettyCashVerification;
  requestReplenishment: (branchId: string, requestedAmount: number, by: string, note?: string) => PettyCashReplenishment;
  approveReplenishment: (id: string, approvedAmount: number, by: string) => void;
  rejectReplenishment: (id: string, by: string, note?: string) => void;
  markReplenishmentPaid: (id: string) => void;
  addCategory: (label: string) => PettyCategoryOption;
  updateCategory: (value: string, patch: Partial<PettyCategoryOption>) => void;
  addPerson: (input: { name: string; email?: string; role: PettyPersonRole }) => PettyPerson;
  removePerson: (id: string) => boolean;
  /** Branches are defined under Settings → Entities; this updates custodian/float for an entity branch. */
  updateBranch: (entityId: string, patch: Partial<PettyBranch>) => void;
  deleteVoucher: (id: string) => void;
  getBranchSummary: (branchId: string) => BranchSummary;
  getCategoryBreakdown: (filterBranchId?: string) => { category: PettyCategory; amount: number }[];
  getMonthlyTrend: () => { month: string; amount: number }[];
}

const PettyCashContext = createContext<Ctx | null>(null);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string) => UUID_RE.test(v);

function voucherToDb(v: PettyCashVoucher, branchCode: string): any {
  const lastApproved = [...v.approvalTrail].reverse().find(s => s.status === "approved");
  return {
    id: isUuid(v.id) ? v.id : undefined,
    branch: branchCode,
    voucher_number: v.voucherNumber,
    txn_date: v.date,
    txn_type: "EXPENSE",
    category: v.category,
    description: v.notes || v.paidTo,
    amount: v.amount,
    paid_to: v.paidTo,
    approved_by: lastApproved?.by ?? null,
    payment_mode: v.paymentType,
    receipt_url: v.receiptFileName ?? null,
    status: v.status,
    currency: "INR",
  };
}

export function PettyCashProvider({ children }: { children: ReactNode }) {
  const allEntities = useAllEntities();
  const [branchConfigs, setBranchConfigs] = useState<Record<string, PettyBranchConfig>>(() => {
    applyPettyCashDataResetIfNeeded();
    return {};
  });
  const branches = useMemo(
    () => buildPettyBranchesFromEntities(allEntities, branchConfigs),
    [allEntities, branchConfigs],
  );
  const [vouchers, setVouchers] = useState<PettyCashVoucher[]>([]);
  const [replenishments, setReplenishments] = useState<PettyCashReplenishment[]>([]);
  const [verifications, setVerifications] = useState<PettyCashVerification[]>([]);
  const [categories, setCategories] = useState<PettyCategoryOption[]>(PETTY_CATEGORIES);
  const [people, setPeople] = useState<PettyPerson[]>(() => loadPettyPeople());
  const [removedPeopleKeys, setRemovedPeopleKeys] = useState<Set<string>>(() => loadPettyPeopleRemovedKeys());

  useEffect(() => {
    if (branches.length === 0) return;
    setVouchers((prev) => {
      let changed = false;
      const next = prev.map((v) => {
        if (branches.some((b) => b.id === v.branchId)) return v;
        const resolved = resolveBranchIdFromDbRow(v.branchId, branches, allEntities);
        if (resolved && resolved !== v.branchId) {
          changed = true;
          return { ...v, branchId: resolved };
        }
        return v;
      });
      return changed ? next : prev;
    });
  }, [allEntities, branches]);

  useEffect(() => {
    savePettyBranchConfigs(branchConfigs);
  }, [branchConfigs]);

  useEffect(() => {
    savePettyPeople(people);
  }, [people]);

  useEffect(() => {
    savePettyPeopleRemovedKeys(removedPeopleKeys);
  }, [removedPeopleKeys]);

  useEffect(() => {
    const seen = new Set<string>();
    setPeople((prev) => {
      const list = [...prev];
      for (const b of branches) {
        if (b.custodianName) {
          const cKey = personRoleKey("custodian", b.custodianName);
          if (!seen.has(cKey) && !removedPeopleKeys.has(cKey)) {
            seen.add(cKey);
            if (!list.some((p) => p.name === b.custodianName && p.role === "custodian")) {
              list.push({ id: `pp-c-${b.code}`, name: b.custodianName, email: b.custodianEmail, role: "custodian" });
            }
          }
        }
        if (b.secondaryApproverName) {
          const aKey = personRoleKey("approver", b.secondaryApproverName);
          if (!seen.has(aKey) && !removedPeopleKeys.has(aKey)) {
            seen.add(aKey);
            if (!list.some((p) => p.name === b.secondaryApproverName && p.role === "approver")) {
              list.push({ id: `pp-a-${b.code}`, name: b.secondaryApproverName, role: "approver" });
            }
          }
        }
      }
      return list;
    });
  }, [branches, removedPeopleKeys]);

  const patchBranchConfig = useCallback((branchId: string, patch: Partial<PettyBranch>) => {
    const cfgPatch = patchToBranchConfig(patch);
    if (Object.keys(cfgPatch).length === 0) return;
    setBranchConfigs((prev) => {
      const cur = prev[branchId] ?? {
        custodianName: "",
        custodianEmail: "",
        openingFloat: 10_000,
        currentBalance: 10_000,
      };
      return { ...prev, [branchId]: { ...cur, ...cfgPatch } };
    });
  }, []);

  const branchesRef = useRef(branches);
  branchesRef.current = branches;
  const vouchersRef = useRef(vouchers);
  vouchersRef.current = vouchers;
  const findBranchCode = useCallback((branchId: string) => branchesRef.current.find(b => b.id === branchId)?.code ?? branchId, []);

  const entitiesRef = useRef(allEntities);
  entitiesRef.current = allEntities;

  // Load vouchers from Supabase only (no demo seed). Rows with unknown branch codes are skipped.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from("accounting_petty_cash" as any).select("*").order("created_at", { ascending: false });
      if (cancelled || error || !data?.length) {
        if (!cancelled && !error) setVouchers([]);
        return;
      }
      const loaded: PettyCashVoucher[] = [];
      for (const row of data as Record<string, unknown>[]) {
        const branchKey = row.branch ? String(row.branch) : "";
        const resolvedId = resolveBranchIdFromDbRow(
          branchKey,
          branchesRef.current,
          entitiesRef.current,
        );
        if (!resolvedId) continue;
        loaded.push({
          id: String(row.id),
          voucherNumber: String(row.voucher_number ?? ""),
          branchId: resolvedId,
          category: String(row.category ?? "other"),
          amount: Number(row.amount),
          paidTo: String(row.paid_to ?? ""),
          paymentType: (row.payment_mode as PaymentType) ?? "petty_cash",
          date: String(row.txn_date ?? ""),
          notes: row.description ? String(row.description) : undefined,
          receiptFileName: row.receipt_url ? String(row.receipt_url) : undefined,
          missingReceipt: !row.receipt_url,
          status: (row.status as PettyCashStatus) ?? "PENDING",
          requiredLevel: approvalLevelFor(Number(row.amount)),
          approvalTrail: [],
          createdAt: String(row.created_at ?? new Date().toISOString()),
          createdBy: row.approved_by ? String(row.approved_by) : "",
        });
      }
      setVouchers(loaded.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")));
    })();
    return () => { cancelled = true; };
  }, [branches.length, allEntities.length]);

  const syncInsert = useCallback(async (v: PettyCashVoucher) => {
    const payload = voucherToDb(v, findBranchCode(v.branchId));
    const { data, error } = await supabase.from("accounting_petty_cash" as any).insert(payload as any).select().single();
    if (error) { console.error("petty_cash insert failed", error); return; }
    if (data && (data as any).id && (data as any).id !== v.id) {
      const newId = (data as any).id as string;
      setVouchers(prev => prev.map(x => x.id === v.id ? { ...x, id: newId } : x));
    }
  }, [findBranchCode]);

  const syncUpdate = useCallback(async (v: PettyCashVoucher) => {
    if (!isUuid(v.id)) return;
    const payload = voucherToDb(v, findBranchCode(v.branchId));
    delete payload.id;
    const { error } = await supabase.from("accounting_petty_cash" as any).update(payload as any).eq("id", v.id);
    if (error) throw error;
  }, [findBranchCode]);

  const syncDelete = useCallback(async (id: string) => {
    if (!isUuid(id)) return;
    const { error } = await supabase.from("accounting_petty_cash" as any).delete().eq("id", id);
    if (error) throw error;
  }, []);

  const addVoucher = useCallback((input: NewVoucherInput) => {
    const branch = branches.find(b => b.id === input.branchId);
    if (!branch) throw new Error("Branch not found");
    const required = approvalLevelFor(input.amount);
    const id = `pv-new-${Date.now()}`;
    const voucherNumber = `PV-${branch.code}-${String(vouchers.length + 1).padStart(4, "0")}`;
    const now = new Date().toISOString();
    const trail: PettyCashVoucher["approvalTrail"] = [
      { level: "auto", status: "approved", by: branch.custodianName, at: now, note: required === "auto" ? "Auto-approved (under ₹500)" : "Voucher created" },
    ];
    if (required !== "auto") {
      trail.push({ level: required, status: "pending" });
    }
    const status: PettyCashStatus = required === "auto" ? "APPROVED" : "PENDING";
    const flags: PettyCashVoucher["flags"] = [];
    if (input.amount % 500 === 0 && input.amount >= 500) flags.push("round_number");
    if (input.category === "other" && input.amount >= 1000) flags.push("excess_other");
    const voucher: PettyCashVoucher = {
      id, voucherNumber, branchId: input.branchId, category: input.category,
      amount: input.amount, paidTo: input.paidTo, paymentType: input.paymentType,
      employeeName: input.employeeName, reimbursementMethod: input.reimbursementMethod,
      date: input.date, notes: input.notes, receiptFileName: input.receiptFileName,
      missingReceipt: !input.receiptFileName, emergency: input.emergency,
      recurring: input.recurring, linkedClient: input.linkedClient, linkedCounselor: input.linkedCounselor,
      status, requiredLevel: required, approvalTrail: trail,
      flags: flags.length ? flags : undefined,
      createdAt: now, createdBy: branch.custodianName,
    };
    setVouchers(prev => [voucher, ...prev]);
    if (status === "APPROVED" && input.paymentType === "petty_cash") {
      patchBranchConfig(branch.id, { currentBalance: branch.currentBalance - input.amount });
    }
    void syncInsert(voucher);
    return voucher;
  }, [branches, vouchers.length, syncInsert]);

  const approveVoucher = useCallback((id: string, _level: ApprovalLevel, by = "Current user") => {
    const prevVouchers = vouchersRef.current;
    const prevConfigs = { ...branchConfigs };
    const target = prevVouchers.find((v) => v.id === id);
    if (!target) return;
    const branch = branchesRef.current.find((b) => b.id === target.branchId);
    const trail = target.approvalTrail.map((s) =>
      s.status === "pending" ? { ...s, status: "approved" as const, by, at: new Date().toISOString() } : s,
    );
    const next = { ...target, status: "APPROVED" as PettyCashStatus, approvalTrail: trail };
    setVouchers((prev) => prev.map((v) => (v.id === id ? next : v)));
    if (target.status !== "APPROVED" && target.paymentType === "petty_cash" && branch) {
      patchBranchConfig(branch.id, { currentBalance: branch.currentBalance - target.amount });
    }
    void (async () => {
      try {
        await syncUpdate(next);
      } catch (e) {
        console.error("petty_cash update failed", e);
        setVouchers(prevVouchers);
        setBranchConfigs(prevConfigs);
        toast.error("Failed to approve voucher. Changes were reverted.");
      }
    })();
  }, [syncUpdate, patchBranchConfig, branchConfigs]);

  const rejectVoucher = useCallback((id: string, by = "Current user", note?: string) => {
    const prevVouchers = vouchersRef.current;
    const target = prevVouchers.find((v) => v.id === id);
    if (!target) return;
    const trail = target.approvalTrail.map((s) =>
      s.status === "pending" ? { ...s, status: "rejected" as const, by, at: new Date().toISOString(), note } : s,
    );
    const next = { ...target, status: "REJECTED" as const, approvalTrail: trail };
    setVouchers((prev) => prev.map((v) => (v.id === id ? next : v)));
    void (async () => {
      try {
        await syncUpdate(next);
      } catch (e) {
        console.error("petty_cash update failed", e);
        setVouchers(prevVouchers);
        toast.error("Failed to reject voucher. Changes were reverted.");
      }
    })();
  }, [syncUpdate]);

  const markReimbursed = useCallback((id: string, by = "Finance") => {
    const prevVouchers = vouchersRef.current;
    const prevConfigs = { ...branchConfigs };
    const target = prevVouchers.find((v) => v.id === id);
    if (!target) return;
    const branch = branchesRef.current.find((b) => b.id === target.branchId);
    const trail = [
      ...target.approvalTrail,
      { level: "finance" as const, status: "approved" as const, by, at: new Date().toISOString(), note: "Reimbursement paid" },
    ];
    const next = { ...target, status: "REIMBURSED" as const, approvalTrail: trail };
    setVouchers((prev) => prev.map((v) => (v.id === id ? next : v)));
    if (target.reimbursementMethod === "cash" && branch) {
      patchBranchConfig(branch.id, { currentBalance: branch.currentBalance - target.amount });
    }
    void (async () => {
      try {
        await syncUpdate(next);
      } catch (e) {
        console.error("petty_cash update failed", e);
        setVouchers(prevVouchers);
        setBranchConfigs(prevConfigs);
        toast.error("Failed to mark reimbursed. Changes were reverted.");
      }
    })();
  }, [syncUpdate, patchBranchConfig, branchConfigs]);

  const submitVerification = useCallback((branchId: string, actualCash: number, by: string, note?: string) => {
    const branch = branches.find(b => b.id === branchId);
    if (!branch) throw new Error("Branch not found");
    const expected = branch.currentBalance;
    const delta = actualCash - expected;
    const verification: PettyCashVerification = {
      id: `vf-${Date.now()}`, branchId, date: new Date().toISOString().slice(0, 10),
      expectedCash: expected, actualCash, delta, by, note,
    };
    setVerifications(prev => [verification, ...prev]);
    patchBranchConfig(branchId, { lastVerifiedAt: new Date().toISOString(), lastVerifiedDelta: delta });
    return verification;
  }, [branches, patchBranchConfig]);

  const requestReplenishment = useCallback((branchId: string, requestedAmount: number, by: string, note?: string) => {
    const branch = branches.find(b => b.id === branchId);
    if (!branch) throw new Error("Branch not found");
    const r: PettyCashReplenishment = {
      id: `rp-${Date.now()}`, branchId, currentBalance: branch.currentBalance,
      requestedAmount, status: "REQUESTED", requestedBy: by, requestedAt: new Date().toISOString(), note,
    };
    setReplenishments(prev => [r, ...prev]);
    return r;
  }, [branches]);

  const approveReplenishment = useCallback((id: string, approvedAmount: number, by: string) => {
    setReplenishments(prev => prev.map(r => r.id === id ? { ...r, status: "APPROVED" as const, approvedAmount, approvedBy: by, approvedAt: new Date().toISOString() } : r));
  }, []);
  const rejectReplenishment = useCallback((id: string, by: string, note?: string) => {
    setReplenishments(prev => prev.map(r => r.id === id ? { ...r, status: "REJECTED" as const, approvedBy: by, approvedAt: new Date().toISOString(), note } : r));
  }, []);
  const markReplenishmentPaid = useCallback((id: string) => {
    setReplenishments(prev => prev.map(r => {
      if (r.id !== id) return r;
      const amount = r.approvedAmount ?? r.requestedAmount;
      const branch = branchesRef.current.find((b) => b.id === r.branchId);
      if (branch) {
        patchBranchConfig(branch.id, { currentBalance: branch.currentBalance + amount });
      }
      return { ...r, status: "PAID" as const, paidAt: new Date().toISOString() };
    }));
  }, [patchBranchConfig]);

  const addCategory = useCallback((label: string): PettyCategoryOption => {
    const value = label.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    const safeValue = value || `cat_${Date.now()}`;
    const opt: PettyCategoryOption = { value: safeValue, label: label.trim() };
    setCategories(prev => prev.some(c => c.value === safeValue) ? prev : [...prev, opt]);
    return opt;
  }, []);

  const updateCategory = useCallback((value: string, patch: Partial<PettyCategoryOption>) => {
    setCategories(prev => prev.map(c => c.value === value ? { ...c, ...patch } : c));
  }, []);

  const addPerson = useCallback((input: { name: string; email?: string; role: PettyPersonRole }): PettyPerson => {
    const name = input.name.trim();
    const person: PettyPerson = {
      id: `pp-${input.role[0]}-${Date.now()}`,
      name,
      email: input.email?.trim() || undefined,
      role: input.role,
    };
    setRemovedPeopleKeys((prev) => {
      const next = new Set(prev);
      next.delete(personRoleKey(input.role, name));
      return next;
    });
    setPeople((prev) => {
      const dup = prev.find((p) => p.role === input.role && p.name === name);
      if (dup) return prev.map((p) => (p.id === dup.id ? { ...p, email: person.email ?? p.email } : p));
      return [...prev, person];
    });
    return person;
  }, []);

  const removePerson = useCallback((id: string): boolean => {
    const person = people.find((p) => p.id === id);
    if (!person) return false;
    if (person.role === "custodian" && branches.some((b) => b.custodianName === person.name)) {
      toast.error(`${person.name} is still assigned as custodian on a branch. Change it under Branch custodian & approver first.`);
      return false;
    }
    if (person.role === "approver" && branches.some((b) => b.secondaryApproverName === person.name)) {
      toast.error(`${person.name} is still assigned as approver on a branch. Change it under Branch custodian & approver first.`);
      return false;
    }
    setRemovedPeopleKeys((prev) => new Set(prev).add(personRoleKey(person.role, person.name)));
    setPeople((prev) => prev.filter((p) => p.id !== id));
    return true;
  }, [people, branches]);

  const updateBranch = useCallback((id: string, patch: Partial<PettyBranch>) => {
    if (!allEntities.some((e) => e.id === id)) {
      toast.error("Unknown branch. Add it under Settings → Entities first.");
      return;
    }
    patchBranchConfig(id, patch);
  }, [allEntities, patchBranchConfig]);

  const deleteVoucher = useCallback((id: string) => {
    const prevVouchers = vouchersRef.current;
    setVouchers(prev => prev.filter(v => v.id !== id));
    void (async () => {
      try {
        await syncDelete(id);
      } catch (e) {
        console.error("petty_cash delete failed", e);
        setVouchers(prevVouchers);
        toast.error("Failed to delete voucher. Changes were reverted.");
      }
    })();
  }, [syncDelete]);

  const getBranchSummary = useCallback((branchId: string): BranchSummary => {
    const branch = branches.find(b => b.id === branchId);
    if (!branch) {
      return {
        branch: {
          id: branchId,
          name: "Branch not found",
          code: branchId,
          custodianName: "—",
          custodianEmail: "",
          openingFloat: 0,
          currentBalance: 0,
        },
        spentToday: 0,
        spentMonth: 0,
        remaining: 0,
        pendingCount: 0,
        flaggedCount: 0,
      };
    }
    const branchVouchers = vouchers.filter(v => v.branchId === branchId);
    const counted = branchVouchers.filter(v => v.status === "APPROVED" || v.status === "REIMBURSED");
    const spentToday = counted.filter(v => isToday(v.date)).reduce((s, v) => s + v.amount, 0);
    const spentMonth = counted.filter(v => isThisMonth(v.date)).reduce((s, v) => s + v.amount, 0);
    const pendingCount = branchVouchers.filter(v => v.status === "PENDING").length;
    const flaggedCount = branchVouchers.filter(v => (v.flags?.length ?? 0) > 0 || v.missingReceipt).length;
    const lastUpdated = branchVouchers[0]?.createdAt;
    return { branch, spentToday, spentMonth, remaining: branch.currentBalance, pendingCount, flaggedCount, lastUpdated };
  }, [branches, vouchers]);

  const getCategoryBreakdown = useCallback((filterBranchId?: string) => {
    const map = new Map<PettyCategory, number>();
    vouchers.forEach(v => {
      if (filterBranchId && v.branchId !== filterBranchId) return;
      if (v.status !== "APPROVED" && v.status !== "REIMBURSED") return;
      map.set(v.category, (map.get(v.category) ?? 0) + v.amount);
    });
    return Array.from(map.entries()).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
  }, [vouchers]);

  const getMonthlyTrend = useCallback(() => {
    const map = new Map<string, number>();
    vouchers.forEach(v => {
      if (v.status !== "APPROVED" && v.status !== "REIMBURSED") return;
      const d = new Date(v.date);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(k, (map.get(k) ?? 0) + v.amount);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([month, amount]) => ({ month, amount }));
  }, [vouchers]);

  const value = useMemo<Ctx>(() => ({
    branches, vouchers, replenishments, verifications, categories, people,
    addVoucher, approveVoucher, rejectVoucher, markReimbursed,
    submitVerification, requestReplenishment, approveReplenishment,
    rejectReplenishment, markReplenishmentPaid,
    addCategory, updateCategory, addPerson, removePerson, updateBranch,
    deleteVoucher,
    getBranchSummary, getCategoryBreakdown, getMonthlyTrend,
  }), [branches, vouchers, replenishments, verifications, categories, people, addVoucher, approveVoucher, rejectVoucher, markReimbursed, submitVerification, requestReplenishment, approveReplenishment, rejectReplenishment, markReplenishmentPaid, addCategory, updateCategory, addPerson, removePerson, updateBranch, deleteVoucher, getBranchSummary, getCategoryBreakdown, getMonthlyTrend]);

  return <PettyCashContext.Provider value={value}>{children}</PettyCashContext.Provider>;
}

export function usePettyCash(): Ctx {
  const ctx = useContext(PettyCashContext);
  if (!ctx) throw new Error("usePettyCash must be used within PettyCashProvider");
  return ctx;
}

// Re-export helper
export { approvalLevelFor };