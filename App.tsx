import React, { useState, useMemo, useCallback } from 'react';
import Scene3D from './components/Scene3D';
import Sidebar from './components/Sidebar';
import GeminiConfig from './components/GeminiConfig';
import { TownConfig, Store, StoreType, LevelVisibility, AIAnalysisResult } from './types';
import { TOWN_CONFIGS, CPT_CONFIG } from './constants';
import { MousePointer2, ChevronDown, ChevronUp, Layers, Rotate3d, Move, ZoomIn, Settings } from 'lucide-react';
import { analyzeCommercialLayout, getGeminiApiKey } from './services/geminiService';

const Legend = () => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="absolute top-4 right-4 z-10 w-64 bg-white/90 backdrop-blur-md rounded-xl shadow-2xl border border-slate-200 overflow-hidden transition-all">
            <div 
                className="bg-slate-800 text-white p-3 flex justify-between items-center cursor-pointer select-none"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2">
                    <Layers size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">圖例與說明</span>
                </div>
                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
            
            {isOpen && (
                <div className="p-4 space-y-4">
                    {/* Map Legend */}
                    <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2">視覺圖例</h4>
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full border border-black bg-indigo-500/30 flex items-center justify-center relative">
                                    <div className="absolute inset-0 border border-black rounded-full opacity-50"></div>
                                </div>
                                <div className="text-xs text-slate-600">
                                    <div className="font-bold">商品圈 (Market Range)</div>
                                    <div className="text-[10px] text-slate-400">有色區塊 + 黑色邊框</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full border-2 border-indigo-500 bg-white/90 flex items-center justify-center">
                                </div>
                                <div className="text-xs text-slate-600">
                                    <div className="font-bold">商閾 (Threshold)</div>
                                    <div className="text-[10px] text-slate-400">白色區塊 + 彩色邊框</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-200"></div>

                    {/* Controls */}
                    <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                            <MousePointer2 size={10} /> 操作說明
                        </h4>
                        <ul className="text-xs text-slate-600 space-y-2">
                            <li className="flex justify-between items-center">
                                <span className="flex items-center gap-1.5"><Rotate3d size={12} className="text-slate-400"/> 旋轉視角</span>
                                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px] border border-slate-200">左鍵拖曳</span>
                            </li>
                            <li className="flex justify-between items-center">
                                <span className="flex items-center gap-1.5"><Move size={12} className="text-slate-400"/> 平移地圖</span>
                                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px] border border-slate-200">右鍵拖曳</span>
                            </li>
                            <li className="flex justify-between items-center">
                                <span className="flex items-center gap-1.5"><ZoomIn size={12} className="text-slate-400"/> 縮放視圖</span>
                                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px] border border-slate-200">滑鼠滾輪</span>
                            </li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

const App: React.FC = () => {
  // --- State ---
  const [isConfigured, setIsConfigured] = useState<boolean>(!!getGeminiApiKey());
  const [townId, setTownId] = useState<string>('A');
  const [stores, setStores] = useState<Store[]>([]);
  const [visibility, setVisibility] = useState<LevelVisibility>({
    H: true,
    M: true,
    L: true
  });
  const [aiResult, setAiResult] = useState<AIAnalysisResult>({
    text: '',
    isAnalyzing: false
  });

  // Derived Town Config
  const town = TOWN_CONFIGS[townId];

  // --- Handlers ---

  const handleConfigComplete = () => {
    setIsConfigured(true);
  };

  const handleResetConfig = () => {
      if (window.confirm("確定要重設 API Key 嗎？這將會登出目前的 AI 顧問。")) {
          localStorage.removeItem('gemini_api_key');
          setIsConfigured(false);
      }
  };

  const handleSetTown = (id: string) => {
    if (stores.length > 0) {
        if (window.confirm("切換市場環境將清除所有已部署的商店，確定要繼續嗎？")) {
            setTownId(id);
            setStores([]);
        }
    } else {
        setTownId(id);
    }
  };

  const handleToggleVisibility = (type: StoreType) => {
    setVisibility(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const handleAddStore = (type: StoreType, xGrid: number, zGrid: number) => {
    const config = CPT_CONFIG[type];
    const newStoreBase: Omit<Store, 'effectiveRange'> = {
        id: Date.now(),
        type,
        xGrid,
        zGrid,
        position: [0, 0, 0], // Placeholder, calculated below
        customName: undefined // Uses default if undefined
    };
    
    // Add to list first (temp), calculation happens in useMemo
    setStores(prev => {
        // Simple check to avoid exact duplicate location stacking
        const exists = prev.find(s => s.xGrid === xGrid && s.zGrid === zGrid);
        if (exists) {
            alert("該位置已有商店！");
            return prev;
        }
        // We push a "raw" store, the coordinate conversion and range calc happens next
        return [...prev, newStoreBase as Store];
    });
  };

  const handleDeleteStore = (id: number) => {
    setStores(prev => prev.filter(s => s.id !== id));
  };

  const handleUpdateStoreName = (id: number, name: string) => {
      setStores(prev => prev.map(s => s.id === id ? { ...s, customName: name } : s));
  };

  const handleRunAIAnalysis = async () => {
    if (stores.length === 0) {
        alert("請先部署商店再進行 AI 分析");
        return;
    }
    setAiResult(prev => ({ ...prev, isAnalyzing: true }));
    try {
        const result = await analyzeCommercialLayout(town, processedStores);
        setAiResult({ text: result, isAnalyzing: false });
    } catch (error) {
        alert(error instanceof Error ? error.message : "分析失敗");
        setAiResult(prev => ({ ...prev, isAnalyzing: false }));
    }
  };

  // --- Core Logic: Central Place Theory Calculation ---
  const processedStores = useMemo(() => {
    const step = town.size / town.divisions;
    const halfSize = town.size / 2;

    // 1. Calculate 3D Positions
    const storesWithPos = stores.map(store => {
        // xGrid (0..N) -> World X (-half .. half)
        // Center of the cell: (index * step) + (step/2) - halfSize
        const x = (store.xGrid * step) + (step / 2) - halfSize;
        const z = (store.zGrid * step) + (step / 2) - halfSize;
        return { ...store, position: [x, 0, z] as [number, number, number] };
    });

    // 2. Calculate Competitive Ranges
    return storesWithPos.map(store => {
        const config = CPT_CONFIG[store.type];
        let minDist = Infinity;

        // Find closest competitor of SAME type
        storesWithPos.forEach(other => {
            if (store.id === other.id) return;
            if (store.type !== other.type) return;

            const dx = store.position[0] - other.position[0];
            const dz = store.position[2] - other.position[2];
            const dist = Math.sqrt(dx*dx + dz*dz);
            if (dist < minDist) minDist = dist;
        });

        // The effective range is the smaller of (Max Potential) or (Half distance to neighbor)
        const competitiveLimit = minDist === Infinity ? config.range : minDist / 2;
        const effectiveRange = Math.min(config.range, competitiveLimit);

        return { ...store, effectiveRange };
    });

  }, [stores, town]);

  return (
    <div className="flex h-screen w-screen bg-gray-100 overflow-hidden font-sans">
      
      {!isConfigured && <GeminiConfig onConfigured={handleConfigComplete} />}
        
      {/* Left Panel */}
      <Sidebar 
        town={town}
        setTownId={handleSetTown}
        stores={processedStores}
        onAddStore={handleAddStore}
        onDeleteStore={handleDeleteStore}
        onUpdateStoreName={handleUpdateStoreName}
        visibility={visibility}
        toggleVisibility={handleToggleVisibility}
        aiResult={aiResult}
        onRunAI={handleRunAIAnalysis}
      />

      {/* 3D Viewport */}
      <div className="flex-1 relative h-full bg-slate-200">
        <Scene3D 
            town={town} 
            stores={processedStores} 
            visibility={visibility}
        />
        
        {/* Floating Legend Overlay */}
        <Legend />

        {/* Reset Config Button */}
        <button 
            onClick={handleResetConfig}
            className="absolute bottom-6 right-6 z-10 p-3 bg-white/80 backdrop-blur-md rounded-full shadow-lg border border-slate-200 text-slate-500 hover:text-rose-500 hover:bg-white transition-all"
            title="重設 AI 設定"
        >
            <Settings size={20} />
        </button>
      </div>

    </div>
  );
};

export default App;