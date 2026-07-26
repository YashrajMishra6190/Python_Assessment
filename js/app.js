/* Python Bridge Course — app.js
   Renders SITE_DATA into the page and wires up interactivity. */
(function () {
  "use strict";

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const data = typeof SITE_DATA !== "undefined" ? SITE_DATA : window.SITE_DATA;

  /* ---------------------------------------------------------------------
     1. Hero meta chips
  --------------------------------------------------------------------- */
  function renderHeroMeta() {
    const totalQuestions = data.experiments.reduce(
      (n, e) => n + e.blocks.filter((b) => b.type === "question").length,
      0
    );
    const totalCode = data.experiments.reduce(
      (n, e) => n + e.blocks.filter((b) => b.type === "code").length,
      0
    );
    const chips = [
      `${data.experiments.length} experiments`,
      `${totalQuestions} questions`,
      `${totalCode} runnable snippets`,
      "UPES · M.Tech CSE",
    ];
    $("#hero-meta").innerHTML = chips.map((c) => `<span class="chip">${c}</span>`).join("");
  }

  /* ---------------------------------------------------------------------
     2. Sidebar navigation
  --------------------------------------------------------------------- */
  function renderSidebar() {
    const nav = $("#exp-nav");
    nav.innerHTML = data.experiments
      .map((exp) => {
        const questions = exp.blocks.filter((b) => b.type === "question");
        const subitems = questions
          .map(
            (q) =>
              `<li><a href="#${exp.id}-q${q.qnum}" data-scrollspy-sub>Q${q.qnum}. ${questionShortTitle(q.html)}</a></li>`
          )
          .join("");
        return `
        <div class="exp-nav-item" data-exp-item="${exp.id}">
          <a class="exp-nav-link" href="#${exp.id}" data-scrollspy-main>
            <span class="num">${String(exp.number).padStart(2, "0")}</span>
            <span>${exp.title}</span>
          </a>
          <ul class="exp-subnav">${subitems}</ul>
        </div>`;
      })
      .join("");
  }

  function questionShortTitle(qHtml) {
    const div = document.createElement("div");
    div.innerHTML = qHtml;
    const h2 = div.querySelector("h2, h3");
    let txt = h2 ? h2.textContent.trim() : "Question";
    txt = txt.replace(/\s+/g, " ");
    if (txt.length > 46) txt = txt.slice(0, 44).trim() + "…";
    return escapeHtml(txt);
  }

  /* ---------------------------------------------------------------------
     3. Experiment content
  --------------------------------------------------------------------- */
  function renderBlock(exp, block, idx) {
    if (block.type === "note") {
      return `<div class="block note-card glass">${block.html}</div>`;
    }
    if (block.type === "question") {
      return `<div class="block question-card" id="${exp.id}-q${block.qnum}">
        <span class="q-badge">Question ${block.qnum}</span>
        ${block.html}
      </div>`;
    }
    if (block.type === "code") {
      return renderCodeBlock(exp, block, idx);
    }
    return "";
  }

  function renderCodeBlock(exp, block, idx) {
    const codeId = `${exp.id}-code-${idx}`;
    const codeEsc = escapeHtml(block.code.trim());
    let outputHtml = "";

    if (block.output) {
      outputHtml += `
        <div class="output-panel">
          <div class="output-label">Sample output</div>
          <pre>${escapeHtml(block.output)}</pre>
        </div>`;
    }
    if (block.html_tables && block.html_tables.length) {
      outputHtml += block.html_tables
        .map((t) => `<div class="output-panel"><div class="output-label">Result</div><div class="html-table-wrap">${t}</div></div>`)
        .join("");
    }
    if (block.images && block.images.length) {
      outputHtml += `
        <div class="output-panel">
          <div class="output-label">Generated plots</div>
          <div class="img-grid">
            ${block.images.map((src) => `<img src="${src}" loading="lazy" alt="Generated chart output" />`).join("")}
          </div>
        </div>`;
    }

    return `
      <div class="block code-card">
        <div class="code-toolbar">
          <span class="lang">python</span>
          <button class="copy-btn" data-copy-target="${codeId}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <span>Copy</span>
          </button>
        </div>
        <pre><code id="${codeId}" class="language-python">${codeEsc}</code></pre>
        ${outputHtml}
      </div>`;
  }

  function renderExperiments() {
    const root = $("#experiments-root");
    root.innerHTML = data.experiments
      .map((exp) => {
        const blocksHtml = exp.blocks.map((b, i) => renderBlock(exp, b, i)).join("");
        return `
        <section class="experiment" id="${exp.id}" data-exp-section="${exp.id}">
          <div class="experiment-head">
            <span class="exp-num">EXP ${String(exp.number).padStart(2, "0")}</span>
            <h2>${escapeHtml(exp.title)}</h2>
          </div>
          ${blocksHtml}
        </section>`;
      })
      .join("");
  }

  function renderSummary() {
    $("#summary-root").innerHTML = data.summary_html;
  }

  /* ---------------------------------------------------------------------
     3b. Wrap embedded tables so wide tables scroll instead of overflowing
  --------------------------------------------------------------------- */
  function wrapTables() {
    $$(".note-card table, .question-card table, .summary-block table").forEach((table) => {
      if (table.parentElement.classList.contains("table-scroll")) return;
      const wrap = document.createElement("div");
      wrap.className = "table-scroll";
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    });
  }

  /* ---------------------------------------------------------------------
     4. Syntax highlighting
  --------------------------------------------------------------------- */
  function highlightCode() {
    if (window.hljs) {
      $$("pre code.language-python").forEach((el) => window.hljs.highlightElement(el));
    }
  }

  /* ---------------------------------------------------------------------
     5. Copy-to-clipboard
  --------------------------------------------------------------------- */
  function wireCopyButtons() {
    document.body.addEventListener("click", (e) => {
      const btn = e.target.closest(".copy-btn");
      if (!btn) return;
      const target = document.getElementById(btn.dataset.copyTarget);
      if (!target) return;
      const text = target.textContent;
      navigator.clipboard.writeText(text).then(() => {
        btn.classList.add("copied");
        const label = btn.querySelector("span:last-child");
        const prev = label.textContent;
        label.textContent = "Copied!";
        setTimeout(() => {
          btn.classList.remove("copied");
          label.textContent = prev;
        }, 1400);
      });
    });
  }

  /* ---------------------------------------------------------------------
     6. Mobile sidebar
  --------------------------------------------------------------------- */
  function wireMobileNav() {
    const sidebar = $("#sidebar");
    const scrim = $("#sidebar-scrim");
    const toggle = $("#menu-toggle");
    const open = () => {
      sidebar.classList.add("open");
      scrim.classList.add("show");
    };
    const close = () => {
      sidebar.classList.remove("open");
      scrim.classList.remove("show");
    };
    toggle.addEventListener("click", () => {
      sidebar.classList.contains("open") ? close() : open();
    });
    scrim.addEventListener("click", close);
    sidebar.addEventListener("click", (e) => {
      if (e.target.closest("a")) close();
    });
  }

  /* ---------------------------------------------------------------------
     7. Progress bar + back-to-top + scrollspy
  --------------------------------------------------------------------- */
  function wireScrollEffects() {
    const progressBar = $("#progress-bar");
    const progressPct = $("#progress-pct");
    const progressFill = $("#progress-fill");
    const backToTop = $("#back-to-top");

    function onScroll() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0;
      progressBar.style.width = pct + "%";
      progressPct.textContent = Math.round(pct) + "%";
      progressFill.style.width = pct + "%";
      backToTop.classList.toggle("show", scrollTop > 500);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    backToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

    // scrollspy for experiment sections
    const sections = $$("[data-exp-section]");
    const navItems = $$("[data-exp-item]");
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.getAttribute("id");
          const navItem = navItems.find((n) => n.dataset.expItem === id);
          if (!navItem) return;
          if (entry.isIntersecting) {
            navItems.forEach((n) => n.classList.remove("active"));
            navItem.classList.add("active");
          }
        });
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 }
    );
    sections.forEach((s) => spy.observe(s));
  }

  /* ---------------------------------------------------------------------
     8. Search
  --------------------------------------------------------------------- */
  function wireSearch() {
    const input = $("#search-input");
    const countEl = $("#search-count");
    const emptyEl = $("#search-empty");
    let all = [];

    function index() {
      // snapshot pristine HTML once, before any highlighting ever touches the DOM
      all = $$(".block").map((el) => ({
        el,
        originalHTML: el.innerHTML,
        text: el.textContent.toLowerCase(),
      }));
    }

    // Wrap every case-insensitive occurrence of `q` in text nodes under `root`
    // with <mark class="hit">, skipping script/style/existing-mark nodes.
    function highlightIn(root, q) {
      if (!q) return 0;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const p = node.parentNode;
          if (!p || p.nodeName === "SCRIPT" || p.nodeName === "STYLE" || p.nodeName === "MARK") {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      });
      const targets = [];
      let node;
      while ((node = walker.nextNode())) {
        if (node.nodeValue.toLowerCase().includes(q)) targets.push(node);
      }
      let count = 0;
      const qEsc = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp("(" + qEsc + ")", "ig");
      targets.forEach((textNode) => {
        const parts = textNode.nodeValue.split(re);
        if (parts.length === 1) return;
        const frag = document.createDocumentFragment();
        parts.forEach((part, i) => {
          if (i % 2 === 1) {
            const mark = document.createElement("mark");
            mark.className = "hit";
            mark.textContent = part;
            frag.appendChild(mark);
            count++;
          } else if (part) {
            frag.appendChild(document.createTextNode(part));
          }
        });
        textNode.parentNode.replaceChild(frag, textNode);
      });
      return count;
    }

    function run(query) {
      const q = query.trim().toLowerCase();
      const sections = $$(".experiment");

      if (!q) {
        all.forEach(({ el, originalHTML }) => {
          el.innerHTML = originalHTML;
          el.classList.remove("search-hidden");
        });
        sections.forEach((s) => s.classList.remove("search-hidden"));
        countEl.textContent = "";
        emptyEl.style.display = "none";
        return;
      }

      let totalMatches = 0;
      const visibleSections = new Set();
      let firstMatchEl = null;

      all.forEach(({ el, originalHTML, text }) => {
        el.innerHTML = originalHTML; // reset before re-highlighting
        const hit = text.includes(q);
        el.classList.toggle("search-hidden", !hit);
        if (hit) {
          const n = highlightIn(el, q);
          totalMatches += n;
          const section = el.closest(".experiment");
          if (section) visibleSections.add(section);
          if (!firstMatchEl) firstMatchEl = el;
        }
      });

      sections.forEach((s) => s.classList.toggle("search-hidden", !visibleSections.has(s)));
      countEl.textContent = totalMatches
        ? `${totalMatches} match${totalMatches === 1 ? "" : "es"} in ${visibleSections.size} section${visibleSections.size === 1 ? "" : "s"}`
        : "";
      emptyEl.style.display = totalMatches ? "none" : "block";
      run.firstMatchEl = firstMatchEl;
    }

    index();
    let debounce;
    input.addEventListener("input", () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => run(input.value), 150);
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && run.firstMatchEl) {
        run.firstMatchEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });

    // "/" focuses search, Escape clears it
    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && document.activeElement !== input) {
        e.preventDefault();
        input.focus();
      }
      if (e.key === "Escape" && document.activeElement === input) {
        input.value = "";
        run("");
        input.blur();
      }
    });
  }

  /* ---------------------------------------------------------------------
     9. Theme toggle (persisted) + print button
  --------------------------------------------------------------------- */
  function wireTheme() {
    const root = document.documentElement;
    const toggle = $("#theme-toggle");
    toggle.addEventListener("click", () => {
      const current = root.getAttribute("data-theme") === "light" ? "light" : "dark";
      const next = current === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      try {
        localStorage.setItem("pbc-theme", next);
      } catch (e) {
        /* localStorage unavailable — theme just won't persist */
      }
    });
  }

  function wirePrint() {
    $("#print-btn").addEventListener("click", () => window.print());
  }

  /* ---------------------------------------------------------------------
     11. Handwritten-notes widget + PDF modal viewer
  --------------------------------------------------------------------- */
  function wireNotesWidget() {
    const fab = $("#notes-fab");
    const toggle = $("#notes-fab-toggle");
    const modal = $("#pdf-modal");
    const frame = $("#pdf-modal-frame");
    const PDF_SRC = "assets/handwritten.pdf";

    function openModal() {
      frame.src = PDF_SRC;
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }
    function closeModal() {
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      setTimeout(() => {
        if (!modal.classList.contains("open")) frame.src = "";
      }, 300);
    }

    toggle.addEventListener("click", () => fab.classList.toggle("open"));
    document.addEventListener("click", (e) => {
      if (!fab.contains(e.target)) fab.classList.remove("open");
    });

    $("#notes-view-btn").addEventListener("click", () => {
      fab.classList.remove("open");
      openModal();
    });
    $("#hero-notes-btn").addEventListener("click", openModal);
    $("#pdf-modal-close").addEventListener("click", closeModal);
    $("#pdf-modal-backdrop").addEventListener("click", closeModal);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("open")) closeModal();
    });
  }

  /* ---------------------------------------------------------------------
     12. Scroll-reveal animation for content blocks
  --------------------------------------------------------------------- */
  function wireScrollReveal() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const targets = $$(".note-card, .question-card, .code-card, .experiment-head");
    targets.forEach((el) => el.classList.add("reveal"));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );
    targets.forEach((el) => io.observe(el));
  }

  /* ---------------------------------------------------------------------
     13. Hero terminal — typewriter using the notebook's own first result
  --------------------------------------------------------------------- */
  function heroTerminal() {
    const body = $("#terminal-body");
    const firstExp = data.experiments[0];
    const firstCode = firstExp.blocks.find((b) => b.type === "code");
    const lines = [
      { type: "cmd", text: "python3 experiment_1.py" },
      { type: "out", text: firstCode ? firstCode.output.split("\n")[0] : "Python installation verified successfully." },
      { type: "out", text: firstCode ? (firstCode.output.split("\n")[1] || "") : "" },
      { type: "cmd", text: "echo 'Ready for 10 experiments, 76 questions.'" },
      { type: "out", text: "Ready for 10 experiments, 76 questions." },
    ].filter((l) => l.text);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      body.innerHTML = lines
        .map((l) =>
          l.type === "cmd"
            ? `<div><span class="prompt">&gt;&gt;&gt;</span> ${escapeHtml(l.text)}</div>`
            : `<div class="out">${escapeHtml(l.text)}</div>`
        )
        .join("");
      return;
    }

    let li = 0;
    function typeLine() {
      if (li >= lines.length) {
        body.insertAdjacentHTML("beforeend", `<span class="cursor"></span>`);
        return;
      }
      const line = lines[li];
      const div = document.createElement("div");
      if (line.type === "cmd") {
        div.innerHTML = `<span class="prompt">&gt;&gt;&gt;</span> <span class="typed"></span>`;
      } else {
        div.className = "out";
        div.innerHTML = `<span class="typed"></span>`;
      }
      body.appendChild(div);
      const typedEl = div.querySelector(".typed");
      let ci = 0;
      const speed = line.type === "cmd" ? 34 : 10;
      (function typeChar() {
        if (ci <= line.text.length) {
          typedEl.textContent = line.text.slice(0, ci);
          ci++;
          setTimeout(typeChar, speed);
        } else {
          li++;
          setTimeout(typeLine, line.type === "cmd" ? 260 : 420);
        }
      })();
    }
    typeLine();
  }

  /* ---------------------------------------------------------------------
     14. Button cursor-glow (pure delight, no functional impact)
  --------------------------------------------------------------------- */
  function wireButtonGlow() {
    document.addEventListener("pointermove", (e) => {
      const btn = e.target.closest && e.target.closest(".btn");
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      btn.style.setProperty("--mx", ((e.clientX - r.left) / r.width) * 100 + "%");
      btn.style.setProperty("--my", ((e.clientY - r.top) / r.height) * 100 + "%");
    });
  }

  /* ---------------------------------------------------------------------
     Init
  --------------------------------------------------------------------- */
  function init() {
    renderHeroMeta();
    renderSidebar();
    renderExperiments();
    renderSummary();
    wrapTables();
    highlightCode();
    wireCopyButtons();
    wireMobileNav();
    wireScrollEffects();
    wireSearch();
    wireTheme();
    wirePrint();
    wireNotesWidget();
    wireScrollReveal();
    wireButtonGlow();
    heroTerminal();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
