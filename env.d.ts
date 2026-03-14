declare namespace NodeJS {
    interface ProcessEnv {
        DISCORD_TOKEN?: string;
        DISCORD_CLIENT_ID?: string;
        POLLING_INTERVAL?: string;
        ED_TOKENS_PATH?: string;
        ED_STORAGE_PATH?: string;
    }
}
