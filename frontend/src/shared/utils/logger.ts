const isDev = import.meta.env.DEV;

export const logger = {
  info: (...args: any[]) => {
    if (isDev) {
      console.info("[INFO]", ...args);
    }
  },
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn("[WARN]", ...args);
    }
  },
  error: (...args: any[]) => {
    if (isDev) {
      console.error("[ERROR]", ...args);
    }
  },
  debug: (...args: any[]) => {
    if (isDev) {
      console.debug("[DEBUG]", ...args);
    }
  },
};

export default logger;
