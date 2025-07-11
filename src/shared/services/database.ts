import * as SQLite from 'expo-sqlite';
import type { Todo, User } from '../types/database';

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      this.db = await SQLite.openDatabaseAsync('local_first_db.db');
      // Las tablas ahora se crean a través del sistema de migraciones
      this.initialized = true;
      console.log('Base de datos inicializada correctamente');
    } catch (error) {
      console.error('Error inicializando base de datos:', error);
      throw error;
    }
  }

  // Getter público para acceder a la instancia de la base de datos
  getDatabase(): SQLite.SQLiteDatabase {
    if (!this.db) throw new Error('Base de datos no inicializada');
    return this.db;
  }

  // Métodos para usuarios
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    if (!this.db) throw new Error('Base de datos no inicializada');

    const now = Date.now();
    const user: User = {
      id: Math.random().toString(36).substr(2, 9),
      ...userData,
      createdAt: now,
      updatedAt: now,
      synced: false,
    };

    try {
      await this.db.runAsync(
        'INSERT INTO users (id, name, email, created_at, updated_at, synced) VALUES (?, ?, ?, ?, ?, ?)',
        [user.id, user.name, user.email, user.createdAt, user.updatedAt, user.synced ? 1 : 0]
      );
      console.log('Usuario creado:', user.id);
      return user;
    } catch (error) {
      console.error('Error creando usuario:', error);
      throw error;
    }
  }

  async getUser(id: string): Promise<User | null> {
    if (!this.db) throw new Error('Base de datos no inicializada');

    try {
      const result = await this.db.getFirstAsync(
        'SELECT * FROM users WHERE id = ?',
        [id]
      ) as any;

      if (!result) return null;

      return {
        id: result.id,
        name: result.name,
        email: result.email,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
        synced: result.synced === 1,
      };
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    if (!this.db) throw new Error('Base de datos no inicializada');

    try {
      const results = await this.db.getAllAsync('SELECT * FROM users ORDER BY created_at DESC') as any[];

      return results.map(result => ({
        id: result.id,
        name: result.name,
        email: result.email,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
        synced: result.synced === 1,
      }));
    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      throw error;
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<void> {
    if (!this.db) throw new Error('Base de datos no inicializada');

    const updateFields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      updateFields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.email !== undefined) {
      updateFields.push('email = ?');
      values.push(updates.email);
    }
    if (updates.synced !== undefined) {
      updateFields.push('synced = ?');
      values.push(updates.synced ? 1 : 0);
    }

    updateFields.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);

    try {
      await this.db.runAsync(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
        values
      );
      console.log('Usuario actualizado:', id);
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    if (!this.db) throw new Error('Base de datos no inicializada');

    try {
      await this.db.runAsync('DELETE FROM users WHERE id = ?', [id]);
      console.log('Usuario eliminado:', id);
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      throw error;
    }
  }

  // Métodos para todos
  async createTodo(todoData: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>): Promise<Todo> {
    if (!this.db) throw new Error('Base de datos no inicializada');

    const now = Date.now();
    const todo: Todo = {
      id: Math.random().toString(36).substr(2, 9),
      ...todoData,
      createdAt: now,
      updatedAt: now,
      synced: false,
    };

    try {
      await this.db.runAsync(
        'INSERT INTO todos (id, title, description, completed, created_at, updated_at, synced) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [todo.id, todo.title, todo.description || null, todo.completed ? 1 : 0, todo.createdAt, todo.updatedAt, todo.synced ? 1 : 0]
      );
      console.log('Todo creado:', todo.id);
      return todo;
    } catch (error) {
      console.error('Error creando todo:', error);
      throw error;
    }
  }

  async getTodo(id: string): Promise<Todo | null> {
    if (!this.db) throw new Error('Base de datos no inicializada');

    try {
      const result = await this.db.getFirstAsync(
        'SELECT * FROM todos WHERE id = ?',
        [id]
      ) as any;

      if (!result) return null;

      return {
        id: result.id,
        title: result.title,
        description: result.description,
        completed: result.completed === 1,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
        synced: result.synced === 1,
      };
    } catch (error) {
      console.error('Error obteniendo todo:', error);
      throw error;
    }
  }

  async getAllTodos(): Promise<Todo[]> {
    if (!this.db) throw new Error('Base de datos no inicializada');

    try {
      const results = await this.db.getAllAsync('SELECT * FROM todos ORDER BY created_at DESC') as any[];

      return results.map(result => ({
        id: result.id,
        title: result.title,
        description: result.description,
        completed: result.completed === 1,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
        synced: result.synced === 1,
      }));
    } catch (error) {
      console.error('Error obteniendo todos:', error);
      throw error;
    }
  }

  async updateTodo(id: string, updates: Partial<Todo>): Promise<void> {
    if (!this.db) throw new Error('Base de datos no inicializada');

    const updateFields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) {
      updateFields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      updateFields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.completed !== undefined) {
      updateFields.push('completed = ?');
      values.push(updates.completed ? 1 : 0);
    }
    if (updates.synced !== undefined) {
      updateFields.push('synced = ?');
      values.push(updates.synced ? 1 : 0);
    }

    updateFields.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);

    try {
      await this.db.runAsync(
        `UPDATE todos SET ${updateFields.join(', ')} WHERE id = ?`,
        values
      );
      console.log('Todo actualizado:', id);
    } catch (error) {
      console.error('Error actualizando todo:', error);
      throw error;
    }
  }

  async deleteTodo(id: string): Promise<void> {
    if (!this.db) throw new Error('Base de datos no inicializada');

    try {
      await this.db.runAsync('DELETE FROM todos WHERE id = ?', [id]);
      console.log('Todo eliminado:', id);
    } catch (error) {
      console.error('Error eliminando todo:', error);
      throw error;
    }
  }

  // Métodos para sincronización
  async getUnsyncedUsers(): Promise<User[]> {
    if (!this.db) throw new Error('Base de datos no inicializada');

    try {
      const results = await this.db.getAllAsync('SELECT * FROM users WHERE synced = 0') as any[];

      return results.map(result => ({
        id: result.id,
        name: result.name,
        email: result.email,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
        synced: result.synced === 1,
      }));
    } catch (error) {
      console.error('Error obteniendo usuarios no sincronizados:', error);
      throw error;
    }
  }

  async getUnsyncedTodos(): Promise<Todo[]> {
    if (!this.db) throw new Error('Base de datos no inicializada');

    try {
      const results = await this.db.getAllAsync('SELECT * FROM todos WHERE synced = 0') as any[];

      return results.map(result => ({
        id: result.id,
        title: result.title,
        description: result.description,
        completed: result.completed === 1,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
        synced: result.synced === 1,
      }));
    } catch (error) {
      console.error('Error obteniendo todos no sincronizados:', error);
      throw error;
    }
  }

  async markAsSynced(table: 'users' | 'todos', id: string): Promise<void> {
    if (!this.db) throw new Error('Base de datos no inicializada');

    try {
      await this.db.runAsync(
        `UPDATE ${table} SET synced = 1 WHERE id = ?`,
        [id]
      );
      console.log(`${table} marcado como sincronizado:`, id);
    } catch (error) {
      console.error(`Error marcando ${table} como sincronizado:`, error);
      throw error;
    }
  }

  // Limpiar base de datos
  async clearAll(): Promise<void> {
    if (!this.db) throw new Error('Base de datos no inicializada');

    try {
      await this.db.execAsync(`
        DELETE FROM users;
        DELETE FROM todos;
      `);
      console.log('Base de datos limpiada');
    } catch (error) {
      console.error('Error limpiando base de datos:', error);
      throw error;
    }
  }
}

// Singleton para el servicio de base de datos
export const dbService = new DatabaseService(); 