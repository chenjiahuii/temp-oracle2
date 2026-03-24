const express = require("express");
const fetch = require("node-fetch");
const TelegramBot = require("node-telegram-bot-api");
const bodyParser = require("body-parser");

const app = express();
app.use(express.static(__dirname));
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const OPENWEATHER_KEY = process.env.OPENWEATHER_KEY;

// 【关键】直接锁死你截图中的最新 Token，确保万无一失
const token = '8792803480:AAGNyi024DuM_7-KDupScPxNPAeQyOnf44s';
const bot = new TelegramBot(token, { polling: true });

// 监听机器人报错，防止程序崩溃
bot.on('polling_error', (error) => console.log('Bot Polling Error:', error.code));

let alerts = {};

// 获取天气
app.get("/api/weather/:city", async (req, res) => {
    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${req.params.city}&appid=${OPENWEATHER_KEY}&units=metric&_=${Date.now()}`;
        const resp = await fetch(url);
        const d = await resp.json();
        if (d.cod !== 200) return res.json({ error: "City not found" });
        res.json({
            city: d.name,
            temp: d.main.temp.toFixed(1),
            temp_max: d.main.temp_max.toFixed(1),
            feels_like: d.main.feels_like.toFixed(1),
            wind: d.wind.speed,
            humidity: d.main.humidity
        });
    } catch (e) { res.status(500).json({ error: "API Error" }); }
});

// 联想搜索接口
app.get("/api/geo/:q", async (req, res) => {
    try {
        const url = `https://api.openweathermap.org/geo/1.0/direct?q=${req.params.q}&limit=5&appid=${OPENWEATHER_KEY}`;
        const resp = await fetch(url);
        const data = await resp.json();
        res.json(data);
    } catch (e) { res.json([]); }
});

// 设置预警接口
app.post("/api/set-alert", (req, res) => {
    const { chatId, threshold, city } = req.body;
    if(!chatId || !threshold) return res.json({ success: false });
    alerts[chatId] = { threshold: parseFloat(threshold), city };
    console.log(`Alert set for ${chatId} at ${threshold}°C`);
    res.json({ success: true });
});

// 每 10 分钟自动巡检温度
setInterval(async () => {
    for (const chatId in alerts) {
        const { threshold, city } = alerts[chatId];
        try {
            const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OPENWEATHER_KEY}&units=metric`;
            const resp = await fetch(url);
            const d = await resp.json();
            if (d.main && d.main.temp >= threshold) {
                bot.sendMessage(chatId, `🔔 温度预警！\n📍 城市: ${city}\n🌡 当前温度: ${d.main.temp}°C\n⏫ 你的预警值: ${threshold}°C`);
            }
        } catch (e) { console.log("Check loop error"); }
    }
}, 600000);

// 修复端口冲突：增加监听错误处理
const server = app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.log('Port in use, retrying...');
        setTimeout(() => { server.close(); server.listen(PORT); }, 1000);
    }
});

