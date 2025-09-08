// /Services/GeometryEfService.cs
using BasarStajAppp.Data;
using BasarStajAppp.DTO;
using BasarStajAppp.Entity;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.IO;
using NetTopologySuite.Geometries;

namespace BasarStajAppp.Services
{
    public class GeometryEfService : IGeometryEfService
    {
        private readonly AppDatabase db;
        private readonly WKTReader wktReader = new(new GeometryFactory());

        public GeometryEfService(AppDatabase db) => this.db = db;

        public async Task<List<FeatureDto>> GetAllAsync()
        {
            var list = await db.Features.ToListAsync();
            var wktWriter = new WKTWriter();
            return list.Select(e => new FeatureDto
            {
                Id = e.Id,
                Name = e.Name,
                WKT = wktWriter.Write(e.Geom),
                Images = e.Images
            }).ToList();
        }


        public async Task<FeatureDto?> GetByIdAsync(int id)
        {
            var e = await db.Features.FindAsync(id);
            if (e == null) return null;
            var wktWriter = new WKTWriter();
            return new FeatureDto
            {
                Id = e.Id,
                Name = e.Name,
                WKT = wktWriter.Write(e.Geom),
                Images = e.Images
            };
        }

        public async Task<FeatureDto> CreateAsync(CreateWktDto dto)
        {
            var geom = string.IsNullOrWhiteSpace(dto.WKT) ? null : wktReader.Read(dto.WKT);
            var e = new GeoFeature
            {
                Name = dto.Name,
                Geom = geom ?? new Point(0, 0),
                Images = dto.Images ?? new List<string>()
            };
            db.Features.Add(e);
            await db.SaveChangesAsync();
            var wktWriter = new WKTWriter();
            return new FeatureDto
            {
                Id = e.Id,
                Name = e.Name,
                WKT = wktWriter.Write(e.Geom),
                Images = e.Images
            };
        }

        public async Task<bool> UpdateAsync(int id, UpdateWktDto dto)
        {
            var e = await db.Features.FindAsync(id);
            if (e is null) return false;

            if (!string.IsNullOrWhiteSpace(dto.Name))
                e.Name = dto.Name;

            if (!string.IsNullOrWhiteSpace(dto.WKT))
                e.Geom = new NetTopologySuite.IO.WKTReader(NetTopologySuite.Geometries.GeometryFactory.Default)
                            .Read(dto.WKT);

            if (dto.Images != null)
            {
                e.Images = dto.Images.ToList();                      // reassign
                db.Entry(e).Property(x => x.Images!).IsModified = true;
            }

            await db.SaveChangesAsync();
            return true;
        }



        public async Task<bool> DeleteAsync(int id)
        {
            var e = await db.Features.FindAsync(id);
            if (e == null) return false;
            db.Features.Remove(e);
            await db.SaveChangesAsync();
            return true;
        }
    }
}
