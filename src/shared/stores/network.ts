import { create } from "zustand";
import axios from "axios";

interface NetworkState {
  isConnected: boolean;
  setIsConnected: (status: boolean) => void;
  ip: string;
  fetchIP: () => Promise<void>;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isConnected: false,
  setIsConnected: (status: boolean) => set({ isConnected: status }),
  ip: "",
  fetchIP: async () => {
    try {
      const response = await axios.get("https://api.ipify.org?format=json");
      set({ ip: response.data.ip });
    } catch (error) {
      console.error("Error fetching IP:", error);
    }
  },
}));
