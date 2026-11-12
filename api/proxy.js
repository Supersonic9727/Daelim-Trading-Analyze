// DART OpenAPI 프록시 - API 키는 서버 환경변수에만 두고 클라이언트에는 노출하지 않음
const ALLOWED_PATHS = new Set([
  'api/fnlttSinglAcntAll.json',
  'api/fnlttSinglAcnt.json',
  'api/list.json',
  'api/company.json',
]);

const PARAM_RULES = {
  corp_code: /^\d{8}$/,
  bsns_year: /^\d{4}$/,
  reprt_code: /^1101[1-4]$/,
  fs_div: /^(CFS|OFS)$/,
  bgn_de: /^\d{8}$/,
  end_de: /^\d{8}$/,
  page_no: /^\d{1,4}$/,
  page_count: /^\d{1,3}$/,
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET only' });
  }

  const apiKey = process.env.DART_API_KEY || process.env.VITE_DART_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ status: 'NO_KEY', message: '서버에 DART API 키(DART_API_KEY)가 설정되지 않았습니다.' });
  }

  const { path, ...queryParams } = req.query;
  if (!ALLOWED_PATHS.has(path)) {
    return res.status(400).json({ status: 'BAD_PATH', message: '허용되지 않은 DART API 경로입니다.' });
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(queryParams)) {
    const rule = PARAM_RULES[key];
    if (!rule) continue; // crtfc_key 등 미허용 파라미터는 버림
    if (typeof value !== 'string' || !rule.test(value)) {
      return res.status(400).json({ status: 'BAD_PARAM', message: `잘못된 파라미터: ${key}` });
    }
    params.set(key, value);
  }
  params.set('crtfc_key', apiKey);

  try {
    const response = await fetch(`https://opendart.fss.or.kr/${path}?${params.toString()}`, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://opendart.fss.or.kr/',
      },
    });
    const data = await response.json();
    // 정상(000)·데이터없음(013)만 엣지 캐시 — 사용한도 초과(020) 등 일시 오류가 캐시되지 않도록
    if (data?.status === '000' || data?.status === '013') {
      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    }
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(502).json({ status: 'UPSTREAM_ERROR', message: error.message });
  }
}
