// /Data/AppDatabaseFactory.cs
using System.IO;
using BasarStajAppp.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace BasarStajAppp.Data;

public class AppDatabaseFactory : IDesignTimeDbContextFactory<AppDatabase>
{
    public AppDatabase CreateDbContext(string[] args)
    {
        // Load config the same way the app would
        var basePath = Directory.GetCurrentDirectory();
        var config = new ConfigurationBuilder()
            .SetBasePath(basePath)
            .AddJsonFile("appsettings.json", optional: false)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var cs = config.GetConnectionString("Default")
                 ?? "Host=localhost;Database=basar;Username=postgres;Password=postgres";

        var options = new DbContextOptionsBuilder<AppDatabase>()
            .UseNpgsql(cs, npgsql => npgsql.UseNetTopologySuite())
            .Options;

        return new AppDatabase(options);
    }
}
