'use client';

import { Application, extend } from '@pixi/react';
import { Container, Graphics, Text, Sprite, Texture, BlurFilter, Assets } from 'pixi.js';
import { useEffect, useRef, useState, useMemo } from 'react';
import { useGameStore } from '@/store/useGameStore';

extend({ Container, Graphics, Text, Sprite });



// 纯几何发光酒瓶绘制函数
const drawBottle = (
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  type: 'round' | 'square' | 'tall',
  color: string,
  time: number
) => {
  // 1. 瓶身深黑色轮廓 (稍微比内部液体大 1px)
  g.rect(x - w / 2, y - h, w, h).fill({ color: '#090a0f', alpha: 0.95 });

  // 2. 液体填充 (带呼吸灯 alpha)
  const breathAlpha = 0.55 + Math.sin(time * 2.2 + x * 0.12) * 0.18;
  let liquidH = h * 0.65;
  if (type === 'tall') liquidH = h * 0.72;
  
  g.rect(x - w / 2 + 1, y - liquidH, w - 2, liquidH - 1).fill({ color, alpha: breathAlpha });

  // 3. 瓶颈绘制
  const neckW = w * 0.32;
  const neckH = h * 0.28;
  g.rect(x - neckW / 2, y - h - neckH, neckW, neckH).fill({ color: '#07080c', alpha: 0.95 });

  // 4. 瓶口高光与软木塞
  g.rect(x - neckW / 2 - 1, y - h - neckH - 2, neckW + 2, 2.5).fill({ color: '#475569' }); // 银灰瓶盖/木塞

  // 5. 瓶身侧边霓虹高光描边 (增加折射通透感)
  g.rect(x - w / 2, y - h, w, h).stroke({ color, width: 1, alpha: 0.45 });
  
  // 顶部瓶口微弱描边
  g.rect(x - neckW / 2, y - h - neckH, neckW, neckH).stroke({ color, width: 0.8, alpha: 0.35 });
};

export const GameCanvas = () => {
  const { runtime } = useGameStore();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [time, setTime] = useState(0);

  // 落地窗远景 Container Mask State
  const [windowMask, setWindowMask] = useState<Graphics | null>(null);

  // 双背景过渡状态
  const [transitionAlpha, setTransitionAlpha] = useState(1);
  const [prevBgId, setPrevBgId] = useState<string | null>(null);
  const currentBgIdRef = useRef(runtime.backgroundId ?? 'default');
  
  // 模块化多精灵背景纹理缓存
  const [textures, setTextures] = useState<Record<string, Texture> | null>(null);

  useEffect(() => {
    let isMounted = true;
    const assetsToLoad = {
      wall_concrete: '/assets/wall_concrete.png',
      window_skyline: '/assets/window_skyline.png',
      window_glass_refraction: '/assets/window_glass_refraction.png',
    };

    const loadAll = async () => {
      try {
        const loaded: Record<string, Texture> = {};
        for (const [key, url] of Object.entries(assetsToLoad)) {
          loaded[key] = await Assets.load(url);
        }
        if (isMounted) {
          setTextures(loaded);
        }
      } catch (err) {
        console.error('Failed to load modular tavern assets:', err);
      }
    };

    loadAll();
    return () => { isMounted = false; };
  }, []);

  // 多层雨滴粒子系统 Ref
  // depth: 0 (远景, 细慢), 1 (中景), 2 (近景, 粗快)
  const raindropsRef = useRef<{ x: number; y: number; len: number; speed: number; alpha: number; depth: number }[]>([]);

  // 物理水花涟漪 Ref
  const ripplesRef = useRef<{ x: number; y: number; r: number; maxR: number; alpha: number; speed: number }[]>([]);

  // 烟雾粒子 Ref
  const smokeParticlesRef = useRef<{ x: number; y: number; vx: number; vy: number; r: number; alpha: number }[]>([]);

  const bgId = runtime.backgroundId ?? 'default';

  // 监听背景切换
  useEffect(() => {
    if (bgId !== currentBgIdRef.current) {
      setPrevBgId(currentBgIdRef.current);
      setTransitionAlpha(0);
      currentBgIdRef.current = bgId;
    }
  }, [bgId]);

  // 生成 Canvas 纹理及滤镜防止 SSR 报错
  const lightTexture = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
      grad.addColorStop(0, 'rgba(229, 169, 59, 0.28)'); // 琥珀金 oklch(0.68 0.16 75)
      grad.addColorStop(0.2, 'rgba(229, 169, 59, 0.16)');
      grad.addColorStop(0.5, 'rgba(229, 169, 59, 0.05)');
      grad.addColorStop(1, 'rgba(229, 169, 59, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);
    }
    return Texture.from(canvas);
  }, []);

  const neonRedTexture = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 256, 0); // 从左向右渐变，使右侧平滑淡出
      grad.addColorStop(0, 'rgba(239, 68, 68, 0.15)'); // 最左侧最亮
      grad.addColorStop(0.6, 'rgba(239, 68, 68, 0.04)');
      grad.addColorStop(1, 'rgba(239, 68, 68, 0)'); // 最右侧完全透明，消除生硬边缘
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 512);
    }
    return Texture.from(canvas);
  }, []);

  const blurFilter = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return new BlurFilter(4);
  }, []);

  const showLendro = !!(runtime.activeSpriteId && runtime.activeSpriteId.includes('Lendro'));
  const showLendroRef = useRef(showLendro);
  const dimensionsRef = useRef(dimensions);

  useEffect(() => {
    showLendroRef.current = showLendro;
  }, [showLendro]);

  useEffect(() => {
    dimensionsRef.current = dimensions;
  }, [dimensions]);

  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        setDimensions({
          width: Math.max(1, Math.round(rect.width)),
          height: Math.max(1, Math.round(rect.height)),
        });
        return;
      }
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    // 初始化三层多景深雨滴
    const rainArr = [];
    const width = window.innerWidth;
    const height = window.innerHeight;
    for (let i = 0; i < 75; i++) {
      const depth = Math.floor(Math.random() * 3); // 0, 1, 2
      let len = 10, speed = 6, alpha = 0.05;
      if (depth === 1) {
        len = 16 + Math.random() * 8;
        speed = 9 + Math.random() * 4;
        alpha = 0.08 + Math.random() * 0.08;
      } else if (depth === 2) {
        len = 25 + Math.random() * 10;
        speed = 14 + Math.random() * 5;
        alpha = 0.12 + Math.random() * 0.12;
      }
      rainArr.push({
        x: Math.random() * width,
        y: Math.random() * height,
        len,
        speed,
        alpha,
        depth,
      });
    }
    raindropsRef.current = rainArr;

    let frameId: number;
    let localTime = 0;
    const animate = () => {
      localTime += 0.04;
      setTime(localTime);

      // 更新背景渐变过渡百分比
      setTransitionAlpha((alpha) => {
        if (alpha < 1) {
          return Math.min(1, alpha + 0.025);
        }
        return 1;
      });

      const currentWidth = dimensionsRef.current.width;
      const currentHeight = dimensionsRef.current.height;
      const counterY = currentHeight * 0.67;

      // 更新雨滴位置与落点涟漪物理触发
      if (raindropsRef.current.length > 0) {
        raindropsRef.current.forEach((r) => {
          r.y += r.speed;
          r.x -= r.speed * 0.12; // 稍微倾斜下雨
          
          // 如果雨滴到达吧台高度
          if (r.y > counterY) {
            // 有概率触发涟漪动画
            if (Math.random() < 0.22) {
              ripplesRef.current.push({
                x: r.x,
                y: counterY + Math.random() * 6, // 在吧台面轻微错落
                r: 1,
                maxR: 8 + Math.random() * 10,
                alpha: r.alpha * 1.8,
                speed: 0.35 + Math.random() * 0.25,
              });
            }
            // 重置雨滴到屏幕上方
            r.y = -30;
            r.x = Math.random() * currentWidth;
          }
        });
      }

      // 更新水花涟漪状态
      if (ripplesRef.current.length > 0) {
        ripplesRef.current = ripplesRef.current
          .map((rip) => ({
            ...rip,
            r: rip.r + rip.speed,
            alpha: rip.alpha - 0.035,
          }))
          .filter((rip) => rip.alpha > 0);
      }

      // 产生嘴角香烟烟雾粒子 (降低生成频率与飘逸初速度)
      if (showLendroRef.current && Math.random() < 0.018) {
        smokeParticlesRef.current.push({
          x: -6 + Math.sin(localTime * 0.2) * 1.0,
          y: -30,
          vx: -0.06 - Math.random() * 0.14, // 向左上方轻柔漂移
          vy: -0.22 - Math.random() * 0.18,
          r: 1.5 + Math.random() * 1.5,
          alpha: 0.35 + Math.random() * 0.2,
        });
      }

      // 更新烟雾粒子
      if (smokeParticlesRef.current.length > 0) {
        smokeParticlesRef.current = smokeParticlesRef.current
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            r: p.r + 0.05,
            alpha: p.alpha - 0.008,
          }))
          .filter((p) => p.alpha > 0);
      }

      frameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, []);

  // 物理天气特效层 (雨滴与水花)
  const drawWeatherEffects = (graphics: Graphics, opacity: number) => {
    if (raindropsRef.current.length > 0) {
      raindropsRef.current.forEach((r) => {
        let color = '#38bdf8';
        let width = 0.8;
        if (r.depth === 0) {
          color = '#1b1b2f';
          width = 0.5;
        } else if (r.depth === 2) {
          color = '#7dd3fc';
          width = 1.2;
        }
        graphics.moveTo(r.x, r.y).lineTo(r.x - r.len * 0.12, r.y + r.len).stroke({ color, width, alpha: r.alpha * opacity });
      });
    }

    if (ripplesRef.current.length > 0) {
      ripplesRef.current.forEach((rip) => {
        graphics.ellipse(rip.x, rip.y, rip.r, rip.r * 0.25).stroke({ color: '#7dd3fc', width: 0.8, alpha: rip.alpha * opacity });
      });
    }
  };

  // 虚空背景
  const drawVoidBg = (graphics: Graphics, opacity: number) => {
    const shimmer = 0.02 + Math.sin(time * 0.3) * 0.01;
    graphics.rect(0, 0, dimensions.width, dimensions.height).fill({ color: '#0f172a', alpha: shimmer * opacity });
  };



  // 精雕细刻的多边形侦探剪影绘制逻辑 (带双重 Rim Light 逆光与大衣风吹微摆)
  const drawDetectiveSilhouette = (graphics: Graphics) => {
    graphics.clear();
    
    const bodyColor = '#120d0b'; 
    const edgeColorLeft = '#ec4899'; // 品红高光线 (左逆光，来自窗外霓虹)
    const edgeColorRight = '#f59e0b'; // 琥珀金高光线 (右逆光，来自室内暖灯)

    // 风摆振荡参数 (减慢频率与幅度，使画面呈现成熟安稳的格调)
    const windOffsetLowerLeft = Math.sin(time * 0.5) * 1.6;
    const windOffsetLowerRight = Math.cos(time * 0.4) * 1.2;
    const windOffsetCollar = Math.sin(time * 0.6) * 0.6;

    // 1. 绘制风衣外套主体 (重构为单连通简单多边形，杜绝自相交 Odd-Even 破口瑕疵)
    graphics.moveTo(-115 + windOffsetLowerLeft, 250);
    graphics.lineTo(-95, 95);                         // 左肩
    graphics.lineTo(-40 + windOffsetCollar, 55);       // 左领口
    graphics.lineTo(-28, -12);                        // 左颈部
    graphics.lineTo(28, -12);                         // 右颈部
    graphics.lineTo(40 - windOffsetCollar, 55);        // 右领口
    graphics.lineTo(95, 95);                           // 右肩
    graphics.lineTo(115 + windOffsetLowerRight, 250);  // 右下摆
    graphics.lineTo(-115 + windOffsetLowerLeft, 250);
    graphics.fill({ color: bodyColor, alpha: 0.98 });

    // 1.5 绘制独立帽檐 (不与外套在同一段闭合路径内绘制，彻底解决挖空 Bug)
    graphics.moveTo(-65, -16);
    graphics.lineTo(-60, -22);
    graphics.lineTo(60, -22);
    graphics.lineTo(65, -16);
    graphics.lineTo(-65, -16);
    graphics.fill({ color: bodyColor, alpha: 0.98 });

    // 2. 绘制西装翻领与肩绊的重叠多边形 (增加立体度)
    // 左驳领
    graphics.moveTo(-40 + windOffsetCollar, 55);
    graphics.lineTo(-75, 105);
    graphics.lineTo(-30, 130);
    graphics.lineTo(-40 + windOffsetCollar, 55);
    graphics.fill({ color: '#0b0807', alpha: 0.95 });
    
    // 右驳领
    graphics.moveTo(40 - windOffsetCollar, 55);
    graphics.lineTo(75, 105);
    graphics.lineTo(30, 130);
    graphics.lineTo(40 - windOffsetCollar, 55);
    graphics.fill({ color: '#0b0807', alpha: 0.95 });

    // 3. 领带/领结
    graphics.moveTo(-8, 52);
    graphics.lineTo(8, 52);
    graphics.lineTo(12, 110);
    graphics.lineTo(0, 125);
    graphics.lineTo(-12, 110);
    graphics.lineTo(-8, 52);
    graphics.fill({ color: '#1e0c07', alpha: 0.98 });

    // 4. 礼帽帽子上半部 (Fedora)
    graphics.moveTo(-42, -22);
    graphics.lineTo(-32, -68);    // 左帽顶
    graphics.bezierCurveTo(-15, -76, 15, -76, 32, -68);
    graphics.lineTo(42, -22);
    graphics.lineTo(-42, -22);
    graphics.fill({ color: bodyColor, alpha: 0.98 });

    // 5. 礼帽缎带 (Hat Ribbon)
    graphics.moveTo(-43, -22);
    graphics.lineTo(-41, -30);
    graphics.lineTo(41, -30);
    graphics.lineTo(43, -22);
    graphics.lineTo(-43, -22);
    graphics.fill({ color: '#2a1915', alpha: 0.95 });

    // 6. 双重 Rim Light 逆光描边 (拆分为 4 段独立的 stroke 链式操作，防止渲染上下文状态污染)
    // (1) 左侧帽子（品红高光）
    graphics.moveTo(-32, -68);
    graphics.lineTo(-42, -22);
    graphics.lineTo(-65, -16);
    graphics.stroke({ color: edgeColorLeft, width: 1.2, alpha: 0.65 });

    // (2) 左侧大衣（品红高光）
    graphics.moveTo(-28, -12);
    graphics.lineTo(-40 + windOffsetCollar, 55);
    graphics.lineTo(-95, 95);
    graphics.lineTo(-115 + windOffsetLowerLeft, 220);
    graphics.stroke({ color: edgeColorLeft, width: 1.2, alpha: 0.65 });

    // (3) 右侧帽子（琥珀金高光）
    graphics.moveTo(32, -68);
    graphics.lineTo(42, -22);
    graphics.lineTo(65, -16);
    graphics.stroke({ color: edgeColorRight, width: 1.2, alpha: 0.65 });

    // (4) 右侧大衣（琥珀金高光）
    graphics.moveTo(28, -12);
    graphics.lineTo(40 - windOffsetCollar, 55);
    graphics.lineTo(95, 95);
    graphics.lineTo(115 + windOffsetLowerRight, 220);
    graphics.stroke({ color: edgeColorRight, width: 1.2, alpha: 0.65 });

    // 7. 嘴角香烟微光与烟雾粒子
    // 烟头火光 (放缓火光呼吸频次至 1.5 倍)
    const emberAlpha = 0.70 + Math.sin(time * 1.5) * 0.15;
    graphics.drawCircle(-6, -30, 2).fill({ color: '#f97316', alpha: emberAlpha });
    graphics.drawCircle(-6, -30, 0.8).fill({ color: '#fef08a', alpha: emberAlpha * 0.8 });

    // 烟雾粒子渲染
    if (smokeParticlesRef.current.length > 0) {
      smokeParticlesRef.current.forEach((p) => {
        graphics.drawCircle(p.x, p.y, p.r).fill({ color: '#dfdfdf', alpha: p.alpha });
      });
    }
  };

  return (
    <div ref={containerRef} className="fixed inset-0 z-0 overflow-hidden bg-[#040408]">
      <Application
        resizeTo={containerRef}
        background={'#08080f'}
        antialias
        className="h-full w-full"
      >
        <pixiContainer>
          {/* 物理渲染层与虚空切换 */}
          <pixiGraphics
            draw={(graphics) => {
              graphics.clear();
              if (bgId !== 'tavern_night_rain' && bgId !== 'default') {
                drawVoidBg(graphics, transitionAlpha);
              }
              if (prevBgId && prevBgId !== 'tavern_night_rain' && prevBgId !== 'default' && transitionAlpha < 1) {
                drawVoidBg(graphics, 1 - transitionAlpha);
              }
            }}
          />

          {/* 模块化超细粒度背景渲染 */}
          {(bgId === 'tavern_night_rain' || bgId === 'default') && textures && (
            <pixiContainer alpha={transitionAlpha}>
              {/* 1. 粗粝混凝土底墙 (平铺/Cover 填充) */}
              <pixiSprite
                texture={textures.wall_concrete}
                anchor={0.5}
                x={dimensions.width / 2}
                y={dimensions.height / 2}
                scale={Math.max(dimensions.width / textures.wall_concrete.width, dimensions.height / textures.wall_concrete.height)}
              />

              {/* 2. 横向与纵向工业水管 (纯代码矢量绘制，金属反光与双色霓虹高光，外加压力表细节) */}
              <pixiGraphics
                draw={(g) => {
                  g.clear();
                  
                  const width = dimensions.width;
                  const height = dimensions.height;
                  
                  // 1. 横向管道 (顶部)
                  const pipeY1 = height * 0.04;
                  const pipeH1 = 12;
                  // 管道主体
                  g.rect(0, pipeY1, width, pipeH1).fill({ color: '#0e111a', alpha: 1.0 });
                  // 顶部金属反光浅线
                  g.moveTo(0, pipeY1 + 1).lineTo(width, pipeY1 + 1).stroke({ color: '#334155', width: 0.8, alpha: 0.6 });
                  // 下部霓虹青色发光高光线
                  g.moveTo(0, pipeY1 + pipeH1 - 1).lineTo(width, pipeY1 + pipeH1 - 1).stroke({ color: '#06b6d4', width: 1.0, alpha: 0.7 });
                  
                  // 横向管道法兰圈 (加固圈)
                  const flangeXs = [width * 0.15, width * 0.48, width * 0.75];
                  flangeXs.forEach((fx) => {
                    g.rect(fx - 3, pipeY1 - 3, 6, pipeH1 + 6).fill({ color: '#181e2e' }).stroke({ color: '#06b6d4', width: 0.8, alpha: 0.5 });
                  });

                  // 2. 纵向管道 (右侧)
                  const pipeX2 = width * 0.94;
                  const pipeW2 = 14;
                  const pipeYEnd2 = height * 0.67; // 延伸到吧台面高度
                  // 管道主体
                  g.rect(pipeX2, 0, pipeW2, pipeYEnd2).fill({ color: '#0b0e14', alpha: 1.0 });
                  // 右侧金属反光线
                  g.moveTo(pipeX2 + pipeW2 - 1, 0).lineTo(pipeX2 + pipeW2 - 1, pipeYEnd2).stroke({ color: '#334155', width: 0.8, alpha: 0.6 });
                  // 左侧霓虹品红发光高光线
                  g.moveTo(pipeX2 + 1, 0).lineTo(pipeX2 + 1, pipeYEnd2).stroke({ color: '#ec4899', width: 1.0, alpha: 0.7 });
                  
                  // 纵向管道法兰圈
                  const flangeYs = [height * 0.18, height * 0.45];
                  flangeYs.forEach((fy) => {
                    g.rect(pipeX2 - 3, fy - 3, pipeW2 + 6, 6).fill({ color: '#141824' }).stroke({ color: '#ec4899', width: 0.8, alpha: 0.5 });
                  });

                  // 3. 在纵向管道交错处，绘制一个非常精致的发光压力仪表 (Glow Pressure Gauge)
                  const gaugeX = pipeX2 + pipeW2 / 2;
                  const gaugeY = height * 0.32;
                  // 仪表底盘
                  g.drawCircle(gaugeX, gaugeY, 11).fill({ color: '#090b11' }).stroke({ color: '#ec4899', width: 1.2, alpha: 0.8 });
                  // 刻度盘浅色背景
                  g.drawCircle(gaugeX, gaugeY, 8.5).fill({ color: '#161d2f' });
                  // 刻度线 (极小)
                  g.drawCircle(gaugeX, gaugeY, 6.5).stroke({ color: '#2e3c5a', width: 0.5, alpha: 0.5 });
                  // 金黄色指针 (琥珀色)
                  g.moveTo(gaugeX, gaugeY).lineTo(gaugeX + 4.5, gaugeY - 4.5).stroke({ color: '#f59e0b', width: 1.0, alpha: 0.95 });
                  // 中心销钉
                  g.drawCircle(gaugeX, gaugeY, 1.2).fill({ color: '#ffffff' });
                }}
              />
 
              {/* 3. 悬挂散乱电缆线 (代码贝塞尔曲线绘制，微物理摆动与闪烁指示灯) */}
              <pixiGraphics
                draw={(g) => {
                  g.clear();
                  
                  const width = dimensions.width;
                  const height = dimensions.height;
                  
                  // 线缆 1: X起约34%，弯曲幅度中等，红色指示灯
                  const startX1 = width * 0.34;
                  const endX1 = width * 0.38;
                  const endY1 = height * 0.28;
                  const ctrlX1 = width * 0.31 + Math.sin(time * 0.5) * 3;
                  const ctrlY1 = height * 0.14;
                  
                  g.moveTo(startX1, 0);
                  g.quadraticCurveTo(ctrlX1, ctrlY1, endX1, endY1);
                  g.stroke({ color: '#080a0e', width: 1.2 });
                  
                  // 线缆 2: X起约36%，较长，绿色指示灯
                  const startX2 = width * 0.36;
                  const endX2 = width * 0.32;
                  const endY2 = height * 0.36;
                  const ctrlX2 = width * 0.39 + Math.cos(time * 0.4) * 4;
                  const ctrlY2 = height * 0.18;
                  
                  g.moveTo(startX2, 0);
                  g.quadraticCurveTo(ctrlX2, ctrlY2, endX2, endY2);
                  g.stroke({ color: '#06070a', width: 1.6 });
                  
                  // 线缆 3: X起约38%，较短，无灯
                  const startX3 = width * 0.38;
                  const endX3 = width * 0.41;
                  const endY3 = height * 0.22;
                  const ctrlX3 = width * 0.40 + Math.sin(time * 0.65) * 2;
                  const ctrlY3 = height * 0.11;
                  
                  g.moveTo(startX3, 0);
                  g.quadraticCurveTo(ctrlX3, ctrlY3, endX3, endY3);
                  g.stroke({ color: '#090b10', width: 1.0 });

                  // 绘制线缆上的闪烁微型 LED
                  // 灯 1 (线 1 中段)
                  const p1t = 0.6; // 二次贝塞尔曲线参数方程求点
                  const lampX1 = (1 - p1t) * (1 - p1t) * startX1 + 2 * p1t * (1 - p1t) * ctrlX1 + p1t * p1t * endX1;
                  const lampY1 = (1 - p1t) * (1 - p1t) * 0 + 2 * p1t * (1 - p1t) * ctrlY1 + p1t * p1t * endY1;
                  const blink1 = Math.sin(time * 8) > 0 ? 1 : 0.15;
                  g.drawCircle(lampX1, lampY1, 1.2).fill({ color: '#ef4444', alpha: blink1 }); // 红色 LED
                  
                  // 灯 2 (线 2 中段)
                  const p2t = 0.7;
                  const lampX2 = (1 - p2t) * (1 - p2t) * startX2 + 2 * p2t * (1 - p2t) * ctrlX2 + p2t * p2t * endX2;
                  const lampY2 = (1 - p2t) * (1 - p2t) * 0 + 2 * p2t * (1 - p2t) * ctrlY2 + p2t * p2t * endY2;
                  const blink2 = Math.cos(time * 7) > 0 ? 1 : 0.15;
                  g.drawCircle(lampX2, lampY2, 1.2).fill({ color: '#10b981', alpha: blink2 }); // 绿色 LED
                }}
              />
 
              {/* 4. 工业排风扇 (代码绘制金属栅格底座与流光残影扇叶) */}
              <pixiContainer
                x={dimensions.width * 0.58}
                y={dimensions.height * 0.12}
              >
                <pixiGraphics
                  draw={(g) => {
                    g.clear();
                    // 1. 方形外置机壳外框
                    g.roundRect(-28, -28, 56, 56, 5).fill({ color: '#090b11', alpha: 0.95 }).stroke({ color: '#06b6d4', width: 1.2, alpha: 0.45 });
                    // 2. 内部深色圆腔
                    g.drawCircle(0, 0, 24).fill({ color: '#040508' });
                    
                    // 3. 极细金属安全栅格线 (十字 + 同心圆)
                    g.moveTo(-24, 0).lineTo(24, 0).stroke({ color: '#1e293b', width: 0.8, alpha: 0.5 });
                    g.moveTo(0, -24).lineTo(0, 24).stroke({ color: '#1e293b', width: 0.8, alpha: 0.5 });
                    g.drawCircle(0, 0, 14).stroke({ color: '#1e293b', width: 0.8, alpha: 0.4 });
                    
                    // 轴心
                    g.drawCircle(0, 0, 3.5).fill({ color: '#000000' });
                  }}
                />
                {/* 旋转风扇叶片 (带有流光残影) */}
                <pixiGraphics
                  rotation={time * 1.6}
                  draw={(g) => {
                    g.clear();
                    for (let i = 0; i < 4; i++) {
                      const angle = (i * Math.PI) / 2;
                      // 绘制扇叶多边形主体
                      g.moveTo(0, 0)
                       .arc(0, 0, 22, angle - 0.22, angle + 0.22)
                       .closePath()
                       .fill({ color: '#101624', alpha: 0.88 });
                      
                      // 扇叶外缘的高光弧线，在快速旋转时会产生极佳的淡青色流光残影
                      g.arc(0, 0, 22, angle + 0.1, angle + 0.22)
                       .stroke({ color: '#00f2ff', width: 1, alpha: 0.4 });
                    }
                  }}
                />
              </pixiContainer>
 
              {/* 5. 左侧落地霓虹雨窗组 (使用圆角 Mask 进行大图裁切，防溢出和防拉伸) */}
              {(() => {
                const windowX = dimensions.width * 0.18;
                const windowY = dimensions.height * 0.32;
                const windowW = dimensions.width * 0.24;
                const windowH = dimensions.height * 0.46;
                const bgScale = Math.max(windowW / textures.window_skyline.width, windowH / textures.window_skyline.height);
                
                return (
                  <pixiContainer>
                    {/* 遮罩，收集 ref 实例且设为隐藏 */}
                    <pixiGraphics
                      ref={setWindowMask}
                      visible={false}
                      draw={(g) => {
                        g.clear();
                        g.roundRect(windowX - windowW / 2, windowY - windowH / 2, windowW, windowH, 8).fill({ color: '#ffffff' });
                      }}
                    />

                    {/* 使用 Mask 的内容容器 */}
                    <pixiContainer mask={windowMask || undefined}>
                      <pixiSprite
                        texture={textures.window_skyline}
                        anchor={0.5}
                        x={windowX}
                        y={windowY}
                        scale={bgScale}
                      />
                      <pixiSprite
                        texture={textures.window_glass_refraction}
                        anchor={0.5}
                        x={windowX}
                        y={windowY}
                        scale={bgScale}
                      />
                    </pixiContainer>

                    {/* 盖在顶层的几何金属窗格框架与霓虹反光 */}
                    <pixiGraphics
                      draw={(g) => {
                        g.clear();
                        
                        // 窗框外围粗黑色底边 (圆角)
                        g.roundRect(windowX - windowW / 2, windowY - windowH / 2, windowW, windowH, 8)
                         .stroke({ color: '#090a10', width: 6 });
                        
                        // 窗格分界线 (纵横隔条)
                        g.moveTo(windowX, windowY - windowH / 2).lineTo(windowX, windowY + windowH / 2)
                         .stroke({ color: '#06070a', width: 2.5 });
                        g.moveTo(windowX - windowW / 2, windowY - windowH * 0.16).lineTo(windowX + windowW / 2, windowY - windowH * 0.16)
                         .stroke({ color: '#06070a', width: 2.5 });
                        g.moveTo(windowX - windowW / 2, windowY + windowH * 0.18).lineTo(windowX + windowW / 2, windowY + windowH * 0.18)
                         .stroke({ color: '#06070a', width: 2.5 });
                        
                        // 窗框边缘霓虹漫反射微发光 (品红 OKLCH 反光)
                        g.roundRect(windowX - windowW / 2 + 3, windowY - windowH / 2 + 3, windowW - 6, windowH - 6, 6)
                         .stroke({ color: '#ec4899', width: 1.0, alpha: 0.28 });
                      }}
                    />
                  </pixiContainer>
                );
              })()}
 
              {/* 6. 汉字“非存在”霓虹灯招牌 (双层渲染：发光模糊层与高对比度实体层，随机高频闪烁) */}
              {(() => {
                const signX = dimensions.width * 0.5;
                const signY = dimensions.height * 0.26;
                const signText = '非存在';
                const isFlickering = Math.sin(time * 50) * Math.cos(time * 31) > 0.8;
                const flickerAlpha = 0.85 + Math.sin(time * 12) * 0.1 + (isFlickering ? -0.4 : 0);
                return (
                  <pixiContainer>
                    {/* 霓虹背光模糊晕染 */}
                    <pixiText
                      text={signText}
                      x={signX}
                      y={signY}
                      anchor={0.5}
                      filters={blurFilter ? [blurFilter] : []}
                      alpha={flickerAlpha * 0.6}
                      style={{ fill: '#ec4899', fontSize: 32, fontWeight: '900', fontFamily: 'monospace' }}
                    />
                    {/* 霓虹前景实体发光 */}
                    <pixiText
                      text={signText}
                      x={signX}
                      y={signY}
                      anchor={0.5}
                      alpha={flickerAlpha}
                      style={{ fill: '#ffffff', stroke: { color: '#ec4899', width: 3 }, fontSize: 32, fontWeight: '900', fontFamily: 'monospace' }}
                    />
                  </pixiContainer>
                );
              })()}
 
              {/* 7. 右侧陈列金属酒架与纯代码发光酒瓶组 */}
              {(() => {
                const shelfX = dimensions.width * 0.82;
                const shelfY = dimensions.height * 0.32;
                const shelfWidth = dimensions.width * 0.20;
                const shelfHeight = dimensions.height * 0.36;
 
                // 12 个几何酒瓶数据
                const bottlesData = [
                  // 第一层 (顶层)
                  { plankY: -0.22, relX: -0.25, type: 'round', color: '#06b6d4' },
                  { plankY: -0.22, relX: -0.08, type: 'square', color: '#ec4899' },
                  { plankY: -0.22, relX: 0.09, type: 'tall', color: '#f59e0b' },
                  { plankY: -0.22, relX: 0.26, type: 'round', color: '#06b6d4' },
                  // 第二层 (中层)
                  { plankY: 0.08, relX: -0.22, type: 'tall', color: '#f59e0b' },
                  { plankY: 0.08, relX: -0.05, type: 'square', color: '#ec4899' },
                  { plankY: 0.08, relX: 0.12, type: 'round', color: '#06b6d4' },
                  { plankY: 0.08, relX: 0.29, type: 'tall', color: '#f59e0b' },
                  // 第三层 (底层)
                  { plankY: 0.38, relX: -0.26, type: 'square', color: '#ec4899' },
                  { plankY: 0.38, relX: -0.09, type: 'round', color: '#06b6d4' },
                  { plankY: 0.38, relX: 0.08, type: 'tall', color: '#f59e0b' },
                  { plankY: 0.38, relX: 0.25, type: 'square', color: '#ec4899' },
                ] as const;
 
                return (
                  <pixiContainer>
                    <pixiGraphics
                      draw={(g) => {
                        g.clear();
                        
                        // 1. 悬挂金属立柱 (左右各一根)
                        const barLeftX = shelfX - shelfWidth * 0.35;
                        const barRightX = shelfX + shelfWidth * 0.35;
                        g.moveTo(barLeftX, shelfY - shelfHeight * 0.4).lineTo(barLeftX, shelfY + shelfHeight * 0.42)
                         .stroke({ color: '#090b10', width: 2.5 });
                        g.moveTo(barRightX, shelfY - shelfHeight * 0.4).lineTo(barRightX, shelfY + shelfHeight * 0.42)
                         .stroke({ color: '#090b10', width: 2.5 });
                        
                        // 2. 绘制三层置物板 (黑色横条)
                        const stripY1 = shelfY - shelfHeight * 0.22;
                        const stripY2 = shelfY + shelfHeight * 0.08;
                        const stripY3 = shelfY + shelfHeight * 0.38;
                        
                        const startPlankX = shelfX - shelfWidth * 0.42;
                        const endPlankX = shelfX + shelfWidth * 0.42;
                        
                        // 层 1
                        g.moveTo(startPlankX, stripY1).lineTo(endPlankX, stripY1).stroke({ color: '#0c0f17', width: 4.5 });
                        g.moveTo(startPlankX, stripY1 + 2).lineTo(endPlankX, stripY1 + 2).stroke({ color: '#06b6d4', width: 1.2, alpha: 0.5 }); // 青色发光下缘
                        
                        // 层 2
                        g.moveTo(startPlankX, stripY2).lineTo(endPlankX, stripY2).stroke({ color: '#0c0f17', width: 4.5 });
                        g.moveTo(startPlankX, stripY2 + 2).lineTo(endPlankX, stripY2 + 2).stroke({ color: '#ec4899', width: 1.2, alpha: 0.5 }); // 品红发光下缘
                        
                        // 层 3
                        g.moveTo(startPlankX, stripY3).lineTo(endPlankX, stripY3).stroke({ color: '#0c0f17', width: 4.5 });
                        g.moveTo(startPlankX, stripY3 + 2).lineTo(endPlankX, stripY3 + 2).stroke({ color: '#06b6d4', width: 1.2, alpha: 0.5 }); // 青色发光下缘
 
                        // 3. 循环绘制几何酒瓶
                        bottlesData.forEach((b) => {
                          const px = shelfX + b.relX * shelfWidth;
                          const py = shelfY + b.plankY * shelfHeight - 2.5; // 贴合在搁板上边缘
                          
                          let bw = 10, bh = 22;
                          if (b.type === 'round') { bw = 12; bh = 19; }
                          else if (b.type === 'square') { bw = 11; bh = 20; }
                          else if (b.type === 'tall') { bw = 8; bh = 25; }
                          
                          const scale = shelfHeight / 180;
                          
                          drawBottle(g, px, py, bw * scale, bh * scale, b.type, b.color, time);
                        });
                      }}
                    />
                  </pixiContainer>
                );
              })()}
 
              {/* 8. 昏黄煤气顶灯发光偏振 */}
              {lightTexture && (
                <pixiSprite
                  texture={lightTexture}
                  x={dimensions.width / 2}
                  y={0}
                  anchor={{ x: 0.5, y: 0.0 }}
                  width={dimensions.width * 0.85 * (1 + Math.sin(time * 0.7) * 0.015)}
                  height={dimensions.width * 0.52 * (1 + Math.sin(time * 0.7) * 0.015)}
                  alpha={(0.95 + Math.sin(time * 1.5) * 0.05)}
                />
              )}
 
              {/* 9. 窗外霓虹灯漫反射漫溢光 */}
              {neonRedTexture && (
                <pixiSprite
                  texture={neonRedTexture}
                  x={0}
                  y={0}
                  anchor={{ x: 0.0, y: 0.0 }}
                  width={280 * (1 + Math.sin(time * 0.45) * 0.02)}
                  height={dimensions.height}
                  alpha={(0.8 + Math.sin(time * 0.9) * 0.12)}
                />
              )}
            </pixiContainer>
          )}

          {/* 物理天气特效层 */}
          <pixiGraphics
            draw={(graphics) => {
              graphics.clear();
              if (bgId === 'tavern_night_rain' || bgId === 'default') {
                drawWeatherEffects(graphics, transitionAlpha);
              }
            }}
          />
 
          {/* 4. 吧台面上的主角倒影 (垂直镜像模糊反射) */}
          {showLendro && (
            <pixiContainer
              x={dimensions.width / 2}
              y={dimensions.height * 0.67}
              scale={{ x: 1.0, y: -0.32 }} // 垂直翻转且缩放
              alpha={0.065 * transitionAlpha}
              filters={blurFilter ? [blurFilter] : []}
            >
              <pixiGraphics draw={drawDetectiveSilhouette} />
            </pixiContainer>
          )}
 
          {/* 5. 角色剪影区 (微调纵向呼吸频率为 0.15，使浮动舒缓沉静) */}
          {showLendro && (
            <pixiContainer
              x={dimensions.width / 2}
              y={dimensions.height / 2 + Math.sin(time * 0.15) * 3}
            >
              <pixiGraphics draw={drawDetectiveSilhouette} />
            </pixiContainer>
          )}

          {/* 6. 吧台横条（最上层，永远绘制） */}
          <pixiGraphics
            draw={(graphics) => {
              graphics.clear();
              const counterY = dimensions.height * 0.67;
              const counterHeight = dimensions.height * 0.33;

              // 吧台底色
              graphics.rect(0, counterY, dimensions.width, counterHeight).fill({ color: '#16100f', alpha: 1.0 });

              // 吧台顶部的琥珀金呼吸发光线
              const lineAlpha = 0.52 + Math.sin(time * 0.6) * 0.12;
              graphics.moveTo(0, counterY).lineTo(dimensions.width, counterY).stroke({ color: '#b27329', width: 1.5, alpha: lineAlpha });

              // 吧台表面的水渍环杯圈与高光
              graphics.ellipse(dimensions.width * 0.42, counterY + 12, 16, 4).stroke({ color: '#b27329', width: 0.8, alpha: 0.12 });
              graphics.ellipse(dimensions.width * 0.42 - 2, counterY + 13, 14, 3.5).stroke({ color: '#b27329', width: 0.6, alpha: 0.08 });

              // 在吧台上绘制一杯琥珀金色的酒杯 (Lendro 面前)
              const glassX = dimensions.width / 2 + 35;
              const glassY = counterY - 2;
              graphics.moveTo(glassX - 6, glassY - 12);
              graphics.lineTo(glassX + 6, glassY - 12);
              graphics.lineTo(glassX + 4, glassY - 2);
              graphics.lineTo(glassX - 4, glassY - 2);
              graphics.closePath();
              graphics.fill({ color: '#b27329', alpha: 0.25 }); // 琥珀金酒液

              // 杯壁高光与杯底
              graphics.moveTo(glassX - 6, glassY - 15);
              graphics.lineTo(glassX + 6, glassY - 15);
              graphics.lineTo(glassX + 3, glassY);
              graphics.lineTo(glassX - 3, glassY);
              graphics.lineTo(glassX - 6, glassY - 15);
              graphics.moveTo(glassX - 5, glassY);
              graphics.lineTo(glassX + 5, glassY);
              graphics.stroke({ color: '#ffffff', width: 0.8, alpha: 0.32 });
            }}
          />

          {/* 7. 复古 CRT 物理扫描线颗粒效果 */}
          <pixiGraphics
            draw={(graphics) => {
              graphics.clear();
              const step = 4;
              for (let y = 0; y < dimensions.height; y += step) {
                graphics.rect(0, y, dimensions.width, 1.5).fill({ color: '#000000', alpha: 0.038 });
              }
            }}
          />

          <pixiText
            text={`Ambient: ${bgId}`}
            x={20}
            y={dimensions.height - 30}
            alpha={0.2}
            style={{ fill: 0xffffff, fontSize: 10, fontFamily: 'monospace' }}
          />

          <pixiText
            text={showLendro ? 'LENDRO' : ''}
            x={dimensions.width / 2}
            y={dimensions.height / 2 + 225}
            anchor={0.5}
            alpha={0.35}
            style={{ fill: '#b27329', fontSize: 13, fontWeight: 'bold', letterSpacing: 4, fontFamily: 'Georgia' }}
          />
        </pixiContainer>
      </Application>
    </div>
  );
};

