import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

const checks = [
  ['index loads app root', html.includes('id="app"')],
  ['framer motion dependency installed', Boolean(pkg.dependencies?.['framer-motion'])],
  ['upload buttons use framer motion', app.includes("from 'framer-motion'") && app.includes('motion.button') && !app.includes('layoutId="upload-button"')],
  ['home to list uses push spring', app.includes('const screenPushTransition') && app.includes('const screenPushDistance = 390') && app.includes("screen === 'home' && nextScreen === 'list' ? 'home-to-list'") && app.includes('stiffness: 480') && app.includes('damping: 55')],
  ['covered home moves half width with its own spring', app.includes('const coveredPageOffset = -screenPushDistance * 0.5') && app.includes('const coveredPageTransition') && app.includes('damping: 50') && app.includes("screenName === 'home') return { animate: { x: coveredPageOffset }, style: { zIndex: 1 }, transition: coveredPageTransition }")],
  ['list overlays home during push', app.includes('initial: { x: screenPushDistance, boxShadow: coveringPageShadow }') && app.includes('animate: { x: 0, boxShadow: restingPageShadow }') && app.includes('style: { zIndex: 2 }')],
  ['push layer depth uses temporary shadow and dim', app.includes("const coveringPageShadow = '-8px 0 14px rgba(31, 38, 48, 0.08)'") && app.includes("const restingPageShadow = 'none'") && app.includes('boxShadow: { duration: 0.14') && app.includes('className="page-dim"') && css.includes('.page-dim') && css.includes('z-index: 40')],
  ['push screens share an absolute stage', app.includes('const showHome =') && app.includes('const showList =') && css.includes('.screen-stage') && css.includes('.screen-stage > .phone') && css.includes('position: absolute')],
  ['home month is synced to actual date', app.includes('const today = new Date()') && app.includes('const initialMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)') && app.includes('function buildMonthWeeks(monthStart)') && app.includes('getMonthLastDay(monthStart)')],
  ['home month swipe shows previous and next months', app.includes('{ offset: -1, date: addMonths(monthDate, -1) }') && app.includes('{ offset: 1, date: addMonths(monthDate, 1) }') && app.includes('className="home-month-track"') && css.includes('.home-month-page')],
  ['home month slide uses 480 50 spring', app.includes('const monthSlideSpring') && app.includes('stiffness: 480') && app.includes('damping: 50') && app.includes('useAnimationControls') && app.includes('drag="x"')],
  ['home month carousel pages before changing month', app.includes('await monthControls.start({ x: -screenPushDistance * 2, transition: monthSlideSpring })') && app.includes('await monthControls.start({ x: 0, transition: monthSlideSpring })') && app.includes('monthControls.set({ x: -screenPushDistance })')],
  ['home month carousel blocks future month scroll', app.includes('function isFutureMonth(monthStart)') && app.includes('const canGoNextMonth = !isFutureMonth(addMonths(monthDate, 1))') && app.includes('left: canGoNextMonth ? -screenPushDistance * 2 : -screenPushDistance') && app.includes('dragConstraints={monthDragConstraints}') && app.includes('dragOffset <= -60 && canGoNextMonth')],
  ['home month header stays outside carousel track', app.includes('function HomeHeader({ monthDate })') && app.includes('<HomeHeader monthDate={monthDate} />') && !app.includes('function HomeMonthPage({ monthDate') && css.includes('.home-header') && css.includes('z-index: 5')],
  ['home week list scrolls vertically only', css.includes('height: calc(100% - 63px)') && css.includes('overflow-x: hidden') && css.includes('overflow-y: auto') && css.includes('-webkit-overflow-scrolling: touch')],
  ['home week range font weight is semibold', css.includes('.week-copy strong') && css.includes('font-weight: 600')],
  ['home scroll container stays above sliding month track', app.includes('<div className="week-list">') && app.includes('className="home-month-track"') && app.indexOf('<div className="week-list">') < app.indexOf('className="home-month-track"')],
  ['upload button width and y spring is 480 50', app.includes('const uploadButtonSizeSpring') && app.includes('stiffness: 480') && app.includes('damping: 50')],
  ['upload button radius spring is 800 55', app.includes('stiffness: 800') && app.includes('damping: 55')],
  ['upload button springs start together', app.includes('...uploadButtonSizeSpring') && app.includes('borderRadius: uploadButtonRadiusSpring')],
  ['upload button animates real width not scale layout', app.includes('width: uploadButtonSize.small') && app.includes('width: uploadButtonSize.big') && !app.includes('LayoutGroup')],
  ['upload button press scales with separate springs', app.includes('const uploadButtonPressSpring') && app.includes('stiffness: 1000') && app.includes('const uploadButtonReleaseSpring') && app.includes('scale: isPressed ? 0.97 : 1') && app.includes('scale: isPressed ? uploadButtonPressSpring : uploadButtonReleaseSpring')],
  ['primary upload button press scales with separate springs', app.includes('scale: isUploadPressed ? 0.97 : 1') && app.includes('scale: isUploadPressed ? uploadButtonPressSpring : uploadButtonReleaseSpring') && app.includes('onPointerDown={() => setIsUploadPressed(true)}')],
  ['upload back animates big to small', app.includes('reverseFromBig') && app.includes("previousScreen === 'upload'") && app.includes('initial={reverseFromBig ? { borderRadius: uploadButtonRadius.big, width: uploadButtonSize.big, y: -9.5 } : false}')],
  ['upload button label changes only font size', app.includes('animate={{ fontSize: 16 }}') && app.includes('animate={{ fontSize: 17 }}')],
  ['upload button label weight is medium', /\.upload-button-label\s*\{[^}]*font-weight:\s*500/.test(css)],
  ['upload button content group is centered', css.includes('justify-content: center') && css.includes('gap: 6px') && !app.includes('className="upload-button-measure"') && !css.includes('var(--upload-icon-offset')],
  ['upload button radius morphs visible values', app.includes('small: 23') && app.includes('big: 16') && app.includes('borderRadius: uploadButtonRadius.small') && app.includes('borderRadius: uploadButtonRadius.big')],
  ['figma upload button colors and sizes preserved', app.includes('small: 101') && app.includes('big: 358') && css.includes('background: #7acc2d') && css.includes('max-width: 358px') && css.includes('height: 57px')],
  ['small upload button hugs text and stays centered', app.includes('className="floating-upload-anchor"') && css.includes('width: max-content') && css.includes('white-space: nowrap') && css.includes('transform: translateX(-50%)')],
  ['upload buttons stay on top', css.includes('.floating-upload-anchor') && css.includes('z-index: 100') && css.includes('.bottom-cta') && css.includes('z-index: 40')],
  ['home polaroid press is restored to original compact effect', app.includes('pressed: -48') && app.includes('animate: { scale: isPressed ? 0.98 : 1 }') && app.includes('transition: isPressed ? polaroidPressSpring : polaroidReleaseSpring')],
  ['list polaroid tap toggles expanded mode from first slot', app.includes('const [isExpanded, setIsExpanded] = useState(false)') && app.includes('const largePolaroidCollapsedWidth = 180') && app.includes('width: isExpanded ? expandedWidth : largePolaroidCollapsedWidth') && app.includes('left: index * (largePolaroidWidth + largePolaroidPressedGap)') && app.includes('top: 0') && app.includes('rotate: 0')],
  ['list polaroid expand and gather uses 480 50 spring', app.includes('const largePolaroidSpring') && app.includes('stiffness: 480') && app.includes('damping: 50') && app.includes('width: largePolaroidSpring') && app.includes('...largePolaroidSpring')],
  ['list polaroid expanded state scrolls horizontally', app.includes("className={`large-stack-scroll ${isExpanded ? 'large-stack-scroll-expanded' : ''}`}") && css.includes('.large-stack-scroll-expanded') && css.includes('overflow-x: auto')],
  ['list polaroid expanded scroll uses full device width with edge padding and no visible scrollbar', css.includes('width: calc(100% + 56px)') && css.includes('margin: 24px -28px') && css.includes('padding: 0 28px') && css.includes('scrollbar-width: none') && css.includes('.large-stack-scroll::-webkit-scrollbar') && css.includes('display: none')],
  ['list polaroid gather only uses 0.03 stagger', app.includes('const largePolaroidStaggerDelay = 0.03') && app.includes('delay: isExpanded ? 0 : (visible.length - 1 - index) * largePolaroidStaggerDelay')],
  ['list polaroid shadow stays low blur', css.includes('box-shadow: -2px 3px 4px 0.5px rgba(0, 0, 0, 0.12)')],
  ['no external icon package', !app.includes('lucide') && !html.includes('lucide')],
  ['status bar removed', !app.includes('statusBar') && !css.includes('status-bar')],
  ['home weeks with diary select their list', app.includes('const hasDiary = week.photos.length > 0') && app.includes('className="week-card week-card-clickable"') && app.includes('onClick={() => onSelectWeek(week)}')],
  ['empty week touch is limited to add polaroid', app.includes('<article className="week-card" key={week.id}>') && app.includes('className="week-add-polaroid"') && app.includes("onSelectWeek(week, 'upload')") && css.includes('.week-card-clickable')],
  ['future weeks are not rendered', app.includes('const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())') && app.includes('if (monthStart > todayStart) return []') && app.includes('if (startDate > todayStart) break') && app.includes("{weeks[0] ? <UploadButton")],
  ['empty week add is not nested button', app.includes('role="button"') && app.includes('tabIndex={0}') && !app.includes('className="week-add-polaroid"\n        type="button"')],
  ['polaroid has real layout box', css.includes('.polaroid {\n  display: block;')],
  ['upload initializes selected week date', app.includes('startDate:') && app.includes('useState(initialDate)') && app.includes('initialDate={selectedWeek.startDate}')],
  ['selected week drives list header', app.includes('title={selectedWeek.range}') && app.includes('sub={selectedWeek.label}')],
  ['entries filtered by selected week', app.includes('entries.filter((entry) => entry.weekId === selectedWeek.id)')],
  ['upload entry belongs to selected week', app.includes('weekId: selectedWeek.id')],
  ['diary list is scrollable', css.includes('overflow-y: auto') && css.includes('height: 784px') && css.includes('padding-bottom: 142px')],
  ['no horizontal scroll layout', css.includes('overflow-x: hidden') && css.includes('width: min(390px, 100vw)') && css.includes('width: 100%')],
  ['annotation: max four photos', app.includes('photos.slice(0, 4)')],
  ['upload screen starts empty', !app.includes("const row = ['couple'") && app.includes('<UploadGrid photos={photos} onFiles={handleFiles} />')],
  ['upload submit creates list entry', app.includes('onCreateEntry({') && app.includes("onNavigate('list')")],
  ['upload form follows photo grid', app.includes('className="upload-content"') && !css.includes('top: 350px')],
  ['upload fields enter with staggered spring motion', app.includes('const uploadFieldSpring') && app.includes('stiffness: 480') && app.includes('damping: 50') && app.includes('delay: order * 0.03') && app.includes('hidden: { opacity: 0, y: 500 }') && app.includes('function AnimatedUploadField')],
  ['upload entry targets are animated individually', app.includes('<motion.div className="upload-content" variants={uploadContentVariants} initial="hidden" animate="visible">') && app.includes('<AnimatedUploadField order={0}>') && app.includes('<AnimatedUploadField order={3}>') && css.includes('.entry-form > div')],
  ['figma phone size preserved', css.includes('width: 390px') && css.includes('height: 844px')],
  ['figma cta size preserved', css.includes('width: 358px') && css.includes('height: 57px')],
];

const failed = checks.filter(([, pass]) => !pass);

if (failed.length) {
  console.error(failed.map(([name]) => `FAIL ${name}`).join('\n'));
  process.exit(1);
}

console.log(checks.map(([name]) => `PASS ${name}`).join('\n'));
