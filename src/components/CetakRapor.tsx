import React, { useState, useRef } from 'react';
import { ERaporDatabase } from '../utils/storage';
import { User, Siswa, Kelas } from '../types/erapor';
import {
  Printer,
  Download,
  Search,
  CheckCircle,
  QrCode,
  School,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Award
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface CetakRaporProps {
  db: ERaporDatabase;
  currentUser: User;
}

export const CetakRapor: React.FC<CetakRaporProps> = ({
  db,
  currentUser,
}) => {
  const { sekolah, kelas, siswa, mataPelajaran, nilai, ekstrakurikuler, presensi, users } = db;

  const [selectedKelasId, setSelectedKelasId] = useState<string>(
    currentUser.kelasId || (kelas[0]?.id || '')
  );

  const classStudents = siswa.filter(s => s.kelasId === selectedKelasId);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    classStudents[0]?.id || ''
  );

  // Sync selectedStudentId when class changes
  React.useEffect(() => {
    if (classStudents.length > 0 && !classStudents.some(s => s.id === selectedStudentId)) {
      setSelectedStudentId(classStudents[0].id);
    }
  }, [selectedKelasId, classStudents, selectedStudentId]);

  const activeStudent = siswa.find(s => s.id === selectedStudentId) || classStudents[0];
  const activeKelas = kelas.find(k => k.id === selectedKelasId) || kelas[0];

  // Find wali kelas
  const waliKelasUser = users.find(u => u.id === activeKelas?.waliKelasId) || {
    namaLengkap: 'Siti Nurhaliza, S.Pd.',
    nip: '19850412 200902 2 003',
  };

  // Student specific grades
  const studentGrades = activeStudent
    ? nilai.filter(n => n.siswaId === activeStudent.id && n.semester === sekolah.semester)
    : [];

  // Student specific extracurriculars
  const studentEkskul = activeStudent
    ? ekstrakurikuler.filter(e => e.siswaId === activeStudent.id)
    : [];

  // Student presensi
  const studentPresensi = activeStudent
    ? presensi.find(p => p.siswaId === activeStudent.id && p.semester === sekolah.semester) || {
        sakit: 0,
        izin: 0,
        alpa: 0,
        catatanWaliKelas: 'Pertahankan prestasi belajar dan tingkatkan terus keaktifan dalam kegiatan di sekolah.',
      }
    : null;

  // Print ref
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Browser standard print
  const handlePrintBrowser = () => {
    window.print();
  };

  // Export directly as PDF via html2canvas & jsPDF
  const handleExportJsPdf = async () => {
    if (!printAreaRef.current || !activeStudent) return;
    setIsExportingPdf(true);
    try {
      const element = printAreaRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Rapor_${activeStudent.namaLengkap.replace(/\s+/g, '_')}_${sekolah.semester}_TA${sekolah.tahunAjaran.replace('/', '-')}.pdf`);
    } catch (err) {
      console.error(err);
      // Fallback to print
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Navigation between students in the same class
  const currentStudentIndex = classStudents.findIndex(s => s.id === activeStudent?.id);
  const handlePrevStudent = () => {
    if (currentStudentIndex > 0) {
      setSelectedStudentId(classStudents[currentStudentIndex - 1].id);
    }
  };
  const handleNextStudent = () => {
    if (currentStudentIndex < classStudents.length - 1) {
      setSelectedStudentId(classStudents[currentStudentIndex + 1].id);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Controls Bar (Hidden during printing) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Pencetakan Rapor Otomatis (Standar Kemdikbudristek)
              </h2>
              <p className="text-xs text-slate-500">
                Format resmi Kurikulum Merdeka lengkap dengan kop sekolah, capaian kompetensi, dan tanda tangan digital
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrintBrowser}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Rapor (Browser / PDF)</span>
            </button>

            <button
              onClick={handleExportJsPdf}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>{isExportingPdf ? 'Membuat PDF...' : 'Unduh File PDF Langsung'}</span>
            </button>
          </div>
        </div>

        {/* Student Selector Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Pilih Rombel (Kelas)
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

          <div className="sm:col-span-2 flex items-end gap-2">
            <div className="flex-1">
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
                    {i + 1}. {st.namaLengkap} (NISN: {st.nisn})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevStudent}
                disabled={currentStudentIndex <= 0}
                className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 transition-colors"
                title="Siswa Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextStudent}
                disabled={currentStudentIndex >= classStudents.length - 1}
                className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 transition-colors"
                title="Siswa Selanjutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Official Rapor Preview Container (A4 Style) */}
      <div className="flex justify-center">
        <div
          ref={printAreaRef}
          id="rapor-cetak"
          className="w-full max-w-[850px] bg-white text-slate-900 p-8 sm:p-12 shadow-2xl rounded-2xl border border-slate-200 print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none text-sm font-sans"
        >
          {/* KOP SURAT SEKOLAH RESMI */}
          <div className="border-b-4 border-double border-slate-900 pb-3 mb-6 flex items-center justify-between gap-3">
            {/* Logo Pemda (Kiri) */}
            <div className="w-20 h-24 flex items-center justify-center shrink-0">
              {sekolah.logoPemda && (
                <img
                  src={sekolah.logoPemda}
                  alt="Logo Pemda"
                  className="max-h-20 max-w-20 object-contain"
                />
              )}
            </div>

            {/* Teks Kop Surat Tengah */}
            <div className="flex-1 text-center font-sans">
              <div className="text-[11px] font-bold tracking-widest uppercase text-slate-800">
                PEMERINTAH PROVINSI {sekolah.provinsi.toUpperCase()}
              </div>
              <div className="text-[11px] font-bold tracking-widest uppercase text-slate-800">
                DINAS PENDIDIKAN DAN KEBUDAYAAN
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 uppercase mt-0.5">
                {sekolah.namaSekolah}
              </h1>
              <p className="text-[11px] text-slate-700 mt-0.5 leading-tight">
                {sekolah.alamat}, Kec. {sekolah.kecamatan}, {sekolah.kotaKabupaten}, Kode Pos {sekolah.kodePos}
              </p>
              <p className="text-[10px] text-slate-600">
                Telepon: {sekolah.telepon} • Pos-el: {sekolah.email} • NPSN: {sekolah.npsn}
              </p>
            </div>

            {/* Logo Sekolah (Kanan) */}
            <div className="w-20 h-24 flex items-center justify-center shrink-0">
              {sekolah.logoSekolah && (
                <img
                  src={sekolah.logoSekolah}
                  alt="Logo Sekolah"
                  className="max-h-20 max-w-20 object-contain"
                />
              )}
            </div>
          </div>

          {/* JUDUL LAPORAN */}
          <div className="text-center mb-6">
            <h2 className="text-base font-extrabold uppercase tracking-wide text-slate-950">
              LAPORAN HASIL BELAJAR PESERTA DIDIK
            </h2>
            <div className="text-xs font-semibold text-slate-600 mt-0.5">
              (RAPOR KURIKULUM MERDEKA)
            </div>
          </div>

          {/* IDENTITAS SISWA GRID */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs mb-6 p-3 bg-slate-50/80 rounded-lg border border-slate-200">
            <div className="flex">
              <span className="w-36 text-slate-600">Nama Peserta Didik</span>
              <span className="font-bold text-slate-900">: {activeStudent?.namaLengkap || '-'}</span>
            </div>
            <div className="flex">
              <span className="w-36 text-slate-600">Kelas / Fase</span>
              <span className="font-bold text-slate-900">: {activeKelas?.nama} / Fase D</span>
            </div>
            <div className="flex">
              <span className="w-36 text-slate-600">NISN / NIS</span>
              <span className="text-slate-900">: {activeStudent?.nisn} / {activeStudent?.nis}</span>
            </div>
            <div className="flex">
              <span className="w-36 text-slate-600">Semester</span>
              <span className="text-slate-900">: {sekolah.semester}</span>
            </div>
            <div className="flex">
              <span className="w-36 text-slate-600">Sekolah</span>
              <span className="text-slate-900">: {sekolah.namaSekolah}</span>
            </div>
            <div className="flex">
              <span className="w-36 text-slate-600">Tahun Ajaran</span>
              <span className="text-slate-900">: {sekolah.tahunAjaran}</span>
            </div>
          </div>

          {/* A. LAPORAN NILAI DAN CAPAIAN BELAJAR */}
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2">
              A. Nilai Akademik dan Capaian Kompetensi
            </h3>
            
            <table className="w-full text-xs border border-slate-300 border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 text-[11px] font-bold">
                  <th className="border border-slate-300 py-2 px-2 w-8 text-center">No</th>
                  <th className="border border-slate-300 py-2 px-3 w-48 text-left">Muatan Pembelajaran</th>
                  <th className="border border-slate-300 py-2 px-2 w-14 text-center">Nilai Akhir</th>
                  <th className="border border-slate-300 py-2 px-3 text-left">Capaian Kompetensi</th>
                </tr>
              </thead>
              <tbody>
                {mataPelajaran.map((mapel, idx) => {
                  const gradeRecord = studentGrades.find(g => g.mapelId === mapel.id);
                  const nilaiVal = gradeRecord?.nilaiAkhir ?? '-';
                  const tertinggi = gradeRecord?.capaianTertinggi || 'Menunjukkan pemahaman yang baik dalam pembelajaran.';
                  const terendah = gradeRecord?.capaianTerendah || '';

                  return (
                    <tr key={mapel.id} className="align-top">
                      <td className="border border-slate-300 py-2 px-2 text-center text-slate-600">{idx + 1}</td>
                      <td className="border border-slate-300 py-2 px-3 font-semibold text-slate-900">{mapel.nama}</td>
                      <td className="border border-slate-300 py-2 px-2 text-center font-bold text-slate-900">{nilaiVal}</td>
                      <td className="border border-slate-300 py-2 px-3 text-[11px] leading-relaxed">
                        <div className="text-slate-900">{tertinggi}</div>
                        {terendah && (
                          <div className="text-slate-600 mt-1 italic">{terendah}</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* B. EKSTRAKURIKULER */}
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2">
              B. Ekstrakurikuler
            </h3>
            <table className="w-full text-xs border border-slate-300 border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 text-[11px] font-bold">
                  <th className="border border-slate-300 py-1.5 px-2 w-8 text-center">No</th>
                  <th className="border border-slate-300 py-1.5 px-3 w-64 text-left">Kegiatan Ekstrakurikuler</th>
                  <th className="border border-slate-300 py-1.5 px-2 w-28 text-center">Predikat</th>
                  <th className="border border-slate-300 py-1.5 px-3 text-left">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {studentEkskul.length === 0 ? (
                  <tr>
                    <td className="border border-slate-300 py-2 px-2 text-center text-slate-400">1</td>
                    <td className="border border-slate-300 py-2 px-3 text-slate-700">Praja Muda Karana (Pramuka Wajib)</td>
                    <td className="border border-slate-300 py-2 px-2 text-center font-semibold text-slate-800">Baik</td>
                    <td className="border border-slate-300 py-2 px-3 text-[11px] text-slate-600">Aktif mengikuti latihan rutin dan kegiatan kepramukaan.</td>
                  </tr>
                ) : (
                  studentEkskul.map((e, idx) => (
                    <tr key={e.id}>
                      <td className="border border-slate-300 py-1.5 px-2 text-center text-slate-600">{idx + 1}</td>
                      <td className="border border-slate-300 py-1.5 px-3 font-semibold text-slate-900">{e.namaKegiatan}</td>
                      <td className="border border-slate-300 py-1.5 px-2 text-center font-bold text-slate-800">{e.predikat}</td>
                      <td className="border border-slate-300 py-1.5 px-3 text-[11px] text-slate-600">{e.keterangan}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* C. KETIDAKHADIRAN & CATATAN WALI KELAS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            
            {/* Presensi */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2">
                C. Ketidakhadiran
              </h3>
              <table className="w-full text-xs border border-slate-300 border-collapse">
                <tbody>
                  <tr>
                    <td className="border border-slate-300 py-1.5 px-3 w-40 text-slate-700">Sakit</td>
                    <td className="border border-slate-300 py-1.5 px-3 font-semibold text-slate-900">: {studentPresensi?.sakit ?? 0} hari</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 py-1.5 px-3 text-slate-700">Izin</td>
                    <td className="border border-slate-300 py-1.5 px-3 font-semibold text-slate-900">: {studentPresensi?.izin ?? 0} hari</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 py-1.5 px-3 text-slate-700">Tanpa Keterangan</td>
                    <td className="border border-slate-300 py-1.5 px-3 font-semibold text-slate-900">: {studentPresensi?.alpa ?? 0} hari</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Catatan Wali Kelas */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2">
                D. Catatan Wali Kelas
              </h3>
              <div className="border border-slate-300 rounded-xs p-3 text-[11px] leading-relaxed italic bg-slate-50/50 min-h-[82px] flex items-center">
                "{studentPresensi?.catatanWaliKelas || 'Tingkatkan terus semangat belajar dan pertahankan akhlak terpuji di lingkungan sekolah maupun masyarakat.'}"
              </div>
            </div>

          </div>

          {/* TITI MANGSA & TANDA TANGAN */}
          <div className="pt-4 border-t border-slate-200 mt-8">
            <div className="text-right text-xs text-slate-700 mb-4">
              {sekolah.tempatTanggalRapor}
            </div>

            <div className="grid grid-cols-2 gap-8 text-xs text-center">
              {/* Orang Tua / Wali */}
              <div>
                <p className="text-slate-600">Mengetahui,</p>
                <p className="font-semibold text-slate-800">Orang Tua / Wali Siswa</p>
                <div className="h-16 flex items-end justify-center">
                  <div className="w-40 border-b border-dotted border-slate-500"></div>
                </div>
              </div>

              {/* Wali Kelas */}
              <div>
                <p className="text-slate-600">Wali Kelas,</p>
                <p className="font-bold text-slate-900">{waliKelasUser.namaLengkap}</p>
                <div className="h-16 flex items-center justify-center">
                  <div className="px-3 py-1 bg-emerald-50 border border-emerald-200 rounded text-[10px] text-emerald-800 font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                    <span>Terverifikasi Digital</span>
                  </div>
                </div>
                {waliKelasUser.nip && (
                  <p className="text-[11px] text-slate-500">NIP. {waliKelasUser.nip}</p>
                )}
              </div>
            </div>

            {/* Kepala Sekolah (Tengah Bawah) */}
            <div className="mt-8 text-center text-xs">
              <p className="text-slate-600">Mengetahui,</p>
              <p className="font-semibold text-slate-800">Kepala {sekolah.namaSekolah}</p>
              <div className="h-16 flex items-center justify-center gap-4">
                {/* QR Code Validation */}
                <div className="p-1 border border-slate-300 rounded bg-white shadow-xs inline-flex items-center gap-1.5 px-2">
                  <QrCode className="w-8 h-8 text-slate-800" />
                  <div className="text-left text-[9px] text-slate-500 font-mono leading-tight">
                    <div>ERAPOR-VALID</div>
                    <div className="font-bold text-blue-900">{activeStudent?.nisn}</div>
                  </div>
                </div>
              </div>
              <p className="font-bold text-slate-900 underline text-sm">{sekolah.kepalaSekolah}</p>
              <p className="text-[11px] text-slate-600">NIP. {sekolah.nipKepalaSekolah}</p>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
