# Add Remove option for Logo and Signature

## Problem
In Settings → Firm & RCIC profile, Logo and Signature image slots only show a "Replace" button. There's no way to clear/remove an uploaded asset.

## Fix
Edit `src/components/settings/FirmProfileCard.tsx`:

1. Add a `remove(kind: "logo" | "signature")` handler that:
   - Sets the corresponding `logo_path` / `signature_path` to `null` in local state
   - Persists the null via `supabase.from("firm_profile").update({...}).eq("id", p.id)` (only if `p.id` exists)
   - Optionally deletes the storage object: `supabase.storage.from("branding").remove([oldPath])` (best-effort, ignore error)
   - Refreshes signed URLs (clears them) and toasts "Removed"

2. Update `AssetSlot` component to accept an `onRemove?: () => void` prop. When `url` is present, render a small destructive "Remove" button (Trash2 icon) next to "Replace". Hide it when no asset exists or while uploading.

3. Wire `onRemove={() => remove("logo")}` and `onRemove={() => remove("signature")}` in the two `AssetSlot` usages.

No DB schema or other file changes needed — `logo_path` / `signature_path` are already nullable.

## Files
- Modified: `src/components/settings/FirmProfileCard.tsx`
