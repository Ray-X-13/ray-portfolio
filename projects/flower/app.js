const canvas = document.querySelector("#flower-canvas");
const ctx = canvas.getContext("2d");
const cameraButton = document.querySelector("#camera-button");
const cameraButtonLabel = document.querySelector("#camera-button-label");
const cameraShell = document.querySelector(".camera-shell");
const cameraVideo = document.querySelector("#camera-video");
const handOverlay = document.querySelector("#hand-overlay");
const handCtx = handOverlay.getContext("2d");
const handStatus = document.querySelector("#hand-status");
const statusDot = document.querySelector("#status-dot");
const demoButton = document.querySelector("#demo-button");
const bloomPhase = document.querySelector("#bloom-phase");
const bloomPercent = document.querySelector("#bloom-percent");
const progressFill = document.querySelector("#progress-fill");
const dragHint = document.querySelector("#drag-hint");
const toast = document.querySelector("#toast");

const VISION_CDN =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/vision_bundle.mjs";
const WASM_CDN =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm";
const HAND_MODEL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

const state = {
  current: 0.14,
  target: 0.14,
  velocity: 0,
  dragging: false,
  dragStartX: 0,
  dragStartProgress: 0.14,
  hasDragged: false,
  demo: false,
  demoStart: 0,
  cameraStream: null,
  handLandmarker: null,
  cameraBusy: false,
  cameraLive: false,
  hasHand: false,
  gestureProgress: 0.14,
  lastGestureAt: 0,
  lastVideoTime: -1,
  lastFrameTime: performance.now(),
  reduceMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
};

let resizeFrame = 0;
let toastTimer = 0;
let detectionFrame = 0;
let lastReadoutPercent = -1;

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function smoothstep(min, max, value) {
  const x = clamp((value - min) / (max - min));
  return x * x * (3 - 2 * x);
}

function mapRange(value, start, end, outStart = 0, outEnd = 1) {
  return outStart + ((value - start) / (end - start)) * (outEnd - outStart);
}

function showToast(message, duration = 3200) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, duration);
}

function setStatus(message, type = "idle") {
  handStatus.textContent = message;
  statusDot.classList.toggle("is-live", type === "live");
  statusDot.classList.toggle("is-error", type === "error");
  cameraShell.classList.toggle("is-live", state.cameraLive);
  cameraButton.classList.toggle("is-live", state.cameraLive);
}

function updateReadout() {
  const percent = Math.round(state.current * 100);
  if (percent === lastReadoutPercent) return;
  lastReadoutPercent = percent;
  bloomPercent.textContent = `${percent}%`;
  progressFill.style.width = `${Math.max(2, percent)}%`;

  if (percent < 26) {
    bloomPhase.textContent = "花苞";
  } else if (percent < 58) {
    bloomPhase.textContent = "初醒";
  } else if (percent < 84) {
    bloomPhase.textContent = "舒展";
  } else {
    bloomPhase.textContent = "盛开";
  }
}

const PETAL_SPRITE_SIZE = 512;
const PETAL_SPRITE_HALF_WIDTH = PETAL_SPRITE_SIZE * 0.36;
const PETAL_SPRITE_TIP_Y = PETAL_SPRITE_SIZE * 0.08;
const PETAL_SPRITE_LENGTH = PETAL_SPRITE_SIZE - 18 - PETAL_SPRITE_TIP_Y;
const petalSprites = [];

function buildPetalSprite(layer) {
  const canvasElement = document.createElement("canvas");
  canvasElement.width = PETAL_SPRITE_SIZE;
  canvasElement.height = PETAL_SPRITE_SIZE;
  const context = canvasElement.getContext("2d");
  const centerX = PETAL_SPRITE_SIZE / 2;
  const baseY = PETAL_SPRITE_SIZE - 18;
  const tipY = PETAL_SPRITE_TIP_Y;
  const length = baseY - tipY;
  const halfWidth = PETAL_SPRITE_HALF_WIDTH;
  const tipX = ((layer * 11) % 7 - 3) * 1.5;

  context.beginPath();
  context.moveTo(centerX, baseY);
  context.bezierCurveTo(
    centerX - halfWidth * 0.98,
    baseY - length * 0.09,
    centerX - halfWidth * 0.92,
    baseY - length * 0.74,
    centerX + tipX,
    tipY,
  );
  context.bezierCurveTo(
    centerX + halfWidth * 0.92,
    baseY - length * 0.74,
    centerX + halfWidth * 0.98,
    baseY - length * 0.09,
    centerX,
    baseY,
  );
  context.closePath();

  const gradient = context.createLinearGradient(centerX, baseY, centerX, tipY);
  if (layer === 0) {
    gradient.addColorStop(0, "rgba(176, 170, 147, 0.96)");
    gradient.addColorStop(0.3, "rgba(222, 216, 194, 0.98)");
    gradient.addColorStop(0.72, "rgba(248, 242, 224, 1)");
    gradient.addColorStop(1, "rgba(226, 219, 199, 0.98)");
  } else if (layer === 1) {
    gradient.addColorStop(0, "rgba(196, 189, 165, 0.96)");
    gradient.addColorStop(0.3, "rgba(237, 231, 210, 0.99)");
    gradient.addColorStop(0.72, "rgba(254, 249, 234, 1)");
    gradient.addColorStop(1, "rgba(239, 232, 212, 0.99)");
  } else {
    gradient.addColorStop(0, "rgba(214, 207, 185, 0.96)");
    gradient.addColorStop(0.28, "rgba(249, 245, 229, 1)");
    gradient.addColorStop(0.7, "rgba(255, 253, 243, 1)");
    gradient.addColorStop(1, "rgba(250, 245, 228, 1)");
  }

  context.fillStyle = gradient;
  context.shadowColor = "rgba(0, 0, 0, 0.28)";
  context.shadowBlur = 12;
  context.shadowOffsetY = 5;
  context.fill();
  context.shadowColor = "transparent";

  // Rim light on the outer edge, subtle base shading for depth.
  context.strokeStyle = `rgba(255, 251, 238, ${0.42 + layer * 0.08})`;
  context.lineWidth = 1.1;
  context.stroke();

  const baseShade = context.createLinearGradient(centerX, baseY - length * 0.35, centerX, baseY);
  baseShade.addColorStop(0, "rgba(105, 99, 82, 0)");
  baseShade.addColorStop(1, "rgba(105, 99, 82, 0.22)");
  context.fillStyle = baseShade;
  context.beginPath();
  context.moveTo(centerX, baseY - length * 0.35);
  context.bezierCurveTo(
    centerX - halfWidth * 0.72,
    baseY - length * 0.24,
    centerX - halfWidth * 0.86,
    baseY - length * 0.04,
    centerX,
    baseY,
  );
  context.bezierCurveTo(
    centerX + halfWidth * 0.86,
    baseY - length * 0.04,
    centerX + halfWidth * 0.72,
    baseY - length * 0.24,
    centerX,
    baseY - length * 0.35,
  );
  context.closePath();
  context.fill();

  // Veins.
  context.lineCap = "round";
  context.strokeStyle = "rgba(128, 122, 104, 0.15)";
  context.lineWidth = 1.4;
  for (let vein = -1; vein <= 1; vein += 1) {
    context.beginPath();
    context.moveTo(centerX, baseY - 5);
    context.quadraticCurveTo(
      centerX + vein * halfWidth * 0.48,
      baseY - length * 0.45,
      centerX + vein * halfWidth * 0.1,
      baseY - length * 0.76,
    );
    context.stroke();
  }

  context.strokeStyle = "rgba(118, 112, 94, 0.2)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(centerX, baseY - 8);
  context.quadraticCurveTo(centerX + 2, baseY - length * 0.4, centerX + tipX * 0.55, baseY - length * 0.82);
  context.stroke();

  // Soft inner highlight along the left side.
  context.strokeStyle = "rgba(255, 255, 255, 0.22)";
  context.lineWidth = 7;
  context.beginPath();
  context.moveTo(centerX - halfWidth * 0.5, baseY - length * 0.2);
  context.quadraticCurveTo(
    centerX - halfWidth * 0.58,
    baseY - length * 0.55,
    centerX - halfWidth * 0.18,
    baseY - length * 0.82,
  );
  context.stroke();

  return canvasElement;
}

for (let layer = 0; layer < 3; layer += 1) {
  petalSprites.push(buildPetalSprite(layer));
}

const particleSprite = document.createElement("canvas");
particleSprite.width = 32;
particleSprite.height = 32;
{
  const context = particleSprite.getContext("2d");
  const glow = context.createRadialGradient(16, 16, 0, 16, 16, 15);
  glow.addColorStop(0, "rgba(255, 244, 210, 0.95)");
  glow.addColorStop(0.35, "rgba(236, 222, 184, 0.38)");
  glow.addColorStop(1, "rgba(236, 222, 184, 0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, 32, 32);
}

function setTarget(next, { dismissHint = true } = {}) {
  state.target = clamp(next);
  if (dismissHint) dragHint.classList.add("is-dismissed");
}

function resizeCanvas(canvasElement, context) {
  const bounds = canvasElement.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvasElement.width = Math.max(1, Math.round(bounds.width * ratio));
  canvasElement.height = Math.max(1, Math.round(bounds.height * ratio));
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { width: bounds.width, height: bounds.height };
}

let flowerSize = { width: window.innerWidth, height: window.innerHeight };

function resizeAll() {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => {
    flowerSize = resizeCanvas(canvas, ctx);
    resizeCanvas(handOverlay, handCtx);
  });
}

function getFlowerGeometry(width, height) {
  const mobile = width <= 820;
  const landscape = width > height && height < 620;
  const centerX = mobile ? width * 0.5 : landscape ? width * 0.64 : width * 0.64;
  const centerY = mobile ? height * 0.54 : landscape ? height * 0.52 : height * 0.47;
  const scale = mobile
    ? Math.min(width * 0.29, height * 0.22)
    : Math.min(width * 0.25, height * 0.31, 290);
  return { centerX, centerY, scale };
}

function drawPetal(context, length, width, progress, index, layer) {
  // Fold the petals into a narrow, upright bud before letting them fan out.
  // Width closes faster than length so the silhouette stays tapered instead
  // of becoming a wide, bowl-like stack at the start of the interaction.
  const widthOpen = smoothstep(0.02, 0.48, progress);
  const lengthOpen = smoothstep(0.04, 0.82, progress);
  const visibleWidth = Math.max(0.5, width * lerp(0.58, 1, widthOpen));
  const visibleLength = length * lerp(0.68, 1, lengthOpen);
  const asymmetry = ((index * 17 + layer * 11) % 9) / 9 - 0.5;
  const tipX = visibleWidth * asymmetry * 0.34;

  const sprite = petalSprites[layer];
  const drawWidth = visibleWidth * 2.08 * (PETAL_SPRITE_SIZE / PETAL_SPRITE_HALF_WIDTH);
  const drawHeight = visibleLength * (PETAL_SPRITE_SIZE / PETAL_SPRITE_LENGTH);
  const offsetY = (PETAL_SPRITE_TIP_Y / PETAL_SPRITE_SIZE) * drawHeight;
  context.drawImage(
    sprite,
    -drawWidth / 2 + tipX * 0.5,
    -offsetY,
    drawWidth,
    drawHeight,
  );
}

function drawLeaf(context, scale, side, sway) {
  context.save();
  context.translate(0, 133 * scale);
  context.rotate(side * (0.76 + sway));
  context.scale(side, 1);
  context.beginPath();
  context.moveTo(0, 0);
  context.bezierCurveTo(18 * scale, -30 * scale, 82 * scale, -30 * scale, 106 * scale, 7 * scale);
  context.bezierCurveTo(55 * scale, 14 * scale, 21 * scale, 13 * scale, 0, 0);
  const leafGradient = context.createLinearGradient(0, 0, 90 * scale, 0);
  leafGradient.addColorStop(0, "rgba(44, 57, 42, 0.62)");
  leafGradient.addColorStop(1, "rgba(90, 105, 78, 0.35)");
  context.fillStyle = leafGradient;
  context.fill();
  context.beginPath();
  context.moveTo(7 * scale, 0);
  context.quadraticCurveTo(45 * scale, -7 * scale, 94 * scale, 4 * scale);
  context.strokeStyle = "rgba(171, 184, 147, 0.16)";
  context.lineWidth = 0.75;
  context.stroke();
  context.restore();
}

const particles = Array.from({ length: 34 }, (_, index) => {
  const angle = index * 2.39996;
  const radius = 0.44 + ((index * 37) % 100) / 100;
  return {
    angle,
    radius,
    size: 0.5 + ((index * 13) % 11) / 11,
    drift: 0.4 + ((index * 19) % 13) / 13,
    alpha: 0.16 + ((index * 29) % 17) / 50,
  };
});

function drawFlower(context, width, height, now) {
  const { centerX, centerY, scale } = getFlowerGeometry(width, height);
  const progress = state.current;
  const eased = smoothstep(0.01, 1, progress);
  const grow = lerp(0.76, 1, eased);
  const time = now * 0.00035;
  const sway = Math.sin(time * 1.2) * 0.015;

  context.save();
  context.globalAlpha = 1;
  context.globalCompositeOperation = "source-over";
  context.shadowColor = "transparent";
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#10110f";
  context.fillRect(0, 0, width, height);

  const backdrop = context.createRadialGradient(
    centerX,
    centerY,
    0,
    centerX,
    centerY,
    Math.max(width, height) * 0.72,
  );
  backdrop.addColorStop(0, "rgba(53, 58, 47, 0.22)");
  backdrop.addColorStop(0.5, "rgba(25, 27, 22, 0.14)");
  backdrop.addColorStop(1, "rgba(10, 11, 9, 0.5)");
  context.fillStyle = backdrop;
  context.fillRect(0, 0, width, height);

  const haloRadius = scale * lerp(1.2, 2.45, eased);
  const halo = context.createRadialGradient(
    centerX,
    centerY,
    0,
    centerX,
    centerY,
    haloRadius,
  );
  halo.addColorStop(0, `rgba(218, 200, 154, ${0.03 + eased * 0.055})`);
  halo.addColorStop(0.42, `rgba(169, 179, 137, ${0.016 + eased * 0.025})`);
  halo.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = halo;
  context.fillRect(
    centerX - haloRadius,
    centerY - haloRadius,
    haloRadius * 2,
    haloRadius * 2,
  );

  if (eased > 0.25) {
    context.save();
    particles.forEach((particle, index) => {
      const burst = (index * 0.037 + time * particle.drift) % 1;
      const radius = scale * (0.35 + burst * particle.radius * 1.7);
      const angle = particle.angle + burst * 0.35;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius * 0.74;
      const alpha =
        particle.alpha * eased * Math.sin(burst * Math.PI) * (0.7 + Math.sin(time * 9 + index) * 0.3);
      const spriteSize = particle.size * (2.2 + burst * 2.6) * scale * 0.09;
      context.globalAlpha = clamp(alpha);
      context.drawImage(
        particleSprite,
        x - spriteSize / 2,
        y - spriteSize / 2,
        spriteSize,
        spriteSize,
      );
    });
    context.restore();
  }

  context.save();
  context.translate(centerX, centerY);
  context.rotate(sway);

  // Grounding shadow behind the bloom, so petals sit in space.
  const shadowRadiusX = scale * lerp(0.5, 0.96, eased);
  const shadowRadiusY = shadowRadiusX * 0.34;
  const contactShadow = context.createRadialGradient(
    0,
    shadowRadiusY * 0.5,
    0,
    0,
    shadowRadiusY * 0.5,
    shadowRadiusX,
  );
  contactShadow.addColorStop(0, "rgba(0, 0, 0, 0.38)");
  contactShadow.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.save();
  context.translate(0, shadowRadiusY * 0.5);
  context.scale(1, 0.34);
  context.translate(0, -shadowRadiusY * 0.5);
  context.fillStyle = contactShadow;
  context.beginPath();
  context.arc(0, shadowRadiusY * 0.5, shadowRadiusX, 0, Math.PI * 2);
  context.fill();
  context.restore();

  context.save();
  const stemGradient = context.createLinearGradient(0, 10, 0, 330 * scale);
  stemGradient.addColorStop(0, "rgba(114, 131, 91, 0.7)");
  stemGradient.addColorStop(0.55, "rgba(66, 84, 57, 0.72)");
  stemGradient.addColorStop(1, "rgba(34, 45, 32, 0.25)");
  context.strokeStyle = stemGradient;
  context.lineWidth = Math.max(2.2, 5.2 * scale);
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(1, 8);
  context.bezierCurveTo(-8 * scale, 92 * scale, 13 * scale, 214 * scale, -4 * scale, 360 * scale);
  context.stroke();
  drawLeaf(context, scale, -1, Math.sin(time * 1.7) * 0.015);
  drawLeaf(context, scale, 1, Math.sin(time * 1.3 + 1.2) * 0.015);
  context.restore();

  const layers = [
    { count: 11, length: 1.16, width: 0.47, alpha: 0.72, offset: 0.05 },
    { count: 9, length: 0.98, width: 0.55, alpha: 0.9, offset: 0.21 },
    { count: 7, length: 0.74, width: 0.59, alpha: 1, offset: 0.42 },
  ];

  layers.forEach((layer, layerIndex) => {
    for (let index = 0; index < layer.count; index += 1) {
      const fullAngle =
        -Math.PI / 2 +
        (Math.PI * 2 * index) / layer.count +
        (layerIndex % 2 ? 0.16 : -0.05);
      const budFan = ((index % 5) - 2) * 0.052 + layerIndex * 0.018;
      const closedAngle = -Math.PI / 2 + budFan;
      const angle = lerp(closedAngle, fullAngle, smoothstep(0.02, 0.92, eased));
      const spread = smoothstep(layerIndex * 0.04, 1, eased);
      const sizeVariation = 0.88 + ((index * 23 + layerIndex * 7) % 17) / 65;
      const length = scale * layer.length * sizeVariation * grow;
      const width = scale * layer.width * (0.92 + (index % 3) * 0.055);

      context.save();
      context.rotate(angle);
      context.globalAlpha = layer.alpha * lerp(0.86, 1, spread);
      drawPetal(context, length, width, progress, index, layerIndex);
      context.restore();
    }
  });

  if (eased > 0.08) {
    const ringAlpha = smoothstep(0.08, 0.5, eased);
    const ringRadius = scale * lerp(0.52, 0.98, eased);
    context.save();
    context.rotate(time * 0.45);
    context.strokeStyle = `rgba(235, 224, 196, ${0.08 * ringAlpha})`;
    context.lineWidth = 1;
    context.beginPath();
    context.arc(0, 0, ringRadius, 0, Math.PI * 2);
    context.stroke();

    context.strokeStyle = `rgba(235, 224, 196, ${0.16 * ringAlpha})`;
    context.setLineDash([1.2, 9]);
    context.beginPath();
    context.arc(0, 0, ringRadius * 1.07, 0, Math.PI * 2);
    context.stroke();
    context.setLineDash([]);

    for (let tick = 0; tick < 48; tick += 1) {
      const tickAngle = (tick / 48) * Math.PI * 2;
      const longTick = tick % 12 === 0;
      const inner = ringRadius * 1.12;
      const outer = inner + (longTick ? 8 : 3.5) * (scale / 280);
      context.beginPath();
      context.moveTo(Math.cos(tickAngle) * inner, Math.sin(tickAngle) * inner);
      context.lineTo(Math.cos(tickAngle) * outer, Math.sin(tickAngle) * outer);
      context.strokeStyle = `rgba(235, 224, 196, ${(longTick ? 0.2 : 0.07) * ringAlpha})`;
      context.lineWidth = longTick ? 1 : 0.7;
      context.stroke();
    }
    context.restore();
  }

  const centerRadius = scale * lerp(0.035, 0.115, smoothstep(0.18, 0.98, eased));
  const centerAwake = smoothstep(0.08, 0.55, eased);
  const centerGlow = context.createRadialGradient(0, 0, 0, 0, 0, centerRadius * 1.8);
  centerGlow.addColorStop(0, `rgba(236, 207, 121, ${0.96 * centerAwake})`);
  centerGlow.addColorStop(0.3, `rgba(211, 184, 105, ${0.8 * centerAwake})`);
  centerGlow.addColorStop(1, "rgba(121, 112, 71, 0)");
  context.fillStyle = centerGlow;
  context.beginPath();
  context.arc(0, 0, centerRadius * 1.8, 0, Math.PI * 2);
  context.fill();

  if (eased > 0.34) {
    const stamenAlpha = smoothstep(0.34, 0.72, eased);
    for (let index = 0; index < 34; index += 1) {
      const angle = index * 2.39996;
      const radius = Math.sqrt(index / 34) * centerRadius * 0.92;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius * 0.72;
      context.beginPath();
      context.arc(x, y, 0.9 + (index % 3) * 0.3, 0, Math.PI * 2);
      context.fillStyle = `rgba(253, 229, 149, ${stamenAlpha * 0.9})`;
      context.fill();
      context.beginPath();
      context.moveTo(x * 0.7, y * 0.7);
      context.lineTo(x, y);
      context.strokeStyle = `rgba(181, 154, 77, ${stamenAlpha * 0.3})`;
      context.lineWidth = 0.45;
      context.stroke();
    }
  }

  context.restore();
  context.restore();
}

function animationFrame(now) {
  const delta = Math.min(1 / 30, Math.max(1 / 120, (now - state.lastFrameTime) / 1000));
  state.lastFrameTime = now;

  if (state.demo) {
    const elapsed = (now - state.demoStart) / 1000;
    const easedTime = elapsed * (state.reduceMotion ? 0.8 : 0.72);
    state.target = 0.5 - 0.5 * Math.cos(easedTime);
  }

  // Adaptive smoothing: quick to chase a moving hand, calm when nearly settled.
  // This keeps the flower feeling attached to the fingers instead of trailing them.
  const gap = Math.abs(state.target - state.current);
  const baseRate = state.demo ? 6 : 12;
  const chaseRate = state.dragging ? 30 : 12 + 34 * smoothstep(0.005, 0.55, gap);
  const rate = state.demo ? baseRate : Math.max(baseRate, chaseRate);
  state.current += (state.target - state.current) * (1 - Math.exp(-rate * delta));
  state.current = clamp(state.current);

  drawFlower(ctx, flowerSize.width, flowerSize.height, now);
  updateReadout();
  requestAnimationFrame(animationFrame);
}

function pointerProgress(event) {
  return clamp((event.clientX / window.innerWidth - 0.38) / 0.55);
}

canvas.addEventListener("pointerdown", (event) => {
  if (state.cameraLive) return;
  stopDemo();
  state.dragging = true;
  state.hasDragged = false;
  state.dragStartX = event.clientX;
  state.dragStartProgress = state.current;
  canvas.setPointerCapture(event.pointerId);
  dragHint.classList.add("is-dismissed");
});

canvas.addEventListener("pointermove", (event) => {
  if (!state.dragging) return;
  if (Math.abs(event.clientX - state.dragStartX) > 3) state.hasDragged = true;
  const delta = (event.clientX - state.dragStartX) / (window.innerWidth * 0.55);
  setTarget(state.dragStartProgress + delta);
});

function finishPointer() {
  state.dragging = false;
}

canvas.addEventListener("pointerup", finishPointer);
canvas.addEventListener("pointercancel", finishPointer);

canvas.addEventListener(
  "wheel",
  (event) => {
    if (state.cameraLive) return;
    event.preventDefault();
    stopDemo();
    setTarget(state.current + (event.deltaY > 0 ? -0.045 : 0.045));
  },
  { passive: false },
);

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === "ArrowUp") {
    stopDemo();
    setTarget(state.current + 0.055);
  }
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
    stopDemo();
    setTarget(state.current - 0.055);
  }
});

function stopDemo() {
  state.demo = false;
  demoButton.classList.remove("is-active");
  demoButton.textContent = "自动演示";
}

function toggleDemo() {
  if (state.demo) {
    stopDemo();
    return;
  }

  state.demo = true;
  state.demoStart = performance.now();
  demoButton.classList.add("is-active");
  demoButton.textContent = "停止演示";
  dragHint.classList.add("is-dismissed");
}

demoButton.addEventListener("click", toggleDemo);

function resizeOverlayToVideo() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = handOverlay.clientWidth;
  const height = handOverlay.clientHeight;
  if (handOverlay.width !== Math.round(width * ratio) || handOverlay.height !== Math.round(height * ratio)) {
    handOverlay.width = Math.round(width * ratio);
    handOverlay.height = Math.round(height * ratio);
    handCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  return { width, height };
}

function drawHandLandmarks(landmarks) {
  const { width, height } = resizeOverlayToVideo();
  handCtx.clearRect(0, 0, width, height);
  if (!landmarks?.length) return;

  const wrist = landmarks[0];
  const middleBase = landmarks[9];
  const thumb = landmarks[4];
  const index = landmarks[8];
  const fit = Math.max(0.7, Math.min(width / cameraVideo.videoWidth, height / cameraVideo.videoHeight));
  const offsetX = (width - cameraVideo.videoWidth * fit) / 2;
  const offsetY = (height - cameraVideo.videoHeight * fit) / 2;
  const project = (point) => ({
    x: offsetX + (1 - point.x) * cameraVideo.videoWidth * fit,
    y: offsetY + point.y * cameraVideo.videoHeight * fit,
  });

  const thumbPoint = project(thumb);
  const indexPoint = project(index);

  handCtx.save();
  handCtx.lineCap = "round";
  handCtx.lineJoin = "round";
  handCtx.strokeStyle = "rgba(235, 226, 197, 0.62)";
  handCtx.fillStyle = "rgba(242, 235, 211, 0.9)";
  handCtx.lineWidth = 1;
  handCtx.setLineDash([3, 3]);
  handCtx.beginPath();
  handCtx.moveTo(thumbPoint.x, thumbPoint.y);
  handCtx.lineTo(indexPoint.x, indexPoint.y);
  handCtx.stroke();
  handCtx.setLineDash([]);

  [thumbPoint, indexPoint].forEach((point, indexPosition) => {
    handCtx.beginPath();
    handCtx.arc(point.x, point.y, indexPosition === 0 ? 4.5 : 5, 0, Math.PI * 2);
    handCtx.fillStyle = "rgba(232, 214, 166, 0.2)";
    handCtx.fill();
    handCtx.beginPath();
    handCtx.arc(point.x, point.y, 1.8, 0, Math.PI * 2);
    handCtx.fillStyle = "rgba(255, 246, 216, 0.95)";
    handCtx.fill();
  });

  const palm = project(wrist);
  const middle = project(middleBase);
  handCtx.beginPath();
  handCtx.moveTo(palm.x, palm.y);
  handCtx.lineTo(middle.x, middle.y);
  handCtx.strokeStyle = "rgba(235, 226, 197, 0.18)";
  handCtx.stroke();
  handCtx.restore();
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));
}

function processHandResult(result) {
  const landmarks = result.landmarks?.[0];
  state.hasHand = Boolean(landmarks);

  if (!landmarks) {
    drawHandLandmarks(null);
    if (performance.now() - state.lastGestureAt > 650) {
      setStatus("未识别到手，请让掌心进入画面", "live");
    }
    return;
  }

  drawHandLandmarks(landmarks);
  const pinch = distance(landmarks[4], landmarks[8]);
  const palm = Math.max(0.025, distance(landmarks[0], landmarks[9]));
  const normalized = pinch / palm;
  const rawProgress = clamp(mapRange(normalized, 0.16, 1.08));
  const change = Math.abs(rawProgress - state.gestureProgress);

  // Fast response while the fingers move; heavier filtering once the hand
  // settles so landmark jitter does not keep the flower opening and closing.
  const smoothing = change > 0.025 ? 0.38 : 0.12;
  state.gestureProgress = lerp(state.gestureProgress, rawProgress, smoothing);
  state.lastGestureAt = performance.now();
  if (Math.abs(state.gestureProgress - state.target) > 0.004) {
    setTarget(state.gestureProgress);
  }
  stopDemo();
  setStatus(
    state.gestureProgress < 0.24 ? "已识别 · 两指靠近" : "已识别 · 正在跟随",
    "live",
  );
}

function detectionLoop() {
  if (!state.cameraLive || !state.handLandmarker) return;

  if (cameraVideo.readyState >= 2 && cameraVideo.currentTime !== state.lastVideoTime) {
    state.lastVideoTime = cameraVideo.currentTime;
    try {
      const result = state.handLandmarker.detectForVideo(cameraVideo, performance.now());
      processHandResult(result);
    } catch (error) {
      console.warn("Hand detection failed for this frame.", error);
    }
  }

  detectionFrame = requestAnimationFrame(detectionLoop);
}

async function createLandmarker() {
  const vision = await import(VISION_CDN);
  const fileset = await vision.FilesetResolver.forVisionTasks(WASM_CDN);
  const options = {
    runningMode: "VIDEO",
    numHands: 1,
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  };

  try {
    return await vision.HandLandmarker.createFromOptions(fileset, {
      ...options,
      baseOptions: { modelAssetPath: HAND_MODEL, delegate: "GPU" },
    });
  } catch (gpuError) {
    console.warn("GPU hand tracking unavailable, falling back to CPU.", gpuError);
    return vision.HandLandmarker.createFromOptions(fileset, {
      ...options,
      baseOptions: { modelAssetPath: HAND_MODEL, delegate: "CPU" },
    });
  }
}

async function startCamera() {
  if (state.cameraBusy) return;
  state.cameraBusy = true;
  cameraButton.classList.add("is-loading");
  cameraButtonLabel.textContent = "正在准备";
  setStatus("正在载入手势模型…");

  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("当前浏览器不支持摄像头访问，请使用最新版 Chrome、Edge 或 Safari。");
    }

    const [landmarker, stream] = await Promise.all([
      state.handLandmarker ? Promise.resolve(state.handLandmarker) : createLandmarker(),
      navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      }),
    ]);

    state.handLandmarker = landmarker;
    state.cameraStream = stream;
    cameraVideo.srcObject = stream;
    await cameraVideo.play();
    stopDemo();
    state.gestureProgress = state.current;
    state.cameraLive = true;
    cameraShell.classList.add("is-live");
    cameraButton.classList.add("is-live");
    cameraButtonLabel.textContent = "关闭手势";
    setStatus("已开启 · 伸出拇指与食指", "live");
    dragHint.classList.add("is-dismissed");
    detectionLoop();
  } catch (error) {
    console.error(error);
    setStatus("摄像头启动失败", "error");
    cameraButtonLabel.textContent = "重试开启";
    const message =
      error?.name === "NotAllowedError"
        ? "需要通过浏览器允许摄像头权限，才能使用手势。"
        : error?.message?.includes("fetch") || error?.message?.includes("network")
          ? "手势模型加载失败，请检查网络后重试。"
          : error?.message || "摄像头启动失败，你仍可拖动画面体验。";
    showToast(message, 4400);
  } finally {
    state.cameraBusy = false;
    cameraButton.classList.remove("is-loading");
  }
}

function stopCamera() {
  cancelAnimationFrame(detectionFrame);
  state.cameraStream?.getTracks().forEach((track) => track.stop());
  state.cameraStream = null;
  cameraVideo.srcObject = null;
  state.cameraLive = false;
  state.hasHand = false;
  handCtx.clearRect(0, 0, handOverlay.width, handOverlay.height);
  cameraShell.classList.remove("is-live");
  cameraButton.classList.remove("is-live");
  cameraButtonLabel.textContent = "开启手势";
  setStatus("摄像头未开启");
}

cameraButton.addEventListener("click", () => {
  if (state.cameraLive) {
    stopCamera();
  } else {
    startCamera();
  }
});

window.addEventListener("resize", resizeAll);
window.addEventListener("orientationchange", resizeAll);
window.addEventListener("beforeunload", stopCamera);

resizeAll();
requestAnimationFrame((now) => {
  state.lastFrameTime = now;
  state.demoStart = now + 1100;
  requestAnimationFrame(animationFrame);
});

window.setTimeout(() => {
  showToast("按住画面左右拖动，先感受花开的节奏。", 3600);
}, 900);

window.setTimeout(() => {
  if (!state.cameraLive && !state.dragging) toggleDemo();
}, 1200);

// Minimal debug surface for automated verification.
window.__bloomDebug = {
  getState: () => ({
    current: state.current,
    target: state.target,
    demo: state.demo,
    cameraLive: state.cameraLive,
  }),
  setTarget,
  toggleDemo,
};
