import {
  AmbientLight, AnimationMixer, DirectionalLight, Group, PerspectiveCamera,
  Scene, Vector3, WebGLRenderer
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

function create() {
  const asset = globalThis.TrailHikerGLB;
  if (!asset) return null;
  let renderer;
  try {
    renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch {
    return null;
  }
  renderer.setClearColor(0, 0);
  const scene = new Scene(), camera = new PerspectiveCamera(45, 1, 1.25, 500);
  const mount = new Group(), target = new Vector3();
  scene.add(mount, new AmbientLight(0xffefda, 1.55));
  const daylight = new DirectionalLight(0xffefd3, 2.1);
  daylight.position.set(-3, 7, 4);
  scene.add(daylight);
  mount.matrixAutoUpdate = false;
  let mixer, idle, walk, left, right, turn;
  let walking = 0, turning = 0, width = 0, height = 0;
  const clamp = v => Math.max(0, Math.min(v, 1));
  const follow = (a, b, dt, rate) => a + (b - a) * (1 - Math.exp(-dt * rate));
  const payload = Uint8Array.from(atob(asset), ch => ch.charCodeAt(0));
  new GLTFLoader().parse(payload.buffer, '', result => {
    const model = result.scene;
    mount.add(model);
    result.scene.traverse(object => { if (object.isMesh) object.frustumCulled = false; });
    mixer = new AnimationMixer(model);
    const action = name => mixer.clipAction(result.animations.find(clip => clip.name === name)).play();
    idle = action('Idle');
    walk = action('Walk');
    left = action('TurnLeft');
    right = action('TurnRight');
    turn = right;
  }, () => renderer.dispose());

  return {
    render({ cam, pos, cameraAxes, heading, scale, grade, dt, seconds, moving, distance, turnDelta, reduced,
      bounds, canvasWidth, canvasHeight, horizon, focal }) {
      if (!mixer || renderer.getContext().isContextLost()) return null;
      const { left: x, top: y, width: w, height: h } = bounds;
      if (!w || !h) return null;
      if (w !== width || h !== height) {
        width = w;
        height = h;
        renderer.setSize(w, h, false);
      }
      if (moving) walk.time = (walk.time + distance / (1.53125 * scale)) % 1;
      const yawSpeed = dt ? Math.abs(turnDelta) / dt : 0;
      walking = follow(walking, moving && dt ? clamp(distance / dt / 1.85) : 0, dt, moving ? 14 : 11);
      turning = follow(turning, moving ? 0 : clamp(yawSpeed / 2.2), dt, 13);
      const walkWeight = reduced ? walking * .72 : walking;
      const turnWeight = (1 - walkWeight) * turning * (reduced ? .52 : 1);
      idle.time = seconds % idle.getClip().duration;
      idle.setEffectiveWeight(1 - walkWeight - turnWeight);
      walk.setEffectiveWeight(walkWeight);
      if (yawSpeed > .12) turn = turnDelta < 0 ? left : right;
      const other = turn === left ? right : left;
      turn.time = (turn.time + Math.abs(turnDelta) * .42) % turn.getClip().duration;
      turn.setEffectiveWeight(turnWeight);
      other.setEffectiveWeight(0);
      mixer.update(0);

      const { fx, fz, cp, sp } = cameraAxes;
      camera.position.set(cam.x, cam.h, -cam.z);
      camera.up.set(fx * sp, cp, -fz * sp);
      target.set(cam.x + fx * cp, cam.h - sp, -cam.z - fz * cp);
      camera.lookAt(target);
      camera.fov = Math.atan(canvasHeight / (2 * focal)) * 360 / Math.PI;
      camera.setViewOffset(canvasWidth, canvasHeight, x, y + canvasHeight / 2 - horizon, w, h);

      const c = Math.cos(heading), s = Math.sin(heading);
      mount.matrix.set(
        c * scale, 0, s * scale, pos.x,
        0, scale, grade * scale, pos.h,
        s * scale, 0, -c * scale, -pos.z,
        0, 0, 0, 1
      );
      mount.matrixWorldNeedsUpdate = true;
      renderer.render(scene, camera);
      return renderer.domElement;
    },
    reset() {
      walking = turning = 0;
      if (walk) walk.time = left.time = right.time = 0;
    }
  };
}

globalThis.TrailHikerMotion = { create };
