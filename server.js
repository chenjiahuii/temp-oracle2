const express = require("express");
const fetch = require("node-fetch");
const TelegramBot = require("node-telegram-bot-api");
const path = require("path");

const app = express();
app.use(express.static(__dirname));

// 自动获取 Railway 端口
const PORT = process.env.PORT || 3000;
const OPENWEATHER_KEY = '8309191d9e794348a735c05562723707';
// 使用你最新的 Token
const token = '8792803480:AAHTii_MZya-yDARduHVoR3JUt5aHXNSgbo';

// 启动机器人，加一个错误处理防止程序崩溃
const bot = new TelegramBot(token, { polling: true });
bot.on('polling_error', (error) => console.log('机器人连接中...'));

// 天气 API
app.get("/api/weather/:city", async (req, res) => {
    try {
        const city = req.params.city;
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OPENWEATHER_KEY}&units=metric`;
        const resp = await fetch(url);
        const d = await resp.json();
        
        if (d.cod !== 200) return res.json({ error: "City not found" });
        
        res.json({
            city: d.name,
            temp: d.main.temp.toFixed(1), 
            temp_max: d.main.temp_max.toFixed(1), 
            wind: (d.wind.speed * 2.237).toFixed(1), // 转为 mph
            obs_time: new Date().toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'})
        });
    } catch (e) {
        res.status(500).json({ error: "Server Error" });
    }
});

// 机器人回复逻辑
bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const city = msg.text;
    if (city === "/start") return bot.sendMessage(chatId, "请输入城市名查询天气（如: London）");

    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OPENWEATHER_KEY}&units=metric`;
        const resp = await fetch(url);
        const d = await resp.json();
        if (d.cod === 200) {
            bot.sendMessage(chatId, `📍 ${d.name}\n🌡️ 实测温度: ${d.main.temp.toFixed(1)}°C\n💨 风速: ${(d.wind.speed * 2.237).toFixed(1)} mph`);
        }
    } catch (e) {
        bot.sendMessage(chatId, "查询失败");
    }
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
});


app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});

