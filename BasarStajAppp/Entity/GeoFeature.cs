using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using NetTopologySuite.Geometries;

namespace BasarStajAppp.Entity;

public class GeoFeature
{
    public int Id { get; set; }

    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    public Geometry Geom { get; set; } = default!;

    // IMPORTANT: map to jsonb column
    [Column("images", TypeName = "jsonb")]
    public List<string> Images { get; set; } = new();
}
