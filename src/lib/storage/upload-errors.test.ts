import { describe, it, expect } from "vitest";
import { ModerationRejectedError, uploadErrorMessage } from "@/lib/storage/upload-errors";

describe("uploadErrorMessage", () => {
  it("shows the moderation reason itself, since retrying can never work", () => {
    const err = new ModerationRejectedError("This photo doesn't meet our community guidelines.");
    expect(uploadErrorMessage(err, "Couldn't upload that photo. Try again.")).toBe(
      "This photo doesn't meet our community guidelines.",
    );
  });

  it("falls back to the caller's generic message for any other failure", () => {
    expect(uploadErrorMessage(new Error("network down"), "Couldn't upload that photo. Try again.")).toBe(
      "Couldn't upload that photo. Try again.",
    );
  });

  it("does not leak an unrelated error's message to the user", () => {
    const leaky = new Error("duplicate key value violates unique constraint media_pkey");
    expect(uploadErrorMessage(leaky, "fallback")).toBe("fallback");
  });

  it("handles non-Error throws", () => {
    expect(uploadErrorMessage("boom", "fallback")).toBe("fallback");
    expect(uploadErrorMessage(undefined, "fallback")).toBe("fallback");
    expect(uploadErrorMessage(null, "fallback")).toBe("fallback");
  });

  it("is recognisable by class and by name", () => {
    const err = new ModerationRejectedError("nope");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ModerationRejectedError);
    expect(err.name).toBe("ModerationRejectedError");
  });
});
