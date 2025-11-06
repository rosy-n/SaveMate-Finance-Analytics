// app/(tabs)/report/categoryDetail.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApi } from '../../../hooks/useApi';
import { ReportStyles as styles } from '../../../components/styles/ReportStyles';

const formatKRW = (n) => `${Number(n || 0).toLocaleString('ko-KR')}원`;
const fmtDate = (createdAt) => {
  try {
    let d;
    if (createdAt?._seconds) d = new Date(createdAt._seconds * 1000);
    else if (typeof createdAt === 'string' || typeof createdAt === 'number') d = new Date(createdAt);
    else d = new Date();
    const wd = ['일','월','화','수','목','금','토'][d.getDay()];
    return `${d.getMonth()+1}월 ${d.getDate()}일 ${wd}요일`;
  } catch { return ''; }
};

export default function CategoryDetail() {
  const { category, year, month } = useLocalSearchParams();
  const api = useApi();
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const uid = process.env.EXPO_PUBLIC_UID || '2312736';

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const path = `/api/transactions?uid=${uid}&year=${year}&month=${month}&expand=true`;
        const res = await api.get(path);
        const items = Array.isArray(res?.items) ? res.items : [];
        mounted && setList(items.filter(it => (it.spendingCategory || '기타') === String(category)));
      } catch {
        mounted && setList([]);
      } finally {
        mounted && setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [api, uid, year, month, category]);

  const total = useMemo(
    () => list.reduce((s, it) => s + Number(it.amount || it.price || it.cost || 0), 0),
    [list]
  );

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}><Text style={styles.appTitle}>{String(category)} 카테고리</Text></View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{month}월 {String(category)} 총 금액</Text>
          <Text style={[styles.totalAmount, { marginTop: 6 }]}>{formatKRW(total)}</Text>
          <Text style={[styles.caption, { marginTop: 4 }]}>총 {list.length}회</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>지출 내역</Text>
          {loading ? (
            <View style={styles.center}><ActivityIndicator /></View>
          ) : list.length === 0 ? (
            <Text style={[styles.cardText,{marginTop:8}]}>해당 카테고리 지출이 없어요.</Text>
          ) : (
            <View style={{ marginTop: 8 }}>
              {list.map((it) => (
                <View key={it.id || `${it.spendingItem}-${it.createdAt}`} style={styles.itemRow}>
                  <Text style={styles.caption}>{fmtDate(it.createdAt)}</Text>
                  <View style={{ flexDirection:'row', alignItems:'center', marginTop:2 }}>
                    <Text style={styles.totalAmountSm}>{formatKRW(it.amount || it.price || 0)}</Text>
                    <Text style={[styles.cardText,{ marginLeft: 8 }]} numberOfLines={1}>
                      {it.spendingItem || ''}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
