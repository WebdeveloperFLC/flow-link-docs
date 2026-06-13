-- Phase 6B — step 1: add director to app_role enum
-- PostgreSQL requires this to commit before 'director' can be used (see 20260711120001).

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'director';
