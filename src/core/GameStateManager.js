import {
    COUNTDOWN_DURATION,
    PUSH_DISTANCE,
    PUSH_OPTIMAL_BPS,
    PUSH_MAX_SPEED,
    PUSH_MIN_SPEED,
    PUSH_SPEED_INCREMENT,
    PUSH_ACCELERATION,
    FINISH_SLOWMO_DURATION,
    FINISH_SLOWMO_FACTOR,
    TRACK_WIDTH
} from '../constants.js';
import { clamp, lerp } from '../utils/math.js';
import { COUNTRIES } from '../data/CountryConfig.js';

/**
 * Game states: MENU, COUNTDOWN, PUSH_START, RACING, FINISH, RESULTS
 */
export const GameState = {
    MENU: 'MENU',
    COUNTRY_SELECT: 'COUNTRY_SELECT',
    COUNTDOWN: 'COUNTDOWN',
    PUSH_START: 'PUSH_START',
    RACING: 'RACING',
    FINISH: 'FINISH',
    RESULTS: 'RESULTS'
};

/**
 * Manages game state transitions and per-state update logic.
 */
export class GameStateManager {
    constructor({ trackSpline, sledPhysics, sled, athletes, chaseCamera, inputManager, hud, audioManager }) {
        this.trackSpline = trackSpline;
        this.physics = sledPhysics;
        this.sled = sled;
        this.athletes = athletes;
        this.camera = chaseCamera;
        this.input = inputManager;
        this.hud = hud;
        this.audio = audioManager;

        this.state = GameState.MENU;
        this.stateTimer = 0;
        this.raceTimer = 0;
        this.countdownNumber = 0;
        this.pushSpeed = 0;
        this.splitTimes = [];
        this.nextCheckpoint = 0;
        this.finishTime = 0;
        this.bestTime = this._loadBestTime();
        this.bestSplits = this._loadBestSplits();

        // Country selection
        this.selectedCountryIndex = 0;
        this.selectedCountry = COUNTRIES[0];

        // DOM references
        this.menuScreen = document.getElementById('menu-screen');
        this.resultsScreen = document.getElementById('results-screen');
        this.countdownOverlay = document.getElementById('countdown-overlay');
        this.countdownText = document.getElementById('countdown-text');
        this.hudEl = document.getElementById('hud');
        this.countrySelectScreen = document.getElementById('country-select-screen');

        this._showMenu();
    }

    /**
     * Main update, called every frame.
     * @param {number} dt - raw delta time
     * @returns {number} effective dt (may be scaled for slow-mo)
     */
    update(dt) {
        this.stateTimer += dt;

        switch (this.state) {
            case GameState.MENU:
                return this._updateMenu(dt);
            case GameState.COUNTRY_SELECT:
                return this._updateCountrySelect(dt);
            case GameState.COUNTDOWN:
                return this._updateCountdown(dt);
            case GameState.PUSH_START:
                return this._updatePushStart(dt);
            case GameState.RACING:
                return this._updateRacing(dt);
            case GameState.FINISH:
                return this._updateFinish(dt);
            case GameState.RESULTS:
                return this._updateResults(dt);
        }
        return dt;
    }

    _transitionTo(newState) {
        this.state = newState;
        this.stateTimer = 0;
    }

    // === MENU ===

    _showMenu() {
        this.menuScreen.classList.remove('hidden');
        this.resultsScreen.classList.add('hidden');
        this.countdownOverlay.classList.add('hidden');
        this.countrySelectScreen.classList.add('hidden');
        this.hudEl.style.display = 'none';

        // Show best time
        const bestTimeEl = document.getElementById('best-time');
        if (this.bestTime < Infinity) {
            bestTimeEl.textContent = `Best Time: ${this._formatTime(this.bestTime)}`;
        } else {
            bestTimeEl.textContent = '';
        }
    }

    _updateMenu(dt) {
        if (this.input.isEnterPressed()) {
            // Initialize audio on first user gesture
            if (this.audio) {
                this.audio.init();
                this.audio.resume();
            }

            this.menuScreen.classList.add('hidden');
            this._showCountrySelect();
            this._transitionTo(GameState.COUNTRY_SELECT);
        }
        return dt;
    }

    // === COUNTRY SELECT ===

    _showCountrySelect() {
        this.countrySelectScreen.classList.remove('hidden');

        // Populate grid dynamically from COUNTRIES data
        const grid = document.getElementById('country-grid');
        grid.innerHTML = COUNTRIES.map((country, i) => {
            const p = country.sled.primary.toString(16).padStart(6, '0');
            const s = country.sled.secondary.toString(16).padStart(6, '0');
            const a = country.sled.accent.toString(16).padStart(6, '0');
            return `
                <div class="country-item ${i === this.selectedCountryIndex ? 'selected' : ''}" data-index="${i}">
                    <span class="country-flag">${country.flag}</span>
                    <span class="country-name">${country.name}</span>
                    <div class="color-preview">
                        <span class="swatch" style="background:#${p}"></span>
                        <span class="swatch" style="background:#${s}"></span>
                        <span class="swatch" style="background:#${a}"></span>
                    </div>
                </div>
            `;
        }).join('');
    }

    _renderCountryGrid() {
        const items = document.querySelectorAll('#country-grid .country-item');
        items.forEach((item, i) => {
            item.classList.toggle('selected', i === this.selectedCountryIndex);
        });
    }

    _updateCountrySelect(dt) {
        // Arrow key navigation (4x2 grid)
        if (this.input.isKeyConsumed('ArrowLeft')) {
            this.selectedCountryIndex = (this.selectedCountryIndex - 1 + COUNTRIES.length) % COUNTRIES.length;
            this._renderCountryGrid();
        }
        if (this.input.isKeyConsumed('ArrowRight')) {
            this.selectedCountryIndex = (this.selectedCountryIndex + 1) % COUNTRIES.length;
            this._renderCountryGrid();
        }
        if (this.input.isKeyConsumed('ArrowUp')) {
            this.selectedCountryIndex = (this.selectedCountryIndex - 4 + COUNTRIES.length) % COUNTRIES.length;
            this._renderCountryGrid();
        }
        if (this.input.isKeyConsumed('ArrowDown')) {
            this.selectedCountryIndex = (this.selectedCountryIndex + 4) % COUNTRIES.length;
            this._renderCountryGrid();
        }

        // Confirm selection
        if (this.input.isEnterPressed()) {
            this.selectedCountry = COUNTRIES[this.selectedCountryIndex];

            // Apply colors to sled and athletes
            this.sled.applyColors(this.selectedCountry.sled);
            if (this.athletes) this.athletes.applyColors(this.selectedCountry.athlete);

            // Hide country select, show countdown
            this.countrySelectScreen.classList.add('hidden');
            this.countdownOverlay.classList.remove('hidden');
            this.countdownNumber = COUNTDOWN_DURATION;
            this.countdownText.textContent = this.countdownNumber;

            // Reset game state
            this.physics.reset(0, 0);
            this.sled.placeOnTrack(this.trackSpline, 0, 0, TRACK_WIDTH / 2);
            this.camera.initialized = false;
            this.camera.setPushPhase(true);
            this.raceTimer = 0;
            this.splitTimes = [];
            this.nextCheckpoint = 0;
            this.pushSpeed = 0;
            this.input.reset();

            // Show athletes at push position
            if (this.athletes) this.athletes.show();

            this._transitionTo(GameState.COUNTDOWN);
        }

        // ESC to go back to menu
        if (this.input.isKeyConsumed('Escape')) {
            this.countrySelectScreen.classList.add('hidden');
            this._showMenu();
            this._transitionTo(GameState.MENU);
        }

        return dt;
    }

    // === COUNTDOWN ===

    _updateCountdown(dt) {
        const newNumber = Math.ceil(COUNTDOWN_DURATION - this.stateTimer);
        if (newNumber !== this.countdownNumber && newNumber > 0) {
            this.countdownNumber = newNumber;
            this.countdownText.textContent = newNumber;
            if (this.audio) this.audio.playCountdownBeep(false);
        }

        if (this.stateTimer >= COUNTDOWN_DURATION) {
            this.countdownText.textContent = 'GO!';
            if (this.audio) this.audio.playCountdownBeep(true);
            setTimeout(() => {
                this.countdownOverlay.classList.add('hidden');
            }, 500);

            this.hudEl.style.display = 'block';
            this._transitionTo(GameState.PUSH_START);
        }
        return dt;
    }

    // === PUSH START ===

    _updatePushStart(dt) {
        this.raceTimer += dt;

        // Mash-based speed building
        const mashRate = this.input.getMashRate();
        const accuracy = this.input.getMashAccuracy(PUSH_OPTIMAL_BPS);

        if (mashRate > 0) {
            this.pushSpeed += accuracy * PUSH_SPEED_INCREMENT * dt * 10;
            // Play push grunt on new mashes
            if (this.audio && this.input.hasNewMash()) {
                this.audio.playPushGrunt();
            }
        }

        // Base acceleration (sled is being pushed regardless)
        this.pushSpeed += PUSH_ACCELERATION * dt;
        this.pushSpeed = clamp(this.pushSpeed, 0, PUSH_MAX_SPEED);

        // Move sled forward
        this.physics.speed = this.pushSpeed;
        const distanceDelta = this.pushSpeed * dt;
        this.physics.distance += distanceDelta;
        this.physics.t = this.physics.distance / this.trackSpline.totalLength;

        // Place sled
        this.sled.placeOnTrack(this.trackSpline, this.physics.t, 0, TRACK_WIDTH / 2);

        // Update HUD
        this.hud.updateSpeed(this.pushSpeed * 3.6);
        this.hud.updateTime(this.raceTimer);
        this.hud.updateProgress(this.physics.t / this.trackSpline.finishT);

        // Animate athletes running alongside sled
        if (this.athletes) {
            this.athletes.update(dt, this.pushSpeed, this.physics.distance);
        }

        // Check if push distance reached
        if (this.physics.distance >= PUSH_DISTANCE) {
            this.camera.setPushPhase(false);
            // Ensure minimum push speed
            this.physics.speed = Math.max(this.pushSpeed, PUSH_MIN_SPEED);

            // Athletes jump into the sled
            if (this.athletes) this.athletes.startJumpIn();

            this._transitionTo(GameState.RACING);
        }

        return dt;
    }

    // === RACING ===

    _updateRacing(dt) {
        this.raceTimer += dt;

        // Continue jump-in animation if still active
        if (this.athletes) {
            this.athletes.update(dt, this.physics.speed, this.physics.distance);
        }

        // Get steering input
        const steering = this.input.getSteeringInput();

        // Step physics
        const result = this.physics.update(dt, steering);

        // Wall hit feedback
        if (result.wallHit) {
            this.sled.triggerWallHit(result.wallHitSide);
            this.camera.triggerShake();
            if (this.audio) this.audio.playWallHit();
        }

        // Place sled with lateral offset
        const leanAngle = -steering * 0.15; // visual lean
        this.sled.setLean(leanAngle);
        this.sled.placeOnTrack(
            this.trackSpline,
            this.physics.t,
            this.physics.lateralOffset,
            TRACK_WIDTH / 2
        );

        // Update HUD
        this.hud.updateSpeed(this.physics.speedKmh);
        this.hud.updateTime(this.raceTimer);
        this.hud.updateProgress(this.physics.t / this.trackSpline.finishT);

        // Update continuous audio (runner hiss, wind)
        if (this.audio) this.audio.updateSpeed(this.physics.speedKmh);

        // Check split times
        this._checkSplits();

        // Check finish
        if (this.physics.t >= this.trackSpline.finishT) {
            this.finishTime = this.raceTimer;
            if (this.audio) {
                this.audio.silenceContinuous();
                this.audio.playFinishFanfare();
            }
            this._transitionTo(GameState.FINISH);
        }

        return dt;
    }

    _checkSplits() {
        const checkpoints = this.trackSpline.checkpoints;
        if (this.nextCheckpoint >= checkpoints.length) return;

        const cp = checkpoints[this.nextCheckpoint];
        if (this.physics.t >= cp.t) {
            const splitTime = this.raceTimer;
            this.splitTimes.push({ id: cp.id, name: cp.name, time: splitTime });

            // Compare with best
            let diff = null;
            if (this.bestSplits[this.nextCheckpoint] !== undefined) {
                diff = splitTime - this.bestSplits[this.nextCheckpoint];
            }

            this.hud.showSplit(cp.name, splitTime, diff);
            this.nextCheckpoint++;
        }
    }

    // === FINISH ===

    _updateFinish(dt) {
        // Slow-mo effect
        const effectiveDt = dt * FINISH_SLOWMO_FACTOR;
        this.physics.speed *= 0.98; // gradual deceleration

        // Keep moving the sled
        this.physics.distance += this.physics.speed * effectiveDt;
        this.physics.t = this.physics.distance / this.trackSpline.totalLength;
        this.sled.placeOnTrack(
            this.trackSpline,
            Math.min(this.physics.t, 1),
            this.physics.lateralOffset,
            TRACK_WIDTH / 2
        );

        this.hud.updateSpeed(this.physics.speedKmh);

        if (this.stateTimer >= FINISH_SLOWMO_DURATION) {
            this._showResults();
            this._transitionTo(GameState.RESULTS);
        }

        return effectiveDt;
    }

    // === RESULTS ===

    _showResults() {
        this.hudEl.style.display = 'none';
        this.resultsScreen.classList.remove('hidden');

        document.getElementById('results-time').textContent = this._formatTime(this.finishTime);

        // Split times
        const splitsEl = document.getElementById('results-splits');
        splitsEl.innerHTML = this.splitTimes.map((s, i) => {
            let diffStr = '';
            if (this.bestSplits[i] !== undefined) {
                const diff = s.time - this.bestSplits[i];
                const sign = diff >= 0 ? '+' : '';
                const color = diff <= 0 ? '#4cff4c' : '#ff4c4c';
                diffStr = ` <span style="color:${color}">${sign}${diff.toFixed(3)}</span>`;
            }
            return `${s.name}: ${this._formatTime(s.time)}${diffStr}`;
        }).join('<br>');

        // New record?
        const recordEl = document.getElementById('results-record');
        if (this.finishTime < this.bestTime) {
            recordEl.textContent = 'NEW RECORD!';
            this.bestTime = this.finishTime;
            this.bestSplits = this.splitTimes.map(s => s.time);
            this._saveBestTime();
            this._saveBestSplits();
        } else {
            recordEl.textContent = '';
        }
    }

    _updateResults(dt) {
        if (this.input.isEnterPressed()) {
            this.resultsScreen.classList.add('hidden');
            if (this.audio) this.audio.silenceContinuous();
            this._showMenu();
            this._transitionTo(GameState.MENU);
        }
        return dt;
    }

    // === TIME FORMATTING ===

    _formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toFixed(3).padStart(6, '0')}`;
    }

    // === LOCAL STORAGE ===

    _loadBestTime() {
        const val = localStorage.getItem('bobsled_best_time');
        return val ? parseFloat(val) : Infinity;
    }

    _saveBestTime() {
        localStorage.setItem('bobsled_best_time', this.bestTime.toString());
    }

    _loadBestSplits() {
        const val = localStorage.getItem('bobsled_best_splits');
        return val ? JSON.parse(val) : [];
    }

    _saveBestSplits() {
        localStorage.setItem('bobsled_best_splits', JSON.stringify(this.bestSplits));
    }
}
