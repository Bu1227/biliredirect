# BiliRedirect

一個 Bilibili 影片 CDN 直連工具，能將 B站 影片連結自動解析並重導向到原始 CDN 播放鏈接。

## 開發者的話

這個專案如果沒有人告訴我有需求或是開 issue 告訴我要改進或新增功能，應該不會再更新了。  
會做這個工具是因為有人跟我說 vrchat 上的 B站 轉址工具沒法用了，問我要不要寫一個，我就熬夜寫出這個東西，結果我做出來也架設好之後他也沒有想要用，自己還寫了更好的，那這個專案沒有存在的必要了吧

## 功能特點

- 自動解析 Bilibili 影片連結，導向到 CDN 播放地址
- 支援 Docker 部署
- 簡潔的 Web 介面

## 支援的 URL 格式

- `https://www.bilibili.com/video/BV1xxxxxx`
- `https://b23.tv/xxxxxx`
- 包含 `bvid=BV1xxxxxx` 參數的任何 URL
- 直接的 BV 號碼

## 使用方法

### 線上使用

直接在瀏覽器中訪問：
```
https://biliredirect.mwtw.net/?url=B站影片連結
```

### 本地部署

#### 方法一：Node.js 直接運行

1. 安裝依賴：
```bash
npm install
```

2. 啟動服務：
```bash
npm start
```

3. 訪問 `http://localhost:30000`

#### 方法二：Docker Compose

1. 啟動服務：
```bash
docker-compose up -d
```

2. 訪問 `http://localhost:30000`

## API 使用

### 主要端點

- **GET** `/` - 首頁，顯示工具介紹
- **GET** `/?url={bilibili_url}` - 解析並重導向到 CDN 地址

## 專案結構

```
biliredirect/
├── index.js              # 主要應用程式
├── docker-compose.yml    # Docker 部署配置
├── package.json          # Node.js 依賴管理
└── README.md             # 專案說明
```

## 核心功能說明

### URL 解析
支援從多種格式的 B站 URL 中提取 BVID：
- 完整影片頁面 URL
- 短連結 URL
- 包含參數的 URL

### CDN 解析流程
1. 通過 BVID 獲取影片的 CID
2. 使用 CID 請求播放 URL API
3. 解析回應中的 CDN 地址
4. 302 重導向到 CDN URL

### 錯誤處理
- 無效的 URL 格式
- 影片不存在或已刪除
- API 請求失敗
- 找不到可用的 CDN 地址

## 參考專案
[gujimy/BiliBili-JX](https://github.com/gujimy/BiliBili-JX)