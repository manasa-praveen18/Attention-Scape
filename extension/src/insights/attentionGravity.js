import { getPlatformInfo } from "../utils/platform.js";

function cleanDomain(domain) {
  return domain.replace(/^www\./, "");
}

function getPlanetColor(domain) {
  const info = getPlatformInfo(domain);

  const colors = {
    search: "#3b82f6",
    video: "#8b5cf6",
    knowledge: "#22c55e",
    development: "#22c55e",
    community: "#f97316",
    social: "#ef4444",
    professional: "#06b6d4",
    unknown: "#a78bfa"
  };

  return colors[info.type] || colors.unknown;
}

function getPlanetRadius(share, index) {
  const base = Math.sqrt(share) * 110;
  return Math.max(24, Math.min(base + (index === 0 ? 20 : 0), 85));
}

function createPlanetData(attentionShares, width, height) {
  const cx = width / 2;
  const cy = height / 2;

  return attentionShares.slice(0, 8).map((item, index) => {
    const angle = index === 0
    ? 0
    : (Math.PI * 2 * index) / Math.max(attentionShares.length - 1, 1);
    const maxOrbit = Math.min(width, height) / 2 - 120;
    const orbitBase = index === 0 ? 0 : Math.min(120 + index * 70, maxOrbit);

    return {
      domain: getDisplayName(cleanDomain(item.domain)),
      color: getPlanetColor(item.domain),
      share: item.share,
      timeMs: item.timeMs,
      radius: getPlanetRadius(item.share, index),
      orbitRadius: index === 0 ? 0 : orbitBase,
      angle,
      speed: 0.001 + index * 0.00035,
      x: index === 0 ? cx : cx + Math.cos(angle) * orbitBase,
      y: index === 0 ? cy : cy + Math.sin(angle) * orbitBase
    };
  });
}

function drawGlow(ctx, x, y, radius, color) {
  const gradient = ctx.createRadialGradient(
    x,
    y,
    radius * 0.2,
    x,
    y,
    radius * 1.8
  );

  gradient.addColorStop(0, color + "66");
  gradient.addColorStop(1, color + "00");

  ctx.beginPath();
  ctx.fillStyle = gradient;
  ctx.arc(x, y, radius * 1.8, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlanet(ctx, planet) {
  const glowStrength = planet.orbitRadius === 0 ? 2.8 : 1.8;
  drawGlow(ctx, planet.x, planet.y, planet.radius * glowStrength, planet.color);

  ctx.beginPath();
  ctx.fillStyle = planet.color;
  ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 1.2;
  ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#eef2ff";
  ctx.font = "600 13px Arial";
  ctx.textAlign = "center";
  ctx.fillText(planet.domain, planet.x, planet.y + 4);

  ctx.fillStyle = "#c4b5fd";
  ctx.font = "12px Arial";
  ctx.fillText(`${(planet.share * 100).toFixed(1)}%`, planet.x, planet.y + 20);
}

function drawOrbit(ctx, cx, cy, orbitRadius) {
  if (orbitRadius <= 0) return;

  ctx.beginPath();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
  ctx.lineWidth = 1;
  ctx.arc(cx, cy, orbitRadius, 0, Math.PI * 2);
  ctx.stroke();
}

function drawStars(ctx, stars) {
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";

  for (const star of stars) {
    ctx.globalAlpha = star.alpha;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}
function getDisplayName(domain) {
  const map = {
    "youtube.com": "YouTube",
    "google.com": "Google",
    "leetcode.com": "LeetCode",
    "khaleejtimes.com": "Khaleej Times"
  };

  return map[domain] || domain.replace(".com", "");
}

export function renderAttentionGravityMap(canvas, attentionShares) {
  if (!canvas) return;
  if (!attentionShares || attentionShares.length === 0) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const cx = width / 2;
  const cy = height / 2;

  const stars = Array.from({ length: 120 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 1.4,
    alpha: Math.random()
  }));

  const planets = createPlanetData(attentionShares, width, height);

  function animate() {
    ctx.clearRect(0, 0, width, height);
    drawStars(ctx, stars);

    for (const planet of planets) {
      drawOrbit(ctx, cx, cy, planet.orbitRadius);
    }

    for (const planet of planets) {
      if (planet.orbitRadius > 0) {
        planet.angle += planet.speed;
        planet.x = cx + Math.cos(planet.angle) * planet.orbitRadius;
        planet.y = cy + Math.sin(planet.angle) * planet.orbitRadius;
      } else {
        planet.x = cx;
        planet.y = cy;
      }

      drawPlanet(ctx, planet);
    }

    requestAnimationFrame(animate);
  }

  animate();
}