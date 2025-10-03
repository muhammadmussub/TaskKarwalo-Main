import React, { useEffect, useRef } from 'react';

interface MockGlobeProps {
  ref?: React.RefObject<any>;
  globeImageUrl?: string;
  backgroundImageUrl?: string;
  pointsData?: any[];
  pointLat?: string;
  pointLng?: string;
  pointColor?: string;
  pointAltitude?: string;
  pointRadius?: string;
  onPointClick?: (point: any) => void;
  onGlobeClick?: (coords: { lat: number; lng: number }) => void;
  width?: number;
  height?: number;
  backgroundColor?: string;
  arcsData?: any[];
  arcColor?: string;
  arcDashLength?: number;
  arcDashGap?: number;
  arcDashAnimateTime?: number;
  arcsTransitionDuration?: number;
  arcStroke?: number;
}

const MockGlobe: React.FC<MockGlobeProps> = React.forwardRef<HTMLDivElement, MockGlobeProps>((props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    width = window.innerWidth,
    height = 600,
    backgroundColor = "#000011",
    globeImageUrl,
    backgroundImageUrl,
    pointsData = [],
    onGlobeClick
  } = props;

  // Mock the pointOfView method for the Globe
  React.useImperativeHandle(ref, () => ({
    pointOfView: (viewParams?: any, transitionMs?: number) => {
      console.log("Mock Globe: pointOfView called", viewParams, transitionMs);
      // No actual implementation needed for mock
      return viewParams || {};
    },
    renderer: () => ({
      domElement: {
        getBoundingClientRect: () => ({
          width,
          height
        })
      }
    })
  }));

  // Draw a simple Earth visualization on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = width;
    canvas.height = height;

    // Create an offscreen canvas for better performance
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;
    const offscreenCtx = offscreenCanvas.getContext('2d');
    if (!offscreenCtx) return;

    // Variables for rotation animation
    let rotation = 0;
    let gradient: CanvasGradient;

    // Draw background with stars
    const drawBackground = (context: CanvasRenderingContext2D) => {
      context.fillStyle = backgroundColor;
      context.fillRect(0, 0, width, height);

      // Draw stars
      for (let i = 0; i < 200; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const radius = Math.random() * 1.5;
        const opacity = Math.random() * 0.8 + 0.2;

        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2, false);
        context.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        context.fill();
      }
    };

    // Initialize gradient once
    const initGradient = (context: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number) => {
      gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, '#2244aa');
      gradient.addColorStop(0.5, '#1133cc');
      gradient.addColorStop(1, '#001166');
      return gradient;
    };

    // Draw rotating globe
    const drawGlobe = (context: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number, rotationOffset: number) => {
      context.save();
      context.translate(centerX, centerY);
      context.rotate(rotationOffset);
      context.translate(-centerX, -centerY);

      // Draw the globe
      context.beginPath();
      context.arc(centerX, centerY, radius, 0, Math.PI * 2, false);
      context.fillStyle = gradient;
      context.fill();

      // Draw "continents" (simplified)
      for (let i = 0; i < 5; i++) {
        const continentRadius = radius * (0.2 + i * 0.1);
        const continentAngle = (Math.PI * 2 / 5) * i + rotationOffset;
        const continentX = centerX + Math.cos(continentAngle) * continentRadius;
        const continentY = centerY + Math.sin(continentAngle) * continentRadius;
        
        // Draw irregular shapes for continents
        context.beginPath();
        context.moveTo(continentX, continentY);
        
        for (let j = 0; j < 8; j++) {
          const angle = (Math.PI * 2 / 8) * j + Math.random() * 0.5;
          const distance = radius * (0.05 + Math.random() * 0.15);
          const x = continentX + Math.cos(angle) * distance;
          const y = continentY + Math.sin(angle) * distance;
          context.lineTo(x, y);
        }
        
        context.closePath();
        context.fillStyle = '#00cc44';
        context.fill();
      }

      // Draw grid lines
      context.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      context.lineWidth = 0.5;

      // Longitude lines
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI / 8) * i;
        context.beginPath();
        context.moveTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
        context.lineTo(centerX - Math.cos(angle) * radius, centerY - Math.sin(angle) * radius);
        context.stroke();
      }

      // Latitude lines
      for (let i = 1; i <= 4; i++) {
        const latRadius = (radius / 4) * i;
        context.beginPath();
        context.arc(centerX, centerY, latRadius, 0, Math.PI * 2, false);
        context.stroke();
      }

      context.restore();
    };

    // Draw data points
    const drawDataPoints = (context: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number, points: any[], rotationOffset: number) => {
      if (!points || points.length === 0) return;

      points.forEach(point => {
        if (typeof point.lat !== 'number' || typeof point.lng !== 'number') return;
        
        // Convert lat/lng to x,y with rotation
        const lng = (point.lng / 180) * Math.PI + rotationOffset;
        const lat = (point.lat / 90) * (Math.PI / 2);
        
        const x = centerX + Math.cos(lng) * Math.cos(lat) * radius * 0.9;
        const y = centerY + Math.sin(lat) * radius * 0.9;
        
        const dotSize = point.size ? point.size * 15 : 5;
        
        context.fillStyle = point.color || '#ff5500';
        context.beginPath();
        context.arc(x, y, dotSize, 0, Math.PI * 2, false);
        context.fill();

        // Add glow effect
        const glow = context.createRadialGradient(x, y, 0, x, y, dotSize * 2);
        glow.addColorStop(0, point.color || '#ff5500');
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        
        context.fillStyle = glow;
        context.beginPath();
        context.arc(x, y, dotSize * 2, 0, Math.PI * 2, false);
        context.fill();
      });
    };

    // Draw arcs between points
    const drawArcs = (context: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number, arcs: any[], arcOffset: number) => {
      if (!arcs || arcs.length === 0) return;
      
      arcs.forEach(arc => {
        if (typeof arc.startLat !== 'number' || typeof arc.startLng !== 'number' || 
            typeof arc.endLat !== 'number' || typeof arc.endLng !== 'number') return;
        
        // Convert lat/lng to x,y coordinates
        const startX = centerX + Math.cos(arc.startLng / 180 * Math.PI) * Math.cos(arc.startLat / 90 * (Math.PI / 2)) * radius * 0.9;
        const startY = centerY + Math.sin(arc.startLat / 90 * (Math.PI / 2)) * radius * 0.9;
        
        const endX = centerX + Math.cos(arc.endLng / 180 * Math.PI) * Math.cos(arc.endLat / 90 * (Math.PI / 2)) * radius * 0.9;
        const endY = centerY + Math.sin(arc.endLat / 90 * (Math.PI / 2)) * radius * 0.9;
        
        // Control point for curved arc (project outward from the center)
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        
        // Get vector from center to midpoint
        const vx = midX - centerX;
        const vy = midY - centerY;
        const vLength = Math.sqrt(vx * vx + vy * vy);
        
        // Normalize and scale to create a bulge in the arc
        const bulge = radius * 0.2;
        const controlX = midX + (vx / vLength) * bulge;
        const controlY = midY + (vy / vLength) * bulge;
        
        // Draw the arc path
        context.beginPath();
        context.moveTo(startX, startY);
        context.quadraticCurveTo(controlX, controlY, endX, endY);
        
        // Create animated dashed line
        context.setLineDash([5, 15]);
        context.lineDashOffset = -arcOffset * 40; // Animation speed
        context.strokeStyle = arc.color || 'rgba(255, 255, 100, 0.7)';
        context.lineWidth = arc.arcStroke || 2;
        context.stroke();
        context.setLineDash([]);
        
        // Draw a small circle at the current point along the arc
        const t = (arcOffset * 3) % 1; // Animation progress (0-1)
        const curveX = startX + t * (controlX - startX) + t * t * (endX - 2 * controlX + startX);
        const curveY = startY + t * (controlY - startY) + t * t * (endY - 2 * controlY + startY);
        
        context.beginPath();
        context.arc(curveX, curveY, 3, 0, Math.PI * 2);
        context.fillStyle = 'rgba(255, 255, 100, 0.9)';
        context.fill();
      });
    };

    // Main animation loop
    let arcOffset = 0;
    let lastTime = 0;
    
    const animate = (time: number) => {
      if (!canvasRef.current) return;
      
      // Calculate time delta for smooth animation
      const delta = lastTime ? (time - lastTime) / 1000 : 0.016;
      lastTime = time;
      
      // Update animation variables
      rotation += 0.05 * delta; // Adjust rotation speed
      arcOffset = (arcOffset + 0.1 * delta) % 1;
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) / 3;
      
      // Initialize gradient if needed
      if (!gradient) {
        gradient = initGradient(ctx, centerX, centerY, radius);
      }
      
      // Draw background with stars
      drawBackground(ctx);
      
      // Draw the rotating globe
      drawGlobe(ctx, centerX, centerY, radius, rotation);
      
      // Draw connecting arcs
      drawArcs(ctx, centerX, centerY, radius, props.arcsData, arcOffset);
      
      // Draw data points on top
      drawDataPoints(ctx, centerX, centerY, radius, pointsData, rotation);
      
      // Continue animation
      requestAnimationFrame(animate);
    };
    
    // Start animation
    const animationFrame = requestAnimationFrame(animate);
    
    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [width, height, backgroundColor, globeImageUrl, pointsData, props.arcsData]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onGlobeClick) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convert x,y to lat,lng (very approximate)
    const centerX = width / 2;
    const centerY = height / 2;
    
    const lng = ((x - centerX) / (width / 3)) * 180;
    const lat = ((centerY - y) / (height / 3)) * 90;
    
    onGlobeClick({ lat, lng });
  };

  return (
    <div 
      className="mock-globe-container" 
      style={{ 
        width: `${width}px`, 
        height: `${height}px`,
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <canvas 
        ref={canvasRef} 
        onClick={handleClick}
        style={{
          width: '100%',
          height: '100%'
        }}
      />
    </div>
  );
});

export default MockGlobe;