# Project Memory

## Core
Notification subsystem: `app_notifications` table + `NotificationCenter` bell in AppLayout. Producers call `notifyUsers()` from `@/lib/appNotifications`. Never edit dispatcher or invoice/receipt math when adding new notification producers.
