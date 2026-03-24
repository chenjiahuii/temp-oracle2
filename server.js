const express = require("express");
const fetch = require("node-fetch");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
app.use(express.static(__dirname));

// 必须这样写，Railway 分配什么我们都接住
const PORT = process.env.PORT || 3000; 
const OPENWEATHER_KEY = '8309191d9e794348a735c05562723707';
const token = '8792803480:AAHTii_MZya-yDARduHVoR3JUt5aHXNSgbo';

const bot = new TelegramBot(token, { polling: true });
bot.on('polling_error', () => {}); 

app.get("/api/weather/:city", async (req, res) => {
    try {
        const city = req.params.city;
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OPENWEATHER_KEY}&units=metric`;
        const resp = await fetch(url);
        const d = await resp.json();
        
        res.json({
            city: d.name,
            temp: d.main.temp.toFixed(1), 
            temp_max: d.main.temp_max.toFixed(1), 
            wind: (d.wind.speed * 2.237).toFixed(1),
            obs_time: new Date().toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'})
        });
    } catch (e) {
        res.json({ error: "err" });
    }
});

// 这里必须用 PORT 变量
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server ON PORT: ${PORT}`);
});


app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
});
