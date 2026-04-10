declare module 'react-simple-maps' {
  import type { CSSProperties, MouseEvent, ReactNode } from 'react';

  interface Geography {
    rsmKey: string;
    [key: string]: unknown;
  }

  interface GeographiesChildrenProps {
    geographies: Geography[];
  }

  interface ComposableMapProps {
    projection?: string;
    projectionConfig?: Record<string, unknown>;
    style?: CSSProperties;
    children?: ReactNode;
  }

  interface GeographiesProps {
    geography: string;
    children: (props: GeographiesChildrenProps) => ReactNode;
  }

  interface GeographyProps {
    key?: string;
    geography: Geography;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    style?: {
      default?: CSSProperties;
      hover?: CSSProperties;
      pressed?: CSSProperties;
    };
  }

  interface MarkerProps {
    key?: string;
    coordinates: [number, number];
    onMouseEnter?: (e: MouseEvent) => void;
    onMouseLeave?: () => void;
    children?: ReactNode;
  }

  export const ComposableMap: React.FC<ComposableMapProps>;
  export const Geographies: React.FC<GeographiesProps>;
  export const Geography: React.FC<GeographyProps>;
  export const Marker: React.FC<MarkerProps>;
}
