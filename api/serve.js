import { readFileSync } from "fs";
import { join } from "path";
import { readDB } from "./_github.js";
import { webcrypto } from "crypto";

const SCRIPT_PATH = join(process.cwd(), "public/script.js");

// Must match loader derivation: SHA-256(token + reversed_token)
async function deriveKey(token) {
  const raw = token + token.split("").reverse().join("");
  const kb = await webcrypto.subtle.digest("SHA-256", Buffer.from(raw));
  return webcrypto.subtle.importKey("raw", kb, "AES-GCM", false, ["encrypt"]);
}

async function encryptScript(plaintext, token) {
  const key = await deriveKey(token);
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const enc = await webcrypto.subtle.encrypt({ name: "AES-GCM", iv }, key, Buffer.from(plaintext));
  return Buffer.concat([Buffer.from(iv), Buffer.from(enc)]).toString("base64");
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

  const encrypted = await encryptScript(script, token);
  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(encrypted);
}
