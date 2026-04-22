import { GoogleGenAI } from "@google/genai";
import { Store, TownConfig } from "../types";
import { CPT_CONFIG } from "../constants";

export const getGeminiApiKey = (): string | null => {
    return localStorage.getItem('gemini_api_key');
};

export const setGeminiApiKey = (key: string) => {
    localStorage.setItem('gemini_api_key', key);
};

export const analyzeCommercialLayout = async (town: TownConfig, stores: Store[]): Promise<string> => {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
        throw new Error("請先設定 Gemini API Key");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Prepare data for AI
    const storeData = stores.map(s => ({
        type: s.type,
        name: s.customName || CPT_CONFIG[s.type].name,
        x: s.xGrid,
        z: s.zGrid,
        effectiveRange: s.effectiveRange
    }));

    const prompt = `
    你是一位專業的商業地理顧問。請根據以下「中地體系 (Central Place Theory)」模擬數據進行分析：
    
    市場環境：
    - 名稱：${town.name}
    - 總人口：${town.population}
    - 網格大小：${town.divisions}x${town.divisions}
    
    目前部署的商店：
    ${JSON.stringify(storeData, null, 2)}
    
    請提供以下分析：
    1. **市場飽和度評估**：目前的商店分佈是否過於擁擠或稀疏？
    2. **競爭動態分析**：是否有商店因為距離太近而導致「商品圈 (Range)」被嚴重壓縮？
    3. **具體建議**：建議在哪個座標新增哪種類型的商店，或者移動現有的商店以達到最大效益？
    
    請以繁體中文回答，並保持專業且具建設性的語氣。
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [{ parts: [{ text: prompt }] }],
        });
        return response.text || "無法生成分析結果。";
    } catch (error) {
        console.error("Gemini API Error:", error);
        throw new Error("AI 分析失敗，請檢查 API Key 是否正確或網路連線。");
    }
};
