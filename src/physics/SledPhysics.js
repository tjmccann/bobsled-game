import {
    GRAVITY,
    ICE_FRICTION,
    AIR_DRAG,
    STEERING_ACCEL,
    LATERAL_DAMPING,
    WALL_HIT_SPEED_PENALTY,
    WALL_BOUNCE,
    STEERING_SCRUB,
    BANKING_SCALE,
    BANKING_SPEED_BONUS,
    BANKING_PENALTY,
    BANKING_RESTORE,
    MAX_LATERAL_OFFSET,
    TRACK_WIDTH
} from '../constants.js';
import { clamp } from '../utils/math.js';

/**
 * 1D+1D physics model for the bobsled.
 * Longitudinal: speed along the track spline (gravity, friction, drag).
 * Lateral: offset across the track width (steering, banking, wall collision).
 */
export class SledPhysics {
    constructor(trackSpline) {
        this.trackSpline = trackSpline;
        this.reset();
    }

    reset(startT = 0, startSpeed = 0) {
        this.t = startT;                // parametric position on spline (0-1)
        this.speed = startSpeed;         // m/s along the track
        this.lateralOffset = 0;          // -1 to +1 (normalized track width)
        this.lateralVelocity = 0;        // m/s lateral
        this.wallHit = false;            // true on frame of wall collision
        this.wallHitSide = 0;            // -1 left, +1 right
        this.distance = startT * this.trackSpline.totalLength;
    }

    /**
     * Step the physics simulation.
     * @param {number} dt - time step in seconds
     * @param {number} steeringInput - -1 (left), 0, +1 (right)
     * @returns {{ wallHit: boolean, wallHitSide: number }}
     */
    update(dt, steeringInput) {
        this.wallHit = false;
        this.wallHitSide = 0;

        // Clamp dt to prevent physics explosion
        dt = Math.min(dt, 1 / 30);

        const totalLength = this.trackSpline.totalLength;

        // --- Longitudinal physics ---
        const slopeAngle = this.trackSpline.getSlopeAngleAt(this.t);
        const curvature = this.trackSpline.getCurvatureAt(this.t);

        // Gravity component (positive = accelerating when going downhill)
        const gravityAccel = GRAVITY * Math.sin(slopeAngle);

        // Friction (always opposes motion)
        const frictionAccel = -ICE_FRICTION * GRAVITY * Math.cos(slopeAngle);

        // Air drag (quadratic)
        const dragAccel = -AIR_DRAG * this.speed * this.speed * Math.sign(this.speed);

        // Steering scrub (speed cost of lateral movement)
        const scrubAccel = -STEERING_SCRUB * Math.abs(this.lateralVelocity);

        // Banking bonus/penalty
        const bankingAccel = this._computeBankingAccel(curvature);

        // Net longitudinal acceleration
        const netAccel = gravityAccel + frictionAccel + dragAccel + scrubAccel + bankingAccel;
        this.speed += netAccel * dt;
        this.speed = Math.max(0, this.speed); // no reversing

        // Advance position
        this.distance += this.speed * dt;
        this.t = this.distance / totalLength;

        // --- Lateral physics ---
        let lateralAccel = steeringInput * STEERING_ACCEL;

        // Lateral damping
        lateralAccel -= this.lateralVelocity * LATERAL_DAMPING;

        // Banking restoring force (gravity pulls sled down banked walls)
        if (Math.abs(this.lateralOffset) > 0.2 && curvature > 0.001) {
            lateralAccel -= this.lateralOffset * BANKING_RESTORE * curvature * 10;
        }

        this.lateralVelocity += lateralAccel * dt;
        this.lateralOffset += this.lateralVelocity * dt;

        // --- Wall collision ---
        if (Math.abs(this.lateralOffset) >= MAX_LATERAL_OFFSET) {
            this.wallHit = true;
            this.wallHitSide = Math.sign(this.lateralOffset);

            // Speed penalty
            this.speed *= WALL_HIT_SPEED_PENALTY;

            // Bounce back
            this.lateralVelocity = -this.lateralVelocity * WALL_BOUNCE;
            this.lateralOffset = Math.sign(this.lateralOffset) * (MAX_LATERAL_OFFSET - 0.02);
        }

        // Clamp lateral offset
        this.lateralOffset = clamp(this.lateralOffset, -MAX_LATERAL_OFFSET, MAX_LATERAL_OFFSET);

        return { wallHit: this.wallHit, wallHitSide: this.wallHitSide };
    }

    /**
     * Compute banking acceleration bonus/penalty.
     */
    _computeBankingAccel(curvature) {
        if (curvature < 0.001) return 0;

        const radius = 1 / curvature;
        // Ideal lateral offset for this speed and curve radius
        const idealOffset = clamp(
            this.speed * this.speed / (radius * GRAVITY * BANKING_SCALE),
            0.2,
            0.95
        );

        const offsetError = Math.abs(Math.abs(this.lateralOffset) - idealOffset);

        if (offsetError < 0.15) {
            return BANKING_SPEED_BONUS; // small speed bonus for optimal line
        }
        return -offsetError * BANKING_PENALTY; // penalty for wrong line
    }

    /** Speed in km/h. */
    get speedKmh() {
        return this.speed * 3.6;
    }
}
