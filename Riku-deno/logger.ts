import { ensureFile } from "@std/fs";
import { join } from "@std/path";

function getType(obj: unknown): string {
    if (typeof obj === "undefined")
        return "Undefined";

    if (obj === undefined)
        return "Undefined";

    if (obj === null)
        return "Null";

    const match = Object
        .prototype
        .toString
        .call(obj)
        .match(/^\[object\s+(.*?)\]$/);

    if (!match)
        return "Unknown";

    return match[1];
}

interface AppInfo {
    name: string;
    directory: string;
    isServer: boolean;
    isBrowser: boolean;
}

function getAppInfo(name?: string): AppInfo {
    try {
        const info: AppInfo = {
            name: name ? name : "",
            directory: Deno.cwd(),
            isServer: typeof window === "undefined" || getType(window) === "Undefined",
            isBrowser: typeof Deno === "undefined" || getType(Deno) === "Undefined"
        };

        if (!name) {
            const appName = Deno.mainModule.split("/").pop() || "";
            info.name = appName ? appName.split(".")[0] : "";
        }

        return info;
    }
    catch {
        return {
            name: "",
            directory: "",
            isServer: false,
            isBrowser: false
        };
    }
}

export async function log(message: string, options: { isStarting?: boolean; writeToScreen?: boolean } = {}): Promise<void> {
    const scriptInfo = getAppInfo();

    if (scriptInfo.name && scriptInfo.directory) {
        const now = new Date().toISOString();
        const timestamp = now
            .replace(/[\.Z]/gm, "")
            .replace(/\-/gm, ".")
            .replace(/T/gm, ".")
            .slice(0, 19);
        const logName = `${scriptInfo.name}_${now.replace(/[\.\-:TZ]/gm, "").slice(0, 14)}.log`;
        const logFile = join(scriptInfo.directory, logName);
        const logMessage = `[${timestamp}] ${message}`;

        const { isStarting = false, writeToScreen = true } = options;
        if (writeToScreen) {
            console.log(logMessage);
        }

        await ensureFile(logFile);

        const encoder = new TextEncoder();
        const logData = new Uint8Array(encoder.encode(`${logMessage}\n`));

        if (isStarting) {
            await Deno.writeFile(logFile, logData);
        }
        else {
            await Deno.writeFile(logFile, logData, { append: true });
        }
    }
}

/**
interface ScriptInfo {
    name: string;
    directory: string;
}

const scriptInfo: ScriptInfo = (() => {
    try {
        const scriptPath = fromFileUrl(import.meta.url);
        return {
            name: basename(dirname(scriptPath)),
            directory: dirname(scriptPath),
        };
    } catch {
        return {
            name: "riku-deno",
            directory: Deno.cwd(),
        };
    }
})();

const pad = (value: number) => value.toString().padStart(2, "0");

const formatFileTimestamp = (date: Date) =>
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}`;

export async function log(
    message: string,
    options: { starting?: boolean; writeToScreen?: boolean } = {},
) {
    const { starting = false, writeToScreen = false } = options;
    const now = new Date();
    const logName = `${scriptInfo.name}_${formatFileTimestamp(now)}.log`;
    const logFile = join(scriptInfo.directory, logName);
    const logMessage = `[${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}.${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}] ${message}`;

    if (writeToScreen) {
        console.log(logMessage);
    }

    try {
        if (starting) {
            await Deno.writeTextFile(logFile, logMessage, { create: true });
        } else {
            await Deno.writeTextFile(logFile, `\r\n\r\n${logMessage}`, {
                append: true,
                create: true,
            });
        }
    } catch (error) {
        console.error("Failed to write log:", error);
    }
}
*/
