/*! Ask MLR embed — drop this one tag on any page (e.g. the current nopCommerce site):
 *  <script src="https://<your-deployment>/embed.js" defer></script>
 *  Optional attributes: data-label="Ask MLR" data-color="#d71920" data-position="right|left" data-product-sku="35HC220"
 */
(function () {
  if (window.__askMlrLoaded) return;
  window.__askMlrLoaded = true;
  var script = document.currentScript || (function () { var s = document.getElementsByTagName("script"); return s[s.length - 1]; })();
  var origin = (function () { try { return new URL(script.src).origin; } catch (e) { return ""; } })();
  var label = script.getAttribute("data-label") || "Ask MLR";
  var color = script.getAttribute("data-color") || "#d71920";
  var side = script.getAttribute("data-position") === "left" ? "left" : "right";
  var sku = script.getAttribute("data-product-sku") || "";
  var src = origin + "/embed" + (sku ? "?sku=" + encodeURIComponent(sku) : "");

  var style = document.createElement("style");
  style.textContent =
    ".askmlr-btn{position:fixed;bottom:20px;" + side + ":20px;z-index:2147483000;display:flex;align-items:center;gap:8px;padding:12px 18px 12px 14px;border:0;border-radius:999px;background:" + color + ";color:#fff;font:700 15px/1 Arial,Helvetica,sans-serif;letter-spacing:.04em;text-transform:uppercase;box-shadow:0 12px 32px -8px rgba(0,0,0,.45);cursor:pointer}" +
    ".askmlr-btn:hover{filter:brightness(.92)}" +
    ".askmlr-btn svg{width:20px;height:20px}" +
    ".askmlr-frame{position:fixed;bottom:0;" + side + ":0;z-index:2147483001;width:100vw;height:100dvh;border:0;background:#f7f5f0;box-shadow:0 20px 60px -12px rgba(0,0,0,.5)}" +
    "@media(min-width:640px){.askmlr-frame{bottom:20px;" + side + ":20px;width:420px;height:min(720px,88vh);border-radius:16px}}" +
    ".askmlr-hidden{display:none !important}";
  document.head.appendChild(style);

  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "askmlr-btn";
  btn.setAttribute("aria-label", "Open " + label + " chat");
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span></span>';
  btn.querySelector("span").textContent = label;

  var frame = null;
  function open() {
    if (!frame) {
      frame = document.createElement("iframe");
      frame.className = "askmlr-frame";
      frame.title = label;
      frame.src = src;
      frame.setAttribute("allow", "clipboard-write");
      document.body.appendChild(frame);
    }
    frame.classList.remove("askmlr-hidden");
    btn.classList.add("askmlr-hidden");
  }
  function close() {
    if (frame) frame.classList.add("askmlr-hidden");
    btn.classList.remove("askmlr-hidden");
  }
  btn.addEventListener("click", open);
  window.addEventListener("message", function (e) {
    if (origin && e.origin !== origin) return;
    if (e.data && e.data.type === "askmlr:close") close();
  });
  window.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  window.AskMLR = { open: open, close: close };
  document.body.appendChild(btn);
})();
