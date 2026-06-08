# Product Requirement Document (PRD)
**Portal Web Aplikasi Upload Google Drive Terpusat (Vercel & GitHub)**

---

## 1. Informasi Dokumen
| Parameter | Keterangan |
| :--- | :--- |
| **Nama Proyek** | Centralized Team Leader Drive Uploader |
| **Target Environment**| GitHub Repository (Private/Public) & Vercel Hosting |
| **Folder Root Google Drive** | Target Folder ID: `1spc0LTd6Eak-AvwfhyCEHiYOP-LQl5MQ` |
| **Versi Dokumen** | v1.0 (Final Draft) |
| **Tanggal Pembuatan** | 8 Juni 2026 |
| **Status Sifat** | Rahasia / Internal Operasional |

## 2. Latar Belakang & Tujuan Proyek
Saat ini, para Team Leader diwajibkan untuk mengunggah dokumen dan laporan operasional ke Google Drive bersama. Namun, mekanisme pengunggahan langsung menggunakan akun pribadi sering kali menyebabkan beban penyimpanan (storage quota) pada email personal mereka, serta pengelolaan hak akses yang tidak tersentralisasi.

Proyek ini bertujuan untuk membangun sebuah platform **Web Application** berbasis cloud yang di-hosting di **Vercel** dan terintegrasi dengan **GitHub**. Aplikasi ini akan bertindak sebagai jembatan pengunggahan data secara langsung ke akun Google Drive perusahaan yang bersifat *unlimited storage* tanpa memerlukan proses login akun Google personal dari masing-masing Team Leader. Dokumen akan langsung terorganisasi secara otomatis ke dalam struktur folder yang rapi berdasarkan parameter waktu dan identitas pengirim.

## 3. Spesifikasi Fungsional Aplikasi

### 3.1 Form Input & Validasi Data
Aplikasi web harus menyediakan antarmuka form satu halaman yang bersih, responsif, dan mudah digunakan oleh Team Leader melalui perangkat mobile maupun desktop dengan field berikut:
* **Dropdown Nama Team Leader:** Input berupa pilihan wajib (required) yang berisi daftar nama mutlak berikut:
    * Arief Rakhman
    * Erfan Huzain
    * Junaidi
    * Sigit Sudirman
    * Dedy Rahman
    * Eka Yudi P
    * Ariyadi
* **Date Picker (Pemilih Tanggal):** Kalender interaktif untuk memilih tanggal operasional (default diset ke tanggal hari ini).
* **Pilihan Shift:** Radio button atau dropdown yang berisi 3 opsi wajib: `Shift 1`, `Shift 2`, dan `Shift 3`.
* **File Uploader Drag & Drop:** Area untuk mengunggah file. Sistem tidak membatasi jumlah file yang diunggah oleh Team Leader (unlimited files dalam satu kali sesi submit).

### 3.2 Struktur Folder Otomatis di Google Drive
Ketika tombol "Submit/Upload" ditekan, aplikasi secara cerdas wajib memeriksa keberadaan struktur folder di dalam Root Folder target, dan jika belum tersedia, sistem harus membuatnya secara otomatis (auto-create dynamic folders) dengan arsitektur berjenjang sebagai berikut:

```text
2026/
 └── [Nama Bulan]/ (Contoh: 06 - Juni)
      └── [Tanggal]/ (Contoh: 08)
           └── Shift [Nomor Shift] ([Nama Team Leader])/ 
                └── [File-file yang diupload]

Contoh Kasus Riil: Jika Junaidi mengunggah dokumen laporan pada tanggal 8 Juni 2026 untuk Shift 2, maka file tersebut akan otomatis tersimpan di:Root (1spc0LTd6Eak-AvwfhyCEHiYOP-LQl5MQ) -> 2026 -> 06 - Juni -> 08 -> Shift 2 (Junaidi) -> dokumen_laporan.pdf4. Arsitektur Teknis untuk Kecepatan Maksimal⚠️ Tantangan Utama Serverless (Vercel) & SolusinyaVercel menggunakan arsitektur Serverless Functions yang memiliki batasan durasi eksekusi (timeout) maksimal 10 detik (Hobby) atau 60 detik (Pro), serta limitasi ukuran payload request. Jika file besar diunggah melalui server Vercel (sebagai proxy), proses upload akan mengalami kegagalan (HTTP 504 Timeout) dan kecepatan upload melambat secara signifikan.4.1 Solusi Arsitektur: Client-Side Resumable UploadUntuk mencapai kecepatan yang setara dengan upload langsung ke Google Drive, arsitektur aplikasi wajib diimplementasikan sebagai berikut:Google Service Account Terpusat: Backend (Vercel Serverless Function) menggunakan kredensial JSON dari Google Service Account yang sudah diberikan akses sebagai "Editor" pada folder utama. Langkah ini mengeliminasi kebutuhan login dari sisi user.Inisiasi Sesi di Server side (Handshake): Ketika user menekan tombol submit, frontend mengirim data meta (Nama Leader, Tanggal, Shift) ke API Vercel. API Vercel bertugas mengecek/membuat struktur folder tujuan, lalu meminta Resumable Upload Session URL langsung dari Google Drive API v3.Unggah Langsung dari Browser (Direct Client-Side Upload): API Vercel mengembalikan Session URL tersebut ke browser user. Browser kemudian mengunggah file biner langsung ke endpoint Google API secara asinkronus (chunk-by-chunk).Dengan metode ini, beban bandwidth sepenuhnya dialihkan langsung antara gawai milik Team Leader dan infrastruktur Google Cloud, menghasilkan performa kecepatan maksimal tanpa interupsi batasan timeout server Vercel.5. Kebutuhan Non-Fungsional (Non-Functional Requirements)ParameterKriteria KebutuhanPerforma & KecepatanMenggunakan Google Drive API Resumable Upload untuk memastikan kecepatan upload maksimal 100% mengikuti kapasitas bandwidth internet lokal pengguna tanpa adanya throttling.SkalabilitasTidak ada batasan jumlah berkas (unlimited file count) maupun ukuran file individu dalam aplikasi, sepenuhnya bergantung pada kapasitas sisa Google Drive korporat.KeamananKredensial Service Account berupa JSON Key dilarang keras dimasukkan ke dalam repositori GitHub. Wajib disimpan secara aman di Vercel Environment Variables (GOOGLE_SERVICE_ACCOUNT_CREDENTIALS).UI / UXDesain antarmuka minimalis dengan indikator progres unggahan (progress bar) persentase real-time untuk setiap file agar Team Leader mendapatkan umpan balik yang jelas.6. Alur Kerja Sistem (System Workflow Diagram Description)Alur data dari pengisian form hingga file tersimpan secara permanen mengikuti siklus berikut:Team Leader membuka situs web yang di-hosting di Vercel.Team Leader mengisi form (Nama Leader, Tanggal, Shift) dan memilih berkas laporan.Frontend mengirimkan permintaan pembuatan folder terstruktur ke API Endpoint Vercel.API Vercel melakukan pengecekan folder berjenjang menggunakan Google SDK. Jika folder 2026 / Bulan / Tanggal / Shift (Leader) belum ada, perintah drive.files.create dijalankan dengan properti mimeType: 'application/vnd.google-apps.folder'.Google Drive API mengembalikan ID Folder tujuan yang spesifik tersebut ke API Vercel.API Vercel membuat sesi unggah baru (resumable session) untuk file, lalu melempar token upload dan URL sesi ke Frontend.Frontend mengeksekusi pengiriman data file langsung ke Google API menggunakan metode HTTP PUT. Laporan kemajuan (progress bar) ditampilkan ke user.Setelah proses selesai, layar web menampilkan notifikasi sukses berwarna hijau menandakan file aman tersimpan.