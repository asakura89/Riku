import { Application, Router, RouterContext, Request } from "@oak/oak";
import { ServerRequest } from "https://jsr.io/@oak/oak/17.2.0/types.ts";
import { log } from "./logger.ts";
import { extname, fromFileUrl, join } from "@std/path";
import { type AppConfig, loadConfig } from "./config.ts";

//** ~< Data Setup - Begin >~
const localKv: Deno.Kv = await Deno.openKv("./data/deno-kv-local.db");
const _commitResult: Deno.KvCommitResult = await localKv.set(["names"], [
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
let dataCount: number = 0;
for await (const entry of data) {
    if (entry) {
        dataCount++;
    }
}

if (dataCount > 0) {
    await log("Data been setup.");
}
else {
    await log("Data empty.");
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
const app: Application<Record<string, any>> = new Application();
const router: Router<Record<string, any>> = new Router();
async function respondWithMetadata(ctx: any, statusCode: number) {
    try {
        const payload = await buildPayload(ctx);
        const responseBody = JSON.stringify(payload, null, 4);
        respondWithJson(ctx, statusCode, responseBody);
        await log(responseBody);
    }
    catch (error) {
        const errorPayload = serializeError(error);
        const errorBody = JSON.stringify({ Message: "Error occured", Error: errorPayload }, null, 4);
        respondWithJson(ctx, 500, errorBody);
        await log(errorBody);
    }
}

function respondWithJson(ctx: any, statusCode: number, body: unknown) {
    ctx.response.status = statusCode;
    ctx.response.headers.set("content-type", "application/json; charset=utf-8");
    ctx.response.body = body;
}

async function buildPayload(ctx: any) {
    const request: Request = ctx.request;
    const connection = extractConnectionInfo(request);
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

function extractConnectionInfo(req: Request) {
    const url: URL = req.url;
    const ipAddress: string =
        req.ips.length > 0 ?
            req.ips.join(",") :
            "0.0.0.0";
    let hostname: string = "localhost";
    let port: string | undefined;

    if (url) {
        if ("hostname" in url && url.hostname) {
            hostname = url.hostname;
        }

        if ("port" in url && url.port) {
            port = url.port;
        }
    }

    return { ipAddress, hostname, port };
}

function mapHeaders(headers: Headers) {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
        result[key] = value;
    });

    return result;
}

async function readBodyText(request: Request) {
    /** if (!request.hasBody) {
        return "";
    }*/

    const body = request.body;
    if (!body || typeof body.text !== "function") {
        return "";
    }

    /** if (typeof body.has === "function" && !body.has()) {
        return "";
    }*/

    return await body.text();
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

function parseResourceKeys(resourceName?: string, rawKeys?: string) {
    const normalizedResourceName = resourceName?.trim();
    const keyNames = (rawKeys ?? "")
        .split(",")
        .map((keyName) => keyName.trim())
        .filter((keyName) => keyName.length > 0);

    if (!normalizedResourceName) {
        void log("resourceName is required.");
        throw new Error("resourceName is required.");
    }

    if (keyNames.length === 0) {
        void log("At least one key is required.");
        throw new Error("At least one key is required.");
    }

    return {
        resourceName: normalizedResourceName,
        keyNames,
        kvKeys: keyNames.map((keyName) => [normalizedResourceName, keyName] as Deno.KvKey),
    };
}

async function readRequestData(request: Request) {
    /** if (!request.hasBody) {
        return undefined;
    }*/

    const bodyText = await readBodyText(request);
    if (bodyText.trim() === "") {
        return undefined;
    }

    try {
        return JSON.parse(bodyText);
    }
    catch {
        return bodyText;
    }
}

function buildValuesByKey(keyNames: string[], payload: unknown) {
    if (keyNames.length === 1) {
        return { [keyNames[0]]: payload };
    }

    if (Array.isArray(payload)) {
        if (payload.length !== keyNames.length) {
            throw new Error("Array body length must match the number of keys.");
        }

        return Object.fromEntries(keyNames.map((keyName, index) => [keyName, payload[index]]));
    }

    if (payload && typeof payload === "object") {
        const payloadRecord = payload as Record<string, unknown>;
        const missingKeys = keyNames.filter((keyName) => !(keyName in payloadRecord));
        if (missingKeys.length > 0) {
            throw new Error(`Body is missing values for keys: ${missingKeys.join(", ")}.`);
        }

        return Object.fromEntries(keyNames.map((keyName) => [keyName, payloadRecord[keyName]]));
    }

    throw new Error("Multi-key writes require a JSON object keyed by key name or an array matching the key order.");
}

type OakRouteParams = Record<string | number, string | undefined>;
type OakRouteState = Record<string, any>;
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
router.get("/status/:status", async (ctx: RouterContext<
    "/status/:status",
    {status: string;} &
    OakRouteParams,
    OakRouteState>) => {
    const rawStatus = ctx.params?.status ?? "200";
    const parsedStatus = Number.parseInt(rawStatus, 10);
    const statusCode = Number.isFinite(parsedStatus) ? parsedStatus : 200;
    await respondWithMetadata(ctx, statusCode);
});
//** ~< Status endpoints - End >~


//** ~< KV data endpoints - Begin >~
router.get("/data/:resourceName/:key", async (ctx: RouterContext<
    "/data/:resourceName/:key",
    {resourceName: string;} &
    {key: string;} &
    OakRouteParams,
    OakRouteState>) => {
    try {
        const { resourceName, keyNames, kvKeys } = parseResourceKeys(ctx.params?.resourceName, ctx.params?.key);
        const entries = await localKv.getMany(kvKeys);
        const dataByKey = Object.fromEntries(keyNames.map((keyName, index) => [keyName, entries[index]?.value ?? null]));

        respondWithJson(ctx, 200, {
            resourceName,
            keys: keyNames,
            data: keyNames.length === 1 ? dataByKey[keyNames[0]] : dataByKey,
        });
    }
    catch (error) {
        respondWithJson(ctx, 400, {
            message: "Invalid data request",
            error: serializeError(error),
        });
    }
});

async function upsertDataRoute(ctx: any, statusCode: number) {
    try {
        const { resourceName, keyNames, kvKeys } = parseResourceKeys(ctx.params?.resourceName, ctx.params?.key);
        const payload = await readRequestData(ctx.request);
        const valuesByKey = buildValuesByKey(keyNames, payload);

        const results = await Promise.all(
            kvKeys.map((kvKey, index) => localKv.set(kvKey, valuesByKey[keyNames[index]])),
        );

        respondWithJson(ctx, statusCode, {
            resourceName,
            keys: keyNames,
            data: keyNames.length === 1 ? valuesByKey[keyNames[0]] : valuesByKey,
            versionstamps: Object.fromEntries(keyNames.map((keyName, index) => [keyName, results[index].versionstamp])),
        });
    }
    catch (error) {
        respondWithJson(ctx, 400, {
            message: "Invalid data write request",
            error: serializeError(error),
        });
    }
}

router.post("/data/:resourceName/:key", async (ctx: RouterContext<
    "/data/:resourceName/:key",
    {resourceName: string;} &
    {key: string;} &
    OakRouteParams,
    OakRouteState>) => {
    await upsertDataRoute(ctx, 201);
});

router.put("/data/:resourceName/:key", async (ctx: RouterContext<
    "/data/:resourceName/:key",
    {resourceName: string;} &
    {key: string;} &
    OakRouteParams,
    OakRouteState>) => {
    await upsertDataRoute(ctx, 200);
});

router.delete("/data/:resourceName/:key", async (ctx: RouterContext<
    "/data/:resourceName/:key",
    {resourceName: string;} &
    {key: string;} &
    OakRouteParams,
    OakRouteState>) => {
    try {
        const { resourceName, keyNames, kvKeys } = parseResourceKeys(ctx.params?.resourceName, ctx.params?.key);
        await Promise.all(kvKeys.map((kvKey) => localKv.delete(kvKey)));

        respondWithJson(ctx, 200, {
            resourceName,
            keys: keyNames,
            deleted: keyNames.length === 1 ? keyNames[0] : keyNames,
        });
    }
    catch (error) {
        respondWithJson(ctx, 400, {
            message: "Invalid data delete request",
            error: serializeError(error),
        });
    }
});
//** ~< KV data endpoints - End >~


//** ~< Ajax endpoints - Begin >~
router.get("/ajax", async (ctx: RouterContext<"/ajax", OakRouteParams, OakRouteState>) => {
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
        respondWithJson(ctx, 500, errorBody);
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
router.get("/mock-api", async (ctx: RouterContext<"/mock-api", OakRouteParams, OakRouteState>) => {
    const endpointEntries = await readEndpointEntries(mockAPIRoute);

    respondWithJson(ctx, 200, {
        message: "Mock API",
        /*dataDirectory: dataDirectoryPath,*/
        endpoints: endpointEntries.map((endpointEntry) => endpointEntry.endpointPath),
    });
    await log(JSON.stringify({status: ctx.response.status, body: ctx.response.body}, null, 4), { writeToFile: true });
});

const supportedHttpMethods = ["GET"]; //["GET", "POST", "PUT", "PATCH", "DELETE"];
router.all("/mock-api/:resourceName", async (ctx: RouterContext<
    "/mock-api/:resourceName",
    {resourceName: string;} &
    OakRouteParams,
    OakRouteState>) => {
    if (!supportedHttpMethods.includes(ctx.request.method.toUpperCase())) {
        respondWithJson(ctx, 405, { message: "Method not allowed" });
        await log(JSON.stringify({status: ctx.response.status, body: ctx.response.body}, null, 4), { writeToFile: true });
        return;
    }

    const requestedPath = ctx.request.url.pathname;
    const endpointEntries = await readEndpointEntries(mockAPIRoute);
    const matchedEntry = endpointEntries.find((endpointEntry) => endpointEntry.endpointPath === requestedPath);

    if (!matchedEntry) {
        respondWithJson(ctx, 404, {
            message: "Endpoint not found",
            endpoint: requestedPath,
        });
        await log(JSON.stringify({status: ctx.response.status, body: ctx.response.body}, null, 4), { writeToFile: true });
        return;
    }

    const responsePayload = await readJsonFile(matchedEntry.filePath);
    respondWithJson(ctx, 200, responsePayload)
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
