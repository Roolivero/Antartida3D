import { beaufort, compassPoint, type Reading, type ReadingKind } from '@antartida/core';

export const NOTEBOOK_LABELS: Record<ReadingKind, { title: string; unit: string }> = {
  temp: { title: 'Termómetro (abrigo)', unit: '°C' },
  pressure: { title: 'Barómetro', unit: 'hPa' },
  wind: { title: 'Anemómetro y veleta', unit: 'km/h' },
  clouds: { title: 'Nubosidad', unit: 'octas' },
};

export function formatRecorded(kind: ReadingKind, val: number, reading: Reading): string {
  switch (kind) {
    case 'temp':
      return `${val > 0 ? '+' : ''}${val.toFixed(1).replace('.', ',')} °C`;
    case 'pressure':
      return `${val.toFixed(1).replace('.', ',')} hPa`;
    case 'wind': {
      const rumbo = compassPoint(reading.windDirDeg);
      const bf = beaufort(reading.windKmh);
      return `${Math.round(val)} km/h · ${rumbo} (${bf.name})`;
    }
    case 'clouds':
      return `${Math.round(val)}/8 octas`;
  }
}
