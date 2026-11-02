import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { WebHandoffResult } from "@/features/auth/actions";

const mintMock = vi.fn<() => Promise<WebHandoffResult>>();
const openMock = vi.fn<(url: string) => void>();

vi.mock("@/features/auth/actions", () => ({ createWebHandoffAction: () => mintMock() }));
vi.mock("@/lib/native/open-external", () => ({ openExternalBrowser: (url: string) => openMock(url) }));

// The token store is module state, so each test gets a fresh copy.
async function loadButton() {
  vi.resetModules();
  return (await import("@/features/auth/web-handoff-button")).WebHandoffButton;
}

// jsdom can't follow a real link; the click handlers still run first.
const stopNavigation = (event: Event) => event.preventDefault();

beforeEach(() => {
  mintMock.mockReset();
  openMock.mockReset();
  document.addEventListener("click", stopNavigation);
});

afterEach(() => {
  cleanup();
  document.removeEventListener("click", stopNavigation);
  vi.useRealTimers();
});

describe("WebHandoffButton", () => {
  it("has the link ready before the tap, shared by every button on screen", async () => {
    mintMock.mockResolvedValue({ tokenHash: "tok1" });
    const WebHandoffButton = await loadButton();

    render(
      <>
        <WebHandoffButton nextPath="/advertise/new" label="Top" />
        <WebHandoffButton nextPath="/advertise/new" label="Bottom" />
      </>,
    );

    const top = await screen.findByRole("link", { name: "Top" });
    const bottom = screen.getByRole("link", { name: "Bottom" });
    // Minting twice would void the first token.
    expect(mintMock).toHaveBeenCalledTimes(1);
    const url = new URL(top.getAttribute("href")!);
    expect(url.pathname).toBe("/auth/callback");
    expect(url.searchParams.get("token_hash")).toBe("tok1");
    expect(url.searchParams.get("next")).toBe("/advertise/new");
    expect(bottom.getAttribute("href")).toBe(top.getAttribute("href"));
    expect(top).toHaveAttribute("target", "_blank");
  });

  it("only says the browser opened once the app actually leaves", async () => {
    mintMock.mockResolvedValue({ tokenHash: "tok1" });
    const WebHandoffButton = await loadButton();
    render(<WebHandoffButton nextPath="/discover/shop/abc#promote" label="Promote" />);

    fireEvent.click(await screen.findByRole("link", { name: "Promote" }));
    expect(screen.queryByText(/Opened in your browser/)).toBeNull();

    await act(async () => {
      window.dispatchEvent(new Event("blur"));
    });
    expect(screen.getByText("Opened in your browser. Finish up there.")).toBeInTheDocument();
  });

  it("admits it when nothing opened, and keeps the link for another tap", async () => {
    mintMock.mockResolvedValue({ tokenHash: "tok1" });
    const WebHandoffButton = await loadButton();
    render(<WebHandoffButton nextPath="/advertise/new" label="Create your ad" />);
    const link = await screen.findByRole("link", { name: "Create your ad" });

    vi.useFakeTimers();
    fireEvent.click(link);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_500);
    });

    expect(screen.getByText("Your browser didn't open. Tap again.")).toBeInTheDocument();
    expect(screen.queryByText(/Opened in your browser/)).toBeNull();
    expect(screen.getByRole("link", { name: "Create your ad" })).toBeInTheDocument();
  });

  it("a tap that beats the token still opens the right page once it arrives", async () => {
    let resolveMint: (result: WebHandoffResult) => void = () => {};
    mintMock.mockReturnValue(new Promise((resolve) => (resolveMint = resolve)));
    const WebHandoffButton = await loadButton();
    render(<WebHandoffButton nextPath="/discover/shop/abc?category=body#promote" label="Promote" />);

    fireEvent.click(screen.getByRole("button", { name: "Promote" }));
    await act(async () => {
      resolveMint({ tokenHash: "tok2" });
    });

    expect(mintMock).toHaveBeenCalledTimes(1);
    expect(openMock).toHaveBeenCalledTimes(1);
    const url = new URL(openMock.mock.calls[0][0]);
    expect(url.searchParams.get("token_hash")).toBe("tok2");
    expect(url.searchParams.get("next")).toBe("/discover/shop/abc?category=body#promote");
  });

  it("shows why when the website can't be reached, and never opens a dead link", async () => {
    mintMock.mockResolvedValue({ error: "Couldn't reach the website. Try again." });
    const WebHandoffButton = await loadButton();
    render(<WebHandoffButton nextPath="/advertise/new" label="Create your ad" />);

    expect(await screen.findByText("Couldn't reach the website. Try again.")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
    expect(openMock).not.toHaveBeenCalled();
  });
});
