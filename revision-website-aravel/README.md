# Website Revision System

Project ini sekarang menyiapkan dua jalur aplikasi:

1. **Legacy Laravel** untuk menjaga fitur yang sudah ada tetap bisa berjalan.
2. **Frontend React + Backend Golang** sebagai stack baru yang lebih mudah dipakai lintas laptop dan mobile friendly.

## Struktur penting

- `public/css/revision-ui.css` dan `resources/sass/revision-ui.scss`: styling Laravel yang sudah diperbaiki agar responsive.
- `frontend-react/`: aplikasi React + Vite untuk frontend baru.
- `backend-go/`: API REST Golang untuk backend baru.

## Menjalankan stack React + Golang

Terminal 1:

```bash
cd backend-go
go run ./cmd/server
```

Terminal 2:

```bash
cd frontend-react
npm install
VITE_API_BASE_URL=http://localhost:8080 npm run dev
```

Buka URL Vite yang muncul di terminal, biasanya `http://localhost:5173`.

## Menjalankan Laravel lama

```bash
composer install
npm install
php artisan key:generate
php artisan migrate --seed
php artisan serve
```
