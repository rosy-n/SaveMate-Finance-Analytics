// server/routes/transactions.js
const express = require('express');
const router = express.Router();
const { db, admin } = require('../firebaseAdmin');
const { Timestamp } = require('firebase-admin/firestore');
/** ──────────────────────────────────────────────────────────────
 * 유틸
 *  - 월 구간: [start, end)  (다음달 1일 00:00 미만까지)
 *  - iso10: Date/Timestamp → 'YYYY-MM-DD'
 * ────────────────────────────────────────────────────────────── */
const getMonthRange = (year, month) => {
  const y = Number(year);
  const m = Number(month); // 1~12
  const startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0)); // 다음달 1일
  return {
    start: admin.firestore.Timestamp.fromDate(startDate),
    end: admin.firestore.Timestamp.fromDate(endDate),
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
      isRated: false,
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
    // 1) 쿼리 파라미터에 isRated 추가
    const { uid, year, month, expand, isRated, type } = req.query; // type 추가

    if (!uid) {
      return res.status(400).json({ ok: false, error: 'uid is required' });
    }

    const wantExpand = String(expand).toLowerCase() === 'true';
    const txColRef = db.collection('users').doc(uid).collection('transactions');
    
    // 2) 새로운 미평가 플래그 확인
    const wantUnratedExpenses = 
        String(isRated).toLowerCase() === 'false' && 
        String(type).toLowerCase() === 'expense';
        
    let q;

    // 1) 쿼리 구성: 월 범위, 미평가, 또는 최신순
    if (year && month) {
      // 월별 조회: 기존 로직 유지 (날짜 범위)
      const { start, end } = getMonthRange(year, month);
      q = txColRef
        .where('date', '>=', start)
        .where('date', '<', end)
        .orderBy('date', 'desc');
    } else if (wantUnratedExpenses) {
      // ⭐️⭐️⭐️ 2단계 해결: 모든 미평가 지출을 찾기 위한 최적화 쿼리 ⭐️⭐️⭐️
      // orderBy에 필터링된 필드를 먼저 넣어야 함 (Firestore 규칙)
      q = txColRef
        .where('type', '==', 'expense') // 지출만
        .where('isRated', '==', false) // 미평가만
        .orderBy('date', 'desc'); // 최신순 정렬

      // ⚠️ 안전 장치: 전체 거래를 스캔하지 않도록 서버에서 하드 리밋(예: 500)을 적용할 수 있으나,
      // 여기서는 클라이언트가 50개만 보여주므로, 데이터베이스 로직이 이를 처리하도록 제한 없이 보냅니다.
      // (단, 이 쿼리를 위해 새로운 복합 인덱스 {type, isRated, date}가 필요할 수 있습니다.)
      
    } else {
      // 월 범위나 isRated 필터가 없을 때는 기존 최신순 + limit 로직 유지
      const limitN = Math.max(1, Math.min(Number(req.query.limit) || 20, 200));
      q = txColRef.orderBy('date', 'desc').limit(limitN);
    }
    
    // 3) 쿼리 실행: ❗️여기서 읽힌 문서만이 read에 카운트됩니다
    const snap = await q.get();

    // 결과 골격
    const result = {
      summary: { income: 0, expense: 0, count: 0 },
      items: [],
    };

    if (snap.empty) {
      return res.json(result);
    }

    // 3) 쿼리로 이미 'date' 범위가 잘려 있으므로 추가 필터 불필요
    let incomeSum = 0;
    let expenseSum = 0;
    const items = [];

    // 필요 시에만 상세를 읽도록 옵션 처리 (하위 컬렉션은 기본 미조회)
    // ⚠️ 하위 컬렉션까지 매 항목마다 읽으면 read 폭증 → 정말 필요할 때만 on-demand 권장
    for (const doc of snap.docs) {
      const base = doc.data() || {};
      const type = String(base.type || '').toLowerCase();
      const amount = Number(base.amount ?? 0);
      if (type === 'income') incomeSum += amount;
      else if (type === 'expense') expenseSum += amount;

      result.summary.count += 1;

      if (wantExpand) {
        const d = base.date?.toDate ? base.date.toDate() : new Date(base.date);
        items.push({
          id: doc.id,
          type,
          amount,
          category: base.category ?? (type === 'income' ? '수입' : '지출'),
          memo: base.memo ?? '',
          date: d,
          day: d.getDate?.() ?? null,
          createdAt: base.createdAt ?? null,
          isRated: base.isRated === true, // ⭐️ 이 줄 추가
          // ❗️하위 컬렉션은 여기서 즉시 읽지 않습니다 (read 비용 급증)
          // ...
        });
      }
    }

    result.summary.income = incomeSum;
    result.summary.expense = expenseSum;
    result.items = items;

    return res.json(result);
  } catch (e) {
    console.error('[Firestore GET Error]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
});


module.exports = router;
