import { describe, expect, it } from "vitest";
import { groupNotifications, groupedVerb, type GroupableNotification } from "@/lib/notifications/group";

let seq = 0;
function n(partial: Partial<GroupableNotification>): GroupableNotification {
  seq += 1;
  return {
    id: `n${seq}`,
    kind: "like",
    actor_id: "turbussy",
    target_type: "post",
    target_id: `post-${seq}`,
    read_at: null,
    created_at: new Date(2026, 10, 5, 12, 0, 60 - seq).toISOString(),
    ...partial,
  };
}

describe("groupNotifications", () => {
  it("folds back-to-back likes from one person into one row", () => {
    const a = n({ target_id: "p1" });
    const b = n({ target_id: "p2" });
    const groups = groupNotifications([a, b]);
    expect(groups).toHaveLength(1);
    expect(groups[0].lead.id).toBe(a.id);
    expect(groups[0].targetCount).toBe(2);
    expect(groups[0].ids).toEqual([a.id, b.id]);
  });

  it("counts a post liked twice as one post", () => {
    const groups = groupNotifications([n({ target_id: "p1" }), n({ target_id: "p1" })]);
    expect(groups).toHaveLength(1);
    expect(groups[0].targetCount).toBe(1);
  });

  it("keeps different people, different kinds and interrupted runs apart", () => {
    const groups = groupNotifications([
      n({ actor_id: "a" }),
      n({ actor_id: "b" }),
      n({ actor_id: "b", kind: "follow", target_type: "profile" }),
      n({ actor_id: "b" }),
    ]);
    expect(groups.map((g) => g.ids.length)).toEqual([1, 1, 1, 1]);
  });

  it("only groups likes and comments, never follows or one-off events", () => {
    const groups = groupNotifications([
      n({ kind: "follow", target_type: "profile", target_id: null }),
      n({ kind: "follow", target_type: "profile", target_id: null }),
    ]);
    expect(groups).toHaveLength(2);
  });

  it("never groups notifications with no actor", () => {
    const groups = groupNotifications([
      n({ actor_id: null, kind: "vehicle_verified", target_type: "vehicle" }),
      n({ actor_id: null, kind: "vehicle_verified", target_type: "vehicle" }),
    ]);
    expect(groups).toHaveLength(2);
  });

  it("is unread when any notification in the group is unread", () => {
    const read = new Date(2026, 10, 5).toISOString();
    expect(groupNotifications([n({ read_at: read }), n({ read_at: null })])[0].unread).toBe(true);
    expect(groupNotifications([n({ read_at: read }), n({ read_at: read })])[0].unread).toBe(false);
  });
});

describe("groupedVerb", () => {
  it("says how many posts when there's more than one", () => {
    expect(groupedVerb("like", 1, "liked your post")).toBe("liked your post");
    expect(groupedVerb("like", 3, "liked your post")).toBe("liked 3 of your posts");
    expect(groupedVerb("comment", 2, "commented on your post")).toBe("commented on 2 of your posts");
  });
});
