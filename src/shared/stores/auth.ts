import { defaultUsuario, Usuario } from "@/db/models/user";
import { router } from "expo-router";
import { SQLiteDatabase } from "expo-sqlite";
import { create } from "zustand";
import { MMKV } from "react-native-mmkv";

interface AuthState {
  isAuthenticated: boolean;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  user: Usuario;
  setUser: (user: Usuario) => void;
  login: (email: string, password: string, db: SQLiteDatabase) => Promise<void>;
  logout: () => void;
}

const storage = new MMKV();

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  setIsAuthenticated: (isAuthenticated: boolean) => set({ isAuthenticated }),
  user: defaultUsuario,
  setUser: (user: Usuario) => set({ user }),
  login: async (codigo: string, password: string, db: SQLiteDatabase) => {
    const users = await db.getAllAsync<Usuario>(
      "SELECT * FROM users WHERE usuario_codigo = ? AND password_desencriptado = ?",
      [codigo, password],
    );
    if (users.length === 0) {
      throw new Error("Usuario o contraseña incorrectos");
    }
    set({ isAuthenticated: true, user: users[0] });
  },
  logout: () => {
    set({ isAuthenticated: false, user: defaultUsuario });
    storage.delete("user");
    router.replace("/sign-in");
  },
}));
