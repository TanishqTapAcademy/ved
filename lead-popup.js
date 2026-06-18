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
    position:relative;overflow:hidden;padding:38px 34px;color:#fff;
    background:linear-gradient(160deg,#0a1322 0%,#102844 52%,#0d3a5c 100%);
  }
  .vlp-art::before{
    content:"";position:absolute;inset:0;opacity:.5;pointer-events:none;
    background:
      radial-gradient(420px 320px at 80% 8%,rgba(31,143,240,.45),transparent 60%),
      radial-gradient(380px 320px at 8% 96%,rgba(18,182,168,.4),transparent 60%);
  }
  .vlp-grid{
    position:absolute;inset:0;opacity:.4;pointer-events:none;
    background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),
      linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);
    background-size:34px 34px;
    -webkit-mask-image:radial-gradient(420px 380px at 65% 25%,#000 30%,transparent 78%);
    mask-image:radial-gradient(420px 380px at 65% 25%,#000 30%,transparent 78%);
  }
  .vlp-orb{position:absolute;border-radius:50%;filter:blur(2px);opacity:.85;pointer-events:none}
  .vlp-orb.o1{width:80px;height:80px;top:18%;right:-18px;background:radial-gradient(circle at 30% 30%,#33a4ff,#0a6fd0);animation:vlpFloat 7s ease-in-out infinite}
  .vlp-orb.o2{width:46px;height:46px;bottom:24%;right:30%;background:radial-gradient(circle at 30% 30%,#12b6a8,#0d8e83);animation:vlpFloat 9s ease-in-out infinite reverse}
  @keyframes vlpFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}

  .vlp-art-inner{position:relative;z-index:2;display:flex;flex-direction:column;height:100%}
  .vlp-badge{
    display:inline-flex;align-items:center;gap:8px;align-self:flex-start;
    background:rgba(18,182,168,.16);border:1px solid rgba(18,182,168,.4);color:#7ff0e4;
    padding:6px 13px;border-radius:99px;font-size:.7rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;
  }
  .vlp-badge .vlp-pulse{width:7px;height:7px;border-radius:50%;background:#12b6a8;box-shadow:0 0 0 0 rgba(18,182,168,.6);animation:vlpPulse 2.2s infinite}
  @keyframes vlpPulse{0%{box-shadow:0 0 0 0 rgba(18,182,168,.55)}70%{box-shadow:0 0 0 9px rgba(18,182,168,0)}100%{box-shadow:0 0 0 0 rgba(18,182,168,0)}}

  .vlp-illus{margin:22px 0 18px}
  .vlp-illus svg{width:118px;height:auto;display:block}

  .vlp-art h2{
    font-family:"Sora",system-ui,sans-serif;font-weight:800;letter-spacing:-.02em;line-height:1.1;
    font-size:1.62rem;margin:0 0 8px;
  }
  .vlp-art h2 .vlp-grad{background:linear-gradient(105deg,#33a4ff,#12b6a8);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
  .vlp-art p.vlp-sub{color:rgba(255,255,255,.72);font-size:.95rem;line-height:1.5;margin:0 0 18px}
  .vlp-list{list-style:none;margin:0 0 auto;padding:0;display:flex;flex-direction:column;gap:11px}
  .vlp-list li{display:flex;align-items:center;gap:11px;font-size:.9rem;color:rgba(255,255,255,.9)}
  .vlp-list .vlp-ck{flex:none;width:24px;height:24px;border-radius:7px;display:grid;place-items:center;background:linear-gradient(135deg,#1f8ff0,#0a6fd0)}
  .vlp-list .vlp-ck svg{width:13px;height:13px;color:#fff}
  .vlp-trust{display:flex;align-items:center;gap:9px;margin-top:22px;padding-top:18px;border-top:1px solid rgba(255,255,255,.1);font-size:.82rem;color:rgba(255,255,255,.7)}
  .vlp-trust svg{width:18px;height:18px;color:#12b6a8;flex:none}

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
    grid-column:1 / -1;margin-top:6px;display:inline-flex;align-items:center;justify-content:center;gap:9px;
    font:inherit;font-weight:800;font-size:1rem;color:#fff;cursor:pointer;border:none;padding:15px 22px;border-radius:13px;
    background:linear-gradient(105deg,#1f8ff0,#12b6a8);box-shadow:0 16px 34px -14px rgba(18,182,168,.75);
    transition:transform .25s cubic-bezier(.22,1,.36,1),box-shadow .25s ease,filter .25s ease;
  }
  .vlp-submit:hover{transform:translateY(-3px);box-shadow:0 22px 44px -14px rgba(18,182,168,.9);filter:brightness(1.05)}
  .vlp-submit:active{transform:translateY(0) scale(.98)}
  .vlp-submit svg{width:17px;height:17px}
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
    .vlp-illus{display:none}
    .vlp-art h2{font-size:1.35rem}
    .vlp-list li:nth-child(n+3){display:none}     /* keep it short on mobile */
    .vlp-trust{margin-top:16px;padding-top:14px}
    .vlp-form-wrap{padding:26px 22px 30px}
    .vlp-form{gap:12px}
  }
  @media (prefers-reduced-motion: reduce){
    #vlp-overlay,.vlp-card,.vlp-field,.vlp-success{transition:none!important;animation:none!important;opacity:1!important;transform:none!important}
    .vlp-orb,.vlp-badge .vlp-pulse,.vlp-tick svg{animation:none!important}
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
      <span class="vlp-grid"></span>
      <span class="vlp-orb o1"></span><span class="vlp-orb o2"></span>
      <div class="vlp-art-inner">
        <span class="vlp-badge"><span class="vlp-pulse"></span>Free Consultation</span>
        <div class="vlp-illus">
          <svg viewBox="0 0 140 110" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="vlpG1" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#33a4ff"/><stop offset="1" stop-color="#0a6fd0"/>
              </linearGradient>
              <linearGradient id="vlpG2" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#12b6a8"/><stop offset="1" stop-color="#0d8e83"/>
              </linearGradient>
            </defs>
            <!-- cloud -->
            <path d="M44 64a20 20 0 0 1 39-6 15 15 0 0 1 2 30H40a14 14 0 0 1-2-28c2 0 4 .5 6 1.3" fill="rgba(255,255,255,.10)" stroke="rgba(255,255,255,.5)" stroke-width="2"/>
            <!-- rising bars -->
            <rect x="52" y="62" width="9" height="18" rx="2.5" fill="url(#vlpG1)"/>
            <rect x="66" y="52" width="9" height="28" rx="2.5" fill="url(#vlpG2)"/>
            <rect x="80" y="44" width="9" height="36" rx="2.5" fill="url(#vlpG1)"/>
            <!-- spark -->
            <path d="M104 20l3.2 8.4L116 32l-8.8 3.6L104 44l-3.2-8.4L92 32l8.8-3.6z" fill="#ffd76a"/>
            <circle cx="34" cy="30" r="4" fill="#12b6a8"/>
          </svg>
        </div>
        <h2 id="vlp-title">Get more from <span class="vlp-grad">Salesforce.</span></h2>
        <p class="vlp-sub">Book a free, no-pressure call. We'll pinpoint what's worth fixing first  no commitment.</p>
        <ul class="vlp-list">
          <li><span class="vlp-ck"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 13l4 4L19 7"/></svg></span>Honest scoping in plain English</li>
          <li><span class="vlp-ck"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 13l4 4L19 7"/></svg></span>Revenue Cloud &amp; CPQ specialists</li>
          <li><span class="vlp-ck"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 13l4 4L19 7"/></svg></span>Fixed-scope, weeks not quarters</li>
        </ul>
        <div class="vlp-trust">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z"/><path d="M9 12l2 2 4-4"/></svg>
          Certified Salesforce Implementation Partner
        </div>
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
