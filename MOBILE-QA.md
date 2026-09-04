# Pemeriksaan mobile — 2026-09-04

Pembaruan copy homepage dari gambar owner juga diterapkan: hero menjadi
"Private Bodywork & Movement Studio in Uluwatu, Bali", paragraf hero sesuai
teks baru, dan "Complete Wellness" menjadi "What We Do" dengan paragraf
terapis yang sama dari awal hingga akhir. Teks aktual diverifikasi pada
320/390/768px tanpa terpotong.

Lingkungan: aplikasi lokal `http://localhost:3008`, browser Codex, viewport
320×740, 390×844 dan 768×1024. Ukuran aktual diperiksa dengan `innerWidth`;
pengukuran tidak hanya melihat scroll halaman, tetapi juga batas konten
terhadap viewport (root yang menyembunyikan overflow bisa menutupi bug).

## Masalah yang diperbaiki

- Intake WhatsApp pada 320px: input nomor hanya 39px. Picker negara dan
  nomor sekarang ditumpuk di bawah 640px; nomor memiliki ruang penuh.
- Input publik dan newsletter berukuran minimal 16px di mobile untuk
  menghindari zoom fokus iOS. CTA utama dan kontrol intake/admin memiliki
  tinggi minimal 44px.
- Artikel Common Surfing Injuries: lebar artikel 371px pada viewport 320px,
  sehingga teks terpotong. Grid satu kolom memakai `minmax(0,1fr)`, article
  `min-width:0`, dan teks panjang bisa dipenggal.
- Breadcrumb judul panjang dibatasi lebar wadah dan bisa menyusut.
- Field key admin dan tombol konfirmasi dengan label panjang bisa membungkus.
- Signature menangani pointer cancel serta memberikan status setelah digambar.

## Cakupan halaman

30 URL publik: homepage, about, price list, services, contact, intake,
appointment, blog + halaman 2, dua arsip kategori, dua profil therapist,
sembilan halaman treatment dan delapan artikel. Pemeriksaan mencakup ketiga
viewport di atas. Semua halaman utama admin (Today, Treatments, Blog,
Bookings, Schedule, Services, Intake, Admins, Profile, Settings) juga diperiksa
di ketiga ukuran. Tabel admin yang lebar tetap menggulir dalam wadahnya.

Interaksi: buka/tutup menu mobile dan submenu layanan; submit intake kosong
menampilkan error; cabang treatment/adverse reaction tampil dan hilang sesuai
jawaban induk; pemilihan Radio; builder tambah/edit/hapus/pulihkan; pemilihan
gambar melalui file chooser. Emergency Contact Name sudah tidak tampil.
Tanda tangan diuji dengan drag pada canvas: status berubah menjadi
"Signature added", lalu Clear mengembalikan status kosong. Reload dengan
cabang pertanyaan terbuka tidak lagi menghasilkan hydration error.

## Batas verifikasi

Ini pengujian viewport browser Chromium, bukan pengujian fisik iPhone/Safari
atau Android. Academy tidak dipublikasikan; detail/reschedule/confirmation
booking dengan token tertentu tidak dibuat untuk audit ini. Tidak ada
submission tes yang dikirim ke WhatsApp atau Google Sheets nyata. Build dan
tes regresi intake dicatat di `INTAKE-PLAN.md`.
