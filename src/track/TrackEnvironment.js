import * as THREE from 'three';

/**
 * Creates the surrounding winter mountain environment:
 * terrain, instanced trees, background mountains, skybox gradient, and lighting/fog.
 */
export class TrackEnvironment {
    constructor(trackSpline) {
        this.group = new THREE.Group();
        this._buildTerrain(trackSpline);
        this._buildTrees(trackSpline);
        this._buildMountains();
        this._buildSkyDome();
    }

    /**
     * Sloped terrain that follows the track's descent.
     * Creates multiple terrain planes at different elevations.
     */
    _buildTerrain(trackSpline) {
        const terrainMat = new THREE.MeshStandardMaterial({
            color: 0xf0f4f8,
            roughness: 0.95,
            metalness: 0.0,
        });

        // Sample track elevation at intervals to create matching terrain
        const segments = 20;
        for (let i = 0; i < segments; i++) {
            const t = i / segments;
            const pos = trackSpline.getPointAt(t);

            const planeSize = 120;
            const geo = new THREE.PlaneGeometry(planeSize, planeSize / segments * 1.5, 8, 8);

            // Add slight noise to vertices for natural look
            const posAttr = geo.attributes.position;
            for (let j = 0; j < posAttr.count; j++) {
                const x = posAttr.getX(j);
                const y = posAttr.getY(j);
                // Random small bumps
                const noise = (Math.sin(x * 0.5) * Math.cos(y * 0.7) + Math.random() * 0.3) * 0.5;
                posAttr.setZ(j, noise);
            }
            geo.computeVertexNormals();

            const plane = new THREE.Mesh(geo, terrainMat);
            plane.rotation.x = -Math.PI / 2;
            plane.position.set(pos.x, pos.y - 2, pos.z);
            plane.receiveShadow = true;
            this.group.add(plane);
        }
    }

    /**
     * Instanced conifer trees scattered near the track.
     */
    _buildTrees(trackSpline) {
        // Tree geometry: cone (foliage) on cylinder (trunk)
        const trunkGeo = new THREE.CylinderGeometry(0.15, 0.2, 1.5, 6);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.9 });

        const foliageGeo = new THREE.ConeGeometry(1.2, 3.5, 8);
        const foliageMat = new THREE.MeshStandardMaterial({ color: 0x2d5a27, roughness: 0.8 });

        const treeCount = 300;
        const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
        const foliageMesh = new THREE.InstancedMesh(foliageGeo, foliageMat, treeCount);
        trunkMesh.castShadow = true;
        foliageMesh.castShadow = true;

        const dummy = new THREE.Object3D();
        let placed = 0;

        for (let i = 0; i < treeCount * 3 && placed < treeCount; i++) {
            // Sample a random position along the track
            const t = Math.random();
            const trackPos = trackSpline.getPointAt(t);
            const frame = trackSpline.getStableFrameAt(t);

            // Offset to the side of the track (outside the walls)
            const side = Math.random() > 0.5 ? 1 : -1;
            const lateralDist = 8 + Math.random() * 40; // 8-48m from center
            const forwardJitter = (Math.random() - 0.5) * 15;

            const x = trackPos.x + frame.right.x * lateralDist * side + frame.tangent.x * forwardJitter;
            const y = trackPos.y - 1.5 + (Math.random() - 0.5) * 3;
            const z = trackPos.z + frame.right.z * lateralDist * side + frame.tangent.z * forwardJitter;

            // Skip if too far below or above track
            if (y < trackPos.y - 20 || y > trackPos.y + 10) continue;

            const scale = 0.6 + Math.random() * 0.8;
            const rotation = Math.random() * Math.PI * 2;

            // Trunk
            dummy.position.set(x, y + 0.75 * scale, z);
            dummy.scale.set(scale, scale, scale);
            dummy.rotation.set(0, rotation, 0);
            dummy.updateMatrix();
            trunkMesh.setMatrixAt(placed, dummy.matrix);

            // Foliage (on top of trunk)
            dummy.position.set(x, y + 2.5 * scale, z);
            dummy.updateMatrix();
            foliageMesh.setMatrixAt(placed, dummy.matrix);

            placed++;
        }

        trunkMesh.count = placed;
        foliageMesh.count = placed;
        trunkMesh.instanceMatrix.needsUpdate = true;
        foliageMesh.instanceMatrix.needsUpdate = true;

        this.group.add(trunkMesh);
        this.group.add(foliageMesh);
    }

    /**
     * Background mountains using large cone/pyramid shapes.
     */
    _buildMountains() {
        const mountainMat = new THREE.MeshStandardMaterial({
            color: 0x8899aa,
            roughness: 0.9,
            flatShading: true
        });

        const snowCapMat = new THREE.MeshStandardMaterial({
            color: 0xeef4ff,
            roughness: 0.7,
            flatShading: true
        });

        const mountainData = [
            { x: -200, z: -400, height: 180, radius: 120 },
            { x: 150, z: -600, height: 220, radius: 140 },
            { x: -100, z: -900, height: 160, radius: 100 },
            { x: 200, z: -200, height: 140, radius: 90 },
            { x: -250, z: -700, height: 200, radius: 130 },
            { x: 250, z: -1100, height: 170, radius: 110 },
            { x: -180, z: -1300, height: 190, radius: 120 },
            { x: 180, z: -800, height: 150, radius: 100 },
        ];

        for (const m of mountainData) {
            // Main mountain body
            const geo = new THREE.ConeGeometry(m.radius, m.height, 7 + Math.floor(Math.random() * 4));
            const mountain = new THREE.Mesh(geo, mountainMat);
            mountain.position.set(m.x, -120 + m.height / 2 - 20, m.z);
            // Slight random lean for variety
            mountain.rotation.x = (Math.random() - 0.5) * 0.1;
            mountain.rotation.z = (Math.random() - 0.5) * 0.1;
            this.group.add(mountain);

            // Snow cap (smaller cone on top)
            const capGeo = new THREE.ConeGeometry(m.radius * 0.4, m.height * 0.3, 7);
            const cap = new THREE.Mesh(capGeo, snowCapMat);
            cap.position.set(m.x, -120 + m.height - 20 - m.height * 0.15, m.z);
            cap.rotation.copy(mountain.rotation);
            this.group.add(cap);
        }
    }

    /**
     * Gradient sky dome for atmosphere.
     */
    _buildSkyDome() {
        const skyGeo = new THREE.SphereGeometry(1500, 32, 16);
        // Custom shader for gradient sky
        const skyMat = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x5588cc) },
                bottomColor: { value: new THREE.Color(0xcce0ff) },
                offset: { value: 100 },
                exponent: { value: 0.4 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                }
            `,
            side: THREE.BackSide,
            depthWrite: false
        });

        const sky = new THREE.Mesh(skyGeo, skyMat);
        this.group.add(sky);
    }

    addToScene(scene) {
        scene.add(this.group);
    }
}
