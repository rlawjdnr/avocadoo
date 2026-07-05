import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, animate, motion, useMotionValue } from 'framer-motion';
import { hasSupabaseConfig, supabase } from './lib/supabaseClient';

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
  likeOutline: './assets/icon-like-outline.svg',
  likeFilled: './assets/icon-like-filled.svg',
  comment: './assets/icon-comment.svg',
  locationPin: './assets/icon-location-pin.svg',
  send: './assets/icon-send.svg',
  upload: './assets/icon-upload.svg',
  pencil: './assets/icon-pencil.svg',
  photoDelete: './assets/icon-photo-delete.svg',
  modalClose: './assets/icon-modal-close.svg',
  letterName: './assets/letter-name.svg',
  stickers: {
    heart: './assets/sticker-heart.svg',
    smiley: './assets/sticker-smiley.svg',
    burst: './assets/sticker-burst.svg?v=2',
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
const listFocusedEntryInset = 96;
const listWeekAnchorOffset = 120;
const stickerStorageKey = 'avocadoo.home.stickers.v1';
const stickerBaseSize = 100;
const stickerScaleLimit = {
  min: 0.18,
  max: 2.4,
};
const stickerOptions = [
  { id: 'heart', label: '하트', src: assets.stickers.heart },
  { id: 'smiley', label: '스마일', src: assets.stickers.smiley },
  { id: 'burst', label: '반짝', src: assets.stickers.burst },
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

function getBackScreen(screen, previousScreen) {
  if (screen === 'list') return 'home';
  if (screen === 'letter') return 'home';
  if (screen === 'comment') return 'list';
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

function getHomeRenderableMonthIndexes(activeMonthIndex, monthCount) {
  const indexes = new Set();
  const firstIndex = Math.max(0, activeMonthIndex - 1);
  const lastIndex = Math.min(monthCount - 1, activeMonthIndex + 1);

  for (let index = firstIndex; index <= lastIndex; index += 1) {
    indexes.add(index);
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

  return weeks.reverse();
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

function normalizeSticker(sticker, fallbackId = '') {
  const option = stickerOptions.find((item) => item.id === sticker?.type) || stickerOptions[1];
  return {
    id: sticker?.id || fallbackId || crypto.randomUUID(),
    type: option.id,
    x: Number.isFinite(sticker?.x) ? sticker.x : 226,
    y: Number.isFinite(sticker?.y) ? sticker.y : defaultStickerPosition.y,
    scale: Number.isFinite(sticker?.scale) ? Math.min(Math.max(sticker.scale, stickerScaleLimit.min), stickerScaleLimit.max) : defaultStickerPosition.scale,
    rotation: Number.isFinite(sticker?.rotation) ? sticker.rotation : defaultStickerPosition.rotation,
  };
}

function createDefaultSticker(type = 'smiley', viewportWidth = defaultScreenPushDistance) {
  return normalizeSticker({
    id: crypto.randomUUID(),
    type,
    x: Math.max(28, Math.min(viewportWidth - stickerBaseSize - 28, Math.round(viewportWidth * defaultStickerPosition.xRatio))),
    y: defaultStickerPosition.y,
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
        Array.isArray(stickers) ? stickers.map((sticker, index) => normalizeSticker(sticker, `${monthKey}-${index}`)) : [],
      ])
    );
  } catch {
    return {};
  }
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

function mapDiaryEntry(row, viewerMemberId = currentMemberId) {
  const entryLikes = row.diary_entry_likes || [];
  const photos = (row.diary_images || [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((image) => ({
      id: image.id,
      src: image.image_url,
      storagePath: image.storage_path,
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
      };
    });

  return {
    id: row.id,
    weekId: getWeekIdForDate(row.diary_date),
    date: row.diary_date,
    dateLabel: formatDateLabel(row.diary_date),
    weekday: formatWeekday(row.diary_date),
    nickname: row.couple_members?.nickname || getNicknameForMemberId(row.author_id),
    photos,
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

function applyEntriesToWeeks(weeks, entries) {
  return weeks.map((week) => {
    const weekEntries = sortEntriesByDate(entries.filter((entry) => entry.weekId === week.id));
    const photos = sortEntriesByDate(entries.filter((entry) => entry.weekId === week.id && entry.photos.length > 0))
      .map((entry) => entry.photos[0])
      .slice(0, 4);
    const locations = [...new Set(weekEntries.map((entry) => (entry.location || '').trim()).filter(Boolean))].slice(0, 2);
    const label =
      weekEntries.length === 0
        ? '안 만난 주ㅠㅠ'
        : `${locations.length > 0 ? locations.join(',') : '어딘가'}에서 ${weekEntries.length}번 만남`;

    return { ...week, label, photos };
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

function PhotoImage({ photo, transform, eager = false }) {
  const originalSrc = getPhotoSrc(photo);
  const optimizedSrc = getOptimizedPhotoSrc(photo, transform);
  const [src, setSrc] = useState(optimizedSrc);

  useEffect(() => {
    setSrc(optimizedSrc);
  }, [optimizedSrc]);

  return (
    <img
      src={src}
      alt=""
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={eager ? 'high' : 'low'}
      onError={() => {
        if (src !== originalSrc) setSrc(originalSrc);
      }}
    />
  );
}

function ImagePolaroid({ photo, variant = 'center', add = false, compact = false, index = 0, isLast = true, onRemove }) {
  const pressedX = index * (polaroidGap.pressed - polaroidGap.rest);

  return (
    <motion.span
      className={`polaroid polaroid-${variant} ${add ? 'polaroid-add' : ''}`}
      aria-hidden="true"
      initial={false}
      animate={{ x: compact ? pressedX : 0 }}
      style={{ marginRight: isLast ? 0 : polaroidGap.rest }}
      transition={compact ? polaroidPressSpring : polaroidReleaseSpring}
    >
      <span className="polaroid-paper">
        <span className="polaroid-image">
          {add ? <img className="plus-asset" src={assets.plus} alt="" /> : <PhotoImage photo={photo} transform={photoTransforms.polaroid} eager={isLast} />}
        </span>
      </span>
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

function HomeHeader({ monthDate, minMonth, maxMonth, onSelectMonth, onOpenNicknamePicker, currentNickname = currentMemberNickname }) {
  const [isPressed, setIsPressed] = useState(false);
  const [isCouplePressed, setIsCouplePressed] = useState(false);
  const monthInputRef = useRef(null);
  const releasePress = () => setIsPressed(false);
  const releaseCouplePress = () => setIsCouplePressed(false);

  function openMonthPicker() {
    const input = monthInputRef.current;
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
        <input
          ref={monthInputRef}
          className="month-picker-input"
          type="month"
          value={getMonthKey(monthDate)}
          min={minMonth}
          max={maxMonth}
          aria-label="월 선택"
          tabIndex={-1}
          onChange={(event) => onSelectMonth(event.target.value)}
        />
      </motion.button>
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
    </header>
  );
}

function HomeSticker({ sticker, editable = false, selected = false, onChange, onRemove, onSelect }) {
  return (
    <motion.div
      className={`home-sticker ${editable ? 'home-sticker-editable' : ''} ${selected ? 'home-sticker-selected' : ''}`}
      data-sticker-id={sticker.id}
      style={{
        left: sticker.x,
        top: sticker.y,
        width: stickerBaseSize,
        height: stickerBaseSize,
        scale: sticker.scale,
        rotate: sticker.rotation,
      }}
      initial={false}
      animate={{ opacity: 1 }}
    >
      <img className="home-sticker-image" src={getStickerSrc(sticker.type)} alt="" />
      {editable && selected ? (
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
          <img src={assets.photoDelete} alt="" />
        </button>
      ) : null}
    </motion.div>
  );
}

function HomeStickerLayer({ stickers = [], editStickers = [], selectedStickerId = '', editing = false, onStickerChange, onStickerRemove, onStickerSelect }) {
  const activePointers = useRef(new Map());
  const gesture = useRef(null);
  const visibleStickers = editing ? editStickers : stickers;
  const selectedSticker = editStickers.find((sticker) => sticker.id === selectedStickerId);

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

  return (
    <div
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
        <HomeSticker
          key={sticker.id}
          sticker={sticker}
          editable={editing}
          selected={editing && selectedStickerId === sticker.id}
          onChange={onStickerChange}
          onRemove={() => onStickerRemove?.(sticker.id)}
          onSelect={onStickerSelect}
        />
      ))}
    </div>
  );
}

function HomeMonthPage({ weeks, onSelectWeek, isRenderable = true }) {
  const {
    stickers = [],
    editStickers = [],
    selectedStickerId = '',
    editingStickers = false,
    onStickerChange,
    onStickerRemove,
    onStickerSelect,
  } = arguments[0] || {};
  return (
    <div className="home-month-page" aria-hidden={!isRenderable}>
      {isRenderable ? (
        <>
          <div className="week-list">
            {weeks.map((week) => {
              const hasDiary = week.photos.length > 0;
              const content = (
                <>
                  <span className="week-copy">
                    <strong>{week.range}</strong>
                    <em>{week.label}</em>
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
          <HomeStickerLayer
            stickers={stickers}
            editStickers={editStickers}
            selectedStickerId={selectedStickerId}
            editing={editingStickers}
            onStickerChange={onStickerChange}
            onStickerRemove={onStickerRemove}
            onStickerSelect={onStickerSelect}
          />
        </>
      ) : null}
    </div>
  );
}

function StickerPickerSheet({ onAddSticker, onDropSticker, onApply, onDismiss }) {
  const [dragSticker, setDragSticker] = useState(null);
  const dragGesture = useRef(null);
  const blockNextClick = useRef(false);

  function startStickerOptionDrag(event, option) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragGesture.current = {
      pointerId: event.pointerId,
      type: option.id,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
  }

  function moveStickerOptionDrag(event) {
    const gesture = dragGesture.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    if (!gesture.moved && Math.hypot(deltaX, deltaY) < 8) return;

    gesture.moved = true;
    if (event.cancelable) event.preventDefault();
    setDragSticker({
      type: gesture.type,
      x: event.clientX,
      y: event.clientY,
    });
  }

  function finishStickerOptionDrag(event, cancelled = false) {
    const gesture = dragGesture.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    event.currentTarget.releasePointerCapture?.(event.pointerId);
    dragGesture.current = null;
    setDragSticker(null);

    if (!cancelled && gesture.moved) {
      if (event.cancelable) event.preventDefault();
      blockNextClick.current = true;
      onDropSticker?.(gesture.type, { x: event.clientX, y: event.clientY });
      window.setTimeout(() => {
        blockNextClick.current = false;
      }, 120);
    }
  }

  return (
    <div className="sticker-picker-layer" role="dialog" aria-modal="true" aria-label="스티커 꾸미기">
      <motion.section
        className="sticker-picker-sheet"
        initial={{ y: 267 }}
        animate={{ y: 0 }}
        exit={{ y: 267 }}
        transition={screenPushTransition}
      >
        <button className="sticker-picker-close" type="button" aria-label="스티커 꾸미기 닫기" onClick={onDismiss}>
          <img src={assets.modalClose} alt="" />
        </button>
        <div className="sticker-options">
          {stickerOptions.map((option) => (
            <button
              className="sticker-option"
              type="button"
              key={option.id}
              aria-label={`${option.label} 스티커`}
              onPointerDown={(event) => startStickerOptionDrag(event, option)}
              onPointerMove={moveStickerOptionDrag}
              onPointerUp={finishStickerOptionDrag}
              onPointerCancel={(event) => finishStickerOptionDrag(event, true)}
              onClick={() => {
                if (blockNextClick.current) return;
                onAddSticker(option.id);
              }}
            >
              <img src={option.src} alt="" />
            </button>
          ))}
        </div>
        <div className="sticker-picker-cta">
          <button className="sticker-apply-button" type="button" onClick={onApply}>
            적용
          </button>
        </div>
      </motion.section>
      {dragSticker ? (
        <div
          className="sticker-drag-preview"
          style={{
            left: dragSticker.x,
            top: dragSticker.y,
          }}
        >
          <img src={getStickerSrc(dragSticker.type)} alt="" />
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
  stickersByMonth,
  onChangeMonth,
  onChangeStickers,
  onSelectWeek,
  returningFromUpload,
  transitionKind,
  screenPushDistance,
  currentNickname = currentMemberNickname,
  activeMemberId = currentMemberId,
  onOpenNicknamePicker,
}) {
  const dragBlockedClick = useRef(false);
  const monthViewportRef = useRef(null);
  const monthGesture = useRef(null);
  const monthAnimation = useRef(null);
  const monthTrackFrame = useRef(null);
  const pendingMonthTrackX = useRef(null);
  const longPressGesture = useRef(null);
  const [isStickerPickerOpen, setIsStickerPickerOpen] = useState(false);
  const [editingStickers, setEditingStickers] = useState([]);
  const [selectedStickerId, setSelectedStickerId] = useState('');
  const monthPages = useMemo(() => buildHomeMonthPages(), []);
  const [activeMonthIndex, setActiveMonthIndex] = useState(() => getMonthIndex(monthPages, monthDate));
  const activeMonthDate = monthPages[activeMonthIndex]?.date || monthDate;
  const renderableMonthIndexes = useMemo(() => getHomeRenderableMonthIndexes(activeMonthIndex, monthPages.length), [activeMonthIndex, monthPages.length]);
  const monthWeeksByKey = useMemo(() => {
    const nextMonthWeeks = new Map();

    renderableMonthIndexes.forEach((index) => {
      const month = monthPages[index];
      if (month) nextMonthWeeks.set(month.key, applyEntriesToWeeks(buildMonthWeeks(month.date), entries));
    });

    return nextMonthWeeks;
  }, [entries, monthPages, renderableMonthIndexes]);
  const activeWeeks = monthWeeksByKey.get(getMonthKey(activeMonthDate)) || [];
  const activeMonthKey = getMonthKey(activeMonthDate);
  const monthTrackX = useMotionValue(-activeMonthIndex * screenPushDistance);

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
    if (isStickerPickerOpen) return false;
    if (event.pointerType === 'mouse' && event.button !== 0) return false;
    return !event.target.closest?.('button, input, textarea, select, [role="button"], .sticker-picker-sheet, .home-sticker-editable');
  }

  function startHomeLongPress(event) {
    if (!canStartHomeLongPress(event)) return;

    clearHomeLongPress();
    longPressGesture.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      timerId: window.setTimeout(() => {
        dragBlockedClick.current = true;
        monthGesture.current = null;
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

  function getMonthSwipeVelocityThreshold() {
    return 0.45;
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
    setMonthTrackPosition(-activeMonthIndex * getMonthPageWidth(viewport));
  }

  function snapMonthBack(viewport) {
    animateMonthTrack(-activeMonthIndex * getMonthPageWidth(viewport));
  }

  function commitMonthChange(nextMonthIndex) {
    const nextMonthDate = monthPages[nextMonthIndex].date;
    setActiveMonthIndex(nextMonthIndex);
    onChangeMonth(nextMonthDate);
  }

  function moveToMonth(nextMonthIndex, viewport, animated = true) {
    const clampedIndex = Math.min(Math.max(nextMonthIndex, 0), monthPages.length - 1);
    const targetTrackX = -clampedIndex * getMonthPageWidth(viewport);
    const canDeferMonthCommit = animated && Math.abs(clampedIndex - activeMonthIndex) === 1;

    if (clampedIndex === activeMonthIndex) {
      if (animated) snapMonthBack(viewport);
      else setMonthTrackPosition(targetTrackX);
      return;
    }

    if (animated) {
      if (canDeferMonthCommit) {
        animateMonthTrack(targetTrackX, () => commitMonthChange(clampedIndex));
        return;
      }

      commitMonthChange(clampedIndex);
      animateMonthTrack(targetTrackX);
      return;
    }

    commitMonthChange(clampedIndex);
    setMonthTrackPosition(targetTrackX);
  }

  function startMonthGesture(pointerId, x, y, source = 'pointer') {
    const viewport = monthViewportRef.current;
    if (!viewport) return;

    dragBlockedClick.current = false;
    monthGesture.current = {
      pointerId,
      source,
      startX: x,
      startY: y,
      startTime: performance.now(),
      startTrackX: monthTrackX.get(),
      isHorizontal: false,
    };
  }

  function updateMonthGesture(pointerId, x, y, event) {
    const viewport = monthViewportRef.current;
    const gesture = monthGesture.current;
    if (!viewport || !gesture || gesture.pointerId !== pointerId) return false;

    const deltaX = x - gesture.startX;
    const deltaY = y - gesture.startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (!gesture.isHorizontal && absX > 14 && absX > absY * 1.25) {
      gesture.isHorizontal = true;
      dragBlockedClick.current = true;
      stopMonthAnimation();
    }

    if (!gesture.isHorizontal) return false;

    if (event?.cancelable) event.preventDefault();
    const monthPageWidth = getMonthPageWidth(viewport);
    const minTrackX = -(monthPages.length - 1) * monthPageWidth;
    const nextTrackX = Math.min(Math.max(gesture.startTrackX + deltaX, minTrackX), 0);
    setMonthTrackPositionOnFrame(nextTrackX);
    return true;
  }

  function finishMonthGesture(pointerId, x, y, cancelled = false) {
    const viewport = monthViewportRef.current;
    const gesture = monthGesture.current;
    if (!viewport || !gesture || gesture.pointerId !== pointerId) return false;

    cancelScheduledMonthTrackPosition();
    monthGesture.current = null;

    if (cancelled) {
      if (gesture.isHorizontal) snapMonthBack(viewport);
      dragBlockedClick.current = false;
      return true;
    }

    if (!gesture.isHorizontal) {
      dragBlockedClick.current = false;
      return true;
    }

    const deltaX = x - gesture.startX;
    const deltaY = y - gesture.startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const elapsedMs = Math.max(performance.now() - gesture.startTime, 1);
    const swipeVelocity = absX / elapsedMs;
    const isHorizontalSwipe = absX > absY * 1.25;
    const isDistanceSwipe = absX >= getMonthSwipeThreshold(viewport);
    const isFastSwipe = absX >= 24 && swipeVelocity >= getMonthSwipeVelocityThreshold();
    const isValidSwipe = isHorizontalSwipe && (isDistanceSwipe || isFastSwipe);

    if (isValidSwipe) {
      moveToMonth(activeMonthIndex + (deltaX < 0 ? 1 : -1), viewport);
    } else {
      snapMonthBack(viewport);
    }

    window.setTimeout(() => {
      dragBlockedClick.current = false;
    }, 160);
    return true;
  }

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
    if (nextMonthIndex === activeMonthIndex) return;
    moveToMonth(nextMonthIndex, monthViewportRef.current, false);
  }, [monthDate, monthPages]);

  function handleMonthPointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    const viewport = monthViewportRef.current;
    if (!viewport) return;

    startHomeLongPress(event);
    startMonthGesture(event.pointerId, event.clientX, event.clientY);

    if (event.pointerType === 'mouse' && event.currentTarget.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  }

  function handleMonthPointerMove(event) {
    updateHomeLongPress(event);
    updateMonthGesture(event.pointerId, event.clientX, event.clientY, event);
  }

  function finishMonthPointer(event, cancelled = false) {
    if (event.currentTarget.hasPointerCapture?.(event.pointerId) && event.currentTarget.releasePointerCapture) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    clearHomeLongPress();

    const gesture = monthGesture.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    finishMonthGesture(event.pointerId, event.clientX, event.clientY, cancelled);
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

  function blockHomeTouchWhilePicking(event) {
    if (!isStickerPickerOpen) return;
    if (event.target.closest?.('.sticker-picker-sheet, .home-sticker-editable')) return;
    event.stopPropagation();
  }

  function openStickerPicker() {
    const currentStickers = (stickersByMonth[activeMonthKey] || []).map((sticker) => normalizeSticker(sticker));
    const nextEditingStickers = currentStickers.length > 0 ? currentStickers : [createDefaultSticker('smiley', screenPushDistance)];
    setEditingStickers(nextEditingStickers);
    setSelectedStickerId(nextEditingStickers[0]?.id || '');
    setIsStickerPickerOpen(true);
  }

  function addEditingSticker(type) {
    setEditingStickers((current) => {
      const nextSticker = createDefaultSticker(type, screenPushDistance);
      const offset = Math.min(current.length, 5) * 12;
      const placedSticker = normalizeSticker({
        ...nextSticker,
        x: nextSticker.x + offset,
        y: nextSticker.y + offset,
      });
      setSelectedStickerId(placedSticker.id);
      return [...current, placedSticker];
    });
  }

  function dropEditingSticker(type, point) {
    const viewport = monthViewportRef.current;
    if (!viewport) return;

    const viewportRect = viewport.getBoundingClientRect();
    if (
      point.x < viewportRect.left ||
      point.x > viewportRect.right ||
      point.y < viewportRect.top ||
      point.y > viewportRect.bottom
    ) {
      return;
    }

    const sheet = document.querySelector('.sticker-picker-sheet');
    const sheetRect = sheet?.getBoundingClientRect();
    if (sheetRect && point.y >= sheetRect.top) return;

    setEditingStickers((current) => {
      const nextSticker = normalizeSticker({
        id: crypto.randomUUID(),
        type,
        x: Math.min(Math.max(point.x - viewportRect.left - stickerBaseSize / 2, 8), viewportRect.width - stickerBaseSize - 8),
        y: Math.min(Math.max(point.y - viewportRect.top - stickerBaseSize / 2, 8), viewportRect.height - stickerBaseSize - 8),
        scale: defaultStickerPosition.scale,
        rotation: defaultStickerPosition.rotation,
      });
      setSelectedStickerId(nextSticker.id);
      return [...current, nextSticker];
    });
  }

  function changeEditingSticker(nextSticker) {
    setEditingStickers((current) => current.map((sticker) => (sticker.id === nextSticker.id ? normalizeSticker(nextSticker) : sticker)));
  }

  function removeEditingSticker(stickerId) {
    setEditingStickers((current) => {
      const nextStickers = current.filter((sticker) => sticker.id !== stickerId);
      if (selectedStickerId === stickerId) setSelectedStickerId(nextStickers[0]?.id || '');
      return nextStickers;
    });
  }

  function dismissStickerPicker() {
    setIsStickerPickerOpen(false);
    setEditingStickers([]);
    setSelectedStickerId('');
  }

  function applySticker() {
    const previousStickers = stickersByMonth[activeMonthKey] || [];
    const nextStickers = editingStickers.map((sticker) => normalizeSticker(sticker));
    const hasNewSticker = nextStickers.length > previousStickers.length;

    onChangeStickers((current) => ({
      ...current,
      [activeMonthKey]: nextStickers,
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
      className="phone home-screen"
      onPointerDownCapture={blockHomeTouchWhilePicking}
      onClickCapture={blockHomeTouchWhilePicking}
      {...homeMotionProps}
      style={homeMotionStyle}
    >
      <img className="paper-bg" src={assets.bg} alt="" />
      <HomeHeader
        monthDate={activeMonthDate}
        minMonth={monthPages[0]?.key}
        maxMonth={monthPages[monthPages.length - 1]?.key}
        onSelectMonth={handleSelectMonth}
        onOpenNicknamePicker={onOpenNicknamePicker}
        currentNickname={currentNickname}
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
              weeks={monthWeeksByKey.get(month.key) || []}
              isRenderable={renderableMonthIndexes.has(index)}
              stickers={stickersByMonth[month.key] || []}
              editStickers={index === activeMonthIndex ? editingStickers : []}
              selectedStickerId={index === activeMonthIndex ? selectedStickerId : ''}
              editingStickers={index === activeMonthIndex && isStickerPickerOpen}
              onStickerChange={changeEditingSticker}
              onStickerRemove={removeEditingSticker}
              onStickerSelect={setSelectedStickerId}
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
          />
        ) : null}
      </AnimatePresence>
      <CoveredPageDim visible={transitionKind === 'home-to-list'} />
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

function LargePolaroidStack({ photos = [], dateLabel = '', defaultExpanded = false, lockedExpanded = false, focusEnabled = false, toggleEnabled = false, showDateLabel = false }) {
  const [isStackPressed, setIsStackPressed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [pressedPhotoIndex, setPressedPhotoIndex] = useState(null);
  const [focusedPhoto, setFocusedPhoto] = useState(null);
  const photoRefs = useRef({});
  const visible = photos.slice(0, maxUploadPhotos);
  if (visible.length === 0) return null;
  const releasePhotoPress = () => setPressedPhotoIndex(null);
  const releaseStackPress = () => setIsStackPressed(false);
  const expanded = lockedExpanded || isExpanded;
  const expandedWidth = visible.length * largePolaroidWidth + Math.max(0, visible.length - 1) * largePolaroidPressedGap;
  const stackInteractionProps = focusEnabled || !toggleEnabled
    ? {}
    : {
        role: 'button',
        tabIndex: 0,
        onPointerDown: () => setIsStackPressed(true),
        onPointerUp: releaseStackPress,
        onPointerCancel: releaseStackPress,
        onPointerLeave: releaseStackPress,
        onClick: () => {
          if (!lockedExpanded) setIsExpanded((current) => !current);
        },
      };

  function focusPhoto(photo, index) {
    setFocusedPhoto({ photo, index });
  }

  function closeFocusedPhoto() {
    setFocusedPhoto(null);
  }

  function openFocusedPhoto(event, photo, index) {
    event.stopPropagation();
    releasePhotoPress();
    focusPhoto(photo, index);
  }

  return (
    <div className={`large-stack-scroll ${expanded ? 'large-stack-scroll-expanded' : ''}`}>
      <motion.div
        className={toggleEnabled ? 'large-stack large-stack-clickable' : 'large-stack'}
        initial={false}
        animate={{ scale: isStackPressed ? 0.97 : 1, width: expanded ? expandedWidth : largePolaroidCollapsedWidth }}
        transition={{
          scale: isStackPressed ? uploadButtonPressSpring : uploadButtonReleaseSpring,
          width: largePolaroidSpring,
        }}
        {...stackInteractionProps}
      >
        {visible.map((photo, index) => (
          <motion.span
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
                ? {
                    left: index * (largePolaroidWidth + largePolaroidPressedGap),
                    rotate: 0,
                    top: 0,
                    x: 0,
                    y: 0,
                    scale: focusEnabled && pressedPhotoIndex === index ? 0.97 : 1,
                  }
                : {
                    left: largePolaroidRest[index].left,
                    rotate: largePolaroidRest[index].rotate,
                    top: largePolaroidRest[index].top,
                    x: 0,
                    y: 0,
                    scale: focusEnabled && pressedPhotoIndex === index ? 0.97 : 1,
                  }
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
              delay: expanded ? 0 : (visible.length - 1 - index) * largePolaroidStaggerDelay,
            }}
            role={focusEnabled ? 'button' : undefined}
            tabIndex={focusEnabled ? 0 : undefined}
            onPointerDown={
              focusEnabled
                ? (event) => {
                    event.stopPropagation();
                    setPressedPhotoIndex(index);
                  }
                : undefined
            }
            onPointerUp={
              focusEnabled
                ? (event) => {
                    openFocusedPhoto(event, photo, index);
                  }
                : undefined
            }
            onPointerCancel={focusEnabled ? releasePhotoPress : undefined}
            onPointerLeave={focusEnabled ? releasePhotoPress : undefined}
            onClick={
              focusEnabled
                ? (event) => {
                    event.stopPropagation();
                  }
                : undefined
            }
            onKeyDown={
              focusEnabled
                ? (event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    focusPhoto(photo, index);
                  }
                : undefined
            }
          >
            <PhotoImage photo={photo} transform={photoTransforms.list} eager={index === 0} />
          </motion.span>
        ))}
        {showDateLabel ? <span className="large-date">{dateLabel.replace('월 ', '/').replace('일', '')}</span> : null}
      </motion.div>
      <AnimatePresence>
        {focusEnabled && focusedPhoto && typeof document !== 'undefined'
          ? createPortal(
              <motion.div
                className="large-photo-focus-layer"
                onClick={closeFocusedPhoto}
              >
                <div className="large-photo-focus-dim" />
                <div className="large-photo-focused-image" onClick={(event) => event.stopPropagation()}>
                  <PhotoImage photo={focusedPhoto.photo} transform={photoTransforms.focus} eager />
                </div>
              </motion.div>,
              document.body,
            )
          : null}
      </AnimatePresence>
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

function List({ active = true, entries, onNavigate, selectedWeek, transitionKind, onToggleLike, onOpenComments, onEditEntry, screenPushDistance }) {
  const listRef = useRef(null);
  const entryRefs = useRef(new Map());
  const focusedWeekRef = useRef('');
  const scrollFrameRef = useRef(null);
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
  const headerWeek = visibleWeek || selectedWeek;

  useEffect(() => {
    setVisibleWeek(weeksById.get(selectedWeek.id) || selectedWeek);
    focusedWeekRef.current = '';
  }, [selectedWeek.id]);

  useEffect(() => {
    setVisibleWeek((current) => weeksById.get(current?.id) || current);
  }, [weeksById]);

  useLayoutEffect(() => {
    if (!active || focusedWeekRef.current === selectedWeek.id) return;

    const list = listRef.current;
    const targetEntry = monthEntries.find((entry) => entry.weekId === selectedWeek.id);
    const target = targetEntry ? entryRefs.current.get(targetEntry.id) : null;
    if (!list || !target) return;

    list.scrollTo({ top: Math.max(0, target.offsetTop - listFocusedEntryInset), behavior: 'auto' });
    focusedWeekRef.current = selectedWeek.id;
  }, [active, monthEntries, selectedWeek.id]);

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
    if (scrollFrameRef.current !== null) return;

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      updateVisibleWeek();
    });
  }

  return (
    <motion.section className="phone list-screen" {...screenMotionProps('list', transitionKind, active, screenPushDistance)}>
      <img className="paper-bg" src={assets.bg} alt="" />
      <NavHeader title={headerWeek.range} sub={headerWeek.label} onNavigate={onNavigate} />
      <div className="diary-list" ref={listRef} onScroll={handleListScroll}>
        {monthEntries.map((entry) => (
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

function CommentRow({ comment, onToggleCommentLike }) {
  return (
    <div className="comment-row">
      <div className="comment-copy">
        <img src={getMemberAvatarSrc(comment.nickname)} alt="" />
        <div>
          <strong>{comment.nickname}</strong>
          <p>{comment.text}</p>
        </div>
      </div>
      <ReactionButton
        icon={assets.likeOutline}
        activeIcon={assets.likeFilled}
        active={comment.liked}
        label="댓글 좋아요"
        compact
        onClick={() => onToggleCommentLike(comment.id)}
      />
    </div>
  );
}

function CommentsScreen({ active = true, entry, transitionKind, onNavigate, onToggleLike, onToggleCommentLike, onAddComment, onEditEntry, screenPushDistance, currentNickname = currentMemberNickname }) {
  const [reply, setReply] = useState('');
  const [isReplyFocused, setIsReplyFocused] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardBottomOffset, setKeyboardBottomOffset] = useState(0);
  const replyEditorRef = useRef(null);
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

  async function submitReply(event) {
    event.preventDefault();
    const trimmed = reply.trim();
    if (!trimmed) return;
    await onAddComment(entry.id, trimmed);
    setReply('');
    if (replyEditorRef.current) replyEditorRef.current.textContent = '';
  }

  function handleReplyInput(event) {
    setReply(event.currentTarget.textContent || '');
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
      <div className="comment-thread">
        <DiaryItem entry={entry} detail onToggleLike={onToggleLike} onOpenComments={() => {}} onEdit={onEditEntry} />
        <div className="comments-list">
          {comments.map((comment) => (
            <CommentRow key={comment.id} comment={comment} onToggleCommentLike={(commentId) => onToggleCommentLike(entry.id, commentId)} />
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
          <button className={reply.trim() ? 'reply-send reply-send-active' : 'reply-send'} type="submit" aria-label="답글 보내기">
            <img src={assets.send} alt="" />
          </button>
        </div>
      </form>
    </motion.section>
  );
}

function UploadGrid({ photos, onFiles, onRemovePhoto }) {
  const variants = ['left', 'center', 'right', 'center', 'right', 'left'];
  const canAddPhoto = photos.length < maxUploadPhotos;
  const visibleCellCount = photos.length + (canAddPhoto ? 1 : 0);
  const rowCount = Math.ceil(visibleCellCount / uploadGridColumnCount) || 1;

  return (
    <div className="upload-grid" data-rows={rowCount}>
      {photos.map((photo, index) => (
        <ImagePolaroid key={photo.id} photo={photo} variant={variants[index] || 'center'} onRemove={() => onRemovePhoto(photo.id)} />
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
      return current.filter((photo) => photo.id !== photoId);
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
        photos: photos.slice(0, maxUploadPhotos),
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
          <UploadGrid photos={photos} onFiles={handleFiles} onRemovePhoto={removePhoto} />
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
  const [photos, setPhotos] = useState(() => normalizedEntry.photos.map((photo) => ({ ...photo, src: getPhotoSrc(photo) })));
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
      return current.filter((photo) => photo.id !== photoId);
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
        photos: photos.slice(0, maxUploadPhotos),
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
          <UploadGrid photos={photos} onFiles={handleFiles} onRemovePhoto={removePhoto} />
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

async function fetchDiaryEntries(viewerMemberId = currentMemberId) {
  if (!hasSupabaseConfig) return readLocalEntries();

  const { data: entryRows, error: entriesError } = await supabase
    .from('diary_entries')
    .select('id, author_id, diary_date, location_text, body_text, created_at')
    .eq('space_id', coupleSpaceId)
    .order('diary_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (entriesError) throw entriesError;
  const entries = entryRows || [];
  const entryIds = entries.map((entry) => entry.id);
  if (entryIds.length === 0) return [];

  const [
    { data: images = [], error: imagesError },
    { data: entryLikes = [], error: entryLikesError },
    { data: comments = [], error: commentsError },
  ] = await Promise.all([
    supabase.from('diary_images').select('id, entry_id, image_url, storage_path, sort_order').in('entry_id', entryIds),
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

  if (commentLikesError) throw commentLikesError;

  const memberIds = Array.from(new Set([...entries.map((entry) => entry.author_id), ...comments.map((comment) => comment.author_id)].filter(Boolean)));
  const { data: members = [], error: membersError } = memberIds.length > 0
    ? await supabase.from('couple_members').select('id, nickname').in('id', memberIds)
    : { data: [], error: null };

  if (membersError) throw membersError;

  const membersById = new Map(members.map((member) => [member.id, member.nickname]));
  const imagesByEntry = groupBy(images, (image) => image.entry_id);
  const likesByEntry = groupBy(entryLikes, (like) => like.entry_id);
  const commentsByEntry = groupBy(comments, (comment) => comment.entry_id);
  const likesByComment = groupBy(commentLikes, (like) => like.comment_id);

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
          };
        });

      return {
        id: entry.id,
        weekId: getWeekIdForDate(entry.diary_date),
        date: entry.diary_date,
        dateLabel: formatDateLabel(entry.diary_date),
        weekday: formatWeekday(entry.diary_date),
        nickname: membersById.get(entry.author_id) || getNicknameForMemberId(entry.author_id),
        photos: entryImages,
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
    message.includes('PGRST200') ||
    message.includes('PGRST205')
  );
}

function isDiaryImagesPolicyError(error) {
  if (!error) return false;
  const message = `${error.message || ''} ${error.details || ''} ${error.hint || ''} ${error.code || ''}`;
  return message.includes('row-level security') && message.includes('diary_images');
}

async function uploadDiaryPhotos(entryId, photos) {
  if (!hasSupabaseConfig) {
    return photos.map((photo, index) => ({
      entry_id: entryId,
      image_url: photo.src,
      storage_path: '',
      sort_order: index,
    }));
  }

  const uploaded = [];

  for (const [index, photo] of photos.entries()) {
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
    .select('id, image_url, storage_path, sort_order');

  if (error) throw error;
  return data || images;
}

async function buildPersistedDiaryPhotos(entryId, photos) {
  const newUploads = await uploadDiaryPhotos(entryId, photos);
  let uploadIndex = 0;

  return photos.slice(0, maxUploadPhotos).map((photo, index) => {
    if (photo.file) {
      const uploaded = newUploads[uploadIndex];
      uploadIndex += 1;
      return { ...uploaded, sort_order: index };
    }

    return {
      ...(isSupabaseUuid(photo.id) ? { id: photo.id } : {}),
      entry_id: entryId,
      image_url: getPhotoSrc(photo),
      storage_path: photo.storagePath || photo.storage_path || '',
      sort_order: index,
    };
  });
}

async function saveChangedDiaryImages(entryId, currentPhotos, nextPhotos) {
  const currentImageIds = (currentPhotos || []).map((photo) => photo.id).filter(isSupabaseUuid);
  const nextExistingIds = new Set((nextPhotos || []).filter((photo) => !photo.file).map((photo) => photo.id).filter(isSupabaseUuid));
  const removedImageIds = currentImageIds.filter((photoId) => !nextExistingIds.has(photoId));

  if (removedImageIds.length > 0) {
    const { error: deleteImagesError } = await supabase.from('diary_images').delete().in('id', removedImageIds);
    if (deleteImagesError) throw deleteImagesError;
  }

  const maxSortOrder = (currentPhotos || []).reduce((maxOrder, photo) => {
    const sortOrder = Number(photo.sortOrder ?? photo.sort_order);
    return Number.isFinite(sortOrder) ? Math.max(maxOrder, sortOrder) : maxOrder;
  }, -1);
  const newPhotos = (nextPhotos || []).filter((photo) => photo.file);
  const uploadedImages = await uploadDiaryPhotos(entryId, newPhotos);
  const insertedImages = uploadedImages.map((image, index) => ({ ...image, sort_order: maxSortOrder + index + 1 }));

  if (insertedImages.length > 0) {
    const { data, error: insertImagesError } = await supabase
      .from('diary_images')
      .insert(insertedImages)
      .select('id, image_url, storage_path, sort_order');
    if (insertImagesError) throw insertImagesError;
    insertedImages.splice(0, insertedImages.length, ...(data || insertedImages));
  }

  let uploadIndex = 0;
  return (nextPhotos || []).slice(0, maxUploadPhotos).map((photo, index) => {
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
      };
    }

    return {
      id: photo.id || `${entryId}-${index}`,
      src: getPhotoSrc(photo),
      storagePath: photo.storagePath || photo.storage_path || '',
      storage_path: photo.storagePath || photo.storage_path || '',
      sortOrder: photo.sortOrder ?? photo.sort_order ?? index,
      sort_order: photo.sortOrder ?? photo.sort_order ?? index,
    };
  });
}

function buildLocalSavedEntry(entry, entryId, images) {
  const createdAt = entry.createdAt || entry.created_at || new Date().toISOString();
  const localImages =
    images ||
    entry.photos.slice(0, maxUploadPhotos).map((photo, index) => ({
      id: photo.id || `${entryId}-${index}`,
      src: getPhotoSrc(photo),
      storagePath: '',
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
  const [selectedWeek, setSelectedWeek] = useState(initialWeeks[0]);
  const [entries, setEntries] = useState([]);
  const [stickersByMonth, setStickersByMonth] = useState(readLocalStickers);
  const [selectedEntryId, setSelectedEntryId] = useState(null);
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
  const screenTransitionResetTimer = useRef(null);
  const screenTransitionRunId = useRef(0);
  const screenPushDistance = useViewportWidth();
  const memberPair = useMemo(() => getMemberPairForNickname(selectedNickname), [selectedNickname]);
  const selectedMemberId = memberPair.selectedMemberId;
  const selectedMemberNickname = memberPair.selectedNickname;
  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId) || entries.find((entry) => entry.weekId === selectedWeek.id);
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

  useEffect(() => {
    let isMounted = true;

    fetchDiaryEntries(selectedMemberId)
      .then((nextEntries) => {
        if (!isMounted) return;
        setEntriesAndCache(nextEntries);
        setSelectedEntryId(nextEntries[0]?.id || null);
        setLoadError('');
      })
      .catch((error) => {
        if (!isMounted) return;
        if (hasSupabaseConfig) {
          setEntries([]);
          setSelectedEntryId(null);
        } else {
          const localEntries = readLocalEntries();
          setEntriesAndCache(localEntries);
          setSelectedEntryId(localEntries[0]?.id || null);
        }
        setLoadError(error.message || '일기를 불러오지 못했어요.');
      })
      .finally(() => {
        if (!isMounted) return;
        setIsInitialDataLoaded(true);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedMemberId]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setIsSplashMinimumElapsed(true);
    }, splashMinimumDurationMs);

    return () => window.clearTimeout(timerId);
  }, []);

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
    if (!entryId || consumedDeepLinkedEntryId.current === entryId) return;

    const linkedEntry = entries.find((entry) => entry.id === entryId);
    if (!linkedEntry) return;

    consumedDeepLinkedEntryId.current = entryId;
    setSelectedEntryId(linkedEntry.id);
    setHomeMonth(getMonthStartForDate(linkedEntry.date));
    setSelectedWeek(getWeekForEntry(linkedEntry, entries));
    applyNavigation('comment', { pushHistory: false, animate: false });
  }, [entries, isInitialDataLoaded]);

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

  function getScreenTransition(nextScreen) {
    const currentScreen = screenRef.current;

    return currentScreen === 'home' && nextScreen === 'list'
      ? 'home-to-list'
        : currentScreen === 'list' && nextScreen === 'home'
          ? 'list-to-home'
          : currentScreen === 'letter' && nextScreen === 'home'
            ? 'letter-to-home'
            : currentScreen === 'list' && nextScreen === 'comment'
              ? 'list-to-comment'
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

  function openComments(entry) {
    setSelectedEntryId(entry.id);
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
    const applyCommentLikeState = (liked, likeCount) => {
      setEntriesAndCache((current) =>
        current.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                comments: (entry.comments || []).map((comment) => (comment.id === commentId ? { ...comment, liked, likeCount } : comment)),
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
      applyCommentLikeState(comment.liked, comment.likeCount || 0);
    }
  }

  async function addComment(entryId, text) {
    const commentId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const comment = { id: commentId, nickname: selectedMemberNickname, text, createdAt, created_at: createdAt, liked: false, likeCount: 0 };

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

  async function updateEntry(entryId, changes) {
    const entry = entries.find((item) => item.id === entryId);
    if (!entry) return;

    const nextPhotos = changes.photos.slice(0, maxUploadPhotos).map((photo, index) => ({
      id: photo.id || `${entryId}-${index}`,
      src: getPhotoSrc(photo),
      storagePath: photo.storagePath || photo.storage_path || '',
      storage_path: photo.storagePath || photo.storage_path || '',
      sortOrder: photo.sortOrder ?? photo.sort_order ?? index,
      sort_order: photo.sortOrder ?? photo.sort_order ?? index,
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

  const showHome = screen === 'home' || screenTransition === 'home-to-list' || screenTransition === 'letter-to-home';
  const showList = screen === 'list' || screenTransition === 'list-to-home' || screenTransition === 'list-to-comment' || screenTransition === 'comment-to-list' || screenTransition === 'list-to-edit' || screenTransition === 'edit-to-list';
  const showComments = screen === 'comment' || screenTransition === 'list-to-comment' || screenTransition === 'comment-to-list' || screenTransition === 'comment-to-edit' || screenTransition === 'edit-to-comment';
  const showEdit = screen === 'edit' || screenTransition === 'list-to-edit' || screenTransition === 'comment-to-edit' || screenTransition === 'edit-to-list' || screenTransition === 'edit-to-comment';
  const showLetter = screen === 'letter' || screenTransition === 'letter-to-home';

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
          stickersByMonth={stickersByMonth}
          transitionKind={screenTransition}
          screenPushDistance={screenPushDistance}
          returningFromUpload={previousScreen === 'upload'}
          currentNickname={selectedMemberNickname}
          activeMemberId={selectedMemberId}
          onChangeMonth={changeMonth}
          onChangeStickers={setStickersAndCache}
          onSelectWeek={openWeek}
          onOpenNicknamePicker={() => setIsNicknamePickerOpen(true)}
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
          active={screen === 'list'}
          transitionKind={screenTransition}
          screenPushDistance={screenPushDistance}
          entries={entries}
          selectedWeek={selectedWeek}
          onNavigate={navigate}
          onToggleLike={toggleEntryLike}
          onOpenComments={openComments}
          onEditEntry={openEditEntry}
        />
      ) : null}
      {showComments ? (
        <CommentsScreen
          key="comment"
          active={screen === 'comment'}
          transitionKind={screenTransition}
          screenPushDistance={screenPushDistance}
          entry={selectedEntry}
          onNavigate={navigate}
          onToggleLike={toggleEntryLike}
          onToggleCommentLike={toggleCommentLike}
          onAddComment={addComment}
          onEditEntry={openEditEntry}
          currentNickname={selectedMemberNickname}
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
