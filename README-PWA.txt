Daily Balance PWA — 本機待審核版本
日期：2026-11-26（台灣）
基準：GitHub main 3932f3d4669622e450154eee4af1aacf0083d612
沒有建立 GitHub 提交、分支、PR，也沒有部署。

功能修改
1. 保留天藍色介面及 daily-balance-v1 localStorage 格式、餐點 ID 與既有營養目標。
2. 新增 manifest、iPhone 180px Apple 圖示、192/512px 圖示與 maskable 圖示。
3. Service Worker 預先快取完整介面與食物庫，完成首次連線準備後可離線開啟、搜尋、記錄、編輯及備份。
4. 版本快取只處理本 App 介面，不快取個人餐點、照片或 AI 請求；AI 原本的啟用條件不變，離線不能辨識。
5. 更新不強迫重載，等所有舊視窗關閉後才啟用新版本；每次修改介面檔須更新 sw.js RELEASE。
6. JSON 備份包含完整餐點與目標，保留額外欄位。支援版本 1 備份及原始 {meals,goals} 格式。
7. 還原先驗證整份檔案、顯示預覽，再按確認合併。相同 ID 同內容跳過，同 ID 不同內容保留目前資料並顯示衝突筆數。既有目標保留，無目標時才還原備份目標。無效檔案整份拒絕，不做部分寫入。
8. 不用餐名或日期猜測重複；不同 ID 視為不同餐點，以免誤刪同一天吃兩份的真實紀錄。單份檔案內重複 ID 一律拒絕。
9. 沒有 fat 的舊餐點仍顯示待補；編輯舊餐點時留白仍維持未知，不自動變成 0。
10. CSV 使用 UTF-8 BOM、CRLF、雙引號跳脫，包含每份數值與總量；文字公式前綴加上單引號防護。CSV 用於 Excel 檢視，還原請用 JSON。
11. 儲存失敗不更新畫面狀態；偵測其他分頁已修改時拒絕舊狀態覆寫，需重新開啟。這是比較檢查，並非跨分頁交易鎖；建議使用單一視窗記錄。
12. 異常既有資料不會被空白資料覆寫；暫停寫入，可匯出原始內容供修復。

本機開啟
安裝 Node.js 後，在本資料夾執行：
  node serve.cjs
用瀏覽器開啟 http://127.0.0.1:4174
不要直接雙擊 index.html；file:// 無法啟用 Service Worker。

可重跑測試
  node --test data-tools.test.cjs food-ai.test.mjs
瀏覽器測試需要 Playwright（測試工具，不是產品執行依賴）：
  node browser.test.cjs
若瀏覽器不在 Playwright 預設位置，可設定 BROWSER_PATH 為 Chromium 相容瀏覽器執行檔。
本次使用系統已提供的 Playwright 與 Brave，完整環境及命令見 TEST-REPORT.txt。
make-icons.ps1 可在 Windows 以 System.Drawing 重建圖示；正式網站只需既有 PNG，不需執行此檔。

iPhone 使用與資料保護
先從原來的網址匯出 JSON，儲存在「檔案」並確認可開啟。
使用 Safari 開啟 HTTPS 正式網址，分享 → 加入主畫面 → 從圖示開啟。
確認顯示「離線功能已就緒」，檢查舊紀錄；若安裝環境未帶入紀錄，匯入先前 JSON。
開飛航模式，重新開啟，新增一筆餐點，再關閉重開確認紀錄仍在。
瀏覽器與主畫面 App 的儲存情況依 iOS 環境而異；不同網域不會自動共用舊資料。
PWA 不代表永久備份。清除網站資料、移除 App 或系統儲存回收仍可能影響本機紀錄，請定期保存外部 JSON。

部署前提（尚未執行）
需在原本來源網址以 HTTPS 提供 index.html 及完整快取清單檔案，保留原網域以延續原本 localStorage。
伺服器須將 sw.js 以 JavaScript MIME 類型提供，manifest 以 application/manifest+json 提供，不能把這些檔案導向 HTML。
上線請原子更新完整檔案組；sw.js 建議 Cache-Control: no-cache，並避免 CDN 長期固定快取。
部署檔：index.html、app.js、style.css、data-tools.js、pwa.js、sw.js、manifest.webmanifest、icons/。
同時保留原本的 catalog.js、mixer.js、photo-ai.js 及既有 AI 設定／後端；不需使用此儲存庫現有的 Babel package.json 建置。
serve.cjs、測試、報告及圖示生成檔不需上傳正式網站。

未驗證項目
實體 iPhone / iOS Safari 的加入主畫面、實際圖示裁切、安全區與鍵盤、下載與分享選單、檔案挑選、重啟後離線使用。
Safari / WebKit 引擎測試（本機沒有 Playwright WebKit 瀏覽器）。
Windows 或 iPhone Excel 實際開啟 CSV；目前驗證檔案編碼、內容及跳脫。
正式網址的 HTTPS、路徑、MIME、快取標頭、CDN、既有 Service Worker 與實際上線更新流程。
使用者裝置上的真實飲食資料未被讀取或修改；舊資料保留以符合現有格式的測試資料驗證。
真實 AI 呼叫未測試，也未新增或啟用任何付費服務。

參考
https://webkit.org/blog/14403/updates-to-storage-policy/
https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers
