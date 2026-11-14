<div align="center">
  <img src="src/assets/alpos-logo.png" alt="Logo ALpos" width="180" />
  <h1>ALpos</h1>
  <p>Aplikasi kasir desktop lokal untuk toko retail, bangunan, dan suku cadang.</p>
  <p>
    <img src="https://img.shields.io/badge/versi-0.1.0-168b78?style=flat-square" alt="Versi 0.1.0" />
    <img src="https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white" alt="React 19" />
    <img src="https://img.shields.io/badge/Tauri-2-24c8db?style=flat-square&logo=tauri&logoColor=white" alt="Tauri 2" />
    <img src="https://img.shields.io/badge/Rust-SQLite-b7410e?style=flat-square&logo=rust&logoColor=white" alt="Rust dan SQLite" />
  </p>
</div>

## Fitur

- Katalog barang, SKU/barcode, harga, stok, dan gambar produk.
- Transaksi kasir dengan pembayaran tunai atau non-tunai, diskon, dan pajak opsional.
- Faktur dengan data pelanggan opsional.
- Setelah checkout, pilih cetak **struk 80 mm**, **faktur A4**, atau lewati cetak.
- Ringkasan, laporan, ekspor Excel, dan pencatatan pengeluaran.
- Penyimpanan lokal menggunakan SQLite; gambar yang diimpor tersedia saat offline.

## Mulai

### Persyaratan

- Node.js dan npm yang kompatibel dengan Vite 8.
- Rust stable dan prasyarat desktop Tauri 2. Untuk Windows, siapkan Microsoft C++ Build Tools dan WebView2 Runtime.

Lihat [prasyarat Tauri](https://v2.tauri.app/start/prerequisites/) untuk detail platform.

### Pengembangan

```sh
npm ci
npm run tauri dev
```

### Build aplikasi

```sh
npm run tauri build
```

## Data dan gambar

Database dibuat otomatis. Di Windows, lokasinya:

```text
%APPDATA%\com.arahlangkah.alpos\alpos.sqlite3
```

Migrasi skema tersedia di `src-tauri/migrations`. Password akun disimpan sebagai hash Argon2.

Gambar produk dapat diunggah atau diimpor dari URL HTTPS langsung ke file JPEG, PNG, WebP, atau GIF (maksimal 5 MB). Hak penggunaan gambar tetap menjadi tanggung jawab pengguna.

## Cetak

Cetak menggunakan dialog printer WebView. Pilih ukuran kertas yang sesuai di driver printer: **80 mm** untuk struk atau **A4** untuk faktur. Cetak tidak dimulai otomatis.

> Scanner USB/Bluetooth HID didukung. Server scanner Wi-Fi belum tersedia.
