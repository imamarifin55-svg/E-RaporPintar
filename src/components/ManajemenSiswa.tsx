import React, { useState, useMemo } from 'react';
import { ERaporDatabase, addAuditLog, saveDatabase } from '../utils/storage';
import { Siswa, User } from '../types/erapor';
import { unduhTemplateSiswaExcel, parseExcelSiswa } from '../utils/excel';
import {
  Users,
  UserPlus,
  FileSpreadsheet,
  Download,
  Upload,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  X,
  Filter,
  Layers
} from 'lucide-react';

interface ManajemenSiswaProps {
  db: ERaporDatabase;
  currentUser: User;
  initialKelasId?: string;
  onUpdateDatabase: (newDb: ERaporDatabase) => void;
  onNavigateToRombel?: () => void;
}

export const ManajemenSiswa: React.FC<ManajemenSiswaProps> = ({
  db,
  currentUser,
  initialKelasId,
  onUpdateDatabase,
  onNavigateToRombel,
}) => {
  const { kelas, siswa } = db;

  const [selectedKelasId, setSelectedKelasId] = useState<string>(
    initialKelasId || currentUser.kelasId || (kelas[0]?.id || '')
  );

  React.useEffect(() => {
    if (initialKelasId) {
      setSelectedKelasId(initialKelasId);
    }
  }, [initialKelasId]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSiswa, setEditingSiswa] = useState<Siswa | null>(null);

  // Form State
  const [formNisn, setFormNisn] = useState('');
  const [formNis, setFormNis] = useState('');
  const [formNama, setFormNama] = useState('');
  const [formJk, setFormJk] = useState<'L' | 'P'>('L');
  const [formTempatLahir, setFormTempatLahir] = useState('');
  const [formTanggalLahir, setFormTanggalLahir] = useState('');
  const [formAgama, setFormAgama] = useState('Islam');
  const [formAyah, setFormAyah] = useState('');
  const [formIbu, setFormIbu] = useState('');
  const [formAlamat, setFormAlamat] = useState('');

  const activeKelas = kelas.find(k => k.id === selectedKelasId) || kelas[0];

  const classStudents = useMemo(() => {
    return siswa.filter(s => s.kelasId === selectedKelasId);
  }, [siswa, selectedKelasId]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return classStudents;
    const q = searchQuery.toLowerCase();
    return classStudents.filter(
      s => s.namaLengkap.toLowerCase().includes(q) || s.nisn.includes(q) || s.nis.includes(q)
    );
  }, [classStudents, searchQuery]);

  const openAddModal = () => {
    setEditingSiswa(null);
    setFormNisn(`008${Date.now().toString().slice(-7)}`);
    setFormNis(`24${(classStudents.length + 1).toString().padStart(3, '0')}`);
    setFormNama('');
    setFormJk('L');
    setFormTempatLahir('Jakarta');
    setFormTanggalLahir('2011-05-15');
    setFormAgama('Islam');
    setFormAyah('');
    setFormIbu('');
    setFormAlamat('Jl. Raya Pendidikan No. 10');
    setIsModalOpen(true);
  };

  const openEditModal = (st: Siswa) => {
    setEditingSiswa(st);
    setFormNisn(st.nisn);
    setFormNis(st.nis);
    setFormNama(st.namaLengkap);
    setFormJk(st.jenisKelamin);
    setFormTempatLahir(st.tempatLahir);
    setFormTanggalLahir(st.tanggalLahir);
    setFormAgama(st.agama);
    setFormAyah(st.namaAyah);
    setFormIbu(st.namaIbu);
    setFormAlamat(st.alamat);
    setIsModalOpen(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim() || !formNisn.trim()) {
      alert('Nama dan NISN wajib diisi');
      return;
    }

    let updatedSiswaList = [...siswa];
    if (editingSiswa) {
      // Edit
      updatedSiswaList = updatedSiswaList.map(s => {
        if (s.id === editingSiswa.id) {
          return {
            ...s,
            nisn: formNisn,
            nis: formNis,
            namaLengkap: formNama,
            jenisKelamin: formJk,
            tempatLahir: formTempatLahir,
            tanggalLahir: formTanggalLahir,
            agama: formAgama,
            namaAyah: formAyah,
            namaIbu: formIbu,
            alamat: formAlamat,
          };
        }
        return s;
      });
    } else {
      // New
      const newSt: Siswa = {
        id: `sw-${Date.now()}`,
        nisn: formNisn,
        nis: formNis,
        namaLengkap: formNama,
        jenisKelamin: formJk,
        kelasId: selectedKelasId,
        tempatLahir: formTempatLahir,
        tanggalLahir: formTanggalLahir,
        agama: formAgama,
        namaAyah: formAyah,
        namaIbu: formIbu,
        pekerjaanOrangTua: 'Wiraswasta',
        alamat: formAlamat,
      };
      updatedSiswaList.push(newSt);
    }

    let updatedDb: ERaporDatabase = {
      ...db,
      siswa: updatedSiswaList,
    };

    updatedDb = addAuditLog(
      updatedDb,
      editingSiswa ? 'Edit Biodata Siswa' : 'Tambah Siswa Baru',
      `${editingSiswa ? 'Memperbarui' : 'Menambahkan'} peserta didik ${formNama} (NISN: ${formNisn}).`,
      currentUser
    );

    saveDatabase(updatedDb);
    onUpdateDatabase(updatedDb);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, nama: string) => {
    if (!confirm(`Hapus data peserta didik ${nama}? Nilai yang terkait juga akan dibersihkan.`)) return;

    let updatedDb: ERaporDatabase = {
      ...db,
      siswa: siswa.filter(s => s.id !== id),
      nilai: db.nilai.filter(n => n.siswaId !== id),
      presensi: db.presensi.filter(p => p.siswaId !== id),
      ekstrakurikuler: db.ekstrakurikuler.filter(e => e.siswaId !== id),
    };

    updatedDb = addAuditLog(
      updatedDb,
      'Hapus Siswa',
      `Menghapus peserta didik ${nama} dari sistem.`,
      currentUser
    );

    saveDatabase(updatedDb);
    onUpdateDatabase(updatedDb);
  };

  // Bulk Import Students from Excel
  const handleImportExcelStudents = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    try {
      const buffer = await e.target.files[0].arrayBuffer();
      const parsed = await parseExcelSiswa(buffer, selectedKelasId);
      if (parsed.length === 0) {
        alert('Tidak ada data siswa yang valid di file Excel');
        return;
      }

      let updatedDb: ERaporDatabase = {
        ...db,
        siswa: [...siswa, ...parsed],
      };

      updatedDb = addAuditLog(
        updatedDb,
        'Impor Siswa Massal',
        `Menambahkan ${parsed.length} siswa baru ke kelas ${activeKelas?.nama} melalui berkas Excel.`,
        currentUser
      );

      saveDatabase(updatedDb);
      onUpdateDatabase(updatedDb);
      alert(`Berhasil mengimpor ${parsed.length} siswa ke kelas ${activeKelas?.nama}!`);
    } catch (err) {
      console.error(err);
      alert('Gagal mengimpor file Excel siswa. Pastikan format kolom sesuai template.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Manajemen Data Siswa & Rombongan Belajar
              </h2>
              <p className="text-xs text-slate-500">
                Kelola profil biodata peserta didik, rombongan belajar, dan impor siswa massal via Excel
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={unduhTemplateSiswaExcel}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Format Excel Siswa</span>
            </button>

            <label className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              <span>Impor Excel Siswa</span>
              <input
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                onChange={handleImportExcelStudents}
              />
            </label>

            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all active:scale-95"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Tambah Siswa</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-600 uppercase">
                Filter Kelas
              </label>
              {onNavigateToRombel && (
                <button
                  onClick={onNavigateToRombel}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <Layers className="w-3 h-3" />
                  <span>+ Tambah Rombel</span>
                </button>
              )}
            </div>
            <select
              value={selectedKelasId}
              onChange={(e) => setSelectedKelasId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
            >
              {kelas.map(k => (
                <option key={k.id} value={k.id}>Kelas {k.nama}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Cari Siswa
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Ketik Nama, NISN, atau NIS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Student List Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="text-xs font-bold text-slate-700">
            Daftar Peserta Didik Kelas {activeKelas?.nama} ({filteredStudents.length} Siswa)
          </div>
          <div className="text-xs text-slate-500">
            Laki-laki: <strong className="text-blue-600">{classStudents.filter(s => s.jenisKelamin === 'L').length}</strong> | 
            Perempuan: <strong className="text-pink-600">{classStudents.filter(s => s.jenisKelamin === 'P').length}</strong>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/70 text-slate-700 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-2.5 px-3 w-10 text-center">No</th>
                <th className="py-2.5 px-3 w-28">NISN / NIS</th>
                <th className="py-2.5 px-3">Nama Lengkap</th>
                <th className="py-2.5 px-2 text-center w-12">JK</th>
                <th className="py-2.5 px-3">TTL</th>
                <th className="py-2.5 px-3">Agama</th>
                <th className="py-2.5 px-3">Orang Tua (Ayah / Ibu)</th>
                <th className="py-2.5 px-3">Alamat</th>
                <th className="py-2.5 px-3 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Tidak ada siswa ditemukan.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st, idx) => (
                  <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px]">
                      <div className="font-bold text-slate-800">{st.nisn}</div>
                      <div className="text-[10px] text-slate-400">NIS: {st.nis}</div>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{st.namaLengkap}</td>
                    <td className="py-2.5 px-2 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        st.jenisKelamin === 'L' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                      }`}>
                        {st.jenisKelamin}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {st.tempatLahir}, {st.tanggalLahir}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{st.agama}</td>
                    <td className="py-2.5 px-3 text-slate-600">
                      <div>{st.namaAyah}</div>
                      <div className="text-[10px] text-slate-400">{st.namaIbu}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 truncate max-w-xs">{st.alamat}</td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditModal(st)}
                          className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                          title="Edit Biodata"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(st.id, st.namaLengkap)}
                          className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"
                          title="Hapus Siswa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-slate-900 text-base">
                {editingSiswa ? 'Perbarui Biodata Siswa' : 'Tambah Peserta Didik Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">NISN (10 Digit)*</label>
                  <input
                    type="text"
                    required
                    value={formNisn}
                    onChange={(e) => setFormNisn(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">NIS Sekolah*</label>
                  <input
                    type="text"
                    required
                    value={formNis}
                    onChange={(e) => setFormNis(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap*</label>
                <input
                  type="text"
                  required
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Kelamin</label>
                  <select
                    value={formJk}
                    onChange={(e) => setFormJk(e.target.value as 'L' | 'P')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Agama</label>
                  <select
                    value={formAgama}
                    onChange={(e) => setFormAgama(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="Islam">Islam</option>
                    <option value="Kristen">Kristen Protestan</option>
                    <option value="Katolik">Katolik</option>
                    <option value="Hindu">Hindu</option>
                    <option value="Buddha">Buddha</option>
                    <option value="Khonghucu">Khonghucu</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tempat Lahir</label>
                  <input
                    type="text"
                    value={formTempatLahir}
                    onChange={(e) => setFormTempatLahir(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={formTanggalLahir}
                    onChange={(e) => setFormTanggalLahir(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Ayah</label>
                  <input
                    type="text"
                    value={formAyah}
                    onChange={(e) => setFormAyah(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Ibu</label>
                  <input
                    type="text"
                    value={formIbu}
                    onChange={(e) => setFormIbu(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat Domisili</label>
                <textarea
                  rows={2}
                  value={formAlamat}
                  onChange={(e) => setFormAlamat(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

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
                  Simpan Peserta Didik
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
