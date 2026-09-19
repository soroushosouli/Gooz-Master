import db from "../database/db.js";
import { queueMessage } from "./messageQueue.js";
import { 
    getUserInventory, 
    hasActiveEffect, 
    activateTimedEffect, 
    consumeInventoryItem 
} from "../services/shop.js";

const statements = {
    getUserByTelegramId: null
};

function initStatements() {
    if (statements.getUserByTelegramId) return;
    statements.getUserByTelegramId = db.prepare(`SELECT id FROM users WHERE telegram_id = ?`);
}

export async function activateMaskCommand(ctx) {
    initStatements();
    
    const telegramId = String(ctx.from.id);
    const user = statements.getUserByTelegramId.get(telegramId);
    
    if (!user) {
        return queueMessage(ctx, "❌ هنوز اطلاعات شما ثبت نشده است.");
    }
    
    // Check if user has Chemical Mask in inventory
    const inventory = getUserInventory(user.id);
    const maskItem = inventory.find(i => i.item_key === 'chemical_mask');
    
    if (!maskItem || maskItem.quantity < 1) {
        return queueMessage(ctx, "🥽 شما ماسک شیمیایی ندارید! از /shop خریداری کنید.");
    }
    
    // Check if already active
    const existingEffect = hasActiveEffect(user.id, 'chemical_mask');
    
    if (existingEffect.active) {
        const hours = existingEffect.remainingHours;
        const minutes = existingEffect.remainingMinutes % 60;
        return queueMessage(ctx, `🥽 ماسک شیمیایی شما هنوز فعال است!\n⏳ ${hours} ساعت و ${minutes} دقیقه دیگر منقضی می‌شود.`);
    }
    
    // Consume one mask
    const consumed = consumeInventoryItem(user.id, 'chemical_mask');
    
    if (!consumed) {
        return queueMessage(ctx, "❌ خطا در مصرف ماسک شیمیایی.");
    }
    
    // Activate for 60 minutes
    activateTimedEffect(user.id, 'chemical_mask', 60);
    
    await queueMessage(ctx, "🥽 <b>ماسک شیمیایی فعال شد!</b>\n\n✅ به مدت <b>۶۰ دقیقه</b> در برابر گوزهای معمولی ایمن هستید.\n⚠️ توجه: گوز هسته‌ای همچنان روی شما اثر دارد.\n⏳ cooldown گوز شما اکنون ۱۰ دقیقه است.", { parse_mode: "HTML" });
}

export async function activatePepperCommand(ctx) {
    initStatements();
    
    const telegramId = String(ctx.from.id);
    const user = statements.getUserByTelegramId.get(telegramId);
    
    if (!user) {
        return queueMessage(ctx, "❌ هنوز اطلاعات شما ثبت نشده است.");
    }
    
    // Check if user has Pepper in inventory
    const inventory = getUserInventory(user.id);
    const pepperItem = inventory.find(i => i.item_key === 'pepper');
    
    if (!pepperItem || pepperItem.quantity < 1) {
        return queueMessage(ctx, "🌶️ شما فلفل ندارید! از /shop خریداری کنید.");
    }
    
    // Check if already active - extend duration instead of stacking
    const existingEffect = hasActiveEffect(user.id, 'pepper');
    
    if (existingEffect.active) {
        // Extend the existing effect by 60 minutes
        activateTimedEffect(user.id, 'pepper', 60);
        
        const hours = existingEffect.remainingHours;
        const minutes = existingEffect.remainingMinutes % 60;
        return queueMessage(ctx, `🌶️ <b>مدت فلفل تمدید شد!</b>\n\n✅ ۶۰ دقیقه دیگر به مدت فعال بودن اضافه شد.\n⏳ زمان باقی‌مانده قبلی: ${hours} ساعت و ${minutes} دقیقه\n📈 شانس دریافت گوزهای قوی‌تر افزایش یافت!`, { parse_mode: "HTML" });
    }
    
    // Consume one pepper
    const consumed = consumeInventoryItem(user.id, 'pepper');
    
    if (!consumed) {
        return queueMessage(ctx, "❌ خطا در مصرف فلفل.");
    }
    
    // Activate for 60 minutes
    activateTimedEffect(user.id, 'pepper', 60);
    
    await queueMessage(ctx, "🌶️ <b>فلفل فعال شد!</b>\n\n✅ به مدت <b>۶۰ دقیقه</b> شانس دریافت گوزهای قوی‌تر و نادرتر ۲۰٪ افزایش می‌یابد.\n🎲 این افزایش شانس با کاهش احتمال گوزهای ضعیف اعمال می‌شود.", { parse_mode: "HTML" });
}
