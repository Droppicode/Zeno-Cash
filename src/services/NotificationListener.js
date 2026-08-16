import { AppRegistry } from 'react-native';
import RNAndroidNotificationListener from 'react-native-android-notification-listener';

import { db } from '../database/db';
import { transactions } from '../database/schema';

export const headlessNotificationListener = async ({ notification }) => {
  try {
    if (!notification) return;
    
    const parsed = typeof notification === 'string' ? JSON.parse(notification) : notification;
    
    const appName = parsed.app || '';
    const title = parsed.title || '';
    const text = parsed.text || '';
    
    console.log(`Notificação recebida do app ${appName}: ${title}`);
    
    // Filtro mais robusto de apps financeiros e de bancos
    const bankApps = [
      'nubank', 'inter', 'itau', 'bradesco', 'santander', 'picpay', 'mercadopago', 
      'c6', 'bb', 'bancodobrasil', 'caixa', 'btg', 'xp', 'neon', 'next', 'sicoob', 
      'sicredi', 'pagbank', 'willbank', 'original'
    ];
    const isBank = bankApps.some(bank => appName.toLowerCase().includes(bank));
    
    if (!isBank) return;
    
    const content = `${title} ${text}`.toLowerCase();
    
    // Mostra TUDO que vier de banco no log do Metro
    console.log(`[BANCO DETECTADO] Texto bruto: ${content}`);
    
    // Tenta descobrir se é entrada ou saída
    const isExpense = content.includes('enviad') || content.includes('pagamento') || content.includes('compra') || content.includes('aprovada');
    const type = isExpense ? 'expense' : 'income'; // Por padrão, se não tiver certeza, assume que é dinheiro entrando.
    
    // Regex flexível: R$ 150,00 ou R$150.00 ou R$ 1.500,00
    const amountMatch = content.match(/r\$\s*([\d.,]+)/);
    if (!amountMatch) {
       console.log(`Ignorado: Não encontrou valor em Reais na string.`);
       return;
    }
    
    // Converte "1.500,00" ou "1500.00" para float
    let amountStr = amountMatch[1].replace(/[^\d.,]/g, '');
    // Se o último separador for vírgula, troca por ponto
    if (amountStr.includes(',') && amountStr.indexOf(',') > amountStr.length - 4) {
      amountStr = amountStr.replace(/\./g, '').replace(',', '.');
    }
    
    const amount = parseFloat(amountStr);
    
    if (isNaN(amount) || amount <= 0) {
       console.log(`Ignorado: Valor inválido -> ${amountStr}`);
       return;
    }
    
    // Identificar banco para a conta (nomes comuns de pacotes)
    let accountName = 'Outros Bancos';
    const pkg = appName.toLowerCase();
    if (pkg.includes('nubank')) accountName = 'Nubank';
    else if (pkg.includes('inter')) accountName = 'Inter';
    else if (pkg.includes('itau') || pkg.includes('itaú')) accountName = 'Itaú';
    else if (pkg.includes('bradesco')) accountName = 'Bradesco';
    else if (pkg.includes('santander')) accountName = 'Santander';
    else if (pkg.includes('bb') || pkg.includes('bancodobrasil')) accountName = 'Banco do Brasil';
    else if (pkg.includes('caixa')) accountName = 'Caixa Econômica';
    else if (pkg.includes('picpay')) accountName = 'PicPay';
    else if (pkg.includes('mercadopago')) accountName = 'Mercado Pago';
    else if (pkg.includes('c6')) accountName = 'C6 Bank';
    else if (pkg.includes('btg')) accountName = 'BTG Pactual';
    else if (pkg.includes('xp')) accountName = 'XP Investimentos';
    else if (pkg.includes('neon')) accountName = 'Neon';
    else if (pkg.includes('next')) accountName = 'Next';
    else if (pkg.includes('sicoob')) accountName = 'Sicoob';
    else if (pkg.includes('sicredi')) accountName = 'Sicredi';
    
    // Identificar o meio de pagamento para colocar como descrição temporária
    let txDesc = 'Transação Pendente';
    if (content.includes('pix')) txDesc = 'Pix Pendente';
    else if (content.includes('cartão') || content.includes('cartao') || content.includes('compra')) txDesc = 'Compra no Cartão';
    else if (content.includes('transferência') || content.includes('ted') || content.includes('doc')) txDesc = 'Transferência';
    else if (content.includes('boleto') || content.includes('pagamento')) txDesc = 'Pagamento de Boleto';
    
    const newTx = {
      amount,
      type,
      description: txDesc,
      date: Date.now(),
      category_id: null,
      account: accountName,
      isPending: 1, // Marcar como pendente para aprovação do usuário!
      note: text.substring(0, 100)
    };
    
    await db.insert(transactions).values(newTx);
    console.log(`Transação pendente salva: R$ ${amount} (${type})`);
    
  } catch (error) {
    console.error('Erro ao processar notificação no Headless Task', error);
  }
};

