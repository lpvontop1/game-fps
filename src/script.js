/* ============================================================
   script.js — FPS Game Tahap 19: HP & Damage Calculation
   + Tahap 01-18 + Bug fixes v7 (smoke, weapon drop, armor, cycle)
   ============================================================ */

// ── Konfigurasi ──────────────────────────────────────────────
const CONFIG = {
  // Camera
  cameraFOV: 75,
  cameraNear: 0.1,
  cameraFar: 1000,
  cameraStartY: 1.7,
  cameraStartZ: 0,

  // Scene
  backgroundColor: 0x222222,
  groundWidth: 60,
  groundHeight: 60,
  groundColor: 0x555555,

  // Renderer
  antialias: true,

  // Grid (disabled — arena provides visual reference)
  showGrid: false,
  gridSize: 60,
  gridDivisions: 60,
  gridColor1: 0x444444,
  gridColor2: 0x888888,

  // ── Tahap 02: Movement ────────────────────────────────────
  walkSpeed: 5.0,
  playerHeight: 1.7,
  movementSmoothing: 0.85,

  // ── Tahap 06: Mouse Look ──────────────────────────────────
  mouseSensitivity: 0.002,
  mouseSensitivityMin: 0.0005,
  mouseSensitivityMax: 0.01,
  mouseSensitivityStep: 0.0005,
  mouseSmoothing: 0.6,
  mouseSmoothBuffer: 4,

  // ── Tahap 03: Jump Physics ────────────────────────────────
  gravity: -9.8,
  jumpForce: 5.5,
  groundLevel: 1.7,

  // ── Tahap 04: Sprint & Stamina ────────────────────────────
  sprintSpeed: 9.0,
  staminaMax: 100,
  staminaDrain: 20,
  staminaRecovery: 10,

  // ── Tahap 05: Crouch & Crawl ──────────────────────────────
  crouchSpeed: 3.0,
  crawlSpeed: 2.0,
  crouchHeight: 0.9,
  crawlHeight: 0.4,
  standHeight: 1.7,
  crouchTransitionLerp: 0.12,

  // ── Tahap 07: Collision Detection ─────────────────────────
  playerRadius: 0.5,
  collisionEnabled: true,

  // ── Tahap 08: Arena Map ───────────────────────────────────
  arenaSize: 50,
  wallHeight: 3,
  outerWallHeight: 6,       // BUG FIX: outer walls taller so player can't jump over
  wallThickness: 0.5,

  // ── Tahap 10: Shooting ────────────────────────────────────
  muzzleFlashDuration: 0.1,
  reloadTime: 2.0,
  raycastFar: 200,
  hitMarkerDuration: 0.3,

  // ── Tahap 11: Grenade ────────────────────────────────────
  grenadeForwardSpeed: 10,   // BUG FIX: reduced from 15
  grenadeUpSpeed: 5,         // BUG FIX: reduced from 8
  grenadeGravity: -9.8,
  grenadeBounceFactor: 0.3,
  grenadeFriction: 0.7,
  grenadeMaxBounces: 3,
  grenadeTimer: 3.0,
  smokeGrenadeDuration: 12,
  smokeParticleCount: 12,    // v7: Reduced from 20 to 12 — large sprites still cover well
  smokeRadius: 7,            // v5: Larger radius for realistic smoke coverage
  smokePickupCooldown: 2.0,  // Seconds before a dropped weapon can be picked up again

  // ── Tahap 12: Fist ──────────────────────────────────────
  fistRange: 2.0,            // BUG FIX: increased from 1.5 for easier aiming
  fistDamage: 5,
  fistRate: 2.5,             // 2.5 punches per second
  fistPunchDuration: 0.12,   // How long the punch animation lasts (forward)
  fistReturnDuration: 0.18,  // How long the return animation lasts
  fistPunchDistance: 0.5,     // BUG FIX: increased from 0.3 for visible punch
  fistHitAngle: 0.4,         // Cone half-angle for fist hit detection (radians)

  // ── Tahap 13: Knife ──────────────────────────────────────
  knifeRange: 2.5,
  knifeDamage: 25,
  knifeRate: 1.5,            // 1.5 slashes per second
  knifeSwingDuration: 0.2,   // How long the swing animation lasts
  knifeReturnDuration: 0.25, // How long the return animation lasts
  knifeSwingAngle: Math.PI / 4,  // 45° swing

  // ── Tahap 14: Pistol ──────────────────────────────────────
  pistolRecoil: {
    glock: 0.15,
    revolver: 0.35,
    deagle: 0.5,
  },
  pistolRecoilRecovery: 6.0,
  pistolSwitchCycle: ['glock', 'revolver', 'deagle'],

  // ── Tahap 15: Shotgun ──────────────────────────────────────
  shotgunRecoil: {
    pump_shotgun: 0.6,
    auto_shotgun: 0.4,
  },
  shotgunRecoilRecovery: 5.0,
  shotgunSwitchCycle: ['pump_shotgun', 'auto_shotgun'],
  shotgunPumpDelay: 0.15,      // Visual pump animation delay

  // ── Tahap 16: Sniper ──────────────────────────────────────
  sniperRecoil: {
    bolt_sniper: 0.8,
    semi_sniper: 0.5,
  },
  sniperRecoilRecovery: 4.0,
  sniperSwitchCycle: ['bolt_sniper', 'semi_sniper'],
  rifleSwitchCycle: ['assault_rifle', 'smg'],
  sniperBoltDelay: 0.3,         // Visual bolt animation delay
  sniperScopeFOV: 20,           // FOV when scoped in
  sniperScopeZoomSpeed: 8.0,    // How fast FOV transitions
};

// ── Variabel Global ─────────────────────────────────────────
let scene, camera, renderer;
let clock;

// ── Input State ─────────────────────────────────────────────
const keys = {
  w: false, a: false, s: false, d: false,
  space: false, shift: false, c: false, control: false,
  g: false, h: false,
};

const velocity = new THREE.Vector3(0, 0, 0);
let velocityY = 0;
let isGrounded = true;
let effectiveGroundLevel = CONFIG.groundLevel; // Dynamic ground level (accounts for box surfaces)

// ── Sprint & Stamina ───────────────────────────────────────
let stamina = CONFIG.staminaMax;
let isSprinting = false;
let isExhausted = false;
let exhaustionTimer = 0;
const EXHAUSTION_COOLDOWN = 1.5;

// ── Crouch & Crawl ─────────────────────────────────────────
let stance = 'standing';
let targetCameraY = CONFIG.standHeight;
let crouchJustPressed = false;

// ── Mouse Look ─────────────────────────────────────────────
let yaw = 0;
let pitch = 0;
const PITCH_LIMIT = Math.PI / 2 - 0.01;
let mouseBufferX = [];
let mouseBufferY = [];
let mouseSensitivity = CONFIG.mouseSensitivity;

// Pointer Lock & Fullscreen state
let isPointerLocked = false;
let isFullscreen = false;

// ── Collision Detection (Tahap 07) ─────────────────────────
let collidableBoxes = [];

// ── Tahap 09: Weapon & Item Data System ────────────────────
let itemData = null;
let itemDataLoaded = false;

// Weapon inventory state
const weaponInventory = {
  currentSlot: 0,             // 0=fist, 1=melee, 2=pistol, 3=rifle, 4=shotgun, 5=sniper
  slots: ['fist', 'knife', 'glock', 'assault_rifle', 'pump_shotgun', 'bolt_sniper'],
  ammo: {},
  reserveAmmo: {},
  grenadeFrag: 2,
  grenadeSmoke: 1,
};

// ── Tahap 10: Shooting State ───────────────────────────────
let isShooting = false;
let lastShotTime = 0;
let isReloading = false;
let reloadStartTime = 0;
let muzzleFlash = null;
let muzzleFlashTimer = 0;
let hitMarkerMesh = null;
let hitMarkerTimer = 0;
let recoilOffset = 0;

// ── Tahap 17: Weapon Switching & Inventory ─────────────────
let previousSlot = 0;              // For Q quick-switch
let isSwitchingWeapon = false;     // Switch animation in progress
let switchAnimTimer = 0;           // Timer for switch animation
let switchTargetSlot = -1;         // Target slot for switch
const SWITCH_ANIM_DURATION = 0.15; // Duration of weapon switch animation
let droppedWeapons = [];           // Array of dropped weapon pickups on the ground
let recoilRecoverySpeed = 8.0;
let shootCooldown = 0;

// ── Tahap 11: Grenade State ───────────────────────────────
const activeGrenades = [];  // Array of active grenade objects
const activeSmokeClouds = []; // Array of active smoke cloud objects
let grenadeCooldown = 0;

// Grenade aim system
let isGrenadeAiming = false;
let grenadeAimType = null;   // 'frag' or 'smoke'
let grenadeAimStartTime = 0;
let trajectoryDots = [];     // Visual trajectory dots

// ── Tahap 12: Fist State ──────────────────────────────────
let isFistPunching = false;
let fistPunchTimer = 0;
let fistPunchPhase = 'idle'; // 'idle', 'punch', 'return'
let fistGroup = null;         // Three.js Group for fist visual (right hand)
let leftFistGroup = null;     // Three.js Group for left fist visual
let fistSide = 'right';      // Alternate left/right punches
let fistRestPosRight = null;  // Store rest positions
let fistRestPosLeft = null;

// ── Tahap 13: Knife State ─────────────────────────────────
let isKnifeSlashing = false;
let knifeSlashTimer = 0;
let knifeSlashPhase = 'idle'; // 'idle', 'swing', 'return'
let knifeGroup = null;        // Three.js Group for knife visual

// ── Tahap 14: Pistol State ────────────────────────────────
let pistolGroup = null;        // Three.js Group for current pistol visual
let pistolRecoilOffset = 0;    // Visual recoil kick
let pistolCurrentVariant = 'glock'; // Current pistol variant in slot 2
let pistolIdleTime = 0;

// ── Tahap 15: Shotgun State ────────────────────────────────
let shotgunGroup = null;        // Three.js Group for current shotgun visual
let shotgunRecoilOffset = 0;    // Visual recoil kick
let shotgunCurrentVariant = 'pump_shotgun'; // Current shotgun variant in slot 4
let shotgunIdleTime = 0;
let shotgunPumpAnim = false;    // Pump animation state
let shotgunPumpTimer = 0;

// ── Tahap 16: Sniper State ────────────────────────────────
let sniperGroup = null;         // Three.js Group for current sniper visual
let rifleGroup = null;          // Three.js Group for current rifle visual
let sniperRecoilOffset = 0;    // Visual recoil kick
let sniperCurrentVariant = 'bolt_sniper'; // Current sniper variant in slot 5
let sniperIdleTime = 0;
let sniperBoltAnim = false;    // Bolt animation state
let sniperBoltTimer = 0;
let isSniperScoping = false;   // Whether player is holding right-click to scope
let rifleCurrentVariant = 'assault_rifle'; // Current rifle variant in slot 3
let rifleIdleTime = 0;
let rifleRecoilOffset = 0;
let currentFOV = 75;           // Current camera FOV (lerps between 75 and 20)
let targetFOV = 75;            // Target FOV for smooth transition

// ── Tahap 18: Armor System ──────────────────────────────────
const armorInventory = {
  helmet: null,   // Currently equipped helmet item
  vest: null,     // Currently equipped vest item
  pants: null,    // Currently equipped pants item
  shoes: null,    // Currently equipped shoes item
};
let isInventoryOpen = false;    // Whether the armor inventory screen is open
let lastDropTime = 0;           // Cooldown for weapon drop to prevent rapid key repeat
let armorSpeedBonus = 0;        // Speed bonus from shoes (can be negative for penalty)

// ── Tahap 19: HP & Damage System ────────────────────────────
let playerHP = 100;            // Current player HP (max 100)
let playerMaxHP = 100;         // Maximum player HP
let isPlayerDead = false;      // Whether the player is dead
let deathTime = 0;             // Time when player died
const DEATH_RESPAWN_TIME = 3.0; // Seconds before respawn
let damageFlashTimer = 0;      // Timer for red screen flash on damage
let lastDamageSource = '';     // What caused the last damage
const SPAWN_POINT = { x: 0, y: 1.7, z: 0 }; // Default spawn point

// ── Weapon ownership tracking (per-variant) ────────────────
// Tracks which specific weapon variants the player owns
const ownedVariants = {
  2: ['glock', 'revolver', 'deagle'],  // Pistol slot
  3: ['assault_rifle', 'smg'],         // Rifle slot
  4: ['pump_shotgun', 'auto_shotgun'],  // Shotgun slot
  5: ['bolt_sniper', 'semi_sniper'],   // Sniper slot
};

// ── DOM Elements ────────────────────────────────────────────
const debugInfo = document.getElementById('debug-info');
const loadingScreen = document.getElementById('loading-screen');
const lockPrompt = document.getElementById('lock-prompt');
const jumpIndicator = document.getElementById('jump-indicator');
const staminaBar = document.getElementById('stamina-bar');
const staminaFill = document.getElementById('stamina-fill');
const staminaText = document.getElementById('stamina-text');
const crouchIndicator = document.getElementById('crouch-indicator');
const crosshair = document.getElementById('crosshair');
const sensitivityIndicator = document.getElementById('sensitivity-indicator');
const weaponHud = document.getElementById('weapon-hud');
const weaponNameEl = document.getElementById('weapon-name');
const weaponAmmoEl = document.getElementById('weapon-ammo');
const weaponSlotEl = document.getElementById('weapon-slot');
const grenadeHud = document.getElementById('grenade-hud');
const reloadIndicator = document.getElementById('reload-indicator');
const hitMarkerEl = document.getElementById('hit-marker');
const smokeOverlayEl = document.getElementById('smoke-overlay');
const scopeOverlayEl = document.getElementById('scope-overlay');

// ── Input Handling ──────────────────────────────────────────
function setupInputHandlers() {
  window.addEventListener('keydown', (e) => {
    if (isPointerLocked) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }

    const key = e.key.toLowerCase();

    if (key === ' ' || key === 'spacebar') {
      keys.space = true;
    } else if (key === 'shift') {
      keys.shift = true;
    } else if (key === 'control') {
      keys.control = true;
    } else if (key === 'c') {
      if (!keys.c) crouchJustPressed = true;
      keys.c = true;
    } else if (key in keys) {
      keys[key] = true;
    }

    if (isPointerLocked) {
      if (key === '=' || key === '+' || key === 'numpadadd') {
        mouseSensitivity = Math.min(CONFIG.mouseSensitivityMax, mouseSensitivity + CONFIG.mouseSensitivityStep);
        showSensitivityIndicator();
      } else if (key === '-' || key === 'numpadsubtract') {
        mouseSensitivity = Math.max(CONFIG.mouseSensitivityMin, mouseSensitivity - CONFIG.mouseSensitivityStep);
        showSensitivityIndicator();
      }
      // Tahap 09: Weapon slot switching (number keys 1-6)
      if (key === '1') switchWeaponSlot(0);  // Fist
      else if (key === '2') switchWeaponSlot(1);  // Melee
      else if (key === '3') switchWeaponSlot(2);  // Pistol
      else if (key === '4') switchWeaponSlot(3);  // Rifle
      else if (key === '5') switchWeaponSlot(4);  // Shotgun
      else if (key === '6') switchWeaponSlot(5);  // Sniper
      // Tahap 10: Manual reload with R key
      else if (key === 'r') startReload();
      // Tahap 14: Q key to cycle pistol variants when on pistol slot
      else if (key === 'q') {
        // Q = quick-switch to previous weapon OR cycle variant if holding same type
        if (weaponInventory.currentSlot === 2) {
          cyclePistolVariant();
        } else if (weaponInventory.currentSlot === 3) {
          cycleRifleVariant();
        } else if (weaponInventory.currentSlot === 4) {
          cycleShotgunVariant();
        } else if (weaponInventory.currentSlot === 5) {
          cycleSniperVariant();
        } else {
          quickSwitchWeapon();
        }
      }
      // Tahap 17: B key to drop current weapon (with cooldown to prevent rapid drops)
      else if (key === 'b') {
        if (!lastDropTime || (performance.now() / 1000 - lastDropTime) > 0.5) {
          lastDropTime = performance.now() / 1000;
          dropCurrentWeapon();
        }
      }
    }

    // Tahap 18: I key to toggle armor inventory — works BOTH locked and unlocked
    // This is outside the isPointerLocked check so the user can close the inventory
    if (key === 'i') {
      e.preventDefault(); // Prevent browser default behavior (e.g., Firefox page info)
      toggleArmorInventory();
    }

    // Tahap 19: Damage test keys (F5/F6/F7) — for testing damage system
    if (key === 'f5') {
      // Test: Take 20 damage
      applyDamage(20, 'test_normal', false);
    } else if (key === 'f6') {
      // Test: Take 20 headshot damage (x2 = 40)
      applyDamage(20, 'test_headshot', true);
    } else if (key === 'f7') {
      // Test: Kill self (100 damage)
      applyDamage(100, 'test_kill', false);
    }
  }, true); // capture phase

  window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key === ' ' || key === 'spacebar') keys.space = false;
    else if (key === 'shift') keys.shift = false;
    else if (key === 'control') keys.control = false;
    else if (key === 'c') keys.c = false;
    else if (key in keys) keys[key] = false;

    // Tahap 11: Release grenade key = throw
    if (key === 'g' && isGrenadeAiming && grenadeAimType === 'frag') {
      throwGrenade('frag');
      isGrenadeAiming = false;
      grenadeAimType = null;
      clearTrajectoryDots();
    } else if (key === 'h' && isGrenadeAiming && grenadeAimType === 'smoke') {
      throwGrenade('smoke');
      isGrenadeAiming = false;
      grenadeAimType = null;
      clearTrajectoryDots();
    }
  });

  window.addEventListener('blur', () => {
    Object.keys(keys).forEach(k => keys[k] = false);
    if (isGrenadeAiming) {
      isGrenadeAiming = false;
      grenadeAimType = null;
      clearTrajectoryDots();
    }
  });

  window.addEventListener('beforeunload', (e) => {
    if (isPointerLocked) {
      e.preventDefault();
      e.returnValue = 'Game masih berjalan! Yakin ingin keluar?';
      return e.returnValue;
    }
  });

  const canvas = renderer.domElement;

  async function requestLock() {
    if (!isPointerLocked) {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
          isFullscreen = true;
        }
      } catch (err) {}

      canvas.requestPointerLock();

      try {
        if (navigator.keyboard && navigator.keyboard.lock) {
          await navigator.keyboard.lock();
        }
      } catch (err) {}
    }
  }

  canvas.addEventListener('click', requestLock);
  if (lockPrompt) {
    lockPrompt.addEventListener('click', requestLock);
  }

  document.addEventListener('pointerlockchange', () => {
    isPointerLocked = document.pointerLockElement === canvas;
    if (isPointerLocked) {
      if (lockPrompt) lockPrompt.style.display = 'none';
    } else {
      if (lockPrompt) lockPrompt.style.display = 'flex';
      keys.shift = false;
      keys.c = false;
      keys.control = false;
      keys.g = false;
      keys.h = false;
      isShooting = false;
      if (stance !== 'standing') {
        stance = 'standing';
        targetCameraY = CONFIG.standHeight;
      }
      if (isGrenadeAiming) {
        isGrenadeAiming = false;
        grenadeAimType = null;
        clearTrajectoryDots();
      }
      // Tahap 16: Unscope when pointer lock is lost
      isSniperScoping = false;
      targetFOV = CONFIG.cameraFOV;
      // Tahap 18: Don't show lock prompt if inventory is open
      if (!isInventoryOpen && lockPrompt) lockPrompt.style.display = 'flex';
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    }
  });

  document.addEventListener('fullscreenchange', () => {
    isFullscreen = !!document.fullscreenElement;
  });

  document.addEventListener('mousemove', (e) => {
    if (!isPointerLocked) return;

    const rawX = e.movementX || 0;
    const rawY = e.movementY || 0;

    mouseBufferX.push(rawX);
    mouseBufferY.push(rawY);
    while (mouseBufferX.length > CONFIG.mouseSmoothBuffer) {
      mouseBufferX.shift();
      mouseBufferY.shift();
    }

    const smoothX = mouseBufferX.reduce((a, b) => a + b, 0) / mouseBufferX.length;
    const smoothY = mouseBufferY.reduce((a, b) => a + b, 0) / mouseBufferY.length;

    const sm = CONFIG.mouseSmoothing;
    const finalX = rawX * (1 - sm) + smoothX * sm;
    const finalY = rawY * (1 - sm) + smoothY * sm;

    yaw -= finalX * mouseSensitivity;
    pitch -= finalY * mouseSensitivity;
    pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch));

    camera.rotation.order = 'YXZ';
    camera.rotation.set(pitch, yaw, 0);
  });

  // ── Tahap 10: Mouse Shoot (left click = shoot) ────────────
  canvas.addEventListener('mousedown', (e) => {
    if (!isPointerLocked) return;
    if (e.button === 0) { // left click
      isShooting = true;
      // Semi-auto weapons fire on click only
      handleShootClick();
    }
    // Tahap 16: Right-click hold = scope in (sniper only)
    if (e.button === 2) {
      const weapon = getCurrentWeapon();
      if (weapon && weapon.data.type === 'sniper') {
        isSniperScoping = true;
        targetFOV = CONFIG.sniperScopeFOV;
      }
    }
  });

  canvas.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
      isShooting = false;
    }
    // Tahap 16: Release right-click = unscope
    if (e.button === 2) {
      isSniperScoping = false;
      targetFOV = CONFIG.cameraFOV;
    }
  });

  // Tahap 16: Right-click = scope in (hold)
  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault(); // Prevent browser context menu
  });
}

// ── Sensitivity Indicator ──────────────────────────────────
let sensitivityTimeout = null;
function showSensitivityIndicator() {
  if (sensitivityIndicator) {
    const pct = ((mouseSensitivity - CONFIG.mouseSensitivityMin) /
                 (CONFIG.mouseSensitivityMax - CONFIG.mouseSensitivityMin) * 100);
    sensitivityIndicator.textContent = 'SENS: ' + mouseSensitivity.toFixed(4) + ' (' + Math.round(pct) + '%)';
    sensitivityIndicator.style.opacity = '1';
    sensitivityIndicator.style.display = 'block';
    if (sensitivityTimeout) clearTimeout(sensitivityTimeout);
    sensitivityTimeout = setTimeout(() => {
      if (sensitivityIndicator) {
        sensitivityIndicator.style.opacity = '0';
        setTimeout(() => { if (sensitivityIndicator) sensitivityIndicator.style.display = 'none'; }, 400);
      }
    }, 2000);
  }
}

// ── Dynamic Crosshair ──────────────────────────────────────
function updateCrosshair() {
  if (!crosshair) return;

  const isMoving = keys.w || keys.a || keys.s || keys.d;
  const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);

  let spread = 0;
  if (isSprinting) spread = 8;
  else if (speed > 2) spread = 4;
  else if (isMoving) spread = 2;

  // Tahap 10: Increase spread when shooting
  if (shootCooldown > 0) spread += 3;

  if (stance === 'crouching') spread = Math.max(0, spread - 2);
  if (stance === 'crawling') spread = 0;

  // Tahap 10: Recoil visual offset on crosshair
  if (recoilOffset > 0) {
    spread += recoilOffset * 4;
  }

  // Tahap 11: Increase spread when aiming grenade
  if (isGrenadeAiming) spread += 2;

  // Tahap 16: Hide crosshair when scoped in
  if (isSniperScoping && Math.abs(currentFOV - CONFIG.sniperScopeFOV) < 15) {
    spread = -999; // Special value to hide crosshair
  }

  crosshair.style.setProperty('--spread', spread + 'px');

  // Tahap 10: Crosshair color changes when reloading
  if (isReloading) {
    crosshair.style.setProperty('--ch-color', 'rgba(255, 100, 100, 0.9)');
  } else if (isGrenadeAiming) {
    crosshair.style.setProperty('--ch-color', 'rgba(100, 255, 100, 0.9)');
  } else if (stance === 'crawling') {
    crosshair.style.setProperty('--ch-color', 'rgba(0, 255, 100, 0.9)');
  } else if (stance === 'crouching') {
    crosshair.style.setProperty('--ch-color', 'rgba(100, 255, 100, 0.9)');
  } else if (isSprinting) {
    crosshair.style.setProperty('--ch-color', 'rgba(255, 200, 50, 0.9)');
  } else {
    crosshair.style.setProperty('--ch-color', 'rgba(255, 255, 255, 0.8)');
  }
}

// ── Inisialisasi ────────────────────────────────────────────
function init() {
  clock = new THREE.Clock();

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(CONFIG.backgroundColor);
  scene.fog = new THREE.Fog(CONFIG.backgroundColor, 30, 60);

  // Camera — start in center of arena
  camera = new THREE.PerspectiveCamera(
    CONFIG.cameraFOV, window.innerWidth / window.innerHeight,
    CONFIG.cameraNear, CONFIG.cameraFar
  );
  camera.position.set(0, CONFIG.cameraStartY, 0);
  camera.rotation.order = 'YXZ';
  camera.lookAt(0, CONFIG.cameraStartY, -1);
  yaw = 0;
  pitch = 0;

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: CONFIG.antialias });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = false;
  document.body.appendChild(renderer.domElement);

  // Ground Plane
  const groundGeometry = new THREE.PlaneGeometry(CONFIG.groundWidth, CONFIG.groundHeight);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: CONFIG.groundColor, side: THREE.DoubleSide, roughness: 0.9, metalness: 0.1,
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.name = 'ground';
  scene.add(ground);

  // Grid Helper (disabled for arena)
  if (CONFIG.showGrid) {
    const grid = new THREE.GridHelper(CONFIG.gridSize, CONFIG.gridDivisions, CONFIG.gridColor1, CONFIG.gridColor2);
    grid.position.y = 0.01;
    grid.name = 'grid';
    scene.add(grid);
  }

  // Tahap 08: Build Arena Map
  buildArenaMap();

  // Lights — ambient + directional sun
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
  dirLight.position.set(30, 50, 20);
  scene.add(dirLight);

  // Extra point light in center of arena
  const pointLight = new THREE.PointLight(0xffffcc, 0.4, 30);
  pointLight.position.set(0, 5, 0);
  scene.add(pointLight);

  // Tahap 10: Create muzzle flash (hidden initially)
  createMuzzleFlash();

  // Tahap 10: Create hit marker (hidden initially)
  createHitMarker();

  // Tahap 12: Create fist visual (attached to camera)
  createFistVisual();

  // Tahap 13: Create knife visual (attached to camera, hidden initially)
  createKnifeVisual();

  // Tahap 14: Create pistol visual (attached to camera, hidden initially)
  createPistolVisual();

  // Tahap 15: Create shotgun visual (attached to camera, hidden initially)
  createShotgunVisual();

  // Tahap 16+: Create rifle visual (attached to camera, hidden initially)
  createRifleVisual();

  // Tahap 16: Create sniper visual (attached to camera, hidden initially)
  createSniperVisual();

  // Setup Input
  setupInputHandlers();

  // Resize Handler
  window.addEventListener('resize', onWindowResize);

  // Hide Loading Screen
  if (loadingScreen) {
    loadingScreen.classList.add('hidden');
    setTimeout(() => { if (loadingScreen && loadingScreen.parentNode) loadingScreen.parentNode.removeChild(loadingScreen); }, 600);
  }

  if (lockPrompt) lockPrompt.style.display = 'flex';

  // Tahap 09: Load item data
  loadItemData();

  // Start Render Loop
  animate();
}

// ── Tahap 09: Load Item Data ───────────────────────────────
// Embedded fallback data for file:// protocol (fetch doesn't work on file://)
const ITEM_DATA_FALLBACK = {
  weapons: {
    melee: {
      fist: { name: "Tangan Kosong", type: "fist", damage: 5, range: 1.5, rate: 2, description: "Pukulan tangan kosong, damage rendah" },
      knife: { name: "Pisau", type: "melee", damage: 25, range: 2, rate: 1.5, description: "Pisau tactical" }
    },
    pistol: {
      revolver: { name: "Revolver", type: "pistol", damage: 40, range: 50, rate: 1.0, magazine: 6, spread: 0.02, description: "Revolver klasik, damage tinggi, lambat" },
      glock: { name: "Glock-17", type: "pistol", damage: 20, range: 40, rate: 3.0, magazine: 17, spread: 0.03, description: "Pistol standar, cepat" },
      deagle: { name: "Desert Eagle", type: "pistol", damage: 55, range: 60, rate: 0.8, magazine: 7, spread: 0.04, description: "Pistol berat, damage sangat tinggi" }
    },
    shotgun: {
      pump_shotgun: { name: "Pump Shotgun", type: "shotgun", damage: 15, pellets: 8, range: 20, rate: 0.7, magazine: 6, spread: 0.08, description: "Shotgun pump-action, 8 pellets" },
      auto_shotgun: { name: "Auto Shotgun", type: "shotgun", damage: 12, pellets: 6, range: 15, rate: 2.0, magazine: 10, spread: 0.10, description: "Shotgun semi-auto, cepat tapi lebih spread" }
    },
    sniper: {
      bolt_sniper: { name: "Bolt Sniper", type: "sniper", damage: 90, range: 200, rate: 0.5, magazine: 5, spread: 0.005, description: "Sniper bolt-action, damage extrem, peluru tepat" },
      semi_sniper: { name: "Semi-Auto Sniper", type: "sniper", damage: 70, range: 150, rate: 1.0, magazine: 10, spread: 0.01, description: "Sniper semi-auto, lebih cepat" }
    },
    rifle: {
      assault_rifle: { name: "Assault Rifle", type: "rifle", damage: 25, range: 80, rate: 5.0, magazine: 30, spread: 0.04, description: "Rifle standar, versatile" },
      smg: { name: "SMG", type: "rifle", damage: 18, range: 50, rate: 8.0, magazine: 35, spread: 0.06, description: "Sub machine gun, cepat tapi damage rendah" }
    },
    grenade: {
      frag_grenade: { name: "Frag Grenade", type: "grenade", damage: 80, radius: 8, throwRange: 30, description: "Granat fragmentasi" },
      smoke_grenade: { name: "Smoke Grenade", type: "grenade", damage: 0, radius: 5, throwRange: 25, duration: 12, description: "Granat asap, coverage area" }
    }
  },
  armor: {
    helmet: [
      { id: "helmet_light", name: "Helmet Light", defense: 10, slot: "helmet", description: "Helmet ringan, +10 defense" },
      { id: "helmet_medium", name: "Helmet Medium", defense: 25, slot: "helmet", description: "Helmet medium, +25 defense" },
      { id: "helmet_heavy", name: "Helmet Heavy", defense: 50, slot: "helmet", description: "Helmet berat, +50 defense" }
    ],
    vest: [
      { id: "vest_light", name: "Vest Light", defense: 15, slot: "vest", description: "Vest ringan, +15 defense" },
      { id: "vest_medium", name: "Vest Medium", defense: 30, slot: "vest", description: "Vest medium, +30 defense" },
      { id: "vest_heavy", name: "Vest Heavy", defense: 60, slot: "vest", description: "Vest berat, +60 defense" }
    ],
    pants: [
      { id: "pants_light", name: "Pants Light", defense: 8, slot: "pants", description: "Celana ringan, +8 defense" },
      { id: "pants_medium", name: "Pants Medium", defense: 20, slot: "pants", description: "Celana medium, +20 defense" },
      { id: "pants_heavy", name: "Pants Heavy", defense: 40, slot: "pants", description: "Celana berat, +40 defense" }
    ],
    shoes: [
      { id: "shoes_light", name: "Shoes Light", defense: 5, slot: "shoes", speedBonus: 0.5, description: "Sepatu ringan, +5 defense, +0.5 speed" },
      { id: "shoes_medium", name: "Shoes Medium", defense: 12, slot: "shoes", description: "Sepatu medium, +12 defense" },
      { id: "shoes_heavy", name: "Shoes Heavy", defense: 25, slot: "shoes", speedPenalty: -1, description: "Sepatu berat, +25 defense, -1 speed" }
    ]
  },
  loot: {
    lootRefreshInterval: 90,
    corpseDisappearTime: 30,
    lootTableWeights: { pistol: 40, rifle: 25, shotgun: 15, sniper: 5, grenade: 10, armor: 20, ammo: 30 }
  }
};

async function loadItemData() {
  try {
    const resp = await fetch('item.json');
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    itemData = await resp.json();
    itemDataLoaded = true;

    // Validate required structure
    const required = ['weapons', 'armor', 'loot'];
    const missing = required.filter(k => !(k in itemData));
    if (missing.length > 0) {
      console.warn('item.json missing keys:', missing);
    }

    // Initialize ammo for all weapons
    initializeWeaponAmmo();

    // Update HUD
    updateWeaponHud();
    updateGrenadeHud();
    updateArmorHud();  // Tahap 18: Initialize armor HUD
    updateHPBar();     // Tahap 19: Initialize HP bar

    console.log('item.json loaded successfully:', countWeapons() + ' weapons,',
                countArmor() + ' armor items');
  } catch (err) {
    console.warn('Failed to fetch item.json:', err.message, '— using embedded fallback data');
    itemData = ITEM_DATA_FALLBACK;
    itemDataLoaded = true;
    initializeWeaponAmmo();
    updateWeaponHud();
    updateGrenadeHud();
    updateArmorHud();  // Tahap 18: Initialize armor HUD
    updateHPBar();     // Tahap 19: Initialize HP bar
    console.log('item.json fallback loaded:', countWeapons() + ' weapons,',
                countArmor() + ' armor items');
  }
}

// ── Tahap 09: Initialize Weapon Ammo ───────────────────────
function initializeWeaponAmmo() {
  if (!itemData || !itemData.weapons) return;
  const w = itemData.weapons;

  // Iterate all weapon categories
  for (const category of Object.values(w)) {
    for (const [id, weapon] of Object.entries(category)) {
      if (weapon.magazine) {
        weaponInventory.ammo[id] = weapon.magazine;        // full magazine
        weaponInventory.reserveAmmo[id] = weapon.magazine * 3;  // 3x magazine reserve
      }
    }
  }

  // Assign default weapons to ALL slots
  weaponInventory.slots[0] = 'fist';
  weaponInventory.slots[1] = 'knife';
  weaponInventory.slots[2] = 'glock';
  weaponInventory.slots[3] = 'assault_rifle';
  weaponInventory.slots[4] = 'pump_shotgun';
  weaponInventory.slots[5] = 'bolt_sniper';
  rifleCurrentVariant = 'assault_rifle';
}

// ── Tahap 09: Weapon Helper Functions ──────────────────────
function countWeapons() {
  if (!itemData || !itemData.weapons) return 0;
  let count = 0;
  for (const cat of Object.values(itemData.weapons)) {
    count += Object.keys(cat).length;
  }
  return count;
}

function countArmor() {
  if (!itemData || !itemData.armor) return 0;
  let count = 0;
  for (const cat of Object.values(itemData.armor)) {
    count += cat.length;
  }
  return count;
}

function getCurrentWeapon() {
  const slotId = weaponInventory.slots[weaponInventory.currentSlot];
  if (!slotId || !itemData || !itemData.weapons) return null;

  for (const category of Object.values(itemData.weapons)) {
    if (slotId in category) return { id: slotId, data: category[slotId] };
  }
  // Fist
  if (slotId === 'fist' && itemData.weapons.melee && itemData.weapons.melee.fist) {
    return { id: 'fist', data: itemData.weapons.melee.fist };
  }
  return null;
}

function getWeaponById(id) {
  if (!itemData || !itemData.weapons) return null;
  for (const category of Object.values(itemData.weapons)) {
    if (id in category) return category[id];
  }
  return null;
}

function isMeleeWeapon(weaponData) {
  return weaponData && (weaponData.type === 'fist' || weaponData.type === 'melee');
}

// switchWeaponSlot is now defined in Tahap 17 section with animation support

// ── Tahap 09: Update Weapon HUD ────────────────────────────
// v7: Update weapon visibility based on current slot
function updateWeaponVisibility() {
  const slot = weaponInventory.currentSlot;
  if (fistGroup) fistGroup.visible = (slot === 0);
  if (leftFistGroup) leftFistGroup.visible = (slot === 0);
  if (knifeGroup) knifeGroup.visible = (slot === 1);
  if (pistolGroup) pistolGroup.visible = (slot === 2);
  if (rifleGroup) rifleGroup.visible = (slot === 3);
  if (shotgunGroup) shotgunGroup.visible = (slot === 4);
  if (sniperGroup) sniperGroup.visible = (slot === 5);
}

function updateWeaponHud() {
  if (!weaponNameEl || !weaponAmmoEl) return;

  const slotId = weaponInventory.slots[weaponInventory.currentSlot];
  if (!slotId) {
    weaponNameEl.textContent = '—';
    weaponAmmoEl.textContent = '—';
    return;
  }

  const weapon = getWeaponById(slotId);
  if (!weapon) {
    weaponNameEl.textContent = slotId;
    weaponAmmoEl.textContent = '—';
    return;
  }

  // Tahap 10: Show reload status
  if (isReloading) {
    weaponNameEl.textContent = weapon.name + ' [RELOADING]';
    weaponAmmoEl.textContent = '...';
    if (reloadIndicator) reloadIndicator.classList.add('active');
    return;
  } else {
    if (reloadIndicator) reloadIndicator.classList.remove('active');
  }

  weaponNameEl.textContent = weapon.name || slotId;

  if (weapon.magazine) {
    const current = weaponInventory.ammo[slotId] || 0;
    const reserve = weaponInventory.reserveAmmo[slotId] || 0;
    weaponAmmoEl.textContent = current + ' / ' + reserve;
  } else if (weapon.type === 'fist' || weapon.type === 'melee') {
    weaponAmmoEl.textContent = '∞';
  } else {
    weaponAmmoEl.textContent = '—';
  }

  // Tahap 10: Update slot indicator
  if (weaponSlotEl) {
    const slotInfo = '[' + (weaponInventory.currentSlot + 1) + '/6]';
    // Tahap 14: Show weapon variant in slot indicator
    // Note: getWeaponById returns the data directly, so use .type not .data.type
    const wType = weapon.type;
    if (weaponInventory.currentSlot === 2 && wType === 'pistol') {
      weaponSlotEl.textContent = slotInfo + ' ' + weapon.name;
    } else if (weaponInventory.currentSlot === 3 && wType === 'rifle') {
      weaponSlotEl.textContent = slotInfo + ' ' + weapon.name;
    } else if (weaponInventory.currentSlot === 4 && wType === 'shotgun') {
      weaponSlotEl.textContent = slotInfo + ' ' + weapon.name;
    } else if (weaponInventory.currentSlot === 5 && wType === 'sniper') {
      weaponSlotEl.textContent = slotInfo + ' ' + weapon.name;
    } else {
      weaponSlotEl.textContent = slotInfo;
    }
  }
}

// ── Tahap 09: Update Grenade HUD ───────────────────────────
function updateGrenadeHud() {
  if (!grenadeHud) return;
  grenadeHud.textContent = 'G: ' + weaponInventory.grenadeFrag + ' | H: ' + weaponInventory.grenadeSmoke;
}

// ── Tahap 10: Shooting System ──────────────────────────────

function createMuzzleFlash() {
  const geo = new THREE.SphereGeometry(0.08, 6, 6);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffdd44, transparent: true, opacity: 0.9 });
  muzzleFlash = new THREE.Mesh(geo, mat);
  muzzleFlash.visible = false;
  scene.add(muzzleFlash);
}

function createHitMarker() {
  // Small X-shaped hit marker using a flat mesh
  const geo = new THREE.RingGeometry(0.05, 0.12, 4);
  const mat = new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
  hitMarkerMesh = new THREE.Mesh(geo, mat);
  hitMarkerMesh.visible = false;
  scene.add(hitMarkerMesh);
}

function showMuzzleFlash() {
  if (!muzzleFlash) return;

  // Position muzzle flash in front of camera
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);

  muzzleFlash.position.copy(camera.position).add(dir.multiplyScalar(0.5));
  muzzleFlash.position.y -= 0.1; // slightly below camera (gun barrel)
  muzzleFlash.visible = true;
  muzzleFlashTimer = CONFIG.muzzleFlashDuration;

  // Random scale variation for visual effect
  const scale = 0.8 + Math.random() * 0.4;
  muzzleFlash.scale.set(scale, scale, scale);
}

function showHitMarker(point, normal) {
  if (!hitMarkerMesh) return;

  hitMarkerMesh.position.copy(point);
  if (normal) {
    hitMarkerMesh.lookAt(point.clone().add(normal));
  }
  hitMarkerMesh.visible = true;
  hitMarkerTimer = CONFIG.hitMarkerDuration;
}

function shoot() {
  const weapon = getCurrentWeapon();
  if (!weapon) return;

  const wData = weapon.data;
  const wId = weapon.id;

  // Can't shoot while reloading
  if (isReloading) return;

  // Check fire rate
  const now = performance.now() / 1000;
  const fireInterval = 1.0 / (wData.rate || 1);
  if (now - lastShotTime < fireInterval) return;

  // Check ammo for guns that use magazines
  if (wData.magazine) {
    const currentAmmo = weaponInventory.ammo[wId] || 0;
    if (currentAmmo <= 0) {
      // Auto-reload when empty
      startReload();
      return;
    }
    weaponInventory.ammo[wId] = currentAmmo - 1;
    // Auto-reload when last bullet is fired
    if (weaponInventory.ammo[wId] <= 0) {
      setTimeout(() => startReload(), 100);
    }
  }

  lastShotTime = now;
  shootCooldown = 0.15; // visual cooldown for crosshair spread

  // Apply recoil (less for melee)
  const recoilAmount = isMeleeWeapon(wData) ? 0.05 : 0.3;
  recoilOffset = Math.min(recoilOffset + recoilAmount, 1.0);

  // Tahap 14: Pistol-specific visual recoil
  if (wData.type === 'pistol') {
    const pistolRecoil = CONFIG.pistolRecoil[wId] || 0.2;
    pistolRecoilOffset = Math.min(pistolRecoilOffset + pistolRecoil, 1.0);
  }

  // Tahap 15: Shotgun-specific visual recoil + pump animation
  if (wData.type === 'shotgun') {
    const shotgunRecoil = CONFIG.shotgunRecoil[wId] || 0.4;
    shotgunRecoilOffset = Math.min(shotgunRecoilOffset + shotgunRecoil, 1.0);
    // Trigger pump animation for pump shotgun
    if (wId === 'pump_shotgun') {
      shotgunPumpAnim = true;
      shotgunPumpTimer = CONFIG.shotgunPumpDelay;
    }
  }

  // Tahap 16: Sniper-specific visual recoil + bolt animation
  if (wData.type === 'rifle') {
    const rifleRecoil = wId === 'smg' ? 0.15 : 0.3;
    rifleRecoilOffset = Math.min(rifleRecoilOffset + rifleRecoil, 1.0);
  }
  if (wData.type === 'sniper') {
    const sniperRecoil = CONFIG.sniperRecoil[wId] || 0.5;
    sniperRecoilOffset = Math.min(sniperRecoilOffset + sniperRecoil, 1.0);
    // Trigger bolt animation for bolt-action sniper
    if (wId === 'bolt_sniper') {
      sniperBoltAnim = true;
      sniperBoltTimer = CONFIG.sniperBoltDelay;
    }
    // Unscope briefly when firing (scope recoil)
    if (isSniperScoping) {
      targetFOV = CONFIG.cameraFOV; // Brief unscope
      setTimeout(() => {
        if (isSniperScoping) targetFOV = CONFIG.sniperScopeFOV;
      }, 150);
    }
  }

  // BUG FIX: Only show muzzle flash for firearms (not melee/fist)
  if (!isMeleeWeapon(wData)) {
    showMuzzleFlash();
  }

  // ── MELEE WEAPONS: Short-range raycast, no bullet impact ──
  if (isMeleeWeapon(wData)) {
    const meleeRange = wData.range || 1.5;
    const raycaster = new THREE.Raycaster();
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    raycaster.set(camera.position, dir);
    raycaster.far = meleeRange;

    // Get all collidable meshes for intersection
    const collidableMeshes = [];
    scene.traverse((obj) => {
      if (obj.userData && obj.userData.collidable && obj.isMesh) {
        collidableMeshes.push(obj);
      }
    });

    const intersects = raycaster.intersectObjects(collidableMeshes, false);

    if (intersects.length > 0) {
      const hit = intersects[0];
      // Show HUD hit marker for melee (red X at crosshair)
      if (hitMarkerEl) {
        hitMarkerEl.classList.add('active');
        setTimeout(() => { if (hitMarkerEl) hitMarkerEl.classList.remove('active'); }, 200);
      }
      // Show melee impact (small slash mark)
      createMeleeImpact(hit.point, hit.object);
    }

    // Update HUD
    updateWeaponHud();
    return;
  }

  // ── FIREARMS: Full-range raycast with bullet impact ──────
  // Perform raycast
  const raycaster = new THREE.Raycaster();

  // Calculate spread offset
  const spreadValue = wData.spread || 0;
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);

  // Apply random spread to direction
  if (spreadValue > 0) {
    const spreadX = (Math.random() - 0.5) * 2 * spreadValue;
    const spreadY = (Math.random() - 0.5) * 2 * spreadValue;
    dir.x += spreadX;
    dir.y += spreadY;
    dir.normalize();
  }

  raycaster.set(camera.position, dir);
  raycaster.far = wData.range || CONFIG.raycastFar;

  // Get all collidable meshes for intersection
  const collidableMeshes = [];
  scene.traverse((obj) => {
    if (obj.userData && obj.userData.collidable && obj.isMesh) {
      collidableMeshes.push(obj);
    }
  });

  // For shotgun: multiple pellets with realistic spread
  const pellets = wData.pellets || 1;

  // BUG FIX: Shotgun pump animation — add visual delay between shots
  // This is handled by the fire rate (0.7 shots/s for pump shotgun)

  for (let p = 0; p < pellets; p++) {
    if (pellets > 1) {
      // Recalculate spread for each pellet — use Gaussian-like distribution for realistic shotgun spread
      const pDir = new THREE.Vector3();
      camera.getWorldDirection(pDir);

      // Shotgun spread: cone-shaped distribution
      // Use Box-Muller transform for more natural spread pattern
      const u1 = Math.random();
      const u2 = Math.random();
      const gaussX = Math.sqrt(-2 * Math.log(Math.max(u1, 0.0001))) * Math.cos(2 * Math.PI * u2);
      const gaussY = Math.sqrt(-2 * Math.log(Math.max(u1, 0.0001))) * Math.sin(2 * Math.PI * u2);

      const pSpreadX = gaussX * spreadValue * 0.5;
      const pSpreadY = gaussY * spreadValue * 0.5;
      pDir.x += pSpreadX;
      pDir.y += pSpreadY;
      pDir.normalize();
      raycaster.set(camera.position, pDir);
      raycaster.far = wData.range || CONFIG.raycastFar;
    }

    const intersects = raycaster.intersectObjects(collidableMeshes, false);

    if (intersects.length > 0) {
      const hit = intersects[0];

      // Show hit marker at impact point
      showHitMarker(hit.point, hit.face ? hit.face.normal : null);

      // Tahap 10: Show HUD hit marker (red X at crosshair)
      if (hitMarkerEl) {
        hitMarkerEl.classList.add('active');
        setTimeout(() => { if (hitMarkerEl) hitMarkerEl.classList.remove('active'); }, 200);
      }

      // Calculate damage based on distance (damage falloff)
      const distance = hit.distance;
      const maxRange = wData.range || CONFIG.raycastFar;
      const damageFalloff = distance > maxRange * 0.5
        ? 1.0 - ((distance - maxRange * 0.5) / (maxRange * 0.5)) * 0.5
        : 1.0;

      // Create bullet impact visual
      createBulletImpact(hit.point, hit.object, hit.distance);
    }
  }

  // Update HUD
  updateWeaponHud();
}

function startReload() {
  const weapon = getCurrentWeapon();
  if (!weapon) return;

  const wData = weapon.data;
  const wId = weapon.id;

  // Can't reload melee/fist
  if (!wData.magazine) return;
  // Already reloading
  if (isReloading) return;
  // Magazine already full
  if (weaponInventory.ammo[wId] >= wData.magazine) return;
  // No reserve ammo
  if ((weaponInventory.reserveAmmo[wId] || 0) <= 0) return;

  isReloading = true;
  reloadStartTime = performance.now() / 1000;
  updateWeaponHud();
}

function updateReload() {
  if (!isReloading) return;

  const now = performance.now() / 1000;
  if (now - reloadStartTime >= CONFIG.reloadTime) {
    const weapon = getCurrentWeapon();
    if (!weapon) { isReloading = false; return; }

    const wData = weapon.data;
    const wId = weapon.id;
    const currentAmmo = weaponInventory.ammo[wId] || 0;
    const reserveAmmo = weaponInventory.reserveAmmo[wId] || 0;
    const needed = wData.magazine - currentAmmo;
    const toReload = Math.min(needed, reserveAmmo);

    weaponInventory.ammo[wId] = currentAmmo + toReload;
    weaponInventory.reserveAmmo[wId] = reserveAmmo - toReload;

    isReloading = false;
    updateWeaponHud();
  }
}

// ── Tahap 10: Bullet Impact Visual ─────────────────────────
const bulletImpactPool = [];
const MAX_IMPACTS = 30;

function createBulletImpact(position, hitObject, distance) {
  // Create a small decal at impact point
  const impactSize = 0.06 + Math.random() * 0.04;
  const geo = new THREE.CircleGeometry(impactSize, 8);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x333333,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const decal = new THREE.Mesh(geo, mat);
  decal.position.copy(position);

  // Orient decal to face outward from hit surface (toward camera)
  const toCamera = new THREE.Vector3().subVectors(camera.position, position).normalize();
  decal.lookAt(position.clone().add(toCamera));

  // Offset slightly from surface to prevent z-fighting (toward camera)
  decal.position.add(toCamera.clone().multiplyScalar(0.01));

  scene.add(decal);
  bulletImpactPool.push({ mesh: decal, time: performance.now() / 1000 });

  // Remove old impacts if pool is full
  while (bulletImpactPool.length > MAX_IMPACTS) {
    const old = bulletImpactPool.shift();
    scene.remove(old.mesh);
    old.mesh.geometry.dispose();
    old.mesh.material.dispose();
  }

  // Add spark particle effect for close-range hits
  if (distance < 10) {
    createSparkEffect(position);
  }
}

// ── Spark effect for bullet impacts ────────────────────────
function createSparkEffect(position) {
  const sparkCount = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < sparkCount; i++) {
    const sparkGeo = new THREE.SphereGeometry(0.015, 4, 4);
    const sparkMat = new THREE.MeshBasicMaterial({
      color: 0xffaa44,
      transparent: true,
      opacity: 0.9,
    });
    const spark = new THREE.Mesh(sparkGeo, sparkMat);
    spark.position.copy(position);
    scene.add(spark);

    // Random velocity for spark
    const sparkVel = new THREE.Vector3(
      (Math.random() - 0.5) * 3,
      Math.random() * 2 + 1,
      (Math.random() - 0.5) * 3
    );

    const startTime = performance.now() / 1000;
    const lifetime = 0.2 + Math.random() * 0.3;

    // Animate spark in the render loop
    const sparkObj = { mesh: spark, vel: sparkVel, startTime, lifetime };
    activeSparks.push(sparkObj);
  }
}

const activeSparks = [];

function updateSparks(deltaTime) {
  for (let i = activeSparks.length - 1; i >= 0; i--) {
    const s = activeSparks[i];
    const elapsed = performance.now() / 1000 - s.startTime;

    if (elapsed > s.lifetime) {
      scene.remove(s.mesh);
      s.mesh.geometry.dispose();
      s.mesh.material.dispose();
      activeSparks.splice(i, 1);
      continue;
    }

    // Apply gravity
    s.vel.y += CONFIG.gravity * deltaTime;
    s.mesh.position.x += s.vel.x * deltaTime;
    s.mesh.position.y += s.vel.y * deltaTime;
    s.mesh.position.z += s.vel.z * deltaTime;

    // Fade out
    s.mesh.material.opacity = 1.0 - (elapsed / s.lifetime);
  }
}

// ── Melee impact visual (slash mark) ──────────────────────
function createMeleeImpact(position, hitObject) {
  const geo = new THREE.CircleGeometry(0.12, 6);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xcccccc,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const decal = new THREE.Mesh(geo, mat);
  decal.position.copy(position);

  const toCamera = new THREE.Vector3().subVectors(camera.position, position).normalize();
  decal.lookAt(position.clone().add(toCamera));
  decal.position.add(toCamera.multiplyScalar(0.01));

  scene.add(decal);
  bulletImpactPool.push({ mesh: decal, time: performance.now() / 1000 });

  while (bulletImpactPool.length > MAX_IMPACTS) {
    const old = bulletImpactPool.shift();
    scene.remove(old.mesh);
    old.mesh.geometry.dispose();
    old.mesh.material.dispose();
  }
}

// ── Tahap 10: Update Shooting (called every frame) ─────────
function updateShooting(deltaTime) {
  // Update muzzle flash timer
  if (muzzleFlashTimer > 0) {
    muzzleFlashTimer -= deltaTime;
    if (muzzleFlashTimer <= 0 && muzzleFlash) {
      muzzleFlash.visible = false;
    }
  }

  // Update hit marker timer
  if (hitMarkerTimer > 0) {
    hitMarkerTimer -= deltaTime;
    if (hitMarkerTimer <= 0 && hitMarkerMesh) {
      hitMarkerMesh.visible = false;
    }
  }

  // Update recoil recovery
  if (recoilOffset > 0) {
    recoilOffset -= recoilRecoverySpeed * deltaTime;
    if (recoilOffset < 0) recoilOffset = 0;
  }

  // Update shoot cooldown
  if (shootCooldown > 0) {
    shootCooldown -= deltaTime;
    if (shootCooldown < 0) shootCooldown = 0;
  }

  // Update reload
  updateReload();

  // Update sparks
  updateSparks(deltaTime);

  // Handle continuous shooting for automatic weapons
  if (isShooting && isPointerLocked && !isReloading) {
    const weapon = getCurrentWeapon();
    if (weapon) {
      // For automatic weapons (rifle, SMG, auto shotgun), allow continuous fire
      // Pump shotgun is semi-auto, only auto_shotgun is automatic
      if (weapon.data.type === 'rifle' ||
          (weapon.data.type === 'shotgun' && weapon.id === 'auto_shotgun')) {
        shoot();
      }
    }
  }
}

// ── Tahap 10: Handle single-shot click ─────────────────────
// BUG FIX: Added shotgun type so pump shotgun can fire on click
let lastClickTime = 0;
function handleShootClick() {
  if (!isPointerLocked || isReloading) return;
  const weapon = getCurrentWeapon();
  if (!weapon) return;

  // For semi-auto weapons (pistol, sniper, shotgun) and melee, only shoot on click
  if (weapon.data.type === 'pistol' || weapon.data.type === 'sniper' ||
      weapon.data.type === 'shotgun') {
    shoot();
  } else if (weapon.data.type === 'fist') {
    // Tahap 12: Fist punch
    doFistPunch();
  } else if (weapon.data.type === 'melee') {
    // Tahap 13: Knife slash
    doKnifeSlash();
  }
}

// ══════════════════════════════════════════════════════════════
//  TAHAP 11: GRENADE THROWING SYSTEM
// ══════════════════════════════════════════════════════════════

// ── Grenade Aim System ────────────────────────────────────
// Hold G/H to aim, release to throw
// Shows trajectory arc while aiming

function updateGrenadeAim() {
  // Check if G or H is held down for aiming
  if (keys.g && !isGrenadeAiming) {
    if (weaponInventory.grenadeFrag > 0) {
      isGrenadeAiming = true;
      grenadeAimType = 'frag';
      grenadeAimStartTime = performance.now() / 1000;
    }
  } else if (keys.h && !isGrenadeAiming) {
    if (weaponInventory.grenadeSmoke > 0) {
      isGrenadeAiming = true;
      grenadeAimType = 'smoke';
      grenadeAimStartTime = performance.now() / 1000;
    }
  }

  // Update trajectory visualization while aiming
  if (isGrenadeAiming) {
    updateTrajectoryDots();
  }
}

function clearTrajectoryDots() {
  for (const dot of trajectoryDots) {
    scene.remove(dot);
    dot.geometry.dispose();
    dot.material.dispose();
  }
  trajectoryDots = [];
}

function updateTrajectoryDots() {
  // Clear old dots
  clearTrajectoryDots();

  // Calculate trajectory
  const throwDir = new THREE.Vector3();
  camera.getWorldDirection(throwDir);
  throwDir.normalize();

  const startPos = camera.position.clone().add(throwDir.clone().multiplyScalar(0.5));
  startPos.y -= 0.15;

  const initialVelocity = new THREE.Vector3(
    throwDir.x * CONFIG.grenadeForwardSpeed,
    throwDir.y * CONFIG.grenadeForwardSpeed + CONFIG.grenadeUpSpeed,
    throwDir.z * CONFIG.grenadeForwardSpeed
  );

  // Add player velocity
  initialVelocity.x += velocity.x * 0.3;
  initialVelocity.z += velocity.z * 0.3;

  const dotCount = 20;
  const timeStep = 0.1;
  const gravity = CONFIG.grenadeGravity;

  let pos = startPos.clone();
  let vel = initialVelocity.clone();

  const dotMat = new THREE.MeshBasicMaterial({
    color: grenadeAimType === 'frag' ? 0x44ff44 : 0x8888ff,
    transparent: true,
    opacity: 0.6,
  });

  for (let i = 0; i < dotCount; i++) {
    vel.y += gravity * timeStep;
    pos.x += vel.x * timeStep;
    pos.y += vel.y * timeStep;
    pos.z += vel.z * timeStep;

    // Stop if below ground
    if (pos.y < 0) break;

    // Create dot
    const dotGeo = new THREE.SphereGeometry(0.05, 4, 4);
    const dot = new THREE.Mesh(dotGeo, dotMat.clone());
    dot.position.copy(pos);
    // Fade out dots further from player
    dot.material.opacity = 0.6 * (1 - i / dotCount);
    scene.add(dot);
    trajectoryDots.push(dot);
  }
}

function throwGrenade(type) {
  if (grenadeCooldown > 0) return;

  if (type === 'frag') {
    if (weaponInventory.grenadeFrag <= 0) return;
    weaponInventory.grenadeFrag--;
  } else if (type === 'smoke') {
    if (weaponInventory.grenadeSmoke <= 0) return;
    weaponInventory.grenadeSmoke--;
  } else {
    return;
  }

  updateGrenadeHud();
  grenadeCooldown = 0.5; // 0.5s cooldown between throws

  // Get grenade data from item.json
  const grenadeData = type === 'frag'
    ? (itemData && itemData.weapons && itemData.weapons.grenade && itemData.weapons.grenade.frag_grenade
       ? itemData.weapons.grenade.frag_grenade : ITEM_DATA_FALLBACK.weapons.grenade.frag_grenade)
    : (itemData && itemData.weapons && itemData.weapons.grenade && itemData.weapons.grenade.smoke_grenade
       ? itemData.weapons.grenade.smoke_grenade : ITEM_DATA_FALLBACK.weapons.grenade.smoke_grenade);

  // Create grenade mesh
  const grenadeRadius = 0.12;
  const geo = new THREE.SphereGeometry(grenadeRadius, 12, 12);
  let mat;
  if (type === 'frag') {
    mat = new THREE.MeshStandardMaterial({
      color: 0x44AA44,
      roughness: 0.4,
      metalness: 0.3,
      emissive: 0x113311,
      emissiveIntensity: 0.3,
    });
  } else {
    mat = new THREE.MeshStandardMaterial({
      color: 0x8888AA,
      roughness: 0.5,
      metalness: 0.2,
      emissive: 0x222233,
      emissiveIntensity: 0.2,
    });
  }
  const grenadeMesh = new THREE.Mesh(geo, mat);
  grenadeMesh.castShadow = true;

  // Add a small ring/cap on top of grenade for visual detail
  const capGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.06, 8);
  const capMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.6, metalness: 0.5 });
  const cap = new THREE.Mesh(capGeo, capMat);
  cap.position.y = grenadeRadius + 0.02;
  grenadeMesh.add(cap);

  // Position grenade at player's hand
  const playerDir = new THREE.Vector3();
  camera.getWorldDirection(playerDir);
  const startPos = camera.position.clone().add(playerDir.multiplyScalar(0.5));
  startPos.y -= 0.15; // slightly below camera (hand level)
  grenadeMesh.position.copy(startPos);

  scene.add(grenadeMesh);

  // Calculate initial velocity: forward + upward using camera direction
  // BUG FIX: Use camera Y component for more natural aiming
  const throwDir = new THREE.Vector3();
  camera.getWorldDirection(throwDir);
  throwDir.normalize();

  const initialVelocity = new THREE.Vector3(
    throwDir.x * CONFIG.grenadeForwardSpeed,
    throwDir.y * CONFIG.grenadeForwardSpeed + CONFIG.grenadeUpSpeed,
    throwDir.z * CONFIG.grenadeForwardSpeed
  );

  // Add player's horizontal velocity for more realistic feel
  initialVelocity.x += velocity.x * 0.3;
  initialVelocity.z += velocity.z * 0.3;

  // Grenade object
  const grenadeObj = {
    mesh: grenadeMesh,
    velocity: initialVelocity,
    angularVelocity: new THREE.Vector3(
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 8
    ), // Random spin
    type: type,
    timer: CONFIG.grenadeTimer,
    bounces: 0,
    radius: grenadeRadius,
    data: grenadeData,
    settled: false, // Whether grenade has come to rest
  };

  activeGrenades.push(grenadeObj);
}

function updateGrenades(deltaTime) {
  if (grenadeCooldown > 0) {
    grenadeCooldown -= deltaTime;
    if (grenadeCooldown < 0) grenadeCooldown = 0;
  }

  // Update grenade aim
  updateGrenadeAim();

  for (let i = activeGrenades.length - 1; i >= 0; i--) {
    const g = activeGrenades[i];

    // Apply gravity
    g.velocity.y += CONFIG.grenadeGravity * deltaTime;

    // Move grenade
    const newX = g.mesh.position.x + g.velocity.x * deltaTime;
    const newY = g.mesh.position.y + g.velocity.y * deltaTime;
    const newZ = g.mesh.position.z + g.velocity.z * deltaTime;

    // ── Ground collision (Y = 0 + radius) ──
    if (newY - g.radius <= 0) {
      g.mesh.position.y = g.radius;
      g.velocity.y = -g.velocity.y * CONFIG.grenadeBounceFactor;
      g.velocity.x *= CONFIG.grenadeFriction;
      g.velocity.z *= CONFIG.grenadeFriction;
      g.bounces++;

      // Enforce max bounces
      if (g.bounces >= CONFIG.grenadeMaxBounces) {
        g.velocity.set(0, 0, 0);
        g.angularVelocity.set(0, 0, 0);
        g.settled = true;
      }

      // Reduce angular velocity on bounce
      g.angularVelocity.multiplyScalar(0.5);

      // If very low velocity after bounce, settle
      if (Math.abs(g.velocity.y) < 0.5) {
        g.velocity.y = 0;
        g.settled = true;
      }
    } else {
      g.mesh.position.y = newY;
    }

    // ── Wall/box collision (XZ plane) ──
    let collided = false;
    for (const box of collidableBoxes) {
      // Check if grenade is inside the box XZ bounds
      const closestX = Math.max(box.minX, Math.min(newX, box.maxX));
      const closestZ = Math.max(box.minZ, Math.min(newZ, box.maxZ));

      // Check Y overlap (grenade must be within box Y range)
      if (g.mesh.position.y + g.radius < box.minY || g.mesh.position.y - g.radius > box.maxY) continue;

      const dx = newX - closestX;
      const dz = newZ - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < g.radius * g.radius) {
        // Bounce off the wall
        const dist = Math.sqrt(Math.max(distSq, 0.0001));
        const pushX = dx / dist;
        const pushZ = dz / dist;

        // Reflect velocity
        if (Math.abs(pushX) > Math.abs(pushZ)) {
          g.velocity.x = -g.velocity.x * CONFIG.grenadeBounceFactor;
        } else {
          g.velocity.z = -g.velocity.z * CONFIG.grenadeBounceFactor;
        }
        g.velocity.y *= CONFIG.grenadeFriction;
        g.bounces++;

        // Enforce max bounces
        if (g.bounces >= CONFIG.grenadeMaxBounces) {
          g.velocity.set(0, 0, 0);
          g.angularVelocity.set(0, 0, 0);
          g.settled = true;
        }

        // Reduce angular velocity
        g.angularVelocity.multiplyScalar(0.5);

        collided = true;
        break;
      }
    }

    if (!collided) {
      g.mesh.position.x = newX;
      g.mesh.position.z = newZ;
    }

    // ── Top surface collision (landing on top of boxes) ──
    for (const box of collidableBoxes) {
      // Check if grenade is above the box
      if (g.mesh.position.x > box.minX && g.mesh.position.x < box.maxX &&
          g.mesh.position.z > box.minZ && g.mesh.position.z < box.maxZ) {
        // Check if grenade was falling and hit the top of the box
        if (g.velocity.y <= 0 && g.mesh.position.y - g.radius <= box.maxY && g.mesh.position.y + g.radius > box.maxY - 0.2) {
          g.mesh.position.y = box.maxY + g.radius;
          g.velocity.y = -g.velocity.y * CONFIG.grenadeBounceFactor;
          g.velocity.x *= CONFIG.grenadeFriction;
          g.velocity.z *= CONFIG.grenadeFriction;
          g.bounces++;
          g.angularVelocity.multiplyScalar(0.5);

          // Enforce max bounces
          if (g.bounces >= CONFIG.grenadeMaxBounces) {
            g.velocity.set(0, 0, 0);
            g.angularVelocity.set(0, 0, 0);
            g.settled = true;
          }

          if (Math.abs(g.velocity.y) < 0.5) {
            g.velocity.y = 0;
            g.settled = true;
          }
        }
      }
    }

    // ── Apply rotation ──
    g.mesh.rotation.x += g.angularVelocity.x * deltaTime;
    g.mesh.rotation.y += g.angularVelocity.y * deltaTime;
    g.mesh.rotation.z += g.angularVelocity.z * deltaTime;

    // When settled, slow down rotation
    if (g.settled) {
      g.angularVelocity.multiplyScalar(0.9);
      g.velocity.x *= 0.95;
      g.velocity.z *= 0.95;
    }

    // ── Update timer ──
    g.timer -= deltaTime;

    // ── Detonate if timer expired ──
    if (g.timer <= 0) {
      detonateGrenade(g);
      // Dispose all children (cap mesh) to prevent memory leak
      g.mesh.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      scene.remove(g.mesh);
      activeGrenades.splice(i, 1);
      continue;
    }
  }
}

function detonateGrenade(grenade) {
  const pos = grenade.mesh.position.clone();
  const type = grenade.type;

  if (type === 'frag') {
    // ── Frag Grenade: Explosion visual + damage ──
    createExplosionEffect(pos);

    // Damage calculation (linear falloff from center)
    const damageRadius = grenade.data.radius || 8;
    const maxDamage = grenade.data.damage || 80;

    // Distance from player to grenade
    const playerDist = camera.position.distanceTo(pos);
    if (playerDist < damageRadius) {
      const damageFactor = 1.0 - (playerDist / damageRadius);
      const damage = Math.round(maxDamage * damageFactor);
      // Tahap 19: Apply actual damage to player
      applyDamage(damage, 'frag_grenade', false);
    }
  } else if (type === 'smoke') {
    // ── Smoke Grenade: Create smoke cloud ──
    createSmokeCloud(pos, grenade.data);
  }
}

// ── Explosion Effect ───────────────────────────────────────
function createExplosionEffect(position) {
  // Flash sphere
  const flashGeo = new THREE.SphereGeometry(0.5, 16, 16);
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xffaa22,
    transparent: true,
    opacity: 0.9,
  });
  const flash = new THREE.Mesh(flashGeo, flashMat);
  flash.position.copy(position);
  scene.add(flash);

  // Expanding shockwave ring
  const ringGeo = new THREE.RingGeometry(0.1, 0.3, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xff6622,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.copy(position);
  ring.rotation.x = -Math.PI / 2;
  scene.add(ring);

  // Debris particles
  const debrisCount = 12;
  const debrisParticles = [];
  for (let i = 0; i < debrisCount; i++) {
    const dGeo = new THREE.SphereGeometry(0.03 + Math.random() * 0.05, 4, 4);
    const dMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0.3 + Math.random() * 0.4, 0.2 + Math.random() * 0.2, 0.1),
      transparent: true,
      opacity: 0.9,
    });
    const dMesh = new THREE.Mesh(dGeo, dMat);
    dMesh.position.copy(position);
    scene.add(dMesh);

    const dVel = new THREE.Vector3(
      (Math.random() - 0.5) * 8,
      Math.random() * 6 + 2,
      (Math.random() - 0.5) * 8
    );
    debrisParticles.push({ mesh: dMesh, vel: dVel, startTime: performance.now() / 1000 });
  }

  // Animate explosion
  const startTime = performance.now() / 1000;
  const flashDuration = 0.15;
  const ringDuration = 0.4;
  const debrisDuration = 0.8;

  function animateExplosion() {
    const now = performance.now() / 1000;
    const elapsed = now - startTime;

    // Flash
    if (elapsed < flashDuration) {
      const t = elapsed / flashDuration;
      const scale = 1 + t * 6;
      flash.scale.set(scale, scale, scale);
      flash.material.opacity = 0.9 * (1 - t);
    } else if (flash.parent) {
      scene.remove(flash);
      flash.geometry.dispose();
      flash.material.dispose();
    }

    // Ring
    if (elapsed < ringDuration) {
      const t = elapsed / ringDuration;
      const scale = 1 + t * 30;
      ring.scale.set(scale, scale, scale);
      ring.material.opacity = 0.7 * (1 - t);
    } else if (ring.parent) {
      scene.remove(ring);
      ring.geometry.dispose();
      ring.material.dispose();
    }

    // Debris
    for (let i = debrisParticles.length - 1; i >= 0; i--) {
      const d = debrisParticles[i];
      const dElapsed = now - d.startTime;
      if (dElapsed > debrisDuration) {
        scene.remove(d.mesh);
        d.mesh.geometry.dispose();
        d.mesh.material.dispose();
        debrisParticles.splice(i, 1);
        continue;
      }
      d.vel.y += CONFIG.gravity * 0.016;
      d.mesh.position.x += d.vel.x * 0.016;
      d.mesh.position.y += d.vel.y * 0.016;
      d.mesh.position.z += d.vel.z * 0.016;
      d.mesh.material.opacity = 0.9 * (1 - dElapsed / debrisDuration);
    }

    if (elapsed < Math.max(flashDuration, ringDuration, debrisDuration) + 0.1) {
      requestAnimationFrame(animateExplosion);
    }
  }

  animateExplosion();
}

// ── Damage Flash Effect ────────────────────────────────────
function showDamageFlash(intensity) {
  // Tahap 19: Use the dedicated damage-flash element instead of creating DOM elements
  triggerDamageFlash();
}

// ── Smoke Cloud (v7: Ultra-optimized — fewer sprites, no per-particle updates, no lag) ─────
function createSmokeCloud(position, grenadeData) {
  // v7: Maximum performance optimization while keeping visual structure
  // Key optimizations:
  //   - 12 sprites (reduced from 20) — large sprites still cover the area
  //   - Only 2 shared materials (core + edge) — 2 draw calls total
  //   - NO per-particle opacity updates — opacity is set on shared material only
  //   - NO per-particle position changes — sprites are static once placed
  //   - CSS overlay handles "inside smoke" visibility (cheap, no 3D overhead)
  //   - Throttled fade updates (every 200ms instead of every frame)
  const radius = CONFIG.smokeRadius || 7;
  const duration = grenadeData.duration || CONFIG.smokeGrenadeDuration;
  const particleCount = CONFIG.smokeParticleCount || 12;

  // Create a single shared canvas texture for all smoke sprites
  const canvas = document.createElement('canvas');
  canvas.width = 32;  // v7: Reduced from 64 — even less texture memory, still looks fine
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(220,220,220,1.0)');
  grad.addColorStop(0.4, 'rgba(200,200,200,0.8)');
  grad.addColorStop(0.7, 'rgba(180,180,180,0.4)');
  grad.addColorStop(1.0, 'rgba(160,160,160,0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, 32);
  const smokeTexture = new THREE.CanvasTexture(canvas);

  // v7: Only TWO shared materials — one for core, one for edge
  // This means only 2 draw calls regardless of particle count
  const coreMat = new THREE.SpriteMaterial({
    map: smokeTexture,
    color: 0xcccccc,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: true,
  });
  const edgeMat = new THREE.SpriteMaterial({
    map: smokeTexture,
    color: 0xbbbbbb,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: true,
  });

  const smokeParticles = [];
  const coreCount = Math.floor(particleCount * 0.6);

  for (let i = 0; i < particleCount; i++) {
    const isCore = i < coreCount;
    const angle = Math.random() * Math.PI * 2;
    const maxDist = isCore ? radius * 0.5 : radius * 0.85;
    const dist = Math.random() * maxDist;
    const height = isCore
      ? Math.random() * 3.5 + 0.3
      : Math.random() * 2.5 + 0.2;

    // v7: Use shared material — ALL core sprites share one material, ALL edge share another
    const sprite = new THREE.Sprite(isCore ? coreMat : edgeMat);
    const size = isCore
      ? 6.0 + Math.random() * 4.0  // v7: Even larger sprites to cover more area with fewer objects
      : 5.0 + Math.random() * 3.5;
    sprite.scale.set(size, size, 1);
    sprite.position.set(
      position.x + Math.cos(angle) * dist,
      position.y + height,
      position.z + Math.sin(angle) * dist
    );

    scene.add(sprite);
    // v7: No per-particle opacity tracking — opacity is set on shared material
    smokeParticles.push({
      mesh: sprite,
      isCore: isCore,
    });
  }

  const smokeCloud = {
    particles: smokeParticles,
    coreMat: coreMat,
    edgeMat: edgeMat,
    texture: smokeTexture,
    startTime: performance.now() / 1000,
    duration: duration,
    position: position,
    radius: radius,
    lastFadeUpdate: 0, // v7: Throttle fade updates to every 200ms
  };

  activeSmokeClouds.push(smokeCloud);
}

function updateSmokeClouds(deltaTime) {
  const now = performance.now() / 1000;

  for (let i = activeSmokeClouds.length - 1; i >= 0; i--) {
    const cloud = activeSmokeClouds[i];
    const elapsed = now - cloud.startTime;
    const remaining = cloud.duration - elapsed;

    if (remaining <= 0) {
      // Remove smoke cloud — dispose sprites and materials
      for (const p of cloud.particles) {
        scene.remove(p.mesh);
      }
      // v7: Dispose shared materials and texture once
      if (cloud.coreMat) cloud.coreMat.dispose();
      if (cloud.edgeMat) cloud.edgeMat.dispose();
      if (cloud.texture) cloud.texture.dispose();
      activeSmokeClouds.splice(i, 1);
      continue;
    }

    // v7: Throttle fade updates — only update every ~200ms instead of every frame
    // This dramatically reduces material.opacity writes (from 60/s to 5/s)
    if (now - cloud.lastFadeUpdate < 0.2) continue;
    cloud.lastFadeUpdate = now;

    const fadeStartTime = cloud.duration * 0.6;

    // Determine fade-in state
    const fadeInFactor = elapsed < 2.0 ? elapsed / 2.0 : 1.0;

    // Determine fade-out state
    let fadeOutFactor = 1.0;
    if (elapsed > fadeStartTime) {
      const fadeProgress = (elapsed - fadeStartTime) / (cloud.duration - fadeStartTime);
      fadeOutFactor = 1.0 - fadeProgress;
    }

    // v7: Set shared material opacity for core and edge (only 2 writes per cloud)
    if (cloud.coreMat) {
      cloud.coreMat.opacity = 0.75 * fadeInFactor * fadeOutFactor;
    }
    if (cloud.edgeMat) {
      cloud.edgeMat.opacity = 0.45 * fadeInFactor * fadeOutFactor;
    }
  }
}

// ══════════════════════════════════════════════════════════════
//  TAHAP 12: FIST / MELEE VISUAL & MECHANICS
// ══════════════════════════════════════════════════════════════

function createFistVisual() {
  // COMPLETE REWRITE v9: Realistic clenched fist with proper human anatomy
  // A real clenched fist from FPS view looks like:
  // - A rectangular block (NOT spherical) — the back of the hand is flat/angled
  // - Curled fingers create visible horizontal ridges on the front
  // - Knuckles are angular bumps on top, not round
  // - Thumb wraps across the front from the side
  // - The overall shape is angular and boxy, NOT round/bulbous

  // Materials
  const skinMat = new THREE.MeshPhongMaterial({ color: 0xd4906a, shininess: 30 });
  const skinLightMat = new THREE.MeshPhongMaterial({ color: 0xe0a880, shininess: 25 });
  const knuckleMat = new THREE.MeshPhongMaterial({ color: 0xa06848, shininess: 20 });
  const nailMat = new THREE.MeshPhongMaterial({ color: 0xf0c0b0, shininess: 40 });
  const creaseMat = new THREE.MeshPhongMaterial({ color: 0x805030, shininess: 10 });
  const thumbPadMat = new THREE.MeshPhongMaterial({ color: 0xe0a080, shininess: 25 });

  function buildFist(isLeft) {
    const fist = new THREE.Group();
    const mirror = isLeft ? -1 : 1;

    // ── MAIN FIST BODY — BoxGeometry-based, NOT spherical ──
    // A real fist is a rectangular block shape, not a ball
    // The palm is flat, the back of the hand is slightly angled
    // Width > Height > Depth (a fist is wider than it is tall or deep)

    // Core palm body — a flat rectangular box
    const palmGeo = new THREE.BoxGeometry(0.22, 0.16, 0.12);
    const palm = new THREE.Mesh(palmGeo, skinMat);
    palm.name = 'fist_body';
    fist.add(palm);

    // ── Back of hand (top surface) — slightly darker, angled ──
    // The back of a fist slopes slightly from the knuckles down to the wrist
    const backGeo = new THREE.BoxGeometry(0.22, 0.04, 0.11);
    const back = new THREE.Mesh(backGeo, knuckleMat);
    back.position.set(0, 0.08, -0.005);
    back.rotation.x = 0.1; // Slight angle
    fist.add(back);

    // ── Curled fingers — the defining feature of a clenched fist ──
    // When you clench your fist, the fingers curl over and press into the palm
    // From the front, you see 4 horizontal ridges (the curled fingers)
    // Each finger is a rounded box, slightly different width

    const fingerWidths = [0.042, 0.048, 0.046, 0.038]; // Index, Middle, Ring, Pinky
    const fingerX = [-0.055, -0.008, 0.038, 0.076]; // Spacing
    const fingerHeights = [0.03, 0.035, 0.032, 0.025]; // Slightly different heights

    for (let f = 0; f < 4; f++) {
      // Finger body — a box that wraps from top over the front
      const fGeo = new THREE.BoxGeometry(fingerWidths[f], fingerHeights[f], 0.10);
      const fMesh = new THREE.Mesh(fGeo, skinMat);
      fMesh.position.set(mirror * fingerX[f], 0.065, 0.02);
      fist.add(fMesh);

      // Finger pad (front of curled finger, where it presses into palm)
      const padGeo = new THREE.BoxGeometry(fingerWidths[f] - 0.006, fingerHeights[f] - 0.006, 0.03);
      const pad = new THREE.Mesh(padGeo, skinLightMat);
      pad.position.set(mirror * fingerX[f], 0.065, 0.07);
      fist.add(pad);

      // Knuckle on top — angular bump, NOT round
      const knuckleGeo = new THREE.BoxGeometry(fingerWidths[f] + 0.004, 0.018, 0.025);
      const knuckle = new THREE.Mesh(knuckleGeo, knuckleMat);
      knuckle.position.set(mirror * fingerX[f], 0.095, -0.01);
      fist.add(knuckle);

      // Fingernail (small, on the front-bottom edge of the curled finger)
      const nailGeo = new THREE.BoxGeometry(fingerWidths[f] - 0.008, 0.005, 0.008);
      const nail = new THREE.Mesh(nailGeo, nailMat);
      nail.position.set(mirror * fingerX[f], 0.05, 0.085);
      fist.add(nail);
    }

    // ── Finger crease lines on the front ──
    // Where fingers curl into the palm — horizontal lines
    for (let c = 0; c < 3; c++) {
      const creaseGeo = new THREE.BoxGeometry(0.18, 0.002, 0.002);
      const crease = new THREE.Mesh(creaseGeo, creaseMat);
      crease.position.set(0, 0.04 + c * 0.022, 0.065);
      fist.add(crease);
    }

    // ── Wrist/forearm ──
    const wristGeo = new THREE.BoxGeometry(0.12, 0.14, 0.09);
    const wrist = new THREE.Mesh(wristGeo, skinMat);
    wrist.position.y = -0.14;
    fist.add(wrist);

    // Forearm extension
    const forearmGeo = new THREE.BoxGeometry(0.11, 0.08, 0.08);
    const forearm = new THREE.Mesh(forearmGeo, skinMat);
    forearm.position.y = -0.24;
    fist.add(forearm);

    // ── THUMB — wraps over the fingers from the side ──
    // The thumb is the most recognizable feature of a clenched fist
    // It must clearly cross over the index/middle fingers

    const thumbGroup = new THREE.Group();
    thumbGroup.name = 'finger_thumb';

    // Thumb base (metacarpal — connects from palm side)
    const thumbBaseGeo = new THREE.BoxGeometry(0.032, 0.05, 0.028);
    const thumbBase = new THREE.Mesh(thumbBaseGeo, thumbPadMat);
    thumbBase.position.y = 0.01;
    thumbGroup.add(thumbBase);

    // Thumb middle (the segment that bends inward)
    const thumbMidGeo = new THREE.BoxGeometry(0.028, 0.05, 0.025);
    const thumbMid = new THREE.Mesh(thumbMidGeo, skinMat);
    thumbMid.position.set(0, 0.045, 0.025);
    thumbGroup.add(thumbMid);

    // Thumb tip (the part that presses against the fingers)
    const thumbTipGeo = new THREE.BoxGeometry(0.026, 0.04, 0.024);
    const thumbTip = new THREE.Mesh(thumbTipGeo, thumbPadMat);
    thumbTip.position.set(0, 0.035, 0.055);
    thumbGroup.add(thumbTip);

    // Thumb nail (on outside of thumb)
    const thumbNailGeo = new THREE.BoxGeometry(0.018, 0.025, 0.005);
    const thumbNail = new THREE.Mesh(thumbNailGeo, nailMat);
    thumbNail.position.set(0, 0.04, 0.068);
    thumbGroup.add(thumbNail);

    // Position thumb on the side of the palm, bending INWARD over the fingers
    thumbGroup.position.set(mirror * 0.085, 0.03, 0.025);
    thumbGroup.rotation.z = mirror * 0.7;   // Tilts inward
    thumbGroup.rotation.x = -1.4;           // Curls forward over the fingers

    fist.add(thumbGroup);

    return fist;
  }

  // ── Create right fist ──
  fistGroup = buildFist(false);
  fistGroup.name = 'rightFist';
  fistGroup.position.set(0.26, -0.24, -0.32);
  fistGroup.rotation.set(-0.3, -0.6, 0.3);
  fistRestPosRight = { x: 0.26, y: -0.24, z: -0.32, rx: -0.3, ry: -0.6, rz: 0.3 };
  camera.add(fistGroup);

  // ── Create left fist ──
  leftFistGroup = buildFist(true);
  leftFistGroup.name = 'leftFist';
  leftFistGroup.position.set(-0.26, -0.24, -0.32);
  leftFistGroup.rotation.set(-0.3, 0.6, -0.3);
  leftFistGroup.visible = false;
  fistRestPosLeft = { x: -0.26, y: -0.24, z: -0.32, rx: -0.3, ry: 0.6, rz: -0.3 };
  camera.add(leftFistGroup);

  scene.add(camera);
}

function updateFist(deltaTime) {
  if (!fistGroup || !leftFistGroup) return;

  const weapon = getCurrentWeapon();
  const isFistWeapon = weapon && (weapon.data.type === 'fist');

  // Show/hide fist based on current weapon
  if (isFistWeapon) {
    fistGroup.visible = true;
    leftFistGroup.visible = true;
  } else {
    fistGroup.visible = false;
    leftFistGroup.visible = false;
    isFistPunching = false;
    fistPunchPhase = 'idle';
    return;
  }

  // Get active fist and rest position
  const activeFist = fistSide === 'right' ? fistGroup : leftFistGroup;
  const restPos = fistSide === 'right' ? fistRestPosRight : fistRestPosLeft;
  const inactiveFist = fistSide === 'right' ? leftFistGroup : fistGroup;

  // Update punch animation
  if (isFistPunching) {
    fistPunchTimer -= deltaTime;

    if (fistPunchPhase === 'punch') {
      // BUG FIX: Proper punch animation — forward thrust + rotation
      const t = 1 - (fistPunchTimer / CONFIG.fistPunchDuration);
      // Smooth ease-out for punch
      const easedT = 1 - Math.pow(1 - t, 2);
      const punchOffset = easedT * CONFIG.fistPunchDistance;

      // Move fist forward (negative Z = forward in camera space)
      activeFist.position.z = restPos.z - punchOffset;
      // Rotate fist forward (punching motion)
      activeFist.rotation.x = restPos.rx - easedT * 0.8;
      // Slight upward movement for jab feel
      activeFist.position.y = restPos.y + easedT * 0.05;

      if (fistPunchTimer <= 0) {
        fistPunchPhase = 'return';
        fistPunchTimer = CONFIG.fistReturnDuration;
      }
    } else if (fistPunchPhase === 'return') {
      // Return fist to rest position with smooth ease-in
      const t = 1 - (fistPunchTimer / CONFIG.fistReturnDuration);
      const easedT = t * t; // Ease-in

      activeFist.position.z = restPos.z;
      activeFist.position.y = restPos.y;
      activeFist.rotation.x = restPos.rx;

      if (fistPunchTimer <= 0) {
        isFistPunching = false;
        fistPunchPhase = 'idle';
        // Reset positions
        activeFist.position.set(restPos.x, restPos.y, restPos.z);
        activeFist.rotation.set(restPos.rx, restPos.ry, restPos.rz);
      }
    }
  }

  // Idle animation: slight bob for both fists
  if (!isFistPunching) {
    const bobTime = performance.now() / 1000;
    const bobY = Math.sin(bobTime * 2) * 0.006;
    const bobX = Math.cos(bobTime * 1.5) * 0.004;

    fistGroup.position.set(
      fistRestPosRight.x + bobX,
      fistRestPosRight.y + bobY,
      fistRestPosRight.z
    );
    leftFistGroup.position.set(
      fistRestPosLeft.x - bobX,
      fistRestPosLeft.y + bobY,
      fistRestPosLeft.z
    );
  }
}

// ── Tahap 12: Fist Punch Action ────────────────────────────
function doFistPunch() {
  if (!isPointerLocked || isReloading) return;

  const weapon = getCurrentWeapon();
  if (!weapon || weapon.data.type !== 'fist') return;

  // Check fire rate
  const now = performance.now() / 1000;
  const fireInterval = 1.0 / (weapon.data.rate || CONFIG.fistRate);
  if (now - lastShotTime < fireInterval) return;

  // Alternate left/right punches
  fistSide = fistSide === 'right' ? 'left' : 'right';

  // Start punch animation
  isFistPunching = true;
  fistPunchPhase = 'punch';
  fistPunchTimer = CONFIG.fistPunchDuration;

  // Apply recoil
  recoilOffset = Math.min(recoilOffset + 0.05, 1.0);
  shootCooldown = 0.15;

  // BUG FIX: Use cone-based hit detection for easier aiming
  // Instead of a single ray, cast multiple rays in a cone
  const meleeRange = weapon.data.range || CONFIG.fistRange;
  const hitAngle = CONFIG.fistHitAngle || 0.3;
  let hitSomething = false;

  // Cast 5 rays in a cross pattern + center
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
  const up = new THREE.Vector3().crossVectors(right, dir).normalize();

  const rayDirections = [
    dir.clone(), // Center
    dir.clone().addScaledVector(right, Math.tan(hitAngle)).normalize(), // Right
    dir.clone().addScaledVector(right, -Math.tan(hitAngle)).normalize(), // Left
    dir.clone().addScaledVector(up, Math.tan(hitAngle)).normalize(), // Up
    dir.clone().addScaledVector(up, -Math.tan(hitAngle)).normalize(), // Down
  ];

  const collidableMeshes = [];
  scene.traverse((obj) => {
    if (obj.userData && obj.userData.collidable && obj.isMesh) {
      collidableMeshes.push(obj);
    }
  });

  for (const rayDir of rayDirections) {
    const raycaster = new THREE.Raycaster();
    raycaster.set(camera.position, rayDir);
    raycaster.far = meleeRange;

    const intersects = raycaster.intersectObjects(collidableMeshes, false);
    if (intersects.length > 0 && !hitSomething) {
      hitSomething = true;
      const hit = intersects[0];
      // Show HUD hit marker
      if (hitMarkerEl) {
        hitMarkerEl.classList.add('active');
        setTimeout(() => { if (hitMarkerEl) hitMarkerEl.classList.remove('active'); }, 200);
      }
      // Create fist impact visual
      createMeleeImpact(hit.point, hit.object);
    }
  }

  lastShotTime = now;
  updateWeaponHud();
}



// ══════════════════════════════════════════════════════════════
//  TAHAP 13: KNIFE / MELEE WEAPON VISUAL & MECHANICS
// ══════════════════════════════════════════════════════════════

function createKnifeVisual() {
  // Create a tactical knife model — improved for better recognition
  knifeGroup = new THREE.Group();
  knifeGroup.name = 'knife';

  // Blade material — bright silver/steel with emissive for visibility
  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0xe8e8e8,
    roughness: 0.15,
    metalness: 0.95,
    emissive: 0x444444,
    emissiveIntensity: 0.3,
  });
  // Handle material — dark rubber with grip
  const handleMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 0.95,
    metalness: 0.05,
  });
  // Guard material — dark steel, more prominent
  const guardMat = new THREE.MeshStandardMaterial({
    color: 0x555555,
    roughness: 0.25,
    metalness: 0.85,
  });
  // Edge material — bright white edge, very visible
  const edgeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.05,
    metalness: 0.98,
    emissive: 0x888888,
    emissiveIntensity: 0.5,
  });
  // Belly curve material — slightly darker for blade belly
  const bellyMat = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    roughness: 0.2,
    metalness: 0.9,
    emissive: 0x222222,
    emissiveIntensity: 0.15,
  });

  // Blade — main body (thinner for more realistic blade profile)
  const bladeGeo = new THREE.BoxGeometry(0.05, 0.28, 0.010);
  const blade = new THREE.Mesh(bladeGeo, bladeMat);
  blade.position.y = 0.23;
  blade.name = 'blade';
  knifeGroup.add(blade);

  // Blade belly (slight curve — wider at middle, giving the blade a belly shape)
  const bellyGeo = new THREE.BoxGeometry(0.053, 0.12, 0.010);
  const belly = new THREE.Mesh(bellyGeo, bellyMat);
  belly.position.set(0.003, 0.30, 0);
  belly.name = 'belly';
  knifeGroup.add(belly);

  // Blade tip — pointed cone (thinner)
  const tipGeo = new THREE.ConeGeometry(0.022, 0.10, 4);
  const tip = new THREE.Mesh(tipGeo, bladeMat);
  tip.position.y = 0.42;
  tip.rotation.y = Math.PI / 4;
  tip.name = 'tip';
  knifeGroup.add(tip);

  // Blade edge (sharp edge — BRIGHT white line along one side, very visible)
  const edgeGeo = new THREE.BoxGeometry(0.005, 0.30, 0.012);
  const edge = new THREE.Mesh(edgeGeo, edgeMat);
  edge.position.set(0.026, 0.23, 0);
  edge.name = 'edge';
  knifeGroup.add(edge);

  // Edge highlight on belly section (extra bright)
  const edgeBellyGeo = new THREE.BoxGeometry(0.006, 0.12, 0.012);
  const edgeBelly = new THREE.Mesh(edgeBellyGeo, edgeMat);
  edgeBelly.position.set(0.029, 0.30, 0);
  edgeBelly.name = 'edge_belly';
  knifeGroup.add(edgeBelly);

  // Spine (back of blade — darker, thicker for visibility)
  const spineGeo = new THREE.BoxGeometry(0.005, 0.28, 0.012);
  const spine = new THREE.Mesh(spineGeo, guardMat);
  spine.position.set(-0.026, 0.23, 0);
  spine.name = 'spine';
  knifeGroup.add(spine);

  // Blood groove (central line on blade — deeper looking)
  const grooveGeo = new THREE.BoxGeometry(0.002, 0.22, 0.012);
  const groove = new THREE.Mesh(grooveGeo, new THREE.MeshStandardMaterial({
    color: 0x999999, roughness: 0.3, metalness: 0.7,
  }));
  groove.position.set(0, 0.23, 0);
  groove.name = 'groove';
  knifeGroup.add(groove);

  // Guard (cross guard — PROMINENT, wider and thicker)
  const guardGeo = new THREE.BoxGeometry(0.12, 0.025, 0.040);
  const guard = new THREE.Mesh(guardGeo, guardMat);
  guard.position.y = 0.08;
  guard.name = 'guard';
  knifeGroup.add(guard);

  // Guard front lip (extra detail on guard)
  const guardFrontGeo = new THREE.BoxGeometry(0.12, 0.012, 0.008);
  const guardFront = new THREE.Mesh(guardFrontGeo, new THREE.MeshStandardMaterial({
    color: 0x444444, roughness: 0.2, metalness: 0.9,
  }));
  guardFront.position.set(0, 0.09, 0.018);
  guardFront.name = 'guard_front';
  knifeGroup.add(guardFront);

  // Handle — grip with ridges (slightly thicker for better grip)
  const handleGeo = new THREE.BoxGeometry(0.04, 0.14, 0.028);
  const handle = new THREE.Mesh(handleGeo, handleMat);
  handle.position.y = 0.0;
  handle.name = 'handle';
  knifeGroup.add(handle);

  // Handle grip ridges (7 ridges for better texture)
  for (let i = 0; i < 7; i++) {
    const ridgeGeo = new THREE.BoxGeometry(0.044, 0.004, 0.030);
    const ridge = new THREE.Mesh(ridgeGeo, new THREE.MeshStandardMaterial({
      color: 0x1a1a1a, roughness: 0.98, metalness: 0.02,
    }));
    ridge.position.y = -0.06 + i * 0.02;
    ridge.name = 'ridge_' + i;
    knifeGroup.add(ridge);
  }

  // Handle side grooves (2 grooves on each side for grip detail)
  for (let side = -1; side <= 1; side += 2) {
    const sideGrooveGeo = new THREE.BoxGeometry(0.002, 0.10, 0.024);
    const sideGroove = new THREE.Mesh(sideGrooveGeo, new THREE.MeshStandardMaterial({
      color: 0x151515, roughness: 0.98, metalness: 0.02,
    }));
    sideGroove.position.set(side * 0.021, -0.01, 0);
    sideGroove.name = 'side_groove_' + side;
    knifeGroup.add(sideGroove);
  }

  // Pommel (bottom of handle — slightly larger)
  const pommelGeo = new THREE.BoxGeometry(0.048, 0.022, 0.032);
  const pommel = new THREE.Mesh(pommelGeo, guardMat);
  pommel.position.y = -0.08;
  pommel.name = 'pommel';
  knifeGroup.add(pommel);

  // Position knife so blade tip points FORWARD (toward negative Z in camera space)
  // The blade is built along +Y (tip at top, edge at +X side)
  // Rotate X by ~-PI/2 to make blade point forward, with the SHARP EDGE (+X side) facing forward
  // The edge is at +X — when we rotate X by -PI/2, the +X side faces the camera direction
  // Adding slight Z rotation tilts the blade so the edge leads the slash
  knifeGroup.position.set(0.30, -0.28, -0.40);
  knifeGroup.rotation.set(-1.35, -0.15, 0.25); // Blade tip forward, edge slightly angled for slash
  knifeGroup.visible = false; // Hidden until knife is equipped

  camera.add(knifeGroup);
}

function updateKnife(deltaTime) {
  if (!knifeGroup) return;

  const weapon = getCurrentWeapon();
  const isKnifeWeapon = weapon && (weapon.data.type === 'melee');

  // Show/hide knife based on current weapon
  if (isKnifeWeapon) {
    knifeGroup.visible = true;
  } else {
    knifeGroup.visible = false;
    isKnifeSlashing = false;
    knifeSlashPhase = 'idle';
    return;
  }

  // Knife slash animation
  if (isKnifeSlashing) {
    knifeSlashTimer -= deltaTime;

    if (knifeSlashPhase === 'swing') {
      // Blade edge leads the slash — the sharp edge (the +X side of the blade) sweeps forward
      // The knife is held with blade tip pointing forward (-Z in camera space)
      // The edge is on the +X side, so we rotate Z to make the edge sweep forward
      // During the slash: the blade edge (sharp side) moves forward and across
      const t = 1 - (knifeSlashTimer / CONFIG.knifeSwingDuration);
      const easedT = 1 - Math.pow(1 - t, 2); // Ease-out
      const swingAngle = easedT * CONFIG.knifeSwingAngle;

      // Rotate Z to make the blade edge (sharp side) sweep forward — this is the key fix
      // Positive Z rotation tilts the blade so the edge side leads the slash
      knifeGroup.rotation.z = 0.25 + easedT * 0.8; // Edge sweeps forward
      // Rotate Y for horizontal slash arc
      knifeGroup.rotation.y = -0.15 + swingAngle * 0.5;
      // Move knife forward (blade thrusts forward)
      knifeGroup.position.z = -0.40 - easedT * 0.20;
      // Slight downward arc
      knifeGroup.position.y = -0.28 - easedT * 0.05;
      // Slight X rotation adjustment for slash arc feel
      knifeGroup.rotation.x = -1.35 + easedT * 0.2;

      if (knifeSlashTimer <= 0) {
        knifeSlashPhase = 'return';
        knifeSlashTimer = CONFIG.knifeReturnDuration;
      }
    } else if (knifeSlashPhase === 'return') {
      // Return knife to rest position
      const t = 1 - (knifeSlashTimer / CONFIG.knifeReturnDuration);
      const easedT = t * t; // Ease-in

      knifeGroup.rotation.y = -0.15 + (1 - easedT) * CONFIG.knifeSwingAngle * 0.15;
      knifeGroup.rotation.z = 0.25 + (1 - easedT) * 0.3;
      knifeGroup.position.z = -0.40;
      knifeGroup.position.y = -0.28;
      knifeGroup.rotation.x = -1.35;

      if (knifeSlashTimer <= 0) {
        isKnifeSlashing = false;
        knifeSlashPhase = 'idle';
        // Reset to rest position
        knifeGroup.position.set(0.30, -0.28, -0.40);
        knifeGroup.rotation.set(-1.35, -0.15, 0.25);
      }
    }
  }

  // Idle animation: slight knife sway
  if (!isKnifeSlashing) {
    const swayTime = performance.now() / 1000;
    const swayY = Math.sin(swayTime * 1.5) * 0.004;
    const swayX = Math.cos(swayTime * 1.2) * 0.003;
    knifeGroup.position.y = -0.28 + swayY;
    knifeGroup.position.x = 0.30 + swayX;
  }
}

function doKnifeSlash() {
  if (!isPointerLocked || isReloading) return;

  const weapon = getCurrentWeapon();
  if (!weapon || weapon.data.type !== 'melee') return;

  // Check fire rate
  const now = performance.now() / 1000;
  const fireInterval = 1.0 / (weapon.data.rate || CONFIG.knifeRate);
  if (now - lastShotTime < fireInterval) return;

  // Start slash animation
  isKnifeSlashing = true;
  knifeSlashPhase = 'swing';
  knifeSlashTimer = CONFIG.knifeSwingDuration;

  // Apply recoil
  recoilOffset = Math.min(recoilOffset + 0.08, 1.0);
  shootCooldown = 0.2;

  // Knife hit detection — cone-based like fist but wider
  const meleeRange = weapon.data.range || CONFIG.knifeRange;
  const hitAngle = 0.5; // Wider cone for knife slash
  let hitSomething = false;

  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
  const up = new THREE.Vector3().crossVectors(right, dir).normalize();

  // Cast 7 rays for knife slash (wider than fist)
  const rayDirections = [
    dir.clone(), // Center
    dir.clone().addScaledVector(right, Math.tan(hitAngle)).normalize(),
    dir.clone().addScaledVector(right, -Math.tan(hitAngle)).normalize(),
    dir.clone().addScaledVector(up, Math.tan(hitAngle)).normalize(),
    dir.clone().addScaledVector(up, -Math.tan(hitAngle)).normalize(),
    dir.clone().addScaledVector(right, Math.tan(hitAngle * 0.5)).addScaledVector(up, Math.tan(hitAngle * 0.5)).normalize(),
    dir.clone().addScaledVector(right, -Math.tan(hitAngle * 0.5)).addScaledVector(up, -Math.tan(hitAngle * 0.5)).normalize(),
  ];

  const collidableMeshes = [];
  scene.traverse((obj) => {
    if (obj.userData && obj.userData.collidable && obj.isMesh) {
      collidableMeshes.push(obj);
    }
  });

  for (const rayDir of rayDirections) {
    const raycaster = new THREE.Raycaster();
    raycaster.set(camera.position, rayDir);
    raycaster.far = meleeRange;

    const intersects = raycaster.intersectObjects(collidableMeshes, false);
    if (intersects.length > 0 && !hitSomething) {
      hitSomething = true;
      const hit = intersects[0];
      // Show HUD hit marker
      if (hitMarkerEl) {
        hitMarkerEl.classList.add('active');
        setTimeout(() => { if (hitMarkerEl) hitMarkerEl.classList.remove('active'); }, 200);
      }
      // Create knife slash impact visual
      createMeleeImpact(hit.point, hit.object);
    }
  }

  lastShotTime = now;
  updateWeaponHud();
}

// ══════════════════════════════════════════════════════════════
//  TAHAP 14: PISTOL & VARIANTS — VISUAL, RECOIL, SWITCHING
// ══════════════════════════════════════════════════════════════

function createPistolVisual() {
  // Create a pistol visual group attached to the camera
  // The current variant is determined by weaponInventory.slots[2]
  pistolGroup = new THREE.Group();
  pistolGroup.name = 'pistol';

  // Build the pistol model based on current variant
  buildPistolModel(pistolCurrentVariant);

  // Position pistol in bottom-right of camera view (held in right hand)
  pistolGroup.position.set(0.25, -0.25, -0.40);
  pistolGroup.rotation.set(0.1, -0.1, 0.0);
  pistolGroup.visible = false; // Hidden until pistol is equipped

  camera.add(pistolGroup);
}

function buildPistolModel(variant) {
  // Clear existing model
  while (pistolGroup.children.length > 0) {
    const child = pistolGroup.children[0];
    pistolGroup.remove(child);
    if (child.geometry) child.geometry.dispose();
    if (child.material) child.material.dispose();
  }

  // Common materials
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x333333, roughness: 0.3, metalness: 0.9,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x222222, roughness: 0.4, metalness: 0.8,
  });
  const gripMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a, roughness: 0.95, metalness: 0.05,
  });
  const slideMat = new THREE.MeshStandardMaterial({
    color: 0x444444, roughness: 0.25, metalness: 0.85,
  });
  const triggerMat = new THREE.MeshStandardMaterial({
    color: 0x555555, roughness: 0.5, metalness: 0.7,
  });

  if (variant === 'glock') {
    // Glock-17: compact, standard barrel, polymer frame — IMPROVED
    // Slide (top part — taller for visibility)
    const slideGeo = new THREE.BoxGeometry(0.04, 0.055, 0.25);
    const slide = new THREE.Mesh(slideGeo, slideMat);
    slide.position.set(0, 0.025, -0.05);
    slide.name = 'slide';
    pistolGroup.add(slide);

    // Slide top rail (subtle detail on top of slide)
    const slideRailGeo = new THREE.BoxGeometry(0.025, 0.005, 0.22);
    const slideRail = new THREE.Mesh(slideRailGeo, new THREE.MeshStandardMaterial({
      color: 0x555555, roughness: 0.2, metalness: 0.9,
    }));
    slideRail.position.set(0, 0.055, -0.06);
    slideRail.name = 'slide_rail';
    pistolGroup.add(slideRail);

    // Ejection port (right side of slide — rectangular opening)
    const ejectPortGeo = new THREE.BoxGeometry(0.006, 0.020, 0.04);
    const ejectPort = new THREE.Mesh(ejectPortGeo, new THREE.MeshStandardMaterial({
      color: 0x111111, roughness: 0.8, metalness: 0.3,
    }));
    ejectPort.position.set(0.022, 0.03, 0.02);
    ejectPort.name = 'ejection_port';
    pistolGroup.add(ejectPort);

    // Slide serrations (4 grooves on the back of the slide)
    for (let s = 0; s < 4; s++) {
      const serrationGeo = new THREE.BoxGeometry(0.042, 0.004, 0.006);
      const serration = new THREE.Mesh(serrationGeo, new THREE.MeshStandardMaterial({
        color: 0x333333, roughness: 0.4, metalness: 0.8,
      }));
      serration.position.set(0, 0.025, 0.04 + s * 0.012);
      serration.name = 'serration_' + s;
      pistolGroup.add(serration);
    }

    // Barrel (extends from front of slide — more visible)
    const barrelGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.06, 8);
    const barrel = new THREE.Mesh(barrelGeo, metalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.025, -0.20);
    barrel.name = 'barrel';
    pistolGroup.add(barrel);

    // Barrel bore (dark hole at the front)
    const boreGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.01, 8);
    const bore = new THREE.Mesh(boreGeo, new THREE.MeshStandardMaterial({
      color: 0x050505, roughness: 0.9, metalness: 0.1,
    }));
    bore.rotation.x = Math.PI / 2;
    bore.position.set(0, 0.025, -0.23);
    bore.name = 'bore';
    pistolGroup.add(bore);

    // Frame (lower part — grip area)
    const frameGeo = new THREE.BoxGeometry(0.038, 0.035, 0.18);
    const frame = new THREE.Mesh(frameGeo, darkMetalMat);
    frame.position.set(0, -0.01, -0.02);
    frame.name = 'frame';
    pistolGroup.add(frame);

    // Grip (angled handle — more angled and textured)
    const gripGeo = new THREE.BoxGeometry(0.035, 0.12, 0.04);
    const grip = new THREE.Mesh(gripGeo, gripMat);
    grip.position.set(0, -0.08, 0.06);
    grip.rotation.x = 0.30;
    grip.name = 'grip';
    pistolGroup.add(grip);

    // Grip texture ridges (3 horizontal lines on grip)
    for (let g = 0; g < 3; g++) {
      const gripRidgeGeo = new THREE.BoxGeometry(0.037, 0.003, 0.042);
      const gripRidge = new THREE.Mesh(gripRidgeGeo, new THREE.MeshStandardMaterial({
        color: 0x0a0a0a, roughness: 0.98, metalness: 0.02,
      }));
      gripRidge.position.set(0, -0.06 + g * 0.025, 0.06);
      gripRidge.rotation.x = 0.30;
      gripRidge.name = 'grip_ridge_' + g;
      pistolGroup.add(gripRidge);
    }

    // Trigger guard — U-shaped (front, bottom, and back pieces)
    // Front piece
    const guardFrontGeo = new THREE.BoxGeometry(0.032, 0.008, 0.008);
    const guardFront = new THREE.Mesh(guardFrontGeo, darkMetalMat);
    guardFront.position.set(0, -0.035, -0.015);
    guardFront.name = 'trigger_guard_front';
    pistolGroup.add(guardFront);
    // Bottom piece (horizontal)
    const guardBottomGeo = new THREE.BoxGeometry(0.032, 0.008, 0.055);
    const guardBottom = new THREE.Mesh(guardBottomGeo, darkMetalMat);
    guardBottom.position.set(0, -0.04, 0.01);
    guardBottom.name = 'trigger_guard_bottom';
    pistolGroup.add(guardBottom);
    // Back piece
    const guardBackGeo = new THREE.BoxGeometry(0.032, 0.008, 0.008);
    const guardBack = new THREE.Mesh(guardBackGeo, darkMetalMat);
    guardBack.position.set(0, -0.035, 0.035);
    guardBack.name = 'trigger_guard_back';
    pistolGroup.add(guardBack);

    // Trigger
    const triggerGeo = new THREE.BoxGeometry(0.008, 0.025, 0.008);
    const trigger = new THREE.Mesh(triggerGeo, triggerMat);
    trigger.position.set(0, -0.025, -0.005);
    trigger.rotation.x = 0.2;
    trigger.name = 'trigger';
    pistolGroup.add(trigger);

    // Front sight
    const fSightGeo = new THREE.BoxGeometry(0.006, 0.018, 0.006);
    const fSight = new THREE.Mesh(fSightGeo, metalMat);
    fSight.position.set(0, 0.058, -0.16);
    fSight.name = 'front_sight';
    pistolGroup.add(fSight);

    // Rear sight
    const rSightGeo = new THREE.BoxGeometry(0.025, 0.014, 0.006);
    const rSight = new THREE.Mesh(rSightGeo, metalMat);
    rSight.position.set(0, 0.057, 0.05);
    rSight.name = 'rear_sight';
    pistolGroup.add(rSight);

  } else if (variant === 'revolver') {
    // Revolver: bigger, shorter barrel, prominent cylinder — IMPROVED
    // Barrel (shorter, thicker)
    const barrelGeo = new THREE.BoxGeometry(0.04, 0.04, 0.14);
    const barrel = new THREE.Mesh(barrelGeo, slideMat);
    barrel.position.set(0, 0.02, -0.06);
    barrel.name = 'barrel';
    pistolGroup.add(barrel);

    // Barrel bore (dark hole at the front)
    const boreGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.01, 8);
    const bore = new THREE.Mesh(boreGeo, new THREE.MeshStandardMaterial({
      color: 0x050505, roughness: 0.9, metalness: 0.1,
    }));
    bore.rotation.x = Math.PI / 2;
    bore.position.set(0, 0.02, -0.14);
    bore.name = 'bore';
    pistolGroup.add(bore);

    // Barrel top rib (flat rail on top of barrel)
    const ribGeo = new THREE.BoxGeometry(0.015, 0.008, 0.14);
    const rib = new THREE.Mesh(ribGeo, new THREE.MeshStandardMaterial({
      color: 0x555555, roughness: 0.3, metalness: 0.85,
    }));
    rib.position.set(0, 0.042, -0.06);
    rib.name = 'rib';
    pistolGroup.add(rib);

    // Cylinder (revolving chamber — MUCH BIGGER, the key visual feature)
    const cylinderGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.06, 12);
    const cylinder = new THREE.Mesh(cylinderGeo, metalMat);
    cylinder.rotation.z = Math.PI / 2;
    cylinder.position.set(0, 0.01, 0.02);
    cylinder.name = 'cylinder';
    pistolGroup.add(cylinder);

    // Cylinder chambers (6 clearly visible holes — BIGGER)
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const chamberGeo = new THREE.CylinderGeometry(0.010, 0.010, 0.062, 6);
      const chamber = new THREE.Mesh(chamberGeo, darkMetalMat);
      chamber.rotation.z = Math.PI / 2;
      chamber.position.set(
        Math.cos(angle) * 0.025,
        0.01 + Math.sin(angle) * 0.025,
        0.02
      );
      chamber.name = 'chamber_' + i;
      pistolGroup.add(chamber);
    }

    // Cylinder front face ring (visible detail)
    const cylFrontGeo = new THREE.RingGeometry(0.030, 0.038, 12);
    const cylFront = new THREE.Mesh(cylFrontGeo, new THREE.MeshStandardMaterial({
      color: 0x444444, roughness: 0.3, metalness: 0.85, side: THREE.DoubleSide,
    }));
    cylFront.rotation.y = Math.PI / 2;
    cylFront.position.set(-0.032, 0.01, 0.02);
    cylFront.name = 'cylinder_front';
    pistolGroup.add(cylFront);

    // Frame (top strap over cylinder)
    const frameGeo = new THREE.BoxGeometry(0.04, 0.015, 0.12);
    const frame = new THREE.Mesh(frameGeo, darkMetalMat);
    frame.position.set(0, 0.04, -0.01);
    frame.name = 'frame';
    pistolGroup.add(frame);

    // Grip (larger, wooden style — more brown and textured)
    const gripGeo = new THREE.BoxGeometry(0.042, 0.14, 0.05);
    const gripMat2 = new THREE.MeshStandardMaterial({ color: 0x4a2a0a, roughness: 0.75, metalness: 0.1 });
    const grip = new THREE.Mesh(gripGeo, gripMat2);
    grip.position.set(0, -0.09, 0.07);
    grip.rotation.x = 0.3;
    grip.name = 'grip';
    pistolGroup.add(grip);

    // Grip wood grain lines (3 lines for texture)
    for (let g = 0; g < 3; g++) {
      const grainGeo = new THREE.BoxGeometry(0.044, 0.003, 0.052);
      const grain = new THREE.Mesh(grainGeo, new THREE.MeshStandardMaterial({
        color: 0x3a1a05, roughness: 0.85, metalness: 0.05,
      }));
      grain.position.set(0, -0.05 + g * 0.03, 0.07);
      grain.rotation.x = 0.3;
      grain.name = 'grip_grain_' + g;
      pistolGroup.add(grain);
    }

    // Grip medallion (small circle on grip)
    const medallionGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.004, 8);
    const medallion = new THREE.Mesh(medallionGeo, new THREE.MeshStandardMaterial({
      color: 0xccaa44, roughness: 0.3, metalness: 0.9,
    }));
    medallion.rotation.z = Math.PI / 2;
    medallion.position.set(0.022, -0.07, 0.07);
    medallion.name = 'medallion';
    pistolGroup.add(medallion);

    // Trigger guard — U-shaped
    const guardFrontGeo = new THREE.BoxGeometry(0.035, 0.008, 0.008);
    const guardFront = new THREE.Mesh(guardFrontGeo, darkMetalMat);
    guardFront.position.set(0, -0.035, -0.005);
    guardFront.name = 'trigger_guard_front';
    pistolGroup.add(guardFront);
    const guardBottomGeo = new THREE.BoxGeometry(0.035, 0.008, 0.06);
    const guardBottom = new THREE.Mesh(guardBottomGeo, darkMetalMat);
    guardBottom.position.set(0, -0.04, 0.02);
    guardBottom.name = 'trigger_guard_bottom';
    pistolGroup.add(guardBottom);
    const guardBackGeo = new THREE.BoxGeometry(0.035, 0.008, 0.008);
    const guardBack = new THREE.Mesh(guardBackGeo, darkMetalMat);
    guardBack.position.set(0, -0.035, 0.045);
    guardBack.name = 'trigger_guard_back';
    pistolGroup.add(guardBack);

    // Trigger
    const triggerGeo = new THREE.BoxGeometry(0.008, 0.028, 0.008);
    const trigger = new THREE.Mesh(triggerGeo, triggerMat);
    trigger.position.set(0, -0.025, 0.005);
    trigger.rotation.x = 0.2;
    trigger.name = 'trigger';
    pistolGroup.add(trigger);

    // Hammer (at the back — BIGGER, more visible)
    const hammerHeadGeo = new THREE.BoxGeometry(0.015, 0.030, 0.015);
    const hammerHead = new THREE.Mesh(hammerHeadGeo, metalMat);
    hammerHead.position.set(0, 0.05, 0.07);
    hammerHead.name = 'hammer_head';
    pistolGroup.add(hammerHead);
    // Hammer spur (the part you pull back)
    const hammerSpurGeo = new THREE.BoxGeometry(0.012, 0.018, 0.020);
    const hammerSpur = new THREE.Mesh(hammerSpurGeo, new THREE.MeshStandardMaterial({
      color: 0x444444, roughness: 0.3, metalness: 0.85,
    }));
    hammerSpur.position.set(0, 0.06, 0.085);
    hammerSpur.name = 'hammer_spur';
    pistolGroup.add(hammerSpur);

  } else if (variant === 'deagle') {
    // Desert Eagle: BIGGEST, longest barrel, triangular slide — IMPROVED
    // Slide (large, triangular — wider at back, narrower at front)
    const slideGeo = new THREE.BoxGeometry(0.06, 0.06, 0.28);
    const slide = new THREE.Mesh(slideGeo, slideMat);
    slide.position.set(0, 0.03, -0.07);
    slide.name = 'slide';
    pistolGroup.add(slide);

    // Slide top (slightly narrower for triangular look)
    const slideTopGeo = new THREE.BoxGeometry(0.048, 0.015, 0.26);
    const slideTop = new THREE.Mesh(slideTopGeo, new THREE.MeshStandardMaterial({
      color: 0x555555, roughness: 0.2, metalness: 0.9,
    }));
    slideTop.position.set(0, 0.065, -0.07);
    slideTop.name = 'slide_top';
    pistolGroup.add(slideTop);

    // Slide serrations (5 grooves on the back — more for the big gun)
    for (let s = 0; s < 5; s++) {
      const serrationGeo = new THREE.BoxGeometry(0.062, 0.005, 0.008);
      const serration = new THREE.Mesh(serrationGeo, new THREE.MeshStandardMaterial({
        color: 0x333333, roughness: 0.4, metalness: 0.8,
      }));
      serration.position.set(0, 0.03, 0.04 + s * 0.013);
      serration.name = 'serration_' + s;
      pistolGroup.add(serration);
    }

    // Barrel (long, extends from slide)
    const barrelGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.10, 8);
    const barrel = new THREE.Mesh(barrelGeo, metalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.03, -0.26);
    barrel.name = 'barrel';
    pistolGroup.add(barrel);

    // Muzzle brake (at end of barrel — PROMINENT, distinctive)
    const muzzleGeo = new THREE.BoxGeometry(0.065, 0.05, 0.04);
    const muzzle = new THREE.Mesh(muzzleGeo, darkMetalMat);
    muzzle.position.set(0, 0.03, -0.29);
    muzzle.name = 'muzzle_brake';
    pistolGroup.add(muzzle);
    // Muzzle brake slots (2 horizontal cuts)
    for (let m = 0; m < 2; m++) {
      const slotGeo = new THREE.BoxGeometry(0.067, 0.006, 0.008);
      const slot = new THREE.Mesh(slotGeo, new THREE.MeshStandardMaterial({
        color: 0x111111, roughness: 0.8, metalness: 0.3,
      }));
      slot.position.set(0, 0.03 + (m === 0 ? 0.012 : -0.012), -0.29);
      slot.name = 'muzzle_slot_' + m;
      pistolGroup.add(slot);
    }

    // Barrel bore (dark hole at the front)
    const boreGeo = new THREE.CylinderGeometry(0.010, 0.010, 0.01, 8);
    const bore = new THREE.Mesh(boreGeo, new THREE.MeshStandardMaterial({
      color: 0x050505, roughness: 0.9, metalness: 0.1,
    }));
    bore.rotation.x = Math.PI / 2;
    bore.position.set(0, 0.03, -0.32);
    bore.name = 'bore';
    pistolGroup.add(bore);

    // Frame
    const frameGeo = new THREE.BoxGeometry(0.055, 0.045, 0.20);
    const frame = new THREE.Mesh(frameGeo, darkMetalMat);
    frame.position.set(0, -0.01, -0.03);
    frame.name = 'frame';
    pistolGroup.add(frame);

    // Grip (large, thick — VERY thick for the Deagle)
    const gripGeo = new THREE.BoxGeometry(0.050, 0.16, 0.055);
    const grip = new THREE.Mesh(gripGeo, gripMat);
    grip.position.set(0, -0.10, 0.06);
    grip.rotation.x = 0.2;
    grip.name = 'grip';
    pistolGroup.add(grip);

    // Grip texture ridges (4 lines for texture)
    for (let g = 0; g < 4; g++) {
      const gripRidgeGeo = new THREE.BoxGeometry(0.052, 0.004, 0.057);
      const gripRidge = new THREE.Mesh(gripRidgeGeo, new THREE.MeshStandardMaterial({
        color: 0x0a0a0a, roughness: 0.98, metalness: 0.02,
      }));
      gripRidge.position.set(0, -0.05 + g * 0.03, 0.06);
      gripRidge.rotation.x = 0.2;
      gripRidge.name = 'grip_ridge_' + g;
      pistolGroup.add(gripRidge);
    }

    // Trigger guard — U-shaped (wider for the big gun)
    const guardFrontGeo = new THREE.BoxGeometry(0.045, 0.008, 0.008);
    const guardFront = new THREE.Mesh(guardFrontGeo, darkMetalMat);
    guardFront.position.set(0, -0.038, -0.01);
    guardFront.name = 'trigger_guard_front';
    pistolGroup.add(guardFront);
    const guardBottomGeo = new THREE.BoxGeometry(0.045, 0.008, 0.06);
    const guardBottom = new THREE.Mesh(guardBottomGeo, darkMetalMat);
    guardBottom.position.set(0, -0.044, 0.015);
    guardBottom.name = 'trigger_guard_bottom';
    pistolGroup.add(guardBottom);
    const guardBackGeo = new THREE.BoxGeometry(0.045, 0.008, 0.008);
    const guardBack = new THREE.Mesh(guardBackGeo, darkMetalMat);
    guardBack.position.set(0, -0.038, 0.04);
    guardBack.name = 'trigger_guard_back';
    pistolGroup.add(guardBack);

    // Trigger
    const triggerGeo = new THREE.BoxGeometry(0.008, 0.028, 0.008);
    const trigger = new THREE.Mesh(triggerGeo, triggerMat);
    trigger.position.set(0, -0.025, 0.0);
    trigger.rotation.x = 0.2;
    trigger.name = 'trigger';
    pistolGroup.add(trigger);

    // Front sight
    const fSightGeo = new THREE.BoxGeometry(0.008, 0.020, 0.008);
    const fSight = new THREE.Mesh(fSightGeo, metalMat);
    fSight.position.set(0, 0.075, -0.20);
    fSight.name = 'front_sight';
    pistolGroup.add(fSight);

    // Rear sight
    const rSightGeo = new THREE.BoxGeometry(0.03, 0.016, 0.008);
    const rSight = new THREE.Mesh(rSightGeo, metalMat);
    rSight.position.set(0, 0.074, 0.06);
    rSight.name = 'rear_sight';
    pistolGroup.add(rSight);
  }
}

function updatePistol(deltaTime) {
  if (!pistolGroup) return;

  const weapon = getCurrentWeapon();
  const isPistolWeapon = weapon && (weapon.data.type === 'pistol');

  // Show/hide pistol based on current weapon
  if (isPistolWeapon) {
    pistolGroup.visible = true;

    // Check if the pistol variant changed (e.g., via Q sub-switch)
    const currentSlotId = weaponInventory.slots[2];
    if (currentSlotId !== pistolCurrentVariant) {
      pistolCurrentVariant = currentSlotId;
      buildPistolModel(pistolCurrentVariant);
    }
  } else {
    pistolGroup.visible = false;
    pistolRecoilOffset = 0;
    return;
  }

  // Pistol recoil animation
  if (pistolRecoilOffset > 0) {
    pistolRecoilOffset -= deltaTime * CONFIG.pistolRecoilRecovery;
    if (pistolRecoilOffset < 0) pistolRecoilOffset = 0;
  }

  // Apply recoil to pistol position
  const recoilAmount = pistolRecoilOffset;
  pistolGroup.position.z = -0.40 + recoilAmount * 0.08; // Kick back
  pistolGroup.position.y = -0.25 + recoilAmount * 0.02; // Kick up slightly
  pistolGroup.rotation.x = 0.1 + recoilAmount * 0.3;    // Tilt up

  // Idle animation: slight bob
  if (pistolRecoilOffset < 0.01) {
    pistolIdleTime += deltaTime;
    const bobY = Math.sin(pistolIdleTime * 2) * 0.003;
    const bobX = Math.cos(pistolIdleTime * 1.5) * 0.002;
    pistolGroup.position.y = -0.25 + bobY;
    pistolGroup.position.x = 0.25 + bobX;
    pistolGroup.rotation.x = 0.1;
    pistolGroup.position.z = -0.40;
  }
}

function cyclePistolVariant() {
  // Tahap 14: Sub-switch between pistol variants using Q key
  // v6: Only cycle through owned variants
  const owned = ownedVariants[2] || [];
  if (owned.length <= 1) return; // No other variants to switch to
  const currentIdx = owned.indexOf(pistolCurrentVariant);
  const nextIdx = (currentIdx + 1) % owned.length;
  const nextVariant = owned[nextIdx];

  // Update the inventory slot
  weaponInventory.slots[2] = nextVariant;
  pistolCurrentVariant = nextVariant;

  // Rebuild pistol model
  buildPistolModel(nextVariant);

  // Initialize ammo for new variant if not already done
  if (!weaponInventory.ammo[nextVariant]) {
    const wData = getWeaponById(nextVariant);
    if (wData && wData.magazine) {
      weaponInventory.ammo[nextVariant] = wData.magazine;
      weaponInventory.reserveAmmo[nextVariant] = wData.magazine * 3;
    }
  }

  // If we're already on pistol slot, switch to it
  if (weaponInventory.currentSlot === 2) {
    updateWeaponHud();
  }

  console.log('Switched pistol to: ' + nextVariant);
}


// ══════════════════════════════════════════════════════════════
//  TAHAP 15: SHOTGUN VISUAL & MECHANICS
// ══════════════════════════════════════════════════════════════

function createShotgunVisual() {
  // Create a tactical shotgun model — larger than pistol, wide barrel
  shotgunGroup = new THREE.Group();
  shotgunGroup.name = 'shotgun';

  // Build the default model
  buildShotgunModel(shotgunCurrentVariant);

  shotgunGroup.position.set(0.30, -0.30, -0.45);
  shotgunGroup.rotation.set(0.1, -0.1, 0.0);
  shotgunGroup.visible = false; // Hidden until shotgun is equipped

  camera.add(shotgunGroup);
}

function buildShotgunModel(variant) {
  // Clear existing model
  while (shotgunGroup.children.length > 0) {
    const child = shotgunGroup.children[0];
    shotgunGroup.remove(child);
    if (child.geometry) child.geometry.dispose();
    if (child.material) child.material.dispose();
  }

  // Materials — more detailed and realistic
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.25, metalness: 0.92 });
  const barrelMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.15, metalness: 0.98, emissive: 0x111111, emissiveIntensity: 0.05 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.75, metalness: 0.03 });
  const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x6B3410, roughness: 0.8, metalness: 0.02 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9, metalness: 0.05 });
  const sightMat = new THREE.MeshStandardMaterial({ color: 0xff4444, roughness: 0.5, metalness: 0.3, emissive: 0x441111, emissiveIntensity: 0.3 });
  const gripMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.95, metalness: 0.02 });
  const shellMat = new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.6, metalness: 0.1 }); // Red shell

  if (variant === 'pump_shotgun') {
    // ── PUMP SHOTGUN — Classic Remington 870 style ──
    // Long barrel, wooden stock + pump foregrip, visible magazine tube

    // === BARREL — Long, thick, dark steel ===
    const barrelGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.58, 10);
    const barrel = new THREE.Mesh(barrelGeo, barrelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.025, -0.24);
    barrel.name = 'barrel';
    shotgunGroup.add(barrel);

    // Barrel muzzle (slightly wider ring at the end)
    const muzzleGeo = new THREE.CylinderGeometry(0.020, 0.018, 0.02, 10);
    const muzzle = new THREE.Mesh(muzzleGeo, metalMat);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(0, 0.025, -0.53);
    shotgunGroup.add(muzzle);

    // Barrel bore (dark hole)
    const boreGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.01, 8);
    const bore = new THREE.Mesh(boreGeo, darkMat);
    bore.rotation.x = Math.PI / 2;
    bore.position.set(0, 0.025, -0.54);
    shotgunGroup.add(bore);

    // === MAGAZINE TUBE — Below barrel, thinner ===
    const magTubeGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.42, 8);
    const magTube = new THREE.Mesh(magTubeGeo, metalMat);
    magTube.rotation.x = Math.PI / 2;
    magTube.position.set(0, -0.005, -0.16);
    shotgunGroup.add(magTube);

    // Magazine cap (end of tube)
    const magCapGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.015, 8);
    const magCap = new THREE.Mesh(magCapGeo, metalMat);
    magCap.rotation.x = Math.PI / 2;
    magCap.position.set(0, -0.005, -0.38);
    shotgunGroup.add(magCap);

    // === RECEIVER — Main body, boxy ===
    const receiverGeo = new THREE.BoxGeometry(0.048, 0.048, 0.15);
    const receiver = new THREE.Mesh(receiverGeo, metalMat);
    receiver.position.set(0, 0.008, 0.02);
    shotgunGroup.add(receiver);

    // Receiver top (slight bevel)
    const receiverTopGeo = new THREE.BoxGeometry(0.045, 0.008, 0.14);
    const receiverTop = new THREE.Mesh(receiverTopGeo, metalMat);
    receiverTop.position.set(0, 0.034, 0.02);
    shotgunGroup.add(receiverTop);

    // Ejection port (right side — darker rectangle)
    const ejectGeo = new THREE.BoxGeometry(0.003, 0.018, 0.05);
    const eject = new THREE.Mesh(ejectGeo, darkMat);
    eject.position.set(0.025, 0.015, 0.0);
    shotgunGroup.add(eject);

    // === PUMP/FOREGRIP — Wooden, slides on magazine tube ===
    const pumpGeo = new THREE.BoxGeometry(0.052, 0.04, 0.12);
    const pump = new THREE.Mesh(pumpGeo, woodMat);
    pump.position.set(0, -0.002, -0.12);
    pump.name = 'pump';
    shotgunGroup.add(pump);

    // Pump grooves (horizontal ridges)
    for (let i = 0; i < 6; i++) {
      const grooveGeo = new THREE.BoxGeometry(0.054, 0.003, 0.004);
      const groove = new THREE.Mesh(grooveGeo, darkWoodMat);
      groove.position.set(0, -0.002, -0.16 + i * 0.014);
      shotgunGroup.add(groove);
    }

    // Pump front cap (ring around barrel)
    const pumpCapGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.015, 8);
    const pumpCap = new THREE.Mesh(pumpCapGeo, metalMat);
    pumpCap.rotation.x = Math.PI / 2;
    pumpCap.position.set(0, 0.005, -0.18);
    shotgunGroup.add(pumpCap);

    // === TRIGGER GUARD — Distinctive loop ===
    const guardFrontGeo = new THREE.BoxGeometry(0.012, 0.003, 0.018);
    const guardFront = new THREE.Mesh(guardFrontGeo, metalMat);
    guardFront.position.set(0, -0.022, 0.04);
    shotgunGroup.add(guardFront);

    const guardBottomGeo = new THREE.BoxGeometry(0.012, 0.003, 0.05);
    const guardBottom = new THREE.Mesh(guardBottomGeo, metalMat);
    guardBottom.position.set(0, -0.032, 0.065);
    shotgunGroup.add(guardBottom);

    const guardBackGeo = new THREE.BoxGeometry(0.012, 0.003, 0.018);
    const guardBack = new THREE.Mesh(guardBackGeo, metalMat);
    guardBack.position.set(0, -0.022, 0.09);
    shotgunGroup.add(guardBack);

    // Guard sides (connecting front to receiver)
    const guardSideLGeo = new THREE.BoxGeometry(0.003, 0.015, 0.003);
    const guardSideL = new THREE.Mesh(guardSideLGeo, metalMat);
    guardSideL.position.set(-0.006, -0.025, 0.045);
    shotgunGroup.add(guardSideL);
    const guardSideRGeo = new THREE.BoxGeometry(0.003, 0.015, 0.003);
    const guardSideR = new THREE.Mesh(guardSideRGeo, metalMat);
    guardSideR.position.set(0.006, -0.025, 0.045);
    shotgunGroup.add(guardSideR);

    // === TRIGGER ===
    const triggerGeo = new THREE.BoxGeometry(0.003, 0.014, 0.005);
    const trigger = new THREE.Mesh(triggerGeo, metalMat);
    trigger.position.set(0, -0.018, 0.065);
    shotgunGroup.add(trigger);

    // === STOCK — Wooden, classic style ===
    const stockGeo = new THREE.BoxGeometry(0.038, 0.052, 0.18);
    const stock = new THREE.Mesh(stockGeo, woodMat);
    stock.position.set(0, 0.005, 0.17);
    stock.name = 'stock';
    shotgunGroup.add(stock);

    // Stock grip (narrower, where hand holds)
    const stockGripGeo = new THREE.BoxGeometry(0.035, 0.045, 0.06);
    const stockGrip = new THREE.Mesh(stockGripGeo, darkWoodMat);
    stockGrip.position.set(0, -0.005, 0.12);
    shotgunGroup.add(stockGrip);

    // Stock butt (wider end)
    const buttGeo = new THREE.BoxGeometry(0.042, 0.058, 0.025);
    const butt = new THREE.Mesh(buttGeo, woodMat);
    butt.position.set(0, 0.002, 0.27);
    shotgunGroup.add(butt);

    // Butt plate (rubber pad)
    const buttPlateGeo = new THREE.BoxGeometry(0.044, 0.060, 0.005);
    const buttPlate = new THREE.Mesh(buttPlateGeo, gripMat);
    buttPlate.position.set(0, 0.002, 0.285);
    shotgunGroup.add(buttPlate);

    // === SIGHTS ===
    // Front bead sight (red)
    const beadGeo = new THREE.SphereGeometry(0.004, 6, 6);
    const bead = new THREE.Mesh(beadGeo, sightMat);
    bead.position.set(0, 0.042, -0.48);
    shotgunGroup.add(bead);

    // Rear sight (small notch)
    const rearSightGeo = new THREE.BoxGeometry(0.022, 0.008, 0.005);
    const rearSight = new THREE.Mesh(rearSightGeo, metalMat);
    rearSight.position.set(0, 0.038, -0.02);
    shotgunGroup.add(rearSight);

    // === SHELL — Visible in ejection port (adds realism) ===
    const shellGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.03, 6);
    const shell = new THREE.Mesh(shellGeo, shellMat);
    shell.position.set(0.026, 0.018, 0.02);
    shell.rotation.z = 0.3;
    shotgunGroup.add(shell);

  } else if (variant === 'auto_shotgun') {
    // ── AUTO (SEMI-AUTO) SHOTGUN — Modern tactical, like Benelli M4 ──
    // Shorter barrel, polymer stock, rail system, more aggressive look

    // === BARREL — Shorter, with heat shield ===
    const barrelGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.50, 10);
    const barrel = new THREE.Mesh(barrelGeo, barrelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.025, -0.20);
    barrel.name = 'barrel';
    shotgunGroup.add(barrel);

    // Barrel muzzle (wider, tactical)
    const muzzleGeo = new THREE.CylinderGeometry(0.022, 0.018, 0.025, 10);
    const muzzle = new THREE.Mesh(muzzleGeo, metalMat);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(0, 0.025, -0.46);
    shotgunGroup.add(muzzle);

    // Bore
    const boreGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.01, 8);
    const bore = new THREE.Mesh(boreGeo, darkMat);
    bore.rotation.x = Math.PI / 2;
    bore.position.set(0, 0.025, -0.48);
    shotgunGroup.add(bore);

    // === HEAT SHIELD — Tactical barrel shroud ===
    const shroudGeo = new THREE.CylinderGeometry(0.020, 0.020, 0.32, 8);
    const shroud = new THREE.Mesh(shroudGeo, metalMat);
    shroud.rotation.x = Math.PI / 2;
    shroud.position.set(0, 0.025, -0.12);
    shotgunGroup.add(shroud);

    // Shroud vents (4 slots)
    for (let i = 0; i < 4; i++) {
      const ventGeo = new THREE.BoxGeometry(0.003, 0.008, 0.025);
      const vent = new THREE.Mesh(ventGeo, darkMat);
      vent.position.set(0.022, 0.025, -0.22 + i * 0.06);
      shotgunGroup.add(vent);
    }

    // === RECEIVER — Tactical, boxy ===
    const receiverGeo = new THREE.BoxGeometry(0.050, 0.048, 0.15);
    const receiver = new THREE.Mesh(receiverGeo, metalMat);
    receiver.position.set(0, 0.008, 0.02);
    shotgunGroup.add(receiver);

    // === TOP RAIL — Picatinny-style ===
    const railGeo = new THREE.BoxGeometry(0.020, 0.006, 0.18);
    const rail = new THREE.Mesh(railGeo, metalMat);
    rail.position.set(0, 0.035, 0.0);
    shotgunGroup.add(rail);

    // Rail notches
    for (let i = 0; i < 9; i++) {
      const notchGeo = new THREE.BoxGeometry(0.020, 0.003, 0.002);
      const notch = new THREE.Mesh(notchGeo, darkMat);
      notch.position.set(0, 0.038, -0.07 + i * 0.018);
      shotgunGroup.add(notch);
    }

    // Ejection port
    const ejectGeo = new THREE.BoxGeometry(0.003, 0.018, 0.05);
    const eject = new THREE.Mesh(ejectGeo, darkMat);
    eject.position.set(0.026, 0.015, 0.0);
    shotgunGroup.add(eject);

    // === FOREGRIP — Polymer, modern ===
    const foregripGeo = new THREE.BoxGeometry(0.044, 0.042, 0.09);
    const foregrip = new THREE.Mesh(foregripGeo, gripMat);
    foregrip.position.set(0, -0.005, -0.06);
    foregrip.name = 'foregrip';
    shotgunGroup.add(foregrip);

    // Foregrip texture ridges
    for (let i = 0; i < 7; i++) {
      const ridgeGeo = new THREE.BoxGeometry(0.046, 0.003, 0.003);
      const ridge = new THREE.Mesh(ridgeGeo, darkMat);
      ridge.position.set(0, -0.005, -0.095 + i * 0.010);
      shotgunGroup.add(ridge);
    }

    // === TRIGGER GUARD ===
    const guardFrontGeo = new THREE.BoxGeometry(0.012, 0.003, 0.018);
    const guardFront = new THREE.Mesh(guardFrontGeo, metalMat);
    guardFront.position.set(0, -0.022, 0.04);
    shotgunGroup.add(guardFront);

    const guardBottomGeo = new THREE.BoxGeometry(0.012, 0.003, 0.05);
    const guardBottom = new THREE.Mesh(guardBottomGeo, metalMat);
    guardBottom.position.set(0, -0.032, 0.065);
    shotgunGroup.add(guardBottom);

    const guardBackGeo = new THREE.BoxGeometry(0.012, 0.003, 0.018);
    const guardBack = new THREE.Mesh(guardBackGeo, metalMat);
    guardBack.position.set(0, -0.022, 0.09);
    shotgunGroup.add(guardBack);

    // Guard sides
    const guardSideLGeo = new THREE.BoxGeometry(0.003, 0.015, 0.003);
    const guardSideL = new THREE.Mesh(guardSideLGeo, metalMat);
    guardSideL.position.set(-0.006, -0.025, 0.045);
    shotgunGroup.add(guardSideL);
    const guardSideRGeo = new THREE.BoxGeometry(0.003, 0.015, 0.003);
    const guardSideR = new THREE.Mesh(guardSideRGeo, metalMat);
    guardSideR.position.set(0.006, -0.025, 0.045);
    shotgunGroup.add(guardSideR);

    // === TRIGGER ===
    const triggerGeo = new THREE.BoxGeometry(0.003, 0.014, 0.005);
    const trigger = new THREE.Mesh(triggerGeo, metalMat);
    trigger.position.set(0, -0.018, 0.065);
    shotgunGroup.add(trigger);

    // === STOCK — Polymer, tactical, shorter ===
    const stockGeo = new THREE.BoxGeometry(0.036, 0.048, 0.14);
    const stock = new THREE.Mesh(stockGeo, gripMat);
    stock.position.set(0, 0.005, 0.15);
    stock.name = 'stock';
    shotgunGroup.add(stock);

    // Stock grip (narrower)
    const stockGripGeo = new THREE.BoxGeometry(0.033, 0.042, 0.05);
    const stockGrip = new THREE.Mesh(stockGripGeo, darkMat);
    stockGrip.position.set(0, -0.003, 0.11);
    shotgunGroup.add(stockGrip);

    // Stock butt (rubber pad)
    const buttGeo = new THREE.BoxGeometry(0.040, 0.052, 0.020);
    const butt = new THREE.Mesh(buttGeo, gripMat);
    butt.position.set(0, 0.003, 0.23);
    shotgunGroup.add(butt);

    // === SIGHTS ===
    // Front sight (tactical)
    const fSightGeo = new THREE.BoxGeometry(0.006, 0.014, 0.004);
    const fSight = new THREE.Mesh(fSightGeo, metalMat);
    fSight.position.set(0, 0.042, -0.42);
    shotgunGroup.add(fSight);

    // Rear sight (tactical)
    const rSightGeo = new THREE.BoxGeometry(0.020, 0.008, 0.004);
    const rSight = new THREE.Mesh(rSightGeo, metalMat);
    rSight.position.set(0, 0.038, 0.0);
    shotgunGroup.add(rSight);

    // === SHELL — Visible in ejection port ===
    const shellGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.03, 6);
    const shell = new THREE.Mesh(shellGeo, shellMat);
    shell.position.set(0.026, 0.018, 0.02);
    shell.rotation.z = 0.3;
    shotgunGroup.add(shell);
  }
}

function updateShotgun(deltaTime) {
  if (!shotgunGroup) return;

  const weapon = getCurrentWeapon();
  const isShotgunWeapon = weapon && (weapon.data.type === 'shotgun');

  // Show/hide shotgun based on current weapon
  if (isShotgunWeapon) {
    shotgunGroup.visible = true;

    // Check if the shotgun variant changed (via Q sub-switch)
    const currentSlotId = weaponInventory.slots[4];
    if (currentSlotId !== shotgunCurrentVariant) {
      shotgunCurrentVariant = currentSlotId;
      buildShotgunModel(shotgunCurrentVariant);
    }
  } else {
    shotgunGroup.visible = false;
    shotgunRecoilOffset = 0;
    shotgunPumpAnim = false;
    return;
  }

  // Shotgun recoil animation
  if (shotgunRecoilOffset > 0) {
    shotgunRecoilOffset -= deltaTime * CONFIG.shotgunRecoilRecovery;
    if (shotgunRecoilOffset < 0) shotgunRecoilOffset = 0;
  }

  // Pump animation for pump shotgun
  if (shotgunPumpAnim) {
    shotgunPumpTimer -= deltaTime;
    if (shotgunPumpTimer <= 0) {
      shotgunPumpAnim = false;
    }
  }

  // Apply recoil to shotgun position
  const recoilAmount = shotgunRecoilOffset;
  let pumpOffset = 0;
  if (shotgunPumpAnim && shotgunCurrentVariant === 'pump_shotgun') {
    // Pump slides back then forward
    const pumpT = 1 - (shotgunPumpTimer / CONFIG.shotgunPumpDelay);
    pumpOffset = Math.sin(pumpT * Math.PI) * 0.06; // Slide back then forward
  }

  shotgunGroup.position.z = -0.45 + recoilAmount * 0.12 + pumpOffset; // Kick back + pump
  shotgunGroup.position.y = -0.30 + recoilAmount * 0.03; // Kick up slightly
  shotgunGroup.rotation.x = 0.1 + recoilAmount * 0.4;    // Tilt up (more recoil than pistol)

  // Idle animation: slight bob
  if (shotgunRecoilOffset < 0.01 && !shotgunPumpAnim) {
    shotgunIdleTime += deltaTime;
    const bobY = Math.sin(shotgunIdleTime * 1.8) * 0.004;
    const bobX = Math.cos(shotgunIdleTime * 1.3) * 0.003;
    shotgunGroup.position.y = -0.30 + bobY;
    shotgunGroup.position.x = 0.30 + bobX;
    shotgunGroup.rotation.x = 0.1;
    shotgunGroup.position.z = -0.45;
  }
}

function cycleShotgunVariant() {
  // Tahap 15: Sub-switch between shotgun variants using Q key
  // v6: Only cycle through owned variants
  const owned = ownedVariants[4] || [];
  if (owned.length <= 1) return;
  const currentIdx = owned.indexOf(shotgunCurrentVariant);
  const nextIdx = (currentIdx + 1) % owned.length;
  const nextVariant = owned[nextIdx];

  // Update the inventory slot
  weaponInventory.slots[4] = nextVariant;
  shotgunCurrentVariant = nextVariant;

  // Rebuild shotgun model
  buildShotgunModel(nextVariant);

  // Initialize ammo for new variant if not already done
  if (!weaponInventory.ammo[nextVariant]) {
    const wData = getWeaponById(nextVariant);
    if (wData && wData.magazine) {
      weaponInventory.ammo[nextVariant] = wData.magazine;
      weaponInventory.reserveAmmo[nextVariant] = wData.magazine * 3;
    }
  }

  // If we're already on shotgun slot, switch to it
  if (weaponInventory.currentSlot === 4) {
    updateWeaponHud();
  }

  console.log('Switched shotgun to: ' + nextVariant);
}

// ══════════════════════════════════════════════════════════════
//  TAHAP 16: SNIPER RIFLE VISUAL & MECHANICS
// ══════════════════════════════════════════════════════════════

function createSniperVisual() {
  sniperGroup = new THREE.Group();
  sniperGroup.name = 'sniper';
  sniperGroup.visible = false;

  // Build the default sniper model
  buildSniperModel(sniperCurrentVariant);

  // Position: right side, lower (like holding a long rifle)
  sniperGroup.position.set(0.30, -0.32, -0.50);
  sniperGroup.rotation.set(0.08, -0.05, 0.0);

  camera.add(sniperGroup);
}

function buildSniperModel(variant) {
  // Clear existing children
  while (sniperGroup.children.length > 0) {
    const child = sniperGroup.children[0];
    sniperGroup.remove(child);
    if (child.geometry) child.geometry.dispose();
    if (child.material) child.material.dispose();
  }

  // Materials
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.3, metalness: 0.85 });
  const barrelMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.2, metalness: 0.9 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.8, metalness: 0.05 });
  const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x3d2510, roughness: 0.85, metalness: 0.05 });
  const scopeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.15, metalness: 0.95 });
  const scopeLensMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, roughness: 0.05, metalness: 0.3, emissive: 0x4488cc, emissiveIntensity: 0.2 });
  const gripMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.95, metalness: 0.05 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5, metalness: 0.3 });
  const sightMat = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 0.5 });

  if (variant === 'bolt_sniper') {
    // ── BOLT-ACTION SNIPER — Classic military, like L96/AWP ──
    // Very long barrel, prominent scope, wooden stock, bolt handle

    // === BARREL — Very long, thin, precision barrel ===
    const barrelGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.70, 10);
    const barrel = new THREE.Mesh(barrelGeo, barrelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.020, -0.30);
    barrel.name = 'barrel';
    sniperGroup.add(barrel);

    // Barrel muzzle (slight flare)
    const muzzleGeo = new THREE.CylinderGeometry(0.015, 0.012, 0.025, 10);
    const muzzle = new THREE.Mesh(muzzleGeo, metalMat);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(0, 0.020, -0.66);
    sniperGroup.add(muzzle);

    // Muzzle brake (suppressor-style, ridged)
    for (let i = 0; i < 5; i++) {
      const ridgeGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.004, 10);
      const ridge = new THREE.Mesh(ridgeGeo, metalMat);
      ridge.rotation.x = Math.PI / 2;
      ridge.position.set(0, 0.020, -0.63 + i * 0.008);
      sniperGroup.add(ridge);
    }

    // Bore (dark hole)
    const boreGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.01, 8);
    const bore = new THREE.Mesh(boreGeo, darkMat);
    bore.rotation.x = Math.PI / 2;
    bore.position.set(0, 0.020, -0.68);
    sniperGroup.add(bore);

    // === RECEIVER — Long, boxy action ===
    const receiverGeo = new THREE.BoxGeometry(0.040, 0.040, 0.18);
    const receiver = new THREE.Mesh(receiverGeo, metalMat);
    receiver.position.set(0, 0.008, 0.02);
    sniperGroup.add(receiver);

    // Receiver top rail (Picatinny for scope mount)
    const railGeo = new THREE.BoxGeometry(0.018, 0.006, 0.22);
    const rail = new THREE.Mesh(railGeo, metalMat);
    rail.position.set(0, 0.030, 0.0);
    sniperGroup.add(rail);

    // Rail notches
    for (let i = 0; i < 11; i++) {
      const notchGeo = new THREE.BoxGeometry(0.018, 0.003, 0.002);
      const notch = new THREE.Mesh(notchGeo, darkMat);
      notch.position.set(0, 0.033, -0.09 + i * 0.018);
      sniperGroup.add(notch);
    }

    // Ejection port (right side)
    const ejectGeo = new THREE.BoxGeometry(0.003, 0.016, 0.04);
    const eject = new THREE.Mesh(ejectGeo, darkMat);
    eject.position.set(0.022, 0.015, 0.0);
    sniperGroup.add(eject);

    // === BOLT HANDLE — The distinctive feature of bolt-action rifles ===
    // A small knob on the right side that the shooter pulls back
    const boltShaftGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.025, 6);
    const boltShaft = new THREE.Mesh(boltShaftGeo, metalMat);
    boltShaft.rotation.z = Math.PI / 2;
    boltShaft.position.set(0.025, 0.025, 0.02);
    sniperGroup.add(boltShaft);

    // Bolt knob (the ball at the end)
    const boltKnobGeo = new THREE.SphereGeometry(0.010, 8, 6);
    const boltKnob = new THREE.Mesh(boltKnobGeo, metalMat);
    boltKnob.position.set(0.038, 0.025, 0.02);
    boltKnob.name = 'bolt';
    sniperGroup.add(boltKnob);

    // === SCOPE — The most prominent feature of a sniper rifle ===
    // Large tube mounted on top of the receiver

    // Scope body (main tube)
    const scopeBodyGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.22, 12);
    const scopeBody = new THREE.Mesh(scopeBodyGeo, scopeMat);
    scopeBody.rotation.x = Math.PI / 2;
    scopeBody.position.set(0, 0.055, 0.0);
    scopeBody.name = 'scope';
    sniperGroup.add(scopeBody);

    // Scope objective lens (front, larger)
    const objLensGeo = new THREE.CylinderGeometry(0.022, 0.018, 0.02, 12);
    const objLens = new THREE.Mesh(objLensGeo, scopeMat);
    objLens.rotation.x = Math.PI / 2;
    objLens.position.set(0, 0.055, -0.12);
    sniperGroup.add(objLens);

    // Scope ocular lens (back, smaller)
    const ocLensGeo = new THREE.CylinderGeometry(0.016, 0.018, 0.015, 12);
    const ocLens = new THREE.Mesh(ocLensGeo, scopeMat);
    ocLens.rotation.x = Math.PI / 2;
    ocLens.position.set(0, 0.055, 0.11);
    sniperGroup.add(ocLens);

    // Scope lens (glass, front — blue tint)
    const lensFrontGeo = new THREE.CircleGeometry(0.020, 12);
    const lensFront = new THREE.Mesh(lensFrontGeo, scopeLensMat);
    lensFront.position.set(0, 0.055, -0.131);
    sniperGroup.add(lensFront);

    // Scope lens (glass, back — blue tint)
    const lensBackGeo = new THREE.CircleGeometry(0.014, 12);
    const lensBack = new THREE.Mesh(lensBackGeo, scopeLensMat);
    lensBack.position.set(0, 0.055, 0.118);
    lensBack.rotation.y = Math.PI;
    sniperGroup.add(lensBack);

    // Scope mount rings (2 rings connecting scope to rail)
    for (let r = 0; r < 2; r++) {
      const ringGeo = new THREE.TorusGeometry(0.020, 0.005, 6, 12);
      const ring = new THREE.Mesh(ringGeo, metalMat);
      ring.position.set(0, 0.055, -0.06 + r * 0.12);
      ring.rotation.x = Math.PI / 2;
      sniperGroup.add(ring);

      // Ring base (connects to rail)
      const baseGeo = new THREE.BoxGeometry(0.016, 0.015, 0.012);
      const base = new THREE.Mesh(baseGeo, metalMat);
      base.position.set(0, 0.042, -0.06 + r * 0.12);
      sniperGroup.add(base);
    }

    // Scope turrets (adjustment knobs on top and side)
    const turretTopGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.012, 8);
    const turretTop = new THREE.Mesh(turretTopGeo, metalMat);
    turretTop.position.set(0, 0.078, 0.0);
    sniperGroup.add(turretTop);

    const turretSideGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.010, 8);
    const turretSide = new THREE.Mesh(turretSideGeo, metalMat);
    turretSide.rotation.z = Math.PI / 2;
    turretSide.position.set(0.028, 0.055, 0.0);
    sniperGroup.add(turretSide);

    // === TRIGGER GUARD ===
    const guardFrontGeo = new THREE.BoxGeometry(0.010, 0.003, 0.015);
    const guardFront = new THREE.Mesh(guardFrontGeo, metalMat);
    guardFront.position.set(0, -0.020, 0.04);
    sniperGroup.add(guardFront);

    const guardBottomGeo = new THREE.BoxGeometry(0.010, 0.003, 0.04);
    const guardBottom = new THREE.Mesh(guardBottomGeo, metalMat);
    guardBottom.position.set(0, -0.030, 0.06);
    sniperGroup.add(guardBottom);

    const guardBackGeo = new THREE.BoxGeometry(0.010, 0.003, 0.015);
    const guardBack = new THREE.Mesh(guardBackGeo, metalMat);
    guardBack.position.set(0, -0.020, 0.08);
    sniperGroup.add(guardBack);

    // === TRIGGER ===
    const triggerGeo = new THREE.BoxGeometry(0.003, 0.012, 0.004);
    const trigger = new THREE.Mesh(triggerGeo, metalMat);
    trigger.position.set(0, -0.016, 0.06);
    sniperGroup.add(trigger);

    // === STOCK — Wooden, classic thumbhole style ===
    const stockGeo = new THREE.BoxGeometry(0.036, 0.052, 0.22);
    const stock = new THREE.Mesh(stockGeo, woodMat);
    stock.position.set(0, 0.005, 0.18);
    stock.name = 'stock';
    sniperGroup.add(stock);

    // Stock grip (narrower, angled)
    const stockGripGeo = new THREE.BoxGeometry(0.032, 0.048, 0.06);
    const stockGrip = new THREE.Mesh(stockGripGeo, darkWoodMat);
    stockGrip.position.set(0, -0.005, 0.12);
    sniperGroup.add(stockGrip);

    // Stock cheek rest (raised area on top of stock for aiming)
    const cheekGeo = new THREE.BoxGeometry(0.028, 0.012, 0.10);
    const cheek = new THREE.Mesh(cheekGeo, darkWoodMat);
    cheek.position.set(0, 0.032, 0.16);
    sniperGroup.add(cheek);

    // Stock butt (wider end)
    const buttGeo = new THREE.BoxGeometry(0.040, 0.058, 0.020);
    const butt = new THREE.Mesh(buttGeo, woodMat);
    butt.position.set(0, 0.002, 0.30);
    sniperGroup.add(butt);

    // Butt plate (rubber pad)
    const buttPlateGeo = new THREE.BoxGeometry(0.042, 0.060, 0.005);
    const buttPlate = new THREE.Mesh(buttPlateGeo, gripMat);
    buttPlate.position.set(0, 0.002, 0.312);
    sniperGroup.add(buttPlate);

    // === MAGAZINE — Detachable box magazine ===
    const magGeo = new THREE.BoxGeometry(0.024, 0.04, 0.035);
    const mag = new THREE.Mesh(magGeo, metalMat);
    mag.position.set(0, -0.025, 0.02);
    sniperGroup.add(mag);

    // Magazine floor plate
    const magFloorGeo = new THREE.BoxGeometry(0.026, 0.004, 0.037);
    const magFloor = new THREE.Mesh(magFloorGeo, darkMat);
    magFloor.position.set(0, -0.046, 0.02);
    sniperGroup.add(magFloor);

    // === SIGHTS ===
    // Front sight (flip-up,备用 — scope is primary)
    const fSightGeo = new THREE.BoxGeometry(0.004, 0.012, 0.003);
    const fSight = new THREE.Mesh(fSightGeo, metalMat);
    fSight.position.set(0, 0.035, -0.55);
    sniperGroup.add(fSight);

    // Rear sight (flip-up)
    const rSightGeo = new THREE.BoxGeometry(0.018, 0.008, 0.003);
    const rSight = new THREE.Mesh(rSightGeo, metalMat);
    rSight.position.set(0, 0.032, 0.08);
    sniperGroup.add(rSight);

  } else if (variant === 'semi_sniper') {
    // ── SEMI-AUTO SNIPER — Modern tactical, like M110/SR-25 ──
    // Shorter barrel, more modern look, polymer stock, rail system

    // === BARREL — Medium length, with suppressor ===
    const barrelGeo = new THREE.CylinderGeometry(0.013, 0.013, 0.55, 10);
    const barrel = new THREE.Mesh(barrelGeo, barrelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.020, -0.22);
    barrel.name = 'barrel';
    sniperGroup.add(barrel);

    // Suppressor (cylinder at end of barrel)
    const suppressorGeo = new THREE.CylinderGeometry(0.020, 0.018, 0.12, 10);
    const suppressor = new THREE.Mesh(suppressorGeo, metalMat);
    suppressor.rotation.x = Math.PI / 2;
    suppressor.position.set(0, 0.020, -0.52);
    sniperGroup.add(suppressor);

    // Suppressor ridges
    for (let i = 0; i < 6; i++) {
      const ridgeGeo = new THREE.CylinderGeometry(0.021, 0.021, 0.003, 10);
      const ridge = new THREE.Mesh(ridgeGeo, darkMat);
      ridge.rotation.x = Math.PI / 2;
      ridge.position.set(0, 0.020, -0.56 + i * 0.016);
      sniperGroup.add(ridge);
    }

    // Bore
    const boreGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.01, 8);
    const bore = new THREE.Mesh(boreGeo, darkMat);
    bore.rotation.x = Math.PI / 2;
    bore.position.set(0, 0.020, -0.59);
    sniperGroup.add(bore);

    // === RECEIVER — Modern, flat-top ===
    const receiverGeo = new THREE.BoxGeometry(0.042, 0.042, 0.16);
    const receiver = new THREE.Mesh(receiverGeo, metalMat);
    receiver.position.set(0, 0.008, 0.02);
    sniperGroup.add(receiver);

    // Full-length top rail (Picatinny)
    const railGeo = new THREE.BoxGeometry(0.020, 0.006, 0.30);
    const rail = new THREE.Mesh(railGeo, metalMat);
    rail.position.set(0, 0.031, -0.05);
    sniperGroup.add(rail);

    // Rail notches
    for (let i = 0; i < 15; i++) {
      const notchGeo = new THREE.BoxGeometry(0.020, 0.003, 0.002);
      const notch = new THREE.Mesh(notchGeo, darkMat);
      notch.position.set(0, 0.034, -0.18 + i * 0.024);
      sniperGroup.add(notch);
    }

    // Ejection port (right side)
    const ejectGeo = new THREE.BoxGeometry(0.003, 0.018, 0.05);
    const eject = new THREE.Mesh(ejectGeo, darkMat);
    eject.position.set(0.023, 0.015, 0.0);
    sniperGroup.add(eject);

    // Forward assist (left side, small bump)
    const assistGeo = new THREE.BoxGeometry(0.008, 0.012, 0.010);
    const assist = new THREE.Mesh(assistGeo, metalMat);
    assist.position.set(-0.024, 0.015, 0.03);
    sniperGroup.add(assist);

    // === CHARGING HANDLE — T-shaped, on top ===
    const chGeo = new THREE.BoxGeometry(0.025, 0.008, 0.006);
    const ch = new THREE.Mesh(chGeo, metalMat);
    ch.position.set(0, 0.038, 0.06);
    sniperGroup.add(ch);

    // === SCOPE — Shorter, modern tactical scope ===
    const scopeBodyGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.18, 12);
    const scopeBody = new THREE.Mesh(scopeBodyGeo, scopeMat);
    scopeBody.rotation.x = Math.PI / 2;
    scopeBody.position.set(0, 0.052, 0.0);
    scopeBody.name = 'scope';
    sniperGroup.add(scopeBody);

    // Scope objective lens (front)
    const objLensGeo = new THREE.CylinderGeometry(0.020, 0.016, 0.018, 12);
    const objLens = new THREE.Mesh(objLensGeo, scopeMat);
    objLens.rotation.x = Math.PI / 2;
    objLens.position.set(0, 0.052, -0.10);
    sniperGroup.add(objLens);

    // Scope ocular lens (back)
    const ocLensGeo = new THREE.CylinderGeometry(0.014, 0.016, 0.012, 12);
    const ocLens = new THREE.Mesh(ocLensGeo, scopeMat);
    ocLens.rotation.x = Math.PI / 2;
    ocLens.position.set(0, 0.052, 0.09);
    sniperGroup.add(ocLens);

    // Scope lens (glass, front)
    const lensFrontGeo = new THREE.CircleGeometry(0.018, 12);
    const lensFront = new THREE.Mesh(lensFrontGeo, scopeLensMat);
    lensFront.position.set(0, 0.052, -0.110);
    sniperGroup.add(lensFront);

    // Scope lens (glass, back)
    const lensBackGeo = new THREE.CircleGeometry(0.012, 12);
    const lensBack = new THREE.Mesh(lensBackGeo, scopeLensMat);
    lensBack.position.set(0, 0.052, 0.097);
    lensBack.rotation.y = Math.PI;
    sniperGroup.add(lensBack);

    // Scope mount rings
    for (let r = 0; r < 2; r++) {
      const ringGeo = new THREE.TorusGeometry(0.018, 0.004, 6, 12);
      const ring = new THREE.Mesh(ringGeo, metalMat);
      ring.position.set(0, 0.052, -0.05 + r * 0.10);
      ring.rotation.x = Math.PI / 2;
      sniperGroup.add(ring);

      const baseGeo = new THREE.BoxGeometry(0.016, 0.012, 0.010);
      const base = new THREE.Mesh(baseGeo, metalMat);
      base.position.set(0, 0.040, -0.05 + r * 0.10);
      sniperGroup.add(base);
    }

    // Scope turrets
    const turretTopGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.010, 8);
    const turretTop = new THREE.Mesh(turretTopGeo, metalMat);
    turretTop.position.set(0, 0.072, 0.0);
    sniperGroup.add(turretTop);

    // === TRIGGER GUARD ===
    const guardFrontGeo = new THREE.BoxGeometry(0.010, 0.003, 0.015);
    const guardFront = new THREE.Mesh(guardFrontGeo, metalMat);
    guardFront.position.set(0, -0.020, 0.04);
    sniperGroup.add(guardFront);

    const guardBottomGeo = new THREE.BoxGeometry(0.010, 0.003, 0.04);
    const guardBottom = new THREE.Mesh(guardBottomGeo, metalMat);
    guardBottom.position.set(0, -0.030, 0.06);
    sniperGroup.add(guardBottom);

    const guardBackGeo = new THREE.BoxGeometry(0.010, 0.003, 0.015);
    const guardBack = new THREE.Mesh(guardBackGeo, metalMat);
    guardBack.position.set(0, -0.020, 0.08);
    sniperGroup.add(guardBack);

    // === TRIGGER ===
    const triggerGeo = new THREE.BoxGeometry(0.003, 0.012, 0.004);
    const trigger = new THREE.Mesh(triggerGeo, metalMat);
    trigger.position.set(0, -0.016, 0.06);
    sniperGroup.add(trigger);

    // === STOCK — Polymer, modern adjustable ===
    const stockGeo = new THREE.BoxGeometry(0.034, 0.048, 0.16);
    const stock = new THREE.Mesh(stockGeo, gripMat);
    stock.position.set(0, 0.005, 0.16);
    stock.name = 'stock';
    sniperGroup.add(stock);

    // Stock grip (pistol grip, angled)
    const stockGripGeo = new THREE.BoxGeometry(0.030, 0.044, 0.04);
    const stockGrip = new THREE.Mesh(stockGripGeo, darkMat);
    stockGrip.position.set(0, -0.005, 0.11);
    sniperGroup.add(stockGrip);

    // Adjustable stock tube (visible behind receiver)
    const tubeGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.10, 8);
    const tube = new THREE.Mesh(tubeGeo, metalMat);
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0, 0.005, 0.22);
    sniperGroup.add(tube);

    // Stock butt (adjustable pad)
    const buttGeo = new THREE.BoxGeometry(0.036, 0.052, 0.015);
    const butt = new THREE.Mesh(buttGeo, gripMat);
    butt.position.set(0, 0.003, 0.28);
    sniperGroup.add(butt);

    // === MAGAZINE — Detachable box magazine ===
    const magGeo = new THREE.BoxGeometry(0.022, 0.04, 0.030);
    const mag = new THREE.Mesh(magGeo, metalMat);
    mag.position.set(0, -0.025, 0.02);
    sniperGroup.add(mag);

    // === HANDGUARD — Polymer, with rails ===
    const handguardGeo = new THREE.BoxGeometry(0.040, 0.038, 0.16);
    const handguard = new THREE.Mesh(handguardGeo, gripMat);
    handguard.position.set(0, 0.005, -0.10);
    sniperGroup.add(handguard);

    // Handguard side rails (2)
    for (let s = -1; s <= 1; s += 2) {
      const sideRailGeo = new THREE.BoxGeometry(0.003, 0.010, 0.12);
      const sideRail = new THREE.Mesh(sideRailGeo, metalMat);
      sideRail.position.set(s * 0.022, 0.005, -0.10);
      sniperGroup.add(sideRail);
    }

    // Handguard vents (4 slots on each side)
    for (let i = 0; i < 4; i++) {
      for (let s = -1; s <= 1; s += 2) {
        const ventGeo = new THREE.BoxGeometry(0.003, 0.006, 0.018);
        const vent = new THREE.Mesh(ventGeo, darkMat);
        vent.position.set(s * 0.022, 0.005, -0.16 + i * 0.04);
        sniperGroup.add(vent);
      }
    }

    // Bipod attachment point (small ring at front of handguard)
    const bipodGeo = new THREE.CylinderGeometry(0.010, 0.010, 0.006, 8);
    const bipod = new THREE.Mesh(bipodGeo, metalMat);
    bipod.rotation.x = Math.PI / 2;
    bipod.position.set(0, -0.012, -0.18);
    sniperGroup.add(bipod);
  }
}

function updateSniper(deltaTime) {
  if (!sniperGroup) return;

  const weapon = getCurrentWeapon();
  const isSniperWeapon = weapon && (weapon.data.type === 'sniper');

  // Show/hide sniper based on current weapon
  if (isSniperWeapon) {
    sniperGroup.visible = true;

    // Check if the sniper variant changed (via Q sub-switch)
    const currentSlotId = weaponInventory.slots[5];
    if (currentSlotId !== sniperCurrentVariant) {
      sniperCurrentVariant = currentSlotId;
      buildSniperModel(sniperCurrentVariant);
    }
  } else {
    sniperGroup.visible = false;
    sniperRecoilOffset = 0;
    sniperBoltAnim = false;
    // Unscope when switching away from sniper
    if (isSniperScoping) {
      isSniperScoping = false;
      targetFOV = CONFIG.cameraFOV;
    }
    return;
  }

  // Sniper recoil animation
  if (sniperRecoilOffset > 0) {
    sniperRecoilOffset -= deltaTime * CONFIG.sniperRecoilRecovery;
    if (sniperRecoilOffset < 0) sniperRecoilOffset = 0;
  }

  // Bolt animation for bolt-action sniper
  if (sniperBoltAnim) {
    sniperBoltTimer -= deltaTime;
    if (sniperBoltTimer <= 0) {
      sniperBoltAnim = false;
    }
  }

  // Apply recoil to sniper position
  const recoilAmount = sniperRecoilOffset;
  let boltOffset = 0;
  if (sniperBoltAnim && sniperCurrentVariant === 'bolt_sniper') {
    const boltT = 1 - (sniperBoltTimer / CONFIG.sniperBoltDelay);
    boltOffset = Math.sin(boltT * Math.PI) * 0.05; // Bolt pull back then forward
  }

  sniperGroup.position.z = -0.50 + recoilAmount * 0.15 + boltOffset;
  sniperGroup.position.y = -0.32 + recoilAmount * 0.04;
  sniperGroup.rotation.x = 0.08 + recoilAmount * 0.5; // Tilt up from recoil

  // Idle animation: slight bob
  if (sniperRecoilOffset < 0.01 && !sniperBoltAnim) {
    sniperIdleTime += deltaTime;
    const bobY = Math.sin(sniperIdleTime * 1.5) * 0.003;
    const bobX = Math.cos(sniperIdleTime * 1.1) * 0.002;
    sniperGroup.position.y = -0.32 + bobY;
    sniperGroup.position.x = 0.30 + bobX;
    sniperGroup.rotation.x = 0.08;
    sniperGroup.position.z = -0.50;
  }

  // Tahap 16: FOV transition for scope zoom
  if (isSniperScoping && currentFOV > targetFOV + 0.5) {
    currentFOV -= deltaTime * CONFIG.sniperScopeZoomSpeed * 5;
    if (currentFOV < targetFOV) currentFOV = targetFOV;
    camera.fov = currentFOV;
    camera.updateProjectionMatrix();
  } else if (!isSniperScoping && currentFOV < targetFOV - 0.5) {
    currentFOV += deltaTime * CONFIG.sniperScopeZoomSpeed * 5;
    if (currentFOV > targetFOV) currentFOV = targetFOV;
    camera.fov = currentFOV;
    camera.updateProjectionMatrix();
  }

  // Tahap 16: Scope overlay visibility
  if (scopeOverlayEl) {
    const isScoped = isSniperScoping && Math.abs(currentFOV - CONFIG.sniperScopeFOV) < 10;
    if (isScoped) {
      scopeOverlayEl.style.display = 'block';
    } else {
      scopeOverlayEl.style.display = 'none';
    }
  }
}


// ══════════════════════════════════════════════════════════════
//  TAHAP 16+: RIFLE / SMG VISUAL & MECHANICS
// ══════════════════════════════════════════════════════════════

function createRifleVisual() {
  // Create the rifle group
  rifleGroup = new THREE.Group();
  rifleGroup.name = 'rifle';

  const currentVariant = weaponInventory.slots[3] || 'assault_rifle';
  buildRifleModel(currentVariant);

  rifleGroup.position.set(0.30, -0.28, -0.45);
  rifleGroup.rotation.set(0.05, -0.15, 0.0);
  camera.add(rifleGroup);
  rifleGroup.visible = false;
}

function buildRifleModel(variantId) {
  // Clear existing children
  while (rifleGroup.children.length > 0) {
    const child = rifleGroup.children[0];
    rifleGroup.remove(child);
    if (child.geometry) child.geometry.dispose();
    if (child.material) child.material.dispose();
  }

  const isSMG = variantId === 'smg';

  // Materials
  const metalMat = new THREE.MeshPhongMaterial({ color: 0x2a2a2a, shininess: 60 });
  const darkMetalMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a, shininess: 40 });
  const gripMat = new THREE.MeshPhongMaterial({ color: 0x3a2a1a, shininess: 15 });
  const accentMat = new THREE.MeshPhongMaterial({ color: 0x444444, shininess: 30 });

  if (isSMG) {
    // ── SMG: MP5-style compact submachine gun ──
    // Key features: compact receiver, short barrel, curved magazine, 
    // HK-style drum sights, forward grip, retractable stock

    // Upper receiver (compact, slightly tapered)
    const upperReceiver = new THREE.Mesh(
      new THREE.BoxGeometry(0.030, 0.035, 0.18),
      metalMat
    );
    upperReceiver.position.set(0, 0.010, 0.01);
    rifleGroup.add(upperReceiver);

    // Lower receiver (trigger housing, slightly smaller)
    const lowerReceiver = new THREE.Mesh(
      new THREE.BoxGeometry(0.028, 0.025, 0.14),
      darkMetalMat
    );
    lowerReceiver.position.set(0, -0.015, 0.0);
    rifleGroup.add(lowerReceiver);

    // Top rail (Picatinny-style with ridges)
    const railBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.022, 0.008, 0.16),
      new THREE.MeshPhongMaterial({ color: 0x333333, shininess: 50 })
    );
    railBase.position.set(0, 0.030, 0.01);
    rifleGroup.add(railBase);

    // Rail ridges (detail)
    for (let r = -0.06; r <= 0.08; r += 0.014) {
      const ridge = new THREE.Mesh(
        new THREE.BoxGeometry(0.024, 0.004, 0.004),
        new THREE.MeshPhongMaterial({ color: 0x2a2a2a, shininess: 60 })
      );
      ridge.position.set(0, 0.035, r);
      rifleGroup.add(ridge);
    }

    // Front sight (HK drum-style)
    const frontSightPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.003, 0.003, 0.022, 6),
      darkMetalMat
    );
    frontSightPost.position.set(0, 0.043, 0.07);
    rifleGroup.add(frontSightPost);

    // Front sight ring (HK drum)
    const frontSightRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.008, 0.002, 6, 12),
      darkMetalMat
    );
    frontSightRing.position.set(0, 0.043, 0.07);
    frontSightRing.rotation.y = Math.PI / 2;
    rifleGroup.add(frontSightRing);

    // Rear sight (HK drum-style)
    const rearSightPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.003, 0.003, 0.018, 6),
      darkMetalMat
    );
    rearSightPost.position.set(0, 0.042, -0.05);
    rifleGroup.add(rearSightPost);

    // Rear sight aperture
    const rearSightAperture = new THREE.Mesh(
      new THREE.BoxGeometry(0.016, 0.016, 0.004),
      darkMetalMat
    );
    rearSightAperture.position.set(0, 0.042, -0.05);
    rifleGroup.add(rearSightAperture);

    // Barrel (short — SMG signature)
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, 0.10, 8),
      new THREE.MeshPhongMaterial({ color: 0x1a1a1a, shininess: 80 })
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.005, 0.14);
    rifleGroup.add(barrel);

    // Barrel with 3-lug muzzle (MP5 style)
    const muzzleLug1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.007, 0.015, 8),
      darkMetalMat
    );
    muzzleLug1.rotation.x = Math.PI / 2;
    muzzleLug1.position.set(0, 0.005, 0.19);
    rifleGroup.add(muzzleLug1);

    // Muzzle flash hider
    const flashHider = new THREE.Mesh(
      new THREE.CylinderGeometry(0.009, 0.007, 0.020, 8),
      new THREE.MeshPhongMaterial({ color: 0x111111, shininess: 90 })
    );
    flashHider.rotation.x = Math.PI / 2;
    flashHider.position.set(0, 0.005, 0.205);
    rifleGroup.add(flashHider);

    // Handguard (shorter, with ventilation)
    const handguard = new THREE.Mesh(
      new THREE.BoxGeometry(0.028, 0.035, 0.08),
      accentMat
    );
    handguard.position.set(0, 0.005, 0.08);
    rifleGroup.add(handguard);

    // Handguard ventilation holes (detail)
    for (let v = 0.05; v <= 0.11; v += 0.02) {
      const ventHole = new THREE.Mesh(
        new THREE.BoxGeometry(0.030, 0.006, 0.006),
        new THREE.MeshPhongMaterial({ color: 0x1a1a1a, shininess: 30 })
      );
      ventHole.position.set(0, -0.008, v);
      rifleGroup.add(ventHole);
    }

    // Vertical foregrip (SMG distinctive feature — angled)
    const foregripBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.016, 0.035, 0.020),
      gripMat
    );
    foregripBase.position.set(0, -0.035, 0.06);
    rifleGroup.add(foregripBase);

    // Foregrip finger groove
    const foregripGroove = new THREE.Mesh(
      new THREE.BoxGeometry(0.014, 0.020, 0.010),
      new THREE.MeshPhongMaterial({ color: 0x2a1a0a, shininess: 10 })
    );
    foregripGroove.position.set(0, -0.048, 0.06);
    rifleGroup.add(foregripGroove);

    // Magazine (curved — MP5 signature curved 9mm mag)
    const magUpper = new THREE.Mesh(
      new THREE.BoxGeometry(0.014, 0.04, 0.022),
      darkMetalMat
    );
    magUpper.position.set(0, -0.040, 0.02);
    rifleGroup.add(magUpper);

    // Magazine lower (curved forward)
    const magLower = new THREE.Mesh(
      new THREE.BoxGeometry(0.014, 0.06, 0.020),
      darkMetalMat
    );
    magLower.position.set(0, -0.080, 0.035);
    magLower.rotation.x = 0.15;
    rifleGroup.add(magLower);

    // Magazine base plate
    const magBasePlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.016, 0.006, 0.024),
      new THREE.MeshPhongMaterial({ color: 0x222222, shininess: 40 })
    );
    magBasePlate.position.set(0, -0.112, 0.042);
    magBasePlate.rotation.x = 0.15;
    rifleGroup.add(magBasePlate);

    // Trigger guard (curved)
    const triggerGuard = new THREE.Mesh(
      new THREE.BoxGeometry(0.010, 0.006, 0.040),
      darkMetalMat
    );
    triggerGuard.position.set(0, -0.030, -0.02);
    rifleGroup.add(triggerGuard);

    // Trigger
    const trigger = new THREE.Mesh(
      new THREE.BoxGeometry(0.004, 0.012, 0.006),
      new THREE.MeshPhongMaterial({ color: 0x222222, shininess: 50 })
    );
    trigger.position.set(0, -0.028, -0.02);
    rifleGroup.add(trigger);

    // Pistol grip (ergonomic, textured)
    const gripUpper = new THREE.Mesh(
      new THREE.BoxGeometry(0.020, 0.030, 0.022),
      gripMat
    );
    gripUpper.position.set(0, -0.035, -0.04);
    gripUpper.rotation.x = 0.15;
    rifleGroup.add(gripUpper);

    const gripLower = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, 0.035, 0.020),
      gripMat
    );
    gripLower.position.set(0, -0.055, -0.045);
    gripLower.rotation.x = 0.25;
    rifleGroup.add(gripLower);

    // Grip texture lines (detail)
    for (let g = -0.045; g <= -0.030; g += 0.005) {
      const gripLine = new THREE.Mesh(
        new THREE.BoxGeometry(0.021, 0.002, 0.023),
        new THREE.MeshPhongMaterial({ color: 0x2a1a0a, shininess: 8 })
      );
      gripLine.position.set(0, g, -0.042);
      gripLine.rotation.x = 0.20;
      rifleGroup.add(gripLine);
    }

    // Stock (MP5 retractable — collapsed position)
    const stockEndCap = new THREE.Mesh(
      new THREE.BoxGeometry(0.022, 0.035, 0.012),
      darkMetalMat
    );
    stockEndCap.position.set(0, 0.005, -0.10);
    rifleGroup.add(stockEndCap);

    // Stock buffer tube
    const stockTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, 0.08, 6),
      darkMetalMat
    );
    stockTube.rotation.x = Math.PI / 2;
    stockTube.position.set(0, 0.005, -0.14);
    rifleGroup.add(stockTube);

    // Stock butt (collapsed)
    const stockButt = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, 0.030, 0.025),
      accentMat
    );
    stockButt.position.set(0, 0.005, -0.17);
    rifleGroup.add(stockButt);

    // Stock butt pad
    const buttPad = new THREE.Mesh(
      new THREE.BoxGeometry(0.020, 0.032, 0.006),
      gripMat
    );
    buttPad.position.set(0, 0.005, -0.185);
    rifleGroup.add(buttPad);

    // Ejection port (right side detail)
    const ejectionPort = new THREE.Mesh(
      new THREE.BoxGeometry(0.003, 0.010, 0.018),
      new THREE.MeshPhongMaterial({ color: 0x0a0a0a, shininess: 100 })
    );
    ejectionPort.position.set(0.016, 0.005, -0.02);
    rifleGroup.add(ejectionPort);

    // Selector switch (left side)
    const selector = new THREE.Mesh(
      new THREE.CylinderGeometry(0.003, 0.003, 0.008, 6),
      new THREE.MeshPhongMaterial({ color: 0x333333, shininess: 60 })
    );
    selector.rotation.z = Math.PI / 2;
    selector.position.set(-0.016, 0.005, -0.04);
    rifleGroup.add(selector);

    // Charging handle (top)
    const chargingHandle = new THREE.Mesh(
      new THREE.BoxGeometry(0.010, 0.008, 0.015),
      new THREE.MeshPhongMaterial({ color: 0x333333, shininess: 50 })
    );
    chargingHandle.position.set(0, 0.030, -0.04);
    rifleGroup.add(chargingHandle);

    // Sling mount (front)
    const slingMountFront = new THREE.Mesh(
      new THREE.TorusGeometry(0.005, 0.002, 4, 8),
      darkMetalMat
    );
    slingMountFront.position.set(0.016, 0.005, 0.10);
    rifleGroup.add(slingMountFront);

    // Sling mount (rear)
    const slingMountRear = new THREE.Mesh(
      new THREE.TorusGeometry(0.005, 0.002, 4, 8),
      darkMetalMat
    );
    slingMountRear.position.set(-0.016, 0.005, -0.10);
    rifleGroup.add(slingMountRear);

  } else {
    // ── Assault Rifle: M4/AR-15 style ──
    // Long barrel, full-length handguard, carry handle, stock

    // Main receiver body
    const receiver = new THREE.Mesh(
      new THREE.BoxGeometry(0.038, 0.055, 0.25),
      metalMat
    );
    receiver.position.set(0, 0, 0);
    rifleGroup.add(receiver);

    // Carry handle / rail
    const carryHandle = new THREE.Mesh(
      new THREE.BoxGeometry(0.028, 0.025, 0.16),
      darkMetalMat
    );
    carryHandle.position.set(0, 0.040, -0.02);
    rifleGroup.add(carryHandle);

    // Rear sight on carry handle
    const rearSight = new THREE.Mesh(
      new THREE.BoxGeometry(0.022, 0.018, 0.008),
      darkMetalMat
    );
    rearSight.position.set(0, 0.055, -0.06);
    rifleGroup.add(rearSight);

    // Front sight post
    const frontSightBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, 0.030, 0.012),
      darkMetalMat
    );
    frontSightBase.position.set(0, 0.04, 0.16);
    rifleGroup.add(frontSightBase);

    // Barrel (long)
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.009, 0.009, 0.22, 8),
      darkMetalMat
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.01, 0.24);
    rifleGroup.add(barrel);

    // Barrel flash hider
    const flashHider = new THREE.Mesh(
      new THREE.CylinderGeometry(0.011, 0.009, 0.03, 8),
      new THREE.MeshPhongMaterial({ color: 0x111111, shininess: 80 })
    );
    flashHider.rotation.x = Math.PI / 2;
    flashHider.position.set(0, 0.01, 0.36);
    rifleGroup.add(flashHider);

    // Handguard (long)
    const handguard = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.045, 0.18),
      accentMat
    );
    handguard.position.set(0, 0.005, 0.12);
    rifleGroup.add(handguard);

    // Handguard rail sections
    const railSection = new THREE.Mesh(
      new THREE.BoxGeometry(0.020, 0.006, 0.05),
      darkMetalMat
    );
    railSection.position.set(0, 0.028, 0.10);
    rifleGroup.add(railSection);

    // Magazine (STANAG style, straight)
    const mag = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, 0.12, 0.028),
      darkMetalMat
    );
    mag.position.set(0, -0.085, 0.02);
    mag.rotation.x = 0.08;
    rifleGroup.add(mag);

    // Magazine well
    const magWell = new THREE.Mesh(
      new THREE.BoxGeometry(0.022, 0.025, 0.030),
      metalMat
    );
    magWell.position.set(0, -0.035, 0.02);
    rifleGroup.add(magWell);

    // Trigger guard
    const triggerGuard = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, 0.010, 0.040),
      darkMetalMat
    );
    triggerGuard.position.set(0, -0.038, -0.02);
    rifleGroup.add(triggerGuard);

    // Pistol grip
    const grip = new THREE.Mesh(
      new THREE.BoxGeometry(0.024, 0.065, 0.028),
      gripMat
    );
    grip.position.set(0, -0.055, -0.05);
    grip.rotation.x = 0.20;
    rifleGroup.add(grip);

    // Stock (collapsible M4 style)
    const stockTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.010, 0.010, 0.12, 6),
      darkMetalMat
    );
    stockTube.rotation.x = Math.PI / 2;
    stockTube.position.set(0, 0.01, -0.18);
    rifleGroup.add(stockTube);

    const stockBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.025, 0.045, 0.08),
      accentMat
    );
    stockBody.position.set(0, 0.005, -0.22);
    rifleGroup.add(stockBody);

    // Stock butt pad
    const buttPad = new THREE.Mesh(
      new THREE.BoxGeometry(0.028, 0.050, 0.012),
      gripMat
    );
    buttPad.position.set(0, 0.005, -0.26);
    rifleGroup.add(buttPad);

    // Forward assist (right side)
    const forwardAssist = new THREE.Mesh(
      new THREE.BoxGeometry(0.006, 0.015, 0.015),
      darkMetalMat
    );
    forwardAssist.position.set(0.020, 0.015, -0.06);
    rifleGroup.add(forwardAssist);

    // Ejection port (right side)
    const ejectionPort = new THREE.Mesh(
      new THREE.BoxGeometry(0.004, 0.014, 0.022),
      new THREE.MeshPhongMaterial({ color: 0x111111, shininess: 80 })
    );
    ejectionPort.position.set(0.020, 0.012, -0.03);
    rifleGroup.add(ejectionPort);

    // Charging handle (top)
    const chargingHandle = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, 0.012, 0.020),
      darkMetalMat
    );
    chargingHandle.position.set(0, 0.035, -0.06);
    rifleGroup.add(chargingHandle);
  }
}

function updateRifle(deltaTime) {
  if (!rifleGroup) return;

  const weapon = getCurrentWeapon();
  const isRifleWeapon = weapon && (weapon.data.type === 'rifle');

  // Show/hide rifle based on current weapon
  if (isRifleWeapon) {
    rifleGroup.visible = true;

    // Check if the rifle variant changed (via Q sub-switch)
    const currentSlotId = weaponInventory.slots[3];
    if (currentSlotId !== rifleCurrentVariant) {
      rifleCurrentVariant = currentSlotId;
      buildRifleModel(rifleCurrentVariant);
    }

    // SMG is more compact — position closer to camera
    const isSMG = currentSlotId === 'smg';
    if (isSMG) {
      rifleGroup.scale.set(0.85, 0.85, 0.85);
    } else {
      rifleGroup.scale.set(1, 1, 1);
    }
  } else {
    rifleGroup.visible = false;
    rifleRecoilOffset = 0;
    return;
  }

  // Rifle recoil animation
  if (rifleRecoilOffset > 0) {
    rifleRecoilOffset -= deltaTime * 6.0;
    if (rifleRecoilOffset < 0) rifleRecoilOffset = 0;
  }

  // Apply recoil to rifle position
  const recoilAmount = rifleRecoilOffset;
  rifleGroup.position.z = -0.45 + recoilAmount * 0.06;
  rifleGroup.position.y = -0.28 + recoilAmount * 0.015;
  rifleGroup.rotation.x = 0.05 + recoilAmount * 0.2;

  // Idle animation: slight bob
  if (rifleRecoilOffset < 0.01) {
    rifleIdleTime += deltaTime;
    const bobY = Math.sin(rifleIdleTime * 2) * 0.002;
    const bobX = Math.cos(rifleIdleTime * 1.5) * 0.001;
    rifleGroup.position.y = -0.28 + bobY;
    rifleGroup.position.x = 0.30 + bobX;
    rifleGroup.rotation.x = 0.05;
    rifleGroup.position.z = -0.45;
  }
}

function cycleRifleVariant() {
  // v6: Only cycle through owned variants
  const owned = ownedVariants[3] || [];
  if (owned.length <= 1) return;
  const currentIdx = owned.indexOf(rifleCurrentVariant);
  const nextIdx = (currentIdx + 1) % owned.length;
  const nextVariant = owned[nextIdx];

  // Update the inventory slot
  weaponInventory.slots[3] = nextVariant;
  rifleCurrentVariant = nextVariant;

  // Initialize ammo for new variant
  const wData = getWeaponById(nextVariant);
  if (wData && wData.magazine) {
    weaponInventory.ammo[nextVariant] = wData.magazine;
    weaponInventory.reserveAmmo[nextVariant] = wData.magazine * 3;
  }

  // If we're already on rifle slot, update HUD
  if (weaponInventory.currentSlot === 3) {
    updateWeaponHud();
  }

  console.log('Switched rifle to: ' + nextVariant);
}

function cycleSniperVariant() {
  // Tahap 16: Sub-switch between sniper variants using Q key
  // v6: Only cycle through owned variants
  const owned = ownedVariants[5] || [];
  if (owned.length <= 1) return;
  const currentIdx = owned.indexOf(sniperCurrentVariant);
  const nextIdx = (currentIdx + 1) % owned.length;
  const nextVariant = owned[nextIdx];

  // Update the inventory slot
  weaponInventory.slots[5] = nextVariant;
  sniperCurrentVariant = nextVariant;

  // Rebuild sniper model
  buildSniperModel(nextVariant);

  // Initialize ammo for new variant if not already done
  if (!weaponInventory.ammo[nextVariant]) {
    const wData = getWeaponById(nextVariant);
    if (wData && wData.magazine) {
      weaponInventory.ammo[nextVariant] = wData.magazine;
      weaponInventory.reserveAmmo[nextVariant] = wData.magazine * 3;
    }
  }

  // If we're already on sniper slot, switch to it
  if (weaponInventory.currentSlot === 5) {
    updateWeaponHud();
  }

  console.log('Switched sniper to: ' + nextVariant);
}


// ══════════════════════════════════════════════════════════════
//  TAHAP 17: WEAPON SWITCHING & INVENTORY
// ══════════════════════════════════════════════════════════════

function switchWeaponSlot(newSlot) {
  if (newSlot < 0 || newSlot >= weaponInventory.slots.length) return;
  if (isSwitchingWeapon) return;
  // v7: Allow switching to same slot if the variant changed (e.g., after dropping a weapon)
  // But skip if the slot is truly the same and we're already on it
  if (newSlot === weaponInventory.currentSlot) {
    // If we're already on this slot and it has a weapon, just update HUD
    if (weaponInventory.slots[newSlot] !== null) return;
    // Slot is empty but we're on it — try to find a variant
  }

  // v6: If slot is null but player owns variants, auto-assign first available
  if (weaponInventory.slots[newSlot] === null && newSlot !== 0 && newSlot !== 1) {
    if (ownedVariants[newSlot] && ownedVariants[newSlot].length > 0) {
      const variant = ownedVariants[newSlot][0];
      weaponInventory.slots[newSlot] = variant;
      // Update variant tracker
      if (newSlot === 2) { pistolCurrentVariant = variant; buildPistolModel(variant); }
      else if (newSlot === 3) { rifleCurrentVariant = variant; buildRifleModel(variant); }
      else if (newSlot === 4) { shotgunCurrentVariant = variant; buildShotgunModel(variant); }
      else if (newSlot === 5) { sniperCurrentVariant = variant; buildSniperModel(variant); }
      // Initialize ammo
      if (!weaponInventory.ammo[variant]) {
        const wData = getWeaponById(variant);
        if (wData && wData.magazine) {
          weaponInventory.ammo[variant] = wData.magazine;
          weaponInventory.reserveAmmo[variant] = wData.magazine * 3;
        }
      }
    }
  }

  // Check if slot has a weapon (slot 0 = fist always available, slot 1 = knife always available)
  if (weaponInventory.slots[newSlot] === null && newSlot !== 0 && newSlot !== 1) return;

  // Unscope if switching from sniper
  if (isSniperScoping) {
    isSniperScoping = false;
    targetFOV = CONFIG.cameraFOV;
  }

  // Start switch animation
  previousSlot = weaponInventory.currentSlot;
  switchTargetSlot = newSlot;
  isSwitchingWeapon = true;
  switchAnimTimer = 0;
  isReloading = false;
}

function updateWeaponSwitch(deltaTime) {
  if (!isSwitchingWeapon) return;

  switchAnimTimer += deltaTime;

  // Phase 1: Lower current weapon (first half)
  if (switchAnimTimer < SWITCH_ANIM_DURATION) {
    const t = switchAnimTimer / SWITCH_ANIM_DURATION;
    // Lower all weapon groups
    const lowerOffset = t * 0.3;
    if (fistGroup) fistGroup.position.y = -0.24 - lowerOffset;
    if (leftFistGroup) leftFistGroup.position.y = -0.24 - lowerOffset;
    if (knifeGroup) knifeGroup.position.y = -0.22 - lowerOffset;
    if (pistolGroup) pistolGroup.position.y = -0.25 - lowerOffset;
    if (rifleGroup) rifleGroup.position.y = -0.28 - lowerOffset;
    if (shotgunGroup) shotgunGroup.position.y = -0.26 - lowerOffset;
    if (sniperGroup) sniperGroup.position.y = -0.24 - lowerOffset;
  } else {
    // Phase 2: Switch to new weapon and raise
    if (switchAnimTimer < SWITCH_ANIM_DURATION * 2) {
      // Actually switch the slot
      if (weaponInventory.currentSlot !== switchTargetSlot) {
        weaponInventory.currentSlot = switchTargetSlot;
        updateWeaponHud();
      }

      const t = (switchAnimTimer - SWITCH_ANIM_DURATION) / SWITCH_ANIM_DURATION;
      const raiseOffset = (1 - t) * 0.3;
      // Raise new weapon
      if (fistGroup) fistGroup.position.y = -0.24 - raiseOffset;
      if (leftFistGroup) leftFistGroup.position.y = -0.24 - raiseOffset;
      if (knifeGroup) knifeGroup.position.y = -0.22 - raiseOffset;
      if (pistolGroup) pistolGroup.position.y = -0.25 - raiseOffset;
      if (rifleGroup) rifleGroup.position.y = -0.28 - raiseOffset;
      if (shotgunGroup) shotgunGroup.position.y = -0.26 - raiseOffset;
      if (sniperGroup) sniperGroup.position.y = -0.24 - raiseOffset;
    } else {
      // Animation complete
      if (weaponInventory.currentSlot !== switchTargetSlot) {
        weaponInventory.currentSlot = switchTargetSlot;
        updateWeaponVisibility();
        updateWeaponHud();
      }
      isSwitchingWeapon = false;
      switchTargetSlot = -1;
    }
  }
}

function quickSwitchWeapon() {
  // Q key: switch to previous weapon
  if (previousSlot !== weaponInventory.currentSlot) {
    switchWeaponSlot(previousSlot);
  }
}

function dropCurrentWeapon() {
  // Can't drop fists
  if (weaponInventory.currentSlot === 0) return;
  // Can't drop knife (slot 1 is always available)
  if (weaponInventory.currentSlot === 1) return;

  const slotIdx = weaponInventory.currentSlot;
  const slotId = weaponInventory.slots[slotIdx];
  if (!slotId) return;

  const weapon = getWeaponById(slotId);
  if (!weapon) return;

  // Create a pickup mesh at the player's position — drop in front of player
  const dropDir = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const pickupGeo = new THREE.BoxGeometry(0.3, 0.1, 0.15);
  const pickupMat = new THREE.MeshPhongMaterial({
    color: weapon.type === 'pistol' ? 0x888888 :
           weapon.type === 'rifle' ? 0x555555 :
           weapon.type === 'shotgun' ? 0x664433 :
           weapon.type === 'sniper' ? 0x444444 : 0x777777,
    shininess: 30
  });
  const pickupMesh = new THREE.Mesh(pickupGeo, pickupMat);
  // Drop 1.5 units in front of player (not at player's feet)
  pickupMesh.position.set(
    camera.position.x + dropDir.x * 1.5,
    0.15,
    camera.position.z + dropDir.z * 1.5
  );
  pickupMesh.name = 'weapon_pickup_' + slotId;
  scene.add(pickupMesh);

  // Store the dropped weapon info with dropTime for pickup cooldown
  const now = performance.now() / 1000;
  const savedAmmo = weaponInventory.ammo[slotId] || 0;
  const savedReserve = weaponInventory.reserveAmmo[slotId] || 0;
  droppedWeapons.push({
    mesh: pickupMesh,
    weaponId: slotId,
    slot: slotIdx,
    ammo: savedAmmo,
    reserve: savedReserve,
    dropTime: now,
  });

  // v7: Remove ONLY the specific variant from ownedVariants
  if (ownedVariants[slotIdx]) {
    const vIdx = ownedVariants[slotIdx].indexOf(slotId);
    if (vIdx !== -1) {
      ownedVariants[slotIdx].splice(vIdx, 1);
    }
  }

  // Remove ammo for this specific variant only
  delete weaponInventory.ammo[slotId];
  delete weaponInventory.reserveAmmo[slotId];

  // v7: If there are other variants owned in this slot, switch to the next one
  if (ownedVariants[slotIdx] && ownedVariants[slotIdx].length > 0) {
    const nextVariant = ownedVariants[slotIdx][0];
    weaponInventory.slots[slotIdx] = nextVariant;
    // Update the current variant tracker and rebuild the 3D model
    if (slotIdx === 2) { pistolCurrentVariant = nextVariant; buildPistolModel(nextVariant); }
    else if (slotIdx === 3) { rifleCurrentVariant = nextVariant; buildRifleModel(nextVariant); }
    else if (slotIdx === 4) { shotgunCurrentVariant = nextVariant; buildShotgunModel(nextVariant); }
    else if (slotIdx === 5) { sniperCurrentVariant = nextVariant; buildSniperModel(nextVariant); }
    // Initialize ammo for new variant if not already done
    if (!weaponInventory.ammo[nextVariant]) {
      const wData = getWeaponById(nextVariant);
      if (wData && wData.magazine) {
        weaponInventory.ammo[nextVariant] = wData.magazine;
        weaponInventory.reserveAmmo[nextVariant] = wData.magazine * 3;
      }
    }
    // We're still on the same slot, just different variant — force update weapon visibility
    updateWeaponVisibility();
    updateWeaponHud();
  } else {
    // No more variants in this slot — empty the slot
    weaponInventory.slots[slotIdx] = null;
    // Switch to fist
    switchWeaponSlot(0);
    updateWeaponHud();
  }
}

function checkWeaponPickups() {
  const playerPos = camera.position;
  const pickupRadius = 1.5;
  const now = performance.now() / 1000;
  const cooldown = CONFIG.smokePickupCooldown || 2.0;

  for (let i = droppedWeapons.length - 1; i >= 0; i--) {
    const dw = droppedWeapons[i];

    // v5: Pickup cooldown — can't pick up a weapon within 2 seconds of dropping it
    // This prevents the auto-pickup bug where standing on a dropped weapon re-equips it
    if (dw.dropTime && (now - dw.dropTime) < cooldown) continue;

    const dx = playerPos.x - dw.mesh.position.x;
    const dz = playerPos.z - dw.mesh.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < pickupRadius) {
      // Pick up the weapon
      const targetSlot = dw.slot;
      // Only pick up if slot is empty, same weapon, or same slot type with room
      // v7: Allow pickup if slot is empty OR same weapon type slot
      // (e.g., picking up a revolver when you have a glock — adds it back to ownedVariants)
      const slotWeapon = weaponInventory.slots[targetSlot];
      const canPickup = slotWeapon === null || slotWeapon === dw.weaponId ||
        (ownedVariants[targetSlot] && !ownedVariants[targetSlot].includes(dw.weaponId));
      if (canPickup) {
        // Add the variant back to ownedVariants first
        if (ownedVariants[targetSlot] && !ownedVariants[targetSlot].includes(dw.weaponId)) {
          ownedVariants[targetSlot].push(dw.weaponId);
        }
        // If slot is empty, set it to this weapon
        if (slotWeapon === null) {
          weaponInventory.slots[targetSlot] = dw.weaponId;
          // Update variant tracker
          if (targetSlot === 2) { pistolCurrentVariant = dw.weaponId; buildPistolModel(dw.weaponId); }
          else if (targetSlot === 3) { rifleCurrentVariant = dw.weaponId; buildRifleModel(dw.weaponId); }
          else if (targetSlot === 4) { shotgunCurrentVariant = dw.weaponId; buildShotgunModel(dw.weaponId); }
          else if (targetSlot === 5) { sniperCurrentVariant = dw.weaponId; buildSniperModel(dw.weaponId); }
        }
        weaponInventory.ammo[dw.weaponId] = dw.ammo;
        weaponInventory.reserveAmmo[dw.weaponId] = dw.reserve;

        // Remove pickup mesh
        scene.remove(dw.mesh);
        dw.mesh.geometry.dispose();
        dw.mesh.material.dispose();
        droppedWeapons.splice(i, 1);

        // Update weapon visibility and HUD
        updateWeaponVisibility();
        updateWeaponHud();

        // Show pickup notification
        const weapon = getWeaponById(dw.weaponId);
        if (weapon) {
          showPickupNotification('Picked up: ' + weapon.name);
        }
      }
    }
  }
}

function showPickupNotification(text) {
  const notif = document.getElementById('pickup-notification');
  if (notif) {
    notif.textContent = text;
    notif.style.display = 'block';
    notif.style.opacity = '1';
    setTimeout(() => {
      notif.style.opacity = '0';
      setTimeout(() => { notif.style.display = 'none'; }, 500);
    }, 1500);
  }
}

// Make dropped weapons bob/rotate
function updateDroppedWeapons(deltaTime) {
  for (const dw of droppedWeapons) {
    dw.mesh.rotation.y += deltaTime * 2.0;
    // Ensure weapon stays on ground (y=0.15), never falls through
    dw.mesh.position.y = 0.15 + Math.sin(performance.now() / 1000 * 2 + dw.mesh.position.x) * 0.05;
  }
}

// ══════════════════════════════════════════════════════════════
//  TAHAP 18: ARMOR SYSTEM — Equip, Unequip, Defense, Speed
// ══════════════════════════════════════════════════════════════

// ── Armor Helper Functions ──────────────────────────────────
function getTotalDefense() {
  let total = 0;
  for (const slot of ['helmet', 'vest', 'pants', 'shoes']) {
    if (armorInventory[slot]) {
      total += armorInventory[slot].defense || 0;
    }
  }
  return total;
}

function getArmorSpeedModifier() {
  let modifier = 0;
  if (armorInventory.shoes) {
    if (armorInventory.shoes.speedBonus) modifier += armorInventory.shoes.speedBonus;
    if (armorInventory.shoes.speedPenalty) modifier += armorInventory.shoes.speedPenalty;
  }
  return modifier;
}

function equipArmor(armorItem) {
  if (!armorItem || !armorItem.slot) return;
  const slot = armorItem.slot; // 'helmet', 'vest', 'pants', 'shoes'

  // If already wearing something in this slot, unequip it first
  if (armorInventory[slot]) {
    // Show notification about replacing
    const oldName = armorInventory[slot].name || 'Unknown';
    showPickupNotification('Replaced ' + oldName + ' with ' + armorItem.name);
  } else {
    showPickupNotification('Equipped: ' + armorItem.name + ' (+' + armorItem.defense + ' DEF)');
  }

  armorInventory[slot] = armorItem;
  armorSpeedBonus = getArmorSpeedModifier();
  updateArmorHud();
  // Refresh inventory screen if it's open
  if (isInventoryOpen) updateArmorInventoryScreen();
}

function unequipArmor(slot) {
  if (!armorInventory[slot]) return;

  const item = armorInventory[slot];
  showPickupNotification('Unequipped: ' + item.name);
  armorInventory[slot] = null;
  armorSpeedBonus = getArmorSpeedModifier();
  updateArmorHud();
  // Refresh inventory screen if it's open
  if (isInventoryOpen) updateArmorInventoryScreen();
}

function updateArmorHud() {
  const slots = ['helmet', 'vest', 'pants', 'shoes'];
  for (const slot of slots) {
    const valueEl = document.getElementById('armor-' + slot + '-value');
    if (!valueEl) continue;

    if (armorInventory[slot]) {
      valueEl.textContent = armorInventory[slot].name + ' (+' + armorInventory[slot].defense + ')';
      valueEl.classList.add('equipped');
    } else {
      valueEl.textContent = 'None';
      valueEl.classList.remove('equipped');
    }
  }

  const totalDefEl = document.getElementById('armor-total-defense');
  if (totalDefEl) {
    totalDefEl.textContent = getTotalDefense().toString();
  }
}

function toggleArmorInventory() {
  isInventoryOpen = !isInventoryOpen;
  const invEl = document.getElementById('armor-inventory');

  if (isInventoryOpen) {
    // Exit pointer lock when opening inventory
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    invEl.style.display = 'flex';
    updateArmorInventoryScreen();
  } else {
    invEl.style.display = 'none';
    // Re-lock pointer when closing inventory
    // Use a small delay to ensure the UI is fully hidden before re-locking
    setTimeout(() => {
      if (!isInventoryOpen && renderer && renderer.domElement) {
        renderer.domElement.requestPointerLock();
      }
    }, 50);
  }
}

function updateArmorInventoryScreen() {
  if (!itemData || !itemData.armor) return;

  const slotTypes = ['helmet', 'vest', 'pants', 'shoes'];

  for (const slotType of slotTypes) {
    const container = document.getElementById('inv-' + slotType);
    if (!container) continue;

    container.innerHTML = '';

    const items = itemData.armor[slotType] || [];
    for (const item of items) {
      const div = document.createElement('div');
      div.className = 'inv-item';

      // Check if this item is currently equipped
      const isEquipped = armorInventory[slotType] && armorInventory[slotType].id === item.id;
      if (isEquipped) div.classList.add('equipped');

      let label = item.name;
      let extra = ' (+' + item.defense + ' DEF)';
      if (item.speedBonus) extra += ' (+' + item.speedBonus + ' SPD)';
      if (item.speedPenalty) extra += ' (' + item.speedPenalty + ' SPD)';

      div.innerHTML = label + '<span class="item-defense">' + extra + '</span>';

      // Click handler: equip or unequip
      div.addEventListener('click', () => {
        if (isEquipped) {
          unequipArmor(slotType);
        } else {
          equipArmor(item);
        }
      });

      container.appendChild(div);
    }
  }

  // Update footer
  const totalDefEl = document.getElementById('inv-total-defense');
  if (totalDefEl) totalDefEl.textContent = getTotalDefense();

  const speedBonusEl = document.getElementById('inv-speed-bonus');
  if (speedBonusEl) {
    const speed = getArmorSpeedModifier();
    speedBonusEl.textContent = (speed >= 0 ? '+' : '') + speed.toFixed(1);
  }
}

// ══════════════════════════════════════════════════════════════
//  TAHAP 19: HP & DAMAGE CALCULATION
// ══════════════════════════════════════════════════════════════

// ── Damage Functions ────────────────────────────────────────
function applyDamage(rawDamage, source, isHeadshot) {
  if (isPlayerDead) return;

  // Apply headshot multiplier
  let damage = rawDamage;
  if (isHeadshot) {
    damage = rawDamage * 2;
  }

  // Apply armor defense reduction
  const totalDefense = getTotalDefense();
  let effectiveDamage = damage - totalDefense;

  // Minimum effective damage is always 1
  if (effectiveDamage < 1) effectiveDamage = 1;

  // Reduce HP
  playerHP -= effectiveDamage;
  lastDamageSource = source || 'unknown';

  // Show damage flash
  triggerDamageFlash();

  // Show hit marker
  if (hitMarkerEl) {
    hitMarkerEl.classList.add('active');
    setTimeout(() => { if (hitMarkerEl) hitMarkerEl.classList.remove('active'); }, 200);
  }

  // Update HP bar
  updateHPBar();

  // Check for death
  if (playerHP <= 0) {
    playerHP = 0;
    playerDeath();
  }

  console.log('Damage: ' + rawDamage + (isHeadshot ? ' (HEADSHOT x2)' : '') +
    ' -> Effective: ' + effectiveDamage + ' (DEF: ' + totalDefense + ')' +
    ' | HP: ' + playerHP + ' | Source: ' + lastDamageSource);
}

function triggerDamageFlash() {
  damageFlashTimer = 0.2;
  const flashEl = document.getElementById('damage-flash');
  if (flashEl) {
    flashEl.classList.add('active');
    setTimeout(() => { flashEl.classList.remove('active'); }, 200);
  }
}

function updateHPBar() {
  const hpBar = document.getElementById('hp-bar');
  const hpFill = document.getElementById('hp-fill');
  const hpText = document.getElementById('hp-text');

  if (!hpFill || !hpText) return;

  const hpPercent = Math.max(0, Math.min(100, playerHP));
  hpFill.style.width = hpPercent + '%';
  hpText.textContent = Math.round(playerHP);

  // Color changes based on HP level
  if (hpPercent > 60) {
    hpFill.style.background = '#44ff44'; // Green
    if (hpBar) hpBar.classList.remove('low');
  } else if (hpPercent > 30) {
    hpFill.style.background = '#ffaa00'; // Yellow/Orange
    if (hpBar) hpBar.classList.remove('low');
  } else {
    hpFill.style.background = '#ff3300'; // Red
    if (hpBar) hpBar.classList.add('low');
  }
}

function playerDeath() {
  isPlayerDead = true;
  deathTime = performance.now() / 1000;

  // Show death screen
  const deathScreen = document.getElementById('death-screen');
  if (deathScreen) {
    deathScreen.style.display = 'flex';
  }

  // Release pointer lock
  if (document.pointerLockElement) {
    document.exitPointerLock();
  }

  console.log('PLAYER DIED — Respawning in ' + DEATH_RESPAWN_TIME + 's');
}

function respawnPlayer() {
  isPlayerDead = false;
  playerHP = playerMaxHP;

  // Reset position to spawn point
  camera.position.set(SPAWN_POINT.x, SPAWN_POINT.y, SPAWN_POINT.z);
  velocityY = 0;
  velocity.set(0, 0, 0);
  isGrounded = true;
  yaw = 0;
  pitch = 0;

  // Reset stance to standing
  if (stance !== 'standing') {
    stance = 'standing';
    targetCameraY = CONFIG.standHeight;
  }

  // Reset sprint and stamina
  isSprinting = false;
  isExhausted = false;
  exhaustionTimer = 0;
  stamina = CONFIG.staminaMax;

  // Reset weapon to fist
  weaponInventory.currentSlot = 0;
  updateWeaponVisibility();
  updateWeaponHud();

  // Hide death screen
  const deathScreen = document.getElementById('death-screen');
  if (deathScreen) {
    deathScreen.style.display = 'none';
  }

  // Update HP bar
  updateHPBar();

  // Re-lock pointer
  if (renderer && renderer.domElement) {
    renderer.domElement.requestPointerLock();
  }

  console.log('PLAYER RESPAWNED');
}

function updateDeathAndRespawn(deltaTime) {
  if (!isPlayerDead) return;

  const elapsed = performance.now() / 1000 - deathTime;
  const remaining = Math.max(0, DEATH_RESPAWN_TIME - elapsed);

  // Update respawn timer display
  const timerEl = document.getElementById('respawn-timer');
  if (timerEl) {
    timerEl.textContent = Math.ceil(remaining);
  }

  // Respawn when timer expires
  if (remaining <= 0) {
    respawnPlayer();
  }
}

// ── Fall Damage ─────────────────────────────────────────────
let lastGroundY = CONFIG.groundLevel;
let wasAirborne = false;

function updateFallDamage() {
  // Track fall damage: if player was airborne and lands from a height > 3 units
  if (!isGrounded) {
    wasAirborne = true;
    if (camera.position.y > lastGroundY) {
      lastGroundY = camera.position.y;
    }
  } else if (wasAirborne) {
    // Just landed
    const fallDistance = lastGroundY - camera.position.y;
    if (fallDistance > 3.0) {
      // Fall damage: 5 damage per unit above 3
      const fallDamage = (fallDistance - 3.0) * 10;
      applyDamage(fallDamage, 'fall', false);
      console.log('Fall damage! Distance: ' + fallDistance.toFixed(1) + 'u, Damage: ' + fallDamage.toFixed(1));
    }
    wasAirborne = false;
    lastGroundY = camera.position.y;
  } else {
    lastGroundY = camera.position.y;
  }
}

// ── Self-damage test command (F5 key for testing) ──────────
// Press F5 to test damage, F6 to test headshot, F7 to kill self

// ── Tahap 08: Arena Map Builder ────────────────────────────
function buildArenaMap() {
  const H = CONFIG.wallHeight;          // 3 (inner walls)
  const OH = CONFIG.outerWallHeight;    // 6 (outer walls — BUG FIX: taller so player can't jump over)
  const T = CONFIG.wallThickness;       // 0.5
  const S = CONFIG.arenaSize;           // 50
  const halfS = S / 2;                  // 25

  // Wall materials — various grays & cream tones
  const wallMats = {
    outer: new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.8, metalness: 0.15 }), // Darker outer walls
    inner: new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.7, metalness: 0.1 }),
    room:  new THREE.MeshStandardMaterial({ color: 0x999988, roughness: 0.75, metalness: 0.1 }), // cream
    choke: new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.8, metalness: 0.2 }),
    pillar: new THREE.MeshStandardMaterial({ color: 0x888877, roughness: 0.7, metalness: 0.15 }),
    cover: new THREE.MeshStandardMaterial({ color: 0x7a7a6e, roughness: 0.75, metalness: 0.1 }),
  };

  // Helper: add a wall box and register it as collidable
  function addWall(width, height, depth, x, y, z, name, mat, isCover) {
    const geo = new THREE.BoxGeometry(width, height, depth);
    const mesh = new THREE.Mesh(geo, mat || wallMats.inner);
    mesh.position.set(x, y, z);
    mesh.name = name;
    mesh.userData.collidable = true;
    // Mark cover objects so player can jump over them
    if (isCover) mesh.userData.isCover = true;
    scene.add(mesh);
    return mesh;
  }

  // Helper: add a cylinder pillar and register as collidable (approximate with AABB)
  function addPillar(radius, height, x, y, z, name, mat) {
    const geo = new THREE.CylinderGeometry(radius, radius, height, 12);
    const mesh = new THREE.Mesh(geo, mat || wallMats.pillar);
    mesh.position.set(x, y, z);
    mesh.name = name;
    mesh.userData.collidable = true;
    scene.add(mesh);
    return mesh;
  }

  // ══════════════════════════════════════════════════════════
  // 1. OUTER BOUNDARY WALLS (enclose the 50x50 arena)
  //    BUG FIX: Use OH (6 units) instead of H (3 units) so player can't jump over
  // ══════════════════════════════════════════════════════════
  addWall(S, OH, T, 0, OH/2, -halfS, 'outer_north', wallMats.outer);
  addWall(S, OH, T, 0, OH/2, halfS, 'outer_south', wallMats.outer);
  addWall(T, OH, S, -halfS, OH/2, 0, 'outer_west', wallMats.outer);
  addWall(T, OH, S, halfS, OH/2, 0, 'outer_east', wallMats.outer);

  // ══════════════════════════════════════════════════════════
  // 2. CENTRAL OPEN ARENA (~15x15 area, walls around it)
  // ══════════════════════════════════════════════════════════
  const arenaHalf = 7.5;
  const corridorWidth = 3;
  const corridorLen = 6;

  // North side of arena
  addWall(6, H, T, -4.5, H/2, -arenaHalf, 'arena_n_left', wallMats.inner);
  addWall(6, H, T, 4.5, H/2, -arenaHalf, 'arena_n_right', wallMats.inner);

  // South side of arena
  addWall(6, H, T, -4.5, H/2, arenaHalf, 'arena_s_left', wallMats.inner);
  addWall(6, H, T, 4.5, H/2, arenaHalf, 'arena_s_right', wallMats.inner);

  // West side of arena
  addWall(T, H, 6, -arenaHalf, H/2, -4.5, 'arena_w_top', wallMats.inner);
  addWall(T, H, 6, -arenaHalf, H/2, 4.5, 'arena_w_bottom', wallMats.inner);

  // East side of arena
  addWall(T, H, 6, arenaHalf, H/2, -4.5, 'arena_e_top', wallMats.inner);
  addWall(T, H, 6, arenaHalf, H/2, 4.5, 'arena_e_bottom', wallMats.inner);

  // ══════════════════════════════════════════════════════════
  // 3. CORRIDORS (4 corridors extending from arena center)
  // ══════════════════════════════════════════════════════════

  // --- North Corridor
  addWall(T, H, corridorLen, -corridorWidth/2, H/2, -arenaHalf - corridorLen/2, 'corr_n_left', wallMats.inner);
  addWall(T, H, corridorLen, corridorWidth/2, H/2, -arenaHalf - corridorLen/2, 'corr_n_right', wallMats.inner);
  addWall(1, H, T, -1, H/2, -arenaHalf - corridorLen, 'corr_n_end_l', wallMats.inner);
  addWall(1, H, T, 1, H/2, -arenaHalf - corridorLen, 'corr_n_end_r', wallMats.inner);

  // --- South Corridor
  addWall(T, H, corridorLen, -corridorWidth/2, H/2, arenaHalf + corridorLen/2, 'corr_s_left', wallMats.inner);
  addWall(T, H, corridorLen, corridorWidth/2, H/2, arenaHalf + corridorLen/2, 'corr_s_right', wallMats.inner);
  addWall(1, H, T, -1, H/2, arenaHalf + corridorLen, 'corr_s_end_l', wallMats.inner);
  addWall(1, H, T, 1, H/2, arenaHalf + corridorLen, 'corr_s_end_r', wallMats.inner);

  // --- West Corridor
  addWall(corridorLen, H, T, -arenaHalf - corridorLen/2, H/2, -corridorWidth/2, 'corr_w_top', wallMats.inner);
  addWall(corridorLen, H, T, -arenaHalf - corridorLen/2, H/2, corridorWidth/2, 'corr_w_bottom', wallMats.inner);
  addWall(T, H, 1, -arenaHalf - corridorLen, H/2, -1, 'corr_w_end_t', wallMats.inner);
  addWall(T, H, 1, -arenaHalf - corridorLen, H/2, 1, 'corr_w_end_b', wallMats.inner);

  // --- East Corridor
  addWall(corridorLen, H, T, arenaHalf + corridorLen/2, H/2, -corridorWidth/2, 'corr_e_top', wallMats.inner);
  addWall(corridorLen, H, T, arenaHalf + corridorLen/2, H/2, corridorWidth/2, 'corr_e_bottom', wallMats.inner);
  addWall(T, H, 1, arenaHalf + corridorLen, H/2, -1, 'corr_e_end_t', wallMats.inner);
  addWall(T, H, 1, arenaHalf + corridorLen, H/2, 1, 'corr_e_end_b', wallMats.inner);

  // ══════════════════════════════════════════════════════════
  // 4. SMALL ROOMS (~5x5) IN CORNERS
  // ══════════════════════════════════════════════════════════
  const roomSize = 5;
  const roomDoorWidth = 2;

  // --- NW Room
  const nw_cx = -20, nw_cz = -20;
  addWall((roomSize - roomDoorWidth) / 2, H, T, nw_cx - roomDoorWidth/2 - (roomSize - roomDoorWidth)/4, H/2, nw_cz - roomSize/2, 'room_nw_n_l', wallMats.room);
  addWall((roomSize - roomDoorWidth) / 2, H, T, nw_cx + roomDoorWidth/2 + (roomSize - roomDoorWidth)/4, H/2, nw_cz - roomSize/2, 'room_nw_n_r', wallMats.room);
  addWall(roomSize, H, T, nw_cx, H/2, nw_cz + roomSize/2, 'room_nw_s', wallMats.room);
  addWall(T, H, roomSize, nw_cx - roomSize/2, H/2, nw_cz, 'room_nw_w', wallMats.room);
  addWall(T, H, roomSize, nw_cx + roomSize/2, H/2, nw_cz, 'room_nw_e', wallMats.room);
  // Cover box inside room — isCover=true so player can jump over
  addWall(1.5, 1.2, 1.5, nw_cx - 1, 0.6, nw_cz + 0.5, 'room_nw_cover', wallMats.cover, true);

  // --- NE Room
  const ne_cx = 20, ne_cz = -20;
  addWall((roomSize - roomDoorWidth) / 2, H, T, ne_cx - roomDoorWidth/2 - (roomSize - roomDoorWidth)/4, H/2, ne_cz - roomSize/2, 'room_ne_n_l', wallMats.room);
  addWall((roomSize - roomDoorWidth) / 2, H, T, ne_cx + roomDoorWidth/2 + (roomSize - roomDoorWidth)/4, H/2, ne_cz - roomSize/2, 'room_ne_n_r', wallMats.room);
  addWall(roomSize, H, T, ne_cx, H/2, ne_cz + roomSize/2, 'room_ne_s', wallMats.room);
  addWall(T, H, roomSize, ne_cx - roomSize/2, H/2, ne_cz, 'room_ne_w', wallMats.room);
  addWall(T, H, roomSize, ne_cx + roomSize/2, H/2, ne_cz, 'room_ne_e', wallMats.room);
  addWall(1.5, 1.2, 1.5, ne_cx + 1, 0.6, ne_cz + 0.5, 'room_ne_cover', wallMats.cover, true);

  // --- SW Room
  const sw_cx = -20, sw_cz = 20;
  addWall(roomSize, H, T, sw_cx, H/2, sw_cz - roomSize/2, 'room_sw_n', wallMats.room);
  addWall((roomSize - roomDoorWidth) / 2, H, T, sw_cx - roomDoorWidth/2 - (roomSize - roomDoorWidth)/4, H/2, sw_cz + roomSize/2, 'room_sw_s_l', wallMats.room);
  addWall((roomSize - roomDoorWidth) / 2, H, T, sw_cx + roomDoorWidth/2 + (roomSize - roomDoorWidth)/4, H/2, sw_cz + roomSize/2, 'room_sw_s_r', wallMats.room);
  addWall(T, H, roomSize, sw_cx - roomSize/2, H/2, sw_cz, 'room_sw_w', wallMats.room);
  addWall(T, H, roomSize, sw_cx + roomSize/2, H/2, sw_cz, 'room_sw_e', wallMats.room);
  addWall(1.5, 1.2, 1.5, sw_cx - 1, 0.6, sw_cz - 0.5, 'room_sw_cover', wallMats.cover, true);

  // --- SE Room
  const se_cx = 20, se_cz = 20;
  addWall(roomSize, H, T, se_cx, H/2, se_cz - roomSize/2, 'room_se_n', wallMats.room);
  addWall((roomSize - roomDoorWidth) / 2, H, T, se_cx - roomDoorWidth/2 - (roomSize - roomDoorWidth)/4, H/2, se_cz + roomSize/2, 'room_se_s_l', wallMats.room);
  addWall((roomSize - roomDoorWidth) / 2, H, T, se_cx + roomDoorWidth/2 + (roomSize - roomDoorWidth)/4, H/2, se_cz + roomSize/2, 'room_se_s_r', wallMats.room);
  addWall(T, H, roomSize, se_cx - roomSize/2, H/2, se_cz, 'room_se_w', wallMats.room);
  addWall(T, H, roomSize, se_cx + roomSize/2, H/2, se_cz, 'room_se_e', wallMats.room);
  addWall(1.5, 1.2, 1.5, se_cx + 1, 0.6, se_cz - 0.5, 'room_se_cover', wallMats.cover, true);

  // ══════════════════════════════════════════════════════════
  // 5. CHOKE POINTS (2 narrow passages ~2 unit wide)
  // ══════════════════════════════════════════════════════════

  // Choke Point 1
  addWall(4, H, T, -6, H/2, -16, 'choke1_wall_a', wallMats.choke);
  addWall(4, H, T, -12, H/2, -16, 'choke1_wall_b', wallMats.choke);
  addWall(T, H, 3, -8, H/2, -17.5, 'choke1_funnel_l', wallMats.choke);
  addWall(T, H, 3, -10, H/2, -17.5, 'choke1_funnel_r', wallMats.choke);

  // Choke Point 2
  addWall(T, H, 4, 16, H/2, -6, 'choke2_wall_a', wallMats.choke);
  addWall(T, H, 4, 16, H/2, -12, 'choke2_wall_b', wallMats.choke);
  addWall(3, H, T, 17.5, H/2, -8, 'choke2_funnel_l', wallMats.choke);
  addWall(3, H, T, 17.5, H/2, -10, 'choke2_funnel_r', wallMats.choke);

  // ══════════════════════════════════════════════════════════
  // 6. COVER OBJECTS & PILLARS (inside arena & corridors)
  //    BUG FIX: Pillars are now thicker (0.8-1.0 radius) for better strategic use
  // ══════════════════════════════════════════════════════════

  // Pillars in central arena — THICKER for strategic cover
  addPillar(0.8, H, -3, H/2, -3, 'arena_pillar_nw');
  addPillar(0.8, H, 3, H/2, -3, 'arena_pillar_ne');
  addPillar(0.8, H, -3, H/2, 3, 'arena_pillar_sw');
  addPillar(0.8, H, 3, H/2, 3, 'arena_pillar_se');

  // Cover boxes in arena (low walls for hiding) — isCover=true
  addWall(3, 1.5, T, 0, 0.75, -5, 'arena_cover_n', wallMats.cover, true);
  addWall(T, 1.5, 3, 5, 0.75, 0, 'arena_cover_e', wallMats.cover, true);
  addWall(3, 1.5, T, 0, 0.75, 5, 'arena_cover_s', wallMats.cover, true);
  addWall(T, 1.5, 3, -5, 0.75, 0, 'arena_cover_w', wallMats.cover, true);

  // Cover in corridors — isCover=true
  addWall(1.5, 1.2, 1.5, 0, 0.6, -arenaHalf - corridorLen/2, 'corr_n_cover', wallMats.cover, true);
  addWall(1.5, 1.2, 1.5, 0, 0.6, arenaHalf + corridorLen/2, 'corr_s_cover', wallMats.cover, true);
  addWall(1.5, 1.2, 1.5, -arenaHalf - corridorLen/2, 0.6, 0, 'corr_w_cover', wallMats.cover, true);
  addWall(1.5, 1.2, 1.5, arenaHalf + corridorLen/2, 0.6, 0, 'corr_e_cover', wallMats.cover, true);

  // Mid-area pillars — THICKER for strategic use as cover
  addPillar(1.0, H, -15, H/2, -15, 'mid_pillar_nw');
  addPillar(1.0, H, 15, H/2, -15, 'mid_pillar_ne');
  addPillar(1.0, H, -15, H/2, 15, 'mid_pillar_sw');
  addPillar(1.0, H, 15, H/2, 15, 'mid_pillar_se');

  // Additional strategic pillars near corridors
  addPillar(0.8, H, -7.5, H/2, -12, 'strat_pillar_n1');
  addPillar(0.8, H, 7.5, H/2, -12, 'strat_pillar_n2');
  addPillar(0.8, H, -7.5, H/2, 12, 'strat_pillar_s1');
  addPillar(0.8, H, 7.5, H/2, 12, 'strat_pillar_s2');
  addPillar(0.8, H, -12, H/2, -7.5, 'strat_pillar_w1');
  addPillar(0.8, H, -12, H/2, 7.5, 'strat_pillar_w2');
  addPillar(0.8, H, 12, H/2, -7.5, 'strat_pillar_e1');
  addPillar(0.8, H, 12, H/2, 7.5, 'strat_pillar_e2');

  // Low walls connecting rooms to corridor areas
  addWall(4, H, T, -9, H/2, -13.5, 'midwall_nw_n', wallMats.inner);
  addWall(4, H, T, 9, H/2, -13.5, 'midwall_ne_n', wallMats.inner);
  addWall(T, H, 4, -13.5, H/2, -9, 'midwall_nw_w', wallMats.inner);
  addWall(T, H, 4, 13.5, H/2, -9, 'midwall_ne_e', wallMats.inner);
  addWall(4, H, T, -9, H/2, 13.5, 'midwall_sw_s', wallMats.inner);
  addWall(4, H, T, 9, H/2, 13.5, 'midwall_se_s', wallMats.inner);
  addWall(T, H, 4, -13.5, H/2, 9, 'midwall_sw_w', wallMats.inner);
  addWall(T, H, 4, 13.5, H/2, 9, 'midwall_se_e', wallMats.inner);

  // ══════════════════════════════════════════════════════════
  // 7. Build collision boxes from all collidable meshes
  // ══════════════════════════════════════════════════════════
  rebuildCollisionBoxes();
}

// ── Rebuild Collision AABBs dari scene ──────────────────────
function rebuildCollisionBoxes() {
  collidableBoxes = [];
  scene.traverse((obj) => {
    if (obj.userData && obj.userData.collidable && obj.isMesh) {
      const box = new THREE.Box3().setFromObject(obj);
      collidableBoxes.push({
        name: obj.name,
        minX: box.min.x, maxX: box.max.x,
        minY: box.min.y, maxY: box.max.y,
        minZ: box.min.z, maxZ: box.max.z,
        isCover: !!obj.userData.isCover,
      });
    }
  });
}

// ── Collision Check (AABB vs circle on XZ plane) ───────────
// BUG FIX: Improved cover object collision to prevent blinking
// Cover objects: player can jump over them when feet are above the top,
// and can land on top of them (they have a top surface).
// Full walls always block regardless.
function checkCollision(newX, newZ, radius) {
  const r = radius;

  // Player body spans from feet to head
  const stanceHeight = stance === 'crawling' ? CONFIG.crawlHeight :
                       stance === 'crouching' ? CONFIG.crouchHeight : CONFIG.standHeight;
  const playerFeetY = camera.position.y - stanceHeight;
  const playerHeadY = camera.position.y + 0.15;

  for (let i = 0; i < collidableBoxes.length; i++) {
    const box = collidableBoxes[i];

    // BUG FIX: Cover objects — smart collision logic with tolerance
    // If player's feet are above the cover top (with tolerance), they can pass over (no horizontal collision)
    // This prevents the blinking/glitching when standing on cover boxes
    if (box.isCover) {
      if (playerFeetY >= box.maxY - 0.15) continue; // Player is above cover — can pass over (with 0.15 tolerance)
      // Player feet are below cover top — apply normal collision
    }

    // Y-axis check: only collide if player BODY overlaps with box vertically
    if (playerHeadY < box.minY || playerFeetY > box.maxY) continue;

    // XZ plane: circle vs AABB
    const closestX = Math.max(box.minX, Math.min(newX, box.maxX));
    const closestZ = Math.max(box.minZ, Math.min(newZ, box.maxZ));

    const dx = newX - closestX;
    const dz = newZ - closestZ;
    const distSq = dx * dx + dz * dz;

    if (distSq < r * r) {
      const dist = Math.sqrt(Math.max(distSq, 0.0001));
      return {
        collided: true,
        pushX: dx / dist,
        pushZ: dz / dist,
        overlap: r - dist,
        boxName: box.name,
      };
    }
  }
  return { collided: false };
}

// ── Collision Resolution with Wall Slide ────────────────────
function resolveCollision(newX, newZ, radius) {
  const result = checkCollision(newX, newZ, radius);
  if (!result.collided) return { x: newX, z: newZ, collided: false };

  const pushX = result.pushX * result.overlap;
  const pushZ = result.pushZ * result.overlap;

  let resolvedX = newX + pushX;
  let resolvedZ = newZ + pushZ;

  const recheck = checkCollision(resolvedX, resolvedZ, radius);
  if (recheck.collided) {
    resolvedX += recheck.pushX * recheck.overlap;
    resolvedZ += recheck.pushZ * recheck.overlap;
  }

  const dot = velocity.x * result.pushX + velocity.z * result.pushZ;
  if (dot < 0) {
    velocity.x -= dot * result.pushX;
    velocity.z -= dot * result.pushZ;
  }

  return { x: resolvedX, z: resolvedZ, collided: true };
}

// ── Check ground surface for landing on boxes ────────────
// BUG FIX: Improved to prevent blinking when standing on cover boxes
// Returns the highest box top Y that the player should stand on
function getSurfaceY() {
  const stanceHeight = stance === 'crawling' ? CONFIG.crawlHeight :
                       stance === 'crouching' ? CONFIG.crouchHeight : CONFIG.standHeight;
  const playerFeetY = camera.position.y - stanceHeight;
  const playerX = camera.position.x;
  const playerZ = camera.position.z;
  const r = CONFIG.playerRadius;

  let surfaceY = 0; // Default ground plane

  for (const box of collidableBoxes) {
    if (playerX + r > box.minX && playerX - r < box.maxX &&
        playerZ + r > box.minZ && playerZ - r < box.maxZ) {
      const boxTop = box.maxY;
      // BUG FIX: Wider tolerance range and better threshold for standing on surfaces
      // This prevents the player from falling through or blinking on cover boxes
      if (boxTop > surfaceY && playerFeetY <= boxTop + 0.3 && playerFeetY >= boxTop - 0.8) {
        if (velocityY <= 0.1) { // Allow slight upward velocity tolerance
          surfaceY = boxTop;
        }
      }
    }
  }

  return surfaceY;
}

// ── Resize Handler ──────────────────────────────────────────
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ── Crouch / Crawl ─────────────────────────────────────────
function updateCrouch(deltaTime) {
  const dt = Math.min(deltaTime, 0.1);

  if (crouchJustPressed) {
    crouchJustPressed = false;
    switch (stance) {
      case 'standing':  stance = 'crouching'; targetCameraY = CONFIG.crouchHeight; break;
      case 'crouching': stance = 'crawling';  targetCameraY = CONFIG.crawlHeight;  break;
      case 'crawling':  stance = 'standing';  targetCameraY = CONFIG.standHeight;  break;
    }
  }

  if (keys.control && stance !== 'crawling') {
    stance = 'crawling';
    targetCameraY = CONFIG.crawlHeight;
  }

  if (isGrounded) {
    // BUG FIX: Account for box surface when crouching on top of boxes
    // Calculate the surface the player is standing on
    const stanceHeight = stance === 'crawling' ? CONFIG.crawlHeight :
                         stance === 'crouching' ? CONFIG.crouchHeight : CONFIG.standHeight;
    const playerFeetY = camera.position.y - stanceHeight;
    const playerX = camera.position.x;
    const playerZ = camera.position.z;
    const r = CONFIG.playerRadius;

    let surfaceY = 0;
    for (const box of collidableBoxes) {
      if (playerX + r > box.minX && playerX - r < box.maxX &&
          playerZ + r > box.minZ && playerZ - r < box.maxZ) {
        if (Math.abs(playerFeetY - box.maxY) < 0.3 && box.maxY > surfaceY) {
          surfaceY = box.maxY;
        }
      }
    }

    // Adjust targetCameraY to be relative to the box surface
    const adjustedTarget = surfaceY + targetCameraY;
    const currentY = camera.position.y;
    const lerpFactor = 1 - Math.pow(1 - CONFIG.crouchTransitionLerp, dt * 60);
    camera.position.y = currentY + (adjustedTarget - currentY) * lerpFactor;
    if (Math.abs(camera.position.y - adjustedTarget) < 0.01) camera.position.y = adjustedTarget;
    effectiveGroundLevel = adjustedTarget;
  }

  if (crouchIndicator) {
    switch (stance) {
      case 'standing':  crouchIndicator.textContent = 'STANDING';  crouchIndicator.className = 'standing';  break;
      case 'crouching': crouchIndicator.textContent = 'CROUCHING'; crouchIndicator.className = 'crouching'; break;
      case 'crawling':  crouchIndicator.textContent = 'CRAWLING';  crouchIndicator.className = 'crawling';  break;
    }
  }
}

// ── Sprint & Stamina ───────────────────────────────────────
function updateSprint(deltaTime) {
  const dt = Math.min(deltaTime, 0.1);
  const isMoving = keys.w || keys.a || keys.s || keys.d;

  if (isExhausted) {
    exhaustionTimer -= dt;
    if (exhaustionTimer <= 0) { isExhausted = false; exhaustionTimer = 0; }
  }

  const canSprint = keys.shift && isGrounded && stamina > 0 && isMoving && !isExhausted && stance === 'standing';

  if (canSprint) {
    isSprinting = true;
    stamina -= CONFIG.staminaDrain * dt;
    if (stamina <= 0) { stamina = 0; isExhausted = true; exhaustionTimer = EXHAUSTION_COOLDOWN; }
  } else {
    isSprinting = false;
    stamina += CONFIG.staminaRecovery * dt;
    if (stamina > CONFIG.staminaMax) stamina = CONFIG.staminaMax;
  }

  if (staminaFill) {
    const pct = (stamina / CONFIG.staminaMax) * 100;
    staminaFill.style.width = pct + '%';
    staminaFill.style.background = pct > 60 ? '#00ff00' : pct > 30 ? '#ffaa00' : '#ff3300';
  }
  if (staminaText) staminaText.textContent = Math.round(stamina) + '%';
  if (staminaBar) {
    if (stamina <= 0 && keys.shift) staminaBar.classList.add('exhausted');
    else staminaBar.classList.remove('exhausted');
  }
}

// ── Horizontal Movement + Collision ─────────────────────────
function updateMovement(deltaTime) {
  const dt = Math.min(deltaTime, 0.1);

  let currentSpeed;
  if (stance === 'crawling') currentSpeed = CONFIG.crawlSpeed;
  else if (stance === 'crouching') currentSpeed = CONFIG.crouchSpeed;
  else if (isSprinting) currentSpeed = CONFIG.sprintSpeed;
  else currentSpeed = CONFIG.walkSpeed;

  // Tahap 18: Apply armor speed bonus/penalty from shoes
  currentSpeed += armorSpeedBonus;

  const cameraDirection = new THREE.Vector3();
  camera.getWorldDirection(cameraDirection);
  const forwardXZ = new THREE.Vector3(cameraDirection.x, 0, cameraDirection.z);
  const forwardLen = forwardXZ.length();

  let forward, right;
  if (forwardLen > 0.001) {
    forward = forwardXZ.normalize();
    right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
  } else {
    forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  }

  const targetVelocity = new THREE.Vector3(0, 0, 0);
  if (keys.w) targetVelocity.add(forward);
  if (keys.s) targetVelocity.sub(forward);
  if (keys.d) targetVelocity.add(right);
  if (keys.a) targetVelocity.sub(right);
  if (targetVelocity.lengthSq() > 0) targetVelocity.normalize();
  targetVelocity.multiplyScalar(currentSpeed);

  const smoothing = CONFIG.movementSmoothing;
  const lerpFactor = 1 - Math.pow(smoothing, dt * 60);
  velocity.x += (targetVelocity.x - velocity.x) * lerpFactor;
  velocity.z += (targetVelocity.z - velocity.z) * lerpFactor;

  let newX = camera.position.x + velocity.x * dt;
  let newZ = camera.position.z + velocity.z * dt;

  if (CONFIG.collisionEnabled && collidableBoxes.length > 0) {
    const result = resolveCollision(newX, newZ, CONFIG.playerRadius);
    camera.position.x = result.x;
    camera.position.z = result.z;
  } else {
    camera.position.x = newX;
    camera.position.z = newZ;
  }
}

// ── Jump / Vertical Physics ────────────────────────────────
// BUG FIX: Improved ground detection to prevent blinking on cover boxes
function updateJump(deltaTime) {
  const dt = Math.min(deltaTime, 0.1);

  if (keys.space && isGrounded && stance === 'standing') {
    velocityY = CONFIG.jumpForce;
    isGrounded = false;
    isSprinting = false;
  }

  if (!isGrounded) {
    velocityY += CONFIG.gravity * dt;
    camera.position.y += velocityY * dt;
  }

  // ── BUG FIX: Check if player should land on top of a box ──
  // This allows the player to stand on top of cover boxes and other surfaces
  const stanceHeight = stance === 'crawling' ? CONFIG.crawlHeight :
                       stance === 'crouching' ? CONFIG.crouchHeight : CONFIG.standHeight;
  const playerFeetY = camera.position.y - stanceHeight;

  // Check all collidable boxes for surface landing
  let surfaceY = 0; // Default ground plane
  const playerX = camera.position.x;
  const playerZ = camera.position.z;
  const r = CONFIG.playerRadius;

  for (const box of collidableBoxes) {
    // Check XZ overlap
    if (playerX + r > box.minX && playerX - r < box.maxX &&
        playerZ + r > box.minZ && playerZ - r < box.maxZ) {
      // Check if player is landing on top of this box
      // BUG FIX: Wider tolerance range to prevent flickering
      if (velocityY <= 0.1) { // Allow slight upward velocity tolerance
        const boxTop = box.maxY;
        // Player feet are at or below the box top, and above the box top - threshold
        if (playerFeetY <= boxTop + 0.3 && playerFeetY >= boxTop - 0.8) {
          // This is a valid surface to stand on
          if (boxTop > surfaceY) {
            surfaceY = boxTop;
          }
        }
      }
    }
  }

  // Apply ground level (either ground plane or box top)
  const groundLevel = surfaceY + stanceHeight;

  if (camera.position.y <= groundLevel) {
    camera.position.y = groundLevel;
    velocityY = 0;
    isGrounded = true;
    effectiveGroundLevel = groundLevel;
  }

  // ── BUG FIX: Check if player walked off a box edge ──
  // If player is grounded but not on any box surface and above normal ground, they should fall
  if (isGrounded && surfaceY < 0.01 && camera.position.y > CONFIG.standHeight + 0.1) {
    // Player is above ground level but not on any box surface — they walked off
    isGrounded = false;
  }

  if (jumpIndicator) {
    jumpIndicator.textContent = isGrounded ? 'GROUNDED' : 'AIRBORNE';
    jumpIndicator.className = isGrounded ? 'grounded' : 'airborne';
  }
}

// ── Render Loop ─────────────────────────────────────────────
// ── Tahap 11 FIX: Screen-space smoke overlay (v6 — optimized, throttled) ────────
let smokeOverlayTime = 0;
let lastSmokeOverlayUpdate = 0;
function updateSmokeOverlay() {
  if (!smokeOverlayEl) return;

  const now = performance.now() / 1000;

  // v7: Throttle DOM updates to every ~300ms instead of every frame
  // DOM style changes are expensive — reducing frequency drastically improves FPS
  if (now - lastSmokeOverlayUpdate < 0.3) {
    // If overlay is already hidden, no need to update
    if (smokeOverlayEl.style.display === 'none') return;
    // If overlay is visible, keep it visible but skip expensive style updates
    return;
  }
  lastSmokeOverlayUpdate = now;

  let maxOpacity = 0;
  let closestDist = 999;
  const playerPos = camera.position;

  for (const cloud of activeSmokeClouds) {
    const dx = playerPos.x - cloud.position.x;
    const dz = playerPos.z - cloud.position.z;
    const dist2D = Math.sqrt(dx * dx + dz * dz);
    const heightDiff = Math.abs(playerPos.y - cloud.position.y - 1.5);

    if (dist2D < cloud.radius && heightDiff < 3.0) {
      const distRatio = dist2D / cloud.radius;
      const heightRatio = heightDiff / 3.0;

      const opacity = (0.5 - distRatio * 0.25) * (1 - heightRatio * 0.15);

      const elapsed = now - cloud.startTime;
      const remaining = cloud.duration - elapsed;
      const fadeFactor = remaining < cloud.duration * 0.3
        ? remaining / (cloud.duration * 0.3)
        : 1.0;

      const fadeInFactor = elapsed < 2.0 ? elapsed / 2.0 : 1.0;

      const finalOpacity = opacity * fadeFactor * fadeInFactor;
      if (finalOpacity > maxOpacity) maxOpacity = finalOpacity;
      if (dist2D < closestDist) closestDist = dist2D;
    }
  }

  // Apply the overlay
  if (maxOpacity > 0.01) {
    smokeOverlayTime += 0.15;
    const offsetX = Math.sin(smokeOverlayTime * 0.5) * 30;
    const offsetY = Math.cos(smokeOverlayTime * 0.3) * 20;
    smokeOverlayEl.style.opacity = maxOpacity.toString();
    smokeOverlayEl.style.display = 'block';
    smokeOverlayEl.style.backgroundPosition = offsetX + 'px ' + offsetY + 'px';
  } else {
    smokeOverlayEl.style.display = 'none';
  }
}

function animate() {
  requestAnimationFrame(animate);
  const deltaTime = clock.getDelta();

  // Tahap 19: Skip gameplay updates if dead (but keep rendering)
  if (!isPlayerDead) {
    updateCrouch(deltaTime);
    updateSprint(deltaTime);
    updateMovement(deltaTime);
    updateJump(deltaTime);
    updateShooting(deltaTime);  // Tahap 10
    updateGrenades(deltaTime);  // Tahap 11
    updateFist(deltaTime);     // Tahap 12
    updateKnife(deltaTime);    // Tahap 13
    updatePistol(deltaTime);   // Tahap 14
    updateShotgun(deltaTime);  // Tahap 15
    updateSniper(deltaTime);   // Tahap 16
    updateRifle(deltaTime);    // Tahap 16+: Rifle/SMG
    updateWeaponSwitch(deltaTime); // Tahap 17: Weapon switch animation
    updateDroppedWeapons(deltaTime); // Tahap 17: Dropped weapon bob
    checkWeaponPickups();          // Tahap 17: Pickup detection
    updateFallDamage();            // Tahap 19: Fall damage check
  }
  updateSmokeClouds(deltaTime); // Tahap 11: Always update (even when dead, for visual)
  updateSmokeOverlay();      // Tahap 11 fix: screen-space smoke overlay
  updateDeathAndRespawn(deltaTime); // Tahap 19: Death/respawn timer
  updateCrosshair();
  updateDebugInfo(deltaTime);

  renderer.render(scene, camera);
}

// ── Debug Info ──────────────────────────────────────────────
function updateDebugInfo(deltaTime) {
  if (!debugInfo) return;

  const fps = deltaTime > 0 ? (1 / deltaTime).toFixed(0) : '—';
  const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z).toFixed(1);

  const keysPressed = [];
  if (keys.w) keysPressed.push('W');
  if (keys.a) keysPressed.push('A');
  if (keys.s) keysPressed.push('S');
  if (keys.d) keysPressed.push('D');
  if (keys.space) keysPressed.push('SPACE');
  if (keys.shift) keysPressed.push('SHIFT');
  if (keys.c) keysPressed.push('C');
  if (keys.control) keysPressed.push('CTRL');
  if (keys.g) keysPressed.push('G');
  if (keys.h) keysPressed.push('H');

  let stanceLabel;
  switch (stance) {
    case 'standing':  stanceLabel = isSprinting ? 'SPRINTING' : isExhausted ? 'EXHAUSTED' : 'STANDING'; break;
    case 'crouching': stanceLabel = 'CROUCHING'; break;
    case 'crawling':  stanceLabel = 'CRAWLING';  break;
  }

  let speedLabel;
  switch (stance) {
    case 'crawling':  speedLabel = 'CRAW';  break;
    case 'crouching': speedLabel = 'CROUCH'; break;
    default:          speedLabel = isSprinting ? 'SPRINT' : 'WALK'; break;
  }

  const yawDeg = ((yaw * 180 / Math.PI) % 360).toFixed(0);
  const pitchDeg = (pitch * 180 / Math.PI).toFixed(0);

  const weaponLabel = weaponInventory.slots[weaponInventory.currentSlot] || '—';
  const weaponCount = itemDataLoaded ? countWeapons() : 0;

  // Tahap 10: Show ammo and reload status
  const currentWeapon = getCurrentWeapon();
  let ammoInfo = '';
  if (currentWeapon && currentWeapon.data.magazine) {
    const wId = currentWeapon.id;
    ammoInfo = ' | Ammo: ' + (weaponInventory.ammo[wId] || 0) + '/' + (weaponInventory.reserveAmmo[wId] || 0);
  }
  if (isReloading) ammoInfo += ' [RELOADING]';

  // Tahap 11: Grenade count
  const grenadeInfo = 'Frag: ' + weaponInventory.grenadeFrag + ' Smoke: ' + weaponInventory.grenadeSmoke;

  // Tahap 12: Fist status
  const fistInfo = isFistPunching ? ' | Punch: ' + fistSide.toUpperCase() : '';
  
  // Tahap 14: Pistol variant info
  const pistolInfo = (weaponLabel === 'glock' || weaponLabel === 'revolver' || weaponLabel === 'deagle') 
    ? ' | Pistol: ' + weaponLabel.toUpperCase() + ' (Q=switch)' : '';

  // Tahap 15: Shotgun variant info
  const shotgunInfo = (weaponLabel === 'pump_shotgun' || weaponLabel === 'auto_shotgun')
    ? ' | Shotgun: ' + weaponLabel.toUpperCase() + ' (Q=switch)' : '';

  // Tahap 16: Sniper variant info
  const sniperInfo = (weaponLabel === 'bolt_sniper' || weaponLabel === 'semi_sniper')
    ? ' | Sniper: ' + weaponLabel.toUpperCase() + (isSniperScoping ? ' [SCOPING]' : '') + ' (Q=switch, RMB=scope)' : '';

  // Tahap 18: Armor info
  const armorInfo = ' | DEF: ' + getTotalDefense() + ' SPD: ' + (armorSpeedBonus >= 0 ? '+' : '') + armorSpeedBonus.toFixed(1);

  // Tahap 19: HP info
  const hpInfo = ' | HP: ' + Math.round(playerHP) + '/' + playerMaxHP + (isPlayerDead ? ' [DEAD]' : '');

  debugInfo.innerHTML =
    'TAHAP 19 — HP & Damage' + armorInfo + hpInfo + '<br>' +
    'FPS: ' + fps + ' | Speed: ' + speed + ' u/s [' + speedLabel + ']<br>' +
    'Pos: (' + camera.position.x.toFixed(1) + ', ' + camera.position.y.toFixed(1) + ', ' + camera.position.z.toFixed(1) + ')<br>' +
    'Yaw: ' + yawDeg + ' | Pitch: ' + pitchDeg + '<br>' +
    'Stance: ' + stanceLabel + ' | ' + (isGrounded ? 'GROUNDED' : 'AIRBORNE') + '<br>' +
    'Walls: ' + collidableBoxes.length + ' | Stamina: ' + Math.round(stamina) + '%<br>' +
    'Weapon: ' + weaponLabel + ammoInfo + ' | Items: ' + weaponCount + '<br>' +
    'Grenade: ' + grenadeInfo + ' | Active: ' + activeGrenades.length + (isGrenadeAiming ? ' [AIMING]' : '') + '<br>' +
    'Keys: ' + (keysPressed.length > 0 ? keysPressed.join('+') : '—') + fistInfo + pistolInfo + shotgunInfo + sniperInfo + '<br>' +
    'Test: F5=20dmg | F6=Headshot(40dmg) | F7=Kill(100dmg)';
}

// ── Entry Point ─────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
