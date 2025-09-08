using BasarStajAppp.Entity;
using Microsoft.EntityFrameworkCore;

namespace BasarStajAppp.Data;

public class AppDatabase : DbContext
{
    public AppDatabase(DbContextOptions<AppDatabase> options) : base(options) { }

    public DbSet<GeoFeature> Features => Set<GeoFeature>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var f = modelBuilder.Entity<GeoFeature>();
        f.ToTable("features");

        f.HasKey(x => x.Id);
        f.Property(x => x.Id).HasColumnName("id").ValueGeneratedOnAdd();
        f.Property(x => x.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
        f.Property(x => x.Geom).HasColumnName("geom").HasColumnType("geometry(Geometry, 4326)");

        // Explicit jsonb mapping + default []
        f.Property(x => x.Images)
         .HasColumnName("images")
         .HasColumnType("jsonb")
         .HasDefaultValueSql("'[]'::jsonb");
    }
}
