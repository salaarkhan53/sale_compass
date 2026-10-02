/* ==========================================================================
   SaleCompass - interactions & motion
   GSAP + ScrollTrigger + Lenis are progressive enhancements: if they fail to
   load, the page is fully visible and usable.
   ========================================================================== */
(function () {
  "use strict";

  var doc = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var motion = doc.classList.contains("motion") && hasGsap && !reduceMotion;
  var lenis = null;

  if (!motion) doc.classList.remove("motion");

  /* ------------------------------------------------------------------------
     Header state
     ------------------------------------------------------------------------ */
  var header = document.querySelector(".site-header");
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    var scrolled = y > 24;
    if (header) {
      header.classList.toggle("is-scrolled", scrolled);
      var max = document.documentElement.scrollHeight - window.innerHeight;
      header.style.setProperty("--progress", max > 0 ? Math.min(1, y / max).toFixed(4) : 0);
    }
    doc.classList.toggle("has-scrolled", scrolled);
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* Highlight pill that glides to the hovered link and rests on the current page */
  var navLinks = document.querySelector(".nav-links");
  var navPill = navLinks && navLinks.querySelector(".nav-pill");
  if (navPill) {
    var currentLink = navLinks.querySelector('a[aria-current="page"]');
    var placePill = function (link, instant) {
      if (!link) { navPill.classList.remove("is-visible"); return; }
      if (instant) navPill.style.transition = "none";
      navPill.style.left = link.offsetLeft + "px";
      navPill.style.width = link.offsetWidth + "px";
      navPill.classList.add("is-visible");
      if (instant) { void navPill.offsetWidth; navPill.style.transition = ""; }
    };
    var restPill = function () { placePill(currentLink, false); };
    navLinks.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("mouseenter", function () { placePill(link, false); });
      link.addEventListener("focus", function () { placePill(link, false); });
    });
    navLinks.addEventListener("mouseleave", restPill);
    navLinks.addEventListener("focusout", function (e) { if (!navLinks.contains(e.relatedTarget)) restPill(); });
    var initPill = function () { placePill(currentLink, true); };
    initPill();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(initPill);
    window.addEventListener("resize", initPill);
  }

  /* ------------------------------------------------------------------------
     Mobile menu
     ------------------------------------------------------------------------ */
  var toggle = document.querySelector(".nav-toggle");
  var menu = document.getElementById("mobile-menu");

  function setMenu(open) {
    if (!toggle || !menu) return;
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menu.classList.toggle("is-open", open);
    menu.setAttribute("aria-hidden", open ? "false" : "true");
    if (open) menu.removeAttribute("inert"); else menu.setAttribute("inert", "");
    doc.classList.toggle("menu-open", open);
    document.body.style.overflow = open ? "hidden" : "";
    if (lenis) { open ? lenis.stop() : lenis.start(); }
    if (open) {
      var first = menu.querySelector("a");
      if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 60);
    }
  }

  if (toggle && menu) {
    setMenu(false);
    toggle.addEventListener("click", function () {
      setMenu(toggle.getAttribute("aria-expanded") !== "true");
    });
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (!menu.classList.contains("is-open")) return;
      if (e.key === "Escape") { setMenu(false); toggle.focus(); return; }
      if (e.key === "Tab") {
        var focusables = [toggle].concat(Array.prototype.slice.call(menu.querySelectorAll("a")));
        var firstEl = focusables[0];
        var lastEl = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
        else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
      }
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 1100 && menu.classList.contains("is-open")) setMenu(false);
    });
  }

  /* ------------------------------------------------------------------------
     FAQ accordion (animated <details>)
     ------------------------------------------------------------------------ */
  document.querySelectorAll(".faq details").forEach(function (details) {
    var summary = details.querySelector("summary");
    var answer = details.querySelector(".faq__answer");
    if (!summary || !answer || reduceMotion || !answer.animate) return;
    var anim = null;

    summary.addEventListener("click", function (e) {
      e.preventDefault();
      if (anim) anim.cancel();
      if (details.open) {
        var h = answer.offsetHeight;
        anim = answer.animate(
          [{ height: h + "px", opacity: 1 }, { height: "0px", opacity: 0 }],
          { duration: 420, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
        );
        anim.onfinish = function () { details.open = false; anim = null; };
      } else {
        details.open = true;
        var target = answer.offsetHeight;
        anim = answer.animate(
          [{ height: "0px", opacity: 0 }, { height: target + "px", opacity: 1 }],
          { duration: 520, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
        );
        anim.onfinish = function () { anim = null; };
      }
    });
  });

  /* ------------------------------------------------------------------------
     Lightbox
     ------------------------------------------------------------------------ */
  var triggers = document.querySelectorAll("[data-lightbox]");
  if (triggers.length) {
    var box = document.createElement("div");
    box.className = "lightbox";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Image viewer");
    box.innerHTML =
      '<button class="lightbox__close" type="button" aria-label="Close image">' +
      '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
      "</button><figure><img alt=\"\"><figcaption></figcaption></figure>";
    document.body.appendChild(box);
    var boxImg = box.querySelector("img");
    var boxCap = box.querySelector("figcaption");
    var closeBtn = box.querySelector(".lightbox__close");
    var lastFocus = null;

    var openBox = function (src, caption) {
      lastFocus = document.activeElement;
      boxImg.src = src;
      boxImg.alt = caption || "";
      boxCap.textContent = caption || "";
      box.classList.add("is-open");
      document.body.style.overflow = "hidden";
      if (lenis) lenis.stop();
      closeBtn.focus({ preventScroll: true });
    };
    var closeBox = function () {
      box.classList.remove("is-open");
      document.body.style.overflow = "";
      if (lenis) lenis.start();
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    };

    triggers.forEach(function (t) {
      t.addEventListener("click", function () {
        var img = t.querySelector("img");
        openBox(t.getAttribute("data-lightbox") || (img && img.currentSrc) || "", img ? img.alt : "");
      });
    });
    box.addEventListener("click", function (e) { if (e.target === box || e.target.closest(".lightbox__close")) closeBox(); });
    document.addEventListener("keydown", function (e) {
      if (!box.classList.contains("is-open")) return;
      if (e.key === "Escape") closeBox();
      if (e.key === "Tab") { e.preventDefault(); closeBtn.focus(); }
    });
  }

  /* ------------------------------------------------------------------------
     R&D section chip navigation
     ------------------------------------------------------------------------ */
  var chipList = document.querySelector(".chipnav__list");
  if (chipList && "IntersectionObserver" in window) {
    var chips = Array.prototype.slice.call(chipList.querySelectorAll("a"));
    var sections = chips.map(function (a) { return document.querySelector(a.getAttribute("href")); }).filter(Boolean);
    var setActive = function (id) {
      chips.forEach(function (a) {
        var on = a.getAttribute("href") === "#" + id;
        a.classList.toggle("is-active", on);
        if (on) {
          a.setAttribute("aria-current", "true");
          chipList.scrollTo({ left: a.offsetLeft - 24, behavior: reduceMotion ? "auto" : "smooth" });
        } else {
          a.removeAttribute("aria-current");
        }
      });
    };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { if (entry.isIntersecting) setActive(entry.target.id); });
    }, { rootMargin: "-35% 0px -60% 0px" });
    sections.forEach(function (s) { io.observe(s); });
  }

  /* ------------------------------------------------------------------------
     Contact form (Formspree, AJAX with graceful fallback)
     ------------------------------------------------------------------------ */
  var form = document.querySelector("[data-contact-form]");
  if (form) {
    var status = form.querySelector(".form-status");
    var submit = form.querySelector("button[type=submit]");
    var submitLabel = submit ? submit.innerHTML : "";
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    var MIN_WORDS = 10;
    var onlyDigits = function (v) { return /^[\d\s.,+\-()]+$/.test(v); };
    var countWords = function (v) { var t = v.trim(); return t ? t.split(/\s+/).length : 0; };

    /* Returns an error message, or "" when the value is acceptable */
    var RULES = {
      name: function (v) {
        if (!v) return "Please enter your name.";
        if (/\d/.test(v)) return "Your name can't contain numbers.";
        return "";
      },
      email: function (v) {
        if (!v) return "Please enter your email address.";
        if (!emailRe.test(v)) return "Please enter a valid email address.";
        return "";
      },
      company_name: function (v) {
        if (!v) return "Please enter your company name.";
        if (onlyDigits(v)) return "Company name can't be numbers only.";
        return "";
      },
      message: function (v) {
        if (!v) return "Please enter a message.";
        if (onlyDigits(v)) return "Your message can't be numbers only.";
        var n = countWords(v);
        if (n < MIN_WORDS) return "Please write at least " + MIN_WORDS + " words (" + n + " so far).";
        return "";
      }
    };

    var validateField = function (field) {
      var input = field.querySelector("input, textarea");
      var rule = RULES[input.name];
      var msg = rule ? rule(input.value.trim()) : (input.value.trim() ? "" : "This field is required.");
      var errEl = field.querySelector(".field__error");
      if (errEl && msg) errEl.textContent = msg;
      field.classList.toggle("is-invalid", !!msg);
      input.setAttribute("aria-invalid", msg ? "true" : "false");
      return !msg;
    };

    form.setAttribute("novalidate", "");
    form.querySelectorAll(".field").forEach(function (field) {
      var input = field.querySelector("input, textarea");
      input.addEventListener("blur", function () { if (input.value) validateField(field); });
      input.addEventListener("input", function () { if (field.classList.contains("is-invalid")) validateField(field); });

      /* live word counter on the message box */
      if (input.name === "message") {
        var hint = document.createElement("p");
        hint.className = "field__hint";
        hint.setAttribute("aria-live", "polite");
        var updateHint = function () {
          var n = countWords(input.value);
          hint.textContent = n + " / " + MIN_WORDS + " words minimum";
          hint.classList.toggle("is-met", n >= MIN_WORDS && !onlyDigits(input.value.trim()));
        };
        updateHint();
        field.appendChild(hint);
        input.addEventListener("input", updateHint);
        form.addEventListener("reset", function () { setTimeout(updateHint, 0); });
      }
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fields = Array.prototype.slice.call(form.querySelectorAll(".field"));
      var allOk = fields.map(validateField).every(Boolean);
      if (!allOk) {
        var firstBad = form.querySelector(".is-invalid input, .is-invalid textarea");
        if (firstBad) firstBad.focus();
        return;
      }
      if (!window.fetch) { form.submit(); return; }

      submit.disabled = true;
      submit.innerHTML = "Sending…";
      status.className = "form-status";
      status.textContent = "";

      fetch(form.action, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } })
        .then(function (res) {
          if (!res.ok) throw new Error("Request failed");
          form.reset();
          status.className = "form-status is-success";
          status.textContent = "Thank you. Your message has been sent and we will get back to you shortly.";
        })
        .catch(function () {
          status.className = "form-status is-error";
          status.textContent = "Sorry, something went wrong. Please try again or email info@salecompass.uk.";
        })
        .then(function () {
          submit.disabled = false;
          submit.innerHTML = submitLabel;
        });
    });
  }

  /* ------------------------------------------------------------------------
     Page transitions
     ------------------------------------------------------------------------ */
  if (motion) {
    var veil = document.createElement("div");
    veil.className = "veil";
    veil.setAttribute("aria-hidden", "true");
    document.body.appendChild(veil);

    document.addEventListener("click", function (e) {
      var a = e.target.closest("a[href]");
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (a.target === "_blank" || a.hasAttribute("download")) return;
      var url = new URL(a.href, location.href);
      if (url.origin !== location.origin || !/\.html$|\/$/.test(url.pathname)) return;
      if (url.pathname === location.pathname && url.hash) return;
      e.preventDefault();
      doc.classList.add("is-leaving");
      setTimeout(function () { location.href = url.href; }, 340);
    });
    window.addEventListener("pageshow", function () { doc.classList.remove("is-leaving"); });
  }

  /* ------------------------------------------------------------------------
     Orange sparks that drift and scatter from the cursor
     (Home hero, and every page's footer)
     ------------------------------------------------------------------------ */
  function initSparks(sparkHost, density, maxCount) {
  var sparkCanvas = sparkHost && document.createElement("canvas");
  if (sparkCanvas && sparkCanvas.getContext) {
    sparkCanvas.className = "sparks";
    sparkCanvas.setAttribute("aria-hidden", "true");
    var gridLines = sparkHost.querySelector(".hero-grid-lines");
    sparkHost.insertBefore(sparkCanvas, gridLines ? gridLines.nextSibling : sparkHost.firstChild);
    sparkHost.classList.add("has-sparks");

    var sctx = sparkCanvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var SW = 0, SH = 0, sparks = [], pointer = { x: -9999, y: -9999 };
    var sparkRunning = false, sparkVisible = true, rafId = 0;
    var REPEL = 140, REPEL2 = REPEL * REPEL;

    var seedSparks = function () {
      var count = Math.round(Math.min(maxCount, Math.max(40, (SW * SH) / density)));
      sparks = [];
      for (var i = 0; i < count; i++) {
        var x = Math.random() * SW, y = Math.random() * SH;
        var big = Math.random() < 0.12;
        sparks.push({
          hx: x, hy: y, x: x, y: y, vx: 0, vy: 0,
          r: big ? 1.8 + Math.random() * 1.4 : 0.6 + Math.random() * 1.1,
          a: big ? 0.55 + Math.random() * 0.35 : 0.25 + Math.random() * 0.45,
          ph: Math.random() * Math.PI * 2,
          sp: 0.4 + Math.random() * 0.9,
          big: big
        });
      }
    };
    var sizeSparks = function () {
      var r = sparkHost.getBoundingClientRect();
      SW = r.width; SH = r.height;
      sparkCanvas.width = Math.round(SW * dpr);
      sparkCanvas.height = Math.round(SH * dpr);
      sparkCanvas.style.width = SW + "px";
      sparkCanvas.style.height = SH + "px";
      sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedSparks();
    };
    var drawSparks = function (t) {
      sctx.clearRect(0, 0, SW, SH);
      for (var i = 0; i < sparks.length; i++) {
        var p = sparks[i];
        // each spark wanders gently around its home point
        var hx = p.hx + Math.cos(t * 0.00032 * p.sp + p.ph) * 9;
        var hy = p.hy + Math.sin(t * 0.00027 * p.sp + p.ph) * 9;
        var dx = p.x - pointer.x, dy = p.y - pointer.y, d2 = dx * dx + dy * dy;
        if (d2 < REPEL2 && d2 > 0.01) {
          var d = Math.sqrt(d2), force = (1 - d / REPEL) * 3.2;
          p.vx += (dx / d) * force;
          p.vy += (dy / d) * force;
        }
        p.vx += (hx - p.x) * 0.01;
        p.vy += (hy - p.y) * 0.01;
        p.vx *= 0.9;
        p.vy *= 0.9;
        p.x += p.vx;
        p.y += p.vy;
        var twinkle = 0.6 + 0.4 * Math.sin(t * 0.0018 * p.sp + p.ph);
        sctx.globalAlpha = p.a * twinkle;
        if (p.big) {
          var g = sctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
          g.addColorStop(0, "rgba(255, 178, 122, 0.9)");
          g.addColorStop(1, "rgba(255, 140, 58, 0)");
          sctx.fillStyle = g;
          sctx.beginPath();
          sctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
          sctx.fill();
        }
        sctx.fillStyle = p.big ? "#FFC293" : "#FF8C3A";
        sctx.beginPath();
        sctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        sctx.fill();
      }
      sctx.globalAlpha = 1;
    };
    var loop = function (t) {
      drawSparks(t);
      rafId = sparkRunning ? requestAnimationFrame(loop) : 0;
    };
    var setRunning = function () {
      var should = sparkVisible && !document.hidden && !reduceMotion;
      if (should && !sparkRunning) { sparkRunning = true; rafId = requestAnimationFrame(loop); }
      if (!should) { sparkRunning = false; cancelAnimationFrame(rafId); }
    };
    var movePointer = function (clientX, clientY) {
      var r = sparkHost.getBoundingClientRect();
      pointer.x = clientX - r.left;
      pointer.y = clientY - r.top;
    };

    sizeSparks();
    if (reduceMotion) drawSparks(0);
    sparkHost.addEventListener("pointermove", function (e) { movePointer(e.clientX, e.clientY); });
    sparkHost.addEventListener("pointerdown", function (e) { movePointer(e.clientX, e.clientY); });
    sparkHost.addEventListener("touchmove", function (e) {
      if (e.touches[0]) movePointer(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    var clearPointer = function () { pointer.x = -9999; pointer.y = -9999; };
    sparkHost.addEventListener("pointerleave", clearPointer);
    sparkHost.addEventListener("touchend", clearPointer, { passive: true });

    var sparkResize = null;
    var lastW = SW, lastH = SH;
    var onSparkResize = function () {
      clearTimeout(sparkResize);
      sparkResize = setTimeout(function () {
        var r = sparkHost.getBoundingClientRect();
        if (Math.abs(r.width - lastW) < 1 && Math.abs(r.height - lastH) < 1) return;
        lastW = r.width; lastH = r.height;
        sizeSparks();
        if (reduceMotion) drawSparks(0);
      }, 200);
    };
    if ("ResizeObserver" in window) new ResizeObserver(onSparkResize).observe(sparkHost);
    else window.addEventListener("resize", onSparkResize);
    document.addEventListener("visibilitychange", setRunning);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        sparkVisible = entries[0].isIntersecting;
        setRunning();
      }).observe(sparkHost);
    } else {
      setRunning();
    }
  }
  }
  initSparks(document.querySelector(".home-hero"), 6500, 260);
  initSparks(document.querySelector(".site-footer"), 9000, 140);

  /* ------------------------------------------------------------------------
     Justify paragraphs that run longer than two lines
     ------------------------------------------------------------------------ */
  var paras = Array.prototype.slice.call(document.querySelectorAll("main p"));
  function justify() {
    paras.forEach(function (p) {
      var cs = getComputedStyle(p);
      var lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
      var lines = Math.round(p.getBoundingClientRect().height / lh);
      /* very narrow columns justify with ugly gaps, so they stay left-aligned */
      p.classList.toggle("is-justified", lines > 2 && p.clientWidth >= 340);
    });
  }
  justify();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(justify);
  var justifyTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(justifyTimer);
    justifyTimer = setTimeout(justify, 150);
  });

  /* ------------------------------------------------------------------------
     Back to top
     ------------------------------------------------------------------------ */
  var toTop = document.querySelector(".to-top");
  if (toTop) {
    toTop.addEventListener("click", function () {
      if (lenis) lenis.scrollTo(0, { duration: 1.6 });
      else window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      var skip = document.querySelector(".brand");
      if (skip) skip.focus({ preventScroll: true });
    });
  }

  /* ------------------------------------------------------------------------
     Footer wordmark: hidden at the end of the page, revealed only when the
     visitor keeps pushing past the bottom (wheel, trackpad, touch or keys)
     ------------------------------------------------------------------------ */
  var word = document.querySelector(".footer-word");
  var wordInner = word && word.querySelector(".footer-word__inner");
  if (word && wordInner) {
    var PULL_TO_OPEN = 260;   /* how far past the end you have to push */
    var PEEK_RATIO = 0.35;    /* how much of the wordmark shows while pushing */
    var wordOpen = false, pull = 0, releaseTimer = null, touchY = null;

    var fullHeight = function () {
      var pad = parseFloat(getComputedStyle(wordInner).paddingTop) || 0;
      return Math.round(pad + (wordInner.getBoundingClientRect().height - pad) * 0.8);
    };
    var maxScroll = function () { return document.documentElement.scrollHeight - window.innerHeight; };
    var atBottom = function () { return (window.scrollY || window.pageYOffset) >= maxScroll() - 4; };
    var pinToBottom = function () {
      if (lenis) { lenis.resize(); lenis.scrollTo(maxScroll(), { immediate: true, force: true }); }
      else window.scrollTo(0, maxScroll());
    };
    var setHeight = function (h, snap) {
      word.classList.toggle("is-snapping", !!snap);
      word.style.height = h + "px";
      pinToBottom();
    };
    /* keep the page glued to the bottom while the height animates */
    var follow = function (ms) {
      var end = performance.now() + ms;
      (function tick() { pinToBottom(); if (performance.now() < end) requestAnimationFrame(tick); })();
    };

    var openWord = function () {
      if (wordOpen) return;
      wordOpen = true;
      pull = 0;
      clearTimeout(releaseTimer);
      setHeight(fullHeight(), true);
      word.classList.add("is-open");
      follow(900);
    };
    var springBack = function () {
      if (wordOpen) return;
      pull = 0;
      word.style.height = "";
      word.classList.add("is-snapping");
      setTimeout(function () { word.classList.remove("is-snapping"); }, 900);
    };
    var addPull = function (amount) {
      if (wordOpen) return;
      if (pull === 0 && !atBottom()) return;
      pull = Math.max(0, pull + amount);
      if (pull >= PULL_TO_OPEN) { openWord(); return; }
      setHeight(Math.round(pull * PEEK_RATIO), false);
      clearTimeout(releaseTimer);
      releaseTimer = setTimeout(springBack, 260);
    };

    window.addEventListener("wheel", function (e) {
      if (e.deltaY > 0) addPull(e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY);
    }, { passive: true });

    var touchPulling = false;
    window.addEventListener("touchstart", function (e) {
      touchY = e.touches[0] ? e.touches[0].clientY : null;
      touchPulling = false;
    }, { passive: true });
    window.addEventListener("touchmove", function (e) {
      if (touchY === null || !e.touches[0] || wordOpen) return;
      var y = e.touches[0].clientY;
      var delta = touchY - y;           /* finger moving up = pushing down the page */
      touchY = y;
      if (delta > 0 && (touchPulling || atBottom())) {
        touchPulling = true;
        pull = Math.max(0, pull + delta * 1.4);
        if (pull >= PULL_TO_OPEN) openWord();
        else setHeight(Math.round(pull * PEEK_RATIO), false);
      }
    }, { passive: true });
    window.addEventListener("touchend", function () {
      touchY = null;
      if (!wordOpen && pull > 0) springBack();
    }, { passive: true });

    document.addEventListener("keydown", function (e) {
      if (/^(ArrowDown|PageDown|End| )$/.test(e.key) && atBottom() && !e.target.closest("input, textarea")) openWord();
    });

    /* fold it away again once the visitor has scrolled well back up */
    window.addEventListener("scroll", function () {
      if (!wordOpen) return;
      var y = window.scrollY || window.pageYOffset;
      if (y < maxScroll() - fullHeight() - window.innerHeight * 0.5) {
        wordOpen = false;
        word.classList.remove("is-open", "is-snapping");
        word.style.height = "";
      }
    }, { passive: true });
  }

  /* ------------------------------------------------------------------------
     Motion
     ------------------------------------------------------------------------ */
  if (!motion) return;

  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);
  window.__scReady = true;

  /* Smooth scroll */
  if (window.Lenis) {
    lenis = new window.Lenis({
      duration: 1.15,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true
    });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);

    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("href");
        if (id.length < 2) return;
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        var chip = document.querySelector(".chipnav");
        var offset = (header ? 74 : 0) + (chip ? chip.offsetHeight : 0) + 16;
        var y = target.getBoundingClientRect().top + (window.scrollY || window.pageYOffset) - offset;
        lenis.resize();
        lenis.scrollTo(Math.max(0, y), { force: true });
        history.replaceState(null, "", id);
      });
    });
  }

  /* Split headings into masked words */
  function splitWords(el) {
    var walk = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var parts = child.textContent.split(/(\s+)/);
          var frag = document.createDocumentFragment();
          parts.forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            var outer = document.createElement("span");
            outer.className = "split-word";
            var inner = document.createElement("span");
            inner.className = "split-inner";
            inner.textContent = part;
            outer.appendChild(inner);
            frag.appendChild(outer);
          });
          child.parentNode.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.tagName !== "BR") {
          walk(child);
        }
      });
    };
    el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
    walk(el);
    el.querySelectorAll(".split-word").forEach(function (w) { w.setAttribute("aria-hidden", "true"); });
    return el.querySelectorAll(".split-inner");
  }

  var heroSplit = [];
  document.querySelectorAll("[data-split]").forEach(function (el) {
    var words = splitWords(el);
    gsap.set(words, { yPercent: 115 });
    el.style.visibility = "visible";
    if (el.closest(".home-hero, .page-hero")) {
      heroSplit.push(words);
    } else {
      gsap.to(words, {
        yPercent: 0,
        duration: 1.25,
        ease: "expo.out",
        stagger: 0.035,
        scrollTrigger: { trigger: el, start: "top 88%", once: true }
      });
    }
  });

  /* Hero intro timeline */
  var intro = gsap.timeline({ defaults: { ease: "expo.out" }, delay: 0.15 });
  if (header) intro.from(header, { yPercent: -100, opacity: 0, duration: 1.1 }, 0);
  heroSplit.forEach(function (words) {
    intro.to(words, { yPercent: 0, duration: 1.4, stagger: 0.04 }, 0.1);
  });
  var heroItems = document.querySelectorAll("[data-hero]");
  if (heroItems.length) {
    intro.to(heroItems, { opacity: 1, y: 0, duration: 1.2, stagger: 0.1 }, 0.55);
  }

  var heroFrame = document.querySelector(".hero-visual__frame");
  if (heroFrame) {
    gsap.set(heroFrame, { transformPerspective: 1600, rotateX: 16, y: 90, opacity: 0, transformOrigin: "50% 0%" });
    intro.to(heroFrame, { rotateX: 0, y: 0, opacity: 1, duration: 1.9 }, 0.75);

    gsap.to(".hero-visual", {
      yPercent: -5,
      ease: "none",
      scrollTrigger: { trigger: ".home-hero", start: "top top", end: "bottom top", scrub: true }
    });

    var hero = document.querySelector(".home-hero");
    if (hero && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      hero.addEventListener("pointermove", function (e) {
        var r = hero.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(heroFrame, { rotateY: x * 5, rotateX: -y * 3.5, duration: 1.4, ease: "power3.out", overwrite: "auto" });
      });
      hero.addEventListener("pointerleave", function () {
        gsap.to(heroFrame, { rotateY: 0, rotateX: 0, duration: 1.6, ease: "power3.out", overwrite: "auto" });
      });
    }
  }

  /* Generic reveals, batched so siblings stagger */
  ScrollTrigger.batch('[data-reveal]:not([data-reveal="image"]):not([data-reveal="line"])', {
    start: "top 90%",
    once: true,
    onEnter: function (batch) {
      gsap.to(batch, {
        opacity: 1, y: 0, duration: 1.15, ease: "power3.out", stagger: 0.08, overwrite: true,
        onComplete: function () {
          batch.forEach(function (el) {
            el.classList.add("is-revealed");
            gsap.set(el, { clearProps: "opacity,transform,translate,rotate,scale" });
          });
        }
      });
    }
  });

  /* Image curtain reveals */
  gsap.utils.toArray('[data-reveal="image"]').forEach(function (el) {
    var radius = getComputedStyle(el).borderTopLeftRadius || "0px";
    var img = el.querySelector("img");
    var tl = gsap.timeline({ scrollTrigger: { trigger: el, start: "top 88%", once: true } });
    tl.fromTo(el,
      { clipPath: "inset(14% 10% 14% 10% round " + radius + ")" },
      { clipPath: "inset(0% 0% 0% 0% round " + radius + ")", duration: 1.5, ease: "expo.out",
        onComplete: function () { el.style.clipPath = "none"; } }, 0);
    if (img) tl.fromTo(img, { scale: 1.14 }, { scale: 1, duration: 1.8, ease: "expo.out", clearProps: "transform" }, 0);
  });

  /* Hairlines and connectors that draw in */
  gsap.utils.toArray('[data-reveal="line"]').forEach(function (el) {
    gsap.to(el, {
      scaleX: 1, duration: 1.4, ease: "expo.inOut",
      scrollTrigger: { trigger: el, start: "top 90%", once: true }
    });
  });

  /* Gentle parallax on framed hero media */
  gsap.utils.toArray("[data-parallax]").forEach(function (el) {
    gsap.fromTo(el, { y: 0 }, {
      y: -(parseFloat(el.getAttribute("data-parallax")) || 40),
      ease: "none",
      scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true }
    });
  });

  /* Dark panels unfold toward full width as they arrive */
  var small = window.matchMedia("(max-width: 640px)").matches;
  var sideIn = small ? 3 : 6;     /* % inset while arriving */
  var sideSet = small ? 1.5 : 1;  /* % inset once settled */

  gsap.utils.toArray(".section--navy").forEach(function (sec) {
    if (sec.classList.contains("section--joins-footer")) {
      /* joins the footer: stays full width, only its top corners soften */
      gsap.fromTo(sec,
        { clipPath: "inset(0% 0% 0% 0% round 96px 96px 0px 0px)" },
        { clipPath: "inset(0% 0% 0% 0% round 44px 44px 0px 0px)", ease: "none",
          scrollTrigger: { trigger: sec, start: "top bottom", end: "top 30%", scrub: 0.6 } });
      return;
    }
    gsap.fromTo(sec,
      { clipPath: "inset(0% " + sideIn + "% 0% " + sideIn + "% round 80px)" },
      { clipPath: "inset(0% " + sideSet + "% 0% " + sideSet + "% round 44px)", ease: "none",
        scrollTrigger: { trigger: sec, start: "top bottom", end: "top 30%", scrub: 0.6 } });
  });

  /* Footer content settles in as it arrives */
  var foot = document.querySelector(".site-footer");
  if (foot) {
    var footItems = foot.querySelectorAll("[data-foot]");
    gsap.set(footItems, { opacity: 0, y: 18 });
    gsap.to(footItems, {
      opacity: 1, y: 0, duration: 1, ease: "power3.out", stagger: 0.08,
      scrollTrigger: { trigger: foot, start: "top 92%", once: true }
    });
  }

  var revealStragglers = function () {
    document.querySelectorAll('[data-reveal]:not(.is-revealed):not([data-reveal="image"]):not([data-reveal="line"])').forEach(function (el) {
      if (el.getBoundingClientRect().top < window.innerHeight && parseFloat(getComputedStyle(el).opacity) < 0.5) {
        gsap.to(el, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", onComplete: function () {
          el.classList.add("is-revealed");
          gsap.set(el, { clearProps: "opacity,transform,translate,rotate,scale" });
        } });
      }
    });
  };
  ScrollTrigger.addEventListener("scrollEnd", revealStragglers);
  window.addEventListener("load", function () { ScrollTrigger.refresh(); setTimeout(revealStragglers, 1500); });
})();
