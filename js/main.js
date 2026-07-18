/* ═══════════════════════════════════════════════════════════
   ITACHI — scrollytelling engine
   Lenis smooth scroll + GSAP ScrollTrigger
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(pointer: fine)").matches;
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const state = { audioOn: false, moonActive: false };
  let hbSync = null; // heartbeat sync, assigned in full mode

  /* ── split text into letters ─────────────────────────── */
  function splitLetters(el) {
    const text = el.textContent;
    el.textContent = "";
    for (const ch of text) {
      const s = document.createElement("span");
      s.className = "lt";
      s.textContent = ch === " " ? " " : ch;
      el.appendChild(s);
    }
  }
  const heroTitle = $(".hero-title");
  if (heroTitle) splitLetters(heroTitle);
  $$(".fq-line").forEach(splitLetters);

  /* ── loader (with real preload %) ────────────────────── */
  const loader = $("#loader");
  const loaderPct = $("#loader-pct");
  const loadedAt = performance.now();
  (function trackPreload() {
    if (!loaderPct) return;
    const srcs = $$("img").map((i) => i.getAttribute("src")).filter((s) => s && s.startsWith("assets/")).slice(0, 6);
    if (!srcs.length) { loaderPct.textContent = "100%"; return; }
    let done = 0;
    const bump = () => { done++; loaderPct.textContent = Math.round((done / srcs.length) * 100) + "%"; };
    srcs.forEach((src) => {
      const im = new Image();
      im.onload = bump; im.onerror = bump;
      im.src = src;
    });
  })();
  function hideLoader() {
    const wait = Math.max(0, 1800 - (performance.now() - loadedAt));
    setTimeout(() => {
      if (loaderPct) loaderPct.textContent = "100%";
      loader.classList.add("done");
      setTimeout(() => (loader.style.display = "none"), 1200);
      heroIntro();
    }, wait);
  }
  if (document.readyState === "complete") hideLoader();
  else window.addEventListener("load", hideLoader);
  setTimeout(hideLoader, 4000); // failsafe

  /* ── chapter nav (both modes) ────────────────────────── */
  const sections = $$(".sec");
  const nav = $("#chapnav");
  sections.forEach((sec) => {
    const a = document.createElement("a");
    a.href = "#" + sec.id;
    a.dataset.label = sec.dataset.chapter || sec.id;
    a.setAttribute("aria-label", a.dataset.label);
    a.addEventListener("click", (e) => {
      e.preventDefault();
      if (window.lenis) window.lenis.scrollTo(sec, { offset: 0, duration: 1.6 });
      else sec.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    });
    nav.appendChild(a);
  });
  const navLinks = $$("a", nav);

  /* ── audio toggle (drives ambient + heartbeat) ───────── */
  const audio = $("#ambient");
  const audioBtn = $("#audio-btn");
  audio.addEventListener("canplaythrough", () => (audioBtn.hidden = false), { once: true });
  audio.addEventListener("error", () => (audioBtn.hidden = true), { once: true });
  audioBtn.addEventListener("click", () => {
    if (audio.paused) {
      state.audioOn = true;
      audio.volume = 0;
      audio.play().then(() => {
        audioBtn.classList.add("playing");
        if (window.gsap) gsap.to(audio, { volume: 0.55, duration: 2 });
        else audio.volume = 0.55;
      }).catch(() => {});
    } else {
      state.audioOn = false;
      audioBtn.classList.remove("playing");
      const stop = () => audio.pause();
      if (window.gsap) gsap.to(audio, { volume: 0, duration: 0.8, onComplete: stop });
      else stop();
    }
    if (hbSync) hbSync();
  });

  /* ── lightbox (both modes) ───────────────────────────── */
  const lb = $("#lightbox");
  const lbImg = $("#lb-img");
  const lbCap = $("#lb-cap");
  let lbOpen = false;
  function openLightbox(img) {
    lbImg.src = img.currentSrc || img.src;
    lbCap.textContent = img.alt || "";
    lb.hidden = false;
    lbOpen = true;
    if (window.lenis) window.lenis.stop();
    if (window.gsap && !reduced) {
      gsap.fromTo(lb, { opacity: 0 }, { opacity: 1, duration: 0.35, overwrite: true });
      gsap.fromTo(lbImg, { scale: 0.92, y: 14 }, { scale: 1, y: 0, duration: 0.5, ease: "power3.out" });
    }
  }
  function closeLightbox() {
    if (!lbOpen) return;
    lbOpen = false;
    const done = () => { lb.hidden = true; lbImg.src = ""; };
    if (window.gsap && !reduced) gsap.to(lb, { opacity: 0, duration: 0.25, onComplete: done, overwrite: true });
    else done();
    if (window.lenis) window.lenis.start();
  }
  document.addEventListener("click", (e) => {
    if (lbOpen) {
      if (!e.target.closest("#lb-img")) closeLightbox();
      return;
    }
    const img = e.target.closest(".ph img");
    if (!img || !img.naturalWidth || img.closest(".ph-cover")) return;
    openLightbox(img);
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLightbox(); });

  /* ── keyboard chapter navigation (both modes) ────────── */
  document.addEventListener("keydown", (e) => {
    if (lbOpen || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const y = window.scrollY + 10;
    let idx = 0;
    sections.forEach((s, i) => { if (s.offsetTop <= y) idx = i; });
    const target = sections[Math.min(sections.length - 1, Math.max(0, idx + (e.key === "ArrowDown" ? 1 : -1)))];
    if (window.lenis) window.lenis.scrollTo(target, { offset: 0, duration: 1.3 });
    else target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  });

  /* ── hero intro (runs when loader lifts) ─────────────── */
  let heroPlayed = false;
  function heroIntro() {
    if (heroPlayed) return;
    heroPlayed = true;
    if (reduced || !window.gsap) return;
    gsap.from(".hero-title .lt", { opacity: 0, y: 90, rotateX: -50, stagger: 0.06, duration: 1.1, ease: "power3.out", delay: 0.15 });
    gsap.from(".hero-kicker, .hero-sub, .hero-quote, .scroll-cue", { opacity: 0, y: 20, duration: 1.2, stagger: 0.15, delay: 0.9 });
    // red sheen sweep once letters settle (needs whole-element text for background-clip)
    gsap.delayedCall(2.1, () => {
      if (!heroTitle) return;
      heroTitle.textContent = "ITACHI";
      heroTitle.classList.add("sheen");
      gsap.fromTo(heroTitle,
        { backgroundPosition: "120% 0" },
        { backgroundPosition: "-40% 0", duration: 2.2, ease: "power1.inOut", repeat: -1, repeatDelay: 4.5 });
    });
  }

  /* ══════════════════════════════════════════════════════
     REDUCED MOTION: simple fade-in reveals, no pins.
     ══════════════════════════════════════════════════════ */
  if (reduced || !window.gsap) {
    document.documentElement.classList.add("reduced");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => e.isIntersecting && e.target.classList.add("in"));
    }, { threshold: 0.15 });
    $$("[data-reveal], .step, .cut").forEach((el) => {
      el.setAttribute("data-reveal", "");
      io.observe(el);
    });
    $$(".p-tomoe").forEach((t) => t.classList.add("on"));
    const navIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const i = sections.indexOf(e.target);
        navLinks.forEach((l, j) => l.classList.toggle("active", i === j));
      });
    }, { threshold: 0.4 });
    sections.forEach((s) => navIO.observe(s));
    return;
  }

  /* ══════════════════════════════════════════════════════
     FULL EXPERIENCE
     ══════════════════════════════════════════════════════ */
  gsap.registerPlugin(ScrollTrigger);

  const lenis = new Lenis({ smoothWheel: true, lerp: 0.09 });
  window.lenis = lenis;
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  /* ── generic reveals ─────────────────────────────────── */
  $$("[data-reveal]").forEach((el) => {
    gsap.from(el, {
      opacity: 0, y: 46, duration: 1.1, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 84%" },
    });
  });
  $$(".step").forEach((el) => {
    gsap.from(el, {
      opacity: 0, y: 60, duration: 1, ease: "power2.out",
      scrollTrigger: { trigger: el, start: el.hasAttribute("data-delay") ? "top 40%" : "top 78%" },
    });
  });

  /* ── katakana scramble on chapter titles ─────────────── */
  const SCRAMBLE_POOL = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ";
  function scrambleIn(title) {
    const em = title.querySelector("em");
    let finalText = "";
    Array.from(title.childNodes).forEach((n) => { if (n !== em) { finalText += n.textContent; title.removeChild(n); } });
    finalText = finalText.trim();
    const span = document.createElement("span");
    title.appendChild(span);
    const dur = 850, start = performance.now();
    (function tick(now) {
      const p = Math.min(1, (now - start) / dur);
      const lock = Math.floor(p * finalText.length);
      let out = "";
      for (let i = 0; i < finalText.length; i++) {
        const ch = finalText[i];
        out += (i < lock || ch === " " || ch === "'") ? ch : SCRAMBLE_POOL[(Math.random() * SCRAMBLE_POOL.length) | 0];
      }
      span.textContent = out;
      if (p < 1) requestAnimationFrame(tick);
      else span.textContent = finalText;
    })(start);
  }
  $$(".chap-title").forEach((t) => {
    ScrollTrigger.create({ trigger: t, start: "top 88%", once: true, onEnter: () => scrambleIn(t) });
  });

  /* ── hero: moon parallax ─────────────────────────────── */
  gsap.to(".hero-moon", {
    yPercent: 16, ease: "none",
    scrollTrigger: { trigger: ".sec-hero", start: "top top", end: "bottom top", scrub: true },
  });

  /* ── particle system (feathers / ash / dark feathers) ── */
  const FEATHER_SVG = '<svg viewBox="0 0 20 34"><path d="M10 0 C16 8 18 20 10 34 C2 20 4 8 10 0 Z" fill="#111"/><line x1="10" y1="4" x2="10" y2="30" stroke="#2e2e2e" stroke-width="1"/></svg>';
  const FEATHER_DARK_SVG = '<svg viewBox="0 0 20 34"><path d="M10 0 C16 8 18 20 10 34 C2 20 4 8 10 0 Z" fill="#141414"/><line x1="10" y1="4" x2="10" y2="30" stroke="#3a3a3a" stroke-width="1"/></svg>';
  function particleLayer(sectionSel, type, rate) {
    const sec = $(sectionSel);
    if (!sec) return;
    let host = type === "feather" ? $(".hero-feathers") : null;
    if (!host) {
      host = document.createElement("div");
      host.className = "px-layer";
      sec.appendChild(host);
    }
    let active = false;
    new IntersectionObserver((e) => (active = e[0].isIntersecting)).observe(sec);
    setInterval(() => {
      if (!active || document.hidden) return;
      const el = document.createElement("span");
      if (type === "ash") {
        el.className = "px ash" + (Math.random() < 0.14 ? " hot" : "");
        el.style.top = Math.random() * 85 + "%";
      } else {
        el.className = "px " + (type === "feather" ? "fthr" : "fthr-dark");
        el.innerHTML = type === "feather" ? FEATHER_SVG : FEATHER_DARK_SVG;
      }
      el.style.left = Math.random() * 100 + "%";
      el.style.setProperty("--drift", (Math.random() * 22 - 11) + "vw");
      el.style.setProperty("--rot", 140 + Math.random() * 420 + "deg");
      el.style.animationDuration = 6 + Math.random() * 7 + "s";
      el.addEventListener("animationend", () => el.remove());
      host.appendChild(el);
    }, rate);
  }
  particleLayer(".sec-hero", "feather", 900);
  particleLayer(".sec-war", "ash", 480);
  particleLayer(".sec-massacre", "ash", 440);
  particleLayer(".sec-farewell", "featherDark", 1100);

  /* ── ch I: war bg fade-in ────────────────────────────── */
  gsap.to(".war-bg", {
    opacity: 0.55, ease: "none",
    scrollTrigger: { trigger: ".sec-war", start: "top 55%", end: "25% 30%", scrub: true },
  });

  /* ── ch II: horizontal prodigy timeline (desktop) ────── */
  const alFill = $(".al-fill");
  ScrollTrigger.matchMedia({
    "(min-width: 769px)": function () {
      const track = $(".timeline-track");
      const dist = () => track.scrollWidth - window.innerWidth;
      gsap.to(track, {
        x: () => -dist(), ease: "none",
        scrollTrigger: {
          trigger: ".timeline-pin", start: "top top", end: () => "+=" + dist(),
          scrub: 1, pin: true, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate(self) { if (alFill) gsap.set(alFill, { scaleX: self.progress }); },
        },
      });
    },
  });

  /* ── ch III: crow flies across on scroll ─────────────── */
  gsap.fromTo(".crow-fly",
    { x: 0, y: 0 },
    {
      x: () => window.innerWidth * 1.25, y: -110, rotate: 8, ease: "none",
      scrollTrigger: { trigger: ".sec-shisui", start: "top 60%", end: "bottom bottom", scrub: 1.2 },
    });

  /* ── ch IV: coup panels converge ─────────────────────── */
  gsap.from(".coup-left", {
    xPercent: -55, opacity: 0, ease: "none",
    scrollTrigger: { trigger: ".coup-split", start: "top 85%", end: "top 40%", scrub: 1 },
  });
  gsap.from(".coup-right", {
    xPercent: 55, opacity: 0, ease: "none",
    scrollTrigger: { trigger: ".coup-split", start: "top 85%", end: "top 40%", scrub: 1 },
  });

  /* ── ch V: blood moon scales up (pinned) ─────────────── */
  gsap.fromTo(".moon-fig", { scale: 1 }, {
    scale: 1.35, ease: "none",
    scrollTrigger: { trigger: ".moon-stage", start: "top top", end: "+=90%", scrub: true, pin: true, anticipatePin: 1 },
  });
  gsap.from(".moon-caption", {
    opacity: 0, y: 40,
    scrollTrigger: { trigger: ".moon-stage", start: "top 40%" },
  });

  /* ── genjutsu red-flash moments ──────────────────────── */
  const flash = $("#flash");
  function doFlash(red) {
    flash.classList.toggle("red", !!red);
    gsap.fromTo(flash, { opacity: red ? 0.85 : 1 }, { opacity: 0, duration: red ? 0.9 : 0.5, ease: "power2.out", overwrite: true });
  }
  $$("[data-invert]").forEach((el) => {
    ScrollTrigger.create({ trigger: el, start: "top 62%", onEnter: () => doFlash(true) });
  });
  ScrollTrigger.create({ trigger: "[data-kirin]", start: "top 62%", onEnter: () => doFlash(false) });

  /* ── "Only Sasuke is left." dim pulse ────────────────── */
  const dimmer = $("#dimmer");
  function dimPulse() {
    gsap.timeline({ overwrite: true })
      .to(dimmer, { opacity: 0.75, duration: 0.8, ease: "power2.in" })
      .to(dimmer, { opacity: 0, duration: 1.8, ease: "power2.out" }, "+=0.45");
  }
  $$("[data-dim]").forEach((el) => {
    ScrollTrigger.create({ trigger: el, start: "top 60%", onEnter: dimPulse, onEnterBack: dimPulse });
  });

  /* ── ch VI: drifting red clouds + ken burns ──────────── */
  gsap.to(".cloud-layer.c1", {
    backgroundPositionX: "-=360px", ease: "none",
    scrollTrigger: { trigger: ".sec-akatsuki", start: "top bottom", end: "bottom top", scrub: 1 },
  });
  gsap.to(".cloud-layer.c2", {
    backgroundPositionX: "+=260px", ease: "none",
    scrollTrigger: { trigger: ".sec-akatsuki", start: "top bottom", end: "bottom top", scrub: 1 },
  });
  $$(".kenburns img").forEach((img) => {
    gsap.fromTo(img, { scale: 1.14 }, {
      scale: 1, ease: "none",
      scrollTrigger: { trigger: img.closest("figure"), start: "top bottom", end: "bottom top", scrub: true },
    });
  });

  /* ── ch IX: memories relight ─────────────────────────── */
  $$(".memory").forEach((m) => {
    ScrollTrigger.create({
      trigger: m, start: "top 70%",
      onEnter: () => m.classList.add("lit"),
      onLeaveBack: () => m.classList.remove("lit"),
    });
  });

  /* ── ch XI: page turns to paper (black → white) ──────── */
  gsap.to("html", {
    "--bg": "#f0ede6", "--fg": "#141414", "--fg-dim": "#6a655d", "--line": "#d5d0c6",
    ease: "none",
    scrollTrigger: { trigger: ".sec-farewell", start: "top 75%", end: "top 10%", scrub: true },
  });

  /* ── final quote, letter by letter ───────────────────── */
  gsap.from(".final-quote .lt", {
    opacity: 0.06, ease: "none", stagger: 0.6,
    scrollTrigger: { trigger: ".final-quote", start: "top 85%", end: "top 30%", scrub: true },
  });

  /* ── progress sharingan + tooltip data ───────────────── */
  const tomoe = $$(".p-tomoe");
  const eye = $("#progress-eye");
  const eyeTip = $("#eye-tip");
  let curChap = "Prologue", curPct = 0;
  function updateTip() { if (eyeTip) eyeTip.textContent = curChap + " · " + curPct + "%"; }
  gsap.to("#prog-ring", {
    strokeDashoffset: 0, ease: "none",
    scrollTrigger: {
      trigger: "#story", start: "top top", end: "bottom bottom", scrub: true,
      onUpdate(self) {
        tomoe[0] && tomoe[0].classList.toggle("on", self.progress > 0.12);
        tomoe[1] && tomoe[1].classList.toggle("on", self.progress > 0.24);
        tomoe[2] && tomoe[2].classList.toggle("on", self.progress > 0.34);
        curPct = Math.round(self.progress * 100);
        if (eyeTip && eyeTip.classList.contains("show")) updateTip();
      },
    },
  });
  ScrollTrigger.create({
    trigger: "#ch-massacre", start: "top 45%",
    onEnter() {
      gsap.to("#prog-tomoe", { opacity: 0, duration: 0.6 });
      gsap.to("#prog-mangekyo", { opacity: 1, duration: 0.6 });
      eye.classList.add("mangekyo");
    },
    onLeaveBack() {
      gsap.to("#prog-tomoe", { opacity: 1, duration: 0.6 });
      gsap.to("#prog-mangekyo", { opacity: 0, duration: 0.6 });
      eye.classList.remove("mangekyo");
    },
  });
  if (eye && eyeTip) {
    eye.addEventListener("mouseenter", () => { updateTip(); eyeTip.classList.add("show"); });
    eye.addEventListener("mouseleave", () => eyeTip.classList.remove("show"));
  }

  /* ── active chapter dot ──────────────────────────────── */
  sections.forEach((sec, i) => {
    ScrollTrigger.create({
      trigger: sec, start: "top 55%", end: "bottom 55%",
      onToggle(self) {
        if (self.isActive) {
          navLinks.forEach((l, j) => l.classList.toggle("active", i === j));
          curChap = sec.dataset.chapter || sec.id;
        }
      },
    });
  });

  /* ── custom sharingan cursor + card tilt (desktop) ───── */
  if (fine) {
    document.documentElement.classList.add("fine");
    const cursor = $("#cursor");
    const dotX = gsap.quickTo(".c-dot", "x", { duration: 0.07, ease: "power2" });
    const dotY = gsap.quickTo(".c-dot", "y", { duration: 0.07, ease: "power2" });
    const ringX = gsap.quickTo(".c-ring", "x", { duration: 0.32, ease: "power3" });
    const ringY = gsap.quickTo(".c-ring", "y", { duration: 0.32, ease: "power3" });
    window.addEventListener("mousemove", (e) => {
      dotX(e.clientX); dotY(e.clientY); ringX(e.clientX); ringY(e.clientY);
    });
    document.addEventListener("mouseover", (e) => {
      cursor.classList.toggle("hover", !!e.target.closest("a, button, .ph, .tcard, #progress-eye"));
    });
    document.documentElement.addEventListener("mouseleave", () => gsap.to(cursor, { opacity: 0, duration: 0.2 }));
    document.documentElement.addEventListener("mouseenter", () => gsap.to(cursor, { opacity: 1, duration: 0.2 }));

    $$(".tcard").forEach((card) => {
      gsap.set(card, { transformPerspective: 800 });
      const rx = gsap.quickTo(card, "rotationX", { duration: 0.45, ease: "power2" });
      const ry = gsap.quickTo(card, "rotationY", { duration: 0.45, ease: "power2" });
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        ry(gsap.utils.mapRange(0, r.width, -7, 7)(e.clientX - r.left));
        rx(gsap.utils.mapRange(0, r.height, 6, -6)(e.clientY - r.top));
      });
      card.addEventListener("mouseleave", () => { rx(0); ry(0); });
    });
  }

  /* ── synthesized heartbeat (blood-moon, audio ON) ────── */
  let hbCtx = null, hbTimer = null;
  function thump(t, freq, gainV) {
    const o = hbCtx.createOscillator(), g = hbCtx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(34, t + 0.18);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gainV, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    o.connect(g).connect(hbCtx.destination);
    o.start(t); o.stop(t + 0.28);
  }
  function beat() {
    const t = hbCtx.currentTime;
    thump(t, 58, 0.22);
    thump(t + 0.24, 46, 0.15);
  }
  hbSync = function () {
    const on = state.audioOn && state.moonActive && !document.hidden;
    if (on && !hbTimer) {
      hbCtx = hbCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (hbCtx.resume) hbCtx.resume();
      beat();
      hbTimer = setInterval(beat, 860);
    } else if (!on && hbTimer) {
      clearInterval(hbTimer);
      hbTimer = null;
    }
  };
  ScrollTrigger.create({
    trigger: ".moon-stage", start: "top 70%", end: "bottom top",
    onToggle(self) { state.moonActive = self.isActive; hbSync(); },
  });
  document.addEventListener("visibilitychange", () => hbSync());

  /* refresh once images/fonts settle */
  window.addEventListener("load", () => ScrollTrigger.refresh());
})();
