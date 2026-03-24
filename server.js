const express = require("express");
const fetch = require("node-fetch");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
app.use(express.static(__dirname));

// 这里的端口逻辑最重要：必须同时兼容 Railway 的动态分配和 8080 备用
const PORT = process.env.PORT || 8080; 
const OPENWEATHER_KEY = '8309191d9e794348a735c05562723707';
// 确认这是你最新的 Token (NSgbo 结尾)
const token = '8792803480:AAHTii_MZya-yDARduHVoR3JUt5aHXNSgbo';

const bot = new TelegramBot(token, { polling: true });
bot.on('polling_error', (error) => console.log('Bot is connecting...'));

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
            wind: (d.wind.speed * 2.237).toFixed(1),
            obs_time: new Date().toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'})
        });
    } catch (e) {
        res.status(500).json({ error: "Server Error" });
    }
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
});


