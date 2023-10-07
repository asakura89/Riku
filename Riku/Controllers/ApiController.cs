using Arvy;
using Microsoft.AspNetCore.Http.Extensions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Primitives;
using Newtonsoft.Json;

namespace Riku.Controllers;

[ApiController]
public class ApiController : ControllerBase {

    [Route("Post")]
    [HttpPost]
    public async Task<String> PostAction() => await Return();

    [Route("Get")]
    [HttpGet]
    public async Task<String> GetAction() => await Return();

    [Route("Put")]
    [HttpPut]
    public async Task<String> PutAction() => await Return();

    [Route("Patch")]
    [HttpPatch]
    public async Task<String> PatchAction() => await Return();

    [Route("Delete")]
    [HttpDelete]
    public async Task<String> DeleteAction() => await Return();

    [Route("Status/{status}")]
    [HttpGet]
    public async Task<String> ReturnStatusAction(Int32 status) => await Return(status);

    async Task<String> Return() => await Return(200);

    async Task<String> Return(Int32 status) =>
        await Task.Run(async () => {
            try {
                String body = String.Empty;
                using (var mem = new MemoryStream()) {
                    using (var reader = new StreamReader(mem)) {
                        await Request.Body.CopyToAsync(mem);
                        mem.Seek(0, SeekOrigin.Begin);
                        //Request.Body.Position = 0;
                        body = await reader.ReadToEndAsync();
                    }
                }

                ConnectionInfo connection = Request.HttpContext.Connection;
                String response = JsonConvert.SerializeObject(new {
                    Url = Request.GetDisplayUrl(),
                    ClientIpv6 = connection.RemoteIpAddress.MapToIPv6().ToString(),
                    ClientIpv4 = connection.RemoteIpAddress.MapToIPv4().ToString(),
                    ClientPort = connection.RemotePort.ToString(),
                    Request.IsHttps,
                    Request.Scheme,
                    Request.Protocol,
                    Request.Method,
                    Request.ContentLength,
                    Request.ContentType,
                    Headers = Request.Headers.AsDictionary(),
                    QueryStrings = Request.Query.AsDictionary(),
                    Cookies = Request.Cookies.AsDictionary(),
                    Form =
                        Request
                            .Headers["Content-Type"]
                            .ToString()
                            .Equals("application/x-www-form-urlencoded", StringComparison.InvariantCultureIgnoreCase) ?
                        Request
                            .Form
                            .AsDictionary() :
                        new Dictionary<String, String>(),
                    Body = body
                }, Formatting.Indented);

                var logger = HttpContext.RequestServices.GetService(typeof(ILogger<ApiController>)) as ILogger<ApiController>;
                logger.LogInformation(response);

                Response.StatusCode = status;
                return response;
            }
            catch (Exception ex) {
                Response.StatusCode = 500;
                return JsonConvert.SerializeObject(new {
                    Message = "Riku Error",
                    Error = ex.AsActionResponseViewModel()
                }, Formatting.Indented);
            }
        });
}

public static class DictionaryExt {
    public static IDictionary<String, String> AsDictionary(this IHeaderDictionary headers) => (headers as IEnumerable<KeyValuePair<String, StringValues>>).AsDictionary();

    public static IDictionary<String, String> AsDictionary(this IQueryCollection queryStrings) => (queryStrings as IEnumerable<KeyValuePair<String, StringValues>>).AsDictionary();

    public static IDictionary<String, String> AsDictionary(this IFormCollection form) => (form as IEnumerable<KeyValuePair<String, StringValues>>).AsDictionary();

    public static IDictionary<String, String> AsDictionary(this IRequestCookieCollection cookies) {
        var dictionary = new Dictionary<String, String>();
        if (cookies == null)
            return dictionary;

        foreach (KeyValuePair<String, String> kv in cookies)
            dictionary.Add(kv.Key, kv.Value);

        return dictionary;
    }

    static IDictionary<String, String> AsDictionary(this IEnumerable<KeyValuePair<String, StringValues>> collection) {
        var dictionary = new Dictionary<String, String>();
        if (collection == null)
            return dictionary;

        foreach (KeyValuePair<String, StringValues> kv in collection)
            dictionary.Add(kv.Key, kv.Value);

        return dictionary;
    }
}
