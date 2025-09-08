using BasarStajAppp.Entity;

namespace BasarStajAppp.Services;

public interface IPointAdoService
{
    Task<bool> TestConnectionAsync();
    Task<IEnumerable<AdoPoint>> GetAllAsync();
    Task<AdoPoint?> GetByIdAsync(int id);
    Task<int> CreateAsync(AdoPoint p);
    Task<bool> UpdateAsync(AdoPoint p);
    Task<bool> DeleteAsync(int id);
}
