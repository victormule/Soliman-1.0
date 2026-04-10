/**
 * NavigationBar.js
 * Barre de navigation bas avec animation SVG et hover
 */

import { unifyFontSize } from '../utils/helpers.js';

export class NavigationBar {
  constructor(config, arrowSizeFn) {
    this.config = config;
    this.arrowSizeFn = arrowSizeFn; // Fonction qui retourne taille flèche
    this.el = document.getElementById('nav-bar');
    this.drawn = false;
    this.animRaf = null;
  }

  /**
   * Dessine la barre
   */
  draw(animate, onClickCallbacks) {
    const C = this.config.NAV;
    const vW = Math.max(this.config.MIN_SIZE.width, window.innerWidth);
    const vH = Math.max(this.config.MIN_SIZE.height, window.innerHeight);
    const W = vW, H = vH;
    const ns = 'http://www.w3.org/2000/svg';

    // Alignement avec fsBtn
    const sz = this.arrowSizeFn();
    const h = sz;
    const bottom = Math.round(H * 0.05);
    const y = H - bottom - h;

    // Largeur centrée
    const fsBtnW = sz + Math.round(W * 0.035) * 2;
    const maxW = W - Math.round(W * 0.035) - fsBtnW;
    const bw = Math.min(Math.round(W * C.width), maxW);
    const x = Math.round((W - bw) / 2);

    const N = C.labels.length;

    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);

    // Rectangle extérieur
    const perim = 2 * (bw + h);
    const outerRect = document.createElementNS(ns, 'rect');
    outerRect.setAttribute('class', 'nav-rect-path');
    outerRect.setAttribute('x', x);
    outerRect.setAttribute('y', y);
    outerRect.setAttribute('width', bw);
    outerRect.setAttribute('height', h);
    outerRect.setAttribute('stroke', C.stroke_color);
    outerRect.setAttribute('stroke-width', C.stroke_width);
    outerRect.style.strokeDasharray = perim;
    outerRect.style.strokeDashoffset = animate ? perim : '0';
    outerRect.style.transition = animate ? `stroke-dashoffset ${C.draw_speed}s cubic-bezier(0.4,0,0.2,1)` : 'none';
    svg.appendChild(outerRect);

    // Séparateurs
    const seps = [], sepDefaultX = [];
    for (let i = 1; i < N; i++) {
      const sx = x + i * bw / N;
      sepDefaultX.push(sx);
      const sep = document.createElementNS(ns, 'line');
      sep.setAttribute('class', 'nav-rect-path');
      sep.setAttribute('x1', sx);
      sep.setAttribute('y1', y);
      sep.setAttribute('x2', sx);
      sep.setAttribute('y2', y + h);
      sep.setAttribute('stroke', C.stroke_color);
      sep.setAttribute('stroke-width', C.stroke_width);
      const d = C.draw_speed + (i - 1) * C.sep_delay;
      sep.style.strokeDasharray = h;
      sep.style.strokeDashoffset = animate ? h : '0';
      sep.style.transition = animate ? `stroke-dashoffset ${C.sep_speed}s cubic-bezier(0.4,0,0.2,1) ${d}s` : 'none';
      svg.appendChild(sep);
      seps.push(sep);
    }

    // Textes + zones
    const txts = [], zones = [];
    const cellW = bw / N;

    C.labels.forEach((label, i) => {
      const cx = x + (i + 0.5) * cellW;
      const cy = y + h / 2;
      const d = C.draw_speed + i * C.sep_delay + C.text_delay;
      
      const txt = document.createElementNS(ns, 'text');
      txt.setAttribute('class', 'nav-btn-label');
      txt.setAttribute('x', cx);
      txt.setAttribute('y', cy);
      txt.setAttribute('fill', C.btn_color);
      
      const fNav = this.config.FONTS?.nav_btns;
      const navFontSize = fNav
        ? Math.max(fNav.size_min, Math.min(fNav.size_max, Math.round(vW * fNav.size_vw / 100)))
        : Math.round(h * 0.38);
      
      txt.setAttribute('font-family', fNav?.family ?? C.btn_font);
      txt.setAttribute('font-size', navFontSize + 'px');
      txt.setAttribute('letter-spacing', fNav?.spacing ?? C.btn_letter_spacing);
      txt.setAttribute('font-weight', fNav?.weight ?? 300);
      txt.textContent = label;
      txt.style.opacity = animate ? '0' : '1';
      txt.style.transition = animate ? `opacity ${C.text_fade}s ease ${d}s` : 'none';
      svg.appendChild(txt);
      txts.push(txt);

      const zone = document.createElementNS(ns, 'rect');
      zone.setAttribute('class', 'nav-btn-zone');
      zone.setAttribute('x', x + i * cellW);
      zone.setAttribute('y', y);
      zone.setAttribute('width', cellW);
      zone.setAttribute('height', h);
      zone.setAttribute('fill', 'transparent');
      svg.appendChild(zone);
      zones.push(zone);
    });

    // Injection DOM
    this.el.innerHTML = '';
    this.el.style.width = W + 'px';
    this.el.style.height = H + 'px';
    this.el.appendChild(svg);

    // Uniformiser police
    unifyFontSize(txts, cellW * 0.82, parseFloat(txts[0].getAttribute('font-size')));

    if (animate) {
      setTimeout(() => {
        outerRect.style.strokeDashoffset = '0';
        seps.forEach(s => s.style.strokeDashoffset = '0');
        txts.forEach(t => t.style.opacity = '1');
      }, 40);
    }

    this.drawn = true;

    // Hover animation
    const EXPAND = cellW * 0.18;
    const DUR_MS = 600;
    let sepCurX = sepDefaultX.slice();

    const animateSeps = (targetX, targetTxtX, hovI) => {
      if (this.animRaf) {
        cancelAnimationFrame(this.animRaf);
        this.animRaf = null;
      }
      const startX = sepCurX.slice();
      const startTX = txts.map(t => parseFloat(t.getAttribute('x')));
      const t0 = performance.now();

      const step = (now) => {
        const p = Math.min((now - t0) / DUR_MS, 1);
        const e = 1 - Math.pow(1 - p, 3); // ease-out cubic
        seps.forEach((sep, si) => {
          const nx = startX[si] + (targetX[si] - startX[si]) * e;
          sepCurX[si] = nx;
          sep.setAttribute('x1', nx);
          sep.setAttribute('x2', nx);
        });
        txts.forEach((txt, ti) => {
          const nx = startTX[ti] + (targetTxtX[ti] - startTX[ti]) * e;
          txt.setAttribute('x', nx);
          txt.setAttribute('fill', ti === hovI ? C.btn_color_hover : C.btn_color);
        });
        if (p < 1) {
          this.animRaf = requestAnimationFrame(step);
        } else {
          this.animRaf = null;
        }
      };
      this.animRaf = requestAnimationFrame(step);
    };

    zones.forEach((zone, i) => {
      zone.addEventListener('mouseenter', () => {
        const tSepX = sepDefaultX.map((sx, si) => {
          if (si === i - 1) return sx - EXPAND;
          if (si === i) return sx + EXPAND;
          return sx;
        });
        const tTxtX = txts.map((_, ti) => {
          const leftX = ti === 0 ? x : (tSepX[ti - 1] ?? sepDefaultX[ti - 1]);
          const rightX = ti === N - 1 ? x + bw : (tSepX[ti] ?? sepDefaultX[ti]);
          return (leftX + rightX) / 2;
        });
        animateSeps(tSepX, tTxtX, i);
        txts[i].setAttribute('fill', C.btn_color_hover);
      });

      zone.addEventListener('mouseleave', () => {
        const tTxtX = txts.map((_, ti) => x + (ti + 0.5) * cellW);
        animateSeps(sepDefaultX.slice(), tTxtX, -1);
        txts.forEach(t => t.setAttribute('fill', C.btn_color));
      });

      zone.addEventListener('click', () => {
        if (onClickCallbacks && onClickCallbacks[i]) {
          onClickCallbacks[i]();
        }
      });
    });
  }

  /**
   * Affiche avec animation
   */
  show(onClickCallbacks) {
    this.draw(true, onClickCallbacks);
    this.el.style.opacity = '';
    setTimeout(() => {
      this.el.classList.add('visible');
    }, 16);
  }

  /**
   * Cache
   */
  hide() {
    this.el.style.transition = 'opacity 900ms ease';
    this.el.style.opacity = '0';
    this.el.classList.remove('visible');
    
    setTimeout(() => {
      this.el.innerHTML = '';
      this.drawn = false;
    }, 920);
  }

  /**
   * Redimensionne
   */
  resize(onClickCallbacks) {
    if (this.drawn) {
      this.draw(false, onClickCallbacks);
    }
  }
}
