/**
 * QuoteSequence.js
 * -----------------------------------------------------------------------------
 * Séquence de citation typée — version direction artistique.
 *
 * INTENTION
 * -----------------------------------------------------------------------------
 * Ce module ne cherche pas à simuler une machine à écrire.
 * Il cherche à produire une lecture incarnée :
 * - une apparition lente et retenue,
 * - des respirations sur la ponctuation,
 * - un rythme légèrement organique,
 * - une mise en page noble, centrée, stable et lisible,
 * - un texte qui existe comme une présence visuelle.
 *
 * CONTRAT
 * -----------------------------------------------------------------------------
 * La scène appelle :
 *
 *   await runSkippableQuoteSequence({...})
 *
 * Et n'a pas besoin de connaître le détail du typing.
 *
 * CE MODULE GÈRE
 * -----------------------------------------------------------------------------
 * - le layout du texte,
 * - la typographie,
 * - le typing expressif,
 * - le curseur,
 * - le resize,
 * - le skip,
 * - la résolution fin naturelle / skip.
 */

export async function runSkippableQuoteSequence({
  transition, // conservé pour compatibilité avec l'appel actuel
  text,
  charDelay = 54,
  skipDelay = 2000,
  afterTypingDelay = 2800,
  showSkipButton,
  hideSkipButton,
  wait,
  isStillValid = () => true,
}) {
  if (typeof text !== 'string') {
    throw new Error('runSkippableQuoteSequence: "text" doit être une chaîne.');
  }
  if (typeof showSkipButton !== 'function') {
    throw new Error('runSkippableQuoteSequence: "showSkipButton" manquant.');
  }
  if (typeof hideSkipButton !== 'function') {
    throw new Error('runSkippableQuoteSequence: "hideSkipButton" manquant.');
  }
  if (typeof wait !== 'function') {
    throw new Error('runSkippableQuoteSequence: "wait" manquant.');
  }

  const rootEl = document.getElementById('chapter-quote');
  if (!rootEl) {
    throw new Error('runSkippableQuoteSequence: #chapter-quote introuvable.');
  }

  /**
   * CONFIG CRÉATIVE
   * ---------------------------------------------------------------------------
   * Tout le caractère du texte vit ici.
   * C'est la zone que tu peux retravailler librement.
   */
  const CFG = {
    // Tempo principal
    baseDelay: charDelay,
    introHold: 240,

    // Respirations
    commaPause: 80,
    semicolonPause: 135,
    colonPause: 155,
    dashPause: 170,
    sentencePause: 255,
    lineBreakPause: 170,
    paragraphPause: 560,

    // Nuances organiques
    humanizeRatio: 0.24,
    softWordRelease: 12,
    longWordPause: 20,
    emphasisPause: 55,

    // Skip / sortie
    skipDelay,
    afterTypingDelay,

    // Layout
    maxWidthPx: 900,
    sidePaddingVW: 9,
    topPaddingVH: 9,
    bottomPaddingVH: 10,

    // Typographie responsive
    fontVW: 1.42,
    fontMinPx: 21,
    fontMaxPx: 31,
    lineHeight: 1.84,
    letterSpacingEm: 0.008,

    // Couleur / présence
    textColor: 'rgba(239, 232, 220, 0.96)',
    cursorColor: 'rgba(239, 232, 220, 0.82)',
    shadow:
      '0 0 30px rgba(255,255,255,0.035), 0 0 14px rgba(0,0,0,0.18), 0 6px 18px rgba(0,0,0,0.32)',

    // Curseur
    cursorChar: '▍',

    // Apparition
    visibleClass: 'visible',
  };

  let settled = false;
  let cleaned = false;
  let resizeBound = false;
  let runToken = Symbol('quote-sequence');

  injectSharedStylesOnce();

  const refs = buildQuoteDOM(rootEl, CFG);
  applyLayout(rootEl, refs, CFG);

  const onResize = () => {
    if (cleaned) return;
    applyLayout(rootEl, refs, CFG);
  };

  window.addEventListener('resize', onResize, { passive: true });
  resizeBound = true;

  rootEl.classList.add(CFG.visibleClass);

  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    runToken = Symbol('quote-sequence-cleaned');

    if (resizeBound) {
      window.removeEventListener('resize', onResize);
      resizeBound = false;
    }
  };

  const assertActive = (token) => {
    if (token !== runToken) {
      throw new Error('quote_sequence_interrupted');
    }
    if (!isStillValid()) {
      throw new Error('quote_sequence_invalidated');
    }
  };

  const waitChecked = async (ms, token) => {
    if (ms <= 0) return;
    await wait(ms);
    assertActive(token);
  };

  const token = runToken;

  const typingPromise = playExpressiveTyping({
    text,
    refs,
    cfg: CFG,
    waitChecked,
    assertActive,
    token,
  }).catch((err) => {
    if (
      err?.message === 'quote_sequence_interrupted' ||
      err?.message === 'quote_sequence_invalidated'
    ) {
      return { interrupted: true };
    }
    throw err;
  });

  await wait(CFG.skipDelay);

  if (!isStillValid()) {
    hideSkipButton(true);
    cleanup();
    return { skipped: false };
  }

  let resolveSkip = null;
  const skipPromise = new Promise(resolve => {
    resolveSkip = () => resolve({ skipped: true });
  });

  let resolveNatural = null;
  const naturalPromise = new Promise(resolve => {
    resolveNatural = () => resolve({ skipped: false });
  });

  showSkipButton(() => {
    if (settled || !isStillValid()) return;

    settled = true;
    runToken = Symbol('quote-sequence-skipped');

    // En cas de skip, le texte complet reste visible :
    // le chapitre pourra ensuite le faire fondre proprement.
    refs.body.textContent = text;
    refs.cursor.style.opacity = '1';

    hideSkipButton(true);
    cleanup();

    resolveSkip?.();
    resolveSkip = null;
    resolveNatural = null;
  });

  typingPromise.then(async () => {
    if (settled || !isStillValid()) return;

    hideSkipButton(true);
    await wait(CFG.afterTypingDelay);

    if (settled || !isStillValid()) return;

    settled = true;
    cleanup();

    resolveNatural?.();
    resolveNatural = null;
    resolveSkip = null;
  });

  return Promise.race([naturalPromise, skipPromise]);
}

/* ============================================================================
 * DOM / LAYOUT
 * ========================================================================== */

/**
 * Construit le DOM interne du bloc quote.
 * Le conteneur #chapter-quote reste contrôlé par la scène pour les fades globaux.
 */
function buildQuoteDOM(rootEl, cfg) {
  rootEl.innerHTML = `
    <div class="quote-seq-stage" aria-live="polite">
      <div class="quote-seq-column">
        <div class="quote-seq-text">
          <span class="quote-seq-body"></span><span class="quote-seq-cursor">${cfg.cursorChar}</span>
        </div>
      </div>
    </div>
  `;

  const stage = rootEl.querySelector('.quote-seq-stage');
  const column = rootEl.querySelector('.quote-seq-column');
  const text = rootEl.querySelector('.quote-seq-text');
  const body = rootEl.querySelector('.quote-seq-body');
  const cursor = rootEl.querySelector('.quote-seq-cursor');

  if (!stage || !column || !text || !body || !cursor) {
    throw new Error('runSkippableQuoteSequence: DOM interne invalide.');
  }

  return { stage, column, text, body, cursor };
}

/**
 * Applique la mise en page responsive.
 *
 * Direction artistique :
 * - le bloc est réellement centré dans l'écran,
 * - la colonne garde une largeur littéraire,
 * - le texte est justifié,
 * - la taille reste fluide mais contenue,
 * - la lecture doit respirer.
 */
function applyLayout(rootEl, refs, cfg) {
  const vW = Math.max(window.innerWidth, 600);

  const fontPx = clamp(
    Math.round(vW * cfg.fontVW / 100),
    cfg.fontMinPx,
    cfg.fontMaxPx
  );

  rootEl.style.display = 'flex';
  rootEl.style.alignItems = 'center';
  rootEl.style.justifyContent = 'center';
  rootEl.style.padding =
    `${cfg.topPaddingVH}vh ${cfg.sidePaddingVW}vw ${cfg.bottomPaddingVH}vh`;
  rootEl.style.boxSizing = 'border-box';

  refs.stage.style.width = '100%';
  refs.stage.style.display = 'flex';
  refs.stage.style.justifyContent = 'center';
  refs.stage.style.alignItems = 'center';

  refs.column.style.width = `min(${cfg.maxWidthPx}px, 100%)`;

  refs.text.style.position = 'relative';
  refs.text.style.width = '100%';
  refs.text.style.color = cfg.textColor;
  refs.text.style.fontFamily = `'Cormorant Garamond', Georgia, serif`;
  refs.text.style.fontSize = `${fontPx}px`;
  refs.text.style.lineHeight = String(cfg.lineHeight);
  refs.text.style.letterSpacing = `${cfg.letterSpacingEm}em`;
  refs.text.style.fontWeight = '300';
  refs.text.style.textAlign = 'justify';
  refs.text.style.textJustify = 'inter-word';
  refs.text.style.textWrap = 'pretty';
  refs.text.style.whiteSpace = 'pre-wrap';
  refs.text.style.hyphens = 'auto';
  refs.text.style.wordBreak = 'normal';
  refs.text.style.overflowWrap = 'break-word';
  refs.text.style.textShadow = cfg.shadow;
  refs.text.style.webkitFontSmoothing = 'antialiased';
  refs.text.style.MozOsxFontSmoothing = 'grayscale';

  refs.body.style.display = 'inline';

  refs.cursor.style.display = 'inline-block';
  refs.cursor.style.width = '0.55ch';
  refs.cursor.style.marginLeft = '0.02em';
  refs.cursor.style.verticalAlign = 'baseline';
  refs.cursor.style.color = cfg.cursorColor;
  refs.cursor.style.animation = 'quoteSeqBlink 1.35s steps(1) infinite';
  refs.cursor.style.opacity = '1';
}

/* ============================================================================
 * TYPING EXPRESSIF
 * ========================================================================== */

/**
 * Lance le typing principal.
 *
 * Philosophie :
 * - pas mécanique,
 * - pas trop régulier,
 * - sensible aux ponctuations,
 * - légèrement respiré,
 * - plus lent sur les articulations fortes du texte.
 */
async function playExpressiveTyping({
  text,
  refs,
  cfg,
  waitChecked,
  assertActive,
  token,
}) {
  if (cfg.introHold > 0) {
    await waitChecked(cfg.introHold, token);
  }

  let output = '';
  let currentWord = '';

  for (let i = 0; i < text.length; i++) {
    assertActive(token);

    const ch = text[i];
    const prev = i > 0 ? text[i - 1] : '';
    const next = i < text.length - 1 ? text[i + 1] : '';

    output += ch;
    refs.body.textContent = output;

    // Conserve le mot en cours pour enrichir légèrement le tempo
    if (/\S/.test(ch) && ch !== '\n') {
      currentWord += ch;
    } else {
      currentWord = '';
    }

    const delay = getExpressiveDelay({
      ch,
      prev,
      next,
      currentWord,
      cfg,
    });

    await waitChecked(delay, token);
  }

  refs.cursor.style.opacity = '1';
}

/**
 * Calcule le délai expressif d'un caractère.
 *
 * Ce calcul produit un rythme plus humain :
 * - base stable,
 * - variation légère,
 * - pauses ponctuation,
 * - respiration fin de mot,
 * - respiration plus grave en fin de phrase / paragraphe.
 */
function getExpressiveDelay({ ch, prev, next, currentWord, cfg }) {
  let delay = cfg.baseDelay;

  // Variation organique légère
  const variance = delay * cfg.humanizeRatio;
  delay += randomBetween(-variance, variance);

  // Ponctuation faible / moyenne / forte
  if (ch === ',') delay += cfg.commaPause;
  else if (ch === ';') delay += cfg.semicolonPause;
  else if (ch === ':') delay += cfg.colonPause;
  else if (ch === '—') delay += cfg.dashPause;
  else if (ch === '.' || ch === '!' || ch === '?') delay += cfg.sentencePause;

  // Retours ligne / paragraphes
  if (ch === '\n' && prev === '\n') {
    delay += cfg.paragraphPause;
  } else if (ch === '\n') {
    delay += cfg.lineBreakPause;
  }

  // Très légère détente en fin de mot
  if (ch === ' ' && currentWord.length > 0) {
    delay += cfg.softWordRelease;
    if (currentWord.length >= 8) delay += cfg.longWordPause;
  }

  // Marque les articulations sensibles du texte
  if (ch === '«' || ch === '»' || ch === '(' || ch === ')') {
    delay += cfg.emphasisPause;
  }

  // Reprise après ponctuation lourde : espace + majuscule
  if (
    ch === ' ' &&
    prev &&
    (prev === '.' || prev === '!' || prev === '?' || prev === ':') &&
    next &&
    /[A-ZÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸ]/.test(next)
  ) {
    delay += 65;
  }

  return Math.max(10, Math.round(delay));
}

/* ============================================================================
 * STYLES PARTAGÉS
 * ========================================================================== */

function injectSharedStylesOnce() {
  if (document.getElementById('quote-seq-shared-style')) return;

  const style = document.createElement('style');
  style.id = 'quote-seq-shared-style';
  style.textContent = `
    @keyframes quoteSeqBlink {
      0%, 46% { opacity: 1; }
      47%, 100% { opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

/* ============================================================================
 * UTILS
 * ========================================================================== */

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}
