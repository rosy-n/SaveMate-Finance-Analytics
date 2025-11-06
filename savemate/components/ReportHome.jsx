import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SaveMateStyles as styles } from '../styles/SaveMateStyles';


// 📍 막대 디자인은 스타일에서만 하도록 수정해야함
const Bar = ({ bad = 0, mid = 0, good = 0 }) => (
    <View style={{ flex: 1, height: 14, borderRadius: 8, overflow: 'hidden', flexDirection: 'row', backgroundColor: '#F4F4F6' }}>
        {!!bad && <View style={{ flex: bad, backgroundColor: '#F7C6C6' }} />}
        {!!mid && <View style={{ flex: mid, backgroundColor: '#F6E1AE' }} />}
        {!!good && <View style={{ flex: good, backgroundColor: '#CFF4D2' }} />}
    </View>
);

export default function ReportHome() {
    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.header}>
                <Text style={styles.appTitle}>리포트</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* 1) 기본 리포트 · 9월 */}
                <TouchableOpacity
                    style={styles.card}
                    activeOpacity={0.9}
                    onPress={() => router.push('/report/default')}
                >
                    <View style={styles.rowBetween}>
                        <Text style={styles.cardTitle}>2025년 9월</Text>
                        <Text style={styles.chevron}>›</Text>
                    </View>
                    <View style={{ marginTop: 6 }}>
                        <Text style={styles.cardText}>식비 26% · 카페 23% · 쇼핑 18%</Text>
                        <Text style={styles.cardText}>교통 12% · 여행 20% · 기타 18%</Text>
                    </View>
                </TouchableOpacity>

                {/* 2) 월별 지출 추이 -> 일단 가짜 데이터로 꺾은선 그래프로 만들어야함 */}
                <View style={styles.card}>
                    <View style={styles.rowBetween}>
                        <Text style={styles.cardTitle}>월별 지출 추이</Text>
                    </View>
                    <View style={{ marginTop: 6 }}>
                        <Text style={styles.cardText}>7월 800,000원</Text>
                        <Text style={styles.cardText}>8월 1,000,000원</Text>
                        <Text style={styles.cardText}>9월 670,000원</Text>
                    </View>
                </View>

                {/* 3) 소비 리포트 */}
                <TouchableOpacity
                    style={styles.card}
                    activeOpacity={0.9}
                    onPress={() => router.push('/report/consumption')}
                >
                    <View style={styles.rowBetween}>
                        <Text style={styles.cardTitle}>소비 리포트</Text>
                        <Text style={styles.chevron}>›</Text>
                    </View>
                    <Text style={[styles.cardText, { marginTop: 6 }]}>
                        지난달엔 스트레스가 지출의 큰 원인이었어요. 특히, 식비에 많이 썼고,
                        ‘문화생활’과 ‘간식비’에서도 눈에 띄는 소비가 있었어요
                    </Text>
                </TouchableOpacity>

                {/* 4) 지출 만족도 (폰트/카드 = 홈과 동일) */}
                <TouchableOpacity
                    style={styles.card}
                    activeOpacity={0.9}
                    onPress={() => router.push('/report/satisfaction')}
                >
                    <View style={styles.rowBetween}>
                        <Text style={styles.cardTitle}>지출 만족도</Text>
                        <Text style={styles.chevron}>›</Text>
                    </View>

                    <View style={{ marginTop: 10, gap: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <Text style={[styles.cardText, { width: 96 }]}>쾌락/감정</Text>
                            <Bar bad={80} mid={15} good={5} />
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <Text style={[styles.cardText, { width: 96 }]}>여가</Text>
                            <Bar bad={30} mid={30} good={40} />
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <Text style={[styles.cardText, { width: 96 }]}>자기표현/SNS</Text>
                            <Bar bad={40} mid={45} good={15} />
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <Text style={[styles.cardText, { width: 96 }]}>투자/미래지향</Text>
                            <Bar bad={15} mid={5} good={80} />
                        </View>
                    </View>
                </TouchableOpacity>


                {/* 5) 이번달 지출 Worst 3 */}
                <TouchableOpacity
                    style={styles.card}
                    activeOpacity={0.9}
                    onPress={() => router.push('/report/regret')}
                >
                    <View style={styles.rowBetween}>
                        <Text style={styles.cardTitle}>이번달 지출 Worst 3</Text>
                        <Text style={styles.chevron}>›</Text>
                    </View>

                    <View style={{ marginTop: 8, gap: 12 }}>
                        {/* 1위 */}
                        <View style={styles.worstBox}>
                            <View style={styles.worstRankBadge}>
                                <Text style={styles.worstRankText}>1</Text>
                            </View>
                            {/* 날짜와 금액을 왼쪽으로 이동 (worstDetail보다 먼저 배치) */}
                            <View style={styles.worstLeft}>
                                <Text style={styles.worstDateText}>9월 4일 목요일</Text>
                                <Text style={styles.totalAmountSm}>77,500원</Text>
                            </View>
                            {/* 지출 상세 정보를 오른쪽으로 이동 */}
                            <View style={styles.worstDetail}>
                                <Text style={styles.worstTitlePurple}>29cm에서 쇼핑함</Text>
                                {/* 줄바꿈 적용 */}
                                <Text style={styles.worstMetaText}>구매배경: 스트레스{'\n'}불만족이유: 과소비/불필요</Text>
                            </View>
                        </View>

                        {/* 2위 */}
                        <View style={styles.worstBox}>
                            <View style={styles.worstRankBadge}>
                                <Text style={styles.worstRankText}>2</Text>
                            </View>
                            {/* 날짜와 금액을 왼쪽으로 이동 */}
                            <View style={styles.worstLeft}>
                                <Text style={styles.worstDateText}>9월 15일 월요일</Text>
                                <Text style={styles.totalAmountSm}>25,800원</Text>
                            </View>
                            {/* 지출 상세 정보를 오른쪽으로 이동 */}
                            <View style={styles.worstDetail}>
                                <Text style={styles.worstTitlePurple}>우울해서 디저트 삼</Text>
                                {/* 줄바꿈 적용 */}
                                <Text style={styles.worstMetaText}>구매배경: 스트레스{'\n'}불만족이유: 가격 불만</Text>
                            </View>
                        </View>

                        {/* 3위 */}
                        <View style={styles.worstBox}>
                            <View style={styles.worstRankBadge}>
                                <Text style={styles.worstRankText}>3</Text>
                            </View>
                            {/* 날짜와 금액을 왼쪽으로 이동 */}
                            <View style={styles.worstLeft}>
                                <Text style={styles.worstDateText}>9월 4일 목요일</Text>
                                <Text style={styles.totalAmountSm}>14,000원</Text>
                            </View>
                            {/* 지출 상세 정보를 오른쪽으로 이동 */}
                            <View style={styles.worstDetail}>
                                <Text style={styles.worstTitlePurple}>핸드크림 삼</Text>
                                {/* 줄바꿈 적용 */}
                                <Text style={styles.worstMetaText}>구매배경: 스트레스{'\n'}불만족이유: 품질 불만</Text>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>


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
