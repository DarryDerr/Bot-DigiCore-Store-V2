# 🤖 Bot DigiCore Store v2

Bot **DigiCore Store v2** adalah Discord bot untuk server **store / digital shop** yang dibuat sederhana, rapi, dan mudah dipahami.

Bot ini **tidak ditujukan untuk publik / GitHub**, jadi dokumentasi dibuat **singkat, jelas, dan praktis**.

---

## ✨ Gambaran Umum

Bot ini memiliki sistem:

* Command berbasis role (admin / seller / buyer / general)
* Sistem payment dinamis (tanpa hardcode)
* Event handler terpisah (ticket, verify, welcome, dll)
* Database lokal SQLite (ringan & simpel)

Semua command dan event sudah dipisah rapi per folder.

---

## 📁 Struktur Folder

```
commands/
  admin/      -> command khusus admin
  buyer/      -> command buyer
  general/    -> command umum
  seller/     -> command seller / store

data/
  main.db     -> database SQLite

events/       -> semua event discord
handlers/     -> command & event handler
utils/        -> helper (embed, db, logger)

index.js      -> entry point bot
config.js     -> konfigurasi utama
.env          -> token & credential
```

---

## 💳 Sistem Payment

Sistem payment bersifat **dinamis** dan dikelola oleh seller.

Fitur payment:

* Menyimpan metode pembayaran di database
* Menampilkan daftar payment dalam embed
* Button otomatis sesuai payment yang tersedia
* Detail payment ditampilkan secara ephemeral

Setiap payment dapat memiliki:

* Nama / type
* Icon (emoji / custom emoji)
* Pesan keterangan
* Gambar (QR / ilustrasi)

---

## ⚙️ Konfigurasi (`config.js`)

Bot ini **sangat bergantung pada `config.js`**.

Di file ini kamu mengatur:

* Role admin / seller / buyer
* Channel log
* Warna embed
* Pengaturan dasar bot

Untuk pemula, **cukup edit file ini saja**.

---

## 🗄️ Database

Bot menggunakan **SQLite**:

* Tidak perlu setup server database
* Data tersimpan di satu file
* Cocok untuk VPS kecil / local

Database otomatis digunakan oleh sistem payment dan fitur lain.

---

## 🧠 Catatan

* Gunakan Node.js v20+
* Jangan share file `.env`
* Pastikan role & permission sesuai

---

## ✅ Tujuan Project

Bot ini dibuat agar:

* Mudah dipakai
* Mudah dikembangkan
* Tidak ribet untuk maintenance

Fokus utama: **fungsi jalan & struktur rapi**, bukan dokumentasi panjang.
