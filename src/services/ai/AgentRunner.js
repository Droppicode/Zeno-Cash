import { chatWithTools, appendToolResults } from './providers.js';
import { TOOL_SPECS, executeTool } from './tools.js';
import { disabledPermissionLabels, isToolAllowed } from './permissions.js';

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
  const memory = (ctx.assistantMemory || []).map(item => `- ${item}`).join('\n');
  const disabled = disabledPermissionLabels(ctx.permissions);
  return `Você é o Assistente Financeiro do Zeno Cash.
Hoje: ${formatDate(Date.now())}. Moeda: BRL.
Contas: ${accounts}
Categorias: ${categories}
Grupos: ${groups}
Transações disponíveis: ${transactions.length}; período ${formatDate(dates[0])} a ${formatDate(dates[dates.length - 1])}.
${memory ? `Preferências do usuário:\n${memory}` : ''}
${disabled.length ? `Permissões desligadas pelo usuário: ${disabled.join(', ')}. Se pedirem algo dessas áreas, explique que a permissão pode ser ligada em Config → Assistente IA.` : ''}

Use ferramentas para consultar dados; nunca adivinhe valores ou IDs. Quando pedirem criar ou organizar grupos, primeiro pesquise transações e leia descrições para escolher semanticamente, sem depender apenas de palavras-chave. Para qualquer alteração use propose_* e explique ao usuário que ele deve revisar o cartão de proposta antes da aplicação.
Estratégia: faça no máximo 2–3 chamadas de ferramenta antes de responder. Para montar um grupo, faça UMA busca ampla (search_transactions com type:'expense' e limit:200, ou por categoria/lista de termos) e escolha as transações lendo as descrições. Se já existir um grupo adequado (veja a lista de Grupos acima), use propose_assign em vez de propose_group. Depois de chamar uma ferramenta propose_*, responda ao usuário imediatamente. Nunca diga que criou ou propôs algo sem ter chamado de fato a ferramenta propose_* correspondente nesta resposta.
Quando o usuário enviar uma imagem ou PDF (recibo, nota ou extrato), leia o documento, mapeie cada linha para uma categoria pelo nome e uma conta. Chame propose_transactions para revisão. Nunca invente valores que não estejam no documento; pergunte sobre a conta apenas se houver mais de uma conta e nenhuma estiver implícita.
Para "resumo do mês", chame month_summary uma vez e responda em 4–6 tópicos curtos. Quando o usuário expressar uma preferência durável (por exemplo, "sempre responda em tópicos" ou "meu carro é o Fiesta"), chame remember_preference com uma frase curta.
Para editar ou apagar transações, primeiro encontre os IDs com search_transactions e depois use propose_update_transactions ou propose_delete_transactions. Para dívidas use list_debts antes de propose_settle_debts. Para saldos e faturas use list_accounts.
Você pode formatar a resposta em Markdown (negrito, listas, títulos curtos e tabelas pequenas).
Responda concisamente em pt-BR, usando valores como R$ 1.234,56. Não exponha chaves secretas nem invente dados.`;
};

export async function runAgent({ provider, model, apiKey, history = [], userText, attachments, ctx = {}, onStep }) {
  const workingCtx = { ...ctx, proposals: ctx.proposals || [], memoryWrites: [] };
  let messages = [...history, { role: 'user', text: userText, ...(attachments?.length ? { attachments } : {}) }];
  let finalText = null;

  const tools = TOOL_SPECS.filter(tool => isToolAllowed(tool.name, ctx.permissions));
  const usage = { input: 0, output: 0, requests: 0 };
  let rateLimit = null;
  const track = response => {
    usage.input += response.usage?.input || 0;
    usage.output += response.usage?.output || 0;
    usage.requests += 1;
    if (response.rateLimit) rateLimit = response.rateLimit;
  };

  let reachedRoundLimit = true;
  for (let round = 0; round < 12; round += 1) {
    const response = await chatWithTools({
      provider,
      model,
      apiKey,
      system: systemPrompt(workingCtx),
      messages,
      tools
    });
    track(response);
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
      track(response);
      finalText = response.text || 'A consulta excedeu o limite de etapas. Tente reformular a pergunta.';
      messages = [...finalMessages, { role: 'assistant', text: response.text, toolCalls: [], raw: response.raw }];
    } catch (error) {
      if (error?.status === 429) throw error;
      finalText = 'A consulta excedeu o limite de etapas. Tente reformular a pergunta.';
    }
  }
  if (!finalText) finalText = 'Não consegui formular uma resposta.';
  return {
    text: finalText,
    proposals: workingCtx.proposals,
    memoryWrites: workingCtx.memoryWrites,
    history: messages,
    usage,
    rateLimit
  };
}
