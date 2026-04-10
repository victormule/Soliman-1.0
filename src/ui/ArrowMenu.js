/**
 * ArrowMenu.js
 *
 * Flèche de la scène Phréno (menu/navigation principale).
 *
 * POSITION   : haut de l'écran, centré horizontalement
 * DIRECTION  : pointe vers le haut  ↑
 * DOM ID     : #arrow-menu
 *
 * Usage dans PhrenologieScene :
 *   this._arrow = new ArrowMenu(window.CONFIG);
 *   this._arrow.show(() => bus.emit('navigate', { to: 'vitrine' }));
 */

import { ArrowBase } from './ArrowBase.js';

export class ArrowMenu extends ArrowBase {
  constructor(config) {
    super(
      config,
      'arrow-menu',
      'M35 48 L35 22 M24 33 L35 22 L46 33'  // ↑ pointe vers le haut
    );
  }

  _applyPosition(sz) {
    const vW     = Math.max(this.config.MIN_SIZE.width,  window.innerWidth);
    const vH     = Math.max(this.config.MIN_SIZE.height, window.innerHeight);
    const margin = Math.round(Math.min(vW, vH) * 0.05);

    Object.assign(this.el.style, {
      bottom:    '',
      right:     '',
      // Haut de l'écran, centré sur l'axe X
      top:       margin + 'px',
      left:      '50%',
      transform: 'translateX(-50%)',
    });
  }
}
