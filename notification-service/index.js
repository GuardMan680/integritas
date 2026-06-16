const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const app = express();
const PORT = 3004;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cors());

const dbConfig = {
  host:     process.env.DB_HOST     || "notification-db",
  user:     process.env.DB_USER     || "notification_user",
  password: process.env.DB_PASSWORD || "notification_password",
  database: process.env.DB_NAME     || "notification_db",
  port:     5432,
};

let db;

async function connectWithRetry(retries = 20, delay = 3000) {
  for (let i = 1; i <= retries; i++) {
    try {
      db = new Pool(dbConfig);
      await db.query("SELECT 1");
      console.log("Notification Service terhubung ke PostgreSQL");
      return;
    } catch (e) {
      console.log(`Menunggu PostgreSQL... percobaan ${i}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

async function initDatabase() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id         SERIAL PRIMARY KEY,
      user_name  VARCHAR(100) NOT NULL,
      message    TEXT NOT NULL,
      type       VARCHAR(50) NOT NULL,
      is_read    BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

app.get("/health", (req, res) => {
  res.json({ service: "notification-service", status: "running" });
});

app.get("/notifications", async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT id, user_name, message, type, is_read, created_at FROM notifications ORDER BY created_at DESC"
    );
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/notifications", async (req, res) => {
  try {
    const { user_name, message, type } = req.body || {};
    if (!user_name || !message) {
      return res.status(400).json({ error: "user_name dan message wajib diisi" });
    }
    const notifType = type || "info";
    const { rows } = await db.query(
      "INSERT INTO notifications (user_name, message, type) VALUES ($1, $2, $3) RETURNING id",
      [user_name, message, notifType]
    );
    res.status(201).json({ id: rows[0].id, user_name, message, type: notifType });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/notifications/:id", async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT id, user_name, message, type, is_read, created_at FROM notifications WHERE id=$1",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json({ data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/notifications/user/:name", async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT id, user_name, message, type, is_read, created_at FROM notifications WHERE user_name=$1 ORDER BY created_at DESC",
      [req.params.name]
    );
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/notifications/:id/read", async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT id FROM notifications WHERE id=$1",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    await db.query("UPDATE notifications SET is_read=true WHERE id=$1", [req.params.id]);
    res.json({ message: "Notifikasi ditandai dibaca" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/notifications/:id", async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT id FROM notifications WHERE id=$1",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    await db.query("DELETE FROM notifications WHERE id=$1", [req.params.id]);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function startServer() {
  await connectWithRetry();
  await initDatabase();
  app.listen(PORT, "0.0.0.0", () => console.log(`Notification Service on port ${PORT}`));
}
startServer();