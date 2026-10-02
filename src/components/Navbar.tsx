import React from 'react';
import { User, SekolahConfig } from '../types/erapor';
import { 
  GraduationCap, 
  ShieldCheck, 
  UserCheck, 
  LogOut, 
  Sparkles, 
  School,
  ChevronDown,
  Cloud,
  CloudOff,
  RefreshCw,
  Radio
} from 'lucide-react';
import { CloudStatus } from '../utils/cloudSync';

interface NavbarProps {
  currentUser: User;
  sekolah: SekolahConfig;
  allUsers: User[];
  cloudStatus?: CloudStatus;
  activePeersCount?: number;
  lastSyncedTime?: string;
  onManualSync?: () => void;
  onSwitchUser: (user: User) => void;
  onOpenProfile: () => void;
  onOpenSecurity: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  sekolah,
  allUsers,
  cloudStatus = 'connected',
  activePeersCount = 1,
  lastSyncedTime = 'Baru saja',
  onManualSync,
  onSwitchUser,
  onOpenSecurity,
}) => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & School Branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 p-1 flex items-center justify-center shadow-xs overflow-hidden">
              {sekolah.logoSekolah ? (
                <img src={sekolah.logoSekolah} alt="Logo" className="max-h-full max-w-full object-contain" />
              ) : (
                <div className="w-full h-full rounded-lg bg-gradient-to-tr from-blue-700 via-indigo-600 to-sky-500 flex items-center justify-center text-white">
                  <GraduationCap className="w-5 h-5" />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg">
                  e-Rapor Pintar
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                  {sekolah.kurikulum}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <School className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium truncate max-w-[200px] sm:max-w-xs">{sekolah.namaSekolah}</span>
                <span className="hidden sm:inline text-slate-300">•</span>
                <span className="hidden sm:inline text-blue-700 font-medium">
                  {sekolah.semester} TA {sekolah.tahunAjaran}
                </span>
              </div>
            </div>
          </div>

          {/* Right Action: Security Badge, Cloud Live Status & User Profile / Switch */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Cloud Real-Time Indicator */}
            <div className="flex items-center gap-1">
              {cloudStatus === 'connected' ? (
                <div 
                  className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-blue-800 bg-blue-50 border border-blue-200 rounded-lg shadow-2xs"
                  title={`Terkoneksi ke Cloud Real-Time. ${activePeersCount} perangkat/guru aktif. Sinkronisasi terakhir: ${lastSyncedTime}`}
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                  </span>
                  <Cloud className="w-3.5 h-3.5 text-blue-600" />
                  <span className="hidden lg:inline">Cloud Real-Time</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-blue-200/80 text-[10px] text-blue-900 font-bold">
                    {activePeersCount} Guru Live
                  </span>
                </div>
              ) : cloudStatus === 'syncing' ? (
                <div 
                  className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg"
                  title="Sedang menyinkronkan data antar perangkat guru..."
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                  <span className="hidden sm:inline">Sinkronisasi Cloud...</span>
                </div>
              ) : (
                <div 
                  className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg"
                  title="Mode Offline: Data tersimpan aman di browser lokal"
                >
                  <CloudOff className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Lokal (Offline)</span>
                </div>
              )}

              {onManualSync && (
                <button
                  onClick={onManualSync}
                  title="Sinkronkan data sekarang"
                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Security Indicator */}
            <button
              onClick={onOpenSecurity}
              title="Keamanan Data: Enkripsi AES-256 Aktif"
              className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>AES-256 Aktif</span>
            </button>

            {/* Quick User Switcher Menu */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-2 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-left"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                  currentUser.role === 'admin' 
                    ? 'bg-purple-100 text-purple-700' 
                    : currentUser.role === 'wali_kelas'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {currentUser.namaLengkap.slice(0, 2).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-slate-800 leading-tight">
                    {currentUser.namaLengkap.split(' ')[0]}
                  </div>
                  <div className="text-[11px] text-slate-500 capitalize">
                    {currentUser.role === 'admin' ? 'Administrator' : currentUser.role === 'wali_kelas' ? 'Wali Kelas VII-A' : 'Guru Mapel'}
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {/* Dropdown switch role */}
              {dropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setDropdownOpen(false)} 
                  />
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-2 border-b border-slate-100 mb-1">
                      <div className="text-xs font-bold text-slate-900">{currentUser.namaLengkap}</div>
                      <div className="text-[11px] text-slate-500 truncate">{currentUser.email || currentUser.username}</div>
                      {currentUser.nip && (
                        <div className="text-[10px] text-slate-400 mt-0.5">NIP: {currentUser.nip}</div>
                      )}
                    </div>

                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Ganti Akun Cepat (Multi-User)
                    </div>

                    <div className="space-y-1 my-1">
                      {allUsers.map((u) => {
                        const isCurrent = u.id === currentUser.id;
                        return (
                          <button
                            key={u.id}
                            onClick={() => {
                              onSwitchUser(u);
                              setDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors text-left ${
                              isCurrent 
                                ? 'bg-blue-50 text-blue-800 font-semibold' 
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${
                                u.role === 'admin' ? 'bg-purple-500' : u.role === 'wali_kelas' ? 'bg-blue-500' : 'bg-amber-500'
                              }`} />
                              <div>
                                <div className="truncate max-w-[170px]">{u.namaLengkap}</div>
                                <div className="text-[10px] text-slate-400 font-normal">
                                  {u.role === 'admin' ? 'Super Admin' : u.role === 'wali_kelas' ? 'Wali Kelas VII-A' : 'Guru Mata Pelajaran'}
                                </div>
                              </div>
                            </div>
                            {isCurrent && <UserCheck className="w-3.5 h-3.5 text-blue-600" />}
                          </button>
                        );
                      })}
                    </div>

                    <div className="border-t border-slate-100 mt-2 pt-1">
                      <button
                        onClick={() => {
                          onOpenSecurity();
                          setDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 rounded-lg"
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Keamanan & Cadangan Terenkripsi</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};
