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
| 23–36 | Tim, Mode, UI, Polish | 🔜 Mendatang |

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

## Fitur Tahap 22 — Bot AI Combat Lanjutan

- **Balanced bot combat**: Fire rate dikurangi (1.5/s dari 3.0/s), damage dikurangi (12 dari 20), akurasi dikurangi (spread 0.07 dari 0.04) — tidak lagi overpowered
- **Performance optimization**: LOS check di-cache (setiap 0.3s, bukan setiap frame), bullet trail reuse, reusable Vector3 objects, no double LOS check
- **Bot take cover**: Saat HP < 20, bot mencari posisi di belakang tembok untuk berlindung dari pemain — tidak nabrak tembok
- **Bot crouch**: Saat HP < 30, bot crouch untuk reduce profile — animasi visual (scale.y = 0.6)
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
- **Melee hit fix (CRITICAL)**: `updateMatrixWorld(true)` ditambahkan di `checkBotHit()` — bot sekarang bisa dihit dengan pisau dan tangan kosong
- **Lag fix**: Muzzle flash geometry disederhanakan, shared bullet trail material, cached LOS, max 6 bullet trails

## Fitur Tahap 21 — Bot AI Shooting & Targeting (v3)

- **Bot shooting**: Bot menembak ke pemain dengan Glock (damage 20, rate 3.0/s)
- **Line of Sight (LOS)**: Bot hanya menembak jika bisa melihat pemain — tidak bisa wall hack!
- **LOS check**: Raycast dari bot ke pemain, memeriksa apakah ada dinding/cover menghalangi
- **Accuracy**: Medium bot (spread 0.04, ~60% hit chance), tidak 100% akurat
- **Shoot delay**: Random delay ±0.3s pada fire rate untuk variasi tembakan
- **Muzzle flash**: Visual flash di bot saat menembak (sama seperti pemain)
- **Bullet trail**: Garis trail visual dari bot ke arah tembakan
- **Damage falloff**: Damage berkurang 50% di jarak maksimum (60 unit)
- **State machine**: idle → patrol → chase → shoot (saat dalam range dan LOS)
- **Weapon pose (v3)**: Tangan kanan bot memegang pistol dengan pose aiming, tangan kiri berayun
- **Gun model (v3)**: Glock model (body + handle) terpasang di tangan kanan bot
- **Animation pose (v3)**: Right arm tetap di pose aiming saat walking, idle, jumping — hanya subtle bob
- **Improved pathfinding (v3)**: Bot langsung menuju pemain saat LOS clear, waypoint-based navigation saat path terblokir
- **Narrow gap navigation (v3)**: Bot radius lebih kecil (0.35 vs 0.5) agar bisa melewati celah sempit (pintu, choke point)
- **Waypoint system (v3)**: Door-gap waypoints — titik navigasi di pintu masuk, choke point, dan celah koridor
- **Direct movement (v3)**: Bot bergerak langsung ke pemain (bukan strafe berputar-putar)
- **Melee hit fix (v3)**: Fist dan Knife sekarang bisa mengenai bot — checkBotHit() dipanggil SEBELUM wall check

## Fitur Tahap 20 — Bot AI (v2)

- **Minecraft-style blocky bots**: Head, body, arms, legs, shoes — semua BoxGeometry
- **3 bots** spawn di arena dengan posisi acak
- **Walk animation (v2)**: Kaki dan tangan berayun dari pivot point (bahu/pinggul), sepatu ikut bergerak
- **Jump animation (v2)**: Full jump cycle — rising (kaki ditekuk, tangan naik), falling (kaki menggantung), landing (kaki menekuk, tangan ke depan)
- **Bot jumping (v2)**: Bot bisa melompati cover object (tembok setengah tinggi) secara otomatis
- **Jump physics (v2)**: Gravity, velocityY, landing detection on ground & cover objects
- **Waypoint-based patrol**: Bot bergerak dari waypoint ke waypoint di arena
- **State machine**: patrol (default) → chase (saat melihat pemain dalam 30 unit)
- **Collision detection (v2)**: Bot memperhitungkan posisi Y — bisa menembus cover saat di atas
- **Smart obstacle avoidance (v2)**: Coba belok ke beberapa sudut sebelum menyerah, tidak hanya random
- **Cover detection (v2)**: Bot mendeteksi cover object di depan dan melompatinya
- **Strafe movement (v2)**: Bot tidak hanya mengikuti lurus — ada komponen strafe untuk menghindari circling
- **Stuck detection (v2)**: Lebih cepat (1.5 detik), threshold lebih kecil (0.3 unit), avoidance timer
- **Bot hit detection (v2)**: Recursive raycast — bisa mengenai semua body part termasuk sepatu dalam pivot
- **Melee kill support (v2)**: Bot bisa dibunuh dengan tangan kosong dan pisau (raycast recursive fix)
- **Bot death & respawn**: Bot mati dan respawn setelah 5 detik, reset jump state
- **Enemy team**: Bot berwarna merah (shirt) dengan kulit, celana biru, dan sepatu gelap

## Fitur Tahap 19 — HP & Damage

- **Player HP**: 100 HP, ditampilkan di bar HP (top-left)
- **Damage calculation**: Damage dikurangi armor defense (percentage-based reduction)
- **Armor formula**: `damage * (1 - totalDefense/200)`, max 75% reduction
- **Headshot minimum**: Headshot selalu minimum 10 damage, bahkan dengan heavy armor
- **Fall damage**: 10 damage per unit di atas 3 unit jatuh
- **Death & respawn**: Mati → layar "YOU DIED" → respawn 3 detik di spawn point
- **Damage flash**: Layar merah flash saat terkena damage
- **Test keys**: F5=20dmg, F6=headshot(40dmg), F7=kill(100dmg)

## Fitur Tahap 18 — Sistem Armor

- **4 armor slots**: Helmet, Vest, Pants, Shoes — masing-masing bisa di-equip/unequip
- **Defense stat**: Percentage-based reduction (max 75%), bukan flat subtraction
- **Speed bonus/penalty**: Shoes Light (+0.5 speed), Shoes Heavy (-1 speed)
- **Armor HUD**: Top-left panel menampilkan armor yang di-equip dan total defense
- **Inventory screen**: Tombol I = buka armor inventory, klik item untuk equip/unequip
- **Fullscreen restore**: Menutup inventory otomatis mengembalikan fullscreen + pointer lock

## Fitur Tahap 17 — Weapon Switching & Inventory

- **Weapon switch animation**: Brief lower + raise weapon animation (0.15s per phase)
- **Drop weapon**: Tombol B = drop current weapon ke ground sebagai pickup item
- **Pickup weapon**: Walk over dropped weapon untuk auto-pickup (2 detik cooldown setelah drop)
- **Quick-switch**: Tombol Q = cycle weapon variant (Pistol/Rifle/Shotgun/Sniper)
- **Inventory tracking**: Dropped weapons retain ammo state, variant removal from ownedVariants
- **Slot skip**: Switching slots otomatis skip ke variant yang tersedia

## Bug Fixes (Tahap 22)

- **Bot overpowered fix**: Fire rate 3.0/s → 1.5/s, damage 20 → 12, spread 0.04 → 0.07 — bot tidak lagi terlalu kuat
- **Lag fix**: Cached LOS check (setiap 0.3s bukan setiap frame), reusable Vector3 objects, shared bullet trail material, simplified muzzle flash, max 6 bullet trails — tidak lag bahkan 3 bot keroyok
- **Melee hit fix (CRITICAL)**: `updateMatrixWorld(true)` ditambahkan di `checkBotHit()` — bot sekarang bisa dihit dengan pisau dan tangan kosong (bug ini sudah berulang kali diperbaiki tapi selalu kembali)
- **Bot take cover**: Bot mencari posisi di belakang tembok, tidak nabrak tembok — collision check saat bergerak ke cover
- **Bot weapon switching**: Bot switch senjata berdasarkan jarak — melee dekat, shotgun medium-dekat, pistol medium, rifle medium-jauh, sniper jauh
- **Bot sprint**: Bot bisa sprint (speed 7.0) saat mengejar pemain dari jarak jauh

## Bug Fixes (Tahap 21 v3)

- **Bot melee kill fix**: checkBotHit() dipanggil SEBELUM wall check di doFistPunch() dan doKnifeSlash() — bot sekarang bisa dibunuh dengan tangan kosong dan pisau
- **Bot narrow gap navigation**: Bot radius dikurangi (0.35 vs 0.5) sehingga bisa melewati celah sempit (pintu, choke point)
- **Bot movement fix**: Bot sekarang bergerak langsung ke pemain (direct movement) saat LOS clear, bukan strafe berputar-putar
- **Bot pathfinding improvement**: Waypoint-based navigation saat direct path terblokir, door-gap waypoints di pintu masuk dan choke point
- **Bot wall hack fix**: Line of Sight check — bot tidak menembak jika ada dinding menghalangi
- **Bot shooting**: Bot sekarang benar-benar menembak saat pemain terlihat di line of sight

## Bug Fixes (Tahap 20 v2)

- **Armor inventory fullscreen**: Menutup inventory dengan I sekarang mengembalikan fullscreen + pointer lock
- **Headshot damage**: Armor reduction sekarang percentage-based (max 75%), headshot minimum 10 dmg
- **UI reorganize**: Semua HUD element lebih compact dan tidak tumpang tindih
- **Smoke grenade**: Throttled fade updates (200ms) dan overlay updates (300ms) untuk mengurangi lag
- **Weapon drop**: Hanya menghapus variant spesifik dari ownedVariants, bukan seluruh kategori
- **Bot pathfinding (v2)**: Bot tidak lagi stuck di belakang tembok setengah tinggi — bisa melompat cover
- **Bot walk animation (v2)**: Sepatu sekarang bergerak bersama kaki (shoes sebagai child leg pivot)
- **Bot melee kill (v2)**: Bot bisa dibunuh dengan tangan kosong dan pisau (recursive raycast fix)
- **Bot circling fix (v2)**: Strafe movement mencegah bot mengikuti pemain dalam lingkaran
- **Bot obstacle avoidance (v2)**: Coba belok ke beberapa sudut sebelum menyerah, bukan random

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
