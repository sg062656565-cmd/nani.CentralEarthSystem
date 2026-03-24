import React, { useState, useEffect } from 'react';
import { StoreType, TownConfig, Store, LevelVisibility, AIAnalysisResult } from '../types';
import { CPT_CONFIG, TOWN_CONFIGS } from '../constants';
import { ChevronLeft, ChevronRight, Info, Map, PlusCircle, Trash2, Eye, EyeOff, LayoutGrid, BarChart3, Settings2, CheckCircle2, Pencil, BookOpen, Sparkles, Loader2, MessageSquareText } from 'lucide-react';
import Markdown from 'react-markdown';

interface SidebarProps {
    town: TownConfig;
    setTownId: (id: string) => void;
    onAddStore: (type: StoreType, x: number, z: number) => void;
    stores: Store[];
    onDeleteStore: (id: number) => void;
    onUpdateStoreName: (id: number, name: string) => void;
    visibility: LevelVisibility;
    toggleVisibility: (type: StoreType) => void;
    aiResult: AIAnalysisResult;
    onRunAI: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
    town,
    setTownId,
    onAddStore,
    stores,
    onDeleteStore,
    onUpdateStoreName,
    visibility,
    toggleVisibility,
    aiResult,
    onRunAI
}) => {
    const [collapsed, setCollapsed] = useState(false);
    
    // Form State
    const [selectedType, setSelectedType] = useState<StoreType>('H');
    const [coordX, setCoordX] = useState<string>('');
    const [coordZ, setCoordZ] = useState<string>('');
    
    // Town Selection State (Pending confirmation)
    const [pendingTownId, setPendingTownId] = useState(town.id);

    // Sync pending state if prop changes externally
    useEffect(() => {
        setPendingTownId(town.id);
    }, [town.id]);

    const handleConfirmTown = () => {
        if (pendingTownId !== town.id) {
             setTownId(pendingTownId);
        }
    };

    const handleAdd = () => {
        const x = parseInt(coordX);
        const z = parseInt(coordZ);
        if (isNaN(x) || isNaN(z)) {
            alert("請輸入有效的整數座標");
            return;
        }
        if (x < 0 || x >= town.divisions || z < 0 || z >= town.divisions) {
            alert(`座標必須在 0 到 ${town.divisions - 1} 之間`);
            return;
        }
        onAddStore(selectedType, x, z);
        setCoordX('');
        setCoordZ('');
    };

    // Calculate totals for stats
    const totalThreshold = stores.reduce((acc, s) => acc + CPT_CONFIG[s.type].threshold, 0);
    const isOverloaded = totalThreshold > town.population;

    return (
        <div className={`relative transition-all duration-500 ease-in-out h-full flex-shrink-0 bg-slate-50 border-r border-slate-200 z-20 flex flex-col font-sans ${collapsed ? 'w-0' : 'w-full md:w-[400px]'}`}>
            
            {/* Toggle Button */}
            <button 
                onClick={() => setCollapsed(!collapsed)}
                className="absolute top-1/2 -right-10 transform -translate-y-1/2 bg-slate-800 text-white p-2 rounded-r-xl shadow-xl hover:bg-slate-700 focus:outline-none flex items-center justify-center h-12 w-10 z-50 transition-colors"
            >
                {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>

            {/* Sidebar Content */}
            <div className={`flex flex-col h-full overflow-hidden ${collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                
                {/* Header - Dark Professional Theme */}
                <div className="p-8 bg-slate-900 text-white shadow-lg relative overflow-hidden flex-shrink-0">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Map size={120} />
                    </div>
                    <div className="relative z-10">
                         <div className="flex items-center gap-3 mb-2">
                            <div className="bg-indigo-500 p-2 rounded-lg">
                                <BarChart3 size={24} className="text-white" />
                            </div>
                            <h1 className="text-xl font-bold tracking-tight">中地體系模擬器</h1>
                         </div>
                        <p className="text-slate-400 text-xs font-light tracking-wide">
                            Advanced Commercial Assessment Strategy Tool
                        </p>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto custom-scroll p-6 space-y-6">
                    
                    {/* 1. Town Setup (Market Environment) */}
                    <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                        <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 font-bold flex items-center justify-center text-xs">1</div>
                                <h2 className="font-bold text-slate-700 text-base">市場環境設定</h2>
                            </div>
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-400 px-2 py-1 rounded uppercase tracking-wider">CONFIG</span>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <select 
                                    value={pendingTownId} 
                                    onChange={(e) => setPendingTownId(e.target.value)}
                                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium"
                                >
                                    {Object.values(TOWN_CONFIGS).map(cfg => (
                                        <option key={cfg.id} value={cfg.id}>{cfg.name}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <button 
                                onClick={handleConfirmTown}
                                disabled={pendingTownId === town.id}
                                className={`w-full py-2 px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                                    pendingTownId === town.id 
                                    ? 'bg-slate-100 text-slate-400 cursor-default' 
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
                                }`}
                            >
                                <CheckCircle2 size={16} />
                                {pendingTownId === town.id ? '目前環境已載入' : '確認並生成模型'}
                            </button>

                            <div className="grid grid-cols-2 gap-4 text-xs text-slate-600 border-t border-slate-100 pt-3">
                                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                    <span className="block text-slate-400">總人口</span>
                                    <span className="font-mono font-bold text-lg">{town.population.toLocaleString()}</span>
                                </div>
                                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                    <span className="block text-slate-400">網格密度</span>
                                    <span className="font-mono font-bold text-lg">{town.divisions}×{town.divisions}</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 2. Add Store */}
                    <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2">
                            <PlusCircle size={16} className="text-slate-600"/>
                            <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wider">新增商業據點</h2>
                        </div>
                        <div className="p-5 space-y-4">
                            
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">商業類型</label>
                                <select 
                                    value={selectedType} 
                                    onChange={(e) => setSelectedType(e.target.value as StoreType)}
                                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="H">高級中地 (百貨) - 範圍 400</option>
                                    <option value="M">中級中地 (超市) - 範圍 200</option>
                                    <option value="L">低級中地 (超商) - 範圍 100</option>
                                </select>
                            </div>

                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <div className="relative">
                                         <input 
                                            type="number" 
                                            placeholder="X 座標" 
                                            value={coordX}
                                            onChange={e => setCoordX(e.target.value)}
                                            className="w-full p-2.5 pl-8 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400 outline-none text-center font-mono"
                                        />
                                        <div className="absolute left-2.5 top-2.5 w-3 h-3 rounded-full bg-red-500"></div>
                                    </div>
                                    <div className="text-[10px] text-center text-slate-400 mt-1">X 軸 (紅)</div>
                                </div>
                                <div className="flex-1">
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            placeholder="Z 座標"
                                            value={coordZ}
                                            onChange={e => setCoordZ(e.target.value)}
                                            className="w-full p-2.5 pl-8 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 outline-none text-center font-mono"
                                        />
                                        <div className="absolute left-2.5 top-2.5 w-3 h-3 rounded-full bg-blue-500"></div>
                                    </div>
                                    <div className="text-[10px] text-center text-slate-400 mt-1">Z 軸 (藍)</div>
                                </div>
                            </div>

                            <button 
                                onClick={handleAdd}
                                className="w-full bg-slate-800 text-white py-3 rounded-lg hover:bg-indigo-600 transition-all duration-300 active:scale-95 font-semibold text-sm shadow-lg flex items-center justify-center gap-2"
                            >
                                <PlusCircle size={16} />
                                部署商店
                            </button>
                        </div>
                    </section>

                    {/* 3. Analytics & Filters */}
                    <div className="grid grid-cols-1 gap-6">
                        {/* AI Analysis Button */}
                        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-5 rounded-xl shadow-lg text-white space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Sparkles size={18} className="text-indigo-200" />
                                    <h3 className="font-bold text-sm uppercase tracking-wider">AI 商業顧問分析</h3>
                                </div>
                                <div className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold">GEMINI 1.5</div>
                            </div>
                            <p className="text-xs text-indigo-100 leading-relaxed">
                                透過 AI 分析目前的商店分佈，評估市場飽和度並提供選址建議。
                            </p>
                            <button 
                                onClick={onRunAI}
                                disabled={aiResult.isAnalyzing}
                                className="w-full bg-white text-indigo-700 py-2.5 rounded-lg font-bold text-sm hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                            >
                                {aiResult.isAnalyzing ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        顧問分析中...
                                    </>
                                ) : (
                                    <>
                                        <MessageSquareText size={16} />
                                        開始智慧分析
                                    </>
                                )}
                            </button>
                        </div>

                        {/* AI Result Display */}
                        {aiResult.text && (
                            <div className="bg-white rounded-xl border border-indigo-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="bg-indigo-50 px-5 py-3 border-b border-indigo-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Sparkles size={14} className="text-indigo-600" />
                                        <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">顧問分析報告</h3>
                                    </div>
                                    <button 
                                        onClick={() => onRunAI()} 
                                        className="text-[10px] text-indigo-600 font-bold hover:underline"
                                    >
                                        重新分析
                                    </button>
                                </div>
                                <div className="p-5">
                                    <div className="prose prose-sm max-w-none text-slate-600 text-xs leading-relaxed prose-headings:text-slate-800 prose-headings:font-bold prose-p:mb-3 prose-li:mb-1">
                                        <Markdown>{aiResult.text}</Markdown>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Visibility Toggles */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">圖層顯示控制</h3>
                            <div className="flex flex-wrap gap-2">
                                {(['H', 'M', 'L'] as StoreType[]).map(type => (
                                    <button 
                                        key={type}
                                        onClick={() => toggleVisibility(type)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all border ${
                                            visibility[type] 
                                            ? 'bg-slate-100 text-slate-800 border-slate-300 ring-1 ring-slate-200' 
                                            : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        {visibility[type] ? <Eye size={12} className="text-indigo-600"/> : <EyeOff size={12}/>}
                                        {CPT_CONFIG[type].name.split(' ')[0]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Real-time Stats */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">市場評估數據</h3>
                             
                             <div className="flex justify-between items-end mb-2">
                                <span className="text-sm text-slate-600">市場飽和度</span>
                                <span className={`text-xl font-bold font-mono ${isOverloaded ? 'text-rose-500' : 'text-emerald-500'}`}>
                                    {Math.round((totalThreshold / town.population) * 100)}%
                                </span>
                             </div>
                             {/* Progress Bar */}
                             <div className="w-full bg-slate-100 rounded-full h-2 mb-4">
                                <div 
                                    className={`h-2 rounded-full transition-all duration-500 ${isOverloaded ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${Math.min((totalThreshold / town.population) * 100, 100)}%` }}
                                ></div>
                             </div>

                             <div className="grid grid-cols-3 gap-2 mt-2">
                                {(['H', 'M', 'L'] as StoreType[]).map(t => {
                                    const count = stores.filter(s => s.type === t).length;
                                    return (
                                        <div key={t} className="text-center p-2 bg-slate-50 rounded border border-slate-100">
                                            <div className="text-[10px] text-slate-400 uppercase">{t}</div>
                                            <div className="font-bold text-slate-700 text-lg">{count}</div>
                                        </div>
                                    )
                                })}
                            </div>

                            {isOverloaded && (
                                <div className="mt-3 p-2 bg-rose-50 text-rose-600 text-[10px] flex items-center gap-1 rounded font-medium">
                                    <Info size={12} />
                                    市場過度飽和，建議停止擴張
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 5. Store List */}
                     <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2">
                            <LayoutGrid size={16} className="text-slate-600"/>
                            <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wider">據點列表</h2>
                        </div>
                        <div className="p-0 overflow-y-auto max-h-60 custom-scroll">
                            {stores.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-sm italic">
                                    尚未建立任何商業據點
                                </div>
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {stores.map(store => {
                                        const defaultConfigName = CPT_CONFIG[store.type].name.split(' ')[0];
                                        return (
                                        <li key={store.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition group">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className={`w-2 h-8 rounded-full flex-shrink-0`} style={{backgroundColor: CPT_CONFIG[store.type].color}}></div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1">
                                                        <input 
                                                            type="text" 
                                                            value={store.customName ?? defaultConfigName}
                                                            onChange={(e) => onUpdateStoreName(store.id, e.target.value)}
                                                            className="text-sm font-bold text-slate-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none w-full transition-colors"
                                                            placeholder={defaultConfigName}
                                                        />
                                                        <Pencil size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                                                    </div>
                                                    <div className="text-xs text-slate-400 font-mono">
                                                        COORD: {store.xGrid}, {store.zGrid}
                                                    </div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => onDeleteStore(store.id)}
                                                className="text-slate-300 hover:text-rose-500 transition p-2 rounded-lg hover:bg-rose-50 flex-shrink-0"
                                                title="移除據點"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </li>
                                    )})}
                                </ul>
                            )}
                        </div>
                    </section>

                    {/* 6. Definitions Footer */}
                    <div className="mt-4 p-4 bg-slate-100 border border-slate-200 rounded-xl space-y-3">
                        <div className="flex items-center gap-2 text-slate-600 mb-1">
                            <BookOpen size={14} />
                            <h4 className="text-xs font-bold uppercase tracking-wider">理論概念補充</h4>
                        </div>
                        <div className="space-y-3 text-xs text-slate-500 leading-relaxed">
                            <div>
                                <strong className="text-slate-700 block mb-0.5">商品圈 (Range)</strong>
                                消費者願意移動購買該商品的最大距離，通常反映商品的吸引力與交通便利性。
                            </div>
                            <div>
                                <strong className="text-slate-700 block mb-0.5">商閾 (Threshold)</strong>
                                維持商店營運所需的最小消費人口數。若商品圈內人口小於商閾，商店難以生存。
                            </div>
                            <div>
                                <strong className="text-slate-700 block mb-0.5">中地等級 (Hierarchy)</strong>
                                依據商品特性分類。高級中地(如百貨)提供多樣且高價商品，商閾高、服務範圍廣；低級中地(如超商)則反之。
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Sidebar;