import fs from "fs";

const TMP_REVIEWS_FILE = "/tmp/heartsync_reviews.json";

let memoryReviews = [];
let memoryDeletedIds = new Set();

function loadReviews() {
  try {
    if (fs.existsSync(TMP_REVIEWS_FILE)) {
      const raw = fs.readFileSync(TMP_REVIEWS_FILE, "utf8");
      const parsed = JSON.parse(raw);

      const items = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.items)
          ? parsed.items
          : [];
      const delIds = Array.isArray(parsed?.deletedIds) ? parsed.deletedIds : [];

      for (const dId of delIds) {
        memoryDeletedIds.add(String(dId));
      }

      const map = new Map();
      [...items, ...memoryReviews].forEach((r) => {
        if (r && r.id && !memoryDeletedIds.has(String(r.id))) {
          map.set(String(r.id), r);
        }
      });
      memoryReviews = Array.from(map.values()).sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
      );
    }
  } catch {
    // Ignore /tmp read errors
  }
}

function saveReviews() {
  try {
    fs.writeFileSync(
      TMP_REVIEWS_FILE,
      JSON.stringify({
        items: memoryReviews.slice(0, 200),
        deletedIds: Array.from(memoryDeletedIds).slice(-200),
      }),
      "utf8"
    );
  } catch {
    // Ignore /tmp write errors
  }
}

export default async function handler(req, res) {
  loadReviews();
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method === "GET") {
    return res.status(200).json({
      items: memoryReviews.slice(0, 50),
      deletedIds: Array.from(memoryDeletedIds),
    });
  }

  if (req.method === "POST") {
    try {
      const body =
        typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};

      // Support batch sync from client to recover from serverless cold starts while respecting deletedIds
      if (Array.isArray(body.syncItems)) {
        if (Array.isArray(body.deletedIds)) {
          body.deletedIds.forEach((dId) => memoryDeletedIds.add(String(dId)));
        }
        const map = new Map();
        for (const r of [...memoryReviews, ...body.syncItems]) {
          if (
            r &&
            r.id &&
            r.text &&
            !r.isDefault &&
            !memoryDeletedIds.has(String(r.id))
          ) {
            map.set(String(r.id), r);
          }
        }
        memoryReviews = Array.from(map.values())
          .sort(
            (a, b) =>
              new Date(b.created_at || 0).getTime() -
              new Date(a.created_at || 0).getTime()
          )
          .slice(0, 200);
        saveReviews();

        return res.status(200).json({
          success: true,
          items: memoryReviews.slice(0, 50),
          deletedIds: Array.from(memoryDeletedIds),
        });
      }

      const text = String(body.text || "").trim();
      const rating = Math.min(5, Math.max(1, Number(body.rating) || 5));

      if (!text || text.length < 2) {
        return res.status(400).json({ error: "후기 내용을 입력해주세요." });
      }

      const newReview = {
        id: body.id
          ? String(body.id)
          : `rev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        text: text.slice(0, 500),
        author: String(body.author || "HeartSync 사용자")
          .trim()
          .slice(0, 50),
        rating,
        tags: Array.isArray(body.tags) ? body.tags.slice(0, 6) : [],
        created_at: body.created_at || new Date().toISOString(),
        isDefault: false,
      };

      memoryDeletedIds.delete(String(newReview.id));
      memoryReviews = [
        newReview,
        ...memoryReviews.filter(
          (r) =>
            r.id !== newReview.id && !memoryDeletedIds.has(String(r.id))
        ),
      ].slice(0, 200);

      saveReviews();

      return res.status(200).json({
        success: true,
        review: newReview,
        items: memoryReviews.slice(0, 50),
        deletedIds: Array.from(memoryDeletedIds),
      });
    } catch (err) {
      return res.status(500).json({ error: String(err?.message || err) });
    }
  }

  if (req.method === "DELETE") {
    try {
      const body =
        typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      const id = String(body.id || req.query?.id || "");
      if (id) {
        memoryDeletedIds.add(id);
        memoryReviews = memoryReviews.filter((r) => String(r.id) !== id);
        saveReviews();
      }
      return res.status(200).json({
        success: true,
        items: memoryReviews.slice(0, 50),
        deletedIds: Array.from(memoryDeletedIds),
      });
    } catch (err) {
      return res.status(500).json({ error: String(err?.message || err) });
    }
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}
