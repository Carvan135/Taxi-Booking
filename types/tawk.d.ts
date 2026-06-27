export type TawkApi = {
  onLoad?: () => void;
  maximize?: () => void;
  toggle?: () => void;
};

declare global {
  interface Window {
    Tawk_API?: TawkApi;
    Tawk_LoadStart?: Date;
  }
}

export {};
