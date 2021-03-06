using System;
using Microsoft.AspNetCore;
using Microsoft.AspNetCore.Hosting;

namespace Riku {
    public class Program {
        public static void Main(String[] args) =>
            WebHost
                .CreateDefaultBuilder(args)
                .UseStartup<Startup>()
                .Build()
                .Run();
    }
}
