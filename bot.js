// ===============================
// 🤖 Helper Extreme Bot
// ===============================

require("dotenv").config();
const { Telegraf } = require("telegraf");
const axios = require("axios");
const { loadDB, saveDB, getUser } = require("./db");
const express = require("express");

// ===============================
// 🔹 Init Bot
// ===============================
const bot = new Telegraf(process.env.BOT_TOKEN);
let db = loadDB();

// 🔹 Owners & Force Join Channels
const OWNERS = process.env.OWNERS.split(",");
const FORCE_CHANNELS = process.env.FORCE_CHANNELS.split(",");

// ===============================
// 🔹 Helper Functions
// ===============================
function isOwner(id) {
  return OWNERS.includes(id.toString());
}

async function checkForceJoin(ctx) {
  if (!FORCE_CHANNELS || FORCE_CHANNELS.length === 0) return true;

  for (let ch of FORCE_CHANNELS) {
    try {
      let res = await ctx.telegram.getChatMember(ch, ctx.from.id);
      if (["left", "kicked"].includes(res.status)) return false;
    } catch (e) {
      return false;
    }
  }
  return true;
}

// ===============================
// 🔹 User Commands
// ===============================

// /start with referral
bot.start(async (ctx) => {
  const userId = ctx.from.id.toString();
  const args = ctx.message.text.split(" ");
  const referrer = args[1];

  let user = getUser(db, userId);

  if (referrer && referrer !== userId && !user.referredBy) {
    user.referredBy = referrer;
    if (!db.referrals[referrer]) db.referrals[referrer] = [];
    db.referrals[referrer].push(userId);

    // Give coins to referrer
    let refUser = getUser(db, referrer);
    refUser.coins += 4;
  }

  saveDB(db);

  ctx.reply(
    `👀 Welcome ${ctx.from.first_name}!\n\nUse /activate after joining required channels.`
  );
});

// /activate
bot.command("activate", async (ctx) => {
  let ok = await checkForceJoin(ctx);
  if (!ok) {
    return ctx.reply(
      `⚠️ Please join all channels first:\n\n${FORCE_CHANNELS.join("\n")}`
    );
  }
  ctx.reply("✅ Bot activated! You can now use all commands.");
});

// /coins
bot.command("coins", (ctx) => {
  let user = getUser(db, ctx.from.id.toString());
  ctx.reply(`🏅 You have ${user.coins} coins.`);
});

// /myreferrals
bot.command("myreferrals", (ctx) => {
  let list = db.referrals[ctx.from.id] || [];
  ctx.reply(
    `🙌🏻 Total Refers = ${list.length} User(s)\n\n🪢 Your Invite Link = https://t.me/${ctx.botInfo.username}?start=${ctx.from.id}\n🏅 You will receive 4 coins per invite.`
  );
});

// /topreferrers
bot.command("topreferrers", (ctx) => {
  let arr = Object.entries(db.referrals).map(([id, refs]) => ({
    id,
    count: refs.length,
  }));
  arr.sort((a, b) => b.count - a.count);

  let msg = "🏆 Top Referrers:\n\n";
  arr.slice(0, 10).forEach((u, i) => {
    msg += `${i + 1}. ${u.id} → ${u.count} refs\n`;
  });

  ctx.reply(msg);
});

// ===============================
// 🔹 Owner Commands
// ===============================

// /broadcast
bot.command("broadcast", async (ctx) => {
  if (!isOwner(ctx.from.id)) return;
  let text = ctx.message.text.split(" ").slice(1).join(" ");
  if (!text) return ctx.reply("❌ Usage: /broadcast <text>");

  for (let id of Object.keys(db.users)) {
    try {
      await ctx.telegram.sendMessage(id, `📢 Broadcast:\n${text}`);
    } catch {}
  }
  ctx.reply("✅ Broadcast sent.");
});

// /send_coins
bot.command("send_coins", (ctx) => {
  if (!isOwner(ctx.from.id)) return;
  let [id, amount] = ctx.message.text.split(" ").slice(1);
  if (!id || !amount) return ctx.reply("❌ Usage: /send_coins <id> <amount>");

  let user = getUser(db, id);
  user.coins += parseInt(amount);
  saveDB(db);
  ctx.reply(`✅ Sent ${amount} coins to ${id}.`);
});

// /back_coins
bot.command("back_coins", (ctx) => {
  if (!isOwner(ctx.from.id)) return;
  let [id, amount] = ctx.message.text.split(" ").slice(1);
  if (!id || !amount) return ctx.reply("❌ Usage: /back_coins <id> <amount>");

  let user = getUser(db, id);
  user.coins = Math.max(0, user.coins - parseInt(amount));
  saveDB(db);
  ctx.reply(`✅ Removed ${amount} coins from ${id}.`);
});

// /clear_coins
bot.command("clear_coins", (ctx) => {
  if (!isOwner(ctx.from.id)) return;
  let id = ctx.message.text.split(" ")[1];
  if (!id) return ctx.reply("❌ Usage: /clear_coins <id>");

  let user = getUser(db, id);
  user.coins = 0;
  saveDB(db);
  ctx.reply(`✅ Cleared coins for ${id}.`);
});

// ===============================
// 🔹 API Commands
// ===============================

// /sim
bot.command("sim", async (ctx) => {
  let number = ctx.message.text.split(" ")[1];
  if (!number) return ctx.reply("❌ Usage: /sim <number>");
  try {
    let res = await axios.get(`https://legendxdata.site/Api/simdata.php?phone=${number}`);
    let data = res.data;
    if (!data || data.length === 0) return ctx.reply("❌ No data found.");

    let info = data[0];
    ctx.reply(
      `📱 Mobile: ${info["Mobile #"]}\n👤 Name: ${info["Name"]}\n🆔 CNIC: ${info["CNIC"]}\n🏠 Address: ${info["Address"]}\n📡 Operator: ${info["Operator"]}`
    );
  } catch {
    ctx.reply("❌ Error fetching SIM data.");
  }
});

// /ip
bot.command("ip", async (ctx) => {
  let ip = ctx.message.text.split(" ")[1];
  if (!ip) return ctx.reply("❌ Usage: /ip <address>");
  try {
    let res = await axios.get(`https://ipinfo.rishuapi.workers.dev/?ip=${ip}`);
    let d = res.data;
    if (!d.success) return ctx.reply("❌ Invalid IP.");

    ctx.reply(`🌍 IP: ${d.ip}\n📍 City: ${d.city}\n🏴 Country: ${d.country}\n🛰 ISP: ${d.connection.isp}`);
  } catch {
    ctx.reply("❌ Error fetching IP data.");
  }
});

// /weather
bot.command("weather", async (ctx) => {
  let city = ctx.message.text.split(" ")[1];
  if (!city) return ctx.reply("❌ Usage: /weather <city>");
  try {
    let res = await axios.get(`https://wttr.in/${city}?format=%C+%t+%w`);
    ctx.reply(`🌤 Weather in ${city}: ${res.data}`);
  } catch {
    ctx.reply("❌ Error fetching weather.");
  }
});

// ===============================
// 🔹 Launch Bot
// ===============================
bot.launch();
console.log("✅ Bot is running...");

// ===============================
// 🔹 Express Keep-Alive for Render
// ===============================
const app = express();
const PORT = process.env.PORT || 3000;
app.get("/", (req, res) => res.send("Bot is alive!"));
app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));

// Graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
