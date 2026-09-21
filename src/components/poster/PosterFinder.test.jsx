import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import PosterFinder, { streamSuggestionResults } from './PosterFinder';
import { UserContext } from '../../common/UserContext';
import { fetchData, saveData } from '../../common/dbUtils';

jest.mock('../../common/UserContext', () => ({
    UserContext: require('react').createContext({ user: null }),
}));
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
    window.scrollTo = jest.fn();
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

test('publishes OMDB autocomplete results while TMDB is still pending', async () => {
    const omdbHits = [{ title: 'The Matrix', year: '1999', imdbID: 'tt0133093' }];
    const pendingTmdbSearch = new Promise(() => {});
    const onSuggestions = jest.fn();

    streamSuggestionResults(
        Promise.resolve(omdbHits),
        pendingTmdbSearch,
        { aborted: false },
        onSuggestions
    );

    await waitFor(() => expect(onSuggestions).toHaveBeenCalledWith(omdbHits));
});

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

test('opening Names settings shows the names preview while adjusting its size', async () => {
    renderPosters();
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Select First movie' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Second movie' }));
    fireEvent.click(screen.getByRole('button', { name: /Create collage \(2\)/ }));

    const settings = within(screen.getByRole('complementary'));
    fireEvent.click(settings.getByRole('tab', { name: /Names/ }));

    const previewTabs = within(screen.getByRole('tablist', { name: 'Preview mode' }));
    expect(previewTabs.getByRole('tab', { name: /Names/, selected: true })).toBeInTheDocument();
    const namesPreview = document.querySelector('.collage-names-list');
    expect(within(namesPreview).getByText(/First movie/)).toBeInTheDocument();

    const sizeSlider = within(screen.getByRole('tabpanel', { name: /Names/ })).getByRole('slider');
    fireEvent.keyDown(sizeSlider, { key: 'End', code: 'End', keyCode: 35 });
    expect(sizeSlider).toHaveAttribute('aria-valuenow', '160');
    expect(previewTabs.getByRole('tab', { name: /Names/, selected: true })).toBeInTheDocument();
});

test('pagination and created collages are visible by default for a single page', async () => {
    renderPosters();
    const pagination = await screen.findByRole('navigation', { name: 'Poster pagination', exact: true });
    expect(within(pagination).getByText('1-2 of 2 posters')).toBeInTheDocument();
    expect(within(pagination).getByRole('combobox', { name: 'Posters per page' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Show created collages' })).toBeChecked();
    expect(within(screen.getByRole('region', { name: 'Created collages' })).getByText('No collages created yet.')).toBeInTheDocument();
});

const libraryData = (settings = {}) => ({
    success: true,
    data: {
        'poster-data': Array.from({ length: 13 }, (_, index) => ({
            id: `movie-${index + 1}`,
            title: `Movie ${index + 1}`,
            image: { url: `/assets/movie-${index + 1}.jpg`, source: 'test', kind: 'movie' },
            createdAt: '2026-09-05T00:00:00.000Z',
        })),
        'poster-settings': { pageSize: 6, selectedIds: ['movie-1'], useDefaultBg: false, ...settings },
    },
});

test('page size resets the page, keeps selection and is saved', async () => {
    fetchData.mockResolvedValueOnce(libraryData());
    renderPosters();
    const pagination = await screen.findByRole('navigation', { name: 'Poster pagination', exact: true });
    expect(within(pagination).getByText('1-6 of 13 posters')).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox', { name: /^Select Movie/ })).toHaveLength(6);

    fireEvent.click(within(pagination).getByTitle('2'));
    expect(screen.getByRole('checkbox', { name: 'Select Movie 7', exact: true })).toBeInTheDocument();
    expect(within(pagination).getByText('7-12 of 13 posters')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Posters per page' }));
    fireEvent.click(screen.getByText('12', { selector: '.ant-select-item-option-content' }));
    expect(within(pagination).getByText('1-12 of 13 posters')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Select Movie 1', exact: true })).toBeChecked();

    await waitFor(() => expect(saveData).toHaveBeenLastCalledWith(
        'test-users',
        'local-test-user',
        expect.objectContaining({
            'poster-settings': expect.objectContaining({ pageSize: 12, selectedIds: ['movie-1'] }),
        })
    ));
});

test.each(['Large icons', 'Small icons', 'List', 'Details'])('respects page size in the %s view', async view => {
    fetchData.mockResolvedValueOnce(libraryData());
    renderPosters();
    const pagination = await screen.findByRole('navigation', { name: 'Poster pagination', exact: true });
    fireEvent.click(screen.getByRole('radio', { name: view, exact: true }));
    expect(within(pagination).getByText('1-6 of 13 posters')).toBeInTheDocument();
    if (view === 'Details') {
        expect(screen.getAllByRole('row')).toHaveLength(7);
    } else {
        expect(screen.getAllByRole('checkbox', { name: /^Select Movie/ })).toHaveLength(6);
    }
});

test('deleting the only poster on the last page returns to a valid page', async () => {
    fetchData.mockResolvedValueOnce(libraryData());
    renderPosters();
    const pagination = await screen.findByRole('navigation', { name: 'Poster pagination', exact: true });
    fireEvent.click(within(pagination).getByTitle('3'));
    fireEvent.click(screen.getByRole('button', { name: 'Actions for Movie 13' }));
    fireEvent.click(within(await screen.findByRole('menu')).getByRole('menuitem', { name: /Delete/ }));
    await waitFor(() => expect(within(pagination).getByText('7-12 of 12 posters')).toBeInTheDocument());
    expect(screen.getAllByRole('checkbox', { name: /^Select Movie/ })).toHaveLength(6);
});

test('created collage visibility is restored and saved without removing its history', async () => {
    const history = [{
        id: 'collage-1',
        title: 'Weekend picks',
        downloadedAt: '2026-09-05T00:00:00.000Z',
        posters: [{ id: 'movie-1', title: 'Movie 1' }],
    }];
    fetchData.mockResolvedValueOnce(libraryData({ showCollageHistory: false, collageHistory: history }));
    renderPosters();
    const toggle = await screen.findByRole('checkbox', { name: 'Show created collages' });
    expect(toggle).not.toBeChecked();
    expect(screen.queryByRole('region', { name: 'Created collages' })).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(within(screen.getByRole('region', { name: 'Created collages' })).getByText('Weekend picks')).toBeInTheDocument();
    await waitFor(() => expect(saveData).toHaveBeenLastCalledWith(
        'test-users',
        'local-test-user',
        expect.objectContaining({
            'poster-settings': expect.objectContaining({ showCollageHistory: true, collageHistory: history }),
        })
    ));
});