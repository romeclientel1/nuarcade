// script.js -------------------------------------------------------------
// Vespara public website. Intentionally minimal: no analytics, no
// trackers, no third-party requests, no build step. The only behavior
// here is the mobile navigation toggle and closing that menu when a link
// is chosen or focus/click moves outside it.

(function () {
  "use strict";

  var toggle = document.getElementById("nav-toggle");
  var nav = document.getElementById("primary-nav");

  if (!toggle || !nav) return;

  function openNav() {
    nav.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
  }

  function closeNav() {
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  }

  function isOpen() {
    return toggle.getAttribute("aria-expanded") === "true";
  }

  toggle.addEventListener("click", function () {
    if (isOpen()) {
      closeNav();
    } else {
      openNav();
    }
  });

  // Close after choosing a nav link (mobile).
  nav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      closeNav();
    });
  });

  // Close on Escape, return focus to the toggle.
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && isOpen()) {
      closeNav();
      toggle.focus();
    }
  });

  // Close if a click lands outside the header entirely.
  document.addEventListener("click", function (event) {
    if (!isOpen()) return;
    var header = document.querySelector(".site-header");
    if (header && !header.contains(event.target)) {
      closeNav();
    }
  });
})();
