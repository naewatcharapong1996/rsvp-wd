gsap.registerPlugin(ScrollTrigger);

const CONFIG = {
  // Ceremony start, Asia/Bangkok (+07:00). Set the real hour here — the
  // countdown lands on midnight until it's known.
  WEDDING_AT: "2026-11-28T00:00:00+07:00",
  CHAPTER_OVERLAP: 0.175,
  LAST_CHAPTER_HOLD: 0.75, // extra scroll (in chapter-units) the last chapter lingers on its final frame before fading to ink — roughly +3s of scrolling
  SCRUB_SMOOTHING: 0.3,
  FADE_TO_INK_START: 0.72,
  SCROLL_CUE_SHOW_DELAY: 500,
};

const clamp = gsap.utils.clamp(0, 1);

function initChapters() {
  const chapterEls = Array.from(document.querySelectorAll(".chapter"));
  const fadeToInk = document.getElementById("chaptersFadeToInk");
  const N = chapterEls.length;
  const HALF_OVERLAP = CONFIG.CHAPTER_OVERLAP / 2;

  // Every chapter is 1 normalized unit of scroll, except the last, which gets
  // extra units so it holds on its final frame before fading to ink.
  const weights = chapterEls.map((_, i) => (i === N - 1 ? 1 + CONFIG.LAST_CHAPTER_HOLD : 1));
  const boundaries = [0];
  weights.forEach((w) => boundaries.push(boundaries[boundaries.length - 1] + w));
  const TOTAL_UNITS = boundaries[N];

  const chapters = chapterEls.map((el, i) => ({
    index: i,
    el,
    video: el.querySelector(".chapter__video"),
    poster: el.querySelector(".chapter__poster"),
    src: el.dataset.src,
    duration: 0,
    attached: false,
  }));

  function attach(c) {
    if (!c || c.attached) return;
    c.attached = true;

    if (c.video.readyState >= 1) c.duration = c.video.duration || 0;
    else c.video.addEventListener("loadedmetadata", () => { c.duration = c.video.duration || 0; }, { once: true });

    if (c.video.readyState >= 2) c.poster.classList.add("is-loaded");
    else c.video.addEventListener("loadeddata", () => c.poster.classList.add("is-loaded"), { once: true });

    if (!c.video.src) {
      c.video.preload = "metadata";
      c.video.src = c.src;
      c.video.load();
    }
  }

  function opacityFor(i, p) {
    const start = boundaries[i], end = boundaries[i + 1];
    let o = 1;

    if (i > 0) {
      const inFrom = start - HALF_OVERLAP, inTo = start + HALF_OVERLAP;
      if (p <= inFrom) return 0;
      if (p < inTo) o = Math.min(o, (p - inFrom) / (inTo - inFrom));
    }
    if (i < N - 1) {
      const outFrom = end - HALF_OVERLAP, outTo = end + HALF_OVERLAP;
      if (p >= outTo) return 0;
      if (p > outFrom) o = Math.min(o, 1 - (p - outFrom) / (outTo - outFrom));
    }
    return clamp(o);
  }

  function fadeToInkFor(p) {
    const lastLocal = clamp((p - boundaries[N - 1]) / weights[N - 1]);
    const start = CONFIG.FADE_TO_INK_START;
    return lastLocal <= start ? 0 : clamp((lastLocal - start) / (1 - start));
  }

  function render(progress) {
    const p = progress * TOTAL_UNITS;

    chapters.forEach((c, i) => {
      const localProgress = clamp(p - boundaries[i]);
      if (c.duration > 0) {
        const t = localProgress * c.duration;
        if (Math.abs(c.video.currentTime - t) > 0.01) c.video.currentTime = t;
      }

      const o = opacityFor(i, p);
      c.el.style.opacity = o;
      c.el.classList.toggle("is-active", o > 0.02);
    });

    fadeToInk.style.opacity = fadeToInkFor(p);

    const activeIdx = Math.min(N - 1, Math.max(0, Math.floor(p)));
    attach(chapters[activeIdx]);
    attach(chapters[activeIdx + 1]);
  }

  attach(chapters[0]);
  attach(chapters[1]);
  render(0);

  const trigger = ScrollTrigger.create({
    trigger: "#chapters",
    start: "top top",
    end: `+=${TOTAL_UNITS * 100}%`,
    pin: true,
    anticipatePin: 1,
    fastScrollEnd: true,
    scrub: CONFIG.SCRUB_SMOOTHING,
    onUpdate: (self) => render(self.progress),
  });

  return () => trigger.kill();
}

function initChaptersStatic() {
  const chapterEls = Array.from(document.querySelectorAll(".chapter"));
  const fadeToInk = document.getElementById("chaptersFadeToInk");
  const N = chapterEls.length;
  const HALF_OVERLAP = CONFIG.CHAPTER_OVERLAP / 2;

  const weights = chapterEls.map((_, i) => (i === N - 1 ? 1 + CONFIG.LAST_CHAPTER_HOLD : 1));
  const boundaries = [0];
  weights.forEach((w) => boundaries.push(boundaries[boundaries.length - 1] + w));
  const TOTAL_UNITS = boundaries[N];

  function opacityFor(i, p) {
    const start = boundaries[i], end = boundaries[i + 1];
    let o = 1;
    if (i > 0) {
      const inFrom = start - HALF_OVERLAP, inTo = start + HALF_OVERLAP;
      if (p <= inFrom) return 0;
      if (p < inTo) o = Math.min(o, (p - inFrom) / (inTo - inFrom));
    }
    if (i < N - 1) {
      const outFrom = end - HALF_OVERLAP, outTo = end + HALF_OVERLAP;
      if (p >= outTo) return 0;
      if (p > outFrom) o = Math.min(o, 1 - (p - outFrom) / (outTo - outFrom));
    }
    return clamp(o);
  }

  function fadeToInkFor(p) {
    const lastLocal = clamp((p - boundaries[N - 1]) / weights[N - 1]);
    const start = CONFIG.FADE_TO_INK_START;
    return lastLocal <= start ? 0 : clamp((lastLocal - start) / (1 - start));
  }

  const trigger = ScrollTrigger.create({
    trigger: "#chapters",
    start: "top top",
    end: `+=${TOTAL_UNITS * 100}%`,
    pin: true,
    anticipatePin: 1,
    fastScrollEnd: true,
    scrub: CONFIG.SCRUB_SMOOTHING,
    onUpdate: (self) => {
      const p = self.progress * TOTAL_UNITS;
      chapterEls.forEach((el, i) => { el.style.opacity = opacityFor(i, p); });
      fadeToInk.style.opacity = fadeToInkFor(p);
    },
  });

  return () => trigger.kill();
}

function initScrollCue(animate) {
  const cue = document.getElementById("scrollCue");
  let revealed = false;
  let atFinale = false;

  const sync = () => cue.classList.toggle("is-visible", revealed && !atFinale);

  const showTimer = setTimeout(() => {
    revealed = true;
    sync();
  }, CONFIG.SCROLL_CUE_SHOW_DELAY);

  // The cue stays put for the whole journey instead of dismissing on first
  // scroll — the chapters run long, and "scroll till the end" only works as a
  // promise if it is still there. It steps aside once the finale is in view,
  // where it would collide with the RSVP card and the journey is actually over.
  const finaleTrigger = ScrollTrigger.create({
    trigger: "#finale",
    start: "top 80%",
    onEnter: () => { atFinale = true; sync(); },
    onLeaveBack: () => { atFinale = false; sync(); },
  });

  const tweens = [];
  if (animate) {
    tweens.push(gsap.fromTo(
      ".scroll-cue__dot",
      { y: 0, autoAlpha: 1 },
      { y: -14, autoAlpha: 0, duration: 1, repeat: -1, repeatDelay: 0.3, ease: "power1.in" }
    ));
    tweens.push(gsap.to(".scroll-cue__chevron", {
      y: 5,
      duration: 0.9,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    }));
  }

  return () => {
    clearTimeout(showTimer);
    finaleTrigger.kill();
    tweens.forEach((t) => t.kill());
  };
}

function initFinaleReveal() {
  const targets = [
    document.querySelector(".finale__intro"),
    document.getElementById("countdown"),
    document.getElementById("rsvpButton"),
    document.querySelector(".finale__signoff"),
  ];

  gsap.set(targets, { autoAlpha: 0, y: 28 });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: "#finale",
      start: "top 85%",
      end: "top 40%",
      scrub: true,
    },
  }).to(targets, { autoAlpha: 1, y: 0, stagger: 0.15, ease: "power1.out" });

  return () => tl.scrollTrigger.kill();
}

function boot() {
  ScrollTrigger.normalizeScroll(true);

  const mm = gsap.matchMedia();

  mm.add("(prefers-reduced-motion: no-preference)", () => {
    const cleanupChapters = initChapters();
    const cleanupCue = initScrollCue(true);
    const cleanupReveal = initFinaleReveal();

    return () => {
      cleanupChapters();
      cleanupCue();
      cleanupReveal();
    };
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    const cleanupChapters = initChaptersStatic();
    const cleanupCue = initScrollCue(false);

    return () => {
      cleanupChapters();
      cleanupCue();
    };
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
}

function initIntro(onReady) {
  const intro = document.getElementById("intro");
  const introVideo = document.getElementById("introVideo");
  const ripple = document.getElementById("introRipple");
  const tap = document.getElementById("introTap");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const chapterEls = [
    document.querySelector('.chapter[data-chapter="0"]'),
    document.querySelector('.chapter[data-chapter="1"]'),
  ];
  const videos = chapterEls.map((el) => el.querySelector(".chapter__video"));

  let settled = false;
  let introEnded = false;
  let chaptersDone = 0;

  const tapBounce = reduceMotion ? null : gsap.to(tap, {
    y: -12,
    duration: 0.7,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
  });

  function maybeReveal() {
    if (settled || !introEnded || chaptersDone < videos.length) return;
    reveal();
  }

  function reveal() {
    settled = true;

    if (tapBounce) tapBounce.kill();
    gsap.to(tap, { autoAlpha: 0, duration: 0.35 });

    if (reduceMotion) {
      gsap.to(intro, {
        autoAlpha: 0,
        duration: 0.4,
        onComplete: () => {
          document.documentElement.classList.remove("is-loading");
          intro.style.display = "none";
          onReady();
        },
      });
      return;
    }

    gsap.set(intro, { clipPath: "circle(150% at 50% 50%)" });
    gsap.set(ripple, { scale: 1, opacity: 0.9 });

    gsap.to(ripple, { scale: 26, opacity: 0, duration: 1.1, ease: "power1.out" });
    gsap.to(intro, {
      clipPath: "circle(0% at 50% 50%)",
      duration: 1.1,
      ease: "power2.inOut",
      onComplete: () => {
        document.documentElement.classList.remove("is-loading");
        intro.style.display = "none";
        onReady();
      },
    });
  }

  let chapterPreloadStarted = false;
  function startChapterPreload() {
    if (chapterPreloadStarted) return;
    chapterPreloadStarted = true;
    videos.forEach((video) => {
      video.preload = "auto";
      video.load();
    });
  }

  videos.forEach((video, i) => {
    video.preload = "metadata";
    video.src = chapterEls[i].dataset.src;
    const markDone = () => { chaptersDone++; maybeReveal(); };
    video.addEventListener("canplaythrough", markDone, { once: true });
    video.addEventListener("error", markDone, { once: true });
  });

  // Wait until the intro video is actually decoding before competing with it
  // for bandwidth/decode resources — on lower-memory devices, loading three
  // full videos at once can stall or error out the intro itself.
  introVideo.addEventListener("playing", startChapterPreload, { once: true });
  introVideo.addEventListener("ended", () => { introEnded = true; maybeReveal(); }, { once: true });
  introVideo.addEventListener("error", () => { introEnded = true; startChapterPreload(); maybeReveal(); }, { once: true });
  introVideo.play().catch(() => { introEnded = true; startChapterPreload(); maybeReveal(); });

  setTimeout(() => {
    introEnded = true;
    startChapterPreload();
    chaptersDone = videos.length;
    maybeReveal();
  }, 20000);
}

function initCountdown() {
  const days = document.getElementById("cdDays");
  const cells = [
    { el: document.getElementById("cdHours"), unit: 3600 },
    { el: document.getElementById("cdMinutes"), unit: 60 },
    { el: document.getElementById("cdSeconds"), unit: 1 },
  ];

  const target = new Date(CONFIG.WEDDING_AT).getTime();
  let timer = null;

  function tick() {
    const left = Math.max(0, Math.floor((target - Date.now()) / 1000));

    // Padded to two digits so the days cell matches the zero-padded strip cells
    // beside it; it still grows to three on its own when there's that long to go.
    days.textContent = String(Math.floor(left / 86400)).padStart(2, "0");
    cells.forEach(({ el, unit }) => {
      // 24 hours / 60 minutes / 60 seconds — each cell holds only its own slice.
      const value = Math.floor(left / unit) % (unit === 3600 ? 24 : 60);
      el.style.setProperty("--value", value);
      el.textContent = value;
      el.setAttribute("aria-label", value);
    });

    if (left === 0 && timer) clearInterval(timer);
  }

  tick();
  timer = setInterval(tick, 1000);
}

function initMusicBar() {
  const audio = document.getElementById("bgAudio");
  const bar = document.getElementById("musicBar");
  const playPauseBtn = document.getElementById("playPauseBtn");
  const muteBtn = document.getElementById("muteBtn");

  audio.addEventListener("play", () => {
    bar.classList.add("is-playing");
    playPauseBtn.setAttribute("aria-label", "Pause music");
  });
  audio.addEventListener("pause", () => {
    bar.classList.remove("is-playing");
    playPauseBtn.setAttribute("aria-label", "Play music");
  });

  playPauseBtn.addEventListener("click", () => {
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  });

  muteBtn.addEventListener("click", () => {
    audio.muted = !audio.muted;
    bar.classList.toggle("is-muted", audio.muted);
    muteBtn.setAttribute("aria-label", audio.muted ? "Unmute music" : "Mute music");
  });

  audio.play().catch(() => {
    const unlock = (event) => {
      if (event.target.closest && event.target.closest("#musicBar")) return;
      if (audio.paused) audio.play().catch(() => {});
      ["pointerdown", "keydown", "wheel", "touchstart"].forEach((type) =>
        window.removeEventListener(type, unlock)
      );
    };
    ["pointerdown", "keydown", "wheel", "touchstart"].forEach((type) =>
      window.addEventListener(type, unlock, { once: true, passive: true })
    );
  });
}

document.documentElement.classList.add("is-loading");
initMusicBar();
initCountdown();
initIntro(boot);
