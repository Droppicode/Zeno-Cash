import React from 'react';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { ZenoWidget } from './ZenoWidget';

export async function widgetTaskHandler(props) {
  const widgetInfo = props.widgetInfo;
  const widgetAction = props.widgetAction;

  if (
    widgetAction === 'WIDGET_ADDED' ||
    widgetAction === 'WIDGET_UPDATE' ||
    widgetAction === 'WIDGET_RESIZED'
  ) {
    requestWidgetUpdate({
      widgetName: 'ZenoWidget',
      renderWidget: () => <ZenoWidget />,
      widgetInfo,
    });
  }
}
