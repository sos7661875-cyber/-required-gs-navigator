Required GS Navigator — GitHub Pages 1010

將本資料夾內全部檔案上傳到新的 GitHub repository 根目錄（index.html 在最外層）。
Settings → Pages → Deploy from a branch → main → /(root) → Save。
使用發布網址在 Safari 開啟，首次連網載入後加入主畫面，再實測離線重新開啟。
GPS 需允許定位，並每次重新按 START GPS；本版本沒有代為發布 GitHub 網址。

更新：
1. CROSS TRACK 保留原本 NM 大字與箭頭；下方小字顯示 L/R 整數 YD，不加箭頭。
   使用完整精度的偏航距離換算（1 NM = 1852 / 0.9144 YD），最後四捨五入。
2. REMAINING DISTANCE 改為兩位小數，含通過航點後凍結畫面。
3. 每列 INSERT BEFORE 插入空白航點；原目標航點保持選取，後方序號順移。
4. EXPORT PLAN / IMPORT PLAN 保存航點、座標、ETA、手動磁差與選取航點。
5. 輸入後自動保存到此裝置，重新開啟恢復；定位與通過點快照不恢復。
6. IMPORT WMM 匯入官方標準 WMM.COF；保留下載的原檔供重新匯入。
   手動磁差優先，包含明填 0；空白且有模型使用當天日期、0 高度。
   即時 bearing 磁差依當下 GPS 座標；航段 MC 依該航點座標。
   無模型且未手填為 0；模型過期或無法計算會顯示錯誤，MAG 顯示 ---，不默默當 0。
   模型另存在本機，任務 JSON 不包含模型，換裝置須另外匯入 WMM.COF。

原有 ETA、地速、時間差、0.3 NM 預備與最近點後兩次距離增加凍結算法保留。
已完成程式層級測試；新增顯示、Safari 儲存／下載、定位及離線功能仍需實機驗證。
關閉一般頁面保留資料；私密瀏覽、清除網站資料、換裝置或網址後須匯入備份。

NEW PLAN：確認後清空航線與凍結紀錄，保留 WMM；停止 GPS，重新使用請按 START GPS。
