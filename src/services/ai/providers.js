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
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch(url, options);
    if (response.ok) return { data: await response.json(), headers: response.headers };
    if ((response.status !== 429 && response.status !== 503) || attempt === 1) {
      throw new Error(providerError(provider, response.status));
    }
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  throw new Error('Falha ao consultar o provedor.');
};

const headerNumber = (headers, name) => {
  const value = headers?.get?.(name);
  return value == null || value === '' ? null : Number(value);
};

const rateLimitFrom = (headers, names) => {
  const values = {
    requestsRemaining: headerNumber(headers, names.requestsRemaining),
    requestsLimit: headerNumber(headers, names.requestsLimit),
    tokensRemaining: headerNumber(headers, names.tokensRemaining),
    tokensLimit: headerNumber(headers, names.tokensLimit)
  };
  return Object.values(values).some(value => value != null) ? values : null;
};

const geminiContents = messages => messages.flatMap(message => {
  if (message.role === 'user') {
    const attachments = message.attachments || [];
    const parts = [
      { text: message.text || '' },
      ...attachments.map(attachment => ({
        inline_data: {
          mime_type: attachment.mimeType,
          data: attachment.base64
        }
      }))
    ];
    return [{ role: 'user', parts }];
  }
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
  if (message.role === 'user') {
    const attachments = message.attachments || [];
    if (!attachments.length) return [{ role: 'user', content: message.text || '' }];
    return [{
      role: 'user',
      content: [
        { type: 'text', text: message.text || '' },
        ...attachments.map(attachment => attachment.mimeType === 'application/pdf'
          ? {
            type: 'file',
            file: {
              filename: attachment.name || 'documento.pdf',
              file_data: `data:application/pdf;base64,${attachment.base64}`
            }
          }
          : {
            type: 'image_url',
            image_url: {
              url: `data:${attachment.mimeType};base64,${attachment.base64}`
            }
          })
      ]
    }];
  }
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
  if (message.role === 'user') {
    const attachments = message.attachments || [];
    if (!attachments.length) return [{ role: 'user', content: message.text || '' }];
    return [{
      role: 'user',
      content: [
        { type: 'text', text: message.text || '' },
        ...attachments.map(attachment => attachment.mimeType === 'application/pdf'
          ? {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: attachment.base64
            }
          }
          : {
            type: 'image',
            source: {
              type: 'base64',
              media_type: attachment.mimeType,
              data: attachment.base64
            }
          })
      ]
    }];
  }
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
  const { data } = await requestJson(
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
    raw: raw,
    usage: {
      input: data.usageMetadata?.promptTokenCount || 0,
      output: (data.usageMetadata?.candidatesTokenCount || 0) + (data.usageMetadata?.thoughtsTokenCount || 0)
    },
    rateLimit: null
  };
};

const openai = async ({ model, apiKey, system, messages, tools }) => {
  const { data, headers } = await requestJson('https://api.openai.com/v1/chat/completions', {
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
    raw: message,
    usage: { input: data.usage?.prompt_tokens || 0, output: data.usage?.completion_tokens || 0 },
    rateLimit: rateLimitFrom(headers, {
      requestsRemaining: 'x-ratelimit-remaining-requests',
      requestsLimit: 'x-ratelimit-limit-requests',
      tokensRemaining: 'x-ratelimit-remaining-tokens',
      tokensLimit: 'x-ratelimit-limit-tokens'
    })
  };
};

const claude = async ({ model, apiKey, system, messages, tools }) => {
  const { data, headers } = await requestJson('https://api.anthropic.com/v1/messages', {
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
    raw: content,
    usage: { input: data.usage?.input_tokens || 0, output: data.usage?.output_tokens || 0 },
    rateLimit: rateLimitFrom(headers, {
      requestsRemaining: 'anthropic-ratelimit-requests-remaining',
      requestsLimit: 'anthropic-ratelimit-requests-limit',
      tokensRemaining: 'anthropic-ratelimit-tokens-remaining',
      tokensLimit: 'anthropic-ratelimit-tokens-limit'
    })
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
