# 倉管系統 Starter

第一版技術：

- Netlify：網站部署
- Supabase Auth：管理員登入
- Supabase Postgres：商品與庫存資料
- Supabase Storage：商品圖片
- PWA + RWD
- 純 HTML / CSS / JavaScript，方便新手維護

## 1. 建立 Supabase

建立 Project 後：

1. SQL Editor 執行 `supabase/schema.sql`
2. SQL Editor 執行 `supabase/storage.sql`
3. Authentication → Users → 建立管理員帳號
4. 複製該帳號 UUID
5. 執行 schema.sql 最後面的 profiles INSERT

## 2. 設定前端

打開 `js/config.js`：

- `url` 換成 Supabase Project URL
- `key` 換成公開的 publishable/anon key

不要把 service_role key 放進前端。

## 3. 本機測試

不要直接雙擊 index.html，建議使用 VS Code Live Server 或其他本機 HTTP Server。

## 4. Netlify

把整個資料夾推到 GitHub，再讓 Netlify 連 GitHub repository。

## 5. 第一版測試順序

1. 首頁能看到「白色資料夾」與「藍色資料夾」
2. 搜尋可以篩選
3. #白 / #藍 可以篩選
4. 🎲 可以隨機抽取
5. 管理員登入
6. 手機選圖片
7. 新增第三個商品
8. 回首頁確認圖片與庫存
9. 確認刪除後歷史資料設計不會被當成庫存異動刪掉

## 注意

目前「刪除商品」採軟刪除：`is_active = false`。

這樣未來的 inventory_logs 不會因為商品從前台消失而失去關聯。

第一版還沒有完成：

- 入庫 / 出庫操作頁
- 完整歷史紀錄頁
- CSV 匯出
- 編輯商品
- 圖片壓縮
- 管理員角色擴充
- 自動保活

這些等基本 CRUD 與手機上傳流程測試成功後再加。
