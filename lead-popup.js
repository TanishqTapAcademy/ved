/* ============================================================================
   VedSphere — timed lead-capture popup
   Self-contained: injects its own styles + markup, no dependencies.
   Behaviour:
     • appears after 10s on the page
     • shows at most once per browser session (dismiss/close remembers)
     • never shows again once the form is submitted (localStorage)
   Salesforce Web-to-Lead form is posted to a hidden iframe so the visitor
   stays on the page and sees an in-modal success state.
   ========================================================================== */
(function () {
  "use strict";

  // Don't run if already submitted in the past, or already seen this session.
  try {
    if (localStorage.getItem("vlp_submitted") === "1") return;
    if (sessionStorage.getItem("vlp_seen") === "1") return;
  } catch (e) {/* storage blocked — still show, just won't persist */}

  var DELAY_MS = 10000;
  var reduce = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ----------------------------------------------------------------------- */
  /* Styles                                                                  */
  /* ----------------------------------------------------------------------- */
  var css = `
  #vlp-overlay{
    position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;
    padding:20px;background:rgba(7,14,26,.62);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
    opacity:0;transition:opacity .4s ease;font-family:"Plus Jakarta Sans",system-ui,-apple-system,sans-serif;
  }
  #vlp-overlay.vlp-open{opacity:1}
  #vlp-overlay *{box-sizing:border-box}
  .vlp-card{
    position:relative;display:grid;grid-template-columns:minmax(0,.92fr) minmax(0,1.08fr);
    width:min(900px,100%);max-height:92vh;overflow:hidden;border-radius:26px;background:#fff;
    box-shadow:0 40px 120px -30px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.06);
    transform:translateY(26px) scale(.94);opacity:0;
    transition:transform .55s cubic-bezier(.22,1,.36,1),opacity .45s ease;
  }
  #vlp-overlay.vlp-open .vlp-card{transform:none;opacity:1}

  /* close */
  .vlp-close{
    position:absolute;top:14px;right:14px;z-index:5;width:38px;height:38px;border:none;cursor:pointer;
    border-radius:50%;background:rgba(255,255,255,.14);color:#fff;display:grid;place-items:center;
    backdrop-filter:blur(4px);transition:transform .25s ease,background .25s ease;
  }
  .vlp-close:hover{background:rgba(255,255,255,.28);transform:rotate(90deg)}
  .vlp-close svg{width:18px;height:18px}
  @media(max-width:720px){.vlp-close{background:rgba(10,19,34,.5)}}

  /* ---- visual panel ---- */
  .vlp-art{
    position:relative;overflow:hidden;padding:42px 36px;color:#fff;
    display:flex;flex-direction:column;justify-content:center;
    background:linear-gradient(165deg,#0a1322,#152741);
  }
  .vlp-art::before{
    content:"";position:absolute;inset:0;pointer-events:none;
    background:
      radial-gradient(420px 320px at 80% 10%,rgba(31,143,240,.3),transparent 60%),
      radial-gradient(360px 300px at 10% 90%,rgba(18,182,168,.22),transparent 60%);
  }
  .vlp-art-inner{position:relative;z-index:2}
  .vlp-eyebrow{
    font-weight:700;font-size:.74rem;letter-spacing:.18em;text-transform:uppercase;color:#12b6a8;
  }
  .vlp-art h2{
    font-family:"Sora",system-ui,sans-serif;font-weight:800;letter-spacing:-.02em;line-height:1.2;
    font-size:1.6rem;color:#fff;margin:14px 0 12px;
  }
  .vlp-art p.vlp-sub{color:rgba(255,255,255,.7);font-size:.92rem;line-height:1.5;margin:0 0 22px}
  .vlp-point{display:flex;gap:10px;align-items:flex-start;margin-bottom:13px;font-size:.86rem;color:rgba(255,255,255,.82)}
  .vlp-point svg{width:17px;height:17px;flex:none;margin-top:2px;color:#12b6a8}

  /* ---- form panel ---- */
  .vlp-form-wrap{padding:40px 36px;overflow-y:auto}
  .vlp-form-wrap h3{font-family:"Sora",system-ui,sans-serif;font-weight:800;font-size:1.42rem;letter-spacing:-.02em;color:#0a1322;margin:0 0 5px}
  .vlp-form-wrap .vlp-lede{color:#475569;font-size:.92rem;line-height:1.5;margin:0 0 22px}
  .vlp-form{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  .vlp-field{display:flex;flex-direction:column;gap:6px;opacity:0;transform:translateY(10px);animation:vlpFieldIn .5s cubic-bezier(.22,1,.36,1) forwards}
  .vlp-field.vlp-full{grid-column:1 / -1}
  .vlp-field label{font-size:.74rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#64748b}
  .vlp-field input{
    width:100%;font:inherit;font-size:.95rem;color:#0a1322;background:#f5f7fb;
    border:1.5px solid #e6ebf3;border-radius:11px;padding:12px 14px;transition:border-color .2s ease,box-shadow .2s ease,background .2s ease;
  }
  .vlp-field input::placeholder{color:#9aa7b8}
  .vlp-field input:focus{outline:none;background:#fff;border-color:#12b6a8;box-shadow:0 0 0 4px rgba(18,182,168,.15)}
  @keyframes vlpFieldIn{to{opacity:1;transform:none}}

  .vlp-submit{
    grid-column:1 / -1;margin-top:6px;display:inline-flex;align-items:center;justify-content:center;gap:8px;
    font:inherit;font-weight:700;font-size:.95rem;color:#fff;cursor:pointer;border:none;padding:14px 22px;border-radius:99px;
    background:linear-gradient(105deg,#1f8ff0,#0a6fd0);box-shadow:0 16px 32px -14px rgba(31,143,240,.7);
    transition:transform .25s ease,box-shadow .25s ease;
  }
  .vlp-submit:hover{transform:translateY(-2px);box-shadow:0 20px 38px -14px rgba(31,143,240,.85)}
  .vlp-submit:active{transform:translateY(0) scale(.98)}
  .vlp-submit svg{width:18px;height:18px}
  .vlp-fine{grid-column:1 / -1;margin:4px 0 0;font-size:.74rem;color:#94a3b8;line-height:1.4;text-align:center}

  /* ---- success ---- */
  .vlp-success{display:none;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:48px 36px;min-height:340px}
  .vlp-success.vlp-on{display:flex;animation:vlpFieldIn .5s ease forwards}
  .vlp-tick{width:84px;height:84px;border-radius:50%;display:grid;place-items:center;margin-bottom:20px;
    background:linear-gradient(135deg,#12b6a8,#0d8e83);box-shadow:0 18px 40px -14px rgba(18,182,168,.7)}
  .vlp-tick svg{width:40px;height:40px;color:#fff;stroke-dasharray:48;stroke-dashoffset:48;animation:vlpDraw .6s .15s ease forwards}
  @keyframes vlpDraw{to{stroke-dashoffset:0}}
  .vlp-success h3{font-family:"Sora",system-ui,sans-serif;font-weight:800;font-size:1.5rem;color:#0a1322;margin:0 0 8px}
  .vlp-success p{color:#475569;font-size:.95rem;line-height:1.55;max-width:340px;margin:0}

  /* ---- responsive ---- */
  @media(max-width:720px){
    #vlp-overlay{padding:0;align-items:flex-end}
    .vlp-card{grid-template-columns:1fr;width:100%;max-height:96vh;border-radius:24px 24px 0 0;
      transform:translateY(60px);}
    .vlp-art{padding:26px 24px 22px}
    .vlp-art h2{font-size:1.35rem}
    .vlp-form-wrap{padding:26px 22px 30px}
    .vlp-form{gap:12px}
  }
  @media (prefers-reduced-motion: reduce){
    #vlp-overlay,.vlp-card,.vlp-field,.vlp-success{transition:none!important;animation:none!important;opacity:1!important;transform:none!important}
    .vlp-tick svg{animation:none!important}
  }
  `;

  /* ----------------------------------------------------------------------- */
  /* Markup                                                                  */
  /* ----------------------------------------------------------------------- */
  var html = `
  <div class="vlp-card" role="dialog" aria-modal="true" aria-labelledby="vlp-title">
    <button class="vlp-close" type="button" aria-label="Close">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
    </button>

    <!-- visual panel -->
    <aside class="vlp-art">
      <div class="vlp-art-inner">
        <span class="vlp-eyebrow">Free Discovery Call</span>
        <h2 id="vlp-title">Stuck with messy CPQ pricing or quoting?</h2>
        <p class="vlp-sub">Tell us a bit about your setup and we'll get back to you within 1 business day, with no obligation and no sales pressure.</p>
        <div class="vlp-point"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>30-min call with a Revenue Cloud &amp; CPQ specialist</div>
        <div class="vlp-point"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>Honest scoping, we'll tell you what's worth fixing first</div>
        <div class="vlp-point"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>No commitment required</div>
      </div>
    </aside>

    <!-- form panel -->
    <div class="vlp-form-wrap">
      <h3>Talk to an expert</h3>
      <p class="vlp-lede">Tell us where to reach you  we'll be in touch within one business day.</p>
      <form class="vlp-form" action="https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8&orgId=00DdN00000d7k2r" method="POST" target="vlp-sink">
        <input type="hidden" name="oid" value="00DdN00000d7k2r">
        <input type="hidden" name="retURL" value="https://vedsphere.com/?lead=thanks">
        <div class="vlp-field" style="animation-delay:.05s">
          <label for="vlp-first">First name</label>
          <input id="vlp-first" name="first_name" type="text" maxlength="40" placeholder="Jane">
        </div>
        <div class="vlp-field" style="animation-delay:.1s">
          <label for="vlp-last">Last name</label>
          <input id="vlp-last" name="last_name" type="text" maxlength="80" placeholder="Doe" required>
        </div>
        <div class="vlp-field vlp-full" style="animation-delay:.15s">
          <label for="vlp-email">Work email</label>
          <input id="vlp-email" name="email" type="email" maxlength="80" placeholder="jane@company.com" required>
        </div>
        <div class="vlp-field" style="animation-delay:.2s">
          <label for="vlp-mobile">Mobile</label>
          <input id="vlp-mobile" name="mobile" type="tel" maxlength="40" placeholder="+1 555 000 0000">
        </div>
        <div class="vlp-field" style="animation-delay:.25s">
          <label for="vlp-company">Company</label>
          <input id="vlp-company" name="company" type="text" maxlength="40" placeholder="Acme Inc." required>
        </div>
        <button class="vlp-submit" type="submit">
          Book my free call
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </button>
        <p class="vlp-fine">No spam. We'll only use your details to contact you about your enquiry.</p>
      </form>

      <!-- success state -->
      <div class="vlp-success">
        <div class="vlp-tick">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>
        </div>
        <h3>You're all set!</h3>
        <p>Thanks for reaching out  one of our Salesforce experts will get back to you within one business day.</p>
      </div>
    </div>
  </div>
  <iframe name="vlp-sink" title="form target" style="display:none" aria-hidden="true"></iframe>
  `;

  /* ----------------------------------------------------------------------- */
  /* Boot                                                                    */
  /* ----------------------------------------------------------------------- */
  function build() {
    var style = document.createElement("style");
    style.id = "vlp-style";
    style.textContent = css;
    document.head.appendChild(style);

    var overlay = document.createElement("div");
    overlay.id = "vlp-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = html;
    document.body.appendChild(overlay);

    var card = overlay.querySelector(".vlp-card");
    var form = overlay.querySelector(".vlp-form");
    var success = overlay.querySelector(".vlp-success");
    var submitted = false;

    function open() {
      try { sessionStorage.setItem("vlp_seen", "1"); } catch (e) {}
      overlay.setAttribute("aria-hidden", "false");
      // force reflow so the transition runs
      void overlay.offsetWidth;
      overlay.classList.add("vlp-open");
      document.documentElement.style.overflow = "hidden";
      var first = overlay.querySelector("#vlp-first");
      if (first && !("ontouchstart" in window)) setTimeout(function(){ first.focus(); }, 450);
    }

    function close() {
      overlay.classList.remove("vlp-open");
      document.documentElement.style.overflow = "";
      setTimeout(function () {
        overlay.setAttribute("aria-hidden", "true");
        if (submitted) overlay.remove();
      }, 420);
    }

    overlay.querySelector(".vlp-close").addEventListener("click", close);
    overlay.addEventListener("mousedown", function (e) {
      if (e.target === overlay) close();           // backdrop click
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.classList.contains("vlp-open")) close();
    });

    form.addEventListener("submit", function () {
      // let the real POST go to the hidden iframe, then show success
      submitted = true;
      try { localStorage.setItem("vlp_submitted", "1"); } catch (e) {}
      form.style.display = "none";
      var lede = overlay.querySelector(".vlp-lede");
      var h3 = overlay.querySelector(".vlp-form-wrap > h3");
      if (lede) lede.style.display = "none";
      if (h3) h3.style.display = "none";
      success.classList.add("vlp-on");
    });

    // arm the timer
    setTimeout(open, DELAY_MS);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
