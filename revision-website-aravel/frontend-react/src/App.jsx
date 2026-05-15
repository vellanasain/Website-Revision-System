import { useCallback, useEffect, useMemo, useState } from 'react';
import { API_BASE_URL, createRevision, fetchRevisions, removeRevision, updateRevision } from './api';

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

const DEFAULT_STATS = { total: 0, unpaid: 0, processRevision: 0, revisionDone: 0, paid: 0 };
const STATUS_OPTIONS = [
  { value: 'all', label: 'Semua Status' },
  { value: 'Belum Lunas', label: 'Belum Lunas' },
  { value: '50% Lunas', label: '50% Lunas' },
  { value: 'Lunas', label: 'Lunas' },
  { value: 'R0', label: 'Belum Revisi' },
  { value: 'R1', label: 'Revisi 1' },
  { value: 'R2', label: 'Revisi 2' },
  { value: 'R3', label: 'Revisi Selesai' },
];

function formatRupiah(value) {
  return Number(value || 0) > 0
    ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
    : '-';
}

function normalizeRevisionForm(form) {
  return {
    ...form,
    remainingAmount: Number(form.remainingAmount || 0),
  };
}

export default function App() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [revisions, setRevisions] = useState([]);
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingRevision, setEditingRevision] = useState(null);

  const filters = useMemo(() => ({ query: query.trim(), status }), [query, status]);

  const loadRevisions = useCallback(async (ignoreUpdate = () => false) => {
    setLoading(true);
    try {
      const payload = await fetchRevisions(filters);
      if (ignoreUpdate()) {
        return;
      }
      setRevisions(payload.data || []);
      setStats(payload.stats || DEFAULT_STATS);
      setError('');
    } catch (err) {
      if (!ignoreUpdate()) {
        setError(err.message || 'Gagal memuat data revisi.');
      }
    } finally {
      if (!ignoreUpdate()) {
        setLoading(false);
      }
    }
  }, [filters]);

  useEffect(() => {
    let ignore = false;
    loadRevisions(() => ignore);
    return () => {
      ignore = true;
    };
  }, [loadRevisions]);

  const openCreateForm = () => {
    setEditingRevision(null);
    setFormOpen(true);
  };

  const openEditForm = (revision) => {
    setEditingRevision(revision);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) {
      return;
    }
    setFormOpen(false);
    setEditingRevision(null);
  };

  const saveRevision = async (form) => {
    setSaving(true);
    setError('');
    setNotice('');

    try {
      const payload = normalizeRevisionForm(form);
      if (editingRevision) {
        await updateRevision(editingRevision.id, payload);
      } else {
        await createRevision(payload);
      }

      setFormOpen(false);
      setEditingRevision(null);
      setNotice(editingRevision ? 'Data revisi berhasil diperbarui.' : 'Data revisi baru berhasil dibuat.');
      await loadRevisions();
    } catch (err) {
      setError(err.message || 'Gagal menyimpan revisi.');
    } finally {
      setSaving(false);
    }
  };

  const deleteRevision = async (revision) => {
    if (!window.confirm(`Hapus revisi untuk ${revision.domain}?`)) {
      return;
    }

    setError('');
    setNotice('');
    try {
      await removeRevision(revision.id);
      setNotice('Data revisi berhasil dihapus.');
      await loadRevisions();
    } catch (err) {
      setError(err.message || 'Gagal menghapus revisi.');
    }
  };

  return (
    <main className="app-shell">
      <Sidebar />

      <section className="page-shell">
        <Header />

        <section className="workspace-head">
          <h2>Manajemen Revisi Website</h2>
          <SearchToolbar query={query} status={status} onQueryChange={setQuery} onStatusChange={setStatus} />
          <button className="primary-button add-button" type="button" onClick={openCreateForm}>Tambah Revisi Baru</button>
        </section>

        <section className="api-banner" aria-label="Konfigurasi aplikasi">
          <strong>Frontend murni React + Vite</strong>
          <span>Semua UI dirender oleh React dari <code>frontend-react/src</code>; Laravel tidak menyajikan Blade untuk tampilan.</span>
          <span>API aktif: <code>{API_BASE_URL}</code></span>
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
          {loading ? (
            <div className="empty-state">Memuat data revisi dari REST API...</div>
          ) : revisions.length === 0 ? (
            <div className="empty-state">Tidak ada data revisi untuk filter ini.</div>
          ) : (
            <RevisionTable revisions={revisions} onEdit={openEditForm} onDelete={deleteRevision} />
          )}
        </section>
      </section>

      {formOpen && (
        <RevisionForm revision={editingRevision} saving={saving} onCancel={closeForm} onSubmit={saveRevision} />
      )}
    </main>
  );
}

function Sidebar() {
  return (
    <aside className="rail" aria-label="Navigasi utama">
      <div className="brand-mark">SC</div>
      <button className="rail-button active" aria-label="Data revisi">↻</button>
    </aside>
  );
}

function Header() {
  return (
    <header className="topbar">
      <div>
        <h1>Daftar Revisi Website</h1>
        <p>Dashboard Vite yang mengambil data dari REST API Golang tanpa view Blade Laravel.</p>
      </div>
      <span className="local-state">React + Go aktif</span>
    </header>
  );
}

function SearchToolbar({ query, status, onQueryChange, onStatusChange }) {
  return (
    <form className="search-form" onSubmit={(event) => event.preventDefault()}>
      <input value={query} onChange={(event) => onQueryChange(event.target.value)} type="search" placeholder="Cari domain, nama klien, tim, atau catatan" />
      <select value={status} onChange={(event) => onStatusChange(event.target.value)}>
        {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <button className="primary-button search-button" type="submit" aria-label="Cari">⌕</button>
    </form>
  );
}

function Metric({ label, value }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value ?? 0}</strong>
    </article>
  );
}

function RevisionTable({ revisions, onEdit, onDelete }) {
  return (
    <div className="revision-table-wrap">
      <table className="revision-table">
        <thead>
          <tr>
            <th>Domain</th>
            <th>Nama Klien</th>
            <th>Marketing</th>
            <th>Web</th>
            <th>Status Revisi</th>
            <th>Status Pembayaran</th>
            <th>Sisa Bayar</th>
            <th>Aktif Sampai</th>
            <th>Catatan</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {revisions.map((revision) => (
            <tr key={revision.id}>
              <td><strong>{revision.domain}</strong><small>ID #{revision.id}</small></td>
              <td>{revision.clientName}</td>
              <td>{revision.marketingTeam || '-'}</td>
              <td>{revision.webTeam || '-'}</td>
              <td><span className="revision-code">{revision.revisionStatus}</span></td>
              <td><span className="payment-pill">{revision.paymentStatus}</span></td>
              <td>{formatRupiah(revision.remainingAmount)}</td>
              <td>{revision.activePeriod || '-'}</td>
              <td>{revision.notes || '-'}</td>
              <td>
                <div className="action-row">
                  <button className="ghost-button" type="button" onClick={() => onEdit(revision)}>Edit</button>
                  <button className="danger-button" type="button" onClick={() => onDelete(revision)}>Hapus</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RevisionForm({ revision, saving, onCancel, onSubmit }) {
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, ...(revision || {}) }));
  const title = revision ? `Edit ${revision.domain}` : 'Tambah Revisi Baru';

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
          <button className="close-button" type="button" onClick={onCancel} aria-label="Tutup">×</button>
        </div>

        <div className="form-grid">
          <TextField label="Domain" value={form.domain} onChange={(value) => updateField('domain', value)} required />
          <TextField label="Nama Klien" value={form.clientName} onChange={(value) => updateField('clientName', value)} required />
          <TextField label="Tim Marketing" value={form.marketingTeam} onChange={(value) => updateField('marketingTeam', value)} />
          <TextField label="Tim Website" value={form.webTeam} onChange={(value) => updateField('webTeam', value)} />
          <SelectField label="Status Revisi" value={form.revisionStatus} onChange={(value) => updateField('revisionStatus', value)} options={STATUS_OPTIONS.slice(4)} />
          <SelectField label="Status Pembayaran" value={form.paymentStatus} onChange={(value) => updateField('paymentStatus', value)} options={STATUS_OPTIONS.slice(1, 4)} />
          <TextField label="Sisa Bayar" type="number" min="0" value={form.remainingAmount} onChange={(value) => updateField('remainingAmount', value)} />
          <TextField label="Masa Aktif" value={form.activePeriod} onChange={(value) => updateField('activePeriod', value)} />
          <label className="full-field">
            Catatan
            <textarea value={form.notes} onChange={(event) => updateField('notes', event.target.value)} placeholder="Tulis detail revisi atau catatan pembayaran" />
          </label>
        </div>

        <div className="form-actions">
          <button className="ghost-button" type="button" onClick={onCancel} disabled={saving}>Batal</button>
          <button className="primary-button" type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
        </div>
      </form>
    </div>
  );
}

function TextField({ label, value, onChange, ...props }) {
  return (
    <label>
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} {...props} />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}
