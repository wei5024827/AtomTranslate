# AtomTranslate

AI Translator is a minimalist WeChat Mini Program for Chinese-English translation.

## Features

- Chinese and English two-way translation
- Simple mobile-first card UI
- DeepSeek API integration
- Input validation and basic error handling
- Copy translated result with one tap

## Tech Stack

- WeChat Mini Program native development
- DeepSeek Chat Completions API

## Project Structure

```text
pages/
  index/
    index.wxml
    index.wxss
    index.js
    index.json
```

## Local Setup

1. Open the project in WeChat DevTools.
2. Edit `pages/index/index.js`.
3. Replace `YOUR_DEEPSEEK_API_KEY` with your real DeepSeek API key.
4. Make sure `https://api.deepseek.com` is added to the Mini Program `request` domain allowlist.

## Notes

- The current version calls DeepSeek directly from the Mini Program client.
- For production use, move the API call to a cloud function or your own backend to protect the API key.

## Repository

GitHub: [AtomTranslate](https://github.com/wei5024827/AtomTranslate)
