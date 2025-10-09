import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

const TransactionInput = ({ onClose, onSave }) => {
  const [amount, setAmount] = useState('');
  const [transactionType, setTransactionType] = useState('income');

  const handleNumberPress = (num) => {
    if (amount === '0' && num !== '.') {
      setAmount(num);
    } else {
      setAmount(amount + num);
    }
  };

  const handleOperatorPress = (operator) => {
    if (amount && !amount.endsWith(operator)) {
      setAmount(amount + operator);
    }
  };

  const handleDelete = () => {
    setAmount(amount.slice(0, -1));
  };

  const handleClear = () => {
    setAmount('');
  };

  const handleCalculate = () => {
    try {
      const result = eval(amount);
      setAmount(result.toString());
    } catch (error) {
      setAmount('오류');
    }
  };

  const handleSave = () => {
    if (amount && amount !== '오류') {
      const finalAmount = parseFloat(eval(amount));
      onSave?.(finalAmount, transactionType);
      onClose();
    }
  };

  const formatAmount = (value) => {
    if (!value) return '0';
    try {
      const num = parseFloat(eval(value));
      return num.toLocaleString('ko-KR');
    } catch {
      return value;
    }
  };

  const today = new Date();
  const formattedDate = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

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
        <Text style={styles.dateText}>{formattedDate}</Text>
        <Text style={styles.amountText}>
          {formatAmount(amount)}원
        </Text>
      </View>

      {/* 수입/지출 토글 */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            transactionType === 'income' && styles.toggleBtnActive,
          ]}
          onPress={() => setTransactionType('income')}
        >
          <Text
            style={[
              styles.toggleText,
              transactionType === 'income' && styles.toggleTextActive,
            ]}
          >
            수입
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            transactionType === 'expense' && styles.toggleBtnActive,
          ]}
          onPress={() => setTransactionType('expense')}
        >
          <Text
            style={[
              styles.toggleText,
              transactionType === 'expense' && styles.toggleTextActive,
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
            <Text style={styles.operatorText}>=</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveText}>입력하기</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  dateText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
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
  toggleBtnActive: {
    backgroundColor: '#C4B5FD',
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  toggleTextActive: {
    color: '#5B21B6',
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
});

export default TransactionInput