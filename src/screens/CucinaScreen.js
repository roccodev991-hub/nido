import { useState } from 'react';
import ListaScreen from './ListaScreen';
import DispensaScreen from './DispensaScreen';
import MenuScreen from './MenuScreen';

// `sezioneIniziale` la passa la home quando ti manda su un punto preciso
// (es. "vedi il menu di oggi"), altrimenti si parte dalla lista.
export default function CucinaScreen({ famigliaId, sezioneIniziale }) {
  const [sezione, setSezione] = useState(sezioneIniziale || 'lista');
  const props = { famigliaId, sezione, setSezione };

  if (sezione === 'dispensa') return <DispensaScreen {...props} />;
  if (sezione === 'menu') return <MenuScreen {...props} />;
  return <ListaScreen {...props} />;
}
