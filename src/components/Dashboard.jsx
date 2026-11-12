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
  Download,
  BarChart2,
  Newspaper,
  Building2,
  RefreshCw
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
const swotData = {
  lxhausys: {
    name: "LX하우시스",
    s: ["수전·비데(도비도스) 등 욕실 기구 단일 카테고리에 집중한 전문 제조사로서 품목별 제품 대응 속도", "LX하우시스 패키지에 없는 수전·비데 전문 품목을 공급할 수 있는 보완적 위치"],
    w: ["2024년 연결 매출 기준 대림통상 1,370억원 vs LX하우시스 3조 5,720억원 (약 3.8% 수준)으로 마케팅·유통 투자 여력 열세", "창호·바닥재·벽지까지 묶는 LX Z:IN 토탈 리모델링 패키지에 대응할 자체 토탈 패키지 부재"],
    o: ["LX Z:IN 욕실 리모델링 패키지에 수전·비데 공급사로 참여하는 협력 가능성", "노후 주택 욕실 리모델링 수요에서 단품 교체 시장(수전·비데) 공략"],
    t: ["대형 브랜드의 토탈 리모델링 패키지 확대 시 수전이 패키지 내 부품으로 묶여 단가 협상력 약화", "패키지사가 수전을 저가 OEM으로 조달할 경우 가격 경쟁 심화"],
    compare: "LX하우시스는 2021년 7월 LG그룹에서 계열분리된 LX그룹 계열의 종합 건자재사로, 창호·바닥재·벽지와 LX Z:IN 욕실 리모델링을 함께 운영합니다. 수전·비데 단품에서 직접 맞붙기보다 토탈 패키지 채널에서 경쟁과 협력이 동시에 생기는 관계이므로, 대림통상은 패키지 공급사 진입과 단품 교체 시장 방어를 병행하는 것이 현실적입니다. (규모 수치: DART 2024년 연결 매출)"
  },
  kcc: {
    name: "KCC",
    s: ["욕실 수전·비데(도비도스) 전문 브랜드 — KCC는 해당 품목 사업이 없음", "욕실 기구 단일 카테고리 집중에 따른 제품·유통 전문성"],
    w: ["2024년 연결 매출 기준 대림통상 1,370억원 vs KCC 6조 6,588억원으로 규모·자본력 격차가 매우 큼", "건축자재 B2B 영업망(건설사·시공사) 규모에서 열세"],
    o: ["KCC의 실리콘·실란트 등 욕실 시공 부자재와는 경쟁이 아닌 보완 관계로 공동 영업 가능성", "건설사 B2B 납품 시 마감재·부자재사와 연계한 패키지 제안"],
    t: ["욕실 리모델링 B2C 채널은 KCC가 아닌 KCC글라스(홈씨씨)가 운영 — 해당 채널 내 경쟁사 수전 채택 시 진입 장벽", "건설 경기 둔화 시 B2B 건자재 전반의 단가 인하 압박"],
    compare: "KCC는 2020년 1월 유리·홈씨씨·바닥재 사업을 KCC글라스로 인적분할한 뒤 도료·실리콘·건축자재 중심으로 재편되어, 대림통상의 수전·비데와 직접 경쟁하는 품목은 없습니다. 비교 대상이라기보다 B2B 건자재 시장의 참고 지표이며, 욕실 리모델링 채널 관점에서는 KCC글라스(홈씨씨)를 별도로 보는 것이 정확합니다. (규모 수치: DART 2024년 연결 매출)"
  },
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
    o: ["이누스(2020년 아이에스동서가 E&F PE에 2,170억원에 매각)가 2026년 4월 기업회생을 신청, 5월 회생절차 개시 → 위생도기·비데 시장 공급 공백에 따른 대체 수요", "절수 센서 및 터치식 비접촉 스마트 수전 프리미엄 시장 점유 확대"],
    t: ["원자재(구리, 아연) 수입 물가 변동성에 따른 순수 제조 원가율 상승 리스크", "메이저 건설사의 B2B 조달 단가 인하 경쟁 유도에 따른 마진 방어 부담"],
    compare: "아이에스동서는 2020년 요업(이누스) 부문을 사모펀드 E&F PE에 매각해 현재는 욕실 자재 사업을 하지 않는 건설 중심 기업으로, 직접 경쟁사라기보다 과거 경쟁 구도의 비교 대상입니다. 실제 욕실 시장 경쟁자였던 이누스는 2026년 4월 기업회생을 신청했으므로, 대림통상은 이누스 거래처(건설사 특판·대리점)의 대체 공급 수요를 선점하는 데 영업력을 집중할 필요가 있습니다."
  }
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 법정 제출기한(사업 3/31, 1Q 5/15, 반기 8/14, 3Q 11/14)이 지난 가장 최근 보고서 기간
const getLatestFiledPeriod = (now = new Date()) => {
  const y = now.getFullYear();
  const md = (now.getMonth() + 1) * 100 + now.getDate();
  if (md > 1114) return { year: String(y), quarter: '3Q' };
  if (md > 814) return { year: String(y), quarter: '2Q' };
  if (md > 515) return { year: String(y), quarter: '1Q' };
  if (md > 331) return { year: String(y - 1), quarter: '4Q' };
  return { year: String(y - 1), quarter: '3Q' };
};
const LATEST_PERIOD = getLatestFiledPeriod();

// 금액은 원 단위 정밀도(백만원 소수)로 보관하고 표시 시점에만 반올림 — 당분기 역산 시 반올림 오차 방지
const roundM = (v) => Math.round(v) || 0;
const fmtM = (v) => roundM(v).toLocaleString('ko-KR');

export default function Dashboard() {
  // 1. 기업 리스트 상태 - corpCode: DART 고유번호(company.json 검증), stockTicker: KOSPI 종목코드
  const [companies, setCompanies] = useState([
    { id: 'daelimTrading', name: '대림통상', corpCode: '00109824', color: '#6366f1', stockTicker: '006570.KS' },
    { id: 'daelimBath', name: '대림바스', corpCode: '00109754', color: '#06b6d4', stockTicker: '005750.KS' },
    { id: 'isDongseo', name: '아이에스동서', corpCode: '00115977', color: '#10b981', stockTicker: '010780.KS' },
    { id: 'lxhausys', name: 'LX하우시스', corpCode: '00759513', color: '#f59e0b', stockTicker: '108670.KS' },
    { id: 'kcc', name: 'KCC', corpCode: '00105271', color: '#ec4899', stockTicker: '002380.KS' },
  ]);


  // 2. 분기 범위 상태 - DART 조회 완료 시 해당 연도 1Q~선택 분기로 설정
  const [quarters, setQuarters] = useState([]);

  // 3. 재무 데이터 상태 (연결/별도 이원화, 백만원 단위) - DART 실조회 값만 저장 (샘플 수치 미사용)
  const [financialData, setFinancialData] = useState({});

  // UI 토글 / 선택 상태 변수들
  const [activeMetric, setActiveMetric] = useState('sales'); // sales, operatingProfitMargin, sgaExpenses, sgaRatio, debtRatio, netIncome (총포괄손익)
  const [activeSwot, setActiveSwot] = useState('daelimBath');
  const [isConsolidated, setIsConsolidated] = useState(true); // true = 연결(cfs), false = 별도(ofs)
  const [isCumulative, setIsCumulative] = useState(true); // true = 누계액(Cumulative), false = 당분기(Single Q)
  
  // DART API 호출 매개변수들 - 환경변수 자동 바인딩
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_DART_API_KEY || '');
  const [selectedYear, setSelectedYear] = useState(LATEST_PERIOD.year);
  const [selectedQuarter, setSelectedQuarter] = useState(LATEST_PERIOD.quarter); // 1Q, 2Q, 3Q, 4Q

  // 최종 조회 확정 연도/분기 (테이블·차트·시장 패널 기준)
  const [activeYear, setActiveYear] = useState(LATEST_PERIOD.year);
  const [activeQuarter, setActiveQuarter] = useState(LATEST_PERIOD.quarter);

  const [marketSummary, setMarketSummary] = useState('');
  const [trendCards, setTrendCards] = useState([]);
  const [stockData, setStockData] = useState({});
  const [isStockLoading, setIsStockLoading] = useState(true);
  const [disclosures, setDisclosures] = useState(null);
  const [activeDisclosureTab, setActiveDisclosureTab] = useState('');

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

  // 시장 지표 패널은 조회 확정 기간(activeYear/activeQuarter)에 맞춰 갱신
  useEffect(() => {
    const { summary, list } = getMarketTrendsData(activeYear, activeQuarter);
    setMarketSummary(summary);
    setTrendCards(list);
  }, [activeYear, activeQuarter]);

  // 주가 실시간 조회 (Yahoo Finance 프록시 → /api/stock)
  useEffect(() => {
    const fetchAllStocks = async () => {
      setIsStockLoading(true);
      const results = {};
      await Promise.all(
        companies.filter(c => c.stockTicker).map(async (company) => {
          try {
            const res = await fetch(`/api/stock?ticker=${company.stockTicker}`);
            const data = await res.json();
            const chart = data?.chart?.result?.[0];
            if (!chart) return;
            const meta = chart.meta;
            const rawCloses = chart.indicators?.quote?.[0]?.close || [];
            const bars = (chart.timestamp || [])
              .map((t, i) => ({ t, c: rawCloses[i] }))
              .filter(b => b.c != null);
            const closes = bars.map(b => b.c);
            const price = meta.regularMarketPrice;
            // chartPreviousClose는 조회 구간(1개월) 시작 전 종가라 전일비 기준이 아님 → 일봉에서 직전 거래일 종가 사용
            const kstDate = (sec) => new Date((sec + 9 * 3600) * 1000).toISOString().slice(0, 10);
            const lastBar = bars[bars.length - 1];
            const lastIsToday = lastBar && meta.regularMarketTime && kstDate(lastBar.t) === kstDate(meta.regularMarketTime);
            const prevBar = lastIsToday ? bars[bars.length - 2] : lastBar;
            const prevClose = prevBar?.c || price;
            const change = price - prevClose;
            const changePct = prevClose ? (change / prevClose * 100) : 0;
            results[company.id] = {
              price,
              change,
              changePct,
              sparkline: closes.map(v => ({ v: Math.round(v) })),
              high52w: meta.fiftyTwoWeekHigh,
              low52w: meta.fiftyTwoWeekLow,
              ticker: company.stockTicker.replace('.KS', ''),
            };
          } catch (e) {
            console.warn(`[Stock] ${company.stockTicker}:`, e.message);
          }
        })
      );
      setStockData(results);
      setIsStockLoading(false);
    };
    fetchAllStocks();
  }, []);

  // DART 최근 공시 목록 자동 조회 (apiKey 바인딩 시 자동 실행)
  useEffect(() => {
    if (!apiKey) return;
    const fetchDisclosures = async () => {
      const result = {};
      // bgn_de 미지정 시 DART는 당일 접수분만 반환하므로 최근 1년으로 지정
      const from = new Date();
      from.setFullYear(from.getFullYear() - 1);
      const bgnDe = from.toISOString().slice(0, 10).replace(/-/g, '');
      await Promise.all(companies.filter(c => c.corpCode).map(async (co) => {
        try {
          const url = `/api-dart/api/list.json?crtfc_key=${apiKey.trim()}&corp_code=${co.corpCode}&bgn_de=${bgnDe}&page_no=1&page_count=5`;
          const data = await fetch(url).then(r => r.json());
          if (data.status === '000' || data.status === '013') result[co.id] = data.list || [];
        } catch (e) { /* 조회 실패 시 해당 탭은 오류 안내 */ }
      }));
      setDisclosures(result);
      setActiveDisclosureTab(prev => prev || companies[0]?.id || '');
    };
    fetchDisclosures();
  }, [apiKey]);

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

    const targetQuarterStr = `${selectedYear} ${selectedQuarter}`;
    // 차트·당분기 역산이 실데이터만 쓰도록 해당 연도 1Q ~ 선택 분기를 모두 조회
    const qList = ['1Q', '2Q', '3Q', '4Q'].slice(0, ['1Q', '2Q', '3Q', '4Q'].indexOf(selectedQuarter) + 1);

    // 연도/분기 확정 (시장 지표 동시 연동용)
    setActiveYear(selectedYear);
    setActiveQuarter(selectedQuarter);

    const activeCompanies = companies.filter(c => c.corpCode);
    const totalCalls = activeCompanies.length * qList.length * 2;
    let currentCallCount = 0;

    const newFinancialData = {};
    const localCfsUnavail = new Set();
    const trimmedKey = apiKey.trim();

    const fetchCached = async (company, q, fsDiv) => {
      const reprtCode = rCodeMap[q];
      const cacheKey = `${trimmedKey}-${company.corpCode.trim()}-${selectedYear}-${reprtCode}-${fsDiv}`;
      if (apiCacheRef.current.has(cacheKey)) return apiCacheRef.current.get(cacheKey);
      try {
        const data = await fetchDartData(trimmedKey, company.corpCode.trim(), selectedYear, reprtCode, fsDiv);
        apiCacheRef.current.set(cacheKey, data);
        await delay(200); // DART 초당 트래픽 제한 대응
        return data;
      } catch (e) {
        console.warn(`[DART API WARNING] ${company.name} ${selectedYear} ${q} ${fsDiv} 호출 실패:`, e.message);
        apiCacheRef.current.set(cacheKey, null);
        return null;
      }
    };

    try {
      // 기업별로 병렬 실행 (기업 내부 분기 호출은 순차) - 순차 40회 호출 시 수 분 소요
      await Promise.all(activeCompanies.map(async (company) => {
        for (const q of qList) {
          const qStr = `${selectedYear} ${q}`;
          const cfsData = await fetchCached(company, q, 'CFS');
          currentCallCount++;
          setDartStatusText(`DART 재무제표 동기화 중... (${currentCallCount}/${totalCalls})`);
          const ofsData = await fetchCached(company, q, 'OFS');
          currentCallCount++;
          setDartStatusText(`DART 재무제표 동기화 중... (${currentCallCount}/${totalCalls})`);

          if (q === selectedQuarter && !cfsData) localCfsUnavail.add(company.id);
          if (cfsData || ofsData) {
            newFinancialData[qStr] = newFinancialData[qStr] || {};
            newFinancialData[qStr][company.id] = { cfs: cfsData || {}, ofs: ofsData || {} };
          }
        }
      }));

      // 다년도 추이 데이터는 유지하고 이번 조회 분기만 갱신
      setFinancialData(prev => ({ ...prev, ...newFinancialData }));
      setQuarters(qList.map(q => `${selectedYear} ${q}`));

      setCfsUnavailableSet(localCfsUnavail);
      const fetchedCount = Object.keys(newFinancialData[targetQuarterStr] || {}).length;
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

  // 접속 시 API 키가 있으면 기본 연도/분기 실데이터 자동 조회
  useEffect(() => {
    if (apiKey) handleFetchDartApi();
  }, []);

  // ---------------------------------------------------------
  // 다년도 추이 일괄 조회
  // ---------------------------------------------------------
  const handleFetchTrendData = async () => {
    if (!apiKey) {
      alert("Open DART API Key가 없습니다. 상단 설정 패널에 입력해주세요.");
      return;
    }
    setIsTrendLoading(true);
    // 현재 화면에 확정된 기간(activeYear/activeQuarter) 기준으로 과거 연도 동일 분기 누계를 조회
    const rCodeMap = { '1Q': '11013', '2Q': '11012', '3Q': '11014', '4Q': '11011' };
    const reprtCode = rCodeMap[activeQuarter];
    const activeCompanies = companies.filter(c => c.corpCode);
    const startYear = parseInt(activeYear) - trendYears + 1;
    const years = Array.from({ length: trendYears }, (_, i) => String(startYear + i));
    const totalOps = years.length * activeCompanies.length * 2;
    let currentOp = 0;
    const fetched = {};

    await Promise.all(activeCompanies.map(async (company) => {
      for (const year of years) {
        for (const fsDiv of ['CFS', 'OFS']) {
          const cacheKey = `${apiKey.trim()}-${company.corpCode.trim()}-${year}-${reprtCode}-${fsDiv}`;
          let data = null;
          if (apiCacheRef.current.has(cacheKey)) {
            data = apiCacheRef.current.get(cacheKey);
          } else {
            try {
              data = await fetchDartData(apiKey.trim(), company.corpCode.trim(), year, reprtCode, fsDiv);
              await delay(200);
            } catch (e) {
              console.warn(`[TREND] ${year}년 ${company.name} ${fsDiv}:`, e.message);
            }
            apiCacheRef.current.set(cacheKey, data);
          }
          currentOp++;
          setTrendStatusText(`다년도 재무제표 조회 중 (${currentOp}/${totalOps})`);
          if (data) {
            const qKey = `${year} ${activeQuarter}`;
            fetched[qKey] = fetched[qKey] || {};
            fetched[qKey][company.id] = { ...(fetched[qKey][company.id] || {}), [fsDiv.toLowerCase()]: data };
          }
        }
      }
    }));

    setFinancialData(prev => {
      const next = { ...prev };
      Object.entries(fetched).forEach(([qKey, byCompany]) => {
        next[qKey] = { ...(prev[qKey] || {}) };
        Object.entries(byCompany).forEach(([cid, v]) => { next[qKey][cid] = { ...(prev[qKey]?.[cid] || {}), ...v }; });
      });
      return next;
    });
    setIsTrendLoading(false);
    setTrendStatusText(`다년도 추이 조회 완료 (${activeYear}년 기준 최근 ${trendYears}년, 매년 ${activeQuarter} 누계)`);
  };

  // ---------------------------------------------------------
  // 캐시 초기화
  // ---------------------------------------------------------
  const handleClearCache = () => {
    apiCacheRef.current.clear();
    setDartStatusText('캐시 초기화 완료. 다음 조회 시 DART API를 새로 호출합니다.');
    setDartStatus('READY');
    setTrendStatusText('');
  };

  // ---------------------------------------------------------
  // CSV 내보내기
  // ---------------------------------------------------------
  const handleExportCSV = () => {
    const fsDiv = isConsolidated ? 'cfs' : 'ofs';
    const header = ['기업명', '기간', '공시구분', '집계모드', '매출액(백만)', '영업이익(백만)', '영업이익률(%)', '경상손익(백만)', '경상손익률(%)', '판관비(백만)', '판관비율(%)', '당기순이익(백만)', '순이익률(%)', '총포괄손익(백만)', '부채비율(%)', 'ROE(%)', '유동비율(%)'];
    const rows = [header.join(',')];

    sortQuarters(quarters).forEach(q => {
      companies.forEach(company => {
        const sales = getComputedValue(company.id, q, 'sales', fsDiv);
        const op = getComputedValue(company.id, q, 'operatingProfit', fsDiv);
        const oi = getComputedValue(company.id, q, 'ordinaryIncome', fsDiv);
        const net = getComputedValue(company.id, q, 'netIncome', fsDiv);
        const sga = getComputedValue(company.id, q, 'sgaExpenses', fsDiv);
        const debt = getComputedValue(company.id, q, 'debtRatio', fsDiv);
        const eq = getComputedValue(company.id, q, 'equity', fsDiv);
        const curA = getComputedValue(company.id, q, 'currentAssets', fsDiv);
        const curL = getComputedValue(company.id, q, 'currentLiabilities', fsDiv);
        const opMargin = sales > 0 ? ((op / sales) * 100).toFixed(2) : '';
        const oiMarginCsv = sales > 0 ? ((oi / sales) * 100).toFixed(2) : '';
        const sgaR = sales > 0 ? ((sga / sales) * 100).toFixed(2) : '';
        const pl = getComputedValue(company.id, q, 'profitLoss', fsDiv);
        const netMargin = sales > 0 ? ((pl / sales) * 100).toFixed(2) : '';
        const roeCsv = eq > 0 ? ((pl / eq) * 100).toFixed(2) : '';
        const currentRatioCsv = curL > 0 ? ((curA / curL) * 100).toFixed(2) : '';
        rows.push([company.name, q, isConsolidated ? '연결(CFS)' : '별도(OFS)', isCumulative ? '누계액' : '당분기', roundM(sales), roundM(op), opMargin, roundM(oi), oiMarginCsv, roundM(sga), sgaR, roundM(pl), netMargin, roundM(net), debt < 0 ? '자본잠식' : debt, roeCsv, currentRatioCsv].join(','));
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

    if (metric === 'debtRatio' || metric === 'equity' || metric === 'currentAssets' || metric === 'currentLiabilities') return currentVal;
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

    // 음수 역산값도 공시 원본(환입·재분류)을 반영한 결과이므로 보정하지 않음
    return currentVal - prevVal;
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
        row[company.name] = roundM(getComputedValue(company.id, qKey, activeMetric, fsDiv));
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
              DART 공시 기반
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
              {Array.from({ length: new Date().getFullYear() - 2015 + 1 }, (_, i) => 2015 + i).map(y => (
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
            <button onClick={handleClearCache} className="text-[9px] text-slate-600 hover:text-rose-400 transition-colors shrink-0 font-semibold">
              캐시 초기화
            </button>
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
                <div className="text-[10px] text-indigo-400 font-mono font-semibold">DART 고유코드: {c.corpCode}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 📊 분석 및 실시간 제어판 영역 */}
      <div className="grid grid-cols-1 gap-8 mb-8">
        
        {/* 📈 KOSPI 실시간 주가 패널 */}
        <section className="glass-panel rounded-2xl p-6 mb-8 shadow-md">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400"><BarChart2 className="w-5 h-5" /></div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">KOSPI 주가 현황</h2>
              <p className="text-slate-400 text-xs">Yahoo Finance 시세 (약 15~20분 지연) · 전일 종가 대비 등락</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {companies.filter(c => c.stockTicker).map(company => {
              const s = stockData[company.id];
              return (
                <div key={company.id} className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl" style={{ backgroundColor: company.color }}></div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-200 truncate">{company.name}</span>
                    <span className="text-[9px] font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">{company.stockTicker.replace('.KS','')}</span>
                  </div>
                  {isStockLoading ? (
                    <div className="animate-pulse">
                      <div className="h-6 bg-slate-700 rounded w-3/4 mb-1"></div>
                      <div className="h-3 bg-slate-800 rounded w-1/2"></div>
                    </div>
                  ) : s ? (
                    <>
                      <div className="text-xl font-extrabold text-slate-100 mb-0.5">
                        ₩{s.price.toLocaleString('ko-KR')}
                      </div>
                      <div className={`text-xs font-bold flex items-center gap-1 ${s.change > 0 ? 'text-red-400' : s.change < 0 ? 'text-blue-400' : 'text-slate-400'}`}>
                        {s.change > 0 ? <TrendingUp className="w-3 h-3" /> : s.change < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                        {s.change > 0 ? '▲' : s.change < 0 ? '▼' : ''}{Math.abs(s.change).toLocaleString('ko-KR')} ({s.changePct > 0 ? '+' : ''}{s.changePct.toFixed(2)}%)
                      </div>
                      {s.sparkline?.length > 0 && (
                        <div className="mt-2 h-10 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={s.sparkline} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                              <Line type="monotone" dataKey="v" stroke={company.color} strokeWidth={1.5} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                      {(s.high52w || s.low52w) && (
                        <div className="mt-1.5 text-[9px] text-slate-500 flex justify-between">
                          <span>52W 저: ₩{s.low52w?.toLocaleString('ko-KR') ?? '-'}</span>
                          <span>고: ₩{s.high52w?.toLocaleString('ko-KR') ?? '-'}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-xs text-slate-500 mt-2">조회 불가</div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

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
                  <div className="text-xs font-bold text-amber-400">DART 조회 실패 - 표시할 실데이터가 없습니다</div>
                  <p className="text-[10px] text-slate-300 mt-0.5 leading-relaxed font-semibold whitespace-pre-line">
                    {dartError}
                  </p>
                  <button
                    onClick={() => setDartError(null)}
                    className="mt-1.5 text-[9px] font-extrabold text-amber-400 hover:text-amber-300 underline cursor-pointer"
                  >
                    경고 닫기
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
                      return isPercent ? `${val}%` : `${val.toLocaleString('ko-KR')}M`;
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
                      return [`${value.toLocaleString('ko-KR')}${unit}`, name];
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
              <p className="text-slate-400 text-xs">매년 {activeQuarter} 누계 기준 연도별 비교 ({isConsolidated ? '연결' : '별도'}, 당분기 토글 미적용)</p>
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
            { id: 'sgaExpenses', label: '판관비' },
            { id: 'sgaRatio', label: '판관비율' },
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
          // 연도 간 동일 기간 비교이므로 당분기 토글과 무관하게 누계값 사용 (과거 연도는 직전 분기 미조회)
          const raw = (cid, qKey, metric) => financialData[qKey]?.[cid]?.[fsDiv]?.[metric] ?? 0;
          const hasData = (cid, qKey) => Object.keys(financialData[qKey]?.[cid]?.[fsDiv] || {}).length > 0;
          const trendChartData = Array.from({ length: trendYears }, (_, i) => {
            const year = String(parseInt(activeYear) - (trendYears - 1 - i));
            const qKey = `${year} ${activeQuarter}`;
            const row = { year };
            companies.forEach(company => {
              if (!hasData(company.id, qKey)) { row[company.name] = null; return; }
              const sales = raw(company.id, qKey, 'sales');
              if (trendMetric === 'operatingProfitMargin') {
                row[company.name] = sales > 0 ? parseFloat(((raw(company.id, qKey, 'operatingProfit') / sales) * 100).toFixed(2)) : null;
              } else if (trendMetric === 'sgaRatio') {
                row[company.name] = sales > 0 ? parseFloat(((raw(company.id, qKey, 'sgaExpenses') / sales) * 100).toFixed(2)) : null;
              } else {
                row[company.name] = roundM(raw(company.id, qKey, trendMetric));
              }
            });
            return row;
          });
          const yearsWithData = trendChartData.filter(row => companies.some(c => row[c.name] != null)).length;
          const isTrendEmpty = yearsWithData < 2;
          const isPercent = ['operatingProfitMargin', 'debtRatio', 'sgaRatio'].includes(trendMetric);
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
                    tickFormatter={v => isPercent ? `${v}%` : `${v.toLocaleString('ko-KR')}M`} />
                  <Tooltip contentStyle={{ backgroundColor: '#0d1224', borderColor: '#1f2954', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }}
                    formatter={(value, name) => [value == null ? '데이터 없음' : `${value.toLocaleString('ko-KR')}${isPercent ? '%' : ' 백만원'}`, name]} />
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
              <h2 className="text-lg font-bold text-slate-100">시장 트렌드 참고 패널 (8대 지표)</h2>
              <p className="text-amber-400/90 text-xs font-semibold">⚠ 실제 통계가 아닌 연도별 경기 국면 가정에 따른 추정 시뮬레이션 값입니다. 의사결정에 인용하지 마세요.</p>
            </div>
          </div>

          <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl px-3 py-1 text-xs text-indigo-400 font-bold self-start md:self-auto">
            기준 기간: {activeYear}년 {activeQuarter}
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
                <th className="p-4 text-right">경상손익률</th>
                <th className="p-4 text-right">판관비 총계</th>
                <th className="p-4 text-right">판관비율</th>
                <th className="p-4 text-right">당기순이익</th>
                <th className="p-4 text-right" title="당기순이익 ÷ 매출액">순이익률</th>
                <th className="p-4 text-right">총포괄손익</th>
                <th className="p-4 text-right" title="부채총계 ÷ 자본총계 (기말)">부채비율</th>
                <th className="p-4 text-right" title="당기순이익 ÷ 기말 자본총계 (연환산 아님)">ROE</th>
                <th className="p-4 text-right" title="유동자산 ÷ 유동부채 (기말)">유동비율</th>
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
                const eq = getComputedValue(company.id, targetQuarterStr, 'equity', fsDiv);
                const curA = getComputedValue(company.id, targetQuarterStr, 'currentAssets', fsDiv);
                const curL = getComputedValue(company.id, targetQuarterStr, 'currentLiabilities', fsDiv);

                const opMargin = sales > 0 ? ((op / sales) * 100).toFixed(2) : null;
                const oiMargin = sales > 0 ? ((oi / sales) * 100).toFixed(2) : null;
                const sgaRatio = sales > 0 ? ((sga / sales) * 100).toFixed(2) : null;
                const pl = getComputedValue(company.id, targetQuarterStr, 'profitLoss', fsDiv);
                const netMargin = sales > 0 ? ((pl / sales) * 100).toFixed(2) : null;
                const roe = eq > 0 ? ((pl / eq) * 100).toFixed(2) : null;
                const currentRatio = curL > 0 ? ((curA / curL) * 100).toFixed(1) : null;

                return (
                  <tr key={company.id} className="hover:bg-slate-900/40 transition-colors border-b border-slate-800/45">
                    <td className="p-4 font-bold">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: company.color }}></span>
                        <div className="flex flex-col">
                          <span className="text-slate-200">{company.name}</span>
                          <span className="text-[9px] text-slate-500 font-mono">DART: {company.corpCode}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right font-medium text-slate-100">{fmtM(sales)}</td>
                    <td className={`p-4 text-right font-semibold ${op < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {op >= 0 ? '+' : ''}{fmtM(op)}
                    </td>
                    <td className={`p-4 text-right font-semibold ${opMargin === null ? 'text-slate-500' : parseFloat(opMargin) < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {opMargin === null ? '-' : `${parseFloat(opMargin) >= 0 ? '+' : ''}${opMargin}%`}
                    </td>
                    <td className={`p-4 text-right font-semibold ${oi < 0 ? 'text-rose-400' : 'text-cyan-400'}`}>
                      {oi >= 0 ? '+' : ''}{fmtM(oi)}
                    </td>
                    <td className={`p-4 text-right font-semibold ${oiMargin === null ? 'text-slate-500' : parseFloat(oiMargin) < 0 ? 'text-rose-400' : 'text-cyan-400'}`}>
                      {oiMargin === null ? '-' : `${parseFloat(oiMargin) >= 0 ? '+' : ''}${oiMargin}%`}
                    </td>
                    <td className="p-4 text-right text-slate-300">{fmtM(sga)}</td>
                    <td className={`p-4 text-right font-semibold ${sgaRatio === null ? 'text-slate-500' : 'text-slate-300'}`}>
                      {sgaRatio === null ? '-' : `${sgaRatio}%`}
                    </td>
                    <td className="p-4 text-right">
                      <span className={`inline-block px-2.5 py-1 rounded-lg font-bold border ${
                        pl < 0
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        {pl >= 0 ? '+' : ''}{fmtM(pl)}
                      </span>
                    </td>
                    <td className={`p-4 text-right font-semibold ${netMargin === null ? 'text-slate-500' : parseFloat(netMargin) < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {netMargin === null ? '-' : `${parseFloat(netMargin) >= 0 ? '+' : ''}${netMargin}%`}
                    </td>
                    <td className={`p-4 text-right font-semibold ${net < 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                      {net >= 0 ? '+' : ''}{fmtM(net)}
                    </td>
                    <td className="p-4 text-right text-slate-300 font-semibold">
                      {debt < 0 ? (
                        <span className="text-rose-400 font-bold">자본잠식</span>
                      ) : debt === 0 ? (
                        <span className="text-slate-500">-</span>
                      ) : `${debt}%`}
                    </td>
                    <td className={`p-4 text-right font-semibold ${roe === null ? 'text-slate-500' : parseFloat(roe) < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {roe === null ? '-' : `${parseFloat(roe) >= 0 ? '+' : ''}${roe}%`}
                    </td>
                    <td className={`p-4 text-right font-semibold ${currentRatio === null ? 'text-slate-500' : parseFloat(currentRatio) < 100 ? 'text-amber-400' : 'text-slate-300'}`}>
                      {currentRatio === null ? '-' : `${currentRatio}%`}
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
              { id: 'isDongseo', label: '아이에스동서' },
              { id: 'lxhausys', label: 'LX하우시스' },
              { id: 'kcc', label: 'KCC' }
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

      {/* 📰 DART 최근 공시 목록 */}
      <section className="glass-panel rounded-2xl p-6 mb-8 shadow-md">
        <div className="flex items-center gap-2 mb-5">
          <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400"><Newspaper className="w-5 h-5" /></div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">DART 최근 공시 목록</h2>
            <p className="text-slate-400 text-xs">금감원 전자공시 · API 키 입력 시 자동 조회</p>
          </div>
        </div>

        {/* 기업 탭 */}
        <div className="flex flex-wrap gap-2 mb-4">
          {companies.filter(c => c.corpCode).map(company => (
            <button
              key={company.id}
              onClick={() => setActiveDisclosureTab(company.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                activeDisclosureTab === company.id
                  ? 'text-white border-transparent'
                  : 'text-slate-400 border-slate-700 hover:border-slate-500'
              }`}
              style={activeDisclosureTab === company.id ? { backgroundColor: company.color + '33', borderColor: company.color } : {}}
            >
              <Building2 className="w-3 h-3" />
              {company.name}
            </button>
          ))}
        </div>

        {/* 공시 목록 */}
        {!apiKey ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>상단 DART API Key 입력 후 자동으로 최근 공시가 표시됩니다.</p>
          </div>
        ) : disclosures === null ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            <RefreshCw className="w-6 h-6 mx-auto mb-2 opacity-30 animate-spin" />
            <p>공시 목록 조회 중...</p>
          </div>
        ) : !disclosures[activeDisclosureTab] ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            <p>공시 목록을 불러오지 못했습니다. 잠시 후 새로고침해 주세요.</p>
          </div>
        ) : disclosures[activeDisclosureTab].length > 0 ? (
          <div className="space-y-2">
            {disclosures[activeDisclosureTab].map((item) => (
              <a key={item.rcept_no} href={`https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${item.rcept_no}`} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 bg-slate-900/40 border border-slate-800/60 rounded-xl px-4 py-3 hover:border-slate-700 transition-colors">
                <div className="shrink-0 mt-0.5">
                  <FileText className="w-4 h-4 text-cyan-500/70" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-200 truncate">{item.report_nm?.trim()}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{item.rcept_dt?.slice(0,4)}.{item.rcept_dt?.slice(4,6)}.{item.rcept_dt?.slice(6,8)} · {item.flr_nm}</p>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500 text-sm">
            <p>최근 1년간 접수된 공시가 없습니다.</p>
          </div>
        )}
      </section>
    </div>
  );
}
