namespace Riku;

public class Startup {
    public Startup(IConfiguration configuration) {
        Configuration = configuration;
    }

    public IConfiguration Configuration { get; }

    public void ConfigureServices(IServiceCollection services) =>
        services.AddMvc(options =>
            options.EnableEndpointRouting = false);

    public void Configure(IApplicationBuilder webAppBuilder) {
        webAppBuilder.UseMvc();

        IHostApplicationLifetime lifetime = webAppBuilder.ApplicationServices.GetService<IHostApplicationLifetime>();
        lifetime.ApplicationStarted.Register(() => OnAppStarted(webAppBuilder.ApplicationServices));
        lifetime.ApplicationStopping.Register(() => OnAppStopping(webAppBuilder.ApplicationServices));
        lifetime.ApplicationStopped.Register(() => OnAppStopped(webAppBuilder.ApplicationServices));
    }

    void OnAppStarted(IServiceProvider appServices) {
        ILogger<Startup> logger = appServices.GetService<ILogger<Startup>>();
        logger.LogInformation($"{nameof(OnAppStarted)} is executing.");
    }

    void OnAppStopping(IServiceProvider appServices) {
        ILogger<Startup> logger = appServices.GetService<ILogger<Startup>>();
        logger.LogInformation($"{nameof(OnAppStopping)} is executing.");
    }

    void OnAppStopped(IServiceProvider appServices) {
        ILogger<Startup> logger = appServices.GetService<ILogger<Startup>>();
        logger.LogInformation($"{nameof(OnAppStopped)} is executing.");
    }
}
