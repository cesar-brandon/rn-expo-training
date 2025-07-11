#!/usr/bin/env node

/**
 * Script para insertar datos de ejemplo (seed) en la base de datos
 * Uso: npm run db:seed
 */

const { execSync } = require('child_process');
const path = require('path');

async function main() {
  try {
    console.log('🌱 Iniciando seed de base de datos...');
    
    // Usar ts-node para ejecutar TypeScript directamente
    const scriptPath = path.join(__dirname, '../src/scripts/run-seed.ts');
    
    // Verificar si el archivo de script existe, si no, crearlo
    const fs = require('fs');
    if (!fs.existsSync(scriptPath)) {
      console.log('📝 Creando script de seed...');
      
      const seedScript = `
import { dbService } from '../shared/services/database';

async function runSeed() {
  try {
    console.log('🌱 Insertando datos de ejemplo...');
    
    // Inicializar la base de datos
    await dbService.init();
    
    // Crear usuarios de ejemplo
    const users = [
      {
        name: 'Juan Pérez',
        email: 'juan@example.com'
      },
      {
        name: 'María García',
        email: 'maria@example.com'
      },
      {
        name: 'Carlos López',
        email: 'carlos@example.com'
      }
    ];
    
    console.log('👥 Creando usuarios de ejemplo...');
    for (const userData of users) {
      try {
        await dbService.createUser(userData);
        console.log(\`✅ Usuario creado: \${userData.name}\`);
      } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
          console.log(\`⚠️ Usuario ya existe: \${userData.name}\`);
        } else {
          throw error;
        }
      }
    }
    
    // Crear todos de ejemplo
    const todos = [
      {
        title: 'Aprender React Native',
        description: 'Completar el tutorial básico de React Native con Expo'
      },
      {
        title: 'Configurar SQLite',
        description: 'Implementar la base de datos local con migraciones'
      },
      {
        title: 'Integrar Tamagui',
        description: 'Configurar el sistema de design con Tamagui'
      },
      {
        title: 'Implementar TanStack Query',
        description: 'Configurar el manejo de estado y cache con React Query'
      },
      {
        title: 'Crear componentes reutilizables',
        description: 'Desarrollar una librería de componentes consistente'
      }
    ];
    
    console.log('📝 Creando todos de ejemplo...');
    for (const todoData of todos) {
      try {
        await dbService.createTodo(todoData);
        console.log(\`✅ Todo creado: \${todoData.title}\`);
      } catch (error) {
        console.log(\`⚠️ Error creando todo "\${todoData.title}": \${error.message}\`);
      }
    }
    
    // Mostrar estadísticas
    const allUsers = await dbService.getAllUsers();
    const allTodos = await dbService.getAllTodos();
    
    console.log(\`\\n📊 Estadísticas:\`);
    console.log(\`   👥 Usuarios: \${allUsers.length}\`);
    console.log(\`   📝 Todos: \${allTodos.length}\`);
    
    console.log('\\n🎉 Seed completado exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error ejecutando seed:', error);
    process.exit(1);
  }
}

runSeed();
`;
      
      const scriptsDir = path.join(__dirname, '../src/scripts');
      if (!fs.existsSync(scriptsDir)) {
        fs.mkdirSync(scriptsDir, { recursive: true });
      }
      
      fs.writeFileSync(scriptPath, seedScript);
    }
    
    // Ejecutar el script de TypeScript
    console.log('🔄 Ejecutando seed...');
    execSync(`npx ts-node --project tsconfig.json ${scriptPath}`, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();