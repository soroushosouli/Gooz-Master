import db from "../database/db.js";

// Prepared statements cache
const statements = {
    getGroupByTelegramId: null,
    getMembersByGroupId: null
};

function initStatements() {
    if (statements.getGroupByTelegramId) return;
    
    statements.getGroupByTelegramId = db.prepare(`SELECT id FROM groups WHERE telegram_id = ?`);
    statements.getMembersByGroupId = db.prepare(`
        SELECT users.telegram_id, users.name
        FROM users
        JOIN group_users ON users.id = group_users.user_id
        WHERE group_users.group_id = ?
    `);
}

export function getGroupMembers(groupTelegramId, attackerId) {
    initStatements();

    const group = statements.getGroupByTelegramId.get(String(groupTelegramId));

    if (!group) {
        return [];
    }

    const members = statements.getMembersByGroupId.all(group.id);

    return members.filter(member => String(member.telegram_id) !== String(attackerId));
}

export function selectVictims(members, amount) {
    const shuffled = [...members];

    // Fisher-Yates shuffle
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, Math.min(amount, shuffled.length));
}
