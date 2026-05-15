# Frontend React + Vite

Frontend ini adalah SPA React murni. `index.html` hanya menyediakan mount point `#root`; semua tampilan aplikasi dirender oleh komponen React di `src/App.jsx` dan data diambil dari REST API Golang.

## Menjalankan

```bash
npm install
VITE_API_BASE_URL=http://localhost:8080 npm run dev
```

## Build produksi

```bash
npm run build
```

## Konfigurasi

- `VITE_API_BASE_URL`: alamat backend Golang, default `http://localhost:8080`.

## Catatan migrasi

- Tidak ada ketergantungan route Laravel `/revisions`.
- Frontend hanya konsumsi API Go via `VITE_API_BASE_URL`.
