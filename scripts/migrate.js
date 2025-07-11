#!/usr/bin/env node

/**
 * Script para ejecutar migraciones de base de datos
 * Uso: npm run db:migrate
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

async function main() {
  try {
    console.log('🚀 Iniciando migraciones de base de datos...');
    
    // Crear el script de migración en JavaScript
    const scriptPath = path.join(__dirname, '../temp-migrate.js');
    
    console.log('📝 Creando script de migración...');
    
    const migrationScript = `
const SQLite = require('expo-sqlite');

// Importamos las migraciones manualmente
const migration_001_initial_setup = {
  version: 1,
  name: 'initial_setup',
  
  async up(db) {
    console.log('📊 Ejecutando migración 001: initial_setup');
    
    // Tabla de control de migraciones
    await db.execAsync(\`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version INTEGER UNIQUE NOT NULL,
        name TEXT NOT NULL,
        applied_at INTEGER NOT NULL
      );
    \`);

    // Tabla de usuarios
    await db.execAsync(\`
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
    \`);

    // Tabla de sesiones
    await db.execAsync(\`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    \`);

    // Tabla de todos
    await db.execAsync(\`
      CREATE TABLE IF NOT EXISTS todos (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        title TEXT NOT NULL,
        description TEXT,
        completed INTEGER DEFAULT 0,
        priority TEXT DEFAULT 'medium',
        due_date INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        synced INTEGER DEFAULT 0
      );
    \`);

    // Tabla de configuraciones
    await db.execAsync(\`
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
    \`);

    console.log('✅ Migración 001 completada');
  },

  async down(db) {
    console.log('🔄 Revirtiendo migración 001: initial_setup');
    
    await db.execAsync(\`DROP TABLE IF EXISTS settings;\`);
    await db.execAsync(\`DROP TABLE IF EXISTS todos;\`);
    await db.execAsync(\`DROP TABLE IF EXISTS sessions;\`);
    await db.execAsync(\`DROP TABLE IF EXISTS users;\`);
    await db.execAsync(\`DROP TABLE IF EXISTS migrations;\`);
    
    console.log('✅ Migración 001 revertida');
  }
};

const migration_002_add_indexes = {
  version: 2,
  name: 'add_indexes',
  
  async up(db) {
    console.log('📊 Ejecutando migración 002: add_indexes');
    
    // Índices para optimizar consultas
    await db.execAsync(\`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
      CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
      CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed);
      CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(created_at);
      CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);
    \`);
    
    console.log('✅ Migración 002 completada');
  },

  async down(db) {
    console.log('🔄 Revirtiendo migración 002: add_indexes');
    
    await db.execAsync(\`
      DROP INDEX IF EXISTS idx_users_email;
      DROP INDEX IF EXISTS idx_users_created_at;
      DROP INDEX IF EXISTS idx_sessions_user_id;
      DROP INDEX IF EXISTS idx_sessions_token;
      DROP INDEX IF EXISTS idx_todos_user_id;
      DROP INDEX IF EXISTS idx_todos_completed;
      DROP INDEX IF EXISTS idx_todos_created_at;
      DROP INDEX IF EXISTS idx_settings_user_id;
    \`);
    
    console.log('✅ Migración 002 revertida');
  }
};

class DatabaseMigrator {
  constructor() {
    this.db = null;
    this.migrations = [
      migration_001_initial_setup,
      migration_002_add_indexes,
    ];
    this.migrations.sort((a, b) => a.version - b.version);
  }

  async init(database) {
    this.db = database;
  }

  async migrate() {
    if (!this.db) {
      throw new Error('Base de datos no inicializada');
    }

    console.log('🚀 Iniciando proceso de migración...');

    try {
      const currentVersion = await this.getCurrentVersion();
      console.log(\`📊 Versión actual de la base de datos: \${currentVersion}\`);

      const pendingMigrations = this.migrations.filter(
        migration => migration.version > currentVersion
      );

      if (pendingMigrations.length === 0) {
        console.log('✅ Base de datos actualizada, no hay migraciones pendientes');
        return;
      }

      console.log(\`📈 Ejecutando \${pendingMigrations.length} migración(es) pendiente(s)...\`);

      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }

      console.log('🎉 Todas las migraciones completadas exitosamente');
    } catch (error) {
      console.error('❌ Error durante la migración:', error);
      throw error;
    }
  }

  async getCurrentVersion() {
    if (!this.db) return 0;

    try {
      const result = await this.db.getFirstAsync(\`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='migrations'
      \`);

      if (!result) {
        return 0;
      }

      const versionResult = await this.db.getFirstAsync(\`
        SELECT MAX(version) as version FROM migrations
      \`);

      return versionResult?.version || 0;
    } catch (error) {
      console.error('Error obteniendo versión actual:', error);
      return 0;
    }
  }

  async executeMigration(migration) {
    if (!this.db) return;

    console.log(\`⚡ Ejecutando migración \${migration.version}: \${migration.name}\`);

    try {
      await migration.up(this.db);

      await this.db.runAsync(\`
        INSERT INTO migrations (version, name, applied_at) 
        VALUES (?, ?, ?)
      \`, [migration.version, migration.name, Date.now()]);

      console.log(\`✅ Migración \${migration.version} completada\`);
    } catch (error) {
      console.error(\`❌ Error en migración \${migration.version}:\`, error);
      throw error;
    }
  }
}

async function runMigrations() {
  try {
    console.log('🚀 Ejecutando migraciones...');
    
    // Abrir base de datos
    const db = await SQLite.openDatabaseAsync('local_first_db.db');
    console.log('✅ Conexión a base de datos establecida');
    
    // Ejecutar migraciones
    const migrator = new DatabaseMigrator();
    await migrator.init(db);
    await migrator.migrate();
    
    console.log('✅ Migraciones completadas exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error ejecutando migraciones:', error);
    process.exit(1);
  }
}

runMigrations();
`;
    
    fs.writeFileSync(scriptPath, migrationScript);
    
    // Ejecutar el script
    console.log('🔄 Ejecutando migraciones...');
    execSync(`node ${scriptPath}`, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    // Limpiar archivo temporal
    fs.unlinkSync(scriptPath);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();