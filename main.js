const DB_NAME = 'StartPageDB';
const DB_VERSION = 1;
let db;

// Initialize IndexedDB
function initDB()
{
	return new Promise((resolve, reject) =>
	{
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => reject(request.error);
		request.onsuccess = () =>
		{
			db = request.result;
			resolve(db);
		};

		request.onupgradeneeded = (event) =>
		{
			const db = event.target.result;
			if (!db.objectStoreNames.contains('settings'))
			{
				db.createObjectStore('settings', { keyPath: 'key' });
			}
			if (!db.objectStoreNames.contains('images'))
			{
				db.createObjectStore('images', { keyPath: 'key' });
			}
		};
	});
}

// Save data to IndexedDB
function saveToDb(storeName, data)
{
	return new Promise((resolve, reject) =>
	{
		const transaction = db.transaction([storeName], 'readwrite');
		const store = transaction.objectStore(storeName);
		const request = store.put(data);
		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}

// Get data from IndexedDB
function getFromDb(storeName, key)
{
	return new Promise((resolve, reject) =>
	{
		const transaction = db.transaction([storeName], 'readonly');
		const store = transaction.objectStore(storeName);
		const request = store.get(key);
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

// Get current CSS variable value
function getCSSVariable(variable)
{
	return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
}

// Get default colors based on current theme
function getDefaultColors()
{
	return
	({
		accentColor: getCSSVariable('--accent-color'),
		accentHoverColor: getCSSVariable('--accent-hover'),
		bgColor: getCSSVariable('--bg-color'),
		textColor: getCSSVariable('--text-main')
	});
}

// Default settings
let settings =
{
	searchProvider: 'https://www.google.com/search?q=',
	customSearchUrl: '',
	alignment: 'center',
	elementOrder: ['logo', 'search', 'bookmarks'],
	gridColumns: 4,
	bookmarkDisplay: 'both',
	bookmarkWidth: 120,
	bookmarkHeight: 120,
	iconSize: 'favicon',
	bookmarks: [],

	accentColor: '',
	accentHoverColor: '',
	bgColor: '',
	textColor: '',
	customCss: '',
	colorSwapMode: 'never'
};

// Load IndexedDB
async function loadSettings()
{
	const savedSettings = await getFromDb('settings', 'config');

	const defaultColors = getDefaultColors();

	if (savedSettings)
	{
		settings = { ...settings, ...savedSettings.value };

		if (!settings.accentColor) settings.accentColor = defaultColors.accentColor;
		if (!settings.accentHoverColor) settings.accentHoverColor = defaultColors.accentHoverColor;
		if (!settings.bgColor) settings.bgColor = defaultColors.bgColor;
		if (!settings.textColor) settings.textColor = defaultColors.textColor;
		if (!settings.iconSize) settings.iconSize = 'favicon';
	}
	else
	{
		// First time load
		settings.accentColor = defaultColors.accentColor;
		settings.accentHoverColor = defaultColors.accentHoverColor;
		settings.bgColor = defaultColors.bgColor;
		settings.textColor = defaultColors.textColor;
	}

	const logoData = await getFromDb('images', 'logo');
	if (logoData)
	{
		document.getElementById('logo').src = logoData.value;
		document.getElementById('logoContainer').style.display = 'block';
	}

	const bgData = await getFromDb('images', 'background');
	if (bgData)
	{
		document.body.style.backgroundImage = `url(${bgData.value})`;
	}

	applySettings();
}

// Apply settings to the page
function applySettings()
{
	// Alignment
	const container = document.getElementById('container');
	container.className = `container align-${settings.alignment}`;

	// Element order
	const elements =
	{
		'logo': document.getElementById('logoContainer'),
		'search': document.getElementById('searchContainer'),
		'bookmarks': document.getElementById('bookmarksContainer')
	};

	settings.elementOrder.forEach(key =>
	{
		container.appendChild(elements[key]);
	});

	// Grid
	const bookmarksContainer = document.getElementById('bookmarksContainer');
	bookmarksContainer.style.gridTemplateColumns = `repeat(${settings.gridColumns}, ${settings.bookmarkWidth}px)`;

	// Render bookmarks
	renderBookmarks();

	// Apply colors
	applyColors();

	// Update form
	document.getElementById('searchProvider').value = settings.searchProvider === settings.customSearchUrl ? 'custom' : settings.searchProvider;
	document.getElementById('customSearchUrl').value = settings.customSearchUrl;
	document.getElementById('alignment').value = settings.alignment;
	document.getElementById('gridColumns').value = settings.gridColumns;
	document.getElementById('bookmarkDisplay').value = settings.bookmarkDisplay;
	document.getElementById('bookmarkWidth').value = settings.bookmarkWidth;
	document.getElementById('bookmarkHeight').value = settings.bookmarkHeight;
	document.getElementById('iconSize').value = settings.iconSize;

	// Update styling form
	document.getElementById('accentColor').value = settings.accentColor;
	document.getElementById('accentColorText').value = settings.accentColor;
	document.getElementById('accentHoverColor').value = settings.accentHoverColor;
	document.getElementById('accentHoverColorText').value = settings.accentHoverColor;
	document.getElementById('bgColor').value = settings.bgColor;
	document.getElementById('bgColorText').value = settings.bgColor;
	document.getElementById('textColor').value = settings.textColor;
	document.getElementById('textColorText').value = settings.textColor;
	document.getElementById('customCss').value = settings.customCss;
	document.getElementById('colorSwapMode').value = settings.colorSwapMode;

	updateCustomSearchVisibility();
}

// Render bookmarks
function renderBookmarks()
{
	const container = document.getElementById('bookmarksContainer');
	container.innerHTML = '';

	settings.bookmarks.forEach((bookmark, index) =>
	{
		const elem = document.createElement(bookmark.isFolder ? 'div' : 'a');
		elem.className = bookmark.isFolder ? 'bookmark folder' : 'bookmark';
		elem.classList.add(`icon-${settings.iconSize}`);
		elem.style.width = `${settings.bookmarkWidth}px`;
		elem.style.height = `${settings.bookmarkHeight}px`;

		if (!bookmark.isFolder)
		{
			elem.href = bookmark.url;
			elem.target = '_blank';
		}

		if (settings.bookmarkDisplay === 'both' || settings.bookmarkDisplay === 'icon')
		{
			if (bookmark.icon)
			{
				const icon = document.createElement('img');
				icon.className = 'bookmark-icon';
				icon.src = bookmark.icon;
				elem.appendChild(icon);
			}
			else
			{
				const icon = document.createElement('div');
				icon.className = 'bookmark-icon';
				icon.textContent = bookmark.isFolder ? '🖿' : '⚑';
				icon.style.fontSize = settings.iconSize === 'cover' ? '48px' : '32px';
				elem.appendChild(icon);
			}
		}

		if (settings.bookmarkDisplay === 'both' || settings.bookmarkDisplay === 'text')
		{
			const text = document.createElement('div');
			text.className = 'bookmark-text';
			text.textContent = bookmark.name;
			elem.appendChild(text);
		}

		if (bookmark.isFolder)
		{
			elem.onclick = (e) =>
			{
				e.stopPropagation();
				elem.classList.toggle('open');
			};

			const folderItems = document.createElement('div');
			folderItems.className = 'folder-items';

			bookmark.items.forEach(item =>
			{
				const folderItem = document.createElement('a');
				folderItem.className = 'folder-item bookmark';
				folderItem.href = item.url;
				folderItem.target = '_blank';

				if (item.icon)
				{
					const icon = document.createElement('img');
					icon.className = 'bookmark-icon';
					icon.style.width = '20px';
					icon.style.height = '20px';
					icon.src = item.icon;
					folderItem.appendChild(icon);
				}

				const text = document.createElement('div');
				text.textContent = item.name;
				folderItem.appendChild(text);

				folderItems.appendChild(folderItem);
			});

			elem.appendChild(folderItems);
		}

		container.appendChild(elem);
	});

	renderBookmarksList();
}

// Visual bookmarks editor
let editingFolderIndex = null;

function renderBookmarksList()
{
	const list = document.getElementById('bookmarksList');
	list.innerHTML = '';

	const bookmarksToShow = editingFolderIndex !== null 
		? settings.bookmarks[editingFolderIndex].items 
		: settings.bookmarks;

	const header = document.createElement('div');
	header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;';

	const title = document.createElement('h3');
	title.textContent = editingFolderIndex !== null 
		? `Editing: ${settings.bookmarks[editingFolderIndex].name}` 
		: 'Bookmarks';
	title.style.margin = '0';
	header.appendChild(title);

	if (editingFolderIndex !== null)
	{
		const backBtn = document.createElement('button');
		backBtn.className = 'btn btn-secondary';
		backBtn.textContent = '← Back';
		backBtn.onclick = () =>
		{
			editingFolderIndex = null;
			renderBookmarksList();
		};
		header.appendChild(backBtn);
	}

	list.appendChild(header);

	bookmarksToShow.forEach((bookmark, index) =>
	{
		const item = document.createElement('div');
		item.className = 'bookmark-item draggable';
		item.draggable = true;
		item.dataset.index = index;
		item.dataset.isInFolder = editingFolderIndex !== null ? 'true' : 'false';

		const dragHandle = document.createElement('div');
		dragHandle.className = 'drag-handle';
		dragHandle.textContent = '⋮⋮';
		item.appendChild(dragHandle);

		const info = document.createElement('div');
		info.className = 'bookmark-item-info';

		if (bookmark.icon)
		{
			const iconPreview = document.createElement('img');
			iconPreview.src = bookmark.icon;
			iconPreview.style.cssText = 'width: 32px; height: 32px; object-fit: contain; margin-right: 12px; border-radius: 6px; background: var(--card-bg);';
			info.appendChild(iconPreview);
		}
		else
		{
			const iconPlaceholder = document.createElement('div');
			iconPlaceholder.textContent = bookmark.isFolder ? '🖿' : '⚑';
			iconPlaceholder.style.cssText = 'width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 20px;';
			info.appendChild(iconPlaceholder);
		}

		const textContainer = document.createElement('div');
		textContainer.style.flex = '1';

		const name = document.createElement('div');
		name.className = 'bookmark-item-name';
		name.textContent = bookmark.name;
		textContainer.appendChild(name);

		if (!bookmark.isFolder)
		{
			const url = document.createElement('div');
			url.className = 'bookmark-item-url';
			url.textContent = bookmark.url;
			textContainer.appendChild(url);
		}
		else if (editingFolderIndex === null)
		{
			const itemCount = document.createElement('div');
			itemCount.className = 'bookmark-item-url';
			itemCount.textContent = `${bookmark.items.length} items`;
			textContainer.appendChild(itemCount);
		}

		info.appendChild(textContainer);
		item.appendChild(info);

		const controls = document.createElement('div');
		controls.style.cssText = 'display: flex; gap: 8px;';

		if (bookmark.isFolder && editingFolderIndex === null)
		{
			const openBtn = document.createElement('button');
			openBtn.className = 'btn btn-secondary';
			openBtn.textContent = 'Open';
			openBtn.onclick = () =>
			{
				editingFolderIndex = index;
				renderBookmarksList();
			};
			controls.appendChild(openBtn);
		}

		const editBtn = document.createElement('button');
		editBtn.className = 'btn btn-secondary';
		editBtn.textContent = 'Edit';
		editBtn.onclick = () => openBookmarkEditor(index);
		controls.appendChild(editBtn);

		if (editingFolderIndex === null && !bookmark.isFolder)
		{
			const moveToFolderBtn = document.createElement('button');
			moveToFolderBtn.className = 'btn btn-secondary';
			moveToFolderBtn.textContent = '→';
			moveToFolderBtn.title = 'Move to folder';
			moveToFolderBtn.onclick = () => openMoveToFolderDialog(index);
			controls.appendChild(moveToFolderBtn);
		}

		if (editingFolderIndex !== null)
		{
			const moveOutBtn = document.createElement('button');
			moveOutBtn.className = 'btn btn-secondary';
			moveOutBtn.textContent = '←';
			moveOutBtn.title = 'Move out of folder';
			moveOutBtn.onclick = () => moveOutOfFolder(index);
			controls.appendChild(moveOutBtn);
		}

		const deleteBtn = document.createElement('button');
		deleteBtn.className = 'btn btn-danger';
		deleteBtn.textContent = '×';
		deleteBtn.title = 'Delete';
		deleteBtn.onclick = () => deleteBookmark(index);
		controls.appendChild(deleteBtn);

		item.appendChild(controls);
		list.appendChild(item);

		// Drag and drop
		item.addEventListener('dragstart', handleDragStart);
		item.addEventListener('dragover', handleDragOver);
		item.addEventListener('drop', handleDrop);
		item.addEventListener('dragend', handleDragEnd);
	});

	updateOrderControls();
}

let draggedIndex = null;
let draggedIsInFolder = false;

function handleDragStart(e)
{
	draggedIndex = parseInt(e.currentTarget.dataset.index);
	draggedIsInFolder = e.currentTarget.dataset.isInFolder === 'true';
	e.currentTarget.classList.add('dragging');
}

function handleDragOver(e)
{
	e.preventDefault();
	const draggableElement = e.target.closest('.draggable');
	if (draggableElement)
	{
		draggableElement.classList.add('drag-over');
	}
}

function handleDrop(e)
{
	e.preventDefault();
	const dropTarget = e.target.closest('.draggable');
	if (!dropTarget) return;

	dropTarget.classList.remove('drag-over');

	const dropIndex = parseInt(dropTarget.dataset.index);
	const dropIsInFolder = dropTarget.dataset.isInFolder === 'true';

	if (draggedIsInFolder === dropIsInFolder && draggedIndex !== dropIndex)
	{
		const arr = draggedIsInFolder 
			? settings.bookmarks[editingFolderIndex].items 
			: settings.bookmarks;

		const item = arr.splice(draggedIndex, 1)[0];
		arr.splice(dropIndex, 0, item);
		renderBookmarksList();
	}
}

function handleDragEnd(e)
{
	e.currentTarget.classList.remove('dragging');
	document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

// Bookmark Editor Modal
let currentEditingIndex = null;
let currentEditingIconDataUrl = null;

function openBookmarkEditor(index = null)
{
	currentEditingIndex = index;
	currentEditingIconDataUrl = null;

	const modal = document.getElementById('bookmarkEditorModal');
	const bookmarksArray = editingFolderIndex !== null 
		? settings.bookmarks[editingFolderIndex].items 
		: settings.bookmarks;

	const bookmark = index !== null ? bookmarksArray[index] : null;
	const isFolder = bookmark ? bookmark.isFolder : false;

	// Update modal title
	document.getElementById('editorModalTitle').textContent = 
		index !== null ? (isFolder ? 'Edit Folder' : 'Edit Bookmark') : 'Add Bookmark';

	// Show/hide fields based on type
	document.getElementById('editorUrlGroup').style.display = isFolder ? 'none' : 'block';
	document.getElementById('editorIconGroup').style.display = isFolder ? 'none' : 'block';

	// Populate fields
	document.getElementById('editorName').value = bookmark ? bookmark.name : '';
	document.getElementById('editorUrl').value = bookmark && !isFolder ? bookmark.url : '';
	document.getElementById('editorIconUrl').value = '';

	// Show current icon
	const iconPreview = document.getElementById('editorIconPreview');
	if (bookmark && bookmark.icon)
	{
		iconPreview.src = bookmark.icon;
		iconPreview.style.display = 'block';
		currentEditingIconDataUrl = bookmark.icon;
	}
	else
	{
		iconPreview.style.display = 'none';
	}

	// Clear file input
	document.getElementById('editorIconFile').value = '';

	modal.classList.add('active');
}

function closeBookmarkEditor()
{
	document.getElementById('bookmarkEditorModal').classList.remove('active');
	currentEditingIndex = null;
	currentEditingIconDataUrl = null;
}

function saveBookmarkFromEditor()
{
	const name = document.getElementById('editorName').value.trim();
	if (!name)
	{
		alert('Please enter a name');
		return;
	}

	const bookmarksArray = editingFolderIndex !== null 
		? settings.bookmarks[editingFolderIndex].items 
		: settings.bookmarks;

	const isEditing = currentEditingIndex !== null;
	const bookmark = isEditing ? bookmarksArray[currentEditingIndex] : {};

	bookmark.name = name;

	if (!bookmark.isFolder)
	{
		const url = document.getElementById('editorUrl').value.trim();
		if (!url)
		{
			alert('Please enter a URL');
			return;
		}
		bookmark.url = url;
		bookmark.icon = currentEditingIconDataUrl || bookmark.icon || '';
	}

	if (!isEditing)
	{
		bookmark.isFolder = false;
		bookmarksArray.push(bookmark);
	}

	renderBookmarksList();
	closeBookmarkEditor();
}

// Icon file handling
document.getElementById('editorIconFile').addEventListener('change', (e) =>
{
	const file = e.target.files[0];
	if (file)
	{
		const reader = new FileReader();
		reader.onload = (e) =>
		{
			currentEditingIconDataUrl = e.target.result;
			const preview = document.getElementById('editorIconPreview');
			preview.src = currentEditingIconDataUrl;
			preview.style.display = 'block';
			document.getElementById('editorIconUrl').value = '';
		};
		reader.readAsDataURL(file);
	}
});

document.getElementById('editorIconUrl').addEventListener('input', (e) =>
{
	const url = e.target.value.trim();
	if (url)
	{
		currentEditingIconDataUrl = url;
		const preview = document.getElementById('editorIconPreview');
		preview.src = url;
		preview.style.display = 'block';
		document.getElementById('editorIconFile').value = '';
	}
});

function clearEditorIcon()
{
	currentEditingIconDataUrl = null;
	document.getElementById('editorIconPreview').style.display = 'none';
	document.getElementById('editorIconUrl').value = '';
	document.getElementById('editorIconFile').value = '';
}

// Move to folder dialog
function openMoveToFolderDialog(bookmarkIndex)
{
	const folders = settings.bookmarks.filter(b => b.isFolder);

	if (folders.length === 0)
	{
		alert('No folders available. Create a folder first!');
		return;
	}

	const modal = document.getElementById('moveFolderModal');
	const list = document.getElementById('moveFolderList');
	list.innerHTML = '';

	folders.forEach((folder, i) =>
	{
		const actualIndex = settings.bookmarks.findIndex(b => b === folder);
		const item = document.createElement('div');
		item.className = 'folder-select-item';
		item.onclick = () =>
		{
			moveToFolder(bookmarkIndex, actualIndex);
			closeMoveToFolderDialog();
		};

		const icon = document.createElement('div');
		icon.textContent = '🖿';
		icon.style.fontSize = '24px';
		item.appendChild(icon);

		const info = document.createElement('div');
		info.style.flex = '1';

		const name = document.createElement('div');
		name.textContent = folder.name;
		name.style.fontWeight = '500';
		info.appendChild(name);

		const count = document.createElement('div');
		count.textContent = `${folder.items.length} items`;
		count.style.fontSize = '12px';
		count.style.color = 'var(--text-muted)';
		info.appendChild(count);

		item.appendChild(info);
		list.appendChild(item);
	});

	modal.classList.add('active');
}

function closeMoveToFolderDialog()
{
	document.getElementById('moveFolderModal').classList.remove('active');
}

function moveToFolder(bookmarkIndex, folderIndex)
{
	const bookmark = settings.bookmarks.splice(bookmarkIndex, 1)[0];
	settings.bookmarks[folderIndex > bookmarkIndex ? folderIndex - 1 : folderIndex].items.push(bookmark);
	renderBookmarksList();
}

function moveOutOfFolder(itemIndex)
{
	if (editingFolderIndex !== null)
	{
		const item = settings.bookmarks[editingFolderIndex].items.splice(itemIndex, 1)[0];
		settings.bookmarks.push(item);
		renderBookmarksList();
	}
}

function updateOrderControls()
{
	const controls = document.getElementById('orderControls');
	controls.innerHTML = '';

	const labels =
	{
		'logo': 'Logo',
		'search': 'Search',
		'bookmarks': 'Bookmarks'
	};

	settings.elementOrder.forEach((elem, index) =>
	{
		const btn = document.createElement('button');
		btn.className = 'btn btn-secondary';
		btn.textContent = `${index + 1}. ${labels[elem]}`;
		btn.onclick = () => moveElement(index);
		controls.appendChild(btn);
	});
}

function moveElement(index)
{
	if (index < settings.elementOrder.length - 1)
	{
		[settings.elementOrder[index], settings.elementOrder[index + 1]] = 
		[settings.elementOrder[index + 1], settings.elementOrder[index]];
		updateOrderControls();
	}
}

// Search
document.getElementById('searchBox').addEventListener('keypress', (e) =>
{
	if (e.key === 'Enter')
	{
		const query = e.target.value.trim();
		if (query)
		{
			let searchUrl = settings.searchProvider;
			if (searchUrl === 'custom' || searchUrl === settings.customSearchUrl)
			{
				searchUrl = settings.customSearchUrl.replace('{query}', encodeURIComponent(query));
			}
			else
			{
				searchUrl = searchUrl + encodeURIComponent(query);
			}
			window.location.href = searchUrl;
		}
	}
});

// Settings modal functions
function openSettings()
{
	document.getElementById('settingsModal').classList.add('active');
}

function closeSettings()
{
	document.getElementById('settingsModal').classList.remove('active');
	editingFolderIndex = null;
}

function switchTab(tabName)
{
	document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
	document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

	event.target.classList.add('active');
	document.getElementById(tabName + 'Tab').classList.add('active');
}

// Image handling
document.getElementById('logoInput').addEventListener('change', async (e) =>
{
	const file = e.target.files[0];
	if (file)
	{
		const reader = new FileReader();
		reader.onload = async (e) =>
		{
			const dataUrl = e.target.result;
			document.getElementById('logo').src = dataUrl;
			document.getElementById('logoContainer').style.display = 'block';
			await saveToDb('images', { key: 'logo', value: dataUrl });
		};
		reader.readAsDataURL(file);
	}
});

document.getElementById('backgroundInput').addEventListener('change', async (e) =>
{
	const file = e.target.files[0];
	if (file)
	{
		const reader = new FileReader();
		reader.onload = async (e) =>
		{
			const dataUrl = e.target.result;
			document.body.style.backgroundImage = `url(${dataUrl})`;
			await saveToDb('images', { key: 'background', value: dataUrl });
		};
		reader.readAsDataURL(file);
	}
});

function clearLogo()
{
	document.getElementById('logo').src = '';
	document.getElementById('logoContainer').style.display = 'none';
	document.getElementById('logoInput').value = '';
	const transaction = db.transaction(['images'], 'readwrite');
	transaction.objectStore('images').delete('logo');
}

function clearBackground()
{
	document.body.style.backgroundImage = '';
	document.getElementById('backgroundInput').value = '';
	const transaction = db.transaction(['images'], 'readwrite');
	transaction.objectStore('images').delete('background');
}

document.getElementById('searchProvider').addEventListener('change', updateCustomSearchVisibility);

function updateCustomSearchVisibility()
{
	const select = document.getElementById('searchProvider');
	const customGroup = document.getElementById('customSearchGroup');
	customGroup.style.display = select.value === 'custom' ? 'block' : 'none';
}

// Bookmark management
function addBookmark()
{
	openBookmarkEditor();
}

function addFolder()
{
	if (editingFolderIndex !== null)
	{
		alert('Cannot create folders inside folders!');
		return;
	}

	const name = prompt('Folder name:');
	if (!name) return;

	settings.bookmarks.push({ name, items: [], isFolder: true });
	renderBookmarksList();
}

function deleteBookmark(index)
{
	const bookmarksArray = editingFolderIndex !== null 
		? settings.bookmarks[editingFolderIndex].items 
		: settings.bookmarks;

	const bookmark = bookmarksArray[index];
	const message = bookmark.isFolder 
		? `Delete folder "${bookmark.name}" and all its contents?`
		: `Delete "${bookmark.name}"?`;

	if (confirm(message))
	{
		bookmarksArray.splice(index, 1);
		renderBookmarksList();
	}
}

// Save settings
async function saveSettings()
{
	const searchProvider = document.getElementById('searchProvider').value;

	settings.searchProvider = searchProvider === 'custom' ? 
		document.getElementById('customSearchUrl').value : 
		searchProvider;

	settings.customSearchUrl = document.getElementById('customSearchUrl').value;
	settings.alignment = document.getElementById('alignment').value;
	settings.gridColumns = parseInt(document.getElementById('gridColumns').value);
	settings.bookmarkDisplay = document.getElementById('bookmarkDisplay').value;
	settings.bookmarkWidth = parseInt(document.getElementById('bookmarkWidth').value);
	settings.bookmarkHeight = parseInt(document.getElementById('bookmarkHeight').value);
	settings.iconSize = document.getElementById('iconSize').value;

	settings.accentColor = document.getElementById('accentColor').value;
	settings.accentHoverColor = document.getElementById('accentHoverColor').value;
	settings.bgColor = document.getElementById('bgColor').value;
	settings.textColor = document.getElementById('textColor').value;
	settings.customCss = document.getElementById('customCss').value;
	settings.colorSwapMode = document.getElementById('colorSwapMode').value;

	await saveToDb('settings', { key: 'config', value: settings });
	applySettings();
	closeSettings();
}

async function resetSettings()
{
	if (confirm('Reset all settings? This will clear everything!'))
	{
		const transaction = db.transaction(['settings', 'images'], 'readwrite');
		transaction.objectStore('settings').clear();
		transaction.objectStore('images').clear();
		location.reload();
	}
}


// Apply color settings
function applyColors()
{
	const root = document.documentElement;

	const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
	const shouldSwap = (settings.colorSwapMode === 'light' && !isDarkMode) || 
		(settings.colorSwapMode === 'dark' && isDarkMode);

	let accentColor = settings.accentColor;
	let accentHoverColor = settings.accentHoverColor;
	let bgColor = settings.bgColor;
	let textColor = settings.textColor;

	if (shouldSwap)
	{
		[bgColor, textColor] = [textColor, bgColor];
	}

	root.style.setProperty('--accent-color', accentColor);
	root.style.setProperty('--accent-hover', accentHoverColor);
	root.style.setProperty('--bg-color', bgColor);
	root.style.setProperty('--text-main', textColor);

	// Apply custom CSS
	let customStyleElement = document.getElementById('customStyleSheet');
	if (!customStyleElement)
	{
		customStyleElement = document.createElement('style');
		customStyleElement.id = 'customStyleSheet';
		document.head.appendChild(customStyleElement);
	}
	customStyleElement.textContent = settings.customCss;
}

function setupColorPickers()
{
	const colorInputs =
	[
		{ picker: 'accentColor', text: 'accentColorText', setting: 'accentColor' },
		{ picker: 'accentHoverColor', text: 'accentHoverColorText', setting: 'accentHoverColor' },
		{ picker: 'bgColor', text: 'bgColorText', setting: 'bgColor' },
		{ picker: 'textColor', text: 'textColorText', setting: 'textColor' }
	];

	colorInputs.forEach(({ picker, text }) =>
	{
		document.getElementById(picker).addEventListener('input', (e) =>
		{
			document.getElementById(text).value = e.target.value;
		});

		document.getElementById(text).addEventListener('input', (e) =>
		{
			const color = e.target.value;
			if (/^#[0-9A-F]{6}$/i.test(color))
			{
				document.getElementById(picker).value = color;
			}
		});
	});
}

function clearCustomCss()
{
	if (confirm('Clear all custom CSS?'))
	{
		document.getElementById('customCss').value = '';
		settings.customCss = '';
		applyColors();
	}
}

function resetColors()
{
	if (confirm('Reset all colors to default?'))
	{
		const defaultColors = getDefaultColors();
		settings.accentColor = defaultColors.accentColor;
		settings.accentHoverColor = defaultColors.accentHoverColor;
		settings.bgColor = defaultColors.bgColor;
		settings.textColor = defaultColors.textColor;

		document.getElementById('accentColor').value = settings.accentColor;
		document.getElementById('accentColorText').value = settings.accentColor;
		document.getElementById('accentHoverColor').value = settings.accentHoverColor;
		document.getElementById('accentHoverColorText').value = settings.accentHoverColor;
		document.getElementById('bgColor').value = settings.bgColor;
		document.getElementById('bgColorText').value = settings.bgColor;
		document.getElementById('textColor').value = settings.textColor;
		document.getElementById('textColorText').value = settings.textColor;

		applyColors();
	}
}

// Close folder when clicking outside
document.addEventListener('click', () =>
{
	document.querySelectorAll('.folder.open').forEach(folder =>
	{
		folder.classList.remove('open');
	});
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () =>
{
	if (settings.colorSwapMode !== 'never')
	{
	applyColors();
	}
});

// Initialize
initDB().then(() =>
{
	loadSettings();
	setupColorPickers();
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () =>
	{
		if (settings.colorSwapMode !== 'never')
		{
			applyColors();
		}
	});
});