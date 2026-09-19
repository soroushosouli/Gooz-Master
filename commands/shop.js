import db from "../database/db.js";
import { queueMessage } from "../services/messageQueue.js";
import { 
    getShopItems, 
    getUserPoints, 
    buyItem, 
    getUserInventory,
    hasActiveEffect,
    activateTimedEffect,
    consumeInventoryItem,
    isSniperRestricted,
    applySniper,
    getGroupMembers,
    hasChemicalMaskActive,
    getGoozCooldownModifier
} from "../services/shop.js";
import { canGooz, setCooldown } from "../services/cooldown.js";

const statements = {
    getUserByTelegramId: null,
    getGroupByTelegramId: null
};

function initStatements() {
    if (statements.getUserByTelegramId) return;
    statements.getUserByTelegramId = db.prepare(`SELECT id FROM users WHERE telegram_id = ?`);
    statements.getGroupByTelegramId = db.prepare(`SELECT id FROM groups WHERE telegram_id = ?`);
}

export async function shopCommand(ctx) {
    initStatements();
    
    const telegramId = String(ctx.from.id);
    const user = statements.getUserByTelegramId.get(telegramId);
    
    if (!user) {
        return queueMessage(ctx, "❌ هنوز اطلاعات شما ثبت نشده است.");
    }
    
    const points = getUserPoints(user.id);
    const items = getShopItems();
    
    let message = `🛒 <b>فروشگاه گوز مستر</b>\n\n`;
    message += `💰 <b>موجودی شما:</b> ${points} گوز پوینت\n\n`;
    message += `<b>آیتم‌های موجود:</b>\n\n`;
    
    items.forEach((item, index) => {
        message += `${index + 1}. ${item.emoji} <b>${item.name}</b>\n`;
        message += `   قیمت: ${item.price} گوز پوینت\n`;
        message += `   ${item.description}\n\n`;
    });
    
    // Create inline keyboard for shop items
    const keyboard = items.map(item => [{
        text: `خرید ${item.emoji} ${item.name} - ${item.price}`,
        callback_data: `shop_buy_${item.item_key}`
    }]);
    
    // Add items button
    keyboard.push([{
        text: "🎒 آیتم‌های من",
        callback_data: "shop_items"
    }]);
    
    await queueMessage(ctx, message, { 
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: keyboard
        }
    });
}

export async function itemsCommand(ctx) {
    initStatements();
    
    const telegramId = String(ctx.from.id);
    const user = statements.getUserByTelegramId.get(telegramId);
    
    if (!user) {
        return queueMessage(ctx, "❌ هنوز اطلاعات شما ثبت نشده است.");
    }
    
    const inventory = getUserInventory(user.id);
    
    if (inventory.length === 0) {
        return queueMessage(ctx, "🎒 هنوز هیچ آیتمی ندارید! از /shop خرید کنید.");
    }
    
    let message = `🎒 <b>آیتم‌های شما</b>\n\n`;
    
    for (const item of inventory) {
        message += `${item.emoji} <b>${item.name}</b> × ${item.quantity}\n`;
        message += `   ${item.description}\n`;
        
        // Check for active effects on timed items
        if (['chemical_mask', 'pepper'].includes(item.item_key)) {
            const effect = hasActiveEffect(user.id, item.item_key);
            if (effect.active) {
                const hours = effect.remainingHours;
                const minutes = effect.remainingMinutes % 60;
                if (hours > 0) {
                    message += `   ⏳ فعال به مدت: ${hours} ساعت و ${minutes} دقیقه\n`;
                } else {
                    message += `   ⏳ فعال به مدت: ${minutes} دقیقه\n`;
                }
            } else {
                message += `   ❌ غیرفعال\n`;
            }
        }
        
        message += `\n`;
    }
    
    await queueMessage(ctx, message, { parse_mode: "HTML" });
}

export async function sniperCommand(ctx) {
    initStatements();
    
    if (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup") {
        return queueMessage(ctx, "🔫 این دستور فقط داخل گروه کار می‌کنه!");
    }
    
    const telegramId = String(ctx.from.id);
    const user = statements.getUserByTelegramId.get(telegramId);
    const group = statements.getGroupByTelegramId.get(String(ctx.chat.id));
    
    if (!user || !group) {
        return queueMessage(ctx, "❌ هنوز اطلاعات شما ثبت نشده است.");
    }
    
    // Check if user has sniper in inventory
    const inventory = getUserInventory(user.id);
    const sniperItem = inventory.find(i => i.item_key === 'sniper');
    
    if (!sniperItem || sniperItem.quantity < 1) {
        return queueMessage(ctx, "🔫 شما اسنایپر ندارید! از /shop خریداری کنید.");
    }
    
    // Check if user is restricted by another sniper
    const restriction = isSniperRestricted(user.id);
    if (restriction.restricted) {
        return queueMessage(ctx, `🔫 شما توسط اسنایپر هدف قرار گرفته‌اید!\n⏳ ещё ${restriction.remainingHours} ساعت و ${restriction.remainingMinutes} دقیقه نمی‌توانید گوز بزنید.`);
    }
    
    // Get group members for target selection
    const members = getGroupMembers(group.id);
    
    if (members.length <= 1) {
        return queueMessage(ctx, "❌ برای استفاده از اسنایپر باید حداقل ۲ نفر در گروه باشند.");
    }
    
    // Filter out the user themselves
    const potentialTargets = members.filter(m => String(m.telegram_id) !== telegramId);
    
    if (potentialTargets.length === 0) {
        return queueMessage(ctx, "❌ کسی برای هدف گرفتن وجود ندارد!");
    }
    
    // Create inline keyboard with member list
    const keyboard = potentialTargets.map(member => [{
        text: member.name,
        callback_data: `sniper_target_${member.db_user_id}_${member.telegram_id}`
    }]);
    
    await queueMessage(ctx, "🔫 <b>اسنایپر</b>\n\nهدف خود را انتخاب کنید:\n⚠️ توجه: پس از انتخاب، شما به مدت ۱۲ ساعت و هدف به مدت ۲۴ ساعت نمی‌تواند گوز بزند!", {
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: keyboard
        }
    });
}

// Handle callback queries for shop and sniper
export async function handleCallbackQuery(ctx) {
    const data = ctx.callbackQuery.data;
    const userId = ctx.from.id;
    const telegramId = String(userId);
    
    initStatements();
    const user = statements.getUserByTelegramId.get(telegramId);
    
    if (!user) {
        return ctx.answerCbQuery("❌ خطا: کاربر یافت نشد", { show_alert: true });
    }
    
    // Shop buy callback
    if (data.startsWith('shop_buy_')) {
        const itemKey = data.replace('shop_buy_', '');
        const result = buyItem(user.id, itemKey);
        
        await ctx.answerCbQuery(result.message, { show_alert: true });
        
        // Refresh shop message
        if (result.success) {
            await shopCommand(ctx);
        }
    }
    
    // View items callback
    else if (data === 'shop_items') {
        await ctx.answerCbQuery();
        await itemsCommand(ctx);
    }
    
    // Sniper target selection callback
    else if (data.startsWith('sniper_target_')) {
        const parts = data.replace('sniper_target_', '').split('_');
        const targetDbId = parseInt(parts[0]);
        const targetTelegramId = parts[1];
        
        // Verify user has sniper
        const inventory = getUserInventory(user.id);
        const sniperItem = inventory.find(i => i.item_key === 'sniper');
        
        if (!sniperItem || sniperItem.quantity < 1) {
            return ctx.answerCbQuery("❌ شما اسنایپر ندارید!", { show_alert: true });
        }
        
        // Consume one sniper
        const consumed = consumeInventoryItem(user.id, 'sniper');
        
        if (!consumed) {
            return ctx.answerCbQuery("❌ خطا در مصرف اسنایپر", { show_alert: true });
        }
        
        // Apply sniper restrictions
        // Sniper user: 12 hours restriction
        // Target user: 24 hours restriction
        applySniper(user.id, targetDbId, 12, 24);
        
        // Get target name for message
        const targetName = db.prepare(`SELECT name FROM users WHERE id = ?`).get(targetDbId)?.name || "کاربر";
        
        // Notify the target
        try {
            await ctx.telegram.sendMessage(
                targetTelegramId,
                `🔫 <b>شما توسط اسنایپر هدف قرار گرفتید!</b>\n\n` +
                `⏳ شما به مدت <b>۲۴ ساعت</b> نمی‌توانید از دستور /gooz استفاده کنید.\n` +
                `این محدودیت پس از این مدت به صورت خودکار برداشته می‌شود.`,
                { parse_mode: "HTML" }
            );
        } catch (e) {
            // User might have DM disabled, that's okay
        }
        
        await ctx.answerCbQuery(`✅ اسنایپر با موفقیت شلیک شد!`, { show_alert: true });
        
        // Edit the original message to show result
        await ctx.editMessageText(
            `🔫 <b>اسنایپر شلیک شد!</b>\n\n` +
            `✅ هدف: ${targetName}\n` +
            `⏳ محدودیت شما: ۱۲ ساعت\n` +
            `⏳ محدودیت هدف: ۲۴ ساعت\n\n` +
            `یک اسنایپر از موجودی شما کسر شد.`,
            { parse_mode: "HTML" }
        );
    }
}

// Export functions for use in gooz command
export { hasChemicalMaskActive, getGoozCooldownModifier, isSniperRestricted };
