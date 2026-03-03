import * as THREE from 'three';
import {
    TRACK_WIDTH,
    TRACK_WALL_HEIGHT_MIN,
    TRACK_WALL_HEIGHT_MAX,
    TRACK_WALL_RADIUS,
    TRACK_SEGMENTS,
    TRACK_PROFILE_SEGMENTS
} from '../constants.js';

/**
 * Generates the visible track mesh by extruding a half-pipe (U-shaped)
 * cross-section along the track spline.
 *
 * Wall height varies with curvature: low on straights (~1.5m),
 * tall on banked turns (~5.5m). Uses gravity-stabilized frames to
 * prevent twisting at inflection points.
 */
export class TrackGeometry {
    constructor(trackSpline) {
        this.trackSpline = trackSpline;
        this.mesh = this._buildMesh();
    }

    /**
     * Build the half-pipe cross-section profile at a given wall height.
     * Returns an array of {x, y} points.
     * x = lateral (right is positive), y = up from track floor.
     *
     * The profile point count is always the same regardless of wallHeight,
     * so index buffers stay consistent across segments.
     */
    _buildProfile(wallHeight) {
        const points = [];
        const halfWidth = TRACK_WIDTH / 2;
        const wallSegs = TRACK_PROFILE_SEGMENTS;

        // Scale the arc radius proportionally — never larger than the wall height
        const R = Math.min(TRACK_WALL_RADIUS, wallHeight * 0.9);

        // Left wall (top to bottom) — quarter circle arc
        for (let i = 0; i <= wallSegs; i++) {
            const t = i / wallSegs; // 0 → 1 (top → bottom)
            const angle = (Math.PI / 2) * (1 - t); // PI/2 → 0
            const x = -halfWidth - R * Math.cos(angle);
            const y = R * Math.sin(angle) + (wallHeight - R);
            points.push({ x, y });
        }

        // Flat bottom (left to right) — a few intermediate points
        const bottomSteps = 4;
        for (let i = 0; i <= bottomSteps; i++) {
            const t = i / bottomSteps;
            const x = -halfWidth + t * TRACK_WIDTH;
            points.push({ x, y: 0 });
        }

        // Right wall (bottom to top) — quarter circle arc
        for (let i = 0; i <= wallSegs; i++) {
            const t = i / wallSegs; // 0 → 1 (bottom → top)
            const angle = (Math.PI / 2) * t; // 0 → PI/2
            const x = halfWidth + R * Math.cos(angle);
            const y = R * Math.sin(angle) + (wallHeight - R);
            points.push({ x, y });
        }

        return points;
    }

    /**
     * Compute gravity-stabilized frames along the spline.
     */
    _computeStableFrames(splinePoints, segments) {
        const worldUp = new THREE.Vector3(0, 1, 0);
        const ups = [];
        const rights = [];
        const tangents = [];

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const tangent = this.trackSpline.getTangentAt(t).normalize();

            const dot = worldUp.dot(tangent);
            const up = new THREE.Vector3().copy(worldUp).addScaledVector(tangent, -dot).normalize();

            if (up.lengthSq() < 0.001) {
                up.set(0, 0, 1).addScaledVector(tangent, -new THREE.Vector3(0, 0, 1).dot(tangent)).normalize();
            }

            const right = new THREE.Vector3().crossVectors(tangent, up).normalize();

            tangents.push(tangent);
            ups.push(up);
            rights.push(right);
        }

        return { tangents, ups, rights };
    }

    /**
     * Compute per-segment wall heights based on track curvature.
     * Straight sections get low walls, banked turns get tall walls.
     * The result is smoothed to avoid abrupt height transitions.
     */
    _computeWallHeights(segments) {
        // 1. Sample raw curvature at each segment
        const rawCurvature = new Float32Array(segments + 1);
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            rawCurvature[i] = this.trackSpline.getCurvatureAt(t);
        }

        // 2. Smooth the curvature with a wide rolling average (look ahead/behind)
        //    This creates gradual wall height transitions approaching and leaving turns
        const smoothRadius = Math.floor(segments * 0.02); // ~2% of track = ~12 segments
        const smoothed = new Float32Array(segments + 1);
        for (let i = 0; i <= segments; i++) {
            let sum = 0;
            let count = 0;
            for (let j = i - smoothRadius; j <= i + smoothRadius; j++) {
                const idx = Math.max(0, Math.min(segments, j));
                sum += rawCurvature[idx];
                count++;
            }
            smoothed[i] = sum / count;
        }

        // 3. Map curvature to wall height
        //    curvature < 0.005 → straight (min height)
        //    curvature > 0.025 → tight curve (max height)
        const heights = new Float32Array(segments + 1);
        const curvLow = 0.005;
        const curvHigh = 0.025;

        for (let i = 0; i <= segments; i++) {
            const curv = smoothed[i];
            // Smoothstep interpolation
            let blend = (curv - curvLow) / (curvHigh - curvLow);
            blend = Math.max(0, Math.min(1, blend));
            blend = blend * blend * (3 - 2 * blend); // smoothstep

            heights[i] = TRACK_WALL_HEIGHT_MIN + blend * (TRACK_WALL_HEIGHT_MAX - TRACK_WALL_HEIGHT_MIN);
        }

        return heights;
    }

    /**
     * Build the track mesh with variable-height walls.
     */
    _buildMesh() {
        const segments = TRACK_SEGMENTS;

        // Sample spline at evenly spaced points
        const splinePoints = this.trackSpline.curve.getSpacedPoints(segments);
        const frames = this._computeStableFrames(splinePoints, segments);

        // Compute per-segment wall heights
        const wallHeights = this._computeWallHeights(segments);

        // Build a reference profile to get the point count
        const refProfile = this._buildProfile(TRACK_WALL_HEIGHT_MAX);
        const profileCount = refProfile.length;

        const vertices = [];
        const uvs = [];
        const indices = [];

        const textureTileLength = 10;
        const totalLength = this.trackSpline.totalLength;

        for (let i = 0; i <= segments; i++) {
            const P = splinePoints[i];
            const up = frames.ups[i];
            const right = frames.rights[i];

            const distanceAlongTrack = (i / segments) * totalLength;
            const v = distanceAlongTrack / textureTileLength;

            // Build profile at this segment's wall height
            const profile = this._buildProfile(wallHeights[i]);

            for (let j = 0; j < profileCount; j++) {
                const px = profile[j].x;
                const py = profile[j].y;

                vertices.push(
                    P.x + px * right.x + py * up.x,
                    P.y + px * right.y + py * up.y,
                    P.z + px * right.z + py * up.z
                );

                const u = j / (profileCount - 1);
                uvs.push(u, v);
            }
        }

        // Index buffer: quads between adjacent cross-sections
        for (let i = 0; i < segments; i++) {
            for (let j = 0; j < profileCount - 1; j++) {
                const a = i * profileCount + j;
                const b = i * profileCount + (j + 1);
                const c = (i + 1) * profileCount + (j + 1);
                const d = (i + 1) * profileCount + j;

                indices.push(a, b, c);
                indices.push(a, c, d);
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
            color: 0xd8eaf8,
            metalness: 0.1,
            roughness: 0.35,
            side: THREE.DoubleSide,
            envMapIntensity: 0.5,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        return mesh;
    }

    addToScene(scene) {
        scene.add(this.mesh);
    }
}
