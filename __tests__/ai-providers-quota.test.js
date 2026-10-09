import { chatWithTools } from '../src/services/ai/providers';

const originalFetch = global.fetch;

const rateLimitResponse = retryAfter => ({
  ok: false,
  status: 429,
  headers: {
    get: name => name.toLowerCase() === 'retry-after' ? retryAfter : null
  },
  json: async () => ({
    error: {
      details: [{
        '@type': 'type.googleapis.com/google.rpc.RetryInfo',
        retryDelay: '17s'
      }]
    }
  })
});

describe('AI provider quota errors', () => {
  afterEach(() => {
    if (originalFetch === undefined) delete global.fetch;
    else global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('preserves the Gemini quota message and Retry-After delay', async () => {
    global.fetch = jest.fn().mockImplementation(() => Promise.resolve(rateLimitResponse('17')));
    jest.spyOn(global, 'setTimeout').mockImplementation(callback => {
      callback();
      return 0;
    });

    const request = chatWithTools({
      provider: 'gemini',
      model: 'gemini-3.7-flash',
      apiKey: 'test-key',
      system: ''
    });

    await expect(request).rejects.toMatchObject({
      message: 'Cota do Google Gemini excedida.',
      provider: 'gemini',
      status: 429,
      retryAfterSeconds: 17
    });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('uses Gemini RetryInfo when Retry-After is unavailable', async () => {
    global.fetch = jest.fn().mockImplementation(() => Promise.resolve(rateLimitResponse(null)));
    jest.spyOn(global, 'setTimeout').mockImplementation(callback => {
      callback();
      return 0;
    });

    const request = chatWithTools({
      provider: 'gemini',
      model: 'gemini-3.7-flash',
      apiKey: 'test-key',
      system: ''
    });

    await expect(request).rejects.toMatchObject({
      message: 'Cota do Google Gemini excedida.',
      retryAfterSeconds: 17
    });
  });
});
