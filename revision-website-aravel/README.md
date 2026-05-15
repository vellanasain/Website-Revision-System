# Website Revision System

Aplikasi ini sekarang memakai frontend **React murni dengan Vite** dan backend **Golang REST API**. Laravel lama tetap ada hanya sebagai artefak legacy minimal, tetapi tidak lagi menjadi jalur render halaman dan tidak memiliki Blade view untuk UI aplikasi.

## Struktur utama

- `frontend-react/`: single page application React + Vite. Semua tampilan dashboard, tabel, pencarian, filter, tambah, edit, dan hapus revisi dirender dari komponen React di `frontend-react/src/`.
- `backend-go/`: REST API Golang dengan storage JSON lokal untuk data revisi.
- `backend-go/data/revisions.json`: file data otomatis dibuat saat API pertama kali dijalankan.

## Status Laravel legacy

- Tidak ada `resources/views` aplikasi yang dipakai untuk merender halaman.
- Tidak ada route web Laravel yang mengembalikan Blade.
- Asset Laravel Mix lama (`webpack.mix.js`, `resources/js`, `resources/sass`, `public/js`, dan `public/css` untuk UI revisi) sudah dihapus agar frontend hanya berasal dari build Vite.
- Route Laravel yang tersisa hanya fallback API legacy yang mengarahkan pengguna ke backend Go.

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

## Build produksi

```bash
cd frontend-react
npm run build
```

Hasil build berada di `frontend-react/dist/` dan dapat disajikan sebagai static SPA oleh web server apa pun.

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
