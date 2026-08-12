// RSVP drawer — a bottom sheet in the shape of shadcn/ui's Drawer (grip handle,
// header, scrollable body, stacked footer, spring slide-up) rewritten in plain
// JS/CSS on the invitation's own palette. Submits to a Google Apps Script web
// app that appends the row to the wedding sheet.
(function () {
  const ENDPOINT =
    "https://script.google.com/macros/s/AKfycbzvh9WIFPhHzsHO7bVjZhK9c_8RJrOL-3GcGjm1cFPuY85c9GTdnAInCL-b-1iosxUJ/exec";

  const CONFIG = {
    REQUEST_TIMEOUT: 12000,
    DRAG_CLOSE_DISTANCE: 96, // px dragged down on the handle before we dismiss
    CLOSE_DURATION: 420,     // keep in sync with --drawer-ease timing in CSS
    GUESTS_MIN: 1,
    GUESTS_MAX: 10,
    LANG_KEY: "rsvp-lang",
  };

  const COPY = {
    en: {
      title: "RSVP",
      subtitle: "We would love to know if you can join us.",
      lang: { group: "Language" },
      name: {
        label: "Full name",
        nickname: "(a nickname is fine)",
        placeholder: "Your name",
      },
      side: { label: "Guest of", groom: "Groom", bride: "Bride" },
      attending: {
        label: "Will you be joining us?",
        yes: "I’ll be there",
        no: "I can’t make it",
      },
      guests: {
        label: "Number of guests",
        hint: "Including yourself — 2 means you plus one guest.",
        less: "Fewer guests",
        more: "More guests",
      },
      bringing: {
        label: "Who’s coming with you",
        optional: "(optional)",
        placeholder: "e.g. Somchai & Ploy",
        hint: "Names of anyone in your party.",
      },
      message: {
        label: "Message to the couple",
        optional: "(optional)",
        placeholder: "Write a few words…",
      },
      submit: "Send RSVP",
      sending: "Sending…",
      cancel: "Cancel",
      errors: {
        name: "Please tell us your name.",
        side: "Please pick whose guest you are.",
        attending: "Please let us know if you can come.",
        network: "We couldn’t send that. Please check your connection and try again.",
      },
      done: {
        title: "Thank you",
        yes: "We can’t wait to celebrate with you on 28.11.2026.",
        no: "We’ll miss you — thank you for letting us know.",
        close: "Close",
      },
    },
    th: {
      title: "ตอบรับคำเชิญ",
      subtitle: "บอกให้เราทราบหน่อยว่าคุณมาร่วมงานได้ไหม",
      lang: { group: "ภาษา" },
      name: {
        label: "ชื่อ-นามสกุล",
        nickname: "(ชื่อเล่นก็ได้)",
        placeholder: "ชื่อของคุณ",
      },
      side: { label: "แขกของฝ่าย", groom: "เจ้าบ่าว", bride: "เจ้าสาว" },
      attending: {
        label: "คุณจะมาร่วมงานไหม",
        yes: "ไปแน่นอน",
        no: "ไม่สะดวกไป",
      },
      guests: {
        label: "จำนวนผู้ร่วมงาน",
        hint: "นับรวมตัวคุณเอง — เลือก 2 หมายถึงคุณและแขกอีก 1 คน",
        less: "ลดจำนวน",
        more: "เพิ่มจำนวน",
      },
      bringing: {
        label: "ใครมาร่วมงานกับคุณ",
        optional: "(ไม่บังคับ)",
        placeholder: "เช่น สมชาย และ พลอย",
        hint: "ชื่อของคนที่มากับคุณ",
      },
      message: {
        label: "คำอวยพรถึงบ่าวสาว",
        optional: "(ไม่บังคับ)",
        placeholder: "เขียนคำอวยพรสักหน่อย…",
      },
      submit: "ส่งคำตอบ",
      sending: "กำลังส่ง…",
      cancel: "ยกเลิก",
      errors: {
        name: "กรุณากรอกชื่อของคุณ",
        side: "กรุณาเลือกว่าคุณเป็นแขกของฝ่ายใด",
        attending: "กรุณาเลือกว่าคุณจะมาร่วมงานหรือไม่",
        network: "ส่งไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง",
      },
      done: {
        title: "ขอบคุณ",
        yes: "เราตื่นเต้นที่จะได้เฉลิมฉลองร่วมกับคุณ ในวันที่ 28.11.2026",
        no: "เราจะคิดถึงคุณ ขอบคุณที่แจ้งให้เราทราบ",
        close: "ปิด",
      },
    },
  };

  const drawer = document.getElementById("rsvpDrawer");
  const overlay = document.getElementById("rsvpOverlay");
  const sheet = document.getElementById("rsvpSheet");
  const grip = document.getElementById("rsvpGrip");
  const header = drawer.querySelector(".drawer__header");
  const form = document.getElementById("rsvpForm");
  const done = document.getElementById("rsvpDone");
  const doneText = document.getElementById("rsvpDoneText");
  const openBtn = document.getElementById("rsvpButton");
  const cancelBtn = document.getElementById("rsvpCancel");
  const closeBtn = document.getElementById("rsvpClose");
  const submitBtn = document.getElementById("rsvpSubmit");
  const status = document.getElementById("rsvpStatus");
  const nameInput = document.getElementById("rsvpName");
  const nameError = document.getElementById("rsvpNameError");
  const sideError = document.getElementById("rsvpSideError");
  const attendingError = document.getElementById("rsvpAttendingError");
  const guestsField = document.getElementById("rsvpGuestsField");
  const guestsInput = document.getElementById("rsvpGuests");
  const bringingField = document.getElementById("rsvpBringingField");
  const bringingInput = document.getElementById("rsvpBringing");
  const messageInput = document.getElementById("rsvpMessage");
  const sideInputs = Array.from(form.querySelectorAll('input[name="side"]'));
  const attendingInputs = Array.from(form.querySelectorAll('input[name="attending"]'));

  if (!drawer || !openBtn) return;

  let lang = "en";
  let sending = false;
  let isOpen = false;
  let closeTimer = null;
  let lastFocused = null;

  /* ---------------------------------------------------------------- language */

  function lookup(key) {
    return key.split(".").reduce((o, k) => (o == null ? o : o[k]), COPY[lang]);
  }

  function setLang(next) {
    lang = COPY[next] ? next : "en";
    drawer.setAttribute("lang", lang);
    drawer.classList.toggle("is-th", lang === "th");

    drawer.querySelectorAll("[data-i18n]").forEach((el) => {
      const value = lookup(el.dataset.i18n);
      if (typeof value !== "string") return;
      // Labels wrap a nested "(optional)" span, so only replace the leading
      // text node rather than blowing away the child elements.
      const nested = el.querySelector("[data-i18n]");
      if (nested) el.firstChild.nodeValue = value + " ";
      else el.textContent = value;
    });

    drawer.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      el.placeholder = lookup(el.dataset.i18nPlaceholder) || "";
    });

    drawer.querySelectorAll("[data-i18n-label]").forEach((el) => {
      el.setAttribute("aria-label", lookup(el.dataset.i18nLabel) || "");
    });

    drawer.querySelectorAll(".drawer__lang-btn").forEach((btn) => {
      const active = btn.dataset.lang === lang;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });

    // Re-render any message already on screen in the new language.
    if (!nameError.hidden) nameError.textContent = lookup("errors.name");
    if (!sideError.hidden) sideError.textContent = lookup("errors.side");
    if (!attendingError.hidden) attendingError.textContent = lookup("errors.attending");
    if (!status.hidden) status.textContent = lookup("errors.network");
    if (!done.hidden) doneText.textContent = lookup("done." + (done.dataset.attending || "yes"));
    if (sending) submitBtn.querySelector(".btn__label").textContent = lookup("sending");

    try { localStorage.setItem(CONFIG.LANG_KEY, lang); } catch (e) { /* private mode */ }
  }

  drawer.querySelectorAll(".drawer__lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => setLang(btn.dataset.lang));
  });

  // Thai is the default for everyone — most guests are Thai, and the browser's
  // locale is a poor proxy for that. A guest who switches to English keeps it.
  let saved = null;
  try { saved = localStorage.getItem(CONFIG.LANG_KEY); } catch (e) { /* private mode */ }
  setLang(COPY[saved] ? saved : "th");

  /* ------------------------------------------------------------ open / close */

  // ScrollTrigger.normalizeScroll() takes over touch scrolling on the document,
  // which fights the sheet's own scroll area and the on-screen keyboard. Park it
  // while the drawer is up.
  function normalizeScroll(enabled) {
    const normalizer = window.ScrollTrigger && ScrollTrigger.normalizeScroll();
    if (!normalizer) return;
    if (enabled) normalizer.enable();
    else normalizer.disable();
  }

  // When the soft keyboard opens, visualViewport shrinks but position:fixed does
  // not — lift the sheet by the difference so the focused field stays visible.
  function syncKeyboardInset() {
    const vv = window.visualViewport;
    if (!vv) return;
    const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    sheet.style.setProperty("--kb-inset", inset + "px");
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    clearTimeout(closeTimer);
    lastFocused = document.activeElement;

    // Reopening after a successful send starts a fresh reply — one phone often
    // RSVPs for several households.
    if (!done.hidden) {
      done.hidden = true;
      header.hidden = false;
      form.hidden = false;
      form.reset();
      guestsField.hidden = true;
      bringingField.hidden = true;
      guestsInput.value = CONFIG.GUESTS_MIN;
      form.querySelector('[data-step="-1"]').disabled = true;
      form.querySelector('[data-step="1"]').disabled = false;
      hideError(nameError, nameInput);
      hideError(sideError);
      hideError(attendingError);
      status.hidden = true;
    }

    drawer.hidden = false;
    void drawer.offsetHeight; // flush layout so the slide-up transition runs
    drawer.classList.add("is-open");
    sheet.focus({ preventScroll: true });

    normalizeScroll(false);
    if (window.visualViewport) {
      syncKeyboardInset();
      window.visualViewport.addEventListener("resize", syncKeyboardInset);
      window.visualViewport.addEventListener("scroll", syncKeyboardInset);
    }
    document.addEventListener("keydown", onKeydown);
  }

  function close() {
    if (!isOpen || sending) return;
    isOpen = false;
    drawer.classList.remove("is-open");

    document.removeEventListener("keydown", onKeydown);
    if (window.visualViewport) {
      window.visualViewport.removeEventListener("resize", syncKeyboardInset);
      window.visualViewport.removeEventListener("scroll", syncKeyboardInset);
    }
    normalizeScroll(true);
    if (lastFocused && lastFocused.focus) lastFocused.focus({ preventScroll: true });

    closeTimer = setTimeout(() => { drawer.hidden = true; }, CONFIG.CLOSE_DURATION);
  }

  function onKeydown(event) {
    if (event.key === "Escape") { close(); return; }
    if (event.key !== "Tab") return;

    const focusables = Array.from(
      sheet.querySelectorAll("button, input:not(.sr-only), textarea, [href]")
    ).filter((el) => !el.disabled && el.offsetParent !== null);
    if (!focusables.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  openBtn.addEventListener("click", () => open());
  overlay.addEventListener("click", close);
  cancelBtn.addEventListener("click", close);
  closeBtn.addEventListener("click", close);

  // The page behind is a pinned, scroll-scrubbed timeline; let no gesture on the
  // overlay leak through to it.
  overlay.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
  overlay.addEventListener("wheel", (e) => e.preventDefault(), { passive: false });

  /* -------------------------------------------------------- drag to dismiss */

  let dragFrom = null;
  let dragBy = 0;

  grip.addEventListener("pointerdown", (event) => {
    if (sending) return;
    dragFrom = event.clientY;
    dragBy = 0;
    sheet.style.transition = "none";
    grip.setPointerCapture(event.pointerId);
  });

  grip.addEventListener("pointermove", (event) => {
    if (dragFrom === null) return;
    dragBy = Math.max(0, event.clientY - dragFrom);
    sheet.style.transform = "translateY(" + dragBy + "px)";
  });

  function endDrag() {
    if (dragFrom === null) return;
    dragFrom = null;
    sheet.style.transition = "";
    sheet.style.transform = "";
    if (dragBy > CONFIG.DRAG_CLOSE_DISTANCE) close();
  }

  grip.addEventListener("pointerup", endDrag);
  grip.addEventListener("pointercancel", endDrag);

  /* -------------------------------------------------------------- form state */

  function guests() {
    return parseInt(guestsInput.value, 10) || CONFIG.GUESTS_MIN;
  }

  form.querySelectorAll("[data-step]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = guests() + parseInt(btn.dataset.step, 10);
      guestsInput.value = Math.min(CONFIG.GUESTS_MAX, Math.max(CONFIG.GUESTS_MIN, next));
      form.querySelector('[data-step="-1"]').disabled = guestsInput.value <= CONFIG.GUESTS_MIN;
      form.querySelector('[data-step="1"]').disabled = guestsInput.value >= CONFIG.GUESTS_MAX;
    });
  });
  form.querySelector('[data-step="-1"]').disabled = true;

  function picked(inputs) {
    const choice = inputs.find((input) => input.checked);
    return choice ? choice.value : null;
  }

  sideInputs.forEach((input) => {
    input.addEventListener("change", () => hideError(sideError));
  });

  attendingInputs.forEach((input) => {
    input.addEventListener("change", () => {
      // Party size and companions only mean anything for someone who's coming.
      const joining = input.value === "Yes";
      guestsField.hidden = !joining;
      bringingField.hidden = !joining;
      hideError(attendingError);
    });
  });

  function showError(el, key, field) {
    el.textContent = lookup(key);
    el.hidden = false;
    if (field) field.setAttribute("aria-invalid", "true");
  }

  function hideError(el, field) {
    el.hidden = true;
    el.textContent = "";
    if (field) field.removeAttribute("aria-invalid");
  }

  nameInput.addEventListener("input", () => hideError(nameError, nameInput));

  function setSending(on) {
    sending = on;
    submitBtn.disabled = on;
    cancelBtn.disabled = on;
    submitBtn.classList.toggle("is-loading", on);
    submitBtn.querySelector(".btn__label").textContent = lookup(on ? "sending" : "submit");
  }

  /* ---------------------------------------------------------------- transport */

  function post(body, extra) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);
    const options = Object.assign(
      { method: "POST", body: body, signal: controller.signal },
      extra
    );
    return fetch(ENDPOINT, options).finally(() => clearTimeout(timer));
  }

  async function send(payload) {
    const body = JSON.stringify(payload);

    // No Content-Type header on purpose: fetch then defaults to text/plain,
    // which keeps this a "simple" request. An application/json header would
    // trigger a CORS preflight, and the Apps Script /exec endpoint answers
    // OPTIONS with a redirect rather than the headers a preflight needs.
    // e.postData.contents still receives this JSON string verbatim.
    try {
      const response = await post(body, { redirect: "follow" });
      if (!response.ok) throw new Error("HTTP " + response.status);
      return;
    } catch (error) {
      if (error.name === "AbortError") throw error;

      // Some browsers refuse to expose the redirected Apps Script response even
      // for a simple request. Re-send opaquely: the row still lands in the
      // sheet, we simply cannot read the reply, so a resolved no-cors request
      // is the strongest confirmation available.
      await post(body, { mode: "no-cors" });
    }
  }

  /* ------------------------------------------------------------------ submit */

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (sending) return;

    const name = nameInput.value.trim();
    const side = picked(sideInputs);
    const answer = picked(attendingInputs);
    let firstBad = null;

    if (!name) {
      showError(nameError, "errors.name", nameInput);
      firstBad = firstBad || nameInput;
    } else hideError(nameError, nameInput);

    if (!side) {
      showError(sideError, "errors.side");
      firstBad = firstBad || sideError;
    } else hideError(sideError);

    if (!answer) {
      showError(attendingError, "errors.attending");
      firstBad = firstBad || attendingError;
    } else hideError(attendingError);

    if (firstBad) {
      firstBad.scrollIntoView({ block: "center", behavior: "smooth" });
      if (firstBad === nameInput) nameInput.focus();
      return;
    }

    status.hidden = true;
    setSending(true);

    try {
      await send({
        name: name,
        side: side,
        attending: answer,
        guests: answer === "Yes" ? guests() : 0,
        bringing: answer === "Yes" ? bringingInput.value.trim() : "",
        message: messageInput.value.trim(),
      });

      // The thank-you panel carries its own title, so the sheet header would
      // only repeat itself underneath it.
      form.hidden = true;
      header.hidden = true;
      done.dataset.attending = answer === "Yes" ? "yes" : "no";
      doneText.textContent = lookup("done." + done.dataset.attending);
      done.hidden = false;
      closeBtn.focus({ preventScroll: true });
    } catch (error) {
      console.error("RSVP submit failed:", error);
      status.textContent = lookup("errors.network");
      status.hidden = false;
    } finally {
      setSending(false);
    }
  });
})();
