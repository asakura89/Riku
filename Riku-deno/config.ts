export interface AppConfig {
    appEnv: string;
    host: string;
    port: number;
};

function getEnv(name: string) {
    return Deno.env.get(name)?.trim() ?? "";
}

export async function loadConfig(): Promise<AppConfig> {
    const appEnv: string = getEnv("APP_ENV") === "" ? "development" : getEnv("APP_ENV");
    const host: string = getEnv("HOST") === "" ? "0.0.0.0" : getEnv("HOST");
    const port: number = getEnv("PORT") === "" ? 5523 : Number(getEnv("PORT"));

    return { appEnv, host, port };
}