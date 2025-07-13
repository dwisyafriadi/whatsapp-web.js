const express = require("express");
const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");

const app = express();
app.use(express.json());

// Daftar IP yang diijinkan akses API
const allowedIPs = [
    "127.0.0.1", // localhost IPv4
    "::1", // localhost IPv6
    // Tambah IP lain yang diizinkan disini
];

// Middleware cek IP whitelist
function ipWhitelist(req, res, next) {
    // Normalize IPv4 mapped IPv6 address
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

// Pasang middleware IP whitelist sebelum route
app.use(ipWhitelist);

app.get("/status-api", (req, res) => {
    res.json({
        status: isReady ? "ready" : "not ready",
        hasQR: !!qrCodeString,
    });
});

app.get("/status-api/qr", (req, res) => {
    if (!qrImageBuffer) return res.status(404).send("QR code not available");
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
