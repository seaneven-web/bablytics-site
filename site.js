/* Bablytics Guide — site.js (vanilla, no deps). Budget: < 25 KB.
   theme (3-state) · drawer · TOC scroll-spy · search · copy buttons · lightbox
   · external links · "Open the app" · prev/next keys · single-file hash router */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement, body = doc.body;
  var SINGLE = root.hasAttribute("data-single");
  var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var THEME_KEY = "bablytics-guide-theme";
  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
  function on(el, ev, fn, o) { if (el) el.addEventListener(ev, fn, o); }

  /* ---------- theme: stored "day" | "night" | nothing (= follow system) ---------- */
  var sysDark = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  function systemTheme() { return sysDark && sysDark.matches ? "night" : "day"; }
  function effectiveTheme() { return root.getAttribute("data-theme") || systemTheme(); }
  function applyTheme(t) {
    if (t) root.setAttribute("data-theme", t); else root.removeAttribute("data-theme");
    var b = $("#theme-toggle");
    if (b) {
      var eff = effectiveTheme();
      b.setAttribute("aria-label", "Theme: " + eff + (t ? "" : " (system)") + " — switch to " + (eff === "day" ? "night" : "day"));
      b.title = b.getAttribute("aria-label");
    }
  }
  function initTheme() {
    var stored = null;
    try { stored = localStorage.getItem(THEME_KEY); } catch (e) {}
    applyTheme(stored === "day" || stored === "night" ? stored : null);
    on($("#theme-toggle"), "click", function () {
      var next = effectiveTheme() === "day" ? "night" : "day";
      // choosing the system's own preference clears the override (back to 3rd state)
      var store = next === systemTheme() ? null : next;
      try { if (store) localStorage.setItem(THEME_KEY, store); else localStorage.removeItem(THEME_KEY); } catch (e) {}
      applyTheme(store);
    });
    if (sysDark && sysDark.addEventListener) sysDark.addEventListener("change", function () { applyTheme(root.getAttribute("data-theme") || null); });
  }

  /* ---------- sidebar drawer ---------- */
  function initDrawer() {
    var btn = $(".nav-toggle"), side = $("#sidebar");
    if (!btn || !side) return;
    var bd = doc.createElement("div"); bd.className = "drawer-backdrop"; body.appendChild(bd);
    function setOpen(v) { body.classList.toggle("nav-open", v); btn.setAttribute("aria-expanded", v ? "true" : "false"); if (v) { var f = side.querySelector("a, summary"); if (f) f.focus(); } }
    on(btn, "click", function () { setOpen(!body.classList.contains("nav-open")); });
    on(bd, "click", function () { setOpen(false); });
    on($(".drawer-close", side), "click", function () { setOpen(false); btn.focus(); });
    on(side, "click", function (e) { if (e.target.closest("a")) setOpen(false); });
    on(doc, "keydown", function (e) { if (e.key === "Escape" && body.classList.contains("nav-open")) setOpen(false); });
    // remember collapsed groups
    $$("details", side).forEach(function (d) {
      var k = "bg-nav-" + (d.dataset.group || "");
      try { var v = localStorage.getItem(k); if (v === "0" && !d.querySelector('[aria-current="page"]')) d.open = false; } catch (e) {}
      on(d, "toggle", function () { try { localStorage.setItem(k, d.open ? "1" : "0"); } catch (e) {} });
    });
  }

  /* ---------- TOC + scroll-spy ---------- */
  var spy = null;
  // h3s inside components (cards, timelines, member tiles, callouts…) are item labels, not page structure
  var TOC_SKIP = ".cards,.card,.timeline,.tl-item,.os-cards,.os-card,.members,.member,.callout,.callout-note,.callout-warn,.callout-rule,.tip,.pager";
  function tocHeads(page) { return $$(".article h2[id], .article h3[id]", page).filter(function (h) { return h.tagName === "H2" || !h.closest(TOC_SKIP); }); }
  function buildToc(page) {
    var toc = $("#toc"); if (!toc) return;
    var heads = tocHeads(page);
    if (spy) { spy.disconnect(); spy = null; }
    if (!heads.length) { toc.innerHTML = ""; return; }
    var html = '<h2>On this page</h2><ul>';
    heads.forEach(function (h) {
      var id = h.id, txt = h.textContent.replace(/\s*#\s*$/, "").trim();
      var href = SINGLE ? "#/" + page.dataset.slug + "/" + id.replace(page.dataset.slug + "--", "") : "#" + id;
      html += '<li class="l' + h.tagName[1] + '"><a href="' + href + '">' + esc(txt) + '</a></li>';
    });
    html += '</ul><a class="top" href="' + (SINGLE ? "#/" + page.dataset.slug : "#top") + '">↑ Back to top</a>';
    toc.innerHTML = html;
    initSpy(page, heads);
  }
  function initSpy(page, heads) {
    var links = {}; $$("#toc a[href]").forEach(function (a) { var id = a.getAttribute("href").split("/").pop().replace(/^#/, ""); links[id] = a; });
    var active = null;
    function mark(id) {
      if (active) active.classList.remove("active");
      var key = SINGLE ? id.replace(page.dataset.slug + "--", "") : id;
      active = links[key] || null; if (active) active.classList.add("active");
    }
    if (!("IntersectionObserver" in window)) return;
    var visible = {};
    spy = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) { visible[e.target.id] = e.isIntersecting; });
      var first = null;
      for (var i = 0; i < heads.length; i++) { if (visible[heads[i].id]) { first = heads[i]; break; } }
      if (!first) { // none visible: the last heading above the fold
        var top = 80;
        for (var j = 0; j < heads.length; j++) { if (heads[j].getBoundingClientRect().top < top) first = heads[j]; }
      }
      if (first) mark(first.id);
    }, { rootMargin: "-70px 0px -60% 0px", threshold: [0, 1] });
    heads.forEach(function (h) { spy.observe(h); });
  }
  function initTocStatic() {
    var page = $(".page.current") || $(".page"); if (!page) return;
    if ($("#toc") && !$("#toc").children.length) buildToc(page);
    else initSpy(page, tocHeads(page));
  }

  /* ---------- search ---------- */
  var index = null, loading = null;
  function loadIndex() {
    if (index) return Promise.resolve(index);
    if (loading) return loading;
    var inline = $("#search-index");
    if (inline) { try { var j = JSON.parse(inline.textContent); index = j.pages || j; } catch (e) { index = []; } return Promise.resolve(index); }
    var base = (doc.querySelector('meta[name="site-root"]') || {}).content || "";
    loading = fetch(base + "search-index.json").then(function (r) { return r.json(); }).then(function (j) { index = j.pages || j; return index; }).catch(function () { index = []; return index; });
    return loading;
  }
  function tokens(q) { return q.toLowerCase().split(/[^a-z0-9]+/).filter(function (t) { return t.length > 1; }); }
  function search(q) {
    var toks = tokens(q); if (!toks.length) return [];
    var out = [];
    index.forEach(function (p) {
      var title = (p.title || "").toLowerCase(), score = 0, best = null, bestScore = 0;
      toks.forEach(function (t) { if (title.indexOf(t) >= 0) score += 12; if ((p.summary || "").toLowerCase().indexOf(t) >= 0) score += 3; });
      (p.sections || []).forEach(function (s) {
        var h = (s.h || "").toLowerCase(), txt = (s.t || "").toLowerCase(), sc = 0, hits = 0;
        toks.forEach(function (t) { if (h.indexOf(t) >= 0) { sc += 6; hits++; } else if (txt.indexOf(t) >= 0) { sc += 2; hits++; } });
        if (hits === toks.length) sc += 4;
        if (sc > bestScore) { bestScore = sc; best = s; }
        score += sc;
      });
      if (score > 0) out.push({ p: p, s: best, score: score + (best && tokens(best.h || "").length ? 0 : 0) });
    });
    out.sort(function (a, b) { return b.score - a.score; });
    return out.slice(0, 8);
  }
  function snippet(text, toks) {
    var low = text.toLowerCase(), at = -1;
    for (var i = 0; i < toks.length && at < 0; i++) at = low.indexOf(toks[i]);
    var start = Math.max(0, at - 60), s = (start ? "…" : "") + text.slice(start, start + 160) + (start + 160 < text.length ? "…" : "");
    return esc(s).replace(new RegExp("(" + toks.map(reEsc).join("|") + ")", "ig"), "<mark>$1</mark>");
  }
  function reEsc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function initSearch() {
    var input = $("#search-input"), list = $("#search-results"); if (!input || !list) return;
    var cur = -1, items = [];
    function close() { list.hidden = true; list.innerHTML = ""; cur = -1; items = []; input.setAttribute("aria-expanded", "false"); }
    function render(q) {
      var res = search(q), toks = tokens(q);
      if (!res.length) { list.innerHTML = '<li class="sr-empty">No matches for “' + esc(q) + '”.</li>'; list.hidden = false; items = []; return; }
      list.innerHTML = res.map(function (r) {
        var url = SINGLE ? "#/" + r.p.slug + (r.s && r.s.id ? "/" + r.s.id : "") : r.p.url + (r.s && r.s.id ? "#" + r.s.id : "");
        var where = r.s && r.s.h && r.s.h !== r.p.title ? " › " + esc(r.s.h) : "";
        return '<li role="option"><a href="' + url + '"><div class="sr-title">' + esc(r.p.title) + '<small>' + esc(r.p.group || "") + where + '</small></div><div class="sr-snip">' + snippet(r.s ? r.s.t : (r.p.summary || ""), toks) + '</div></a></li>';
      }).join("");
      list.hidden = false; cur = -1; items = $$("li[role=option]", list); input.setAttribute("aria-expanded", "true");
    }
    var t = null;
    on(input, "input", function () { var q = input.value.trim(); clearTimeout(t); if (q.length < 2) { close(); return; } loadIndex().then(function () { t = setTimeout(function () { render(q); }, 80); }); });
    on(input, "focus", function () { loadIndex(); if (input.value.trim().length >= 2) render(input.value.trim()); });
    on(input, "keydown", function (e) {
      if (e.key === "Escape") { close(); input.blur(); return; }
      if (!items.length) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault(); if (cur >= 0) items[cur].classList.remove("active");
        cur = (cur + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length; items[cur].classList.add("active"); items[cur].scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter") { e.preventDefault(); go(); }
    });
    // Enter / the mobile keyboard's "Go": open the highlighted (else first) result; read the href before close() empties the list
    function go() { var li = items[cur >= 0 ? cur : 0], a = li && li.querySelector("a"); if (!a) return; var href = a.getAttribute("href"); close(); location.assign(href); }
    on(input.form, "submit", function (e) { e.preventDefault(); if (items.length) go(); });
    on(doc, "click", function (e) { if (!e.target.closest(".search")) close(); });
    on(doc, "keydown", function (e) {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey && !/^(INPUT|TEXTAREA|SELECT)$/.test(doc.activeElement.tagName) && !doc.activeElement.isContentEditable) { e.preventDefault(); input.focus(); input.select(); }
    });
    on(list, "click", function (e) { if (e.target.closest("a")) close(); });
  }

  /* ---------- copy buttons ---------- */
  function initCopy() {
    $$("pre").forEach(function (pre) {
      if (pre.querySelector(".copy")) return;
      var b = doc.createElement("button"); b.type = "button"; b.className = "copy"; b.textContent = "Copy"; b.setAttribute("aria-label", "Copy code");
      on(b, "click", function () {
        var code = pre.querySelector("code"), txt = (code || pre).innerText.replace(/\n?Copy$/, "");
        function done() { b.textContent = "Copied"; b.classList.add("done"); setTimeout(function () { b.textContent = "Copy"; b.classList.remove("done"); }, 1500); }
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () { legacy(txt); done(); });
        else { legacy(txt); done(); }
      });
      pre.appendChild(b);
    });
    function legacy(txt) { var ta = doc.createElement("textarea"); ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0"; body.appendChild(ta); ta.select(); try { doc.execCommand("copy"); } catch (e) {} body.removeChild(ta); }
  }

  /* ---------- lightbox ---------- */
  function initLightbox() {
    var dlg = $("#lightbox"); if (!dlg || !dlg.showModal) return;
    var img = $("img", dlg), cap = $("figcaption", dlg);
    on(doc, "click", function (e) {
      var t = e.target.closest("figure.shot:not(.missing) img, a.zoom");
      if (!t) return;
      var src = t.tagName === "A" ? t.getAttribute("href") : (t.currentSrc || t.src);
      if (!src) return;
      e.preventDefault();
      img.src = src; img.alt = t.alt || "";
      var fc = t.closest("figure") && t.closest("figure").querySelector("figcaption");
      cap.textContent = fc ? fc.textContent : (t.alt || "");
      dlg.showModal();
    });
    on(dlg, "click", function (e) { if (e.target === dlg || e.target.closest(".close")) dlg.close(); });
    on(dlg, "close", function () { img.removeAttribute("src"); });
  }

  /* ---------- misc: external links, Open-the-app, prev/next keys ---------- */
  function initMisc() {
    $$('a[href^="http://"], a[href^="https://"]').forEach(function (a) {
      if (a.host === location.host) return;
      a.rel = (a.rel ? a.rel + " " : "") + "noopener noreferrer"; if (!a.target) a.target = "_blank"; a.classList.add("ext");
    });
    var open = $(".open-app");
    if (open && /^\/about(\/|$)/.test(location.pathname)) open.hidden = false;
    on(doc, "keydown", function (e) {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      var a = e.key === "ArrowRight" ? $(".page:not([hidden]) .pager a.next") : e.key === "ArrowLeft" ? $(".page:not([hidden]) .pager a.prev") : null;
      if (a) { e.preventDefault(); a.click(); }
    });
  }

  /* ---------- single-file hash router: #/<slug> or #/<slug>/<anchor> ---------- */
  function initRouter() {
    var pages = $$(".page[data-slug]"); if (!pages.length) return;
    var bySlug = {}; pages.forEach(function (p) { bySlug[p.dataset.slug] = p; });
    var navLinks = $$("#sidebar a[href^='#/']"), lastSlug = null;
    try { history.scrollRestoration = "manual"; } catch (e) {}
    function route(scroll) {
      var h = location.hash.replace(/^#\/?/, ""), parts = h.split("/"), slug = parts[0] || "home", anchor = parts.slice(1).join("/");
      var page = bySlug[slug] || bySlug.home || pages[0]; slug = page.dataset.slug;
      var samePage = slug === lastSlug; lastSlug = slug;
      pages.forEach(function (p) { var cur = p === page; p.hidden = !cur; p.classList.toggle("current", cur); });
      body.classList.toggle("is-home", slug === "home");
      navLinks.forEach(function (a) { var is = a.getAttribute("href") === "#/" + slug; if (is) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
      var cur = $("#sidebar a[aria-current=page]"); if (cur) { var d = cur.closest("details"); if (d) d.open = true; }
      doc.title = (page.dataset.title ? page.dataset.title + " · " : "") + "Bablytics Guide";
      buildToc(page);
      if (scroll !== false) {
        // a page switch jumps instantly (animating across a brand-new page is noise);
        // only same-page anchor hops scroll smoothly
        var behave = samePage && !REDUCED ? "smooth" : "instant";
        var target = anchor ? doc.getElementById(slug + "--" + anchor) : null;
        if (target) target.scrollIntoView({ behavior: behave, block: "start" });
        else window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }
      body.classList.remove("nav-open");
    }
    if (!location.hash) { try { history.replaceState(null, "", "#/home"); } catch (e) {} }
    on(window, "hashchange", function () { route(true); });
    route(true);
  }

  function init() {
    initTheme(); initDrawer(); initSearch(); initCopy(); initLightbox(); initMisc();
    if (SINGLE) initRouter(); else initTocStatic();
  }
  if (doc.readyState === "loading") on(doc, "DOMContentLoaded", init); else init();
})();
