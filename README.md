# FPS Game 3D — Web-Based First Person Shooter

Game FPS 3D berbasis web menggunakan **Three.js**. Dibangun secara bertahap (staged development) dari fondasi scene hingga mekanik gameplay lengkap.

## Struktur Proyek

```
fps-game/
├── src/                  # Kode sumber game
│   ├── index.html        # Entry point HTML
│   ├── style.css         # Styling & HUD
│   ├── script.js         # Logika game utama
│   └── item.json         # Data senjata, armor, loot
├── media/                # Screenshot & GIF demo
│   ├── screenshot-*.png
│   └── demo-*.gif
├── releases/             # Paket ZIP per tahap
│   └── fps-game-tahap*.zip
├── docs/                 # Dokumentasi
│   └── fps-game-prompt-dekomposisi.txt
└── README.md
```

## Cara Menjalankan

1. Buka `src/index.html` di browser (Chrome/Edge direkomendasikan)
2. Atau serve dengan HTTP server:
   ```bash
   cd src/
   python3 -m http.server 8000
   ```
3. Buka `http://localhost:8000` di browser

## Kontrol

| Tombol | Fungsi |
|--------|--------|
| W/A/S/D | Berjalan |
| Shift | Lari (Sprint) |
| C | Jongkok / Merayap (toggle) |
| Space | Lompat |
| Mouse | Lihat sekitar |
| Klik Kiri | Tembak / Pukul |
| Klik Kanan | Scope/Zoom (Sniper) |
| 1 | Tangan Kosong (Fist) |
| 2 | Pisau (Knife) |
| 3 | Pistol (Glock/Revolver/Deagle) |
| 4 | Rifle (Assault Rifle/SMG) |
| 5 | Shotgun (Pump/Auto) |
| 6 | Sniper Rifle (Bolt/Semi-Auto) |
| G | Granat Frag (hold=aim) |
| H | Granat Smoke (hold=aim) |
| Q | Cycle weapon variant (Pistol/Rifle/Shotgun/Sniper) |
| B | Drop weapon |
| I | Armor inventory (equip/unequip) |
| R | Reload |
| TAB | Scoreboard |
| + / - | Sensitivitas mouse |
| F5 | Test damage (20) |
| F6 | Test headshot (40) |
| F7 | Test kill (100) |
| ESC | Lepas pointer lock |

## Tahapan Pengembangan

| Tahap | Fitur | Status |
|-------|-------|--------|
| 01 | Fondasi Proyek & Scene 3D | ✅ Selesai |
| 02 | Kontrol Pemain: Berjalan (WASD) | ✅ Selesai |
| 03 | Mekanik Lompat (Jump) | ✅ Selesai |
| 04 | Mekanik Lari (Sprint) | ✅ Selesai |
| 05 | Mekanik Jongkok / Merayap (Crouch/Crawl) | ✅ Selesai |
| 06 | Mouse Look / Kamera FPS Pertama | ✅ Selesai |
| 07 | Collision Detection Dasar | ✅ Selesai |
| 08 | Map/Arena Minimalis Pertama | ✅ Selesai |
| 09 | Sistem Senjata — Definisi Data (item.json) | ✅ Selesai |
| 10 | Mekanik Menembak (Shoot) — Raycast | ✅ Selesai |
| 11 | Mekanik Melempar (Throw) — Granat | ✅ Selesai |
| 12 | Mekanik Pukul Tangan Kosong (Fist/Melee) | ✅ Selesai |
| 13 | Sistem Senjata — Pisau & Melee Weapons | ✅ Selesai |
| 14 | Sistem Senjata — Pistol & Variannya | ✅ Selesai |
| 15 | Sistem Senjata — Shotgun | ✅ Selesai |
| 16 | Sistem Senjata — Sniper Rifle | ✅ Selesai |
| 17 | Sistem Senjata — Switching & Inventory Pemain | ✅ Selesai |
| 18 | Sistem Armor — Helmet, Vest, Celana, Sepatu | ✅ Selesai |
| 19 | HP & Damage Calculation — Death & Respawn | ✅ Selesai |
| 20 | Bot AI — Pergerakan & Pathfinding (v2) | ✅ Selesai |
| 21 | Bot AI — Menembak & Targeting (v3) | ✅ Selesai |
| 22 | Bot AI — Perilacak Combat Lanjutan | ✅ Selesai |
| 23 | Sistem Tim — Team Assignment & Score | ✅ Selesai |
| 24–36 | Mode, UI, Polish | 🔜 Mendatang |

## Senjata Tersedia

| Slot | Kategori | Senjata | Detail |
|------|----------|---------|--------|
| 1 | Melee | Tangan Kosong | Damage 5, pukulan tangan |
| 2 | Melee | Pisau | Damage 25, slash animation |
| 3 | Pistol | Revolver / Glock-17 / Desert Eagle | Magazine 6/17/7, rate bervariasi |
| 4 | Rifle | Assault Rifle / SMG | Magazine 30/35, rate tinggi |
| 5 | Shotgun | Pump Shotgun / Auto Shotgun | 8/6 pellets, spread tinggi |
| 6 | Sniper | Bolt Sniper / Semi-Auto Sniper | Damage 90/70, scope zoom |
| G | Grenade | Frag Grenade / Smoke Grenade | Damage 80 / Asap 12 detik |

## Armor Tersedia

| Slot | Armor | Defense | Bonus |
|------|-------|---------|-------|
| Helmet | Helmet Light / Medium / Heavy | +10 / +25 / +50 | — |
| Vest | Vest Light / Medium / Heavy | +15 / +30 / +60 | — |
| Pants | Pants Light / Medium / Heavy | +8 / +20 / +40 | — |
| Shoes | Shoes Light / Medium / Heavy | +5 / +12 / +25 | +0.5 SPD / — / -1 SPD |

## Fitur Tahap 23 — Team System & Scoreboard

- **Team assignment**: 2 team — Team A (BLUE, player) vs Team B (RED, bots)
- **Team visual**: Bot mesh tetap berwarna merah (Team B), player adalah Team A (BLUE)
- **Friendly fire: OFF**: Teman satu tim tidak bisa damage teman — mencegah team kill
- **Scoreboard**: Kill count per team ditampilkan di HUD (top-center), menampilkan:
  - BLUE kills : RED kills
  - BLUE deaths | RED deaths
- **Kill feed**: Notifikasi kill real-time (top-right), menampilkan killer → weapon → victim
  - Warna team marker (BLUE/RED) pada nama killer dan victim
  - Fade out setelah 5 detik, max 5 entry
- **Team score tracking**: Kill = +1 score untuk team, Death = +1 death count untuk team
- **Main menu (testing)**: Menu di awal game untuk mengatur jumlah bot sebelum mulai
  - Pilih jumlah bot (1/2/3/5)
  - Info team assignment
  - Friendly fire status
  - Tombol "MULAI BERMAIN"
- **Bot crouch pose fix**: Crouch bot sekarang menekuk lutut (bukan hanya scale) — body dan head diturunkan, kaki ditekuk
- **Fullscreen death fix**: Player tetap di fullscreen saat mati — tidak keluar dari fullscreen
  - Pointer lock tidak di-release saat mati
  - Death screen overlay tidak menghalangi click untuk re-lock
  - Fullscreen di-restore saat respawn

## Fitur Tahap 22 — Bot AI Combat Lanjutan

- **Balanced bot combat**: Fire rate dikurangi (1.5/s dari 3.0/s), damage dikurangi (12 dari 20), akurasi dikurangi (spread 0.07 dari 0.04) — tidak lagi overpowered
- **Performance optimization**: LOS check di-cache (setiap 0.3s, bukan setiap frame), bullet trail reuse, reusable Vector3 objects, no double LOS check
- **Bot take cover**: Saat HP < 20, bot mencari posisi di belakang tembok untuk berlindung dari pemain — tidak nabrak tembok
- **Bot crouch**: Saat HP < 30, bot crouch untuk reduce profile — animasi visual (bent kaki, body diturunkan)
- **Bot sprint**: Saat chase dan jarak > 20 unit ke player, bot sprint (speed 7.0) untuk mengejar
- **Bot weapon switching**: Bot otomatis switch senjata berdasarkan jarak ke pemain:
  - < 2.5 unit → Melee (pisau)
  - < 10 unit → Shotgun
  - 10-20 unit → Pistol
  - 20-35 unit → Rifle
  - > 35 unit → Sniper
- **Bot weapon poses**: Setiap senjata punya pose berbeda:
  - Pistol: arm forward, small pistol
  - Shotgun: arm forward, two-handed, long barrel
  - Sniper: arm forward steady, very long barrel
  - Rifle: arm forward angled, medium barrel
  - Melee: arm raised, blade forward
  - Fist: arm forward, fist shape
- **Bot melee attack**: Saat dekat (< 2.5 unit), bot menyerang melee (15 damage/serang)
- **Full state machine**: idle → patrol → chase → shoot → crouch_shoot → take_cover → melee → retreat

## Teknologi

- **Three.js** v0.160.0 — 3D rendering via CDN (jsDelivr)
- **Pointer Lock API** — Mouse capture
- **Keyboard Lock API** — Browser shortcut blocking
- **WebGL** — Hardware-accelerated graphics
- **Pure JavaScript** — Tanpa framework, vanilla JS

## Screenshot & Demo

Lihat folder `media/` untuk screenshot dan GIF demo setiap tahap.

## Releases

Lihat folder `releases/` untuk paket ZIP per tahap. Setiap ZIP berisi source code game (`src/`).
