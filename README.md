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
| 4 | Shotgun (Pump/Auto) |
| 5 | Sniper Rifle (Bolt/Semi-Auto) |
| 6 | Rifle (Assault Rifle/SMG) |
| G | Granat (Frag/Smoke) |
| Q | Quick-switch ke senjata sebelumnya |
| R | Reload |
| + / - | Sensitivitas mouse |
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
| 17 | Sistem Senjata — Switching & Inventory Pemain | 🔜 Berikutnya |
| 18–36 | Armor, HP, Bot AI, Tim, Mode, UI, Polish | 🔜 Mendatang |

## Senjata Tersedia

| Slot | Kategori | Senjata | Detail |
|------|----------|---------|--------|
| 1 | Melee | Tangan Kosong | Damage 5, pukulan tangan |
| 2 | Melee | Pisau | Damage 25, slash animation |
| 3 | Pistol | Revolver / Glock-17 / Desert Eagle | Magazine 6/17/7, rate bervariasi |
| 4 | Shotgun | Pump Shotgun / Auto Shotgun | 8/6 pellets, spread tinggi |
| 5 | Sniper | Bolt Sniper / Semi-Auto Sniper | Damage 90/70, scope zoom |
| 6 | Rifle | Assault Rifle / SMG | Magazine 30/35, rate tinggi |
| G | Grenade | Frag Grenade / Smoke Grenade | Damage 80 / Asap 12 detik |

## Fitur Tahap 16 — Sniper Rifle

- **Scope/Zoom**: Klik kanan hold = zoom (FOV 75 → 20), lerp transition smooth
- **Scope overlay**: CSS circle border + fine crosshair saat zoom aktif
- **2 varian sniper**: Bolt Sniper (damage 90, rate 0.5/s, spread 0.005) dan Semi-Auto Sniper (damage 70, rate 1.0/s, spread 0.01)
- **FOV transition**: Lerp dari 75 → 20 saat klik kanan, kembali saat release
- **Weapon slot**: Tombol 5 = sniper

## Fitur Lengkap (Tahap 01–16)

### Sistem Gerakan
- **WASD movement**: Framerate-independent velocity dengan lerp
- **Sprint**: Shift + W, stamina bar, cooldown recovery
- **Crouch/Crawl**: Toggle C, height & speed berubah, crosshair mengecil
- **Jump**: Fisika gravity, landing detection

### Sistem Kamera
- **FPS Camera**: Pointer Lock API, yaw/pitch, YXZ order
- **Pitch limit**: ±89.9° untuk mencegah gimbal lock
- **Sensitivity**: Adjustable via +/- keys

### Sistem Collision
- **AABB collision**: XZ plane dengan Y-axis overlap check
- **Top surface collision**: Cover boxes bisa diinjak
- **Outer walls**: Arena terbatas

### Sistem Arena
- **50x50 map**: Outer walls, central arena, corridors, rooms
- **Choke points**: Pillars, cover boxes, strategic positions
- **Dynamic collision rebuild**: Otomatis saat arena berubah

### Sistem Senjata
- **Raycast shooting**: Three.js Raycaster dari kamera
- **Muzzle flash**: Efek kilatan di depan kamera (disabled untuk melee)
- **Hit detection**: Bullet impact decal pada dinding/objek
- **Rate of fire**: Sesuai data item.json
- **Spread**: Offset random arah raycast per senjata
- **Shotgun pellets**: 6-8 pellets per tembakan dengan spread tinggi
- **Magazine & ammo**: Track currentAmmo, auto-reload saat habis
- **Reload**: Tombol R untuk manual, indicator HUD saat reloading
- **Recoil**: Visual recoil yang mempengaruhi crosshair
- **Hit marker**: Indikator visual di crosshair saat mengenai objek
- **Quick-switch**: Tombol Q untuk kembali ke senjata sebelumnya

### Sistem Melee
- **Fist**: Tangan kosong dengan punch animation, visual anatomi tangan realistis
- **Knife**: Pisau tactical dengan slash animation (blade edge leading)

### Sistem Grenade
- **Frag Grenade**: Projectile physics, arc, detonasi, radius damage
- **Smoke Grenade**: Particle system, asap tebal, optimasi performa
- **Aim/charge mechanic**: Hold untuk mengatur jarak lempar

### Sistem HUD
- **Crosshair**: Dynamic 4-line dengan spread berdasarkan stance/speed
- **Weapon panel**: Slot senjata, current weapon highlighted
- **Ammo counter**: Current magazine / reserve
- **Stamina bar**: Sprint stamina indicator
- **Health bar**: HP indicator
- **Grenade indicator**: Tampilkan tipe granat aktif

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
