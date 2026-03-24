const express = require("express");
const fetch = require("node-fetch");
const TelegramBot = require("node-telegram-bot-api");
const bodyParser = require("body-parser");

// 基础配置
const PORT = process.env.PORT || 3000;
const TOKEN = process.env.TELEGRAM_TOKEN;
const OPENWEATHER_KEY = process.env.OPENWEATHER_KEY;

const app = express();
const bot = new TelegramBot(TOKEN, { polling: true });

app.use(express.static(__dirname));
app.use(bodyParser.json());

// 获取天气的核心函数 (已改用 OpenWeather)
async function getTemp() {
    // 默认城市设为伦敦，你可以改成其他城市
    const city = "London";
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OPENWEATHER_KEY}&units=metric`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.cod !== 200) throw new Error(data.message);

        return {
            temp: data.main.temp,
            wind: data.wind.speed,
            cloud: data.clouds.all
        };
    } catch (e) {
        console.error("天气抓取失败:", e.message);
        // 返回保底数据，防止页面崩溃
        return { temp: "--", wind: "--", cloud: "--" };
    }
}

// 网页路由
app.get("/api/weather", async (req, res) => {
    const weather = await getTemp();
    res.json(weather);
});

// 根目录渲染一个简单的 HTML (确保你有一个 index.html 或者直接返回文字)
app.get("/", (req, res) => {
    res.send(`
        <html>
            <body style="font-family:sans-serif; text-align:center; padding-top:50px;">
                <h1>Weather Oracle</h1>
                <div id="data">Loading...</div>
                <script>
                    fetch('/api/weather')
                        .then(r => r.json())
                        .then(d => {
                            document.getElementById('data').innerHTML = 
                                '<h2>Current Temp: ' + d.temp + '°C</h2>' +
                                '<p>Wind: ' + d.wind + ' m/s</p >' +
                                '<p>Clouds: ' + d.cloud + '%</p >';
                        });
                </script>
            </body>
        </html>
    `);
});

// Telegram 机器人逻辑
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const weather = await getTemp();
    bot.sendMessage(chatId, `你好！当前温度是: ${weather.temp}°C\n风速: ${weather.wind} m/s\n云量: ${weather.cloud}%`);
});

app.listen(PORT, () => {
    console.log(`服务器已启动，端口: ${PORT}`);
});
;

setInterval(checkTemp, 30000);
checkTemp();


