import Database from 'better-sqlite3';

const db = new Database('punishments.db');

// Initialize tables
db.exec(`
    CREATE TABLE IF NOT EXISTS punishments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        type TEXT NOT NULL,
        reason TEXT,
        timestamp INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
        guildId TEXT PRIMARY KEY,
        banRoleId TEXT,
        memberRoleId TEXT,
        logChannelId TEXT,
        maxWarnings INTEGER DEFAULT 3,
        whitelistRoles TEXT DEFAULT '[]'
    );
`);

interface Punishment {
    id: number;
    userId: string;
    type: string;
    reason: string | null;
    timestamp: number;
}

export interface GuildSettings {
    guildId: string;
    banRoleId: string | null;
    memberRoleId: string | null;
    logChannelId: string | null;
    maxWarnings: number;
    whitelistRoles: string[]; // Parsed from JSON
}

const WARN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function addPunishment(userId: string, type: 'warn' | 'mute' | 'ban', reason: string | null = null) {
    const stmt = db.prepare('INSERT INTO punishments (userId, type, reason, timestamp) VALUES (?, ?, ?, ?)');
    stmt.run(userId, type, reason, Date.now());
}

export function getPunishments(userId: string): Punishment[] {
    const stmt = db.prepare('SELECT * FROM punishments WHERE userId = ? ORDER BY timestamp DESC');
    return stmt.all(userId) as Punishment[];
}

export function getWarnCount(userId: string): number {
    const cutoff = Date.now() - WARN_EXPIRY_MS;
    const stmt = db.prepare('SELECT COUNT(*) as count FROM punishments WHERE userId = ? AND type = ? AND timestamp > ?');
    const result = stmt.get(userId, 'warn', cutoff) as { count: number };
    return result.count;
}

export function removeLastWarn(userId: string) {
    const findStmt = db.prepare('SELECT id FROM punishments WHERE userId = ? AND type = ? ORDER BY timestamp DESC LIMIT 1');
    const result = findStmt.get(userId, 'warn') as { id: number } | undefined;

    if (result) {
        const delStmt = db.prepare('DELETE FROM punishments WHERE id = ?');
        delStmt.run(result.id);
        return true;
    }
    return false;
}

export function clearWarns(userId: string) {
    const stmt = db.prepare('DELETE FROM punishments WHERE userId = ? AND type = ?');
    stmt.run(userId, 'warn');
}

// Settings Functions
export function getSettings(guildId: string): GuildSettings {
    const stmt = db.prepare('SELECT * FROM settings WHERE guildId = ?');
    const row = stmt.get(guildId) as any;

    if (!row) {
        // Create default settings if not exists
        db.prepare('INSERT INTO settings (guildId) VALUES (?)').run(guildId);
        return {
            guildId,
            banRoleId: null,
            memberRoleId: null,
            logChannelId: null,
            maxWarnings: 3,
            whitelistRoles: []
        };
    }

    return {
        ...row,
        whitelistRoles: JSON.parse(row.whitelistRoles || '[]')
    };
}

export function updateSettings(guildId: string, updates: Partial<Omit<GuildSettings, 'guildId' | 'whitelistRoles'>> & { whitelistRoles?: string[] }) {
    const current = getSettings(guildId);
    const newData = { ...current, ...updates };

    const stmt = db.prepare(`
        UPDATE settings 
        SET banRoleId = ?, memberRoleId = ?, logChannelId = ?, maxWarnings = ?, whitelistRoles = ?
        WHERE guildId = ?
    `);

    stmt.run(
        newData.banRoleId,
        newData.memberRoleId,
        newData.logChannelId,
        newData.maxWarnings,
        JSON.stringify(newData.whitelistRoles),
        guildId
    );
}
