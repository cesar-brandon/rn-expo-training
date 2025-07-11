export const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL;
export const APP_VERSION = "1.0.6";
export const APP_CREDITS = `LyF © 2024 - v${APP_VERSION}`;

export enum Origen {
  WEB = 1,
  APP = 2,
}

export enum SyncStatus {
  PENDIENTE = 0,
  ENVIADO = 1,
}

export const ADMIN_LEVELS = [1, 2];
