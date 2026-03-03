/**
 * Audio manager using the Web Audio API.
 * All sounds are procedurally generated — no external audio files needed.
 *
 * Sounds:
 *   - Runner hiss: continuous noise filtered to high-frequency, volume scales with speed
 *   - Wind: low-frequency noise, volume scales with speed
 *   - Wall hit: sharp impact noise burst
 *   - Countdown beep: sine tone (different pitch for GO!)
 *   - Push grunt: short noise burst on each spacebar press
 *   - Finish fanfare: ascending tones
 */
export class AudioManager {
    constructor() {
        this.ctx = null;        // AudioContext, created on first user interaction
        this.masterGain = null;
        this.runnerGain = null;
        this.windGain = null;
        this.runnerFilter = null;
        this.windFilter = null;
        this.runnerNode = null;
        this.windNode = null;
        this.initialized = false;
        this.muted = false;
    }

    /**
     * Initialize AudioContext (must be called from a user gesture).
     */
    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.5;
            this.masterGain.connect(this.ctx.destination);

            this._setupRunnerHiss();
            this._setupWind();

            this.initialized = true;
        } catch (e) {
            console.warn('AudioManager: Web Audio API not available', e);
        }
    }

    /**
     * Resume context if suspended (browsers require user gesture).
     */
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // === CONTINUOUS SOUNDS ===

    /**
     * High-frequency noise simulating runner contact on ice.
     */
    _setupRunnerHiss() {
        // White noise source
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        this.runnerNode = this.ctx.createBufferSource();
        this.runnerNode.buffer = buffer;
        this.runnerNode.loop = true;

        // Bandpass filter for metallic hiss
        this.runnerFilter = this.ctx.createBiquadFilter();
        this.runnerFilter.type = 'bandpass';
        this.runnerFilter.frequency.value = 4000;
        this.runnerFilter.Q.value = 0.8;

        this.runnerGain = this.ctx.createGain();
        this.runnerGain.gain.value = 0;

        this.runnerNode.connect(this.runnerFilter);
        this.runnerFilter.connect(this.runnerGain);
        this.runnerGain.connect(this.masterGain);
        this.runnerNode.start();
    }

    /**
     * Low-frequency wind noise that increases with speed.
     */
    _setupWind() {
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        this.windNode = this.ctx.createBufferSource();
        this.windNode.buffer = buffer;
        this.windNode.loop = true;

        this.windFilter = this.ctx.createBiquadFilter();
        this.windFilter.type = 'lowpass';
        this.windFilter.frequency.value = 400;
        this.windFilter.Q.value = 1.0;

        this.windGain = this.ctx.createGain();
        this.windGain.gain.value = 0;

        this.windNode.connect(this.windFilter);
        this.windFilter.connect(this.windGain);
        this.windGain.connect(this.masterGain);
        this.windNode.start();
    }

    /**
     * Update continuous sounds based on current speed.
     * @param {number} speedKmh - current speed in km/h
     */
    updateSpeed(speedKmh) {
        if (!this.initialized || this.muted) return;

        const speedNorm = Math.min(speedKmh / 140, 1); // normalize to 0-1

        // Runner hiss: starts quiet, gets louder with speed
        if (this.runnerGain) {
            this.runnerGain.gain.setTargetAtTime(
                speedNorm * 0.12,
                this.ctx.currentTime, 0.1
            );
        }

        // Runner pitch increases with speed
        if (this.runnerFilter) {
            this.runnerFilter.frequency.setTargetAtTime(
                2000 + speedNorm * 6000,
                this.ctx.currentTime, 0.1
            );
        }

        // Wind: louder at high speed
        if (this.windGain) {
            this.windGain.gain.setTargetAtTime(
                speedNorm * speedNorm * 0.15,
                this.ctx.currentTime, 0.1
            );
        }

        // Wind filter opens up with speed
        if (this.windFilter) {
            this.windFilter.frequency.setTargetAtTime(
                200 + speedNorm * 800,
                this.ctx.currentTime, 0.1
            );
        }
    }

    /**
     * Silence continuous sounds (e.g., when race ends).
     */
    silenceContinuous() {
        if (!this.initialized) return;
        if (this.runnerGain) {
            this.runnerGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
        }
        if (this.windGain) {
            this.windGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
        }
    }

    // === ONE-SHOT SOUNDS ===

    /**
     * Play a countdown beep.
     * @param {boolean} isFinal - true for the "GO!" beep (higher pitch)
     */
    playCountdownBeep(isFinal = false) {
        if (!this.initialized || this.muted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = isFinal ? 880 : 440;

        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (isFinal ? 0.5 : 0.15));

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + (isFinal ? 0.5 : 0.15));
    }

    /**
     * Play wall hit impact sound.
     */
    playWallHit() {
        if (!this.initialized || this.muted) return;

        // Short burst of filtered noise
        const bufferSize = this.ctx.sampleRate * 0.15;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            // Decaying noise
            const decay = 1 - i / bufferSize;
            data[i] = (Math.random() * 2 - 1) * decay * decay;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2000;

        const gain = this.ctx.createGain();
        gain.gain.value = 0.4;

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        source.start();

        // Also add a low thud
        const thud = this.ctx.createOscillator();
        const thudGain = this.ctx.createGain();
        thud.type = 'sine';
        thud.frequency.setValueAtTime(100, this.ctx.currentTime);
        thud.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.1);
        thudGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        thudGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
        thud.connect(thudGain);
        thudGain.connect(this.masterGain);
        thud.start();
        thud.stop(this.ctx.currentTime + 0.15);
    }

    /**
     * Play push grunt sound (on spacebar mash).
     */
    playPushGrunt() {
        if (!this.initialized || this.muted) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.value = 80 + Math.random() * 30;

        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
    }

    /**
     * Play finish fanfare — ascending tones.
     */
    playFinishFanfare() {
        if (!this.initialized || this.muted) return;

        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.value = freq;

            const startTime = this.ctx.currentTime + i * 0.15;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(startTime);
            osc.stop(startTime + 0.4);
        });
    }

    /**
     * Toggle mute state.
     */
    toggleMute() {
        this.muted = !this.muted;
        if (this.masterGain) {
            this.masterGain.gain.value = this.muted ? 0 : 0.5;
        }
        return this.muted;
    }
}
