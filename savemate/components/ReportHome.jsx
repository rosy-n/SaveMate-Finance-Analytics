import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PieChart } from 'react-native-chart-kit';
import { useApi } from '../hooks/useApi';
import { SaveMateStyles as styles } from '../styles/SaveMateStyles';
import { ReportStyles as reportStyles } from './styles/ReportStyles';

const screenWidth = Dimensions.get('window').width;

// 카테고리 색상 팔레트
const PALETTE = ['#F8A8A8','#F6C27A','#A8E6A1','#A8C6F8','#C7A8F8','#D5D7DB','#8DD3E0','#F5A7C0','#F3D37A','#9BD2A4','#8FA7E4','#C0B1E8','#B9BDC6','#7FD1C5'];
const CAT_COLORS = {};

const formatKRW = (n) => `${Number(n || 0).toLocaleString('ko-KR')}원`;
const pct = (part, total) => (total ? Math.round((part / total) * 100) : 0);

export default function ReportHome() {
  const api = useApi();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [year, month] = useMemo(() => {
    const now = new Date(); return [now.getFullYear(), now.getMonth() + 1];
  }, []);
  const uid = process.env.EXPO_PUBLIC_UID || '2312736';

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
  }, [api, uid, year, month]);

  // 카테고리 집계
  const { total, top3, chartData } = useMemo(() => {
    const sums = {};
    let t = 0;

    for (const it of items) {
      // 서버 expand=true 응답의 표준 필드:
      // { type: 'income'|'expense', amount: number, category: string, ... }
      const type = String(it?.type || '').toLowerCase();
      if (type !== 'expense') continue;             // 지출만 집계

      const cat = it?.category || it?.spendingCategory || '기타';
      const amount = Math.abs(Number(it?.amount ?? 0));
      if (!Number.isFinite(amount) || amount <= 0) continue;

      sums[cat] = (sums[cat] || 0) + amount;
      t += amount;
    }

    const entries = Object.entries(sums).sort((a, b) => b[1] - a[1]);

    const chart = entries.map(([name, value], i) => {
      if (!CAT_COLORS[name]) CAT_COLORS[name] = PALETTE[i % PALETTE.length];
      return {
        name,
        amount: value,
        color: CAT_COLORS[name],
        legendFontColor: '#6b6b6b',
        legendFontSize: 12,
      };
    });

    return { total: t, top3: entries.slice(0, 3), chartData: chart };
  }, [items]);
    
  // (2) chartData 결과를 기반으로 pieData 생성
const pieData = useMemo(() => {
    const src = Array.isArray(chartData) ? chartData : [];
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
    }, [chartData]);


  return (
    <SafeAreaView style={reportStyles.screen}>
      <View style={reportStyles.header}><Text style={reportStyles.appTitle}>리포트</Text></View>

      <ScrollView contentContainerStyle={reportStyles.content} showsVerticalScrollIndicator={false}>
        {/* ① 원그래프 + 상위 3개 카테고리 */}
        <View style={reportStyles.card}>
          <View style={reportStyles.rowBetween}>
            <Text style={reportStyles.cardTitle}>{year}년 {month}월</Text>
          </View>

          {loading ? (
            <View style={reportStyles.center}><ActivityIndicator /></View>
          ) : total === 0 ? (
            <Text style={[reportStyles.cardText,{marginTop:8}]}>이번 달 지출 데이터가 없어요.</Text>
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
                {top3.map(([cat, sum]) => (
                  <TouchableOpacity
                    key={cat}
                        activeOpacity={0.9}
                        onPress={() => router.push({ pathname: '/report/categoryDetail', params: { category: cat, year: String(year), month: String(month) } })}
                        style={reportStyles.catRow}
                    >
                        <View style={[reportStyles.dot,{ backgroundColor: CAT_COLORS[cat] || '#CDD1D5'}]} />
                        <View style={{ flex:1 }}>
                            <Text style={reportStyles.listTitle}>{cat}</Text>
                            <Text style={reportStyles.caption}>{pct(sum,total)}%</Text>
                        </View>
                        <Text style={reportStyles.totalAmountSm}>{formatKRW(sum)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}