import React, { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Layers,
  FileText,
  Activity,
  Award,
  Zap,
  Key,
  Calendar,
  Grid,
  Info,
  Layers3,
  Download
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  LineChart
} from 'recharts';
import { getMarketTrendsData } from '../data/marketTrends';
import { fetchDartData } from '../utils/dartApi';

// 분기 정렬 헬퍼
const sortQuarters = (qList) => {
  return [...qList].sort((a, b) => {
    const [aYear, aQ] = a.split(' ');
    const [bYear, bQ] = b.split(' ');
    if (aYear !== bYear) return parseInt(aYear) - parseInt(bYear);
    return aQ.localeCompare(bQ);
  });
};

// SWOT 분석 및 자사 주체 비교 포인트 데이터 (대림통상 주체 180도 전면 전환)
// SWOT 분석 및 자사 주체 비교 포인트 데이터 (대림통상 주체 180도 전면 전환)
const swotData = {
  daelimBath: {
    name: "대림바스",
    s: ["수전금구 B2B 특판 시장 및 비데 OEM 생산 정밀성 및 독보적 제조원가 강점", "도비도스 브랜드 욕실 패키지 포트폴리오를 통한 시장 침투 능력"],
    w: ["대림바스 대비 상대적으로 낮은 B2C 일반 대리점 유통 네트워크망", "위생도기 부문 자체 가마 인프라 부재로 도기 단독 수주 시 브랜드 열위"],
    o: ["그린홈 정책 강화에 따른 친환경 고성능 절수 수전 의무화 기회 수혜", "수전 단일 품목 공급에서 욕실 패키지 세트 리모델링 시장 납품 확대"],
    t: ["건설경기 인허가 급감에 따른 특판 시장 납품 단가 인하 압박 심화", "대형 종합 홈인테리어 가구 기업들의 욕실 자재 유통 시장 진출 확대"],
    compare: "자사(대림통상)는 위생도기 부문에 특화된 대림바스에 비해 메탈 수전 및 비데 OEM 생산 정밀성 및 원가 제어력에서 확실한 공인 품질 우위를 점하고 있습니다. 향후 리모델링 패키지 세트 납품 시, 자사의 도비도스 브랜드 가격 경쟁력을 앞세워 대림바스 브랜드 유통 대리점망 내에 자사 수전 금구 제품 침투율을 끌어올리는 특판 및 대리점 영업 연계를 집중 확대할 계획입니다."
  },
  isDongseo: {
    name: "아이에스동서",
    s: ["수전금구 정밀 도금 부문의 오랜 장인 기술력 및 친환경 자체 스펙 특허", "도비도스 대리점 유통 채널 기반 요업 건자재 영업망 우위"],
    w: ["종합 시행/건설 자본력 부재로 초대형 재정비 사업 지분 참여 한계", "아이에스동서 대비 제조 중심 사업구조에 따른 부동산 직접 개발 시너지 부재"],
    o: ["아이에스동서의 이누스 브랜드 매각 이후 욕실 단독 요업 부문 스펙인 및 시장 잠식 반사 이익", "절수 센서 및 터치식 비접촉 스마트 수전 프리미엄 시장 점유 확대"],
    t: ["원자재(구리, 아연) 수입 물가 변동성에 따른 순수 제조 원가율 상승 리스크", "메이저 건설사의 B2B 조달 단가 인하 경쟁 유도에 따른 마진 방어 부담"],
    compare: "아이에스동서는 대형 건설사 시행 사업을 바탕으로 외형 매출액 규모는 자사보다 현저히 크나, 욕실의 핵심 부품인 수전 및 금구 하드웨어 정밀 도금 기술력은 자사(대림통상)가 명백한 우위에 있습니다. 정비사업 및 특판 자재 수주전 경쟁 시, 자사의 고효율 절수 특허와 친환경 자재 스펙인을 전면에 내세워 이누스 매각 후 약화된 그들의 욕실 자재 틈새시장을 잠식해 가며 원가 마진율을 고수하는 방어 전략을 취합니다."
  }
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default function Dashboard() {
  // 1. 기업 리스트 상태 - DART 실제 공식 고유번호(corpCode)와 시각적 지정코드(displayCode) 이원화 세팅 (3사 체제 압축)
  const [companies, setCompanies] = useState([
    { id: 'daelimTrading', name: '대림통상', displayCode: '00114731', corpCode: '00109824', color: '#6366f1' },
    { id: 'daelimBath', name: '대림바스', displayCode: '00157082', corpCode: '00109754', color: '#06b6d4' },
    { id: 'isDongseo', name: '아이에스동서', displayCode: '00105344', corpCode: '00115977', color: '#10b981' },
  ]);

  // 실시간 DART 연동 성공 시 기존 가짜 Mock 데이터 일괄 청소를 위한 상태 변수
  const [isMockCleared, setIsMockCleared] = useState(false);

  // 2. 분기 범위 상태 - 기본 2024년 설정
  const [quarters, setQuarters] = useState(["2024 1Q", "2024 2Q", "2024 3Q", "2024 4Q"]);

  // 3. 재무 데이터 상태 (연결/별도 이원화) - 기본 2024년 백만원 단위, 판관비 및 총포괄손익 반영
  const [financialData, setFinancialData] = useState({
    "2024 1Q": {
      daelimTrading: {
        cfs: { sales: 62000, operatingProfit: 2800, netIncome: -1200, debtRatio: 95, ordinaryIncome: 0, sgaExpenses: 9300 },
        ofs: { sales: 58000, operatingProfit: 2200, netIncome: -900, debtRatio: 90, ordinaryIncome: 0, sgaExpenses: 8700 }
      },
      daelimBath: {
        cfs: { sales: 58000, operatingProfit: 1800, netIncome: 1300, debtRatio: 110, ordinaryIncome: 0, sgaExpenses: 8700 },
        ofs: { sales: 58000, operatingProfit: 1800, netIncome: 1300, debtRatio: 110, ordinaryIncome: 0, sgaExpenses: 8700 }
      },
      isDongseo: {
        cfs: { sales: 420000, operatingProfit: 65000, netIncome: -18000, debtRatio: 130, ordinaryIncome: 0, sgaExpenses: 42000 },
        ofs: { sales: 310000, operatingProfit: 48000, netIncome: -11000, debtRatio: 115, ordinaryIncome: 0, sgaExpenses: 31000 }
      }
    },
    "2024 2Q": {
      daelimTrading: {
        cfs: { sales: 127000, operatingProfit: 6000, netIncome: -2300, debtRatio: 92, ordinaryIncome: 0, sgaExpenses: 19050 },
        ofs: { sales: 118000, operatingProfit: 4800, netIncome: -1500, debtRatio: 88, ordinaryIncome: 0, sgaExpenses: 17700 }
      },
      daelimBath: {
        cfs: { sales: 118000, operatingProfit: 4000, netIncome: 2950, debtRatio: 108, ordinaryIncome: 0, sgaExpenses: 17700 },
        ofs: { sales: 118000, operatingProfit: 4000, netIncome: 2950, debtRatio: 108, ordinaryIncome: 0, sgaExpenses: 17700 }
      },
      isDongseo: {
        cfs: { sales: 870000, operatingProfit: 137000, netIncome: -34000, debtRatio: 125, ordinaryIncome: 0, sgaExpenses: 87000 },
        ofs: { sales: 630000, operatingProfit: 101000, netIncome: -24000, debtRatio: 112, ordinaryIncome: 0, sgaExpenses: 63000 }
      }
    },
    "2024 3Q": {
      daelimTrading: {
        cfs: { sales: 188000, operatingProfit: 8500, netIncome: -3500, debtRatio: 98, ordinaryIncome: 0, sgaExpenses: 28200 },
        ofs: { sales: 175500, operatingProfit: 6800, netIncome: -2700, debtRatio: 94, ordinaryIncome: 0, sgaExpenses: 26325 }
      },
      daelimBath: {
        cfs: { sales: 175000, operatingProfit: 5500, netIncome: 3950, debtRatio: 112, ordinaryIncome: 0, sgaExpenses: 26250 },
        ofs: { sales: 175000, operatingProfit: 5500, netIncome: 3950, debtRatio: 112, ordinaryIncome: 0, sgaExpenses: 26250 }
      },
      isDongseo: {
        cfs: { sales: 1280000, operatingProfit: 197000, netIncome: -52000, debtRatio: 132, ordinaryIncome: 0, sgaExpenses: 128000 },
        ofs: { sales: 935000, operatingProfit: 145000, netIncome: -38000, debtRatio: 118, ordinaryIncome: 0, sgaExpenses: 93500 }
      }
    },
    "2024 4Q": {
      daelimTrading: {
        cfs: { sales: 256000, operatingProfit: 12500, netIncome: -5400, debtRatio: 89, ordinaryIncome: 0, sgaExpenses: 38400 },
        ofs: { sales: 238000, operatingProfit: 10000, netIncome: -4200, debtRatio: 86, ordinaryIncome: 0, sgaExpenses: 35700 }
      },
      daelimBath: {
        cfs: { sales: 237000, operatingProfit: 8000, netIncome: 5800, debtRatio: 105, ordinaryIncome: 0, sgaExpenses: 35550 },
        ofs: { sales: 237000, operatingProfit: 8000, netIncome: 5800, debtRatio: 105, ordinaryIncome: 0, sgaExpenses: 35550 }
      },
      isDongseo: {
        cfs: { sales: 1760000, operatingProfit: 278000, netIncome: -73000, debtRatio: 120, ordinaryIncome: 0, sgaExpenses: 176000 },
        ofs: { sales: 1285000, operatingProfit: 205000, netIncome: -49000, debtRatio: 107, ordinaryIncome: 0, sgaExpenses: 128500 }
      }
    }
  });

  // UI 토글 / 선택 상태 변수들
  const [activeMetric, setActiveMetric] = useState('sales'); // sales, operatingProfitMargin, sgaExpenses, sgaRatio, debtRatio, netIncome (총포괄손익)
  const [activeSwot, setActiveSwot] = useState('daelimBath');
  const [isConsolidated, setIsConsolidated] = useState(true); // true = 연결(cfs), false = 별도(ofs)
  const [isCumulative, setIsCumulative] = useState(true); // true = 누계액(Cumulative), false = 당분기(Single Q)
  
  // DART API 호출 매개변수들 - 환경변수 자동 바인딩
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_DART_API_KEY || '');
  const [selectedYear, setSelectedYear] = useState('2024');
  const [selectedQuarter, setSelectedQuarter] = useState('4Q'); // 1Q, 2Q, 3Q, 4Q
  
  // 최종 조회 확정 연도/분기 상태 변수 (시장 트렌드 정밀 패널 및 차트 동기화 버그 해결책)
  const [activeYear, setActiveYear] = useState('2024');
  const [activeQuarter, setActiveQuarter] = useState('4Q');

  const [marketSummary, setMarketSummary] = useState('');
  const [trendCards, setTrendCards] = useState([]);

  const [isDartLoading, setIsDartLoading] = useState(false);
  const [dartStatusText, setDartStatusText] = useState('');
  const [dartStatus, setDartStatus] = useState('READY'); // READY, SUCCESS, ERROR
  const [dartError, setDartError] = useState(null); // DART 연동 실패 에러 상태
  const [cfsUnavailableSet, setCfsUnavailableSet] = useState(new Set());
  const apiCacheRef = useRef(new Map());
  const [trendYears, setTrendYears] = useState(3);
  const [trendMetric, setTrendMetric] = useState('sales');
  const [isTrendLoading, setIsTrendLoading] = useState(false);
  const [trendStatusText, setTrendStatusText] = useState('');

  // 시장 동향 브리핑 및 8대 지표 100% 동적 연동 (Sync) 수선 - 연도/분기 드롭다운 변경 즉시 연동
  useEffect(() => {
    const { summary, list } = getMarketTrendsData(selectedYear, selectedQuarter);
    setMarketSummary(summary);
    setTrendCards(list);
  }, [selectedYear, selectedQuarter]);

  // ---------------------------------------------------------
  // DART 실시간 API 일괄 다중 호출 (자동 Looper) 시스템
  // ---------------------------------------------------------
  const handleFetchDartApi = async () => {
    if (!apiKey) {
      alert("Open DART API Key가 없습니다. 상단 설정 패널에 입력해주세요.");
      return;
    }

    setIsDartLoading(true);
    setDartStatus('LOADING');
    setDartError(null);

    // DART 보고서 코드 매핑
    const rCodeMap = {
      '1Q': '11013', // 1분기
      '2Q': '11012', // 반기
      '3Q': '11014', // 3분기
      '4Q': '11011'  // 사업보고서
    };

    const reprtCode = rCodeMap[selectedQuarter];
    const targetQuarterStr = `${selectedYear} ${selectedQuarter}`;

    // 연도/분기 확정 (시장 지표 동시 연동용)
    setActiveYear(selectedYear);
    setActiveQuarter(selectedQuarter);

    // 루프 실행을 위해 호출할 기업 목록 필터링
    const activeCompanies = companies.filter(c => c.corpCode);
    const totalCalls = activeCompanies.length * 2; // 각 기업별 연결(CFS) + 별도(OFS) 총 호출 횟수
    let currentCallCount = 0;
    
    // 호출 데이터 임시 누적 객체
    let newFinancialData = {};
    const localCfsUnavail = new Set();

    try {
      for (const company of activeCompanies) {
        // 1. 연결재무제표 (CFS) 호출
        currentCallCount++;
        setDartStatusText(`[${company.name}] 연결재무제표(CFS) 동기화 중... (${currentCallCount}/${totalCalls})`);
        
        let cfsData = null;
        try {
          const trimmedKey = apiKey.trim();
          const cfsCacheKey = `${trimmedKey}-${company.corpCode.trim()}-${selectedYear}-${reprtCode}-CFS`;
          if (apiCacheRef.current.has(cfsCacheKey)) {
            cfsData = apiCacheRef.current.get(cfsCacheKey);
          } else {
            cfsData = await fetchDartData(trimmedKey, company.corpCode.trim(), selectedYear, reprtCode, 'CFS');
            apiCacheRef.current.set(cfsCacheKey, cfsData);
          }
        } catch (e) {
          console.warn(`[DART API WARNING] ${company.name} 연결재무제표 호출 실패:`, e.message);
          localCfsUnavail.add(company.id);
        }

        await delay(300); // DART 초당 트래픽 제한 우회를 위한 0.3초의 지연 시간(Delay) 강제 적용

        // 2. 별도재무제표 (OFS) 호출
        currentCallCount++;
        setDartStatusText(`[${company.name}] 별도재무제표(OFS) 동기화 중... (${currentCallCount}/${totalCalls})`);

        let ofsData = null;
        try {
          const trimmedKey = apiKey.trim();
          const ofsCacheKey = `${trimmedKey}-${company.corpCode.trim()}-${selectedYear}-${reprtCode}-OFS`;
          if (apiCacheRef.current.has(ofsCacheKey)) {
            ofsData = apiCacheRef.current.get(ofsCacheKey);
          } else {
            ofsData = await fetchDartData(trimmedKey, company.corpCode.trim(), selectedYear, reprtCode, 'OFS');
            apiCacheRef.current.set(ofsCacheKey, ofsData);
          }
        } catch (e) {
          console.warn(`[DART API WARNING] ${company.name} 별도재무제표 호출 실패:`, e.message);
        }

        // 받아온 데이터를 임시 객체에 정립
        if (cfsData || ofsData) {
          newFinancialData[company.id] = {
            cfs: cfsData || { sales: 0, operatingProfit: 0, netIncome: 0, debtRatio: 0, ordinaryIncome: 0, sgaExpenses: 0 },
            ofs: ofsData || { sales: 0, operatingProfit: 0, netIncome: 0, debtRatio: 0, ordinaryIncome: 0, sgaExpenses: 0 }
          };
        }

        await delay(300); // 딜레이 안전장치
      }

      // 최종 데이터 바인딩
      setFinancialData(prev => {
        let baseData = prev;
        
        // 첫 성공 시 기존 Mock 데이터 전체 청소
        if (!isMockCleared) {
          const cleared = {};
          quarters.forEach(q => {
            cleared[q] = {};
            companies.forEach(c => {
              cleared[q][c.id] = {
                cfs: { sales: 0, operatingProfit: 0, netIncome: 0, debtRatio: 0, ordinaryIncome: 0, sgaExpenses: 0 },
                ofs: { sales: 0, operatingProfit: 0, netIncome: 0, debtRatio: 0, ordinaryIncome: 0, sgaExpenses: 0 }
              };
            });
          });
          baseData = cleared;
          setIsMockCleared(true);
        }

        const qData = baseData[targetQuarterStr] || {};
        
        // 루프 돌며 받아온 실데이터 병합
        const updatedQData = { ...qData };
        Object.keys(newFinancialData).forEach(compId => {
          updatedQData[compId] = newFinancialData[compId];
        });

        return {
          ...baseData,
          [targetQuarterStr]: updatedQData
        };
      });

      // 새로운 분기 범위 등록
      if (!quarters.includes(targetQuarterStr)) {
        setQuarters(prev => sortQuarters([...prev, targetQuarterStr]));
      }

      setCfsUnavailableSet(localCfsUnavail);
      const fetchedCount = Object.keys(newFinancialData).length;
      if (fetchedCount === 0) {
        setDartStatus('ERROR');
        setDartStatusText(`일괄 조회 실패: 모든 기업 데이터 없음 (API 키 오류 또는 해당 연도/분기 미공시)`);
        setDartError(`DART OpenAPI 일괄 조회 실패:\n- 요청 연도/분기: ${selectedYear}년 ${selectedQuarter}\n- 사유: 조회된 기업 데이터 없음 (전체 ${activeCompanies.length}개 기업 응답 없음)`);
      } else {
        const failedCfsCount = localCfsUnavail.size;
        setDartStatus('SUCCESS');
        setDartStatusText(
          failedCfsCount > 0
            ? `[DART] ${selectedYear}년 ${selectedQuarter} 동기화 완료 — ${fetchedCount}/${activeCompanies.length}개 기업 성공, ${failedCfsCount}개 연결재무 없음(CFS 미제출)`
            : `[DART 일괄 조회] ${selectedYear}년 ${selectedQuarter} 전체 기업 동기화 완료!`
        );
        setDartError(null);
      }
    } catch (err) {
      setDartStatus('ERROR');
      const errMsg = err.message || '일괄 조회 중 서버 이상';
      setDartStatusText(`일괄 동기화 실패: ${errMsg}`);
      setDartError(`DART OpenAPI 일괄 조회 실패:\n- 요청 연도/분기: ${selectedYear}년 ${selectedQuarter}\n- 사유: ${errMsg}`);
    } finally {
      setIsDartLoading(false);
    }
  };

  // ---------------------------------------------------------
  // 다년도 추이 일괄 조회
  // ---------------------------------------------------------
  const handleFetchTrendData = async () => {
    if (!apiKey) {
      alert("Open DART API Key가 없습니다. 상단 설정 패널에 입력해주세요.");
      return;
    }
    setIsTrendLoading(true);
    const rCodeMap = { '1Q': '11013', '2Q': '11012', '3Q': '11014', '4Q': '11011' };
    const reprtCode = rCodeMap[selectedQuarter];
    const activeCompanies = companies.filter(c => c.corpCode);
    const startYear = parseInt(selectedYear) - trendYears + 1;
    const years = Array.from({ length: trendYears }, (_, i) => String(startYear + i));
    const totalOps = years.length * activeCompanies.length * 2;
    let currentOp = 0;

    for (const year of years) {
      for (const company of activeCompanies) {
        for (const fsDiv of ['CFS', 'OFS']) {
          currentOp++;
          const fsDivLower = fsDiv.toLowerCase();
          const qKey = `${year} ${selectedQuarter}`;
          const cacheKey = `${apiKey.trim()}-${company.corpCode.trim()}-${year}-${reprtCode}-${fsDiv}`;
          setTrendStatusText(`[${year}년 ${company.name} ${fsDiv}] 조회 중 (${currentOp}/${totalOps})`);

          if (apiCacheRef.current.has(cacheKey)) {
            const cached = apiCacheRef.current.get(cacheKey);
            if (cached) {
              setFinancialData(prev => ({
                ...prev,
                [qKey]: { ...(prev[qKey] || {}), [company.id]: { ...(prev[qKey]?.[company.id] || {}), [fsDivLower]: cached } }
              }));
            }
          } else {
            try {
              const data = await fetchDartData(apiKey.trim(), company.corpCode.trim(), year, reprtCode, fsDiv);
              apiCacheRef.current.set(cacheKey, data);
              if (data) {
                setFinancialData(prev => ({
                  ...prev,
                  [qKey]: { ...(prev[qKey] || {}), [company.id]: { ...(prev[qKey]?.[company.id] || {}), [fsDivLower]: data } }
                }));
              }
            } catch (e) {
              console.warn(`[TREND] ${year}년 ${company.name} ${fsDiv}:`, e.message);
              apiCacheRef.current.set(cacheKey, null);
            }
            await delay(300);
          }
        }
      }
      const qKey = `${year} ${selectedQuarter}`;
      if (!quarters.includes(qKey)) {
        setQuarters(prev => sortQuarters([...prev, qKey]));
      }
    }

    setIsTrendLoading(false);
    setTrendStatusText(`다년도 추이 조회 완료! (${selectedYear}년 기준 최근 ${trendYears}년 ${selectedQuarter})`);
  };

  // ---------------------------------------------------------
  // CSV 내보내기
  // ---------------------------------------------------------
  const handleExportCSV = () => {
    const fsDiv = isConsolidated ? 'cfs' : 'ofs';
    const header = ['기업명', '기간', '공시구분', '집계모드', '매출액(백만)', '영업이익(백만)', '영업이익률(%)', '경상손익(백만)', '판관비(백만)', '판관비율(%)', '총포괄손익(백만)', '순이익률(%)', '부채비율(%)'];
    const rows = [header.join(',')];

    sortQuarters(quarters).forEach(q => {
      companies.forEach(company => {
        const sales = getComputedValue(company.id, q, 'sales', fsDiv);
        const op = getComputedValue(company.id, q, 'operatingProfit', fsDiv);
        const oi = getComputedValue(company.id, q, 'ordinaryIncome', fsDiv);
        const net = getComputedValue(company.id, q, 'netIncome', fsDiv);
        const sga = getComputedValue(company.id, q, 'sgaExpenses', fsDiv);
        const debt = getComputedValue(company.id, q, 'debtRatio', fsDiv);
        const opMargin = sales > 0 ? ((op / sales) * 100).toFixed(2) : '0.00';
        const sgaR = sales > 0 ? ((sga / sales) * 100).toFixed(2) : '0.00';
        const netMargin = sales > 0 ? ((net / sales) * 100).toFixed(2) : '0.00';
        rows.push([company.name, q, isConsolidated ? '연결(CFS)' : '별도(OFS)', isCumulative ? '누계액' : '당분기', sales, op, opMargin, oi, sga, sgaR, net, netMargin, debt < 0 ? '자본잠식' : debt].join(','));
      });
    });

    const blob = new Blob(['﻿' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DART_재무분석_${activeYear}${activeQuarter}_${isConsolidated ? 'CFS' : 'OFS'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ---------------------------------------------------------
  // 당분기 vs 누계액(누적값) 수학적 역산 연산기 구현
  // ---------------------------------------------------------
  const getComputedValue = (companyId, quarterStr, metric, fsDiv) => {
    const qData = financialData[quarterStr];
    const currentVal = qData?.[companyId]?.[fsDiv]?.[metric] ?? 0;

    if (metric === 'debtRatio') return currentVal;
    if (isCumulative) return currentVal;

    const [year, q] = quarterStr.split(' ');
    if (q === '1Q') {
      return currentVal;
    }

    let prevQKey = '';
    if (q === '2Q') prevQKey = `${year} 1Q`;
    else if (q === '3Q') prevQKey = `${year} 2Q`;
    else if (q === '4Q') prevQKey = `${year} 3Q`;

    const prevQData = financialData[prevQKey];
    const prevVal = prevQData?.[companyId]?.[fsDiv]?.[metric] ?? 0;

    const diff = currentVal - prevVal;
    
    if (metric === 'sales' || metric === 'sgaExpenses') {
      return diff >= 0 ? diff : (currentVal > 0 ? currentVal : 0);
    }
    
    return diff;
  };

  // ---------------------------------------------------------
  // 차트 최종 바인딩 데이터 생성
  // ---------------------------------------------------------
  const finalChartData = quarters.map(qKey => {
    const fsDiv = isConsolidated ? 'cfs' : 'ofs';
    const row = { quarter: qKey };
    
    companies.forEach(company => {
      if (activeMetric === 'operatingProfitMargin') {
        const sales = getComputedValue(company.id, qKey, 'sales', fsDiv);
        const op = getComputedValue(company.id, qKey, 'operatingProfit', fsDiv);
        row[company.name] = sales > 0 ? parseFloat(((op / sales) * 100).toFixed(2)) : 0;
      } else if (activeMetric === 'sgaRatio') {
        const sales = getComputedValue(company.id, qKey, 'sales', fsDiv);
        const sga = getComputedValue(company.id, qKey, 'sgaExpenses', fsDiv);
        row[company.name] = sales > 0 ? parseFloat(((sga / sales) * 100).toFixed(2)) : 0;
      } else {
        row[company.name] = getComputedValue(company.id, qKey, activeMetric, fsDiv);
      }
    });
    
    return row;
  });

  const getMetricLabel = () => {
    const prefix = isCumulative ? '[누계액]' : '[당분기 실적]';
    switch (activeMetric) {
      case 'sales': return `${prefix} 매출액 (단위: 백만원)`;
      case 'operatingProfitMargin': return `${prefix} 영업이익률 (단위: %)`;
      case 'sgaExpenses': return `${prefix} 판관비 총계 (단위: 백만원)`;
      case 'sgaRatio': return `${prefix} 판관비율 (단위: %)`;
      case 'debtRatio': return `부채비율 (단위: %) - *기말 잔액 시점기준`;
      case 'ordinaryIncome': return `${prefix} 경상손익 (법인세차감전순이익) (단위: 백만원)`;
      case 'netIncome': return `${prefix} 총포괄손익 (단위: 백만원) - *적자(손실) 시 마이너스 부호 표기`;
      default: return '';
    }
  };

  // SWOT 분석 바인딩용
  const activeSwotData = swotData[activeSwot] || swotData.daelimBath;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* 🚀 상단 고급 헤더 */}
      <header className="glass-panel rounded-2xl p-6 mb-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-2.5 h-full bg-gradient-to-b from-indigo-500 via-cyan-500 to-rose-500"></div>
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="bg-indigo-500/10 text-indigo-400 text-xs px-2.5 py-1 rounded-full font-semibold border border-indigo-500/20 tracking-wider">
              REAL-TIME FACT SYSTEM
            </span>
            <span className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-semibold border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Auto Looping & Fallback Engine
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Open DART 실시간 재무 & 시장 분석 대시보드
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-2xl leading-relaxed">
            금감원 Open DART 공시 데이터를 CORS 프록시 터널을 통해 실시간으로 자동 일괄 동기화(연결/별도 동시 수집)하며, 당분기 역산 연산 및 총포괄손익 지표를 매핑합니다.
          </p>
        </div>

        {/* 🔑 DART API 설정 및 실시간 조회창 */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-3 w-full lg:w-auto lg:min-w-[360px] shadow-lg">
          <div className="flex items-center justify-between text-xs font-bold text-slate-200">
            <span className="flex items-center gap-1.5">
              <Key className="w-4 h-4 text-indigo-400" />
              Open DART API 설정 (환경변수 바인딩)
            </span>
            <span className="text-[10px] text-slate-500">Vercel Serverless Proxy</span>
          </div>
          
          <input 
            type="password" 
            placeholder="DART_API_KEY 입력" 
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />

          {/* 실시간 DART 데이터 호출 폼 */}
          <div className="grid grid-cols-2 gap-1.5">
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              {Array.from({ length: 16 }, (_, i) => 2010 + i).map(y => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </select>
            <select 
              value={selectedQuarter} 
              onChange={(e) => setSelectedQuarter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="1Q">1분기 (1Q)</option>
              <option value="2Q">반기 (2Q)</option>
              <option value="3Q">3분기 (3Q)</option>
              <option value="4Q">사업 (4Q)</option>
            </select>
          </div>

          <button 
            onClick={handleFetchDartApi}
            disabled={isDartLoading}
            className={`w-full text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
              isDartLoading 
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/10'
            }`}
          >
            {isDartLoading ? "자동 일괄 조회 중..." : "DART 전체 기업 일괄 조회"}
          </button>

          {/* DART API 연동 상태 및 로깅 메시지 */}
          <div className="flex items-center gap-2 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-900 text-[10px]">
            <span className={`w-2 h-2 rounded-full ${
              dartStatus === 'SUCCESS' ? 'bg-emerald-400' : dartStatus === 'ERROR' ? 'bg-rose-400' : 'bg-amber-400 animate-pulse'
            }`}></span>
            <span className="text-slate-400 truncate flex-1">{dartStatusText || "DART API 키 자동 바인딩 완료"}</span>
          </div>
        </div>
      </header>

      {/* 🛠 /> 기업 설정 패널 (조회 라인업 교정 및 8자리 고유코드 정합성 더블 체크) */}
      <section className="glass-panel rounded-2xl p-5 mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <Grid className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-md font-bold text-slate-100">조회 대상 기업 라인업 (금감원 고유번호 지정 매칭 완료)</h2>
              <p className="text-slate-400 text-xs">일괄 동기화 대상 기업의 명칭과 DART DB 매핑 8자리 고유 식별 번호 목록</p>
            </div>
          </div>
        </div>

        {/* 현재 등록 기업 배지 배정 */}
        <div className="flex flex-wrap gap-2.5">
          {companies.map(c => (
            <div 
              key={c.id} 
              className="flex items-center gap-2 bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-2"
              style={{ borderLeft: `3px solid ${c.color}` }}
            >
              <div>
                <div className="text-xs font-bold text-slate-200">{c.name}</div>
                <div className="text-[10px] text-indigo-400 font-mono font-semibold">DART 고유코드: {c.displayCode}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 📊 분석 및 실시간 제어판 영역 */}
      <div className="grid grid-cols-1 gap-8 mb-8">
        
        {/* 대시보드 차트 메인 영역 (수동 에디터 폼 삭제에 따라 Full-Width 전체 폭으로 가독성 확장) */}
        <section className="glass-panel rounded-2xl p-6 flex flex-col justify-between shadow-lg relative">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-100">재무 비교 분석 차트</h2>
                  <p className="text-slate-400 text-xs">{getMetricLabel()}</p>
                </div>
              </div>

              {/* 🎛️ 분석 제어 제어 스위치 그룹 */}
              <div className="flex flex-wrap gap-3.5 items-center">
                {/* 1. 연결 vs 별도 토글 */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 px-1">공시구분:</span>
                    <button
                      onClick={() => setIsConsolidated(true)}
                      className={`px-2 py-1 text-[10px] font-extrabold rounded ${isConsolidated ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500'}`}
                    >
                      연결 (CFS)
                    </button>
                    <button
                      onClick={() => setIsConsolidated(false)}
                      className={`px-2 py-1 text-[10px] font-extrabold rounded ${!isConsolidated ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500'}`}
                    >
                      별도 (OFS)
                    </button>
                  </div>
                  {isConsolidated && cfsUnavailableSet.size > 0 && (
                    <span className="text-[9px] text-amber-400 flex items-center gap-1 px-1">
                      ⚠ 연결재무 없음: {companies.filter(c => cfsUnavailableSet.has(c.id)).map(c => c.name).join(', ')}
                    </span>
                  )}
                </div>

                {/* 2. 당분기 vs 누계액 토글 */}
                <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 px-1">집계모드:</span>
                  <button 
                    onClick={() => setIsCumulative(true)}
                    className={`px-2 py-1 text-[10px] font-extrabold rounded ${isCumulative ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500'}`}
                  >
                    누계액
                  </button>
                  <button 
                    onClick={() => setIsCumulative(false)}
                    className={`px-2 py-1 text-[10px] font-extrabold rounded ${!isCumulative ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500'}`}
                  >
                    당분기
                  </button>
                </div>
              </div>

            </div>

            {/* 재무계정 탭 선택 */}
            <div className="flex flex-wrap gap-1 bg-slate-950 p-1 rounded-lg border border-slate-850 self-start mb-4">
              {[
                { id: 'sales', label: '매출액 (Sales)' },
                { id: 'operatingProfitMargin', label: '영업이익률 (OP Margin)' },
                { id: 'sgaExpenses', label: '판관비 총계 (SG&A)' },
                { id: 'sgaRatio', label: '판관비율 (SG&A Ratio)' },
                { id: 'ordinaryIncome', label: '경상손익 (Ordinary Income)' },
                { id: 'netIncome', label: '총포괄손익 (Comprehensive Income)' },
                { id: 'debtRatio', label: '부채비율 (Debt Ratio)' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveMetric(tab.id)}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
                    activeMetric === tab.id
                      ? 'bg-slate-800 text-white shadow border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* DART 연동 실패/시뮬레이션 모드 경고 배너 */}
            {dartError && (
              <div className="mt-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 flex items-start gap-2.5 shadow-md">
                <span className="p-1 bg-amber-500/20 text-amber-400 rounded-md shrink-0">
                  <Info className="w-4 h-4" />
                </span>
                <div className="flex-1">
                  <div className="text-xs font-bold text-amber-400">DART 실시간 조회 실패 - 시뮬레이션 모드로 전환되었습니다</div>
                  <p className="text-[10px] text-slate-300 mt-0.5 leading-relaxed font-semibold">
                    {dartError.split('\n')[0]}
                  </p>
                  <button 
                    onClick={() => setDartError(null)}
                    className="mt-1.5 text-[9px] font-extrabold text-amber-400 hover:text-amber-300 underline cursor-pointer"
                  >
                    경고 지우기 및 샘플 데이터 복원
                  </button>
                </div>
              </div>
            )}

            {/* Recharts 차트 렌더링 */}
            <div className="h-[400px] w-full mt-4">
              {finalChartData.length === 0 || finalChartData.every(row => companies.every(c => !row[c.name] || row[c.name] === 0)) ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center text-slate-500">
                    <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-semibold">데이터 없음</p>
                    <p className="text-xs mt-1 text-slate-600">DART 일괄 조회를 실행하거나 다른 기간을 선택하세요.</p>
                  </div>
                </div>
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={finalChartData}
                  margin={{ top: 20, right: 10, bottom: 5, left: -10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.4} />
                  <XAxis dataKey="quarter" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => {
                      const isPercent = ['operatingProfitMargin', 'debtRatio', 'sgaRatio'].includes(activeMetric);
                      return isPercent ? `${val}%` : `${val.toLocaleString()}M`;
                    }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0d1224', 
                      borderColor: '#1f2954',
                      borderRadius: '12px',
                      color: '#f8fafc',
                      fontSize: '12px'
                    }} 
                    formatter={(value, name) => {
                      const isPercent = ['operatingProfitMargin', 'debtRatio', 'sgaRatio'].includes(activeMetric);
                      const unit = isPercent ? '%' : ' 백만원';
                      return [`${value.toLocaleString()}${unit}`, name];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
                  
                  {/* 동적 회사 매핑 렌더링 */}
                  {companies.map((company, index) => {
                    const isFirst = index === 0; // 대림통상(자사)을 첫 번째로 강조 처리
                    
                    if (activeMetric === 'operatingProfitMargin' || activeMetric === 'sgaRatio') {
                      return (
                        <Line 
                          key={company.id}
                          name={company.name}
                          type="monotone"
                          dataKey={company.name}
                          stroke={company.color}
                          strokeWidth={isFirst ? 3.5 : 2}
                          dot={{ r: isFirst ? 4 : 2 }}
                          activeDot={{ r: 6 }}
                        />
                      );
                    }
                    return (
                      <Bar 
                        key={company.id}
                        name={company.name}
                        dataKey={company.name}
                        fill={company.color}
                        opacity={isFirst ? 0.95 : 0.65}
                        stroke={isFirst ? '#ffffff' : 'transparent'}
                        strokeWidth={isFirst ? 1 : 0}
                        radius={[4, 4, 0, 0]}
                      />
                    );
                  })}
                </ComposedChart>
              </ResponsiveContainer>
              )}
            </div>

          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <Info className="w-4 h-4 text-indigo-400" />
              <span>당분기 실적 모드는 DART 누계액에서 전분기값을 빼 역산한 순수 분기 성과입니다.</span>
            </span>
            <span className="text-[10px] text-slate-500">
              * 출처: 금융감독원 Open DART 공시 데이터
            </span>
          </div>
        </section>
      </div>

      {/* 📈 연간 다년도 추이 비교 */}
      <section className="glass-panel rounded-2xl p-6 mb-8 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">연간 다년도 추이 비교</h2>
              <p className="text-slate-400 text-xs">동일 분기 기준 연도별 비교 추이 ({activeQuarter} 기준, {isConsolidated ? '연결' : '별도'})</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center self-start sm:self-auto">
            <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 px-1">조회 범위:</span>
              {[3, 5].map(n => (
                <button key={n} onClick={() => setTrendYears(n)}
                  className={`px-2 py-1 text-[10px] font-extrabold rounded ${trendYears === n ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>
                  최근 {n}년
                </button>
              ))}
            </div>
            <button onClick={handleFetchTrendData} disabled={isTrendLoading || !apiKey}
              className={`text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all ${
                isTrendLoading || !apiKey ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-cyan-700 hover:bg-cyan-600 text-white'
              }`}>
              <Calendar className="w-3.5 h-3.5" />
              {isTrendLoading ? '조회 중...' : '다년도 일괄 조회'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 mb-4">
          {[
            { id: 'sales', label: '매출액' },
            { id: 'operatingProfit', label: '영업이익' },
            { id: 'operatingProfitMargin', label: '영업이익률' },
            { id: 'ordinaryIncome', label: '경상손익' },
            { id: 'netIncome', label: '총포괄손익' },
            { id: 'debtRatio', label: '부채비율' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setTrendMetric(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                trendMetric === tab.id ? 'bg-slate-800 text-white shadow border border-slate-700' : 'text-slate-400 hover:text-slate-200'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {trendStatusText && (
          <div className="mb-4 text-[10px] text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isTrendLoading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></span>
            {trendStatusText}
          </div>
        )}

        {(() => {
          const fsDiv = isConsolidated ? 'cfs' : 'ofs';
          const trendChartData = Array.from({ length: trendYears }, (_, i) => {
            const year = String(parseInt(activeYear) - (trendYears - 1 - i));
            const qKey = `${year} ${activeQuarter}`;
            const row = { year };
            companies.forEach(company => {
              const d = financialData[qKey]?.[company.id]?.[fsDiv];
              const sales = d?.sales ?? 0;
              const op = d?.operatingProfit ?? 0;
              if (trendMetric === 'operatingProfitMargin') {
                row[company.name] = sales > 0 ? parseFloat(((op / sales) * 100).toFixed(2)) : 0;
              } else {
                row[company.name] = d?.[trendMetric] ?? 0;
              }
            });
            return row;
          });
          const isTrendEmpty = trendChartData.every(row => companies.every(c => !row[c.name] || row[c.name] === 0));
          const isPercent = ['operatingProfitMargin', 'debtRatio'].includes(trendMetric);
          return isTrendEmpty ? (
            <div className="h-[280px] flex items-center justify-center">
              <div className="text-center text-slate-500">
                <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-semibold">데이터 없음</p>
                <p className="text-xs mt-1">다년도 일괄 조회를 실행하세요.</p>
              </div>
            </div>
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendChartData} margin={{ top: 20, right: 10, bottom: 5, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.4} />
                  <XAxis dataKey="year" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                    tickFormatter={v => isPercent ? `${v}%` : `${v.toLocaleString()}M`} />
                  <Tooltip contentStyle={{ backgroundColor: '#0d1224', borderColor: '#1f2954', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }}
                    formatter={(value, name) => [`${value.toLocaleString()}${isPercent ? '%' : ' 백만원'}`, name]} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
                  {companies.map((company, index) => (
                    <Line key={company.id} name={company.name} type="monotone" dataKey={company.name}
                      stroke={company.color} strokeWidth={index === 0 ? 3 : 2}
                      dot={{ r: index === 0 ? 4 : 2.5 }} activeDot={{ r: 6 }} />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          );
        })()}
      </section>

      {/* 🏡 시장 트렌드 분석 패널 (useEffect를 통해 activeYear, activeQuarter에 100% 동기화됨) */}
      <section className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <Layers3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">시장 트렌드 정밀 패널 (8대 지표)</h2>
              <p className="text-slate-400 text-xs">확정 조회 기준 연도/분기에 따라 실시간 동기화된 선행 지표들</p>
            </div>
          </div>
          
          <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl px-3 py-1 text-xs text-indigo-400 font-bold self-start md:self-auto">
            동기화 기준 기간: {activeYear}년 {activeQuarter}
          </div>
        </div>

        {/* 시장 동향 브리핑 요약 */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 mb-6 flex items-start gap-3 shadow-md">
          <div className="p-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg shrink-0">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">시장 동향 브리핑 요약</div>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed font-semibold">
              {marketSummary}
            </p>
          </div>
        </div>

        {/* 8대 지표 카드 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {trendCards.map(card => (
            <div 
              key={card.id} 
              className="glass-panel glass-panel-hover rounded-2xl p-5 flex flex-col justify-between shadow-md relative overflow-hidden"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-slate-400 text-[11px] font-semibold tracking-tight">{card.title}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    card.isUp 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                    {card.change}
                  </span>
                </div>
                <div className="text-xl font-extrabold text-white mt-1 mb-1 tracking-tight">
                  {card.value}
                </div>
                <p className="text-slate-400 text-[10px] leading-relaxed mb-4">
                  {card.desc}
                </p>
              </div>

              {/* 미니 스파크라인 그래픽 */}
              <div className="h-10 w-full mt-2">
                <ResponsiveContainer width="100%" height={40}>
                  <LineChart data={card.chartData}>
                    <Line 
                      type="monotone" 
                      dataKey="v" 
                      stroke={card.color} 
                      strokeWidth={2} 
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 📋 재무 실무 수치 비교 데이터 테이블 (가독성 최적화) */}
      <section className="glass-panel rounded-2xl p-6 mb-8 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <Grid className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">{activeYear}년 {activeQuarter} 재무 수치 데이터 테이블</h2>
              <p className="text-slate-400 text-xs">
                선택된 기준 분기({activeYear}년 {activeQuarter})의 각 기업별 실무 재무 수치 비교표입니다. (공시: {isConsolidated ? '연결' : '별도'}, 집계: {isCumulative ? '누계액' : '당분기'})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-slate-500 text-[10px] font-semibold">* 모든 금액 단위: 백만원 / 비율: %</span>
            <button onClick={handleExportCSV}
              className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-emerald-400 bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg transition-colors">
              <Download className="w-3.5 h-3.5" />
              CSV 내보내기
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800/80">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 text-slate-300 text-xs font-bold border-b border-slate-800">
                <th className="p-4">기업명</th>
                <th className="p-4 text-right">매출액</th>
                <th className="p-4 text-right">영업이익</th>
                <th className="p-4 text-right">영업이익률</th>
                <th className="p-4 text-right">경상손익</th>
                <th className="p-4 text-right">판관비 총계</th>
                <th className="p-4 text-right">판관비율</th>
                <th className="p-4 text-right">총포괄손익</th>
                <th className="p-4 text-right">순이익률</th>
                <th className="p-4 text-right">부채비율</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300 text-xs">
              {companies.map(company => {
                const fsDiv = isConsolidated ? 'cfs' : 'ofs';
                const targetQuarterStr = `${activeYear} ${activeQuarter}`;
                const sales = getComputedValue(company.id, targetQuarterStr, 'sales', fsDiv);
                const op = getComputedValue(company.id, targetQuarterStr, 'operatingProfit', fsDiv);
                const oi = getComputedValue(company.id, targetQuarterStr, 'ordinaryIncome', fsDiv);
                const sga = getComputedValue(company.id, targetQuarterStr, 'sgaExpenses', fsDiv);
                const net = getComputedValue(company.id, targetQuarterStr, 'netIncome', fsDiv);
                const debt = getComputedValue(company.id, targetQuarterStr, 'debtRatio', fsDiv);

                const opMargin = sales > 0 ? ((op / sales) * 100).toFixed(2) : '0.00';
                const sgaRatio = sales > 0 ? ((sga / sales) * 100).toFixed(2) : '0.00';
                const netMargin = sales > 0 ? ((net / sales) * 100).toFixed(2) : '0.00';

                return (
                  <tr key={company.id} className="hover:bg-slate-900/40 transition-colors border-b border-slate-800/45">
                    <td className="p-4 font-bold">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: company.color }}></span>
                        <div className="flex flex-col">
                          <span className="text-slate-200">{company.name}</span>
                          <span className="text-[9px] text-slate-500 font-mono">DART: {company.displayCode}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right font-medium text-slate-100">{sales.toLocaleString()}</td>
                    <td className={`p-4 text-right font-semibold ${op < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {op >= 0 ? '+' : ''}{op.toLocaleString()}
                    </td>
                    <td className={`p-4 text-right font-semibold ${parseFloat(opMargin) < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {parseFloat(opMargin) >= 0 ? '+' : ''}{opMargin}%
                    </td>
                    <td className={`p-4 text-right font-semibold ${oi < 0 ? 'text-rose-400' : 'text-cyan-400'}`}>
                      {oi >= 0 ? '+' : ''}{oi.toLocaleString()}
                    </td>
                    <td className="p-4 text-right text-slate-300">{sga.toLocaleString()}</td>
                    <td className="p-4 text-right text-slate-300 font-semibold">{sgaRatio}%</td>
                    <td className="p-4 text-right">
                      <span className={`inline-block px-2.5 py-1 rounded-lg font-bold border ${
                        net < 0
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        {net >= 0 ? '+' : ''}{net.toLocaleString()}
                      </span>
                    </td>
                    <td className={`p-4 text-right font-semibold ${parseFloat(netMargin) < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {parseFloat(netMargin) >= 0 ? '+' : ''}{netMargin}%
                    </td>
                    <td className="p-4 text-right text-slate-300 font-semibold">
                      {debt < 0 ? (
                        <span className="text-rose-400 font-bold">자본잠식</span>
                      ) : `${debt}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 📌 SWOT 분석 매칭 테이블 */}
      <section className="glass-panel rounded-2xl p-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">경쟁사 SWOT 분석 매칭 탭</h2>
              <p className="text-slate-400 text-xs">경쟁 기업별 강점/약점과 자사(대림통상)와의 비교 포인트 매칭 <span className="text-amber-500/70">※ 내부 작성 정성 데이터 기준 (DART 미연동)</span></p>
            </div>
          </div>

          {/* 경쟁사 선택 탭 */}
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 self-start sm:self-auto">
            {[
              { id: 'daelimBath', label: '대림바스' },
              { id: 'isDongseo', label: '아이에스동서' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSwot(tab.id)}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                  activeSwot === tab.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* SWOT 2x2 그리드 레이아웃 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Strength (강점) */}
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/5 rounded-full blur-xl"></div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-extrabold flex items-center justify-center text-xs">S</span>
              <h3 className="text-sm font-bold text-slate-200">Strength (강점)</h3>
            </div>
            <ul className="space-y-2 text-xs text-slate-400">
              {activeSwotData.s.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-indigo-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Weakness (약점) */}
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/5 rounded-full blur-xl"></div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 font-extrabold flex items-center justify-center text-xs">W</span>
              <h3 className="text-sm font-bold text-slate-200">Weakness (약점)</h3>
            </div>
            <ul className="space-y-2 text-xs text-slate-400">
              {activeSwotData.w.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-rose-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Opportunity (기회) */}
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-xl"></div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-extrabold flex items-center justify-center text-xs">O</span>
              <h3 className="text-sm font-bold text-slate-200">Opportunity (기회)</h3>
            </div>
            <ul className="space-y-2 text-xs text-slate-400">
              {activeSwotData.o.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-emerald-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Threat (위협) */}
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 rounded-full blur-xl"></div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 font-extrabold flex items-center justify-center text-xs">T</span>
              <h3 className="text-sm font-bold text-slate-200">Threat (위협)</h3>
            </div>
            <ul className="space-y-2 text-xs text-slate-400">
              {activeSwotData.t.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-amber-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 자사(대림통상) 대비 핵심 대응 전략 & 비교 포인트 (자사 주체 서술 전환) */}
        <div className="bg-indigo-950/20 border border-indigo-800/40 rounded-xl p-5 flex flex-col md:flex-row gap-4 items-start relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-lg shrink-0">
            <Zap className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-100 mb-1.5 flex items-center gap-1.5">
              <span>{activeSwotData.name} 대비 대림통상의 핵심 대응 전략 & 비교 포인트</span>
              <span className="bg-indigo-500/10 text-indigo-400 text-[10px] px-2 py-0.5 rounded border border-indigo-500/20">Strategy Insight</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              {activeSwotData.compare}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
