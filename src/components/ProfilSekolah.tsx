import React, { useState, useRef } from 'react';
import { ERaporDatabase, addAuditLog, saveDatabase } from '../utils/storage';
import { User, SekolahConfig } from '../types/erapor';
import { DEFAULT_LOGO_PEMDA, DEFAULT_LOGO_SEKOLAH } from '../utils/logos';
import { 
  Building2, 
  Save, 
  CheckCircle2, 
  Upload, 
  RotateCcw, 
  Image as ImageIcon,
  Eye,
  FileCheck
} from 'lucide-react';

interface ProfilSekolahProps {
  db: ERaporDatabase;
  currentUser: User;
  onUpdateDatabase: (newDb: ERaporDatabase) => void;
}

export const ProfilSekolah: React.FC<ProfilSekolahProps> = ({
  db,
  currentUser,
  onUpdateDatabase,
}) => {
  const [formData, setFormData] = useState<SekolahConfig>({
    ...db.sekolah,
    logoPemda: db.sekolah.logoPemda || DEFAULT_LOGO_PEMDA,
    logoSekolah: db.sekolah.logoSekolah || DEFAULT_LOGO_SEKOLAH,
  });

  const [savedMsg, setSavedMsg] = useState(false);
  const filePemdaRef = useRef<HTMLInputElement>(null);
  const fileSekolahRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: keyof SekolahConfig, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle Logo Pemda upload
  const handleUploadPemda = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran file logo maksimal 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setFormData(prev => ({ ...prev, logoPemda: result }));
    };
    reader.readAsDataURL(file);
  };

  // Handle Logo Sekolah upload
  const handleUploadSekolah = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran file logo maksimal 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setFormData(prev => ({ ...prev, logoSekolah: result }));
    };
    reader.readAsDataURL(file);
  };

  // Reset Logos to default
  const handleResetPemda = () => {
    setFormData(prev => ({ ...prev, logoPemda: DEFAULT_LOGO_PEMDA }));
  };

  const handleResetSekolah = () => {
    setFormData(prev => ({ ...prev, logoSekolah: DEFAULT_LOGO_SEKOLAH }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let updatedDb: ERaporDatabase = {
      ...db,
      sekolah: formData,
    };

    updatedDb = addAuditLog(
      updatedDb,
      'Perbarui Profil Sekolah & Logo',
      `Memperbarui identitas ${formData.namaSekolah}, logo pemda/sekolah, semester ${formData.semester}, TA ${formData.tahunAjaran}.`,
      currentUser
    );

    saveDatabase(updatedDb);
    onUpdateDatabase(updatedDb);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 4000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Profil Sekolah, Logo & Pengaturan Semester
            </h2>
            <p className="text-xs text-slate-500">
              Identitas resmi institusi, logo Pemda & logo Sekolah untuk Kop Rapor, data kepala sekolah, dan periode akademik berjalan
            </p>
          </div>
        </div>
      </div>

      {savedMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Profil sekolah, logo pemda, dan logo sekolah berhasil disimpan!</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* SECTION LOGO PEMDA & LOGO SEKOLAH */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-700">
                1. Upload Logo Pemerintah Daerah & Logo Sekolah (Kop Surat Rapor)
              </h3>
              <p className="text-xs text-slate-500">
                Logo ini akan otomatis dicetak pada Kop Surat Resmi lembar Rapor dan dokumen kelulusan
              </p>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
              <FileCheck className="w-3.5 h-3.5" />
              <span>Format PNG / JPG / SVG / WebP</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            
            {/* Card 1: Logo Pemerintah Daerah */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900">
                    Logo Pemerintah Daerah (Kiri Kop)
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Provinsi / Pemkab / Pemkot
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-24 h-28 bg-white border-2 border-slate-200 rounded-xl p-2 flex items-center justify-center shadow-xs overflow-hidden shrink-0">
                    {formData.logoPemda ? (
                      <img
                        src={formData.logoPemda}
                        alt="Logo Pemda"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-300" />
                    )}
                  </div>

                  <div className="space-y-2 text-xs">
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Digunakan pada sisi kiri atas Kop Surat Rapor resmi dinas pendidikan.
                    </p>
                    
                    <input
                      ref={filePemdaRef}
                      type="file"
                      accept="image/*"
                      onChange={handleUploadPemda}
                      className="hidden"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => filePemdaRef.current?.click()}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Pilih File Logo</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleResetPemda}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs rounded-lg flex items-center gap-1 transition-colors"
                        title="Kembali ke logo standar"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Default</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Logo Sekolah / Satuan Pendidikan */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900">
                    Logo Satuan Pendidikan (Kanan Kop)
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Emblem / Lambang Sekolah
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-24 h-28 bg-white border-2 border-slate-200 rounded-xl p-2 flex items-center justify-center shadow-xs overflow-hidden shrink-0">
                    {formData.logoSekolah ? (
                      <img
                        src={formData.logoSekolah}
                        alt="Logo Sekolah"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-300" />
                    )}
                  </div>

                  <div className="space-y-2 text-xs">
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Digunakan pada sisi kanan atas Kop Surat Rapor dan ikon identitas satuan pendidikan.
                    </p>

                    <input
                      ref={fileSekolahRef}
                      type="file"
                      accept="image/*"
                      onChange={handleUploadSekolah}
                      className="hidden"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileSekolahRef.current?.click()}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Pilih File Logo</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleResetSekolah}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs rounded-lg flex items-center gap-1 transition-colors"
                        title="Kembali ke logo standar"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Default</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Live Kop Surat Preview Bar */}
          <div className="mt-4 p-4 bg-white rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-3">
              <Eye className="w-4 h-4 text-blue-600" />
              <span>Pratinjau Langsung Tampilan Kop Surat Rapor:</span>
            </div>

            <div className="border border-slate-300 p-4 rounded-lg bg-slate-50/50 flex items-center justify-between gap-4">
              {/* Logo Pemda */}
              <div className="w-16 h-18 flex items-center justify-center shrink-0">
                {formData.logoPemda && (
                  <img src={formData.logoPemda} alt="Pemda" className="max-h-16 max-w-16 object-contain" />
                )}
              </div>

              {/* Text Center */}
              <div className="flex-1 text-center font-sans space-y-0.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  PEMERINTAH PROVINSI {formData.provinsi.toUpperCase()}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  DINAS PENDIDIKAN DAN KEBUDAYAAN
                </div>
                <div className="text-sm font-extrabold text-slate-900 uppercase">
                  {formData.namaSekolah}
                </div>
                <div className="text-[9px] text-slate-600 leading-tight">
                  {formData.alamat}, Kec. {formData.kecamatan}, {formData.kotaKabupaten}
                </div>
                <div className="text-[9px] text-slate-500">
                  NPSN: {formData.npsn} • Telepon: {formData.telepon} • Email: {formData.email}
                </div>
              </div>

              {/* Logo Sekolah */}
              <div className="w-16 h-18 flex items-center justify-center shrink-0">
                {formData.logoSekolah && (
                  <img src={formData.logoSekolah} alt="Sekolah" className="max-h-16 max-w-16 object-contain" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Periode Akademik */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-blue-700">
            2. Periode Akademik & Kurikulum
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tahun Ajaran</label>
              <input
                type="text"
                value={formData.tahunAjaran}
                onChange={(e) => handleChange('tahunAjaran', e.target.value)}
                placeholder="2024/2025"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Semester</label>
              <select
                value={formData.semester}
                onChange={(e) => handleChange('semester', e.target.value as 'Ganjil' | 'Genap')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              >
                <option value="Ganjil">Semester Ganjil</option>
                <option value="Genap">Semester Genap</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kurikulum Berjalan</label>
              <select
                value={formData.kurikulum}
                onChange={(e) => handleChange('kurikulum', e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              >
                <option value="Kurikulum Merdeka">Kurikulum Merdeka</option>
                <option value="Kurikulum 2013">Kurikulum 2013</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Identitas Sekolah & KOP */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-blue-700">
            3. Identitas Satuan Pendidikan & Alamat Kop
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Satuan Pendidikan*</label>
              <input
                type="text"
                value={formData.namaSekolah}
                onChange={(e) => handleChange('namaSekolah', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">NPSN</label>
              <input
                type="text"
                value={formData.npsn}
                onChange={(e) => handleChange('npsn', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                required
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat Lengkap</label>
              <input
                type="text"
                value={formData.alamat}
                onChange={(e) => handleChange('alamat', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kecamatan</label>
              <input
                type="text"
                value={formData.kecamatan}
                onChange={(e) => handleChange('kecamatan', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kota / Kabupaten</label>
              <input
                type="text"
                value={formData.kotaKabupaten}
                onChange={(e) => handleChange('kotaKabupaten', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Provinsi</label>
              <input
                type="text"
                value={formData.provinsi}
                onChange={(e) => handleChange('provinsi', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor Telepon</label>
              <input
                type="text"
                value={formData.telepon}
                onChange={(e) => handleChange('telepon', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Resmi</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Pos</label>
              <input
                type="text"
                value={formData.kodePos}
                onChange={(e) => handleChange('kodePos', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Kepala Sekolah & Titimangsa Rapor */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-blue-700">
            4. Penandatanganan Rapor & Kepala Sekolah
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Kepala Sekolah & Gelar*</label>
              <input
                type="text"
                value={formData.kepalaSekolah}
                onChange={(e) => handleChange('kepalaSekolah', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">NIP Kepala Sekolah*</label>
              <input
                type="text"
                value={formData.nipKepalaSekolah}
                onChange={(e) => handleChange('nipKepalaSekolah', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Titi Mangsa Rapor (Tempat, Tanggal)
              </label>
              <input
                type="text"
                value={formData.tempatTanggalRapor}
                onChange={(e) => handleChange('tempatTanggalRapor', e.target.value)}
                placeholder="Jakarta, 20 Desember 2024"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                required
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-blue-600/20 active:scale-95 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Seluruh Pengaturan & Logo</span>
          </button>
        </div>

      </form>
    </div>
  );
};
