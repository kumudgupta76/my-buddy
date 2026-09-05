import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import PosterFinder from './PosterFinder';
import { UserContext } from '../../common/UserContext';
import { fetchData, saveData } from '../../common/dbUtils';

jest.mock('../../common/dbUtils', () => ({ fetchData: jest.fn(), saveData: jest.fn() }));
jest.mock('../../common/utils', () => ({
    isMobile: () => true,
    COLLECTION_NAME: 'test-users',
    POSTER_DATA_KEY: 'poster-data',
    POSTER_SETTINGS_KEY: 'poster-settings',
}));

beforeEach(() => {
    window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
    }));
    Element.prototype.scrollIntoView = jest.fn();
    saveData.mockResolvedValue({ success: true });
    fetchData.mockResolvedValue({
        success: true,
        data: {
            'poster-data': ['First movie', 'Second movie'].map((title, index) => ({
                id: `poster-${index}`,
                title,
                image: { url: `/assets/test-poster-${index}.jpg`, source: 'test', kind: 'movie' },
                createdAt: '2026-09-05T00:00:00.000Z',
            })),
            'poster-settings': { selectedIds: [], useDefaultBg: false },
        },
    });
});

const renderPosters = () => render(
    <UserContext.Provider value={{ user: { uid: 'local-test-user' } }}>
        <PosterFinder />
    </UserContext.Provider>
);

test('mobile action menu previews a poster without selecting it', async () => {
    renderPosters();
    fireEvent.click(await screen.findByRole('button', { name: 'Actions for First movie' }));
    const menu = await screen.findByRole('menu');
    expect(within(menu).getAllByRole('menuitem')).toHaveLength(4);
    fireEvent.click(within(menu).getByRole('menuitem', { name: /Preview/ }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('2 titles saved')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Select First movie' })).not.toBeChecked();
});

test('two selected posters open the collage builder with editing controls', async () => {
    renderPosters();
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Select First movie' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Second movie' }));
    fireEvent.click(screen.getByRole('button', { name: /Create collage \(2\)/ }));
    expect(await screen.findByRole('heading', { name: 'Create poster collage' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download collages/ })).toBeEnabled();
    expect(screen.getByRole('tab', { name: /Posters/, selected: true })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hide', exact: true }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Create poster collage' })).not.toBeInTheDocument());
    expect(screen.getByText('2 of 2 selected')).toBeInTheDocument();
});