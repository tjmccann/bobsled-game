import * as THREE from 'three';

/**
 * Procedural 3D bobsled model.
 * Built from simple geometries: elongated body, cowling nose, runners, cockpit.
 *
 * In Three.js, Object3D.lookAt() makes the local +Z axis face the target.
 * The sled model is built with its nose/cowling at +Z (forward) and push bar
 * at -Z (backward), which matches the lookAt convention.
 */
export class Sled {
    constructor() {
        this.group = new THREE.Group();
        this.originalColors = new Map();
        this.leanAngle = 0;
        this.wallHitTimer = 0;
        this._buildModel();
        this._buildSparks();
    }

    _buildModel() {
        const bodyColor = 0xcc2222;
        const metalColor = 0x888899;
        const runnerColor = 0xaabbcc;

        // --- Main body ---
        // 0.75m wide to match realistic 2-man bobsled proportions vs 1.4m track
        const bodyGeo = new THREE.BoxGeometry(0.75, 0.35, 2.6, 4, 2, 8);
        // Taper the front (+Z end) by modifying vertices
        const bodyPos = bodyGeo.attributes.position;
        for (let i = 0; i < bodyPos.count; i++) {
            const z = bodyPos.getZ(i);
            const normZ = (z + 1.3) / 2.6; // 0 at back, 1 at front
            // Taper width toward the front
            if (normZ > 0.6) {
                const taper = 1 - (normZ - 0.6) * 0.6;
                bodyPos.setX(i, bodyPos.getX(i) * taper);
                // Also raise the front slightly
                bodyPos.setY(i, bodyPos.getY(i) + (normZ - 0.6) * 0.15);
            }
        }
        bodyGeo.computeVertexNormals();
        const bodyMat = new THREE.MeshStandardMaterial({
            color: bodyColor,
            metalness: 0.4,
            roughness: 0.3
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.22;
        body.castShadow = true;
        this.group.add(body);
        this.originalColors.set(body, bodyColor);
        this.bodyMaterial = bodyMat;
        this.bodyMesh = body;

        // --- Cowling / nose fairing (at +Z = front) ---
        const cowlGeo = new THREE.SphereGeometry(0.28, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const cowlMat = new THREE.MeshStandardMaterial({
            color: bodyColor,
            metalness: 0.5,
            roughness: 0.2
        });
        const cowl = new THREE.Mesh(cowlGeo, cowlMat);
        cowl.rotation.x = Math.PI / 2;
        cowl.position.set(0, 0.32, 1.3);
        cowl.scale.set(1, 0.7, 1.2);
        cowl.castShadow = true;
        this.group.add(cowl);
        this.originalColors.set(cowl, bodyColor);
        this.cowlMaterial = cowlMat;
        this.cowlMesh = cowl;

        // --- Windshield ---
        const shieldGeo = new THREE.PlaneGeometry(0.55, 0.25);
        const shieldMat = new THREE.MeshStandardMaterial({
            color: 0x4488cc,
            metalness: 0.8,
            roughness: 0.1,
            transparent: true,
            opacity: 0.5
        });
        const shield = new THREE.Mesh(shieldGeo, shieldMat);
        shield.position.set(0, 0.48, 0.9);
        shield.rotation.x = -0.4;
        this.group.add(shield);
        this.shieldMaterial = shieldMat;

        // --- Cockpit (recessed area) ---
        const cockpitGeo = new THREE.BoxGeometry(0.52, 0.08, 1.2);
        const cockpitMat = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.8
        });
        const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
        cockpit.position.set(0, 0.38, -0.1);
        this.group.add(cockpit);
        this.cockpitMaterial = cockpitMat;

        // --- Runners (2 steel strips underneath) ---
        const runnerGeo = new THREE.BoxGeometry(0.04, 0.04, 2.8);
        const runnerMat = new THREE.MeshStandardMaterial({
            color: runnerColor,
            metalness: 0.9,
            roughness: 0.1
        });
        const leftRunner = new THREE.Mesh(runnerGeo, runnerMat);
        leftRunner.position.set(-0.30, 0.02, 0);
        leftRunner.castShadow = true;
        this.group.add(leftRunner);

        const rightRunner = new THREE.Mesh(runnerGeo, runnerMat);
        rightRunner.position.set(0.30, 0.02, 0);
        rightRunner.castShadow = true;
        this.group.add(rightRunner);

        // --- Runner brackets ---
        const bracketGeo = new THREE.BoxGeometry(0.65, 0.06, 0.06);
        const bracketMat = new THREE.MeshStandardMaterial({
            color: metalColor,
            metalness: 0.7,
            roughness: 0.3
        });
        for (const zPos of [-0.8, 0, 0.8]) {
            const bracket = new THREE.Mesh(bracketGeo, bracketMat);
            bracket.position.set(0, 0.07, zPos);
            this.group.add(bracket);
        }

        // --- Push bar at the rear (-Z = back) ---
        const barGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.6, 8);
        const barMat = new THREE.MeshStandardMaterial({
            color: metalColor,
            metalness: 0.6,
            roughness: 0.4
        });
        const pushBar = new THREE.Mesh(barGeo, barMat);
        pushBar.position.set(0, 0.35, -1.35);
        pushBar.rotation.z = Math.PI / 2;
        this.group.add(pushBar);

        // Vertical posts for push bar
        for (const xPos of [-0.28, 0.28]) {
            const post = new THREE.Mesh(
                new THREE.CylinderGeometry(0.015, 0.015, 0.2, 6),
                barMat
            );
            post.position.set(xPos, 0.25, -1.35);
            this.group.add(post);
        }
    }

    /**
     * Create spark particle system for wall hit effects.
     */
    _buildSparks() {
        const sparkCount = 30;
        this.sparkCount = sparkCount;
        this.sparkLifetimes = new Float32Array(sparkCount);
        this.sparkVelocities = [];

        const positions = new Float32Array(sparkCount * 3);
        const colors = new Float32Array(sparkCount * 3);

        for (let i = 0; i < sparkCount; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = -10; // hidden below
            positions[i * 3 + 2] = 0;
            // Orange-yellow sparks
            colors[i * 3] = 1.0;
            colors[i * 3 + 1] = 0.7 + Math.random() * 0.3;
            colors[i * 3 + 2] = 0.1;

            this.sparkLifetimes[i] = 0;
            this.sparkVelocities.push(new THREE.Vector3());
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const mat = new THREE.PointsMaterial({
            size: 0.08,
            vertexColors: true,
            transparent: true,
            opacity: 0.9,
            depthWrite: false
        });

        this.sparks = new THREE.Points(geo, mat);
        this.sparkActive = false;
    }

    /**
     * Apply country-specific colors to the sled.
     * @param {{ primary: number, secondary: number, accent: number }} colors
     */
    applyColors(colors) {
        // Body + cowl use primary color
        this.bodyMaterial.color.setHex(colors.primary);
        this.cowlMaterial.color.setHex(colors.primary);

        // Cockpit uses secondary color
        this.cockpitMaterial.color.setHex(colors.secondary);

        // Windshield tinted with accent color
        this.shieldMaterial.color.setHex(colors.accent);

        // Update the originalColors map so wall-hit flash recovery uses new colors
        this.originalColors.set(this.bodyMesh, colors.primary);
        this.originalColors.set(this.cowlMesh, colors.primary);
    }

    /**
     * Position the sled on the track at parametric position t with lateral offset.
     */
    placeOnTrack(trackSpline, t, lateralOffset = 0, trackHalfWidth = 0.7) {
        const pos = trackSpline.getPointAt(t);
        const frame = trackSpline.getStableFrameAt(t);

        // Offset laterally
        const offset = lateralOffset * trackHalfWidth;
        pos.addScaledVector(frame.right, offset);

        // Position
        this.group.position.copy(pos);

        // Orientation: +Z faces forward along tangent (Three.js lookAt convention)
        const lookTarget = pos.clone().add(frame.tangent);
        this.group.lookAt(lookTarget);

        // Apply lean
        this.group.rotateOnAxis(new THREE.Vector3(0, 0, 1), this.leanAngle);
    }

    setLean(angle) {
        this.leanAngle = angle;
    }

    /**
     * Trigger wall-hit visual effect.
     * @param {number} side - which wall: -1 left, +1 right
     */
    triggerWallHit(side = 1) {
        this.wallHitTimer = 0.3;
        this.group.traverse((child) => {
            if (child.isMesh && this.originalColors.has(child)) {
                child.material.emissive = new THREE.Color(0xffffff);
                child.material.emissiveIntensity = 0.8;
            }
        });
        this._emitSparks(side);
    }

    /**
     * Emit spark particles from a side of the sled.
     * Uses the sled's world-space orientation for proper side offset.
     */
    _emitSparks(side) {
        this.sparkActive = true;
        const positions = this.sparks.geometry.attributes.position;
        const worldPos = this.group.position;

        // Get sled's world-space right and forward directions
        const rightDir = new THREE.Vector3(1, 0, 0).applyQuaternion(this.group.quaternion);
        const forwardDir = new THREE.Vector3(0, 0, 1).applyQuaternion(this.group.quaternion);

        for (let i = 0; i < this.sparkCount; i++) {
            const sx = worldPos.x + rightDir.x * side * 0.4 + forwardDir.x * (Math.random() - 0.5) * 1.5;
            const sy = worldPos.y + 0.1 + Math.random() * 0.2;
            const sz = worldPos.z + rightDir.z * side * 0.4 + forwardDir.z * (Math.random() - 0.5) * 1.5;
            positions.setXYZ(i, sx, sy, sz);

            this.sparkVelocities[i].set(
                -rightDir.x * side * (1 + Math.random() * 3) + (Math.random() - 0.5) * 2,
                1 + Math.random() * 2,
                -rightDir.z * side * (1 + Math.random() * 3) + (Math.random() - 0.5) * 2
            );

            this.sparkLifetimes[i] = 0.3 + Math.random() * 0.4;
        }
        positions.needsUpdate = true;
    }

    update(dt) {
        // Wall hit flash decay
        if (this.wallHitTimer > 0) {
            this.wallHitTimer -= dt;
            const intensity = Math.max(0, this.wallHitTimer / 0.3) * 0.8;
            this.group.traverse((child) => {
                if (child.isMesh && this.originalColors.has(child)) {
                    child.material.emissiveIntensity = intensity;
                    if (this.wallHitTimer <= 0) {
                        child.material.emissive = new THREE.Color(0x000000);
                        child.material.emissiveIntensity = 0;
                    }
                }
            });
        }

        // Animate sparks
        if (this.sparkActive) {
            const positions = this.sparks.geometry.attributes.position;
            let anyAlive = false;

            for (let i = 0; i < this.sparkCount; i++) {
                if (this.sparkLifetimes[i] <= 0) continue;
                this.sparkLifetimes[i] -= dt;
                if (this.sparkLifetimes[i] <= 0) {
                    positions.setY(i, -10);
                    continue;
                }
                anyAlive = true;
                const vel = this.sparkVelocities[i];
                vel.y -= 9.8 * dt;
                positions.setXYZ(i,
                    positions.getX(i) + vel.x * dt,
                    positions.getY(i) + vel.y * dt,
                    positions.getZ(i) + vel.z * dt
                );
            }
            positions.needsUpdate = true;
            const maxLife = this.sparkLifetimes.reduce((a, b) => Math.max(a, b), 0);
            this.sparks.material.opacity = Math.min(0.9, maxLife * 3);
            if (!anyAlive) this.sparkActive = false;
        }
    }

    addToScene(scene) {
        scene.add(this.group);
        scene.add(this.sparks);
    }
}
