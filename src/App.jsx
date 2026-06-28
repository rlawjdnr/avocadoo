import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { hasSupabaseConfig, supabase } from './lib/supabaseClient';

const assets = {
  bg: './assets/bg-home.png',
  photos: {
    couple: './assets/photo-couple.png',
    water: './assets/photo-water.png',
    standing: './assets/photo-standing.png',
    food: './assets/photo-food.png',
  },
  plus: './assets/icon-plus.svg',
  down: './assets/icon-down.svg',
  avatar: './assets/icon-avatar.svg',
  heart: './assets/icon-heart.svg',
  likeOutline: './assets/icon-like-outline.svg',
  likeFilled: './assets/icon-like-filled.svg',
  comment: './assets/icon-comment.svg',
  locationPin: './assets/icon-location-pin.svg',
  send: './assets/icon-send.svg',
  upload: './assets/icon-upload.svg',
  pencil: './assets/icon-pencil.svg',
  photoDelete: './assets/icon-photo-delete.svg',
};

const coupleSpaceId = import.meta.env.VITE_SUPABASE_COUPLE_SPACE_ID || '11111111-1111-4111-8111-111111111111';
const currentMemberId = import.meta.env.VITE_SUPABASE_CURRENT_MEMBER_ID || '22222222-2222-4222-8222-222222222221';
const currentMemberNickname = '정정욱';
const storageBucket = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'diary-images';

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
const monthSlideSpring = {
  type: 'spring',
  stiffness: 480,
  damping: 50,
};
const monthSwipeMinDistance = 96;
const monthSwipeDominanceRatio = 1.45;

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

const largePolaroidRest = [
  { left: 13, top: 0.53, rotate: 3.71 },
  { left: 0, top: 11.61, rotate: -4.12 },
  { left: 0, top: 11.61, rotate: -4.12 },
  { left: 7, top: 5.56, rotate: 0 },
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
    comments: [{ id: 'sample-comment-1', nickname: '정정욱', text: '좋았던 하루!', liked: false }],
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
    comments: [],
  },
];

function getPhotoSrc(photo) {
  if (!photo) return '';
  if (typeof photo === 'string') return assets.photos[photo] || photo;
  return photo.src || photo.image_url || photo.publicUrl || '';
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

function mapDiaryEntry(row) {
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
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map((comment) => ({
      id: comment.id,
      nickname: comment.couple_members?.nickname || currentMemberNickname,
      text: comment.body_text,
      liked: comment.liked,
    }));

  return {
    id: row.id,
    weekId: getWeekIdForDate(row.diary_date),
    date: row.diary_date,
    dateLabel: formatDateLabel(row.diary_date),
    weekday: formatWeekday(row.diary_date),
    nickname: row.couple_members?.nickname || currentMemberNickname,
    photos,
    text: row.body_text,
    location: row.location_text || '',
    liked: row.liked,
    comments,
  };
}

function applyEntriesToWeeks(weeks, entries) {
  return weeks.map((week) => {
    const photos = entries
      .filter((entry) => entry.weekId === week.id && entry.photos.length > 0)
      .sort((a, b) => new Date(`${b.date}T00:00:00`) - new Date(`${a.date}T00:00:00`))
      .map((entry) => entry.photos[0])
      .slice(0, 4);

    return { ...week, photos };
  });
}

function sortEntriesByDate(entries) {
  return entries.slice().sort((a, b) => new Date(`${b.date}T00:00:00`) - new Date(`${a.date}T00:00:00`));
}

function ImagePolaroid({ photo, variant = 'center', add = false, compact = false, isLast = true, onRemove }) {
  const src = getPhotoSrc(photo);

  return (
    <motion.span
      className={`polaroid polaroid-${variant} ${add ? 'polaroid-add' : ''}`}
      aria-hidden="true"
      initial={false}
      animate={{ marginRight: isLast ? 0 : compact ? polaroidGap.pressed : polaroidGap.rest }}
      transition={polaroidReleaseSpring}
    >
      <span className="polaroid-paper">
        <span className="polaroid-image">
          {add ? <img className="plus-asset" src={assets.plus} alt="" /> : <img src={src} alt="" />}
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
          isLast={index === visible.length - 1}
        />
      ))}
    </motion.span>
  );
}

function UploadButton({ className = 'floating-upload', onNavigate, reverseFromBig = false, bigWidth = uploadButtonSize.big }) {
  const [isPressed, setIsPressed] = useState(false);
  const releasePress = () => setIsPressed(false);

  return (
    <span className="floating-upload-anchor">
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
    </span>
  );
}

function HomeHeader({ monthDate }) {
  return (
    <header className="home-header">
      <button className="month-select" type="button">
        <span>{monthDate.getFullYear()}년</span>
        <strong>
          {monthDate.getMonth() + 1}월 <img src={assets.down} alt="" />
        </strong>
      </button>
      <div className="couple-state" aria-label="커플 상태">
        <img src={assets.avatar} alt="" />
        <img src={assets.avatar} alt="" />
        <span>
          <img src={assets.heart} alt="" />
        </span>
      </div>
    </header>
  );
}

function HomeMonthPage({ weeks, onSelectWeek }) {
  return (
    <div className="home-month-page">
      {weeks.map((week) => {
        const hasDiary = week.photos.length > 0;
        const content = (
          <>
            <span className="week-copy">
              <strong>{week.range}</strong>
              <em>{week.label}</em>
            </span>
            <PhotoStack photos={week.photos} onAdd={week.isFuture ? undefined : () => onSelectWeek(week, 'upload')} />
          </>
        );

        if (hasDiary) {
          return (
            <button className="week-card week-card-clickable" type="button" key={week.id} onClick={() => onSelectWeek(week)}>
              {content}
            </button>
          );
        }

        return (
          <article className="week-card" key={week.id}>
            {content}
          </article>
        );
      })}
    </div>
  );
}

function Home({ active = true, monthDate, weeks, entries, onChangeMonth, onSelectWeek, returningFromUpload, transitionKind, screenPushDistance }) {
  const dragBlockedClick = useRef(false);
  const monthControls = useAnimationControls();
  const canGoNextMonth = !isFutureMonth(addMonths(monthDate, 1));
  const monthDragConstraints = {
    left: canGoNextMonth ? -screenPushDistance * 2 : -screenPushDistance,
    right: 0,
  };
  const monthDragElastic = {
    left: canGoNextMonth ? 0.08 : 0,
    right: 0.08,
  };
  const monthPages = [
    { offset: -1, date: addMonths(monthDate, -1) },
    { offset: 0, date: monthDate },
    { offset: 1, date: addMonths(monthDate, 1) },
  ];

  useEffect(() => {
    monthControls.set({ x: -screenPushDistance });
  }, [monthControls, monthDate, screenPushDistance]);

  async function handleMonthDragEnd(event, info) {
    const dragOffset = info.offset.x;
    const verticalOffset = info.offset.y;
    const horizontalDistance = Math.abs(dragOffset);
    const verticalDistance = Math.abs(verticalOffset);
    const monthSwipeDistance = Math.max(monthSwipeMinDistance, screenPushDistance * 0.18);
    const hasHorizontalIntent = horizontalDistance >= monthSwipeDistance && horizontalDistance > verticalDistance * monthSwipeDominanceRatio;

    dragBlockedClick.current = horizontalDistance > 12 && horizontalDistance > verticalDistance;
    window.setTimeout(() => {
      dragBlockedClick.current = false;
    }, 0);

    if (!hasHorizontalIntent) {
      monthControls.start({ x: -screenPushDistance, transition: monthSlideSpring });
      return;
    }

    if (dragOffset < 0 && canGoNextMonth) {
      await monthControls.start({ x: -screenPushDistance * 2, transition: monthSlideSpring });
      onChangeMonth(1);
      monthControls.set({ x: -screenPushDistance });
      return;
    }

    if (dragOffset > 0) {
      await monthControls.start({ x: 0, transition: monthSlideSpring });
      onChangeMonth(-1);
      monthControls.set({ x: -screenPushDistance });
      return;
    }

    monthControls.start({ x: -screenPushDistance, transition: monthSlideSpring });
  }

  function handleSelectWeek(week, nextScreen = 'list') {
    if (dragBlockedClick.current) return;
    onSelectWeek(week, nextScreen);
  }

  return (
    <motion.section className="phone home-screen" {...screenMotionProps('home', transitionKind, active, screenPushDistance)}>
      <img className="paper-bg" src={assets.bg} alt="" />
      <HomeHeader monthDate={monthDate} />
      <div className="home-month-viewport">
        <div className="week-list">
          <motion.div
            className="home-month-track"
            drag="x"
            dragDirectionLock
            dragConstraints={monthDragConstraints}
            dragElastic={monthDragElastic}
            initial={{ x: -screenPushDistance }}
            animate={monthControls}
            onDragEnd={handleMonthDragEnd}
          >
            {monthPages.map((month) => (
              <HomeMonthPage
                key={getMonthKey(month.date)}
                weeks={month.offset === 0 ? weeks : applyEntriesToWeeks(buildMonthWeeks(month.date), entries)}
                onSelectWeek={handleSelectWeek}
              />
            ))}
          </motion.div>
        </div>
      </div>
      {weeks[0] ? <UploadButton reverseFromBig={returningFromUpload} bigWidth={Math.max(uploadButtonSize.small, screenPushDistance - 32)} onNavigate={() => onSelectWeek(weeks[0], 'upload')} /> : null}
      <CoveredPageDim visible={transitionKind === 'home-to-list'} />
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

function LargePolaroidStack({ photos = [], dateLabel = '', defaultExpanded = false, lockedExpanded = false }) {
  const [isPressed, setIsPressed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const visible = photos.slice(0, 4);
  if (visible.length === 0) return null;
  const releasePress = () => setIsPressed(false);
  const expanded = lockedExpanded || isExpanded;
  const expandedWidth = visible.length * largePolaroidWidth + Math.max(0, visible.length - 1) * largePolaroidPressedGap;

  return (
    <div className={`large-stack-scroll ${expanded ? 'large-stack-scroll-expanded' : ''}`}>
      <motion.div
        className="large-stack"
        aria-hidden="true"
        initial={false}
        animate={{ scale: isPressed ? 0.97 : 1, width: expanded ? expandedWidth : largePolaroidCollapsedWidth }}
        transition={{
          scale: isPressed ? uploadButtonPressSpring : uploadButtonReleaseSpring,
          width: largePolaroidSpring,
        }}
        onPointerDown={() => setIsPressed(true)}
        onPointerUp={releasePress}
        onPointerCancel={releasePress}
        onPointerLeave={releasePress}
        onClick={() => {
          if (!lockedExpanded) setIsExpanded((current) => !current);
        }}
      >
        {visible.map((photo, index) => (
          <motion.span
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
                  }
                : { left: largePolaroidRest[index].left, rotate: largePolaroidRest[index].rotate, top: largePolaroidRest[index].top, x: 0, y: 0 }
            }
            transition={{
              ...largePolaroidSpring,
              delay: expanded ? 0 : (visible.length - 1 - index) * largePolaroidStaggerDelay,
            }}
          >
            <img src={getPhotoSrc(photo)} alt="" />
          </motion.span>
        ))}
        <span className="large-date">{dateLabel.replace('월 ', '/').replace('일', '')}</span>
      </motion.div>
    </div>
  );
}

function normalizeDiaryEntry(entry) {
  return {
    ...entry,
    dateLabel: entry.dateLabel || formatDateLabel(entry.date),
    weekday: entry.weekday || formatWeekday(entry.date),
    nickname: entry.nickname || currentMemberNickname,
    photos: (entry.photos || []).slice(0, 4),
    text: entry.text || '어떤 하루였나요?',
    location: entry.location || '',
    comments: entry.comments || [],
  };
}

function DiaryCardHeader({ entry }) {
  return (
    <div className="diary-date">
      <strong>{entry.dateLabel}</strong>
      {entry.weekday ? <span>· {entry.weekday}</span> : null}
      <button className="pencil" type="button" aria-label="수정">
        <img src={assets.pencil} alt="" />
      </button>
    </div>
  );
}

function DiaryCardBody({ entry }) {
  return (
    <div className="diary-body">
      <div className="writer">
        <img src={assets.avatar} alt="" />
        <strong>{entry.nickname}</strong>
      </div>
      <p>{entry.text}</p>
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
        count={detail ? undefined : 1}
        label="좋아요"
        onClick={() => onToggleLike(entry.id)}
        compact={detail}
      />
      <ReactionButton icon={assets.comment} count={detail ? undefined : Math.max(1, entry.comments.length)} label="댓글 보기" onClick={() => onOpenComments(entry)} compact={detail} />
    </div>
  );
}

function DiaryListCard({ entry, onToggleLike, onOpenComments }) {
  const normalizedEntry = normalizeDiaryEntry(entry);

  return (
    <article className="diary-item diary-item-created diary-item-list-card">
      <DiaryCardHeader entry={normalizedEntry} />
      <LargePolaroidStack photos={normalizedEntry.photos} dateLabel={normalizedEntry.dateLabel} />
      <DiaryCardBody entry={normalizedEntry} />
      <DiaryCardReactions entry={normalizedEntry} onToggleLike={onToggleLike} onOpenComments={onOpenComments} />
    </article>
  );
}

function DiaryDetailCard({ entry, onToggleLike, onOpenComments }) {
  const normalizedEntry = normalizeDiaryEntry(entry);

  return (
    <article className="diary-item diary-item-created diary-item-detail">
      <DiaryCardHeader entry={normalizedEntry} />
      <DiaryCardBody entry={normalizedEntry} />
      <LargePolaroidStack photos={normalizedEntry.photos} dateLabel={normalizedEntry.dateLabel} defaultExpanded lockedExpanded />
      <DiaryCardReactions entry={normalizedEntry} onToggleLike={onToggleLike} onOpenComments={onOpenComments} detail />
    </article>
  );
}

function DiaryItem({ entry, onToggleLike, onOpenComments, detail = false }) {
  if (!entry) return null;
  return detail ? <DiaryDetailCard entry={entry} onToggleLike={onToggleLike} onOpenComments={onOpenComments} /> : <DiaryListCard entry={entry} onToggleLike={onToggleLike} onOpenComments={onOpenComments} />;
}

function List({ active = true, entries, onNavigate, selectedWeek, transitionKind, onToggleLike, onOpenComments, screenPushDistance }) {
  const weekEntries = entries.filter((entry) => entry.weekId === selectedWeek.id);

  return (
    <motion.section className="phone list-screen" {...screenMotionProps('list', transitionKind, active, screenPushDistance)}>
      <img className="paper-bg" src={assets.bg} alt="" />
      <NavHeader title={selectedWeek.range} sub={selectedWeek.label} onNavigate={onNavigate} />
      <div className="diary-list">
        {weekEntries.map((entry) => (
          <DiaryItem key={entry.id} entry={entry} onToggleLike={onToggleLike} onOpenComments={onOpenComments} />
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
        <img src={assets.avatar} alt="" />
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

function CommentsScreen({ active = true, entry, transitionKind, onNavigate, onToggleLike, onToggleCommentLike, onAddComment, screenPushDistance }) {
  const [reply, setReply] = useState('');
  const comments = entry?.comments || [];

  async function submitReply(event) {
    event.preventDefault();
    const trimmed = reply.trim();
    if (!trimmed) return;
    await onAddComment(entry.id, trimmed);
    setReply('');
  }

  if (!entry) return null;

  return (
    <motion.section className="phone comments-screen" {...screenMotionProps('comment', transitionKind, active, screenPushDistance)}>
      <img className="paper-bg" src={assets.bg} alt="" />
      <NavHeader onNavigate={() => onNavigate('list')} />
      <div className="comment-thread">
        <DiaryItem entry={entry} detail onToggleLike={onToggleLike} onOpenComments={() => {}} />
        <div className="comments-list">
          {comments.map((comment) => (
            <CommentRow key={comment.id} comment={comment} onToggleCommentLike={(commentId) => onToggleCommentLike(entry.id, commentId)} />
          ))}
        </div>
      </div>
      <form className="reply-composer" onSubmit={submitReply}>
        <div className="reply-field">
          <img src={assets.avatar} alt="" />
          <input value={reply} onChange={(event) => setReply(event.target.value)} placeholder="답글 달기..." aria-label="답글 달기" />
          <button className={reply.trim() ? 'reply-send reply-send-active' : 'reply-send'} type="submit" aria-label="답글 보내기">
            <img src={assets.send} alt="" />
          </button>
        </div>
      </form>
    </motion.section>
  );
}

function UploadGrid({ photos, onFiles, onRemovePhoto }) {
  const variants = ['left', 'center', 'right', 'center', 'right'];

  return (
    <div className="upload-grid">
      {photos.map((photo, index) => (
        <ImagePolaroid key={photo.id} photo={photo} variant={variants[index] || 'center'} onRemove={() => onRemovePhoto(photo.id)} />
      ))}
      <label className="upload-add-control" aria-label="이미지 첨부">
        <ImagePolaroid add />
        <input type="file" accept="image/*" multiple onChange={onFiles} />
      </label>
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

function Upload({ initialDate, onCreateEntry, onNavigate, selectedWeek, transitionKind, screenPushDistance }) {
  const [photos, setPhotos] = useState([]);
  const [date, setDate] = useState(initialDate);
  const [location, setLocation] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadPressed, setIsUploadPressed] = useState(false);
  const releaseUploadPress = () => setIsUploadPressed(false);
  const primaryUploadWidth = Math.max(uploadButtonSize.small, screenPushDistance - 32);

  function handleFiles(event) {
    const selected = Array.from(event.target.files || [])
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, Math.max(0, 5 - photos.length))
      .map((file) => ({
        id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
        name: file.name,
        file,
        src: URL.createObjectURL(file),
      }));

    if (selected.length > 0) setPhotos((current) => [...current, ...selected].slice(0, 5));
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
        nickname: currentMemberNickname,
        photos: photos.slice(0, 5),
        text: text.trim() || '어떤 하루였나요?',
        liked: false,
        comments: [],
      });
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
      <motion.div className="upload-content" variants={uploadContentVariants} initial="hidden" animate="visible">
        <AnimatedUploadField order={0}>
          <UploadGrid photos={photos} onFiles={handleFiles} onRemovePhoto={removePhoto} />
        </AnimatedUploadField>
        <form className="entry-form" id="entry-form" onSubmit={handleSubmit}>
          <AnimatedUploadField order={1}>
            <label className="form-row">
              <span>날짜</span>
              <input className="form-input date-input" type="text" value={date} onChange={(event) => setDate(event.target.value)} placeholder="날짜" aria-label="날짜" />
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

async function fetchDiaryEntries() {
  if (!hasSupabaseConfig) return sortEntriesByDate(sampleEntries);

  const { data, error } = await supabase
    .from('diary_entries')
    .select(
      `
      id,
      diary_date,
      location_text,
      body_text,
      liked,
      created_at,
      couple_members:author_id ( nickname ),
      diary_images ( id, image_url, storage_path, sort_order ),
      diary_comments (
        id,
        body_text,
        liked,
        created_at,
        couple_members:author_id ( nickname )
      )
    `
    )
    .eq('space_id', coupleSpaceId)
    .order('diary_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (isMissingSupabaseSchema(error)) return sortEntriesByDate(sampleEntries);
  if (error) throw error;
  return sortEntriesByDate((data || []).map(mapDiaryEntry));
}

function isMissingSupabaseSchema(error) {
  if (!error) return false;
  const message = `${error.message || ''} ${error.details || ''} ${error.hint || ''} ${error.code || ''}`;
  return message.includes('schema cache') || message.includes('diary_entries') || message.includes('PGRST205');
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
    const extension = photo.file.name.split('.').pop() || 'jpg';
    const storagePath = `${coupleSpaceId}/${entryId}/${index}-${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from(storageBucket).upload(storagePath, photo.file, {
      cacheControl: '3600',
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

export default function App() {
  const [screen, setScreen] = useState('home');
  const [previousScreen, setPreviousScreen] = useState(null);
  const [screenTransition, setScreenTransition] = useState('none');
  const [homeMonth, setHomeMonth] = useState(initialMonthStart);
  const [selectedWeek, setSelectedWeek] = useState(initialWeeks[0]);
  const [entries, setEntries] = useState([]);
  const [selectedEntryId, setSelectedEntryId] = useState(null);
  const [loadError, setLoadError] = useState('');
  const screenPushDistance = useViewportWidth();
  const homeWeeks = useMemo(() => applyEntriesToWeeks(buildMonthWeeks(homeMonth), entries), [entries, homeMonth]);
  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId) || entries.find((entry) => entry.weekId === selectedWeek.id);

  useEffect(() => {
    let isMounted = true;

    fetchDiaryEntries()
      .then((nextEntries) => {
        if (!isMounted) return;
        setEntries(nextEntries);
        setSelectedEntryId(nextEntries[0]?.id || null);
        setLoadError('');
      })
      .catch((error) => {
        if (!isMounted) return;
        setLoadError(error.message || '일기를 불러오지 못했어요.');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  function navigate(nextScreen) {
    setScreenTransition(screen === 'home' && nextScreen === 'list' ? 'home-to-list' : screen === 'list' && nextScreen === 'home' ? 'list-to-home' : screen === 'list' && nextScreen === 'comment' ? 'list-to-comment' : screen === 'comment' && nextScreen === 'list' ? 'comment-to-list' : 'none');
    setPreviousScreen(screen);
    setScreen(nextScreen);
  }

  async function createEntry(entry) {
    const entryId = crypto.randomUUID();
    if (!hasSupabaseConfig) {
      const savedEntry = {
        ...entry,
        id: entryId,
        weekId: getWeekIdForDate(entry.date),
        photos: entry.photos.slice(0, 4).map((photo, index) => ({
          id: photo.id || `${entryId}-${index}`,
          src: getPhotoSrc(photo),
        })),
      };
      setEntries((current) => sortEntriesByDate([savedEntry, ...current]));
      setSelectedEntryId(entryId);
      return;
    }

    const { error: entryError } = await supabase.from('diary_entries').insert({
      id: entryId,
      space_id: coupleSpaceId,
      author_id: currentMemberId,
      diary_date: entry.date,
      location_text: entry.location,
      body_text: entry.text,
    });

    if (entryError) throw entryError;

    const images = await uploadDiaryPhotos(entryId, entry.photos);
    if (images.length > 0) {
      const { error: imagesError } = await supabase.from('diary_images').insert(images);
      if (imagesError) throw imagesError;
    }

    const savedEntry = {
      ...entry,
      id: entryId,
      weekId: getWeekIdForDate(entry.date),
      photos: images.map((image) => ({
        id: `${entryId}-${image.sort_order}`,
        src: image.image_url,
        storagePath: image.storage_path,
      })),
    };

    setEntries((current) => sortEntriesByDate([savedEntry, ...current]));
    setSelectedEntryId(entryId);
  }

  function changeMonth(direction) {
    setHomeMonth((current) => addMonths(current, direction));
  }

  function openWeek(week, nextScreen = 'list') {
    setSelectedWeek(week);
    navigate(nextScreen);
  }

  function openComments(entry) {
    setSelectedEntryId(entry.id);
    navigate('comment');
  }

  async function toggleEntryLike(entryId) {
    const entry = entries.find((item) => item.id === entryId);
    if (!entry) return;
    const nextLiked = !entry.liked;
    if (!hasSupabaseConfig) {
      setEntries((current) => current.map((entry) => (entry.id === entryId ? { ...entry, liked: nextLiked } : entry)));
      return;
    }

    const { error } = await supabase.from('diary_entries').update({ liked: nextLiked }).eq('id', entryId);
    if (error) {
      setLoadError(error.message);
      return;
    }
    setEntries((current) => current.map((entry) => (entry.id === entryId ? { ...entry, liked: !entry.liked } : entry)));
  }

  async function toggleCommentLike(entryId, commentId) {
    const entry = entries.find((item) => item.id === entryId);
    const comment = entry?.comments.find((item) => item.id === commentId);
    if (!comment) return;
    const nextLiked = !comment.liked;
    if (!hasSupabaseConfig) {
      setEntries((current) =>
        current.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                comments: (entry.comments || []).map((comment) => (comment.id === commentId ? { ...comment, liked: nextLiked } : comment)),
              }
            : entry
        )
      );
      return;
    }

    const { error } = await supabase.from('diary_comments').update({ liked: nextLiked }).eq('id', commentId);
    if (error) {
      setLoadError(error.message);
      return;
    }
    setEntries((current) =>
      current.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              comments: (entry.comments || []).map((comment) => (comment.id === commentId ? { ...comment, liked: !comment.liked } : comment)),
            }
          : entry
      )
    );
  }

  async function addComment(entryId, text) {
    const commentId = crypto.randomUUID();
    if (!hasSupabaseConfig) {
      setEntries((current) =>
        current.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                comments: [{ id: commentId, nickname: currentMemberNickname, text, liked: false }, ...(entry.comments || [])],
              }
            : entry
        )
      );
      return;
    }

    const { error } = await supabase.from('diary_comments').insert({
      id: commentId,
      entry_id: entryId,
      author_id: currentMemberId,
      body_text: text,
    });

    if (error) {
      setLoadError(error.message);
      return;
    }

    setEntries((current) =>
      current.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              comments: [{ id: commentId, nickname: currentMemberNickname, text, liked: false }, ...(entry.comments || [])],
            }
          : entry
      )
    );
  }

  const showHome = screen === 'home' || screenTransition === 'home-to-list';
  const showList = screen === 'list' || screenTransition === 'list-to-home' || screenTransition === 'list-to-comment' || screenTransition === 'comment-to-list';
  const showComments = screen === 'comment' || screenTransition === 'list-to-comment' || screenTransition === 'comment-to-list';

  return (
    <div className="screen-stage">
      {loadError ? <div className="load-error">{loadError}</div> : null}
      {showHome ? (
        <Home
          key="home"
          active={screen === 'home'}
          monthDate={homeMonth}
          weeks={homeWeeks}
          entries={entries}
          transitionKind={screenTransition}
          screenPushDistance={screenPushDistance}
          returningFromUpload={previousScreen === 'upload'}
          onChangeMonth={changeMonth}
          onSelectWeek={openWeek}
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
        />
      ) : null}
      {screen === 'upload' ? <Upload key={`upload-${selectedWeek.id}`} transitionKind={screenTransition} screenPushDistance={screenPushDistance} initialDate={selectedWeek.startDate} selectedWeek={selectedWeek} onCreateEntry={createEntry} onNavigate={navigate} /> : null}
    </div>
  );
}
