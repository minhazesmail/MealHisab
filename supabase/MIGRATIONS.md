# Supabase migration policy

MealHisab has a historical difference between some migration filenames in this repository and versions already recorded in production. Treat that as known legacy drift; do not try to rewrite production history to make old filenames look identical.

## Source of truth

- The production `supabase_migrations.schema_migrations` table is authoritative for what has actually been applied to production.
- This repository is authoritative for the schema that a fresh environment must be able to build today.
- A clean replay from the repository was re-established on August 25, 2026 and is enforced in CI with `supabase db reset` plus database integration tests.

## Rules for future migrations

1. Create every new production schema change as a new, forward-only migration.
2. Give each migration a unique timestamp/version prefix. CI rejects duplicate prefixes.
3. After a migration has been deployed, do not rename it, reuse its version, or edit it to change history. Follow-up fixes belong in a new migration.
4. Do not run blanket migration-history repair commands against production to reconcile old repository drift.
5. Do not reset a linked production database. In particular, never use `supabase db reset --linked` for production.
6. Before merge/deploy, verify that the repository still replays cleanly from an empty local database and that database integration tests pass.

## Handling the legacy drift

If an old production version does not line up with the current historical filename in this repository, inspect the production migration table and the effective schema before deciding what to do. Prefer a new forward migration over changing or repairing old history. Only perform a targeted history repair when the exact discrepancy and intended state are understood and independently verified.

This policy intentionally preserves production safety while keeping the repository clean-replayable for CI, local development, and new environments.
