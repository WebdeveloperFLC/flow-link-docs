# Government Fee Architecture — LOCKED (Phase P2.2 Complete)

| Field | Value |
|-------|-------|
| **Status** | **LOCKED** — design approved; no further government-fee architecture changes without MD review |
| **Closed** | June 2026 |
| **Approved** | P2.2 — per owner recommendation |
| **Canonical document** | [`GOVERNMENT_FEE_MASTER_ARCHITECTURE_V1.md`](./GOVERNMENT_FEE_MASTER_ARCHITECTURE_V1.md) — BR-G1–BR-G14 |
| **Implementation** | Deferred to P3b/P3c — **after P2.3 MD sign-off** |

---

## Scope closed

| Topic | Location |
|-------|----------|
| Government fee ownership (Service Library only) | BR-G1, §2 |
| Single write path consolidation | BR-G2, BR-G3, §3.3, §4 |
| Component-level lines (visa, biometrics, SEVIS, VFS, etc.) | BR-G14, §3.1 |
| Direct-paid tracking with proof | BR-G6, §6 |
| Collection / trust / revenue separation | BR-G7, §8 |
| Authority rate governance | §5 |
| Counselor & accounts workflows | §7 |
| Government fee data contracts | §10 |
| Reporting | §9 |

---

## Explicit exclusions (government domain)

- **Not** authored in Institution Masters  
- **Not** subject to Institution Fee Policy Engine (BR-G10)  
- **Not** discount wallet / Offers Studio (BR-G11)  
- **Not** bundled into single “government fees” invoice line  

---

## Open MD decisions (government — pending P2.3)

Carried to [`FEE_MASTER_MD_SIGNOFF_P2_3.md`](./FEE_MASTER_MD_SIGNOFF_P2_3.md): MD-G1–MD-G5, plus shared MD-3, MD-5.

---

## Design phase status

| Phase | Domain | Status |
|-------|--------|--------|
| P2.1 | Institution Fee Architecture | **LOCKED** |
| P2.2 | Government Fee + Direct-Paid | **LOCKED** |
| P2.3 | Final MD Sign-Off | **In progress** |
| P3 | Implementation | **Blocked** until P2.3 complete |

---

**Government Fee Architecture: CLOSED.**
