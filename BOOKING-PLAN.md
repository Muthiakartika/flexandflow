# Booking System — rencana implementasi

Rencana untuk memindahkan alur booking dari WordPress (BookingPress di
`flexandflow.fit/appointment/`) ke dalam app Next.js ini, dengan konfirmasi email
(SendGrid), konfirmasi WhatsApp (WAHA — server milik sendiri), dan file kalender
(.ics) yang bisa langsung masuk ke kalender HP customer.

Dokumen ini rencana, bukan catatan hasil. Update bagian **Status** saat tiap fase
selesai.

---

## 0. Keputusan yang sudah diambil

| Hal | Keputusan | Konsekuensi |
|---|---|---|
| Hosting | **Vercel** | Butuh Postgres terkelola, tidak ada disk permanen, tidak ada background worker → pakai `after()` + job table + cron |
| Database | **PostgreSQL + Prisma** | Rekomendasi provider: **Neon** (serverless, driver HTTP cocok untuk Vercel, free tier cukup) |
| Kalender | **ICS + tombol Add to Calendar** | Tidak ada OAuth Google. Customer dapat lampiran `.ics` di email + link "Add to Google Calendar". Tap di HP → masuk kalender bawaan |
| Pembayaran | **Belum ada di v1** | Bayar di tempat. Tapi schema & state machine disiapkan supaya payment gateway bisa ditambah tanpa migrasi besar — lihat §9 |
| WhatsApp | **WAHA server yang sudah ada** | App ini hanya jadi client. Yang perlu dari owner: URL, API key, nama session, nomor admin |
| Timezone | **`Asia/Makassar` (WITA, UTC+8)** | Simpan UTC di DB, render WITA. Tidak ada DST — satu-satunya sumber bug adalah lupa konversi |

Alur wizard mengikuti yang lama persis: **Staff → Service → Date & Time → Basic
Details → Summary**.

---

## 1. Kondisi repo saat ini (baseline)

Yang perlu diketahui sebelum menyentuh apa pun:

- **Booking belum ada sama sekali di app ini.** `next.config.ts` mem-*redirect*
  `/booking` dan `/appointment` ke WordPress (307), dan `lib/site.ts:27-30`
  (`wordpressUrls`) menyimpan URL itu. `CLAUDE.md` dan `DESIGN.md` secara
  eksplisit menyatakan booking **tidak** di-clone. Semua pernyataan itu harus
  diperbarui saat fase ini selesai.
- Ada **4 tempat** yang menautkan ke booking WordPress dan harus diarahkan ke
  route internal baru:
  - `components/layout/Header.tsx` (CTA di header)
  - `components/layout/MobileNav.tsx:239`
  - `components/cards/ServicePriceCard.tsx:100`
  - `components/content/ServiceArticle.tsx:130`
- **Tidak ada dependency apa pun** di luar `next`, `react`, `react-dom`,
  `tailwindcss`. Tidak ada database, test runner, atau form library. Semua form
  saat ini (`ContactForm`, `NewsletterForm`) hanya meng-*acknowledge* lokal dan
  tidak mengirim ke mana-mana.
- **Tidak ada `app/layout.tsx`.** App ini punya dua root layout —
  `app/(main)/layout.tsx` dan `app/(academy)/layout.tsx` — masing-masing dengan
  `<html>`, `<body>`, dan stylesheet sendiri. Ini disengaja dan *load-bearing*:
  kedua stylesheet mendefinisikan `--color-muted` dengan nilai berbeda.
- Harga di halaman marketing **selalu diturunkan** lewat `lib/pricing.ts`, tidak
  pernah ditulis manual. Data sumbernya tidak seragam (ada yang berprefiks `Rp`,
  durasi 30/60/90 menit, ada service yang cuma punya satu tier). Ini sudah
  menyebabkan harga publik salah tiga kali — lihat `CLAUDE.md` → "Data hazards".

---

## 2. Model data

### 2.1 Kenapa tidak langsung pakai `lib/data/services.ts`

Data service di repo adalah **konten marketing** (9 service, tiap service punya
1–2 tier harga, dua di antaranya `tiers: []`). Katalog booking yang lama **tidak
sama**: screenshot menunjukkan varian yang tidak ada di repo — *Sports Massage
90 menit Rp1.000.000* dan *Lymphatic Massage 90 menit Rp1.000.000* — padahal
`lib/data/services.ts` hanya punya versi 60 menit.

Jadi: **DB adalah sumber kebenaran untuk katalog booking**, di-*seed* dari
`lib/data/services.ts` lalu diperluas dengan varian tambahan yang didefinisikan
di satu file. Konsekuensinya harga bisa menyimpang antara halaman marketing dan
halaman booking — itu bug yang mahal dan sudah pernah terjadi. Mitigasi di §10.

### 2.2 Pemetaan tier → therapist

Dari screenshot booking lama: staff yang bisa dipilih adalah **"Master Therapist
– Ginny"** dan **"Yuni"**, dan setelah Ginny dipilih, daftar service menampilkan
harga tier Master (Trauma Healing Rp1.500.000, Lymphatic 60m Rp750.000 — cocok
persis dengan kolom Master di `lib/data/services.ts`).

Artinya tier **melekat pada therapist**, bukan dipilih terpisah. Model yang dipakai:

- `Therapist.tier` = `MASTER` (Ginny) atau `STANDARD` (Yuni)
- `ServiceVariant` = kombinasi (service × durasi × tier) → satu harga
- Setelah staff dipilih, daftar service memfilter varian ke tier staff tersebut
- "Any Staff" menampilkan harga **terendah** yang tersedia; therapist di-*assign*
  saat submit

### 2.3 Schema

```prisma
// prisma/schema.prisma

enum TherapistTier      { MASTER STANDARD }
enum BookingStatus      { PENDING CONFIRMED COMPLETED CANCELLED NO_SHOW }
enum NotificationChannel { EMAIL WHATSAPP }
enum NotificationKind {
  CUSTOMER_CONFIRMATION  ADMIN_NEW_BOOKING
  CUSTOMER_REMINDER      CUSTOMER_CANCELLED
  ADMIN_CANCELLED        CUSTOMER_RESCHEDULED
}
enum JobStatus { PENDING SENT FAILED DEAD }

model Therapist {
  id          String   @id @default(cuid())
  slug        String   @unique          // "ginny", "yuni" — sinkron dgn lib/data/therapists.ts
  name        String
  displayName String                    // "Master Therapist - Ginny"
  tier        TherapistTier
  email       String?
  phoneE164   String?                   // notifikasi WA ke therapist
  photo       String?
  active      Boolean  @default(true)
  sortOrder   Int      @default(0)

  services     ServiceOnTherapist[]
  workingHours WorkingHour[]
  timeOff      TimeOff[]
  bookings     Booking[]
}

model ServiceCategory {
  id        String @id @default(cuid())
  slug      String @unique
  name      String                       // "Trauma Healing", "Sports Massage", ...
  sortOrder Int    @default(0)
  services  Service[]
}

model Service {
  id            String  @id @default(cuid())
  slug          String  @unique          // sinkron dgn lib/data/services.ts
  title         String
  excerpt       String?
  image         String?
  bufferMinutes Int     @default(15)     // jeda bersih-bersih setelah sesi
  active        Boolean @default(true)
  sortOrder     Int     @default(0)

  categoryId String?
  category   ServiceCategory? @relation(fields: [categoryId], references: [id])

  variants   ServiceVariant[]
  therapists ServiceOnTherapist[]
}

model ServiceVariant {
  id              String        @id @default(cuid())
  serviceId       String
  service         Service       @relation(fields: [serviceId], references: [id], onDelete: Cascade)
  tier            TherapistTier
  durationMinutes Int
  /// Rupiah penuh sebagai integer. JANGAN Float — 750000, bukan 750000.00
  priceIdr        Int
  active          Boolean       @default(true)

  bookings Booking[]
  @@unique([serviceId, tier, durationMinutes])
}

model ServiceOnTherapist {
  therapistId String
  serviceId   String
  therapist   Therapist @relation(fields: [therapistId], references: [id], onDelete: Cascade)
  service     Service   @relation(fields: [serviceId],   references: [id], onDelete: Cascade)
  @@id([therapistId, serviceId])
}

/// Jam kerja mingguan per therapist. Boleh >1 baris per hari (pagi & sore),
/// supaya istirahat 12:00-14:00 muncul sebagai celah — seperti di booking lama.
model WorkingHour {
  id          String    @id @default(cuid())
  therapistId String
  therapist   Therapist @relation(fields: [therapistId], references: [id], onDelete: Cascade)
  weekday     Int       // 0 = Minggu … 6 = Sabtu
  startMinute Int       // menit sejak 00:00 WITA. 09:00 = 540
  endMinute   Int       // 12:00 = 720
  @@index([therapistId, weekday])
}

/// Cuti, libur nasional, blokir ad-hoc. therapistId null = tutup untuk semua.
model TimeOff {
  id          String     @id @default(cuid())
  therapistId String?
  therapist   Therapist? @relation(fields: [therapistId], references: [id], onDelete: Cascade)
  startAt     DateTime   // UTC
  endAt       DateTime   // UTC
  reason      String?
  @@index([therapistId, startAt])
}

model Customer {
  id        String    @id @default(cuid())
  email     String?
  phoneE164 String
  firstName String
  lastName  String?
  createdAt DateTime  @default(now())
  bookings  Booking[]
  @@index([phoneE164])
  @@index([email])
}

model Booking {
  id        String @id @default(cuid())
  /// Kode pendek untuk manusia: "FF-8KQ2M". Ini yang dikirim di WA & email.
  reference String @unique

  customerId  String
  customer    Customer       @relation(fields: [customerId],  references: [id])
  therapistId String
  therapist   Therapist      @relation(fields: [therapistId], references: [id])
  variantId   String
  variant     ServiceVariant @relation(fields: [variantId],   references: [id])

  /// UTC. endAt = startAt + durationMinutes + bufferMinutes.
  /// Buffer ikut disimpan supaya constraint anti-tabrakan otomatis menghormatinya.
  startAt DateTime
  endAt   DateTime

  status BookingStatus @default(CONFIRMED)
  note   String?

  /// Snapshot harga saat booking dibuat. Harga katalog boleh berubah nanti;
  /// yang tercetak di email pelanggan tidak boleh ikut berubah.
  priceIdrAtBooking Int
  durationMinutes   Int

  /// Disiapkan untuk payment gateway (§9). Belum dipakai di v1.
  holdExpiresAt DateTime?

  /// HMAC token untuk link kelola-booking & unduh .ics tanpa login.
  manageToken String @unique

  /// Naik tiap kali booking diubah; masuk ke field SEQUENCE di .ics supaya
  /// kalender customer meng-update event lama, bukan bikin duplikat.
  icsSequence Int @default(0)

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  cancelledAt DateTime?
  cancelledBy String?   // "customer" | "admin"

  notifications NotificationJob[]

  @@index([therapistId, startAt])
  @@index([startAt])
  @@index([status])
}

/// Antrean outbound. Booking di-commit dulu, notifikasi menyusul — supaya WAHA
/// yang sedang logout tidak pernah menggagalkan booking pelanggan.
model NotificationJob {
  id        String  @id @default(cuid())
  bookingId String
  booking   Booking @relation(fields: [bookingId], references: [id], onDelete: Cascade)

  channel NotificationChannel
  kind    NotificationKind
  target  String                          // email atau nomor E.164

  status      JobStatus @default(PENDING)
  attempts    Int       @default(0)
  lastError   String?
  scheduledAt DateTime  @default(now())   // reminder H-1 dijadwalkan ke depan
  sentAt      DateTime?
  createdAt   DateTime  @default(now())

  @@index([status, scheduledAt])
  @@unique([bookingId, channel, kind])    // idempoten: retry tidak menggandakan
}

model AdminUser {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String
  createdAt    DateTime @default(now())
}

model AuditLog {
  id        String   @id @default(cuid())
  actor     String
  action    String
  entity    String
  entityId  String
  meta      Json?
  createdAt DateTime @default(now())
  @@index([entity, entityId])
}
```

### 2.4 Anti double-booking — bagian yang wajib benar

Dua orang menekan "Confirm" untuk slot yang sama dalam detik yang sama adalah
kegagalan paling memalukan di sistem booking, dan pola `SELECT`-lalu-`INSERT`
biasa **tidak** mencegahnya. Postgres punya jawabannya secara native:

```sql
-- prisma/migrations/<ts>_booking_no_overlap/migration.sql  (tulis tangan)
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Booking"
  ADD CONSTRAINT booking_no_overlap
  EXCLUDE USING gist (
    "therapistId" WITH =,
    tsrange("startAt", "endAt", '[)') WITH &&
  )
  WHERE (status IN ('PENDING', 'CONFIRMED'));
```

**`tsrange`, bukan `tstzrange`.** Prisma memetakan `DateTime` ke `timestamp(3)`
— tanpa time zone — dan selalu menulis UTC ke sana. Membungkusnya dengan
`tstzrange` memaksa Postgres menyisipkan cast implisit `timestamp → timestamptz`,
yang bersifat STABLE (tergantung `TimeZone` session), bukan IMMUTABLE. Index
expression wajib immutable, jadi versi itu bukan gagal diam-diam nanti — ia
langsung menolak membuat constraint-nya.

Database menolak baris kedua yang bertabrakan, apa pun yang terjadi di level
aplikasi. Kode menangkap error `23P01` (`exclusion_violation`) dan mengubahnya
jadi pesan ramah: *"Maaf, slot ini baru saja diambil orang lain."*

Prisma tidak bisa membuat constraint ini dari schema — buat migration kosong
(`prisma migrate dev --create-only`) lalu tulis SQL-nya sendiri.

---

## 3. Mesin ketersediaan (availability engine)

Bagian yang paling sering diam-diam salah, dan satu-satunya yang wajib punya
unit test.

**Lokasi:** `lib/booking/availability.ts` — fungsi murni tanpa akses DB, supaya
bisa dites tanpa database.

```
slotsFor({
  workingHours,     // WorkingHour[] therapist di weekday tsb
  existingBookings, // {startAt, endAt}[] yang overlap hari itu
  timeOff,          // TimeOff[] yang overlap
  date,             // tanggal lokal WITA
  durationMinutes,
  bufferMinutes,
  stepMinutes,      // granularitas awal sesi; default 30
  leadTimeMinutes,  // tidak bisa booking < N menit dari sekarang; default 120
  now,
}) => Slot[]
```

Aturan:

1. Buat kandidat waktu mulai tiap `stepMinutes` di dalam tiap blok jam kerja.
2. Buang kandidat yang `start + duration + buffer` melewati akhir blok. Ini yang
   otomatis menghasilkan istirahat siang seperti di booking lama: blok pagi
   09:00–12:00 dengan durasi 90 menit hanya memuat 09:00 dan 10:30.
3. Buang yang bertabrakan dengan booking existing atau time-off.
4. Buang yang lebih awal dari `now + leadTime`.
5. Kelompokkan ke **Morning** (<12:00), **Afternoon** (12:00–17:00), **Evening**
   (≥17:00) — persis seperti UI lama.

**"Any Staff"**: jalankan per therapist yang menawarkan service tsb, lalu
gabungkan berdasarkan jam mulai. `slotsLeft` = jumlah therapist yang bebas di jam
itu — itulah asal label *"1 Slots left"* / *"0 Slots left"*. Slot dengan 0 tetap
ditampilkan tapi disabled, sama seperti aslinya. Therapist di-*assign* saat
submit (yang paling sedikit booking hari itu, agar merata).

**Timezone.** Satu file, satu konstanta:

```ts
// lib/booking/time.ts
export const STUDIO_TZ = "Asia/Makassar";  // WITA, UTC+8, tanpa DST
```

DB menyimpan UTC. Semua yang dilihat manusia — kalender, slot, email, WA, .ics —
dirender di `STUDIO_TZ`. Server Vercel berjalan di UTC, jadi setiap `new Date()`
yang tidak lewat helper adalah bug yang menunggu. Pakai `date-fns` + `@date-fns/tz`.

**Endpoint kalender bulanan** (`/api/booking/availability?month=`) mengembalikan
peta hari → tersedia/penuh/tutup, supaya grid kalender bisa mewarnai sel yang
tidak bisa diklik tanpa menembak 30 request.

---

## 4. Halaman & route

### 4.1 Publik

```
app/(main)/booking/page.tsx                            wizard 5 langkah
app/(main)/booking/confirmation/[reference]/page.tsx   sukses + Add to Calendar
app/(main)/booking/manage/[token]/page.tsx             batal / reschedule
```

Route ada di dalam `(main)` supaya mewarisi header, footer, dan `globals.css`
yang sudah ada — tidak ada root layout baru untuk sisi publik.

### 4.2 Panel admin

```
app/(admin)/layout.tsx                  root layout ketiga, stylesheet sendiri
app/(admin)/admin/login/page.tsx
app/(admin)/admin/page.tsx              agenda hari ini
app/(admin)/admin/bookings/page.tsx     daftar + filter + detail + batal/pindah
app/(admin)/admin/schedule/page.tsx     jam kerja & time-off
app/(admin)/admin/services/page.tsx     katalog & harga
app/(admin)/admin/settings/page.tsx     status WAHA, tes kirim, log notifikasi
```

Admin sengaja jadi **root layout ketiga**, konsisten dengan pola dua-root-layout
yang sudah ada. Dua hal yang menggigit kalau lupa:

- Tailwind v4 memindai dari direktori tempat file CSS berada, jadi
  `app/(admin)/admin.css` **harus** mendeklarasikan `@source` sendiri untuk setiap
  folder yang dipakainya, atau class-nya diam-diam tidak ter-*compile*.
- Panel admin **wajib** `noindex, nofollow` di metadata layout-nya.

Route `/admin/*` dilindungi `middleware.ts` (cookie sesi bertanda tangan).

### 4.3 API

| Method | Route | Fungsi |
|---|---|---|
| GET | `/api/booking/staff` | Therapist aktif + label tier |
| GET | `/api/booking/services?therapistId=` | Service + varian, difilter ke tier therapist |
| GET | `/api/booking/availability?therapistId=&variantId=&month=` | Hari mana yang bisa diklik |
| GET | `/api/booking/slots?therapistId=&variantId=&date=` | Slot per hari, dikelompokkan pagi/siang/sore |
| POST | `/api/booking` | Buat booking (Zod + transaksi + antrean notifikasi) |
| POST | `/api/booking/[token]/cancel` | Pembatalan oleh customer |
| POST | `/api/booking/[token]/reschedule` | Pindah jadwal oleh customer |
| GET | `/api/booking/[token]/calendar.ics` | File .ics |
| POST | `/api/cron/reminders` | Antrekan reminder H-1 |
| POST | `/api/cron/dispatch` | Kirim & retry job yang tertunda |
| POST | `/api/admin/*` | Aksi panel admin |

Semua body divalidasi dengan **Zod**, skemanya dipakai bersama client dan server
dari `lib/booking/schema.ts` — satu definisi, tidak ada dua aturan validasi yang
bisa berbeda.

---

## 5. UI wizard

Satu komponen client (`components/booking/BookingWizard.tsx`) dengan
`useReducer`. Langkah aktif disimpan di query string (`?step=service`) supaya
tombol Back browser berfungsi, dan draft disimpan ke `sessionStorage` supaya
refresh tidak menghapus isian.

**Langkah 1 — Staff.** Tiga kartu: Any Staff, Ginny (Master), Yuni. Foto dari
`lib/data/therapists.ts` yang sudah ada.

**Langkah 2 — Service.** Chip kategori (ALL / Trauma Healing / Lymphatic / …)
lalu grid kartu service: foto, judul, durasi, harga. Harga selalu dari
`ServiceVariant.priceIdr` lewat satu formatter.

**Langkah 3 — Date & Time.** Grid kalender bulanan di kiri (hari tutup/penuh
tidak bisa diklik), daftar slot dikelompokkan Morning/Afternoon/Evening di kanan,
tiap slot menampilkan sisa kuota. Persis bentuk UI lama.

**Langkah 4 — Basic Details.** Firstname\*, Lastname, Email, Phone\* (input
dengan pemilih negara — `libphonenumber-js` untuk normalisasi ke E.164; nomor ini
yang dipakai WAHA), Note. Plus honeypot + Turnstile (§10).

**Langkah 5 — Summary.** Ringkasan semua pilihan, total harga, kebijakan
pembatalan, tombol Confirm.

**Aturan desain — ikuti `DESIGN.md`, jangan bikin sistem baru:**

- Ground cream, kartu putih `CARD` dari `components/ui/tokens.ts`, sudut 10px,
  **tanpa shadow** — kedalaman dari overlap, bukan drop shadow
- Tombol `BTN_SOLID` / `BTN_GHOST`, field `FIELD`, focus ring `FOCUS`
- Ukur pakai `.page-wrap` / `.page-band`
- Amatic SC untuk display, Andika untuk body
- **Tidak ada elemen yang dikirim dengan `opacity: 0`** (gotcha #3 di `CLAUDE.md`)
- **Jangan pakai varian breakpoint arbitrary Tailwind** (`max-[1280px]:hidden`) —
  di project ini terbukti gagal diam-diam. Semua yang responsif dan penting
  ditulis sebagai `@media` eksplisit di `app/(main)/globals.css` (gotcha #2)
- Verifikasi di 390 / 768 / 1280px, seperti route lain

**Aksesibilitas:** stepper adalah `<ol>` dengan `aria-current="step"`; pilihan
staff/service/slot adalah `<button>` sungguhan dalam `role="radiogroup"`, bukan
`<div onClick>`; perubahan langkah diumumkan lewat live region; setiap field
punya `<label>` terlihat — bukan placeholder saja, mengikuti pola `ContactForm`.

---

## 6. Notifikasi

### 6.1 Bentuk arsitektur — ini yang penting

Booking **di-commit lebih dulu**, notifikasi menyusul. WAHA bisa logout, SendGrid
bisa rate-limit — tidak satu pun boleh membuat customer melihat error padahal
slotnya sudah tersimpan.

```
POST /api/booking
  └─ transaksi: buat Customer + Booking + baris NotificationJob (PENDING)
  └─ commit → langsung balas 200 ke browser
  └─ after() dari next/server: coba kirim semua job sekarang juga
        (Next 16 menjalankannya setelah response terkirim — tidak menahan user)
  └─ yang gagal tetap PENDING → /api/cron/dispatch mencobanya lagi
```

Retry dengan *backoff*: 1m, 5m, 15m, 1j, 6j. Setelah 5 percobaan → `DEAD` +
peringatan email ke admin. Constraint `@@unique([bookingId, channel, kind])`
membuat retry idempoten — tidak akan pernah ada WA dobel.

### 6.2 SendGrid

`lib/notifications/email.ts`, memakai `@sendgrid/mail`.

| Kind | Ke | Isi |
|---|---|---|
| `CUSTOMER_CONFIRMATION` | customer | Ringkasan booking, kode referensi, alamat + link Maps, kontak WA, link kelola booking, **lampiran `booking.ics`** |
| `ADMIN_NEW_BOOKING` | admin + therapist | Detail booking + nomor WA customer yang bisa langsung diklik |
| `CUSTOMER_REMINDER` | customer | H-1 jam 10:00 WITA |
| `CUSTOMER_CANCELLED` / `ADMIN_CANCELLED` | keduanya | Konfirmasi batal + `.ics` `METHOD:CANCEL` |

Template ditulis sebagai fungsi TypeScript yang mengembalikan HTML + plain text di
`lib/notifications/templates/`. Bukan SendGrid Dynamic Templates: kalau template
ada di dashboard, ia tidak ikut ter-*review*, tidak ter-*version*, dan bisa
berubah tanpa jejak. Palet mengikuti brand — olive `#6d7932`, cream `#f0efeb` —
dengan layout tabel yang aman di semua klien email.

> **Prasyarat DNS yang menghalangi go-live.** Email pengirim **tidak boleh**
> `Flexandflow06@gmail.com` — mengirim atas nama `gmail.com` lewat SendGrid gagal
> DMARC dan masuk spam. Perlu *Domain Authentication* di SendGrid untuk
> `flexandflow.fit` (3 CNAME), lalu kirim dari `booking@flexandflow.fit` dengan
> `Reply-To` ke alamat Gmail studio. Ini butuh akses DNS dari owner dan
> propagasinya bisa 24 jam — **urus di hari pertama, bukan di akhir.**

### 6.3 WAHA

`lib/notifications/whatsapp.ts`. App ini murni client HTTP; tidak ada apa pun
dari WAHA yang dibangun ulang.

```ts
await fetch(`${env.WAHA_BASE_URL}/api/sendText`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Api-Key": env.WAHA_API_KEY },
  body: JSON.stringify({
    session: env.WAHA_SESSION,     // biasanya "default"
    chatId:  toChatId(phoneE164),  // "+6285858887777" → "6285858887777@c.us"
    text:    message,
  }),
});
```

Yang perlu dari owner — **hanya empat hal**:

1. `WAHA_BASE_URL` (harus bisa diakses publik dari Vercel, wajib HTTPS)
2. `WAHA_API_KEY`
3. `WAHA_SESSION` (nama session yang sudah ter-*scan*)
4. `ADMIN_WHATSAPP_NUMBERS` — nomor admin, dipisah koma, format E.164. Di
   `lib/site.ts` nomor studio adalah `+6285858887777`; konfirmasi apakah nomor
   itu yang menerima notifikasi atau ada nomor lain

Pesan yang dikirim:

- **Ke customer** — konfirmasi berisi kode referensi, layanan, therapist, tanggal
  & jam WITA, harga, alamat, link "Add to Calendar", link kelola booking
- **Ke admin & therapist** — booking baru, dengan nomor customer sebagai link
  `wa.me` supaya bisa langsung dibalas
- **Ke customer** — reminder H-1
- **Ke keduanya** — notifikasi pembatalan

Detail yang menyelamatkan:

- Panggil `POST /api/contacts/check-exists` sebelum kirim. Kalau nomornya tidak
  terdaftar di WhatsApp, jangan retry lima kali — tandai `DEAD` dan catat
  alasannya; email tetap terkirim.
- Halaman `/admin/settings` menampilkan `GET /api/sessions/{session}`. Kalau
  status bukan `WORKING`, tampilkan banner merah. **Session WAHA yang logout
  diam-diam adalah mode kegagalan paling mungkin dari seluruh sistem ini.**
- Cek harian dari cron: kalau session tidak `WORKING`, kirim email ke admin.
- Email selalu dikirim, bahkan saat WA berhasil. Email adalah jaring pengaman.

> **Catatan keamanan.** Vercel tidak punya IP keluar tetap di paket Hobby/Pro
> biasa, jadi *IP allowlist* di sisi WAHA tidak praktis. Pengamanannya: HTTPS +
> API key panjang & acak + rate limit di reverse proxy WAHA + path yang tidak
> mudah ditebak. Jangan pernah pasang WAHA di HTTP polos.

---

## 7. Kalender (.ics)

`lib/calendar/ics.ts` — menghasilkan VCALENDAR tanpa dependency tambahan
(formatnya sederhana; library `ics` boleh dipakai kalau lebih disukai).

```
BEGIN:VEVENT
UID:<booking.id>@flexandflow.fit
SEQUENCE:<booking.icsSequence>          ← naik saat reschedule/cancel
DTSTAMP / DTSTART / DTEND               ← UTC, format Z
SUMMARY:Assisted Stretching — Flex & Flow
LOCATION:Jl. Toya Ning II, Ungasan, Kec. Kuta Sel., Denpasar, Bali
DESCRIPTION:<therapist, durasi, kode referensi, link kelola>
ORGANIZER;CN=Flex & Flow:mailto:booking@flexandflow.fit
BEGIN:VALARM  TRIGGER:-PT60M  END:VALARM   ← alarm 1 jam sebelum
END:VEVENT
```

Tiga jalan menuju kalender HP customer:

1. **Lampiran di email konfirmasi** (`text/calendar`). Di iOS dan Android, tap
   lampiran → kalender bawaan menawarkan tambah event. Ini jalur utamanya.
2. **Tombol di halaman konfirmasi** — "Add to Google Calendar" (link
   `calendar.google.com/calendar/render?action=TEMPLATE&…`) dan "Download .ics"
   untuk Apple/Outlook.
3. **Link di pesan WhatsApp** ke halaman konfirmasi, yang memuat kedua tombol itu.

`SEQUENCE` yang naik ditambah `UID` yang sama berarti reschedule **meng-update**
event yang sudah ada di kalender customer, bukan membuat duplikat — detail kecil
yang selisihnya besar di pengalaman pemakaian.

Route `.ics` dilindungi `manageToken`, bukan hanya ID, supaya jadwal orang lain
tidak bisa dipanen dengan menebak URL.

---

## 8. Cron (Vercel)

```yaml
# .github/workflows/booking-cron.yml
on:
  schedule:
    - cron: "*/30 * * * *"   # retry pesan yang gagal
    - cron: "0 2 * * *"      # reminder H-1
  workflow_dispatch:
```

`0 2 * * *` UTC = **10:00 WITA**, jam yang wajar untuk mengirim reminder H-1.
Kedua endpoint memeriksa header `Authorization: Bearer ${CRON_SECRET}`.

> **Bukan Vercel Cron.** Paket Hobby hanya mengizinkan satu job sehari dengan
> waktu yang tidak presisi — tidak cukup untuk loop retry — dan tingkat
> berikutnya berbayar untuk dua `curl` sehari. Dipindah ke GitHub Actions.
>
> Intervalnya 30 menit, bukan 10: di repo **privat** tiap run ditagih dibulatkan
> ke menit penuh dan paket Free hanya memberi 2.000 menit/bulan, sedangkan
> `*/10` ≈ 4.320 run. Kalau repo-nya publik, menit Actions tidak dihitung dan
> `*/10` gratis sekaligus lebih baik.
>
> Alternatif terbaik kalau tidak mau Actions: cron di VPS yang sudah menjalankan
> WAHA — presisi, gratis, tanpa kuota. Detail lengkapnya di `CRON.md`.

---

## 9. Menyiapkan tempat untuk payment gateway

Gateway belum ditentukan, jadi v1 tidak memuat kode pembayaran apa pun. Yang
dilakukan sekarang hanya memastikan penambahannya nanti **tidak** memaksa
merombak schema atau alur:

- `Booking.holdExpiresAt` sudah ada di schema (belum dipakai). Nanti: buat
  booking sebagai `PENDING` dengan hold 15 menit, dan cron yang sama yang
  mengirim notifikasi juga menyapu hold yang kedaluwarsa.
- `BookingStatus` menyisakan ruang untuk `AWAITING_PAYMENT` sebagai satu nilai
  enum tambahan — migrasi satu baris.
- Constraint anti-tabrakan sudah mencakup `PENDING`, jadi booking yang menunggu
  bayar tetap memblokir slotnya. Tidak ada perubahan yang diperlukan.
- Perubahan status dipusatkan di `lib/booking/transitions.ts` — satu file yang
  perlu disentuh saat webhook pembayaran ditambahkan, bukan tersebar di belasan
  route.
- `priceIdrAtBooking` sudah disimpan, jadi jumlah tagihan tidak bergeser saat
  harga katalog berubah.

Perkiraan pekerjaan menambahkan gateway nanti (Midtrans/Xendit): **3–4 hari** —
route pembuatan transaksi, webhook, halaman status, refund, rekonsiliasi.

---

## 10. Risiko & mitigasi

| # | Risiko | Mitigasi |
|---|---|---|
| 1 | **Session WAHA logout diam-diam**, notifikasi berhenti tanpa ada yang sadar | Cek kesehatan di panel admin + peringatan email harian + email selalu dikirim sebagai cadangan |
| 2 | **Email masuk spam** karena mengirim atas nama gmail.com | Domain Authentication SendGrid untuk `flexandflow.fit`, kirim dari `booking@`, `Reply-To` ke Gmail studio. **Urus di hari pertama** |
| 3 | **Double booking** | Constraint `EXCLUDE USING gist` di Postgres — ditegakkan database, bukan aplikasi |
| 4 | **Bug timezone** — server UTC, studio WITA | Satu konstanta `STUDIO_TZ`, semua konversi lewat `lib/booking/time.ts`, unit test yang menyertakan batas tengah malam |
| 5 | **Harga booking menyimpang dari harga di halaman marketing** — sudah pernah salah 3 kali dengan data yang ada | Script `npm run check:prices` membandingkan `ServiceVariant` terhadap `lib/pricing.ts` untuk setiap pasangan (service, tier, durasi) yang ada di keduanya, dan gagal di CI kalau berbeda |
| 6 | **Booking spam / bot** | Honeypot + rate limit per IP & per nomor + **Cloudflare Turnstile** (repo ini sudah punya skill `turnstile-spin` untuk memasangnya) |
| 7 | **Batas cron Vercel Hobby** | Panggil endpoint cron dari VPS WAHA, atau naik ke Pro |
| 8 | **Kehilangan SEO** saat memindahkan `/appointment/` dari WordPress | 308 dari `/appointment/` ke `/booking/`, update sitemap, jangan hapus URL lama sampai redirect terpasang. Lihat §12 |
| 9 | **Cold start Neon** menambah latensi request pertama | Driver serverless Neon + Prisma `driverAdapters`; connection pooling lewat PgBouncer bawaan Neon |
| 10 | **Data pribadi** (nama, email, nomor HP) | HTTPS di mana-mana, tidak ada data pelanggan di log, halaman kelola-booking dilindungi HMAC token, retensi: hapus booking >2 tahun lewat cron |

---

## 11. Fase pengerjaan

| Fase | Isi | Perkiraan |
|---|---|---|
| **0. Fondasi** | Dependency, Neon + Prisma, `lib/env.ts` (validasi env dengan Zod — gagal saat boot, bukan saat runtime), helper timezone, test runner | 1 hari |
| **1. Data & seed** | Schema + migrasi + constraint EXCLUDE, seed dari `lib/data/*` + varian tambahan, jam kerja Ginny & Yuni | 2 hari |
| **2. Availability** | Mesin slot + unit test (batas tengah malam, hari libur, "Any Staff", buffer) + endpoint bulanan/harian | 2 hari |
| **3. UI wizard** | 5 langkah, stepper, kalender, grid slot, form, ringkasan. Responsif 390/768/1280 | 4 hari |
| **4. Pembuatan booking** | Validasi Zod, transaksi, penanganan error 23P01, kode referensi, halaman konfirmasi, generator .ics + tombol Add to Calendar | 2 hari |
| **5. Notifikasi** | Client SendGrid + WAHA, template, job table, `after()`, cron dispatch & reminder, health check | 3 hari |
| **6. Panel admin** | Login, agenda hari ini, daftar booking + batal/pindah, editor jam kerja & time-off, katalog & harga, log notifikasi | 3 hari |
| **7. Kelola booking** | Halaman token: batal & reschedule oleh customer, .ics `METHOD:CANCEL`, notifikasi ikutan | 2 hari |
| **8. Cutover** | Turnstile, rate limit, redirect, tautkan 4 CTA, sitemap, update `CLAUDE.md`/`DESIGN.md`/`SITE-STRUCTURE.md`, uji asap end-to-end | 1 hari |

**Total ± 20 hari kerja.** Jalur kritisnya Fase 2 (mesin slot) dan Fase 5
(notifikasi) — keduanya banyak *edge case* dan sedikit hal yang kelihatan.

**Bisa dipangkas jadi ± 12 hari** kalau Fase 6 dikurangi jadi hanya agenda +
daftar booking (jam kerja dan katalog diatur lewat seed/SQL untuk sementara), dan
Fase 7 ditunda — pembatalan lewat WhatsApp seperti sekarang.

---

## 12. Cutover

Berurutan, jangan diacak:

1. Deploy ke URL preview Vercel dengan database *staging*. Uji end-to-end pakai
   nomor WA dan email sungguhan.
2. Domain Authentication SendGrid selesai & terverifikasi (lakukan lebih awal —
   DNS lambat).
3. Seed database produksi. Owner memverifikasi **setiap harga dan durasi**
   terhadap price list resmi sebelum lanjut.
4. Ubah `lib/site.ts`: `wordpressUrls.booking` → route internal `/booking/`.
   Komentar di file itu yang berbunyi *"never route those through `next/link`"*
   sekarang hanya berlaku untuk price list — perbarui, jangan dibiarkan
   menyesatkan.
5. Ubah `next.config.ts`: hapus redirect `/booking` dan `/appointment` ke
   WordPress, ganti `/appointment` → 308 permanen ke `/booking/` (`/appointment/`
   adalah URL yang terindeks — jangan sampai 404). Ingat `trailingSlash: true`.
6. Tautkan 4 CTA (Header, MobileNav, ServicePriceCard, ServiceArticle) ke
   `/booking/`.
7. Nonaktifkan halaman appointment di WordPress **hanya setelah** redirect
   terbukti bekerja.
8. Pantau seminggu: tingkat kegagalan job notifikasi, tingkat penyelesaian
   booking, error 5xx.

**Rollback:** kembalikan redirect di `next.config.ts` dan `wordpressUrls.booking`
— dua baris, dan booking kembali ke WordPress. Data booking yang sudah masuk
tetap aman di database; admin memprosesnya manual.

---

## 13. Environment variables

```bash
# Database
DATABASE_URL=                 # Neon, pooled
DIRECT_URL=                   # Neon, direct — untuk prisma migrate

# Email
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=booking@flexandflow.fit
SENDGRID_FROM_NAME=Flex & Flow
SENDGRID_REPLY_TO=Flexandflow06@gmail.com
ADMIN_NOTIFY_EMAILS=Flexandflow06@gmail.com

# WhatsApp (server WAHA milik sendiri)
WAHA_BASE_URL=
WAHA_API_KEY=
WAHA_SESSION=default
ADMIN_WHATSAPP_NUMBERS=+6285858887777

# Booking
BOOKING_TIMEZONE=Asia/Makassar
BOOKING_LEAD_TIME_MINUTES=120
BOOKING_MAX_ADVANCE_DAYS=60
BOOKING_TOKEN_SECRET=         # HMAC untuk link manage & .ics

# Admin & cron
ADMIN_SESSION_SECRET=
CRON_SECRET=

# Anti-spam
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

NEXT_PUBLIC_SITE_URL=https://flexandflow.fit
```

Semuanya divalidasi saat boot lewat `lib/env.ts` (Zod). Env yang hilang harus
menghentikan build, bukan muncul sebagai `undefined` di dalam URL WAHA jam 11
malam.

---

## 14. Dependency yang ditambahkan

```
prisma  @prisma/client  @prisma/adapter-neon  @neondatabase/serverless
zod
@sendgrid/mail
date-fns  @date-fns/tz
libphonenumber-js
nanoid                 # kode referensi booking
bcryptjs               # password admin
vitest                 # test mesin availability
```

Repo ini sengaja berdependency minim (saat ini hanya next/react/tailwind). Semua
yang di atas dipakai langsung dan tidak ada duplikasi fungsi. Tidak ada UI
library dan tidak ada form library — komponen mengikuti `components/ui/tokens.ts`
yang sudah ada, dan form memakai state React biasa seperti `ContactForm`.

---

## 15. Yang perlu keputusan owner sebelum go-live

Ditemukan saat implementasi, bukan saat menulis rencana. Semuanya menghalangi
go-live sampai dijawab.

### 15.1 Pregnancy massage tier Therapist tidak bisa di-booking

`lib/data/services.ts` mencantumkan tier Therapist untuk pregnancy massage
seharga Rp750.000, tapi **tanpa durasi** — dan `pregnancy-massage-service` juga
tidak punya `duration` di level service, jadi tidak ada yang bisa dijadikan
panduan panjang sesi. Slot tidak bisa dibuat dari harga saja.

Konsekuensinya: **Yuni tidak bisa menerima pregnancy massage** sampai owner
menyebutkan durasinya. Versi Ginny (90 menit, Rp1.000.000) tetap bisa dibooking.

*Yang dibutuhkan: durasi sesi pregnancy massage tier Therapist.*

### 15.2 Dua varian 90 menit belum terverifikasi

Seed membuat dua varian yang **tidak ada di price list mana pun** — keduanya
diambil dari screenshot booking lama:

| Layanan | Tier | Durasi | Harga |
|---|---|---|---|
| Sports Massage | Master | 90 menit | Rp1.000.000 |
| Lymphatic Drainage | Master | 90 menit | Rp1.000.000 |

Keduanya ditandai di `prisma/seed.ts` dalam array `EXTRA_VARIANTS`, dan
`npm run check:prices` melaporkannya sebagai informasi — bukan kegagalan —
karena tidak ada pembanding. **Ini satu-satunya harga di sistem yang tidak bisa
diverifikasi otomatis.**

*Yang dibutuhkan: konfirmasi kedua harga, atau perintah menghapusnya.*

### 15.3 Tiga layanan tidak ada di menu booking

- **Facial massage** dan **full body massage** — keduanya `tiers: []`, tidak
  punya tarif yang dipublikasikan, jadi tidak ada yang bisa ditagihkan.
- **Outcall / home service massage** — ada di menu navigasi tapi tidak ada di
  `lib/data/services.ts` sama sekali. Ini celah yang sudah ada sebelumnya, bukan
  akibat pekerjaan booking, tapi berarti layanan itu tidak bisa dibooking online.

*Yang dibutuhkan: harga dan durasi untuk layanan yang memang ingin dibooking
online. Home service kemungkinan juga butuh alamat pelanggan dan biaya
perjalanan — keduanya belum ada di form.*

### 15.4 Jam kerja: dua angka yang berbeda

`lib/site.ts` mengiklankan **Senin–Jumat 08:00–17:00**. Booking lama menawarkan
slot **09:00–12:00 dan 14:00–17:00**. Seed mengikuti yang kedua karena itu yang
benar-benar bisa dipesan orang, dan itu yang memunculkan istirahat siang.

Selisihnya nyata: satu jam di pagi hari yang diiklankan tapi tidak bisa dipesan.

*Yang dibutuhkan: mana yang benar. Bisa diubah sendiri di `/admin/schedule`
tanpa menyentuh kode.*

### 15.5 Kontak therapist masih memakai nomor studio

Ginny dan Yuni sama-sama di-seed dengan email dan nomor WhatsApp studio, karena
itu satu-satunya yang ada di repo. Artinya notifikasi "booking baru" untuk
keduanya masuk ke tempat yang sama.

*Yang dibutuhkan: email dan nomor masing-masing, kalau memang mau dipisah.
Diubah di panel admin.*

### 15.6 Kebijakan pembatalan belum ditentukan

`BOOKING_CANCEL_CUTOFF_HOURS` default **12 jam** — di dalam 12 jam sebelum sesi,
pelanggan tidak bisa membatalkan sendiri dan diarahkan ke WhatsApp. Angka ini
tebakan yang masuk akal, bukan kebijakan studio.

*Yang dibutuhkan: berapa jam sebenarnya, dan apakah ada konsekuensi (biaya,
deposit hangus) yang harus tertulis di halaman ringkasan.*

---

## Status

Semua fase **sudah ditulis**. Belum ada satu pun yang dijalankan terhadap
database — belum ada databasenya. Anggap seluruhnya belum terverifikasi sampai
owner mengetesnya sendiri.

- [x] Fase 0 — Fondasi
- [x] Fase 1 — Data & seed
- [x] Fase 2 — Availability
- [x] Fase 3 — UI wizard
- [x] Fase 4 — Pembuatan booking
- [x] Fase 5 — Notifikasi
- [x] Fase 6 — Panel admin
- [x] Fase 7 — Kelola booking (batal + reschedule)
- [x] Fase 8 — Cutover wiring

Yang sudah diverifikasi secara statis: `npx tsc --noEmit` bersih, `npx eslint`
bersih (satu peringatan yang sudah ada sebelumnya di `app/(main)/layout.tsx`),
dan `next build` menghasilkan 62 halaman — naik dari 32 sebelum booking ada.

**Yang belum diverifikasi sama sekali**, dan hanya bisa dites dengan database
hidup + kredensial asli: migrasi (termasuk constraint `booking_no_overlap`),
seed, setiap query, pengiriman email, pengiriman WhatsApp, dan file `.ics` di
kalender sungguhan.

Langkah berikutnya ada di §12 (cutover) dan §15 (keputusan owner).
