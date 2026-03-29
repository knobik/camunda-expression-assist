import { registerPlatformBpmnJSPlugin } from 'camunda-modeler-plugin-helpers';

import ExpressionAssistPlugin from './ExpressionAssistPlugin';

const ExpressionAssistModule = {
  __init__: ['expressionAssistPlugin'],
  expressionAssistPlugin: ['type', ExpressionAssistPlugin]
};

registerPlatformBpmnJSPlugin(ExpressionAssistModule);
