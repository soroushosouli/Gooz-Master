import db from "../database/db.js";
import { formatTop } from "../utils/format.js";
import { queueMessage } from "../services/messageQueue.js";

// Prepared statements cache
const statements = {
    getGroupByTelegramId: null,
    getLeaderboard: null
};

function initStatements() {
    if (statements.getGroupByTelegramId) return;
    
    statements.getGroupByTelegramId = db.prepare(`SELECT id FROM groups WHERE telegram_id = ?`);
    statements.getLeaderboard = db.prepare(`
        SELECT users.name, stats.points, stats.total_goozes, stats.times_victim
        FROM group_users
        JOIN users ON users.id = group_users.user_id
        JOIN stats ON stats.user_id = users.id
        WHERE group_users.group_id = ?
        ORDER BY stats.points DESC
        LIMIT 10
    `);
}

export async function topCommand(ctx) {
    if (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup") {
        return queueMessage(ctx, "🏆 این دستور فقط داخل گروه کار می‌کنه!");
    }

    initStatements();

    const group = statements.getGroupByTelegramId.get(String(ctx.chat.id));

    if (!group) {
        return queueMessage(ctx, "⏳ هنوز اطلاعات این گروه ثبت نشده.");
    }

    const leaderboard = statements.getLeaderboard.all(group.id);

    if (leaderboard.length === 0) {
        return queueMessage(ctx, "🏆 هنوز کسی گوز پوینت نگرفته!");
    }

    const message = formatTop(leaderboard);

    await queueMessage(ctx, message, { parse_mode: "HTML" });
}
