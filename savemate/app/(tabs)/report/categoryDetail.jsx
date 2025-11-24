// app/(tabs)/report/categoryDetail.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApi } from '@/hooks/useApi';
import { ReportStyles as styles } from '@/components/styles/ReportStyles';

const formatKRW = (n) => `${Number(n || 0).toLocaleString('ko-KR')}원`;

const toDateObj = (v) => {
  if (!v) return null;
  if (v?.toDate) return v.toDate(); // Firestore Timestamp
  if (v?._seconds) return new Date(v._seconds * 1000);
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

const fmtDate = (v) => {
  const d = toDateObj(v);
  if (!d) return '';
  const wd = ['일','월','화','수','목','금','토'][d.getDay()];
  return `${d.getMonth()+1}월 ${d.getDate()}일 ${wd}요일`;
};

export default function CategoryDetail() {
  const { category, year, month } = useLocalSearchParams();
  const api = useApi();
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [error, setError] = useState(null);
  const uid = process.env.EXPO_PUBLIC_UID || '2312736';

  const now = new Date();
  const y = Number(year) || now.getFullYear();
  const m = Number(month) || (now.getMonth() + 1);
  const catName = String(category || '기타');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // 당월 전체 거래 로드
        const path = `/api/transactions?uid=${uid}&year=${y}&month=${m}&expand=true`;
        const res = await api.get(path);
        const items = Array.isArray(res?.items) ? res.items : [];

        // 지출(expense)만 + 카테고리 매칭(상위/하위 둘 다 대응)
        const filtered = items.filter((it) => {
          const type = String(it?.type || '').toLowerCase();
          if (type !== 'expense') return false;

          const cat =
            it.spendingCategory ||
            it.category ||
            it.expenseDetail?.spendingCategory ||
            it.expenseDetails?.spendingCategory ||
            '기타';

          return String(cat) === catName;
        });

        // 최신순 정렬
        filtered.sort((a, b) => {
          const da = toDateObj(a.date || a.occurredAt || a.createdAt) || new Date(0);
          const db = toDateObj(b.date || b.occurredAt || b.createdAt) || new Date(0);
          return db - da;
        });

        mounted && setList(filtered);
      } catch (e) {
        mounted && setList([]);
        mounted && setError(e?.message || '데이터를 불러오지 못했습니다.');
      } finally {
        mounted && setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [api, uid, y, m, catName]);

  const total = useMemo(
    () => list.reduce((s, it) => s + Number(it.amount || it.price || it.cost || 0), 0),
    [list]
  );

  return (
    <SafeAreaView style={styles.screen}>
      {/* 헤더 + 뒤로가기 */}
      <View style={[styles.header, { flexDirection: 'row', alignItems: 'center' }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 8, paddingVertical: 4 }}>
          <Text style={{ fontSize: 22 }}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.appTitle}>{catName}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* 총액 카드 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{y}년 {m}월 {catName} 총 금액</Text>

          {loading ? (
            <View style={styles.center}><ActivityIndicator /></View>
          ) : error ? (
            <Text style={[styles.cardText, { marginTop: 8, color: '#B43A22' }]}>{error}</Text>
          ) : (
            <>
              <Text style={[styles.totalAmount, { marginTop: 6 }]}>{formatKRW(total)}</Text>
              <Text style={[styles.caption, { marginTop: 4 }]}>총 {list.length}회</Text>
            </>
          )}
        </View>

        {/* 내역 카드 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>지출 내역</Text>

          {loading ? (
            <View style={styles.center}><ActivityIndicator /></View>
          ) : list.length === 0 ? (
            <Text style={[styles.cardText,{marginTop:8}]}>해당 카테고리 지출이 없어요.</Text>
          ) : (
            <View style={{ marginTop: 8 }}>
              {list.map((it) => {
                const dateText = fmtDate(it.date || it.occurredAt || it.createdAt);
                const amount = Number(it.amount || it.price || 0);

                const itemName =
                  it.spendingItem ||
                  it.memo ||
                  it.expenseDetail?.spendingItem ||
                  it.expenseDetails?.spendingItem ||
                  catName;

                const pay =
                  it.paymentMethod ||
                  it.payment ||
                  it.expenseDetail?.paymentMethod ||
                  it.expenseDetails?.paymentMethod ||
                  '결제수단 없음';

                return (
                  <View key={it.id || `${itemName}-${it.createdAt}`} style={styles.itemRow}>
                    <Text style={styles.caption}>{dateText}</Text>
                    <View style={{ flexDirection:'row', alignItems:'center', marginTop:2 }}>
                      <Text style={styles.totalAmountSm}>{formatKRW(amount)}</Text>
                      <Text style={[styles.cardText,{ marginLeft: 8 }]} numberOfLines={1}>
                        {itemName}
                      </Text>
                    </View>
                    <Text style={[styles.caption, { marginTop: 2 }]}>{pay}</Text>
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
