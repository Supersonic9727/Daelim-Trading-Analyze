// KOSIS 국가통계포털 프록시 - 고정된 시장 지표만 조회, API 키는 서버 환경변수에만 보관
const INDICATORS = {
  permits: { orgId: '116', tblId: 'DT_MLTM_1946', itmId: '13103871089T1', objL1: '13102871089A.0001', objL2: '13102871089B.0001', objL3: '13102871089C.0001' },
  starts: { orgId: '116', tblId: 'DT_MLTM_5386', itmId: '13103766971T1', objL1: '13102766971A.0001', objL2: '13102766971B.0001', objL3: '13102766971C.0001' },
  unsold: { orgId: '116', tblId: 'DT_MLTM_2080', itmId: '13103792722T1', objL1: '13102792722A.0001', objL2: '13102792722B.0001', objL3: '13102792722C.0001' },
  bsi: { orgId: '301', tblId: 'DT_512Y007', itmId: '13103134491999', objL1: '13102134491BSI_CD.AA', objL2: '13102134491BUSINESS_TYPE_CD.F4100' },
  costIndex: { orgId: '397', tblId: 'DT_39701_A003', itmId: '16397AAA0', objL1: '15397AA2AA11' },
  housingOrders: { orgId: '101', tblId: 'DT_1G1B002', itmId: 'T10', objL1: '0', objL2: '11' },
  newSupply: { orgId: '414', tblId: 'DT_41401N_007', itmId: 'T1', objL1: '00' },
  seoulPrice: { orgId: '101', tblId: 'DT_1YL1701', itmId: 'T10', objL1: '11' },
};

const fetchIndicator = async (apiKey, def, startPrdDe, endPrdDe) => {
  const params = new URLSearchParams({
    method: 'getList', apiKey, orgId: def.orgId, tblId: def.tblId, itmId: def.itmId,
    objL1: def.objL1 || '', objL2: def.objL2 || '', objL3: def.objL3 || '',
    objL4: '', objL5: '', objL6: '', objL7: '', objL8: '',
    format: 'json', jsonVD: 'Y', prdSe: 'M', startPrdDe, endPrdDe,
  });
  const response = await fetch(`https://kosis.kr/openapi/Param/statisticsParameterData.do?${params}`);
  const data = await response.json();
  // err 30 = 해당 기간 데이터 없음 → 빈 시계열로 처리
  if (!Array.isArray(data)) {
    if (data?.err === '30') return { series: [] };
    throw new Error(`KOSIS ${data?.err || response.status}: ${data?.errMsg || 'unknown error'}`);
  }
  return {
    unit: data[0]?.UNIT_NM?.trim() || '',
    table: data[0]?.TBL_NM?.trim() || '',
    series: data
      .map((row) => ({ prd: row.PRD_DE, v: Number(row.DT) }))
      .filter((p) => /^\d{6}$/.test(p.prd) && Number.isFinite(p.v))
      .sort((a, b) => a.prd.localeCompare(b.prd)),
  };
};

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const apiKey = process.env.KOSIS_API_KEY;
  if (!apiKey) return res.status(500).json({ error: '서버에 KOSIS_API_KEY가 설정되지 않았습니다.' });

  // end = 조회 기준월(YYYYMM). 전년 1월부터 조회해 누계·전년 동기 비교와 12개월 추이를 계산
  const { end } = req.query;
  if (typeof end !== 'string' || !/^20\d{2}(0[1-9]|1[0-2])$/.test(end)) {
    return res.status(400).json({ error: 'end=YYYYMM 형식이 필요합니다.' });
  }
  const start = `${Number(end.slice(0, 4)) - 1}01`;

  const entries = await Promise.all(Object.entries(INDICATORS).map(async ([id, def]) => {
    try {
      return [id, await fetchIndicator(apiKey, def, start, end)];
    } catch (error) {
      return [id, { error: error.message.replace(apiKey, '***'), series: [] }];
    }
  }));

  const result = Object.fromEntries(entries);
  const allFailed = entries.every(([, v]) => v.error);
  if (!allFailed) {
    res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400');
    res.setHeader('Vercel-CDN-Cache-Control', 'max-age=21600, stale-while-revalidate=86400');
  }
  return res.status(allFailed ? 502 : 200).json({ start, end, indicators: result });
}
