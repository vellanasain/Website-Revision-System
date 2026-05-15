import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const EMPTY_FORM = {
  domain: '',
  clientName: '',
  marketingTeam: '',
  webTeam: '',
  revisionStatus: 'R0',
  paymentStatus: 'Belum Lunas',
  remainingAmount: 0,
  activePeriod: '-',
  notes: '',
};

function formatRupiah(value) {
  return Number(value || 0) > 0 ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value) : '-';
}

function App() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [revisions, setRevisions] = useState([]);
  const [stats, setStats] = useState({ total: 0, unpaid: 0, processRevision: 0, revisionDone: 0, paid: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingRevision, setEditingRevision] = useState(null);

  const endpoint = useMemo(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (status !== 'all') params.set('status', status);
    return `${API_BASE_URL}/api/revisions?${params.toString()}`;
  }, [query, status]);

  const loadRevisions = useCallback(() => {
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

  useEffect(() => loadRevisions(), [loadRevisions]);

  const openCreateForm = () => {
    setEditingRevision(null);
    setFormOpen(true);
  };

  const openEditForm = (revision) => {
    setEditingRevision(revision);
    setFormOpen(true);
  };

  const saveRevision = async (form) => {
    setSaving(true);
    setError('');
    setNotice('');
    const isEdit = Boolean(editingRevision);
    const url = isEdit ? `${API_BASE_URL}/api/revisions/${editingRevision.id}` : `${API_BASE_URL}/api/revisions`;
    const response = await fetch(url, {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, remainingAmount: Number(form.remainingAmount || 0) }),
    });
    const payload = response.status === 204 ? null : await response.json();
    setSaving(false);
    if (!response.ok) throw new Error(payload?.error || 'Gagal menyimpan revisi');
    setFormOpen(false);
    setEditingRevision(null);
    setNotice(isEdit ? 'Data revisi berhasil diperbarui.' : 'Data revisi baru berhasil dibuat.');
    loadRevisions();
  };

  const deleteRevision = async (revision) => {
    if (!window.confirm(`Hapus revisi untuk ${revision.domain}?`)) return;
    setError('');
    setNotice('');
    const response = await fetch(`${API_BASE_URL}/api/revisions/${revision.id}`, { method: 'DELETE' });
    if (!response.ok) {
      const payload = await response.json();
      setError(payload?.error || 'Gagal menghapus revisi');
      return;
    }
    setNotice('Data revisi berhasil dihapus.');
    loadRevisions();
  };

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
            <p>Frontend React penuh terhubung ke REST API Golang.</p>
          </div>
          <span className="local-state">React + Go aktif</span>
        </header>

        <section className="workspace-head">
          <h2>Manajemen Revisi Website</h2>
          <form className="search-form" onSubmit={(event) => event.preventDefault()}>
            <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Cari domain, nama klien, tim, atau catatan" />
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">Semua Status</option>
              <option value="Belum Lunas">Belum Lunas</option>
              <option value="50% Lunas">50% Lunas</option>
              <option value="Lunas">Lunas</option>
              <option value="R0">Belum Revisi</option>
              <option value="R1">Revisi 1</option>
              <option value="R2">Revisi 2</option>
              <option value="R3">Revisi Selesai</option>
            </select>
            <button className="primary-button search-button" type="submit" aria-label="Cari">⌕</button>
          </form>
          <button className="primary-button add-button" type="button" onClick={openCreateForm}>Tambah Revisi Baru</button>
        </section>

        <section className="metric-grid" aria-label="Ringkasan revisi">
          <Metric label="Total Revisi" value={stats.total} />
          <Metric label="Belum Lunas" value={stats.unpaid} />
          <Metric label="Proses Revisi" value={stats.processRevision} />
          <Metric label="Revisi Selesai" value={stats.revisionDone} />
        </section>

        <section className="revision-board">
          <div className="board-title"><h2>Daftar Revisi Aktif</h2></div>
          {notice && <div className="alert success">{notice}</div>}
          {error && <div className="alert error">{error}</div>}
          {loading ? <div className="empty-state">Memuat data...</div> : <RevisionTable revisions={revisions} onEdit={openEditForm} onDelete={deleteRevision} />}
        </section>
      </section>

      {formOpen && (
        <RevisionForm
          initialValue={editingRevision || EMPTY_FORM}
          saving={saving}
          title={editingRevision ? 'Edit Revisi' : 'Tambah Revisi Baru'}
          onCancel={() => setFormOpen(false)}
          onSubmit={(form) => saveRevision(form).catch((err) => {
            setSaving(false);
            setError(err.message);
          })}
        />
      )}
    </main>
  );
}

function Metric({ label, value }) {
  return <article className="metric-card"><span>{label}</span><strong>{value || 0}</strong></article>;
}

function RevisionTable({ revisions, onEdit, onDelete }) {
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
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {revisions.map((revision) => (
            <tr key={revision.id}>
              <td><strong>{revision.domain}</strong><small>{revision.notes || 'Tanpa catatan'}</small></td>
              <td>{revision.clientName || '-'}</td>
              <td>{revision.marketingTeam || '-'}</td>
              <td>{revision.webTeam || '-'}</td>
              <td><span className="revision-code">{revision.revisionStatus}</span></td>
              <td>{formatRupiah(revision.remainingAmount)}</td>
              <td><span className="payment-pill">{revision.paymentStatus}</span></td>
              <td>{revision.activePeriod}</td>
              <td>
                <div className="action-row">
                  <button type="button" className="ghost-button" onClick={() => onEdit(revision)}>Edit</button>
                  <button type="button" className="danger-button" onClick={() => onDelete(revision)}>Hapus</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RevisionForm({ initialValue, saving, title, onCancel, onSubmit }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initialValue });

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="revision-form" onSubmit={handleSubmit}>
        <div className="form-head">
          <h2>{title}</h2>
          <button type="button" className="close-button" onClick={onCancel} aria-label="Tutup">×</button>
        </div>
        <div className="form-grid">
          <label>Domain Sementara<input required value={form.domain} onChange={(event) => updateField('domain', event.target.value)} placeholder="contoh: project.test" /></label>
          <label>Nama Klien<input required value={form.clientName} onChange={(event) => updateField('clientName', event.target.value)} placeholder="Nama klien" /></label>
          <label>Tim Marketing<input value={form.marketingTeam} onChange={(event) => updateField('marketingTeam', event.target.value)} placeholder="Nama marketing" /></label>
          <label>Tim Web<input value={form.webTeam} onChange={(event) => updateField('webTeam', event.target.value)} placeholder="Tim website" /></label>
          <label>Status Revisi<select value={form.revisionStatus} onChange={(event) => updateField('revisionStatus', event.target.value)}><option>R0</option><option>R1</option><option>R2</option><option>R3</option></select></label>
          <label>Status Pembayaran<select value={form.paymentStatus} onChange={(event) => updateField('paymentStatus', event.target.value)}><option>Belum Lunas</option><option>50% Lunas</option><option>Lunas</option></select></label>
          <label>Sisa Pelunasan<input min="0" type="number" value={form.remainingAmount} onChange={(event) => updateField('remainingAmount', event.target.value)} /></label>
          <label>Periode Aktif<input value={form.activePeriod} onChange={(event) => updateField('activePeriod', event.target.value)} placeholder="- atau DD/MM/YYYY" /></label>
          <label className="full-field">Catatan<textarea value={form.notes} onChange={(event) => updateField('notes', event.target.value)} placeholder="Catatan revisi terakhir" /></label>
        </div>
        <div className="form-actions">
          <button type="button" className="ghost-button" onClick={onCancel}>Batal</button>
          <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
        </div>
      </form>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
