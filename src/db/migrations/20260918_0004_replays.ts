import { sql, type Kysely } from "kysely";
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    create table replay_import_batches (
      id uuid primary key, user_id uuid not null references users(id), team_id uuid not null references teams(id), created_at timestamptz not null default now()
    );
    create table games (
      id uuid primary key, user_id uuid not null references users(id), team_id uuid not null references teams(id),
      team_version_id uuid references team_versions(id), provider_replay_id text not null, canonical_url text not null,
      requested_username text, requested_side text check(requested_side in ('p1','p2')), user_side text check(user_side in ('p1','p2')),
      status text not null default 'queued' check(status in ('queued','fetching','parsing','needs_input','succeeded','failed')),
      error_detail text, parser_run_id uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
      unique(user_id, provider_replay_id)
    );
    create index games_team_idx on games(user_id, team_id, team_version_id);
    create table replay_import_items (
      id uuid primary key, batch_id uuid not null references replay_import_batches(id), original_url text not null,
      game_id uuid references games(id), status text not null, error_detail text
    );
    create table replay_sources (
      game_id uuid primary key references games(id), raw_log text not null, checksum text not null,
      content_type text not null default 'text/plain', retrieved_at timestamptz not null default now()
    );
    create table parser_runs (
      id uuid primary key, game_id uuid not null references games(id), parser_version text not null,
      catalog_version_id uuid references catalog_versions(id), output jsonb not null, output_checksum text not null,
      created_at timestamptz not null default now(), unique(id, game_id)
    );
    alter table games add constraint games_parser_run_fk foreign key(parser_run_id, id) references parser_runs(id, game_id);
    create table game_corrections (
      id uuid primary key, game_id uuid not null references games(id), user_id uuid not null references users(id),
      user_side text not null check(user_side in ('p1','p2')), result text check(result in ('win','loss','tie','unknown')),
      reason text not null, created_at timestamptz not null default now()
    );
    create index game_corrections_game_idx on game_corrections(game_id, created_at desc);
    create table replay_annotations (
      user_id uuid not null references users(id), subject_key text not null, markdown text not null,
      updated_at timestamptz not null default now(), primary key(user_id, subject_key)
    );
    create function validate_game_team_reference() returns trigger language plpgsql as $$
    begin
      if not exists(select 1 from teams where id = new.team_id and user_id = new.user_id) then raise exception 'invalid game owner'; end if;
      if new.team_version_id is not null then
        perform 1 from team_versions where id = new.team_version_id and team_id = new.team_id for update;
        if not found then raise exception 'invalid game version'; end if;
        update team_versions set sealed_at = now() where id = new.team_version_id and sealed_at is null;
      end if;
      return new;
    end $$;
    create trigger validate_game_team before insert or update of team_id, team_version_id, user_id on games for each row execute function validate_game_team_reference();
  `.execute(db);
}
export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    drop trigger validate_game_team on games;
    drop function validate_game_team_reference();
    drop table replay_annotations, game_corrections;
    alter table games drop constraint games_parser_run_fk;
    drop table parser_runs, replay_sources, replay_import_items, games, replay_import_batches;
  `.execute(db);
}
