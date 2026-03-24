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

// 模拟 Met Office 的高精度抓取
async function getMetStyleWeather(city = "London") {
    // 增加 lang=en 确保描述准确
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OPENWEATHER_KEY}&units=metric&lang=en`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.cod !== 200) return { error: data.message };

        return {
            city: data.name,
            // 核心：0.1°C 绝对精度
            temp: data.main.temp.toFixed(1), 
            feels_like: data.main.feels_like.toFixed(1),
            pressure: data.main.pressure, // 气压是 Met Office 预测下雨的关键
            humidity: data.main.humidity,
            wind: (data.wind.speed * 2.237).toFixed(1), // 英国习惯用 mph (英里/小时)
            desc: data.weather[0].description.toUpperCase(),
            icon: data.weather[0].icon
        };
    } catch (e) {
        return { error: "Station Offline" };
    }
}

app.get("/api/weather/:city?", async (req, res) => {
    const city = req.params.city || "London";
    const weather = await getMetStyleWeather(city);
    res.json(weather);
});

bot.onText(/\/start ?(.*)/, async (msg, match) => {
    const city = match[1] || "London";
    const w = await getMetStyleWeather(city);
    if (w.error) {
        bot.sendMessage(msg.chat.id, `⚠️ Error: City not found.`);
    } else {
        bot.sendMessage(msg.chat.id, `🇬🇧 Met-Style Report: ${w.city}\n\nTemp: ${w.temp}°C\nFeels: ${w.feels_like}°C\nWind: ${w.wind} mph\nHumidity: ${w.humidity}%\nPressure: ${w.pressure} hPa\n\nCondition: ${w.desc}`);
    }
});

app.listen(PORT, () => console.log("Precision Met-Style Server Active"));

