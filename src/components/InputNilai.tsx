import React, { useState, useMemo } from 'react';
import { ERaporDatabase, addAuditLog, saveDatabase } from '../utils/storage';
import { User, NilaiSiswa, MataPelajaran, Kelas, TujuanPembelajaran } from '../types/erapor';
import { unduhTemplateNilaiExcel } from '../utils/excel';
import {
  Award,
  Save,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sparkles,
  Search,
  Filter,
  Check,
  Edit3
} from 'lucide-react';

interface InputNilaiProps {
  db: ERaporDatabase;
  currentUser: User;
  initialMapelId?: string;
  initialKelasId?: string;
  onUpdateDatabase: (newDb: ERaporDatabase) => void;
  onNavigateToImport: (mapelId: string, kelasId: string) => void;
}

export const InputNilai: React.FC<InputNilaiProps> = ({
  db,
  currentUser,
  initialMapelId,
  initialKelasId,
  onUpdateDatabase,
  onNavigateToImport,
}) => {
  const { kelas, mataPelajaran, siswa, nilai, tujuanPembelajaran, sekolah } = db;

  // Filter selection state
  const [selectedKelasId, setSelectedKelasId] = useState<string>(
    initialKelasId || currentUser.kelasId || (kelas.length > 0 ? kelas[0].id : '')
  );

  const [selectedMapelId, setSelectedMapelId] = useState<string>(
    initialMapelId ||
      (currentUser.mapelIds && currentUser.mapelIds.length > 0
        ? currentUser.mapelIds[0]
        : mataPelajaran.length > 0 ? mataPelajaran[0].id : '')
  );

  React.useEffect(() => {
    if (initialKelasId) setSelectedKelasId(initialKelasId);
  }, [initialKelasId]);

  React.useEffect(() => {
    if (initialMapelId) setSelectedMapelId(initialMapelId);
  }, [initialMapelId]);

  const [searchQuery, setSearchQuery] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Active Mapel and Kelas objects
  const activeMapel = useMemo(
    () => mataPelajaran.find(m => m.id === selectedMapelId) || mataPelajaran[0],
    [mataPelajaran, selectedMapelId]
  );

  const activeKelas = useMemo(
    () => kelas.find(k => k.id === selectedKelasId) || kelas[0],
    [kelas, selectedKelasId]
  );

  // Editable KKTP state for quick adjustment
  const [currentKktp, setCurrentKktp] = useState<number>(activeMapel?.kktp || 75);
  const [isEditingKktp, setIsEditingKktp] = useState<boolean>(false);

  React.useEffect(() => {
    if (activeMapel) {
      setCurrentKktp(activeMapel.kktp);
      setIsEditingKktp(false);
    }
  }, [activeMapel]);

  // TP list for active mapel (simplified to 2 TP)
  const activeTps = useMemo(
    () => tujuanPembelajaran.filter(tp => tp.mapelId === activeMapel?.id),
    [tujuanPembelajaran, activeMapel]
  );

  // Students in selected class
  const classStudents = useMemo(() => {
    return siswa.filter(s => s.kelasId === selectedKelasId);
  }, [siswa, selectedKelasId]);

  // Working state for the grade form
  // Map of studentId -> NilaiSiswa draft
  const [gradesDraft, setGradesDraft] = useState<Record<string, Partial<NilaiSiswa>>>({});

  // Sync draft when class/mapel changes
  React.useEffect(() => {
    const draft: Record<string, Partial<NilaiSiswa>> = {};
    classStudents.forEach(st => {
      const existing = nilai.find(
        n => n.siswaId === st.id && n.mapelId === selectedMapelId && n.semester === sekolah.semester
      );
      if (existing) {
        draft[st.id] = { ...existing };
      } else {
        draft[st.id] = {
          siswaId: st.id,
          mapelId: selectedMapelId,
          semester: sekolah.semester,
          tahunAjaran: sekolah.tahunAjaran,
          tp1: undefined,
          tp2: undefined,
          sumatifTengahSemester: undefined,
          sumatifAkhirSemester: undefined,
          nilaiTugas: undefined,
          nilaiAkhir: 0,
          predikat: 'D',
          capaianTertinggi: '',
          capaianTerendah: '',
        };
      }
    });
    setGradesDraft(draft);
    setSaveSuccessMsg(null);
  }, [selectedKelasId, selectedMapelId, classStudents, nilai, sekolah]);

  // Helper to calculate NA & Predikat & Capaian Narasi (Simplified to 2 TP)
  const computeFinalGrade = (
    row: Partial<NilaiSiswa>,
    kktp = currentKktp || activeMapel?.kktp || 75
  ): {
    nilaiAkhir: number;
    predikat: 'A' | 'B' | 'C' | 'D';
    capaianTertinggi: string;
    capaianTerendah: string;
  } => {
    // Only 2 TP values
    const tpVals = [row.tp1, row.tp2].filter((v): v is number => typeof v === 'number');
    const avgTp = tpVals.length > 0 ? tpVals.reduce((a, b) => a + b, 0) / tpVals.length : 0;
    
    const sts = typeof row.sumatifTengahSemester === 'number' ? row.sumatifTengahSemester : avgTp;
    const sas = typeof row.sumatifAkhirSemester === 'number' ? row.sumatifAkhirSemester : avgTp;

    // Weighting: Formatif (Rata-rata 2 TP) 40%, STS 30%, SAS 30%
    const calculated = Math.round((avgTp * 0.4) + (sts * 0.3) + (sas * 0.3));
    const nilaiAkhir = Math.max(0, Math.min(100, calculated));

    let predikat: 'A' | 'B' | 'C' | 'D' = 'D';
    if (nilaiAkhir >= 90) predikat = 'A';
    else if (nilaiAkhir >= 80) predikat = 'B';
    else if (nilaiAkhir >= kktp) predikat = 'C';
    else predikat = 'D';

    // Auto-generate learning achievement narrative from 2 TP
    let capaianTertinggi = row.capaianTertinggi || '';
    let capaianTerendah = row.capaianTerendah || '';

    const tp1Desc = activeTps[0]?.deskripsi || activeTps[0]?.materiPokok || 'pemahaman konsep dan teori dasar';
    const tp2Desc = activeTps[1]?.deskripsi || activeTps[1]?.materiPokok || 'penerapan dan pemecahan masalah kontekstual';

    if (tpVals.length > 0 && (!row.capaianTertinggi || row.capaianTertinggi.startsWith('Menunjukkan') || row.capaianTertinggi === '')) {
      const score1 = row.tp1 ?? 0;
      const score2 = row.tp2 ?? 0;

      if (score1 >= score2 && score1 > 0) {
        capaianTertinggi = `Menunjukkan penguasaan sangat baik dalam ${tp1Desc.toLowerCase()}.`;
        if (score2 < kktp && score2 > 0) {
          capaianTerendah = `Perlu bimbingan dan peningkatan dalam ${tp2Desc.toLowerCase()}.`;
        } else {
          capaianTerendah = `Menunjukkan pemahaman yang memadai pada seluruh tujuan pembelajaran.`;
        }
      } else if (score2 > score1 && score2 > 0) {
        capaianTertinggi = `Menunjukkan penguasaan sangat baik dalam ${tp2Desc.toLowerCase()}.`;
        if (score1 < kktp && score1 > 0) {
          capaianTerendah = `Perlu bimbingan dan peningkatan dalam ${tp1Desc.toLowerCase()}.`;
        } else {
          capaianTerendah = `Menunjukkan pemahaman yang memadai pada seluruh tujuan pembelajaran.`;
        }
      }
    }

    return { nilaiAkhir, predikat, capaianTertinggi, capaianTerendah };
  };

  // Handle cell value change
  const handleScoreChange = (
    siswaId: string,
    field: keyof NilaiSiswa,
    value: string
  ) => {
    const num = value === '' ? undefined : Number(value);
    const validNum = num !== undefined && !isNaN(num) ? Math.max(0, Math.min(100, num)) : undefined;

    setGradesDraft(prev => {
      const current = prev[siswaId] || {};
      const updatedRow = { ...current, [field]: validNum };
      const { nilaiAkhir, predikat, capaianTertinggi, capaianTerendah } = computeFinalGrade(updatedRow);

      return {
        ...prev,
        [siswaId]: {
          ...updatedRow,
          nilaiAkhir,
          predikat,
          capaianTertinggi,
          capaianTerendah,
        },
      };
    });
  };

  // Handle direct narrative text editing
  const handleNarrativeChange = (siswaId: string, field: 'capaianTertinggi' | 'capaianTerendah', text: string) => {
    setGradesDraft(prev => ({
      ...prev,
      [siswaId]: {
        ...prev[siswaId],
        [field]: text,
      },
    }));
  };

  // Save KKTP change directly from input nilai
  const handleSaveKktp = () => {
    if (!activeMapel) return;
    const updatedMapels = mataPelajaran.map(m => {
      if (m.id === activeMapel.id) {
        return { ...m, kktp: currentKktp };
      }
      return m;
    });

    let updatedDb: ERaporDatabase = {
      ...db,
      mataPelajaran: updatedMapels,
    };

    saveDatabase(updatedDb);
    onUpdateDatabase(updatedDb);
    setIsEditingKktp(false);

    // Recompute all drafts with new KKTP
    setGradesDraft(prev => {
      const next: Record<string, Partial<NilaiSiswa>> = {};
      Object.keys(prev).forEach(sid => {
        const item = prev[sid];
        const { nilaiAkhir, predikat, capaianTertinggi, capaianTerendah } = computeFinalGrade(item, currentKktp);
        next[sid] = {
          ...item,
          nilaiAkhir,
          predikat,
          capaianTertinggi,
          capaianTerendah,
        };
      });
      return next;
    });

    setSaveSuccessMsg(`KKTP untuk mata pelajaran ${activeMapel.nama} berhasil diperbarui menjadi ${currentKktp}!`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  // Save all grades
  const handleSaveAll = () => {
    let newNilaiList = [...nilai];
    let updateCount = 0;

    classStudents.forEach(st => {
      const draft = gradesDraft[st.id];
      if (!draft) return;

      const existingIndex = newNilaiList.findIndex(
        n => n.siswaId === st.id && n.mapelId === selectedMapelId && n.semester === sekolah.semester
      );

      const record: NilaiSiswa = {
        id: draft.id || `nil-${st.id}-${selectedMapelId}-${Date.now()}`,
        siswaId: st.id,
        mapelId: selectedMapelId,
        semester: sekolah.semester,
        tahunAjaran: sekolah.tahunAjaran,
        tp1: draft.tp1,
        tp2: draft.tp2,
        sumatifTengahSemester: draft.sumatifTengahSemester,
        sumatifAkhirSemester: draft.sumatifAkhirSemester,
        nilaiTugas: draft.nilaiTugas,
        nilaiAkhir: draft.nilaiAkhir ?? 0,
        predikat: draft.predikat || 'D',
        capaianTertinggi: draft.capaianTertinggi || '',
        capaianTerendah: draft.capaianTerendah || '',
      };

      if (existingIndex >= 0) {
        newNilaiList[existingIndex] = record;
      } else {
        newNilaiList.push(record);
      }
      updateCount++;
    });

    let updatedDb: ERaporDatabase = {
      ...db,
      nilai: newNilaiList,
    };

    updatedDb = addAuditLog(
      updatedDb,
      'Penyimpanan Nilai',
      `Menyimpan ${updateCount} data nilai mapel ${activeMapel?.nama} untuk kelas ${activeKelas?.nama} (KKTP: ${currentKktp}).`,
      currentUser
    );

    saveDatabase(updatedDb);
    onUpdateDatabase(updatedDb);

    setSaveSuccessMsg(`Berhasil menyimpan nilai untuk ${updateCount} siswa di kelas ${activeKelas?.nama}! Data terenkripsi dengan aman.`);
    setTimeout(() => setSaveSuccessMsg(null), 5000);
  };

  // Download template action (2 TP)
  const handleDownloadTemplate = () => {
    if (!activeKelas || !activeMapel) return;
    unduhTemplateNilaiExcel(activeKelas, activeMapel, classStudents, activeTps);
  };

  // Filtered student list for search
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return classStudents;
    const q = searchQuery.toLowerCase();
    return classStudents.filter(
      s => s.namaLengkap.toLowerCase().includes(q) || s.nisn.includes(q)
    );
  }, [classStudents, searchQuery]);

  // Statistics for Ketuntasan KKTP
  const ketuntasanStats = useMemo(() => {
    let tuntas = 0;
    let belumTuntas = 0;
    let totalAssessed = 0;

    classStudents.forEach(st => {
      const d = gradesDraft[st.id];
      if (d && (d.nilaiAkhir ?? 0) > 0) {
        totalAssessed++;
        if ((d.nilaiAkhir ?? 0) >= currentKktp) {
          tuntas++;
        } else {
          belumTuntas++;
        }
      }
    });

    const percent = totalAssessed > 0 ? Math.round((tuntas / totalAssessed) * 100) : 0;
    return { tuntas, belumTuntas, totalAssessed, percent };
  }, [classStudents, gradesDraft, currentKktp]);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header & Filter Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Entri & Manajemen Nilai Siswa
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Format Sederhana 2 TP
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Format Kurikulum Merdeka praktis: 2 Tujuan Pembelajaran (TP 1 & TP 2), STS, SAS, dan Indikator Ketuntasan KKTP
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
              title="Unduh template Excel dengan 2 TP untuk mapel ini"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Unduh Template Excel (2 TP)</span>
            </button>

            <button
              onClick={() => onNavigateToImport(selectedMapelId, selectedKelasId)}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-xl transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              <span>Impor Excel</span>
            </button>

            <button
              onClick={handleSaveAll}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/20 transition-all active:scale-95"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Nilai</span>
            </button>
          </div>
        </div>

        {/* Filter bar with KKTP Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-1">
          {/* Select Kelas */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Rombongan Belajar (Kelas)
            </label>
            <select
              value={selectedKelasId}
              onChange={(e) => setSelectedKelasId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              {kelas.map(k => (
                <option key={k.id} value={k.id}>Kelas {k.nama} (Tingkat {k.tingkat})</option>
              ))}
            </select>
          </div>

          {/* Select Mapel */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Mata Pelajaran
            </label>
            <select
              value={selectedMapelId}
              onChange={(e) => setSelectedMapelId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              {mataPelajaran.map(m => (
                <option key={m.id} value={m.id}>
                  {m.nama} (KKTP: {m.kktp})
                </option>
              ))}
            </select>
          </div>

          {/* KKTP Card & Controller (DITAMBAHKAN SESUAI PERMINTAAN USER) */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-2.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-900 uppercase">
                KKTP Mata Pelajaran
              </span>
              {!isEditingKktp ? (
                <button
                  onClick={() => setIsEditingKktp(true)}
                  className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5"
                  title="Sesuaikan KKTP"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Ubah</span>
                </button>
              ) : (
                <button
                  onClick={handleSaveKktp}
                  className="text-[10px] text-emerald-700 font-bold hover:underline flex items-center gap-0.5"
                >
                  <Check className="w-3 h-3" />
                  <span>Simpan</span>
                </button>
              )}
            </div>

            <div className="flex items-center justify-between mt-1">
              {isEditingKktp ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={currentKktp}
                    onChange={(e) => setCurrentKktp(Number(e.target.value))}
                    className="w-16 h-7 px-2 text-xs font-black text-center bg-white border border-blue-400 rounded-lg text-blue-950 focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-500">Skala 100</span>
                </div>
              ) : (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-blue-950">{currentKktp}</span>
                  <span className="text-[10px] font-semibold text-slate-500">Skor Minimum Tuntas</span>
                </div>
              )}

              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-600 text-white">
                KKTP: {currentKktp}
              </span>
            </div>
          </div>

          {/* Search Siswa */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Cari Siswa
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Ketik Nama atau NISN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Info guide, Ketuntasan KKTP Summary, and active criteria */}
        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Ketentuan Bobot:</strong> Rata-rata 2 TP (Formatif) 40% + STS 30% + SAS 30%. Siswa dinyatakan <strong>TUNTAS</strong> jika Nilai Akhir (NA) &ge; <strong>{currentKktp}</strong>.
            </span>
          </div>

          {/* Status Ketuntasan Kelas Pills */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-[11px] font-semibold text-emerald-800">
                Tuntas: <strong>{ketuntasanStats.tuntas}</strong> ({ketuntasanStats.percent}%)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span className="text-[11px] font-semibold text-rose-800">
                Belum Tuntas: <strong>{ketuntasanStats.belumTuntas}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Success Alert */}
        {saveSuccessMsg && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{saveSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* Grade Entry Table (2 TP SAJA & DITAMBAHKAN INDIKATOR KKTP) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
            <span>Daftar Nilai: {activeMapel?.nama} — Kelas {activeKelas?.nama} ({filteredStudents.length} Siswa)</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800">
              Target KKTP: {currentKktp}
            </span>
          </div>
          <div className="text-[11px] text-slate-500">
            Hanya 2 TP (Formatif), STS, dan SAS
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[980px]">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-3 w-10 text-center">No</th>
                <th className="py-3 px-3 w-28">NISN / NIS</th>
                <th className="py-3 px-3 w-48">Nama Siswa</th>
                
                {/* 2 TP SAJA SESUAI PERMINTAAN */}
                <th className="py-3 px-2 w-20 text-center bg-blue-50/50 text-blue-950" title={activeTps[0]?.deskripsi || 'TP 1: Pemahaman Teori & Konsep Dasar'}>
                  TP 1 (Formatif)
                </th>
                <th className="py-3 px-2 w-20 text-center bg-blue-50/50 text-blue-950" title={activeTps[1]?.deskripsi || 'TP 2: Praktik & Penerapan'}>
                  TP 2 (Formatif)
                </th>

                <th className="py-3 px-2 w-16 text-center bg-slate-200/40">STS</th>
                <th className="py-3 px-2 w-16 text-center bg-slate-200/40">SAS</th>
                <th className="py-3 px-2 w-16 text-center">Tugas</th>
                <th className="py-3 px-2 w-16 text-center bg-blue-100/60 text-blue-950 font-black">NA</th>
                
                {/* KKTP & STATUS KETUNTASAN (DITAMBAHKAN SESUAI PERMINTAAN USER) */}
                <th className="py-3 px-2 w-16 text-center bg-indigo-50/60 text-indigo-950 font-bold">KKTP</th>
                <th className="py-3 px-2 w-24 text-center">Ketuntasan</th>
                <th className="py-3 px-2 w-12 text-center">Pred</th>
                <th className="py-3 px-3 w-72">Deskripsi Capaian Kompetensi (Kurikulum Merdeka)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-8 text-center text-slate-400">
                    Tidak ada siswa ditemukan di kelas ini.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st, idx) => {
                  const draft = gradesDraft[st.id] || {};
                  const na = draft.nilaiAkhir ?? 0;
                  const isTuntas = na >= currentKktp;
                  const hasFilled = na > 0;

                  return (
                    <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                        {st.nisn}
                        <div className="text-[10px] text-slate-400">NIS: {st.nis}</div>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {st.namaLengkap}
                        <span className="text-[10px] ml-1 font-normal text-slate-400">({st.jenisKelamin})</span>
                      </td>

                      {/* TP 1 */}
                      <td className="py-2 px-1 text-center bg-blue-50/20">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={draft.tp1 ?? ''}
                          onChange={(e) => handleScoreChange(st.id, 'tp1', e.target.value)}
                          placeholder="-"
                          className="w-16 h-8 text-center font-bold bg-white border border-slate-200 rounded-lg text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </td>

                      {/* TP 2 */}
                      <td className="py-2 px-1 text-center bg-blue-50/20">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={draft.tp2 ?? ''}
                          onChange={(e) => handleScoreChange(st.id, 'tp2', e.target.value)}
                          placeholder="-"
                          className="w-16 h-8 text-center font-bold bg-white border border-slate-200 rounded-lg text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </td>

                      {/* STS */}
                      <td className="py-2 px-1 text-center bg-slate-50">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={draft.sumatifTengahSemester ?? ''}
                          onChange={(e) => handleScoreChange(st.id, 'sumatifTengahSemester', e.target.value)}
                          placeholder="-"
                          className="w-14 h-8 text-center font-semibold bg-white border border-slate-200 rounded-lg text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </td>

                      {/* SAS */}
                      <td className="py-2 px-1 text-center bg-slate-50">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={draft.sumatifAkhirSemester ?? ''}
                          onChange={(e) => handleScoreChange(st.id, 'sumatifAkhirSemester', e.target.value)}
                          placeholder="-"
                          className="w-14 h-8 text-center font-semibold bg-white border border-slate-200 rounded-lg text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </td>

                      {/* Tugas */}
                      <td className="py-2 px-1 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={draft.nilaiTugas ?? ''}
                          onChange={(e) => handleScoreChange(st.id, 'nilaiTugas', e.target.value)}
                          placeholder="-"
                          className="w-14 h-8 text-center font-semibold bg-white border border-slate-200 rounded-lg text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </td>

                      {/* Nilai Akhir (NA) */}
                      <td className="py-2 px-2 text-center bg-blue-50/50">
                        <span className={`inline-block px-2.5 py-1 rounded font-black text-xs ${
                          !hasFilled
                            ? 'text-slate-400'
                            : isTuntas
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-rose-100 text-rose-700'
                        }`}>
                          {na}
                        </span>
                      </td>

                      {/* KKTP Kolom */}
                      <td className="py-2 px-1 text-center bg-indigo-50/30">
                        <span className="font-extrabold text-xs text-indigo-900">
                          {currentKktp}
                        </span>
                      </td>

                      {/* Status Ketuntasan KKTP */}
                      <td className="py-2 px-1 text-center">
                        {!hasFilled ? (
                          <span className="text-[10px] text-slate-400">-</span>
                        ) : isTuntas ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <Check className="w-3 h-3" /> TUNTAS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            <AlertTriangle className="w-3 h-3" /> BELUM
                          </span>
                        )}
                      </td>

                      {/* Predikat */}
                      <td className="py-2 px-1 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          draft.predikat === 'A' ? 'bg-emerald-100 text-emerald-800' :
                          draft.predikat === 'B' ? 'bg-blue-100 text-blue-800' :
                          draft.predikat === 'C' ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {draft.predikat || 'D'}
                        </span>
                      </td>

                      {/* Capaian Kompetensi Narrative */}
                      <td className="py-2 px-3 space-y-1">
                        <input
                          type="text"
                          placeholder="Capaian tertinggi..."
                          value={draft.capaianTertinggi || ''}
                          onChange={(e) => handleNarrativeChange(st.id, 'capaianTertinggi', e.target.value)}
                          className="w-full px-2 py-1 text-[11px] bg-emerald-50/40 border border-emerald-200 rounded text-slate-800 placeholder-slate-400 focus:bg-white"
                          title="Capaian Tertinggi"
                        />
                        <input
                          type="text"
                          placeholder="Capaian yang perlu bimbingan..."
                          value={draft.capaianTerendah || ''}
                          onChange={(e) => handleNarrativeChange(st.id, 'capaianTerendah', e.target.value)}
                          className="w-full px-2 py-1 text-[11px] bg-amber-50/40 border border-amber-200 rounded text-slate-800 placeholder-slate-400 focus:bg-white"
                          title="Capaian Perlu Bimbingan"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info & Save Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Total Siswa: <strong className="text-slate-800">{filteredStudents.length}</strong> | 
            Target KKTP: <strong className="text-blue-700">{currentKktp}</strong> | 
            Status Tuntas: <strong className="text-emerald-700">{ketuntasanStats.tuntas}</strong> ({ketuntasanStats.percent}%)
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveAll}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all active:scale-95 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Seluruh Nilai Kelas</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
