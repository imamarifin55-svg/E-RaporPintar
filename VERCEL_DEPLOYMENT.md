# Panduan Deployment ke Vercel (e-Rapor Pintar)

Aplikasi **e-Rapor Pintar** telah dilengkapi dengan konfigurasi siap pakai (`vercel.json`) dan Vercel Serverless Functions (`/api/database.ts` & `/api/realtime/stream.ts`).

---

### Cara 1: Deploy Langsung via GitHub / Git (Direkomendasikan)
1. Push proyek ini ke repository GitHub Anda (misalnya: `erapor-pintar`).
2. Buka dashboard Vercel di [vercel.com](https://vercel.com) dan login.
3. Klik tombol **"Add New..."** -> **"Project"**.
4. Pilih repository GitHub Anda.
5. Vercel akan otomatis mendeteksi:
   - **Framework Preset**: Vite
   - **Build Command**: `vite build` atau `npm run build`
   - **Output Directory**: `dist`
6. Klik **"Deploy"**. Dalam hitungan detik, aplikasi e-Rapor Anda telah online dan siap diakses oleh seluruh guru dan wali kelas!

---

### Cara 2: Deploy Cepat via Vercel CLI
Jalankan perintah berikut di terminal:
```bash
# 1. Install Vercel CLI secara global (jika belum ada)
npm i -g vercel

# 2. Login ke akun Vercel
vercel login

# 3. Jalankan deployment
vercel --prod
```

---

### Fitur Cloud Real-Time Multi-Perangkat:
- Setiap guru yang membuka link Vercel di perangkat masing-masing (HP, Laptop, Tablet) akan langsung tersambung secara otomatis.
- Data nilai yang diinput atau disimpan oleh guru akan disinkronkan ke serverless cloud API `/api/database` dan dibagikan secara real-time.
- Status pengisian dapat dipantau langsung oleh Admin dan Wali Kelas melalui menu **Status Pengisian Guru**.
- Data juga tetap di-cache secara aman di browser lokal dengan enkripsi AES-256 GCM untuk keandalan jika koneksi internet terputus.
