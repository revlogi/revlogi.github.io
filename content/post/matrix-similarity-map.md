---
title: "Matrix Similarity Concept Map"
description: "An interactive concept map organizing eigenvalues, similarity invariants, and canonical forms"
publishDate: "19 November 2026"
tags: [math, linear-algebra]
---

I'm organizing my notes on eigenvalues, matrix similarity, and canonical forms, starting with this concept map to see how all the pieces connect.

I wrote them by hand and had Claude organize them for me. (It is way too good at this kind of stuff; GPT sucks).

<style>
.sim-map-embed {
  margin: 1.75rem 0;
  width: 100%;
}
@media (min-width: 40.0625rem) {
  .sim-map-embed {
    width: min(94vw, 1280px);
    max-width: none;
    margin-left: calc(50vw - min(47vw, 640px) - max(2ch, 50vw - 34ch));
  }
}
.sim-map-box {
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  background: #fff;
}
.sim-map-box iframe {
  display: block;
  width: 100%;
  height: 760px;
  border: 0;
}
.sim-map-embed figcaption {
  margin-top: 0.5rem;
  font-size: 0.88rem;
  color: var(--muted);
  text-align: right;
}
</style>

<figure class="sim-map-embed">
  <div class="sim-map-box">
    <iframe
      id="sim-map-frame"
      src="/embeds/similarity-map.html"
      title="Matrix Similarity Theory — Concept Map"
      loading="lazy"
    ></iframe>
  </div>
  <figcaption>
    <a href="/embeds/similarity-map.html" target="_blank" rel="noopener">Open full screen ↗</a>
  </figcaption>
</figure>

<script>
(() => {
  const frame = document.getElementById("sim-map-frame");
  if (!frame) return;
  let observer;
  const bind = () => {
    const map = frame.contentDocument && frame.contentDocument.getElementById("sim-map");
    if (!map) return;
    const resize = () => {
      frame.style.height = Math.ceil(map.getBoundingClientRect().height) + 4 + "px";
    };
    resize();
    if (observer) observer.disconnect();
    observer = new ResizeObserver(resize);
    observer.observe(map);
  };
  if (frame.contentDocument && frame.contentDocument.readyState === "complete") bind();
  frame.addEventListener("load", bind);
})();
</script>
