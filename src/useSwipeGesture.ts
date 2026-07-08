import { useCallback, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent, PointerEventHandler } from 'react';

export const SWIPE_DIRECTION_THRESHOLD_PX = 10;
export const SWIPE_HORIZONTAL_ANGLE_DEG = 30;
export const SWIPE_VELOCITY_SAMPLE_MS = 100;
export const SWIPE_FLICK_MIN_DISTANCE_PX = 24;
export const SWIPE_FLICK_VELOCITY_PX_PER_MS = 0.45;

type SwipeAxis = 'pending' | 'horizontal' | 'vertical';

type SwipeSample = {
  x: number;
  y: number;
  time: number;
};

export type SwipeGestureState = {
  pointerId: number;
  pointerType: string;
  axis: SwipeAxis;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
  distance: number;
  velocityX: number;
  velocityY: number;
  velocity: number;
  elapsedMs: number;
};

type SwipeGestureOptions = {
  enabled?: boolean;
  thresholdPx?: number;
  horizontalAngleDeg?: number;
  velocitySampleMs?: number;
  onPendingStart?: (state: SwipeGestureState, event: ReactPointerEvent<HTMLElement>) => void;
  onHorizontalLock?: (state: SwipeGestureState, event: ReactPointerEvent<HTMLElement>) => void;
  onHorizontalMove?: (state: SwipeGestureState, event: ReactPointerEvent<HTMLElement>) => void;
  onHorizontalEnd?: (state: SwipeGestureState, event: ReactPointerEvent<HTMLElement>) => void;
  onVerticalLock?: (state: SwipeGestureState, event: ReactPointerEvent<HTMLElement>) => void;
  onCancel?: (state: SwipeGestureState, event: ReactPointerEvent<HTMLElement>) => void;
  onFinish?: (state: SwipeGestureState, event: ReactPointerEvent<HTMLElement>) => void;
};

type InternalSwipeGesture = {
  pointerId: number;
  pointerType: string;
  axis: SwipeAxis;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  startTime: number;
  samples: SwipeSample[];
};

function getNow() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function isHorizontalAngle(deltaX: number, deltaY: number, horizontalAngleDeg: number) {
  const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
  return Math.abs(angle) <= horizontalAngleDeg || Math.abs(angle) >= 180 - horizontalAngleDeg;
}

function getVelocity(samples: SwipeSample[], current: SwipeSample, sampleMs: number) {
  const minTime = current.time - sampleMs;
  let sample = samples[0] || current;

  for (let index = samples.length - 1; index >= 0; index -= 1) {
    if (samples[index].time <= minTime) {
      sample = samples[index];
      break;
    }

    sample = samples[index];
  }

  const elapsedMs = Math.max(current.time - sample.time, 1);
  const velocityX = (current.x - sample.x) / elapsedMs;
  const velocityY = (current.y - sample.y) / elapsedMs;

  return {
    velocityX,
    velocityY,
    velocity: Math.hypot(velocityX, velocityY),
  };
}

function toState(gesture: InternalSwipeGesture, sampleMs: number): SwipeGestureState {
  const current = {
    x: gesture.currentX,
    y: gesture.currentY,
    time: getNow(),
  };
  const deltaX = current.x - gesture.startX;
  const deltaY = current.y - gesture.startY;
  const velocities = getVelocity(gesture.samples, current, sampleMs);

  return {
    pointerId: gesture.pointerId,
    pointerType: gesture.pointerType,
    axis: gesture.axis,
    startX: gesture.startX,
    startY: gesture.startY,
    currentX: current.x,
    currentY: current.y,
    deltaX,
    deltaY,
    distance: Math.hypot(deltaX, deltaY),
    elapsedMs: Math.max(current.time - gesture.startTime, 1),
    ...velocities,
  };
}

export function useSwipeGesture(options: SwipeGestureOptions) {
  const optionsRef = useRef(options);
  const gestureRef = useRef<InternalSwipeGesture | null>(null);

  optionsRef.current = options;

  const handlePointerDown = useCallback<PointerEventHandler<HTMLElement>>((event) => {
    const currentOptions = optionsRef.current;
    if (currentOptions.enabled === false) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    const time = getNow();
    const gesture: InternalSwipeGesture = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      axis: 'pending',
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY,
      startTime: time,
      samples: [{ x: event.clientX, y: event.clientY, time }],
    };

    gestureRef.current = gesture;
    currentOptions.onPendingStart?.(toState(gesture, currentOptions.velocitySampleMs ?? SWIPE_VELOCITY_SAMPLE_MS), event);
  }, []);

  const handlePointerMove = useCallback<PointerEventHandler<HTMLElement>>((event) => {
    const currentOptions = optionsRef.current;
    const gesture = gestureRef.current;
    if (currentOptions.enabled === false || !gesture || gesture.pointerId !== event.pointerId) return;

    const time = getNow();
    gesture.currentX = event.clientX;
    gesture.currentY = event.clientY;
    gesture.samples.push({ x: event.clientX, y: event.clientY, time });
    gesture.samples = gesture.samples.filter((sample) => time - sample.time <= (currentOptions.velocitySampleMs ?? SWIPE_VELOCITY_SAMPLE_MS) * 2);

    const sampleMs = currentOptions.velocitySampleMs ?? SWIPE_VELOCITY_SAMPLE_MS;
    const state = toState(gesture, sampleMs);

    if (gesture.axis === 'pending' && state.distance >= (currentOptions.thresholdPx ?? SWIPE_DIRECTION_THRESHOLD_PX)) {
      gesture.axis = isHorizontalAngle(
        state.deltaX,
        state.deltaY,
        currentOptions.horizontalAngleDeg ?? SWIPE_HORIZONTAL_ANGLE_DEG,
      )
        ? 'horizontal'
        : 'vertical';

      const lockedState = toState(gesture, sampleMs);

      if (gesture.axis === 'horizontal') {
        if (event.cancelable) event.preventDefault();
        currentOptions.onHorizontalLock?.(lockedState, event);
        currentOptions.onHorizontalMove?.(lockedState, event);
        return;
      }

      currentOptions.onVerticalLock?.(lockedState, event);
      return;
    }

    if (gesture.axis !== 'horizontal') return;

    if (event.cancelable) event.preventDefault();
    currentOptions.onHorizontalMove?.(toState(gesture, sampleMs), event);
  }, []);

  const handlePointerUp = useCallback<PointerEventHandler<HTMLElement>>((event) => {
    const currentOptions = optionsRef.current;
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    gesture.currentX = event.clientX;
    gesture.currentY = event.clientY;
    const state = toState(gesture, currentOptions.velocitySampleMs ?? SWIPE_VELOCITY_SAMPLE_MS);
    gestureRef.current = null;

    if (state.axis === 'horizontal') currentOptions.onHorizontalEnd?.(state, event);
    currentOptions.onFinish?.(state, event);
  }, []);

  const handlePointerCancel = useCallback<PointerEventHandler<HTMLElement>>((event) => {
    const currentOptions = optionsRef.current;
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    gesture.currentX = event.clientX;
    gesture.currentY = event.clientY;
    const state = toState(gesture, currentOptions.velocitySampleMs ?? SWIPE_VELOCITY_SAMPLE_MS);
    gestureRef.current = null;
    currentOptions.onCancel?.(state, event);
    currentOptions.onFinish?.(state, event);
  }, []);

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
  };
}
