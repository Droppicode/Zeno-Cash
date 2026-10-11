import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { eq } from 'drizzle-orm';
import { db } from '../../database/db';
import { settings } from '../../database/schema';
import { buildInsights } from '../../utils/Insights';

const DISMISSED_KEY = 'dismissedInsights';
const MAX_DISMISSED = 200;

export default function HomeInsights({ txList, categoryList, debtsList, activeTheme, styles, navigation, saveSetting }) {
  const [dismissed, setDismissed] = useState(null);

  useEffect(() => {
    db.select().from(settings).where(eq(settings.key, DISMISSED_KEY))
      .then(rows => setDismissed(rows[0] ? JSON.parse(rows[0].value) : []))
      .catch(() => setDismissed([]));
  }, []);

  const insights = useMemo(() => (dismissed === null ? [] : buildInsights({
    transactions: txList,
    categories: categoryList,
    debts: debtsList,
    dismissed
  })), [txList, categoryList, debtsList, dismissed]);

  if (insights.length === 0) return null;

  const dismiss = (id) => {
    const next = [...dismissed, id].slice(-MAX_DISMISSED);
    setDismissed(next);
    saveSetting(DISMISSED_KEY, next);
  };

  const toneColor = tone => (tone === 'warning' ? activeTheme.expense : tone === 'good' ? activeTheme.income : activeTheme.accent);

  return (
    <View style={styles.section}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 }}>
        <Ionicons name="sparkles-outline" size={18} color={activeTheme.accent} />
        <Text style={[styles.sectionTitle, { color: activeTheme.text, marginBottom: 0 }]}>Assistente</Text>
      </View>
      <View style={[styles.groupedContainer, { backgroundColor: activeTheme.card }]}>
        {insights.map((insight, idx) => {
          const color = toneColor(insight.tone);
          return (
            <View
              key={insight.id}
              style={{ padding: 12, borderBottomWidth: idx < insights.length - 1 ? 1 : 0, borderBottomColor: activeTheme.background }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={[styles.groupedIcon, { backgroundColor: color + '20' }]}>
                  <Ionicons name={insight.icon} size={18} color={color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.groupedText, { color: activeTheme.text, fontSize: 14 }]}>{insight.title}</Text>
                  <Text style={{ color: activeTheme.textSecondary, fontSize: 12, marginTop: 4, fontFamily: activeTheme.fontFamily || 'monospace' }}>{insight.body}</Text>
                  <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
                    {insight.action && (
                      <TouchableOpacity onPress={() => navigation.navigate(insight.action.route)}>
                        <Text style={{ color: activeTheme.accent, fontWeight: 'bold', fontSize: 12 }}>{insight.action.label}</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => dismiss(insight.id)}>
                      <Text style={{ color: activeTheme.textSecondary, fontSize: 12 }}>Dispensar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
