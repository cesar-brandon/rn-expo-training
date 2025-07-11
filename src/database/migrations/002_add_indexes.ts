import * as SQLite from 'expo-sqlite';
import type { Migration } from './001_initial_setup';

export const migration_002_add_indexes: Migration = {
  version: 2,
  name: 'add_indexes',
  
  async up(db: SQLite.SQLiteDatabase) {
    console.log('📊 Ejecutando migración 002: add_indexes');
    
    // Índices para la tabla users
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_synced ON users(synced);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
    `);

    // Índices para la tabla sessions
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
    `);



    // Índices para la tabla settings
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);
      CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
      CREATE INDEX IF NOT EXISTS idx_settings_user_key ON settings(user_id, key);
    `);

    console.log('✅ Migración 002 completada');
  },

  async down(db: SQLite.SQLiteDatabase) {
    console.log('🔄 Revirtiendo migración 002: add_indexes');
    
    // Eliminar índices de users
    await db.execAsync(`
      DROP INDEX IF EXISTS idx_users_email;
      DROP INDEX IF EXISTS idx_users_synced;
      DROP INDEX IF EXISTS idx_users_role;
      DROP INDEX IF EXISTS idx_users_created_at;
    `);

    // Eliminar índices de sessions
    await db.execAsync(`
      DROP INDEX IF EXISTS idx_sessions_user_id;
      DROP INDEX IF EXISTS idx_sessions_token;
      DROP INDEX IF EXISTS idx_sessions_expires_at;
    `);



    // Eliminar índices de settings
    await db.execAsync(`
      DROP INDEX IF EXISTS idx_settings_user_id;
      DROP INDEX IF EXISTS idx_settings_key;
      DROP INDEX IF EXISTS idx_settings_user_key;
    `);
    
    console.log('✅ Migración 002 revertida');
  }
}; 