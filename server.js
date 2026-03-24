const express = require("express");
const fetch = require("node-fetch");
const TelegramBot = require("node-telegram-bot-api");
const Stripe = require("stripe");
const bodyParser = require("body-parser");

const config = require("./config");

const app = express();
const bot = new TelegramBot(config.TELEGRAM_TOKEN, { polling: true });
const stripe = Stripe(config.STRIPE_SECRET);

app.use(express.static(__dirname));

// Stripe webhook 必须 raw
app.use("/webhook", bodyParser.raw({ type: "application/json" }));
app.use(express.json());

let subscribers = [];
let paidUsers = [];

let todayHigh = -100;
let lastTemp = null;

let alertedNear = false;
let alertedVeryNear = false;
let alertedReached = false;

// =======================
// Telegram 订阅（绑定邮箱）
// =======================
bot.onText(/\/start (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const email = match[1];

  if (paidUsers.includes(email)) {
    if (!subscribers.includes(chatId)) {
      subscribers.push(chatId);
    }
    bot.sendMessage(chatId, "✅ Premium Activated!");
  } else {
    bot.sendMessage(chatId, "❌ Please subscribe first");
  }
});

// =======================
// Met Office 数据
// =======================
async function getTemp() {
  const res = await fetch(
    "https://api-metoffice.apiconnect.ibmcloud.com/metoffice/production/v0/observations/point?latitude=51.47&longitude=-0.45",
    {
      headers: {
        "x-ibm-client-id": config.MET_CLIENT_ID,
        "x-ibm-client-secret": config.MET_CLIENT_SECRET
      }
    }
  );

  const data = await res.json();
  const obs = data.features[0].properties;

  return {
    temp: obs.screenTemperature,
    wind: obs.windSpeed,
    cloud: obs.cloudCover
  };
}

// =======================
// 辅助函数
// =======================
function getTrend(temp) {
  if (lastTemp === null) return "—";
  if (temp > lastTemp) return "↑";
  if (temp < lastTemp) return "↓";
  return "→";
}

function getImpact(wind, cloud) {
  let impact = [];
  if (wind > 15) impact.push("💨 Wind cooling");
  if (cloud > 70) impact.push("☁️ Cloud may reduce temp");
  return impact.join(" | ") || "Stable";
}

// =======================
// 主逻辑（温度检测）
// =======================
async function checkTemp() {
  try {
    const { temp, wind, cloud } = await getTemp();

    if (temp > todayHigh) todayHigh = temp;

    let remaining = (config.TARGET_TEMP - temp).toFixed(2);
    let trend = getTrend(temp);
    let impact = getImpact(wind, cloud);

    // 提醒逻辑
    if (temp >= config.TARGET_TEMP - 0.3 && !alertedNear) {
      subscribers.forEach(id => {
        bot.sendMessage(id, `⚠️ ${temp}°C\nOnly ${remaining}°C away`);
      });
      alertedNear = true;
    }

    if (temp >= config.TARGET_TEMP - 0.1 && !alertedVeryNear) {
      subscribers.forEach(id => {
        bot.sendMessage(id, `🔥 ${temp}°C\nVERY CLOSE`);
      });
      alertedVeryNear = true;
    }

    if (temp >= config.TARGET_TEMP && !alertedReached) {
      subscribers.forEach(id => {
        bot.sendMessage(id, `🚨 ${temp}°C\nTARGET REACHED`);
      });
      alertedReached = true;
    }

    if (temp < config.TARGET_TEMP - 0.5) {
      alertedNear = false;
      alertedVeryNear = false;
      alertedReached = false;
    }

    lastTemp = temp;

    global.latestData = {
      temp,
      remaining,
      trend,
      high: todayHigh.toFixed(2),
      impact,
      reached: temp >= config.TARGET_TEMP
    };

  } catch (err) {
    console.log("Error:", err.message);
  }
}

// =======================
// API 给前端
// =======================
app.get("/data", (req, res) => {
  res.json(global.latestData || {});
});

// =======================
// Stripe 创建支付
// =======================
app.post("/create-checkout-session", async (req, res) => {

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "subscription",

    line_items: [{
      price_data: {
        currency: "gbp",
        product_data: { name: "Temp Oracle Pro" },
        unit_amount: 500,
        recurring: { interval: "month" }
      },
      quantity: 1
    }],

    success_url: "https://你的域名/success",
    cancel_url: "https://你的域名/cancel"
  });

  res.json({ url: session.url });
});

// =======================
// Stripe Webhook（自动开通）
// =======================
app.post("/webhook", (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      config.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send("Webhook Error");
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const email = session.customer_email;

    if (!paidUsers.includes(email)) {
      paidUsers.push(email);
    }

    console.log("Paid user:", email);
  }

  res.json({ received: true });
});

// =======================
// 启动
// =======================
app.listen(3000, () => {
  console.log("Server running on port 3000");
});

setInterval(checkTemp, 30000);
checkTemp();


