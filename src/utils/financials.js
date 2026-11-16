// 재무 데이터 조회·당분기 계산 (순수 함수)
// financialData 구조: { '2026 2Q': { [companyId]: { cfs: {...}, ofs: {...} } } }
// 각 재무제표 값은 dartApi.parseList 결과 (손익은 누계, quarterly는 공시 3개월치, 단위 백만원)

// 시점(잔액) 항목: 당분기 모드에서도 역산하지 않음
export const POINT_IN_TIME_METRICS = ['debtRatio', 'equity', 'currentAssets', 'currentLiabilities'];

// 손익(기간) 항목
export const FLOW_METRICS = ['sales', 'operatingProfit', 'netIncome', 'profitLoss', 'sgaExpenses', 'ordinaryIncome'];

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

// 공시된 3개월치가 있으면 그 값 (분기·반기 보고서), 없으면 undefined (사업보고서 등)
const reportedQuarterValue = (statement, metric) => {
  const v = statement.quarterly?.[metric];
  return typeof v === 'number' ? v : undefined;
};

const hasAllReportedQuarterValues = (statement) =>
  FLOW_METRICS.every(metric => reportedQuarterValue(statement, metric) !== undefined);

// 해당 분기 공시가 있어야 계산 가능.
// 당분기 모드에서 공시 3개월치가 없는 보고서(4Q 사업보고서)는 직전 분기 공시도 있어야 함
export const isComputable = (financialData, companyId, quarterStr, fsDiv, isCumulative) => {
  const statement = getStatement(financialData, companyId, quarterStr, fsDiv);
  if (Object.keys(statement).length === 0) return false;
  const prev = prevQuarterKey(quarterStr);
  if (isCumulative || !prev || hasAllReportedQuarterValues(statement)) return true;
  return Object.keys(getStatement(financialData, companyId, prev, fsDiv)).length > 0;
};

// 누계 모드: 공시 누계 그대로
// 당분기 모드: 2Q·3Q는 회사가 공시한 3개월치, 그 값이 없으면(4Q) 누계 - 직전 분기 누계
// 음수 값도 공시 원본(환입·재분류)을 반영한 결과이므로 보정하지 않음
export const computeValue = (financialData, companyId, quarterStr, metric, fsDiv, isCumulative) => {
  const statement = getStatement(financialData, companyId, quarterStr, fsDiv);
  const currentVal = statement[metric] ?? 0;
  if (POINT_IN_TIME_METRICS.includes(metric) || isCumulative) return currentVal;
  const prev = prevQuarterKey(quarterStr);
  if (!prev) return currentVal;
  const reported = reportedQuarterValue(statement, metric);
  if (reported !== undefined) return reported;
  const prevVal = getStatement(financialData, companyId, prev, fsDiv)[metric] ?? 0;
  return currentVal - prevVal;
};

// ROE 기간 표시와 연환산 배수
// 당분기: 3개월치 → ×4 / 누계: n개 분기 누계 → ×4/n / 4Q 누계(연간): 그대로
const quarterNumber = (quarterStr) => Number(quarterStr.split(' ')[1][0]);

export const roePeriodLabel = (quarterStr, isCumulative) => {
  if (!isCumulative) return '분기';
  return ['1분기', '반기 누계', '3분기 누계', '연간'][quarterNumber(quarterStr) - 1];
};

export const roeAnnualizationFactor = (quarterStr, isCumulative) =>
  isCumulative ? 4 / quarterNumber(quarterStr) : 4;
