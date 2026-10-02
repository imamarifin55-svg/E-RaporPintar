import React, { useState, useMemo } from 'react';
import { ERaporDatabase, addAuditLog, saveDatabase } from '../utils/storage';
import { MataPelajaran, TujuanPembelajaran, User } from '../types/erapor';
import { 
  BookOpen, 
  Plus, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  X, 
  Search,
  Sparkles,
  Layers,
  GraduationCap
} from 'lucide-react';

interface MataPelajaranConfigProps {
  db: ERaporDatabase;
  currentUser: User;
  onUpdateDatabase: (newDb: ERaporDatabase) => void;
}

export const MataPelajaranConfig: React.FC<MataPelajaranConfigProps> = ({
  db,
  currentUser,
  onUpdateDatabase,
}) => {
  const { mataPelajaran, tujuanPembelajaran, users, nilai } = db;

  const [selectedMapelId, setSelectedMapelId] = useState<string>(mataPelajaran[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const activeMapel = useMemo(
    () => mataPelajaran.find(m => m.id === selectedMapelId) || mataPelajaran[0],
    [mataPelajaran, selectedMapelId]
  );

  const activeTps = useMemo(
    () => tujuanPembelajaran.filter(tp => tp.mapelId === activeMapel?.id),
    [tujuanPembelajaran, activeMapel]
  );

  // Filtered mapel list
  const filteredMapelList = useMemo(() => {
    if (!searchQuery.trim()) return mataPelajaran;
    const q = searchQuery.toLowerCase();
    return mataPelajaran.filter(
      m => m.nama.toLowerCase().includes(q) || m.kode.toLowerCase().includes(q)
    );
  }, [mataPelajaran, searchQuery]);

  // Modal Tambah Mata Pelajaran
  const [isAddMapelModalOpen, setIsAddMapelModalOpen] = useState(false);
  const [newMapelNama, setNewMapelNama] = useState('');
  const [newMapelKode, setNewMapelKode] = useState('');
  const [newMapelKategori, setNewMapelKategori] = useState<'Umum' | 'Muatan Lokal' | 'Pilihan'>('Umum');
  const [newMapelKktp, setNewMapelKktp] = useState(75);
  const [newMapelGuruId, setNewMapelGuruId] = useState(users[0]?.id || '');

  // Modal Edit Mata Pelajaran
  const [isEditMapelModalOpen, setIsEditMapelModalOpen] = useState(false);
  const [editingMapel, setEditingMapel] = useState<MataPelajaran | null>(null);
  const [editMapelNama, setEditMapelNama] = useState('');
  const [editMapelKode, setEditMapelKode] = useState('');
  const [editMapelKategori, setEditMapelKategori] = useState<'Umum' | 'Muatan Lokal' | 'Pilihan'>('Umum');
  const [editMapelKktp, setEditMapelKktp] = useState(75);
  const [editMapelGuruId, setEditMapelGuruId] = useState('');

  // Modal TP (Tujuan Pembelajaran)
  const [isTpModalOpen, setIsTpModalOpen] = useState(false);
  const [editingTp, setEditingTp] = useState<TujuanPembelajaran | null>(null);
  const [tpKode, setTpKode] = useState('TP1');
  const [tpMateri, setTpMateri] = useState('');
  const [tpDeskripsi, setTpDeskripsi] = useState('');

  // Open Tambah Mapel Modal
  const openAddMapel = () => {
    setNewMapelNama('');
    setNewMapelKode('');
    setNewMapelKategori('Umum');
    setNewMapelKktp(75);
    setNewMapelGuruId(users.find(u => u.role === 'guru')?.id || users[0]?.id || '');
    setIsAddMapelModalOpen(true);
  };

  // Open Edit Mapel Modal
  const openEditMapel = (m: MataPelajaran) => {
    setEditingMapel(m);
    setEditMapelNama(m.nama);
    setEditMapelKode(m.kode);
    setEditMapelKategori(m.kategori);
    setEditMapelKktp(m.kktp);
    setEditMapelGuruId(m.guruId);
    setIsEditMapelModalOpen(true);
  };

  // Save Tambah Mata Pelajaran
  const handleSaveNewMapel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMapelNama.trim() || !newMapelKode.trim()) {
      alert('Nama dan Kode mata pelajaran wajib diisi');
      return;
    }

    const newId = `mp-${Date.now()}`;
    const newMapel: MataPelajaran = {
      id: newId,
      nama: newMapelNama.trim(),
      kode: newMapelKode.trim().toUpperCase(),
      kategori: newMapelKategori,
      kktp: newMapelKktp,
      guruId: newMapelGuruId,
    };

    // Otomatis buatkan 2 template TP dasar
    const defaultTps: TujuanPembelajaran[] = [
      {
        id: `tp-${newId}-1`,
        mapelId: newId,
        kode: 'TP1',
        materiPokok: 'Penguasaan Konsep Dasar',
        deskripsi: `Mampu memahami dan menjelaskan konsep dasar ${newMapelNama.trim()} secara mandiri`,
      },
      {
        id: `tp-${newId}-2`,
        mapelId: newId,
        kode: 'TP2',
        materiPokok: 'Penerapan dan Praktik',
        deskripsi: `Mampu mengaplikasikan pengetahuan dan keterampilan ${newMapelNama.trim()} dalam konteks nyata`,
      },
    ];

    let updatedDb: ERaporDatabase = {
      ...db,
      mataPelajaran: [...mataPelajaran, newMapel],
      tujuanPembelajaran: [...tujuanPembelajaran, ...defaultTps],
    };

    updatedDb = addAuditLog(
      updatedDb,
      'Tambah Mata Pelajaran',
      `Menambahkan mata pelajaran baru: ${newMapel.nama} (${newMapel.kode}) dengan KKTP ${newMapel.kktp}.`,
      currentUser
    );

    saveDatabase(updatedDb);
    onUpdateDatabase(updatedDb);

    setSelectedMapelId(newId);
    setIsAddMapelModalOpen(false);
    setToastMsg(`Mata pelajaran ${newMapel.nama} berhasil ditambahkan!`);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Save Edit Mata Pelajaran
  const handleSaveEditMapel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMapel) return;

    const updatedMapels = mataPelajaran.map(m => {
      if (m.id === editingMapel.id) {
        return {
          ...m,
          nama: editMapelNama.trim(),
          kode: editMapelKode.trim().toUpperCase(),
          kategori: editMapelKategori,
          kktp: editMapelKktp,
          guruId: editMapelGuruId,
        };
      }
      return m;
    });

    let updatedDb: ERaporDatabase = {
      ...db,
      mataPelajaran: updatedMapels,
    };

    updatedDb = addAuditLog(
      updatedDb,
      'Perbarui Mata Pelajaran',
      `Memperbarui data mata pelajaran: ${editMapelNama} (${editMapelKode}).`,
      currentUser
    );

    saveDatabase(updatedDb);
    onUpdateDatabase(updatedDb);
    setIsEditMapelModalOpen(false);
    setToastMsg(`Perubahan mata pelajaran ${editMapelNama} berhasil disimpan!`);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Delete Mata Pelajaran
  const handleDeleteMapel = (m: MataPelajaran) => {
    const hasNilai = nilai.some(n => n.mapelId === m.id);
    const confirmText = hasNilai
      ? `PERINGATAN: Terdapat data nilai siswa yang terhubung dengan mata pelajaran "${m.nama}". Hapus mata pelajaran ini beserta TP-nya?`
      : `Apakah Anda yakin ingin menghapus mata pelajaran "${m.nama}"?`;

    if (!confirm(confirmText)) return;

    const updatedMapels = mataPelajaran.filter(item => item.id !== m.id);
    const updatedTps = tujuanPembelajaran.filter(tp => tp.mapelId !== m.id);

    let updatedDb: ERaporDatabase = {
      ...db,
      mataPelajaran: updatedMapels,
      tujuanPembelajaran: updatedTps,
    };

    updatedDb = addAuditLog(
      updatedDb,
      'Hapus Mata Pelajaran',
      `Menghapus mata pelajaran ${m.nama} (${m.kode}).`,
      currentUser
    );

    saveDatabase(updatedDb);
    onUpdateDatabase(updatedDb);

    if (selectedMapelId === m.id && updatedMapels.length > 0) {
      setSelectedMapelId(updatedMapels[0].id);
    }

    setToastMsg(`Mata pelajaran ${m.nama} berhasil dihapus.`);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // TP Actions
  const openAddTp = () => {
    setEditingTp(null);
    setTpKode(`TP${activeTps.length + 1}`);
    setTpMateri('');
    setTpDeskripsi('');
    setIsTpModalOpen(true);
  };

  const openEditTp = (tp: TujuanPembelajaran) => {
    setEditingTp(tp);
    setTpKode(tp.kode);
    setTpMateri(tp.materiPokok);
    setTpDeskripsi(tp.deskripsi);
    setIsTpModalOpen(true);
  };

  const handleSaveTp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMapel) return;

    let updatedTps = [...tujuanPembelajaran];
    if (editingTp) {
      updatedTps = updatedTps.map(tp => {
        if (tp.id === editingTp.id) {
          return {
            ...tp,
            kode: tpKode,
            materiPokok: tpMateri,
            deskripsi: tpDeskripsi,
          };
        }
        return tp;
      });
    } else {
      const newTp: TujuanPembelajaran = {
        id: `tp-${Date.now()}`,
        mapelId: activeMapel.id,
        kode: tpKode,
        materiPokok: tpMateri,
        deskripsi: tpDeskripsi,
      };
      updatedTps.push(newTp);
    }

    let updatedDb: ERaporDatabase = {
      ...db,
      tujuanPembelajaran: updatedTps,
    };

    saveDatabase(updatedDb);
    onUpdateDatabase(updatedDb);
    setIsTpModalOpen(false);
  };

  const handleDeleteTp = (id: string) => {
    let updatedDb: ERaporDatabase = {
      ...db,
      tujuanPembelajaran: tujuanPembelajaran.filter(tp => tp.id !== id),
    };
    saveDatabase(updatedDb);
    onUpdateDatabase(updatedDb);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Manajemen Mata Pelajaran & Tujuan Pembelajaran (TP)
              </h2>
              <p className="text-xs text-slate-500">
                Tambah mata pelajaran umum, muatan lokal, kriteria ketuntasan (KKTP), dan capaian kompetensi
              </p>
            </div>
          </div>

          <button
            onClick={openAddMapel}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-blue-600/20 active:scale-95 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Mata Pelajaran Baru</span>
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Mapel List */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">
              Daftar Mata Pelajaran ({mataPelajaran.length})
            </h3>
            <button
              onClick={openAddMapel}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah</span>
            </button>
          </div>

          {/* Search Mapel */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari mata pelajaran..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400"
            />
          </div>

          <div className="space-y-1.5 max-h-[520px] overflow-y-auto">
            {filteredMapelList.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                Tidak ada mata pelajaran yang cocok.
              </div>
            ) : (
              filteredMapelList.map(m => {
                const isSelected = m.id === activeMapel?.id;
                const guru = users.find(u => u.id === m.guruId);

                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMapelId(m.id)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="space-y-0.5 truncate mr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate">{m.nama}</span>
                        {m.kategori !== 'Umum' && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-100 text-amber-800 font-semibold shrink-0">
                            {m.kategori}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        Kode: <strong className="font-mono text-slate-600">{m.kode}</strong> • KKTP: <strong>{m.kktp}</strong>
                        {guru && <span> • {guru.namaLengkap.split(',')[0]}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditMapel(m);
                        }}
                        className="p-1 hover:bg-white rounded text-slate-400 hover:text-blue-600"
                        title="Edit Mapel"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMapel(m);
                        }}
                        className="p-1 hover:bg-white rounded text-slate-400 hover:text-rose-600"
                        title="Hapus Mapel"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: TP List for Selected Mapel */}
        {activeMapel && (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-base">
                    {activeMapel.nama} ({activeMapel.kode})
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                    KKTP: {activeMapel.kktp}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                    {activeMapel.kategori}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tujuan Pembelajaran (TP) yang otomatis menjadi dasar narasi rapor
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditMapel(activeMapel)}
                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Mapel</span>
                </button>
                <button
                  onClick={openAddTp}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah TP</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {activeTps.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 border border-dashed rounded-xl">
                  Belum ada Tujuan Pembelajaran yang ditambahkan untuk mata pelajaran ini. Klik tombol <strong>Tambah TP</strong> di atas.
                </div>
              ) : (
                activeTps.map(tp => (
                  <div key={tp.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-extrabold text-xs">
                          {tp.kode}
                        </span>
                        <span className="font-bold text-slate-900 text-xs">{tp.materiPokok}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditTp(tp)}
                          className="p-1 hover:bg-white rounded text-blue-600"
                          title="Edit TP"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTp(tp.id)}
                          className="p-1 hover:bg-white rounded text-rose-600"
                          title="Hapus TP"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed italic">
                      "{tp.deskripsi}"
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>

      {/* Modal Tambah Mata Pelajaran Baru */}
      {isAddMapelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Tambah Mata Pelajaran Baru</h3>
              </div>
              <button
                onClick={() => setIsAddMapelModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewMapel} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Mata Pelajaran*
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bahasa Sunda / Prakarya / Muatan Lokal"
                  value={newMapelNama}
                  onChange={(e) => setNewMapelNama(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kode Singkatan* (Maks 6 Huruf)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="Contoh: BSUN"
                    value={newMapelKode}
                    onChange={(e) => setNewMapelKode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    KKTP Ketuntasan (0 - 100)*
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="95"
                    required
                    value={newMapelKktp}
                    onChange={(e) => setNewMapelKktp(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategori Mata Pelajaran
                  </label>
                  <select
                    value={newMapelKategori}
                    onChange={(e) => setNewMapelKategori(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="Umum">Umum (Wajib)</option>
                    <option value="Muatan Lokal">Muatan Lokal</option>
                    <option value="Pilihan">Pilihan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Guru Pengampu
                  </label>
                  <select
                    value={newMapelGuruId}
                    onChange={(e) => setNewMapelGuruId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.namaLengkap} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-[11px] text-blue-900 leading-relaxed">
                <Sparkles className="w-3.5 h-3.5 inline mr-1 text-blue-600" />
                Sistem akan secara otomatis menyertakan 2 Tujuan Pembelajaran (TP) standar untuk mata pelajaran baru ini, yang nantinya dapat disesuaikan kembali.
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddMapelModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20"
                >
                  Simpan Mata Pelajaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Mata Pelajaran */}
      {isEditMapelModalOpen && editingMapel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-slate-900 text-sm">Edit Mata Pelajaran & KKTP</h3>
              <button
                onClick={() => setIsEditMapelModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditMapel} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Mata Pelajaran
                </label>
                <input
                  type="text"
                  required
                  value={editMapelNama}
                  onChange={(e) => setEditMapelNama(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kode Singkatan
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={editMapelKode}
                    onChange={(e) => setEditMapelKode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    KKTP (Kriteria Ketuntasan)
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="95"
                    required
                    value={editMapelKktp}
                    onChange={(e) => setEditMapelKktp(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategori
                  </label>
                  <select
                    value={editMapelKategori}
                    onChange={(e) => setEditMapelKategori(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="Umum">Umum (Wajib)</option>
                    <option value="Muatan Lokal">Muatan Lokal</option>
                    <option value="Pilihan">Pilihan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Guru Pengampu
                  </label>
                  <select
                    value={editMapelGuruId}
                    onChange={(e) => setEditMapelGuruId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.namaLengkap} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditMapelModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal TP */}
      {isTpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingTp ? 'Edit Tujuan Pembelajaran' : 'Tambah Tujuan Pembelajaran (TP)'}
              </h3>
              <button
                onClick={() => setIsTpModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTp} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kode TP</label>
                  <input
                    type="text"
                    required
                    value={tpKode}
                    onChange={(e) => setTpKode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Materi Pokok*</label>
                  <input
                    type="text"
                    required
                    placeholder="Misal: Bilangan Rasional"
                    value={tpMateri}
                    onChange={(e) => setTpMateri(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Capaian TP*</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Deskripsi kemampuan yang diukur dan akan dicetak pada rapor..."
                  value={tpDeskripsi}
                  onChange={(e) => setTpDeskripsi(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs leading-relaxed"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTpModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-xs text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                >
                  Simpan TP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
