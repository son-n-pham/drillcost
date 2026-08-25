import React, { useEffect, useRef } from 'react';

interface Petal {
    kind: 'petal' | 'flower';
    x: number;
    y: number;
    size: number;
    speed: number;
    swayAmplitude: number;
    swayFrequency: number;
    swayPhase: number;
    rotation: number;
    rotationSpeed: number;
    flutterPhase: number;
    flutterSpeed: number;
    opacity: number;
    color: string;
}

const PETAL_COLORS = [
    'rgba(255, 190, 211, 0.9)',
    'rgba(244, 145, 181, 0.84)',
    'rgba(226, 104, 157, 0.78)',
    'rgba(255, 246, 248, 0.86)',
];

const FLOWER_COLORS = [
    'rgba(255, 183, 207, 0.92)',
    'rgba(239, 125, 169, 0.86)',
    'rgba(255, 222, 232, 0.9)',
];

const getParticleCount = (): number => {
    const isSmallViewport = window.matchMedia('(max-width: 768px)').matches;
    const isLowPower = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4;
    return isSmallViewport || isLowPower ? 20 : 50;
};

const SakuraEffect: React.FC = () => {
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
        let petals: Petal[] = [];

        const randomPetal = (initial: boolean): Petal => {
            const kind = Math.random() < 0.16 ? 'flower' : 'petal';
            const colors = kind === 'flower' ? FLOWER_COLORS : PETAL_COLORS;
            return {
                kind,
                x: Math.random() * viewportWidth,
                y: initial ? Math.random() * viewportHeight : -24,
                size: kind === 'flower' ? 13 + Math.random() * 5 : 8 + Math.random() * 8,
                speed: 10 + Math.random() * 14,
                swayAmplitude: 18 + Math.random() * 32,
                swayFrequency: 0.35 + Math.random() * 0.35,
                swayPhase: Math.random() * Math.PI * 2,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.9,
                flutterPhase: Math.random() * Math.PI * 2,
                flutterSpeed: 1 + Math.random() * 1.4,
                opacity: 0.42 + Math.random() * 0.48,
                color: colors[Math.floor(Math.random() * colors.length)],
            };
        };

        const resizeCanvas = () => {
            viewportWidth = window.innerWidth;
            viewportHeight = window.innerHeight;
            devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.floor(viewportWidth * devicePixelRatio);
            canvas.height = Math.floor(viewportHeight * devicePixelRatio);
            canvas.style.width = `${viewportWidth}px`;
            canvas.style.height = `${viewportHeight}px`;
            context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
            const targetCount = getParticleCount();
            petals = petals.slice(0, targetCount);
            while (petals.length < targetCount) petals.push(randomPetal(true));
        };

        const drawPetal = (petal: Petal) => {
            context.save();
            context.translate(petal.x, petal.y);
            context.rotate(petal.rotation);
            context.scale(Math.sin(petal.flutterPhase) * 0.35 + 0.75, 1);
            context.globalAlpha = petal.opacity;
            const drawPetalShape = (size: number) => {
                context.beginPath();
                context.moveTo(0, -size * 0.58);
                context.bezierCurveTo(size * 0.64, -size * 0.48, size * 0.72, size * 0.18, size * 0.1, size * 0.58);
                context.bezierCurveTo(size * 0.04, size * 0.48, -size * 0.04, size * 0.48, -size * 0.1, size * 0.58);
                context.bezierCurveTo(-size * 0.72, size * 0.18, -size * 0.64, -size * 0.48, 0, -size * 0.58);
                context.lineTo(size * 0.06, -size * 0.18);
                context.closePath();
            };

            if (petal.kind === 'flower') {
                for (let index = 0; index < 5; index += 1) {
                    context.save();
                    context.rotate((Math.PI * 2 * index) / 5);
                    context.translate(0, -petal.size * 0.34);
                    context.fillStyle = petal.color;
                    drawPetalShape(petal.size * 0.52);
                    context.fill();
                    context.restore();
                }
                context.fillStyle = 'rgba(205, 116, 76, 0.95)';
                context.beginPath();
                context.arc(0, 0, petal.size * 0.16, 0, Math.PI * 2);
                context.fill();
                context.fillStyle = 'rgba(255, 231, 153, 0.95)';
                context.beginPath();
                context.arc(-petal.size * 0.04, -petal.size * 0.04, petal.size * 0.07, 0, Math.PI * 2);
                context.fill();
            } else {
                context.fillStyle = petal.color;
                drawPetalShape(petal.size);
                context.fill();
                context.globalAlpha = petal.opacity * 0.32;
                context.strokeStyle = '#fff7fa';
                context.lineWidth = Math.max(0.5, petal.size * 0.045);
                context.beginPath();
                context.moveTo(0, -petal.size * 0.34);
                context.quadraticCurveTo(petal.size * 0.04, 0, petal.size * 0.04, petal.size * 0.34);
                context.stroke();
            }
            context.restore();
        };

        const animate = (timestamp: number) => {
            const deltaSeconds = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
            lastTimestamp = timestamp;
            context.clearRect(0, 0, viewportWidth, viewportHeight);
            petals.forEach(petal => {
                petal.y += petal.speed * deltaSeconds;
                petal.swayPhase += petal.swayFrequency * deltaSeconds;
                petal.x += Math.sin(petal.swayPhase) * petal.swayAmplitude * deltaSeconds;
                petal.rotation += petal.rotationSpeed * deltaSeconds;
                petal.flutterPhase += petal.flutterSpeed * deltaSeconds;
                if (petal.y > viewportHeight + petal.size || petal.x < -40 || petal.x > viewportWidth + 40) {
                    Object.assign(petal, randomPetal(false));
                }
                drawPetal(petal);
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

    return <canvas ref={canvasRef} aria-hidden="true" className="fixed inset-0 pointer-events-none z-40" style={{ opacity: 0.92 }} />;
};

export default SakuraEffect;