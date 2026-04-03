const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "invoice_db",
  password: "123456",
  port: 5432,
});

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

app.post("/send-otp", async (req, res) => {
  const { phone } = req.body;

  const otp = generateOTP();
  const expiry = new Date(Date.now() + 5 * 60000);

  await pool.query(
    "INSERT INTO phone_otp (phone, otp, expiry) VALUES ($1,$2,$3)",
    [phone, otp, expiry]
  );

  console.log("OTP:", otp);

  res.json({ success: true });
});

app.post("/verify-otp", async (req, res) => {
  const { phone, otp } = req.body;

  const result = await pool.query(
    "SELECT * FROM phone_otp WHERE phone=$1 AND otp=$2 ORDER BY id DESC LIMIT 1",
    [phone, otp]
  );

  if (result.rows.length === 0) {
    return res.json({ success: false });
  }

  res.json({ success: true });
});

app.listen(5000, () => console.log("Server running on 5000"));
