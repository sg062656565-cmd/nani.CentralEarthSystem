import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { 
  Mountain, 
  Settings, 
  RefreshCw, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  Download,
  HelpCircle,
  ChevronRight,
  X,
  Map as MapIcon,
  Box,
  Copy,
  Check,
  Activity,
  Image as ImageIcon
} from 'lucide-react';

// --- Types ---
interface TerrainFeature {
  id: string;
  label: string;
}

interface TerrainCategory {
  title: string;
  features: TerrainFeature[];
}

interface Question {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

// --- Constants ---
const GRID_SIZE = 100;
const CANVAS_SIZE = 600;

const TERRAIN_CATEGORIES: TerrainCategory[] = [
  {
    title: "基礎地形",
    features: [
      { id: "peak", label: "山峰" },
      { id: "ridge", label: "山脊" },
      { id: "valley", label: "河谷" },
      { id: "saddle", label: "鞍部" },
      { id: "slope", label: "山脊/坡" },
      { id: "cliff", label: "陡崖" },
    ]
  },
  {
    title: "河流地形",
    features: [
      { id: "meander", label: "曲流" },
      { id: "terrace", label: "河階" },
      { id: "fan", label: "沖積扇" },
      { id: "canyon", label: "峽谷" },
      { id: "delta", label: "三角洲" },
    ]
  },
  {
    title: "海岸地形",
    features: [
      { id: "marine_terrace", label: "海階" },
      { id: "sea_cliff", label: "海蝕崖" },
      { id: "sand_spit", label: "沙嘴/岬" },
      { id: "lagoon", label: "潟湖" },
      { id: "sandbar", label: "沙嘴" },
      { id: "sea_arch", label: "海蝕拱門" },
    ]
  },
  {
    title: "冰河地形",
    features: [
      { id: "cirque", label: "冰斗" },
      { id: "roche_moutonnee", label: "羊背石" },
      { id: "u_valley", label: "U型谷" },
      { id: "hanging_valley", label: "懸谷" },
      { id: "arete", label: "刃嶺" },
    ]
  },
  {
    title: "岩溶地形",
    features: [
      { id: "sinkhole", label: "滲穴" },
      { id: "polje", label: "窪地" },
      { id: "cone_karst", label: "錐狀喀斯特" },
    ]
  },
  {
    title: "火山地形",
    features: [
      { id: "volcanic_cone", label: "火山錐" },
      { id: "crater", label: "火山口" },
      { id: "caldera", label: "火口湖/陷落火山口" },
      { id: "lava_plateau", label: "熔岩台地" },
    ]
  },
  {
    title: "風成地形",
    features: [
      { id: "dune", label: "沙丘" },
      { id: "barchan", label: "新月丘" },
    ]
  }
];

// --- Helper Functions ---
const generateRandomTerrain = (size: number, minH: number, maxH: number): number[][] => {
  const grid = Array.from({ length: size }, () => Array(size).fill(0));
  
  // Add features: Ridges and Valleys
  const numFeatures = 12 + Math.floor(Math.random() * 8);
  for (let i = 0; i < numFeatures; i++) {
    const centerX = Math.random() * size;
    const centerY = Math.random() * size;
    
    // Random orientation for ridges/valleys
    const angle = Math.random() * Math.PI;
    const length = 8 + Math.random() * 20;
    const width = 4 + Math.random() * 8;
    const height = 0.4 + Math.random() * 0.8;
    
    // 30% chance of being a valley (negative height)
    const isValley = Math.random() > 0.7;
    const multiplier = isValley ? -0.6 : 1.0;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        
        // Rotate coordinates to align with feature axis
        const rx = dx * Math.cos(angle) + dy * Math.sin(angle);
        const ry = -dx * Math.sin(angle) + dy * Math.cos(angle);
        
        // Elongated Gaussian distribution
        const h = height * Math.exp(-(Math.pow(rx / length, 2) + Math.pow(ry / width, 2)));
        grid[y][x] += h * multiplier;
      }
    }
  }
  
  // Normalize and scale to requested range
  let currentMin = Infinity;
  let currentMax = -Infinity;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (grid[y][x] < currentMin) currentMin = grid[y][x];
      if (grid[y][x] > currentMax) currentMax = grid[y][x];
    }
  }
  
  const currentRange = currentMax - currentMin;
  const targetRange = maxH - minH;
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      grid[y][x] = minH + ((grid[y][x] - currentMin) / currentRange) * targetRange;
    }
  }
  
  return grid;
};

// --- Components ---

const App = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [isConfigured, setIsConfigured] = useState(false);
  
  // Parameters
  const [minHeight, setMinHeight] = useState(0);
  const [maxHeight, setMaxHeight] = useState(1000);
  const [scale, setScale] = useState("1:25,000 (通用)");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  
  // Results
  const [terrain, setTerrain] = useState<number[][]>([]);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [viewMode, setViewMode] = useState<'contour' | '3d'>('contour');
  
  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showExplanations, setShowExplanations] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState(false);
  
  // Profile Line State
  const [profileLine, setProfileLine] = useState<{ start: { x: number, y: number }, end: { x: number, y: number } } | null>(null);
  const [isDrawingProfile, setIsDrawingProfile] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      setApiKey(savedKey);
      setIsConfigured(true);
    }
    setTerrain(generateRandomTerrain(GRID_SIZE, 0, 1000));
  }, []);

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('gemini_api_key', apiKey.trim());
      setIsConfigured(true);
      setError(null);
    }
  };

  const handleResetApiKey = () => {
    localStorage.removeItem('gemini_api_key');
    setApiKey('');
    setIsConfigured(false);
  };

  const toggleFeature = (id: string) => {
    setSelectedFeatures(prev => {
      if (prev.includes(id)) return prev.filter(f => f !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  const handleGenerateContour = () => {
    setTerrain(generateRandomTerrain(GRID_SIZE, minHeight, maxHeight));
    setViewMode('contour');
    setQuestions([]);
    setGeneratedImage(null);
    setSelectedAnswers({});
    setShowExplanations({});
    setProfileLine(null); // Reset profile line on new terrain
  };

  // --- Interaction Handlers ---
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (viewMode !== 'contour') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setProfileLine({ start: { x, y }, end: { x, y } });
    setIsDrawingProfile(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingProfile || !profileLine) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setProfileLine({ ...profileLine, end: { x, y } });
  };

  const handleMouseUp = () => {
    setIsDrawingProfile(false);
  };

  const handleGenerate3D = async () => {
    if (!isConfigured) {
      setError('請先設定 Gemini API Key');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setViewMode('3d');
    
    try {
      const ai = new GoogleGenAI({ apiKey });
      const featureLabels = selectedFeatures.map(id => {
        for (const cat of TERRAIN_CATEGORIES) {
          const f = cat.features.find(feat => feat.id === id);
          if (f) return f.label;
        }
        return id;
      }).join(', ');

      const prompt = `A highly realistic, professional satellite view or high-altitude oblique aerial photograph of a natural terrain. Features: ${featureLabels || 'mountains, valleys, and ridges'}. Elevation range: ${minHeight}m to ${maxHeight}m. The image should look like a real location on Earth (e.g., Alps, Himalayas, or Grand Canyon style depending on features). Natural colors, realistic geological textures, clear shadows indicating relief. No text, no icons, no artificial overlays. 8k resolution, cinematic lighting.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
          }
        }
      });

      if (!response.candidates || response.candidates.length === 0) {
        throw new Error('模型未返回任何結果，可能是由於安全過濾器或暫時性錯誤。');
      }

      let foundImage = false;
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          setGeneratedImage(`data:image/png;base64,${part.inlineData.data}`);
          foundImage = true;
          break;
        }
      }

      if (!foundImage) {
        throw new Error('模型未返回圖像數據。' + (response.text ? ` 模型回覆：${response.text}` : ''));
      }
    } catch (err: any) {
      console.error(err);
      setError('生成 3D 地形時發生錯誤：' + (err.message || '未知錯誤'));
    } finally {
      setIsLoading(false);
    }
  };

  // --- Drawing Logic ---
  useEffect(() => {
    if (!canvasRef.current || terrain.length === 0 || viewMode !== 'contour') return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const MARGIN = 30; // ⭐ safe area
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawWidth = canvas.width - MARGIN * 2;
    const drawHeight = canvas.height - MARGIN * 2;

    const cellWidth = drawWidth / (GRID_SIZE - 1);
    const cellHeight = drawHeight / (GRID_SIZE - 1);

    const offsetX = MARGIN;
    const offsetY = MARGIN;

    // ===== 底色 (Hypsometric Tinting) =====
    for (let y = 0; y < GRID_SIZE - 1; y++) {
      for (let x = 0; x < GRID_SIZE - 1; x++) {
        const elev = terrain[y][x];
        const t = (elev - minHeight) / (maxHeight - minHeight || 1);

        let r, g, b;
        if (t < 0.2) {
          r = 200 + t * 50; g = 230; b = 180;
        } else if (t < 0.5) {
          r = 245; g = 235 - (t-0.2)*100; b = 180 - (t-0.2)*100;
        } else if (t < 0.8) {
          r = 210 - (t-0.5)*100; g = 170 - (t-0.5)*100; b = 120 - (t-0.5)*100;
        } else {
          r = 150 + (t-0.8)*500; g = 150 + (t-0.8)*500; b = 150 + (t-0.8)*500;
        }

        ctx.fillStyle = `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
        ctx.fillRect(offsetX + x * cellWidth, offsetY + y * cellHeight, cellWidth + 1, cellHeight + 1);
      }
    }

    // ===== 等高線間距 =====
    const range = maxHeight - minHeight;
    let interval = 20;
    if (range > 3000) interval = 100;
    else if (range > 1500) interval = 50;
    else if (range > 500) interval = 20;
    else interval = 10;

    const indexInterval = interval * 5;

    // ===== 畫等高線 (Marching Squares) =====
    const drawContour = (level: number, isIndex: boolean) => {
      ctx.beginPath();
      ctx.strokeStyle = isIndex ? '#5d4037' : '#8d6e63';
      ctx.lineWidth = isIndex ? 2.0 : 0.9;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const interp = (a: number, b: number, val: number) => {
        const d = b - a;
        if (Math.abs(d) < 1e-6) return 0.5; // 避免除以 0 導致斷線
        return (val - a) / d;
      };

      for (let y = 0; y < GRID_SIZE - 1; y++) {
        for (let x = 0; x < GRID_SIZE - 1; x++) {
          const v1 = terrain[y][x];
          const v2 = terrain[y][x + 1];
          const v3 = terrain[y + 1][x + 1];
          const v4 = terrain[y + 1][x];

          let c = 0;
          if (v1 >= level) c += 8;
          if (v2 >= level) c += 4;
          if (v3 >= level) c += 2;
          if (v4 >= level) c += 1;

          if (c === 0 || c === 15) continue;

          const pTop = {
            x: x + interp(v1, v2, level),
            y: y
          };
          const pRight = {
            x: x + 1,
            y: y + interp(v2, v3, level)
          };
          const pBottom = {
            x: x + (1 - interp(v4, v3, level)),
            y: y + 1
          };
          const pLeft = {
            x: x,
            y: y + (1 - interp(v1, v4, level))
          };

          const draw = (
            p1: { x: number; y: number },
            p2: { x: number; y: number }
          ) => {
            ctx.moveTo(offsetX + p1.x * cellWidth, offsetY + p1.y * cellHeight);
            ctx.lineTo(offsetX + p2.x * cellWidth, offsetY + p2.y * cellHeight);
          };

          switch (c) {
            case 1:
            case 14:
              draw(pLeft, pBottom);
              break;
            case 2:
            case 13:
              draw(pBottom, pRight);
              break;
            case 3:
            case 12:
              draw(pLeft, pRight);
              break;
            case 4:
            case 11:
              draw(pTop, pRight);
              break;
            case 5:
              draw(pTop, pRight);
              draw(pLeft, pBottom);
              break;
            case 6:
            case 9:
              draw(pTop, pBottom);
              break;
            case 7:
            case 8:
              draw(pTop, pLeft);
              break;
            case 10:
              draw(pTop, pLeft);
              draw(pBottom, pRight);
              break;
          }
        }
      }

      ctx.stroke();

      // ===== 整數標籤 =====
      if (isIndex) {
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const candidateRows = [
          Math.floor(GRID_SIZE * 0.25),
          Math.floor(GRID_SIZE * 0.5),
          Math.floor(GRID_SIZE * 0.75)
        ];

        let placed = false;

        for (const row of candidateRows) {
          if (placed) break;

          for (let x = 8; x < GRID_SIZE - 8; x++) {
            if (Math.abs(terrain[row][x] - level) < interval * 0.35) {
              const txt = Math.round(level).toString();
              const px = offsetX + x * cellWidth;
              const py = offsetY + row * cellHeight;
              const tw = ctx.measureText(txt).width;

              ctx.fillStyle = 'rgba(255,255,255,0.85)';
              ctx.fillRect(px - tw / 2 - 4, py - 8, tw + 8, 16);

              ctx.fillStyle = '#5d4037';
              ctx.fillText(txt, px, py);

              placed = true;
              break;
            }
          }
        }
      }
    };

    // 繪製所有層級 (⭐ 完全移除 .0001)
    for (let level = Math.floor(minHeight / interval) * interval; level <= maxHeight; level += interval) {
      if (level < minHeight) continue;
      const isIndex = level % indexInterval === 0;
      drawContour(level, isIndex);
    }

    // ===== 山峰標記 (Peak Markers) =====
    for (let y = 1; y < GRID_SIZE - 1; y++) {
      for (let x = 1; x < GRID_SIZE - 1; x++) {
        const val = terrain[y][x];
        if (val > maxHeight * 0.7 && 
            val > terrain[y-1][x] && val > terrain[y+1][x] &&
            val > terrain[y][x-1] && val > terrain[y][x+1]) {
          const px = offsetX + x * cellWidth;
          const py = offsetY + y * cellHeight;
          ctx.fillStyle = '#1c1917';
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('▲', px, py - 5);
          ctx.font = 'bold 10px sans-serif';
          ctx.fillText(Math.round(val).toString(), px, py + 10);
        }
      }
    }

    // ===== 指北針 (Centered Compass) =====
    ctx.save();
    ctx.translate(canvas.width - 70, 80);
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.lineTo(12, 15);
    ctx.lineTo(0, 8);
    ctx.lineTo(-12, 15);
    ctx.closePath();
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.textAlign = 'center'; // ⭐ 關鍵
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('N', 0, -35);
    ctx.restore();

    // ===== 比例尺 (Scale Bar) =====
    ctx.save();
    ctx.translate(70, canvas.height - 70);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(120, 0);
    ctx.moveTo(0, -5); ctx.lineTo(0, 5);
    ctx.moveTo(60, -5); ctx.lineTo(60, 5);
    ctx.moveTo(120, -5); ctx.lineTo(120, 5);
    ctx.stroke();
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.fillText('0', 0, 20);
    ctx.fillText('500m', 60, 20);
    ctx.fillText('1km', 120, 20);
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`比例尺 ${scale}`, 60, -15);
    ctx.restore();

    // ===== 外框 (Safe Area Border) =====
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeRect(MARGIN, MARGIN, drawWidth, drawHeight);

    // ===== 繪製剖面線 (Profile Line) =====
    if (profileLine) {
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(profileLine.start.x, profileLine.start.y);
      ctx.lineTo(profileLine.end.x, profileLine.end.y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.arc(profileLine.start.x, profileLine.start.y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(profileLine.end.x, profileLine.end.y, 5, 0, Math.PI * 2); ctx.fill();
      
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('A', profileLine.start.x, profileLine.start.y - 12);
      ctx.fillText('B', profileLine.end.x, profileLine.end.y - 12);
    }

  }, [terrain, viewMode, minHeight, maxHeight, scale, profileLine]);

  // --- Profile Chart Component ---
  const ProfileChart = () => {
    if (!profileLine || !terrain || viewMode !== 'contour') return null;

    const samples = 100;
    const profileData: number[] = [];
    
    // Convert canvas coordinates to grid coordinates
    const startX = (profileLine.start.x / CANVAS_SIZE) * (GRID_SIZE - 1);
    const startY = (profileLine.start.y / CANVAS_SIZE) * (GRID_SIZE - 1);
    const endX = (profileLine.end.x / CANVAS_SIZE) * (GRID_SIZE - 1);
    const endY = (profileLine.end.y / CANVAS_SIZE) * (GRID_SIZE - 1);

    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const gx = Math.round(startX + (endX - startX) * t);
      const gy = Math.round(startY + (endY - startY) * t);
      
      const safeX = Math.min(GRID_SIZE - 1, Math.max(0, gx));
      const safeY = Math.min(GRID_SIZE - 1, Math.max(0, gy));
      profileData.push(terrain[safeY][safeX]);
    }

    const chartWidth = 600;
    const chartHeight = 150;
    const padding = 30;

    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card mt-6 p-6 border-red-100 bg-red-50/10"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-stone-800 flex items-center gap-2">
            <Activity size={18} className="text-red-500" />
            地形剖面圖 (A - B)
          </h3>
          <span className="text-xs text-stone-400">點擊並在地圖上拖動以繪製剖面線</span>
        </div>

        <div className="relative h-[180px] w-full">
          <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none" className="overflow-visible">
            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map(t => (
              <g key={t}>
                <line 
                  x1={padding} y1={padding + (chartHeight - 2 * padding) * t} 
                  x2={chartWidth - padding} y2={padding + (chartHeight - 2 * padding) * t} 
                  stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 4"
                />
                <text x={padding - 5} y={padding + (chartHeight - 2 * padding) * t + 4} fontSize="10" textAnchor="end" fill="#9ca3af">
                  {Math.round(maxHeight - t * (maxHeight - minHeight))}m
                </text>
              </g>
            ))}

            {/* Profile Path */}
            <path
              d={`M ${profileData.map((v, i) => {
                const x = padding + (i / samples) * (chartWidth - 2 * padding);
                const y = chartHeight - padding - ((v - minHeight) / (maxHeight - minHeight || 1)) * (chartHeight - 2 * padding);
                return `${x},${y}`;
              }).join(' L ')}`}
              fill="none"
              stroke="#ef4444"
              strokeWidth="3"
              strokeLinejoin="round"
            />

            {/* Area Fill */}
            <path
              d={`M ${padding},${chartHeight - padding} L ${profileData.map((v, i) => {
                const x = padding + (i / samples) * (chartWidth - 2 * padding);
                const y = chartHeight - padding - ((v - minHeight) / (maxHeight - minHeight || 1)) * (chartHeight - 2 * padding);
                return `${x},${y}`;
              }).join(' L ')} L ${chartWidth - padding},${chartHeight - padding} Z`}
              fill="rgba(239, 68, 68, 0.1)"
            />

            {/* Labels */}
            <text x={padding} y={chartHeight - 5} fontSize="12" fontWeight="bold" fill="#ef4444">A</text>
            <text x={chartWidth - padding} y={chartHeight - 5} fontSize="12" fontWeight="bold" fill="#ef4444" textAnchor="end">B</text>
          </svg>
        </div>
      </motion.div>
    );
  };

  // --- AI Logic ---
  const generateQuestions = async () => {
    if (!isConfigured) {
      setError('請先設定 Gemini API Key');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const ai = new GoogleGenAI({ apiKey });
      const featureLabels = selectedFeatures.map(id => {
        for (const cat of TERRAIN_CATEGORIES) {
          const f = cat.features.find(feat => feat.id === id);
          if (f) return f.label;
        }
        return id;
      }).join(', ');

      const useImage = viewMode === '3d' && generatedImage;
      const parts: any[] = [
        {
          text: `你是一位地理老師。請根據以下地形參數與特徵${useImage ? '以及提供的 3D 地形實景圖' : ''}，生成 3 題適合高中程度的地理素養試題。
          
          參數：
          - 最高海拔: ${maxHeight}m
          - 最低海拔: ${minHeight}m
          - 比例尺: ${scale}
          - 地形特徵: ${featureLabels || '一般山地地形'}
          
          ${useImage ? '請仔細觀察提供的 3D 地形實景圖，題目應結合圖像中的視覺特徵（如山脊、谷地、坡度變化等）。' : ''}
          請生成包含題目、四個選項、正確答案索引(0-3)以及詳細解析的 JSON 格式。
          題目應結合等高線判讀、地形特徵辨識或土地利用建議。
          格式範例：
          [
            {
              "question": "題目內容...",
              "options": ["選項A", "選項B", "選項C", "選項D"],
              "answer": 0,
              "explanation": "解析內容..."
            }
          ]`
        }
      ];

      if (useImage) {
        const base64Data = generatedImage.split(',')[1];
        parts.push({
          inlineData: {
            mimeType: "image/png",
            data: base64Data
          }
        });
      }

      const model = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        config: {
          responseMimeType: "application/json",
        },
        contents: [
          {
            role: "user",
            parts: parts
          }
        ]
      });
      
      const response = await model;
      const text = response.text;
      const parsedQuestions = JSON.parse(text);
      setQuestions(parsedQuestions);
    } catch (err: any) {
      console.error(err);
      setError('生成試題時發生錯誤：' + (err.message || '未知錯誤'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSelect = (qIdx: number, oIdx: number) => {
    setSelectedAnswers(prev => ({ ...prev, [qIdx]: oIdx }));
    setShowExplanations(prev => ({ ...prev, [qIdx]: true }));
  };

  const downloadResult = () => {
    const link = document.createElement('a');
    if (viewMode === 'contour' && canvasRef.current) {
      link.download = 'contour-map.png';
      link.href = canvasRef.current.toDataURL('image/png');
    } else if (viewMode === '3d' && generatedImage) {
      link.download = 'terrain-3d.png';
      link.href = generatedImage;
    } else {
      return;
    }
    link.click();
  };

  const copyToClipboard = () => {
    const text = questions.map((q, i) => {
      const optionsStr = q.options.map((o, j) => `(${String.fromCharCode(65 + j)}) ${o}`).join('\n');
      return `【第 ${i + 1} 題】\n${q.question}\n\n選項：\n${optionsStr}\n\n正確答案：(${String.fromCharCode(65 + q.answer)})\n\n解析：\n${q.explanation}\n`;
    }).join('\n' + '='.repeat(30) + '\n\n');
    
    const header = `地形大師 TopoMaster - AI 地理模擬試題\n生成時間：${new Date().toLocaleString()}\n地形參數：最高 ${maxHeight}m, 最低 ${minHeight}m, 比例尺 ${scale}\n\n`;
    
    navigator.clipboard.writeText(header + text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card max-w-md w-full p-8 shadow-xl border-stone-200"
        >
          <div className="flex flex-col items-center text-center mb-8">
            <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-lg mb-4">
              <Mountain size={48} />
            </div>
            <h1 className="text-3xl font-bold text-stone-900">地形大師</h1>
            <p className="text-stone-500 mt-2">等高線與試題生成器</p>
          </div>

          <div className="space-y-6">
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex gap-3">
              <HelpCircle className="text-blue-500 shrink-0" size={20} />
              <p className="text-sm text-blue-700">
                本程式使用 Google Gemini AI 生成試題。請輸入您的 API Key 以開始使用。
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Gemini API Key</label>
              <input 
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="在此輸入您的 API Key..."
                className="input-field text-center tracking-widest"
              />
              <div className="mt-3 flex items-center justify-between text-xs text-stone-400">
                <span>金鑰儲存於瀏覽器本地</span>
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-emerald-600 hover:underline flex items-center gap-1"
                >
                  獲取金鑰 <ChevronRight size={12} />
                </a>
              </div>
            </div>

            <button 
              onClick={handleSaveApiKey}
              disabled={!apiKey.trim()}
              className="btn-primary w-full py-3 text-lg"
            >
              進入系統
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 py-6 mb-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <MapIcon className="text-emerald-600" size={32} />
            <h1 className="text-4xl font-bold text-stone-800 tracking-tight">地形大師 TopoMaster</h1>
          </div>
          <p className="text-stone-500 font-medium">AI 驅動的等高線地形圖與素養試題生成器</p>
          
          <button 
            onClick={handleResetApiKey}
            className="absolute top-6 right-6 p-2 text-stone-400 hover:text-stone-600 transition-colors"
            title="重設 API Key"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 space-y-8">
        {/* Parameters Card */}
        <div className="card space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2">最低高度 (m)</label>
              <input 
                type="number" 
                value={minHeight} 
                onChange={(e) => setMinHeight(Number(e.target.value))}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2">最高高度 (m)</label>
              <input 
                type="number" 
                value={maxHeight} 
                onChange={(e) => setMaxHeight(Number(e.target.value))}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2">比例尺</label>
              <select 
                value={scale} 
                onChange={(e) => setScale(e.target.value)}
                className="input-field appearance-none bg-white"
              >
                <option>1:5,000</option>
                <option>1:10,000</option>
                <option>1:25,000 (通用)</option>
                <option>1:50,000</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-stone-800">地形特徵 (可複選，最多 4 種)</h3>
              <span className="text-sm text-stone-400 font-medium">{selectedFeatures.length}/4</span>
            </div>
            
            <div className="space-y-6">
              {TERRAIN_CATEGORIES.map((cat, idx) => (
                <div key={idx} className="p-4 bg-stone-50/50 rounded-xl border border-stone-100">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
                    <h4 className="font-bold text-stone-700">{cat.title}</h4>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {cat.features.map(feat => (
                      <button
                        key={feat.id}
                        onClick={() => toggleFeature(feat.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                          selectedFeatures.includes(feat.id)
                            ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-100"
                            : "bg-white border-stone-200 text-stone-600 hover:border-emerald-300"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                          selectedFeatures.includes(feat.id) ? "border-white" : "border-stone-300"
                        }`}>
                          {selectedFeatures.includes(feat.id) && <Check size={12} />}
                        </div>
                        {feat.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-stone-100">
            <button 
              onClick={handleGenerateContour}
              className="flex items-center justify-center gap-2 py-4 bg-stone-800 text-white rounded-xl font-bold hover:bg-stone-900 transition-all shadow-lg shadow-stone-200"
            >
              <MapIcon size={20} />
              生成等高線圖
            </button>
            <button 
              onClick={handleGenerate3D}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
            >
              {isLoading && viewMode === '3d' ? <RefreshCw size={20} className="animate-spin" /> : <Box size={20} />}
              生成 3D 地形模擬
            </button>
          </div>
        </div>

        {/* Display Area */}
        <div className="space-y-6">
          <div className="card overflow-hidden p-0">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-white">
              <h3 className="font-bold text-stone-800 flex items-center gap-2">
                {viewMode === 'contour' ? <MapIcon size={18} className="text-emerald-600" /> : <Box size={18} className="text-blue-600" />}
                {viewMode === 'contour' ? "等高線地形圖" : "3D 地形模擬實景"}
              </h3>
              <div className="flex gap-2">
                {(viewMode === 'contour' || generatedImage) && (
                  <button 
                    onClick={downloadResult}
                    className="flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 font-bold transition-colors"
                  >
                    <Download size={18} />
                    下載 JPG
                  </button>
                )}
                <button 
                  onClick={generateQuestions}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold transition-colors disabled:opacity-50"
                >
                  {isLoading && !generatedImage ? <RefreshCw size={18} className="animate-spin" /> : <FileText size={18} />}
                  立即產出 AI 模擬試題
                </button>
              </div>
            </div>
            
            <div className="bg-stone-100 flex flex-col items-center justify-center min-h-[400px] relative p-8">
              {viewMode === 'contour' ? (
                <div className="w-full flex flex-col items-center">
                  <canvas 
                    ref={canvasRef} 
                    width={CANVAS_SIZE} 
                    height={CANVAS_SIZE}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    className="max-w-full h-auto shadow-2xl bg-white cursor-crosshair"
                  />
                  <ProfileChart />
                </div>
              ) : (
                <div className="w-full aspect-square max-w-[600px] relative">
                  {isLoading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-100/80 z-10">
                      <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                      <p className="text-blue-700 font-bold animate-pulse">正在生成真實地形實景...</p>
                    </div>
                  ) : generatedImage ? (
                    <img 
                      src={generatedImage} 
                      alt="Generated Terrain" 
                      className="w-full h-full object-cover shadow-2xl"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-400">
                      <Box size={64} className="mb-4 opacity-20" />
                      <p>點擊「生成 3D 地形模擬」以產出實景圖</p>
                    </div>
                  )}
                </div>
              )}

              {/* AI Generation Disclaimer and Buttons - Requested by User */}
              {(viewMode === 'contour' || generatedImage) && !isLoading && (
                <div className="w-full flex flex-col items-center mt-8">
                  <div className="px-6 py-3 bg-yellow-50 border border-yellow-100 rounded-full flex items-center gap-2 text-yellow-700 text-sm mb-3 shadow-sm">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>此為 AI 生成，如有失真、疑慮或非必要文字，可選擇再次生成</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-stone-400 text-xs mb-8">
                    <Activity size={14} />
                    <span>備註：地圖方位為「北方朝上」</span>
                  </div>

                  <div className="w-full max-w-2xl bg-white border border-stone-100 rounded-2xl p-6 flex flex-col sm:flex-row gap-4 shadow-sm">
                    <button 
                      onClick={downloadResult}
                      className="flex-1 flex items-center justify-center gap-2 py-4 px-6 border-2 border-stone-100 rounded-xl text-stone-700 font-bold hover:bg-stone-50 transition-all active:scale-95"
                    >
                      <Download size={20} />
                      下載圖片 (PNG)
                    </button>
                    <button 
                      onClick={viewMode === 'contour' ? handleGenerateContour : handleGenerate3D}
                      className="flex-1 flex items-center justify-center gap-2 py-4 px-6 border-2 border-stone-100 rounded-xl text-stone-700 font-bold hover:bg-stone-50 transition-all active:scale-95"
                    >
                      <RefreshCw size={20} />
                      再次生成
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Questions Section */}
          <AnimatePresence>
            {(questions.length > 0 || isLoading) && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card"
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-stone-800 flex items-center gap-3">
                    <FileText className="text-emerald-600" size={28} />
                    AI 模擬試題
                  </h2>
                  <button 
                    onClick={copyToClipboard}
                    className="flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 font-bold transition-all active:scale-95"
                  >
                    {copied ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} />}
                    {copied ? "已複製" : "複製試題"}
                  </button>
                </div>

                {isLoading && !questions.length ? (
                  <div className="py-12 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-emerald-700 font-bold animate-pulse">AI 正在編寫地理試題...</p>
                  </div>
                ) : (
                  <div className="space-y-12">
                    {questions.map((q, qIdx) => (
                      <div key={qIdx} className="space-y-6 pb-8 border-b border-stone-100 last:border-0">
                        <div className="flex gap-4">
                          <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-600 text-white font-bold shrink-0 shadow-md shadow-emerald-100">
                            {qIdx + 1}
                          </span>
                          <p className="text-lg font-bold text-stone-800 leading-relaxed">{q.question}</p>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 ml-12">
                          {q.options.map((opt, oIdx) => {
                            const isSelected = selectedAnswers[qIdx] === oIdx;
                            const isCorrect = q.answer === oIdx;
                            const showResult = showExplanations[qIdx];
                            
                            let btnClass = "text-left px-5 py-4 rounded-xl border-2 transition-all duration-200 font-medium ";
                            if (showResult) {
                              if (isCorrect) btnClass += "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm";
                              else if (isSelected) btnClass += "bg-red-50 border-red-500 text-red-700";
                              else btnClass += "bg-stone-50 border-stone-100 text-stone-400 opacity-60";
                            } else {
                              btnClass += "bg-white border-stone-100 hover:border-emerald-200 hover:bg-emerald-50/50 text-stone-700 hover:shadow-md";
                            }

                            return (
                              <button 
                                key={oIdx}
                                disabled={showResult}
                                onClick={() => handleAnswerSelect(qIdx, oIdx)}
                                className={btnClass}
                              >
                                <div className="flex items-center justify-between">
                                  <span>{String.fromCharCode(65 + oIdx)}. {opt}</span>
                                  {showResult && isCorrect && <CheckCircle2 size={20} className="text-emerald-600" />}
                                  {showResult && isSelected && !isCorrect && <AlertCircle size={20} className="text-red-600" />}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {showExplanations[qIdx] && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="ml-12 p-6 bg-stone-50 rounded-2xl border border-stone-200 overflow-hidden"
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div>
                              <h4 className="font-bold text-stone-400 uppercase tracking-widest text-xs">詳細解析</h4>
                            </div>
                            <p className="text-stone-600 leading-relaxed font-medium">{q.explanation}</p>
                          </motion.div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-20 py-12 bg-white border-t border-stone-200 text-center">
        <div className="flex items-center justify-center gap-2 mb-2 text-stone-400">
          <MapIcon size={16} />
          <span className="font-bold tracking-widest text-xs uppercase">TopoMaster</span>
        </div>
        <p className="text-stone-400 text-sm font-medium">© 2026 地形大師 - 專業地理教育工具</p>
        <div className="mt-4 flex justify-center gap-4">
          <div className="px-3 py-1 bg-stone-100 rounded-full text-[10px] font-bold text-stone-400 uppercase tracking-tighter">Powered by Gemini AI</div>
        </div>
      </footer>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  // @ts-ignore
  if (!window._root) {
    // @ts-ignore
    window._root = createRoot(container);
  }
  // @ts-ignore
  window._root.render(<App />);
}
