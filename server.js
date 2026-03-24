const express = require("express");
const fetch = require("node-fetch");
const TelegramBot = require("node-telegram-bot-api");
const bodyParser = require("body-parser");

const app = express();
app.use(express.static(__dirname));
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const OPENWEATHER_KEY = process.env.OPENWEATHER_KEY;

// 使用你截图里那个最新的有效 Token
const token = '8792803480:AAGNyi024DuM_7-KDupScPxNPAeQyOnf44s';
const bot = new TelegramBot(token, { polling: true });

let alerts = {};

// 获取天气（强制刷新模式）
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

// 模糊搜索联想
app.get("/api/geo/:q", async (req, res) => {
    const url = `https://api.openweathermap.org/geo/1.0/direct?q=${req.params.q}&limit=5&appid=${OPENWEATHER_KEY}`;
    const resp = await fetch(url);
    const data = await resp.json();
    res.json(data);
});

// 设置提醒
app.post("/api/set-alert", (req, res) => {
    const { chatId, threshold, city } = req.body;
    alerts[chatId] = { threshold: parseFloat(threshold), city };
    res.json({ success: true });
});

// 定时任务
setInterval(async () => {
    for (const chatId in alerts) {
        const { threshold, city } = alerts[chatId];
        try {
            const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OPENWEATHER_KEY}&units=metric`;
            const resp = await fetch(url);
            const d = await resp.json();
            if (d.main && d.main.temp >= threshold) {
                bot.sendMessage(chatId, `🌡️ ${city} 预警：当前 ${d.main.temp}°C 已达到你的设定值！`);
            }
        } catch (e) { console.log("Alert Error"); }
    }
}, 600000);

app.listen(PORT, () => console.log("Server Active"));


app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


