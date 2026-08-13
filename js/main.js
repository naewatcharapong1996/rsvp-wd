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
  // How long the start screen holds after a tap, waiting for the film to reach a
  // moving frame. Past this we uncover anyway rather than sit on a dead gate.
  INTRO_START_TIMEOUT: 8000,
  // No timeupdate for this long once the intro is playing means the decoder is
  // wedged, not that the film is slow — move on rather than hold a dead frame.
  INTRO_STALL_TIMEOUT: 8000,
  // Shown only if the tap takes longer than this to produce a frame, so a quick
  // start doesn't flash a message on its way past.
  WAITING_NOTICE_DELAY: 400,
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

  let settled = false;
  let started = false;
  let stallTimer = null;

  const tapBounce = reduceMotion ? null : gsap.to(tap, {
    y: -12,
    duration: 0.7,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
  });

  function reveal() {
    if (settled) return;
    settled = true;
    clearTimeout(stallTimer);

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

  // Rearmed on every timeupdate, so it only ever fires when playback has
  // genuinely stopped advancing. Inert until the film is actually on screen, so
  // it can't fire while we're still waiting behind the start gate.
  function armStallWatch() {
    if (!started) return;
    clearTimeout(stallTimer);
    stallTimer = setTimeout(reveal, CONFIG.INTRO_STALL_TIMEOUT);
  }

  introVideo.addEventListener("ended", reveal);
  introVideo.addEventListener("timeupdate", armStallWatch);
  // Only once the film is on screen: an error before that is the preloader's to
  // handle, and must not fire the transition while the loader still covers it.
  introVideo.addEventListener("error", () => { if (started) reveal(); });

  // Resolves once frames are genuinely advancing, so the start screen can stay
  // put through a slow first buffer instead of uncovering a frozen first frame.
  function whenMoving() {
    if (!introVideo.paused && introVideo.currentTime > 0) return Promise.resolve("playing");

    return new Promise((resolve) => {
      const settle = (state) => {
        introVideo.removeEventListener("playing", onPlaying);
        introVideo.removeEventListener("timeupdate", onTime);
        introVideo.removeEventListener("error", onError);
        clearTimeout(waitCap);
        resolve(state);
      };
      const onPlaying = () => settle("playing");
      const onTime = () => { if (introVideo.currentTime > 0) settle("playing"); };
      const onError = () => settle("unavailable");
      const waitCap = setTimeout(() => settle("playing"), CONFIG.INTRO_START_TIMEOUT);

      introVideo.addEventListener("playing", onPlaying);
      introVideo.addEventListener("timeupdate", onTime);
      introVideo.addEventListener("error", onError);
    });
  }

  return {
    // MUST be called straight from the tap handler: iOS only honours play() in
    // the synchronous part of a gesture, so we start the film first and wait for
    // it to catch up afterwards rather than buffering first and playing later.
    async start() {
      if (introVideo.error) return "unavailable";

      let playing;
      try {
        playing = introVideo.play();
      } catch (err) {
        return "blocked";
      }

      try {
        await playing;
      } catch (err) {
        return "blocked";
      }

      const state = await whenMoving();
      if (state === "unavailable") return state;

      // Only now: the stall watchdog must not fire while we're legitimately
      // waiting on the first buffer, or it would skip the film all over again.
      started = true;
      armStallWatch();
      return "playing";
    },
    // Straight to the circle transition — the intro film is unplayable here.
    skip: reveal,
  };
}

/* The start gate. Videos prime themselves behind it, and the tap both starts the
   film and stands in for the gesture every mobile browser wants before it will
   play media — so nothing here rests on autoplay being allowed. */
function initStartGate(introCtl) {
  const el = document.getElementById("preloader");
  const hint = document.getElementById("preloaderHint");
  const startBtn = document.getElementById("preloaderStart");

  let launching = false;

  function prime(video, src) {
    const hadSrc = !!video.getAttribute("src");
    if (!hadSrc && src) video.setAttribute("src", src);
    video.preload = "auto";
    // load() rewinds the network state, so only nudge a video that hasn't begun.
    if (!hadSrc || video.readyState === 0) video.load();
  }

  // The intro carries its own src; the chapters take theirs from data-src. Both
  // download while the gate is up, so the tap is usually instant — and the
  // chapters get the film's whole length to finish.
  prime(document.getElementById("introVideo"));
  [0, 1].forEach((i) => {
    const chapter = document.querySelector(`.chapter[data-chapter="${i}"]`);
    prime(chapter.querySelector(".chapter__video"), chapter.dataset.src);
  });

  startBtn.addEventListener("click", async () => {
    if (launching) return;
    launching = true;

    // Kicked off before any await, so play() lands inside the gesture.
    const pending = introCtl.start();

    const notice = setTimeout(() => {
      startBtn.classList.add("is-waiting");
      hint.hidden = false;
    }, CONFIG.WAITING_NOTICE_DELAY);

    const state = await pending;
    clearTimeout(notice);

    if (state === "blocked") {
      // Vanishingly rare from a real tap, but leave the gate usable rather than
      // strand the guest on a screen whose only control did nothing.
      launching = false;
      startBtn.classList.remove("is-waiting");
      hint.textContent = "Tap again · แตะอีกครั้ง";
      hint.hidden = false;
      return;
    }

    gsap.to(el, {
      autoAlpha: 0,
      duration: 0.5,
      onComplete: () => { el.hidden = true; },
    });
    if (state === "unavailable") introCtl.skip();
  });
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
initStartGate(initIntro(boot));
