import React, { useState, useContext, useMemo, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SettingsContext } from '../context/SettingsContext';
import { getZoomFactor } from '../utils/scaler';
import { getSharedStyles } from '../utils/StyleHub';
import BaseModalCenter from '../components/ui/BaseModalCenter';
import { PERMISSION_OPTIONS } from '../services/ai/permissions';
import { formatTokens, formatUsd, monthTotals, estimateCost } from '../services/ai/usage';

const PROVIDER_MODELS = {
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o', desc: 'Mais Inteligente • Recomendado' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', desc: 'Mais Rápido e Barato' }
  ],
  gemini: [
    { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', desc: 'Nova Geração • Recomendado' },
    { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', desc: 'Alta Capacidade' },
    { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite', desc: 'Rápido • Cota gratuita maior' },
  ],
  claude: [
    { id: 'claude-fable-5', name: 'Claude 5 Fable', desc: 'Agente Autônomo • Top de Linha' },
    { id: 'claude-opus-5', name: 'Claude 5 Opus', desc: 'Máxima Inteligência' },
    { id: 'claude-sonnet-5', name: 'Claude 5 Sonnet', desc: 'Equilíbrio e Velocidade' },
    { id: 'claude-opus-4-6', name: 'Claude 4.6 Opus', desc: 'Inteligência Avançada (Ger. 4)' },
    { id: 'claude-sonnet-4-6', name: 'Claude 4.6 Sonnet', desc: 'Rápido e Inteligente' },
    { id: 'claude-haiku-4-6', name: 'Claude 4.6 Haiku', desc: 'Mais Rápido e Barato' }
  ]
};

export default function AssistantConfigScreen({ onBack }) {
  const {
    activeTheme, llmKey, llmProvider, llmModel, assistantMemory, assistantPermissions, assistantUsage, assistantPrices,
    saveSetting, getSecureKey, saveSecureKey
  } = useContext(SettingsContext);
  const [llmKeyLocal, setLlmKeyLocal] = useState(llmKey || '');
  const [providerLocal, setProviderLocal] = useState(llmProvider || 'openai');
  const [modelLocal, setModelLocal] = useState(llmModel || PROVIDER_MODELS[providerLocal || 'openai'][0].id);
  const [showHelpModal, setShowHelpModal] = useState(false);

  useEffect(() => {
    const loadKey = async () => {
      const key = await getSecureKey(providerLocal);
      setLlmKeyLocal(key);
    };
    loadKey();
  }, [providerLocal]);

  const z = getZoomFactor(activeTheme);
  const f = activeTheme.fontFamily || 'monospace';
  const styles = useMemo(() => ({ ...getSharedStyles(activeTheme), ...getLocalStyles(activeTheme) }), [activeTheme]);
  const totals = useMemo(() => monthTotals(assistantUsage, assistantPrices), [assistantUsage, assistantPrices]);
  const providerRateLimit = assistantUsage?.rateLimits?.[providerLocal];
  const currentPrice = assistantPrices?.[modelLocal] || {};
  const [priceDraft, setPriceDraft] = useState({ input: '', output: '' });
  useEffect(() => {
    setPriceDraft({
      input: currentPrice.input != null ? String(currentPrice.input).replace('.', ',') : '',
      output: currentPrice.output != null ? String(currentPrice.output).replace('.', ',') : ''
    });
  }, [modelLocal, currentPrice.input, currentPrice.output]);
  const savePrice = field => {
    const value = priceDraft[field].replace(',', '.').trim();
    const parsed = value === '' ? null : Number(value);
    if (parsed !== null && Number.isNaN(parsed)) return;
    saveSetting('assistantPrices', { ...assistantPrices, [modelLocal]: { ...currentPrice, [field]: parsed } });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { borderBottomColor: activeTheme.cardSecondary }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={activeTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: activeTheme.text }]}>Assistente IA</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.section, { backgroundColor: activeTheme.card }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 * z }}>
            <Ionicons name="sparkles" size={20} color={activeTheme.accent} style={{ marginRight: 8 * z }} />
            <Text style={[styles.sectionTitle, { color: activeTheme.text }]}>Provedor e chave</Text>
          </View>
          <Text style={[styles.sectionDesc, { color: activeTheme.textSecondary }]}>
            Usado pelo assistente e pela leitura de extratos em PDF e notas fiscais. A chave fica só neste aparelho e as chamadas vão direto ao provedor escolhido.
          </Text>
          
          <Text style={[styles.label, { color: activeTheme.textSecondary }]}>Provedor de IA</Text>
          <View style={styles.providerRow}>
            {['openai', 'gemini', 'claude'].map(p => (
              <TouchableOpacity 
                key={p} 
                style={[styles.providerBtn, providerLocal === p && { backgroundColor: activeTheme.accent }]}
                onPress={() => {
                  setProviderLocal(p);
                  saveSetting('llmProvider', p);
                  
                  // Auto-switch to default model of new provider
                  const defaultModel = PROVIDER_MODELS[p][0].id;
                  setModelLocal(defaultModel);
                  saveSetting('llmModel', defaultModel);
                }}
              >
                <Text style={[styles.providerText, { color: activeTheme.textSecondary }, providerLocal === p && { color: '#121212' }]}>
                  {p === 'openai' ? 'OpenAI' : p === 'gemini' ? 'Google Gemini' : 'Claude'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: activeTheme.textSecondary, marginTop: 16 * z }]}>Modelo de IA</Text>
          <View style={{ gap: 8 * z }}>
            {PROVIDER_MODELS[providerLocal].map(m => (
              <TouchableOpacity 
                key={m.id}
                style={[
                  styles.modelCard, 
                  { borderColor: activeTheme.cardSecondary },
                  modelLocal === m.id && { borderColor: activeTheme.accent, backgroundColor: activeTheme.accent + '15' }
                ]}
                onPress={() => {
                  setModelLocal(m.id);
                  saveSetting('llmModel', m.id);
                }}
              >
                <View style={[styles.radio, { borderColor: modelLocal === m.id ? activeTheme.accent : activeTheme.textSecondary }]}>
                  {modelLocal === m.id && <View style={[styles.radioInner, { backgroundColor: activeTheme.accent }]} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modelTitle, { color: activeTheme.text }]}>{m.name}</Text>
                  <Text style={[styles.modelDesc, { color: activeTheme.textSecondary }]}>{m.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 * z, marginBottom: 8 * z }}>
            <Text style={[styles.label, { color: activeTheme.textSecondary, marginTop: 0, marginBottom: 0 }]}>Chave da API ({providerLocal === 'openai' ? 'OpenAI' : providerLocal === 'gemini' ? 'Google' : 'Anthropic'})</Text>
            <TouchableOpacity onPress={() => setShowHelpModal(true)} style={{ marginLeft: 8 * z }}>
              <Ionicons name="help-circle-outline" size={20} color={activeTheme.accent} />
            </TouchableOpacity>
          </View>
          <TextInput
            style={[styles.input, { backgroundColor: activeTheme.cardSecondary, color: activeTheme.text }]}
            placeholder={providerLocal === 'openai' ? "sk-proj-..." : "Cole a chave aqui..."}
            placeholderTextColor={activeTheme.textSecondary}
            secureTextEntry
            value={llmKeyLocal}
            onChangeText={(text) => {
              setLlmKeyLocal(text);
              saveSecureKey(providerLocal, text);
            }}
            onBlur={() => saveSecureKey(providerLocal, llmKeyLocal)}
          />
        </View>
        <View style={[styles.section, { backgroundColor: activeTheme.card }]}>
          <Text style={[styles.sectionTitle, { color: activeTheme.text }]}>O que o assistente pode fazer</Text>
          <Text style={[styles.sectionDesc, { color: activeTheme.textSecondary }]}>
            Consultas são sempre permitidas. Toda alteração aparece como um cartão para você aplicar ou descartar.
          </Text>
          {PERMISSION_OPTIONS.map(option => (
            <View key={option.key} style={styles.permissionRow}>
              <View style={{ flex: 1, marginRight: 12 * z }}>
                <Text style={[styles.permissionTitle, { color: activeTheme.text }]}>{option.label}</Text>
                <Text style={[styles.permissionDesc, { color: activeTheme.textSecondary }]}>{option.desc}</Text>
              </View>
              <Switch
                testID={`perm-${option.key}`}
                value={assistantPermissions[option.key] === true}
                onValueChange={value => saveSetting('assistantPermissions', { ...assistantPermissions, [option.key]: value })}
                trackColor={{ false: activeTheme.cardSecondary, true: activeTheme.accent }}
                thumbColor={activeTheme.text}
              />
            </View>
          ))}
        </View>
        <View style={[styles.section, { backgroundColor: activeTheme.card }]}>
          <Text style={[styles.sectionTitle, { color: activeTheme.text }]}>Consumo deste mês</Text>
          <Text style={[styles.sectionDesc, { color: activeTheme.textSecondary }]}>
            Tokens informados pelo provedor em cada resposta. O custo é uma estimativa pela tabela de preços abaixo.
          </Text>
          <Text style={[styles.usageLine, { color: activeTheme.text }]}>{formatTokens(totals.input)} tokens de entrada · {formatTokens(totals.output)} de saída</Text>
          <Text style={[styles.usageLine, { color: activeTheme.text }]}>{totals.requests} chamadas · custo estimado {formatUsd(totals.cost)}</Text>
          {totals.models.map(([model, item]) => (
            <Text key={model} style={[styles.usageModel, { color: activeTheme.textSecondary }]}>
              • {model}: {formatTokens(item.input + item.output)} tokens · {formatUsd(estimateCost(assistantPrices, model, item))}
            </Text>
          ))}
          {providerRateLimit ? (
            <Text style={[styles.usageModel, { color: activeTheme.textSecondary, marginTop: 8 * z }]}>
              Limite da API (última resposta): {providerRateLimit.requestsRemaining ?? '—'}/{providerRateLimit.requestsLimit ?? '—'} chamadas · {formatTokens(providerRateLimit.tokensRemaining)}/{formatTokens(providerRateLimit.tokensLimit)} tokens restantes
            </Text>
          ) : (
            <Text style={[styles.usageModel, { color: activeTheme.textSecondary, marginTop: 8 * z }]}>
              {providerLocal === 'gemini' ? 'O Gemini não informa o limite restante nas respostas; acompanhe em aistudio.google.com.' : 'O limite restante aparece depois da primeira resposta do provedor.'}
            </Text>
          )}
          {totals.requests ? (
            <TouchableOpacity style={[styles.clearMemory, { borderColor: activeTheme.textSecondary }]} onPress={() => saveSetting('assistantUsage', {})}>
              <Text style={{ color: activeTheme.textSecondary, fontFamily: f, fontWeight: 'bold' }}>Zerar contador</Text>
            </TouchableOpacity>
          ) : null}
          <Text style={[styles.label, { color: activeTheme.textSecondary, marginTop: 16 * z }]}>Preço do modelo selecionado (US$ por 1 milhão de tokens)</Text>
          <View style={{ flexDirection: 'row', gap: 8 * z }}>
            <TextInput
              testID="price-input"
              style={[styles.input, { flex: 1, backgroundColor: activeTheme.cardSecondary, color: activeTheme.text }]}
              placeholder="Entrada"
              placeholderTextColor={activeTheme.textSecondary}
              keyboardType="decimal-pad"
              value={priceDraft.input}
              onChangeText={text => setPriceDraft(current => ({ ...current, input: text }))}
              onBlur={() => savePrice('input')}
              onSubmitEditing={() => savePrice('input')}
            />
            <TextInput
              testID="price-output"
              style={[styles.input, { flex: 1, backgroundColor: activeTheme.cardSecondary, color: activeTheme.text }]}
              placeholder="Saída"
              placeholderTextColor={activeTheme.textSecondary}
              keyboardType="decimal-pad"
              value={priceDraft.output}
              onChangeText={text => setPriceDraft(current => ({ ...current, output: text }))}
              onBlur={() => savePrice('output')}
              onSubmitEditing={() => savePrice('output')}
            />
          </View>
        </View>
        <View style={[styles.section, { backgroundColor: activeTheme.card }]}>
          <Text style={[styles.sectionTitle, { color: activeTheme.text }]}>Memória do assistente</Text>
          <Text style={[styles.sectionDesc, { color: activeTheme.textSecondary }]}>
            Preferências duráveis que o assistente pode usar nas próximas conversas.
          </Text>
          {assistantMemory.length ? assistantMemory.map((item, index) => (
            <View key={`${item}_${index}`} style={styles.memoryRow}>
              <Text style={[styles.memoryText, { color: activeTheme.text }]}>• {item}</Text>
              <TouchableOpacity onPress={() => saveSetting('assistantMemory', assistantMemory.filter((_, itemIndex) => itemIndex !== index))}>
                <Ionicons name="close-circle-outline" size={20} color={activeTheme.textSecondary} />
              </TouchableOpacity>
            </View>
          )) : (
            <Text style={[styles.sectionDesc, { color: activeTheme.textSecondary }]}>Nenhuma preferência lembrada.</Text>
          )}
          {assistantMemory.length ? (
            <TouchableOpacity style={[styles.clearMemory, { borderColor: activeTheme.expense }]} onPress={() => saveSetting('assistantMemory', [])}>
              <Text style={{ color: activeTheme.expense, fontFamily: f, fontWeight: 'bold' }}>Limpar tudo</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>

      <BaseModalCenter
        visible={showHelpModal}
        title="Como obter a chave da API?"
        onClose={() => setShowHelpModal(false)}
        showActions={true}
        cancelText="Entendi"
      >
        <Text style={[styles.sectionDesc, { color: activeTheme.textSecondary, marginBottom: 0 }]}>
          {providerLocal === 'openai' && '1. Acesse platform.openai.com\n2. Crie ou acesse sua conta.\n3. Adicione créditos na seção de faturamento (Billing).\n4. Vá em "API Keys" e gere sua chave secreta.'}
          {providerLocal === 'gemini' && '1. Acesse aistudio.google.com\n2. Faça login com sua conta Google.\n3. Clique em "Get API key".\n4. Crie uma nova chave gratuitamente no seu projeto.'}
          {providerLocal === 'claude' && '1. Acesse console.anthropic.com\n2. Crie ou acesse sua conta.\n3. Adicione fundos se necessário.\n4. Vá na seção "API Keys" e gere uma nova chave.'}
        </Text>
      </BaseModalCenter>
    </View>
  );
}

const getLocalStyles = (theme) => {
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';

  return StyleSheet.create({
    section: { borderRadius: 6 * z, padding: 20 * z, marginBottom: 20 * z },
    sectionTitle: { fontSize: 18 * z, fontWeight: 'bold', fontFamily: f },
    sectionDesc: { fontSize: 14 * z, marginTop: 4 * z, marginBottom: 16 * z, fontFamily: f, lineHeight: 20 * z },
    label: { fontSize: 14 * z, fontWeight: 'bold', fontFamily: f, marginBottom: 8 * z },
    providerRow: { flexDirection: 'row', gap: 8 * z },
    providerBtn: { flex: 1, paddingVertical: 10 * z, borderRadius: 4 * z, alignItems: 'center', borderWidth: 1, borderColor: '#444' },
    providerText: { fontSize: 13 * z, fontWeight: 'bold', fontFamily: f },
    
    modelCard: { flexDirection: 'row', alignItems: 'center', padding: 12 * z, borderRadius: 6 * z, borderWidth: 2 },
    radio: { width: 20 * z, height: 20 * z, borderRadius: 6 * z, borderWidth: 2, marginRight: 12 * z, justifyContent: 'center', alignItems: 'center' },
    radioInner: { width: 10 * z, height: 10 * z, borderRadius: 4 * z },
    modelTitle: { fontSize: 14 * z, fontWeight: 'bold', fontFamily: f, marginBottom: 2 * z },
    modelDesc: { fontSize: 12 * z, fontFamily: f },

    input: { padding: 12 * z, borderRadius: 4 * z, fontFamily: f, fontSize: 16 * z },
    permissionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 * z, borderTopWidth: 1, borderTopColor: theme.cardSecondary },
    permissionTitle: { fontSize: 14 * z, fontWeight: 'bold', fontFamily: f },
    permissionDesc: { fontSize: 12 * z, fontFamily: f, marginTop: 2 * z },
    usageLine: { fontSize: 14 * z, fontFamily: f, marginBottom: 4 * z },
    usageModel: { fontSize: 12 * z, fontFamily: f, marginTop: 2 * z },
    memoryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 * z },
    memoryText: { flex: 1, fontFamily: f, marginRight: 8 * z },
    clearMemory: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 4 * z, paddingHorizontal: 12 * z, paddingVertical: 8 * z, marginTop: 8 * z }
  });
};
