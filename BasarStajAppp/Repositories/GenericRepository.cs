using BasarStajAppp.Data;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace BasarStajAppp.Repositories;

public class GenericRepository<T> : IGenericRepository<T> where T : class
{
    private readonly AppDatabase _db;
    private readonly DbSet<T> _set;

    public GenericRepository(AppDatabase db)
    {
        _db = db;
        _set = db.Set<T>();
    }

    public Task<T?> GetByIdAsync(int id) => _set.FindAsync(id).AsTask();
    public Task<List<T>> GetAllAsync() => _set.AsNoTracking().ToListAsync();
    public Task<List<T>> FindAsync(Expression<Func<T, bool>> predicate)
        => _set.AsNoTracking().Where(predicate).ToListAsync();

    public Task AddAsync(T entity) => _set.AddAsync(entity).AsTask();
    public void Update(T entity) => _set.Update(entity);
    public void Remove(T entity) => _set.Remove(entity);
    public Task<int> SaveChangesAsync() => _db.SaveChangesAsync();
}
