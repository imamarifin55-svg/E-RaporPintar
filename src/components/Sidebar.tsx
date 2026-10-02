import React from 'react';
import { UserRole } from '../types/erapor';
import {
  LayoutDashboard,
  Users,
  Award,
  FileSpreadsheet,
  Printer,
  TableProperties,
  Sparkles,
  Shield,
  Building2,
  BookOpen,
  HeartHandshake,
  Layers,
  ClipboardCheck
} from 'lucide-react';

export type NavTab = 
  | 'dashboard'
  | 'status_pengisian'
  | 'siswa'
  | 'rombel'
  | 'input_nilai'
  | 'impor_excel'
  | 'leger'
  | 'cetak_rapor'
  | 'ekskul_presensi'
  | 'mata_pelajaran'
  | 'kelola_pengguna'
  | 'sekolah'
  | 'keamanan';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  role: UserRole;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  role,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard Ringkasan',
      icon: LayoutDashboard,
      roles: ['admin', 'wali_kelas', 'guru'],
    },
    {
      id: 'status_pengisian' as NavTab,
      label: 'Status Pengisian Guru',
      icon: ClipboardCheck,
      roles: ['admin', 'wali_kelas'],
      badge: 'Live',
    },
    {
      id: 'input_nilai' as NavTab,
      label: 'Input & Manajemen Nilai',
      icon: Award,
      roles: ['admin', 'wali_kelas', 'guru'],
      badge: 'Utama',
    },
    {
      id: 'impor_excel' as NavTab,
      label: 'Impor Nilai Excel',
      icon: FileSpreadsheet,
      roles: ['admin', 'wali_kelas', 'guru'],
      badge: 'Cepat',
    },
    {
      id: 'leger' as NavTab,
      label: 'Buku Leger Nilai',
      icon: TableProperties,
      roles: ['admin', 'wali_kelas'],
    },
    {
      id: 'cetak_rapor' as NavTab,
      label: 'Cetak Rapor Otomatis',
      icon: Printer,
      roles: ['admin', 'wali_kelas'],
      badge: 'PDF A4',
    },
    {
      id: 'ekskul_presensi' as NavTab,
      label: 'Ekskul & Presensi',
      icon: HeartHandshake,
      roles: ['admin', 'wali_kelas'],
    },
    {
      id: 'siswa' as NavTab,
      label: 'Data Siswa',
      icon: Users,
      roles: ['admin', 'wali_kelas'],
    },
    {
      id: 'rombel' as NavTab,
      label: 'Rombel (Kelas)',
      icon: Layers,
      roles: ['admin', 'wali_kelas'],
      badge: 'Tambah Rombel',
    },
    {
      id: 'mata_pelajaran' as NavTab,
      label: 'Mata Pelajaran & TP',
      icon: BookOpen,
      roles: ['admin', 'wali_kelas'],
      badge: 'Tambah',
    },
    {
      id: 'kelola_pengguna' as NavTab,
      label: 'Data Guru & Akses',
      icon: Shield,
      roles: ['admin'],
      badge: 'Tambah Guru',
    },
    {
      id: 'sekolah' as NavTab,
      label: 'Profil Sekolah & Logo',
      icon: Building2,
      roles: ['admin'],
      badge: 'Upload Logo',
    },
    {
      id: 'keamanan' as NavTab,
      label: 'Keamanan & Cadangan',
      icon: Sparkles,
      roles: ['admin', 'wali_kelas', 'guru'],
    },
  ];

  const filteredItems = navItems.filter(item => item.roles.includes(role));

  const content = (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800">
      <div className="p-4 border-b border-slate-800">
        <div className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">
          Menu Navigasi
        </div>
        <div className="text-sm font-semibold text-slate-200">
          Sistem Penilaian e-Rapor
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {filteredItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectTab(item.id);
                if (onCloseMobile) onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                  isActive ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Role Notice at footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-xs text-slate-500">
        <div className="flex items-center gap-2 text-slate-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Sesi Aktif Terenkripsi</span>
        </div>
        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
          Semua perubahan nilai otomatis dikalkulasi dan disimpan dengan checksum SHA-256.
        </p>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-64 shrink-0 print:hidden min-h-[calc(100vh-4rem)]">
        {content}
      </div>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={onCloseMobile} />
          <div className="relative z-10 w-72 max-w-[80vw]">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
