declare module 'react-native-svg-charts' {
  import type { ReactNode } from 'react'
  import type { ViewStyle } from 'react-native'

  interface ChartData {
    value: number
    svg?: {
      fill?: string
      stroke?: string
      strokeWidth?: number
    }
    [key: string]: unknown
  }

  interface BarChartProps {
    data: ChartData[]
    style?: ViewStyle
    contentInset?: {
      top?: number
      bottom?: number
      left?: number
      right?: number
    }
    spacingInner?: number
    spacingOuter?: number
    gridMin?: number
    gridMax?: number
    children?: ReactNode
  }

  interface AreaChartProps {
    data: ChartData[]
    style?: ViewStyle
    yAccessor?: (props: { item: ChartData }) => number
    xAccessor?: (props: { index: number }) => number
    contentInset?: {
      top?: number
      bottom?: number
      left?: number
      right?: number
    }
    curve?: (context: unknown) => unknown
    svg?: {
      fill?: string
      stroke?: string
      strokeWidth?: number
    }
    children?: ReactNode
  }

  interface GridProps {
    svg?: {
      stroke?: string
      strokeWidth?: number
    }
  }

  export class BarChart extends React.Component<BarChartProps> {}
  export class AreaChart extends React.Component<AreaChartProps> {}
  export class Grid extends React.Component<GridProps> {}
}

declare module 'd3-shape' {
  export function curveMonotoneX(context: unknown): unknown
  export function curveNatural(context: unknown): unknown
  export function curveBumpX(context: unknown): unknown
}
