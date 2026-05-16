import { useCallback, useEffect, useMemo, useState } from 'react';
import { createRevision, fetchRevisions, removeRevision, updateRevision } from '../api';

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

export default function RevisionIndexPage() {
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
    if (saving) return;
    setFormOpen(false);
    setEditingRevision(null);
  };

  const saveRevision = async (form) => {
    setSaving(true);
    setError('');
    setNotice('');

    try {
      const payload = normalizeRevisionForm(form);
      if (editingRevision) await updateRevision(editingRevision.id, payload);
      else await createRevision(payload);

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
    if (!window.confirm(`Hapus revisi untuk ${revision.domain}?`)) return;
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
      <aside className="rail" aria-label="Navigasi utama">
        <div className="brand-mark">SC</div>
        <button className="rail-button active" aria-label="Data revisi">↻</button>
      </aside>

      <section className="page-shell">
        <header className="topbar">
          <div>
            <h1>Daftar Revisi Website</h1>
            <p>Data revisi website aktif.</p>
          </div>
        </header>

        <section className="workspace-head">
          <h2>Manajemen Revisi Website</h2>
          <form className="search-form" onSubmit={(event) => event.preventDefault()}>
            <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Cari domain, nama klien, tim, atau catatan" />
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
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
          {loading ? <div className="empty-state">Memuat data revisi...</div> : revisions.length === 0
            ? <div className="empty-state">Tidak ada data revisi untuk filter ini.</div>
            : <RevisionTable revisions={revisions} onEdit={openEditForm} onDelete={deleteRevision} />}
        </section>
      </section>

      {formOpen && <RevisionForm revision={editingRevision} saving={saving} onCancel={closeForm} onSubmit={saveRevision} />}
    </main>
  );
}

function Metric({ label, value }) { return <article className="metric-card"><span>{label}</span><strong>{value}</strong></article>; }

function RevisionTable({ revisions, onEdit, onDelete }) {
  return <div className="revision-table-wrap"><table className="revision-table"><thead><tr><th>Domain</th><th>Klien</th><th>Tim Marketing</th><th>Tim Web</th><th>Status Revisi</th><th>Status Bayar</th><th>Sisa Tagihan</th><th>Periode Aktif</th><th>Catatan</th><th>Aksi</th></tr></thead><tbody>{revisions.map((item) => <tr key={item.id}><td>{item.domain}</td><td>{item.clientName}</td><td>{item.marketingTeam}</td><td>{item.webTeam}</td><td><span className="revision-code">{item.revisionStatus}</span></td><td><span className="payment-pill">{item.paymentStatus}</span></td><td>{formatRupiah(item.remainingAmount)}</td><td>{item.activePeriod}</td><td>{item.notes || '-'}</td><td><div className="action-row"><button className="ghost-button" type="button" onClick={() => onEdit(item)}>Edit</button><button className="danger-button" type="button" onClick={() => onDelete(item)}>Hapus</button></div></td></tr>)}</tbody></table></div>;
}

function RevisionForm({ revision, saving, onCancel, onSubmit }) {
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, ...(revision || {}) }));
  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const submit = (event) => { event.preventDefault(); onSubmit(form); };
  return <div className="modal-backdrop" role="presentation"><form className="revision-form" onSubmit={submit}><div className="form-head"><h2>{revision ? 'Edit Revisi' : 'Tambah Revisi'}</h2><button className="close-button" type="button" onClick={onCancel} aria-label="Tutup">×</button></div><div className="form-grid"><label>Domain<input value={form.domain} onChange={(event) => setField('domain', event.target.value)} required /></label><label>Nama Klien<input value={form.clientName} onChange={(event) => setField('clientName', event.target.value)} required /></label><label>Tim Marketing<input value={form.marketingTeam} onChange={(event) => setField('marketingTeam', event.target.value)} /></label><label>Tim Website<input value={form.webTeam} onChange={(event) => setField('webTeam', event.target.value)} /></label><label>Status Revisi<select value={form.revisionStatus} onChange={(event) => setField('revisionStatus', event.target.value)}><option value="R0">R0</option><option value="R1">R1</option><option value="R2">R2</option><option value="R3">R3</option></select></label><label>Status Bayar<select value={form.paymentStatus} onChange={(event) => setField('paymentStatus', event.target.value)}><option value="Belum Lunas">Belum Lunas</option><option value="50% Lunas">50% Lunas</option><option value="Lunas">Lunas</option></select></label><label>Sisa Tagihan<input type="number" min="0" value={form.remainingAmount} onChange={(event) => setField('remainingAmount', event.target.value)} /></label><label>Periode Aktif<input value={form.activePeriod} onChange={(event) => setField('activePeriod', event.target.value)} /></label><label className="full-field">Catatan<textarea value={form.notes} onChange={(event) => setField('notes', event.target.value)} /></label></div><div className="form-actions"><button className="ghost-button" type="button" onClick={onCancel}>Batal</button><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button></div></form></div>;
}
