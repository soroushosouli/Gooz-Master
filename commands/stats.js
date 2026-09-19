import db from "../database/db.js";
import { formatStats } from "../utils/format.js";
import { queueMessage } from "../services/messageQueue.js";

// Prepared statements cache
const statements = {
    getUserByTelegramId: null,
    getStats: null,
    getGoozTypes: null
};

function initStatements() {
    if (statements.getUserByTelegramId) return;
    
    statements.getUserByTelegramId = db.prepare(`SELECT id, name FROM users WHERE telegram_id = ?`);
    statements.getStats = db.prepare(`SELECT points, total_goozes, times_victim FROM stats WHERE user_id = ?`);
    statements.getGoozTypes = db.prepare(`SELECT gooz_name, COUNT(*) AS count FROM gooz_history WHERE user_id = ? GROUP BY gooz_name ORDER BY count DESC`);
}

export async function statsCommand(ctx) {
    initStatements();

    const telegramId = String(ctx.from.id);
    const user = statements.getUserByTelegramId.get(telegramId);

    if (!user) {
        return queueMessage(ctx, "💨 هنوز هیچ آماری برای تو ثبت نشده!");
    }

    const stats = statements.getStats.get(user.id);

    if (!stats) {
        return queueMessage(ctx, "💨 هنوز هیچ گوزی نزدی!");
    }

    const goozTypes = statements.getGoozTypes.all(user.id);

    const message = formatStats({
        name: user.name,
        points: stats.points,
        totalGoozes: stats.total_goozes,
        timesVictim: stats.times_victim || 0,
        goozTypes
    });

    await queueMessage(ctx, message, { parse_mode: "HTML" });
}
