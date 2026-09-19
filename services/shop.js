import db from "../database/db.js";

// Prepared statements cache
const statements = {
    getStats: null,
    getShopItems: null,
    getUserInventory: null,
    buyItem: null,
    getActiveEffect: null,
    setActiveEffect: null,
    updateActiveEffect: null,
    consumeInventoryItem: null,
    getSniperRestriction: null,
    addSniperRestriction: null,
    getGroupMembers: null,
    getUserByTelegramId: null,
    getGroupByTelegramId: null
};

function initStatements() {
    if (statements.getStats) return;
    
    statements.getStats = db.prepare(`SELECT points FROM stats WHERE user_id = ?`);
    statements.getShopItems = db.prepare(`SELECT * FROM shop_items`);
    statements.getUserInventory = db.prepare(`SELECT ui.*, si.name, si.emoji, si.description FROM user_inventory ui JOIN shop_items si ON ui.item_key = si.item_key WHERE ui.user_id = ?`);
    statements.buyItem = db.prepare(`INSERT INTO user_inventory (user_id, item_key, quantity) VALUES (?, ?, 1) ON CONFLICT(user_id, item_key) DO UPDATE SET quantity = quantity + 1`);
    statements.getActiveEffect = db.prepare(`SELECT expires_at FROM active_effects WHERE user_id = ? AND item_key = ?`);
    statements.setActiveEffect = db.prepare(`INSERT INTO active_effects (user_id, item_key, expires_at) VALUES (?, ?, ?)`);
    statements.updateActiveEffect = db.prepare(`UPDATE active_effects SET expires_at = ? WHERE user_id = ? AND item_key = ?`);
    statements.consumeInventoryItem = db.prepare(`UPDATE user_inventory SET quantity = quantity - 1 WHERE user_id = ? AND item_key = ? AND quantity > 0`);
    statements.getSniperRestriction = db.prepare(`SELECT target_until FROM sniper_restrictions WHERE target_user_id = ? AND target_until > datetime('now')`);
    statements.addSniperRestriction = db.prepare(`INSERT INTO sniper_restrictions (sniper_user_id, target_user_id, sniper_until, target_until) VALUES (?, ?, ?, ?)`);
    statements.getGroupMembers = db.prepare(`
        SELECT users.telegram_id, users.id as db_user_id, users.name 
        FROM users 
        JOIN group_users ON users.id = group_users.user_id 
        WHERE group_users.group_id = ?
    `);
    statements.getUserByTelegramId = db.prepare(`SELECT id FROM users WHERE telegram_id = ?`);
    statements.getGroupByTelegramId = db.prepare(`SELECT id FROM groups WHERE telegram_id = ?`);
}

export function getShopItems() {
    initStatements();
    return statements.getShopItems.all();
}

export function getUserPoints(userId) {
    initStatements();
    const result = statements.getStats.get(userId);
    return result ? result.points : 0;
}

export function getUserInventory(userId) {
    initStatements();
    return statements.getUserInventory.all(userId);
}

export function buyItem(userId, itemKey) {
    initStatements();
    
    const item = db.prepare(`SELECT price FROM shop_items WHERE item_key = ?`).get(itemKey);
    if (!item) return { success: false, message: "❌ این آیتم وجود ندارد." };
    
    const points = getUserPoints(userId);
    if (points < item.price) {
        return { success: false, message: `❌ موجودی کافی نیست! شما ${points} پوینت دارید، اما این آیتم ${item.price} پوینت است.` };
    }
    
    // Deduct points
    db.prepare(`UPDATE stats SET points = points - ? WHERE user_id = ?`).run(item.price, userId);
    
    // Add item to inventory
    statements.buyItem.run(userId, itemKey);
    
    const itemName = db.prepare(`SELECT name, emoji FROM shop_items WHERE item_key = ?`).get(itemKey);
    return { 
        success: true, 
        message: `✅ ${itemName.emoji} ${itemName.name} با موفقیت خریداری شد!`,
        item: itemName
    };
}

export function hasActiveEffect(userId, itemKey) {
    initStatements();
    const effect = statements.getActiveEffect.get(userId, itemKey);
    if (!effect) return { active: false };
    
    const expiresAt = new Date(effect.expires_at).getTime();
    const now = Date.now();
    
    if (expiresAt <= now) {
        // Effect expired, clean it up
        db.prepare(`DELETE FROM active_effects WHERE user_id = ? AND item_key = ?`).run(userId, itemKey);
        return { active: false };
    }
    
    const remainingMs = expiresAt - now;
    const remainingMinutes = Math.ceil(remainingMs / 60000);
    const remainingHours = Math.floor(remainingMs / 3600000);
    
    return { 
        active: true, 
        expiresAt, 
        remainingMs,
        remainingMinutes,
        remainingHours
    };
}

export function activateTimedEffect(userId, itemKey, durationMinutes) {
    initStatements();
    
    const existingEffect = hasActiveEffect(userId, itemKey);
    const expiresAt = new Date(Date.now() + durationMinutes * 60000).toISOString();
    
    if (existingEffect.active) {
        // Extend the existing effect
        const newExpiresAt = new Date(existingEffect.expiresAt + durationMinutes * 60000).toISOString();
        statements.updateActiveEffect.run(newExpiresAt, userId, itemKey);
        return { success: true, expiresAt: newExpiresAt, extended: true };
    } else {
        statements.setActiveEffect.run(userId, itemKey, expiresAt);
        return { success: true, expiresAt, extended: false };
    }
}

export function consumeInventoryItem(userId, itemKey) {
    initStatements();
    const result = statements.consumeInventoryItem.run(userId, itemKey);
    return result.changes > 0;
}

export function isSniperRestricted(userId) {
    initStatements();
    const restriction = statements.getSniperRestriction.get(userId);
    if (!restriction) return { restricted: false };
    
    const until = new Date(restriction.target_until).getTime();
    const now = Date.now();
    
    if (until <= now) {
        return { restricted: false };
    }
    
    const remainingMs = until - now;
    const remainingHours = Math.floor(remainingMs / 3600000);
    const remainingMinutes = Math.ceil((remainingMs % 3600000) / 60000);
    
    return { 
        restricted: true, 
        until, 
        remainingHours,
        remainingMinutes
    };
}

export function applySniper(sniperUserId, targetUserId, sniperDurationHours, targetDurationHours) {
    initStatements();
    
    const sniperUntil = new Date(Date.now() + sniperDurationHours * 3600000).toISOString();
    const targetUntil = new Date(Date.now() + targetDurationHours * 3600000).toISOString();
    
    statements.addSniperRestriction.run(sniperUserId, targetUserId, sniperUntil, targetUntil);
}

export function getGroupMembers(groupId) {
    initStatements();
    return statements.getGroupMembers.all(groupId);
}

export function cleanupExpiredEffects() {
    initStatements();
    db.prepare(`DELETE FROM active_effects WHERE expires_at <= datetime('now')`).run();
    db.prepare(`DELETE FROM sniper_restrictions WHERE target_until <= datetime('now')`).run();
}

// Check if Chemical Mask is active for a user
export function hasChemicalMaskActive(userId) {
    return hasActiveEffect(userId, 'chemical_mask');
}

// Check if Pepper is active for a user
export function hasPepperActive(userId) {
    return hasActiveEffect(userId, 'pepper');
}

// Get cooldown modifier based on active effects
export function getGoozCooldownModifier(userId) {
    // If Chemical Mask is active, cooldown is 10 minutes instead of 5
    const maskEffect = hasChemicalMaskActive(userId);
    if (maskEffect.active) {
        return 10 * 60 * 1000; // 10 minutes in ms
    }
    return 5 * 60 * 1000; // Default 5 minutes
}
