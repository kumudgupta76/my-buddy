import { fireEvent, render, screen, within } from '@testing-library/react';
import AuthActions from '../common/AuthActions';
import Todo from './todo/Todo';
import LocalStorageManager from './admin/LocalStorgeManager';
import GroceryFormModal from './grocery/GroceryFormModal';
import { fetchData } from '../common/dbUtils';

jest.mock('../common/authUtils', () => ({
  getCurrentUser: () => ({ uid: 'ui-test' }),
  onAuthStateChangedListener: callback => {
    callback(null);
    return () => {};
  },
}));
jest.mock('../common/dbUtils', () => ({
  fetchData: jest.fn(),
  saveData: jest.fn(),
}));
jest.mock('react-quill', () => () => <div>Rich text editor</div>);

beforeEach(() => {
  localStorage.clear();
  window.innerWidth = 375;
  window.matchMedia = jest.fn().mockImplementation(query => ({
    matches: query === '(max-width: 575px)',
    media: query,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));
});

test('sign-in fields remain available inside the compact auth card', () => {
  render(<AuthActions />);
  expect(screen.getByLabelText('Email')).toBeInTheDocument();
  expect(screen.getByLabelText('Password')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Sign In' })).toBeEnabled();
});

test('mobile todo actions retain accessible names and open the edit dialog', async () => {
  fetchData.mockResolvedValue({
    success: true,
    data: {
      'todo-data': [{ key: 'task-1', title: 'A long task title that must remain readable on a phone', date: '2026-10-01', checklist: [] }],
    },
  });
  render(<Todo />);
  fireEvent.click(await screen.findByRole('button', { name: 'Edit todo' }));
  const dialog = await screen.findByRole('dialog');
  expect(within(dialog).getByLabelText('Title')).toHaveValue('A long task title that must remain readable on a phone');
  expect(screen.getByRole('button', { name: 'Archive todo' })).toBeInTheDocument();
});

test('storage actions stay usable in the wrapping table layout', () => {
  localStorage.setItem('long-storage-key-without-spaces'.repeat(4), '{"value":1}');
  render(<LocalStorageManager />);
  expect(screen.getByRole('button', { name: 'Copy entry' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Delete entry' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Edit entry' }));
  expect(screen.getByPlaceholderText('Edit value')).toHaveValue('{"value":1}');
  expect(screen.getByRole('button', { name: 'Save', exact: true })).toBeInTheDocument();
});

test('purchase modal keeps all footer actions available', () => {
  const onCancel = jest.fn();
  render(<GroceryFormModal open records={[]} onCancel={onCancel} onSubmit={jest.fn()} />);
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByRole('button', { name: 'Add another' })).toBeEnabled();
  expect(within(dialog).getByRole('button', { name: 'Add', exact: true })).toBeEnabled();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel', exact: true }));
  expect(onCancel).toHaveBeenCalledTimes(1);
});
