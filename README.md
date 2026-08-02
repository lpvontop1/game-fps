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
| 20 | Bot AI — Pergerakan & Pathfinding Dasar | ✅ Selesai |
| 21–36 | Bot AI Shooting, Combat, Tim, Mode, UI, Polish | 🔜 Mendatang |

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

## Fitur Tahap 20 — Bot AI

- **Minecraft-style blocky bots**: Head, body, arms, legs, shoes — semua BoxGeometry
- **3 bots** spawn di arena dengan posisi acak
- **Walk animation**: Kaki dan tangan berayun saat berjalan (seperti Minecraft)
- **Waypoint-based patrol**: Bot bergerak dari waypoint ke waypoint di arena
- **State machine**: patrol (default) → chase (saat melihat pemain dalam 30 unit)
- **Collision detection**: Bot tidak bisa menembus dinding (sama seperti pemain)
- **Obstacle avoidance**: Raycast ke depan, belok jika terhalang
- **Stuck detection**: Jika bot tidak bergerak selama 3 detik, cari waypoint baru
- **Bot hit detection**: Tembak bot dengan senjata api, headshot support
- **Bot death & respawn**: Bot mati dan respawn setelah 5 detik
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

## Bug Fixes (Tahap 20 / v8)

- **Armor inventory fullscreen**: Menutup inventory dengan I sekarang mengembalikan fullscreen + pointer lock
- **Headshot damage**: Armor reduction sekarang percentage-based (max 75%), headshot minimum 10 dmg
- **UI reorganize**: Semua HUD element lebih compact dan tidak tumpang tindih
- **Smoke grenade**: Throttled fade updates (200ms) dan overlay updates (300ms) untuk mengurangi lag
- **Weapon drop**: Hanya menghapus variant spesifik dari ownedVariants, bukan seluruh kategori

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
