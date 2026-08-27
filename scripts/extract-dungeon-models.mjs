import fs from 'node:fs';
import path from 'node:path';

const htmlPath = path.join(process.cwd(), 'public', 'dungeon.html');
const outPath = path.join(process.cwd(), 'public', 'dungeon-models.js');
const src = fs.readFileSync(htmlPath, 'utf8');

function extractFunction(name) {
    const needle = `function ${name}(`;
    const start = src.indexOf(needle);
    if (start < 0) {
        throw new Error(`Missing function ${name}`);
    }
    let i = src.indexOf('{', start);
    let depth = 0;
    for (; i < src.length; i++) {
        const ch = src[i];
        if (ch === '{') depth += 1;
        else if (ch === '}') {
            depth -= 1;
            if (depth === 0) {
                return src.slice(start, i + 1);
            }
        }
    }
    throw new Error(`Unclosed function ${name}`);
}

const CANVAS_FNS = [
    'canvasToTexture',
    'makeClutterCanvas',
    'makeStrawCanvas',
    'makeSackclothCanvas',
    'makeLinenCanvas',
    'makeBoneCanvas',
    'makeRustCanvas',
    'makeWaxCanvas',
    'makeCrystalCanvas',
    'makeSlimeClutterCanvas',
    'makeGoldTrimCanvas',
    'makeScrollCanvas',
    'makeHamCanvas',
];

const MODEL_FNS = [
    'makeGoblin',
    'makeGhost',
    'makeFrog',
    'makeTorch',
    'makeHole',
    'makePainting',
    'makeWeapons',
    'makeBanner',
    'makeStalagmite',
    'makeBoulder',
    'makePlant',
    'makeBucket',
    'makeSack',
    'makeGrainSack',
    'makeCandleCluster',
    'makeFloorLantern',
    'makeBonePile',
    'makeBone',
    'makeBrokenStool',
    'makeStackedBowls',
    'makeRopeCoil',
    'makeHangingChain',
    'makeDebrisPile',
    'makeShackles',
    'makeStrawPile',
    'makeTinCup',
    'makeChainedBucket',
    'makeHangingHam',
    'makeCrocks',
    'makeCuttingBoard',
    'makeKettle',
    'makeOverturnedPot',
    'makeFoldedLinens',
    'makeHatBox',
    'makeBroom',
    'makeBoots',
    'makeNightstandCandle',
    'makeChamberPot',
    'makeClothesPile',
    'makeWashbasin',
    'makeLectern',
    'makeInkQuill',
    'makeScrollPile',
    'makeTinyGlobe',
    'makeFallenBook',
    'makePlaceSetting',
    'makeGoblet',
    'makeCandelabra',
    'makePlatter',
    'makeKneelingCushion',
    'makeOfferingBowl',
    'makeIncense',
    'makeHolyPlaque',
    'makeCoalHeap',
    'makeTongs',
    'makeIngot',
    'makeBellows',
    'makeSlag',
    'makeHelm',
    'makeFloorShield',
    'makeBedroll',
    'makeSpearStand',
    'makeSkullStack',
    'makeUrn',
    'makeGoldUrn',
    'makeMeltedCandles',
    'makeCoffinFragment',
    'makeGrateCover',
    'makeDripPipe',
    'makeSlimeBucket',
    'makeMossTuft',
    'makeWateringCan',
    'makeFlowerCrate',
    'makeBirdBath',
    'makeCrystalShard',
    'makeNest',
    'makePebbleCluster',
    'makeVelvetStool',
    'makeMushroom',
    'makeBarrel',
    'makeCrate',
    'makeChair',
    'makePit',
    'makeRug',
    'makeTable',
    'makeDiningTable',
    'makeBed',
    'makeBookshelf',
    'makeCabinet',
    'makeFenceWall',
    'makeHoleWall',
    'addPitWell',
    'makeWaterTile',
    'makeSpikeTile',
    'makeAltar',
    'stoneish',
    'makeAnvil',
    'makeSarcophagus',
    'makeWell',
    'makePlanter',
    'makeShelf',
    'makeBunk',
    'makeStove',
    'makeDesk',
    'makeCistern',
    'makeWeaponRack',
    'makePew',
    'sizePainting',
];

const extracted = [...CANVAS_FNS, ...MODEL_FNS].map((name) => extractFunction(name)).join('\n\n');

const header = `// Generated from dungeon.html model builders. Do not edit by hand;
// re-run \`node scripts/extract-dungeon-models.mjs\` after changing makers.

export function createDungeonModels(THREE) {
    const CELL = 1;
    const WALL_H = 1.55;
    const artworkUrls = [];
    const waterMeshes = [];
    function bindArtwork() {}

    function canvasToTexture() {}
`;

const setup = `
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a3e28, roughness: 0.86, metalness: 0.04 });
    const frameMats = [0xc4a24a, 0x8a3a28, 0x3a4a6b, 0x2e6b48, 0x6b2d5a].map((color) =>
        new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.18 }),
    );
    const artworkEmptyMat = new THREE.MeshStandardMaterial({
        color: 0xc41818, roughness: 0.85, metalness: 0.02,
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
        roughness: 0.28, metalness: 0.12, emissive: 0x224466, emissiveIntensity: 0.45,
    });
    const slimeClutterMat = new THREE.MeshStandardMaterial({
        map: canvasToTexture(makeSlimeClutterCanvas(), 1, 1),
        roughness: 0.35, metalness: 0.08, emissive: 0x1a3a08, emissiveIntensity: 0.25,
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
        color: 0xa8c8ff, transparent: true, opacity: 0.28,
        depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
    });
    const ghostSheetMat = new THREE.MeshStandardMaterial({
        color: 0xd4e4f8, transparent: true, opacity: 0.62,
        roughness: 0.35, metalness: 0, emissive: 0x3a5a88, emissiveIntensity: 0.55, depthWrite: false,
    });
    const ghostHoleMat = new THREE.MeshBasicMaterial({ color: 0x081018 });
    const mushStemMat = new THREE.MeshStandardMaterial({ color: 0xc8c2a8, roughness: 0.88, metalness: 0.02 });
    const mushCapMats = [
        new THREE.MeshStandardMaterial({ color: 0x5ee87a, emissive: 0x1f8a38, emissiveIntensity: 1.05, roughness: 0.48, metalness: 0.04 }),
        new THREE.MeshStandardMaterial({ color: 0x4ee0c4, emissive: 0x168a78, emissiveIntensity: 1.15, roughness: 0.42, metalness: 0.06 }),
        new THREE.MeshStandardMaterial({ color: 0x62d8ff, emissive: 0x1a6a9a, emissiveIntensity: 1.2, roughness: 0.4, metalness: 0.08 }),
    ];
    const mushGlowMat = new THREE.MeshBasicMaterial({
        color: 0x88ffe0, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const mushStemGeo = new THREE.CylinderGeometry(0.02, 0.03, 1, 6);
    const mushCapGeo = new THREE.SphereGeometry(1, 8, 6);
    const mushGlowGeo = new THREE.SphereGeometry(1, 8, 6);
    const voidMat = new THREE.MeshStandardMaterial({ color: 0x050403, roughness: 1, metalness: 0, emissive: 0x000000 });
    const paintMats = [0x6b2d2d, 0x2d4a6b, 0x4a6b2d, 0x6b5a2d, 0x4a2d6b].map((color) =>
        new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.02 }),
    );
    const clothMats = [0x6b1c1c, 0x1c3a6b, 0x3a1c4a, 0x1c4a2a].map((color) =>
        new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0 }),
    );
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x6e6256, roughness: 0.92, metalness: 0.04 });
    const crackedWallMat = new THREE.MeshStandardMaterial({ color: 0x5a5248, roughness: 0.94, metalness: 0.03 });
    const waterMat = new THREE.MeshStandardMaterial({
        color: 0x1a4858, emissive: 0x0a2838, emissiveIntensity: 0.55,
        roughness: 0.18, metalness: 0.35, transparent: true, opacity: 0.82,
    });
    const spikeMat = new THREE.MeshStandardMaterial({ color: 0x6a6460, roughness: 0.4, metalness: 0.65 });
    const pitMat = new THREE.MeshStandardMaterial({ color: 0x0a0806, roughness: 1, metalness: 0 });
    const goldMat = new THREE.MeshStandardMaterial({
        color: 0xe2b84a, emissive: 0x6a4808, emissiveIntensity: 0.55, roughness: 0.28, metalness: 0.9,
    });
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x9a9084, roughness: 0.72, metalness: 0.08 });
    const torchBracketMat = new THREE.MeshStandardMaterial({ color: 0x2a2218, roughness: 0.8, metalness: 0.35 });
    const torchFlameMat = new THREE.MeshStandardMaterial({
        color: 0xffb040, emissive: 0xff6a14, emissiveIntensity: 2.4, roughness: 1, metalness: 0,
    });
    const staffWoodMat = new THREE.MeshStandardMaterial({ color: 0x4a2e18, roughness: 0.92, metalness: 0.04 });
    const staffIronMat = new THREE.MeshStandardMaterial({ color: 0x8a8174, roughness: 0.38, metalness: 0.78 });
    const staffCrystalMat = new THREE.MeshStandardMaterial({
        color: 0xff4a14, emissive: 0xff2a00, emissiveIntensity: 1.8,
        roughness: 0.22, metalness: 0.12, transparent: true, opacity: 0.94,
    });

    const torchBracketGeo = new THREE.BoxGeometry(0.07, 0.28, 0.05);
    const torchBowlGeo = new THREE.BoxGeometry(0.11, 0.045, 0.09);
    const torchFlameGeo = new THREE.BoxGeometry(0.055, 0.11, 0.055);
    const torchTipGeo = new THREE.BoxGeometry(0.03, 0.08, 0.03);
    const fencePostGeo = new THREE.BoxGeometry(0.04, 0.72, 0.04);
    const fenceRailGeo = new THREE.BoxGeometry(0.98, 0.03, 0.03);
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
    const PIT_DEPTH = 0.48;
    const PIT_INNER = 0.86;
    const PIT_THICK = 0.08;
    const pitBottomGeo = new THREE.BoxGeometry(PIT_INNER, 0.05, PIT_INNER);
    const pitNsGeo = new THREE.BoxGeometry(PIT_INNER + PIT_THICK, PIT_DEPTH, PIT_THICK);
    const pitEwGeo = new THREE.BoxGeometry(PIT_THICK, PIT_DEPTH, PIT_INNER);
    const pitRimNsGeo = new THREE.BoxGeometry(1.02, 0.05, 0.12);
    const pitRimEwGeo = new THREE.BoxGeometry(0.12, 0.05, 0.78);
    const pitWaterGeo = new THREE.PlaneGeometry(0.78, 0.78);
    const pitSpikeGeo = new THREE.ConeGeometry(0.05, 0.32, 5);

    function makeStaff() {
        const group = new THREE.Group();
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.026, 0.78, 7), staffWoodMat);
        shaft.position.y = 0.16;
        const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.1, 7), staffIronMat);
        grip.position.y = -0.16;
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.028, 0.04, 8), staffIronMat);
        band.position.y = 0.48;
        const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.055, 0), staffCrystalMat);
        crystal.position.y = 0.58;
        const glow = new THREE.Mesh(
            new THREE.SphereGeometry(0.07, 10, 8),
            new THREE.MeshBasicMaterial({
                color: 0xff6622, transparent: true, opacity: 0.35,
                depthWrite: false, blending: THREE.AdditiveBlending,
            }),
        );
        glow.position.y = 0.58;
        group.add(shaft, grip, band, crystal, glow);
        return group;
    }

    function makeSword() {
        const group = new THREE.Group();
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.42, 0.012), staffIronMat);
        blade.position.y = 0.22;
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.028), staffIronMat);
        guard.position.y = 0.02;
        const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.12, 6), staffWoodMat);
        hilt.position.y = -0.05;
        const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 5), staffIronMat);
        pommel.position.y = -0.12;
        group.add(blade, guard, hilt, pommel);
        return group;
    }

    function makePlayerShield() {
        const group = new THREE.Group();
        const disk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 8), staffWoodMat);
        disk.rotation.x = Math.PI / 2;
        const boss = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), staffIronMat);
        boss.position.z = 0.03;
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.012, 6, 10), staffIronMat);
        group.add(disk, boss, rim);
        return group;
    }

    function makeExit() {
        const group = new THREE.Group();
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.06, 12), pillarMat);
        base.position.y = 0.03;
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.34, 12), pillarMat);
        shaft.position.y = 0.23;
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.12, 0.06, 12), pillarMat);
        cap.position.y = 0.43;
        const spikeGeo = new THREE.ConeGeometry(0.032, 0.15, 6);
        for (let i = 0; i < 6; i++) {
            const spike = new THREE.Mesh(spikeGeo, goldMat);
            const a = (i / 6) * Math.PI * 2;
            spike.position.set(Math.cos(a) * 0.16, 0.52, Math.sin(a) * 0.16);
            group.add(spike);
        }
        group.add(base, shaft, cap);
        return group;
    }
`;

const footer = `
    const assets = [
        { id: 'goblin', name: 'Goblin', create: makeGoblin },
        { id: 'ghost', name: 'Ghost', create: makeGhost },
        { id: 'frog', name: 'Frog', create: makeFrog },
        { id: 'staff', name: 'Staff', create: makeStaff },
        { id: 'sword', name: 'Sword', create: makeSword },
        { id: 'player-shield', name: 'Shield', create: makePlayerShield },
        { id: 'exit', name: 'Exit pillar', create: makeExit },
        { id: 'torch', name: 'Torch', create: makeTorch },
        { id: 'mushroom', name: 'Mushroom', create: () => makeMushroom(3, 0) },
        { id: 'wall-sword', name: 'Wall sword', create: () => makeWeapons(0) },
        { id: 'wall-shield', name: 'Wall shield', create: () => makeWeapons(1) },
        { id: 'banner', name: 'Banner', create: () => makeBanner(0) },
        { id: 'painting', name: 'Painting', create: () => makePainting(0) },
        { id: 'hole', name: 'Wall hole', create: makeHole },
        { id: 'bed', name: 'Bed', create: makeBed },
        { id: 'bunk', name: 'Bunk', create: () => makeBunk(false) },
        { id: 'bunk-double', name: 'Bunk (double)', create: () => makeBunk(true) },
        { id: 'table', name: 'Table', create: () => makeTable() },
        { id: 'dining-table', name: 'Dining table', create: makeDiningTable },
        { id: 'desk', name: 'Desk', create: makeDesk },
        { id: 'chair', name: 'Chair', create: makeChair },
        { id: 'bookshelf', name: 'Bookshelf', create: makeBookshelf },
        { id: 'cabinet', name: 'Cabinet', create: makeCabinet },
        { id: 'shelf', name: 'Shelf', create: makeShelf },
        { id: 'stove', name: 'Stove', create: makeStove },
        { id: 'altar', name: 'Altar', create: makeAltar },
        { id: 'pew', name: 'Pew', create: makePew },
        { id: 'anvil', name: 'Anvil', create: makeAnvil },
        { id: 'weapon-rack', name: 'Weapon rack', create: makeWeaponRack },
        { id: 'sarcophagus', name: 'Sarcophagus', create: makeSarcophagus },
        { id: 'well', name: 'Well', create: makeWell },
        { id: 'cistern', name: 'Cistern', create: makeCistern },
        { id: 'planter', name: 'Planter', create: makePlanter },
        { id: 'barrel', name: 'Barrel', create: makeBarrel },
        { id: 'crate', name: 'Crate', create: makeCrate },
        { id: 'fence', name: 'Fence', create: makeFenceWall },
        { id: 'hole-wall', name: 'Hole wall', create: makeHoleWall },
        { id: 'water-tile', name: 'Water pit', create: makeWaterTile },
        { id: 'spike-tile', name: 'Spike pit', create: makeSpikeTile },
        { id: 'pit', name: 'Pit', create: makePit },
        { id: 'rug', name: 'Rug', create: () => makeRug(0) },
        { id: 'plant', name: 'Plant', create: makePlant },
        { id: 'bucket', name: 'Bucket', create: makeBucket },
        { id: 'sack', name: 'Sack', create: makeSack },
        { id: 'grain-sack', name: 'Grain sack', create: makeGrainSack },
        { id: 'candle-cluster', name: 'Candle cluster', create: () => makeCandleCluster(2) },
        { id: 'floor-lantern', name: 'Floor lantern', create: makeFloorLantern },
        { id: 'bone-pile', name: 'Bone pile', create: () => makeBonePile(0) },
        { id: 'bone', name: 'Bone', create: makeBone },
        { id: 'broken-stool', name: 'Broken stool', create: makeBrokenStool },
        { id: 'stacked-bowls', name: 'Stacked bowls', create: makeStackedBowls },
        { id: 'rope-coil', name: 'Rope coil', create: makeRopeCoil },
        { id: 'hanging-chain', name: 'Hanging chain', create: makeHangingChain },
        { id: 'debris-pile', name: 'Debris pile', create: () => makeDebrisPile(0) },
        { id: 'shackles', name: 'Shackles', create: makeShackles },
        { id: 'straw-pile', name: 'Straw pile', create: makeStrawPile },
        { id: 'tin-cup', name: 'Tin cup', create: makeTinCup },
        { id: 'chained-bucket', name: 'Chained bucket', create: makeChainedBucket },
        { id: 'hanging-ham', name: 'Hanging ham', create: makeHangingHam },
        { id: 'crocks', name: 'Crocks', create: makeCrocks },
        { id: 'cutting-board', name: 'Cutting board', create: makeCuttingBoard },
        { id: 'kettle', name: 'Kettle', create: makeKettle },
        { id: 'overturned-pot', name: 'Overturned pot', create: makeOverturnedPot },
        { id: 'folded-linens', name: 'Folded linens', create: makeFoldedLinens },
        { id: 'hat-box', name: 'Hat box', create: makeHatBox },
        { id: 'broom', name: 'Broom', create: makeBroom },
        { id: 'boots', name: 'Boots', create: makeBoots },
        { id: 'nightstand-candle', name: 'Nightstand candle', create: makeNightstandCandle },
        { id: 'chamber-pot', name: 'Chamber pot', create: makeChamberPot },
        { id: 'clothes-pile', name: 'Clothes pile', create: makeClothesPile },
        { id: 'washbasin', name: 'Washbasin', create: makeWashbasin },
        { id: 'lectern', name: 'Lectern', create: makeLectern },
        { id: 'ink-quill', name: 'Ink and quill', create: makeInkQuill },
        { id: 'scroll-pile', name: 'Scroll pile', create: makeScrollPile },
        { id: 'tiny-globe', name: 'Tiny globe', create: makeTinyGlobe },
        { id: 'fallen-book', name: 'Fallen book', create: makeFallenBook },
        { id: 'place-setting', name: 'Place setting', create: makePlaceSetting },
        { id: 'goblet', name: 'Goblet', create: makeGoblet },
        { id: 'candelabra', name: 'Candelabra', create: makeCandelabra },
        { id: 'platter', name: 'Platter', create: makePlatter },
        { id: 'kneeling-cushion', name: 'Kneeling cushion', create: makeKneelingCushion },
        { id: 'offering-bowl', name: 'Offering bowl', create: makeOfferingBowl },
        { id: 'incense', name: 'Incense', create: makeIncense },
        { id: 'holy-plaque', name: 'Holy plaque', create: makeHolyPlaque },
        { id: 'coal-heap', name: 'Coal heap', create: makeCoalHeap },
        { id: 'tongs', name: 'Tongs', create: makeTongs },
        { id: 'ingot', name: 'Ingot', create: makeIngot },
        { id: 'bellows', name: 'Bellows', create: makeBellows },
        { id: 'slag', name: 'Slag', create: makeSlag },
        { id: 'helm', name: 'Helm', create: makeHelm },
        { id: 'floor-shield', name: 'Floor shield', create: makeFloorShield },
        { id: 'bedroll', name: 'Bedroll', create: makeBedroll },
        { id: 'spear-stand', name: 'Spear stand', create: makeSpearStand },
        { id: 'skull-stack', name: 'Skull stack', create: makeSkullStack },
        { id: 'urn', name: 'Urn', create: makeUrn },
        { id: 'gold-urn', name: 'Gold urn', create: makeGoldUrn },
        { id: 'melted-candles', name: 'Melted candles', create: makeMeltedCandles },
        { id: 'coffin-fragment', name: 'Coffin fragment', create: makeCoffinFragment },
        { id: 'grate-cover', name: 'Grate cover', create: makeGrateCover },
        { id: 'drip-pipe', name: 'Drip pipe', create: makeDripPipe },
        { id: 'slime-bucket', name: 'Slime bucket', create: makeSlimeBucket },
        { id: 'moss-tuft', name: 'Moss tuft', create: makeMossTuft },
        { id: 'watering-can', name: 'Watering can', create: makeWateringCan },
        { id: 'flower-crate', name: 'Flower crate', create: makeFlowerCrate },
        { id: 'bird-bath', name: 'Bird bath', create: makeBirdBath },
        { id: 'crystal-shard', name: 'Crystal shard', create: makeCrystalShard },
        { id: 'nest', name: 'Nest', create: makeNest },
        { id: 'pebble-cluster', name: 'Pebble cluster', create: () => makePebbleCluster(0) },
        { id: 'velvet-stool', name: 'Velvet stool', create: makeVelvetStool },
        { id: 'stalagmite', name: 'Stalagmite', create: () => makeStalagmite(2) },
        { id: 'boulder', name: 'Boulder', create: () => makeBoulder(1) },
    ];

    return { assets };
}
`;

// The dummy canvasToTexture in the header is replaced by the extracted one.
const headerFixed = header.replace(
    `    function canvasToTexture() {}
`,
    '',
);

const body = extracted.replace(/^        /gm, '    ');

const file = `${headerFixed}${setup}

${body}
${footer}`;

fs.writeFileSync(outPath, file);
console.log(`Wrote ${outPath} (${file.length} bytes, ${file.split('\\n').length} lines)`);
