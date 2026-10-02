import React from 'react';
import { ERaporDatabase } from '../utils/storage';
import { User } from '../types/erapor';
import {
  Users,
  Award,
  BookOpen,
  CheckCircle2,
  TrendingUp,
  FileSpreadsheet,
  Printer,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Layers
} from 'lucide-react';
import { NavTab } from './Sidebar';

interface DashboardProps {
  db: ERaporDatabase;
  currentUser: User;
  onNavigate: (tab: NavTab) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  db,
  currentUser,
  onNavigate,
}) => {
  const { sekolah, siswa, mataPelajaran, nilai, kelas, auditLogs } = db;

  // Total students
  const totalSiswa = siswa.length;
  const totalKelas = kelas.length;
  const totalMapel = mataPelajaran.length;

  // Calculate overall grade statistics
  const totalNilaiEntries = nilai.length;
  const avgNilaiAll = totalNilaiEntries > 0
    ? Math.round(nilai.reduce((acc, curr) => acc + curr.nilaiAkhir, 0) / totalNilaiEntries)
    : 0;

  // Grade distributions
  const predikatCount = {
    A: nilai.filter(n => n.predikat === 'A').length,
    B: nilai.filter(n => n.predikat === 'B').length,
    C: nilai.filter(n => n.predikat === 'C').length,
    D: nilai.filter(n => n.predikat === 'D').length,
  };

  // Completion per subject
  const mapelProgress = mataPelajaran.map(mapel => {
    // Total expected grades = total siswa in classes taking this mapel
    const entries = nilai.filter(n => n.mapelId === mapel.id);
    const percentage = totalSiswa > 0 ? Math.min(100, Math.round((entries.length / totalSiswa) * 100)) : 0;
    return {
      ...mapel,
      completedEntries: entries.length,
      percentage,
      avgScore: entries.length > 0
        ? Math.round(entries.reduce((a, b) => a + b.nilaiAkhir, 0) / entries.length)
        : 0,
    };
  });

  // Calculate top students ranking (based on average score across all subjects)
  const studentAverages = siswa.map(s => {
    const studentGrades = nilai.filter(n => n.siswaId === s.id);
    const total = studentGrades.reduce((a, b) => a + b.nilaiAkhir, 0);
    const avg = studentGrades.length > 0 ? Number((total / studentGrades.length).toFixed(1)) : 0;
    const kelasNama = kelas.find(k => k.id === s.kelasId)?.nama || '-';
    return {
      siswa: s,
      kelasNama,
      count: studentGrades.length,
      average: avg,
    };
  }).filter(s => s.count > 0).sort((a, b) => b.average - a.average);

  const topStudents = studentAverages.slice(0, 5);

  // Compute overall Teacher Completion Status for Admin & Wali Kelas
  const statusGuruStats = React.useMemo(() => {
    let lengkap = 0;
    let sebagian = 0;
    let belum = 0;
    let totalAssignments = 0;

    kelas.forEach(k => {
      const classStudents = siswa.filter(s => s.kelasId === k.id);
      const totalCount = classStudents.length;

      mataPelajaran.forEach(m => {
        totalAssignments++;
        const filled = nilai.filter(
          n => n.mapelId === m.id &&
               classStudents.some(s => s.id === n.siswaId) &&
               n.semester === sekolah.semester &&
               (n.nilaiAkhir > 0 || (n.tp1 !== undefined && n.tp2 !== undefined))
        ).length;

        if (totalCount > 0 && filled === totalCount) {
          lengkap++;
        } else if (filled > 0) {
          sebagian++;
        } else {
          belum++;
        }
      });
    });

    const percent = totalAssignments > 0 ? Math.round((lengkap / totalAssignments) * 100) : 0;
    return { lengkap, sebagian, belum, totalAssignments, percent };
  }, [kelas, siswa, mataPelajaran, nilai, sekolah]);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/20 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-blue-300" />
              <span>Aplikasi e-Rapor Digital Terintegrasi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Selamat Datang, {currentUser.namaLengkap}
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Sistem pencatatan nilai Kurikulum Merdeka & K13 dengan otomasi perhitungan nilai akhir, capaian kompetensi, 
              ekspor-impor Excel massal, serta pencetakan rapor berstandar resmi Kemdikbudristek.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigate('input_nilai')}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/25 transition-all transform active:scale-95"
            >
              <Award className="w-4 h-4" />
              <span>Input Nilai Siswa</span>
            </button>
            <button
              onClick={() => onNavigate('impor_excel')}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-600/25 transition-all transform active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Impor Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* INDIKATOR STATUS PENGISIAN GURU (CLOUD REAL-TIME) */}
      {(currentUser.role === 'admin' || currentUser.role === 'wali_kelas') && (
        <div className="bg-white rounded-2xl border border-blue-200/80 p-5 shadow-xs bg-gradient-to-r from-blue-50/40 via-white to-indigo-50/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    Indikator Status Pengisian Nilai Guru (Real-Time)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                    Live
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Kemajuan pengisian nilai oleh dewan guru untuk Semester {sekolah.semester} TA {sekolah.tahunAjaran}
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('status_pengisian')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-1.5 self-start sm:self-auto shrink-0"
            >
              <span>Buka Monitoring Lengkap</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <div className="text-[10px] font-bold text-slate-500 uppercase">Total Mapel Rombel</div>
              <div className="text-lg font-bold text-slate-800 mt-1">{statusGuruStats.totalAssignments} Penugasan</div>
            </div>

            <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200">
              <div className="text-[10px] font-bold text-emerald-800 uppercase flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <span>Sudah Lengkap (100%)</span>
              </div>
              <div className="text-lg font-bold text-emerald-900 mt-1">{statusGuruStats.lengkap} Mapel</div>
              <div className="text-[10px] text-emerald-700 font-medium">{statusGuruStats.percent}% tercapai</div>
            </div>

            <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200">
              <div className="text-[10px] font-bold text-amber-800 uppercase flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>Sebagian Terisi</span>
              </div>
              <div className="text-lg font-bold text-amber-900 mt-1">{statusGuruStats.sebagian} Mapel</div>
              <div className="text-[10px] text-amber-700">Sedang mengisi</div>
            </div>

            <div className="bg-rose-50/80 p-3 rounded-xl border border-rose-200">
              <div className="text-[10px] font-bold text-rose-800 uppercase flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                <span>Belum Mengisi (0%)</span>
              </div>
              <div className="text-lg font-bold text-rose-900 mt-1">{statusGuruStats.belum} Mapel</div>
              <div className="text-[10px] text-rose-700">Perlu diingatkan</div>
            </div>
          </div>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Siswa */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Siswa</span>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totalSiswa}</span>
            <span className="text-xs text-slate-500">terdaftar di {totalKelas} Rombel</span>
          </div>
          <div className="mt-2 text-xs text-blue-600 font-medium flex items-center gap-1 cursor-pointer hover:underline" onClick={() => onNavigate('siswa')}>
            <span>Kelola data siswa</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Nilai Rata-rata */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rata-Rata Nilai</span>
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{avgNilaiAll || '-'}</span>
            <span className="text-xs text-emerald-600 font-medium">Skala 100</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {totalNilaiEntries} entri nilai tersimpan
          </div>
        </div>

        {/* Predikat Unggul */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Predikat A & B</span>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {predikatCount.A + predikatCount.B}
            </span>
            <span className="text-xs text-slate-500">
              ({totalNilaiEntries > 0 ? Math.round(((predikatCount.A + predikatCount.B) / totalNilaiEntries) * 100) : 0}%)
            </span>
          </div>
          <div className="mt-2 text-xs text-emerald-600 font-medium">
            Memenuhi standar capaian KKTP
          </div>
        </div>

        {/* Mata Pelajaran */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mata Pelajaran</span>
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totalMapel}</span>
            <span className="text-xs text-slate-500">mapel aktif</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Kurikulum: {sekolah.kurikulum}
          </div>
        </div>

      </div>

      {/* Main Content Split: Progress Mapel & Top Students / Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 Cols): Status Pengisian Nilai Guru */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Status Pengisian Nilai per Mata Pelajaran
                </h3>
                <p className="text-xs text-slate-500">
                  Pantau kemajuan guru dalam melengkapi nilai formatif dan sumatif
                </p>
              </div>
              <button
                onClick={() => onNavigate('input_nilai')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <span>Input Sekarang</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-4">
              {mapelProgress.slice(0, 6).map((item) => (
                <div key={item.id} className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{item.nama}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-200/60 text-slate-600">
                        KKTP: {item.kktp}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">{item.completedEntries}/{totalSiswa} Siswa</span>
                      <span className="font-bold text-slate-900">{item.percentage}%</span>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.percentage === 100
                          ? 'bg-emerald-500'
                          : item.percentage >= 50
                          ? 'bg-blue-600'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md">
            <h3 className="text-base font-bold mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Akses Cepat Pengelolaan e-Rapor</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              <button
                onClick={() => onNavigate('input_nilai')}
                className="p-3 bg-slate-800 hover:bg-slate-700/80 rounded-xl text-left border border-slate-700 transition-colors group"
              >
                <Award className="w-5 h-5 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-bold text-white">Input Nilai</div>
                <div className="text-[10px] text-slate-400">TP, STS, SAS</div>
              </button>

              <button
                onClick={() => onNavigate('impor_excel')}
                className="p-3 bg-slate-800 hover:bg-slate-700/80 rounded-xl text-left border border-slate-700 transition-colors group"
              >
                <FileSpreadsheet className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-bold text-white">Impor Excel</div>
                <div className="text-[10px] text-slate-400">Upload massal</div>
              </button>

              <button
                onClick={() => onNavigate('rombel')}
                className="p-3 bg-slate-800 hover:bg-slate-700/80 rounded-xl text-left border border-slate-700 transition-colors group"
              >
                <Layers className="w-5 h-5 text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-bold text-white">Tambah Rombel</div>
                <div className="text-[10px] text-slate-400">Kelas & Wali</div>
              </button>

              <button
                onClick={() => onNavigate('mata_pelajaran')}
                className="p-3 bg-slate-800 hover:bg-slate-700/80 rounded-xl text-left border border-slate-700 transition-colors group"
              >
                <BookOpen className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-bold text-white">Tambah Mapel</div>
                <div className="text-[10px] text-slate-400">KKTP & TP Baru</div>
              </button>

              <button
                onClick={() => onNavigate('kelola_pengguna')}
                className="p-3 bg-slate-800 hover:bg-slate-700/80 rounded-xl text-left border border-slate-700 transition-colors group"
              >
                <Users className="w-5 h-5 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-bold text-white">Tambah Guru</div>
                <div className="text-[10px] text-slate-400">Kelola Pendidik</div>
              </button>

              <button
                onClick={() => onNavigate('sekolah')}
                className="p-3 bg-slate-800 hover:bg-slate-700/80 rounded-xl text-left border border-slate-700 transition-colors group"
              >
                <Sparkles className="w-5 h-5 text-pink-400 mb-2 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-bold text-white">Upload Logo</div>
                <div className="text-[10px] text-slate-400">Pemda & Sekolah</div>
              </button>

              <button
                onClick={() => onNavigate('cetak_rapor')}
                className="p-3 bg-slate-800 hover:bg-slate-700/80 rounded-xl text-left border border-slate-700 transition-colors group"
              >
                <Printer className="w-5 h-5 text-rose-400 mb-2 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-bold text-white">Cetak Rapor</div>
                <div className="text-[10px] text-slate-400">PDF Standar A4</div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Top Students & Audit Logs */}
        <div className="space-y-6">
          
          {/* Top Students */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Peringkat Prestasi Siswa</h3>
                <p className="text-xs text-slate-500">Nilai rata-rata kumulatif tertinggi</p>
              </div>
              <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                <Award className="w-4 h-4" />
              </span>
            </div>

            <div className="space-y-3">
              {topStudents.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  Belum ada nilai yang diinputkan.
                </div>
              ) : (
                topStudents.map((item, idx) => (
                  <div key={item.siswa.id} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                        idx === 0
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : idx === 1
                          ? 'bg-slate-200 text-slate-700'
                          : idx === 2
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 truncate max-w-[140px]">
                          {item.siswa.namaLengkap}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Kelas {item.kelasNama} • NISN: {item.siswa.nisn}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-extrabold text-blue-700">
                        {item.average}
                      </div>
                      <div className="text-[9px] text-slate-400">Rata-rata</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => onNavigate('leger')}
              className="w-full mt-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold text-center transition-colors"
            >
              Lihat Leger Lengkap Kelas
            </button>
          </div>

          {/* Audit Trail Logs */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Aktivitas Terakhir</h3>
                <p className="text-xs text-slate-500">Log keamanan & perubahan data</p>
              </div>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>

            <div className="space-y-3">
              {auditLogs.slice(0, 4).map((log) => (
                <div key={log.id} className="text-xs border-l-2 border-blue-500 pl-3 py-1 space-y-0.5">
                  <div className="flex items-center justify-between text-slate-500 text-[10px]">
                    <span className="font-medium text-slate-700">{log.userName}</span>
                    <span>{log.timestamp.slice(5, 16)}</span>
                  </div>
                  <div className="font-semibold text-slate-800">{log.action}</div>
                  <div className="text-slate-500 text-[11px] line-clamp-2">{log.details}</div>
                </div>
              ))}
            </div>

            <button
              onClick={() => onNavigate('keamanan')}
              className="w-full mt-4 py-2 text-xs font-semibold text-blue-600 hover:text-blue-800 text-center"
            >
              Kelola Keamanan & Cadangan
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
