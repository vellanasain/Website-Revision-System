# Backend Golang

Backend Golang ini menyediakan REST API untuk sistem revisi website dan menyimpan data ke file JSON lokal. File data dibuat otomatis saat server pertama kali dijalankan.

## Endpoint

- `GET /health`
- `GET /api/health` (alias kompatibilitas legacy)
- `GET /api/revisions?q=&status=`
- `POST /api/revisions`
- `PUT /api/revisions/{id}`
- `PATCH /api/revisions/{id}`
- `DELETE /api/revisions/{id}`

## Payload revisi

```json
{
  "domain": "project.test",
  "clientName": "Nama Klien",
  "marketingTeam": "Ayu",
  "webTeam": "Tim Website A",
  "revisionStatus": "R1",
  "paymentStatus": "50% Lunas",
  "remainingAmount": 1500000,
  "activePeriod": "15/06/2026",
  "notes": "Catatan revisi"
}
```

## Menjalankan

```bash
go run ./cmd/server
```

Server berjalan di `http://localhost:8080` secara default.

## Environment

- `PORT`: port server, default `8080`.
- `REVISION_DATA_PATH`: lokasi file JSON, default `data/revisions.json`.

## Test

```bash
go test ./...
```

## Catatan runtime

Backend ini adalah satu-satunya runtime API. Jangan jalankan `php artisan serve`.
