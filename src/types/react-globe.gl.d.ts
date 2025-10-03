declare module 'react-globe.gl' {
  import { ComponentType, Ref } from 'react';
  
  interface GlobeProps {
    ref?: Ref<any>;
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
  
  const Globe: ComponentType<GlobeProps>;
  export default Globe;
}