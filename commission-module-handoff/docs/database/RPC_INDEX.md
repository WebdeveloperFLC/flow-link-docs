# Commission RPC Index

Extracted from `supabase/migrations/` in this package.

## Phase 1 — lifecycle & calculation

- `fn_resolve_commission_rule`
- `fn_evaluate_eligibility`
- `fn_create_commission_snapshot`
- `fn_mark_student_eligible`
- `fn_publish_commission_rules`
- `fn_apply_commission_hold`
- `fn_release_commission_hold`
- `fn_initiate_commission_transfer`
- `fn_create_replacement_commission`
- `fn_process_transfer_outcome`
- `is_commission_admin`

## Phase 2A — receipts

- `fn_create_commission_receipt`
- `fn_update_commission_receipt`
- `fn_upsert_receipt_invoice_allocations`
- `fn_upsert_receipt_student_allocations`
- `fn_approve_receipt_fx_review`
- `fn_mark_receipt_ready`
- `fn_post_commission_receipt`
- `fn_void_commission_receipt`
- `fn_reopen_receipt`
- `fn_receipt_summary`
- `fn_register_receipt_attachment`
- `fn_sync_student_from_receipts`
- `fn_sync_invoice_from_receipts`
- `fn_student_commission_expected`
- `fn_validate_receipt_allocations`
- `fn_refresh_receipt_allocation_totals`
- `fn_refresh_receipt_fx_review`
- `fn_assert_commission_receipt_actor`

## Phase 2B — aggregator

- `fn_create_remittance_batch`
- `fn_dispute_remittance_batch`
- `fn_resolve_batch_dispute`
- `fn_register_batch_statement`
- `fn_create_aggregator_invoice`
- `fn_add_invoices_to_aggregator_invoice`
- `fn_submit_aggregator_invoice`
- `fn_get_aggregator_workbench_summary`
- `fn_assert_commission_aggregator_actor`
- `fn_refresh_remittance_batch_totals`
- `fn_refresh_aggregator_invoice_totals`

## Edge functions (Deno)

- `upi-extract-commission-sheet` — AI extraction of commission terms from uploaded sheets
- `upi-analyze-agreement` — Agreement analysis (commission-adjacent)
