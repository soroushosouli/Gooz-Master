import db from "../database/db.js";

// Prepared statements cache
const statements = {
    getCooldown: null,
    setCooldown: null
};

function initStatements() {
    if (statements.getCooldown) return;

    statements.getCooldown = db.prepare(`SELECT last_gooz FROM cooldowns WHERE user_id = ? AND group_id = ?`);
    statements.setCooldown = db.prepare(`
        INSERT INTO cooldowns (user_id, group_id, last_gooz)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, group_id) DO UPDATE SET last_gooz = excluded.last_gooz
    `);
}

export function canGooz(userId, groupId, customCooldownMs = null) {
    initStatements();

    const result = statements.getCooldown.get(userId, groupId);

    if (!result) {
        return { allowed: true, remaining: 0 };
    }

    const cooldownTime = customCooldownMs !== null ? customCooldownMs : 5 * 60 * 1000; // Default 5 minutes
    const last = new Date(result.last_gooz).getTime();
    const remaining = cooldownTime - (Date.now() - last);

    if (remaining <= 0) {
        return { allowed: true, remaining: 0 };
    }

    return { allowed: false, remaining };
}

export function setCooldown(userId, groupId) {
    initStatements();

    statements.setCooldown.run(userId, groupId, new Date().toISOString());
}
