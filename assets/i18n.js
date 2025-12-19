export const i18n = {
  current: "zh",
  map: {
    zh: {
      code: "zh-Hant",
      langToggle: "語言",
      langNames: { zh: "繁體中文", en: "英文" },
      appTitle: "Comic Reader",
      folderPathLabel: "資料夾路徑",
      chooseFolder: "選擇資料夾",
      dropHint: "點擊按鈕或將資料夾拖曳到整個瀏覽器",
      dropHelp: "支援在頁面任意位置拖曳整個資料夾，或點「選擇資料夾」。",
      folderLabelDefault: "尚未選擇資料夾",
      viewModeLabel: "瀏覽模式",
      startSlide: "投影片",
      showAll: "全部瀏覽",
      comicSwitchLabel: "漫畫切換",
      prevBook: "上一本",
      nextBook: "下一本",
      bookInfo: ({ current, total }) => (total ? `第 ${current} / ${total} 本` : "共 0 本"),
      chooseBook: "選擇漫畫",
      slideModeLabel: "投影片張數",
      slideModeAuto: "自動 (依圖片寬度)",
      slideModeSingle: "固定 1 張",
      slideModeDouble: "固定 2 張",
      slideModeTriple: "固定 3 張",
      slideModeHint: "預設自動：橫向頁單張；直向頁併成雙頁。",
      paginationLabel: "分頁控制",
      prevPage: "上一頁",
      nextPage: "下一頁",
      pageInfo: ({ page, total }) => `第 ${page} / ${total} 頁`,
      pageOption: (page) => `第 ${page} 頁`,
      widthLabel: "圖片寬度",
      slideControlLabel: "投影片控制",
      nextSlide: "下一張",
      prevSlide: "上一張",
      closeModal: "關閉投影片",
      closeModalShort: "關閉",
      idleCaption: "尚未開始",
      statusPickFolder: "請先選擇資料夾",
      empty: "找不到圖片。",
      bookListEmpty: "目前沒有漫畫",
      statusNoImages: "資料夾裡沒有可用的圖片 (.png/.jpg/.jpeg/.webp)",
      statusNoDrop: "沒有收到資料夾內容，請再試一次",
      loadFail: "載入圖片失敗。",
      sourceLocal: "本地資料夾",
      sourceServer: "伺服器資料夾",
      sourceDrop: "拖曳資料夾",
      sourceWindowDrop: "拖曳資料夾（全畫面）",
      sourcePicker: "選擇資料夾",
      statusCount: ({ source, images, bookIndex, bookTotal }) =>
        `${source}：共 ${images} 張（${bookIndex}/${bookTotal} 本）`,
      bookLabel: ({ current, total }) => (total ? `第 ${current}/${total} 本 · ` : ""),
      slideCaptionSingle: ({ index, total, name }) => `${index} / ${total} - ${name}`,
      slideCaptionRange: ({ start, end, total, names }) =>
        `${start}-${end} / ${total} - ${names[0]} & ${names[1]}`,
    },
    en: {
      code: "en",
      langToggle: "Language",
      langNames: { zh: "Traditional Chinese", en: "English" },
      appTitle: "Comic Reader",
      folderPathLabel: "Folder path",
      chooseFolder: "Choose folder",
      dropHint: "Click the button or drop a folder onto the browser",
      dropHelp: "Drop a folder anywhere on the page or click \"Choose folder\".",
      folderLabelDefault: "No folder selected",
      viewModeLabel: "View mode",
      startSlide: "Slideshow",
      showAll: "Show all",
      comicSwitchLabel: "Comic navigation",
      prevBook: "Previous book",
      nextBook: "Next book",
      bookInfo: ({ current, total }) => (total ? `Book ${current} / ${total}` : "0 books"),
      chooseBook: "Choose comic",
      slideModeLabel: "Slides per view",
      slideModeAuto: "Auto (by image width)",
      slideModeSingle: "Single page",
      slideModeDouble: "Double page",
      slideModeTriple: "Triple page",
      slideModeHint: "Auto: portrait pages pair up; landscape stays single.",
      paginationLabel: "Pages",
      prevPage: "Previous page",
      nextPage: "Next page",
      pageInfo: ({ page, total }) => `Page ${page} / ${total}`,
      pageOption: (page) => `Page ${page}`,
      widthLabel: "Image width",
      slideControlLabel: "Slideshow controls",
      nextSlide: "Next slide",
      prevSlide: "Previous slide",
      closeModal: "Close slideshow",
      closeModalShort: "Close",
      idleCaption: "Not started",
      statusPickFolder: "Pick a folder to start",
      empty: "No images found.",
      bookListEmpty: "No comics yet",
      statusNoImages: "No supported images in this folder (.png/.jpg/.jpeg/.webp)",
      statusNoDrop: "No folder contents received, try again",
      loadFail: "Failed to load images.",
      sourceLocal: "Local folder",
      sourceServer: "Server folder",
      sourceDrop: "Drag folder",
      sourceWindowDrop: "Drag folder (full page)",
      sourcePicker: "Choose folder",
      statusCount: ({ source, images, bookIndex, bookTotal }) =>
        `${source}: ${images} images (${bookIndex}/${bookTotal} books)`,
      bookLabel: ({ current, total }) => (total ? `Book ${current}/${total} · ` : ""),
      slideCaptionSingle: ({ index, total, name }) => `${index} / ${total} - ${name}`,
      slideCaptionRange: ({ start, end, total, names }) =>
        `${start}-${end} / ${total} - ${names[0]} & ${names[1]}`,
    },
  },
  t(key, params) {
    const langPack = this.map[this.current] || this.map.zh;
    const value = langPack[key];
    if (typeof value === "function") return value(params || {});
    return value !== undefined ? value : key;
  },
};

export function setButtonLabel(button, label) {
  if (!button) return;
  const hotkey = button.querySelector(".hotkey");
  button.textContent = label;
  if (hotkey) button.appendChild(hotkey);
}

export function getSourceLabel(key) {
  const lookup = {
    local: "sourceLocal",
    server: "sourceServer",
    drop: "sourceDrop",
    windowDrop: "sourceWindowDrop",
    picker: "sourcePicker",
  };
  const targetKey = lookup[key] || lookup.local;
  return i18n.t(targetKey);
}
