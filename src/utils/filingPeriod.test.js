import { describe, it, expect } from 'vitest';
import { deadlineOf, getLatestFiledPeriod, previousPeriod } from './filingPeriod';

const iso = (d) => d.toISOString().slice(0, 10);
const kst = (date, time = '12:00') => new Date(`${date}T${time}:00+09:00`);

describe('법정 제출기한 (주말·공휴일이면 다음 영업일)', () => {
  it.each([
    [2026, '1Q', '2026-05-15'], // 금
    [2026, '2Q', '2026-08-14'], // 금
    [2026, '3Q', '2026-11-16'], // 11/14 토 → 월
    [2025, '4Q', '2026-03-31'], // 평년 90일
    [2019, '4Q', '2020-03-30'], // 윤년 90일 = 3/30 (월)
    [2023, '4Q', '2024-04-01'], // 윤년 3/30 토 → 4/1 월
    [2021, '2Q', '2021-08-17'], // 8/14 토, 8/15 일(광복절), 8/16 대체공휴일 → 화
    [2027, '2Q', '2027-08-17'], // 2021년과 같은 요일 배치
  ])('%i %s → %s', (year, quarter, expected) => {
    expect(iso(deadlineOf(year, quarter))).toBe(expected);
  });
});

describe('최신 조회 기간 (기한 다음 날부터 해당 분기)', () => {
  it.each([
    ['2026-11-13', '2026', '2Q'],
    ['2026-11-16', '2026', '2Q'], // 기한 당일
    ['2026-11-17', '2026', '3Q'],
    ['2024-04-01', '2023', '3Q'],
    ['2024-04-02', '2023', '4Q'],
    ['2026-01-01', '2025', '3Q'],
  ])('%s → %s %s', (date, year, quarter) => {
    expect(getLatestFiledPeriod(kst(date))).toEqual({ year, quarter });
  });

  it('한국 시간 기준: UTC 11/16 15:30 = KST 11/17 00:30', () => {
    expect(getLatestFiledPeriod(new Date('2026-11-16T15:30:00Z'))).toEqual({ year: '2026', quarter: '3Q' });
    expect(getLatestFiledPeriod(kst('2026-11-16', '23:59'))).toEqual({ year: '2026', quarter: '2Q' });
  });

  it('직전 분기', () => {
    expect(previousPeriod({ year: '2026', quarter: '1Q' })).toEqual({ year: '2025', quarter: '4Q' });
    expect(previousPeriod({ year: '2026', quarter: '3Q' })).toEqual({ year: '2026', quarter: '2Q' });
  });
});
