/* =========================================================
   GLOBAL STATE
========================================================= */
const state = { muted: false, audioCtx: null, unlocked: false };

function getCtx() {
  if (!state.audioCtx) {
    state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (state.audioCtx.state === "suspended") {
    state.audioCtx.resume();
  }
  return state.audioCtx;
}

/* =========================================================
   SOUND ENGINE — small synthesized chimes, no external files
========================================================= */
function playTone(
  freq,
  {
    duration = 0.9,
    type = "sine",
    gain = 0.06,
    delay = 0,
    glideTo = null,
  } = {},
) {
  if (state.muted) return;
  const ctx = getCtx();
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glideTo)
    osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + duration * 0.8);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + duration * 0.12);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

const chimeVariants = [
  () => {
    // tiny sparkle
    [1760, 2217, 2637].forEach((f, i) =>
      playTone(f, {
        duration: 0.5,
        type: "sine",
        gain: 0.045,
        delay: i * 0.045,
      }),
    );
  },
  () => {
    // soft bell
    playTone(880, { duration: 1.1, type: "triangle", gain: 0.05 });
    playTone(1320, { duration: 1.1, type: "sine", gain: 0.03, delay: 0.02 });
  },
  () => {
    // subtle heartbeat (two soft low thuds)
    playTone(120, { duration: 0.25, type: "sine", gain: 0.08 });
    playTone(110, { duration: 0.3, type: "sine", gain: 0.07, delay: 0.22 });
  },
  () => {
    // magical chime (ascending)
    [660, 990, 1320, 1760].forEach((f, i) =>
      playTone(f, { duration: 0.6, type: "sine", gain: 0.04, delay: i * 0.07 }),
    );
  },
  () => {
    // soft pop
    playTone(500, { duration: 0.18, type: "sine", gain: 0.07, glideTo: 900 });
  },
];
function playRandomChime() {
  chimeVariants[Math.floor(Math.random() * chimeVariants.length)]();
}

function playRisingShimmer() {
  if (state.muted) return;
  const ctx = getCtx();
  const t0 = ctx.currentTime;
  playTone(440, {
    duration: 1.6,
    type: "sine",
    gain: 0.05,
    glideTo: 880,
    delay: 0,
  });
  [1108, 1568, 2093].forEach((f, i) =>
    playTone(f, {
      duration: 1.2,
      type: "sine",
      gain: 0.028,
      delay: 0.15 + i * 0.09,
    }),
  );
}

function playMoonChime() {
  playTone(587, { duration: 2.2, type: "sine", gain: 0.045, glideTo: 1174 });
  playTone(880, { duration: 2.4, type: "triangle", gain: 0.02, delay: 0.3 });
}

/* sound toggle button */
const soundBtn = document.getElementById("sound-toggle");
const iconOn = document.getElementById("icon-on");
const iconOff = document.getElementById("icon-off");
soundBtn.addEventListener("click", () => {
  state.muted = !state.muted;
  iconOn.style.display = state.muted ? "none" : "block";
  iconOff.style.display = state.muted ? "block" : "none";
  if (!state.muted) getCtx();
});
document.body.addEventListener(
  "click",
  () => {
    if (!state.unlocked) {
      getCtx();
      state.unlocked = true;
    }
  },
  { once: true },
);

/* =========================================================
   BACKGROUND STARFIELD
========================================================= */
(function bgStars() {
  const canvas = document.getElementById("bg-stars");
  const ctx = canvas.getContext("2d");
  let w, h, stars;
  function resize() {
    w = canvas.width = window.innerWidth;
    h = window.innerHeight;
    canvas.height = h;
    const count = Math.floor((w * h) / 9000);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.3 + 0.2,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.015 + 0.004,
    }));
  }
  function tick(t) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#cfe4ff";
    stars.forEach((s) => {
      const tw = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
      ctx.globalAlpha = 0.15 + tw * 0.65;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(tick);
  }
  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(tick);
})();

/* =========================================================
   SECTION OBSERVER + DOT NAV
========================================================= */
const sections = Array.from(document.querySelectorAll(".page"));
const dots = Array.from(document.querySelectorAll(".dot"));
const scroller = document.getElementById("scroller");

const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && entry.intersectionRatio > 0.55) {
        entry.target.classList.add("in-view");
        dots.forEach((d) =>
          d.classList.toggle("active", d.dataset.target === entry.target.id),
        );
        onSectionEnter(entry.target.id);
      }
    });
  },
  { root: scroller, threshold: [0.55] },
);
sections.forEach((s) => io.observe(s));

dots.forEach((dot) => {
  dot.addEventListener("click", () => {
    document
      .getElementById(dot.dataset.target)
      .scrollIntoView({ behavior: "smooth" });
  });
});

function onSectionEnter(id) {
  if (id === "moon") startMoonReveal();
  if (id === "gallery") revealGallery();
  if (id === "constellation") startConstellation();
}

/* =========================================================
   PAGE 1 — HERO HEART (particle heart, pulsing)
========================================================= */
(function heartCanvas() {
  const canvas = document.getElementById("heart-canvas");
  const ctx = canvas.getContext("2d");
  let w, h, dpr;
  let points = [];

  function heartPoint(t) {
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y =
      13 * Math.cos(t) -
      5 * Math.cos(2 * t) -
      2 * Math.cos(3 * t) -
      Math.cos(4 * t);
    return { x, y: -y };
  }

  function resize() {
    dpr = window.devicePixelRatio || 1;
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildPoints();
  }

  function buildPoints() {
    points = [];
    const scale = Math.min(w, h) / 40;
    const cx = w / 2,
      cy = h / 2 - h * 0.03;
    const N = 260;
    for (let i = 0; i < N; i++) {
      const t = (i / N) * Math.PI * 2;
      const p = heartPoint(t);
      points.push({
        bx: cx + p.x * scale,
        by: cy + p.y * scale,
        jx: (Math.random() - 0.5) * 10,
        jy: (Math.random() - 0.5) * 10,
        r: Math.random() * 1.6 + 0.6,
        phase: Math.random() * Math.PI * 2,
      });
    }
    for (let i = 0; i < 70; i++) {
      const t = Math.random() * Math.PI * 2;
      const rad = Math.random() * 0.75;
      const p = heartPoint(t);
      points.push({
        bx: cx + p.x * scale * rad,
        by: cy + p.y * scale * rad,
        jx: (Math.random() - 0.5) * 6,
        jy: (Math.random() - 0.5) * 6,
        r: Math.random() * 1.1 + 0.3,
        phase: Math.random() * Math.PI * 2,
        inner: true,
      });
    }
  }

  function tick(t) {
    ctx.clearRect(0, 0, w, h);
    const pulse = 1 + 0.035 * Math.sin(t * 0.0018);
    const cx = w / 2,
      cy = h / 2 - h * 0.03;

    const grad = ctx.createRadialGradient(
      cx,
      cy,
      0,
      cx,
      cy,
      Math.min(w, h) * 0.42,
    );
    grad.addColorStop(0, "rgba(127,224,242,0.14)");
    grad.addColorStop(1, "rgba(127,224,242,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    points.forEach((p) => {
      const wob = Math.sin(t * 0.002 + p.phase);
      const x = cx + (p.bx - cx) * pulse + p.jx * wob * 0.4;
      const y = cy + (p.by - cy) * pulse + p.jy * wob * 0.4;
      const alpha = p.inner
        ? 0.35 + 0.25 * Math.sin(t * 0.003 + p.phase)
        : 0.55 + 0.35 * Math.sin(t * 0.0025 + p.phase);
      ctx.beginPath();
      ctx.fillStyle = `rgba(${p.inner ? 154 : 127}, ${p.inner ? 168 : 224}, ${p.inner ? 247 : 242}, ${alpha})`;
      ctx.shadowColor = "rgba(127,224,242,0.8)";
      ctx.shadowBlur = 8;
      ctx.arc(x, y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.strokeStyle = "rgba(127,224,242,0.18)";
    ctx.lineWidth = 1;
    const outline = points.filter((p) => !p.inner);
    outline.forEach((p, i) => {
      const wob = Math.sin(t * 0.002 + p.phase);
      const x = cx + (p.bx - cx) * pulse + p.jx * wob * 0.4;
      const y = cy + (p.by - cy) * pulse + p.jy * wob * 0.4;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();

    requestAnimationFrame(tick);
  }

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(tick);
})();

document.getElementById("enter-btn").addEventListener("click", () => {
  const hero = document.getElementById("hero");
  hero.classList.add("heart-expand");
  playRisingShimmer();
  setTimeout(() => {
    document.getElementById("moon").scrollIntoView({ behavior: "smooth" });
    setTimeout(() => hero.classList.remove("heart-expand"), 800);
  }, 750);
});

/* =========================================================
   PAGE 2 — MOON REVEAL
========================================================= */
let moonStarted = false;
function startMoonReveal() {
  if (moonStarted) return;
  moonStarted = true;
  const stage = document.getElementById("moon-stage");
  const canvas = document.getElementById("moon-cover");
  const orb = document.getElementById("moon-orb");
  const ctx = canvas.getContext("2d");
  const line = document.getElementById("moon-line");

  let w, h, dpr;
  function resize() {
    dpr = window.devicePixelRatio || 1;
    w = stage.clientWidth;
    h = stage.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#081226");
    g.addColorStop(1, "#0a1830");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  resize();

  const duration = 7000;
  const start = performance.now();
  const radius = Math.max(w, h) * 0.16;

  function pathPos(progress) {
    const rows = 4;
    const row = Math.floor(progress * rows);
    const rowProgress = progress * rows - row;
    const dir = row % 2 === 0 ? rowProgress : 1 - rowProgress;
    const x = dir * w;
    const y = (row / (rows - 1)) * h * 0.92 + h * 0.04;
    return { x, y };
  }

  function frame(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const pos = pathPos(progress);

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    const rg = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius);
    rg.addColorStop(0, "rgba(0,0,0,1)");
    rg.addColorStop(0.7, "rgba(0,0,0,0.9)");
    rg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = rg;
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fill();

    orb.style.left = `calc(${(pos.x / w) * 100}% - 23px)`;
    orb.style.top = `calc(${(pos.y / h) * 100}% - 23px)`;

    if (progress < 1) {
      requestAnimationFrame(frame);
    } else {
      orb.style.transition = "opacity 1.2s ease";
      orb.style.opacity = "0";
      line.classList.add("visible");
      playMoonChime();
    }
  }
  requestAnimationFrame(frame);
  window.addEventListener("resize", resize);
}

/* =========================================================
   PAGE 4 — THE FONNA EFFECT
========================================================= */
const letInBtn = document.getElementById("let-her-in");
const effectSection = document.getElementById("effect");
const effectResult = document.getElementById("effect-result");
let effectFired = false;

letInBtn.addEventListener("click", () => {
  if (effectFired) return;
  effectFired = true;
  letInBtn.classList.add("activated");
  effectSection.classList.add("env-glow");
  playRisingShimmer();

  const rect = letInBtn.getBoundingClientRect();
  const glyphs = ["♡", "✦", "✧", "☾", "♡"];
  for (let i = 0; i < 16; i++) {
    setTimeout(() => {
      const el = document.createElement("span");
      el.className = "burst-particle";
      el.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
      el.style.left =
        rect.left + rect.width / 2 + (Math.random() - 0.5) * 160 + "px";
      el.style.top =
        rect.top + rect.height / 2 + (Math.random() - 0.5) * 30 + "px";
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2300);
    }, i * 60);
  }

  setTimeout(() => {
    effectResult.classList.add("visible");
  }, 500);
});

/* =========================================================
   PAGE 5 — 100 REASONS
========================================================= */
const reasons = [
  "because you are my older sister, and somehow that has always meant more than just being family",
  "because you have always carried responsibilities bigger than you should have had to",
  "because you stayed strong through things most people never saw",
  "because behind all your strength, there is such a soft heart",
  "because you are one of the safest people I know",
  "because talking to you never feels like talking to just anyone",
  "because I can tell you things without worrying about being judged",
  "because somehow you always know when something is wrong",
  "because you make it easy to say what I'm actually feeling",
  "because your voice has a way of making everything feel a little better",

  "because I still remember how much it meant when you said you missed my voice",
  "because I miss hearing you too, more than I probably say",
  "because sometimes I don't need advice, I just need to hear you",
  "because your voice feels familiar in a way nothing else does",
  "because six years without seeing you somehow made me appreciate you even more",
  "because six years is a ridiculously long time to miss someone",
  "because after six years, seeing you again felt strangely natural",
  "because distance never managed to make you feel distant",
  "because we found each other again after all that time",
  "because even after finally seeing you again, I still miss you",

  "because you have always been there in your own quiet way",
  "because you care even when you don't make a big deal about it",
  "because you notice the little things",
  "because you remember things I don't expect you to remember",
  "because you listen even when you have your own things going on",
  "because you somehow make people feel heard",
  "because you make people feel safe enough to be themselves",
  "because you have a kindness that doesn't need attention",
  "because your heart is much softer than you sometimes let people see",
  "because you care deeply, even when you pretend you're fine",

  "because I am genuinely proud of the person you became",
  "because I know you had to grow up in ways that weren't always easy",
  "because you handled responsibilities that were bigger than us",
  "because you kept going even when things were difficult",
  "because you have strength without losing your softness",
  "because you can be strong and sensitive at the same time",
  "because you never needed to become cold to survive difficult things",
  "because you still choose kindness",
  "because you still care after everything you've carried",
  "because I hope you know that I see how much you've done",

  "because you're the kind of sister who feels like a second home",
  "because being your sibling is something I'm genuinely proud of",
  "because having an older sister like you feels like having someone to look up to",
  "because you've taught me things without always realizing you were teaching me",
  "because I can learn from the way you handle life",
  "because you make being the younger one feel a little safer",
  "because sometimes just knowing you're there is enough",
  "because you make family feel like more than just a word",
  "because you are one of the people I never want to take for granted",
  "because no matter how much time passes, you're still my sister",

  "because I love the way you care about the people you love",
  "because you give more of yourself than people probably realize",
  "because you have a heart that takes responsibility for everyone around you",
  "because you worry about people even when they don't know you're worrying",
  "because you want everyone to be okay",
  "because you make sure people feel cared for",
  "because you have a way of making ordinary conversations feel important",
  "because even a simple call from you can change my entire mood",
  "because sometimes a few minutes talking to you are all I need",
  "because I never get tired of hearing you talk",

  "because I miss the little conversations more than the big moments",
  "because I miss hearing what happened in your day",
  "because I miss being able to see you whenever I wanted",
  "because I miss the feeling of having you close",
  "because distance made me realize how valuable ordinary moments with you are",
  "because six years taught me that time doesn't make certain people less important",
  "because even after all that time, our bond still felt familiar",
  "because seeing you again made the years apart feel strangely small",
  "because now that we're apart again, I understand the meaning of missing someone",
  "because sometimes I wish distance worked a little differently",

  "because you are sensitive in the best possible way",
  "because you feel things deeply",
  "because you care deeply",
  "because you love deeply",
  "because your softness is one of the things I admire most about you",
  "because you don't have to be the strongest person in the room to be strong",
  "because you can make someone feel better without even trying",
  "because your presence can make a place feel warmer",
  "because you have a way of making people feel like they matter",
  "because you make people feel remembered",

  "because I can be completely myself when I'm talking to you",
  "because I don't need to choose my words perfectly with you",
  "because I know you will listen",
  "because sometimes you understand what I mean before I finish explaining",
  "because you are someone I can come back to",
  "because there are things I would rather tell you than anyone else",
  "because you make difficult conversations feel easier",
  "because you never feel like someone I have to impress",
  "because you are family, but also someone I genuinely enjoy talking to",
  "because I never want us to become strangers just because life gets busy",

  "because your happiness matters to me",
  "because I want life to be kind to you after everything you've carried",
  "because you deserve people who take care of you too",
  "because I hope you get the same comfort you give everyone else",
  "because I hope you know how loved you are",
  "because I hope you never doubt how important you are to me",
  "because I hope every year gives you more reasons to smile",
  "because I hope the future gives you everything you've worked so hard for",
  "because you deserve to be proud of yourself too",
  "because I will always be proud to call you my sister",

  "because no matter how far away you are, you still feel close",
  "because no amount of distance can change what you mean to me",
  "because no six years could erase our bond",
  "because hearing your voice can make the distance disappear for a moment",
  "because when you say 'I missed your voice', you probably don't know how much I miss yours",
  "because I would choose being your sibling in every universe",
  "because some people are family by blood, but you feel like home",
  "because you are one of the people I never want to lose touch with",
  "because wherever life takes us, you will always have a place in my life",
  "and simply — because you're Fonna, and 100 reasons still aren't enough",
];
const reasonsGrid = document.getElementById("reasons-grid");
const popup = document.getElementById("reason-popup");
const popupText = document.getElementById("reason-text");
let popupTimer = null;

reasons.forEach((text, i) => {
  const btn = document.createElement("button");
  btn.className = "reason-heart";
  btn.innerHTML = "♡";
  btn.setAttribute("aria-label", `Reason ${i + 1}`);
  btn.addEventListener("click", () => {
    btn.classList.add("opened");
    btn.classList.remove("pulse");
    void btn.offsetWidth;
    btn.classList.add("pulse");
    playRandomChime();
    popupText.textContent = text;
    popup.classList.add("visible");
    clearTimeout(popupTimer);
    popupTimer = setTimeout(() => popup.classList.remove("visible"), 3200);
  });
  reasonsGrid.appendChild(btn);
});

/* =========================================================
   PAGE 6 — GALLERY
========================================================= */
const galleryPhotos = [
  {
    src: "photos/WhatsApp Image 2026-08-17 at 1 9.27.45 PM.jpeg",
    caption: "a familiar kind of joy",
  },
  {
    src: "photos/WhatsApp Image 2026-08-17 at 2 9.28.21 PM.jpeg",
    caption: "somewhere by the water",
  },
  {
    src: "photos/WhatsApp Image 2026-08-17 at 3 9.28.27 PM.jpeg",
    caption: "city lights, late night",
  },
  {
    src: "photos/WhatsApp Image 2026-08-17 at 4 9.28.34 PM.jpeg",
    caption: "landing day",
  },
  {
    src: "photos/WhatsApp Image 2026-08-17 at 5 9.28.52 PM.jpeg",
    caption: "a good afternoon",
  },
  {
    src: "photos/WhatsApp Image 2026-08-17 at 8 9.33.42 PM.jpeg",
    caption: "always the fun aunt",
  },
  {
    src: "photos/WhatsApp Image 2026-08-17 at 9 9.34.08 PM.jpeg",
    caption: "wedding lights",
  },
  {
    src: "photos/WhatsApp Image 2026-08-17 at 9.27.02 PM.jpeg",
    caption: "another arrival, another hug",
  },
];
const galleryGrid = document.getElementById("gallery-grid");
galleryPhotos.forEach((p) => {
  const div = document.createElement("div");
  div.className = "gallery-item";
  div.innerHTML = `<img src="${p.src}" alt="${p.caption}" loading="lazy">`;
  galleryGrid.appendChild(div);
});
let galleryRevealed = false;
function revealGallery() {
  if (galleryRevealed) return;
  galleryRevealed = true;
  Array.from(galleryGrid.children).forEach((el, i) => {
    setTimeout(() => el.classList.add("visible"), i * 110);
  });
}

/* =========================================================
   TEXT-PARTICLE HELPER — sample points from rendered text
========================================================= */
function sampleTextPoints(text, w, h, fontSize, density = 4) {
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const octx = off.getContext("2d");
  octx.fillStyle = "#fff";
  octx.font = `italic 500 ${fontSize}px "Cormorant Garamond", serif`;
  octx.textAlign = "center";
  octx.textBaseline = "middle";
  octx.fillText(text, w / 2, h / 2);
  const data = octx.getImageData(0, 0, w, h).data;
  const pts = [];
  for (let y = 0; y < h; y += density) {
    for (let x = 0; x < w; x += density) {
      const alpha = data[(y * w + x) * 4 + 3];
      if (alpha > 120) pts.push({ x, y });
    }
  }
  return pts;
}

/* =========================================================
   PAGE 7 — CONSTELLATION
========================================================= */
let constellationStarted = false;
function startConstellation() {
  if (constellationStarted) return;
  constellationStarted = true;

  const canvas = document.getElementById("constellation-canvas");
  const ctx = canvas.getContext("2d");
  let w, h, dpr;

  function heartOutline(n) {
    const arr = [];
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = -(
        13 * Math.cos(t) -
        5 * Math.cos(2 * t) -
        2 * Math.cos(3 * t) -
        Math.cos(4 * t)
      );
      arr.push({ x, y });
    }
    return arr;
  }

  let decorStars = [],
    nameParticles = [],
    mouse = { x: -9999, y: -9999 };

  function resize() {
    dpr = window.devicePixelRatio || 1;
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  function build() {
    const cx = w / 2,
      cy = h / 2;
    const scale = Math.min(w, h) / 38;
    const outline = heartOutline(70);
    decorStars = outline.map((p) => ({
      tx: cx + p.x * scale,
      ty: cy + p.y * scale,
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.4 + 0.6,
      settled: false,
    }));
    for (let i = 0; i < 40; i++) {
      const ang = Math.random() * Math.PI * 2,
        rad = Math.min(w, h) * 0.5 * (0.55 + Math.random() * 0.55);
      decorStars.push({
        tx: cx + Math.cos(ang) * rad,
        ty: cy + Math.sin(ang) * rad * 0.8,
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.1 + 0.3,
        settled: false,
        deco: true,
      });
    }
    const pts = sampleTextPoints("Fonna", w, h, Math.min(w, h) * 0.16, 5);
    nameParticles = pts.map((p) => ({
      tx: p.x,
      ty: p.y,
      x: Math.random() * w,
      y: Math.random() * h,
      r: 1.1,
      settled: false,
    }));
  }

  const start = performance.now();
  function tick(now) {
    ctx.clearRect(0, 0, w, h);
    const elapsed = now - start;
    const progress = Math.min(elapsed / 3200, 1);
    const ease = 1 - Math.pow(1 - progress, 3);

    [...decorStars, ...nameParticles].forEach((p) => {
      p.x += (p.tx - p.x) * 0.06 * (0.4 + ease);
      p.y += (p.ty - p.y) * 0.06 * (0.4 + ease);

      const dx = p.x - mouse.x,
        dy = p.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 55) {
        p.x += (dx / dist) * (55 - dist) * 0.06;
        p.y += (dy / dist) * (55 - dist) * 0.06;
      }
    });

    ctx.fillStyle = "rgba(154,168,247,0.55)";
    decorStars.forEach((p) => {
      const tw = 0.5 + 0.5 * Math.sin(now * 0.002 + p.tx * 0.02);
      ctx.globalAlpha = 0.25 + tw * 0.55;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.shadowColor = "rgba(127,224,242,0.9)";
    ctx.shadowBlur = 6;
    ctx.fillStyle = `rgba(244,247,255,${0.55 + ease * 0.45})`;
    nameParticles.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    requestAnimationFrame(tick);
  }

  canvas.addEventListener("mousemove", (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  });
  canvas.addEventListener("mouseleave", () => {
    mouse.x = -9999;
    mouse.y = -9999;
  });

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(tick);
}
/* =========================================================
   BACKGROUND MUSIC
========================================================= */
const bgMusic = document.getElementById("bg-music");
bgMusic.volume = 0.25;

function tryPlayMusic() {
  if (state.muted) return;
  bgMusic.play().catch(() => {});
}

document.body.addEventListener("click", tryPlayMusic, { once: true });

soundBtn.addEventListener("click", () => {
  if (state.muted) {
    bgMusic.pause();
  } else {
    tryPlayMusic();
  }
});

/* =========================================================
   FINALE SEQUENCE
========================================================= */
const finaleHeart = document.getElementById("finale-heart");
const finaleCanvas = document.getElementById("finale-canvas");
const finaleText = document.getElementById("finale-text");
const finaleSection = document.getElementById("finale");
const restartBtn = document.getElementById("restart-btn");
let finaleFired = false;

finaleHeart.addEventListener("click", () => {
  if (finaleFired) return;
  finaleFired = true;
  finaleHeart.classList.add("grown");
  playRisingShimmer();
  finaleSection.classList.add("bloom");

  setTimeout(() => {
    finaleHeart.classList.add("hide");
    runFinaleParticles();
  }, 1500);
});

function runFinaleParticles() {
  const ctx = finaleCanvas.getContext("2d");
  let w, h, dpr;
  function resize() {
    dpr = window.devicePixelRatio || 1;
    w = finaleCanvas.clientWidth;
    h = finaleCanvas.clientHeight;
    finaleCanvas.width = w * dpr;
    finaleCanvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  const words = ["Afnan", "Fonna", "♡"];
  let wordIndex = 0;
  let particles = [];

  function setTarget(word) {
    const fontSize =
      word === "♡" ? Math.min(w, h) * 0.3 : Math.min(w, h) * 0.22;
    const pts = sampleTextPoints(word, w, h, fontSize, 4);
    if (particles.length === 0) {
      particles = pts.map((p) => ({
        x: w / 2 + (Math.random() - 0.5) * w * 1.4,
        y: h / 2 + (Math.random() - 0.5) * h * 1.4,
        tx: p.x,
        ty: p.y,
        r: 1.2,
      }));
    } else {
      particles.forEach((p, i) => {
        const target = pts[i % pts.length];
        p.tx = target.x;
        p.ty = target.y;
      });
      if (pts.length > particles.length) {
        for (let i = particles.length; i < pts.length; i++) {
          particles.push({
            x: w / 2,
            y: h / 2,
            tx: pts[i].x,
            ty: pts[i].y,
            r: 1.2,
          });
        }
      }
    }
  }

  setTarget(words[wordIndex]);
  playTone(660, { duration: 1.2, type: "sine", gain: 0.04, glideTo: 1320 });

  function advanceWord() {
    wordIndex++;
    if (wordIndex < words.length) {
      setTarget(words[wordIndex]);
      playRandomChime();
    }
  }
  setTimeout(advanceWord, 2200);
  setTimeout(advanceWord, 4400);

  let raf;
  function tick(now) {
    ctx.clearRect(0, 0, w, h);
    ctx.shadowColor = "rgba(127,224,242,0.9)";
    ctx.shadowBlur = 8;
    ctx.fillStyle = "#f4f7ff";
    particles.forEach((p) => {
      p.x += (p.tx - p.x) * 0.055;
      p.y += (p.ty - p.y) * 0.055;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;
    raf = requestAnimationFrame(tick);
  }
  tick();

  setTimeout(() => {
    cancelAnimationFrame(raf);
    ctx.clearRect(0, 0, w, h);
    runFinaleLines();
  }, 6800);
}

function runFinaleLines() {
  const lines = [
    "Some people are memories.",
    "Some people are moments.",
    "And some people become a part of your story.",
    "You are my universe, Fonna.",
    "Happy birthday.",
    "And this little universe will always have a place for you.",
    "♡",
  ];
  let i = 0;
  function showLine() {
    finaleText.classList.remove("visible");
    setTimeout(() => {
      finaleText.textContent = lines[i];
      finaleText.classList.add("visible");
      if (i === lines.length - 1) playRisingShimmer();
      else playTone(700 + i * 40, { duration: 0.9, gain: 0.03 });
      i++;
      if (i < lines.length) {
        setTimeout(showLine, 2200);
      } else {
        setTimeout(() => restartBtn.classList.add("visible"), 1400);
      }
    }, 400);
  }
  showLine();
}

restartBtn.addEventListener("click", () => {
  const wipe = document.createElement("div");
  wipe.className = "wipe";
  document.body.appendChild(wipe);
  requestAnimationFrame(() => wipe.classList.add("animate"));
  playRisingShimmer();
  setTimeout(() => {
    document.getElementById("hero").scrollIntoView({ behavior: "auto" });
  }, 500);
  setTimeout(() => {
    wipe.remove();
    finaleFired = false;
    finaleHeart.classList.remove("grown", "hide");
    finaleSection.classList.remove("bloom");
    finaleText.classList.remove("visible");
    finaleText.textContent = "";
    restartBtn.classList.remove("visible");
    const ctx = finaleCanvas.getContext("2d");
    ctx.clearRect(0, 0, finaleCanvas.width, finaleCanvas.height);
  }, 1300);
});
