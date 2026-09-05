import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    create table users (id uuid primary key, email_normalized text not null unique, password_hash text not null, display_name text, account_state text not null default 'active' check (account_state in ('active','disabled','deletion_pending')), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz);
    create table sessions (id uuid primary key, user_id uuid not null references users(id) on delete cascade, token_hash bytea not null unique, created_at timestamptz not null default now(), last_seen_at timestamptz not null, idle_expires_at timestamptz not null, absolute_expires_at timestamptz not null, revoked_at timestamptz, user_agent_summary text);
    create index sessions_user_idx on sessions(user_id, revoked_at, absolute_expires_at);
    create table password_reset_tokens (id uuid primary key, user_id uuid not null references users(id) on delete cascade, token_hash bytea not null unique, created_at timestamptz not null default now(), expires_at timestamptz not null, used_at timestamptz, invalidated_at timestamptz);
    create table email_outbox (id uuid primary key, recipient text not null, subject text not null, text_body text not null, created_at timestamptz not null default now());
    create table auth_rate_limits (key text primary key, window_started_at timestamptz not null, count integer not null, expires_at timestamptz not null);
    create table jobs (id uuid primary key, kind text not null, user_id uuid references users(id) on delete cascade, subject_type text not null, subject_id uuid not null, idempotency_key text not null, status text not null check (status in ('available','running','retry_wait','succeeded','failed','cancelled')), priority smallint not null default 0, available_at timestamptz not null, lease_expires_at timestamptz, leased_by text, attempt_count smallint not null default 0, max_attempts smallint not null default 3, safe_error_code text, safe_error_detail text, correlation_id uuid not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), completed_at timestamptz, unique(kind, user_id, idempotency_key));
    create index jobs_claim_idx on jobs(status, available_at, priority desc);
    create table job_attempts (id uuid primary key, job_id uuid not null references jobs(id) on delete cascade, attempt_number smallint not null, worker_id text not null, started_at timestamptz not null, finished_at timestamptz, outcome text, safe_error_code text, duration_ms integer, correlation_id uuid not null, unique(job_id, attempt_number));
    create table catalog_versions (id uuid primary key, version_label text not null unique, checksum text not null unique, source_name text not null, created_at timestamptz not null default now());
    create table species (id uuid primary key, canonical_slug text not null unique, display_name text not null);
    create table forms (id uuid primary key, species_id uuid references species(id), canonical_slug text not null unique, display_name text not null);
    create table items (id uuid primary key, canonical_slug text not null unique, display_name text not null);
    create table abilities (id uuid primary key, canonical_slug text not null unique, display_name text not null);
    create table moves (id uuid primary key, canonical_slug text not null unique, display_name text not null);
    create table natures (id uuid primary key, canonical_slug text not null unique, display_name text not null);
    create table rulesets (id uuid primary key, canonical_slug text not null unique, display_name text not null, catalog_version_id uuid not null references catalog_versions(id), team_size smallint not null, bring_size smallint not null, ev_max_per_stat smallint not null, ev_total smallint not null, state text not null);
    create table teams (id uuid primary key, user_id uuid not null references users(id) on delete cascade, title text not null, description text, status text not null check (status in ('active','testing','archived')), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz, deleted_at timestamptz, revision integer not null default 1);
    create index teams_user_idx on teams(user_id, status, updated_at desc);
    create table team_versions (id uuid primary key, team_id uuid not null references teams(id) on delete cascade, version_number integer not null, ruleset_id uuid not null references rulesets(id), catalog_version_id uuid not null references catalog_versions(id), change_summary text, source_kind text not null, source_text text, source_url text, source_title text, source_author text, source_format_id text, created_at timestamptz not null default now(), sealed_at timestamptz, revision integer not null default 1, unique(team_id, version_number));
    create table slot_identities (id uuid primary key, team_id uuid not null references teams(id) on delete cascade, label text, created_at timestamptz not null default now(), retired_at timestamptz);
    create table team_slots (id uuid primary key, team_version_id uuid not null references team_versions(id) on delete cascade, slot_identity_id uuid not null references slot_identities(id), slot_number smallint not null check (slot_number between 1 and 6), species_id uuid not null references species(id), form_id uuid references forms(id), nickname text, gender text check (gender in ('M','F')), level smallint not null, item_id uuid references items(id), ability_id uuid references abilities(id), nature_id uuid references natures(id), is_shiny boolean not null default false, created_at timestamptz not null default now(), unique(team_version_id, slot_number));
    create table team_slot_moves (team_slot_id uuid not null references team_slots(id) on delete cascade, ordinal smallint not null check (ordinal between 1 and 4), move_id uuid not null references moves(id), primary key(team_slot_id, ordinal));
    create table team_slot_evs (team_slot_id uuid primary key references team_slots(id) on delete cascade, hp smallint not null, atk smallint not null, def smallint not null, spa smallint not null, spd smallint not null, spe smallint not null);
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`drop table if exists team_slot_evs, team_slot_moves, team_slots, slot_identities, team_versions, teams, rulesets, natures, moves, abilities, items, forms, species, catalog_versions, job_attempts, jobs, auth_rate_limits, email_outbox, password_reset_tokens, sessions, users cascade`.execute(
    db,
  );
}
