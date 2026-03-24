const express = require("express");
const fetch = require("node-fetch");
const TelegramBot = require("node-telegram-bot-api");
const bodyParser = require("body-parser");

const app = express();
app.use(express.static(__dirname));
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const OPENWEATHER_KEY = process.env.OPENWEATHER_KEY;

// 解决 404：直接使用你最新的有效 Token
const token = '8792803480:AAGNyi024DuM_7-KDupScPxNPAeQyOnf44s'; 
const bot = new TelegramBot(token, { polling: true });

// 存储用户设置的提醒：{ chatId: { threshold: 25, city: 'London' } }
let alerts = {};

// 1. 获取天气接口 (含今日最高温)
app.get("/api/weather/:city", async (req, res) => {
    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${req.params.city}&appid=${OPENWEATHER_KEY}&units=metric`;
        const resp = await fetch(url);
        const d = await resp.json();
        if (d.cod !== 200) return res.json({ error: "City not found" });
        res.json({
            city: d.name,
            temp: d.main.temp.toFixed(1),
            temp_max: d.main.temp_max.toFixed(1), 
            feels_like: d.main.feels_like.toFixed(1),
            wind: d.wind.speed,
            humidity: d.main.humidity,
            pressure: d.main.pressure
        });
    } catch (e) { res.status(500).json({ error: "API Error" }); }
});

// 2. 模糊搜索地理编码接口
app.get("/api/geo/:q", async (req, res) => {
    const url = `https://api.openweathermap.org/geo/1.0/direct?q=${req.params.q}&limit=5&appid=${OPENWEATHER_KEY}`;
    const resp = await fetch(url);
    const data = await resp.json();
    res.json(data);
});

// 3. 处理网页发来的提醒设置
app.post("/api/set-alert", (req, res) => {
    const { chatId, threshold, city } = req.body;
    alerts[chatId] = { threshold: parseFloat(threshold), city };
    res.json({ success: true });
});

// 4. 定时巡检：每 10 分钟检查一次温度并推送给设置过的用户
setInterval(async () => {
    for (const chatId in alerts) {
        const { threshold, city } = alerts[chatId];
        try {
            const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OPENWEATHER_KEY}&units=metric`;
            const resp = await fetch(url);
            const d = await resp.json();
            if (d.main && d.main.temp >= threshold) {
                bot.sendMessage(chatId, `🔔 温度预警！\n📍 城市: ${city}\n🌡 当前温度: ${d.main.temp}°C\n⏫ 你设置的阈值: ${threshold}°C`);
            }
        } catch (e) { console.log("Check failed"); }
    }
}, 600000);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


