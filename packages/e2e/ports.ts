/** Fixed dev/preview port per app. */
export const APPS = {
  dibujado: 5103,
} as const;

export type AppName = keyof typeof APPS;
