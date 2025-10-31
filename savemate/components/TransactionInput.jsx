import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';

const TransactionInput = ({ onClose, onSave }) => {
  const [expression, setExpression] = useState('');
  const [transactionType, setTransactionType] = useState('income');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleNumberPress = (num) => {
    setExpression(expression + num);
  };

  const handleOperatorPress = (operator) => {
    if (expression === '') return;
    
    const lastChar = expression[expression.length - 1];
    const operators = ['+', '-', '*', '/'];
    
    // 마지막 문자가 연산자면, 새 연산자로 교체
    if (operators.includes(lastChar)) {
      setExpression(expression.slice(0, -1) + operator);
    } else {
      // 수식에 연산자 존재 여부 확인
      const hasOperator = expression.split('').some(char => operators.includes(char));

      if (hasOperator) {
        // 이미 연산자가 있으면 계산하고 새 연산자 추가
        try {
          const result = eval(expression);
          setExpression(result + operator);
        } catch {
          setExpression(expression + operator);
        }
      } else {
        // 연산자가 없으면 그냥 추가
        setExpression(expression + operator);
      }
    }
  };

  const handleClear = () => {
    setExpression('');
  };

  const handleSave = () => {
    if (expression === '') return;

    try {
      const result = eval(expression);
      if (!isNaN(result) && result > 0) {
        // 날짜를 문자열로 변환 (YYYY-MM-DD)
        const iso = new Date(selectedDate).toISOString().slice(0, 10);

        // SaveMateApp이 기대하는 형식에 맞게 전달
        onSave?.(result, transactionType, {
          category: '기타',
          memo: '',
          // 다음 탭(Income/Expense)에서 Date 객체로 바로 쓰도록 Date로 전달
          date: new Date(iso),
        });
      }
    } catch {
      // 계산 오류 시 아무 일도 안 함
    }
  };


  const formatAmount = (value) => {
    if (!value) return '0';
    
    try {
      // 마지막 문자가 연산자인지 확인
      const lastChar = value[value.length - 1];
      const operators = ['+', '-', '*', '/'];
      
      if (operators.includes(lastChar)) {
        // 연산자 앞부분을 계산하고 연산자를 붙임
        const beforeOperator = value.slice(0, -1);
        try {
          const result = eval(beforeOperator);
          return result.toLocaleString('ko-KR') + lastChar;
        } catch {
          return value;
        }
      }
      
      // 연산자가 포함되어 있는지 확인
      const hasOperator = value.split('').some(char => operators.includes(char));
      
      if (hasOperator) {
        // 마지막 연산자 이후의 숫자만 입력 중인 경우
        for (let i = value.length - 1; i >= 0; i--) {
          if (operators.includes(value[i])) {
            const beforeOperator = value.slice(0, i);
            const afterOperator = value.slice(i + 1);
            const operatorChar = value[i];
            
            try {
              const resultBefore = eval(beforeOperator);
              if (afterOperator === '') {
                return resultBefore.toLocaleString('ko-KR') + operatorChar;
              }
              return resultBefore.toLocaleString('ko-KR') + operatorChar + afterOperator;
            } catch {
              return value;
            }
          }
        }
      }
      
      // 연산자가 없으면 현재 값을 그대로 표시
      const result = eval(value);
      return result.toLocaleString('ko-KR');
    } catch {
      return value;
    }
  };

  const formatDisplayDate = (date) => {
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  // 간단한 달력 컴포넌트
  const SimpleDatePicker = () => {
    const today = new Date();
    const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());
    const [viewYear, setViewYear] = useState(selectedDate.getFullYear());

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();

    const handlePrevMonth = () => {
      if (viewMonth === 0) {
        setViewMonth(11);
        setViewYear(viewYear - 1);
      } else {
        setViewMonth(viewMonth - 1);
      }
    };

    const handleNextMonth = () => {
      if (viewMonth === 11) {
        setViewMonth(0);
        setViewYear(viewYear + 1);
      } else {
        setViewMonth(viewMonth + 1);
      }
    };

    const handleDateSelect = (day) => {
      const newDate = new Date(viewYear, viewMonth, day);
      
      // 오늘 날짜와 비교 (시간 제외)
      const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const selectedDateOnly = new Date(viewYear, viewMonth, day);
      
      // 미래 날짜는 선택 불가
      if (selectedDateOnly > todayDateOnly) {
        return;
      }
      
      setSelectedDate(newDate);
      setShowDatePicker(false);
    };

    // 날짜가 미래인지 확인하는 함수
    const isFutureDate = (day) => {
      const checkDate = new Date(viewYear, viewMonth, day);
      const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      return checkDate > todayDateOnly;
    };

    return (
      <View style={styles.datePickerContainer}>
        <View style={styles.datePickerHeader}>
          <TouchableOpacity onPress={handlePrevMonth}>
            <Text style={styles.datePickerArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.datePickerTitle}>
            {viewYear}년 {viewMonth + 1}월
          </Text>
          <TouchableOpacity onPress={handleNextMonth}>
            <Text style={styles.datePickerArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.weekRow}>
          {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
            <Text key={day} style={styles.weekText}>
              {day}
            </Text>
          ))}
        </View>

        <View style={styles.datesContainer}>
          {Array.from({ length: firstDay }).map((_, index) => (
            <View key={`empty-${index}`} style={styles.dateCell} />
          ))}

          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const isSelected =
              day === selectedDate.getDate() &&
              viewMonth === selectedDate.getMonth() &&
              viewYear === selectedDate.getFullYear();
            const isToday =
              day === today.getDate() &&
              viewMonth === today.getMonth() &&
              viewYear === today.getFullYear();
            const isFuture = isFutureDate(day);

            return (
              <TouchableOpacity
                key={day}
                style={styles.dateCell}
                onPress={() => handleDateSelect(day)}
                disabled={isFuture}
              >
                <View
                  style={[
                    styles.dateButton,
                    isSelected && styles.dateButtonSelected,
                    isToday && !isSelected && styles.dateButtonToday,
                    isFuture && styles.dateButtonDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.calendarDateText,
                      isSelected && styles.dateTextSelected,
                      isToday && !isSelected && styles.dateTextToday,
                      isFuture && styles.dateTextDisabled,
                    ]}
                  >
                    {day}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>금액 입력</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* 금액 표시 영역 */}
      <View style={styles.amountSection}>
        <TouchableOpacity onPress={() => setShowDatePicker(true)}>
          <Text style={styles.selectedDateText}>{formatDisplayDate(selectedDate)}</Text>
        </TouchableOpacity>
        <Text style={styles.amountText}>{formatAmount(expression)}원</Text>
      </View>

      {/* 수입/지출 토글 */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            transactionType === 'income' && styles.toggleBtnIncomeActive,
          ]}
          onPress={() => setTransactionType('income')}
        >
          <Text
            style={[
              styles.toggleText,
              transactionType === 'income' && styles.toggleTextIncomeActive,
            ]}
          >
            수입
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            transactionType === 'expense' && styles.toggleBtnExpenseActive,
          ]}
          onPress={() => setTransactionType('expense')}
        >
          <Text
            style={[
              styles.toggleText,
              transactionType === 'expense' && styles.toggleTextExpenseActive,
            ]}
          >
            지출
          </Text>
        </TouchableOpacity>
      </View>

      {/* 계산기 키패드 */}
      <View style={styles.keypad}>
        {/* 첫 번째 줄 */}
        <View style={styles.keypadRow}>
          <TouchableOpacity style={styles.numberBtn} onPress={() => handleNumberPress('7')}>
            <Text style={styles.numberText}>7</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.numberBtn} onPress={() => handleNumberPress('8')}>
            <Text style={styles.numberText}>8</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.numberBtn} onPress={() => handleNumberPress('9')}>
            <Text style={styles.numberText}>9</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.operatorBtn} onPress={() => handleOperatorPress('/')}>
            <Text style={styles.operatorText}>÷</Text>
          </TouchableOpacity>
        </View>

        {/* 두 번째 줄 */}
        <View style={styles.keypadRow}>
          <TouchableOpacity style={styles.numberBtn} onPress={() => handleNumberPress('4')}>
            <Text style={styles.numberText}>4</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.numberBtn} onPress={() => handleNumberPress('5')}>
            <Text style={styles.numberText}>5</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.numberBtn} onPress={() => handleNumberPress('6')}>
            <Text style={styles.numberText}>6</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.operatorBtn} onPress={() => handleOperatorPress('*')}>
            <Text style={styles.operatorText}>×</Text>
          </TouchableOpacity>
        </View>

        {/* 세 번째 줄 */}
        <View style={styles.keypadRow}>
          <TouchableOpacity style={styles.numberBtn} onPress={() => handleNumberPress('1')}>
            <Text style={styles.numberText}>1</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.numberBtn} onPress={() => handleNumberPress('2')}>
            <Text style={styles.numberText}>2</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.numberBtn} onPress={() => handleNumberPress('3')}>
            <Text style={styles.numberText}>3</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.operatorBtn} onPress={() => handleOperatorPress('-')}>
            <Text style={styles.operatorText}>−</Text>
          </TouchableOpacity>
        </View>

        {/* 네 번째 줄 */}
        <View style={styles.keypadRow}>
          <TouchableOpacity style={styles.numberBtn} onPress={() => handleNumberPress('00')}>
            <Text style={styles.numberText}>00</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.numberBtn} onPress={() => handleNumberPress('0')}>
            <Text style={styles.numberText}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.numberBtn} onPress={() => handleNumberPress('.')}>
            <Text style={styles.numberText}>.</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.operatorBtn} onPress={() => handleOperatorPress('+')}>
            <Text style={styles.operatorText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* 다섯 번째 줄 */}
        <View style={styles.keypadRow}>
          <TouchableOpacity style={styles.operatorBtn} onPress={handleClear}>
            <Text style={styles.operatorText}>AC</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveText}>입력하기</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 날짜 선택 모달 */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDatePicker(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <SimpleDatePicker />
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.modalCloseText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    padding: 4,
  },
  backText: {
    fontSize: 28,
    color: '#7C3AED',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#7C3AED',
  },
  amountSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#F9FAFB',
  },
  selectedDateText: {
    fontSize: 14,
    color: '#7C3AED',
    marginBottom: 8,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  amountText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#111827',
  },
  toggleContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  toggleBtnIncomeActive: {
    backgroundColor: '#A7F3D0',
  },
  toggleBtnExpenseActive: {
    backgroundColor: '#FBCFE8',
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  toggleTextIncomeActive: {
    color: '#065F46',
  },
  toggleTextExpenseActive: {
    color: '#9F1239',
  },
  keypad: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 16,
    flex: 1,
  },
  numberBtn: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    aspectRatio: 1,
  },
  numberText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#111827',
  },
  operatorBtn: {
    flex: 1,
    backgroundColor: '#DDD6FE',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    aspectRatio: 1,
  },
  operatorText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#7C3AED',
  },
  saveBtn: {
    flex: 3,
    backgroundColor: '#DDD6FE',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#7C3AED',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '85%',
    maxWidth: 400,
  },
  datePickerContainer: {
    width: '100%',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  datePickerArrow: {
    fontSize: 28,
    color: '#7C3AED',
    paddingHorizontal: 10,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  weekText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  datesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dateCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 2,
  },
  dateButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  dateButtonSelected: {
    backgroundColor: '#7C3AED',
  },
  dateButtonToday: {
    backgroundColor: '#E0E7FF',
  },
  dateButtonDisabled: {
    backgroundColor: 'transparent',
  },
  calendarDateText: {
    fontSize: 14,
    color: '#111827',
  },
  dateTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dateTextToday: {
    color: '#4338CA',
    fontWeight: '600',
  },
  dateTextDisabled: {
    color: '#D1D5DB',
  },
  modalCloseBtn: {
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
});

export default TransactionInput;