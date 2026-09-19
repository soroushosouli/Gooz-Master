import { Telegraf } from "telegraf";
import express from "express";
import "dotenv/config";

import { initializeDatabase } from "./database/init.js";
import { trackUser } from "./events/tracker.js";

import { goozCommand } from "./commands/gooz.js";
import { statsCommand } from "./commands/stats.js";
import { topCommand } from "./commands/top.js";
import { helpCommand } from "./commands/help.js";
import { shopCommand, itemsCommand, sniperCommand, handleCallbackQuery } from "./commands/shop.js";
import { activateMaskCommand, activatePepperCommand } from "./commands/activate.js";

initializeDatabase();

const bot = new Telegraf(process.env.BOT_TOKEN);

// Tracker middleware
bot.use((ctx, next) => {
    trackUser(ctx);
    return next();
});

// Commands
bot.command("gooz", goozCommand);
bot.command("stats", statsCommand);
bot.command("top", topCommand);
bot.command("help", helpCommand);
bot.command("shop", shopCommand);
bot.command("items", itemsCommand);
bot.command("sniper", sniperCommand);
bot.command("mask", activateMaskCommand);
bot.command("pepper", activatePepperCommand);

// Callback query handler for inline keyboards
bot.on("callback_query", handleCallbackQuery);

// Start command
bot.start((ctx) => {
    ctx.reply(
        "💨 <b>ربات گوز مستر آماده است!</b>\n\n" +
        "🎉 خوش اومدی!\n" +
        "اینجا می‌تونی با زدن گوز، دوستات رو مسموم کنی و پوینت بگیری!\n\n" +
        "<b>دستورات:</b>\n" +
        "💨 /gooz - یه گوز بزن!\n" +
        "📊 /stats - آمار خودت رو ببین\n" +
        "🏆 /top - رتبه‌بندی گروه رو ببین\n" +
        "🛒 /shop - فروشگاه آیتم‌ها\n" +
        "🎒 /items - آیتم‌های خریداری شده\n" +
        "🔫 /sniper - استفاده از اسنایپر (نیاز به خرید)\n" +
        "🥽 /mask - فعال کردن ماسک شیمیایی (نیاز به خرید)\n" +
        "🌶️ /pepper - فعال کردن فلفل (نیاز به خرید)\n" +
        "📚 /help - راهنما",
        { parse_mode: "HTML" }
    );
});

// Ping command (Used for tests)
bot.command("ping", (ctx) => {
    ctx.reply("💨 Pong!");
});

// Error handler
bot.catch((err) => {
    console.error("Bot error:", err);
});

// Tiny HTTP server for Render
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("💨 Gooz Master is running!");
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`HTTP server running on port ${PORT}`);
});

// Launch bot
bot.launch();
console.log("💨 Gooz Bot is running!");
