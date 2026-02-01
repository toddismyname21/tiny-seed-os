/**
 * TinyPM Avatar Generator
 * ========================
 * Generates SVG avatars with the Magic vs Science aesthetic.
 * Can be used standalone or integrated into the Avatar Builder.
 *
 * Usage:
 *   const svg = TinyPMAvatarGenerator.generate(state);
 *   const svg = TinyPMAvatarGenerator.generateMini(state); // For small icons
 */

const TinyPMAvatarGenerator = {
  // Default avatar state
  defaultState: {
    baseShape: 'seed',
    magicEyeColor: '#8B5CF6',
    scienceEyeColor: '#14B8A6',
    bodyTone: '#F5D0C5',
    hairStyle: 'leaf',
    accessories: [],
    expression: 'happy',
    glowIntensity: 70
  },

  // Color palettes for randomization
  palettes: {
    magicEyes: ['#8B5CF6', '#F59E0B', '#EC4899', '#C4B5FD', '#A855F7', '#F472B6'],
    scienceEyes: ['#14B8A6', '#3B82F6', '#22D3EE', '#10B981', '#06B6D4', '#0EA5E9'],
    bodyTones: ['#F5D0C5', '#E8B89D', '#C68642', '#8D5524', '#FFE4C4', '#DEB887', '#D2691E', '#4A3728', '#FFDAB9', '#BC8F8F'],
    shapes: ['seed', 'orb', 'crystal', 'flame', 'star'],
    hairStyles: ['leaf', 'antenna', 'sprout', 'flower', 'lightning'],
    accessories: ['wizard_hat', 'goggles', 'crown', 'halo'],
    expressions: ['happy', 'thinking', 'alert', 'celebrating']
  },

  /**
   * Adjust color brightness
   */
  adjustColor(color, amount) {
    const hex = color.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(hex.slice(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.slice(2, 4), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.slice(4, 6), 16) + amount));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  },

  /**
   * Generate a random avatar state
   */
  randomState() {
    const p = this.palettes;
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];

    return {
      baseShape: pick(p.shapes),
      magicEyeColor: pick(p.magicEyes),
      scienceEyeColor: pick(p.scienceEyes),
      bodyTone: pick(p.bodyTones),
      hairStyle: pick(p.hairStyles),
      accessories: Math.random() > 0.5 ? [pick(p.accessories)] : [],
      expression: pick(p.expressions),
      glowIntensity: 50 + Math.floor(Math.random() * 50)
    };
  },

  /**
   * Generate the base shape path/element
   */
  generateBodyPath(baseShape, gradientId) {
    switch(baseShape) {
      case 'seed':
        return `
          <path d="M 50,15
                   C 75,25 80,45 80,55
                   C 80,75 70,90 50,90
                   C 30,90 20,75 20,55
                   C 20,45 25,25 50,15 Z"
                fill="url(#${gradientId})"
                stroke="rgba(255,255,255,0.2)"
                stroke-width="1"/>
        `;
      case 'orb':
        return `
          <circle cx="50" cy="55" r="35"
                  fill="url(#${gradientId})"
                  stroke="rgba(255,255,255,0.2)"
                  stroke-width="1"/>
        `;
      case 'crystal':
        return `
          <polygon points="50,15 75,40 75,70 50,90 25,70 25,40"
                   fill="url(#${gradientId})"
                   stroke="rgba(255,255,255,0.3)"
                   stroke-width="1"/>
          <line x1="50" y1="15" x2="50" y2="90" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
          <line x1="25" y1="55" x2="75" y2="55" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
        `;
      case 'flame':
        return `
          <path d="M 50,10
                   C 65,25 75,40 70,60
                   C 68,75 60,85 50,90
                   C 40,85 32,75 30,60
                   C 25,40 35,25 50,10 Z"
                fill="url(#${gradientId})"
                stroke="rgba(255,255,255,0.2)"
                stroke-width="1">
            <animate attributeName="d"
                     values="M 50,10 C 65,25 75,40 70,60 C 68,75 60,85 50,90 C 40,85 32,75 30,60 C 25,40 35,25 50,10 Z;
                             M 50,12 C 68,27 77,42 72,62 C 70,77 62,87 50,92 C 38,87 30,77 28,62 C 23,42 32,27 50,12 Z;
                             M 50,10 C 65,25 75,40 70,60 C 68,75 60,85 50,90 C 40,85 32,75 30,60 C 25,40 35,25 50,10 Z"
                     dur="2s" repeatCount="indefinite"/>
          </path>
        `;
      case 'star':
        return `
          <polygon points="50,10 58,38 88,38 64,55 73,85 50,68 27,85 36,55 12,38 42,38"
                   fill="url(#${gradientId})"
                   stroke="rgba(255,255,255,0.2)"
                   stroke-width="1"/>
        `;
      default:
        return this.generateBodyPath('seed', gradientId);
    }
  },

  /**
   * Generate the sprout/hair element
   */
  generateSprout(hairStyle, scienceEyeColor) {
    switch(hairStyle) {
      case 'leaf':
        return `
          <g class="sprout" style="transform-origin: 50px 15px; animation: sproutSway 2s ease-in-out infinite;">
            <path d="M 50,15 Q 45,5 50,-5 Q 55,5 50,15" fill="#10B981" stroke="#059669" stroke-width="1"/>
            <path d="M 50,0 Q 40,-5 35,5" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round"/>
            <path d="M 50,0 Q 60,-5 65,5" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round"/>
          </g>
        `;
      case 'antenna':
        return `
          <g class="sprout" style="transform-origin: 50px 15px; animation: sproutSway 2s ease-in-out infinite;">
            <line x1="50" y1="15" x2="50" y2="-5" stroke="${scienceEyeColor}" stroke-width="3" stroke-linecap="round"/>
            <circle cx="50" cy="-8" r="5" fill="${scienceEyeColor}">
              <animate attributeName="opacity" values="1;0.5;1" dur="1s" repeatCount="indefinite"/>
            </circle>
          </g>
        `;
      case 'sprout':
        return `
          <g class="sprout" style="transform-origin: 50px 15px; animation: sproutSway 2s ease-in-out infinite;">
            <path d="M 50,15 C 50,10 48,5 50,-2" fill="none" stroke="#10B981" stroke-width="3" stroke-linecap="round"/>
            <ellipse cx="50" cy="-5" rx="6" ry="4" fill="#10B981"/>
          </g>
        `;
      case 'flower':
        return `
          <g class="sprout" style="transform-origin: 50px 15px; animation: sproutSway 2s ease-in-out infinite;">
            <line x1="50" y1="15" x2="50" y2="-5" stroke="#10B981" stroke-width="2"/>
            <circle cx="50" cy="-10" r="4" fill="#FCD34D"/>
            <circle cx="45" cy="-12" r="4" fill="#EC4899"/>
            <circle cx="55" cy="-12" r="4" fill="#EC4899"/>
            <circle cx="47" cy="-6" r="4" fill="#EC4899"/>
            <circle cx="53" cy="-6" r="4" fill="#EC4899"/>
          </g>
        `;
      case 'lightning':
        return `
          <g class="sprout">
            <path d="M 50,15 L 48,5 L 55,5 L 50,-5 L 52,2 L 45,2 Z"
                  fill="${scienceEyeColor}"
                  stroke="white"
                  stroke-width="0.5">
              <animate attributeName="opacity" values="1;0.7;1" dur="0.5s" repeatCount="indefinite"/>
            </path>
          </g>
        `;
      default:
        return this.generateSprout('leaf', scienceEyeColor);
    }
  },

  /**
   * Generate accessories
   */
  generateAccessories(accessories, scienceEyeColor) {
    let svg = '';

    accessories.forEach(acc => {
      switch(acc) {
        case 'wizard_hat':
          svg += `
            <g class="accessory-hat">
              <path d="M 30,20 L 50,-10 L 70,20 Z" fill="#4A148C" stroke="#8B5CF6" stroke-width="1"/>
              <ellipse cx="50" cy="20" rx="22" ry="5" fill="#4A148C" stroke="#8B5CF6" stroke-width="1"/>
              <circle cx="50" cy="-8" r="4" fill="#FCD34D">
                <animate attributeName="opacity" values="1;0.6;1" dur="2s" repeatCount="indefinite"/>
              </circle>
            </g>
          `;
          break;
        case 'goggles':
          svg += `
            <g class="accessory-goggles">
              <ellipse cx="38" cy="50" rx="12" ry="10" fill="none" stroke="#B45309" stroke-width="3"/>
              <ellipse cx="62" cy="50" rx="12" ry="10" fill="none" stroke="#B45309" stroke-width="3"/>
              <rect x="48" y="48" width="4" height="4" rx="1" fill="#B45309"/>
              <ellipse cx="38" cy="50" rx="10" ry="8" fill="rgba(34, 211, 238, 0.3)"/>
              <ellipse cx="62" cy="50" rx="10" ry="8" fill="rgba(34, 211, 238, 0.3)"/>
            </g>
          `;
          break;
        case 'crown':
          svg += `
            <g class="accessory-crown">
              <path d="M 30,22 L 35,10 L 42,18 L 50,5 L 58,18 L 65,10 L 70,22 Z"
                    fill="#FCD34D" stroke="#D97706" stroke-width="1"/>
              <circle cx="50" cy="8" r="3" fill="#EC4899"/>
              <circle cx="38" cy="14" r="2" fill="#3B82F6"/>
              <circle cx="62" cy="14" r="2" fill="#3B82F6"/>
            </g>
          `;
          break;
        case 'halo':
          svg += `
            <g class="accessory-halo">
              <ellipse cx="50" cy="8" rx="25" ry="8" fill="none" stroke="#FCD34D" stroke-width="3" opacity="0.8">
                <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>
              </ellipse>
            </g>
          `;
          break;
      }
    });

    return svg;
  },

  /**
   * Get expression-based modifications
   */
  getExpressionModifiers(expression) {
    switch(expression) {
      case 'happy':
        return {
          eyeTransform: 'scaleY(0.8)',
          mouthPath: 'M 42,68 Q 50,75 58,68'
        };
      case 'thinking':
        return {
          eyeTransform: 'scaleY(1)',
          mouthPath: 'M 45,70 Q 50,68 55,70'
        };
      case 'alert':
        return {
          eyeTransform: 'scaleY(1.1)',
          mouthPath: 'M 46,72 Q 50,70 54,72'
        };
      case 'celebrating':
        return {
          eyeTransform: 'scaleY(0.6)',
          mouthPath: 'M 40,65 Q 50,78 60,65'
        };
      default:
        return this.getExpressionModifiers('happy');
    }
  },

  /**
   * Generate the full avatar SVG
   */
  generate(state = {}) {
    const s = { ...this.defaultState, ...state };
    const { baseShape, magicEyeColor, scienceEyeColor, bodyTone, hairStyle, accessories, expression, glowIntensity } = s;

    const glowOpacity = glowIntensity / 100;
    const glowBlur = 8 + (glowIntensity / 10);
    const gradientId = 'bodyGradient';

    const expr = this.getExpressionModifiers(expression);
    const bodyPath = this.generateBodyPath(baseShape, gradientId);
    const sproutSVG = this.generateSprout(hairStyle, scienceEyeColor);
    const accessorySVG = this.generateAccessories(accessories, scienceEyeColor);

    // Floating companions
    const companionsSVG = `
      <g class="companions">
        <circle cx="0" cy="0" r="5" fill="#FCD34D" opacity="0.9">
          <animateMotion dur="5s" repeatCount="indefinite">
            <mpath href="#companionPath1"/>
          </animateMotion>
        </circle>
        <circle cx="0" cy="0" r="4" fill="${scienceEyeColor}" opacity="0.9">
          <animateMotion dur="5s" repeatCount="indefinite" begin="-2.5s">
            <mpath href="#companionPath2"/>
          </animateMotion>
        </circle>
      </g>
      <defs>
        <path id="companionPath1" d="M 50,55 m -45,0 a 45,45 0 1,1 90,0 a 45,45 0 1,1 -90,0" fill="none"/>
        <path id="companionPath2" d="M 50,55 m 45,0 a 45,45 0 1,0 -90,0 a 45,45 0 1,0 90,0" fill="none"/>
      </defs>
    `;

    return `
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${bodyTone}"/>
            <stop offset="50%" style="stop-color:${bodyTone}"/>
            <stop offset="100%" style="stop-color:${this.adjustColor(bodyTone, -30)}"/>
          </linearGradient>

          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="${glowBlur}" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          <radialGradient id="innerGlow" cx="50%" cy="40%" r="50%">
            <stop offset="0%" style="stop-color:white;stop-opacity:0.3"/>
            <stop offset="100%" style="stop-color:white;stop-opacity:0"/>
          </radialGradient>
        </defs>

        <g filter="url(#glow)" opacity="${0.7 + (glowOpacity * 0.3)}">
          ${bodyPath}

          <ellipse cx="45" cy="45" rx="15" ry="10" fill="url(#innerGlow)"/>

          <g class="eyes" style="transform-origin: center; animation: eyeBlink 5s ease-in-out infinite;">
            <g style="transform: ${expr.eyeTransform}; transform-origin: 38px 50px;">
              <circle cx="38" cy="50" r="8" fill="${magicEyeColor}"/>
              <circle cx="38" cy="50" r="4" fill="#1E1B4B"/>
              <circle cx="36" cy="48" r="2" fill="white" opacity="0.8"/>
            </g>

            <g style="transform: ${expr.eyeTransform}; transform-origin: 62px 50px;">
              <circle cx="62" cy="50" r="8" fill="${scienceEyeColor}"/>
              <circle cx="62" cy="50" r="4" fill="#1E1B4B"/>
              <circle cx="60" cy="48" r="2" fill="white" opacity="0.8"/>
            </g>
          </g>

          <path d="${expr.mouthPath}" fill="none" stroke="#1E1B4B" stroke-width="2" stroke-linecap="round"/>

          ${sproutSVG}
          ${accessorySVG}
        </g>

        ${companionsSVG}

        <style>
          @keyframes sproutSway {
            0%, 100% { transform: rotate(-5deg); }
            50% { transform: rotate(5deg); }
          }
          @keyframes eyeBlink {
            0%, 90%, 100% { transform: scaleY(1); }
            95% { transform: scaleY(0.1); }
          }
        </style>
      </svg>
    `;
  },

  /**
   * Generate a mini/simplified avatar for small icons (32px or less)
   */
  generateMini(state = {}) {
    const s = { ...this.defaultState, ...state };
    const { magicEyeColor, scienceEyeColor, bodyTone } = s;

    // Simple seed shape with just eyes
    return `
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="miniBody" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${bodyTone}"/>
            <stop offset="100%" style="stop-color:${this.adjustColor(bodyTone, -30)}"/>
          </linearGradient>
        </defs>

        <path d="M 50,15
                 C 75,25 80,45 80,55
                 C 80,75 70,90 50,90
                 C 30,90 20,75 20,55
                 C 20,45 25,25 50,15 Z"
              fill="url(#miniBody)"
              stroke="rgba(255,255,255,0.3)"
              stroke-width="2"/>

        <circle cx="38" cy="50" r="10" fill="${magicEyeColor}"/>
        <circle cx="62" cy="50" r="10" fill="${scienceEyeColor}"/>
        <circle cx="38" cy="50" r="5" fill="#1E1B4B"/>
        <circle cx="62" cy="50" r="5" fill="#1E1B4B"/>
      </svg>
    `;
  },

  /**
   * Load avatar from server
   */
  async loadFromServer() {
    try {
      const response = await fetch('/api/avatar/get');
      const data = await response.json();
      return data.state || this.defaultState;
    } catch (e) {
      console.error('Failed to load avatar:', e);
      return this.defaultState;
    }
  },

  /**
   * Save avatar to server
   */
  async saveToServer(state) {
    try {
      const response = await fetch('/api/avatar/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avatar_state: state,
          svg_data: this.generate(state)
        })
      });
      return await response.json();
    } catch (e) {
      console.error('Failed to save avatar:', e);
      return { error: e.message };
    }
  }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TinyPMAvatarGenerator;
}
