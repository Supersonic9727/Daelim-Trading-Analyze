import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// 로컬 개발에서 Vercel 함수(api/stock.js, api/kosis.js)를 그대로 실행하는 최소 어댑터
const localApiFunctions = (names) => ({
  name: 'local-api-functions',
  configureServer(server) {
    for (const name of names) {
      server.middlewares.use(`/api/${name}`, async (req, res) => {
        const url = new URL(req.originalUrl || req.url, 'http://local')
        const { default: handler } = await server.ssrLoadModule(`/api/${name}.js`)
        const shim = {
          setHeader: (k, v) => res.setHeader(k, v),
          status(code) { res.statusCode = code; return shim },
          json(body) { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(body)) },
          end: (body) => res.end(body),
        }
        await handler({ method: req.method, query: Object.fromEntries(url.searchParams) }, shim)
      })
    }
  },
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 접두사 없이 로드: API 키는 개발 서버(Node)에서만 쓰고 클라이언트 번들에는 넣지 않음
  const env = loadEnv(mode, process.cwd(), '')
  const dartKey = env.DART_API_KEY || ''
  process.env.KOSIS_API_KEY = env.KOSIS_API_KEY || ''

  return {
    plugins: [react(), localApiFunctions(['stock', 'kosis'])],
    server: {
      proxy: {
        '/api-dart': {
          target: 'https://opendart.fss.or.kr',
          changeOrigin: true,
          rewrite: (path) => {
            const url = new URL(path.replace(/^\/api-dart/, ''), 'http://local')
            url.searchParams.set('crtfc_key', dartKey)
            return url.pathname + url.search
          },
          headers: {
            Referer: 'https://opendart.fss.or.kr/',
          },
        },
      },
    },
  }
})
