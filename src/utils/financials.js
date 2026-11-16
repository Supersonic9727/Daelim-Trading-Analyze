// 재무 데이터 조회·당분기 역산 (순수 함수)
// financialData 구조: { '2026 2Q': { [companyId]: { cfs: {...}, ofs: {...} } } }
// 각 재무제표 값은 dartApi.parseList 결과 (손익은 누계, 단위 백만원)

// 시점(잔액) 항목: 당분기 모드에서도 역산하지 않음
export const POINT_IN_TIME_METRICS = ['debtRatio', 'equity', 'currentAssets', 'currentLiabilities'];

export const prevQuarterKey = (quarterStr) => {
  const [year, q] = quarterStr.split(' ');
  return q === '1Q' ? null : `${year} ${Number(q[0]) - 1}Q`;
};

// 연결(cfs)이 없으면 별도(ofs)로 대체
export const getStatement = (financialData, companyId, quarterStr, fsDiv) => {
  const entry = financialData[quarterStr]?.[companyId];
  const hasCfs = Object.keys(entry?.cfs || {}).length > 0;
  if (fsDiv === 'cfs' && !hasCfs) return entry?.ofs || {};
  return entry?.[fsDiv] || {};
};

export const isOfsFallback = (financialData, companyId, quarterStr) => {
  const entry = financialData[quarterStr]?.[companyId];
  return Object.keys(entry?.cfs || {}).length === 0 && Object.keys(entry?.ofs || {}).length > 0;
};

// 해당 분기 공시가 있고, 당분기 모드면 역산에 필요한 직전 분기 공시도 있어야 계산 가능
export const isComputable = (financialData, companyId, quarterStr, fsDiv, isCumulative) => {
  const has = (qs) => Object.keys(getStatement(financialData, companyId, qs, fsDiv)).length > 0;
  if (!has(quarterStr)) return false;
  const prev = prevQuarterKey(quarterStr);
  if (isCumulative || !prev) return true;
  return has(prev);
};

// 누계 모드: 공시 누계 그대로 / 당분기 모드: 누계 - 직전 분기 누계 (4Q는 연간 - 3Q 누계)
// 음수 역산값도 공시 원본(환입·재분류)을 반영한 결과이므로 보정하지 않음
export const computeValue = (financialData, companyId, quarterStr, metric, fsDiv, isCumulative) => {
  const currentVal = getStatement(financialData, companyId, quarterStr, fsDiv)[metric] ?? 0;
  if (POINT_IN_TIME_METRICS.includes(metric) || isCumulative) return currentVal;
  const prev = prevQuarterKey(quarterStr);
  if (!prev) return currentVal;
  const prevVal = getStatement(financialData, companyId, prev, fsDiv)[metric] ?? 0;
  return currentVal - prevVal;
};
