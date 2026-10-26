import { afterEach, describe, expect, it } from "vitest";
import { isProductionDeploy } from "../src/lib/blobs.js";

describe("isProductionDeploy", () => {
  afterEach(() => {
    delete (globalThis as { Netlify?: unknown }).Netlify;
  });

  it.each([
    ["production", true],
    ["deploy-preview", false],
    ["branch-deploy", false],
    ["dev", false],
    [null, true],
  ])("%s -> %s", (context, production) => {
    expect(isProductionDeploy(context)).toBe(production);
  });

  it("reads the context Netlify sets for each request", () => {
    (globalThis as { Netlify?: unknown }).Netlify = {
      context: { deploy: { context: "deploy-preview" } },
    };
    expect(isProductionDeploy()).toBe(false);
  });

  it("counts a deploy Netlify says nothing about as production", () => {
    expect(isProductionDeploy()).toBe(true);
    (globalThis as { Netlify?: unknown }).Netlify = { context: null };
    expect(isProductionDeploy()).toBe(true);
  });
});
