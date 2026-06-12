const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();
const PORT = 3002;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

const FIELD_SERVICE_URL = "http://field-service:3001";
const MONGO_URI = "mongodb://booking_user:booking_password@booking-db:27017/booking_db?authSource=admin";

// Connect directly and insert using raw mongo, no schema
let db;

async function connectWithRetry(retries = 20, delay = 3000) {
  for (let i = 1; i <= retries; i++) {
    try {
      await mongoose.connect(MONGO_URI);
      console.log("Booking Service connected to MongoDB");
      db = mongoose.connection.db;
      return;
    } catch (e) {
      console.log(`Waiting for MongoDB... attempt ${i}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

app.get("/health", (req, res) => {
  res.json({ service: "booking-service", status: "running" });
});

app.get("/bookings", async (req, res) => {
  try {
    const bookings = await db.collection("bookings").find().sort({ createdAt: -1 }).toArray();
    res.json({ data: bookings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/bookings/:id", async (req, res) => {
  try {
    const ObjectId = require("mongodb").ObjectId;
    const b = await db.collection("bookings").findOne({ _id: new ObjectId(req.params.id) });
    if (!b) return res.status(404).json({ error: "Not found" });
    res.json({ data: b });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/bookings", async (req, res) => {
  try {
    const { user_name, field_id, date, start_time, end_time, duration_hours } = req.body || {};
    if (!user_name || !field_id || !date || !start_time || !end_time || !duration_hours) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    const fieldRes = await fetch(`${FIELD_SERVICE_URL}/fields/${field_id}`);
    if (!fieldRes.ok) return res.status(404).json({ error: "Field not found" });
    const fieldData = await fieldRes.json();
    const field = fieldData.data;
    const total_price = field.price_per_hour * duration_hours;
    
    const booking = {
      user_name,
      field_id,
      date,
      start_time,
      end_time,
      duration_hours,
      total_price,
      field_snapshot: { id: field.id, name: field.name, type: field.type, price_per_hour: field.price_per_hour },
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection("bookings").insertOne(booking);
    booking._id = result.insertedId;
    res.status(201).json(booking);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/bookings/:id/status", async (req, res) => {
  try {
    const { status } = req.body || {};
    const allowed = ["pending", "confirmed", "cancelled", "completed"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Invalid status", allowed });
    }
    const ObjectId = require("mongodb").ObjectId;
    const result = await db.collection("bookings").findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: { status, updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    res.json(result.value);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/bookings/:id", async (req, res) => {
  try {
    const ObjectId = require("mongodb").ObjectId;
    await db.collection("bookings").deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function startServer() {
  await connectWithRetry();
  app.listen(PORT, "0.0.0.0", () => console.log(`Booking Service on port ${PORT}`));
}
startServer();
