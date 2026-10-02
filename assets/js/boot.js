/* Runs before first paint: enables motion styles unless the visitor prefers
   reduced motion, and falls back to static content if the animation
   libraries have not loaded within 3 seconds. */
(function (d) {
  d.classList.add("js");
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    d.classList.add("motion");
    setTimeout(function () { if (!window.__scReady) d.classList.remove("motion"); }, 3000);
  }
})(document.documentElement);
