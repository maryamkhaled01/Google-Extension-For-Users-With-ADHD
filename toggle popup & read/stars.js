const canvas = document.getElementById("starCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    createStars(); // Recreate stars on resize
});

let stars = [];

// ⭐ Create Random Stars
function createStars() {
    stars = [];
    for (let i = 0; i < 150; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 3 + 1,
            speedY: Math.random() * 0.009 + 0.001, // Falls between 0.001 and 0.004 (slower)
            speedX: Math.random() * 0.2 - 0.1      // Drifts between -0.1 and 0.1 (less movement)            
        });
    }
}

// 🌠 Animate Falling Stars
function animateStars() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = "white";
        ctx.fill();

        // Move stars downward
        star.x += star.speedX;
        star.y += star.speedY;

        // Reset stars when they go off-screen
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    });

    requestAnimationFrame(animateStars);
}

createStars();
animateStars();

