import { describe, it, expect } from 'vitest';
import { buildMarketCards, buildMarketImpact, quarterEndPrd } from './marketIndicators';

const s = (pairs) => pairs.map(([prd, v]) => ({ prd, v }));
const api = {
  indicators: {
    // 월별 누계 통계표
    permits: { table: 'T1', series: s([['202501', 10], ['202502', 30], ['202503', 60], ['202601', 12], ['202602', 30], ['202603', 54]]) },
    // 월계 → 연초부터 합산
    starts: { table: 'T2', series: s([['202501', 10], ['202502', 10], ['202503', 10], ['202601', 12], ['202602', 12], ['202603', 12]]) },
    // 2026.03 미공표 → 최신 공표월(2026.02) 기준
    newSupply: { table: 'T3', series: s([['202501', 10], ['202502', 10], ['202503', 10], ['202601', 8], ['202602', 8]]) },
    housingOrders: { error: '조회 실패' },
    unsold: { table: 'T5', series: s([['202503', 100], ['202603', 110]]) },
    bsi: { table: 'T6', series: s([['202503', 50], ['202603', 56]]) },
    costIndex: { table: 'T7', series: s([['202503', 130], ['202603', 136.5]]) },
    seoulPrice: { table: 'T8', series: s([['202601', 1], ['202602', 1], ['202603', 1]]) },
  },
};
const end = quarterEndPrd('2026', '1Q');
const cards = buildMarketCards(api, end);
const card = (id) => cards.find((c) => c.id === id);

describe('시장 지표 카드 계산', () => {
  it('기준월은 분기 말월', () => {
    expect(end).toBe('202603');
    expect(quarterEndPrd('2026', '4Q')).toBe('202612');
  });

  it('누계 통계표는 기준월 누계를 전년 동월 누계와 비교', () => {
    expect(card('permits').value).toBe('54 호');
    expect(card('permits').rawDelta).toBeCloseTo(-10, 6);
    expect(card('permits').tone).toBe('bad');
  });

  it('월계 통계는 1월~기준월 합계를 전년 같은 기간과 비교', () => {
    expect(card('starts').value).toBe('36 호');
    expect(card('starts').rawDelta).toBeCloseTo(20, 6);
  });

  it('기준월 미공표면 최신 공표월로 계산하고 표시', () => {
    expect(card('newSupply').latest).toBe('202602');
    expect(card('newSupply').rawDelta).toBeCloseTo(-20, 6);
    expect(card('newSupply').desc).toContain('최신 공표 2026.02');
  });

  it('조회 실패 지표는 빈 카드', () => {
    expect(card('housingOrders').empty).toBe(true);
  });

  it('시점 값: 미분양 증가는 부정, BSI는 p 차이', () => {
    expect(card('unsold').rawDelta).toBeCloseTo(10, 6);
    expect(card('unsold').tone).toBe('bad');
    expect(card('bsi').change).toBe('+6p');
    expect(card('bsi').tone).toBe('good');
    expect(card('costIndex').tone).toBe('bad');
  });

  it('변동률은 월간 변동률을 복리로 누적', () => {
    expect(card('seoulPrice').rawDelta).toBeCloseTo((1.01 ** 3 - 1) * 100, 9);
    expect(card('seoulPrice').change).toBe('연초 대비 +3.03%');
    expect(card('seoulPrice').tone).toBe('neutral'); // 카드 배지는 중립
  });
});

describe('건자재 기업 영향 분석', () => {
  const impact = buildMarketImpact(cards);
  const item = (id) => impact.items.find((i) => i.id === id);

  it('신축 수요: 증가·감소가 섞이면 엇갈림, 인허가 감소는 감점', () => {
    expect(item('newBuild').text).toContain('착공(+20.0%)은 늘었지만 분양(-20.0%)은 줄어');
    expect(item('newBuild').text).toContain('인허가가 -10.0% 줄어');
    expect(item('newBuild').tone).toBe('bad');
  });

  it('BSI가 기준선 100 미만이면 개선돼도 감점', () => {
    expect(item('credit').text).toContain('미분양(110호)이 전년보다 +10.0% 늘었습니다');
    expect(item('credit').text).toContain('기준선 100을 크게 밑돌아');
    expect(item('credit').tone).toBe('bad');
  });

  it('공사비 상승은 부정, 서울 집값 상승은 리모델링 수요에 긍정', () => {
    expect(item('cost').tone).toBe('bad');
    expect(item('remodel').tone).toBe('good');
    expect(impact.counts).toEqual({ good: 1, neutral: 0, bad: 3 });
  });

  it('조사는 마지막 단어의 받침에 맞춤', () => {
    const r = buildMarketImpact([
      { id: 'starts', rawDelta: 10 },
      { id: 'housingOrders', rawDelta: 8 },
    ]);
    expect(r.items[0].text.startsWith('착공(+10.0%)·주택 수주(+8.0%)가 전년보다 늘었습니다')).toBe(true);
  });
});
