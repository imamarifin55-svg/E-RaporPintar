import {
  SekolahConfig,
  User,
  Kelas,
  Siswa,
  MataPelajaran,
  TujuanPembelajaran,
  NilaiSiswa,
  EkstrakurikulerNilai,
  PresensiSiswa,
  AuditLog,
} from '../types/erapor';
import { encryptData, decryptData, EncryptedPackage } from './crypto';
import { DEFAULT_LOGO_PEMDA, DEFAULT_LOGO_SEKOLAH } from './logos';

export interface ERaporDatabase {
  sekolah: SekolahConfig;
  users: User[];
  kelas: Kelas[];
  siswa: Siswa[];
  mataPelajaran: MataPelajaran[];
  tujuanPembelajaran: TujuanPembelajaran[];
  nilai: NilaiSiswa[];
  ekstrakurikuler: EkstrakurikulerNilai[];
  presensi: PresensiSiswa[];
  auditLogs: AuditLog[];
}

const STORAGE_KEY = 'ERAPOR_MERDEKA_DATABASE_V1';

export const INITIAL_DATABASE: ERaporDatabase = {
  sekolah: {
    namaSekolah: 'SMP NEGERI 1 NUSANTARA',
    npsn: '20109876',
    nss: '201016001001',
    alamat: 'Jl. Merdeka Pendidikan No. 45, Kompleks Pendidikan',
    desaKelurahan: 'Menteng',
    kecamatan: 'Menteng',
    kotaKabupaten: 'Kota Jakarta Pusat',
    provinsi: 'DKI Jakarta',
    kodePos: '10310',
    telepon: '(021) 3928172',
    email: 'info@smpn1nusantara.sch.id',
    website: 'https://smpn1nusantara.sch.id',
    kepalaSekolah: 'Dr. H. Bambang Hartono, M.Pd.',
    nipKepalaSekolah: '19680315 199303 1 004',
    tahunAjaran: '2026/2027',
    semester: 'Ganjil',
    tempatTanggalRapor: 'Jakarta, 19 Desember 2026',
    kurikulum: 'Kurikulum Merdeka',
    logoPemda: DEFAULT_LOGO_PEMDA,
    logoSekolah: DEFAULT_LOGO_SEKOLAH,
  },
  users: [
    {
      id: 'usr-admin',
      username: 'admin',
      namaLengkap: 'Rudi Suhendra, S.Kom. (Admin)',
      role: 'admin',
      email: 'admin@smpn1nusantara.sch.id',
    },
    {
      id: 'usr-wali7a',
      username: 'wali_7a',
      namaLengkap: 'Siti Nurhaliza, S.Pd.',
      nip: '19850412 200902 2 003',
      role: 'wali_kelas',
      kelasId: 'kls-7a',
      mapelIds: ['mp-indo'],
      email: 'sitinurhaliza@guru.smp.belajar.id',
    },
    {
      id: 'usr-gurumtk',
      username: 'guru_mtk',
      namaLengkap: 'Drs. Supriyanto, M.Pd.',
      nip: '19740810 199903 1 002',
      role: 'guru',
      mapelIds: ['mp-mtk'],
      email: 'supriyanto@guru.smp.belajar.id',
    },
    {
      id: 'usr-guruipa',
      username: 'guru_ipa',
      namaLengkap: 'Arief Wicaksono, S.Si., M.Sc.',
      nip: '19890123 201504 1 001',
      role: 'guru',
      mapelIds: ['mp-ipa', 'mp-infor'],
      email: 'arief.wicaksono@guru.smp.belajar.id',
    },
  ],
  kelas: [
    { id: 'kls-7a', tingkat: 7, nama: 'VII-A', waliKelasId: 'usr-wali7a', tahunAjaran: '2026/2027' },
    { id: 'kls-7b', tingkat: 7, nama: 'VII-B', waliKelasId: 'usr-gurumtk', tahunAjaran: '2026/2027' },
    { id: 'kls-8a', tingkat: 8, nama: 'VIII-A', waliKelasId: 'usr-guruipa', tahunAjaran: '2026/2027' },
  ],
  mataPelajaran: [
    { id: 'mp-pai', kode: 'PAI', nama: 'Pendidikan Agama & Budi Pekerti', kategori: 'Umum', kktp: 75, guruId: 'usr-wali7a' },
    { id: 'mp-pancasila', kode: 'PP', nama: 'Pendidikan Pancasila', kategori: 'Umum', kktp: 75, guruId: 'usr-wali7a' },
    { id: 'mp-indo', kode: 'BIND', nama: 'Bahasa Indonesia', kategori: 'Umum', kktp: 75, guruId: 'usr-wali7a' },
    { id: 'mp-mtk', kode: 'MTK', nama: 'Matematika', kategori: 'Umum', kktp: 72, guruId: 'usr-gurumtk' },
    { id: 'mp-ipa', kode: 'IPA', nama: 'Ilmu Pengetahuan Alam (IPA)', kategori: 'Umum', kktp: 74, guruId: 'usr-guruipa' },
    { id: 'mp-ips', kode: 'IPS', nama: 'Ilmu Pengetahuan Sosial (IPS)', kategori: 'Umum', kktp: 75, guruId: 'usr-wali7a' },
    { id: 'mp-inggris', kode: 'BING', nama: 'Bahasa Inggris', kategori: 'Umum', kktp: 75, guruId: 'usr-gurumtk' },
    { id: 'mp-pjok', kode: 'PJOK', nama: 'PJOK', kategori: 'Umum', kktp: 75, guruId: 'usr-guruipa' },
    { id: 'mp-infor', kode: 'INF', nama: 'Informatika', kategori: 'Umum', kktp: 75, guruId: 'usr-guruipa' },
    { id: 'mp-seni', kode: 'SBD', nama: 'Seni Budaya & Prakarya', kategori: 'Umum', kktp: 75, guruId: 'usr-wali7a' },
  ],
  tujuanPembelajaran: [
    // Bahasa Indonesia
    { id: 'tp-bind-1', mapelId: 'mp-indo', kode: 'TP1', deskripsi: 'Menganalisis ide pokok dan informasi tersirat dalam teks deskripsi dan narasi', materiPokok: 'Teks Deskripsi & Narasi' },
    { id: 'tp-bind-2', mapelId: 'mp-indo', kode: 'TP2', deskripsi: 'Menulis teks puisi dan prosa dengan variasi diksi dan rima yang ekspresif', materiPokok: 'Puisi & Diksi' },
    { id: 'tp-bind-3', mapelId: 'mp-indo', kode: 'TP3', deskripsi: 'Menyajikan ulasan dan tanggapan kritis terhadap buku fiksi secara lisan dan tulisan', materiPokok: 'Ulasan Buku' },
    { id: 'tp-bind-4', mapelId: 'mp-indo', kode: 'TP4', deskripsi: 'Menyusun teks prosedur runtut dengan kaidah kebahasaan yang baku', materiPokok: 'Teks Prosedur' },
    // Matematika
    { id: 'tp-mtk-1', mapelId: 'mp-mtk', kode: 'TP1', deskripsi: 'Menyelesaikan operasi hitung bilangan bulat, pecahan, dan desimal dalam masalah kontekstual', materiPokok: 'Bilangan Rasional' },
    { id: 'tp-mtk-2', mapelId: 'mp-mtk', kode: 'TP2', deskripsi: 'Memodelkan dan menyelesaikan bentuk aljabar linear satu variabel dalam kehidupan nyata', materiPokok: 'Aljabar Linear' },
    { id: 'tp-mtk-3', mapelId: 'mp-mtk', kode: 'TP3', deskripsi: 'Menganalisis perbandingan senilai dan berbalik nilai dalam peta serta skala', materiPokok: 'Rasio & Proporsi' },
    { id: 'tp-mtk-4', mapelId: 'mp-mtk', kode: 'TP4', deskripsi: 'Mengolah dan menginterpretasikan data dalam diagram batang, lingkaran, dan garis', materiPokok: 'Statistika Dasar' },
    // IPA
    { id: 'tp-ipa-1', mapelId: 'mp-ipa', kode: 'TP1', deskripsi: 'Menerapkan metode ilmiah dan pengukuran besaran satuan standar di laboratorium', materiPokok: 'Metode Ilmiah & Alat Ukur' },
    { id: 'tp-ipa-2', mapelId: 'mp-ipa', kode: 'TP2', deskripsi: 'Menganalisis struktur sel dan organisasi kehidupan hewan serta tumbuhan', materiPokok: 'Sel & Mikroskopis' },
    { id: 'tp-ipa-3', mapelId: 'mp-ipa', kode: 'TP3', deskripsi: 'Mengidentifikasi wujud zat, sifat fisika-kimia, dan perubahan kalor zat', materiPokok: 'Zat & Perubahannya' },
    { id: 'tp-ipa-4', mapelId: 'mp-ipa', kode: 'TP4', deskripsi: 'Menganalisis interaksi komponen biotik-abiotik dalam dinamika ekosistem', materiPokok: 'Ekologi & Lingkungan' },
  ],
  siswa: [
    {
      id: 'sw-01',
      nisn: '0081234001',
      nis: '24701',
      namaLengkap: 'Aditya Pratama Nugraha',
      jenisKelamin: 'L',
      kelasId: 'kls-7a',
      tempatLahir: 'Jakarta',
      tanggalLahir: '2011-04-12',
      agama: 'Islam',
      namaAyah: 'H. Suryadi Nugraha',
      namaIbu: 'Endang Wahyuni',
      pekerjaanOrangTua: 'Wiraswasta',
      alamat: 'Jl. Teuku Umar No. 15, Menteng, Jakarta Pusat',
    },
    {
      id: 'sw-02',
      nisn: '0081234002',
      nis: '24702',
      namaLengkap: 'Almira Shafa Salsabila',
      jenisKelamin: 'P',
      kelasId: 'kls-7a',
      tempatLahir: 'Bandung',
      tanggalLahir: '2011-07-25',
      agama: 'Islam',
      namaAyah: 'Drs. Hendri Gunawan',
      namaIbu: 'Rina Marlina',
      pekerjaanOrangTua: 'PNS',
      alamat: 'Jl. Cikini Raya No. 40, Jakarta Pusat',
    },
    {
      id: 'sw-03',
      nisn: '0081234003',
      nis: '24703',
      namaLengkap: 'Bagas Dwi Santoso',
      jenisKelamin: 'L',
      kelasId: 'kls-7a',
      tempatLahir: 'Surabaya',
      tanggalLahir: '2011-02-18',
      agama: 'Islam',
      namaAyah: 'Santoso Budi',
      namaIbu: 'Sri Mulyani',
      pekerjaanOrangTua: 'Karyawan Swasta',
      alamat: 'Jl. Kramat Pulo No. 8, Senen, Jakarta Pusat',
    },
    {
      id: 'sw-04',
      nisn: '0081234004',
      nis: '24704',
      namaLengkap: 'Clarissa Maharani Wijaya',
      jenisKelamin: 'P',
      kelasId: 'kls-7a',
      tempatLahir: 'Jakarta',
      tanggalLahir: '2011-10-05',
      agama: 'Kristen',
      namaAyah: 'Daniel Wijaya',
      namaIbu: 'Grace Siregar',
      pekerjaanOrangTua: 'Arsitek',
      alamat: 'Jl. Sabang No. 22, Jakarta Pusat',
    },
    {
      id: 'sw-05',
      nisn: '0081234005',
      nis: '24705',
      namaLengkap: 'Farel Rizky Ramadhan',
      jenisKelamin: 'L',
      kelasId: 'kls-7a',
      tempatLahir: 'Semarang',
      tanggalLahir: '2011-08-30',
      agama: 'Islam',
      namaAyah: 'Rahmat Hidayat',
      namaIbu: 'Nur Aini',
      pekerjaanOrangTua: 'Pedagang',
      alamat: 'Jl. Percetakan Negara No. 14, Johar Baru',
    },
    {
      id: 'sw-06',
      nisn: '0081234006',
      nis: '24706',
      namaLengkap: 'Jessica Aurelia Tan',
      jenisKelamin: 'P',
      kelasId: 'kls-7a',
      tempatLahir: 'Jakarta',
      tanggalLahir: '2011-12-11',
      agama: 'Buddha',
      namaAyah: 'Winson Tan',
      namaIbu: 'Lily Suryani',
      pekerjaanOrangTua: 'Pengusaha',
      alamat: 'Jl. Salemba Tengah No. 5B',
    },
    {
      id: 'sw-07',
      nisn: '0081234007',
      nis: '24707',
      namaLengkap: 'Muhammad Haikal Akbar',
      jenisKelamin: 'L',
      kelasId: 'kls-7a',
      tempatLahir: 'Jakarta',
      tanggalLahir: '2011-06-03',
      agama: 'Islam',
      namaAyah: 'Ir. Akbar Kusuma',
      namaIbu: 'Fitri Handayani',
      pekerjaanOrangTua: 'BUMN',
      alamat: 'Jl. Diponegoro No. 89, Menteng',
    },
    {
      id: 'sw-08',
      nisn: '0081234008',
      nis: '24708',
      namaLengkap: 'Nayla Zahra Khairunnisa',
      jenisKelamin: 'P',
      kelasId: 'kls-7a',
      tempatLahir: 'Bogor',
      tanggalLahir: '2011-09-17',
      agama: 'Islam',
      namaAyah: 'Kurniawan Saleh',
      namaIbu: 'Zahra Anisah',
      pekerjaanOrangTua: 'Dosen',
      alamat: 'Jl. Pegangsaan Barat No. 12',
    },
  ],
  nilai: [
    // Siswa 1 (Aditya) - MTK
    {
      id: 'nil-01-mtk',
      siswaId: 'sw-01',
      mapelId: 'mp-mtk',
      semester: 'Ganjil',
      tahunAjaran: '2024/2025',
      tp1: 88,
      tp2: 85,
      tp3: 84,
      tp4: 86,
      sumatifTengahSemester: 85,
      sumatifAkhirSemester: 88,
      nilaiTugas: 90,
      nilaiAkhir: 86,
      predikat: 'B',
      capaianTertinggi: 'Menunjukkan pemahaman sangat baik dalam menyelesaikan operasi hitung bilangan rasional dan statistika data.',
      capaianTerendah: 'Perlu bimbingan lebih dalam pemodelan persamaan aljabar linear satu variabel.',
    },
    // Siswa 1 - B. Indonesia
    {
      id: 'nil-01-bind',
      siswaId: 'sw-01',
      mapelId: 'mp-indo',
      semester: 'Ganjil',
      tahunAjaran: '2024/2025',
      tp1: 92,
      tp2: 90,
      tp3: 89,
      tp4: 91,
      sumatifTengahSemester: 90,
      sumatifAkhirSemester: 92,
      nilaiTugas: 94,
      nilaiAkhir: 91,
      predikat: 'A',
      capaianTertinggi: 'Sangat terampil dalam menganalisis ide pokok teks narasi dan menyusun teks prosedur runtut.',
      capaianTerendah: 'Pertahankan kreativitas dalam penulisan apresiasi puisi.',
    },
    // Siswa 1 - IPA
    {
      id: 'nil-01-ipa',
      siswaId: 'sw-01',
      mapelId: 'mp-ipa',
      semester: 'Ganjil',
      tahunAjaran: '2024/2025',
      tp1: 86,
      tp2: 84,
      tp3: 85,
      tp4: 87,
      sumatifTengahSemester: 85,
      sumatifAkhirSemester: 86,
      nilaiTugas: 88,
      nilaiAkhir: 86,
      predikat: 'B',
      capaianTertinggi: 'Menunjukkan pemahaman yang baik tentang metode ilmiah dan interaksi ekosistem.',
      capaianTerendah: 'Perlu pendalaman materi organisasi sel hewan dan tumbuhan.',
    },

    // Siswa 2 (Almira) - MTK
    {
      id: 'nil-02-mtk',
      siswaId: 'sw-02',
      mapelId: 'mp-mtk',
      semester: 'Ganjil',
      tahunAjaran: '2024/2025',
      tp1: 94,
      tp2: 92,
      tp3: 95,
      tp4: 93,
      sumatifTengahSemester: 96,
      sumatifAkhirSemester: 94,
      nilaiTugas: 95,
      nilaiAkhir: 94,
      predikat: 'A',
      capaianTertinggi: 'Sangat istimewa dalam memodelkan bentuk aljabar dan rasio proporsi.',
      capaianTerendah: 'Pertahankan konsistensi ketelitian pada hitungan pecahan rumit.',
    },
    // Siswa 2 - B. Indonesia
    {
      id: 'nil-02-bind',
      siswaId: 'sw-02',
      mapelId: 'mp-indo',
      semester: 'Ganjil',
      tahunAjaran: '2024/2025',
      tp1: 95,
      tp2: 96,
      tp3: 93,
      tp4: 95,
      sumatifTengahSemester: 95,
      sumatifAkhirSemester: 96,
      nilaiTugas: 98,
      nilaiAkhir: 95,
      predikat: 'A',
      capaianTertinggi: 'Sangat unggul dalam menulis puisi ekspresif dan mengulas teks sastra secara analitis.',
      capaianTerendah: 'Pertahankan prestasi membanggakan ini.',
    },
    // Siswa 2 - IPA
    {
      id: 'nil-02-ipa',
      siswaId: 'sw-02',
      mapelId: 'mp-ipa',
      semester: 'Ganjil',
      tahunAjaran: '2024/2025',
      tp1: 92,
      tp2: 90,
      tp3: 94,
      tp4: 93,
      sumatifTengahSemester: 92,
      sumatifAkhirSemester: 94,
      nilaiTugas: 95,
      nilaiAkhir: 93,
      predikat: 'A',
      capaianTertinggi: 'Sangat menguasai konsep zat, kalor, dan pengamatan mikroskopis sel.',
      capaianTerendah: 'Tingkatkan peran kepemimpinan dalam kerja kelompok praktikum.',
    },

    // Siswa 3 (Bagas) - MTK
    {
      id: 'nil-03-mtk',
      siswaId: 'sw-03',
      mapelId: 'mp-mtk',
      semester: 'Ganjil',
      tahunAjaran: '2024/2025',
      tp1: 76,
      tp2: 74,
      tp3: 75,
      tp4: 78,
      sumatifTengahSemester: 75,
      sumatifAkhirSemester: 76,
      nilaiTugas: 80,
      nilaiAkhir: 76,
      predikat: 'C',
      capaianTertinggi: 'Mampu menyajikan dan membaca data dalam diagram statistika secara baik.',
      capaianTerendah: 'Perlu latihan intensif pada operasi persamaan aljabar linear satu variabel.',
    },
    // Siswa 3 - B. Indo
    {
      id: 'nil-03-bind',
      siswaId: 'sw-03',
      mapelId: 'mp-indo',
      semester: 'Ganjil',
      tahunAjaran: '2024/2025',
      tp1: 82,
      tp2: 80,
      tp3: 84,
      tp4: 83,
      sumatifTengahSemester: 82,
      sumatifAkhirSemester: 84,
      nilaiTugas: 85,
      nilaiAkhir: 83,
      predikat: 'B',
      capaianTertinggi: 'Mampu menyampaikan ulasan buku dan memahami teks deskripsi dengan runtut.',
      capaianTerendah: 'Perlu memperkaya kosakata puitis dalam penulisan puisi bebas.',
    },
    // Siswa 3 - IPA
    {
      id: 'nil-03-ipa',
      siswaId: 'sw-03',
      mapelId: 'mp-ipa',
      semester: 'Ganjil',
      tahunAjaran: '2024/2025',
      tp1: 78,
      tp2: 76,
      tp3: 79,
      tp4: 80,
      sumatifTengahSemester: 78,
      sumatifAkhirSemester: 78,
      nilaiTugas: 82,
      nilaiAkhir: 78,
      predikat: 'C',
      capaianTertinggi: 'Memahami interaksi ekosistem lingkungan sekitar.',
      capaianTerendah: 'Perlu bimbingan dalam konversi satuan besaran fisika.',
    },

    // Siswa 4 (Clarissa) - MTK
    {
      id: 'nil-04-mtk',
      siswaId: 'sw-04',
      mapelId: 'mp-mtk',
      semester: 'Ganjil',
      tahunAjaran: '2024/2025',
      tp1: 90,
      tp2: 88,
      tp3: 89,
      tp4: 92,
      sumatifTengahSemester: 90,
      sumatifAkhirSemester: 90,
      nilaiTugas: 92,
      nilaiAkhir: 90,
      predikat: 'A',
      capaianTertinggi: 'Sangat baik dalam pengolahan data statistik dan perbandingan rasio.',
      capaianTerendah: 'Tingkatkan ketelitian langkah penyelesaian aljabar.',
    },
    // Siswa 4 - B. Indo
    {
      id: 'nil-04-bind',
      siswaId: 'sw-04',
      mapelId: 'mp-indo',
      semester: 'Ganjil',
      tahunAjaran: '2024/2025',
      tp1: 88,
      tp2: 90,
      tp3: 89,
      tp4: 89,
      sumatifTengahSemester: 88,
      sumatifAkhirSemester: 90,
      nilaiTugas: 92,
      nilaiAkhir: 89,
      predikat: 'B',
      capaianTertinggi: 'Kreatif dalam penulisan karya sastra dan resensi buku cerita.',
      capaianTerendah: 'Perhatikan ketepatan tanda baca dan ejaan bahasa Indonesia.',
    },
    // Siswa 4 - IPA
    {
      id: 'nil-04-ipa',
      siswaId: 'sw-04',
      mapelId: 'mp-ipa',
      semester: 'Ganjil',
      tahunAjaran: '2024/2025',
      tp1: 88,
      tp2: 87,
      tp3: 89,
      tp4: 90,
      sumatifTengahSemester: 88,
      sumatifAkhirSemester: 89,
      nilaiTugas: 91,
      nilaiAkhir: 89,
      predikat: 'B',
      capaianTertinggi: 'Aktif dan cermat dalam pengamatan laboratorium IPA serta wujud materi.',
      capaianTerendah: 'Tingkatkan penalaran grafis pada perubahan termal.',
    },
  ],
  ekstrakurikuler: [
    { id: 'ek-01', siswaId: 'sw-01', namaKegiatan: 'Praja Muda Karana (Pramuka)', predikat: 'Sangat Baik', keterangan: 'Aktif sebagai pemimpin regu dan disiplin dalam baris berbaris.' },
    { id: 'ek-02', siswaId: 'sw-01', namaKegiatan: 'Futsal', predikat: 'Baik', keterangan: 'Menunjukkan sportivitas dan kerjasama tim yang solid.' },
    { id: 'ek-03', siswaId: 'sw-02', namaKegiatan: 'Palang Merah Remaja (PMR)', predikat: 'Sangat Baik', keterangan: 'Tanggap dan cakap dalam pertolongan pertama serta kegiatan kemanusiaan.' },
    { id: 'ek-04', siswaId: 'sw-02', namaKegiatan: 'English Club', predikat: 'Sangat Baik', keterangan: 'Mampu berpidato dan aktif dalam simulasi debat bahasa Inggris.' },
    { id: 'ek-05', siswaId: 'sw-03', namaKegiatan: 'Praja Muda Karana (Pramuka)', predikat: 'Baik', keterangan: 'Mengikuti setiap perkemahan dan latihan rutin dengan antusias.' },
    { id: 'ek-06', siswaId: 'sw-04', namaKegiatan: 'Paduan Suara (Vocal Group)', predikat: 'Sangat Baik', keterangan: 'Memiliki musikalitas tinggi dan tampil prima pada upacara bendera.' },
  ],
  presensi: [
    {
      id: 'pr-01',
      siswaId: 'sw-01',
      semester: 'Ganjil',
      sakit: 1,
      izin: 0,
      alpa: 0,
      catatanWaliKelas: 'Ananda Aditya memiliki motivasi belajar yang tinggi, sikap santun, dan kepemimpinan yang menonjol. Terus pertahankan prestasimu!',
    },
    {
      id: 'pr-02',
      siswaId: 'sw-02',
      semester: 'Ganjil',
      sakit: 0,
      izin: 1,
      alpa: 0,
      catatanWaliKelas: 'Almira adalah siswi teladan dengan pencapaian akademik dan kepribadian yang luar biasa. Sangat membanggakan!',
    },
    {
      id: 'pr-03',
      siswaId: 'sw-03',
      semester: 'Ganjil',
      sakit: 2,
      izin: 1,
      alpa: 0,
      catatanWaliKelas: 'Bagas anak yang ramah dan aktif di kelas. Tingkatkan lagi fokus pada materi eksakta Matematika dan disiplin mengumpulkan tugas.',
    },
    {
      id: 'pr-04',
      siswaId: 'sw-04',
      semester: 'Ganjil',
      sakit: 0,
      izin: 0,
      alpa: 0,
      catatanWaliKelas: 'Clarissa siswi mandiri, kritis, dan berjiwa seni tinggi. Pertahankan konsistensi belajar di semester berikutnya.',
    },
  ],
  auditLogs: [
    {
      id: 'log-01',
      timestamp: '2024-12-15 08:30:12',
      userId: 'usr-admin',
      userName: 'Rudi Suhendra, S.Kom.',
      action: 'Inisialisasi Sistem',
      details: 'Pengaturan semester Ganjil TA 2024/2025 dan pembagian rombel VII-A telah diverifikasi.',
    },
    {
      id: 'log-02',
      timestamp: '2024-12-18 10:14:05',
      userId: 'usr-wali7a',
      userName: 'Siti Nurhaliza, S.Pd.',
      action: 'Finalisasi Nilai Bahasa Indonesia',
      details: 'Input nilai sumatif dan deskripsi capaian kompetensi 8 siswa VII-A berhasil disimpan.',
    },
    {
      id: 'log-03',
      timestamp: '2024-12-19 14:22:40',
      userId: 'usr-gurumtk',
      userName: 'Drs. Supriyanto, M.Pd.',
      action: 'Impor Nilai Excel',
      details: 'Impor nilai Matematika semester ganjil kelas VII-A melalui template Excel berhasil diproses.',
    },
  ],
};

/**
 * Load Database from local storage or initialize with default seed data
 */
export function loadDatabase(): ERaporDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveDatabase(INITIAL_DATABASE);
      return INITIAL_DATABASE;
    }
    const parsed = JSON.parse(raw);
    const targetTA = '2026/2027';
    const targetTanggalRapor = 'Jakarta, 19 Desember 2026';

    const sekolahMerged = {
      ...INITIAL_DATABASE.sekolah,
      ...parsed.sekolah,
      tahunAjaran: targetTA,
      tempatTanggalRapor: parsed.sekolah?.tahunAjaran === '2024/2025' ? targetTanggalRapor : (parsed.sekolah?.tempatTanggalRapor || targetTanggalRapor),
      logoPemda: parsed.sekolah?.logoPemda || DEFAULT_LOGO_PEMDA,
      logoSekolah: parsed.sekolah?.logoSekolah || DEFAULT_LOGO_SEKOLAH,
    };

    const kelasMigrated = (parsed.kelas || INITIAL_DATABASE.kelas).map((k: Kelas) => ({
      ...k,
      tahunAjaran: targetTA,
    }));

    const nilaiMigrated = (parsed.nilai || INITIAL_DATABASE.nilai).map((n: NilaiSiswa) => ({
      ...n,
      tahunAjaran: targetTA,
    }));

    const migratedDb: ERaporDatabase = {
      ...INITIAL_DATABASE,
      ...parsed,
      sekolah: sekolahMerged,
      kelas: kelasMigrated,
      nilai: nilaiMigrated,
    };

    // Save migrated version
    if (parsed.sekolah?.tahunAjaran !== targetTA) {
      saveDatabase(migratedDb);
    }

    return migratedDb;
  } catch (err) {
    console.error('Failed to parse local database, resetting to default', err);
    saveDatabase(INITIAL_DATABASE);
    return INITIAL_DATABASE;
  }
}

/**
 * Save Database to local storage
 */
export function saveDatabase(data: ERaporDatabase): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save database to localStorage', err);
  }
}

/**
 * Reset database to factory default
 */
export function resetToDefaultDatabase(): ERaporDatabase {
  saveDatabase(INITIAL_DATABASE);
  return INITIAL_DATABASE;
}

/**
 * Ekspor Database Terenkripsi (.erapor-enc)
 */
export async function exportEncryptedBackup(db: ERaporDatabase, pass: string): Promise<void> {
  const encrypted = await encryptData(db, pass);
  const blob = new Blob([JSON.stringify(encrypted, null, 2)], { type: 'application/json' });
  const filename = `ERapor_Backup_${db.sekolah.namaSekolah.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.erapor-enc`;
  
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
 * Impor & Pulihkan Database dari File Terenkripsi
 */
export async function importEncryptedBackup(file: File, pass: string): Promise<ERaporDatabase> {
  const text = await file.text();
  const pkg: EncryptedPackage = JSON.parse(text);
  const decrypted = await decryptData<ERaporDatabase>(pkg, pass);
  
  // Basic schema validation
  if (!decrypted.sekolah || !decrypted.siswa || !decrypted.users) {
    throw new Error('Format file cadangan tidak sesuai standar e-Rapor');
  }

  saveDatabase(decrypted);
  return decrypted;
}

/**
 * Append an audit log
 */
export function addAuditLog(db: ERaporDatabase, action: string, details: string, currentUser?: User): ERaporDatabase {
  const newLog: AuditLog = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    userId: currentUser?.id || 'sys',
    userName: currentUser?.namaLengkap || 'Sistem',
    action,
    details,
  };
  const updated = {
    ...db,
    auditLogs: [newLog, ...(db.auditLogs || [])].slice(0, 50), // keep latest 50
  };
  saveDatabase(updated);
  return updated;
}
