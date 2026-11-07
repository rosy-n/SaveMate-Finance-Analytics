import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getAppNow } from '../constants/appDate';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { useApi } from '../hooks/useApi';
import { ReportStyles as reportStyles } from './styles/ReportStyles';
import { appBus } from '../app/eventBus';
import { useAuth } from '../state/AuthContext';

const screenWidth = Dimensions.get('window').width;
// 월별 지출 추이: 화면 - 콘텐츠 여백(32) - 카드 안쪽 여백(32) - 카드 테두리(2)
const TREND_WIDTH = screenWidth - 66;
const TREND_HEIGHT = 204;
const TREND_SIDE = 28; // 첫 달/마지막 달 점과 좌우 끝 사이 간격 (대칭)
const TREND_GRID_TOP = 10;
const TREND_GRID_BOTTOM = 160;
const TREND_GRID_ROWS = 4;
const TREND_MONTH_Y = 196;
// 최댓값 위 금액이 잘리지 않도록 세로축 상단을 최댓값보다 여유 있게 잡는다.
const TREND_HEADROOM = 1.2;
const TREND_LINE_COLOR = '#E5DBF7';
const TREND_DOT_COLOR = '#7D4BD6';
const TREND_SAME_DAY_COLOR = '#9CA3AF';
const TREND_GRID_PROPS = { stroke: '#E9E9EF', strokeDasharray: '4 6', strokeWidth: 1 };

const formatTrendAmount = (value) => {
  const man = Math.round(value / 10000);
  return man > 0 ? `${man}만원` : `${value.toLocaleString('ko-KR')}원`;
};

const TrendAmountLabel = ({ x, y, color, children }) => (
  <SvgText x={x} y={y} fontSize="11" fontWeight="600" textAnchor="middle" fill={color}>
    {children}
  </SvgText>
);

// 그리는 순서: 격자 → 선 → 점 → 글자
function TrendChart({ labels, values, sameDayValues }) {
  const scale = Math.max(0, ...values, ...sameDayValues) * TREND_HEADROOM;
  const step = values.length > 1 ? (TREND_WIDTH - TREND_SIDE * 2) / (values.length - 1) : 0;
  const pointX = (i) => (values.length > 1 ? TREND_SIDE + step * i : TREND_WIDTH / 2);
  const pointY = (v) => TREND_GRID_BOTTOM - (scale > 0 ? v / scale : 0) * (TREND_GRID_BOTTOM - TREND_GRID_TOP);
  const toPoints = (series) => series.map((v, i) => `${pointX(i)},${pointY(v)}`).join(' ');
  const rowGap = (TREND_GRID_BOTTOM - TREND_GRID_TOP) / TREND_GRID_ROWS;

  return (
    <Svg width={TREND_WIDTH} height={TREND_HEIGHT} style={{ marginTop: 12 }}>
      {Array.from({ length: TREND_GRID_ROWS + 1 }, (_, i) => (
        <Line key={`row-${i}`} x1={0} x2={TREND_WIDTH} y1={TREND_GRID_TOP + rowGap * i} y2={TREND_GRID_TOP + rowGap * i} {...TREND_GRID_PROPS} />
      ))}
      {values.map((_, i) => (
        <Line key={`col-${i}`} x1={pointX(i)} x2={pointX(i)} y1={TREND_GRID_TOP} y2={TREND_GRID_BOTTOM} {...TREND_GRID_PROPS} />
      ))}

      {sameDayValues.length > 0 && (
        <Polyline points={toPoints(sameDayValues)} fill="none" stroke={TREND_SAME_DAY_COLOR} strokeOpacity={0.2} strokeWidth={3} strokeLinejoin="round" />
      )}
      <Polyline points={toPoints(values)} fill="none" stroke={TREND_LINE_COLOR} strokeWidth={3} strokeLinejoin="round" />

      {sameDayValues.map((v, i) => (
        <Circle key={`same-day-dot-${i}`} cx={pointX(i)} cy={pointY(v)} r={4} fill={TREND_SAME_DAY_COLOR} />
      ))}
      {values.map((v, i) => (
        <Circle key={`total-dot-${i}`} cx={pointX(i)} cy={pointY(v)} r={4} fill={TREND_DOT_COLOR} />
      ))}

      {sameDayValues.map((v, i) => (
        v === values[i] ? null : (
          <TrendAmountLabel key={`same-day-${i}`} x={pointX(i)} y={pointY(v) + 15} color="#4B5563">
            {formatTrendAmount(v)}
          </TrendAmountLabel>
        )
      ))}
      {values.map((v, i) => (
        <TrendAmountLabel key={`total-${i}`} x={pointX(i)} y={pointY(v) - 8} color={TREND_DOT_COLOR}>
          {formatTrendAmount(v)}
        </TrendAmountLabel>
      ))}

      {labels.map((label, i) => (
        <SvgText key={`month-${i}`} x={pointX(i)} y={TREND_MONTH_Y} fontSize="12" textAnchor="middle" fill="#333333">
          {String(label).endsWith('월') ? label : `${label}월`}
        </SvgText>
      ))}
    </Svg>
  );
}

const DONUT_SIZE = 170;
const DONUT_STROKE = 28;
const DONUT_GAP = 2; // 조각 사이 간격

// 지출 도넛 그래프: 중앙에 총 지출, 오른쪽에 범례
function DonutChart({ data, total }) {
  const center = DONUT_SIZE / 2;
  const radius = (DONUT_SIZE - DONUT_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratios = data.map((d) => (total > 0 ? d.population / total : 0));

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 28, marginTop: 12 }}>
      <Svg width={DONUT_SIZE} height={DONUT_SIZE}>
        {data.map((d, i) => {
          const gap = data.length > 1 ? DONUT_GAP : 0;
          const length = Math.max(ratios[i] * circumference - gap, 1);
          // 앞선 조각들의 비율만큼 돌려서 12시 방향부터 이어 그린다.
          const startRatio = ratios.slice(0, i).reduce((sum, ratio) => sum + ratio, 0);
          const rotation = startRatio * 360 - 90;
          return (
            <Circle
              key={d.name}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={d.color}
              strokeWidth={DONUT_STROKE}
              strokeDasharray={`${length} ${circumference - length}`}
              transform={`rotate(${rotation} ${center} ${center})`}
            />
          );
        })}
        <SvgText x={center} y={center - 8} fontSize="12" textAnchor="middle" fill="#8B8495">총 지출</SvgText>
        <SvgText x={center} y={center + 12} fontSize="15" fontWeight="800" textAnchor="middle" fill="#25212D">
          {formatKRW(total)}
        </SvgText>
      </Svg>

      <View style={{ flex: 1, gap: 8 }}>
        {data.map((d) => (
          <View key={d.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[reportStyles.dot, { backgroundColor: d.color }]} />
            <Text style={{ flex: 1, fontSize: d.legendFontSize, color: d.legendFontColor }}>
              {pct(d.population, total)}% {d.name}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// 카테고리 색상 팔레트
const PALETTE = ['#F8A8A8', '#F6C27A', '#A8E6A1', '#A8C6F8', '#C7A8F8', '#D5D7DB', '#8DD3E0', '#F5A7C0', '#F3D37A', '#9BD2A4', '#8FA7E4', '#C0B1E8', '#B9BDC6', '#7FD1C5'];

const formatKRW = (n) => `${Number(n || 0).toLocaleString('ko-KR')}원`;
const pct = (part, total) => (total ? Math.round((part / total) * 100) : 0);

const LoadingBlock = () => (
  <View style={reportStyles.center}>
    <ActivityIndicator />
    <Text style={[reportStyles.cardText, { marginTop: 6, color: '#888' }]}>분석 데이터를 불러오는 중…</Text>
  </View>
);

const ErrorBlock = ({ message }) => (
  <Text style={[reportStyles.cardText, { marginTop: 8, color: '#B43A22' }]}>{message}</Text>
);

export default function ReportHome() {
  const { user } = useAuth();
  const uid = user?.id;

  const [worst3, setWorst3] = useState([]);
  const api = useApi();

  const [refreshKey, setRefreshKey] = useState(1);
  const reportScrollRef = useRef(null);
  const [sectionOffsets, setSectionOffsets] = useState({});
  const [activeSection, setActiveSection] = useState('overview');
  const [showAllBest, setShowAllBest] = useState(false);
  const [showAllWorst, setShowAllWorst] = useState(false);
  const [showAllOutliers, setShowAllOutliers] = useState(false);
  const [showAllPatterns, setShowAllPatterns] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [selectedPattern, setSelectedPattern] = useState(null);

  // ✅ 거래 저장/삭제 시 앱 전역 이벤트로도 refresh
  useEffect(() => {
    const off = appBus.on('transactionsChanged', () => {
      setRefreshKey(k => k + 1);
    });
    return () => off && off();
  }, []);

  const now = getAppNow();
  const [period, setPeriod] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });
  const { year, month } = period;

  // 아직 오지 않은 달로는 넘어가지 않는다.
  const canGoNext = year < now.getFullYear()
    || (year === now.getFullYear() && month < now.getMonth() + 1);

  const moveMonth = (delta) => {
    setPeriod((current) => {
      const next = new Date(current.year, current.month - 1 + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() + 1 };
    });
  };

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const [seriesLoading, setSeriesLoading] = useState(true);
  const [monthlySeries, setMonthlySeries] = useState({ labels: [], values: [], sameDayValues: [] });
  const trendDay = now.getDate(); // 회색 그래프: 매월 1일부터 오늘과 같은 날짜까지의 지출

  // 🔹 LLM 소비 리포트 상태
  const [llmReport, setLlmReport] = useState(null);
  const [llmLoading, setLlmLoading] = useState(true);
  const [llmError, setLlmError] = useState(null);

  // ✅ (1) 소비 요약 리포트 불러오기
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setLlmLoading(true);
        setLlmError(null);

        if (!uid) return; // 로그인 정보가 없으면 요청하지 않음

        const path = `/api/reports/consumption?year=${year}&month=${month}`;

        // (선택) 8초 타임아웃: 네트워크 지연 시 무한 대기 방지
        const ac = new AbortController();
        const t = setTimeout(() => ac.abort(), 8000);

        const res = await api.get(path, { signal: ac.signal }); // useApi가 signal 전달 지원 안 하면 fetch로 대체
        clearTimeout(t);

        if (!mounted) return;

        const rep = res?.report;
        if (!rep) {
          throw new Error('서버 응답에 report가 없거나 형식이 올바르지 않습니다.');
        }
        setLlmReport(rep);
      } catch (e) {
        if (mounted) {
          console.error('❌ LLM report fetch error:', e);
          setLlmReport(null);
          setLlmError(e?.message || 'LLM 리포트를 불러오지 못했습니다.');
        }
      } finally {
        if (mounted) setLlmLoading(false);
      }
    };
    run();
    return () => { mounted = false; };
  }, [api, uid, year, month, refreshKey]);

  // 지출배경별 만족도 집계 상태
  const [bgStats, setBgStats] = useState([]);
  const [bgLoading, setBgLoading] = useState(true);

  // 지출배경별 만족도 집계 로드
  useEffect(() => {
    if (!uid) return; // 로그인 정보가 없으면 요청하지 않음
    let mounted = true;

    (async () => {
      try {
        setBgLoading(true);

        // 1) 만족도 평가 전체 가져오기
        const satRes = await api.get(`/api/satisfaction`);
        const satItems = Array.isArray(satRes?.items) ? satRes.items : [];

        if (satItems.length === 0) {
          mounted && setBgStats([]);
          return;
        }

        // 2) transactionId만 추출 → bulk 조회
        const ids = Array.from(new Set(satItems.map(s => s.transactionId)));

        const txRes = await api.post(`/api/transactions/bulk`, { ids });
        const txMap = {};
        (txRes?.items || []).forEach(tx => {
          txMap[tx.id] = tx;
        });

        // 3) spendingBackground 기준 집계
        const agg = {}; // { bgName: { dissatisfied: n, neutral: n, satisfied: n } }

        for (const s of satItems) {
          const tid = s.transactionId;
          const tx = txMap[tid];
          if (!tx) continue;
          const txDate = new Date(tx.date);
          if (txDate.getFullYear() !== year || txDate.getMonth() + 1 !== month) continue;

          const bg = tx.spendingBackground || tx.category || '기타';
          if (!agg[bg]) {
            agg[bg] = {
              dissatisfied: 0,
              neutral: 0,
              satisfied: 0,
              records: { dissatisfied: [], neutral: [], satisfied: [] },
            };
          }
          agg[bg][s.emotion] += 1;
          agg[bg].records[s.emotion].push({ ...tx, satisfaction: s });
        }

        // 4) 비율 계산 + 불만족 비율 높은 순 정렬
        const arr = Object.entries(agg).map(([bg, obj]) => {
          const total = obj.dissatisfied + obj.neutral + obj.satisfied;
          return {
            bg,
            ...obj,
            total,
            pD: Math.round((obj.dissatisfied / total) * 100),
            pN: Math.round((obj.neutral / total) * 100),
            pS: Math.round((obj.satisfied / total) * 100),
          };

        });

        arr.sort((a, b) => b.pD - a.pD);

        mounted && setBgStats(arr);
      } catch (e) {
        console.error('spending background stats error:', e);
        mounted && setBgStats([]);
      } finally {
        mounted && setBgLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [api, uid, year, month, refreshKey]);


  if (!uid) {
    console.warn('로그인한 사용자 정보가 없어 리포트를 불러오지 않습니다.');
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const path = `/api/transactions?year=${year}&month=${month}&expand=true`;
        const res = await api.get(path);
        mounted && setItems(Array.isArray(res?.items) ? res.items : []);
      } catch {
        mounted && setItems([]);
      } finally {
        mounted && setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [api, uid, year, month, refreshKey]);


  // 이번달 Worst 3 계산 useEffect
  useEffect(() => {
    if (!uid) return; // 로그인 정보가 없으면 요청하지 않음
    let mounted = true;

    (async () => {
      try {
        // 1) 전체 만족도 가져오기
        const satRes = await api.get(`/api/satisfaction`);
        const satItems = Array.isArray(satRes?.items) ? satRes.items : [];

        // 2) 불만족만 추출
        const disliked = satItems.filter(r => r.emotion === 'dissatisfied');

        if (disliked.length === 0) {
          mounted && setWorst3([]);
          return;
        }

        // 3) 불만족 트랜잭션ID 모으기
        const ids = disliked.map(r => r.transactionId);

        // 4) bulk로 모든 트랜잭션 로드
        const bulk = await api.post(`/api/transactions/bulk`, { ids });
        const txList = Array.isArray(bulk?.items) ? bulk.items : [];

        // 5) 지출(expense)만 남기기
        const expenses = txList.filter(tx =>
          String(tx.type || '').toLowerCase().includes('exp')
        );

        // 6) 이번 달 date 기준 필터
        const monthFiltered = expenses.filter(tx => {
          const d = tx.date?.toDate ? tx.date.toDate() : new Date(tx.date);
          return (
            d.getFullYear() === year &&
            d.getMonth() + 1 === month
          );
        });


        if (monthFiltered.length === 0) {
          mounted && setWorst3([]);
          return;
        }

        // 7) amount 기준 내림차순 정렬
        monthFiltered.sort((a, b) => Number(b.amount) - Number(a.amount));

        // 8) Top 3 추출
        mounted && setWorst3(monthFiltered.slice(0, 3));

        // 9) satisfaction 정보 합치기
        const reasonsMap = {};
        satItems.forEach(s => {
          if (!reasonsMap[s.transactionId])
            reasonsMap[s.transactionId] = [];
          if (Array.isArray(s.reasons)) {
            reasonsMap[s.transactionId].push(...s.reasons);
          }
        });

        // 10) worst3에 reasons 병합
        const merged = monthFiltered.slice(0, 3).map(tx => ({
          ...tx,
          satisfaction: {
            reasons: reasonsMap[tx.id] || [],
          },
        }));

        mounted && setWorst3(merged);

      } catch (e) {
        console.error('Worst3 새 알고리즘 오류:', e);
        mounted && setWorst3([]);
      }
    })();

    return () => (mounted = false);
  }, [api, uid, year, month, refreshKey]);


  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setSeriesLoading(true);
        const path = `/api/transactions/monthly-sum?months=4&endYear=${year}&endMonth=${month}&day=${trendDay}`;
        const res = await api.get(path); // useApi() 사용
        const arr = Array.isArray(res?.items) ? res.items : [];

        // 라벨(가로축)과 값(세로데이터) 구성: 과거→현재 순
        const labels = arr.map(x => `${x.month}월`);
        const values = arr.map(x => Number(x.totalExpense || 0));
        // 값을 주지 않는 서버에서는 0 으로 그리지 않고 회색 그래프를 숨긴다.
        const sameDayValues = arr.every(x => Number.isFinite(x.expenseThroughDay))
          ? arr.map(x => x.expenseThroughDay)
          : [];
        mounted && setMonthlySeries({ labels, values, sameDayValues });
      } catch {
        mounted && setMonthlySeries({ labels: [], values: [], sameDayValues: [] });
      } finally {
        mounted && setSeriesLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [api, uid, year, month, trendDay, refreshKey]);

  // 카테고리 집계 (지출만)
  const { total, top5, displayChartData } = useMemo(() => {
    const sums = {};
    let t = 0;

    for (const it of items) {
      if (String(it?.type || '').toLowerCase() !== 'expense') continue;

      const cat = it.spendingCategory || it.category || '기타';
      const amount = Number(it.amount || 0);
      sums[cat] = (sums[cat] || 0) + amount;
      t += amount;
    }

    const entries = Object.entries(sums).sort((a, b) => b[1] - a[1]);

    const top5 = entries.slice(0, 5);
    const others = entries.slice(5);
    const othersSum = others.reduce((acc, [, v]) => acc + v, 0);

    // 범례 & 원그래프에 표시할 데이터 = 상위5 + 기타
    const displayEntries = [...top5];
    if (othersSum > 0) displayEntries.push(['기타', othersSum]);

    const displayChartData = displayEntries.map(([name, value], i) => {
      if (name === '기타') {
        return {
          name,
          amount: value,
          color: '#DADDE2',
          legendFontColor: '#6b6b6b',
          legendFontSize: 12,
        };
      }

      return {
        name,
        amount: value,
        color: PALETTE[i % PALETTE.length],
        legendFontColor: '#6b6b6b',
        legendFontSize: 12,
      };
    });

    return { total: t, top5, displayChartData };
  }, [items]);


  // chartData 결과를 기반으로 pieData 생성
  const pieData = useMemo(() => {
    const src = Array.isArray(displayChartData) ? displayChartData : [];
    return src
      .filter(Boolean)
      .filter(d => Number(d?.amount) > 0)
      .map(d => ({
        name: d.name ?? '기타',
        population: Number(d.amount ?? 0),
        color: d.color || '#CDD1D5',
        legendFontColor: d.legendFontColor ?? '#6b6b6b',
        legendFontSize: d.legendFontSize ?? 12,
      }));
  }, [displayChartData]);


  const renderLlmItem = (item) => {
    if (item == null) return null;

    if (typeof item === 'string' || typeof item === 'number') {
      return String(item);
    }

    if (typeof item === 'object') {
      const reason = item.reason ?? item.trigger ?? item.title ?? null;
      const count = item.count ?? null;
      const examples = Array.isArray(item.examples) ? item.examples : null;

      if (reason) {
        let s = reason;
        if (count != null) s += ` (${count}회)`;
        if (examples?.length) s += `\n예: ${examples.join(', ')}`;
        return s;
      }

      try { return JSON.stringify(item); }
      catch { return String(item); }
    }

    return String(item);
  };

  // LLM이 달아준 <hl>...</hl> 태그만 하이라이트로 렌더링
  const renderTaggedText = (text, highlightStyle) => {
    const s = String(text ?? "");
    const parts = s.split(/(<hl>.*?<\/hl>)/g).filter(Boolean);

    return parts.map((p, i) => {
      const isHl = p.startsWith("<hl>") && p.endsWith("</hl>");
      const content = isHl ? p.replace(/^<hl>|<\/hl>$/g, "") : p;

      return (
        <Text key={i} style={isHl ? highlightStyle : null}>
          {content}
        </Text>
      );
    });
  };

  // 기존 renderLlmItem 결과를 “태그 하이라이트 렌더링”까지 한 번에
  const renderLlmText = (item, highlightStyle = reportStyles.highlightText) =>
    renderTaggedText(renderLlmItem(item), highlightStyle);

  const sectionItems = [
    ['overview', '월간 소비 현황'],
    ['trend', '월별 지출 추이'],
    ['analytics', '소비 패턴 분석'],
    ['satisfaction', '소비 목적별 만족도'],
    ['worst', '불만족 지출 상위 3건'],
    ['ai', 'AI 인사이트'],
  ];

  const saveSectionOffset = (key) => (event) => {
    const y = event.nativeEvent.layout.y;
    setSectionOffsets((current) => current[key] === y ? current : { ...current, [key]: y });
  };

  const moveToSection = (key) => {
    const y = sectionOffsets[key];
    if (typeof y !== 'number') return;
    setActiveSection(key);
    reportScrollRef.current?.scrollTo({ y: Math.max(0, y - 58), animated: true });
  };

  const updateActiveSection = (event) => {
    const y = event.nativeEvent.contentOffset.y + 90;
    const available = sectionItems
      .filter(([key]) => typeof sectionOffsets[key] === 'number')
      .sort((a, b) => sectionOffsets[a[0]] - sectionOffsets[b[0]]);
    let next = available[0]?.[0] || 'overview';
    for (const [key] of available) {
      if (sectionOffsets[key] <= y) next = key;
    }
    if (next !== activeSection) setActiveSection(next);
  };

  const correlationText = (correlation) => {
    if (!correlation?.sufficient) return '평가가 연결된 지출이 3건 이상 필요합니다.';
    const value = Number(correlation.coefficient);
    if (value <= -0.7) return '돈은 더 썼는데, 만족은 오히려 낮았네요!';
    if (value < -0.4) return '비싼 소비가 덜 만족스러운 편이네요!';
    if (value <= 0.4) return '돈과 만족, 꼭 같이 움직이진 않네요!';
    if (value < 0.7) return '비싼 소비가 더 만족스러운 편이네요!';
    return '돈도 만족도도, 나란히 올라갔네요!';
  };

  const efficiencyItems = Array.isArray(llmReport?.analytics?.categoryEfficiency)
    ? llmReport.analytics.categoryEfficiency
    : [];
  const efficiencyBestGroup = efficiencyItems
    .filter((item) => Number(item.satisfactionPer10000Won) >= 2.5)
    .sort((a, b) => Number(b.satisfactionPer10000Won) - Number(a.satisfactionPer10000Won));
  const efficiencyWorstGroup = efficiencyItems
    .filter((item) => Number(item.satisfactionPer10000Won) < 2.5)
    .sort((a, b) => Number(a.satisfactionPer10000Won) - Number(b.satisfactionPer10000Won));
  const efficiencyBestItems = showAllBest ? efficiencyBestGroup : efficiencyBestGroup.slice(0, 3);
  const efficiencyWorstItems = showAllWorst
    ? efficiencyWorstGroup
    : efficiencyWorstGroup.slice(0, 3);
  const outlierItems = Array.isArray(llmReport?.analytics?.outliers)
    ? llmReport.analytics.outliers
    : [];
  const visibleOutliers = showAllOutliers ? outlierItems : outlierItems.slice(0, 3);
  const reflectiveSpendingItems = Array.isArray(llmReport?.analytics?.reflectiveSpending)
    ? llmReport.analytics.reflectiveSpending
    : [];
  const reflectiveSpendingGroups = Object.values(
    reflectiveSpendingItems.reduce((groups, item) => {
      const key = item.typeKey;
      if (!groups[key]) {
        groups[key] = {
          key,
          label: item.typeLabel,
          characterMessage: item.characterMessage,
          count: 0,
          totalAmount: 0,
          transactions: [],
          isReflectiveDetail: true,
        };
      }
      groups[key].count += 1;
      groups[key].totalAmount += Number(item.amount || 0);
      groups[key].transactions.push(item);
      return groups;
    }, {})
  ).sort((a, b) => b.count - a.count || b.totalAmount - a.totalAmount);
  const visibleReflectiveGroups = showAllPatterns
    ? reflectiveSpendingGroups
    : reflectiveSpendingGroups.slice(0, 1);

  const openTransactionList = ({ key, label, transactions, description }) => {
    if (!transactions?.length) return;
    setSelectedPattern({
      key,
      label,
      count: transactions.length,
      totalAmount: transactions.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      transactions,
      description,
      isTransactionList: true,
    });
  };

  const renderEfficiencyRow = (item, tone) => (
    <TouchableOpacity
      key={`${tone}-${item.category}`}
      activeOpacity={0.75}
      onPress={() => openTransactionList({
        key: `efficiency-${item.category}`,
        label: `${item.category} · 만족 효율`,
        transactions: item.transactions || [],
        description: '만족도 평가가 연결된 해당 카테고리의 지출 내역입니다.',
      })}
      style={reportStyles.analyticsRow}
    >
      <View style={tone === 'worst' ? reportStyles.statusDotNegative : reportStyles.statusDotPositive} />
      <View style={{ flex: 1 }}>
        <Text style={reportStyles.listTitle}>{item.category}</Text>
        <Text style={reportStyles.caption}>평가 {item.ratedCount}건 · 평균 지출 {formatKRW(item.averageAmount)}</Text>
      </View>
      <Text style={tone === 'worst' ? reportStyles.efficiencyWorstScore : reportStyles.analyticsScore}>
        {Number(item.satisfactionPer10000Won).toFixed(1)}점
      </Text>
    </TouchableOpacity>
  );

  const formatDetailDate = (value) => {
    if (!value) return '정보 없음';
    const date = value?.toDate
      ? value.toDate()
      : value?._seconds
      ? new Date(value._seconds * 1000)
      : new Date(value);
    return Number.isNaN(date.getTime())
      ? '정보 없음'
      : date.toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const openBackgroundDetails = (stat, emotion, emotionLabel) => {
    const transactions = stat.records?.[emotion] || [];
    if (!transactions.length) return;
    setSelectedPattern({
      key: `background-${stat.bg}-${emotion}`,
      label: `${stat.bg} · ${emotionLabel}`,
      count: transactions.length,
      totalAmount: transactions.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      transactions,
      isBackgroundDetail: true,
    });
  };


  return (
    <SafeAreaView style={reportStyles.screen}>
      <View style={reportStyles.header}><Text style={reportStyles.appTitle}>리포트</Text></View>

      <ScrollView
        ref={reportScrollRef}
        contentContainerStyle={reportStyles.content}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
        onScroll={updateActiveSection}
        scrollEventThrottle={32}
      >
        <View style={reportStyles.sectionNavWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={reportStyles.sectionNav}>
            {sectionItems.map(([key, label]) => (
              <TouchableOpacity
                key={key}
                onPress={() => moveToSection(key)}
                style={[reportStyles.sectionNavButton, activeSection === key && reportStyles.sectionNavButtonActive]}
              >
                <Text style={[reportStyles.sectionNavText, activeSection === key && reportStyles.sectionNavTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ① 원그래프 + 상위 5개 카테고리 */}
        <View style={reportStyles.card} onLayout={saveSectionOffset('overview')}>
          <View style={reportStyles.rowBetween}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="이전 달"
              onPress={() => moveMonth(-1)}
              style={{ paddingHorizontal: 12, paddingVertical: 8 }}
            >
              <Text style={[reportStyles.cardTitle, { fontSize: 24 }]}>‹</Text>
            </TouchableOpacity>
            <Text style={reportStyles.cardTitle}>{year}년 {month}월</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="다음 달"
              accessibilityState={{ disabled: !canGoNext }}
              disabled={!canGoNext}
              onPress={() => moveMonth(1)}
              style={{ paddingHorizontal: 12, paddingVertical: 8 }}
            >
              <Text style={[reportStyles.cardTitle, { fontSize: 24 }, !canGoNext && { color: '#D1D5DB' }]}>›</Text>
            </TouchableOpacity>
          </View>


          {loading ? (
            <View style={reportStyles.center}><ActivityIndicator /></View>
          ) : total === 0 ? (
            <Text style={[reportStyles.cardText, { marginTop: 8 }]}>이번 달 지출 데이터가 없어요.</Text>
          ) : (
            <>
              <DonutChart data={pieData} total={total} />

              <View style={{ marginTop: 14, borderTopWidth: 1, borderTopColor: '#F0EDF3' }}>
                {top5.map(([cat, sum]) => (
                  <TouchableOpacity
                    key={cat}
                    activeOpacity={0.9}
                    onPress={() => openTransactionList({
                      key: `category-${cat}`,
                      label: `${cat} 거래 내역`,
                      transactions: items.filter((item) =>
                        String(item?.type || '').toLowerCase() === 'expense' &&
                        (item.spendingCategory || item.category || '기타') === cat
                      ),
                      description: `${year}년 ${month}월 ${cat} 카테고리의 지출 내역입니다.`,
                    })}
                    style={reportStyles.catRow}
                  >
                    <View style={[reportStyles.dot, { backgroundColor: displayChartData.find((item) => item.name === cat)?.color || '#CDD1D5' }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={reportStyles.listTitle}>{cat}</Text>
                      <Text style={reportStyles.caption}>{pct(sum, total)}%</Text>
                    </View>
                    <Text style={reportStyles.totalAmountSm}>{formatKRW(sum)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>

        {/* ② 월별 지출 추이 (꺾은선) */}
        <View style={reportStyles.card} onLayout={saveSectionOffset('trend')}>
          <Text style={reportStyles.cardTitle}>월별 지출 추이</Text>

          {seriesLoading ? (
            <View style={reportStyles.center}><ActivityIndicator /></View>
          ) : monthlySeries.values.length === 0 ? (
            <Text style={[reportStyles.cardText, { marginTop: 8 }]}>지출 데이터가 충분하지 않습니다.</Text>
          ) : (
            <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#7D4BD6' }} />
                <Text style={reportStyles.caption}>월 전체</Text>
              </View>
              {monthlySeries.sameDayValues.length > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#9CA3AF' }} />
                  <Text style={reportStyles.caption}>매월 1일~{trendDay}일</Text>
                </View>
              )}
            </View>
            <TrendChart
              labels={monthlySeries.labels}
              values={monthlySeries.values}
              sameDayValues={monthlySeries.sameDayValues}
            />
            </>
          )}
        </View>

        {/* 서버 코드가 계산한 재무 분석 */}
        <View style={reportStyles.card} onLayout={saveSectionOffset('analytics')}>
          <Text style={reportStyles.cardTitle}>소비 패턴 분석</Text>

          {llmLoading ? (
            <LoadingBlock />
          ) : !llmReport?.analytics ? (
            <Text style={[reportStyles.cardText, { marginTop: 12 }]}>분석 결과를 불러오지 못했습니다.</Text>
          ) : (
            <View style={{ marginTop: 14 }}>
              <View style={reportStyles.metricBox}>
                <Text style={reportStyles.metricLabel}>지출 금액과 만족도의 관계</Text>
                <Text style={reportStyles.metricInsight}>
                  {correlationText(llmReport.analytics.satisfactionCorrelation)}
                </Text>
              </View>

              <Text style={[reportStyles.listTitle, { marginTop: 18 }]}>카테고리별 만족 효율</Text>
              <Text style={[reportStyles.caption, { marginTop: 4 }]}>만족도 점수 합 ÷ 총지출액 × 10,000으로 계산하며 최대 5.0점입니다. 2.5점 이상은 BEST, 미만은 WORST입니다.</Text>
              {efficiencyItems.length ? (
                <>
                  {efficiencyBestGroup.length > 0 && (
                    <>
                      <Text style={[reportStyles.efficiencyGroupTitle, reportStyles.efficiencyBestTitle]}>만족 효율 BEST 3</Text>
                      {efficiencyBestItems.map((item) => renderEfficiencyRow(item, 'best'))}
                      {efficiencyBestGroup.length > 3 && (
                        <TouchableOpacity
                          onPress={() => setShowAllBest((current) => !current)}
                          style={reportStyles.moreButton}
                        >
                          <Text style={reportStyles.moreButtonText}>{showAllBest ? 'BEST 접기' : `BEST 더보기 (${efficiencyBestGroup.length - 3})`}</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}

                  {efficiencyWorstGroup.length > 0 && (
                    <>
                      <Text style={[reportStyles.efficiencyGroupTitle, reportStyles.efficiencyWorstTitle]}>만족 효율 WORST 3</Text>
                      {efficiencyWorstItems.map((item) => renderEfficiencyRow(item, 'worst'))}
                      {efficiencyWorstGroup.length > 3 && (
                        <TouchableOpacity
                          onPress={() => setShowAllWorst((current) => !current)}
                          style={reportStyles.moreButton}
                        >
                          <Text style={reportStyles.moreButtonText}>{showAllWorst ? 'WORST 접기' : `WORST 더보기 (${efficiencyWorstGroup.length - 3})`}</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </>
              ) : (
                <Text style={[reportStyles.cardText, { marginTop: 8 }]}>만족도 평가가 연결된 지출이 없습니다.</Text>
              )}

              <Text style={[reportStyles.listTitle, { marginTop: 18 }]}>평소보다 큰 지출</Text>
              {outlierItems.length ? (
                <>
                  {visibleOutliers.map((item) => (
                    <TouchableOpacity
                      key={item.transactionId}
                      activeOpacity={0.75}
                      onPress={() => setSelectedTransaction({ ...item, detailType: '이상 지출' })}
                      style={reportStyles.outlierRow}
                    >
                      <View style={reportStyles.statusDotCaution} />
                      <View style={{ flex: 1 }}>
                        <Text style={reportStyles.listTitle}>{item.category}</Text>
                        {!!item.memo && <Text style={reportStyles.caption}>{item.memo}</Text>}
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={reportStyles.outlierAmount}>{formatKRW(item.amount)}</Text>
                        <Text style={reportStyles.outlierRatio}>{item.medianRatio != null ? `${item.medianRatio}배 · ` : ''}평소 {formatKRW(item.medianAmount)}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                  {outlierItems.length > 3 && (
                    <TouchableOpacity onPress={() => setShowAllOutliers((current) => !current)} style={reportStyles.moreButton}>
                      <Text style={reportStyles.moreButtonText}>
                        {showAllOutliers ? '이상 지출 접기' : `이상 지출 더보기 (${outlierItems.length - 3})`}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <Text style={[reportStyles.cardText, { marginTop: 8 }]}>평소보다 큰 지출이 없어요.</Text>
              )}

              {reflectiveSpendingGroups.length > 0 && (
                <>
                  <Text style={[reportStyles.listTitle, { marginTop: 20 }]}>돌아볼 소비 유형</Text>
                  {visibleReflectiveGroups.map((group) => (
                    <TouchableOpacity
                      key={group.key}
                      activeOpacity={0.75}
                      onPress={() => setSelectedPattern(group)}
                      style={reportStyles.patternRow}
                    >
                      <View style={reportStyles.statusDotReview} />
                      <View style={{ flex: 1 }}>
                        <View style={reportStyles.reflectiveTitleRow}>
                          <Text style={reportStyles.patternTitle}>{group.label}</Text>
                          <Text style={reportStyles.reflectiveTypeCount}>{group.count}건</Text>
                        </View>
                        <Text style={reportStyles.reflectiveMessage}>{group.characterMessage}</Text>
                      </View>
                      <View style={reportStyles.reflectiveSummary}>
                        <Text style={reportStyles.reflectiveSummaryAmount}>{formatKRW(group.totalAmount)}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                  {reflectiveSpendingGroups.length > 1 && (
                    <TouchableOpacity onPress={() => setShowAllPatterns((current) => !current)} style={reportStyles.moreButton}>
                      <Text style={reportStyles.moreButtonText}>
                        {showAllPatterns ? '추가 분석 접기' : `추가 분석 더보기 (${reflectiveSpendingGroups.length - 1})`}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          )}
        </View>

          {/* ⑤ 지출배경별 만족도 분석 */}
          <View style={[reportStyles.card, { marginTop: 12 }]} onLayout={saveSectionOffset('satisfaction')}>
            <Text style={reportStyles.cardTitle}>소비 목적별 만족도</Text>

            {bgLoading ? (
              <View style={reportStyles.center}>
                <ActivityIndicator />
                <Text style={[reportStyles.cardText, { marginTop: 6, color: '#888' }]}>
                  데이터를 불러오는 중…
                </Text>
              </View>
            ) : bgStats.length === 0 ? (
              <Text style={[reportStyles.cardText, { marginTop: 8 }]}>
                아직 만족도 평가가 없습니다.
              </Text>
            ) : (
              <View style={{ marginTop: 12 }}>
                {bgStats.map((x) => (
                  <View key={x.bg} style={reportStyles.bgBlock}>
                    <Text style={reportStyles.bgLabel}>{x.bg}</Text>

                    <View style={reportStyles.bgBarWrap}>
                      {/* 불만족 */}
                      <TouchableOpacity
                        activeOpacity={0.75}
                        disabled={x.dissatisfied === 0}
                        onPress={() => openBackgroundDetails(x, 'dissatisfied', '불만족')}
                        style={[
                          reportStyles.bgBarDissatisfied,
                          { width: `${x.pD}%` }
                        ]}
                      >
                        {x.pD > 8 && (
                          <Text style={reportStyles.bgBarText}>
                            {x.pD}%
                          </Text>
                        )}
                      </TouchableOpacity>


                      {/* 보통 */}
                      <TouchableOpacity
                        activeOpacity={0.75}
                        disabled={x.neutral === 0}
                        onPress={() => openBackgroundDetails(x, 'neutral', '보통')}
                        style={[
                          reportStyles.bgBarNeutral,
                          { width: `${x.pN}%` }
                        ]}
                      >
                        {x.pN > 8 && (
                          <Text style={reportStyles.bgBarText}>
                            {x.pN}%
                          </Text>
                        )}
                      </TouchableOpacity>


                      {/* 만족 */}
                      <TouchableOpacity
                        activeOpacity={0.75}
                        disabled={x.satisfied === 0}
                        onPress={() => openBackgroundDetails(x, 'satisfied', '만족')}
                        style={[
                          reportStyles.bgBarSatisfied,
                          { width: `${x.pS}%` }
                        ]}
                      >
                        {x.pS > 8 && (
                          <Text style={reportStyles.bgBarText}>
                            {x.pS}%
                          </Text>
                        )}
                      </TouchableOpacity>

                    </View>
                  </View>
                ))}

                {/* 범례 */}
                <View style={reportStyles.bgLegendRow}>
                  <Text style={reportStyles.bgLegendItem}><Text style={reportStyles.bgLegendD}>■</Text> 불만족</Text>
                  <Text style={reportStyles.bgLegendItem}><Text style={reportStyles.bgLegendN}>■</Text> 보통</Text>
                  <Text style={reportStyles.bgLegendItem}><Text style={reportStyles.bgLegendS}>■</Text> 만족</Text>
                </View>
              </View>
            )}
          </View>

          {/* 이번달 지출 Worst 3 */}
          <View
            style={[reportStyles.card, { paddingBottom: 18 }]}
            onLayout={saveSectionOffset('worst')}
          >
              <Text style={[reportStyles.cardTitle, { fontSize: 18, marginBottom: 6 }]}>
                불만족 지출 상위 3건
              </Text>

              {worst3.length === 0 ? (
                <Text style={[reportStyles.cardText, { marginTop: 8 }]}>이번 달 불만족 지출 기록이 없습니다.</Text>
              ) : worst3.map((item, index) => {
                const rank = index + 1;
                const dt = item.date?.toDate
                  ? item.date.toDate()
                  : new Date(item.date);

                const dateKR = `${dt.getMonth() + 1}월 ${dt.getDate()}일 ${['일', '월', '화', '수', '목', '금', '토'][dt.getDay()]
                  }요일`;

                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.75}
                    onPress={() => setSelectedTransaction({
                      ...item,
                      transactionId: item.id,
                      detailType: '불만족 지출',
                      paymentMethod: item.paymentMethod || item.expenseDetail?.paymentMethod || null,
                    })}
                    style={reportStyles.worstContainer}
                  >
                    <View style={reportStyles.worstRow}>

                      <Text style={reportStyles.worstRank}>{rank}</Text>

                      <View style={reportStyles.worstLeft}>
                        <Text style={reportStyles.worstDate}>{dateKR}</Text>
                        <Text style={reportStyles.worstAmount}>
                          {Number(item.amount).toLocaleString('ko-KR')}원
                        </Text>
                      </View>

                      <View style={reportStyles.worstRight}>
                        <Text style={reportStyles.worstTitle}>
                          {item.memo || item.category || '지출'}
                        </Text>

                        <Text style={reportStyles.worstSub}>
                          구매배경 : {item.spendingBackground ?? '정보 없음'}
                        </Text>

                        {item.satisfaction?.reasons?.length > 0 && (
                          <Text style={reportStyles.worstSub}>
                            불만족이유 : {item.satisfaction.reasons.join(', ')}
                          </Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
          </View>
        {/* ScrollView 직접 자식으로 두어 AI 섹션 이동 좌표를 정확히 측정한다. */}
        <View onLayout={saveSectionOffset('ai')} />

        {/* --- AI 인사이트: 화면의 수치와 겹치지 않는 해석과 다음 행동만 보여준다 --- */}
        <View style={[reportStyles.card, reportStyles.aiReportCard, reportStyles.aiSummaryCard]}>
          <View style={reportStyles.aiTitleRow}>
            <Text style={reportStyles.cardTitle}>AI 인사이트</Text>
            <View style={reportStyles.aiBadge}>
              <Text style={reportStyles.aiBadgeText}>AI 해석</Text>
            </View>
          </View>
          {llmLoading ? (
            <LoadingBlock />
          ) : llmError ? (
            <ErrorBlock message={llmError} />
          ) : llmReport?.notice ? (
            <Text style={[reportStyles.cardText, { marginTop: 8 }]}>{llmReport.notice}</Text>
          ) : !llmReport?.persona ? (
            <Text style={[reportStyles.cardText, { marginTop: 8 }]}>AI 인사이트를 불러오지 못했어요.</Text>
          ) : (
            <>
              <Text style={reportStyles.aiPersona}>{renderLlmText(llmReport.persona)}</Text>
            </>
          )}
        </View>

        {!llmLoading && !llmError && llmReport?.patterns?.length > 0 && (
          <View style={[reportStyles.card, reportStyles.aiReportCard, { marginTop: 12 }]}>
            <Text style={reportStyles.cardTitle}>숨은 소비 패턴</Text>
            {llmReport.patterns.map((item, i) => (
              <View key={i} style={reportStyles.aiInsightRow}>
                <View style={reportStyles.aiBullet} />
                <View style={{ flex: 1 }}>
                  <Text style={reportStyles.aiInsightText}>{renderLlmText(item.pattern)}</Text>
                  {!!item.evidence && (
                    <Text style={[reportStyles.caption, { marginTop: 4 }]}>{renderLlmText(item.evidence)}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {!llmLoading && !llmError && (llmReport?.next_actions?.action || llmReport?.next_actions?.challenge) ? (
          <View style={[reportStyles.card, reportStyles.aiReportCard, { marginTop: 12 }]}>
            <Text style={reportStyles.cardTitle}>다음 달 실천</Text>
            {!!llmReport.next_actions.action && (
              <>
                <Text style={reportStyles.aiSubsectionTitle}>실천 행동</Text>
                <View style={reportStyles.aiInsightRow}>
                  <View style={reportStyles.aiBullet} />
                  <Text style={reportStyles.aiInsightText}>{renderLlmText(llmReport.next_actions.action)}</Text>
                </View>
              </>
            )}
            {!!llmReport.next_actions.challenge && (
              <>
                <Text style={reportStyles.aiSubsectionTitle}>챌린지 추천</Text>
                <View style={reportStyles.aiInsightRow}>
                  <View style={reportStyles.aiBullet} />
                  <Text style={reportStyles.aiInsightText}>{renderLlmText(llmReport.next_actions.challenge)}</Text>
                </View>
              </>
            )}
          </View>
        ) : null}



        <View style={{ height: 24 }} />
      </ScrollView>

      <Modal
        visible={Boolean(selectedTransaction)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedTransaction(null)}
      >
        <View style={reportStyles.detailOverlay}>
          <TouchableOpacity
            activeOpacity={1}
            style={reportStyles.detailBackdrop}
            onPress={() => setSelectedTransaction(null)}
          />
          <View style={reportStyles.detailSheet}>
            <View style={reportStyles.rowBetween}>
              <Text style={reportStyles.detailTitle}>{selectedTransaction?.detailType || '지출 상세'}</Text>
              <TouchableOpacity onPress={() => setSelectedTransaction(null)} style={reportStyles.detailCloseButton}>
                <Text style={reportStyles.detailCloseText}>×</Text>
              </TouchableOpacity>
            </View>

            <Text style={reportStyles.detailAmount}>{formatKRW(selectedTransaction?.amount)}</Text>
            {!!selectedTransaction?.characterMessage && (
              <Text style={reportStyles.reflectiveDetailMessage}>{selectedTransaction.characterMessage}</Text>
            )}
            {selectedTransaction?.medianRatio != null && (
              <Text style={reportStyles.detailRatio}>평소의 {selectedTransaction.medianRatio}배 지출</Text>
            )}

            <View style={reportStyles.detailDivider} />
            <View style={reportStyles.detailRow}>
              <Text style={reportStyles.detailLabel}>카테고리</Text>
              <Text style={reportStyles.detailValue}>{selectedTransaction?.category || '기타'}</Text>
            </View>
            <View style={reportStyles.detailRow}>
              <Text style={reportStyles.detailLabel}>날짜</Text>
              <Text style={reportStyles.detailValue}>{formatDetailDate(selectedTransaction?.date)}</Text>
            </View>
            <View style={reportStyles.detailRow}>
              <Text style={reportStyles.detailLabel}>결제수단</Text>
              <Text style={reportStyles.detailValue}>{selectedTransaction?.paymentMethod || '정보 없음'}</Text>
            </View>
            <View style={reportStyles.detailRow}>
              <Text style={reportStyles.detailLabel}>구매배경</Text>
              <Text style={reportStyles.detailValue}>{selectedTransaction?.spendingBackground || '정보 없음'}</Text>
            </View>
            <View style={reportStyles.detailRow}>
              <Text style={reportStyles.detailLabel}>기록</Text>
              <Text style={reportStyles.detailValue}>{selectedTransaction?.memo || '작성된 메모 없음'}</Text>
            </View>
            {!!(selectedTransaction?.satisfaction?.emotion || selectedTransaction?.emotion) && (
              <View style={reportStyles.detailRow}>
                <Text style={reportStyles.detailLabel}>만족도</Text>
                <Text style={reportStyles.detailValue}>
                  {(selectedTransaction?.satisfaction?.emotion || selectedTransaction?.emotion) === 'satisfied'
                    ? '만족'
                    : (selectedTransaction?.satisfaction?.emotion || selectedTransaction?.emotion) === 'neutral'
                    ? '보통'
                    : '불만족'}
                </Text>
              </View>
            )}
            {selectedTransaction?.satisfaction?.reasons?.length > 0 && (
              <View style={reportStyles.detailRow}>
                <Text style={reportStyles.detailLabel}>만족도 사유</Text>
                <Text style={reportStyles.detailValue}>{selectedTransaction.satisfaction.reasons.join(', ')}</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(selectedPattern)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPattern(null)}
      >
        <View style={reportStyles.detailOverlay}>
          <TouchableOpacity
            activeOpacity={1}
            style={reportStyles.detailBackdrop}
            onPress={() => setSelectedPattern(null)}
          />
          <View style={reportStyles.detailSheet}>
            <View style={reportStyles.rowBetween}>
              <Text style={reportStyles.detailTitle}>{selectedPattern?.label || '패턴 상세'}</Text>
              <TouchableOpacity onPress={() => setSelectedPattern(null)} style={reportStyles.detailCloseButton}>
                <Text style={reportStyles.detailCloseText}>×</Text>
              </TouchableOpacity>
            </View>

            <Text style={reportStyles.patternDetailSummary}>
              이번 달 {selectedPattern?.count ?? 0}회 · {formatKRW(selectedPattern?.totalAmount)}
            </Text>
            <Text style={[reportStyles.caption, { marginTop: 5 }]}>
              {selectedPattern?.description || (selectedPattern?.isBackgroundDetail
                ? '선택한 지출배경과 만족도에 해당하는 거래입니다.'
                : '동일한 유형으로 분류된 돌아볼 소비 내역입니다.')}
            </Text>
            {!!selectedPattern?.characterMessage && (
              <Text style={reportStyles.reflectiveDetailMessage}>{selectedPattern.characterMessage}</Text>
            )}

            <View style={reportStyles.detailDivider} />
            {selectedPattern?.keywords?.length > 0 && (
              <>
                <Text style={reportStyles.patternDetailHeading}>판정 키워드</Text>
                <Text style={reportStyles.patternDetailText}>{selectedPattern?.keywords?.join(', ') || '정보 없음'}</Text>
              </>
            )}

            <Text style={[reportStyles.patternDetailHeading, { marginTop: 16 }]}>관련 지출 내역</Text>
            <ScrollView style={reportStyles.patternTransactionList} showsVerticalScrollIndicator={false}>
              {selectedPattern?.transactions?.map((item) => (
                <TouchableOpacity
                  key={item.transactionId || item.id}
                  activeOpacity={0.75}
                  style={reportStyles.patternTransactionRow}
                  onPress={() => {
                    setSelectedPattern(null);
                    setSelectedTransaction({
                      ...item,
                      detailType: item.typeLabel || '관련 지출',
                      satisfaction: item.satisfaction || {
                        emotion: item.emotion,
                        reasons: item.reasons || [],
                      },
                    });
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={reportStyles.listTitle}>{item.memo || item.category || '지출'}</Text>
                    <Text style={[reportStyles.caption, { marginTop: 3 }]}>{item.category || '기타'} · {formatDetailDate(item.date)}</Text>
                  </View>
                  <Text style={reportStyles.patternTransactionAmount}>{formatKRW(item.amount)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
