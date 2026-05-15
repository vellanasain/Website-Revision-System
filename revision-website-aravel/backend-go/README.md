# Backend Golang

Backend Golang ini menyediakan API REST untuk halaman revisi website.

## Endpoint

- `GET /health`
- `GET /api/revisions?q=&status=`
- `POST /api/revisions`
- `PATCH /api/revisions/{id}`
- `DELETE /api/revisions/{id}`

## Menjalankan

```bash
go run ./cmd/server
```

Server berjalan di `http://localhost:8080`.
