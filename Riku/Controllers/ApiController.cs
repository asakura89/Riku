using System;
using System.Collections.Generic;
using System.IO;
using Arvy;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Extensions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Primitives;
using Newtonsoft.Json;

namespace Riku.Controllers {
    [ApiController]
    public class ApiController : ControllerBase {

        [Route("Post")]
        [HttpPost]
        public String PostAction() => Return();

        [Route("Get")]
        [HttpGet]
        public String GetAction() => Return();

        [Route("Put")]
        [HttpPut]
        public String PutAction() => Return();

        [Route("Patch")]
        [HttpPatch]
        public String PatchAction() => Return();

        [Route("Delete")]
        [HttpDelete]
        public String DeleteAction() => Return();

        String Return() {
            try {
                String body = String.Empty;
                using (var mem = new MemoryStream()) {
                    using (var reader = new StreamReader(mem)) {
                        Request.Body.CopyTo(mem);
                        mem.Seek(0, SeekOrigin.Begin);
                        //Request.Body.Position = 0;
                        body = reader.ReadToEnd();
                    }
                }

                ConnectionInfo connection = Request.HttpContext.Connection;
                String response = JsonConvert.SerializeObject(new {
                    Url = Request.GetDisplayUrl(),
                    Ip = connection.RemoteIpAddress.ToString(),
                    Port = connection.RemotePort.ToString(),
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

                Response.StatusCode = 200;
                return response;
            }
            catch (Exception ex) {
                Response.StatusCode = 500;
                return JsonConvert.SerializeObject(ex.AsActionResponseViewModel(), Formatting.Indented);
            }
        }
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
}
