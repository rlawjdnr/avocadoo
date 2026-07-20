import { Fragment, memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, animate, motion, useMotionValue } from 'framer-motion';
import { hasSupabaseConfig, supabase } from './lib/supabaseClient';
import PeelableSticker from './PeelableSticker';
import { stickerMotionConfig } from './stickerMotionConfig';
import {
  SWIPE_DIRECTION_THRESHOLD_PX,
  SWIPE_FLICK_MIN_DISTANCE_PX,
  SWIPE_FLICK_VELOCITY_PX_PER_MS,
  SWIPE_HORIZONTAL_ANGLE_DEG,
  SWIPE_VELOCITY_SAMPLE_MS,
  useSwipeGesture,
} from './useSwipeGesture';

const assets = {
  bg: './assets/bg-home.png',
  logo: './app-logo.png',
  photos: {
    couple: './assets/photo-couple.png',
    water: './assets/photo-water.png',
    standing: './assets/photo-standing.png',
    food: './assets/photo-food.png',
  },
  plus: './assets/icon-plus.svg',
  down: './assets/icon-down.svg',
  avatar: './assets/icon-avatar.svg',
  avatarHemin: './assets/profile-hemin.svg',
  avatarJeong: './assets/icon-avatar-jeong.svg',
  avatarJeongNeutral: './assets/profile-jeong.svg',
  heart: './assets/icon-heart.svg',
  heartBadge: './assets/icon-heart-badge.svg',
  notification: './assets/icon-notification-empty.svg',
  notificationUnread: './assets/icon-notification.svg',
  likeOutline: './assets/icon-like-outline.svg',
  likeFilled: './assets/icon-like-filled.svg',
  comment: './assets/icon-comment.svg',
  commentEmojiAdd: './assets/icon-comment-emoji-add.svg',
  locationPin: './assets/icon-location-pin.svg',
  send: './assets/icon-send.svg',
  upload: './assets/icon-upload.svg',
  pencil: './assets/icon-pencil.svg',
  photoDelete: './assets/icon-photo-delete.svg',
  coverPhoto: './assets/icon-cover-photo.svg',
  stickerDelete: './assets/icon-sticker-delete.svg',
  modalClose: './assets/icon-modal-close.svg',
  letterName: './assets/letter-name.svg',
  stickers: {
    cloud: './assets/sticker-basic-cloud.png?v=1',
    cloud2: './assets/sticker-basic-cloud2.png?v=1',
    cloudy: './assets/sticker-basic-cloudy.png?v=1',
    glowPurple: './assets/sticker-basic-glowpurple.png?v=1',
    glowGreen: './assets/sticker-basic-glowgreen.png?v=1',
    glowPink: './assets/sticker-basic-glowpink.png?v=1',
    love: './assets/sticker-basic-love.png?v=1',
    loveCheck: './assets/sticker-basic-lovecheck.png?v=1',
    loveDart: './assets/sticker-basic-lovedart.png?v=1',
    moon: './assets/sticker-basic-moon.png?v=1',
    orangeLove: './assets/sticker-basic-orangelove.png?v=1',
    pinkLoveLayered: './assets/sticker-basic-pinklove-layered.png?v=1',
    pinkLove: './assets/sticker-basic-pinklove.png?v=1',
    purpleLove: './assets/sticker-basic-purplelove.png?v=1',
    rainbow: './assets/sticker-basic-rainbow.png?v=1',
    rainy: './assets/sticker-basic-rainy.png?v=1',
    shine: './assets/sticker-basic-shine.png?v=1',
    snow: './assets/sticker-basic-snow.png?v=1',
    star: './assets/sticker-basic-star.png?v=1',
    sun: './assets/sticker-basic-sun.png?v=1',
    thunder: './assets/sticker-basic-thunder.png?v=1',
    umbrella: './assets/sticker-basic-umbrella.png?v=1',
    foodBeer: './assets/sticker-food-beer.png?v=1',
    foodCoffee: './assets/sticker-food-coffee.png?v=1',
    foodHamburger: './assets/sticker-food-hamburger.png?v=1',
    foodHotpot: './assets/sticker-food-hotpot.png?v=1',
    foodSoju: './assets/sticker-food-soju.png?v=1',
  },
};

const coupleSpaceId = import.meta.env.VITE_SUPABASE_COUPLE_SPACE_ID || '11111111-1111-4111-8111-111111111111';
const currentMemberId = import.meta.env.VITE_SUPABASE_CURRENT_MEMBER_ID || '22222222-2222-4222-8222-222222222221';
const currentMemberNickname = import.meta.env.VITE_SUPABASE_CURRENT_MEMBER_NICKNAME || '정정욱';
const storageBucket = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'diary-images';
const defaultWebPushVapidPublicKey = 'BKrrDRDxBMSqgsnhbk3qTEaaf4G8Of19Ase8CD-br0eO7d3waXe83Zjc7wK45HxlStIT5AhD3kNXXf7fky2O8IM';
const webPushVapidPublicKey = defaultWebPushVapidPublicKey.trim();
const placeholderVapidPublicKeys = new Set(['your-vapid-public-key', 'replace-with-vapid-public-key']);
const memberNicknames = ['혜민민', '정정욱'];
const seededMemberIdsByNickname = {
  혜민민: '22222222-2222-4222-8222-222222222222',
  정정욱: '22222222-2222-4222-8222-222222222221',
};
const selectedNicknameStorageKey = 'avocadoo.member.nickname.v1';
const notificationReadStorageKey = 'avocadoo.notifications.readAt.v1';
const weeklySummaryStorageKey = 'avocadoo.weeklySummaries.v2';
const commentEmojiReactionsStorageKey = 'avocadoo.commentEmojiReactions.v1';
const commentEmojiSlots = [
  { id: 'emoji-1', src: './assets/comment-emoji-avocado-1.png' },
  { id: 'emoji-2', src: './assets/comment-emoji-avocado-2.png' },
  { id: 'emoji-3', src: './assets/comment-emoji-avocado-3.png' },
  { id: 'emoji-4', src: './assets/comment-emoji-avocado-4.png' },
  { id: 'emoji-5', src: './assets/comment-emoji-avocado-5.png' },
  { id: 'emoji-6', src: './assets/comment-emoji-avocado-6.png' },
  { id: 'emoji-7', src: './assets/comment-emoji-avocado-7.png' },
  { id: 'emoji-8', src: './assets/comment-emoji-avocado-8.png' },
  { id: 'emoji-9', src: '' },
  { id: 'emoji-10', src: '' },
  { id: 'emoji-11', src: '' },
  { id: 'emoji-12', src: '' },
];
const appThemeColor = '#FAF9F7';
const appSplashThemeColor = '#ffffff';
const appDimThemeColor = '#7d7c7a';

const uploadButtonRadiusSpring = {
  type: 'spring',
  stiffness: 800,
  damping: 55,
};

const uploadButtonSizeSpring = {
  type: 'spring',
  stiffness: 480,
  damping: 50,
};

const uploadButtonTransition = {
  ...uploadButtonSizeSpring,
  borderRadius: uploadButtonRadiusSpring,
};

const uploadButtonRadius = {
  small: 23,
  big: 16,
};

const uploadButtonSize = {
  small: 101,
  big: 358,
};

const uploadButtonPressSpring = {
  type: 'spring',
  stiffness: 1000,
  damping: 55,
};

const uploadButtonReleaseSpring = {
  type: 'spring',
  stiffness: 800,
  damping: 55,
};

const today = new Date();
const initialMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
const weekLabels = ['첫째 주', '둘째 주', '셋째 주', '넷째 주', '다섯째 주', '여섯째 주'];

const polaroidPressSpring = {
  type: 'spring',
  stiffness: 1000,
  damping: 55,
};

const polaroidReleaseSpring = {
  type: 'spring',
  stiffness: 800,
  damping: 55,
};

const polaroidGap = {
  rest: -40,
  pressed: -48,
};

const screenPushTransition = {
  type: 'spring',
  stiffness: 480,
  damping: 50,
};

const defaultScreenPushDistance = 390;
const screenTransitionResetMs = 650;
const maxUploadPhotos = 6;
const notificationRetentionDays = 30;
const diaryEntryFetchPageSize = 60;
const initialDataLoadTimeoutMs = 8000;
const monthDataLoadTimeoutMs = 8000;
const splashEmergencyReleaseMs = 3500;
const weeklySummaryFunctionName = 'generate-weekly-summaries';
const listInitialRenderCount = 8;
const listRenderBatchSize = 8;
const listLoadMoreThresholdPx = 900;
const uploadGridColumnCount = 3;
const storageCacheControlSeconds = '31536000';
const uploadPhotoMaxDimension = 960;
const uploadPhotoQuality = 0.68;
const useStorageImageTransforms = import.meta.env.VITE_SUPABASE_IMAGE_TRANSFORMS === 'true';
const photoTransforms = {
  polaroid: { width: 256, height: 256, resize: 'cover', quality: 60 },
  list: { width: 512, height: 512, resize: 'cover', quality: 65 },
  focus: { width: 960, height: 960, resize: 'cover', quality: 72 },
};
const uploadFieldSpring = {
  type: 'spring',
  stiffness: 480,
  damping: 50,
};

const uploadContentVariants = {
  hidden: {},
  visible: {},
};

const uploadFieldVariants = {
  hidden: { opacity: 0, y: 500 },
  visible: (order = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      ...uploadFieldSpring,
      delay: order * 0.03,
    },
  }),
};

const editModalMotion = {
  initial: { opacity: 0, y: 100 },
  animate: { opacity: 1, y: 0 },
  transition: {
    y: {
      type: 'spring',
      stiffness: 480,
      damping: 50,
    },
    opacity: {
      duration: 0.2,
      ease: [0, 0, 0.2, 1],
    },
  },
};

const largePolaroidRest = [
  { left: 13, top: 0.53, rotate: 3.71 },
  { left: 0, top: 11.61, rotate: -4.12 },
  { left: 0, top: 11.61, rotate: -4.12 },
  { left: 7, top: 5.56, rotate: 0 },
  { left: 4, top: 8.2, rotate: -2.35 },
  { left: 11, top: 3.4, rotate: 2.2 },
];

const largePolaroidStaggerDelay = 0.03;
const largePolaroidPressedGap = 12;
const largePolaroidWidth = 161.705;
const largePolaroidCollapsedWidth = 180;

const largePolaroidSpring = {
  type: 'spring',
  stiffness: 480,
  damping: 50,
};

const largePolaroidFocusSpring = {
  type: 'spring',
  stiffness: 480,
  damping: 50,
};

const focusedPolaroidSpring = {
  type: 'spring',
  stiffness: 480,
  damping: 50,
};

const focusedPolaroidReturnSpring = {
  type: 'spring',
  stiffness: 800,
  damping: 55,
};

const focusedPolaroidOriginYRatio = 0.08;
const focusedPolaroidRestShadow = '-1px 0 2px 1px rgba(0, 0, 0, 0.09)';
const focusedPolaroidLiftShadow = '0 20px 42px rgba(0, 0, 0, 0.26)';
const dimmedScreenTransitions = new Set([
  'home-to-list',
  'home-to-notifications',
  'list-to-comment',
  'notifications-to-comment',
]);

const focusedPolaroidLayoutTransition = {
  x: focusedPolaroidSpring,
  y: focusedPolaroidSpring,
  scale: focusedPolaroidSpring,
  rotate: focusedPolaroidSpring,
  opacity: { duration: 0.08, ease: 'linear' },
};

const focusedPolaroidShadowTransition = {
  opacity: { duration: 0.38, ease: [0, 0, 0.2, 1] },
};

const focusedPolaroidReturnTransition = {
  ...focusedPolaroidLayoutTransition,
  x: focusedPolaroidReturnSpring,
  y: focusedPolaroidReturnSpring,
  scale: focusedPolaroidReturnSpring,
  rotate: focusedPolaroidReturnSpring,
};

const coveredPageTransition = {
  type: 'spring',
  stiffness: 480,
  damping: 50,
};
const coveringPageShadow = '-8px 0 14px rgba(31, 38, 48, 0.08)';
const restingPageShadow = 'none';
const screenPushShadowTransition = {
  ...screenPushTransition,
  boxShadow: { duration: 0.14, ease: 'easeOut' },
};
const splashMinimumDurationMs = 2000;
const instagramLikeHapticMs = 10;
const stickerModeHapticMs = 8;
const listFocusedEntryInset = 96;
const listWeekAnchorOffset = 120;
const stickerStorageKey = 'avocadoo.home.stickers.v2';
const stickerBaseSize = 100;
const homeWeekListTop = 63;
const stickerScaleLimit = {
  min: 0.18,
  max: 2.4,
};
const stickerOptions = [
  { id: 'cloud', label: '구름', src: assets.stickers.cloud, category: 'cloud' },
  { id: 'cloud2', label: '연한 구름', src: assets.stickers.cloud2, category: 'cloud' },
  { id: 'cloudy', label: '해구름', src: assets.stickers.cloudy, category: 'weather' },
  { id: 'glowPurple', label: '보라 반짝', src: assets.stickers.glowPurple, category: 'sparkle' },
  { id: 'glowGreen', label: '초록 반짝', src: assets.stickers.glowGreen, category: 'sparkle' },
  { id: 'glowPink', label: '분홍 반짝', src: assets.stickers.glowPink, category: 'sparkle' },
  { id: 'love', label: '빨간 하트', src: assets.stickers.love, category: 'heart' },
  { id: 'loveCheck', label: '체크 하트', src: assets.stickers.loveCheck, category: 'heart' },
  { id: 'loveDart', label: '화살 하트', src: assets.stickers.loveDart, category: 'heart' },
  { id: 'moon', label: '달', src: assets.stickers.moon, category: 'weather' },
  { id: 'orangeLove', label: '주황 하트', src: assets.stickers.orangeLove, category: 'heart' },
  { id: 'pinkLoveLayered', label: '겹하트', src: assets.stickers.pinkLoveLayered, category: 'heart' },
  { id: 'pinkLove', label: '분홍 하트', src: assets.stickers.pinkLove, category: 'heart' },
  { id: 'purpleLove', label: '보라 하트', src: assets.stickers.purpleLove, category: 'heart' },
  { id: 'rainbow', label: '무지개', src: assets.stickers.rainbow, category: 'weather' },
  { id: 'rainy', label: '비구름', src: assets.stickers.rainy, category: 'weather' },
  { id: 'shine', label: '반짝이', src: assets.stickers.shine, category: 'sparkle' },
  { id: 'snow', label: '눈꽃', src: assets.stickers.snow, category: 'weather' },
  { id: 'star', label: '별', src: assets.stickers.star, category: 'sparkle' },
  { id: 'sun', label: '해', src: assets.stickers.sun, category: 'weather' },
  { id: 'thunder', label: '천둥', src: assets.stickers.thunder, category: 'weather' },
  { id: 'umbrella', label: '우산', src: assets.stickers.umbrella, category: 'weather' },
  { id: 'foodBeer', label: '맥주', src: assets.stickers.foodBeer, category: 'food' },
  { id: 'foodCoffee', label: '커피', src: assets.stickers.foodCoffee, category: 'food' },
  { id: 'foodHamburger', label: '햄버거', src: assets.stickers.foodHamburger, category: 'food' },
  { id: 'foodHotpot', label: '훠궈', src: assets.stickers.foodHotpot, category: 'food' },
  { id: 'foodSoju', label: '소주', src: assets.stickers.foodSoju, category: 'food' },
];
const stickerOptionIds = new Set(stickerOptions.map((option) => option.id));
const stickerTabs = [
  { id: 'all', label: '전체', icon: 'all' },
  { id: 'weather', label: '날씨', src: assets.stickers.cloudy },
  { id: 'sparkle', label: '반짝', src: assets.stickers.star },
  { id: 'heart', label: '하트', src: assets.stickers.pinkLove },
  { id: 'cloud', label: '구름', src: assets.stickers.cloud },
  { id: 'food', label: '음식', src: assets.stickers.foodHamburger },
];
const defaultStickerPosition = {
  xRatio: 0.58,
  y: 304,
  scale: 1,
  rotation: 0,
};

function triggerInstagramLikeHaptic() {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  navigator.vibrate(instagramLikeHapticMs);
}

function triggerStickerModeHaptic() {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  navigator.vibrate(stickerModeHapticMs);
}

function getBackScreen(screen, previousScreen) {
  if (screen === 'list') return 'home';
  if (screen === 'letter') return 'home';
  if (screen === 'notifications') return 'home';
  if (screen === 'comment') return previousScreen === 'notifications' ? 'notifications' : 'list';
  if (screen === 'edit') return previousScreen === 'comment' ? 'comment' : 'list';
  if (screen === 'upload') return previousScreen === 'list' ? 'list' : 'home';
  return null;
}

function getViewportWidth() {
  if (typeof window === 'undefined') return defaultScreenPushDistance;
  return window.visualViewport?.width || window.innerWidth || document.documentElement.clientWidth || defaultScreenPushDistance;
}

function useViewportWidth() {
  const [viewportWidth, setViewportWidth] = useState(getViewportWidth);

  useEffect(() => {
    function updateViewportWidth() {
      setViewportWidth(getViewportWidth());
    }

    updateViewportWidth();
    window.addEventListener('resize', updateViewportWidth);
    window.visualViewport?.addEventListener('resize', updateViewportWidth);

    return () => {
      window.removeEventListener('resize', updateViewportWidth);
      window.visualViewport?.removeEventListener('resize', updateViewportWidth);
    };
  }, []);

  return viewportWidth;
}

function screenMotionProps(screenName, transitionKind, active = true, screenPushDistance = defaultScreenPushDistance) {
  const coveredPageOffset = -screenPushDistance * 0.5;

  if (transitionKind === 'home-to-list') {
    if (screenName === 'home') return { animate: { x: coveredPageOffset }, style: { zIndex: 1 }, transition: coveredPageTransition };
    if (screenName === 'list') {
      return {
        initial: { x: screenPushDistance, boxShadow: coveringPageShadow },
        animate: { x: 0, boxShadow: restingPageShadow },
        style: { zIndex: 2 },
        transition: screenPushShadowTransition,
      };
    }
  }

  if (transitionKind === 'home-to-notifications') {
    if (screenName === 'home') return { animate: { x: coveredPageOffset }, style: { zIndex: 1 }, transition: coveredPageTransition };
    if (screenName === 'notifications') {
      return {
        initial: { x: screenPushDistance, boxShadow: coveringPageShadow },
        animate: { x: 0, boxShadow: restingPageShadow },
        style: { zIndex: 2 },
        transition: screenPushShadowTransition,
      };
    }
  }

  if (transitionKind === 'list-to-comment') {
    if (screenName === 'list') return { animate: { x: coveredPageOffset }, style: { zIndex: 1 }, transition: coveredPageTransition };
    if (screenName === 'comment') {
      return {
        initial: { x: screenPushDistance, boxShadow: coveringPageShadow },
        animate: { x: 0, boxShadow: restingPageShadow },
        style: { zIndex: 2 },
        transition: screenPushShadowTransition,
      };
    }
  }

  if (transitionKind === 'list-to-home') {
    if (screenName === 'home') return { animate: { x: 0 }, style: { zIndex: 1 }, transition: coveredPageTransition };
    if (screenName === 'list') {
      return {
        initial: { boxShadow: coveringPageShadow },
        animate: { x: screenPushDistance, boxShadow: restingPageShadow },
        style: { zIndex: 2 },
        transition: screenPushShadowTransition,
      };
    }
  }

  if (transitionKind === 'notifications-to-home') {
    if (screenName === 'home') return { animate: { x: 0 }, style: { zIndex: 1 }, transition: coveredPageTransition };
    if (screenName === 'notifications') {
      return {
        initial: { boxShadow: coveringPageShadow },
        animate: { x: screenPushDistance, boxShadow: restingPageShadow },
        style: { zIndex: 2 },
        transition: screenPushShadowTransition,
      };
    }
  }

  if (transitionKind === 'notifications-to-comment') {
    if (screenName === 'notifications') return { animate: { x: coveredPageOffset }, style: { zIndex: 1 }, transition: coveredPageTransition };
    if (screenName === 'comment') {
      return {
        initial: { x: screenPushDistance, boxShadow: coveringPageShadow },
        animate: { x: 0, boxShadow: restingPageShadow },
        style: { zIndex: 2 },
        transition: screenPushShadowTransition,
      };
    }
  }

  if (transitionKind === 'comment-to-notifications') {
    if (screenName === 'notifications') return { animate: { x: 0 }, style: { zIndex: 1 }, transition: coveredPageTransition };
    if (screenName === 'comment') {
      return {
        initial: { boxShadow: coveringPageShadow },
        animate: { x: screenPushDistance, boxShadow: restingPageShadow },
        style: { zIndex: 2 },
        transition: screenPushShadowTransition,
      };
    }
  }

  if (transitionKind === 'letter-to-home') {
    if (screenName === 'home') return { animate: { x: 0 }, style: { zIndex: 1 }, transition: coveredPageTransition };
    if (screenName === 'letter') {
      return {
        initial: { boxShadow: coveringPageShadow },
        animate: { x: screenPushDistance, boxShadow: restingPageShadow },
        style: { zIndex: 2 },
        transition: screenPushShadowTransition,
      };
    }
  }

  if (transitionKind === 'comment-to-list') {
    if (screenName === 'list') return { animate: { x: 0 }, style: { zIndex: 1 }, transition: coveredPageTransition };
    if (screenName === 'comment') {
      return {
        initial: { boxShadow: coveringPageShadow },
        animate: { x: screenPushDistance, boxShadow: restingPageShadow },
        style: { zIndex: 2 },
        transition: screenPushShadowTransition,
      };
    }
  }

  if (transitionKind === 'list-to-edit' || transitionKind === 'comment-to-edit') {
    if (screenName === 'list' || screenName === 'comment') return { animate: { x: coveredPageOffset }, style: { zIndex: 1 }, transition: coveredPageTransition };
    if (screenName === 'edit') {
      return {
        initial: { x: screenPushDistance, boxShadow: coveringPageShadow },
        animate: { x: 0, boxShadow: restingPageShadow },
        style: { zIndex: 2 },
        transition: screenPushShadowTransition,
      };
    }
  }

  if (transitionKind === 'edit-to-list' || transitionKind === 'edit-to-comment') {
    if (screenName === 'list' || screenName === 'comment') return { animate: { x: 0 }, style: { zIndex: 1 }, transition: coveredPageTransition };
    if (screenName === 'edit') {
      return {
        initial: { boxShadow: coveringPageShadow },
        animate: { x: screenPushDistance, boxShadow: restingPageShadow },
        style: { zIndex: 2 },
        transition: screenPushShadowTransition,
      };
    }
  }

  return { animate: { x: active ? 0 : screenPushDistance }, style: { zIndex: active ? 2 : 1 }, transition: { duration: 0 } };
}

function CoveredPageDim({ visible = false }) {
  return (
    <motion.span
      className="page-dim"
      aria-hidden="true"
      initial={false}
      animate={{ opacity: visible ? 0.18 : 0 }}
      transition={screenPushTransition}
    />
  );
}

function PushPrompt({ permission = 'default', isSupported = true, isConfigured = true, onEnable, onDismiss, isSaving = false }) {
  const isDenied = permission === 'denied';
  const isBlocked = !isSupported || !isConfigured;
  const message = !isConfigured
    ? '알림 설정을 불러오지 못했어요.'
    : !isSupported
      ? '이 브라우저는 웹 푸시를 지원하지 않아요.'
      : isDenied
        ? '브라우저 설정에서 알림을 허용해주세요.'
        : '새 일기와 반응을 알려드릴게요.';

  return (
    <motion.section
      className="push-prompt"
      role="dialog"
      aria-label="알림 설정"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 18 }}
      transition={screenPushTransition}
    >
      <span>{message}</span>
      <div className="push-prompt-actions">
        <button className="push-prompt-secondary" type="button" onClick={onDismiss}>
          나중에
        </button>
        <button className="push-prompt-primary" type="button" onClick={isBlocked ? onDismiss : onEnable} disabled={isSaving || !isConfigured}>
          {isBlocked ? '확인' : isDenied ? '다시 확인' : '알림 켜기'}
        </button>
      </div>
    </motion.section>
  );
}

function PushStatus({ status = 'idle', permission = 'default', onRetry, isSaving = false }) {
  if (permission !== 'granted') return null;
  if (status === 'saved') return null;

  const message =
    status === 'saving'
      ? '알림 연결 중'
      : status === 'error'
        ? '알림 연결이 아직 안 됐어요.'
        : '알림 권한은 켜졌고, 연결 확인이 필요해요.';

  return (
    <motion.section
      className="push-status"
      role="status"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={screenPushTransition}
    >
      <span>{message}</span>
      <button className="push-status-button" type="button" onClick={onRetry} disabled={isSaving || status === 'saving'}>
        재연결
      </button>
    </motion.section>
  );
}

function padDatePart(value) {
  return String(value).padStart(2, '0');
}

function toDateInputValue(date) {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function dateInputToLocalDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getMonthKey(date) {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}`;
}

function addMonths(monthStart, amount) {
  return new Date(monthStart.getFullYear(), monthStart.getMonth() + amount, 1);
}

function isFutureMonth(monthStart) {
  return monthStart > initialMonthStart;
}

function buildHomeMonthPages() {
  const months = [];

  for (let offset = -24; offset <= 0; offset += 1) {
    const date = addMonths(initialMonthStart, offset);
    months.push({ key: getMonthKey(date), date });
  }

  return months;
}

function getMonthIndex(months, monthDate) {
  const monthKey = getMonthKey(monthDate);
  return Math.max(0, months.findIndex((month) => month.key === monthKey));
}

function getHomeRenderableMonthIndexes(renderedMonthIndex, monthCount, activeMonthIndex = renderedMonthIndex) {
  const indexes = new Set();
  const firstIndex = Math.max(0, renderedMonthIndex - 1);
  const lastIndex = Math.min(monthCount - 1, renderedMonthIndex + 1);

  for (let index = firstIndex; index <= lastIndex; index += 1) {
    indexes.add(index);
  }

  if (activeMonthIndex >= 0 && activeMonthIndex < monthCount) {
    indexes.add(activeMonthIndex);
  }

  return indexes;
}

function getMonthLastDay(monthStart) {
  return new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
}

function buildMonthWeeks(monthStart) {
  const monthNumber = monthStart.getMonth() + 1;
  if (monthStart > todayStart) return [];

  const lastDay = getMonthLastDay(monthStart);
  const isInitialMonth = getMonthKey(monthStart) === getMonthKey(initialMonthStart);
  const lastStartDay = isInitialMonth ? Math.floor((today.getDate() - 1) / 7) * 7 + 1 : lastDay;
  const weeks = [];

  for (let startDay = 1, index = 0; startDay <= lastStartDay; startDay += 7, index += 1) {
    const endDay = Math.min(startDay + 6, lastDay);
    const startDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), startDay);
    if (startDate > todayStart) break;

    weeks.push({
      id: `week-${toDateInputValue(startDate)}`,
      range: `${monthNumber}월 ${startDay}일 - ${endDay}일`,
      label: weekLabels[index] || `${index + 1}번째 주`,
      startDate: toDateInputValue(startDate),
      endDate: toDateInputValue(new Date(monthStart.getFullYear(), monthStart.getMonth(), endDay)),
      isFuture: false,
      photos: [],
    });
  }

  return weeks;
}

const initialWeeks = buildMonthWeeks(initialMonthStart);

function getInitialMonthDate(day) {
  return toDateInputValue(new Date(initialMonthStart.getFullYear(), initialMonthStart.getMonth(), day));
}

const sampleEntries = [
  {
    id: 'sample-week-1-a',
    weekId: getWeekIdForDate(getInitialMonthDate(6)),
    date: getInitialMonthDate(6),
    dateLabel: formatDateLabel(getInitialMonthDate(6)),
    weekday: formatWeekday(getInitialMonthDate(6)),
    nickname: '{nickname}',
    photos: [
      { id: 'sample-couple', src: assets.photos.couple },
      { id: 'sample-water', src: assets.photos.water },
      { id: 'sample-standing', src: assets.photos.standing },
      { id: 'sample-food', src: assets.photos.food },
    ],
    text: '{여기에 일기 내용을 적으면 된다. 여기에 일기 내용을 적으면 된다. 여기에 일기 내용을 적으면 된다. 여기에 일기 내용을 적으면 된다. 여기에 일기 내용을 적으면 된다. 여기에 일기 내용을 적으면 된다.}',
    location: '건대입구',
    liked: true,
    likeCount: 1,
    commentCount: 1,
    comments: [{ id: 'sample-comment-1', nickname: '정정욱', text: '좋았던 하루!', liked: false, likeCount: 0 }],
  },
  {
    id: 'sample-week-2-a',
    weekId: getWeekIdForDate(getInitialMonthDate(12)),
    date: getInitialMonthDate(12),
    dateLabel: formatDateLabel(getInitialMonthDate(12)),
    weekday: formatWeekday(getInitialMonthDate(12)),
    nickname: currentMemberNickname,
    photos: [
      { id: 'sample-food-2', src: assets.photos.food },
      { id: 'sample-water-2', src: assets.photos.water },
    ],
    text: '혜민이가 귀엽게 나타났다. 혜민이가 귀엽게 나타났다. 혜민이가 귀엽게 나타났다. 혜민이가 귀엽게 나타났다.',
    location: '건대입구',
    liked: false,
    likeCount: 0,
    commentCount: 0,
    comments: [],
  },
];

const anniversaryLetterParagraphs = [
  '안녕 혜민아 ㅎㅎ 이것저것 고맙고, 사랑하는 마음이 뒤엉켜서 어떤 말부터 해야할 지 고르기가 어렵네 ㅎ. 혜민이에게 표현하고 싶은 사랑과 또 고마운 점이 정말 많거든.',
  '난 처음 100일은 혜민이의 이쁜 얼굴을 보면서 설렜다면, 그 이후에 나에게 새로 생긴 설렘은 혜민이의 이쁜 마음이였던 것 같아. 혜민이는 너무 따뜻&솔직하고 또 매순간 지혜로운 사람이어서 처음으로 이런 사람과 결혼하면 정말 행복하게 잘 살 수 있을 것 같다는 감정을 배웠어. 이 감정은 마치 내가 비혼주의자였어도 혜민이를 만났다면 결혼을 생각해보지 않을까 하는 크기였거든. 요즘은 혜민이 덕분에 안정적이고 든든한 마음이 들어서, 불안정한 상황 속에서도 행복하게 살고 있다고 느껴.',
  '그래서인지 내가 혜민이에게 가장 고마운 건, 내가 정말 사랑하는 사람이 나만큼이나 사랑해준다는 사실 같아. 절대 당연하지 않다고 생각하거든. 어떤 평행우주에서는 내가 이렇게 좋은 사람이라고 생각하는 김혜민이 내가 전혀 취향이 아닌 세계도 있는 거 잖아. 정말 생각만 해도 무섭고 끔찍하다ㅜ. 근데 기적같이 김혜민이 나만큼이나 나를 사랑해주고 표현해주어서 너무 행복하고 고마운 마음이야. 앞으로도 혜민이가 나한테 표현해주는 사랑을 절대 당연하다고 여기지 않고, 감사하다고 느끼면서 혜민이한테 되돌려줄게!',
  '그러니까 말이야 혹시 종종 우리 관계에 불안한 마음이 든다면, 언제든 주저하지 않고 나에게 이야기를 꺼내주면 좋겠어. 적어도 우리 둘의 관계에서는 혜민이가 외로움을 느끼지 않았으면 좋겠어. 어떤 이유이든 혜민이가 그렇게 느꼈다고 이야기해주면 같이 울고 같이 해결할게. 그러니까 꼭 나한테 말해줘 알겠지! 우리처럼 정말 잘 맞기도 어렵다고 생각하지만 그 와중에도 분명 혜민이랑 나랑 다른 점도 있고 좀처럼 좁혀지지 않는 취향 같은 것들도 있다고 느껴. 하지만 그것도 혜민이와의 관계보다 우선하지 않으니까, 항상 나한테 우리 관계에 부정적인 감정이 든다면 혼자 힘들어하지말고 나랑 나누어주면 좋겠어. 내가 해결할텐까 ㅎ',
  '내가 꼭 1주년에는 아보카도 완성해서 선물하고 싶어서 한 일주일 정말 틈틈히 만들고 썸원에서 아보카도로 열심히 옮겼어. 근데 그러면서 우리가 데이트한 날들 하루하루 보는데 정말 소중하고, 아름답더라고 ㅎㅎ. 더 사진으로 많이 남기고 기록해야 겠다는 마음이 들었어.',
  '우리 앞으로 1년은 더 재미있고 인상 깊은 일들을 많이 만들자! 혜민이가 좋아하는 2박 3일 펜션 여행도 더 자주 가고, 아무도 우리를 모르는 해외로 떠나서 거리에서 뽀뽀도 해보자!ㅎㅋ킄 2026년 7월 1일부터 2027년 7월 1일까지는 지금까지의 1년과는 완전 다른 상황일 것 같아서 더 기대되는 것 같아. 서로 적절히 자리도 잡았을테고 둘다 일정한 수입이 있다면 더 이것저것 해보고 싶은 게 많다 나는 ㅎ. 예를 들면 혜민이랑 잔나비, 검정치마 콘서트도 가고 싶고, 제주도 가서 펜션에서 차빌려서 여기저기 돌아다녀도 보고 싶고 그래.',
  '내가 저번 편지에서 3년은 내가 책임지고 가겠다고 말했는데, 1년 2년 3년이 무색할 정도로 재밌고 행복한 시간이 될 수 있게 노력할게.',
  '마음의 변화는 당연히 없고 그때와 다른게 있다면 조금 더 큰 확신이 생겼어 ㅎ',
  '1년 동안 덕분에 너무 행복하고 풍족한 마음이 들었어. 고맙고 너무너무 사랑해 김혜민!!',
  '앞으로 1년도 잘 부탁해.',
];

function getPhotoSrc(photo) {
  if (!photo) return '';
  if (typeof photo === 'string') return assets.photos[photo] || photo;
  return photo.src || photo.image_url || photo.publicUrl || '';
}

function getPhotoStoragePath(photo) {
  if (!photo || typeof photo === 'string') return '';
  return photo.storagePath || photo.storage_path || '';
}

function isCoverPhoto(photo) {
  if (!photo || typeof photo === 'string') return false;
  return Boolean(photo.isCover || photo.is_cover);
}

function normalizePhotoCoverFlags(photos, coverPhotoId = '') {
  const limitedPhotos = (photos || []).slice(0, maxUploadPhotos);
  const selectedCoverId = coverPhotoId || limitedPhotos.find(isCoverPhoto)?.id || '';
  return limitedPhotos.map((photo) => ({
    ...photo,
    isCover: Boolean(selectedCoverId && photo.id === selectedCoverId),
    is_cover: Boolean(selectedCoverId && photo.id === selectedCoverId),
  }));
}

function getEntryCoverPhoto(entry) {
  const photos = entry?.photos || [];
  return photos.find(isCoverPhoto) || photos[0];
}

function getOptimizedPhotoSrc(photo, transform) {
  const originalSrc = getPhotoSrc(photo);
  const storagePath = getPhotoStoragePath(photo);
  if (!useStorageImageTransforms || !hasSupabaseConfig || !supabase || !storagePath || !transform) return originalSrc;

  const { data } = supabase.storage.from(storageBucket).getPublicUrl(storagePath, { transform });
  return data?.publicUrl || originalSrc;
}

function isSupabaseUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '');
}

const localEntriesStorageKey = 'avocadoo.diary.entries.v1';

function toStorableEntry(entry) {
  return {
    ...entry,
    photos: (entry.photos || []).map((photo) => ({
      id: photo.id,
      src: getPhotoSrc(photo),
      storagePath: photo.storagePath || photo.storage_path || '',
      storage_path: photo.storagePath || photo.storage_path || '',
      sortOrder: photo.sortOrder ?? photo.sort_order,
      sort_order: photo.sortOrder ?? photo.sort_order,
      isCover: isCoverPhoto(photo),
      is_cover: isCoverPhoto(photo),
    })),
    comments: entry.comments || [],
  };
}

function readLocalEntries() {
  if (typeof window === 'undefined') return sortEntriesByDate(sampleEntries);

  try {
    const stored = window.localStorage.getItem(localEntriesStorageKey);
    if (!stored) return sortEntriesByDate(sampleEntries);
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return sortEntriesByDate(sampleEntries);
    return sortEntriesByDate(parsed);
  } catch {
    return sortEntriesByDate(sampleEntries);
  }
}

function writeLocalEntries(entries) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(localEntriesStorageKey, JSON.stringify(entries.map(toStorableEntry)));
  } catch {
    // Ignore quota/private-mode failures; Supabase remains the source of truth when configured.
  }
}

function readWeeklySummaryCache() {
  if (typeof window === 'undefined') return {};

  try {
    const stored = window.localStorage.getItem(weeklySummaryStorageKey);
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeWeeklySummaryCache(cache) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(weeklySummaryStorageKey, JSON.stringify(cache));
  } catch {
    // Summary cache is only an optimization. The default labels remain available.
  }
}

function getWeekSummarySignature(weekEntries) {
  return JSON.stringify(
    sortEntriesByDateAscending(weekEntries).map((entry) => ({
      id: entry.id,
      date: entry.date,
      location: entry.location || '',
      text: entry.text || '',
      photoCount: entry.photos?.length || 0,
      commentCount: entry.commentCount || entry.comments?.length || 0,
      likeCount: entry.likeCount || 0,
    }))
  );
}

function toWeeklySummaryPayload(entry) {
  return {
    id: entry.id,
    date: entry.date,
    weekday: entry.weekday || formatWeekday(entry.date),
    nickname: entry.nickname || '',
    location: entry.location || '',
    text: entry.text || '',
    photoCount: entry.photos?.length || 0,
    commentCount: entry.commentCount || entry.comments?.length || 0,
    likeCount: entry.likeCount || 0,
  };
}

function buildWeeklySummaryRequest(monthDate, entries) {
  const weeks = buildMonthWeeks(monthDate);
  const monthEntries = entries.filter((entry) => getMonthKeyForDate(entry.date) === getMonthKey(monthDate));

  return weeks
    .map((week) => {
      const weekEntries = sortEntriesByDateAscending(monthEntries.filter((entry) => entry.weekId === week.id));
      return {
        id: week.id,
        range: week.range,
        endDate: week.endDate,
        signature: getWeekSummarySignature(weekEntries),
        entries: weekEntries.map(toWeeklySummaryPayload),
      };
    })
    .filter((week) => {
      const weekEndDate = dateInputToLocalDate(week.endDate);
      return week.entries.length > 0 && weekEndDate && weekEndDate < todayStart;
    });
}

async function fetchWeeklySummaries(monthDate, entries) {
  if (!hasSupabaseConfig || !supabase?.functions?.invoke) return {};

  const monthKey = getMonthKey(monthDate);
  const weeks = buildWeeklySummaryRequest(monthDate, entries);
  if (weeks.length === 0) return {};

  const { data, error } = await supabase.functions.invoke(weeklySummaryFunctionName, {
    body: {
      spaceId: coupleSpaceId,
      monthKey,
      weeks: weeks.map(({ id, range, endDate, signature, entries: weekEntries }) => ({ id, range, endDate, signature, entries: weekEntries })),
    },
  });

  if (error) throw error;

  const summaries = data?.summaries;
  if (!summaries || typeof summaries !== 'object') return {};

  return weeks.reduce((nextSummaries, week) => {
    const label = String(summaries[week.id] || '').trim();
    if (label) nextSummaries[week.id] = { label, signature: week.signature };
    return nextSummaries;
  }, {});
}

function isWebPushSupported() {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function urlBase64ToUint8Array(base64String) {
  const normalizedBase64String = base64String.trim();
  const padding = '='.repeat((4 - (normalizedBase64String.length % 4)) % 4);
  const base64 = `${normalizedBase64String}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);

  const bytes = Uint8Array.from([...rawData].map((character) => character.charCodeAt(0)));
  return bytes.buffer;
}

function getWebPushApplicationServerKey() {
  if (!webPushVapidPublicKey || placeholderVapidPublicKeys.has(webPushVapidPublicKey)) return null;

  try {
    const applicationServerKey = urlBase64ToUint8Array(webPushVapidPublicKey);
    const bytes = new Uint8Array(applicationServerKey);
    return bytes.length === 65 && bytes[0] === 4 ? applicationServerKey : null;
  } catch {
    return null;
  }
}

function isWebPushConfigured() {
  return hasSupabaseConfig && Boolean(getWebPushApplicationServerKey());
}

function arrayBufferEquals(left, right) {
  if (!left || !right) return false;
  const leftBytes = new Uint8Array(left);
  const rightBytes = new Uint8Array(right);
  if (leftBytes.length !== rightBytes.length) return false;
  return leftBytes.every((byte, index) => byte === rightBytes[index]);
}

async function getValidPushSubscription(registration, applicationServerKey, forceRefresh = false) {
  const existingSubscription = await registration.pushManager.getSubscription();
  if (!existingSubscription) return null;

  if (forceRefresh) {
    await existingSubscription.unsubscribe();
    return null;
  }

  const existingApplicationServerKey = existingSubscription.options?.applicationServerKey;
  if (existingApplicationServerKey && arrayBufferEquals(existingApplicationServerKey, applicationServerKey)) {
    return existingSubscription;
  }

  await existingSubscription.unsubscribe();
  return null;
}

async function savePushSubscription(subscription, memberId = currentMemberId) {
  if (!hasSupabaseConfig || !subscription) return;

  const subscriptionJson = subscription.toJSON();
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        member_id: memberId,
        endpoint: subscriptionJson.endpoint,
        p256dh: subscriptionJson.keys?.p256dh,
        auth: subscriptionJson.keys?.auth,
        user_agent: navigator.userAgent,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    );

  if (error) throw error;
}

async function subscribeToWebPush(memberId = currentMemberId, { forceRefresh = false } = {}) {
  const applicationServerKey = getWebPushApplicationServerKey();
  if (!hasSupabaseConfig || !applicationServerKey || !isWebPushSupported()) return 'unsupported';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission;

  const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
    scope: import.meta.env.BASE_URL,
  });
  await registration.update();

  const readyRegistration = await navigator.serviceWorker.ready;
  const existingSubscription = await getValidPushSubscription(readyRegistration, applicationServerKey, forceRefresh);
  const subscription =
    existingSubscription ||
    (await readyRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    }));

  await savePushSubscription(subscription, memberId);
  return 'granted';
}

async function notifyWebPush(eventType, payload, actorMemberId = currentMemberId) {
  if (!hasSupabaseConfig) return;

  const { error } = await supabase.functions.invoke('send-web-push', {
    body: {
      eventType,
      actorMemberId,
      ...payload,
    },
  });

  if (error) {
    console.warn('Web push notification failed', error);
  }
}

function normalizeSelectedNickname(nickname) {
  if (memberNicknames.includes(nickname)) return nickname;
  if (memberNicknames.includes(currentMemberNickname)) return currentMemberNickname;
  return memberNicknames[1];
}

function getPartnerNickname(nickname) {
  const selected = normalizeSelectedNickname(nickname);
  return memberNicknames.find((memberNickname) => memberNickname !== selected) || selected;
}

function getMemberIdForNickname(nickname) {
  const normalizedNickname = normalizeSelectedNickname(nickname);
  if (normalizedNickname === normalizeSelectedNickname(currentMemberNickname)) return currentMemberId;
  return seededMemberIdsByNickname[normalizedNickname] || currentMemberId;
}

function getNicknameForMemberId(memberId) {
  const normalizedCurrentNickname = normalizeSelectedNickname(currentMemberNickname);
  if (memberId === currentMemberId) return normalizedCurrentNickname;

  const seededNickname = memberNicknames.find((nickname) => seededMemberIdsByNickname[nickname] === memberId);
  return seededNickname || normalizedCurrentNickname;
}

function getMemberPairForNickname(nickname) {
  const selectedNickname = normalizeSelectedNickname(nickname);
  const partnerNickname = getPartnerNickname(selectedNickname);

  return {
    selectedNickname,
    selectedMemberId: getMemberIdForNickname(selectedNickname),
    partnerNickname,
    partnerMemberId: getMemberIdForNickname(partnerNickname),
  };
}

function getMemberAvatarSrc(nickname) {
  return normalizeSelectedNickname(nickname) === '혜민민' ? assets.avatarHemin : assets.avatarJeongNeutral;
}

function readSelectedNickname() {
  if (typeof window === 'undefined') return normalizeSelectedNickname(currentMemberNickname);

  try {
    return normalizeSelectedNickname(window.localStorage.getItem(selectedNicknameStorageKey));
  } catch {
    return normalizeSelectedNickname(currentMemberNickname);
  }
}

function writeSelectedNickname(nickname) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(selectedNicknameStorageKey, normalizeSelectedNickname(nickname));
  } catch {
    // Ignore storage failures; the in-memory selection still applies for this session.
  }
}

function getNotificationReadStorageId(memberId) {
  return `${notificationReadStorageKey}.${memberId || currentMemberId}`;
}

function readNotificationReadAt(memberId = currentMemberId) {
  if (typeof window === 'undefined') return '';

  try {
    return window.localStorage.getItem(getNotificationReadStorageId(memberId)) || '';
  } catch {
    return '';
  }
}

function writeNotificationReadAt(memberId = currentMemberId, value = new Date().toISOString()) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(getNotificationReadStorageId(memberId), value);
  } catch {
    // Ignore storage failures; the red dot can recover on the next read.
  }
}

function readCommentEmojiReactions() {
  if (typeof window === 'undefined') return {};

  try {
    const stored = window.localStorage.getItem(commentEmojiReactionsStorageKey);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function writeCommentEmojiReactions(reactionsByComment) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(commentEmojiReactionsStorageKey, JSON.stringify(reactionsByComment));
  } catch {
    // Emoji reactions are decorative; ignore storage failures.
  }
}

function normalizeCommentEmojiReaction(value) {
  if (typeof value === 'number') {
    return { count: value, selectedBy: [] };
  }

  if (!value || typeof value !== 'object') {
    return { count: 0, selectedBy: [] };
  }

  const count = Number.isFinite(value.count) ? Math.max(0, value.count) : 0;
  const selectedBy = Array.isArray(value.selectedBy) ? value.selectedBy.map(normalizeSelectedNickname) : [];
  return { count, selectedBy: Array.from(new Set(selectedBy)) };
}

function addCommentEmojiReactionValue(reaction, nickname) {
  const normalized = normalizeCommentEmojiReaction(reaction);
  const normalizedNickname = normalizeSelectedNickname(nickname);
  if (!normalizedNickname || normalized.selectedBy.includes(normalizedNickname)) return normalized;

  return {
    count: normalized.count + 1,
    selectedBy: [...normalized.selectedBy, normalizedNickname],
  };
}

function removeCommentEmojiReactionValue(reaction, nickname) {
  const normalized = normalizeCommentEmojiReaction(reaction);
  const normalizedNickname = normalizeSelectedNickname(nickname);
  if (!normalizedNickname || !normalized.selectedBy.includes(normalizedNickname)) return normalized;

  return {
    count: Math.max(0, normalized.count - 1),
    selectedBy: normalized.selectedBy.filter((selectedNickname) => selectedNickname !== normalizedNickname),
  };
}

function setCommentEmojiReactionValue(reactionsByComment, commentId, emojiId, reaction) {
  const normalized = normalizeCommentEmojiReaction(reaction);
  const next = { ...reactionsByComment };
  const nextCommentReactions = { ...(next[commentId] || {}) };

  if (normalized.count > 0) {
    nextCommentReactions[emojiId] = normalized;
  } else {
    delete nextCommentReactions[emojiId];
  }

  if (Object.keys(nextCommentReactions).length > 0) {
    next[commentId] = nextCommentReactions;
  } else {
    delete next[commentId];
  }

  return next;
}

function mapCommentEmojiReactionRows(rows, membersById = new Map()) {
  return (rows || []).reduce((reactionsByComment, row) => {
    const commentId = row.comment_id;
    const emojiId = row.emoji_id;
    const nickname = membersById.get(row.member_id) || getNicknameForMemberId(row.member_id);
    if (!commentId || !emojiId || !nickname) return reactionsByComment;

    const currentReaction = reactionsByComment[commentId]?.[emojiId];
    const nextReaction = addCommentEmojiReactionValue(currentReaction, nickname);
    return setCommentEmojiReactionValue(reactionsByComment, commentId, emojiId, nextReaction);
  }, {});
}

function createPhotoPreviewUrl(file) {
  return URL.createObjectURL(file);
}

function revokePhotoPreviewUrls(photos) {
  photos.forEach((photo) => {
    if (photo?.file && photo.src?.startsWith('blob:')) URL.revokeObjectURL(photo.src);
  });
}

function replaceFileExtension(fileName, extension) {
  const baseName = fileName.replace(/\.[^.]+$/, '');
  return `${baseName || 'photo'}.${extension}`;
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

async function compressPhotoForUpload(file) {
  if (typeof window === 'undefined' || !file?.type?.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') {
    return file;
  }

  const imageUrl = URL.createObjectURL(file);
  const image = new Image();

  try {
    image.src = imageUrl;
    await image.decode();

    const scale = Math.min(1, uploadPhotoMaxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return file;

    context.drawImage(image, 0, 0, width, height);
    const blob = await canvasToBlob(canvas, 'image/jpeg', uploadPhotoQuality);
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], replaceFileExtension(file.name, 'jpg'), {
      type: blob.type,
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function formatDateLabel(value) {
  if (!value) return '날짜 없음';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function formatWeekday(value) {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  return ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'][date.getDay()];
}

function formatCommentCreatedAt(value) {
  if (!value) return '';

  const createdAt = new Date(value);
  const createdAtTime = createdAt.getTime();
  if (Number.isNaN(createdAtTime)) return '';

  const diffMs = Date.now() - createdAtTime;
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMinutes < 60) return `${diffMinutes}분 전`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;

  return `${createdAt.getMonth() + 1}월 ${createdAt.getDate()}일`;
}

function getWeekIdForDate(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  const weekStartDay = Math.floor((date.getDate() - 1) / 7) * 7 + 1;
  return `week-${toDateInputValue(new Date(date.getFullYear(), date.getMonth(), weekStartDay))}`;
}

function getDeepLinkedEntryId() {
  if (typeof window === 'undefined') return '';

  return new URLSearchParams(window.location.search).get('entry') || '';
}

function getDeepLinkedCommentId() {
  if (typeof window === 'undefined') return '';

  return new URLSearchParams(window.location.search).get('comment') || '';
}

function getDeepLinkedMonthKey() {
  if (typeof window === 'undefined') return '';

  return new URLSearchParams(window.location.search).get('month') || '';
}

function getMonthStartForDate(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return initialMonthStart;

  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthStartForMonthKey(value) {
  if (!/^\d{4}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}-01T00:00:00`);
  if (Number.isNaN(date.getTime()) || getMonthKey(date) !== value) return null;
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getInitialHomeMonth() {
  const linkedMonth = getMonthStartForMonthKey(getDeepLinkedMonthKey());
  if (!linkedMonth || isFutureMonth(linkedMonth)) return initialMonthStart;
  return linkedMonth;
}

function getMonthKeyForDate(value) {
  return getMonthKey(getMonthStartForDate(value));
}

function getMonthDateRange(monthStart) {
  return {
    start: toDateInputValue(new Date(monthStart.getFullYear(), monthStart.getMonth(), 1)),
    end: toDateInputValue(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1)),
  };
}

function normalizeSticker(sticker, fallbackId = '') {
  const option = stickerOptions.find((item) => item.id === sticker?.type) || stickerOptions[1];
  const normalized = {
    id: sticker?.id || fallbackId || crypto.randomUUID(),
    type: option.id,
    x: Number.isFinite(sticker?.x) ? sticker.x : 226,
    y: Number.isFinite(sticker?.y) ? sticker.y : defaultStickerPosition.y,
    coordinateSpace: sticker?.coordinateSpace === 'month-content' ? 'month-content' : 'viewport',
    scale: Number.isFinite(sticker?.scale) ? Math.min(Math.max(sticker.scale, stickerScaleLimit.min), stickerScaleLimit.max) : defaultStickerPosition.scale,
    rotation: Number.isFinite(sticker?.rotation) ? sticker.rotation : defaultStickerPosition.rotation,
    createdAt: sticker?.createdAt || sticker?.created_at || '',
    createdBy: sticker?.createdBy || sticker?.created_by || '',
    createdByNickname: sticker?.createdByNickname || sticker?.created_by_nickname || '',
  };
  if (sticker?.settleFrom) normalized.settleFrom = sticker.settleFrom;
  return normalized;
}

function toMonthContentSticker(sticker) {
  const normalizedSticker = normalizeSticker(sticker);
  if (normalizedSticker.coordinateSpace === 'month-content') return normalizedSticker;

  return {
    ...normalizedSticker,
    y: normalizedSticker.y - homeWeekListTop,
    coordinateSpace: 'month-content',
  };
}

function isSameSticker(a, b) {
  if (!a || !b) return false;
  return (
    a.type === b.type &&
    a.x === b.x &&
    a.y === b.y &&
    a.coordinateSpace === b.coordinateSpace &&
    a.scale === b.scale &&
    a.rotation === b.rotation
  );
}

function createDefaultSticker(type = 'cloud', viewportWidth = defaultScreenPushDistance) {
  return normalizeSticker({
    id: crypto.randomUUID(),
    type,
    x: Math.max(28, Math.min(viewportWidth - stickerBaseSize - 28, Math.round(viewportWidth * defaultStickerPosition.xRatio))),
    y: defaultStickerPosition.y - homeWeekListTop,
    coordinateSpace: 'month-content',
    scale: defaultStickerPosition.scale,
    rotation: defaultStickerPosition.rotation,
  });
}

function readLocalStickers() {
  if (typeof window === 'undefined') return {};

  try {
    const stored = window.localStorage.getItem(stickerStorageKey);
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed).map(([monthKey, stickers]) => [
        monthKey,
        Array.isArray(stickers)
          ? stickers
            .filter((sticker) => stickerOptionIds.has(sticker?.type))
            .map((sticker, index) => normalizeSticker(sticker, `${monthKey}-${index}`))
          : [],
      ])
    );
  } catch {
    return {};
  }
}

function normalizeStickersByMonth(rows) {
  return Object.fromEntries(
    (rows || []).map((row) => [
      row.month_key,
      Array.isArray(row.stickers)
        ? row.stickers.filter((sticker) => stickerOptionIds.has(sticker?.type)).map((sticker, index) => {
          const normalizedSticker = normalizeSticker(sticker, `${row.month_key}-${index}`);
          return {
            ...normalizedSticker,
            createdAt: normalizedSticker.createdAt || row.updated_at || '',
            createdBy: normalizedSticker.createdBy || row.updated_by || '',
            createdByNickname: normalizedSticker.createdByNickname || (row.updated_by ? getNicknameForMemberId(row.updated_by) : ''),
          };
        })
        : [],
    ])
  );
}

function writeLocalStickers(stickersByMonth) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(stickerStorageKey, JSON.stringify(stickersByMonth));
  } catch {
    // Sticker state is decorative; ignore storage failures.
  }
}

function getStickerSrc(type) {
  return stickerOptions.find((item) => item.id === type)?.src || stickerOptions[1].src;
}

function getWeekForEntry(entry, entries) {
  const monthStart = getMonthStartForDate(entry.date);
  const monthWeeks = applyEntriesToWeeks(buildMonthWeeks(monthStart), entries);

  return monthWeeks.find((week) => week.id === entry.weekId) || monthWeeks.find((week) => week.id === getWeekIdForDate(entry.date)) || {
    id: entry.weekId || getWeekIdForDate(entry.date),
    range: formatDateLabel(entry.date),
    label: formatWeekday(entry.date),
    startDate: entry.date,
    endDate: entry.date,
    isFuture: false,
    photos: entry.photos || [],
  };
}

function getNotificationTimeValue(value, fallback = '') {
  const time = new Date(value || fallback || 0).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function formatNotificationTime(value) {
  const date = new Date(value);
  const time = date.getTime();
  if (Number.isNaN(time)) return '';

  const diffMs = Date.now() - time;
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (diffMs < minuteMs) return '방금';
  if (diffMs < hourMs) return `${Math.floor(diffMs / minuteMs)}분 전`;
  if (diffMs < dayMs) return `${Math.floor(diffMs / hourMs)}시간 전`;
  if (diffMs < 7 * dayMs) return `${Math.floor(diffMs / dayMs)}일 전`;
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function getMonthKeyNotificationLabel(monthKey) {
  const [year, month] = String(monthKey || '').split('-');
  if (!year || !month) return '홈';
  return `${Number(month)}월`;
}

function getNotificationNickname(nickname, memberId = '') {
  if (memberNicknames.includes(nickname)) return nickname;
  if (memberId) return getNicknameForMemberId(memberId);
  return normalizeSelectedNickname(currentMemberNickname);
}

function buildNotifications(entries, currentNickname = currentMemberNickname, stickersByMonth = {}) {
  const notifications = [];
  const retentionCutoff = Date.now() - notificationRetentionDays * 24 * 60 * 60 * 1000;
  const currentNotificationNickname = normalizeSelectedNickname(currentNickname);
  const isPartnerActivity = (nickname) => normalizeSelectedNickname(nickname) !== currentNotificationNickname;

  entries.forEach((entry) => {
    const entryCreatedAt = entry.createdAt || entry.created_at || entry.date;
    const entryTime = getNotificationTimeValue(entryCreatedAt, entry.date);
    const entryDateLabel = entry.dateLabel || formatDateLabel(entry.date);
    const entryNickname = getNotificationNickname(entry.nickname, entry.author_id || entry.authorId);

    if (memberNicknames.includes(entryNickname) && isPartnerActivity(entryNickname)) {
      notifications.push({
        id: `diary-created-${entry.id}`,
        type: 'diary_created',
        entryId: entry.id,
        title: entryNickname,
        message: `${entryDateLabel} 일기를 작성했어요.`,
        createdAt: entryCreatedAt,
        timeValue: entryTime,
      });
    }

    if (memberNicknames.includes(entryNickname) && !isPartnerActivity(entryNickname) && (entry.likeCount || 0) > 0) {
      const likeNickname = getPartnerNickname(entryNickname);
      notifications.push({
        id: `diary-liked-${entry.id}-${entry.likeCount}`,
        type: 'diary_liked',
        entryId: entry.id,
        title: likeNickname,
        message: `${entryDateLabel} 일기에 좋아요를 남겼어요.`,
        createdAt: entryCreatedAt,
        timeValue: entryTime - 1,
      });
    }

    (entry.comments || []).forEach((comment) => {
      const commentCreatedAt = comment.createdAt || comment.created_at || entryCreatedAt;
      const commentTime = getNotificationTimeValue(commentCreatedAt, entryCreatedAt);
      const commentNickname = getNotificationNickname(comment.nickname, comment.author_id || comment.authorId);

      if (memberNicknames.includes(commentNickname) && isPartnerActivity(commentNickname)) {
        notifications.push({
          id: `comment-created-${comment.id}`,
          type: 'comment_created',
          entryId: entry.id,
          commentId: comment.id,
          title: commentNickname,
          message: '댓글을 달았어요.',
          preview: comment.text || '',
          createdAt: commentCreatedAt,
          timeValue: commentTime,
        });
      }

      if (memberNicknames.includes(commentNickname) && !isPartnerActivity(commentNickname)) {
        const likedByNicknames = Array.from(new Set((comment.likedByNicknames || []).map((nickname) => getNotificationNickname(nickname))));
        likedByNicknames.forEach((nickname, index) => {
          if (!isPartnerActivity(nickname)) return;
          notifications.push({
            id: `comment-liked-${comment.id}-${nickname}`,
            type: 'comment_liked',
            entryId: entry.id,
            commentId: comment.id,
            title: nickname,
            message: '댓글에 좋아요를 남겼어요.',
            preview: comment.text || '',
            createdAt: commentCreatedAt,
            timeValue: commentTime - 1 - index,
          });
        });

        Object.entries(comment.emojiReactions || {}).forEach(([emojiId, reaction], reactionIndex) => {
          const emojiReaction = normalizeCommentEmojiReaction(reaction);
          emojiReaction.selectedBy.forEach((nickname, nicknameIndex) => {
            const reactionNickname = getNotificationNickname(nickname);
            if (!isPartnerActivity(reactionNickname)) return;
            notifications.push({
              id: `comment-emoji-reacted-${comment.id}-${emojiId}-${reactionNickname}`,
              type: 'comment_emoji_reacted',
              entryId: entry.id,
              commentId: comment.id,
              title: reactionNickname,
              message: '댓글에 이모지 반응을 남겼어요.',
              preview: comment.text || '',
              createdAt: commentCreatedAt,
              timeValue: commentTime - 10 - reactionIndex - nicknameIndex,
            });
          });
        });
      }
    });
  });

  Object.entries(stickersByMonth || {}).forEach(([monthKey, stickers]) => {
    const stickerGroups = new Map();

    (stickers || []).forEach((sticker) => {
      const createdAt = sticker.createdAt || sticker.created_at;
      const timeValue = getNotificationTimeValue(createdAt);
      if (!timeValue) return;

      const nickname = getNotificationNickname(sticker.createdByNickname || sticker.created_by_nickname, sticker.createdBy || sticker.created_by);
      if (!isPartnerActivity(nickname)) return;
      const key = `${monthKey}-${nickname}-${createdAt}`;
      const currentGroup = stickerGroups.get(key) || {
        count: 0,
        createdAt,
        monthKey,
        nickname,
        timeValue,
      };
      currentGroup.count += 1;
      stickerGroups.set(key, currentGroup);
    });

    stickerGroups.forEach((group) => {
      notifications.push({
        id: `sticker-created-${group.monthKey}-${group.nickname}-${group.createdAt}`,
        type: 'sticker_created',
        monthKey: group.monthKey,
        title: group.nickname,
        message: `${getMonthKeyNotificationLabel(group.monthKey)}에 ${group.count > 1 ? `새 스티커 ${group.count}개를` : '새로운 스티커를'} 붙였어요.`,
        createdAt: group.createdAt,
        timeValue: group.timeValue,
      });
    });
  });

  return notifications
    .filter((notification) => notification.timeValue >= retentionCutoff)
    .sort((a, b) => b.timeValue - a.timeValue);
}

function mapDiaryEntry(row, viewerMemberId = currentMemberId) {
  const entryLikes = row.diary_entry_likes || [];
  const photos = (row.diary_images || [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((image) => ({
      id: image.id,
      src: image.image_url,
      storagePath: image.storage_path,
      storage_path: image.storage_path,
      sortOrder: image.sort_order,
      sort_order: image.sort_order,
      isCover: Boolean(image.is_cover),
      is_cover: Boolean(image.is_cover),
    }));
  const comments = (row.diary_comments || [])
    .slice()
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map((comment) => {
      const commentLikes = comment.diary_comment_likes || [];
      return {
        id: comment.id,
        nickname: comment.couple_members?.nickname || getNicknameForMemberId(comment.author_id),
        text: comment.body_text,
        createdAt: comment.created_at,
        created_at: comment.created_at,
        liked: commentLikes.some((like) => like.member_id === viewerMemberId),
        likeCount: commentLikes.length,
        likedByNicknames: Array.from(new Set(commentLikes.map((like) => getNicknameForMemberId(like.member_id)))),
      };
    });

  return {
    id: row.id,
    weekId: getWeekIdForDate(row.diary_date),
    date: row.diary_date,
    dateLabel: formatDateLabel(row.diary_date),
    weekday: formatWeekday(row.diary_date),
    nickname: row.couple_members?.nickname || getNicknameForMemberId(row.author_id),
    photos: normalizePhotoCoverFlags(photos),
    text: row.body_text,
    location: row.location_text || '',
    createdAt: row.created_at,
    created_at: row.created_at,
    liked: entryLikes.some((like) => like.member_id === viewerMemberId),
    likeCount: entryLikes.length,
    commentCount: comments.length,
    comments,
  };
}

function getDefaultWeekSummaryLabel(weekEntries, summaryStatus = 'fallback') {
  if (weekEntries.length === 0) return '이번 주는 쉬어감';
  return summaryStatus === 'loading' ? '하이라이트 뽑는 중' : '하이라이트 준비 중';
}

function applyEntriesToWeeks(weeks, entries, summariesByWeek = {}) {
  return weeks.map((week) => {
    const weekEntries = sortEntriesByDate(entries.filter((entry) => entry.weekId === week.id));
    const photos = sortEntriesByDate(entries.filter((entry) => entry.weekId === week.id && entry.photos.length > 0))
      .map((entry) => getEntryCoverPhoto(entry))
      .slice(0, 4);
    const summary = summariesByWeek[week.id];
    const summaryStatus = summary?.status || 'fallback';
    const label = summary?.label || getDefaultWeekSummaryLabel(weekEntries, summaryStatus);

    return { ...week, label, photos, summaryStatus };
  });
}

function getEntryDateTime(entry) {
  const labelMatch = String(entry.dateLabel || '').match(/(\d{1,2})월\s*(\d{1,2})일/);
  if (labelMatch) {
    const weekYearMatch = String(entry.weekId || '').match(/week-(\d{4})-/);
    const year = weekYearMatch ? Number(weekYearMatch[1]) : today.getFullYear();
    return new Date(year, Number(labelMatch[1]) - 1, Number(labelMatch[2])).getTime();
  }

  const date = new Date(`${entry.date}T00:00:00`);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function sortEntriesByDate(entries) {
  return entries.slice().sort((a, b) => {
    const dateDiff = getEntryDateTime(b) - getEntryDateTime(a);
    if (dateDiff !== 0) return dateDiff;

    const aCreatedAt = new Date(a.createdAt || a.created_at || 0).getTime();
    const bCreatedAt = new Date(b.createdAt || b.created_at || 0).getTime();
    return bCreatedAt - aCreatedAt;
  });
}

function sortEntriesByDateAscending(entries) {
  return entries.slice().sort((a, b) => {
    const dateDiff = getEntryDateTime(a) - getEntryDateTime(b);
    if (dateDiff !== 0) return dateDiff;

    const aCreatedAt = new Date(a.createdAt || a.created_at || 0).getTime();
    const bCreatedAt = new Date(b.createdAt || b.created_at || 0).getTime();
    return aCreatedAt - bCreatedAt;
  });
}

function sortCommentsByCreatedAt(comments) {
  return comments.slice().sort((a, b) => {
    const aCreatedAt = new Date(a.createdAt || a.created_at || 0).getTime();
    const bCreatedAt = new Date(b.createdAt || b.created_at || 0).getTime();
    return aCreatedAt - bCreatedAt;
  });
}

function groupBy(items, getKey) {
  return items.reduce((groups, item) => {
    const key = getKey(item);
    const group = groups.get(key) || [];
    group.push(item);
    groups.set(key, group);
    return groups;
  }, new Map());
}

const loadedPhotoSrcs = new Set();

function PhotoImage({ photo, transform, eager = false }) {
  const originalSrc = getPhotoSrc(photo);
  const optimizedSrc = getOptimizedPhotoSrc(photo, transform);
  const [src, setSrc] = useState(optimizedSrc);
  const isLoaded = loadedPhotoSrcs.has(src);

  useEffect(() => {
    setSrc(optimizedSrc);
  }, [optimizedSrc]);

  return (
    <img
      src={src}
      alt=""
      loading={eager || isLoaded ? 'eager' : 'lazy'}
      decoding={eager || isLoaded ? 'sync' : 'async'}
      fetchPriority={eager || isLoaded ? 'high' : 'low'}
      onLoad={() => {
        if (src) loadedPhotoSrcs.add(src);
      }}
      onError={() => {
        if (src !== originalSrc) setSrc(originalSrc);
      }}
    />
  );
}

function ImagePolaroid({ photo, variant = 'center', add = false, compact = false, index = 0, isLast = true, coverState = '', onRemove, onSelectCover }) {
  const pressedX = index * (polaroidGap.pressed - polaroidGap.rest);
  const isCoverSelected = coverState === 'selected';
  const coverLabel = isCoverSelected ? '대표사진으로 설정됨' : '대표사진으로 설정';

  return (
    <motion.span
      className={`polaroid polaroid-${variant} ${add ? 'polaroid-add' : ''} ${isCoverSelected ? 'polaroid-cover-selected' : ''}`}
      aria-hidden={add ? 'true' : undefined}
      initial={false}
      animate={{ x: compact ? pressedX : 0 }}
      style={{ marginRight: isLast ? 0 : polaroidGap.rest }}
      transition={compact ? polaroidPressSpring : polaroidReleaseSpring}
    >
      <span className="polaroid-paper">
        {!add && onSelectCover ? (
          <span className="polaroid-cover-badge" aria-hidden="true">
            <img className="polaroid-cover-icon" src={assets.coverPhoto} alt="" />
            <span>대표</span>
          </span>
        ) : null}
        <span className="polaroid-image">
          {add ? <img className="plus-asset" src={assets.plus} alt="" /> : <PhotoImage photo={photo} transform={photoTransforms.polaroid} />}
        </span>
      </span>
      {!add && onSelectCover ? (
        <button
          className="polaroid-cover-control"
          type="button"
          aria-label={coverLabel}
          aria-pressed={isCoverSelected}
          onClick={(event) => {
            event.stopPropagation();
            onSelectCover();
          }}
        />
      ) : null}
      {!add && onRemove ? (
        <button
          className={`polaroid-remove polaroid-remove-${variant}`}
          type="button"
          aria-label="이미지 삭제"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
        >
          <img src={assets.photoDelete} alt="" />
        </button>
      ) : null}
    </motion.span>
  );
}

function PhotoStack({ onAdd, photos }) {
  const [isPressed, setIsPressed] = useState(false);
  const visible = photos.slice(0, 4);
  const releasePress = () => setIsPressed(false);
  const stackMotion = {
    className: 'week-polaroids',
    initial: false,
    animate: { scale: isPressed ? 0.98 : 1 },
    transition: isPressed ? polaroidPressSpring : polaroidReleaseSpring,
    onPointerDown: () => setIsPressed(true),
    onPointerUp: releasePress,
    onPointerCancel: releasePress,
    onPointerLeave: releasePress,
  };

  if (visible.length === 0) {
    if (!onAdd) return null;

    return (
      <motion.span {...stackMotion}>
        <span
          className="week-add-polaroid"
          role="button"
          tabIndex={0}
          aria-label="이 주에 일기 올리기"
          onClick={(event) => {
            event.stopPropagation();
            onAdd();
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            event.stopPropagation();
            onAdd();
          }}
        >
          <ImagePolaroid add />
        </span>
      </motion.span>
    );
  }

  const variants = ['center', 'right', 'left', 'center'];
  return (
    <motion.span {...stackMotion}>
      {visible.map((photo, index) => (
        <ImagePolaroid
          key={`${photo.id || getPhotoSrc(photo)}-${index}`}
          photo={photo}
          variant={variants[index]}
          compact={isPressed}
          index={index}
          isLast={index === visible.length - 1}
        />
      ))}
    </motion.span>
  );
}

function UploadButton({ className = 'floating-upload', onNavigate, reverseFromBig = false, bigWidth = uploadButtonSize.big }) {
  const [isPressed, setIsPressed] = useState(false);
  const releasePress = () => setIsPressed(false);
  const button = (
    <motion.button
      className={className}
      type="button"
      initial={reverseFromBig ? { borderRadius: uploadButtonRadius.big, width: bigWidth, y: -9.5 } : false}
      animate={{ borderRadius: uploadButtonRadius.small, scale: isPressed ? 0.97 : 1, width: uploadButtonSize.small, y: 0 }}
      transition={{ ...uploadButtonTransition, scale: isPressed ? uploadButtonPressSpring : uploadButtonReleaseSpring }}
      onPointerDown={() => setIsPressed(true)}
      onPointerUp={releasePress}
      onPointerCancel={releasePress}
      onPointerLeave={releasePress}
      onClick={() => onNavigate('upload')}
    >
      <img src={assets.upload} alt="" />
      <motion.span className="upload-button-label" initial={reverseFromBig ? { fontSize: 17 } : false} animate={{ fontSize: 16 }} transition={uploadButtonSizeSpring}>
        올리기
      </motion.span>
    </motion.button>
  );

  return <motion.span className="floating-upload-anchor">{button}</motion.span>;
}

function NotificationButton({ hasUnread = false, onClick }) {
  const [isPressed, setIsPressed] = useState(false);
  const releasePress = () => setIsPressed(false);

  return (
    <motion.button
      className="notification-button"
      type="button"
      aria-label={hasUnread ? '읽지 않은 알림 보기' : '알림함 보기'}
      initial={false}
      animate={{ scale: isPressed ? 0.94 : 1 }}
      transition={isPressed ? polaroidPressSpring : polaroidReleaseSpring}
      onPointerDown={() => setIsPressed(true)}
      onPointerUp={releasePress}
      onPointerCancel={releasePress}
      onPointerLeave={releasePress}
      onClick={onClick}
    >
      <img src={hasUnread ? assets.notificationUnread : assets.notification} alt="" />
    </motion.button>
  );
}

function HomeHeader({ monthDate, monthOptions = [], onSelectMonth, onOpenNicknamePicker, currentNickname = currentMemberNickname, hasUnreadNotifications = false, onOpenNotifications }) {
  const [isPressed, setIsPressed] = useState(false);
  const [isCouplePressed, setIsCouplePressed] = useState(false);
  const monthSelectRef = useRef(null);
  const releasePress = () => setIsPressed(false);
  const releaseCouplePress = () => setIsCouplePressed(false);
  const selectedMonthKey = getMonthKey(monthDate);
  const hasSelectedMonthOption = monthOptions.some((month) => month.key === selectedMonthKey);

  function openMonthPicker() {
    const select = monthSelectRef.current;
    if (!select) return;

    select.focus({ preventScroll: true });
    try {
      if (typeof select.showPicker === 'function') {
        select.showPicker();
      } else {
        select.click();
      }
    } catch {
      select.click();
    }
  }

  return (
    <header className="home-header">
      <motion.button
        className="month-select"
        type="button"
        initial={false}
        animate={{ scale: isPressed ? 0.98 : 1 }}
        transition={isPressed ? polaroidPressSpring : polaroidReleaseSpring}
        onPointerDown={() => setIsPressed(true)}
        onPointerUp={releasePress}
        onPointerCancel={releasePress}
        onPointerLeave={releasePress}
        onClick={openMonthPicker}
      >
        <span>{monthDate.getFullYear()}년</span>
        <strong>
          {monthDate.getMonth() + 1}월 <img src={assets.down} alt="" />
        </strong>
        <select
          ref={monthSelectRef}
          className="month-picker-input"
          value={selectedMonthKey}
          aria-label="월 선택"
          tabIndex={-1}
          onChange={(event) => onSelectMonth(event.target.value)}
        >
          {!hasSelectedMonthOption ? (
            <option value={selectedMonthKey} disabled hidden>
              {monthDate.getFullYear()}년 {monthDate.getMonth() + 1}월
            </option>
          ) : null}
          {monthOptions.map((month) => (
            <option key={month.key} value={month.key}>
              {month.date.getFullYear()}년 {month.date.getMonth() + 1}월
            </option>
          ))}
        </select>
      </motion.button>
      <div className="home-header-actions">
        <motion.button
          className="couple-state"
          type="button"
          aria-label="닉네임 선택"
          initial={false}
          animate={{ scale: isCouplePressed ? 0.94 : 1 }}
          transition={isCouplePressed ? polaroidPressSpring : polaroidReleaseSpring}
          onPointerDown={() => setIsCouplePressed(true)}
          onPointerUp={releaseCouplePress}
          onPointerCancel={releaseCouplePress}
          onPointerLeave={releaseCouplePress}
          onClick={onOpenNicknamePicker}
        >
          <img className={normalizeSelectedNickname(currentNickname) === '정정욱' ? 'couple-avatar-selected' : ''} src={assets.avatarJeongNeutral} alt="" />
          <img className={normalizeSelectedNickname(currentNickname) === '혜민민' ? 'couple-avatar-selected' : ''} src={assets.avatarHemin} alt="" />
          <span>
            <img src={assets.heartBadge} alt="" />
          </span>
        </motion.button>
        <NotificationButton hasUnread={hasUnreadNotifications} onClick={onOpenNotifications} />
      </div>
    </header>
  );
}

function NotificationInboxScreen({ active = true, notifications = [], transitionKind, screenPushDistance, onNavigate, onSelectNotification }) {
  return (
    <motion.section className="phone notification-screen" {...screenMotionProps('notifications', transitionKind, active, screenPushDistance)}>
      <img className="paper-bg" src={assets.bg} alt="" />
      <NavHeader title="알림" sub={`최근 ${notificationRetentionDays}일`} onNavigate={onNavigate} />
      <main className="notification-page-list">
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <button className="notification-item" type="button" key={notification.id} onClick={() => onSelectNotification(notification)}>
              <img className="notification-item-avatar" src={getMemberAvatarSrc(notification.title)} alt="" />
              <span className="notification-item-copy">
                <strong>{notification.title}</strong>
                <span>{notification.message}</span>
                {notification.preview ? <em>{notification.preview}</em> : null}
              </span>
              <time dateTime={notification.createdAt}>{formatNotificationTime(notification.createdAt)}</time>
            </button>
          ))
        ) : (
          <div className="notification-empty">
            <img src={assets.notification} alt="" />
            <strong>최근 알림이 없어요</strong>
            <span>최근 {notificationRetentionDays}일 안에 생긴 일기와 댓글만 모아둘게요.</span>
          </div>
        )}
      </main>
      <CoveredPageDim visible={transitionKind === 'notifications-to-comment'} />
    </motion.section>
  );
}

function HomeSticker({
  sticker,
  editable = false,
  selected = false,
  bounceKey = 0,
  bounceIndex = -1,
  bounceCount = 0,
  onChange,
  getDropResult,
  onRemove,
  onSelect,
  onReady,
  hidden = false,
}) {
  const shouldBounce = !editable && bounceKey > 0 && bounceIndex >= 0;
  const stickerPosition = { x: sticker.x, y: sticker.y };
  const canDragSticker = editable;

  return (
    <PeelableSticker
      id={sticker.id}
      src={getStickerSrc(sticker.type)}
      width={stickerBaseSize}
      height={stickerBaseSize}
      initialPosition={stickerPosition}
      scale={sticker.scale}
      disabled={!canDragSticker}
      selected={selected}
      className={`${canDragSticker ? 'home-sticker-editable' : ''} ${shouldBounce ? 'home-sticker-bounced' : ''} ${hidden ? 'home-sticker-hidden-until-ready' : ''}`}
      settleFrom={sticker.settleFrom}
      getDropResult={getDropResult}
      onReady={onReady}
      onDragStart={() => onSelect?.(sticker.id)}
      onDrop={(id, result) => {
        if (!result.accepted) return;
        onChange?.({
          ...sticker,
          x: result.position.x,
          y: result.position.y,
        });
      }}
    >
      {editable && selected ? (
        // Keep the delete control visually fixed; the old transform: `scale(${1 / Math.max(sticker.scale || 1, 0.01)})` made it grow on small stickers.
        <button
          className="home-sticker-remove"
          type="button"
          aria-label="스티커 삭제"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
        >
          <img src={assets.stickerDelete} alt="" />
        </button>
      ) : null}
    </PeelableSticker>
  );
}

const MemoizedHomeSticker = memo(HomeSticker, (previous, next) => (
  previous.editable === next.editable &&
  previous.selected === next.selected &&
  previous.bounceKey === next.bounceKey &&
  previous.bounceIndex === next.bounceIndex &&
  previous.bounceCount === next.bounceCount &&
  previous.hidden === next.hidden &&
  previous.sticker.id === next.sticker.id &&
  previous.sticker.type === next.sticker.type &&
  previous.sticker.x === next.sticker.x &&
  previous.sticker.y === next.sticker.y &&
  previous.sticker.scale === next.sticker.scale &&
  previous.sticker.rotation === next.sticker.rotation &&
  previous.sticker.settleFrom === next.sticker.settleFrom &&
  previous.onReady === next.onReady
));

function HomeStickerLayer({
  stickers = [],
  editStickers = [],
  selectedStickerId = '',
  editing = false,
  bounceKey = 0,
  bounceStickerIds = [],
  onStickerChange,
  onStickerRemove,
  onStickerSelect,
  onStickerReady,
  hiddenStickerId = '',
}) {
  const layerRef = useRef(null);
  const activePointers = useRef(new Map());
  const gesture = useRef(null);
  const visibleStickers = editing ? editStickers : stickers;
  const selectedSticker = editStickers.find((sticker) => sticker.id === selectedStickerId);
  const bounceStickerIndexes = useMemo(() => new Map(bounceStickerIds.map((id, index) => [id, index])), [bounceStickerIds]);

  function getCenter(points) {
    const total = points.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), { x: 0, y: 0 });
    return { x: total.x / points.length, y: total.y / points.length };
  }

  function getDistance(a, b) {
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  function getAngle(a, b) {
    return Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
  }

  function resetLayerGesture() {
    activePointers.current.clear();
    gesture.current = null;
  }

  function createLayerGesture(points, sticker) {
    const center = getCenter(points);
    return {
      center,
      sticker,
      distance: points.length >= 2 ? getDistance(points[0], points[1]) : 1,
      angle: points.length >= 2 ? getAngle(points[0], points[1]) : 0,
    };
  }

  function startLayerGesture(event) {
    if (!editing) return;
    if (event.pointerType === 'touch') return;
    if (event.target.closest?.('button')) return;

    event.stopPropagation();
    if (event.cancelable) event.preventDefault();

    const touchedStickerId = event.target.closest?.('.home-sticker')?.dataset?.stickerId;
    const nextSelectedSticker = editStickers.find((sticker) => sticker.id === touchedStickerId) || selectedSticker || editStickers[0];
    if (!nextSelectedSticker) return;

    if (touchedStickerId && touchedStickerId !== selectedStickerId) {
      onStickerSelect?.(touchedStickerId);
    }

    event.currentTarget.setPointerCapture?.(event.pointerId);
    activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    gesture.current = createLayerGesture([...activePointers.current.values()], nextSelectedSticker);
  }

  function updateLayerGesture(event) {
    if (!editing || !activePointers.current.has(event.pointerId) || !gesture.current) return;
    if (event.pointerType === 'touch') return;

    event.stopPropagation();
    if (event.cancelable) event.preventDefault();
    activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...activePointers.current.values()];
    const center = getCenter(points);
    const next = {
      ...gesture.current.sticker,
      x: gesture.current.sticker.x + center.x - gesture.current.center.x,
      y: gesture.current.sticker.y + center.y - gesture.current.center.y,
    };

    if (points.length >= 2) {
      const distance = getDistance(points[0], points[1]);
      const angle = getAngle(points[0], points[1]);
      next.scale = Math.min(
        Math.max(gesture.current.sticker.scale * (distance / Math.max(gesture.current.distance, 1)), stickerScaleLimit.min),
        stickerScaleLimit.max
      );
      next.rotation = gesture.current.sticker.rotation + angle - gesture.current.angle;
    }

    onStickerChange?.(next);
  }

  function finishLayerGesture(event) {
    if (!editing || !activePointers.current.has(event.pointerId)) return;
    if (event.pointerType === 'touch') return;

    event.stopPropagation();
    activePointers.current.delete(event.pointerId);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    const points = [...activePointers.current.values()];
    if (points.length === 0) {
      gesture.current = null;
      return;
    }

    const latestSticker = editStickers.find((sticker) => sticker.id === gesture.current?.sticker.id) || gesture.current?.sticker;
    if (latestSticker) gesture.current = createLayerGesture(points, latestSticker);
  }

  function getStickerDropResult({ position, size, pointer }) {
    const layer = layerRef.current;
    if (!layer) {
      return { accepted: false, position };
    }

    const layerRect = layer.getBoundingClientRect();
    const sheetRect = document.querySelector('.sticker-picker-sheet')?.getBoundingClientRect();
    const isOnSheet = sheetRect
      ? pointer.x >= sheetRect.left && pointer.x <= sheetRect.right && pointer.y >= sheetRect.top && pointer.y <= sheetRect.bottom
      : false;
    const isInsideLayer = (
      pointer.x >= layerRect.left &&
      pointer.x <= layerRect.right &&
      pointer.y >= layerRect.top &&
      pointer.y <= layerRect.bottom
    );

    if (!isInsideLayer || isOnSheet) {
      return { accepted: false, position };
    }

    return {
      accepted: true,
      targetId: 'home-month-content',
      position: {
        x: Math.min(Math.max(position.x, 8), Math.max(8, layerRect.width - size.width - 8)),
        y: Math.min(Math.max(position.y, 8), Math.max(8, layerRect.height - size.height - 8)),
      },
    };
  }

  return (
    <div
      ref={layerRef}
      className={`home-sticker-layer ${editing ? 'home-sticker-layer-editing' : ''}`}
      aria-hidden={visibleStickers.length === 0}
      onPointerDown={startLayerGesture}
      onPointerMove={updateLayerGesture}
      onPointerUp={finishLayerGesture}
      onPointerCancel={finishLayerGesture}
      onLostPointerCapture={() => {
        if (activePointers.current.size === 0) resetLayerGesture();
      }}
    >
      {visibleStickers.map((sticker) => (
        <MemoizedHomeSticker
          key={sticker.id}
          sticker={toMonthContentSticker(sticker)}
          editable={editing}
          selected={editing && selectedStickerId === sticker.id}
          bounceKey={bounceKey}
          bounceIndex={bounceStickerIndexes.has(sticker.id) ? bounceStickerIndexes.get(sticker.id) : -1}
          bounceCount={bounceStickerIds.length}
          onChange={onStickerChange}
          getDropResult={getStickerDropResult}
          onRemove={() => onStickerRemove?.(sticker.id)}
          onSelect={onStickerSelect}
          onReady={onStickerReady}
          hidden={sticker.id === hiddenStickerId}
        />
      ))}
    </div>
  );
}

function HomeMonthPage({ weeks, onSelectWeek, isRenderable = true }) {
  const weekListRef = useRef(null);
  const {
    monthKey = '',
    savedScrollTop = 0,
    stickers = [],
    editStickers = [],
    selectedStickerId = '',
    editingStickers = false,
    stickerBounceKey = 0,
    stickerBounceIds = [],
    onScrollChange,
    onStickerChange,
    onStickerRemove,
    onStickerSelect,
    onStickerReady,
    hiddenStickerId = '',
  } = arguments[0] || {};

  useLayoutEffect(() => {
    if (!isRenderable || !weekListRef.current) return;
    if (Number.isFinite(savedScrollTop) && weekListRef.current.scrollTop !== savedScrollTop) {
      weekListRef.current.scrollTo({ top: Math.max(0, savedScrollTop), behavior: 'auto' });
    }
    onScrollChange?.(monthKey, weekListRef.current.scrollTop || 0);
  }, [isRenderable, monthKey]);

  return (
    <div className="home-month-page" aria-hidden={!isRenderable}>
      {isRenderable ? (
        <>
          <div
            ref={weekListRef}
            className={`week-list ${editingStickers ? 'week-list-sticker-editing' : ''}`}
            data-month-key={monthKey}
            onScroll={(event) => onScrollChange?.(monthKey, event.currentTarget.scrollTop)}
          >
            <HomeStickerLayer
              stickers={stickers}
              editStickers={editStickers}
              selectedStickerId={selectedStickerId}
              editing={editingStickers}
              bounceKey={stickerBounceKey}
              bounceStickerIds={stickerBounceIds}
              onStickerChange={onStickerChange}
              onStickerRemove={onStickerRemove}
              onStickerSelect={onStickerSelect}
              onStickerReady={onStickerReady}
              hiddenStickerId={hiddenStickerId}
            />
            {weeks.map((week) => {
              const hasDiary = week.photos.length > 0;
              const content = (
                <>
                  <span className="week-copy">
                    <strong>{week.range}</strong>
                    <em className={week.summaryStatus === 'loading' ? 'week-summary-loading' : ''}>{week.label}</em>
                  </span>
                  <PhotoStack photos={week.photos} onAdd={week.isFuture ? undefined : () => onSelectWeek(week, 'upload', 'add-polaroid')} />
                </>
              );

              if (hasDiary) {
                return (
                  <button
                    className="week-card week-card-clickable"
                    type="button"
                    key={week.id}
                    onClick={() => onSelectWeek(week)}
                  >
                    {content}
                  </button>
                );
              }

              return (
                <article
                  className="week-card"
                  key={week.id}
                >
                  {content}
                </article>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}

function StickerPickerSheet({ onAddSticker, onDropSticker, onApply, onDismiss, readyStickerId = '' }) {
  const [activeTab, setActiveTab] = useState('all');
  const [dragSticker, setDragSticker] = useState(null);
  const dragGesture = useRef(null);
  const blockNextClick = useRef(false);
  const dragPreviewAnimationRef = useRef(null);
  const dragGlobalCleanup = useRef(null);
  const activeStickerTab = stickerTabs.find((tab) => tab.id === activeTab) || stickerTabs[0];
  const visibleStickerOptions = activeTab === 'all'
    ? stickerOptions
    : stickerOptions.filter((option) => option.category === activeTab);

  useEffect(() => () => {
    dragPreviewAnimationRef.current?.stop?.();
    dragGlobalCleanup.current?.();
  }, []);

  useLayoutEffect(() => {
    if (!readyStickerId) return;
    setDragSticker((current) => (
      current?.waitingForStickerId === readyStickerId ? null : current
    ));
  }, [readyStickerId]);

  function stopDragPreviewAnimation() {
    dragPreviewAnimationRef.current?.stop?.();
    dragPreviewAnimationRef.current = null;
  }

  function bindStickerDragWindowEvents() {
    dragGlobalCleanup.current?.();
    window.addEventListener('pointermove', moveStickerOptionDrag, { capture: true, passive: false });
    window.addEventListener('pointerup', finishStickerOptionDrag, { capture: true, passive: false });
    window.addEventListener('pointercancel', finishStickerOptionDrag, { capture: true, passive: false });
    dragGlobalCleanup.current = () => {
      window.removeEventListener('pointermove', moveStickerOptionDrag, true);
      window.removeEventListener('pointerup', finishStickerOptionDrag, true);
      window.removeEventListener('pointercancel', finishStickerOptionDrag, true);
      dragGlobalCleanup.current = null;
    };
  }

  function startDragPreviewAnimation(gesture) {
    stopDragPreviewAnimation();
    gesture.peelStartedAt = performance.now();

    dragPreviewAnimationRef.current = animate(0, 1, {
      type: 'spring',
      stiffness: 480,
      damping: 50,
      restDelta: 0.001,
      restSpeed: 0.001,
      onUpdate: (value) => {
        if (dragGesture.current !== gesture || !gesture.moved) return;
        const peelProgress = Math.min(Math.max(value, 0), 1);
        const pointerDelta = {
          x: 0,
          y: -stickerMotionConfig.visualPeelDistance * peelProgress,
        };
        gesture.peelProgress = peelProgress;
        gesture.pointerDelta = pointerDelta;
        setDragSticker((current) => current && current.type === gesture.type ? {
          ...current,
          peelProgress,
          pointerDelta,
        } : current);
      },
    });
  }

  function startStickerOptionDrag(event, option) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    stopDragPreviewAnimation();
    event.stopPropagation();
    if (event.cancelable) event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragGesture.current = {
      pointerId: event.pointerId,
      type: option.id,
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY,
      captureTarget: event.currentTarget,
      moved: false,
      peelProgress: 0,
      pointerDelta: { x: 0, y: 0 },
      peelStartedAt: 0,
    };
    bindStickerDragWindowEvents();
    setDragSticker({
      type: option.id,
      x: event.clientX,
      y: event.clientY,
      isVisible: false,
      peelProgress: 0,
      pointerDelta: { x: 0, y: 0 },
    });
  }

  function moveStickerOptionDrag(event) {
    const gesture = dragGesture.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    if (!gesture.moved && Math.hypot(deltaX, deltaY) < 8) return;

    gesture.moved = true;
    if (event.cancelable) event.preventDefault();
    gesture.currentX = event.clientX;
    gesture.currentY = event.clientY;
    if (!gesture.peelStartedAt) startDragPreviewAnimation(gesture);
    setDragSticker((current) => current && current.type === gesture.type ? {
      ...current,
      x: event.clientX,
      y: event.clientY,
      isVisible: true,
    } : current);
  }

  function finishStickerOptionDrag(event, cancelled = false) {
    const gesture = dragGesture.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    event.stopPropagation();
    if (event.cancelable) event.preventDefault();
    gesture.captureTarget?.releasePointerCapture?.(event.pointerId);
    stopDragPreviewAnimation();
    dragGlobalCleanup.current?.();
    dragGesture.current = null;

    if (cancelled || !gesture.moved) {
      setDragSticker(null);
    } else {
      if (event.cancelable) event.preventDefault();
      blockNextClick.current = true;
      const dropPoint = {
        x: event.clientX,
        y: event.clientY - stickerMotionConfig.pointerLiftOffset,
      };
      const dropResult = onDropSticker?.(gesture.type, dropPoint, {
        start: { x: gesture.startX, y: gesture.startY },
        end: dropPoint,
        peelCorner: 'bottom-edge',
        peelProgress: 1,
        pointerDelta: gesture.pointerDelta || { x: 0, y: -stickerMotionConfig.visualPeelDistance },
      });

      if (dropResult?.accepted && dropResult.stickerId) {
        setDragSticker((current) => current && current.type === gesture.type ? {
          ...current,
          waitingForStickerId: dropResult.stickerId,
        } : current);
      } else {
        setDragSticker(null);
      }

      window.setTimeout(() => {
        blockNextClick.current = false;
      }, 120);
    }
  }

  return (
    <div className="sticker-picker-layer" role="dialog" aria-modal="true" aria-label="스티커 꾸미기">
      <motion.section
        className="sticker-picker-sheet"
        initial={{ y: 520 }}
        animate={{ y: 0 }}
        exit={{ y: 520 }}
        transition={screenPushTransition}
      >
        <div className="sticker-picker-handle" aria-hidden="true" />
        <button className="sticker-picker-close" type="button" aria-label="스티커 꾸미기 닫기" onClick={onDismiss}>
          <img src={assets.modalClose} alt="" />
        </button>
        <div className="sticker-picker-tabs" role="tablist" aria-label="스티커 분류">
          {stickerTabs.map((tab) => (
            <button
              className={`sticker-picker-tab ${activeTab === tab.id ? 'sticker-picker-tab-active' : ''}`}
              type="button"
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-label={`${tab.label} 스티커`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon === 'all' ? (
                <span className="sticker-tab-all" aria-hidden="true">ALL</span>
              ) : (
                <img src={tab.src} alt="" />
              )}
            </button>
          ))}
        </div>
        <div className="sticker-options">
          <div className="sticker-picker-title">
            <strong>{activeStickerTab.label}</strong>
          </div>
          {visibleStickerOptions.map((option) => (
            <button
              className="sticker-option"
              type="button"
              key={option.id}
              aria-label={`${option.label} 스티커`}
              onPointerDown={(event) => startStickerOptionDrag(event, option)}
              onPointerMove={moveStickerOptionDrag}
              onPointerUp={finishStickerOptionDrag}
              onPointerCancel={(event) => finishStickerOptionDrag(event, true)}
              onDragStart={(event) => event.preventDefault()}
              onClick={() => {
                if (blockNextClick.current) return;
                onAddSticker(option.id);
              }}
            >
              <img src={option.src} alt="" draggable={false} />
            </button>
          ))}
          {visibleStickerOptions.length === 0 ? (
            <p className="sticker-options-empty">아직 이 탭에 담긴 스티커가 없어요.</p>
          ) : null}
        </div>
        <div className="sticker-picker-cta">
          <button className="sticker-apply-button" type="button" onClick={onApply}>
            적용
          </button>
        </div>
      </motion.section>
      {dragSticker ? (
        <div
          className={`sticker-drag-preview ${dragSticker.isVisible ? '' : 'sticker-drag-preview-peel-hidden'}`}
          style={{
            left: 0,
            top: 0,
            transform: `translate3d(${dragSticker.x}px, ${dragSticker.isVisible ? dragSticker.y - stickerMotionConfig.pointerLiftOffset : dragSticker.y}px, 0) translate(-50%, -50%)`,
          }}
          aria-hidden="true"
        >
          <PeelableSticker
            id={`picker-preview-${dragSticker.type}`}
            src={getStickerSrc(dragSticker.type)}
            width={stickerBaseSize}
            height={stickerBaseSize}
            initialPosition={{ x: 0, y: 0 }}
            scale={1}
            disabled
            className="sticker-drag-preview-peelable"
            previewPeel={{
              peelCorner: 'bottom-edge',
              peelProgress: dragSticker.peelProgress,
              pointerDelta: dragSticker.pointerDelta,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function NicknamePickerSheet({ selectedNickname, onSelect, onConfirm, onDismiss }) {
  const [draftNickname, setDraftNickname] = useState(() => normalizeSelectedNickname(selectedNickname));

  useEffect(() => {
    setDraftNickname(normalizeSelectedNickname(selectedNickname));
  }, [selectedNickname]);

  return (
    <div className="nickname-picker-layer" role="dialog" aria-modal="true" aria-labelledby="nickname-picker-title">
      <motion.button
        className="nickname-picker-dim"
        type="button"
        aria-label="닉네임 선택 닫기"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
        onClick={onDismiss}
      />
      <motion.section
        className="nickname-picker-sheet"
        initial={{ y: 292 }}
        animate={{ y: 0 }}
        exit={{ y: 292 }}
        transition={screenPushTransition}
      >
        <div className="nickname-picker-content">
          <h2 id="nickname-picker-title">누구이신가요?</h2>
          <div className="nickname-options">
            {memberNicknames.map((nickname) => {
              const isSelected = draftNickname === nickname;
              return (
                <motion.button
                  className={`nickname-option ${isSelected ? 'nickname-option-selected' : ''}`}
                  type="button"
                  key={nickname}
                  initial={false}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setDraftNickname(nickname)}
                >
                  <img src={getMemberAvatarSrc(nickname)} alt="" />
                  <span>{nickname}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
        <div className="nickname-picker-cta">
          <button
            className="nickname-confirm-button"
            type="button"
            onClick={() => {
              onSelect(draftNickname);
              onConfirm();
            }}
          >
            확인
          </button>
        </div>
      </motion.section>
    </div>
  );
}

function Home({
  active = true,
  monthDate,
  entries,
  availableDiaryMonthKeys = [],
  monthScrollTops = {},
  stickersByMonth,
  onChangeMonth,
  onMonthScrollChange,
  onChangeStickers,
  onSaveMonthStickers,
  onSelectWeek,
  returningFromUpload,
  transitionKind,
  screenPushDistance,
  currentNickname = currentMemberNickname,
  activeMemberId = currentMemberId,
  onOpenNicknamePicker,
  hasUnreadNotifications = false,
  onOpenNotifications,
}) {
  const dragBlockedClick = useRef(false);
  const monthViewportRef = useRef(null);
  const monthAnimation = useRef(null);
  const monthTrackFrame = useRef(null);
  const pendingMonthTrackX = useRef(null);
  const longPressGesture = useRef(null);
  const stickerScreenGesture = useRef(null);
  const homeSectionRef = useRef(null);
  const isStickerPickerOpenRef = useRef(false);
  const editingStickersRef = useRef([]);
  const selectedStickerIdRef = useRef('');
  const seededDefaultStickerId = useRef('');
  const pendingSummaryMonthKeys = useRef(new Set());
  const [isStickerPickerOpen, setIsStickerPickerOpen] = useState(false);
  const [editingStickers, setEditingStickers] = useState([]);
  const [selectedStickerId, setSelectedStickerId] = useState('');
  const [readyStickerId, setReadyStickerId] = useState('');
  const [pendingDropStickerId, setPendingDropStickerId] = useState('');
  const [stickerBounce, setStickerBounce] = useState({ key: 0, ids: [] });
  const [weeklySummariesByMonth, setWeeklySummariesByMonth] = useState(readWeeklySummaryCache);
  const [loadingSummaryMonthKeys, setLoadingSummaryMonthKeys] = useState(() => new Set());
  const [failedSummaryMonthKeys, setFailedSummaryMonthKeys] = useState(() => new Set());
  const monthPages = useMemo(() => buildHomeMonthPages(), []);
  const [activeMonthIndex, setActiveMonthIndex] = useState(() => getMonthIndex(monthPages, monthDate));
  const activeMonthIndexRef = useRef(activeMonthIndex);
  const [renderedMonthIndex, setRenderedMonthIndex] = useState(activeMonthIndex);
  const activeMonthDate = monthPages[activeMonthIndex]?.date || monthDate;
  const renderableMonthIndexes = useMemo(() => getHomeRenderableMonthIndexes(renderedMonthIndex, monthPages.length, activeMonthIndex), [activeMonthIndex, renderedMonthIndex, monthPages.length]);
  const monthWeeksByKey = useMemo(() => {
    const nextMonthWeeks = new Map();

    renderableMonthIndexes.forEach((index) => {
      const month = monthPages[index];
      if (!month) return;

      const requestWeeks = buildWeeklySummaryRequest(month.date, entries);
      const requestWeeksById = new Map(requestWeeks.map((week) => [week.id, week]));
      const storedSummaries = weeklySummariesByMonth[month.key] || {};
      const summariesByWeek = {};

      buildMonthWeeks(month.date).forEach((week) => {
        const requestWeek = requestWeeksById.get(week.id);
        const storedSummary = storedSummaries[week.id];

        if (requestWeek && storedSummary?.label) {
          summariesByWeek[week.id] = { label: storedSummary.label, status: 'ready' };
        } else if (requestWeek && loadingSummaryMonthKeys.has(month.key)) {
          summariesByWeek[week.id] = { status: 'loading' };
        }
      });

      nextMonthWeeks.set(month.key, applyEntriesToWeeks(buildMonthWeeks(month.date), entries, summariesByWeek));
    });

    return nextMonthWeeks;
  }, [entries, loadingSummaryMonthKeys, monthPages, renderableMonthIndexes, weeklySummariesByMonth]);
  const activeWeeks = monthWeeksByKey.get(getMonthKey(activeMonthDate)) || [];
  const activeMonthKey = getMonthKey(activeMonthDate);
  const activeMonthScrollTop = monthScrollTops[activeMonthKey] || 0;
  const selectableMonthOptions = useMemo(() => {
    const loadedEntryMonthKeys = entries.map((entry) => getMonthKeyForDate(entry.date));
    const entryMonthKeys = new Set([...availableDiaryMonthKeys, ...loadedEntryMonthKeys].filter(Boolean));
    return monthPages.filter((month) => entryMonthKeys.has(month.key));
  }, [availableDiaryMonthKeys, entries, monthPages]);
  const monthTrackX = useMotionValue(-activeMonthIndex * screenPushDistance);

  useEffect(() => {
    activeMonthIndexRef.current = activeMonthIndex;
  }, [activeMonthIndex]);

  useEffect(() => {
    if (!hasSupabaseConfig) return undefined;

    let isCancelled = false;
    const cache = readWeeklySummaryCache();
    const monthsToLoad = [];

    renderableMonthIndexes.forEach((index) => {
      const month = monthPages[index];
      if (!month || pendingSummaryMonthKeys.current.has(month.key) || failedSummaryMonthKeys.has(month.key)) return;

      const requestWeeks = buildWeeklySummaryRequest(month.date, entries);
      if (requestWeeks.length === 0) return;

      const cachedMonth = {
        ...(cache[month.key] || {}),
        ...(weeklySummariesByMonth[month.key] || {}),
      };
      const hasMissingSummary = requestWeeks.some((week) => !cachedMonth[week.id]?.label);
      if (hasMissingSummary) monthsToLoad.push(month);
    });

    if (monthsToLoad.length === 0) return undefined;

    monthsToLoad.forEach((month) => pendingSummaryMonthKeys.current.add(month.key));
    setLoadingSummaryMonthKeys((current) => {
      const next = new Set(current);
      monthsToLoad.forEach((month) => next.add(month.key));
      return next;
    });

    monthsToLoad.forEach((month) => {
      fetchWeeklySummaries(month.date, entries)
        .then((summaries) => {
          if (isCancelled || Object.keys(summaries).length === 0) return;

          setWeeklySummariesByMonth((current) => {
            const next = {
              ...current,
              [month.key]: {
                ...(current[month.key] || {}),
                ...summaries,
              },
            };
            writeWeeklySummaryCache(next);
            return next;
          });
        })
        .catch((error) => {
          console.warn('Weekly summaries unavailable:', error);
          setFailedSummaryMonthKeys((current) => {
            const next = new Set(current);
            next.add(month.key);
            return next;
          });
        })
        .finally(() => {
          pendingSummaryMonthKeys.current.delete(month.key);
          if (isCancelled) return;
          setLoadingSummaryMonthKeys((current) => {
            const next = new Set(current);
            next.delete(month.key);
            return next;
          });
        });
    });

    return () => {
      isCancelled = true;
    };
  }, [entries, failedSummaryMonthKeys, monthPages, renderableMonthIndexes, weeklySummariesByMonth]);

  useEffect(() => {
    editingStickersRef.current = editingStickers;
  }, [editingStickers]);

  useEffect(() => {
    selectedStickerIdRef.current = selectedStickerId;
  }, [selectedStickerId]);

  useEffect(() => {
    isStickerPickerOpenRef.current = isStickerPickerOpen;
    if (!isStickerPickerOpen) return;

    dragBlockedClick.current = false;
    cancelScheduledMonthTrackPosition();
    stopMonthAnimation();
    resetMonthTrack(monthViewportRef.current);
  }, [isStickerPickerOpen]);

  useEffect(() => {
    if (!isStickerPickerOpen) return;

    const sourceStickers = (stickersByMonth[activeMonthKey] || []).map((sticker) => toMonthContentSticker(sticker));
    if (sourceStickers.length === 0) return;

    setEditingStickers((current) => {
      const currentWithoutSeed = seededDefaultStickerId.current
        ? current.filter((sticker) => sticker.id !== seededDefaultStickerId.current)
        : current;
      const currentIds = new Set(currentWithoutSeed.map((sticker) => sticker.id));
      const missingSourceStickers = sourceStickers.filter((sticker) => !currentIds.has(sticker.id));
      if (missingSourceStickers.length === 0 && currentWithoutSeed.length === current.length) return current;

      seededDefaultStickerId.current = '';
      return [...missingSourceStickers, ...currentWithoutSeed];
    });
  }, [activeMonthKey, isStickerPickerOpen, stickersByMonth]);

  useEffect(() => {
    if (!isStickerPickerOpen) return;
    if (selectedStickerId && editingStickers.some((sticker) => sticker.id === selectedStickerId)) return;

    const nextSelectedStickerId = editingStickers[0]?.id || '';
    selectedStickerIdRef.current = nextSelectedStickerId;
    setSelectedStickerId(nextSelectedStickerId);
  }, [editingStickers, isStickerPickerOpen, selectedStickerId]);

  function getMonthPageWidth(viewport) {
    return viewport?.clientWidth || screenPushDistance;
  }

  function flushScheduledMonthTrackPosition() {
    monthTrackFrame.current = null;
    if (pendingMonthTrackX.current === null) return;

    monthTrackX.set(pendingMonthTrackX.current);
    pendingMonthTrackX.current = null;
  }

  function setMonthTrackPositionOnFrame(value) {
    pendingMonthTrackX.current = value;
    if (monthTrackFrame.current !== null) return;

    monthTrackFrame.current = window.requestAnimationFrame(flushScheduledMonthTrackPosition);
  }

  function cancelScheduledMonthTrackPosition() {
    if (monthTrackFrame.current !== null) {
      window.cancelAnimationFrame(monthTrackFrame.current);
      monthTrackFrame.current = null;
    }

    if (pendingMonthTrackX.current !== null) {
      monthTrackX.set(pendingMonthTrackX.current);
      pendingMonthTrackX.current = null;
    }
  }

  function stopMonthAnimation() {
    cancelScheduledMonthTrackPosition();
    monthAnimation.current?.stop();
    monthAnimation.current = null;
  }

  function clearHomeLongPress() {
    if (longPressGesture.current?.timerId) {
      window.clearTimeout(longPressGesture.current.timerId);
    }
    longPressGesture.current = null;
  }

  function canStartHomeLongPress(event) {
    if (isStickerPickerOpenRef.current) return false;
    if (event.pointerType === 'mouse' && event.button !== 0) return false;
    return !event.target.closest?.('input, textarea, select, .sticker-picker-sheet, .home-sticker-editable');
  }

  function startHomeLongPress(event) {
    if (!canStartHomeLongPress(event)) return;

    clearHomeLongPress();
    longPressGesture.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      timerId: window.setTimeout(() => {
        const gesture = longPressGesture.current;
        if (gesture) {
          const viewport = monthViewportRef.current;
          if (viewport?.hasPointerCapture?.(gesture.pointerId)) {
            viewport.releasePointerCapture?.(gesture.pointerId);
          }
          monthSwipeGesture.onPointerCancel({
            pointerId: gesture.pointerId,
            clientX: gesture.startX,
            clientY: gesture.startY,
          });
        }
        dragBlockedClick.current = true;
        openStickerPicker();
        longPressGesture.current = null;
      }, 560),
    };
  }

  function updateHomeLongPress(event) {
    const gesture = longPressGesture.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    if (Math.hypot(deltaX, deltaY) > 10) clearHomeLongPress();
  }

  function getMonthSwipeThreshold(viewport) {
    const monthPageWidth = getMonthPageWidth(viewport);
    return Math.max(96, monthPageWidth * 0.18);
  }

  function setMonthTrackPosition(value) {
    stopMonthAnimation();
    monthTrackX.set(value);
  }

  function animateMonthTrack(targetX, onComplete) {
    stopMonthAnimation();
    monthAnimation.current = animate(monthTrackX, targetX, {
      ...screenPushTransition,
      onComplete: () => {
        monthAnimation.current = null;
        onComplete?.();
      },
    });
  }

  function resetMonthTrack(viewport) {
    setMonthTrackPosition(-activeMonthIndexRef.current * getMonthPageWidth(viewport));
  }

  function snapMonthBack(viewport) {
    animateMonthTrack(-activeMonthIndexRef.current * getMonthPageWidth(viewport));
  }

  function commitMonthChange(nextMonthIndex) {
    const nextMonthDate = monthPages[nextMonthIndex].date;
    activeMonthIndexRef.current = nextMonthIndex;
    setActiveMonthIndex(nextMonthIndex);
    onChangeMonth(nextMonthDate);
  }

  function moveToMonth(nextMonthIndex, viewport, animated = true) {
    const currentMonthIndex = activeMonthIndexRef.current;
    const clampedIndex = Math.min(Math.max(nextMonthIndex, 0), monthPages.length - 1);
    const targetTrackX = -clampedIndex * getMonthPageWidth(viewport);

    if (clampedIndex === currentMonthIndex) {
      if (animated) snapMonthBack(viewport);
      else setMonthTrackPosition(targetTrackX);
      return;
    }

    commitMonthChange(clampedIndex);

    if (animated) {
      animateMonthTrack(targetTrackX, () => setRenderedMonthIndex(clampedIndex));
      return;
    }

    setRenderedMonthIndex(clampedIndex);
    setMonthTrackPosition(targetTrackX);
  }

  const monthSwipeGesture = useSwipeGesture({
    enabled: !isStickerPickerOpen,
    thresholdPx: SWIPE_DIRECTION_THRESHOLD_PX,
    horizontalAngleDeg: SWIPE_HORIZONTAL_ANGLE_DEG,
    velocitySampleMs: SWIPE_VELOCITY_SAMPLE_MS,
    onPendingStart: () => {
      dragBlockedClick.current = false;
    },
    onHorizontalLock: () => {
      dragBlockedClick.current = true;
      clearHomeLongPress();
      stopMonthAnimation();
    },
    onHorizontalMove: (gesture) => {
      if (isStickerPickerOpenRef.current) return;
      const viewport = monthViewportRef.current;
      if (!viewport) return;

      const monthPageWidth = getMonthPageWidth(viewport);
      const minTrackX = -(monthPages.length - 1) * monthPageWidth;
      const startTrackX = -activeMonthIndexRef.current * monthPageWidth;
      const nextTrackX = Math.min(Math.max(startTrackX + gesture.deltaX, minTrackX), 0);
      setMonthTrackPositionOnFrame(nextTrackX);
    },
    onVerticalLock: () => {
      clearHomeLongPress();
      dragBlockedClick.current = false;
    },
    onHorizontalEnd: (gesture) => {
      if (isStickerPickerOpenRef.current) {
        dragBlockedClick.current = false;
        return;
      }

      const viewport = monthViewportRef.current;
      if (!viewport) return;

      cancelScheduledMonthTrackPosition();

      const absX = Math.abs(gesture.deltaX);
      const swipeVelocity = Math.abs(gesture.velocityX);
      const isDistanceSwipe = absX >= getMonthSwipeThreshold(viewport);
      const isFastSwipe = absX >= SWIPE_FLICK_MIN_DISTANCE_PX && swipeVelocity >= SWIPE_FLICK_VELOCITY_PX_PER_MS;
      const isValidSwipe = isDistanceSwipe || isFastSwipe;

      if (isValidSwipe) {
        moveToMonth(activeMonthIndexRef.current + (gesture.deltaX < 0 ? 1 : -1), viewport);
      } else {
        snapMonthBack(viewport);
      }

      window.setTimeout(() => {
        dragBlockedClick.current = false;
      }, 160);
    },
    onCancel: (gesture) => {
      const viewport = monthViewportRef.current;
      cancelScheduledMonthTrackPosition();
      clearHomeLongPress();

      if (viewport && (gesture.axis === 'horizontal' || gesture.axis === 'pending')) {
        snapMonthBack(viewport);
      }

      dragBlockedClick.current = false;
    },
    onFinish: (gesture) => {
      if (gesture.axis !== 'horizontal') dragBlockedClick.current = false;
    },
  });

  useLayoutEffect(() => {
    const viewport = monthViewportRef.current;
    if (!viewport) return undefined;

    resetMonthTrack(viewport);

    return () => {
      cancelScheduledMonthTrackPosition();
      stopMonthAnimation();
      clearHomeLongPress();
    };
  }, [screenPushDistance]);

  useEffect(() => {
    const nextMonthIndex = getMonthIndex(monthPages, monthDate);
    if (nextMonthIndex === activeMonthIndexRef.current) return;
    moveToMonth(nextMonthIndex, monthViewportRef.current, false);
  }, [monthDate, monthPages]);

  function handleMonthPointerDown(event) {
    if (isStickerPickerOpenRef.current) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    const viewport = monthViewportRef.current;
    if (!viewport) return;

    startHomeLongPress(event);
    monthSwipeGesture.onPointerDown(event);

    if (event.pointerType === 'mouse' && event.currentTarget.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  }

  function handleMonthPointerMove(event) {
    if (isStickerPickerOpenRef.current) return;
    updateHomeLongPress(event);
    monthSwipeGesture.onPointerMove(event);
  }

  function finishMonthPointer(event, cancelled = false) {
    if (event.currentTarget.hasPointerCapture?.(event.pointerId) && event.currentTarget.releasePointerCapture) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (isStickerPickerOpenRef.current) {
      dragBlockedClick.current = false;
      clearHomeLongPress();
      monthSwipeGesture.onPointerCancel(event);
      return;
    }
    clearHomeLongPress();

    if (cancelled) {
      monthSwipeGesture.onPointerCancel(event);
    } else {
      monthSwipeGesture.onPointerUp(event);
    }
  }

  function handleSelectWeek(week, nextScreen = 'list', source = '') {
    if (dragBlockedClick.current) return;
    onSelectWeek(week, nextScreen, source);
  }

  function handleSelectMonth(monthValue) {
    const nextMonthIndex = monthPages.findIndex((month) => month.key === monthValue);
    if (nextMonthIndex < 0) return;
    moveToMonth(nextMonthIndex, monthViewportRef.current);
  }

  function openNotificationInbox() {
    onOpenNotifications?.();
  }

  function blockHomeTouchWhilePicking(event) {
    if (!isStickerPickerOpenRef.current) return;
    if (event.target.closest?.('.sticker-picker-sheet, .home-sticker-editable')) return;
    event.stopPropagation();
  }

  function preventHomeContextMenu(event) {
    if (!event.target.closest?.('.home-month-viewport, .home-sticker')) return;
    event.preventDefault();
  }

  function getGestureCenter(points) {
    const total = points.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), { x: 0, y: 0 });
    return { x: total.x / points.length, y: total.y / points.length };
  }

  function getGestureDistance(a, b) {
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  function getGestureAngle(a, b) {
    return Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
  }

  function createStickerScreenGesture(points, sticker) {
    return {
      center: getGestureCenter(points),
      sticker,
      distance: points.length >= 2 ? getGestureDistance(points[0], points[1]) : 1,
      angle: points.length >= 2 ? getGestureAngle(points[0], points[1]) : 0,
    };
  }

  function resetStickerScreenGesture() {
    stickerScreenGesture.current = null;
  }

  function getStickerTouchPoints(touches) {
    return Array.from(touches).map((touch) => ({ x: touch.clientX, y: touch.clientY }));
  }

  function startStickerScreenGesture(event) {
    if (!isStickerPickerOpenRef.current) return;
    if (event.touches.length < 2 && event.target.closest?.('.home-sticker-peelable')) return;
    if (event.touches.length < 2 && event.target.closest?.('button')) return;

    const touchedStickerId = event.target.closest?.('.home-sticker-editable')?.dataset?.stickerId;
    const isSheetTouch = Boolean(event.target.closest?.('.sticker-picker-sheet'));
    const currentEditingStickers = editingStickersRef.current;
    const currentSelectedStickerId = selectedStickerIdRef.current;
    const selectedSticker = currentEditingStickers.find((sticker) => sticker.id === (touchedStickerId || stickerScreenGesture.current?.sticker?.id || currentSelectedStickerId)) || currentEditingStickers[0];
    if (!selectedSticker) return;

    if (event.touches.length < 2) {
      if (!touchedStickerId) return;

      if (touchedStickerId !== currentSelectedStickerId) {
        setSelectedStickerId(touchedStickerId);
      }

      event.stopPropagation();
      if (event.cancelable) event.preventDefault();
      stickerScreenGesture.current = {
        ...createStickerScreenGesture(getStickerTouchPoints(event.touches), selectedSticker),
        startedOnSticker: true,
        startedOnSheet: isSheetTouch,
      };
      return;
    }

    if (touchedStickerId && touchedStickerId !== currentSelectedStickerId) {
      setSelectedStickerId(touchedStickerId);
    }

    event.stopPropagation();
    if (event.cancelable) event.preventDefault();
    stickerScreenGesture.current = {
      ...createStickerScreenGesture(getStickerTouchPoints(event.touches), selectedSticker),
      startedOnSticker: Boolean(touchedStickerId),
      startedOnSheet: isSheetTouch,
    };
  }

  function updateStickerScreenGesture(event) {
    if (!isStickerPickerOpenRef.current || !stickerScreenGesture.current) return;
    if (event.touches.length < 2 && !stickerScreenGesture.current.startedOnSticker) return;

    event.stopPropagation();
    if (event.cancelable) event.preventDefault();
    const points = getStickerTouchPoints(event.touches);
    const center = getGestureCenter(points);
    const nextSticker = {
      ...stickerScreenGesture.current.sticker,
      x: stickerScreenGesture.current.sticker.x + center.x - stickerScreenGesture.current.center.x,
      y: stickerScreenGesture.current.sticker.y + center.y - stickerScreenGesture.current.center.y,
    };

    if (points.length >= 2) {
      const distance = getGestureDistance(points[0], points[1]);
      const angle = getGestureAngle(points[0], points[1]);
      nextSticker.scale = Math.min(
        Math.max(stickerScreenGesture.current.sticker.scale * (distance / Math.max(stickerScreenGesture.current.distance, 1)), stickerScaleLimit.min),
        stickerScaleLimit.max
      );
      nextSticker.rotation = stickerScreenGesture.current.sticker.rotation + angle - stickerScreenGesture.current.angle;
    }

    changeEditingSticker(nextSticker);
  }

  function finishStickerScreenGesture(event) {
    if (!isStickerPickerOpenRef.current || !stickerScreenGesture.current) return;

    event.stopPropagation();
    if (event.touches.length < 2) {
      stickerScreenGesture.current = null;
      return;
    }

    const points = getStickerTouchPoints(event.touches);
    const latestSticker = editingStickers.find((sticker) => sticker.id === stickerScreenGesture.current?.sticker.id) || stickerScreenGesture.current?.sticker;
    if (latestSticker) stickerScreenGesture.current = createStickerScreenGesture(points, latestSticker);
  }

  useEffect(() => {
    document.addEventListener('touchstart', startStickerScreenGesture, { capture: true, passive: false });
    document.addEventListener('touchmove', updateStickerScreenGesture, { capture: true, passive: false });
    document.addEventListener('touchend', finishStickerScreenGesture, { capture: true, passive: false });
    document.addEventListener('touchcancel', finishStickerScreenGesture, { capture: true, passive: false });

    return () => {
      document.removeEventListener('touchstart', startStickerScreenGesture, true);
      document.removeEventListener('touchmove', updateStickerScreenGesture, true);
      document.removeEventListener('touchend', finishStickerScreenGesture, true);
      document.removeEventListener('touchcancel', finishStickerScreenGesture, true);
    };
  }, [isStickerPickerOpen, editingStickers, selectedStickerId]);

  function handleMonthScrollChange(monthKey, scrollTop) {
    if (!monthKey) return;
    onMonthScrollChange?.(monthKey, scrollTop);
  }

  function getActiveWeekListMetrics() {
    const weekList = monthViewportRef.current?.querySelector(`.week-list[data-month-key="${activeMonthKey}"]`);
    if (!weekList) return null;

    return {
      rect: weekList.getBoundingClientRect(),
      scrollTop: weekList.scrollTop || 0,
    };
  }

  function openStickerPicker() {
    triggerStickerModeHaptic();
    const currentStickers = (stickersByMonth[activeMonthKey] || []).map((sticker) => toMonthContentSticker(sticker));
    const nextEditingStickers = currentStickers.length > 0 ? currentStickers : [createDefaultSticker('cloud', screenPushDistance)];
    seededDefaultStickerId.current = currentStickers.length > 0 ? '' : nextEditingStickers[0]?.id || '';
    setEditingStickers(nextEditingStickers);
    setSelectedStickerId(nextEditingStickers[0]?.id || '');
    setIsStickerPickerOpen(true);
  }

  function addEditingSticker(type) {
    seededDefaultStickerId.current = '';
    const nextSticker = createDefaultSticker(type, screenPushDistance);
    const scrollTop = getActiveWeekListMetrics()?.scrollTop ?? activeMonthScrollTop;
    let placedStickerId = nextSticker.id;

    setEditingStickers((current) => {
      const offset = Math.min(current.length, 5) * 12;
      const placedSticker = normalizeSticker({
        ...nextSticker,
        x: nextSticker.x + offset,
        y: nextSticker.y + scrollTop + offset,
        coordinateSpace: 'month-content',
      });
      placedStickerId = placedSticker.id;
      return [...current, placedSticker];
    });
    selectedStickerIdRef.current = placedStickerId;
    setSelectedStickerId(placedStickerId);
  }

  function dropEditingSticker(type, point, dragMeta = null) {
    seededDefaultStickerId.current = '';
    const viewport = monthViewportRef.current;
    const weekListMetrics = getActiveWeekListMetrics();
    if (!viewport || !weekListMetrics) return { accepted: false };

    const viewportRect = viewport.getBoundingClientRect();
    const { rect: weekListRect, scrollTop } = weekListMetrics;
    const sheet = document.querySelector('.sticker-picker-sheet');
    const sheetRect = sheet?.getBoundingClientRect();
    if (sheetRect && point.y >= sheetRect.top) return { accepted: false };
    if (point.x < viewportRect.left || point.x > viewportRect.right || point.y < weekListRect.top) return { accepted: false };

    const placedScale = defaultStickerPosition.scale;
    const placedSize = stickerBaseSize * placedScale;
    const visibleDropBottom = Math.min(weekListRect.bottom, sheetRect?.top ?? viewportRect.bottom, viewportRect.bottom);
    const clampedPointY = Math.min(Math.max(point.y, weekListRect.top), visibleDropBottom);
    const dropTopLeftX = point.x - weekListRect.left - placedSize / 2;
    const dropTopLeftY = scrollTop + clampedPointY - weekListRect.top - placedSize / 2;
    const targetX = Math.min(Math.max(dropTopLeftX, 8), weekListRect.width - placedSize - 8);
    // The previous unscaled expression was `y: scrollTop + Math.min(Math.max(point.y - weekListRect.top - stickerBaseSize / 2, 8), weekListRect.height - stickerBaseSize - 8)`.
    const targetY = scrollTop + Math.min(Math.max(clampedPointY - weekListRect.top - placedSize / 2, 8), weekListRect.height - placedSize - 8);
    const nextSticker = normalizeSticker({
      id: crypto.randomUUID(),
      type,
      x: targetX,
      y: targetY,
      coordinateSpace: 'month-content',
      scale: placedScale,
      rotation: defaultStickerPosition.rotation,
      settleFrom: dragMeta ? {
        key: `${type}-${Date.now()}`,
        peelCorner: dragMeta.peelCorner,
        peelProgress: Number.isFinite(dragMeta.peelProgress) ? dragMeta.peelProgress : 0,
        pointerDelta: dragMeta.pointerDelta,
        rootOffset: {
          x: dropTopLeftX - targetX,
          y: dropTopLeftY - targetY,
        },
        duration: stickerMotionConfig.dropDuration,
      } : null,
    });
    setEditingStickers((current) => [...current, nextSticker]);
    selectedStickerIdRef.current = nextSticker.id;
    setSelectedStickerId(nextSticker.id);
    setPendingDropStickerId(nextSticker.id);
    setReadyStickerId('');
    return { accepted: true, stickerId: nextSticker.id };
  }

  function handleStickerReady(stickerId) {
    if (stickerId === pendingDropStickerId) {
      setPendingDropStickerId('');
    }
    setReadyStickerId(stickerId);
  }

  function changeEditingSticker(nextSticker) {
    if (nextSticker.id === seededDefaultStickerId.current) seededDefaultStickerId.current = '';
    setEditingStickers((current) => current.map((sticker) => (sticker.id === nextSticker.id ? toMonthContentSticker(nextSticker) : sticker)));
  }

  function removeEditingSticker(stickerId) {
    if (stickerId === seededDefaultStickerId.current) seededDefaultStickerId.current = '';
    if (stickerId === pendingDropStickerId) setPendingDropStickerId('');
    const nextStickers = editingStickers.filter((sticker) => sticker.id !== stickerId);
    setEditingStickers(nextStickers);

    if (selectedStickerIdRef.current === stickerId) {
      const nextSelectedStickerId = nextStickers[0]?.id || '';
      selectedStickerIdRef.current = nextSelectedStickerId;
      setSelectedStickerId(nextSelectedStickerId);
    }
  }

  function dismissStickerPicker() {
    resetStickerScreenGesture();
    seededDefaultStickerId.current = '';
    setReadyStickerId('');
    setPendingDropStickerId('');
    setIsStickerPickerOpen(false);
    setEditingStickers([]);
    setSelectedStickerId('');
  }

  function applySticker() {
    const previousStickers = (stickersByMonth[activeMonthKey] || []).map((sticker) => toMonthContentSticker(sticker));
    const previousStickersById = new Map(previousStickers.map((sticker) => [sticker.id, sticker]));
    const createdAt = new Date().toISOString();
    const nextStickers = editingStickers.map((sticker) => {
      const { settleFrom, ...nextSticker } = toMonthContentSticker(sticker);
      const previousSticker = previousStickersById.get(nextSticker.id);
      if (previousSticker) return nextSticker;

      return {
        ...nextSticker,
        createdAt: nextSticker.createdAt || createdAt,
        createdBy: nextSticker.createdBy || activeMemberId,
        createdByNickname: nextSticker.createdByNickname || currentNickname,
      };
    });
    const changedStickerIds = nextStickers
      .filter((sticker) => !isSameSticker(previousStickersById.get(sticker.id), sticker))
      .map((sticker) => sticker.id);
    const hasNewSticker = nextStickers.length > previousStickers.length;

    onChangeStickers((current) => ({
      ...current,
      [activeMonthKey]: nextStickers,
    }));
    void onSaveMonthStickers?.(activeMonthKey, nextStickers, activeMemberId);
    setStickerBounce((current) => ({
      key: current.key + 1,
      ids: changedStickerIds,
    }));
    if (hasNewSticker) {
      void notifyWebPush('sticker_created', { month: activeMonthKey }, activeMemberId);
    }
    dismissStickerPicker();
  }

  const homeMotionProps = screenMotionProps('home', transitionKind, active, screenPushDistance);
  const homeMotionStyle = {
    ...homeMotionProps.style,
    zIndex: isStickerPickerOpen ? 150 : homeMotionProps.style?.zIndex,
  };

  return (
    <motion.section
      ref={homeSectionRef}
      className="phone home-screen"
      onPointerDownCapture={blockHomeTouchWhilePicking}
      onClickCapture={blockHomeTouchWhilePicking}
      onContextMenu={preventHomeContextMenu}
      {...homeMotionProps}
      style={homeMotionStyle}
    >
      <img className="paper-bg" src={assets.bg} alt="" />
      <HomeHeader
        monthDate={activeMonthDate}
        monthOptions={selectableMonthOptions}
        onSelectMonth={handleSelectMonth}
        onOpenNicknamePicker={onOpenNicknamePicker}
        currentNickname={currentNickname}
        hasUnreadNotifications={hasUnreadNotifications}
        onOpenNotifications={openNotificationInbox}
      />
      <div
        className="home-month-viewport"
        ref={monthViewportRef}
        onPointerDown={handleMonthPointerDown}
        onPointerMove={handleMonthPointerMove}
        onPointerUp={finishMonthPointer}
        onPointerCancel={(event) => finishMonthPointer(event, true)}
      >
        <motion.div
          className="home-month-track"
          style={{ x: monthTrackX }}
        >
          {monthPages.map((month, index) => (
            <HomeMonthPage
              key={month.key}
              monthKey={month.key}
              savedScrollTop={monthScrollTops[month.key] || 0}
              weeks={monthWeeksByKey.get(month.key) || []}
              isRenderable={renderableMonthIndexes.has(index)}
              stickers={stickersByMonth[month.key] || []}
              editStickers={index === activeMonthIndex ? editingStickers : []}
              selectedStickerId={index === activeMonthIndex ? selectedStickerId : ''}
              editingStickers={index === activeMonthIndex && isStickerPickerOpen}
              stickerBounceKey={index === activeMonthIndex ? stickerBounce.key : 0}
              stickerBounceIds={index === activeMonthIndex ? stickerBounce.ids : []}
              onScrollChange={handleMonthScrollChange}
              onStickerChange={changeEditingSticker}
              onStickerRemove={removeEditingSticker}
              onStickerSelect={setSelectedStickerId}
              onStickerReady={handleStickerReady}
              hiddenStickerId={index === activeMonthIndex ? pendingDropStickerId : ''}
              onSelectWeek={handleSelectWeek}
            />
          ))}
        </motion.div>
      </div>
      {activeWeeks[0] ? (
        <UploadButton
          reverseFromBig={returningFromUpload}
          bigWidth={Math.max(uploadButtonSize.small, screenPushDistance - 32)}
          onNavigate={() => onSelectWeek(activeWeeks[0], 'upload')}
        />
      ) : null}
      <AnimatePresence>
        {isStickerPickerOpen ? (
          <StickerPickerSheet
            onAddSticker={addEditingSticker}
            onDropSticker={dropEditingSticker}
            onApply={applySticker}
            onDismiss={dismissStickerPicker}
            readyStickerId={readyStickerId}
          />
        ) : null}
      </AnimatePresence>
      <CoveredPageDim visible={transitionKind === 'home-to-list' || transitionKind === 'home-to-notifications'} />
    </motion.section>
  );
}

function LetterScreen({ active = true, transitionKind, screenPushDistance, onNavigate }) {
  return (
    <motion.section className="phone letter-screen" {...screenMotionProps('letter', transitionKind, active, screenPushDistance)}>
      <img className="paper-bg" src={assets.bg} alt="" />
      <header className="letter-nav">
        <button className="icon-back" type="button" onClick={() => onNavigate('home')} aria-label="뒤로" />
      </header>
      <main className="letter-page-content">
        <img className="letter-page-name" src={assets.letterName} alt="혜민에게" />
        <div className="letter-page-body">
          {anniversaryLetterParagraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </main>
    </motion.section>
  );
}

function NavHeader({ title = '', sub = '', onNavigate }) {
  return (
    <header className="nav-header">
      <div className="nav-row">
        <button className="icon-back" type="button" onClick={() => onNavigate('home')} aria-label="뒤로" />
        {title ? (
          <div className="nav-title">
            <strong>{title}</strong>
            <span>{sub}</span>
          </div>
        ) : (
          <span />
        )}
        <span className="nav-space" />
      </div>
    </header>
  );
}

function ReactionButton({ icon, activeIcon, active = false, count, label, onClick, compact = false }) {
  return (
    <button className={`reaction-button ${compact ? 'reaction-button-compact' : ''}`} type="button" aria-label={label} onClick={onClick}>
      <img src={active && activeIcon ? activeIcon : icon} alt="" />
      {count !== undefined ? <span>{count}</span> : null}
    </button>
  );
}

function LargePolaroidStack({ photos = [], dateLabel = '', defaultExpanded = false, lockedExpanded = false, focusEnabled = false, toggleEnabled = false, showDateLabel = false, controlledExpanded = null }) {
  const [isStackPressed, setIsStackPressed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [pressedPhotoIndex, setPressedPhotoIndex] = useState(null);
  const [focusedPhoto, setFocusedPhoto] = useState(null);
  const [returningPhotoIndex, setReturningPhotoIndex] = useState(null);
  const photoRefs = useRef({});
  const stackRef = useRef(null);
  const scrollRef = useRef(null);
  const focusOpenedAtRef = useRef(0);
  const focusClosingStartedAtRef = useRef(0);
  const returningPhotoTimerRef = useRef(null);
  const horizontalScrollLeftRef = useRef(0);
  const userScrollIntentRef = useRef(false);
  const visible = photos.slice(0, maxUploadPhotos);
  const isSinglePhoto = visible.length === 1;
  const StaticPhotoElement = focusEnabled ? motion.button : 'span';
  const MotionPhotoElement = focusEnabled ? motion.button : motion.span;
  const releasePhotoPress = () => setPressedPhotoIndex(null);
  const releaseStackPress = () => setIsStackPressed(false);
  const expanded = isSinglePhoto || lockedExpanded || (controlledExpanded ?? isExpanded);
  const expandedWidth = visible.length * largePolaroidWidth + Math.max(0, visible.length - 1) * largePolaroidPressedGap;

  useEffect(() => () => {
    if (returningPhotoTimerRef.current) window.clearTimeout(returningPhotoTimerRef.current);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const isFocusActive = focusEnabled && (focusedPhoto || returningPhotoIndex !== null);
    const isDimActive = focusEnabled && focusedPhoto && focusedPhoto.phase !== 'closing';
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    document.body.classList.toggle('large-photo-target-focus-active', Boolean(isFocusActive));
    document.body.classList.toggle('large-photo-dim-active', Boolean(isDimActive));
    if (!document.body.classList.contains('splash-active')) {
      themeColorMeta?.setAttribute('content', isDimActive ? appDimThemeColor : appThemeColor);
    }
    return () => {
      document.body.classList.remove('large-photo-target-focus-active');
      document.body.classList.remove('large-photo-dim-active');
      if (!document.body.classList.contains('splash-active') && !document.body.classList.contains('app-dim-active')) {
        themeColorMeta?.setAttribute('content', appThemeColor);
      }
    };
  }, [focusEnabled, focusedPhoto, returningPhotoIndex]);

  useEffect(() => {
    horizontalScrollLeftRef.current = scrollRef.current?.scrollLeft || 0;
  }, [expanded, focusedPhoto, returningPhotoIndex]);

  useEffect(() => {
    if (!focusEnabled || focusedPhoto?.phase !== 'closing' || typeof document === 'undefined') return undefined;

    function handleUserScrollIntent() {
      userScrollIntentRef.current = true;
    }

    function handleCapturedScroll() {
      if (!userScrollIntentRef.current) return;
      if (Date.now() - focusClosingStartedAtRef.current < 140) return;
      finishFocusedPhotoReturn();
    }

    userScrollIntentRef.current = false;
    document.addEventListener('wheel', handleUserScrollIntent, { capture: true, passive: true });
    document.addEventListener('touchmove', handleUserScrollIntent, { capture: true, passive: true });
    document.addEventListener('scroll', handleCapturedScroll, true);
    return () => {
      userScrollIntentRef.current = false;
      document.removeEventListener('wheel', handleUserScrollIntent, true);
      document.removeEventListener('touchmove', handleUserScrollIntent, true);
      document.removeEventListener('scroll', handleCapturedScroll, true);
    };
  }, [focusEnabled, focusedPhoto?.phase]);

  useEffect(() => {
    const stack = stackRef.current;
    if (!focusEnabled || !stack) return undefined;

    function handlePhotoActivation(event) {
      const photoElement = event.target.closest?.('.large-photo');
      if (!photoElement || !stack.contains(photoElement)) return;
      const index = Number(photoElement.dataset.photoIndex);
      const photo = visible[index];
      if (!photo) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      if (focusedPhoto?.index === index) {
        closeFocusedPhoto();
        return;
      }
      focusPhoto(photo, index, getPhotoSourceRect(index));
    }

    document.addEventListener('click', handlePhotoActivation, true);
    stack.addEventListener('click', handlePhotoActivation);
    return () => {
      document.removeEventListener('click', handlePhotoActivation, true);
      stack.removeEventListener('click', handlePhotoActivation);
    };
  }, [focusEnabled, focusedPhoto, visible]);

  if (visible.length === 0) return null;

  const stackInteractionProps = focusEnabled || !toggleEnabled || controlledExpanded !== null || isSinglePhoto
    ? {}
    : {
        role: 'button',
        tabIndex: 0,
        onPointerDown: () => setIsStackPressed(true),
        onPointerUp: releaseStackPress,
        onPointerCancel: releaseStackPress,
        onPointerLeave: releaseStackPress,
        onClick: () => {
          if (!lockedExpanded && controlledExpanded === null) setIsExpanded((current) => !current);
        },
      };
  const photoInteractionProps = (photo, index) => ({
    role: focusEnabled ? 'button' : undefined,
    tabIndex: focusEnabled ? 0 : undefined,
    onPointerDown: focusEnabled
      ? (event) => {
          event.stopPropagation();
          setPressedPhotoIndex(index);
        }
      : undefined,
    onPointerUp: focusEnabled
      ? (event) => {
          event.stopPropagation();
          releasePhotoPress();
        }
      : undefined,
    onPointerCancel: focusEnabled ? releasePhotoPress : undefined,
    onPointerLeave: focusEnabled ? releasePhotoPress : undefined,
    onClick: focusEnabled
      ? (event) => {
          openFocusedPhoto(event, photo, index);
        }
      : undefined,
    onKeyDown: focusEnabled
      ? (event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          focusPhoto(photo, index);
        }
      : undefined,
  });

  function getPhotoSourceRect(index) {
    const rect = photoRefs.current[index]?.getBoundingClientRect();
    if (!rect) return null;
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
  }

  function focusPhoto(photo, index, sourceRect = getPhotoSourceRect(index)) {
    if (returningPhotoTimerRef.current) window.clearTimeout(returningPhotoTimerRef.current);
    userScrollIntentRef.current = false;
    setReturningPhotoIndex(null);
    focusOpenedAtRef.current = Date.now();
    setFocusedPhoto({ photo, index, sourceRect, target: getFocusedPhotoTargetTransform(sourceRect), phase: 'open' });
  }

  function closeFocusedPhoto() {
    if (!focusedPhoto || focusedPhoto.phase === 'closing') return;
    if (Date.now() - focusOpenedAtRef.current < 280) return;
    userScrollIntentRef.current = false;
    focusClosingStartedAtRef.current = Date.now();
    setReturningPhotoIndex(focusedPhoto.index);
    setFocusedPhoto((current) => (current ? { ...current, phase: 'closing' } : current));
    returningPhotoTimerRef.current = window.setTimeout(() => {
      setFocusedPhoto(null);
      setReturningPhotoIndex(null);
    }, 1150);
  }

  function finishFocusedPhotoReturn() {
    if (returningPhotoTimerRef.current) window.clearTimeout(returningPhotoTimerRef.current);
    setFocusedPhoto(null);
    setReturningPhotoIndex(null);
  }

  function handleStackHorizontalScroll(event) {
    const nextScrollLeft = event.currentTarget.scrollLeft || 0;
    const scrollDelta = Math.abs(nextScrollLeft - horizontalScrollLeftRef.current);
    horizontalScrollLeftRef.current = nextScrollLeft;
    if (scrollDelta < 1) return;
    if (!focusEnabled || focusedPhoto?.phase !== 'closing') return;
    if (!userScrollIntentRef.current) return;
    if (Date.now() - focusClosingStartedAtRef.current < 140) return;
    finishFocusedPhotoReturn();
  }

  function openFocusedPhoto(event, photo, index) {
    event.stopPropagation();
    releasePhotoPress();
    focusPhoto(photo, index, getPhotoSourceRect(index));
  }

  function getFocusedPhotoTargetTransform(rect) {
    if (!rect || typeof window === 'undefined') {
      return { x: 0, y: 0, scale: 2.1 };
    }

    const viewport = window.visualViewport;
    const viewportWidth = viewport?.width || window.innerWidth;
    const viewportHeight = viewport?.height || window.innerHeight;
    const viewportLeft = viewport?.offsetLeft || 0;
    const viewportTop = viewport?.offsetTop || 0;
    const viewportCenterX = viewportLeft + viewportWidth / 2;
    const viewportCenterY = viewportTop + viewportHeight / 2;
    const targetWidth = Math.min(viewportWidth * 0.78, 520);
    const targetScale = targetWidth / Math.max(rect.width, 1);
    const sourceOriginY = rect.top + rect.height * focusedPolaroidOriginYRatio;
    const sourceCenterY = rect.top + rect.height / 2;
    const scaledCenterOffsetY = (sourceCenterY - sourceOriginY) * targetScale;
    return {
      x: viewportCenterX - (rect.left + rect.width / 2),
      y: viewportCenterY - (sourceOriginY + scaledCenterOffsetY),
      scale: targetScale,
    };
  }

  function getPhotoMotion(index, baseMotion) {
    return baseMotion;
  }

  function getTopPhotoIndex() {
    return visible.length > 1 ? 1 : 0;
  }

  function getExpandedPhotoLeft(index) {
    return index * (largePolaroidWidth + largePolaroidPressedGap);
  }

  function getPhotoZIndex(index) {
    return index === getTopPhotoIndex() ? visible.length + 1 : index + 1;
  }

  function getPhotoStyle(index, baseStyle = {}) {
    const isFocusProxyActive = focusEnabled && (focusedPhoto?.index === index || returningPhotoIndex === index);
    return {
      ...baseStyle,
      zIndex: getPhotoZIndex(index),
      opacity: isFocusProxyActive ? 0 : 1,
    };
  }

  function getFocusedPhotoProxyInitial(photoState) {
    return {
      x: 0,
      y: 0,
      scale: 1,
      rotate: 0,
    };
  }

  function getFocusedPhotoProxyAnimate(photoState) {
    if (photoState.phase === 'closing') {
      return getFocusedPhotoProxyExit();
    }

    return {
      x: photoState.target.x,
      y: photoState.target.y,
      scale: photoState.target.scale,
      rotate: 0,
    };
  }

  function getFocusedPhotoProxyExit() {
    return {
      x: 0,
      y: 0,
      scale: 1,
      rotate: 0,
    };
  }

  function getFocusedPhotoShadowOpacity(photoState) {
    if (photoState.phase === 'closing') return 0;
    return [0, 1];
  }

  return (
    <div
      className={`large-stack-scroll ${expanded ? 'large-stack-scroll-expanded' : ''} ${focusedPhoto || returningPhotoIndex !== null ? 'large-stack-scroll-focus-active' : ''}`}
      ref={scrollRef}
      onScroll={handleStackHorizontalScroll}
    >
      {isSinglePhoto ? (
        <div className="large-stack" ref={stackRef}>
          <StaticPhotoElement
            type={focusEnabled ? 'button' : undefined}
            data-photo-index={0}
            ref={(node) => {
              if (node) {
                photoRefs.current[0] = node;
              } else {
                delete photoRefs.current[0];
              }
            }}
            className="large-photo large-photo-1"
            animate={focusEnabled ? getPhotoMotion(0, { x: 0, y: 0, scale: pressedPhotoIndex === 0 ? 0.97 : 1, rotate: 0, zIndex: getPhotoZIndex(0), boxShadow: focusedPolaroidRestShadow }) : undefined}
            transition={focusedPolaroidLayoutTransition}
            style={getPhotoStyle(0, { left: 0, top: 0, transform: 'rotate(0deg)' })}
            {...photoInteractionProps(visible[0], 0)}
          >
            <PhotoImage photo={visible[0]} transform={photoTransforms.list} eager={focusEnabled} />
          </StaticPhotoElement>
          {showDateLabel ? <span className="large-date">{dateLabel.replace('월 ', '/').replace('일', '')}</span> : null}
        </div>
      ) : (
        <motion.div
          ref={stackRef}
          className={toggleEnabled ? 'large-stack large-stack-clickable' : 'large-stack'}
          layout="position"
          initial={false}
          animate={{ scale: isStackPressed ? 0.97 : 1, width: expanded ? expandedWidth : largePolaroidCollapsedWidth }}
          transition={{
            scale: isStackPressed ? uploadButtonPressSpring : uploadButtonReleaseSpring,
            width: largePolaroidSpring,
            layout: largePolaroidSpring,
          }}
          {...stackInteractionProps}
        >
          {visible.map((photo, index) => (
            <MotionPhotoElement
              type={focusEnabled ? 'button' : undefined}
              data-photo-index={index}
              ref={(node) => {
                if (node) {
                  photoRefs.current[index] = node;
                } else {
                  delete photoRefs.current[index];
                }
              }}
              className={`large-photo large-photo-${index + 1}`}
              key={`${photo.id || photo}-${index}`}
              initial={false}
              animate={
                expanded
                  ? getPhotoMotion(index, {
                      left: getExpandedPhotoLeft(index),
                      rotate: 0,
                      top: 0,
                      x: 0,
                      y: 0,
                      scale: focusEnabled && pressedPhotoIndex === index ? 0.97 : 1,
                      zIndex: getPhotoZIndex(index),
                      boxShadow: focusedPolaroidRestShadow,
                    })
                  : getPhotoMotion(index, {
                      left: largePolaroidRest[index].left,
                      rotate: largePolaroidRest[index].rotate,
                      top: largePolaroidRest[index].top,
                      x: 0,
                      y: 0,
                      scale: focusEnabled && pressedPhotoIndex === index ? 0.97 : 1,
                      zIndex: getPhotoZIndex(index),
                      boxShadow: focusedPolaroidRestShadow,
                    })
              }
              transition={{
                left: {
                  ...largePolaroidSpring,
                  delay: expanded ? 0 : (visible.length - 1 - index) * largePolaroidStaggerDelay,
                },
                top: {
                  ...largePolaroidSpring,
                  delay: expanded ? 0 : (visible.length - 1 - index) * largePolaroidStaggerDelay,
                },
                rotate: {
                  ...largePolaroidSpring,
                  delay: expanded ? 0 : (visible.length - 1 - index) * largePolaroidStaggerDelay,
                },
                x: largePolaroidSpring,
                y: largePolaroidSpring,
                scale: largePolaroidFocusSpring,
                zIndex: { duration: 0 },
                delay: expanded ? 0 : (visible.length - 1 - index) * largePolaroidStaggerDelay,
              }}
              style={getPhotoStyle(index)}
              {...photoInteractionProps(photo, index)}
            >
              <PhotoImage photo={photo} transform={photoTransforms.list} eager={focusEnabled} />
            </MotionPhotoElement>
          ))}
          {showDateLabel ? <span className="large-date">{dateLabel.replace('월 ', '/').replace('일', '')}</span> : null}
        </motion.div>
      )}
      {focusEnabled && typeof document !== 'undefined'
        ? createPortal(
            <Fragment>
              <AnimatePresence>
                {focusedPhoto && focusedPhoto.phase !== 'closing' ? (
                  <motion.div
                    key="focused-photo-dim"
                    className="large-photo-focus-layer large-photo-focus-layer-dim-only"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.12, ease: [0, 0, 0.2, 1] } }}
                    transition={{ duration: 0.18, ease: [0, 0, 0.2, 1] }}
                    onClick={closeFocusedPhoto}
                  >
                    <div className="large-photo-focus-dim" />
                  </motion.div>
                ) : null}
              </AnimatePresence>
              <AnimatePresence>
                {focusedPhoto ? (
                  <motion.button
                    key={`focused-photo-proxy-${focusedPhoto.index}`}
                    type="button"
                    className="large-photo large-photo-focused-proxy"
                    initial={getFocusedPhotoProxyInitial(focusedPhoto)}
                    animate={getFocusedPhotoProxyAnimate(focusedPhoto)}
                    transition={focusedPhoto.phase === 'closing' ? focusedPolaroidReturnTransition : focusedPolaroidLayoutTransition}
                    style={{
                      position: 'fixed',
                      left: focusedPhoto.sourceRect?.left || 0,
                      top: focusedPhoto.sourceRect?.top || 0,
                      width: focusedPhoto.sourceRect?.width || largePolaroidWidth,
                      height: focusedPhoto.sourceRect?.height || 189.473,
                      zIndex: 1200,
                      pointerEvents: focusedPhoto.phase === 'closing' ? 'none' : 'auto',
                    }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="large-photo-focused-content">
                      <motion.div
                        className="large-photo-focused-shadow"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: getFocusedPhotoShadowOpacity(focusedPhoto) }}
                        transition={focusedPolaroidShadowTransition}
                      />
                      <PhotoImage photo={focusedPhoto.photo} transform={photoTransforms.focus} eager />
                    </div>
                  </motion.button>
                ) : null}
              </AnimatePresence>
            </Fragment>,
            document.body,
          )
        : null}
    </div>
  );
}

function normalizeDiaryEntry(entry) {
  return {
    ...entry,
    dateLabel: entry.dateLabel || formatDateLabel(entry.date),
    weekday: entry.weekday || formatWeekday(entry.date),
    nickname: entry.nickname || currentMemberNickname,
    photos: entry.photos || [],
    text: entry.text || '어떤 하루였나요?',
    location: entry.location || '',
    comments: entry.comments || [],
    commentCount: typeof entry.commentCount === 'number' ? entry.commentCount : (entry.comments || []).length,
  };
}

function DiaryCardHeader({ entry, onEdit }) {
  return (
    <div className="diary-date">
      <strong>{entry.dateLabel}</strong>
      {entry.weekday ? <span>· {entry.weekday}</span> : null}
      <button className="pencil" type="button" aria-label="수정" onClick={() => onEdit?.(entry)}>
        <img src={assets.pencil} alt="" />
      </button>
    </div>
  );
}

function DiaryEntryText({ text }) {
  const paragraphs = String(text || '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <div className="diary-entry-text">
      {paragraphs.map((paragraph, paragraphIndex) => {
        const lines = paragraph.split('\n');

        return (
          <p key={`${paragraph}-${paragraphIndex}`}>
            {lines.map((line, lineIndex) => (
              <Fragment key={`${line}-${lineIndex}`}>
                {line}
                {lineIndex < lines.length - 1 ? <br /> : null}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function DiaryCardBody({ entry, onOpen }) {
  const bodyProps = onOpen
    ? {
        role: 'button',
        tabIndex: 0,
        onClick: () => onOpen(entry),
        onKeyDown: (event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          onOpen(entry);
        },
      }
    : {};
  const writerAvatar = getMemberAvatarSrc(entry.nickname);

  return (
    <div className={onOpen ? 'diary-body diary-body-clickable' : 'diary-body'} {...bodyProps}>
      <div className="writer">
        <img src={writerAvatar} alt="" />
        <strong>{entry.nickname}</strong>
      </div>
      <DiaryEntryText text={entry.text} />
      {entry.location ? (
        <span className="location-chip">
          <img src={assets.locationPin} alt="" />{entry.location}에서
        </span>
      ) : null}
    </div>
  );
}

function DiaryCardReactions({ entry, onToggleLike, onOpenComments, detail = false }) {
  return (
    <div className="reaction-bar" aria-label="다이어리 반응">
      <ReactionButton
        icon={assets.likeOutline}
        activeIcon={assets.likeFilled}
        active={entry.liked}
        count={entry.likeCount || 0}
        label="좋아요"
        onClick={() => onToggleLike(entry.id)}
        compact={false}
      />
      <ReactionButton icon={assets.comment} count={entry.commentCount || 0} label="댓글 보기" onClick={() => onOpenComments(entry)} compact={false} />
    </div>
  );
}

function DiaryListCard({ entry, onToggleLike, onOpenComments, onEdit, itemRef }) {
  const normalizedEntry = normalizeDiaryEntry(entry);

  return (
    <article className="diary-item diary-item-created diary-item-list-card" ref={itemRef}>
      <DiaryCardHeader entry={normalizedEntry} onEdit={onEdit} />
      <LargePolaroidStack photos={normalizedEntry.photos} dateLabel={normalizedEntry.dateLabel} defaultExpanded={normalizedEntry.photos.length > 4} toggleEnabled />
      <DiaryCardBody entry={normalizedEntry} onOpen={onOpenComments} />
      <DiaryCardReactions entry={normalizedEntry} onToggleLike={onToggleLike} onOpenComments={onOpenComments} />
    </article>
  );
}

function DiaryDetailCard({ entry, onToggleLike, onOpenComments, onEdit }) {
  const normalizedEntry = normalizeDiaryEntry(entry);

  return (
    <article className="diary-item diary-item-created diary-item-detail">
      <DiaryCardHeader entry={normalizedEntry} onEdit={onEdit} />
      <DiaryCardBody entry={normalizedEntry} />
      <LargePolaroidStack photos={normalizedEntry.photos} dateLabel={normalizedEntry.dateLabel} defaultExpanded lockedExpanded focusEnabled />
      <DiaryCardReactions entry={normalizedEntry} onToggleLike={onToggleLike} onOpenComments={onOpenComments} detail />
    </article>
  );
}

function DiaryItem({ entry, onToggleLike, onOpenComments, onEdit, detail = false, itemRef }) {
  if (!entry) return null;
  return detail ? <DiaryDetailCard entry={entry} onToggleLike={onToggleLike} onOpenComments={onOpenComments} onEdit={onEdit} /> : <DiaryListCard entry={entry} onToggleLike={onToggleLike} onOpenComments={onOpenComments} onEdit={onEdit} itemRef={itemRef} />;
}

function List({ active = true, entries, onNavigate, selectedWeek, transitionKind, onToggleLike, onOpenComments, onEditEntry, screenPushDistance, savedListState = null, onSaveListState }) {
  const listRef = useRef(null);
  const entryRefs = useRef(new Map());
  const focusedWeekRef = useRef('');
  const scrollFrameRef = useRef(null);
  const hasUserScrolledListRef = useRef(false);
  const isProgrammaticListScrollRef = useRef(false);
  const restoredListStateRef = useRef('');
  const renderedEntryCountRef = useRef(listInitialRenderCount);
  const savedScrollTop = Number.isFinite(savedListState?.scrollTop) ? savedListState.scrollTop : null;
  const savedRenderedEntryCount = Number.isFinite(savedListState?.renderedEntryCount) ? savedListState.renderedEntryCount : listInitialRenderCount;
  const selectedMonthKey = getMonthKeyForDate(selectedWeek.startDate);
  const monthEntries = useMemo(
    () => sortEntriesByDateAscending(entries.filter((entry) => getMonthKeyForDate(entry.date) === selectedMonthKey)),
    [entries, selectedMonthKey]
  );
  const monthWeeks = useMemo(
    () => applyEntriesToWeeks(buildMonthWeeks(getMonthStartForDate(selectedWeek.startDate)), entries),
    [entries, selectedWeek.startDate]
  );
  const weeksById = useMemo(() => new Map(monthWeeks.map((week) => [week.id, week])), [monthWeeks]);
  const [visibleWeek, setVisibleWeek] = useState(() => weeksById.get(selectedWeek.id) || selectedWeek);
  const [renderedEntryCount, setRenderedEntryCount] = useState(listInitialRenderCount);
  const headerWeek = visibleWeek || selectedWeek;
  const renderedMonthEntries = monthEntries.slice(0, renderedEntryCount);

  useEffect(() => {
    const hasSavedScrollTop = Number.isFinite(savedScrollTop);
    setVisibleWeek(weeksById.get(selectedWeek.id) || selectedWeek);
    focusedWeekRef.current = hasSavedScrollTop ? selectedWeek.id : '';
    hasUserScrolledListRef.current = hasSavedScrollTop;
    isProgrammaticListScrollRef.current = false;
    restoredListStateRef.current = '';
    setRenderedEntryCount(Math.max(listInitialRenderCount, savedRenderedEntryCount));
  }, [savedRenderedEntryCount, savedScrollTop, selectedWeek.id]);

  useEffect(() => {
    renderedEntryCountRef.current = renderedEntryCount;
    const list = listRef.current;
    if (!list) return;
    onSaveListState?.(selectedWeek.id, {
      scrollTop: list.scrollTop || 0,
      renderedEntryCount,
    });
  }, [onSaveListState, renderedEntryCount, selectedWeek.id]);

  useEffect(() => () => {
    const list = listRef.current;
    if (!list) return;
    onSaveListState?.(selectedWeek.id, {
      scrollTop: list.scrollTop || 0,
      renderedEntryCount: renderedEntryCountRef.current,
    });
  }, [onSaveListState, selectedWeek.id]);

  useEffect(() => {
    setVisibleWeek((current) => weeksById.get(current?.id) || current);
  }, [weeksById]);

  useEffect(() => {
    setRenderedEntryCount((current) => Math.min(Math.max(current, listInitialRenderCount), Math.max(monthEntries.length, listInitialRenderCount)));
  }, [monthEntries.length]);

  useLayoutEffect(() => {
    if (!active) return;
    setRenderedEntryCount((current) => Math.max(current, listInitialRenderCount, savedRenderedEntryCount));
  }, [active, savedRenderedEntryCount]);

  useLayoutEffect(() => {
    if (!active || !Number.isFinite(savedScrollTop)) return;
    if (restoredListStateRef.current === selectedWeek.id) return;

    const list = listRef.current;
    if (!list) return;

    isProgrammaticListScrollRef.current = true;
    hasUserScrolledListRef.current = true;
    focusedWeekRef.current = selectedWeek.id;
    list.scrollTo({ top: Math.max(0, savedScrollTop), behavior: 'auto' });
    restoredListStateRef.current = selectedWeek.id;
    window.requestAnimationFrame(() => {
      isProgrammaticListScrollRef.current = false;
      updateVisibleWeek();
    });
  }, [active, savedScrollTop, selectedWeek.id]);

  useLayoutEffect(() => {
    if (!active || focusedWeekRef.current === selectedWeek.id) return;
    if (hasUserScrolledListRef.current) return;

    const list = listRef.current;
    const targetEntry = monthEntries.find((entry) => entry.weekId === selectedWeek.id);
    const targetIndex = targetEntry ? monthEntries.findIndex((entry) => entry.id === targetEntry.id) : -1;
    if (targetIndex >= renderedEntryCount) {
      setRenderedEntryCount(Math.min(monthEntries.length, targetIndex + listRenderBatchSize));
      return;
    }

    const target = targetEntry ? entryRefs.current.get(targetEntry.id) : null;
    if (!list || !target) return;

    isProgrammaticListScrollRef.current = true;
    list.scrollTo({ top: Math.max(0, target.offsetTop - listFocusedEntryInset), behavior: 'auto' });
    focusedWeekRef.current = selectedWeek.id;
    window.requestAnimationFrame(() => {
      isProgrammaticListScrollRef.current = false;
      updateVisibleWeek();
    });
  }, [active, monthEntries, renderedEntryCount, selectedWeek.id]);

  useEffect(() => () => {
    if (scrollFrameRef.current !== null) window.cancelAnimationFrame(scrollFrameRef.current);
  }, []);

  function updateVisibleWeek() {
    const list = listRef.current;
    if (!list || monthEntries.length === 0) return;

    const anchorTop = list.scrollTop + listWeekAnchorOffset;
    let anchoredEntry = monthEntries[0];

    for (const entry of monthEntries) {
      const element = entryRefs.current.get(entry.id);
      if (!element) continue;
      if (element.offsetTop <= anchorTop) {
        anchoredEntry = entry;
        continue;
      }
      break;
    }

    const nextWeek = weeksById.get(anchoredEntry.weekId) || getWeekForEntry(anchoredEntry, entries);
    setVisibleWeek((current) => (current?.id === nextWeek.id && current?.label === nextWeek.label ? current : nextWeek));
  }

  function handleListScroll() {
    if (!isProgrammaticListScrollRef.current) {
      hasUserScrolledListRef.current = true;
    }
    onSaveListState?.(selectedWeek.id, {
      scrollTop: listRef.current?.scrollTop || 0,
      renderedEntryCount: renderedEntryCountRef.current,
    });
    if (scrollFrameRef.current !== null) return;

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      updateVisibleWeek();
      const list = listRef.current;
      if (!list) return;
      const remainingScroll = list.scrollHeight - list.scrollTop - list.clientHeight;
      if (remainingScroll > listLoadMoreThresholdPx) return;
      setRenderedEntryCount((current) => Math.min(monthEntries.length, current + listRenderBatchSize));
    });
  }

  return (
    <motion.section className="phone list-screen" {...screenMotionProps('list', transitionKind, active, screenPushDistance)}>
      <img className="paper-bg" src={assets.bg} alt="" />
      <NavHeader title={headerWeek.range} sub={headerWeek.label} onNavigate={onNavigate} />
      <div className="diary-list" ref={listRef} onScroll={handleListScroll}>
        {renderedMonthEntries.map((entry) => (
          <DiaryItem
            key={entry.id}
            entry={entry}
            onToggleLike={onToggleLike}
            onOpenComments={onOpenComments}
            onEdit={onEditEntry}
            itemRef={(element) => {
              if (element) {
                entryRefs.current.set(entry.id, element);
              } else {
                entryRefs.current.delete(entry.id);
              }
            }}
          />
        ))}
      </div>
      <UploadButton onNavigate={onNavigate} />
      <CoveredPageDim visible={transitionKind === 'list-to-comment'} />
    </motion.section>
  );
}

function CommentRow({ comment, emojiReactions = [], onToggleCommentLike, onOpenEmojiSheet, onToggleEmojiReaction, onRequestEdit, onRequestDelete, isTarget = false, rowRef }) {
  const createdAtText = formatCommentCreatedAt(comment.createdAt || comment.created_at);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const actionMenuRef = useRef(null);

  useEffect(() => {
    if (!isActionMenuOpen) return undefined;

    function closeMenuOnOutsidePointer(event) {
      if (actionMenuRef.current?.contains(event.target)) return;
      setIsActionMenuOpen(false);
    }

    document.addEventListener('pointerdown', closeMenuOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeMenuOnOutsidePointer);
  }, [isActionMenuOpen]);

  return (
    <div ref={rowRef} className={isTarget ? 'comment-row comment-row-target' : 'comment-row'}>
      <div className="comment-copy">
        <img src={getMemberAvatarSrc(comment.nickname)} alt="" />
        <div>
          <span className="comment-meta">
            <strong>{comment.nickname}</strong>
            {createdAtText ? <time dateTime={comment.createdAt || comment.created_at}>{createdAtText}</time> : null}
          </span>
          <p>{comment.text}</p>
          <div className="comment-reaction-row">
            <ReactionButton
              icon={assets.likeOutline}
              activeIcon={assets.likeFilled}
              active={comment.liked}
              label="댓글 좋아요"
              compact
              onClick={() => onToggleCommentLike(comment.id)}
            />
            <AnimatePresence initial={false} mode="popLayout">
              {emojiReactions.map((reaction) => (
                <motion.button
                  className={reaction.selected ? 'comment-emoji-chip comment-emoji-chip-selected' : 'comment-emoji-chip'}
                  type="button"
                  key={reaction.id}
                  aria-label={reaction.selected ? '댓글 이모지 반응 취소' : '댓글 이모지 반응'}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  whileTap={{ scale: 0.94 }}
                  transition={{
                    layout: { type: 'spring', stiffness: 800, damping: 50 },
                    scale: { type: 'spring', stiffness: 800, damping: 50 },
                    opacity: { duration: 0.08, ease: [0, 0, 0.2, 1] },
                  }}
                  onClick={() => onToggleEmojiReaction(comment.id, reaction)}
                >
                  {reaction.src ? <img src={reaction.src} alt="" /> : <span aria-hidden="true" />}
                  <em>{reaction.count}</em>
                </motion.button>
              ))}
            </AnimatePresence>
            <motion.button
              className="comment-emoji-add-button"
              type="button"
              aria-label="댓글 이모지 추가"
              layout
              whileTap={{ scale: 0.94 }}
              transition={{ layout: { type: 'spring', stiffness: 800, damping: 50 }, scale: { type: 'spring', stiffness: 800, damping: 50 } }}
              onClick={() => onOpenEmojiSheet(comment.id)}
            >
              <img src={assets.commentEmojiAdd} alt="" />
            </motion.button>
          </div>
        </div>
      </div>
      <div className="comment-actions">
        <div className="comment-menu-wrap" ref={actionMenuRef}>
          <button className="comment-menu-button" type="button" aria-label="댓글 메뉴" onClick={() => setIsActionMenuOpen((current) => !current)}>
            <span aria-hidden="true">⋮</span>
          </button>
          <AnimatePresence>
            {isActionMenuOpen ? (
              <motion.div
                className="comment-action-popover"
                style={{ transformOrigin: '100% 0%' }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{
                  scale: { type: 'spring', stiffness: 900, damping: 42 },
                  opacity: { duration: 0.08, ease: [0, 0, 0.2, 1] },
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsActionMenuOpen(false);
                    onRequestEdit(comment);
                  }}
                >
                  수정
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsActionMenuOpen(false);
                    onRequestDelete(comment);
                  }}
                >
                  삭제
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function CommentEmojiSheet({ visible, onSelectEmoji, onClose }) {
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div className="comment-emoji-sheet-layer" role="presentation" onPointerDown={onClose}>
          <motion.section
            className="comment-emoji-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="댓글 이모지 추가"
            initial={{ y: 267 }}
            animate={{ y: 0 }}
            exit={{ y: 267 }}
            transition={screenPushTransition}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="comment-emoji-sheet-handle" />
            <div className="comment-emoji-grid">
              {commentEmojiSlots.map((slot) => (
                <button className="comment-emoji-slot" type="button" key={slot.id} aria-label="이모지 선택" onClick={() => onSelectEmoji(slot)}>
                  {slot.src ? <img src={slot.src} alt="" /> : null}
                </button>
              ))}
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function CommentsScreen({ active = true, entry, targetCommentId = '', transitionKind, onNavigate, onToggleLike, onToggleCommentLike, onAddComment, onUpdateComment, onDeleteComment, onEditEntry, screenPushDistance, currentNickname = currentMemberNickname, selectedMemberId = currentMemberId, onLoadError = () => {} }) {
  const [reply, setReply] = useState('');
  const [editTargetComment, setEditTargetComment] = useState(null);
  const [deleteTargetComment, setDeleteTargetComment] = useState(null);
  const [emojiSheetCommentId, setEmojiSheetCommentId] = useState('');
  const [emojiReactionsByComment, setEmojiReactionsByComment] = useState(() => (hasSupabaseConfig ? {} : readCommentEmojiReactions()));
  const [isReplyFocused, setIsReplyFocused] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardBottomOffset, setKeyboardBottomOffset] = useState(0);
  const commentThreadRef = useRef(null);
  const targetCommentRef = useRef(null);
  const replyEditorRef = useRef(null);
  const isReplySendingRef = useRef(false);
  const comments = sortCommentsByCreatedAt(entry?.comments || []);

  useEffect(() => {
    function updateKeyboardState() {
      if (typeof window === 'undefined') return;
      const viewport = window.visualViewport;
      const layoutHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      const visualHeight = viewport?.height || layoutHeight;
      const visualBottom = (viewport?.offsetTop || 0) + visualHeight;
      const bottomOffset = Math.max(0, Math.round(layoutHeight - visualBottom));
      const keyboardDelta = Math.max(bottomOffset, layoutHeight - visualHeight);
      setKeyboardBottomOffset(bottomOffset);
      setIsKeyboardOpen(keyboardDelta > 120);
    }

    updateKeyboardState();
    window.addEventListener('resize', updateKeyboardState);
    window.visualViewport?.addEventListener('resize', updateKeyboardState);
    window.visualViewport?.addEventListener('scroll', updateKeyboardState);

    return () => {
      window.removeEventListener('resize', updateKeyboardState);
      window.visualViewport?.removeEventListener('resize', updateKeyboardState);
      window.visualViewport?.removeEventListener('scroll', updateKeyboardState);
    };
  }, []);

  useEffect(() => {
    if (!targetCommentId || !active) return undefined;

    let frameId = 0;
    frameId = window.requestAnimationFrame(() => {
      const thread = commentThreadRef.current;
      const target = targetCommentRef.current;
      if (!thread || !target) return;

      const threadRect = thread.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const targetTop = thread.scrollTop + targetRect.top - threadRect.top - 24;
      thread.scrollTo({ top: Math.max(0, targetTop), behavior: 'auto' });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [active, entry?.id, targetCommentId, comments.length]);

  async function sendReply() {
    if (isReplySendingRef.current) return;
    const currentReply = replyEditorRef.current?.textContent || reply;
    const trimmed = currentReply.trim();
    if (!trimmed) return;
    isReplySendingRef.current = true;
    try {
      if (editTargetComment) {
        await onUpdateComment(entry.id, editTargetComment.id, trimmed);
        setEditTargetComment(null);
      } else {
        await onAddComment(entry.id, trimmed);
      }
      setReply('');
      if (replyEditorRef.current) replyEditorRef.current.textContent = '';
    } finally {
      isReplySendingRef.current = false;
    }
  }

  async function confirmDeleteComment() {
    if (!deleteTargetComment) return;
    const targetCommentId = deleteTargetComment.id;
    setDeleteTargetComment(null);
    await onDeleteComment(entry.id, targetCommentId);
  }

  function requestEditComment(comment) {
    setEditTargetComment(comment);
    setReply(comment.text || '');
    if (!replyEditorRef.current) return;

    replyEditorRef.current.textContent = comment.text || '';
    replyEditorRef.current.focus();
    const range = document.createRange();
    range.selectNodeContents(replyEditorRef.current);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  function getCommentEmojiReactions(comment) {
    const commentId = comment?.id;
    const reactions = {
      ...(comment?.emojiReactions || {}),
      ...(emojiReactionsByComment[commentId] || {}),
    };
    const currentEmojiNickname = normalizeSelectedNickname(currentNickname);
    return commentEmojiSlots
      .map((slot) => {
        const reaction = normalizeCommentEmojiReaction(reactions[slot.id]);
        return {
          ...slot,
          count: reaction.count,
          selected: reaction.selectedBy.includes(currentEmojiNickname),
        };
      })
      .filter((reaction) => reaction.count > 0 && reaction.src);
  }

  function getBaseCommentEmojiReaction(commentId, emojiId) {
    const comment = (entry?.comments || []).find((item) => item.id === commentId);
    return comment?.emojiReactions?.[emojiId];
  }

  async function persistCommentEmojiReaction(commentId, emojiId, selected) {
    if (!hasSupabaseConfig) return;
    if (!isSupabaseUuid(commentId)) {
      onLoadError('이전 로컬 임시 댓글은 서버에 저장할 수 없어요.');
      return;
    }

    const request = selected
      ? supabase
          .from('diary_comment_emoji_reactions')
          .upsert({ comment_id: commentId, emoji_id: emojiId, member_id: selectedMemberId }, { onConflict: 'comment_id,emoji_id,member_id' })
      : supabase.from('diary_comment_emoji_reactions').delete().eq('comment_id', commentId).eq('emoji_id', emojiId).eq('member_id', selectedMemberId);
    const { error } = await request;
    if (error) {
      if (isMissingSupabaseSchema(error)) {
        onLoadError('댓글 이모지 반응 테이블이 아직 서버에 적용되지 않았어요.');
        return;
      }
      onLoadError(error.message || '댓글 이모지 반응을 저장하지 못했어요.');
      return;
    }

    if (selected) {
      if (entry?.id) {
        void notifyWebPush('comment_emoji_reacted', { entryId: entry.id, commentId, emojiId }, selectedMemberId);
      }
    }
  }

  function selectCommentEmoji(slot) {
    if (!emojiSheetCommentId) return;
    const commentId = emojiSheetCommentId;

    setEmojiReactionsByComment((current) => {
      const currentEmojiNickname = normalizeSelectedNickname(currentNickname);
      const currentCommentReactions = current[commentId] || {};
      const selectedReaction = normalizeCommentEmojiReaction(currentCommentReactions[slot.id] || getBaseCommentEmojiReaction(commentId, slot.id));
      if (selectedReaction.selectedBy.includes(currentEmojiNickname)) {
        return current;
      }

      const next = setCommentEmojiReactionValue(current, commentId, slot.id, addCommentEmojiReactionValue(selectedReaction, currentEmojiNickname));
      if (!hasSupabaseConfig) writeCommentEmojiReactions(next);
      return next;
    });
    setEmojiSheetCommentId('');
    void persistCommentEmojiReaction(commentId, slot.id, true);
  }

  function toggleCommentEmojiReaction(commentId, reaction) {
    const shouldSelect = !reaction.selected;
    setEmojiReactionsByComment((current) => {
      const currentEmojiNickname = normalizeSelectedNickname(currentNickname);
      const currentCommentReactions = current[commentId] || {};
      const selectedReaction = normalizeCommentEmojiReaction(currentCommentReactions[reaction.id] || getBaseCommentEmojiReaction(commentId, reaction.id));
      const nextReaction = shouldSelect
        ? addCommentEmojiReactionValue(selectedReaction.count > 0 ? selectedReaction : { count: reaction.count, selectedBy: selectedReaction.selectedBy }, currentEmojiNickname)
        : removeCommentEmojiReactionValue(selectedReaction.count > 0 ? selectedReaction : { count: reaction.count, selectedBy: [currentEmojiNickname] }, currentEmojiNickname);
      const next = setCommentEmojiReactionValue(current, commentId, reaction.id, nextReaction);
      if (!hasSupabaseConfig) writeCommentEmojiReactions(next);
      return next;
    });
    void persistCommentEmojiReaction(commentId, reaction.id, shouldSelect);
  }

  async function submitReply(event) {
    event.preventDefault();
    await sendReply();
  }

  function handleReplyInput(event) {
    setReply(event.currentTarget.textContent || '');
  }

  function handleReplySendPointerDown(event) {
    if (!reply.trim() && !replyEditorRef.current?.textContent?.trim()) return;
    event.preventDefault();
    void sendReply();
  }

  function handleReplyKeyDown(event) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent?.isComposing) return;
    event.preventDefault();
    const form = event.currentTarget.closest('form');
    if (typeof form?.requestSubmit === 'function') {
      form.requestSubmit();
    } else {
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
  }

  if (!entry) return null;

  const isReplyKeyboardDocked = isKeyboardOpen || isReplyFocused;
  const commentScreenMotionProps = screenMotionProps('comment', transitionKind, active, screenPushDistance);
  const commentScreenStyle = {
    ...(commentScreenMotionProps.style || {}),
    '--reply-keyboard-bottom': `${keyboardBottomOffset}px`,
  };

  return (
    <motion.section
      className={isReplyKeyboardDocked ? 'phone comments-screen comments-screen-keyboard-open' : 'phone comments-screen'}
      {...commentScreenMotionProps}
      style={commentScreenStyle}
    >
      <img className="paper-bg" src={assets.bg} alt="" />
      <NavHeader onNavigate={() => onNavigate('list')} />
      <div className="comment-thread" ref={commentThreadRef}>
        <DiaryItem entry={entry} detail onToggleLike={onToggleLike} onOpenComments={() => {}} onEdit={onEditEntry} />
        <div className="comments-list">
          {comments.map((comment) => (
            <CommentRow
              key={comment.id}
              comment={comment}
              isTarget={comment.id === targetCommentId}
              rowRef={comment.id === targetCommentId ? targetCommentRef : null}
              emojiReactions={getCommentEmojiReactions(comment)}
              onToggleCommentLike={(commentId) => onToggleCommentLike(entry.id, commentId)}
              onOpenEmojiSheet={setEmojiSheetCommentId}
              onToggleEmojiReaction={toggleCommentEmojiReaction}
              onRequestEdit={requestEditComment}
              onRequestDelete={setDeleteTargetComment}
            />
          ))}
        </div>
      </div>
      <form className={isReplyKeyboardDocked ? 'reply-composer reply-composer-keyboard-open' : 'reply-composer'} onSubmit={submitReply} autoComplete="off">
        <div className="reply-field">
          <img src={getMemberAvatarSrc(currentNickname)} alt="" />
          <div
            ref={replyEditorRef}
            className="reply-editor"
            role="textbox"
            contentEditable="plaintext-only"
            suppressContentEditableWarning
            data-placeholder="답글 달기..."
            aria-label="답글 달기"
            aria-multiline="false"
            inputMode="text"
            enterKeyHint="send"
            spellCheck={false}
            onInput={handleReplyInput}
            onKeyDown={handleReplyKeyDown}
            onFocus={() => setIsReplyFocused(true)}
            onBlur={() => setIsReplyFocused(false)}
          />
          <button
            className={reply.trim() ? 'reply-send reply-send-active' : 'reply-send'}
            type="submit"
            aria-label="답글 보내기"
            onPointerDown={handleReplySendPointerDown}
          >
            <img src={assets.send} alt="" />
          </button>
        </div>
      </form>
      <CommentEmojiSheet visible={Boolean(emojiSheetCommentId)} onSelectEmoji={selectCommentEmoji} onClose={() => setEmojiSheetCommentId('')} />
      <AnimatePresence>
        {deleteTargetComment ? (
          <div className="edit-modal-layer comment-delete-modal-layer" role="presentation">
            <motion.section className="edit-leave-modal comment-delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-comment-title" {...editModalMotion}>
              <div className="edit-modal-copy">
                <strong id="delete-comment-title">댓글을 삭제할까요?</strong>
                <p>삭제한 댓글은 다시 되돌릴 수 없어요.</p>
              </div>
              <div className="edit-modal-actions">
                <button className="edit-modal-button edit-modal-cancel" type="button" onClick={() => setDeleteTargetComment(null)}>
                  취소
                </button>
                <button className="edit-modal-button edit-modal-leave comment-delete-confirm" type="button" onClick={confirmDeleteComment}>
                  삭제
                </button>
              </div>
            </motion.section>
          </div>
        ) : null}
      </AnimatePresence>
    </motion.section>
  );
}

function UploadGrid({ photos, onFiles, onRemovePhoto, onSelectCoverPhoto }) {
  const variants = ['left', 'center', 'right', 'center', 'right', 'left'];
  const canAddPhoto = photos.length < maxUploadPhotos;
  const visibleCellCount = photos.length + (canAddPhoto ? 1 : 0);
  const rowCount = Math.ceil(visibleCellCount / uploadGridColumnCount) || 1;

  return (
    <div className="upload-grid" data-rows={rowCount}>
      {photos.map((photo, index) => (
        <ImagePolaroid
          key={photo.id}
          photo={photo}
          variant={variants[index] || 'center'}
          coverState={isCoverPhoto(photo) ? 'selected' : ''}
          onRemove={() => onRemovePhoto(photo.id)}
          onSelectCover={() => onSelectCoverPhoto(photo.id)}
        />
      ))}
      {canAddPhoto ? (
        <label className="upload-add-control" aria-label="이미지 첨부">
          <ImagePolaroid add />
          <input type="file" accept="image/*" multiple onChange={onFiles} />
        </label>
      ) : null}
    </div>
  );
}

function AnimatedUploadField({ children, order }) {
  return (
    <motion.div custom={order} variants={uploadFieldVariants}>
      {children}
    </motion.div>
  );
}

function StaticUploadField({ children }) {
  return <div>{children}</div>;
}

function Upload({ initialDate, onCreateEntry, onNavigate, selectedWeek, transitionKind, screenPushDistance, currentNickname = currentMemberNickname, autoOpenDatePicker = false, onDatePickerAutoOpened }) {
  const [photos, setPhotos] = useState([]);
  const [date, setDate] = useState(initialDate);
  const [location, setLocation] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadPressed, setIsUploadPressed] = useState(false);
  const dateInputRef = useRef(null);
  const didAutoOpenDatePicker = useRef(false);
  const releaseUploadPress = () => setIsUploadPressed(false);
  const primaryUploadWidth = Math.max(uploadButtonSize.small, screenPushDistance - 32);
  const uploadGridRows = Math.ceil((photos.length + (photos.length < maxUploadPhotos ? 1 : 0)) / uploadGridColumnCount) || 1;

  useEffect(() => {
    if (!autoOpenDatePicker || didAutoOpenDatePicker.current) return undefined;
    didAutoOpenDatePicker.current = true;

    let frameId = 0;
    frameId = window.requestAnimationFrame(() => {
      const input = dateInputRef.current;
      if (!input) return;
      input.focus({ preventScroll: true });
      try {
        if (typeof input.showPicker === 'function') {
          input.showPicker();
        } else {
          input.click();
        }
      } catch {
        input.click();
      } finally {
        onDatePickerAutoOpened?.();
      }
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [autoOpenDatePicker, onDatePickerAutoOpened]);

  async function handleFiles(event) {
    const files = Array.from(event.target.files || [])
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, Math.max(0, maxUploadPhotos - photos.length));

    const selected = files.map((file) => ({
        id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
        name: file.name,
        file,
        src: createPhotoPreviewUrl(file),
      }));

    if (selected.length > 0) setPhotos((current) => [...current, ...selected].slice(0, maxUploadPhotos));
    event.target.value = '';
  }

  function removePhoto(photoId) {
    setPhotos((current) => {
      const removed = current.find((photo) => photo.id === photoId);
      if (removed?.file && removed.src?.startsWith('blob:')) URL.revokeObjectURL(removed.src);
      return normalizePhotoCoverFlags(current.filter((photo) => photo.id !== photoId));
    });
  }

  function selectCoverPhoto(photoId) {
    setPhotos((current) => {
      const photo = current.find((item) => item.id === photoId);
      if (!photo) return current;
      return normalizePhotoCoverFlags(current, photoId);
    });
  }

  async function createDiaryEntry() {
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);

    try {
      await onCreateEntry({
        weekId: selectedWeek.id,
        date,
        dateLabel: formatDateLabel(date),
        weekday: formatWeekday(date),
        location: location.trim(),
        nickname: currentNickname,
        photos: normalizePhotoCoverFlags(photos),
        text: text.trim() || '어떤 하루였나요?',
        liked: false,
        likeCount: 0,
        commentCount: 0,
        comments: [],
      });
      revokePhotoPreviewUrls(photos);
      onNavigate('list');
    } catch (createError) {
      setError(createError.message || '일기를 저장하지 못했어요.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    createDiaryEntry();
  }

  return (
    <motion.section className="phone upload-screen" {...screenMotionProps('upload', transitionKind, true, screenPushDistance)}>
      <img className="paper-bg" src={assets.bg} alt="" />
      <NavHeader onNavigate={onNavigate} />
      <motion.div className="upload-content" data-grid-rows={uploadGridRows} variants={uploadContentVariants} initial="hidden" animate="visible">
        <AnimatedUploadField order={0}>
          <UploadGrid photos={photos} onFiles={handleFiles} onRemovePhoto={removePhoto} onSelectCoverPhoto={selectCoverPhoto} />
        </AnimatedUploadField>
        <form className="entry-form" id="entry-form" onSubmit={handleSubmit}>
          <AnimatedUploadField order={1}>
            <label className="form-row">
              <span>날짜</span>
              <input ref={dateInputRef} className="form-input date-input" type="date" value={date} min={selectedWeek.startDate} max={selectedWeek.endDate || selectedWeek.startDate} onChange={(event) => setDate(event.target.value)} placeholder="날짜" aria-label="날짜" />
            </label>
          </AnimatedUploadField>
          <AnimatedUploadField order={2}>
            <label className="form-row">
              <span>위치</span>
              <input className="form-input location-input" type="text" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="위치" aria-label="위치" />
            </label>
          </AnimatedUploadField>
          <AnimatedUploadField order={3}>
            <label className="memo-field">
              <textarea placeholder="어떤 하루였나요?" value={text} onChange={(event) => setText(event.target.value)} />
            </label>
          </AnimatedUploadField>
          {error ? <p className="form-error">{error}</p> : null}
        </form>
      </motion.div>
      <div className="bottom-cta">
        <motion.button
          className="primary-upload"
          type="button"
          initial={{ borderRadius: uploadButtonRadius.small, width: uploadButtonSize.small, y: 9.5 }}
          animate={{ borderRadius: uploadButtonRadius.big, scale: isUploadPressed ? 0.97 : 1, width: primaryUploadWidth, y: 0 }}
          transition={{ ...uploadButtonTransition, scale: isUploadPressed ? uploadButtonPressSpring : uploadButtonReleaseSpring }}
          onPointerDown={() => setIsUploadPressed(true)}
          onPointerUp={releaseUploadPress}
          onPointerCancel={releaseUploadPress}
          onPointerLeave={releaseUploadPress}
          onClick={createDiaryEntry}
          disabled={isSubmitting}
        >
          <img src={assets.upload} alt="" />
          <motion.span className="upload-button-label" animate={{ fontSize: 17 }} transition={uploadButtonSizeSpring}>
            {isSubmitting ? '저장 중' : '올리기'}
          </motion.span>
        </motion.button>
      </div>
    </motion.section>
  );
}

function EditHeader({ onBack, onDelete }) {
  return (
    <header className="nav-header edit-nav-header">
      <div className="nav-row edit-nav-row">
        <button className="icon-back" type="button" onClick={onBack} aria-label="뒤로" />
        <button className="edit-delete-button" type="button" onClick={onDelete}>
          삭제하기
        </button>
      </div>
    </header>
  );
}

function LeaveEditModal({ onCancel, onLeave }) {
  return (
    <div className="edit-modal-layer" role="presentation">
      <motion.section className="edit-leave-modal" role="dialog" aria-modal="true" aria-labelledby="leave-edit-title" {...editModalMotion}>
        <div className="edit-modal-copy">
          <strong id="leave-edit-title">나가시겠어요?</strong>
          <p>수정사항이 저장되지 않아요.</p>
        </div>
        <div className="edit-modal-actions">
          <button className="edit-modal-button edit-modal-cancel" type="button" onClick={onCancel}>
            취소
          </button>
          <button className="edit-modal-button edit-modal-leave" type="button" onClick={onLeave}>
            나가기
          </button>
        </div>
      </motion.section>
    </div>
  );
}

function EditEntry({ entry, transitionKind, screenPushDistance, onNavigate, onUpdateEntry, onDeleteEntry }) {
  const normalizedEntry = normalizeDiaryEntry(entry);
  const [photos, setPhotos] = useState(() => normalizePhotoCoverFlags(normalizedEntry.photos.map((photo) => ({ ...photo, src: getPhotoSrc(photo) }))));
  const [date, setDate] = useState(normalizedEntry.date);
  const [location, setLocation] = useState(normalizedEntry.location);
  const [text, setText] = useState(normalizedEntry.text);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSavePressed, setIsSavePressed] = useState(false);
  const releaseSavePress = () => setIsSavePressed(false);
  const primaryUploadWidth = Math.max(uploadButtonSize.small, screenPushDistance - 32);
  const uploadGridRows = Math.ceil((photos.length + (photos.length < maxUploadPhotos ? 1 : 0)) / uploadGridColumnCount) || 1;

  async function handleFiles(event) {
    const files = Array.from(event.target.files || [])
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, Math.max(0, maxUploadPhotos - photos.length));

    const selected = files.map((file) => ({
        id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
        name: file.name,
        file,
        src: createPhotoPreviewUrl(file),
      }));

    if (selected.length > 0) setPhotos((current) => [...current, ...selected].slice(0, maxUploadPhotos));
    event.target.value = '';
  }

  function removePhoto(photoId) {
    setPhotos((current) => {
      const removed = current.find((photo) => photo.id === photoId);
      if (removed?.file && removed.src?.startsWith('blob:')) URL.revokeObjectURL(removed.src);
      return normalizePhotoCoverFlags(current.filter((photo) => photo.id !== photoId));
    });
  }

  function selectCoverPhoto(photoId) {
    setPhotos((current) => {
      const photo = current.find((item) => item.id === photoId);
      if (!photo) return current;
      return normalizePhotoCoverFlags(current, photoId);
    });
  }

  async function saveEntry() {
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);

    try {
      await onUpdateEntry(entry.id, {
        date,
        dateLabel: formatDateLabel(date),
        weekday: formatWeekday(date),
        location: location.trim(),
        text: text.trim() || '어떤 하루였나요?',
        photos: normalizePhotoCoverFlags(photos),
      });
      revokePhotoPreviewUrls(photos);
      onNavigate('list');
    } catch (updateError) {
      setError(updateError.message || '일기를 수정하지 못했어요.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteEntry() {
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);

    try {
      await onDeleteEntry(entry.id);
      onNavigate('list');
    } catch (deleteError) {
      setError(deleteError.message || '일기를 삭제하지 못했어요.');
      setIsSubmitting(false);
    }
  }

  return (
    <motion.section className="phone upload-screen edit-screen" {...screenMotionProps('edit', transitionKind, true, screenPushDistance)}>
      <img className="paper-bg" src={assets.bg} alt="" />
      <EditHeader onBack={() => setIsDeleteModalOpen(true)} onDelete={deleteEntry} />
      <div className="upload-content edit-content" data-grid-rows={uploadGridRows}>
        <StaticUploadField>
          <UploadGrid photos={photos} onFiles={handleFiles} onRemovePhoto={removePhoto} onSelectCoverPhoto={selectCoverPhoto} />
        </StaticUploadField>
        <form
          className="entry-form"
          id="edit-entry-form"
          onSubmit={(event) => {
            event.preventDefault();
            saveEntry();
          }}
        >
          <StaticUploadField>
            <label className="form-row">
              <span>날짜</span>
              <input className="form-input date-input" type="text" value={date} onChange={(event) => setDate(event.target.value)} placeholder="날짜 선택" aria-label="날짜" />
            </label>
          </StaticUploadField>
          <StaticUploadField>
            <label className="form-row">
              <span>위치</span>
              <input className="form-input location-input" type="text" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="위치" aria-label="위치" />
            </label>
          </StaticUploadField>
          <StaticUploadField>
            <label className="memo-field">
              <textarea placeholder="어떤 하루였나요?" value={text} onChange={(event) => setText(event.target.value)} />
            </label>
          </StaticUploadField>
          {error ? <p className="form-error">{error}</p> : null}
        </form>
      </div>
      <div className="bottom-cta">
        <motion.button
          className="primary-upload"
          type="button"
          initial={{ borderRadius: uploadButtonRadius.small, width: uploadButtonSize.small, y: 9.5 }}
          animate={{ borderRadius: uploadButtonRadius.big, scale: isSavePressed ? 0.97 : 1, width: primaryUploadWidth, y: 0 }}
          transition={{ ...uploadButtonTransition, scale: isSavePressed ? uploadButtonPressSpring : uploadButtonReleaseSpring }}
          onPointerDown={() => setIsSavePressed(true)}
          onPointerUp={releaseSavePress}
          onPointerCancel={releaseSavePress}
          onPointerLeave={releaseSavePress}
          onClick={saveEntry}
          disabled={isSubmitting}
        >
          <img src={assets.upload} alt="" />
          <motion.span className="upload-button-label" animate={{ fontSize: 17 }} transition={uploadButtonSizeSpring}>
            {isSubmitting ? '저장 중' : '올리기'}
          </motion.span>
        </motion.button>
      </div>
      {isDeleteModalOpen ? <LeaveEditModal onCancel={() => setIsDeleteModalOpen(false)} onLeave={() => onNavigate('list')} /> : null}
    </motion.section>
  );
}

async function hydrateDiaryEntries(entryRows, viewerMemberId = currentMemberId) {
  const entries = entryRows || [];
  const entryIds = entries.map((entry) => entry.id);
  if (entryIds.length === 0) return [];

  const [
    { data: images = [], error: imagesError },
    { data: entryLikes = [], error: entryLikesError },
    { data: comments = [], error: commentsError },
  ] = await Promise.all([
    supabase.from('diary_images').select('id, entry_id, image_url, storage_path, sort_order, is_cover').in('entry_id', entryIds),
    supabase.from('diary_entry_likes').select('entry_id, member_id').in('entry_id', entryIds),
    supabase.from('diary_comments').select('id, entry_id, author_id, body_text, created_at').in('entry_id', entryIds).order('created_at', { ascending: true }),
  ]);

  if (imagesError) throw imagesError;
  if (entryLikesError) throw entryLikesError;
  if (commentsError) throw commentsError;

  const commentIds = comments.map((comment) => comment.id);
  const { data: commentLikes = [], error: commentLikesError } = commentIds.length > 0
    ? await supabase.from('diary_comment_likes').select('comment_id, member_id').in('comment_id', commentIds)
    : { data: [], error: null };
  const { data: commentEmojiReactions = [], error: commentEmojiReactionsError } = commentIds.length > 0
    ? await supabase.from('diary_comment_emoji_reactions').select('comment_id, emoji_id, member_id').in('comment_id', commentIds)
    : { data: [], error: null };

  if (commentLikesError) throw commentLikesError;
  if (commentEmojiReactionsError && !isMissingSupabaseSchema(commentEmojiReactionsError)) throw commentEmojiReactionsError;

  const safeCommentEmojiReactions = commentEmojiReactionsError ? [] : (commentEmojiReactions || []);
  const memberIds = Array.from(
    new Set([
      ...entries.map((entry) => entry.author_id),
      ...comments.map((comment) => comment.author_id),
      ...(commentLikes || []).map((like) => like.member_id),
      ...safeCommentEmojiReactions.map((reaction) => reaction.member_id),
    ].filter(Boolean))
  );
  const { data: members = [], error: membersError } = memberIds.length > 0
    ? await supabase.from('couple_members').select('id, nickname').in('id', memberIds)
    : { data: [], error: null };

  if (membersError) throw membersError;

  const membersById = new Map(members.map((member) => [member.id, member.nickname]));
  const imagesByEntry = groupBy(images, (image) => image.entry_id);
  const likesByEntry = groupBy(entryLikes, (like) => like.entry_id);
  const commentsByEntry = groupBy(comments, (comment) => comment.entry_id);
  const likesByComment = groupBy(commentLikes, (like) => like.comment_id);
  const emojiReactionsByComment = mapCommentEmojiReactionRows(safeCommentEmojiReactions, membersById);

  return sortEntriesByDate(
    entries.map((entry) => {
      const entryImages = (imagesByEntry.get(entry.id) || [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((image) => ({
          id: image.id,
          src: image.image_url,
          storagePath: image.storage_path,
          storage_path: image.storage_path,
          sortOrder: image.sort_order,
          sort_order: image.sort_order,
          isCover: Boolean(image.is_cover),
          is_cover: Boolean(image.is_cover),
        }));
      const likes = likesByEntry.get(entry.id) || [];
      const entryComments = (commentsByEntry.get(entry.id) || [])
        .slice()
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .map((comment) => {
          const likes = likesByComment.get(comment.id) || [];
          return {
            id: comment.id,
            nickname: membersById.get(comment.author_id) || getNicknameForMemberId(comment.author_id),
            text: comment.body_text,
            createdAt: comment.created_at,
            created_at: comment.created_at,
            liked: likes.some((like) => like.member_id === viewerMemberId),
            likeCount: likes.length,
            likedByNicknames: Array.from(new Set(likes.map((like) => membersById.get(like.member_id) || getNicknameForMemberId(like.member_id)))),
            emojiReactions: emojiReactionsByComment[comment.id] || {},
          };
        });

      return {
        id: entry.id,
        weekId: getWeekIdForDate(entry.diary_date),
        date: entry.diary_date,
        dateLabel: formatDateLabel(entry.diary_date),
        weekday: formatWeekday(entry.diary_date),
        nickname: membersById.get(entry.author_id) || getNicknameForMemberId(entry.author_id),
        photos: normalizePhotoCoverFlags(entryImages),
        text: entry.body_text,
        location: entry.location_text || '',
        createdAt: entry.created_at,
        created_at: entry.created_at,
        liked: likes.some((like) => like.member_id === viewerMemberId),
        likeCount: likes.length,
        commentCount: entryComments.length,
        comments: entryComments,
      };
    })
  );
}

async function fetchDiaryEntries(viewerMemberId = currentMemberId) {
  if (!hasSupabaseConfig) return readLocalEntries();

  const { data: entryRows, error: entriesError } = await supabase
    .from('diary_entries')
    .select('id, author_id, diary_date, location_text, body_text, created_at')
    .eq('space_id', coupleSpaceId)
    .order('diary_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(0, diaryEntryFetchPageSize - 1);

  if (entriesError) throw entriesError;
  return hydrateDiaryEntries(entryRows || [], viewerMemberId);
}

async function fetchDiaryEntriesForMonth(monthStart, viewerMemberId = currentMemberId) {
  if (!hasSupabaseConfig) return readLocalEntries().filter((entry) => getMonthKeyForDate(entry.date) === getMonthKey(monthStart));

  const { start, end } = getMonthDateRange(monthStart);
  const { data: entryRows, error } = await supabase
    .from('diary_entries')
    .select('id, author_id, diary_date, location_text, body_text, created_at')
    .eq('space_id', coupleSpaceId)
    .gte('diary_date', start)
    .lt('diary_date', end)
    .order('diary_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return hydrateDiaryEntries(entryRows || [], viewerMemberId);
}

async function fetchAvailableDiaryMonthKeys() {
  if (!hasSupabaseConfig) {
    return Array.from(new Set(readLocalEntries().map((entry) => getMonthKeyForDate(entry.date)))).sort();
  }

  const { data, error } = await supabase
    .from('diary_entries')
    .select('diary_date')
    .eq('space_id', coupleSpaceId)
    .order('diary_date', { ascending: true });

  if (error) throw error;
  return Array.from(new Set((data || []).map((entry) => getMonthKeyForDate(entry.diary_date)))).filter(Boolean);
}

async function fetchDiaryEntryById(entryId, viewerMemberId = currentMemberId) {
  if (!hasSupabaseConfig || !isSupabaseUuid(entryId)) return null;

  const { data: entryRow, error } = await supabase
    .from('diary_entries')
    .select('id, author_id, diary_date, location_text, body_text, created_at')
    .eq('space_id', coupleSpaceId)
    .eq('id', entryId)
    .maybeSingle();

  if (error) throw error;
  const [entry] = await hydrateDiaryEntries(entryRow ? [entryRow] : [], viewerMemberId);
  return entry || null;
}

function mergeEntriesById(currentEntries, nextEntries) {
  const entriesById = new Map(currentEntries.map((entry) => [entry.id, entry]));
  nextEntries.forEach((entry) => entriesById.set(entry.id, entry));
  return sortEntriesByDate(Array.from(entriesById.values()));
}

async function fetchHomeStickers() {
  const localStickers = readLocalStickers();
  if (!hasSupabaseConfig) return localStickers;

  const { data, error } = await supabase
    .from('home_stickers')
    .select('month_key, stickers, updated_by, updated_at')
    .eq('space_id', coupleSpaceId);

  if (error) {
    if (isMissingSupabaseSchema(error)) return readLocalStickers();
    throw error;
  }

  const stickers = normalizeStickersByMonth(data);
  const missingLocalEntries = Object.entries(localStickers).filter(
    ([monthKey, monthStickers]) => !Object.prototype.hasOwnProperty.call(stickers, monthKey) && monthStickers?.length
  );
  if (missingLocalEntries.length > 0) {
    await Promise.all(
      missingLocalEntries.map(([monthKey, monthStickers]) =>
        saveHomeMonthStickers(monthKey, monthStickers).catch((error) => {
          console.warn('Local sticker migration failed', error);
        })
      )
    );
  }

  const mergedStickers = {
    ...localStickers,
    ...stickers,
  };
  writeLocalStickers(mergedStickers);
  return mergedStickers;
}

async function saveHomeMonthStickers(monthKey, stickers, memberId = currentMemberId) {
  const normalizedStickers = (stickers || []).map((sticker) => normalizeSticker(sticker));
  if (!hasSupabaseConfig) {
    return normalizedStickers;
  }

  const { error } = await supabase
    .from('home_stickers')
    .upsert(
      {
        space_id: coupleSpaceId,
        month_key: monthKey,
        stickers: normalizedStickers,
        updated_by: memberId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'space_id,month_key' }
    );

  if (error) {
    if (isMissingSupabaseSchema(error)) return normalizedStickers;
    throw error;
  }

  return normalizedStickers;
}

function isMissingSupabaseSchema(error) {
  if (!error) return false;
  const message = `${error.message || ''} ${error.details || ''} ${error.hint || ''} ${error.code || ''}`;
  return (
    message.includes('schema cache') ||
    message.includes('couple_spaces') ||
    message.includes('couple_members') ||
    message.includes('diary_entries') ||
    message.includes('diary_images') ||
    message.includes('diary_comments') ||
    message.includes('diary_entry_likes') ||
    message.includes('diary_comment_likes') ||
    message.includes('diary_comment_emoji_reactions') ||
    message.includes('is_cover') ||
    message.includes('home_stickers') ||
    message.includes('PGRST200') ||
    message.includes('PGRST205')
  );
}

function isDiaryImagesPolicyError(error) {
  if (!error) return false;
  const message = `${error.message || ''} ${error.details || ''} ${error.hint || ''} ${error.code || ''}`;
  return message.includes('row-level security') && message.includes('diary_images');
}

function withTimeout(promise, timeoutMs, message) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    window.clearTimeout(timeoutId);
  });
}

async function uploadDiaryPhotos(entryId, photos) {
  const normalizedPhotos = normalizePhotoCoverFlags(photos);
  if (!hasSupabaseConfig) {
    return normalizedPhotos.map((photo, index) => ({
      entry_id: entryId,
      image_url: photo.src,
      storage_path: '',
      sort_order: index,
      is_cover: isCoverPhoto(photo),
    }));
  }

  const uploaded = [];

  for (const [index, photo] of normalizedPhotos.entries()) {
    if (!photo.file) continue;
    const uploadFile = await compressPhotoForUpload(photo.file);
    const extension = uploadFile.name.split('.').pop() || 'jpg';
    const storagePath = `${coupleSpaceId}/${entryId}/${index}-${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from(storageBucket).upload(storagePath, uploadFile, {
      cacheControl: storageCacheControlSeconds,
      upsert: false,
    });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(storageBucket).getPublicUrl(storagePath);
    uploaded.push({
      entry_id: entryId,
      image_url: data.publicUrl,
      storage_path: storagePath,
      sort_order: index,
      is_cover: isCoverPhoto(photo),
    });
  }

  return uploaded;
}

async function saveDiaryImages(entryId, photos) {
  const images = await buildPersistedDiaryPhotos(entryId, photos);
  if (!hasSupabaseConfig || images.length === 0) return images;

  const { data, error } = await supabase
    .from('diary_images')
    .insert(images)
    .select('id, image_url, storage_path, sort_order, is_cover');

  if (error) throw error;
  return data || images;
}

async function buildPersistedDiaryPhotos(entryId, photos) {
  const normalizedPhotos = normalizePhotoCoverFlags(photos);
  const newUploads = await uploadDiaryPhotos(entryId, normalizedPhotos);
  let uploadIndex = 0;

  return normalizedPhotos.map((photo, index) => {
    if (photo.file) {
      const uploaded = newUploads[uploadIndex];
      uploadIndex += 1;
      return { ...uploaded, sort_order: index, is_cover: isCoverPhoto(photo) };
    }

    return {
      ...(isSupabaseUuid(photo.id) ? { id: photo.id } : {}),
      entry_id: entryId,
      image_url: getPhotoSrc(photo),
      storage_path: photo.storagePath || photo.storage_path || '',
      sort_order: index,
      is_cover: isCoverPhoto(photo),
    };
  });
}

async function saveChangedDiaryImages(entryId, currentPhotos, nextPhotos) {
  const normalizedNextPhotos = normalizePhotoCoverFlags(nextPhotos);
  const currentImageIds = (currentPhotos || []).map((photo) => photo.id).filter(isSupabaseUuid);
  const nextExistingIds = new Set(normalizedNextPhotos.filter((photo) => !photo.file).map((photo) => photo.id).filter(isSupabaseUuid));
  const removedImageIds = currentImageIds.filter((photoId) => !nextExistingIds.has(photoId));

  if (removedImageIds.length > 0) {
    const { error: deleteImagesError } = await supabase.from('diary_images').delete().in('id', removedImageIds);
    if (deleteImagesError) throw deleteImagesError;
  }

  if (currentImageIds.length > 0) {
    const { error: clearCoverError } = await supabase.from('diary_images').update({ is_cover: false }).in('id', currentImageIds);
    if (clearCoverError) throw clearCoverError;
  }

  const maxSortOrder = (currentPhotos || []).reduce((maxOrder, photo) => {
    const sortOrder = Number(photo.sortOrder ?? photo.sort_order);
    return Number.isFinite(sortOrder) ? Math.max(maxOrder, sortOrder) : maxOrder;
  }, -1);
  const newPhotos = normalizedNextPhotos.filter((photo) => photo.file);
  const uploadedImages = await uploadDiaryPhotos(entryId, newPhotos);
  const insertedImages = uploadedImages.map((image, index) => ({ ...image, sort_order: maxSortOrder + index + 1 }));

  if (insertedImages.length > 0) {
    const { data, error: insertImagesError } = await supabase
      .from('diary_images')
      .insert(insertedImages)
      .select('id, image_url, storage_path, sort_order, is_cover');
    if (insertImagesError) throw insertImagesError;
    insertedImages.splice(0, insertedImages.length, ...(data || insertedImages));
  }

  const updateResults = await Promise.all(
    normalizedNextPhotos
      .filter((photo) => !photo.file && isSupabaseUuid(photo.id))
      .map((photo, index) =>
        supabase
          .from('diary_images')
          .update({ sort_order: index, is_cover: isCoverPhoto(photo) })
          .eq('id', photo.id)
      )
  );
  const updateImagesError = updateResults.find((result) => result.error)?.error;
  if (updateImagesError) throw updateImagesError;

  let uploadIndex = 0;
  return normalizedNextPhotos.map((photo, index) => {
    if (photo.file) {
      const uploaded = insertedImages[uploadIndex];
      uploadIndex += 1;
      return {
        id: uploaded?.id || photo.id || `${entryId}-${index}`,
        src: uploaded?.image_url || getPhotoSrc(photo),
        storagePath: uploaded?.storage_path || photo.storagePath || photo.storage_path || '',
        storage_path: uploaded?.storage_path || photo.storagePath || photo.storage_path || '',
        sortOrder: uploaded?.sort_order ?? maxSortOrder + uploadIndex,
        sort_order: uploaded?.sort_order ?? maxSortOrder + uploadIndex,
        isCover: Boolean(uploaded?.is_cover ?? isCoverPhoto(photo)),
        is_cover: Boolean(uploaded?.is_cover ?? isCoverPhoto(photo)),
      };
    }

    return {
      id: photo.id || `${entryId}-${index}`,
      src: getPhotoSrc(photo),
      storagePath: photo.storagePath || photo.storage_path || '',
      storage_path: photo.storagePath || photo.storage_path || '',
      sortOrder: photo.sortOrder ?? photo.sort_order ?? index,
      sort_order: photo.sortOrder ?? photo.sort_order ?? index,
      isCover: isCoverPhoto(photo),
      is_cover: isCoverPhoto(photo),
    };
  });
}

function buildLocalSavedEntry(entry, entryId, images) {
  const createdAt = entry.createdAt || entry.created_at || new Date().toISOString();
  const localImages =
    images ||
    normalizePhotoCoverFlags(entry.photos).map((photo, index) => ({
      id: photo.id || `${entryId}-${index}`,
      src: getPhotoSrc(photo),
      storagePath: '',
      is_cover: isCoverPhoto(photo),
    }));

  return {
    ...entry,
    id: entryId,
    weekId: getWeekIdForDate(entry.date),
    createdAt,
    created_at: createdAt,
    photos: localImages.map((image, index) => ({
      id: image.id || `${entryId}-${index}`,
      src: image.image_url || image.src,
      storagePath: image.storage_path || image.storagePath || '',
      storage_path: image.storage_path || image.storagePath || '',
      sortOrder: image.sort_order ?? image.sortOrder ?? index,
      sort_order: image.sort_order ?? image.sortOrder ?? index,
      isCover: Boolean(image.is_cover ?? image.isCover),
      is_cover: Boolean(image.is_cover ?? image.isCover),
    })),
  };
}

function addLocalCommentToEntries(entries, entryId, comment) {
  return entries.map((entry) =>
    entry.id === entryId
      ? {
          ...entry,
          commentCount: (typeof entry.commentCount === 'number' ? entry.commentCount : (entry.comments || []).length) + 1,
          comments: sortCommentsByCreatedAt([comment, ...(entry.comments || [])]),
        }
      : entry
  );
}

function removeLocalCommentFromEntries(entries, entryId, commentId) {
  return entries.map((entry) => {
    if (entry.id !== entryId) return entry;

    const nextComments = (entry.comments || []).filter((comment) => comment.id !== commentId);
    return {
      ...entry,
      commentCount: nextComments.length,
      comments: nextComments,
    };
  });
}

function updateLocalCommentInEntries(entries, entryId, commentId, text) {
  return entries.map((entry) => {
    if (entry.id !== entryId) return entry;

    return {
      ...entry,
      comments: (entry.comments || []).map((comment) => (comment.id === commentId ? { ...comment, text, body_text: text } : comment)),
    };
  });
}

function updateLocalEntry(entries, entryId, changes) {
  return sortEntriesByDate(
    entries.map((entry) =>
      entry.id === entryId
        ? {
            ...entry,
            ...changes,
            weekId: getWeekIdForDate(changes.date || entry.date),
            dateLabel: formatDateLabel(changes.date || entry.date),
            weekday: formatWeekday(changes.date || entry.date),
          }
        : entry
    )
  );
}

function requireSupabasePersistedEntry(entryId) {
  if (isSupabaseUuid(entryId)) return;
  throw new Error('이전 로컬 임시 일기는 서버에 저장할 수 없어요. 새로 올려주세요.');
}

function SplashScreen() {
  return (
    <motion.div
      className="splash-screen"
      role="status"
      aria-label="앱 로딩 중"
      initial={false}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: [0, 0, 0.58, 1] }}
    >
      <img className="splash-logo" src={assets.logo} alt="" />
    </motion.div>
  );
}

export default function App() {
  const [screen, setScreen] = useState('home');
  const [previousScreen, setPreviousScreen] = useState(null);
  const [screenTransition, setScreenTransition] = useState('none');
  const [homeMonth, setHomeMonth] = useState(getInitialHomeMonth);
  const [homeMonthScrollTops, setHomeMonthScrollTops] = useState({});
  const [selectedWeek, setSelectedWeek] = useState(initialWeeks[0]);
  const [entries, setEntries] = useState([]);
  const [availableDiaryMonthKeys, setAvailableDiaryMonthKeys] = useState([]);
  const [stickersByMonth, setStickersByMonth] = useState(readLocalStickers);
  const [selectedEntryId, setSelectedEntryId] = useState(null);
  const [deepLinkedCommentId, setDeepLinkedCommentId] = useState('');
  const [shouldOpenUploadDatePicker, setShouldOpenUploadDatePicker] = useState(false);
  const [selectedNickname, setSelectedNickname] = useState(readSelectedNickname);
  const [isNicknamePickerOpen, setIsNicknamePickerOpen] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [isSplashMinimumElapsed, setIsSplashMinimumElapsed] = useState(false);
  const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false);
  const [pushPermission, setPushPermission] = useState(() => (isWebPushSupported() ? Notification.permission : 'unsupported'));
  const [isPushPromptDismissed, setIsPushPromptDismissed] = useState(false);
  const [isPushSaving, setIsPushSaving] = useState(false);
  const [pushSubscriptionStatus, setPushSubscriptionStatus] = useState('idle');
  const screenRef = useRef(screen);
  const previousScreenRef = useRef(previousScreen);
  const shouldIgnoreNextPopState = useRef(false);
  const homeEdgeBackSwipeBlocker = useRef({ active: false, startX: 0, startY: 0 });
  const consumedDeepLinkedEntryId = useRef('');
  const consumedDeepLinkedMonthKey = useRef('');
  const loadedDiaryMonthKeys = useRef(new Set());
  const pendingDiaryMonthKeys = useRef(new Set());
  const listStateByWeek = useRef(new Map());
  const screenTransitionResetTimer = useRef(null);
  const screenTransitionRunId = useRef(0);
  const screenPushDistance = useViewportWidth();
  const memberPair = useMemo(() => getMemberPairForNickname(selectedNickname), [selectedNickname]);
  const selectedMemberId = memberPair.selectedMemberId;
  const selectedMemberNickname = memberPair.selectedNickname;
  const [notificationReadAt, setNotificationReadAt] = useState(() => readNotificationReadAt(selectedMemberId));
  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId) || entries.find((entry) => entry.weekId === selectedWeek.id);
  const notifications = useMemo(() => buildNotifications(entries, selectedMemberNickname, stickersByMonth), [entries, selectedMemberNickname, stickersByMonth]);
  const notificationReadTime = getNotificationTimeValue(notificationReadAt);
  const hasUnreadNotifications = notifications.some((notification) => notification.timeValue > notificationReadTime);
  const isPushConfigured = isWebPushConfigured();
  const isPushSupported = isWebPushSupported();
  const canShowPushPrompt =
    isPushConfigured &&
    pushPermission !== 'granted' &&
    !isPushPromptDismissed;
  const showSplash = !isSplashMinimumElapsed || !isInitialDataLoaded;

  function setEntriesAndCache(nextEntriesOrUpdater) {
    setEntries((current) => {
      const nextEntries = typeof nextEntriesOrUpdater === 'function' ? nextEntriesOrUpdater(current) : nextEntriesOrUpdater;
      const sortedEntries = sortEntriesByDate(nextEntries);
      if (!hasSupabaseConfig) writeLocalEntries(sortedEntries);
      return sortedEntries;
    });
  }

  function setStickersAndCache(nextStickersOrUpdater) {
    setStickersByMonth((current) => {
      const nextStickers = typeof nextStickersOrUpdater === 'function' ? nextStickersOrUpdater(current) : nextStickersOrUpdater;
      writeLocalStickers(nextStickers);
      return nextStickers;
    });
  }

  function saveHomeMonthScrollTop(monthKey, scrollTop) {
    if (!monthKey) return;
    setHomeMonthScrollTops((current) => {
      if (current[monthKey] === scrollTop) return current;
      return {
        ...current,
        [monthKey]: scrollTop,
      };
    });
  }

  function addAvailableDiaryMonthKey(monthKey) {
    if (!monthKey) return;
    setAvailableDiaryMonthKeys((current) => (current.includes(monthKey) ? current : [...current, monthKey].sort()));
  }

  async function persistMonthStickers(monthKey, stickers, memberId = selectedMemberId) {
    try {
      await saveHomeMonthStickers(monthKey, stickers, memberId);
      setLoadError('');
    } catch (error) {
      setLoadError(error.message || '스티커를 서버에 저장하지 못했어요.');
    }
  }

  async function loadDiaryMonth(monthDate, memberId = selectedMemberId) {
    if (!hasSupabaseConfig) return;
    const monthKey = getMonthKey(monthDate);
    if (loadedDiaryMonthKeys.current.has(monthKey) || pendingDiaryMonthKeys.current.has(monthKey)) return;

    pendingDiaryMonthKeys.current.add(monthKey);
    try {
      const monthEntries = await withTimeout(
        fetchDiaryEntriesForMonth(monthDate, memberId),
        monthDataLoadTimeoutMs,
        '월별 일기 요청이 지연되고 있어요.'
      );
      loadedDiaryMonthKeys.current.add(monthKey);
      setEntriesAndCache((current) => mergeEntriesById(current, monthEntries));
      setLoadError('');
    } catch (error) {
      setLoadError(error.message || '월별 일기를 불러오지 못했어요.');
    } finally {
      pendingDiaryMonthKeys.current.delete(monthKey);
    }
  }

  useEffect(() => {
    let isMounted = true;
    let didFinishInitialLoad = false;
    loadedDiaryMonthKeys.current = new Set();
    pendingDiaryMonthKeys.current = new Set();

    const emergencyReleaseTimer = window.setTimeout(() => {
      if (!isMounted || didFinishInitialLoad) return;
      const localEntries = readLocalEntries();
      const localStickers = readLocalStickers();
      setEntriesAndCache(localEntries);
      setStickersAndCache(localStickers);
      setAvailableDiaryMonthKeys(Array.from(new Set(localEntries.map((entry) => getMonthKeyForDate(entry.date)))).sort());
      setSelectedEntryId(localEntries[0]?.id || null);
      setLoadError('서버 응답이 지연되어 임시로 저장된 화면을 먼저 보여드릴게요.');
      setIsInitialDataLoaded(true);
    }, splashEmergencyReleaseMs);

    withTimeout(
      Promise.all([fetchDiaryEntries(selectedMemberId), fetchAvailableDiaryMonthKeys(), fetchHomeStickers()]),
      initialDataLoadTimeoutMs,
      '초기 데이터를 불러오는 중 서버 응답이 지연되고 있어요.'
    )
      .then(([nextEntries, nextAvailableDiaryMonthKeys, nextStickers]) => {
        if (!isMounted) return;
        setEntriesAndCache(nextEntries);
        setAvailableDiaryMonthKeys(nextAvailableDiaryMonthKeys);
        setStickersAndCache(nextStickers);
        setSelectedEntryId(nextEntries[0]?.id || null);
        setLoadError('');
      })
      .catch((error) => {
        if (!isMounted) return;
        const localEntries = readLocalEntries();
        const localStickers = readLocalStickers();
        setEntriesAndCache(localEntries);
        setStickersAndCache(localStickers);
        setAvailableDiaryMonthKeys(Array.from(new Set(localEntries.map((entry) => getMonthKeyForDate(entry.date)))).sort());
        setSelectedEntryId(localEntries[0]?.id || null);
        setLoadError(error.message || '일기를 불러오지 못했어요.');
      })
      .finally(() => {
        if (!isMounted) return;
        didFinishInitialLoad = true;
        window.clearTimeout(emergencyReleaseTimer);
        setIsInitialDataLoaded(true);
      });

    return () => {
      isMounted = false;
      window.clearTimeout(emergencyReleaseTimer);
    };
  }, [selectedMemberId]);

  useEffect(() => {
    if (!isInitialDataLoaded) return;
    void loadDiaryMonth(homeMonth, selectedMemberId);
  }, [homeMonth, isInitialDataLoaded, selectedMemberId]);

  useEffect(() => {
    setNotificationReadAt(readNotificationReadAt(selectedMemberId));
  }, [selectedMemberId]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setIsSplashMinimumElapsed(true);
    }, splashMinimumDurationMs);

    return () => window.clearTimeout(timerId);
  }, []);

  useEffect(() => {
    if (!hasSupabaseConfig) return undefined;

    const channel = supabase
      .channel(`home-stickers:${coupleSpaceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'home_stickers', filter: `space_id=eq.${coupleSpaceId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const deletedMonthKey = payload.old?.month_key;
            if (!deletedMonthKey) return;
            setStickersAndCache((current) => {
              const next = { ...current };
              delete next[deletedMonthKey];
              return next;
            });
            return;
          }

          const row = payload.new;
          if (!row?.month_key) return;
          setStickersAndCache((current) => ({
            ...current,
            [row.month_key]: Array.isArray(row.stickers) ? row.stickers.map((sticker, index) => normalizeSticker(sticker, `${row.month_key}-${index}`)) : [],
          }));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!hasSupabaseConfig) return undefined;

    const channel = supabase
      .channel(`comment-likes:${coupleSpaceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'diary_comment_likes' }, (payload) => {
        const row = payload.eventType === 'DELETE' ? payload.old : payload.new;
        const commentId = row?.comment_id;
        const nickname = getNicknameForMemberId(row?.member_id);
        if (!commentId || !nickname) return;

        setEntriesAndCache((current) =>
          current.map((entry) => ({
            ...entry,
            comments: (entry.comments || []).map((comment) => {
              if (comment.id !== commentId) return comment;

              const currentLikedBy = Array.from(new Set(comment.likedByNicknames || []));
              const nextLikedBy = payload.eventType === 'DELETE'
                ? currentLikedBy.filter((item) => normalizeSelectedNickname(item) !== normalizeSelectedNickname(nickname))
                : Array.from(new Set([...currentLikedBy, nickname]));

              return {
                ...comment,
                liked: nextLikedBy.some((item) => normalizeSelectedNickname(item) === normalizeSelectedNickname(selectedMemberNickname)),
                likeCount: nextLikedBy.length,
                likedByNicknames: nextLikedBy,
              };
            }),
          }))
        );
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [selectedMemberNickname]);

  useEffect(() => {
    if (!hasSupabaseConfig) return undefined;

    const channel = supabase
      .channel(`comment-emoji-reactions:${coupleSpaceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'diary_comment_emoji_reactions' }, (payload) => {
        const row = payload.eventType === 'DELETE' ? payload.old : payload.new;
        const commentId = row?.comment_id;
        const emojiId = row?.emoji_id;
        const nickname = getNicknameForMemberId(row?.member_id);
        if (!commentId || !emojiId || !nickname) return;

        setEntriesAndCache((current) =>
          current.map((entry) => ({
            ...entry,
            comments: (entry.comments || []).map((comment) => {
              if (comment.id !== commentId) return comment;

              const currentReaction = comment.emojiReactions?.[emojiId];
              const nextReaction = payload.eventType === 'DELETE'
                ? removeCommentEmojiReactionValue(currentReaction, nickname)
                : addCommentEmojiReactionValue(currentReaction, nickname);
              const nextEmojiReactions = { ...(comment.emojiReactions || {}) };
              if (nextReaction.count > 0) {
                nextEmojiReactions[emojiId] = nextReaction;
              } else {
                delete nextEmojiReactions[emojiId];
              }

              return {
                ...comment,
                emojiReactions: nextEmojiReactions,
              };
            }),
          }))
        );
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [entries]);

  useEffect(() => {
    screenRef.current = screen;
    previousScreenRef.current = previousScreen;
  }, [screen, previousScreen]);

  useEffect(() => {
    const edgeWidth = 34;

    function resetHomeEdgeBackSwipeBlocker() {
      homeEdgeBackSwipeBlocker.current.active = false;
    }

    function handleHomeEdgeTouchStart(event) {
      if (screenRef.current !== 'home' || event.touches.length !== 1) {
        resetHomeEdgeBackSwipeBlocker();
        return;
      }

      const touch = event.touches[0];
      const isLeftEdgeTouch = touch.clientX <= edgeWidth;
      homeEdgeBackSwipeBlocker.current = {
        active: isLeftEdgeTouch,
        startX: touch.clientX,
        startY: touch.clientY,
      };

      if (isLeftEdgeTouch && event.cancelable) {
        event.preventDefault();
      }
    }

    function handleHomeEdgeTouchMove(event) {
      const blocker = homeEdgeBackSwipeBlocker.current;
      if (!blocker.active || screenRef.current !== 'home' || event.touches.length !== 1) return;

      const touch = event.touches[0];
      const deltaX = touch.clientX - blocker.startX;
      const deltaY = touch.clientY - blocker.startY;
      const isBackSwipeMotion = deltaX >= 0 && Math.abs(deltaX) >= Math.abs(deltaY);

      if (isBackSwipeMotion && event.cancelable) {
        event.preventDefault();
      }
    }

    window.addEventListener('touchstart', handleHomeEdgeTouchStart, { capture: true, passive: false });
    window.addEventListener('touchmove', handleHomeEdgeTouchMove, { capture: true, passive: false });
    window.addEventListener('touchend', resetHomeEdgeBackSwipeBlocker, true);
    window.addEventListener('touchcancel', resetHomeEdgeBackSwipeBlocker, true);

    return () => {
      window.removeEventListener('touchstart', handleHomeEdgeTouchStart, true);
      window.removeEventListener('touchmove', handleHomeEdgeTouchMove, true);
      window.removeEventListener('touchend', resetHomeEdgeBackSwipeBlocker, true);
      window.removeEventListener('touchcancel', resetHomeEdgeBackSwipeBlocker, true);
    };
  }, []);

  useEffect(() => () => {
    if (screenTransitionResetTimer.current) window.clearTimeout(screenTransitionResetTimer.current);
  }, []);

  useEffect(() => {
    if (!isInitialDataLoaded) return;

    const entryId = getDeepLinkedEntryId();
    const commentId = getDeepLinkedCommentId();
    const deepLinkKey = `${entryId}:${commentId}`;
    if (!entryId || consumedDeepLinkedEntryId.current === deepLinkKey) return;

    let isMounted = true;

    async function openDeepLinkedEntry() {
      let linkedEntry = entries.find((entry) => entry.id === entryId);

      if (hasSupabaseConfig && (!linkedEntry || commentId)) {
        try {
          const freshEntry = await fetchDiaryEntryById(entryId, selectedMemberId);
          if (freshEntry) {
            linkedEntry = freshEntry;
            if (isMounted) {
              setEntriesAndCache((current) => mergeEntriesById(current, [freshEntry]));
            }
          }
        } catch (error) {
          if (!linkedEntry) {
            if (isMounted) setLoadError(error.message || '링크된 일기를 불러오지 못했어요.');
            return;
          }
        }
      }

      if (!isMounted || !linkedEntry) {
        consumedDeepLinkedEntryId.current = deepLinkKey;
        return;
      }

      consumedDeepLinkedEntryId.current = deepLinkKey;
      setSelectedEntryId(linkedEntry.id);
      setDeepLinkedCommentId(commentId);
      setHomeMonth(getMonthStartForDate(linkedEntry.date));
      setSelectedWeek(getWeekForEntry(linkedEntry, mergeEntriesById(entries, [linkedEntry])));
      pushDeepLinkedCommentHistoryState();
      applyNavigation('comment', { pushHistory: false, animate: false });
    }

    void openDeepLinkedEntry();

    return () => {
      isMounted = false;
    };
  }, [entries, isInitialDataLoaded, selectedMemberId]);

  useEffect(() => {
    const monthKey = getDeepLinkedMonthKey();
    if (!monthKey || getDeepLinkedEntryId() || consumedDeepLinkedMonthKey.current === monthKey) return;

    const linkedMonth = getMonthStartForMonthKey(monthKey);
    if (!linkedMonth || isFutureMonth(linkedMonth)) return;

    consumedDeepLinkedMonthKey.current = monthKey;
    setHomeMonth(linkedMonth);
    applyNavigation('home', { pushHistory: false, animate: false });
  }, []);

  useEffect(() => {
    replaceHomeHistoryState('guard');
    pushHomeHistoryState();
  }, []);

  useEffect(() => {
    if (!isWebPushSupported()) return undefined;
    let isRefreshingSubscription = false;

    async function syncPushPermission() {
      const permission = Notification.permission;
      setPushPermission(permission);

      if (permission !== 'granted') {
        setIsPushPromptDismissed(false);
        setPushSubscriptionStatus('idle');
        return;
      }

      setIsPushPromptDismissed(true);
      if (!isWebPushConfigured() || isRefreshingSubscription) return;

      isRefreshingSubscription = true;
      setPushSubscriptionStatus('saving');
      try {
        await subscribeToWebPush(selectedMemberId);
        setPushSubscriptionStatus('saved');
      } catch (error) {
        console.warn('Web push subscription refresh failed', error);
        setIsPushPromptDismissed(true);
        setPushSubscriptionStatus('error');
      } finally {
        isRefreshingSubscription = false;
      }
    }

    syncPushPermission();
    window.addEventListener('focus', syncPushPermission);
    document.addEventListener('visibilitychange', syncPushPermission);

    return () => {
      window.removeEventListener('focus', syncPushPermission);
      document.removeEventListener('visibilitychange', syncPushPermission);
    };
  }, [selectedMemberId]);

  async function enablePushNotifications({ forceRefresh = false } = {}) {
    setIsPushSaving(true);
    setPushSubscriptionStatus('saving');

    try {
      const permission = await subscribeToWebPush(selectedMemberId, { forceRefresh });
      setPushPermission(permission);
      setIsPushPromptDismissed(permission === 'granted' || permission === 'unsupported');
      setPushSubscriptionStatus(permission === 'granted' ? 'saved' : 'idle');
    } catch (error) {
      console.warn('Web push subscription failed', error);
      setPushSubscriptionStatus('error');
      setLoadError('알림 설정을 완료하지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsPushSaving(false);
    }
  }

  function dismissPushPrompt() {
    setIsPushPromptDismissed(true);
  }

  function reconnectPushNotifications() {
    void enablePushNotifications({ forceRefresh: true });
  }

  function getHomeHistoryState(kind = 'entry') {
    return {
      avocadooScreen: 'home',
      avocadooHomeHistory: kind,
    };
  }

  function replaceHomeHistoryState(kind = 'entry') {
    window.history.replaceState(getHomeHistoryState(kind), '', window.location.href);
  }

  function pushHomeHistoryState() {
    window.history.pushState(getHomeHistoryState('entry'), '', window.location.href);
  }

  function pushDeepLinkedCommentHistoryState() {
    if (typeof window === 'undefined') return;

    window.history.replaceState({ avocadooScreen: 'list', avocadooDeepLinkBase: true }, '', window.location.href);
    window.history.pushState({ avocadooScreen: 'comment', avocadooDeepLink: true }, '', window.location.href);
  }

  function getScreenTransition(nextScreen) {
    const currentScreen = screenRef.current;

    return currentScreen === 'home' && nextScreen === 'list'
      ? 'home-to-list'
      : currentScreen === 'home' && nextScreen === 'notifications'
        ? 'home-to-notifications'
        : currentScreen === 'notifications' && nextScreen === 'home'
          ? 'notifications-to-home'
          : currentScreen === 'letter' && nextScreen === 'home'
            ? 'letter-to-home'
            : currentScreen === 'list' && nextScreen === 'home'
              ? 'list-to-home'
              : currentScreen === 'list' && nextScreen === 'comment'
                ? 'list-to-comment'
                : currentScreen === 'notifications' && nextScreen === 'comment'
                  ? 'notifications-to-comment'
                  : currentScreen === 'comment' && nextScreen === 'notifications'
                    ? 'comment-to-notifications'
                    : currentScreen === 'comment' && nextScreen === 'list'
                      ? 'comment-to-list'
                      : currentScreen === 'list' && nextScreen === 'edit'
                        ? 'list-to-edit'
                        : currentScreen === 'comment' && nextScreen === 'edit'
                          ? 'comment-to-edit'
                          : currentScreen === 'edit' && nextScreen === 'comment'
                            ? 'edit-to-comment'
                            : currentScreen === 'edit' && nextScreen === 'list'
                              ? 'edit-to-list'
                              : 'none';
  }

  function applyNavigation(nextScreen, { pushHistory = true, animate = true } = {}) {
    const currentScreen = screenRef.current;
    const previousScreen = previousScreenRef.current;
    const nextTransition = animate ? getScreenTransition(nextScreen) : 'none';

    if (screenTransitionResetTimer.current) {
      window.clearTimeout(screenTransitionResetTimer.current);
      screenTransitionResetTimer.current = null;
    }

    screenTransitionRunId.current += 1;
    const transitionRunId = screenTransitionRunId.current;

    setScreenTransition(nextTransition);
    if (nextTransition !== 'none') {
      screenTransitionResetTimer.current = window.setTimeout(() => {
        if (screenTransitionRunId.current !== transitionRunId) return;
        setScreenTransition('none');
        screenTransitionResetTimer.current = null;
      }, screenTransitionResetMs);
    }

    setPreviousScreen(currentScreen);
    setScreen(nextScreen);
    screenRef.current = nextScreen;
    previousScreenRef.current = currentScreen;

    if (pushHistory && typeof window !== 'undefined') {
      if (currentScreen === 'edit' && nextScreen === 'list') {
        shouldIgnoreNextPopState.current = true;
        window.history.go(previousScreen === 'comment' ? -2 : -1);
        return;
      }

      window.history.pushState({ avocadooScreen: nextScreen }, '', window.location.href);
      return;
    }

    if (nextScreen === 'home' && typeof window !== 'undefined') {
      replaceHomeHistoryState();
    }
  }

  function navigate(nextScreen) {
    applyNavigation(nextScreen);
  }

  function navigateBack({ animate = true } = {}) {
    if (isNicknamePickerOpen) {
      setIsNicknamePickerOpen(false);
      return;
    }

    const backScreen = getBackScreen(screenRef.current, previousScreenRef.current);
    if (!backScreen) return;
    applyNavigation(backScreen, { pushHistory: false, animate });
  }

  useEffect(() => {
    function handlePopState() {
      if (shouldIgnoreNextPopState.current) {
        shouldIgnoreNextPopState.current = false;
        return;
      }

      if (screenRef.current === 'home') {
        pushHomeHistoryState();
        return;
      }

      navigateBack({ animate: false });
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isNicknamePickerOpen]);

  async function createEntry(entry) {
    const entryId = crypto.randomUUID();
    if (!hasSupabaseConfig) {
      const savedEntry = buildLocalSavedEntry({ ...entry, nickname: selectedMemberNickname }, entryId);
      setEntriesAndCache((current) => [savedEntry, ...current]);
      addAvailableDiaryMonthKey(getMonthKeyForDate(savedEntry.date));
      setSelectedEntryId(entryId);
      return;
    }

    const { data: savedRow, error: entryError } = await supabase
      .from('diary_entries')
      .insert({
        id: entryId,
        space_id: coupleSpaceId,
        author_id: selectedMemberId,
        diary_date: entry.date,
        location_text: entry.location,
        body_text: entry.text,
      })
      .select('id, diary_date, location_text, body_text, created_at')
      .single();

    if (entryError) throw entryError;

    const images = await saveDiaryImages(entryId, entry.photos);

    const savedEntry = buildLocalSavedEntry(
      {
        ...entry,
        nickname: selectedMemberNickname,
        date: savedRow?.diary_date || entry.date,
        dateLabel: formatDateLabel(savedRow?.diary_date || entry.date),
        weekday: formatWeekday(savedRow?.diary_date || entry.date),
        location: savedRow?.location_text || '',
        text: savedRow?.body_text || entry.text,
        createdAt: savedRow?.created_at,
        created_at: savedRow?.created_at,
      },
      entryId,
      images
    );

    setEntriesAndCache((current) => [savedEntry, ...current]);
    addAvailableDiaryMonthKey(getMonthKeyForDate(savedEntry.date));
    setSelectedEntryId(entryId);
    void notifyWebPush('diary_created', { entryId }, selectedMemberId);
  }

  function changeMonth(nextMonthDate) {
    setHomeMonth(nextMonthDate);
  }

  function openWeek(week, nextScreen = 'list', source = '') {
    setSelectedWeek(week);
    setShouldOpenUploadDatePicker(nextScreen === 'upload' && source === 'add-polaroid');
    navigate(nextScreen);
  }

  function markNotificationsRead() {
    const readAt = new Date().toISOString();
    writeNotificationReadAt(selectedMemberId, readAt);
    setNotificationReadAt(readAt);
  }

  function openNotificationsPage() {
    markNotificationsRead();
    navigate('notifications');
  }

  function openNotification(notification) {
    if (notification.monthKey) {
      setHomeMonth(getMonthStartForDate(`${notification.monthKey}-01`));
      applyNavigation('home');
      return;
    }

    const entry = entries.find((item) => item.id === notification.entryId);
    if (!entry) return;

    setSelectedWeek(getWeekForEntry(entry, entries));
    setSelectedEntryId(entry.id);
    setDeepLinkedCommentId(notification.commentId || '');
    applyNavigation(notification.commentId ? 'comment' : 'list', { animate: !notification.commentId });
  }

  function openComments(entry) {
    setSelectedEntryId(entry.id);
    setDeepLinkedCommentId('');
    navigate('comment');
  }

  function openEditEntry(entry) {
    setSelectedEntryId(entry.id);
    navigate('edit');
  }

  function selectNickname(nickname) {
    const nextNickname = normalizeSelectedNickname(nickname);
    setSelectedNickname(nextNickname);
    writeSelectedNickname(nextNickname);
  }

  async function toggleEntryLike(entryId) {
    const entry = entries.find((item) => item.id === entryId);
    if (!entry) return;
    const nextLiked = !entry.liked;
    const nextLikeCount = Math.max(0, (entry.likeCount || 0) + (nextLiked ? 1 : -1));
    const applyLikeState = (liked, likeCount) => {
      setEntriesAndCache((current) => current.map((entry) => (entry.id === entryId ? { ...entry, liked, likeCount } : entry)));
    };

    if (nextLiked) {
      triggerInstagramLikeHaptic();
    }
    applyLikeState(nextLiked, nextLikeCount);

    if (!hasSupabaseConfig) {
      return;
    }
    if (!isSupabaseUuid(entryId)) {
      setLoadError('이전 로컬 임시 일기는 서버에 저장할 수 없어요. 새로 올려주세요.');
      applyLikeState(entry.liked, entry.likeCount || 0);
      return;
    }

    const request = nextLiked
      ? supabase.from('diary_entry_likes').insert({ entry_id: entryId, member_id: selectedMemberId })
      : supabase.from('diary_entry_likes').delete().eq('entry_id', entryId).eq('member_id', selectedMemberId);
    const { error } = await request;
    if (error) {
      setLoadError(error.message);
      applyLikeState(entry.liked, entry.likeCount || 0);
      return;
    }

    if (nextLiked) {
      void notifyWebPush('diary_liked', { entryId }, selectedMemberId);
    }
  }

  async function toggleCommentLike(entryId, commentId) {
    const entry = entries.find((item) => item.id === entryId);
    const comment = entry?.comments.find((item) => item.id === commentId);
    if (!comment) return;
    const nextLiked = !comment.liked;
    const nextLikeCount = Math.max(0, (comment.likeCount || 0) + (nextLiked ? 1 : -1));
    const currentLikeNickname = normalizeSelectedNickname(selectedMemberNickname);
    const selectedLikeNicknames = Array.from(new Set([...(comment.likedByNicknames || []), currentLikeNickname]));
    const restoredLikeNicknames = comment.likedByNicknames || [];
    const nextLikeNicknames = nextLiked
      ? selectedLikeNicknames
      : restoredLikeNicknames.filter((nickname) => normalizeSelectedNickname(nickname) !== currentLikeNickname);
    const applyCommentLikeState = (liked, likeCount) => {
      setEntriesAndCache((current) =>
        current.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                comments: (entry.comments || []).map((comment) =>
                  comment.id === commentId
                    ? {
                        ...comment,
                        liked,
                        likeCount,
                        likedByNicknames: liked ? selectedLikeNicknames : nextLikeNicknames,
                      }
                    : comment
                ),
              }
            : entry
        )
      );
    };

    if (nextLiked) {
      triggerInstagramLikeHaptic();
    }
    applyCommentLikeState(nextLiked, nextLikeCount);

    if (!hasSupabaseConfig) {
      return;
    }
    if (!isSupabaseUuid(commentId)) {
      setLoadError('이전 로컬 임시 댓글은 서버에 저장할 수 없어요.');
      applyCommentLikeState(comment.liked, comment.likeCount || 0);
      return;
    }

    const request = nextLiked
      ? supabase.from('diary_comment_likes').insert({ comment_id: commentId, member_id: selectedMemberId })
      : supabase.from('diary_comment_likes').delete().eq('comment_id', commentId).eq('member_id', selectedMemberId);
    const { error } = await request;
    if (error) {
      setLoadError(error.message);
      setEntriesAndCache((current) =>
        current.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                comments: (entry.comments || []).map((currentComment) =>
                  currentComment.id === commentId
                    ? {
                        ...currentComment,
                        liked: comment.liked,
                        likeCount: comment.likeCount || 0,
                        likedByNicknames: restoredLikeNicknames,
                      }
                    : currentComment
                ),
              }
            : entry
        )
      );
      return;
    }

    if (nextLiked) {
      void notifyWebPush('comment_liked', { entryId, commentId }, selectedMemberId);
    }
  }

  async function addComment(entryId, text) {
    const commentId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const comment = { id: commentId, nickname: selectedMemberNickname, text, createdAt, created_at: createdAt, liked: false, likeCount: 0, likedByNicknames: [] };

    if (!hasSupabaseConfig) {
      setEntriesAndCache((current) => addLocalCommentToEntries(current, entryId, comment));
      return;
    }
    if (!isSupabaseUuid(entryId)) {
      setLoadError('이전 로컬 임시 일기에는 댓글을 저장할 수 없어요. 새로 올린 일기에 댓글을 남겨주세요.');
      return;
    }

    const { error } = await supabase.from('diary_comments').insert({
      id: commentId,
      entry_id: entryId,
      author_id: selectedMemberId,
      body_text: text,
    });

    if (error) {
      if (isMissingSupabaseSchema(error)) {
        setEntriesAndCache((current) => addLocalCommentToEntries(current, entryId, comment));
        return;
      }

      setLoadError(error.message);
      return;
    }

    setEntriesAndCache((current) => addLocalCommentToEntries(current, entryId, comment));
    void notifyWebPush('comment_created', { entryId, commentId }, selectedMemberId);
  }

  async function deleteComment(entryId, commentId) {
    const entry = entries.find((item) => item.id === entryId);
    const comment = entry?.comments.find((item) => item.id === commentId);
    if (!comment) return;

    setEntriesAndCache((current) => removeLocalCommentFromEntries(current, entryId, commentId));
    if (deepLinkedCommentId === commentId) setDeepLinkedCommentId('');

    if (!hasSupabaseConfig) return;
    if (!isSupabaseUuid(commentId)) return;

    try {
      const { error: likesError } = await supabase.from('diary_comment_likes').delete().eq('comment_id', commentId);
      if (likesError) throw likesError;

      const { error } = await supabase.from('diary_comments').delete().eq('id', commentId);
      if (error) throw error;
    } catch (error) {
      setLoadError(error.message || '댓글을 삭제하지 못했어요.');
      setEntriesAndCache((current) => addLocalCommentToEntries(current, entryId, comment));
    }
  }

  async function updateComment(entryId, commentId, text) {
    const entry = entries.find((item) => item.id === entryId);
    const comment = entry?.comments.find((item) => item.id === commentId);
    if (!comment) return;

    setEntriesAndCache((current) => updateLocalCommentInEntries(current, entryId, commentId, text));

    if (!hasSupabaseConfig) return;
    if (!isSupabaseUuid(commentId)) return;

    const { error } = await supabase.from('diary_comments').update({ body_text: text }).eq('id', commentId);
    if (error) {
      setLoadError(error.message || '댓글을 수정하지 못했어요.');
      setEntriesAndCache((current) => updateLocalCommentInEntries(current, entryId, commentId, comment.text || ''));
    }
  }

  async function updateEntry(entryId, changes) {
    const entry = entries.find((item) => item.id === entryId);
    if (!entry) return;

    const nextPhotos = normalizePhotoCoverFlags(changes.photos).map((photo, index) => ({
      id: photo.id || `${entryId}-${index}`,
      src: getPhotoSrc(photo),
      storagePath: photo.storagePath || photo.storage_path || '',
      storage_path: photo.storagePath || photo.storage_path || '',
      sortOrder: photo.sortOrder ?? photo.sort_order ?? index,
      sort_order: photo.sortOrder ?? photo.sort_order ?? index,
      isCover: isCoverPhoto(photo),
      is_cover: isCoverPhoto(photo),
      file: photo.file,
    }));

    if (!hasSupabaseConfig) {
      setEntriesAndCache((current) => updateLocalEntry(current, entryId, { ...changes, photos: nextPhotos }));
      return;
    }
    requireSupabasePersistedEntry(entryId);

    const { data: savedRow, error: entryError } = await supabase
      .from('diary_entries')
      .update({
        diary_date: changes.date,
        location_text: changes.location,
        body_text: changes.text,
      })
      .eq('id', entryId)
      .select('id, diary_date, location_text, body_text')
      .maybeSingle();

    if (entryError) throw entryError;
    if (!savedRow) throw new Error('수정할 일기를 찾지 못했어요.');

    let savedPhotos = nextPhotos;
    try {
      savedPhotos = await saveChangedDiaryImages(entryId, entry.photos || [], nextPhotos);
    } catch (imageError) {
      if (!isDiaryImagesPolicyError(imageError)) throw imageError;
    }

    setEntriesAndCache((current) =>
      updateLocalEntry(current, entryId, {
        ...changes,
        date: savedRow.diary_date || changes.date,
        dateLabel: formatDateLabel(savedRow.diary_date || changes.date),
        weekday: formatWeekday(savedRow.diary_date || changes.date),
        location: savedRow.location_text || '',
        text: savedRow.body_text || changes.text,
        photos: savedPhotos,
      })
    );
  }

  async function deleteEntry(entryId) {
    if (!hasSupabaseConfig) {
      setEntriesAndCache((current) => current.filter((entry) => entry.id !== entryId));
      setSelectedEntryId(null);
      return;
    }
    requireSupabasePersistedEntry(entryId);

    const { data: comments, error: commentsReadError } = await supabase.from('diary_comments').select('id').eq('entry_id', entryId);
    if (commentsReadError) throw commentsReadError;

    const commentIds = (comments || []).map((comment) => comment.id);
    if (commentIds.length > 0) {
      const { error: commentLikesError } = await supabase.from('diary_comment_likes').delete().in('comment_id', commentIds);
      if (commentLikesError) throw commentLikesError;
    }

    const { error: commentsError } = await supabase.from('diary_comments').delete().eq('entry_id', entryId);
    if (commentsError) throw commentsError;

    const { error: entryLikesError } = await supabase.from('diary_entry_likes').delete().eq('entry_id', entryId);
    if (entryLikesError) throw entryLikesError;

    const { error: imagesError } = await supabase.from('diary_images').delete().eq('entry_id', entryId);
    if (imagesError) throw imagesError;

    const { data: deletedRows, error } = await supabase.from('diary_entries').delete().eq('id', entryId).select('id');
    if (error) throw error;
    if (!deletedRows || deletedRows.length === 0) {
      throw new Error('일기를 삭제하지 못했어요. Supabase 삭제 정책을 확인해주세요.');
    }

    setEntriesAndCache((current) => current.filter((entry) => entry.id !== entryId));
    setSelectedEntryId(null);
  }

  const showHome = screen === 'home' || screenTransition === 'home-to-list' || screenTransition === 'home-to-notifications' || screenTransition === 'notifications-to-home' || screenTransition === 'letter-to-home';
  const showNotifications = screen === 'notifications' || screenTransition === 'home-to-notifications' || screenTransition === 'notifications-to-home' || screenTransition === 'notifications-to-comment' || screenTransition === 'comment-to-notifications';
  const keepListMountedBehindComment = screen === 'comment' || screenTransition === 'list-to-comment' || screenTransition === 'comment-to-list';
  const showList = screen === 'list' || keepListMountedBehindComment || screenTransition === 'list-to-home' || screenTransition === 'list-to-edit' || screenTransition === 'edit-to-list';
  const showComments = screen === 'comment' || screenTransition === 'list-to-comment' || screenTransition === 'comment-to-list' || screenTransition === 'notifications-to-comment' || screenTransition === 'comment-to-notifications' || screenTransition === 'comment-to-edit' || screenTransition === 'edit-to-comment';
  const showEdit = screen === 'edit' || screenTransition === 'list-to-edit' || screenTransition === 'comment-to-edit' || screenTransition === 'edit-to-list' || screenTransition === 'edit-to-comment';
  const showLetter = screen === 'letter' || screenTransition === 'letter-to-home';
  const isScreenDimActive = dimmedScreenTransitions.has(screenTransition);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    document.body.classList.toggle('splash-active', showSplash);
    document.body.classList.toggle('app-dim-active', !showSplash && (isNicknamePickerOpen || isScreenDimActive));
    const isPhotoDimActive = document.body.classList.contains('large-photo-dim-active');
    const isAnyDimActive = isNicknamePickerOpen || isScreenDimActive || isPhotoDimActive;
    themeColorMeta?.setAttribute('content', showSplash ? appSplashThemeColor : isAnyDimActive ? appDimThemeColor : appThemeColor);

    return () => {
      document.body.classList.remove('splash-active');
      document.body.classList.remove('app-dim-active');
      themeColorMeta?.setAttribute('content', appThemeColor);
    };
  }, [showSplash, isNicknamePickerOpen, isScreenDimActive]);

  return (
    <div className="screen-stage">
      {loadError ? <div className="load-error">{loadError}</div> : null}
      <AnimatePresence>
        {pushPermission === 'granted' && isPushConfigured ? (
          <PushStatus
            status={pushSubscriptionStatus}
            permission={pushPermission}
            onRetry={reconnectPushNotifications}
            isSaving={isPushSaving}
          />
        ) : null}
        {canShowPushPrompt ? (
          <PushPrompt
            permission={pushPermission}
            isSupported={isPushSupported}
            isConfigured={isPushConfigured}
            onEnable={enablePushNotifications}
            onDismiss={dismissPushPrompt}
            isSaving={isPushSaving}
          />
        ) : null}
      </AnimatePresence>
      {showHome ? (
        <Home
          key="home"
          active={screen === 'home'}
          monthDate={homeMonth}
          entries={entries}
          availableDiaryMonthKeys={availableDiaryMonthKeys}
          monthScrollTops={homeMonthScrollTops}
          stickersByMonth={stickersByMonth}
          transitionKind={screenTransition}
          screenPushDistance={screenPushDistance}
          returningFromUpload={previousScreen === 'upload'}
          currentNickname={selectedMemberNickname}
          activeMemberId={selectedMemberId}
          hasUnreadNotifications={hasUnreadNotifications}
          onChangeMonth={changeMonth}
          onMonthScrollChange={saveHomeMonthScrollTop}
          onChangeStickers={setStickersAndCache}
          onSaveMonthStickers={persistMonthStickers}
          onSelectWeek={openWeek}
          onOpenNicknamePicker={() => setIsNicknamePickerOpen(true)}
          onOpenNotifications={openNotificationsPage}
        />
      ) : null}
      {showNotifications ? (
        <NotificationInboxScreen
          key="notifications"
          active={screen === 'notifications'}
          notifications={notifications}
          transitionKind={screenTransition}
          screenPushDistance={screenPushDistance}
          onNavigate={navigate}
          onSelectNotification={openNotification}
        />
      ) : null}
      {showLetter ? (
        <LetterScreen
          key="letter"
          active={screen === 'letter'}
          transitionKind={screenTransition}
          screenPushDistance={screenPushDistance}
          onNavigate={navigate}
        />
      ) : null}
      {showList ? (
        <List
          key="list"
          active={screen === 'list' || keepListMountedBehindComment}
          transitionKind={screenTransition}
          screenPushDistance={screenPushDistance}
          entries={entries}
          selectedWeek={selectedWeek}
          savedListState={listStateByWeek.current.get(selectedWeek.id) || null}
          onNavigate={navigate}
          onToggleLike={toggleEntryLike}
          onOpenComments={openComments}
          onEditEntry={openEditEntry}
          onSaveListState={(weekId, listState) => {
            if (weekId) listStateByWeek.current.set(weekId, listState);
          }}
        />
      ) : null}
      {showComments ? (
        <CommentsScreen
          key="comment"
          active={screen === 'comment'}
          transitionKind={screenTransition}
          screenPushDistance={screenPushDistance}
          entry={selectedEntry}
          targetCommentId={deepLinkedCommentId}
          onNavigate={navigate}
          onToggleLike={toggleEntryLike}
          onToggleCommentLike={toggleCommentLike}
          onAddComment={addComment}
          onUpdateComment={updateComment}
          onDeleteComment={deleteComment}
          onEditEntry={openEditEntry}
          currentNickname={selectedMemberNickname}
          selectedMemberId={selectedMemberId}
          onLoadError={setLoadError}
        />
      ) : null}
      {showEdit && selectedEntry ? (
        <EditEntry
          key={`edit-${selectedEntry.id}`}
          transitionKind={screenTransition}
          screenPushDistance={screenPushDistance}
          entry={selectedEntry}
          onNavigate={navigate}
          onUpdateEntry={updateEntry}
          onDeleteEntry={deleteEntry}
        />
      ) : null}
      {screen === 'upload' ? (
        <Upload
          key={`upload-${selectedWeek.id}`}
          transitionKind={screenTransition}
          screenPushDistance={screenPushDistance}
          initialDate={selectedWeek.startDate}
          selectedWeek={selectedWeek}
          autoOpenDatePicker={shouldOpenUploadDatePicker}
          onDatePickerAutoOpened={() => setShouldOpenUploadDatePicker(false)}
          onCreateEntry={createEntry}
          onNavigate={navigate}
          currentNickname={selectedMemberNickname}
        />
      ) : null}
      <AnimatePresence>
        {isNicknamePickerOpen ? (
          <NicknamePickerSheet
            selectedNickname={selectedMemberNickname}
            onSelect={selectNickname}
            onConfirm={() => setIsNicknamePickerOpen(false)}
            onDismiss={() => setIsNicknamePickerOpen(false)}
          />
        ) : null}
      </AnimatePresence>
      <AnimatePresence>{showSplash ? <SplashScreen /> : null}</AnimatePresence>
    </div>
  );
}
