# 🗺️ **Full-Stack GIS Web Application**

<img width="1908" height="939" alt="mapviewer" src="https://github.com/user-attachments/assets/5eb58757-2fff-4848-ae5c-1fde467e174a" />


I have built a full-stack geospatial data management system built with .NET 7 Web API and PostgreSQL/PostGIS, using live map visualization via OpenLayers.
The video explanation of the project can be viewed [here](https://drive.google.com/drive/folders/1bsEu42O5mbH3PhTQLCsaU6e9_JmMIcqq?usp=sharing).

> Developed as part of an internship at Başarsoft — a GIS and location intelligence company.

## 🚀 Features

- Full CRUD API for geospatial data (Points, WKT geometries)

- Dual data access layer — ADO.NET for raw SQL control + Entity Framework Core for clean ORM workflows

- PostGIS integration via NetTopologySuite for spatial geometry processing

- OpenLayers frontend to visualize geospatial data on an interactive web map

- DTO-based architecture for secure and consistent API communication

- Swagger UI for endpoint testing and documentation

- Extendable design for future GIS features (bounding boxes, lines, polygons, ST_DWithin proximity queries)

## 🛠️ Tech Stack

| Layer  | Technology |
| ------------- | ------------- |
| Backend   | .NET 7 Web API |
| ORM  | Entity Framework Core  |
| Raw SQL   | ADO.NET + Npgsql |
| Database  | PostgreSQL + PostGIS  |
| Spatial Processing  | NetTopologySuite |
| Frontend Map   | OpenLayers |
| API Testing  | Swagger / OpenAPI  |

## 📁 Project Structure

```bash
BasarStajApp/

├── Controllers/        # API endpoints
├── DTOs/               # Data Transfer Objects
├── Entities/           # EF Core entity models
├── Repositories/
│   ├── EFCore/         # Entity Framework data layer
│   └── ADO/            # ADO.NET data layer
├── Services/           # Business logic
├── Migrations/         # EF Core migrations
└── Data/
    └── AppDbContext.cs  # DbContext configuration
```
## ⚙️ Setup & Running

### Prerequisites

- .NET 7 SDK

- PostgreSQL with PostGIS extension

### 1. Clone the repository
```
 bashgit clone https://github.com/zeyneplemon/BasarStaj.git
 cd BasarStaj
```

### 2. Configure the database
 #### - Update appsettings.json with your PostgreSQL connection string:

```
json"ConnectionStrings": {
  "DefaultConnection": "Host=localhost;Database=gisdb;Username=postgres;Password=yourpassword"
}
```
#### - Enable PostGIS on your database:

```
sqlCREATE EXTENSION postgis;
```

### 3. Apply migrations

```
bashdotnet ef database update
```

### 4. Run the API

``` 
bashdotnet run
```

### 5. Open Swagger UI

Navigate to https://localhost:{port}/swagger to explore and test all endpoints.



## 🗄️ Data Access Layers
This project implements two parallel data access strategies, demonstrating both approaches:

1. **ADO.NET** — manual SQL queries with Npgsql, custom data mapping, full control over query execution.
2. **Entity Framework Core** — code-first migrations, DbContext with PostGIS support via NetTopologySuite, clean repository pattern.

## 🌍 Map Visualization

Geospatial data is visualized in real time using OpenLayers, connected to the API backend. Points stored in the PostGIS database are rendered as map markers on an interactive web map.

## 👩‍💻 Author
**Zeynep Ünal — Basarsoft Internship, 2025**





