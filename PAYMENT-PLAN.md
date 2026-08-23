# Pembayaran — rencana implementasi

Menambahkan pembayaran online ke sistem booking yang sudah jalan, dengan pilihan
**bayar sekarang** atau **bayar di studio**. Melanjutkan `BOOKING-PLAN.md` §9,
yang sudah menyiapkan tempatnya sejak awal.

Dokumen ini rencana, bukan catatan hasil. Belum ada satu baris kode pembayaran
yang ditulis.

---

## 0. Keputusan yang sudah diambil

| Hal | Keputusan |
|---|---|
| PayPal | **Ditunda.** IDR bukan mata uang transaksi PayPal, jadi harga Rp yang dipublikasikan harus ditagih dalam USD dengan kurs yang bergeser. Kartu internasional sudah tercakup gateway lokal tanpa itu. |
| Pilihan pelanggan | **Bayar sekarang** atau **bayar di studio** — keduanya, bukan salah satu |
| Gateway | **Xendit** (alasan di §2) |
| Mata uang | IDR, sama persis dengan yang tertulis di situs |
| Tampilan bayar | **Modal di halaman booking** untuk QRIS dan Virtual Account; kartu memakai komponen Xendit karena 3D Secure milik bank (§4) |

Belum diputuskan, dan menghalangi pekerjaan dimulai — lihat §10:
**bayar penuh atau deposit**, dan **kebijakan refund**.

---

## 1. Kenapa biayanya ditentukan metode, bukan vendor

Ini yang paling menghemat uang klien, dan paling sering terlewat.

Untuk satu booking Rp750.000, kisaran yang lazim di pasar Indonesia:

| Metode | Potongan | Terpotong | Sisa |
|---|---|---|---|
| Virtual Account | flat ±Rp4.000 | Rp4.000 | Rp746.000 |
| QRIS | 0,7% | Rp5.250 | Rp744.750 |
| E-wallet (GoPay/OVO/DANA/ShopeePay) | ±1,5–2% | ±Rp13.000 | Rp737.000 |
| Kartu Visa/Mastercard/JCB | ±2,9% + Rp2.000 | ±Rp23.750 | Rp726.250 |

**Selisih VA dan kartu hampir enam kali lipat.** Memilih antara Xendit dan
Midtrans hanya menggeser desimal ketiga; urutan metode di halaman bayar itulah
yang menentukan.

> **Angka di atas kisaran pasar, bukan penawaran.** Tarif berubah dan
> dinegosiasikan per merchant. Minta penawaran tertulis terbaru sebelum tanda
> tangan. Satu-satunya yang tidak bisa ditawar siapa pun: **MDR QRIS 0,7%
> ditetapkan Bank Indonesia**, jadi identik di semua gateway.

### Konsekuensi desainnya

Halaman pembayaran **mengurutkan QRIS dan Virtual Account di atas**, kartu di
bawah sebagai pilihan yang tetap ada. Bukan menyembunyikan kartu — turis
Australia dengan Visa harus tetap bisa bayar — tapi warga lokal dan ekspat yang
memang lebih suka QRIS tidak perlu memilih metode termahal karena itu yang
kebetulan muncul pertama.

Kalau 70% pelanggan memakai QRIS/VA, biaya rata-rata turun dari ±2,9% ke sekitar
1%. Pada omzet Rp50 juta sebulan itu selisih **±Rp950.000 per bulan**.

---

## 2. Gateway: Xendit

Dipilih dari Xendit, Midtrans, DOKU dan Duitku. Tarif keempatnya berdekatan —
QRIS diatur regulator, VA dan kartu bersaing ketat — jadi keputusannya bukan
soal harga.

**Kenapa Xendit:**

- **Invoice API** adalah hosted checkout: kita membuat invoice, mendapat
  `invoice_url`, pelanggan diarahkan ke sana dan memilih metodenya di halaman
  Xendit. (Kartu kini dikumpulkan di modal kita lewat Xendit.js — lihat §4 —
  tapi Invoice tetap dipakai untuk metode lain, dan nomor kartu tetap tidak
  pernah menyentuh server ini.)
- Satu integrasi memberi QRIS, seluruh virtual account bank besar, e-wallet
  (OVO, DANA, ShopeePay, LinkAja) dan kartu — persis campuran yang dibutuhkan
  studio dengan pelanggan turis sekaligus lokal.
- Masa berlaku invoice diatur lewat `invoice_duration`, jadi kedaluwarsa di sisi
  gateway bisa disetel lebih pendek dari hold kita (§11 risiko 3).
- Dokumentasi dan API-nya rapi, dan sandbox-nya lengkap: seluruh alur bisa dites
  tanpa uang sungguhan.

> **Periksa dokumentasi terbaru sebelum menulis kode.** Xendit sedang memindahkan
> alur pembayaran ke API **Payment Sessions** yang lebih baru, sementara
> **Invoice** masih dipakai luas dan stabil. Keduanya sama-sama menghasilkan URL
> hosted checkout, jadi rencana ini berlaku untuk keduanya — yang berubah hanya
> nama endpoint dan bentuk payload. Pilih yang direkomendasikan Xendit saat
> implementasi dimulai.

**Yang jujur perlu disebut:** Midtrans sama bagusnya dan lebih dikenal akuntan
maupun bank di Indonesia. Kalau penawaran mereka lebih baik, menukar tidak
merombak sistem — kode gateway dipisah ke satu modul (§7).

---

## 3. Dua jalur, satu wizard

Langkah **Summary** yang sekarang ada mendapat satu pilihan sebelum tombol
konfirmasi:

```
◉  Bayar di studio          Bayar tunai atau kartu saat datang
○  Bayar sekarang           QRIS, transfer bank, e-wallet, atau kartu
```

### Bayar di studio — persis seperti sekarang

Tidak ada yang berubah. Booking langsung `CONFIRMED`, konfirmasi email dan
WhatsApp keluar seketika. Ini yang jadi **default**, karena itu perilaku yang
sudah dipakai dan diuji.

### Bayar sekarang

```
Confirm
  └─ booking dibuat status AWAITING_PAYMENT, holdExpiresAt = now + 15 menit
  └─ invoice Xendit dibuat; QR / nomor VA tampil di modal (§4)
  └─ pelanggan membayar (atau tidak)
       ├─ callback PAID/SETTLED → CONFIRMED → notifikasi keluar
       │     └─ modal melihatnya lewat polling → halaman konfirmasi
       ├─ callback EXPIRED      → CANCELLED, slot bebas
       └─ tidak ada kabar       → cron menyapu hold kedaluwarsa → CANCELLED
```

**Slotnya sudah aman selama proses ini.** Constraint `booking_no_overlap` sudah
mencakup status yang menahan slot, jadi tidak ada orang lain yang bisa mengambil
jam itu selama 15 menit pelanggan membayar. Nol perubahan pada constraint.

---

## 4. Popup, bukan halaman baru — sampai batas tertentu

Yang diinginkan: pelanggan memilih "bayar sekarang", lalu **QRIS atau kolom
kartu muncul di modal di atas halaman booking**, bukan melompat ke situs lain.
Halaman baru hanya untuk hasil akhirnya.

Bisa, tapi jawabannya berbeda per metode, dan satu di antaranya punya batas yang
tidak bisa dilewati siapa pun.

| Metode | Di dalam modal? | Kenapa |
|---|---|---|
| **QRIS** | **Ya, sepenuhnya** | API mengembalikan string QR; kita render sendiri. Tidak ada redirect sama sekali |
| **Virtual Account** | **Ya, sepenuhnya** | API mengembalikan nomor VA; tinggal ditampilkan beserta tombol salin |
| **Kartu** | **Ya** | Kolom kartu lewat Xendit.js, dan **3DS pun di dalam modal** — lihat di bawah |
| **E-wallet** (OVO/DANA/ShopeePay) | Tidak | Perlu berpindah ke aplikasi dompetnya untuk menyetujui |

### 3D Secure: ternyata justru dirancang untuk ditanam

Dokumen ini sebelumnya menyatakan 3DS tidak mungkin ditampilkan di dalam modal.
**Itu keliru**, dan cara berpikirnya tertinggal di 3DS versi lama.

**3DS 2 dirancang untuk di-*embed*.** Spesifikasinya bahkan menetapkan ukuran
jendela tantangan — 250×400, 390×400, 500×600, 600×400, dan layar penuh —
justru supaya merchant bisa menampilkannya di dalam halamannya sendiri. Itulah
yang dilakukan DOKU, dan Xendit bisa melakukan hal yang sama.

Jadi seluruh alur kartu tetap di domain kita:

```
kolom kartu di modal kita
  └─ Xendit.js menukar nomor kartu jadi token, di browser
  └─ kalau bank meminta tantangan:
        iframe 3DS tampil DI DALAM modal yang sama
  └─ token ditagih di server kita, lalu booking dikonfirmasi
```

**Nomor kartunya tetap tidak pernah menyentuh server ini.** Ia berjalan langsung
dari browser ke Xendit; yang sampai ke kita hanya token sekali pakai, yang tidak
berguna bagi siapa pun tanpa secret key.

Konsekuensinya, invoice Xendit tidak lagi dibuat untuk kartu. Baris `Payment`
berstatus menunggu token, dan charge baru benar-benar ada setelah pelanggan
mengetik kartunya — tidak ada lagi transaksi yang dibuat lalu tidak pernah
dipakai.

### Yang harus klien tahu: beban PCI naik

Ini satu-satunya harga sungguhan dari keputusan ini, dan tidak terlihat di kode.

Dengan halaman checkout Xendit, studio berada di **SAQ A** — halaman pengumpul
data kartu sepenuhnya milik Xendit. Dengan kolom kartu di halaman kita, studio
pindah ke **SAQ A-EP**: nilainya tetap tidak pernah kita simpan atau catat, tapi
halaman yang mengumpulkannya sekarang milik kita.

Perbedaannya administratif, bukan teknis — tapi nyata. Sebutkan ke klien sebelum
go-live.

### Urutan metode tetap tidak berubah

QRIS dan VA tetap di urutan atas — bukan karena kartu sulit, tapi karena kartu
**6 kali lebih mahal** (§1). Yang berubah hanya ini: pelanggan yang tetap memilih
kartu kini tidak perlu meninggalkan halaman.

### Cara modal tahu pembayarannya sudah masuk

Modalnya **tidak** menanyakan hasil ke Xendit, dan **tidak** memutuskan apa pun
sendiri. Ia menanyakan ke database kita:

```
modal terbuka
  └─ polling GET /api/booking/<token>/payment  tiap 3 detik
       ├─ status PAID  → tutup modal, pindah ke halaman konfirmasi
       ├─ EXPIRED/FAILED → tampilkan alasannya, tawarkan ulangi
       └─ masih PENDING → hitung mundur sisa waktu invoice
```

Yang mengubah status di database tetap **callback** (§5). Polling hanya membaca.
Ini penting: hasil pembayaran yang dilaporkan browser tidak pernah dipercaya —
siapa pun bisa memanggil endpoint mana pun dari console.

Polling berhenti saat invoice kedaluwarsa, dan modal punya tombol "sudah bayar,
periksa lagi" untuk kasus jaringan pelanggan lambat.

### Halaman hasil tetap halaman sungguhan

Sesuai permintaan: begitu pembayaran berhasil, pelanggan diarahkan ke
`/booking/confirmation/<reference>/` yang sudah ada — halaman sungguhan dengan
URL sendiri, yang bisa di-*bookmark*, di-*refresh*, dan dibuka lagi dari email.

Halaman itu **membaca dari database**, bukan dari apa yang dikira modal. Kalau
pelanggan menutup modal setelah membayar, callback tetap masuk, konfirmasi tetap
terkirim, dan halaman itu tetap benar saat dibuka nanti.

Kegagalan ditampilkan di dalam modal, bukan halaman terpisah — pelanggan masih di
tengah proses dan seharusnya bisa langsung mencoba metode lain tanpa mengulang
booking dari awal.

### Satu masalah nyata di ponsel

`PRODUCT.md` menyebut pelanggan studio ini memutuskan cepat dan **memesan dari
ponsel**. Itu menimbulkan persoalan yang klasik pada QRIS: **kode QR di layar
ponsel tidak bisa dipindai oleh ponsel yang sama.**

Penanganannya di modal:

- **Di ponsel**: tampilkan tombol *deeplink* ke aplikasi dompet (GoPay, OVO,
  DANA, ShopeePay) sebagai pilihan utama, dan QR-nya di bawah untuk yang memakai
  perangkat lain. Dukungan deeplink berbeda-beda antar dompet — **uji satu per
  satu di sandbox**, jangan diasumsikan.
- **Di desktop**: QR sebagai pilihan utama, karena di sanalah ia memang masuk
  akal.
- Sediakan juga "simpan gambar QR" untuk yang ingin memindainya dari perangkat
  lain.

Kalau ternyata deeplink terlalu rapuh saat diuji, Virtual Account adalah
cadangan yang bagus di ponsel: sekadar nomor untuk disalin, dan sama murahnya.

### Harganya

Modal ini menambah **±2 hari** di atas alur redirect biasa: render QR, tampilan
VA, deeplink dompet, polling, penanganan kedaluwarsa, dan pengujian di ponsel
sungguhan.

Kalau klien ingin versi paling murah lebih dulu, **halaman hosted Xendit tetap
pilihan yang sah** — satu redirect, ±1 hari, dan sudah teruji. Modalnya bisa
ditambahkan kemudian tanpa mengubah apa pun di sisi server: yang berubah hanya
bagaimana halaman booking menampilkan invoice yang sudah dibuat.

---

## 5. Empat aturan yang tidak boleh dilanggar

Ini yang membedakan integrasi pembayaran yang benar dari yang kelihatan jalan.

**1. Callback adalah kebenaran, halaman kembali bukan.**
Pelanggan bisa menutup tab setelah membayar, atau ponselnya kehabisan baterai.
`success_redirect_url` Xendit **tidak pernah** dipakai untuk mengubah status
booking — halaman itu hanya menampilkan apa yang sudah tercatat. Yang
mengonfirmasi hanya callback.

**2. Verifikasi setiap callback — dan cara Xendit berbeda dari Midtrans.**
Xendit **tidak** mengirim tanda tangan hash. Ia mengirim header
`x-callback-token` berisi *Callback Verification Token* dari dashboard, dan
kecocokan token itulah satu-satunya bukti bahwa request datang dari Xendit.
Endpoint callback itu publik: tanpa pemeriksaan ini, siapa pun yang tahu URL-nya
bisa mengirim "sudah bayar" untuk booking mana pun.

Konsekuensinya, dan ini yang membuatnya lebih rapuh daripada tanda tangan
Midtrans: token itu **rahasia bersama yang dikirim apa adanya di setiap
request**. Maka:

- Bandingkan dengan `timingSafeEqual`, bukan `===` — pola yang sudah dipakai
  `isAuthorisedCron()` di `lib/booking/tokens.ts`.
- Jangan pernah mencatat header request di log.
- Endpoint-nya wajib HTTPS. Selalu.
- Jangan percaya isi body-nya. Setelah token cocok, **ambil ulang invoice-nya
  lewat API Xendit** dan baca status serta nominal dari sana. Body yang cocok
  tokennya tetap tidak membuktikan isinya belum diubah.

**3. Jangan pernah percaya nominal dari client.**
Jumlah yang ditagih diambil dari `priceIdrAtBooking` di server, bukan dari body
request. Pola ini sudah dipakai di `lib/booking/create.ts` — ikuti.

**4. Callback harus idempoten.**
Xendit mengirim ulang sampai mendapat 200, dan bisa mengirim status yang sama
dua kali. Kunci uniknya `Payment.providerOrderId` — yang untuk Xendit berisi
`external_id`, referensi milik kita sendiri — dan perubahan status lewat
`lib/booking/transitions.ts` yang sudah ada, bukan update tersebar.

---

## 6. Model data

Tambahan, bukan perombakan.

```prisma
enum PaymentMethod {
  /// Bayar tunai atau kartu di studio. Perilaku yang sudah ada.
  AT_STUDIO
  ONLINE
}

enum PaymentStatus {
  PENDING PAID EXPIRED FAILED REFUNDED PARTIALLY_REFUNDED
}

/// Nilai enum baru pada BookingStatus — migrasi satu baris.
/// AWAITING_PAYMENT ikut menahan slot, sama seperti PENDING.
model Payment {
  id              String        @id @default(cuid())
  bookingId       String
  booking         Booking       @relation(fields: [bookingId], references: [id], onDelete: Cascade)

  provider        String        // "xendit"
  /// `external_id` yang kita kirim ke Xendit — referensi milik kita sendiri.
  /// Unik: inilah yang membuat callback idempoten.
  providerOrderId String        @unique
  /// `id` invoice dari Xendit, untuk mengambil ulang statusnya lewat API.
  providerTxnId   String?

  /// Rupiah penuh sebagai integer, seperti seluruh uang di schema ini.
  amountIdr       Int
  status          PaymentStatus @default(PENDING)
  /// `payment_method` dari Xendit: "QR_CODE" | "BANK_TRANSFER" | "CREDIT_CARD"
  /// | "EWALLET" — dipakai untuk laporan biaya per metode (§1).
  channel         String?

  expiresAt       DateTime?
  paidAt          DateTime?
  /// Payload callback apa adanya. Saat terjadi sengketa, ini buktinya.
  rawPayload      Json?

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([bookingId])
  @@index([status])
}
```

`Booking` bertambah tiga kolom:

```prisma
paymentMethod  PaymentMethod @default(AT_STUDIO)
/// Yang harus dibayar online. Sama dengan harga penuh, atau nominal deposit.
amountDueIdr   Int           @default(0)
amountPaidIdr  Int           @default(0)
payments       Payment[]
```

`amountDueIdr` dan `amountPaidIdr` dipisah sejak awal supaya **deposit bisa
dipakai nanti tanpa migrasi kedua** — sisa yang dibayar di studio adalah
selisihnya.

Constraint anti-tabrakan perlu satu baris tambahan agar `AWAITING_PAYMENT` ikut
menahan slot:

```sql
-- WHERE (status IN ('PENDING', 'CONFIRMED', 'AWAITING_PAYMENT'))
```

---

## 7. Perubahan pada kode yang sudah ada

Bagian ini yang paling mudah keliru, jadi ditulis eksplisit.

**Notifikasi tidak boleh keluar sebelum dibayar.** Sekarang
`queueBookingCreated()` dipanggil langsung setelah booking tersimpan. Untuk
jalur bayar-sekarang itu **salah** — pelanggan akan menerima konfirmasi untuk
booking yang belum dibayar dan mungkin tidak akan pernah dibayar.

Perbaikannya: route `POST /api/booking` hanya memanggilnya untuk
`AT_STUDIO`. Untuk `ONLINE`, yang memanggil adalah webhook, setelah pembayaran
berhasil.

**Charge dibuka saat pelanggan memilih, bukan saat booking dibuat.** Sampai
2026-08-23 `POST /api/booking` langsung membuka charge pada rail pertama di
`PAYMENT_CHANNELS`, jadi setiap pelanggan yang sampai ke modal sudah
dibuatkan QRIS sebelum ditanya mau bayar pakai apa — dan yang kemudian memilih
kartu meninggalkan baris itu menganggur di tabel pembayaran studio. Sekarang
booking hanya menahan slot (`AWAITING_PAYMENT` + `holdExpiresAt`, keduanya
sudah cukup karena status itu ada di dalam `booking_no_overlap`), dan
`POST /api/booking/[token]/payment` yang membuka charge begitu rail-nya
dipilih. `createBookingSchema` tidak lagi menerima `paymentChannel` sama
sekali; membawanya sejauh itu berarti membawa tebakan.

**Kwitansi menyusul, bukan menggantikan.** Sejak 2026-08-23, begitu pembayaran
masuk pelanggan menerima **dua** pesan, bukan satu: konfirmasi booking seperti
biasa, plus `CUSTOMER_PAYMENT_RECEIVED` — WhatsApp dan email — yang menyebut
jumlah yang benar-benar diterima, rail-nya, dan id charge dari Xendit.
Keduanya diantre di `queueBookingCreated()`, bukan di dua jalur penyelesaian
(callback dan route kartu), supaya aturannya tidak perlu diulang di dua tempat
dan berlaku di satu tapi tidak di satunya. Syaratnya adalah **uangnya**
(`settledPayment()`), bukan metode bayarnya: booking yang entah bagaimana
sampai ke sana tanpa terbayar akan menerima konfirmasi dan tidak menerima
kwitansi — arah keliru yang benar. Admin tidak dikirimi kwitansi; ia sudah
menerima `ADMIN_NEW_BOOKING` pada detik yang sama.

Selain itu:

| Berkas | Perubahan |
|---|---|
| `lib/booking/create.ts` | Terima `paymentMethod`; set status dan `holdExpiresAt` sesuai jalur |
| `lib/booking/transitions.ts` | Tambah `markPaid`, `expireHold`; keduanya idempoten |
| `app/api/booking/route.ts` | Antrekan notifikasi hanya untuk `AT_STUDIO`; kembalikan `invoice_url` untuk `ONLINE` |
| `app/api/cron/dispatch/route.ts` | Sapu hold yang kedaluwarsa — cron yang sudah ada, tugas baru |
| `components/booking/SummaryStep.tsx` | Pilihan metode + kebijakan refund tertulis di atas tombol |
| `components/booking/PaymentModal.tsx` | **Baru.** QR, nomor VA, deeplink dompet, hitung mundur, polling status |
| Panel admin | Kolom status bayar, tombol "tandai lunas" untuk tunai, catatan refund |

**Berkas baru** semuanya di bawah `lib/payments/` — `xendit.ts` (client HTTP +
ambil ulang invoice), `invoice.ts` (buat invoice), `callback.ts` (verifikasi
token + terapkan status). Ditambah route `app/api/payments/xendit/route.ts`.

Gateway sengaja dipisah di satu modul: `lib/booking` tidak boleh tahu nama
providernya sama sekali, supaya pindah ke Midtrans nanti hanya mengganti isi
`lib/payments/`.

Ditambah satu endpoint baca-saja untuk modal:
`GET /api/booking/[token]/payment` — mengembalikan status pembayaran dan sisa
waktu invoice, dibaca dari database kita, bukan diteruskan dari Xendit.

Dua variabel environment baru, lewat `lib/env.ts` seperti yang lain —
`XENDIT_SECRET_KEY` dan `XENDIT_CALLBACK_TOKEN`, keduanya wajib.

---

## 8. Refund: kenyataan yang perlu klien tahu di awal

**Sebagian besar metode termurah di Indonesia tidak punya refund otomatis.**
Kartu bisa di-refund lewat API. QRIS dan Virtual Account umumnya **tidak** —
pengembaliannya transfer bank manual oleh studio.

Artinya kebijakan refund bukan sekadar kode; itu pekerjaan orang. Yang harus
disediakan sistem:

- Panel admin mencatat refund: nominal, tanggal, alasan, siapa yang melakukan.
- Status `REFUNDED` / `PARTIALLY_REFUNDED` pada `Payment`.
- Untuk kartu, tombol yang memanggil API refund Xendit.
- Untuk QRIS/VA, formulir catatan — studio transfer sendiri, sistem mencatat.

Sengketa pembayaran hampir selalu soal siapa bilang apa. `rawPayload` dan
`AuditLog` yang sudah ada adalah jawabannya.

---

## 9. Fase pengerjaan

| Fase | Isi | Perkiraan |
|---|---|---|
| **0** | Akun Xendit, verifikasi bisnis, kunci sandbox + callback token | menunggu klien |
| **1** | Migrasi schema, enum, constraint, `lib/payments/xendit.ts` | 0,5 hari |
| **2** | Pilihan metode di Summary + `create.ts` bercabang | 0,5 hari |
| **3** | Buat invoice; modal dengan QR, nomor VA, hitung mundur, polling | 2 hari |
| **3b** | Kartu lewat komponen Xendit (3DS di iframe/popup miliknya) | 1 hari |
| **4** | Callback: verifikasi token, ambil ulang invoice, idempoten, transisi status | 1 hari |
| **5** | Sapu hold kedaluwarsa di cron; notifikasi menunggu pembayaran | 0,5 hari |
| **6** | Admin: status bayar, tandai lunas, catat refund | 1 hari |
| **7** | Uji sandbox menyeluruh: bayar, gagal, kedaluwarsa, callback dobel, token salah, refund | 1 hari |
| **7b** | Uji di ponsel sungguhan: deeplink tiap dompet, QR di desktop, tutup modal lalu kembali | 0,5 hari |

### Fase 0 — apa yang harus diambil dari dashboard Xendit

Empat hal, dan **hanya dua di antaranya variabel environment**. Dua sisanya
pengaturan di dalam dashboard, dan sistem tidak bekerja tanpanya.

| # | Yang diambil | Di mana | Masuk ke |
|---|---|---|---|
| 1 | **API secret key** | Settings → Developers → **API Keys** | `XENDIT_SECRET_KEY` |
| 2 | **Webhook verification token** | Settings → **Webhooks** | `XENDIT_CALLBACK_TOKEN` |
| 3 | **URL webhook** | layar Webhooks yang sama | *bukan variabel* — diisi di dashboard |
| 4 | **Metode pembayaran diaktifkan** | Settings → Payment methods | *bukan variabel* |

> Nama menu di dashboard bisa bergeser dari waktu ke waktu. Yang penting adalah
> keempat benda itu ada; kalau labelnya berbeda, cari berdasarkan isinya.

**1. API secret key.** Buat kunci dengan izin tulis untuk *money-in*, bukan
read-only. Kunci uji berawalan `xnd_development_`, kunci produksi
`xnd_production_`. **Pakai kunci uji sampai seluruh alur lolos di sandbox** —
kunci produksi memindahkan uang sungguhan sejak permintaan pertama.

**2. Webhook verification token.** Xendit mengganti nama "Callbacks" menjadi
"Webhooks", jadi dokumen lama — termasuk dokumentasi Xendit sendiri — menyebutnya
*Callback Verification Token*. Benda yang sama, dan header-nya tetap
`x-callback-token`.

Letaknya di layar yang sama dengan URL webhook, biasanya tersembunyi di balik
tombol **Show**. **Nilainya berbeda antara mode Test dan Live** — pastikan
mode-nya sama dengan kunci API yang dipakai, atau setiap webhook akan ditolak
401. Sebagian akun baru belum menampilkannya sampai ada satu URL webhook yang
disimpan; kalau tidak ketemu, isi URL-nya dulu lalu lihat lagi.

Ini satu-satunya bukti sebuah webhook benar datang dari Xendit, karena Xendit
tidak menandatanganinya (§5). Perlakukan seperti kata sandi.

**3. URL callback — ini yang paling mudah terlewat.**

Isi dengan:

```
https://flexandflow.fit/api/payments/xendit/
```

**Dengan garis miring di akhir.** `trailingSlash: true` berlaku untuk route
handler juga: bentuk tanpa garis miring menjawab **308**, dan pengirim webhook
yang tidak mengikuti redirect pada POST tidak akan pernah sampai. Diverifikasi
langsung — tanpa slash `308`, dengan slash `401` (yaitu route-nya benar dan
menolak token kosong).

Dan isikan untuk **setiap jenis pembayaran yang diterima studio** — invoice,
virtual account, QR code, dan e-wallet masing-masing punya barisnya sendiri di
layar itu. Satu handler melayani semuanya, tapi **baris yang dibiarkan kosong
berarti pembayaran jenis itu diterima dan tidak pernah dikonfirmasi**: uangnya
masuk, bookingnya tetap berstatus belum dibayar, dan tidak ada yang tahu sampai
ada pelanggan yang protes.

#### Menguji di Vercel sebelum domain asli dipakai

Xendit tidak bisa memanggil `localhost`, jadi harus ada deployment. Tiga hal
yang menentukan berhasil atau tidak:

**Pakai URL produksi proyek, bukan URL preview.** Vercel memberi URL baru pada
setiap push — `flex-a1b2c3-akun.vercel.app` — sedangkan `<proyek>.vercel.app`
selalu menunjuk deployment produksi terakhir. Daftarkan yang stabil, atau
callback-nya mati begitu ada push berikutnya.

**Matikan Deployment Protection untuk URL itu.** Kalau menyala, Vercel menjawab
halaman login alih-alih route kita, dan Xendit menerima HTML dengan status
non-200 — pembayaran tidak pernah terkonfirmasi dan penyebabnya tidak kelihatan
dari sisi mana pun. Ini gagal secara diam-diam, jadi periksa sebelum menyalahkan
kode.

**Samakan `NEXT_PUBLIC_SITE_URL` dengan URL yang sama.** Itu yang dipakai untuk
link kelola-booking, `.ics`, dan `success_redirect_url` yang dikirim ke Xendit.
Kalau masih `localhost`, pelanggan akan menerima email berisi tautan ke mesin
Anda sendiri.

Urutannya: **deploy dulu, baru daftarkan URL-nya** — beberapa gateway memeriksa
URL saat disimpan, dan URL yang belum ada bisa ditolak.

Kalau memang ingin menguji dari mesin sendiri, pakai terowongan seperti ngrok
dan daftarkan URL terowongannya.

**4. Aktifkan metode pembayarannya.** QRIS, bank virtual account mana saja,
e-wallet mana saja, dan kartu. Metode yang belum diaktifkan **tidak** gagal saat
aplikasi menyala — ia gagal saat pelanggan menekan bayar, yang jauh lebih buruk.
Sebagian metode perlu persetujuan terpisah dan tidak langsung aktif.

**Plus rekening settlement** atas nama usaha, tempat uangnya nanti dikirim.

### Urutan yang disarankan

1. Buat akun, ajukan verifikasi bisnis. **Ini yang paling lambat**, bisa
   berminggu-minggu — mulai dari sini.
2. Sementara menunggu: ambil kunci **sandbox**, daftarkan URL callback ke
   deployment preview, aktifkan metode di mode uji, lalu jalankan seluruh alur
   dan tuntaskan setiap `TODO(xendit):` di `lib/payments/`.
3. Setelah terverifikasi: tukar ke kunci produksi, ubah URL callback ke domain
   asli, aktifkan metode di mode live.
4. Lakukan satu transaksi sungguhan bernilai kecil untuk tiap metode, lalu
   refund-kan. Itu satu-satunya cara membuktikan settlement benar-benar sampai
   ke rekening.

**Total ±8 hari kerja** setelah akun Xendit aktif — naik dari ±5,5 hari kalau
memakai halaman hosted Xendit tanpa modal.

Fase 3, 4 dan 7 adalah jalur kritis. Sisanya lurus.

Kalau klien ingin lebih cepat live, **fase 3 bisa dimulai dari redirect biasa**
(±1 hari) dan modalnya ditambahkan kemudian: sisi server tidak berubah sama
sekali, hanya cara halaman booking menampilkan invoice yang sudah dibuat.

---

## 10. Yang harus klien putuskan sebelum kode ditulis

**1. Bayar penuh atau deposit?**
Deposit 30–50% menekan no-show tanpa menahan uang orang di muka, dan sisanya
dibayar di studio. Untuk studio sekecil ini biasanya lebih ramah — tapi ini
keputusan bisnis, bukan teknis. Schema-nya menampung keduanya.

**2. Kebijakan refund.** Yang paling sering terlewat dan paling sering jadi
sengketa. Sekarang ada batas batal 12 jam tapi belum ada uang yang menempel
padanya. Begitu uang diterima, "batal" butuh aturan tertulis:

- Batal lebih dari 12 jam sebelumnya → refund penuh? potong biaya admin?
- Batal kurang dari 12 jam → hangus? sebagian?
- Studio yang membatalkan → selalu refund penuh
- No-show → hangus?

Apa pun jawabannya, **harus tampil di halaman ringkasan sebelum tombol bayar
ditekan.** Ini yang melindungi studio saat ada yang protes.

**3. Metode apa saja yang diaktifkan?** Rekomendasi: QRIS, Virtual Account,
GoPay, kartu. Mematikan kartu memang menghemat, tapi kehilangan turis — jangan.

**3b. Modal sekarang, atau redirect dulu?** Modal menambah ±2,5 hari. Kalau
prioritasnya cepat live, redirect dulu dan modal menyusul tanpa membuang kerja
(§9).

**4. Rekening penerima** atas nama usaha, plus dokumen verifikasi (NPWP, akta).
**Ini yang paling lambat** — bisa berminggu-minggu. Sama seperti domain
authentication SendGrid: urus paling awal. Tanyakan juga ke Xendit apakah
onboarding bisa untuk perorangan/UMKM atau harus PT — itu menentukan dokumen
yang perlu disiapkan klien.

---

## 11. Risiko

| # | Risiko | Mitigasi |
|---|---|---|
| 1 | Callback palsu mengonfirmasi booking tanpa bayar | Cocokkan `x-callback-token` dengan `timingSafeEqual`, lalu **ambil ulang invoice lewat API** dan percayai jawaban itu, bukan body-nya (§4) |
| 2 | Callback dikirim dua kali → booking ganda / notifikasi dobel | `providerOrderId` (`external_id`) unik; transisi idempoten lewat satu file |
| 3 | Pelanggan bayar tepat saat hold kedaluwarsa dan slot sudah diambil | Set `invoice_duration` **lebih pendek** dari `holdExpiresAt` — mis. invoice 13 menit, hold 15. Kalau tetap terjadi: `PAID` tapi booking `CANCELLED`, muncul di admin sebagai butuh refund manual |
| 4 | Uang masuk tapi pelanggan tidak menerima konfirmasi | Antrean notifikasi yang sudah ada punya retry; halaman admin menampilkan yang gagal |
| 5 | Pelanggan bayar, tab tertutup, mengira gagal | Konfirmasi dikirim callback, bukan halaman kembali — sampai walau tab ditutup |
| 6 | Biaya membengkak karena semua memilih kartu | QRIS dan VA diurutkan di atas (§1) |
| 7 | Refund QRIS/VA tidak bisa otomatis | Alur manual + pencatatan di admin sejak hari pertama (§8) |
| 9 | QR tidak bisa dipindai karena pelanggan memesan dari ponsel yang sama | Deeplink dompet didahulukan di ponsel, QR didahulukan di desktop, VA sebagai cadangan yang sama murahnya (§4) |
| 10 | Modal ditutup sebelum pembayaran selesai | Callback tetap masuk dan mengonfirmasi; halaman konfirmasi membaca database, jadi tetap benar saat dibuka lagi dari email |
| 11 | Polling dipakai untuk memutuskan booking sah | Polling hanya **membaca**; yang menulis status hanya callback (§4, §5) |
| 12 | `XENDIT_CALLBACK_TOKEN` bocor lewat log | Header tidak pernah dicatat; token divalidasi `lib/env.ts` dan tidak pernah dirender di panel admin, seperti kunci WAHA |
| 8 | Rekonsiliasi settlement vs booking | `Payment.channel` dan `rawPayload` disimpan; laporan sederhana di admin |

---

## Status

**Ditulis lengkap, belum pernah dijalankan.** Tidak ada kredensial Xendit —
akun studionya belum ada — jadi tidak satu pun permintaan ke Xendit pernah
terjadi.

Yang sudah benar-benar diverifikasi:

- **Migrasi diterapkan ke database Neon sungguhan.** `AWAITING_PAYMENT` kini ada
  di dalam constraint `booking_no_overlap`, tabel `Payment` berdiri, dan kolom
  pembayaran ada di `Booking` — diperiksa langsung lewat SQL.
- `npx tsc --noEmit` bersih, `npx eslint` bersih, `next build` menghasilkan 62
  halaman termasuk route callback.
- `npm run check:prices` masih melaporkan seluruh harga cocok.

### Diuji terhadap sandbox Xendit

Kunci sandbox sudah ada, dan alur pembuatan charge dijalankan sungguhan:

| Metode | Hasil |
|---|---|
| **QRIS** | **Berhasil** — `POST /qr_codes`, id `qr_…` kembali. Nilai `qr_string`-nya placeholder (`"some-random-qr-string"`) karena mode uji, tapi nama field-nya terbukti benar |
| **Virtual Account** | **Berhasil** — nomor BCA sungguhan kembali |
| **Kartu** | **Berhasil** — URL checkout Xendit kembali |
| **E-wallet** | **Terhalang konfigurasi dashboard**, bukan kode — lihat di bawah |

Izin kuncinya juga diuji: money-in dan Transaction menjawab `200`, Balance
ditolak `403` — persis sesuai prinsip hak seminimal mungkin.

**Satu bug ditemukan dan diperbaiki:** kode channel GoPay ditulis `ID_GOPAY`,
padahal Xendit mengharapkan `GOPAY` tanpa prefiks. Sebagian besar dompet
Indonesia memang berprefiks (`ID_OVO`, `ID_DANA`, `ID_SHOPEEPAY`), GoPay
pengecualiannya — jadi tebakan yang paling wajar justru yang salah. Ini tidak
akan pernah tertangkap tanpa memanggil API-nya sungguhan.

**Yang menghalangi e-wallet:** Xendit menjawab `CALLBACK_URL_NOT_FOUND` dan
menolak membuat charge sama sekali sampai URL callback e-wallet diisi di
dashboard. Ini persis risiko yang ditulis di §9 nomor 3, terbukti nyata: baris
callback yang kosong bukan sekadar melewatkan konfirmasi — untuk e-wallet ia
menolak transaksinya sejak awal.

### Yang masih belum terbukti

Sisa `TODO(xendit):` di `lib/payments/` — tinggal 8 dari 11 — sekarang hanya
menyangkut **membaca status pembayaran**, bukan membuatnya. Tidak ada yang bisa
membuktikannya tanpa benar-benar membayar sebuah charge di sandbox.

Yang paling tidak pasti tetap sama: **cara mengetahui sebuah virtual account
sudah dibayar.** Endpoint yang mendeskripsikan VA menjelaskan akunnya, bukan
apakah ada uang masuk, sementara §5 melarang mempercayai isi callback.
Implementasinya menempuh ledger Transaksi; kalau keliru, alternatifnya sudah
ditulis di komentar.

### Masih menunggu klien

Dua keputusan di §10 — **bayar penuh atau deposit**, dan **kebijakan refund** —
belum terjawab, dan keduanya menghalangi go-live. Ketentuan refund harus tampil
di atas tombol bayar; tempatnya sudah disiapkan di `SummaryStep`, dan sengaja
dibiarkan kosong daripada diisi karangan.

Ditambah dua hal yang muncul saat implementasi:

- **Tombol "tandai lunas" untuk pembayaran tunai belum ada.** Booking bayar-di-
  studio tetap menampilkan harga sebagai terutang dan tidak pernah berubah jadi
  lunas. Perlu diputuskan apakah studio ingin mencatat penerimaan tunai di panel.
- **Refund tidak mengubah status booking.** Membatalkan tetap tindakan terpisah
  yang eksplisit, tapi saat ini tidak ada yang mencegah refund dicatat pada
  booking yang masih `CONFIRMED`.
