import React, { useState } from 'react';
import { Key, Save, ShieldCheck, ExternalLink } from 'lucide-react';
import { setGeminiApiKey } from '../services/geminiService';

interface GeminiConfigProps {
    onConfigured: () => void;
}

const GeminiConfig: React.FC<GeminiConfigProps> = ({ onConfigured }) => {
    const [apiKey, setApiKey] = useState('');
    const [error, setError] = useState('');

    const handleSave = () => {
        if (apiKey.trim()) {
            setGeminiApiKey(apiKey.trim());
            onConfigured();
        } else {
            setError('請輸入有效的 API Key');
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900 p-4">
            {/* Background Decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full"></div>
                <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full"></div>
            </div>

            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative animate-in fade-in zoom-in duration-500">
                <div className="bg-slate-950 p-8 text-white">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-500/20">
                            <Key size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-2xl tracking-tight">歡迎使用中地模擬器</h3>
                            <p className="text-slate-400 text-xs uppercase tracking-[0.2em] font-medium">AI 顧問初始化設定</p>
                        </div>
                    </div>
                </div>
                
                <div className="p-10 space-y-8">
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                            <ShieldCheck className="text-amber-600 shrink-0 mt-0.5" size={18} />
                            <div className="text-xs text-amber-800 leading-relaxed">
                                <span className="font-bold">隱私聲明：</span>
                                您的 API Key 將僅儲存於您的瀏覽器本地 (localStorage)，本程式不會將金鑰上傳至任何伺服器。
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="block text-sm font-bold text-slate-800 ml-1">Google Gemini API Key</label>
                            <input 
                                type="password" 
                                value={apiKey}
                                onChange={(e) => {
                                    setApiKey(e.target.value);
                                    setError('');
                                }}
                                placeholder="在此貼上您的 API Key..."
                                className={`w-full p-4 bg-slate-50 border ${error ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200'} rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-mono text-sm transition-all shadow-inner`}
                            />
                            {error && <p className="text-rose-500 text-xs font-medium ml-1">{error}</p>}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <button 
                            onClick={handleSave}
                            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-base hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-200 group"
                        >
                            <Save size={20} className="group-hover:scale-110 transition-transform" />
                            開始模擬與 AI 分析
                        </button>
                        
                        <a 
                            href="https://aistudio.google.com/app/apikey" 
                            target="_blank" 
                            rel="noreferrer" 
                            className="w-full flex items-center justify-center gap-2 py-3 text-slate-500 hover:text-indigo-600 transition-colors text-sm font-medium"
                        >
                            尚未擁有 API Key？前往申請
                            <ExternalLink size={14} />
                        </a>
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <div className="text-slate-900 font-bold text-sm">3D 環境</div>
                                <div className="text-[10px] text-slate-400 uppercase">市場視覺化</div>
                            </div>
                            <div className="border-x border-slate-100">
                                <div className="text-slate-900 font-bold text-sm">中地理論</div>
                                <div className="text-[10px] text-slate-400 uppercase">空間分析</div>
                            </div>
                            <div>
                                <div className="text-slate-900 font-bold text-sm">AI 顧問</div>
                                <div className="text-[10px] text-slate-400 uppercase">決策建議</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GeminiConfig;
