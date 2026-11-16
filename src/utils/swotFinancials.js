// SWOT 재무 비교 항목: 조회한 기간의 DART 누계 공시로 자동 생성 (대림통상 관점)
// 대림통상이 앞서면 강점(s), 뒤지면 약점(w)으로 분류
// 입력 statement는 dartApi.parseList 결과 (백만원, 손익은 누계)

const hasData = (st) => Boolean(st) && Object.keys(st).length > 0;

// 백만원 → "1,262억원" / "3조 1,787억원"
export const fmtEok = (million) => {
  const eok = Math.round(million / 100);
  const sign = eok < 0 ? '-' : '';
  const abs = Math.abs(eok);
  const jo = Math.floor(abs / 10000);
  const rest = abs % 10000;
  if (jo === 0) return `${sign}${rest.toLocaleString('ko-KR')}억원`;
  return rest === 0 ? `${sign}${jo}조원` : `${sign}${jo}조 ${rest.toLocaleString('ko-KR')}억원`;
};

const pct = (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
const margin = (st) => (st.sales > 0 ? (st.operatingProfit / st.sales) * 100 : null);
const growth = (cur, prev) => (hasData(prev) && prev.sales > 0 && cur.sales > 0 ? (cur.sales / prev.sales - 1) * 100 : null);
const debtLabel = (v) => (v < 0 ? '자본잠식' : `${v}%`);

export const buildSwotFinancials = ({ self, rival, selfPrev, rivalPrev, rivalName, selfName = '대림통상' }) => {
  if (!hasData(self) || !hasData(rival)) return null;
  const s = [];
  const w = [];

  // 1. 매출 규모
  if (self.sales > 0 && rival.sales > 0) {
    const ratio = self.sales / rival.sales;
    const scale = ratio >= 1 ? `약 ${ratio.toFixed(1)}배` : `약 ${(ratio * 100).toFixed(ratio < 0.1 ? 1 : 0)}% 수준`;
    const text = `매출 ${selfName} ${fmtEok(self.sales)} vs ${rivalName} ${fmtEok(rival.sales)} (${scale})`;
    if (ratio >= 1) s.push(`${text} — 규모 우위`);
    else w.push(`${text} — 규모·투자 여력 열세`);
  }

  // 2. 영업이익률
  const sm = margin(self);
  const rm = margin(rival);
  if (sm !== null && rm !== null) {
    const text = `영업이익률 ${selfName} ${pct(sm)} vs ${rivalName} ${pct(rm)}`;
    if (sm >= rm) s.push(`${text} — 수익성 우위${sm < 0 ? ' (양사 모두 영업손실)' : ''}`);
    else w.push(`${text} — 수익성 열세${rm < 0 ? ' (양사 모두 영업손실)' : ''}`);
  }

  // 3. 부채비율 (낮을수록 우위, 음수는 자본잠식, 0은 값 없음)
  const sd = self.debtRatio;
  const rd = rival.debtRatio;
  if (sd && rd) {
    const text = `부채비율 ${selfName} ${debtLabel(sd)} vs ${rivalName} ${debtLabel(rd)}`;
    const better = sd > 0 && (rd < 0 || sd <= rd);
    if (better) s.push(`${text} — 재무 안정성 우위`);
    else w.push(`${text} — 재무 안정성 열세`);
  }

  // 4. 매출 증가율 (전년 같은 기간 누계 대비)
  const sg = growth(self, selfPrev);
  const rg = growth(rival, rivalPrev);
  if (sg !== null && rg !== null) {
    const text = `매출 증가율(전년 동기 대비) ${selfName} ${pct(sg)} vs ${rivalName} ${pct(rg)}`;
    if (sg >= rg) s.push(`${text} — 성장세 우위`);
    else w.push(`${text} — 성장세 열세`);
  }

  return { s, w };
};
