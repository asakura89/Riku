<!--
SPDX-License-Identifier: 0BSD
-->

## License

Dilisensikan di bawah BSD Zero Clause License. Atau liat [LICENSE file ini](LICENSE.md), atau buka link ini https://opensource.org/licenses/0BSD buat keterangan lengkap.

[SPDX](https://spdx.dev) license identifier buat project ini `0BSD`.



## Riku web API

Small ASP.NET Core API that echoes request details and provides a simple AJAX-style XML endpoint. It is designed for testing request metadata, bodies, and status responses.



### Requirements

- .NET SDK 8.0+
- Ayumi dependencies
    - Taken from Ayumi commit: 54aab9a4eca750ebb28fdf7b897d69c0b8ab64cc



### Run locally

From the repo root:

```bash
dotnet restore
dotnet run --project Riku/Riku.csproj
```

The app uses the default ASP.NET Core hosting settings (Kestrel). Logs are written to console via built-in logging and to timestamped files via `DummyLogger`.



### Endpoints

Base URL defaults to `http://localhost:5000` and `https://localhost:5001` when using `dotnet run`.



#### <ins>Echo endpoints (JSON string response)</ins>

Each of these returns a JSON string with request details (URL, client IPs, headers, query, cookies, form fields, and body) and sets the HTTP status code.

- `GET /`
- `POST /`
- `GET /Get`
- `POST /Post`
- `PUT /Put`
- `PATCH /Patch`
- `DELETE /Delete`
- `GET /Status/{status}`

Example:

```bash
curl -X POST "http://localhost:5000/" -H "Content-Type: application/json" -d "{\"ping\":\"pong\"}"
```



#### <ins>AJAX endpoint (XML response)</ins>

- `GET /Ajax`

Returns a shuffled list of names as XML. The action sets `Response.ContentType = "application/xml"` and relies on the XML formatters configured in `Startup.cs`.

Example:

```bash
curl "http://localhost:5000/Ajax"
```



### Configuration

Configuration lives in `Riku/appsettings.json` and `Riku/appsettings.Development.json`.

- Logging levels are set under `Logging:LogLevel`.
- `AllowedHosts` is `*` by default.
- `https_port` is present but commented out.



### How the pipeline is configured

Key behaviors from `Program.cs` and `Startup.cs`:

- Uses the classic `Startup` pattern and `UseMvc` with endpoint routing disabled.
- Adds XML serializer formatters and a custom `XmlDataContractSerializerOutputFormatter` with UTF-8 encoding and no XML declaration.
- Registers application lifetime hooks that log start, stopping, and stopped events.



### Log files

The `DummyLogger` in `Riku/Controllers/DummyLogger.cs` writes log files next to the running executable or working directory:

- File name: `{appName}_yyyyMMddHHmm.log`
- Each request appends a timestamped log entry.


