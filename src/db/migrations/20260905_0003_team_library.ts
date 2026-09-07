import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    create table tags (
      id uuid primary key,
      user_id uuid not null references users(id) on delete cascade,
      label text not null,
      label_normalized text not null,
      color text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique(user_id, label_normalized)
    );
    create table tag_assignments (
      tag_id uuid not null references tags(id) on delete cascade,
      user_id uuid not null references users(id) on delete cascade,
      subject_type text not null check (subject_type in ('team')),
      subject_id uuid not null,
      created_at timestamptz not null default now(),
      primary key(tag_id, subject_type, subject_id)
    );
    create index tag_assignments_subject_idx on tag_assignments(user_id, subject_type, subject_id);

    create table notes (
      id uuid primary key,
      user_id uuid not null references users(id) on delete cascade,
      subject_type text not null check (subject_type in ('team','team_version','slot_identity')),
      subject_id uuid not null,
      markdown_source text not null,
      sanitized_render_cache text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      deleted_at timestamptz,
      revision integer not null default 1
    );
    create index notes_subject_idx on notes(user_id, subject_type, subject_id, updated_at desc) where deleted_at is null;

    create function reject_sealed_team_version_change() returns trigger language plpgsql as $$
    begin
      if old.sealed_at is not null then
        raise exception 'sealed team versions are immutable';
      end if;
      return case when tg_op = 'DELETE' then old else new end;
    end $$;
    create trigger immutable_sealed_version before update or delete on team_versions
      for each row execute function reject_sealed_team_version_change();

    create function reject_sealed_team_child_change() returns trigger language plpgsql as $$
    declare version_id uuid;
    begin
      if tg_table_name = 'team_slots' then
        version_id := coalesce(new.team_version_id, old.team_version_id);
      elsif tg_table_name = 'team_slot_moves' then
        select team_version_id into version_id from team_slots where id = coalesce(new.team_slot_id, old.team_slot_id);
      else
        select team_version_id into version_id from team_slots where id = coalesce(new.team_slot_id, old.team_slot_id);
      end if;
      if exists(select 1 from team_versions where id = version_id and sealed_at is not null) then
        raise exception 'sealed team version children are immutable';
      end if;
      return case when tg_op = 'DELETE' then old else new end;
    end $$;
    create trigger immutable_sealed_slots before insert or update or delete on team_slots
      for each row execute function reject_sealed_team_child_change();
    create trigger immutable_sealed_moves before insert or update or delete on team_slot_moves
      for each row execute function reject_sealed_team_child_change();
    create trigger immutable_sealed_evs before insert or update or delete on team_slot_evs
      for each row execute function reject_sealed_team_child_change();
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    drop trigger if exists immutable_sealed_evs on team_slot_evs;
    drop trigger if exists immutable_sealed_moves on team_slot_moves;
    drop trigger if exists immutable_sealed_slots on team_slots;
    drop trigger if exists immutable_sealed_version on team_versions;
    drop function if exists reject_sealed_team_child_change();
    drop function if exists reject_sealed_team_version_change();
    drop table if exists notes, tag_assignments, tags cascade;
  `.execute(db);
}
