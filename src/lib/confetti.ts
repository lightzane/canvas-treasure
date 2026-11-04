import confetti from "canvas-confetti";

export function birthdayConfetti(duration = 15) {
  const colors = [
    "#ff6b9d", // Pink
    "#ffd93d", // Yellow
    "#6bcbff", // Sky Blue
    "#b28dff", // Purple
    "#6ee7b7", // Mint
    "#ffaa5c", // Orange
    "#ff5c5c", // Red
    "#ffffff", // White
  ];

  const end = Date.now() + duration * 1_000;
  let stop = false;

  const { left, right } = getCanvasBounds();
  const y = 0.75;

  // IIFE = immediately-invoked function expression.
  // It runs immediately and doesn't pollute the outer scope with any variables.
  const iife = (function frame() {
    confetti({
      particleCount: colors.length, // 2 means only the 1st and 2nd colors indexes will be used
      angle: 60,
      spread: 55,
      origin: { x: left, y },
      colors,
      startVelocity: 60,
    });
    confetti({
      particleCount: colors.length, // change to '3' to include all 3 colors
      angle: 120,
      spread: 55,
      origin: { x: right, y },
      colors,
      startVelocity: 60,
    });
    if (Date.now() < end && !stop) requestAnimationFrame(frame);
    return () => (stop = true); // "Stop" callback to end the confetti animation when called.
  })();

  return iife;
}

function getCanvasBounds() {
  const canvas = document.getElementById("treasure") as HTMLCanvasElement;
  const rect = canvas.getBoundingClientRect();
  const viewportWidth = window.innerWidth;

  return {
    left: rect.left / viewportWidth,
    right: rect.right / viewportWidth,
  };
}
