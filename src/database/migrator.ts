import * as SQLite from 'expo-sqlite';
import type { Migration } from './migrations/001_initial_setup';
import { migration_001_initial_setup } from './migrations/001_initial_setup';
import { migration_002_add_indexes } from './migrations/002_add_indexes';

class DatabaseMigrator {
  private db: SQLite.SQLiteDatabase | null = null;
  private migrations: Migration[] = [
    migration_001_initial_setup,
    migration_002_add_indexes,
  ];

  constructor() {
    // Las migraciones se ordenan automáticamente por version
    this.migrations.sort((a, b) => a.version - b.version);
  }

  async init(database: SQLite.SQLiteDatabase): Promise<void> {
    this.db = database;
  }

  async migrate(): Promise<void> {
    if (!this.db) {
      throw new Error('Base de datos no inicializada');
    }

    console.log('🚀 Iniciando proceso de migración...');

    try {
      // Obtener versión actual de la base de datos
      const currentVersion = await this.getCurrentVersion();
      console.log(`📊 Versión actual de la base de datos: ${currentVersion}`);

      // Encontrar migraciones pendientes
      const pendingMigrations = this.migrations.filter(
        migration => migration.version > currentVersion
      );

      if (pendingMigrations.length === 0) {
        console.log('✅ Base de datos actualizada, no hay migraciones pendientes');
        return;
      }

      console.log(`📈 Ejecutando ${pendingMigrations.length} migración(es) pendiente(s)...`);

      // Ejecutar migraciones pendientes
      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }

      console.log('🎉 Todas las migraciones completadas exitosamente');
    } catch (error) {
      console.error('❌ Error durante la migración:', error);
      throw error;
    }
  }

  private async getCurrentVersion(): Promise<number> {
    if (!this.db) return 0;

    try {
      // Verificar si la tabla de migraciones existe
      const result = await this.db.getFirstAsync(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='migrations'
      `) as any;

      if (!result) {
        return 0; // No hay tabla de migraciones, empezar desde 0
      }

      // Obtener la versión más alta aplicada
      const versionResult = await this.db.getFirstAsync(`
        SELECT MAX(version) as version FROM migrations
      `) as any;

      return versionResult?.version || 0;
    } catch (error) {
      console.error('Error obteniendo versión actual:', error);
      return 0;
    }
  }

  private async executeMigration(migration: Migration): Promise<void> {
    if (!this.db) return;

    console.log(`⚡ Ejecutando migración ${migration.version}: ${migration.name}`);

    try {
      // Ejecutar la migración
      await migration.up(this.db);

      // Registrar la migración como aplicada
      await this.db.runAsync(`
        INSERT INTO migrations (version, name, applied_at) 
        VALUES (?, ?, ?)
      `, [migration.version, migration.name, Date.now()]);

      console.log(`✅ Migración ${migration.version} completada`);
    } catch (error) {
      console.error(`❌ Error en migración ${migration.version}:`, error);
      throw error;
    }
  }

  async rollback(targetVersion?: number): Promise<void> {
    if (!this.db) {
      throw new Error('Base de datos no inicializada');
    }

    const currentVersion = await this.getCurrentVersion();
    const target = targetVersion || currentVersion - 1;

    if (target >= currentVersion) {
      console.log('ℹ️ No hay nada que revertir');
      return;
    }

    console.log(`🔄 Revirtiendo migraciones desde ${currentVersion} hasta ${target}`);

    // Obtener migraciones aplicadas que necesitan revertirse
    const migrationsToRollback = this.migrations
      .filter(m => m.version > target && m.version <= currentVersion)
      .sort((a, b) => b.version - a.version); // Orden descendente

    for (const migration of migrationsToRollback) {
      console.log(`🔙 Revirtiendo migración ${migration.version}: ${migration.name}`);
      
      try {
        await migration.down(this.db);
        
        // Remover el registro de la migración
        await this.db.runAsync(`
          DELETE FROM migrations WHERE version = ?
        `, [migration.version]);

        console.log(`✅ Migración ${migration.version} revertida`);
      } catch (error) {
        console.error(`❌ Error revirtiendo migración ${migration.version}:`, error);
        throw error;
      }
    }

    console.log('🎉 Rollback completado');
  }

  async getAppliedMigrations(): Promise<{ version: number; name: string; applied_at: number }[]> {
    if (!this.db) return [];

    try {
      const result = await this.db.getAllAsync(`
        SELECT version, name, applied_at FROM migrations 
        ORDER BY version ASC
      `) as any[];

      return result;
    } catch (error) {
      console.error('Error obteniendo migraciones aplicadas:', error);
      return [];
    }
  }

  async getPendingMigrations(): Promise<Migration[]> {
    const currentVersion = await this.getCurrentVersion();
    return this.migrations.filter(m => m.version > currentVersion);
  }

  getLatestVersion(): number {
    return Math.max(...this.migrations.map(m => m.version), 0);
  }
}

export const migrator = new DatabaseMigrator(); 