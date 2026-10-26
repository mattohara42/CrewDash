import { getDeployStore, getStore, type Store } from "@netlify/blobs";

// Site-wide Blobs stores are shared by every deploy of a site, so a deploy preview or branch
// deploy would read and write the club's real data. Only production uses them. Every other
// deploy gets stores of its own that start empty, so testing a branch can't change real
// results, settings or alert subscriptions.

type NetlifyGlobal = { Netlify?: { context?: { deploy?: { context?: string } } | null } };

/** "production", "deploy-preview", "branch-deploy" or "dev", or null when Netlify doesn't say. */
function deployContext(): string | null {
  return (globalThis as NetlifyGlobal).Netlify?.context?.deploy?.context ?? null;
}

/**
 * True on production. A context Netlify doesn't report counts as production, so the live
 * site always finds its data. The cost is that such a deploy isn't isolated.
 */
export function isProductionDeploy(context: string | null = deployContext()): boolean {
  return context === null || context === "production";
}

/** A Blobs store by name: the site-wide one on production, this deploy's own elsewhere. */
export function clubStore(name: string): Store {
  return isProductionDeploy()
    ? getStore({ name, consistency: "strong" })
    : getDeployStore({ name, consistency: "strong" });
}
