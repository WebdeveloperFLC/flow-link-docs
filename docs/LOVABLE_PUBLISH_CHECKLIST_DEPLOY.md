# Deploy — Lovable publish master checklist

## Shipped (agent)

| Item | Change |
|------|--------|
| Master checklist | `docs/LOVABLE_PUBLISH_CHECKLIST.md` — Performance Hub + CMS + HR Payroll |
| `ship.sh` | Prints CMS (2P, 3A–3D) + HR (00–17) migration lists on every ship |
| UAT guide | HR setup doc updated to migrations 00–17 |

**No migration.**

---

## YOUR ACTION

### Lovable → Sync from GitHub → Publish

Open [`LOVABLE_PUBLISH_CHECKLIST.md`](./LOVABLE_PUBLISH_CHECKLIST.md) and approve **every** pending migration — not just the latest ship.

Priority if catching up:

1. Performance Hub demo seed (`20260716120000`–`07`)
2. CMS 2P + 3A–3D (`20260718120004`, `20260718120000`–`03`)
3. HR Payroll 00–17 (if `/hr` not live yet)

### Verify (optional)

```bash
npm run test:hr-payroll          # HR pre-UAT gate
npm run test:regression          # PH-R-020 on Performance Hub ships
```

---

*Use this doc as the single publish reference until production cutover.*
