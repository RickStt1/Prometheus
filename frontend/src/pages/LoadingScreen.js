import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import './LoadingScreen.css';

const DURATION_MS = 5000;

export const LoadingScreen = () => {
    const navigate = useNavigate();
    const canvasRef = useRef(null);
    const { theme } = useTheme();

    const grayStart = theme === 'dark' ? 'hsl(210,8%,50%)' : 'hsl(210,8%,72%)';
    const grayEnd = theme === 'dark' ? 'hsl(210,8%,20%)' : 'hsl(210,8%,42%)';

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            navigate('/dashboard', { replace: true });
        }, DURATION_MS);

        return () => clearTimeout(timeoutId);
    }, [navigate]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return undefined;

        const ctx = canvas.getContext('2d');
        const W = 300;
        const H = 340;

        canvas.width = W;
        canvas.height = H;

        const CX = W / 2;
        const BASE_Y = H - 70;
        const TIP_Y = BASE_Y - 90;
        const FADE_MARGIN = 90;

        const hsla = (hsl, alpha) => hsl.replace('hsl(', 'hsla(').replace(')', `,${alpha.toFixed(3)})`);

        class Particle {
            constructor(init) {
                this.reset(init);
            }

            reset(init) {
                const t = Math.random();
                const spreadX = (1 - t) * 28 + 4;

                this.x = CX + (Math.random() - 0.5) * spreadX * 2;
                this.y = BASE_Y - t * (BASE_Y - TIP_Y);

                const angle = -(Math.PI * 0.5 + (Math.random() - 0.5) * 1.1);
                this.vx = Math.cos(angle) * 0.28;
                this.vy = Math.sin(angle) * 0.28;

                this.r = Math.random() * 1.4 + 0.5;
                this.life = init ? Math.random() : 1;
                this.decay = 0.0018;

                this.wobble = Math.random() * Math.PI * 2;
                this.wobbleSpeed = 0.012;
                this.wobbleAmp = 0.02;

                const isTeal = Math.random() > 0.3;

                if (isTeal) {
                    const l = Math.round(62 + Math.random() * 22);
                    this.colorInner = `hsl(187,100%,${l}%)`;
                    this.colorOuter = `hsl(187,100%,${Math.max(38, l - 22)}%)`;
                    this.glowColor = `hsl(187,100%,${l}%)`;
                    this.glowRadius = 8 + Math.random() * 10;
                    this.glowAlpha = 0.65 + Math.random() * 0.3;
                } else {
                    const l = Math.round(50 + Math.random() * 18);
                    this.colorInner = `hsl(210,8%,${l}%)`;
                    this.colorOuter = `hsl(210,8%,${Math.max(24, l - 20)}%)`;
                    this.glowColor = `hsl(210,8%,${l}%)`;
                    this.glowRadius = 6 + Math.random() * 7;
                    this.glowAlpha = 0.4 + Math.random() * 0.3;
                }
            }

            edgeFade() {
                const dLeft = this.x;
                const dRight = W - this.x;
                const dTop = this.y;
                const dBottom = H - this.y;
                const dMin = Math.min(dLeft, dRight, dTop, dBottom);

                if (dMin > FADE_MARGIN) return 1;
                return Math.max(0, dMin / FADE_MARGIN);
            }

            step() {
                this.wobble += this.wobbleSpeed;
                this.vx += Math.sin(this.wobble) * this.wobbleAmp;
                this.vx *= 0.985;
                this.x += this.vx;
                this.y += this.vy;
                this.life -= this.decay;
            }

            draw() {
                const a = Math.max(0, this.life) * this.edgeFade();
                if (a <= 0.01 || this.r < 0.1) return;

                ctx.save();
                ctx.globalAlpha = a;

                const glowR = this.r * (3.5 + this.glowRadius);
                const glowGrad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowR);
                glowGrad.addColorStop(0, hsla(this.glowColor, this.glowAlpha));
                glowGrad.addColorStop(0.4, hsla(this.glowColor, this.glowAlpha * 0.35));
                glowGrad.addColorStop(1, hsla(this.glowColor, 0));

                ctx.beginPath();
                ctx.arc(this.x, this.y, glowR, 0, Math.PI * 2);
                ctx.fillStyle = glowGrad;
                ctx.fill();

                ctx.shadowBlur = this.glowRadius;
                ctx.shadowColor = this.glowColor;

                const grad = ctx.createRadialGradient(
                    this.x - this.r * 0.25,
                    this.y - this.r * 0.25,
                    0,
                    this.x,
                    this.y,
                    this.r
                );

                grad.addColorStop(0, this.colorInner);
                grad.addColorStop(0.6, this.colorInner);
                grad.addColorStop(1, this.colorOuter);

                ctx.beginPath();
                ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
                ctx.fillStyle = grad;
                ctx.fill();

                ctx.restore();
            }
        }

        const COUNT = 4;
        const particles = Array.from({ length: COUNT }, () => new Particle(true));
        let rafId = null;

        const loop = () => {
            ctx.clearRect(0, 0, W, H);

            for (const particle of particles) {
                particle.step();
                particle.draw();

                if (particle.life <= 0 || particle.r < 0.1) {
                    particle.reset(false);
                }
            }

            rafId = requestAnimationFrame(loop);
        };

        loop();

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            ctx.clearRect(0, 0, W, H);
        };
    }, []);

    return (
        <div className="loading-page" data-testid="loading-transition-screen">
            <div className="flame-wrap">
                <div className="glow" />
                <canvas ref={canvasRef} id="sparks" />

                <svg className="flame" viewBox="0 0 100 100" width="96" height="96" aria-hidden="true">
                    <defs>
                        <radialGradient id="gGray" cx="50%" cy="72%" r="52%">
                            <stop offset="0%" stopColor={grayStart} />
                            <stop offset="100%" stopColor={grayEnd} />
                        </radialGradient>
                        <radialGradient id="gMain" cx="50%" cy="68%" r="56%">
                            <stop offset="0%" stopColor="hsl(187,100%,54%)" />
                            <stop offset="100%" stopColor="hsl(187,100%,30%)" />
                        </radialGradient>
                        <radialGradient id="gInner" cx="50%" cy="62%" r="54%">
                            <stop offset="0%" stopColor="hsl(187,100%,72%)" />
                            <stop offset="100%" stopColor="hsl(187,100%,48%)" />
                        </radialGradient>
                        <radialGradient id="gCore" cx="50%" cy="58%" r="52%">
                            <stop offset="0%" stopColor="hsl(187,15%,96%)" />
                            <stop offset="50%" stopColor="hsl(187,70%,84%)" />
                            <stop offset="100%" stopColor="hsl(187,100%,64%)" />
                        </radialGradient>
                        <filter id="blur-gray" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="2.5" />
                        </filter>
                        <filter id="blur-main" x="-15%" y="-15%" width="130%" height="130%">
                            <feGaussianBlur stdDeviation="1.6" />
                        </filter>
                        <filter id="blur-inner" x="-10%" y="-10%" width="120%" height="120%">
                            <feGaussianBlur stdDeviation="0.8" />
                        </filter>
                        <filter id="glow-svg" x="-40%" y="-40%" width="180%" height="180%">
                            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                    <g filter="url(#glow-svg)">
                        <path
                            className="g-gray"
                            fill="url(#gGray)"
                            filter="url(#blur-gray)"
                            opacity=".68"
                            d="M 50,4 C 66,12 84,30 82,52 C 80,62 74,70 68,76 A 22,22 0 0 1 32,76 C 26,70 20,62 18,52 C 16,30 34,12 50,4 Z"
                        />
                        <path
                            className="g-main"
                            fill="url(#gMain)"
                            filter="url(#blur-main)"
                            d="M 50,8 C 64,16 79,32 78,52 C 77,62 71,71 64,77 A 19,19 0 0 1 36,77 C 29,71 23,62 22,52 C 21,32 36,16 50,8 Z"
                        />
                        <path
                            className="g-inner"
                            fill="url(#gInner)"
                            filter="url(#blur-inner)"
                            opacity=".9"
                            d="M 50,18 C 60,26 70,38 69,54 C 68,64 62,72 56,77 A 12,12 0 0 1 44,77 C 38,72 32,64 31,54 C 30,38 40,26 50,18 Z"
                        />
                        <path
                            className="g-core"
                            fill="url(#gCore)"
                            opacity=".88"
                            d="M 50,30 C 56,38 61,48 60,58 C 59,66 55,72 50,74 C 45,72 41,66 40,58 C 39,48 44,38 50,30 Z"
                        />
                    </g>
                </svg>
            </div>

            <span className="label">carregando</span>
        </div>
    );
};
