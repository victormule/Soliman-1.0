/**
 * chp2-openning.js — Logique du travelling panoramique.
 *
 * ADAPTATION SPA (v2) — intégration dans Soliman-1.0 :
 *   - Les getElementById() utilisent des IDs préfixés "chp2-" pour éviter
 *     toute collision avec le DOM du projet principal.
 *   - La navigation externe (window.location.href) est remplacée par un
 *     CustomEvent 'chp2:navigate-back' capté par Chapitre2Scene.js.
 *   - Le bloc BFCache (pageshow/reload) est retiré : sans navigation réelle,
 *     il n'a pas de sens dans un contexte SPA.
 *   - Le chemin audio est absolu depuis la racine serveur.
 *   - Le LightSystem est monté sur #chp2-shake (au lieu de #shake).
 *   - Deux exports publics : startChapitre2() / stopChapitre2()
 *     appelés par Chapitre2Scene.enter() / exit().
 */

"use strict";

/* =============================================================================
   OSCILLATEURS
============================================================================= */
var O = {
  dx:   { freq: 0.23,  amp: 1,     phase: 0.0  },
  dy:   { freq: 0.17,  amp: 1,     phase: 1.1  },
  b1:   { freq: 0.41,  amp: 0.045, phase: 0.3  },
  b2:   { freq: 0.67,  amp: 0.028, phase: 2.1  },
  f1:   { freq: 2.1,   amp: 0.018, phase: 0.7  },
  f2:   { freq: 3.3,   amp: 0.012, phase: 1.5  },
  f3:   { freq: 5.7,   amp: 0.007, phase: 0.9  },
  f4:   { freq: 7.9,   amp: 0.004, phase: 2.8  },
  w:    { freq: 1.1,   amp: 1,     phase: 0.4  },
  shx1: { freq: 0.18,  amp: 1,     phase: 0.6  },
  shx2: { freq: 0.42,  amp: 1,     phase: 1.9  },
  shx3: { freq: 0.75,  amp: 1,     phase: 0.2  },
  shy1: { freq: 0.16,  amp: 1,     phase: 2.4  },
  shy2: { freq: 0.38,  amp: 1,     phase: 0.8  },
  shy3: { freq: 0.68,  amp: 1,     phase: 3.1  }
};

function osc(o, t) {
  return Math.sin(t * 0.001 * o.freq * Math.PI * 2 + o.phase) * o.amp;
}

/* =============================================================================
   LIGHT SYSTEM — lumière à la bougie sur canvas
============================================================================= */
function LightSystem(mountId) {
  this.mount   = document.getElementById(mountId) || document.body;
  this.canvas  = null;
  this.ctx     = null;
  this.raf     = null;
  this.animRaf = null;
  this.visible = false;
  this.opacity = 0;
  this.radius  = 0;
  this._frac   = 0;
  var self = this;
  this._resizeBound = function() { self.resize(); };
  this._ensureCanvas();
  this.resize();
  window.addEventListener('resize', this._resizeBound, { passive: true });
  this._startLoop();
}

LightSystem.prototype._ensureCanvas = function() {
  if (this.canvas) return;
  var c = document.createElement('canvas');
  c.style.cssText = [
    'position:absolute',
    'top:-15%',
    'left:-15%',
    'width:130%',
    'height:130%',
    'z-index:2',
    'pointer-events:none',
    'opacity:0',
    'display:none',
    'transition:opacity 220ms ease'
  ].join(';');
  this.mount.appendChild(c);
  this.canvas = c;
  this.ctx = c.getContext('2d');
};

LightSystem.prototype._vW = function() { return Math.max(320, window.innerWidth); };
LightSystem.prototype._vH = function() { return Math.max(240, window.innerHeight); };
LightSystem.prototype._min = function() {
  return Math.min(window.innerWidth, window.innerHeight);
};

LightSystem.prototype.resize = function() {
  if (!this.canvas) return;
  var w = this._vW() * 1.3;
  var h = this._vH() * 1.3;
  this.canvas.width  = w;
  this.canvas.style.width  = w + 'px';
  this.canvas.height = h;
  this.canvas.style.height = h + 'px';
  if (this._frac > 0) this.radius = this._min() * this._frac;
};

LightSystem.prototype.show = function() {
  this.visible = true;
  this.canvas.style.display = 'block';
  this.canvas.style.opacity = '1';
};

LightSystem.prototype.set = function(px, op) {
  this.radius  = Math.max(0, px);
  this.opacity = Math.max(0, Math.min(1, op === undefined ? 1 : op));
  this._frac   = this._min() > 0 ? this.radius / this._min() : 0;
};

LightSystem.prototype.animateToFraction = function(targetFrac, ms, targetOp) {
  var self = this;
  targetOp   = (targetOp === undefined) ? 1 : targetOp;
  targetFrac = Math.max(0, targetFrac);
  if (this.animRaf) cancelAnimationFrame(this.animRaf);
  var startFrac = this._frac;
  var startOp   = this.opacity;
  var t0 = performance.now();
  return new Promise(function(resolve) {
    function step(now) {
      var p = Math.min((now - t0) / Math.max(1, ms), 1);
      var e = 0.5 - 0.5 * Math.cos(p * Math.PI);
      self._frac   = startFrac + (targetFrac - startFrac) * e;
      self.radius  = self._min() * self._frac;
      self.opacity = startOp + (targetOp - startOp) * e;
      if (p < 1) {
        self.animRaf = requestAnimationFrame(step);
      } else {
        self.animRaf = null;
        self._frac   = targetFrac;
        self.radius  = self._min() * targetFrac;
        self.opacity = targetOp;
        resolve();
      }
    }
    self.animRaf = requestAnimationFrame(step);
  });
};

LightSystem.prototype.destroy = function() {
  if (this.raf)     { cancelAnimationFrame(this.raf);     this.raf = null; }
  if (this.animRaf) { cancelAnimationFrame(this.animRaf); this.animRaf = null; }
  window.removeEventListener('resize', this._resizeBound);
  if (this.canvas && this.canvas.parentNode) {
    this.canvas.parentNode.removeChild(this.canvas);
  }
  this.canvas = null;
  this.ctx    = null;
};

LightSystem.prototype._safeGrad = function(x0, y0, r0, x1, y1, r1) {
  if ([x0, y0, r0, x1, y1, r1].some(function(v) { return !isFinite(v) || isNaN(v); })) return null;
  return this.ctx.createRadialGradient(x0, y0, Math.max(0, r0), x1, y1, Math.max(0.001, r1));
};

LightSystem.prototype._render = function(t) {
  if (!this.ctx || !this.canvas) return;
  var ctx = this.ctx;
  var W = this.canvas.width, H = this.canvas.height;
  var active = this.visible && this.opacity > 0.001 && this.radius > 1;
  var cx = W / 2 + (active ? osc(O.dx, t) * 0.38 : 0);
  var cy = H / 2 + (active ? osc(O.dy, t) * 0.30 : 0);

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  if (!active) return;

  var flickerScale = Math.min(1, this._frac / 0.25);
  var intensity = 1
    + (osc(O.b1, t) + osc(O.b2, t)) * flickerScale
    + (osc(O.f1, t) + osc(O.f2, t) + osc(O.f3, t) + osc(O.f4, t)) * flickerScale;
  var r  = Math.max(0, this.radius * Math.max(0.74, intensity));
  var wp = osc(O.w, t);

  ctx.globalAlpha = this.opacity;
  ctx.globalCompositeOperation = 'destination-out';

  var g1 = this._safeGrad(cx, cy, 0, cx, cy, r * 3.9);
  if (g1) {
    g1.addColorStop(0,    'rgba(0,0,0,0.38)');
    g1.addColorStop(0.22, 'rgba(0,0,0,0.24)');
    g1.addColorStop(0.55, 'rgba(0,0,0,0.12)');
    g1.addColorStop(0.82, 'rgba(0,0,0,0.04)');
    g1.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.arc(cx, cy, r * 3.9, 0, Math.PI * 2);
    ctx.fillStyle = g1; ctx.fill();
  }

  var g2 = this._safeGrad(cx, cy, 0, cx, cy, r * 2.25);
  if (g2) {
    g2.addColorStop(0,    'rgba(0,0,0,0.58)');
    g2.addColorStop(0.35, 'rgba(0,0,0,0.38)');
    g2.addColorStop(0.68, 'rgba(0,0,0,0.16)');
    g2.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.arc(cx, cy, r * 2.25, 0, Math.PI * 2);
    ctx.fillStyle = g2; ctx.fill();
  }

  var g3 = this._safeGrad(cx, cy, 0, cx, cy, r * 1.03);
  if (g3) {
    g3.addColorStop(0,    'rgba(0,0,0,0.88)');
    g3.addColorStop(0.28, 'rgba(0,0,0,0.76)');
    g3.addColorStop(0.58, 'rgba(0,0,0,0.52)');
    g3.addColorStop(0.82, 'rgba(0,0,0,0.22)');
    g3.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.arc(cx, cy, r * 1.03, 0, Math.PI * 2);
    ctx.fillStyle = g3; ctx.fill();
  }

  var rC = Math.max(1, r * (0.28 + Math.abs(osc(O.f1, t)) * 0.15));
  var gC = this._safeGrad(cx, cy, 0, cx, cy, rC);
  if (gC) {
    gC.addColorStop(0, 'rgba(0,0,0,0.18)');
    gC.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.arc(cx, cy, rC, 0, Math.PI * 2);
    ctx.fillStyle = gC; ctx.fill();
  }

  ctx.globalCompositeOperation = 'source-over';

  var wR = Math.max(1, r * 0.62 * Math.max(0.55, intensity));
  var wA = 0.048 + Math.abs(wp) * 0.028;
  var gW = this._safeGrad(cx, cy, 0, cx, cy, wR);
  if (gW) {
    var gb = Math.floor(Math.max(0, Math.min(255, 185 + wp * 14)));
    gW.addColorStop(0,    'rgba(255,' + gb + ',70,' + (wA * 1.5).toFixed(3) + ')');
    gW.addColorStop(0.45, 'rgba(255,170,55,' + wA.toFixed(3) + ')');
    gW.addColorStop(1,    'rgba(255,130,20,0)');
    ctx.beginPath(); ctx.arc(cx, cy, wR, 0, Math.PI * 2);
    ctx.fillStyle = gW; ctx.fill();
  }

  var vIn  = Math.max(0, r * 1.05);
  var vOut = Math.max(vIn + 1, Math.sqrt(W * W + H * H) * 0.74);
  var gV   = this._safeGrad(cx, cy, vIn, cx, cy, vOut);
  if (gV) {
    gV.addColorStop(0,   'rgba(0,0,0,0)');
    gV.addColorStop(0.2, 'rgba(0,0,0,0.28)');
    gV.addColorStop(0.6, 'rgba(0,0,0,0.72)');
    gV.addColorStop(1,   'rgba(0,0,0,0.97)');
    ctx.fillStyle = gV;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.globalAlpha = 1;
};

LightSystem.prototype._startLoop = function() {
  if (this.raf) return;
  var self = this;
  var loop = function(t) {
    if (!self.raf) return; // stoppé par destroy()
    self.raf = requestAnimationFrame(loop);
    self._render(t);
  };
  self.raf = requestAnimationFrame(loop);
};

/* =============================================================================
   RÉFÉRENCES DOM
   ─────────────────────────────────────────────────────────────────────────────
   IDs préfixés "chp2-" pour éviter toute collision avec le projet principal.
============================================================================= */
var imgEl   = document.getElementById("chp2-img");
var bar     = document.getElementById("chp2-bar");
// curseur géré par le projet principal — pas de #chp2-cursor dans le DOM intégré
var cursor  = null;
var legend  = document.getElementById("chp2-legend");
var legNum  = document.getElementById("chp2-leg-num");
var legLab  = document.getElementById("chp2-leg-label");
var shakeEl = document.getElementById("chp2-shake");
var fadeEl  = document.getElementById("chp2-fade");

/* =============================================================================
   CRÂNES — zones de clic fractionnaires
============================================================================= */
var SKULLS = [
  {
    id:     "136",
    box:    { x0: 0.085, y0: 0.220, x1: 0.230, y1: 0.700 },
    num:    "136",
    label:  "Invisibilisation de la violence muséale des collections",
    url:    null,
    action: "invibilisation",
    el:     document.getElementById("chp2-ov-136")
  },
  {
    id:     "137",
    box:    { x0: 0.620, y0: 0.180, x1: 0.840, y1: 0.730 },
    num:    "137",
    label:  "Une peine démesurée",
    url:    null,
    action: "peine-demesuree",
    el:     document.getElementById("chp2-ov-137")
  },
  {
    id:     "138",
    box:    { x0: 0.860, y0: 0.170, x1: 0.985, y1: 0.640 },
    num:    "138",
    label:  "La violence et ses traces",
    url:    null,
    action: "cartel",
    el:     document.getElementById("chp2-ov-138")
  }
];

/* =============================================================================
   ÉTAT TRAVELLING
============================================================================= */
var lightStarted = false;
var hoveredSkull = null;
var lastClientX = 0, lastClientY = 0;
var lastMt = 0, lastMx2 = 0, lastMy2 = 0;
var velocity = 0;
var shakeMul = 1;
var vpH = 0;
var vpW = 0, imgW = 0, maxTx = 0, targetX = 0, currentX = 0, ratio = 0, started = false;

var SHAKE = {
  amplitudeX: 2.2,
  amplitudeY: 1.6,
  rotation:   0.08,
  velocityRef: 1800,
  boost:       1.2,
  maxBoost:    2.2,
  smoothing:   0.035
};

var IGNITE = {
  duration:    5000,
  finalRadius: 0.70,
  delay:       2600
};

/* =============================================================================
   RAF handles pour nettoyage lors de stopChapitre2()
============================================================================= */
var _travelRaf = null;
var _shakeRaf  = null;
var _resizeObs = null;
var _clickHandler    = null;
var _mousemoveHandler = null;
var _touchmoveHandler = null;
var _igniteTimers = [];   // setTimeouts de la séquence d'allumage — vidés au stop

/* =============================================================================
   MESURE & TRANSLATION
============================================================================= */
function measure() {
  if (!imgEl) return;
  vpW  = document.documentElement.clientWidth;
  vpH  = document.documentElement.clientHeight;
  imgW = imgEl.getBoundingClientRect().width;
  maxTx = Math.min(0, vpW - imgW);
  targetX = currentX = ratio * maxTx;
  applyTx(currentX);
}

function applyTx(tx) {
  if (!imgEl) return;
  tx = Math.max(maxTx, Math.min(0, tx));
  var r = Math.round(tx);
  var transform = "translateX(" + r + "px)";
  imgEl.style.transform = transform;
  for (var i = 0; i < SKULLS.length; i++) {
    if (SKULLS[i].el) SKULLS[i].el.style.transform = transform;
  }
  var pct = maxTx !== 0 ? r / maxTx : 0;
  pct = Math.max(0, Math.min(1, pct));
  if (bar) bar.style.width = (pct * 100) + "%";
  updateHover();
}

/* =============================================================================
   HOVER DETECTION
============================================================================= */
function updateHover() {
  if (document.body.classList.contains('cartel-open') || document.body.classList.contains('invibilisation-open')) {
    if (hoveredSkull) hoveredSkull.el && hoveredSkull.el.classList.remove("visible");
    hoveredSkull = null;
    if (legend) legend.classList.remove("visible");
    if (cursor) cursor.classList.remove("clickable");
    return;
  }
  if (!lightStarted) {
    if (hoveredSkull) hoveredSkull.el && hoveredSkull.el.classList.remove("visible");
    hoveredSkull = null;
    if (legend) legend.classList.remove("visible");
    if (cursor) cursor.classList.remove("clickable");
    return;
  }
  if (vpH === 0 || imgW === 0) return;

  var imgX = lastClientX - currentX;
  var imgY = lastClientY;
  var fx = imgX / imgW;
  var fy = imgY / vpH;

  var hit = null;
  for (var i = 0; i < SKULLS.length; i++) {
    var b = SKULLS[i].box;
    if (fx >= b.x0 && fx <= b.x1 && fy >= b.y0 && fy <= b.y1) {
      hit = SKULLS[i];
      break;
    }
  }

  if (hit !== hoveredSkull) {
    if (hoveredSkull) hoveredSkull.el && hoveredSkull.el.classList.remove("visible");
    hoveredSkull = hit;
    if (hit) {
      hit.el && hit.el.classList.add("visible");
      if (legNum) legNum.textContent = hit.num;
      if (legLab) legLab.textContent = hit.label;
      if (legend) legend.classList.add("visible");
    } else {
      if (legend) legend.classList.remove("visible");
    }
    if (cursor) cursor.classList.toggle("clickable", !!(hit && (hit.url || hit.action)));
  }
}

/* =============================================================================
   MOUVEMENT (souris + touch)
============================================================================= */
function onMove(clientX, clientY) {
  if (!started) {
    started = true;
    if (cursor) cursor.classList.add("visible");
  }
  if (clientY !== null) {
    var now = performance.now();
    if (lastMt > 0) {
      var dt = Math.max(1, now - lastMt);
      var dx = clientX - lastMx2;
      var dy = clientY - lastMy2;
      var v  = Math.sqrt(dx * dx + dy * dy) / dt * 1000;
      velocity = velocity * 0.7 + v * 0.3;
    }
    lastMt = now; lastMx2 = clientX; lastMy2 = clientY;
  }
  lastClientX = clientX;
  lastClientY = clientY !== null ? clientY : lastClientY;
  ratio   = Math.max(0, Math.min(1, clientX / vpW));
  targetX = ratio * maxTx;
  if (clientY !== null && cursor) {
    cursor.style.left = clientX + "px";
    cursor.style.top  = clientY + "px";
  }
}

_mousemoveHandler = function(e) { onMove(e.clientX, e.clientY); };
window.addEventListener("mousemove", _mousemoveHandler);

_touchmoveHandler = function(e) {
  if (document.body.classList.contains('cartel-open') || document.body.classList.contains('invibilisation-open')) return;
  e.preventDefault();
  onMove(e.touches[0].clientX, null);
};
window.addEventListener("touchmove", _touchmoveHandler, { passive: false });

/* =============================================================================
   CLIC — invibilisation | cartel | peine-demesuree | navigation retour
   ─────────────────────────────────────────────────────────────────────────────
   La navigation externe (window.location.href) est remplacée par un
   CustomEvent 'chp2:navigate-back' capté par Chapitre2Scene.js.
============================================================================= */
var navigating = false;

_clickHandler = function(e) {
  if (document.body.classList.contains('cartel-open') || document.body.classList.contains('invibilisation-open')) return;
  if (navigating) return;
  if (!hoveredSkull) return;

  if (hoveredSkull.action === "invibilisation") {
    openInvibilisationOverlay();
    return;
  }

  if (hoveredSkull.action === "cartel") {
    openCartelOverlay();
    return;
  }

  if (hoveredSkull.action === "peine-demesuree") {
    openPeineDemesureeOverlay();
    return;
  }

  /* Navigation externe → remplacée par signal vers Chapitre2Scene */
  if (!hoveredSkull.url) return;
  navigating = true;

  if (legend) legend.classList.remove("visible");
  if (cursor) cursor.classList.remove("visible");
  if (hoveredSkull.el) hoveredSkull.el.classList.remove("visible");

  light.animateToFraction(0, 1600, 0);

  setTimeout(function() { if (fadeEl) fadeEl.classList.add("out"); }, 200);
  setTimeout(function() {
    window.dispatchEvent(new CustomEvent('chp2:navigate-back'));
  }, 2000);
};
window.addEventListener("click", _clickHandler);

/* =============================================================================
   BOUCLES D'ANIMATION
============================================================================= */
measure();

// Boucle de travelling (interpolation douce)
(function travelLoop() {
  var d = targetX - currentX;
  currentX = Math.abs(d) < 0.05 ? targetX : currentX + d * 0.08;
  applyTx(currentX);
  _travelRaf = requestAnimationFrame(travelLoop);
})();

// Boucle de tremblement organique
(function shakeLoop() {
  var t = performance.now();
  velocity *= 0.92;
  var target = 1 + Math.min(SHAKE.boost, velocity / SHAKE.velocityRef * SHAKE.boost);
  target = Math.min(SHAKE.maxBoost, target);
  shakeMul += (target - shakeMul) * SHAKE.smoothing;

  var sx = (Math.sin(t * 0.001 * O.shx1.freq * Math.PI * 2 + O.shx1.phase)
          + Math.sin(t * 0.001 * O.shx2.freq * Math.PI * 2 + O.shx2.phase) * 0.5
          + Math.sin(t * 0.001 * O.shx3.freq * Math.PI * 2 + O.shx3.phase) * 0.25) / 1.75;
  var sy = (Math.sin(t * 0.001 * O.shy1.freq * Math.PI * 2 + O.shy1.phase)
          + Math.sin(t * 0.001 * O.shy2.freq * Math.PI * 2 + O.shy2.phase) * 0.5
          + Math.sin(t * 0.001 * O.shy3.freq * Math.PI * 2 + O.shy3.phase) * 0.25) / 1.75;
  var rot = sx * SHAKE.rotation * shakeMul;

  if (shakeEl) {
    shakeEl.style.transform =
      "translate(" + (sx * SHAKE.amplitudeX * shakeMul).toFixed(2) + "px,"
                   + (sy * SHAKE.amplitudeY * shakeMul).toFixed(2) + "px) "
      + "rotate(" + rot.toFixed(3) + "deg)";
  }
  _shakeRaf = requestAnimationFrame(shakeLoop);
})();

/* =============================================================================
   LIGHT SYSTEM — instancié après les boucles, monté sur chp2-shake
============================================================================= */
var light = new LightSystem("chp2-shake");

/* =============================================================================
   AUDIO — centralisé dans AudioManager (piste 'chp2' / fredonnement)
   ─────────────────────────────────────────────────────────────────────────────
   Chapitre2Scene injecte le gestionnaire audio partagé via setAudioManager().
   Plus aucun élément Audio local au module : une seule piste centralisée, donc
   pas de dédoublement ni de son résiduel entre les (ré)entrées dans le chapitre.
   `audio` est une fine façade qui mappe l'API historique du module vers les
   méthodes du gestionnaire ; chaque appel est protégé par le flag _active afin
   qu'une instance périmée (cache-bust) ne puisse plus piloter le son partagé.
============================================================================= */
var _audio  = null;   // AudioManager injecté
var _active = false;  // true entre startChapitre2() et stopChapitre2()

var audio = {
  fadeIn: function(targetVol, ms) { if (_active && _audio) _audio.startChp2Loop(ms); },
  fadeOut:function(ms)            { if (_audio) _audio.stopChp2Loop(ms); },
  duck:   function(ms)            { if (_active && _audio) _audio.duckChp2(ms); },
  unduck: function(ms)            { if (_active && _audio) _audio.unduckChp2(ms); },
  stop:   function()              { if (_audio) _audio.stopChp2Loop(200); }
};

/* =============================================================================
   PONT FLÈCHE OPENNING ↔ Chapitre2Scene
   ─────────────────────────────────────────────────────────────────────────────
   Chapitre2Scene injecte ses callbacks via setArrowCallbacks().
   - _arrowShow() : afficher la flèche retour vers Collaboration
   - _arrowHide() : masquer la flèche (quand on entre dans une sous-partie)
   La flèche s'affiche après que lightStarted soit true (bougie allumée).
============================================================================= */
var _arrowShow = null;
var _arrowHide = null;
var _arrowShownOnce = false;

/* =============================================================================
   IGNITION
============================================================================= */
function ignite() {
  light.set(0, 1);
  light.show();
  _igniteTimers.push(setTimeout(function() {
    if (!_active) return;
    light.animateToFraction(IGNITE.finalRadius, IGNITE.duration, 1);
    audio.fadeIn(0.72, IGNITE.duration);
    _igniteTimers.push(setTimeout(function() {
      if (!_active) return;
      lightStarted = true;
      // Afficher la flèche openning ~600ms après que la bougie soit visible
      _igniteTimers.push(setTimeout(function() {
        if (!_active) return;
        if (_arrowShow && !_arrowShownOnce) {
          _arrowShownOnce = true;
          _arrowShow();
        }
      }, 600));
    }, 800));
  }, IGNITE.delay));
}

var _ignited = false;
function safeIgnite() {
  if (_ignited) return;
  _ignited = true;
  ignite();
}

/* =============================================================================
   RESIZE — ResizeObserver
============================================================================= */
_resizeObs = new ResizeObserver(function() {
  measure();
  light.resize();
});
_resizeObs.observe(document.documentElement);

/* =============================================================================
   PONT TRAVELLING ⇄ CARTEL
============================================================================= */
var cartelModulePromise = null;

function loadCartelModule() {
  if (!cartelModulePromise) {
    cartelModulePromise = import('./chp2-violence-et-trace.js');
  }
  return cartelModulePromise;
}

function openPeineDemesureeOverlay() {
  if (document.body.classList.contains('peine-demesuree-open')) return;
  if (legend) legend.classList.remove("visible");
  if (hoveredSkull && hoveredSkull.el) hoveredSkull.el.classList.remove("visible");
  if (_arrowHide) _arrowHide();
  audio.duck(800);
  document.body.classList.add('peine-demesuree-open');

  light.animateToFraction(0, 2000, 0).then(function() {
    var root = document.getElementById('peine-demesuree-root');
    if (!root) return;
    root.style.opacity = '0';
    root.style.transition = 'opacity 3s ease';
    root.classList.add('is-open');

    loadPeineDemesureeModule().then(function(mod) {
      mod.openPeineDemesuree();
      requestAnimationFrame(function() { root.style.opacity = '1'; });
    }).catch(function(err) {
      console.error('[Peine] Échec chargement :', err);
      document.body.classList.remove('peine-demesuree-open');
      audio.unduck(400);
      light.animateToFraction(IGNITE.finalRadius, 800, 1);
    });
  });
}

function openCartelOverlay() {
  if (legend) legend.classList.remove("visible");
  if (hoveredSkull && hoveredSkull.el) hoveredSkull.el.classList.remove("visible");
  if (_arrowHide) _arrowHide();
  audio.duck(800);
  light.animateToFraction(0, 2000, 0).then(function() {
    loadCartelModule().then(function(mod) {
      var ok = mod.openCartel();
      if (!ok) {
        light.animateToFraction(IGNITE.finalRadius, 800, 1);
        audio.unduck(400);
      }
    }).catch(function(err) {
      console.error('[Cartel] Échec chargement :', err);
      light.animateToFraction(IGNITE.finalRadius, 800, 1);
      audio.unduck(400);
    });
  });
}

function _onCartelClosed() {
  if (!_active) return;
  document.body.classList.remove('cartel-open');
  if (_arrowShow) _arrowShow();
}
window.addEventListener('cartel:closed', _onCartelClosed);

function _onCartelReturn() {
  if (!_active) return;
  document.body.classList.remove('cartel-open');
  if (_arrowShow) setTimeout(_arrowShow, 2800);
  if (fadeEl) {
    fadeEl.style.zIndex     = '10001';
    fadeEl.style.transition = 'opacity 0s';
    fadeEl.classList.add('out');
    void fadeEl.offsetWidth;
    fadeEl.style.transition = 'opacity 2.5s ease';
    fadeEl.classList.remove('out');
  }
  light.set(0, 0);
  light.show();
  light.animateToFraction(IGNITE.finalRadius, 3000, 1);
  audio.fadeIn(0.72, 3000);
  setTimeout(function() {
    if (fadeEl) { fadeEl.style.zIndex = ''; fadeEl.style.transition = ''; }
  }, 2600);
}
window.addEventListener('cartel:return', _onCartelReturn);

/* =============================================================================
   PONT TRAVELLING ⇄ INVIBILISATION (lazy)
============================================================================= */
var invibilisationModulePromise = null;

function loadInvibilisationModule() {
  if (!invibilisationModulePromise) {
    invibilisationModulePromise = import('./chp2-invibilisation.js');
  }
  return invibilisationModulePromise;
}

var peineDemesureeModulePromise = null;

function loadPeineDemesureeModule() {
  if (!peineDemesureeModulePromise) {
    peineDemesureeModulePromise = import('./chp2-peine-demesuree.js');
  }
  return peineDemesureeModulePromise;
}

function openInvibilisationOverlay() {
  if (legend) legend.classList.remove("visible");
  if (hoveredSkull && hoveredSkull.el) hoveredSkull.el.classList.remove("visible");
  if (_arrowHide) _arrowHide();
  audio.duck(800);
  document.body.classList.add('invibilisation-open');
  loadInvibilisationModule().then(function(mod) {
    mod.openInvibilisation();
  }).catch(function(err) {
    console.error('[Invibilisation] Échec chargement :', err);
    document.body.classList.remove('invibilisation-open');
    audio.unduck(400);
  });
}

function _onInvibilisationClosed() {
  if (!_active) return;
  document.body.classList.remove('invibilisation-open');
  audio.unduck(1200);
  // La flèche openning réapparaît via 'invibilisation:return' (après rallumage
  // progressif de la bougie), pour rester cohérent avec peine/cartel.
  var root = document.getElementById('invibilisation-root');
  if (root) {
    root.classList.remove('no-loader');
    root.style.opacity    = '';
    root.style.transition = '';
  }
}
window.addEventListener('invibilisation:closed', _onInvibilisationClosed);

function _onInvibilisationReturn() {
  if (!_active) return;
  document.body.classList.remove('invibilisation-open');
  if (_arrowShow) setTimeout(_arrowShow, 2800);
  light.animateToFraction(IGNITE.finalRadius, 3000, 1);
  audio.fadeIn(0.72, 3000);
  if (fadeEl) {
    fadeEl.style.zIndex = '10001';
    fadeEl.style.transition = 'opacity 3s ease';
    fadeEl.classList.add('out');
    void fadeEl.offsetWidth;
    fadeEl.classList.remove('out');
    setTimeout(function() {
      fadeEl.style.zIndex = '';
      fadeEl.style.transition = '';
    }, 3100);
  }
}
window.addEventListener('invibilisation:return', _onInvibilisationReturn);

function _onPeineClosed() {
  if (!_active) return;
  document.body.classList.remove('peine-demesuree-open');
  // Flèche openning réaffichée via 'peineDemesuree:return' (après rallumage).
}
window.addEventListener('peine-demesuree:closed', _onPeineClosed);

function _onPeineReturn() {
  if (!_active) return;
  document.body.classList.remove('peine-demesuree-open');
  if (_arrowShow) setTimeout(_arrowShow, 2800);
  if (fadeEl) {
    fadeEl.style.zIndex     = '10001';
    fadeEl.style.transition = 'opacity 0s';
    fadeEl.classList.add('out');
    void fadeEl.offsetWidth;
    fadeEl.style.transition = 'opacity 2.5s ease';
    fadeEl.classList.remove('out');
  }
  light.set(0, 0);
  light.show();
  light.animateToFraction(IGNITE.finalRadius, 3000, 1);
  audio.fadeIn(0.72, 3000);
  setTimeout(function() {
    if (fadeEl) { fadeEl.style.zIndex = ''; fadeEl.style.transition = ''; }
  }, 2600);
}
window.addEventListener('peineDemesuree:return', _onPeineReturn);

/* =============================================================================
   SRT + AUDIO
============================================================================= */
function parseSRT(raw) {
  var cues = [];
  var blocks = raw.trim().split(/\n\s*\n/);
  var timeRe = /^(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/;
  for (var i = 0; i < blocks.length; i++) {
    var lines = blocks[i].trim().split(/\n/);
    if (lines.length < 2) continue;
    var timeLine = -1;
    for (var j = 0; j < lines.length; j++) {
      if (lines[j].indexOf('-->') !== -1) { timeLine = j; break; }
    }
    if (timeLine === -1) continue;
    var m = lines[timeLine].match(timeRe);
    if (!m) continue;
    var toMs = function(h, min, s, ms) {
      return (parseInt(h,10)*3600 + parseInt(min,10)*60 + parseInt(s,10))*1000 + parseInt(ms,10);
    };
    var start = toMs(m[1], m[2], m[3], m[4]);
    var end   = toMs(m[5], m[6], m[7], m[8]);
    var text  = lines.slice(timeLine + 1).join('\n').trim();
    if (text) cues.push({ start: start, end: end, text: text });
  }
  return cues.sort(function(a,b) { return a.start - b.start; });
}

/* =============================================================================
   EXPORTS PUBLICS — appelés par Chapitre2Scene.js
   ─────────────────────────────────────────────────────────────────────────────
   startChapitre2() : déclenche l'ignition dès que l'image est prête.
   stopChapitre2()  : fade audio, stoppe les boucles, détruit le LightSystem.
============================================================================= */

/**
 * Chapitre2Scene injecte ses callbacks pour contrôler la flèche openning.
 * @param {Function} showFn  — affiche la flèche avec animation ArrowBase
 * @param {Function} hideFn  — masque la flèche avec animation
 */
export function setArrowCallbacks(showFn, hideFn) {
  _arrowShow = showFn;
  _arrowHide = hideFn;
}

/**
 * Injection du gestionnaire audio partagé (AudioManager).
 * Toute l'ambiance du chapitre 2 transite désormais par lui (piste 'chp2').
 */
export function setAudioManager(mgr) {
  _audio = mgr;
}

/**
 * Sortie cinématographique openning → Espace collaboratif.
 * Déclenchée par le clic sur la flèche openning (Chapitre2Scene).
 * Éteint progressivement la bougie + le son, fond au noir, puis signale
 * 'chp2:navigate-back' à Chapitre2Scene qui effectue la navigation réelle.
 * Idempotente via le verrou `navigating`.
 */
export function leaveToCollaboration() {
  if (navigating) return;
  navigating = true;

  if (_arrowHide) _arrowHide();
  if (legend) legend.classList.remove('visible');
  if (cursor) cursor.classList.remove('visible');
  if (hoveredSkull && hoveredSkull.el) hoveredSkull.el.classList.remove('visible');

  // Extinction progressive de la bougie + fondu sonore
  light.animateToFraction(0, 1600, 0);
  audio.fadeOut(1600);

  // Fondu au noir, puis signal de navigation
  setTimeout(function() { if (fadeEl) fadeEl.classList.add('out'); }, 200);
  setTimeout(function() {
    window.dispatchEvent(new CustomEvent('chp2:navigate-back'));
  }, 2000);
}

export function startChapitre2() {
  if (!imgEl) {
    console.error('[Chapitre2] #chp2-img introuvable');
    return;
  }
  _active = true;
  if (imgEl.complete && imgEl.naturalWidth > 0) {
    safeIgnite();
  } else {
    imgEl.addEventListener("load",  safeIgnite, { once: true });
    imgEl.addEventListener("error", safeIgnite, { once: true });
    var _igniteTimeout = setTimeout(safeIgnite, 10000);
    imgEl.addEventListener("load", function() { clearTimeout(_igniteTimeout); }, { once: true });
  }
}

export function stopChapitre2() {
  /* 0. Désactivation : neutralise tout callback asynchrone encore en vol */
  _active = false;

  /* 0bis. Reset des états pour permettre une ré-entrée propre */
  _arrowShow = null;
  _arrowHide = null;
  _arrowShownOnce = false;
  _ignited = false;
  navigating = false;
  lightStarted = false;

  /* 1. Stopper l'audio centralisé (piste chp2 / fredonnement) */
  audio.stop();

  /* 2. Purger les timers de la séquence d'allumage */
  _igniteTimers.forEach(function(id) { clearTimeout(id); });
  _igniteTimers = [];

  /* 3. Stopper les boucles RAF */
  if (_travelRaf) { cancelAnimationFrame(_travelRaf); _travelRaf = null; }
  if (_shakeRaf)  { cancelAnimationFrame(_shakeRaf);  _shakeRaf  = null; }

  /* 4. Détruire le LightSystem (canvas + RAF internes) */
  if (light) light.destroy();

  /* 5. Déconnecter TOUS les listeners window (mouvement + events sous-parties) */
  if (_mousemoveHandler)  window.removeEventListener("mousemove", _mousemoveHandler);
  if (_touchmoveHandler)  window.removeEventListener("touchmove", _touchmoveHandler);
  if (_clickHandler)      window.removeEventListener("click",     _clickHandler);
  window.removeEventListener('cartel:closed',          _onCartelClosed);
  window.removeEventListener('cartel:return',          _onCartelReturn);
  window.removeEventListener('invibilisation:closed',  _onInvibilisationClosed);
  window.removeEventListener('invibilisation:return',  _onInvibilisationReturn);
  window.removeEventListener('peine-demesuree:closed', _onPeineClosed);
  window.removeEventListener('peineDemesuree:return',  _onPeineReturn);

  /* 6. Déconnecter le ResizeObserver */
  if (_resizeObs) { _resizeObs.disconnect(); _resizeObs = null; }

  /* 7. Fermer proprement les sous-modules si ouverts */
  ['cartel-open', 'invibilisation-open', 'peine-demesuree-open'].forEach(function(cls) {
    document.body.classList.remove(cls);
  });
}
