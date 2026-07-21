import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { animate } from 'framer-motion';
import { stickerMotionConfig } from './stickerMotionConfig';

const canvasPadding = 32;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function lerp(from, to, amount) {
  return from + (to - from) * amount;
}

function easeOutCubic(value) {
  return 1 - (1 - value) ** 3;
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
  const dragRef = useRef(null);
  const attachRef = useRef(null);
  const settleAnimationRef = useRef(null);
  const onReadyRef = useRef(onReady);
  const settleStartedRef = useRef('');
  const flatPositionRef = useRef({
    x: initialPosition.x - canvasPadding,
    y: initialPosition.y - canvasPadding,
  });
  const [shadowProgress, setShadowProgress] = useState(() => (
    Number.isFinite(previewPeel?.peelProgress) ? previewPeel.peelProgress : 0
  ));
  const stageWidth = width * scale + canvasPadding * 2;
  const stageHeight = height * scale + canvasPadding * 2;
  const stickerWidth = width * scale;
  const stickerHeight = height * scale;

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => onReadyRef.current?.(id));
    return () => cancelAnimationFrame(frame);
  }, [id, src, stickerHeight, stickerWidth]);

  useEffect(() => {
    document.addEventListener('avocadoo:sticker-multitouch', cancelActivePointerDrag);
    return () => document.removeEventListener('avocadoo:sticker-multitouch', cancelActivePointerDrag);
  }, []);

  useEffect(() => {
    if (previewPeel) {
      setShadowProgress(Number.isFinite(previewPeel.peelProgress) ? previewPeel.peelProgress : 1);
    } else if (!dragRef.current && !attachRef.current && !transformActive) {
      setShadowProgress(0);
    }
  }, [previewPeel, transformActive]);

  useEffect(() => {
    if (transformActive) setShadowProgress(1);
    if (!transformActive && !dragRef.current && !attachRef.current && !previewPeel) setShadowProgress(0);
  }, [transformActive, previewPeel]);

  useLayoutEffect(() => {
    if (dragRef.current || attachRef.current) return;
    flatPositionRef.current = {
      x: initialPosition.x - canvasPadding,
      y: initialPosition.y - canvasPadding,
    };
    if (settleFrom && settleStartedRef.current !== settleFrom.key) {
      const initialRootOffset = settleFrom.rootOffset || { x: 0, y: 0 };
      applyRootPosition({
        x: flatPositionRef.current.x + initialRootOffset.x,
        y: flatPositionRef.current.y + initialRootOffset.y,
      });
      setShadowProgress(Number.isFinite(settleFrom.peelProgress) ? settleFrom.peelProgress : 1);
      return;
    }
    applyRootPosition(flatPositionRef.current);
  }, [initialPosition.x, initialPosition.y, previewPeel, rotation, scale, settleFrom]);

  useEffect(() => {
    if (!settleFrom || settleStartedRef.current === settleFrom.key) return;
    settleStartedRef.current = settleFrom.key;
    startAttachAnimation({
      fromShadowProgress: Number.isFinite(settleFrom.peelProgress) ? settleFrom.peelProgress : 1,
      fromRootOffset: settleFrom.rootOffset || { x: 0, y: 0 },
      targetPosition: initialPosition,
      accepted: true,
      targetId: 'home-month-content',
      duration: settleFrom.duration,
    });
  }, [initialPosition.x, initialPosition.y, settleFrom]);

  function applyRootPosition(position) {
    const root = rootRef.current;
    if (!root) return;
    root.style.transform = `translate3d(${position.x}px, ${position.y}px, 0) rotate(${rotation}deg)`;
  }

  function getDragGeometry(deltaX, deltaY, drag) {
    const distance = Math.hypot(deltaX, deltaY);
    if (!drag?.isDetached && distance >= stickerMotionConfig.detachTriggerDistance) {
      drag.isDetached = true;
    }

    return {
      shadowProgress: drag?.isDetached ? 1 : clamp(distance / stickerMotionConfig.detachTriggerDistance, 0, 1),
      rootOffset: { x: deltaX, y: deltaY },
    };
  }

  function startPointerDrag(event) {
    if (disabled || event.target.closest?.('button')) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (dragRef.current) return;

    event.stopPropagation();
    if (event.cancelable) event.preventDefault();

    const interruptedRootOffset = attachRef.current?.rootOffset || { x: 0, y: 0 };
    settleAnimationRef.current?.stop?.();
    settleAnimationRef.current = null;
    attachRef.current = null;
    if (interruptedRootOffset.x || interruptedRootOffset.y) {
      flatPositionRef.current = {
        x: flatPositionRef.current.x + interruptedRootOffset.x,
        y: flatPositionRef.current.y + interruptedRootOffset.y,
      };
      applyRootPosition(flatPositionRef.current);
    }

    rootRef.current?.setPointerCapture?.(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startPointer: { x: event.clientX, y: event.clientY },
      isDetached: false,
      shadowProgress: 0,
      rootOffset: { x: 0, y: 0 },
      lastDropPosition: { x: initialPosition.x, y: initialPosition.y },
    };
    setShadowProgress(0);
    onDragStart?.(id);
  }

  function cancelActivePointerDrag() {
    if (!dragRef.current) return;

    const drag = dragRef.current;
    const currentRootOffset = drag.rootOffset || { x: 0, y: 0 };
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
    applyRootPosition(flatPositionRef.current);
    setShadowProgress(transformActive ? 1 : 0);
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
    const nextDragGeometry = getDragGeometry(deltaX, deltaY, drag);
    Object.assign(drag, nextDragGeometry);
    applyRootPosition({
      x: flatPositionRef.current.x + nextDragGeometry.rootOffset.x,
      y: flatPositionRef.current.y + nextDragGeometry.rootOffset.y,
    });
    setShadowProgress(nextDragGeometry.shadowProgress);

    drag.lastDropPosition = {
      x: flatPositionRef.current.x + canvasPadding + nextDragGeometry.rootOffset.x,
      y: flatPositionRef.current.y + canvasPadding + nextDragGeometry.rootOffset.y,
    };
    onDragMove?.(id, drag.lastDropPosition);
  }

  function finishPointerDrag(event) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.stopPropagation();
    rootRef.current?.releasePointerCapture?.(event.pointerId);
    dragRef.current = null;

    const currentPosition = drag.shadowProgress >= 1
      ? {
        x: flatPositionRef.current.x + canvasPadding + drag.rootOffset.x,
        y: flatPositionRef.current.y + canvasPadding + drag.rootOffset.y,
      }
      : { x: initialPosition.x, y: initialPosition.y };
    const dropResult = getDropResult?.({
      id,
      position: currentPosition,
      size: { width: stickerWidth, height: stickerHeight },
      pointer: { x: event.clientX, y: event.clientY },
    }) || {
      accepted: true,
      position: currentPosition,
    };
    const targetPosition = dropResult.accepted ? dropResult.position : { x: initialPosition.x, y: initialPosition.y };
    startAttachAnimation({
      fromShadowProgress: drag.shadowProgress,
      fromRootOffset: drag.rootOffset,
      targetPosition,
      accepted: dropResult.accepted,
      targetId: dropResult.targetId,
    });
  }

  function startAttachAnimation({ fromShadowProgress, fromRootOffset, targetPosition, accepted, targetId, duration: forcedDuration }) {
    const duration = forcedDuration || (accepted ? stickerMotionConfig.dropDuration : stickerMotionConfig.cancelDuration);
    const targetRootOffset = {
      x: targetPosition.x - canvasPadding - flatPositionRef.current.x,
      y: targetPosition.y - canvasPadding - flatPositionRef.current.y,
    };

    function updateSettle(value) {
      const eased = clamp(value, 0, 1);
      const nextRootOffset = {
        x: lerp(fromRootOffset.x, targetRootOffset.x, eased),
        y: lerp(fromRootOffset.y, targetRootOffset.y, eased),
      };
      attachRef.current = {
        rootOffset: nextRootOffset,
        shadowProgress: fromShadowProgress * (1 - eased),
      };
      applyRootPosition({
        x: flatPositionRef.current.x + nextRootOffset.x,
        y: flatPositionRef.current.y + nextRootOffset.y,
      });
      setShadowProgress(attachRef.current.shadowProgress);
    }

    function completeSettle() {
      attachRef.current = null;
      settleAnimationRef.current = null;
      flatPositionRef.current = {
        x: targetPosition.x - canvasPadding,
        y: targetPosition.y - canvasPadding,
      };
      applyRootPosition(flatPositionRef.current);
      setShadowProgress(transformActive ? 1 : 0);
      onDrop?.(id, {
        position: targetPosition,
        targetId,
        accepted,
      });
    }

    settleAnimationRef.current?.stop?.();
    updateSettle(0);
    settleAnimationRef.current = animate(0, 1, {
      duration: duration / 1000,
      ease: easeOutCubic,
      onUpdate: updateSettle,
      onComplete: completeSettle,
    });
  }

  const shadowOffset = lerp(stickerMotionConfig.shadowOffsetMin, stickerMotionConfig.shadowOffsetMax, shadowProgress);
  const shadowAlpha = lerp(stickerMotionConfig.shadowAlphaMin, stickerMotionConfig.shadowAlphaMax, shadowProgress);

  return (
    <div
      ref={rootRef}
      className={`home-sticker home-sticker-peelable ${className} ${selected ? 'home-sticker-selected' : ''}`}
      data-sticker-id={id}
      style={{
        left: 0,
        top: 0,
        width: stageWidth,
        height: stageHeight,
        '--sticker-padding': `${canvasPadding}px`,
        '--sticker-width': `${stickerWidth}px`,
        '--sticker-height': `${stickerHeight}px`,
        '--sticker-shadow-offset': `${shadowOffset}px`,
        '--sticker-shadow-alpha': shadowAlpha,
      }}
      onPointerDown={startPointerDrag}
      onPointerMove={movePointerDrag}
      onPointerUp={finishPointerDrag}
      onPointerCancel={finishPointerDrag}
      onTouchStart={cancelPointerDragForMultiTouch}
      onTouchMove={cancelPointerDragForMultiTouch}
    >
      <img
        className="home-sticker-base-image"
        src={src}
        alt=""
        draggable={false}
      />
      {children}
    </div>
  );
}
