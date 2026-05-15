# Website Revision System (React + Go Only)

Aplikasi ini sekarang berjalan **tanpa runtime Laravel/PHP**.
Frontend utama adalah **React + Vite** (`localhost:5173`) dan backend utama adalah **Golang API** (`localhost:8080`).

## Arsitektur aktif

- `frontend-react/` → SPA React (render halaman, termasuk halaman revisi).
- `backend-go/` → REST API Golang.
- Tidak ada render Blade.
- Tidak ada route Laravel untuk `/revisions`.
- Tidak menggunakan `php artisan serve`.
- Tidak ada aplikasi yang dijalankan di port `8000` sebagai entrypoint utama.

## Menjalankan aplikasi

### 1) Backend Go (wajib)

```bash
cd backend-go
go run ./cmd/server
```

Backend aktif di `http://localhost:8080`.

### 2) Frontend React Vite (wajib)

```bash
cd frontend-react
npm install
VITE_API_BASE_URL=http://localhost:8080 npm run dev
```

Frontend aktif di `http://localhost:5173`.

## Alur data

Frontend React mengambil data **langsung** ke API Go:

- `GET /api/revisions`
- `POST /api/revisions`
- `PUT /api/revisions/{id}`
- `PATCH /api/revisions/{id}`
- `DELETE /api/revisions/{id}`

Implementasi client API ada di `frontend-react/src/api.js`.

## Konfigurasi environment

Gunakan `.env` / `.env.example` berbasis React+Go:

- `VITE_API_BASE_URL=http://localhost:8080`
- `PORT=8080`
- `REVISION_DATA_PATH=backend-go/data/revisions.json`

## Dev tunnel

Tunnel development harus diarahkan ke:

- Frontend: `http://localhost:5173`, atau
- Backend API: `http://localhost:8080`

**Jangan** arahkan tunnel ke Laravel/PHP atau port `8000`.
