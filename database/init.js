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

    `);

    console.log("Database initialized ✅");
}