const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'out');

exports.main = async (event) => {
  const { path: urlPath = '/', httpMethod = 'GET' } = event;
  
  // 解析路径
  let filePath = urlPath;
  if (filePath === '/' || filePath === '') {
    filePath = '/index.html';
  }
  
  // 处理 Next.js 的路由
  const cleanPath = filePath.split('?')[0];
  let localPath = path.join(outDir, cleanPath);
  
  // 如果是目录，找 index.html
  try {
    const stat = fs.statSync(localPath);
    if (stat.isDirectory()) {
      localPath = path.join(localPath, 'index.html');
    }
  } catch {
    // 尝试加 .html
    localPath = path.join(outDir, cleanPath + '.html');
  }
  
  try {
    const content = fs.readFileSync(localPath);
    const ext = path.extname(localPath);
    
    const contentTypes = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
    };
    
    const contentType = contentTypes[ext] || 'application/octet-stream';
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
      },
      body: content.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (e) {
    // 回退到 index.html（SPA 路由）
    try {
      const indexContent = fs.readFileSync(path.join(outDir, 'index.html'));
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
        body: indexContent.toString('base64'),
        isBase64Encoded: true,
      };
    } catch {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Not Found',
      };
    }
  }
};
