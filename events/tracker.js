import db from "../database/db.js";


// Prepared statements cache for better performance
const statements = {
    selectGroupByTelegramId: null,
    selectUserByTelegramId: null,
    insertGroup: null,
    insertUser: null,
    insertGroupUser: null,
    selectMembersByGroupId: null
};


function initStatements() {
    if (statements.selectGroupByTelegramId) return; // Already initialized
    
    statements.selectGroupByTelegramId = db.prepare(`
        SELECT id FROM groups WHERE telegram_id = ?
    `);
    
    statements.selectUserByTelegramId = db.prepare(`
        SELECT id FROM users WHERE telegram_id = ?
    `);
    
    statements.insertGroup = db.prepare(`
        INSERT OR IGNORE INTO groups (telegram_id, name) VALUES (?, ?)
    `);
    
    statements.insertUser = db.prepare(`
        INSERT OR IGNORE INTO users (telegram_id, name, username) VALUES (?, ?, ?)
    `);
    
    statements.insertGroupUser = db.prepare(`
        INSERT OR IGNORE INTO group_users (group_id, user_id) VALUES (?, ?)
    `);
    
    statements.selectMembersByGroupId = db.prepare(`
        SELECT users.telegram_id, users.name
        FROM users
        JOIN group_users ON users.id = group_users.user_id
        WHERE group_users.group_id = ?
    `);
}


export function trackUser(ctx) {

    if (!ctx.from || !ctx.chat) {
        return;
    }

    // Only group and supergroup
    if (
        ctx.chat.type !== "group" &&
        ctx.chat.type !== "supergroup"
    ) {
        return;
    }

    // Initialize prepared statements
    initStatements();

    const telegramUserId = String(ctx.from.id);
    const name = ctx.from.first_name ?? "Unknown";
    const username = ctx.from.username ?? null;

    const telegramGroupId = String(ctx.chat.id);
    const groupName = ctx.chat.title ?? "Unknown";

    // Make group if doesn't exist
    statements.insertGroup.run(telegramGroupId, groupName);

    const group = statements.selectGroupByTelegramId.get(telegramGroupId);

    // Make user if doesn't exist
    statements.insertUser.run(telegramUserId, name, username);

    const user = statements.selectUserByTelegramId.get(telegramUserId);

    // Connect user to group
    statements.insertGroupUser.run(group.id, user.id);

}