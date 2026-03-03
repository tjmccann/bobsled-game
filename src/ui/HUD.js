import { SPLIT_DISPLAY_DURATION } from '../constants.js';

/**
 * DOM-based HUD overlay: speed, time, split times, track progress.
 */
export class HUD {
    constructor() {
        this.timeEl = document.getElementById('hud-time');
        this.speedEl = document.getElementById('hud-speed');
        this.splitEl = document.getElementById('hud-split');
        this.progressFill = document.getElementById('hud-progress-fill');
        this.splitTimer = 0;
    }

    updateSpeed(kmh) {
        this.speedEl.innerHTML = `${Math.round(kmh)} <span class="unit">km/h</span>`;
    }

    updateTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        this.timeEl.textContent = `${mins}:${secs.toFixed(3).padStart(6, '0')}`;
    }

    updateProgress(fraction) {
        this.progressFill.style.width = `${Math.min(100, fraction * 100)}%`;
    }

    /**
     * Show a split time notification.
     * @param {string} name - checkpoint name
     * @param {number} time - split time in seconds
     * @param {number|null} diff - difference from best (null if no best)
     */
    showSplit(name, time, diff) {
        const mins = Math.floor(time / 60);
        const secs = time % 60;
        const timeStr = `${mins}:${secs.toFixed(3).padStart(6, '0')}`;

        let html = `${name}: ${timeStr}`;

        if (diff !== null) {
            const sign = diff >= 0 ? '+' : '';
            const className = diff <= 0 ? 'ahead' : 'behind';
            html += ` (${sign}${diff.toFixed(3)})`;
            this.splitEl.className = `visible ${className}`;
        } else {
            this.splitEl.className = 'visible';
        }

        this.splitEl.innerHTML = html;

        // Auto-hide after duration
        clearTimeout(this._splitTimeout);
        this._splitTimeout = setTimeout(() => {
            this.splitEl.className = '';
        }, SPLIT_DISPLAY_DURATION * 1000);
    }

    reset() {
        this.updateSpeed(0);
        this.updateTime(0);
        this.updateProgress(0);
        this.splitEl.className = '';
        this.splitEl.innerHTML = '';
    }
}
