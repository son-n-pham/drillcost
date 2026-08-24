import React, { useEffect, useRef, useState } from 'react';

interface FallingLeaf {
    x: number;
    y: number;
    size: number;
    speed: number;
    swayAmplitude: number;
    swayFrequency: number;
    swayPhase: number;
    rotation: number;
    rotationSpeed: number;
    tumblePhase: number;
    tumbleSpeed: number;
    opacity: number;
    color: string;
}

const LEAF_COLORS = [
    'rgba(217, 119, 6, 0.88)',
    'rgba(234, 88, 12, 0.86)',
    'rgba(185, 28, 28, 0.82)',
    'rgba(202, 138, 4, 0.9)',
    'rgba(159, 72, 27, 0.84)',
];

const getLeafCount = (): number => {
    const isSmallViewport = window.matchMedia('(max-width: 768px)').matches;
    const isLowPower = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4;
    return isSmallViewport || isLowPower ? 14 : 35;
};

const AutumnEffect: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isMotionAllowed, setIsMotionAllowed] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const updateMotionPreference = () => setIsMotionAllowed(!mediaQuery.matches);
        updateMotionPreference();
        mediaQuery.addEventListener('change', updateMotionPreference);
        return () => mediaQuery.removeEventListener('change', updateMotionPreference);
    }, []);

    useEffect(() => {
        if (!isMotionAllowed) return;

        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        if (!canvas || !context) return;

        let viewportWidth = window.innerWidth;
        let viewportHeight = window.innerHeight;
        let devicePixelRatio = 1;
        let animationFrameId = 0;
        let lastTimestamp = performance.now();
        let leaves: FallingLeaf[] = [];

        const randomLeaf = (initial: boolean): FallingLeaf => ({
            x: Math.random() * viewportWidth,
            y: initial ? Math.random() * viewportHeight : -28,
            size: 9 + Math.random() * 7,
            speed: 12 + Math.random() * 18,
            swayAmplitude: 16 + Math.random() * 32,
            swayFrequency: 0.35 + Math.random() * 0.45,
            swayPhase: Math.random() * Math.PI * 2,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 1.1,
            tumblePhase: Math.random() * Math.PI * 2,
            tumbleSpeed: 1 + Math.random() * 1.7,
            opacity: 0.38 + Math.random() * 0.52,
            color: LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)],
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
            const targetCount = getLeafCount();
            leaves = leaves.slice(0, targetCount);
            while (leaves.length < targetCount) leaves.push(randomLeaf(true));
        };

        const drawLeaf = (leaf: FallingLeaf) => {
            const widthScale = Math.sin(leaf.tumblePhase) * 0.32 + 0.78;
            context.save();
            context.translate(leaf.x, leaf.y);
            context.rotate(leaf.rotation);
            context.scale(widthScale, 1);
            context.globalAlpha = leaf.opacity;
            context.fillStyle = leaf.color;
            context.beginPath();
            context.moveTo(0, leaf.size * 0.62);
            context.lineTo(-leaf.size * 0.16, leaf.size * 0.34);
            context.lineTo(-leaf.size * 0.68, leaf.size * 0.46);
            context.lineTo(-leaf.size * 0.48, leaf.size * 0.04);
            context.lineTo(-leaf.size * 0.78, -leaf.size * 0.28);
            context.lineTo(-leaf.size * 0.24, -leaf.size * 0.18);
            context.lineTo(0, -leaf.size * 0.68);
            context.lineTo(leaf.size * 0.24, -leaf.size * 0.18);
            context.lineTo(leaf.size * 0.78, -leaf.size * 0.28);
            context.lineTo(leaf.size * 0.48, leaf.size * 0.04);
            context.lineTo(leaf.size * 0.68, leaf.size * 0.46);
            context.lineTo(leaf.size * 0.16, leaf.size * 0.34);
            context.closePath();
            context.fill();

            context.globalAlpha = leaf.opacity * 0.42;
            context.strokeStyle = '#fff1b8';
            context.lineWidth = Math.max(0.5, leaf.size * 0.05);
            context.beginPath();
            context.moveTo(0, leaf.size * 0.54);
            context.lineTo(0, -leaf.size * 0.54);
            context.moveTo(0, leaf.size * 0.18);
            context.lineTo(-leaf.size * 0.43, -leaf.size * 0.18);
            context.moveTo(0, leaf.size * 0.18);
            context.lineTo(leaf.size * 0.43, -leaf.size * 0.18);
            context.stroke();
            context.restore();
        };

        const animate = (timestamp: number) => {
            const deltaSeconds = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
            lastTimestamp = timestamp;
            context.clearRect(0, 0, viewportWidth, viewportHeight);
            leaves.forEach(leaf => {
                leaf.y += leaf.speed * deltaSeconds;
                leaf.swayPhase += leaf.swayFrequency * deltaSeconds;
                leaf.x += Math.sin(leaf.swayPhase) * leaf.swayAmplitude * deltaSeconds;
                leaf.rotation += leaf.rotationSpeed * deltaSeconds;
                leaf.tumblePhase += leaf.tumbleSpeed * deltaSeconds;
                if (leaf.y > viewportHeight + leaf.size || leaf.x < -50 || leaf.x > viewportWidth + 50) {
                    Object.assign(leaf, randomLeaf(false));
                }
                drawLeaf(leaf);
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
    }, [isMotionAllowed]);

    if (!isMotionAllowed) return null;

    return <canvas ref={canvasRef} aria-hidden="true" className="fixed inset-0 pointer-events-none z-40" style={{ opacity: 0.9 }} />;
};

export default AutumnEffect;