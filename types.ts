import * as THREE from 'three';

export type StoreType = 'H' | 'M' | 'L';

export interface StoreConfig {
  name: string;
  centrality: number;
  range: number;
  threshold: number;
  color: string;
  baseHeight: number;
}

export interface Store {
  id: number;
  type: StoreType;
  xGrid: number; // User entered grid coordinate
  zGrid: number; // User entered grid coordinate
  position: [number, number, number]; // 3D world position
  effectiveRange: number; // Calculated based on competition
  customName?: string; // User editable name
}

export interface TownConfig {
  id: string;
  name: string;
  size: number;     // World units
  divisions: number; // Grid cells
  population: number;
}

export interface LevelVisibility {
  H: boolean;
  M: boolean;
  L: boolean;
}

export interface AIAnalysisResult {
  text: string;
  isAnalyzing: boolean;
}
