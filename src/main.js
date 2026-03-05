import * as THREE from 'three';

// Cache-bust all local module imports during development
const v = Date.now();
const [
    { TrackSpline },
    { TrackGeometry },
    { TrackEnvironment },
    { TrackMarkers },
    { Sled },
    { Athletes },
    { ChaseCamera },
    { InputManager },
    { SledPhysics },
    { GameStateManager, GameState },
    { HUD },
    { AudioManager }
] = await Promise.all([
    import('./track/TrackSpline.js?v=' + v),
    import('./track/TrackGeometry.js?v=' + v),
    import('./track/TrackEnvironment.js?v=' + v),
    import('./track/TrackMarkers.js?v=' + v),
    import('./entities/Sled.js?v=' + v),
    import('./entities/Athletes.js?v=' + v),
    import('./camera/ChaseCamera.js?v=' + v),
    import('./core/InputManager.js?v=' + v),
    import('./physics/SledPhysics.js?v=' + v),
    import('./core/GameStateManager.js?v=' + v),
    import('./ui/HUD.js?v=' + v),
    import('./core/AudioManager.js?v=' + v)
]);

// --- Renderer ---
const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb0d4f1);
scene.fog = new THREE.FogExp2(0xcce0ff, 0.0008);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    5000
);

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0x8899bb, 0.5);
scene.add(ambientLight);

const hemiLight = new THREE.HemisphereLight(0xaaddff, 0x997744, 0.6);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
sunLight.position.set(50, 80, 30);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 300;
sunLight.shadow.camera.left = -60;
sunLight.shadow.camera.right = 60;
sunLight.shadow.camera.top = 60;
sunLight.shadow.camera.bottom = -60;
scene.add(sunLight);
scene.add(sunLight.target);

// --- Track ---
const trackSpline = new TrackSpline();
console.log(`Track length: ${trackSpline.totalLength.toFixed(0)}m`);

const trackGeometry = new TrackGeometry(trackSpline);
trackGeometry.addToScene(scene);

// --- Environment (terrain, trees, mountains, sky) ---
const trackEnvironment = new TrackEnvironment(trackSpline);
trackEnvironment.addToScene(scene);

// --- Track markers (start/finish lines, curve numbers, checkpoint gates) ---
const trackMarkers = new TrackMarkers(trackSpline);
trackMarkers.addToScene(scene);

// --- Sled ---
const sled = new Sled();
sled.addToScene(scene);
sled.placeOnTrack(trackSpline, 0);

// --- Athletes (push start figures) ---
const athletes = new Athletes();
athletes.attachToSled(sled.group);

// --- Systems ---
const inputManager = new InputManager();
const sledPhysics = new SledPhysics(trackSpline);
const chaseCamera = new ChaseCamera(camera);
const hud = new HUD();
const audioManager = new AudioManager();

const gameState = new GameStateManager({
    trackSpline,
    sledPhysics,
    sled,
    athletes,
    chaseCamera,
    inputManager,
    hud,
    audioManager
});

// Position camera at start for menu view
const startPos = trackSpline.getPointAt(0.02);
camera.position.copy(startPos).add(new THREE.Vector3(8, 6, 12));
camera.lookAt(startPos);

// --- Clock ---
const clock = new THREE.Clock();

// --- Resize handler ---
function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

// --- Mute toggle (M key) ---
window.addEventListener('keydown', (e) => {
    if (e.key === 'm' || e.key === 'M') {
        const muted = audioManager.toggleMute();
        console.log(muted ? 'Audio muted' : 'Audio unmuted');
    }
});

// --- Shadow camera follows sled ---
function updateShadowCamera() {
    const sledPos = sled.group.position;
    sunLight.position.set(sledPos.x + 50, sledPos.y + 80, sledPos.z + 30);
    sunLight.target.position.copy(sledPos);
    sunLight.target.updateMatrixWorld();
}

// --- Animation loop ---
function animate() {
    requestAnimationFrame(animate);
    let dt = clock.getDelta();

    // Update game state (may modify dt for slow-mo)
    const effectiveDt = gameState.update(dt);

    // Update sled visual effects
    sled.update(effectiveDt);

    // Update chase camera (only during active gameplay)
    if (gameState.state !== GameState.MENU && gameState.state !== GameState.COUNTRY_SELECT && gameState.state !== GameState.RESULTS) {
        chaseCamera.update(effectiveDt, trackSpline, sledPhysics.t, sledPhysics.speed, sled.group);
        updateShadowCamera();
    }

    renderer.render(scene, camera);
}

animate();

// Debug: expose key objects for inspection
window._debug = { scene, sled, athletes, gameState, sledPhysics, trackSpline, camera };

console.log('Game initialized');
