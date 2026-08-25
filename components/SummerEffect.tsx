import React, { useEffect, useRef } from 'react';

interface ShimmerMote {
    x: number;
    y: number;
    radius: number;
    speed: number;
    sway: number;
    phase: number;
    pulse: number;
    opacity: number;
    color: string;
}

const MOTE_COLORS = [
    'rgba(255, 193, 7, 0.8)',
    'rgba(255, 224, 138, 0.85)',
    'rgba(255, 247, 214, 0.9)',
    'rgba(103, 207, 211, 0.65)',
];

const getMoteCount = (): number => {
    const isSmallViewport = window.matchMedia('(max-width: 768px)').matches;
    const isLowPower = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4;
    return isSmallViewport || isLowPower ? 16 : 36;
};

const SummerEffect: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        if (!canvas || !context) return;

        let viewportWidth = window.innerWidth;
        let viewportHeight = window.innerHeight;
        let devicePixelRatio = 1;
        let animationFrameId = 0;
        let lastTimestamp = performance.now();
        let motes: ShimmerMote[] = [];

        const randomMote = (initial: boolean): ShimmerMote => ({
            x: Math.random() * viewportWidth,
            y: initial ? Math.random() * viewportHeight : viewportHeight + 16,
            radius: 1.5 + Math.random() * 2.5,
            speed: 4 + Math.random() * 8,
            sway: 8 + Math.random() * 18,
            phase: Math.random() * Math.PI * 2,
            pulse: 1.2 + Math.random() * 1.8,
            opacity: 0.28 + Math.random() * 0.5,
            color: MOTE_COLORS[Math.floor(Math.random() * MOTE_COLORS.length)],
        });

        const resizeCanvas = () => {
            viewportWidth = window.innerWidth;
            viewportHeight = window.innerHeight;
            devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.floor(viewportWidth * devicePixelRatio);
            canvas.height = Math.floor(viewportHeight * devicePixelRatio);
            canvas.style.width = `${viewportWidth}px`;
            canvas.style.height = `${viewportHeight}px`;
            context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
            const targetCount = getMoteCount();
            motes = motes.slice(0, targetCount);
            while (motes.length < targetCount) motes.push(randomMote(true));
        };

        const drawSunbeams = (time: number) => {
            const shimmer = Math.sin(time * 0.00035) * 0.025;
            context.save();
            context.globalCompositeOperation = 'screen';
            context.globalAlpha = 0.11 + shimmer;
            context.fillStyle = '#ffd166';
            context.beginPath();
            context.moveTo(viewportWidth * 0.05, 0);
            context.lineTo(viewportWidth * 0.2, 0);
            context.lineTo(viewportWidth * 0.56, viewportHeight);
            context.lineTo(viewportWidth * 0.32, viewportHeight);
            context.closePath();
            context.fill();
            context.globalAlpha = 0.075 - shimmer * 0.5;
            context.fillStyle = '#fff1b8';
            context.beginPath();
            context.moveTo(viewportWidth * 0.38, 0);
            context.lineTo(viewportWidth * 0.49, 0);
            context.lineTo(viewportWidth * 0.82, viewportHeight);
            context.lineTo(viewportWidth * 0.64, viewportHeight);
            context.closePath();
            context.fill();
            context.restore();
        };

        const drawMote = (mote: ShimmerMote) => {
            const glow = mote.radius * 4;
            const gradient = context.createRadialGradient(mote.x, mote.y, 0, mote.x, mote.y, glow);
            const alpha = mote.opacity * (0.65 + Math.sin(mote.phase) * 0.35);
            gradient.addColorStop(0, mote.color.replace(/([\d.]+)\)$/, `${alpha})`));
            gradient.addColorStop(1, mote.color.replace(/([\d.]+)\)$/, '0)'));
            context.fillStyle = gradient;
            context.beginPath();
            context.arc(mote.x, mote.y, glow, 0, Math.PI * 2);
            context.fill();
        };

        const animate = (timestamp: number) => {
            const deltaSeconds = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
            lastTimestamp = timestamp;
            context.clearRect(0, 0, viewportWidth, viewportHeight);
            drawSunbeams(timestamp);
            motes.forEach(mote => {
                mote.y -= mote.speed * deltaSeconds;
                mote.phase += mote.pulse * deltaSeconds;
                mote.x += Math.sin(mote.phase) * mote.sway * deltaSeconds;
                if (mote.y < -20) Object.assign(mote, randomMote(false));
                drawMote(mote);
            });
            animationFrameId = requestAnimationFrame(animate);
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas, { passive: true });
        animationFrameId = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', resizeCanvas);
            context.clearRect(0, 0, viewportWidth, viewportHeight);
        };
    }, []);

    return <canvas ref={canvasRef} aria-hidden="true" className="fixed inset-0 pointer-events-none z-40" style={{ opacity: 0.8 }} />;
};

export default SummerEffect;