import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LayoutComponent from './Layout';
import { UserContext } from '../common/UserContext';

jest.mock('../common/authUtils', () => ({
  signOutUser: jest.fn(),
}));

beforeAll(() => {
  window.matchMedia = jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));
});

const renderLayout = path => render(
  <UserContext.Provider value={{ user: null }}>
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route element={<LayoutComponent />}>
          <Route path="/my-buddy/*" element={<div>Page content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  </UserContext.Provider>
);

test.each([
  ['/my-buddy/', null],
  ['/my-buddy/poster', 'Poster'],
  ['/my-buddy/links', 'Links'],
  ['/my-buddy/auth', 'Auth'],
])('shows the breadcrumb in the navbar for %s', (path, label) => {
  renderLayout(path);

  const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
  const home = within(breadcrumb).getByRole('link', { name: 'My Buddy home' });
  expect(breadcrumb.closest('header')).not.toBeNull();
  expect(home).toHaveAttribute('href', '/my-buddy/');
  expect(screen.getByText('Page content').closest('main').querySelector('.ant-breadcrumb')).toBeNull();

  if (label) {
    expect(within(breadcrumb).getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page');
    expect(breadcrumb).toHaveTextContent(`My Buddy\u00b7${label}`);
    expect(within(breadcrumb).getAllByRole('link')).toHaveLength(2);
  } else {
    expect(home).toHaveAttribute('aria-current', 'page');
    expect(within(breadcrumb).getAllByRole('link')).toHaveLength(1);
  }
});

test('preserves nested breadcrumb links and navigation back home', () => {
  renderLayout('/my-buddy/links/saved-links');

  const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
  expect(within(breadcrumb).getByRole('link', { name: 'Links' })).toHaveAttribute('href', '/my-buddy/links');
  expect(within(breadcrumb).getByRole('link', { name: 'Saved links' })).toHaveAttribute('aria-current', 'page');

  fireEvent.click(within(breadcrumb).getByRole('link', { name: 'My Buddy home' }));
  expect(within(breadcrumb).getAllByRole('link')).toHaveLength(1);
  expect(within(breadcrumb).getByRole('link', { name: 'My Buddy home' })).toHaveAttribute('aria-current', 'page');
});
