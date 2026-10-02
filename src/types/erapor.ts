export type UserRole = 'admin' | 'guru' | 'wali_kelas';

export interface User {
  id: string;
  username: string;
  namaLengkap: string;
  nip?: string;
  role: UserRole;
  mapelIds?: string[]; // Mata pelajaran yang diampu
  kelasId?: string; // Jika wali kelas
  email?: string;
  passwordHash?: string;
}

export interface SekolahConfig {
  namaSekolah: string;
  npsn: string;
  nss?: string;
  alamat: string;
  desaKelurahan: string;
  kecamatan: string;
  kotaKabupaten: string;
  provinsi: string;
  kodePos: string;
  telepon: string;
  email: string;
  website: string;
  kepalaSekolah: string;
  nipKepalaSekolah: string;
  tahunAjaran: string; // e.g. "2024/2025"
  semester: 'Ganjil' | 'Genap';
  tempatTanggalRapor: string; // e.g. "Jakarta, 20 Desember 2024"
  kurikulum: 'Kurikulum Merdeka' | 'Kurikulum 2013';
  logoSekolah?: string; // base64 or URL
  logoPemda?: string; // base64 or URL
}

export interface Kelas {
  id: string;
  tingkat: number; // 7, 8, 9, 10, 11, 12
  nama: string; // e.g. "VII-A"
  waliKelasId: string;
  tahunAjaran: string;
}

export interface Siswa {
  id: string;
  nisn: string;
  nis: string;
  namaLengkap: string;
  jenisKelamin: 'L' | 'P';
  kelasId: string;
  tempatLahir: string;
  tanggalLahir: string;
  agama: string;
  namaAyah: string;
  namaIbu: string;
  pekerjaanOrangTua: string;
  alamat: string;
}

export interface MataPelajaran {
  id: string;
  kode: string;
  nama: string;
  kategori: 'Umum' | 'Muatan Lokal' | 'Pilihan';
  kktp: number; // Kriteria Ketercapaian Tujuan Pembelajaran (e.g. 75)
  guruId: string;
}

export interface TujuanPembelajaran {
  id: string;
  mapelId: string;
  kode: string; // TP1, TP2, TP3
  deskripsi: string;
  materiPokok: string;
}

export interface NilaiSiswa {
  id: string;
  siswaId: string;
  mapelId: string;
  semester: 'Ganjil' | 'Genap';
  tahunAjaran: string;
  // Nilai Formatif (Tujuan Pembelajaran)
  tp1?: number;
  tp2?: number;
  tp3?: number;
  tp4?: number;
  // Nilai Sumatif
  sumatifTengahSemester?: number; // STS
  sumatifAkhirSemester?: number; // SAS / PAS
  nilaiTugas?: number;
  nilaiAkhir: number;
  predikat: 'A' | 'B' | 'C' | 'D';
  capaianTertinggi?: string;
  capaianTerendah?: string;
}

export interface EkstrakurikulerNilai {
  id: string;
  siswaId: string;
  namaKegiatan: string;
  predikat: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Kurang';
  keterangan: string;
}

export interface PresensiSiswa {
  id: string;
  siswaId: string;
  semester: 'Ganjil' | 'Genap';
  sakit: number;
  izin: number;
  alpa: number;
  catatanWaliKelas?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
}
