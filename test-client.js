const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

const client = new Client({
    authStrategy: new LocalAuth(),
});

client.on("qr", (qr) => {
    // Generate dan tampilkan QR di terminal
    qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
    console.log("Client is ready!");
});

client.on("message", (message) => {
    console.log(`Message from ${message.from}: ${message.body}`);

    // Contoh reply otomatis
    if (message.body === "ping") {
        message.reply("pong");
    }
});

client.initialize();
