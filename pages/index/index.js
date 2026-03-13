const { deepseek } = require('../../config/index');

const API_URL = deepseek.apiUrl;
const API_KEY = deepseek.apiKey;

Page({
  data: {
    inputText: '',
    resultText: '',
    loading: false
  },

  onInputChange(e) {
    this.setData({
      inputText: e.detail.value
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

  async handleTranslate() {
    const inputText = this.data.inputText.trim();

    if (!inputText) {
      wx.showToast({
        title: '请输入要翻译的内容',
        icon: 'none'
      });
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

    this.setData({
      loading: true,
      resultText: ''
    });

    try {
      const res = await this.requestTranslation(inputText);
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

      this.setData({
        resultText: translatedText
      });
    } catch (error) {
      console.error('translate failed:', error);

      let message = '翻译失败，请稍后重试';
      if (error && error.errMsg) {
        message = '网络异常，请检查网络或合法域名配置';
      }

      wx.showToast({
        title: message,
        icon: 'none'
      });
    } finally {
      this.setData({
        loading: false
      });
    }
  },

  requestTranslation(content) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: API_URL,
        method: 'POST',
        timeout: 20000,
        header: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`
        },
        data: {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content:
                'You are a professional Chinese-English translation engine. Detect the input language automatically. If the input is Chinese, translate it into English. If the input is English, translate it into Chinese. Return only the direct translation result. Do not explain. Do not add context. Do not polish. Do not expand. Do not infer hidden meaning. Do not add emotion, tone, background, or extra words that are not present in the source text. Keep the translation semantically faithful and as concise as possible. If the input is a short phrase or sentence, translate it literally unless literal translation is clearly incorrect.'
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
