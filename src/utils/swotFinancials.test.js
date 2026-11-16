import { describe, it, expect } from 'vitest';
import { buildSwotFinancials, fmtEok } from './swotFinancials';

describe('fmtEok', () => {
  it('백만원을 억원·조원으로 표시', () => {
    expect(fmtEok(126200)).toBe('1,262억원');
    expect(fmtEok(3178700)).toBe('3조 1,787억원');
    expect(fmtEok(3000000)).toBe('3조원');
    expect(fmtEok(-8800)).toBe('-88억원');
  });
});

describe('buildSwotFinancials', () => {
  const self = { sales: 1000, operatingProfit: -76, debtRatio: 305 };
  const rival = { sales: 2400, operatingProfit: 149, debtRatio: 93 };

  it('대림통상이 뒤지는 항목은 약점, 앞서는 항목은 강점', () => {
    const r = buildSwotFinancials({
      self, rival, rivalName: '대림바스',
      selfPrev: { sales: 800 }, rivalPrev: { sales: 2300 },
    });
    expect(r.w).toEqual([
      '매출 대림통상 10억원 vs 대림바스 24억원 (약 42% 수준) — 규모·투자 여력 열세',
      '영업이익률 대림통상 -7.6% vs 대림바스 +6.2% — 수익성 열세',
      '부채비율 대림통상 305% vs 대림바스 93% — 재무 안정성 열세',
    ]);
    expect(r.s).toEqual(['매출 증가율(전년 동기 대비) 대림통상 +25.0% vs 대림바스 +4.3% — 성장세 우위']);
  });

  it('양사 모두 영업손실이면 표시, 규모가 크면 배수로 표시', () => {
    const r = buildSwotFinancials({
      self: { sales: 700, operatingProfit: -21, debtRatio: 190 },
      rival: { sales: 100, operatingProfit: -30, debtRatio: 7 },
      rivalName: '와토스코리아',
    });
    expect(r.s).toContain('매출 대림통상 7억원 vs 와토스코리아 1억원 (약 7.0배) — 규모 우위');
    expect(r.s).toContain('영업이익률 대림통상 -3.0% vs 와토스코리아 -30.0% — 수익성 우위 (양사 모두 영업손실)');
    expect(r.w).toContain('부채비율 대림통상 190% vs 와토스코리아 7% — 재무 안정성 열세');
  });

  it('자본잠식은 재무 안정성 열세, 전년 자료가 없으면 증가율 생략', () => {
    const r = buildSwotFinancials({ self: { ...self, debtRatio: -50 }, rival, rivalName: 'X' });
    expect(r.w).toContain('부채비율 대림통상 자본잠식 vs X 93% — 재무 안정성 열세');
    expect([...r.s, ...r.w].some(t => t.includes('증가율'))).toBe(false);
  });

  it('어느 한쪽이라도 공시가 없으면 null', () => {
    expect(buildSwotFinancials({ self, rival: {}, rivalName: 'X' })).toBeNull();
    expect(buildSwotFinancials({ self: undefined, rival, rivalName: 'X' })).toBeNull();
  });
});
