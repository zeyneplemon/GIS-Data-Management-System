using BasarStajAppp.Data;
using BasarStajAppp.Services;
using Microsoft.EntityFrameworkCore;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);


var cs = builder.Configuration.GetConnectionString("DefaultConnection");
var dsb = new NpgsqlDataSourceBuilder(cs);
dsb.EnableDynamicJson();
dsb.UseNetTopologySuite();
var dataSource = dsb.Build();

builder.Services.AddDbContext<AppDatabase>(opt =>
    opt.UseNpgsql(dataSource, o => o.UseNetTopologySuite()));
builder.Services.AddScoped<IGeometryEfService, GeometryEfService>();


builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// --- Middleware ---
app.UseSwagger();
app.UseSwaggerUI();

app.UseHttpsRedirection();

app.UseDefaultFiles(new DefaultFilesOptions
{
    DefaultFileNames = new List<string> { "index.html" }
});
app.UseStaticFiles();

app.UseAuthorization();
app.MapControllers();

app.Run();
