import { chatWithTools, appendToolResults } from './providers.js';
import { TOOL_SPECS, executeTool } from './tools.js';

const formatDate = value => {
  if (!value) return '—';
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const systemPrompt = ctx => {
  const transactions = ctx.txList || [];
  const dates = transactions.map(tx => tx.date).filter(Boolean).sort((a, b) => a - b);
  const accounts = (ctx.accountList || []).map(item => `${item.id}: ${item.name} (${item.type || 'conta'})`).join(', ') || 'nenhuma';
  const categories = (ctx.categoryList || []).map(item => `${item.id}: ${item.name}`).join(', ') || 'nenhuma';
  const groups = (ctx.groupList || []).map(item => `${item.id}: ${item.name} (${item.kind || 'ongoing'})`).join(', ') || 'nenhum';
  return `Você é o Assistente Financeiro do Zeno Cash.
Hoje: ${formatDate(Date.now())}. Moeda: BRL.
Contas: ${accounts}
Categorias: ${categories}
Grupos: ${groups}
Transações disponíveis: ${transactions.length}; período ${formatDate(dates[0])} a ${formatDate(dates[dates.length - 1])}.

Use ferramentas para consultar dados; nunca adivinhe valores ou IDs. Quando pedirem criar ou organizar grupos, primeiro pesquise transações e leia descrições para escolher semanticamente, sem depender apenas de palavras-chave. Para qualquer alteração use propose_* e explique ao usuário que ele deve revisar o cartão de proposta antes da aplicação.
Estratégia: faça no máximo 2–3 chamadas de ferramenta antes de responder. Para montar um grupo, faça UMA busca ampla (search_transactions com type:'expense' e limit:200, ou por categoria/lista de termos) e escolha as transações lendo as descrições. Se já existir um grupo adequado (veja a lista de Grupos acima), use propose_assign em vez de propose_group. Depois de chamar uma ferramenta propose_*, responda ao usuário imediatamente. Nunca diga que criou ou propôs algo sem ter chamado de fato a ferramenta propose_* correspondente nesta resposta.
Responda concisamente em pt-BR, usando valores como R$ 1.234,56. Não exponha chaves secretas nem invente dados.`;
};

export async function runAgent({ provider, model, apiKey, history = [], userText, ctx = {}, onStep }) {
  const workingCtx = { ...ctx, proposals: ctx.proposals || [] };
  let messages = [...history, { role: 'user', text: userText }];
  let finalText = null;

  let reachedRoundLimit = true;
  for (let round = 0; round < 12; round += 1) {
    const response = await chatWithTools({
      provider,
      model,
      apiKey,
      system: systemPrompt(workingCtx),
      messages,
      tools: TOOL_SPECS
    });
    if (!response.toolCalls?.length) {
      finalText = response.text || 'Não consegui formular uma resposta.';
      messages = [...messages, { role: 'assistant', text: response.text, toolCalls: [], raw: response.raw }];
      reachedRoundLimit = false;
      break;
    }
    const results = [];
    for (const call of response.toolCalls) {
      onStep?.(call.name);
      try {
        const result = await executeTool(call.name, call.args || {}, workingCtx);
        results.push({ id: call.id, name: call.name, result });
      } catch (error) {
        results.push({ id: call.id, name: call.name, result: { error: error.message || 'Erro ao executar ferramenta.' } });
      }
    }
    messages = appendToolResults(messages, response, results);
    if (response.toolCalls.some(call => call.name?.startsWith('propose_'))) {
      finalText = response.text || 'Preparei uma proposta para você revisar.';
      messages = [...messages, { role: 'assistant', text: finalText, toolCalls: [] }];
      reachedRoundLimit = false;
      break;
    }
  }

  if (reachedRoundLimit) {
    try {
      const finalMessages = [...messages, { role: 'user', text: 'Responda agora com o que já tem, sem chamar ferramentas. Se não chegou a propor nada, diga isso e sugira como o usuário pode reformular o pedido.' }];
      const response = await chatWithTools({
        provider,
        model,
        apiKey,
        system: systemPrompt(workingCtx),
        messages: finalMessages,
        tools: []
      });
      finalText = response.text || 'A consulta excedeu o limite de etapas. Tente reformular a pergunta.';
      messages = [...finalMessages, { role: 'assistant', text: response.text, toolCalls: [], raw: response.raw }];
    } catch (error) {
      finalText = 'A consulta excedeu o limite de etapas. Tente reformular a pergunta.';
    }
  }
  if (!finalText) finalText = 'Não consegui formular uma resposta.';
  return { text: finalText, proposals: workingCtx.proposals, history: messages };
}
