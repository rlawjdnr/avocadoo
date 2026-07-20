import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { animate } from 'framer-motion';
import { Application, Assets, Graphics, Mesh, MeshGeometry } from 'pixi.js';
import {
  applyPeelDeformation,
  clamp,
  createStickerGrid,
  getCornerPoint,
  lerp,
} from './stickerMeshDeformation';
import { stickerMotionConfig } from './stickerMotionConfig';

const sharedTextureRefs = new Map();
const canvasPadding = 32;

function acquireTexture(src) {
  const cached = sharedTextureRefs.get(src);
  if (cached) {
    cached.refs += 1;
    return cached.promise;
  }

  const entry = {
    refs: 1,
    promise: Assets.load(src).catch((error) => {
      sharedTextureRefs.delete(src);
      throw error;
    }),
  };
  sharedTextureRefs.set(src, entry);
  return entry.promise;
}

function releaseTexture(src) {
  const cached = sharedTextureRefs.get(src);
  if (!cached) return;
  cached.refs -= 1;
  if (cached.refs <= 0) sharedTextureRefs.delete(src);
}

function getReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function easeOutCubic(value) {
  return 1 - (1 - value) ** 3;
}

function destroyPixiApp(app) {
  if (!app) return;
  const canvas = app.renderer?.canvas;
  canvas?.remove?.();
  app.ticker?.stop?.();
  const teardown = () => {
    app.stage?.destroy?.(false);
    app.renderer?.destroy?.(false);
    app.stage = null;
    app.renderer = null;
  };

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(teardown);
  } else {
    teardown();
  }
}

export default function PeelableSticker({
  id,
  src,
  width,
  height = width,
  initialPosition,
  scale = 1,
  rotation = 0,
  disabled = false,
  selected = false,
  transformActive = false,
  debugMesh = false,
  className = '',
  settleFrom = null,
  previewPeel = null,
  children,
  getDropResult,
  onReady,
  onDragStart,
  onDragMove,
  onDrop,
}) {
  const rootRef = useRef(null);
  const pixiHostRef = useRef(null);
  const debugLabelRef = useRef(null);
  const appRef = useRef(null);
  const meshRef = useRef(null);
  const shadowMeshRef = useRef(null);
  const geometryRef = useRef(null);
  const shadowGeometryRef = useRef(null);
  const debugGraphicsRef = useRef(null);
  const meshStateRef = useRef(null);
  const dragRef = useRef(null);
  const attachRef = useRef(null);
  const rafRef = useRef(0);
  const settleAnimationRef = useRef(null);
  const onReadyRef = useRef(onReady);
  const reducedMotionRef = useRef(getReducedMotion());
  const flatPositionRef = useRef({
    x: initialPosition.x - canvasPadding,
    y: initialPosition.y - canvasPadding,
  });
  const [pixiReady, setPixiReady] = useState(false);
  const [pixiFailed, setPixiFailed] = useState(false);
  const [pixiVisible, setPixiVisible] = useState(false);
  const [pixiActive, setPixiActive] = useState(Boolean(previewPeel || settleFrom));
  const settleStartedRef = useRef('');
  const stageWidth = width * scale + canvasPadding * 2;
  const stageHeight = height * scale + canvasPadding * 2;
  const meshWidth = width * scale;
  const meshHeight = height * scale;

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    document.addEventListener('avocadoo:sticker-multitouch', cancelActivePointerDrag);
    return () => document.removeEventListener('avocadoo:sticker-multitouch', cancelActivePointerDrag);
  }, []);

  useEffect(() => {
    if (previewPeel || settleFrom) setPixiActive(true);
  }, [previewPeel, settleFrom]);

  useEffect(() => {
    if (transformActive) {
      showPixiLayer();
      applyFlatMesh();
      return;
    }
    hidePixiLayer();
  }, [transformActive]);

  useEffect(() => {
    const mediaQuery = typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
    if (!mediaQuery) return undefined;

    const updateReducedMotion = () => {
      reducedMotionRef.current = mediaQuery.matches;
    };
    updateReducedMotion();
    mediaQuery.addEventListener?.('change', updateReducedMotion);
    return () => mediaQuery.removeEventListener?.('change', updateReducedMotion);
  }, []);

  useLayoutEffect(() => {
    if (dragRef.current || attachRef.current || previewPeel) return;
    flatPositionRef.current = {
      x: initialPosition.x - canvasPadding,
      y: initialPosition.y - canvasPadding,
    };
    applyRootPosition(flatPositionRef.current);
    applyFlatMesh();
  }, [initialPosition.x, initialPosition.y, previewPeel, rotation, scale]);

  useEffect(() => {
    if (!pixiReady || !settleFrom || settleStartedRef.current === settleFrom.key) return;
    settleStartedRef.current = settleFrom.key;
    const fromPointerDelta = settleFrom.pointerDelta || { x: 0, y: -stickerMotionConfig.detachDistance };
    const fromRootOffset = settleFrom.rootOffset || { x: 0, y: 0 };
    stateSettleAnimation({
      peelCorner: settleFrom.peelCorner || 'bottom-edge',
      fromProgress: Number.isFinite(settleFrom.peelProgress) ? settleFrom.peelProgress : 1,
      fromPointerDelta,
      fromRootOffset,
      targetPosition: initialPosition,
      accepted: true,
      targetId: 'home-month-content',
      duration: settleFrom.duration,
    });
  }, [initialPosition.x, initialPosition.y, pixiReady, settleFrom]);

  useLayoutEffect(() => {
    if (!pixiReady || !previewPeel) return;
    flatPositionRef.current = {
      x: initialPosition.x - canvasPadding,
      y: initialPosition.y - canvasPadding,
    };
    applyRootPosition(flatPositionRef.current);
    applyPreviewPeel(previewPeel);
  }, [initialPosition.x, initialPosition.y, pixiReady, previewPeel]);

  useEffect(() => {
    let cancelled = false;
    let app;
    let mesh;
    let shadowMesh;
    let geometry;
    let shadowGeometry;
    let debugGraphics;
    let acquiredTexture = false;
    const visibilityFrames = [];
    const scheduleVisibilityFrame = (callback) => {
      const frame = requestAnimationFrame(callback);
      visibilityFrames.push(frame);
      return frame;
    };

    async function setupPixi() {
      if (!pixiHostRef.current) return;

      try {
        setPixiReady(false);
        setPixiVisible(false);
        setPixiFailed(false);
        app = new Application();
        await app.init({
          width: stageWidth,
          height: stageHeight,
          background: 0x000000,
          backgroundAlpha: 0,
          clearBeforeRender: true,
          antialias: true,
          autoDensity: true,
          resolution: Math.min(window.devicePixelRatio || 1, 3),
          preference: 'webgl',
          powerPreference: 'low-power',
        });
        if (cancelled || !pixiHostRef.current) {
          destroyPixiApp(app);
          return;
        }

        const texture = await acquireTexture(src);
        acquiredTexture = true;
        if (cancelled || !pixiHostRef.current) {
          releaseTexture(src);
          acquiredTexture = false;
          destroyPixiApp(app);
          return;
        }

        const grid = createStickerGrid(meshWidth, meshHeight, stickerMotionConfig.gridColumns, stickerMotionConfig.gridRows);
        geometry = new MeshGeometry({
          positions: grid.positions,
          uvs: grid.uvs,
          indices: grid.indices,
        });
        shadowGeometry = new MeshGeometry({
          positions: grid.shadowPositions,
          uvs: grid.uvs.slice(),
          indices: grid.indices.slice(),
        });
        shadowMesh = new Mesh({ geometry: shadowGeometry, texture });
        shadowMesh.x = canvasPadding;
        shadowMesh.y = canvasPadding;
        shadowMesh.alpha = 0;
        shadowMesh.tint = 0x1f2630;
        mesh = new Mesh({ geometry, texture });
        mesh.x = canvasPadding;
        mesh.y = canvasPadding;
        app.stage?.addChild(shadowMesh);
        app.stage?.addChild(mesh);

        if (debugMesh) {
          debugGraphics = new Graphics();
          debugGraphics.x = canvasPadding;
          debugGraphics.y = canvasPadding;
          app.stage?.addChild(debugGraphics);
        }

        appRef.current = app;
        meshRef.current = mesh;
        shadowMeshRef.current = shadowMesh;
        geometryRef.current = geometry;
        shadowGeometryRef.current = shadowGeometry;
        debugGraphicsRef.current = debugGraphics;
        meshStateRef.current = {
          ...grid,
          width: meshWidth,
          height: meshHeight,
          peelCorner: 'bottom-edge',
          peelProgress: 0,
          pointerDelta: { x: 0, y: 0 },
          rootOffset: { x: 0, y: 0 },
        };
        app.ticker?.add(updateMeshFrame);
        if (settleFrom) {
          const initialRootOffset = settleFrom.rootOffset || { x: 0, y: 0 };
          flatPositionRef.current = {
            x: initialPosition.x - canvasPadding,
            y: initialPosition.y - canvasPadding,
          };
          applyRootPosition({
            x: flatPositionRef.current.x + initialRootOffset.x,
            y: flatPositionRef.current.y + initialRootOffset.y,
          });
          applyPreviewPeel({
            peelCorner: settleFrom.peelCorner,
            pointerDelta: settleFrom.pointerDelta,
            peelProgress: Number.isFinite(settleFrom.peelProgress) ? settleFrom.peelProgress : 1,
          });
        } else {
          applyFlatMesh();
        }
        app.renderer?.resize?.(stageWidth, stageHeight);
        app.canvas.style.display = 'block';
        app.canvas.style.width = `${stageWidth}px`;
        app.canvas.style.height = `${stageHeight}px`;
        app.canvas.style.background = 'transparent';
        app.canvas.style.opacity = '1';
        app.canvas.style.visibility = 'hidden';
        app.renderer.background.alpha = 0;
        app.render();
        pixiHostRef.current.replaceChildren(app.canvas);
        if (!cancelled) {
          scheduleVisibilityFrame(() => {
            if (cancelled || !app?.canvas) return;
            app.render();
            scheduleVisibilityFrame(() => {
              if (cancelled || !app?.canvas) return;
              app.render();
              app.canvas.style.visibility = 'visible';
              setPixiVisible(true);
              setPixiReady(true);
              scheduleVisibilityFrame(() => {
                if (cancelled) return;
                onReadyRef.current?.(id);
              });
            });
          });
        }
      } catch (error) {
        console.warn('Peelable sticker Pixi setup failed', error);
        if (!cancelled) {
          setPixiFailed(true);
          onReadyRef.current?.(id);
        }
      }
    }

    void setupPixi();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      settleAnimationRef.current?.stop?.();
      visibilityFrames.forEach((frame) => cancelAnimationFrame(frame));
      try {
        app?.renderer?.canvas?.remove?.();
        app?.ticker?.remove(updateMeshFrame);
        if (debugGraphicsRef.current === debugGraphics) debugGraphicsRef.current = null;
        if (debugGraphics && !debugGraphics.destroyed) debugGraphics.destroy();
        if (mesh && !mesh.destroyed) mesh.destroy({ children: true, texture: false, textureSource: false });
        if (shadowMesh && !shadowMesh.destroyed) shadowMesh.destroy({ children: true, texture: false, textureSource: false });
        if (geometry && !geometry.destroyed) geometry.destroy();
        if (shadowGeometry && !shadowGeometry.destroyed) shadowGeometry.destroy();
        destroyPixiApp(app);
      } catch (error) {
        console.warn('Peelable sticker cleanup failed', error);
      }
      if (acquiredTexture) releaseTexture(src);
      if (appRef.current === app) appRef.current = null;
      if (meshRef.current === mesh) meshRef.current = null;
      if (shadowMeshRef.current === shadowMesh) shadowMeshRef.current = null;
      if (geometryRef.current === geometry) geometryRef.current = null;
      if (shadowGeometryRef.current === shadowGeometry) shadowGeometryRef.current = null;
      meshStateRef.current = null;
    };
  }, [debugMesh, id, meshHeight, meshWidth, src, stageHeight, stageWidth]);

  function applyRootPosition(position) {
    const root = rootRef.current;
    if (!root) return;
    root.style.transform = `translate3d(${position.x}px, ${position.y}px, 0) rotate(${rotation}deg)`;
  }

  function showPixiLayer() {
    setPixiActive(true);
    if (pixiReady) setPixiVisible(true);
    if (pixiHostRef.current) pixiHostRef.current.style.visibility = 'visible';
  }

  function hidePixiLayer() {
    if (previewPeel || transformActive || dragRef.current || attachRef.current) return;
    setPixiActive(false);
    setPixiVisible(false);
    if (pixiHostRef.current) pixiHostRef.current.style.visibility = 'hidden';
  }

  function updatePositionBuffer(geometry) {
    geometry?.getBuffer?.('aPosition')?.update();
  }

  function applyFlatMesh() {
    const state = meshStateRef.current;
    if (!state) return;
    state.vertices.forEach((vertex, index) => {
      vertex.x = vertex.baseX;
      vertex.y = vertex.baseY;
      state.positions[index * 2] = vertex.baseX;
      state.positions[index * 2 + 1] = vertex.baseY;
      state.shadowPositions[index * 2] = vertex.baseX;
      state.shadowPositions[index * 2 + 1] = vertex.baseY;
    });
    state.peelProgress = 0;
    state.pointerDelta = { x: 0, y: 0 };
    state.rootOffset = { x: 0, y: 0 };
    updatePositionBuffer(geometryRef.current);
    updatePositionBuffer(shadowGeometryRef.current);
    if (shadowMeshRef.current) shadowMeshRef.current.alpha = 0;
    drawDebugMesh();
    if (debugLabelRef.current) debugLabelRef.current.textContent = 'peel 0%';
  }

  function applyPreviewPeel(peel) {
    const state = meshStateRef.current;
    if (!state) return;
    const pointerDelta = peel.pointerDelta || { x: 0, y: -stickerMotionConfig.detachDistance };
    state.peelCorner = peel.peelCorner || 'bottom-edge';
    state.peelProgress = Number.isFinite(peel.peelProgress) ? peel.peelProgress : 1;
    state.pointerDelta = pointerDelta;
    state.rootOffset = { x: 0, y: 0 };
    const deformation = applyPeelDeformation({
      vertices: state.vertices,
      positions: state.positions,
      shadowPositions: state.shadowPositions,
      width: state.width,
      height: state.height,
      peelCorner: state.peelCorner,
      pointerDelta,
      peelProgress: state.peelProgress,
      feather: stickerMotionConfig.peelFeather,
      curlAmount: stickerMotionConfig.curlAmount,
      curlWidth: stickerMotionConfig.curlWidth,
      floatingTipCurlAmount: stickerMotionConfig.floatingTipCurlAmount,
      floatingTipCurlWidth: stickerMotionConfig.floatingTipCurlWidth,
      perspectiveAmount: stickerMotionConfig.perspectiveAmount,
      shadowOffset: stickerMotionConfig.shadowOffsetMax,
      reducedMotion: reducedMotionRef.current,
    });
    updatePositionBuffer(geometryRef.current);
    updatePositionBuffer(shadowGeometryRef.current);
    if (shadowMeshRef.current) {
      shadowMeshRef.current.alpha = lerp(
        stickerMotionConfig.shadowAlphaMin,
        stickerMotionConfig.shadowAlphaMax,
        deformation.maxDetachedWeight
      );
    }
    drawDebugMesh();
    recordDebugMeshSample(deformation);
    if (debugLabelRef.current) debugLabelRef.current.textContent = `peel ${Math.round(state.peelProgress * 100)}%`;
  }

  function updateMeshFrame() {
    const state = meshStateRef.current;
    if (!state) return;

    const drag = dragRef.current;
    const attach = attachRef.current;
    if (!drag && !attach) return;

    const nextProgress = drag ? drag.peelProgress : attach.peelProgress;
    const targetDelta = drag ? drag.pointerDelta : attach.pointerDelta;
    const rootOffset = drag ? drag.rootOffset : attach.rootOffset;
    const shadowLift = stickerMotionConfig.shadowOffsetMin + (stickerMotionConfig.shadowOffsetMax - stickerMotionConfig.shadowOffsetMin) * nextProgress;

    state.peelCorner = drag?.peelCorner || attach?.peelCorner || state.peelCorner;
    const frameDamping = reducedMotionRef.current
      ? 0.55
      : drag
        ? stickerMotionConfig.followDamping
        : 1;
    state.peelProgress = lerp(state.peelProgress, nextProgress, frameDamping);
    state.pointerDelta = {
      x: lerp(state.pointerDelta.x, targetDelta.x, frameDamping),
      y: lerp(state.pointerDelta.y, targetDelta.y, frameDamping),
    };
    state.rootOffset = {
      x: lerp(state.rootOffset.x, rootOffset.x, frameDamping),
      y: lerp(state.rootOffset.y, rootOffset.y, frameDamping),
    };

    const visualRootOffset = drag ? rootOffset : state.rootOffset;
    applyRootPosition({
      x: flatPositionRef.current.x + visualRootOffset.x,
      y: flatPositionRef.current.y + visualRootOffset.y,
    });
    const attachCurlProgress = attach ? easeOutCubic(attach.curlProgress || 0) : 1;
    const curlMultiplier = attach
      ? lerp(stickerMotionConfig.attachCurlStartMultiplier, stickerMotionConfig.attachCurlEndMultiplier, attachCurlProgress)
      : 1;
    const deformation = applyPeelDeformation({
      vertices: state.vertices,
      positions: state.positions,
      shadowPositions: state.shadowPositions,
      width: state.width,
      height: state.height,
      peelCorner: state.peelCorner,
      pointerDelta: state.pointerDelta,
      peelProgress: state.peelProgress,
      feather: stickerMotionConfig.peelFeather,
      curlAmount: stickerMotionConfig.curlAmount * curlMultiplier,
      curlWidth: stickerMotionConfig.curlWidth,
      floatingTipCurlAmount: stickerMotionConfig.floatingTipCurlAmount,
      floatingTipCurlWidth: stickerMotionConfig.floatingTipCurlWidth,
      perspectiveAmount: stickerMotionConfig.perspectiveAmount,
      shadowOffset: shadowLift,
      reducedMotion: reducedMotionRef.current,
    });
    updatePositionBuffer(geometryRef.current);
    updatePositionBuffer(shadowGeometryRef.current);
    if (shadowMeshRef.current) {
      shadowMeshRef.current.alpha = lerp(
        stickerMotionConfig.shadowAlphaMin,
        stickerMotionConfig.shadowAlphaMax,
        deformation.maxDetachedWeight
      );
    }
    drawDebugMesh();
    recordDebugMeshSample(deformation);
    if (debugLabelRef.current) debugLabelRef.current.textContent = `peel ${Math.round(state.peelProgress * 100)}%`;
  }

  function recordDebugMeshSample(deformation) {
    if (!debugMesh || typeof window === 'undefined') return;
    const state = meshStateRef.current;
    if (!state) return;
    const displacements = state.vertices.map((vertex) => Math.hypot(vertex.x - vertex.baseX, vertex.y - vertex.baseY));
    const roundedBuckets = new Set(displacements.map((value) => Math.round(value)));
    const sample = {
      id,
      peelCorner: state.peelCorner,
      peelProgress: Number(state.peelProgress.toFixed(3)),
      pointerDelta: {
        x: Number(state.pointerDelta.x.toFixed(2)),
        y: Number(state.pointerDelta.y.toFixed(2)),
      },
      maxDetachedWeight: Number(deformation.maxDetachedWeight.toFixed(3)),
      minVertexDelta: Number(Math.min(...displacements).toFixed(2)),
      maxVertexDelta: Number(Math.max(...displacements).toFixed(2)),
      uniqueDisplacementBuckets: roundedBuckets.size,
    };
    window.__peelableStickerDebug = sample;
    window.__peelableStickerDebugHistory = [...(window.__peelableStickerDebugHistory || []).slice(-119), sample];
  }

  function drawDebugMesh() {
    const state = meshStateRef.current;
    const graphics = debugGraphicsRef.current;
    if (!state || !graphics || graphics.destroyed || !graphics.context) return;

    graphics.clear();
    for (let row = 0; row <= stickerMotionConfig.gridRows; row += 1) {
      for (let column = 0; column <= stickerMotionConfig.gridColumns; column += 1) {
        const index = row * state.vertexColumns + column;
        const vertex = state.vertices[index];
        const detached = Math.hypot(vertex.x - vertex.baseX, vertex.y - vertex.baseY) > 2;
        graphics.circle(vertex.x, vertex.y, detached ? 1.8 : 1.25).fill(detached ? 0xff6b8a : 0x65c466);
        if (column < stickerMotionConfig.gridColumns) {
          const next = state.vertices[index + 1];
          graphics.moveTo(vertex.x, vertex.y).lineTo(next.x, next.y).stroke({ width: 0.45, color: 0x4aa3ff, alpha: 0.55 });
        }
        if (row < stickerMotionConfig.gridRows) {
          const next = state.vertices[index + state.vertexColumns];
          graphics.moveTo(vertex.x, vertex.y).lineTo(next.x, next.y).stroke({ width: 0.45, color: 0x4aa3ff, alpha: 0.55 });
        }
      }
    }
    const baseOrigin = getCornerPoint(state.peelCorner, state.width, state.height);
    const origin = state.vertices.reduce((closest, vertex) => {
      const currentDistance = Math.hypot(vertex.baseX - baseOrigin.x, vertex.baseY - baseOrigin.y);
      return currentDistance < closest.distance ? { vertex, distance: currentDistance } : closest;
    }, { vertex: state.vertices[0], distance: Infinity }).vertex;
    graphics.circle(origin.x, origin.y, 4).stroke({ width: 1.5, color: 0xffcc00, alpha: 0.95 });
  }

  function getDragGeometry(deltaX, deltaY, drag) {
    const distance = Math.hypot(deltaX, deltaY);
    const peelDelta = {
      x: 0,
      y: -Math.min(stickerMotionConfig.visualPeelDistance, distance),
    };

    if (drag?.isDetached) {
      return {
        peelProgress: 1,
        pointerDelta: peelDelta,
        rootOffset: { x: deltaX, y: deltaY },
      };
    }

    const progress = clamp(distance / stickerMotionConfig.detachTriggerDistance, 0, 1);

    return {
      peelProgress: progress,
      pointerDelta: {
        x: peelDelta.x * progress,
        y: peelDelta.y * progress,
      },
      rootOffset: { x: deltaX, y: deltaY },
    };
  }

  function startPointerDrag(event) {
    if (disabled || event.target.closest?.('button')) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (dragRef.current) return;

    event.stopPropagation();
    if (event.cancelable) event.preventDefault();
    showPixiLayer();
    cancelAnimationFrame(rafRef.current);
    const interruptedRootOffset = meshStateRef.current?.rootOffset || attachRef.current?.rootOffset || { x: 0, y: 0 };
    settleAnimationRef.current?.stop?.();
    settleAnimationRef.current = null;
    attachRef.current = null;
    if (interruptedRootOffset.x || interruptedRootOffset.y) {
      flatPositionRef.current = {
        x: flatPositionRef.current.x + interruptedRootOffset.x,
        y: flatPositionRef.current.y + interruptedRootOffset.y,
      };
      if (meshStateRef.current) {
        meshStateRef.current.rootOffset = { x: 0, y: 0 };
      }
      applyRootPosition(flatPositionRef.current);
    }
    rootRef.current?.setPointerCapture?.(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startPointer: { x: event.clientX, y: event.clientY },
      peelCorner: 'bottom-edge',
      isDetached: false,
      detachDirection: null,
      peelProgress: 0,
      pointerDelta: { x: 0, y: 0 },
      rootOffset: { x: 0, y: 0 },
      lastDropPosition: { x: initialPosition.x, y: initialPosition.y },
    };
    onDragStart?.(id);
  }

  function cancelActivePointerDrag() {
    if (!dragRef.current) return;

    const drag = dragRef.current;
    const currentRootOffset = meshStateRef.current?.rootOffset || drag.rootOffset || { x: 0, y: 0 };
    const currentPosition = {
      x: flatPositionRef.current.x + canvasPadding + currentRootOffset.x,
      y: flatPositionRef.current.y + canvasPadding + currentRootOffset.y,
    };
    rootRef.current?.releasePointerCapture?.(drag.pointerId);
    dragRef.current = null;
    attachRef.current = null;
    flatPositionRef.current = {
      x: currentPosition.x - canvasPadding,
      y: currentPosition.y - canvasPadding,
    };
    if (meshStateRef.current) meshStateRef.current.rootOffset = { x: 0, y: 0 };
    applyRootPosition(flatPositionRef.current);
    onDrop?.(id, {
      position: currentPosition,
      targetId: 'home-month-content',
      accepted: true,
    });
  }

  function cancelPointerDragForMultiTouch(event) {
    if (event.touches?.length < 2) return;
    cancelActivePointerDrag();
  }

  function movePointerDrag(event) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.stopPropagation();
    if (event.cancelable) event.preventDefault();

    const deltaX = event.clientX - drag.startPointer.x;
    const deltaY = event.clientY - drag.startPointer.y - (event.pointerType === 'touch' ? stickerMotionConfig.pointerLiftOffset : 0);
    if (!drag.isDetached && Math.hypot(deltaX, deltaY) >= stickerMotionConfig.detachTriggerDistance) {
      const distance = Math.max(Math.hypot(deltaX, deltaY), 1);
      drag.isDetached = true;
      drag.detachDirection = { x: 0, y: -1 };
    }

    const nextDragGeometry = getDragGeometry(deltaX, deltaY, drag);
    Object.assign(drag, nextDragGeometry);
    applyRootPosition({
      x: flatPositionRef.current.x + nextDragGeometry.rootOffset.x,
      y: flatPositionRef.current.y + nextDragGeometry.rootOffset.y,
    });

    const state = meshStateRef.current;
    const projectedStickerX = flatPositionRef.current.x + canvasPadding + nextDragGeometry.rootOffset.x + nextDragGeometry.pointerDelta.x * nextDragGeometry.peelProgress;
    const projectedStickerY = flatPositionRef.current.y + canvasPadding + nextDragGeometry.rootOffset.y + nextDragGeometry.pointerDelta.y * nextDragGeometry.peelProgress;
    drag.lastDropPosition = {
      x: state && nextDragGeometry.peelProgress >= 1 ? flatPositionRef.current.x + canvasPadding + nextDragGeometry.rootOffset.x : projectedStickerX,
      y: state && nextDragGeometry.peelProgress >= 1 ? flatPositionRef.current.y + canvasPadding + nextDragGeometry.rootOffset.y : projectedStickerY,
    };
    onDragMove?.(id, drag.lastDropPosition);
  }

  function finishPointerDrag(event) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.stopPropagation();
    rootRef.current?.releasePointerCapture?.(event.pointerId);
    dragRef.current = null;

    const currentPosition = drag.peelProgress >= 1
      ? {
        x: flatPositionRef.current.x + canvasPadding + drag.rootOffset.x,
        y: flatPositionRef.current.y + canvasPadding + drag.rootOffset.y,
      }
      : { x: initialPosition.x, y: initialPosition.y };
    const dropResult = getDropResult?.({
      id,
      position: currentPosition,
      size: { width: meshWidth, height: meshHeight },
      pointer: { x: event.clientX, y: event.clientY },
    }) || {
      accepted: true,
      position: currentPosition,
    };
    const targetPosition = dropResult.accepted ? dropResult.position : { x: initialPosition.x, y: initialPosition.y };
    startAttachAnimation({
      peelCorner: drag.peelCorner,
      fromProgress: meshStateRef.current?.peelProgress || drag.peelProgress,
      fromPointerDelta: meshStateRef.current?.pointerDelta || drag.pointerDelta,
      fromRootOffset: drag.rootOffset,
      targetPosition,
      accepted: dropResult.accepted,
      targetId: dropResult.targetId,
    });
  }

  function startAttachAnimation({ peelCorner, fromProgress, fromPointerDelta, fromRootOffset, targetPosition, accepted, targetId }) {
    stateSettleAnimation({ peelCorner, fromProgress, fromPointerDelta, fromRootOffset, targetPosition, accepted, targetId });
  }

  function stateSettleAnimation({ peelCorner, fromProgress, fromPointerDelta, fromRootOffset, targetPosition, accepted, targetId, duration: forcedDuration }) {
    const duration = forcedDuration || (accepted ? stickerMotionConfig.dropDuration : stickerMotionConfig.cancelDuration);
    const targetRootOffset = {
      x: targetPosition.x - canvasPadding - flatPositionRef.current.x,
      y: targetPosition.y - canvasPadding - flatPositionRef.current.y,
    };

    function updateSettle(value) {
      const eased = clamp(value, 0, 1);
      const peelDelay = accepted ? stickerMotionConfig.attachPeelDelay : 0;
      const peelEase = easeOutCubic(clamp((eased - peelDelay) / Math.max(1 - peelDelay, 0.0001), 0, 1));
      attachRef.current = {
        peelCorner,
        peelProgress: fromProgress * (1 - peelEase),
        pointerDelta: {
          x: fromPointerDelta.x * (1 - eased),
          y: fromPointerDelta.y * (1 - eased),
        },
        rootOffset: {
          x: lerp(fromRootOffset.x, targetRootOffset.x, eased),
          y: lerp(fromRootOffset.y, targetRootOffset.y, eased),
        },
        curlProgress: eased,
      };
    }

    function completeSettle() {
      attachRef.current = null;
      settleAnimationRef.current = null;
      flatPositionRef.current = {
        x: targetPosition.x - canvasPadding,
        y: targetPosition.y - canvasPadding,
      };
      applyRootPosition(flatPositionRef.current);
      applyFlatMesh();
      hidePixiLayer();
      onDrop?.(id, {
        position: targetPosition,
        targetId,
        accepted,
      });
    }

    cancelAnimationFrame(rafRef.current);
    settleAnimationRef.current?.stop?.();
    showPixiLayer();
    settleAnimationRef.current = animate(0, 1, accepted ? {
      duration: duration / 1000,
      ease: easeOutCubic,
      onUpdate: updateSettle,
      onComplete: completeSettle,
    } : {
      duration: duration / 1000,
      ease: easeOutCubic,
      onUpdate: updateSettle,
      onComplete: completeSettle,
    });
  }

  const showBaseImage = !pixiFailed;
  const hideBaseImage = pixiActive && pixiVisible && !pixiFailed;
  const showFallback = pixiFailed;

  return (
    <div
      ref={rootRef}
      className={`home-sticker home-sticker-peelable ${className} ${selected ? 'home-sticker-selected' : ''}`}
      data-sticker-id={id}
      data-peel-debug={debugMesh ? 'true' : undefined}
      style={{
        left: 0,
        top: 0,
        width: stageWidth,
        height: stageHeight,
        '--sticker-padding': `${canvasPadding}px`,
        '--sticker-width': `${meshWidth}px`,
        '--sticker-height': `${meshHeight}px`,
      }}
      onPointerDown={startPointerDrag}
      onPointerMove={movePointerDrag}
      onPointerUp={finishPointerDrag}
      onPointerCancel={finishPointerDrag}
      onTouchStart={cancelPointerDragForMultiTouch}
      onTouchMove={cancelPointerDragForMultiTouch}
    >
      {showBaseImage ? (
        <img
          className={`home-sticker-base-image ${hideBaseImage ? 'home-sticker-base-image-hidden' : ''}`}
          src={src}
          alt=""
          draggable={false}
        />
      ) : null}
      <div
        ref={pixiHostRef}
        className={`home-sticker-pixi ${pixiActive ? 'home-sticker-pixi-active' : ''}`}
        aria-hidden="true"
      />
      {showFallback ? (
        <img
          className="home-sticker-image home-sticker-image-fallback"
          src={src}
          alt=""
          style={{
            left: canvasPadding,
            top: canvasPadding,
            width: meshWidth,
            height: meshHeight,
          }}
        />
      ) : null}
      {debugMesh ? <div ref={debugLabelRef} className="home-sticker-debug-label">peel 0%</div> : null}
      {children}
    </div>
  );
}
