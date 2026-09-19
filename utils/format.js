function escapeHTML(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

export function formatGooz({ gooz, attacker, victims, points }) {
    const victimsText = victims.length === 0
        ? "هیچکس 😭"
        : victims.map(victim => `• ${escapeHTML(victim.name)}`).join("\n");

    return [
        `<b>${escapeHTML(gooz.name)}</b>`,
        `<b>قدرت:</b> ${gooz.power}/10`,
        "",
        escapeHTML(gooz.description),
        "",
        `👤 <b>گوززننده</b>`,
        escapeHTML(attacker),
        "",
        `☣️ <b>افراد مسموم‌شده</b>`,
        victimsText,
        "",
        `🏆 <b>گوز پوینت</b>`,
        `<b>+${points}</b>`
    ].join("\n");
}

export function formatStats({ name, points, totalGoozes, timesVictim, goozTypes }) {
    const typesText = goozTypes.length === 0
        ? "هنوز چیزی ثبت نشده 💨"
        : goozTypes.map(gooz => `• ${escapeHTML(gooz.gooz_name)} — ${gooz.count}`).join("\n");

    return [
        `📊 <b>آمار ${escapeHTML(name)}</b>`,
        "",
        `🏆 <b>گوز پوینت‌ها</b>`,
        `${points}`,
        "",
        `💨 <b>تعداد کل گوزها</b>`,
        `${totalGoozes}`,
        "",
        `🎯 <b>تعداد دفعات قربانی شدن</b>`,
        `${timesVictim}`,
        "",
        `📋 <b>انواع گوزها</b>`,
        typesText
    ].join("\n");
}

export function formatTop(leaderboard) {
    const medals = ["🥇", "🥈", "🥉"];

    const usersText = leaderboard
        .map((user, index) => {
            const rank = medals[index] ?? `#${index + 1}`;

            return [
                `${rank} <b>${escapeHTML(user.name)}</b>`,
                `   🏆 ${user.points} گوز پوینت دریافت شده`,
                `   💨 ${user.total_goozes} گوز زده شده`,
                `   🎯 ${user.times_victim || 0} بار قربانی شده`
            ].join("\n");
        })
        .join("\n\n");

    return [
        `🏆 <b>بهترین گوزو‌ها</b>`,
        "",
        usersText
    ].join("\n");
}

export function formatHelp() {
    return [
        `📚 <b>راهنمای ربات گوز مستر</b>`,
        "",
        `💨 به بات گوز مستر خوش آمدید!`,
        "",
        `<b>دستورات موجود:</b>`,
        "",
        `🔸 /gooz - یه گوز بزن و ببین کی مسموم می‌شه!`,
        `   هر گوز یه قدرت خاصی داره که تعیین می‌کنه چند نفر رو مسموم کنی.`,
        "",
        `📊 /stats - آمار شخصی خودت رو ببین`,
        `   شامل: گوز پوینت، تعداد گوزها، دفعات قربانی شدن و انواع گوزهایی که زدی.`,
        "",
        `🏆 /top - رتبه‌بندی گروه رو ببین`,
        `   ۱۰ نفر برتر گروه رو بر اساس گوز پوینت نشون می‌ده.`,
        "",
        `❓ /help - نمایش این راهنما`,
        "",
        `<b>قوانین:</b>`,
        "• هر ۵ دقیقه می‌تونی یه گوز بزنی.",
        "• گوزهای قوی‌تر افراد بیشتری رو مسموم می‌کنن.",
        "• هر چی بیشتر گوز بزنی، پوینت بیشتری می‌گیری!",
        "",
        `🎉 خوش بگذره! 💨`
    ].join("\n");
}
