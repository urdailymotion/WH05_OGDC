# Inventory OGDC — GitHub Pages + Supabase V22

Paket ini mempertahankan tampilan dan fungsi utama `Index.html` lama, tetapi mengganti `google.script.run`, Google Sheet, dan Google Drive dengan:

- GitHub Pages sebagai hosting frontend.
- Supabase Auth untuk login.
- Supabase PostgreSQL/RPC untuk database dan transaksi stok.
- Supabase Storage bucket `ogdc-evidence` untuk foto bukti.
- jsPDF di browser untuk membuat PDF.

## Isi folder

```text
index.html
connection-test.html
.nojekyll
robots.txt
AUTH_USERS_SETUP.sql
js/
  config.js
  ogdc-pdf.js
  ogdc-supabase.js
```

## 1. Buat akun Supabase Authentication

Buka:

`Supabase Dashboard > Authentication > Users > Add user`

Buat akun berikut dan aktifkan **Auto Confirm User**:

| Email Auth | Username aplikasi | Role |
|---|---|---|
| admin@ogdc.local | admin | ADMIN |
| operator@ogdc.local | operator | OPERATOR |
| oilman@ogdc.local | oilman | OILMAN |
| eon@ogdc.local | eon | VENDOR, opsional |

Password ditentukan ketika membuat user. Frontend mengubah login `admin` menjadi `admin@ogdc.local` secara otomatis.

Setelah user dibuat, jalankan isi `AUTH_USERS_SETUP.sql` melalui SQL Editor agar status menjadi Active dan role-nya sesuai.

## 2. Upload ke GitHub

Buat repository baru, misalnya:

`inventory-ogdc`

Upload **isi folder ini** ke root repository. Struktur akhirnya harus seperti ini:

```text
inventory-ogdc/
  index.html
  connection-test.html
  .nojekyll
  robots.txt
  AUTH_USERS_SETUP.sql
  js/
    config.js
    ogdc-pdf.js
    ogdc-supabase.js
```

Jangan meng-upload folder pembungkusnya satu tingkat terlalu dalam. `index.html` harus terlihat langsung di root repository.

## 3. Aktifkan GitHub Pages

Buka:

`Repository > Settings > Pages`

Pilih:

- Source: **Deploy from a branch**
- Branch: **main**
- Folder: **/(root)**

Simpan. Alamat aplikasi biasanya menjadi:

`https://USERNAME-GITHUB.github.io/inventory-ogdc/`

## 4. Atur URL Supabase Auth

Buka:

`Supabase > Authentication > URL Configuration`

Isi Site URL dengan alamat GitHub Pages Anda. Tambahkan URL yang sama pada Redirect URLs. Login password tetap dapat berjalan tanpa redirect, tetapi pengaturan ini diperlukan untuk alur Auth lain dan pemulihan password.

## 5. Konfigurasi Supabase

Konfigurasi project berada pada:

`js/config.js`

Project URL sudah diubah dari URL REST:

```text
https://jdthhrqokvaflenuecsi.supabase.co/rest/v1/
```

menjadi Project URL yang diperlukan `createClient`:

```text
https://jdthhrqokvaflenuecsi.supabase.co
```

Anon key boleh berada di frontend karena memang publishable. Keamanannya bergantung pada RLS yang sudah dibuat pada STEP 2. **Jangan pernah memasukkan service_role key ke GitHub.**

## 6. Pengujian awal

1. Buka `connection-test.html` dari URL GitHub Pages dan jalankan Test Koneksi, Login, serta Initial Data.
2. Buka URL utama GitHub Pages.
3. Login menggunakan username `admin` dan password yang dibuat di Supabase Auth.
4. Pastikan Dashboard, Master Material, SLOC, Vendor, Plan, dan Settings terbuka.
5. Coba satu transaksi Data IN kecil.
6. Pastikan `CURRENT_STOCK` berubah di Supabase Table Editor.
7. Coba Data OUT dengan qty yang tidak melebihi stok.
8. Coba upload foto maksimal 20 MB dalam JPEG, PNG, atau WebP.
9. Coba export PDF transaksi dan PDF IBC.

## Catatan fungsi

- PDF dibuat langsung di browser dan diunduh sebagai file. PDF tidak otomatis disimpan kembali ke tabel database.
- Foto bukti disimpan di bucket private `ogdc-evidence` dan dibuka melalui signed URL.
- Session Supabase disimpan di browser dan dipulihkan otomatis saat halaman dibuka ulang.
- Menu tetap dibatasi sesuai role pada tampilan, sementara keamanan data tetap dijaga oleh RLS dan RPC di Supabase.

## Troubleshooting

### Login gagal: Invalid login credentials

Pastikan user sudah dibuat di Authentication dengan email `username@ogdc.local` dan password benar.

### Akun masih Inactive

Jalankan `AUTH_USERS_SETUP.sql`, lalu periksa:

```sql
select username, role, status from public.profiles order by username;
```

### Permission denied atau new row violates row-level security policy

Pastikan STEP 2 Security/RLS sudah sukses dijalankan dan profil user memiliki role serta status yang benar.

### Adapter Supabase belum tersedia

Pastikan struktur folder `js/` tidak berubah dan ketiga file JavaScript berhasil dimuat dari GitHub Pages.

### Foto tidak terbuka

Pastikan bucket bernama `ogdc-evidence`, user memiliki role ADMIN/OPERATOR/OILMAN, dan policy Storage STEP 2 sudah berhasil dibuat.
