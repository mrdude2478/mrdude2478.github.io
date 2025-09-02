// Starfield implementation for popup only
document.addEventListener('DOMContentLoaded', function() {
    // Function to initialize starfield
    function initStarfield() {
        const popup = document.getElementById('popup');
        if (!popup) return;
        
        // Remove existing canvas if any
        const existingCanvas = popup.querySelector('canvas');
        if (existingCanvas) {
            existingCanvas.remove();
        }
        
        const canvas = document.createElement('canvas');
        canvas.id = 'popup-starfield';
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.zIndex = '0'; // Behind content but above popup background
        canvas.style.borderRadius = '10px';
        
        // Find the popup-content to insert canvas inside it
        const popupContent = popup.querySelector('.popup-content');
        if (popupContent) {
            // Insert canvas as first child so it's behind everything
            popupContent.insertBefore(canvas, popupContent.firstChild);
            
            const ctx = canvas.getContext('2d');
            
            // Set initial size
            function resizeCanvas() {
                canvas.width = popupContent.clientWidth;
                canvas.height = popupContent.clientHeight;
            }
            resizeCanvas();
            
            // Star settings
            const stars = [];
            const starCount = 40; // Increased star count for better effect
            const maxDepth = 800;
            
            // Create stars
            for (let i = 0; i < starCount; i++) {
                stars.push({
                    x: Math.random() * canvas.width - canvas.width / 2,
                    y: Math.random() * canvas.height - canvas.height / 2,
                    z: Math.random() * maxDepth,
                    prevZ: maxDepth
                });
            }
            
            // Animation loop
            function animate() {
                // Clear with transparent background instead of gradient
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;
                
                for (let i = 0; i < stars.length; i++) {
                    const star = stars[i];
                    
                    // Store previous position for tail effect
                    star.prevX = (star.x / star.prevZ) * centerX + centerX;
                    star.prevY = (star.y / star.prevZ) * centerY + centerY;
                    star.prevZ = star.z;
                    
                    // Move star closer (simulates movement toward viewer)
                    star.z -= 2;
                    
                    // Reset star if it passes the viewer or goes out of bounds
                    if (star.z <= 0) {
                        star.x = Math.random() * canvas.width - canvas.width / 2;
                        star.y = Math.random() * canvas.height - canvas.height / 2;
                        star.z = maxDepth;
                        star.prevZ = maxDepth;
                        continue;
                    }
                    
                    // Calculate current position
                    const x = (star.x / star.z) * centerX + centerX;
                    const y = (star.y / star.z) * centerY + centerY;
                    
                    // Skip if out of bounds
                    if (x < 0 || x > canvas.width || y < 0 || y > canvas.height) {
                        continue;
                    }
                    
                    const r = (1 - star.z / maxDepth) * 2;
                    const alpha = Math.min(1, 1 - star.z / maxDepth + 0.5);
                    
                    // Draw star tail
                    if (star.prevZ !== maxDepth && star.prevZ > 0) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
                        ctx.lineWidth = r / 2;
                        ctx.moveTo(star.prevX, star.prevY);
                        ctx.lineTo(x, y);
                        ctx.stroke();
                    }
                    
                    // Draw star
                    ctx.beginPath();
                    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                    ctx.arc(x, y, r, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                requestAnimationFrame(animate);
            }
            
            // Start animation
            animate();
            
            // Reinitialize when popup opens
            popup.addEventListener('click', function() {
                resizeCanvas();
            });
        }
    }
    
    // Initialize when page loads
    initStarfield();
    
    // Reinitialize when popup opens (if your popup has a toggle)
    const aboutBtn = document.getElementById('aboutBtn');
    if (aboutBtn) {
        aboutBtn.addEventListener('click', function() {
            setTimeout(initStarfield, 50);
        });
    }
    
    // Reinitialize on window resize
    window.addEventListener('resize', initStarfield);
});