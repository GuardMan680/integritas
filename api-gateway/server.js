const express = require("express");
const cors = require("cors");
const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

const FIELD_URL    = "http://field-service:3001";
const BOOKING_URL  = "http://booking-service:3002";
const PAYMENT_URL  = "http://payment-service:3003";
const NOTIF_URL    = "http://notification-service:3004";
const REPORT_URL   = "http://report-service:8000";

app.get("/", (req, res) => res.json({ service: "api-gateway", status: "ok" }));
app.get("/health", (req, res) => res.json({ service: "api-gateway", status: "running" }));

// Request logging middleware
app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    console.log(`[${req.method}] ${req.path}`, JSON.stringify(req.body).slice(0, 100));
  }
  next();
});

async function proxyRequest(method, url, body = null) {
  console.log(`Proxy ${method} ${url} with body:`, body ? JSON.stringify(body).slice(0, 100) : "null");
  const options = { 
    method, 
    headers: { 
      "Content-Type": "application/json",
      "User-Agent": "api-gateway"
    } 
  };
  if (body && ["POST", "PUT", "PATCH"].includes(method)) {
    options.body = JSON.stringify(body);
  }
  const response = await fetch(url, options);
  const text = await response.text();
  console.log(`Response ${response.status}: ${text.slice(0, 100)}`);
  try {
    return { status: response.status, data: JSON.parse(text) };
  } catch {
    return { status: response.status, data: { error: text } };
  }
}

// FIELDS
app.get("/fields", async (req, res) => {
  const { status, data } = await proxyRequest("GET", `${FIELD_URL}/fields`);
  res.status(status).json(data);
});

app.post("/fields", async (req, res) => {
  const { status, data } = await proxyRequest("POST", `${FIELD_URL}/fields`, req.body);
  res.status(status).json(data);
});

app.get("/fields/:id", async (req, res) => {
  const { status, data } = await proxyRequest("GET", `${FIELD_URL}/fields/${req.params.id}`);
  res.status(status).json(data);
});

app.put("/fields/:id", async (req, res) => {
  const { status, data } = await proxyRequest("PUT", `${FIELD_URL}/fields/${req.params.id}`, req.body);
  res.status(status).json(data);
});

app.delete("/fields/:id", async (req, res) => {
  const { status, data } = await proxyRequest("DELETE", `${FIELD_URL}/fields/${req.params.id}`);
  res.status(status).json(data);
});

// BOOKINGS
app.get("/bookings", async (req, res) => {
  const { status, data } = await proxyRequest("GET", `${BOOKING_URL}/bookings`);
  res.status(status).json(data);
});

app.post("/bookings", async (req, res) => {
  const { status, data } = await proxyRequest("POST", `${BOOKING_URL}/bookings`, req.body);
  res.status(status).json(data);
});

app.get("/bookings/:id", async (req, res) => {
  const { status, data } = await proxyRequest("GET", `${BOOKING_URL}/bookings/${req.params.id}`);
  res.status(status).json(data);
});

app.put("/bookings/:id/status", async (req, res) => {
  const { status, data } = await proxyRequest("PUT", `${BOOKING_URL}/bookings/${req.params.id}/status`, req.body);
  res.status(status).json(data);
});

app.delete("/bookings/:id", async (req, res) => {
  const { status, data } = await proxyRequest("DELETE", `${BOOKING_URL}/bookings/${req.params.id}`);
  res.status(status).json(data);
});

// PAYMENTS
app.get("/payments", async (req, res) => {
  const { status, data } = await proxyRequest("GET", `${PAYMENT_URL}/payments`);
  res.status(status).json(data);
});

app.post("/payments", async (req, res) => {
  const { status, data } = await proxyRequest("POST", `${PAYMENT_URL}/payments`, req.body);
  res.status(status).json(data);
});

app.put("/payments/:id/status", async (req, res) => {
  const { status, data } = await proxyRequest("PUT", `${PAYMENT_URL}/payments/${req.params.id}/status`, req.body);
  res.status(status).json(data);
});

app.delete("/payments/:id", async (req, res) => {
  const { status, data } = await proxyRequest("DELETE", `${PAYMENT_URL}/payments/${req.params.id}`);
  res.status(status).json(data);
});

app.get("/payments/booking/:bid", async (req, res) => {
  const { status, data } = await proxyRequest("GET", `${PAYMENT_URL}/payments/booking/${req.params.bid}`);
  res.status(status).json(data);
});

// NOTIFICATIONS
app.get("/notifications", async (req, res) => {
  const { status, data } = await proxyRequest("GET", `${NOTIF_URL}/notifications`);
  res.status(status).json(data);
});

app.post("/notifications", async (req, res) => {
  const { status, data } = await proxyRequest("POST", `${NOTIF_URL}/notifications`, req.body);
  res.status(status).json(data);
});

app.get("/notifications/user/:name", async (req, res) => {
  const { status, data } = await proxyRequest("GET", `${NOTIF_URL}/notifications/user/${req.params.name}`);
  res.status(status).json(data);
});

app.put("/notifications/:id/read", async (req, res) => {
  const { status, data } = await proxyRequest("PUT", `${NOTIF_URL}/notifications/${req.params.id}/read`, req.body);
  res.status(status).json(data);
});

app.delete("/notifications/:id", async (req, res) => {
  const { status, data } = await proxyRequest("DELETE", `${NOTIF_URL}/notifications/${req.params.id}`);
  res.status(status).json(data);
});

// REPORTS
app.get("/report/summary", async (req, res) => {
  const { status, data } = await proxyRequest("GET", `${REPORT_URL}/api/report/summary`);
  res.status(status).json(data);
});

app.get("/report/analytics", async (req, res) => {
  const { status, data } = await proxyRequest("GET", `${REPORT_URL}/api/report/analytics`);
  res.status(status).json(data);
});

app.get("/report", async (req, res) => {
  const { status, data } = await proxyRequest("GET", `${REPORT_URL}/api/report`);
  res.status(status).json(data);
});

app.get("/report/fields", async (req, res) => {
  const { status, data } = await proxyRequest("GET",`${REPORT_URL}/report/fields`);
  res.status(status).json(data);
});

app.get("/reports", async (req, res) => {
  const { status, data } = await proxyRequest("GET", `${REPORT_URL}/api/reports`);
  res.status(status).json(data);
});

app.post("/reports", async (req, res) => {
  const { status, data } = await proxyRequest("POST", `${REPORT_URL}/api/reports`, req.body);
  res.status(status).json(data);
});

app.get("/reports/:id", async (req, res) => {
  const { status, data } = await proxyRequest("GET", `${REPORT_URL}/api/reports/${req.params.id}`);
  res.status(status).json(data);
});

app.put("/reports/:id", async (req, res) => {
  const { status, data } = await proxyRequest("PUT", `${REPORT_URL}/api/reports/${req.params.id}`, req.body);
  res.status(status).json(data);
});

app.delete("/reports/:id", async (req, res) => {
  const { status, data } = await proxyRequest("DELETE", `${REPORT_URL}/api/reports/${req.params.id}`);
  res.status(status).json(data);
});

app.listen(PORT, "0.0.0.0", () => console.log(`API Gateway running on port ${PORT}`));