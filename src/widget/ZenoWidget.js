import React from 'react';
import { FlexWidget, TextWidget, ActionWidget } from 'react-native-android-widget';

export function ZenoWidget() {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#1E1E1E', // activeTheme.card
        borderRadius: 16,
        padding: 16,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <TextWidget
        text="Zeno Cash"
        style={{
          fontSize: 20,
          fontWeight: 'bold',
          color: '#FFFFFF',
          marginBottom: 16,
        }}
      />
      
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', width: 'match_parent' }}>
        {/* Botão de Despesa */}
        <ActionWidget
          action="OPEN_URI"
          clickAction="zenocash://add-transaction?type=expense"
          style={{
            flex: 1,
            backgroundColor: '#CF6679', // activeTheme.expense
            borderRadius: 12,
            paddingVertical: 12,
            marginRight: 8,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TextWidget
            text="- Despesa"
            style={{
              fontSize: 16,
              fontWeight: 'bold',
              color: '#FFFFFF',
            }}
          />
        </ActionWidget>

        {/* Botão de Receita */}
        <ActionWidget
          action="OPEN_URI"
          clickAction="zenocash://add-transaction?type=income"
          style={{
            flex: 1,
            backgroundColor: '#03DAC6', // activeTheme.income
            borderRadius: 12,
            paddingVertical: 12,
            marginLeft: 8,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TextWidget
            text="+ Receita"
            style={{
              fontSize: 16,
              fontWeight: 'bold',
              color: '#121212',
            }}
          />
        </ActionWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
