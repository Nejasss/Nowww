import { readFileSync } from "fs";
import { join } from "path";
import { readDB } from "./_github.js";

const SCRIPT_PATH = join(process.cwd(), "public/script.js");

// XOR each byte with repeating key derived from token
function xorEncode(text, token) {
  const key = token.split("").map(c => c.charCodeAt(0));
  const buf = Buffer.from(text, "utf8");
  for (let i = 0; i < buf.length; i++) buf[i] ^= key[i % key.length];
  return buf.toString("base64");
}

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

  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(xorEncode(script, token));
}
