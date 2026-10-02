/**
 * e-Rapor Pintar - Sistem Manajemen Nilai & Cetak Rapor Digital Kurikulum Merdeka
 * Multi-user (Guru, Wali Kelas, Admin), Enkripsi AES-256 GCM, Impor/Ekspor Excel & PDF
 */

import React, { useState, useEffect, useCallback } from 'react';
import { loadDatabase, ERaporDatabase, saveDatabase } from './utils/storage';
import { User } from './types/erapor';
import { useCloudSync } from './utils/cloudSync';
import { Navbar } from './components/Navbar';
import { Sidebar, NavTab } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { StatusPengisianGuru } from './components/StatusPengisianGuru';
import { InputNilai } from './components/InputNilai';
import { ImporNilaiExcel } from './components/ImporNilaiExcel';
import { LegerNilai } from './components/LegerNilai';
import { CetakRapor } from './components/CetakRapor';
import { ManajemenSiswa } from './components/ManajemenSiswa';
import { ManajemenRombel } from './components/ManajemenRombel';
import { EkskulPresensi } from './components/EkskulPresensi';
import { KelolaPengguna } from './components/KelolaPengguna';
import { ProfilSekolah } from './components/ProfilSekolah';
import { MataPelajaranConfig } from './components/MataPelajaranConfig';
import { KeamananBackup } from './components/KeamananBackup';
import { Menu, ShieldAlert, CheckCircle2, RefreshCw, X } from 'lucide-react';

export default function App() {
  const [db, setDb] = useState<ERaporDatabase>(loadDatabase());
  
  // Remember logged in user per computer / device
  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const savedUserId = localStorage.getItem('ERAPOR_ACTIVE_USER_ID');
      if (savedUserId) {
        const found = db.users.find(u => u.id === savedUserId);
        if (found) return found;
      }
    } catch {}
    return db.users.find(u => u.id === 'usr-wali7a') || db.users[0];
  });

  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Params passed to importer if triggered from InputNilai
  const [importParams, setImportParams] = useState<{ mapelId?: string; kelasId?: string }>({});
  const [inputNilaiParams, setInputNilaiParams] = useState<{ mapelId?: string; kelasId?: string }>({});
  const [targetKelasId, setTargetKelasId] = useState<string | undefined>(undefined);

  // Callback when remote cloud update arrives from another teacher or admin
  const handleRemoteCloudUpdate = useCallback((remoteDb: ERaporDatabase) => {
    setDb(remoteDb);
    setCurrentUser(prevUser => {
      const refreshedUser = remoteDb.users.find(u => u.id === prevUser.id);
      return refreshedUser || prevUser;
    });
  }, []);

  // Real-time Cloud Synchronization
  const {
    cloudStatus,
    lastSyncedTime,
    activePeersCount,
    pingMs,
    syncToast,
    dismissToast,
    pushToCloud,
    fetchCloudData,
  } = useCloudSync(db, handleRemoteCloudUpdate);

  const handleUpdateDatabase = (newDb: ERaporDatabase) => {
    setDb(newDb);
    saveDatabase(newDb);
    pushToCloud(newDb, currentUser.namaLengkap);

    // Keep currentUser refreshed if its data changed in users array
    const refreshedUser = newDb.users.find(u => u.id === currentUser.id);
    if (refreshedUser) {
      setCurrentUser(refreshedUser);
    }
  };

  const handleSwitchUser = (user: User) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('ERAPOR_ACTIVE_USER_ID', user.id);
    } catch {}
    // If current tab is admin-only and switched to non-admin, go to dashboard
    if (['kelola_pengguna', 'sekolah', 'mata_pelajaran'].includes(currentTab) && user.role !== 'admin') {
      setCurrentTab('dashboard');
    }
  };

  const handleNavigateToImport = (mapelId: string, kelasId: string) => {
    setImportParams({ mapelId, kelasId });
    setCurrentTab('impor_excel');
  };

  const handleNavigateToInputNilai = (mapelId: string, kelasId: string) => {
    setInputNilaiParams({ mapelId, kelasId });
    setCurrentTab('input_nilai');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-800 antialiased font-sans">
      
      {/* Top Navigation Bar */}
      <Navbar
        currentUser={currentUser}
        sekolah={db.sekolah}
        allUsers={db.users}
        kelas={db.kelas}
        cloudStatus={cloudStatus}
        activePeersCount={activePeersCount}
        lastSyncedTime={lastSyncedTime}
        pingMs={pingMs}
        onManualSync={fetchCloudData}
        onSwitchUser={handleSwitchUser}
        onOpenProfile={() => setCurrentTab('keamanan')}
        onOpenSecurity={() => setCurrentTab('keamanan')}
      />

      {/* Mobile Menu Bar for small screens */}
      <div className="lg:hidden flex items-center justify-between px-4 py-2.5 bg-slate-900 text-white border-b border-slate-800 print:hidden">
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="flex items-center gap-2 text-xs font-semibold text-slate-200 p-1.5 rounded-lg hover:bg-slate-800"
        >
          <Menu className="w-5 h-5" />
          <span>Buka Menu</span>
        </button>
        <div className="text-xs text-slate-400">
          Role: <strong className="text-white capitalize">{currentUser.role}</strong>
        </div>
      </div>

      {/* Main Body with Sidebar & Content */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          role={currentUser.role}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Dynamic Main Workspace */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          {currentTab === 'dashboard' && (
            <Dashboard
              db={db}
              currentUser={currentUser}
              onNavigate={setCurrentTab}
            />
          )}

          {currentTab === 'status_pengisian' && (
            <StatusPengisianGuru
              db={db}
              currentUser={currentUser}
              onNavigateToInputNilai={handleNavigateToInputNilai}
            />
          )}

          {currentTab === 'input_nilai' && (
            <InputNilai
              db={db}
              currentUser={currentUser}
              initialMapelId={inputNilaiParams.mapelId}
              initialKelasId={inputNilaiParams.kelasId}
              onUpdateDatabase={handleUpdateDatabase}
              onNavigateToImport={handleNavigateToImport}
            />
          )}

          {currentTab === 'impor_excel' && (
            <ImporNilaiExcel
              db={db}
              currentUser={currentUser}
              initialMapelId={importParams.mapelId}
              initialKelasId={importParams.kelasId}
              onUpdateDatabase={handleUpdateDatabase}
              onDone={() => setCurrentTab('input_nilai')}
            />
          )}

          {currentTab === 'leger' && (
            <LegerNilai
              db={db}
              currentUser={currentUser}
            />
          )}

          {currentTab === 'cetak_rapor' && (
            <CetakRapor
              db={db}
              currentUser={currentUser}
            />
          )}

          {currentTab === 'ekskul_presensi' && (
            <EkskulPresensi
              db={db}
              currentUser={currentUser}
              onUpdateDatabase={handleUpdateDatabase}
            />
          )}

          {currentTab === 'siswa' && (
            <ManajemenSiswa
              db={db}
              currentUser={currentUser}
              initialKelasId={targetKelasId}
              onUpdateDatabase={handleUpdateDatabase}
              onNavigateToRombel={() => setCurrentTab('rombel')}
            />
          )}

          {currentTab === 'rombel' && (
            <ManajemenRombel
              db={db}
              currentUser={currentUser}
              onUpdateDatabase={handleUpdateDatabase}
              onNavigateToSiswa={(kelasId) => {
                setTargetKelasId(kelasId);
                setCurrentTab('siswa');
              }}
            />
          )}

          {currentTab === 'mata_pelajaran' && (
            <MataPelajaranConfig
              db={db}
              currentUser={currentUser}
              onUpdateDatabase={handleUpdateDatabase}
            />
          )}

          {currentTab === 'kelola_pengguna' && (
            <KelolaPengguna
              db={db}
              currentUser={currentUser}
              onUpdateDatabase={handleUpdateDatabase}
            />
          )}

          {currentTab === 'sekolah' && (
            <ProfilSekolah
              db={db}
              currentUser={currentUser}
              onUpdateDatabase={handleUpdateDatabase}
            />
          )}

          {currentTab === 'keamanan' && (
            <KeamananBackup
              db={db}
              currentUser={currentUser}
              onUpdateDatabase={handleUpdateDatabase}
            />
          )}
        </main>
      </div>

      {/* Real-time Multi-device Sync Toast */}
      {syncToast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm sm:max-w-md bg-slate-900 text-white p-3.5 rounded-2xl shadow-2xl border border-blue-500/50 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1 text-xs">
            <div className="font-bold text-white flex items-center gap-1.5">
              <span>Sinkronisasi Cloud Real-Time</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <div className="text-slate-300 mt-0.5 leading-snug">{syncToast.message}</div>
          </div>
          <button
            onClick={dismissToast}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
}
