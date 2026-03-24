# 中地體系模擬器 (Commercial Assessment Tool)

這是一個基於「中地體系 (Central Place Theory)」的商業選址模擬工具，提供 3D 視覺化環境來評估市場商閾、商品圈與競爭動態。

## 主要功能

- **3D 市場環境**：支援都會區、市鎮區與鄉村區三種不同密度的模擬環境。
- **商業據點部署**：可自由部署高級 (百貨)、中級 (超市)、低級 (超商) 三種等級的商店。
- **動態競爭計算**：自動計算商店間的競爭關係，並即時更新有效商品圈。
- **AI 商業顧問**：整合 Google Gemini AI，針對目前的商店分佈提供專業的市場分析與選址建議。

## AI 顧問設定說明

本專案使用 Google Gemini API 提供智慧分析功能。為了確保您的隱私與安全，請遵循以下步驟：

1. **取得 API Key**：請至 [Google AI Studio](https://aistudio.google.com/app/apikey) 免費申請 API Key。
2. **於網頁介面輸入**：點擊網頁右下角的「設定 AI」按鈕。
3. **儲存金鑰**：在彈出的視窗中貼上您的 API Key 並儲存。
    - *註：您的 API Key 將僅儲存於瀏覽器的本地儲存空間 (localStorage)，不會上傳至任何伺服器。*

## 技術架構

- **前端**：React 19, TypeScript, Tailwind CSS
- **3D 渲染**：Three.js, @react-three/fiber, @react-three/drei
- **AI 整合**：@google/genai (Gemini 1.5 Flash)
- **部署**：Cloudflare Pages

## 開發者資訊

本專案遵循 Cloudflare Pages 部署規範，確保在靜態託管環境下能正確運行。
