// Env vars needed:
//   GH_TOKEN   — GitHub personal access token (repo scope)
//   GH_REPO    — e.g. "username/repo-name"
//   GH_PATH    — e.g. "data/tokens.json"

const BASE = "https://api.github.com";
const HEADERS = {
  Authorization: `Bearer ${process.env.GH_TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "Content-Type": "application/json",
};

const REPO = process.env.GH_REPO;   // "user/repo"
const PATH = process.env.GH_PATH || "data/tokens.json";

/** @returns {{ db: object, sha: string }} */
export async function readDB() {
  const res = await fetch(`${BASE}/repos/${REPO}/contents/${PATH}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`GitHub read failed: ${res.status}`);
  const json = await res.json();
  const content = Buffer.from(json.content, "base64").toString("utf8");
  return { db: JSON.parse(content), sha: json.sha };
}

/** @param {object} db - full DB object, @param {string} sha - current file SHA */
export async function writeDB(db, sha) {
  const content = Buffer.from(JSON.stringify(db, null, 2)).toString("base64");
  const res = await fetch(`${BASE}/repos/${REPO}/contents/${PATH}`, {
    method: "PUT",
    headers: HEADERS,
    body: JSON.stringify({
      message: "chore: update tokens",
      content,
      sha,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub write failed: ${res.status}`);
  }
  return res.json();
}
