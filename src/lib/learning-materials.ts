import type { Subject } from "./subjects";
import type { Topic } from "./types";
import { CURRICULUM_SOURCES } from "./curriculum/catalog";

interface Lesson {
  title: string;
  subject: Subject;
  paragraphs: string[];
  example: string;
  exercise: { prompt: string; explanation: string };
}

// Contoh belajar mandiri berbeda dari soal asesmen berkunci di server.
export const LEARNING_MATERIALS: Record<string, Lesson> = {
  "mtk-transformasi-fungsi": {
    title: "Transformasi fungsi",
    subject: "matematika",
    paragraphs: [
      "Pisahkan perubahan pada masukan dan keluaran fungsi. Pada g(x) = f(x − a) + b, grafik bergeser a satuan ke kanan dan b satuan ke atas. Tanda di dalam fungsi berlawanan dengan arah geser horizontal.",
      "Refleksi terhadap sumbu-x menghasilkan −f(x), sedangkan refleksi terhadap sumbu-y menghasilkan f(−x). Kerjakan komposisi perubahan sesuai urutan yang diberikan; periksa satu titik untuk menguji hasilnya.",
    ],
    example:
      "Jika f(x) = x², geser 1 satuan ke kiri lalu 2 satuan ke bawah: g(x) = (x + 1)² − 2. Puncak (0, 0) berpindah ke (−1, −2), sesuai arah geser.",
    exercise: {
      prompt:
        "Grafik y = x² digeser 2 satuan ke kiri dan 1 satuan ke atas. Tentukan persamaan dan puncaknya.",
      explanation:
        "Masukan menjadi x + 2 dan keluaran ditambah 1: y = (x + 2)² + 1. Puncaknya (−2, 1). Substitusikan x = −2 untuk memeriksa nilai minimum 1.",
    },
  },
  "mtk-busur-juring": {
    title: "Busur dan juring lingkaran",
    subject: "matematika",
    paragraphs: [
      "Bandingkan sudut pusat θ dengan satu putaran penuh 360°. Bagian keliling yang dihadapi sudut itu adalah θ/360. Panjang busur s = (θ/360) × 2πr; luas juring L = (θ/360) × πr².",
      "Panjang memakai satuan cm atau m, sedangkan luas memakai cm² atau m². Untuk jalur berbentuk bagian cincin, kurangi luas juring luar dan dalam yang sudut pusatnya sama. Jika panjang busur diketahui, hubungan L = rs/2 juga dapat digunakan.",
    ],
    example:
      "Jari-jari 9 cm dan sudut 80° memberi busur (80/360) × 18π = 4π cm. Luas juringnya (80/360) × 81π = 18π cm².",
    exercise: {
      prompt:
        "Juring berjari-jari 8 cm memiliki sudut pusat 45°. Hitung panjang busur dan luasnya.",
      explanation:
        "Bagian putaran = 45/360 = 1/8. Busur = (1/8) × 16π = 2π cm. Luas = (1/8) × 64π = 8π cm². Periksa perbedaan satuannya.",
    },
  },
  "mtk-kaidah-pencacahan": {
    title: "Kaidah pencacahan",
    subject: "matematika",
    paragraphs: [
      "Gunakan aturan perkalian untuk pilihan yang berlangsung bertahap. Perhatikan pembatasan: apakah suatu pilihan boleh berulang, apakah angka nol boleh di depan, dan apakah ada syarat anggota tertentu.",
      "Urutan membedakan hasil pada permutasi: P(n,r) = n!/(n−r)!. Jika kedudukan anggota sama dan urutan tidak berpengaruh, gunakan kombinasi C(n,r) = n!/[r!(n−r)!]. Untuk syarat 'paling sedikit', pecah kasus yang tidak saling tumpang tindih.",
    ],
    example:
      "Memilih ketua dan wakil dari 5 orang memberi 5 × 4 = 20 susunan. Memilih 2 anggota tanpa jabatan dari 5 orang memberi C(5,2) = 10 kelompok. Pasangan orang sama dengan jabatan tertukar adalah dua susunan, tetapi satu kelompok.",
    exercise: {
      prompt:
        "Dari 8 siswa dipilih 3 anggota tim tanpa pembagian jabatan. Berapa tim yang mungkin?",
      explanation:
        "Urutan tidak membedakan tim, sehingga C(8,3) = (8 × 7 × 6)/(3 × 2 × 1) = 56. Menggunakan 8 × 7 × 6 saja menghitung setiap tim berulang enam kali.",
    },
  },
  "mtk-peluang-data": {
    title: "Peluang dan penalaran data",
    subject: "matematika",
    paragraphs: [
      "Tetapkan ruang sampel sebelum menghitung peluang. Untuk gabungan kejadian gunakan P(A ∪ B) = P(A) + P(B) − P(A ∩ B), agar irisan tidak dihitung dua kali. Pada peluang bersyarat, batasi ruang sampel sesuai informasi yang diketahui.",
      "Pada pengambilan tanpa pengembalian, jumlah benda berubah sesudah pengambilan pertama. Dalam analisis data, hubungan dua variabel belum membuktikan sebab-akibat. Periksa ukuran sampel, cara pengumpulan, dan kemungkinan faktor lain.",
    ],
    example:
      "Dari 24 siswa, 9 ikut klub sains, 8 ikut klub seni, dan 3 ikut keduanya. Anggota sedikitnya satu klub = 9 + 8 − 3 = 14, sehingga peluangnya 14/24 = 7/12.",
    exercise: {
      prompt:
        "Dari 15 peserta, 6 mengikuti kelas pagi dan 4 dari peserta pagi lulus. Jika diketahui peserta mengikuti kelas pagi, berapa peluang ia lulus?",
      explanation:
        "Informasi kelas pagi membatasi ruang sampel menjadi 6 orang. Peluang bersyaratnya 4/6 = 2/3, bukan 4/15. Jumlah seluruh peserta tidak menjadi penyebut setelah syarat diterapkan.",
    },
  },
  "ing-informational-reading": {
    title: "Informational reading",
    subject: "bahasa-inggris",
    paragraphs: [
      "Baca tujuan teks terlebih dahulu, lalu tandai siapa, kegiatan, waktu, dan batas informasi. Bedakan data yang ditulis langsung dari kesimpulan yang memerlukan penghubung antarkalimat.",
      "Kata may, suggests, during the trial, dan before deciding membatasi klaim. Jangan mengubah hasil percobaan terbatas menjadi kepastian berlaku bagi semua orang. Untuk pertanyaan inference, pilih jawaban yang didukung teks tanpa menambah kejadian baru.",
    ],
    example:
      "Teks: 'The school tested a quiet study room for two weeks. Visits increased, but the trial took place before examinations.' Kesimpulan yang wajar: kunjungan meningkat selama uji coba; pengaruh musim ujian masih perlu diperiksa. Teks belum membuktikan ruang itu satu-satunya penyebab kenaikan.",
    exercise: {
      prompt:
        "'Forty students answered the survey. Most preferred printed notes, but absent students were not surveyed.' Apakah seluruh siswa pasti memilih catatan cetak?",
      explanation:
        "Tidak. Most mengacu pada responden yang menjawab, bukan semua siswa. Ketidakhadiran sebagian siswa membatasi cakupan kesimpulan. Jawaban perlu menyebut preferensi responden dan batas sampelnya.",
    },
  },
  "ing-narrative-reading": {
    title: "Narrative reading",
    subject: "bahasa-inggris",
    paragraphs: [
      "Susun alur: situasi awal, konflik, tindakan tokoh, dan perubahan pada akhir cerita. Untuk menafsirkan motivasi atau sikap, cari tindakan dan dialog sebagai bukti.",
      "Pesan cerita sebaiknya menjelaskan hubungan antara konflik dan tindakan akhir. Hindari pilihan yang hanya mengulang detail kecil, memakai kata always/never tanpa dukungan, atau menambahkan niat yang tidak ditunjukkan tokoh.",
    ],
    example:
      "Teks: 'Mira hid her unfinished drawing. After her friend shared a rough sketch, she placed hers on the table and asked for advice.' Perubahan dari menyembunyikan menjadi meminta saran menunjukkan ia mulai bersedia menerima masukan; teks tidak mengatakan ia langsung menjadi pelukis terbaik.",
    exercise: {
      prompt:
        "Seorang tokoh semula menolak kerja kelompok, lalu membagi tugas dan mendengarkan ide temannya. Bukti mana yang paling kuat untuk perubahan sikapnya?",
      explanation:
        "Tindakan membagi tugas dan mendengarkan adalah bukti langsung bahwa ia mulai bekerja sama. Pernyataan 'ia tidak akan pernah kesulitan lagi' melampaui informasi cerita.",
    },
  },
  "ing-argument-evaluation": {
    title: "Argument and evidence",
    subject: "bahasa-inggris",
    paragraphs: [
      "Pisahkan claim, reason, evidence, dan recommendation. Claim adalah pendapat yang diajukan; evidence adalah informasi yang digunakan untuk mendukungnya. Bukti harus relevan dengan pertanyaan yang ingin dijawab.",
      "Periksa apakah sampel mewakili kelompok, apakah perbandingan dilakukan dalam kondisi sebanding, dan apakah penulis mengakui keterbatasan. Kata however atau although biasanya menandai pertimbangan yang perlu dihubungkan dengan gagasan utama.",
    ],
    example:
      "Klaim: 'A new timetable reduces lateness.' Bukti yang sesuai adalah catatan keterlambatan sebelum dan selama percobaan dengan perubahan transportasi ikut dicatat. Warna poster jadwal bukan ukuran keterlambatan.",
    exercise: {
      prompt:
        "'Three club members enjoyed the new activity, so every student will benefit.' Apa kelemahan penalarannya?",
      explanation:
        "Pendapat tiga anggota tidak cukup menjamin hasil seluruh siswa. Perlu responden yang lebih beragam dan ukuran manfaat yang jelas. Kelemahan bukti tidak otomatis membuktikan kegiatan itu tidak berguna.",
    },
  },
  "ing-procedure-reading": {
    title: "Procedures and practical texts",
    subject: "bahasa-inggris",
    paragraphs: [
      "Tandai tujuan, urutan tindakan, persyaratan, dan larangan. Kata before/after menunjukkan urutan; must/at least menunjukkan syarat; unless/if menunjukkan kondisi. Registration belum tentu sama dengan approval.",
      "Saat memilih tindakan, periksa semua syarat, bukan hanya urutannya. Sebuah jawaban bisa terlihat masuk akal tetapi melanggar tenggat, melewati persetujuan, atau mengabaikan larangan tertulis.",
    ],
    example:
      "Petunjuk: 'Book a room by Tuesday. Bring the signed approval on Thursday. Do not move the speakers.' Menulis nama pemesan belum menggantikan persetujuan bertanda tangan. Memindahkan pengeras suara tetap dilarang meskipun ruangan sudah dipesan.",
    exercise: {
      prompt:
        "'Submit the form before Friday. Collect the badge only after receiving confirmation.' Bolehkah peserta mengambil lencana setelah mengirim formulir tetapi belum mendapat konfirmasi?",
      explanation:
        "Belum boleh. Only after menjadikan konfirmasi syarat pengambilan. Mengirim formulir memenuhi satu langkah, tetapi belum membuktikan langkah persetujuan selesai.",
    },
  },
  "indo-informasi-teks": {
    title: "Informasi dan struktur teks",
    subject: "bahasa-indonesia",
    paragraphs: [
      "Tandai gagasan utama dan rincian yang mendukungnya. Angka, durasi, pelaku, dan tujuan harus dibaca sesuai satuan serta konteks kalimatnya. Jangan menukar jumlah kegiatan dengan lamanya program.",
      "Ringkasan mempertahankan gagasan utama, hasil, dan batas informasi. Kata sebagian, selama uji coba, dan belum diputuskan tidak boleh berubah menjadi semua, selamanya, atau sudah ditetapkan.",
    ],
    example:
      "Teks menyatakan 18 dari 30 responden memilih jadwal pagi dan sekolah akan berdiskusi lagi. Ringkasan yang tepat menyebut preferensi mayoritas responden serta keputusan yang belum final, bukan mengklaim semua siswa setuju dan jadwal sudah berubah.",
    exercise: {
      prompt:
        "Program berjalan empat pekan dan mencatat 90 kunjungan. Bolehkah ringkasannya menyebut 90 siswa berbeda mengikuti program?",
      explanation:
        "Tidak. Kunjungan dapat berasal dari orang yang sama berkali-kali. Ringkasan harus tetap memakai satuan kunjungan dan tidak menambahkan jumlah individu yang tidak diukur.",
    },
  },
  "indo-inferensi-argumen": {
    title: "Inferensi dan argumentasi",
    subject: "bahasa-indonesia",
    paragraphs: [
      "Inferensi menghubungkan informasi yang tertulis untuk memperoleh simpulan yang didukung teks. Bedakan simpulan itu dari dugaan yang membutuhkan informasi baru. Temukan alasan yang menghubungkan usulan dengan masalah.",
      "Uji argumen dengan bertanya: apakah solusi menyasar penyebab yang diamati, apakah semua anggota dipertimbangkan, dan data apa yang dapat menilai keberhasilannya? Hindari menyatakan solusi pasti berhasil sebelum diuji.",
    ],
    example:
      "Jika antrean terutama disebabkan pembayaran tunai yang lambat, usulan jalur pembayaran terpisah perlu dinilai dari perubahan waktu tunggu. Jumlah unggahan promosi tidak langsung mengukur masalah antrean.",
    exercise: {
      prompt:
        "Sebagian anggota tidak bisa rapat malam. Kelompok menawarkan rapat siang dan catatan tertulis yang dapat dibaca bersama. Simpulan apa yang didukung?",
      explanation:
        "Cara bekerja dapat disesuaikan agar anggota tetap berpartisipasi. Teks tidak menyatakan semua rapat harus dilarang atau anggota tertentu boleh memutuskan sendiri.",
    },
  },
  "indo-evaluasi-klaim": {
    title: "Evaluasi klaim dan kebahasaan",
    subject: "bahasa-indonesia",
    paragraphs: [
      "Periksa kecocokan antara kekuatan klaim dan kekuatan bukti. Kata pasti, semua, dan satu-satunya membutuhkan dukungan yang jauh lebih kuat daripada pengalaman beberapa orang. Korelasi atau urutan waktu saja belum membuktikan sebab-akibat.",
      "Saat memperbaiki kalimat, pertahankan makna, periksa hubungan antarklausa, dan hilangkan pemborosan. Penanda jamak tidak perlu ditumpuk. Kalimat yang terdengar tegas belum tentu lebih akurat daripada kalimat yang membatasi simpulan sesuai data.",
    ],
    example:
      "Klaim 'Dua pembaca menyukai buku ini, maka semua remaja pasti menyukainya' melampaui sampel. Perbaikan: 'Dua pembaca yang diwawancarai menyukai buku ini; tanggapan kelompok lain belum diketahui.'",
    exercise: {
      prompt:
        "Survei satu kelas menunjukkan pemakai jadwal belajar mendapat nilai lebih tinggi. Bagaimana menulis simpulan yang bertanggung jawab?",
      explanation:
        "Nyatakan hubungan yang teramati pada kelas tersebut dan sebutkan bahwa faktor lain belum dikendalikan. Jangan mengklaim jadwal itu satu-satunya penyebab atau pasti memberi hasil sama bagi semua siswa.",
    },
  },
  "indo-apresiasi-sastra": {
    title: "Apresiasi teks sastra",
    subject: "bahasa-indonesia",
    paragraphs: [
      "Untuk membaca cerita, temukan konflik dan perubahan tokoh melalui tindakan atau dialog. Penafsiran harus dapat dikaitkan dengan detail teks, bukan hanya pengalaman pribadi pembaca.",
      "Pada puisi, perhatikan citraan, perbandingan, dan hubungan antarlirik. Makna kias ditafsirkan melalui keseluruhan konteks. Jangan menganggap setiap benda disebut secara harfiah atau memaksakan satu simbol dengan arti yang selalu sama.",
    ],
    example:
      "Ungkapan 'nasihat itu menjadi kompas di sakunya' dapat menyatakan pedoman yang dibawa tokoh dalam mengambil keputusan. Bukti pendukungnya adalah tindakan tokoh sesudah mengingat nasihat, bukan anggapan bahwa sakunya berisi alat navigasi sungguhan.",
    exercise: {
      prompt:
        "Tokoh yang semula menghindari tetangganya kemudian mengetuk pintu dan menawarkan bantuan. Detail mana mendukung simpulan bahwa sikapnya berubah?",
      explanation:
        "Tindakan mendatangi dan menawarkan bantuan menjadi bukti perubahan dari menghindar menuju kepedulian. Menyatakan ia tidak akan pernah berselisih lagi tidak didukung satu peristiwa tersebut.",
    },
  },
};

export function topicWithLearningMaterial(topic: Topic): Topic {
  if (!Object.hasOwn(LEARNING_MATERIALS, topic.slug)) return topic;
  if (topic.material_url && topic.material_url !== CURRICULUM_SOURCES[2].url)
    return topic;
  return {
    ...topic,
    material_title: `Pelajari ${topic.name}`,
    material_url: `/materi/${topic.slug}`,
  };
}
