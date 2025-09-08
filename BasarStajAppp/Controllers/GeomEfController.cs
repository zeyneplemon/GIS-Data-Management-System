// /Controllers/GeomEfController.cs
using BasarStajAppp.Data;
using BasarStajAppp.DTO;
using BasarStajAppp.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;

namespace BasarStajAppp.Controllers;

[ApiController]
[Route("api/geom-ef")]
public class GeomEfController : ControllerBase
{
    private readonly IGeometryEfService _svc;
    public GeomEfController(IGeometryEfService svc) => _svc = svc;

    // ---------- CRUD via service ----------

    [HttpGet]
    public async Task<ActionResult<IEnumerable<FeatureDto>>> GetAll()
        => Ok(await _svc.GetAllAsync());

    [HttpGet("{id:int}")]
    public async Task<ActionResult<FeatureDto>> GetById(int id)
    {
        var r = await _svc.GetByIdAsync(id);
        return r is null ? NotFound() : Ok(r);
    }

    [HttpPost]
    public async Task<ActionResult<FeatureDto>> Create([FromBody] CreateWktDto dto)
        => Ok(await _svc.CreateAsync(dto));

    [HttpPut("{id:int}")]
    public async Task<ActionResult> Update(int id, [FromBody] UpdateWktDto dto)
        => await _svc.UpdateAsync(id, dto) ? NoContent() : NotFound();

    [HttpDelete("{id:int}")]
    public async Task<ActionResult> Delete(int id)
        => await _svc.DeleteAsync(id) ? NoContent() : NotFound();

    // ---------- IMAGES: upload & delete (EF direct) ----------

    // POST /api/geom-ef/{id}/images
    [HttpPost("{id:int}/images")]
    [RequestSizeLimit(10_000_000)]
    public async Task<ActionResult<FeatureDto>> UploadImage(
        int id,
        IFormFile file,
        [FromServices] AppDatabase db,
        [FromServices] IWebHostEnvironment env)
    {
        if (file == null || file.Length == 0) return BadRequest("file is required");
        if (!file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            return BadRequest("Only image files are allowed.");

        var webroot = env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        var uploadsDir = Path.Combine(webroot, "uploads");
        Directory.CreateDirectory(uploadsDir);

        var ext = Path.GetExtension(file.FileName);
        var fname = $"{Guid.NewGuid():N}{(string.IsNullOrWhiteSpace(ext) ? ".jpg" : ext)}";
        var full = Path.Combine(uploadsDir, fname);
        await using (var fs = System.IO.File.Create(full))
            await file.CopyToAsync(fs);

        var url = $"/uploads/{fname}";

        var e = await db.Features.FindAsync(id);
        if (e is null) return NotFound();

        // IMPORTANT: reassign, don't just .Add()
        var imgs = (e.Images ?? new List<string>()).ToList();
        imgs.Add(url);
        e.Images = imgs;
        db.Entry(e).Property(x => x.Images!).IsModified = true;

        await db.SaveChangesAsync();

        var wkt = new NetTopologySuite.IO.WKTWriter().Write(e.Geom);
        return Ok(new FeatureDto { Id = e.Id, Name = e.Name, WKT = wkt, Images = e.Images });
    }

    // DELETE /api/geom-ef/{id}/images?index=.. OR ?url=..
    [HttpDelete("{id:int}/images")]
    public async Task<ActionResult<FeatureDto>> DeleteImage(
        int id,
        [FromQuery] int? index,
        [FromQuery] string? url,
        [FromServices] AppDatabase db,
        [FromServices] IWebHostEnvironment env)
    {
        var e = await db.Features.FindAsync(id);
        if (e is null) return NotFound();

        var imgs = (e.Images ?? new List<string>()).ToList();
        if (imgs.Count == 0) return NotFound("No images to delete.");

        int idx = -1;
        if (index is int i)
        {
            if (i < 0 || i >= imgs.Count) return NotFound("Image index out of range.");
            idx = i;
        }
        else
        {
            if (string.IsNullOrWhiteSpace(url)) return BadRequest("Provide index or url.");
            string Normalize(string s)
            {
                try
                {
                    var u = new Uri(s, UriKind.RelativeOrAbsolute);
                    s = u.IsAbsoluteUri ? u.PathAndQuery : s;
                }
                catch { }
                return Uri.UnescapeDataString(s).TrimStart('/');
            }
            var target = Normalize(url);
            idx = imgs.FindIndex(s => Normalize(s).Equals(target, StringComparison.OrdinalIgnoreCase));
            if (idx < 0) return NotFound("Image not found.");
        }

        var removed = imgs[idx];
        imgs.RemoveAt(idx);

        // IMPORTANT: reassign, don't just .RemoveAt()
        e.Images = imgs;
        db.Entry(e).Property(x => x.Images!).IsModified = true;

        await db.SaveChangesAsync();

        // best-effort physical delete
        try
        {
            if (removed.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase))
            {
                var webroot = env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                var full = Path.Combine(webroot, removed.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
                if (System.IO.File.Exists(full)) System.IO.File.Delete(full);
            }
        }
        catch { /* ignore */ }

        var wkt = new NetTopologySuite.IO.WKTWriter().Write(e.Geom);
        return Ok(new FeatureDto { Id = e.Id, Name = e.Name, WKT = wkt, Images = e.Images });
    }


}
