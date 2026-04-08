import { StoreConfig, TownConfig } from './types';

// Central Place Theory Configuration
// Colors updated to a professional dashboard palette (Indigo, Emerald, Amber)
// to contrast with the slate/grey city environment.
export const CPT_CONFIG: Record<string, StoreConfig> = {
  'H': { 
    name: '百貨公司 (高級)', 
    centrality: 10, 
    range: 400, 
    threshold: 50, 
    color: '#6366f1', // Indigo-500
    baseHeight: 80 
  },
  'M': { 
    name: '大型超市 (中級)', 
    centrality: 5, 
    range: 200, 
    threshold: 25, 
    color: '#10b981', // Emerald-500
    baseHeight: 40 
  },
  'L': { 
    name: '便利商店 (低級)', 
    centrality: 1, 
    range: 100, 
    threshold: 10, 
    color: '#f59e0b', // Amber-500
    baseHeight: 15 
  }
};

// Town Size Configurations
export const TOWN_CONFIGS: Record<string, TownConfig> = {
  'A': { id: 'A', name: '都會區 (高密度 / 20x20 格)', size: 1000, divisions: 20, population: 10000 },
  'B': { id: 'B', name: '市鎮區 (中密度 / 10x10 格)', size: 500, divisions: 10, population: 5000 },
  'C': { id: 'C', name: '鄉村區 (低密度 / 6x6 格)', size: 300, divisions: 6, population: 1000 }
};

// Visual Heights - Adjusted for clearer stacking
// Order: Ground -> Range (Color) -> RangeBorder (Black) -> Threshold (White) -> ThresholdBorder (Color) -> Store
export const LAYERS = {
  GROUND: 0,
  RANGE: 0.2,       // Layer 1: Market Range (Colored Area)
  RANGE_BORDER: 0.25, // Layer 1.5: Black Border for Range
  THRESHOLD: 0.4,   // Layer 2: Threshold (White Area - Must be higher to show on top)
  THRESHOLD_BORDER: 0.45, // Layer 2.5: Colored Border for Threshold
  STORE: 0.6        // Layer 3: Store Model
};