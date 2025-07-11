import { SQLiteDatabase } from "expo-sqlite";

export interface Usuario {
  id_usuario: string;
  usuario_nombres: string;
  usuario_apater: string;
  usuario_amater: string;
  usuario_codigo: string;
  usuario_password: string;
  password_desencriptado: string;
  id_nivel: string;
}

export const defaultUsuario: Usuario = {
  id_usuario: "",
  usuario_nombres: "",
  usuario_apater: "",
  usuario_amater: "",
  usuario_codigo: "",
  usuario_password: "",
  password_desencriptado: "",
  id_nivel: "",
};

export const usuarioModel = {
  save: async (db: SQLiteDatabase, data: Usuario[]) => {
    for (const item of data) {
      try {
        await db.runAsync(
          `INSERT OR REPLACE INTO users (id_usuario,usuario_nombres,usuario_apater,usuario_amater,usuario_codigo,usuario_password,password_desencriptado,id_nivel)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id_usuario,
            item.usuario_nombres,
            item.usuario_apater,
            item.usuario_amater,
            item.usuario_codigo,
            item.usuario_password,
            item.password_desencriptado,
            item.id_nivel,
          ],
        );
      } catch (error) {
        console.error("Error al guardar el usuario:", error);
      }
    }
  },
  getAll: async (db: SQLiteDatabase): Promise<Usuario[]> => {
    const result = await db.getAllAsync<Usuario>("SELECT * FROM users");
    return result;
  },
};
