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

// ---------------------------------------------------------
// 건자재 기업 영향 분석: 카드의 전년 대비 방향을 규칙에 따라 해석 (전망치가 아닌 참고용)
// 신축 아파트 욕실 제품(위생도기·수전·욕실장)은 착공 후 약 2년 뒤 마감 공정에서 납품되므로
// 인허가·착공·분양·수주는 1~3년 뒤 특판 수요의 선행지표로 본다.
// ---------------------------------------------------------
const pct = (v, digits = 1) => `${signed(v, digits)}%`;
const direction = (delta, threshold) => (delta == null ? null : delta > threshold ? 'up' : delta < -threshold ? 'down' : 'flat');
const toneOf = (score) => (score > 0 ? 'good' : score < 0 ? 'bad' : 'neutral');
// 받침 유무로 조사 선택 (예: 착공이 / 수주가)
const josa = (word, withFinal, withoutFinal) => {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0 ? withFinal : withoutFinal;
};

export const buildMarketImpact = (cards) => {
  const pick = (id) => cards.find((c) => c.id === id && !c.empty && c.rawDelta != null);
  const items = [];

  // 1. 신축 특판 수요 (선행지표 4종)
  const pipeline = [
    { card: pick('starts'), label: '착공' },
    { card: pick('newSupply'), label: '분양' },
    { card: pick('housingOrders'), label: '주택 수주' },
  ].filter((s) => s.card);
  const permits = pick('permits');
  if (pipeline.length || permits) {
    const dirs = pipeline.map((s) => ({ ...s, dir: direction(s.card.rawDelta, 5) }));
    const ups = dirs.filter((s) => s.dir === 'up');
    const downs = dirs.filter((s) => s.dir === 'down');
    const flats = dirs.filter((s) => s.dir === 'flat');
    // 예: name(ups, '이', '가') → "분양(+18.9%)·주택 수주(+7.2%)가"
    const name = (list, a = '', b = '') => list.map((s) => `${s.label}(${pct(s.card.rawDelta)})`).join('·') + (a ? josa(list[list.length - 1].label, a, b) : '');
    const sentences = [];
    if (ups.length && !downs.length) {
      sentences.push(`${name(ups, '이', '가')} 전년보다 늘었습니다. 착공 후 약 2년 뒤 마감 공정에서 들어가는 위생도기·수전·욕실장의 건설사 납품(특판) 물량이 늘어날 여건입니다.`);
    } else if (downs.length && !ups.length) {
      sentences.push(`${name(downs, '이', '가')} 전년보다 줄었습니다. 1~2년 뒤 건설사 납품(특판) 물량이 감소할 가능성이 큽니다.`);
    } else if (ups.length && downs.length) {
      sentences.push(`${name(ups, '은', '는')} 늘었지만 ${name(downs, '은', '는')} 줄어 신축 납품 물량은 뚜렷한 방향 없이 엇갈립니다.`);
    } else if (dirs.length) {
      sentences.push(`${name(dirs)} 모두 전년과 비슷해 신축 납품 물량은 보합이 예상됩니다.`);
    }
    if (flats.length && (ups.length || downs.length)) sentences.push(`${name(flats, '은', '는')} 전년과 비슷합니다.`);
    const permitDir = permits ? direction(permits.rawDelta, 5) : null;
    if (permitDir === 'down') sentences.push(`다만 인허가가 ${pct(permits.rawDelta)} 줄어 2~3년 뒤에는 신축 물량이 다시 줄어들 수 있습니다.`);
    else if (permitDir === 'up') sentences.push(`인허가도 ${pct(permits.rawDelta)} 늘어 2~3년 뒤까지 수요 기반이 이어질 전망입니다.`);
    const score = ups.length - downs.length + (permitDir === 'up' ? 1 : permitDir === 'down' ? -1 : 0);
    items.push({
      id: 'newBuild',
      title: '신축 아파트 납품(특판) 수요',
      horizon: '1~3년 후 매출',
      tone: toneOf(score),
      text: sentences.join(' '),
      basis: [...pipeline, permits && { card: permits, label: '인허가' }].filter(Boolean).map((s) => `${s.label} ${pct(s.card.rawDelta)}`).join(' · '),
    });
  }

  // 2. 건설사 자금·수금 리스크 (미분양, 업황BSI)
  const unsold = pick('unsold');
  const bsi = pick('bsi');
  if (unsold || bsi) {
    const sentences = [];
    let score = 0;
    if (unsold) {
      const d = direction(unsold.rawDelta, 5);
      const units = unsold.value.replace(' ', '');
      if (d === 'up') { score -= 1; sentences.push(`미분양(${units})이 전년보다 ${pct(unsold.rawDelta)} 늘었습니다. 건설사 분양대금 회수가 늦어지면 신규 착공 연기와 납품대금 회수 지연(매출채권 증가) 위험이 커집니다.`); }
      else if (d === 'down') { score += 1; sentences.push(`미분양(${units})이 전년보다 ${pct(unsold.rawDelta)} 줄어 건설사 자금 사정이 나아지는 신호입니다.`); }
      else sentences.push(`미분양(${units})은 전년과 비슷(${pct(unsold.rawDelta)})해 건설사 자금 부담이 크게 변하지 않았습니다.`);
    }
    if (bsi) {
      const level = parseFloat(bsi.value.replace(/,/g, ''));
      const d = direction(bsi.rawDelta, 2);
      const change = d === 'up' ? `전년보다 ${signed(bsi.rawDelta, 0)}p 개선됐지만` : d === 'down' ? `전년보다 ${signed(bsi.rawDelta, 0)}p 악화됐고` : '전년과 비슷하고';
      if (d === 'up') score += 1;
      if (d === 'down') score -= 1;
      // 기준선(100) 미만은 경기를 나쁘게 보는 건설사가 더 많다는 뜻이라 개선 폭과 별개로 감점
      if (level < 100) {
        score -= 1;
        sentences.push(`건설업 업황BSI(${bsi.value})는 ${change} 기준선 100을 ${level < 70 ? '크게 ' : ''}밑돌아, 건설사들은 여전히 경기를 나쁘게 보고 있습니다.`);
      } else {
        score += 1;
        sentences.push(`건설업 업황BSI(${bsi.value})는 기준선 100 이상이라 건설사 체감 경기가 양호합니다.`);
      }
    }
    items.push({
      id: 'credit',
      title: '건설사 자금·납품대금 회수',
      horizon: '수익성·현금흐름',
      tone: toneOf(score),
      text: sentences.join(' '),
      basis: [unsold && `미분양 ${pct(unsold.rawDelta)}`, bsi && `업황BSI ${bsi.value}(${bsi.change})`].filter(Boolean).join(' · '),
    });
  }

  // 3. 원가·납품 단가 압박 (공사비지수)
  const cost = pick('costIndex');
  if (cost) {
    const d = direction(cost.rawDelta, 2);
    const text = d === 'up'
      ? `주거용건물 공사비가 전년보다 ${pct(cost.rawDelta)} 올랐습니다. 원가 부담이 커진 건설사는 마감재 사양을 낮추거나 납품 단가를 깎으려 하므로, 특판 비중이 높은 기업일수록 마진이 눌릴 수 있습니다.`
      : d === 'down'
      ? `주거용건물 공사비가 전년보다 ${pct(cost.rawDelta)} 내려 건설사의 단가 인하 요구가 누그러질 여건입니다.`
      : `주거용건물 공사비 상승률이 ${pct(cost.rawDelta)}로 안정적이라 납품 단가 협상 부담이 크지 않습니다.`;
    items.push({
      id: 'cost',
      title: '원가·납품 단가 압박',
      horizon: '마진',
      tone: d === 'up' ? 'bad' : d === 'down' ? 'good' : 'neutral',
      text,
      basis: `공사비지수 ${cost.value.replace(' (2020=100)', '')} (${pct(cost.rawDelta)})`,
    });
  }

  // 4. 리모델링·교체 수요 (서울 주택가격, 연초 대비 누적)
  const price = pick('seoulPrice');
  if (price) {
    const d = direction(price.rawDelta, 1);
    const text = d === 'up'
      ? `서울 집값이 연초 대비 ${pct(price.rawDelta, 2)} 올랐습니다. 집값이 오를 때는 매매·이사가 늘면서 욕실 리모델링과 수전 교체 수요도 함께 늘어나는 경향이 있어 대리점·인테리어(소매) 채널에 우호적입니다.`
      : d === 'down'
      ? `서울 집값이 연초 대비 ${pct(price.rawDelta, 2)} 내렸습니다. 주택 거래가 위축되면 리모델링·교체 수요도 줄어드는 경향이 있어 소매 채널에 부담입니다.`
      : `서울 집값이 연초 대비 ${pct(price.rawDelta, 2)}로 보합이라 리모델링 수요에 뚜렷한 변화 요인은 없습니다.`;
    items.push({
      id: 'remodel',
      title: '리모델링·교체(소매) 수요',
      horizon: '단기 매출',
      tone: d === 'up' ? 'good' : d === 'down' ? 'bad' : 'neutral',
      text,
      basis: `서울 매매가격 연초 대비 ${pct(price.rawDelta, 2)} (서울 한정 지표)`,
    });
  }

  const count = (t) => items.filter((i) => i.tone === t).length;
  return { items, counts: { good: count('good'), neutral: count('neutral'), bad: count('bad') } };
};
