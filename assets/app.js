// Main client logic for the Comic Reader.
// This file wires up the UI, handles drag/drop, builds slides, and keeps state in sync.
import { initDomRefs } from "/assets/dom.js";
import { i18n, setButtonLabel, getSourceLabel } from "/assets/i18n.js";

// Grab all DOM nodes once so the rest of the code can reuse them easily.
const {
  gridEl,
  pageInfoEl,
  statusEl,
  emptyEl,
  modalEl,
  modalStage,
  modalCaption,
  modalControls,
  slideProgressWrap,
  slideProgress,
  slideProgressLabel,
  sidebarCaption,
  appTitle,
  langCollapse,
  toggleLangBtn,
  folderInput,
  folderDropZone,
  folderLabel,
  folderPickerBtn,
  pageSelect,
  widthSlider,
  widthValue,
  widthLabelText,
  slideModeSelect,
  modalSlideModeSelect,
  folderPathLabel,
  dropHint,
  dropHelp,
  viewModeLabel,
  bookSwitchLabel,
  bookInfoEl,
  prevBookBtn,
  nextBookBtn,
  prevBookModalBtn,
  nextBookModalBtn,
  bookListEl,
  bookListModalEl,
  bookCollapseEl,
  bookCollapseModalEl,
  toggleBookListBtn,
  toggleBookListModalBtn,
  slideModeLabel,
  slideModeHint,
  paginationLabel,
  slideControlLabel,
  modalSlideModeLabel,
} = initDomRefs();

// --- Language + UI text handling ---

    function applyLanguageText() {
      // Redraw every label based on the active language.
      const langPack = i18n.map[i18n.current] || i18n.map.zh;
      document.documentElement.lang = langPack.code || "zh-Hant";
      document.title = i18n.t("appTitle");
      if (appTitle) appTitle.textContent = i18n.t("appTitle");
      if (toggleLangBtn) toggleLangBtn.textContent = i18n.t("langToggle");
      document.querySelectorAll(".lang-btn").forEach((btn) => {
        const code = btn.dataset.lang;
        btn.textContent = langPack.langNames?.[code] || code;
      });
      if (folderPathLabel) folderPathLabel.textContent = i18n.t("folderPathLabel");
      if (folderPickerBtn) folderPickerBtn.textContent = i18n.t("chooseFolder");
      if (dropHint) dropHint.textContent = i18n.t("dropHint");
      if (dropHelp) dropHelp.textContent = i18n.t("dropHelp");
      if (!books.length && folderLabel) folderLabel.textContent = i18n.t("folderLabelDefault");
      if (bookSourceKey === "server") {
        lastDefaultFolderName = i18n.t("sourceServer");
      }
      books.forEach((book) => {
        if (book.serverNames) {
          book.name = i18n.t("sourceServer");
        }
      });
      if (books.length && books[currentBookIndex] && folderLabel) {
        folderLabel.textContent =
          books[currentBookIndex].name || lastDefaultFolderName || i18n.t("folderLabelDefault");
      }
      if (viewModeLabel) viewModeLabel.textContent = i18n.t("viewModeLabel");
      setButtonLabel(document.getElementById("startSlide"), i18n.t("startSlide"));
      setButtonLabel(document.getElementById("showAll"), i18n.t("showAll"));
      if (bookSwitchLabel) bookSwitchLabel.textContent = i18n.t("comicSwitchLabel");
      setButtonLabel(prevBookBtn, i18n.t("prevBook"));
      setButtonLabel(nextBookBtn, i18n.t("nextBook"));
      setButtonLabel(prevBookModalBtn, i18n.t("prevBook"));
      setButtonLabel(nextBookModalBtn, i18n.t("nextBook"));
      setButtonLabel(toggleBookListBtn, i18n.t("chooseBook"));
      setButtonLabel(toggleBookListModalBtn, i18n.t("chooseBook"));
      if (slideModeLabel) slideModeLabel.textContent = i18n.t("slideModeLabel");
      if (modalSlideModeLabel) modalSlideModeLabel.textContent = i18n.t("slideModeLabel");
      if (slideModeHint) slideModeHint.textContent = i18n.t("slideModeHint");
      if (paginationLabel) paginationLabel.textContent = i18n.t("paginationLabel");
      setButtonLabel(document.getElementById("prevPage"), i18n.t("prevPage"));
      setButtonLabel(document.getElementById("nextPage"), i18n.t("nextPage"));
      if (slideControlLabel) slideControlLabel.textContent = i18n.t("slideControlLabel");
      setButtonLabel(document.getElementById("prevSlide"), i18n.t("nextSlide"));
      setButtonLabel(document.getElementById("nextSlide"), i18n.t("prevSlide"));
      setButtonLabel(document.getElementById("closeModal"), i18n.t("closeModal"));
      setButtonLabel(document.getElementById("prevSlideModal"), i18n.t("nextSlide"));
      setButtonLabel(document.getElementById("nextSlideModal"), i18n.t("prevSlide"));
      setButtonLabel(document.getElementById("closeModalModal"), i18n.t("closeModalShort"));
      if (widthLabelText) widthLabelText.textContent = i18n.t("widthLabel");
      if (emptyEl) emptyEl.textContent = i18n.t("empty");
      if (!images.length) {
        sidebarCaption.textContent = i18n.t("idleCaption");
        modalCaption.textContent = i18n.t("idleCaption");
      }
      setSlideModeOptionLabels();
      renderPage(currentPage);
      updateBookControls();
      updateStatusText();
      updateSlideProgressBar();
      if (slides.length) {
        updateSlide();
      }
    }

    function setSlideModeOptionLabels() {
      // Make sure dropdown options use translated text.
      const autoLabel = i18n.t("slideModeAuto");
      const singleLabel = i18n.t("slideModeSingle");
      const doubleLabel = i18n.t("slideModeDouble");
      const tripleLabel = i18n.t("slideModeTriple");
      [slideModeSelect, modalSlideModeSelect].forEach((select) => {
        if (!select) return;
        const autoOpt = select.querySelector('option[value="auto"]');
        const singleOpt = select.querySelector('option[value="single"]');
        const doubleOpt = select.querySelector('option[value="double"]');
        const tripleOpt = select.querySelector('option[value="triple"]');
        if (autoOpt) autoOpt.textContent = autoLabel;
        if (singleOpt) singleOpt.textContent = singleLabel;
        if (doubleOpt) doubleOpt.textContent = doubleLabel;
        if (tripleOpt) tripleOpt.textContent = tripleLabel;
      });
    }

    function setLanguage(lang) {
      // Switch between zh/en and refresh the UI.
      i18n.current = lang === "en" ? "en" : "zh";
      if (!books.length) {
        lastDefaultFolderName = i18n.t("folderLabelDefault");
      }
      applyLanguageText();
    }
    // --- Core state ---
    const PAGE_SIZE = 20;               // How many thumbnails per page in the grid.
    let images = [];                    // Currently loaded image items for the active book.
    const localObjectUrls = [];         // Blob URLs that must be revoked on cleanup.
    let currentPage = 1;                // Current grid page (1-based).
    let lastSlideIndex = 0;             // Remember last slide index so we can resume.
    let slideMode = "auto";             // auto | single | double | triple.
    let slides = [];                    // Precomputed slide windows: [{ start, count }]
    let slidePointer = 0;               // Index inside `slides` array.
    const imageMeta = [];               // Cached natural width/height for auto pairing.
    const metaPromises = [];            // Promises to avoid loading the same image twice.
    let books = [];                     // [{ name: string, items: { name, src }[] }]
    let currentBookIndex = 0;           // Which book is being viewed.
    let bookSourceKey = "local";        // local | server | drop | windowDrop | picker
    let lastDefaultFolderName = i18n.t("folderLabelDefault");
    let statusKey = "statusPickFolder";
    let statusParams = null;

    function isFileDrag(event) {
      // Quick guard: only respond to drags that actually contain files.
      const dt = event && event.dataTransfer;
      return !!dt && Array.from(dt.types || []).includes("Files");
    }

    // --- UI event wiring ---
    folderPickerBtn.addEventListener("click", () => folderInput.click());
    folderInput.addEventListener("change", () => {
      // Using the native folder picker (webkitdirectory) to collect files.
      if (folderInput.files && folderInput.files.length > 0) {
        handleLocalFiles(folderInput.files, "picker");
      }
      folderInput.value = "";
    });
    folderDropZone.addEventListener("dragover", (e) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      folderDropZone.classList.add("dragover");
    });
    folderDropZone.addEventListener("dragleave", () => folderDropZone.classList.remove("dragover"));
    folderDropZone.addEventListener("drop", (e) => handleDropEvent(e, "drop"));
    pageSelect.addEventListener("change", onSelectPage);
    widthSlider.addEventListener("input", () => setWidth(widthSlider.value));
    slideModeSelect.addEventListener("change", () => applySlideMode(slideModeSelect.value));
    modalSlideModeSelect.addEventListener("change", () => applySlideMode(modalSlideModeSelect.value));
    document.getElementById("prevPage").addEventListener("click", () => changePage(-1));
    document.getElementById("nextPage").addEventListener("click", () => changePage(1));
    document.getElementById("startSlide").addEventListener("click", () => startSlideshow());
    document.getElementById("showAll").addEventListener("click", () => renderPage(currentPage));
    document.getElementById("prevSlide").addEventListener("click", () => moveSlide(1));
    document.getElementById("nextSlide").addEventListener("click", () => moveSlide(-1));
    document.getElementById("closeModal").addEventListener("click", closeModal);
    document.getElementById("prevSlideModal").addEventListener("click", () => moveSlide(1));
    document.getElementById("nextSlideModal").addEventListener("click", () => moveSlide(-1));
    document.getElementById("closeModalModal").addEventListener("click", closeModal);
    // Allow clicking outside the image to close the modal.
    modalEl.addEventListener("click", (e) => {
      if (modalControls && modalControls.contains(e.target)) return;
      if (slideProgressWrap && slideProgressWrap.contains(e.target)) return;
      const clickedImg = e.target.closest("#modalStage img");
      if (!clickedImg) {
        closeModal();
        return;
      }
      if (clickedOutsideRenderedStage(e, modalStage)) {
        closeModal();
      }
    });

    // Keyboard shortcuts for both the modal view and the grid view.
    document.addEventListener("keydown", (e) => {
      const isFormField = e.target instanceof HTMLElement &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName);

      if (modalEl.classList.contains("active")) {
        if (e.key === "ArrowRight") moveSlide(-1);
        if (e.key === "ArrowLeft") moveSlide(1);
        if (e.key === "ArrowUp") {
          moveBook(-1);
          e.preventDefault();
          return;
        }
        if (e.key === "ArrowDown") {
          moveBook(1);
          e.preventDefault();
          return;
        }
        if (e.key === " " || e.key === "Spacebar") {
          moveSlide(1);
          e.preventDefault();
        }
        if (e.key === "0") {
          jumpToSlideIndex(0);
          e.preventDefault();
          return;
        }
        if (e.key === "9") {
          jumpToSlideIndex(images.length - 1);
          e.preventDefault();
          return;
        }
        if (["5", "6", "7", "8"].includes(e.key)) {
          const tenths = Number(e.key) / 10;
          jumpToSlideProgress(tenths);
          e.preventDefault();
          return;
        }
        if (e.key === "n" || e.key === "N") {
          moveBook(1);
          e.preventDefault();
        }
        if (e.key === "b" || e.key === "B") {
          moveBook(-1);
          e.preventDefault();
        }
        if (handleSlideModeHotkey(e)) return;
        if (e.key === "Escape") closeModal();
        if (e.key === "a" || e.key === "A") {
          closeModal();
          renderPage(currentPage);
        }
        return;
      }

      // Grid mode shortcuts (ignore when typing into form fields).
      if (isFormField) return;
      if (handleSlideModeHotkey(e)) return;
      if (e.key === "s" || e.key === "S") {
        startSlideshow();
        e.preventDefault();
        return;
      }
      if (e.key === "a" || e.key === "A") {
        renderPage(currentPage);
        e.preventDefault();
        return;
      }
      if (e.key === "ArrowRight") {
        changePage(1);
        e.preventDefault();
      }
      if (e.key === "ArrowLeft") {
        changePage(-1);
        e.preventDefault();
      }
      if (e.key === "n" || e.key === "N") {
        moveBook(1);
        e.preventDefault();
      }
      if (e.key === "b" || e.key === "B") {
        moveBook(-1);
        e.preventDefault();
      }
    });
    // Book navigation controls (sidebar + modal).
    prevBookBtn.addEventListener("click", () => moveBook(-1));
    nextBookBtn.addEventListener("click", () => moveBook(1));
    prevBookModalBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      moveBook(-1);
    });
    nextBookModalBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      moveBook(1);
    });
    toggleBookListBtn?.addEventListener("click", () => toggleCollapse(bookCollapseEl));
    toggleBookListModalBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleCollapse(bookCollapseModalEl);
    });

    // Slide progress scrubber in the modal.
    slideProgress?.addEventListener("input", () => {
      if (!slideProgress) return;
      const val = Number(slideProgress.value);
      jumpToSlideIndex(val);
    });

    // Language toggles in the sidebar.
    toggleLangBtn?.addEventListener("click", () => toggleCollapse(langCollapse));
    document.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        setLanguage(btn.dataset.lang);
        if (langCollapse) langCollapse.classList.remove("open");
      });
    });

    // Allow dropping folders anywhere on the page, not just the box.
    window.addEventListener("dragover", (e) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      folderDropZone.classList.add("dragover");
    });
    window.addEventListener("dragleave", (e) => {
      if (!isFileDrag(e)) return;
      folderDropZone.classList.remove("dragover");
    });
    window.addEventListener("drop", (e) => handleDropEvent(e, "windowDrop"));

    // Fetch pre-hosted images from /api/images so the app works even without a folder drop.
    async function loadImagesFromServer() {
      try {
        const res = await fetch("/api/images");
        const data = await res.json();
        const names = data.images || [];
        cleanupLocalUrls();
        const serverName = i18n.t("sourceServer");
        books = [{ name: serverName, serverNames: names }];
        currentBookIndex = 0;
        bookSourceKey = "server";
        lastDefaultFolderName = serverName;
        setActiveBook(0, bookSourceKey, lastDefaultFolderName, false);
        if (!names.length) {
          setStatus("statusPickFolder");
          emptyEl.style.display = "block";
        }
      } catch (err) {
        setStatus("loadFail");
        console.error(err);
      }
    }

    // Render a grid page of thumbnails.
    function renderPage(page = 1) {
      currentPage = page;
      const start = (page - 1) * PAGE_SIZE;
      const slice = images.slice(start, start + PAGE_SIZE);

      gridEl.innerHTML = "";
      slice.forEach((name, idx) => {
        const item = typeof name === "string" ? { name, src: `/images/${encodeURIComponent(name)}` } : name;
        const card = document.createElement("div");
        card.className = "card";

        const img = document.createElement("img");
        img.className = "thumb";
        img.src = item.src;
        img.alt = item.name;
        img.loading = "lazy";
        img.addEventListener("click", () => startSlideshow(start + idx));

        const cap = document.createElement("div");
        cap.className = "caption";
        cap.textContent = item.name;

        card.appendChild(img);
        card.appendChild(cap);
        gridEl.appendChild(card);
      });

      const totalPages = Math.max(1, Math.ceil(images.length / PAGE_SIZE));
      pageInfoEl.textContent = i18n.t("pageInfo", { page, total: totalPages });
      document.getElementById("prevPage").disabled = page <= 1;
      document.getElementById("nextPage").disabled = page >= totalPages;
      updatePageSelect(totalPages);
      pageSelect.value = String(page);
    }

    // Move to previous or next page in the grid.
    function changePage(delta) {
      const next = currentPage + delta;
      const totalPages = Math.max(1, Math.ceil(images.length / PAGE_SIZE));
      if (next < 1 || next > totalPages) return;
      renderPage(next);
    }

    // Rebuild the page dropdown whenever total pages change.
    function updatePageSelect(totalPages) {
      if (!pageSelect) return;
      const frag = document.createDocumentFragment();
      for (let i = 1; i <= totalPages; i++) {
        const opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent = i18n.t("pageOption", i);
        frag.appendChild(opt);
      }
      pageSelect.innerHTML = "";
      pageSelect.appendChild(frag);
    }

    // Keep status text unified (supports interpolation).
    function formatStatus(key, params) {
      if (key === "statusCount") {
        const imageTotal = params && typeof params.images === "number" ? params.images : images.length;
        const bookTotal =
          params && typeof params.bookTotal === "number" ? params.bookTotal : books.length || 0;
        const bookIndex =
          params && typeof params.bookIndex === "number" ? params.bookIndex : currentBookIndex + 1;
        const sourceKeyParam = params && params.sourceKey ? params.sourceKey : bookSourceKey;
        const sourceText = getSourceLabel(sourceKeyParam);
        return i18n.t("statusCount", {
          source: sourceText,
          images: imageTotal,
          bookIndex,
          bookTotal,
        });
      }
      return i18n.t(key || "statusPickFolder");
    }

    // Store + render the status message.
    function setStatus(key, params) {
      statusKey = key;
      statusParams = params || null;
      if (!statusEl) return;
      statusEl.textContent = formatStatus(key, params);
    }

    // Rerender status text when language or counts change.
    function updateStatusText() {
      if (!statusEl) return;
      statusEl.textContent = formatStatus(statusKey, statusParams);
    }

    // Jump to a selected page when the dropdown changes.
    function onSelectPage() {
      const totalPages = Math.max(1, Math.ceil(images.length / PAGE_SIZE));
      const target = parseInt(pageSelect.value, 10);
      if (!Number.isFinite(target)) return;
      const page = Math.min(Math.max(target, 1), totalPages);
      renderPage(page);
    }

    // Adjust displayed image width and mirror the slider value back to the UI.
    function setWidth(val) {
      // Snap to the nearest 5% so widths are 100%, 95%, 90%, ...
      const num = Number(val);
      const clamped = Math.min(100, Math.max(50, Number.isFinite(num) ? num : 100));
      const snapped = Math.round(clamped / 5) * 5;
      widthSlider.value = snapped;
      document.documentElement.style.setProperty("--img-width", `${snapped}%`);
      widthValue.textContent = `${snapped}%`;
    }

    // Keyboard shortcuts for slide mode (auto/single/double/triple).
    function handleSlideModeHotkey(event) {
      const key = event.key;
      if (key === "1") {
        applySlideMode("single");
        event.preventDefault();
        return true;
      }
      if (key === "2") {
        applySlideMode("double");
        event.preventDefault();
        return true;
      }
      if (key === "3") {
        applySlideMode("triple");
        event.preventDefault();
        return true;
      }
      if (key === "4") {
        applySlideMode("auto");
        event.preventDefault();
        return true;
      }
      return false;
    }

    // Keep both dropdowns (sidebar + modal) showing the same mode.
    function syncSlideModeSelectors() {
      if (slideModeSelect) slideModeSelect.value = slideMode;
      if (modalSlideModeSelect) modalSlideModeSelect.value = slideMode;
    }

    // Change slide mode, rebuild slide windows, and optionally refresh modal.
    function applySlideMode(mode, targetIndex) {
      slideMode = mode || "auto";
      syncSlideModeSelectors();
      const startIndex = typeof targetIndex === "number" ? targetIndex : (lastSlideIndex || currentPageStartIndex());
      return rebuildSlides(startIndex).then(() => {
        if (modalEl.classList.contains("active")) updateSlide();
      });
    }

    function currentPageStartIndex() {
      return (currentPage - 1) * PAGE_SIZE;
    }

    function pageForIndex(idx) {
      return Math.floor(idx / PAGE_SIZE) + 1;
    }

    // Open the modal and start the slideshow from a target image.
    async function startSlideshow(index) {
      if (!images.length) return;
      const pageStart = currentPageStartIndex();
      let target = typeof index === "number" ? index : pageStart;
      const pageEnd = pageStart + PAGE_SIZE;
      // If we were already on this page, resume from the last slide we saw.
      if (typeof index !== "number" && lastSlideIndex >= pageStart && lastSlideIndex < pageEnd) {
        target = lastSlideIndex;
      }
      await rebuildSlides(target);
      modalEl.classList.add("active");
      updateSlide();
    }

    // Move forwards/backwards through slides, crossing book boundaries when needed.
    async function moveSlide(delta) {
      if (!images.length) return;

      if (!slides.length) {
        await rebuildSlides(lastSlideIndex || currentPageStartIndex());
      }
      if (!slides.length) return;

      let nextPointer = slidePointer + delta;

      if (nextPointer >= slides.length) {
        const hasNext = books.length > 1 && currentBookIndex < books.length - 1;
        if (hasNext) {
          const nextBookIdx = currentBookIndex + 1;
          setActiveBook(
            nextBookIdx,
            bookSourceKey,
            books[nextBookIdx]?.name,
            true,
            0
          );
          return;
        }
        nextPointer = slides.length - 1;
      } else if (nextPointer < 0) {
        const hasPrev = books.length > 1 && currentBookIndex > 0;
        if (hasPrev) {
          const prevBookIdx = currentBookIndex - 1;
          const prevBook = books[prevBookIdx];
          const prevCount =
            (prevBook?.files && prevBook.files.length) ||
            (prevBook?.serverNames && prevBook.serverNames.length) ||
            (prevBook?.items && prevBook.items.length) ||
            0;
          const lastIdx = Math.max(0, prevCount - 1);
          setActiveBook(
            prevBookIdx,
            bookSourceKey,
            books[prevBookIdx]?.name,
            true,
            lastIdx
          );
          return;
        }
        nextPointer = 0;
      }

      slidePointer = nextPointer;
      updateSlide();
    }

    // Jump to a specific slide index (0-based).
    async function jumpToSlideIndex(targetIndex) {
      if (!images.length) return;
      const clamped = Math.min(Math.max(0, targetIndex), Math.max(0, images.length - 1));
      await rebuildSlides(clamped);
      if (!slides.length) return;
      slidePointer = findSlidePointer(clamped);
      updateSlide();
    }

    // Jump using a fraction (0..1) instead of an absolute index.
    function jumpToSlideProgress(fraction) {
      if (!images.length) return;
      const frac = Math.min(Math.max(fraction, 0), 1);
      const target = Math.round((images.length - 1) * frac);
      jumpToSlideIndex(target);
    }

    // Keep the range input + label in sync with the active slide.
    function updateSlideProgressBar() {
      if (!slideProgress) return;
      const total = images.length;
      const activeIndex = Math.min(Math.max(lastSlideIndex || 0, 0), Math.max(0, total - 1));
      slideProgress.max = Math.max(0, total - 1);
      slideProgress.value = activeIndex;
      slideProgress.disabled = total <= 1;
      if (slideProgressLabel) {
        slideProgressLabel.textContent = total ? `${activeIndex + 1} / ${total}` : "0 / 0";
      }
      if (slideProgressWrap) {
        slideProgressWrap.style.display = modalEl.classList.contains("active") ? "flex" : "none";
      }
    }

    // Render the current slide (1, 2, or 3 pages at once) and captions.
    function updateSlide() {
      if (!slides.length) return;
      const slide = slides[slidePointer] || { start: 0, count: 1 };
      const indices = [];
      for (let i = 0; i < slide.count && slide.start + i < images.length; i++) {
        indices.push(slide.start + i);
      }
      lastSlideIndex = slide.start;
      const displayOrder = indices.length > 1 ? [...indices].reverse() : indices;
      renderSlideImages(displayOrder);
      const first = indices[0];
      const last = indices[indices.length - 1];
      const captionText =
        indices.length === 2
          ? i18n.t("slideCaptionRange", {
              start: first + 1,
              end: last + 1,
              total: images.length,
              names: [images[first].name, images[last].name],
            })
          : i18n.t("slideCaptionSingle", {
              index: first + 1,
              total: images.length,
              name: images[first].name,
            });
      const bookLabel = books.length
        ? i18n.t("bookLabel", { current: currentBookIndex + 1, total: books.length })
        : "";
      const fullCaption = `${bookLabel}${captionText}`;
      modalCaption.textContent = fullCaption;
      sidebarCaption.textContent = fullCaption;
      updateSlideProgressBar();
    }

    // Hide the modal and return to the grid page containing the last slide.
    function closeModal() {
      modalEl.classList.remove("active");
      if (slideProgressWrap) slideProgressWrap.style.display = "none";
      if (!images.length) return;
      const page = pageForIndex(lastSlideIndex || 0);
      renderPage(page);
    }

    // Calculate if a click landed outside the drawn portion of an image.
    function clickedOutsideRenderedImage(event, imgEl) {
      if (!imgEl) return false;
      const rect = imgEl.getBoundingClientRect();
      const naturalW = imgEl.naturalWidth;
      const naturalH = imgEl.naturalHeight;
      if (!naturalW || !naturalH || !rect.width || !rect.height) return false;

      const scale = Math.min(rect.width / naturalW, rect.height / naturalH);
      const displayW = naturalW * scale;
      const displayH = naturalH * scale;
      const offsetX = (rect.width - displayW) / 2;
      const offsetY = (rect.height - displayH) / 2;

      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const withinX = x >= offsetX && x <= offsetX + displayW;
      const withinY = y >= offsetY && y <= offsetY + displayH;
      return !(withinX && withinY);
    }

    // If all images on stage were missed by the click, treat it as an outside click.
    function clickedOutsideRenderedStage(event, stageEl) {
      if (!stageEl) return true;
      const imgs = Array.from(stageEl.querySelectorAll("img"));
      if (!imgs.length) return true;
      return imgs.every((img) => clickedOutsideRenderedImage(event, img));
    }

    // Release object URLs to avoid leaking memory when switching folders.
    function cleanupLocalUrls() {
      localObjectUrls.splice(0).forEach((url) => URL.revokeObjectURL(url));
    }

    // Reset slide state when switching books or sources.
    function resetSlides() {
      slides = [];
      slidePointer = 0;
      lastSlideIndex = 0;
      imageMeta.length = 0;
      metaPromises.length = 0;
    }

    // Lazily fetch image natural size so auto pairing can guess portrait vs landscape.
    function ensureMeta(index) {
      if (imageMeta[index]) return Promise.resolve(imageMeta[index]);
      if (metaPromises[index]) return metaPromises[index];

      const src = images[index]?.src;
      if (!src) return Promise.resolve({ width: 0, height: 0 });

      const promise = new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const meta = { width: img.naturalWidth || 0, height: img.naturalHeight || 0 };
          imageMeta[index] = meta;
          resolve(meta);
        };
        img.onerror = () => {
          const meta = { width: 0, height: 0 };
          imageMeta[index] = meta;
          resolve(meta);
        };
        img.src = src;
      });

      metaPromises[index] = promise;
      return promise;
    }

    // Decide if two pages should be paired automatically.
    function shouldAutoPair(meta) {
      if (!meta) return false;
      const { width, height } = meta;
      if (!width || !height) return false;
      const aspect = width / height;
      // Portrait/narrow pages become double spread, landscape stays single.
      return aspect <= 0.8;
    }

    // Build slide windows based on mode (auto/single/double/triple).
    async function rebuildSlides(targetIndex = 0) {
      slides = [];
      slidePointer = 0;
      if (!images.length) return;

      let i = 0;
      while (i < images.length) {
        let count = 1;
        if (slideMode === "double") {
          count = Math.min(2, images.length - i);
        } else if (slideMode === "triple") {
          count = Math.min(3, images.length - i);
        } else if (slideMode === "single") {
          count = 1;
        } else {
          const meta = await ensureMeta(i);
          const autoPair = shouldAutoPair(meta);
          count = autoPair && i + 1 < images.length ? 2 : 1;
        }
        slides.push({ start: i, count });
        i += count;
      }

      slidePointer = findSlidePointer(targetIndex);
    }

    // Find the slide window that contains a specific image index.
    function findSlidePointer(targetIndex) {
      const found = slides.findIndex(
        (slide) => targetIndex >= slide.start && targetIndex < slide.start + slide.count
      );
      return found >= 0 ? found : 0;
    }

    // Draw the current slide images into the modal stage.
    function renderSlideImages(indices) {
      modalStage.innerHTML = "";
      modalStage.classList.toggle("single", indices.length === 1);
      modalStage.classList.toggle("triple", indices.length === 3);
      indices.forEach((idx) => {
        const item = images[idx];
        const img = document.createElement("img");
        img.className = "modal-img";
        img.src = item.src;
        img.alt = item.name;
        modalStage.appendChild(img);
      });
    }

    // Try to infer the folder name so books feel grouped naturally.
    function deriveFolderName(files) {
      if (!files.length) return "";
      const relPath = files[0].webkitRelativePath || files[0].name;
      const parts = relPath.split("/");
      return parts.length > 1 ? parts[0] : relPath;
    }

    function bookNameFromFile(file, fallbackFolder) {
      const relPath = file.webkitRelativePath || file.name;
      const parts = relPath.split("/");
      return parts.length > 1 ? parts[0] : fallbackFolder || relPath || "未命名";
    }

    // Group incoming files by top-level folder (book).
    function buildBooks(fileList, fallbackFolder) {
      const groups = new Map();
      Array.from(fileList).forEach((file) => {
        const book = bookNameFromFile(file, fallbackFolder);
        if (!groups.has(book)) groups.set(book, []);
        groups.get(book).push(file);
      });

      return Array.from(groups.entries())
        .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: "base" }))
        .map(([name, files]) => ({ name, files }));
    }

    // Convert File objects into { name, src } pairs and keep track of blob URLs for cleanup.
    function mapFilesToImages(fileArray) {
      return fileArray.map((file) => {
        const url = URL.createObjectURL(file);
        localObjectUrls.push(url);
        return {
          name: file.webkitRelativePath || file.name,
          src: url,
        };
      }).sort(sortByName);
    }

    // Switch the active book and refresh everything that depends on it.
    function setActiveBook(index, sourceKey, defaultFolderName, resumeSlide, resumeSlideIndex) {
      if (!books.length) return;
      const total = books.length;
      currentBookIndex = ((index % total) + total) % total;
      const book = books[currentBookIndex];
      if (sourceKey) bookSourceKey = sourceKey;
      if (defaultFolderName) lastDefaultFolderName = defaultFolderName;

      cleanupLocalUrls();
      resetSlides();
      images = loadBookItems(book);
      const fallbackName = lastDefaultFolderName || i18n.t("folderLabelDefault");
      const activeName = book.name || fallbackName;
      folderLabel.textContent = activeName;
      emptyEl.style.display = images.length ? "none" : "block";
      if (images.length) {
        setStatus("statusCount", {
          sourceKey: bookSourceKey,
          images: images.length,
          bookIndex: currentBookIndex + 1,
          bookTotal: total,
        });
      } else {
        setStatus("statusPickFolder");
      }
      const initialIndexRaw = typeof resumeSlideIndex === "number" ? resumeSlideIndex : 0;
      const initialIndex = Math.min(Math.max(0, initialIndexRaw), Math.max(0, images.length - 1));
      const initialPage = Math.max(1, Math.floor(initialIndex / PAGE_SIZE) + 1);
      renderPage(initialPage);
      updateBookControls();
      renderBookList();
      updateSlideProgressBar();
      updateStatusText();

      if (resumeSlide && modalEl.classList.contains("active")) {
        startSlideshow(initialIndex);
      }
    }

    // Enable/disable book navigation buttons based on collection size.
    function updateBookControls() {
      const total = books.length || 0;
      const current = total ? currentBookIndex + 1 : 0;
      bookInfoEl.textContent = i18n.t("bookInfo", { current, total });
      const disabled = total <= 1;
      prevBookBtn.disabled = disabled;
      nextBookBtn.disabled = disabled;
      if (prevBookModalBtn) prevBookModalBtn.disabled = disabled;
      if (nextBookModalBtn) nextBookModalBtn.disabled = disabled;
    }

    // Move to next/previous book (wraps around).
    function moveBook(delta) {
      if (!books.length || books.length <= 1) return;
      const targetIndex = currentBookIndex + delta;
      const resumeSlide = modalEl.classList.contains("active");
      setActiveBook(
        targetIndex,
        bookSourceKey,
        books[targetIndex]?.name,
        resumeSlide,
        0
      );
    }

    // Simple collapse toggle used by book lists + language chooser.
    function toggleCollapse(el) {
      if (!el) return;
      el.classList.toggle("open");
      if (el.classList.contains("open")) {
        const panel = el.querySelector(".collapse-panel");
        scrollActiveBookIntoView(panel);
      }
    }

    // Draw book buttons in both the sidebar and modal.
    function renderBookList() {
      const containers = [
        { root: bookListEl, collapse: bookCollapseEl },
        { root: bookListModalEl, collapse: bookCollapseModalEl },
      ];
      containers.forEach(({ root }) => {
        if (!root) return;
        root.innerHTML = "";
        if (!books.length) {
          const empty = document.createElement("div");
          empty.className = "hint";
          empty.textContent = i18n.t("bookListEmpty");
          root.appendChild(empty);
          return;
        }
        const frag = document.createDocumentFragment();
        books.forEach((book, idx) => {
          const btn = document.createElement("button");
          btn.className = "book-btn";
          btn.textContent = `${idx + 1}. ${book.name}`;
          if (idx === currentBookIndex) {
            btn.classList.add("active");
          }
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const resumeSlide = modalEl.classList.contains("active");
            setActiveBook(idx, bookSourceKey, book.name, resumeSlide, resumeSlide ? 0 : undefined);
          });
          frag.appendChild(btn);
        });
        root.appendChild(frag);
        scrollActiveBookIntoView(root);
      });
    }

    // Basic file filter for images.
    function isImageFile(name) {
      return /\.(png|jpe?g|webp)$/i.test(name);
    }

    function sortByName(a, b) {
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
    }

    // Load the right data for a book depending on its source.
    function loadBookItems(book) {
      if (!book) return [];
      if (book.files && book.files.length) {
        return mapFilesToImages(book.files);
      }
      if (book.serverNames && book.serverNames.length) {
        return book.serverNames.map((name) => ({
          name,
          src: `/images/${encodeURIComponent(name)}`,
        }));
      }
      if (book.items) return book.items;
      return [];
    }

    // Ensure the active book button stays visible inside the scrollable list.
    function scrollActiveBookIntoView(root) {
      if (!root) return;
      const activeBtn = root.querySelector(".book-btn.active");
      if (activeBtn && typeof activeBtn.scrollIntoView === "function") {
        activeBtn.scrollIntoView({ block: "nearest" });
      }
    }

    // Handle files from the picker or drag/drop and split them into books.
    function handleLocalFiles(fileList, sourceKey) {
      const resumeSlide = modalEl.classList.contains("active");
      const files = Array.from(fileList || []);
      const imageFiles = files.filter((file) => isImageFile(file.name));
      if (!imageFiles.length) {
        setStatus("statusNoImages");
        emptyEl.style.display = "block";
        books = [];
        currentBookIndex = 0;
        updateBookControls();
        renderBookList();
        return;
      }

      cleanupLocalUrls();
      const folderName = deriveFolderName(imageFiles);
      bookSourceKey = sourceKey || "local";
      lastDefaultFolderName = folderName || i18n.t("folderLabelDefault");
      const bookGroups = buildBooks(imageFiles, folderName);
      books = bookGroups.map(({ name, files: groupFiles }) => ({
        name,
        files: groupFiles,
      }));
      currentBookIndex = Math.max(
        0,
        books.findIndex((book) => book.name === folderName)
      );
      setActiveBook(
        currentBookIndex,
        bookSourceKey,
        folderName,
        resumeSlide,
        resumeSlide ? 0 : undefined
      );
    }

    // Entry point for drag/drop on the window or drop zone.
    async function handleDropEvent(event, sourceKey = "drop") {
      if (!isFileDrag(event)) return;
      event.preventDefault();
      event.stopPropagation();
      folderDropZone.classList.remove("dragover");
      const files = await extractFilesFromDataTransfer(event.dataTransfer);
      if (!files.length) {
        setStatus("statusNoDrop");
        return;
      }
      handleLocalFiles(files, sourceKey);
    }

    // Recursively walk a DataTransferItem that is a directory and return contained files.
    function entryToFiles(entry) {
      return new Promise((resolve) => {
        if (entry.isFile) {
          entry.file(
            (file) => {
              const fullPath = entry.fullPath || file.name;
              if (!file.webkitRelativePath && fullPath) {
                Object.defineProperty(file, "webkitRelativePath", {
                  value: fullPath.replace(/^\//, ""),
                  configurable: true,
                });
              }
              resolve([file]);
            },
            () => resolve([])
          );
        } else if (entry.isDirectory) {
          const reader = entry.createReader();
          const entries = [];
          const readEntries = () => {
            reader.readEntries(
              (batch) => {
                if (!batch.length) {
                  Promise.all(entries.map((ent) => entryToFiles(ent))).then((all) =>
                    resolve(all.flat())
                  );
                  return;
                }
                entries.push(...batch);
                readEntries();
              },
              () => resolve([])
            );
          };
          readEntries();
        } else {
          resolve([]);
        }
      });
    }

    // Turn a DataTransfer into a flat array of File objects (supports nested folders).
    async function extractFilesFromDataTransfer(dataTransfer) {
      if (!dataTransfer) return [];
      const items = Array.from(dataTransfer.items || []);
      const entryPromises = items
        .map((item) => (typeof item.webkitGetAsEntry === "function" ? item.webkitGetAsEntry() : null))
        .filter(Boolean)
        .map((entry) => entryToFiles(entry));

      if (entryPromises.length) {
        const nested = await Promise.all(entryPromises);
        return nested.flat();
      }

      return Array.from(dataTransfer.files || []);
    }

    // Kick off the app with default settings.
    applyLanguageText();
    setWidth(widthSlider.value);
    loadImagesFromServer();
    syncSlideModeSelectors();
