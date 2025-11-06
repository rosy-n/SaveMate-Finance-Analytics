// server/routes/transactions.js
const express = require('express');
const router = express.Router();
const { db, admin } = require('../firebaseAdmin');

/** ──────────────────────────────────────────────────────────────
 * 유틸
 *  - 월 구간: [start, end)  (다음달 1일 00:00 미만까지)
 *  - iso10: Date/Timestamp → 'YYYY-MM-DD'
 * ────────────────────────────────────────────────────────────── */
const getMonthRange = (year, month) => {
  const y = Number(year);
  const m = Number(month); // 1~12
  const startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  const endDate   = new Date(Date.UTC(y, m,     1, 0, 0, 0, 0)); // 다음달 1일
  return {
    start: admin.firestore.Timestamp.fromDate(startDate),
    end:   admin.firestore.Timestamp.fromDate(endDate),
  };
};
const iso10 = (d) => new Date(d).toISOString().slice(0, 10);

/** ──────────────────────────────────────────────────────────────
 * POST /api/transactions
 * Body:
 * {
 *   uid: "2314513",
 *   type: "income" | "expense",
 *   amount: 30000,
 *   category?: "식비|용돈|...",
 *   memo?: "메모",
 *   date: "YYYY-MM-DD" | ISO string,
 *   incomeDetail?: { incomeSource?: "월급|용돈|기타", memo?: "..." },
 *   expenseDetail?: { paymentMethod?: "현금|신용카드|체크카드", spendingCategory?: "...", spendingItem?: "...", spendingBackground?: "..." }
 * }
 *
 * 저장 위치:
 *   users/{uid}/transactions/{tid}
 *     ├─ incomeDetails/{detailId}   (type === 'income')
 *     └─ expenseDetails/{detailId}  (type === 'expense')
 * ────────────────────────────────────────────────────────────── */
router.post('/', async (req, res) => {
  try {
    const {
      uid, type, amount, category, memo, date,
      incomeDetail, expenseDetail,
    } = req.body;

    // ---- 검증 ----
    if (!uid || amount == null || !type || !date) {
      return res.status(400).json({ ok: false, error: 'missing fields (uid, amount, type, date)' });
    }
    if (!['income', 'expense'].includes(String(type))) {
      return res.status(400).json({ ok: false, error: 'type must be income|expense' });
    }
    const _amount = Number(amount);
    if (!Number.isFinite(_amount)) {
      return res.status(400).json({ ok: false, error: 'amount must be a number' });
    }

    // ---- 날짜 ----
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      return res.status(400).json({ ok: false, error: 'invalid date format' });
    }
    const ts = admin.firestore.Timestamp.fromDate(parsed);
    const nowServer = admin.firestore.FieldValue.serverTimestamp();

    // ---- 1) 기본 거래 저장 ----
    const baseDoc = {
      amount: _amount,
      type,                           // 'income' | 'expense'
      category: category ?? null,
      memo: memo ?? null,
      date: ts,                       // 정렬을 위한 Timestamp
      createdAt: nowServer,
      updatedAt: nowServer,
    };

    const txnRef = await db
      .collection('users')
      .doc(uid)
      .collection('transactions')
      .add(baseDoc);

    // ---- 2) 상세 하위 컬렉션 ----
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
        paymentMethod, spendingCategory, spendingItem, spendingBackground,
      } = expenseDetail;
      await txnRef.collection('expenseDetails').add({
        paymentMethod: paymentMethod ?? null,                 // 현금/신용/체크
        spendingCategory: spendingCategory ?? category ?? null,
        spendingItem: spendingItem ?? memo ?? null,
        spendingBackground: spendingBackground ?? null,
        createdAt: nowServer,
      });
    }

    return res.status(201).json({ ok: true, id: txnRef.id });
  } catch (e) {
    console.error('[Firestore POST Error]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/** ──────────────────────────────────────────────────────────────
 * GET /api/transactions
 * 쿼리:
 *   uid=필수
 *   year=선택(월 조회 시 필수)
 *   month=선택(1~12, 월 조회 시 필수)
 *   limit=선택(기본 20) — year/month 없을 때만 사용
 *   expand=true|false (기본 false) — 각 거래의 상세 1건 포함
 *
 * 예:
 *   /api/transactions?uid=2314513&year=2025&month=11&expand=true
 *   /api/transactions?uid=2314513&limit=50
 * ────────────────────────────────────────────────────────────── */
router.get('/', async (req, res) => {
  try {
    const { uid, year, month, expand } = req.query;
    if (!uid) {
      return res.status(400).json({ ok: false, error: 'uid is required' });    
    }

    // getMonthRange는 너 코드 상단에 이미 있음(UTC 기준 Timestamp 반환)
    const { start, end } = (year && month)
      ? getMonthRange(year, month)
      : { start: null, end: null };

    const result = {
      summary: { income: 0, expense: 0, count: 0 },
      items: [],
    };

    const txColRef = db.collection('users').doc(uid).collection('transactions');
    const txSnap = await txColRef.get();
    if (txSnap.empty) return res.json(result);

    let expenseSum = 0;
    const items = [];

    // createdAt이 월 범위에 들어오는지 체크
    const isInRange = (createdAt) => {
      try {
        if (!start || !end) return true; // year/month 없으면 전체 허용
        let d;
        if (createdAt?.toDate) d = createdAt.toDate();
        else if (createdAt?._seconds) d = new Date(createdAt._seconds * 1000);
        else if (typeof createdAt === 'string' || typeof createdAt === 'number') d = new Date(createdAt);
        else return false;
        // getMonthRange가 admin.firestore.Timestamp를 반환하므로 toDate() 비교
        return d >= start.toDate() && d < end.toDate();
      } catch { return false; }
    };

    // 모든 transactions 문서를 순회하면서 expenseDetails를 모음
    await Promise.all(
      txSnap.docs.map(async (txDoc) => {
        // 1️⃣ transaction 문서 자체도 포함시킴
        const base = txDoc.data() || {};
        if (base.type === 'expense' && isInRange(base.date)) {
          const amount = Number(base.amount ?? 0);
          const category = base.category || '기타';
          const memo = base.memo || '';
          const paymentMethod = base.paymentMethod || '';

          expenseSum += amount;
          result.summary.count += 1;

          if (String(expand).toLowerCase() === 'true') {
            items.push({
              id: txDoc.id,
              amount,
              spendingCategory: category,
              spendingItem: memo,
              paymentMethod,
              createdAt: base.createdAt ?? null,
            });
          }
        }
      })
    );

    result.summary.expense = expenseSum;
    result.items = items;

    return res.json(result);
  } catch (e) {
    console.error('[Firestore GET Error]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
