'use strict';
const backupStatus=$('backup-status');
const report=text=>{backupStatus.textContent=text;};
function download(content,type,extension){
  const blob=new Blob([content],{type}),url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;link.download=`daily-balance-${localDate()}.${extension}`;
  document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
  report('已開啟匯出。請在 iPhone 下載項目或分享選單將檔案儲存到「檔案」，並確認檔案可開啟。');
}
$('backup-json').onclick=()=>{try{const raw=localStorage.getItem(key);if(storageBlocked&&raw!==null){download(raw,'application/json;charset=utf-8','json');report('已開啟原始資料匯出。此資料格式異常，請保留檔案供修復；目前無法直接還原，勿清除瀏覽資料。');return;}download(raw===null?BalanceData.backup(state):BalanceData.backup(JSON.parse(raw)),'application/json;charset=utf-8','json');}catch{report('無法讀取紀錄，未匯出。請勿清除瀏覽資料。');}};
$('export-csv').onclick=()=>{try{const raw=localStorage.getItem(key);const data=raw===null?state:BalanceData.validate(JSON.parse(raw));download(BalanceData.csv(data),'text/csv;charset=utf-8','csv');}catch{report('資料格式無法轉為 CSV；請先使用 JSON 備份保留原始資料。');}};
let pendingImport=null,readRun=0;
$('restore-file').onchange=async()=>{
  const run=++readRun;pendingImport=null;$('restore-confirm').disabled=true;
  const file=$('restore-file').files[0];if(!file)return;
  try{
    if(file.size>20*1024*1024)throw Error('請選擇 20 MB 以下的 JSON 備份');
    // FileReader also works on iPhone versions without Blob.text().
    const text=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('無法讀取檔案'));reader.readAsText(file);});
    if(run!==readRun)return;
    pendingImport=BalanceData.parse(text);
    const preview=BalanceData.merge(state,pendingImport);
    report(`預覽：新增 ${preview.added} 筆、跳過 ${preview.duplicates} 筆重複、${preview.conflicts} 筆 ID 衝突。衝突保留目前紀錄；已有目標會保留，尚無目標時才還原備份目標。確認後才寫入。`);
    $('restore-confirm').disabled=storageBlocked;
  }catch(error){if(run===readRun)report('未匯入：'+error.message);}
};
$('restore-confirm').onclick=()=>{
  if(!pendingImport)return;
  try{
    const merged=BalanceData.merge(state,pendingImport);
    if(!merged.added&&!merged.goalsAdded){report(`沒有變更。重複 ${merged.duplicates} 筆、衝突 ${merged.conflicts} 筆（保留原紀錄）。`);return;}
    if(save(merged.data)){
      render();report(`還原完成：新增 ${merged.added} 筆、跳過 ${merged.duplicates} 筆重複、保留 ${merged.conflicts} 筆衝突原紀錄。`);
      pendingImport=null;$('restore-file').value='';$('restore-confirm').disabled=true;
    }else report('未還原。儲存失敗或其他分頁已修改資料；請先備份，再重新開啟網頁。');
  }catch(error){report('未還原：'+error.message);}
};
function connectivity(){
  $('connection-status').textContent=navigator.onLine?'目前連線中':'目前離線：可記錄、搜尋食物及備份；AI 辨識需要網路';
  if(!navigator.onLine&&typeof aiEnabled!=='undefined'){aiEnabled=false;updateAIButton();}
}
addEventListener('online',()=>{connectivity();if(typeof checkAI==='function')checkAI();});
addEventListener('offline',connectivity);connectivity();
if('serviceWorker' in navigator&&isSecureContext){
  navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(reg=>{
    const updateStatus=()=>{
      if(reg.waiting)$('offline-status').textContent='新版已準備完成；儲存餐點後，關閉所有日記視窗再開啟即可更新。';
      else if(reg.active)$('offline-status').textContent='離線功能已就緒：之後可在無網路時開啟此日記。';
    };
    updateStatus();navigator.serviceWorker.ready.then(updateStatus);
    reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',updateStatus);});
  }).catch(()=>{$('offline-status').textContent='離線功能未完成，請連線後重新開啟。現有紀錄仍在此瀏覽器。';});
}else $('offline-status').textContent='此環境無法啟用離線開啟；請使用 HTTPS 網址或本機測試伺服器。';
if(storageBlocked)report('現有資料無法安全讀取，已暫停寫入以保護舊紀錄。請先匯出 JSON 備份，勿清除瀏覽資料。');
