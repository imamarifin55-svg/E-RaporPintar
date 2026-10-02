import React, { useState, useMemo } from 'react';
import { ERaporDatabase, addAuditLog, saveDatabase } from '../utils/storage';
import { Kelas, User } from '../types/erapor';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Users,
  CheckCircle2,
  X,
  Search,
  School,
  GraduationCap,
  Calendar,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { NavTab } from './Sidebar';

interface ManajemenRombelProps {
  db: ERaporDatabase;
  currentUser: User;
  onUpdateDatabase: (newDb: ERaporDatabase) => void;
  onNavigateToSiswa?: (kelasId: string) => void;
}

export const ManajemenRombel: React.FC<ManajemenRombelProps> = ({
  db,
  currentUser,
  onUpdateDatabase,
  onNavigateToSiswa,
}) => {
  const { kelas, users, siswa, sekolah } = db;

  const [searchQuery, setSearchQuery] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modal Tambah Rombel
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newNama, setNewNama] = useState('');
  const [newTingkat, setNewTingkat] = useState<number>(7);
  const [newWaliKelasId, setNewWaliKelasId] = useState<string>(
    users.find(u => u.role === 'wali_kelas' || u.role === 'guru')?.id || users[0]?.id || ''
  );

  // Modal Edit Rombel
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingKelas, setEditingKelas] = useState<Kelas | null>(null);
  const [editNama, setEditNama] = useState('');
  const [editTingkat, setEditTingkat] = useState<number>(7);
  const [editWaliKelasId, setEditWaliKelasId] = useState<string>('');

  // Guru and Wali Kelas list for assignment
  const teachersList = useMemo(() => {
    return users.filter(u => u.role === 'guru' || u.role === 'wali_kelas');
  }, [users]);

  // Filtered kelas list
  const filteredKelas = useMemo(() => {
    if (!searchQuery.trim()) return kelas;
    const q = searchQuery.toLowerCase();
    return kelas.filter(k => {
      const wali = users.find(u => u.id === k.waliKelasId);
      return (
        k.nama.toLowerCase().includes(q) ||
        String(k.tingkat).includes(q) ||
        (wali && wali.namaLengkap.toLowerCase().includes(q))
      );
    });
  }, [kelas, searchQuery, users]);

  // Open Add Modal
  const openAddModal = () => {
    setNewNama('');
    setNewTingkat(7);
    setNewWaliKelasId(teachersList[0]?.id || users[0]?.id || '');
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (k: Kelas) => {
    setEditingKelas(k);
    setEditNama(k.nama);
    setEditTingkat(k.tingkat);
    setEditWaliKelasId(k.waliKelasId);
    setIsEditModalOpen(true);
  };

  // Save New Rombel
  const handleSaveNewRombel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNama.trim()) {
      alert('Nama rombongan belajar wajib diisi');
      return;
    }

    // Check duplicate
    if (kelas.some(k => k.nama.toLowerCase() === newNama.trim().toLowerCase())) {
      alert(`Rombongan belajar "${newNama.trim()}" sudah terdaftar`);
      return;
    }

    const newId = `kls-${Date.now()}`;
    const newKelas: Kelas = {
      id: newId,
      nama: newNama.trim().toUpperCase(),
      tingkat: newTingkat,
      waliKelasId: newWaliKelasId,
      tahunAjaran: sekolah.tahunAjaran,
    };

    // Update teacher role if assigned as wali kelas
    let updatedUsers = [...users];
    if (newWaliKelasId) {
      updatedUsers = updatedUsers.map(u => {
        if (u.id === newWaliKelasId) {
          return {
            ...u,
            role: 'wali_kelas' as const,
            kelasId: newId,
          };
        }
        return u;
      });
    }

    let updatedDb: ERaporDatabase = {
      ...db,
      kelas: [...kelas, newKelas],
      users: updatedUsers,
    };

    updatedDb = addAuditLog(
      updatedDb,
      'Tambah Rombel Baru',
      `Menambahkan rombongan belajar baru: Kelas ${newKelas.nama} (Tingkat ${newKelas.tingkat}) TA ${newKelas.tahunAjaran}.`,
      currentUser
    );

    saveDatabase(updatedDb);
    onUpdateDatabase(updatedDb);

    setIsAddModalOpen(false);
    setToastMsg(`Rombongan belajar ${newKelas.nama} berhasil ditambahkan!`);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Save Edit Rombel
  const handleSaveEditRombel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKelas || !editNama.trim()) return;

    const updatedKelasList = kelas.map(k => {
      if (k.id === editingKelas.id) {
        return {
          ...k,
          nama: editNama.trim().toUpperCase(),
          tingkat: editTingkat,
          waliKelasId: editWaliKelasId,
        };
      }
      return k;
    });

    // Update teacher role if newly appointed
    let updatedUsers = [...users];
    if (editWaliKelasId) {
      updatedUsers = updatedUsers.map(u => {
        if (u.id === editWaliKelasId) {
          return {
            ...u,
            role: 'wali_kelas' as const,
            kelasId: editingKelas.id,
          };
        }
        return u;
      });
    }

    let updatedDb: ERaporDatabase = {
      ...db,
      kelas: updatedKelasList,
      users: updatedUsers,
    };

    updatedDb = addAuditLog(
      updatedDb,
      'Perbarui Rombel',
      `Memperbarui data rombongan belajar: Kelas ${editNama} (Tingkat ${editTingkat}).`,
      currentUser
    );

    saveDatabase(updatedDb);
    onUpdateDatabase(updatedDb);

    setIsEditModalOpen(false);
    setToastMsg(`Perubahan rombel ${editNama} berhasil disimpan!`);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Delete Rombel
  const handleDeleteRombel = (k: Kelas) => {
    const studentCount = siswa.filter(s => s.kelasId === k.id).length;
    if (studentCount > 0) {
      alert(`Tidak dapat menghapus Rombel "${k.nama}" karena terdapat ${studentCount} siswa yang terdaftar di kelas ini. Pindahkan atau hapus data siswa terlebih dahulu.`);
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus rombongan belajar "${k.nama}"?`)) return;

    const updatedKelasList = kelas.filter(item => item.id !== k.id);

    // Unassign wali kelas
    const updatedUsers = users.map(u => {
      if (u.kelasId === k.id) {
        return {
          ...u,
          kelasId: undefined,
          role: u.role === 'wali_kelas' ? ('guru' as const) : u.role,
        };
      }
      return u;
    });

    let updatedDb: ERaporDatabase = {
      ...db,
      kelas: updatedKelasList,
      users: updatedUsers,
    };

    updatedDb = addAuditLog(
      updatedDb,
      'Hapus Rombel',
      `Menghapus rombongan belajar ${k.nama}.`,
      currentUser
    );

    saveDatabase(updatedDb);
    onUpdateDatabase(updatedDb);

    setToastMsg(`Rombongan belajar ${k.nama} berhasil dihapus.`);
    setTimeout(() => setToastMsg(null), 4000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Manajemen Rombongan Belajar (Rombel / Kelas)
              </h2>
              <p className="text-xs text-slate-500">
                Tambah rombel baru, atur tingkat kelas (Fase D / E / F), dan tunjuk guru wali kelas
              </p>
            </div>
          </div>

          <button
            onClick={openAddModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-blue-600/20 active:scale-95 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Rombel Baru</span>
          </button>
        </div>

        {/* Filter bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            Total Rombongan Belajar: <strong className="text-slate-900">{kelas.length} Rombel</strong> di Tahun Ajaran <strong>{sekolah.tahunAjaran}</strong>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kelas atau wali kelas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400"
            />
          </div>
        </div>
      </div>

      {toastMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Rombel Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredKelas.length === 0 ? (
          <div className="col-span-full bg-white p-8 text-center text-xs text-slate-400 rounded-2xl border border-slate-200">
            Tidak ada rombongan belajar yang ditemukan.
          </div>
        ) : (
          filteredKelas.map(k => {
            const studentCount = siswa.filter(s => s.kelasId === k.id).length;
            const wali = users.find(u => u.id === k.waliKelasId);

            return (
              <div
                key={k.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 transition-all p-5 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-blue-100 text-blue-800">
                      Tingkat {k.tingkat}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>TA {k.tahunAjaran}</span>
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    Kelas {k.nama}
                  </h3>

                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-600">
                      <GraduationCap className="w-4 h-4 text-indigo-600 shrink-0" />
                      <div className="truncate">
                        Wali: <strong className="text-slate-800">{wali?.namaLengkap || 'Belum Ditunjuk'}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-slate-600">
                      <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        Jumlah Siswa: <strong className="text-slate-900">{studentCount} Orang</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  {onNavigateToSiswa && (
                    <button
                      onClick={() => onNavigateToSiswa(k.id)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <span>Lihat Siswa</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <div className="flex items-center gap-1 ml-auto">
                    <button
                      onClick={() => openEditModal(k)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Rombel"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteRombel(k)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Hapus Rombel"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Tambah Rombel */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Tambah Rombel (Kelas) Baru</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewRombel} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Rombongan Belajar (Kelas)*
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: VII-C, VIII-B, IX-A"
                  value={newNama}
                  onChange={(e) => setNewNama(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tingkat Kelas*
                  </label>
                  <select
                    value={newTingkat}
                    onChange={(e) => setNewTingkat(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value={7}>Kelas 7 (Fase D)</option>
                    <option value={8}>Kelas 8 (Fase D)</option>
                    <option value={9}>Kelas 9 (Fase D)</option>
                    <option value={10}>Kelas 10 (Fase E)</option>
                    <option value={11}>Kelas 11 (Fase F)</option>
                    <option value={12}>Kelas 12 (Fase F)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tahun Ajaran
                  </label>
                  <input
                    type="text"
                    disabled
                    value={sekolah.tahunAjaran}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Wali Kelas yang Ditunjuk
                </label>
                <select
                  value={newWaliKelasId}
                  onChange={(e) => setNewWaliKelasId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="">-- Pilih Guru Wali Kelas --</option>
                  {teachersList.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.namaLengkap} {t.nip ? `(NIP: ${t.nip})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20"
                >
                  Simpan Rombel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Rombel */}
      {isEditModalOpen && editingKelas && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-slate-900 text-base">Edit Rombongan Belajar</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditRombel} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Rombongan Belajar (Kelas)*
                </label>
                <input
                  type="text"
                  required
                  value={editNama}
                  onChange={(e) => setEditNama(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tingkat Kelas*
                </label>
                <select
                  value={editTingkat}
                  onChange={(e) => setEditTingkat(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  <option value={7}>Kelas 7 (Fase D)</option>
                  <option value={8}>Kelas 8 (Fase D)</option>
                  <option value={9}>Kelas 9 (Fase D)</option>
                  <option value={10}>Kelas 10 (Fase E)</option>
                  <option value={11}>Kelas 11 (Fase F)</option>
                  <option value={12}>Kelas 12 (Fase F)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Wali Kelas yang Ditunjuk
                </label>
                <select
                  value={editWaliKelasId}
                  onChange={(e) => setEditWaliKelasId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="">-- Pilih Guru Wali Kelas --</option>
                  {teachersList.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.namaLengkap} {t.nip ? `(NIP: ${t.nip})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
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

    </div>
  );
};
