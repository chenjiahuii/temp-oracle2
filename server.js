const express = require("express");
const fetch = require("node-fetch");
const TelegramBot = require("node-telegram-bot-api");
const bodyParser = require("body-parser");

const app = express();
app.use(express.static(__dirname));
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const OPENWEATHER_KEY = process.env.OPENWEATHER_KEY;
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

// 关键：用于存储每个用户的提醒设置
// 格式: { "ChatID": { threshold: 25, city: "London", lastNotified: 0 } }
let alerts = {};

// 1. 获取天气接口 (增加最高温)
app.get("/api/weather/:city", async (req, res) => {
    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${req.params.city}&appid=${OPENWEATHER_KEY}&units=metric`;
        const resp = await fetch(url);
        const d = await resp.json();
        if (d.cod !== 200) return res.json({ error: "City not found" });
        res.json({
            city: d.name,
            temp: d.main.temp.toFixed(1),
            temp_max: d.main.temp_max.toFixed(1), // 最高温
            feels_like: d.main.feels_like.toFixed(1),
            wind: d.wind.speed,
            humidity: d.main.humidity,
            pressure: d.main.pressure
        });
    } catch (e) { res.status(500).json({ error: "API Error" }); }
});

// 2. 搜索联想接口
app.get("/api/geo/:q", async (req, res) => {
    const url = `https://api.openweathermap.org/geo/1.0/direct?q=${req.params.q}&limit=5&appid=${OPENWEATHER_KEY}`;
    const resp = await fetch(url);
    const data = await resp.json();
    res.json(data);
});

// 3. 用户设置提醒的接口
app.post("/api/set-alert", (req, res) => {
    const { chatId, threshold, city } = req.body;
    if(!chatId || !threshold) return res.json({ success: false });
    alerts[chatId] = { 
        threshold: parseFloat(threshold), 
        city: city || "London",
        lastNotified: 0 
    };
    console.log(`Alert set for ${chatId}: ${threshold}°C at ${city}`);
    res.json({ success: true });
});

// 4. 自动化逻辑：每 10 分钟巡检一次所有用户的设置
setInterval(async () => {
    const now = Date.now();
    for (const chatId in alerts) {
        const config = alerts[chatId];
        // 1小时内不重复提醒，防止轰炸
        if (now - config.lastNotified < 3600000) continue; 

        try {
            const url = `https://api.openweathermap.org/data/2.5/weather?q=${config.city}&appid=${OPENWEATHER_KEY}&units=metric`;
            const resp = await fetch(url);
            const d = await resp.json();
            
            if (d.main && d.main.temp >= config.threshold) {
                bot.sendMessage(chatId, `🔔 温度预警！\n📍 城市: ${config.city}\n🌡 当前温度: ${d.main.temp}°C\n⏫ 你设置的阈值: ${config.threshold}°C`);
                config.lastNotified = now; // 更新提醒时间
            }
        } catch (e) { console.log("Check failed", e); }
    }
}, 600000); // 每 10 分钟检查一次

app.listen(PORT, () => console.log(`Server running on ${PORT}`));


