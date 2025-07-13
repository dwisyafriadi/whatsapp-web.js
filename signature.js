const crypto = require("crypto");
const SECRET = "your-very-secret-key";

function formatDateKey(date) {
    const pad = (n) => n.toString().padStart(2, "0");
    const DD = pad(date.getDate());
    const MM = pad(date.getMonth() + 1);
    const YYYY = date.getFullYear();
    const HH = pad(date.getHours());
    const mm = pad(date.getMinutes());
    return `${DD}${MM}${YYYY}${HH}${mm}`;
}

function generateApiKey(date = new Date()) {
    const base = formatDateKey(date);
    const hmac = crypto.createHmac("sha256", SECRET);
    hmac.update(base);
    return hmac.digest("hex");
}

console.log(generateApiKey()); // Kirim hasil ini di header x-api-key
