import React, { useState, useRef } from 'react';
import { ERaporDatabase, addAuditLog, saveDatabase } from '../utils/storage';
import { User, NilaiSiswa } from '../types/erapor';
import { unduhTemplateNilaiExcel, parseExcelNilai, ParsedNilaiRow } from '../utils/excel';
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Check,
  FileCheck
} from 'lucide-react';

interface ImporNilaiExcelProps {
  db: ERaporDatabase;
  currentUser: User;
  initialMapelId?: string;
  initialKelasId?: string;
  onUpdateDatabase: (newDb: ERaporDatabase) => void;
  onDone: () => void;
}

export const ImporNilaiExcel: React.FC<ImporNilaiExcelProps> = ({
  db,
  currentUser,
  initialMapelId,
  initialKelasId,
  onUpdateDatabase,
  onDone,
}) => {
  const { kelas, mataPelajaran, siswa, tujuanPembelajaran, sekolah, nilai } = db;

  const [selectedKelasId, setSelectedKelasId] = useState<string>(
    initialKelasId || currentUser.kelasId || (kelas[0]?.id || '')
  );

  const [selectedMapelId, setSelectedMapelId] = useState<string>(
    initialMapelId || (currentUser.mapelIds && currentUser.mapelIds[0]) || (mataPelajaran[0]?.id || '')
  );

  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedNilaiRow[]>([]);
  const [totalValid, setTotalValid] = useState(0);
  const [totalErrors, setTotalErrors] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeKelas = kelas.find(k => k.id === selectedKelasId) || kelas[0];
  const activeMapel = mataPelajaran.find(m => m.id === selectedMapelId) || mataPelajaran[0];
  const classStudents = siswa.filter(s => s.kelasId === selectedKelasId);
  const activeTps = tujuanPembelajaran.filter(tp => tp.mapelId === activeMapel?.id);

  // Download template
  const handleDownloadTemplate = () => {
    if (!activeKelas || !activeMapel) return;
    unduhTemplateNilaiExcel(activeKelas, activeMapel, classStudents, activeTps);
  };

  // Process File
  const processFile = async (file: File) => {
    setIsLoading(true);
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const result = await parseExcelNilai(buffer, classStudents, activeMapel?.kktp || 75);
      setParsedRows(result.rows);
      setTotalValid(result.totalValid);
      setTotalErrors(result.totalErrors);
    } catch (err) {
      console.error(err);
      alert('Gagal membaca file Excel. Pastikan file berformat .xlsx atau .xls yang valid.');
    } finally {
      setIsLoading(false);
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Save parsed data to database
  const handleApplyToDatabase = () => {
    if (parsedRows.length === 0) return;

    const studentMap = new Map(classStudents.map(s => [s.nisn, s]));
    let newNilaiList = [...nilai];
    let insertedCount = 0;

    parsedRows.forEach(row => {
      if (!row.isValid) return;
      const st = studentMap.get(row.nisn);
      if (!st) return;

      const existingIndex = newNilaiList.findIndex(
        n => n.siswaId === st.id && n.mapelId === selectedMapelId && n.semester === sekolah.semester
      );

      // Auto generate Merdeka Narrative
      const tp1Desc = activeTps[0]?.deskripsi || 'penguasaan konsep dasar';
      const tp2Desc = activeTps[1]?.deskripsi || 'penerapan prosedural';
      
      const capaianTertinggi = row.nilaiAkhir >= 85
        ? `Menunjukkan penguasaan sangat baik dalam ${tp1Desc}.`
        : `Menunjukkan pemahaman yang cukup baik dalam tujuan pembelajaran.`;

      const capaianTerendah = row.nilaiAkhir < (activeMapel?.kktp || 75)
        ? `Perlu pendampingan dan perbaikan dalam ${tp2Desc}.`
        : `Pertahankan capaian belajar yang sudah konsisten.`;

      const record: NilaiSiswa = {
        id: `nil-${st.id}-${selectedMapelId}-${Date.now()}`,
        siswaId: st.id,
        mapelId: selectedMapelId,
        semester: sekolah.semester,
        tahunAjaran: sekolah.tahunAjaran,
        tp1: row.tp1,
        tp2: row.tp2,
        tp3: row.tp3,
        tp4: row.tp4,
        sumatifTengahSemester: row.sts,
        sumatifAkhirSemester: row.sas,
        nilaiTugas: row.tugas,
        nilaiAkhir: row.nilaiAkhir,
        predikat: row.predikat,
        capaianTertinggi,
        capaianTerendah,
      };

      if (existingIndex >= 0) {
        newNilaiList[existingIndex] = record;
      } else {
        newNilaiList.push(record);
      }
      insertedCount++;
    });

    let updatedDb: ERaporDatabase = {
      ...db,
      nilai: newNilaiList,
    };

    updatedDb = addAuditLog(
      updatedDb,
      'Impor Excel Massal',
      `Impor ${insertedCount} nilai mapel ${activeMapel?.nama} untuk kelas ${activeKelas?.nama} melalui file ${fileName || 'Excel'}.`,
      currentUser
    );

    saveDatabase(updatedDb);
    onUpdateDatabase(updatedDb);

    setSuccessMessage(`Berhasil mengimpor ${insertedCount} nilai siswa ke dalam basis data terenkripsi!`);
    setTimeout(() => {
      onDone();
    }, 2000);
  };

  // Demo auto-fill file for quick testing
  const handleLoadDemoValues = () => {
    const kktpVal = activeMapel?.kktp || 75;
    const demoRows: ParsedNilaiRow[] = classStudents.map((st, i) => {
      const tp1 = 80 + ((i * 3) % 18);
      const tp2 = 78 + ((i * 4) % 20);
      const sts = 84 + ((i * 3) % 14);
      const sas = 86 + ((i * 2) % 13);
      const avgTp = (tp1 + tp2) / 2;
      const na = Math.round((avgTp * 0.4) + (sts * 0.3) + (sas * 0.3));
      let predikat: 'A' | 'B' | 'C' | 'D' = 'B';
      if (na >= 90) predikat = 'A';
      else if (na >= 80) predikat = 'B';
      else if (na >= kktpVal) predikat = 'C';
      else predikat = 'D';

      return {
        nisn: st.nisn,
        namaSiswa: st.namaLengkap,
        kktp: kktpVal,
        tp1,
        tp2,
        sts,
        sas,
        tugas: 88,
        nilaiAkhir: na,
        predikat,
        isTuntas: na >= kktpVal,
        isValid: true,
        errors: [],
      };
    });

    setFileName('Simulasi_Nilai_Otomatis_2TP.xlsx');
    setParsedRows(demoRows);
    setTotalValid(demoRows.length);
    setTotalErrors(0);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Impor Data Nilai Siswa Massal (Excel)
              </h2>
              <p className="text-xs text-slate-500">
                Proses cepat entri nilai satu kelas sekaligus dengan file Microsoft Excel (.xlsx / .xls)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadDemoValues}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl border border-blue-200 transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Muat Nilai Simulasi</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Pilih Rombongan Belajar (Kelas)
            </label>
            <select
              value={selectedKelasId}
              onChange={(e) => {
                setSelectedKelasId(e.target.value);
                setParsedRows([]);
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
              Pilih Mata Pelajaran
            </label>
            <select
              value={selectedMapelId}
              onChange={(e) => {
                setSelectedMapelId(e.target.value);
                setParsedRows([]);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
            >
              {mataPelajaran.map(m => (
                <option key={m.id} value={m.id}>{m.nama} (KKTP: {m.kktp})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3 Step Wizard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Step 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center mb-3">
              1
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1">
              Unduh Format Template
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Format Excel sudah dilengkapi dengan daftar nama dan NISN seluruh siswa di kelas {activeKelas?.nama}.
            </p>
          </div>

          <button
            onClick={handleDownloadTemplate}
            className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Unduh Template (.xlsx)</span>
          </button>
        </div>

        {/* Step 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between md:col-span-2">
          <div>
            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center mb-3">
              2
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1">
              Unggah File Nilai yang Telah Diisi
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Tarik & lepaskan file Excel atau klik tombol jelajahi di bawah ini
            </p>
          </div>

          {/* Dropzone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-emerald-500 bg-emerald-50/50'
                : 'border-slate-200 hover:border-emerald-400 bg-slate-50/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  processFile(e.target.files[0]);
                }
              }}
            />
            <Upload className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <div className="text-xs font-bold text-slate-800">
              {fileName ? fileName : 'Pilih file Excel dari komputer Anda'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Mendukung file .xlsx dan .xls (Maksimal 10MB)
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-lg flex items-center justify-between animate-in zoom-in-95">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 shrink-0" />
            <div>
              <div className="font-bold text-sm">Impor Berhasil!</div>
              <div className="text-xs text-emerald-100">{successMessage}</div>
            </div>
          </div>
          <button
            onClick={onDone}
            className="px-3 py-1.5 bg-white text-emerald-800 font-bold text-xs rounded-xl hover:bg-emerald-50 transition-colors"
          >
            Kembali ke Halaman Nilai
          </button>
        </div>
      )}

      {/* Step 3: Preview and Validation Table */}
      {parsedRows.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-blue-600" />
                <span>Hasil Validasi & Peninjauan Data ({parsedRows.length} Siswa)</span>
              </h3>
              <div className="flex items-center gap-3 mt-1 text-xs">
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {totalValid} Data Valid
                </span>
                {totalErrors > 0 && (
                  <span className="text-rose-700 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {totalErrors} Data Bermasalah
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={handleApplyToDatabase}
              disabled={totalValid === 0}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all ${
                totalValid > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Terapkan {totalValid} Nilai ke Database</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/70 text-slate-700 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">NISN</th>
                  <th className="py-2.5 px-3">Nama Siswa</th>
                  <th className="py-2.5 px-2 text-center">TP 1</th>
                  <th className="py-2.5 px-2 text-center">TP 2</th>
                  <th className="py-2.5 px-2 text-center">STS</th>
                  <th className="py-2.5 px-2 text-center">SAS</th>
                  <th className="py-2.5 px-2 text-center font-bold text-blue-900 bg-blue-50">Nilai Akhir</th>
                  <th className="py-2.5 px-2 text-center bg-indigo-50/50">KKTP</th>
                  <th className="py-2.5 px-2 text-center">Ketuntasan</th>
                  <th className="py-2.5 px-2 text-center">Predikat</th>
                  <th className="py-2.5 px-3">Keterangan / Catatan Validasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parsedRows.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`transition-colors ${
                      row.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/40 hover:bg-rose-50/60'
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      {row.isValid ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          <Check className="w-3 h-3" /> Valid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                          <AlertCircle className="w-3 h-3" /> Error
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px]">{row.nisn}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{row.namaSiswa}</td>
                    <td className="py-2.5 px-2 text-center font-semibold">{row.tp1 ?? '-'}</td>
                    <td className="py-2.5 px-2 text-center font-semibold">{row.tp2 ?? '-'}</td>
                    <td className="py-2.5 px-2 text-center">{row.sts ?? '-'}</td>
                    <td className="py-2.5 px-2 text-center">{row.sas ?? '-'}</td>
                    <td className="py-2.5 px-2 text-center font-bold text-blue-900 bg-blue-50/50">
                      {row.nilaiAkhir}
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-slate-700 bg-indigo-50/30">
                      {row.kktp}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className={`px-2 py-0.5 font-bold rounded-full text-[10px] ${
                        row.isTuntas
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {row.isTuntas ? 'TUNTAS' : 'BELUM TUNTAS'}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className="px-1.5 py-0.5 font-bold rounded text-[10px] bg-slate-100">
                        {row.predikat}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {row.errors.length > 0 ? (
                        <span className="text-rose-600 font-medium">{row.errors.join(', ')}</span>
                      ) : (
                        <span className="text-emerald-700">Data siap diimpor</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
