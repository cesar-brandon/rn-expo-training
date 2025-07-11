
import { dbService } from '../shared/services/database';
import { migrator } from '../database/migrator';

async function runMigrations() {
  try {
    console.log('🚀 Ejecutando migraciones...');
    
    // Inicializar la base de datos
    await dbService.init();
    
    // Ejecutar migraciones
    await migrator.init(dbService.getDatabase());
    await migrator.migrate();
    
    console.log('✅ Migraciones completadas exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error ejecutando migraciones:', error);
    process.exit(1);
  }
}

runMigrations();
