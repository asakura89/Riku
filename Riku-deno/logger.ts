import { join } from "@std/path";

function getType(obj: unknown): string {
    if (typeof obj === "undefined") {
        return "Undefined";
    }

    if (obj === undefined) {
        return "Undefined";
    }

    if (obj === null) {
        return "Null";
    }

    const match: RegExpMatchArray | null = Object
        .prototype
        .toString
        .call(obj)
        .match(/^\[object\s+(.*?)\]$/);

    if (!match) {
        return "Unknown";
    }

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

export async function log(message: string, options: { writeToScreen?: boolean; writeToFile?: boolean } = {}): Promise<void> {
    const scriptInfo: AppInfo = getAppInfo();

    if (scriptInfo.name && scriptInfo.directory) {
        const now = new Date().toISOString();
        const timestamp = now
            .replace(/[\.Z]/gm, "")
            .replace(/\-/gm, ".")
            .replace(/T/gm, ".")
            .slice(0, 19);
        const logName = `${scriptInfo.name}_${now.slice(0, 13).replace(/[.\-:TZ]/gm, "")}.log`;
        const logFile = join(scriptInfo.directory, logName);
        const logMessage = `[${timestamp}] ${message}`;

        const { writeToScreen = true, writeToFile = false } = options;
        if (writeToScreen) {
            console.log(logMessage);
        }

        if (writeToFile) {
            const encoder = new TextEncoder();
            const logData = new Uint8Array(encoder.encode(`${logMessage}\n`));

            let fileExists = false;
            try {
                await Deno.stat(logFile);
                fileExists = true;
            }
            catch (err) {
                if (err instanceof Deno.errors.NotFound) {
                    fileExists = false;
                }
                else {
                    throw err;
                }
            }

            if (fileExists) {
                await Deno.writeFile(logFile, logData, { append: true });
            }
            else {
                await Deno.writeFile(logFile, logData);
            }
        }
    }
}
