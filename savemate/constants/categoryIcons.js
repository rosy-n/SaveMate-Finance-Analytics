// constants/categoryIcons.js

export const CATEGORY_ICONS = {
  '식비': '🍚',
  '카페/간식': '☕',
  '생활(마트 잡화)': '🛒',
  '술/유흥': '🍺',
  '패션/쇼핑': '👗',
  '뷰티/미용': '💄',
  '문화/여가': '🎬',
  '의료/건강': '💊',
  '공과금(주거/세금/통신/보험)': '🏠',
  '교통/자동차': '🚗',
  '여행/숙박': '✈️',
  '교육': '📚',
  '경조/선물/후원': '🎁',
  '카드대금(후불)': '💳',
  '투자/저축': '💰',
  '기타': '📌',
  '수입': '💵',
};

// 카테고리 이름으로 아이콘 가져오기 (없으면 기본 아이콘)
export const getCategoryIcon = (category) => {
  return CATEGORY_ICONS[category] || CATEGORY_ICONS['기타'];
};