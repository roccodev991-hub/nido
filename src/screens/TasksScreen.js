import { useState } from 'react';
import FaccendeScreen from './FaccendeScreen';
import CasaScreen from './CasaScreen';

// Router del modulo Task: le faccende ricorrenti e i prodotti per la casa.
// `sezioneIniziale` arriva dalla home quando ti manda su un punto preciso.
export default function TasksScreen({ famigliaId, sezioneIniziale }) {
  const [sezione, setSezione] = useState(sezioneIniziale || 'faccende');
  const props = { famigliaId, sezione, setSezione };

  if (sezione === 'casa') return <CasaScreen {...props} />;
  return <FaccendeScreen {...props} />;
}
