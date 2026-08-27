import * as THREE from 'three';

const CELL = 1;
const WALL_H = 1.55;

function makeClutterCanvas(colors, paint) {
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            ctx.fillStyle = colors[(x * 13 + y * 17 + x * y) % colors.length];
            ctx.fillRect(x, y, 1, 1);
        }
    }
    paint?.(ctx, size);
    return canvas;
}

function makeStrawCanvas() {
    return makeClutterCanvas(['#c4a24a', '#a88838', '#d8b85a', '#8a6a28'], (ctx, size) => {
        ctx.fillStyle = '#6a5018';
        for (let i = 0; i < 18; i++) {
            ctx.fillRect((i * 7) % size, (i * 11) % size, 1, 6 + (i % 5));
        }
    });
}

function makeSackclothCanvas() {
    return makeClutterCanvas(['#c8b48a', '#b49a72', '#d4c09a', '#9a8058'], (ctx, size) => {
        ctx.fillStyle = 'rgba(60,40,20,0.35)';
        for (let y = 0; y < size; y += 4) {
            ctx.fillRect(0, y, size, 1);
        }
        for (let x = 0; x < size; x += 4) {
            ctx.fillRect(x, 0, 1, size);
        }
    });
}

function makeLinenCanvas() {
    return makeClutterCanvas(['#e8e0d4', '#d4ccc0', '#f0ece4', '#c8c0b4'], (ctx, size) => {
        ctx.fillStyle = '#b0a898';
        ctx.fillRect(4, 8, 24, 2);
        ctx.fillRect(8, 18, 18, 2);
    });
}

function makeBoneCanvas() {
    return makeClutterCanvas(['#e8dcc4', '#d4c8b0', '#f0e8d4', '#c4b898'], (ctx, size) => {
        ctx.fillStyle = '#8a7a68';
        ctx.fillRect(10, 4, 1, 20);
        ctx.fillRect(6, 14, 18, 1);
        ctx.fillRect(20, 8, 1, 12);
    });
}

function makeRustCanvas() {
    return makeClutterCanvas(['#8a4a28', '#6a3820', '#a85a30', '#4a2818', '#c07038'], (ctx, size) => {
        ctx.fillStyle = '#2a1810';
        ctx.fillRect(2, 2, size - 4, 1);
        ctx.fillRect(2, 2, 1, size - 4);
    });
}

function makeWaxCanvas() {
    return makeClutterCanvas(['#f0e8d0', '#e0d4b8', '#fff8e8', '#c8b890'], (ctx, size) => {
        ctx.fillStyle = '#a89060';
        for (let i = 0; i < 8; i++) {
            ctx.fillRect(4 + i * 3, 6 + (i % 4) * 5, 2, 8);
        }
    });
}

function makeCrystalCanvas() {
    return makeClutterCanvas(['#a8d8f0', '#88c0e0', '#d0f0ff', '#68a0c8'], (ctx, size) => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(8, 4, 2, 12);
        ctx.fillRect(14, 10, 10, 2);
        ctx.fillStyle = '#406888';
        ctx.fillRect(20, 16, 1, 10);
    });
}

function makeSlimeClutterCanvas() {
    return makeClutterCanvas(['#4a6a28', '#3a5a18', '#6a8a30', '#2a4010'], (ctx, size) => {
        ctx.fillStyle = '#8ab848';
        ctx.beginPath();
        ctx.ellipse(16, 18, 8, 6, 0.3, 0, Math.PI * 2);
        ctx.fill();
    });
}

function makeGoldTrimCanvas() {
    return makeClutterCanvas(['#e8c878', '#c4a24a', '#f0d890', '#8a7030'], (ctx, size) => {
        ctx.fillStyle = '#fff4c0';
        ctx.fillRect(2, 2, 28, 2);
        ctx.fillRect(2, 28, 28, 2);
        ctx.fillRect(2, 2, 2, 28);
        ctx.fillRect(28, 2, 2, 28);
        ctx.fillRect(14, 14, 4, 4);
    });
}

function makeScrollCanvas() {
    return makeClutterCanvas(['#e8dcc0', '#d4c8a8', '#f0e8d0', '#c4b490'], (ctx, size) => {
        ctx.fillStyle = '#6a5a40';
        for (let y = 6; y < 28; y += 4) {
            ctx.fillRect(4, y, 20 + (y % 8), 1);
        }
    });
}

function makeHamCanvas() {
    return makeClutterCanvas(['#c46858', '#a84840', '#e08870', '#8a3028'], (ctx, size) => {
        ctx.fillStyle = '#f0c0a8';
        ctx.fillRect(10, 8, 12, 4);
        ctx.fillStyle = '#5a2018';
        ctx.fillRect(6, 14, 20, 2);
    });
}

function canvasToTexture(canvas, repeatX = 1, repeatY = 2) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.repeat.set(repeatX, repeatY);
    tex.needsUpdate = true;
    return tex;
}

const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a3e28, roughness: 0.86, metalness: 0.04 });
const frameMats = [0xc4a24a, 0x8a3a28, 0x3a4a6b, 0x2e6b48, 0x6b2d5a].map((color) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.18 }),
);
const artworkEmptyMat = new THREE.MeshStandardMaterial({
    color: 0xc41818,
    roughness: 0.85,
    metalness: 0.02,
});
const ironMat = new THREE.MeshStandardMaterial({ color: 0x6a6e74, roughness: 0.45, metalness: 0.7 });
const potMat = new THREE.MeshStandardMaterial({ color: 0x6a3a28, roughness: 0.8, metalness: 0.05 });
const plantMat = new THREE.MeshStandardMaterial({ color: 0x2f7a32, roughness: 0.75, metalness: 0 });
const strawMat = new THREE.MeshStandardMaterial({
    map: canvasToTexture(makeStrawCanvas(), 1, 1), roughness: 0.95, metalness: 0,
});
const sackclothMat = new THREE.MeshStandardMaterial({
    map: canvasToTexture(makeSackclothCanvas(), 1, 1), roughness: 0.92, metalness: 0,
});
const linenMat = new THREE.MeshStandardMaterial({
    map: canvasToTexture(makeLinenCanvas(), 1, 1), roughness: 0.88, metalness: 0,
});
const boneMat = new THREE.MeshStandardMaterial({
    map: canvasToTexture(makeBoneCanvas(), 1, 1), roughness: 0.78, metalness: 0.04,
});
const rustMat = new THREE.MeshStandardMaterial({
    map: canvasToTexture(makeRustCanvas(), 1, 1), roughness: 0.72, metalness: 0.22,
});
const waxMat = new THREE.MeshStandardMaterial({
    map: canvasToTexture(makeWaxCanvas(), 1, 1), roughness: 0.55, metalness: 0,
});
const crystalMat = new THREE.MeshStandardMaterial({
    map: canvasToTexture(makeCrystalCanvas(), 1, 1),
    roughness: 0.28,
    metalness: 0.12,
    emissive: 0x224466,
    emissiveIntensity: 0.45,
});
const slimeClutterMat = new THREE.MeshStandardMaterial({
    map: canvasToTexture(makeSlimeClutterCanvas(), 1, 1),
    roughness: 0.35,
    metalness: 0.08,
    emissive: 0x1a3a08,
    emissiveIntensity: 0.25,
});
const goldTrimMat = new THREE.MeshStandardMaterial({
    map: canvasToTexture(makeGoldTrimCanvas(), 1, 1), roughness: 0.4, metalness: 0.45,
});
const scrollMat = new THREE.MeshStandardMaterial({
    map: canvasToTexture(makeScrollCanvas(), 1, 1), roughness: 0.9, metalness: 0,
});
const hamMat = new THREE.MeshStandardMaterial({
    map: canvasToTexture(makeHamCanvas(), 1, 1), roughness: 0.7, metalness: 0,
});
const inkMat = new THREE.MeshStandardMaterial({ color: 0x1a1420, roughness: 0.5, metalness: 0.1 });
const coalMat = new THREE.MeshStandardMaterial({ color: 0x1a1816, roughness: 0.95, metalness: 0.05 });
const tinMat = new THREE.MeshStandardMaterial({ color: 0x9aa4a8, roughness: 0.35, metalness: 0.55 });
const goblinMat = new THREE.MeshStandardMaterial({ color: 0x3a8a28, roughness: 0.72, metalness: 0.04 });
const goblinDarkMat = new THREE.MeshStandardMaterial({ color: 0x245c18, roughness: 0.8, metalness: 0.04 });
const goblinEyeMat = new THREE.MeshBasicMaterial({ color: 0x140808 });
const goblinEyeGlowMat = new THREE.MeshBasicMaterial({ color: 0xffee55 });
const frogMat = new THREE.MeshStandardMaterial({ color: 0x3cb84a, roughness: 0.55, metalness: 0.04 });
const frogDarkMat = new THREE.MeshStandardMaterial({ color: 0x1e7a32, roughness: 0.7, metalness: 0.04 });
const frogBellyMat = new THREE.MeshStandardMaterial({ color: 0xc8e878, roughness: 0.65, metalness: 0 });
const ghostMat = new THREE.MeshBasicMaterial({
    color: 0xa8c8ff,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    fog: false,
    blending: THREE.AdditiveBlending,
});
const ghostSheetMat = new THREE.MeshStandardMaterial({
    color: 0xd4e4f8,
    transparent: true,
    opacity: 0.62,
    roughness: 0.35,
    metalness: 0,
    emissive: 0x3a5a88,
    emissiveIntensity: 0.55,
    depthWrite: false,
});
const ghostHoleMat = new THREE.MeshBasicMaterial({ color: 0x081018 });
const mushStemMat = new THREE.MeshStandardMaterial({ color: 0xc8c2a8, roughness: 0.88, metalness: 0.02 });
const mushCapMats = [
    new THREE.MeshStandardMaterial({ color: 0x5ee87a, emissive: 0x1f8a38, emissiveIntensity: 1.05, roughness: 0.48, metalness: 0.04 }),
    new THREE.MeshStandardMaterial({ color: 0x4ee0c4, emissive: 0x168a78, emissiveIntensity: 1.15, roughness: 0.42, metalness: 0.06 }),
    new THREE.MeshStandardMaterial({ color: 0x62d8ff, emissive: 0x1a6a9a, emissiveIntensity: 1.2, roughness: 0.4, metalness: 0.08 }),
];
const mushGlowMat = new THREE.MeshBasicMaterial({
    color: 0x88ffe0,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
});
const voidMat = new THREE.MeshStandardMaterial({ color: 0x050403, roughness: 1, metalness: 0, emissive: 0x000000 });
const paintMats = [0x6b2d2d, 0x2d4a6b, 0x4a6b2d, 0x6b5a2d, 0x4a2d6b].map((color) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.02 }),
);
const clothMats = [0x6b1c1c, 0x1c3a6b, 0x3a1c4a, 0x1c4a2a].map((color) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0 }),
);
const goldMat = new THREE.MeshStandardMaterial({
    color: 0xe2b84a,
    emissive: 0x6a4808,
    emissiveIntensity: 0.55,
    roughness: 0.28,
    metalness: 0.9,
});
const wallMat = new THREE.MeshStandardMaterial({ color: 0x8a8278, roughness: 0.92, metalness: 0.04 });
const crackedWallMat = new THREE.MeshStandardMaterial({ color: 0x6e6860, roughness: 0.94, metalness: 0.04 });
const waterMat = new THREE.MeshStandardMaterial({
    color: 0x1a4858,
    emissive: 0x0a2838,
    emissiveIntensity: 0.55,
    roughness: 0.18,
    metalness: 0.35,
    transparent: true,
    opacity: 0.82,
});
const torchBracketMat = new THREE.MeshStandardMaterial({ color: 0x2a2218, roughness: 0.8, metalness: 0.35 });
const torchFlameMat = new THREE.MeshStandardMaterial({
    color: 0xffb040,
    emissive: 0xff6a14,
    emissiveIntensity: 2.4,
    roughness: 1,
    metalness: 0,
});
const staffWoodMat = new THREE.MeshStandardMaterial({
    color: 0x4a2e18,
    roughness: 0.92,
    metalness: 0.04,
});
const staffIronMat = new THREE.MeshStandardMaterial({
    color: 0x8a8174,
    roughness: 0.38,
    metalness: 0.78,
});
const staffCrystalMat = new THREE.MeshStandardMaterial({
    color: 0xff4a14,
    emissive: 0xff2a00,
    emissiveIntensity: 1.8,
    roughness: 0.22,
    metalness: 0.12,
    transparent: true,
    opacity: 0.94,
});
const staffGlowMat = new THREE.MeshBasicMaterial({
    color: 0xff6622,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
});

const mushStemGeo = new THREE.CylinderGeometry(0.02, 0.03, 1, 6);
const mushCapGeo = new THREE.SphereGeometry(1, 8, 6);
const mushGlowGeo = new THREE.SphereGeometry(1, 8, 6);
const torchBracketGeo = new THREE.BoxGeometry(0.07, 0.28, 0.05);
const torchBowlGeo = new THREE.BoxGeometry(0.11, 0.045, 0.09);
const torchFlameGeo = new THREE.BoxGeometry(0.055, 0.11, 0.055);
const torchTipGeo = new THREE.BoxGeometry(0.03, 0.08, 0.03);
const goblinBodyGeo = new THREE.BoxGeometry(0.18, 0.2, 0.13);
const goblinBellyGeo = new THREE.SphereGeometry(0.09, 7, 5);
const goblinHeadGeo = new THREE.SphereGeometry(0.095, 8, 6);
const goblinEarGeo = new THREE.ConeGeometry(0.032, 0.13, 5);
const goblinNoseGeo = new THREE.ConeGeometry(0.028, 0.07, 5);
const goblinEyeGeo = new THREE.BoxGeometry(0.028, 0.022, 0.018);
const goblinPupilGeo = new THREE.BoxGeometry(0.012, 0.012, 0.012);
const goblinTuskGeo = new THREE.ConeGeometry(0.012, 0.04, 4);
const goblinArmGeo = new THREE.BoxGeometry(0.045, 0.18, 0.045);
const goblinHandGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
const goblinLegGeo = new THREE.BoxGeometry(0.055, 0.14, 0.055);
const goblinFootGeo = new THREE.BoxGeometry(0.06, 0.03, 0.09);
const goblinClothGeo = new THREE.BoxGeometry(0.16, 0.08, 0.04);
const goblinBladeGeo = new THREE.BoxGeometry(0.02, 0.16, 0.035);
const goblinBrowGeo = new THREE.BoxGeometry(0.12, 0.018, 0.03);
const ghostBodyGeo = new THREE.ConeGeometry(0.2, 0.58, 8);
const ghostHeadGeo = new THREE.SphereGeometry(0.14, 8, 6);
const ghostArmGeo = new THREE.ConeGeometry(0.045, 0.22, 6);
const ghostHemGeo = new THREE.ConeGeometry(0.05, 0.12, 5);
const ghostEyeGeo = new THREE.SphereGeometry(0.028, 6, 5);
const ghostMouthGeo = new THREE.BoxGeometry(0.06, 0.035, 0.02);
const ghostCoreGeo = new THREE.SphereGeometry(0.2, 8, 6);
const frogBodyGeo = new THREE.SphereGeometry(0.07, 8, 6);
const frogHeadGeo = new THREE.SphereGeometry(0.05, 7, 5);
const frogEyeGeo = new THREE.SphereGeometry(0.016, 6, 5);
const frogLegGeo = new THREE.BoxGeometry(0.028, 0.035, 0.05);
const frogFootGeo = new THREE.BoxGeometry(0.04, 0.016, 0.055);

export const SHARED_GEOS = new Set([
    mushStemGeo, mushCapGeo, mushGlowGeo,
    torchBracketGeo, torchBowlGeo, torchFlameGeo, torchTipGeo,
    goblinBodyGeo, goblinBellyGeo, goblinHeadGeo, goblinEarGeo, goblinNoseGeo, goblinEyeGeo, goblinPupilGeo,
    goblinTuskGeo, goblinArmGeo, goblinHandGeo, goblinLegGeo, goblinFootGeo, goblinClothGeo, goblinBladeGeo, goblinBrowGeo,
    ghostBodyGeo, ghostHeadGeo, ghostArmGeo, ghostHemGeo, ghostEyeGeo, ghostMouthGeo, ghostCoreGeo,
    frogBodyGeo, frogHeadGeo, frogEyeGeo, frogLegGeo, frogFootGeo,
]);

export const SHARED_MATS = new Set([
    woodMat, artworkEmptyMat, ironMat, potMat, plantMat, strawMat, sackclothMat, linenMat, boneMat, rustMat,
    waxMat, crystalMat, slimeClutterMat, goldTrimMat, scrollMat, hamMat, inkMat, coalMat, tinMat,
    goblinMat, goblinDarkMat, goblinEyeMat, goblinEyeGlowMat, frogMat, frogDarkMat, frogBellyMat,
    ghostMat, ghostSheetMat, ghostHoleMat, mushStemMat, mushGlowMat, voidMat, goldMat, wallMat, crackedWallMat,
    waterMat, torchBracketMat, torchFlameMat, staffWoodMat, staffIronMat, staffCrystalMat, staffGlowMat,
    ...frameMats, ...paintMats, ...clothMats, ...mushCapMats,
]);

function stoneish() {
    return wallMat;
}

function makeStaff() {
    const staff = new THREE.Group();
    const staffShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.026, 0.78, 7), staffWoodMat);
    staffShaft.position.y = 0.16;
    const staffGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.1, 7), staffIronMat);
    staffGrip.position.y = -0.16;
    const staffBand = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.028, 0.04, 8), staffIronMat);
    staffBand.position.y = 0.48;
    const staffCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.055, 0), staffCrystalMat);
    staffCrystal.position.y = 0.58;
    const staffGlow = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), staffGlowMat);
    staffGlow.position.y = 0.58;
    staff.add(staffShaft, staffGrip, staffBand, staffCrystal, staffGlow);
    return staff;
}

function makeSword() {
    const sword = new THREE.Group();
    const swordBlade = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.42, 0.012), staffIronMat);
    swordBlade.position.y = 0.22;
    const swordGuard = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.028), staffIronMat);
    swordGuard.position.y = 0.02;
    const swordHilt = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.12, 6), staffWoodMat);
    swordHilt.position.y = -0.05;
    const swordPommel = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 5), staffIronMat);
    swordPommel.position.y = -0.12;
    sword.add(swordBlade, swordGuard, swordHilt, swordPommel);
    return sword;
}

function makeShield() {
    const shield = new THREE.Group();
    const shieldDisk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 8), staffWoodMat);
    shieldDisk.rotation.x = Math.PI / 2;
    const shieldBoss = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), staffIronMat);
    shieldBoss.position.z = 0.03;
    const shieldRim = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.012, 6, 10), staffIronMat);
    shield.add(shieldDisk, shieldBoss, shieldRim);
    return shield;
}

function sizePainting(frame, plane, aspect, hash) {
    const ar = aspect > 0.05 && Number.isFinite(aspect) ? aspect : 4 / 3;
    const border = 0.04;
    const maxW = CELL * 0.8 - border * 2;
    const maxH = WALL_H * 0.8 - border * 2;
    let width;
    let height;
    if (ar >= maxW / maxH) {
        width = maxW;
        height = maxW / ar;
    } else {
        height = maxH;
        width = maxH * ar;
    }
    const scale = 0.5 + (Math.abs(hash) % 11) * (0.5 / 10);
    width *= scale;
    height *= scale;
    plane.scale.set(width, height, 1);
    frame.scale.set(width + border * 2, height + border * 2, 1);
}

function makePainting(hash = 0) {
    const group = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.05), frameMats[hash % frameMats.length]);
    const planeMat = artworkEmptyMat.clone();
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), planeMat);
    plane.position.z = 0.045;
    sizePainting(frame, plane, 4 / 3, hash);
    group.add(frame, plane);
    return group;
}

function makeGoblin() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(goblinBodyGeo, goblinMat);
    body.position.set(0, 0.28, 0.01);
    body.rotation.x = 0.18;
    const belly = new THREE.Mesh(goblinBellyGeo, goblinDarkMat);
    belly.position.set(0, 0.22, 0.05);
    const cloth = new THREE.Mesh(goblinClothGeo, sackclothMat);
    cloth.position.set(0, 0.18, 0.07);
    const head = new THREE.Mesh(goblinHeadGeo, goblinMat);
    head.position.set(0, 0.44, 0.05);
    const brow = new THREE.Mesh(goblinBrowGeo, goblinDarkMat);
    brow.position.set(0, 0.49, 0.12);
    const nose = new THREE.Mesh(goblinNoseGeo, goblinDarkMat);
    nose.position.set(0, 0.42, 0.14);
    nose.rotation.x = Math.PI / 2;
    const earL = new THREE.Mesh(goblinEarGeo, goblinMat);
    earL.position.set(-0.09, 0.5, 0.02);
    earL.rotation.z = 0.7;
    const earR = new THREE.Mesh(goblinEarGeo, goblinMat);
    earR.position.set(0.09, 0.5, 0.02);
    earR.rotation.z = -0.7;
    const eyeL = new THREE.Mesh(goblinEyeGeo, goblinEyeGlowMat);
    eyeL.position.set(-0.035, 0.455, 0.13);
    const eyeR = new THREE.Mesh(goblinEyeGeo, goblinEyeGlowMat);
    eyeR.position.set(0.035, 0.455, 0.13);
    const pupilL = new THREE.Mesh(goblinPupilGeo, goblinEyeMat);
    pupilL.position.set(-0.035, 0.455, 0.14);
    const pupilR = new THREE.Mesh(goblinPupilGeo, goblinEyeMat);
    pupilR.position.set(0.035, 0.455, 0.14);
    const tuskL = new THREE.Mesh(goblinTuskGeo, boneMat);
    tuskL.position.set(-0.03, 0.38, 0.12);
    tuskL.rotation.x = 2.4;
    const tuskR = new THREE.Mesh(goblinTuskGeo, boneMat);
    tuskR.position.set(0.03, 0.38, 0.12);
    tuskR.rotation.x = 2.4;
    const armL = new THREE.Mesh(goblinArmGeo, goblinMat);
    armL.position.set(-0.13, 0.24, 0.02);
    armL.rotation.z = 0.45;
    const armR = new THREE.Mesh(goblinArmGeo, goblinMat);
    armR.position.set(0.14, 0.26, 0.04);
    armR.rotation.z = -0.85;
    armR.rotation.x = -0.4;
    const handL = new THREE.Mesh(goblinHandGeo, goblinDarkMat);
    handL.position.set(-0.16, 0.14, 0.02);
    const handR = new THREE.Mesh(goblinHandGeo, goblinDarkMat);
    handR.position.set(0.2, 0.16, 0.1);
    const blade = new THREE.Mesh(goblinBladeGeo, rustMat);
    blade.position.set(0.2, 0.24, 0.12);
    blade.rotation.z = -0.3;
    const hilt = new THREE.Mesh(goblinHandGeo, woodMat);
    hilt.position.set(0.2, 0.16, 0.1);
    hilt.scale.set(0.6, 1.2, 0.6);
    const legL = new THREE.Mesh(goblinLegGeo, goblinDarkMat);
    legL.position.set(-0.05, 0.1, 0);
    const legR = new THREE.Mesh(goblinLegGeo, goblinDarkMat);
    legR.position.set(0.05, 0.1, 0.02);
    const footL = new THREE.Mesh(goblinFootGeo, sackclothMat);
    footL.position.set(-0.05, 0.02, 0.02);
    const footR = new THREE.Mesh(goblinFootGeo, sackclothMat);
    footR.position.set(0.05, 0.02, 0.04);
    group.add(
        body, belly, cloth, head, brow, nose, earL, earR,
        eyeL, eyeR, pupilL, pupilR, tuskL, tuskR,
        armL, armR, handL, handR, blade, hilt, legL, legR, footL, footR,
    );
    group.rotation.y = Math.PI;
    return group;
}

function makeGhost() {
    const group = new THREE.Group();
    const glow = new THREE.Mesh(ghostCoreGeo, ghostMat);
    glow.position.y = 0.46;
    glow.scale.set(1.15, 1.45, 1.15);
    const sheet = new THREE.Mesh(ghostBodyGeo, ghostSheetMat);
    sheet.position.y = 0.38;
    const head = new THREE.Mesh(ghostHeadGeo, ghostSheetMat);
    head.position.y = 0.68;
    const eyeL = new THREE.Mesh(ghostEyeGeo, ghostHoleMat);
    eyeL.position.set(-0.045, 0.7, 0.11);
    const eyeR = new THREE.Mesh(ghostEyeGeo, ghostHoleMat);
    eyeR.position.set(0.045, 0.7, 0.11);
    const mouth = new THREE.Mesh(ghostMouthGeo, ghostHoleMat);
    mouth.position.set(0, 0.62, 0.12);
    const armL = new THREE.Mesh(ghostArmGeo, ghostSheetMat);
    armL.position.set(-0.16, 0.48, 0.02);
    armL.rotation.z = 1.15;
    armL.rotation.x = 0.35;
    const armR = new THREE.Mesh(ghostArmGeo, ghostSheetMat);
    armR.position.set(0.16, 0.48, 0.02);
    armR.rotation.z = -1.15;
    armR.rotation.x = 0.35;
    group.add(glow, sheet, head, eyeL, eyeR, mouth, armL, armR);
    for (let i = 0; i < 5; i++) {
        const hem = new THREE.Mesh(ghostHemGeo, ghostSheetMat);
        const a = (i / 5) * Math.PI * 2;
        hem.position.set(Math.sin(a) * 0.1, 0.08, Math.cos(a) * 0.08);
        hem.rotation.x = Math.PI + 0.25;
        hem.rotation.z = Math.sin(a) * 0.2;
        group.add(hem);
    }
    group.userData.bob = Math.random() * Math.PI * 2;
    group.userData.armL = armL;
    group.userData.armR = armR;
    return group;
}

function makeFrog() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(frogBodyGeo, frogMat);
    body.position.y = 0.07;
    body.scale.set(1.15, 0.85, 1.05);
    const belly = new THREE.Mesh(frogBodyGeo, frogBellyMat);
    belly.position.set(0, 0.055, 0.03);
    belly.scale.set(0.85, 0.55, 0.7);
    const head = new THREE.Mesh(frogHeadGeo, frogMat);
    head.position.set(0, 0.11, 0.055);
    const eyeL = new THREE.Mesh(frogEyeGeo, goblinEyeGlowMat);
    eyeL.position.set(-0.028, 0.14, 0.075);
    const eyeR = new THREE.Mesh(frogEyeGeo, goblinEyeGlowMat);
    eyeR.position.set(0.028, 0.14, 0.075);
    const pupilL = new THREE.Mesh(goblinPupilGeo, goblinEyeMat);
    pupilL.position.set(-0.028, 0.14, 0.088);
    pupilL.scale.set(0.7, 0.7, 0.7);
    const pupilR = new THREE.Mesh(goblinPupilGeo, goblinEyeMat);
    pupilR.position.set(0.028, 0.14, 0.088);
    pupilR.scale.set(0.7, 0.7, 0.7);
    for (const [x, z] of [[-0.045, 0.03], [0.045, 0.03], [-0.04, -0.035], [0.04, -0.035]]) {
        const leg = new THREE.Mesh(frogLegGeo, frogDarkMat);
        leg.position.set(x, 0.03, z);
        const foot = new THREE.Mesh(frogFootGeo, frogDarkMat);
        foot.position.set(x, 0.01, z + 0.02);
        group.add(leg, foot);
    }
    group.add(body, belly, head, eyeL, eyeR, pupilL, pupilR);
    return group;
}

function makeTorch() {
    const group = new THREE.Group();
    const bracket = new THREE.Mesh(torchBracketGeo, torchBracketMat);
    bracket.position.set(0, 0, 0.02);
    const bowl = new THREE.Mesh(torchBowlGeo, torchBracketMat);
    bowl.position.set(0, 0.12, 0.06);
    const flame = new THREE.Mesh(torchFlameGeo, torchFlameMat);
    flame.position.set(0, 0.2, 0.06);
    const tip = new THREE.Mesh(torchTipGeo, torchFlameMat);
    tip.position.set(0.008, 0.28, 0.06);
    const origin = new THREE.Object3D();
    origin.position.set(0, 0.26, 0.06);
    group.add(bracket, bowl, flame, tip, origin);
    group.userData.flame = flame;
    group.userData.tip = tip;
    group.userData.origin = origin;
    return group;
}

function makeHole() {
    const group = new THREE.Group();
    const lip = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.38, 0.05), ironMat);
    const hole = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 0.1), voidMat);
    hole.position.z = 0.04;
    group.add(lip, hole);
    return group;
}

function makeWeapons(hash) {
    const group = new THREE.Group();
    if (hash % 2 === 0) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.44, 0.02), ironMat);
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.03), ironMat);
        guard.position.y = -0.1;
        const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.03), woodMat);
        hilt.position.y = -0.18;
        group.add(blade, guard, hilt);
    } else {
        const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.04, 10), ironMat);
        shield.rotation.x = Math.PI / 2;
        const boss = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), ironMat);
        boss.position.z = 0.04;
        group.add(shield, boss);
    }
    return group;
}

function makeBanner(hash) {
    const group = new THREE.Group();
    const rod = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.03), woodMat);
    rod.position.y = 0.2;
    const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.4, 0.02), clothMats[hash % clothMats.length]);
    cloth.position.set(0, -0.02, 0.03);
    group.add(rod, cloth);
    return group;
}

function makeStalagmite(hash = 0) {
    const group = new THREE.Group();
    const h = 0.32 + (hash % 5) * 0.09;
    const r = 0.08 + (hash % 4) * 0.018;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), crackedWallMat);
    spike.position.y = h / 2;
    const base = new THREE.Mesh(new THREE.SphereGeometry(r * 0.85, 6, 4), wallMat);
    base.position.y = r * 0.45;
    group.add(base, spike);
    return group;
}

function makeBoulder(hash = 0) {
    const group = new THREE.Group();
    const big = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.26), crackedWallMat);
    big.position.y = 0.11;
    big.rotation.y = 0.22 + (hash % 5) * 0.08;
    const small = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.18), wallMat);
    small.position.set(0.1, 0.07, 0.05);
    small.rotation.y = -0.3;
    group.add(big, small);
    return group;
}

function makePlant() {
    const group = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.12, 8), potMat);
    pot.position.y = 0.06;
    const leaf1 = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 6), plantMat);
    leaf1.position.y = 0.2;
    const leaf2 = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 6), plantMat);
    leaf2.position.set(0.04, 0.16, 0.02);
    const leaf3 = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 6), plantMat);
    leaf3.position.set(-0.03, 0.15, -0.02);
    group.add(pot, leaf1, leaf2, leaf3);
    return group;
}

function makeBucket() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.12, 8), rustMat);
    body.position.y = 0.06;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.008, 6, 10), ironMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.12;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.007, 5, 8, Math.PI), rustMat);
    handle.position.y = 0.14;
    group.add(body, rim, handle);
    return group;
}

function makeSack() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), sackclothMat);
    body.scale.set(1, 0.85, 0.92);
    body.position.y = 0.08;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.06, 6), sackclothMat);
    neck.position.y = 0.16;
    group.add(body, neck);
    return group;
}

function makeGrainSack() {
    const group = makeSack();
    group.scale.set(1.15, 1.05, 1.1);
    const patch = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.01), strawMat);
    patch.position.set(0.06, 0.08, 0.08);
    group.add(patch);
    return group;
}

function makeCandleCluster(hash = 0) {
    const group = new THREE.Group();
    const n = 2 + (hash % 3);
    for (let i = 0; i < n; i++) {
        const h = 0.08 + ((hash + i) % 4) * 0.02;
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, h, 6), waxMat);
        const x = (i - (n - 1) / 2) * 0.045;
        stick.position.set(x, h / 2, (i % 2) * 0.02);
        const flame = new THREE.Mesh(torchFlameGeo, torchFlameMat);
        flame.scale.set(0.45, 0.55, 0.45);
        flame.position.set(x, h + 0.03, (i % 2) * 0.02);
        group.add(stick, flame);
    }
    const puddle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.015, 8), waxMat);
    puddle.position.y = 0.008;
    group.add(puddle);
    return group;
}

function makeFloorLantern() {
    const group = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.04, 8), rustMat);
    base.position.y = 0.02;
    const cage = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.08), ironMat);
    cage.position.y = 0.1;
    const flame = new THREE.Mesh(torchFlameGeo, torchFlameMat);
    flame.scale.set(0.7, 0.85, 0.7);
    flame.position.y = 0.1;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.04, 8), rustMat);
    cap.position.y = 0.18;
    group.add(base, cage, flame, cap);
    return group;
}

function makeBonePile(hash = 0) {
    const group = new THREE.Group();
    for (let i = 0; i < 4; i++) {
        const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.16 + (i % 3) * 0.03, 5), boneMat);
        bone.position.set(((i % 2) * 2 - 1) * 0.04, 0.03 + i * 0.012, ((hash + i) % 3 - 1) * 0.03);
        bone.rotation.set(0.4 + i * 0.2, i * 0.7, 0.3);
        group.add(bone);
    }
    const knuckle = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), boneMat);
    knuckle.position.set(0.02, 0.04, -0.02);
    group.add(knuckle);
    return group;
}

function makeBone() {
    const group = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.2, 6), boneMat);
    shaft.position.y = 0.04;
    shaft.rotation.z = 0.85;
    const knobby = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 5), boneMat);
    knobby.position.set(-0.07, 0.03, 0);
    const knobby2 = new THREE.Mesh(new THREE.SphereGeometry(0.024, 6, 5), boneMat);
    knobby2.position.set(0.08, 0.06, 0);
    group.add(shaft, knobby, knobby2);
    return group;
}

function makeBrokenStool() {
    const group = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 8), woodMat);
    seat.position.y = 0.14;
    seat.rotation.z = 0.35;
    const legA = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.16, 0.025), woodMat);
    legA.position.set(-0.05, 0.07, -0.04);
    const legB = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.1, 0.025), woodMat);
    legB.position.set(0.05, 0.05, 0.04);
    legB.rotation.z = 0.5;
    group.add(seat, legA, legB);
    return group;
}

function makeStackedBowls() {
    const group = new THREE.Group();
    for (let i = 0; i < 3; i++) {
        const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.07 - i * 0.008, 0.05, 0.035, 8), potMat);
        bowl.position.y = 0.02 + i * 0.032;
        group.add(bowl);
    }
    return group;
}

function makeRopeCoil() {
    const group = new THREE.Group();
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.028, 6, 12), sackclothMat);
    coil.rotation.x = Math.PI / 2;
    coil.position.y = 0.03;
    const inner = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.02, 6, 10), sackclothMat);
    inner.rotation.x = Math.PI / 2;
    inner.position.y = 0.045;
    group.add(coil, inner);
    return group;
}

function makeHangingChain() {
    const group = new THREE.Group();
    for (let i = 0; i < 6; i++) {
        const link = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.008, 5, 8), rustMat);
        link.position.y = -i * 0.055;
        link.rotation.y = i % 2 ? Math.PI / 2 : 0;
        group.add(link);
    }
    group.userData.wallY = 1.22;
    return group;
}

function makeDebrisPile(hash = 0) {
    const group = new THREE.Group();
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.06), woodMat);
    plank.position.set(0, 0.025, 0.02);
    plank.rotation.y = 0.4;
    const shard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.1), rustMat);
    shard.position.set(0.06, 0.03, -0.04);
    shard.rotation.y = -0.5;
    const scrap = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.08), ironMat);
    scrap.position.set(-0.05, 0.025, -0.02);
    scrap.rotation.z = 0.2 + (hash % 3) * 0.05;
    group.add(plank, shard, scrap);
    return group;
}

function makeShackles() {
    const group = new THREE.Group();
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.03), rustMat);
    const left = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.01, 5, 8), rustMat);
    left.position.set(-0.08, -0.04, 0.02);
    const right = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.01, 5, 8), rustMat);
    right.position.set(0.08, -0.04, 0.02);
    const chain = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.015, 0.015), rustMat);
    chain.position.y = -0.04;
    group.add(plate, left, right, chain);
    group.userData.wallY = 0.95;
    return group;
}

function makeStrawPile() {
    const group = new THREE.Group();
    const heap = new THREE.Mesh(new THREE.SphereGeometry(0.12, 7, 5), strawMat);
    heap.scale.set(1.2, 0.45, 0.95);
    heap.position.y = 0.05;
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 5), strawMat);
    tuft.position.set(0.05, 0.08, 0.02);
    tuft.rotation.z = -0.4;
    group.add(heap, tuft);
    return group;
}

function makeTinCup() {
    const group = new THREE.Group();
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.06, 8), tinMat);
    cup.position.y = 0.03;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.006, 5, 8, Math.PI), tinMat);
    handle.position.set(0.04, 0.03, 0);
    handle.rotation.y = Math.PI / 2;
    group.add(cup, handle);
    return group;
}

function makeChainedBucket() {
    const group = makeBucket();
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 5, 8), rustMat);
    chain.position.y = 0.16;
    group.add(chain);
    return group;
}

function makeHangingHam() {
    const group = new THREE.Group();
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.008, 5, 8, Math.PI), rustMat);
    hook.position.y = 0.08;
    const ham = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), hamMat);
    ham.scale.set(0.7, 1.15, 0.75);
    ham.position.y = -0.04;
    const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.08, 5), boneMat);
    bone.position.y = 0.08;
    group.add(hook, ham, bone);
    group.userData.wallY = 1.05;
    return group;
}

function makeCrocks() {
    const group = new THREE.Group();
    const a = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.1, 8), potMat);
    a.position.set(-0.05, 0.05, 0);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 8), potMat);
    lid.position.set(-0.05, 0.11, 0);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.07, 8), potMat);
    b.position.set(0.055, 0.035, 0.02);
    group.add(a, lid, b);
    return group;
}

function makeCuttingBoard() {
    const group = new THREE.Group();
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.12), woodMat);
    board.position.y = 0.015;
    const slice = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.05), hamMat);
    slice.position.set(-0.02, 0.03, 0);
    const knife = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.01, 0.02), ironMat);
    knife.position.set(0.04, 0.028, 0.03);
    knife.rotation.y = 0.4;
    group.add(board, slice, knife);
    return group;
}

function makeKettle() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), rustMat);
    body.position.y = 0.07;
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.08, 6), rustMat);
    spout.position.set(0.07, 0.08, 0);
    spout.rotation.z = -Math.PI / 3;
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.015, 8), ironMat);
    lid.position.y = 0.13;
    group.add(body, spout, lid);
    return group;
}

function makeOverturnedPot() {
    const group = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.1, 8), potMat);
    pot.position.set(0, 0.05, 0);
    pot.rotation.z = Math.PI / 2;
    pot.rotation.y = 0.3;
    group.add(pot);
    return group;
}

function makeFoldedLinens() {
    const group = new THREE.Group();
    for (let i = 0; i < 3; i++) {
        const fold = new THREE.Mesh(new THREE.BoxGeometry(0.16 - i * 0.02, 0.03, 0.12), linenMat);
        fold.position.set(i * 0.01, 0.02 + i * 0.032, 0);
        fold.rotation.y = i * 0.08;
        group.add(fold);
    }
    return group;
}

function makeHatBox() {
    const group = new THREE.Group();
    const box = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 10), linenMat);
    box.position.y = 0.05;
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.02, 10), clothMats[2]);
    lid.position.y = 0.11;
    group.add(box, lid);
    return group;
}

function makeBroom() {
    const group = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 6), woodMat);
    stick.position.y = 0.21;
    stick.rotation.z = 0.35;
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 6), strawMat);
    head.position.set(0.07, 0.02, 0);
    head.rotation.z = Math.PI + 0.35;
    group.add(stick, head);
    return group;
}

function makeBoots() {
    const group = new THREE.Group();
    for (const x of [-0.04, 0.05]) {
        const boot = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.1), rustMat);
        boot.position.set(x, 0.03, 0);
        const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.04, 0.055), sackclothMat);
        cuff.position.set(x, 0.07, -0.02);
        group.add(boot, cuff);
    }
    return group;
}

function makeNightstandCandle() {
    const group = new THREE.Group();
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.015, 8), tinMat);
    dish.position.y = 0.01;
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.1, 6), waxMat);
    stick.position.y = 0.065;
    const flame = new THREE.Mesh(torchFlameGeo, torchFlameMat);
    flame.scale.set(0.4, 0.5, 0.4);
    flame.position.y = 0.13;
    group.add(dish, stick, flame);
    return group;
}

function makeChamberPot() {
    const group = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.055, 0.08, 8), potMat);
    pot.position.y = 0.04;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.01, 6, 10), potMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.08;
    group.add(pot, rim);
    return group;
}

function makeClothesPile() {
    const group = new THREE.Group();
    const heap = new THREE.Mesh(new THREE.SphereGeometry(0.1, 7, 5), linenMat);
    heap.scale.set(1.15, 0.4, 0.9);
    heap.position.y = 0.04;
    const fold = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.08), clothMats[0]);
    fold.position.set(0.02, 0.07, 0.02);
    fold.rotation.y = 0.4;
    group.add(heap, fold);
    return group;
}

function makeWashbasin() {
    const group = new THREE.Group();
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.07, 0.06, 10), tinMat);
    bowl.position.y = 0.04;
    const water = new THREE.Mesh(new THREE.CircleGeometry(0.07, 10), waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.055;
    group.add(bowl, water);
    return group;
}

function makeLectern() {
    const group = new THREE.Group();
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.08), woodMat);
    stand.position.y = 0.14;
    const slope = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.16), woodMat);
    slope.position.set(0, 0.3, 0.02);
    slope.rotation.x = -0.35;
    const page = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.008, 0.12), scrollMat);
    page.position.set(0, 0.32, 0.02);
    page.rotation.x = -0.35;
    group.add(stand, slope, page);
    return group;
}

function makeInkQuill() {
    const group = new THREE.Group();
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.06, 8), inkMat);
    bottle.position.y = 0.03;
    const quill = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.01, 0.14, 5), boneMat);
    quill.position.set(0.04, 0.07, 0);
    quill.rotation.z = 0.6;
    const nib = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.03, 4), inkMat);
    nib.position.set(0.08, 0.02, 0);
    nib.rotation.z = 0.6 + Math.PI;
    group.add(bottle, quill, nib);
    return group;
}

function makeScrollPile() {
    const group = new THREE.Group();
    for (let i = 0; i < 3; i++) {
        const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.14, 8), scrollMat);
        roll.rotation.z = Math.PI / 2;
        roll.position.set(0, 0.025 + i * 0.04, (i - 1) * 0.03);
        roll.rotation.y = i * 0.4;
        group.add(roll);
    }
    return group;
}

function makeTinyGlobe() {
    const group = new THREE.Group();
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.03, 8), woodMat);
    stand.position.y = 0.015;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), plantMat);
    ball.position.y = 0.08;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.006, 5, 12), goldTrimMat);
    ring.position.y = 0.08;
    ring.rotation.x = 0.4;
    group.add(stand, ball, ring);
    return group;
}

function makeFallenBook() {
    const group = new THREE.Group();
    const cover = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.1), paintMats[1]);
    cover.position.y = 0.02;
    cover.rotation.y = 0.5;
    cover.rotation.z = 0.08;
    const pages = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.08), scrollMat);
    pages.position.set(0.01, 0.03, 0);
    pages.rotation.copy(cover.rotation);
    group.add(cover, pages);
    return group;
}

function makePlaceSetting() {
    const group = new THREE.Group();
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.012, 10), linenMat);
    plate.position.y = 0.01;
    const fork = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.008, 0.1), tinMat);
    fork.position.set(-0.09, 0.012, 0);
    const knife = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.008, 0.11), ironMat);
    knife.position.set(0.09, 0.012, 0);
    group.add(plate, fork, knife);
    return group;
}

function makeGoblet() {
    const group = new THREE.Group();
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.025, 0.06, 8), goldTrimMat);
    cup.position.y = 0.07;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 6), goldTrimMat);
    stem.position.y = 0.035;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.012, 8), goldTrimMat);
    base.position.y = 0.006;
    group.add(cup, stem, base);
    return group;
}

function makeCandelabra() {
    const group = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.03, 8), goldTrimMat);
    base.position.y = 0.015;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.16, 6), goldTrimMat);
    stem.position.y = 0.1;
    group.add(base, stem);
    for (const x of [-0.06, 0, 0.06]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.012), goldTrimMat);
        arm.position.set(x / 2, 0.16, 0);
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.06, 5), waxMat);
        stick.position.set(x, 0.2, 0);
        const flame = new THREE.Mesh(torchFlameGeo, torchFlameMat);
        flame.scale.set(0.35, 0.45, 0.35);
        flame.position.set(x, 0.25, 0);
        group.add(arm, stick, flame);
    }
    return group;
}

function makePlatter() {
    const group = new THREE.Group();
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.11, 0.02, 10), tinMat);
    dish.position.y = 0.012;
    const food = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.06), hamMat);
    food.position.y = 0.03;
    group.add(dish, food);
    return group;
}

function makeKneelingCushion() {
    const group = new THREE.Group();
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.16), linenMat);
    pad.position.y = 0.03;
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.015, 0.18), goldTrimMat);
    trim.position.y = 0.008;
    group.add(pad, trim);
    return group;
}

function makeOfferingBowl() {
    const group = new THREE.Group();
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.05, 0.05, 10), goldTrimMat);
    bowl.position.y = 0.03;
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.006, 8), goldMat);
    coin.position.set(0.02, 0.055, 0);
    group.add(bowl, coin);
    return group;
}

function makeIncense() {
    const group = new THREE.Group();
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.02, 8), rustMat);
    dish.position.y = 0.01;
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.14, 5), woodMat);
    stick.position.y = 0.08;
    stick.rotation.z = 0.15;
    const smoke = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 5), mushGlowMat);
    smoke.position.set(0.02, 0.16, 0);
    group.add(dish, stick, smoke);
    return group;
}

function makeHolyPlaque() {
    const group = new THREE.Group();
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.03), goldTrimMat);
    const emblem = new THREE.Mesh(new THREE.CircleGeometry(0.06, 8), goldMat);
    emblem.position.z = 0.02;
    group.add(plate, emblem);
    group.userData.wallY = 1.05;
    return group;
}

function makeCoalHeap() {
    const group = new THREE.Group();
    for (let i = 0; i < 5; i++) {
        const lump = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.05), coalMat);
        lump.position.set(((i % 3) - 1) * 0.05, 0.025 + (i % 2) * 0.02, (Math.floor(i / 3) - 0.3) * 0.05);
        lump.rotation.y = i * 0.5;
        group.add(lump);
    }
    return group;
}

function makeTongs() {
    const group = new THREE.Group();
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.015, 0.22), ironMat);
    a.position.set(-0.015, 0.02, 0);
    a.rotation.y = 0.08;
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.015, 0.22), rustMat);
    b.position.set(0.015, 0.02, 0);
    b.rotation.y = -0.08;
    const hinge = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 5), ironMat);
    hinge.position.set(0, 0.02, -0.08);
    group.add(a, b, hinge);
    return group;
}

function makeIngot() {
    const group = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.07), rustMat);
    bar.position.y = 0.025;
    group.add(bar);
    return group;
}

function makeBellows() {
    const group = new THREE.Group();
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.12), sackclothMat);
    bag.position.y = 0.05;
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.1, 6), rustMat);
    nozzle.rotation.z = Math.PI / 2;
    nozzle.position.set(0.12, 0.05, 0);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.02), woodMat);
    handle.position.set(0, 0.1, 0);
    group.add(bag, nozzle, handle);
    return group;
}

function makeSlag() {
    const group = new THREE.Group();
    const blob = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), rustMat);
    blob.scale.set(1.2, 0.4, 0.9);
    blob.position.y = 0.025;
    const chip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.04), coalMat);
    chip.position.set(0.05, 0.02, 0.03);
    group.add(blob, chip);
    return group;
}

function makeHelm() {
    const group = new THREE.Group();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), ironMat);
    dome.position.y = 0.04;
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 10), rustMat);
    brim.position.y = 0.04;
    group.add(dome, brim);
    return group;
}

function makeFloorShield() {
    const group = new THREE.Group();
    const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 10), ironMat);
    shield.rotation.x = Math.PI / 2.4;
    shield.position.y = 0.06;
    const boss = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), rustMat);
    boss.position.set(0, 0.08, 0.02);
    group.add(shield, boss);
    return group;
}

function makeBedroll() {
    const group = new THREE.Group();
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.28, 8), sackclothMat);
    roll.rotation.z = Math.PI / 2;
    roll.position.y = 0.06;
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.01, 5, 10), rustMat);
    strap.rotation.z = Math.PI / 2;
    strap.position.y = 0.06;
    group.add(roll, strap);
    return group;
}

function makeSpearStand() {
    const group = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.08), woodMat);
    base.position.y = 0.02;
    for (const x of [-0.03, 0.03]) {
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.38, 5), woodMat);
        shaft.position.set(x, 0.21, 0);
        shaft.rotation.z = x * 0.4;
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.06, 4), ironMat);
        tip.position.set(x + x * 0.12, 0.42, 0);
        tip.rotation.z = x * 0.4;
        group.add(shaft, tip);
    }
    group.add(base);
    return group;
}

function makeSkullStack() {
    const group = new THREE.Group();
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), boneMat);
    skull.position.y = 0.055;
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.04), boneMat);
    jaw.position.set(0, 0.02, 0.03);
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.04, 7, 5), boneMat);
    top.position.set(0.04, 0.1, -0.02);
    group.add(skull, jaw, top);
    return group;
}

function makeUrn() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), goldTrimMat);
    body.scale.set(0.85, 1.1, 0.85);
    body.position.y = 0.08;
    const lid = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.05, 8), goldTrimMat);
    lid.position.y = 0.16;
    group.add(body, lid);
    return group;
}

function makeGoldUrn() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), goldTrimMat);
    body.scale.set(0.8, 1.25, 0.8);
    body.position.y = 0.1;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.06, 8), goldMat);
    neck.position.y = 0.18;
    const lid = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.06, 8), goldTrimMat);
    lid.position.y = 0.24;
    group.add(body, neck, lid);
    return group;
}

function makeMeltedCandles() {
    const group = new THREE.Group();
    const puddle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.02, 8), waxMat);
    puddle.position.y = 0.01;
    const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.05, 6), waxMat);
    stub.position.set(-0.03, 0.04, 0);
    const stub2 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.022, 0.03, 6), waxMat);
    stub2.position.set(0.04, 0.03, 0.02);
    group.add(puddle, stub, stub2);
    return group;
}

function makeCoffinFragment() {
    const group = new THREE.Group();
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.1), woodMat);
    plank.position.y = 0.03;
    plank.rotation.y = 0.25;
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.015, 0.04), rustMat);
    trim.position.set(0, 0.05, 0);
    group.add(plank, trim);
    return group;
}

function makeGrateCover() {
    const group = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.02, 10), rustMat);
    ring.position.y = 0.012;
    for (let i = 0; i < 3; i++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.012, 0.018), ironMat);
        bar.position.y = 0.02;
        bar.rotation.y = (i / 3) * Math.PI;
        group.add(bar);
    }
    group.add(ring);
    return group;
}

function makeDripPipe() {
    const group = new THREE.Group();
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.28, 8), rustMat);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(0, 0, 0);
    const elbow = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.1, 8), rustMat);
    elbow.position.set(0.14, -0.04, 0);
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 5), slimeClutterMat);
    drop.position.set(0.14, -0.12, 0);
    group.add(pipe, elbow, drop);
    group.userData.wallY = 1.18;
    return group;
}

function makeSlimeBucket() {
    const group = makeBucket();
    const slime = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 8), slimeClutterMat);
    slime.position.y = 0.1;
    group.add(slime);
    return group;
}

function makeMossTuft() {
    const group = new THREE.Group();
    const pad = new THREE.Mesh(new THREE.SphereGeometry(0.08, 7, 5), plantMat);
    pad.scale.set(1.2, 0.35, 1);
    pad.position.y = 0.025;
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 5), plantMat);
    tuft.position.set(0.03, 0.05, 0);
    group.add(pad, tuft);
    return group;
}

function makeWateringCan() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 8), tinMat);
    body.position.y = 0.05;
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.016, 0.1, 6), tinMat);
    spout.position.set(0.08, 0.07, 0);
    spout.rotation.z = -0.7;
    group.add(body, spout);
    return group;
}

function makeFlowerCrate() {
    const group = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.14), woodMat);
    box.position.y = 0.05;
    const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), clothMats[0]);
    bloom.position.set(-0.03, 0.12, 0);
    const bloom2 = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), clothMats[1]);
    bloom2.position.set(0.04, 0.11, 0.02);
    group.add(box, bloom, bloom2);
    return group;
}

function makeBirdBath() {
    const group = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.16, 8), wallMat);
    stem.position.y = 0.08;
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.07, 0.04, 10), wallMat);
    bowl.position.y = 0.18;
    const water = new THREE.Mesh(new THREE.CircleGeometry(0.07, 10), waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.195;
    group.add(stem, bowl, water);
    return group;
}

function makeCrystalShard() {
    const group = new THREE.Group();
    const shard = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 5), crystalMat);
    shard.position.y = 0.11;
    shard.rotation.z = 0.15;
    const small = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.12, 5), crystalMat);
    small.position.set(0.05, 0.06, 0.02);
    small.rotation.z = -0.4;
    group.add(shard, small);
    return group;
}

function makeNest() {
    const group = new THREE.Group();
    const bowl = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.03, 6, 10), strawMat);
    bowl.rotation.x = Math.PI / 2;
    bowl.position.y = 0.03;
    const egg = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 5), boneMat);
    egg.position.set(0.02, 0.04, 0);
    group.add(bowl, egg);
    return group;
}

function makePebbleCluster(hash = 0) {
    const group = new THREE.Group();
    for (let i = 0; i < 4; i++) {
        const r = 0.025 + ((hash + i) % 3) * 0.012;
        const rock = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 5), crackedWallMat);
        rock.scale.set(1.2, 0.55, 1);
        rock.position.set(((i % 2) * 2 - 1) * 0.05, r * 0.4, (Math.floor(i / 2) - 0.5) * 0.05);
        group.add(rock);
    }
    return group;
}

function makeVelvetStool() {
    const group = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 10), clothMats[2]);
    seat.position.y = 0.2;
    const trim = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.01, 6, 12), goldTrimMat);
    trim.rotation.x = Math.PI / 2;
    trim.position.y = 0.18;
    for (const [lx, lz] of [[-0.05, -0.05], [0.05, -0.05], [-0.05, 0.05], [0.05, 0.05]]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.18, 0.025), goldTrimMat);
        leg.position.set(lx, 0.09, lz);
        group.add(leg);
    }
    group.add(seat, trim);
    return group;
}

function makeMushroom(hash, blueBias) {
    const group = new THREE.Group();
    const count = 1 + (hash % 4);
    let maxY = 0;
    for (let i = 0; i < count; i += 1) {
        const stemH = 0.07 + ((hash + i * 9) % 6) * 0.018;
        const capR = 0.042 + ((hash + i * 5) % 7) * 0.007;
        const x = ((i % 2) * 2 - 1) * (0.03 + (i % 3) * 0.018);
        const z = (i < 2 ? -0.5 : 0.5) * (0.04 + (i % 2) * 0.02);
        const stem = new THREE.Mesh(mushStemGeo, mushStemMat);
        stem.scale.set(0.85 + (i % 3) * 0.12, stemH, 0.85 + (i % 3) * 0.12);
        stem.position.set(x, stemH / 2, z);
        const cap = new THREE.Mesh(mushCapGeo, mushCapMats[(hash + i + blueBias) % mushCapMats.length]);
        cap.scale.set(capR, capR * 0.4, capR);
        cap.position.set(x, stemH + capR * 0.12, z);
        const glow = new THREE.Mesh(mushGlowGeo, mushGlowMat);
        glow.scale.setScalar(capR * 1.35);
        glow.position.copy(cap.position);
        group.add(stem, cap, glow);
        maxY = Math.max(maxY, cap.position.y);
    }
    const origin = new THREE.Object3D();
    origin.position.set(0, maxY + 0.03, 0);
    const light = new THREE.PointLight(blueBias ? 0x66d8ff : 0x66ffc4, 1.15, 2.4, 2);
    light.position.set(0, maxY + 0.02, 0);
    light.userData.base = 0.85 + (hash % 5) * 0.12;
    light.intensity = light.userData.base;
    group.add(origin, light);
    group.userData.origin = origin;
    group.userData.light = light;
    return group;
}

function makeBarrel() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.22, 10), woodMat);
    body.position.y = 0.11;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.03, 10), ironMat);
    band.position.y = 0.11;
    group.add(body, band);
    return group;
}

function makeCrate() {
    const group = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.22), woodMat);
    box.position.y = 0.1;
    box.rotation.y = 0.18;
    group.add(box);
    return group;
}

function makeChair() {
    const group = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.18), woodMat);
    seat.position.y = 0.18;
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.04), woodMat);
    back.position.set(0, 0.3, -0.07);
    const legGeo = new THREE.BoxGeometry(0.03, 0.16, 0.03);
    for (const [lx, lz] of [[-0.07, -0.07], [0.07, -0.07], [-0.07, 0.07], [0.07, 0.07]]) {
        const leg = new THREE.Mesh(legGeo, woodMat);
        leg.position.set(lx, 0.08, lz);
        group.add(leg);
    }
    group.add(seat, back);
    return group;
}

function makePit() {
    const group = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 12), ironMat);
    ring.position.y = 0.036;
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.03, 12), voidMat);
    hole.position.y = 0.03;
    group.add(ring, hole);
    return group;
}

function makeRug(hash) {
    const group = new THREE.Group();
    const rug = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.018, 0.34), clothMats[hash % clothMats.length]);
    rug.position.y = 0.032;
    group.add(rug);
    return group;
}

function makeTable(width = 0.72, depth = 0.72) {
    const group = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(width, 0.05, depth), woodMat);
    top.position.y = 0.42;
    top.castShadow = true;
    const legGeo = new THREE.BoxGeometry(0.05, 0.4, 0.05);
    const ox = width / 2 - 0.08;
    const oz = depth / 2 - 0.08;
    for (const [lx, lz] of [[-ox, -oz], [ox, -oz], [-ox, oz], [ox, oz]]) {
        const leg = new THREE.Mesh(legGeo, woodMat);
        leg.position.set(lx, 0.2, lz);
        group.add(leg);
    }
    group.add(top);
    return group;
}

function makeDiningTable() {
    const group = makeTable(1.55, 1.55);
    const cloth = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.02, 1.32), clothMats[0]);
    cloth.position.y = 0.45;
    group.add(cloth);
    const seats = [
        [0, -0.82, 0],
        [0, 0.82, Math.PI],
        [-0.82, 0, Math.PI / 2],
        [0.82, 0, -Math.PI / 2],
    ];
    for (const [dx, dz, rot] of seats) {
        const chair = makeChair();
        chair.position.set(dx, 0, dz);
        chair.rotation.y = rot;
        group.add(chair);
    }
    return group;
}

function makeBed() {
    const group = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 1.15), woodMat);
    frame.position.y = 0.16;
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.12, 0.98), clothMats[1]);
    mattress.position.y = 0.28;
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.08, 0.72), clothMats[2]);
    pillow.position.set(-0.52, 0.36, 0);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 1.18), woodMat);
    head.position.set(-0.82, 0.35, 0);
    group.add(frame, mattress, pillow, head);
    return group;
}

function makeBookshelf() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.18, 0.3), woodMat);
    body.position.y = 0.59;
    body.castShadow = true;
    group.add(body);
    for (const y of [0.22, 0.52, 0.82, 1.12]) {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.03, 0.28), woodMat);
        shelf.position.y = y;
        group.add(shelf);
    }
    for (let i = 0; i < 8; i++) {
        const book = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.18, 0.2),
            paintMats[i % paintMats.length],
        );
        book.position.set(-0.32 + (i % 4) * 0.2, 0.34 + Math.floor(i / 4) * 0.32, 0);
        group.add(book);
    }
    return group;
}

function makeCabinet() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.74, 0.34), woodMat);
    body.position.y = 0.37;
    body.castShadow = true;
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.52, 0.04), woodMat);
    door.position.set(-0.1, 0.4, 0.17);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), ironMat);
    knob.position.set(-0.02, 0.4, 0.2);
    group.add(body, door, knob);
    return group;
}

function makeAltar() {
    const group = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.45), stoneish());
    base.position.y = 0.08;
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.08, 0.52), goldMat);
    top.position.y = 0.2;
    group.add(base, top);
    return group;
}

function makeAnvil() {
    const group = new THREE.Group();
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.22), ironMat);
    block.position.y = 0.22;
    const horn = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.1), ironMat);
    horn.position.set(0.22, 0.3, 0);
    const glow = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.2), torchFlameMat);
    glow.position.set(-0.28, 0.12, 0);
    group.add(block, horn, glow);
    return group;
}

function makeSarcophagus() {
    const group = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.32, 0.42), wallMat);
    box.position.y = 0.16;
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.46), crackedWallMat);
    lid.position.y = 0.36;
    group.add(box, lid);
    return group;
}

function makeWell() {
    const group = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.22, 10), wallMat);
    ring.position.y = 0.11;
    const water = new THREE.Mesh(new THREE.CircleGeometry(0.2, 10), waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.12;
    group.add(ring, water);
    return group;
}

function makePlanter() {
    const group = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.28), woodMat);
    box.position.y = 0.08;
    const plant = makePlant();
    plant.scale.set(0.7, 0.7, 0.7);
    plant.position.y = 0.08;
    group.add(box, plant);
    return group;
}

function makeShelf() {
    const group = new THREE.Group();
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.05, 0.08), woodMat);
    back.position.set(0, 0.52, -0.12);
    back.castShadow = true;
    group.add(back);
    for (const y of [0.22, 0.52, 0.82]) {
        const plank = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.04, 0.28), woodMat);
        plank.position.set(0, y, 0.02);
        group.add(plank);
    }
    const crock = makeCrocks();
    crock.scale.set(0.85, 0.85, 0.85);
    crock.position.set(-0.22, 0.22, 0.04);
    const sack = makeGrainSack();
    sack.scale.set(0.7, 0.7, 0.7);
    sack.position.set(0.2, 0.52, 0.02);
    const ham = makeHangingHam();
    ham.position.set(0, 0.95, 0.08);
    ham.scale.set(0.7, 0.7, 0.7);
    group.add(crock, sack, ham);
    return group;
}

function makeBunk(doubleDeck = false) {
    const group = new THREE.Group();
    const postH = doubleDeck ? 1.12 : 0.52;
    const postGeo = new THREE.BoxGeometry(0.06, postH, 0.06);
    for (const [lx, lz] of [[-0.42, -0.28], [0.42, -0.28], [-0.42, 0.28], [0.42, 0.28]]) {
        const post = new THREE.Mesh(postGeo, woodMat);
        post.position.set(lx, postH / 2, lz);
        group.add(post);
    }
    const deck = (y) => {
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.62), woodMat);
        frame.position.y = y;
        const mattress = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.08, 0.54), strawMat);
        mattress.position.y = y + 0.06;
        const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.28), sackclothMat);
        pillow.position.set(-0.28, y + 0.12, 0);
        group.add(frame, mattress, pillow);
    };
    deck(0.28);
    if (doubleDeck) {
        deck(0.78);
        const ladder = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.7, 0.04), woodMat);
        ladder.position.set(0.48, 0.5, 0.22);
        group.add(ladder);
    }
    return group;
}

function makeStove() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.48, 0.52), ironMat);
    body.position.y = 0.24;
    body.castShadow = true;
    const rustBand = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.08, 0.54), rustMat);
    rustBand.position.y = 0.18;
    const grate = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.28), rustMat);
    grate.position.set(0, 0.28, 0.22);
    const glow = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.04), torchFlameMat);
    glow.position.set(0, 0.22, 0.26);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.55, 8), rustMat);
    pipe.position.set(0.22, 0.72, -0.12);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 10), ironMat);
    lid.position.set(-0.12, 0.5, 0);
    const kettle = makeKettle();
    kettle.scale.set(0.7, 0.7, 0.7);
    kettle.position.set(0.12, 0.5, 0.04);
    group.add(body, rustBand, grate, glow, pipe, lid, kettle);
    return group;
}

function makeDesk() {
    const group = makeTable(0.95, 0.58);
    const pages = makeScrollPile();
    pages.position.set(-0.22, 0.45, 0.04);
    const ink = makeInkQuill();
    ink.position.set(0.18, 0.45, -0.06);
    const book = makeFallenBook();
    book.position.set(0.22, 0.45, 0.12);
    const candle = makeNightstandCandle();
    candle.position.set(-0.32, 0.45, -0.14);
    group.add(pages, ink, book, candle);
    return group;
}

function makeCistern() {
    const group = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.28, 12), wallMat);
    ring.position.y = 0.14;
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.12, 12), voidMat);
    inner.position.y = 0.18;
    const grate = makeGrateCover();
    grate.scale.set(1.4, 1, 1.4);
    grate.position.y = 0.22;
    group.add(ring, inner, grate);
    return group;
}

function makeWeaponRack() {
    const group = new THREE.Group();
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.08), woodMat);
    post.position.y = 0.7;
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), woodMat);
    stand.position.y = 0.35;
    const a = makeWeapons(2);
    a.position.set(-0.18, 0.55, 0);
    const b = makeWeapons(3);
    b.position.set(0.18, 0.55, 0);
    group.add(post, stand, a, b);
    return group;
}

function makePew() {
    const group = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.28), woodMat);
    seat.position.y = 0.22;
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.32, 0.06), woodMat);
    back.position.set(0, 0.4, -0.12);
    group.add(seat, back);
    return group;
}

function entry(id, label, build) {
    return { id, label, build };
}

const creatures = [
    entry('goblin', 'goblin', makeGoblin),
    entry('ghost', 'ghost', makeGhost),
    entry('frog', 'frog', makeFrog),
];

const weapons = [
    entry('staff', 'staff', makeStaff),
    entry('sword', 'sword', makeSword),
    entry('shield', 'shield', makeShield),
    entry('wall-sword', 'wall sword', () => makeWeapons(0)),
    entry('wall-shield', 'wall shield', () => makeWeapons(1)),
];

const props = [
    entry('altar', 'altar', makeAltar),
    entry('anvil', 'anvil', makeAnvil),
    entry('banner', 'banner', () => makeBanner(0)),
    entry('barrel', 'barrel', makeBarrel),
    entry('bed', 'bed', makeBed),
    entry('bedroll', 'bedroll', makeBedroll),
    entry('bellows', 'bellows', makeBellows),
    entry('bird-bath', 'bird bath', makeBirdBath),
    entry('bone', 'bone', makeBone),
    entry('bone-pile', 'bone pile', () => makeBonePile(0)),
    entry('bookshelf', 'bookshelf', makeBookshelf),
    entry('boots', 'boots', makeBoots),
    entry('boulder', 'boulder', () => makeBoulder(0)),
    entry('broom', 'broom', makeBroom),
    entry('broken-stool', 'broken stool', makeBrokenStool),
    entry('bucket', 'bucket', makeBucket),
    entry('bunk', 'bunk', () => makeBunk(false)),
    entry('bunk-double', 'bunk double', () => makeBunk(true)),
    entry('cabinet', 'cabinet', makeCabinet),
    entry('candelabra', 'candelabra', makeCandelabra),
    entry('candle-cluster', 'candle cluster', () => makeCandleCluster(0)),
    entry('chained-bucket', 'chained bucket', makeChainedBucket),
    entry('chamber-pot', 'chamber pot', makeChamberPot),
    entry('chair', 'chair', makeChair),
    entry('cistern', 'cistern', makeCistern),
    entry('clothes-pile', 'clothes pile', makeClothesPile),
    entry('coal-heap', 'coal heap', makeCoalHeap),
    entry('coffin-fragment', 'coffin fragment', makeCoffinFragment),
    entry('crate', 'crate', makeCrate),
    entry('crocks', 'crocks', makeCrocks),
    entry('crystal-shard', 'crystal shard', makeCrystalShard),
    entry('cutting-board', 'cutting board', makeCuttingBoard),
    entry('debris-pile', 'debris pile', () => makeDebrisPile(0)),
    entry('desk', 'desk', makeDesk),
    entry('dining-table', 'dining table', makeDiningTable),
    entry('drip-pipe', 'drip pipe', makeDripPipe),
    entry('fallen-book', 'fallen book', makeFallenBook),
    entry('floor-lantern', 'floor lantern', makeFloorLantern),
    entry('floor-shield', 'floor shield', makeFloorShield),
    entry('flower-crate', 'flower crate', makeFlowerCrate),
    entry('folded-linens', 'folded linens', makeFoldedLinens),
    entry('goblet', 'goblet', makeGoblet),
    entry('gold-urn', 'gold urn', makeGoldUrn),
    entry('grain-sack', 'grain sack', makeGrainSack),
    entry('grate-cover', 'grate cover', makeGrateCover),
    entry('hanging-chain', 'hanging chain', makeHangingChain),
    entry('hanging-ham', 'hanging ham', makeHangingHam),
    entry('hat-box', 'hat box', makeHatBox),
    entry('helm', 'helm', makeHelm),
    entry('hole', 'hole', makeHole),
    entry('holy-plaque', 'holy plaque', makeHolyPlaque),
    entry('incense', 'incense', makeIncense),
    entry('ingot', 'ingot', makeIngot),
    entry('ink-quill', 'ink quill', makeInkQuill),
    entry('kettle', 'kettle', makeKettle),
    entry('kneeling-cushion', 'kneeling cushion', makeKneelingCushion),
    entry('lectern', 'lectern', makeLectern),
    entry('melted-candles', 'melted candles', makeMeltedCandles),
    entry('moss-tuft', 'moss tuft', makeMossTuft),
    entry('mushroom', 'mushroom', () => makeMushroom(0, 0)),
    entry('nest', 'nest', makeNest),
    entry('nightstand-candle', 'nightstand candle', makeNightstandCandle),
    entry('offering-bowl', 'offering bowl', makeOfferingBowl),
    entry('overturned-pot', 'overturned pot', makeOverturnedPot),
    entry('painting', 'painting', () => makePainting(0)),
    entry('pebble-cluster', 'pebble cluster', () => makePebbleCluster(0)),
    entry('pew', 'pew', makePew),
    entry('pit', 'pit', makePit),
    entry('place-setting', 'place setting', makePlaceSetting),
    entry('plant', 'plant', makePlant),
    entry('planter', 'planter', makePlanter),
    entry('platter', 'platter', makePlatter),
    entry('rope-coil', 'rope coil', makeRopeCoil),
    entry('rug', 'rug', () => makeRug(0)),
    entry('sack', 'sack', makeSack),
    entry('sarcophagus', 'sarcophagus', makeSarcophagus),
    entry('scroll-pile', 'scroll pile', makeScrollPile),
    entry('shackles', 'shackles', makeShackles),
    entry('shelf', 'shelf', makeShelf),
    entry('skull-stack', 'skull stack', makeSkullStack),
    entry('slag', 'slag', makeSlag),
    entry('slime-bucket', 'slime bucket', makeSlimeBucket),
    entry('spear-stand', 'spear stand', makeSpearStand),
    entry('stacked-bowls', 'stacked bowls', makeStackedBowls),
    entry('stalagmite', 'stalagmite', () => makeStalagmite(0)),
    entry('stove', 'stove', makeStove),
    entry('straw-pile', 'straw pile', makeStrawPile),
    entry('table', 'table', () => makeTable()),
    entry('tin-cup', 'tin cup', makeTinCup),
    entry('tiny-globe', 'tiny globe', makeTinyGlobe),
    entry('tongs', 'tongs', makeTongs),
    entry('torch', 'torch', makeTorch),
    entry('urn', 'urn', makeUrn),
    entry('velvet-stool', 'velvet stool', makeVelvetStool),
    entry('washbasin', 'washbasin', makeWashbasin),
    entry('watering-can', 'watering can', makeWateringCan),
    entry('weapon-rack', 'weapon rack', makeWeaponRack),
    entry('well', 'well', makeWell),
].sort((a, b) => a.label.localeCompare(b.label));

export const ASSETS = [...creatures, ...weapons, ...props];

