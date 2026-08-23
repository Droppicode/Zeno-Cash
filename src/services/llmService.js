import { Logger } from '../utils/logger';

const getSystemPrompt = (categoriesStr, accountsStr, userContext) => `Você é um extrator inteligente de dados financeiros.
Seu objetivo é analisar um documento (extrato bancário em PDF ou Nota Fiscal/Recibo em imagem) e extrair TODAS as transações financeiras.

REGRAS IMPORTANTES PARA O TÍTULO (description):
- Seja EXTREMAMENTE conciso no título.
- NUNCA use palavras redundantes como "Pagamento", "PIX recebido", "PIX enviado", "Transferência", "Compra". O fato de ser positivo/negativo já indica a natureza da transação.
- Exemplos corretos: ao invés de "Pagamento Uber", retorne apenas "Uber". Ao invés de "Pagamento Atacadão", retorne "Atacadão". Ao invés de "PIX de João", retorne "João".
- Coloque informações extras e originais da transação no campo "note" (descrição), não no título.

CATEGORIAS DISPONÍVEIS DO USUÁRIO:
Tente classificar usando EXATAMENTE uma das categorias desta lista.
No entanto, se você tiver altíssima confiança de que a transação NÃO se encaixa bem em nenhuma delas, você PODE sugerir uma nova categoria enviando o nome ideal no campo "category".
Lista: ${categoriesStr || 'Nenhuma lista fornecida'}

CONTAS DISPONÍVEIS DO USUÁRIO:
Tente classificar usando EXATAMENTE uma das contas desta lista.
Se o documento for uma fatura de cartão de crédito, tente associar à conta do cartão de crédito correspondente.
Se for uma conta nova e óbvia (ex: um banco não listado), você pode sugerir o nome exato no campo "account".
Lista de contas: ${accountsStr || 'Nenhuma lista fornecida'}


${userContext && userContext.trim() !== '' ? `INSTRUÇÕES ESPECÍFICAS DO USUÁRIO PARA ESTE DOCUMENTO:
"${userContext.trim()}"
Você DEVE obedecer estritamente a estas instruções se elas se aplicarem ao documento.

` : ''}Para CADA transação, você deve retornar um objeto JSON com os seguintes campos:
- amount: (Number) valor da transação (positivo para receitas, negativo para despesas).
- description: (String) título extremamente conciso.
- type: (String) "income" ou "expense".
- date: (Number) timestamp unix da transação (use o ano atual se não houver).
- account: (String) nome do banco ou "Dinheiro" se for nota fiscal sem conta explícita.
- note: (String) detalhes adicionais, se houver.
- category: (String) nome exato da categoria que melhor se aplica.
- confidence: (Number) de 0.0 a 1.0 indicando o quão confiante você está nesta extração.

Retorne EXCLUSIVAMENTE um array de objetos JSON. Exemplo:
[
  { "amount": 150.50, "description": "Mercado Livre", "type": "expense", "date": 1692451200000, "account": "Nubank", "note": "Compra parcelada 1/3", "category": "Compras", "confidence": 0.95 }
]
Se for uma nota fiscal, geralmente será apenas 1 transação (o valor total da nota). Extratos terão múltiplas.`;

export class LLMService {
  static async extractTransactions(provider, model, apiKey, fileBase64, mimeType, categoriesStr, accountsStr, userContext) {
    if (!apiKey) throw new Error("Chave da API não configurada.");
    
    try {
      if (provider === 'openai') {
        return await this.callOpenAI(model, apiKey, fileBase64, mimeType, categoriesStr, accountsStr, userContext);
      } else if (provider === 'gemini') {
        return await this.callGemini(model, apiKey, fileBase64, mimeType, categoriesStr, accountsStr, userContext);
      } else if (provider === 'claude') {
        return await this.callClaude(model, apiKey, fileBase64, mimeType, categoriesStr, accountsStr, userContext);
      } else {
        throw new Error("Provedor não suportado: " + provider);
      }
    } catch (err) {
      Logger.error('LLMService.extractTransactions', err);
      throw err;
    }
  }

  static parseJSONResponse(text) {
    try {
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        return JSON.parse(match[0]);
      }
      return JSON.parse(text);
    } catch (err) {
      Logger.error('LLMService.parseJSONResponse failed to parse', err);
      return [];
    }
  }

  static async callOpenAI(model, apiKey, fileBase64, mimeType, categoriesStr, accountsStr, userContext) {
    const isPdf = mimeType === 'application/pdf';
    // OpenAI suporta visão. Para PDFs muito longos poderíamos precisar de extração de texto, 
    // mas vamos enviar como imagem/pdf (GPT-4o suporta documentos e imagens).
    // Nota: O formato exato depende se estamos mandando base64 url
    const prefix = `data:${mimeType};base64,`;
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || "gpt-4o",
        messages: [
          { role: "system", content: getSystemPrompt(categoriesStr, accountsStr, userContext) },
          { role: "user", content: [
            { type: "text", text: "Extraia as transações deste documento:" },
            { type: "image_url", image_url: { url: prefix + fileBase64 } }
          ]}
        ],
        temperature: 0.1
      })
    });

    if (!response.ok) {
      if (response.status === 401) throw new Error('Chave da OpenAI inválida.');
      if (response.status === 429) throw new Error('Cota da OpenAI excedida (sem créditos) ou limite de requisições.');
      throw new Error(`Erro OpenAI: ${response.status}`);
    }
    const data = await response.json();
    return this.parseJSONResponse(data.choices[0].message.content);
  }

  static async callGemini(model, apiKey, fileBase64, mimeType, categoriesStr, accountsStr, userContext) {
    const modelName = model || 'gemini-3.5-flash';
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: getSystemPrompt(categoriesStr, accountsStr, userContext) }] },
        contents: [{
          parts: [
            { text: "Extraia as transações deste documento:" },
            { inline_data: { mime_type: mimeType, data: fileBase64 } }
          ]
        }],
        generationConfig: { temperature: 0.1 }
      })
    });

    if (!response.ok) {
      if (response.status === 400) throw new Error('Chave do Google inválida ou modelo não suportado/existente.');
      if (response.status === 403) throw new Error('Sem permissão para acessar o modelo ou chave da API bloqueada.');
      if (response.status === 429) throw new Error('Cota do Google Gemini excedida.');
      if (response.status === 503) throw new Error('Serviço do Google indisponível no momento. O modelo pode estar offline ou sobrecarregado. Tente usar a versão "1.5 Flash".');
      throw new Error(`Erro Gemini: ${response.status}`);
    }
    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    return this.parseJSONResponse(content);
  }

  static async callClaude(model, apiKey, fileBase64, mimeType, categoriesStr, accountsStr, userContext) {
    // Claude Vision
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model || "claude-3-5-sonnet-20240620",
        system: getSystemPrompt(categoriesStr, accountsStr, userContext),
        max_tokens: 4000,
        temperature: 0.1,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Extraia as transações deste documento:" },
              { type: "image", source: { type: "base64", media_type: mimeType, data: fileBase64 } }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      if (response.status === 401) throw new Error('Chave da Anthropic inválida.');
      if (response.status === 403) throw new Error('Sua conta não tem acesso a este modelo do Claude (você tem créditos na conta?).');
      if (response.status === 429) throw new Error('Cota da Anthropic excedida.');
      throw new Error(`Erro Claude: ${response.status}`);
    }
    const data = await response.json();
    return this.parseJSONResponse(data.content[0].text);
  }
}
