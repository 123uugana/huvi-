import type {
  LivestockGender,
  LivestockStatus,
  RfidDirection,
} from '@/types/livestock';

export function formatGender(gender?: LivestockGender) {
  switch (gender) {
    case 'MALE':
      return 'Эр';
    case 'FEMALE':
      return 'Эм';
    default:
      return 'Тодорхойгүй';
  }
}

export function formatStatus(status?: LivestockStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'Идэвхтэй';
    case 'MISSING':
      return 'Дутуу';
    case 'INACTIVE':
      return 'Идэвхгүй';
    default:
      return 'Тодорхойгүй';
  }
}

export function formatDirection(direction?: RfidDirection) {
  switch (direction) {
    case 'ENTER':
      return 'Орсон';
    case 'EXIT':
      return 'Гарсан';
    case 'UNKNOWN':
      return 'Тодорхойгүй';
    default:
      return undefined;
  }
}
