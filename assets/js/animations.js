/* animations.js
   Loads AFTER main.js. Plain JavaScript, no extra libraries.
   Everything is skipped when the visitor prefers reduced motion. */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. Scroll progress bar ---------- */
  function initProgress() {
    if (reduce) return;
    var bar = document.createElement("div");
    bar.className = "scroll-progress";
    bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);

    var ticking = false;
    function update() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? window.scrollY / max : 0;
      bar.style.transform = "scaleX(" + Math.min(Math.max(p, 0), 1) + ")";
      ticking = false;
    }
    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
    update();
  }

  /* ---------- 2. Hero neural-network canvas ---------- */
  function initNetwork() {
    var hero = document.getElementById("hero");
    if (!hero || reduce) return;

    var canvas = document.createElement("canvas");
    canvas.className = "hero-network";
    canvas.setAttribute("aria-hidden", "true");
    var img = hero.querySelector("img");
    hero.insertBefore(canvas, img ? img.nextSibling : hero.firstChild);

    var ctx = canvas.getContext("2d");
    var accent =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--accent-color")
        .trim() || "#149ddd";
    var LINK = 130;
    var MOUSE_R = 170;
    var nodes = [];
    var mouse = { x: null, y: null };
    var w = 0;
    var h = 0;
    var raf = null;
    var inView = true;

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = hero.clientWidth;
      h = hero.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var count = Math.min(80, Math.floor((w * h) / 16000));
      nodes = [];
      for (var i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.45,
          vy: (Math.random() - 0.5) * 0.45,
          r: 1.5 + Math.random() * 1.5
        });
      }
    }

    function frame() {
      ctx.clearRect(0, 0, w, h);

      var i, j, a, b, dx, dy, d;
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        a.x += a.vx;
        a.y += a.vy;
        if (a.x < 0 || a.x > w) a.vx *= -1;
        if (a.y < 0 || a.y > h) a.vy *= -1;

        if (mouse.x !== null) {
          dx = mouse.x - a.x;
          dy = mouse.y - a.y;
          d = Math.sqrt(dx * dx + dy * dy);
          if (d < MOUSE_R && d > 1) {
            a.x += (dx / d) * 0.35;
            a.y += (dy / d) * 0.35;
          }
        }
      }

      ctx.lineWidth = 1;
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        for (j = i + 1; j < nodes.length; j++) {
          b = nodes[j];
          dx = a.x - b.x;
          dy = a.y - b.y;
          d = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK) {
            ctx.globalAlpha = (1 - d / LINK) * 0.4;
            ctx.strokeStyle = "#ffffff";
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        if (mouse.x !== null) {
          dx = a.x - mouse.x;
          dy = a.y - mouse.y;
          d = Math.sqrt(dx * dx + dy * dy);
          if (d < MOUSE_R) {
            ctx.globalAlpha = (1 - d / MOUSE_R) * 0.8;
            ctx.strokeStyle = accent;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }
      }

      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.9;
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (raf === null && inView && !document.hidden) frame();
    }
    function stop() {
      if (raf !== null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    }

    hero.addEventListener("mousemove", function (e) {
      var r = hero.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    });
    hero.addEventListener("mouseleave", function () {
      mouse.x = null;
      mouse.y = null;
    });

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
      else start();
    });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        if (inView) start();
        else stop();
      }).observe(hero);
    }

    resize();
    start();
  }

  /* ---------- 3. Scroll reveal ---------- */
  function initReveal() {
    if (reduce || !("IntersectionObserver" in window)) return;

    var selectors = [
      ".info-card",
      ".tag-list li",
      ".pub-list > li",
      ".pub-group > h3",
      ".news-list li",
      ".plain-list li",
      ".info-item",
      ".stats-row .col-6"
    ];
    var targets = document.querySelectorAll(selectors.join(","));

    // stagger siblings: 0, 1, 2... within their parent (capped at 6)
    targets.forEach(function (el) {
      var siblings = Array.prototype.filter.call(
        el.parentElement.children,
        function (c) {
          return c.matches(selectors.join(","));
        }
      );
      el.style.setProperty("--i", Math.min(siblings.indexOf(el), 6));
      el.classList.add("reveal");
    });

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          el.classList.add("is-visible");
          io.unobserve(el);
          // remove the stagger delay afterwards so hover feels instant
          setTimeout(function () {
            el.style.setProperty("--i", 0);
          }, 1200);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    targets.forEach(function (el) {
      io.observe(el);
    });
  }

  /* ---------- 4. Count-up numbers ---------- */
  function initCounters() {
    var counters = document.querySelectorAll(".stat-number[data-count]");
    if (!counters.length) return;

    function setFinal(el) {
      el.textContent = el.getAttribute("data-count");
    }

    if (reduce || !("IntersectionObserver" in window)) {
      counters.forEach(setFinal);
      return;
    }

    function run(el) {
      var end = parseInt(el.getAttribute("data-count"), 10) || 0;
      var duration = 1300;
      var t0 = null;
      function step(t) {
        if (t0 === null) t0 = t;
        var p = Math.min((t - t0) / duration, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(end * eased);
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            run(entry.target);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach(function (el) {
      io.observe(el);
    });
  }

  function init() {
    initProgress();
    initNetwork();
    initReveal();
    initCounters();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
