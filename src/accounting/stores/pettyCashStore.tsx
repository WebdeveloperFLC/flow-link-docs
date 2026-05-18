import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  PETTY_BRANCHES, PETTY_VOUCHERS, PETTY_REPLENISHMENTS, PETTY_VERIFICATIONS,
  approvalLevelFor, isToday, isThisMonth,
} from "../data/mockPettyCash";
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
  addBranch: (input: { name: string; code: string; custodianName: string; secondaryApproverName?: string; openingFloat: number; custodianEmail?: string }) => PettyBranch;
  updateBranch: (id: string, patch: Partial<PettyBranch>) => void;
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
  const [branches, setBranches] = useState<PettyBranch[]>(PETTY_BRANCHES);
  const [vouchers, setVouchers] = useState<PettyCashVoucher[]>(PETTY_VOUCHERS);
  const [replenishments, setReplenishments] = useState<PettyCashReplenishment[]>(PETTY_REPLENISHMENTS);
  const [verifications, setVerifications] = useState<PettyCashVerification[]>(PETTY_VERIFICATIONS);
  const [categories, setCategories] = useState<PettyCategoryOption[]>(PETTY_CATEGORIES);
  const [people, setPeople] = useState<PettyPerson[]>(() => {
    const seen = new Set<string>();
    const list: PettyPerson[] = [];
    PETTY_BRANCHES.forEach(b => {
      const cKey = `custodian:${b.custodianName}`;
      if (!seen.has(cKey)) {
        seen.add(cKey);
        list.push({ id: `pp-c-${b.code}`, name: b.custodianName, email: b.custodianEmail, role: "custodian" });
      }
      if (b.secondaryApproverName) {
        const aKey = `approver:${b.secondaryApproverName}`;
        if (!seen.has(aKey)) {
          seen.add(aKey);
          list.push({ id: `pp-a-${b.code}`, name: b.secondaryApproverName, role: "approver" });
        }
      }
    });
    list.push({ id: "pp-fin-1", name: "Finance — Ritu Khanna", email: "ritu.khanna@futurelink.in", role: "approver" });
    ["Pooja Sharma", "Arjun Mehta", "Sneha Iyer", "Rohit Bansal", "Kavita Joshi", "Aman Gupta", "Rashmi Nair"].forEach((n, i) => {
      list.push({ id: `pp-e-${i + 1}`, name: n, role: "employee" });
    });
    return list;
  });

  const branchesRef = useRef(branches);
  branchesRef.current = branches;
  const findBranchCode = useCallback((branchId: string) => branchesRef.current.find(b => b.id === branchId)?.code ?? branchId, []);

  // Hydrate from Supabase on mount (merge: DB rows override matching local ids).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from("accounting_petty_cash" as any).select("*").order("created_at", { ascending: false });
      if (cancelled || error || !data) return;
      setVouchers(prev => {
        const map = new Map(prev.map(v => [v.id, v]));
        (data as any[]).forEach((row) => {
          const branch = branchesRef.current.find(b => b.code === row.branch);
          const existing = map.get(row.id);
          const merged: PettyCashVoucher = {
            id: row.id,
            voucherNumber: row.voucher_number ?? existing?.voucherNumber ?? "",
            branchId: branch?.id ?? existing?.branchId ?? row.branch,
            category: row.category ?? existing?.category ?? "other",
            amount: Number(row.amount),
            paidTo: row.paid_to ?? existing?.paidTo ?? "",
            paymentType: (row.payment_mode as PaymentType) ?? existing?.paymentType ?? "petty_cash",
            date: row.txn_date,
            notes: row.description ?? existing?.notes,
            receiptFileName: row.receipt_url ?? existing?.receiptFileName,
            missingReceipt: existing?.missingReceipt ?? !row.receipt_url,
            status: (row.status as PettyCashStatus) ?? "PENDING",
            requiredLevel: existing?.requiredLevel ?? approvalLevelFor(Number(row.amount)),
            approvalTrail: existing?.approvalTrail ?? [],
            createdAt: row.created_at ?? new Date().toISOString(),
            createdBy: existing?.createdBy ?? row.approved_by ?? "",
            employeeName: existing?.employeeName,
            reimbursementMethod: existing?.reimbursementMethod,
            emergency: existing?.emergency,
            recurring: existing?.recurring,
            linkedClient: existing?.linkedClient,
            linkedCounselor: existing?.linkedCounselor,
            flags: existing?.flags,
          };
          map.set(row.id, merged);
        });
        return Array.from(map.values()).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      });
    })();
    return () => { cancelled = true; };
  }, []);

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
    if (error) console.error("petty_cash update failed", error);
  }, [findBranchCode]);

  const syncDelete = useCallback(async (id: string) => {
    if (!isUuid(id)) return;
    const { error } = await supabase.from("accounting_petty_cash" as any).delete().eq("id", id);
    if (error) console.error("petty_cash delete failed", error);
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
      setBranches(prev => prev.map(b => b.id === branch.id ? { ...b, currentBalance: b.currentBalance - input.amount } : b));
    }
    return voucher;
  }, [branches, vouchers.length]);

  const approveVoucher = useCallback((id: string, _level: ApprovalLevel, by = "Current user") => {
    setVouchers(prev => prev.map(v => {
      if (v.id !== id) return v;
      const trail = v.approvalTrail.map(s => s.status === "pending" ? { ...s, status: "approved" as const, by, at: new Date().toISOString() } : s);
      const newStatus: PettyCashStatus = "APPROVED";
      // Deduct from balance now if petty_cash and wasn't already approved
      if (v.status !== "APPROVED" && v.paymentType === "petty_cash") {
        setBranches(prev2 => prev2.map(b => b.id === v.branchId ? { ...b, currentBalance: b.currentBalance - v.amount } : b));
      }
      return { ...v, status: newStatus, approvalTrail: trail };
    }));
  }, []);

  const rejectVoucher = useCallback((id: string, by = "Current user", note?: string) => {
    setVouchers(prev => prev.map(v => {
      if (v.id !== id) return v;
      const trail = v.approvalTrail.map(s => s.status === "pending" ? { ...s, status: "rejected" as const, by, at: new Date().toISOString(), note } : s);
      return { ...v, status: "REJECTED" as const, approvalTrail: trail };
    }));
  }, []);

  const markReimbursed = useCallback((id: string, by = "Finance — Ritu Khanna") => {
    setVouchers(prev => prev.map(v => {
      if (v.id !== id) return v;
      const trail = [...v.approvalTrail, { level: "finance" as const, status: "approved" as const, by, at: new Date().toISOString(), note: "Reimbursement paid" }];
      // If paid via cash, deduct from petty cash now
      if (v.reimbursementMethod === "cash") {
        setBranches(prev2 => prev2.map(b => b.id === v.branchId ? { ...b, currentBalance: b.currentBalance - v.amount } : b));
      }
      return { ...v, status: "REIMBURSED" as const, approvalTrail: trail };
    }));
  }, []);

  const submitVerification = useCallback((branchId: string, actualCash: number, by: string, note?: string) => {
    const branch = branches.find(b => b.id === branchId)!;
    const expected = branch.currentBalance;
    const delta = actualCash - expected;
    const verification: PettyCashVerification = {
      id: `vf-${Date.now()}`, branchId, date: new Date().toISOString().slice(0, 10),
      expectedCash: expected, actualCash, delta, by, note,
    };
    setVerifications(prev => [verification, ...prev]);
    setBranches(prev => prev.map(b => b.id === branchId ? { ...b, lastVerifiedAt: new Date().toISOString(), lastVerifiedDelta: delta } : b));
    return verification;
  }, [branches]);

  const requestReplenishment = useCallback((branchId: string, requestedAmount: number, by: string, note?: string) => {
    const branch = branches.find(b => b.id === branchId)!;
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
      setBranches(prev2 => prev2.map(b => b.id === r.branchId ? { ...b, currentBalance: b.currentBalance + amount } : b));
      return { ...r, status: "PAID" as const, paidAt: new Date().toISOString() };
    }));
  }, []);

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
    const person: PettyPerson = {
      id: `pp-${input.role[0]}-${Date.now()}`,
      name: input.name.trim(),
      email: input.email?.trim() || undefined,
      role: input.role,
    };
    setPeople(prev => [...prev, person]);
    return person;
  }, []);

  const addBranch = useCallback((input: { name: string; code: string; custodianName: string; secondaryApproverName?: string; openingFloat: number; custodianEmail?: string }): PettyBranch => {
    const branch: PettyBranch = {
      id: `br-${input.code.toLowerCase()}-${Date.now()}`,
      name: input.name.trim(),
      code: input.code.trim().toUpperCase(),
      custodianName: input.custodianName,
      custodianEmail: input.custodianEmail ?? "",
      secondaryApproverName: input.secondaryApproverName,
      openingFloat: input.openingFloat,
      currentBalance: input.openingFloat,
    };
    setBranches(prev => [...prev, branch]);
    return branch;
  }, []);

  const updateBranch = useCallback((id: string, patch: Partial<PettyBranch>) => {
    setBranches(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));
  }, []);

  const deleteVoucher = useCallback((id: string) => {
    setVouchers(prev => prev.filter(v => v.id !== id));
  }, []);

  const getBranchSummary = useCallback((branchId: string): BranchSummary => {
    const branch = branches.find(b => b.id === branchId)!;
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
    addCategory, updateCategory, addPerson, addBranch, updateBranch,
    deleteVoucher,
    getBranchSummary, getCategoryBreakdown, getMonthlyTrend,
  }), [branches, vouchers, replenishments, verifications, categories, people, addVoucher, approveVoucher, rejectVoucher, markReimbursed, submitVerification, requestReplenishment, approveReplenishment, rejectReplenishment, markReplenishmentPaid, addCategory, updateCategory, addPerson, addBranch, updateBranch, deleteVoucher, getBranchSummary, getCategoryBreakdown, getMonthlyTrend]);

  return <PettyCashContext.Provider value={value}>{children}</PettyCashContext.Provider>;
}

export function usePettyCash(): Ctx {
  const ctx = useContext(PettyCashContext);
  if (!ctx) throw new Error("usePettyCash must be used within PettyCashProvider");
  return ctx;
}

// Re-export helper
export { approvalLevelFor };