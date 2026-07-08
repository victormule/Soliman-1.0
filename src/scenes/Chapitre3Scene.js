import { Scene }             from '../core/Scene.js';
import { bus }               from '../core/EventBus.js';
import { ArrowChp3Opening }  from '../ui/ArrowChapitre3.js';

/**
 * Chapitre3Scene — intégration SPA du chapitre 3 (Kléber · Galerie des Batailles)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * NAVIGATION :
 *  ┌─────────────────────────────────────────────────────────────────────────┐
 *  │  CollaborationScene ──[cercle III]──► Chapitre3Scene                     │
 *  │    · l'extinction de torche + le fondu au noir + l'arrêt de              │
 *  │      collaboration.mp3 sont déjà assurés par CollaborationScene.exit()   │
 *  │      (générique pour toute destination chapitre).                        │
 *  │    · enter() ouvre le chapitre : questionnaire → témoignage → travelling.│
 *  │  Travelling ──[flèche ←]──► leaveToCollaboration() (module) : fondu noir │
 *  │      + coupe l'audio interne, puis 'chp3:navigate-back' → Collaboration. │
 *  └─────────────────────────────────────────────────────────────────────────┘
 *
 * AUDIO : le chapitre 3 gère son AMBIANCE et ses THÈMES en interne (éléments
 * <audio> propres). stopChapitre3() garantit l'arrêt total en sortie. On ne
 * route donc rien via l'AudioManager central (contrairement au chapitre 2) —
 * setAudioManager() est tout de même transmis pour parité/évolutivité.
 *
 * DOM : injecté dans #chapitre3-root (position:fixed, z 500), IDs préfixés
 * chp3-* (globalement uniques → pas de collision avec #veil du site, etc.).
 * Le module chp3-openning.js lit ces IDs via document.getElementById.
 * Import CACHE-BUSTÉ : le module exécute son setup au niveau top-level ; la
 * query unique force une réévaluation propre contre le DOM réinjecté à chaque
 * entrée (état frais : le questionnaire rejoue à chaque venue).
 */

/* ── Chemins ────────────────────────────────────────────────────────────── */
const ASSET_PATH  = 'Chapitre3/';        // depuis la racine serveur (img src)
const MODULE_PATH = '../../Chapitre3/';  // depuis src/scenes/ (import())

const CSS_LINK_ID = 'chp3-css-openning';

export class Chapitre3Scene extends Scene {
  /**
   * @param {Object} systems
   * @param {Object} systems.audio       AudioManager global
   * @param {Object} systems.bgMgr       BackgroundManager
   * @param {Object} systems.transition  TransitionManager
   */
  constructor(systems) {
    super('chapitre3');

    this.audio      = systems.audio;
    this.bgMgr      = systems.bgMgr;
    this.transition = systems.transition;

    /** Flèche de retour openning → Espace collaboratif. */
    this._arrow = new ArrowChp3Opening(window.CONFIG);

    /** DOM conteneur du chapitre 3. */
    this._container = null;

    /** Module chp3-openning chargé dynamiquement. */
    this._module = null;

    /** Listeners window ('chp3:navigate-back') à retirer en sortie. */
    this._windowListeners = [];
  }

  /* ── Cycle de vie ──────────────────────────────────────────────────────── */

  async enter(params = {}) {
    await super.enter(params);

    try {
      // Contexte chapitre 3 : curseur custom + remontée z des titres et du
      // bouton plein écran au-dessus du root plein écran (cf. body.chp3-active
      // dans style.css ; sans ça, z 15 < z 500 → ils resteraient masqués).
      document.body.classList.add('chp3-active');

      this.bgMgr.blackout();
      await this.transition.fadeVeil(0, 0);

      // Tier 2 : sous-titre « Le Général Jean-Baptiste Kléber » sous
      // « Espace collaboratif » (#site-title reste géré par CollaborationScene).
      this._showSubtitle();

      // DOM puis CSS — ⚠️ on ATTEND que la feuille soit appliquée AVANT d'importer
      // le moteur : init() mesure la mise en page (img.clientWidth → coverScale,
      // positions des cercles) et le questionnaire trace ses boutons via des
      // transitions CSS. Sans cette attente, la 1ʳᵉ entrée (CSS non encore chargé)
      // donne des cercles mal placés et des boutons figés à moitié. L'attente
      // rend aussi toutes les (ré)entrées identiques (CSS caché ou non).
      this._injectDOM();
      await this._injectCSS();

      // Listener de retour (avant le module, par sûreté).
      this._registerWindowListeners();

      // Charger et démarrer le module openning (cache-bust obligatoire).
      this._module = await import(
        /* @vite-ignore */ `${MODULE_PATH}chp3-src/chp3-openning.js?v=${Date.now()}`
      );

      // Parité audio (le module garde son audio interne ; simple transmission).
      this._module.setAudioManager?.(this.audio);

      // Pont flèche : le module pilote apparition (départ travelling / fermeture
      // d'un tableau) et disparition (ouverture d'un tableau / départ).
      this._module.setArrowCallbacks?.(
        () => this._showArrow(),
        () => this._arrow.hide()
      );

      await this._module.startChapitre3?.();

    } catch (err) {
      if (err?.message === 'scene_aborted') return;
      console.error('[Chapitre3Scene] Erreur enter() :', err);
    }
  }

  async exit(params = {}) {
    try { await this._module?.stopChapitre3?.(); } catch { /* absorbé */ }

    this._arrow.hide();
    this._unregisterWindowListeners();

    // Tier 2 : le sous-titre disparaît en quittant le chapitre 3.
    // (#site-title « Espace collaboratif » reste géré par CollaborationScene.)
    this._hideSubtitle();

    document.body.classList.remove('chp3-active');
    this._removeDOM();
    this._removeCSS();
    this._module = null;

    await super.exit(params);

    this.bgMgr.blackout();
    await this.transition.fadeVeil(0, 0);
  }

  onResize() {
    this._arrow.resize?.();
    this._applySubtitleFont(document.getElementById('chapitre-subtitle'));
  }

  /* ── Sous-titre (tier 2) ────────────────────────────────────────────────
     Réutilise le #chapitre-subtitle statique de index.html : l'apparition et
     la disparition cinématographiques (fondu + translation) sont portées par
     la classe .visible en CSS — strictement le même mécanisme qu'au chapitre 2.
  ─────────────────────────────────────────────────────────────────────────── */

  _applySubtitleFont(el) {
    const f = window.CONFIG.FONTS?.subtitle;
    if (!f || !el) return;
    const vW = Math.max(window.CONFIG.MIN_SIZE.width, window.innerWidth);
    el.style.fontFamily    = f.family;
    el.style.fontSize      = Math.max(f.size_min, Math.min(f.size_max,
                              Math.round(vW * f.size_vw / 100))) + 'px';
    el.style.fontWeight    = f.weight;
    el.style.letterSpacing = f.spacing;
    el.style.fontStyle     = f.style;
  }

  _showSubtitle() {
    const el = document.getElementById('chapitre-subtitle');
    if (!el) return;
    el.innerHTML = window.CONFIG.CHAPITRE3?.subtitle ?? 'Le Général Jean-Baptiste Kléber';
    this._applySubtitleFont(el);
    // Temporisation : ne pas chevaucher le fondu d'entrée de scène.
    setTimeout(() => { if (this.isActive) el.classList.add('visible'); }, 400);
  }

  /**
   * @param {boolean} immediate  true  → coupe net (retour Espace collaboratif),
   *                             false → laisse jouer la transition CSS de sortie.
   */
  _hideSubtitle(immediate = true) {
    const el = document.getElementById('chapitre-subtitle');
    if (!el) return;
    if (immediate) {
      el.style.transition = 'none';
      el.classList.remove('visible');
      requestAnimationFrame(() => { el.style.transition = ''; });
    } else {
      el.classList.remove('visible');
    }
  }

  /* ── Flèche de retour ──────────────────────────────────────────────────── */

  _showArrow() {
    if (!this.isActive) return;
    // Clic → sortie cinématographique déléguée au module (fondu + coupe audio),
    // qui émettra 'chp3:navigate-back'.
    this._arrow.show(() => this._leaveToCollaboration());
  }

  _leaveToCollaboration() {
    // Le fondu #chp3-fade vit DANS #chapitre3-root (z 500) alors que le
    // sous-titre est remonté à z 600 : sans ceci il flotterait au-dessus du noir
    // puis disparaîtrait sèchement. On le fait s'effacer en douceur (transition
    // CSS ~1.1s) en parallèle du fondu (~1.2s).
    this._hideSubtitle(false);

    if (this._module?.leaveToCollaboration) {
      this._module.leaveToCollaboration();
    } else {
      // Filet de sécurité : navigation directe si le module n'expose rien.
      bus.emit('navigate', { to: 'collaboration', from: 'chapitre3' });
    }
  }

  /* ── Listeners window ──────────────────────────────────────────────────── */

  _registerWindowListeners() {
    this._unregisterWindowListeners();

    // Émis par le module une fois le fondu au noir atteint et l'audio coupé.
    const onNavBack = () => {
      if (this.isActive) {
        bus.emit('navigate', { to: 'collaboration', from: 'chapitre3' });
      }
    };
    window.addEventListener('chp3:navigate-back', onNavBack);
    this._windowListeners.push({ event: 'chp3:navigate-back', fn: onNavBack });
  }

  _unregisterWindowListeners() {
    this._windowListeners.forEach(({ event, fn }) =>
      window.removeEventListener(event, fn)
    );
    this._windowListeners = [];
  }

  /* ── DOM ─────────────────────────────────────────────────────────────────
     ⚠️ RECONSTRUCTION depuis chp3-style.css (l'index standalone du chapitre 3
        n'a pas été fourni). Structure fidèle au contrat du moteur ; à VÉRIFIER
        contre votre index.html d'origine pour :
          · les <defs> des filtres SVG (#chp3-glow / #chp3-glow-click /
            #chp3-ink-shadow) — reconstruits ci-dessous de façon plausible ;
          · le nom exact de l'image de travelling (kleber_versaille2.webp) et
            son éventuel srcset ;
          · le contenu exact de #chp3-titleblock (au-delà de #chp3-eyebrow) ;
          · les <link> de polices (chargées via index.html principal si partagées).
     Remplacez le innerHTML par le <body> exact du standalone en gardant les IDs
     préfixés chp3-* et en ajoutant #chp3-fade. Aucune autre modification requise.
  ─────────────────────────────────────────────────────────────────────────── */

  _injectDOM() {
    if (this._container) return;
    const app = document.getElementById('app');
    if (!app) return;

    const root = document.createElement('div');
    root.id = 'chapitre3-root';
    root.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:500',
      'overflow:hidden', 'background:#000',
    ].join(';');

    root.innerHTML = /* html */`
      <div class="cinema-container" id="chp3-container">

        <!-- CAMÉRA : image de travelling -->
        <div id="chp3-scene">
          <img id="chp3-img" class="travelling-img"
               src="${ASSET_PATH}chp3-images/kleber_versaille2.webp"
               alt="" draggable="false" decoding="async">
        </div>

        <!-- HOTSPOTS — FRÈRE de #chp3-scene (surtout PAS imbriqué) : le moteur
             applique la MÊME transform séparément à #chp3-scene et #chp3-hotspots
             (applyScene). Les imbriquer doublerait la transform sur les cercles
             (dérive/chute + fausse parallaxe). Groupes peuplés par le moteur. -->
        <svg id="chp3-hotspots" class="hotspots" xmlns="http://www.w3.org/2000/svg"
             preserveAspectRatio="none">
          <defs>
            <!-- ⚠️ Filtres reconstruits : remplacer par les <defs> d'origine. -->
            <filter id="chp3-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.6" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="chp3-glow-click" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="3.2" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="chp3-ink-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0.5" stdDeviation="0.6" flood-color="rgba(0,0,0,0.5)"/>
            </filter>
          </defs>
        </svg>

        <!-- COUCHES D'ATMOSPHÈRE (clics traversants) -->
        <canvas id="chp3-dust" class="overlay"></canvas>
        <div class="overlay warmlight"></div>
        <div class="overlay darkness"></div>
        <div id="chp3-grain" class="overlay grain"></div>

        <!-- LIBELLÉ GRAVÉ (haut) -->
        <div id="chp3-titleblock" class="titleblock">
          <div id="chp3-eyebrow" class="eyebrow"></div>
        </div>

        <!-- CAPTION (bas) -->
        <div id="chp3-hint" class="hint"></div>

        <!-- VOILE de reveal (piloté par le moteur) -->
        <div id="chp3-veil" class="veil"></div>

        <!-- FONDU DE SORTIE → Espace collaboratif (piloté par leaveToCollaboration) -->
        <div id="chp3-fade"></div>
      </div>
    `;

    app.appendChild(root);
    this._container = root;
  }

  _removeDOM() {
    if (!this._container) return;
    this._container.remove();
    this._container = null;
  }

  /* ── CSS ─────────────────────────────────────────────────────────────── */

  /**
   * Injecte la feuille de style du chapitre et résout QUAND elle est appliquée.
   * Idempotent : sur une ré-entrée, le <link> déjà présent est réutilisé (résout
   * immédiatement s'il est déjà chargé). 'error' résout aussi → ne bloque jamais
   * l'entrée si le fichier manque (dégradé plutôt que blocage).
   */
  _injectCSS() {
    return new Promise((resolve) => {
      const existing = document.getElementById(CSS_LINK_ID);
      if (existing) {
        if (existing.sheet) resolve();
        else existing.addEventListener('load', () => resolve(), { once: true });
        return;
      }
      const link = Object.assign(document.createElement('link'), {
        id:   CSS_LINK_ID,
        rel:  'stylesheet',
        href: 'Chapitre3/chp3-style/chp3-openning.css',
      });
      link.addEventListener('load',  () => resolve(), { once: true });
      link.addEventListener('error', () => resolve(), { once: true });
      document.head.appendChild(link);
    });
  }

  _removeCSS() {
    document.getElementById(CSS_LINK_ID)?.remove();
  }
}
