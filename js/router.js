/* js/router.js - ZAKTUALIZOWANA WERSJA */
(function() {
  const ROUTES = {
    'home': 'pages/home.json',
    'about': 'pages/about.json',
    'values': 'pages/values.json',
    'language': 'pages/language.json',
    'forum': 'pages/forum.json',
    'history': 'pages/history.json',
    'documents': 'pages/documents.json',
    'partners': 'pages/partners.json',
    'news': 'pages/news.json',
    'contact': 'pages/contact.json',
    'join': 'pages/join.json'
  };

  const cachePrefix = 'globo_page_';

  function resolveUrl(path) {
    return new URL(path, location.href).href;
  }

  async function fetchJson(path) {
    const url = resolveUrl(path);
    const cacheKey = cachePrefix + url;

    // Spróbuj z cache
    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      // ignore parse/cache errors
      console.warn('Cache read error', e);
    }

    const resp = await fetch(url, { cache: 'no-cache' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status + ' dla ' + path);

    // sprawdź content-type
    const ct = resp.headers.get('content-type') || '';
    const text = await resp.text();

    // jeśli content type mówi JSON, parsuj; jeśli nie, dalej spróbuj parsować.
    try {
      if (ct.includes('application/json') || ct.includes('text/json') || ct === '') {
        const data = JSON.parse(text);
        try { sessionStorage.setItem(cacheKey, JSON.stringify(data)); } catch(e){}
        return data;
      } else {
        // mimo wszystko spróbuj parsować
        const data = JSON.parse(text);
        try { sessionStorage.setItem(cacheKey, JSON.stringify(data)); } catch(e){}
        return data;
      }
    } catch (err) {
      // jeśli parsowanie się wywali — rzuć szczegółowy błąd
      const snippet = text.slice(0, 300).replace(/\n/g, '\\n');
      const message = `Błąd parsowania JSON z ${path}: ${err.message}. Fragment pliku: ${snippet}`;
      throw new Error(message);
    }
  }

  function setTitle(t) {
    if (t) document.title = t + ' — Republika Globo';
  }

  function renderHtml(html) {
    const app = document.getElementById('app');
    app.innerHTML = html;
    // inicjuj ewentualne Alpine w dynamicznym fragmencie (jeśli funkcja dostępna)
    if (window.Alpine && typeof window.Alpine.initTree === 'function') {
      try { window.Alpine.initTree(app); } catch(e){ console.warn('Alpine init error', e); }
    }
    // obsłuż data-src dynamiczne sloty
    processDynamicSlots(app);
  }

  async function processDynamicSlots(root) {
    const nodes = root.querySelectorAll('[data-src]');
    for (const el of nodes) {
      const src = el.getAttribute('data-src');
      if (!src) continue;
      try {
        const data = await fetchJson(src);
        if (Array.isArray(data.items)) {
          el.innerHTML = data.items.map(it => (
            `<article class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">\
               <h3 class="font-semibold mb-1">${escapeHtml(it.title)}</h3>\
               <p class="text-sm text-gray-600 dark:text-gray-300">${escapeHtml(it.excerpt || '')}</p>\
               <div class="mt-2 text-sm"><a href="#/news/${it.id}" class="text-blue-600 dark:text-blue-400 inline-flex items-center">Czytaj więcej <i class="fas fa-arrow-right ml-2"></i></a></div>\
             </article>`
          )).join('');
        } else if (data.content) {
          el.innerHTML = data.content;
          
          // Inicjalizacja formularza kontaktowego po załadowaniu
          if (src.includes('contact.json')) {
            initContactForm();
          }
        } else {
          el.innerHTML = '<div class="text-gray-500">Brak treści</div>';
        }
      } catch (e) {
        el.innerHTML = `<div class="text-red-500">Błąd ładowania: ${escapeHtml(e.message)}</div>`;
      }
    }
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, function(m) {
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[m];
    });
  }

  async function loadNewsArticle(newsId) {
    const app = document.getElementById('app');
    app.innerHTML = '<div class="text-center text-gray-500 flex flex-col items-center justify-center min-h-[50vh]"><div class="globe-spinner mb-4"></div><p>Ładowanie artykułu...</p></div>';

    try {
      // Spróbuj załadować konkretny artykuł
      const articleData = await fetchJson(`pages/news/${newsId}.json`);
      setTitle(articleData.title || 'Republika Globo');
      renderHtml(articleData.content || '<div class="p-6 bg-white dark:bg-gray-800 rounded-lg">Brak treści artykułu</div>');
    } catch (err) {
      // Jeśli nie znaleziono artykułu, wróć do listy newsów
      console.error('Nie znaleziono artykułu:', err);
      location.hash = '#/news';
    }
  }

  // Funkcja do obsługi formularza kontaktowego
  function initContactForm() {
    const contactForm = document.getElementById('contactForm');
    if (!contactForm) return;
    
    const formMessage = document.getElementById('formMessage');
    const submitText = document.getElementById('submitText');
    const submitSpinner = document.getElementById('submitSpinner');
    
    contactForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      // Pokaż spinner, ukryj tekst
      submitText.classList.add('hidden');
      submitSpinner.classList.remove('hidden');
      
      // Zbierz dane z formularza
      const formData = new FormData(contactForm);
      const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        subject: formData.get('subject'),
        message: formData.get('message')
      };
      
      try {
        // Wyślij dane do serwera
        const response = await fetch('form-handler.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams(data)
        });
        
        const result = await response.text();
        
        if (response.ok) {
          formMessage.textContent = result;
          formMessage.classList.remove('hidden', 'bg-red-100', 'text-red-800', 'dark:bg-red-900', 'dark:text-red-200');
          formMessage.classList.add('bg-green-100', 'text-green-800', 'dark:bg-green-900', 'dark:text-green-200');
          
          // Wyczyść formularz
          contactForm.reset();
        } else {
          throw new Error(result);
        }
        
      } catch (error) {
        formMessage.textContent = error.message || 'Wystąpił błąd podczas wysyłania wiadomości. Spróbuj ponownie później.';
        formMessage.classList.remove('hidden', 'bg-green-100', 'text-green-800', 'dark:bg-green-900', 'dark:text-green-200');
        formMessage.classList.add('bg-red-100', 'text-red-800', 'dark:bg-red-900', 'dark:text-red-200');
      } finally {
        // Ukryj spinner, pokaż tekst
        submitText.classList.remove('hidden');
        submitSpinner.classList.add('hidden');
        
        // Ukryj wiadomość po 5 sekundach
        setTimeout(() => {
          formMessage.classList.add('hidden');
        }, 5000);
      }
    });
  }

  async function loadRoute() {
    const rawHash = location.hash || '#/home';
    const key = (rawHash.replace(/^#\/?/, '') || 'home');
    
    // Sprawdź, czy to dynamiczna ścieżka news (news/id)
    const newsMatch = key.match(/^news\/(.+)$/);
    if (newsMatch) {
      const newsId = newsMatch[1];
      await loadNewsArticle(newsId);
      return;
    }
    
    const path = ROUTES[key] || ROUTES['home'];
    const app = document.getElementById('app');
    app.innerHTML = '<div class="text-center text-gray-500 flex flex-col items-center justify-center min-h-[50vh]"><div class="globe-spinner mb-4"></div><p>Ładowanie treści...</p></div>';

    try {
      const data = await fetchJson(path);
      setTitle(data.title || 'Republika Globo');

      if (data.content) {
        renderHtml(data.content);
      } else if (Array.isArray(data.items)) {
        // render list page (np. news)
        const html = `<section class="grid md:grid-cols-2 gap-6">${data.items.map(it => `
          <article class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md card-hover">
            <h3 class="text-xl font-semibold mb-2">${escapeHtml(it.title)}</h3>
            <div class="text-sm text-gray-500 mb-3 flex items-center">
              <i class="far fa-calendar mr-2"></i>${escapeHtml(it.date || '')}
              ${it.category ? `<span class="ml-3 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">${escapeHtml(it.category)}</span>` : ''}
            </div>
            <p class="text-gray-600 dark:text-gray-300 mb-4">${escapeHtml(it.excerpt || '')}</p>
            <a href="#/news/${it.id}" class="text-blue-600 dark:text-blue-400 inline-flex items-center font-medium hover:underline">
              Czytaj więcej <i class="fas fa-arrow-right ml-2 text-xs"></i>
            </a>
          </article>
        `).join('')}</section>`;
        renderHtml(html);
      } else {
        renderHtml(`<div class="p-6 bg-white dark:bg-gray-800 rounded-lg">Brak treści w pliku: ${escapeHtml(path)}</div>`);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Re-inicjalizacja Fancybox po zmianie treści
      if (window.Fancybox) {
        Fancybox.bind("[data-fancybox]", {});
      }
    } catch (err) {
      app.innerHTML = `<div class="text-red-600 p-6 bg-white dark:bg-gray-800 rounded-lg">Nie udało się załadować strony: ${escapeHtml(err.message)}</div>`;
      console.error(err);
    }
  }

  window.addEventListener('hashchange', loadRoute);
  window.addEventListener('load', loadRoute);
})();