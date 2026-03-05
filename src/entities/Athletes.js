import * as THREE from 'three';
import { PUSH_DISTANCE } from '../constants.js';

/**
 * Two simplified athlete figures for the push-start phase.
 * They run alongside the sled pushing it, then "jump in" when push distance is reached.
 *
 * Each athlete is built from simple geometries:
 *   - Sphere head, box torso, cylinder limbs
 *   - Arms pump forward/back, legs stride in a running cycle
 */
export class Athletes {
    constructor() {
        this.group = new THREE.Group();
        this.visible = false;

        // Running animation phase
        this.runCycle = 0;

        // Jump-in animation
        this.jumpingIn = false;
        this.jumpTimer = 0;
        this.jumpDuration = 0.6; // seconds

        // Shared materials for team uniform (allows recoloring via applyColors)
        this.suitMaterial = new THREE.MeshStandardMaterial({ color: 0x1155aa, roughness: 0.6 });
        this.helmetMaterial = new THREE.MeshStandardMaterial({ color: 0xcc2222, metalness: 0.3, roughness: 0.4 });

        // Create two athletes (left and right of sled)
        this.athleteLeft = this._buildAthlete();
        this.athleteRight = this._buildAthlete();

        // Position behind the sled (-Z = backward, where push bar is)
        // Three.js lookAt makes +Z face forward, so -Z is behind the sled
        this.athleteLeft.position.set(-0.45, 0, -1.6);
        this.athleteRight.position.set(0.45, 0, -1.6);

        // Rotate 180° so they face forward (+Z) toward the sled's push bar
        this.athleteLeft.rotation.y = Math.PI;
        this.athleteRight.rotation.y = Math.PI;

        this.group.add(this.athleteLeft);
        this.group.add(this.athleteRight);

        // Start hidden
        this.group.visible = false;
    }

    /**
     * Build a single athlete figure with articulated limbs.
     */
    _buildAthlete() {
        const figure = new THREE.Group();

        // Use shared materials for suit and helmet (recolorable via applyColors)
        const suitMat = this.suitMaterial;
        const helmetMat = this.helmetMaterial;
        const gloveMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 });
        const bootMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });

        // --- Torso (leans forward when running) ---
        const torso = new THREE.Group();
        torso.name = 'torso';
        const torsoGeo = new THREE.BoxGeometry(0.22, 0.32, 0.14);
        const torsoMesh = new THREE.Mesh(torsoGeo, suitMat);
        torsoMesh.castShadow = true;
        torso.add(torsoMesh);
        torso.position.y = 0.65;
        torso.rotation.x = -0.35; // lean forward
        figure.add(torso);

        // --- Head / Helmet ---
        const head = new THREE.Group();
        head.name = 'head';
        const headGeo = new THREE.SphereGeometry(0.09, 8, 6);
        const headMesh = new THREE.Mesh(headGeo, helmetMat);
        headMesh.castShadow = true;
        head.add(headMesh);

        // Visor
        const visorGeo = new THREE.BoxGeometry(0.12, 0.04, 0.02);
        const visorMat = new THREE.MeshStandardMaterial({
            color: 0x224466,
            metalness: 0.9,
            roughness: 0.1,
            transparent: true,
            opacity: 0.6
        });
        const visor = new THREE.Mesh(visorGeo, visorMat);
        visor.position.set(0, -0.01, 0.08);
        head.add(visor);

        head.position.set(0, 0.22, 0.04);
        torso.add(head);

        // --- Arms ---
        // Left arm
        const leftArm = new THREE.Group();
        leftArm.name = 'leftArm';
        const armGeo = new THREE.CylinderGeometry(0.03, 0.025, 0.28, 6);
        const leftArmMesh = new THREE.Mesh(armGeo, suitMat);
        leftArmMesh.position.y = -0.14;
        leftArmMesh.castShadow = true;
        leftArm.add(leftArmMesh);
        // Hand
        const handGeo = new THREE.SphereGeometry(0.03, 6, 4);
        const leftHand = new THREE.Mesh(handGeo, gloveMat);
        leftHand.position.y = -0.28;
        leftArm.add(leftHand);
        leftArm.position.set(-0.15, 0.12, 0);
        torso.add(leftArm);

        // Right arm
        const rightArm = new THREE.Group();
        rightArm.name = 'rightArm';
        const rightArmMesh = new THREE.Mesh(armGeo, suitMat);
        rightArmMesh.position.y = -0.14;
        rightArmMesh.castShadow = true;
        rightArm.add(rightArmMesh);
        const rightHand = new THREE.Mesh(handGeo, gloveMat);
        rightHand.position.y = -0.28;
        rightArm.add(rightHand);
        rightArm.position.set(0.15, 0.12, 0);
        torso.add(rightArm);

        // --- Legs ---
        // Left leg
        const leftLeg = new THREE.Group();
        leftLeg.name = 'leftLeg';
        const legGeo = new THREE.CylinderGeometry(0.04, 0.035, 0.35, 6);
        const leftLegMesh = new THREE.Mesh(legGeo, suitMat);
        leftLegMesh.position.y = -0.175;
        leftLegMesh.castShadow = true;
        leftLeg.add(leftLegMesh);
        // Boot
        const bootGeo = new THREE.BoxGeometry(0.06, 0.04, 0.1);
        const leftBoot = new THREE.Mesh(bootGeo, bootMat);
        leftBoot.position.set(0, -0.37, 0.02);
        leftLeg.add(leftBoot);
        leftLeg.position.set(-0.07, 0.48, 0);
        figure.add(leftLeg);

        // Right leg
        const rightLeg = new THREE.Group();
        rightLeg.name = 'rightLeg';
        const rightLegMesh = new THREE.Mesh(legGeo, suitMat);
        rightLegMesh.position.y = -0.175;
        rightLegMesh.castShadow = true;
        rightLeg.add(rightLegMesh);
        const rightBoot = new THREE.Mesh(bootGeo, bootMat);
        rightBoot.position.set(0, -0.37, 0.02);
        rightLeg.add(rightBoot);
        rightLeg.position.set(0.07, 0.48, 0);
        figure.add(rightLeg);

        return figure;
    }

    /**
     * Apply country-specific colors to athlete uniforms.
     * Both athletes share the same material instances, so changing
     * the color on the shared material updates both figures.
     * @param {{ suit: number, helmet: number }} colors
     */
    applyColors(colors) {
        this.suitMaterial.color.setHex(colors.suit);
        this.helmetMaterial.color.setHex(colors.helmet);
    }

    /**
     * Get a named limb group from an athlete figure.
     */
    _getLimb(athlete, name) {
        let found = null;
        athlete.traverse((child) => {
            if (child.name === name) found = child;
        });
        return found;
    }

    /**
     * Show athletes at the push start position.
     */
    show() {
        this.visible = true;
        this.group.visible = true;
        this.jumpingIn = false;
        this.jumpTimer = 0;
        this.runCycle = 0;

        // Reset positions (behind sled, -Z direction)
        this.athleteLeft.position.set(-0.45, 0, -1.6);
        this.athleteRight.position.set(0.45, 0, -1.6);
        this.athleteLeft.rotation.set(0, Math.PI, 0);
        this.athleteRight.rotation.set(0, Math.PI, 0);

        // Reset limbs
        this._resetLimbs(this.athleteLeft);
        this._resetLimbs(this.athleteRight);
    }

    /**
     * Hide athletes (after jump-in or on reset).
     */
    hide() {
        this.visible = false;
        this.group.visible = false;
    }

    /**
     * Reset limb rotations to default pose.
     */
    _resetLimbs(athlete) {
        const torso = this._getLimb(athlete, 'torso');
        const leftArm = this._getLimb(athlete, 'leftArm');
        const rightArm = this._getLimb(athlete, 'rightArm');
        const leftLeg = this._getLimb(athlete, 'leftLeg');
        const rightLeg = this._getLimb(athlete, 'rightLeg');

        if (torso) torso.rotation.x = -0.35;
        if (leftArm) leftArm.rotation.x = 0;
        if (rightArm) rightArm.rotation.x = 0;
        if (leftLeg) leftLeg.rotation.x = 0;
        if (rightLeg) rightLeg.rotation.x = 0;
    }

    /**
     * Begin the jump-in animation.
     */
    startJumpIn() {
        this.jumpingIn = true;
        this.jumpTimer = 0;
    }

    /**
     * Update animation each frame.
     * @param {number} dt - delta time
     * @param {number} speed - current sled speed m/s (drives run cycle rate)
     * @param {number} distance - distance traveled (for jump-in trigger)
     */
    update(dt, speed, distance) {
        if (!this.visible) return;

        if (this.jumpingIn) {
            this._updateJumpIn(dt);
            return;
        }

        // Running animation
        const cycleSpeed = Math.max(speed * 1.5, 4); // min animation speed
        this.runCycle += dt * cycleSpeed;

        this._animateRunning(this.athleteLeft, this.runCycle);
        this._animateRunning(this.athleteRight, this.runCycle + Math.PI); // offset phase
    }

    /**
     * Animate a running cycle for one athlete.
     * Arms and legs pump alternately, torso bobs slightly.
     */
    _animateRunning(athlete, phase) {
        const torso = this._getLimb(athlete, 'torso');
        const leftArm = this._getLimb(athlete, 'leftArm');
        const rightArm = this._getLimb(athlete, 'rightArm');
        const leftLeg = this._getLimb(athlete, 'leftLeg');
        const rightLeg = this._getLimb(athlete, 'rightLeg');

        const stride = Math.sin(phase);
        const bob = Math.abs(Math.sin(phase)) * 0.03;

        // Torso lean + bob
        if (torso) {
            torso.rotation.x = -0.35 + stride * 0.05; // slight forward/back
            torso.position.y = 0.65 + bob;
        }

        // Arms pump opposite to legs
        if (leftArm) leftArm.rotation.x = stride * 0.8;
        if (rightArm) rightArm.rotation.x = -stride * 0.8;

        // Legs stride
        if (leftLeg) leftLeg.rotation.x = -stride * 0.7;
        if (rightLeg) rightLeg.rotation.x = stride * 0.7;
    }

    /**
     * Animate the jump-in: athletes move forward and "duck" into the sled.
     */
    _updateJumpIn(dt) {
        this.jumpTimer += dt;
        const progress = Math.min(this.jumpTimer / this.jumpDuration, 1);

        // Ease function (smooth step)
        const t = progress * progress * (3 - 2 * progress);

        // Athletes slide forward from behind into the sled cockpit
        // -Z = behind sled, moving toward 0 = inside cockpit
        const startZ = -1.6;
        const endZ = -0.1;
        const zPos = startZ + (endZ - startZ) * t;

        // Duck down (crouch into the sled)
        const duckY = -t * 0.45;

        // Pull arms/legs in
        this.athleteLeft.position.z = zPos;
        this.athleteLeft.position.y = duckY;
        this.athleteRight.position.z = zPos;
        this.athleteRight.position.y = duckY;

        // Torso upright transition (from lean to sitting)
        const torsoL = this._getLimb(this.athleteLeft, 'torso');
        const torsoR = this._getLimb(this.athleteRight, 'torso');
        if (torsoL) torsoL.rotation.x = -0.35 + 0.35 * t;
        if (torsoR) torsoR.rotation.x = -0.35 + 0.35 * t;

        // Reset limbs to neutral during jump
        const armSwing = (1 - t) * 0.3;
        const legSwing = (1 - t) * 0.3;
        for (const athlete of [this.athleteLeft, this.athleteRight]) {
            const la = this._getLimb(athlete, 'leftArm');
            const ra = this._getLimb(athlete, 'rightArm');
            const ll = this._getLimb(athlete, 'leftLeg');
            const rl = this._getLimb(athlete, 'rightLeg');
            if (la) la.rotation.x = armSwing;
            if (ra) ra.rotation.x = -armSwing;
            if (ll) ll.rotation.x = legSwing;
            if (rl) rl.rotation.x = -legSwing;
        }

        // Hide when fully ducked in
        if (progress >= 1) {
            this.hide();
        }
    }

    /**
     * Attach to a sled's group so athletes move with the sled.
     * @param {THREE.Group} sledGroup
     */
    attachToSled(sledGroup) {
        sledGroup.add(this.group);
    }

    addToScene(scene) {
        scene.add(this.group);
    }
}
