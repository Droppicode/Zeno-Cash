/**
 * Motor determinístico ultra-rápido para classificar transações
 * com base em palavras-chave na descrição.
 */

export const CATEGORY_RULES = [
  {
    categoryName: 'Receitas',
    icon: 'cash',
    type: 'income',
    color: '#4CAF50',
    keywords: ['salário', 'salario', 'pix recebido', 'transferência recebida', 'pagamento', 'rendimento']
  },
  {
    categoryName: 'Transporte',
    icon: 'car',
    type: 'expense',
    color: '#FF9800',
    keywords: ['uber', '99', 'posto', 'gasolina', 'combustível', 'estacionamento']
  },
  {
    categoryName: 'Alimentação',
    icon: 'restaurant',
    type: 'expense',
    color: '#F44336',
    keywords: ['ifood', 'restaurante', 'mcdonalds', 'padaria', 'burger king', 'pizza']
  },
  {
    categoryName: 'Mercado',
    icon: 'cart',
    type: 'expense',
    color: '#2196F3',
    keywords: ['mercado', 'atacadão', 'carrefour', 'compre bem', 'assai', 'pão de açucar']
  },
  {
    categoryName: 'Lazer & Assinaturas',
    icon: 'play-circle',
    type: 'expense',
    color: '#9C27B0',
    keywords: ['netflix', 'spotify', 'cinema', 'ingresso', 'prime video', 'show']
  },
  {
    categoryName: 'Saúde',
    icon: 'medkit',
    type: 'expense',
    color: '#E91E63',
    keywords: ['farmácia', 'drogasil', 'médico', 'hospital', 'droga raia', 'consulta']
  }
];

export const categorizeTransaction = (description, amount) => {
  const desc = description.toLowerCase();

  for (const rule of CATEGORY_RULES) {
    // Procura se alguma das palavras-chave da regra está na descrição digitada
    const matched = rule.keywords.some(keyword => desc.includes(keyword));
    
    if (matched) {
      return { 
        categoryName: rule.categoryName, 
        icon: rule.icon, 
        type: rule.type, 
        color: rule.color 
      };
    }
  }

  // Fallback genérico caso não ache nenhuma palavra-chave
  // Se o valor ou a lógica do app mudar depois, podemos ajustar se é receita/despesa, 
  // mas o padrão é assumir que um gasto desconhecido é Despesa.
  return { 
    categoryName: 'Outros', 
    icon: 'list', 
    type: 'expense', 
    color: '#9E9E9E' 
  };
};

export const resolveCategory = (tx, categoryList) => {
  if (tx.categoryId && categoryList && categoryList.length > 0) {
    const cat = categoryList.find(c => c.id === tx.categoryId);
    if (cat) return { id: cat.id, categoryName: cat.name, icon: cat.icon, color: cat.color, type: tx.type, macro: cat.macro };
  }

  if (tx.category && categoryList && categoryList.length > 0) {
    const catByName = categoryList.find(c => c.name.toLowerCase() === tx.category.toLowerCase());
    if (catByName) return { id: catByName.id, categoryName: catByName.name, icon: catByName.icon, color: catByName.color, type: tx.type, macro: catByName.macro };
    
    if (tx.category.trim() !== '') {
      return { 
        categoryName: tx.category, 
        icon: 'sparkles', 
        color: '#9C27B0', 
        type: tx.type || 'expense', 
        isAiSuggestion: true 
      };
    }
  }

  return categorizeTransaction(tx.description, tx.amount);
};
