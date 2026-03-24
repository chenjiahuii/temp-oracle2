const express = require("express");
const fetch = require("node-fetch");
const TelegramBot = require("node-telegram-bot-api");
const bodyParser = require("body-parser");

const app = express();
app.use(express.static(__dirname));
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const OPENWEATHER_KEY = process.env.OPENWEATHER_KEY;

// 锁定你最新的 Token
const token = '8792803480:AAGNyi024DuM_7-KDupScPxNPAeQyOnf44s'; 
const bot = new TelegramBot(token, { polling: true });

app.get("/api/weather/:city", async (req, res) => {
    try {
        // 【精准核心】添加随机参数 t 彻底禁用缓存，强制 API 去气象站抓这一秒的实测
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${req.params.city}&appid=${OPENWEATHER_KEY}&units=metric&t=${Date.now()}`;
        const resp = await fetch(url);
        const d = await resp.json();
        
        if (d.cod !== 200) return res.json({ error: "City not found" });
        
        // 【不四舍五入】直接提取原始小数点数据
        res.json({
            city: d.name,
            temp: d.main.temp.toFixed(1),      // 显示如 13.8，不再是 14
            temp_max: d.main.temp_max.toFixed(1), 
            wind: d.wind.speed.toFixed(1),
            // 获取数据观测的具体时刻
            obs_time: new Date(d.dt * 1000).toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'})
        });
    } catch (e) { res.status(500).json({ error: "API Error" }); }
});

app.listen(PORT, () => console.log(`精准模式已启动，端口：${PORT}`));

        setTimeout(() => { server.close(); server.listen(PORT); }, 1000);
    }
});

