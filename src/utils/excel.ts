import * as XLSX from 'xlsx';
import { Siswa, MataPelajaran, NilaiSiswa, Kelas, PresensiSiswa } from '../types/erapor';

// Helper to download Blob
function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 1. DOWNLOAD TEMPLATE INPUT NILAI SISWA PER MAPEL & KELAS
 * Berisi daftar siswa yang sudah terdaftar di kelas tsb, guru tinggal mengisi nilai angka.
 */
export function unduhTemplateNilaiExcel(
  kelas: Kelas,
  mapel: MataPelajaran,
  siswaList: Siswa[],
  tpList: { kode: string; deskripsi: string }[]
) {
  const data = siswaList.map((siswa, idx) => ({
    No: idx + 1,
    NISN: siswa.nisn,
    NIS: siswa.nis,
    'Nama Siswa': siswa.namaLengkap,
    'Jenis Kelamin': siswa.jenisKelamin,
    'KKTP': mapel.kktp,
    'TP 1 (Formatif)': '',
    'TP 2 (Formatif)': '',
    'STS (Sumatif Tengah)': '',
    'SAS (Sumatif Akhir)': '',
    'Tugas/Portofolio': '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 5 },  // No
    { wch: 14 }, // NISN
    { wch: 10 }, // NIS
    { wch: 30 }, // Nama Siswa
    { wch: 14 }, // JK
    { wch: 8 },  // KKTP
    { wch: 18 }, // TP1
    { wch: 18 }, // TP2
    { wch: 20 }, // STS
    { wch: 20 }, // SAS
    { wch: 16 }, // Tugas
  ];

  // Informasi 2 TP sebagai sheet panduan
  const tpSheetData = [
    { 'Mata Pelajaran': mapel.nama, 'Kode': mapel.kode, 'Kelas': kelas.nama, 'KKTP': mapel.kktp },
    {},
    { 'Kode TP': 'TP 1', 'Capaian / Tujuan Pembelajaran': tpList[0]?.deskripsi || 'Pemahaman Konsep dan Teori Dasar' },
    { 'Kode TP': 'TP 2', 'Capaian / Tujuan Pembelajaran': tpList[1]?.deskripsi || 'Penerapan Praktik dan Pemecahan Masalah' },
  ];
  const tpWorksheet = XLSX.utils.json_to_sheet(tpSheetData);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Input Nilai');
  XLSX.utils.book_append_sheet(workbook, tpWorksheet, 'Panduan TP');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadFile(blob, `Template_Nilai_${mapel.nama.replace(/\s+/g, '_')}_Kelas_${kelas.nama}.xlsx`);
}

/**
 * 2. PARSE EXCEL INPUT NILAI YANG DIUNGGAH OLEH GURU
 */
export interface ParsedNilaiRow {
  nisn: string;
  namaSiswa: string;
  kktp: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  tp4?: number;
  sts?: number;
  sas?: number;
  tugas?: number;
  nilaiAkhir: number;
  predikat: 'A' | 'B' | 'C' | 'D';
  isTuntas: boolean;
  isValid: boolean;
  errors: string[];
}

export function parseExcelNilai(
  fileBuffer: ArrayBuffer,
  siswaList: Siswa[],
  kktp = 75
): Promise<{ rows: ParsedNilaiRow[]; totalValid: number; totalErrors: number }> {
  return new Promise((resolve, reject) => {
    try {
      const workbook = XLSX.read(fileBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

      const parsedRows: ParsedNilaiRow[] = [];
      let totalValid = 0;
      let totalErrors = 0;

      const siswaNisnMap = new Map(siswaList.map(s => [String(s.nisn).trim(), s]));

      rawData.forEach((row, index) => {
        const errors: string[] = [];
        
        // Find NISN
        const nisnVal = String(row['NISN'] || row['nisn'] || '').trim();
        const namaVal = String(row['Nama Siswa'] || row['Nama'] || row['namaSiswa'] || `Baris ${index + 1}`).trim();

        if (!nisnVal) {
          errors.push('NISN kosong');
        } else if (!siswaNisnMap.has(nisnVal)) {
          errors.push(`NISN ${nisnVal} tidak ditemukan di kelas ini`);
        }

        const parseNum = (val: unknown): number | undefined => {
          if (val === undefined || val === null || val === '') return undefined;
          const num = Number(val);
          if (isNaN(num)) return undefined;
          if (num < 0 || num > 100) {
            errors.push(`Nilai ${num} di luar rentang valid (0 - 100)`);
            return undefined;
          }
          return num;
        };

        const tp1 = parseNum(row['TP 1 (Formatif)'] ?? row['TP 1'] ?? row['TP1']);
        const tp2 = parseNum(row['TP 2 (Formatif)'] ?? row['TP 2'] ?? row['TP2']);
        const sts = parseNum(row['STS (Sumatif Tengah)'] ?? row['STS'] ?? row['sts']);
        const sas = parseNum(row['SAS (Sumatif Akhir)'] ?? row['SAS'] ?? row['sas']);
        const tugas = parseNum(row['Tugas/Portofolio'] ?? row['Tugas'] ?? row['tugas']);

        // Calculate Nilai Akhir
        // Sederhana: 2 TP (Formatif 40%), STS 30%, SAS 30%
        const tpValues = [tp1, tp2].filter((v): v is number => v !== undefined);
        const avgTp = tpValues.length > 0 ? tpValues.reduce((a, b) => a + b, 0) / tpValues.length : (sts ?? sas ?? 0);
        
        const effectiveSts = sts ?? avgTp;
        const effectiveSas = sas ?? avgTp;

        const nilaiAkhir = Math.round((avgTp * 0.4) + (effectiveSts * 0.3) + (effectiveSas * 0.3));

        let predikat: 'A' | 'B' | 'C' | 'D' = 'D';
        if (nilaiAkhir >= 90) predikat = 'A';
        else if (nilaiAkhir >= 80) predikat = 'B';
        else if (nilaiAkhir >= kktp) predikat = 'C';
        else predikat = 'D';

        const isTuntas = nilaiAkhir >= kktp;
        const isValid = errors.length === 0;
        if (isValid) totalValid++;
        else totalErrors++;

        parsedRows.push({
          nisn: nisnVal,
          namaSiswa: namaVal,
          kktp,
          tp1,
          tp2,
          sts,
          sas,
          tugas,
          nilaiAkhir,
          predikat,
          isTuntas,
          isValid,
          errors,
        });
      });

      resolve({ rows: parsedRows, totalValid, totalErrors });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * 3. EKSPOR BUKU LEGER NILAI LENGKAP KE EXCEL
 */
export function eksporLegerExcel(
  kelas: Kelas,
  siswaList: Siswa[],
  mapelList: MataPelajaran[],
  nilaiList: NilaiSiswa[],
  presensiList: PresensiSiswa[],
  tahunAjaran: string,
  semester: string
) {
  // Build map of nilai by siswaId and mapelId
  const nilaiMap = new Map<string, number>();
  nilaiList.forEach(n => {
    nilaiMap.set(`${n.siswaId}_${n.mapelId}`, n.nilaiAkhir);
  });

  const presensiMap = new Map<string, PresensiSiswa>();
  presensiList.forEach(p => {
    presensiMap.set(p.siswaId, p);
  });

  // Calculate student totals and rankings
  const studentStats = siswaList.map(siswa => {
    let totalNilai = 0;
    let count = 0;
    mapelList.forEach(m => {
      const val = nilaiMap.get(`${siswa.id}_${m.id}`);
      if (val !== undefined) {
        totalNilai += val;
        count++;
      }
    });
    const rataRata = count > 0 ? Number((totalNilai / count).toFixed(2)) : 0;
    return { siswaId: siswa.id, totalNilai, rataRata };
  });

  // Sort descending by rataRata to assign rank
  const sortedStats = [...studentStats].sort((a, b) => b.rataRata - a.rataRata);
  const rankMap = new Map<string, number>();
  sortedStats.forEach((s, idx) => {
    rankMap.set(s.siswaId, idx + 1);
  });

  // Construct table rows
  const rows = siswaList.map((siswa, idx) => {
    const rowObj: Record<string, unknown> = {
      No: idx + 1,
      NISN: siswa.nisn,
      NIS: siswa.nis,
      'Nama Siswa': siswa.namaLengkap,
      JK: siswa.jenisKelamin,
    };

    mapelList.forEach(m => {
      const val = nilaiMap.get(`${siswa.id}_${m.id}`);
      rowObj[m.nama] = val !== undefined ? val : '-';
    });

    const stat = studentStats.find(s => s.siswaId === siswa.id);
    rowObj['Total Nilai'] = stat?.totalNilai || 0;
    rowObj['Rata-Rata'] = stat?.rataRata || 0;
    rowObj['Peringkat'] = rankMap.get(siswa.id) || '-';

    const presensi = presensiMap.get(siswa.id);
    rowObj['Sakit (S)'] = presensi?.sakit ?? 0;
    rowObj['Izin (I)'] = presensi?.izin ?? 0;
    rowObj['Alpa (A)'] = presensi?.alpa ?? 0;

    return rowObj;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set widths
  worksheet['!cols'] = [
    { wch: 5 },  // No
    { wch: 14 }, // NISN
    { wch: 10 }, // NIS
    { wch: 28 }, // Nama Siswa
    { wch: 6 },  // JK
    ...mapelList.map(() => ({ wch: 14 })), // Each mapel
    { wch: 12 }, // Total
    { wch: 12 }, // Rata-rata
    { wch: 10 }, // Rank
    { wch: 10 }, // S
    { wch: 10 }, // I
    { wch: 10 }, // A
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Leger Kelas ${kelas.nama}`);

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadFile(blob, `Buku_Leger_Nilai_Kelas_${kelas.nama}_${semester}_${tahunAjaran.replace('/', '-')}.xlsx`);
}

/**
 * 4. DOWNLOAD TEMPLATE SISWA (UNTUK IMPOR DATA SISWA MASSAL)
 */
export function unduhTemplateSiswaExcel() {
  const sampleData = [
    {
      NISN: '0081234561',
      NIS: '24001',
      'Nama Lengkap': 'Ahmad Fauzi Rahman',
      'Jenis Kelamin (L/P)': 'L',
      'Tempat Lahir': 'Jakarta',
      'Tanggal Lahir (YYYY-MM-DD)': '2011-05-14',
      Agama: 'Islam',
      'Nama Ayah': 'Bambang Sudiro',
      'Nama Ibu': 'Siti Rahmawati',
      'Pekerjaan Orang Tua': 'Wiraswasta',
      Alamat: 'Jl. Merdeka No. 12 RT 03/05',
    },
    {
      NISN: '0081234562',
      NIS: '24002',
      'Nama Lengkap': 'Annisa Putri Cahyani',
      'Jenis Kelamin (L/P)': 'P',
      'Tempat Lahir': 'Bandung',
      'Tanggal Lahir (YYYY-MM-DD)': '2011-08-22',
      Agama: 'Islam',
      'Nama Ayah': 'Hendra Wijaya',
      'Nama Ibu': 'Dewi Lestari',
      'Pekerjaan Orang Tua': 'PNS',
      Alamat: 'Jl. Melati No. 8',
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  worksheet['!cols'] = [
    { wch: 14 },
    { wch: 10 },
    { wch: 28 },
    { wch: 20 },
    { wch: 16 },
    { wch: 24 },
    { wch: 12 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 35 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Format Import Siswa');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadFile(blob, 'Template_Import_Data_Siswa.xlsx');
}

/**
 * 5. PARSE EXCEL DATA SISWA MASSAL
 */
export function parseExcelSiswa(fileBuffer: ArrayBuffer, targetKelasId: string): Promise<Siswa[]> {
  return new Promise((resolve, reject) => {
    try {
      const workbook = XLSX.read(fileBuffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet);

      const parsed: Siswa[] = raw.map((row, i) => {
        const jkRaw = String(row['Jenis Kelamin (L/P)'] || row['JK'] || 'L').toUpperCase();
        const jk: 'L' | 'P' = jkRaw.includes('P') ? 'P' : 'L';
        return {
          id: `siswa-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
          nisn: String(row['NISN'] || `00${Date.now()}${i}`).padStart(10, '0'),
          nis: String(row['NIS'] || `24${i + 10}`).padStart(5, '0'),
          namaLengkap: String(row['Nama Lengkap'] || row['Nama'] || `Siswa ${i + 1}`),
          jenisKelamin: jk,
          kelasId: targetKelasId,
          tempatLahir: String(row['Tempat Lahir'] || 'Jakarta'),
          tanggalLahir: String(row['Tanggal Lahir (YYYY-MM-DD)'] || '2011-01-01'),
          agama: String(row['Agama'] || 'Islam'),
          namaAyah: String(row['Nama Ayah'] || '-'),
          namaIbu: String(row['Nama Ibu'] || '-'),
          pekerjaanOrangTua: String(row['Pekerjaan Orang Tua'] || '-'),
          alamat: String(row['Alamat'] || 'Indonesia'),
        };
      });

      resolve(parsed);
    } catch (e) {
      reject(e);
    }
  });
}
