import React, { createContext, useState, useEffect } from 'react';
import { LLMService } from '../services/llmService';
import { Logger } from '../utils/logger';

export const ExtractionContext = createContext();

export const ExtractionProvider = ({ children }) => {
  const [status, setStatus] = useState('idle'); // idle, uploading, processing, success, error
  const [progressMessage, setProgressMessage] = useState('');
  const [extractedData, setExtractedData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const resetExtraction = () => {
    setStatus('idle');
    setProgressMessage('');
    setExtractedData(null);
    setErrorMessage('');
  };

  const startExtraction = async (doc, provider, model, apiKey, categoriesStr, userContext = '') => {
    if (status === 'processing' || status === 'uploading') return;
    
    resetExtraction();
    
    // Simular upload
    setStatus('uploading');
    setProgressMessage('Lendo documento...');
    
    // Pequeno delay para a UI reagir se for muito rápido
    await new Promise(resolve => setTimeout(resolve, 500));

    setStatus('processing');
    setProgressMessage('Enviando para a Inteligência Artificial...');

    // Iniciar loop de mensagens falsas para dar feedback contínuo
    let isExtracting = true;
    const feedbackMessages = [
      'Analisando páginas do arquivo...',
      'Procurando por transações financeiras...',
      'Categorizando gastos e receitas...',
      'Quase pronto...'
    ];
    
    let msgIndex = 0;
    const progressInterval = setInterval(() => {
      if (!isExtracting) {
        clearInterval(progressInterval);
        return;
      }
      setProgressMessage(feedbackMessages[msgIndex]);
      msgIndex = (msgIndex + 1) % feedbackMessages.length;
    }, 4000); // Muda a mensagem a cada 4 segundos

    try {
      const data = await LLMService.extractTransactions(provider, model, apiKey, doc.base64, doc.mimeType, categoriesStr, userContext);
      isExtracting = false;
      clearInterval(progressInterval);

      if (!data || data.length === 0) {
        setStatus('error');
        setErrorMessage('Nenhuma transação encontrada no documento.');
      } else {
        setExtractedData(data);
        setStatus('success');
      }
    } catch (error) {
      isExtracting = false;
      clearInterval(progressInterval);
      Logger.error('ExtractionContext', error);
      setStatus('error');
      setErrorMessage(error.message || 'Erro inesperado ao processar documento.');
    }
  };

  return (
    <ExtractionContext.Provider value={{
      status, progressMessage, extractedData, errorMessage,
      startExtraction, resetExtraction
    }}>
      {children}
    </ExtractionContext.Provider>
  );
};
