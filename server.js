const express = require("express");
const fetch = require("node-fetch");
const TelegramBot = require("node-telegram-bot-api");
const Stripe = require("stripe");
const bodyParser = require("body-parser");

// 1. 基础配置
const PORT = process.env.PORT || 3000;
const OPENWEATHER_KEY = process.env.OPENWEATHER_KEY;
const stripe = Stripe(process.env.STRIPE_SECRET || "sk_test_mock");
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

const app = express();
app.use(express.static(__dirname));
app.use(bodyParser.json());

// 2. 获取天气函数 (OpenWeather)
async function getTemp() {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=London,uk&appid=${OPENWEATHER_KEY}&units=metric`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        return {
            temp: data.main ? data.main.temp : "--",
            wind: data.wind ? data.wind.speed : "--",
            cloud: data.clouds ? data.clouds.all : "--"
        };
    } catch (e) {
        console.error("天气获取失败:", e);
        return { temp: 15, wind: 5, cloud: 10 };
    }
}

// 3. 修复报错：定义 checkTemp 函数
async function checkTemp() {
    const weather = await getTemp();
    console.log(`当前定时检查温度: ${weather.temp}°C`);
}

// 启动定时器 (每30秒检查一次)
setInterval(checkTemp, 30000);

// 4. 支付路由 (Stripe)
app.post("/create-checkout-session", async (req, res) => {
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [{
                price_data: {
                    currency: "gbp",
                    product_data: { name: "高级天气预报订阅" },
                    unit_amount: 500, // 5.00 GBP
                },
                quantity: 1,
            }],
            mode: "payment",
            success_url: `https://${req.get('host')}/success.html`,
            cancel_url: `https://${req.get('host')}/index.html`,
        });
        res.json({ id: session.id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 5. 网页 API
app.get("/api/weather", async (req, res) => {
    const weather = await getTemp();
    res.json(weather);
});

// 机器人回复
bot.onText(/\/start/, async (msg) => {
    const weather = await getTemp();
    bot.sendMessage(msg.chat.id, `你好！当前温度是: ${weather.temp}°C。网页端支持 Stripe 支付订阅。`);
});

app.listen(PORT, () => {
    console.log(`服务器启动成功！端口: ${PORT}`);
});
