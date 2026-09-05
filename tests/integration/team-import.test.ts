import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { getTeamDetail, importPokepaste } from "@/modules/teams/service";

describe("Poképaste team import", () => {
  beforeAll(async () => {
    const user = await db
      .selectFrom("users")
      .select("id")
      .where("email_normalized", "=", "player-one@example.test")
      .executeTakeFirst();
    if (!user) throw new Error("Run db:seed before integration tests.");
  });

  it("is idempotent and retains six parsed sets", async () => {
    const user = await db
      .selectFrom("users")
      .select("id")
      .where("email_normalized", "=", "player-one@example.test")
      .executeTakeFirstOrThrow();
    const first = await importPokepaste(
      user.id,
      "https://pokepast.es/6bbca2da7c6e2365",
    );
    const second = await importPokepaste(
      user.id,
      "https://pokepast.es/6bbca2da7c6e2365",
    );
    expect(second).toEqual(first);
    const detail = await getTeamDetail(user.id, first.teamId);
    expect(detail?.title).toBe("DuskLass reg m-b life orb");
    expect(detail?.slots).toHaveLength(6);
    expect(detail?.ev_max_per_stat).toBe(32);
    expect(detail?.slots[0]?.form_slug).toBe("froslass-mega");
    expect(detail?.slots[0]?.item_slug).toBe("froslassite");
    expect(detail?.slots[0]?.nature_slug).toBe("timid");
    expect(detail?.slots[0]?.moves[0]).toEqual({
      name: "Blizzard",
      typeName: "Ice",
      typeSlug: "ice",
    });
    expect(detail?.slots[5]?.is_shiny).toBe(true);
  });
});
