# Frontend React

Frontend React memakai Vite dan mengambil data dari backend Golang. UI mendukung pencarian, filter status, ringkasan metrik, tambah revisi, edit revisi, dan hapus revisi.

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
