import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 접두사 없이 로드: DART 키는 개발 프록시에서만 쓰고 클라이언트 번들에는 넣지 않음
  const env = loadEnv(mode, process.cwd(), '')
  const dartKey = env.DART_API_KEY || env.VITE_DART_API_KEY || ''

  return {
    plugins: [react()],
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
