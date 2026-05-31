import { Application, Router } from "@oak/oak";
import { log } from "./logger.ts";
import { extname, fromFileUrl, join } from "@std/path";
import { type AppConfig, loadConfig } from "./config.ts";

//** ~< Data Setup - Begin >~
const localKv: Deno.Kv = await Deno.openKv("./data/deno-kv-local.db");
const commitResult: Deno.KvCommitResult = await localKv.set(["names"], [
    "Clifford",
    "Lewis",
    "Ollie",
    "Leah",
    "Kathryn",
    "Carolyn",
    "Genevieve",
    "Adam",
    "Milton",
    "Eleanor",
    "Maurice",
    "Ethel",
    "Charles",
    "Danny",
    "Stephen",
    "Gabriel",
    "Susan",
    "Donald",
    "Isabella",
    "Patrick"
]);

/**
for await (const entry of localKv.list({ prefix: [] })) {
    console.log(`  ${entry.key.join("/")}: ${JSON.stirngify(entry.value)}`);
}
*/

const data: Deno.KvListIterator<unknown> = localKv.list({ prefix: [] });
for await (const entry of data) {
    if (entry) {
        await log("Data been setup.");
    }
}

const names: string[] = await localKv
    .get(["names"])
    .then((result) => {
        if (result.value && Array.isArray(result.value)) {
            return result.value as string[];
        }

        return [];
    });
//** ~< Data Setup - End >~

//** ~< Oak App and Commons - Begin >~
const app = new Application();
const router = new Router();
async function respondWithMetadata(ctx: any, statusCode: number) {
    try {
        const payload = await buildPayload(ctx);
        const responseBody = JSON.stringify(payload, null, 4);
        ctx.response.status = statusCode;
        ctx.response.headers.set("content-type", "application/json; charset=utf-8");
        ctx.response.body = responseBody;
        await log(responseBody);
    }
    catch (error) {
        const errorPayload = serializeError(error);
        const errorBody = JSON.stringify({ Message: "Riku Error", Error: errorPayload }, null, 4);
        ctx.response.status = 500;
        ctx.response.headers.set("content-type", "application/json; charset=utf-8");
        ctx.response.body = errorBody;
        await log(errorBody);
    }
}

async function buildPayload(ctx: any) {
    const request = ctx.request;
    const connection = extractConnectionInfo(ctx);
    const url = request.url;
    const headers = mapHeaders(request.headers);
    const bodyText = await readBodyText(request);
    const contentType = headers["content-type"] ?? "";
    const isForm = contentType
        .toLowerCase()
        .startsWith("application/x-www-form-urlencoded");
    const params2Object = (bodyText: string) => {
        const params = new URLSearchParams(bodyText);
        const obj: Record<string, string> = {};
        params.forEach((value, key) => {
            obj[key] = value;
        });

        return obj;
    };
    const form = isForm && bodyText ? params2Object(bodyText) : {};

    return {
        Url: url.toString(),
        ClientIpv6: connection.ipAddress,
        ClientIpv4: connection.ipAddress,
        ClientPort: connection.port ?? "",
        IsHttps: url.protocol === "https:",
        Scheme: url.protocol.replace(":", ""),
        Protocol: connection.protocol,
        Method: request.method,
        ContentLength: headers["content-length"] ?? `${bodyText.length}`,
        ContentType: contentType,
        Headers: headers,
        QueryStrings: mapQuery(url.searchParams),
        Cookies: parseCookies(headers["cookie"]),
        Form: form,
        Body: bodyText,
    };
}

function serializeError(error: unknown) {
    if (error instanceof Error) {
        return { Name: error.name, Message: error.message, Stack: error.stack };
    }

    return { Message: "Unknown error" };
}

function extractConnectionInfo(ctx: any) {
    const serverRequest = ctx.request.serverRequest;
    const remoteAddr = serverRequest?.conn?.remoteAddr;
    let ipAddress = ctx.request.ip ?? "0.0.0.0";
    let port: string | undefined;

    if (remoteAddr) {
        if ("hostname" in remoteAddr && remoteAddr.hostname) {
            ipAddress = remoteAddr.hostname;
        }
        else if ("address" in remoteAddr && remoteAddr.address) {
            ipAddress = remoteAddr.address;
        }

        if ("port" in remoteAddr && remoteAddr.port !== undefined) {
            port = `${remoteAddr.port}`;
        }
    }

    const protocol = serverRequest?.proto ?? "HTTP/1.1";
    return { ipAddress, port, protocol };
}

function mapHeaders(headers: Headers) {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
        result[key] = value;
    });

    return result;
}

async function readBodyText(request: any) {
    if (!request.hasBody) {
        return "";
    }

    const body = request.body({ type: "text" });
    const value = await body.value;
    if (typeof value === "string") {
        return value;
    }

    if (value instanceof Uint8Array) {
        return new TextDecoder().decode(value);
    }
    return "";
}

function mapQuery(searchParams: URLSearchParams) {
    const result: Record<string, string> = {};
    searchParams.forEach((value, key) => {
        result[key] = value;
    });

    return result;
}

function parseCookies(cookieHeader?: string) {
    if (!cookieHeader) {
        return {};
    }

    return Object.fromEntries(
        cookieHeader
            .split(";")
            .map((pair) => pair.trim())
            .filter((pair) => pair.includes("="))
            .map((pair) => {
                const [name, ...rest] = pair.split("=");
                return [name.trim(), decodeURIComponent(rest.join("=").trim())];
            }),
    );
}
//** ~< Oak App and Commons - Begin >~


//** ~< Echo endpoints - Begin >~
const handleEcho = (ctx: any) => respondWithMetadata(ctx, 200);

router.get("/", handleEcho);
router.post("/", handleEcho);
router.post("/post", handleEcho);
router.get("/get", handleEcho);
router.put("/put", handleEcho);
router.patch("/patch", handleEcho);
router.delete("/delete", handleEcho);
//** ~< Echo endpoints - End >~


//** ~< Status endpoints - Begin >~
router.get("/status/:status", async (ctx: any) => {
    const rawStatus = ctx.params?.status ?? "200";
    const parsedStatus = Number.parseInt(rawStatus, 10);
    const statusCode = Number.isFinite(parsedStatus) ? parsedStatus : 200;
    await respondWithMetadata(ctx, statusCode);
});
//** ~< Status endpoints - End >~


//** ~< Ajax endpoints - Begin >~
router.get("/ajax", async (ctx) => {
    try {
        const shuffled = shuffle([...names]);
        const xml = `<ArrayOfString>${shuffled.map((value) => `<String>${escapeXml(value)}</String>`).join("")}</ArrayOfString>`;
        ctx.response.status = 200;
        ctx.response.headers.set("content-type", "application/xml; charset=utf-8");
        ctx.response.body = xml;
        await log(shuffled.join(",\r\n"));
    }
    catch (error) {
        const errorPayload = serializeError(error);
        const errorBody = JSON.stringify({ Message: "Riku Error", Error: errorPayload }, null, 4);
        ctx.response.status = 500;
        ctx.response.headers.set("content-type", "application/json; charset=utf-8");
        ctx.response.body = errorBody;
        await log(errorBody);
    }
});

function shuffle(items: string[]) {
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
}

function escapeXml(value: string) {
    return value.replace(/[<>&'"]/g, (char) => {
        switch (char) {
            case "<":
                return "&lt;";
            case ">":
                return "&gt;";
            case "&":
                return "&amp;";
            case "'":
                return "&apos;";
            case '"':
                return "&quot;";
            default:
                return char;
        }
    });
}
//** ~< Ajax endpoints - End >~


//** ~< MockAPI endpoints - Begin >~
const mockAPIRoute: string = "/mock-api";
router.get(mockAPIRoute, async (ctx) => {
    const endpointEntries = await readEndpointEntries(mockAPIRoute);

    ctx.response.status = 200;
    ctx.response.headers.set("content-type", "application/json; charset=utf-8");
    ctx.response.body = {
        message: "Mock API",
        /*dataDirectory: dataDirectoryPath,*/
        endpoints: endpointEntries.map((endpointEntry) => endpointEntry.endpointPath),
    };
    await log(JSON.stringify({status: ctx.response.status, body: ctx.response.body}, null, 4), { writeToFile: true });
});

const supportedHttpMethods = ["GET"]; //["GET", "POST", "PUT", "PATCH", "DELETE"];
router.all("/mock-api/:resourceName", async (ctx) => {
    if (!supportedHttpMethods.includes(ctx.request.method.toUpperCase())) {
        ctx.response.status = 405;
        ctx.response.headers.set("content-type", "application/json; charset=utf-8");
        ctx.response.body = { message: "Method not allowed" };
        await log(JSON.stringify({status: ctx.response.status, body: ctx.response.body}, null, 4), { writeToFile: true });
        return;
    }

    const requestedPath = ctx.request.url.pathname;
    const endpointEntries = await readEndpointEntries(mockAPIRoute);
    const matchedEntry = endpointEntries.find((endpointEntry) => endpointEntry.endpointPath === requestedPath);

    if (!matchedEntry) {
        ctx.response.status = 404;
        ctx.response.headers.set("content-type", "application/json; charset=utf-8");
        ctx.response.body = {
            message: "Endpoint not found",
            endpoint: requestedPath,
        };
        await log(JSON.stringify({status: ctx.response.status, body: ctx.response.body}, null, 4), { writeToFile: true });
        return;
    }

    const responsePayload = await readJsonFile(matchedEntry.filePath);

    ctx.response.status = 200;
    ctx.response.headers.set("content-type", "application/json; charset=utf-8");
    ctx.response.body = responsePayload;
    await log(JSON.stringify({status: ctx.response.status, body: ctx.response.body}, null, 4), { writeToFile: true });
});

const pathFromFileURL: string = fromFileUrl(new URL(".", import.meta.url));
const dataDirectoryPath: string = join(pathFromFileURL, "data");
async function readEndpointEntries(parent: string = "") {
    const endpointEntries: Array<{ endpointPath: string; filePath: string }> = [];

    for await (const directoryEntry of Deno.readDir(dataDirectoryPath)) {
        if (!directoryEntry.isFile) {
            continue;
        }

        if (extname(directoryEntry.name).toLowerCase() !== ".json") {
            continue;
        }

        const resourceName = directoryEntry.name.slice(0, -".json".length);
        endpointEntries.push({
            endpointPath: `${parent}/${resourceName}`,
            filePath: join(dataDirectoryPath, directoryEntry.name),
        });
    }

    endpointEntries.sort((leftEntry, rightEntry) => leftEntry.endpointPath.localeCompare(rightEntry.endpointPath));
    return endpointEntries;
}

async function readJsonFile(filePath: string) {
    const fileContent = await Deno.readTextFile(filePath);
    return JSON.parse(fileContent);
}
//** ~< MockAPI endpoints - End >~


//** ~< Oak middlewares - Begin >~
app.use(router.routes());
app.use(router.allowedMethods());
//** ~< Oak middlewares - End >~


//** ~< Deno Server - Begin >~
app.addEventListener("listen", ({ hostname, port, secure }) => {
    const protocol = secure ? "https" : "http";
    void log(`OnAppStarted is executing. ${protocol}://${hostname ?? "localhost"}:${port}`, { writeToFile: true });
});

app.addEventListener("error", (event) => {
    void log(`Oak error: ${event.error?.message ?? "unknown"}`, { writeToFile: true });
});

const signals: Deno.Signal[] = ["SIGINT"]; // ctrl-c
if (Deno.build.os === "windows") {
    signals.push("SIGBREAK"); // ctrl-break
}
else if (Deno.build.os === "linux" || Deno.build.os === "darwin") {
    signals.push("SIGTERM"); // ctrl-c
}

async function main() {
    const config: AppConfig = await loadConfig();
    const controller = new AbortController();
    const signal = controller.signal;

    const stopHandler = async () => {
        await log("OnAppStopping is executing.", { writeToFile: true });
        controller.abort();
        localKv.close();
        Deno.exit();
    };

    for (const sig of signals) {
        Deno.addSignalListener(sig, stopHandler);
    }

    try {
        await app.listen({ hostname: config.host, port: config.port, signal });
    }
    catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
            // Expected when the signal aborts the listen call.
            await log(JSON.stringify(serializeError(error), null, 4), { writeToFile: true });
        }
        else {
            await log(`Listen failed: ${(error as Error).message ?? "unknown"}`, { writeToFile: true });
            await log(JSON.stringify(serializeError(error), null, 4), { writeToFile: true });
            throw error;
        }
    }
    finally {
        for (const sig of signals) {
            Deno.removeSignalListener(sig, stopHandler);
        }

        await log("OnAppStopped is executing.", { writeToFile: true });
    }
}

if (import.meta.main) {
    await main();
}
//** ~< Deno Server - End >~
