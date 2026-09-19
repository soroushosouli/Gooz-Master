import db from "./db.js";


export function initializeDatabase() {

    db.exec(`

    CREATE TABLE IF NOT EXISTS cooldowns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        group_id INTEGER,
        last_gooz DATETIME,
        UNIQUE(user_id, group_id),
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(group_id) REFERENCES groups(id)
    );

    CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id TEXT UNIQUE,
        name TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id TEXT UNIQUE,
        name TEXT,
        username TEXT
    );

    CREATE TABLE IF NOT EXISTS group_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER,
        user_id INTEGER,
        UNIQUE(group_id, user_id),
        FOREIGN KEY(group_id) REFERENCES groups(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS stats (
        user_id INTEGER PRIMARY KEY,
        points INTEGER DEFAULT 0,
        total_goozes INTEGER DEFAULT 0,
        times_victim INTEGER DEFAULT 0,
        FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS gooz_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER,
        user_id INTEGER,
        gooz_name TEXT,
        power INTEGER,
        victims INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(group_id) REFERENCES groups(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
    );

    -- Shop Items Definition
    CREATE TABLE IF NOT EXISTS shop_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_key TEXT UNIQUE,
        name TEXT,
        emoji TEXT,
        price INTEGER,
        description TEXT
    );

    -- User Inventory (purchased items with charges/uses)
    CREATE TABLE IF NOT EXISTS user_inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        item_key TEXT,
        quantity INTEGER DEFAULT 1,
        FOREIGN KEY(user_id) REFERENCES users(id),
        UNIQUE(user_id, item_key)
    );

    -- Active Item Effects (time-limited effects like Chemical Mask, Pepper)
    CREATE TABLE IF NOT EXISTS active_effects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        item_key TEXT,
        expires_at DATETIME,
        FOREIGN KEY(user_id) REFERENCES users(id)
    );

    -- Sniper Restrictions (who is blocked by whom and until when)
    CREATE TABLE IF NOT EXISTS sniper_restrictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sniper_user_id INTEGER,
        target_user_id INTEGER,
        sniper_until DATETIME,
        target_until DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(sniper_user_id) REFERENCES users(id),
        FOREIGN KEY(target_user_id) REFERENCES users(id)
    );

    -- Insert default shop items if not exists
    INSERT OR IGNORE INTO shop_items (item_key, name, emoji, price, description) VALUES
        ('chemical_mask', 'Chemical Mask', '🥽', 50, 'برای ۶۰ دقیقه در برابر گوزهای معمولی ایمن می‌شوید. فقط گوز هسته‌ای روی شما اثر دارد.'),
        ('sniper', 'Sniper', '🔫', 100, 'یک نفر را به مدت ۲۴ ساعت از گوز زدن محروم کنید. خودتان هم ۱۲ ساعت نمی‌توانید گوز بزنید.'),
        ('pepper', 'Pepper', '🌶️', 70, 'به مدت ۱ ساعت شانس دریافت گوزهای قوی‌تر و نادرتر ۲۰٪ افزایش می‌یابد.');

    `);

    console.log("Database initialized ✅");
}