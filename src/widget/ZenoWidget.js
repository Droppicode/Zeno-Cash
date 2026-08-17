import React from 'react';
import { FlexWidget, SvgWidget } from 'react-native-android-widget';

// Ícone premium de seta apontando para baixo-esquerda (Despesa)
const expenseSvg = `
<svg viewBox="0 0 24 24" width="32" height="32" stroke="#FFFFFF" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <line x1="17" y1="7" x2="7" y2="17"></line>
  <polyline points="17 17 7 17 7 7"></polyline>
</svg>
`;

// Ícone premium de seta apontando para cima-direita (Receita)
const incomeSvg = `
<svg viewBox="0 0 24 24" width="32" height="32" stroke="#FFFFFF" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <line x1="7" y1="17" x2="17" y2="7"></line>
  <polyline points="7 7 17 7 17 17"></polyline>
</svg>
`;

export function ZenoWidget() {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#121212', // Fundo mais escuro e elegante
        borderRadius: 24, // Bordas mais arredondadas (squircle style)
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: "zenocash://add-transaction?type=expense" }}
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundGradient: {
            from: '#FF4B4B',
            to: '#CF6679',
            orientation: 'TL_BR',
          },
          marginRight: 16,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <SvgWidget svg={expenseSvg} />
      </FlexWidget>

      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: "zenocash://add-transaction?type=income" }}
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundGradient: {
            from: '#00E676',
            to: '#03DAC6',
            orientation: 'TL_BR',
          },
          marginLeft: 16,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <SvgWidget svg={incomeSvg} />
      </FlexWidget>
    </FlexWidget>
  );
}
