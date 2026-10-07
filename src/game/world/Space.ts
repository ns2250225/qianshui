export interface Space {
  floorY(x: number): number
  ceilY(x: number): number
  minX: number
  maxX: number
  floorColor(x: number): number
}
