import React, { useState, useMemo } from 'react';
import { ERaporDatabase } from '../utils/storage';
import { User, Kelas, MataPelajaran } from '../types/erapor';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Bell,
  Search,
  BookOpen,
  Users,
  GraduationCap,
  ExternalLink,
  Send,
  Sparkles,
  Filter
} from 'lucide-react';

interface StatusPengisianGuruProps {
  db: ERaporDatabase;
  currentUser: User;
  onNavigateToInputNilai: (mapelId: string, kelasId: string) => void;
}

export interface ProgressItem {
  id: string;
  guru: User;
  mapel: MataPelajaran;
  kelas: Kelas;
  totalSiswa: number;
  totalTerisi: number;
  persentase: number;
  status: 'lengkap' | 'sebagian' | 'belum';
  lastUpdated?: string;
}

export const StatusPengisianGuru: React.FC<StatusPengisianGuruProps> = ({
  db,
  currentUser,
  onNavigateToInputNilai,
}) => {
  const { users, mataPelajaran, kelas, siswa, nilai, sekolah } = db;

  const [filterKelasId, setFilterKelasId] = useState<string>(
    currentUser.role === 'wali_kelas' && currentUser.kelasId
      ? currentUser.kelasId
      : 'all'
  );
  const [filterStatus, setFilterStatus] = useState<'all' | 'lengkap' | 'sebagian' | 'belum'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [reminderToast, setReminderToast] = useState<string | null>(null);

  // Compute progress for each (Guru x Mapel x Kelas) assignment
  const progressList = useMemo<ProgressItem[]>(() => {
    const items: ProgressItem[] = [];

    // For every class
    kelas.forEach(k => {
      const classStudents = siswa.filter(s => s.kelasId === k.id);
      const totalCount = classStudents.length;

      // For every subject
      mataPelajaran.forEach(m => {
        const assignedGuru = users.find(u => u.id === m.guruId) || {
          id: 'unassigned',
          username: '-',
          namaLengkap: 'Belum Ditugaskan',
          role: 'guru' as const,
        };

        // Find how many students in this class have grades for this mapel
        const entries = nilai.filter(
          n => n.mapelId === m.id &&
               n.semester === sekolah.semester &&
               classStudents.some(s => s.id === n.siswaId) &&
               (n.nilaiAkhir > 0 || (n.tp1 !== undefined && n.tp2 !== undefined))
        );

        const totalTerisi = entries.length;
        const persentase = totalCount > 0 ? Math.round((totalTerisi / totalCount) * 100) : 0;

        let status: 'lengkap' | 'sebagian' | 'belum' = 'belum';
        if (persentase === 100) {
          status = 'lengkap';
        } else if (persentase > 0) {
          status = 'sebagian';
        }

        // Find last update from audit logs or timestamp
        const relatedLog = db.auditLogs.find(
          log => log.details.includes(m.nama) && log.details.includes(k.nama)
        );

        items.push({
          id: `${k.id}_${m.id}`,
          guru: assignedGuru,
          mapel: m,
          kelas: k,
          totalSiswa: totalCount,
          totalTerisi,
          persentase,
          status,
          lastUpdated: relatedLog ? relatedLog.timestamp.slice(5, 16) : undefined,
        });
      });
    });

    return items;
  }, [kelas, mataPelajaran, siswa, nilai, users, sekolah, db.auditLogs]);

  // Overall Statistics
  const stats = useMemo(() => {
    const total = progressList.length;
    const lengkap = progressList.filter(p => p.status === 'lengkap').length;
    const sebagian = progressList.filter(p => p.status === 'sebagian').length;
    const belum = progressList.filter(p => p.status === 'belum').length;
    const percentOverall = total > 0 ? Math.round((lengkap / total) * 100) : 0;
    return { total, lengkap, sebagian, belum, percentOverall };
  }, [progressList]);

  // Filtered List
  const filteredList = useMemo(() => {
    return progressList.filter(item => {
      const matchKelas = filterKelasId === 'all' || item.kelas.id === filterKelasId;
      const matchStatus = filterStatus === 'all' || item.status === filterStatus;
      const matchSearch = !searchQuery.trim() ||
        item.guru.namaLengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.mapel.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.kelas.nama.toLowerCase().includes(searchQuery.toLowerCase());

      return matchKelas && matchStatus && matchSearch;
    });
  }, [progressList, filterKelasId, filterStatus, searchQuery]);

  // Send Reminder Action
  const handleSendReminder = (item: ProgressItem) => {
    setReminderToast(`Pengingat berhasil dikirim kepada ${item.guru.namaLengkap} untuk melengkapi nilai mata pelajaran ${item.mapel.nama} Kelas ${item.kelas.nama}!`);
    setTimeout(() => setReminderToast(null), 4500);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Monitoring Pengisian Nilai Guru (Real-Time)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                  <span>Cloud Live</span>
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Pantau langsung status guru yang sudah lengkap mengisi, sedang mengisi, atau belum mengisi nilai rapor
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs font-semibold text-slate-500">Tahun Ajaran Aktif</div>
            <div className="text-sm font-extrabold text-blue-700">
              {sekolah.semester} TA {sekolah.tahunAjaran}
            </div>
          </div>
        </div>

        {/* Metric Cards Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Total Penugasan</div>
            <div className="text-xl font-black text-slate-900 mt-1">{stats.total} Penugasan</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{kelas.length} Kelas • {mataPelajaran.length} Mapel</div>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
            <div className="text-[10px] font-bold text-emerald-800 uppercase flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Sudah Lengkap (100%)</span>
            </div>
            <div className="text-xl font-black text-emerald-900 mt-1">{stats.lengkap} Mapel</div>
            <div className="text-[10px] text-emerald-700 mt-0.5">{stats.percentOverall}% dari total</div>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
            <div className="text-[10px] font-bold text-amber-800 uppercase flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-600" />
              <span>Sebagian Terisi</span>
            </div>
            <div className="text-xl font-black text-amber-900 mt-1">{stats.sebagian} Mapel</div>
            <div className="text-[10px] text-amber-700 mt-0.5">Sedang dalam proses</div>
          </div>

          <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
            <div className="text-[10px] font-bold text-rose-800 uppercase flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-rose-600" />
              <span>Belum Mengisi (0%)</span>
            </div>
            <div className="text-xl font-black text-rose-900 mt-1">{stats.belum} Mapel</div>
            <div className="text-[10px] text-rose-700 mt-0.5">Perlu tindak lanjut</div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Filter Rombongan Belajar (Kelas)
            </label>
            <select
              value={filterKelasId}
              onChange={(e) => setFilterKelasId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
            >
              <option value="all">-- Semua Rombel ({kelas.length} Kelas) --</option>
              {kelas.map(k => (
                <option key={k.id} value={k.id}>Kelas {k.nama}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Status Pengisian
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
            >
              <option value="all">Semua Status</option>
              <option value="lengkap">🟢 Lengkap (100%)</option>
              <option value="sebagian">🟡 Sebagian Terisi</option>
              <option value="belum">🔴 Belum Mengisi (0%)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Cari Guru / Mata Pelajaran
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Ketik nama guru atau mapel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400"
              />
            </div>
          </div>
        </div>
      </div>

      {reminderToast && (
        <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg flex items-center justify-between text-xs font-semibold animate-in fade-in">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 shrink-0" />
            <span>{reminderToast}</span>
          </div>
          <button
            onClick={() => setReminderToast(null)}
            className="text-white hover:text-blue-200 text-xs font-bold ml-4"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Progress Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="text-xs font-bold text-slate-800">
            Daftar Progres Pengisian Nilai ({filteredList.length} Mata Pelajaran & Kelas)
          </div>
          <div className="text-[11px] text-slate-500">
            Data tersinkronisasi otomatis secara real-time
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/70 text-slate-700 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4 w-10 text-center">No</th>
                <th className="py-3 px-4">Guru Pendidik & NIP</th>
                <th className="py-3 px-4">Mata Pelajaran</th>
                <th className="py-3 px-3 text-center w-24">Kelas</th>
                <th className="py-3 px-4 w-44">Progres Siswa Terisi</th>
                <th className="py-3 px-3 text-center w-32">Status Pengisian</th>
                <th className="py-3 px-3 w-32">Pembaruan Terakhir</th>
                <th className="py-3 px-4 text-center w-36">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Tidak ada penugasan guru yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-center text-slate-400 font-medium">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {item.guru.namaLengkap.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{item.guru.namaLengkap}</div>
                          {item.guru.nip && (
                            <div className="text-[10px] text-slate-400 font-mono">NIP: {item.guru.nip}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{item.mapel.nama}</div>
                      <div className="text-[10px] text-slate-400">KKTP: {item.mapel.kktp} • Kode: {item.mapel.kode}</div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 font-bold text-slate-800">
                        Kelas {item.kelas.nama}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-700">
                            {item.totalTerisi} / {item.totalSiswa} Siswa
                          </span>
                          <span className="font-bold text-slate-900">{item.persentase}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              item.persentase === 100
                                ? 'bg-emerald-500'
                                : item.persentase > 0
                                ? 'bg-amber-500'
                                : 'bg-slate-300'
                            }`}
                            style={{ width: `${item.persentase}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {item.status === 'lengkap' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Lengkap</span>
                        </span>
                      ) : item.status === 'sebagian' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Sebagian</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                          <span>Belum Mengisi</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {item.lastUpdated ? (
                        <span className="font-mono text-slate-700">{item.lastUpdated}</span>
                      ) : (
                        <span className="text-slate-400 italic">Belum ada entri</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onNavigateToInputNilai(item.mapel.id, item.kelas.id)}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] rounded-lg transition-colors flex items-center gap-1"
                          title="Buka Lembar Nilai"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Buka Nilai</span>
                        </button>

                        {item.status !== 'lengkap' && (
                          <button
                            onClick={() => handleSendReminder(item)}
                            className="p-1 hover:bg-amber-50 text-amber-600 rounded-lg transition-colors"
                            title="Kirim Pengingat ke Guru"
                          >
                            <Bell className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
