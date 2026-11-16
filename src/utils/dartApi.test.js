import { describe, it, expect } from 'vitest';
import { parseList } from './dartApi';
import q2 from './__fixtures__/daelimTrading_2026_2q_cfs.json';

// 기대값은 원본 응답에서 IFRS 계정 ID로 직접 찾은 원 단위 금액 / 1e6
describe('parseList - 실제 DART 응답 (대림통상 2026 반기, 연결)', () => {
  const r = parseList(q2.list, 'CFS');

  it('손익은 반기 누계(thstrm_add_amount)를 사용', () => {
    expect(r.sales).toBeCloseTo(68373.318385, 6); // 3개월치 34,013백만원이 아니라 누계
    expect(r.operatingProfit).toBeCloseTo(-2555.817818, 6);
    expect(r.netIncome).toBeCloseTo(-5108.101437, 6); // 총포괄손익
    expect(r.profitLoss).toBeCloseTo(-3276.586868, 6); // 반기순이익(손실)
    expect(r.ordinaryIncome).toBeCloseTo(-3276.899393, 6); // 법인세비용차감전순이익
    expect(r.sgaExpenses).toBeCloseTo(15717.586171, 6);
  });

  it('quarterly에는 반기보고서의 3개월치(thstrm_amount)를 보관', () => {
    expect(r.quarterly.sales).toBeCloseTo(34013.580858, 6);
    expect(r.quarterly.operatingProfit).toBeCloseTo(-1944.161096, 6);
    expect(r.quarterly.netIncome).toBeCloseTo(-2700.979103, 6);
    expect(r.quarterly.sgaExpenses).toBeCloseTo(8246.529415, 6);
    const rawOf = (id) => Number(q2.list.find(x => x.account_id === id && x.sj_div !== 'BS').thstrm_amount) / 1e6;
    expect(r.quarterly.profitLoss).toBeCloseTo(rawOf('ifrs-full_ProfitLoss'), 6);
    expect(r.quarterly.ordinaryIncome).toBeCloseTo(rawOf('ifrs-full_ProfitLossBeforeTax'), 6);
  });

  it('재무상태표는 기말 잔액, 부채비율은 부채총계/자본총계 (자본과부채총계 아님)', () => {
    expect(r.equity).toBeCloseTo(33071.656665, 6);
    expect(r.debtRatio).toBe(Math.round((117285163870 / 33071656665) * 100));
    expect(r.currentAssets).toBeCloseTo(75052.618198, 6); // 계정명 '유동 자산'(공백 포함)
    expect(r.currentLiabilities).toBeCloseTo(105006.547105, 6);
  });
});

describe('parseList - 계정 매칭 규칙', () => {
  const row = (sj_div, account_nm, thstrm_amount, extra = {}) => ({ sj_div, account_nm, thstrm_amount, account_id: '-표준계정코드 미사용-', ...extra });

  it('ID가 없을 때 목록 앞쪽의 자본과부채총계를 부채총계로 오매칭하지 않음', () => {
    const r = parseList([
      row('BS', '자본과부채총계', '300'),
      row('BS', '부채 총계', '200'),
      row('BS', '자본총계', '100'),
    ], 'CFS');
    expect(r.debtRatio).toBe(200);
  });

  it('부분 일치에서 비유동부채는 유동부채로 잡지 않음', () => {
    const r = parseList([
      row('BS', '비유동부채계', '9000000'),
      row('BS', '유동부채계', '4000000'),
    ], 'CFS');
    expect(r.currentLiabilities).toBe(4);
  });

  it('괄호·△·- 표기는 음수, 누계가 "-"이면 3개월치 값 사용', () => {
    const r = parseList([
      row('IS', '매출액', '5,000,000', { thstrm_add_amount: '-' }),
      row('IS', '영업이익', '(1,000,000)'),
      row('IS', '법인세비용차감전순이익', '△2,000,000'),
      row('IS', '판매비와관리비', '3,000,000', { thstrm_add_amount: '7,000,000' }),
    ], 'CFS');
    expect(r.sales).toBe(5);
    expect(r.operatingProfit).toBe(-1);
    expect(r.ordinaryIncome).toBe(-2);
    expect(r.sgaExpenses).toBe(7);
  });

  it('3개월치도 손실 계정명·괄호 표기를 음수로 처리', () => {
    const r = parseList([
      row('IS', '영업손실', '1,000,000', { thstrm_add_amount: '3,000,000' }),
      row('IS', '매출액', '(500,000)', { thstrm_add_amount: '9,000,000' }),
    ], 'CFS');
    expect(r.operatingProfit).toBe(-3);
    expect(r.quarterly.operatingProfit).toBe(-1);
    expect(r.quarterly.sales).toBe(-0.5);
  });

  it('누계 칸이 없는 사업보고서는 quarterly가 비어 있음', () => {
    const r = parseList([
      row('IS', '매출액', '12,000,000'),
      row('IS', '영업이익', '1,000,000', { thstrm_add_amount: '-' }),
    ], 'CFS');
    expect(r.sales).toBe(12);
    expect(r.quarterly).toEqual({});
  });

  it('요청한 fs_div 행만 사용', () => {
    const r = parseList([
      row('IS', '매출액', '1000000', { fs_div: 'OFS' }),
      row('IS', '매출액', '2000000', { fs_div: 'CFS' }),
    ], 'CFS');
    expect(r.sales).toBe(2);
  });

  it('빈 목록은 null', () => {
    expect(parseList([], 'CFS')).toBeNull();
  });
});
