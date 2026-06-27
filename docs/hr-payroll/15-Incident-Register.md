# 15 — Workforce Incident Register

**WTM Pack 2.2** — branch-level operational incidents.

## Purpose

Record office-wide events (internet down, power failure, server down) that may explain multiple employee attendance exceptions.

## Table

`workforce_incidents`

| Field | Purpose |
|-------|---------|
| `incident_code` | Human-readable ID (e.g. INC-…) |
| `branch_id` | Affected branch |
| `start_at` / `end_at` | Incident window |
| `incident_type_code` | From `hr_masters` domain `workforce_incident_type` |
| `status` | Open · Active · Closed |

## Incident linking

RPC: `fn_aems_find_matching_incidents(org, branch, timestamp)`

When employee submits exception, UI shows **"Matching Workforce Incident Found"** if an active incident overlaps. Linking is optional; **HR approves independently** — no auto-approval.

## Types (master data)

Seeded in `workforce_incident_type`: Internet Down, Power Failure, Server Down, Office Closed, Building Maintenance, Network Failure, Other.

## Entry point

`/hr/admin/incidents` — Administration → Workforce Incident Register
