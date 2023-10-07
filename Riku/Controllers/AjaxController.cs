using System.Text.Json;
using Arvy;
using Microsoft.AspNetCore.Mvc;
using RyaNG;

namespace Riku.Controllers;

[ApiController]
public class AjaxController : ControllerBase {
    [Route("Ajax")]
    [HttpGet]
    public async Task<String[]> AjaxAction() =>
        await Task.Run(async () => {
            try {
                Response.ContentType = "application/xml";

                String[] strings = new[] {
                    "Clifford", "Lewis", "Ollie", "Leah", "Kathryn",
                    "Carolyn", "Genevieve", "Adam", "Milton", "Eleanor",
                    "Maurice", "Ethel", "Charles", "Danny", "Stephen",
                    "Gabriel", "Susan", "Donald", "Isabella", "Patrick"
                };

                Int32 ctr = 0;
                while (ctr < strings.Length) {
                    Int32 randIdx = 0.Ryandomize(ctr + 1);

                    String temp = strings[randIdx];
                    strings[randIdx] = strings[ctr];
                    strings[ctr] = temp;

                    ctr++;
                }

                var logger = HttpContext.RequestServices.GetService(typeof(ILogger<ApiController>)) as ILogger<ApiController>;
                logger.LogInformation(String.Join(",\r\n", strings));

                Response.StatusCode = 200;
                return strings;
            }
            catch (Exception ex) {
                Response.StatusCode = 500;
                return new[] {
                    JsonSerializer
                        .Serialize(
                            new {
                                Message = "Riku Error",
                                Error = ex.AsActionResponseViewModel()
                            },
                            typeof(Object),
                            new JsonSerializerOptions { WriteIndented = true })
                };
            }
        });
}
