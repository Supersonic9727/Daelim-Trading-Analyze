import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api-dart': {
        target: 'https://opendart.fss.or.kr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-dart/, ''),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, _req, _res) => {
            console.log(`[DART PROXY REQUEST] Path: ${proxyReq.path}`);
            // 엄격한 한국 정부 오픈 API 방화벽 통과를 위해 Origin 및 Referer 변조 방지 설정 추가
            proxyReq.setHeader('Origin', 'https://opendart.fss.or.kr');
            proxyReq.setHeader('Referer', 'https://opendart.fss.or.kr/');
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
          });
          proxy.on('proxyRes', (proxyRes, _req, _res) => {
            console.log(`[DART PROXY RESPONSE] Status: ${proxyRes.statusCode}`);
            let body = [];
            proxyRes.on('data', (chunk) => {
              body.push(chunk);
            });
            proxyRes.on('end', () => {
              const bodyStr = Buffer.concat(body).toString();
              console.log(`[DART PROXY RESPONSE] Body: ${bodyStr.slice(0, 1000)}${bodyStr.length > 1000 ? '...' : ''}`);
            });
          });
        }
      }
    }
  }
})
