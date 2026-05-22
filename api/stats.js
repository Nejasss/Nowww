import { readDB } from "./_github.js";

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

  res.status(200).json({
    usageCount: entry.usageCount,
    maxUsage: entry.maxUsage,
    active: entry.active,
    label: entry.label,
  });
}
