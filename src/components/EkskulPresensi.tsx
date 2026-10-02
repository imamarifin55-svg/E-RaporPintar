import React, { useState } from 'react';
import { ERaporDatabase, addAuditLog, saveDatabase } from '../utils/storage';
import { User, Siswa, PresensiSiswa, EkstrakurikulerNilai } from '../types/erapor';
import { HeartHandshake, Save, Plus, Trash2, CheckCircle2, UserCheck } from 'lucide-react';

interface EkskulPresensiProps {
  db: ERaporDatabase;
  currentUser: User;
  onUpdateDatabase: (newDb: ERaporDatabase) => void;
}

export const EkskulPresensi: React.FC<EkskulPresensiProps> = ({
  db,
  currentUser,
  onUpdateDatabase,
}) => {
  const { kelas, siswa, presensi, ekstrakurikuler, sekolah } = db;

  const [selectedKelasId, setSelectedKelasId] = useState<string>(
    currentUser.kelasId || (kelas[0]?.id || '')
  );

  const activeKelas = kelas.find(k => k.id === selectedKelasId) || kelas[0];
  const classStudents = siswa.filter(s => s.kelasId === selectedKelasId);

  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    classStudents[0]?.id || ''
  );

  const activeStudent = siswa.find(s => s.id === selectedStudentId) || classStudents[0];

  // Presensi draft
  const currentPresensi = presensi.find(
    p => p.siswaId === activeStudent?.id && p.semester === sekolah.semester
  ) || {
    id: `pr-${activeStudent?.id}-${sekolah.semester}`,
    siswaId: activeStudent?.id || '',
    semester: sekolah.semester,
    sakit: 0,
    izin: 0,
    alpa: 0,
    catatanWaliKelas: 'Tingkatkan terus semangat belajar dan pertahankan prestasi yang membanggakan.',
  };

  const [sakit, setSakit] = useState<number>(currentPresensi.sakit);
  const [izin, setIzin] = useState<number>(currentPresensi.izin);
  const [alpa, setAlpa] = useState<number>(currentPresensi.alpa);
  const [catatan, setCatatan] = useState<string>(currentPresensi.catatanWaliKelas || '');

  // Ekstrakurikuler list for active student
  const studentEkskul = ekstrakurikuler.filter(e => e.siswaId === activeStudent?.id);

  // New Ekskul form
  const [newEkskulNama, setNewEkskulNama] = useState('Pramuka (Wajib)');
  const [newEkskulPredikat, setNewEkskulPredikat] = useState<'Sangat Baik' | 'Baik' | 'Cukup'>('Sangat Baik');
  const [newEkskulKet, setNewEkskulKet] = useState('Aktif dan berdedikasi tinggi.');

  // Sync state when activeStudent changes
  React.useEffect(() => {
    if (!activeStudent) return;
    const p = presensi.find(
      item => item.siswaId === activeStudent.id && item.semester === sekolah.semester
    );
    setSakit(p ? p.sakit : 0);
    setIzin(p ? p.izin : 0);
    setAlpa(p ? p.alpa : 0);
    setCatatan(p?.catatanWaliKelas || 'Tingkatkan terus semangat belajar dan pertahankan prestasi.');
  }, [activeStudent, presensi, sekolah.semester]);

  const handleSavePresensi = () => {
    if (!activeStudent) return;

    let updatedPresensiList = [...presensi];
    const existingIndex = updatedPresensiList.findIndex(
      p => p.siswaId === activeStudent.id && p.semester === sekolah.semester
    );

    const record: PresensiSiswa = {
      id: currentPresensi.id,
      siswaId: activeStudent.id,
      semester: sekolah.semester,
      sakit,
      izin,
      alpa,
      catatanWaliKelas: catatan,
    };

    if (existingIndex >= 0) {
      updatedPresensiList[existingIndex] = record;
    } else {
      updatedPresensiList.push(record);
    }

    let updatedDb: ERaporDatabase = {
      ...db,
      presensi: updatedPresensiList,
    };

    updatedDb = addAuditLog(
      updatedDb,
      'Update Presensi & Catatan',
      `Memperbarui presensi dan catatan wali kelas untuk ${activeStudent.namaLengkap}.`,
      currentUser
    );

    saveDatabase(updatedDb);
    onUpdateDatabase(updatedDb);
    alert(`Data presensi & catatan ${activeStudent.namaLengkap} berhasil disimpan!`);
  };

  const handleAddEkskul = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent || !newEkskulNama.trim()) return;

    const newEntry: EkstrakurikulerNilai = {
      id: `ek-${Date.now()}`,
      siswaId: activeStudent.id,
      namaKegiatan: newEkskulNama,
      predikat: newEkskulPredikat,
      keterangan: newEkskulKet,
    };

    let updatedDb: ERaporDatabase = {
      ...db,
      ekstrakurikuler: [...ekstrakurikuler, newEntry],
    };

    saveDatabase(updatedDb);
    onUpdateDatabase(updatedDb);
    setNewEkskulKet('');
  };

  const handleDeleteEkskul = (id: string) => {
    let updatedDb: ERaporDatabase = {
      ...db,
      ekstrakurikuler: ekstrakurikuler.filter(e => e.id !== id),
    };
    saveDatabase(updatedDb);
    onUpdateDatabase(updatedDb);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Penilaian Ekstrakurikuler & Rekapitulasi Presensi
            </h2>
            <p className="text-xs text-slate-500">
              Input ketidakhadiran (Sakit, Izin, Alpa), catatan motivasi wali kelas, dan kegiatan ekskul siswa
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Rombongan Belajar (Kelas)
            </label>
            <select
              value={selectedKelasId}
              onChange={(e) => {
                setSelectedKelasId(e.target.value);
                const first = siswa.find(s => s.kelasId === e.target.value);
                if (first) setSelectedStudentId(first.id);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
            >
              {kelas.map(k => (
                <option key={k.id} value={k.id}>Kelas {k.nama}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Pilih Peserta Didik
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
            >
              {classStudents.map((st, i) => (
                <option key={st.id} value={st.id}>
                  {i + 1}. {st.namaLengkap} ({st.nisn})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {activeStudent && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Card 1: Presensi & Catatan Wali Kelas */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-600" />
              <span>Presensi & Catatan Wali Kelas — {activeStudent.namaLengkap}</span>
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sakit (Hari)</label>
                <input
                  type="number"
                  min="0"
                  value={sakit}
                  onChange={(e) => setSakit(Number(e.target.value))}
                  className="w-full text-center px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Izin (Hari)</label>
                <input
                  type="number"
                  min="0"
                  value={izin}
                  onChange={(e) => setIzin(Number(e.target.value))}
                  className="w-full text-center px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tanpa Ket. / Alpa</label>
                <input
                  type="number"
                  min="0"
                  value={alpa}
                  onChange={(e) => setAlpa(Number(e.target.value))}
                  className="w-full text-center px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-rose-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Catatan Wali Kelas (Akan dicetak di rapor)
              </label>
              <textarea
                rows={4}
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Tuliskan catatan pembinaan, apresiasi, dan motivasi belajar peserta didik..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs leading-relaxed focus:bg-white"
              />
            </div>

            <button
              onClick={handleSavePresensi}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md shadow-blue-600/20"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Presensi & Catatan</span>
            </button>
          </div>

          {/* Card 2: Ekstrakurikuler */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">
              Kegiatan Ekstrakurikuler Siswa
            </h3>

            {/* List Existing Ekskul */}
            <div className="space-y-2">
              {studentEkskul.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 border border-dashed rounded-xl">
                  Belum ada ekstrakurikuler yang dicatat untuk siswa ini.
                </div>
              ) : (
                studentEkskul.map((e) => (
                  <div key={e.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{e.namaKegiatan}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                          {e.predikat}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{e.keterangan}</div>
                    </div>
                    <button
                      onClick={() => handleDeleteEkskul(e.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add Ekskul Form */}
            <form onSubmit={handleAddEkskul} className="pt-3 border-t border-slate-100 space-y-3">
              <div className="text-xs font-bold text-slate-700">Tambah Kegiatan Ekskul:</div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Nama Ekskul (misal: Futsal, PMR)..."
                  value={newEkskulNama}
                  onChange={(e) => setNewEkskulNama(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  required
                />
                <select
                  value={newEkskulPredikat}
                  onChange={(e) => setNewEkskulPredikat(e.target.value as any)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="Sangat Baik">Sangat Baik</option>
                  <option value="Baik">Baik</option>
                  <option value="Cukup">Cukup</option>
                </select>
              </div>
              <input
                type="text"
                placeholder="Keterangan capaian siswa..."
                value={newEkskulKet}
                onChange={(e) => setNewEkskulKet(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                required
              />
              <button
                type="submit"
                className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Ekstrakurikuler</span>
              </button>
            </form>
          </div>

        </div>
      )}
    </div>
  );
};
