# Flow: Services (Service Packages)

## Storage
Service selections live on `clients` (`coaching_services`, `admission_services`, `allied_services`, `visa_services` text[]). Aggregated into `accounting_clients.service_package` by `fn_sync_accounting_client`.

## Service catalogue
`service_catalogue` (master) → used by Digital Success Hub search doc and selectors in `ClientNew` / `ClientDetail`.

## Enrollment → invoice
When a service is enrolled with a price, the user opens "Create Invoice" in `ClientInvoicesPanel` which writes `client_invoices` + `client_invoice_installments`. There is no automatic invoice on service add — it is an explicit action.

## Timeline
Service add/remove is not logged automatically. If logging is needed, write to `client_timeline` with event_type `service_enrolled` in the same call.