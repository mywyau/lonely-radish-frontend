import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeLoginRedirectPath } from "../composables/useAuth";

describe("useAuth helpers", () => {
  beforeEach(() => {
    Object.defineProperty(process, "client", {
      value: true,
      configurable: true,
    });
    vi.stubGlobal("window", {
      location: {
        origin: "https://lonelyradish.test",
        pathname: "/current",
        search: "",
        hash: "",
      },
    });
  });

  it("keeps same-origin relative and absolute redirect paths", () => {
    expect(normalizeLoginRedirectPath("/coming-soon?intent=matches#start")).toBe(
      "/coming-soon?intent=matches#start",
    );
    expect(normalizeLoginRedirectPath("https://lonelyradish.test/account?tab=billing")).toBe(
      "/account?tab=billing",
    );
  });

  it("rejects protocol-relative, cross-origin, missing, and invalid redirects", () => {
    expect(normalizeLoginRedirectPath("//evil.example/path")).toBe("/");
    expect(normalizeLoginRedirectPath("https://evil.example/path")).toBe("/");
    expect(normalizeLoginRedirectPath()).toBe("/");
    expect(normalizeLoginRedirectPath("http://[not-valid")).toBe("/");
  });
});
