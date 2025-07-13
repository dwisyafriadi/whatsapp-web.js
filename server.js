const express = require("express");
const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");
const crypto = require("crypto");

const app = express();
app.use(express.json());

// Daftar IP yang diizinkan akses API
const allowedIPs = [
    "127.0.0.1",
    "::1",
    // tambahkan IP lain sesuai kebutuhan
];

// Secret key untuk HMAC
const SECRET = "your-very-secret-key";

// Fungsi format waktu jadi ddmmyyyyHHmm (contoh: 130720251530)
function formatDateKey(date) {
    const pad = (n) => n.toString().padStart(2, "0");
    const DD = pad(date.getDate());
    const MM = pad(date.getMonth() + 1);
    const YYYY = date.getFullYear();
    const HH = pad(date.getHours());
    const mm = pad(date.getMinutes());
    return `${DD}${MM}${YYYY}${HH}${mm}`;
}

// Fungsi generate HMAC dari string waktu
function generateApiKey(date = new Date()) {
    const base = formatDateKey(date);
    const hmac = crypto.createHmac("sha256", SECRET);
    hmac.update(base);
    return hmac.digest("hex");
}

// Validasi API Key dengan toleransi ±5 menit
function validateApiKey(key) {
    const now = new Date();

    for (let i = -5; i <= 5; i++) {
        const testDate = new Date(now.getTime() + i * 60 * 1000);
        const validKey = generateApiKey(testDate);
        if (key === validKey) return true;
    }

    return false;
}

// Middleware IP whitelist
function ipWhitelist(req, res, next) {
    let clientIP = req.ip;
    if (clientIP.startsWith("::ffff:")) {
        clientIP = clientIP.substring(7);
    }
    if (allowedIPs.includes(clientIP)) {
        next();
    } else {
        res.status(403).json({
            error: "Access denied: Your IP is not allowed",
        });
    }
}

// Middleware cek API Key (hash saja)
function apiKeyMiddleware(req, res, next) {
    const key = req.headers["x-api-key"];
    if (key && validateApiKey(key)) {
        next();
    } else {
        res.status(401).json({
            error: "Unauthorized: Invalid or expired API Key",
        });
    }
}

let qrCodeString = null;
let qrImageBuffer = null;
let isReady = false;

const client = new Client({ authStrategy: new LocalAuth() });

client.on("qr", async (qr) => {
    qrCodeString = qr;
    qrImageBuffer = await QRCode.toBuffer(qr, { type: "png" });
});

client.on("ready", () => {
    isReady = true;
    qrCodeString = null;
    qrImageBuffer = null;
});

client.initialize();

app.use(ipWhitelist);
app.use(apiKeyMiddleware);

app.get("/status-api", (req, res) => {
    res.json({
        status: isReady ? "ready" : "not ready",
        hasQR: !!qrCodeString,
    });
});

app.get("/status-api/qr", (req, res) => {
    if (!qrImageBuffer)
        return res.status(404).json({ error: "QR code not available" });
    res.setHeader("Content-Type", "image/png");
    res.send(qrImageBuffer);
});

app.post("/send-otp", async (req, res) => {
    if (!isReady) {
        return res.status(503).json({
            success: false,
            error: "WhatsApp client not connected. Please login (scan QR) first.",
        });
    }

    const { number, message } = req.body;
    const formattedNumber = number.includes("@c.us")
        ? number
        : `${number}@c.us`;

    try {
        const sentMessage = await client.sendMessage(formattedNumber, message);
        res.json({ success: true, id: sentMessage.id._serialized });
    } catch (error) {
        console.error("Error saat kirim pesan:", error.message || error);
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
