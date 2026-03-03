/**
 * Tracks keyboard input state: keys held, mash rate, steering direction.
 */
export class InputManager {
    constructor() {
        this.keysDown = new Set();
        this.mashTimestamps = []; // timestamps of spacebar presses (last 1 second)
        this._newMashCount = 0;   // count of new mashes since last check
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);

        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);
    }

    _onKeyDown(e) {
        if (e.repeat) return;
        this.keysDown.add(e.key);

        // Track spacebar mash timestamps
        if (e.key === ' ') {
            this.mashTimestamps.push(performance.now());
            this._newMashCount++;
        }
    }

    _onKeyUp(e) {
        this.keysDown.delete(e.key);
    }

    /** Is a key currently held? */
    isDown(key) {
        return this.keysDown.has(key);
    }

    /** Was Enter just pressed? (check and clear) */
    isEnterPressed() {
        if (this.keysDown.has('Enter')) {
            this.keysDown.delete('Enter');
            return true;
        }
        return false;
    }

    /**
     * Get the mash rate (presses per second) over the last 1 second.
     * Also prunes old timestamps.
     */
    getMashRate() {
        const now = performance.now();
        const windowMs = 1000;
        // Prune old timestamps
        this.mashTimestamps = this.mashTimestamps.filter(t => now - t < windowMs);
        return this.mashTimestamps.length;
    }

    /**
     * Get the accuracy of the last mash press relative to the optimal rhythm.
     * Returns 0-1 (1 = perfect timing).
     * @param {number} optimalBPS - target beats per second
     */
    getMashAccuracy(optimalBPS) {
        const timestamps = this.mashTimestamps;
        if (timestamps.length < 2) return 0.5;

        const last = timestamps[timestamps.length - 1];
        const prev = timestamps[timestamps.length - 2];
        const interval = last - prev;
        const optimalInterval = 1000 / optimalBPS;

        const error = Math.abs(interval - optimalInterval) / optimalInterval;
        return Math.max(0, 1 - error);
    }

    /**
     * Get steering input: -1 (left), 0 (center), +1 (right).
     */
    getSteeringInput() {
        let input = 0;
        if (this.keysDown.has('ArrowLeft') || this.keysDown.has('a') || this.keysDown.has('A')) {
            input -= 1;
        }
        if (this.keysDown.has('ArrowRight') || this.keysDown.has('d') || this.keysDown.has('D')) {
            input += 1;
        }
        return input;
    }

    /**
     * Check if a new spacebar mash occurred since last check.
     * Resets the counter after checking.
     */
    hasNewMash() {
        if (this._newMashCount > 0) {
            this._newMashCount = 0;
            return true;
        }
        return false;
    }

    /** Clear all state. */
    reset() {
        this.keysDown.clear();
        this.mashTimestamps = [];
        this._newMashCount = 0;
    }

    dispose() {
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('keyup', this._onKeyUp);
    }
}
