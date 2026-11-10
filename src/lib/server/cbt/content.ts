import "server-only";
import { randomUUID } from "node:crypto";
import type { Subject } from "../../subjects";
import type { Topic, Option } from "../../types";
import type { ExamItem } from "../../cbt/model";
import { ensure } from "../../domain/errors";
type Row = [string, string, [string, string, string, string], Option, string];
const math: Row[] = [
  [
    "mtk-transformasi-fungsi",
    "Grafik f(x)=2x−1 digeser 4 satuan ke atas. Persamaan hasilnya adalah …",
    ["2x−5", "2x+3", "2(x+4)−1", "8x−1"],
    "B",
    "Pergeseran vertikal menambah keluaran fungsi: (2x−1)+4=2x+3.",
  ],
  [
    "mtk-transformasi-fungsi",
    "Grafik y=x² digeser 3 satuan ke kiri. Persamaan barunya adalah …",
    ["y=(x+3)²", "y=(x−3)²", "y=x²+3", "y=x²−3"],
    "A",
    "Geser kiri 3 satuan mengganti x dengan x+3.",
  ],
  [
    "mtk-transformasi-fungsi",
    "Bayangan grafik y=3x+2 terhadap sumbu-x adalah …",
    ["y=3x−2", "y=−3x+2", "y=−3x−2", "y=x/3+2"],
    "C",
    "Refleksi sumbu-x mengganti y dengan −f(x), sehingga −(3x+2)=−3x−2.",
  ],
  [
    "mtk-transformasi-fungsi",
    "Diketahui f(x)=x² dan g(x)=f(x−2)+5. Nilai g(3) adalah …",
    ["14", "4", "9", "6"],
    "D",
    "g(3)=(3−2)²+5=6.",
  ],
  [
    "mtk-transformasi-fungsi",
    "Jika f(x)=2^x dan g(x)=f(x+1)−3, nilai g(2) adalah …",
    ["1", "5", "13", "−1"],
    "B",
    "g(2)=2³−3=5.",
  ],
  [
    "mtk-transformasi-fungsi",
    "Titik puncak grafik g(x)=−2(x−1)²+4 adalah …",
    ["(−1,4)", "(1,−4)", "(1,4)", "(2,4)"],
    "C",
    "Bentuk a(x−h)²+k memiliki puncak (h,k), yaitu (1,4).",
  ],
  [
    "mtk-busur-juring",
    "Lingkaran berjari-jari 12 cm memiliki sudut pusat 60°. Panjang busur kecilnya adalah …",
    ["4π cm", "6π cm", "12π cm", "24π cm"],
    "A",
    "Panjang busur=(60/360)×2π×12=4π cm.",
  ],
  [
    "mtk-busur-juring",
    "Luas juring bersudut 72° pada lingkaran berjari-jari 10 cm adalah …",
    ["10π cm²", "20π cm²", "40π cm²", "100π cm²"],
    "B",
    "Luas=(72/360)×π×10²=20π cm².",
  ],
  [
    "mtk-busur-juring",
    "Busur pada lingkaran berjari-jari 9 cm panjangnya 6π cm. Sudut pusat busur itu adalah …",
    ["60°", "90°", "120°", "180°"],
    "C",
    "6π/(18π)=1/3 keliling, sehingga sudutnya 120°.",
  ],
  [
    "mtk-busur-juring",
    "Panjang busur bersudut pusat 120° pada lingkaran berjari-jari 15 cm adalah …",
    ["5π cm", "15π cm", "30π cm", "10π cm"],
    "D",
    "(120/360)×2π×15=10π cm.",
  ],
  [
    "mtk-busur-juring",
    "Luas suatu juring adalah 18π cm² dan jari-jari lingkarannya 6 cm. Sudut pusatnya adalah …",
    ["180°", "90°", "120°", "270°"],
    "A",
    "Luas lingkaran 36π. Juring setengah luas lingkaran, jadi sudutnya 180°.",
  ],
  [
    "mtk-busur-juring",
    "Roda berjari-jari 21 cm menggelinding tanpa selip sebanyak 2,5 putaran. Jarak tempuhnya adalah …",
    ["52,5π cm", "105π cm", "210π cm", "42π cm"],
    "B",
    "Keliling roda 42π cm; 2,5×42π=105π cm.",
  ],
  [
    "mtk-kaidah-pencacahan",
    "Tersedia 4 kemeja, 3 celana, dan 2 pasang sepatu. Banyak pilihan satu set yang terdiri atas masing-masing satu jenis adalah …",
    ["9", "12", "24", "48"],
    "C",
    "Aturan perkalian: 4×3×2=24.",
  ],
  [
    "mtk-kaidah-pencacahan",
    "Dua siswa dipilih menjadi perwakilan tanpa membedakan jabatan dari 9 calon. Banyak cara memilihnya adalah …",
    ["18", "72", "81", "36"],
    "D",
    "Kombinasi C(9,2)=9×8/2=36.",
  ],
  [
    "mtk-kaidah-pencacahan",
    "Ketua, sekretaris, dan bendahara dipilih dari 7 calon; satu orang memegang satu jabatan. Banyak susunannya adalah …",
    ["210", "35", "343", "21"],
    "A",
    "Jabatan berbeda, sehingga 7×6×5=210.",
  ],
  [
    "mtk-kaidah-pencacahan",
    "Kode terdiri atas 3 digit berbeda dari 0,1,2,3,4,5. Digit pertama tidak boleh 0. Banyak kode yang mungkin adalah …",
    ["120", "100", "80", "60"],
    "B",
    "Digit pertama 5 pilihan; berikutnya 5 lalu 4, sehingga 100.",
  ],
  [
    "mtk-kaidah-pencacahan",
    "Empat buku berbeda A,B,C,D disusun sebaris. Jika A dan B harus berdampingan, banyak susunannya adalah …",
    ["6", "8", "12", "24"],
    "C",
    "Anggap A-B sebagai satu blok: 3! susunan blok, dikali 2 urutan internal, jadi 12.",
  ],
  [
    "mtk-kaidah-pencacahan",
    "Enam orang berbeda A,B,C,D,E,F berbaris. Banyak susunan dengan A dan B tidak berdampingan adalah …",
    ["240", "360", "600", "480"],
    "D",
    "Semua 6!=720; A dan B berdampingan berjumlah 2×5!=240; sisanya 480.",
  ],
  [
    "mtk-peluang-data",
    "Kotak berisi 3 bola merah dan 7 bola putih yang sama ukurannya. Peluang mengambil satu bola merah secara acak adalah …",
    ["3/10", "3/7", "7/10", "1/3"],
    "A",
    "Ada 3 hasil merah dari 10 bola.",
  ],
  [
    "mtk-peluang-data",
    "Rata-rata lima nilai 6,7,8,9,10 adalah …",
    ["7", "8", "9", "40"],
    "B",
    "Jumlah 40 dibagi 5 menghasilkan 8.",
  ],
  [
    "mtk-peluang-data",
    "Dua koin seimbang dilempar bersamaan. Peluang muncul sedikitnya satu sisi gambar adalah …",
    ["1/4", "1/2", "3/4", "1"],
    "C",
    "Dari empat pasangan sama mungkin, tiga memiliki sedikitnya satu gambar.",
  ],
  [
    "mtk-peluang-data",
    "Satu kartu dipilih acak dari kartu bernomor 1 sampai 12. Peluang nomornya habis dibagi 3 atau 4 adalah …",
    ["1/3", "7/12", "5/12", "1/2"],
    "D",
    "Kelipatan 3: 3,6,9,12; kelipatan 4: 4,8,12. Ada 6 nomor berbeda, sehingga 6/12.",
  ],
  [
    "mtk-peluang-data",
    "Kotak berisi 4 bola hijau dan 2 bola kuning. Dua bola diambil tanpa pengembalian. Peluang keduanya hijau adalah …",
    ["2/5", "4/9", "1/3", "2/3"],
    "A",
    "(4/6)×(3/5)=12/30=2/5.",
  ],
  [
    "mtk-peluang-data",
    "Siswa yang mengikuti klub belajar memiliki rata-rata nilai lebih tinggi, tetapi peserta memilih sendiri ikut atau tidak. Kesimpulan yang paling tepat adalah …",
    [
      "Klub pasti menyebabkan kenaikan nilai.",
      "Ada hubungan pada data, tetapi faktor lain perlu diperiksa sebelum menyimpulkan sebab-akibat.",
      "Semua siswa wajib memperoleh kenaikan yang sama.",
      "Data membuktikan siswa di luar klub tidak pernah belajar.",
    ],
    "B",
    "Pemilihan sendiri dapat terkait motivasi atau kemampuan awal; asosiasi belum membuktikan sebab-akibat.",
  ],
];
const enInfo = `The science club at Meranti Senior High School began a small repair corner in September. Students could bring damaged school items, such as loose pencil cases or broken bag straps, instead of throwing them away immediately. The corner opened on Wednesdays from half past two until half past three. A technology teacher supervised the work, and two volunteers recorded each item before anyone tried to repair it. Electrical devices were not accepted because the school did not have the equipment needed to check them safely.

During the first month, volunteers received thirty items and repaired twenty-one. Five items needed spare parts that were not available, while four were too badly damaged. The team counted an item as repaired only after its owner had tried it and agreed that it could be used again. A volunteer who had worked on an item could not approve it on the owner's behalf. This rule sometimes made the process slower, but it gave the club a more useful record than counting every attempted repair as a success.

The club now wants to understand whether the corner reduces waste over a longer period. Its first report describes the items received, rather than all the things students throw away. It therefore cannot show how much waste the whole school has avoided. Next term, the team plans to ask owners whether their repaired items are still in use after six weeks. It will also record the time and materials required for different repairs. The teacher believes these details will help the club decide which services it can continue to offer without promising more than its volunteers can manage.`;
const enStory = `Raka had agreed to lead his group during the school history exhibition. They had interviewed several residents about a bridge that once connected two neighbourhoods. Raka prepared a careful timeline and planned to read it from a large poster. He believed that the clearest presentation would be the one with the fewest unexpected questions. His group placed photographs and a model of the bridge on the table, but he treated them mainly as decorations for his written explanation.

On the morning of the exhibition, a visitor pointed to a photograph and asked why one date was different from the date on the poster. Raka felt his face grow warm. For a moment he considered moving the photograph behind the model so that no one else would notice. Instead, he asked the visitor where she had found her information. She explained that her father had helped repair the bridge after a flood and had kept notes about the work. Her date described the repair, while the group's date described the original opening.

Raka wrote a short label explaining the distinction and placed it between the poster and the photograph. Later visitors asked more questions, but he no longer tried to avoid them. He invited his group members to show their interview notes and explain which details still needed checking. By the end of the day, the table was covered with small labels. The display looked less tidy than he had imagined, yet Raka felt more confident about it. He had learned that a useful exhibition could show how people investigate a question, rather than pretending that every part of the story was already settled.`;
const enArgument = `Some students at Lestari Senior High School have proposed a quiet study room that would remain open for forty minutes before lessons begin. They argue that it could help pupils who arrive early because of shared transport. At present, many of these pupils wait near the gate, where conversations and traffic can make reading difficult. A room with clear rules might give them another choice, provided that using it remains voluntary.

The proposal should be tested before the school turns it into a permanent service. A survey of forty early arrivals found that twenty-eight would consider using the room. However, the survey did not ask how often they would come, and it did not include pupils who usually arrive just before class. These results suggest interest among some pupils, but they do not show that the room would be full every morning. They also cannot tell us whether quiet study would improve examination scores.

A four-week trial could provide better information about demand and supervision. Staff could record attendance without publishing individual names and ask users which arrangements helped them concentrate. Pupils who prefer to talk with friends should still have a suitable place to wait. At the end of the trial, the school could compare the room's use with the staff time it requires and decide whether to continue it. Supporting a study space does not mean claiming that one environment suits everyone. It means offering a practical option, checking how people use it, and being prepared to change the plan when the evidence suggests a better arrangement.`;
const enProcedure = `Before recording an interview for the school audio archive, contact the person you hope to interview and explain the purpose of the project. Tell them where the recording may be played and ask whether they agree to take part. Send a short list of possible topics in advance. An agreement to discuss a topic is not permission to publish every detail, so remind the person that they may decline a question or ask for a section to be removed.

On the day of the interview, choose a place away from loud traffic and test the recorder with a short conversation. Play the test back through headphones. If words are difficult to hear, change the microphone position or move to a quieter place before beginning. Keep a second copy of the question list on paper so that a low phone battery does not interrupt the discussion. During the interview, let the speaker finish and ask follow-up questions when a detail is unclear.

Afterwards, label the audio file with a project code rather than the speaker's full contact details. Save the original in the school's restricted project folder and prepare a separate copy for editing. Send the proposed public version to the speaker for approval. Do not upload that version while approval is still pending, even if the original interview went well. Record any requested changes and check the revised version again. If approval is not given, the file must remain outside the public archive. These steps help the team produce a clear recording while respecting the person's choices about how their contribution is used.`;
function reading(slug: string, passage: string, rows: ReadingRow[]): Row[] {
  return rows.map((r) => [
    slug,
    `Read the following examination text.\n\n${passage}\n\n${r[0]}`,
    r[1],
    r[2],
    r[3],
  ]);
}
type ReadingRow = [string, [string, string, string, string], Option, string];
const english: Row[] = [
  ...reading("ing-informational-reading", enInfo, [
    [
      "What is the main purpose of the repair corner?",
      [
        "To replace the school's technology lessons.",
        "To help students reuse damaged school items.",
        "To sell new electrical devices.",
        "To collect photographs for an exhibition.",
      ],
      "B",
      "Sudut perbaikan membantu memakai kembali barang sekolah yang rusak.",
    ],
    [
      "Why were electrical devices not accepted?",
      [
        "Students never used them.",
        "They were all repaired elsewhere.",
        "The school lacked equipment to check them safely.",
        "Their owners refused to register.",
      ],
      "C",
      "Alasan keselamatan dan keterbatasan peralatan disebut secara eksplisit.",
    ],
    [
      "When was an item counted as repaired?",
      [
        "When a volunteer began work.",
        "When it had been stored for six weeks.",
        "When spare parts had been ordered.",
        "After its owner tried and accepted it.",
      ],
      "D",
      "Definisi keberhasilan mensyaratkan uji dan persetujuan pemilik.",
    ],
    [
      "How many received items could not be repaired in the first month?",
      ["Nine.", "Five.", "Four.", "Twenty-one."],
      "A",
      "Tiga puluh diterima, dua puluh satu diperbaiki: sembilan belum berhasil.",
    ],
    [
      "What does the first report NOT establish?",
      [
        "How many items were received.",
        "How much waste the entire school avoided.",
        "Which items needed spare parts.",
        "How many repairs owners accepted.",
      ],
      "B",
      "Laporan hanya memuat barang yang diterima, bukan seluruh sampah sekolah.",
    ],
    [
      "Why will owners be contacted after six weeks?",
      [
        "To replace the volunteers' records.",
        "To require everyone to buy new bags.",
        "To learn whether repaired items remain in use.",
        "To approve repairs without testing them.",
      ],
      "C",
      "Tindak lanjut mengecek keberlanjutan penggunaan barang.",
    ],
  ] as ReadingRow[]),
  ...reading("ing-narrative-reading", enStory, [
    [
      "What initially made Raka uncomfortable?",
      [
        "His group had lost its model.",
        "The exhibition had been cancelled.",
        "Nobody wanted to visit.",
        "A visitor noticed two different dates.",
      ],
      "D",
      "Konflik dimulai ketika pengunjung menunjuk perbedaan tanggal.",
    ],
    [
      "Why were the two dates different?",
      [
        "They referred to the bridge's opening and a later repair.",
        "One came from a different school exhibition.",
        "The bridge had never been opened.",
        "Both described the same flood.",
      ],
      "A",
      "Tanggal poster untuk pembukaan; catatan ayah pengunjung untuk perbaikan.",
    ],
    [
      "Which action shows Raka choosing investigation over concealment?",
      [
        "He removed all the photographs.",
        "He asked the visitor about her information.",
        "He asked his friends to stop speaking.",
        "He ended the exhibition early.",
      ],
      "B",
      "Ia bertanya tentang sumber informasi setelah sempat ingin menyembunyikan foto.",
    ],
    [
      "What did the new label do?",
      [
        "It claimed every interview was inaccurate.",
        "It replaced all the written evidence.",
        "It explained the distinction between the dates.",
        "It told visitors not to ask questions.",
      ],
      "C",
      "Label mengklarifikasi dua peristiwa yang berbeda.",
    ],
    [
      "How did Raka's attitude to questions change?",
      [
        "He treated them as a reason to hide evidence.",
        "He ignored them more carefully.",
        "He believed only adults should answer.",
        "He welcomed them as part of investigation.",
      ],
      "D",
      "Di akhir ia mengundang penjelasan dan mengakui detail yang belum pasti.",
    ],
    [
      "Which theme is best supported?",
      [
        "Admitting uncertainty can strengthen a presentation.",
        "A tidy display always contains the best evidence.",
        "Written posters should never be changed.",
        "Questions prevent people from learning history.",
      ],
      "A",
      "Kepercayaan dirinya tumbuh lewat klarifikasi dan keterbukaan terhadap ketidakpastian.",
    ],
  ] as ReadingRow[]),
  ...reading("ing-argument-evaluation", enArgument, [
    [
      "What position does the writer support?",
      [
        "Opening a compulsory room immediately.",
        "Testing an optional study room before a permanent decision.",
        "Stopping all conversation before lessons.",
        "Predicting higher scores from the survey alone.",
      ],
      "B",
      "Penulis mendukung uji coba pilihan sukarela dengan evaluasi bukti.",
    ],
    [
      "Who answered the survey described?",
      [
        "All pupils at the school.",
        "Only staff who supervised the gate.",
        "Forty pupils who arrived early.",
        "Twenty-eight pupils chosen for high marks.",
      ],
      "C",
      "Survei melibatkan empat puluh siswa yang datang awal.",
    ],
    [
      "Why can the survey not predict daily attendance?",
      [
        "It had no interested respondents.",
        "The room had already closed.",
        "Transport arrangements were identical.",
        "It did not ask how often respondents would come.",
      ],
      "D",
      "Minat yang dinyatakan tidak menunjukkan frekuensi kunjungan.",
    ],
    [
      "Which claim goes beyond the evidence?",
      [
        "The room will improve examination scores.",
        "Some early arrivals expressed interest.",
        "Staff time should be considered.",
        "A trial could provide more information.",
      ],
      "A",
      "Tidak ada bukti dampak sebab-akibat terhadap hasil ujian.",
    ],
    [
      "Why should another waiting place remain available?",
      [
        "To discourage all early arrivals.",
        "Different pupils may prefer different environments.",
        "To make using the study room compulsory.",
        "The survey proved no one wanted quiet.",
      ],
      "B",
      "Penulis mengakui kebutuhan yang beragam.",
    ],
    [
      "Which evaluation best follows the proposal?",
      [
        "Count only the first day's visitors.",
        "Publish the names of every user.",
        "Compare use over four weeks with supervision time.",
        "Assume interest means full attendance every day.",
      ],
      "C",
      "Evaluasi yang diusulkan membandingkan pemakaian dengan sumber daya pengawasan.",
    ],
  ] as ReadingRow[]),
  ...reading("ing-procedure-reading", enProcedure, [
    [
      "What should happen before an interview is arranged?",
      [
        "Publish the speaker's contact details.",
        "Upload a test recording.",
        "Edit the final public version.",
        "Explain the project and ask for agreement.",
      ],
      "D",
      "Tujuan, penggunaan rekaman, dan persetujuan dijelaskan di awal.",
    ],
    [
      "Why should the team listen to a test through headphones?",
      [
        "To identify sound problems before the interview.",
        "To avoid asking any follow-up questions.",
        "To let the speaker approve every future upload.",
        "To replace the need for a quiet place.",
      ],
      "A",
      "Uji rekaman digunakan untuk menemukan masalah keterdengaran sebelum mulai.",
    ],
    [
      "Why is a paper question list useful?",
      [
        "It prevents speakers from declining questions.",
        "It remains usable if the phone battery is low.",
        "It automatically gives permission to publish.",
        "It contains full contact information for upload.",
      ],
      "B",
      "Salinan kertas menjadi cadangan ketika baterai telepon rendah.",
    ],
    [
      "Which file should be used for editing?",
      [
        "The only original copy.",
        "A file named with private contact details.",
        "A separate copy of the original.",
        "Any file already approved by someone else.",
      ],
      "C",
      "Naskah memerintahkan menyimpan asli dan membuat salinan untuk penyuntingan.",
    ],
    [
      "What should happen while approval of the public version is pending?",
      [
        "Upload it because the interview went well.",
        "Ask volunteers to approve it instead.",
        "Delete the original immediately.",
        "Keep it outside the public archive.",
      ],
      "D",
      "Persetujuan wawancara tidak otomatis menjadi persetujuan publikasi.",
    ],
    [
      "What is the purpose of using a project code?",
      [
        "To label files without exposing full contact details.",
        "To make the recording impossible to edit.",
        "To remove the need for permission.",
        "To publish every requested detail.",
      ],
      "A",
      "Kode proyek mengurangi pengungkapan informasi kontak pada label berkas.",
    ],
  ] as ReadingRow[]),
];
const idInfo =
  "SMA Nusa menguji layanan peminjaman alat praktikum selama empat pekan. Peminjam memesan melalui daftar kelas, kemudian memeriksa kondisi alat bersama petugas. Alat yang belum lolos pemeriksaan tidak boleh dipinjamkan. Sebelum uji coba, sebagian siswa membawa alat sendiri dan sebagian menunggu giliran. Sekolah ingin mengetahui apakah layanan bersama dapat memperluas kesempatan berpraktik.\n\nSelama uji coba tercatat 64 peminjaman. Angka itu bukan jumlah siswa berbeda karena satu siswa dapat meminjam lebih dari sekali. Laporan juga menyebutkan bahwa dua kegiatan praktikum berlangsung pada pekan yang sama, sehingga kebutuhan alat mungkin lebih tinggi daripada pekan biasa. Sekolah belum menyimpulkan bahwa peningkatan peminjaman semata-mata disebabkan oleh cara pemesanan baru.\n\nPetugas akan mencatat jumlah peminjam berbeda dan frekuensi penggunaan selama satu bulan berikutnya. Mereka juga akan mendata kerusakan dan lama antrean. Data tersebut dipakai untuk menentukan jenis alat yang perlu ditambah. Keputusan pembelian belum dibuat karena sekolah ingin membandingkan manfaat, biaya pemeliharaan, dan kemampuan petugas menjaga kelayakan alat.";
const idArg =
  "Sebuah tulisan mengusulkan agar tugas kelompok selalu dinilai hanya dari hasil akhirnya. Penulis beralasan bahwa produk yang bagus pasti menunjukkan semua anggota bekerja dengan baik. Namun, contoh yang diberikan hanya satu kelompok yang berhasil meraih penghargaan. Tulisan itu tidak menjelaskan pembagian kerja atau pengalaman kelompok lain.\n\nTanggapan redaksi menerima bahwa mutu produk perlu dinilai, tetapi mempertanyakan kata “pasti”. Hasil kelompok dapat dipengaruhi kemampuan satu anggota atau bantuan dari luar. Untuk menilai kontribusi secara lebih adil, redaksi menyarankan catatan proses, penilaian antarteman yang disertai alasan, dan percakapan singkat dengan anggota. Setiap sumber informasi juga mempunyai keterbatasan; catatan dapat tidak lengkap dan penilaian teman dapat bias.\n\nKarena itu, redaksi mengusulkan penggabungan beberapa bukti yang relevan, bukan mengganti seluruh penilaian dengan satu angka baru. Kriteria perlu dijelaskan sebelum tugas dimulai. Siswa juga perlu diberi kesempatan menerangkan pembagian kerja ketika ada informasi yang bertentangan. Tujuannya adalah membuat keputusan yang lebih dapat dipertanggungjawabkan, bukan menambah formulir tanpa fungsi.";
const idEval =
  "Dalam rapat kelas, seorang peserta menyampaikan bahwa jumlah buku yang dibaca siswa meningkat sejak tersedia rak baca di koridor. Ia menunjukkan daftar peminjaman selama dua pekan. Peserta lain mengingatkan bahwa periode tersebut bertepatan dengan lomba ulasan buku. Daftar itu mencatat transaksi, bukan seluruh kegiatan membaca. Buku milik pribadi dan bacaan digital tidak tercakup.\n\nRapat menyepakati bahwa data peminjaman tetap berguna, tetapi tidak cukup untuk menyimpulkan semua siswa lebih gemar membaca. Kelas akan membandingkan catatan pada periode setelah lomba dan menanyakan pengalaman siswa melalui pertanyaan yang netral. Nama responden tidak diumumkan di papan kelas. Hasilnya akan disajikan sebagai kecenderungan kelompok, bukan peringkat kegemaran membaca setiap siswa.\n\nNotulis diminta menggunakan kalimat yang membedakan pengamatan dari dugaan. Misalnya, “Peminjaman yang tercatat meningkat pada periode pengamatan” lebih sesuai daripada “Rak baca terbukti membuat semua siswa rajin membaca”. Dengan cara itu, laporan dapat membantu keputusan tanpa menyampaikan kepastian yang belum didukung bukti.";
const idStory =
  "Hujan belum reda ketika Lila tiba di balai warga membawa kotak berisi peta buatan kelompoknya. Di depan pintu ia melihat seorang anak kesulitan menemukan jalan ke tempat pendaftaran. Panah pada peta kelompoknya menunjuk ke lorong yang kini ditutup untuk perbaikan. Lila terdiam. Ia telah menghabiskan malam merapikan warna peta itu dan berharap semua orang memujinya.\n\nIa hampir menyalahkan pengurus yang tidak memberi kabar. Namun, anak di depannya masih menunggu. Lila mengambil spidol, menandai jalan alternatif, lalu menempelkan secarik kertas di atas bagian peta yang keliru. Warna kertas itu berbeda dan menutupi sebagian gambar yang ia sukai. Ketika pengunjung berikutnya datang, ia berdiri di dekat peta untuk menjelaskan perubahan jalur.\n\nMenjelang siang, kertas kecil itu dipenuhi tanda panah tambahan dari pengunjung. Lila menatapnya sambil tersenyum. Peta itu tidak lagi sebersih rancangan semula, tetapi kini lebih banyak orang mencapai tempat yang mereka cari. Di luar, hujan tinggal menyisakan bunyi tetes di ujung atap.";
function indo(slug: string, passage: string, rows: ReadingRow[]): Row[] {
  return rows.map((r) => [
    slug,
    `Bacalah teks ujian berikut.\n\n${passage}\n\n${r[0]}`,
    r[1],
    r[2],
    r[3],
  ]);
}
const indonesia: Row[] = [
  ...indo("indo-informasi-teks", idInfo, [
    [
      "Berapa lama tahap uji coba pertama berlangsung?",
      ["Dua pekan", "Empat pekan", "Satu semester", "Enam bulan"],
      "B",
      "Durasi empat pekan dinyatakan pada paragraf pertama.",
    ],
    [
      "Apa syarat alat dapat dipinjamkan?",
      [
        "Peminjam harus memiliki alat pribadi.",
        "Alat harus paling baru.",
        "Alat telah lolos pemeriksaan kondisi.",
        "Peminjam harus meminjam dua kali.",
      ],
      "C",
      "Pemeriksaan kelayakan mendahului peminjaman.",
    ],
    [
      "Mengapa 64 peminjaman tidak sama dengan 64 siswa?",
      [
        "Semua alat rusak.",
        "Catatan tidak mencantumkan tanggal.",
        "Setiap kelas mempunyai 64 anggota.",
        "Seorang siswa dapat meminjam berulang.",
      ],
      "D",
      "Unit yang dicatat adalah transaksi peminjaman, bukan individu berbeda.",
    ],
    [
      "Informasi apa yang akan dilengkapi pada pencatatan berikutnya?",
      [
        "Jumlah peminjam berbeda dan frekuensi penggunaan.",
        "Hanya warna alat.",
        "Nama pemenang lomba ulasan buku.",
        "Peringkat nilai setiap peminjam.",
      ],
      "A",
      "Paragraf terakhir menyebut kedua informasi itu.",
    ],
    [
      "Fungsi paragraf kedua terhadap laporan adalah …",
      [
        "Menyatakan pembelian sudah disetujui.",
        "Menyajikan hasil awal beserta batas penafsirannya.",
        "Menggantikan seluruh tujuan layanan.",
        "Membuktikan semua siswa selalu menunggu.",
      ],
      "B",
      "Hasil 64 transaksi disertai keterbatasan dan faktor lain.",
    ],
    [
      "Ringkasan yang paling sesuai adalah …",
      [
        "Pemesanan baru pasti meningkatkan seluruh hasil belajar.",
        "Semua alat harus segera dibeli tanpa pemeriksaan.",
        "Layanan alat sedang dievaluasi dengan data penggunaan dan biaya sebelum keputusan lanjutan.",
        "Layanan gagal karena siswa dapat meminjam berulang.",
      ],
      "C",
      "Ringkasan mempertahankan tahap evaluasi dan kehati-hatian keputusan.",
    ],
  ]),
  ...indo("indo-inferensi-argumen", idArg, [
    [
      "Asumsi utama tulisan yang ditanggapi adalah …",
      [
        "Semua sumber penilaian selalu bebas bias.",
        "Produk akhir tidak boleh dinilai.",
        "Penghargaan kelompok pasti tidak sah.",
        "Produk bagus memastikan semua anggota berkontribusi baik.",
      ],
      "D",
      "Asumsi ini dinyatakan langsung dan dipertanyakan redaksi.",
    ],
    [
      "Kelemahan penggunaan contoh satu kelompok adalah …",
      [
        "Tidak cukup menopang generalisasi untuk semua kelompok.",
        "Menunjukkan proses pasti tidak berguna.",
        "Membuktikan produk harus diabaikan.",
        "Membuat kriteria penilaian tidak diperlukan.",
      ],
      "A",
      "Satu contoh tidak cukup untuk menyimpulkan keadaan semua kelompok.",
    ],
    [
      "Sikap redaksi terhadap penilaian produk adalah …",
      [
        "Menolaknya sama sekali.",
        "Menerimanya sebagai salah satu bukti yang perlu dilengkapi.",
        "Menganggapnya selalu memuat kecurangan.",
        "Menggantinya hanya dengan penilaian teman.",
      ],
      "B",
      "Redaksi menerima mutu produk tetapi menambah bukti proses.",
    ],
    [
      "Mengapa kesempatan memberi penjelasan diperlukan?",
      [
        "Agar semua siswa mendapat angka sama.",
        "Agar catatan proses tidak perlu dibuat.",
        "Untuk menanggapi informasi pembagian kerja yang bertentangan.",
        "Untuk menghapus kriteria yang sudah disepakati.",
      ],
      "C",
      "Kesempatan menjelaskan membantu memeriksa informasi yang saling berbeda.",
    ],
    [
      "Simpulan yang paling didukung adalah …",
      [
        "Satu sumber informasi selalu cukup.",
        "Semua formulir menjamin keadilan.",
        "Penilaian teman selalu lebih baik daripada semua bukti lain.",
        "Penggabungan bukti relevan dapat memperkuat pertanggungjawaban keputusan.",
      ],
      "D",
      "Argumen utama mendukung triangulasi bukti dengan mengakui keterbatasannya.",
    ],
    [
      "Kata “pasti” dikritik karena …",
      [
        "Menyampaikan kepastian yang tidak ditopang bukti yang tersedia.",
        "Selalu salah digunakan dalam setiap kalimat.",
        "Tidak mungkin muncul dalam tulisan argumentasi.",
        "Tidak mempunyai makna dalam bahasa Indonesia.",
      ],
      "A",
      "Kritik berkaitan dengan kekuatan klaim dan dukungan bukti, bukan larangan kata.",
    ],
  ]),
  ...indo("indo-evaluasi-klaim", idEval, [
    [
      "Klaim mana yang paling melampaui data?",
      [
        "Transaksi peminjaman tercatat selama dua pekan.",
        "Rak baca terbukti membuat semua siswa rajin membaca.",
        "Lomba ulasan bertepatan dengan pengamatan.",
        "Bacaan pribadi tidak tercakup dalam daftar.",
      ],
      "B",
      "Klaim sebab-akibat dan semua siswa tidak ditopang catatan transaksi.",
    ],
    [
      "Mengapa periode setelah lomba perlu diamati?",
      [
        "Untuk memastikan lomba tidak pernah diadakan lagi.",
        "Untuk mengganti data dengan dugaan.",
        "Untuk memeriksa kecenderungan ketika faktor lomba tidak lagi bersamaan.",
        "Untuk menghapus seluruh catatan lama.",
      ],
      "C",
      "Perbandingan membantu menilai kemungkinan pengaruh faktor lain.",
    ],
    [
      "Pertanyaan survei yang paling netral adalah …",
      [
        "Setujukah kamu rak baca pasti membuat semua orang rajin?",
        "Mengapa siswa yang tidak meminjam malas membaca?",
        "Bukankah layanan ini selalu berhasil?",
        "Bagaimana pengalamanmu menggunakan rak baca selama dua pekan terakhir?",
      ],
      "D",
      "Pertanyaan terbuka tidak mengarahkan jawaban atau memberi penilaian sebelumnya.",
    ],
    [
      "Kalimat laporan paling sesuai dengan data adalah …",
      [
        "Peminjaman yang tercatat meningkat pada periode pengamatan.",
        "Semua siswa kini membaca setiap hari.",
        "Rak baca merupakan satu-satunya sebab peningkatan.",
        "Siswa yang tidak tercatat pasti tidak membaca.",
      ],
      "A",
      "Kalimat itu membatasi klaim pada hal yang benar-benar diamati.",
    ],
    [
      "Pernyataan mana membedakan batas cakupan data?",
      [
        "Daftar sudah mencakup semua bacaan siswa.",
        "Daftar transaksi belum mencakup bacaan pribadi dan digital.",
        "Catatan transaksi identik dengan minat seluruh siswa.",
        "Nama responden harus diumumkan agar survei sah.",
      ],
      "B",
      "Batas cakupan dijelaskan di paragraf pertama.",
    ],
    [
      "Perbaikan paling tepat untuk “Para siswa-siswa mencatat transaksi” adalah …",
      [
        "Para siswa-siswa sedang mencatat berbagai transaksi-transaksi.",
        "Semua para siswa-siswa mencatat transaksi.",
        "Para siswa mencatat transaksi.",
        "Para setiap siswa-siswa mencatat transaksi.",
      ],
      "C",
      "Kata para sudah menunjukkan jamak, sehingga pengulangan siswa tidak diperlukan.",
    ],
  ]),
  ...indo("indo-apresiasi-sastra", idStory, [
    [
      "Konflik utama Lila adalah …",
      [
        "Ia tidak membawa peta ke balai.",
        "Ia tidak dapat menemukan spidol sama sekali.",
        "Ia diminta meninggalkan kegiatan.",
        "Ia harus memilih mempertahankan keindahan karya atau memperbaiki kegunaannya.",
      ],
      "D",
      "Perubahan yang bermanfaat menutupi rancangan yang ia banggakan.",
    ],
    [
      "Tindakan yang menunjukkan kepedulian Lila adalah …",
      [
        "Menandai jalur alternatif dan membantu pengunjung.",
        "Menyembunyikan peta agar tetap bersih.",
        "Membiarkan anak terus menunggu.",
        "Menyalahkan pengunjung atas kerusakan lorong.",
      ],
      "A",
      "Ia mengutamakan kebutuhan pengunjung dengan perbaikan konkret.",
    ],
    [
      "Makna perubahan peta pada akhir cerita adalah …",
      [
        "Karya tidak boleh menerima masukan.",
        "Karya berkembang menjadi lebih berguna melalui penyesuaian bersama.",
        "Semua perencanaan tidak memiliki manfaat.",
        "Keindahan dan fungsi selalu tidak dapat berdampingan.",
      ],
      "B",
      "Tambahan panah dari pengunjung meningkatkan fungsi peta.",
    ],
    [
      "Bagaimana watak Lila berkembang?",
      [
        "Dari teliti menjadi tidak peduli.",
        "Dari membantu menjadi menolak orang lain.",
        "Dari berfokus pada pujian menjadi mengutamakan manfaat.",
        "Dari tenang menjadi selalu menyalahkan semua orang.",
      ],
      "C",
      "Awalnya mengharap pujian, akhirnya puas karena orang terbantu.",
    ],
    [
      "Citraan pada “bunyi tetes di ujung atap” terutama berkaitan dengan …",
      ["Penglihatan", "Penciuman", "Perabaan", "Pendengaran"],
      "D",
      "Frasa bunyi tetes membangkitkan pengalaman suara.",
    ],
    [
      "Amanat yang paling sesuai dengan tindakan tokoh adalah …",
      [
        "Kesediaan memperbaiki karya dapat membuatnya lebih bermanfaat.",
        "Kritik harus dihindari agar karya tetap bagus.",
        "Karya yang berubah selalu gagal.",
        "Kebutuhan pengguna sebaiknya dikalahkan oleh pujian.",
      ],
      "A",
      "Perbaikan responsif menjadi pusat penyelesaian konflik.",
    ],
  ]),
];
export function examItems(subject: Subject, topics: Topic[]): ExamItem[] {
  const rows =
    subject === "matematika"
      ? math
      : subject === "bahasa-inggris"
        ? english
        : indonesia;
  ensure(rows.length === 24, "Paket ujian belum lengkap.", 503);
  return rows.map(
    ([slug, question_text, options, correct_option, explanation], i) => {
      const topic = topics.find(
        (t) => t.slug === slug && t.subject === subject,
      );
      ensure(topic, "Topik ujian belum tersedia. Hubungi panitia.", 503);
      return {
        id: randomUUID(),
        code: `CBT-${subject}-${i + 1}`,
        topic_id: topic.id,
        topic_name: topic.name,
        question_text,
        options: { A: options[0], B: options[1], C: options[2], D: options[3] },
        correct_option,
        explanation,
      };
    },
  );
}
