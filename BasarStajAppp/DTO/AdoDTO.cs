using System.ComponentModel.DataAnnotations;

namespace BasarStajAppp.DTO
{
    public class AdoDTO
    {
        public int Id { get; set; }

        [Required]
        public string Name { get; set; } = "";

        [Required]
        public string WKT { get; set; } = "";
    }

    public class CreateAdoPointDTO
    {

        [Required]
        [StringLength(100, MinimumLength = 3)]
        public string Name { get; set; } = "";

        [Required]
        public string? WKT { get; set; } = "";

    }

    public class UpdateAdoPointDTO
    {

        [Required]
        [StringLength(100, MinimumLength = 3)]
        public string Name { get; set; } = "";

        [Required]
        public string? WKT { get; set; } = "";

    }
}
