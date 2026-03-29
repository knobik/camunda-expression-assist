import FieldInterceptor from './FieldInterceptor';

export default class ExpressionAssistPlugin {

  constructor(eventBus) {
    this._eventBus = eventBus;
    this._variables = [];
    this._fieldInterceptor = null;
    this._containerObserver = null;

    eventBus.on('variableScanner.variablesChanged', (e) => {
      this._variables = e.variables || [];
    });

    eventBus.on('canvas.init', () => {
      this._watchForPropertiesContainer();
    });

    eventBus.on('diagram.destroy', () => {
      this._destroy();
    });
  }

  // Container gets destroyed and recreated on XML<->modeler toggle
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
      () => this._variables
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

ExpressionAssistPlugin.$inject = ['eventBus'];
