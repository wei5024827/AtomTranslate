const DEFAULT_API_URL = 'https://api.deepseek.com/v1/chat/completions';

let localConfig = {};

try {
  localConfig = require('./local');
} catch (error) {
  localConfig = {};
}

const deepseekConfig = localConfig.deepseek || {};

module.exports = {
  deepseek: {
    apiUrl: deepseekConfig.apiUrl || DEFAULT_API_URL,
    apiKey: deepseekConfig.apiKey || 'YOUR_DEEPSEEK_API_KEY'
  }
};
