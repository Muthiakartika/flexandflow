# Client Intake & Consent form — rencana & catatan implementasi

## Pembaruan audit 2026-09-04 (status terbaru)

Bagian ini menggantikan batasan/status lama di bawah yang masih menyebut
field asli tidak bisa dihapus atau builder belum diuji klik penuh.

- Admin dapat menambah, mengedit, menghapus, dan memulihkan field asli maupun
  kustom. `archived` menghapus field dari form aktif, sambil mempertahankan
  definisi untuk jawaban historis dan kolom Google Sheets. Tombol tambah ada
  di atas, tipe pilihan menampilkan editor opsi, dan tersedia preview publik.
- **Emergency Contact Name dihapus atas permintaan owner** (gambar bertanda
  silang). Migrasi `20260904040000_remove_emergency_contact_name` sudah
  diterapkan; field tidak tampil dan tidak divalidasi pada submission baru.
- Migrasi `20260904030000_intake_field_archive` sudah diterapkan. Seed tidak
  mengaktifkan kembali field yang diarsipkan, dan mempertahankan `sortOrder`
  baris lama supaya kolom ekspor tidak bergeser saat field seed dihapus.
- Validasi client/server kini mengabaikan jawaban kondisional yang tersembunyi,
  termasuk cabang bertingkat. Jika induk dihapus, pertanyaan anak tampil agar
  masih bisa diisi. Tanggal kalender, email, field NAME/ADDRESS opsional,
  dan pesan kesalahan compound diperbaiki. Draft dengan tipe tidak valid atau
  placeholder gambar lama tidak dipulihkan sebagai jawaban yang sah. Draft
  dimuat setelah hydration agar reload pada cabang terbuka tidak menyebabkan
  hydration mismatch; kasus ini ditemukan dan diuji ulang di browser.
- Bug Save pada Radio yang menghapus opsi telah diperbaiki. Opsi kosong atau
  duplikat ditolak, SIGNATURE tetap satu yang aktif, dan key field kustom
  memakai prefix `custom_` agar tidak bertabrakan dengan nama multipart.
- Upload memeriksa decode gambar dan MIME sebelum menulis file. Maksimum
  gambar 3 MiB, total payload sekitar 4 MiB termasuk teks/overhead, untuk
  menghindari batas 4.5 MB Vercel. Referensi:
  https://vercel.com/docs/functions/limitations#request-body-size
- Ekspor menggunakan `RAW` agar teks/nomor tidak menjadi formula. Header
  diperbarui untuk field baru; kolom field arsip tetap ada. Metadata
  `data._signatureFieldKey` menentukan kolom signature untuk submission baru.
- `npm run check:intake`: **40 tes lulus** (24 schema/file/export/state dan 16
  integrasi route/action dengan batas eksternal dimock). Cakupan termasuk
  multipart salah, field wajib, manipulasi upload, batas ukuran, spam/rate
  response, kegagalan database/storage, permission, tambah/edit/hapus/restore,
  pilihan invalid dan signature ganda. Tidak mengirim WhatsApp/Sheet nyata.
- Browser lokal: tambah Radio → muncul publik → pilih → edit opsi → hapus
  → hilang publik → restore → muncul → hapus lagi berhasil. Field IMAGE
  sementara menerima `public/photos/logo.png` melalui file chooser dan
  menampilkan nama file; kemudian field uji diarsipkan. Field uji tersisa
  hanya di daftar Removed fields, bukan form publik.
- Mobile: country/nomor ditumpuk di layar kecil (nomor sebelumnya hanya
  39px pada viewport 320px), input 16px, target sentuh intake minimal 44px.
  Audit mencakup 30 halaman publik dan 10 halaman utama admin pada
  320/390/768px. Detail booking yang membutuhkan token/submission tertentu
  dan Academy yang belum dipublikasikan bukan bagian audit interaktif ini.
- Build produksi berhasil. ESLint tidak menemukan error; dua warning lama
  terdapat di layout utama dan `lib/admin/team.ts`.
- Pengujian ulang pengiriman nyata WhatsApp/Sheets tidak dilakukan pada audit
  ini. Pengujian API sukses memakai mock agar tidak mengirim notifikasi tes.

Catatan mobile lebih lengkap: `MOBILE-QA.md`.

Rencana untuk memindahkan form "Client Intake and Consent" dari JotForm
(`form.jotform.com/262441853736058`) ke dalam app Next.js ini — konten field
bisa diedit SUPER_ADMIN dari panel, tiap submission masuk ke Google Sheet
(service account, sampai 2 alamat Gmail diberi akses), dan notifikasi
WhatsApp ke studio lewat WAHA yang sudah ada (dipakai juga oleh sistem
booking, lihat `BOOKING-PLAN.md`).

Dokumen ini gabungan rencana + catatan hasil — bagian **Status** di paling
bawah adalah sumber kebenaran soal apa yang sudah/belum jalan. Kalau lanjut
kerja di fitur ini (termasuk dari AI/sesi lain), baca dari situ dulu.

---

## 0. Keputusan yang sudah diambil

| Hal | Keputusan | Konsekuensi |
|---|---|---|
| Kenapa tidak pakai Tally/Cognito/Fillout/Zoho | Semua menyembunyikan watermark "Powered by" di balik paid plan — dicek langsung ke dokumentasi tiap vendor, bukan asumsi | Dibangun native di app ini |
| Bentuk halaman | **Satu halaman scroll panjang**, 5 section, bukan wizard multi-step seperti JotForm aslinya | Tidak ada conditional-logic asli di form ini yang butuh state machine step; lebih sederhana dibangun & dipelihara |
| Notifikasi admin | **WhatsApp only** lewat WAHA yang sudah ada, tabel job terpisah (`IntakeNotificationJob`), bukan numpang di `NotificationJob` milik booking | Melindungi pipeline notifikasi booking yang sudah live & terverifikasi dari perubahan schema/logic fitur lain |
| Booking sekarang wajib lewat intake | Setiap CTA booking di seluruh situs redirect ke `/intake` dulu, tidak ada memory (isi ulang tiap kali), baru redirect ke `booking.flexandflow.fit` (WordPress/BookingPress, **bukan** wizard internal `/booking/`) | Lihat `[[booking-external-redirect]]` di memory — booking form sendiri masih di WordPress, ini di luar scope dokumen ini |
| Field kustom | SUPER_ADMIN bisa menambah field baru (TEXT/TEXTAREA/PHONE/DATE/DROPDOWN/RADIO/YES_NO/CHECKBOX_GROUP/IMAGE/SIGNATURE/NAME/INFO) dari panel, dan menghapus field yang dia tambah sendiri | `isCustom: boolean` di `IntakeFormField` membedakan 34 field asli (tidak bisa dihapus dari panel) dari field tambahan (bisa) |

---

## 1. Model data — `prisma/schema.prisma`

Empat model, tiga enum. Ini yang **benar-benar dibangun** (sempat berubah dari
rencana awal beberapa kali selama sesi berjalan — lihat §5):

```prisma
enum IntakeSectionKey {
  CLIENT_DETAILS
  APPOINTMENT_HISTORY
  HEALTH_SCREENING
  LYMPHATIC_SCREENING
  CONSENT
}

enum IntakeFieldKind {
  TEXT
  NAME       // first/last saja — middle name dihapus 2026-09-03
  ADDRESS    // sudah tidak dipakai sejak currentAddress jadi TEXT; enum value
             // dibiarkan ada (drop value yang pernah dipakai Postgres perlu
             // recreate type), tapi tidak ada seed yang pakai ini lagi
  DATE
  DROPDOWN
  RADIO      // pilihan tunggal, semua opsi terlihat sekaligus (beda dari DROPDOWN)
  YES_NO
  CHECKBOX_GROUP
  TEXTAREA
  PHONE      // E.164 lewat country picker + flag — lihat components/intake/PhoneField.tsx
  IMAGE      // satu upload gambar, tersimpan seperti signature (bukan public/)
  SIGNATURE
  INFO       // teks notice statis, bukan input
}

enum IntakeNotificationKind {
  ADMIN_NEW_SUBMISSION
}

model IntakeFormField {
  id String @id @default(cuid())
  sectionKey IntakeSectionKey
  sortOrder  Int    @default(0)
  fieldKey   String @unique
  kind IntakeFieldKind
  label String
  helpText String?
  required Boolean @default(false)
  options  String[] @default([])
  /// False untuk 34 field dari lib/intake/seed-fields.ts (bentuk asli form).
  /// True hanya untuk field yang ditambah SUPER_ADMIN lewat /admin/intake/.
  /// Inilah yang bikin prisma/seed.ts bisa aman menghapus field yang sudah
  /// tidak ada di seed-fields.ts tanpa pernah menyentuh field buatan admin.
  isCustom Boolean @default(false)
  updatedById String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model IntakeSubmission {
  id String @id @default(cuid())
  reference String @unique   // prefix "IN-", sama pola dengan Booking.reference
  data Json                  // semua jawaban non-SIGNATURE, keyed by fieldKey
  signatureUrl String
  clientName String
  clientEmail String?
  clientWhatsapp String
  ipAddress String?
  sheetSyncedAt DateTime?
  sheetSyncAttempts Int @default(0)
  sheetSyncError String?
  notifications IntakeNotificationJob[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model IntakeNotificationJob { /* struktur sama seperti NotificationJob booking */ }

model IntakeSettings {
  id String @id @default("singleton")
  shareEmail1 String?
  shareEmail2 String?
  updatedById String?
  updatedAt DateTime @updatedAt
}
```

Migrasi: `20260903023421_add_intake_forms` (schema awal) lalu
`20260904012228_intake_custom_fields` (enum RADIO/PHONE/IMAGE + kolom
`isCustom`).

---

## 2. Field seed — `lib/intake/seed-fields.ts`

34 field, ditranskrip dari JotForm asli pada 2026-09-03. `prisma/seed.ts`
upsert per `fieldKey`:

```ts
await prisma.intakeFormField.upsert({
  where: { fieldKey: field.fieldKey },
  // kind disinkron seperti sortOrder/sectionKey — BUKAN dilindungi seperti
  // label/helpText/required/options, karena kind tidak pernah jadi input
  // yang bisa diedit admin (panel cuma menampilkannya sebagai chip read-only).
  update: { sortOrder: index, sectionKey: field.sectionKey, kind: field.kind },
  create: { ...field, sortOrder: index },
});
```

**Penting — bug yang sempat ada**: baris `update:` di atas awalnya cuma berisi
`sortOrder` dan `sectionKey`, tidak ada `kind`. Akibatnya waktu
`currentAddress` diubah dari `ADDRESS` ke `TEXT` dan `whatsappNumber` dari
`TEXT` ke `PHONE` di `seed-fields.ts`, re-run `npm run db:seed` **tidak
mengubah apa-apa** di database — baris sudah ada, jadi cabang `update` yang
jalan, dan `kind` bukan bagian dari situ. Sudah diperbaiki (lihat §7). Kalau
menambah kolom baru ke `IntakeFormField` yang sifatnya "tetap dari kode,
bukan dari admin", pastikan masuk ke `update:` ini juga.

Field yang **dihapus total** dari form (2026-09-03, permintaan owner):
Nationality, Emergency Contact Number, Relationship to Emergency Contact.
Middle Name dihapus dari setiap field NAME. Address dari 5 bagian jadi satu
baris teks bebas. Penghapusan field beneran menghapus baris (bukan
disembunyikan) lewat cleanup step di `prisma/seed.ts`:

```ts
const currentFieldKeys = SEED_INTAKE_FIELDS.map((f) => f.fieldKey);
await prisma.intakeFormField.deleteMany({
  where: { isCustom: false, fieldKey: { notIn: currentFieldKeys } },
});
```

`isCustom: false` di situ krusial — field yang admin tambah sendiri lewat
panel tidak pernah ada di `SEED_INTAKE_FIELDS`, jadi tanpa syarat ini cleanup
step akan menghapusnya tiap kali seed dijalankan ulang.

---

## 3. Field builder kustom (admin)

Ditambahkan setelah rilis awal, atas permintaan owner: SUPER_ADMIN bisa
menambah pertanyaan baru yang tidak ada di JotForm asli, langsung dari
`/admin/intake/`.

- `lib/intake/schema.ts` — `CREATABLE_FIELD_KINDS` (semua kind kecuali
  ADDRESS, yang sudah deprecated), `intakeFieldCreateSchema`, `OPTION_KINDS`
  (DROPDOWN/RADIO/CHECKBOX_GROUP — wajib minimal 1 opsi).
- `lib/intake/actions.ts` — `addIntakeFieldAction` (slugify label →
  `fieldKey` unik lewat `uniqueFieldKey`, tolak SIGNATURE kedua, hitung
  `sortOrder` = tertinggi + 1 di seluruh form, set `isCustom: true`) dan
  `deleteIntakeFieldAction` (tolak kalau `!isCustom` — pesannya persis:
  "This field is part of the original form and cannot be deleted here.").
- `components/admin/AddIntakeFieldForm.tsx` — form-nya, pakai `AdminSelect`
  (bukan `<select>` polos) untuk section & kind, sesuai konvensi panel yang
  sudah ada.
- `components/admin/DeleteIntakeFieldButton.tsx` — tombol dua-klik yang
  melucuti diri sendiri setelah 5 detik, strukturnya disalin persis dari
  `DeleteAdminButton.tsx`/`DeleteBookingButton.tsx`.
- `components/admin/IntakeFieldRowForm.tsx` — baris field yang `isCustom`
  dapat chip hijau "custom" dan tombol Delete di bawah form Save-nya; 34
  field asli tidak dapat keduanya.
- Semua field baru otomatis dirender publik lewat dispatch berbasis `kind` di
  `IntakeSection.tsx` — tidak ada perubahan lain yang dibutuhkan di sisi
  public form.

---

## 4. Notifikasi & Google Sheets

- `lib/intake/sheets.ts` — `googleapis`, service account, scope Sheets +
  Drive. `shareSheetWith(email)` dipanggil hanya untuk slot Gmail yang
  benar-benar berubah dari sebelumnya (supaya tidak numpuk permission ganda
  di Drive tiap kali Settings disimpan).
- `lib/intake/sheet-row.ts` — bangun baris (murni, tanpa Google import),
  urutan kolom ikut `sortOrder`.
- `lib/intake/sync.ts` — `syncSubmissionToSheet`, dipanggil dari `after()` di
  route API, gagal closed (tidak pernah melempar ke pemanggil).
- Kredensial (`GOOGLE_SERVICE_ACCOUNT_EMAIL`,
  `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `GOOGLE_SHEET_ID`) **sudah
  dikonfigurasi owner dan sudah diverifikasi jalan** — lihat §7 soal bug nama
  env var yang sempat menghalangi ini.
- WhatsApp — reuse WAHA yang sama dengan booking, sudah terverifikasi kirim
  nyata di sesi sebelumnya.

---

## 5. Yang berubah dari rencana awal

Rencana awal (lihat riwayat percakapan / plan file) cuma menyebut field kind
TEXT/NAME/ADDRESS/DATE/DROPDOWN/YES_NO/CHECKBOX_GROUP/TEXTAREA/SIGNATURE/INFO
dan tidak menyebut field builder kustom sama sekali. Selama sesi berjalan,
owner minta tambahan berikut, semuanya sudah dibangun:

1. Nomor telepon (WhatsApp) pakai country-code picker + flag emoji —
   `PHONE` jadi kind sendiri, bukan `TEXT` biasa.
2. Reveal kondisional asli: field seperti "Adverse reaction details" cuma
   muncul kalau pertanyaan sebelumnya dijawab "Yes" (lihat
   `lib/intake/conditional.ts` — `CONDITIONAL_FIELDS` map + `isFieldVisible`).
   JotForm aslinya cuma pakai caption teks ("Fill it if..."), bukan
   sembunyi/tampil beneran — ini peningkatan dari yang diminta.
3. Penghapusan field (Nationality, Emergency Contact Number/Relationship,
   Middle Name, Address jadi satu baris) — lihat §2.
4. Field builder kustom lengkap — lihat §3.

---

## 6. Bug yang ditemukan & diperbaiki sesi ini

Dua di antaranya adalah **penyebab asli** laporan owner "gk bisa ngirim":

1. **`SignaturePad.tsx`** — `canvas.setPointerCapture()` bisa melempar
   `NotFoundError` untuk pointer id yang tidak dikenal virtual
   browser/beberapa device. Exception tidak tertangkap → `drawing.current =
   true` tidak pernah jalan → seluruh signature pad diam-diam berhenti
   merespons, tanpa error yang terlihat user. Diperbaiki dengan try/catch di
   `setPointerCapture` dan `releasePointerCapture`.
2. **Race condition draft-save** di `IntakeForm.tsx` — `setAnswer` menyimpan
   draft ke `sessionStorage` dari closure `state.answers` yang bisa basi
   kalau beberapa perubahan terjadi cepat (mis. centang beberapa checkbox
   berturutan). State React sendiri tetap benar, tapi draft yang tersimpan
   bisa kehilangan perubahan. Diperbaiki dengan memindahkan `saveDraft` ke
   `useEffect` yang bergantung pada `state.answers`.
3. **Salah nama env var Google** — owner mengisi `GOOGLE_CLIENT_EMAIL`/
   `GOOGLE_PRIVATE_KEY`, kode menunggu
   `GOOGLE_SERVICE_ACCOUNT_EMAIL`/`GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`. Sheet
   diam-diam tidak pernah terisi (gagal closed, tidak ada error yang
   terlihat). Diperbaiki, dan satu submission yang sempat tersangkut
   disinkron ulang manual.
4. **Seed tidak sinkron `kind`** — lihat §2. Diperbaiki dengan menambahkan
   `kind: field.kind` ke klausa `update:`.

---

## 7. Gotcha lingkungan (penting — beda dari yang tertulis di CLAUDE.md)

**Cache dir yang benar di bawah Next 16 + Turbopack (`next dev`) adalah
`.next/dev/cache/fetch-cache/`, BUKAN `.next/cache/fetch-cache/`.**
`lib/intake/read.ts` (dan CLAUDE.md sebelumnya) menyebut path yang kedua —
itu konvensi webpack-dev lama. Menghapus `.next/cache/fetch-cache/` di setup
ini adalah no-op yang diam-diam tidak melakukan apa-apa dan terlihat sama
persis seperti berhasil. Ini ditemukan ulang di sesi ini setelah dua kali
"pembersihan cache + restart" tidak mengubah apa pun yang ditampilkan
`/intake` — datanya sendiri di database sudah benar (diverifikasi langsung
lewat query terpisah), hanya `unstable_cache` yang masih menyimpan hasil
lama. Setelah reseed struktural apa pun, hapus
`.next/dev/cache/fetch-cache/` (atau seluruh folder `.next`) sebelum
restart. Kalau path ini berubah lagi di versi Next berikutnya:
`grep -rl "<nilai yang seharusnya sudah berubah>" .next` menemukan direktori
yang benar secara langsung.

---

## 8. Environment variables

Ditambahkan ke `.env.example` dan `lib/env.ts` (opsional, fail-closed lewat
`sheetsEnabled()`):

```
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=
GOOGLE_SHEET_ID=
```

Sudah diisi owner di `.env.local` dan sudah terverifikasi bekerja (submission
nyata muncul di Sheet).

---

## Status

- [x] Schema, migrasi, seed — diterapkan ke database Neon nyata.
- [x] Public form (`/intake`) — semua 34 field asli + reveal kondisional +
      PhoneField + ImageField, diverifikasi lewat pembacaan DOM/accessibility
      tree penuh setelah perbaikan cache (§7): field yang dihapus benar-benar
      hilang, Address jadi satu baris, WhatsApp pakai country picker.
- [x] Booking gate — setiap CTA booking di situs redirect ke `/intake` dulu,
      nav disembunyikan di halaman itu, sukses redirect ke
      `booking.flexandflow.fit` sudah dibuktikan lewat perubahan origin tab
      di browser nyata.
- [x] Submission end-to-end — diuji penuh di browser sekali (sebelum field
      builder kustom ada): 201 Created, WhatsApp asli terkirim, data E.164
      benar, redirect otomatis ke booking terjadi.
- [x] Google Sheets sync — kredensial owner terpasang, submission yang
      sempat tersangkut sudah disinkron manual, konfirmasi "iya sudah mau"
      dari owner.
- [x] Field builder kustom (backend) — schema, actions, API route image
      handling, semuanya lolos `npx tsc --noEmit` dan `npx eslint` bersih
      (nol error).
- [x] Field builder kustom (render publik) — dibuktikan lewat inspeksi DOM
      langsung (`document.getElementById`, dst.): form "Add a field" render
      lengkap dengan semua input yang benar (Section, Field type, Label,
      Help text, Options, Required, tombol Add field), dan dropdown Section
      **terbukti berfungsi nyata** lewat klik asli di browser (listbox
      terbuka, opsi "Appointment & Treatment History" berhasil dipilih,
      hidden input form ter-update jadi `APPOINTMENT_HISTORY`).
- [ ] **Field builder kustom (klik-tembus penuh) — BELUM selesai
      diverifikasi.** Dropdown kedua (Field type) tidak berhasil diklik lewat
      koordinat di sesi ini — bukan indikasi bug di kode (komponennya
      `AdminSelect` yang sama persis dengan dropdown Section yang sudah
      terbukti jalan), tapi keterbatasan lingkungan browser pane di sesi ini:
      posisi elemen bergeser antar pemanggilan tool (kemungkinan reflow async
      yang belum settle), jadi koordinat yang dihitung jadi basi sebelum klik
      dieksekusi. **Belum pernah benar-benar submit satu field kustom baru
      dan melihatnya muncul di form publik, atau menghapusnya lagi lewat
      tombol Delete.** Ini yang paling penting dicek berikutnya — baik oleh
      owner langsung di browser sungguhan, atau oleh sesi/AI berikutnya yang
      preview pane-nya sedang dalam kondisi lebih stabil.
- [ ] Field kustom bertipe IMAGE belum pernah diuji upload sungguhan di
      browser (jalur kodenya sama dengan signature, yang sudah terbukti
      jalan, tapi belum dicoba langsung).
- [ ] Owner belum melihat/menyetujui hasil akhir form yang sudah dipangkas
      (Nationality dkk. hilang, Address jadi satu baris) — perubahan ini
      dikerjakan berdasarkan coretan merah di screenshot yang owner kirim,
      belum ada konfirmasi eksplisit "sudah benar" setelah selesai.

**Langkah paling berguna berikutnya**: buka `/admin/intake/`, scroll ke
panel "Add a field" paling bawah, isi satu field percobaan (kind apa saja
selain Signature), submit, cek muncul di `/intake`, lalu hapus lagi lewat
tombol "Delete field" yang muncul di bawah field itu (chip hijau "custom").
Kalau itu jalan, fitur ini selesai penuh.
