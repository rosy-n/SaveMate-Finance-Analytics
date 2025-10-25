// app/test-firestore.jsx
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, FlatList } from 'react-native';
import { db } from '../firebase';
import {
  addDoc, collection, serverTimestamp,
  query, where, orderBy, limit, onSnapshot
} from 'firebase/firestore';

const USER_ID = '54NH31WcvMiVLdKyprik';

function TestFirestore() {
  const [amount, setAmount] = useState('12500');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', USER_ID),
      orderBy('occurredAt', 'desc'),
      limit(10)
    );
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          category: data.category,
          amount: data.amount,
          occurredAt: data.occurredAt?.toDate?.() ?? new Date(),
        };
      });
      setItems(rows);
    });
    return () => unsub();
  }, []);

  const addExpense = async () => {
    setLoading(true);
    await addDoc(collection(db, 'transactions'), {
      userId: USER_ID,
      type: 'expense',
      amount: Number(amount),
      category: '식비',
      memo: '테스트 입력',
      occurredAt: new Date(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setLoading(false);
  };

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Firestore Test</Text>
      <Text>금액</Text>
      <TextInput
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        style={{ borderWidth: 1, borderColor: '#ccc', padding: 8, borderRadius: 8 }}
      />
      <Button title={loading ? '저장중...' : '지출 추가'} onPress={addExpense} />
      <Text style={{ marginTop: 16, fontWeight: '600' }}>최근 10건</Text>
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        renderItem={({ item }) => (
          <View style={{ borderWidth: 1, borderColor: '#eee', padding: 12, borderRadius: 8 }}>
            <Text>{item.category} · {item.amount?.toLocaleString()}원</Text>
            <Text>{item.occurredAt.toLocaleString()}</Text>
          </View>
        )}
      />
    </View>
  );
}

export default TestFirestore;
