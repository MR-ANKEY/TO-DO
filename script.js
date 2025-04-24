// Constants
const STORAGE_KEY = 'todos';
const MAX_SUGGESTIONS = 5;
const CHAR_LIMIT = 50;

// DOM Elements
const todoForm = document.getElementById('todo-form');
const todoNameInput = document.getElementById('todo-name');
const todoDetailsInput = document.getElementById('todo-details');
const todoList = document.getElementById('todo-list');
const totalCount = document.getElementById('total-count');
const activeCount = document.getElementById('active-count');
const completedCount = document.getElementById('completed-count');
const filterBtns = document.querySelectorAll('.filter-btn');
const themeToggle = document.querySelector('.theme-toggle');
const taskModal = document.getElementById('task-modal');
const modalTitleInput = document.getElementById('modal-title-input');
const modalDetailsInput = document.getElementById('modal-details-input');
const closeModal = document.querySelector('.close-modal');
const modalSaveBtn = document.getElementById('modal-save');
const modalDeleteBtn = document.getElementById('modal-delete');
const nameCharCount = document.getElementById('name-char-count');
const charCounter = document.querySelector('.char-counter');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const searchSuggestions = document.getElementById('search-suggestions');

// State
let todos = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let currentFilter = 'all';
let currentTaskId = null;
let suggestionClicked = false;

// Theme initialization
const theme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', theme);
updateThemeIcon();

// Event Listeners
function initializeEventListeners() {
    todoForm.addEventListener('submit', addTodo);
    filterBtns.forEach(btn => btn.addEventListener('click', () => setFilter(btn.dataset.filter)));
    themeToggle.addEventListener('click', toggleTheme);
    closeModal.addEventListener('click', closeTaskModal);
    modalSaveBtn.addEventListener('click', saveTaskChanges);
    modalDeleteBtn.addEventListener('click', deleteTaskFromModal);
    todoNameInput.addEventListener('input', updateCharCount);
    todoDetailsInput.addEventListener('input', autoGrow);
    modalDetailsInput.addEventListener('input', autoGrow);
    searchInput.addEventListener('input', handleSearch);
    searchInput.addEventListener('focus', handleSearch);
    
    searchInput.addEventListener('blur', () => {
        if (!suggestionClicked) {
            setTimeout(() => {
                searchSuggestions.classList.remove('active');
            }, 100);
        }
        suggestionClicked = false;
    });
    
    searchButton.addEventListener('click', (e) => {
        e.preventDefault();
        handleSearch();
    });

    taskModal.addEventListener('click', (e) => {
        if (e.target === taskModal) {
            closeTaskModal();
        }
    });

    // Initialize autoGrow for textareas
    [todoDetailsInput, modalDetailsInput].forEach(textarea => {
        textarea.addEventListener('input', function() {
            autoGrow.call(this);
        });
    });
}

// Todo Management Functions
function addTodo(e) {
    e.preventDefault();
    const todoName = todoNameInput.value.trim();
    const todoDetails = todoDetailsInput.value.trim();
    
    if (todoName) {
        const todo = {
            id: Date.now(),
            name: todoName,
            details: todoDetails,
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        todos.unshift(todo); // Add new todos at the beginning
        saveTodos();
        renderTodos();
        resetForm();
    }
}

function resetForm() {
    todoNameInput.value = '';
    todoDetailsInput.value = '';
    updateCharCount();
    todoDetailsInput.style.height = 'auto';
}

function deleteTodo(id) {
    todos = todos.filter(todo => todo.id !== id);
    saveTodos();
    renderTodos();
}

function toggleTodo(id) {
    todos = todos.map(todo => {
        if (todo.id === id) {
            return { ...todo, completed: !todo.completed };
        }
        return todo;
    });
    saveTodos();
    renderTodos();
}

// Search Functions
function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (taskModal.classList.contains('active')) {
        closeTaskModal();
    }
    
    if (searchTerm.length === 0) {
        searchSuggestions.classList.remove('active');
        return;
    }

    const suggestions = getSuggestions(searchTerm);
    if (suggestions.length > 0) {
        showSuggestions(suggestions, searchTerm);
    } else {
        searchSuggestions.classList.remove('active');
    }
}

function getSuggestions(searchTerm) {
    return todos
        .filter(todo => {
            const nameMatch = todo.name.toLowerCase().includes(searchTerm);
            const detailsMatch = todo.details?.toLowerCase().includes(searchTerm);
            return nameMatch || detailsMatch;
        })
        .slice(0, MAX_SUGGESTIONS);
}

function showSuggestions(suggestions, searchTerm) {
    const html = suggestions.map(todo => {
        const highlightedName = highlightMatch(todo.name, searchTerm);
        const highlightedDetails = todo.details ? highlightMatch(todo.details, searchTerm) : '';
        const date = formatDate(todo.createdAt);
        
        return `
            <div class="suggestion-item" data-id="${todo.id}">
                <div class="suggestion-title">${highlightedName}</div>
                ${todo.details ? `<div class="suggestion-details">${highlightedDetails}</div>` : ''}
                <div class="suggestion-date">${date}</div>
            </div>
        `;
    }).join('');

    searchSuggestions.innerHTML = html;
    searchSuggestions.classList.add('active');

    // Add click event listeners to suggestion items
    const suggestionItems = searchSuggestions.querySelectorAll('.suggestion-item');
    suggestionItems.forEach(item => {
        item.addEventListener('mousedown', (e) => {
            e.preventDefault();
            suggestionClicked = true;
            selectSuggestion(item.dataset.id);
        });
    });
}

function selectSuggestion(todoId) {
    const todo = todos.find(t => t.id === parseInt(todoId));
    if (todo) {
        searchInput.value = todo.name;
        searchSuggestions.classList.remove('active');
        
        if (currentFilter !== 'all') {
            setFilter('all');
        }
        
        openTaskModal(parseInt(todoId));
    }
}

// Modal Functions
function openTaskModal(id) {
    const task = todos.find(todo => todo.id === id);
    if (task) {
        currentTaskId = id;
        modalTitleInput.value = task.name;
        modalDetailsInput.value = task.details || '';
        
        const dateTimeStr = formatDate(task.createdAt, true);
        const modalHeader = document.querySelector('.modal-header');
        
        const existingDate = modalHeader.querySelector('.modal-date');
        if (existingDate) {
            existingDate.remove();
        }
        
        const dateElement = document.createElement('div');
        dateElement.className = 'modal-date';
        dateElement.innerHTML = `<i class="fas fa-calendar"></i> ${dateTimeStr}`;
        modalHeader.insertBefore(dateElement, modalHeader.querySelector('.close-modal'));
        
        taskModal.classList.add('active');
        taskModal.style.display = 'flex';
        modalTitleInput.focus();
        
        // Reset textarea height
        modalDetailsInput.style.height = 'auto';
        modalDetailsInput.style.height = modalDetailsInput.scrollHeight + 'px';
    }
}

function closeTaskModal() {
    taskModal.classList.remove('active');
    taskModal.style.display = 'none';
    currentTaskId = null;
}

function saveTaskChanges() {
    if (currentTaskId) {
        const taskName = modalTitleInput.value.trim();
        if (taskName) {
            todos = todos.map(todo => {
                if (todo.id === currentTaskId) {
                    return {
                        ...todo,
                        name: taskName,
                        details: modalDetailsInput.value.trim()
                    };
                }
                return todo;
            });
            saveTodos();
            renderTodos();
            closeTaskModal();
        }
    }
}

// Utility Functions
function formatDate(dateString, includeTime = false) {
    const date = new Date(dateString);
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    
    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
        options.hour12 = true;
    }
    
    return date.toLocaleDateString('en-US', options);
}

function highlightMatch(text, searchTerm) {
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<span class="suggestion-highlight">$1</span>');
}

function setFilter(filter) {
    currentFilter = filter;
    filterBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    renderTodos();
}

function updateTasksCount() {
    const totalTasks = todos.length;
    const completedTasks = todos.filter(todo => todo.completed).length;
    const activeTasks = totalTasks - completedTasks;
    
    totalCount.textContent = totalTasks;
    activeCount.textContent = activeTasks;
    completedCount.textContent = completedTasks;
}

function saveTodos() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    updateTasksCount();
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon();
}

function updateThemeIcon() {
    const icon = themeToggle.querySelector('i');
    const currentTheme = document.documentElement.getAttribute('data-theme');
    icon.className = currentTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
}

function updateCharCount() {
    const count = todoNameInput.value.length;
    nameCharCount.textContent = count;
    charCounter.classList.toggle('limit-reached', count >= CHAR_LIMIT);
}

function autoGrow() {
    requestAnimationFrame(() => {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
}

function renderTodos() {
    const filteredTodos = todos.filter(todo => {
        if (currentFilter === 'active') return !todo.completed;
        if (currentFilter === 'completed') return todo.completed;
        return true;
    });

    todoList.innerHTML = filteredTodos.map(todo => `
        <li class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
            <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
            <div class="todo-content">
                <div class="todo-header">
                    <div class="todo-title" onclick="openTaskModal(${todo.id})">${todo.name}</div>
                    <div class="todo-date">${formatDate(todo.createdAt)}</div>
                </div>
                ${todo.details ? `<div class="todo-details">${todo.details}</div>` : ''}
            </div>
            <button class="delete-btn">
                <i class="fas fa-trash"></i>
            </button>
        </li>
    `).join('');

    // Add event listeners to new elements
    todoList.querySelectorAll('.todo-item').forEach(item => {
        const id = parseInt(item.dataset.id);
        const checkbox = item.querySelector('.todo-checkbox');
        const deleteBtn = item.querySelector('.delete-btn');

        checkbox.addEventListener('change', () => toggleTodo(id));
        deleteBtn.addEventListener('click', () => deleteTodo(id));
    });
}

function deleteTaskFromModal() {
    if (currentTaskId) {
        deleteTodo(currentTaskId);
        closeTaskModal();
    }
}

// Initialize the app
function init() {
    initializeEventListeners();
    renderTodos();
    updateTasksCount();
}

// Start the app
init(); 