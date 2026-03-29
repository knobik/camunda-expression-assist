/**
 * Watches the properties panel for expression input fields and attaches
 * validation behavior via event delegation.
 */

import { validate, findSimilar } from './JuelValidator';

const INPUT_SELECTOR = [
  'input.bio-properties-panel-input[type="text"]',
  'textarea.bio-properties-panel-input',
  '[contenteditable].bio-properties-panel-input'
].join(', ');

export default class FieldInterceptor {

  constructor(getVariables) {
    this._getVariables = getVariables;
    this._validationMarkers = new Map();
    this._tooltipEl = null;
    this._tooltipInput = null;

    this._handlers = {
      focusin: (e) => this._onFocusIn(e),
      focusout: (e) => this._onFocusOut(e),
      mouseover: (e) => this._onMouseOver(e),
      mouseout: (e) => this._onMouseOut(e)
    };
  }

  attach(container) {
    this.detach();
    this._container = container;

    for (const [event, handler] of Object.entries(this._handlers)) {
      container.addEventListener(event, handler, true);
    }

    // Watch for DOM changes to validate newly rendered fields
    this._observer = new MutationObserver(() => {
      clearTimeout(this._scanDebounce);
      this._scanDebounce = setTimeout(() => this._validateAllFields(), 150);
    });

    this._observer.observe(container, { childList: true, subtree: true });

    // Initial scan
    this._validateAllFields();
  }

  detach() {
    if (this._container) {
      for (const [event, handler] of Object.entries(this._handlers)) {
        this._container.removeEventListener(event, handler, true);
      }
    }
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
    clearTimeout(this._scanDebounce);
    this._clearAllValidation();
    this._container = null;
  }

  destroy() {
    this.detach();
    this._removeTooltip();
  }

  // --- Event handlers ---

  _onFocusIn(e) {
    const input = e.target.closest(INPUT_SELECTOR);
    if (!input) return;
    this._clearValidation(input);
  }

  _onFocusOut(e) {
    const input = e.target.closest(INPUT_SELECTOR);
    if (!input) return;

    this._removeTooltip();

    setTimeout(() => {
      this._validateField(input);
    }, 100);
  }

  _onMouseOver(e) {
    const input = e.target.closest(INPUT_SELECTOR);
    if (!input) return;

    const marker = this._validationMarkers.get(input);
    if (marker) {
      this._showTooltip(input, marker.messages);
    }
  }

  _onMouseOut(e) {
    const input = e.target.closest(INPUT_SELECTOR);
    if (!input) return;

    // Only hide if we're leaving a validated input
    if (this._tooltipInput === input) {
      this._removeTooltip();
    }
  }

  // --- Validation ---

  _validateAllFields() {
    if (!this._container) return;

    // Clean up markers for inputs no longer in DOM
    for (const [input] of this._validationMarkers) {
      if (!this._container.contains(input)) {
        this._validationMarkers.delete(input);
        if (this._tooltipInput === input) {
          this._removeTooltip();
        }
      }
    }

    const inputs = this._container.querySelectorAll(INPUT_SELECTOR);
    for (const input of inputs) {
      // Skip the currently focused field
      if (document.activeElement === input) continue;
      this._validateField(input);
    }
  }

  _validateField(input) {
    const value = input.value || input.textContent || '';
    if (!value.includes('${') && !value.includes('#{')) {
      this._clearValidation(input);
      return;
    }

    const variables = this._getVariables();
    const diagnostics = validate(value, variables);

    if (diagnostics.length === 0) {
      this._clearValidation(input);
      return;
    }

    const hasError = diagnostics.some(d => d.type === 'error');
    const cls = hasError ? 'ea-validation-error' : 'ea-validation-warning';

    input.classList.remove('ea-validation-error', 'ea-validation-warning');
    input.classList.add(cls);

    const messages = diagnostics.map(d => {
      let msg = d.message;
      if (d.type === 'warning' && d.variableName) {
        const suggestion = findSimilar(d.variableName, variables);
        if (suggestion) msg += ` — did you mean '${suggestion}'?`;
      }
      return msg;
    });

    this._validationMarkers.set(input, { cls, messages });
  }

  _clearValidation(input) {
    input.classList.remove('ea-validation-error', 'ea-validation-warning');
    this._validationMarkers.delete(input);
    if (this._tooltipInput === input) {
      this._removeTooltip();
    }
  }

  _clearAllValidation() {
    for (const [input] of this._validationMarkers) {
      input.classList.remove('ea-validation-error', 'ea-validation-warning');
    }
    this._validationMarkers.clear();
    this._removeTooltip();
  }

  _showTooltip(input, messages) {
    this._removeTooltip();

    const el = document.createElement('div');
    el.className = 'ea-tooltip';
    el.innerHTML = messages.map(m =>
      `<div class="ea-tooltip-line">${this._escapeHtml(m)}</div>`
    ).join('');

    const rect = input.getBoundingClientRect();
    el.style.left = rect.left + 'px';
    el.style.top = (rect.bottom + 4) + 'px';

    document.body.appendChild(el);
    this._tooltipEl = el;
    this._tooltipInput = input;
  }

  _removeTooltip() {
    if (this._tooltipEl && this._tooltipEl.parentNode) {
      this._tooltipEl.parentNode.removeChild(this._tooltipEl);
    }
    this._tooltipEl = null;
    this._tooltipInput = null;
  }

  _escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
