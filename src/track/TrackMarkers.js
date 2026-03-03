import * as THREE from 'three';
import { TRACK_WIDTH, TRACK_WALL_HEIGHT_MAX } from '../constants.js';

/**
 * Visual markers along the track: curve numbers, start/finish lines,
 * and split-time checkpoint gates.
 */
export class TrackMarkers {
    constructor(trackSpline) {
        this.group = new THREE.Group();
        this._buildStartFinish(trackSpline);
        this._buildCurveMarkers(trackSpline);
        this._buildCheckpointGates(trackSpline);
    }

    /**
     * Start and finish lines — colored strips across the track floor.
     */
    _buildStartFinish(trackSpline) {
        // Start line (green)
        this._buildLine(trackSpline, 0.0, 0x00cc44, 'START');

        // Finish line (red/checkered)
        this._buildLine(trackSpline, trackSpline.finishT, 0xcc0000, 'FINISH');
    }

    _buildLine(trackSpline, t, color, label) {
        const pos = trackSpline.getPointAt(t);
        const frame = trackSpline.getStableFrameAt(t);

        // Line strip across the track
        const lineGeo = new THREE.PlaneGeometry(TRACK_WIDTH + 1, 0.8);
        const lineMat = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.3,
            roughness: 0.5,
            side: THREE.DoubleSide
        });
        const line = new THREE.Mesh(lineGeo, lineMat);

        // Position on the track floor
        line.position.copy(pos).addScaledVector(frame.up, 0.05);
        // Orient: face up, align with track
        line.lookAt(pos.clone().add(frame.up));
        // Rotate to align the long axis with the right vector
        const quat = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(1, 0, 0),
            frame.right
        );
        line.quaternion.premultiply(quat);

        // Simpler approach: manually orient the plane
        line.position.copy(pos).addScaledVector(frame.up, 0.05);
        line.quaternion.setFromRotationMatrix(
            new THREE.Matrix4().makeBasis(frame.right, frame.up, frame.tangent.clone().negate())
        );

        this.group.add(line);
    }

    /**
     * Numbered markers at each curve entry.
     */
    _buildCurveMarkers(trackSpline) {
        // Approximate curve positions (parametric t values)
        const curves = [
            { num: 1, t: 0.10 }, { num: 2, t: 0.14 }, { num: 3, t: 0.18 },
            { num: 4, t: 0.22 }, { num: 5, t: 0.28 }, { num: 6, t: 0.32 },
            { num: 7, t: 0.37 }, { num: 8, t: 0.41 }, { num: 9, t: 0.59 },
            { num: 10, t: 0.63 }, { num: 11, t: 0.67 }, { num: 12, t: 0.71 },
            { num: 13, t: 0.76 }, { num: 14, t: 0.80 }, { num: 15, t: 0.83 },
            { num: 16, t: 0.87 }, { num: 17, t: 0.91 }
        ];

        for (const curve of curves) {
            this._buildNumberSign(trackSpline, curve.t, curve.num.toString());
        }
    }

    /**
     * Create a number sign on the wall next to the track.
     */
    _buildNumberSign(trackSpline, t, text) {
        const pos = trackSpline.getPointAt(t);
        const frame = trackSpline.getStableFrameAt(t);

        // Create a canvas texture with the number
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        // Blue background circle
        ctx.fillStyle = '#1a3366';
        ctx.beginPath();
        ctx.arc(32, 32, 28, 0, Math.PI * 2);
        ctx.fill();

        // White border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Number text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 32, 34);

        const texture = new THREE.CanvasTexture(canvas);

        const signGeo = new THREE.PlaneGeometry(1.5, 1.5);
        const signMat = new THREE.MeshStandardMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
            roughness: 0.5
        });
        const sign = new THREE.Mesh(signGeo, signMat);

        // Position on the right wall
        const wallOffset = TRACK_WIDTH / 2 + 2;
        sign.position.copy(pos)
            .addScaledVector(frame.right, wallOffset)
            .addScaledVector(frame.up, TRACK_WALL_HEIGHT_MAX * 0.6);

        // Face the track center
        sign.lookAt(pos.clone().addScaledVector(frame.up, TRACK_WALL_HEIGHT_MAX * 0.6));

        this.group.add(sign);
    }

    /**
     * Checkpoint gates at split-time positions.
     */
    _buildCheckpointGates(trackSpline) {
        for (const cp of trackSpline.checkpoints) {
            this._buildGate(trackSpline, cp.t);
        }
    }

    _buildGate(trackSpline, t) {
        const pos = trackSpline.getPointAt(t);
        const frame = trackSpline.getStableFrameAt(t);

        const postMat = new THREE.MeshStandardMaterial({
            color: 0xffaa00,
            emissive: 0xffaa00,
            emissiveIntensity: 0.2,
            metalness: 0.5,
            roughness: 0.3
        });

        const postGeo = new THREE.CylinderGeometry(0.08, 0.08, TRACK_WALL_HEIGHT_MAX + 1, 8);

        // Left post
        const leftPost = new THREE.Mesh(postGeo, postMat);
        leftPost.position.copy(pos)
            .addScaledVector(frame.right, -(TRACK_WIDTH / 2 + 0.5))
            .addScaledVector(frame.up, TRACK_WALL_HEIGHT_MAX / 2);
        this.group.add(leftPost);

        // Right post
        const rightPost = new THREE.Mesh(postGeo, postMat);
        rightPost.position.copy(pos)
            .addScaledVector(frame.right, TRACK_WIDTH / 2 + 0.5)
            .addScaledVector(frame.up, TRACK_WALL_HEIGHT_MAX / 2);
        this.group.add(rightPost);

        // Cross bar
        const barLength = TRACK_WIDTH + 2;
        const barGeo = new THREE.CylinderGeometry(0.06, 0.06, barLength, 8);
        const bar = new THREE.Mesh(barGeo, postMat);
        bar.position.copy(pos)
            .addScaledVector(frame.up, TRACK_WALL_HEIGHT_MAX + 0.5);
        // Rotate to horizontal across the track
        bar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), frame.right);
        this.group.add(bar);
    }

    addToScene(scene) {
        scene.add(this.group);
    }
}
