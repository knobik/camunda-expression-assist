/**
 * bpmn-js module that provides JUEL expression autocompletion and validation.
 * Consumes variable data from the variable-picker's VariableScanner via eventBus.
 */

import FieldInterceptor from './FieldInterceptor';

export default class ExpressionAssistPlugin {

  constructor(eventBus, canvas) {
    this._eventBus = eventBus;
    this._canvas = canvas;
    this._variables = [];
    this._fieldInterceptor = null;
    this._containerObserver = null;

    // Listen for variable updates from variable-picker plugin
    eventBus.on('variableScanner.variablesChanged', (e) => {
      this._variables = e.variables || [];
    });

    // Attach to properties panel when diagram is ready
    eventBus.on('canvas.init', () => {
      this._watchForPropertiesContainer();
    });

    eventBus.on('diagram.destroy', () => {
      this._destroy();
    });
  }

  _getVariables() {
    return this._variables;
  }

  /**
   * Watch for the properties panel container to appear/reappear.
   * The container gets destroyed and recreated on XML<->modeler toggle.
   */
  _watchForPropertiesContainer() {
    if (this._containerObserver) {
      this._containerObserver.disconnect();
    }

    const tryAttach = () => {
      const container = document.querySelector('.properties-container');
      if (container && container !== this._currentContainer) {
        this._currentContainer = container;
        this._attachInterceptor(container);
      }
    };

    // Observe body for container changes
    this._containerObserver = new MutationObserver(() => {
      tryAttach();
    });

    this._containerObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Try immediately
    tryAttach();
  }

  _attachInterceptor(container) {
    if (this._fieldInterceptor) {
      this._fieldInterceptor.destroy();
    }

    this._fieldInterceptor = new FieldInterceptor(
      () => this._getVariables()
    );

    this._fieldInterceptor.attach(container);
  }

  _destroy() {
    if (this._fieldInterceptor) {
      this._fieldInterceptor.destroy();
      this._fieldInterceptor = null;
    }

    if (this._containerObserver) {
      this._containerObserver.disconnect();
      this._containerObserver = null;
    }

    this._currentContainer = null;
    this._variables = [];
  }
}

ExpressionAssistPlugin.$inject = ['eventBus', 'canvas'];
