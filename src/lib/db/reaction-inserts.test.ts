import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { likePost } from "./likes";
import { followUser } from "./follows";
import { savePost } from "./saves";

/** A client whose every insert resolves with the given error (or none). */
function clientInserting(error: { code: string; message: string } | null) {
  return {
    from: () => ({ insert: async () => ({ error }) }),
  } as unknown as SupabaseClient<Database>;
}

const duplicate = { code: "23505", message: "duplicate key value violates unique constraint" };
const broken = { code: "42501", message: "permission denied" };

describe("likePost", () => {
  it("reports a new like", async () => {
    await expect(likePost(clientInserting(null), "u", "p")).resolves.toBe(true);
  });

  it("treats an existing like as done, not as a failure", async () => {
    await expect(likePost(clientInserting(duplicate), "u", "p")).resolves.toBe(false);
  });

  it("still throws on any other error", async () => {
    await expect(likePost(clientInserting(broken), "u", "p")).rejects.toEqual(broken);
  });
});

describe("followUser", () => {
  it("reports a new follow", async () => {
    await expect(followUser(clientInserting(null), "a", "b")).resolves.toBe(true);
  });

  it("treats an existing follow as done, not as a failure", async () => {
    await expect(followUser(clientInserting(duplicate), "a", "b")).resolves.toBe(false);
  });

  it("still throws on any other error", async () => {
    await expect(followUser(clientInserting(broken), "a", "b")).rejects.toEqual(broken);
  });
});

describe("savePost", () => {
  it("treats an existing save as done", async () => {
    await expect(savePost(clientInserting(duplicate), "u", "p")).resolves.toBeUndefined();
  });

  it("still throws on any other error", async () => {
    await expect(savePost(clientInserting(broken), "u", "p")).rejects.toEqual(broken);
  });
});
