import { readDB, writeDB } from "./_github.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "Token required" });

  let db, sha;
  try {
    ({ db, sha } = await readDB());
  } catch {
    return res.status(500).json({ error: "Storage error" });
  }

  const idx = db.tokens.findIndex((t) => t.token === token);
  if (idx === -1) return res.status(404).json({ error: "Token not found" });

  db.tokens[idx].usageCount++;

  try {
    await writeDB(db, sha);
  } catch {
    return res.status(500).json({ error: "Write error" });
  }

  res.status(200).json({ usageCount: db.tokens[idx].usageCount });
}
