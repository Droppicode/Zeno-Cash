import { AppRegistry } from 'react-native';
import RNAndroidNotificationListener from 'react-native-android-notification-listener';
import * as Notifications from 'expo-notifications';

import { db } from '../database/db';
import { transactions, accounts } from '../database/schema';
import { eq } from 'drizzle-orm';

export const headlessNotificationListener = async ({ notification }) => {
  try {
    if (!notification) return;
    
    const parsed = typeof notification === 'string' ? JSON.parse(notification) : notification;
    
    // Ignora notificações muito antigas (mais de 10 minutos) para evitar crash ao reconectar o Expo após dias offline
    const notifTime = Number(parsed.time || parsed.postTime) || Date.now();
    if (Date.now() - notifTime > 600000) {
      return;
    }
    
    const appName = parsed.app ? parsed.app.toLowerCase() : '';
    const title = parsed.title || '';
    const text = parsed.text || '';
    
    if (!appName.includes('.android') && !appName.includes('.huami')) {
      console.log(`Notificação recebida do app ${appName}: ${title}`);
    }
    
    // Mapeamento de bancos para o nome da conta e validação de pacotes
    const bankMap = {
      'nubank': 'Nubank',
      'inter': 'Inter',
      'itau': 'Itaú',
      'itaú': 'Itaú',
      'bradesco': 'Bradesco',
      'santander': 'Santander',
      'bb': 'Banco do Brasil',
      'bancodobrasil': 'Banco do Brasil',
      'caixa': 'Caixa Econômica',
      'picpay': 'PicPay',
      'mercadopago': 'Mercado Pago',
      'c6': 'C6 Bank',
      'btg': 'BTG Pactual',
      'xp': 'XP Investimentos',
      'neon': 'Neon',
      'next': 'Next',
      'sicoob': 'Sicoob',
      'sicredi': 'Sicredi',
      'pagbank': 'PagBank',
      'willbank': 'Will Bank',
      'original': 'Banco Original'
    };
    
    const matchedBankKey = Object.keys(bankMap).find(key => appName.includes(key));
    if (!matchedBankKey) return; // Ignora se não for app de banco conhecido
    
    const accountName = bankMap[matchedBankKey];
    const content = `${title} ${text}`.toLowerCase();
    
    // Mostra TUDO que vier de banco no log do Metro
    console.log(`[BANCO DETECTADO] Texto bruto: ${content}`);
    
    // Palavras-chave de Receita (Income) e Despesa (Expense)
    const isIncome = ['recebid', 'recebeu', 'estorno', 'reembolso', 'salário', 'salario', 'depósito', 'deposito', 'entrou', 'rendend', 'rendimento'].some(kw => content.includes(kw));
    const isExplicitExpense = ['enviad', 'compra', 'pagamento', 'aprovada', 'débito', 'debito', 'transferência realizada', 'ted enviado', 'saiu', 'gasto'].some(kw => content.includes(kw));
    
    // Default agora é DESPESA, a não ser que tenha palavras claras de RECEITA
    const type = isIncome ? 'income' : 'expense';
    
    // Regex flexível: R$ 150,00 ou R$150.00 ou R$ 1.500,00
    // Lida com espaços opcionais e aceita pontos e vírgulas livremente
    const amountMatch = content.match(/r\$\s*([\d.,]+)/);
    if (!amountMatch) {
       console.log(`Ignorado: Não encontrou valor em Reais na string.`);
       return;
    }
    
    let amountStr = amountMatch[1].replace(/[^\d.,]/g, '');
    
    // Se não tiver nem ponto nem vírgula, é um número inteiro direto
    // Lida com casos como "1.500,00" ou "1500,00" ou "1500.00"
    const lastCommaIndex = amountStr.lastIndexOf(',');
    const lastDotIndex = amountStr.lastIndexOf('.');
    
    let amount = 0;
    if (lastCommaIndex > lastDotIndex) {
      // Vírgula atua como separador decimal
      amountStr = amountStr.replace(/\./g, '').replace(',', '.');
    } else if (lastDotIndex > lastCommaIndex) {
      // Ponto atua como separador decimal
      amountStr = amountStr.replace(/,/g, '');
    }
    
    amount = parseFloat(amountStr);
    
    if (isNaN(amount) || amount <= 0) {
       console.log(`Ignorado: Valor inválido -> ${amountStr}`);
       return;
    }
    
    // Identificar o meio de pagamento para descrição temporária
    let txDesc = 'Transação Pendente';
    if (content.includes('pix')) {
      txDesc = type === 'income' ? 'Pix Recebido' : 'Pix Enviado';
    } else if (content.includes('cartão') || content.includes('cartao') || content.includes('compra')) {
      txDesc = 'Compra no Cartão';
    } else if (content.includes('transferência') || content.includes('ted') || content.includes('doc')) {
      txDesc = type === 'income' ? 'Transferência Recebida' : 'Transferência Enviada';
    } else if (content.includes('boleto') || content.includes('pagamento')) {
      txDesc = 'Pagamento de Boleto';
    }
    
    txDesc = `${txDesc} - ${accountName}`;
    
    // Tenta encontrar o ID da conta correspondente ao banco
    const accountsData = await db.select().from(accounts).where(eq(accounts.name, accountName));
    const accId = accountsData.length > 0 ? accountsData[0].id : null;
    
    const newTx = {
      amount,
      type,
      description: txDesc,
      date: Date.now(),
      categoryId: null,
      accountId: accId,
      isPending: 1, // Pendente para aprovação
      note: text.substring(0, 100)
    };
    
    await db.insert(transactions).values(newTx);
    console.log(`Transação pendente salva: R$ ${amount} (${type})`);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${txDesc}`,
        body: `Pendência de R$ ${amount.toFixed(2)} salva. Toque para aprovar!`,
        sound: true,
      },
      trigger: null,
    });
    
  } catch (error) {
    console.error('Erro ao processar notificação headless:', error);
  }
};
