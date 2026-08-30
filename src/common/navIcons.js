import {
  CheckSquareOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  CalendarOutlined,
  ThunderboltOutlined,
  DatabaseOutlined,
  CloudServerOutlined,
  AppstoreOutlined,
  PictureOutlined,
  FileTextOutlined,
} from '@ant-design/icons';

// Icon components (not elements) so each consumer can size and colour them.
const navIcons = {
  todo: CheckSquareOutlined,
  timer: ClockCircleOutlined,
  expense: DollarOutlined,
  cal: CalendarOutlined,
  battery: ThunderboltOutlined,
  admin: DatabaseOutlined,
  dbadmin: CloudServerOutlined,
  poster: PictureOutlined,
  invoice: FileTextOutlined,
  dump: AppstoreOutlined,
};

export const navIconColors = {
  todo: 'var(--color-primary)',
  timer: '#06b6d4',
  expense: '#10b981',
  cal: '#f59e0b',
  battery: '#ef4444',
  admin: '#64748b',
  dbadmin: '#d1651d',
  poster: '#8b5cf6',
  invoice: '#0ea5e9',
  dump: '#94a3b8',
};

export const iconFor = (slug) => navIcons[slug] || AppstoreOutlined;

export const colorFor = (slug) => navIconColors[slug] || 'var(--color-text-muted)';
