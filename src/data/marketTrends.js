// 건자재 및 건설 부동산 시장 지표 8가지와 동적 한줄 요약 데이터베이스 (2010년 ~ 2026년 대응)

export const getMarketTrendsData = (yearNum, quarterName) => {
  const year = parseInt(yearNum) || 2025;
  const q = quarterName || "4Q"; // "1Q", "2Q", "3Q", "4Q"
  
  // 연도/분기별 기준 시장 상황 정의
  // - 2010~2013: 저성장, 하우스푸어, 침체기
  // - 2014~2018: 정책 완화, 회복기 및 분양 활성화
  // - 2019~2021: 초저금리, 유동성 과잉, 급격한 부동산 상승기
  // - 2022~2024: 고금리, PF 사태, 원자재 폭등에 따른 건설경기 극심한 슬럼프
  // - 2025~2026: 분양 공급 조정 및 강남권 위주 제한적 회복, 누적 원가 압박 지속
  
  let phase = "normal";
  let summary = "";
  
  if (year <= 2013) {
    phase = "recession";
    summary = `${year}년 ${q} 기준 부동산 시장은 글로벌 금융위기 여파의 장기화 및 수도권 미분양 누적으로 '하우스푸어' 우려가 깊은 거래 침체 상태입니다.`;
  } else if (year <= 2018) {
    phase = "recovery";
    summary = `${year}년 ${q} 기준 주택 시장 규제 완화 및 초이노믹스 영향으로 분양 물량이 증가하고 정비사업 시장이 점진적으로 활성화되고 있습니다.`;
  } else if (year <= 2021) {
    phase = "boom";
    summary = `${year}년 ${q} 기준 초저금리 기조와 공급 부족 심리에 힘입어 청약 열풍이 최고조에 달했으며 아파트 매매 가격 지수가 급등세를 나타내고 있습니다.`;
  } else if (year <= 2024) {
    phase = "slump";
    summary = `${year}년 ${q} 기준 미국발 고금리 충격 및 부동산 PF 대출 부실 우려, 시멘트·철근 등 원자재 가격 급등으로 건설업계는 최악의 수익성 악화를 겪고 있습니다.`;
  } else {
    phase = "transition";
    summary = `${year}년 ${q} 기준 대림통상(자사) 등 주요 요업/수전 기업들은 주택 인허가 축소 장기화 속에서도 서울 강남권 재정비 정비사업과 고효율 절수형 신제품을 중심으로 틈새 활로를 찾고 있습니다.`;
  }

  // 수학적/논리적으로 년도/분기별 지표값을 연산하여 부드러운 트렌드 그래프 시뮬레이션
  const qMultiplier = q === "1Q" ? 1.0 : q === "2Q" ? 1.15 : q === "3Q" ? 0.95 : 1.25;
  const yearOffset = (year - 2010);
  
  // 1. 주택 인허가 실적 (천호 단위)
  let permitsVal = 40 + yearOffset * 2.2;
  if (phase === "slump") permitsVal *= 0.65;
  if (phase === "boom") permitsVal *= 1.4;
  permitsVal = Math.round(permitsVal * qMultiplier);
  const permitsPrev = Math.round(permitsVal * (1 - (phase === "slump" ? -0.05 : 0.04)));

  // 2. 건설경기실사지수 (CBSI, 100이 기준)
  let cbsiVal = 70;
  if (phase === "recession") cbsiVal = 62;
  if (phase === "recovery") cbsiVal = 82;
  if (phase === "boom") cbsiVal = 91;
  if (phase === "slump") cbsiVal = 58;
  if (phase === "transition") cbsiVal = 74.8;
  // 분기별 난수적 보정
  cbsiVal = parseFloat((cbsiVal + (qMultiplier - 1) * 8).toFixed(1));
  const cbsiPrev = parseFloat(((phase === "slump" || phase === "recession" ? cbsiVal * 1.03 : cbsiVal * 0.97)).toFixed(1));

  // 3. 건자재 가격 지수 (2015=100)
  let materialVal = 85 + yearOffset * 2.8;
  if (phase === "slump") materialVal += 20; // 스태그플레이션
  if (phase === "transition") materialVal = 142.5;
  materialVal = parseFloat((materialVal * (1 + (q === "4Q" ? 0.02 : 0.01))).toFixed(1));
  const materialPrev = parseFloat((materialVal * 0.98).toFixed(1));

  // 4. 재개발/재건축 수주액 (조원)
  let ordersVal = 3.5 + yearOffset * 0.4;
  if (phase === "boom") ordersVal *= 1.5;
  if (phase === "slump") ordersVal *= 0.7;
  ordersVal = parseFloat((ordersVal * qMultiplier).toFixed(1));
  const ordersPrev = parseFloat(((phase === "slump" || phase === "recession" ? ordersVal * 1.08 : ordersVal * 0.92)).toFixed(1));

  // 5. 아파트 분양 물량 (천호)
  let supplyVal = 30 + yearOffset * 1.8;
  if (phase === "boom") supplyVal *= 1.6;
  if (phase === "slump") supplyVal *= 0.55;
  supplyVal = Math.round(supplyVal * qMultiplier);
  const supplyPrev = Math.round(phase === "slump" || phase === "recession" ? supplyVal * 1.08 : supplyVal * 0.95);

  // 6. 수도권 주택 매매가격지수 (전월비 %)
  let priceIdx = 0.1;
  if (phase === "recession") priceIdx = -0.4;
  if (phase === "boom") priceIdx = 1.6;
  if (phase === "slump") priceIdx = -0.8;
  if (phase === "transition") priceIdx = 0.2;
  priceIdx = parseFloat((priceIdx * qMultiplier).toFixed(2));
  const priceIdxPrev = parseFloat((priceIdx * 0.9).toFixed(2));

  // 7. 전국 미분양 주택 수 (호)
  let unsoldVal = 60000;
  if (phase === "recession") unsoldVal = 85000;
  if (phase === "boom") unsoldVal = 18000;
  if (phase === "slump") unsoldVal = 75000;
  if (phase === "transition") unsoldVal = 64000;
  unsoldVal = Math.round(unsoldVal * (1 + (q === "1Q" ? 0.05 : -0.03)));
  const unsoldPrev = Math.round(phase === "slump" || phase === "recession" ? unsoldVal * 0.93 : unsoldVal * 1.07);

  // 8. 상위 10대 대형 건설사 수주 비중 (%)
  let bigRatio = 45;
  if (phase === "slump") bigRatio = 58; // 침체 시 대형사 쏠림 심화
  if (phase === "transition") bigRatio = 62;
  bigRatio = parseFloat((bigRatio + (q === "4Q" ? 2.5 : -1)).toFixed(1));
  const bigRatioPrev = parseFloat((bigRatio - 1.2).toFixed(1));

  // 스파크라인용 가짜 추이 제너레이터
  const makeSparkline = (baseVal, isUpTrend) => {
    const arr = [];
    let cur = baseVal * 0.85;
    for (let i = 0; i < 6; i++) {
      cur = cur * (1 + (isUpTrend ? 0.03 : -0.02) + (Math.random() * 0.04 - 0.02));
      arr.push({ v: parseFloat(cur.toFixed(1)) });
    }
    arr[5] = { v: baseVal }; // 마지막값 매칭
    return arr;
  };

  const isUp = (cur, prev) => cur >= prev;
  const getChangePct = (cur, prev) => {
    if (prev === 0) return "+0.0%";
    const diff = cur - prev;
    const pct = (diff / prev) * 100;
    return (pct >= 0 ? "+" : "") + pct.toFixed(1) + "%";
  };
  const getChangeDiff = (cur, prev) => {
    const diff = cur - prev;
    return (diff >= 0 ? "+" : "") + diff.toFixed(1);
  };

  const list = [
    {
      id: 1,
      title: "주택 인허가 실적",
      value: `${permitsVal.toLocaleString()} 호`,
      change: getChangePct(permitsVal, permitsPrev),
      isUp: isUp(permitsVal, permitsPrev),
      desc: "지방자치단체 인허가 결정 물량",
      chartData: makeSparkline(permitsVal, phase !== "slump"),
      color: "#6366f1"
    },
    {
      id: 2,
      title: "건설경기실사지수 (CBSI)",
      value: `${cbsiVal} p`,
      change: getChangeDiff(cbsiVal, cbsiPrev) + "p",
      isUp: isUp(cbsiVal, cbsiPrev),
      desc: "건설 기업이 체감하는 경기 수준 (기준: 100)",
      chartData: makeSparkline(cbsiVal, phase === "boom"),
      color: "#f43f5e"
    },
    {
      id: 3,
      title: "건자재 가격 지수",
      value: `${materialVal}`,
      change: getChangePct(materialVal, materialPrev),
      isUp: isUp(materialVal, materialPrev),
      desc: "레미콘, 철근, 타일 가중 물가 지표",
      chartData: makeSparkline(materialVal, true),
      color: "#eab308"
    },
    {
      id: 4,
      title: "재개발/재건축 수주액",
      value: `${ordersVal} 조원`,
      change: getChangePct(ordersVal, ordersPrev),
      isUp: isUp(ordersVal, ordersPrev),
      desc: "도시정비사업 총 계약 수주 규모",
      chartData: makeSparkline(ordersVal, phase === "boom" || phase === "transition"),
      color: "#10b981"
    },
    {
      id: 5,
      title: "아파트 분양 물량",
      value: `${supplyVal.toLocaleString()} 호`,
      change: getChangePct(supplyVal, supplyPrev),
      isUp: isUp(supplyVal, supplyPrev),
      desc: "실제 일반분양 및 민간 청약 개시 물량",
      chartData: makeSparkline(supplyVal, phase !== "slump"),
      color: "#06b6d4"
    },
    {
      id: 6,
      title: "수도권 주택 매매가격지수",
      value: `${priceIdx > 0 ? "+" : ""}${priceIdx}%`,
      change: getChangeDiff(priceIdx, priceIdxPrev) + "%p",
      isUp: isUp(priceIdx, priceIdxPrev),
      desc: "전월 대비 평균 거래시세 등락률",
      chartData: makeSparkline(priceIdx + 5, priceIdx > 0),
      color: "#a855f7"
    },
    {
      id: 7,
      title: "전국 미분양 주택 수",
      value: `${unsoldVal.toLocaleString()} 호`,
      change: getChangePct(unsoldVal, unsoldPrev),
      isUp: !isUp(unsoldVal, unsoldPrev), // 미분양은 하락(감소)하는 것이 긍정적 지표
      desc: "준공 전/후 청약 미달 누적 주택 호수",
      chartData: makeSparkline(unsoldVal, phase === "slump"),
      color: "#f97316"
    },
    {
      id: 8,
      title: "대형 건설사 수주 비중",
      value: `${bigRatio}%`,
      change: getChangeDiff(bigRatio, bigRatioPrev) + "%p",
      isUp: isUp(bigRatio, bigRatioPrev),
      desc: "도급 10대 건설사의 정비사업 쏠림 비중",
      chartData: makeSparkline(bigRatio, true),
      color: "#14b8a6"
    }
  ];

  return {
    summary,
    list
  };
};
