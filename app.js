(function () {
  "use strict";

  const MODES = {
    daily: {
      index: "01 / TIME FLOW",
      title: "今日三时",
      description: "默念今天最在意的问题，从牌阵中依次选出三张牌。它们将回应事情的缘起、当下与走向。",
      placeholder: "例如：今天的工作推进会顺利吗？",
      ritualTitle: "静心，然后开始洗牌",
      ritualCopy: "深呼吸一次，在心里重复你的问题。准备好后，让牌面展开。",
      positions: ["缘起", "当下", "走向"],
      drawLabels: ["第一张牌", "第二张牌", "第三张牌"],
      count: 3,
      verdictLabel: "今日批语"
    },
    decision: {
      index: "02 / SMALL DECISION",
      title: "一念决事",
      description: "当一件小事让你犹豫，就在心中问清楚“要不要做”。抽一张牌，看见此刻更适合的行动姿态。",
      placeholder: "例如：我要不要主动发出这条消息？",
      ritualTitle: "定住一念，再开始洗牌",
      ritualCopy: "把问题收束成一件具体的小事。只问当下，不替未来做永久决定。",
      positions: ["回应"],
      drawLabels: ["这一张牌"],
      count: 1,
      verdictLabel: "四字批语"
    }
  };

  const state = {
    mode: "daily",
    shuffled: [],
    selected: [],
    result: null,
    isDrawing: false,
    deckReady: false
  };

  const dom = {
    modeButtons: document.querySelectorAll(".mode-button"),
    modeIndex: document.getElementById("mode-index"),
    modeTitle: document.getElementById("mode-title"),
    modeDescription: document.getElementById("mode-description"),
    question: document.getElementById("question-input"),
    questionCount: document.getElementById("question-count"),
    ritualTitle: document.getElementById("ritual-title"),
    ritualCopy: document.getElementById("ritual-copy"),
    ritualBlock: document.getElementById("ritual-block"),
    shuffle: document.getElementById("shuffle-button"),
    drawStage: document.getElementById("draw-stage"),
    deck: document.getElementById("deck"),
    drawCount: document.getElementById("draw-count"),
    drawInstruction: document.getElementById("draw-instruction"),
    result: document.getElementById("result-section"),
    resultCards: document.getElementById("result-cards"),
    questionEcho: document.getElementById("question-echo"),
    verdictLabel: document.getElementById("verdict-label"),
    verdictTitle: document.getElementById("verdict-title"),
    verdictCopy: document.getElementById("verdict-copy"),
    share: document.getElementById("share-button"),
    restart: document.getElementById("restart-button"),
    shareModal: document.getElementById("share-modal"),
    canvas: document.getElementById("share-canvas"),
    preview: document.getElementById("share-preview"),
    download: document.getElementById("download-button"),
    aboutButton: document.getElementById("about-button"),
    aboutModal: document.getElementById("about-modal"),
    toast: document.getElementById("toast")
  };

  function setMode(mode) {
    if (!MODES[mode] || mode === state.mode && !state.selected.length && dom.drawStage.hidden) return;
    state.mode = mode;
    const config = MODES[mode];

    dom.modeButtons.forEach((button) => {
      const active = button.dataset.mode === mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    });
    dom.modeIndex.textContent = config.index;
    dom.modeTitle.textContent = config.title;
    dom.modeDescription.textContent = config.description;
    dom.question.placeholder = config.placeholder;
    dom.ritualTitle.textContent = config.ritualTitle;
    dom.ritualCopy.textContent = config.ritualCopy;
    resetReading(false);
  }

  function randomInt(max) {
    if (window.crypto && window.crypto.getRandomValues) {
      const range = 0x100000000;
      const limit = range - (range % max);
      const value = new Uint32Array(1);
      do window.crypto.getRandomValues(value); while (value[0] >= limit);
      return value[0] % max;
    }
    return Math.floor(Math.random() * max);
  }

  function shuffleArray(items) {
    const copy = items.slice();
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = randomInt(index + 1);
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  }

  function startShuffle() {
    const buttonText = dom.shuffle.querySelector("span");
    dom.shuffle.disabled = true;
    buttonText.textContent = "正在洗牌…";
    state.shuffled = shuffleArray(window.TAROT_CARDS).map((card) => ({
      card,
      reversed: randomInt(100) < 34
    }));
    state.selected = [];
    state.result = null;
    dom.result.hidden = true;

    window.setTimeout(() => {
      dom.ritualBlock.hidden = true;
      dom.drawStage.hidden = false;
      renderDeck();
      updateDrawStatus();
      dom.shuffle.disabled = false;
      buttonText.textContent = "开始洗牌";
      dom.drawStage.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 520);
  }

  function renderDeck() {
    dom.deck.innerHTML = "";
    const visibleCards = state.shuffled.slice(0, 13);
    state.deckReady = false;

    const shuffleStack = document.createElement("div");
    shuffleStack.className = "shuffle-stack";
    shuffleStack.setAttribute("aria-hidden", "true");
    for (let index = 0; index < 9; index += 1) {
      const card = document.createElement("span");
      card.className = "shuffle-card";
      card.style.zIndex = String(index + 1);
      card.innerHTML = '<img src="assets/card-back.png" alt="">';
      shuffleStack.appendChild(card);
    }

    const track = document.createElement("div");
    track.className = "deck-track";
    visibleCards.forEach((entry, index) => {
      const button = document.createElement("button");
      button.className = "draw-card";
      button.type = "button";
      button.dataset.index = String(index);
      button.setAttribute("aria-label", `选择第 ${index + 1} 张牌背`);
      button.style.zIndex = String(index + 1);
      button.innerHTML = '<img src="assets/card-back.png" alt="">';
      button.addEventListener("click", () => selectCard(index, button));
      track.appendChild(button);
    });
    const previousButton = createDeckNavButton("previous", "向左浏览牌组", "M15 18l-6-6 6-6");
    const nextButton = createDeckNavButton("next", "向右浏览牌组", "m9 18 6-6-6-6");
    dom.deck.append(shuffleStack, track, previousButton, nextButton);
    enableDeckNavigation(track, previousButton, nextButton);
    playDeckEntrance(shuffleStack, track);
  }

  function createDeckNavButton(direction, label, path) {
    const button = document.createElement("button");
    button.className = `deck-nav deck-nav-${direction}`;
    button.type = "button";
    button.setAttribute("aria-label", label);
    button.title = label;
    button.innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="${path}"></path></svg>`;
    return button;
  }

  function enableDeckNavigation(track, previousButton, nextButton) {
    let pointerDown = false;
    let startX = 0;
    let startScrollLeft = 0;
    let moved = false;
    let suppressClick = false;
    let pressedCard = null;

    function updateButtons() {
      previousButton.disabled = track.scrollLeft <= 2;
      nextButton.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
    }

    function finishDrag(event) {
      if (!pointerDown) return;
      pointerDown = false;
      const shouldSelect = event.type === "pointerup" && !moved && pressedCard;
      suppressClick = Boolean(pressedCard);
      track.classList.remove("is-dragging");
      if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
      if (shouldSelect) selectCard(Number(pressedCard.dataset.index), pressedCard);
      pressedCard = null;
      window.setTimeout(() => { suppressClick = false; }, 0);
    }

    track.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      pointerDown = true;
      moved = false;
      pressedCard = event.target.closest(".draw-card");
      startX = event.clientX;
      startScrollLeft = track.scrollLeft;
      track.setPointerCapture(event.pointerId);
      track.classList.add("is-dragging");
    });
    track.addEventListener("pointermove", (event) => {
      if (!pointerDown) return;
      const distance = event.clientX - startX;
      if (Math.abs(distance) > 9) moved = true;
      track.scrollLeft = startScrollLeft - distance;
    });
    track.addEventListener("pointerup", finishDrag);
    track.addEventListener("pointercancel", finishDrag);
    track.addEventListener("click", (event) => {
      if (!suppressClick) return;
      event.preventDefault();
      event.stopPropagation();
    }, true);
    track.addEventListener("wheel", (event) => {
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (!delta) return;
      event.preventDefault();
      track.scrollLeft += delta;
    }, { passive: false });
    track.addEventListener("scroll", updateButtons, { passive: true });

    previousButton.addEventListener("click", () => {
      track.scrollLeft = Math.max(0, track.scrollLeft - track.clientWidth * .74);
    });
    nextButton.addEventListener("click", () => {
      track.scrollLeft = Math.min(track.scrollWidth - track.clientWidth, track.scrollLeft + track.clientWidth * .74);
    });
    updateButtons();
  }

  // The two-phase, staggered shuffle timing is adapted from deck-of-cards (MIT).
  function playDeckEntrance(shuffleStack, track) {
    const stackCards = Array.from(shuffleStack.querySelectorAll(".shuffle-card"));
    const animations = stackCards.map((card, index) => {
      const direction = index % 2 === 0 ? -1 : 1;
      const distance = 30 + index * 2;
      return card.animate([
        { transform: `translate(-50%, -50%) translate(0, ${-index * 1.2}px) rotate(0deg)` },
        { transform: `translate(-50%, -50%) translate(${direction * distance}px, ${-index * 1.8}px) rotate(${direction * 4}deg)`, offset: .48 },
        { transform: `translate(-50%, -50%) translate(0, ${-index * 1.2}px) rotate(0deg)` }
      ], {
        duration: 460,
        delay: index * 24,
        easing: "cubic-bezier(.22,.72,.22,1)",
        fill: "forwards"
      }).finished;
    });

    Promise.all(animations).then(() => {
      dom.deck.classList.add("is-ready");
      Array.from(track.querySelectorAll(".draw-card")).forEach((card, index) => {
        card.animate([
          { opacity: 0, transform: "translateX(28px) scale(.96)" },
          { opacity: 1, transform: "translateX(0) scale(1)" }
        ], {
          duration: 340,
          delay: index * 28,
          easing: "cubic-bezier(.22,.72,.22,1)",
          fill: "both"
        });
      });
      state.deckReady = true;
      updateDrawStatus();
    });
  }

  function selectCard(index, button) {
    const config = MODES[state.mode];
    if (!state.deckReady || button.classList.contains("is-picked") || state.selected.length >= config.count) return;
    state.selected.push(state.shuffled[index]);
    button.classList.add("is-picked");
    updateDrawStatus();

    if (state.selected.length === config.count) {
      dom.drawInstruction.textContent = "牌已选定，正在为你翻开…";
      window.setTimeout(showResult, 620);
    }
  }

  function updateDrawStatus() {
    const config = MODES[state.mode];
    const selectedCount = state.selected.length;
    dom.drawCount.textContent = `已选 ${selectedCount} / ${config.count}`;
    dom.drawInstruction.textContent = !state.deckReady
      ? "正在洗牌，请凝神片刻"
      : selectedCount < config.count
      ? `左右滑动，凭直觉选出${config.drawLabels[selectedCount]}`
      : "牌已选定";
  }

  function makeResult() {
    const config = MODES[state.mode];
    const cards = state.selected.map((entry, index) => ({
      ...entry,
      position: config.positions[index]
    }));
    const reversedCount = cards.filter((entry) => entry.reversed).length;
    let verdict;

    if (state.mode === "daily") {
      const bucket = reversedCount === 0 ? "bright" : reversedCount === 3 ? "shadow" : "mixed";
      const options = window.DAILY_VERDICTS[bucket];
      verdict = options[randomInt(options.length)];
    } else {
      const entry = cards[0];
      let bucket = "wait";
      if (typeof entry.card.id === "number") {
        if (!entry.reversed && ![2, 9, 12, 18].includes(entry.card.id)) bucket = "do";
        if (entry.reversed && [4, 10, 15, 16, 18].includes(entry.card.id)) bucket = "no";
      } else if (!entry.reversed) {
        bucket = entry.card.leaning;
      } else {
        bucket = entry.card.leaning === "do" ? "wait" : "no";
      }
      const options = window.DECISION_VERDICTS[bucket];
      verdict = options[randomInt(options.length)];
    }

    return {
      mode: state.mode,
      question: dom.question.value.trim() || (state.mode === "daily" ? "今天最值得我留意的是什么？" : "这件小事，我现在要不要做？"),
      cards,
      verdict: { title: verdict[0], copy: verdict[1] },
      date: new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" }).format(new Date())
    };
  }

  function showResult() {
    state.result = makeResult();
    dom.drawStage.hidden = true;
    dom.result.hidden = false;
    dom.questionEcho.textContent = state.result.question;
    dom.verdictLabel.textContent = MODES[state.mode].verdictLabel;
    dom.verdictTitle.textContent = state.result.verdict.title;
    dom.verdictCopy.textContent = state.result.verdict.copy;
    dom.resultCards.classList.toggle("is-single", state.mode === "decision");
    dom.resultCards.innerHTML = state.result.cards.map(renderResultCard).join("");
    dom.result.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderResultCard(entry) {
    const meaning = entry.reversed ? entry.card.reversed : entry.card.upright;
    return `
      <article class="reading-card">
        <div class="reading-card-visual${entry.reversed ? " is-reversed" : ""}" style="--card-color:${entry.card.color}">
          <img class="tarot-face-image" src="${entry.card.image}" alt="${entry.card.name}牌面">
          <span class="card-direction">${entry.reversed ? "逆位" : "正位"}</span>
        </div>
        <div class="reading-card-copy">
          <span>${entry.position}</span>
          <h3>${entry.card.name} · ${entry.reversed ? "逆位" : "正位"}</h3>
          <p>${meaning}</p>
          <p class="keywords">${entry.card.keywords}</p>
        </div>
      </article>`;
  }

  function resetReading(scroll = true) {
    state.shuffled = [];
    state.selected = [];
    state.result = null;
    state.deckReady = false;
    dom.ritualBlock.hidden = false;
    dom.drawStage.hidden = true;
    dom.result.hidden = true;
    dom.deck.innerHTML = "";
    if (scroll) document.getElementById("reading-panel").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function openShareModal() {
    if (!state.result || state.isDrawing) return;
    state.isDrawing = true;
    dom.share.disabled = true;
    dom.share.querySelector("span").textContent = "正在生成…";

    try {
      await drawShareCard();
      dom.preview.src = dom.canvas.toDataURL("image/png");
      dom.shareModal.hidden = false;
      document.body.style.overflow = "hidden";
      dom.shareModal.querySelector(".modal-close").focus();
    } catch (error) {
      showToast("牌图加载失败，请稍后重试");
    } finally {
      dom.share.disabled = false;
      dom.share.querySelector("span").textContent = "生成分享图";
      state.isDrawing = false;
    }
  }

  function closeShareModal() {
    dom.shareModal.hidden = true;
    document.body.style.overflow = "";
  }

  async function drawShareCard() {
    const canvas = dom.canvas;
    const ctx = canvas.getContext("2d");
    const { cards, verdict, question, date } = state.result;
    const w = canvas.width;
    const h = canvas.height;
    const isDaily = state.result.mode === "daily";
    const cardImages = await Promise.all(cards.map((entry) => loadImage(entry.card.image)));

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#1c2923";
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(224,201,134,.2)";
    ctx.lineWidth = 2;
    for (let radius = 120; radius < 820; radius += 92) {
      ctx.beginPath();
      ctx.arc(920, 90, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    drawCorner(ctx, 45, 45, 990, 1350);

    ctx.fillStyle = "#6b3038";
    ctx.beginPath();
    ctx.arc(102, 102, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f2eee3";
    ctx.textAlign = "center";
    setCanvasFont(ctx, 700, 33, "serif");
    ctx.fillText("微", 102, 114);
    ctx.textAlign = "left";
    setCanvasFont(ctx, 700, 31, "serif");
    ctx.fillText("知微 · TAROT NOTES", 164, 112);

    ctx.fillStyle = "#e0c986";
    setCanvasFont(ctx, 700, 21, "sans");
    ctx.fillText(isDaily ? "今日三时 / TIME FLOW" : "一念决事 / SMALL DECISION", 70, 220);
    ctx.fillStyle = "#f2eee3";
    setCanvasFont(ctx, 700, isDaily ? 54 : 64, "serif");
    ctx.fillText(verdict.title, 66, 306);
    ctx.fillStyle = "rgba(242,238,227,.68)";
    setCanvasFont(ctx, 400, 23, "sans");
    drawWrappedText(ctx, `“${question}”`, 70, 365, 925, 38, 2);

    const gap = isDaily ? 32 : 0;
    const cardWidth = isDaily ? 290 : 350;
    const cardHeight = isDaily ? 500 : 614;
    const totalWidth = isDaily ? (cardWidth * 3 + gap * 2) : cardWidth;
    const startX = (w - totalWidth) / 2;
    const cardY = isDaily ? 460 : 420;

    cards.forEach((entry, index) => {
      const x = startX + index * (cardWidth + gap);
      drawCanvasTarotCard(ctx, entry, cardImages[index], x, cardY, cardWidth, cardHeight);
    });

    const verdictY = isDaily ? 1038 : 1090;
    ctx.fillStyle = "#f2eee3";
    setCanvasFont(ctx, 700, 25, "serif");
    ctx.fillText("这一刻的提醒", 70, verdictY);
    ctx.fillStyle = "rgba(242,238,227,.76)";
    setCanvasFont(ctx, 400, 26, "sans");
    drawWrappedText(ctx, verdict.copy, 70, verdictY + 55, 930, 45, 4);

    ctx.fillStyle = "rgba(242,238,227,.48)";
    setCanvasFont(ctx, 400, 19, "sans");
    ctx.fillText(`${date} · 本地随机抽取 · 仅供自我觉察与娱乐参考`, 70, 1350);
    ctx.textAlign = "right";
    ctx.fillText("知微", 1010, 1350);
    ctx.textAlign = "left";
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
  }

  function drawCanvasTarotCard(ctx, entry, image, x, y, width, height) {
    ctx.save();
    ctx.fillStyle = "#120f13";
    ctx.fillRect(x, y, width, height);
    if (entry.reversed) {
      ctx.translate(x + width / 2, y + height / 2);
      ctx.rotate(Math.PI);
      ctx.drawImage(image, -width / 2, -height / 2, width, height);
      ctx.restore();
      ctx.save();
    } else {
      ctx.drawImage(image, x, y, width, height);
    }
    ctx.strokeStyle = "#e0c986";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, width, height);

    const labelHeight = width > 300 ? 62 : 56;
    ctx.fillStyle = "rgba(18,15,19,.88)";
    ctx.fillRect(x, y + height - labelHeight, width, labelHeight);
    ctx.fillStyle = "#f5e9c6";
    ctx.textAlign = "center";
    setCanvasFont(ctx, 700, width > 300 ? 25 : 21, "serif");
    ctx.fillText(entry.card.name, x + width / 2, y + height - 29);
    ctx.textAlign = "right";
    setCanvasFont(ctx, 600, 14, "sans");
    ctx.fillStyle = "#e0c986";
    ctx.fillText(`${entry.position} · ${entry.reversed ? "逆位" : "正位"}`, x + width - 12, y + height - 9);
    ctx.restore();
  }

  function drawCorner(ctx, x, y, width, height) {
    const size = 55;
    ctx.strokeStyle = "#c7a762";
    ctx.lineWidth = 2;
    [[x,y,1,1],[x+width,y,-1,1],[x,y+height,1,-1],[x+width,y+height,-1,-1]].forEach(([cx,cy,sx,sy]) => {
      ctx.beginPath();
      ctx.moveTo(cx + sx * size, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + sy * size);
      ctx.stroke();
    });
  }

  function setCanvasFont(ctx, weight, size, family) {
    const stack = family === "serif"
      ? '"Songti SC", "STSong", "SimSun", serif'
      : '"PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.font = `${weight} ${size}px ${stack}`;
  }

  function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
    const chars = Array.from(text);
    let line = "";
    let lineIndex = 0;
    for (let index = 0; index < chars.length; index += 1) {
      const testLine = line + chars[index];
      if (ctx.measureText(testLine).width > maxWidth && line) {
        ctx.fillText(line, x, y + lineIndex * lineHeight);
        line = chars[index];
        lineIndex += 1;
        if (lineIndex >= maxLines) return;
      } else {
        line = testLine;
      }
    }
    if (lineIndex < maxLines) ctx.fillText(line, x, y + lineIndex * lineHeight);
  }

  function downloadShareCard() {
    const filename = `知微-${MODES[state.mode].title}-${state.result.verdict.title}.png`;
    dom.canvas.toBlob((blob) => {
      if (!blob) {
        triggerDownload(dom.preview.src, filename);
        return;
      }
      const objectUrl = URL.createObjectURL(blob);
      triggerDownload(objectUrl, filename);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
    }, "image/png");
  }

  function triggerDownload(href, filename) {
    const link = document.createElement("a");
    link.download = filename;
    link.href = href;
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast("结果图已开始下载");
  }

  function openAbout() {
    dom.aboutModal.hidden = false;
    document.body.style.overflow = "hidden";
    dom.aboutModal.querySelector(".modal-close").focus();
  }

  function closeAbout() {
    dom.aboutModal.hidden = true;
    document.body.style.overflow = "";
  }

  function showToast(message) {
    dom.toast.textContent = message;
    dom.toast.classList.add("is-visible");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => dom.toast.classList.remove("is-visible"), 2200);
  }

  dom.modeButtons.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
  dom.question.addEventListener("input", () => { dom.questionCount.textContent = `${dom.question.value.length} / 60`; });
  dom.shuffle.addEventListener("click", startShuffle);
  dom.restart.addEventListener("click", () => resetReading(true));
  dom.share.addEventListener("click", openShareModal);
  dom.download.addEventListener("click", downloadShareCard);
  dom.shareModal.querySelectorAll("[data-close-modal]").forEach((item) => item.addEventListener("click", closeShareModal));
  dom.aboutButton.addEventListener("click", openAbout);
  dom.aboutModal.querySelectorAll("[data-close-about]").forEach((item) => item.addEventListener("click", closeAbout));
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!dom.shareModal.hidden) closeShareModal();
    if (!dom.aboutModal.hidden) closeAbout();
  });
})();
