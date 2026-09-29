const jsonStringify = value => JSON.stringify(value ?? {});

const parseArgs = value => {
  if (value && typeof value === 'object') return value;
  try { return JSON.parse(value || '{}'); } catch (err) { return {}; }
};

const providerError = (provider, status) => {
  if (provider === 'gemini') {
    if (status === 400) return 'Chave do Google inválida ou modelo não suportado.';
    if (status === 403) return 'Sem permissão para acessar o modelo ou chave da API bloqueada.';
    if (status === 429) return 'Cota do Google Gemini excedida.';
    if (status === 503) return 'Serviço do Google indisponível no momento.';
    return `Erro Gemini: ${status}`;
  }
  if (provider === 'openai') {
    if (status === 401) return 'Chave da OpenAI inválida.';
    if (status === 429) return 'Cota da OpenAI excedida.';
    return `Erro OpenAI: ${status}`;
  }
  if (status === 401) return 'Chave da Anthropic inválida.';
  if (status === 403) return 'Sua conta não tem acesso a este modelo do Claude.';
  if (status === 429) return 'Cota da Anthropic excedida.';
  return `Erro Claude: ${status}`;
};

const requestJson = async (url, options, provider) => {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(providerError(provider, response.status));
  return response.json();
};

const geminiContents = messages => messages.flatMap(message => {
  if (message.role === 'user') return [{ role: 'user', parts: [{ text: message.text || '' }] }];
  if (message.role === 'assistant') {
    if (message.raw) return [{ role: 'model', parts: message.raw.parts || [] }];
    return [{ role: 'model', parts: [{ text: message.text || '' }] }];
  }
  if (message.role === 'tool') {
    return [{
      role: 'user',
      parts: message.results.map(result => ({
        functionResponse: { name: result.name, id: result.id, response: result.result && typeof result.result === 'object' ? result.result : { value: result.result } }
      }))
    }];
  }
  return [];
});

const openAiMessages = messages => messages.flatMap(message => {
  if (message.role === 'user') return [{ role: 'user', content: message.text || '' }];
  if (message.role === 'assistant') {
    const raw = message.raw || {};
    return [{
      role: 'assistant',
      content: message.text ?? raw.content ?? null,
      ...(message.toolCalls?.length ? {
        tool_calls: message.toolCalls.map(call => ({
          id: call.id,
          type: 'function',
          function: { name: call.name, arguments: jsonStringify(call.args) }
        }))
      } : {})
    }];
  }
  if (message.role === 'tool') return message.results.map(result => ({
    role: 'tool',
    tool_call_id: result.id,
    content: jsonStringify(result.result)
  }));
  return [];
});

const claudeMessages = messages => messages.flatMap(message => {
  if (message.role === 'user') return [{ role: 'user', content: message.text || '' }];
  if (message.role === 'assistant') return [{ role: 'assistant', content: message.raw || [{ type: 'text', text: message.text || '' }] }];
  if (message.role === 'tool') return [{
    role: 'user',
    content: message.results.map(result => ({
      type: 'tool_result',
      tool_use_id: result.id,
      content: jsonStringify(result.result)
    }))
  }];
  return [];
});

const gemini = async ({ model, apiKey, system, messages, tools }) => {
  const modelName = model || 'gemini-3.5-flash';
  const data = await requestJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: geminiContents(messages),
        tools: [{ functionDeclarations: tools }]
      })
    },
    'gemini'
  );
  const raw = data.candidates?.[0]?.content || { parts: [] };
  const parts = raw.parts || [];
  return {
    text: parts.filter(part => part.text).map(part => part.text).join('') || null,
    toolCalls: parts.filter(part => part.functionCall).map((part, index) => ({
      id: part.functionCall.id || `${part.functionCall.name}_${index}`,
      name: part.functionCall.name,
      args: part.functionCall.args || {}
    })),
    raw: raw
  };
};

const openai = async ({ model, apiKey, system, messages, tools }) => {
  const data = await requestJson('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: model || 'gpt-4o',
      messages: [{ role: 'system', content: system }, ...openAiMessages(messages)],
      tools: tools.map(tool => ({ type: 'function', function: tool }))
    })
  }, 'openai');
  const message = data.choices?.[0]?.message || {};
  return {
    text: message.content || null,
    toolCalls: (message.tool_calls || []).map(call => ({
      id: call.id,
      name: call.function?.name,
      args: parseArgs(call.function?.arguments)
    })),
    raw: message
  };
};

const claude = async ({ model, apiKey, system, messages, tools }) => {
  const data = await requestJson('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: model || 'claude-sonnet-4-6',
      system,
      max_tokens: 4000,
      tools: tools.map(tool => ({ name: tool.name, description: tool.description, input_schema: tool.parameters })),
      messages: claudeMessages(messages)
    })
  }, 'claude');
  const content = data.content || [];
  return {
    text: content.filter(block => block.type === 'text').map(block => block.text).join('') || null,
    toolCalls: content.filter(block => block.type === 'tool_use').map(block => ({
      id: block.id,
      name: block.name,
      args: block.input || {}
    })),
    raw: content
  };
};

export async function chatWithTools({ provider, model, apiKey, system, messages = [], tools = [] }) {
  if (!apiKey) throw new Error('Chave da API não configurada.');
  if (provider === 'gemini') return gemini({ model, apiKey, system, messages, tools });
  if (provider === 'openai') return openai({ model, apiKey, system, messages, tools });
  if (provider === 'claude') return claude({ model, apiKey, system, messages, tools });
  throw new Error(`Provedor não suportado: ${provider}`);
}

export const appendToolResults = (messages, assistant, results) => [
  ...messages,
  {
    role: 'assistant',
    text: assistant.text,
    toolCalls: assistant.toolCalls || [],
    raw: assistant.raw
  },
  { role: 'tool', results }
];
