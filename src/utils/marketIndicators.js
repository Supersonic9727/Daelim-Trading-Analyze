// KOSIS 시계열(/api/kosis) → 시장 지표 카드 계산
// kind: cumulative(월별 누계 통계표) | flow(월계 → 연초부터 합산) | level(시점 값) | diff(시점 값, 전년 동월 차이 p) | rate(월간 변동률 %)
// good: 값이 오를 때 대림통상 관점에서 긍정(up)/부정(down)/중립(null)
export const MARKET_INDICATORS = [
  { id: 'permits', title: '주택 인허가 실적', kind: 'cumulative', unit: '호', good: 'up', source: '국토교통부', color: '#6366f1' },
  { id: 'starts', title: '주택 착공 실적', kind: 'flow', unit: '호', good: 'up', source: '국토교통부', color: '#06b6d4' },
  { id: 'newSupply', title: '신규 분양세대수', kind: 'flow', unit: '세대', good: 'up', source: '주택도시보증공사', color: '#10b981' },
  { id: 'housingOrders', title: '주택 건설수주액', kind: 'flow', unit: '조원', scale: 1 / 1_000_000, digits: 1, good: 'up', source: '국가데이터처 건설경기동향조사', color: '#14b8a6' },
  { id: 'unsold', title: '전국 미분양 주택', kind: 'level', unit: '호', good: 'down', source: '국토교통부', color: '#f97316' },
  { id: 'bsi', title: '건설업 업황실적 BSI', kind: 'diff', unit: '', good: 'up', source: '한국은행 기업경기조사', color: '#f43f5e' },
  { id: 'costIndex', title: '주거용건물 공사비지수', kind: 'level', unit: '(2020=100)', digits: 2, good: 'down', source: '한국건설기술연구원', color: '#eab308' },
  { id: 'seoulPrice', title: '서울 주택매매가격 변동률', kind: 'rate', unit: '%', digits: 2, good: null, source: '국가데이터처', color: '#a855f7' },
];

const QUARTER_END_MONTH = { '1Q': '03', '2Q': '06', '3Q': '09', '4Q': '12' };
export const quarterEndPrd = (year, quarter) => `${year}${QUARTER_END_MONTH[quarter]}`;

const fmt = (v, digits = 0) => v.toLocaleString('ko-KR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const signed = (v, digits = 1) => `${v > 0 ? '+' : ''}${fmt(v, digits)}`;
const prdLabel = (prd) => `${prd.slice(0, 4)}.${prd.slice(4)}`;

// 월별 누계 → 월별 값 (1월은 누계 그대로)
const toMonthly = (series) => series.map((p, i) => {
  const prev = series[i - 1];
  const sameYear = prev && prev.prd.slice(0, 4) === p.prd.slice(0, 4);
  return { prd: p.prd, v: sameYear ? p.v - prev.v : p.v };
});

const ytdSum = (byPrd, year, month) => {
  let sum = 0;
  for (let m = 1; m <= month; m++) {
    const v = byPrd.get(`${year}${String(m).padStart(2, '0')}`);
    if (v === undefined) return null; // 빠진 달이 있으면 누계 비교 불가
    sum += v;
  }
  return sum;
};

const buildCard = (def, data, endPrd) => {
  const base = { id: def.id, title: def.title, color: def.color, table: data?.table ? `KOSIS 통계표: ${data.table}` : '' };
  if (!data || data.error) return { ...base, empty: true, value: '조회 실패', change: '-', tone: 'neutral', desc: data?.error || '데이터 없음', chartData: [] };

  const series = data.series.filter((p) => p.prd <= endPrd);
  if (series.length === 0) return { ...base, empty: true, value: '데이터 없음', change: '-', tone: 'neutral', desc: `${def.source} · 해당 기간 미공표`, chartData: [] };

  const latest = series[series.length - 1].prd;
  const year = Number(latest.slice(0, 4));
  const month = Number(latest.slice(4));
  const mm = latest.slice(4);
  const byPrd = new Map(series.map((p) => [p.prd, p.v]));
  const monthly = def.kind === 'cumulative' ? toMonthly(series) : series;
  const scale = def.scale ?? 1;
  const digits = def.digits ?? 0;
  const lagNote = latest < endPrd ? ` (최신 공표 ${prdLabel(latest)})` : '';

  let value, change, delta, desc;
  if (def.kind === 'cumulative' || def.kind === 'flow') {
    const monthlyMap = new Map(monthly.map((p) => [p.prd, p.v]));
    const cur = def.kind === 'cumulative' ? byPrd.get(latest) : ytdSum(monthlyMap, year, month);
    const prev = def.kind === 'cumulative' ? byPrd.get(`${year - 1}${mm}`) : ytdSum(monthlyMap, year - 1, month);
    value = cur === null || cur === undefined ? '데이터 없음' : `${fmt(cur * scale, digits)} ${def.unit}`;
    delta = cur != null && prev ? (cur / prev - 1) * 100 : null;
    change = delta === null ? '-' : `${signed(delta)}%`;
    desc = `${def.source} · ${year}년 1~${month}월 누계, 전년 동기 대비${lagNote}`;
  } else if (def.kind === 'level' || def.kind === 'diff') {
    const cur = byPrd.get(latest);
    const prev = byPrd.get(`${year - 1}${mm}`);
    value = `${fmt(cur * scale, digits)}${def.unit ? ` ${def.unit}` : ''}`;
    if (prev === undefined) { delta = null; change = '-'; }
    else if (def.kind === 'diff') { delta = cur - prev; change = `${signed(delta, 0)}p`; }
    else { delta = (cur / prev - 1) * 100; change = `${signed(delta)}%`; }
    desc = `${def.source} · ${prdLabel(latest)} 기준, 전년 동월 대비${lagNote}`;
  } else {
    // rate: 기준월 전월비 변동률 + 연초 이후 누적 변동률(월간 변동률 복리 합산)
    const cur = byPrd.get(latest);
    let compound = 1;
    let complete = true;
    for (let m = 1; m <= month; m++) {
      const r = byPrd.get(`${year}${String(m).padStart(2, '0')}`);
      if (r === undefined) { complete = false; break; }
      compound *= 1 + r / 100;
    }
    value = `${signed(cur, digits)}%`;
    delta = complete ? (compound - 1) * 100 : null;
    change = delta === null ? '-' : `연초 대비 ${signed(delta, 2)}%`;
    desc = `${def.source} · ${prdLabel(latest)} 전월 대비, 배지는 ${year}년 누적${lagNote}`;
  }

  const tone = delta === null || delta === 0 || def.good === null ? 'neutral'
    : (delta > 0) === (def.good === 'up') ? 'good' : 'bad';

  return {
    ...base,
    latest,
    rawDelta: delta,
    value,
    change,
    tone,
    desc,
    chartData: monthly.slice(-12).map((p) => ({ v: p.v * scale, prd: p.prd })),
  };
};

export const buildMarketCards = (apiResult, endPrd) => {
  const indicators = apiResult?.indicators || {};
  return MARKET_INDICATORS.map((def) => buildCard(def, indicators[def.id], endPrd));
};

// 수치만으로 구성한 요약 문장 (해석·전망 문구 없음)
export const buildMarketSummary = (cards) => {
  const pick = (id) => cards.find((c) => c.id === id && !c.empty);
  const parts = [];
  const permits = pick('permits');
  const starts = pick('starts');
  const unsold = pick('unsold');
  const bsi = pick('bsi');
  const cost = pick('costIndex');
  if (permits) parts.push(`주택 인허가 누계 ${permits.value}(전년 동기 ${permits.change})`);
  if (starts) parts.push(`착공 누계 ${starts.value}(${starts.change})`);
  if (unsold) parts.push(`전국 미분양 ${unsold.value}(전년 동월 ${unsold.change})`);
  if (bsi) parts.push(`건설업 업황BSI ${bsi.value}(전년 동월 ${bsi.change})`);
  if (cost) parts.push(`주거용건물 공사비지수 ${cost.value}(${cost.change})`);
  if (parts.length === 0) return '';
  const basis = permits?.latest || cards.find((c) => c.latest)?.latest;
  return `${basis ? `${prdLabel(basis)} 기준 ` : ''}${parts.join(', ')}.`;
};
