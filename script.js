// ===========================
// IA Actu FR — Script principal
// ===========================

// ─── Configuration API ──────────────────────────────────
const API_KEY = CONFIG.API_KEY; // Remplacez par votre clé
const API_URL = 'https://newsapi.org/v2/everything';
const FAVORITES_KEY = 'iaactu_favorites';

// Query pour filtrer uniquement les articles IA
const query = '("intelligence artificielle" OR "IA générative" OR ChatGPT OR "GPT-4" OR "GPT-5" OR Claude OR "Claude AI" OR Anthropic OR OpenAI OR "machine learning" OR "apprentissage automatique" OR "deep learning" OR "apprentissage profond" OR LLM OR "modèle de langage" OR Gemini OR Mistral OR "réseaux de neurones") NOT (foot OR football OR radio OR sport OR musique)';

// ─── État de l'application ──────────────────────────────
let allArticles = [];
let favorites = [];
let currentFilter = 'all';
let currentSource = 'all';

// ─── Éléments DOM ───────────────────────────────────────
const articlesGrid = document.getElementById('articles-grid');
const favoritesSection = document.getElementById('favorites-section');
const favoritesGrid = document.getElementById('favorites-grid');
const loadingElement = document.getElementById('loading');
const searchInput = document.getElementById('search');
const sourceFilter = document.getElementById('source-filter');
const filterButtons = document.querySelectorAll('.filter-btn');
const refreshBtn = document.getElementById('refresh-btn');
const toggleFavoritesBtn = document.getElementById('toggle-favorites');
const favoritesCount = document.getElementById('favorites-count');

// ─── Initialisation ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadFavorites();
    fetchNews();
    setupEventListeners();
});

// ─── Event Listeners ────────────────────────────────────
function setupEventListeners() {
    // Recherche
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    
    // Filtres
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            displayArticles();
        });
    });
    
    // Source filter
    sourceFilter.addEventListener('change', (e) => {
        currentSource = e.target.value;
        displayArticles();
    });
    
    // Refresh
    refreshBtn.addEventListener('click', fetchNews);
    
    // Toggle favoris
    toggleFavoritesBtn.addEventListener('click', () => {
        favoritesSection.classList.toggle('hidden');
        displayFavorites();
    });
}

// ─── Fetch News ─────────────────────────────────────────
async function fetchNews() {
    showLoading();
    
    try {
        // Query ultra-ciblée IA uniquement
        const query = '("intelligence artificielle" OR ChatGPT OR "GPT-4" OR "GPT-5" OR Claude OR "Claude AI" OR Anthropic OR OpenAI OR "machine learning" OR "apprentissage automatique" OR "deep learning" OR LLM OR "modèle de langage" OR Gemini OR Mistral OR "réseau de neurones" OR "IA générative") NOT (foot OR football OR radio OR sport OR musique OR météo OR cinéma OR "jeux vidéo")';
        
        const url = `${API_URL}?q=${encodeURIComponent(query)}&language=fr&sortBy=publishedAt&pageSize=50&apiKey=${API_KEY}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Erreur API: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.articles && data.articles.length > 0) {
            // FILTRAGE CÔTÉ CLIENT - SUPER STRICT
            const filteredArticles = filterAIArticles(data.articles);
            
            if (filteredArticles.length > 0) {
                allArticles = filteredArticles;
                populateSourceFilter();
                displayArticles();
            } else {
                showMessage('Aucun article IA trouvé pour le moment.');
            }
        } else {
            showMessage('Aucun article trouvé sur l\'IA pour le moment.');
        }
        
    } catch (error) {
        console.error('Erreur:', error);
        showMessage('Impossible de charger les actualités. Vérifiez votre connexion et votre clé API.');
    } finally {
        hideLoading();
    }
}
// ─── Filtrage strict des articles IA ────────────────
function filterAIArticles(articles) {
    // Mots-clés IA OBLIGATOIRES (au moins un doit être présent)
    const aiKeywords = [
        'intelligence artificielle',
        'ia générative',
        'chatgpt',
        'gpt-4',
        'gpt-5',
        'gpt',
        'claude',
        'anthropic',
        'openai',
        'machine learning',
        'apprentissage automatique',
        'deep learning',
        'apprentissage profond',
        'llm',
        'modèle de langage',
        'gemini',
        'mistral',
        'réseau de neurones',
        'neural network',
        'transformers',
        'bert',
        'stable diffusion',
        'midjourney',
        'dall-e',
        'génération',
        'agents ia',
        'ia conversationnelle',
        'assistant virtuel',
        'algorithme'
    ];
    
    // Mots à EXCLURE (si présents, article rejeté)
    const excludeKeywords = [
        'foot',
        'football',
        'radio',
        'sport',
        'musique',
        'météo',
        'cinéma',
        'film',
        'série',
        'jeux vidéo',
        'gaming',
        'cuisine',
        'recette',
        'voyage',
        'tourisme',
        'santé',
        'médical',
        'politique',
        'élection',
        'gouvernement',
        'crypto',
        'bitcoin',
        'nft'
    ];
    
    return articles.filter(article => {
        // Combine titre + description pour analyse
        const text = `${article.title || ''} ${article.description || ''}`.toLowerCase();
        
        // 1. L'article DOIT contenir au moins un mot-clé IA
        const hasAIKeyword = aiKeywords.some(keyword => text.includes(keyword));
        
        // 2. L'article NE DOIT PAS contenir de mots exclus
        const hasExcludedKeyword = excludeKeywords.some(keyword => text.includes(keyword));
        
        // 3. Validation supplémentaire : vérifier que c'est vraiment de l'IA
        // Si le titre contient "IA" ou "intelligence artificielle", c'est bon
        const titleLower = (article.title || '').toLowerCase();
        const isDefinitelyAI = titleLower.includes('ia ') || 
                               titleLower.includes(' ia') || 
                               titleLower.includes('intelligence artificielle') ||
                               titleLower.includes('chatgpt') ||
                               titleLower.includes('openai') ||
                               titleLower.includes('anthropic');
        
        // Retourner true seulement si :
        // - A un mot-clé IA ET pas de mot exclu
        // OU
        // - Est définitivement un article IA (titre explicite)
        return (hasAIKeyword && !hasExcludedKeyword) || (isDefinitelyAI && !hasExcludedKeyword);
    });
}
// ─── Display Articles ───────────────────────────────────
function displayArticles() {
    const filteredArticles = getFilteredArticles();
    
    if (filteredArticles.length === 0) {
        articlesGrid.innerHTML = '<p class="no-results">Aucun article trouvé.</p>';
        return;
    }
    
    articlesGrid.innerHTML = filteredArticles.map(article => createArticleCard(article)).join('');
    
    // Ajouter les event listeners pour les boutons favoris
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const url = e.target.closest('.favorite-btn').dataset.url;
            toggleFavorite(url);
        });
    });
}

// ─── Filtrer les articles ───────────────────────────────
function getFilteredArticles() {
    let filtered = allArticles;
    
    // Filtre par recherche
    const searchTerm = searchInput.value.toLowerCase().trim();
    if (searchTerm) {
        filtered = filtered.filter(article => {
            const title = article.title?.toLowerCase() || '';
            const description = article.description?.toLowerCase() || '';
            return title.includes(searchTerm) || description.includes(searchTerm);
        });
    }
    
    // Filtre par source
    if (currentSource !== 'all') {
        filtered = filtered.filter(article => article.source.name === currentSource);
    }
    
    return filtered;
}

// ─── Créer une carte article ────────────────────────────
function createArticleCard(article) {
    const isFavorite = favorites.some(fav => fav.url === article.url);
    const imageUrl = article.urlToImage || 'https://via.placeholder.com/400x200/667eea/ffffff?text=IA+Actu';
    const timeAgo = getTimeAgo(article.publishedAt);
    
    return `
        <article class="article-card">
            <img src="${imageUrl}" alt="${article.title}" onerror="this.src='https://via.placeholder.com/400x200/667eea/ffffff?text=IA+Actu'">
            <div class="article-content">
                <div class="article-meta">
                    <span class="source">${article.source.name}</span>
                    <span class="date">${timeAgo}</span>
                </div>
                <h3 class="article-title">${article.title}</h3>
                <p class="article-description">${article.description || 'Pas de description disponible.'}</p>
                <div class="article-actions">
                    <a href="${article.url}" target="_blank" rel="noopener noreferrer" class="read-btn">Lire l'article</a>
                    <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-url="${article.url}" title="${isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}">
                        ${isFavorite ? '⭐' : '☆'}
                    </button>
                </div>
            </div>
        </article>
    `;
}

// ─── Gestion des favoris ────────────────────────────────
function toggleFavorite(url) {
    const article = allArticles.find(a => a.url === url);
    if (!article) return;
    
    const index = favorites.findIndex(fav => fav.url === url);
    
    if (index > -1) {
        // Retirer des favoris
        favorites.splice(index, 1);
    } else {
        // Ajouter aux favoris
        favorites.push(article);
    }
    
    saveFavorites();
    updateFavoritesCount();
    displayArticles();
    if (!favoritesSection.classList.contains('hidden')) {
        displayFavorites();
    }
}

function loadFavorites() {
    const saved = localStorage.getItem(FAVORITES_KEY);
    favorites = saved ? JSON.parse(saved) : [];
    updateFavoritesCount();
}

function saveFavorites() {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

function updateFavoritesCount() {
    favoritesCount.textContent = favorites.length;
}

function displayFavorites() {
    if (favorites.length === 0) {
        favoritesGrid.innerHTML = '<p class="no-results">Aucun article en favoris pour le moment.</p>';
        return;
    }
    
    favoritesGrid.innerHTML = favorites.map(article => createArticleCard(article)).join('');
    
    // Ajouter les event listeners
    favoritesGrid.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const url = e.target.closest('.favorite-btn').dataset.url;
            toggleFavorite(url);
        });
    });
}

// ─── Populate source filter ─────────────────────────────
function populateSourceFilter() {
    const sources = [...new Set(allArticles.map(article => article.source.name))].sort();
    
    sourceFilter.innerHTML = '<option value="all">Toutes les sources</option>' +
        sources.map(source => `<option value="${source}">${source}</option>`).join('');
}

// ─── Utilitaires ────────────────────────────────────────
function handleSearch() {
    displayArticles();
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    const intervals = {
        'an': 31536000,
        'mois': 2592000,
        'jour': 86400,
        'heure': 3600,
        'minute': 60
    };
    
    for (const [name, secondsInInterval] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInInterval);
        
        if (interval >= 1) {
            if (name === 'jour' && interval === 1) return 'Hier';
            if (name === 'heure' && interval < 24) return `Il y a ${interval}h`;
            if (name === 'minute' && interval < 60) return `Il y a ${interval} min`;
            return `Il y a ${interval} ${name}${interval > 1 && name !== 'mois' ? 's' : ''}`;
        }
    }
    
    return 'À l\'instant';
}

function showLoading() {
    loadingElement.classList.remove('hidden');
    articlesGrid.innerHTML = '';
}

function hideLoading() {
    loadingElement.classList.add('hidden');
}

function showMessage(message) {
    articlesGrid.innerHTML = `<p class="no-results">${message}</p>`;
}