import { label } from '../utils';

const COLORS = {
  active: 'green', approved: 'green', present: 'green',
  pending: 'amber', on_leave: 'amber', half_day: 'amber', leave: 'blue',
  inactive: 'gray', completed: 'blue', cancelled: 'gray',
  rejected: 'red', absent: 'red',
  admin: 'purple', manager: 'blue', employee: 'gray',
};

export default function Badge({ value }) {
  if (!value) return <span className="muted">-</span>;
  return <span className={`badge badge-${COLORS[value] || 'gray'}`}>{label(value)}</span>;
}
