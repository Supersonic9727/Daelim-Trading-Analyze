// 정기보고서 법정 제출기한 기준으로 "현재 조회 가능한 최신 보고서 기간" 계산
// - 사업보고서: 사업연도 종료 후 90일 이내 (평년 3/31, 윤년 3/30)
// - 분기·반기보고서: 분기 종료 후 45일 이내 (5/15, 8/14, 11/14)
// - 기한 말일이 토·일·공휴일이면 그다음 영업일까지 연장 (민법 제161조)
// 날짜는 모두 UTC 자정 Date로 '달력 날짜'만 다루고, 오늘 날짜는 한국 시간(KST) 기준으로 구함

// 양력 고정 공휴일. 음력 공휴일(설·추석·부처님오신날)은 제외했으며
// 연장 구간(3/30~4/2, 5/15~5/17, 8/14~8/17, 11/14~11/16)에 걸릴 수 있는 것은 부처님오신날뿐이다.
const FIXED_HOLIDAYS = ['0101', '0301', '0505', '0606', '0815', '1003', '1009', '1225'];
// 토·일과 겹치면 대체공휴일이 생기는 고정 공휴일 (현충일·신정 제외)
const SUBSTITUTE_ELIGIBLE = ['0301', '0505', '0815', '1003', '1009', '1225'];

const utcDate = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
const isoDate = (d) => d.toISOString().slice(0, 10);
const mmdd = (d) => isoDate(d).slice(5).replace('-', '');
const addDays = (d, n) => { const r = new Date(d); r.setUTCDate(r.getUTCDate() + n); return r; };
const isWeekend = (d) => d.getUTCDay() === 0 || d.getUTCDay() === 6;
const isFixedHoliday = (d) => FIXED_HOLIDAYS.includes(mmdd(d));

const substituteHolidays = (year) => {
  const subs = new Set();
  for (const md of SUBSTITUTE_ELIGIBLE) {
    const holiday = utcDate(year, Number(md.slice(0, 2)), Number(md.slice(2)));
    if (!isWeekend(holiday)) continue;
    let d = addDays(holiday, 1);
    while (isWeekend(d) || isFixedHoliday(d) || subs.has(isoDate(d))) d = addDays(d, 1);
    subs.add(isoDate(d));
  }
  return subs;
};

export const isNonBusinessDay = (d) => isWeekend(d) || isFixedHoliday(d) || substituteHolidays(d.getUTCFullYear()).has(isoDate(d));

// periodEnd + days일이 기한, 비영업일이면 다음 영업일로 연장
export const filingDeadline = (periodEnd, days) => {
  let d = addDays(periodEnd, days);
  while (isNonBusinessDay(d)) d = addDays(d, 1);
  return d;
};

const QUARTER_END = { '1Q': [3, 31], '2Q': [6, 30], '3Q': [9, 30], '4Q': [12, 31] };
export const deadlineOf = (year, quarter) => {
  const [m, d] = QUARTER_END[quarter];
  return filingDeadline(utcDate(Number(year), m, d), quarter === '4Q' ? 90 : 45);
};

// 한국 시간 기준 오늘 날짜
const todayKst = (now) => {
  const k = new Date(now.getTime() + 9 * 3600 * 1000);
  return utcDate(k.getUTCFullYear(), k.getUTCMonth() + 1, k.getUTCDate());
};

// 제출기한이 지난(기한 다음 날부터) 가장 최근 보고서 기간
export const getLatestFiledPeriod = (now = new Date()) => {
  const today = todayKst(now);
  const y = today.getUTCFullYear();
  const candidates = [
    [y, '3Q'], [y, '2Q'], [y, '1Q'], [y - 1, '4Q'], [y - 1, '3Q'],
  ];
  const [year, quarter] = candidates.find(([cy, q]) => today > deadlineOf(cy, q));
  return { year: String(year), quarter };
};

export const previousPeriod = ({ year, quarter }) => quarter === '1Q'
  ? { year: String(Number(year) - 1), quarter: '4Q' }
  : { year, quarter: `${Number(quarter[0]) - 1}Q` };
