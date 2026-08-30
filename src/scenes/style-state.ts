export interface StyleState {
  figureColor: number;
  figureOpacity: number;
  figureLineWidth: number;
  gridColor: number;
  gridVisible: boolean;
}

export const defaultStyleState = (): StyleState => ({
  figureColor: 0xffff00,
  figureOpacity: 1,
  figureLineWidth: 0.06,
  gridColor: 0x227799,
  gridVisible: true,
});
