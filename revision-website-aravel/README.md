# Website Revision System

Aplikasi ini sudah diarahkan menjadi stack **full frontend React** dan **backend Golang**. Laravel lama tidak lagi menjadi jalur utama untuk menjalankan aplikasi; source React berada di `frontend-react/` dan REST API Golang berada di `backend-go/`.

## Struktur utama

- `frontend-react/`: aplikasi React + Vite untuk dashboard, pencarian, filter, tambah, edit, dan hapus data revisi.
- `backend-go/`: REST API Golang dengan storage JSON lokal untuk data revisi.
- `backend-go/data/revisions.json`: file data otomatis dibuat saat API pertama kali dijalankan.

## Menjalankan aplikasi

Terminal 1 untuk backend:

```bash
cd backend-go
go run ./cmd/server
```

Terminal 2 untuk frontend:

```bash
cd frontend-react
npm install
VITE_API_BASE_URL=http://localhost:8080 npm run dev
```

Buka URL Vite yang muncul di terminal, biasanya `http://localhost:5173`.

## Environment backend

- `PORT`: port API, default `8080`.
- `REVISION_DATA_PATH`: lokasi file JSON, default `data/revisions.json`.

## Endpoint API

- `GET /health`
- `GET /api/revisions?q=&status=`
- `POST /api/revisions`
- `PUT /api/revisions/{id}`
- `PATCH /api/revisions/{id}`
- `DELETE /api/revisions/{id}`

## Perintah validasi

```bash
cd backend-go && go test ./...
cd frontend-react && npm run build
```
