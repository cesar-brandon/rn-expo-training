import * as SQLite from 'expo-sqlite';

export interface Migration {
  version: number;
  name: string;
  up: (db: SQLite.SQLiteDatabase) => Promise<void>;
  down: (db: SQLite.SQLiteDatabase) => Promise<void>;
}

export const migration_001_initial_setup: Migration = {
  version: 1,
  name: 'initial_setup',
  
  async up(db: SQLite.SQLiteDatabase) {
    console.log('📊 Ejecutando migración 001: initial_setup');
    
    // Tabla de control de migraciones
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version INTEGER UNIQUE NOT NULL,
        name TEXT NOT NULL,
        applied_at INTEGER NOT NULL
      );
    `);

    // Tabla de usuarios
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password_hash TEXT,
        avatar_url TEXT,
        is_verified INTEGER DEFAULT 0,
        role TEXT DEFAULT 'user',
        last_login_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        synced INTEGER DEFAULT 0
      );
    `);

    // Tabla de sesiones
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);

    // Tabla de todos
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS todos (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        completed INTEGER DEFAULT 0,
        priority TEXT DEFAULT 'medium',
        due_date INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        synced INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);

    // Tabla de configuraciones
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(user_id, key)
      );
    `);

    console.log('✅ Migración 001 completada');
  },

  async down(db: SQLite.SQLiteDatabase) {
    console.log('🔄 Revirtiendo migración 001: initial_setup');
    
    await db.execAsync(`DROP TABLE IF EXISTS settings;`);
    await db.execAsync(`DROP TABLE IF EXISTS todos;`);
    await db.execAsync(`DROP TABLE IF EXISTS sessions;`);
    await db.execAsync(`DROP TABLE IF EXISTS users;`);
    await db.execAsync(`DROP TABLE IF EXISTS migrations;`);
    
    console.log('✅ Migración 001 revertida');
  }
}; 