import { readFileSync } from "fs";
import { join } from "path";
import { readDB } from "./_github.js";

const SCRIPT_PATH = join(process.cwd(), "public/script.js");

export default async function handler(req, res) {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: "Token required" });

  let db;
  try {
    ({ db } = await readDB());
  } catch {
    return res.status(500).json({ error: "Storage error" });
  }

  const entry = db.tokens.find((t) => t.token === token);
  if (!entry) return res.status(403).json({ error: "Invalid token" });
  if (!entry.active) return res.status(403).json({ error: "Token disabled" });
  if (entry.maxUsage > 0 && entry.usageCount >= entry.maxUsage)
    return res.status(403).json({ error: "Usage limit reached" });

  let script;
  try {
    script = readFileSync(SCRIPT_PATH, "utf8");
  } catch {
    return res.status(500).json({ error: "Script not found" });
  }

  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(script);
}
