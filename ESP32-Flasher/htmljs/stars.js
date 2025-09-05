    // Starfield implementation
    document.addEventListener('DOMContentLoaded', function() {
        const canvas = document.createElement('canvas');
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.zIndex = '-1';
        document.body.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        // Star settings
        const stars = [];
        const starCount = 32;
        const maxDepth = 800;
        
        // Create stars
        for (let i = 0; i < starCount; i++) {
            stars.push({
                x: Math.random() * canvas.width - canvas.width / 2,
                y: Math.random() * canvas.height - canvas.height / 2,
                z: Math.random() * maxDepth,
                prevZ: 0
            });
        }
        
        // Animation loop
        function animate() {
            // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgb(5, 4, 69)');
    gradient.addColorStop(0.3, 'rgb(0, 0, 0)');
    gradient.addColorStop(0.8, 'rgb(0, 0, 0)');
    gradient.addColorStop(1, 'rgb(5, 4, 69)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            
            for (let i = 0; i < stars.length; i++) {
                const star = stars[i];
                
                // Store previous position for tail effect
                star.prevX = (star.x / star.prevZ) * centerX + centerX;
                star.prevY = (star.y / star.prevZ) * centerY + centerY;
                star.prevZ = star.z;
                
                // Move star closer (simulates movement toward viewer)
                star.z -= 1.2;
                
                // Reset star if it passes the viewer
                if (star.z <= 0) {
                    star.x = Math.random() * canvas.width - canvas.width / 2;
                    star.y = Math.random() * canvas.height - canvas.height / 2;
                    star.z = maxDepth;
                    star.prevZ = maxDepth;
                }
                
                // Calculate current position
                const x = (star.x / star.z) * centerX + centerX;
                const y = (star.y / star.z) * centerY + centerY;
                const r = (1 - star.z / maxDepth) * 2;
                
                // Draw star tail (optional)
                if (star.prevZ !== maxDepth) {
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(255, 255, 255, ${1 - star.z / maxDepth})`;
                    ctx.lineWidth = r / 2;
                    ctx.moveTo(star.prevX, star.prevY);
                    ctx.lineTo(x, y);
                    ctx.stroke();
                }
                
                // Draw star
                ctx.beginPath();
                ctx.fillStyle = 'white';
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fill();
            }
            
            requestAnimationFrame(animate);
        }
        
        // Handle window resize
        window.addEventListener('resize', function() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        });
        
        // Start animation
        animate();
    });