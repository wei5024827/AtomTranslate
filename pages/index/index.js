const { deepseek } = require('../../config/index');

const API_URL = deepseek.apiUrl;
const API_KEY = deepseek.apiKey;
const INDUSTRY_OPTIONS = [
  '日常通用',
  '信息技术',
  '金融经济',
  '医疗科学',
  '工业制造',
  '法商管理',
  '建筑民生'
];

const INDUSTRY_PROMPT_MAP = {
  日常通用: 'Use general everyday translation conventions. Prefer the most common and natural target-language wording.',
  信息技术: 'Use information technology terminology, including computer science, software, internet, AI, data, communications, and electronics. Translate technical terms with standard industry usage.',
  金融经济: 'Use finance and economics terminology, including banking, securities, funds, futures, insurance, and accounting. Translate terms with standard industry usage.',
  医疗科学: 'Use medical and scientific terminology, including healthcare, pharmaceuticals, biology, and research. Translate terms with standard industry usage.',
  工业制造: 'Use industrial and manufacturing terminology, including machinery, automotive, energy, chemical engineering, logistics, and supply chain. Translate terms with standard industry usage.',
  法商管理: 'Use legal, compliance, marketing, operations, and business management terminology. Translate terms with standard industry usage.',
  建筑民生: 'Use terminology for construction, real estate, education, and public services. Translate terms with standard industry usage.'
};

Page({
  data: {
    inputText: '',
    resultText: '',
    resultError: '',
    loading: false,
    resultPending: false,
    inputCount: 0,
    outputCount: 0,
    industryOptions: INDUSTRY_OPTIONS,
    collapsedIndustryOptions: INDUSTRY_OPTIONS.slice(0, 4),
    expandedIndustryOptions: INDUSTRY_OPTIONS.slice(4),
    industryExpanded: false,
    selectedIndustry: '日常通用'
  },

  onLoad() {
    this.translateDebounceTimer = null;
    this.requestSerial = 0;
  },

  onUnload() {
    this.clearTranslateDebounce();
    this.requestSerial += 1;
  },

  onInputChange(e) {
    this.syncTextState({
      inputText: e.detail.value
    });

    this.scheduleRealtimeTranslate();
  },

  onIndustryChange(e) {
    const { industry } = e.currentTarget.dataset;

    if (!industry || industry === this.data.selectedIndustry) {
      return;
    }

    this.setData({
      selectedIndustry: industry
    });

    if (this.data.inputText.trim()) {
      this.scheduleRealtimeTranslate();
    }
  },

  toggleIndustryExpand() {
    this.setData({
      industryExpanded: !this.data.industryExpanded
    });
  },

  syncTextState(nextState) {
    const inputText = typeof nextState.inputText === 'string' ? nextState.inputText : this.data.inputText;
    const resultText = typeof nextState.resultText === 'string' ? nextState.resultText : this.data.resultText;

    this.setData({
      ...nextState,
      inputCount: inputText.length,
      outputCount: resultText.length
    });
  },

  handleClearInput() {
    this.cancelPendingTranslation();

    if (!this.data.inputText && !this.data.resultText) {
      return;
    }

    this.syncTextState({
      inputText: '',
      resultText: '',
      resultError: ''
    });

    this.setData({
      loading: false,
      resultPending: false
    });
  },

  handleUseResult() {
    const { resultText } = this.data;

    if (!resultText) {
      wx.showToast({
        title: '当前还没有翻译结果',
        icon: 'none'
      });
      return;
    }

    this.syncTextState({
      inputText: resultText,
      resultText: '',
      resultError: ''
    });

    this.scheduleRealtimeTranslate();
  },

  handlePaste() {
    wx.getClipboardData({
      success: ({ data }) => {
        if (!data) {
          wx.showToast({
            title: '剪贴板暂无内容',
            icon: 'none'
          });
          return;
        }

        this.syncTextState({
          inputText: data
        });

        this.scheduleRealtimeTranslate();
      },
      fail: () => {
        wx.showToast({
          title: '无法读取剪贴板',
          icon: 'none'
        });
      }
    });
  },

  handleCopyResult() {
    const { resultText } = this.data;

    if (!resultText) {
      wx.showToast({
        title: '暂无可复制内容',
        icon: 'none'
      });
      return;
    }

    wx.setClipboardData({
      data: resultText
    });
  },

  clearTranslateDebounce() {
    if (this.translateDebounceTimer) {
      clearTimeout(this.translateDebounceTimer);
      this.translateDebounceTimer = null;
    }
  },

  cancelPendingTranslation() {
    this.clearTranslateDebounce();
    this.requestSerial += 1;
  },

  scheduleRealtimeTranslate() {
    const inputText = this.data.inputText.trim();

    this.clearTranslateDebounce();

    if (!inputText) {
      this.cancelPendingTranslation();
      this.syncTextState({
        resultText: '',
        resultError: ''
      });
      this.setData({
        loading: false,
        resultPending: false
      });
      return;
    }

    this.setData({
      resultPending: true,
      resultError: ''
    });

    this.translateDebounceTimer = setTimeout(() => {
      this.translateDebounceTimer = null;
      this.handleTranslate(inputText);
    }, 450);
  },

  async handleTranslate(inputOverride) {
    const inputText = typeof inputOverride === 'string'
      ? inputOverride.trim()
      : this.data.inputText.trim();

    if (!inputText) {
      return;
    }

    if (!API_KEY || API_KEY === 'YOUR_DEEPSEEK_API_KEY') {
      wx.showModal({
        title: '未配置 API Key',
        content: '请先在 config/local.js 中填写 DeepSeek API Key。',
        showCancel: false
      });
      return;
    }

    const requestId = ++this.requestSerial;

    this.setData({
      loading: true,
      resultPending: true,
      resultError: ''
    });

    try {
      const res = await this.requestTranslation(inputText, this.data.selectedIndustry);
      const translatedText =
        res.data &&
        res.data.choices &&
        res.data.choices[0] &&
        res.data.choices[0].message &&
        res.data.choices[0].message.content
          ? res.data.choices[0].message.content.trim()
          : '';

      if (!translatedText) {
        throw new Error('EMPTY_TRANSLATION');
      }

      if (requestId !== this.requestSerial) {
        return;
      }

      this.syncTextState({
        resultText: translatedText
      });
    } catch (error) {
      if (requestId !== this.requestSerial) {
        return;
      }

      console.error('translate failed:', error);

      let message = '翻译失败，请稍后重试';
      if (error && error.errMsg) {
        message = error.errMsg.indexOf('timeout') > -1
          ? '请求超时，请检查网络后重试'
          : '网络异常，请检查网络或合法域名配置';
      }

      this.setData({
        resultError: message
      });
    } finally {
      if (requestId !== this.requestSerial) {
        return;
      }

      this.setData({
        loading: false,
        resultPending: false
      });
    }
  },

  buildSystemPrompt(industry) {
    const industryPrompt = INDUSTRY_PROMPT_MAP[industry] || INDUSTRY_PROMPT_MAP.日常通用;

    return `You are a professional Chinese-English translation engine. Detect the input language automatically. If the input is Chinese, translate it into English. If the input is English, translate it into Chinese. Return only the direct translation result. Do not explain. Do not add context. Do not polish. Do not expand. Do not infer hidden meaning. Do not add emotion, tone, background, or extra words that are not present in the source text. Keep the translation semantically faithful and as concise as possible. If the input is a short phrase or sentence, translate it literally unless literal translation is clearly incorrect. The selected domain is "${industry}". ${industryPrompt}`;
  },

  requestTranslation(content, industry) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: API_URL,
        method: 'POST',
        timeout: 60000,
        header: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`
        },
        data: {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: this.buildSystemPrompt(industry)
            },
            {
              role: 'user',
              content
            }
          ],
          temperature: 0.1
        },
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res);
            return;
          }

          reject({
            statusCode: res.statusCode,
            data: res.data
          });
        },
        fail: reject
      });
    });
  }
});
