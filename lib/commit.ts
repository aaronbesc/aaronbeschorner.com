import { execSync } from "node:child_process";

// Resolved at build time. Vercel exposes the deployed commit as system
// environment variables; locally we fall back to asking git directly.
export function getLatestCommit(): string {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  const message = process.env.VERCEL_GIT_COMMIT_MESSAGE;
  if (sha && message) {
    return `${sha.slice(0, 7)} ${message.split("\n")[0]}`;
  }

  try {
    return execSync("git log -1 --oneline", { encoding: "utf8" }).trim();
  } catch {
    return "uncommitted changes";
  }
}
