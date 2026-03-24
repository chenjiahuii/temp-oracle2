const express = require("express");
const fetch = require("node-fetch");
const TelegramBot = require("node-telegram-bot-api");
const bodyParser = require("body-parser");

const PORT = process.env.PORT || 3000;
const OPENWEATHER_KEY = process.env.OPENWEATHER_KEY;
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

const app = express();
app.use(express.static(__dirname));
app.use(bodyParser.json());

// 存储用户预警设置 (格式: { chatId: { city: 'London', threshold: 25 } })
let userSettings = {};

async function getMetStyleWeather(city = "London") {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OPENWEATHER_KEY}&units=metric&lang=en`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.cod !== 200) return { error: data.message };
        return {
            city: data.name,
            temp: parseFloat(data.main.temp.toFixed(1)), 
            temp_max: data.main.temp_max.toFixed(1),
            temp_min: data.main.temp_min.toFixed(1),
            feels_like: data.main.feels_like.toFixed(1),
            wind: (data.wind.speed * 2.237).toFixed(1),
            humidity: data.main.humidity,
            pressure: data.main.pressure,
            desc: data.weather[0].description.toUpperCase()
        };
    } catch (e) { return { error: "Offline" }; }
}

// 接口：让网页前端保存预警设置
app.post("/api/alert", (req, res) => {
    const { chatId, city, threshold } = req.body;
    if(!chatId || !city || !threshold) return res.status(400).json({msg: "Missing data"});
    userSettings[chatId] = { city, threshold: parseFloat(threshold) };
    console.log(`用户 ${chatId} 设置了 ${city} 预警线: ${threshold}°C`);
    res.json({ success: true });
});

// 核心功能：每 30 分钟检查一次所有用户的预警
setInterval(async () => {
    console.log("正在执行后台温度巡检...");
    for (const chatId in userSettings) {
        const { city, threshold } = userSettings[chatId];
        const w = await getMetStyleWeather(city);
        if (!w.error && w.temp >= threshold) {
            bot.sendMessage(chatId, `⚠️ 预警：${city} 当前温度已达 ${w.temp}°C，超过了你设定的 ${threshold}°C！`);
        }
    }
}, 1800000); // 1800000 毫秒 = 30 分钟

// 机器人回复设置提醒
bot.onText(/\/alert (.*) (.*)/, (msg, match) => {
    const city = match[1];
    const threshold = match[2];
    userSettings[msg.chat.id] = { city, threshold: parseFloat(threshold) };
    bot.sendMessage(msg.chat.id, `✅ 设置成功！当 ${city} 温度超过 ${threshold}°C 时，我会立刻提醒你。`);
});

app.get("/api/weather/:city?", async (req, res) => {
    const weather = await getMetStyleWeather(req.params.city || "London");
    res.json(weather);
});

app.listen(PORT, () => console.log("Precision Met-Style Server with Alerts Active"));


