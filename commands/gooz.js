import db from "../database/db.js";
import { getRandomGooz } from "../services/randomGooz.js";
import { getGroupMembers, selectVictims } from "../services/victims.js";
import { canGooz, setCooldown } from "../services/cooldown.js";
import { formatGooz } from "../utils/format.js";
import { queueMessage } from "../services/messageQueue.js";

// Prepared statements cache for better performance
const statements = {
    getUserByTelegramId: null,
    getGroupByTelegramId: null,
    insertGoozHistory: null,
    updateStats: null,
    updateVictimStats: null
};

function initStatements() {
    if (statements.getUserByTelegramId) return;
    
    statements.getUserByTelegramId = db.prepare(`SELECT id FROM users WHERE telegram_id = ?`);
    statements.getGroupByTelegramId = db.prepare(`SELECT id FROM groups WHERE telegram_id = ?`);
    statements.insertGoozHistory = db.prepare(`INSERT INTO gooz_history (group_id, user_id, gooz_name, power, victims) VALUES (?, ?, ?, ?, ?)`);
    statements.updateStats = db.prepare(`INSERT INTO stats (user_id, points, total_goozes) VALUES (?, ?, 1) ON CONFLICT(user_id) DO UPDATE SET points = points + excluded.points, total_goozes = total_goozes + 1`);
    statements.updateVictimStats = db.prepare(`INSERT INTO stats (user_id, times_victim) VALUES (?, 1) ON CONFLICT(user_id) DO UPDATE SET times_victim = times_victim + 1`);
}

function getVictimAmount(power) {
    if (power >= 10) return 6;
    if (power >= 9) return 5;
    if (power >= 8) return 4;
    if (power >= 7) return 3;
    if (power >= 5) return 2;
    if (power >= 3) return 1;
    return 0;
}

export async function goozCommand(ctx) {
    if (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup") {
        return queueMessage(ctx, "💨 این دستور فقط داخل گروه کار می‌کنه!");
    }

    initStatements();

    const userId = statements.getUserByTelegramId.get(String(ctx.from.id))?.id;
    const groupId = statements.getGroupByTelegramId.get(String(ctx.chat.id))?.id;

    if (!userId || !groupId) {
        return queueMessage(ctx, "⏳ هنوز اطلاعات گروه ثبت نشده.");
    }

    const cooldown = canGooz(userId, groupId);

    if (!cooldown.allowed) {
        const minutes = Math.ceil(cooldown.remaining / 60000);
        return queueMessage(ctx, `⏳ هنوز گوزت اماده نیست!\n${minutes} دقیقه دیگه دوباره امتحان کن.`);
    }

    const gooz = getRandomGooz();
    const members = getGroupMembers(ctx.chat.id, ctx.from.id);
    const victimAmount = getVictimAmount(gooz.power);
    const victims = selectVictims(members, victimAmount);
    const points = victims.length;

    setCooldown(userId, groupId);
    statements.insertGoozHistory.run(groupId, userId, gooz.name, gooz.power, victims.length);
    statements.updateStats.run(userId, points);

    // Update victim stats
    for (const victim of victims) {
        const victimDbId = statements.getUserByTelegramId.get(String(victim.telegram_id))?.id;
        if (victimDbId) {
            statements.updateVictimStats.run(victimDbId);
        }
    }

    const message = formatGooz({ gooz, attacker: ctx.from.first_name, victims, points });

    await queueMessage(ctx, message, { parse_mode: "HTML" });
}
