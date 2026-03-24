const express = require("express");
const fetch = require("node-fetch");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
app.use(express.static(__dirname));

// 自动识别 Railway 端口
const PORT = process.env.PORT || 3000;
const OPENWEATHER_KEY = '8309191d9e794348a735c05562723707';

// 这里是你发给我的最新 Token
const token = '8792803480:AAHTii_MZya-yDARduHVoR3JUt5aHXNSgbo';

// 启动机器人，加个简单报错处理
const bot = new TelegramBot(token, { polling: true });
bot.on('polling_error', (error) => console.log('Bot Reconnecting...'));

app.get("/api/weather/:city", async (req, res) => {
    try {
        const city = req.params.city;
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OPENWEATHER_KEY}&units=metric`;
        const resp = await fetch(url);
        const d = await resp.json();
        
        if (d.cod !== 200) return res.json({ error: "City not found" });
        
        res.json({
            city: d.name,
            temp: d.main.temp.toFixed(1), // 强制一位小数点
            temp_max: d.main.temp_max.toFixed(1),
            wind: (d.wind.speed * 2.237).toFixed(1), // 转为 mph
            obs_time: new Date().toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'})
        });
    } catch (e) {
        res.status(500).json({ error: "Server Error" });
    }
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server started on port ${PORT}`);
});
;

