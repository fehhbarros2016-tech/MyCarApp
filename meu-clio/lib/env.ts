export const APP_ENV = process.env.NEXT_PUBLIC_APP_ENV === "production" ? "production" : "development";
export const IS_PROD = APP_ENV === "production";
