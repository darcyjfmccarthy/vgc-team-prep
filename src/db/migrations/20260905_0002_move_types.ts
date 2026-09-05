import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    create table types (
      id uuid primary key,
      canonical_slug text not null unique,
      display_name text not null
    );
    alter table moves add column type_id uuid references types(id);
    create index moves_type_idx on moves(type_id);
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    drop index if exists moves_type_idx;
    alter table moves drop column if exists type_id;
    drop table if exists types;
  `.execute(db);
}
