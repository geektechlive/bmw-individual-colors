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

  export function ComposableMap(props: ComposableMapProps): ReactNode;
  export function Geographies(props: GeographiesProps): ReactNode;
  export function Geography(props: GeographyProps): ReactNode;
  export function Marker(props: MarkerProps): ReactNode;
}
