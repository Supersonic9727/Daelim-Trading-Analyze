export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { ticker } = req.query;
  if (!ticker) return res.status(400).json({ error: 'ticker required' });

  // 허용된 KS 티커만 통과 (보안)
  if (!/^[0-9]{6}\.KS$/.test(ticker)) {
    return res.status(400).json({ error: 'invalid ticker format' });
  }

  try {
    // 현재가 + 1개월 일봉
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1mo&includePrePost=false`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; financial-dashboard/1.0)',
        'Accept': 'application/json',
      },
    });
    if (!response.ok) throw new Error(`Yahoo Finance ${response.status}`);
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
