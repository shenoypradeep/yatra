/* Vedic Space · Yātrā. Toolbar and light/dark switch on every page; on a yātrā page, photo cards and
   video cards are drawn from photos.json and videos.json beside the page, and a photo opens the carousel. */
(function(){
  var topbar = document.getElementById("topbar");
  function onScroll(){ if (topbar) topbar.classList.toggle("scrolled", window.scrollY > 4); }
  window.addEventListener("scroll", onScroll, {passive: true}); onScroll();

  // light / dark, shared with every Vedic Space site (localStorage "vs-theme")
  var mq = window.matchMedia("(prefers-color-scheme: dark)");
  function effective(){ var t = document.documentElement.getAttribute("data-theme"); return t || (mq.matches ? "dark" : "light"); }
  function paint(){
    var m = effective(), label = m === "dark" ? "Switch to light mode" : "Switch to dark mode";
    document.querySelectorAll("[data-theme-toggle]").forEach(function(b){
      b.setAttribute("data-mode", m); b.setAttribute("aria-label", label); b.title = label; });
  }
  document.addEventListener("click", function(e){
    if (!e.target.closest("[data-theme-toggle]")) return;
    var next = effective() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("vs-theme", next); } catch(err) {}
    paint();
  });
  if (mq.addEventListener) mq.addEventListener("change", paint);
  paint();

  function esc(s){ return String(s == null ? "" : s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
  function getJSON(url){ return fetch(url, {cache: "no-cache"}).then(function(r){ if (!r.ok) throw new Error(r.status); return r.json(); }); }
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------------------------------------------------------------- index: each yātrā card shows its cover and counts
  document.querySelectorAll(".ycard[data-dir]").forEach(function(card){
    var dir = card.dataset.dir, counts = card.querySelector(".counts");
    Promise.all([getJSON(dir + "/photos.json").catch(function(){ return []; }),
                 getJSON(dir + "/videos.json").catch(function(){ return []; })]).then(function(r){
      var photos = r[0], videos = r[1].filter(function(v){ return v && v.id; });
      var cover = photos.filter(function(p){ return p.cover; })[0] || photos[0];
      if (cover) {                                    // photos live on media.vedicspace.in (full address) or beside the page
        var src = /^https?:\/\//.test(cover.thumb) ? cover.thumb : dir + "/" + cover.thumb;
        var c = card.querySelector(".cover"); c.style.backgroundImage = "url('" + src + "')"; c.innerHTML = "";
      }
      if (counts) counts.innerHTML =
        '<span><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-8 8"/></svg>' +
        (photos.length ? photos.length + " photos" : "Photos soon") + '</span>' +
        '<span><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3"/></svg>' +
        (videos.length ? videos.length + " videos" : "Videos soon") + '</span>';
    });
  });

  // ---------------------------------------------------------------- photos
  var grid = document.getElementById("photos");
  if (grid) getJSON("photos.json").then(function(photos){
    var count = document.getElementById("photo-count");
    if (!photos.length) { grid.outerHTML = '<p class="empty">Photos will appear here soon.</p>'; return; }
    if (count) count.textContent = photos.length + (photos.length === 1 ? " photo" : " photos");
    grid.innerHTML = photos.map(function(p, i){
      var wide = p.w && p.h && p.w / p.h > 1.9 ? " wide" : "";
      return '<button class="pcard' + wide + '" type="button" data-i="' + i + '" aria-label="Open photo ' + (i + 1) +
        (p.caption ? ": " + esc(p.caption) : "") + '"><img src="' + esc(p.thumb) + '" alt="' + esc(p.alt || p.caption || "") +
        '" loading="lazy" decoding="async"><span class="cap">' + esc(p.caption || "") + '</span></button>';
    }).join("");
    setupCarousel(photos);
  }).catch(function(){ grid.outerHTML = '<p class="empty">The photos could not be loaded. Please refresh the page.</p>'; });

  function setupCarousel(photos){
    var lb = document.getElementById("lb"), track = lb.querySelector(".lb-track"), cap = lb.querySelector(".lb-cap"),
        cnt = lb.querySelector(".lb-count"), dots = lb.querySelector(".lb-dots"),
        prev = lb.querySelector(".lb-prev"), next = lb.querySelector(".lb-next"), closeB = lb.querySelector(".lb-close");
    var idx = 0, last = null, N = photos.length;
    track.innerHTML = photos.map(function(p){ return '<div class="lb-slide"><img data-src="' + esc(p.full) + '" alt="' + esc(p.alt || p.caption || "") + '"></div>'; }).join("");
    var slides = track.children;
    dots.innerHTML = N <= 40 ? photos.map(function(){ return "<i></i>"; }).join("") : "";
    function load(i){ if (i < 0 || i >= N) return; var im = slides[i].querySelector("img"); if (!im.src) im.src = im.dataset.src; }
    function show(i, animate){
      idx = Math.max(0, Math.min(N - 1, i));
      track.style.transition = animate === false || reduce ? "none" : "";
      track.style.transform = "translateX(" + (-100 * idx) + "%)";
      load(idx); load(idx + 1); load(idx - 1);              // the photo shown and its neighbours
      cnt.textContent = (idx + 1) + " / " + N;
      cap.textContent = photos[idx].caption || "";
      prev.disabled = idx === 0; next.disabled = idx === N - 1;
      [].forEach.call(dots.children, function(d, k){ d.classList.toggle("on", k === idx); });
    }
    function open(i, from){
      last = from || null;
      lb.classList.add("open"); lb.setAttribute("aria-hidden", "false");
      document.body.classList.add("lb-lock");
      show(i, false);
      closeB.focus();
    }
    function close(){
      lb.classList.remove("open"); lb.setAttribute("aria-hidden", "true");
      document.body.classList.remove("lb-lock");
      if (last) last.focus();
    }
    grid.addEventListener("click", function(e){ var c = e.target.closest(".pcard"); if (c) open(+c.dataset.i, c); });
    prev.addEventListener("click", function(){ show(idx - 1); });
    next.addEventListener("click", function(){ show(idx + 1); });
    closeB.addEventListener("click", close);
    lb.querySelector(".lb-stage").addEventListener("click", function(e){ if (e.target.classList.contains("lb-slide")) close(); });
    document.addEventListener("keydown", function(e){
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") show(idx + 1);
      else if (e.key === "ArrowLeft") show(idx - 1);
      else if (e.key === "Tab") {                                  // keep focus inside the carousel
        var f = [closeB, prev, next].filter(function(b){ return !b.disabled && b.offsetParent; });
        var at = f.indexOf(document.activeElement);
        e.preventDefault(); f[(at + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    });
    // swipe: the photo follows the finger, then settles on the next or previous one
    var x0 = null, y0 = 0, dx = 0, horiz = null;
    lb.addEventListener("touchstart", function(e){ if (e.touches.length !== 1) { x0 = null; return; }
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; horiz = null; }, {passive: true});
    lb.addEventListener("touchmove", function(e){
      if (x0 === null) return;
      dx = e.touches[0].clientX - x0; var dy = e.touches[0].clientY - y0;
      if (horiz === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) horiz = Math.abs(dx) > Math.abs(dy);
      if (horiz) { track.style.transition = "none"; track.style.transform = "translateX(calc(" + (-100 * idx) + "% + " + dx + "px))"; }
    }, {passive: true});
    lb.addEventListener("touchend", function(){
      if (x0 === null) return;
      if (horiz && Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1)); else if (horiz) show(idx);
      else if (!horiz && Math.abs(dx) < 8) {}                       // a tap: leave as is
      x0 = null;
    });
  }

  // ---------------------------------------------------------------- videos
  var vgrid = document.getElementById("videos");
  if (vgrid) getJSON("videos.json").then(function(videos){
    videos = videos.filter(function(v){ return v && v.id; });
    var count = document.getElementById("video-count");
    if (!videos.length) { vgrid.outerHTML = '<p class="empty">Videos will appear here soon.</p>'; return; }
    if (count) count.textContent = videos.length + (videos.length === 1 ? " video" : " videos");
    vgrid.innerHTML = videos.map(function(v){
      return '<article class="vcard"><button class="frame" type="button" data-yt="' + esc(v.id) + '" aria-label="Play: ' + esc(v.title || "video") +
        '" style="background-image:url(\'https://i.ytimg.com/vi/' + encodeURIComponent(v.id) + '/hqdefault.jpg\')">' +
        '<span class="play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg></span></button>' +
        '<div class="vt"><h3>' + esc(v.title || "") + '</h3>' + (v.note ? '<p>' + esc(v.note) + '</p>' : '') + '</div></article>';
    }).join("");
    // the YouTube player loads only when a video is played: no requests to YouTube before that
    vgrid.addEventListener("click", function(e){
      var b = e.target.closest(".frame[data-yt]"); if (!b) return;
      var f = document.createElement("iframe");
      f.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(b.dataset.yt) + "?autoplay=1&rel=0";
      f.title = b.getAttribute("aria-label").replace(/^Play:\s*/, "");
      f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      f.allowFullscreen = true;
      var box = document.createElement("div"); box.className = "frame"; box.appendChild(f);
      b.replaceWith(box);
    });
  }).catch(function(){ vgrid.outerHTML = '<p class="empty">The videos could not be loaded. Please refresh the page.</p>'; });
})();
