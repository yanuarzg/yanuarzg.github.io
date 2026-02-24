/**
 * OPTIMIZED FEEDS LOADER WITH SKELETON
 * Fitur optimasi:
 * - localStorage cache (5 menit)
 * - Lazy loading (IntersectionObserver)
 * - Parallel fetch dengan AbortController
 * - Fetch hanya field penting (tanpa _embed)
 * - Preconnect DNS
 * - Skeleton loader responsif (4 desktop, 2 mobile)
 */

document.addEventListener("DOMContentLoaded", function () {

  // ============================================================
  // CONFIG
  // ============================================================
  const CACHE_DURATION = 5 * 60 * 1000; // 5 menit
  const LAZY_LOAD_THRESHOLD = '200px';  // mulai load saat 200px dari viewport

  // ============================================================
  // SKELETON LOADER HTML
  // ============================================================
  function renderSkeleton() {
    const skeletonHTML = `
      <li style="display:flex;gap:12px;margin-bottom:15px;align-items:center;">
        <div class="skeleton-img" style="aspect-ratio:16/9;width:-moz-available;width:-webkit-fill-available;height:auto;max-height:124px!important;background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);background-size:200% 100%;animation:skeleton-loading 1.5s infinite;border-radius:4px;"></div>
        <div class='dn' style="flex:1;">
          <div class="skeleton-title" style="height:14px;background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);background-size:200% 100%;animation:skeleton-loading 1.5s infinite;border-radius:3px;width:80%;margin-bottom:8px;"></div>
          <div class="skeleton-date" style="height:10px;background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);background-size:200% 100%;animation:skeleton-loading 1.5s infinite;border-radius:3px;width:40%;"></div>
        </div>
      </li>
    `;

    // Desktop: 4, Mobile: 2
    const count = window.innerWidth >= 768 ? 4 : 2;
    const items = Array(count).fill(skeletonHTML).join('');

    return `
      <style>
        @keyframes skeleton-loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      </style>
      <ul style="list-style:none;padding:0;margin:0;">${items}</ul>
    `;
  }

  // ============================================================
  // HELPER: Render List
  // ============================================================  
  function renderList(items) {
	if (!items.length) return '<p>Tidak ada konten.</p>';
	return '<ul style="list-style:none;padding:0;margin:0;">' +
	  items.map(item => `
		<li style="display:flex;gap:12px;margin-bottom:15px;align-items:center;">
		  <a href="${item.link}" aria-label="${item.title}" class="post-img">
			<img src="${item.img}"
			   style="width:70px;height:50px;object-fit:cover;border-radius:4px;"
			   onerror="this.src='https://placehold.co/70x50'"/>
		  </a>
		  <div style="flex:1;">
		  <h2 class="h3 jl_fe_title jl_txt_2row" style="text-decoration:none;font-size:18px;display:block;line-height:1.5;">
			<a href="${item.link}" target="_blank">
			  ${item.title}
			</a>
			</h2>
			<small style="font-size:11px;">
			  ${item.date}
			</small>
		  </div>
		</li>`).join('') +
	  '</ul>';
	}

  // ============================================================
  // CACHE HELPER
  // ============================================================
  function getCached(key) {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      const data = JSON.parse(item);
      if (Date.now() - data.timestamp > CACHE_DURATION) {
        localStorage.removeItem(key);
        return null;
      }
      return data.value;
    } catch {
      return null;
    }
  }

  function setCache(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify({
        value: value,
        timestamp: Date.now()
      }));
    } catch (e) {
      // localStorage penuh atau disabled
    }
  }

  // ============================================================
  // DNS PRECONNECT (jalankan sekali saat load)
  // ============================================================
  function addPreconnect(domains) {
    const head = document.head;
    domains.forEach(domain => {
      if (!document.querySelector(`link[href*="${domain}"]`)) {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = `https://${domain}`;
        link.crossOrigin = 'anonymous';
        head.appendChild(link);
      }
    });
  }

  // ============================================================
  // LAZY LOAD OBSERVER
  // ============================================================
  const lazyLoadObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const container = entry.target;
        const loader = container.dataset.loader;
        
        // Tampilkan skeleton
        container.innerHTML = renderSkeleton();
        
        if (loader && window[loader]) {
          window[loader](container);
          delete container.dataset.loader; // jangan load ulang
        }
        
        lazyLoadObserver.unobserve(container);
      }
    });
  }, { rootMargin: LAZY_LOAD_THRESHOLD });

  // ============================================================
  // WORDPRESS OPTIMIZED FETCH
  // ============================================================
  async function fetchWPOptimized(source, catId, count) {
    const cacheKey = `wp_${source}_${catId || 'all'}_${count}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    let url = `https://${source}/wp-json/wp/v2/posts?per_page=${count}&_fields=id,title,link,date,featured_media`;
    if (catId) url += `&categories=${catId}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

    try {
      const res = await fetch(url, { 
        signal: controller.signal,
        mode: 'cors',
        cache: 'force-cache'
      });
      clearTimeout(timeout);

      if (!res.ok) throw new Error('HTTP error');
      const posts = await res.json();

      // Ambil thumbnail hanya untuk post yang punya featured_media
      const mediaIds = [...new Set(posts.filter(p => p.featured_media).map(p => p.featured_media))];
      let mediaMap = {};

      if (mediaIds.length > 0) {
        try {
          const mediaUrl = `https://${source}/wp-json/wp/v2/media?include=${mediaIds.join(',')}&_fields=id,source_url`;
          const mediaRes = await fetch(mediaUrl, { cache: 'force-cache' });
          const mediaData = await mediaRes.json();
          mediaData.forEach(m => {
            mediaMap[m.id] = m.source_url;
          });
        } catch {
          // jika gagal ambil media, lanjut tanpa thumbnail
        }
      }

      const mapped = posts.map(post => ({
        title   : post.title.rendered || post.title,
        link    : post.link,
        rawDate : post.date,
        date    : new Date(post.date).toLocaleDateString('id-ID'),
        source  : source,
        img     : mediaMap[post.featured_media] || 'https://placehold.co/70x50'
      }));

      setCache(cacheKey, mapped);
      return mapped;

    } catch (err) {
      clearTimeout(timeout);
      console.warn(`WP fetch failed for ${source}:`, err.message);
      return [];
    }
  }

  async function fetchWPCategory(source, categoryName) {
    const cacheKey = `wp_cat_${source}_${categoryName}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    try {
      const res = await fetch(
        `https://${source}/wp-json/wp/v2/categories?search=${encodeURIComponent(categoryName)}&per_page=5&_fields=id,slug,name`,
        { cache: 'force-cache' }
      );
      const cats = await res.json();
      if (!cats.length) return null;

      const bySlug = cats.find(c => c.slug === categoryName.toLowerCase());
      const byName = cats.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
      const catId = (bySlug || byName || cats[0]).id;

      setCache(cacheKey, catId);
      return catId;
    } catch {
      return null;
    }
  }

  // ============================================================
  // BLOGGER OPTIMIZED (sudah cepat, tambah cache)
  // ============================================================
  function loadBloggerOptimized(source, category, count, callback) {
    const cacheKey = `blg_${source}_${category || 'all'}_${count}`;
    const cached = getCached(cacheKey);
    
    if (cached) {
      callback(cached);
      return;
    }

    const cbName = 'blgCb_' + Math.random().toString(36).slice(2);

    window[cbName] = function (data) {
      document.getElementById(cbName)?.remove();
      delete window[cbName];

      const entries = data.feed.entry || [];
      const mapped = entries.map(entry => ({
        title   : entry.title.$t,
        link    : entry.link.find(l => l.rel === 'alternate').href,
        rawDate : entry.published.$t,
        date    : new Date(entry.published.$t).toLocaleDateString('id-ID'),
        source  : source,
        img     : entry.media$thumbnail
                    ? entry.media$thumbnail.url.replace(/\/s\d+-c\//, '/s320-c/')
                    : 'https://placehold.co/70x50'
      }));

      setCache(cacheKey, mapped);
      callback(mapped);
    };

    const labelPath = category ? `/-/${encodeURIComponent(category)}/` : '/';
    const script = document.createElement('script');
    script.id = cbName;
    script.src = `https://${source}/feeds/posts/default${labelPath}?alt=json&max-results=${count}&callback=${cbName}`;
    script.onerror = () => {
      document.getElementById(cbName)?.remove();
      delete window[cbName];
      callback([]);
    };
    document.body.appendChild(script);
  }

  // ============================================================
  // SINGLE WP (lazy load)
  // ============================================================
  window.loadSingleWP = async function(container) {
    const source = container.getAttribute('data-source');
    const count = parseInt(container.getAttribute('data-items')) || 5;

    const posts = await fetchWPOptimized(source, null, count);
    container.innerHTML = renderList(posts);
  };

  document.querySelectorAll('.recent-wp').forEach(container => {
    container.dataset.loader = 'loadSingleWP';
    lazyLoadObserver.observe(container);
  });

  // ============================================================
  // SINGLE BLOGGER (lazy load)
  // ============================================================
  window.loadSingleBlogger = function(container) {
    const source = container.getAttribute('data-source');
    const count = parseInt(container.getAttribute('data-items')) || 5;

    loadBloggerOptimized(source, null, count, posts => {
      container.innerHTML = renderList(posts);
    });
  };

  document.querySelectorAll('.recent-blg').forEach(container => {
    container.dataset.loader = 'loadSingleBlogger';
    lazyLoadObserver.observe(container);
  });

  // ============================================================
  // MULTI-SOURCE WP (lazy load)
  // ============================================================
  window.loadMultiWP = async function(container) {
    const sources = container.getAttribute('data-sources').split(',').map(s => s.trim()).filter(Boolean);
    const category = container.getAttribute('data-category') || '';
    const total = parseInt(container.getAttribute('data-items')) || 10;
    const sort = container.getAttribute('data-sort') || 'date';

    if (!sources.length) return;

    // Preconnect semua domain
    addPreconnect(sources);

    let allPosts = [];

    // Paralel fetch semua sources
    const promises = sources.map(async (source) => {
      let catId = null;
      if (category) {
        catId = await fetchWPCategory(source, category);
        if (!catId) return [];
      }
      return fetchWPOptimized(source, catId, total);
    });

    const results = await Promise.allSettled(promises);
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        allPosts = allPosts.concat(result.value);
      }
    });

    if (sort === 'date') {
      allPosts.sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));
    }

    container.innerHTML = renderList(allPosts.slice(0, total));
  };

  document.querySelectorAll('.recent-wp-multi').forEach(container => {
    container.dataset.loader = 'loadMultiWP';
    lazyLoadObserver.observe(container);
  });

  // ============================================================
  // MULTI-SOURCE BLOGGER (lazy load)
  // ============================================================
  window.loadMultiBlogger = function(container) {
    const sources = container.getAttribute('data-sources').split(',').map(s => s.trim()).filter(Boolean);
    const category = container.getAttribute('data-category') || '';
    const total = parseInt(container.getAttribute('data-items')) || 10;
    const sort = container.getAttribute('data-sort') || 'date';

    if (!sources.length) return;

    addPreconnect(sources);

    let allEntries = [];
    let completed = 0;

    sources.forEach(source => {
      loadBloggerOptimized(source, category, total, entries => {
        allEntries = allEntries.concat(entries);
        completed++;

        if (completed === sources.length) {
          if (sort === 'date') {
            allEntries.sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));
          }
          container.innerHTML = renderList(allEntries.slice(0, total));
        }
      });
    });
  };

  document.querySelectorAll('.recent-blg-multi').forEach(container => {
    container.dataset.loader = 'loadMultiBlogger';
    lazyLoadObserver.observe(container);
  });

});

/* Scroll Control (Passive for Performance) */
(function() {
  let lastS = 0;
  window.addEventListener('scroll', () => {
    let currS = window.pageYOffset;
    if (Math.abs(currS - lastS) < 50) return;
    document.body.classList.toggle('dw', currS > lastS && currS > 100);
    document.body.classList.toggle('up', currS < lastS);
    lastS = currS;
  }, { passive: true });
})();
