/**
 * Animated Starfield — canvas-based, 90s Space Jam vibes
 * Draws stars at various sizes/speeds; occasionally pulses
 * neon-coloured "shooting stars" across the canvas.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('starfield-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const STAR_COUNT    = 220;
  const SHOOT_CHANCE  = 0.004;   // per frame probability of a new shooting star
  const NEON_COLORS   = ['#00cfff','#ff00cc','#39ff14','#ffe600','#ff6600','#cc00ff','#00ffe0'];

  let W, H, stars = [], shooters = [];

  // ── Star factory ──────────────────────────────────────
  function makeStar(init) {
    return {
      x:     Math.random() * (W || 800),
      y:     Math.random() * (H || 600),
      r:     Math.random() * 1.4 + 0.3,
      speed: Math.random() * 0.18 + 0.02,
      alpha: Math.random() * 0.6 + 0.25,
      twinkleSpeed: Math.random() * 0.02 + 0.005,
      twinkleDir: Math.random() > 0.5 ? 1 : -1,
    };
  }

  // ── Shooting star factory ─────────────────────────────
  function makeShooter() {
    const y = Math.random() * H * 0.7;
    return {
      x:     -40,
      y:     y,
      vx:    Math.random() * 6 + 4,
      vy:    Math.random() * 2 - 1,
      len:   Math.random() * 80 + 60,
      alpha: 1,
      color: NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)],
    };
  }

  // ── Resize handler ────────────────────────────────────
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  // ── Init ──────────────────────────────────────────────
  function init() {
    resize();
    stars = Array.from({ length: STAR_COUNT }, makeStar);
    window.addEventListener('resize', resize, { passive: true });
    requestAnimationFrame(loop);
  }

  // ── Main render loop ──────────────────────────────────
  function loop() {
    ctx.clearRect(0, 0, W, H);

    // ── Tiny star particles from bottom-up parallax ────
    for (const s of stars) {
      // twinkle
      s.alpha += s.twinkleSpeed * s.twinkleDir;
      if (s.alpha >= 0.85 || s.alpha <= 0.1) s.twinkleDir *= -1;

      // slow upward drift (parallax feel)
      s.y -= s.speed;
      if (s.y < 0) {
        s.x = Math.random() * W;
        s.y = H + 2;
      }

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,210,255,${s.alpha})`;
      ctx.fill();
    }

    // ── Shooting stars ─────────────────────────────────
    if (Math.random() < SHOOT_CHANCE) shooters.push(makeShooter());

    for (let i = shooters.length - 1; i >= 0; i--) {
      const sh = shooters[i];
      sh.x    += sh.vx;
      sh.y    += sh.vy;
      sh.alpha -= 0.018;

      if (sh.alpha <= 0 || sh.x > W + 60) {
        shooters.splice(i, 1);
        continue;
      }

      const grad = ctx.createLinearGradient(
        sh.x - sh.len, sh.y - sh.len * (sh.vy / sh.vx),
        sh.x, sh.y
      );
      const alphaHex = Math.round(sh.alpha * 255).toString(16).padStart(2, '0');
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(1, sh.color + alphaHex);

      ctx.beginPath();
      ctx.moveTo(sh.x - sh.len, sh.y - sh.len * (sh.vy / sh.vx));
      ctx.lineTo(sh.x, sh.y);
      ctx.strokeStyle = grad;
      ctx.lineWidth   = 2;
      ctx.stroke();

      // glow dot at head
      ctx.beginPath();
      ctx.arc(sh.x, sh.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = sh.color;
      ctx.globalAlpha = sh.alpha;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    requestAnimationFrame(loop);
  }

  init();
})();
