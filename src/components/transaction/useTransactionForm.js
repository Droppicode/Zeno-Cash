import { useEffect, useRef, useState } from 'react';
import { CurrencyUtils } from '../../utils/currencyUtils';
import { InvoiceUtils } from '../../utils/InvoiceUtils';
import { HapticFeedback } from '../../utils/haptics';
import { categorizeTransaction } from '../../services/categorizer';
import { DebtsRepository } from '../../services/DebtsRepository';
import { GroupsRepository } from '../../services/GroupsRepository';
import { buildTransactionPayload, mapDebtsToSplitRows } from './transactionFormUtils';

export default function useTransactionForm({
  visible, initialData, isContractEdit, initialSplitMode, accountList, categoryList, loadGroups
}) {
  const [errorMsg, setErrorMsg] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  const [hiddenInvoiceTag, setHiddenInvoiceTag] = useState('');
  const [txType, setTxType] = useState('expense');
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const isManuallyCategoryModified = useRef(false);
  const descriptionRef = useRef(null);
  const noteRef = useRef(null);
  const [txDateObj, setTxDateObj] = useState(new Date());
  const [recurrenceType, setRecurrenceType] = useState('single');
  const [frequencyType, setFrequencyType] = useState('monthly');
  const [frequencyInterval, setFrequencyInterval] = useState('1');
  const [installments, setInstallments] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [interestType, setInterestType] = useState('simple');
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [splitDebts, setSplitDebts] = useState([]);

  useEffect(() => {
    if (visible && initialData) {
      const numStr = (initialData.amount * 100).toFixed(0);
      setAmount(CurrencyUtils.formatCurrency(numStr));
      setDescription(initialData.description);

      const rawNote = initialData.note || '';
      setHiddenInvoiceTag(InvoiceUtils.extractHiddenTags(rawNote));
      setNote(InvoiceUtils.formatDisplayNote(rawNote));

      setTxType(initialData.type);
      setSelectedAccountId(initialData.accountId);
      setSelectedCategoryId(initialData.categoryId || null);
      loadGroups();
      setSelectedGroupIds(initialData.groupIds || []);
      if (!initialData.groupIds) {
        const loadAssignedGroups = isContractEdit
          ? GroupsRepository.getGroupIdsForRecurrence(initialData.id)
          : GroupsRepository.getGroupIdsForTransaction(initialData.id);
        loadAssignedGroups.then(setSelectedGroupIds);
      }

      setTxDateObj(new Date(initialData.date || initialData.startDate || Date.now()));

      if (initialData.frequencyType) {
        setRecurrenceType(initialData.installments ? 'installment' : 'subscription');
        setFrequencyType(initialData.frequencyType);
        setFrequencyInterval(initialData.frequencyInterval?.toString() || '1');
        setInstallments(initialData.installments?.toString() || '');
        setInterestRate(initialData.interestRate?.toString() || '');
        setInterestType(initialData.interestType || 'simple');
      } else {
        setRecurrenceType('single');
        setFrequencyType('monthly');
        setFrequencyInterval('1');
        setInstallments('');
        setInterestRate('');
        setInterestType('simple');
      }

      setIsSplitMode(initialSplitMode);

      if (initialData.id) {
        if (isContractEdit) {
          DebtsRepository.getByRecurrenceId(initialData.id).then(debts => {
            setSplitDebts(mapDebtsToSplitRows(debts, initialData.amount));
          });
        } else {
          DebtsRepository.getByTransactionId(initialData.id).then(debts => {
            setSplitDebts(mapDebtsToSplitRows(debts, initialData.amount));
          });
        }
      } else {
        setSplitDebts([]);
      }

      setErrorMsg('');
    } else if (visible) {
      setAmount('');
      setDescription('');
      setNote('');
      setHiddenInvoiceTag('');
      setTxType('expense');
      setSelectedAccountId(accountList.length > 0 ? accountList[0].id : null);
      setSelectedCategoryId(null);
      setSelectedGroupIds([]);
      loadGroups();
      setErrorMsg('');
      setRecurrenceType('single');
      setFrequencyType('monthly');
      setFrequencyInterval('1');
      setInstallments('');
      setInterestRate('');
      setInterestType('simple');

      setIsSplitMode(initialSplitMode);
      setSplitDebts([]);
      setTxDateObj(new Date());
    }
    isManuallyCategoryModified.current = false;
  }, [visible, initialData, accountList, isContractEdit, loadGroups]);

  useEffect(() => {
    if (visible && !isManuallyCategoryModified.current && !selectedCategoryId && description.length > 2 && categoryList.length > 0) {
      if (!initialData || initialData.isPending === 1) {
        const rawAmount = amount.replace(/\./g, '').replace(',', '.');
        const match = categorizeTransaction(description, parseFloat(rawAmount || 0));
        if (match) {
          const cat = categoryList.find(c => c.name.toLowerCase() === match.categoryName.toLowerCase());
          if (cat) setSelectedCategoryId(cat.id);
        }
      }
    }
  }, [description, visible, initialData, selectedCategoryId, categoryList, amount]);

  const handleAmountChange = text => {
    setAmount(CurrencyUtils.formatCurrency(text));
  };

  const handleSave = onSave => {
    setErrorMsg('');
    const result = buildTransactionPayload({
      amount, description, note, hiddenInvoiceTag, txDateObj, txType, selectedAccountId,
      selectedCategoryId, selectedGroupIds, recurrenceType, frequencyType, frequencyInterval,
      installments, interestRate, interestType, splitDebts
    }, initialData);
    if (result.error) {
      setErrorMsg(result.error);
      return;
    }
    HapticFeedback.success();
    onSave(result.payload);
  };

  return {
    errorMsg, setErrorMsg, amount, setAmount, description, setDescription, note, setNote,
    hiddenInvoiceTag, setHiddenInvoiceTag, txType, setTxType, selectedAccountId,
    setSelectedAccountId, selectedCategoryId, setSelectedCategoryId, selectedGroupIds,
    setSelectedGroupIds, groupModalVisible, setGroupModalVisible, isManuallyCategoryModified,
    descriptionRef, noteRef, txDateObj, setTxDateObj, recurrenceType, setRecurrenceType,
    frequencyType, setFrequencyType, frequencyInterval, setFrequencyInterval, installments,
    setInstallments, interestRate, setInterestRate, interestType, setInterestType, isSplitMode,
    setIsSplitMode, splitDebts, setSplitDebts, handleAmountChange, handleSave
  };
}
