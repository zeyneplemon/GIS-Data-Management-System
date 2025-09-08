namespace BasarStajAppp.DTO
{
    public class FeatureDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string WKT { get; set; } = string.Empty;
        public List<string> Images { get; set; } = new();
    }

    public class CreateWktDto
    {
        public string Name { get; set; } = string.Empty;
        public string WKT { get; set; } = string.Empty;
        public List<string>? Images { get; set; }   // optional
    }

    public class UpdateWktDto
    {
        public string? Name { get; set; }
        public string? WKT { get; set; }
        public List<string>? Images { get; set; }   // optional
    }


}
