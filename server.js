const express = require("express");
const fetch = require("node-fetch");
const TelegramBot = require("node-telegram-bot-api");
const bodyParser = require("body-parser");

const app = express();
app.use(express.static(__dirname));
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
// 这里直接帮你写死 Key，省得变量又出问题
const OPENWEATHER_KEY = '8309191d9e794348a735c05562723707';
const token = '8792803480:AAGNyi024DuM_7-KDupScPxNPAeQyOnf44s';

const bot = new TelegramBot(token, { polling: true });

app.get("/api/weather/:city", async (req, res) => {
    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${req.params.city}&appid=${OPENWEATHER_KEY}&units=metric&t=${Date.now()}`;
        const resp = await fetch(url);
        const d = await resp.json();
        
        if (d.cod !== 200) return res.json({ error: "City not found" });
        
        res.json({
            city: d.name,
            temp: d.main.temp.toFixed(1), // 精确到 13.x
            temp_max: d.main.temp_max.toFixed(1), 
            wind: d.wind.speed.toFixed(1),
            obs_time: new Date(d.dt * 1000).toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'})
        });
    } catch (e) {
        res.status(500).json({ error: "API Error" });
    }
});

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});

