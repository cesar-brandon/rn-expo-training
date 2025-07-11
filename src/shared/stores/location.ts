import { create } from "zustand";
import * as Location from "expo-location";

interface Location {
  location: Location.LocationObject | null;
  locationErrorMsg: string | null;
  startWatching: () => void;
}

const useLocationStore = create<Location>((set) => ({
  location: null,
  locationErrorMsg: null,
  startWatching: async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      set({
        locationErrorMsg:
          "Debe permitir el acceso a la ubicación para continuar.",
      });
      return;
    }

    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 1000,
        distanceInterval: 1,
      },
      (newLocation) => {
        set({ location: newLocation });
      }
    );
  },
}));

export default useLocationStore;
