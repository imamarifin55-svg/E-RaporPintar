import React, { useState, useMemo } from 'react';
import { ERaporDatabase, addAuditLog, saveDatabase } from '../utils/storage';
import { User, UserRole } from '../types/erapor';
import { 
  Shield, 
  UserPlus, 
  Edit2, 
  Trash2, 
  Key, 
  CheckCircle2, 
  X,
  Search,
  GraduationCap,
  Sparkles,
  Users
} from 'lucide-react';

interface KelolaPenggunaProps {
  db: ERaporDatabase;
  currentUser: User;
  onUpdateDatabase: (newDb: ERaporDatabase) => void;
}

export const KelolaPengguna: React.FC<KelolaPenggunaProps> = ({
  db,
  currentUser,
  onUpdateDatabase,
}) => {
  const { users, mataPelajaran, kelas } = db;

  const [filterRole, setFilterRole] = useState<'all' | 'guru' | 'wali_kelas' | 'admin'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'guru' | 'admin'>('guru');
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form State
  const [username, setUsername] = useState('');
  const [namaLengkap, setNamaLengkap] = useState('');
  const [nip, setNip] = useState('');
  const [role, setRole] = useState<UserRole>('guru');
  const [email, setEmail] = useState('');
  const [selectedMapelIds, setSelectedMapelIds] = useState<string[]>([]);
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');

  // Stats
  const countGuru = users.filter(u => u.role === 'guru').length;
  const countWali = users.filter(u => u.role === 'wali_kelas').length;
  const countAdmin = users.filter(u => u.role === 'admin').length;

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchRole = filterRole === 'all' || u.role === filterRole;
      const matchSearch = !searchQuery.trim() || 
        u.namaLengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.nip && u.nip.includes(searchQuery));
      return matchRole && matchSearch;
    });
  }, [users, filterRole, searchQuery]);

  // Open Add Guru Modal specifically
  const openAddGuru = () => {
    setEditingUser(null);
    setModalMode('guru');
    setUsername(`guru_${Date.now().toString().slice(-4)}`);
    setNamaLengkap('');
    setNip('');
    setRole('guru');
    setEmail('');
    setSelectedMapelIds([]);
    setSelectedKelasId('');
    setIsModalOpen(true);
  };

  // Open Add Admin Modal
  const openAddAdmin = () => {
    setEditingUser(null);
    setModalMode('admin');
    setUsername(`admin_${Date.now().toString().slice(-4)}`);
    setNamaLengkap('');
    setNip('');
    setRole('admin');
    setEmail('');
    setSelectedMapelIds([]);
    setSelectedKelasId('');
    setIsModalOpen(true);
  };

  const openEdit = (u: User) => {
    setEditingUser(u);
    setModalMode(u.role === 'admin' ? 'admin' : 'guru');
    setUsername(u.username);
    setNamaLengkap(u.namaLengkap);
    setNip(u.nip || '');
    setRole(u.role);
    setEmail(u.email || '');
    setSelectedMapelIds(u.mapelIds || []);
    setSelectedKelasId(u.kelasId || '');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !namaLengkap.trim()) {
      alert('Nama dan Username wajib diisi');
      return;
    }

    let updatedUsers = [...users];
    if (editingUser) {
      updatedUsers = updatedUsers.map(u => {
        if (u.id === editingUser.id) {
          return {
            ...u,
            username: username.trim(),
            namaLengkap: namaLengkap.trim(),
            nip: nip.trim() || undefined,
            role,
            email: email.trim(),
            mapelIds: selectedMapelIds,
            kelasId: role === 'wali_kelas' ? selectedKelasId : undefined,
          };
        }
        return u;
      });
    } else {
      const newUser: User = {
        id: `usr-${Date.now()}`,
        username: username.trim(),
        namaLengkap: namaLengkap.trim(),
        nip: nip.trim() || undefined,
        role,
        email: email.trim(),
        mapelIds: selectedMapelIds,
        kelasId: role === 'wali_kelas' ? selectedKelasId : undefined,
      };
      updatedUsers.push(newUser);
    }

    let updatedDb: ERaporDatabase = {
      ...db,
      users: updatedUsers,
    };

    updatedDb = addAuditLog(
      updatedDb,
      editingUser ? 'Perbarui Akun Pengguna' : role === 'admin' ? 'Tambah Admin Baru' : 'Tambah Guru Baru',
      `Menyimpan data ${namaLengkap} (Peran: ${role}).`,
      currentUser
    );

    saveDatabase(updatedDb);
    onUpdateDatabase(updatedDb);
    setIsModalOpen(false);
    setToastMsg(`Akun ${namaLengkap} berhasil disimpan!`);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleDelete = (id: string, nama: string) => {
    if (id === currentUser.id) {
      alert('Anda tidak dapat menghapus akun yang sedang aktif digunakan.');
      return;
    }
    if (!confirm(`Hapus pengguna ${nama}?`)) return;

    let updatedDb: ERaporDatabase = {
      ...db,
      users: users.filter(u => u.id !== id),
    };

    updatedDb = addAuditLog(
      updatedDb,
      'Hapus Akun Pengguna',
      `Menghapus akun ${nama}.`,
      currentUser
    );

    saveDatabase(updatedDb);
    onUpdateDatabase(updatedDb);
    setToastMsg(`Akun ${nama} berhasil dihapus.`);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const toggleMapel = (id: string) => {
    if (selectedMapelIds.includes(id)) {
      setSelectedMapelIds(selectedMapelIds.filter(m => m !== id));
    } else {
      setSelectedMapelIds([...selectedMapelIds, id]);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Manajemen Data Guru & Akses Pengguna
              </h2>
              <p className="text-xs text-slate-500">
                Kelola data tenaga pendidik (guru mapel & wali kelas), penugasan mengajar, dan hak akses administrator
              </p>
            </div>
          </div>

          {/* Action Buttons: Tambah Guru & Tambah Admin */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={openAddGuru}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-blue-600/20 active:scale-95 transition-all"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Tambah Guru Baru</span>
            </button>

            <button
              onClick={openAddAdmin}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-purple-600" />
              <span>Tambah Admin</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs & Search */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setFilterRole('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterRole === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({users.length})
            </button>
            <button
              onClick={() => setFilterRole('guru')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterRole === 'guru'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Guru Mapel ({countGuru})
            </button>
            <button
              onClick={() => setFilterRole('wali_kelas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterRole === 'wali_kelas'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Wali Kelas ({countWali})
            </button>
            <button
              onClick={() => setFilterRole('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterRole === 'admin'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Admin ({countAdmin})
            </button>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari guru berdasarkan nama atau NIP..."
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

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/70 text-slate-700 text-[11px] font-bold uppercase border-b border-slate-200">
                <th className="py-3 px-4">Nama Lengkap & NIP</th>
                <th className="py-3 px-4">Username & Email</th>
                <th className="py-3 px-3">Peran / Role</th>
                <th className="py-3 px-4">Mata Pelajaran & Kelas Binaan</th>
                <th className="py-3 px-3 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Tidak ada guru / pengguna yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => {
                  const assignedMapel = mataPelajaran.filter(m => u.mapelIds?.includes(m.id));
                  const assignedKelas = kelas.find(k => k.id === u.kelasId);

                  return (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{u.namaLengkap}</div>
                        {u.nip ? (
                          <div className="text-[10px] text-slate-500 font-mono">NIP: {u.nip}</div>
                        ) : (
                          <div className="text-[10px] text-slate-400 italic">Non-NIP / Guru Honorer</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono text-slate-800">{u.username}</div>
                        <div className="text-[10px] text-slate-500">{u.email || '-'}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                          u.role === 'wali_kelas' ? 'bg-indigo-100 text-indigo-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {u.role === 'admin' ? 'Administrator' : u.role === 'wali_kelas' ? 'Wali Kelas' : 'Guru Mapel'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {u.role === 'admin' && <span className="text-slate-500">Akses penuh seluruh sistem</span>}
                        {u.role === 'wali_kelas' && (
                          <div className="space-y-1">
                            <div className="font-semibold text-indigo-700">Wali Kelas: {assignedKelas?.nama || '-'}</div>
                            {assignedMapel.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {assignedMapel.map(m => (
                                  <span key={m.id} className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px]">
                                    {m.nama}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        {u.role === 'guru' && (
                          <div>
                            {assignedMapel.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {assignedMapel.map(m => (
                                  <span key={m.id} className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium text-[10px] border border-blue-100">
                                    {m.nama}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Belum ada mapel diampu</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEdit(u)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Data Guru"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(u.id, u.namaLengkap)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Hapus Akun"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal User / Tambah Guru */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  {editingUser
                    ? 'Perbarui Data Guru / Pengguna'
                    : modalMode === 'admin'
                    ? 'Tambah Administrator Baru'
                    : 'Tambah Guru / Pendidik Baru'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap & Gelar Akademik*
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Dra. Hj. Ratna Sari, M.Pd."
                  value={namaLengkap}
                  onChange={(e) => setNamaLengkap(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Username Login*
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    NIP (18 Digit / Kosongkan jika Non-NIP)
                  </label>
                  <input
                    type="text"
                    placeholder="19850101 201001 1 001"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Peran Penugasan (Role)
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="guru">Guru Mata Pelajaran</option>
                    <option value="wali_kelas">Wali Kelas</option>
                    <option value="admin">Administrator Sekolah</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Resmi / Belajar.id
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@guru.smp.belajar.id"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              {role === 'wali_kelas' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pilih Kelas Binaan (Wali Kelas)
                  </label>
                  <select
                    value={selectedKelasId}
                    onChange={(e) => setSelectedKelasId(e.target.value)}
                    className="w-full px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-semibold text-indigo-900"
                    required
                  >
                    <option value="">-- Pilih Rombongan Belajar --</option>
                    {kelas.map(k => (
                      <option key={k.id} value={k.id}>Kelas {k.nama}</option>
                    ))}
                  </select>
                </div>
              )}

              {role !== 'admin' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Mata Pelajaran yang Diampu (Pilih Satu atau Lebih):
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    {mataPelajaran.map(m => {
                      const isChecked = selectedMapelIds.includes(m.id);
                      return (
                        <label key={m.id} className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer p-1 rounded hover:bg-white">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleMapel(m.id)}
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span className="truncate">{m.nama}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20"
                >
                  Simpan Guru / Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
