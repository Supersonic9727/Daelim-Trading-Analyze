// DART API 실시간 연동 및 데이터 파싱 유틸리티 (정기공시 재무제표 전체조회 & 주요계정 듀얼 연동)

// 재무제표 데이터 목록에서 지표를 파싱하는 헬퍼 함수
const parseList = (list, targetFsDiv) => {
  if (!list || list.length === 0) return null;

  // 응답 객체 리스트 중 요청한 fs_div와 매칭되는 데이터 필터링
  // DART 응답의 fs_div는 대문자 CFS / OFS 형식을 가짐
  const group = list.filter(item => !item.fs_div || item.fs_div.trim().toUpperCase() === targetFsDiv.toUpperCase());
  if (group.length === 0) return null;
  
  // 금액 문자열을 안전하게 숫자로 변환하는 헬퍼 (회계용 괄호 팩트 및 세모 기호 마이너스 감지 정교화)
  const parseAmount = (amountStr) => {
    if (!amountStr) return 0;
    const cleanStr = amountStr.replace(/,/g, '').trim();
    if (cleanStr === '-' || cleanStr === '') return 0;
    
    // 회계 규격상 감싸진 괄호 (예: (5,000)), 마이너스 기호 -, 혹은 세모 기호 △ 판정
    const isNegative = /^\(\s*[\d.-]+\s*\)$/.test(cleanStr) || cleanStr.startsWith('-') || cleanStr.startsWith('△');
    
    // 괄호 및 특수문자 제거 후 순수 숫자 문자열 획득
    const numericStr = cleanStr.replace(/[()△-]/g, '').trim();
    const num = Number(numericStr);
    
    if (isNaN(num)) return 0;
    return isNegative ? -Math.abs(num) : num;
  };

  // 계정과목명 및 표준 IFRS ID를 유연하게 탐색하는 헬퍼
  const findItem = (accountIds, KoreanKeywords, sjDivs = []) => {
    return group.find(item => {
      const accId = (item.account_id || '').trim();
      const accNm = (item.account_nm || '').replace(/\s/g, ''); // 공백 제거
      const sjDiv = (item.sj_div || '').trim();
      
      // 특정 재무제표 구분(sj_div) 조건 필터링 (BS: 재무상태표, IS: 손익계산서, CIS: 포괄손익계산서)
      if (sjDivs.length > 0 && !sjDivs.includes(sjDiv)) {
        return false;
      }
      
      // 1. IFRS 표준 계정 ID 일치 여부 확인
      if (accId && accountIds.includes(accId)) {
        // 매출액 탐색 시 매출원가(Cost of Sales) 혼입 방지 필터
        const isRevenueSearch = accountIds.includes('ifrs-full_Revenue') || accountIds.includes('ifrs-full_RevenueFromContractsWithCustomers') || accountIds.includes('ifrs_Revenue') || accountIds.includes('dart_OperatingRevenue');
        if (isRevenueSearch && (accNm.includes('원가') || accNm.includes('Cost') || accNm.includes('Expenses'))) {
          return false;
        }
        return true;
      }
      // 2. 한글 계정과목명 키워드 매칭
      return KoreanKeywords.some(keyword => {
        // 매출액, 영업수익 탐색 시 정확히 일치할 때만 매핑 (매출원가 혼입 차단)
        if (keyword === '매출액' || keyword === '영업수익') {
          return accNm === keyword;
        }
        return accNm === keyword || accNm.includes(keyword);
      });
    });
  };

  // 1. 매출액 파싱 (IS / CIS 구분) - 매출원가 혼입 차단 필터 연계
  const salesItem = findItem(
    ['ifrs-full_Revenue', 'ifrs-full_RevenueFromContractsWithCustomers', 'ifrs_Revenue', 'dart_OperatingRevenue'],
    ['매출액', '영업수익'],
    ['IS', 'CIS']
  );
  const sales = salesItem ? Math.round(parseAmount(salesItem.thstrm_amount) / 1000000) : 0;

  // 2. 영업이익 / 영업손실 파싱 (IS / CIS 구분)
  const opProfitItem = findItem(
    ['dart_OperatingIncomeLoss', 'dart_OperatingProfit', 'ifrs-full_OperatingProfitLoss'],
    ['영업이익', '영업손실'],
    ['IS', 'CIS']
  );
  let operatingProfit = 0;
  if (opProfitItem) {
    const rawVal = parseAmount(opProfitItem.thstrm_amount);
    const converted = Math.round(rawVal / 1000000);
    
    const accNm = opProfitItem.account_nm || '';
    const isLoss = (accNm.includes('손실') && !accNm.includes('손익') && !accNm.includes('이익')) || accNm.includes('적자') || rawVal < 0;
    operatingProfit = isLoss ? -Math.abs(converted) : converted;
  }
  
  // 3. 총포괄손익 / 총포괄손실 파싱 (IS / CIS 구분)
  // 우선적으로 총포괄손익을 파싱하되, 누락 시 기존 당기순손익 값을 대체(Fallback)하여 데이터 유실 방지
  let comprehensiveIncomeItem = findItem(
    [
      'ifrs-full_ComprehensiveIncome', 
      'ifrs-full_ComprehensiveIncomeLoss', 
      'ifrs_ComprehensiveIncome'
    ],
    [
      '총포괄손익', '총포괄이익', '총포괄손실', 
      '포괄손익', '포괄이익', '포괄손실'
    ],
    ['IS', 'CIS']
  );

  if (!comprehensiveIncomeItem) {
    console.log("[DART API] 총포괄손익 항목 누락 감지, 당기순이익(손실) 대체(Fallback) 파싱 시도");
    comprehensiveIncomeItem = findItem(
      [
        'ifrs-full_ProfitLoss', 
        'ifrs_ProfitLoss', 
        'ifrs-full_NetIncome'
      ],
      [
        '당기순이익', '당기순손실', '당기순이익(손실)',
        '분기순이익', '분기순손실', '분기순이익(손실)'
      ],
      ['IS', 'CIS']
    );
  }

  let netIncome = 0;
  if (comprehensiveIncomeItem) {
    const rawVal = parseAmount(comprehensiveIncomeItem.thstrm_amount);
    const converted = Math.round(rawVal / 1000000);
    
    const accNm = comprehensiveIncomeItem.account_nm || '';
    const isLoss = (accNm.includes('손실') && !accNm.includes('손익') && !accNm.includes('이익')) || accNm.includes('적자') || rawVal < 0;
    netIncome = isLoss ? -Math.abs(converted) : converted;
  }

  // 4. 판관비(판매비와관리비) 파싱 (IS / CIS 구분)
  const sgaItem = findItem(
    ['ifrs-full_SellingGeneralAndAdministrativeExpenses', 'ifrs_SellingGeneralAndAdministrativeExpenses', 'dart_SellingGeneralAdministrativeExpenses'],
    ['판매비와관리비', '판매비와관리비총계', '판관비', '판매비', '관리비', '임차료및판관비총계'],
    ['IS', 'CIS']
  );
  const sgaExpenses = sgaItem ? Math.round(parseAmount(sgaItem.thstrm_amount) / 1000000) : 0;
  
  // 5. 부채총계 파싱 (BS 구분)
  const debtItem = findItem(
    ['ifrs-full_Liabilities', 'ifrs_Liabilities'],
    ['부채총계', '부채의합계', '부채총합'],
    ['BS']
  );
  
  // 6. 자본총계 파싱 (BS 구분)
  const equityItem = findItem(
    ['ifrs-full_Equity', 'ifrs_Equity'],
    ['자본총계', '자본의합계', '자본총합'],
    ['BS']
  );
  
  let debtRatio = 0;
  if (debtItem && equityItem) {
    const debt = parseAmount(debtItem.thstrm_amount);
    const equity = parseAmount(equityItem.thstrm_amount);
    if (equity !== 0) {
      debtRatio = Math.round((debt / equity) * 100);
    }
  }
  
  return { sales, operatingProfit, netIncome, sgaExpenses, debtRatio };
};

export const fetchDartData = async (apiKey, corpCode, year, reprtCode, fsDiv) => {
  const finalApiKey = apiKey || import.meta.env.VITE_DART_API_KEY;
  if (!finalApiKey) {
    throw new Error("API Key가 누락되었습니다.");
  }

  // 1차 시도: 정기공시 재무제표 전체조회 API (fnlttSinglAcntAll.json)
  const urlAll = `/api-dart/api/fnlttSinglAcntAll.json?crtfc_key=${finalApiKey}&corp_code=${corpCode}&bsns_year=${year}&reprt_code=${reprtCode}&fs_div=${fsDiv}`;

  try {
    console.log(`[DART API] 1차 시도 (전체조회 API) 시작: corp_code=${corpCode}, bsns_year=${year}, fs_div=${fsDiv}`);
    const response = await fetch(urlAll);
    const result = await response.json();

    if (result.status === '000') {
      const parsedData = parseList(result.list, fsDiv);
      if (parsedData) {
        console.log("[DART API] 1차 시도 성공 (전체조회 데이터 파싱 완료)");
        return parsedData;
      }
    }
    // 013: DART가 해당 fs_div/연도/분기에 대해 데이터 없음을 명시적으로 응답한 경우
    // 2차 API로 fallback하면 fs_div 필터 없이 반환된 데이터가 오염될 수 있으므로 즉시 중단
    if (result.status === '013') {
      throw new Error(`해당 ${fsDiv} 공시 데이터가 없습니다. (${year}년 ${reprtCode} 미공시 또는 비대상 기업)`);
    }
    console.warn(`[DART API] 1차 시도 결과 없음 (status: ${result.status}, message: ${result.message || '없음'}). 2차 시도(주요계정조회)로 대체 시도합니다.`);
  } catch (error) {
    // 013으로 인한 의도적 throw는 그대로 전파 (2차 시도 없이 종료)
    if (error.message?.includes('미공시') || error.message?.includes('데이터가 없습니다')) throw error;
    console.warn("[DART API] 1차 시도 오류 발생. 2차 시도로 대체합니다.", error);
  }

  // 2차 시도: 단일회사 주요계정 조회 API (fnlttSinglAcnt.json) - 대기업/금융업종 및 용량초과 우회용
  const urlSingle = `/api-dart/api/fnlttSinglAcnt.json?crtfc_key=${finalApiKey}&corp_code=${corpCode}&bsns_year=${year}&reprt_code=${reprtCode}`;

  try {
    console.log(`[DART API] 2차 시도 (주요계정 API) 시작: corp_code=${corpCode}, bsns_year=${year}`);
    const response = await fetch(urlSingle);
    const result = await response.json();

    if (result.status === '000') {
      const parsedData = parseList(result.list, fsDiv);
      if (parsedData) {
        console.log("[DART API] 2차 시도 성공! (주요계정 데이터 대체 파싱 완료)");
        return parsedData;
      }
    }

    if (result.status === '013') {
      throw new Error("조회된 데이터가 없습니다. (미등록 공시, 금융업종 제약 또는 DART OpenAPI 조회 배제 기업)");
    } else {
      throw new Error(result.message || `DART API 에러 (코드: ${result.status})`);
    }
  } catch (error) {
    console.error("[DART API] 1, 2차 시도 모두 실패:", error);
    throw error;
  }
};
