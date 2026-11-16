import { describe, it, expect } from 'vitest';
import { parseList } from './dartApi';
import { getStatement, isComputable, computeValue, isOfsFallback, prevQuarterKey, roePeriodLabel, roeAnnualizationFactor } from './financials';
import q1 from './__fixtures__/daelimTrading_2026_1q_cfs.json';
import q2 from './__fixtures__/daelimTrading_2026_2q_cfs.json';

// 실제 공시: 반기 누계 - 1분기 누계 = 반기보고서의 3개월치(thstrm_amount)와 일치해야 함
const data = {
  '2026 1Q': { daelim: { cfs: parseList(q1.list, 'CFS'), ofs: {} } },
  '2026 2Q': { daelim: { cfs: parseList(q2.list, 'CFS'), ofs: {} } },
};

describe('당분기 역산 (대림통상 2026 2Q, 연결)', () => {
  it('당분기 = 공시 3개월치 (= 반기 누계 - 1분기 누계)', () => {
    expect(computeValue(data, 'daelim', '2026 2Q', 'sales', 'cfs', false)).toBeCloseTo(34013.580858, 6);
    expect(computeValue(data, 'daelim', '2026 2Q', 'operatingProfit', 'cfs', false)).toBeCloseTo(-1944.161096, 6);
    expect(computeValue(data, 'daelim', '2026 2Q', 'netIncome', 'cfs', false)).toBeCloseTo(-2700.979103, 6);
    expect(computeValue(data, 'daelim', '2026 2Q', 'sgaExpenses', 'cfs', false)).toBeCloseTo(8246.529415, 6);
  });

  it('누계 모드는 공시 누계 그대로', () => {
    expect(computeValue(data, 'daelim', '2026 2Q', 'sales', 'cfs', true)).toBeCloseTo(68373.318385, 6);
  });

  it('잔액 항목(부채비율 등)은 당분기 모드에서도 빼지 않음', () => {
    const ratio = data['2026 2Q'].daelim.cfs.debtRatio;
    expect(computeValue(data, 'daelim', '2026 2Q', 'debtRatio', 'cfs', false)).toBe(ratio);
  });

  it('profitLoss·ordinaryIncome도 공시 3개월치', () => {
    const q = data['2026 2Q'].daelim.cfs.quarterly;
    expect(computeValue(data, 'daelim', '2026 2Q', 'profitLoss', 'cfs', false)).toBeCloseTo(q.profitLoss, 6);
    expect(computeValue(data, 'daelim', '2026 2Q', 'ordinaryIncome', 'cfs', false)).toBeCloseTo(q.ordinaryIncome, 6);
  });

  it('1Q는 당분기 모드에서도 그대로', () => {
    expect(computeValue(data, 'daelim', '2026 1Q', 'sales', 'cfs', false)).toBeCloseTo(34359.737527, 6);
  });
});

describe('계산 가능 여부와 연결→별도 대체', () => {
  it('2Q·3Q는 공시 3개월치가 있으므로 직전 분기 공시 없이도 계산 가능', () => {
    const only2q = { '2026 2Q': data['2026 2Q'] };
    expect(isComputable(only2q, 'daelim', '2026 2Q', 'cfs', false)).toBe(true);
    expect(computeValue(only2q, 'daelim', '2026 2Q', 'sales', 'cfs', false)).toBeCloseTo(34013.580858, 6);
    expect(isComputable(only2q, 'daelim', '2026 2Q', 'cfs', true)).toBe(true);
    expect(isComputable(only2q, 'daelim', '2026 3Q', 'cfs', true)).toBe(false);
  });

  it('공시 3개월치가 없는 보고서(4Q)는 직전 분기 공시가 없으면 계산 불가(미공시)', () => {
    const only4q = { '2025 4Q': { a: { cfs: { sales: 420, quarterly: {} }, ofs: {} } } };
    expect(isComputable(only4q, 'a', '2025 4Q', 'cfs', false)).toBe(false);
    expect(isComputable(only4q, 'a', '2025 4Q', 'cfs', true)).toBe(true);
  });

  it('연결이 없으면 별도 수치를 쓰고 대체 여부를 표시', () => {
    const d = { '2026 2Q': { watos: { cfs: {}, ofs: { sales: 10 } } } };
    expect(getStatement(d, 'watos', '2026 2Q', 'cfs')).toEqual({ sales: 10 });
    expect(isOfsFallback(d, 'watos', '2026 2Q')).toBe(true);
    expect(isOfsFallback(data, 'daelim', '2026 2Q')).toBe(false);
  });

  it('4Q 당분기는 연간 - 3Q 누계', () => {
    const d = {
      '2025 3Q': { a: { cfs: { sales: 300 }, ofs: {} } },
      '2025 4Q': { a: { cfs: { sales: 420 }, ofs: {} } },
    };
    expect(prevQuarterKey('2025 4Q')).toBe('2025 3Q');
    expect(computeValue(d, 'a', '2025 4Q', 'sales', 'cfs', false)).toBe(120);
  });
});

describe('공시 3개월치 우선 (대림바스 2026 3Q 연결 총포괄손익 사례)', () => {
  // 3Q 보고서의 3개월치 4,373.671 / 누계 13,242.569 / 반기보고서 누계 9,191.168
  // 누계 차감(4,051.401)은 반기 기타포괄손익이 보고서 간에 달라 공시 3개월치와 어긋남
  const d = {
    '2026 2Q': { bath: { cfs: { netIncome: 9191.168, quarterly: { netIncome: 4000 } }, ofs: {} } },
    '2026 3Q': { bath: { cfs: { netIncome: 13242.569, sales: 900, quarterly: { netIncome: 4373.671 } }, ofs: {} } },
  };

  it('당분기 모드는 누계 차감이 아니라 공시 3개월치를 사용', () => {
    expect(computeValue(d, 'bath', '2026 3Q', 'netIncome', 'cfs', false)).toBe(4373.671);
  });

  it('누계 모드는 그대로 누계', () => {
    expect(computeValue(d, 'bath', '2026 3Q', 'netIncome', 'cfs', true)).toBe(13242.569);
  });

  it('특정 항목의 3개월치가 없으면 그 항목만 누계 차감', () => {
    const d2 = {
      '2026 2Q': { x: { cfs: { sales: 500 }, ofs: {} } },
      '2026 3Q': { x: { cfs: { sales: 900, quarterly: {} }, ofs: {} } },
    };
    expect(computeValue(d2, 'x', '2026 3Q', 'sales', 'cfs', false)).toBe(400);
  });
});

describe('ROE 기간 표시와 연환산', () => {
  it('당분기는 3개월치이므로 ×4', () => {
    expect(roePeriodLabel('2026 3Q', false)).toBe('분기');
    expect(roeAnnualizationFactor('2026 3Q', false)).toBe(4);
  });

  it('누계는 분기 수에 맞춰 환산, 4Q 누계(연간)는 그대로', () => {
    expect(roePeriodLabel('2026 2Q', true)).toBe('반기 누계');
    expect(roeAnnualizationFactor('2026 2Q', true)).toBe(2);
    expect(roeAnnualizationFactor('2026 3Q', true)).toBeCloseTo(4 / 3, 10);
    expect(roePeriodLabel('2025 4Q', true)).toBe('연간');
    expect(roeAnnualizationFactor('2025 4Q', true)).toBe(1);
  });
});
