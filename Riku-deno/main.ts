import { Application, Router } from "@oak/oak";
import { log } from "./logger.ts";

const names = [
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
    "Patrick",
];

const router = new Router();

const handleEcho = (ctx: any) => respondWithMetadata(ctx, 200);

router.get("/", handleEcho);
router.post("/", handleEcho);
router.post("/post", handleEcho);
router.get("/get", handleEcho);
router.put("/put", handleEcho);
router.patch("/patch", handleEcho);
router.delete("/delete", handleEcho);

router.get("/status/:status", async (ctx: any) => {
    const rawStatus = ctx.params?.status ?? "200";
    const parsedStatus = Number.parseInt(rawStatus, 10);
    const statusCode = Number.isFinite(parsedStatus) ? parsedStatus : 200;
    await respondWithMetadata(ctx, statusCode);
});

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

const app = new Application();

app.use(router.routes());
app.use(router.allowedMethods());

app.addEventListener("listen", () => {
    void log("OnAppStarted is executing.", { isStarting: true, writeToScreen: true });
});

app.addEventListener("error", (event) => {
    void log(`Oak error: ${event.error?.message ?? "unknown"}`, { writeToScreen: true });
});

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

function mapHeaders(headers: Headers) {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
        result[key] = value;
    });

    return result;
}

function mapQuery(searchParams: URLSearchParams) {
    const result: Record<string, string> = {};
    searchParams.forEach((value, key) => {
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

async function main() {
    const portValue = Number(Deno.env.get("PORT") ?? "5000");
    const port = Number.isFinite(portValue) ? portValue : 5000;
    const host = Deno.env.get("HOST") ?? "0.0.0.0";
    const controller = new AbortController();
    const signal = controller.signal;

    const stopHandler = () => {
        void log("OnAppStopping is executing.", { writeToScreen: true });
        controller.abort();
    };

    Deno.addSignalListener("SIGINT", stopHandler);
    //** Deno.addSignalListener("SIGTERM", stopHandler);
    //** on Windows
    Deno.addSignalListener("SIGBREAK", stopHandler);

    try {
        await app.listen({ hostname: host, port, signal });
    }
    catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
            // Expected when the signal aborts the listen call.
        }
        else {
            void log(`Listen failed: ${(error as Error).message ?? "unknown"}`, { writeToScreen: true });
            throw error;
        }
    }
    finally {
        Deno.removeSignalListener("SIGINT", stopHandler);
        //** Deno.removeSignalListener("SIGTERM", stopHandler);
        //** on Windows
        Deno.removeSignalListener("SIGBREAK", stopHandler);
        await log("OnAppStopped is executing.", { writeToScreen: true });
    }
}

if (import.meta.main) {
    await main();
}
