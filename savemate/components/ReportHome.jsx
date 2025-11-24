import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { Text as SvgText } from 'react-native-svg';
import { useApi } from '../hooks/useApi';
import { SaveMateStyles as styles } from '../styles/SaveMateStyles';
import { ReportStyles as reportStyles } from './styles/ReportStyles';
import { useFocusEffect } from '@react-navigation/native';
import { appBus } from '../app/eventBus';

const screenWidth = Dimensions.get('window').width;

// 카테고리 색상 팔레트
const PALETTE = ['#F8A8A8', '#F6C27A', '#A8E6A1', '#A8C6F8', '#C7A8F8', '#D5D7DB', '#8DD3E0', '#F5A7C0', '#F3D37A', '#9BD2A4', '#8FA7E4', '#C0B1E8', '#B9BDC6', '#7FD1C5'];
const CAT_COLORS = {};

const formatKRW = (n) => `${Number(n || 0).toLocaleString('ko-KR')}원`;
const pct = (part, total) => (total ? Math.round((part / total) * 100) : 0);

export default function ReportHome() {
  const uid = process.env.EXPO_PUBLIC_UID;

  const [worst3, setWorst3] = useState([]);
  const api = useApi();

  const [refreshKey, setRefreshKey] = useState(0);

  // ✅ 리포트탭 들어올 때마다 refreshKey 증가
  useFocusEffect(
    useCallback(() => {
      setRefreshKey(k => k + 1);
    }, [])
  );

  // ✅ 거래 저장/삭제 시 앱 전역 이벤트로도 refresh
  useEffect(() => {
    const off = appBus.on('transactionsChanged', () => {
      setRefreshKey(k => k + 1);
    });
    return () => off && off();
  }, []);

  // ✅ refreshKey마다 "현재 월" 재계산 (앱 켜둔 채로 월 넘어가도 안전)
  const [year, month] = useMemo(() => {
    const now = new Date();
    return [now.getFullYear(), now.getMonth() + 1];
  }, [refreshKey]);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const [seriesLoading, setSeriesLoading] = useState(true);
  const [monthlySeries, setMonthlySeries] = useState({ labels: [], values: [] });

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

        if (!uid) {
          throw new Error('EXPO_PUBLIC_UID가 비어 있습니다 (.env 확인).');
        }

        const path = `/api/reports/consumption?uid=${uid}&year=${year}&month=${month}`;
        console.log('📡 GET', api.baseURL + path);

        // (선택) 8초 타임아웃: 네트워크 지연 시 무한 대기 방지
        const ac = new AbortController();
        const t = setTimeout(() => ac.abort(), 8000);

        const res = await api.get(path, { signal: ac.signal }); // useApi가 signal 전달 지원 안 하면 fetch로 대체
        clearTimeout(t);

        if (!mounted) return;

        const rep = res?.report;
        if (!rep || typeof rep.summary !== 'string') {
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
    let mounted = true;

    (async () => {
      try {
        setBgLoading(true);

        // 1) 만족도 평가 전체 가져오기
        const satRes = await api.get(`/api/satisfaction/${uid}`);
        const satItems = Array.isArray(satRes?.items) ? satRes.items : [];

        if (satItems.length === 0) {
          mounted && setBgStats([]);
          return;
        }

        // 2) transactionId만 추출 → bulk 조회
        const ids = [...new Set(satItems.map(s => s.transactionId))];

        const txRes = await api.post(`/api/transactions/bulk`, { ids, uid });
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

          const bg = tx.spendingBackground || tx.category || '기타';
          if (!agg[bg]) {
            agg[bg] = { dissatisfied: 0, neutral: 0, satisfied: 0 };
          }
          agg[bg][s.emotion] += 1;
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
  }, [api, uid, refreshKey]);


  if (!uid) {
    // 개발 단계라면 Alert/console.warn 정도만, 배포에선 로그인 연동 권장
    console.warn('EXPO_PUBLIC_UID가 설정되지 않았습니다. .env를 확인하세요.');
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const path = `/api/transactions?uid=${uid}&year=${year}&month=${month}&expand=true`;
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
    console.log("🔍 Worst3 시작");

    let mounted = true;

    (async () => {
      try {
        // 1) 전체 만족도 가져오기
        const satRes = await api.get(`/api/satisfaction/${uid}`);
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
        const bulk = await api.post(`/api/transactions/bulk`, { ids, uid });
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
        console.log("🧪 disliked:", disliked.length);
        console.log("🧪 bulk tx:", txList.length);
        console.log("🧪 expenses:", expenses.length);
        console.log("🧪 monthFiltered:", monthFiltered.length);

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
        console.error('🔥 Worst3 새 알고리즘 오류:', e);
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
        const path = `/api/transactions/monthly-sum?uid=${uid}&months=4&endYear=${year}&endMonth=${month}`;
        const res = await api.get(path); // useApi() 사용
        const arr = Array.isArray(res?.items) ? res.items : [];

        // 라벨(가로축)과 값(세로데이터) 구성: 과거→현재 순
        const labels = arr.map(x => `${x.month}월`);
        const values = arr.map(x => Number(x.totalExpense || 0));
        mounted && setMonthlySeries({ labels, values });
      } catch {
        mounted && setMonthlySeries({ labels: [], values: [] });
      } finally {
        mounted && setSeriesLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [api, uid, year, month, refreshKey]);

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

      if (!CAT_COLORS[name]) CAT_COLORS[name] = PALETTE[i % PALETTE.length];
      return {
        name,
        amount: value,
        color: CAT_COLORS[name],
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

  const LoadingBlock = () => (
    <View style={reportStyles.center}>
      <ActivityIndicator />
      <Text style={[reportStyles.cardText, { marginTop: 6, color: '#888' }]}>
        분석 데이터를 불러오는 중…
      </Text>
    </View>
  );

  const ErrorBlock = ({ message }) => (
    <Text style={[reportStyles.cardText, { marginTop: 8, color: '#B43A22' }]}>
      {message}
    </Text>
  );


  return (
    <SafeAreaView style={reportStyles.screen}>
      <View style={reportStyles.header}><Text style={reportStyles.appTitle}>리포트</Text></View>

      <ScrollView contentContainerStyle={reportStyles.content} showsVerticalScrollIndicator={false}>
        {/* ① 원그래프 + 상위 5개 카테고리 */}
        <View style={reportStyles.card}>
          <View style={reportStyles.rowBetween}>
            <Text style={reportStyles.cardTitle}>{year}년 {month}월</Text>
          </View>

          {loading ? (
            <View style={reportStyles.center}><ActivityIndicator /></View>
          ) : total === 0 ? (
            <Text style={[reportStyles.cardText, { marginTop: 8 }]}>이번 달 지출 데이터가 없어요.</Text>
          ) : (
            <>
              <View style={reportStyles.chartWrap}>
                <PieChart
                  data={pieData}
                  width={screenWidth - 48}
                  height={200}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="12"
                  hasLegend={true}
                  center={[0, 0]}
                  chartConfig={{
                    color: () => '#999999',     // 임의 색 (조각 색은 data.color가 사용됨)
                    labelColor: () => '#333333', // 범례/라벨 색
                  }}
                />

              </View>

              <View style={{ marginTop: 8 }}>
                {top5.map(([cat, sum]) => (
                  <TouchableOpacity
                    key={cat}
                    activeOpacity={0.9}
                    onPress={() => router.push({ pathname: '/report/categoryDetail', params: { category: cat, year: String(year), month: String(month) } })}
                    style={reportStyles.catRow}
                  >
                    <View style={[reportStyles.dot, { backgroundColor: CAT_COLORS[cat] || '#CDD1D5' }]} />
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
        <View style={reportStyles.card}>
          <Text style={reportStyles.cardTitle}>월별 지출 추이</Text>

          {seriesLoading ? (
            <View style={reportStyles.center}><ActivityIndicator /></View>
          ) : monthlySeries.values.length === 0 ? (
            <Text style={[reportStyles.cardText, { marginTop: 8 }]}>지출 데이터가 충분하지 않습니다.</Text>
          ) : (
            <LineChart
              data={{
                labels: monthlySeries.labels,               // 예: ['7','8','9','10'] 또는 ['7월','8월','9월','10월']
                datasets: [{ data: monthlySeries.values }], // 예: [0, 210000, 700000, 20000]
              }}
              width={screenWidth - 48}
              height={220}
              withShadow={false}
              withInnerLines={true}
              withOuterLines={false}

              // ✅ y축 라벨은 형식 지정자로 비워 없애기
              withVerticalLabels={true}
              formatYLabel={() => ''}

              // ✅ x축 라벨 기본 표시 (라이브러리에게 맡김)
              withHorizontalLabels={true}
              formatXLabel={(s) => (String(s).endsWith('월') ? s : `${s}월`)}

              fromZero                         // 0부터 시작              

              chartConfig={{
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 0,
                color: (o = 1) => `rgba(125, 75, 214, ${o})`,
                labelColor: (o = 1) => `rgba(0,0,0,${o})`,
                propsForDots: { r: '4', strokeWidth: '2', stroke: '#BFA6F2' },
                propsForBackgroundLines: { stroke: '#E9E9EF', strokeDasharray: '4 6' },
              }}
              style={{ marginTop: 12, borderRadius: 8 }}

              // 점 위 금액 라벨만 간단히 표시
              renderDotContent={({ x, y, indexData, index }) => {
                const v = Number(indexData || 0);
                const man = Math.round(v / 10000);
                const label = man > 0 ? `${man}만원` : `${v.toLocaleString('ko-KR')}원`;
                return (
                  <SvgText key={`val-${index}`} x={x} y={y - 8} fontSize="11" fill="#7D4BD6" textAnchor="middle">
                    {label}
                  </SvgText>
                );
              }}
            />
          )}
        </View>

        {/* --- AI 소비 리포트 (카드 분리) --- */}
        <View>

          {/* 1) 요약 */}
          <View style={reportStyles.card}>
            <Text style={reportStyles.cardTitle}>AI 소비 요약</Text>
            {llmLoading ? (
              <LoadingBlock />
            ) : llmError ? (
              <ErrorBlock message={llmError} />
            ) : !llmReport ? (
              <Text style={[reportStyles.cardText, { marginTop: 8 }]}>
                리포트를 불러오지 못했습니다.
              </Text>
            ) : (
              <Text style={[reportStyles.cardText, { marginTop: 8, lineHeight: 20 }]}>
                {llmReport.summary}
              </Text>
            )}
          </View>

          {/* 소비 습관 + 소비 리스크 (통합 카드) */}
          {(Array.isArray(llmReport?.habits) && llmReport.habits.length > 0) ||
            (Array.isArray(llmReport?.spending_risks) && llmReport.spending_risks.length > 0) ? (
            <View style={[reportStyles.card, { marginTop: 12 }]}>

              {/* 제목 */}
              <Text style={reportStyles.cardTitle}>💡 소비 습관 & ⚠️ 소비 리스크</Text>

              {/* 소비 습관 */}
              {Array.isArray(llmReport?.habits) && llmReport.habits.length > 0 && (
                <>
                  <Text style={[reportStyles.listTitle, { marginTop: 8 }]}>소비 습관</Text>
                  {llmReport.habits.map((h, i) => (
                    <Text key={i} style={reportStyles.cardText}>
                      • {renderLlmItem(h)}
                    </Text>
                  ))}
                </>
              )}

              {/* 소비 리스크 */}
              {Array.isArray(llmReport?.spending_risks) && llmReport.spending_risks.length > 0 && (
                <>
                  <Text style={[reportStyles.listTitle, { marginTop: 12 }]}>소비 리스크</Text>
                  {llmReport.spending_risks.map((r, i) => (
                    <Text key={i} style={reportStyles.cardText}>
                      • {renderLlmItem(r)}
                    </Text>
                  ))}
                </>
              )}

            </View>
          ) : null}


          {/* 4) 감정 패턴 */}
          {llmReport?.emotion_patterns && (
            <View style={[reportStyles.card, { marginTop: 12 }]}>
              <Text style={reportStyles.cardTitle}>🙂 감정 패턴</Text>

              {Array.isArray(llmReport.emotion_patterns.neutral_insights) &&
                llmReport.emotion_patterns.neutral_insights.length > 0 && (
                  <>
                    <Text style={reportStyles.listTitle}>중립 소비</Text>
                    {llmReport.emotion_patterns.neutral_insights.map((e, i) => (
                      <Text key={i} style={reportStyles.cardText}>
                        • {renderLlmItem(e)}
                      </Text>
                    ))}
                  </>
                )}

              {Array.isArray(llmReport.emotion_patterns.satisfied_top_reasons) &&
                llmReport.emotion_patterns.satisfied_top_reasons.length > 0 && (
                  <>
                    <Text style={[reportStyles.listTitle, { marginTop: 10 }]}>만족 소비</Text>
                    {llmReport.emotion_patterns.satisfied_top_reasons.map((e, i) => (
                      <Text key={i} style={reportStyles.cardText}>
                        • {renderLlmItem(e)}
                      </Text>
                    ))}
                  </>
                )}

              {Array.isArray(llmReport.emotion_patterns.dissatisfied_top_reasons) &&
                llmReport.emotion_patterns.dissatisfied_top_reasons.length > 0 && (
                  <>
                    <Text style={[reportStyles.listTitle, { marginTop: 10 }]}>불만족 소비</Text>
                    {llmReport.emotion_patterns.dissatisfied_top_reasons.map((e, i) => (
                      <Text key={i} style={reportStyles.cardText}>
                        • {renderLlmItem(e)}
                      </Text>
                    ))}
                  </>
                )}
            </View>
          )}
          {/* ⑤ 지출배경별 만족도 분석 */}
          <View style={[reportStyles.card, { marginTop: 12 }]}>
            <Text style={reportStyles.cardTitle}>지출배경별 만족도</Text>

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
                      <View
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
                      </View>


                      {/* 보통 */}
                      <View
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
                      </View>


                      {/* 만족 */}
                      <View
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
                      </View>

                    </View>
                  </View>
                ))}

                {/* 범례 */}
                <View style={reportStyles.bgLegendRow}>
                  <Text style={[reportStyles.bgLegendItem, reportStyles.bgLegendD]}>■ 불만족</Text>
                  <Text style={[reportStyles.bgLegendItem, reportStyles.bgLegendN]}>■ 보통</Text>
                  <Text style={[reportStyles.bgLegendItem, reportStyles.bgLegendS]}>■ 만족</Text>
                </View>
              </View>
            )}
          </View>

          {/* 이번달 지출 Worst 3 */}
          {worst3.length > 0 && (
            <View style={[reportStyles.card, { paddingBottom: 18 }]}>
              <Text style={[reportStyles.cardTitle, { fontSize: 18, marginBottom: 6 }]}>
                이번달 지출 Worst 3
              </Text>

              {worst3.map((item, index) => {
                const rank = index + 1;
                const dt = item.date?.toDate
                  ? item.date.toDate()
                  : new Date(item.date);

                const dateKR = `${dt.getMonth() + 1}월 ${dt.getDate()}일 ${['일', '월', '화', '수', '목', '금', '토'][dt.getDay()]
                  }요일`;

                return (
                  <View key={item.id} style={reportStyles.worstContainer}>
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
                  </View>
                );
              })}
            </View>
          )}





        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}