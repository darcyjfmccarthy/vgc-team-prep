import type { Generated, Insertable, Selectable } from "kysely";

export interface UsersTable {
  id: string;
  email_normalized: string;
  password_hash: string;
  display_name: string | null;
  account_state: "active" | "disabled" | "deletion_pending";
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  deleted_at: Date | null;
}

export interface SessionsTable {
  id: string;
  user_id: string;
  token_hash: Buffer;
  created_at: Generated<Date>;
  last_seen_at: Date;
  idle_expires_at: Date;
  absolute_expires_at: Date;
  revoked_at: Date | null;
  user_agent_summary: string | null;
}

export interface PasswordResetTokensTable {
  id: string;
  user_id: string;
  token_hash: Buffer;
  created_at: Generated<Date>;
  expires_at: Date;
  used_at: Date | null;
  invalidated_at: Date | null;
}

export interface EmailOutboxTable {
  id: string;
  recipient: string;
  subject: string;
  text_body: string;
  created_at: Generated<Date>;
}

export interface AuthRateLimitsTable {
  key: string;
  window_started_at: Date;
  count: number;
  expires_at: Date;
}

export interface JobsTable {
  id: string;
  kind: string;
  user_id: string | null;
  subject_type: string;
  subject_id: string;
  idempotency_key: string;
  status:
    | "available"
    | "running"
    | "retry_wait"
    | "succeeded"
    | "failed"
    | "cancelled";
  priority: number;
  available_at: Date;
  lease_expires_at: Date | null;
  leased_by: string | null;
  attempt_count: number;
  max_attempts: number;
  safe_error_code: string | null;
  safe_error_detail: string | null;
  correlation_id: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  completed_at: Date | null;
}

export interface JobAttemptsTable {
  id: string;
  job_id: string;
  attempt_number: number;
  worker_id: string;
  started_at: Date;
  finished_at: Date | null;
  outcome: string | null;
  safe_error_code: string | null;
  duration_ms: number | null;
  correlation_id: string;
}

export interface CatalogVersionsTable {
  id: string;
  version_label: string;
  checksum: string;
  source_name: string;
  created_at: Generated<Date>;
}
export interface SpeciesTable {
  id: string;
  canonical_slug: string;
  display_name: string;
}
export interface FormsTable {
  id: string;
  species_id: string | null;
  canonical_slug: string;
  display_name: string;
}
export interface ItemsTable {
  id: string;
  canonical_slug: string;
  display_name: string;
}
export interface AbilitiesTable {
  id: string;
  canonical_slug: string;
  display_name: string;
}
export interface TypesTable {
  id: string;
  canonical_slug: string;
  display_name: string;
}
export interface MovesTable {
  id: string;
  canonical_slug: string;
  display_name: string;
  type_id: string | null;
}
export interface NaturesTable {
  id: string;
  canonical_slug: string;
  display_name: string;
}
export interface RulesetsTable {
  id: string;
  canonical_slug: string;
  display_name: string;
  catalog_version_id: string;
  team_size: number;
  bring_size: number;
  ev_max_per_stat: number;
  ev_total: number;
  state: string;
}

export interface TeamsTable {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  archived_at: Date | null;
  deleted_at: Date | null;
  revision: number;
}
export interface TeamVersionsTable {
  id: string;
  team_id: string;
  version_number: number;
  ruleset_id: string;
  catalog_version_id: string;
  change_summary: string | null;
  source_kind: string;
  source_text: string | null;
  source_url: string | null;
  source_title: string | null;
  source_author: string | null;
  source_format_id: string | null;
  created_at: Generated<Date>;
  sealed_at: Date | null;
  revision: number;
}
export interface SlotIdentitiesTable {
  id: string;
  team_id: string;
  label: string | null;
  created_at: Generated<Date>;
  retired_at: Date | null;
}
export interface TeamSlotsTable {
  id: string;
  team_version_id: string;
  slot_identity_id: string;
  slot_number: number;
  species_id: string;
  form_id: string | null;
  nickname: string | null;
  gender: string | null;
  level: number;
  item_id: string | null;
  ability_id: string | null;
  nature_id: string | null;
  is_shiny: boolean;
  created_at: Generated<Date>;
}
export interface TeamSlotMovesTable {
  team_slot_id: string;
  ordinal: number;
  move_id: string;
}
export interface TeamSlotEvsTable {
  team_slot_id: string;
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export interface TagsTable {
  id: string;
  user_id: string;
  label: string;
  label_normalized: string;
  color: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}
export interface TagAssignmentsTable {
  tag_id: string;
  user_id: string;
  subject_type: "team";
  subject_id: string;
  created_at: Generated<Date>;
}
export interface NotesTable {
  id: string;
  user_id: string;
  subject_type: "team" | "team_version" | "slot_identity";
  subject_id: string;
  markdown_source: string;
  sanitized_render_cache: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  deleted_at: Date | null;
  revision: number;
}

export interface Database {
  users: UsersTable;
  sessions: SessionsTable;
  password_reset_tokens: PasswordResetTokensTable;
  email_outbox: EmailOutboxTable;
  auth_rate_limits: AuthRateLimitsTable;
  jobs: JobsTable;
  job_attempts: JobAttemptsTable;
  catalog_versions: CatalogVersionsTable;
  species: SpeciesTable;
  forms: FormsTable;
  items: ItemsTable;
  abilities: AbilitiesTable;
  types: TypesTable;
  moves: MovesTable;
  natures: NaturesTable;
  rulesets: RulesetsTable;
  teams: TeamsTable;
  team_versions: TeamVersionsTable;
  slot_identities: SlotIdentitiesTable;
  team_slots: TeamSlotsTable;
  team_slot_moves: TeamSlotMovesTable;
  team_slot_evs: TeamSlotEvsTable;
  tags: TagsTable;
  tag_assignments: TagAssignmentsTable;
  notes: NotesTable;
}

export type User = Selectable<UsersTable>;
export type NewUser = Insertable<UsersTable>;
