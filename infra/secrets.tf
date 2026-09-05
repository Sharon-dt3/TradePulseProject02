# Phase 0: Supabase-facing secrets.
#
# Greenfield — there is no rds.tf in this repo and none is ever created
# (BLUEPRINT.md §7 OD-0/OD-1: Supabase is the only Postgres this system
# talks to, no local/RDS fallback). Actual secret values are never
# committed — they're injected via a secrets manager or CI-provided
# variables at apply time.

variable "supabase_project_ref" {
  description = "Supabase project ref (from the dashboard URL), e.g. psbxribzhqycoogqeiuh"
  type        = string
  default     = "psbxribzhqycoogqeiuh"
}

variable "supabase_region" {
  description = "Supabase project region"
  type        = string
  default     = "us-east-1"
}

variable "supabase_db_password" {
  description = "Supabase Postgres password (sensitive; supply via TF_VAR_supabase_db_password or a secrets manager, never in source)"
  type        = string
  sensitive   = true
}

variable "supabase_service_role_key" {
  description = "Supabase service_role key — server-side only (ledger-core, risk-engine). Never exposed to the dashboard/frontend build."
  type        = string
  sensitive   = true
}

variable "supabase_anon_key" {
  description = "Supabase anon key — safe for the dashboard frontend bundle"
  type        = string
  sensitive   = true
}

locals {
  # Supavisor pooled connection (transaction mode, port 6543) — used by all
  # application runtime traffic (ledger-core, risk-engine).
  supabase_pooled_db_url = "postgresql://postgres.${var.supabase_project_ref}:${var.supabase_db_password}@aws-0-${var.supabase_region}.pooler.supabase.com:6543/postgres"

  # Direct/unpooled connection (port 5432) — reserved for Flyway and
  # Alembic migrations only, never application traffic.
  supabase_direct_db_url = "postgresql://postgres.${var.supabase_project_ref}:${var.supabase_db_password}@aws-0-${var.supabase_region}.pooler.supabase.com:5432/postgres"
}

# Only ledger-core and risk-engine receive Postgres credentials, per
# BLUEPRINT.md §4 — gateway and dashboard never get supabase_db_password or
# supabase_service_role_key.
