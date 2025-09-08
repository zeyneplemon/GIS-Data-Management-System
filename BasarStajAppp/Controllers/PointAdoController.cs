// using System.Drawing;   // ❌ remove this line (conflicts with Point)
using BasarStajAppp.DTO;
using BasarStajAppp.Services;
using Microsoft.AspNetCore.Mvc;
using BasarStajAppp.Entity;

namespace BasarStajAppp.Controllers;

[ApiController]
[Route("api/point-ado")]
public class PointAdoController : ControllerBase
{
    private readonly IPointAdoService svc;
    public PointAdoController(IPointAdoService svc) => this.svc = svc;

    [HttpGet("test-connection")]
    public async Task<ActionResult<string>> TestConnectionAsync()
        => (await svc.TestConnectionAsync()) ? Ok("The connection is successful.")
                                             : StatusCode(500, "The connection is failed.");

    [HttpGet]
    public async Task<ActionResult<IEnumerable<AdoDTO>>> GetAllAsync()
    {
        var points = await svc.GetAllAsync();
        var dtos = points.Select(p => new AdoDTO { Id = p.Id, Name = p.Name, WKT = p.WKT });
        return Ok(dtos);
    }

    // 👇 give this route a name used by CreatedAtRoute
    [HttpGet("{id:int}", Name = "GetAdoPointById")]
    public async Task<ActionResult<AdoDTO>> GetByIdAsync(int id)
    {
        var p = await svc.GetByIdAsync(id);
        if (p is null) return NotFound();
        return Ok(new AdoDTO { Id = p.Id, Name = p.Name, WKT = p.WKT });
    }

    [HttpPost]
    public async Task<ActionResult> CreateAsync(CreateAdoPointDTO dto)
    {
        var id = await svc.CreateAsync(new AdoPoint { Name = dto.Name, WKT = dto.WKT ?? "POINT(0 0)" });
        return CreatedAtRoute("GetAdoPointById", new { id }, new { id });
    }

    // include id in route and param name must be `id`
    [HttpPut("{id:int}")]
    public async Task<ActionResult> UpdateAsync(int id, UpdateAdoPointDTO dto)
    {
        var ok = await svc.UpdateAsync(new AdoPoint { Id = id, Name = dto.Name, WKT = dto.WKT ?? "" });
        return ok ? NoContent() : NotFound();
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult> DeleteAsync(int id)
        => await svc.DeleteAsync(id) ? NoContent() : NotFound();
}
