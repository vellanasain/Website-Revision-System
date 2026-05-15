# Website Revision System

Aplikasi ini menggunakan frontend **React + Vite** dan backend **Golang REST API**.
Semua artefak Laravel/PHP sudah dihapus, sehingga aplikasi **tidak membutuhkan `php artisan serve`**.

## Struktur utama

- `frontend-react/`: single page application React.
- `backend-go/`: REST API Golang.
- `backend-go/data/revisions.json`: data lokal (dibuat otomatis saat backend pertama jalan).

## Menjalankan aplikasi (tanpa PHP)

Terminal 1 (backend):

```bash
cd backend-go
go run ./cmd/server
```

Terminal 2 (frontend):

```bash
cd frontend-react
npm install
VITE_API_BASE_URL=http://localhost:8080 npm run dev
```

Buka URL Vite yang muncul di terminal (umumnya `http://localhost:5173`).

## Build produksi

```bash
cd frontend-react
npm run build
```

## Environment backend

- `PORT`: port API (default `8080`).
- `REVISION_DATA_PATH`: lokasi file JSON (default `data/revisions.json`).

## Endpoint API

- `GET /health`
- `GET /api/revisions?q=&status=`
- `POST /api/revisions`
- `PUT /api/revisions/{id}`
- `PATCH /api/revisions/{id}`
- `DELETE /api/revisions/{id}`

## Validasi

```bash
cd backend-go && go test ./...
cd frontend-react && npm run build
```
