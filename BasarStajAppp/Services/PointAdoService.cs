using BasarStajAppp.Entity;
using Microsoft.Extensions.Configuration;
using Npgsql;

namespace BasarStajAppp.Services;

public class PointAdoServices : IPointAdoService
{
    private readonly string connectionstring;
    public PointAdoServices(IConfiguration cfg)
        => connectionstring = cfg.GetConnectionString("Default")!;

    public async Task<bool> TestConnectionAsync()
    {
        try
        {
            await using var cs = new NpgsqlConnection(connectionstring);
            await cs.OpenAsync();
            await using var cmd = new NpgsqlCommand("SELECT PostGIS_Version()", cs);
            _ = await cmd.ExecuteScalarAsync();
            return true;
        }
        catch { return false; }
    }

    public async Task<IEnumerable<AdoPoint>> GetAllAsync()
    {
        var list = new List<AdoPoint>();
        await using var cs = new NpgsqlConnection(connectionstring);
        await cs.OpenAsync();

        const string sql = @"SELECT id, name, ST_AsText(geom) AS wkt
                             FROM points
                             ORDER BY id;";
        await using var cmd = new NpgsqlCommand(sql, cs);
        await using var r = await cmd.ExecuteReaderAsync();

        while (await r.ReadAsync())
        {
            list.Add(new AdoPoint
            {
                Id = r.GetInt32(0),
                Name = r.GetString(1),
                WKT = r.GetString(2)
            });
        }
        return list;
    }

    public async Task<AdoPoint?> GetByIdAsync(int id)
    {
        await using var cs = new NpgsqlConnection(connectionstring);
        await cs.OpenAsync();

        const string sql = @"SELECT id, name, ST_AsText(geom) AS wkt
                             FROM points
                             WHERE id = @id;";   // ✅ add WHERE

        await using var cmd = new NpgsqlCommand(sql, cs);
        cmd.Parameters.AddWithValue("@id", id);

        await using var r = await cmd.ExecuteReaderAsync();
        if (await r.ReadAsync())
        {
            return new AdoPoint
            {
                Id = r.GetInt32(0),
                Name = r.GetString(1),
                WKT = r.GetString(2)
            };
        }
        return null;
    }

    public async Task<int> CreateAsync(AdoPoint p)
    {
        await using var cs = new NpgsqlConnection(connectionstring);
        await cs.OpenAsync();

        const string sql = @"INSERT INTO points (name, geom)
                             VALUES (@name, ST_GeomFromText(@wkt, 4326))
                             RETURNING id;";
        await using var cmd = new NpgsqlCommand(sql, cs);
        cmd.Parameters.AddWithValue("@name", p.Name);
        cmd.Parameters.AddWithValue("@wkt", string.IsNullOrWhiteSpace(p.WKT) ? "POINT(0 0)" : p.WKT);

        var newId = await cmd.ExecuteScalarAsync();
        return Convert.ToInt32(newId);
    }

    public async Task<bool> UpdateAsync(AdoPoint p)
    {
        await using var cs = new NpgsqlConnection(connectionstring);
        await cs.OpenAsync();

        const string sql = @"UPDATE points
                             SET name = @name,
                                 geom = COALESCE(ST_GeomFromText(@wkt, 4326), geom)
                             WHERE id = @id;";
        await using var cmd = new NpgsqlCommand(sql, cs);
        cmd.Parameters.AddWithValue("@id", p.Id);
        cmd.Parameters.AddWithValue("@name", p.Name);
        cmd.Parameters.AddWithValue("@wkt",
            (object?)(string.IsNullOrWhiteSpace(p.WKT) ? null : p.WKT) ?? DBNull.Value);

        var affected = await cmd.ExecuteNonQueryAsync();
        return affected > 0;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        await using var cs = new NpgsqlConnection(connectionstring);
        await cs.OpenAsync();

        const string sql = "DELETE FROM points WHERE id = @id;";
        await using var cmd = new NpgsqlCommand(sql, cs);
        cmd.Parameters.AddWithValue("@id", id);

        var affected = await cmd.ExecuteNonQueryAsync();
        return affected > 0;
    }
}
