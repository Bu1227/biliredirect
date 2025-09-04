import express from 'express';
import fetch from 'node-fetch';

const app = express();
const PORT = 30000; // 使用不同的端口避免衝突
const BASE_URL = 'http://localhost'; // 可自訂的網址，視需求加上port

// Bilibili API 請求頭設置
const BILI_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.bilibili.com/',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site'
};

// 從 URL 中提取 BVID
function extractBvidFromUrl(url) {
    if (!url) return null;
    
    // 支持多種格式的 B站 URL
    let match = url.match(/(?=BV).*?(?=\?|\/|$)/);
    if (match) return match[0];
    
    match = url.match(/bvid=(BV[a-zA-Z0-9]+)/);
    if (match) return match[1];
    
    match = url.match(/\/video\/(BV[a-zA-Z0-9]+)/);
    if (match) return match[1];
    
    return null;
}

// 獲取視頻 CDN URL
async function getVideoCdnUrl(bvid) {
    try {
        // 步驟 1: 獲取視頻的 cid
        const pageListUrl = `https://api.bilibili.com/x/player/pagelist?bvid=${bvid}`;
        const pageListResponse = await fetch(pageListUrl, { headers: BILI_HEADERS });
        const pageListData = await pageListResponse.json();

        if (pageListData.code !== 0 || !pageListData.data || pageListData.data.length === 0) {
            throw new Error('無法獲取視頻信息，可能視頻不存在或已被刪除');
        }

        const cid = pageListData.data[0].cid; // 取第一個分P
        console.log(`BVID: ${bvid}, CID: ${cid}`);

        // 步驟 2: 獲取播放 URL
        const playUrlApi = `https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=116&type=&otype=json&platform=html5&high_quality=1`;
        const playUrlResponse = await fetch(playUrlApi, { 
            headers: {
                ...BILI_HEADERS,
                'Referer': `https://www.bilibili.com/video/${bvid}`
            }
        });
        const playUrlData = await playUrlResponse.json();

        if (playUrlData.code !== 0) {
            throw new Error(`獲取播放地址失敗: ${playUrlData.message || '未知錯誤'}`);
        }

        // 步驟 3: 提取 CDN URL
        let cdnUrl = null;

        // 優先嘗試 durl 格式 (FLV/MP4)
        if (playUrlData.data && playUrlData.data.durl && playUrlData.data.durl.length > 0) {
            cdnUrl = playUrlData.data.durl[0].url;
        }
        // 備用: DASH 格式
        else if (playUrlData.data && playUrlData.data.dash && playUrlData.data.dash.video && playUrlData.data.dash.video.length > 0) {
            cdnUrl = playUrlData.data.dash.video[0].baseUrl;
        }

        if (!cdnUrl) {
            throw new Error('未找到可用的 CDN 播放地址');
        }

        return cdnUrl;

    } catch (error) {
        throw new Error(`解析失敗: ${error.message}`);
    }
}

// 主路由 - 處理 /?url= 請求
app.get('/', async (req, res) => {
    const videoUrl = req.query.url;

    // 檢查是否提供了 URL 參數
    if (!videoUrl) {
        return res.status(200).send(`
            <!DOCTYPE html>
            <html lang="zh-TW">
            <head>
                <meta charset="UTF-8">
                <title>BiliRedirect 工具介紹</title>
                <style>
                    body { font-family: Arial, sans-serif; background: #f7f7f7; color: #222; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #ccc; padding: 32px; }
                    h1 { color: #00a1d6; }
                    code { background: #eee; padding: 2px 6px; border-radius: 4px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>BiliRedirect</h1>
                    <p>這是一個 Bilibili 影片 CDN 直連工具，能將 B站影片連結自動解析並重導向到原始播放鏈接。</p>
                    <h2>使用方法</h2>
                    <ol>
                        <li>在網址列輸入：<br>
                            <code>${BASE_URL}/?url=你的B站影片連結</code>
                        </li>
                        <li>系統會自動解析並重導向到 CDN 播放鏈接。</li>
                    </ol>
                    <h2>範例</h2>
                    <code>${BASE_URL}/?url=https://www.bilibili.com/video/BV1xxxxxx</code>
                    <h2>開發者</h2>
                    <a href="https://github.com/Bu1227" target="_blank">GitHub</a>
                </div>
            </body>
            </html>
        `);
    }

    // 從 URL 中提取 BVID
    const bvid = extractBvidFromUrl(videoUrl);
    if (!bvid) {
        return res.status(400).send('錯誤: 無法從提供的 URL 中找到有效的 BVID\n\n請確保 URL 包含 BV 號碼');
    }

    console.log(`開始解析視頻: ${bvid}`);

    try {
        // 獲取 CDN URL
        const cdnUrl = await getVideoCdnUrl(bvid);
        
        console.log(`解析成功，重導向到: ${cdnUrl}`);
        
        // 直接重導向到 CDN URL
        res.redirect(302, cdnUrl);

    } catch (error) {
        console.error(`解析錯誤: ${error.message}`);
        res.status(500).send(`解析失敗: ${error.message}`);
    }
});

// 404 處理
app.use((req, res) => {
    res.status(404).send(`404 - 頁面不存在\n\n使用方法: ${BASE_URL}/?url=B站影片連結\n\n將自動重導向到視頻播放連結`);
});

// 啟動服務器
app.listen(PORT, () => {
    console.log(`🚀 B站視頻重導向服務已啟動`);
    console.log(`🌐 服務地址: ${BASE_URL}`);
    console.log(`📝 使用方法: ${BASE_URL}/?url=B站影片連結`);
});

// 優雅關閉
process.on('SIGINT', () => {
    console.log('\n🛑 正在關閉服務...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 正在關閉服務...');
    process.exit(0);
});
