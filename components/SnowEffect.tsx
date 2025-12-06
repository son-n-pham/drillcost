import React, { useEffect, useRef } from 'react';

// Snowflake interface definition
interface Snowflake {
  x: number;
  y: number;
  radius: number;
  speed: number;
  wind: number;
  opacity: number;
  type: 'simple' | 'complex';
  angle: number;
  spinSpeed: number;
  tilt: number;       // For 3D rotation simulation
  tiltSpeed: number;  // Speed of the flip/tumble
}

const SnowEffect: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Snowflakes configuration
    const snowflakes: Snowflake[] = [];
    
    // Drastically reduced count for less distraction
    const getParticleCount = () => Math.floor(window.innerWidth / 25);

    const createSnowflake = (isInitial: boolean = false): Snowflake => {
        const isComplex = Math.random() < 0.05; // 5% chance of being a detailed flake
        
        return {
          x: Math.random() * canvas.width,
          y: isInitial ? Math.random() * canvas.height : -20,
          radius: isComplex ? (Math.random() * 5 + 6) : (Math.random() * 2 + 1),
          speed: Math.random() * 0.5 + 0.2, 
          wind: Math.random() * 0.5 - 0.25,
          opacity: isComplex ? Math.random() * 0.4 + 0.5 : Math.random() * 0.5 + 0.2,
          type: isComplex ? 'complex' : 'simple',
          angle: Math.random() * Math.PI * 2,
          spinSpeed: (Math.random() - 0.5) * 0.02,
          tilt: Math.random() * Math.PI, // Random initial tilt
          tiltSpeed: (Math.random() * 0.02) + 0.01, // Gentle tumbling speed
        };
    };

    // Initialize
    const count = getParticleCount();
    for (let i = 0; i < count; i++) {
      snowflakes.push(createSnowflake(true));
    }

    // Helper to draw a complex 6-branch snowflake with 3D feel
    const drawComplexSnowflake = (ctx: CanvasRenderingContext2D, flake: Snowflake) => {
        ctx.save();
        ctx.translate(flake.x, flake.y);
        
        // Apply 3D rotation simulation
        // 1. Rotate in 2D plane
        ctx.rotate(flake.angle);
        
        // 2. Simulate 3D flip by scaling along Y axis based on tilt cosine
        // We use Math.abs(Math.cos(flake.tilt)) as the scale factor to show it flipping
        // We limit the minimum scale to 0.1 so it doesn't completely disappear (becomes a thin line)
        const scaleY = Math.cos(flake.tilt);
        ctx.scale(1, scaleY);

        ctx.globalAlpha = flake.opacity;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';

        // Draw 6 branches
        for (let i = 0; i < 6; i++) {
            ctx.rotate(Math.PI / 3);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, flake.radius);
            ctx.stroke();

            // Add little details to branches
            if (flake.radius > 8) {
                ctx.beginPath();
                ctx.moveTo(0, flake.radius * 0.6);
                ctx.lineTo(flake.radius * 0.25, flake.radius * 0.8);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(0, flake.radius * 0.6);
                ctx.lineTo(-flake.radius * 0.25, flake.radius * 0.8);
                ctx.stroke();
            }
        }
        ctx.restore();
    };

    // Animation loop
    let animationFrameId: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      snowflakes.forEach((flake) => {
        if (flake.type === 'complex') {
            drawComplexSnowflake(ctx, flake);
        } else {
            ctx.fillStyle = `rgba(255, 255, 255, ${flake.opacity})`;
            ctx.beginPath();
            ctx.moveTo(flake.x, flake.y);
            ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
            ctx.fill();
        }
      });
      
      update();
      animationFrameId = requestAnimationFrame(draw);
    };

    const update = () => {
      snowflakes.forEach((flake) => {
        flake.y += flake.speed;
        flake.x += flake.wind;
        flake.angle += flake.spinSpeed;
        flake.tilt += flake.tiltSpeed; // Increment tilt angle

        // Wrap around bottom
        if (flake.y > canvas.height + 20) {
          const newFlake = createSnowflake();
          flake.x = newFlake.x;
          flake.y = -20;
          flake.speed = newFlake.speed;
          flake.wind = newFlake.wind;
          flake.type = newFlake.type;
          flake.radius = newFlake.radius;
          flake.angle = newFlake.angle;
          flake.spinSpeed = newFlake.spinSpeed;
          flake.tilt = newFlake.tilt;
          flake.tiltSpeed = newFlake.tiltSpeed;
        }

        // Wrap around sides
        if (flake.x > canvas.width + 20) {
          flake.x = -20;
        } else if (flake.x < -20) {
          flake.x = canvas.width + 20;
        }
      });
    };

    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{ opacity: 0.9 }}
    />
  );
};

export default SnowEffect;
