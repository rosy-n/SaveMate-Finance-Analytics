// components/ReportHome.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PieChart } from 'react-native-chart-kit';
import { useApi } from '../hooks/useApi';
import { ReportStyles as styles } from './styles/ReportStyles';


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
      const cat = it.spendingCategory || '기타';
      const amount = Number(it.amount || it.price || it.cost || 0);
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
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}><Text style={styles.appTitle}>리포트</Text></View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ① 원그래프 + 상위 3개 카테고리 */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{year}년 {month}월</Text>
          </View>

          {loading ? (
            <View style={styles.center}><ActivityIndicator /></View>
          ) : total === 0 ? (
            <Text style={[styles.cardText,{marginTop:8}]}>이번 달 지출 데이터가 없어요.</Text>
          ) : (
            <>
              <View style={styles.chartWrap}>
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
                    style={styles.catRow}
                  >
                    <View style={[styles.dot,{ backgroundColor: CAT_COLORS[cat] || '#CDD1D5'}]} />
                    <View style={{ flex:1 }}>
                      <Text style={styles.listTitle}>{cat}</Text>
                      <Text style={styles.caption}>{pct(sum,total)}%</Text>
                    </View>
                    <Text style={styles.totalAmountSm}>{formatKRW(sum)}</Text>
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

// import React from 'react';
// import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
// import { router } from 'expo-router';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { SaveMateStyles as styles } from '../styles/SaveMateStyles';


// // 📍 막대 디자인은 스타일에서만 하도록 수정해야함
// const Bar = ({ bad = 0, mid = 0, good = 0 }) => (
//     <View style={{ flex: 1, height: 14, borderRadius: 8, overflow: 'hidden', flexDirection: 'row', backgroundColor: '#F4F4F6' }}>
//         {!!bad && <View style={{ flex: bad, backgroundColor: '#F7C6C6' }} />}
//         {!!mid && <View style={{ flex: mid, backgroundColor: '#F6E1AE' }} />}
//         {!!good && <View style={{ flex: good, backgroundColor: '#CFF4D2' }} />}
//     </View>
// );

// export default function ReportHome() {
//     return (
//         <SafeAreaView style={styles.screen}>
//             <View style={styles.header}>
//                 <Text style={styles.appTitle}>리포트</Text>
//             </View>

//             <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
//                 {/* 1) 기본 리포트 · 9월 */}
//                 <TouchableOpacity
//                     style={styles.card}
//                     activeOpacity={0.9}
//                     onPress={() => router.push('/report/default')}
//                 >
//                     <View style={styles.rowBetween}>
//                         <Text style={styles.cardTitle}>2025년 9월</Text>
//                         <Text style={styles.chevron}>›</Text>
//                     </View>
//                     <View style={{ marginTop: 6 }}>
//                         <Text style={styles.cardText}>식비 26% · 카페 23% · 쇼핑 18%</Text>
//                         <Text style={styles.cardText}>교통 12% · 여행 20% · 기타 18%</Text>
//                     </View>
//                 </TouchableOpacity>

//                 {/* 2) 월별 지출 추이 -> 일단 가짜 데이터로 꺾은선 그래프로 만들어야함 */}
//                 <View style={styles.card}>
//                     <View style={styles.rowBetween}>
//                         <Text style={styles.cardTitle}>월별 지출 추이</Text>
//                     </View>
//                     <View style={{ marginTop: 6 }}>
//                         <Text style={styles.cardText}>7월 800,000원</Text>
//                         <Text style={styles.cardText}>8월 1,000,000원</Text>
//                         <Text style={styles.cardText}>9월 670,000원</Text>
//                     </View>
//                 </View>

//                 {/* 3) 소비 리포트 */}
//                 <TouchableOpacity
//                     style={styles.card}
//                     activeOpacity={0.9}
//                     onPress={() => router.push('/report/consumption')}
//                 >
//                     <View style={styles.rowBetween}>
//                         <Text style={styles.cardTitle}>소비 리포트</Text>
//                         <Text style={styles.chevron}>›</Text>
//                     </View>
//                     <Text style={[styles.cardText, { marginTop: 6 }]}>
//                         지난달엔 스트레스가 지출의 큰 원인이었어요. 특히, 식비에 많이 썼고,
//                         ‘문화생활’과 ‘간식비’에서도 눈에 띄는 소비가 있었어요
//                     </Text>
//                 </TouchableOpacity>

//                 {/* 4) 지출 만족도 (폰트/카드 = 홈과 동일) */}
//                 <TouchableOpacity
//                     style={styles.card}
//                     activeOpacity={0.9}
//                     onPress={() => router.push('/report/satisfaction')}
//                 >
//                     <View style={styles.rowBetween}>
//                         <Text style={styles.cardTitle}>지출 만족도</Text>
//                         <Text style={styles.chevron}>›</Text>
//                     </View>

//                     <View style={{ marginTop: 10, gap: 10 }}>
//                         <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
//                             <Text style={[styles.cardText, { width: 96 }]}>필수/생존</Text>
//                             <Bar bad={10} mid={30} good={60} />
//                         </View>
//                         <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
//                             <Text style={[styles.cardText, { width: 96 }]}>사회/관계</Text>
//                             <Bar bad={75} mid={15} good={10} />
//                         </View>
//                         <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
//                             <Text style={[styles.cardText, { width: 96 }]}>자기실현/계발</Text>
//                             <Bar bad={10} mid={40} good={50} />
//                         </View>
//                     </View>
//                 </TouchableOpacity>

//                 {/* ReportHome.jsx 파일 내 5) 이번달 지출 Worst 3 섹션 수정 */}


//                 {/* 5) 이번달 지출 Worst 3 */}
//                 <TouchableOpacity
//                     style={styles.card}
//                     activeOpacity={0.9}
//                     onPress={() => router.push('/report/regret')}
//                 >
//                     <View style={styles.rowBetween}>
//                         <Text style={styles.cardTitle}>이번달 지출 Worst 3</Text>
//                         <Text style={styles.chevron}>›</Text>
//                     </View>

//                     <View style={{ marginTop: 8 }}>
//                         {/* 1위 */}
//                         <View style={styles.worstBox}>
//                             <View style={styles.worstRowInner}>
//                                 <View style={styles.worstRankBadge}>
//                                     <Text style={styles.worstRankText}>1</Text>
//                                 </View>
//                                 {/* 날짜와 금액, 제목과 내용을 수직으로 배치하기 위해 worstRight 스타일을 재정의 */}
//                                 <View style={styles.worstRightColumn}> 
//                                     {/* 상단: 날짜 - 금액 */}
//                                     <View style={styles.worstTopRow}>
//                                         <Text style={styles.worstDateText}>9월 4일 목요일</Text>
//                                         <Text style={styles.totalAmountSm}>77,500원</Text>
//                                     </View>
//                                     {/* 하단: 제목 - 구매배경 */}
//                                     <View style={styles.worstBottomRow}>
//                                         <View style={{ flex: 1 }}> 
//                                             <Text style={styles.worstTitlePurple} numberOfLines={1}>29cm에서 쇼핑함</Text>
//                                             <Text style={styles.cardText} numberOfLines={1}>구매배경: 스트레스 · 불만족이유: 과소비/불필요</Text>
//                                         </View>
//                                     </View>
//                                 </View>
//                             </View>
//                         </View>

//                         {/* 2위 */}
//                         <View style={styles.worstBox}>
//                             <View style={styles.worstRowInner}>
//                                 <View style={styles.worstRankBadge}>
//                                     <Text style={styles.worstRankText}>2</Text>
//                                 </View>
//                                 {/* 날짜와 금액, 제목과 내용을 수직으로 배치하기 위해 worstRight 스타일을 재정의 */}
//                                 <View style={styles.worstRightColumn}> 
//                                     {/* 상단: 날짜 - 금액 */}
//                                     <View style={styles.worstTopRow}>
//                                         <Text style={styles.worstDateText}>9월 15일 월요일</Text>
//                                         <Text style={styles.totalAmountSm}>25,800원</Text>
//                                     </View>
//                                     {/* 하단: 제목 - 구매배경 */}
//                                     <View style={styles.worstBottomRow}>
//                                         <View style={{ flex: 1 }}> 
//                                             <Text style={styles.worstTitlePurple} numberOfLines={1}>우울해서 디저트 삼</Text>
//                                             <Text style={styles.cardText} numberOfLines={1}>구매배경: 스트레스 · 불만족이유: 가격 불만</Text>
//                                         </View>
//                                     </View>
//                                 </View>
//                             </View>
//                         </View>

//                         {/* 3위 */}
//                         <View style={styles.worstBox}>
//                             <View style={styles.worstRowInner}>
//                                 <View style={styles.worstRankBadge}>
//                                     <Text style={styles.worstRankText}>3</Text>
//                                 </View>
//                                 {/* 날짜와 금액, 제목과 내용을 수직으로 배치하기 위해 worstRight 스타일을 재정의 */}
//                                 <View style={styles.worstRightColumn}> 
//                                     {/* 상단: 날짜 - 금액 */}
//                                     <View style={styles.worstTopRow}>
//                                         <Text style={styles.worstDateText}>9월 4일 목요일</Text>
//                                         <Text style={styles.totalAmountSm}>14,000원</Text>
//                                     </View>
//                                     {/* 하단: 제목 - 구매배경 */}
//                                     <View style={styles.worstBottomRow}>
//                                         <View style={{ flex: 1 }}> 
//                                             <Text style={styles.worstTitlePurple} numberOfLines={1}>핸드크림 삼</Text>
//                                             <Text style={styles.cardText} numberOfLines={1}>구매배경: 스트레스 · 불만족이유: 품질 불만</Text>
//                                         </View>
//                                     </View>
//                                 </View>
//                             </View>
//                         </View>
//                     </View>
//                 </TouchableOpacity>


//                 <View style={{ height: 24 }} />
//             </ScrollView>
//         </SafeAreaView>
//     );
// }
