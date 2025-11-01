// server/routes/transactions.js
const express = require('express');
const router = express.Router();
const { db, admin } = require('../firebaseAdmin');

/**
 * POST /api/transactions
 * Body 예:
 * {
 *   uid: "2314513",
 *   type: "income" | "expense",
 *   amount: 30000,
 *   category: "용돈" | "식비" | ... (선택),
 *   memo: "텍스트 메모" (선택),
 *   date: "YYYY-MM-DD" | ISO 문자열,
 *   // 수입 상세 (수입 탭에서 입력)
 *   incomeDetail: {
 *     incomeSource: "월급|용돈|기타",
 *     memo: "수입 메모"
 *   },
 *   // 지출 상세 (지출 탭에서 입력)
 *   expenseDetail: {
 *     paymentMethod: "현금|신용카드|체크카드",
 *     spendingCategory: "식비|카페/간식|...",
 *     spendingItem: "지출 메모(또는 품목명)",
 *     spendingBackground: "필수/생존|사회/관계|..."
 *   }
 * }
 *
 * 저장 경로:
 *   users/{uid}/transactions/{tid} (기본 거래)
 *   └─ incomeDetails/{detailId}  (type === 'income'일 때)
 *   └─ expenseDetails/{detailId} (type === 'expense'일 때)
 */
router.post('/', async (req, res) => {
  try {
    const {
      uid,
      type,
      amount,
      category,
      memo,
      date,
      incomeDetail,
      expenseDetail,
    } = req.body;

    // ------------ 기본 검증 ------------
    if (!uid || amount == null || !type || !date) {
      return res.status(400).json({
        ok: false,
        error: 'missing fields (uid, amount, type, date)',
      });
    }
    if (!['income', 'expense'].includes(String(type))) {
      return res.status(400).json({ ok: false, error: 'type must be income|expense' });
    }
    const _amount = Number(amount);
    if (!Number.isFinite(_amount)) {
      return res.status(400).json({ ok: false, error: 'amount must be a number' });
    }

    // ------------ 날짜 파싱 ------------
    // "YYYY-MM-DD" 또는 ISO 문자열 모두 허용
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      return res.status(400).json({ ok: false, error: 'invalid date format' });
    }
    const ts = admin.firestore.Timestamp.fromDate(parsed);
    const nowServer = admin.firestore.FieldValue.serverTimestamp();

    // ------------ 1) 기본 거래 저장 ------------
    const baseDoc = {
      amount: _amount,
      type,                          // 'income' | 'expense'
      category: category ?? null,    // 수입은 수단, 지출은 소비 품목 등으로 활용 가능
      memo: memo ?? null,            // 상위 거래 메모(선택)
      date: ts,                      // 정렬을 위한 Timestamp
      createdAt: nowServer,
      updatedAt: nowServer,
    };

    const txnRef = await db
      .collection('users')
      .doc(uid)
      .collection('transactions')
      .add(baseDoc);

    // ------------ 2) 상세(수입/지출) 하위 컬렉션 저장 ------------
    if (type === 'income' && incomeDetail) {
      const { incomeSource, memo: incomeMemo } = incomeDetail;
      await txnRef.collection('incomeDetails').add({
        incomeSource: incomeSource ?? category ?? '기타',
        memo: incomeMemo ?? null,
        createdAt: nowServer,
      });
    }

    if (type === 'expense' && expenseDetail) {
      const {
        paymentMethod,
        spendingCategory,
        spendingItem,
        spendingBackground,
      } = expenseDetail;

      await txnRef.collection('expenseDetails').add({
        paymentMethod: paymentMethod ?? null,     // 현금/신용카드/체크카드
        spendingCategory: spendingCategory ?? category ?? null, // 소비 품목
        spendingItem: spendingItem ?? memo ?? null,             // 품목명/메모
        spendingBackground: spendingBackground ?? null,         // 소비 배경
        createdAt: nowServer,
      });
    }

    return res.status(201).json({ ok: true, id: txnRef.id });
  } catch (e) {
    console.error('[Firestore POST Error]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/transactions?uid=...&limit=20&expand=true
 * 기본 거래 목록을 반환하고, expand=true면 각 거래의 첫 상세(있다면)를 함께 반환
 */
router.get('/', async (req, res) => {
  try {
    const { uid, limit = 20, expand } = req.query;
    if (!uid) return res.status(400).json({ ok: false, error: 'uid is required' });

    const snap = await db
      .collection('users')
      .doc(uid)
      .collection('transactions')
      .orderBy('date', 'desc')
      .limit(Number(limit))
      .get();

    const items = await Promise.all(
      snap.docs.map(async (d) => {
        const data = d.data();
        const base = {
          id: d.id,
          ...data,
          date:
            data.date && data.date.toDate
              ? data.date.toDate().toISOString().slice(0, 10)
              : data.date,
          createdAt:
            data.createdAt && data.createdAt.toDate
              ? data.createdAt.toDate().toISOString()
              : null,
          updatedAt:
            data.updatedAt && data.updatedAt.toDate
              ? data.updatedAt.toDate().toISOString()
              : null,
        };

        if (String(expand) === 'true') {
          // 수입 상세 1건
          const incomeSnap = await d.ref
            .collection('incomeDetails')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();
          const incomeDetail =
            incomeSnap.empty ? null : { id: incomeSnap.docs[0].id, ...incomeSnap.docs[0].data() };

          // 지출 상세 1건
          const expenseSnap = await d.ref
            .collection('expenseDetails')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();
          const expenseDetail =
            expenseSnap.empty ? null : { id: expenseSnap.docs[0].id, ...expenseSnap.docs[0].data() };

          return { ...base, incomeDetail, expenseDetail };
        }

        return base;
      })
    );

    res.json({ ok: true, count: items.length, items });
  } catch (e) {
    console.error('[Firestore GET Error]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
