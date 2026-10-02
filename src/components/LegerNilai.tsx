import React, { useState, useMemo } from 'react';
import { ERaporDatabase } from '../utils/storage';
import { User } from '../types/erapor';
import { eksporLegerExcel } from '../utils/excel';
import {
  TableProperties,
  Download,
  Printer,
  Search,
  Award,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';

interface LegerNilaiProps {
  db: ERaporDatabase;
  currentUser: User;
}

export const LegerNilai: React.FC<LegerNilaiProps> = ({
  db,
  currentUser,
}) => {
  const { kelas, mataPelajaran, siswa, nilai, presensi, sekolah } = db;

  const [selectedKelasId, setSelectedKelasId] = useState<string>(
    currentUser.kelasId || (kelas[0]?.id || '')
  );
  const [searchQuery, setSearchQuery] = useState('');

  const activeKelas = useMemo(
    () => kelas.find(k => k.id === selectedKelasId) || kelas[0],
    [kelas, selectedKelasId]
  );

  const classStudents = useMemo(
    () => siswa.filter(s => s.kelasId === selectedKelasId),
    [siswa, selectedKelasId]
  );

  // Map nilai
  const nilaiMap = useMemo(() => {
    const map = new Map<string, number>();
    nilai.filter(n => n.semester === sekolah.semester).forEach(n => {
      map.set(`${n.siswaId}_${n.mapelId}`, n.nilaiAkhir);
    });
    return map;
  }, [nilai, sekolah.semester]);

  // Presensi map
  const presensiMap = useMemo(() => {
    const map = new Map<string, { s: number; i: number; a: number }>();
    presensi.filter(p => p.semester === sekolah.semester).forEach(p => {
      map.set(p.siswaId, { s: p.sakit, i: p.izin, a: p.alpa });
    });
    return map;
  }, [presensi, sekolah.semester]);

  // Calculate stats for all students in the class to compute ranking
  const studentMetrics = useMemo(() => {
    const list = classStudents.map(st => {
      let total = 0;
      let count = 0;
      mataPelajaran.forEach(m => {
        const val = nilaiMap.get(`${st.id}_${m.id}`);
        if (val !== undefined) {
          total += val;
          count++;
        }
      });
      const avg = count > 0 ? Number((total / count).toFixed(2)) : 0;
      return {
        siswaId: st.id,
        total,
        average: avg,
        count,
      };
    });

    // Rank by average descending
    const sorted = [...list].sort((a, b) => b.average - a.average);
    const rankMap = new Map<string, number>();
    sorted.forEach((item, idx) => {
      rankMap.set(item.siswaId, idx + 1);
    });

    return { list, rankMap };
  }, [classStudents, mataPelajaran, nilaiMap]);

  // Class Summary Statistics
  const classStats = useMemo(() => {
    if (studentMetrics.list.length === 0) return { highest: 0, lowest: 0, classAvg: 0 };
    const averages = studentMetrics.list.map(s => s.average).filter(a => a > 0);
    if (averages.length === 0) return { highest: 0, lowest: 0, classAvg: 0 };

    const highest = Math.max(...averages);
    const lowest = Math.min(...averages);
    const classAvg = Number((averages.reduce((a, b) => a + b, 0) / averages.length).toFixed(1));

    return { highest, lowest, classAvg };
  }, [studentMetrics]);

  // Filtered by search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return classStudents;
    const q = searchQuery.toLowerCase();
    return classStudents.filter(
      s => s.namaLengkap.toLowerCase().includes(q) || s.nisn.includes(q)
    );
  }, [classStudents, searchQuery]);

  // Export to Excel
  const handleExportExcel = () => {
    if (!activeKelas) return;
    eksporLegerExcel(
      activeKelas,
      classStudents,
      mataPelajaran,
      nilai.filter(n => n.semester === sekolah.semester),
      presensi.filter(p => p.semester === sekolah.semester),
      sekolah.tahunAjaran,
      sekolah.semester
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header & Controls (Hidden during print) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <TableProperties className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Buku Leger Nilai Siswa (Rekapitulasi Kelas)
              </h2>
              <p className="text-xs text-slate-500">
                Rekap lengkap seluruh mata pelajaran, jumlah nilai, rata-rata, peringkat, dan ketidakhadiran
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Ekspor Leger ke Excel (.xlsx)</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Cetak Leger (A4 Landscape)</span>
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Rombongan Belajar (Kelas)
            </label>
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
                placeholder="Cari nama atau NISN siswa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Class Statistics Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Total Siswa</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{classStudents.length} Siswa</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Rata-Rata Kelas</div>
          <div className="text-xl font-bold text-blue-700 mt-1">{classStats.classAvg || '-'}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Rata-Rata Tertinggi</div>
          <div className="text-xl font-bold text-emerald-600 mt-1">{classStats.highest || '-'}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Rata-Rata Terendah</div>
          <div className="text-xl font-bold text-amber-600 mt-1">{classStats.lowest || '-'}</div>
        </div>
      </div>

      {/* Leger Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden print:border-none print:shadow-none">
        
        {/* Print Header (Only visible on print) */}
        <div className="hidden print:block p-4 border-b border-slate-900 text-center mb-4">
          <h2 className="text-base font-bold uppercase">{sekolah.namaSekolah}</h2>
          <h3 className="text-sm font-semibold">BUKU LEGER NILAI PESERTA DIDIK</h3>
          <p className="text-xs text-slate-600">
            Kelas: {activeKelas?.nama} • Semester: {sekolah.semester} • Tahun Ajaran: {sekolah.tahunAjaran}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-slate-100 text-slate-800 text-[10px] font-bold uppercase border-b border-slate-300">
                <th rowSpan={2} className="py-2 px-2 border-r border-slate-200 text-center w-8">No</th>
                <th rowSpan={2} className="py-2 px-2 border-r border-slate-200 w-24">NISN</th>
                <th rowSpan={2} className="py-2 px-2 border-r border-slate-200 w-20">NIS</th>
                <th rowSpan={2} className="py-2 px-3 border-r border-slate-200 w-44">Nama Peserta Didik</th>
                <th rowSpan={2} className="py-2 px-1 border-r border-slate-200 text-center w-8">JK</th>
                <th colSpan={mataPelajaran.length} className="py-1 px-2 border-b border-r border-slate-300 text-center bg-blue-50/80 text-blue-950">
                  Mata Pelajaran (Nilai Akhir)
                </th>
                <th colSpan={3} className="py-1 px-2 border-b border-r border-slate-300 text-center bg-indigo-50/80 text-indigo-950">
                  Statistik Prestasi
                </th>
                <th colSpan={3} className="py-1 px-2 border-b border-slate-300 text-center bg-amber-50/80 text-amber-950">
                  Absensi
                </th>
              </tr>
              <tr className="bg-slate-50 text-[10px] font-semibold text-slate-600 border-b border-slate-300">
                {mataPelajaran.map(m => (
                  <th key={m.id} className="py-1.5 px-1 text-center border-r border-slate-200 w-12" title={m.nama}>
                    {m.kode}
                  </th>
                ))}
                <th className="py-1.5 px-1 text-center border-r border-slate-200 w-14 bg-indigo-50/40">Total</th>
                <th className="py-1.5 px-1 text-center border-r border-slate-200 w-14 bg-indigo-50/40">Rata</th>
                <th className="py-1.5 px-1 text-center border-r border-slate-200 w-10 bg-indigo-50/40">Rank</th>
                <th className="py-1.5 px-1 text-center border-r border-slate-200 w-8 bg-amber-50/40">S</th>
                <th className="py-1.5 px-1 text-center border-r border-slate-200 w-8 bg-amber-50/40">I</th>
                <th className="py-1.5 px-1 text-center w-8 bg-amber-50/40">A</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={mataPelajaran.length + 11} className="py-8 text-center text-slate-400">
                    Tidak ada siswa ditemukan.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st, idx) => {
                  const stat = studentMetrics.list.find(s => s.siswaId === st.id);
                  const rank = studentMetrics.rankMap.get(st.id);
                  const pres = presensiMap.get(st.id) || { s: 0, i: 0, a: 0 };

                  return (
                    <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-2 text-center text-slate-400 font-medium border-r border-slate-100">{idx + 1}</td>
                      <td className="py-2 px-2 font-mono text-[10px] text-slate-600 border-r border-slate-100">{st.nisn}</td>
                      <td className="py-2 px-2 font-mono text-[10px] text-slate-500 border-r border-slate-100">{st.nis}</td>
                      <td className="py-2 px-3 font-semibold text-slate-800 border-r border-slate-100 truncate max-w-[180px]">
                        {st.namaLengkap}
                      </td>
                      <td className="py-2 px-1 text-center text-slate-500 border-r border-slate-100">{st.jenisKelamin}</td>

                      {/* Mapel Values */}
                      {mataPelajaran.map(m => {
                        const val = nilaiMap.get(`${st.id}_${m.id}`);
                        const isUnder = val !== undefined && val < m.kktp;
                        return (
                          <td
                            key={m.id}
                            className={`py-2 px-1 text-center border-r border-slate-100 font-semibold ${
                              isUnder ? 'text-rose-600 bg-rose-50/40' : val !== undefined ? 'text-slate-800' : 'text-slate-300'
                            }`}
                          >
                            {val !== undefined ? val : '-'}
                          </td>
                        );
                      })}

                      {/* Total, Average, Ranking */}
                      <td className="py-2 px-1 text-center font-bold text-slate-800 border-r border-slate-100 bg-indigo-50/20">
                        {stat?.total || 0}
                      </td>
                      <td className="py-2 px-1 text-center font-extrabold text-blue-800 border-r border-slate-100 bg-indigo-50/30">
                        {stat?.average || 0}
                      </td>
                      <td className="py-2 px-1 text-center font-bold border-r border-slate-100 bg-indigo-50/20">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          rank === 1 ? 'bg-amber-100 text-amber-900 font-black' :
                          rank === 2 ? 'bg-slate-200 text-slate-800' :
                          rank === 3 ? 'bg-orange-100 text-orange-900' : 'text-slate-600'
                        }`}>
                          {rank || '-'}
                        </span>
                      </td>

                      {/* Absensi */}
                      <td className="py-2 px-1 text-center text-slate-600 border-r border-slate-100 bg-amber-50/20">{pres.s}</td>
                      <td className="py-2 px-1 text-center text-slate-600 border-r border-slate-100 bg-amber-50/20">{pres.i}</td>
                      <td className="py-2 px-1 text-center text-slate-600 bg-amber-50/20">{pres.a}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
