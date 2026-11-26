'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { Vector3, Quaternion, Euler, Color, BufferGeometry, Float32BufferAttribute, Matrix4 } = require('three');
const root = path.join(__dirname, '..');
const source = vm.createContext({});
for (const file of ['data.js', 'hiker3d.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'map', file), 'utf8'), source, { filename: file });
}
const { WindHiker } = source;
const rest = WindHiker.create().pose({ dt: 0 });
const vector = a => new Vector3(...a);
const rotation = (x = 0, y = 0, z = 0) => new Quaternion().setFromEuler(new Euler(x, y, z));
const joints = [], inverse = [], jointIndex = new Map();
function add(name, parent, origin, end) {
  jointIndex.set(name, joints.length);
  joints.push({ name, parent, origin: vector(origin), axis: end ? vector(end).sub(vector(origin)).normalize() : null });
  inverse.push(...new Matrix4().makeTranslation(...origin.map(value => -value)).toArray());
}
add('Spine', null, [0, 1.14, 0]);
add('Head', 'Spine', [0, 2.19, .05]);
add('Pack', 'Spine', [0, 1.48, -.3]);
for (const [i, side] of ['Left', 'Right'].entries()) {
  const [hip, knee, ankle] = rest.legs[i], [shoulder, elbow, hand] = rest.arms[i];
  add(side + 'Thigh', 'Spine', hip, knee);
  add(side + 'Shin', side + 'Thigh', knee, ankle);
  add(side + 'Foot', side + 'Shin', ankle);
  add(side + 'UpperArm', 'Spine', shoulder, elbow);
  add(side + 'Forearm', side + 'UpperArm', elbow, hand);
}

const chunks = [], views = [], accessors = [];
function data(values, arrayType, type, bounds = false, target) {
  const encoded = Buffer.from(new arrayType(values).buffer);
  const byteOffset = chunks.reduce((total, chunk) => total + chunk.length, 0);
  chunks.push(encoded, Buffer.alloc((4 - encoded.length % 4) % 4));
  const componentType = arrayType === Float32Array ? 5126 : 5123;
  const size = { SCALAR: 1, VEC3: 3, VEC4: 4, MAT4: 16 }[type];
  const accessor = { bufferView: views.length, componentType, type, count: values.length / size };
  if (bounds) {
    accessor.min = Array(size).fill(Infinity);
    accessor.max = Array(size).fill(-Infinity);
    [...new arrayType(values)].forEach((v, i) => {
      const j = i % size;
      accessor.min[j] = Math.min(accessor.min[j], v);
      accessor.max[j] = Math.max(accessor.max[j], v);
    });
  }
  views.push({ buffer: 0, byteOffset, byteLength: encoded.length, ...(target ? { target } : {}) });
  accessors.push(accessor);
  return accessors.length - 1;
}

const positions = [], colors = [], bones = [], weights = [], indices = [], vertices = new Map();
const seams = ['LeftShin', 'RightShin', 'LeftForearm', 'RightForearm'];
function influences(name, point) {
  const index = jointIndex.get(name), joint = joints[index], downstream = joints.find(j => j.parent === name && seams.includes(j.name));
  const next = downstream ?? (seams.includes(name) ? joint : null);
  if (next) {
    const offset = vector(point).sub(next.origin).dot(next.axis), blend = Math.max(0, Math.min(1, (offset + .12) / .24));
    return [[jointIndex.get(next.parent), jointIndex.get(next.name), 0, 0], [1 - blend, blend, 0, 0]];
  }
  return [[index, 0, 0, 0], [1, 0, 0, 0]];
}
WindHiker.draw((polygon, rgb, _light, _bias, _texture, name) => {
  const paint = new Color('rgb(' + rgb.join(',') + ')');
  const slots = polygon.map(point => {
    const key = name + ':' + point.map(v => v.toFixed(5)).join('/') + ':' + rgb.join('/');
    if (vertices.has(key)) return vertices.get(key);
    const index = positions.length / 3;
    const [skin, amount] = influences(name, point);
    vertices.set(key, index);
    positions.push(...point);
    colors.push(paint.r, paint.g, paint.b);
    bones.push(...skin);
    weights.push(...amount);
    return index;
  });
  for (let i = 1; i + 1 < slots.length; i++) indices.push(slots[0], slots[i], slots[i + 1]);
}, point => point, rest, 'walk', false, undefined, { closeup: true });
const geometry = new BufferGeometry();
geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
geometry.setIndex(indices);
geometry.computeVertexNormals();
const primitive = {
  attributes: {
    POSITION: data(positions, Float32Array, 'VEC3', true, 34962),
    NORMAL: data([...geometry.getAttribute('normal').array], Float32Array, 'VEC3', false, 34962),
    COLOR_0: data(colors, Float32Array, 'VEC3', false, 34962),
    JOINTS_0: data(bones, Uint16Array, 'VEC4', false, 34962),
    WEIGHTS_0: data(weights, Float32Array, 'VEC4', false, 34962)
  },
  indices: data(indices, Uint16Array, 'SCALAR', false, 34963),
  material: 0
};

function transforms(pose) {
  const result = new Map(), spine = rotation(pose.lean, pose.twist, -pose.roll);
  const origin = new Vector3(pose.hipShift, 1.14 + pose.bob, 0);
  const upper = point => vector(point).sub(joints[0].origin).applyQuaternion(spine).add(origin);
  const bind = (name, pos, end, q) => {
    const joint = joints[jointIndex.get(name)];
    result.set(name, { pos, q: end ? new Quaternion().setFromUnitVectors(joint.axis, end.clone().sub(pos).normalize()) : q });
  };
  bind('Spine', origin, null, spine);
  bind('Head', upper([0, 2.19, .05]), null, spine.clone().multiply(rotation(-pose.lookUp, pose.faceYaw)));
  bind('Pack', upper([pose.pack * .045, 1.48 + pose.pack * .013, -.3 + pose.pack * .032]), null, spine.clone().multiply(rotation(pose.pack * .05)));
  for (const [i, side] of ['Left', 'Right'].entries()) {
    const [hip, knee, ankle] = pose.legs[i].map(vector), [shoulder, elbow, hand] = pose.arms[i].map(upper);
    bind(side + 'Thigh', hip, knee);
    bind(side + 'Shin', knee, ankle);
    bind(side + 'Foot', ankle, null, rotation(-pose.feet[i]));
    bind(side + 'UpperArm', shoulder, elbow);
    bind(side + 'Forearm', elbow, hand);
  }
  return joints.map(({ name, parent }) => {
    const { pos, q } = result.get(name);
    if (!parent) return { pos, q };
    const base = result.get(parent), inverseRotation = base.q.clone().invert();
    return { pos: pos.clone().sub(base.pos).applyQuaternion(inverseRotation), q: inverseRotation.multiply(q) };
  });
}

const idle = WindHiker.create(), stride = WindHiker.create(), left = WindHiker.create(), right = WindHiker.create();
const strideFrames = 48, strideLength = 2 * .49 / .64;
const strideTick = () => stride.pose({ moving: true, actualSpeed: 2.5, dt: 1 / strideFrames, distance: strideLength / strideFrames });
const turnTick = (rig, direction) => rig.pose({ turnDelta: direction * 2 * Math.PI / (4.8 * 24), dt: 1 / 60 });
for (let i = 0; i < 96; i++) { strideTick(); turnTick(left, -1); turnTick(right, 1); }
const animations = [];
function clip(name, duration, count, sample) {
  const frames = Array.from({ length: count }, (_, i) => transforms(sample(i / count)));
  frames.push(frames[0]);
  const time = data(frames.map((_, i) => i * duration / count), Float32Array, 'SCALAR', true);
  const samplers = [], channels = [];
  for (const [i] of joints.entries()) {
    for (const [type, property, size] of [['translation', 'pos', 'VEC3'], ['rotation', 'q', 'VEC4']]) {
      const output = data(frames.flatMap(frame => frame[i][property].toArray()), Float32Array, size);
      channels.push({ sampler: samplers.length, target: { node: i, path: type } });
      samplers.push({ input: time, output, interpolation: 'LINEAR' });
    }
  }
  animations.push({ name, channels, samplers });
}
clip('Idle', Math.PI * 2 / 2.4, 32, t => idle.pose({ seconds: t * Math.PI * 2 / 2.4, dt: 1 / 32 }));
clip('Walk', 1, strideFrames, strideTick);
clip('TurnLeft', .54, 24, () => turnTick(left, -1));
clip('TurnRight', .54, 24, () => turnTick(right, 1));

const nodes = joints.map(({ name, parent, origin }) => {
  const translation = parent ? origin.clone().sub(joints[jointIndex.get(parent)].origin) : origin;
  const children = joints.flatMap((joint, i) => joint.parent === name ? [i] : []);
  return { name, translation: translation.toArray(), ...(children.length ? { children } : {}) };
});
nodes.push({ name: 'TrailHiker', mesh: 0, skin: 0 });
const inverseBindMatrices = data(inverse, Float32Array, 'MAT4');
const binary = Buffer.concat(chunks);
const json = {
  asset: { version: '2.0', generator: 'Vietnam Roadtrip hiker rig' },
  scenes: [{ nodes: [0, nodes.length - 1] }], scene: 0, nodes,
  meshes: [{ primitives: [primitive] }],
  materials: [{ name: 'TrailOutfit', doubleSided: true, pbrMetallicRoughness: { metallicFactor: 0, roughnessFactor: .88 } }],
  skins: [{ inverseBindMatrices, joints: joints.map((_, i) => i), skeleton: 0 }],
  animations, accessors, bufferViews: views, buffers: [{ byteLength: binary.length }]
};
const raw = Buffer.from(JSON.stringify(json)), padded = Buffer.concat([raw, Buffer.alloc((4 - raw.length % 4) % 4, 32)]);
const start = Buffer.alloc(12), jsonHeader = Buffer.alloc(8), dataHeader = Buffer.alloc(8);
start.write('glTF', 0);
start.writeUInt32LE(2, 4);
start.writeUInt32LE(28 + padded.length + binary.length, 8);
jsonHeader.writeUInt32LE(padded.length, 0);
jsonHeader.write('JSON', 4);
dataHeader.writeUInt32LE(binary.length, 0);
dataHeader.write('BIN\0', 4);
const glb = Buffer.concat([start, jsonHeader, padded, dataHeader, binary]);
// A classic script keeps the asset usable even when index.html is opened from disk.
fs.writeFileSync(path.join(root, 'map', 'assets', 'hiker-rig.js'),
  '// Generated by tools/build-hiker.cjs. Embedded glTF 2.0 binary.\n' +
  'globalThis.TrailHikerGLB="' + glb.toString('base64') + '";\n');
const bundle = require('esbuild').buildSync({
  entryPoints: [path.join(__dirname, 'hiker-webgl.mjs')],
  bundle: true, minify: true, format: 'iife', legalComments: 'eof', write: false
});
fs.writeFileSync(path.join(root, 'map', 'hiker-webgl.js'), bundle.outputFiles[0].text.replace(/[ \t]+$/gm, ''));
