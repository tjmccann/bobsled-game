import * as THREE from 'three';

/**
 * Defines the 3D centerline of the bobsled track as a CatmullRomCurve3.
 * Provides spatial queries for physics and rendering: position, tangent,
 * Frenet frames, slope angle, curvature, and distance conversions.
 */
export class TrackSpline {
    constructor() {
        const points = this._defineControlPoints();
        this.curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
        this.totalLength = this.curve.getLength();

        // Pre-compute Frenet frames at high resolution
        this.frameDivisions = 2000;
        this.frames = this.curve.computeFrenetFrames(this.frameDivisions, false);

        // Define curve/checkpoint metadata
        this.checkpoints = this._defineCheckpoints();
        this.finishT = 0.97;
    }

    /**
     * Define the track control points.
     * Coordinate system: X = lateral, Y = up, Z = forward (track proceeds mostly in -Z)
     * Total length ~1400m, elevation drop ~120m, 17 curves.
     */
    _defineControlPoints() {
        const p = [];

        // === START ZONE (flat, 0-50m) ===
        p.push(new THREE.Vector3(0, 0, 0));
        p.push(new THREE.Vector3(0, 0, -15));
        p.push(new THREE.Vector3(0, 0, -30));
        p.push(new THREE.Vector3(0, -0.5, -50));

        // === GENTLE SLOPE (50-150m) — initial acceleration ===
        p.push(new THREE.Vector3(0, -2, -80));
        p.push(new THREE.Vector3(0, -4, -110));
        p.push(new THREE.Vector3(1, -6, -140));

        // === CURVE 1 — gentle right (150-200m) ===
        p.push(new THREE.Vector3(5, -8, -165));
        p.push(new THREE.Vector3(10, -10, -185));
        p.push(new THREE.Vector3(14, -12, -205));

        // === CURVE 2 — left (200-260m) ===
        p.push(new THREE.Vector3(14, -14, -225));
        p.push(new THREE.Vector3(10, -16, -248));
        p.push(new THREE.Vector3(4, -18, -265));

        // === CURVE 3 — right (260-320m) ===
        p.push(new THREE.Vector3(2, -20, -285));
        p.push(new THREE.Vector3(6, -22, -305));
        p.push(new THREE.Vector3(12, -24, -320));

        // === STEEP SECTION + CURVE 4 — sharp left (320-400m) ===
        p.push(new THREE.Vector3(14, -28, -345));
        p.push(new THREE.Vector3(10, -33, -370));
        p.push(new THREE.Vector3(2, -38, -390));
        p.push(new THREE.Vector3(-5, -42, -405));

        // === CURVE 5 — right (400-460m) ===
        p.push(new THREE.Vector3(-8, -45, -425));
        p.push(new THREE.Vector3(-4, -48, -450));
        p.push(new THREE.Vector3(3, -50, -465));

        // === CURVE 6 — left hairpin (460-530m) ===
        p.push(new THREE.Vector3(8, -52, -480));
        p.push(new THREE.Vector3(8, -54, -500));
        p.push(new THREE.Vector3(2, -56, -520));
        p.push(new THREE.Vector3(-6, -58, -535));

        // === CURVE 7 — right (530-590m) ===
        p.push(new THREE.Vector3(-10, -60, -555));
        p.push(new THREE.Vector3(-6, -62, -575));
        p.push(new THREE.Vector3(0, -63, -590));

        // === CURVE 8 — left (590-650m) ===
        p.push(new THREE.Vector3(4, -64, -605));
        p.push(new THREE.Vector3(2, -66, -625));
        p.push(new THREE.Vector3(-4, -68, -645));

        // === HIGH-SPEED STRAIGHT (650-850m) — steepest section ===
        p.push(new THREE.Vector3(-6, -72, -680));
        p.push(new THREE.Vector3(-5, -78, -720));
        p.push(new THREE.Vector3(-3, -84, -760));
        p.push(new THREE.Vector3(-1, -89, -800));
        p.push(new THREE.Vector3(0, -93, -840));

        // === CURVE 9 — right sweeper (850-910m) ===
        p.push(new THREE.Vector3(4, -95, -870));
        p.push(new THREE.Vector3(10, -97, -895));
        p.push(new THREE.Vector3(16, -98, -910));

        // === CURVE 10 — left (910-960m) ===
        p.push(new THREE.Vector3(18, -99, -930));
        p.push(new THREE.Vector3(14, -100, -950));
        p.push(new THREE.Vector3(8, -101, -965));

        // === CURVE 11 — right (960-1010m) ===
        p.push(new THREE.Vector3(6, -102, -980));
        p.push(new THREE.Vector3(10, -103, -1000));
        p.push(new THREE.Vector3(16, -104, -1015));

        // === CURVE 12 — left long (1010-1070m) ===
        p.push(new THREE.Vector3(18, -105, -1035));
        p.push(new THREE.Vector3(14, -106, -1055));
        p.push(new THREE.Vector3(6, -107, -1075));

        // === CURVE 13 — right (1070-1120m) ===
        p.push(new THREE.Vector3(4, -108, -1090));
        p.push(new THREE.Vector3(8, -108.5, -1110));
        p.push(new THREE.Vector3(14, -109, -1125));

        // === CURVE 14 — left (1120-1170m) ===
        p.push(new THREE.Vector3(16, -109.5, -1145));
        p.push(new THREE.Vector3(12, -110, -1165));
        p.push(new THREE.Vector3(6, -110.5, -1180));

        // === CURVE 15 — tight right (1170-1220m) ===
        p.push(new THREE.Vector3(4, -111, -1195));
        p.push(new THREE.Vector3(8, -112, -1215));
        p.push(new THREE.Vector3(14, -113, -1230));

        // === CURVE 16 — tight left (1220-1280m) ===
        p.push(new THREE.Vector3(16, -113.5, -1250));
        p.push(new THREE.Vector3(10, -114, -1270));
        p.push(new THREE.Vector3(4, -114.5, -1285));

        // === CURVE 17 — final right (1280-1340m) ===
        p.push(new THREE.Vector3(2, -115, -1300));
        p.push(new THREE.Vector3(6, -115.5, -1320));
        p.push(new THREE.Vector3(10, -116, -1340));

        // === FINISH STRAIGHT (1340-1400m) — flat braking zone ===
        p.push(new THREE.Vector3(10, -116.5, -1360));
        p.push(new THREE.Vector3(10, -117, -1385));
        p.push(new THREE.Vector3(10, -117, -1410));
        p.push(new THREE.Vector3(10, -117, -1440));

        return p;
    }

    /**
     * Checkpoints for split times — parametric t values at notable curve entries.
     */
    _defineCheckpoints() {
        // Approximate t values for curve entries (will be refined after measuring)
        return [
            { id: 1, name: 'Curve 1', t: 0.11 },
            { id: 2, name: 'Curve 5', t: 0.29 },
            { id: 3, name: 'Curve 9', t: 0.60 },
            { id: 4, name: 'Curve 13', t: 0.77 },
            { id: 5, name: 'Curve 17', t: 0.91 },
        ];
    }

    /** World position at parametric t (0-1). */
    getPointAt(t) {
        return this.curve.getPointAt(Math.max(0, Math.min(1, t)));
    }

    /** Unit tangent (forward direction) at parametric t. */
    getTangentAt(t) {
        return this.curve.getTangentAt(Math.max(0, Math.min(1, t)));
    }

    /**
     * Get a gravity-stabilized frame at parametric t.
     * Returns { tangent, up, right } where:
     * - tangent: forward direction along the track
     * - up: component of world-up perpendicular to tangent (floor faces down)
     * - right: cross product of tangent × up
     * This avoids Frenet frame twisting at inflection points.
     */
    getStableFrameAt(t) {
        t = Math.max(0, Math.min(1, t));
        const worldUp = new THREE.Vector3(0, 1, 0);
        const tangent = this.getTangentAt(t).normalize();

        // Project world up onto the plane perpendicular to tangent
        const dot = worldUp.dot(tangent);
        const up = new THREE.Vector3().copy(worldUp).addScaledVector(tangent, -dot).normalize();

        // Fallback if tangent is nearly vertical
        if (up.lengthSq() < 0.001) {
            up.set(0, 0, 1).addScaledVector(tangent, -new THREE.Vector3(0, 0, 1).dot(tangent)).normalize();
        }

        const right = new THREE.Vector3().crossVectors(tangent, up).normalize();

        return { tangent, up, right };
    }

    /** Slope angle in radians at parametric t (positive = downhill). */
    getSlopeAngleAt(t) {
        const tangent = this.getTangentAt(t);
        return Math.asin(-tangent.y); // negative y component = going downhill
    }

    /**
     * Approximate curvature (1/radius) at parametric t.
     * Uses finite differences on the tangent.
     */
    getCurvatureAt(t) {
        const dt = 0.001;
        const t0 = Math.max(0, t - dt);
        const t1 = Math.min(1, t + dt);

        const tan0 = this.getTangentAt(t0);
        const tan1 = this.getTangentAt(t1);

        // Rate of change of tangent direction
        const dTangent = new THREE.Vector3().subVectors(tan1, tan0);
        const arcLen = this.totalLength * (t1 - t0);

        if (arcLen < 0.001) return 0;
        return dTangent.length() / arcLen;
    }

    /** Convert parametric t to distance in meters. */
    tToDistance(t) {
        return t * this.totalLength;
    }

    /** Convert distance in meters to parametric t. */
    distanceToT(distance) {
        return Math.max(0, Math.min(1, distance / this.totalLength));
    }

    /**
     * Create a debug visualization: colored line showing the centerline.
     */
    createDebugLine() {
        const points = this.curve.getSpacedPoints(500);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);

        // Color gradient: green at start, red at end
        const colors = [];
        for (let i = 0; i <= 500; i++) {
            const t = i / 500;
            colors.push(1 - t, t, 0.2);
        }
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const material = new THREE.LineBasicMaterial({ vertexColors: true, linewidth: 2 });
        return new THREE.Line(geometry, material);
    }

    /**
     * Create debug Frenet frame visualization at sample points.
     * Shows tangent (red), normal (green), binormal (blue) arrows.
     */
    createDebugFrames(count = 30) {
        const group = new THREE.Group();
        const arrowLength = 3;

        for (let i = 0; i <= count; i++) {
            const t = i / count;
            const pos = this.getPointAt(t);
            const frame = this.getFrenetAt(t);

            // Tangent (red)
            const tArrow = new THREE.ArrowHelper(frame.tangent, pos, arrowLength, 0xff0000, 0.5, 0.3);
            group.add(tArrow);

            // Normal (green)
            const nArrow = new THREE.ArrowHelper(frame.normal, pos, arrowLength, 0x00ff00, 0.5, 0.3);
            group.add(nArrow);

            // Binormal (blue)
            const bArrow = new THREE.ArrowHelper(frame.binormal, pos, arrowLength, 0x0000ff, 0.5, 0.3);
            group.add(bArrow);
        }

        return group;
    }
}
