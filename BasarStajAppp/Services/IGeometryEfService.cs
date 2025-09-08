using BasarStajAppp.DTO;

namespace BasarStajAppp.Services
{
    public interface IGeometryEfService
    {
        Task<List<FeatureDto>> GetAllAsync();
        Task<FeatureDto?> GetByIdAsync(int id);
        Task<FeatureDto> CreateAsync(CreateWktDto dto);
        Task<bool> UpdateAsync(int id, UpdateWktDto dto);
        Task<bool> DeleteAsync(int id);
    }
}
