import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

function formatRupiah(value) {
  return Number(value || 0) > 0 ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value) : '-';
}

function App() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [revisions, setRevisions] = useState([]);
  const [stats, setStats] = useState({ total: 0, unpaid: 0, processRevision: 0, revisionDone: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const endpoint = useMemo(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (status !== 'all') params.set('status', status);
    return `${API_BASE_URL}/api/revisions?${params.toString()}`;
  }, [query, status]);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    fetch(endpoint)
      .then((response) => {
        if (!response.ok) throw new Error('Gagal memuat data revisi');
        return response.json();
      })
      .then((payload) => {
        if (ignore) return;
        setRevisions(payload.data || []);
        setStats(payload.stats || {});
        setError('');
      })
      .catch((err) => {
        if (!ignore) setError(err.message);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [endpoint]);

  return (
    <main className="app-shell">
      <aside className="rail" aria-label="Navigasi utama">
        <div className="brand-mark">SC</div>
        <button className="rail-button active" aria-label="Data revisi">↻</button>
      </aside>

      <section className="page-shell">
        <header className="topbar">
          <div>
            <h1>Daftar Revisi Website</h1>
            <p>Frontend React terhubung ke backend Golang.</p>
          </div>
          <span className="local-state">Local active</span>
        </header>

        <section className="workspace-head">
          <h2>Manajemen Revisi Website</h2>
          <form className="search-form" onSubmit={(event) => event.preventDefault()}>
            <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Cari domain, nama klien, atau tim" />
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">Semua Status</option>
              <option value="Belum Lunas">Belum Lunas</option>
              <option value="50% Lunas">50% Lunas</option>
              <option value="Lunas">Lunas</option>
              <option value="R1">Proses Revisi</option>
              <option value="R3">Revisi Selesai</option>
            </select>
            <button className="primary-button search-button" type="submit" aria-label="Cari">⌕</button>
          </form>
          <button className="primary-button add-button" type="button">Tambah Revisi Baru</button>
        </section>

        <section className="metric-grid" aria-label="Ringkasan revisi">
          <Metric label="Total Revisi" value={stats.total} />
          <Metric label="Belum Lunas" value={stats.unpaid} />
          <Metric label="Proses Revisi" value={stats.processRevision} />
          <Metric label="Revisi Selesai" value={stats.revisionDone} />
        </section>

        <section className="revision-board">
          <div className="board-title"><h2>Daftar Revisi Aktif</h2></div>
          {error && <div className="alert error">{error}</div>}
          {loading ? <div className="empty-state">Memuat data...</div> : <RevisionTable revisions={revisions} />}
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value }) {
  return <article className="metric-card"><span>{label}</span><strong>{value || 0}</strong></article>;
}

function RevisionTable({ revisions }) {
  if (!revisions.length) return <div className="empty-state">Tidak ada revisi yang cocok dengan filter.</div>;

  return (
    <div className="revision-table-wrap">
      <table className="revision-table">
        <thead>
          <tr>
            <th>Domain Sementara</th>
            <th>Nama Klien</th>
            <th>Tim Marketing</th>
            <th>Tim Web</th>
            <th>Status Revisi</th>
            <th>Sisa Pelunasan</th>
            <th>Status Pembayaran</th>
            <th>Periode Aktif</th>
          </tr>
        </thead>
        <tbody>
          {revisions.map((revision) => (
            <tr key={revision.id}>
              <td><strong>{revision.domain}</strong></td>
              <td>{revision.clientName || '-'}</td>
              <td>{revision.marketingTeam || '-'}</td>
              <td>{revision.webTeam || '-'}</td>
              <td><span className="revision-code">{revision.revisionStatus}</span></td>
              <td>{formatRupiah(revision.remainingAmount)}</td>
              <td><span className="payment-pill">{revision.paymentStatus}</span></td>
              <td>{revision.activePeriod}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
