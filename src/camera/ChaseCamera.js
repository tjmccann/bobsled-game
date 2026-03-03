import * as THREE from 'three';
import {
    CAMERA_OFFSET_RACING,
    CAMERA_OFFSET_PUSH,
    CAMERA_LERP_POSITION,
    CAMERA_LERP_LOOKAT,
    CAMERA_LOOK_AHEAD_T,
    CAMERA_FOV_MIN,
    CAMERA_FOV_MAX,
    CAMERA_SHAKE_DURATION,
    CAMERA_SHAKE_INTENSITY
} from '../constants.js';
import { lerp } from '../utils/math.js';

/**
 * Smooth chase camera that follows the sled along the track.
 * Features: lerp-based following, look-ahead, speed-dependent FOV, wall-hit shake.
 */
export class ChaseCamera {
    constructor(camera) {
        this.camera = camera;
        this.smoothLookTarget = new THREE.Vector3();
        this.smoothPosition = new THREE.Vector3();
        this.shakeTimer = 0;
        this.isPushPhase = true;
        this.initialized = false;
    }

    /**
     * Set whether we're in push phase (wider view) or racing (tight view).
     */
    setPushPhase(isPush) {
        this.isPushPhase = isPush;
    }

    /**
     * Trigger camera shake (on wall hit).
     */
    triggerShake() {
        this.shakeTimer = CAMERA_SHAKE_DURATION;
    }

    /**
     * Update camera position and orientation.
     * @param {number} dt - delta time
     * @param {TrackSpline} trackSpline
     * @param {number} t - sled's parametric position on track
     * @param {number} speed - sled speed in m/s
     * @param {THREE.Group} sledGroup - the sled's 3D group for position/quaternion
     */
    update(dt, trackSpline, t, speed, sledGroup) {
        const offset = this.isPushPhase ? CAMERA_OFFSET_PUSH : CAMERA_OFFSET_RACING;

        // Desired position: behind and above the sled in sled's local space
        const offsetVec = new THREE.Vector3(offset[0], offset[1], offset[2]);
        offsetVec.applyQuaternion(sledGroup.quaternion);
        const desiredPos = sledGroup.position.clone().add(offsetVec);

        // Look-ahead target: a point slightly ahead on the track
        const aheadT = Math.min(1, t + CAMERA_LOOK_AHEAD_T);
        const lookAheadPos = trackSpline.getPointAt(aheadT);

        if (!this.initialized) {
            // Snap to position on first frame
            this.smoothPosition.copy(desiredPos);
            this.smoothLookTarget.copy(lookAheadPos);
            this.camera.position.copy(desiredPos);
            this.camera.lookAt(lookAheadPos);
            this.initialized = true;
            return;
        }

        // Smooth interpolation
        this.smoothPosition.lerp(desiredPos, CAMERA_LERP_POSITION);
        this.smoothLookTarget.lerp(lookAheadPos, CAMERA_LERP_LOOKAT);

        this.camera.position.copy(this.smoothPosition);

        // Camera shake
        if (this.shakeTimer > 0) {
            const intensity = (this.shakeTimer / CAMERA_SHAKE_DURATION) * CAMERA_SHAKE_INTENSITY;
            this.camera.position.x += (Math.random() - 0.5) * intensity;
            this.camera.position.y += (Math.random() - 0.5) * intensity * 0.5;
            this.shakeTimer -= dt;
        }

        this.camera.lookAt(this.smoothLookTarget);

        // Speed-dependent FOV
        const maxSpeed = 45; // ~162 km/h
        const speedRatio = Math.min(1, speed / maxSpeed);
        const targetFov = lerp(CAMERA_FOV_MIN, CAMERA_FOV_MAX, speedRatio);
        this.camera.fov = lerp(this.camera.fov, targetFov, 0.05);
        this.camera.updateProjectionMatrix();
    }
}
