const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const app = express();
const PORT = 3001;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

const dbConfig = {
  host: process.env.DB_HOST || "field-db",
  user: process.env.DB_USER || "field_user",
  password: process.env.DB_PASSWORD || "field_password",
  database: process.env.DB_NAME || "field_db",
  port: 3306
};

let db;

async function connectWithRetry(retries = 20, delay = 3000) {
  for (let i = 1; i <= retries; i++) {
    try {
      db = await mysql.createConnection(dbConfig);
      console.log("Field Service terhubung ke MySQL");
      return;
    } catch (e) {
      console.log(`Menunggu MySQL... percobaan ${i}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

async function initDatabase() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS fields (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      type VARCHAR(50) NOT NULL,
      price_per_hour INT NOT NULL,
      is_available BOOLEAN DEFAULT true
    )
  `);
  const [rows] = await db.execute("SELECT COUNT(*) AS total FROM fields");
  if (rows[0].total === 0) {
    await db.execute(`
      INSERT INTO fields (name, type, price_per_hour) VALUES
      ("Lapangan Futsal A", "Futsal", 100000),
      ("Lapangan Badminton 1", "Badminton", 75000),
      ("Lapangan Tennis", "Tennis", 120000)
    `);
  }
}

app.get("/health", (req, res) => {
  res.json({ service: "field-service", status: "running" });
});

app.get("/fields", async (req, res) => {
  try {
    const [fields] = await db.execute("SELECT * FROM fields");
    res.json({ data: fields });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/fields/:id", async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM fields WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json({ data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/fields", async (req, res) => {
  try {
    const { name, type, price_per_hour } = req.body || {};
    if (!name || !type || !price_per_hour) {
      return res.status(400).json({ error: "name, type, price_per_hour required" });
    }
    const [result] = await db.execute(
      "INSERT INTO fields (name, type, price_per_hour) VALUES (?, ?, ?)",
      [name, type, price_per_hour]
    );
    res.status(201).json({ id: result.insertId, name, type, price_per_hour });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/fields/:id", async (req, res) => {
  try {
    const { name, type, price_per_hour, is_available } = req.body || {};
    const id = req.params.id;
    
    // Get current values
    const [current] = await db.execute("SELECT * FROM fields WHERE id = ?", [id]);
    if (!current.length) return res.status(404).json({ error: "Not found" });
    
    // Use new values or keep existing
    const n = name !== undefined ? name : current[0].name;
    const t = type !== undefined ? type : current[0].type;
    const p = price_per_hour !== undefined ? price_per_hour : current[0].price_per_hour;
    const a = is_available !== undefined ? is_available : current[0].is_available;
    
    await db.execute(
      "UPDATE fields SET name=?, type=?, price_per_hour=?, is_available=? WHERE id=?",
      [n, t, p, a, id]
    );
    res.json({ id, name: n, type: t, price_per_hour: p, is_available: a });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/fields/:id", async (req, res) => {
  try {
    await db.execute("DELETE FROM fields WHERE id = ?", [req.params.id]);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function startServer() {
  await connectWithRetry();
  await initDatabase();
  app.listen(PORT, "0.0.0.0", () => console.log(`Field Service on port ${PORT}`));
}
startServer();
