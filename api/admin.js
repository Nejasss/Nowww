import { randomBytes } from "crypto";
import { readDB, writeDB } from "./_github.js";

const ADMIN_KEY = process.env.ADMIN_KEY || "change-this-secret";

export default async function handler(req, res) {
  const key = req.headers["x-admin-key"] || req.query.key;
  if (key !== ADMIN_KEY) return res.status(401).json({ error: "Unauthorized" });

  const { method } = req;
  let db, sha;

  try {
    ({ db, sha } = await readDB());
  } catch {
    return res.status(500).json({ error: "Storage error" });
  }

  // GET — list all
  if (method === "GET") {
    return res.status(200).json({ tokens: db.tokens });
  }

  // POST — create
  if (method === "POST") {
    const { label = "Unnamed", maxUsage = 0, active = true, customToken } = req.body;
    const token = customToken || randomBytes(16).toString("hex");

    if (db.tokens.find((t) => t.token === token))
      return res.status(409).json({ error: "Token already exists" });

    const entry = {
      token, label,
      maxUsage: parseInt(maxUsage),
      usageCount: 0,
      active,
      createdAt: new Date().toISOString(),
    };

    db.tokens.push(entry);
    try { await writeDB(db, sha); } catch (e) { return res.status(500).json({ error: e.message }); }
    return res.status(201).json(entry);
  }

  // PUT — edit
  if (method === "PUT") {
    const { token } = req.query;
    const idx = db.tokens.findIndex((t) => t.token === token);
    if (idx === -1) return res.status(404).json({ error: "Token not found" });

    const { label, maxUsage, active, resetUsage } = req.body;
    if (label !== undefined) db.tokens[idx].label = label;
    if (maxUsage !== undefined) db.tokens[idx].maxUsage = parseInt(maxUsage);
    if (active !== undefined) db.tokens[idx].active = active;
    if (resetUsage) db.tokens[idx].usageCount = 0;

    try { await writeDB(db, sha); } catch (e) { return res.status(500).json({ error: e.message }); }
    return res.status(200).json(db.tokens[idx]);
  }

  // DELETE
  if (method === "DELETE") {
    const { token } = req.query;
    const before = db.tokens.length;
    db.tokens = db.tokens.filter((t) => t.token !== token);
    if (db.tokens.length === before) return res.status(404).json({ error: "Token not found" });

    try { await writeDB(db, sha); } catch (e) { return res.status(500).json({ error: e.message }); }
    return res.status(200).json({ deleted: token });
  }

  res.status(405).end();
}
