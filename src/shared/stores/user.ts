import { create } from "zustand";

export interface User {
  id?: number;
  nombre: string;
  email?: string;
  nivel?: number;
  token?: string;
}

interface UserState {
  usuario: User | null;
  setUsuario: (usuario: User) => void;
  limpiarUsuario: () => void;
  actualizarUsuario: (datos: Partial<User>) => void;
}

export const useUserStore = create<UserState>((set) => ({
  usuario: {
    id: 1,
    nombre: "Juan Perez",
    email: "juan.perez@gmail.com",
    nivel: 1,
  },
  setUsuario: (usuario) => set({ usuario }),
  limpiarUsuario: () => set({ usuario: null }),
  actualizarUsuario: (datos) =>
    set((state) =>
      state.usuario
        ? { usuario: { ...state.usuario, ...datos } }
        : { usuario: null }
    ),
}));
