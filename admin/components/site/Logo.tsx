import { Icon } from './Icon';
import s from '../../app/(site)/site.module.css';

/** Brand mark, same as the mobile app: gradient tile with a pulse line, then the wordmark. */
export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={s.logo} style={light ? { color: '#fff' } : undefined}>
      <span className={s.logoMark}>
        <Icon name="pulse" size={20} color="#fff" strokeWidth={2.4} />
      </span>
      mediqo
    </span>
  );
}
